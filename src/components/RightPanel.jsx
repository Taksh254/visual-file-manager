import { useState, useEffect, useRef } from 'react'
import PreviewPanel from './PreviewPanel'
import useUniverseStore from '../store/useUniverseStore'

const style = {
  panel: {
    background: 'rgba(2,6,18,0.35)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    border: '1px solid rgba(120,80,255,0.06)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 10,
    boxShadow: '0 0 20px rgba(80,40,180,0.06), inset 0 0 30px rgba(80,40,180,0.02)',
  },
  label: {
    fontSize: 7,
    letterSpacing: '2px',
    color: 'rgba(120,80,255,0.4)',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: "'SF Mono','Menlo',monospace",
  },
}

export default function RightPanel() {
  const selectedFile = useUniverseStore(s => s.selectedFile)
  const clusterNames = useUniverseStore(s => s.clusterNames)
  const activeClusterId = useUniverseStore(s => s.activeClusterId)
  const renameFile = useUniverseStore(s => s.renameFile)

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [editingName, setEditingName] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    if (editingName) inputRef.current?.focus()
  }, [editingName])

  function handleStartEdit() {
    if (!selectedFile) return
    setEditValue(selectedFile.name)
    setEditingName(true)
  }

  function handleConfirmEdit() {
    if (editValue.trim() && selectedFile && activeClusterId !== null) {
      renameFile(activeClusterId, selectedFile.path, editValue.trim())
    }
    setEditingName(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConfirmEdit()
    if (e.key === 'Escape') setEditingName(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 180,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none', zIndex: 10, fontFamily: "'SF Mono','Menlo',monospace",
    }}>
      <div style={style.panel}>
        <div style={style.label}>System</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>NODE</span>
          <span style={{ fontSize: 9, color: 'rgba(0,255,180,0.5)', textShadow:'0 0 10px rgba(0,255,180,0.2)' }}>● ACTIVE</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>TIME</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{time}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>CLUSTERS</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{clusterNames?.length || 0}</span>
        </div>
      </div>

      {selectedFile && (
        <div style={style.panel}>
          <div style={style.label}>Selected File</div>
          {editingName ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleConfirmEdit}
              style={{
                background: 'rgba(120,80,255,0.08)',
                border: '1px solid rgba(120,80,255,0.3)',
                borderRadius: 3, padding: '2px 6px',
                color: '#fff', fontSize: 11,
                fontFamily: "'SF Mono','Menlo',monospace",
                outline: 'none', width: '100%', boxSizing: 'border-box',
                marginBottom: 4,
              }}
            />
          ) : (
            <div
              onClick={(e) => { e.stopPropagation(); handleStartEdit() }}
              style={{
                fontSize: 11, color: '#fff', marginBottom: 2, wordBreak: 'break-all',
                fontWeight: 300, cursor: 'pointer', transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = 'rgba(180,150,255,0.8)'}
              onMouseLeave={e => e.target.style.color = '#fff'}
              title="Click to rename"
            >
              ✎ {selectedFile.name}
            </div>
          )}
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
            {selectedFile.size}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', marginBottom: 6, wordBreak: 'break-all' }}>
            {selectedFile.path}
          </div>
          <div style={{ pointerEvents: 'auto' }}>
            <PreviewPanel selectedFile={selectedFile} />
          </div>
        </div>
      )}

      <div style={style.panel}>
        <div style={style.label}>Navigation</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', lineHeight: 1.8 }}>
          Click a galaxy to explore<br />
          Click space to return<br />
          Drag to orbit the universe<br />
          Hover files for details
        </div>
      </div>

      <div style={{ ...style.panel, border: '1px solid rgba(120,80,255,0.06)' }}>
        <div style={style.label}>EDITH v1.0</div>
        <div style={{ fontSize: 9, color: 'rgba(120,80,255,0.25)', letterSpacing: '2px' }}>
          REAL FILESYSTEM
        </div>
      </div>
    </div>
  )
}
