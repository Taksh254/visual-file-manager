import { buildStarPositions, buildStarColors, buildStarSizes, buildStarMeta } from './starMapping'

let particleVersionCounter = 0

export function generateClusterFiles(files, seed = 0, clusterColor = null) {
  if (!files || files.length === 0) {
    return { meta: [], positions: new Float32Array(0), colors: new Float32Array(0), sizes: new Float32Array(0), count: 0, version: particleVersionCounter }
  }

  const count = files.length
  const meta = buildStarMeta(files)
  const positions = buildStarPositions(files, seed, 0.35)
  const colors = buildStarColors(files, clusterColor)
  const sizes = buildStarSizes(files)

  particleVersionCounter++
  return { meta, positions, colors, sizes, count, version: particleVersionCounter }
}

export function getParticleVersion() {
  return particleVersionCounter
}

export function computeFileDiff(oldFiles, newFiles) {
  if (!oldFiles) return { added: newFiles || [], removed: [], modified: [] }

  const oldMap = new Map(oldFiles.map(f => [f.path, f]))
  const newMap = new Map(newFiles.map(f => [f.path, f]))

  const added = []
  const removed = []
  const modified = []

  for (const [path, file] of newMap) {
    if (!oldMap.has(path)) {
      added.push({ ...file, _isNew: true })
    } else {
      const old = oldMap.get(path)
      if (old.modified !== file.modified || old.size !== file.size) {
        modified.push(file)
      }
    }
  }

  for (const [path, file] of oldMap) {
    if (!newMap.has(path)) {
      removed.push(file)
    }
  }

  return { added, removed, modified }
}
