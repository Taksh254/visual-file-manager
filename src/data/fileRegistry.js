const fileRegistry = new Map()
const previewUrls = new Map()
let idCounter = 0

export function registerFile(file) {
  const id = `f_${++idCounter}_${Date.now()}`
  fileRegistry.set(id, file)
  return id
}

export function registerFiles(files) {
  return files.map(f => {
    const fileId = registerFile(f)
    return { ...f, fileId }
  })
}

export function getFile(fileId) {
  return fileRegistry.get(fileId) || null
}

export function getFileByPath(path) {
  for (const [id, file] of fileRegistry) {
    const filePath = file.webkitRelativePath || file.name
    if (filePath === path) return file
  }
  return null
}

export function createObjectURL(fileId) {
  const file = fileRegistry.get(fileId)
  if (!file) return null
  if (previewUrls.has(fileId)) return previewUrls.get(fileId)
  const url = URL.createObjectURL(file)
  previewUrls.set(fileId, url)
  return url
}

export function getObjectURL(fileId) {
  return previewUrls.get(fileId) || null
}

export function revokeObjectURL(fileId) {
  const url = previewUrls.get(fileId)
  if (url) {
    URL.revokeObjectURL(url)
    previewUrls.delete(fileId)
  }
}

export function revokeAllURLs() {
  for (const [id, url] of previewUrls) {
    URL.revokeObjectURL(url)
  }
  previewUrls.clear()
}

export function clearRegistry() {
  revokeAllURLs()
  fileRegistry.clear()
  idCounter = 0
}

export function getRegistrySize() {
  return fileRegistry.size
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getFileType(ext) {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'm4v']
  const audioExts = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'wma', 'opus']
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'rb', 'php', 'pl', 'scala', 'dart', 'lua']
  const markupExts = ['html', 'css', 'scss', 'less', 'xml', 'svg', 'md', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf']
  const textExts = ['txt', 'log', 'csv', 'tsv', 'env', 'gitignore', 'dockerfile', 'makefile', 'sql', 'sh', 'bat', 'ps1']
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2']

  const e = ext?.toLowerCase()
  if (!e) return 'unknown'
  if (imageExts.includes(e)) return 'image'
  if (videoExts.includes(e)) return 'video'
  if (audioExts.includes(e)) return 'audio'
  if (e === 'pdf') return 'pdf'
  if (codeExts.includes(e) || markupExts.includes(e) || textExts.includes(e)) return 'text'
  if (archiveExts.includes(e)) return 'archive'
  return 'unknown'
}

export function canPreview(ext) {
  const type = getFileType(ext)
  return ['image', 'video', 'audio', 'pdf', 'text'].includes(type)
}

export function downloadFile(fileId, fileName) {
  const file = fileRegistry.get(fileId)
  if (!file) return
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || file.name
  a.click()
  URL.revokeObjectURL(url)
}
