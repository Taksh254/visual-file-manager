import * as THREE from 'three'

class MinimapSync {
  constructor() {
    this.cameraPosition = new THREE.Vector3(0, 2, 8)
    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.cameraQuaternion = new THREE.Quaternion()
    this.cameraUp = new THREE.Vector3(0, 1, 0)
    this.activeClusterId = null
    this.listeners = new Set()
  }

  update(camera, controls) {
    this.cameraPosition.copy(camera.position)
    this.cameraTarget.copy(controls.target)
    this.cameraQuaternion.copy(camera.quaternion)
    this.cameraUp.copy(camera.up)
    this._notify()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  _notify() {
    for (const fn of this.listeners) fn()
  }
}

export const minimapSync = new MinimapSync()
