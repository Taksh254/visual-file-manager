import { useState, useEffect } from 'react'

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
  value: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: "'SF Mono','Menlo',monospace",
    letterSpacing: '0.5px',
  },
}

export default function RightPanel({ selectedFile, clusterNames, openFile }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  useEffect(() => { const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000); return () => clearInterval(id) }, [])

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
          <div style={{ fontSize: 11, color: '#fff', marginBottom: 2, wordBreak: 'break-all', fontWeight: 300 }}>
            {selectedFile.name}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
            {selectedFile.size}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', marginBottom: 6, wordBreak: 'break-all' }}>
            {selectedFile.path}
          </div>
          {openFile && selectedFile.path && (
            <div
              onClick={(e) => { e.stopPropagation(); openFile(selectedFile.path) }}
              style={{
                fontSize: 9, color: 'rgba(120,80,255,0.5)', cursor: 'pointer',
                letterSpacing: '0.5px', transition: 'color 0.15s',
                pointerEvents: 'auto', marginTop: 4,
              }}
              onMouseEnter={e => e.target.style.color = 'rgba(120,80,255,0.9)'}
              onMouseLeave={e => e.target.style.color = 'rgba(120,80,255,0.5)'}
            >
              ⟳ Open File
            </div>
          )}
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
