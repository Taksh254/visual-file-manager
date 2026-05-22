import chokidar from 'chokidar'
import path from 'path'
import { scanDirectory, scanFile } from './FilesystemService.js'

export default class WatcherService {
  constructor() {
    this.watchers = new Map()
    this.clusterCache = new Map()
    this.wss = null
  }

  setWebSocketServer(wss) {
    this.wss = wss
  }

  startWatching(resolvedClusters, wss) {
    if (wss) this.wss = wss
    this.stopWatching()

    for (const cluster of resolvedClusters) {
      this.clusterCache.set(cluster.id, {
        ...cluster,
        files: scanDirectory(cluster.dir),
      })

      const watcher = chokidar.watch(cluster.dir, {
        depth: 0,
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      })

      watcher.on('add', (filePath) => {
        const name = path.basename(filePath)
        if (name.startsWith('.') || this._isHiddenFile(name)) return

        const cache = this.clusterCache.get(cluster.id)
        if (!cache) return

        const existing = cache.files.find(f => f.path === filePath)
        if (existing) return

        const fileInfo = scanFile(cluster.dir, name)
        if (fileInfo) {
          cache.files.push(fileInfo)
          cache.files.sort((a, b) => a.name.localeCompare(b.name))
          this._broadcast({
            type: 'file-added',
            clusterId: cluster.id,
            file: fileInfo,
            files: cache.files,
            count: cache.files.length,
          })
        }
      })

      watcher.on('unlink', (filePath) => {
        const name = path.basename(filePath)
        if (name.startsWith('.')) return

        const cache = this.clusterCache.get(cluster.id)
        if (!cache) return

        const removed = cache.files.find(f => f.path === filePath)
        cache.files = cache.files.filter(f => f.path !== filePath)

        this._broadcast({
          type: 'file-removed',
          clusterId: cluster.id,
          file: removed || { name, path: filePath },
          files: cache.files,
          count: cache.files.length,
        })
      })

      watcher.on('change', (filePath) => {
        const name = path.basename(filePath)
        if (name.startsWith('.')) return

        const cache = this.clusterCache.get(cluster.id)
        if (!cache) return

        const fileInfo = scanFile(cluster.dir, name)
        if (fileInfo) {
          const idx = cache.files.findIndex(f => f.path === filePath)
          if (idx !== -1) {
            cache.files[idx] = fileInfo
          } else {
            cache.files.push(fileInfo)
            cache.files.sort((a, b) => a.name.localeCompare(b.name))
          }

          this._broadcast({
            type: 'file-modified',
            clusterId: cluster.id,
            file: fileInfo,
            files: cache.files,
            count: cache.files.length,
          })
        }
      })

      this.watchers.set(cluster.id, watcher)
    }
  }

  stopWatching() {
    for (const [, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
    this.clusterCache.clear()
  }

  getClusterCache() {
    return Array.from(this.clusterCache.values())
  }

  getCluster(id) {
    return this.clusterCache.get(id) || null
  }

  _broadcast(message) {
    if (!this.wss) return
    const msg = JSON.stringify(message)
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg)
    })
  }

  _isHiddenFile(name) {
    const hidden = ['Thumbs.db', '.DS_Store', 'desktop.ini', '~$']
    return hidden.some(h => name.startsWith(h) || name === h)
  }
}
