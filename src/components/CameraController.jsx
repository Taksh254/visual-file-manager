import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useUniverseStore from '../store/useUniverseStore'
import { interactionManager } from '../systems/InteractionManager'

const BREATHE_AMP = 0.015
const BREATHE_SPEED = 0.3
const INERTIA = 0.92

export default function CameraController() {
  const cameraConfig = useUniverseStore(s => s.cameraConfig)
  const handleCameraComplete = useUniverseStore(s => s.handleCameraComplete)
  const activeClusterId = useUniverseStore(s => s.activeClusterId)

  const { camera, controls } = useThree()
  const animating = useRef(false)
  const startCam = useRef(new THREE.Vector3())
  const endCam = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const endTarget = useRef(new THREE.Vector3())
  const startFov = useRef(50)
  const endFov = useRef(50)
  const progress = useRef(0)
  const speedRef = useRef(0.55)
  const completedRef = useRef(false)
  const settled = useRef(false)
  const breathePhase = useRef(Math.random() * Math.PI * 2)
  const basePos = useRef(new THREE.Vector3())
  const baseTarget = useRef(new THREE.Vector3())
  const velocity = useRef(new THREE.Vector3())
  const idleTimer = useRef(0)

  useEffect(() => {
    if (!cameraConfig.isActive) return

    completedRef.current = false
    settled.current = false
    startCam.current.copy(camera.position)
    startTarget.current.copy(controls?.target || new THREE.Vector3(0, 0, 0))
    endCam.current.copy(cameraConfig.endPos)
    endTarget.current.copy(cameraConfig.target)
    startFov.current = camera.fov
    endFov.current = 45
    progress.current = 0
    animating.current = true
    speedRef.current = 0.55
    velocity.current.set(0, 0, 0)

    interactionManager.startTransition()

    if (controls) {
      controls.autoRotate = false
      controls.enablePan = false
      controls.enableZoom = false
      controls.rotateSpeed = 0
    }
  }, [cameraConfig.isActive, camera, controls])

  useFrame((_, delta) => {
    const t = performance.now() / 1000

    if (animating.current) {
      progress.current = Math.min(progress.current + delta * speedRef.current, 1)

      const t1 = 1 - Math.pow(1 - progress.current, 4)
      const t2 = progress.current < 0.5
        ? 2 * progress.current * progress.current
        : 1 - Math.pow(-2 * progress.current + 2, 2) / 2
      const ease = t2

      camera.position.lerpVectors(startCam.current, endCam.current, ease)
      camera.fov = startFov.current + (endFov.current - startFov.current) * t1
      camera.updateProjectionMatrix()

      if (controls) {
        controls.target.lerpVectors(startTarget.current, endTarget.current, ease)
        controls.update()
      }

      if (progress.current >= 1 && !completedRef.current) {
        completedRef.current = true
        animating.current = false
        basePos.current.copy(camera.position)
        baseTarget.current.copy(controls?.target || new THREE.Vector3(0, 0, 0))

        if (controls) {
          controls.autoRotate = false
          controls.enablePan = true
          controls.enableZoom = true
          controls.rotateSpeed = 0.3
        }
        interactionManager.endTransition()
        handleCameraComplete()
        settled.current = true
        idleTimer.current = 0
      }
      return
    }

    if (!settled.current) return

    const breathe = Math.sin(t * BREATHE_SPEED + breathePhase.current) * BREATHE_AMP
    const breatheZ = Math.cos(t * BREATHE_SPEED * 0.7 + breathePhase.current) * BREATHE_AMP
    const breatheY = Math.sin(t * BREATHE_SPEED * 0.5 + breathePhase.current * 1.3) * BREATHE_AMP * 0.5

    if (activeClusterId !== null) {
      const targetPos = new THREE.Vector3(
        basePos.current.x + breathe,
        basePos.current.y + breatheY,
        basePos.current.z + breatheZ,
      )
      velocity.current.lerp(
        targetPos.clone().sub(camera.position).multiplyScalar(0.04),
        INERTIA,
      )
      camera.position.add(velocity.current)

      if (controls) {
        const bt = baseTarget.current.clone()
        bt.y += Math.sin(t * BREATHE_SPEED * 0.3 + breathePhase.current) * BREATHE_AMP * 0.3
        controls.target.lerp(bt, 0.02)
        controls.update()
      }

      idleTimer.current = 0
    } else {
      idleTimer.current += delta
      if (idleTimer.current > 4 && controls) {
        const rotSpeed = 0.05 + Math.min((idleTimer.current - 4) * 0.01, 0.1)
        controls.autoRotate = true
        controls.autoRotateSpeed = rotSpeed
      }
    }

    camera.fov += (45 - camera.fov) * 0.01
    camera.updateProjectionMatrix()
  })

  return null
}
