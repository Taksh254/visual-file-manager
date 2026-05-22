import fs from 'fs'
import path from 'path'
import os from 'os'

const homeDir = os.homedir()
const oneDriveDir = path.join(homeDir, 'OneDrive')

function resolveDir(name) {
  const oneDrivePath = path.join(oneDriveDir, name)
  if (fs.existsSync(oneDrivePath)) return oneDrivePath
  const customPath = path.join(homeDir, name)
  if (fs.existsSync(customPath)) return customPath
  const desktopPath = path.join(homeDir, 'Desktop', name)
  if (fs.existsSync(desktopPath)) return desktopPath
  return path.join(homeDir, name)
}

const CLUSTER_DEFS = [
  { id: 0, name: 'Desktop',   r: 0.15, g: 0.75, b: 0.30 },
  { id: 1, name: 'Downloads', r: 0.15, g: 0.45, b: 0.90 },
  { id: 2, name: 'Documents', r: 1.0,  g: 0.80, b: 0.15 },
  { id: 3, name: 'Pictures',  r: 0.61, g: 0.30, b: 0.75 },
  { id: 4, name: 'Videos',    r: 0.91, g: 0.25, b: 0.20 },
  { id: 5, name: 'Music',     r: 0.92, g: 0.35, b: 0.70 },
  { id: 6, name: 'Projects',  r: 0.05, g: 0.75, b: 0.85 },
]

const FILE_TYPE_COLORS = {
  pdf:     { r: 1.0,  g: 0.55, b: 0.0  },
  image:   { r: 0.61, g: 0.35, b: 0.71 },
  video:   { r: 0.91, g: 0.30, b: 0.24 },
  audio:   { r: 0.92, g: 0.35, b: 0.70 },
  code:    { r: 0.0,  g: 0.74, b: 0.83 },
  archive: { r: 0.95, g: 0.85, b: 0.10 },
  folder:  { r: 1.0,  g: 1.0,  b: 1.0  },
  unknown: { r: 0.4,  g: 0.4,  b: 0.4  },
}

const IMAGE_EXTS = ['jpg','jpeg','png','gif','svg','webp','bmp','ico','tiff','psd','raw','heic']
const VIDEO_EXTS = ['mp4','mov','avi','mkv','webm','m4v','wmv','flv','h264','mpeg','mpg']
const AUDIO_EXTS = ['mp3','wav','flac','aac','ogg','wma','m4a','opus']
const CODE_EXTS = ['js','ts','jsx','tsx','py','rs','go','rb','php','java','c','cpp','h','cs','swift','kt','scala','dart',
  'html','css','scss','sass','less','vue','svelte','json','xml','yaml','yml','toml','ini','cfg',
  'sql','sh','bash','zsh','ps1','bat','cmd','dockerfile','makefile','cmake','gradle']
const ARCHIVE_EXTS = ['zip','tar','gz','rar','7z','bz2','xz','zst','iso']

function getFileExtension(name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

function getFileTypeColor(ext) {
  const e = ext.toLowerCase()
  if (e === 'pdf') return FILE_TYPE_COLORS.pdf
  if (IMAGE_EXTS.includes(e)) return FILE_TYPE_COLORS.image
  if (VIDEO_EXTS.includes(e)) return FILE_TYPE_COLORS.video
  if (AUDIO_EXTS.includes(e)) return FILE_TYPE_COLORS.audio
  if (CODE_EXTS.includes(e)) return FILE_TYPE_COLORS.code
  if (ARCHIVE_EXTS.includes(e)) return FILE_TYPE_COLORS.archive
  return FILE_TYPE_COLORS.unknown
}

function getFileTypeGroup(ext) {
  if (ext === 'folder') return 'folder'
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  if (AUDIO_EXTS.includes(ext)) return 'audio'
  if (CODE_EXTS.includes(ext)) return 'code'
  if (ARCHIVE_EXTS.includes(ext)) return 'archive'
  return 'unknown'
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const u = ['B','KB','MB','GB','TB']
  let i = 0, s = bytes
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
  return `${i === 0 ? s : s.toFixed(1)} ${u[i]}`
}

function scanDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return []
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      try {
        const fullPath = path.join(dirPath, entry.name)
        const stat = fs.statSync(fullPath)
        const ext = entry.isDirectory() ? 'folder' : getFileExtension(entry.name)
        const typeColor = entry.isDirectory() ? FILE_TYPE_COLORS.folder : getFileTypeColor(ext)
        const typeGroup = entry.isDirectory() ? 'folder' : getFileTypeGroup(ext)
        files.push({
          name: entry.name,
          path: fullPath,
          ext,
          type: typeGroup,
          size: entry.isDirectory() ? 0 : stat.size,
          sizeFormatted: entry.isDirectory() ? '-' : formatSize(stat.size),
          created: stat.birthtime || stat.ctime,
          modified: stat.mtime,
          isDirectory: entry.isDirectory(),
          color: typeColor,
        })
      } catch {}
    }
    files.sort((a, b) => a.name.localeCompare(b.name))
    return files
  } catch { return [] }
}

function scanFile(dirPath, fileName) {
  try {
    const fullPath = path.join(dirPath, fileName)
    if (!fs.existsSync(fullPath)) return null
    const stat = fs.statSync(fullPath)
    const isDir = stat.isDirectory()
    const ext = isDir ? 'folder' : getFileExtension(fileName)
    const typeColor = isDir ? FILE_TYPE_COLORS.folder : getFileTypeColor(ext)
    const typeGroup = isDir ? 'folder' : getFileTypeGroup(ext)
    return {
      name: fileName,
      path: fullPath,
      ext,
      type: typeGroup,
      size: isDir ? 0 : stat.size,
      sizeFormatted: isDir ? '-' : formatSize(stat.size),
      created: stat.birthtime || stat.ctime,
      modified: stat.mtime,
      isDirectory: isDir,
      color: typeColor,
    }
  } catch { return null }
}

function getResolvedClusters() {
  return CLUSTER_DEFS.map(d => ({
    id: d.id,
    name: d.name,
    dir: resolveDir(d.name),
    color: { r: d.r, g: d.g, b: d.b },
  }))
}

export {
  CLUSTER_DEFS,
  FILE_TYPE_COLORS,
  resolveDir,
  getFileExtension,
  getFileTypeColor,
  getFileTypeGroup,
  formatSize,
  scanDirectory,
  scanFile,
  getResolvedClusters,
}
