import * as THREE from 'three'

export function createParticleBufferAttrs(count, {
  positionSpread = null,
  sizeRange = [0.01, 0.05],
  color = null,
  randomPhase = true,
  spherical = true,
  flattenY = 0.2,
} = {}) {
  const p = new Float32Array(count * 3)
  const s = new Float32Array(count)
  const ph = new Float32Array(count)
  const co = new Float32Array(count * 3)

  const defaultColor = new THREE.Color(1, 1, 1)

  for (let i = 0; i < count; i++) {
    if (positionSpread) {
      if (spherical) {
        const dist = positionSpread[0] + Math.random() * (positionSpread[1] - positionSpread[0])
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        p[i * 3] = dist * Math.sin(phi) * Math.cos(theta)
        p[i * 3 + 1] = dist * Math.cos(phi) * flattenY
        p[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta)
      } else {
        p[i * 3] = (Math.random() - 0.5) * (positionSpread[1] - positionSpread[0])
        p[i * 3 + 1] = (Math.random() - 0.5) * (positionSpread[1] - positionSpread[0]) * 0.3
        p[i * 3 + 2] = (Math.random() - 0.5) * (positionSpread[1] - positionSpread[0])
      }
    } else {
      p[i * 3] = 0
      p[i * 3 + 1] = 0
      p[i * 3 + 2] = 0
    }

    s[i] = sizeRange[0] + Math.random() ** 2 * (sizeRange[1] - sizeRange[0])
    ph[i] = randomPhase ? Math.random() * Math.PI * 2 : 0

    const c = color || defaultColor
    const bri = 0.5 + Math.random() * 0.5
    co[i * 3] = c.r * bri
    co[i * 3 + 1] = c.g * bri
    co[i * 3 + 2] = c.b * bri
  }

  return { p, s, ph, co }
}

export function applyBufferAttributes(geometry, count, data) {
  geometry.setAttribute('position', new THREE.BufferAttribute(data.p, 3))
  if (data.s) geometry.setAttribute('aSize', new THREE.BufferAttribute(data.s, 1))
  if (data.ph) geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.ph, 1))
  if (data.co) geometry.setAttribute('aColor', new THREE.BufferAttribute(data.co, 3))
  return geometry
}

export function pointVertexShader(options = {}) {
  const {
    driftStrength = 0.6,
    twinkleStrength = 0.15,
    twinkleSpeed = 0.08,
    useDrift = true,
    useTwinkle = true,
    sizeScale = 35.0,
    maxSize = 8.0,
    minSize = 0.0,
    fadeStart = 35.0,
    fadeEnd = 0.5,
  } = options

  return `
    uniform float uTime;
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 p = position;
      float t = uTime;
      float ph = aPhase;

      ${useDrift ? `
      p.x += sin(t * ${(driftStrength * 0.001).toFixed(6)} + ph) * ${driftStrength.toFixed(2)};
      p.y += cos(t * ${(driftStrength * 0.0008).toFixed(6)} + ph * 1.3) * ${(driftStrength * 0.3).toFixed(2)};
      p.z += sin(t * ${(driftStrength * 0.0006).toFixed(6)} + ph * 0.8) * ${(driftStrength * 0.5).toFixed(2)};
      ` : ''}

      vec4 mv = modelViewMatrix * vec4(p, 1.0);

      gl_PointSize = clamp(aSize * (${sizeScale.toFixed(1)} / -mv.z), ${minSize.toFixed(1)}, ${maxSize.toFixed(1)});
      gl_Position = projectionMatrix * mv;

      ${useTwinkle ? `
      float tw = ${(1 - twinkleStrength).toFixed(2)} + ${twinkleStrength.toFixed(2)} * sin(t * ${twinkleSpeed.toFixed(3)} + ph * 2.0);
      ` : 'float tw = 1.0;'}

      vAlpha = smoothstep(${fadeStart.toFixed(1)}, ${fadeEnd.toFixed(1)}, -mv.z) * tw;
      vColor = aColor;
    }
  `
}

export function pointFragmentShader(options = {}) {
  const { coreGlow = 0.3, softness = 0.45 } = options
  return `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.5, ${softness.toFixed(2)}, d);
      float core = exp(-d * 25.0);
      gl_FragColor = vec4(vColor + vec3(core * ${coreGlow.toFixed(1)}), alpha * vAlpha);
    }
  `
}

export function createParticleMaterial({ blending = THREE.AdditiveBlending, depthWrite = false, transparent = true, uniforms = {}, vertexShader, fragmentShader } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, ...uniforms },
    vertexShader: vertexShader || pointVertexShader(),
    fragmentShader: fragmentShader || pointFragmentShader(),
    blending,
    depthWrite,
    transparent,
  })
  return mat
}
