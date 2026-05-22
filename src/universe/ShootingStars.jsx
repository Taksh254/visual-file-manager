import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TRAIL_POINTS = 30
const STAR_COUNT = 3
const CYCLE_DURATION = 24
const ACTIVE_DURATION = 5

function generateConfig() {
  const stars = []
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      startDist: 3 + Math.random() * 4,
      endDist: 8 + Math.random() * 12,
      angle: Math.random() * Math.PI * 2,
      angleDelta: (Math.random() - 0.5) * 0.3,
      yStart: -1 + Math.random() * 2,
      yEnd: -0.5 + Math.random() * 2.5,
      delay: i * 8 + Math.random() * 6,
    })
  }
  return stars
}

export default function ShootingStars() {
  const ref = useRef()
  const config = useMemo(generateConfig, [])

  const data = useMemo(() => {
    const total = STAR_COUNT * TRAIL_POINTS
    const p = new Float32Array(total * 3)
    const s = new Float32Array(total)
    const ph = new Float32Array(total)
    const co = new Float32Array(total * 3)

    for (let i = 0; i < total; i++) {
      p[i * 3] = 0; p[i * 3 + 1] = -999; p[i * 3 + 2] = 0
      const trail = (i % TRAIL_POINTS) / TRAIL_POINTS
      ph[i] = trail
      s[i] = 0.02 + (1 - trail) * 0.08
      co[i * 3] = 1; co[i * 3 + 1] = 0.95; co[i * 3 + 2] = 0.85
    }
    return { p, s, ph, co }
  }, [])

  useFrame((st) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    const t = st.clock.elapsedTime

    for (let i = 0; i < STAR_COUNT; i++) {
      const c = config[i]
      const cycle = (t + c.delay) % CYCLE_DURATION
      const active = cycle < ACTIVE_DURATION

      if (!active) {
        for (let j = 0; j < TRAIL_POINTS; j++) {
          const idx = i * TRAIL_POINTS + j
          pos[idx * 3] = 0; pos[idx * 3 + 1] = -999; pos[idx * 3 + 2] = 0
        }
        continue
      }

      const progress = cycle / ACTIVE_DURATION
      const dist = c.startDist + progress * (c.endDist - c.startDist)
      const angle = c.angle + progress * c.angleDelta

      for (let j = 0; j < TRAIL_POINTS; j++) {
        const idx = i * TRAIL_POINTS + j
        const tp = j / TRAIL_POINTS
        const bp = Math.max(0, progress - tp * 0.06)
        const bd = c.startDist + bp * (c.endDist - c.startDist)
        const ba = c.angle + bp * c.angleDelta
        pos[idx * 3] = Math.cos(ba) * bd
        pos[idx * 3 + 1] = c.yStart + bp * (c.yEnd - c.yStart)
        pos[idx * 3 + 2] = Math.sin(ba) * bd
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={STAR_COUNT * TRAIL_POINTS} array={data.p} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={STAR_COUNT * TRAIL_POINTS} array={data.s} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={STAR_COUNT * TRAIL_POINTS} array={data.ph} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={STAR_COUNT * TRAIL_POINTS} array={data.co} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent
        vertexShader={`
          attribute float aSize; attribute float aPhase; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec4 mv=modelViewMatrix*vec4(position,1.0);
            float trail=1.0-aPhase;
            float sz=aSize*(70.0/-mv.z)*(0.3+trail*0.7);
            gl_PointSize=clamp(sz,0.0,18.0);
            gl_Position=projectionMatrix*mv;
            vAlpha=smoothstep(25.0,0.5,-mv.z)*trail*trail*0.85;
            vColor=aColor;
          }
        `}
        fragmentShader={`
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-vec2(0.5));
            float a=smoothstep(0.5,0.3,d);
            float core=exp(-d*20.0);
            gl_FragColor=vec4(vColor+vec3(core*0.5),a*vAlpha);
          }
        `}
      />
    </points>
  )
}
