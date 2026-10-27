import { sortCards } from './cards'
import type { Card, End, Gerai, Shape } from './types'

export function classify(cards: Card[]): Shape | null {
  if (cards.length === 0) return null
  const vals = cards.map((c) => c.value).sort((a, b) => a - b)
  if (vals.every((v) => v === vals[0])) {
    return cards.length <= 4 ? { kind: 'set', count: cards.length, rank: vals[0] } : null
  }
  if (cards.length >= 2 && vals.every((v, i) => i === 0 || v === vals[i - 1] + 1)) {
    return { kind: 'run', count: cards.length, rank: vals[vals.length - 1] }
  }
  return null
}

/** Two-card runs only exist as leftovers after a CILOK, so you can't open with one. */
export const isLegalLead = (s: Shape) => !(s.kind === 'run' && s.count < 3)

/** Same shape, higher number. Four of a kind is just a bigger set. */
export function beats(play: Shape, gerai: Shape): boolean {
  return play.kind === gerai.kind && play.count === gerai.count && play.rank > gerai.rank
}

export function shapeName(s: Shape, cards?: Card[]): string {
  if (s.kind === 'run') {
    const vals = cards ? cards.map((c) => c.value).sort((a, b) => a - b) : null
    return vals ? `run ${vals.join('-')}` : `run of ${s.count}`
  }
  switch (s.count) {
    case 1:
      return `single ${s.rank}`
    case 2:
      return `pair of ${s.rank}s`
    case 3:
      return `triple ${s.rank}s`
    default:
      return `four ${s.rank}s`
  }
}

export interface JualCheck {
  ok: boolean
  shape: Shape | null
  reason: string
}

export function checkJual(cards: Card[], gerai: Gerai): JualCheck {
  const shape = classify(cards)
  if (!shape) {
    return { ok: false, shape, reason: cards.length ? 'Not a valid set: use same numbers or a run' : 'Pick dishes to sell' }
  }
  if (!gerai.shape) {
    if (!isLegalLead(shape)) return { ok: false, shape, reason: 'Runs need at least 3 dishes' }
    return { ok: true, shape, reason: `Open the Gerai with ${shapeName(shape, cards)}` }
  }
  if (beats(shape, gerai.shape)) {
    return { ok: true, shape, reason: `${capitalise(shapeName(shape, cards))} beats the Gerai` }
  }
  if (shape.kind !== gerai.shape.kind || shape.count !== gerai.shape.count) {
    return { ok: false, shape, reason: `Must match the Gerai: ${shapeName(gerai.shape, gerai.cards)}` }
  }
  return { ok: false, shape, reason: 'Too low: you need a higher number' }
}

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The dish at either end of the Gerai: what a CILOK from that end would take, and what would be left. */
export function cilokResult(gerai: Gerai, end: End): { card: Card; remaining: Card[]; shape: Shape } | null {
  if (gerai.cards.length < 2) return null
  const sorted = sortCards(gerai.cards)
  const card = end === 'low' ? sorted[0] : sorted[sorted.length - 1]
  const remaining = end === 'low' ? sorted.slice(1) : sorted.slice(0, -1)
  const shape = classify(remaining)
  return shape ? { card, remaining, shape } : null
}

export interface Play {
  cards: Card[]
  shape: Shape
}

/** Every set and run that can be made from a hand (one choice of cards per shape). */
export function enumeratePlays(hand: Card[]): Play[] {
  const byValue = new Map<number, Card[]>()
  for (const c of sortCards(hand)) {
    if (!byValue.has(c.value)) byValue.set(c.value, [])
    byValue.get(c.value)!.push(c)
  }
  const plays: Play[] = []
  for (const [value, cards] of byValue) {
    for (let n = 1; n <= cards.length; n++) {
      plays.push({ cards: cards.slice(0, n), shape: { kind: 'set', count: n, rank: value } })
    }
  }
  for (let start = 1; start <= 10; start++) {
    const run: Card[] = []
    for (let v = start; v <= 10 && byValue.has(v); v++) {
      run.push(byValue.get(v)![0])
      if (run.length >= 2) plays.push({ cards: [...run], shape: { kind: 'run', count: run.length, rank: v } })
    }
  }
  return plays
}

export function legalPlays(hand: Card[], gerai: Gerai): Play[] {
  return enumeratePlays(hand).filter((p) => (gerai.shape ? beats(p.shape, gerai.shape) : isLegalLead(p.shape)))
}
