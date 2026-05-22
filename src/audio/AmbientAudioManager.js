import { Howl } from 'howler'

const FADE_IN_DURATION = 5000
const BASE_VOLUME = 0.15

let instance = null

class AmbientAudioManager {
  constructor() {
    this.howl = null
    this.isPlaying = false
    this.volume = BASE_VOLUME
    this.activated = false
    this.fadedIn = false
    this.fadeTimer = null
    this.retryTimer = null
    this._activationHandler = null
    this._layers = []
    this._clusterAmbience = new Map()
  }

  init() {
    if (this.howl) return this

    this.howl = new Howl({
      src: ['/audio/edith-theme.mp3'],
      loop: true,
      autoplay: false,
      volume: 0,
      html5: true,
      preload: true,
      onloaderror: (_id, err) => {
        if (err && !this.retryTimer) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null
            this._retryLoad()
          }, 2000)
        }
      },
      onplayerror: () => {
        if (!this.activated) return
        setTimeout(() => this._tryPlay(), 500)
      },
      onplay: () => {
        this.isPlaying = true
        if (!this.fadedIn) {
          this.fadedIn = true
          this.howl.fade(0, BASE_VOLUME, FADE_IN_DURATION)
        }
      },
      onstop: () => {
        this.isPlaying = false
      },
    })

    this._setupActivation()
    return this
  }

  _setupActivation() {
    if (this.activated || this._activationHandler) return

    const activate = () => {
      if (this.activated) return
      this.activated = true
      this._removeActivationListeners()
      this._tryPlay()
    }

    this._activationHandler = activate
    document.addEventListener('click', activate, { once: true })
    document.addEventListener('touchstart', activate, { once: true })
    document.addEventListener('keydown', activate, { once: true })
  }

  _removeActivationListeners() {
    if (this._activationHandler) {
      document.removeEventListener('click', this._activationHandler)
      document.removeEventListener('touchstart', this._activationHandler)
      document.removeEventListener('keydown', this._activationHandler)
      this._activationHandler = null
    }
  }

  _tryPlay() {
    if (!this.howl) return
    try {
      this.howl.play()
    } catch {
      setTimeout(() => this._tryPlay(), 500)
    }
  }

  _retryLoad() {
    if (this.howl) {
      this.howl.unload()
      this.howl = null
    }
    this.fadedIn = false
    this.init()
  }

  fadeIn(duration = FADE_IN_DURATION, targetVolume = BASE_VOLUME) {
    if (!this.howl) {
      this.volume = targetVolume
      this.init()
      return
    }
    this.volume = targetVolume
    this.fadedIn = false
    this._tryPlay()
  }

  fadeOut(duration = 2000) {
    if (!this.howl) return
    if (this.fadeTimer) clearTimeout(this.fadeTimer)
    this.howl.fade(this.volume, 0, duration)
    this.fadeTimer = setTimeout(() => {
      if (this.howl) this.howl.pause()
      this.isPlaying = false
    }, duration)
  }

  setVolume(vol) {
    if (!this.howl) return
    this.volume = Math.max(0, Math.min(1, vol))
    this.howl.volume(this.volume)
  }

  isLoaded() {
    return this.howl && this.howl.state() === 'loaded'
  }

  destroy() {
    this._removeActivationListeners()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.fadeTimer) clearTimeout(this.fadeTimer)
    if (this.howl) {
      this.howl.stop()
      this.howl.unload()
    }
    this.howl = null
    this.isPlaying = false
    this.activated = false
    this.fadedIn = false
    this._layers = []
    this._clusterAmbience.clear()
  }

  addLayer(name, src, volume = 0.1) {
    this._layers.push({ name, src, volume, howl: null })
  }

  playLayer(name) {
    const layer = this._layers.find(l => l.name === name)
    if (!layer) return
    if (layer.howl) { layer.howl.play(); return }
    layer.howl = new Howl({
      src: [layer.src],
      loop: true,
      volume: 0,
      html5: true,
    })
    layer.howl.once('load', () => {
      layer.howl.fade(0, layer.volume, 2000)
    })
  }

  stopLayer(name) {
    const layer = this._layers.find(l => l.name === name)
    if (!layer || !layer.howl) return
    layer.howl.fade(layer.volume, 0, 2000)
    setTimeout(() => { if (layer.howl) layer.howl.stop() }, 2000)
  }

  setClusterAmbience(clusterId, src, volume = 0.08) {
    this._clusterAmbience.set(clusterId, { src, volume, howl: null })
  }

  enterCluster(clusterId) {
    const ambience = this._clusterAmbience.get(clusterId)
    if (!ambience) return
    if (ambience.howl) { ambience.howl.fade(0, ambience.volume, 2000); return }
    ambience.howl = new Howl({
      src: [ambience.src], loop: true, volume: 0, html5: true,
    })
    ambience.howl.once('load', () => {
      ambience.howl.fade(0, ambience.volume, 2000)
    })
  }

  exitCluster(clusterId) {
    const ambience = this._clusterAmbience.get(clusterId)
    if (!ambience || !ambience.howl) return
    ambience.howl.fade(ambience.volume, 0, 2000)
  }
}

export function getAmbientAudio() {
  if (!instance) {
    instance = new AmbientAudioManager()
  }
  return instance
}

export default getAmbientAudio
