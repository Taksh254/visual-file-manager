import { Html } from '@react-three/drei'

const ICON = { pdf: '📄', image: '🖼', video: '🎬', audio: '🎵', code: '⌨', archive: '📦', folder: '📁' }
const COLOR = { pdf: '#FF8C00', image: '#9B59B6', video: '#E74C3C', audio: '#E891D0', code: '#00BCD4', archive: '#F2D94E', folder: '#FFFFFF' }

export default function HoverLabel({ file, position }) {
  if (!file || !position) return null

  const c = COLOR[file.type] || '#00BCD4'

  return (
    <Html position={[position.x, position.y + 0.2, position.z]} center distanceFactor={4}>
      <div style={{
        background: 'rgba(0,5,15,0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: `1px solid ${c}44`,
        borderRadius: 6,
        padding: '5px 10px',
        color: '#fff',
        fontSize: 11,
        fontFamily: "'SF Mono','Menlo',monospace",
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: `0 0 20px ${c}22, 0 0 60px ${c}11`,
        letterSpacing: '0.3px',
      }}>
        <span style={{ marginRight: 5 }}>{ICON[file.type] || '📄'}</span>
        <span style={{ color: c }}>{file.name}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8, fontSize: 9 }}>{file.size}</span>
      </div>
    </Html>
  )
}
