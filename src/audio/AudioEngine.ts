/**
 * Everything is synthesised with the Web Audio API: no sample files.
 * Buses: music, ambience (crowd + wok sizzle) and sfx, all into a master gain.
 */
export type Sfx =
  | 'slide'
  | 'select'
  | 'jual'
  | 'cilok'
  | 'coin'
  | 'pass'
  | 'collect'
  | 'ui'
  | 'gong'
  | 'bell'
  | 'pusing'
  | 'error'

export interface Mix {
  master: number
  music: number
  sfx: number
  ambience: number
  musicOn: boolean
  sfxOn: boolean
}

// F major kroncong-style progressions, one chord per bar.
const CHORDS: Record<string, number[]> = {
  F: [53, 57, 60],
  F7: [53, 57, 60, 63],
  Bb: [58, 62, 65],
  C7: [48, 52, 55, 58],
  Dm: [50, 53, 57],
  Gm: [55, 58, 62],
  A7: [57, 61, 64, 67],
}
const PROGRESSION = ['F', 'F', 'C7', 'C7', 'F', 'Bb', 'C7', 'F', 'F', 'Dm', 'Gm', 'C7', 'F', 'F7', 'Bb', 'C7', 'A7', 'Dm', 'Gm', 'C7']
const SCALE = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17]
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambBus!: GainNode
  private noise!: AudioBuffer
  private brown!: AudioBuffer
  private reverb!: ConvolverNode
  private reverbSend!: GainNode
  private mix: Mix = { master: 0.8, music: 0.5, sfx: 0.8, ambience: 0.45, musicOn: true, sfxOn: true }

  private schedulerId: number | null = null
  private nextStepTime = 0
  private step = 0
  private melodyNote = 7
  private ambienceNodes: AudioNode[] = []
  private chatterId: number | null = null

  get ready() {
    return !!this.ctx
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.connect(ctx.destination)
      this.musicBus = ctx.createGain()
      this.sfxBus = ctx.createGain()
      this.ambBus = ctx.createGain()
      this.musicBus.connect(this.master)
      this.sfxBus.connect(this.master)
      this.ambBus.connect(this.master)
      this.noise = this.makeNoise(false)
      this.brown = this.makeNoise(true)
      this.reverb = ctx.createConvolver()
      this.reverb.buffer = this.makeImpulse(1.8)
      this.reverbSend = ctx.createGain()
      this.reverbSend.gain.value = 0.22
      this.reverbSend.connect(this.reverb)
      this.reverb.connect(this.master)
      this.applyMix()
      this.startAmbience()
      if (this.mix.musicOn) this.startMusic()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMix(mix: Mix) {
    const wasOn = this.mix.musicOn
    this.mix = mix
    if (!this.ctx) return
    this.applyMix()
    if (mix.musicOn && !wasOn) this.startMusic()
    if (!mix.musicOn && wasOn) this.stopMusic()
  }

  private applyMix() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.mix.master, t, 0.05)
    this.musicBus.gain.setTargetAtTime(this.mix.musicOn ? this.mix.music * 0.55 : 0, t, 0.2)
    this.sfxBus.gain.setTargetAtTime(this.mix.sfxOn ? this.mix.sfx : 0, t, 0.05)
    this.ambBus.gain.setTargetAtTime(this.mix.ambience * 0.6, t, 0.3)
  }

  private makeNoise(brown: boolean): AudioBuffer {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      if (brown) {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else d[i] = w
    }
    return buf
  }

  private makeImpulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate * seconds
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    return buf
  }

  // ───────────────────────── building blocks ─────────────────────────

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  private tone(
    out: AudioNode,
    t: number,
    freq: number,
    opts: { type?: OscillatorType; peak?: number; attack?: number; decay?: number; glideTo?: number; send?: boolean } = {},
  ) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(freq, t)
    if (opts.glideTo) o.frequency.exponentialRampToValueAtTime(opts.glideTo, t + (opts.decay ?? 0.2))
    const attack = opts.attack ?? 0.004
    const decay = opts.decay ?? 0.2
    this.env(g, t, opts.peak ?? 0.3, attack, decay)
    o.connect(g)
    g.connect(out)
    if (opts.send) g.connect(this.reverbSend)
    o.start(t)
    o.stop(t + attack + decay + 0.05)
  }

  private noiseBurst(
    out: AudioNode,
    t: number,
    opts: { type?: BiquadFilterType; freq?: number; freqTo?: number; q?: number; peak?: number; attack?: number; decay?: number; brown?: boolean; send?: boolean },
  ) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = opts.brown ? this.brown : this.noise
    const f = ctx.createBiquadFilter()
    f.type = opts.type ?? 'bandpass'
    f.frequency.setValueAtTime(opts.freq ?? 2000, t)
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + (opts.decay ?? 0.1))
    f.Q.value = opts.q ?? 1
    const g = ctx.createGain()
    const attack = opts.attack ?? 0.003
    const decay = opts.decay ?? 0.1
    this.env(g, t, opts.peak ?? 0.3, attack, decay)
    src.connect(f)
    f.connect(g)
    g.connect(out)
    if (opts.send) g.connect(this.reverbSend)
    src.start(t, Math.random() * 2)
    src.stop(t + attack + decay + 0.05)
  }

  private metalHit(t: number, base: number, peak: number, decay: number) {
    for (const [ratio, amp] of [
      [1, 1],
      [2.76, 0.6],
      [5.4, 0.35],
      [8.93, 0.2],
    ]) {
      this.tone(this.sfxBus, t, base * ratio, { peak: peak * amp, decay: decay / ratio ** 0.3, send: true })
    }
  }

  private thud(t: number, peak = 0.5) {
    this.tone(this.sfxBus, t, 150, { glideTo: 55, peak, decay: 0.14 })
    this.noiseBurst(this.sfxBus, t, { type: 'lowpass', freq: 900, peak: peak * 0.5, decay: 0.06 })
  }

  // ───────────────────────── sound effects ─────────────────────────

  play(name: Sfx, delay = 0) {
    if (!this.ctx || !this.mix.sfxOn) return
    const t = this.ctx.currentTime + delay + 0.01
    switch (name) {
      case 'slide':
        this.noiseBurst(this.sfxBus, t, { freq: 3200, freqTo: 900, q: 0.8, peak: 0.22, attack: 0.02, decay: 0.13 })
        this.thud(t + 0.1, 0.32)
        break
      case 'select':
        this.noiseBurst(this.sfxBus, t, { type: 'highpass', freq: 2500, peak: 0.12, decay: 0.04 })
        this.tone(this.sfxBus, t, 1400, { peak: 0.05, decay: 0.05 })
        break
      case 'jual': {
        this.thud(t, 0.75)
        this.noiseBurst(this.sfxBus, t, { type: 'highpass', freq: 3000, peak: 0.25, decay: 0.25, send: true })
        for (let i = 0; i < 6; i++) this.metalHit(t + 0.02 + Math.random() * 0.22, 700 + Math.random() * 900, 0.09, 0.35)
        break
      }
      case 'cilok':
        this.noiseBurst(this.sfxBus, t, { freq: 700, freqTo: 4500, q: 1.4, peak: 0.25, attack: 0.04, decay: 0.16 })
        this.metalHit(t + 0.14, 2350, 0.16, 0.45)
        this.metalHit(t + 0.2, 3100, 0.1, 0.35)
        break
      case 'coin': {
        const bounces = [0, 0.16, 0.28, 0.36, 0.42, 0.46]
        bounces.forEach((b, i) => this.metalHit(t + b, 2900 + Math.random() * 300, 0.14 * (1 - i / 7), 0.25))
        break
      }
      case 'pass':
        this.tone(this.sfxBus, t, 220, { glideTo: 140, peak: 0.25, decay: 0.12 })
        this.tone(this.sfxBus, t + 0.12, 200, { glideTo: 120, peak: 0.18, decay: 0.12 })
        break
      case 'collect':
        for (let i = 0; i < 4; i++) {
          this.noiseBurst(this.sfxBus, t + i * 0.07, { freq: 2600, freqTo: 1100, peak: 0.13, attack: 0.01, decay: 0.08 })
        }
        this.metalHit(t + 0.3, 1650, 0.12, 0.6)
        break
      case 'ui':
        this.tone(this.sfxBus, t, 1046, { peak: 0.2, decay: 0.09 })
        this.tone(this.sfxBus, t, 2093, { peak: 0.06, decay: 0.05 })
        this.noiseBurst(this.sfxBus, t, { freq: 1800, q: 4, peak: 0.12, decay: 0.03 })
        break
      case 'gong':
        for (const [f, a] of [
          [98, 0.5],
          [99.5, 0.3],
          [196.7, 0.22],
          [293, 0.14],
          [415, 0.1],
          [560, 0.06],
        ]) {
          this.tone(this.sfxBus, t, f, { peak: a, attack: 0.01, decay: 3.6, glideTo: f * 0.985, send: true })
        }
        this.noiseBurst(this.sfxBus, t, { type: 'lowpass', freq: 600, peak: 0.3, decay: 0.15 })
        break
      case 'bell':
        for (const [r, a] of [
          [1, 0.3],
          [2, 0.14],
          [2.76, 0.12],
          [5.4, 0.06],
        ]) {
          this.tone(this.sfxBus, t, 880 * r, { peak: a, decay: 1.6, send: true })
        }
        break
      case 'pusing':
        this.noiseBurst(this.sfxBus, t, { freq: 400, freqTo: 3000, q: 2, peak: 0.25, attack: 0.15, decay: 0.3 })
        this.tone(this.sfxBus, t, 330, { glideTo: 660, type: 'triangle', peak: 0.12, attack: 0.05, decay: 0.4, send: true })
        this.play('bell', 0.35 + delay)
        break
      case 'error':
        this.tone(this.sfxBus, t, 160, { type: 'square', peak: 0.06, decay: 0.12 })
        break
    }
  }

  // ───────────────────────── kroncong BGM ─────────────────────────

  private startMusic() {
    if (!this.ctx || this.schedulerId !== null) return
    this.nextStepTime = this.ctx.currentTime + 0.1
    this.step = 0
    this.schedulerId = window.setInterval(() => this.schedule(), 25)
  }

  private stopMusic() {
    if (this.schedulerId !== null) window.clearInterval(this.schedulerId)
    this.schedulerId = null
  }

  private schedule() {
    const ctx = this.ctx!
    const sixteenth = 60 / 104 / 4
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextStepTime, sixteenth)
      this.nextStepTime += sixteenth
      this.step++
    }
  }

  private pluck(t: number, midi: number, peak: number, bright: number, decay: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = mtof(midi)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(bright, t)
    f.frequency.exponentialRampToValueAtTime(300, t + decay)
    const g = ctx.createGain()
    this.env(g, t, peak, 0.003, decay)
    o.connect(f)
    f.connect(g)
    g.connect(this.musicBus)
    o.start(t)
    o.stop(t + decay + 0.05)
  }

  private playStep(step: number, t: number, sixteenth: number) {
    const bar = Math.floor(step / 16) % PROGRESSION.length
    const pos = step % 16
    const chord = CHORDS[PROGRESSION[bar]]
    const root = chord[0]

    // "Cak": bright ukulele chop on the off-beat eighths.
    if (pos % 4 === 2) chord.forEach((n, i) => this.pluck(t + i * 0.008, n + 12, 0.035, 4200, 0.12))
    // "Cuk": lower interlocking strum on the sixteenth after each beat.
    if (pos % 4 === 1 || pos % 4 === 3) chord.slice(0, 3).forEach((n) => this.pluck(t, n, 0.022, 2200, 0.09))
    // Plucked cello bass: root and fifth, with a walking approach on beat 4.
    if (pos % 4 === 0) {
      const beat = pos / 4
      const nextRoot = CHORDS[PROGRESSION[(bar + 1) % PROGRESSION.length]][0]
      const note = beat === 0 ? root : beat === 1 ? root + 7 : beat === 2 ? root : nextRoot - 1
      this.tone(this.musicBus, t, mtof(note - 12), { type: 'triangle', peak: 0.22, decay: 0.32 })
      this.tone(this.musicBus, t, mtof(note), { peak: 0.06, decay: 0.2 })
    }
    // Brushes on 2 and 4.
    if (pos === 4 || pos === 12) this.noiseBurst(this.musicBus, t, { type: 'highpass', freq: 5000, peak: 0.05, attack: 0.01, decay: 0.12 })

    // Flute melody: stepwise wander that leans on chord tones.
    if (pos % 4 === 0 && Math.random() < (pos === 0 ? 0.95 : 0.55)) {
      const move = [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]
      this.melodyNote = Math.max(2, Math.min(SCALE.length - 1, this.melodyNote + move))
      let midi = 65 + SCALE[this.melodyNote]
      if (pos === 0) {
        const tones = chord.map((n) => n + 12)
        midi = tones.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a))
      }
      const len = sixteenth * (Math.random() < 0.4 ? 8 : 4)
      this.flute(t, midi, len)
    }
  }

  private flute(t: number, midi: number, len: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = mtof(midi)
    const vib = ctx.createOscillator()
    vib.frequency.value = 5.2
    const vibAmt = ctx.createGain()
    vibAmt.gain.value = mtof(midi) * 0.006
    vib.connect(vibAmt)
    vibAmt.connect(o.frequency)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.06)
    g.gain.setValueAtTime(0.06, t + len * 0.7)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    const breath = ctx.createBufferSource()
    breath.buffer = this.noise
    const bf = ctx.createBiquadFilter()
    bf.type = 'bandpass'
    bf.frequency.value = mtof(midi) * 2
    bf.Q.value = 8
    const bg = ctx.createGain()
    bg.gain.value = 0.15
    breath.connect(bf)
    bf.connect(bg)
    bg.connect(g)
    o.connect(g)
    g.connect(this.musicBus)
    g.connect(this.reverbSend)
    for (const n of [o, vib, breath]) {
      n.start(t, n === breath ? Math.random() : undefined)
      n.stop(t + len + 0.05)
    }
  }

  // ───────────────────────── ambience ─────────────────────────

  private startAmbience() {
    const ctx = this.ctx!
    // Crowd murmur: brown noise through a voice-band filter, slowly swelling.
    const crowd = ctx.createBufferSource()
    crowd.buffer = this.brown
    crowd.loop = true
    const cf = ctx.createBiquadFilter()
    cf.type = 'bandpass'
    cf.frequency.value = 650
    cf.Q.value = 0.7
    const cg = ctx.createGain()
    cg.gain.value = 0.35
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.13
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 0.12
    lfo.connect(lfoAmt)
    lfoAmt.connect(cg.gain)
    crowd.connect(cf)
    cf.connect(cg)
    cg.connect(this.ambBus)

    // Wok sizzle: hissing high noise with random crackles.
    const sizzle = ctx.createBufferSource()
    sizzle.buffer = this.noise
    sizzle.loop = true
    const sf = ctx.createBiquadFilter()
    sf.type = 'highpass'
    sf.frequency.value = 5500
    const sg = ctx.createGain()
    sg.gain.value = 0.035
    const slfo = ctx.createOscillator()
    slfo.frequency.value = 0.07
    const slfoAmt = ctx.createGain()
    slfoAmt.gain.value = 0.025
    slfo.connect(slfoAmt)
    slfoAmt.connect(sg.gain)
    sizzle.connect(sf)
    sf.connect(sg)
    sg.connect(this.ambBus)

    crowd.start()
    sizzle.start()
    lfo.start()
    slfo.start()
    this.ambienceNodes = [crowd, sizzle, lfo, slfo]

    // Distant voices calling out and oil crackles.
    const tick = () => {
      if (!this.ctx) return
      const t = this.ctx.currentTime
      if (Math.random() < 0.55) this.voice(t)
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.6) {
          this.noiseBurst(this.ambBus, t + Math.random() * 0.5, { type: 'highpass', freq: 3500, peak: 0.04 + Math.random() * 0.05, decay: 0.012 })
        }
      }
      this.chatterId = window.setTimeout(tick, 350 + Math.random() * 900)
    }
    tick()
  }

  private voice(t: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    const base = 140 + Math.random() * 160
    const len = 0.25 + Math.random() * 0.5
    o.frequency.setValueAtTime(base, t)
    o.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.5), t + len)
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.frequency.setValueAtTime(500 + Math.random() * 400, t)
    f1.frequency.linearRampToValueAtTime(700 + Math.random() * 600, t + len)
    f1.Q.value = 5
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.02, t + 0.05)
    g.gain.linearRampToValueAtTime(0.0001, t + len)
    o.connect(f1)
    f1.connect(lp)
    lp.connect(g)
    g.connect(this.ambBus)
    g.connect(this.reverbSend)
    o.start(t)
    o.stop(t + len + 0.05)
  }

  dispose() {
    this.stopMusic()
    if (this.chatterId !== null) window.clearTimeout(this.chatterId)
    for (const n of this.ambienceNodes) (n as AudioScheduledSourceNode).stop?.()
    void this.ctx?.close()
    this.ctx = null
  }
}

export const audio = new AudioEngine()
