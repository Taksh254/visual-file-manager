const CATEGORIES = [
  { key: 'IMAGES',    label: 'Images Galaxy',   icon: '🖼', color: { r: 0.75, g: 0.25, b: 1.0 } },
  { key: 'VIDEOS',    label: 'Videos Galaxy',   icon: '🎬', color: { r: 1.0, g: 0.2, b: 0.3 } },
  { key: 'AUDIO',     label: 'Music Galaxy',    icon: '🎵', color: { r: 1.0, g: 0.3, b: 0.6 } },
  { key: 'DOCUMENTS', label: 'Documents Galaxy', icon: '📄', color: { r: 0.0, g: 0.7, b: 1.0 } },
  { key: 'CODE',      label: 'Code Galaxy',     icon: '💻', color: { r: 0.0, g: 0.85, b: 0.4 } },
  { key: 'ARCHIVES',  label: 'Archives Galaxy', icon: '📦', color: { r: 1.0, g: 0.65, b: 0.0 } },
  { key: 'OTHER',     label: 'Other Galaxy',    icon: '✦',  color: { r: 0.45, g: 0.45, b: 0.55 } },
]

const WORD_POOL = ['aurora', 'cosmos', 'nebula', 'stellar', 'quantum', 'vortex', 'crystal', 'lunar', 'solar', 'echo', 'pulse', 'wave', 'flux', 'drift', 'spark', 'nova', 'orbit', 'phase', 'bloom', 'flare', 'prism', 'glow', 'beacon', 'ripple', 'shard', 'tide', 'veil', 'haze', 'peak', 'node']
const EXT_BY_CATEGORY = {
  IMAGES: ['jpg', 'png', 'gif', 'webp', 'svg'],
  VIDEOS: ['mp4', 'webm', 'mov', 'avi'],
  AUDIO: ['mp3', 'wav', 'flac', 'm4a'],
  DOCUMENTS: ['pdf', 'docx', 'xlsx', 'csv'],
  CODE: ['js', 'ts', 'py', 'rs', 'go', 'jsx', 'tsx', 'css', 'json', 'yaml'],
  ARCHIVES: ['zip', 'tar', 'gz', 'rar'],
  OTHER: ['bin', 'dat', 'log', 'tmp'],
}

export function generateDemoClusters() {
  const clusterMap = {}
  const count = CATEGORIES.length
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    clusterMap[i] = {
      id: i,
      name: CATEGORIES[i].label,
      icon: CATEGORIES[i].icon,
      category: CATEGORIES[i].key,
      color: CATEGORIES[i].color,
      dir: `/${CATEGORIES[i].key.toLowerCase()}`,
      fileCount: Math.floor(8 + Math.random() * 25),
      position: new Float32Array([
        Math.cos(angle) * 3.5,
        0,
        Math.sin(angle) * 3.5,
      ]),
    }
  }
  return clusterMap
}

export function generateDemoClusterFiles(clusterId) {
  const cat = CATEGORIES[clusterId]
  if (!cat) return []
  const exts = EXT_BY_CATEGORY[cat.key] || ['dat']
  const count = 8 + Math.floor(Math.random() * 20)
  const files = []
  for (let i = 0; i < count; i++) {
    const word = WORD_POOL[(i * 7 + clusterId) % WORD_POOL.length]
    const suffix = i > 0 ? `_${i}` : ''
    const ext = exts[i % exts.length]
    const fileSize = Math.floor(Math.random() * 100000) + 500
    files.push({
      name: `${word}${suffix}.${ext}`,
      path: `/${cat.key.toLowerCase()}/${word}${suffix}.${ext}`,
      fileId: `demo-${clusterId}-${i}`,
      size: fileSize,
      sizeFormatted: fileSize > 1024 * 1024
        ? `${(fileSize / 1024 / 1024).toFixed(1)} MB`
        : fileSize > 1024
          ? `${(fileSize / 1024).toFixed(1)} KB`
          : `${fileSize} B`,
      ext,
      isDirectory: false,
      modified: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    })
  }
  return files
}
