import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { minimapSync } from '../systems/MinimapSync'

const SIZE = 200
const WORLD_BOUNDS = 7

const _v3 = new THREE.Vector3()
const _v3b = new THREE.Vector3()
const _q = new THREE.Quaternion()

function createGlowTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.25)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.05)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function createRingTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')
  ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  const g = ctx.createRadialGradient(32, 32, 20, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.7, 'rgba(255,255,255,0)')
  g.addColorStop(0.85, 'rgba(255,255,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function createGridTexture() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(120,80,255,0.06)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4)
  t.needsUpdate = true
  return t
}

const _glowTex = createGlowTexture()
const _ringTex = createRingTexture()
const _gridTex = createGridTexture()

function createNodeMesh(color, r) {
  const g = new THREE.SphereGeometry(r * 0.6, 8, 6)
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color.r, color.g, color.b),
    transparent: true,
    opacity: 0.85,
  })
  const mesh = new THREE.Mesh(g, m)

  const glowG = new THREE.PlaneGeometry(r * 3, r * 3)
  const glowM = new THREE.SpriteMaterial({
    map: _glowTex,
    color: new THREE.Color(color.r, color.g, color.b),
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Sprite(glowM)
  glow.position.z = -0.01

  const group = new THREE.Group()
  group.add(mesh)
  group.add(glow)
  group.userData = { mesh, glow, baseScale: 1 }

  return group
}

function createActiveRing() {
  const g = new THREE.RingGeometry(0.4, 0.55, 32)
  const m = new THREE.MeshBasicMaterial({
    color: 0x8866ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(g, m)

  const glowG = new THREE.PlaneGeometry(1.5, 1.5)
  const glowM = new THREE.SpriteMaterial({
    map: _ringTex,
    color: 0x8866ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Sprite(glowM)

  const group = new THREE.Group()
  group.add(mesh)
  group.add(glow)
  group.userData = { ring: mesh, glow }
  return group
}

function createDirectionIndicator() {
  const g = new THREE.BufferGeometry()
  const vertices = new Float32Array([
    0, 1.5, 0,
    -0.15, 0.6, -0.2,
    0.15, 0.6, -0.2,
    0, 0, 0.4,
  ])
  g.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  g.setIndex([0, 1, 2, 1, 3, 2])
  g.computeVertexNormals()
  const m = new THREE.MeshBasicMaterial({
    color: 0x6644ff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(g, m)

  const lineG = new THREE.BufferGeometry()
  const lineV = new Float32Array([0, 0, 0, 0, 1.8, 0])
  lineG.setAttribute('position', new THREE.BufferAttribute(lineV, 3))
  const lineM = new THREE.LineBasicMaterial({
    color: 0x8866ff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  })
  const line = new THREE.Line(lineG, lineM)

  const group = new THREE.Group()
  group.add(mesh)
  group.add(line)
  group.userData = { mesh, line }
  return group
}

function createConnectionLine() {
  const g = new THREE.BufferGeometry()
  const positions = new Float32Array(6)
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const m = new THREE.LineBasicMaterial({
    color: 0x6644ff,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  })
  return new THREE.Line(g, m)
}

function createCameraDot() {
  const g = new THREE.RingGeometry(0.06, 0.1, 16)
  const m = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(g, m)

  const glowG = new THREE.PlaneGeometry(0.3, 0.3)
  const glowM = new THREE.SpriteMaterial({
    map: _glowTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Sprite(glowG, glowM)

  const group = new THREE.Group()
  group.add(mesh)
  group.add(glow)
  return group
}

export default function NeuralMinimap({ clusters, activeCluster, onSelect }) {
  const containerRef = useRef()
  const canvasRef = useRef()
  const initialized = useRef(false)

  const sceneRef = useRef()
  const cameraRef = useRef()
  const rendererRef = useRef()

  const nodeGroupRef = useRef()
  const connGroupRef = useRef()
  const indicatorGroupRef = useRef()
  const bgGroupRef = useRef()

  const nodeMeshesRef = useRef(new Map())
  const connLinesRef = useRef([])
  const activeRingRef = useRef()
  const directionIndicatorRef = useRef()
  const cameraDotRef = useRef()

  const smoothRef = useRef({
    azimuth: 0,
    camX: 0,
    camZ: 0,
    dirX: 0,
    dirZ: -1,
    zoom: 1,
    activeCluster: null,
    activeOpacity: 0,
  })

  const pulseRef = useRef(0)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredNodeRef = useRef(null)

  const worldBoundsRef = useRef({ minX: -WORLD_BOUNDS, maxX: WORLD_BOUNDS, minZ: -WORLD_BOUNDS, maxZ: WORLD_BOUNDS })

  const selectCluster = useCallback((id) => {
    if (onSelect && id !== undefined && id !== null) {
      onSelect(id)
    }
  }, [onSelect])

  const handleClick = useCallback((e) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
    const meshes = []
    for (const [, group] of nodeMeshesRef.current) {
      group.children.forEach(child => {
        if (child.isMesh || child.isSprite) meshes.push(child)
      })
    }
    const intersects = raycasterRef.current.intersectObjects(meshes, false)
    if (intersects.length > 0) {
      let hitId = null
      for (const [, group] of nodeMeshesRef.current) {
        if (group.children.includes(intersects[0].object)) {
          hitId = group.userData.clusterId
          break
        }
      }
      if (hitId !== null) selectCluster(hitId)
    }
  }, [selectCluster])

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }, [])

  useEffect(() => {
    if (initialized.current) return

    const s = new THREE.Scene()
    sceneRef.current = s

    const c = new THREE.OrthographicCamera(-WORLD_BOUNDS, WORLD_BOUNDS, WORLD_BOUNDS, -WORLD_BOUNDS, 0.1, 30)
    c.position.set(0, 15, 0)
    c.lookAt(0, 0, 0)
    cameraRef.current = c

    const r = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    })
    r.setSize(SIZE, SIZE)
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    r.setClearColor(0x000000, 0)
    rendererRef.current = r

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_BOUNDS * 2, WORLD_BOUNDS * 2),
      new THREE.MeshBasicMaterial({
        map: _gridTex,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      })
    )
    bg.position.z = -1
    s.add(bg)
    bgGroupRef.current = bg

    const bgGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_BOUNDS * 1.2, WORLD_BOUNDS * 1.2),
      new THREE.MeshBasicMaterial({
        color: 0x110022,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      })
    )
    bgGlow.position.z = -0.5
    s.add(bgGlow)

    const ng = new THREE.Group()
    nodeGroupRef.current = ng
    s.add(ng)

    const cg = new THREE.Group()
    connGroupRef.current = cg
    s.add(cg)

    const ig = new THREE.Group()
    indicatorGroupRef.current = ig
    s.add(ig)

    const ring = createActiveRing()
    ring.visible = false
    s.add(ring)
    activeRingRef.current = ring

    const dirIndicator = createDirectionIndicator()
    dirIndicator.visible = false
    s.add(dirIndicator)
    directionIndicatorRef.current = dirIndicator

    const camDot = createCameraDot()
    camDot.visible = false
    s.add(camDot)
    cameraDotRef.current = camDot

    initialized.current = true

    return () => {
      cancelAnimationFrame(animFrame.current)
      r.dispose()
      s.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      nodeMeshesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current || !nodeGroupRef.current) return

    const ng = nodeGroupRef.current
    while (ng.children.length) {
      const child = ng.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
      ng.remove(child)
    }
    nodeMeshesRef.current.clear()

    const connGroup = connGroupRef.current
    while (connGroup.children.length) {
      const child = connGroup.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
      connGroup.remove(child)
    }
    connLinesRef.current = []

    if (!clusters) return

    const vals = Object.values(clusters)
    if (vals.length === 0) return

    const positions = vals.map(c => ({
      x: c.position[0],
      z: c.position[2],
      color: c.color,
      id: c.id,
      name: c.name,
    }))

    const xs = positions.map(p => p.x)
    const zs = positions.map(p => p.z)
    const pad = 1
    worldBoundsRef.current = {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minZ: Math.min(...zs) - pad,
      maxZ: Math.max(...zs) + pad,
    }

    const cam = cameraRef.current
    const b = worldBoundsRef.current
    const cx = (b.minX + b.maxX) / 2
    const cz = (b.minZ + b.maxZ) / 2
    const hw = Math.max((b.maxX - b.minX) / 2, (b.maxZ - b.minZ) / 2) + 1.5
    cam.left = -hw
    cam.right = hw
    cam.top = hw
    cam.bottom = -hw
    cam.position.set(cx, 15, cz)
    cam.lookAt(cx, 0, cz)
    cam.updateProjectionMatrix()

    for (const pos of positions) {
      const group = createNodeMesh(pos.color, 0.25)
      group.position.set(pos.x, 0, pos.z)
      group.userData.clusterId = pos.id
      group.userData.name = pos.name
      ng.add(group)
      nodeMeshesRef.current.set(pos.id, group)
    }

    for (let i = 0; i < positions.length; i++) {
      const next = (i + 1) % positions.length
      const a = positions[i]
      const b = positions[next]
      const line = createConnectionLine()
      const posAttr = line.geometry.attributes.position
      posAttr.array[0] = a.x; posAttr.array[1] = 0; posAttr.array[2] = a.z
      posAttr.array[3] = b.x; posAttr.array[4] = 0; posAttr.array[5] = b.z
      posAttr.needsUpdate = true
      connGroup.add(line)
      connLinesRef.current.push(line)
    }
  }, [clusters])

  useEffect(() => {
    if (!activeRingRef.current) return
    const smooth = smoothRef.current
    if (activeCluster !== null) {
      smooth.activeOpacity = 1
      smooth.activeCluster = activeCluster
    } else {
      smooth.activeOpacity = 0
    }
  }, [activeCluster])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mousemove', handleMouseMove)
    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleClick, handleMouseMove])

  const animFrame = useRef()

  useEffect(() => {
    let running = true

    const animate = () => {
      if (!running) return
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
        animFrame.current = requestAnimationFrame(animate)
        return
      }

      const scene = sceneRef.current
      const cam = cameraRef.current
      const renderer = rendererRef.current
      const smooth = smoothRef.current
      const pulse = pulseRef.current

      pulseRef.current += 0.03

      const sync = minimapSync

      const mainPos = sync.cameraPosition
      const mainTarget = sync.cameraTarget
      const mainQuat = sync.cameraQuaternion

      _v3.set(0, 0, -1)
      _v3.applyQuaternion(mainQuat)
      _v3.y = 0
      _v3.normalize()
      const targetDirX = _v3.x
      const targetDirZ = _v3.z

      const dx = mainPos.x - mainTarget.x
      const dz = mainPos.z - mainTarget.z
      const targetAzimuth = Math.atan2(dz, dx)
      const targetCamX = mainPos.x
      const targetCamZ = mainPos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const targetZoom = Math.max(0.3, Math.min(1.5, dist / 8))

      let diff = targetAzimuth - smooth.azimuth
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      smooth.azimuth += diff * 0.06
      smooth.camX += (targetCamX - smooth.camX) * 0.08
      smooth.camZ += (targetCamZ - smooth.camZ) * 0.08
      smooth.dirX += (targetDirX - smooth.dirX) * 0.08
      smooth.dirZ += (targetDirZ - smooth.dirZ) * 0.08
      smooth.zoom += (targetZoom - smooth.zoom) * 0.04

      const dirLen = 1.2 + smooth.zoom * 0.5
      const beamLen = 2.5 * smooth.zoom

      if (Math.abs(smooth.activeOpacity) > 0.001) {
        smooth.activeOpacity += (1 - smooth.activeOpacity) * 0.05
        if (Math.abs(smooth.activeOpacity - 1) < 0.001) smooth.activeOpacity = 1
      } else {
        smooth.activeOpacity = 0
      }
      if (activeCluster === null) {
        smooth.activeOpacity *= 0.92
      }

      const dirGroup = directionIndicatorRef.current
      if (dirGroup) {
        dirGroup.position.set(smooth.camX, 0, smooth.camZ)
        const angle = Math.atan2(smooth.dirZ, smooth.dirX)
        dirGroup.rotation.y = -angle + Math.PI / 2
        const s = 0.3 + smooth.zoom * 0.15
        dirGroup.scale.setScalar(s)
        const beamOpacity = 0.15 + smooth.zoom * 0.15
        dirGroup.userData.mesh.material.opacity = beamOpacity
        dirGroup.userData.line.material.opacity = beamOpacity * 0.5
        dirGroup.visible = true
      }

      const camDot = cameraDotRef.current
      if (camDot) {
        camDot.position.set(smooth.camX, 0, smooth.camZ)
        const dotScale = 0.8 + smooth.zoom * 0.4
        camDot.scale.setScalar(dotScale)
        camDot.visible = true
      }

      const ring = activeRingRef.current
      if (ring && smooth.activeCluster !== null) {
        const clusterGroup = nodeMeshesRef.current.get(smooth.activeCluster)
        if (clusterGroup) {
          ring.position.copy(clusterGroup.position)
          ring.visible = smooth.activeOpacity > 0.01
          const pulseRing = Math.sin(pulseRef.current * 1.5) * 0.15 + 0.85
          const ringScale = 0.8 + (1 - smooth.activeOpacity) * 0.3
          ring.scale.setScalar(ringScale * pulseRing)
          ring.children.forEach(child => {
            if (child.material) {
              child.material.opacity = smooth.activeOpacity * 0.7
            }
          })
          ring.userData.glow.material.opacity = smooth.activeOpacity * 0.3 * pulseRing
        } else {
          ring.visible = false
        }
      } else if (ring) {
        ring.visible = false
      }

      for (const [id, group] of nodeMeshesRef.current) {
        const isActive = id === smooth.activeCluster && smooth.activeOpacity > 0.01
        const glowOpacity = isActive ? 0.4 + Math.sin(pulseRef.current * 2 + id) * 0.1 : 0.2
        group.userData.glow.material.opacity = glowOpacity
        if (isActive) {
          const scale = 1 + Math.sin(pulseRef.current * 2.5 + id) * 0.08
          group.scale.setScalar(scale)
        } else {
          group.scale.setScalar(1)
        }
      }

      const connLines = connLinesRef.current
      for (let i = 0; i < connLines.length; i++) {
        const line = connLines[i]
        if (line) {
          const baseOpacity = 0.06 + smooth.zoom * 0.04
          line.material.opacity = baseOpacity
        }
      }

      bgGroupRef.current.material.opacity = 0.1 + smooth.zoom * 0.05

      renderer.render(scene, cam)
      animFrame.current = requestAnimationFrame(animate)
    }

    animFrame.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(animFrame.current)
    }
  }, [activeCluster])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 30,
        right: 30,
        zIndex: 10,
        width: SIZE,
        height: SIZE,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(2,6,18,0.35)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(120,80,255,0.08)',
        boxShadow: '0 0 30px rgba(80,40,180,0.08), inset 0 0 40px rgba(80,40,180,0.02)',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{
          width: SIZE,
          height: SIZE,
          display: 'block',
        }}
      />
      <div style={{
        position: 'absolute',
        top: 8,
        left: 10,
        fontSize: 6,
        fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(120,80,255,0.2)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        Neural Map
      </div>
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 10,
        fontSize: 5,
        fontFamily: "'SF Mono','Menlo',monospace",
        color: 'rgba(120,80,255,0.1)',
        letterSpacing: '1.5px',
        pointerEvents: 'none',
      }}>
        {clusters ? Object.keys(clusters).length : 0} nodes
      </div>
    </div>
  )
}
