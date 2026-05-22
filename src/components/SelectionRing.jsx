import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SelectionRing({ position, color }) {
  const meshRef = useRef()
  const timeRef = useRef(0)

  useFrame((state, delta) => {
    if (!position || !color) return
    if (!meshRef.current) return
    timeRef.current += delta
    const pulse = 0.8 + Math.sin(timeRef.current * 2) * 0.2
    meshRef.current.scale.setScalar(pulse)
    meshRef.current.material.opacity = 0.4 + Math.sin(timeRef.current * 1.5) * 0.15
    meshRef.current.position.copy(position)
    meshRef.current.lookAt(state.camera.position)
  })

  if (!position || !color) return null

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[0.12, 0.18, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
