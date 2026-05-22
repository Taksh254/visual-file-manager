import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import fs from 'fs'
import { exec } from 'child_process'
import WatcherService from './services/WatcherService.js'
import { getResolvedClusters, scanDirectory } from './services/FilesystemService.js'

const PORT = 3000

const app = express()
app.use(cors())
app.use(express.json())

const watcherService = new WatcherService()
const CLUSTER_DEFS = getResolvedClusters()

app.get('/api/clusters', (req, res) => {
  const cache = watcherService.getClusterCache()
  const data = cache.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    dir: c.dir,
    fileCount: c.files.length,
  }))
  res.json(data)
})

app.get('/api/clusters/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const cluster = watcherService.getCluster(id)
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' })
  res.json({
    id: cluster.id,
    name: cluster.name,
    color: cluster.color,
    dir: cluster.dir,
    fileCount: cluster.files.length,
    files: cluster.files,
  })
})

app.get('/api/clusters/:id/files', (req, res) => {
  const id = parseInt(req.params.id)
  const cluster = watcherService.getCluster(id)
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' })
  const { offset = 0, limit = 2000 } = req.query
  const sliced = cluster.files.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
  res.json({
    total: cluster.files.length,
    offset: parseInt(offset),
    count: sliced.length,
    files: sliced,
  })
})

app.post('/api/files/open', (req, res) => {
  const { filePath } = req.body
  if (!filePath) return res.status(400).json({ error: 'filePath required' })
  try {
    if (process.platform === 'win32') {
      exec(`start "" "${filePath}"`)
    } else if (process.platform === 'darwin') {
      exec(`open "${filePath}"`)
    } else {
      exec(`xdg-open "${filePath}"`)
    }
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/stats', (req, res) => {
  const cache = watcherService.getClusterCache()
  const totalFiles = cache.reduce((s, c) => s + c.files.length, 0)
  res.json({
    clusters: cache.length,
    totalFiles,
    watched: cache.map(c => ({ name: c.name, exists: fs.existsSync(c.dir), dir: c.dir })),
  })
})

app.get('/api/watched', (req, res) => {
  const cache = watcherService.getClusterCache()
  res.json(cache.map(c => ({
    id: c.id,
    name: c.name,
    dir: c.dir,
    fileCount: c.files.length,
    files: c.files,
  })))
})

watcherService.startWatching(CLUSTER_DEFS, null)

const server = app.listen(PORT, () => {
  console.log(`EDITH server running on http://localhost:${PORT}`)
  const wss = new WebSocketServer({ server })
  watcherService.setWebSocketServer(wss)
  wss.on('connection', (ws) => {
    const cache = watcherService.getClusterCache()
    ws.send(JSON.stringify({
      type: 'connected',
      clusters: cache.length,
      clusterData: cache.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        dir: c.dir,
        fileCount: c.files.length,
      })),
    }))
  })
  console.log(`Watching ${CLUSTER_DEFS.length} directories...`)
})

process.on('SIGINT', () => { watcherService.stopWatching(); server.close(); process.exit() })
process.on('SIGTERM', () => { watcherService.stopWatching(); server.close(); process.exit() })
