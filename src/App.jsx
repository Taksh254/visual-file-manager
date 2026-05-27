import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import SceneContent from './components/SceneContent'
import CameraController from './components/CameraController'
import PostProcessing from './components/PostProcessing'
import HoloSidebar from './components/HoloSidebar'
import RightPanel from './components/RightPanel'
import BottomNav from './components/BottomNav'
import NeuralMinimap from './components/NeuralMinimap'
import MinimapCameraSync from './components/MinimapCameraSync'
import ConnectionStatus from './components/ConnectionStatus'
import InitFlow from './components/InitFlow'
import useUniverseStore from './store/useUniverseStore'
import { STATE } from './systems/TransitionManager'
import { getAmbientAudio } from './audio/AmbientAudioManager'

export default function App() {
  const initPhase = useUniverseStore(s => s.initPhase)
  const initStore = useUniverseStore(s => s.initStore)
  const navState = useUniverseStore(s => s.navState)
  const isTransitioning = useUniverseStore(s => s.isTransitioning)
  const exitToUniverse = useUniverseStore(s => s.exitToUniverse)

  useEffect(() => {
    initStore()
  }, [initStore])

  useEffect(() => {
    if (!initPhase) {
      const audio = getAmbientAudio()
      audio.init()
    }
  }, [initPhase])

  const isInUniverse = navState === STATE.UNIVERSE

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000005', position: 'relative', overflow: 'hidden' }}>
      {initPhase ? (
        <InitFlow />
      ) : (
        <>
          <Canvas
            camera={{ position: [0, 2, 8], fov: 50, near: 0.05, far: 60 }}
            dpr={[1.5, 2]}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false }}
            onPointerMissed={!isInUniverse && !isTransitioning ? exitToUniverse : undefined}
          >
            <fog attach="fog" args={['#000000', 16, 50]} />
            <color attach="background" args={['#000005']} />

            <SceneContent />

            <OrbitControls
              makeDefault enableDamping dampingFactor={0.05}
              autoRotate={isInUniverse} autoRotateSpeed={0.04}
              enablePan={!isInUniverse && !isTransitioning} enableZoom={!isTransitioning} rotateSpeed={0.3}
              maxDistance={isInUniverse ? 18 : 3.5}
              minDistance={isInUniverse ? 3.5 : 0.3}
              enabled={!isTransitioning}
            />

            <CameraController />

            <PostProcessing />
            <MinimapCameraSync />
          </Canvas>

          <ConnectionStatus />
          <HoloSidebar />
          <RightPanel />
          <BottomNav />
          <NeuralMinimap />
        </>
      )}
    </div>
  )
}
