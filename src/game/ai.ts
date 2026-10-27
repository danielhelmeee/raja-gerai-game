import { canCilok, canPass } from './engine'
import { beats, cilokResult, isQuad, legalPlays, type Play } from './rules'
import type { Card, GameAction, GameState } from './types'

/** Rough number of plays needed to empty a hand: greedy runs of 3+, then one play per number. */
export function playsToEmpty(hand: Card[]): number {
  const counts = new Array(12).fill(0)
  for (const c of hand) counts[c.value]++
  let plays = 0
  for (;;) {
    let bestStart = -1
    let bestLen = 0
    for (let s = 1; s <= 10; s++) {
      let len = 0
      // Don't break up pairs or better to make a run.
      while (s + len <= 10 && counts[s + len] === 1) len++
      if (len > bestLen) {
        bestLen = len
        bestStart = s
      }
    }
    if (bestLen < 3) break
    for (let v = bestStart; v < bestStart + bestLen; v++) counts[v]--
    plays++
  }
  return plays + counts.filter((n) => n > 0).length
}

const without = (hand: Card[], cards: Card[]) => {
  const ids = new Set(cards.map((c) => c.id))
  return hand.filter((c) => !ids.has(c.id))
}

type Option = { action: GameAction; value: number }

function handValue(hand: Card[]): number {
  return -playsToEmpty(hand) * 3 - hand.length
}

export function decide(state: GameState, playerId: number): GameAction {
  const me = state.players[playerId]
  const { gerai, pusing, difficulty } = state
  const leading = gerai.cards.length === 0
  const others = state.players.filter((p) => p.id !== playerId)
  const danger = Math.min(...others.map((p) => p.hand.length))
  const ownerHand = gerai.ownerId !== null ? state.players[gerai.ownerId].hand.length : 99
  const strength = (rank: number) => (pusing ? 11 - rank : rank)

  const playValue = (hand: Card[], play: Play): number => {
    const rest = without(hand, play.cards)
    if (rest.length === 0) return 1000
    let v = handValue(rest)
    if (leading) v -= strength(play.shape.rank) * 0.25
    else {
      v -= (strength(play.shape.rank) / 10) * (rest.length > 4 ? 2.2 : 0.6)
      v += (gerai.pile.length + gerai.cards.length) * 0.25
    }
    if (isQuad(play.shape) && rest.length > 3 && danger > 2) v -= 4
    return v
  }

  if (difficulty === 'easy') {
    const plays = legalPlays(me.hand, gerai, pusing)
    if (state.subPhase === 'afterCilok') {
      return plays.length ? { type: 'JUAL', playerId, cardIds: plays[0].cards.map((c) => c.id) } : { type: 'PASS', playerId }
    }
    if (!leading && (plays.length === 0 || Math.random() < 0.3)) {
      if (canCilok(state, playerId, false) && Math.random() < 0.12) return { type: 'CILOK', playerId, stamp: false }
      return { type: 'PASS', playerId }
    }
    const play = plays[Math.floor(Math.random() * plays.length)]
    return { type: 'JUAL', playerId, cardIds: play.cards.map((c) => c.id) }
  }

  const options: Option[] = []
  for (const play of legalPlays(me.hand, gerai, pusing)) {
    options.push({ action: { type: 'JUAL', playerId, cardIds: play.cards.map((c) => c.id) }, value: playValue(me.hand, play) })
  }

  if (canPass(state, playerId)) {
    let v = handValue(me.hand) - 1.2
    if (ownerHand <= 2) v -= 6
    options.push({ action: { type: 'PASS', playerId }, value: v })
  }

  const steal = cilokResult(gerai)
  if (steal && canCilok(state, playerId, false)) {
    const hand = [...me.hand, steal.card]
    options.push({ action: { type: 'CILOK', playerId, stamp: false }, value: handValue(hand) - 1.5 - (ownerHand <= 2 ? 2 : 0) })
  }
  if (steal && canCilok(state, playerId, true)) {
    const hand = [...me.hand, steal.card]
    const after = { ...gerai, cards: steal.remaining, shape: steal.shape }
    const follow = legalPlays(hand, after, pusing).filter((p) => beats(p.shape, steal.shape, pusing))
    let best = -Infinity
    for (const p of follow) best = Math.max(best, playValue(hand, p))
    // Saving the stamp has some value of its own.
    if (best > -Infinity) options.push({ action: { type: 'CILOK', playerId, stamp: true }, value: best - 1.5 - (danger > 4 ? 1 : 0) })
  }

  if (options.length === 0) return { type: 'PASS', playerId }
  const noise = difficulty === 'standard' ? 1.6 : 0.2
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
