import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SceneContent from './components/SceneContent'
import CameraController from './components/CameraController'
import PostProcessing from './components/PostProcessing'
import HoloSidebar from './components/HoloSidebar'
import RightPanel from './components/RightPanel'
import BottomNav from './components/BottomNav'
import NeuralMinimap from './components/NeuralMinimap'
import MinimapCameraSync from './components/MinimapCameraSync'
import ConnectionStatus from './components/ConnectionStatus'
import useUniverseState from './hooks/useUniverseState'
import { STATE } from './systems/TransitionManager'
import { getAmbientAudio } from './audio/AmbientAudioManager'

export default function App() {
  const {
    clusters,
    clusterNames,
    clusterParticles,
    fileChanges,
    loading,
    error,
    connected,
    clusterStats,
    activeClusterId,
    activeCluster,
    navState,
    isTransitioning,
    selectedFile,
    cameraConfig,
    enterCluster,
    exitToUniverse,
    handleFileSelect,
    handleCameraComplete,
    openFile,
    clearFileChanges,
  } = useUniverseState()

  useEffect(() => {
    const audio = getAmbientAudio()
    audio.init()
  }, [])

  useEffect(() => {
    if (fileChanges) {
      const timer = setTimeout(() => clearFileChanges(), 3000)
      return () => clearTimeout(timer)
    }
  }, [fileChanges, clearFileChanges])

  const isInUniverse = navState === STATE.UNIVERSE

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000005', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50, near: 0.05, far: 60 }}
        dpr={[1.5, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false }}
        onPointerMissed={!isInUniverse && !isTransitioning ? exitToUniverse : undefined}
      >
        <fog attach="fog" args={['#000000', 16, 50]} />
        <color attach="background" args={['#000005']} />

        <SceneContent
          clusters={clusters}
          activeCluster={activeClusterId}
          clusterParticles={clusterParticles}
          fileChanges={fileChanges}
          isTransitioning={isTransitioning}
          onClusterSelect={enterCluster}
          onReturn={exitToUniverse}
          onFileSelect={handleFileSelect}
        />

        <OrbitControls
          makeDefault enableDamping dampingFactor={0.05}
          autoRotate={isInUniverse} autoRotateSpeed={0.04}
          enablePan={!isInUniverse && !isTransitioning} enableZoom={!isTransitioning} rotateSpeed={0.3}
          maxDistance={isInUniverse ? 18 : 3.5}
          minDistance={isInUniverse ? 3.5 : 0.3}
          enabled={!isTransitioning}
        />

        <CameraController
          target={cameraConfig.target}
          cameraEnd={cameraConfig.endPos}
          isActive={cameraConfig.isActive}
          onComplete={handleCameraComplete}
        />

        <PostProcessing />
        <MinimapCameraSync />
      </Canvas>

      <ConnectionStatus connected={connected} loading={loading} error={error} />
      <HoloSidebar activeCluster={activeClusterId} selectedFile={selectedFile} clusters={clusters} clusterStats={clusterStats} />
      <RightPanel selectedFile={selectedFile} clusterNames={clusterNames} openFile={openFile} />
      <BottomNav activeCluster={activeClusterId} onReturn={exitToUniverse} />
      <NeuralMinimap clusters={clusters} activeCluster={activeClusterId} onSelect={enterCluster} />
    </div>
  )
}
