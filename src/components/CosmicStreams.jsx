import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function buildCurvePoints(p1,p2,seed=0,seg=30){
  const pts=[]
  const rng=(s)=>{let x=Math.sin(s*127.1+seed*311.7)*43758.545;return x-Math.floor(x)}
  for(let i=0;i<=seg;i++){
    const t=i/seg
    const mid=new THREE.Vector3(
      (p1[0]+p2[0])/2+(rng(i*3+1)-0.5)*0.6,
      (p1[1]+p2[1])/2+(rng(i*3+2)-0.5)*0.4,
      (p1[2]+p2[2])/2+(rng(i*3+3)-0.5)*0.6,
    )
    const a=new THREE.Vector3(p1[0],p1[1],p1[2])
    const b=new THREE.Vector3(p2[0],p2[1],p2[2])
    const q0=a.clone().lerp(mid,t), q1=mid.clone().lerp(b,t)
    pts.push(q0.clone().lerp(q1,t))
  }
  return pts
}

function NeuralStream({points,color,count=600}){
  const ref=useRef()
  const data=useMemo(()=>{
    const p=new Float32Array(count*3),ph=new Float32Array(count),s=new Float32Array(count),co=new Float32Array(count*3)
    const totalDist=points.reduce((s,pt,i)=>i===0?0:s+pt.distanceTo(points[i-1]),0)
    for(let i=0;i<count;i++){
      const progress=(i+0.5)/count
      let acc=0,si=0
      for(let j=1;j<points.length;j++){
        const seg=points[j].distanceTo(points[j-1])
        if(acc+seg>=progress*totalDist){si=j-1;break}
        acc+=seg
      }
      const segL=points[si+1].distanceTo(points[si])
      const lt=segL>0?(progress*totalDist-acc)/segL:0
      const pt=points[si].clone().lerp(points[si+1],lt)
      const off=0.002+Math.random()*0.015, ang=Math.random()*Math.PI*2, h=(Math.random()-0.5)*0.01
      p[i*3]=pt.x+Math.cos(ang)*off; p[i*3+1]=pt.y+h; p[i*3+2]=pt.z+Math.sin(ang)*off
      ph[i]=Math.random()*Math.PI*2; s[i]=0.015+Math.random()*0.025
      const bri=0.8+Math.random()*0.4
      co[i*3]=color.r*bri; co[i*3+1]=color.g*bri; co[i*3+2]=color.b*bri
    }
    return {p,ph,s,co}
  },[points,color,count])

  useFrame((st)=>{if(ref.current)ref.current.material.uniforms.uTime.value=st.clock.elapsedTime})

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data.p} itemSize={3}/>
        <bufferAttribute attach="attributes-aPhase" count={count} array={data.ph} itemSize={1}/>
        <bufferAttribute attach="attributes-aSize" count={count} array={data.s} itemSize={1}/>
        <bufferAttribute attach="attributes-aColor" count={count} array={data.co} itemSize={3}/>
      </bufferGeometry>
      <shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} transparent
        vertexShader={`
          uniform float uTime; attribute float aPhase; attribute float aSize; attribute vec3 aColor;
          varying vec3 vColor; varying float vAlpha;
          void main(){
            vec3 p=position; float t=uTime*1.0,ph=aPhase;
            float flow=fract(t*0.04+ph*0.5); float fOff=flow*0.4-0.2;
            p.x+=sin(t*0.004+ph)*fOff; p.y+=cos(t*0.003+ph*1.3)*abs(fOff)*0.5; p.z+=sin(t*0.005+ph*0.7)*fOff;
            vec4 mv=modelViewMatrix*vec4(p,1.0);
            gl_PointSize=clamp(aSize*(70.0/-mv.z),0.2,6.0);
            gl_Position=projectionMatrix*mv;
            float pulse=0.4+0.6*(1.0-abs(flow-0.5)*2.0);
            vAlpha=smoothstep(22.0,0.5,-mv.z)*pulse*0.5; vColor=aColor;
          }
        `}
        fragmentShader={`varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5)discard; float core=exp(-d*24.0); float s=1.0-smoothstep(0.0,0.5,d); gl_FragColor=vec4(vColor*1.1+vec3(core*0.5),s*s*vAlpha);}`}
        uniforms={{uTime:{value:0}}}
      />
    </points>
  )
}

function EnergyPulse({points,color}){
  const ref=useRef()
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>p.clone())),[points])
  const progress=useRef(Math.random())
  const speed = useRef(0.02+Math.random()*0.04)
  useFrame((st)=>{
    if(!ref.current)return
    progress.current=(progress.current+st.clock.getDelta()*speed.current)%1
    const pt=curve.getPoint(progress.current)
    const next=curve.getPoint((progress.current+0.02)%1)
    const dir=new THREE.Vector3().subVectors(next,pt).normalize()
    ref.current.position.copy(pt)
    ref.current.lookAt(pt.clone().add(dir))
    const pulse=0.5+0.5*Math.sin(st.clock.elapsedTime*5)
    ref.current.scale.setScalar(0.05*pulse)
    ref.current.material.opacity=0.7*pulse*(1-Math.abs(progress.current-0.5)*1.5)
  })
  const c=new THREE.Color(color.r,color.g,color.b)
  return <sprite ref={ref} scale={[0.05,0.05,1]}><spriteMaterial color={c} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.7}/></sprite>
}

export default function CosmicStreams({clusters}){
  const streams=useMemo(()=>{
    const arr=[]
    const keys=Object.keys(clusters)
    const center = [0, 0, 0]

    for(let i=0;i<keys.length;i++){
      const c1=clusters[i]
      const p1=[c1.position[0],c1.position[1],c1.position[2]]
      const color=c1.color
      arr.push({points:buildCurvePoints(p1,center,i,25),color,key:`c_center_${i}`,color1:c1.color})
    }

    for(let i=0;i<keys.length;i++){
      const c1=clusters[i],c2=clusters[(i+1)%keys.length]
      const p1=[c1.position[0],c1.position[1],c1.position[2]],p2=[c2.position[0],c2.position[1],c2.position[2]]
      const color={r:(c1.color.r+c2.color.r)/2,g:(c1.color.g+c2.color.g)/2,b:(c1.color.b+c2.color.b)/2}
      arr.push({points:buildCurvePoints(p1,p2,i+keys.length,25),color,key:`s_${i}`,color1:c1.color})
    }

    return arr
  },[clusters])

  return (
    <group>
      {streams.map(s=>(
        <group key={s.key}>
          <NeuralStream points={s.points.map(p=>p.clone())} color={s.color} count={600}/>
          <EnergyPulse points={s.points.map(p=>p.clone())} color={s.color}/>
          <EnergyPulse points={s.points.map(p=>p.clone())} color={s.color1}/>
        </group>
      ))}
    </group>
  )
}
