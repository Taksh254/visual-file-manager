import { useState, useEffect, useRef, useCallback } from 'react'
import { registerFiles, clearRegistry } from '../data/fileRegistry'
import useUniverseStore from '../store/useUniverseStore'

const PHASES = { LANDING: 0, UPLOAD: 1, CLUSTER_EDIT: 2, GENERATING: 3, COMPLETE: 4 }

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'raw', 'heic', 'psd', 'ai']
const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'm4v', 'flv', '3gp', 'mpeg', 'mpg']
const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'wma', 'opus', 'ogg', 'wv', 'aiff', 'mid', 'midi']
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'csv', 'tsv']
const ARCHIVE_EXTS = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz', 'zst', 'tgz', 'tbz2']
const CODE_EXTS = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'rb', 'php', 'pl', 'scala', 'dart', 'lua', 'r', 'm', 'sql', 'css', 'scss', 'less', 'html', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bat', 'ps1', 'fish', 'env', 'makefile', 'dockerfile', 'gitignore']

const CATEGORIES = [
  { key: 'IMAGES',    label: 'Images Galaxy',   icon: '🖼', color: { r: 0.75, g: 0.25, b: 1.0 } },
  { key: 'VIDEOS',    label: 'Videos Galaxy',   icon: '🎬', color: { r: 1.0, g: 0.2, b: 0.3 } },
  { key: 'AUDIO',     label: 'Music Galaxy',    icon: '🎵', color: { r: 1.0, g: 0.3, b: 0.6 } },
  { key: 'DOCUMENTS', label: 'Documents Galaxy', icon: '📄', color: { r: 0.0, g: 0.7, b: 1.0 } },
  { key: 'CODE',      label: 'Code Galaxy',     icon: '💻', color: { r: 0.0, g: 0.85, b: 0.4 } },
  { key: 'ARCHIVES',  label: 'Archives Galaxy', icon: '📦', color: { r: 1.0, g: 0.65, b: 0.0 } },
  { key: 'OTHER',     label: 'Other Galaxy',    icon: '✦',  color: { r: 0.45, g: 0.45, b: 0.55 } },
]

function extToCategory(ext) {
  const e = ext?.toLowerCase()
  if (IMAGE_EXTS.includes(e)) return 'IMAGES'
  if (VIDEO_EXTS.includes(e)) return 'VIDEOS'
  if (AUDIO_EXTS.includes(e)) return 'AUDIO'
  if (DOC_EXTS.includes(e)) return 'DOCUMENTS'
  if (CODE_EXTS.includes(e)) return 'CODE'
  if (ARCHIVE_EXTS.includes(e)) return 'ARCHIVES'
  return 'OTHER'
}

const PARTICLE_COUNT = 250
const MAX_FILE_SIZE = 1024 * 1024 * 50

function organizeFilesIntoClusters(rawFiles) {
  const filesWithIds = registerFiles(rawFiles)
  const categoryBuckets = {}

  for (const cat of CATEGORIES) categoryBuckets[cat.key] = []

  for (let i = 0; i < filesWithIds.length; i++) {
    const entry = filesWithIds[i]
    const file = rawFiles[i]
    const path = file.webkitRelativePath || file.name
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
    const catKey = extToCategory(ext)

    categoryBuckets[catKey].push({
      name: path.split('/').slice(file.webkitRelativePath ? 1 : 0).join('/') || file.name,
      path,
      fileId: entry.fileId,
      size: file.size,
      sizeFormatted: file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : file.size > 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${file.size} B`,
      ext,
      isDirectory: false,
      modified: new Date(file.lastModified).toISOString(),
    })
  }

  const clusterMap = {}
  const clusterFiles = {}
  const presentCategories = CATEGORIES.filter(cat => categoryBuckets[cat.key].length > 0)
  const total = presentCategories.length

  presentCategories.forEach((cat, idx) => {
    const angle = (idx / total) * Math.PI * 2 - Math.PI / 2
    const radiusVar = 3.5
    const yOffset = 0
    clusterMap[idx] = {
      id: idx,
      name: cat.label,
      icon: cat.icon,
      category: cat.key,
      color: cat.color,
      dir: `/${cat.key.toLowerCase()}`,
      fileCount: categoryBuckets[cat.key].length,
      position: new Float32Array([
        Math.cos(angle) * radiusVar,
        yOffset,
        Math.sin(angle) * radiusVar,
      ]),
    }
    clusterFiles[idx] = categoryBuckets[cat.key]
  })

  return { clusterMap, clusterFiles }
}

function useSoundEffects() {
  const audioCtxRef = useRef(null)

  const getCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const playUploadTone = useCallback(() => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [])

  const playGenerationRise = useCallback(() => {
    try {
      const ctx = getCtx()
      const now = ctx.currentTime
      const notes = [220, 277.18, 329.63, 440, 554.37, 659.25, 880]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.15)
        gain.gain.setValueAtTime(0, now + i * 0.15)
        gain.gain.linearRampToValueAtTime(0.04, now + i * 0.15 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4)
        osc.start(now + i * 0.15)
        osc.stop(now + i * 0.15 + 0.4)
      })
    } catch {}
  }, [])

  const playCompletionSwirl = useCallback(() => {
    try {
      const ctx = getCtx()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.setValueAtTime(6, now)
      lfoGain.gain.setValueAtTime(60, now)
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.5)
      gain.gain.setValueAtTime(0.06, now + 1.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3)
      lfo.start(now)
      osc.start(now)
      osc.stop(now + 3)
    } catch {}
  }, [])

  return { playUploadTone, playGenerationRise, playCompletionSwirl }
}

function ParticleCanvas({ phase, generationProgress, cursorRef, transitionRef }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    phase: PHASES.LANDING, initialized: false, time: 0,
    genParticles: null, clusterCenters: null, genPhase: 0,
  })
  const progressRef = useRef(0)
  progressRef.current = generationProgress

  useEffect(() => { stateRef.current.phase = phase }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const s = stateRef.current
    let nebulaGradients = null
    let stars = null, brightStars = null
    let energyParticles = null
    let cosmicDust = null
    let foregroundParticles = null
    let lightStreaks = null
    let ringParticles = null, ringParticles2 = null, ringParticles3 = null, ringParticles4 = null
    let orbitalFragments = null
    let megastructures = null
    let constellations = null
    let galaxyFields = null
    let energyWaves = null

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      nebulaGradients = null
    }
    resize()
    window.addEventListener('resize', resize)

    if (!s.initialized) {
      s.initialized = true

      galaxyFields = new Array(5)
      for (let i = 0; i < 5; i++) {
        galaxyFields[i] = {
          x: (0.05 + Math.random() * 0.9) * canvas.width,
          y: (0.1 + Math.random() * 0.8) * canvas.height,
          radius: 30 + Math.random() * 80,
          hue: [200, 260, 280, 220, 240][i],
          angle: Math.random() * Math.PI * 2,
          spread: 0.3 + Math.random() * 0.4,
          opacity: 0.01 + Math.random() * 0.02,
          driftX: (Math.random() - 0.5) * 0.005,
          driftY: (Math.random() - 0.5) * 0.005,
        }
      }

      megastructures = []
      const cx = canvas.width / 2, cy = canvas.height / 2
      const maxDim = Math.max(canvas.width, canvas.height)
      const arcRadii = [maxDim * 0.45, maxDim * 0.55, maxDim * 0.7, maxDim * 0.85]
      for (let ri = 0; ri < arcRadii.length; ri++) {
        const r = arcRadii[ri]
        const segments = 6 + ri * 2
        for (let si = 0; si < segments; si++) {
          const startA = (si / segments) * Math.PI * 2 + ri * 0.3
          const endA = startA + (0.12 + ri * 0.02)
          megastructures.push({
            cx, cy, radius: r, startA, endA,
            hue: 240 + ri * 10, opacity: 0.005 + ri * 0.003,
            rotationSpeed: 0.005 + ri * 0.002,
            phase: Math.random() * Math.PI * 2,
          })
        }
        const lineCount = 3 + ri
        for (let li = 0; li < lineCount; li++) {
          const angle = (li / lineCount) * Math.PI * 2 + ri * 0.5
          const len = r * (0.08 + Math.random() * 0.12)
          megastructures.push({
            type: 'spoke',
            cx, cy, angle, length: len, radius: r,
            hue: 250, opacity: 0.004,
            phase: Math.random() * Math.PI * 2,
          })
        }
      }

      stars = new Array(400)
      brightStars = []
      for (let i = 0; i < 400; i++) {
        const isBright = Math.random() < 0.06
        stars[i] = {
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          size: isBright ? 1.5 + Math.random() * 2 : 0.3 + Math.random() * 0.8,
          opacity: isBright ? 0.4 + Math.random() * 0.4 : 0.1 + Math.random() * 0.25,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.15 + Math.random() * 0.4,
          driftX: (Math.random() - 0.5) * 0.015,
          driftY: (Math.random() - 0.5) * 0.015,
          hue: 220 + Math.random() * 60,
        }
        if (isBright) brightStars.push(i)
      }

      constellations = []
      for (let i = 0; i < brightStars.length; i++) {
        for (let j = i + 1; j < brightStars.length; j++) {
          const dx = stars[brightStars[i]].x - stars[brightStars[j]].x
          const dy = stars[brightStars[i]].y - stars[brightStars[j]].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && dist > 20) {
            constellations.push({
              a: brightStars[i], b: brightStars[j],
              baseAlpha: 0.01 + Math.random() * 0.02,
              pulseSpeed: 0.1 + Math.random() * 0.3,
              phase: Math.random() * Math.PI * 2,
            })
          }
        }
      }

      energyParticles = new Array(160)
      for (let i = 0; i < 160; i++) {
        const angle = Math.random() * Math.PI * 2
        const rad = 60 + Math.random() * Math.max(canvas.width, canvas.height) * 0.4
        energyParticles[i] = {
          x: canvas.width / 2 + Math.cos(angle) * rad,
          y: canvas.height / 2 + Math.sin(angle) * rad + 20,
          baseRad: rad, baseAngle: angle,
          size: 0.8 + Math.random() * 2.5,
          opacity: 0.04 + Math.random() * 0.15,
          ph: Math.random() * Math.PI * 2,
          orbitSpeed: 0.0002 + Math.random() * 0.0006,
          hue: 200 + Math.random() * 80,
          radialPulse: 0.3 + Math.random() * 0.4,
          radialSpeed: 0.002 + Math.random() * 0.004,
        }
      }

      orbitalFragments = new Array(30)
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2
        orbitalFragments[i] = {
          baseAngle: angle, radius: 30 + Math.random() * 140,
          size: 0.8 + Math.random() * 1.5,
          opacity: 0.06 + Math.random() * 0.12,
          ph: Math.random() * Math.PI * 2,
          orbitSpeed: 0.08 + Math.random() * 0.25,
          hue: 240 + Math.random() * 60,
          tilt: (Math.random() - 0.5) * 0.6,
        }
      }

      cosmicDust = new Array(60)
      for (let i = 0; i < 60; i++) {
        cosmicDust[i] = {
          x: (Math.random() - 0.5) * canvas.width * 1.8,
          y: (Math.random() - 0.5) * canvas.height * 1.8,
          size: 1.0 + Math.random() * 3,
          opacity: 0.03 + Math.random() * 0.08,
          ph: Math.random() * Math.PI * 2,
          driftX: (Math.random() - 0.5) * 0.01,
          driftY: (Math.random() - 0.5) * 0.01,
        }
      }

      ringParticles = new Array(50)
      for (let i = 0; i < 50; i++) {
        ringParticles[i] = { angle: (i / 50) * Math.PI * 2, radius: 85 + Math.random() * 15, size: 1.2 + Math.random() * 2, ph: Math.random() * Math.PI * 2 }
      }
      ringParticles2 = new Array(36)
      for (let i = 0; i < 36; i++) {
        ringParticles2[i] = { angle: (i / 36) * Math.PI * 2, radius: 120 + Math.random() * 12, size: 0.8 + Math.random() * 1.2, ph: Math.random() * Math.PI * 2 }
      }
      ringParticles3 = new Array(28)
      for (let i = 0; i < 28; i++) {
        ringParticles3[i] = { angle: (i / 28) * Math.PI * 2, radius: 55 + Math.random() * 10, size: 1.5 + Math.random() * 2.5, ph: Math.random() * Math.PI * 2, tilt: 0.3 + Math.random() * 0.4 }
      }
      ringParticles4 = new Array(20)
      for (let i = 0; i < 20; i++) {
        ringParticles4[i] = { angle: (i / 20) * Math.PI * 2, radius: 160 + Math.random() * 18, size: 0.6 + Math.random() * 1, ph: Math.random() * Math.PI * 2, tilt: 0.5 + Math.random() * 0.3 }
      }

      energyWaves = new Array(3)
      for (let i = 0; i < 3; i++) {
        energyWaves[i] = { phase: i * 2.1, speed: 0.15 + i * 0.05, maxRadius: 200 + i * 30 }
      }

      foregroundParticles = new Array(40)
      for (let i = 0; i < 40; i++) {
        foregroundParticles[i] = {
          x: Math.random() * canvas.width * 1.4 - canvas.width * 0.2,
          y: Math.random() * canvas.height * 1.4 - canvas.height * 0.2,
          size: 4 + Math.random() * 12,
          opacity: 0.008 + Math.random() * 0.015,
          ph: Math.random() * Math.PI * 2,
          driftX: (Math.random() - 0.5) * 0.04,
          driftY: (Math.random() - 0.5) * 0.04,
          blur: 0.3 + Math.random() * 0.7,
        }
      }

      lightStreaks = new Array(6)
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2
        lightStreaks[i] = {
          x: cx + Math.cos(a) * (100 + Math.random() * 200),
          y: cy + Math.sin(a) * (100 + Math.random() * 200),
          angle: a + (Math.random() - 0.5) * 0.3,
          length: 40 + Math.random() * 100,
          speed: 0.08 + Math.random() * 0.15,
          opacity: 0.008 + Math.random() * 0.012,
          ph: Math.random() * Math.PI * 2,
        }
      }

      s.galaxyFields = galaxyFields
      s.megastructures = megastructures
      s.stars = stars
      s.brightStars = brightStars
      s.constellations = constellations
      s.energyParticles = energyParticles
      s.orbitalFragments = orbitalFragments
      s.cosmicDust = cosmicDust
      s.ringParticles = ringParticles
      s.ringParticles2 = ringParticles2
      s.ringParticles3 = ringParticles3
      s.ringParticles4 = ringParticles4
      s.energyWaves = energyWaves
      s.foregroundParticles = foregroundParticles
      s.lightStreaks = lightStreaks
    }

    function ensureNebula(w, h) {
      if (nebulaGradients) return
      nebulaGradients = []
      const count = 5
      for (let i = 0; i < count; i++) {
        const x = (0.1 + Math.random() * 0.8) * w
        const y = (0.15 + Math.random() * 0.7) * h
        const r = 120 + Math.random() * 250
        const hue = [260, 220, 280, 200, 240][i]
        const sat = 30 + Math.random() * 40
        const light = 10 + Math.random() * 15
        nebulaGradients.push({ x, y, r, hue, sat, light })
      }
    }

    function drawGalaxyFields(t) {
      const arr = s.galaxyFields
      if (!arr) return
      const cx = canvas.width / 2, cy = canvas.height * 0.42
      for (const g of arr) {
        const x = g.x + g.driftX * t * 30 + (g.x - cx) * 0.001
        const y = g.y + g.driftY * t * 30 + (g.y - cy) * 0.001
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(g.angle + t * 0.002)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, g.radius)
        grad.addColorStop(0, `hsla(${g.hue}, 50%, 60%, ${g.opacity})`)
        grad.addColorStop(g.spread, `hsla(${g.hue + 20}, 40%, 40%, ${g.opacity * 0.5})`)
        grad.addColorStop(1, `hsla(${g.hue + 40}, 30%, 20%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(0, 0, g.radius, g.radius * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    function drawMegastructures(t) {
      const arr = s.megastructures
      if (!arr) return
      for (const m of arr) {
        if (m.type === 'spoke') {
          const rot = m.angle + t * m.phase * 0.0004
          ctx.beginPath()
          ctx.moveTo(m.cx + Math.cos(rot) * (m.radius - m.length), m.cy + Math.sin(rot) * (m.radius - m.length))
          ctx.lineTo(m.cx + Math.cos(rot) * (m.radius + m.length), m.cy + Math.sin(rot) * (m.radius + m.length))
          ctx.strokeStyle = `hsla(${m.hue}, 30%, 40%, ${m.opacity})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        } else {
          const rot = t * m.rotationSpeed + m.phase
          ctx.beginPath()
          ctx.arc(m.cx, m.cy, m.radius, m.startA + rot, m.endA + rot)
          ctx.strokeStyle = `hsla(${m.hue}, 25%, 45%, ${m.opacity})`
          ctx.lineWidth = 0.5 + (1 - m.opacity * 100) * 0.3
          ctx.stroke()
        }
      }
    }

    function drawNebula(w, h) {
      ensureNebula(w, h)
      for (const n of nebulaGradients) {
        const pulse = 0.85 + 0.15 * Math.sin(s.time * 0.1 + n.hue)
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse)
        grad.addColorStop(0, `hsla(${n.hue}, ${n.sat}%, ${n.light}%, 0.05)`)
        grad.addColorStop(0.5, `hsla(${n.hue}, ${n.sat}%, ${n.light}%, 0.025)`)
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }
    }

    function drawConstellations(t) {
      const arr = s.constellations
      const starArr = s.stars
      if (!arr || !starArr) return
      for (const c of arr) {
        const pulse = 0.5 + 0.5 * Math.sin(t * c.pulseSpeed + c.phase)
        const alpha = c.baseAlpha * pulse
        const a = starArr[c.a], b = starArr[c.b]
        const ax = a.x + a.driftX * t * 15, ay = a.y + a.driftY * t * 15
        const bx = b.x + b.driftX * t * 15, by = b.y + b.driftY * t * 15
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.strokeStyle = `hsla(260, 40%, 60%, ${alpha})`
        ctx.lineWidth = 0.3 + alpha * 0.5
        ctx.stroke()
      }
    }

    function drawStars(t, cx, cy, cursorDx, cursorDy) {
      const arr = s.stars
      if (!arr) return
      for (let i = 0; i < arr.length; i++) {
        const pt = arr[i]
        const twinkle = 0.5 + 0.5 * Math.sin(t * pt.twinkleSpeed + pt.twinklePhase)
        const x = pt.x + pt.driftX * t * 20 + cursorDx * 0.02
        const y = pt.y + pt.driftY * t * 20 + cursorDy * 0.01
        ctx.beginPath()
        ctx.arc(x, y, pt.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${pt.hue}, 40%, ${55 + twinkle * 35}%, ${pt.opacity * twinkle})`
        ctx.fill()
      }
    }

    function drawEnergyParticles(t, cx, cy, cursorDx, cursorDy) {
      const arr = s.energyParticles
      if (!arr) return
      for (let i = 0; i < arr.length; i++) {
        const pt = arr[i]
        const rad = pt.baseRad + Math.sin(t * pt.radialSpeed + pt.ph) * pt.radialPulse * 20
        const a = pt.baseAngle + t * pt.orbitSpeed
        const x = cx + Math.cos(a) * rad + cursorDx * 0.04
        const y = cy + 20 + Math.sin(a) * rad * 0.45 + cursorDy * 0.03
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + pt.ph)
        ctx.beginPath()
        ctx.arc(x, y, pt.size * (0.6 + 0.4 * pulse), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${pt.hue}, 55%, 60%, ${pt.opacity * pulse})`
        ctx.fill()
      }
    }

    function drawOrbitalFragments(t, cx, cy) {
      const arr = s.orbitalFragments
      if (!arr) return
      for (let i = 0; i < arr.length; i++) {
        const pt = arr[i]
        const a = pt.baseAngle + t * pt.orbitSpeed
        const tiltRad = pt.radius * (1 + Math.sin(t * 0.1 + pt.ph) * 0.15)
        const x = cx + Math.cos(a) * tiltRad
        const y = cy + 20 + Math.sin(a + pt.tilt) * tiltRad * 0.35
        const pulse = Math.max(0, 0.4 + 0.6 * Math.sin(t * 0.8 + pt.ph))
        ctx.beginPath()
        ctx.arc(x, y, pt.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${pt.hue}, 50%, 70%, ${pt.opacity * pulse})`
        ctx.fill()
      }
    }

    function drawEnergyWaves(t, cx, cy) {
      const arr = s.energyWaves
      if (!arr) return
      for (const w of arr) {
        const radius = ((t * w.speed + w.phase) % w.maxRadius)
        const progress = radius / w.maxRadius
        const alpha = 0.03 * (1 - progress)
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(260, 70%, 70%, ${alpha})`
        ctx.lineWidth = 0.6 * (1 - progress)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(260, 60%, 50%, ${alpha * 0.3})`
        ctx.lineWidth = 1.5 * (1 - progress)
        ctx.stroke()
      }
    }

    function drawCosmicDust(t, cx, cy, cursorDx, cursorDy) {
      const arr = s.cosmicDust
      if (!arr) return
      for (let i = 0; i < arr.length; i++) {
        const pt = arr[i]
        const x = cx + pt.x + Math.sin(t * 0.015 + pt.ph) * 25 + cursorDx * 0.08
        const y = cy + pt.y + Math.cos(t * 0.012 + pt.ph * 0.7) * 25 + cursorDy * 0.06
        const pulse = 0.4 + 0.6 * Math.sin(t * 0.3 + pt.ph)
        ctx.beginPath()
        ctx.arc(x, y, pt.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(260, 40%, 55%, ${pt.opacity * pulse})`
        ctx.fill()
      }
    }

    function drawForegroundParticles(t, cx, cy) {
      const arr = s.foregroundParticles
      if (!arr) return
      for (let i = 0; i < arr.length; i++) {
        const pt = arr[i]
        const x = cx + pt.x + Math.sin(t * 0.005 + pt.ph) * 20
        const y = cy + pt.y + Math.cos(t * 0.004 + pt.ph) * 20
        ctx.beginPath()
        ctx.arc(x, y, pt.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(260, 30%, 50%, ${pt.opacity})`
        ctx.fill()
      }
    }

    function drawLightStreaks(t, cx, cy) {
      const arr = s.lightStreaks
      if (!arr) return
      for (const s of arr) {
        const progress = (t * s.speed + s.ph) % 1
        const x = s.x + Math.cos(s.angle) * progress * s.length
        const y = s.y + Math.sin(s.angle) * progress * s.length
        const alpha = s.opacity * (1 - Math.abs(progress - 0.5) * 2)
        ctx.beginPath()
        ctx.arc(x, y, 0.3, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(260, 40%, 70%, ${alpha})`
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(s.angle) * 5, y - Math.sin(s.angle) * 5)
        ctx.strokeStyle = `hsla(260, 40%, 60%, ${alpha * 0.4})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }

    function drawCore(t, cx, cy, cursorDx, cursorDy) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 0.5)
      const breathe = 0.95 + 0.05 * Math.sin(t * 0.3)
      const coreX = cx + cursorDx * 0.04
      const coreY = cy + cursorDy * 0.04

      const distGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 200 * pulse * breathe)
      distGlow.addColorStop(0, 'hsla(260, 80%, 70%, 0.035)')
      distGlow.addColorStop(0.3, 'hsla(260, 70%, 50%, 0.02)')
      distGlow.addColorStop(1, 'hsla(260, 80%, 40%, 0)')
      ctx.fillStyle = distGlow
      ctx.fillRect(coreX - 200, coreY - 200, 400, 400)

      const outerGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 160 * pulse)
      outerGlow.addColorStop(0, 'hsla(260, 80%, 70%, 0.05)')
      outerGlow.addColorStop(0.3, 'hsla(260, 70%, 50%, 0.03)')
      outerGlow.addColorStop(1, 'hsla(260, 80%, 40%, 0)')
      ctx.fillStyle = outerGlow
      ctx.fillRect(coreX - 160, coreY - 160, 320, 320)

      const midGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 70 * pulse)
      midGlow.addColorStop(0, 'hsla(260, 90%, 80%, 0.14)')
      midGlow.addColorStop(0.5, 'hsla(260, 80%, 60%, 0.07)')
      midGlow.addColorStop(1, 'hsla(260, 80%, 50%, 0)')
      ctx.fillStyle = midGlow
      ctx.fillRect(coreX - 70, coreY - 70, 140, 140)

      const innerCore = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 22 * pulse)
      innerCore.addColorStop(0, 'hsla(260, 100%, 95%, 0.55)')
      innerCore.addColorStop(0.3, 'hsla(260, 90%, 80%, 0.3)')
      innerCore.addColorStop(1, 'hsla(260, 80%, 60%, 0)')
      ctx.fillStyle = innerCore
      ctx.fillRect(coreX - 22, coreY - 22, 44, 44)

      const brightCore = ctx.createRadialGradient(coreX, coreY - 2, 0, coreX, coreY - 2, 7 * pulse)
      brightCore.addColorStop(0, 'rgba(255,255,255,0.7)')
      brightCore.addColorStop(0.5, 'hsla(260, 80%, 90%, 0.35)')
      brightCore.addColorStop(1, 'hsla(260, 80%, 70%, 0)')
      ctx.fillStyle = brightCore
      ctx.fillRect(coreX - 7, coreY - 9, 14, 14)

      const goldAccent = ctx.createRadialGradient(coreX + 3, coreY - 4, 0, coreX + 3, coreY - 4, 10 * pulse)
      goldAccent.addColorStop(0, 'hsla(45, 80%, 70%, 0.08)')
      goldAccent.addColorStop(1, 'hsla(45, 80%, 50%, 0)')
      ctx.fillStyle = goldAccent
      ctx.fillRect(coreX - 7, coreY - 14, 20, 20)

      const gravLens = ctx.createRadialGradient(coreX, coreY, 5, coreX, coreY, 30 * pulse)
      gravLens.addColorStop(0, 'hsla(260, 60%, 60%, 0.02)')
      gravLens.addColorStop(0.5, 'hsla(260, 50%, 50%, 0.01)')
      gravLens.addColorStop(1, 'hsla(260, 40%, 40%, 0)')
      ctx.fillStyle = gravLens
      ctx.fillRect(coreX - 30, coreY - 30, 60, 60)
    }

    function drawRing(t, cx, cy, particles, radiusScale, tilt, cursorDx, cursorDy, colorOffset, speedMult) {
      if (!particles) return
      speedMult = speedMult || 1
      const coreX = cx + cursorDx * 0.04
      const coreY = cy + cursorDy * 0.04
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i]
        const a = pt.angle + t * (0.15 * speedMult + i * 0.0008)
        const rad = pt.radius * radiusScale
        const tiltAngle = tilt || 0
        const x = coreX + Math.cos(a) * rad
        const y = coreY + Math.sin(a + tiltAngle) * rad * 0.35
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + pt.ph)
        ctx.beginPath()
        ctx.arc(x, y, pt.size * (0.5 + 0.5 * pulse), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${260 + colorOffset}, ${65 + pulse * 25}%, ${50 + pulse * 35}%, ${0.1 + 0.2 * pulse})`
        ctx.fill()
      }
    }

    function drawAtmospherics(w, h, t) {
      const vignette = ctx.createRadialGradient(w / 2, h * 0.4, w * 0.2, w / 2, h * 0.4, Math.max(w, h) * 0.8)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(0.5, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,5,0.5)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      const colorBreath = 0.6 + 0.4 * Math.sin(t * 0.05)
      const breathGrad = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.5)
      breathGrad.addColorStop(0, `rgba(20, 5, 40, ${0.04 * colorBreath})`)
      breathGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = breathGrad
      ctx.fillRect(0, 0, w, h)

      const cyanBreath = 0.5 + 0.5 * Math.sin(t * 0.03 + 1)
      const cyanGrad = ctx.createRadialGradient(w * 0.7, h * 0.8, 0, w * 0.7, h * 0.8, w * 0.3)
      cyanGrad.addColorStop(0, `rgba(0, 40, 60, ${0.02 * cyanBreath})`)
      cyanGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cyanGrad
      ctx.fillRect(0, 0, w, h)
    }

    function ensureGenerationParticles() {
      if (s.genParticles) return
      const ccCount = 12
      const centers = new Array(ccCount)
      for (let i = 0; i < ccCount; i++) {
        const a = (i / ccCount) * Math.PI * 2 + 0.2
        const t = ccCount > 1 ? i / (ccCount - 1) : 0.5
        const r = Math.min(canvas.width, canvas.height) * (0.15 + t * 0.2)
        centers[i] = {
          x: canvas.width / 2 + Math.cos(a) * r,
          y: canvas.height / 2 + Math.sin(a) * r,
          size: 4 + Math.random() * 3,
          pulsePhase: Math.random() * Math.PI * 2,
        }
      }
      s.clusterCenters = centers
      const total = 400
      const ps = new Array(total)
      for (let i = 0; i < total; i++) {
        const target = centers[i % ccCount]
        ps[i] = {
          x: (Math.random() - 0.5) * canvas.width * 1.5,
          y: (Math.random() - 0.5) * canvas.height * 1.5,
          targetX: target.x + (Math.random() - 0.5) * 60,
          targetY: target.y + (Math.random() - 0.5) * 60,
          size: Math.random() * 2 + 0.5,
          opacity: 0,
          hue: 240 + Math.random() * 60,
          speed: 0.008 + Math.random() * 0.015,
          offset: Math.random() * Math.PI * 2,
        }
      }
      s.genParticles = ps
      s.genPhase = 0
    }

    function drawBackground(w, h, t) {
      ctx.fillStyle = '#040008'
      ctx.fillRect(0, 0, w, h)

      const depthGrad = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, Math.max(w, h) * 0.85)
      depthGrad.addColorStop(0, 'rgba(25, 5, 45, 0.35)')
      depthGrad.addColorStop(0.4, 'rgba(10, 2, 25, 0.2)')
      depthGrad.addColorStop(1, 'rgba(0, 0, 5, 0)')
      ctx.fillStyle = depthGrad
      ctx.fillRect(0, 0, w, h)

      const floorGrad = ctx.createRadialGradient(w / 2, h * 1.15, 0, w / 2, h * 1.15, w * 0.65)
      floorGrad.addColorStop(0, 'rgba(15, 0, 30, 0.2)')
      floorGrad.addColorStop(0.5, 'rgba(8, 0, 18, 0.08)')
      floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = floorGrad
      ctx.fillRect(0, 0, w, h)

      drawGalaxyFields(t)
      drawNebula(w, h)

      const topGrad = ctx.createRadialGradient(w / 2, -50, 0, w / 2, -50, w * 0.4)
      topGrad.addColorStop(0, 'rgba(15, 0, 35, 0.15)')
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, w, h)
    }

    function drawCosmicScene(t, w, h, transition) {
      const cx = w / 2, cy = h * 0.42
      const cursor = cursorRef?.current || { x: 0.5, y: 0.5 }
      const cursorDx = (cursor.x - 0.5) * 30
      const cursorDy = (cursor.y - 0.5) * 20
      const trans = transitionRef?.current || 0

      if (trans <= 0 || trans >= 1) {
        drawBackground(w, h, t)
        drawMegastructures(t)
        drawConstellations(t)
        drawStars(t, cx, cy, cursorDx * 0.3, cursorDy * 0.2)
        const midDx = cursorDx * 0.5, midDy = cursorDy * 0.35
        drawOrbitalFragments(t, cx, cy)
        drawRing(t, cx, cy, s.ringParticles4, 1, 0.4, midDx, midDy, 20, 0.4)
        drawRing(t, cx, cy, s.ringParticles2, 1, 0, midDx, midDy, 10, 0.7)
        drawRing(t, cx, cy, s.ringParticles, 1, 0, midDx, midDy, 0, 1)
        drawRing(t, cx, cy, s.ringParticles3, 1, 0.3, midDx, midDy, -10, 1.2)
        drawEnergyWaves(t, cx, cy)
        drawCore(t, cx, cy, cursorDx, cursorDy)
        drawEnergyParticles(t, cx, cy, midDx, midDy)
        drawCosmicDust(t, cx, cy, cursorDx * 0.8, cursorDy * 0.6)
        drawLightStreaks(t, cx, cy)
        drawForegroundParticles(t, cx, cy)
        drawAtmospherics(w, h, t)
      }
    }

    function drawTransitionScene(t, w, h) {
      const trans = transitionRef?.current || 0
      const cx = w / 2, cy = h * 0.42

      drawBackground(w, h, t)
      drawMegastructures(t)
      drawConstellations(t)

      const expanded = 1 + trans * 8
      const spreadOpacity = Math.max(0, 1 - trans * 1.2)

      const cursor = cursorRef?.current || { x: 0.5, y: 0.5 }
      const cursorDx = (cursor.x - 0.5) * 30 * expanded
      const cursorDy = (cursor.y - 0.5) * 20 * expanded

      drawStars(t, cx, cy, cursorDx * 0.3, cursorDy * 0.2)

      if (spreadOpacity > 0) {
        drawOrbitalFragments(t, cx, cy)
        drawEnergyParticles(t, cx, cy, cursorDx * 0.5 * expanded, cursorDy * 0.35 * expanded)
        drawCosmicDust(t, cx, cy, cursorDx * 0.8, cursorDy * 0.6)

        const ringScale = 1 + trans * 5
        drawRing(t, cx, cy, s.ringParticles4, ringScale * 1.3, 0.4, cursorDx * 0.04 * expanded, cursorDy * 0.04 * expanded, 20, 0.4)
        drawRing(t, cx, cy, s.ringParticles2, ringScale, 0, cursorDx * 0.04 * expanded, cursorDy * 0.04 * expanded, 10, 0.7)
        drawRing(t, cx, cy, s.ringParticles, ringScale * 1.15, 0, cursorDx * 0.04 * expanded, cursorDy * 0.04 * expanded, 0, 1)
        drawRing(t, cx, cy, s.ringParticles3, ringScale * 1.4, 0.3, cursorDx * 0.04 * expanded, cursorDy * 0.04 * expanded, -10, 1.2)
        drawEnergyWaves(t, cx, cy)

        const glowScale = 1 + trans * 5
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * glowScale)
        coreGlow.addColorStop(0, `hsla(260, 80%, 70%, ${0.04 * spreadOpacity})`)
        coreGlow.addColorStop(1, 'hsla(260, 80%, 40%, 0)')
        ctx.fillStyle = coreGlow
        ctx.fillRect(cx - 180 * glowScale, cy - 180 * glowScale, 360 * glowScale, 360 * glowScale)
      }

      if (trans > 0.3) {
        const flashAlpha = Math.min(1, (trans - 0.3) / 0.3) * (1 - Math.min(1, (trans - 0.3) / 0.4))
        ctx.fillStyle = `rgba(180, 150, 255, ${flashAlpha * 0.15})`
        ctx.fillRect(0, 0, w, h)
      }

      drawForegroundParticles(t, cx, cy)
      drawAtmospherics(w, h, t)
    }

    function drawLanding(t, w, h) {
      const trans = transitionRef?.current || 0
      if (trans > 0 && trans < 1) {
        drawTransitionScene(t, w, h)
      } else {
        drawCosmicScene(t, w, h, trans)
      }
    }

    function drawGenerating() {
      ctx.fillStyle = 'rgba(0,0,2,0.12)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      s.time += 0.005
      if (s.genPhase < 1) s.genPhase = Math.min(1, s.genPhase + 0.004)
      const progress = s.genPhase
      const ps = s.genParticles || []
      const cc = s.clusterCenters || []
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const ease = 1 - Math.pow(1 - progress * p.speed * 12, 3)
        p.x += (p.targetX - p.x) * ease * 0.04
        p.y += (p.targetY - p.y) * ease * 0.04
        p.opacity = Math.min(0.8, progress * 2 - 0.2 + Math.sin(s.time + p.offset) * 0.15)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 60%, 60%, ${Math.max(0, p.opacity)})`
        ctx.fill()
      }
      if (progress > 0.4) {
        for (let i = 0; i < cc.length; i++) {
          for (let j = i + 1; j < cc.length; j++) {
            ctx.beginPath()
            ctx.moveTo(cc[i].x, cc[i].y)
            ctx.lineTo(cc[j].x, cc[j].y)
            const alpha = (progress - 0.4) * 0.5 * (0.5 + 0.5 * Math.sin(s.time * 2 + i + j))
            ctx.strokeStyle = `hsla(260, 40%, 50%, ${Math.min(0.15, alpha)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      if (progress > 0.5) {
        for (let i = 0; i < cc.length; i++) {
          const c = cc[i]
          const pulse = 0.6 + 0.4 * Math.sin(s.time * 3 + c.pulsePhase)
          const r = c.size * 2.5 * pulse
          const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r)
          grad.addColorStop(0, `hsla(260, 80%, 60%, ${0.15 * (progress - 0.5) * 2})`)
          grad.addColorStop(1, 'hsla(260, 80%, 60%, 0)')
          ctx.beginPath()
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
          ctx.beginPath()
          ctx.arc(c.x, c.y, c.size * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(260, 70%, 70%, ${0.3 * (progress - 0.5) * 2})`
          ctx.fill()
        }
      }
    }

    function animate() {
      const curPhase = stateRef.current.phase
      const w = canvas.width, h = canvas.height
      s.time += 0.004

      if (curPhase === PHASES.LANDING || curPhase === PHASES.UPLOAD) {
        drawLanding(s.time, w, h)
      } else if (curPhase === PHASES.GENERATING || curPhase === PHASES.COMPLETE) {
        if (!s.genParticles) ensureGenerationParticles()
        drawGenerating()
      }
      animId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [cursorRef, transitionRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}

function cosmicGlow(color, size) {
  return {
    boxShadow: `0 0 ${size * 0.3}px ${color}, 0 0 ${size * 0.8}px ${color}, 0 0 ${size * 1.5}px ${color}`,
  }
}

function LandingPhase({ onBegin, cursorRef }) {
  const [show, setShow] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [subtextVisible, setSubtextVisible] = useState(false)
  const [buttonVisible, setButtonVisible] = useState(false)
  const [panelsVisible, setPanelsVisible] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const btnRef = useRef(null)

  useEffect(() => {
    setShow(true)
    const t1 = setTimeout(() => setTaglineVisible(true), 900)
    const t2 = setTimeout(() => setSubtextVisible(true), 1500)
    const t3 = setTimeout(() => setButtonVisible(true), 2200)
    const t4 = setTimeout(() => setPanelsVisible(true), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const cursor = cursorRef?.current || { x: 0.5, y: 0.5 }
  const btnShiftX = (cursor.x - 0.5) * 6
  const btnShiftY = (cursor.y - 0.5) * 4

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: show ? 1 : 0, transition: 'opacity 2s ease',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 35%, rgba(20,0,40,0.35) 0%, rgba(0,0,8,0.5) 50%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 80%, rgba(10,0,25,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: `translate(${(cursor.x - 0.5) * -8}px, ${(cursor.y - 0.5) * -5}px)`,
        transition: 'transform 0.15s ease-out',
      }}>
        <div style={{
          fontSize: 88, fontWeight: 100, letterSpacing: '36px',
          fontFamily: "'SF Mono','Menlo',monospace",
          opacity: show ? 1 : 0,
          transition: 'opacity 2.2s ease, transform 2s ease',
          transform: show ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.92)',
          textShadow: '0 0 60px rgba(140,100,255,0.25), 0 0 120px rgba(140,100,255,0.1), 0 0 240px rgba(140,100,255,0.04)',
        }}>
          <span style={{
            background: 'linear-gradient(180deg, rgba(220,200,255,0.95) 0%, rgba(160,130,255,0.7) 40%, rgba(120,80,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontWeight: 100,
          }}>
            ORYN
          </span>
        </div>

        <div style={{
          width: 120, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(140,100,255,0.3), transparent)',
          marginTop: 8, opacity: show ? 1 : 0, transition: 'opacity 1.5s ease 0.4s',
        }} />

        <div style={{
          marginTop: 28, fontSize: 14, letterSpacing: '8px',
          fontFamily: "'SF Mono','Menlo',monospace",
          fontWeight: 300, textTransform: 'uppercase',
          color: 'rgba(200, 180, 255, 0.4)',
          opacity: taglineVisible ? 1 : 0,
          transition: 'opacity 1.4s ease, transform 1.4s ease',
          transform: taglineVisible ? 'translateY(0)' : 'translateY(12px)',
          textShadow: '0 0 30px rgba(140,100,255,0.12)',
        }}>
          Awaken Your Digital Cosmos
        </div>

        <div style={{
          marginTop: 10, fontSize: 11, letterSpacing: '4px',
          fontFamily: "'SF Mono','Menlo',monospace",
          fontWeight: 300, textTransform: 'uppercase',
          color: 'rgba(200, 180, 255, 0.18)',
          opacity: subtextVisible ? 1 : 0,
          transition: 'opacity 1.2s ease, transform 1.2s ease',
          transform: subtextVisible ? 'translateY(0)' : 'translateY(8px)',
        }}>
          A Cinematic Universe Built From Your Files
        </div>

        <button
          ref={btnRef}
          onClick={onBegin}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            marginTop: 56, padding: '16px 52px',
            background: btnHover ? 'rgba(120,80,255,0.06)' : 'transparent',
            border: `1px solid ${btnHover ? 'rgba(180,150,255,0.5)' : 'rgba(140,100,255,0.2)'}`,
            borderRadius: 3,
            color: btnHover ? 'rgba(220, 200, 255, 0.85)' : 'rgba(180, 150, 255, 0.45)',
            fontSize: 12, letterSpacing: '8px',
            fontFamily: "'SF Mono','Menlo',monospace",
            cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? `translateY(0) translate(${btnShiftX}px, ${btnShiftY}px)` : 'translateY(24px)',
            position: 'relative', overflow: 'hidden',
            outline: 'none',
            boxShadow: btnHover
              ? '0 0 40px rgba(140,100,255,0.12), 0 0 80px rgba(140,100,255,0.06), inset 0 0 40px rgba(140,100,255,0.03)'
              : '0 0 20px rgba(140,100,255,0.04), inset 0 0 20px rgba(140,100,255,0.01)',
          }}
        >
          {btnHover && (
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '300%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(180,150,255,0.04), transparent)',
              animation: 'btn-shimmer 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>INITIALIZE</span>
          <div style={{
            position: 'absolute', top: -1, left: -1, right: -1, bottom: -1,
            borderRadius: 3, pointerEvents: 'none',
            opacity: btnHover ? 0.15 : 0,
            transition: 'opacity 0.5s ease',
            boxShadow: '0 0 60px rgba(140,100,255,0.3), inset 0 0 60px rgba(140,100,255,0.06)',
          }} />
        </button>
      </div>

      <div style={{
        position: 'absolute', top: 0, right: 36, height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 32, opacity: panelsVisible ? 1 : 0,
        transition: 'opacity 1.8s ease, transform 1.5s ease',
        transform: panelsVisible ? 'translateX(0)' : 'translateX(10px)',
        pointerEvents: 'none',
      }}>
        {[
          { label: 'SYSTEM', value: 'ONLINE', hue: 120 },
          { label: 'NEURAL LINK', value: 'ACTIVE', hue: 260 },
          { label: 'COSMOS', value: 'INITIALIZED', hue: 260 },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            gap: 2,
          }}>
            <div style={{
              fontSize: 7, letterSpacing: '3px', color: `hsla(${item.hue}, 50%, 60%, 0.15)`,
              fontFamily: "'SF Mono','Menlo',monospace", textTransform: 'uppercase',
            }}>
              {item.label}
            </div>
            <div style={{
              fontSize: 9, letterSpacing: '4px',
              color: `hsla(${item.hue}, 50%, 70%, 0.25)`,
              fontFamily: "'SF Mono','Menlo',monospace", textTransform: 'uppercase',
              textShadow: `0 0 12px hsla(${item.hue}, 50%, 70%, 0.08)`,
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 36, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: panelsVisible ? 1 : 0,
        transition: 'opacity 1.8s ease 0.3s',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 8, letterSpacing: '3px',
          color: 'rgba(140,100,255,0.1)',
          fontFamily: "'SF Mono','Menlo',monospace",
        }}>
          v1.0 // COSMIC INTELLIGENCE SYSTEM
        </div>
      </div>
    </div>
  )
}

function UploadPhase({ files, onFilesChange, onGenerate, onEditClusters }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [appear, setAppear] = useState(false)
  const [ringPhase, setRingPhase] = useState(0)
  const [glowIntensity, setGlowIntensity] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAppear(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!appear) return
    let frame
    function animate() { setRingPhase(t => t + 0.008); frame = requestAnimationFrame(animate) }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [appear])

  useEffect(() => {
    const target = dragOver ? 1 : 0
    let frame
    function animate() {
      setGlowIntensity(p => {
        const next = p + (target - p) * 0.08
        if (Math.abs(next - target) < 0.001) return target
        return next
      })
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [dragOver])

  function handleFileList(fileList) {
    const arr = Array.from(fileList).filter(f => f.size <= MAX_FILE_SIZE)
    onFilesChange(arr)
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileList(files)
    } else if (e.dataTransfer.items) {
      const entries = []
      for (const item of e.dataTransfer.items) {
        if (item.webkitGetAsEntry) entries.push(item.webkitGetAsEntry())
      }
      if (entries.length > 0) {
        const collected = await traverseEntries(entries)
        if (collected.length > 0) onFilesChange(collected)
      }
    }
  }

  async function traverseEntries(entries) {
    const result = []
    async function walk(entry) {
      if (entry.isFile) {
        const f = await new Promise((resolve) => entry.file(resolve))
        result.push(f)
      } else if (entry.isDirectory) {
        const reader = entry.createReader()
        const kids = await new Promise((resolve) => reader.readEntries(resolve))
        for (const kid of kids) await walk(kid)
      }
    }
    for (const e of entries) await walk(e)
    return result
  }

  function handleChange(e) {
    if (e.target.files) handleFileList(e.target.files)
  }

  const fileCount = files.length
  const clusterCount = (() => {
    if (files.length === 0) return 0
    const dirs = new Set()
    for (const f of files) {
      const path = f.webkitRelativePath || f.name
      const parts = path.split('/')
      if (parts.length > 1) dirs.add(parts[0])
    }
    return dirs.size || 1
  })()

  const g = glowIntensity

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: appear ? 1 : 0, transition: 'opacity 1s ease',
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '6px', color: 'rgba(180,150,255,0.25)',
        fontFamily: "'SF Mono','Menlo',monospace", marginBottom: 48, textTransform: 'uppercase',
        opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease 0.2s',
        textShadow: g > 0.01 ? `0 0 ${20 * g}px rgba(120,80,255,0.15)` : 'none',
      }}>
        Upload Your Digital Universe
      </div>

      <div style={{ position: 'relative', width: '60%', maxWidth: 640, minHeight: 320 }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 340, height: 340,
          marginTop: -170, marginLeft: -170,
          borderRadius: '50%',
          border: '1px solid rgba(120,80,255,0.04)',
          transform: `rotate(${ringPhase * 60}deg) scale(${1 + g * 0.05})`,
          opacity: 0.3 + g * 0.4,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 2, height: 2, borderRadius: '50%',
              background: `rgba(180,150,255,${0.15 + g * 0.3})`,
              transform: `rotate(${i * 120}deg) translateX(168px)`,
              boxShadow: g > 0.1 ? `0 0 ${6 * g}px rgba(180,150,255,${0.3 * g})` : 'none',
            }} />
          ))}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', minHeight: 320,
            border: `1px solid ${dragOver ? 'rgba(180,150,255,0.5)' : 'rgba(120,80,255,0.15)'}`,
            borderRadius: 8,
            background: dragOver
              ? 'rgba(120,80,255,0.08)'
              : 'rgba(2,6,18,0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
            transition: 'all 0.4s ease',
            opacity: appear ? 1 : 0,
            boxShadow: dragOver
              ? '0 0 80px rgba(120,80,255,0.15), inset 0 0 80px rgba(120,80,255,0.04)'
              : `0 0 ${20 + g * 60}px rgba(120,80,255,${0.03 + g * 0.1}), inset 0 0 ${20 + g * 40}px rgba(120,80,255,${0.01 + g * 0.04})`,
            outline: dragOver ? '1px solid rgba(120,80,255,0.2)' : 'none',
            outlineOffset: dragOver ? 2 : 0,
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `1px solid rgba(120,80,255,${0.2 + g * 0.3})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, position: 'relative',
            transition: 'all 0.4s ease',
            transform: `scale(${1 + g * 0.08})`,
            ...(dragOver ? cosmicGlow('rgba(120,80,255,0.4)', 72) : g > 0.01 ? cosmicGlow(`rgba(120,80,255,${0.15 * g})`, 72) : {}),
          }}>
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: `1px solid rgba(120,80,255,${0.05 * g})`,
              opacity: g,
            }} />
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={`rgba(180,150,255,${0.4 + g * 0.3})`} strokeWidth="1.2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <div style={{
            fontSize: 12, letterSpacing: '3px',
            color: `rgba(180,150,255,${0.3 + g * 0.3})`,
            fontFamily: "'SF Mono','Menlo',monospace",
            marginBottom: 8,
            textShadow: g > 0.1 ? `0 0 ${10 * g}px rgba(120,80,255,${0.2 * g})` : 'none',
          }}>
            {dragOver ? 'RELEASE TO UPLOAD' : 'DROP FOLDERS HERE'}
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '2px',
            color: `rgba(120,80,255,${0.15 + g * 0.15})`,
            fontFamily: "'SF Mono','Menlo',monospace",
          }}>
            or click to browse
          </div>
          <input
            ref={inputRef}
            type="file"
            webkitdirectory="true"
            multiple
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </div>

        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute',
            [i === 0 ? 'top' : i === 1 ? 'top' : i === 2 ? 'bottom' : 'bottom']: -1,
            [i === 0 ? 'left' : i === 1 ? 'right' : i === 2 ? 'left' : 'right']: -1,
            width: 20, height: 20,
            borderTop: i < 2 ? `1px solid rgba(120,80,255,${0.1 + g * 0.2})` : 'none',
            borderLeft: i % 2 === 0 ? `1px solid rgba(120,80,255,${0.1 + g * 0.2})` : 'none',
            borderRight: i % 2 === 1 ? `1px solid rgba(120,80,255,${0.1 + g * 0.2})` : 'none',
            borderBottom: i >= 2 ? `1px solid rgba(120,80,255,${0.1 + g * 0.2})` : 'none',
            opacity: 0.5 + g * 0.5,
            pointerEvents: 'none',
            transition: 'opacity 0.3s',
          }} />
        ))}
      </div>

      {fileCount > 0 && (
        <div style={{
          marginTop: 40, textAlign: 'center',
          opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease',
        }}>
          <div style={{
            fontSize: 32, fontWeight: 100,
            color: 'rgba(180,150,255,0.7)',
            fontFamily: "'SF Mono','Menlo',monospace",
            letterSpacing: '2px',
            textShadow: '0 0 30px rgba(120,80,255,0.1)',
          }}>
            {fileCount}
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '3px',
            color: 'rgba(120,80,255,0.25)',
            fontFamily: "'SF Mono','Menlo',monospace",
            marginTop: 4, textTransform: 'uppercase',
          }}>
            Files Detected
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '2px',
            color: 'rgba(120,80,255,0.15)',
            fontFamily: "'SF Mono','Menlo',monospace",
            marginTop: 2,
          }}>
            {clusterCount} Galactic {clusterCount === 1 ? 'Cluster' : 'Clusters'} Forming
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center' }}>
            <button
              onClick={onEditClusters}
              style={{
                padding: '12px 28px',
                background: 'transparent',
                border: '1px solid rgba(120,80,255,0.2)',
                borderRadius: 4,
                color: 'rgba(180,150,255,0.4)',
                fontSize: 10, letterSpacing: '4px',
                fontFamily: "'SF Mono','Menlo',monospace",
                cursor: 'pointer', textTransform: 'uppercase',
                transition: 'all 0.4s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(120,80,255,0.5)'
                e.currentTarget.style.color = 'rgba(200,180,255,0.7)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(120,80,255,0.1), inset 0 0 30px rgba(120,80,255,0.03)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(120,80,255,0.2)'
                e.currentTarget.style.color = 'rgba(180,150,255,0.4)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              EDIT CLUSTERS
            </button>
            <button
              onClick={onGenerate}
              style={{
                padding: '12px 40px',
                background: 'transparent',
                border: '1px solid rgba(120,80,255,0.3)',
                borderRadius: 4,
                color: 'rgba(180,150,255,0.5)',
                fontSize: 11, letterSpacing: '5px',
                fontFamily: "'SF Mono','Menlo',monospace",
                cursor: 'pointer', textTransform: 'uppercase',
                transition: 'all 0.4s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(120,80,255,0.5)'
                e.currentTarget.style.color = 'rgba(200,180,255,0.8)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(120,80,255,0.15), inset 0 0 30px rgba(120,80,255,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(120,80,255,0.3)'
                e.currentTarget.style.color = 'rgba(180,150,255,0.5)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              GENERATE UNIVERSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GenerationPhase({ progress, stageLabels }) {
  const [appear, setAppear] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAppear(true), 200)
    return () => clearTimeout(t)
  }, [])

  const stage = progress < 0.3 ? 0 : progress < 0.6 ? 1 : progress < 0.85 ? 2 : 3

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease',
    }}>
      <div style={{
        fontSize: 13, letterSpacing: '8px',
        color: 'rgba(180,150,255,0.35)',
        fontFamily: "'SF Mono','Menlo',monospace",
        textTransform: 'uppercase',
        transition: 'opacity 0.6s ease',
        textShadow: '0 0 30px rgba(120,80,255,0.15)',
      }}>
        {stageLabels[stage]}
      </div>

      <div style={{
        marginTop: 48, width: 240, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.2), transparent)',
        position: 'relative',
        borderRadius: 1,
      }}>
        <div style={{
          position: 'absolute', top: -1, left: 0, height: 4,
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, rgba(120,80,255,0.2), rgba(180,150,255,0.6))`,
          borderRadius: 2,
          transition: 'width 0.3s ease',
          boxShadow: '0 0 16px rgba(120,80,255,0.3)',
        }} />
        {[0.25, 0.5, 0.75].map(p => (
          <div key={p} style={{
            position: 'absolute', top: -2, left: `${p * 100}%`,
            width: 6, height: 6, borderRadius: '50%',
            background: progress >= p ? 'rgba(180,150,255,0.5)' : 'rgba(120,80,255,0.08)',
            boxShadow: progress >= p ? '0 0 10px rgba(180,150,255,0.3)' : 'none',
            transition: 'all 0.4s ease',
            transform: 'translateX(-50%)',
          }} />
        ))}
      </div>

      <div style={{
        marginTop: 24, fontSize: 28, fontWeight: 100,
        color: 'rgba(180,150,255,0.4)',
        fontFamily: "'SF Mono','Menlo',monospace",
        letterSpacing: '4px',
        textShadow: '0 0 20px rgba(120,80,255,0.1)',
      }}>
        {Math.round(progress * 100)}%
      </div>

      <div style={{
        marginTop: 80, width: 180, height: 180,
        position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {[0, 1, 2].map(ring => (
          <div key={ring} style={{
            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            border: '1px solid rgba(120,80,255,0.06)',
            transform: `rotate(${progress * 360 * (ring + 1)}deg)`,
            transition: 'transform 0.5s ease',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 2, height: 2, borderRadius: '50%',
                background: 'rgba(180,150,255,0.2)',
                transform: `rotate(${i * 120}deg) translateX(${86 - ring * 6}px)`,
                opacity: 0.2 + 0.8 * Math.max(0, Math.sin(progress * Math.PI * 2 - i * 2 - ring)),
              }} />
            ))}
          </div>
        ))}
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'rgba(180,150,255,0.2)',
          boxShadow: '0 0 30px rgba(120,80,255,0.15), 0 0 60px rgba(120,80,255,0.05)',
          transition: 'all 0.5s ease',
          transform: `scale(${0.5 + progress * 0.5})`,
        }} />
      </div>
    </div>
  )
}

function ClusterEditPhase({ files, onBack, onGenerate }) {
  const [appear, setAppear] = useState(false)
  const [editingCluster, setEditingCluster] = useState(null)
  const [editingFile, setEditingFile] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [expandedClusters, setExpandedClusters] = useState({})
  const [clusterData, setClusterData] = useState(() => {
    const { clusterMap, clusterFiles } = organizeFilesIntoClusters(files)
    return { clusterMap, clusterFiles }
  })
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setAppear(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (editingCluster !== null || editingFile !== null) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editingCluster, editingFile])

  function toggleExpand(id) {
    setExpandedClusters(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function startEditCluster(id, name) {
    setEditingCluster(id)
    setEditingFile(null)
    setEditValue(name)
  }

  function startEditFile(clusterId, fileIdx, name) {
    setEditingFile({ clusterId, fileIdx })
    setEditingCluster(null)
    setEditValue(name)
  }

  function confirmEdit() {
    if (editingCluster !== null) {
      setClusterData(prev => {
        const updated = { ...prev }
        updated.clusterMap = { ...updated.clusterMap }
        updated.clusterMap[editingCluster] = { ...updated.clusterMap[editingCluster], name: editValue.toUpperCase() }
        return updated
      })
    } else if (editingFile !== null) {
      setClusterData(prev => {
        const updated = { ...prev }
        const { clusterId, fileIdx } = editingFile
        updated.clusterFiles = { ...updated.clusterFiles }
        updated.clusterFiles[clusterId] = [...updated.clusterFiles[clusterId]]
        updated.clusterFiles[clusterId][fileIdx] = { ...updated.clusterFiles[clusterId][fileIdx], name: editValue }
        return updated
      })
    }
    setEditingCluster(null)
    setEditingFile(null)
    setEditValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') { setEditingCluster(null); setEditingFile(null); setEditValue('') }
  }

  function handleGenerate() {
    const { clusterMap, clusterFiles } = clusterData
    onGenerate(clusterMap, clusterFiles)
  }

  const entries = Object.entries(clusterData.clusterMap || {})

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease',
      paddingTop: '5vh',
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '6px', color: 'rgba(180,150,255,0.25)',
        fontFamily: "'SF Mono','Menlo',monospace", marginBottom: 32, textTransform: 'uppercase',
      }}>
        Configure Clusters
      </div>

      <div style={{
        width: '70%', maxWidth: 720, maxHeight: '60vh',
        overflow: 'auto',
        background: 'rgba(2,6,18,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(120,80,255,0.08)',
        borderRadius: 8,
        padding: 0,
      }}>
        {entries.map(([id, c]) => {
          const hex = `rgb(${c.color.r * 255 | 0},${c.color.g * 255 | 0},${c.color.b * 255 | 0})`
          const isExpanded = expandedClusters[id]
          const clusterFilesData = clusterData.clusterFiles[id] || []
          return (
            <div key={id} style={{
              borderBottom: '1px solid rgba(120,80,255,0.04)',
            }}>
              <div
                onClick={() => toggleExpand(id)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px 16px',
                  cursor: 'pointer', transition: 'background 0.2s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(120,80,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: hex, boxShadow: `0 0 8px ${hex}`, marginRight: 12, flexShrink: 0 }} />
                {editingCluster === Number(id) ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={confirmEdit}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'rgba(120,80,255,0.08)',
                      border: '1px solid rgba(120,80,255,0.3)',
                      borderRadius: 3, padding: '2px 8px',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 12, fontFamily: "'SF Mono','Menlo',monospace",
                      letterSpacing: '2px', fontWeight: 300,
                      outline: 'none', width: 200,
                    }}
                  />
                ) : (
                  <span
                    onClick={e => { e.stopPropagation(); startEditCluster(Number(id), c.name) }}
                    style={{
                      fontSize: 12, letterSpacing: '2px',
                      color: 'rgba(255,255,255,0.65)',
                      fontFamily: "'SF Mono','Menlo',monospace",
                      fontWeight: 300,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.target.style.color = 'rgba(180,150,255,0.9)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
                  >
                    ◆ {c.name}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: "'SF Mono','Menlo',monospace" }}>
                  {c.fileCount} {c.fileCount === 1 ? 'file' : 'files'} {isExpanded ? '▾' : '▸'}
                </span>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 16px 8px 34px' }}>
                  {clusterFilesData.length === 0 ? (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', fontStyle: 'italic', padding: '4px 0' }}>
                      no files
                    </div>
                  ) : clusterFilesData.map((f, fi) => (
                    <div key={fi} style={{
                      display: 'flex', alignItems: 'center', padding: '3px 0',
                    }}>
                      <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginRight: 8, flexShrink: 0 }} />
                      {editingFile?.clusterId === Number(id) && editingFile?.fileIdx === fi ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={confirmEdit}
                          onClick={e => e.stopPropagation()}
                          style={{
                            background: 'rgba(120,80,255,0.06)',
                            border: '1px solid rgba(120,80,255,0.2)',
                            borderRadius: 3, padding: '1px 6px',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 10, fontFamily: "'SF Mono','Menlo',monospace",
                            outline: 'none', width: 240,
                          }}
                        />
                      ) : (
                        <span
                          onClick={e => { e.stopPropagation(); startEditFile(Number(id), fi, f.name) }}
                          style={{
                            fontSize: 10, color: 'rgba(255,255,255,0.35)',
                            fontFamily: "'SF Mono','Menlo',monospace",
                            cursor: 'pointer', transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => e.target.style.color = 'rgba(180,150,255,0.6)'}
                          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                        >
                          {f.name}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(255,255,255,0.12)' }}>
                        {f.sizeFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button
          onClick={onBack}
          style={{
            padding: '12px 28px',
            background: 'transparent',
            border: '1px solid rgba(120,80,255,0.15)',
            borderRadius: 4,
            color: 'rgba(180,150,255,0.35)',
            fontSize: 10, letterSpacing: '4px',
            fontFamily: "'SF Mono','Menlo',monospace",
            cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.4s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(120,80,255,0.4)'
            e.currentTarget.style.color = 'rgba(200,180,255,0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(120,80,255,0.15)'
            e.currentTarget.style.color = 'rgba(180,150,255,0.35)'
          }}
        >
          ← BACK
        </button>
        <button
          onClick={handleGenerate}
          style={{
            padding: '12px 40px',
            background: 'transparent',
            border: '1px solid rgba(120,80,255,0.3)',
            borderRadius: 4,
            color: 'rgba(180,150,255,0.5)',
            fontSize: 11, letterSpacing: '5px',
            fontFamily: "'SF Mono','Menlo',monospace",
            cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.4s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(120,80,255,0.5)'
            e.currentTarget.style.color = 'rgba(200,180,255,0.8)'
            e.currentTarget.style.boxShadow = '0 0 30px rgba(120,80,255,0.15), inset 0 0 30px rgba(120,80,255,0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(120,80,255,0.3)'
            e.currentTarget.style.color = 'rgba(180,150,255,0.5)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          GENERATE UNIVERSE
        </button>
      </div>
    </div>
  )
}

const STAGE_LABELS = ['FORMING STARDUST', 'WEAVING GALAXIES', 'CONNECTING NEURAL PATHS', 'UNIVERSE MATERIALIZING']

export default function InitFlow() {
  const [phase, setPhase] = useState(PHASES.LANDING)
  const [files, setFiles] = useState([])
  const [genProgress, setGenProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [customClusterData, setCustomClusterData] = useState(null)
  const [transitionActive, setTransitionActive] = useState(false)
  const completedRef = useRef(false)
  const cursorRef = useRef({ x: 0.5, y: 0.5 })
  const transitionRef = useRef(0)

  const setCustomClusters = useUniverseStore(s => s.setCustomClusters)
  const setInitPhase = useUniverseStore(s => s.setInitPhase)
  const { playUploadTone, playGenerationRise, playCompletionSwirl } = useSoundEffects()

  useEffect(() => {
    clearRegistry()
  }, [])

  useEffect(() => {
    function handleMouseMove(e) {
      cursorRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
    }
    if (phase === PHASES.LANDING) {
      window.addEventListener('mousemove', handleMouseMove)
    }
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [phase])

  useEffect(() => {
    if (!transitionActive) return
    let frame
    function animate() {
      const val = transitionRef.current + 0.008
      if (val >= 1) {
        transitionRef.current = 1
        setTransitionActive(false)
        setPhase(PHASES.UPLOAD)
        return
      }
      transitionRef.current = val
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [transitionActive])

  useEffect(() => {
    if (phase === PHASES.GENERATING) {
      playGenerationRise()
      let progress = 0
      const duration = 3500
      const step = 50
      const interval = setInterval(() => {
        progress += step / duration
        if (progress >= 1) {
          progress = 1
          clearInterval(interval)
          playCompletionSwirl()
          setTimeout(() => {
            setPhase(PHASES.COMPLETE)
          }, 500)
        }
        setGenProgress(progress)
      }, step)
      return () => clearInterval(interval)
    }
  }, [phase, playGenerationRise, playCompletionSwirl])

  useEffect(() => {
    if (phase === PHASES.COMPLETE && !completedRef.current) {
      completedRef.current = true
      setFadeOut(true)
      const data = customClusterData || organizeFilesIntoClusters(files)
      setTimeout(() => {
        setCustomClusters(data.clusterMap, data.clusterFiles)
        setInitPhase(false)
        const audio = new (window.AudioContext || window.webkitAudioContext)()
      }, 1200)
    }
  }, [phase, files, setCustomClusters, setInitPhase, customClusterData])

  function handleFiles(f) {
    setFiles((prev) => {
      const existing = new Set(prev.map((x) => x.webkitRelativePath || x.name))
      const merged = [...prev]
      for (const file of f) {
        const key = file.webkitRelativePath || file.name
        if (!existing.has(key)) {
          existing.add(key)
          merged.push(file)
        }
      }
      return merged
    })
    playUploadTone()
  }

  function handleEditClusters() {
    setPhase(PHASES.CLUSTER_EDIT)
  }

  function handleClusterEditGenerate(clusterMap, clusterFiles) {
    setCustomClusterData({ clusterMap, clusterFiles })
    setPhase(PHASES.GENERATING)
  }

  function handleInitialize() {
    if (transitionActive) return
    setTransitionActive(true)
  }

  const isLandingOrTransition = phase === PHASES.LANDING || (phase === PHASES.UPLOAD && transitionRef.current < 1)

  return (
    <>
      <ParticleCanvas phase={phase} generationProgress={genProgress} cursorRef={cursorRef} transitionRef={transitionRef} />
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 5, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 20,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 2s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}>
        {isLandingOrTransition && <LandingPhase onBegin={handleInitialize} cursorRef={cursorRef} />}
        {phase === PHASES.UPLOAD && !transitionActive && (
          <UploadPhase
            files={files}
            onFilesChange={handleFiles}
            onGenerate={() => setPhase(PHASES.GENERATING)}
            onEditClusters={handleEditClusters}
          />
        )}
        {phase === PHASES.CLUSTER_EDIT && (
          <ClusterEditPhase
            files={files}
            onBack={() => setPhase(PHASES.UPLOAD)}
            onGenerate={handleClusterEditGenerate}
          />
        )}
        {phase === PHASES.GENERATING && <GenerationPhase progress={genProgress} stageLabels={STAGE_LABELS} />}
      </div>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes btn-shimmer {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(33.33%); }
        }
      `}</style>
    </>
  )
}
