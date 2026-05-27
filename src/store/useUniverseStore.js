import { create } from 'zustand'
import * as THREE from 'three'
import { transitionManager, STATE } from '../systems/TransitionManager'
import { interactionManager } from '../systems/InteractionManager'
import { generateClusterFiles } from '../data/fileSystem'
import { generateDemoClusters, generateDemoClusterFiles } from '../data/demoClusters'
import { clearRegistry } from '../data/fileRegistry'

const UNIVERSE_TARGET = new THREE.Vector3(0, 0, 0)
const UNIVERSE_CAMERA = new THREE.Vector3(0, 1.5, 7)

const useUniverseStore = create((set, get) => {
  function setupTransitionSubscriptions() {
    transitionManager.on(STATE.UNIVERSE, () => {
      set({ navState: STATE.UNIVERSE, activeClusterId: null, selectedFile: null })
      interactionManager.reset()
    })
    transitionManager.on(STATE.IN_CLUSTER, (ev) => {
      set({ navState: STATE.IN_CLUSTER, activeClusterId: ev.clusterId })
      interactionManager.reset()
    })
    transitionManager.on(STATE.APPROACHING_CLUSTER, (ev) => {
      set({ navState: STATE.APPROACHING_CLUSTER, activeClusterId: ev.clusterId })
    })
  }

  return {
    // ===== Cluster / File System State =====
    clusters: null,
    clusterFiles: {},
    fileChanges: null,
    loading: true,
    error: null,
    connected: false,
    clusterStats: null,
    isDemo: false,

    // ===== Navigation State =====
    activeClusterId: null,
    selectedFile: null,
    navState: STATE.UNIVERSE,
    cameraConfig: {
      target: UNIVERSE_TARGET.clone(),
      endPos: UNIVERSE_CAMERA.clone(),
      isActive: false,
    },

    // ===== Upload / Lifecycle =====
    initPhase: true,
    clusterParticles: null,

    // ===== Derived =====
    get isTransitioning() {
      const s = get().navState
      return s === STATE.APPROACHING_CLUSTER || s === STATE.APPROACHING_FILE
    },

    get activeCluster() {
      const state = get()
      if (state.activeClusterId === null || !state.clusters) return null
      return state.clusters[state.activeClusterId] || null
    },

    get clusterNames() {
      const state = get()
      if (!state.clusters) return []
      return Object.values(state.clusters).map(c => c.name)
    },

    // ===== Initialization =====
    initStore: () => {
      setupTransitionSubscriptions()
      clearRegistry()
    },

    // ===== Cluster Actions =====
    setCustomClusters: (customClusters, customClusterFiles) => {
      set({
        clusters: customClusters,
        clusterFiles: customClusterFiles || {},
        isDemo: false,
        loading: false,
        error: null,
        connected: true,
      })
    },

    fetchDemoClusters: () => {
      const demo = generateDemoClusters()
      const clusterFiles = {}
      for (const id of Object.keys(demo)) {
        clusterFiles[id] = generateDemoClusterFiles(Number(id))
      }
      set({
        clusters: demo,
        clusterFiles,
        isDemo: true,
        loading: false,
        error: null,
      })
    },

    renameFile: (clusterId, filePath, newName) => {
      set(state => {
        const cluster = state.clusterFiles[clusterId]
        if (!cluster) return state
        const updated = cluster.map(f => {
          if (f.path === filePath) return { ...f, name: newName }
          return f
        })
        return { clusterFiles: { ...state.clusterFiles, [clusterId]: updated } }
      })
    },

    clearFileChanges: () => set({ fileChanges: null }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setConnected: (connected) => set({ connected }),
    setClusterStats: (stats) => set({ clusterStats: stats }),
    setFileChanges: (changes) => set({ fileChanges: changes }),
    setClusterFiles: (clusterId, files) => {
      set(state => ({
        clusterFiles: { ...state.clusterFiles, [clusterId]: files },
      }))
    },

    // ===== Navigation Actions =====
    enterCluster: (id) => {
      const state = get()
      const c = state.clusters?.[id]
      if (!c) return
      if (interactionManager.isTransitioning) return

      interactionManager.startTransition()
      transitionManager.enterCluster(id)
      set({ selectedFile: null })

      const p = c.position
      set({
        cameraConfig: {
          target: new THREE.Vector3(p[0], p[1], p[2]),
          endPos: new THREE.Vector3(p[0] + 0.3, p[1] + 0.15, p[2] + 0.5),
          isActive: true,
        },
      })

      setTimeout(() => {
        transitionManager.confirmClusterEntry()
      }, 1800)
    },

    exitToUniverse: () => {
      if (interactionManager.isTransitioning) return
      interactionManager.startTransition()
      transitionManager.exitToUniverse()
      set({
        cameraConfig: {
          target: UNIVERSE_TARGET.clone(),
          endPos: UNIVERSE_CAMERA.clone(),
          isActive: true,
        },
      })
    },

    handleFileSelect: (file) => set({ selectedFile: file }),

    handleCameraComplete: () => {
      set(state => ({ cameraConfig: { ...state.cameraConfig, isActive: false } }))
    },

    // ===== Cluster Particles =====
    regenerateClusterParticles: () => {
      const state = get()
      if (state.activeClusterId === null) {
        set({ clusterParticles: null })
        return
      }
      const files = state.clusterFiles[state.activeClusterId]
      if (!files) {
        set({ clusterParticles: null })
        return
      }
      const clusterColor = state.clusters?.[state.activeClusterId]?.color || null
      set({ clusterParticles: generateClusterFiles(files, state.activeClusterId, clusterColor) })
    },

    // ===== Lifecycle Actions =====
    setInitPhase: (val) => set({ initPhase: val }),

    resetUniverse: () => {
      set({
        clusters: null,
        clusterFiles: {},
        fileChanges: null,
        loading: true,
        error: null,
        connected: false,
        clusterStats: null,
        isDemo: false,
        activeClusterId: null,
        selectedFile: null,
        navState: STATE.UNIVERSE,
        cameraConfig: {
          target: UNIVERSE_TARGET.clone(),
          endPos: UNIVERSE_CAMERA.clone(),
          isActive: false,
        },
        clusterParticles: null,
      })
    },
  }
})

export default useUniverseStore
