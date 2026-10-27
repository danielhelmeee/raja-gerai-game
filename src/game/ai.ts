import { canPass } from './engine'
import { enumeratePlays, legalPlays, type Play } from './rules'
import type { Card, GameAction, GameState } from './types'

const without = (hand: Card[], cards: Card[]) => {
  const ids = new Set(cards.map((c) => c.id))
  return hand.filter((c) => !ids.has(c.id))
}

/** Plays needed if every remaining rank goes out as one single/pair/triple (quads count as two). */
function simplePlays(hand: Card[]): number {
  const counts = new Map<number, number>()
  for (const c of hand) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
  let n = 0
  for (const k of counts.values()) n += k === 4 ? 2 : 1
  return n
}

/** Fewest plays to empty the hand, trying up to two five-card hands first. */
export function planPlays(hand: Card[]): number {
  let best = simplePlays(hand)
  const fives = enumeratePlays(hand).filter((p) => p.shape.kind === 'five').slice(0, 24)
  for (const f of fives) {
    const rest = without(hand, f.cards)
    best = Math.min(best, 1 + simplePlays(rest))
    for (const g of enumeratePlays(rest)
      .filter((p) => p.shape.kind === 'five')
      .slice(0, 12)) {
      best = Math.min(best, 2 + simplePlays(without(rest, g.cards)))
    }
  }
  return best
}

/** How "strong" a play is, 0..1: spending strong plays early wastes control later. */
function strength(p: Play): number {
  if (p.shape.kind === 'five') return 0.55 + 0.1 * ['barisan', 'setmenu', 'kenduri', 'borong', 'diraja'].indexOf(p.shape.five!)
  const rank = p.shape.kind === 'triple' ? p.shape.key : Math.floor(p.shape.key / 4)
  return (rank - 3) / 12
}

type Option = { action: GameAction; value: number }

export function decide(state: GameState, playerId: number): GameAction {
  const me = state.players[playerId]
  const { gerai, difficulty, opening } = state
  const leading = gerai.cards.length === 0
  const legal = legalPlays(me.hand, gerai, opening)
  const others = state.players.filter((p) => p.id !== playerId)
  const danger = Math.min(...others.map((p) => p.hand.length))
  const next = state.players[(playerId + 1) % state.players.length]

  if (!legal.length) return { type: 'PASS', playerId }

  if (difficulty === 'easy') {
    if (!leading && Math.random() < 0.3 && canPass(state, playerId)) return { type: 'PASS', playerId }
    const pick = leading ? legal.sort((a, b) => b.cards.length - a.cards.length)[0] : legal[Math.floor(Math.random() * legal.length)]
    return { type: 'JUAL', playerId, cardIds: pick.cards.map((c) => c.id) }
  }

  const before = planPlays(me.hand)
  const options: Option[] = legal.map((p) => {
    const rest = without(me.hand, p.cards)
    if (!rest.length) return { action: { type: 'JUAL', playerId, cardIds: p.cards.map((c) => c.id) }, value: 1000 }
    const after = planPlays(rest)
    // Value: fewer plays left is good; breaking combos (after not dropping by one) is bad.
    let v = (before - after) * 3 - (after - (before - 1)) * 2.5
    const st = strength(p)
    if (leading) {
      // Lead weak stuff and shed many cards; keep 2s and big hands for control.
      v += p.cards.length * 0.6 - st * 2.2
    } else {
      v -= st * (rest.length > 5 ? 3.2 : 1.2)
    }
    // Someone is about to go out: block hard.
    if (danger <= 2) v += st * 4 + p.cards.length
    if (difficulty === 'hard' && next.hand.length === 1 && p.shape.kind === 'single') v += st * 6
    return { action: { type: 'JUAL', playerId, cardIds: p.cards.map((c) => c.id) }, value: v }
  })

  if (canPass(state, playerId)) {
    let v = -0.6
    if (danger <= 2) v -= 5
    if (difficulty === 'hard' && gerai.ownerId !== null && state.players[gerai.ownerId].hand.length <= 3) v -= 3
    options.push({ action: { type: 'PASS', playerId }, value: v })
  }

  const noise = difficulty === 'standard' ? 1.4 : 0.25
  let best = options[0]
  let bestScore = -Infinity
  for (const o of options) {
    const s = o.value + (Math.random() - 0.5) * noise
    if (s > bestScore) {
      bestScore = s
      best = o
    }
  }
  return best.action
}
