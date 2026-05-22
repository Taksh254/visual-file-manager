import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const NEBULA_PALETTES = [
  [0.35, 0.05, 0.55],
  [0.05, 0.15, 0.5],
  [0.4, 0.02, 0.35],
  [0.1, 0.3, 0.45],
  [0.25, 0.02, 0.5],
  [0.35, 0.1, 0.5],
  [0.02, 0.25, 0.4],
  [0.3, 0.05, 0.45],
  [0.15, 0.2, 0.5],
  [0.35, 0.08, 0.3],
]

function createNebulaTexture(palette) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 256
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)

  grad.addColorStop(0, `rgba(${palette[0]*255|0},${palette[1]*255|0},${palette[2]*255|0},0.6)`)
  grad.addColorStop(0.2, `rgba(${palette[0]*200|0},${palette[1]*180|0},${palette[2]*220|0},0.2)`)
  grad.addColorStop(0.5, `rgba(${palette[0]*140|0},${palette[1]*120|0},${palette[2]*180|0},0.05)`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')

  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256)

  for (let j = 0; j < 15; j++) {
    const x = 20 + Math.random() * 216, y = 20 + Math.random() * 216, r = 3 + Math.random() * 20
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; ctx.fill()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

export default function NebulaAtmosphere({ count = 12, spread = [4, 20], opacityRange = [0.03, 0.08], scaleRange = [6, 22] }) {
  const ref = useRef()

  const clouds = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = spread[0] + Math.random() * (spread[1] - spread[0])
      arr.push({
        pos: [Math.cos(angle) * dist, (Math.random() - 0.5) * 5, Math.sin(angle) * dist],
        scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
        speed: 0.0008 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.1 + Math.random() * 0.2,
        pulseAmount: 0.1 + Math.random() * 0.15,
        opacity: opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]),
        tex: createNebulaTexture(NEBULA_PALETTES[i % NEBULA_PALETTES.length]),
      })
    }
    return arr
  }, [])

  useFrame((st) => {
    if (!ref.current) return
    ref.current.children.forEach((sprite, i) => {
      const c = clouds[i]
      if (!c) return
      const t = st.clock.elapsedTime * c.speed + c.phase
      sprite.position.x = c.pos[0] + Math.sin(t * 0.08) * 1.2
      sprite.position.y = c.pos[1] + Math.cos(t * 0.06) * 0.6
      sprite.position.z = c.pos[2] + Math.cos(t * 0.1) * 1.2
      const pulse = 1 + c.pulseAmount * Math.sin(st.clock.elapsedTime * c.pulseSpeed + c.phase)
      sprite.material.opacity = c.opacity * pulse
    })
  })

  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale, 1]}>
          <spriteMaterial map={c.tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={c.opacity} />
        </sprite>
      ))}
    </group>
  )
}
