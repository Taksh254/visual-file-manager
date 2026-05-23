const CLUSTER_NAMES = ['NEBULA CORE', 'QUANTUM FIELD', 'DIGITAL OCEAN', 'STELLAR LIBRARY', 'VOID ARCHIVE', 'CRYSTAL NEXUS', 'WAVE FUNCTION', 'DREAM CACHE']
const COLORS = [
  { r: 0.6, g: 0.2, b: 1.0 }, { r: 0.0, g: 0.8, b: 1.0 }, { r: 0.0, g: 1.0, b: 0.6 },
  { r: 1.0, g: 0.6, b: 0.0 }, { r: 0.8, g: 0.0, b: 0.8 }, { r: 1.0, g: 0.2, b: 0.4 },
  { r: 0.2, g: 0.6, b: 1.0 }, { r: 0.5, g: 1.0, b: 0.5 },
]

export function generateDemoClusters() {
  const clusterMap = {}
  const count = CLUSTER_NAMES.length
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.2
    const t = i / (count - 1)
    const radiusVar = 3.0 + t * 1.2
    const yOffset = Math.sin(t * Math.PI * 2) * 0.5
    clusterMap[i] = {
      id: i,
      name: CLUSTER_NAMES[i],
      color: COLORS[i % COLORS.length],
      dir: `/demo/${CLUSTER_NAMES[i].toLowerCase().replace(/\s+/g, '-')}`,
      fileCount: Math.floor(10 + Math.random() * 30),
      position: new Float32Array([
        Math.cos(angle) * radiusVar,
        yOffset,
        Math.sin(angle) * radiusVar,
      ]),
    }
  }
  return clusterMap
}

export function generateDemoClusterFiles(clusterId) {
  const words = ['index', 'main', 'config', 'data', 'core', 'utils', 'types', 'styles', 'theme', 'build', 'src', 'lib', 'api', 'routes', 'models', 'views', 'hooks', 'utils', 'helpers', 'constants']
  const exts = ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.md', '.py', '.rs', '.go', '.rb', '.java', '.vue', '.svelte', '.sql', '.yaml', '.toml', '.env', '.gitignore', '.config']
  const count = 12 + (clusterId * 3)
  const files = []
  for (let i = 0; i < count; i++) {
    const name = words[i % words.length] + (i >= words.length ? `_${Math.floor(i / words.length)}` : '')
    const ext = exts[(i * 7 + clusterId) % exts.length]
    files.push({
      name: name + ext,
      path: `/demo/cluster-${clusterId}/${name}${ext}`,
      size: Math.floor(Math.random() * 50000) + 100,
      sizeFormatted: `${Math.floor(Math.random() * 50) + 1} KB`,
      isDirectory: false,
      ext,
      modified: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    })
  }
  return files
}
