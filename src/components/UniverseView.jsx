import GalaxyCluster from '../clusters/GalaxyCluster'
import BackgroundRenderer from '../universe/BackgroundRenderer'
import NeuralPathways from '../universe/NeuralPathways'

export default function UniverseView({ clusters, onClusterSelect, isTransitioning }) {
  if (!clusters) return <BackgroundRenderer />

  return (
    <group>
      <BackgroundRenderer />
      <NeuralPathways clusters={clusters} />
      {Object.values(clusters).map((cluster) => (
        <GalaxyCluster
          key={cluster.id}
          cluster={cluster}
          onSelect={onClusterSelect}
        />
      ))}
    </group>
  )
}
