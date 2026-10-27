import { ALL_CARDS, sortByGroup, sortCards } from '../game/cards'
import { cilokResult } from '../game/rules'
import type { GameState } from '../game/types'

export type V3 = [number, number, number]

export interface Seat {
  key: 'bottom' | 'top' | 'left' | 'right' | 'topLeft' | 'topRight'
  avatar: V3
  /** Rotation about Y so the avatar faces the table centre. */
  yaw: number
  hand: V3
  plate: V3
  coins: V3
  stamp: V3
  /** Where the floating telemetry panel sits, beside the hawker so it clears the HUD. */
  panel: V3
}

type SeatKey = Seat['key']

const SEATS: Record<SeatKey, Omit<Seat, 'key' | 'yaw'>> = {
  bottom: { avatar: [0, 0, 5.2], hand: [0, 0.95, 3.2], plate: [4.4, 0, 2.05], coins: [-4.45, 0, 1.95], stamp: [-3.35, 0, 2.3], panel: [0, 0, 0] },
  top: { avatar: [0, 0, -4.55], hand: [0, 0.42, -3.55], plate: [1.3, 0, -2.75], coins: [-1.3, 0, -2.8], stamp: [-2.4, 0, -2.85], panel: [2.1, 1.35, -4.55] },
  left: { avatar: [-6.0, 0, -0.5], hand: [-5.15, 0.42, -0.25], plate: [-4.25, 0, -2.0], coins: [-4.35, 0, 0.75], stamp: [-4.6, 0, -3.1], panel: [-4.7, 2.5, -2.3] },
  right: { avatar: [6.0, 0, -0.5], hand: [5.15, 0.42, -0.25], plate: [4.25, 0, -2.0], coins: [4.35, 0, 0.75], stamp: [4.6, 0, -3.1], panel: [4.7, 2.5, -2.3] },
  topLeft: { avatar: [-3.0, 0, -4.55], hand: [-3.0, 0.42, -3.55], plate: [-1.95, 0, -2.75], coins: [-3.6, 0, -2.8], stamp: [-4.6, 0, -2.6], panel: [-4.75, 1.75, -4.55] },
  topRight: { avatar: [3.0, 0, -4.55], hand: [3.0, 0.42, -3.55], plate: [1.95, 0, -2.75], coins: [3.6, 0, -2.8], stamp: [4.6, 0, -2.6], panel: [4.75, 1.75, -4.55] },
}

const ORDER: Record<number, SeatKey[]> = {
  2: ['bottom', 'top'],
  3: ['bottom', 'topLeft', 'topRight'],
  4: ['bottom', 'left', 'top', 'right'],
}

export function seatsFor(n: number): Seat[] {
  return (ORDER[n] ?? ORDER[4]).map((key) => {
    const s = SEATS[key]
    const yaw = key === 'bottom' ? Math.PI : Math.atan2(-s.avatar[0], -0.3 - s.avatar[2])
    return { key, yaw, ...s }
  })
}

export const DECK_POS: V3 = [2.75, 0, 1.15]
export const GERAI_POS: V3 = [0, 0, 0.05]

/** Stable pseudo-random number in [0,1) per string. */
export function hash(id: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

export interface CardTarget {
  pos: V3
  /** Euler angles applied in YXZ order. */
  rot: V3
  zone: 'deck' | 'hand' | 'opp' | 'gerai' | 'pile' | 'habuan'
  scale?: number
}

const MENU_FAN = ['kopitiam-2', 'nasi-1', 'roti-1', 'kuih-2', 'kopitiam-1', 'nasi-2', 'kuih-5']
const FLAT_UP = -Math.PI / 2
const FLAT_DOWN = Math.PI / 2

export interface LayoutOpts {
  selected: string[]
  hovered: string | null
  sortMode: 'value' | 'group'
  handWidth: number
  /** Bigger hand cards on narrow screens, held closer to the camera. */
  handScale: number
}

export function computeTargets(state: GameState, seats: Seat[], opts: LayoutOpts): Map<string, CardTarget> {
  const out = new Map<string, CardTarget>()
  ALL_CARDS.forEach((c, i) => {
    out.set(c.id, {
      pos: [DECK_POS[0] + (hash(c.id) - 0.5) * 0.04, 0.006 + i * 0.006, DECK_POS[2]],
      rot: [FLAT_DOWN, 0.2 + (hash(c.id, 1) - 0.5) * 0.08, 0],
      zone: 'deck',
    })
  })
  if (!state.players.length) {
    // Title screen: a fan of dishes laid out on the table.
    MENU_FAN.forEach((id, i) => {
      const t = i / (MENU_FAN.length - 1) - 0.5
      out.set(id, {
        pos: [t * 4.2, 0.02 + i * 0.006, 0.4 + Math.abs(t) * 0.6],
        rot: [FLAT_UP, -t * 0.7, 0],
        zone: 'gerai',
      })
    })
    return out
  }

  state.players.forEach((p, pi) => {
    const seat = seats[pi]
    if (!seat) return
    if (p.isHuman) {
      const hand = opts.sortMode === 'group' ? sortByGroup(p.hand) : sortCards(p.hand)
      const n = hand.length
      const hs = opts.handScale
      const spread = Math.min(0.66 * hs * (n - 1), opts.handWidth)
      hand.forEach((c, i) => {
        const t = n > 1 ? i / (n - 1) - 0.5 : 0
        const x = t * spread
        const sel = opts.selected.includes(c.id)
        const hov = opts.hovered === c.id
        const lift = sel ? 0.34 : hov ? 0.14 : 0
        out.set(c.id, {
          pos: [x, seat.hand[1] + (hs - 1) * 1.4 - Math.abs(t) * 0.18 + lift * hs, seat.hand[2] + (hs - 1) * 0.8 + i * 0.012 - (sel ? 0.1 : 0)],
          rot: [-0.62 - (hs - 1) * 0.5, 0, -t * 0.22],
          zone: 'hand',
          scale: hs,
        })
      })
    } else {
      const n = p.hand.length
      const spread = Math.min(0.13 * (n - 1), 1.5)
      const side: V3 = [Math.cos(seat.yaw), 0, -Math.sin(seat.yaw)]
      const fwd: V3 = [Math.sin(seat.yaw), 0, Math.cos(seat.yaw)]
      p.hand.forEach((c, i) => {
        const t = n > 1 ? i / (n - 1) - 0.5 : 0
        const o = t * spread
        out.set(c.id, {
          pos: [
            seat.hand[0] + side[0] * o - fwd[0] * i * 0.006,
            seat.hand[1] - Math.abs(t) * 0.08,
            seat.hand[2] + side[2] * o - fwd[2] * i * 0.006,
          ],
          rot: [-0.95, seat.yaw + Math.PI, t * 0.35],
          zone: 'opp',
          scale: 0.72,
        })
      })
    }
    p.habuan.forEach((c, k) => {
      out.set(c.id, {
        pos: [seat.plate[0] + (hash(c.id, 2) - 0.5) * 0.14, 0.1 + k * 0.006, seat.plate[2] + (hash(c.id, 3) - 0.5) * 0.14],
        rot: [FLAT_UP, seat.yaw + Math.PI + (hash(c.id, 4) - 0.5) * 0.9, 0],
        zone: 'habuan',
      })
    })
  })

  const { gerai } = state
  gerai.pile.forEach((c, k) => {
    out.set(c.id, {
      pos: [GERAI_POS[0] + (hash(c.id, 5) - 0.5) * 1.4, 0.006 + k * 0.006, GERAI_POS[2] - 0.55 + (hash(c.id, 6) - 0.5) * 0.4],
      rot: [FLAT_UP, (hash(c.id, 7) - 0.5) * 1.2, 0],
      zone: 'pile',
    })
  })
  const top = 0.02 + gerai.pile.length * 0.006
  const n = gerai.cards.length
  gerai.cards.forEach((c, i) => {
    const x = (i - (n - 1) / 2) * 0.8
    out.set(c.id, {
      pos: [GERAI_POS[0] + x, top + i * 0.004, GERAI_POS[2] + 0.25],
      rot: [FLAT_UP, (state.pusing ? Math.PI : 0) + (hash(c.id, 8) - 0.5) * 0.1, 0],
      zone: 'gerai',
    })
  })
  return out
}

export function cilokTargetId(state: GameState): string | null {
  return cilokResult(state.gerai)?.card.id ?? null
}
