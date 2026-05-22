import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CosmicDust() {
  const ref = useRef()

  const d = useMemo(() => {
    const count = 1500
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    const ph = new Float32Array(count)
    const co = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const dist = 1 + Math.random() * 12
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      p[i * 3] = dist * Math.sin(phi) * Math.cos(theta)
      p[i * 3 + 1] = (Math.random() - 0.5) * 2
      p[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta)
      s[i] = 0.003 + Math.random() * 0.008
      ph[i] = Math.random() * Math.PI * 2
      co[i * 3] = 0.6 + Math.random() * 0.3
      co[i * 3 + 1] = 0.4 + Math.random() * 0.3
      co[i * 3 + 2] = 0.7 + Math.random() * 0.3
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
        p.x+=sin(t*0.002+ph)*0.2;
        p.y+=cos(t*0.0015+ph*1.2)*0.1;
        p.z+=sin(t*0.0025+ph*0.8)*0.2;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=clamp(aSize*(25.0/-mv.z),0.0,2.0);
        gl_Position=projectionMatrix*mv;
        vAlpha=smoothstep(20.0,1.0,-mv.z)*0.15*(0.6+0.4*sin(t*0.08+ph));
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
