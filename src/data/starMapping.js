import { getFileType } from './fileRegistry'

const TYPE_VISUALS = {
  image:   { color: { r: 0.75, g: 0.25, b: 1.0 }, sizeBase: 2.2, glowMult: 1.2, label: 'image', icon: '🖼' },
  video:   { color: { r: 1.0, g: 0.20, b: 0.30 }, sizeBase: 2.8, glowMult: 1.1, label: 'video', icon: '🎬' },
  audio:   { color: { r: 1.0, g: 0.30, b: 0.60 }, sizeBase: 1.8, glowMult: 0.9, label: 'audio', icon: '🎵' },
  pdf:     { color: { r: 0.0, g: 0.70, b: 1.0 },  sizeBase: 1.5, glowMult: 0.6, label: 'doc',   icon: '📄' },
  text:    { color: { r: 0.0, g: 0.85, b: 0.40 }, sizeBase: 1.4, glowMult: 0.8, label: 'code',  icon: '⌨' },
  archive: { color: { r: 1.0, g: 0.65, b: 0.0 },  sizeBase: 1.6, glowMult: 0.5, label: 'archive', icon: '📦' },
  unknown: { color: { r: 0.45, g: 0.45, b: 0.55 }, sizeBase: 1.0, glowMult: 0.4, label: 'other', icon: '✦' },
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash)
}

export function getStarColor(fileExt, clusterColor = null) {
  const type = getFileType(fileExt)
  const base = TYPE_VISUALS[type] || TYPE_VISUALS.unknown
  const c = base.color
  if (!clusterColor) return { ...c }
  return {
    r: c.r * 0.55 + clusterColor.r * 0.45,
    g: c.g * 0.55 + clusterColor.g * 0.45,
    b: c.b * 0.55 + clusterColor.b * 0.45,
  }
}

export function getStarColorArray(fileExt, clusterColor = null) {
  const c = getStarColor(fileExt, clusterColor)
  return [c.r, c.g, c.b]
}

export function getStarSize(fileBytes, fileExt) {
  const type = getFileType(fileExt)
  const base = (TYPE_VISUALS[type] || TYPE_VISUALS.unknown).sizeBase
  let sizeFactor
  if (fileBytes < 1024 * 10) sizeFactor = 0.4 + fileBytes / (1024 * 10) * 0.4
  else if (fileBytes < 1024 * 100) sizeFactor = 0.8 + (fileBytes - 10240) / (1024 * 90) * 0.5
  else if (fileBytes < 1024 * 1024) sizeFactor = 1.3 + (fileBytes - 102400) / (1024 * 924) * 0.8
  else if (fileBytes < 1024 * 1024 * 10) sizeFactor = 2.1 + (fileBytes - 1048576) / (1024 * 1024 * 9) * 1.5
  else sizeFactor = 3.6 + Math.min((fileBytes - 10485760) / (1024 * 1024 * 100), 2.0) * 2.0
  return base * Math.min(sizeFactor, 8.0)
}

export function getStarGlow(fileExt) {
  const type = getFileType(fileExt)
  return (TYPE_VISUALS[type] || TYPE_VISUALS.unknown).glowMult
}

export function getStarIcon(fileExt) {
  const type = getFileType(fileExt)
  return (TYPE_VISUALS[type] || TYPE_VISUALS.unknown).icon
}

export function getStarTypeLabel(fileExt) {
  const type = getFileType(fileExt)
  return (TYPE_VISUALS[type] || TYPE_VISUALS.unknown).label
}

function deterministicRandom(seed) {
  let s = seed
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967296
  }
}

export function buildStarPositions(files, seed = 0, clusterRadius = 0.35) {
  if (!files || files.length === 0) return new Float32Array(0)
  const count = files.length
  const positions = new Float32Array(count * 3)
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const baseSeed = (seed * 9301 + 49297) & 0xffffffff
  const rng = deterministicRandom(baseSeed)

  for (let i = 0; i < count; i++) {
    const file = sorted[i]
    const h = hashCode(file.path || file.name) + seed
    const dist = Math.sqrt((i / count) * 0.7 + rng() * 0.3) * clusterRadius
    const angle = (h % 360) * 0.01745 + (i % 7) * 0.9
    const height = (rng() - 0.5) * 0.12 * (1 - dist * 0.5)
    const spreadAngle = angle + (rng() - 0.5) * 0.5 * dist
    positions[i * 3] = Math.cos(spreadAngle) * dist
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(spreadAngle) * dist
  }
  return positions
}

export function buildStarColors(files, clusterColor = null) {
  if (!files || files.length === 0) return new Float32Array(0)
  const count = files.length
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const ext = files[i]?.ext || ''
    const [r, g, b] = getStarColorArray(ext, clusterColor)
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }
  return colors
}

export function buildStarSizes(files) {
  if (!files || files.length === 0) return new Float32Array(0)
  const count = files.length
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const file = files[i]
    sizes[i] = getStarSize(file.size || 0, file.ext || '')
  }
  return sizes
}

export function buildStarPhases(seed = 0) {
  const rng = deterministicRandom((seed * 9301 + 49297) & 0xffffffff)
  const count = 2000
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    phases[i] = rng() * Math.PI * 2
  }
  return phases
}

export function buildStarMeta(files) {
  if (!files || files.length === 0) return []
  return files.map((file, i) => ({
    id: i,
    name: file.name,
    path: file.path,
    fileId: file.fileId || null,
    type: getStarTypeLabel(file.ext || ''),
    ext: file.ext || '',
    size: file.sizeFormatted || `${file.size || 0} B`,
    sizeBytes: file.size || 0,
    isDirectory: file.isDirectory || false,
    clusterIcon: getStarIcon(file.ext || ''),
    modified: file.modified,
    isNew: file._isNew || false,
  }))
}
