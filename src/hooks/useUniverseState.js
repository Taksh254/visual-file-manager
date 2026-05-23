import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import useFileSystem from './useFileSystem'
import { generateClusterFiles } from '../data/fileSystem'
import CameraEngine from '../systems/CameraEngine'
import { transitionManager, STATE } from '../systems/TransitionManager'
import { interactionManager } from '../systems/InteractionManager'

const UNIVERSE_TARGET = new THREE.Vector3(0, 0, 0)
const UNIVERSE_CAMERA = new THREE.Vector3(0, 1.5, 7)

export default function useUniverseState() {
  const {
    clusters: apiClusters,
    clusterFiles,
    fileChanges,
    loading,
    error,
    connected,
    clusterStats,
    isDemo,
    fetchClusterFiles,
    openFile,
    clearFileChanges,
    setCustomClusters,
  } = useFileSystem()

  const [activeClusterId, setActiveClusterId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [navState, setNavState] = useState(STATE.UNIVERSE)
  const [cameraConfig, setCameraConfig] = useState({
    target: UNIVERSE_TARGET,
    endPos: UNIVERSE_CAMERA,
    isActive: false,
  })

  const cameraEngineRef = useRef(null)

  useEffect(() => {
    if (!cameraEngineRef.current) {
      cameraEngineRef.current = new CameraEngine()
    }
  }, [])

  useEffect(() => {
    const unsub = transitionManager.on(STATE.UNIVERSE, () => {
      setNavState(STATE.UNIVERSE)
      setActiveClusterId(null)
      setSelectedFile(null)
      interactionManager.reset()
    })
    const unsub2 = transitionManager.on(STATE.IN_CLUSTER, (ev) => {
      setNavState(STATE.IN_CLUSTER)
      setActiveClusterId(ev.clusterId)
      interactionManager.reset()
    })
    const unsub3 = transitionManager.on(STATE.APPROACHING_CLUSTER, (ev) => {
      setNavState(STATE.APPROACHING_CLUSTER)
      setActiveClusterId(ev.clusterId)
    })
    return () => { unsub(); unsub2(); unsub3() }
  }, [])

  const clusterNames = useMemo(() => {
    if (!apiClusters) return []
    return Object.values(apiClusters).map(c => c.name)
  }, [apiClusters])

  const clusterParticles = useMemo(() => {
    if (activeClusterId === null || !clusterFiles[activeClusterId]) return null
    return generateClusterFiles(clusterFiles[activeClusterId], activeClusterId)
  }, [activeClusterId, clusterFiles])

  const activeCluster = useMemo(() => {
    if (activeClusterId === null || !apiClusters) return null
    return apiClusters[activeClusterId] || null
  }, [activeClusterId, apiClusters])

  const enterCluster = useCallback((id) => {
    const c = apiClusters?.[id]
    if (!c) return

    if (interactionManager.isTransitioning) return

    interactionManager.startTransition()
    transitionManager.enterCluster(id)
    setSelectedFile(null)

    const p = c.position
    setCameraConfig({
      target: new THREE.Vector3(p[0], p[1], p[2]),
      endPos: new THREE.Vector3(p[0] + 0.3, p[1] + 0.15, p[2] + 0.5),
      isActive: true,
    })

    fetchClusterFiles(id)

    setTimeout(() => {
      transitionManager.confirmClusterEntry()
    }, 1800)
  }, [apiClusters, fetchClusterFiles])

  const exitToUniverse = useCallback(() => {
    if (interactionManager.isTransitioning) return

    interactionManager.startTransition()
    transitionManager.exitToUniverse()

    setCameraConfig({
      target: UNIVERSE_TARGET,
      endPos: UNIVERSE_CAMERA,
      isActive: true,
    })
  }, [])

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file)
  }, [])

  const handleCameraComplete = useCallback(() => {
    setCameraConfig(prev => ({ ...prev, isActive: false }))
  }, [])

  const isTransitioning = navState === STATE.APPROACHING_CLUSTER || navState === STATE.APPROACHING_FILE

  return {
    clusters: apiClusters,
    clusterFiles,
    fileChanges,
    loading,
    error,
    connected,
    clusterStats,
    isDemo,
    fetchClusterFiles,
    openFile,
    clearFileChanges,
    setCustomClusters,

    activeClusterId,
    activeCluster,
    navState,
    isTransitioning,
    selectedFile,
    clusterNames,
    clusterParticles,
    cameraConfig,

    enterCluster,
    exitToUniverse,
    handleFileSelect,
    handleCameraComplete,
  }
}
