import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function AtmosphericFog() {
  const ref = useRef()

  const d = useMemo(() => {
    const count = 600
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    const ph = new Float32Array(count)
    const co = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const dist = 2 + Math.random() ** 1.5 * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      p[i * 3] = dist * Math.sin(phi) * Math.cos(theta)
      p[i * 3 + 1] = dist * Math.cos(phi) * 0.15
      p[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta)

      s[i] = 0.01 + Math.random() * 0.04
      ph[i] = Math.random() * Math.PI * 2

      const palette = Math.random()
      if (palette < 0.33) {
        co[i * 3] = 0.15; co[i * 3 + 1] = 0.05; co[i * 3 + 2] = 0.3
      } else if (palette < 0.66) {
        co[i * 3] = 0.05; co[i * 3 + 1] = 0.1; co[i * 3 + 2] = 0.35
      } else {
        co[i * 3] = 0.2; co[i * 3 + 1] = 0.02; co[i * 3 + 2] = 0.25
      }
    }
    return { p, s, ph, co }
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(d.p, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(d.s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(d.ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(d.co, 3))
    return g
  }, [])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p=position; float t=uTime, ph=aPhase;
        p.x+=sin(t*0.0008+ph)*0.3;
        p.y+=cos(t*0.0006+ph*1.3)*0.15;
        p.z+=sin(t*0.001+ph*0.7)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=aSize*(30.0/-mv.z);
        gl_Position=projectionMatrix*mv;
        vAlpha=smoothstep(20.0,3.0,-mv.z)*0.03*(0.7+0.3*sin(t*0.05+ph));
        vColor=aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-vec2(0.5));
        float a=1.0-smoothstep(0.0,0.5,d);
        gl_FragColor=vec4(vColor,a*vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }), [])

  useFrame((st) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = st.clock.elapsedTime
  })

  return <points ref={ref} geometry={geo} material={mat} />
}
