import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import ClusterGlobular from './ClusterGlobular'
import { interactionManager, INTENT } from '../systems/InteractionManager'

export default function GalaxyCluster({ cluster, onSelect, clusterState = 'idle' }) {
  const groupRef = useRef()
  const [localState, setLocalState] = useState(clusterState)
  const [hoverProgress, setHoverProgress] = useState(0)
  const hoverProgressRef = useRef(0)
  const stateRef = useRef(clusterState)

  const pos = cluster.position
  const color = cluster.color
  const c = useMemo(() => new THREE.Color(color.r, color.g, color.b), [color])

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
  })

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    interactionManager.pointerEnter(cluster.id)
    document.body.style.cursor = 'pointer'
  }, [cluster.id])

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation()
    interactionManager.pointerLeave(cluster.id)
  }, [cluster.id])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    if (interactionManager.click(cluster.id)) {
      if (onSelect) onSelect(cluster.id)
    }
  }, [cluster.id, onSelect])

  const labelOpacity = localState === INTENT.FOCUSED ? 0.85 : localState === INTENT.HOVERED ? 0.6 : localState === INTENT.INTENT ? 0.5 : 0.35
  const labelGlow = localState === INTENT.FOCUSED ? `0 0 30px ${c.getStyle()}66, 0 0 80px ${c.getStyle()}22` : `0 0 16px ${c.getStyle()}44, 0 0 40px ${c.getStyle()}22`

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <ClusterGlobular
        color={color}
        radius={1.0}
        clusterState={localState}
        hoverProgress={hoverProgress}
      />

      <Html position={[0, -0.75, 0]} center distanceFactor={6}>
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
          {cluster.name}
        </div>
      </Html>
    </group>
  )
}
