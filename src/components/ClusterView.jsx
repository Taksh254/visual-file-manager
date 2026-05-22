import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import FileParticleSystem from './FileParticleSystem'
import HoverLabel from './HoverLabel'
import SelectionRing from './SelectionRing'

export default function ClusterView({ cluster, clusterParticles, onReturn, onFileSelect, changeType = null }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [hoveredPosition, setHoveredPosition] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const expandRef = useRef(0)
  const prevFileCountRef = useRef(clusterParticles?.count || 0)
  const [currentChangeType, setCurrentChangeType] = useState(changeType)
  const [particleVersion, setParticleVersion] = useState(clusterParticles?.version || 0)

  const files = clusterParticles
  const pos = cluster?.position || [0, 0, 0]
  const c = cluster?.color || { r: 0.5, g: 0.5, b: 0.5 }

  useEffect(() => {
    if (!files) return
    const prevCount = prevFileCountRef.current
    const currentCount = files.count

    if (currentCount !== prevCount) {
      if (currentCount > prevCount) {
        setCurrentChangeType('added')
      } else if (currentCount < prevCount) {
        setCurrentChangeType('removed')
      }
      prevFileCountRef.current = currentCount
      setParticleVersion(files.version)
    } else if (changeType === 'modified') {
      setCurrentChangeType('modified')
      setParticleVersion(files.version)
    }

    if (changeType) {
      const timer = setTimeout(() => setCurrentChangeType(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [files?.version, files?.count, changeType])

  useFrame((_, delta) => {
    expandRef.current = Math.min(expandRef.current + delta * 0.6, 1)
  })

  const hoverPos = useRef(new THREE.Vector3())
  const selPos = useRef(new THREE.Vector3())

  useEffect(() => {
    expandRef.current = 0
    setHoveredIndex(null)
    setSelectedIndex(null)
    setHoveredPosition(null)
    setSelectedPosition(null)
  }, [cluster?.id])

  useEffect(() => {
    if (selectedIndex !== null && files?.positions) {
      const i = selectedIndex * 3
      selPos.current.set(files.positions[i], files.positions[i + 1], files.positions[i + 2])
      setSelectedPosition(selPos.current.clone())
    }
  }, [files?.positions, files?.meta, selectedIndex])

  const handleHover = useCallback((index) => {
    setHoveredIndex(index)
    if (index !== null && files) {
      const i = index * 3
      hoverPos.current.set(files.positions[i], files.positions[i + 1], files.positions[i + 2])
      setHoveredPosition(hoverPos.current.clone())
    } else {
      setHoveredPosition(null)
    }
  }, [files])

  const handleSelect = useCallback((index) => {
    setSelectedIndex(prev => {
      const val = prev === index ? null : index
      if (val !== null && files?.meta?.[val]) {
        onFileSelect(files.meta[val])
      } else {
        onFileSelect(null)
      }
      return val
    })
    if (index !== null && files) {
      const i = index * 3
      selPos.current.set(files.positions[i], files.positions[i + 1], files.positions[i + 2])
      setSelectedPosition(selPos.current.clone())
    } else {
      setSelectedPosition(null)
    }
  }, [files, onFileSelect])

  const selectedColor = selectedIndex !== null && files
    ? new THREE.Color(files.colors[selectedIndex * 3], files.colors[selectedIndex * 3 + 1], files.colors[selectedIndex * 3 + 2])
    : null

  const hovFile = hoveredIndex !== null ? files?.meta?.[hoveredIndex] : null

  if (!files || files.count === 0) {
    return (
      <group position={[pos[0], pos[1], pos[2]]}>
        <Html position={[0, 0, 0]} center distanceFactor={4}>
          <div style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            fontFamily: "'SF Mono','Menlo',monospace",
            background: 'rgba(0,0,0,0.4)',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            ✦ empty folder
          </div>
        </Html>
        <Html position={[0, -0.55, 0]} center distanceFactor={4}>
          <div onClick={(e) => { e.stopPropagation(); onReturn() }}
            style={{
              color: 'rgba(255,255,255,0.35)', fontSize: 11,
              fontFamily: "'SF Mono','Menlo',monospace", cursor: 'pointer',
              letterSpacing: '0.5px', userSelect: 'none',
              padding: '4px 8px', borderRadius: 4,
              background: 'rgba(0,0,0,0.2)',
            }}>
            ← {cluster?.name}
          </div>
        </Html>
      </group>
    )
  }

  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      <FileParticleSystem
        meta={files.meta}
        positions={files.positions}
        colors={files.colors}
        hoveredIndex={hoveredIndex}
        selectedIndex={selectedIndex}
        onHover={handleHover}
        onSelect={handleSelect}
        expandProgress={expandRef.current}
        changeType={currentChangeType}
        version={particleVersion}
      />
      <HoverLabel file={hovFile} position={hoveredPosition} />
      <SelectionRing position={selectedPosition} color={selectedColor} />

      {currentChangeType === 'added' && (
        <Html position={[0, 0.5, 0]} center distanceFactor={4}>
          <div style={{
            color: 'rgba(0,255,180,0.6)', fontSize: 9,
            fontFamily: "'SF Mono','Menlo',monospace",
            textShadow: '0 0 20px rgba(0,255,180,0.3)',
            pointerEvents: 'none',
            transition: 'opacity 1s',
          }}>
            + new files appearing
          </div>
        </Html>
      )}

      <Html position={[0, -0.45, 0]} center distanceFactor={4}>
        <div onClick={(e) => { e.stopPropagation(); onReturn() }}
          style={{
            color: 'rgba(255,255,255,0.35)', fontSize: 11,
            fontFamily: "'SF Mono','Menlo',monospace", cursor: 'pointer',
            letterSpacing: '0.5px',
            textShadow: `0 0 10px ${new THREE.Color(c.r, c.g, c.b).getStyle()}33`,
            transition: 'opacity 0.2s', userSelect: 'none',
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(0,0,0,0.2)',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.35'}
        >
          ← {cluster?.name}
        </div>
      </Html>
    </group>
  )
}
