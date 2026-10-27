import type { Card, Group } from './types'

/** Food groups are the suits, lowest to highest: like ♦ ♣ ♥ ♠. */
export const GROUPS: Group[] = ['kopitiam', 'nasi', 'roti', 'kuih']

export const GROUP_LABEL: Record<Group, string> = {
  kopitiam: 'Kopitiam',
  nasi: 'Nasi',
  roti: 'Roti',
  kuih: 'Kuih',
}

/** Rank order: 3 is lowest, 2 (15) is highest. */
export const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

export const rankLabel = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' })[rank] ?? String(rank)

/** Five everyday dishes per group, cycled across the number cards. */
export const DISHES: Record<Group, string[]> = {
  kopitiam: ['Kopi O', 'Teh Tarik', 'Milo Ais', 'Sirap Bandung', 'Kopi Susu'],
  nasi: ['Nasi Lemak', 'Nasi Goreng', 'Nasi Kerabu', 'Nasi Dagang', 'Nasi Ayam'],
  roti: ['Roti Canai', 'Roti Telur', 'Roti Bakar', 'Roti Jala', 'Roti Tisu'],
  kuih: ['Kuih Lapis', 'Onde-Onde', 'Seri Muka', 'Kuih Ketayap', 'Apam Balik'],
}

const FACES: Record<number, string> = { 11: 'Abang', 12: 'Kakak', 13: 'Tauke' }
const ACES: Record<Group, string> = { kopitiam: 'Kopi Cham', nasi: 'Nasi Kandar', roti: 'Roti John', kuih: 'Kuih Bahulu' }
const TWOS: Record<Group, string> = { kopitiam: 'Teh Halia', nasi: 'Nasi Briyani', roti: 'Murtabak', kuih: 'Cendol' }

/** Number cards cycle the five everyday dishes. */
export const dishIndex = (rank: number) => (rank - 3) % 5

function dishFor(group: Group, rank: number): string {
  if (FACES[rank]) return `${FACES[rank]} ${GROUP_LABEL[group]}`
  if (rank === 14) return ACES[group]
  if (rank === 15) return TWOS[group]
  return DISHES[group][dishIndex(rank)]
}

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const group of GROUPS) for (const rank of RANKS) deck.push({ id: `${group}-${rank}`, rank, group, dish: dishFor(group, rank) })
  return deck
}

export const ALL_CARDS = makeDeck()
export const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))
export const OPENING_CARD = 'kopitiam-3'

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
