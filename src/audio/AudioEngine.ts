/**
 * 16-bit console-style audio, synthesised live with the Web Audio API.
 * Pulse waves (12.5/25/50% duty), a stepped triangle bass and LFSR noise run
 * through a light bit-crush, a muffling low-pass and a SNES-style echo.
 */
export type Sfx =
  | 'select'
  | 'ui'
  | 'error'
  | 'deal'
  | 'jual'
  | 'combo'
  | 'royal'
  | 'alert'
  | 'coin'
  | 'pass'
  | 'clear'
  | 'turn'
  | 'gong'
  | 'fanfare'

export interface Mix {
  master: number
  music: number
  sfx: number
  ambience: number
  musicOn: boolean
  sfxOn: boolean
}

type Voice = 'p12' | 'p25' | 'p50' | 'tri'

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

const CHORDS: Record<string, number[]> = {
  F: [53, 57, 60],
  C7: [48, 52, 55, 58],
  F7: [53, 57, 60, 63],
  Bb: [46, 50, 53],
}
const BARS = ['F', 'F', 'C7', 'C7', 'C7', 'C7', 'F', 'F', 'F7', 'F7', 'Bb', 'Bb', 'F', 'C7', 'F', 'C7']
/** A kroncong-flavoured tune: [midi or rest, length in eighths] per bar. */
const MELODY: [number | null, number][][] = [
  [[72, 3], [69, 1], [65, 2], [67, 2]],
  [[69, 4], [null, 2], [72, 1], [74, 1]],
  [[76, 3], [74, 1], [72, 2], [70, 2]],
  [[67, 6], [null, 2]],
  [[70, 3], [69, 1], [67, 2], [64, 2]],
  [[67, 2], [70, 2], [74, 2], [72, 2]],
  [[69, 6], [67, 1], [69, 1]],
  [[65, 6], [null, 2]],
  [[72, 2], [75, 2], [74, 2], [72, 2]],
  [[69, 4], [72, 2], [69, 2]],
  [[70, 3], [74, 1], [77, 2], [74, 2]],
  [[70, 6], [null, 2]],
  [[69, 3], [72, 1], [77, 2], [76, 2]],
  [[74, 2], [72, 2], [70, 2], [67, 2]],
  [[69, 4], [67, 2], [64, 2]],
  [[65, 4], [67, 2], [72, 2]],
]

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambBus!: GainNode
  private echoIn!: GainNode
  private waves = new Map<Voice, PeriodicWave>()
  private white!: AudioBuffer
  private metal!: AudioBuffer
  private mix: Mix = { master: 0.8, music: 0.5, sfx: 0.8, ambience: 0.45, musicOn: true, sfxOn: true }
  private schedulerId: number | null = null
  private nextStep = 0
  private step = 0
  private tempo = 108
  private ambId: number | null = null

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
      this.build(ctx)
      this.applyMix()
      this.startAmbience()
      if (this.mix.musicOn) this.startMusic()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private build(ctx: AudioContext) {
    // Output chain: crush → console low-pass → master.
    this.master = ctx.createGain()
    const crush = ctx.createWaveShaper()
    const curve = new Float32Array(4096)
    const levels = 96
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1
      curve[i] = Math.round(x * levels) / levels
    }
    crush.curve = curve
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 9500
    lp.Q.value = 0.4
    crush.connect(lp)
    lp.connect(this.master)
    this.master.connect(ctx.destination)

    this.musicBus = ctx.createGain()
    this.sfxBus = ctx.createGain()
    this.ambBus = ctx.createGain()
    for (const b of [this.musicBus, this.sfxBus, this.ambBus]) b.connect(crush)

    // SNES-style echo: a feedback delay with a dark filter in the loop.
    this.echoIn = ctx.createGain()
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.27
    const fb = ctx.createGain()
    fb.gain.value = 0.38
    const dark = ctx.createBiquadFilter()
    dark.type = 'lowpass'
    dark.frequency.value = 2600
    const wet = ctx.createGain()
    wet.gain.value = 0.3
    this.echoIn.connect(delay)
    delay.connect(dark)
    dark.connect(fb)
    fb.connect(delay)
    dark.connect(wet)
    wet.connect(crush)

    for (const [name, duty] of [
      ['p12', 0.125],
      ['p25', 0.25],
      ['p50', 0.5],
    ] as const) {
      const n = 48
      const real = new Float32Array(n)
      const imag = new Float32Array(n)
      for (let k = 1; k < n; k++) real[k] = (2 * Math.sin(Math.PI * k * duty)) / (Math.PI * k)
      this.waves.set(name, ctx.createPeriodicWave(real, imag))
    }
    {
      const n = 32
      const real = new Float32Array(n)
      const imag = new Float32Array(n)
      for (let k = 1; k < n; k += 2) imag[k] = ((8 / (Math.PI * Math.PI)) * (((k - 1) / 2) % 2 ? -1 : 1)) / (k * k)
      this.waves.set('tri', ctx.createPeriodicWave(real, imag))
    }
    this.white = this.lfsr(false)
    this.metal = this.lfsr(true)
  }

  /** NES/SNES-style LFSR noise; short mode gives the metallic tone. */
  private lfsr(short: boolean): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let reg = 1
    let out = 0
    const period = Math.floor(ctx.sampleRate / 16000)
    for (let i = 0; i < len; i++) {
      if (i % period === 0) {
        const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1
        reg = (reg >> 1) | (bit << 14)
        out = reg & 1 ? 1 : -1
      }
      d[i] = out * 0.6
    }
    return buf
  }

  setMix(mix: Mix) {
    const wasOn = this.mix.musicOn
    this.mix = mix
    if (!this.ctx) return
    this.applyMix()
    if (mix.musicOn && !wasOn) this.startMusic()
    if (!mix.musicOn && wasOn) this.stopMusic()
  }

  /** Faster, brighter music for the deciding round. */
  setFinalRound(final: boolean) {
    this.tempo = final ? 126 : 108
  }

  private applyMix() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.mix.master * 0.9, t, 0.05)
    this.musicBus.gain.setTargetAtTime(this.mix.musicOn ? this.mix.music * 0.5 : 0, t, 0.2)
    this.sfxBus.gain.setTargetAtTime(this.mix.sfxOn ? this.mix.sfx * 0.7 : 0, t, 0.05)
    this.ambBus.gain.setTargetAtTime(this.mix.ambience * 0.5, t, 0.3)
  }

  // ───────────────────────── building blocks ─────────────────────────

  /** One chip note with a stepped (NES/SNES-ish) volume envelope. */
  private note(
    out: AudioNode,
    t: number,
    voice: Voice,
    freq: number,
    len: number,
    opts: { vol?: number; slideTo?: number; slideTime?: number; vibrato?: number; echo?: number; decay?: boolean } = {},
  ) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.setPeriodicWave(this.waves.get(voice)!)
    o.frequency.setValueAtTime(freq, t)
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + (opts.slideTime ?? len))
    if (opts.vibrato) {
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 5.5
      const depth = ctx.createGain()
      depth.gain.setValueAtTime(0, t)
      depth.gain.setValueAtTime(0, t + 0.15)
      depth.gain.linearRampToValueAtTime(freq * opts.vibrato, t + 0.35)
      lfo.connect(depth)
      depth.connect(o.frequency)
      lfo.start(t)
      lfo.stop(t + len + 0.05)
    }
    const g = ctx.createGain()
    const vol = opts.vol ?? 0.2
    g.gain.setValueAtTime(vol, t)
    if (opts.decay !== false) {
      // Stepped decay, like a hardware envelope.
      const steps = 6
      for (let i = 1; i <= steps; i++) g.gain.setValueAtTime(vol * Math.pow(1 - i / steps, 1.3), t + (len * i) / steps)
    } else {
      g.gain.setValueAtTime(vol, t + len * 0.85)
      g.gain.linearRampToValueAtTime(0, t + len)
    }
    o.connect(g)
    g.connect(out)
    if (opts.echo) {
      const e = ctx.createGain()
      e.gain.value = opts.echo
      g.connect(e)
      e.connect(this.echoIn)
    }
    o.start(t)
    o.stop(t + len + 0.02)
  }

  private noise(
    out: AudioNode,
    t: number,
    len: number,
    opts: { vol?: number; metal?: boolean; rate?: number; rateTo?: number; hp?: number; lp?: number; echo?: number } = {},
  ) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = opts.metal ? this.metal : this.white
    src.loop = true
    src.playbackRate.setValueAtTime(opts.rate ?? 1, t)
    if (opts.rateTo) src.playbackRate.exponentialRampToValueAtTime(opts.rateTo, t + len)
    let node: AudioNode = src
    if (opts.hp) {
      const f = ctx.createBiquadFilter()
      f.type = 'highpass'
      f.frequency.value = opts.hp
      node.connect(f)
      node = f
    }
    if (opts.lp) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = opts.lp
      node.connect(f)
      node = f
    }
    const g = ctx.createGain()
    const vol = opts.vol ?? 0.15
    g.gain.setValueAtTime(vol, t)
    g.gain.setValueAtTime(vol * 0.6, t + len * 0.4)
    g.gain.setValueAtTime(vol * 0.25, t + len * 0.75)
    g.gain.linearRampToValueAtTime(0, t + len)
    node.connect(g)
    g.connect(out)
    if (opts.echo) {
      const e = ctx.createGain()
      e.gain.value = opts.echo
      g.connect(e)
      e.connect(this.echoIn)
    }
    src.start(t, Math.random() * 0.5)
    src.stop(t + len + 0.02)
  }

  private arp(t: number, midis: number[], gap: number, voice: Voice, len: number, vol: number, echo = 0.3) {
    midis.forEach((m, i) => this.note(this.sfxBus, t + i * gap, voice, mtof(m), len, { vol, echo }))
  }

  // ───────────────────────── sound effects ─────────────────────────

  play(name: Sfx, delay = 0) {
    if (!this.ctx || !this.mix.sfxOn) return
    const t = this.ctx.currentTime + delay + 0.01
    const out = this.sfxBus
    switch (name) {
      case 'select':
        this.note(out, t, 'p25', 1320, 0.05, { vol: 0.12, slideTo: 1760, slideTime: 0.03 })
        break
      case 'ui':
        this.note(out, t, 'p50', mtof(88), 0.05, { vol: 0.12 })
        this.note(out, t + 0.05, 'p50', mtof(95), 0.09, { vol: 0.12 })
        break
      case 'error':
        this.note(out, t, 'p50', 130, 0.14, { vol: 0.14, slideTo: 90 })
        break
      case 'deal':
        for (let i = 0; i < 12; i++) this.noise(out, t + i * 0.055, 0.03, { vol: 0.1, hp: 3000, rate: 1.4 })
        this.note(out, t + 0.7, 'p50', mtof(84), 0.08, { vol: 0.1 })
        this.note(out, t + 0.78, 'p50', mtof(91), 0.16, { vol: 0.1, echo: 0.3 })
        break
      case 'jual':
        this.noise(out, t, 0.14, { vol: 0.22, lp: 2200, rate: 0.7 })
        this.note(out, t, 'tri', 180, 0.14, { vol: 0.4, slideTo: 45 })
        this.arp(t + 0.06, [72, 76, 79, 84], 0.04, 'p50', 0.07, 0.11)
        break
      case 'combo':
        // Five-card hand: heavy slam plus a quick fanfare run.
        this.noise(out, t, 0.18, { vol: 0.26, lp: 1800, rate: 0.6 })
        this.note(out, t, 'tri', 200, 0.2, { vol: 0.45, slideTo: 40 })
        this.arp(t + 0.08, [72, 76, 79, 84, 88, 91], 0.045, 'p50', 0.08, 0.11)
        this.note(out, t + 0.36, 'p25', mtof(96), 0.3, { vol: 0.09, echo: 0.4, vibrato: 0.01, decay: false })
        break
      case 'royal':
        this.play('combo', delay)
        this.arp(t + 0.45, [84, 88, 91, 96], 0.09, 'p50', 0.18, 0.1, 0.45)
        this.play('gong', delay + 0.5)
        break
      case 'alert':
        // "Last card!" klaxon: two quick high pulses, twice.
        for (const at of [0, 0.22]) {
          this.note(out, t + at, 'p12', mtof(93), 0.07, { vol: 0.12, decay: false })
          this.note(out, t + at + 0.08, 'p12', mtof(89), 0.07, { vol: 0.12, decay: false })
        }
        break
      case 'coin':
        this.note(out, t, 'p50', mtof(83), 0.07, { vol: 0.13, decay: false })
        this.note(out, t + 0.07, 'p50', mtof(88), 0.38, { vol: 0.13, echo: 0.35 })
        break
      case 'pass':
        this.note(out, t, 'p25', mtof(79), 0.08, { vol: 0.09 })
        this.note(out, t + 0.09, 'p25', mtof(74), 0.14, { vol: 0.08 })
        break
      case 'clear':
        this.arp(t, [72, 74, 77, 79, 81, 84, 86], 0.035, 'p25', 0.06, 0.09)
        this.noise(out, t + 0.25, 0.12, { vol: 0.05, metal: true, rate: 3, echo: 0.3 })
        break
      case 'turn':
        this.note(out, t, 'tri', mtof(84), 0.14, { vol: 0.2 })
        this.note(out, t + 0.12, 'tri', mtof(91), 0.3, { vol: 0.18, echo: 0.4 })
        break
      case 'gong': {
        // FM gong: a sine carrier wobbled by an inharmonic modulator.
        const ctx = this.ctx
        const car = ctx.createOscillator()
        const mod = ctx.createOscillator()
        const idx = ctx.createGain()
        car.frequency.value = 98
        mod.frequency.value = 98 * 1.41
        idx.gain.setValueAtTime(240, t)
        idx.gain.exponentialRampToValueAtTime(8, t + 2.6)
        mod.connect(idx)
        idx.connect(car.frequency)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.32, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 3.2)
        car.connect(g)
        g.connect(out)
        g.connect(this.echoIn)
        car.start(t)
        mod.start(t)
        car.stop(t + 3.3)
        mod.stop(t + 3.3)
        this.noise(out, t, 0.12, { vol: 0.15, lp: 900 })
        break
      }
      case 'fanfare': {
        const seq: [number, number, number][] = [
          [67, 0, 0.1],
          [72, 0.1, 0.1],
          [76, 0.2, 0.1],
          [79, 0.3, 0.2],
          [76, 0.5, 0.1],
          [79, 0.6, 0.1],
          [84, 0.7, 0.7],
        ]
        for (const [m, at, len] of seq) {
          this.note(out, t + at, 'p50', mtof(m), len, { vol: 0.12, echo: 0.3, decay: false })
          this.note(out, t + at, 'p25', mtof(m - 12), len, { vol: 0.06, decay: false })
        }
        this.note(out, t, 'tri', mtof(48), 0.6, { vol: 0.3 })
        this.note(out, t + 0.7, 'tri', mtof(48), 0.7, { vol: 0.3 })
        this.play('gong', delay + 0.7)
        break
      }
    }
  }

  // ───────────────────────── music ─────────────────────────

  private startMusic() {
    if (!this.ctx || this.schedulerId !== null) return
    this.nextStep = this.ctx.currentTime + 0.1
    this.step = 0
    this.schedulerId = window.setInterval(() => this.schedule(), 25)
  }

  private stopMusic() {
    if (this.schedulerId !== null) window.clearInterval(this.schedulerId)
    this.schedulerId = null
  }

  private schedule() {
    const ctx = this.ctx!
    while (this.nextStep < ctx.currentTime + 0.15) {
      const sixteenth = 60 / this.tempo / 4
      this.playStep(this.step, this.nextStep, sixteenth)
      this.nextStep += sixteenth
      this.step++
    }
  }

  private playStep(step: number, t: number, s16: number) {
    const out = this.musicBus
    const barIdx = Math.floor(step / 16) % BARS.length
    const pass = Math.floor(step / (16 * BARS.length))
    const pos = step % 16
    const chord = CHORDS[BARS[barIdx]]
    const root = chord[0]

    // "Cak": thin 12.5% pulse chops on the off-beat eighths, as a quick chip arpeggio.
    if (pos % 4 === 2) chord.slice(0, 3).forEach((n, i) => this.note(out, t + i * 0.012, 'p12', mtof(n + 12), 0.06, { vol: 0.045 }))
    // "Cuk": 25% pulse answering on the sixteenths.
    if (pos % 4 === 1 || pos % 4 === 3) this.note(out, t, 'p25', mtof(chord[(pos >> 1) % chord.length]), 0.045, { vol: 0.035 })
    // Plucked cello bass on the triangle: root, fifth, root, walk up to the next bar.
    if (pos % 4 === 0) {
      const beat = pos / 4
      const nextRoot = CHORDS[BARS[(barIdx + 1) % BARS.length]][0]
      const n = beat === 0 ? root : beat === 1 ? root + 7 : beat === 2 ? root + 12 : nextRoot - 1
      this.note(out, t, 'tri', mtof(n - 12), s16 * 3, { vol: 0.32 })
    }
    // Brushes: soft hats with an accent on 2 and 4.
    if (pos % 2 === 0) this.noise(out, t, 0.03, { vol: pos === 4 || pos === 12 ? 0.05 : 0.025, hp: 6000, rate: 1.6 })

    // Melody: the 50% pulse "flute", with an octave lift on every other pass.
    if (pos === 0) {
      let at = t
      const lift = pass % 2 === 1 ? 12 : 0
      for (const [m, len8] of MELODY[barIdx]) {
        const len = len8 * 2 * s16
        if (m !== null) this.note(out, at, 'p50', mtof(m + lift), len * 0.95, { vol: 0.075, vibrato: 0.012, echo: 0.45, decay: false })
        at += len
      }
    }
  }

  // ───────────────────────── ambience ─────────────────────────

  private startAmbience() {
    const ctx = this.ctx!
    // Crowd murmur: low noise through a voice-band filter with a slow swell.
    const crowd = ctx.createBufferSource()
    crowd.buffer = this.white
    crowd.loop = true
    crowd.playbackRate.value = 0.25
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 520
    bp.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.value = 0.18
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.12
    const amt = ctx.createGain()
    amt.gain.value = 0.07
    lfo.connect(amt)
    amt.connect(g.gain)
    crowd.connect(bp)
    bp.connect(g)
    g.connect(this.ambBus)
    crowd.start()
    lfo.start()

    // Wok sizzle crackles and the odd distant hawker call, chip style.
    const tick = () => {
      if (!this.ctx) return
      const t = this.ctx.currentTime
      for (let i = 0; i < 3; i++) if (Math.random() < 0.6) this.noise(this.ambBus, t + Math.random() * 0.4, 0.015, { vol: 0.05, hp: 5000, rate: 2 })
      if (Math.random() < 0.12) {
        const base = 60 + Math.floor(Math.random() * 8)
        this.note(this.ambBus, t + 0.1, 'p25', mtof(base), 0.12, { vol: 0.018, slideTo: mtof(base + 3) })
        this.note(this.ambBus, t + 0.24, 'p25', mtof(base + 3), 0.18, { vol: 0.014, slideTo: mtof(base - 2) })
      }
      this.ambId = window.setTimeout(tick, 400 + Math.random() * 700)
    }
    tick()
  }

  dispose() {
    this.stopMusic()
    if (this.ambId !== null) window.clearTimeout(this.ambId)
    void this.ctx?.close()
    this.ctx = null
  }
}

export const audio = new AudioEngine()
