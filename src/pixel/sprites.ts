import { ALL_CARDS, dishIndex } from '../game/cards'
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

export const GROUP_INK: Record<Group, string> = { kopitiam: '#6B3E26', nasi: '#24774A', roti: '#B8740E', kuih: '#C2416C' }
const GROUP_PASTEL: Record<Group, string> = { kopitiam: '#F2CDAE', nasi: '#C5E8C8', roti: '#FBE3A0', kuih: '#F7C6D8' }

export const CARD_W = 32
export const CARD_H = 44
export const MINI_W = 12
export const MINI_H = 16

// ───────────────────────── 16×16 dish icons ─────────────────────────

type Icon = (p: Paint, ox: number, oy: number) => void

const plate = (p: Paint, ox: number, oy: number) => {
  p.ellipse(ox + 8, oy + 11, 7.5, 4, '#FFFDF6')
  p.ring(ox + 8, oy + 11, 7.5, 4, C.blueRim)
}

const cup = (liquid: string, extra?: string): Icon => (p, ox, oy) => {
  p.ellipse(ox + 8, oy + 14, 7, 1.6, '#FFFDF6')
  p.rect(ox + 3, oy + 6, 10, 7, '#FFFDF6')
  p.rect(ox + 4, oy + 12, 8, 1, '#E8DCC4')
  p.rect(ox + 3, oy + 9, 10, 1, C.green)
  p.ring(ox + 13.5, oy + 9, 2, 2, '#FFFDF6')
  p.ellipse(ox + 8, oy + 6, 5, 1.2, liquid)
  if (extra) p.rect(ox + 6, oy + 6, 3, 1, extra)
  for (const [x, y] of [
    [5, 3],
    [6, 2],
    [6, 1],
    [10, 4],
    [9, 3],
    [10, 1],
  ])
    p.px(ox + x, oy + y, '#FFFFFF')
}

const glass = (liquid: string, straw: string | null, foam = false): Icon => (p, ox, oy) => {
  p.rect(ox + 4, oy + 3, 8, 12, '#DDEFF4')
  p.rect(ox + 5, oy + 5, 6, 9, liquid)
  if (foam) p.rect(ox + 5, oy + 3, 6, 3, '#F6E7CC')
  else {
    p.rect(ox + 5, oy + 6, 2, 2, '#FFFFFF')
    p.rect(ox + 8, oy + 9, 2, 2, '#FFFFFF')
  }
  p.rect(ox + 4, oy + 3, 1, 12, '#FFFFFF')
  if (straw) p.line(ox + 10, oy + 8, ox + 12, oy + 0, straw)
  if (foam) p.ring(ox + 12.5, oy + 9, 2, 2.5, '#DDEFF4')
}

const ICONS: Record<Group, Icon[]> = {
  kopitiam: [cup('#2B160C'), glass('#C8925A', null, true), glass('#5A3420', C.green), glass('#F08DAE', C.yellow), cup('#9A6338', '#F2E2C2')],
  nasi: [
    (p, ox, oy) => {
      p.ellipse(ox + 8, oy + 10, 8, 5, C.leaf)
      p.ellipse(ox + 6, oy + 9, 4, 3, '#FFFDF8')
      p.circle(ox + 11.5, oy + 7.5, 2, C.red)
      p.ellipse(ox + 11, oy + 12, 2, 1.4, '#FFFFFF')
      p.px(ox + 11, oy + 12, C.yellow)
      p.rect(ox + 2, oy + 12, 2, 1, C.greenLight)
      p.rect(ox + 5, oy + 13, 3, 1, '#C98B4A')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.ellipse(ox + 8, oy + 9, 5, 3.4, '#E9A24A')
      p.ellipse(ox + 8, oy + 7, 2.5, 1.6, '#FFFFFF')
      p.px(ox + 8, oy + 7, C.yellow)
      p.px(ox + 12, oy + 10, C.red)
      p.px(ox + 4, oy + 10, C.red)
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.ellipse(ox + 7, oy + 9, 4.5, 3.2, '#7FA7E6')
      for (const [x, y] of [
        [11, 9],
        [12, 11],
        [10, 12],
        [13, 10],
      ])
        p.px(ox + x, oy + y, C.greenLight)
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.ellipse(ox + 6, oy + 9, 4, 3, '#E2C79A')
      p.ellipse(ox + 11, oy + 10, 3, 2, C.orange)
      p.px(ox + 11, oy + 9, '#F4D4A4')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.ellipse(ox + 6, oy + 9, 4, 3, '#FFF6DC')
      p.ellipse(ox + 11, oy + 9, 2.6, 1.8, '#C9873E')
      p.rect(ox + 12, oy + 11, 2, 1, C.greenLight)
    },
  ],
  roti: [
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.ellipse(ox + 7, oy + 10, 5.5, 3, '#E9B45A')
      p.ring(ox + 7, oy + 10, 3, 1.5, '#B97A1F')
      p.circle(ox + 13, oy + 7, 1.6, '#E7A43A')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.rect(ox + 3, oy + 7, 10, 6, '#E9B45A')
      p.rect(ox + 5, oy + 8, 2, 2, '#FFE15C')
      p.rect(ox + 9, oy + 10, 2, 2, '#FFE15C')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      for (const x of [3, 9]) {
        for (let i = 0; i < 5; i++) p.rect(ox + x + i * 0.5, oy + 7 + i, 5 - i, 1, '#C9813A')
        p.rect(ox + x, oy + 9, 4, 1, C.greenLight)
      }
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.dither(ox + 3, oy + 7, 10, 6, '#F0C048')
      p.dither(ox + 4, oy + 8, 8, 4, '#F0C048', 1)
      p.dither(ox + 4, oy + 8, 8, 4, '#D9A02E')
    },
    (p, ox, oy) => {
      p.ellipse(ox + 8, oy + 14, 7, 1.6, '#FFFDF6')
      for (let y = 1; y < 14; y++) {
        const half = Math.round((y / 13) * 5)
        p.rect(ox + 8 - half, oy + y, half * 2 + 1, 1, y % 3 ? '#F2C15A' : '#C98A22')
      }
    },
  ],
  kuih: [
    (p, ox, oy) => {
      plate(p, ox, oy)
      for (let i = 0; i < 8; i++) p.rect(ox + 5, oy + 3 + i, 7, 1, i % 2 ? '#FFF4E8' : '#E9467B')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      for (const [x, y] of [
        [5, 10],
        [11, 10],
        [8, 6],
      ]) {
        p.circle(ox + x, oy + y, 2.6, '#3FA34D')
        p.px(ox + x - 1, oy + y - 1, '#FFFFFF')
        p.px(ox + x + 1, oy + y, '#FFFFFF')
      }
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.rect(ox + 4, oy + 4, 8, 4, '#5BB04A')
      p.rect(ox + 4, oy + 8, 8, 4, '#FFFBEF')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      p.rect(ox + 2, oy + 7, 12, 4, '#52A84B')
      p.rect(ox + 13, oy + 7, 1, 4, '#8A4B20')
      p.rect(ox + 2, oy + 7, 1, 4, '#8A4B20')
    },
    (p, ox, oy) => {
      plate(p, ox, oy)
      for (let y = 0; y < 6; y++) {
        const half = Math.round(Math.sqrt(36 - (6 - y) ** 2))
        p.rect(ox + 8 - half, oy + 6 + y, half * 2, 1, y < 2 ? '#E3A548' : '#F2D07A')
      }
      p.px(ox + 6, oy + 10, '#8A5520')
      p.px(ox + 9, oy + 9, '#8A5520')
      p.px(ox + 11, oy + 11, '#8A5520')
    },
  ],
}

function cardFront(card: Card): Paint {
  const p = new Paint(CARD_W, CARD_H)
  const ink = GROUP_INK[card.group]
  p.rrect(0, 0, CARD_W, CARD_H, ink)
  p.rrect(1, 1, CARD_W - 2, CARD_H - 2, C.paper)
  p.rect(2, CARD_H - 3, CARD_W - 4, 1, C.paperShade)
  // Corner index, big enough to read when cards overlap.
  const label = String(card.value)
  p.text(label, card.value === 10 ? 2 : 3, 3, ink, 2)
  p.ellipse(16, 27, 10, 8.5, GROUP_PASTEL[card.group])
  ICONS[card.group][dishIndex(card.value)](p, 8, 19)
  p.text(label, CARD_W - 3 - textWidth(label), CARD_H - 10, ink)
  p.rect(3, CARD_H - 8, 3, 3, ink)
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
  p.ellipse(16, 22, 9, 6, C.cream)
  p.ring(16, 22, 9, 6, C.yellow)
  p.text('C', 11, 19, C.maroon)
  p.text('!', 16, 19, C.maroon)
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
  p.rrect(0, 0, MINI_W, MINI_H, GROUP_INK[group])
  p.rect(1, 1, MINI_W - 2, MINI_H - 2, C.paper)
  p.circle(6, 8, 3, GROUP_PASTEL[group])
  p.rect(2, 2, 3, 2, GROUP_INK[group])
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

interface Look {
  skin: string
  skinDark: string
  shirt: string
  shirtDark: string
  apron: string
}

const LOOKS: Record<Exclude<PersonaId, 'you'>, Look> = {
  ahseng: { skin: '#F0C9A0', skinDark: '#D8A87A', shirt: '#F2EFE6', shirtDark: '#CFC9BA', apron: '#3B6FB6' },
  lina: { skin: '#D9A273', skinDark: '#B98455', shirt: '#E2557A', shirtDark: '#B83B5E', apron: '#FFE9A8' },
  mat: { skin: '#B97A4E', skinDark: '#94603A', shirt: '#7A3E9D', shirtDark: '#5A2A78', apron: '#F4B42A' },
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

function hawker(id: Exclude<PersonaId, 'you'>, pose: Pose): Paint {
  const p = new Paint(HAWKER_W, HAWKER_H)
  const L = LOOKS[id]
  const s = SPECS[pose]
  const cx = 26
  const by = 34 + s.dy
  const hx = cx + s.headDx
  const hy = 20 + s.headDy

  // Torso.
  p.rrect(cx - 13, by, 26, 26, L.shirt)
  p.rect(cx + 7, by + 2, 5, 22, L.shirtDark)
  if (id === 'mat') for (let y = by + 3; y < by + 24; y += 4) for (let x = cx - 11; x < cx + 12; x += 4) p.px(x + ((y / 4) % 2) * 2, y, C.yellow)
  if (id === 'ahseng') {
    // Singlet: bare shoulders.
    p.rect(cx - 13, by, 6, 6, L.skin)
    p.rect(cx + 7, by, 6, 6, L.skin)
  }
  p.rect(cx - 8, by + 6, 16, 22, L.apron)
  p.rect(cx - 8, by + 6, 16, 1, INK)
  p.line(cx - 8, by + 6, cx - 11, by, L.apron)
  p.line(cx + 7, by + 6, cx + 10, by, L.apron)
  if (id === 'lina') {
    // Tudung drapes over the shoulders.
    p.ellipse(cx, by + 2, 15, 7, '#F28C28')
    p.rect(cx - 6, by - 2, 12, 6, '#F28C28')
  }
  if (id === 'ahseng') {
    // Good Morning towel over the shoulder.
    p.rect(cx + 8, by - 1, 6, 12, C.white)
    p.rect(cx + 8, by + 7, 6, 2, C.red)
  }
  p.rect(cx - 3, by - 4, 6, 5, L.skin)

  // Arms, from the shoulders.
  const hasTool = id !== 'lina' && (pose.startsWith('joy') || pose.startsWith('cheer') || pose.startsWith('slap'))
  arm(p, [cx - 12, by + 3], [s.left[0], s.left[1]], L.shirt, L.skin)
  arm(p, [cx + 12, by + 3], [s.right[0], s.right[1]], L.shirt, L.skin)
  if (hasTool) {
    const [tx, ty] = s.right
    p.rect(tx + 1, ty - 9, 2, 8, '#6B4226')
    p.rect(tx - 1, ty - 14, 6, 5, '#BFC5C9')
  }

  // Head.
  if (id === 'lina') p.ellipse(hx, hy - 1, 11, 12, '#F28C28')
  p.ellipse(hx, hy, id === 'lina' ? 8 : 10, id === 'lina' ? 9 : 11, L.skin)
  if (id !== 'lina') {
    p.rect(hx - 11, hy, 2, 4, L.skin)
    p.rect(hx + 10, hy, 2, 4, L.skin)
  }
  p.rect(hx + 5, hy + 3, 3, 6, L.skinDark)
  if (id === 'ahseng') {
    p.rect(hx - 10, hy - 4, 3, 6, '#D8D4CC')
    p.rect(hx + 8, hy - 4, 3, 6, '#D8D4CC')
    p.px(hx - 3, hy - 10, '#FFE7C8')
    p.px(hx - 2, hy - 10, '#FFE7C8')
  }
  if (id === 'mat') {
    p.rect(hx - 9, hy - 14, 18, 7, '#1B1416')
    p.rect(hx - 9, hy - 9, 18, 1, '#3A3036')
    p.rect(hx - 8, hy - 13, 6, 1, '#4A4046')
    p.rect(hx - 10, hy - 4, 2, 5, '#2A1A14')
    p.rect(hx + 8, hy - 4, 2, 5, '#2A1A14')
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
      p.rect(x, ey + oy - (oy < 0 ? 0 : 0), 1, 2, INK)
    }
  }
  if (id === 'ahseng') {
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
  p.px(hx - 7, hy + 5, '#E8908A')
  p.px(hx + 6, hy + 5, '#E8908A')
  const my = hy + 6
  if (id === 'mat') p.rect(hx - 4, my - 2, 8, 1, '#2A1A14')
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

function plateSprite(): Paint {
  const p = new Paint(30, 18)
  p.ellipse(15, 10, 14, 7, '#D9D3C4')
  p.ellipse(15, 9, 14, 7, '#F7F4EC')
  p.ring(15, 9, 14, 7, C.blueRim)
  p.ring(15, 9, 10, 4.5, '#DCD6C8')
  for (const [x, y, c] of [
    [5, 6, C.red],
    [25, 6, C.pink],
    [8, 13, C.pink],
    [22, 13, C.red],
    [15, 3, C.red],
  ] as [number, number, string][]) {
    p.px(x, y, c)
    p.px(x + 1, y, C.green)
  }
  p.outline(INK)
  return p
}

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

function coinSlice(): Paint {
  const p = new Paint(9, 4)
  p.ellipse(4.5, 2, 4.2, 1.6, C.goldDark)
  p.ellipse(4.5, 1.5, 4.2, 1.4, C.gold)
  p.px(3, 1, C.goldLight)
  return p
}

function stamp(used: boolean): Paint {
  const p = new Paint(16, 20)
  if (!used) {
    p.circle(8, 4, 3, C.red)
    p.px(7, 3, '#FF8A7A')
    p.rect(6, 6, 4, 6, '#9A6236')
    p.rect(2, 12, 12, 5, '#B07042')
    p.rect(2, 12, 12, 1, '#C88A58')
    p.rect(2, 17, 12, 2, C.red)
  } else {
    p.rect(2, 2, 12, 7, C.red)
    p.rect(4, 4, 2, 3, C.cream)
    p.rect(7, 4, 2, 3, C.cream)
    p.rect(10, 4, 2, 3, C.cream)
    p.rect(2, 9, 12, 4, '#B07042')
    p.rect(6, 13, 4, 3, '#9A6236')
    p.circle(8, 17, 2.4, C.red)
  }
  p.outline(INK)
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

export const SIGNS = ['SATAY', 'AIR TEBU', 'APAM BALIK', 'ROTI JOHN', 'CENDOL', 'MURTABAK']
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
  for (const g of ['kopitiam', 'nasi', 'roti', 'kuih'] as Group[]) a.add(`mini:${g}`, miniFront(g), { bevel: 1 })
  for (const id of ['ahseng', 'lina', 'mat'] as const) {
    for (const pose of POSES) a.add(`hawker:${id}:${pose}`, hawker(id, pose), { bevel: 4, detail: 0.4 })
  }
  a.add('plate', plateSprite(), { bevel: 3 })
  for (let k = 0; k < 4; k++) a.add(`coin:${k}`, coinFrame(k), { bevel: 2 })
  a.add('coin:slice', coinSlice(), { bevel: 1 })
  a.add('stamp', stamp(false), { bevel: 2 })
  a.add('stamp:used', stamp(true), { bevel: 2 })
  a.add('cup', kopiCup(), { bevel: 2 })
  a.add('grill', grill(), { bevel: 1 })
  for (let v = 0; v < 3; v++) a.add(`wood:${v}`, woodTile(v), { bevel: 0, detail: 0.9 })
  a.add('table:front', tableFront(), { bevel: 1, detail: 0.5 })
  STALL_COLORS.forEach((c, i) => a.add(`stall:${i}`, stall(c), { bevel: 1, detail: 0.5 }))
  for (let f = 0; f < 2; f++) for (let t = 0; t < 3; t++) a.add(`shopper:${t}:${f}`, shopper(f, t), { bevel: 2 })
  a.add('lamp', lampShade(), { bevel: 1 })
  for (const r of [4, 8, 14, 24, 40]) a.add(`halo:${r}`, halo(r), { bevel: 0 })
  a.add('ring:avatar', ringSprite(24, 5, 2), { bevel: 0 })
  a.add('ring:plate', ringSprite(18, 10, 2), { bevel: 0 })
  a.add('ring:small', ringSprite(11, 7, 2), { bevel: 0 })
  a.add('sparkle', sparkle(), { bevel: 0 })
  a.add('arrow', arrow(), { bevel: 0 })
  for (const k of ['card', 'coin', 'trophy'] as const) a.add(`icon:${k}`, icon(k), { bevel: 0 })
  return a
}
