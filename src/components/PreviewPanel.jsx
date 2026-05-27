import { useState, useEffect, useRef } from 'react'
import { getFile, createObjectURL, readFileAsText, getFileType, canPreview, revokeObjectURL, downloadFile } from '../data/fileRegistry'

const MAX_PREVIEW_TEXT_LENGTH = 50000
const MAX_PREVIEW_SIZE = 50 * 1024 * 1024

function getFileIcon(ext) {
  const type = getFileType(ext)
  const icons = { image: '🖼', video: '🎬', audio: '🎵', pdf: '📄', text: '📝', archive: '📦', unknown: '📄' }
  return icons[type] || icons.unknown
}

export default function PreviewPanel({ selectedFile, onClose }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [textContent, setTextContent] = useState(null)
  const currentFileIdRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!selectedFile?.fileId) {
      cleanup()
      return
    }

    if (selectedFile.fileId === currentFileIdRef.current) return
    cleanup()
    currentFileIdRef.current = selectedFile.fileId

    const file = getFile(selectedFile.fileId)
    if (!file) {
      setError('File reference expired. Re-upload to access.')
      return
    }

    const type = getFileType(selectedFile.ext)
    const sizeOk = file.size <= MAX_PREVIEW_SIZE

    if (!canPreview(selectedFile.ext) || !sizeOk) {
      setPreview('download-only')
      setLoading(false)
      return
    }

    if (type === 'image') {
      setLoading(true)
      const url = createObjectURL(selectedFile.fileId)
      if (url) {
        setPreview({ type: 'image', url })
        setLoading(false)
      }
    } else if (type === 'video') {
      const url = createObjectURL(selectedFile.fileId)
      if (url) setPreview({ type: 'video', url })
    } else if (type === 'audio') {
      const url = createObjectURL(selectedFile.fileId)
      if (url) setPreview({ type: 'audio', url })
    } else if (type === 'pdf') {
      const url = createObjectURL(selectedFile.fileId)
      if (url) setPreview({ type: 'pdf', url })
    } else if (type === 'text') {
      setLoading(true)
      readFileAsText(file).then(text => {
        const truncated = text.length > MAX_PREVIEW_TEXT_LENGTH
          ? text.slice(0, MAX_PREVIEW_TEXT_LENGTH) + '\n\n... [content truncated]'
          : text
        setTextContent(truncated)
        setPreview({ type: 'text' })
        setLoading(false)
      }).catch(() => {
        setError('Could not read file')
        setLoading(false)
      })
    }
  }, [selectedFile])

  function cleanup() {
    if (currentFileIdRef.current) {
      revokeObjectURL(currentFileIdRef.current)
    }
    currentFileIdRef.current = null
    setPreview(null)
    setTextContent(null)
    setError(null)
    setLoading(false)
  }

  function handleDownload() {
    if (selectedFile?.fileId) {
      downloadFile(selectedFile.fileId, selectedFile.name)
    }
  }

  function handleOpenInTab() {
    if (selectedFile?.fileId) {
      const url = createObjectURL(selectedFile.fileId)
      if (url) window.open(url, '_blank')
    }
  }

  if (!selectedFile) return null

  const type = getFileType(selectedFile.ext)
  const icon = getFileIcon(selectedFile.ext)

  return (
    <div style={{
      marginTop: 8,
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid rgba(120,80,255,0.06)',
      background: 'rgba(0,0,0,0.2)',
    }}>
      {loading && (
        <div style={{
          padding: '20px 14px', textAlign: 'center',
          fontSize: 9, color: 'rgba(255,255,255,0.2)',
          fontFamily: "'SF Mono','Menlo',monospace",
        }}>
          loading preview...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 14px', textAlign: 'center',
          fontSize: 9, color: 'rgba(255,100,100,0.5)',
          fontFamily: "'SF Mono','Menlo',monospace",
        }}>
          {error}
        </div>
      )}

      {preview === 'download-only' && (
        <div style={{ padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,0.25)',
            fontFamily: "'SF Mono','Menlo',monospace", marginBottom: 8,
          }}>
            Preview not available for this file type
          </div>
          <div
            onClick={handleDownload}
            style={{
              fontSize: 9, color: 'rgba(120,80,255,0.5)', cursor: 'pointer',
              fontFamily: "'SF Mono','Menlo',monospace", letterSpacing: '1px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(120,80,255,0.9)'}
            onMouseLeave={e => e.target.style.color = 'rgba(120,80,255,0.5)'}
          >
            ↓ Download File
          </div>
        </div>
      )}

      {preview?.type === 'image' && (
        <div style={{ position: 'relative' }}>
          <img
            src={preview.url}
            alt={selectedFile.name}
            style={{
              width: '100%', maxHeight: 180, objectFit: 'contain',
              display: 'block', background: 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
            onClick={handleOpenInTab}
          />
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            fontSize: 7, color: 'rgba(255,255,255,0.2)',
            fontFamily: "'SF Mono','Menlo',monospace",
            background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 3,
          }}>
            click to open
          </div>
        </div>
      )}

      {preview?.type === 'video' && (
        <video
          ref={videoRef}
          src={preview.url}
          controls
          style={{ width: '100%', maxHeight: 180, display: 'block', background: '#000' }}
          preload="metadata"
        />
      )}

      {preview?.type === 'audio' && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 20, marginBottom: 6, textAlign: 'center' }}>🎵</div>
          <audio
            src={preview.url}
            controls
            style={{ width: '100%' }}
            preload="none"
          />
        </div>
      )}

      {preview?.type === 'pdf' && (
        <div style={{ position: 'relative' }}>
          <iframe
            src={preview.url}
            title={selectedFile.name}
            style={{
              width: '100%', height: 160, border: 'none',
              background: 'rgba(255,255,255,0.05)',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            fontSize: 7, color: 'rgba(255,255,255,0.2)',
            fontFamily: "'SF Mono','Menlo',monospace",
            background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 3,
          }}
            onClick={handleOpenInTab}
          >
            click to open
          </div>
        </div>
      )}

      {preview?.type === 'text' && textContent && (
        <div style={{
          padding: '8px 10px', maxHeight: 140, overflow: 'auto',
          fontSize: 9, color: 'rgba(255,255,255,0.5)',
          fontFamily: "'SF Mono','Menlo',monospace",
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.5, background: 'rgba(0,0,0,0.15)',
        }}>
          {textContent}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, padding: '6px 10px',
        borderTop: '1px solid rgba(120,80,255,0.04)',
      }}>
        <div
          onClick={handleDownload}
          style={{
            fontSize: 8, color: 'rgba(120,80,255,0.4)', cursor: 'pointer',
            fontFamily: "'SF Mono','Menlo',monospace", letterSpacing: '0.5px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.target.style.color = 'rgba(120,80,255,0.8)'}
          onMouseLeave={e => e.target.style.color = 'rgba(120,80,255,0.4)'}
        >
          ↓ Download
        </div>
        {canPreview(selectedFile.ext) && selectedFile.fileId && (
          <div
            onClick={handleOpenInTab}
            style={{
              fontSize: 8, color: 'rgba(120,80,255,0.4)', cursor: 'pointer',
              fontFamily: "'SF Mono','Menlo',monospace", letterSpacing: '0.5px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(120,80,255,0.8)'}
            onMouseLeave={e => e.target.style.color = 'rgba(120,80,255,0.4)'}
          >
            ↗ Open in Tab
          </div>
        )}
      </div>
    </div>
  )
}
