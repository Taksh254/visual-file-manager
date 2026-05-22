import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial, applyBufferAttributes } from '../systems/ParticleRenderer'

const STAR_COLORS = {
  cool: { r: 0.9, g: 0.92, b: 1.0 },
  warm: { r: 1.0, g: 0.85, b: 0.65 },
  neutral: { r: 0.95, g: 0.95, b: 0.95 },
}

function generateStars(count, spread, sizeRange, warmBias = 0.35) {
  const p = new Float32Array(count * 3)
  const s = new Float32Array(count)
  const ph = new Float32Array(count)
  const co = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const dist = spread[0] + Math.random() * (spread[1] - spread[0])
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    p[i * 3] = dist * Math.sin(phi) * Math.cos(theta)
    p[i * 3 + 1] = dist * Math.cos(phi) * 0.2
    p[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta)

    s[i] = sizeRange[0] + Math.random() ** 2 * (sizeRange[1] - sizeRange[0])
    ph[i] = Math.random() * Math.PI * 2

    const palette = Math.random() > warmBias ? STAR_COLORS.cool : STAR_COLORS.warm
    const bri = 0.6 + Math.random() * 0.4
    co[i * 3] = palette.r * bri
    co[i * 3 + 1] = palette.g * bri
    co[i * 3 + 2] = palette.b * bri
  }

  return { p, s, ph, co }
}

function StarLayer({ count, spread, sizeRange, driftSpeed, twinkleSpeed, warmBias }) {
  const ref = useRef()

  const data = useMemo(() => generateStars(count, spread, sizeRange, warmBias), [])

  const mat = useMemo(() => createParticleMaterial({
    vertexShader: `
      uniform float uTime;
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p=position;
        float t=uTime, ph=aPhase;
        p.x+=sin(t*${driftSpeed.toFixed(5)}+ph)*${(driftSpeed*200).toFixed(1)};
        p.y+=cos(t*${(driftSpeed*0.8).toFixed(5)}+ph*1.3)*${(driftSpeed*100).toFixed(1)};
        p.z+=sin(t*${(driftSpeed*0.6).toFixed(5)}+ph*0.8)*${(driftSpeed*150).toFixed(1)};
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(aSize*(35.0/-mv.z),0.0,${(sizeRange[1]*50).toFixed(1)});
        gl_Position=projectionMatrix*mv;
        float tw=0.9+0.1*sin(t*${twinkleSpeed.toFixed(3)}+ph*2.0);
        vAlpha=smoothstep(35.0,0.5,-mv.z)*tw;
        vColor=aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-vec2(0.5));
        float alpha=smoothstep(0.5,0.45,d);
        float core=exp(-d*25.0);
        gl_FragColor=vec4(vColor+vec3(core*0.3),alpha*vAlpha);
      }
    `,
  }), [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    return applyBufferAttributes(g, count, data)
  }, [])

  useFrame((st) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = st.clock.elapsedTime
  })

  return (
    <points ref={ref} geometry={geo} material={mat} />
  )
}

export default function Starfield() {
  return (
    <group>
      <StarLayer count={2000} spread={[30, 70]} sizeRange={[0.003, 0.04]} driftSpeed={0.0003} twinkleSpeed={0.03} warmBias={0.3} />
      <StarLayer count={800} spread={[10, 28]} sizeRange={[0.008, 0.06]} driftSpeed={0.0008} twinkleSpeed={0.06} warmBias={0.35} />
      <StarLayer count={200} spread={[3, 9]} sizeRange={[0.015, 0.1]} driftSpeed={0.002} twinkleSpeed={0.1} warmBias={0.4} />
    </group>
  )
}
