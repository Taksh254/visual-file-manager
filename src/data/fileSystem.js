let particleVersionCounter = 0

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash)
}

function deterministicRandom(seed) {
  let s = seed
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967296
  }
}

export function generateClusterFiles(files, seed = 0) {
  if (!files || files.length === 0) {
    return { meta: [], positions: new Float32Array(0), colors: new Float32Array(0), count: 0, version: particleVersionCounter }
  }

  const count = files.length
  const meta = new Array(count)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const baseSeed = (seed * 9301 + 49297) & 0xffffffff
  const rng = deterministicRandom(baseSeed)

  for (let i = 0; i < count; i++) {
    const file = sorted[i]
    const h = hashCode(file.path || file.name) + seed
    const dist = Math.sqrt((i / count) * 0.7 + rng() * 0.3) * 0.35
    const angle = (h % 360) * 0.01745 + (i % 7) * 0.9
    const height = (rng() - 0.5) * 0.12 * (1 - dist * 0.5)
    const spreadAngle = angle + (rng() - 0.5) * 0.5 * dist

    positions[i * 3] = Math.cos(spreadAngle) * dist
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(spreadAngle) * dist

    const c = file.color || { r: 0.4, g: 0.4, b: 0.4 }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    const isNew = file._isNew || false

    meta[i] = {
      id: i,
      name: file.name,
      path: file.path,
      type: file.isDirectory ? 'folder' : (file.ext || 'unknown'),
      size: file.sizeFormatted || `${file.size || 0} B`,
      sizeBytes: file.size || 0,
      isDirectory: file.isDirectory || false,
      ext: file.ext || '',
      created: file.created,
      modified: file.modified,
      isNew,
    }
  }

  particleVersionCounter++
  return { meta, positions, colors, count, version: particleVersionCounter }
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
