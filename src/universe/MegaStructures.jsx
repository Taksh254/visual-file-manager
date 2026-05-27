import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ARC_SEGMENTS = 80

function GalaxyField() {
  const ref = useRef()

  const galaxies = useMemo(() => {
    const arr = []
    for (let i = 0; i < 8; i++) {
      const dist = 12 + Math.random() * 18
      const angle = Math.random() * Math.PI * 2
      const tilt = (Math.random() - 0.5) * 0.8
      const size = 1.5 + Math.random() * 3
      const palette = [
        0.15 + Math.random() * 0.25,
        0.05 + Math.random() * 0.1,
        0.3 + Math.random() * 0.3,
      ]
      arr.push({
        pos: [Math.cos(angle) * dist, (Math.random() - 0.5) * 5, Math.sin(angle) * dist],
        tilt, size, palette,
        rotSpeed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        particleCount: 200 + Math.floor(Math.random() * 300),
      })
    }
    return arr
  }, [])

  const galaxyMeshes = useMemo(() => {
    return galaxies.map((g) => {
      const count = g.particleCount
      const p = new Float32Array(count * 3)
      const co = new Float32Array(count * 3)
      const s = new Float32Array(count)
      const ph = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        const r = Math.random() ** 2 * g.size
        const theta = Math.random() * Math.PI * 2
        const flatten = 0.1 + Math.random() * 0.15
        const spiralOff = Math.log(r * 2 + 1) * 0.5

        p[i * 3] = r * Math.cos(theta + spiralOff)
        p[i * 3 + 1] = (Math.random() - 0.5) * r * flatten
        p[i * 3 + 2] = r * Math.sin(theta + spiralOff)

        const bri = 0.3 + Math.random() * 0.4
        co[i * 3] = g.palette[0] * bri
        co[i * 3 + 1] = g.palette[1] * bri
        co[i * 3 + 2] = g.palette[2] * bri

        s[i] = 0.005 + Math.random() * 0.02
        ph[i] = Math.random() * Math.PI * 2
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3))
      geo.setAttribute('aColor', new THREE.BufferAttribute(co, 3))
      geo.setAttribute('aSize', new THREE.BufferAttribute(s, 1))
      geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1))

      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          uniform float uTime;
          attribute float aSize; attribute float aPhase; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec4 mv=modelViewMatrix*vec4(position,1.0);
            float sz=aSize*(60.0/-mv.z);
            gl_PointSize=clamp(sz,0.0,12.0);
            gl_Position=projectionMatrix*mv;
            float tw=0.7+0.15*sin(uTime*0.02+aPhase*2.0);
            vAlpha=smoothstep(40.0,2.0,-mv.z)*tw*0.6;
            vColor=aColor;
          }
        `,
        fragmentShader: `
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-vec2(0.5));
            float a=smoothstep(0.5,0.4,d);
            float core=exp(-d*20.0);
            gl_FragColor=vec4(vColor+vec3(core*0.2),a*vAlpha);
          }
        `,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      })

      const points = new THREE.Points(geo, mat)
      points.position.set(g.pos[0], g.pos[1], g.pos[2])
      points.rotation.x = g.tilt
      points.rotation.z = g.phase
      points.userData = { rotSpeed: g.rotSpeed }
      return points
    })
  }, [galaxies])

  useFrame((st) => {
    const t = st.clock.elapsedTime
    for (const mesh of galaxyMeshes) {
      if (mesh.material.uniforms) {
        mesh.material.uniforms.uTime.value = t
      }
      mesh.rotation.y += mesh.userData.rotSpeed
    }
  })

  return <group ref={ref}>{galaxyMeshes}</group>
}

export default function MegaStructures() {
  const ref = useRef()

  const config = useMemo(() => [
    { radius: 6, color: [0.4, 0.15, 0.7], rotationSpeed: 0.001, phase: 0, spokes: 20 },
    { radius: 9, color: [0.15, 0.3, 0.7], rotationSpeed: -0.0006, phase: 1.2, spokes: 16 },
    { radius: 13, color: [0.5, 0.1, 0.5], rotationSpeed: 0.0004, phase: 2.8, spokes: 12 },
  ], [])

  const rings = useMemo(() => {
    return config.map((c) => {
      const linePts = []
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const theta = (i / ARC_SEGMENTS) * Math.PI * 2
        linePts.push(new THREE.Vector3(
          Math.cos(theta) * c.radius,
          0,
          Math.sin(theta) * c.radius
        ))
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts)
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(c.color[0], c.color[1], c.color[2]),
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
      })
      const line = new THREE.Line(lineGeo, lineMat)

      const spokeGroup = new THREE.Group()
      for (let i = 0; i < c.spokes; i++) {
        const angle = (i / c.spokes) * Math.PI * 2
        const innerR = c.radius * 0.1
        const jitter = (Math.random() - 0.5) * 0.02
        const pts = [
          new THREE.Vector3(Math.cos(angle) * innerR, jitter, Math.sin(angle) * innerR),
          new THREE.Vector3(Math.cos(angle) * c.radius, (Math.random() - 0.5) * 0.03, Math.sin(angle) * c.radius),
        ]
        const sGeo = new THREE.BufferGeometry().setFromPoints(pts)
        const sMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(c.color[0] * 0.6, c.color[1] * 0.6, c.color[2] * 0.6),
          transparent: true,
          opacity: 0.012,
          depthWrite: false,
        })
        const sLine = new THREE.Line(sGeo, sMat)
        spokeGroup.add(sLine)
      }

      const group = new THREE.Group()
      group.add(line)
      group.add(spokeGroup)
      return group
    })
  }, [config])

  useFrame((st) => {
    if (!ref.current) return
    const t = st.clock.elapsedTime
    ref.current.children.forEach((child, i) => {
      if (i < config.length) {
        child.rotation.y = t * config[i].rotationSpeed + config[i].phase
        child.rotation.x = Math.sin(t * 0.002 + config[i].phase) * 0.02
      }
    })
  })

  return (
    <group ref={ref}>
      {rings}
      <GalaxyField />
    </group>
  )
}
