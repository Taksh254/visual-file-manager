export default function BottomNav({ activeCluster, onReturn }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, display: 'flex', alignItems: 'center',
      padding: '4px 5px', borderRadius: 30,
      background: 'rgba(2,6,18,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      border: '1px solid rgba(120,80,255,0.07)',
      boxShadow: '0 0 20px rgba(80,40,180,0.05)',
      pointerEvents: 'auto', userSelect: 'none',
      fontFamily: "'SF Mono','Menlo',monospace", gap: 2,
    }}>
      <div
        onClick={activeCluster !== null ? onReturn : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 25,
          cursor: activeCluster !== null ? 'pointer' : 'default',
          color: activeCluster !== null ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
          fontSize: 10, letterSpacing: '1.5px',
          transition: 'all 0.25s',
          border: '1px solid transparent',
        }}
        onMouseEnter={e => { if(activeCluster !== null) { e.currentTarget.style.borderColor = 'rgba(120,80,255,0.15)'; e.currentTarget.style.background = 'rgba(120,80,255,0.06)'; }}}
        onMouseLeave={e => { if(activeCluster !== null) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}}
      >
        Universe
      </div>

      {activeCluster !== null && (
        <>
          <div style={{color:'rgba(120,80,255,0.2)', fontSize: 8}}>▸</div>
          <div style={{color:'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '1px', padding: '5px 14px'}}>
            Cluster View
          </div>
        </>
      )}
    </div>
  )
}
