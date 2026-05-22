import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { interactionManager } from '../systems/InteractionManager'

export default function CameraController({ target, cameraEnd, isActive, onComplete, speed = 0.55 }) {
  const { camera, controls } = useThree()
  const animating = useRef(false)
  const startCam = useRef(new THREE.Vector3())
  const endCam = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const endTarget = useRef(new THREE.Vector3())
  const startFov = useRef(50)
  const endFov = useRef(50)
  const progress = useRef(0)
  const wasAutoRotate = useRef(true)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!isActive) return

    completedRef.current = false
    startCam.current.copy(camera.position)
    startTarget.current.copy(controls?.target || new THREE.Vector3(0, 0, 0))
    endCam.current.copy(cameraEnd)
    endTarget.current.copy(target)
    startFov.current = camera.fov
    endFov.current = 45
    progress.current = 0
    animating.current = true

    interactionManager.startTransition()

    if (controls) {
      wasAutoRotate.current = controls.autoRotate
      controls.autoRotate = false
      controls.enablePan = false
      controls.enableZoom = false
      controls.rotateSpeed = 0
    }
  }, [isActive, target, cameraEnd, camera, controls])

  useFrame((_, delta) => {
    if (!animating.current) return

    progress.current = Math.min(progress.current + delta * speed, 1)

    const t1 = 1 - Math.pow(1 - progress.current, 4)
    const t2 = progress.current < 0.5
      ? 2 * progress.current * progress.current
      : 1 - Math.pow(-2 * progress.current + 2, 2) / 2
    const t = t2

    camera.position.lerpVectors(startCam.current, endCam.current, t)
    camera.fov = startFov.current + (endFov.current - startFov.current) * t1
    camera.updateProjectionMatrix()

    if (controls) {
      controls.target.lerpVectors(startTarget.current, endTarget.current, t)
      controls.update()
    }

    if (progress.current >= 1 && !completedRef.current) {
      completedRef.current = true
      animating.current = false
      if (controls) {
        controls.autoRotate = false
        controls.enablePan = true
        controls.enableZoom = true
        controls.rotateSpeed = 0.3
      }
      interactionManager.endTransition()
      if (onComplete) onComplete()
    }
  })

  return null
}
