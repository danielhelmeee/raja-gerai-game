import type { Card, Group } from './types'

export const GROUPS: Group[] = ['kopitiam', 'nasi', 'roti', 'kuih']

export const GROUP_LABEL: Record<Group, string> = {
  kopitiam: 'Kopitiam',
  nasi: 'Nasi',
  roti: 'Roti',
  kuih: 'Kuih',
}

/** Five dishes per group; values 1–5 and 6–10 reuse the same five. */
export const DISHES: Record<Group, string[]> = {
  kopitiam: ['Kopi O', 'Teh Tarik', 'Milo Ais', 'Sirap Bandung', 'Kopi Susu'],
  nasi: ['Nasi Lemak', 'Nasi Goreng', 'Nasi Kerabu', 'Nasi Dagang', 'Nasi Ayam'],
  roti: ['Roti Canai', 'Roti Telur', 'Roti Bakar', 'Roti Jala', 'Roti Tisu'],
  kuih: ['Kuih Lapis', 'Onde-Onde', 'Seri Muka', 'Kuih Ketayap', 'Apam Balik'],
}

export const dishIndex = (value: number) => (value - 1) % 5

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const group of GROUPS) {
    for (let value = 1; value <= 10; value++) {
      deck.push({ id: `${group}-${value}`, value, group, dish: DISHES[group][dishIndex(value)] })
    }
  }
  return deck
}

export const ALL_CARDS = makeDeck()
export const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.value - b.value || GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group))
}

export function sortByGroup(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.value - b.value)
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const HAND_SIZE: Record<number, number> = { 2: 14, 3: 12, 4: 10 }
