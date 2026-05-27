import { useMemo } from 'react'
import UniverseView from './UniverseView'
import ClusterView from './ClusterView'
import useUniverseStore from '../store/useUniverseStore'
import { generateClusterFiles } from '../data/fileSystem'

export default function SceneContent() {
  const clusters = useUniverseStore(s => s.clusters)
  const activeClusterId = useUniverseStore(s => s.activeClusterId)
  const clusterFiles = useUniverseStore(s => s.clusterFiles)
  const fileChanges = useUniverseStore(s => s.fileChanges)
  const isTransitioning = useUniverseStore(s => s.isTransitioning)
  const enterCluster = useUniverseStore(s => s.enterCluster)
  const exitToUniverse = useUniverseStore(s => s.exitToUniverse)
  const handleFileSelect = useUniverseStore(s => s.handleFileSelect)

  const clusterParticles = useMemo(() => {
    if (activeClusterId === null || !clusterFiles[activeClusterId]) return null
    const clusterColor = clusters?.[activeClusterId]?.color || null
    return generateClusterFiles(clusterFiles[activeClusterId], activeClusterId, clusterColor)
  }, [activeClusterId, clusterFiles, clusters])

  const changeType = fileChanges?.clusterId === activeClusterId ? fileChanges.type : null

  return (
    <group>
      <UniverseView clusters={clusters} onClusterSelect={enterCluster} onStarSelect={handleFileSelect} isTransitioning={isTransitioning} />
      {activeClusterId !== null && clusterParticles && (
        <ClusterView
          cluster={clusters?.[activeClusterId]}
          clusterParticles={clusterParticles}
          onReturn={exitToUniverse}
          onFileSelect={handleFileSelect}
          changeType={changeType}
        />
      )}
    </group>
  )
}
