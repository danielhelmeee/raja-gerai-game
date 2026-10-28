import type { Card, Group } from './types'

/** Suits, lowest to highest, like ◆ ♣ ♥ ♠. Each suit has one picture on every card. */
export const GROUPS: Group[] = ['karipap', 'tehtarik', 'ramly', 'nasilemak']

export const GROUP_LABEL: Record<Group, string> = {
  karipap: 'Karipap',
  tehtarik: 'Teh Tarik',
  ramly: 'Ramly Burger',
  nasilemak: 'Nasi Lemak',
}

/** The poker suit each food stands for. */
export const SUIT_SYMBOL: Record<Group, string> = { karipap: '♦', tehtarik: '♣', ramly: '♥', nasilemak: '♠' }

/** Two card colours, as in a normal deck: red suits and black suits alternate. */
export const RED_SUITS: Group[] = ['karipap', 'ramly']

/** Rank order: 3 is lowest, 2 (15) is highest. */
export const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

export const rankLabel = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' })[rank] ?? String(rank)

const FACES: Record<number, string> = { 11: 'Abang', 12: 'Kakak', 13: 'Tauke' }

function dishFor(group: Group, rank: number): string {
  return FACES[rank] ? `${FACES[rank]} ${GROUP_LABEL[group]}` : GROUP_LABEL[group]
}

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const group of GROUPS) for (const rank of RANKS) deck.push({ id: `${group}-${rank}`, rank, group, dish: dishFor(group, rank) })
  return deck
}

export const ALL_CARDS = makeDeck()
export const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))
export const OPENING_CARD = 'karipap-3'

/** Total order used for every comparison: rank first, then food group. */
export const cardKey = (c: Card) => c.rank * 4 + GROUPS.indexOf(c.group)

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => cardKey(a) - cardKey(b))
}

export function sortByGroup(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.rank - b.rank)
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const PLAYERS = 4
export const HAND_SIZE = 13
