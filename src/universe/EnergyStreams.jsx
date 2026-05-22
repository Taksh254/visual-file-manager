import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLES_PER_STREAM = 600
const CURVE_SEGMENTS = 30

function deterministicRandom(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.545
  return x - Math.floor(x)
}

function buildCurvePoints(p1, p2, seed = 0) {
  const pts = []
  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS
    const r1 = deterministicRandom(seed + i * 3 + 1)
    const r2 = deterministicRandom(seed + i * 3 + 2)
    const r3 = deterministicRandom(seed + i * 3 + 3)

    const mid = new THREE.Vector3(
      (p1[0] + p2[0]) / 2 + (r1 - 0.5) * 0.6,
      (p1[1] + p2[1]) / 2 + (r2 - 0.5) * 0.4,
      (p1[2] + p2[2]) / 2 + (r3 - 0.5) * 0.6,
    )

    const a = new THREE.Vector3(p1[0], p1[1], p1[2])
    const b = new THREE.Vector3(p2[0], p2[1], p2[2])
    const q0 = a.clone().lerp(mid, t)
    const q1 = mid.clone().lerp(b, t)
    pts.push(q0.clone().lerp(q1, t))
  }
  return pts
}

function Stream({ points, color }) {
  const ref = useRef()

  const data = useMemo(() => {
    const p = new Float32Array(PARTICLES_PER_STREAM * 3)
    const ph = new Float32Array(PARTICLES_PER_STREAM)
    const s = new Float32Array(PARTICLES_PER_STREAM)
    const co = new Float32Array(PARTICLES_PER_STREAM * 3)

    let totalDist = 0
    for (let i = 1; i < points.length; i++) {
      totalDist += points[i].distanceTo(points[i - 1])
    }

    for (let i = 0; i < PARTICLES_PER_STREAM; i++) {
      const progress = (i + 0.5) / PARTICLES_PER_STREAM
      let acc = 0, segIdx = 0
      for (let j = 1; j < points.length; j++) {
        const segLen = points[j].distanceTo(points[j - 1])
        if (acc + segLen >= progress * totalDist) { segIdx = j - 1; break }
        acc += segLen
      }
      const segLen = points[segIdx + 1].distanceTo(points[segIdx])
      const lt = segLen > 0 ? (progress * totalDist - acc) / segLen : 0
      const pt = points[segIdx].clone().lerp(points[segIdx + 1], lt)

      const off = 0.002 + Math.random() * 0.015
      const ang = Math.random() * Math.PI * 2
      const h = (Math.random() - 0.5) * 0.01

      p[i * 3] = pt.x + Math.cos(ang) * off
      p[i * 3 + 1] = pt.y + h
      p[i * 3 + 2] = pt.z + Math.sin(ang) * off

      ph[i] = Math.random() * Math.PI * 2
      s[i] = 0.015 + Math.random() * 0.025

      const bri = 1.2 + Math.random() * 0.6
      co[i * 3] = color.r * bri
      co[i * 3 + 1] = color.g * bri
      co[i * 3 + 2] = color.b * bri
    }
    return { p, ph, s, co }
  }, [])

  useFrame((st) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = st.clock.elapsedTime
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLES_PER_STREAM} array={data.p} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" count={PARTICLES_PER_STREAM} array={data.ph} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={PARTICLES_PER_STREAM} array={data.s} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={PARTICLES_PER_STREAM} array={data.co} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent
        vertexShader={`
          uniform float uTime;
          attribute float aPhase; attribute float aSize; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec3 p=position; float t=uTime*1.0, ph=aPhase;
            float flow=fract(t*0.04+ph*0.5);
            float fOff=flow*0.4-0.2;
            p.x+=sin(t*0.004+ph)*fOff;
            p.y+=cos(t*0.003+ph*1.3)*abs(fOff)*0.5;
            p.z+=sin(t*0.005+ph*0.7)*fOff;
            vec4 mv=modelViewMatrix*vec4(p,1.0);
            gl_PointSize=clamp(aSize*(70.0/-mv.z),0.2,6.0);
            gl_Position=projectionMatrix*mv;
            float pulse=0.4+0.6*(1.0-abs(flow-0.5)*2.0);
            vAlpha=smoothstep(15.0,0.8,-mv.z)*pulse*0.6;
            vColor=aColor;
          }
        `}
        fragmentShader={`
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-vec2(0.5));
            float a=smoothstep(0.5,0.25,d);
            float core=exp(-d*14.0);
            gl_FragColor=vec4(vColor+vec3(core*0.7),a*vAlpha);
          }
        `}
        uniforms={{ uTime: { value: 0 } }}
      />
    </points>
  )
}

export default function EnergyStreams({ clusters }) {
  if (!clusters) return null

  const positions = Object.values(clusters).map(c => c.position)
  if (positions.length < 2) return null

  const pairs = []
  const indices = Object.keys(clusters)
  for (let i = 0; i < indices.length; i++) {
    const j = (i + 1) % indices.length
    const colorA = clusters[indices[i]].color
    const colorB = clusters[indices[j]].color

    const midColor = new THREE.Color(
      (colorA.r + colorB.r) / 2,
      (colorA.g + colorB.g) / 2,
      (colorA.b + colorB.b) / 2,
    ).multiplyScalar(0.9)

    pairs.push({
      points: buildCurvePoints(
        clusters[indices[i]].position,
        clusters[indices[j]].position,
        i * 1000,
      ),
      color: midColor,
      key: `${indices[i]}-${indices[j]}`,
    })
  }

  return (
    <group>
      {pairs.map(p => (
        <Stream key={p.key} points={p.points} color={p.color} />
      ))}
    </group>
  )
}
