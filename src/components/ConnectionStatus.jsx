import useUniverseStore from '../store/useUniverseStore'

export default function ConnectionStatus() {
  const connected = useUniverseStore(s => s.connected)
  const loading = useUniverseStore(s => s.loading)
  const error = useUniverseStore(s => s.error)
  const isDemo = useUniverseStore(s => s.isDemo)

  if (isDemo) {
    return (
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, padding: '6px 16px', borderRadius: 20,
        background: 'rgba(100,60,255,0.08)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(100,60,255,0.12)',
        fontSize: 11, fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(180,150,255,0.35)', letterSpacing: '1px',
        pointerEvents: 'none',
      }}>
        ◇ ORYN — DEMO
      </div>
    )
  }
  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, padding: '6px 16px', borderRadius: 20,
        background: 'rgba(2,6,18,0.6)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(120,80,255,0.08)',
        fontSize: 11, fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
        pointerEvents: 'none',
      }}>
        ⟳ CONNECTING TO FILESYSTEM
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, padding: '6px 16px', borderRadius: 20,
        background: 'rgba(40,0,0,0.6)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,60,60,0.15)',
        fontSize: 11, fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(255,100,100,0.6)', letterSpacing: '1px',
        pointerEvents: 'none',
      }}>
        ⚠ FILESYSTEM OFFLINE — run `npm run server`
      </div>
    )
  }

  if (!connected) {
    return (
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, padding: '6px 16px', borderRadius: 20,
        background: 'rgba(2,6,18,0.6)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(120,80,255,0.08)',
        fontSize: 11, fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
        pointerEvents: 'none',
      }}>
        ⟳ RECONNECTING
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, padding: '6px 16px', borderRadius: 20,
      background: 'rgba(2,6,18,0.5)', backdropFilter: 'blur(4px)',
      border: '1px solid rgba(0,255,150,0.08)',
      fontSize: 11, fontFamily: "'SF Mono','Menlo',monospace",
      color: 'rgba(0,255,150,0.4)', letterSpacing: '1px',
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,255,150,0.5)', boxShadow: '0 0 6px rgba(0,255,150,0.3)' }} />
      FILESYSTEM ONLINE
    </div>
  )
}
