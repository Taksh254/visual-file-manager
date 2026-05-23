const FADE_DURATION = 3000
const BASE_VOLUME = 0.15

let instance = null

class AmbientAudioManager {
  constructor() {
    this.audio = null
    this.audioCtx = null
    this.gainNode = null
    this.sourceNode = null
    this.isPlaying = false
    this.targetVolume = BASE_VOLUME
    this.activated = false
    this.userGestureHandler = null
  }

  init() {
    if (this.audio) return this

    this.audio = new Audio('/audio/oryn-theme.mp3')
    this.audio.loop = true
    this.audio.volume = 0
    this.audio.preload = 'auto'

    this.audio.addEventListener('canplaythrough', () => {
      this._setupUserActivation()
    }, { once: true })

    this.audio.addEventListener('error', () => {
      setTimeout(() => {
        if (this.audio) {
          this.audio.load()
        }
      }, 3000)
    })

    this.audio.load()

    return this
  }

  _setupUserActivation() {
    if (this.activated) return

    const tryPlay = () => {
      this.activated = true
      this._removeUserActivationListeners()
      this._playWithFade()
    }

    this.userGestureHandler = tryPlay
    document.addEventListener('click', tryPlay, { once: true })
    document.addEventListener('touchstart', tryPlay, { once: true })
    document.addEventListener('keydown', tryPlay, { once: true })

    this._tryImmediatePlay()
  }

  _tryImmediatePlay() {
    if (!this.audio) return
    const playPromise = this.audio.play()
    if (playPromise) {
      playPromise.then(() => {
        this.activated = true
        this._removeUserActivationListeners()
        this._playWithFade()
      }).catch(() => {
      })
    }
  }

  _removeUserActivationListeners() {
    if (this.userGestureHandler) {
      document.removeEventListener('click', this.userGestureHandler)
      document.removeEventListener('touchstart', this.userGestureHandler)
      document.removeEventListener('keydown', this.userGestureHandler)
      this.userGestureHandler = null
    }
  }

  _playWithFade() {
    if (!this.audio || this.isPlaying) return

    this.isPlaying = true
    this.audio.volume = 0

    const playPromise = this.audio.play()
    if (playPromise) {
      playPromise.catch(() => {
        this.isPlaying = false
        setTimeout(() => this._playWithFade(), 1000)
      })
    }

    this._fadeIn()
  }

  _fadeIn() {
    if (!this.audio) return

    const targetVol = this.targetVolume
    const startTime = performance.now()

    const step = (now) => {
      if (!this.audio) return
      const elapsed = now - startTime
      const progress = Math.min(elapsed / FADE_DURATION, 1)
      this.audio.volume = targetVol * progress
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }

  fadeOut(duration = 2000) {
    if (!this.audio || !this.isPlaying) return

    const startVol = this.audio.volume
    const startTime = performance.now()

    const step = (now) => {
      if (!this.audio) return
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      this.audio.volume = startVol * (1 - progress)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        this.audio.pause()
        this.isPlaying = false
      }
    }

    requestAnimationFrame(step)
  }

  setVolume(vol) {
    this.targetVolume = Math.max(0, Math.min(1, vol))
    if (this.audio) {
      this.audio.volume = this.targetVolume
    }
  }

  destroy() {
    this._removeUserActivationListeners()
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio.load()
    }
    this.audio = null
    this.isPlaying = false
    this.activated = false
  }
}

export function getAmbientAudio() {
  if (!instance) {
    instance = new AmbientAudioManager()
  }
  return instance
}

export default getAmbientAudio
