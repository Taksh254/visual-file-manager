import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  uniform float uRadius;
  uniform int uHoverIndex;
  uniform int uSelectedIndex;
  uniform float uExpandProgress;
  uniform float uFadeInProgress;

  attribute float aSize;
  attribute float aPhase;
  attribute float aLayer;
  attribute float aOrbitTilt;
  attribute float aOrbitEcc;
  attribute vec3 aColor;
  attribute float aIsNew;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    vec3 pos = position;
    float dist = length(pos.xz);
    float t = uTime;
    float phase = aPhase;
    float speed = mix(0.15, 0.03, dist / uRadius);
    float angle = t * speed + phase;
    float cosA = cos(angle);
    float sinA = sin(angle);
    float ecc = aOrbitEcc * 0.25;
    float rFactor = 1.0 - ecc * cos(angle * 1.5 + aOrbitTilt);

    pos.x = position.x * cosA * rFactor - position.z * sinA * rFactor;
    pos.z = position.x * sinA * rFactor + position.z * cosA * rFactor;
    float tiltY = aOrbitTilt * 0.12;
    float heightOffset = sin(angle * 0.7 + aOrbitTilt) * tiltY * dist;
    float bob = sin(t * 0.1 + phase * 2.0) * 0.015 * (1.0 + aLayer);
    pos.y += heightOffset + bob;
    float breath = 1.0 + sin(t * 0.04 + phase) * 0.01;
    pos *= breath;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float isHovered = float(gl_VertexID == uHoverIndex);
    float isSelected = float(gl_VertexID == uSelectedIndex);
    float expScale = 0.2 + uExpandProgress * 0.8;

    float newPulse = aIsNew * (0.5 + 0.5 * sin(t * 2.0 + phase * 5.0));

    float sizeBase = aSize + isHovered * 3.0 + isSelected * 2.0 + newPulse * 2.0;
    gl_PointSize = clamp(sizeBase * expScale * (55.0 / -mvPosition.z), 0.3, 30.0);

    vColor = aColor;
    float glowFactor = isHovered * 0.7 + isSelected * 0.5;
    float newGlow = aIsNew * 0.6 * (0.5 + 0.5 * sin(t * 3.0 + phase));
    vGlow = glowFactor * uExpandProgress + newGlow;
    float fadeAlpha = smoothstep(1.0, 0.0, aIsNew * (1.0 - uFadeInProgress));
    vAlpha = smoothstep(28.0, 1.0, -mvPosition.z) * uExpandProgress * uFadeInProgress * fadeAlpha;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = exp(-d * 24.0);
    float s = 1.0 - smoothstep(0.0, 0.5, d);
    float strength = s * s;
    float hoverGlow = smoothstep(0.5, 0.0, d) * vGlow;
    vec3 color = vColor + vec3(core * 0.5) + hoverGlow * 0.5 + vec3(0.2, 0.5, 1.0) * (core * vGlow * 0.3);
    float alpha = (strength + core * 0.6) * vAlpha * (0.7 + vGlow * 0.3);
    gl_FragColor = vec4(color, alpha);
  }
`

export default function FileParticleSystem({ meta, positions, colors, sizes: externalSizes = null, hoveredIndex, selectedIndex, onHover, onSelect, expandProgress = 1, changeType = null, version = 0 }) {
  const radius = 2.4
  const points = useRef()
  const count = meta.length
  const fadeInRef = useRef(changeType === 'added' ? 0 : 1)
  const prevVersionRef = useRef(version)
  const hoverIndexRef = useRef(-1)
  const hoverLerpRef = useRef(0)

  useEffect(() => {
    if (version !== prevVersionRef.current) {
      if (changeType === 'added') {
        fadeInRef.current = 0
      } else {
        fadeInRef.current = 1
      }
      prevVersionRef.current = version
    }
  }, [version, changeType])

  const { sizes, phases, layers, orbitTilts, orbitEccs, isNewFlags } = useMemo(() => {
    if (externalSizes && externalSizes.length === count) {
      const sizes = new Float32Array(externalSizes)
      const phases = new Float32Array(count)
      const layers = new Float32Array(count)
      const orbitTilts = new Float32Array(count)
      const orbitEccs = new Float32Array(count)
      const isNewFlags = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        phases[i] = Math.random() * Math.PI * 2
        layers[i] = Math.random()
        orbitTilts[i] = Math.random() * Math.PI * 2
        orbitEccs[i] = Math.random()
        isNewFlags[i] = (meta[i]?.isNew) ? 1.0 : 0.0
      }
      return { sizes, phases, layers, orbitTilts, orbitEccs, isNewFlags }
    }
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const layers = new Float32Array(count)
    const orbitTilts = new Float32Array(count)
    const orbitEccs = new Float32Array(count)
    const isNewFlags = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const isSpecial = Math.random() < 0.15
      sizes[i] = isSpecial ? 3.0 + Math.random() * 5.0 : 1.0 + Math.random() * 2.5
      phases[i] = Math.random() * Math.PI * 2
      layers[i] = Math.random()
      orbitTilts[i] = Math.random() * Math.PI * 2
      orbitEccs[i] = Math.random()
      isNewFlags[i] = (meta[i]?.isNew) ? 1.0 : 0.0
    }
    return { sizes, phases, layers, orbitTilts, orbitEccs, isNewFlags }
  }, [count, meta, externalSizes])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uRadius: { value: radius },
    uHoverIndex: { value: -1 },
    uSelectedIndex: { value: -1 },
    uExpandProgress: { value: 0 },
    uFadeInProgress: { value: 1 },
  }), [])

  useFrame((state) => {
    const m = points.current?.material
    if (!m) return
    m.uniforms.uTime.value = state.clock.elapsedTime

    if (hoverIndexRef.current !== (hoveredIndex ?? -1)) {
      hoverIndexRef.current = hoveredIndex ?? -1
    }
    hoverLerpRef.current += ((hoveredIndex !== null ? 1 : 0) - hoverLerpRef.current) * 0.06
    const displayIndex = hoverLerpRef.current > 0.5 ? hoverIndexRef.current : -1
    m.uniforms.uHoverIndex.value = displayIndex

    m.uniforms.uSelectedIndex.value = selectedIndex ?? -1

    const target = expandProgress
    const current = m.uniforms.uExpandProgress.value
    if (Math.abs(current - target) > 0.001) {
      m.uniforms.uExpandProgress.value += (target - current) * 0.04
    } else {
      m.uniforms.uExpandProgress.value = target
    }

    const fadeTarget = fadeInRef.current
    const fadeCurrent = m.uniforms.uFadeInProgress.value
    if (Math.abs(fadeCurrent - fadeTarget) > 0.001) {
      m.uniforms.uFadeInProgress.value += (fadeTarget - fadeCurrent) * 0.03
    } else {
      m.uniforms.uFadeInProgress.value = fadeTarget
    }
  })

  const handlePointerMove = useCallback((e) => {
    if (e.index === undefined || e.index >= count) {
      if (hoverIndexRef.current !== -1) {
        hoverIndexRef.current = -1
        onHover(null)
        document.body.style.cursor = 'default'
      }
      return
    }
    hoverIndexRef.current = e.index
    onHover(e.index)
    document.body.style.cursor = 'pointer'
  }, [onHover, count])

  const handleClick = useCallback((e) => {
    if (e.index === undefined || e.index >= count) return
    onSelect(e.index)
  }, [onSelect, count])

  return (
    <points ref={points} onPointerMove={handlePointerMove} onClick={handleClick}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aLayer" count={count} array={layers} itemSize={1} />
        <bufferAttribute attach="attributes-aOrbitTilt" count={count} array={orbitTilts} itemSize={1} />
        <bufferAttribute attach="attributes-aOrbitEcc" count={count} array={orbitEccs} itemSize={1} />
        <bufferAttribute attach="attributes-aIsNew" count={count} array={isNewFlags} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </points>
  )
}
