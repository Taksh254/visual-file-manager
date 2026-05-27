import { useMemo } from 'react'
import GalaxyCluster from '../clusters/GalaxyCluster'
import BackgroundRenderer from '../universe/BackgroundRenderer'
import NeuralPathways from '../universe/NeuralPathways'
import useUniverseStore from '../store/useUniverseStore'
import { buildStarPositions, buildStarColors, buildStarSizes, buildStarMeta } from '../data/starMapping'

export default function UniverseView({ clusters, onClusterSelect, onStarSelect, isTransitioning }) {
  const clusterFiles = useUniverseStore(s => s.clusterFiles)

  const starDataMap = useMemo(() => {
    if (!clusters) return {}
    const map = {}
    for (const [id, cluster] of Object.entries(clusters)) {
      const files = clusterFiles[id]
      if (files && files.length > 0) {
        map[id] = {
          meta: buildStarMeta(files),
          positions: buildStarPositions(files, Number(id), 1.0),
          colors: buildStarColors(files, cluster.color),
          sizes: buildStarSizes(files),
        }
      }
    }
    return map
  }, [clusters, clusterFiles])

  if (!clusters) return <BackgroundRenderer />

  return (
    <group>
      <BackgroundRenderer />
      <NeuralPathways clusters={clusters} />
      {Object.values(clusters).map((cluster) => (
        <GalaxyCluster
          key={cluster.id}
          cluster={cluster}
          starData={starDataMap[cluster.id] || null}
          onSelect={onClusterSelect}
          onStarSelect={onStarSelect}
        />
      ))}
    </group>
  )
}
