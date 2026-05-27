import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import ClusterGlobular from './ClusterGlobular'
import HoverLabel from '../components/HoverLabel'
import SelectionRing from '../components/SelectionRing'
import { interactionManager, INTENT } from '../systems/InteractionManager'

const starVertexShader = `
  uniform float uTime;
  uniform float uHoverIndex;
  uniform float uSelectedIndex;

  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    vec3 p = position;
    float t = uTime;
    float ph = aPhase;

    p.x += sin(t * 0.004 + ph * 1.7) * 0.015;
    p.y += cos(t * 0.003 + ph * 2.3) * 0.012;
    p.z += sin(t * 0.005 + ph * 0.9) * 0.015;

    float isHovered = float(gl_VertexID == int(uHoverIndex));
    float isSelected = float(gl_VertexID == int(uSelectedIndex));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float sz = aSize * (45.0 / -mv.z) * (1.0 + isHovered * 0.8 + isSelected * 0.4);
    gl_PointSize = clamp(sz, 0.1, 28.0);
    gl_Position = projectionMatrix * mv;

    float tw = 0.7 + 0.3 * sin(t * 0.06 + ph);
    float fade = smoothstep(30.0, 0.5, -mv.z);
    vAlpha = fade * tw * (0.8 + isHovered * 0.4 + isSelected * 0.2);
    vColor = aColor * (1.0 + isHovered * 0.4 + isSelected * 0.2);
    vGlow = isHovered * 0.6 + isSelected * 0.3;
  }
`

const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = exp(-d * 20.0);
    float glow = exp(-d * 8.0) * 0.2;
    float spot = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = (spot + core * 0.8) * vAlpha;
    vec3 color = vColor + vec3(core * 0.6) + vec3(glow * 0.3);
    float hGlow = smoothstep(0.5, 0.0, d) * vGlow;
    color += vec3(0.3, 0.6, 1.0) * (core * hGlow * 0.4);
    gl_FragColor = vec4(color, alpha);
  }
`

export default function GalaxyCluster({ cluster, starData = null, onSelect, onStarSelect = null, clusterState = 'idle' }) {
  const groupRef = useRef()
  const pointsRef = useRef()
  const [localState, setLocalState] = useState(clusterState)
  const [hoverProgress, setHoverProgress] = useState(0)
  const hoverProgressRef = useRef(0)
  const stateRef = useRef(clusterState)
  const [hoveredStarIndex, setHoveredStarIndex] = useState(null)
  const [hoveredStarPos, setHoveredStarPos] = useState(null)
  const [selectedStarIndex, setSelectedStarIndex] = useState(null)
  const [selectedStarPos, setSelectedStarPos] = useState(null)
  const selectedStarColor = useRef(null)

  const pos = cluster.position
  const color = cluster.color
  const c = useMemo(() => new THREE.Color(color.r, color.g, color.b), [color])
  const hasStars = starData && starData.positions && starData.positions.length > 0
  const starCount = hasStars ? starData.meta.length : 0

  useEffect(() => {
    const unsub = interactionManager.on('change', (ev) => {
      if (ev.clusterId === cluster.id) {
        stateRef.current = ev.state
        setLocalState(ev.state)
        if (ev.state === INTENT.IDLE || ev.state === INTENT.INTENT) {
          document.body.style.cursor = 'default'
        }
      }
    })
    return unsub
  }, [cluster.id])

  useFrame((st) => {
    if (!groupRef.current) return
    const t = st.clock.elapsedTime

    const baseX = pos[0] + Math.sin(t * 0.025 + cluster.id * 1.7) * 0.025
    const baseY = pos[1] + Math.sin(t * 0.02 + cluster.id * 2.3) * 0.03
    const baseZ = pos[2] + Math.cos(t * 0.03 + cluster.id * 1.1) * 0.02

    const hoverFloat = hoverProgressRef.current * 0.04
    groupRef.current.position.x = baseX + Math.sin(t * 0.5 + cluster.id) * hoverFloat
    groupRef.current.position.y = baseY + Math.cos(t * 0.4 + cluster.id * 0.7) * hoverFloat
    groupRef.current.position.z = baseZ + Math.sin(t * 0.6 + cluster.id * 1.3) * hoverFloat * 0.5

    const targetHover = stateRef.current === INTENT.HOVERED || stateRef.current === INTENT.FOCUSED ? 1 : stateRef.current === INTENT.INTENT ? 0.3 : 0
    hoverProgressRef.current += (targetHover - hoverProgressRef.current) * 0.04
    setHoverProgress(hoverProgressRef.current)

    if (pointsRef.current) {
      pointsRef.current.material.uniforms.uTime.value = t
    }
  })

  const starUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHoverIndex: { value: -1 },
    uSelectedIndex: { value: -1 },
  }), [])

  const starPositions = useMemo(() => {
    if (!hasStars) return new Float32Array(0)
    return starData.positions instanceof Float32Array ? starData.positions : new Float32Array(starData.positions)
  }, [starData?.positions, hasStars])

  const starColors = useMemo(() => {
    if (!hasStars) return new Float32Array(0)
    return starData.colors instanceof Float32Array ? starData.colors : new Float32Array(starData.colors)
  }, [starData?.colors, hasStars])

  const starSizes = useMemo(() => {
    if (!hasStars) return new Float32Array(0)
    return starData.sizes instanceof Float32Array ? starData.sizes : new Float32Array(starData.sizes)
  }, [starData?.sizes, hasStars])

  const starPhases = useMemo(() => {
    if (!hasStars) return new Float32Array(0)
    const arr = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      arr[i] = Math.random() * Math.PI * 2
    }
    return arr
  }, [starCount])

  const handleClusterPointerOver = useCallback((e) => {
    e.stopPropagation()
    interactionManager.pointerEnter(cluster.id)
    document.body.style.cursor = 'pointer'
  }, [cluster.id])

  const handleClusterPointerOut = useCallback((e) => {
    e.stopPropagation()
    interactionManager.pointerLeave(cluster.id)
  }, [cluster.id])

  const handleClusterClick = useCallback((e) => {
    e.stopPropagation()
    if (interactionManager.click(cluster.id)) {
      if (onSelect) onSelect(cluster.id)
    }
  }, [cluster.id, onSelect])

  const handleStarPointerMove = useCallback((e) => {
    if (!hasStars) return
    if (e.index === undefined || e.index >= starCount) {
      setHoveredStarIndex(null)
      setHoveredStarPos(null)
      document.body.style.cursor = 'default'
      starUniforms.uHoverIndex.value = -1
      return
    }
    const idx = e.index
    setHoveredStarIndex(idx)
    const posArr = starPositions
    const pos3 = new THREE.Vector3(posArr[idx * 3], posArr[idx * 3 + 1], posArr[idx * 3 + 2])
    setHoveredStarPos(pos3)
    document.body.style.cursor = 'pointer'
    starUniforms.uHoverIndex.value = idx
  }, [hasStars, starCount, starPositions, starUniforms])

  const handleStarPointerOut = useCallback(() => {
    setHoveredStarIndex(null)
    setHoveredStarPos(null)
    starUniforms.uHoverIndex.value = -1
  }, [starUniforms])

  const handleStarClick = useCallback((e) => {
    if (!hasStars) return
    if (e.index === undefined || e.index >= starCount) return
    e.stopPropagation()
    const idx = e.index
    const newSelected = selectedStarIndex === idx ? null : idx
    setSelectedStarIndex(newSelected)

    if (newSelected !== null && starData.meta[newSelected]) {
      const fileMeta = starData.meta[newSelected]
      selectedStarColor.current = new THREE.Color(
        starColors[newSelected * 3],
        starColors[newSelected * 3 + 1],
        starColors[newSelected * 3 + 2]
      )
      const p = starPositions
      setSelectedStarPos(new THREE.Vector3(p[newSelected * 3], p[newSelected * 3 + 1], p[newSelected * 3 + 2]))
      starUniforms.uSelectedIndex.value = newSelected
      if (onStarSelect) onStarSelect(fileMeta)
    } else {
      setSelectedStarPos(null)
      selectedStarColor.current = null
      starUniforms.uSelectedIndex.value = -1
      if (onStarSelect) onStarSelect(null)
    }
  }, [hasStars, starCount, starData, selectedStarIndex, starColors, starPositions, starUniforms, onStarSelect])

  useEffect(() => {
    if (!hasStars) {
      setHoveredStarIndex(null)
      setHoveredStarPos(null)
      setSelectedStarIndex(null)
      setSelectedStarPos(null)
      selectedStarColor.current = null
    }
  }, [hasStars])

  const hoveredFile = hoveredStarIndex !== null && hasStars ? starData.meta[hoveredStarIndex] : null
  const selectedColor = selectedStarColor.current

  const labelOpacity = localState === INTENT.FOCUSED ? 0.85 : localState === INTENT.HOVERED ? 0.6 : localState === INTENT.INTENT ? 0.5 : 0.35
  const labelGlow = localState === INTENT.FOCUSED ? `0 0 30px ${c.getStyle()}66, 0 0 80px ${c.getStyle()}22` : `0 0 16px ${c.getStyle()}44, 0 0 40px ${c.getStyle()}22`

  return (
    <group ref={groupRef}>
      {hasStars ? (
        <>
          <points
            ref={pointsRef}
            onPointerMove={handleStarPointerMove}
            onPointerOut={handleStarPointerOut}
            onClick={handleStarClick}
          >
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={starCount} array={starPositions} itemSize={3} />
              <bufferAttribute attach="attributes-aColor" count={starCount} array={starColors} itemSize={3} />
              <bufferAttribute attach="attributes-aSize" count={starCount} array={starSizes} itemSize={1} />
              <bufferAttribute attach="attributes-aPhase" count={starCount} array={starPhases} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial
              uniforms={starUniforms}
              vertexShader={starVertexShader}
              fragmentShader={starFragmentShader}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
            />
          </points>
          <mesh
            onClick={handleClusterClick}
            onPointerOver={handleClusterPointerOver}
            onPointerOut={handleClusterPointerOut}
          >
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </>
      ) : (
        <group
          onClick={handleClusterClick}
          onPointerOver={handleClusterPointerOver}
          onPointerOut={handleClusterPointerOut}
        >
          <ClusterGlobular
            color={color}
            radius={1.0}
            clusterState={localState}
            hoverProgress={hoverProgress}
            category={cluster.category}
          />
        </group>
      )}

      <HoverLabel file={hoveredFile} position={hoveredStarPos} />
      <SelectionRing position={selectedStarPos} color={selectedColor} />

      <Html position={[0, -0.7, 0]} center distanceFactor={6}>
        <div style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 8,
          fontFamily: "'SF Mono','Menlo',monospace",
          letterSpacing: '3px',
          textShadow: labelGlow,
          opacity: labelOpacity,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          fontWeight: 200,
          transition: 'opacity 0.6s ease, text-shadow 0.8s ease',
        }}>
          {cluster.icon && <span style={{ marginRight: 4 }}>{cluster.icon}</span>}
          {cluster.name}
        </div>
      </Html>
    </group>
  )
}
