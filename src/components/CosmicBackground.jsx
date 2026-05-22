import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createNebulaTex(i) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 256
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  const hues = [
    [0.1, 0.1, 0.3], [0.15, 0.05, 0.25], [0.05, 0.1, 0.4], [0.1, 0.02, 0.2], [0.02, 0.05, 0.35],
  ]
  const h = hues[i % hues.length]
  grad.addColorStop(0, `rgba(${h[0]*255|0},${h[1]*255|0},${h[2]*255|0},0.2)`)
  grad.addColorStop(0.3, `rgba(${h[0]*180|0},${h[1]*140|0},${h[2]*200|0},0.05)`)
  grad.addColorStop(0.6, `rgba(${h[0]*120|0},${h[1]*100|0},${h[2]*150|0},0.01)`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad; ctx.fillRect(0,0,256,256)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t
}

function Nebula() {
  const ref = useRef()
  const clouds = useMemo(() => {
    const arr = []
    for (let i=0;i<6;i++) {
      const angle = Math.random()*Math.PI*2
      const dist = 5 + Math.random() * 15
      arr.push({
        pos: [Math.cos(angle)*dist, (Math.random()-0.5)*4, Math.sin(angle)*dist],
        scale: 15 + Math.random() * 20,
        speed: 0.0005 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.01 + Math.random() * 0.02,
        tex: createNebulaTex(i),
      })
    }
    return arr
  }, [])

  useFrame((st) => {
    if (!ref.current) return
    ref.current.children.forEach((ch, i) => {
      const c = clouds[i]; if (!c) return
      const t = st.clock.elapsedTime * c.speed + c.phase
      ch.position.x = c.pos[0] + Math.sin(t * 0.1) * 0.8
      ch.position.y = c.pos[1] + Math.cos(t * 0.08) * 0.4
      ch.position.z = c.pos[2] + Math.cos(t * 0.12) * 0.8
      ch.material.opacity = c.opacity * (0.85 + 0.15 * Math.sin(t * 0.2))
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

function StarLayer({ count, spread, sizeRange, driftSpeed, twinkleSpeed }) {
  const ref = useRef()
  const d = useMemo(() => {
    const p = new Float32Array(count*3), s = new Float32Array(count), ph = new Float32Array(count), co = new Float32Array(count*3)
    for (let i=0;i<count;i++) {
      const dist = spread[0] + Math.random() * (spread[1] - spread[0])
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      p[i*3]=dist*Math.sin(phi)*Math.cos(theta)
      p[i*3+1]=dist*Math.cos(phi)*0.2
      p[i*3+2]=dist*Math.sin(phi)*Math.sin(theta)
      s[i]=sizeRange[0]+Math.random()**2*(sizeRange[1]-sizeRange[0])
      ph[i]=Math.random()*Math.PI*2
      const isWarm = Math.random() > 0.8
      co[i*3]=isWarm?0.8+0.1*Math.random():0.85+0.1*Math.random()
      co[i*3+1]=isWarm?0.75+0.1*Math.random():0.9+0.1*Math.random()
      co[i*3+2]=isWarm?0.7+0.1*Math.random():1.0
    }
    return {p,s,ph,co}
  }, [count, spread, sizeRange])

  useFrame((st) => {
    if (!ref.current) return
    ref.current.material.uniforms.uTime.value = st.clock.elapsedTime
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={d.p} itemSize={3}/>
        <bufferAttribute attach="attributes-aSize" count={count} array={d.s} itemSize={1}/>
        <bufferAttribute attach="attributes-aPhase" count={count} array={d.ph} itemSize={1}/>
        <bufferAttribute attach="attributes-aColor" count={count} array={d.co} itemSize={3}/>
      </bufferGeometry>
      <shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent
        vertexShader={`
          uniform float uTime;
          attribute float aSize; attribute float aPhase; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec3 p=position;
            float t=uTime, ph=aPhase;
            p.x+=sin(t*\${driftSpeed.toFixed(5)}+ph)*\${(driftSpeed*200).toFixed(1)};
            p.y+=cos(t*\${(driftSpeed*0.8).toFixed(5)}+ph*1.3)*\${(driftSpeed*100).toFixed(1)};
            p.z+=sin(t*\${(driftSpeed*0.6).toFixed(5)}+ph*0.8)*\${(driftSpeed*150).toFixed(1)};
            vec4 mv=modelViewMatrix*vec4(p,1.0);
            gl_PointSize=clamp(aSize*(35.0/-mv.z),0.0,\${(sizeRange[1]*50).toFixed(1)});
            gl_Position=projectionMatrix*mv;
            float tw=0.9+0.1*sin(t*\${twinkleSpeed.toFixed(3)}+ph*2.0);
            vAlpha=smoothstep(35.0,0.5,-mv.z)*tw;
            vColor=aColor;
          }
        `}
        fragmentShader={`
          varying vec3 vColor; varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-vec2(0.5));
            float alpha=smoothstep(0.5,0.45,d);
            float core=exp(-d*25.0);
            gl_FragColor=vec4(vColor+vec3(core*0.3),alpha*vAlpha);
          }
        `}
        uniforms={{uTime:{value:0}}}
      />
    </points>
  )
}

function CinematicShootingStars() {
  const ref = useRef()
  const count = 2
  const P = 40

  const config = useMemo(() => {
    const stars = []
    for (let i=0;i<count;i++) {
      stars.push({
        startDist: 5 + Math.random() * 5,
        endDist: 15 + Math.random() * 10,
        angle: Math.random() * Math.PI * 2,
        angleDelta: (Math.random() - 0.5) * 0.2,
        yStart: -2 + Math.random() * 4,
        yEnd: -1 + Math.random() * 2,
        delay: i * 15 + Math.random() * 10,
      })
    }
    return stars
  }, [])

  const d = useMemo(() => {
    const total = count * P
    const p = new Float32Array(total*3), s = new Float32Array(total), ph = new Float32Array(total), co = new Float32Array(total*3)
    for (let i=0;i<total;i++) {
      p[i*3]=0; p[i*3+1]=-999; p[i*3+2]=0
      const ti = i % P
      const trail = ti / P
      ph[i] = trail
      s[i] = 0.01 + (1 - trail) * 0.04
      co[i*3]=1; co[i*3+1]=0.95; co[i*3+2]=0.9
    }
    return {p,s,ph,co}
  }, [])

  useFrame((st) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    const t = st.clock.elapsedTime
    for (let i=0;i<count;i++) {
      const cfg = config[i]
      const cycle = (t * 0.4 + cfg.delay) % 30
      const active = cycle < 4
      if (!active) {
        for (let j=0;j<P;j++) {
          const idx = i*P+j
          pos[idx*3]=0; pos[idx*3+1]=-999; pos[idx*3+2]=0
        }
        continue
      }
      const progress = cycle / 4
      const dist = cfg.startDist + progress * (cfg.endDist - cfg.startDist)
      const angle = cfg.angle + progress * cfg.angleDelta
      for (let j=0;j<P;j++) {
        const idx = i*P+j
        const tp = j / P
        const bp = Math.max(0, progress - tp * 0.08)
        const bd = cfg.startDist + bp * (cfg.endDist - cfg.startDist)
        const ba = cfg.angle + bp * cfg.angleDelta
        pos[idx*3] = Math.cos(ba) * bd
        pos[idx*3+1] = cfg.yStart + bp * (cfg.yEnd - cfg.yStart)
        pos[idx*3+2] = Math.sin(ba) * bd
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count*P} array={d.p} itemSize={3}/>
        <bufferAttribute attach="attributes-aSize" count={count*P} array={d.s} itemSize={1}/>
        <bufferAttribute attach="attributes-aPhase" count={count*P} array={d.ph} itemSize={1}/>
        <bufferAttribute attach="attributes-aColor" count={count*P} array={d.co} itemSize={3}/>
      </bufferGeometry>
      <shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent
        vertexShader={`
          attribute float aSize; attribute float aPhase; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec4 mv=modelViewMatrix*vec4(position,1.0);
            float trail=1.0-aPhase;
            float sz=aSize*(70.0/-mv.z)*(0.3+trail*0.7);
            gl_PointSize=clamp(sz,0.0,12.0);
            gl_Position=projectionMatrix*mv;
            vAlpha=smoothstep(25.0,0.5,-mv.z)*trail*trail*0.7;
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

export default function CosmicBackground() {
  const groupRef = useRef()
  useFrame((st) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = st.clock.elapsedTime * 0.0008
      groupRef.current.rotation.x = Math.sin(st.clock.elapsedTime * 0.0005) * 0.05
    }
  })
  return (
    <group ref={groupRef}>
      <StarLayer count={500} spread={[30,80]} sizeRange={[0.001,0.015]} driftSpeed={0.0001} twinkleSpeed={0.01}/>
      <StarLayer count={150} spread={[15,35]} sizeRange={[0.005,0.02]} driftSpeed={0.0003} twinkleSpeed={0.02}/>
      <StarLayer count={30} spread={[5,12]} sizeRange={[0.01,0.03]} driftSpeed={0.0008} twinkleSpeed={0.05}/>
      <Nebula/>
      <CinematicShootingStars/>
    </group>
  )
}
