import { ALL_CARDS, sortByGroup, sortCards } from '../game/cards'
import { PERSONAS, pick } from '../game/personas'
import { shapeName } from '../game/rules'
import type { Highlight } from '../game/tutorial'
import type { End, GameEvent, GameState, PersonaId, Player } from '../game/types'
import type { Atlas } from './atlas'
import { GLYPH_ADV, textWidth } from './font'
import { fitScale, handSpacing, makeLayout, type Layout, type P } from './layout'
import { Renderer, type Draw, type Light } from './renderer'
import { buildAtlas, CARD_H, CARD_W, HAWKER_H, HAWKER_W, MINI_H, MINI_W, SIGNS, STALL_COLORS, type Pose } from './sprites'

export interface Snapshot {
  state: GameState
  inGame: boolean
  selected: string[]
  cilokMode: { stamp: boolean } | null
  highlights: Highlight[]
  canStamp: boolean
  sortMode: 'value' | 'group'
  scanlines: boolean
}

export interface Callbacks {
  pickHand: (id: string) => void
  pickEnd: (end: End) => void
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
  tint?: number
  zone: 'deck' | 'hand' | 'opp' | 'habuan' | 'pile' | 'gerai'
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
  kind: 'steam' | 'smoke' | 'spark' | 'dust'
  color: string
}
interface EvLight extends Light {
  decay: number
}
interface CoinFlight {
  from: P
  to: P
  target: number
  at: number
}

const MENU_FAN = ['kopitiam-2', 'nasi-1', 'roti-1', 'kuih-2', 'kopitiam-1', 'nasi-2', 'kuih-5']
const SIGN_COLORS = ['#FFB347', '#9CFF8A', '#FFD27A', '#7FD6FF', '#FF7AA8', '#FF7A45']
const MENU_PLAYERS: Player[] = (['you', 'ahseng', 'lina', 'mat'] as PersonaId[]).map((persona, id) => ({
  id,
  name: PERSONAS[persona].name,
  isHuman: id === 0,
  persona,
  hand: [],
  habuan: [],
  duit: 0,
  stampUsed: false,
  total: 0,
  roundScores: [],
}))
const SHORT: Record<PersonaId, string> = { you: 'YOU', ahseng: 'AH SENG', lina: 'KAK LINA', mat: 'ABANG MAT' }

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
  private stampAnim: Record<number, number> = {}
  private shake = { until: 0, mag: 0 }
  private flash = 0
  private lastSeq: number
  private spotlight: number | null = null
  private hovered: string | null = null
  private hits: { x: number; y: number; w: number; h: number; hand?: string; end?: End }[] = []
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

  /** Fit to the canvas's CSS size; returns the scale for the DOM overlay. */
  resize(cssW: number, cssH: number, dpr: number) {
    const fit = fitScale(Math.floor(cssW * dpr), Math.floor(cssH * dpr))
    this.renderer.resize(fit.W, fit.H, fit.scale)
    const first = !this.L
    this.L = makeLayout(fit.W, fit.H, this.players().length)
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
    if (h?.hand) this.cb.pickHand(h.hand)
    else if (h?.end) this.cb.pickEnd(h.end)
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
    ALL_CARDS.forEach((c, i) => {
      out.set(c.id, { x: L.deck[0], y: L.deck[1] - Math.floor(i / 4), size: 'big', face: 'back', z: 10 + i * 0.01, zone: 'deck' })
    })
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
          out.set(c.id, {
            x: L.cx + (i - (hand.length - 1) / 2) * sp,
            y: L.handY + CARD_H / 2 - lift,
            size: 'big',
            face: 'front',
            z: 500 + i,
            zone: 'hand',
          })
        })
      } else {
        p.hand.forEach((c, i) => {
          out.set(c.id, { x: seat.hand[0] + (i - (p.hand.length - 1) / 2) * 4, y: seat.hand[1], size: 'mini', face: 'back', z: 300 + i, zone: 'opp' })
        })
      }
      p.habuan.forEach((c, k) => {
        out.set(c.id, {
          x: seat.plate[0] + Math.round((hash(c.id, 1) - 0.5) * 8),
          y: seat.plate[1] - 3 - Math.floor(k / 2),
          size: 'mini',
          face: 'front',
          z: 200 + pi * 50 + k,
          zone: 'habuan',
        })
      })
    })
    s.gerai.pile.forEach((c, k) => {
      out.set(c.id, {
        x: L.gerai[0] + Math.round((hash(c.id, 2) - 0.5) * 70),
        y: L.gerai[1] - 10 + Math.round((hash(c.id, 3) - 0.5) * 10),
        size: 'big',
        face: 'front',
        z: 250 + k,
        tint: 0.62,
        zone: 'pile',
      })
    })
    const n = s.gerai.cards.length
    sortCards(s.gerai.cards).forEach((c, i) => {
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

  private floatAt(seat: number, text: string, color: string) {
    const s = this.seatOf(seat)
    const human = this.players()[seat]?.isHuman
    const [x, y] = human ? [s.plate[0], s.plate[1] - 14] : [s.avatar[0], this.L.tableTop - 52]
    // Stack labels that land on the same hawker at once.
    const stacked = this.floats.filter((f) => f.x === x && this.t - f.at < 0.6).length
    this.floats.push({ x, y: y + stacked * 12, text, color, at: this.t })
  }

  private light(x: number, y: number, z: number, radius: number, color: string, intensity: number, decay: number) {
    this.evLights.push({ x, y, z, radius, color: rgb(color), intensity, decay })
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
          const n = s.players.length
          const order = new Map<string, number>()
          s.players.forEach((p, pi) => p.hand.forEach((c, i) => order.set(c.id, i * n + pi)))
          for (const [id, ent] of this.cards) {
            ent.x = L.deck[0]
            ent.y = L.deck[1]
            ent.vx = ent.vy = 0
            ent.size = 'big'
            ent.face = 'back'
            ent.flip = 1
            ent.hold = this.t + 0.25 + (order.get(id) ?? 0) * 0.04
          }
          break
        }
        case 'jual':
          this.shake = { until: this.t + 0.2, mag: e.cards.length >= 4 ? 3 : 2 }
          this.flash = 0.09
          this.light(L.gerai[0], L.gerai[1], 40, 150, '#FFC870', 1.6, 2.2)
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2
            const v = 30 + Math.random() * 60
            this.particles.push({
              x: L.gerai[0],
              y: L.gerai[1],
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v - 30,
              life: 0,
              max: 0.5 + Math.random() * 0.3,
              kind: 'spark',
              color: Math.random() < 0.5 ? '#FFE08A' : '#FFFFFF',
            })
          }
          this.react(e.actor, e.beat !== null && Math.random() < 0.5 ? 'slap' : 'joy', (p) => p.lines.jual)
          break
        case 'cilok':
          this.light(L.gerai[0], L.gerai[1], 30, 120, '#FF4A3A', 1.4, 2.5)
          this.flights.push({ from: this.seatOf(e.actor).coins, to: this.seatOf(e.target).coins, target: e.target, at: this.t + 0.15 })
          this.react(e.target, 'annoyed', (p) => p.lines.stolen, 0.15)
          this.react(e.actor, 'sly', (p) => p.lines.cilok)
          this.floatAt(e.target, '+1 DUIT', '#F4B42A')
          if (e.stamp) this.stampAnim[e.actor] = this.t
          break
        case 'pass':
          this.react(e.actor, 'shrug', (p) => p.lines.pass)
          break
        case 'collect': {
          const seat = this.seatOf(e.actor)
          this.floatAt(e.actor, `+${e.count} HABUAN`, '#3CE08A')
          this.light(seat.plate[0], seat.plate[1], 30, 70, '#9CFF8A', 1.0, 1.5)
          break
        }
        case 'roundEnd':
        case 'gameOver':
          this.spotlight = e.winner
          s.players.forEach((p) => {
            this.react(p.id, p.id === e.winner ? 'cheer' : 'sad', (ps) => (p.id === e.winner ? ps.lines.win : ps.lines.lose), 0.3)
            const rs = p.roundScores[p.roundScores.length - 1]
            if (e.type === 'roundEnd' && rs) this.floatAt(p.id, `${rs.score >= 0 ? '+' : ''}${rs.score}`, rs.score >= 0 ? '#3CE08A' : '#FF6A5A')
          })
          break
      }
    }
  }

  // ───────────────────────── update ─────────────────────────

  private update(dt: number) {
    if (!this.L) return
    if (this.L.seats.length !== this.players().length) this.L = makeLayout(this.L.W, this.L.H, this.players().length)
    this.processEvents()

    // Cards spring toward their targets; size and face swap mid-flight.
    const targets = this.targets()
    for (const [id, tgt] of targets) {
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
      if (p.kind === 'steam' || p.kind === 'smoke') p.vx += Math.sin(this.t * 2 + p.y * 0.2) * 6 * dt
    }
    this.particles = this.particles.filter((p) => p.life < p.max)

    for (const l of this.evLights) l.intensity -= l.decay * dt
    this.evLights = this.evLights.filter((l) => l.intensity > 0)
    this.flash = Math.max(0, this.flash - dt * 0.5)
    this.flights = this.flights.filter((f) => this.t - f.at < 0.8)
    this.floats = this.floats.filter((f) => this.t - f.at < 2)
    this.bubbles = this.bubbles.filter((b) => this.t - b.at < 2.4)

    // Hawkers chatting on the title screen.
    if (!this.snap.inGame && this.t > this.nextMenuReaction) {
      this.nextMenuReaction = this.t + 2.5 + Math.random() * 3
      const id = 1 + Math.floor(Math.random() * 3)
      const kind = pick<ReactionKind>(['joy', 'sly', 'slap', 'shrug'])
      this.react(id, kind, (p) => (kind === 'shrug' ? p.lines.pass : kind === 'sly' ? p.lines.cilok : p.lines.jual))
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

  /** Floating score text on a dark tag, so it reads over anything. */
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

    // Hawkers sit behind the table.
    players.forEach((p, i) => {
      if (p.isHuman) return
      this.drawHawker(p, i)
    })

    this.drawTable()

    // Table props per seat.
    players.forEach((p, i) => {
      const seat = this.seatOf(i)
      this.spr(this.lit, 'plate', seat.plate[0] - 15, seat.plate[1] - 9)
      const inFlight = this.flights.filter((f) => f.target === i && this.t - f.at < 0.7).length
      const count = Math.max(0, p.duit - inFlight)
      for (let k = 0; k < count; k++) {
        const stack = Math.floor(k / 6)
        this.spr(this.lit, 'coin:slice', seat.coins[0] - 4 + (stack % 2) * 10 - Math.floor(stack / 2) * 5, seat.coins[1] - 2 - (k % 6) * 2 - Math.floor(stack / 2) * 3)
      }
      const anim = this.stampAnim[i]
      const at = anim !== undefined ? Math.min(1, (this.t - anim) / 0.5) : 1
      const used = p.stampUsed && at >= 0.5
      const hop = anim !== undefined && at < 1 ? Math.sin(at * Math.PI) * 12 : 0
      this.spr(this.lit, used ? 'stamp:used' : 'stamp', seat.stamp[0] - 8, seat.stamp[1] - 16 - hop, used ? { color: [0.7, 0.66, 0.66, 1] } : {})
      if (anim !== undefined && this.t - anim < 1.2) this.spr(this.em, 'halo:14', seat.stamp[0] - 14, seat.stamp[1] - 22, { color: [1, 0.5, 0.2, 1 - (this.t - anim) / 1.2] })
      if (i === 0 && this.snap.canStamp) this.spr(this.em, 'ring:small', seat.stamp[0] - 12, seat.stamp[1] - 8, { color: [1, 0.7, 0.2, this.pulse(4) * 0.7] })
    })

    this.spr(this.lit, 'cup', L.cup[0] - 7, L.cup[1] - 8)
    if (inGame && !s.gerai.cards.length && s.status === 'playing') {
      // Dotted outline marks the empty Gerai.
      for (let x = -60; x <= 60; x += 4) {
        this.rect(this.lit, L.gerai[0] + x, L.gerai[1] - 26, 2, 1, rgba('#C9985A'))
        this.rect(this.lit, L.gerai[0] + x, L.gerai[1] + 25, 2, 1, rgba('#C9985A'))
      }
    }

    this.drawCards()
    this.drawParticles()
    this.drawFlights()
    this.drawHighlights(hl)
    this.drawLights()
    if (inGame) {
      players.forEach((p, i) => {
        if (!p.isHuman) this.drawTelemetry(p, i, hl.some((h) => h.kind === 'telemetry'))
      })
      this.drawGeraiLabel()
    }
    this.drawBubbles()
    for (const f of this.floats) {
      const a = (this.t - f.at) / 2
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
    })
  }

  private drawBackdrop() {
    const L = this.L
    const bands = ['#120A1C', '#1A1027', '#221532', '#2A1A3A']
    const skyH = L.stallY + 30
    bands.forEach((c, i) => this.rect(this.lit, 0, (i * skyH) / bands.length, L.W, skyH / bands.length + 1, rgba(c)))
    this.rect(this.lit, 0, skyH, L.W, L.H - skyH, rgba('#1E1722'))

    // Distant stars and lanterns in the strip of sky.
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
    for (let i = 0; i < 4; i++) {
      this.lights.push({ x: (L.W * (i + 0.5)) / 4, y: L.stallY + 8, z: 26, radius: 90, color: rgb('#FFC870'), intensity: 0.35 })
    }

    // Stalls with neon signs.
    const n = Math.ceil(L.W / 104) + 1
    const x0 = L.cx - (n * 104) / 2
    for (let i = 0; i < n; i++) {
      const sx = Math.round(x0 + i * 104)
      const k = ((i % STALL_COLORS.length) + STALL_COLORS.length) % STALL_COLORS.length
      this.spr(this.lit, `stall:${k}`, sx, L.stallY)
      const sign = SIGNS[k]
      const col = SIGN_COLORS[k]
      const buzz = hash(sign) < 0.35 && Math.sin(this.t * 13 + i) > 0.92 ? 0.25 : 1
      const tw = textWidth(sign)
      this.text(this.em, sign, sx + 55 - tw / 2, L.stallY + 29, rgba(col, buzz))
      this.spr(this.em, 'halo:24', sx + 55 - 24, L.stallY + 9, { color: rgba(col, 0.22 * buzz) })
      this.lights.push({ x: sx + 55, y: L.stallY + 36, z: 18, radius: 70, color: rgb(col), intensity: 0.55 * buzz })
      // Shoppers browsing.
      for (let j = 0; j < 2; j++) {
        const fx = sx + 22 + j * 46 + Math.round(Math.sin(this.t * 0.3 + i * 2 + j) * 6)
        const f = Math.floor(this.t * 2 + i + j) % 2
        this.spr(this.lit, `shopper:${(i + j) % 3}:${f}`, fx, L.stallY + 50)
      }
    }

    // Satay grill glow and smoke.
    const [gx, gy] = L.grill
    this.spr(this.lit, 'grill', gx - 26, gy - 9)
    const fl = 0.75 + 0.25 * Math.sin(this.t * 17) * Math.sin(this.t * 5.3)
    this.rect(this.em, gx - 22, gy - 6, 44, 2, rgba('#FF6A2A', fl))
    this.spr(this.em, 'halo:14', gx - 14, gy - 20, { color: rgba('#FF7A2A', 0.4 * fl) })
    this.lights.push({ x: gx, y: gy, z: 12, radius: 60, color: rgb('#FF7A2A'), intensity: 0.9 * fl })

    // Hanging lamps over the table: swaying, flickering incandescents.
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
    // Soft fill so your own hand always reads.
    this.lights.push({ x: L.cx, y: L.H + 10, z: 90, radius: L.portrait ? 280 : 230, color: rgb('#FFE6C8'), intensity: 0.75 })
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
    for (let x = L.tableLeft; x < L.tableRight; x += 64) {
      this.spr(this.lit, 'table:front', x, L.tableBottom, { sw: Math.min(64, L.tableRight - x) })
    }
    for (const lx of [L.tableLeft + 6, L.tableRight - 14]) this.rect(this.lit, lx, L.tableBottom + 10, 8, L.H - L.tableBottom - 10, rgba('#3E2112'))
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
    const pose = this.poseFor(i)
    this.spr(this.lit, `hawker:${p.persona}:${pose}`, seat.avatar[0] - HAWKER_W / 2, seat.avatar[1] - HAWKER_H)
    const s = this.snap.state
    if (this.snap.inGame && s.status === 'playing' && s.turn === i) {
      this.spr(this.em, 'ring:avatar', seat.avatar[0] - 26, this.L.tableTop - 4, { color: rgba('#00A859', this.pulse(5)) })
      this.lights.push({ x: seat.avatar[0], y: this.L.tableTop - 6, z: 20, radius: 50, color: rgb('#00E07A'), intensity: 0.5 * this.pulse(5) })
    }
    if (this.spotlight === i) {
      this.lights.push({ x: seat.avatar[0], y: seat.avatar[1] - 30, z: 60, radius: 80, color: rgb('#FFF0C0'), intensity: 1.3 })
    }
  }

  private drawCards() {
    const L = this.L
    const s = this.snap.state
    const targets = this.targets()
    const geraiSorted = sortCards(s.gerai.cards)
    const ends: Record<End, string | undefined> = { low: geraiSorted[0]?.id, high: geraiSorted[geraiSorted.length - 1]?.id }
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
      const tint = t.tint ?? 1
      this.spr(this.lit, name, x, y, { w: dw, h, color: [tint, tint, tint * 0.95, 1] })
      if (canPick && t.zone === 'hand') this.hits.push({ x, y, w: dw, h: h + 12, hand: id })
      if (canPick && this.snap.cilokMode && t.zone === 'gerai' && (id === ends.low || id === ends.high)) {
        this.hits.push({ x: x - 2, y: y - 14, w: dw + 4, h: h + 16, end: id === ends.low ? 'low' : 'high' })
      }
      if (this.snap.selected.includes(id) && t.zone === 'hand') this.frameRect(this.em, x - 1, y - 1, dw + 2, h + 2, rgba('#00E07A', 0.9))
    }
    // CILOK: both end dishes glow red with an arrow, waiting for a tap.
    if (this.snap.cilokMode) {
      for (const end of ['low', 'high'] as End[]) {
        const id = ends[end]
        if (!id) continue
        const e = this.cards.get(id)!
        const x = Math.round(e.x - CARD_W / 2)
        const y = Math.round(e.y - CARD_H / 2)
        this.frameRect(this.em, x - 2, y - 2, CARD_W + 4, CARD_H + 4, rgba('#FF4A3A', this.pulse(8)), 2)
        this.spr(this.ui, 'arrow', x + CARD_W / 2 - 3, y - 10 + Math.round(Math.sin(this.t * 8) * 2), { color: rgba('#FF6A5A') })
      }
      const label = 'TAP AN END DISH TO CILOK'
      this.rect(this.ui, L.gerai[0] - textWidth(label) / 2 - 4, L.gerai[1] - 48, textWidth(label) + 8, 11, [0.08, 0.04, 0.06, 0.85])
      this.text(this.ui, label, L.gerai[0] - textWidth(label) / 2, L.gerai[1] - 46, rgba('#FF8A7A'))
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
        // Puffs grow then shrink away, no blending: stays crisp.
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
    const geraiSorted = sortCards(s.gerai.cards)
    const cardBox = (id: string) => {
      const e = this.cards.get(id)
      if (!e) return
      const w = e.size === 'big' ? CARD_W : MINI_W
      const h = e.size === 'big' ? CARD_H : MINI_H
      this.frameRect(this.em, Math.round(e.x - w / 2) - 2, Math.round(e.y - h / 2) - 2, w + 4, h + 4, c, 2)
    }
    for (const h of hl) {
      switch (h.kind) {
        case 'cards':
          h.ids.forEach((id) => {
            if (!this.snap.selected.includes(id)) cardBox(id)
          })
          break
        case 'hand':
          s.players[0]?.hand.forEach((card) => cardBox(card.id))
          break
        case 'gerai':
          this.frameRect(this.em, L.gerai[0] - 110, L.gerai[1] - 34, 220, 64, c, 2)
          break
        case 'geraiEnd': {
          const ids = h.end === 'both' ? [geraiSorted[0], geraiSorted[geraiSorted.length - 1]] : [h.end === 'low' ? geraiSorted[0] : geraiSorted[geraiSorted.length - 1]]
          ids.forEach((card) => card && !this.snap.cilokMode && cardBox(card.id))
          break
        }
        case 'plate': {
          const p = this.seatOf(h.seat).plate
          this.spr(this.em, 'ring:plate', p[0] - 19, p[1] - 12, { color: c })
          break
        }
        case 'coins': {
          const p = this.seatOf(h.seat).coins
          this.spr(this.em, 'ring:small', p[0] - 12, p[1] - 8, { color: c })
          break
        }
        case 'stamp': {
          const p = this.seatOf(h.seat).stamp
          this.spr(this.em, 'ring:small', p[0] - 12, p[1] - 8, { color: c })
          break
        }
      }
    }
  }

  private drawLights() {
    for (const l of this.evLights) this.lights.push(l)
  }

  private drawTelemetry(p: Player, i: number, glow: boolean) {
    const seat = this.seatOf(i)
    const s = this.snap.state
    const name = this.L.portrait ? SHORT[p.persona] : p.name.toUpperCase()
    const stats: [string, string][] = [
      ['icon:card', String(p.hand.length)],
      ['icon:coin', String(p.duit)],
      ['icon:trophy', String(p.habuan.length)],
    ]
    const total = `=${p.total}`
    const statsW = stats.reduce((w, [, v]) => w + 9 + textWidth(v) + 4, 0) + textWidth(total)
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
    for (const [icon, v] of stats) {
      this.spr(this.ui, icon, sx, y + 12)
      this.text(this.ui, v, sx + 9, y + 12, rgba('#5A3A26'))
      sx += 9 + textWidth(v) + 4
    }
    this.text(this.ui, total, sx, y + 12, rgba('#00A859'))
  }

  private drawGeraiLabel() {
    const L = this.L
    const s = this.snap.state
    if (s.status !== 'playing') return
    const owner = s.gerai.ownerId !== null ? s.players[s.gerai.ownerId] : null
    const label = owner ? `GERAI: ${owner.isHuman ? 'YOURS' : this.L.portrait ? SHORT[owner.persona] : owner.name} - ${shapeName(s.gerai.shape!, s.gerai.cards)}` : 'GERAI KOSONG: OPEN WITH ANY SET'
    const tw = textWidth(label)
    const y = L.gerai[1] + 26
    this.rect(this.ui, L.gerai[0] - tw / 2 - 4, y - 2, tw + 8, 11, [0.08, 0.04, 0.08, 0.82])
    this.text(this.ui, label, L.gerai[0] - tw / 2, y, rgba('#FFE7B0'))
  }

  private drawBubbles() {
    for (const b of this.bubbles) {
      const e = this.t - b.at
      if (e < 0) continue
      const seat = this.seatOf(b.seat)
      const tw = textWidth(b.text)
      const w = tw + 8
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
