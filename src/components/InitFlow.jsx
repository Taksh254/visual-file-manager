import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const PHASES = { LANDING: 0, UPLOAD: 1, GENERATING: 2, COMPLETE: 3 }

const CLUSTER_COLORS = [
  { r: 0.6, g: 0.2, b: 1.0 }, { r: 0.0, g: 0.8, b: 1.0 }, { r: 0.0, g: 1.0, b: 0.6 },
  { r: 1.0, g: 0.6, b: 0.0 }, { r: 0.8, g: 0.0, b: 0.8 }, { r: 1.0, g: 0.2, b: 0.4 },
  { r: 0.2, g: 0.6, b: 1.0 }, { r: 0.5, g: 1.0, b: 0.5 }, { r: 1.0, g: 0.4, b: 0.2 },
  { r: 0.4, g: 0.2, b: 1.0 }, { r: 0.0, g: 0.9, b: 0.8 }, { r: 0.9, g: 0.1, b: 0.6 },
]

const PARTICLE_COUNT = 250
const MAX_FILE_SIZE = 1024 * 1024 * 50

function organizeFilesIntoClusters(files) {
  const dirMap = {}
  const rootFiles = []

  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const parts = path.split('/')
    const dir = parts.length > 1 ? parts[0] : null

    if (dir) {
      if (!dirMap[dir]) {
        dirMap[dir] = { name: dir, files: [] }
      }
      dirMap[dir].files.push({
        name: parts.slice(1).join('/') || file.name,
        path,
        size: file.size,
        sizeFormatted: file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : file.size > 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${file.size} B`,
        isDirectory: false,
        ext: file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '',
        modified: new Date(file.lastModified).toISOString(),
      })
    } else {
      rootFiles.push({
        name: file.name,
        path: file.name,
        size: file.size,
        sizeFormatted: file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : file.size > 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${file.size} B`,
        isDirectory: false,
        ext: file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '',
        modified: new Date(file.lastModified).toISOString(),
      })
    }
  }

  const clusterMap = {}
  const entries = Object.entries(dirMap)
  const total = entries.length + (rootFiles.length > 0 ? 1 : 0)

  let idx = 0
  for (const [dirName, data] of entries) {
    const angle = (idx / total) * Math.PI * 2 + 0.2
    const t = total > 1 ? idx / (total - 1) : 0.5
    const radiusVar = 3.0 + t * 1.2
    const yOffset = Math.sin(t * Math.PI * 2) * 0.5
    clusterMap[idx] = {
      id: idx,
      name: dirName.toUpperCase(),
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      dir: `/${dirName}`,
      fileCount: data.files.length,
      position: new Float32Array([
        Math.cos(angle) * radiusVar,
        yOffset,
        Math.sin(angle) * radiusVar,
      ]),
    }
    idx++
  }

  if (rootFiles.length > 0) {
    const angle = (idx / total) * Math.PI * 2 + 0.2
    const t = total > 1 ? idx / (total - 1) : 0.5
    const radiusVar = 3.0 + t * 1.2
    const yOffset = Math.sin(t * Math.PI * 2) * 0.5
    clusterMap[idx] = {
      id: idx,
      name: 'ROOT',
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      dir: '/',
      fileCount: rootFiles.length,
      position: new Float32Array([
        Math.cos(angle) * radiusVar,
        yOffset,
        Math.sin(angle) * radiusVar,
      ]),
    }
  }

  const clusterFiles = {}
  idx = 0
  for (const [, data] of entries) {
    clusterFiles[idx] = data.files
    idx++
  }
  if (rootFiles.length > 0) {
    clusterFiles[idx] = rootFiles
  }

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

function ParticleCanvas({ phase, generationProgress }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    phase: PHASES.LANDING, particles: null, genParticles: null,
    clusterCenters: null, genPhase: 0, time: 0, initialized: false,
  })
  const progressRef = useRef(0)

  progressRef.current = generationProgress

  useEffect(() => {
    stateRef.current.phase = phase
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const s = stateRef.current

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    if (!s.initialized) {
      s.initialized = true
      const pcount = PARTICLE_COUNT
      const particles = new Array(pcount)
      for (let i = 0; i < pcount; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 20 + 5
        particles[i] = {
          x: canvas.width / 2 + Math.cos(angle) * radius,
          y: canvas.height / 2 + Math.sin(angle) * radius,
          baseX: canvas.width / 2 + Math.cos(angle) * radius,
          baseY: canvas.height / 2 + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          ph: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.2 + 0.05,
          hue: 240 + Math.random() * 60,
        }
      }
      s.particles = particles
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

    function drawLanding() {
      ctx.fillStyle = 'rgba(0,0,2,0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      s.time += 0.003
      const p = s.particles
      if (!p) return
      const t = s.time
      for (let i = 0; i < p.length; i++) {
        const pt = p[i]
        pt.x += pt.vx + Math.sin(t * pt.speed + pt.ph) * 0.08
        pt.y += pt.vy + Math.cos(t * pt.speed * 0.7 + pt.ph) * 0.08
        const dx = pt.x - pt.baseX
        const dy = pt.y - pt.baseY
        pt.x -= dx * 0.001
        pt.y -= dy * 0.001
        const fade = 0.5 + 0.5 * Math.sin(t * 0.5 + pt.ph)
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${pt.hue}, 60%, 50%, ${pt.opacity * fade})`
        ctx.fill()
      }
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j += 5) {
          const dx = p[i].x - p[j].x
          const dy = p[i].y - p[j].y
          const dist = dx * dx + dy * dy
          if (dist < 6400) {
            ctx.beginPath()
            ctx.moveTo(p[i].x, p[i].y)
            ctx.lineTo(p[j].x, p[j].y)
            ctx.strokeStyle = `hsla(260, 50%, 50%, ${0.04 * (1 - Math.sqrt(dist) / 80)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
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
      if (curPhase === PHASES.LANDING || curPhase === PHASES.UPLOAD) {
        drawLanding()
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
  }, [])

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

function LandingPhase({ onBegin }) {
  const [show, setShow] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [buttonVisible, setButtonVisible] = useState(false)

  useEffect(() => {
    setShow(true)
    const t1 = setTimeout(() => setTaglineVisible(true), 800)
    const t2 = setTimeout(() => setButtonVisible(true), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: show ? 1 : 0, transition: 'opacity 1.4s ease',
      background: 'radial-gradient(ellipse at center, rgba(20,0,40,0.5) 0%, rgba(0,0,5,0.8) 60%, rgba(0,0,0,0.95) 100%)',
    }}>
      <div style={{
        fontSize: 72, fontWeight: 100, letterSpacing: '24px',
        color: 'rgba(180, 150, 255, 0.8)',
        textShadow: '0 0 40px rgba(120,80,255,0.3), 0 0 80px rgba(120,80,255,0.15), 0 0 160px rgba(120,80,255,0.05)',
        fontFamily: "'SF Mono','Menlo',monospace",
        opacity: show ? 1 : 0, transition: 'opacity 1.8s ease, transform 1.8s ease',
        transform: show ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
      }}>
        <span style={{ fontWeight: 200, background: 'linear-gradient(135deg, rgba(180,150,255,0.9), rgba(120,80,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ORYN
        </span>
      </div>
      <div style={{
        width: 80, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.4), transparent)',
        marginTop: 16,
        opacity: show ? 1 : 0, transition: 'opacity 1.2s ease 0.3s',
      }} />
      <div style={{
        marginTop: 24,
        fontSize: 13, letterSpacing: '6px',
        color: 'rgba(180, 150, 255, 0.35)',
        fontFamily: "'SF Mono','Menlo',monospace",
        fontWeight: 300, textTransform: 'uppercase',
        opacity: taglineVisible ? 1 : 0,
        transition: 'opacity 1.2s ease, transform 1.2s ease',
        transform: taglineVisible ? 'translateY(0)' : 'translateY(10px)',
        textShadow: '0 0 20px rgba(120,80,255,0.15)',
      }}>
        AWAKEN YOUR DIGITAL COSMOS
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 11, letterSpacing: '3px',
        color: 'rgba(180, 150, 255, 0.2)',
        fontFamily: "'SF Mono','Menlo',monospace",
        fontWeight: 300, textTransform: 'uppercase',
        opacity: taglineVisible ? 1 : 0,
        transition: 'opacity 1.2s ease 0.2s',
      }}>
        A Cinematic Universe From Your Files
      </div>
      <button
        onClick={onBegin}
        style={{
          marginTop: 60, padding: '14px 48px',
          background: 'transparent',
          border: '1px solid rgba(120,80,255,0.25)',
          borderRadius: 4,
          color: 'rgba(180, 150, 255, 0.5)',
          fontSize: 12, letterSpacing: '6px',
          fontFamily: "'SF Mono','Menlo',monospace",
          cursor: 'pointer', textTransform: 'uppercase',
          transition: 'all 0.6s ease',
          opacity: buttonVisible ? 1 : 0,
          transform: buttonVisible ? 'translateY(0)' : 'translateY(20px)',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(120,80,255,0.5)'
          e.currentTarget.style.color = 'rgba(200, 180, 255, 0.8)'
          e.currentTarget.style.boxShadow = '0 0 30px rgba(120,80,255,0.15), inset 0 0 30px rgba(120,80,255,0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(120,80,255,0.25)'
          e.currentTarget.style.color = 'rgba(180, 150, 255, 0.5)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        INITIALIZE
      </button>
      <div style={{
        position: 'absolute', bottom: 40, fontSize: 9,
        letterSpacing: '2px', color: 'rgba(120,80,255,0.12)',
        fontFamily: "'SF Mono','Menlo',monospace",
        opacity: buttonVisible ? 1 : 0,
        transition: 'opacity 1s ease 1s',
      }}>
        v1.0 // COSMIC INTELLIGENCE SYSTEM
      </div>
    </div>
  )
}

function UploadPhase({ files, onFilesChange, onGenerate }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [appear, setAppear] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAppear(true), 100)
    return () => clearTimeout(t)
  }, [])

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
      }}>
        Upload Your Digital Universe
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '60%', maxWidth: 640, minHeight: 320,
          border: `1px solid ${dragOver ? 'rgba(180,150,255,0.5)' : 'rgba(120,80,255,0.15)'}`,
          borderRadius: 8,
          background: dragOver
            ? 'rgba(120,80,255,0.05)'
            : 'rgba(2,6,18,0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
          transition: 'all 0.4s ease',
          opacity: appear ? 1 : 0,
          boxShadow: dragOver
            ? '0 0 60px rgba(120,80,255,0.1), inset 0 0 60px rgba(120,80,255,0.03)'
            : '0 0 20px rgba(120,80,255,0.03), inset 0 0 20px rgba(120,80,255,0.01)',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '1px solid rgba(120,80,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, position: 'relative',
          transition: 'all 0.4s ease',
          ...(dragOver ? cosmicGlow('rgba(120,80,255,0.3)', 64) : {}),
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(180,150,255,0.4)" strokeWidth="1.2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <div style={{
          fontSize: 12, letterSpacing: '3px',
          color: 'rgba(180,150,255,0.3)',
          fontFamily: "'SF Mono','Menlo',monospace",
          marginBottom: 8,
        }}>
          {dragOver ? 'RELEASE TO UPLOAD' : 'DROP FOLDERS HERE'}
        </div>
        <div style={{
          fontSize: 10, letterSpacing: '2px',
          color: 'rgba(120,80,255,0.15)',
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

      {fileCount > 0 && (
        <div style={{
          marginTop: 40, textAlign: 'center',
          opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 100,
            color: 'rgba(180,150,255,0.6)',
            fontFamily: "'SF Mono','Menlo',monospace",
            letterSpacing: '2px',
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
          <button
            onClick={onGenerate}
            style={{
              marginTop: 32, padding: '12px 40px',
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
      )}
    </div>
  )
}

function GenerationPhase({ progress }) {
  const [appear, setAppear] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAppear(true), 200)
    return () => clearTimeout(t)
  }, [])

  const stage = progress < 0.3 ? 0 : progress < 0.6 ? 1 : progress < 0.85 ? 2 : 3
  const stageLabels = ['FORMING STARDUST', 'WEAVING GALAXIES', 'CONNECTING NEURAL PATHS', 'UNIVERSE MATERIALIZING']

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: appear ? 1 : 0, transition: 'opacity 0.8s ease',
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '6px',
        color: 'rgba(180,150,255,0.15)',
        fontFamily: "'SF Mono','Menlo',monospace",
        textTransform: 'uppercase',
        transition: 'opacity 0.6s ease',
      }}>
        {stageLabels[stage]}
      </div>

      <div style={{
        marginTop: 48, width: 200, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(120,80,255,0.3), transparent)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: -1, left: 0, height: 3,
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, rgba(120,80,255,0.1), rgba(180,150,255,0.4))',
          borderRadius: 2,
          transition: 'width 0.3s ease',
          boxShadow: '0 0 12px rgba(120,80,255,0.2)',
        }} />
      </div>

      <div style={{
        marginTop: 24, fontSize: 24, fontWeight: 100,
        color: 'rgba(180,150,255,0.3)',
        fontFamily: "'SF Mono','Menlo',monospace",
        letterSpacing: '4px',
      }}>
        {Math.round(progress * 100)}%
      </div>

      <div style={{
        marginTop: 80, width: 160, height: 160,
        position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          border: '1px solid rgba(120,80,255,0.06)',
          animation: 'none',
          transform: `rotate(${progress * 360}deg)`,
          transition: 'transform 0.5s ease',
        }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 2, height: 2, borderRadius: '50%',
              background: 'rgba(180,150,255,0.2)',
              transform: `rotate(${i * 90}deg) translateX(78px)`,
              opacity: 0.3 + 0.7 * Math.max(0, Math.sin(progress * Math.PI - i * 1.5)),
            }} />
          ))}
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(180,150,255,0.15)',
          boxShadow: '0 0 20px rgba(120,80,255,0.1), 0 0 40px rgba(120,80,255,0.05)',
          transition: 'all 0.5s ease',
          transform: `scale(${0.5 + progress * 0.5})`,
        }} />
      </div>
    </div>
  )
}

export default function InitFlow({ onComplete }) {
  const [phase, setPhase] = useState(PHASES.LANDING)
  const [files, setFiles] = useState([])
  const [genProgress, setGenProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const completedRef = useRef(false)
  const { playUploadTone, playGenerationRise, playCompletionSwirl } = useSoundEffects()

  useEffect(() => {
    if (phase === PHASES.GENERATING) {
      playGenerationRise()
      let progress = 0
      const duration = 4000
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
      const { clusterMap, clusterFiles } = organizeFilesIntoClusters(files)
      setTimeout(() => {
        onComplete(clusterMap, clusterFiles)
      }, 1200)
    }
  }, [phase, files, onComplete])

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

  return (
    <>
      <ParticleCanvas phase={phase} generationProgress={genProgress} />
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 5, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(20,0,40,0.15) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 20,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1.4s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}>
        {phase === PHASES.LANDING && <LandingPhase onBegin={() => setPhase(PHASES.UPLOAD)} />}
        {phase === PHASES.UPLOAD && (
          <UploadPhase
            files={files}
            onFilesChange={handleFiles}
            onGenerate={() => setPhase(PHASES.GENERATING)}
          />
        )}
        {phase === PHASES.GENERATING && <GenerationPhase progress={genProgress} />}
      </div>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
