import { ALL_CARDS, GROUPS, RED_SUITS, rankLabel } from '../game/cards'
import type { Card, Group, PersonaId } from '../game/types'
import { Atlas } from './atlas'
import { FONT_CHARS, textWidth } from './font'
import { Paint } from './paint'

export const INK = '#1A0F14'
export const C = {
  paper: '#F4E8CC',
  paperShade: '#E0CFA8',
  white: '#FFFBF0',
  cream: '#FBF3DF',
  kopi: '#4A2A1A',
  wood1: '#6E3D1F',
  wood2: '#84492A',
  wood3: '#9A5C34',
  wood4: '#B07042',
  woodDark: '#3E2112',
  red: '#C8352B',
  redDark: '#7A1E1E',
  maroon: '#7A2335',
  pink: '#E86A9A',
  yellow: '#F4B42A',
  yellowLight: '#FFE08A',
  orange: '#E87A2A',
  green: '#2F8F5B',
  leaf: '#3E9B4F',
  greenLight: '#7CCB5A',
  hijau: '#00A859',
  blue: '#3B6FB6',
  blueRim: '#2F5FA8',
  indigo: '#22305C',
  indigoLight: '#3A4C86',
  grey: '#9A93A0',
  greyDark: '#4A4250',
  gold: '#E3A83A',
  goldDark: '#9C6A22',
  goldLight: '#FFE7A0',
  shadow: '#2A1A22',
}

/** Two card colours, like a normal deck: sambal red and near-black kopi. */
const RED = '#C8352B'
const BLACK = '#2A1A22'
export const SUIT_INK: Record<Group, string> = Object.fromEntries(GROUPS.map((g) => [g, RED_SUITS.includes(g) ? RED : BLACK])) as Record<Group, string>
/** Pale tint behind the picture: blush for red suits, cool slate for black. */
const SUIT_TINT: Record<Group, string> = Object.fromEntries(GROUPS.map((g) => [g, RED_SUITS.includes(g) ? '#F8D8D2' : '#D6DCE6'])) as Record<Group, string>

export const CARD_W = 32
export const CARD_H = 44
export const MINI_W = 12
export const MINI_H = 16

// ───────────────────────── 16×16 dish icons ─────────────────────────

type Icon = (p: Paint, ox: number, oy: number) => void

/** One full-colour picture per suit, the same on every card of that suit. */
const SUIT_ART: Record<Group, Icon> = {
  karipap: (p, ox, oy) => {
    // Crimped half-moon pastry.
    for (let y = 0; y < 8; y++) {
      const half = Math.round(Math.sqrt(64 - (8 - y) ** 2) * 0.95)
      p.rect(ox + 8 - half, oy + 5 + y, half * 2, 1, y < 2 ? '#F2C15A' : y < 6 ? '#E3A23A' : '#C9852A')
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      p.px(ox + 8 + Math.round(Math.cos(a) * 7.5), oy + 13 + Math.round(Math.sin(a) * 7.5), '#9A5E1A')
    }
    p.rect(ox + 1, oy + 13, 14, 1, '#9A5E1A')
    p.px(ox + 5, oy + 8, '#FFE7A0')
    p.px(ox + 6, oy + 7, '#FFE7A0')
  },
  tehtarik: (p, ox, oy) => {
    // Tall glass of teh tarik with a frothy top.
    p.rect(ox + 4, oy + 1, 8, 14, '#DDEFF4')
    p.rect(ox + 5, oy + 4, 6, 10, '#C8925A')
    p.rect(ox + 5, oy + 2, 6, 3, '#F6E7CC')
    p.px(ox + 6, oy + 1, '#F6E7CC')
    p.px(ox + 9, oy + 1, '#F6E7CC')
    p.rect(ox + 4, oy + 1, 1, 14, '#FFFFFF')
    p.rect(ox + 5, oy + 9, 6, 1, '#B07A48')
    p.ring(ox + 12.5, oy + 8, 2, 2.5, '#DDEFF4')
    p.rect(ox + 3, oy + 15, 10, 1, '#B8C8CC')
  },
  ramly: (p, ox, oy) => {
    p.ellipse(ox + 8, oy + 5, 7, 3.5, '#D98A3A')
    p.rect(ox + 1, oy + 5, 14, 2, '#D98A3A')
    for (const [x, y] of [
      [5, 3],
      [9, 2],
      [11, 4],
      [7, 5],
    ])
      p.px(ox + x, oy + y, '#FFF2C8')
    p.rect(ox + 1, oy + 7, 14, 1, '#7CCB5A')
    p.rect(ox, oy + 8, 16, 2, '#F4D35E')
    p.rect(ox + 1, oy + 10, 14, 2, '#6B3A1E')
    p.px(ox + 14, oy + 9, '#C8352B')
    p.rect(ox + 1, oy + 12, 14, 2, '#C97A30')
    p.rect(ox + 2, oy + 14, 12, 1, '#A8622A')
  },
  nasilemak: (p, ox, oy) => {
    p.ellipse(ox + 8, oy + 10, 8, 5, C.leaf)
    p.rect(ox + 2, oy + 10, 12, 1, '#2C7239')
    p.ellipse(ox + 6, oy + 9, 4, 3, '#FFFDF8')
    p.circle(ox + 11.5, oy + 7.5, 2, C.red)
    p.ellipse(ox + 11, oy + 12, 2, 1.4, '#FFFFFF')
    p.px(ox + 11, oy + 12, C.yellow)
    p.rect(ox + 2, oy + 12, 2, 1, C.greenLight)
    p.rect(ox + 5, oy + 13, 3, 1, '#C98B4A')
  },
}

/** Top row of each suit picture, so the 2's crown can sit right on it. */
const ART_TOP: Record<Group, number> = { karipap: 5, tehtarik: 1, ramly: 2, nasilemak: 5 }

/** 5×5 one-colour suit symbols for the card corners. */
const PIPS: Record<Group, string[]> = {
  karipap: ['.....', '.###.', '#####', '#####', '.....'],
  tehtarik: ['###..', '###.#', '###.#', '####.', '###..'],
  ramly: ['.###.', '#####', '.....', '#####', '.###.'],
  nasilemak: ['..#..', '.###.', '.###.', '#####', '#####'],
}

export function pip(p: Paint, group: Group, x: number, y: number, col = SUIT_INK[group]) {
  PIPS[group].forEach((row, ry) => [...row].forEach((c, rx) => c === '#' && p.px(x + rx, y + ry, col)))
}

/** Tiny 16×16 hawker portraits for the face cards. */
function portrait(p: Paint, ox: number, oy: number, rank: number) {
  const skin = rank === 11 ? '#B97A4E' : rank === 12 ? '#D9A273' : '#F0C9A0'
  if (rank === 12) p.ellipse(ox + 8, oy + 8, 7, 7.5, '#F28C28')
  p.ellipse(ox + 8, oy + 9, rank === 12 ? 4.5 : 5.5, rank === 12 ? 5 : 6, skin)
  p.rect(ox + 3, oy + 14, 10, 2, rank === 11 ? '#7A3E9D' : rank === 12 ? '#E2557A' : '#F2EFE6')
  p.px(ox + 6, oy + 9, INK)
  p.px(ox + 10, oy + 9, INK)
  p.rect(ox + 7, oy + 12, 3, 1, INK)
  if (rank === 11) {
    // Abang: songkok and moustache.
    p.rect(ox + 3, oy + 1, 10, 4, '#1B1416')
    p.rect(ox + 6, oy + 11, 5, 1, '#2A1A14')
  }
  if (rank === 13) {
    // Tauke: bald with round glasses and a gold chain.
    p.ring(ox + 6, oy + 9, 1.6, 1.6, '#2A2020')
    p.ring(ox + 10, oy + 9, 1.6, 1.6, '#2A2020')
    p.rect(ox + 3, oy + 6, 2, 3, '#D8D4CC')
    p.rect(ox + 12, oy + 6, 2, 3, '#D8D4CC')
    p.rect(ox + 5, oy + 14, 6, 1, C.gold)
  }
}

function crown(p: Paint, ox: number, oy: number) {
  p.rect(ox, oy + 2, 9, 3, C.gold)
  p.px(ox, oy, C.gold)
  p.px(ox, oy + 1, C.gold)
  p.px(ox + 4, oy, C.gold)
  p.px(ox + 4, oy + 1, C.gold)
  p.px(ox + 8, oy, C.gold)
  p.px(ox + 8, oy + 1, C.gold)
  p.px(ox + 4, oy + 3, C.red)
}

function cardFront(card: Card): Paint {
  const p = new Paint(CARD_W, CARD_H)
  const ink = SUIT_INK[card.group]
  const special = card.rank >= 14
  p.rrect(0, 0, CARD_W, CARD_H, ink)
  p.rrect(1, 1, CARD_W - 2, CARD_H - 2, C.paper)
  p.rect(2, CARD_H - 3, CARD_W - 4, 1, C.paperShade)
  // Corner index and suit symbol: what you read when cards overlap in hand.
  const label = rankLabel(card.rank)
  p.text(label, label.length > 1 ? 2 : 3, 3, ink, 2)
  pip(p, card.group, label.length > 1 ? 3 : 4, 19)
  p.ellipse(19, 28, 10, 9, SUIT_TINT[card.group])
  if (special) p.ring(19, 28, 10, 9, C.gold)
  if (card.rank >= 11 && card.rank <= 13) portrait(p, 11, 20, card.rank)
  else SUIT_ART[card.group](p, 11, 20)
  // The 2 wears its crown on top of the food itself.
  if (card.rank === 15) crown(p, 15, 20 + ART_TOP[card.group] - 4)
  p.text(label, CARD_W - 3 - textWidth(label), CARD_H - 10, ink)
  return p
}

function batikDot(p: Paint, x: number, y: number) {
  p.px(x, y, C.yellow)
  p.px(x - 1, y, C.orange)
  p.px(x + 1, y, C.orange)
  p.px(x, y - 1, C.orange)
  p.px(x, y + 1, C.orange)
}

function cardBack(): Paint {
  const p = new Paint(CARD_W, CARD_H)
  p.rrect(0, 0, CARD_W, CARD_H, C.maroon)
  p.rect(2, 2, CARD_W - 4, CARD_H - 4, C.indigo)
  for (let y = 3; y < CARD_H - 3; y++) for (let x = 3; x < CARD_W - 3; x++) if ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) p.px(x, y, C.indigoLight)
  for (let y = 6; y < CARD_H - 4; y += 8) for (let x = (y / 8) % 2 ? 6 : 10; x < CARD_W - 4; x += 8) batikDot(p, x, y)
  // Raja Gerai badge: "RG" wearing a crown on top of the oval.
  p.ellipse(16, 23, 9, 6, C.cream)
  p.ring(16, 23, 9, 6, C.yellow)
  p.text('RG', 11, 20, C.maroon)
  p.rect(9, 12, 15, 6, C.indigo)
  crown(p, 12, 13)
  for (let x = 2; x < CARD_W - 2; x += 3) {
    p.px(x, 1, C.yellow)
    p.px(x, CARD_H - 2, C.yellow)
  }
  return p
}

function miniBack(): Paint {
  const p = new Paint(MINI_W, MINI_H)
  p.rrect(0, 0, MINI_W, MINI_H, C.maroon)
  p.rect(1, 1, MINI_W - 2, MINI_H - 2, C.indigo)
  batikDot(p, 6, 5)
  batikDot(p, 6, 11)
  return p
}

function miniFront(group: Group): Paint {
  const p = new Paint(MINI_W, MINI_H)
  p.rrect(0, 0, MINI_W, MINI_H, SUIT_INK[group])
  p.rect(1, 1, MINI_W - 2, MINI_H - 2, C.paper)
  p.circle(6, 8, 4, SUIT_TINT[group])
  pip(p, group, 4, 6)
  return p
}

// ───────────────────────── hawkers ─────────────────────────

export type Pose =
  | 'idle0'
  | 'idle1'
  | 'think'
  | 'joy0'
  | 'joy1'
  | 'slap0'
  | 'slap1'
  | 'annoyed0'
  | 'annoyed1'
  | 'sly'
  | 'shrug'
  | 'cheer0'
  | 'cheer1'
  | 'sad'
export const POSES: Pose[] = ['idle0', 'idle1', 'think', 'joy0', 'joy1', 'slap0', 'slap1', 'annoyed0', 'annoyed1', 'sly', 'shrug', 'cheer0', 'cheer1', 'sad']

export const HAWKER_W = 52
export const HAWKER_H = 56

type Hair = 'bald' | 'balding' | 'short' | 'spiky' | 'wavy' | 'bun' | 'long' | 'bob' | 'braid' | 'ponytail' | 'tudung' | 'songkok' | 'turban' | 'kopiah'
type Top = 'singlet' | 'tee' | 'batik' | 'tankCardigan' | 'kebaya' | 'saree' | 'checked' | 'hawaiian' | 'floral' | 'blouse' | 'kurta'

/** Everything that makes one hawker look like themselves. */
interface Look {
  skin: string
  skinDark: string
  top: Top
  shirt: string
  /** Pattern / second colour: batik dots, the tank under a cardigan, a saree drape… */
  trim?: string
  apron?: string
  hair: Hair
  hairColor: string
  /** Tudung, songkok, turban or kopiah colour. */
  headwear?: string
  beard?: 'full' | 'mustache'
  beardColor?: string
  glasses?: boolean
  towel?: boolean
  bindi?: boolean
  earrings?: string
  necklace?: string[]
  /** Waves a spatula when celebrating. */
  tool?: boolean
  lashes?: boolean
}

const LOOKS: Record<Exclude<PersonaId, 'you'>, Look> = {
  ahseng: { skin: '#F0C9A0', skinDark: '#D8A87A', top: 'singlet', shirt: '#F2EFE6', apron: '#3B6FB6', hair: 'balding', hairColor: '#D8D4CC', glasses: true, towel: true, tool: true },
  lina: { skin: '#D9A273', skinDark: '#B98455', top: 'blouse', shirt: '#E2557A', trim: '#B83B5E', apron: '#FFE9A8', hair: 'tudung', hairColor: '#F28C28', headwear: '#F28C28', lashes: true },
  mat: { skin: '#B97A4E', skinDark: '#94603A', top: 'batik', shirt: '#7A3E9D', trim: '#F4B42A', apron: '#F4B42A', hair: 'songkok', hairColor: '#2A1A14', headwear: '#1B1416', beard: 'mustache', beardColor: '#2A1A14', tool: true },
  ayan: { skin: '#D9A273', skinDark: '#B98455', top: 'tankCardigan', shirt: '#3B6FB6', trim: '#FBFBF6', hair: 'long', hairColor: '#2A1A14', lashes: true, earrings: '#E3A83A' },
  pakdan: { skin: '#B97A4E', skinDark: '#94603A', top: 'tee', shirt: '#7A1E2E', hair: 'bald', hairColor: '#2A1E1A', beard: 'full', beardColor: '#2A1E1A', tool: true },
  meiling: { skin: '#F0C9A0', skinDark: '#D8A87A', top: 'floral', shirt: '#E86A9A', trim: '#FFF2F6', apron: '#FBF3DF', hair: 'bun', hairColor: '#2A2024', earrings: '#3FA34D', lashes: true },
  anand: { skin: '#8A5A3A', skinDark: '#6E4428', top: 'checked', shirt: '#3B6FB6', trim: '#F2EFE6', hair: 'wavy', hairColor: '#1A1214', beard: 'mustache', beardColor: '#1A1214', tool: true },
  kavitha: { skin: '#9A633F', skinDark: '#7A4A2C', top: 'saree', shirt: '#E07A1A', trim: '#C2187A', hair: 'braid', hairColor: '#1A1214', bindi: true, earrings: '#F4B42A', necklace: ['#F4B42A'], lashes: true },
  gurdev: { skin: '#C68B59', skinDark: '#A06C40', top: 'kurta', shirt: '#F2EFE6', trim: '#C9C2B4', apron: '#E07A1A', hair: 'turban', hairColor: '#1A1214', headwear: '#1F3F8A', beard: 'full', beardColor: '#1A1214' },
  dayang: { skin: '#C68B59', skinDark: '#A06C40', top: 'tee', shirt: '#22202A', hair: 'bob', hairColor: '#1A1214', necklace: ['#F4B42A', '#C8352B', '#FBFBF6', '#2A3466'], earrings: '#F4B42A', lashes: true },
  joanne: { skin: '#D9A273', skinDark: '#B98455', top: 'blouse', shirt: '#22202A', trim: '#E3A83A', apron: '#2E9A6A', hair: 'ponytail', hairColor: '#2A1A14', lashes: true },
  robert: { skin: '#E8B88A', skinDark: '#C8966A', top: 'hawaiian', shirt: '#D6852E', trim: '#FBF3DF', hair: 'short', hairColor: '#C8C4BC', beard: 'mustache', beardColor: '#C8C4BC', glasses: true, tool: true },
  ahkow: { skin: '#F0C9A0', skinDark: '#D8A87A', top: 'tee', shirt: '#4A8A3A', hair: 'spiky', hairColor: '#1A1418', towel: true, tool: true },
  sweelian: { skin: '#F0C9A0', skinDark: '#D8A87A', top: 'kebaya', shirt: '#F2A8C8', trim: '#FFFFFF', hair: 'bun', hairColor: '#1A1418', earrings: '#F4B42A', lashes: true },
  mamakali: { skin: '#8A5A3A', skinDark: '#6E4428', top: 'tee', shirt: '#2A7A8A', apron: '#F2EFE6', hair: 'kopiah', hairColor: '#1A1214', headwear: '#F2EFE6', beard: 'full', beardColor: '#1A1214', towel: true, tool: true },
}

type Pt = [number, number]
interface PoseSpec {
  dy: number
  headDx: number
  headDy: number
  left: Pt
  right: Pt
  face: 'smile' | 'blink' | 'flat' | 'open' | 'gasp' | 'smirk' | 'frown'
  brows: 'flat' | 'angry' | 'raised' | 'sad'
  eyes: 'dot' | 'happy' | 'up' | 'down' | 'closed'
}

const REST_L: Pt = [12, 52]
const REST_R: Pt = [40, 52]
const SPECS: Record<Pose, PoseSpec> = {
  idle0: { dy: 0, headDx: 0, headDy: 0, left: REST_L, right: REST_R, face: 'smile', brows: 'flat', eyes: 'dot' },
  idle1: { dy: 1, headDx: 0, headDy: 1, left: REST_L, right: REST_R, face: 'smile', brows: 'flat', eyes: 'closed' },
  think: { dy: 0, headDx: 1, headDy: 0, left: REST_L, right: [32, 28], face: 'flat', brows: 'raised', eyes: 'up' },
  joy0: { dy: -1, headDx: 0, headDy: -1, left: [6, 18], right: [46, 16], face: 'open', brows: 'raised', eyes: 'happy' },
  joy1: { dy: 0, headDx: 0, headDy: 0, left: [8, 14], right: [44, 20], face: 'open', brows: 'raised', eyes: 'happy' },
  slap0: { dy: -1, headDx: 0, headDy: -1, left: REST_L, right: [46, 22], face: 'open', brows: 'raised', eyes: 'happy' },
  slap1: { dy: 1, headDx: 0, headDy: 1, left: REST_L, right: [42, 54], face: 'open', brows: 'flat', eyes: 'happy' },
  annoyed0: { dy: 0, headDx: -2, headDy: 0, left: [2, 34], right: REST_R, face: 'gasp', brows: 'angry', eyes: 'dot' },
  annoyed1: { dy: 0, headDx: 2, headDy: 0, left: [3, 36], right: REST_R, face: 'gasp', brows: 'angry', eyes: 'dot' },
  sly: { dy: 0, headDx: 1, headDy: 0, left: [22, 46], right: [30, 46], face: 'smirk', brows: 'raised', eyes: 'dot' },
  shrug: { dy: -1, headDx: 0, headDy: 0, left: [5, 34], right: [47, 34], face: 'flat', brows: 'sad', eyes: 'dot' },
  cheer0: { dy: -3, headDx: 0, headDy: -3, left: [12, 4], right: [40, 4], face: 'open', brows: 'raised', eyes: 'happy' },
  cheer1: { dy: 0, headDx: 0, headDy: 0, left: [8, 10], right: [44, 10], face: 'open', brows: 'raised', eyes: 'happy' },
  sad: { dy: 1, headDx: 0, headDy: 3, left: [14, 54], right: [38, 54], face: 'frown', brows: 'sad', eyes: 'down' },
}

function arm(p: Paint, from: Pt, to: Pt, sleeve: string, skin: string) {
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = from[0] + (to[0] - from[0]) * t
    const y = from[1] + (to[1] - from[1]) * t
    p.rect(x - 2, y - 2, 4, 4, t < 0.75 ? sleeve : skin)
  }
  p.rect(to[0] - 2, to[1] - 2, 5, 4, skin)
}

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`
}

function hawker(id: Exclude<PersonaId, 'you'>, pose: Pose): Paint {
  const p = new Paint(HAWKER_W, HAWKER_H)
  const L = LOOKS[id]
  const s = SPECS[pose]
  const cx = 26
  const by = 34 + s.dy
  const hx = cx + s.headDx
  const hy = 20 + s.headDy
  const covered = L.hair === 'tudung'
  // Half-width of the head ellipse at a given row, for hair caps that hug the skull.
  const headHalf = (y: number) => Math.max(0, 10 * Math.sqrt(Math.max(0, 1 - ((y - hy) / 11) ** 2)))
  const cap = (y0: number, y1: number, col: string, extra = 1) => {
    for (let y = y0; y <= y1; y++) {
      const h = Math.round(headHalf(y) + extra)
      if (h > 0) p.rect(hx - h, y, h * 2, 1, col)
    }
  }

  // Hair that falls behind the head, neck and body, so it's drawn first.
  if (L.hair === 'long') p.rrect(hx - 12, hy - 8, 24, by + 10 - (hy - 8), L.hairColor)
  if (L.hair === 'bob' || L.hair === 'braid') p.rrect(hx - 12, hy - 8, 24, 18, L.hairColor)
  if (L.hair === 'ponytail') p.rect(hx + 8, hy - 3, 5, 13, L.hairColor)

  // Torso and top.
  const shirtDark = shade(L.shirt, 0.8)
  p.rrect(cx - 13, by, 26, 26, L.shirt)
  p.rect(cx + 7, by + 2, 5, 22, shirtDark)
  switch (L.top) {
    case 'singlet':
      p.rect(cx - 13, by, 6, 6, L.skin)
      p.rect(cx + 7, by, 6, 6, L.skin)
      break
    case 'batik':
      for (let y = by + 3; y < by + 24; y += 4) for (let x = cx - 11; x < cx + 12; x += 4) p.px(x + ((y / 4) % 2) * 2, y, L.trim!)
      break
    case 'tankCardigan':
      p.rect(cx - 5, by, 10, 26, L.trim!)
      p.rect(cx - 6, by, 1, 26, shirtDark)
      p.rect(cx + 5, by, 1, 26, shirtDark)
      p.rect(cx - 4, by - 1, 8, 2, L.skin)
      break
    case 'kebaya':
      for (let y = by + 1; y < by + 24; y += 2) {
        p.px(cx - 5 + Math.floor((y - by) / 8), y, L.trim!)
        p.px(cx + 4 - Math.floor((y - by) / 8), y, L.trim!)
      }
      for (let k = 0; k < 3; k++) p.px(cx, by + 6 + k * 5, C.gold)
      break
    case 'saree':
      for (let i = 0; i < 26; i++) p.rect(cx + 10 - i * 0.9, by + i, 5, 1, L.trim!)
      break
    case 'checked':
      for (let y = by + 2; y < by + 26; y += 4) p.rect(cx - 12, y, 24, 1, L.trim!)
      for (let x = cx - 11; x < cx + 12; x += 4) p.rect(x, by + 1, 1, 25, L.trim!)
      break
    case 'hawaiian':
    case 'floral':
      for (let y = by + 4; y < by + 24; y += 6) {
        for (let x = cx - 9 + ((y / 6) % 2) * 3; x < cx + 11; x += 7) {
          p.px(x, y, L.trim!)
          if (L.top === 'hawaiian') {
            p.px(x - 1, y, L.trim!)
            p.px(x + 1, y, L.trim!)
            p.px(x, y - 1, L.trim!)
            p.px(x, y + 1, L.trim!)
          }
        }
      }
      break
    case 'blouse':
      if (L.trim) p.rect(cx - 4, by, 8, 2, L.trim)
      break
    case 'kurta':
      p.rect(cx, by + 1, 1, 12, L.trim!)
      p.rect(cx - 3, by, 7, 2, L.trim!)
      break
  }
  if (L.apron) {
    p.rect(cx - 8, by + 6, 16, 22, L.apron)
    p.rect(cx - 8, by + 6, 16, 1, INK)
    p.line(cx - 8, by + 6, cx - 11, by, L.apron)
    p.line(cx + 7, by + 6, cx + 10, by, L.apron)
  }
  if (covered) {
    // Tudung drapes over the shoulders.
    p.ellipse(cx, by + 2, 15, 7, L.headwear!)
    p.rect(cx - 6, by - 2, 12, 6, L.headwear!)
  }
  if (L.towel) {
    p.rect(cx + 8, by - 1, 6, 12, C.white)
    p.rect(cx + 8, by + 7, 6, 2, C.red)
  }
  p.rect(cx - 3, by - 4, 6, 5, L.skin)
  if (L.necklace) {
    for (let i = -5; i <= 5; i++) p.px(cx + i, by + 1 + Math.round((25 - i * i) / 12), L.necklace[(i + 5) % L.necklace.length])
  }

  if (covered) p.ellipse(hx, hy - 1, 11, 12, L.headwear!)

  // Arms, from the shoulders; bare in a singlet.
  const sleeve = L.top === 'singlet' ? L.skin : L.shirt
  const hasTool = L.tool && (pose.startsWith('joy') || pose.startsWith('cheer') || pose.startsWith('slap'))
  arm(p, [cx - 12, by + 3], [s.left[0], s.left[1]], sleeve, L.skin)
  arm(p, [cx + 12, by + 3], [s.right[0], s.right[1]], sleeve, L.skin)
  if (hasTool) {
    const [tx, ty] = s.right
    p.rect(tx + 1, ty - 9, 2, 8, '#6B4226')
    p.rect(tx - 1, ty - 14, 6, 5, '#BFC5C9')
  }
  if (L.hair === 'braid') {
    // Plait over the shoulder.
    for (let i = 0; i < 9; i++) p.rect(hx - 10 + Math.round(i * 0.2), hy + 8 + i * 2, 3, 2, i % 2 ? L.hairColor : shade(L.hairColor, 1.8))
  }

  // Head.
  p.ellipse(hx, hy, covered ? 8 : 10, covered ? 9 : 11, L.skin)
  if (!covered) {
    p.rect(hx - 11, hy, 2, 4, L.skin)
    p.rect(hx + 10, hy, 2, 4, L.skin)
  }
  p.rect(hx + 5, hy + 3, 3, 6, L.skinDark)

  // Hair and headwear on top.
  switch (L.hair) {
    case 'bald':
      p.px(hx - 4, hy - 9, shade(L.skin, 1.2))
      p.px(hx - 3, hy - 9, shade(L.skin, 1.2))
      break
    case 'balding':
      p.rect(hx - 10, hy - 4, 3, 6, L.hairColor)
      p.rect(hx + 8, hy - 4, 3, 6, L.hairColor)
      p.px(hx - 3, hy - 10, '#FFE7C8')
      p.px(hx - 2, hy - 10, '#FFE7C8')
      break
    case 'short':
    case 'wavy':
    case 'spiky':
    case 'bun':
    case 'long':
    case 'bob':
    case 'braid':
    case 'ponytail':
      cap(hy - 11, hy - 5, L.hairColor)
      p.rect(hx - 11, hy - 5, 3, 6, L.hairColor)
      p.rect(hx + 8, hy - 5, 3, 6, L.hairColor)
      if (L.hair === 'wavy') for (let x = hx - 8; x <= hx + 8; x += 3) p.px(x, hy - 4, L.hairColor)
      if (L.hair === 'spiky') for (let x = hx - 8; x <= hx + 8; x += 3) p.rect(x, hy - 13, 2, 2, L.hairColor)
      if (L.hair === 'bun') p.circle(hx, hy - 13, 3.5, L.hairColor)
      if (L.hair === 'long' || L.hair === 'bob' || L.hair === 'braid') {
        // Side parting and a soft fringe.
        p.rect(hx - 7, hy - 5, 6, 2, L.hairColor)
        p.px(hx + 2, hy - 9, shade(L.hairColor, 1.6))
      }
      if (id === 'sweelian') p.rect(hx + 2, hy - 15, 5, 1, C.gold)
      break
    case 'songkok':
      p.rect(hx - 9, hy - 14, 18, 7, L.headwear!)
      p.rect(hx - 9, hy - 9, 18, 1, '#3A3036')
      p.rect(hx - 8, hy - 13, 6, 1, '#4A4046')
      p.rect(hx - 10, hy - 4, 2, 5, L.hairColor)
      p.rect(hx + 8, hy - 4, 2, 5, L.hairColor)
      break
    case 'turban':
      cap(hy - 15, hy - 4, L.headwear!, 2)
      for (let k = 0; k < 4; k++) p.line(hx - 9 + k * 3, hy - 4 - k * 2, hx + 3 + k * 2, hy - 12 + k, shade(L.headwear!, 0.7))
      p.px(hx, hy - 15, shade(L.headwear!, 1.3))
      break
    case 'kopiah':
      p.rect(hx - 8, hy - 14, 16, 5, L.headwear!)
      for (let x = hx - 7; x < hx + 8; x += 2) p.px(x, hy - 12, '#C9C2B4')
      break
  }

  // Face.
  const ex = [hx - 4, hx + 3]
  const ey = hy + 1
  for (const x of ex) {
    if (s.eyes === 'closed') p.rect(x - 1, ey, 3, 1, INK)
    else if (s.eyes === 'happy') {
      p.px(x - 1, ey, INK)
      p.px(x, ey - 1, INK)
      p.px(x + 1, ey, INK)
    } else {
      p.rect(x - 1, ey - 1, 3, 3, C.white)
      const oy = s.eyes === 'up' ? -1 : s.eyes === 'down' ? 1 : 0
      p.rect(x, ey + oy, 1, 2, INK)
    }
  }
  if (L.lashes && s.eyes !== 'happy') {
    p.px(ex[0] - 2, ey - 1, INK)
    p.px(ex[1] + 2, ey - 1, INK)
  }
  if (L.glasses) {
    for (const x of ex) p.ring(x, ey, 2.6, 2.4, '#2A2020')
    p.px(hx, ey, '#2A2020')
  }
  const by2 = ey - 3
  const brow = (x: number, dir: number) => {
    if (s.brows === 'flat') p.rect(x - 1, by2, 3, 1, INK)
    else if (s.brows === 'raised') p.rect(x - 1, by2 - 1, 3, 1, INK)
    else if (s.brows === 'angry') {
      p.px(x - dir, by2 - 1, INK)
      p.px(x, by2, INK)
      p.px(x + dir, by2 + 1, INK)
    } else {
      p.px(x - dir, by2 + 1, INK)
      p.px(x, by2, INK)
      p.px(x + dir, by2 - 1, INK)
    }
  }
  brow(ex[0], -1)
  brow(ex[1], 1)
  if (L.bindi) p.px(hx, by2 - 2, C.red)
  const my = hy + 6
  if (L.beard === 'full') {
    // Beard hugs the jaw, leaving the mouth clear.
    for (let y = hy + 3; y <= hy + 12; y++) {
      const h = Math.round(headHalf(Math.min(y, hy + 10)) + 1)
      p.rect(hx - h, y, h * 2, 1, L.beardColor!)
    }
    p.rect(hx - 3, my - 1, 7, 4, shade(L.skin, 0.9))
  } else {
    p.px(hx - 7, hy + 5, '#E8908A')
    p.px(hx + 6, hy + 5, '#E8908A')
  }
  if (L.beard) p.rect(hx - 4, my - 2, 8, 1, L.beardColor!)
  if (L.earrings && !covered) {
    p.px(hx - 11, hy + 4, L.earrings)
    p.px(hx + 11, hy + 4, L.earrings)
  }
  switch (s.face) {
    case 'smile':
    case 'blink':
      p.px(hx - 3, my, INK)
      p.rect(hx - 2, my + 1, 4, 1, INK)
      p.px(hx + 2, my, INK)
      break
    case 'flat':
      p.rect(hx - 2, my + 1, 4, 1, INK)
      break
    case 'open':
      p.rect(hx - 3, my, 6, 3, '#5A1A1A')
      p.rect(hx - 2, my + 2, 4, 1, '#E8706A')
      break
    case 'gasp':
      p.rect(hx - 1, my, 3, 3, '#5A1A1A')
      break
    case 'smirk':
      p.rect(hx - 2, my + 1, 4, 1, INK)
      p.px(hx + 2, my, INK)
      break
    case 'frown':
      p.px(hx - 3, my + 1, INK)
      p.rect(hx - 2, my, 4, 1, INK)
      p.px(hx + 2, my + 1, INK)
      break
  }
  p.outline(INK)
  return p
}

// ───────────────────────── props & scenery ─────────────────────────

function coinFrame(k: number): Paint {
  const p = new Paint(8, 8)
  const rx = [3.5, 2.4, 0.8, 2.4][k]
  p.ellipse(4, 4, rx, 3.5, C.gold)
  if (k !== 2) {
    p.ring(4, 4, rx, 3.5, C.goldDark)
    p.rect(4, 2, 1, 4, C.goldDark)
    p.px(3, 2, C.goldLight)
  }
  return p
}

/** Alas meja: an indigo batik cloth built from tiles plus a maroon-and-gold border. */
function clothTile(): Paint {
  const p = new Paint(16, 16)
  p.rect(0, 0, 16, 16, '#2A3466')
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) continue
    p.px(i, i, '#33407A')
    p.px(15 - i, i, '#33407A')
  }
  p.px(8, 8, '#8A6A3A')
  p.px(7, 8, '#6A4E50')
  p.px(9, 8, '#6A4E50')
  p.px(8, 7, '#6A4E50')
  p.px(8, 9, '#6A4E50')
  p.px(0, 0, '#5A4A5A')
  return p
}

function clothEdge(vertical: boolean): Paint {
  const p = vertical ? new Paint(5, 16) : new Paint(16, 5)
  const L = vertical ? 16 : 5
  p.rect(0, 0, p.w, p.h, C.maroon)
  for (let i = 1; i < 16; i += 4) {
    if (vertical) p.px(2, i, C.yellow)
    else p.px(i, 2, C.yellow)
  }
  if (vertical) p.rect(4, 0, 1, L, '#5A1828')
  else p.rect(0, 4, 16, 1, '#5A1828')
  return p
}

function kopiCup(): Paint {
  const p = new Paint(14, 12)
  p.ellipse(7, 9, 6.5, 2, '#E8DCC4')
  p.rect(3, 3, 8, 6, C.white)
  p.rect(3, 5, 8, 1, C.green)
  p.ring(11.5, 5.5, 1.8, 1.8, C.white)
  p.ellipse(7, 3, 4, 1, '#2B160C')
  p.outline(INK)
  return p
}

function grill(): Paint {
  const p = new Paint(52, 18)
  p.rect(2, 4, 48, 8, '#3A3438')
  p.rect(2, 4, 48, 1, '#5A5258')
  for (let x = 4; x < 48; x += 4) p.rect(x, 1, 1, 4, '#C9A27A')
  for (let x = 4; x < 48; x += 4) p.rect(x - 1, 2, 3, 2, '#7A3E1A')
  p.rect(6, 12, 2, 6, '#2A2428')
  p.rect(44, 12, 2, 6, '#2A2428')
  p.outline(INK)
  return p
}

function woodTile(v: number): Paint {
  const p = new Paint(64, 16)
  const base = [C.wood2, C.wood3, C.wood2][v]
  p.rect(0, 0, 64, 16, base)
  let seed = v * 97 + 13
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 14; i++) {
    const y = 1 + Math.floor(rnd() * 13)
    const x = Math.floor(rnd() * 50)
    p.rect(x, y, 6 + Math.floor(rnd() * 18), 1, rnd() < 0.5 ? C.wood1 : C.wood4)
  }
  if (v === 1) {
    p.ellipse(40, 8, 4, 2, C.wood1)
    p.ellipse(40, 8, 2, 1, C.woodDark)
  }
  p.rect(0, 15, 64, 1, C.woodDark)
  p.rect(63, 0, 1, 16, C.woodDark)
  p.px(2, 2, C.woodDark)
  p.px(61, 13, C.woodDark)
  return p
}

function tableFront(): Paint {
  const p = new Paint(64, 10)
  p.rect(0, 0, 64, 10, '#5E331B')
  p.rect(0, 0, 64, 1, '#D9A441')
  p.rect(0, 8, 64, 2, C.woodDark)
  for (let x = 8; x < 64; x += 16) p.px(x, 4, '#3A1E0F')
  return p
}

function stall(colors: [string, string]): Paint {
  const p = new Paint(110, 72)
  p.rect(6, 20, 3, 52, '#5A5560')
  p.rect(101, 20, 3, 52, '#5A5560')
  // Awning with scalloped edge.
  for (let x = 0; x < 110; x++) {
    const stripe = Math.floor(x / 10) % 2
    p.rect(x, 8, 1, 12, colors[stripe])
    if ((x % 10) < 8) p.rect(x, 20, 1, 2 + (Math.abs((x % 10) - 4) < 3 ? 1 : 0), colors[stripe])
  }
  p.rect(0, 8, 110, 1, '#FFFFFF')
  // Counter with pots and skewers.
  p.rect(4, 50, 102, 22, '#3A2A22')
  p.rect(4, 50, 102, 2, '#5A4234')
  p.rect(12, 42, 14, 8, '#7A7480')
  p.rect(12, 41, 14, 1, '#A8A2AE')
  p.ellipse(50, 46, 10, 4, '#2A2428')
  for (let x = 70; x < 98; x += 3) p.line(x, 49, x + 2, 38, '#C9A27A')
  for (let x = 70; x < 98; x += 3) p.rect(x + 1, 40, 2, 4, '#8A4220')
  p.rect(8, 24, 94, 18, '#1E1620')
  return p
}

function shopper(frame: number, tone: number): Paint {
  const p = new Paint(12, 26)
  const col = ['#1B1420', '#221827', '#160F1A'][tone]
  p.circle(6, 4 + frame, 3.5, col)
  p.rrect(2, 8 + frame, 9, 14, col)
  p.rect(3, 22, 3, 4, col)
  p.rect(7, 22, 3, 4, col)
  return p
}

function lampShade(): Paint {
  const p = new Paint(18, 9)
  for (let y = 0; y < 6; y++) p.rect(8 - y * 1.4, y, 2 + y * 2.8, 1, y < 2 ? '#3E7A5E' : '#2F5F4A')
  p.rect(1, 6, 16, 1, '#1E3E30')
  p.rect(8, 0, 2, 1, '#555')
  return p
}

function halo(r: number): Paint {
  const s = r * 2 + 1
  const p = new Paint(s, s)
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - r, y - r) / r
      if (d > 1) continue
      const density = Math.pow(1 - d, 1.6)
      if (density * 16 > bayer[(y % 4) * 4 + (x % 4)]) p.px(x, y, '#FFFFFF')
    }
  }
  return p
}

function ringSprite(rx: number, ry: number, thick: number): Paint {
  const p = new Paint(Math.ceil(rx * 2 + 3), Math.ceil(ry * 2 + 3))
  p.ring(rx + 1.5, ry + 1.5, rx, ry, '#FFFFFF', thick)
  return p
}

function sparkle(): Paint {
  const p = new Paint(5, 5)
  p.px(2, 0, '#FFFFFF')
  p.px(2, 4, '#FFFFFF')
  p.px(0, 2, '#FFFFFF')
  p.px(4, 2, '#FFFFFF')
  p.rect(1, 1, 3, 3, '#FFFFFF')
  return p
}

function icon(kind: 'card' | 'coin' | 'trophy'): Paint {
  const p = new Paint(7, 7)
  if (kind === 'card') {
    p.rect(1, 0, 5, 7, C.indigo)
    p.rect(2, 1, 3, 5, C.yellow)
  } else if (kind === 'coin') {
    p.circle(3.5, 3.5, 3, C.gold)
    p.rect(3, 2, 1, 3, C.goldDark)
  } else {
    p.rect(1, 0, 5, 3, C.gold)
    p.px(0, 1, C.gold)
    p.px(6, 1, C.gold)
    p.rect(3, 3, 1, 2, C.gold)
    p.rect(2, 5, 3, 2, C.goldDark)
  }
  return p
}

function arrow(): Paint {
  const p = new Paint(7, 5)
  p.rect(0, 0, 7, 1, '#FFFFFF')
  p.rect(1, 1, 5, 1, '#FFFFFF')
  p.rect(2, 2, 3, 1, '#FFFFFF')
  p.rect(3, 3, 1, 1, '#FFFFFF')
  return p
}

export const SIGNS = ['LOK LOK', 'SATAY', 'APAM BALIK', 'ROTI JOHN', 'CENDOL', 'MURTABAK']
export const STALL_COLORS: [string, string][] = [
  [C.red, C.cream],
  [C.green, C.cream],
  [C.yellow, C.maroon],
  [C.blue, C.cream],
  [C.green, C.yellow],
  [C.red, C.yellow],
]

export function buildAtlas(): Atlas {
  const a = new Atlas()
  const px = new Paint(1, 1)
  px.px(0, 0, '#FFFFFF')
  a.add('px', px, { bevel: 0, detail: 0 })
  for (const ch of FONT_CHARS) {
    const g = new Paint(5, 7)
    g.text(ch, 0, 0, '#FFFFFF')
    a.add(`g:${ch}`, g, { bevel: 0, detail: 0 })
  }
  for (const card of ALL_CARDS) a.add(`card:${card.id}`, cardFront(card), { bevel: 1, detail: 0.25 })
  a.add('card:back', cardBack(), { bevel: 1, detail: 0.3 })
  a.add('mini:back', miniBack(), { bevel: 1 })
  for (const g of GROUPS) a.add(`mini:${g}`, miniFront(g), { bevel: 1 })
  for (const id of Object.keys(LOOKS) as Exclude<PersonaId, 'you'>[]) {
    for (const pose of POSES) a.add(`hawker:${id}:${pose}`, hawker(id, pose), { bevel: 4, detail: 0.4 })
  }
  for (let k = 0; k < 4; k++) a.add(`coin:${k}`, coinFrame(k), { bevel: 2 })
  a.add('cloth:tile', clothTile(), { bevel: 0, detail: 0.6 })
  a.add('cloth:h', clothEdge(false), { bevel: 1 })
  a.add('cloth:v', clothEdge(true), { bevel: 1 })
  a.add('cup', kopiCup(), { bevel: 2 })
  a.add('grill', grill(), { bevel: 1 })
  for (let v = 0; v < 3; v++) a.add(`wood:${v}`, woodTile(v), { bevel: 0, detail: 0.9 })
  a.add('table:front', tableFront(), { bevel: 1, detail: 0.5 })
  STALL_COLORS.forEach((c, i) => a.add(`stall:${i}`, stall(c), { bevel: 1, detail: 0.5 }))
  for (let f = 0; f < 2; f++) for (let t = 0; t < 3; t++) a.add(`shopper:${t}:${f}`, shopper(f, t), { bevel: 2 })
  a.add('lamp', lampShade(), { bevel: 1 })
  for (const r of [4, 8, 14, 24, 40]) a.add(`halo:${r}`, halo(r), { bevel: 0 })
  a.add('ring:avatar', ringSprite(24, 5, 2), { bevel: 0 })
  a.add('ring:pile', ringSprite(14, 12, 2), { bevel: 0 })
  a.add('sparkle', sparkle(), { bevel: 0 })
  a.add('arrow', arrow(), { bevel: 0 })
  for (const k of ['card', 'coin', 'trophy'] as const) a.add(`icon:${k}`, icon(k), { bevel: 0 })
  return a
}
