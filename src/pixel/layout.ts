import { CARD_H, CARD_W } from './sprites'

export type P = [number, number]

export interface SeatL {
  /** Avatar centre-x and the y of its bottom edge (hidden behind the table). */
  avatar: P
  hand: P
  plate: P
  coins: P
  stamp: P
  /** Top-left of the telemetry panel. */
  panel: P
  /** Panel anchored right of the head (landscape) or centred above it (portrait). */
  panelAlign: 'right' | 'center'
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
  deck: P
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

export function makeLayout(W: number, H: number, players: number): Layout {
  const portrait = H > W * 1.1
  const cx = Math.round(W / 2)
  const actionH = portrait ? 86 : 30
  const handY = H - actionH - 2 - CARD_H
  const tableTop = portrait ? Math.round(H * 0.26) : Math.max(80, Math.round(H * 0.3))
  const tableBottom = portrait ? handY + 34 : H - 40
  const half = Math.min(W / 2 - 6, 236)
  const tableLeft = Math.round(cx - half)
  const tableRight = Math.round(cx + half)
  const geraiY = Math.round((tableTop + (portrait ? 44 : 38) + handY) / 2)

  const opp = players - 1
  const xs = portrait
    ? ({ 1: [0.5], 2: [0.28, 0.72], 3: [0.18, 0.5, 0.82] }[opp] ?? [0.5]).map((f) => Math.round(W * f))
    : ({ 1: [0], 2: [-120, 120], 3: [-150, 0, 150] }[opp] ?? [0]).map((d) => cx + d)

  const human: SeatL = portrait
    ? {
        avatar: [cx, H],
        hand: [cx, handY],
        coins: [22, handY - 16],
        stamp: [46, handY - 18],
        plate: [W - 30, handY - 14],
        panel: [0, 0],
        panelAlign: 'center',
      }
    : {
        avatar: [cx, H],
        hand: [cx, handY],
        coins: [tableLeft + 24, tableBottom - 22],
        stamp: [tableLeft + 50, tableBottom - 24],
        plate: [tableRight - 30, tableBottom - 22],
        panel: [0, 0],
        panelAlign: 'center',
      }

  const seats: SeatL[] = [
    human,
    ...xs.map<SeatL>((x) =>
      portrait
        ? {
            avatar: [x, tableTop + 8],
            hand: [x, tableTop + 14],
            coins: [x - 20, tableTop + 38],
            plate: [x + 2, tableTop + 38],
            stamp: [x + 25, tableTop + 42],
            panel: [x, tableTop - 74],
            panelAlign: 'center',
          }
        : {
            avatar: [x, tableTop + 8],
            hand: [x, tableTop + 14],
            coins: [x - 30, tableTop + 38],
            plate: [x, tableTop + 38],
            stamp: [x + 34, tableTop + 42],
            panel: [x + 28, tableTop - 42],
            panelAlign: 'right',
          },
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
    deck: portrait ? [W - 26, geraiY - 74] : [cx + 160, geraiY],
    cup: portrait ? [24, geraiY - 74] : [cx - 170, geraiY + 4],
    grill: [cx - (portrait ? 70 : 190), tableTop - 20],
    lamps: (portrait ? [W * 0.3, W * 0.7] : [cx - 78, cx + 78]).map((x) => [Math.round(x), tableTop - (portrait ? 70 : 52)] as P),
    stallY: tableTop - 74,
    seats,
  }
}

export function handSpacing(L: Layout, n: number): number {
  return Math.min(26, (L.W - 16 - CARD_W) / Math.max(1, n - 1))
}
