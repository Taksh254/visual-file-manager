import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const HAZE_PARTICLES = 80
const STAR_PARTICLES = 600
const CURVE_SAMPLES = 100
const BRANCH_COUNT = 1
const BRANCH_PARTICLES = 40
const BRANCH_SEGMENTS = 30

function seeded(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function buildCurve(p1, p2, seed) {
  const rng = seeded(seed)
  const swing = 1.0 + rng() * 2.0
  const extra = (rng() - 0.5) * swing * 0.8
  const mid = new THREE.Vector3(
    (p1.x + p2.x) / 2 + (rng() - 0.5) * swing,
    (p1.y + p2.y) / 2 + (rng() - 0.5) * swing * 0.7,
    (p1.z + p2.z) / 2 + (rng() - 0.5) * swing,
  )
  const off1 = new THREE.Vector3((rng() - 0.5) * swing * 0.8, (rng() - 0.5) * swing * 0.5, (rng() - 0.5) * swing * 0.8)
  const off2 = new THREE.Vector3((rng() - 0.5) * swing * 0.8, (rng() - 0.5) * swing * 0.5, (rng() - 0.5) * swing * 0.8)
  const c1 = new THREE.Vector3().lerpVectors(p1, mid, 0.25 + rng() * 0.2).add(off1)
  const c2 = new THREE.Vector3().lerpVectors(mid, p2, 0.25 + rng() * 0.2).add(off2)
  const c3 = new THREE.Vector3().lerpVectors(p1, mid, 0.5 + rng() * 0.15).add(new THREE.Vector3((rng() - 0.5) * swing * 0.6, (rng() - 0.5) * swing * 0.4, (rng() - 0.5) * swing * 0.6))
  return new THREE.CatmullRomCurve3([p1.clone(), c1, c3, c2, p2.clone()])
}

function sampleCurve(curve, n) {
  const pts = new Float32Array((n + 1) * 3)
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n)
    pts[i * 3] = p.x; pts[i * 3 + 1] = p.y; pts[i * 3 + 2] = p.z
  }
  return pts
}

function getPointOnSamples(samples, t, n) {
  const idx = t * n
  const i0 = Math.floor(idx); const i1 = Math.min(i0 + 1, n)
  const f = idx - i0
  return {
    x: samples[i0 * 3] * (1 - f) + samples[i1 * 3] * f,
    y: samples[i0 * 3 + 1] * (1 - f) + samples[i1 * 3 + 1] * f,
    z: samples[i0 * 3 + 2] * (1 - f) + samples[i1 * 3 + 2] * f,
  }
}

function generateBranch(mainCurve, branchT, seed, spread) {
  const rng = seeded(seed)
  const origin = mainCurve.getPoint(branchT)
  const tangent = mainCurve.getTangent(branchT)
  const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
  if (perp.length() < 0.01) perp.set(0, 0, 1)
  const up = new THREE.Vector3().crossVectors(tangent, perp).normalize()
  const defl = new THREE.Vector3()
    .addScaledVector(perp, (rng() - 0.5) * spread)
    .addScaledVector(up, (rng() - 0.5) * spread * 0.5)
  const end = origin.clone().add(tangent.clone().multiplyScalar(1.0 + rng() * 0.8)).add(defl)
  const cp1 = origin.clone().lerp(end, 0.3).add(new THREE.Vector3((rng() - 0.5) * 0.4, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.4))
  const cp2 = origin.clone().lerp(end, 0.7).add(new THREE.Vector3((rng() - 0.5) * 0.4, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.4))
  return new THREE.CatmullRomCurve3([origin, cp1, cp2, end])
}

function BranchPoints({ branch, color }) {
  const ref = useRef()
  const data = useMemo(() => {
    const segs = BRANCH_SEGMENTS
    const pts = []
    for (let i = 0; i <= segs; i++) { const pt = branch.getPoint(i / segs); pts.push(pt.x, pt.y, pt.z) }
    const count = BRANCH_PARTICLES
    const p = new Float32Array(count * 3); const s = new Float32Array(count); const ph = new Float32Array(count); const co = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = i / count; const idx = t * (segs - 1); const i0 = Math.floor(idx), i1 = Math.min(i0 + 1, segs - 1); const f = idx - i0
      const rad = (0.5 - Math.random()) * 0.25; const ang = Math.random() * Math.PI * 2
      p[i * 3] = (pts[i0 * 3] * (1 - f) + pts[i1 * 3] * f) + Math.cos(ang) * rad
      p[i * 3 + 1] = (pts[i0 * 3 + 1] * (1 - f) + pts[i1 * 3 + 1] * f) + (Math.random() - 0.5) * 0.1
      p[i * 3 + 2] = (pts[i0 * 3 + 2] * (1 - f) + pts[i1 * 3 + 2] * f) + Math.sin(ang) * rad
      s[i] = 0.006 + Math.random() * 0.02; ph[i] = Math.random() * Math.PI * 2
      const bri = 0.2 + Math.random() * 0.3
      co[i * 3] = color.r * bri; co[i * 3 + 1] = color.g * bri; co[i * 3 + 2] = color.b * bri
    }
    return { p, s, ph, co }
  }, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(data.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(data.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(data.co, 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=clamp(aSize*(40.0/-mv.z),0.0,3.0);
        gl_Position=projectionMatrix*mv;
        float p=0.4+0.6*sin(uTime*0.08+aPhase);
        vAlpha=smoothstep(15.0,0.5,-mv.z)*p*0.25;
        vColor=aColor;
      }
    `,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=smoothstep(0.5,0.4,d);gl_FragColor=vec4(vColor,a*vAlpha);}`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])
  useFrame((st) => { if (ref.current) ref.current.material.uniforms.uTime.value = st.clock.elapsedTime })
  return <points ref={ref} geometry={geo} material={mat} />
}

function NodeGlow({ position, color }) {
  const ref = useRef()
  const count = 300
  const data = useMemo(() => {
    const p = new Float32Array(count * 3); const s = new Float32Array(count); const ph = new Float32Array(count); const co = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = Math.random() ** 3 * 0.3; const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1)
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta); p[i * 3 + 1] = r * Math.cos(phi) * 0.5; p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      s[i] = 0.03 + Math.random() * 0.08; ph[i] = Math.random() * Math.PI * 2
      const bri = 0.7 + Math.random() * 0.3
      co[i * 3] = color.r * bri; co[i * 3 + 1] = color.g * bri; co[i * 3 + 2] = color.b * bri
    }
    return { p, s, ph, co }
  }, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(data.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(data.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(data.co, 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p=position; float t=uTime, ph=aPhase;
        p.x+=sin(t*0.006+ph)*0.008; p.y+=cos(t*0.005+ph*1.3)*0.005; p.z+=sin(t*0.008+ph*0.7)*0.008;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(aSize*(80.0/-mv.z),0.0,16.0);
        gl_Position=projectionMatrix*mv;
        float pulse=0.5+0.3*sin(t*0.15+ph*2.0);
        vAlpha=smoothstep(14.0,0.3,-mv.z)*pulse*0.6;
        vColor=aColor;
      }
    `,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5)); float a=smoothstep(0.5,0.15,d); float c=exp(-d*8.0); gl_FragColor=vec4(vColor+vec3(c*1.2,c*0.8,c*0.4),a*vAlpha*0.7);}`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])
  useFrame((st) => { if (ref.current) ref.current.material.uniforms.uTime.value = st.clock.elapsedTime })
  return <points ref={ref} position={[position.x, position.y, position.z]} geometry={geo} material={mat} />
}

function ConnectionStream({ curve, color, rng, startPos, endPos }) {
  const hazeRef = useRef()
  const starRef = useRef()

  const curvePts = useMemo(() => sampleCurve(curve, CURVE_SAMPLES), [])

  const haze = useMemo(() => {
    const count = HAZE_PARTICLES
    const p = new Float32Array(count * 3); const s = new Float32Array(count); const ph = new Float32Array(count); const co = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = i / count; const pt = getPointOnSamples(curvePts, t, CURVE_SAMPLES)
      const rad = 0.2 + Math.random() * 0.6; const ang = Math.random() * Math.PI * 2
      p[i * 3] = pt.x + Math.cos(ang) * rad; p[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.2; p[i * 3 + 2] = pt.z + Math.sin(ang) * rad
      s[i] = 0.001 + Math.random() * 0.006; ph[i] = Math.random() * Math.PI * 2
      const bri = 0.03 + Math.random() * 0.06
      co[i * 3] = color.r * bri; co[i * 3 + 1] = color.g * bri; co[i * 3 + 2] = color.b * bri
    }
    return { p, s, ph, co }
  }, [])

  const stars = useMemo(() => {
    const count = STAR_PARTICLES
    const p = new Float32Array(count * 3); const s = new Float32Array(count); const ph = new Float32Array(count)
    const co = new Float32Array(count * 3); const flowT = new Float32Array(count); const speed = new Float32Array(count)
    const latPhase = new Float32Array(count); const latAmp = new Float32Array(count); const vertAmp = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const t = i / count; const pt = getPointOnSamples(curvePts, t, CURVE_SAMPLES)
      const isBig = Math.random() < 0.05
      const latOff = (Math.random() - 0.5) * 0.04
      const vertOff = (Math.random() - 0.5) * 0.02
      p[i * 3] = pt.x; p[i * 3 + 1] = pt.y + vertOff; p[i * 3 + 2] = pt.z
      s[i] = isBig ? 0.05 + Math.random() * 0.12 : 0.008 + Math.random() ** 2 * 0.05
      ph[i] = Math.random() * Math.PI * 2
      const bri = isBig ? 1.0 + Math.random() * 0.5 : 0.2 + Math.random() * 0.5
      co[i * 3] = color.r * bri; co[i * 3 + 1] = color.g * bri; co[i * 3 + 2] = color.b * bri
      flowT[i] = t
      speed[i] = 0.02 + Math.random() ** 1.5 * 0.5
      latPhase[i] = Math.random() * Math.PI * 2
      latAmp[i] = 0.005 + Math.random() * 0.06
      vertAmp[i] = 0.003 + Math.random() * 0.02
    }
    return { p, s, ph, co, flowT, speed, latPhase, latAmp, vertAmp }
  }, [])

  const hazeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(haze.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(haze.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(haze.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(haze.co, 3))
    return g
  }, [])

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(stars.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(stars.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(stars.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(stars.co, 3))
    return g
  }, [])

  const starMeta = useRef({ speed: stars.speed, flowT: stars.flowT.slice(), latPhase: stars.latPhase, latAmp: stars.latAmp, vertAmp: stars.vertAmp })

  const hazeMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=clamp(aSize*(30.0/-mv.z),0.0,3.0);
        gl_Position=projectionMatrix*mv;
        vAlpha=smoothstep(15.0,2.0,-mv.z)*0.08*(0.5+0.5*sin(uTime*0.05+aPhase));
        vColor=aColor;
      }
    `,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=1.0-smoothstep(0.0,0.5,d);gl_FragColor=vec4(vColor,a*vAlpha);}`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  const starMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime; attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        float sz=aSize*(70.0/-mv.z);
        gl_PointSize=clamp(sz,0.0,20.0);
        gl_Position=projectionMatrix*mv;
        float tw=0.6+0.2*sin(uTime*0.06+aPhase*2.0);
        vAlpha=smoothstep(25.0,0.5,-mv.z)*tw;
        vColor=aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-vec2(0.5));
        float a=smoothstep(0.5,0.1,d);
        float core=exp(-d*6.0);
        float glow=exp(-d*2.5)*0.3;
        gl_FragColor=vec4(vColor+vec3(core*1.5,core*1.0,core*0.5)+glow,a*vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  const branchData = useMemo(() => {
    const arr = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const bt = 0.2 + rng() * 0.6
      arr.push(generateBranch(curve, bt, Math.floor(rng() * 10000), 0.6 + rng() * 0.5))
    }
    return arr
  }, [])

  useFrame((st, delta) => {
    const ft = st.clock.elapsedTime
    if (hazeRef.current) hazeRef.current.material.uniforms.uTime.value = ft
    if (starRef.current) starRef.current.material.uniforms.uTime.value = ft

    const sPos = starRef.current?.geometry.attributes.position.array
    if (!sPos) return
    const meta = starMeta.current
    const fArr = meta.flowT
    for (let i = 0; i < STAR_PARTICLES; i++) {
      fArr[i] += delta * meta.speed[i] * 0.25
      if (fArr[i] > 1) fArr[i] -= 1
      const pt = getPointOnSamples(curvePts, fArr[i], CURVE_SAMPLES)
      const lat = Math.sin(ft * 0.15 + meta.latPhase[i]) * meta.latAmp[i]
      const vert = Math.cos(ft * 0.12 + meta.latPhase[i] * 1.3) * meta.vertAmp[i]
      sPos[i * 3] = pt.x + lat
      sPos[i * 3 + 1] = pt.y + vert
      sPos[i * 3 + 2] = pt.z
    }
    starRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group>
      <points ref={hazeRef} geometry={hazeGeo} material={hazeMat} />
      <points ref={starRef} geometry={starGeo} material={starMat} />
      {branchData.map((b, i) => <BranchPoints key={i} branch={b} color={color} />)}
    </group>
  )
}

export default function NeuralPathways({ clusters }) {
  if (!clusters) return null

  const conns = useMemo(() => {
    const keys = Object.keys(clusters)
    if (keys.length < 2) return []
    const vals = keys.map(k => clusters[k])
    const arr = []
    const centerPos = new THREE.Vector3(0, 0, 0)

    for (let i = 0; i < keys.length; i++) {
      const j = (i + 1) % keys.length
      const colA = vals[i].color; const colB = vals[j].color
      const color = new THREE.Color((colA.r + colB.r) / 2, (colA.g + colB.g) / 2, (colA.b + colB.b) / 2).multiplyScalar(1.6)
      const p1 = new THREE.Vector3(vals[i].position[0], vals[i].position[1], vals[i].position[2])
      const p2 = new THREE.Vector3(vals[j].position[0], vals[j].position[1], vals[j].position[2])
      arr.push({ curve: buildCurve(p1, p2, i * 100), color, rng: seeded(i * 100 + 50), key: `ring-${i}`, startPos: p1, endPos: p2 })
    }

    for (let i = 0; i < keys.length; i++) {
      const col = vals[i].color
      const color = new THREE.Color(col.r, col.g, col.b).multiplyScalar(1.8)
      const p = new THREE.Vector3(vals[i].position[0], vals[i].position[1], vals[i].position[2])
      arr.push({ curve: buildCurve(centerPos, p, i * 100 + 200), color, rng: seeded(i * 100 + 250), key: `hub-${i}`, startPos: centerPos, endPos: p })

      const outDir = p.clone().normalize()
      const extOut = p.clone().add(outDir.clone().multiplyScalar(0.6 + seeded(i * 100 + 300)() * 0.8))
      arr.push({ curve: buildCurve(p, extOut, i * 100 + 400), color: color.clone().multiplyScalar(0.5), rng: seeded(i * 100 + 450), key: `ext-${i}`, startPos: p, endPos: extOut })
    }

    return arr
  }, [clusters])

  return (
    <group>
      {conns.map(c => (
        <ConnectionStream key={c.key} curve={c.curve} color={c.color} rng={c.rng} startPos={c.startPos} endPos={c.endPos} />
      ))}
      {conns.filter(c => c.key.startsWith('hub-')).map(c => (
        <NodeGlow key={`node-${c.key}`} position={c.endPos} color={c.color} />
      ))}
    </group>
  )
}
