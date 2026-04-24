import { EQ_BANDS } from '@/types/media'
import { loadEQGains, saveEQGains } from '@/lib/store'
import Hls from 'hls.js'

export class AudioEngine {
  audio: HTMLAudioElement
  private ctx: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private eqFilters: BiquadFilterNode[] = []
  private gainNode: GainNode | null = null
  private hls: Hls | null = null
  private _eqEnabled = false

  constructor() {
    this.audio = new Audio()
    this.audio.preload = 'none'
    this.audio.crossOrigin = 'anonymous'
  }

  private ensureContext() {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.sourceNode = this.ctx.createMediaElementSource(this.audio)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    this.gainNode = this.ctx.createGain()

    this.eqFilters = EQ_BANDS.map((freq, i) => {
      const filter = this.ctx!.createBiquadFilter()
      if (i === 0) filter.type = 'lowshelf'
      else if (i === EQ_BANDS.length - 1) filter.type = 'highshelf'
      else filter.type = 'peaking'
      filter.frequency.value = freq
      filter.Q.value = 1.4
      filter.gain.value = 0
      return filter
    })

    const saved = loadEQGains()
    if (saved) {
      saved.forEach((g, i) => {
        if (this.eqFilters[i]) this.eqFilters[i].gain.value = g
      })
      this._eqEnabled = saved.some(g => g !== 0)
    }

    this.rebuildChain()
  }

  private rebuildChain() {
    if (!this.ctx || !this.sourceNode || !this.analyser || !this.gainNode) return
    this.sourceNode.disconnect()

    if (this._eqEnabled && this.eqFilters.length > 0) {
      this.sourceNode.connect(this.eqFilters[0])
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].disconnect()
        this.eqFilters[i].connect(this.eqFilters[i + 1])
      }
      this.eqFilters[this.eqFilters.length - 1].disconnect()
      this.eqFilters[this.eqFilters.length - 1].connect(this.analyser)
    } else {
      this.sourceNode.connect(this.analyser)
    }

    this.analyser.disconnect()
    this.analyser.connect(this.gainNode)
    this.gainNode.disconnect()
    this.gainNode.connect(this.ctx.destination)
  }

  resumeContext() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  get eqEnabled() { return this._eqEnabled }

  setEQEnabled(enabled: boolean) {
    this._eqEnabled = enabled
    if (this.ctx) this.rebuildChain()
  }

  setEQBand(index: number, gain: number) {
    this.ensureContext()
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.value = gain
    }
    this.saveCurrentEQ()
  }

  setEQGains(gains: number[]) {
    this.ensureContext()
    gains.forEach((g, i) => {
      if (this.eqFilters[i]) this.eqFilters[i].gain.value = g
    })
    this.saveCurrentEQ()
  }

  getEQGains(): number[] {
    return this.eqFilters.map(f => f.gain.value)
  }

  private saveCurrentEQ() {
    const gains = this.getEQGains()
    saveEQGains(gains)
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getAnalyser(): AnalyserNode | null {
    this.ensureContext()
    return this.analyser
  }

  setVolume(v: number) {
    this.audio.volume = v / 100
  }

  teardownHls() {
    if (this.hls) {
      try { this.hls.destroy() } catch { /* noop */ }
      this.hls = null
    }
  }

  stop() {
    this.teardownHls()
    try { this.audio.pause() } catch { /* noop */ }
    this.audio.removeAttribute('src')
    this.audio.load()
  }

  async playDirectUrl(url: string) {
    this.ensureContext()
    this.resumeContext()
    this.teardownHls()
    this.audio.src = url
    await this.audio.play()
  }

  async playHls(m3u8Url: string): Promise<void> {
    this.ensureContext()
    this.resumeContext()
    this.teardownHls()

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 })
      this.hls = hls
      return new Promise((resolve, reject) => {
        let settled = false
        const done = (err?: Error) => {
          if (settled) return
          settled = true
          if (err) reject(err); else resolve()
        }
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data?.fatal) done(new Error('HLS fatal: ' + (data.details || data.type || '')))
        })
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.audio.play().then(() => done()).catch(done)
        })
        hls.loadSource(m3u8Url)
        hls.attachMedia(this.audio)
      })
    }

    if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
      this.audio.src = m3u8Url
      return this.audio.play()
    }

    throw new Error('Browser does not support HLS')
  }
}

export const audioEngine = new AudioEngine()
