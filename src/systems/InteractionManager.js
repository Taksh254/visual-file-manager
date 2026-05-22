export const INTENT = Object.freeze({
  IDLE: 'idle',
  INTENT: 'intent',
  HOVERED: 'hovered',
  FOCUSED: 'focused',
  SELECTED: 'selected',
  TRANSITIONING: 'transitioning',
})

export default class InteractionManager {
  constructor() {
    this.clusterStates = new Map()
    this.hoverTimers = new Map()
    this.isTransitioning = false
    this.focusedClusterId = null
    this.intentDelay = 180
    this.listeners = new Map()
  }

  getClusterState(clusterId) {
    return this.clusterStates.get(clusterId) || INTENT.IDLE
  }

  pointerEnter(clusterId) {
    if (this.isTransitioning) return
    if (this.focusedClusterId !== null && this.focusedClusterId !== clusterId) return

    if (this.hoverTimers.has(clusterId)) {
      clearTimeout(this.hoverTimers.get(clusterId))
    }

    const currentState = this.clusterStates.get(clusterId)
    if (currentState === INTENT.FOCUSED || currentState === INTENT.SELECTED) return

    this.hoverTimers.set(clusterId, setTimeout(() => {
      if (this.clusterStates.get(clusterId) === INTENT.INTENT || !this.clusterStates.has(clusterId)) {
        this._setState(clusterId, INTENT.HOVERED)
        document.body.style.cursor = 'pointer'
      }
    }, this.intentDelay))

    this._setState(clusterId, INTENT.INTENT)
  }

  pointerLeave(clusterId) {
    if (this.hoverTimers.has(clusterId)) {
      clearTimeout(this.hoverTimers.get(clusterId))
      this.hoverTimers.delete(clusterId)
    }

    const currentState = this.clusterStates.get(clusterId)
    if (currentState === INTENT.FOCUSED || currentState === INTENT.SELECTED) return
    if (currentState === INTENT.INTENT) {
      this.clusterStates.delete(clusterId)
      this._notify(clusterId, INTENT.IDLE)
      return
    }

    this._setState(clusterId, INTENT.IDLE)
    document.body.style.cursor = 'default'
  }

  click(clusterId) {
    if (this.isTransitioning) return false
    if (clusterId === undefined || clusterId === null) return false

    this._setState(clusterId, INTENT.FOCUSED)
    this.focusedClusterId = clusterId
    return true
  }

  deselectAll() {
    for (const [id] of this.clusterStates) {
      if (id !== this.focusedClusterId) {
        this.clusterStates.delete(id)
      }
    }
    if (this.focusedClusterId !== null) {
      this._setState(this.focusedClusterId, INTENT.IDLE)
      this.focusedClusterId = null
    }
  }

  startTransition() {
    this.isTransitioning = true
    for (const id of this.hoverTimers.keys()) {
      clearTimeout(this.hoverTimers.get(id))
    }
    this.hoverTimers.clear()
  }

  endTransition() {
    this.isTransitioning = false
    this.focusedClusterId = null
    for (const [id] of this.clusterStates) {
      this.clusterStates.delete(id)
    }
  }

  reset() {
    for (const id of this.hoverTimers.keys()) {
      clearTimeout(this.hoverTimers.get(id))
    }
    this.hoverTimers.clear()
    this.clusterStates.clear()
    this.focusedClusterId = null
    this.isTransitioning = false
    document.body.style.cursor = 'default'
  }

  _setState(clusterId, state) {
    const prev = this.clusterStates.get(clusterId) || INTENT.IDLE
    if (prev === state) return
    this.clusterStates.set(clusterId, state)
    this._notify(clusterId, state, prev)
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(fn)
    return () => {
      const arr = this.listeners.get(event)
      if (arr) {
        const i = arr.indexOf(fn)
        if (i !== -1) arr.splice(i, 1)
      }
    }
  }

  _notify(clusterId, state, prevState) {
    const fns = this.listeners.get('change')
    if (fns) fns.forEach(fn => fn({ clusterId, state, prevState }))
  }
}

export const interactionManager = new InteractionManager()
