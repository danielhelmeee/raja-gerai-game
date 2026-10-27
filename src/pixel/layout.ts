import { CARD_H, CARD_W } from './sprites'

export type P = [number, number]

export interface SeatL {
  /** Avatar centre-x and the y of its bottom edge (hidden behind the table). */
  avatar: P
  hand: P
  /** Where DUIT payouts land for this hawker. */
  coins: P
  /** Top-left of the telemetry panel. */
  panel: P
  /** Panel anchored right of the head (landscape) or centred above it (portrait). */
  panelAlign: 'right' | 'center'
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  W: number
  H: number
  cx: number
  portrait: boolean
  /** Logical pixels reserved at the bottom for the DOM action bar. */
  actionH: number
  tableTop: number
  tableBottom: number
  tableLeft: number
  tableRight: number
  handY: number
  gerai: P
  /** The alas meja under the played cards. */
  cloth: Rect
  discard: P
  cup: P
  grill: P
  lamps: P[]
  stallY: number
  seats: SeatL[]
}

/** Logical resolution: the shorter side lands near 270px and the scale stays a whole number. */
export function fitScale(devW: number, devH: number): { scale: number; W: number; H: number } {
  const portrait = devH > devW * 1.1
  const scale = Math.max(1, Math.floor(portrait ? Math.min(devW / 270, devH / 480) : Math.min(devW / 480, devH / 270)))
  return { scale, W: Math.floor(devW / scale), H: Math.floor(devH / scale) }
}

export function makeLayout(W: number, H: number): Layout {
  const portrait = H > W * 1.1
  const cx = Math.round(W / 2)
  const actionH = portrait ? 86 : 30
  const handY = H - actionH - 2 - CARD_H
  const tableTop = portrait ? Math.round(H * 0.26) : Math.max(80, Math.round(H * 0.3))
  const tableBottom = portrait ? handY + 34 : H - 40
  const half = Math.min(W / 2 - 6, 236)
  const tableLeft = Math.round(cx - half)
  const tableRight = Math.round(cx + half)
  const geraiY = Math.round((tableTop + (portrait ? 36 : 30) + handY) / 2)
  const clothW = Math.min(W - 24, 5 * 34 + 26)
  const clothH = CARD_H + 22
  const cloth = { x: Math.round(cx - clothW / 2), y: Math.round(geraiY - clothH / 2), w: clothW, h: clothH }

  const xs = portrait ? [0.18, 0.5, 0.82].map((f) => Math.round(W * f)) : [-150, 0, 150].map((d) => cx + d)

  const human: SeatL = {
    avatar: [cx, H],
    hand: [cx, handY],
    coins: portrait ? [24, handY - 14] : [tableLeft + 26, tableBottom - 20],
    panel: [0, 0],
    panelAlign: 'center',
  }

  const seats: SeatL[] = [
    human,
    ...xs.map<SeatL>((x) =>
      portrait
        ? { avatar: [x, tableTop + 8], hand: [x, tableTop + 16], coins: [x, tableTop + 34], panel: [x, tableTop - 74], panelAlign: 'center' }
        : { avatar: [x, tableTop + 8], hand: [x, tableTop + 16], coins: [x - 44, tableTop + 18], panel: [x + 28, tableTop - 42], panelAlign: 'right' },
    ),
  ]

  return {
    W,
    H,
    cx,
    portrait,
    actionH,
    tableTop,
    tableBottom,
    tableLeft,
    tableRight,
    handY,
    gerai: [cx, geraiY],
    cloth,
    discard: portrait ? [W - 24, cloth.y - 26] : [cloth.x + cloth.w + 30, geraiY],
    cup: portrait ? [22, cloth.y - 26] : [cx - 170, geraiY + 4],
    grill: [cx - (portrait ? 70 : 190), tableTop - 20],
    lamps: (portrait ? [W * 0.3, W * 0.7] : [cx - 78, cx + 78]).map((x) => [Math.round(x), tableTop - (portrait ? 70 : 52)] as P),
    stallY: tableTop - 74,
    seats,
  }
}

export function handSpacing(L: Layout, n: number): number {
  return Math.min(26, (L.W - 16 - CARD_W) / Math.max(1, n - 1))
}
