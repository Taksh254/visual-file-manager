export const STATE = Object.freeze({
  UNIVERSE: 'UNIVERSE',
  APPROACHING_CLUSTER: 'APPROACHING_CLUSTER',
  IN_CLUSTER: 'IN_CLUSTER',
  APPROACHING_FILE: 'APPROACHING_FILE',
  IN_FILE: 'IN_FILE',
})

const TRANSITIONS = {
  [STATE.UNIVERSE]: [STATE.APPROACHING_CLUSTER],
  [STATE.APPROACHING_CLUSTER]: [STATE.IN_CLUSTER, STATE.UNIVERSE],
  [STATE.IN_CLUSTER]: [STATE.APPROACHING_FILE, STATE.APPROACHING_CLUSTER, STATE.UNIVERSE],
  [STATE.APPROACHING_FILE]: [STATE.IN_FILE, STATE.IN_CLUSTER],
  [STATE.IN_FILE]: [STATE.IN_CLUSTER, STATE.APPROACHING_CLUSTER, STATE.UNIVERSE],
}

export default class TransitionManager {
  constructor() {
    this.state = STATE.UNIVERSE
    this.previousState = null
    this.activeClusterId = null
    this.activeFileIndex = null
    this.listeners = new Map()
  }

  get isInUniverse() { return this.state === STATE.UNIVERSE }
  get isInCluster() { return this.state === STATE.IN_CLUSTER }
  get isInFile() { return this.state === STATE.IN_FILE }
  get isTransitioning() { return this.state === STATE.APPROACHING_CLUSTER || this.state === STATE.APPROACHING_FILE }
  get clusterId() { return this.activeClusterId }

  canTransitionTo(nextState) {
    const allowed = TRANSITIONS[this.state]
    return allowed && allowed.includes(nextState)
  }

  requestTransition(nextState, clusterId = null, fileIndex = null) {
    if (!this.canTransitionTo(nextState)) {
      console.warn(`TransitionManager: Cannot transition from ${this.state} to ${nextState}`)
      return false
    }

    this.previousState = this.state
    this.state = nextState

    if (nextState === STATE.APPROACHING_CLUSTER || nextState === STATE.IN_CLUSTER) {
      this.activeClusterId = clusterId
    }
    if (nextState === STATE.APPROACHING_FILE || nextState === STATE.IN_FILE) {
      this.activeFileIndex = fileIndex
    }
    if (nextState === STATE.UNIVERSE) {
      this.activeClusterId = null
      this.activeFileIndex = null
    }

    this._notify(nextState)
    return true
  }

  enterCluster(clusterId) {
    this.requestTransition(STATE.APPROACHING_CLUSTER, clusterId)
  }

  confirmClusterEntry() {
    this.requestTransition(STATE.IN_CLUSTER, this.activeClusterId)
  }

  exitToUniverse() {
    this.requestTransition(STATE.UNIVERSE)
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

  _notify(state) {
    const fns = this.listeners.get(state)
    if (fns) fns.forEach(fn => fn({
      state,
      clusterId: this.activeClusterId,
      fileIndex: this.activeFileIndex,
      previousState: this.previousState,
    }))
  }
}

export const transitionManager = new TransitionManager()
