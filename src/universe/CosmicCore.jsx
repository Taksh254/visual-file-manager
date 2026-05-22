import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const INNER_COUNT = 1500
const MID_COUNT = 1000
const HALO_COUNT = 500
const BRIGHT_COUNT = 100
const CORE_TOTAL = INNER_COUNT + MID_COUNT + HALO_COUNT
const ALL_PARTICLES = CORE_TOTAL + BRIGHT_COUNT

function glowTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,236,200,0.6)'); g.addColorStop(0.05, 'rgba(255,200,140,0.4)')
  g.addColorStop(0.12, 'rgba(220,150,70,0.2)'); g.addColorStop(0.35, 'rgba(140,80,50,0.06)')
  g.addColorStop(0.6, 'rgba(80,50,70,0.02)'); g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t
}

export default function CosmicCore() {
  const gRef = useRef(); const coreRef = useRef(); const glowRef = useRef(); const strRef = useRef()
  const tex = useMemo(() => glowTex(), [])

  const corePolar = useRef(null)
  const strData = useRef(null)

  const corePos = useMemo(() => {
    const count = ALL_PARTICLES + 100
    const p = new Float32Array(count * 3); const s = new Float32Array(count)
    const ph = new Float32Array(count); const co = new Float32Array(count * 3)

    const radius = new Float32Array(count); const angle = new Float32Array(count)
    const yBase = new Float32Array(count); const rotSpd = new Float32Array(count)
    const layer = new Float32Array(count)

    let idx = 0

    function addRing(n, rMax, rMin, fl, colorInner, colorOuter, sizeMin, sizeMax, spdBase, isBright) {
      for (let i = 0; i < n; i++, idx++) {
        const rr = rMin + (rMax - rMin) * Math.max(0, Math.min(1, Math.random() ** 2.5))
        const a = Math.random() * Math.PI * 2
        const aspread = 0.4 + rr * 0.5
        const yOff = (Math.random() - 0.5) * rr * fl * 2

        radius[idx] = rr; angle[idx] = a; yBase[idx] = yOff
        rotSpd[idx] = spdBase / (1 + rr * 4)

        p[idx * 3] = rr * Math.cos(a)
        p[idx * 3 + 1] = yOff
        p[idx * 3 + 2] = rr * Math.sin(a)

        const t = (rr - rMin) / (rMax - rMin + 0.001)
        const v = 0.8 + Math.random() * 0.2
        const brightSpot = Math.random() < 0.12 ? 1.5 : 1.0
        co[idx * 3] = (colorInner[0] * (1 - t) + colorOuter[0] * t) * v * brightSpot
        co[idx * 3 + 1] = (colorInner[1] * (1 - t) + colorOuter[1] * t) * v * brightSpot * 0.85
        co[idx * 3 + 2] = (colorInner[2] * (1 - t) + colorOuter[2] * t) * v * brightSpot * 0.7

        const sz = sizeMin + Math.random() ** 2 * (sizeMax - sizeMin)
        s[idx] = isBright ? sz * 2.5 : sz
        ph[idx] = Math.random() * Math.PI * 2
        layer[idx] = isBright ? 2 : 0
      }
    }

    addRing(INNER_COUNT, 0.18, 0, 0.7, [1.0, 0.95, 0.85], [1.0, 0.78, 0.4], 0.03, 0.12, 0.35, false)
    addRing(MID_COUNT, 0.35, 0.05, 0.35, [1.0, 0.78, 0.4], [0.95, 0.45, 0.15], 0.02, 0.08, 0.2, false)
    addRing(HALO_COUNT, 0.6, 0.15, 0.8, [0.85, 0.5, 0.2], [0.35, 0.4, 0.85], 0.006, 0.03, 0.08, false)
    addRing(BRIGHT_COUNT, 0.5, 0.02, 0.6, [1.0, 0.9, 0.7], [0.8, 0.6, 0.9], 0.04, 0.2, 0.25, true)

    corePolar.current = { radius, angle, yBase, rotSpd, layer }

    return { p, s, ph, co }
  }, [])

  const strP = useMemo(() => {
    const n = 200
    const p = new Float32Array(n * 3); const s = new Float32Array(n)
    const ph = new Float32Array(n); const co = new Float32Array(n * 3)
    const r = new Float32Array(n); const a = new Float32Array(n); const spd = new Float32Array(n)
    const tilt = new Float32Array(n); const ecc = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const rr = 0.06 + Math.random() ** 1.5 * 0.55
      const aa = Math.random() * Math.PI * 2
      r[i] = rr; a[i] = aa; spd[i] = 0.08 + Math.random() ** 1.2 * 0.5
      tilt[i] = (Math.random() - 0.5) * 0.5; ecc[i] = 0.06 + Math.random() * 0.15
      p[i * 3] = Math.cos(aa) * rr; p[i * 3 + 1] = 0; p[i * 3 + 2] = Math.sin(aa) * rr
      s[i] = 0.06 + Math.random() * 0.25
      ph[i] = Math.random() * Math.PI * 2
      const ct = Math.random()
      if (ct < 0.3) { co[i * 3] = 1.0; co[i * 3 + 1] = 0.9; co[i * 3 + 2] = 0.65 }
      else if (ct < 0.55) { co[i * 3] = 1.0; co[i * 3 + 1] = 0.65; co[i * 3 + 2] = 0.25 }
      else if (ct < 0.75) { co[i * 3] = 0.55; co[i * 3 + 1] = 0.55; co[i * 3 + 2] = 1.0 }
      else { co[i * 3] = 1.0; co[i * 3 + 1] = 0.4; co[i * 3 + 2] = 0.2 }
    }
    strData.current = { r, a, spd, tilt, ecc }
    return { p, s, ph, co }
  }, [])

  const glowPos = useMemo(() => {
    const n = 40; const p = new Float32Array(n * 3); const s = new Float32Array(n)
    const ph = new Float32Array(n); const co = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const rr = Math.random() ** 5 * 0.04
      const th = Math.random() * Math.PI * 2; const pha = Math.acos(2 * Math.random() - 1)
      p[i * 3] = rr * Math.sin(pha) * Math.cos(th)
      p[i * 3 + 1] = rr * Math.cos(pha) * 0.2
      p[i * 3 + 2] = rr * Math.sin(pha) * Math.sin(th)
      s[i] = 0.15 + Math.random() * 0.35
      ph[i] = Math.random() * Math.PI * 2
      co[i * 3] = 1.0; co[i * 3 + 1] = 0.93; co[i * 3 + 2] = 0.8
    }
    return { p, s, ph, co }
  }, [])

  const coreGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(corePos.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(corePos.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(corePos.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(corePos.co, 3))
    return g
  }, [])

  const strGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(strP.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(strP.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(strP.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(strP.co, 3))
    return g
  }, [])

  const glowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(glowPos.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(glowPos.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(glowPos.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(glowPos.co, 3))
    return g
  }, [])

  const coreMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p = position;
        float br = 1.0 + sin(uTime * 0.06 + aPhase) * 0.005;
        p *= br;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float sz = aSize * (200.0 / dist);
        gl_PointSize = clamp(sz, 0.0, 30.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.7 + 0.1 * sin(uTime * (0.06 + aPhase * 0.02) + aPhase * 6.28);
        vAlpha = smoothstep(40.0, 0.5, dist) * tw;
        vColor = aColor * (0.6 + 0.15 * tw);
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        float spike = exp(-d * 16.0);
        float glow = exp(-d * 5.0) * 0.25;
        float alpha = smoothstep(0.5, 0.05, d);
        vec3 col = vColor + vec3(spike * 0.8, spike * 0.5, spike * 0.2) + glow * 0.3;
        gl_FragColor = vec4(col, alpha * vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  const glowMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p = position;
        float pulse = 1.0 + sin(uTime * 0.03 + aPhase) * 0.03;
        p *= pulse;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float sz = aSize * (250.0 / dist);
        gl_PointSize = clamp(sz, 0.0, 60.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = smoothstep(60.0, 1.0, dist) * 0.5;
        vColor = aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        float g = exp(-d * d * 3.0);
        float outer = exp(-d * 1.0) * 0.15;
        float alpha = g * 0.6 + outer * 0.4;
        vec3 col = vColor * (g * 1.2 + outer * 0.3) + vec3(g * 1.0, g * 0.6, g * 0.15);
        gl_FragColor = vec4(clamp(col, 0.0, 1.5), alpha * vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  const strMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = -mv.z;
        float sz = aSize * (200.0 / dist);
        gl_PointSize = clamp(sz, 0.0, 40.0);
        gl_Position = projectionMatrix * mv;
        float pulse = 0.4 + 0.4 * sin(uTime * 0.08 + aPhase * 2.0);
        vAlpha = smoothstep(40.0, 0.8, dist) * pulse;
        vColor = aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        float spike = exp(-d * 16.0);
        float glow = exp(-d * 5.0) * 0.15;
        float alpha = smoothstep(0.5, 0.1, d);
        vec3 col = vColor + vec3(spike * 1.5, spike * 0.9, spike * 0.35) + glow * 0.5;
        gl_FragColor = vec4(col, alpha * vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  useFrame((st) => {
    const t = st.clock.elapsedTime; const d = st.clock.getDelta()

    if (gRef.current) {
      gRef.current.rotation.y = t * 0.005
      gRef.current.rotation.x = Math.sin(t * 0.0015) * 0.002
    }
    if (coreRef.current) coreRef.current.material.uniforms.uTime.value = t
    if (glowRef.current) glowRef.current.material.uniforms.uTime.value = t
    if (strRef.current) strRef.current.material.uniforms.uTime.value = t

    const pos = coreRef.current?.geometry.attributes.position.array
    if (pos && corePolar.current) {
      const { radius: rd, angle: an, yBase: yb, rotSpd: sp } = corePolar.current
      for (let i = 0, n = CORE_TOTAL; i < n; i++) {
        const a = an[i] + t * sp[i]
        const wobble = Math.sin(t * 0.04 + an[i] * 3) * 0.003
        pos[i * 3] = rd[i] * Math.cos(a)
        pos[i * 3 + 1] = yb[i] + wobble
        pos[i * 3 + 2] = rd[i] * Math.sin(a)
      }
      const off = CORE_TOTAL
      for (let i = 0, n = BRIGHT_COUNT; i < n; i++) {
        const a = an[off + i] + t * sp[off + i] * 0.7
        pos[(off + i) * 3] = rd[off + i] * Math.cos(a)
        pos[(off + i) * 3 + 1] = yb[off + i] + Math.sin(t * 0.05 + an[off + i]) * 0.005
        pos[(off + i) * 3 + 2] = rd[off + i] * Math.sin(a)
      }
      coreRef.current.geometry.attributes.position.needsUpdate = true
    }

    if (strRef.current) {
      const sp = strRef.current.geometry.attributes.position.array
      if (sp && strData.current) {
        const { r, a, spd, tilt, ecc } = strData.current
        for (let i = 0; i < 500; i++) {
          const aa = a[i] + t * spd[i] * 0.08
          const rr = r[i] + Math.sin(aa * 2) * ecc[i] + Math.sin(t * spd[i] * 0.06 + i) * 0.03
          const tlt = tilt[i] * Math.sin(t * 0.025 + i * 0.5)
          sp[i * 3] = Math.cos(aa) * rr
          sp[i * 3 + 1] = Math.sin(t * spd[i] * 0.04 + i) * 0.02 + tlt
          sp[i * 3 + 2] = Math.sin(aa) * rr
        }
        strRef.current.geometry.attributes.position.needsUpdate = true
      }
    }
  })

  return (
    <group ref={gRef}>
      <points ref={coreRef} geometry={coreGeo} material={coreMat} />
      <points ref={glowRef} geometry={glowGeo} material={glowMat} />
      <points ref={strRef} geometry={strGeo} material={strMat} />
      <sprite scale={[1.0, 1.0, 1]}>
        <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.3} />
      </sprite>
    </group>
  )
}
