import ambientUrl from '../../../assets/sound/Общий фон.mp3'
import reelSpinUrl from '../../../assets/sound/Вращение барабанов.mp3'
import reelStopUrl from '../../../assets/sound/Остановка слот машины.mp3'
import valuesRevealUrl from '../../../assets/sound/Выпадают значения.mp3'
import valuesDoneUrl from '../../../assets/sound/Значения собраны.mp3'

class MixerSoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private soundBuffers: Map<string, AudioBuffer> = new Map()
  private activeNodes: Set<AudioBufferSourceNode> = new Set()

  private bgNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  private reelSpinNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  private chargeHumNodes: {
    osc: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
    started: boolean
  } | null = null

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.25
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private getMaster(): GainNode {
    this.ensureCtx()
    return this.masterGain!
  }

  private async loadSound(name: string, url: string): Promise<void> {
    if (this.soundBuffers.has(name)) return
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer)
      this.soundBuffers.set(name, audioBuffer)
    } catch (e) {
      console.warn(`[mixerSounds] Failed to load ${name}:`, e)
    }
  }

  private playBuffer(
    name: string,
    opts: { loop?: boolean; volume?: number } = {},
  ): { source: AudioBufferSourceNode; gain: GainNode } | null {
    const buffer = this.soundBuffers.get(name)
    if (!buffer) return null
    const ctx = this.ctx!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = opts.loop ?? false

    const gain = ctx.createGain()
    gain.gain.value = opts.volume ?? 0.5
    gain.connect(this.getMaster())
    source.connect(gain)
    source.start()

    this.activeNodes.add(source)
    source.onended = () => this.activeNodes.delete(source)

    return { source, gain }
  }

  async preloadAll() {
    this.ensureCtx()
    const urls: [string, string][] = [
      ['ambient', ambientUrl],
      ['reelSpin', reelSpinUrl],
      ['reelStop', reelStopUrl],
      ['valuesReveal', valuesRevealUrl],
      ['valuesDone', valuesDoneUrl],
    ]
    await Promise.all(urls.map(([name, url]) => this.loadSound(name, url)))
  }

  async startBgMusic() {
    this.ensureCtx()
    if (this.bgNodes) return
    if (!this.soundBuffers.has('ambient')) {
      await this.loadSound('ambient', ambientUrl)
    }
    const nodes = this.playBuffer('ambient', { loop: true, volume: 0.2 })
    if (nodes) this.bgNodes = nodes
  }

  stopBgMusic() {
    if (!this.bgNodes) return
    try {
      this.bgNodes.source.stop()
    } catch {}
    this.bgNodes.source.disconnect()
    this.bgNodes.gain.disconnect()
    this.bgNodes = null
  }

  startReelSpin() {
    this.ensureCtx()
    if (this.reelSpinNodes) return
    const nodes = this.playBuffer('reelSpin', { loop: true, volume: 0.35 })
    if (nodes) this.reelSpinNodes = nodes
  }

  stopReelSpin() {
    if (!this.reelSpinNodes) return
    const { source, gain } = this.reelSpinNodes
    try {
      gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.08)
      source.stop(this.ctx!.currentTime + 0.08)
    } catch {}
    source.disconnect()
    gain.disconnect()
    this.reelSpinNodes = null
  }

  playReelStop() {
    this.ensureCtx()
    this.playBuffer('reelStop', { volume: 0.5 })
  }

  playValuesReveal() {
    this.ensureCtx()
    this.playBuffer('valuesReveal', { volume: 0.5 })
  }

  playValuesDone() {
    this.ensureCtx()
    this.playBuffer('valuesDone', { volume: 0.6 })
  }

  playMethodSelect() {
    this.ensureCtx()
    const ctx = this.ctx!
    const master = this.getMaster()

    const gain = ctx.createGain()
    gain.connect(master)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.18)
    osc.connect(gain)

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.18)
  }

  startChargeHum() {
    this.ensureCtx()
    if (this.chargeHumNodes) return
    const ctx = this.ctx!
    const master = this.getMaster()

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    filter.connect(master)

    const gain = ctx.createGain()
    gain.gain.value = 0.06
    gain.connect(filter)

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 60
    osc.connect(gain)
    osc.start()

    this.chargeHumNodes = { osc, gain, filter, started: true }
  }

  updateChargeHum(progress: number) {
    if (!this.chargeHumNodes) return
    const freq = 60 + progress * 240
    const vol = 0.06 + progress * 0.1
    this.chargeHumNodes.osc.frequency.setValueAtTime(freq, this.ctx!.currentTime)
    this.chargeHumNodes.gain.gain.setValueAtTime(vol, this.ctx!.currentTime)
    this.chargeHumNodes.filter.frequency.setValueAtTime(200 + progress * 600, this.ctx!.currentTime)
  }

  stopChargeHum() {
    if (!this.chargeHumNodes) return
    const { osc, gain, filter } = this.chargeHumNodes
    try {
      gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.12)
      osc.stop(this.ctx!.currentTime + 0.12)
    } catch {}
    osc.disconnect()
    gain.disconnect()
    filter.disconnect()
    this.chargeHumNodes = null
  }

  playLineComplete() {
    this.ensureCtx()
    const ctx = this.ctx!
    const master = this.getMaster()

    const notes = [523, 659, 784, 1047, 1319]
    const noteDuration = 0.12

    notes.forEach((freq, i) => {
      const gain = ctx.createGain()
      gain.connect(master)
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)

      const t = ctx.currentTime + i * noteDuration
      gain.gain.setValueAtTime(0.28, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  }

  playAnnaAppear() {
    this.ensureCtx()
    const ctx = this.ctx!
    const master = this.getMaster()

    const gain = ctx.createGain()
    gain.connect(master)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 880
    osc.connect(gain)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  }

  dispose() {
    this.stopBgMusic()
    this.stopReelSpin()
    this.stopChargeHum()
    this.activeNodes.forEach((node) => {
      try { node.stop() } catch {}
      node.disconnect()
    })
    this.activeNodes.clear()
    this.soundBuffers.clear()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}

export const mixerSounds = new MixerSoundManager()
