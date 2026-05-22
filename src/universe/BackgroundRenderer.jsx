import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Starfield from './Starfield'
import NebulaAtmosphere from './NebulaAtmosphere'
import ShootingStars from './ShootingStars'
import CosmicCore from './CosmicCore'
import AtmosphericFog from './AtmosphericFog'
import CosmicDust from './CosmicDust'

export default function BackgroundRenderer() {
  const bgRef = useRef()

  useFrame((st) => {
    if (bgRef.current) {
      bgRef.current.rotation.y = st.clock.elapsedTime * 0.002
    }
  })

  return (
    <group>
      <group ref={bgRef}>
        <Starfield />
        <NebulaAtmosphere />
        <AtmosphericFog />
        <CosmicDust />
        <ShootingStars />
      </group>
      <CosmicCore />
    </group>
  )
}
