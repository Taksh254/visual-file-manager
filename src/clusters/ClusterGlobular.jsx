import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INTENT } from '../systems/InteractionManager'

function generateCluster(totalCount, color, radius) {
  const coreCount = Math.floor(totalCount * 0.5)
  const midCount = Math.floor(totalCount * 0.3)
  const outerCount = totalCount - coreCount - midCount

  const p = new Float32Array(totalCount * 3)
  const s = new Float32Array(totalCount)
  const ph = new Float32Array(totalCount)
  const co = new Float32Array(totalCount * 3)

  const base = new THREE.Color(color.r, color.g, color.b)
  const hot = base.clone().multiplyScalar(2.5).lerp(new THREE.Color(1, 0.95, 0.8), 0.25)
  const bright = base.clone().multiplyScalar(2.0)
  const mid = base.clone().multiplyScalar(1.4)
  const dim = base.clone().lerp(new THREE.Color(0.3, 0.2, 0.4), 0.5)
  const dark = base.clone().lerp(new THREE.Color(0.1, 0.08, 0.18), 0.7)

  let idx = 0

  function place(n, rMax, pow, sizeMin, sizeMax, brightMin, brightMax, colorA, colorB, spiral = false) {
    for (let i = 0; i < n; i++) {
      const r = Math.random() ** pow * rMax
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const asym = 1 + (Math.random() - 0.5) * 0.12
      const flatten = 0.8 + (Math.random() - 0.5) * 0.1

      let angle = theta
      if (spiral && r > 0.05) {
        const spiralArms = 2 + Math.floor(Math.random() * 2)
        const armAngle = (theta % (Math.PI * 2 / spiralArms)) + (Math.PI * 2 / spiralArms) * Math.floor(theta / (Math.PI * 2 / spiralArms))
        angle = armAngle + Math.log(r * 5 + 1) * 0.5 + (Math.random() - 0.5) * 0.1 * (r / rMax)
      }

      p[idx * 3] = r * Math.sin(phi) * Math.cos(angle) * asym
      p[idx * 3 + 1] = r * Math.cos(phi) * flatten
      p[idx * 3 + 2] = r * Math.sin(phi) * Math.sin(angle) * asym

      const coreBoost = 1 + Math.max(0, 1 - r / (rMax * 0.3)) * 0.8
      s[idx] = (sizeMin + Math.random() ** 1.5 * (sizeMax - sizeMin)) * coreBoost
      ph[idx] = Math.random() * Math.PI * 2

      const nt = r / rMax
      const bri = brightMin + Math.random() * (brightMax - brightMin)
      const cC = colorA.clone().lerp(colorB, nt)
      co[idx * 3] = cC.r * bri
      co[idx * 3 + 1] = cC.g * bri
      co[idx * 3 + 2] = cC.b * bri
      idx++
    }
  }

  place(coreCount, 0.2, 4.0, 0.03, 0.12, 1.0, 2.0, hot, bright, true)
  place(midCount, 0.5, 2.8, 0.015, 0.06, 0.4, 1.0, bright, mid, true)
  place(outerCount, radius, 2.0, 0.005, 0.03, 0.1, 0.5, mid, dim)

  return { p, s, ph, co }
}

export default function ClusterGlobular({ color, totalCount = 5000, radius = 1.0, clusterState = 'idle', hoverProgress = 0 }) {
  const ref = useRef()
  const scaleRef = useRef(1)
  const glowRef = useRef(1)

  const data = useMemo(() => generateCluster(totalCount, color, radius), [totalCount, color, radius])
  const baseColor = useMemo(() => new THREE.Color(color.r, color.g, color.b), [color])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(data.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(data.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(data.co, 3))
    return g
  }, [data])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uHoverGlow: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uHoverGlow;
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha; varying float vSize;
      void main(){
        vec3 p=position; float t=uTime,ph=aPhase;
        p.x+=sin(t*0.003+ph*2.0)*0.002;
        p.y+=cos(t*0.0025+ph*1.7)*0.002;
        p.z+=sin(t*0.0035+ph*1.3)*0.002;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        float sz=aSize*(160.0/-mv.z)*(1.0+uHoverGlow*0.15);
        gl_PointSize=clamp(sz,0.1,30.0);
        gl_Position=projectionMatrix*mv;
        float tw=0.8+0.2*(sin(t*(0.008+aSize*0.3)+ph)*0.6+sin(t*(0.012+aSize*0.5)+ph*1.7)*0.3+sin(t*0.005+ph*0.8)*0.1);
        float fade=smoothstep(35.0,0.1,-mv.z);
        float hoverBright=1.0+uHoverGlow*0.3;
        vAlpha=fade*tw*hoverBright;
        vColor=aColor*hoverBright; vSize=sz;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha; varying float vSize;
      void main(){
        float d=length(gl_PointCoord-vec2(0.5));
        float alpha=smoothstep(0.5,0.3,d);
        float core=exp(-d*12.0);
        float glow=exp(-d*6.0)*0.15;
        gl_FragColor=vec4(vColor+vec3(core*0.8+glow),alpha*vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }), [baseColor])

  useFrame((st) => {
    if (!ref.current) return
    ref.current.material.uniforms.uTime.value = st.clock.elapsedTime
    ref.current.rotation.y = st.clock.elapsedTime * 0.004
    ref.current.rotation.x = Math.sin(st.clock.elapsedTime * 0.002) * 0.003

    const scaleTarget = clusterState === INTENT.FOCUSED ? 1.12 : clusterState === INTENT.HOVERED ? 1.04 : 1
    scaleRef.current += (scaleTarget - scaleRef.current) * 0.025
    ref.current.scale.setScalar(scaleRef.current)

    const glowTarget = clusterState === INTENT.FOCUSED ? 1 : clusterState === INTENT.HOVERED ? 0.6 : clusterState === INTENT.INTENT ? 0.2 : 0
    glowRef.current += (glowTarget - glowRef.current) * 0.035
    ref.current.material.uniforms.uHoverGlow.value = glowRef.current * hoverProgress
  })

  return (
    <points ref={ref} geometry={geo} material={mat} />
  )
}
