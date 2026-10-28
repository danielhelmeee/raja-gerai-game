import { ALL_CARDS, sortByGroup, sortCards } from '../game/cards'
import { PERSONAS, pick, randomLineup } from '../game/personas'
import { isRoyal, shapeName } from '../game/rules'
import type { Highlight } from '../game/tutorial'
import type { GameEvent, GameState, PersonaId, Player } from '../game/types'
import type { Atlas } from './atlas'
import { GLYPH_ADV, textWidth } from './font'
import { fitScale, handSpacing, makeLayout, type Layout, type P } from './layout'
import { Renderer, type Draw, type Light } from './renderer'
import { buildAtlas, CARD_H, CARD_W, HAWKER_H, HAWKER_W, MINI_H, MINI_W, SIGNS, STALL_COLORS, type Pose } from './sprites'

export interface Snapshot {
  state: GameState
  inGame: boolean
  selected: string[]
  highlights: Highlight[]
  sortMode: 'value' | 'group'
  scanlines: boolean
}

export interface Callbacks {
  pickHand: (id: string) => void
}

type RGBA = [number, number, number, number]
const rgbCache = new Map<string, [number, number, number]>()
export function rgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex)
  if (!c) {
    const n = parseInt(hex.slice(1), 16)
    c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    rgbCache.set(hex, c)
  }
  return c
}
const rgba = (hex: string, a = 1): RGBA => [...rgb(hex), a]

function hash(s: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

type Size = 'big' | 'mini'
type Face = 'front' | 'back'
interface CardTarget {
  x: number
  y: number
  size: Size
  face: Face
  z: number
  zone: 'deck' | 'hand' | 'opp' | 'discard' | 'gerai'
}
interface CardEnt {
  x: number
  y: number
  vx: number
  vy: number
  size: Size
  face: Face
  hold: number
  flip: number
  key: string
  startDist: number
}

type ReactionKind = 'joy' | 'slap' | 'annoyed' | 'sly' | 'shrug' | 'cheer' | 'sad'
interface Reaction {
  kind: ReactionKind
  at: number
  dur: number
}
interface Bubble {
  seat: number
  text: string
  at: number
}
interface Float {
  x: number
  y: number
  text: string
  color: string
  at: number
}
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  kind: 'steam' | 'smoke' | 'spark'
  color: string
}
interface EvLight extends Light {
  decay: number
}
interface CoinFlight {
  from: P
  to: P
  at: number
}

const MENU_FAN = ['karipap-3', 'tehtarik-11', 'ramly-12', 'nasilemak-13', 'karipap-14', 'tehtarik-15', 'nasilemak-7']
const SIGN_COLORS = ['#FFB347', '#9CFF8A', '#FFD27A', '#7FD6FF', '#FF7AA8', '#FF7A45']
const MENU_PLAYERS: Player[] = (['you', ...randomLineup()] as PersonaId[]).map((persona, id) => ({
  id,
  name: PERSONAS[persona].name,
  isHuman: id === 0,
  persona,
  hand: [],
  duit: 0,
  roundScores: [],
}))

export class World {
  private atlas: Atlas
  private renderer: Renderer
  private L!: Layout
  private snap: Snapshot
  private cb: Callbacks
  private t = 0
  private last = 0
  private raf = 0
  private cards = new Map<string, CardEnt>()
  private flights: CoinFlight[] = []
  private particles: Particle[] = []
  private evLights: EvLight[] = []
  private reactions: Record<number, Reaction> = {}
  private bubbles: Bubble[] = []
  private floats: Float[] = []
  private shake = { until: 0, mag: 0 }
  private flash = 0
  private lastSeq: number
  private spotlight: number | null = null
  private hovered: string | null = null
  private hits: { x: number; y: number; w: number; h: number; hand: string }[] = []
  private nextMenuReaction = 2
  private lit: Draw[] = []
  private em: Draw[] = []
  private ui: Draw[] = []
  private lights: Light[] = []
  private steamAcc = 0

  constructor(canvas: HTMLCanvasElement, snap: Snapshot, cb: Callbacks) {
    this.atlas = buildAtlas()
    this.renderer = new Renderer(canvas, this.atlas)
    this.snap = snap
    this.cb = cb
    this.lastSeq = snap.state.seq
    for (const c of ALL_CARDS) this.cards.set(c.id, { x: 0, y: 0, vx: 0, vy: 0, size: 'big', face: 'back', hold: 0, flip: 1, key: '', startDist: 0 })
  }

  get size() {
    return { W: this.L?.W ?? 1, H: this.L?.H ?? 1 }
  }

  setSnapshot(s: Snapshot) {
    this.snap = s
  }

  setCallbacks(cb: Callbacks) {
    this.cb = cb
  }

  /** Fit to the window; returns the scale for the DOM overlay. */
  resize(cssW: number, cssH: number, dpr: number) {
    const fit = fitScale(Math.floor(cssW * dpr), Math.floor(cssH * dpr))
    this.renderer.resize(fit.W, fit.H, fit.scale)
    const first = !this.L
    this.L = makeLayout(fit.W, fit.H)
    if (first) {
      for (const [id, t] of this.targets()) {
        const e = this.cards.get(id)!
        e.x = t.x
        e.y = t.y
        e.size = t.size
        e.face = t.face
      }
    }
    return { ...fit, layout: this.L }
  }

  start() {
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000))
      this.last = now
      this.t += dt
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  // ───────────────────────── input ─────────────────────────

  private hitAt(x: number, y: number) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h
    }
    return null
  }

  /** Coordinates in logical pixels. Returns whether something clickable is under the pointer. */
  pointerMove(x: number, y: number): boolean {
    const h = this.hitAt(x, y)
    this.hovered = h?.hand ?? null
    return !!h
  }

  pointerDown(x: number, y: number) {
    const h = this.hitAt(x, y)
    if (h) this.cb.pickHand(h.hand)
  }

  // ───────────────────────── state helpers ─────────────────────────

  private players(): Player[] {
    return this.snap.inGame && this.snap.state.players.length ? this.snap.state.players : MENU_PLAYERS
  }

  private seatOf(id: number) {
    return this.L.seats[id] ?? this.L.seats[0]
  }

  private targets(): Map<string, CardTarget> {
    const L = this.L
    const out = new Map<string, CardTarget>()
    // Undealt cards wait in a stack on the mat, which is where the deal flies from.
    ALL_CARDS.forEach((c, i) => out.set(c.id, { x: L.gerai[0], y: L.gerai[1] - Math.floor(i / 6), size: 'big', face: 'back', z: 10 + i * 0.01, zone: 'deck' }))
    const s = this.snap.state
    if (!this.snap.inGame || !s.players.length) {
      MENU_FAN.forEach((id, i) => {
        const d = i - (MENU_FAN.length - 1) / 2
        out.set(id, { x: L.cx + d * 30, y: L.gerai[1] + Math.abs(d) * 3, size: 'big', face: 'front', z: 280 + i, zone: 'gerai' })
      })
      return out
    }
    s.players.forEach((p, pi) => {
      const seat = this.seatOf(pi)
      if (p.isHuman) {
        const hand = this.snap.sortMode === 'group' ? sortByGroup(p.hand) : sortCards(p.hand)
        const sp = handSpacing(L, hand.length)
        hand.forEach((c, i) => {
          const lift = this.snap.selected.includes(c.id) ? 10 : this.hovered === c.id ? 4 : 0
          out.set(c.id, { x: L.cx + (i - (hand.length - 1) / 2) * sp, y: L.handY + CARD_H / 2 - lift, size: 'big', face: 'front', z: 500 + i, zone: 'hand' })
        })
      } else {
        p.hand.forEach((c, i) => {
          out.set(c.id, { x: seat.hand[0] + (i - (p.hand.length - 1) / 2) * 4, y: seat.hand[1], size: 'mini', face: 'back', z: 300 + i, zone: 'opp' })
        })
      }
    })
    s.discard.forEach((c, k) => {
      out.set(c.id, {
        x: L.discard[0] + Math.round((hash(c.id, 1) - 0.5) * 8),
        y: L.discard[1] - Math.floor(k / 3),
        size: 'mini',
        face: 'back',
        z: 200 + k,
        zone: 'discard',
      })
    })
    const n = s.gerai.cards.length
    s.gerai.cards.forEach((c, i) => {
      out.set(c.id, { x: L.gerai[0] + (i - (n - 1) / 2) * 34, y: L.gerai[1], size: 'big', face: 'front', z: 280 + i, zone: 'gerai' })
    })
    return out
  }

  // ───────────────────────── events ─────────────────────────

  private react(id: number, kind: ReactionKind, lines?: (p: (typeof PERSONAS)[PersonaId]) => string[], delay = 0) {
    const p = this.players()[id]
    if (!p || p.isHuman) return
    const dur = { joy: 1.6, slap: 1.4, annoyed: 1.8, sly: 1.4, shrug: 1.2, cheer: 99, sad: 99 }[kind]
    this.reactions[id] = { kind, at: this.t + delay, dur }
    if (lines) {
      const text = pick(lines(PERSONAS[p.persona]))
      if (text) {
        this.bubbles = this.bubbles.filter((b) => b.seat !== id)
        this.bubbles.push({ seat: id, text, at: this.t + delay })
      }
    }
  }

  private floatAt(seat: number, text: string, color: string, delay = 0) {
    const s = this.seatOf(seat)
    const human = this.players()[seat]?.isHuman
    const [x, y] = human ? [s.coins[0] + 20, s.coins[1] - 14] : [s.avatar[0], this.L.tableTop - 52]
    const stacked = this.floats.filter((f) => f.x === x && Math.abs(f.at - (this.t + delay)) < 0.6).length
    this.floats.push({ x, y: y + stacked * 12, text, color, at: this.t + delay })
  }

  private light(x: number, y: number, z: number, radius: number, color: string, intensity: number, decay: number) {
    this.evLights.push({ x, y, z, radius, color: rgb(color), intensity, decay })
  }

  private sparks(x: number, y: number, count: number, colors: string[], speed = 60) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const v = speed * (0.5 + Math.random())
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.5 + Math.random() * 0.4, kind: 'spark', color: pick(colors) })
    }
  }

  private processEvents() {
    const s = this.snap.state
    const fresh = s.events.filter((e) => e.seq > this.lastSeq)
    if (!fresh.length) return
    this.lastSeq = s.seq
    const L = this.L
    for (const e of fresh as GameEvent[]) {
      switch (e.type) {
        case 'deal': {
          this.spotlight = null
          this.flights = []
          this.reactions = {}
          const order = new Map<string, number>()
          s.players.forEach((p, pi) => p.hand.forEach((c, i) => order.set(c.id, i * s.players.length + pi)))
          for (const [id, ent] of this.cards) {
            ent.x = L.gerai[0]
            ent.y = L.gerai[1]
            ent.vx = ent.vy = 0
            ent.size = 'big'
            ent.face = 'back'
            ent.flip = 1
            ent.hold = this.t + 0.3 + (order.get(id) ?? 0) * 0.04
          }
          break
        }
        case 'jual': {
          const big = e.shape.kind === 'five'
          const royal = e.shape.five === 'tapaubarisan'
          this.shake = { until: this.t + (big ? 0.35 : 0.18), mag: big ? 3 : 2 }
          this.flash = royal ? 0.22 : big ? 0.14 : 0.07
          this.light(L.gerai[0], L.gerai[1], 40, big ? 200 : 140, royal ? '#FFE070' : '#FFC870', big ? 2.2 : 1.4, big ? 1.6 : 2.2)
          this.sparks(L.gerai[0], L.gerai[1], big ? 34 : 12, royal ? ['#FFE070', '#FF7AA8', '#7FD6FF', '#FFFFFF'] : ['#FFE08A', '#FFFFFF'], big ? 90 : 60)
          const actor = s.players[e.actor]
          if (actor && actor.hand.length === 1) {
            this.react(e.actor, 'joy', (p) => p.lines.last)
            this.floatAt(e.actor, 'LAST CARD!', '#FF6A5A')
          } else this.react(e.actor, big ? 'slap' : 'joy', (p) => (big ? p.lines.big : p.lines.jual))
          if (isRoyal(e.shape)) {
            this.flash = 0.3
            this.floatAt(e.actor, 'HIDANGAN DIRAJA!', '#FFE070')
            this.sparks(L.gerai[0], L.gerai[1], 40, ['#FFE070', '#FFFFFF'], 130)
          }
          if (e.beat !== null && e.beat !== e.actor && (big || Math.random() < 0.35)) this.react(e.beat, 'annoyed', (p) => p.lines.beaten, 0.2)
          break
        }
        case 'pass':
          this.react(e.actor, 'shrug', (p) => p.lines.pass)
          break
        case 'clear':
          this.light(L.discard[0], L.discard[1], 30, 70, '#9CFF8A', 0.9, 1.5)
          this.react(e.actor, 'sly')
          break
        case 'roundEnd':
        case 'gameOver':
          this.spotlight = e.winner
          s.players.forEach((p) => this.react(p.id, p.id === e.winner ? 'cheer' : 'sad', (ps) => (p.id === e.winner ? ps.lines.win : ps.lines.lose), 0.3))
          if (e.type === 'roundEnd') {
            // DUIT showers from every loser to the winner.
            const to = this.seatOf(e.winner).coins
            let pot = 0
            e.payouts.forEach((pay, i) => {
              pot += pay.amount
              const from = this.seatOf(pay.id).coins
              const n = Math.min(8, Math.max(1, Math.ceil(pay.amount / 3)))
              for (let k = 0; k < n; k++) this.flights.push({ from, to, at: this.t + 0.9 + i * 0.25 + k * 0.07 })
              this.floatAt(pay.id, `-${pay.amount} DUIT`, '#FF6A5A', 0.6 + i * 0.25)
            })
            this.floatAt(e.winner, `+${pot} DUIT`, '#FFE070', 1.8)
          }
          break
      }
    }
  }

  // ───────────────────────── update ─────────────────────────

  private update(dt: number) {
    if (!this.L) return
    this.processEvents()

    // Cards spring toward their targets; size and face swap mid-flight.
    for (const [id, tgt] of this.targets()) {
      const e = this.cards.get(id)!
      if (this.t < e.hold) continue
      const key = `${tgt.zone}:${tgt.x}:${tgt.y}`
      const dx = tgt.x - e.x
      const dy = tgt.y - e.y
      const dist = Math.hypot(dx, dy)
      if (key !== e.key) {
        e.key = key
        e.startDist = dist
      }
      const k = 170
      const c = 2 * Math.sqrt(k) * 0.92
      e.vx += (k * dx - c * e.vx) * dt
      e.vy += (k * dy - c * e.vy) * dt
      e.x += e.vx * dt
      e.y += e.vy * dt
      if (e.size !== tgt.size && dist < e.startDist * 0.5 + 1) e.size = tgt.size
      if (e.face !== tgt.face && e.flip >= 1) e.flip = 0
      if (e.flip < 1) {
        e.flip = Math.min(1, e.flip + dt / 0.2)
        if (e.flip >= 0.5) e.face = tgt.face
      }
    }

    // Steam from the kopi cup and smoke from the satay grill.
    this.steamAcc += dt
    while (this.steamAcc > 0.09) {
      this.steamAcc -= 0.09
      const [cx, cy] = this.L.cup
      this.particles.push({ x: cx + (Math.random() - 0.5) * 4, y: cy - 6, vx: (Math.random() - 0.5) * 4, vy: -10 - Math.random() * 6, life: 0, max: 1.8, kind: 'steam', color: '#FFFFFF' })
      const [gx, gy] = this.L.grill
      this.particles.push({ x: gx + (Math.random() - 0.5) * 44, y: gy - 2, vx: 3 + Math.random() * 4, vy: -12 - Math.random() * 8, life: 0, max: 2.6, kind: 'smoke', color: '#B8B0B8' })
    }
    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'spark') p.vy += 90 * dt
      else p.vx += Math.sin(this.t * 2 + p.y * 0.2) * 6 * dt
    }
    this.particles = this.particles.filter((p) => p.life < p.max)

    for (const l of this.evLights) l.intensity -= l.decay * dt
    this.evLights = this.evLights.filter((l) => l.intensity > 0)
    this.flash = Math.max(0, this.flash - dt * 0.5)
    this.flights = this.flights.filter((f) => this.t - f.at < 0.8)
    this.floats = this.floats.filter((f) => this.t - f.at < 2.2)
    this.bubbles = this.bubbles.filter((b) => this.t - b.at < 2.4)

    // Hawkers chatting on the title screen.
    if (!this.snap.inGame && this.t > this.nextMenuReaction) {
      this.nextMenuReaction = this.t + 2.5 + Math.random() * 3
      const id = 1 + Math.floor(Math.random() * 3)
      const kind = pick<ReactionKind>(['joy', 'sly', 'slap', 'shrug'])
      this.react(id, kind, (p) => (kind === 'shrug' ? p.lines.pass : kind === 'slap' ? p.lines.big : p.lines.jual))
    }
  }

  // ───────────────────────── drawing helpers ─────────────────────────

  private spr(layer: Draw[], name: string, x: number, y: number, o: Partial<Draw> = {}) {
    layer.push({ f: this.atlas.get(name), x, y, ...o })
  }

  private rect(layer: Draw[], x: number, y: number, w: number, h: number, color: RGBA) {
    if (w <= 0 || h <= 0) return
    layer.push({ f: this.atlas.get('px'), x, y, w, h, color })
  }

  private frameRect(layer: Draw[], x: number, y: number, w: number, h: number, color: RGBA, t = 1) {
    this.rect(layer, x, y, w, t, color)
    this.rect(layer, x, y + h - t, w, t, color)
    this.rect(layer, x, y + t, t, h - 2 * t, color)
    this.rect(layer, x + w - t, y + t, t, h - 2 * t, color)
  }

  private text(layer: Draw[], str: string, x: number, y: number, color: RGBA, scale = 1) {
    let cx = Math.round(x)
    for (const ch of str.toUpperCase()) {
      const name = this.atlas.has(`g:${ch}`) ? `g:${ch}` : 'g:?'
      if (ch !== ' ') layer.push({ f: this.atlas.get(name), x: cx, y: Math.round(y), w: 5 * scale, h: 7 * scale, color })
      cx += GLYPH_ADV * scale
    }
  }

  /** Floating text on a dark tag, so it reads over anything. */
  private tagText(str: string, x: number, y: number, color: RGBA) {
    const w = textWidth(str)
    this.rect(this.ui, Math.round(x) - 2, Math.round(y) - 2, w + 4, 11, [0.08, 0.04, 0.08, 0.85 * color[3]])
    this.text(this.ui, str, x, y, color)
  }

  private pulse(speed = 6) {
    return 0.6 + Math.sin(this.t * speed) * 0.4
  }

  // ───────────────────────── frame ─────────────────────────

  private draw() {
    if (!this.L) return
    this.lit = []
    this.em = []
    this.ui = []
    this.lights = []
    this.hits = []
    const L = this.L
    const s = this.snap.state
    const players = this.players()
    const inGame = this.snap.inGame && s.players.length > 0
    const hl = this.snap.highlights

    this.drawBackdrop()
    players.forEach((p, i) => {
      if (!p.isHuman) this.drawHawker(p, i)
    })
    this.drawTable()
    this.drawCloth(inGame && s.status === 'playing' && !s.gerai.cards.length)
    this.spr(this.lit, 'cup', L.cup[0] - 7, L.cup[1] - 8)
    this.drawCards()
    this.drawParticles()
    this.drawFlights()
    this.drawHighlights(hl)
    for (const l of this.evLights) this.lights.push(l)
    if (inGame) {
      players.forEach((p, i) => {
        if (!p.isHuman) this.drawTelemetry(p, i, hl.some((h) => h.kind === 'telemetry'))
      })
      this.drawGeraiLabel()
    }
    this.drawBubbles()
    for (const f of this.floats) {
      const a = (this.t - f.at) / 2.2
      if (a < 0) continue
      this.tagText(f.text, f.x - textWidth(f.text) / 2, f.y - Math.round(a * 26), rgba(f.color, a > 0.75 ? (1 - a) / 0.25 : 1))
    }

    const shaking = this.t < this.shake.until
    this.renderer.render({
      lit: this.lit,
      emissive: this.em,
      ui: this.ui,
      lights: this.lights,
      ambient: [0.3, 0.25, 0.4],
      flash: [this.flash, this.flash * 0.75, this.flash * 0.3],
      shake: shaking ? [(Math.random() - 0.5) * 2 * this.shake.mag, (Math.random() - 0.5) * 2 * this.shake.mag] : [0, 0],
      scanlines: this.snap.scanlines,
      // Your hand cards never sink below this brightness; the table under them keeps the normal lighting.
      floor: 0.92,
    })
  }

  private drawBackdrop() {
    const L = this.L
    const bands = ['#120A1C', '#1A1027', '#221532', '#2A1A3A']
    const skyH = L.stallY + 30
    bands.forEach((c, i) => this.rect(this.lit, 0, (i * skyH) / bands.length, L.W, skyH / bands.length + 1, rgba(c)))
    this.rect(this.lit, 0, skyH, L.W, L.H - skyH, rgba('#1E1722'))

    for (let i = 0; i < 24; i++) {
      const x = Math.floor(hash(`s${i}`) * L.W)
      const y = Math.floor(hash(`s${i}`, 2) * Math.max(4, L.stallY + 6))
      const tw = 0.4 + 0.4 * Math.sin(this.t * (1 + hash(`s${i}`, 3) * 2) + i)
      this.rect(this.em, x, y, 1, 1, [1, 0.85, 0.6, tw])
    }

    // String lights, two rows.
    for (const [row, y0, sag] of [
      [0, L.stallY + 3, 6],
      [1, L.stallY - 14, 5],
    ] as const) {
      if (y0 < 2) continue
      for (let x = -4; x < L.W + 8; x += 1) {
        const phase = ((x % 90) + 90) % 90
        const y = y0 + Math.round(Math.sin((phase / 90) * Math.PI) * sag)
        this.rect(this.lit, x, y, 1, 1, rgba('#0C080E'))
        if (x % 12 === 0) {
          const hue = ['#FFC36B', '#FFE3A3', '#FF8F5A', '#9CFF8A'][(x / 12 + row) % 4]
          const on = 0.75 + 0.25 * Math.sin(this.t * 3 + x * 0.3)
          this.rect(this.em, x - 1, y + 1, 2, 2, rgba(hue, on))
          this.spr(this.em, 'halo:4', x - 4, y - 2, { color: rgba(hue, 0.35 * on) })
        }
      }
    }
    for (let i = 0; i < 4; i++) this.lights.push({ x: (L.W * (i + 0.5)) / 4, y: L.stallY + 8, z: 26, radius: 90, color: rgb('#FFC870'), intensity: 0.35 })

    // Stalls with neon signs, sitting a little higher so the glow clears the hawkers' heads.
    const n = Math.ceil(L.W / 104) + 1
    const x0 = L.cx - (n * 104) / 2
    for (let i = 0; i < n; i++) {
      const sx = Math.round(x0 + i * 104)
      const k = ((i % STALL_COLORS.length) + STALL_COLORS.length) % STALL_COLORS.length
      this.spr(this.lit, `stall:${k}`, sx, L.stallY)
      const sign = SIGNS[k]
      const col = SIGN_COLORS[k]
      const buzz = hash(sign) < 0.35 && Math.sin(this.t * 13 + i) > 0.92 ? 0.25 : 1
      this.text(this.em, sign, sx + 55 - textWidth(sign) / 2, L.stallY + 25, rgba(col, buzz))
      this.spr(this.em, 'halo:24', sx + 55 - 24, L.stallY + 4, { color: rgba(col, 0.22 * buzz) })
      this.lights.push({ x: sx + 55, y: L.stallY + 32, z: 18, radius: 70, color: rgb(col), intensity: 0.55 * buzz })
      for (let j = 0; j < 2; j++) {
        const fx = sx + 22 + j * 46 + Math.round(Math.sin(this.t * 0.3 + i * 2 + j) * 6)
        const f = Math.floor(this.t * 2 + i + j) % 2
        this.spr(this.lit, `shopper:${(i + j) % 3}:${f}`, fx, L.stallY + 50)
      }
    }

    const [gx, gy] = L.grill
    this.spr(this.lit, 'grill', gx - 26, gy - 9)
    const fl = 0.75 + 0.25 * Math.sin(this.t * 17) * Math.sin(this.t * 5.3)
    this.rect(this.em, gx - 22, gy - 6, 44, 2, rgba('#FF6A2A', fl))
    this.spr(this.em, 'halo:14', gx - 14, gy - 20, { color: rgba('#FF7A2A', 0.4 * fl) })
    this.lights.push({ x: gx, y: gy, z: 12, radius: 60, color: rgb('#FF7A2A'), intensity: 0.9 * fl })

    L.lamps.forEach(([lx, ly], i) => {
      const sway = Math.round(Math.sin(this.t * 0.8 + i * 1.7) * 2)
      const flick = 0.92 + 0.08 * Math.sin(this.t * 23 + i * 3) + (Math.random() < 0.004 ? -0.4 : 0)
      this.rect(this.lit, lx, 0, 1, ly, rgba('#0C080E'))
      this.spr(this.lit, 'lamp', lx - 9 + sway, ly)
      this.rect(this.em, lx - 2 + sway, ly + 7, 4, 3, rgba('#FFF2C8', flick))
      this.spr(this.em, 'halo:14', lx - 14 + sway, ly - 6, { color: rgba('#FFD08A', 0.55 * flick) })
      for (let m = 0; m < 2; m++) {
        const a = this.t * (2.5 + m) + i * 2 + m * 3
        this.rect(this.em, lx + sway + Math.round(Math.cos(a) * 9), ly + 9 + Math.round(Math.sin(a * 1.3) * 5), 1, 1, rgba('#FFE8B0', 0.8))
      }
      this.lights.push({
        x: lx + sway * 4,
        y: L.tableTop + (L.portrait ? 90 : 46),
        z: 75,
        radius: L.portrait ? 300 : 260,
        color: rgb('#FFD49A'),
        intensity: 1.5 * flick,
      })
    })
    // A stall lamp just behind you, so your own hand is warmly lit.
    this.lights.push({ x: L.cx, y: L.H + 6, z: 60, radius: L.portrait ? 300 : 250, color: rgb('#FFE2B8'), intensity: 1.1 })
  }

  private drawTable() {
    const L = this.L
    this.rect(this.lit, L.tableLeft, L.tableTop - 3, L.tableRight - L.tableLeft, 3, rgba('#3E2112'))
    for (let y = L.tableTop; y < L.tableBottom; y += 16) {
      const row = (y - L.tableTop) / 16
      const offset = (row % 2) * 32
      for (let x = L.tableLeft - offset; x < L.tableRight; x += 64) {
        const v = Math.floor(hash(`${x}:${y}`) * 3)
        const cx0 = Math.max(x, L.tableLeft)
        const sx = cx0 - x
        const w = Math.min(64 - sx, L.tableRight - cx0)
        const h = Math.min(16, L.tableBottom - y)
        if (w > 0) this.spr(this.lit, `wood:${v}`, cx0, y, { sx, sw: w, sh: h })
      }
    }
    for (let x = L.tableLeft; x < L.tableRight; x += 64) this.spr(this.lit, 'table:front', x, L.tableBottom, { sw: Math.min(64, L.tableRight - x) })
    for (const lx of [L.tableLeft + 6, L.tableRight - 14]) this.rect(this.lit, lx, L.tableBottom + 10, 8, L.H - L.tableBottom - 10, rgba('#3E2112'))
  }

  /** The batik alas meja the Gerai is played onto. */
  private drawCloth(empty: boolean) {
    const { x, y, w, h } = this.L.cloth
    this.rect(this.lit, x + 2, y + 2, w, h, rgba('#1A0E10'))
    for (let ty = y + 5; ty < y + h - 5; ty += 16) {
      for (let tx = x + 5; tx < x + w - 5; tx += 16) {
        this.spr(this.lit, 'cloth:tile', tx, ty, { sw: Math.min(16, x + w - 5 - tx), sh: Math.min(16, y + h - 5 - ty) })
      }
    }
    for (let tx = x; tx < x + w; tx += 16) {
      const sw = Math.min(16, x + w - tx)
      this.spr(this.lit, 'cloth:h', tx, y, { sw })
      this.spr(this.lit, 'cloth:h', tx, y + h - 5, { sw })
    }
    for (let ty = y + 5; ty < y + h - 5; ty += 16) {
      const sh = Math.min(16, y + h - 5 - ty)
      this.spr(this.lit, 'cloth:v', x, ty, { sh })
      this.spr(this.lit, 'cloth:v', x + w - 5, ty, { sh, flipX: true })
    }
    // Tassels on the short ends.
    for (let ty = y + 3; ty < y + h - 2; ty += 4) {
      this.rect(this.lit, x - 2, ty, 2, 1, rgba('#F4B42A'))
      this.rect(this.lit, x + w, ty, 2, 1, rgba('#F4B42A'))
    }
    if (empty) {
      const label = 'OPEN THE GERAI'
      this.text(this.lit, label, x + w / 2 - textWidth(label) / 2, y + h / 2 - 3, rgba('#6A78B0', 0.9))
    }
  }

  private poseFor(id: number): Pose {
    const r = this.reactions[id]
    const s = this.snap.state
    const e = r ? this.t - r.at : 99
    if (r && e >= 0 && e < r.dur) {
      const flip2 = (rate: number) => Math.floor(e / rate) % 2
      switch (r.kind) {
        case 'joy':
          return flip2(0.18) ? 'joy1' : 'joy0'
        case 'slap':
          return flip2(0.14) ? 'slap1' : 'slap0'
        case 'annoyed':
          return e < 0.9 && flip2(0.1) ? 'annoyed1' : 'annoyed0'
        case 'cheer':
          return flip2(0.22) ? 'cheer1' : 'cheer0'
        default:
          return r.kind
      }
    }
    if (this.snap.inGame && s.status === 'playing' && s.turn === id) return 'think'
    return (this.t + id * 1.3) % 3.6 < 0.14 ? 'idle1' : 'idle0'
  }

  private drawHawker(p: Player, i: number) {
    const seat = this.seatOf(i)
    const name = `hawker:${p.persona}:${this.poseFor(i)}`
    const x = seat.avatar[0] - HAWKER_W / 2
    const y = seat.avatar[1] - HAWKER_H
    this.spr(this.lit, name, x, y)
    // Block the neon glow behind the hawker so signs never shine through a head.
    this.spr(this.em, name, x, y, { color: [0, 0, 0, 1] })
    const s = this.snap.state
    if (this.snap.inGame && s.status === 'playing' && s.turn === i) {
      this.spr(this.em, 'ring:avatar', seat.avatar[0] - 26, this.L.tableTop - 4, { color: rgba('#00A859', this.pulse(5)) })
      this.lights.push({ x: seat.avatar[0], y: this.L.tableTop - 6, z: 20, radius: 50, color: rgb('#00E07A'), intensity: 0.5 * this.pulse(5) })
    }
    if (this.spotlight === i) this.lights.push({ x: seat.avatar[0], y: seat.avatar[1] - 30, z: 60, radius: 80, color: rgb('#FFF0C0'), intensity: 1.3 })
  }

  private drawCards() {
    const s = this.snap.state
    const targets = this.targets()
    const list = [...this.cards.entries()].map(([id, e]) => {
      const t = targets.get(id)!
      const moving = Math.hypot(t.x - e.x, t.y - e.y) > 3 || this.t < e.hold
      return { id, e, t, z: t.z + (moving ? 1000 : 0) }
    })
    list.sort((a, b) => a.z - b.z)
    const canPick = this.snap.inGame && s.status === 'playing'
    for (const { id, e, t } of list) {
      const w = e.size === 'big' ? CARD_W : MINI_W
      const h = e.size === 'big' ? CARD_H : MINI_H
      const squash = e.flip < 1 ? Math.max(0.08, Math.abs(Math.cos(e.flip * Math.PI))) : 1
      const dw = Math.max(1, Math.round(w * squash))
      const x = Math.round(e.x - dw / 2)
      const y = Math.round(e.y - h / 2)
      let name: string
      if (e.size === 'big') name = e.face === 'front' ? `card:${id}` : 'card:back'
      else name = e.face === 'front' ? `mini:${id.split('-')[0]}` : 'mini:back'
      const sel = this.snap.selected.includes(id) && t.zone === 'hand'
      const lift = sel ? 1.12 : 1
      this.spr(this.lit, name, x, y, { w: dw, h, color: [lift, lift, lift, 1], bright: t.zone === 'hand' })
      if (canPick && t.zone === 'hand') this.hits.push({ x, y, w: dw, h: h + 12, hand: id })
      if (sel) this.frameRect(this.em, x - 1, y - 1, dw + 2, h + 2, rgba('#00E07A', 0.9))
    }
  }

  private drawFlights() {
    for (const f of this.flights) {
      const t = (this.t - f.at) / 0.7
      if (t < 0 || t > 1) continue
      const e = 1 - Math.pow(1 - t, 3)
      const x = f.from[0] + (f.to[0] - f.from[0]) * e
      const y = f.from[1] + (f.to[1] - f.from[1]) * e - Math.sin(Math.PI * t) * 40
      const frame = Math.floor(t * 16) % 4
      this.spr(this.lit, `coin:${frame}`, x - 4, y - 4, { flipX: frame === 3 })
      this.spr(this.em, 'halo:4', x - 4, y - 4, { color: rgba('#FFE7A0', 0.7) })
      this.lights.push({ x, y, z: 14, radius: 30, color: rgb('#FFE7A0'), intensity: 0.9 })
    }
  }

  private drawParticles() {
    for (const p of this.particles) {
      const a = p.life / p.max
      if (p.kind === 'spark') {
        this.spr(this.em, a < 0.5 ? 'sparkle' : 'halo:4', Math.round(p.x) - 2, Math.round(p.y) - 2, { color: rgba(p.color, 1 - a) })
      } else {
        const size = p.kind === 'smoke' ? Math.round(1 + Math.sin(a * Math.PI) * 3) : Math.round(1 + Math.sin(a * Math.PI) * 2)
        const shade = p.kind === 'smoke' ? 0.55 : 0.95
        this.rect(this.lit, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size, [shade, shade, shade, 1])
      }
    }
  }

  private drawHighlights(hl: Highlight[]) {
    const L = this.L
    const c = rgba('#00E07A', this.pulse(6))
    const s = this.snap.state
    const cardBox = (id: string) => {
      const e = this.cards.get(id)
      if (!e) return
      const w = e.size === 'big' ? CARD_W : MINI_W
      const h = e.size === 'big' ? CARD_H : MINI_H
      this.frameRect(this.em, Math.round(e.x - w / 2) - 2, Math.round(e.y - h / 2) - 2, w + 4, h + 4, c, 2)
    }
    for (const h of hl) {
      if (h.kind === 'cards') h.ids.forEach((id) => !this.snap.selected.includes(id) && cardBox(id))
      else if (h.kind === 'hand') s.players[0]?.hand.forEach((card) => cardBox(card.id))
      else if (h.kind === 'gerai') this.frameRect(this.em, L.cloth.x - 3, L.cloth.y - 3, L.cloth.w + 6, L.cloth.h + 6, c, 2)
      else if (h.kind === 'discard') this.spr(this.em, 'ring:pile', L.discard[0] - 16, L.discard[1] - 14, { color: c })
    }
  }

  private drawTelemetry(p: Player, i: number, glow: boolean) {
    const seat = this.seatOf(i)
    const s = this.snap.state
    const name = (this.L.portrait ? PERSONAS[p.persona].short : p.name).toUpperCase()
    const stats: [string, string, string][] = [
      ['icon:card', String(p.hand.length), '#5A3A26'],
      ['icon:coin', String(p.duit), p.duit < 0 ? '#C8352B' : '#9C6A22'],
    ]
    const statsW = stats.reduce((w, [, v]) => w + 9 + textWidth(v) + 5, 0)
    const w = Math.max(textWidth(name) + 10, statsW) + 8
    const h = 22
    let x = seat.panel[0]
    if (seat.panelAlign === 'center') x -= w / 2
    x = Math.max(2, Math.min(this.L.W - w - 2, Math.round(x)))
    const y = Math.max(20, seat.panel[1])
    const active = s.status === 'playing' && s.turn === i
    this.rect(this.ui, x + 1, y + 1, w, h, [0.05, 0.02, 0.04, 0.6])
    this.rect(this.ui, x, y, w, h, rgba('#FBF6EA'))
    this.frameRect(this.ui, x, y, w, h, rgba('#3B2416'))
    if (active || glow) this.frameRect(this.ui, x - 2, y - 2, w + 4, h + 4, rgba(active ? '#00A859' : '#00E07A', active ? 1 : this.pulse(6)), 2)
    this.rect(this.ui, x + 4, y + 4, 5, 5, rgba(PERSONAS[p.persona].accent))
    this.text(this.ui, name, x + 12, y + 3, rgba('#3B2416'))
    let sx = x + 4
    for (const [icon, v, col] of stats) {
      this.spr(this.ui, icon, sx, y + 12)
      this.text(this.ui, v, sx + 9, y + 12, rgba(col))
      sx += 9 + textWidth(v) + 5
    }
    // Dai Di etiquette: everyone must know when a hawker is on their last card.
    if (s.status === 'playing' && p.hand.length === 1 && Math.floor(this.t * 3) % 2 === 0) {
      const tag = 'LAST CARD!'
      this.rect(this.ui, x, y + h + 1, textWidth(tag) + 6, 10, rgba('#C8352B'))
      this.text(this.ui, tag, x + 3, y + h + 2, rgba('#FFFFFF'))
    }
  }

  private drawGeraiLabel() {
    const L = this.L
    const s = this.snap.state
    if (s.status !== 'playing' || !s.gerai.shape) return
    const owner = s.players[s.gerai.ownerId!]
    const who = owner.isHuman ? 'YOURS' : L.portrait ? PERSONAS[owner.persona].short : owner.name
    const label = `${who}: ${shapeName(s.gerai.shape)}`
    const tw = textWidth(label)
    const y = L.cloth.y + L.cloth.h + 4
    const five = s.gerai.shape.kind === 'five'
    this.rect(this.ui, L.gerai[0] - tw / 2 - 4, y - 2, tw + 8, 11, five ? rgba('#7A2335', 0.92) : [0.08, 0.04, 0.08, 0.82])
    this.text(this.ui, label, L.gerai[0] - tw / 2, y, rgba(five ? '#FFE070' : '#FFE7B0'))
  }

  private drawBubbles() {
    for (const b of this.bubbles) {
      const e = this.t - b.at
      if (e < 0) continue
      const seat = this.seatOf(b.seat)
      const w = textWidth(b.text) + 8
      const pop = e < 0.12 ? e / 0.12 : 1
      let x = seat.avatar[0] + 10
      if (x + w > this.L.W - 2) x = seat.avatar[0] - 10 - w
      x = Math.max(2, x)
      const y = seat.avatar[1] - HAWKER_H - 12 + Math.round((1 - pop) * 4)
      const a = e > 2 ? Math.max(0, 1 - (e - 2) / 0.4) : 1
      this.rect(this.ui, x, y, w, 11, [1, 1, 1, a])
      this.frameRect(this.ui, x, y, w, 11, rgba('#3B2416', a))
      this.rect(this.ui, seat.avatar[0] + (x > seat.avatar[0] ? 4 : -6), y + 10, 3, 3, [1, 1, 1, a])
      this.text(this.ui, b.text, x + 4, y + 2, rgba('#3B2416', a))
    }
  }
}
