import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Starfield from './Starfield'
import NebulaAtmosphere from './NebulaAtmosphere'
import ShootingStars from './ShootingStars'
import CosmicCore from './CosmicCore'
import AtmosphericFog from './AtmosphericFog'
import CosmicDust from './CosmicDust'
import MegaStructures from './MegaStructures'

export default function BackgroundRenderer() {
  const bgRef = useRef()
  const dustRef = useRef()

  useFrame((st) => {
    if (bgRef.current) {
      bgRef.current.rotation.y = st.clock.elapsedTime * 0.002
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = st.clock.elapsedTime * 0.0008
    }
  })

  return (
    <group>
      <group ref={bgRef}>
        <MegaStructures />
        <Starfield />
        <NebulaAtmosphere />
        <ShootingStars />
      </group>
      <CosmicCore />
      <group ref={dustRef}>
        <AtmosphericFog />
        <CosmicDust />
      </group>
    </group>
  )
}
