import UniverseView from './UniverseView'
import ClusterView from './ClusterView'

export default function SceneContent({ clusters, activeCluster, clusterParticles, onClusterSelect, onReturn, onFileSelect, fileChanges, isTransitioning }) {
  const changeType = fileChanges?.clusterId === activeCluster ? fileChanges.type : null

  return (
    <group>
      <UniverseView clusters={clusters} onClusterSelect={onClusterSelect} isTransitioning={isTransitioning} />
      {activeCluster !== null && clusterParticles && (
        <ClusterView
          cluster={clusters?.[activeCluster]}
          clusterParticles={clusterParticles}
          onReturn={onReturn}
          onFileSelect={onFileSelect}
          changeType={changeType}
        />
      )}
    </group>
  )
}
