import * as THREE from 'three'

const EASING = {
  quarticOut: t => 1 - Math.pow(1 - t, 4),
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  quinticOut: t => 1 - Math.pow(1 - t, 5),
  exponentialOut: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  smoothstep: t => t * t * (3 - 2 * t),
}

export default class CameraEngine {
  constructor(camera, controls) {
    this.camera = camera
    this.controls = controls
    this.isAnimating = false
    this.queue = []

    this._startPos = new THREE.Vector3()
    this._endPos = new THREE.Vector3()
    this._startTarget = new THREE.Vector3()
    this._endTarget = new THREE.Vector3()
    this._progress = 0
    this._duration = 1
    this._easing = EASING.quarticOut
    this._onComplete = null
    this._speed = 1

    this._startFov = 50
    this._endFov = 50
    this._animateFov = false
  }

  enqueue(config) {
    this.queue.push(config)
    if (!this.isAnimating) this._processQueue()
  }

  clearQueue() {
    this.queue = []
    this.isAnimating = false
  }

  _processQueue() {
    if (this.queue.length === 0) {
      this.isAnimating = false
      return
    }
    this.isAnimating = true
    const config = this.queue.shift()
    this._startTransition(config)
  }

  _startTransition(config) {
    this._startPos.copy(this.camera.position)
    this._startTarget.copy(this.controls ? this.controls.target : new THREE.Vector3())

    this._endPos.copy(config.endPos || this.camera.position)
    this._endTarget.copy(config.target || this._startTarget)

    this._duration = config.duration || 1.5
    this._easing = EASING[config.easing] || EASING.quarticOut
    this._onComplete = config.onComplete || null
    this._speed = config.speed || 1
    this._progress = 0

    this._animateFov = config.fov !== undefined
    if (this._animateFov) {
      this._startFov = this.camera.fov
      this._endFov = config.fov
    }

    if (this.controls && config.disableAutoRotate) {
      this.controls.autoRotate = false
    }
  }

  enqueueEntry(clusterPos, clusterRadius = 1.0, duration = 2.0) {
    this.enqueue({
      target: new THREE.Vector3(clusterPos.x, clusterPos.y, clusterPos.z),
      endPos: new THREE.Vector3(
        clusterPos.x + clusterRadius * 0.3,
        clusterPos.y + clusterRadius * 0.15,
        clusterPos.z + clusterRadius * 0.5
      ),
      duration,
      easing: 'quarticOut',
      disableAutoRotate: true,
      onComplete: null,
    })
    return this
  }

  enqueueExit(universePos = new THREE.Vector3(0, 1.5, 7), universeTarget = new THREE.Vector3(0, 0, 0), duration = 2.0) {
    this.enqueue({
      target: universeTarget,
      endPos: universePos,
      duration,
      easing: 'quarticOut',
      disableAutoRotate: false,
      onComplete: null,
    })
    return this
  }

  enqueueFlyTo(pos, target, duration = 1.2, easing = 'quarticOut') {
    this.enqueue({ endPos: pos, target, duration, easing, disableAutoRotate: true })
    return this
  }

  update(delta) {
    if (!this.isAnimating || this.queue.length > 0 && this._progress === 0) return

    this._progress = Math.min(this._progress + delta * this._speed / this._duration, 1)
    const t = this._easing(this._progress)

    this.camera.position.lerpVectors(this._startPos, this._endPos, t)

    if (this.controls) {
      this.controls.target.lerpVectors(this._startTarget, this._endTarget, t)
      this.controls.update()
    }

    if (this._animateFov) {
      this.camera.fov = this._startFov + (this._endFov - this._startFov) * t
      this.camera.updateProjectionMatrix()
    }

    if (this._progress >= 1) {
      this.isAnimating = false
      if (this._onComplete) this._onComplete()
      this._progress = 1
      this._processQueue()
    }
  }
}
