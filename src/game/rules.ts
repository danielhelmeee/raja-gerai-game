import { cardKey, GROUP_LABEL, GROUPS, OPENING_CARD, rankLabel, sortCards } from './cards'
import type { Card, FiveKind, Gerai, Shape } from './types'

export const FIVE_ORDER: FiveKind[] = ['barisan', 'tapau', 'kenduri', 'borong', 'tapaubarisan']

export const FIVE_NAME: Record<FiveKind, string> = {
  barisan: 'Barisan',
  tapau: 'Tapau',
  kenduri: 'Kenduri',
  borong: 'Borong',
  tapaubarisan: 'Tapau Barisan',
}

export const FIVE_HINT: Record<FiveKind, string> = {
  barisan: 'straight',
  tapau: 'flush',
  kenduri: 'full house',
  borong: 'four of a kind + 1',
  tapaubarisan: 'straight flush',
}

function rankCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1)
  return m
}

/** Five ranks in a row. 2s rank highest and can't sit in a straight. */
function isStraight(cards: Card[]): boolean {
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b)
  return ranks.length === 5 && ranks[4] - ranks[0] === 4 && ranks[4] <= 14
}

export function classify(cards: Card[]): Shape | null {
  const n = cards.length
  if (n === 0) return null
  const sorted = sortCards(cards)
  const top = cardKey(sorted[n - 1])
  const sameRank = cards.every((c) => c.rank === cards[0].rank)
  if (n === 1) return { kind: 'single', count: 1, key: top }
  if (n === 2) return sameRank ? { kind: 'pair', count: 2, key: top } : null
  if (n === 3) return sameRank ? { kind: 'triple', count: 3, key: cards[0].rank } : null
  if (n !== 5) return null

  const flush = cards.every((c) => c.group === cards[0].group)
  const straight = isStraight(cards)
  const counts = [...rankCounts(cards).entries()].sort((a, b) => b[1] - a[1])
  if (straight && flush) return { kind: 'five', count: 5, five: 'tapaubarisan', key: top }
  if (counts[0][1] === 4) return { kind: 'five', count: 5, five: 'borong', key: counts[0][0] }
  if (counts[0][1] === 3 && counts[1][1] === 2) return { kind: 'five', count: 5, five: 'kenduri', key: counts[0][0] }
  if (flush) return { kind: 'five', count: 5, five: 'tapau', key: top }
  if (straight) return { kind: 'five', count: 5, five: 'barisan', key: top }
  return null
}

export function beats(play: Shape, gerai: Shape): boolean {
  if (play.count !== gerai.count) return false
  if (play.kind === 'five' && gerai.kind === 'five') {
    const a = FIVE_ORDER.indexOf(play.five!)
    const b = FIVE_ORDER.indexOf(gerai.five!)
    if (a !== b) return a > b
  }
  return play.key > gerai.key
}

const groupOfKey = (key: number) => GROUP_LABEL[GROUPS[key % 4]]

export function shapeName(s: Shape, cards?: Card[]): string {
  switch (s.kind) {
    case 'single':
      return `single ${rankLabel(Math.floor(s.key / 4))} (${groupOfKey(s.key)})`
    case 'pair':
      return `pair of ${rankLabel(Math.floor(s.key / 4))}s`
    case 'triple':
      return `three ${rankLabel(s.key)}s`
    case 'five': {
      const name = FIVE_NAME[s.five!]
      if (s.five === 'kenduri') return `${name} (${rankLabel(s.key)}s full)`
      if (s.five === 'borong') return `${name} (four ${rankLabel(s.key)}s)`
      if (s.five === 'tapau') return `${name} (${cards?.length ? GROUP_LABEL[cards[0].group] : groupOfKey(s.key)})`
      if (s.five === 'tapaubarisan') return `${isRoyal(s) ? 'Hidangan Diraja' : name} (${groupOfKey(s.key)})`
      return `${name} to ${rankLabel(Math.floor(s.key / 4))}`
    }
  }
}

/** 10-J-Q-K-A of one suit: the top Tapau Barisan, crowned Hidangan Diraja. */
export const isRoyal = (s: Shape) => s.five === 'tapaubarisan' && Math.floor(s.key / 4) === 14

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export interface JualCheck {
  ok: boolean
  shape: Shape | null
  reason: string
}

export function checkJual(cards: Card[], gerai: Gerai, opening: boolean): JualCheck {
  if (!cards.length) return { ok: false, shape: null, reason: 'Pick dishes to sell' }
  const shape = classify(cards)
  if (!shape) {
    return {
      ok: false,
      shape,
      reason: cards.length === 4 ? 'Four cards is not a hand: use 1, 2, 3 or 5' : 'Not a valid hand: single, pair, three, or a 5-card hand',
    }
  }
  if (opening && !cards.some((c) => c.id === OPENING_CARD)) return { ok: false, shape, reason: 'The first play must include the Karipap 3' }
  if (!gerai.shape) return { ok: true, shape, reason: `Open with ${shapeName(shape, cards)}` }
  if (shape.count !== gerai.shape.count) return { ok: false, shape, reason: `Must be ${gerai.shape.count} card${gerai.shape.count > 1 ? 's' : ''}, like the Gerai` }
  if (beats(shape, gerai.shape)) return { ok: true, shape, reason: `${capitalise(shapeName(shape, cards))} beats the Gerai` }
  return { ok: false, shape, reason: 'Too low to beat the Gerai' }
}

export interface Play {
  cards: Card[]
  shape: Shape
}

function combos<T>(items: T[], k: number, limit = 400): T[][] {
  const out: T[][] = []
  const pick = (start: number, acc: T[]) => {
    if (out.length >= limit) return
    if (acc.length === k) {
      out.push([...acc])
      return
    }
    for (let i = start; i <= items.length - (k - acc.length); i++) pick(i + 1, [...acc, items[i]])
  }
  pick(0, [])
  return out
}

/** Every distinct play the AI should consider from a hand. */
export function enumeratePlays(hand: Card[]): Play[] {
  const sorted = sortCards(hand)
  const byRank = new Map<number, Card[]>()
  const bySuit = new Map<string, Card[]>()
  for (const c of sorted) {
    if (!byRank.has(c.rank)) byRank.set(c.rank, [])
    byRank.get(c.rank)!.push(c)
    if (!bySuit.has(c.group)) bySuit.set(c.group, [])
    bySuit.get(c.group)!.push(c)
  }
  const raw: Card[][] = []
  for (const c of sorted) raw.push([c])
  for (const cards of byRank.values()) {
    for (const k of [2, 3]) if (cards.length >= k) raw.push(...combos(cards, k))
  }
  // Straights: one per starting rank using the lowest card of each rank, plus suit-matched ones below.
  for (let start = 3; start <= 10; start++) {
    const run = [0, 1, 2, 3, 4].map((d) => byRank.get(start + d)?.[0])
    if (run.every(Boolean)) raw.push(run as Card[])
  }
  for (const cards of bySuit.values()) {
    if (cards.length < 5) continue
    for (let i = 0; i + 5 <= cards.length; i++) raw.push(cards.slice(i, i + 5))
    raw.push([...cards.slice(0, 4), cards[cards.length - 1]])
  }
  const triples = [...byRank.values()].filter((c) => c.length >= 3)
  const pairs = [...byRank.values()].filter((c) => c.length >= 2)
  for (const t of triples) {
    for (const p of pairs) if (p[0].rank !== t[0].rank) raw.push([...t.slice(0, 3), ...p.slice(0, 2)])
  }
  for (const q of [...byRank.values()].filter((c) => c.length === 4)) {
    const kicker = sorted.find((c) => c.rank !== q[0].rank)
    if (kicker) raw.push([...q, kicker])
  }
  const seen = new Set<string>()
  const plays: Play[] = []
  for (const cards of raw) {
    const id = cards
      .map((c) => c.id)
      .sort()
      .join(',')
    if (seen.has(id)) continue
    seen.add(id)
    const shape = classify(cards)
    if (shape) plays.push({ cards, shape })
  }
  return plays
}

export function legalPlays(hand: Card[], gerai: Gerai, opening: boolean): Play[] {
  return enumeratePlays(hand).filter((p) => {
    if (opening && !p.cards.some((c) => c.id === OPENING_CARD)) return false
    return gerai.shape ? beats(p.shape, gerai.shape) : true
  })
}
