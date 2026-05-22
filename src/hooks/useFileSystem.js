import { useState, useEffect, useCallback, useRef } from 'react'

const SERVER = 'http://localhost:3000'
const WS_URL = 'ws://localhost:3000'

export default function useFileSystem() {
  const [clusters, setClusters] = useState(null)
  const [clusterFiles, setClusterFiles] = useState({})
  const [fileChanges, setFileChanges] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [clusterStats, setClusterStats] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const clusterFilesRef = useRef({})

  useEffect(() => {
    let cancelled = false

    async function fetchClusters() {
      try {
        const res = await fetch(`${SERVER}/api/clusters`)
        if (!res.ok) throw new Error('Failed to fetch clusters')
        const data = await res.json()
        if (cancelled) return
        const clusterMap = {}
        for (const c of data) {
          const angle = (c.id / data.length) * Math.PI * 2 + 0.2
          const t = c.id / (data.length - 1)
          const radiusVar = 3.0 + t * 1.2
          const yOffset = Math.sin(t * Math.PI * 2) * 0.5
          clusterMap[c.id] = {
            id: c.id,
            name: c.name,
            color: c.color,
            dir: c.dir,
            fileCount: c.fileCount,
            position: new Float32Array([
              Math.cos(angle) * radiusVar,
              yOffset,
              Math.sin(angle) * radiusVar,
            ]),
          }
        }
        setClusters(clusterMap)
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      }
    }

    async function fetchStats() {
      try {
        const res = await fetch(`${SERVER}/api/stats`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setClusterStats(data)
        }
      } catch {}
    }

    fetchClusters()
    fetchStats()

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'connected') {
            setConnected(true)
            return
          }

          if (msg.type === 'files-update') {
            setClusterFiles(prev => ({
              ...prev,
              [msg.clusterId]: msg.files,
            }))
            clusterFilesRef.current[msg.clusterId] = msg.files
            setClusters(prev => {
              if (!prev) return prev
              const updated = { ...prev }
              if (updated[msg.clusterId]) {
                updated[msg.clusterId] = {
                  ...updated[msg.clusterId],
                  fileCount: msg.count,
                }
              }
              return updated
            })
            return
          }

          if (msg.type === 'file-added') {
            const prev = clusterFilesRef.current[msg.clusterId] || []
            clusterFilesRef.current[msg.clusterId] = msg.files
            setFileChanges({ type: 'added', clusterId: msg.clusterId, file: msg.file })
            setClusterFiles(prevMap => ({ ...prevMap, [msg.clusterId]: msg.files }))
            setClusters(prev => {
              if (!prev) return prev
              const updated = { ...prev }
              if (updated[msg.clusterId]) {
                updated[msg.clusterId] = { ...updated[msg.clusterId], fileCount: msg.count }
              }
              return updated
            })
            return
          }

          if (msg.type === 'file-removed') {
            const prev = clusterFilesRef.current[msg.clusterId] || []
            clusterFilesRef.current[msg.clusterId] = msg.files
            setFileChanges({ type: 'removed', clusterId: msg.clusterId, file: msg.file })
            setClusterFiles(prevMap => ({ ...prevMap, [msg.clusterId]: msg.files }))
            setClusters(prev => {
              if (!prev) return prev
              const updated = { ...prev }
              if (updated[msg.clusterId]) {
                updated[msg.clusterId] = { ...updated[msg.clusterId], fileCount: msg.count }
              }
              return updated
            })
            return
          }

          if (msg.type === 'file-modified') {
            const prev = clusterFilesRef.current[msg.clusterId] || []
            clusterFilesRef.current[msg.clusterId] = msg.files
            setFileChanges({ type: 'modified', clusterId: msg.clusterId, file: msg.file })
            setClusterFiles(prevMap => ({ ...prevMap, [msg.clusterId]: msg.files }))
            return
          }
        } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => { ws.close() }
    }

    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const fetchClusterFiles = useCallback(async (clusterId, offset = 0, limit = 2000) => {
    try {
      const res = await fetch(`${SERVER}/api/clusters/${clusterId}/files?offset=${offset}&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch files')
      const data = await res.json()
      clusterFilesRef.current[clusterId] = data.files
      setClusterFiles(prev => ({ ...prev, [clusterId]: data.files }))
      return data
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [])

  const openFile = useCallback(async (filePath) => {
    try {
      await fetch(`${SERVER}/api/files/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })
    } catch {}
  }, [])

  const clearFileChanges = useCallback(() => {
    setFileChanges(null)
  }, [])

  return {
    clusters,
    clusterFiles,
    fileChanges,
    loading,
    error,
    connected,
    clusterStats,
    fetchClusterFiles,
    openFile,
    clearFileChanges,
  }
}
