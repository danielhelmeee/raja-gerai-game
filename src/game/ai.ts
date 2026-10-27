import { canCilok, canPass } from './engine'
import { beats, cilokResult, legalPlays, type Play } from './rules'
import type { Card, End, GameAction, GameState } from './types'

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

const ENDS: End[] = ['low', 'high']

export function decide(state: GameState, playerId: number): GameAction {
  const me = state.players[playerId]
  const { gerai, difficulty } = state
  const leading = gerai.cards.length === 0
  const others = state.players.filter((p) => p.id !== playerId)
  const danger = Math.min(...others.map((p) => p.hand.length))
  const ownerHand = gerai.ownerId !== null ? state.players[gerai.ownerId].hand.length : 99
  // A strong leftover Gerai is a nuisance for whoever plays next, unless that's the owner collecting it.
  const nextId = (playerId + 1) % state.players.length
  const nextIsOwner = nextId === gerai.ownerId

  const playValue = (hand: Card[], play: Play): number => {
    const rest = without(hand, play.cards)
    if (rest.length === 0) return 1000
    let v = handValue(rest)
    if (leading) v -= play.shape.rank * 0.25
    else {
      v -= (play.shape.rank / 10) * (rest.length > 4 ? 2.2 : 0.6)
      v += (gerai.pile.length + gerai.cards.length) * 0.25
    }
    if (play.shape.kind === 'set' && play.shape.count === 4 && rest.length > 3 && danger > 2) v -= 3
    return v
  }

  if (difficulty === 'easy') {
    const plays = legalPlays(me.hand, gerai)
    if (state.subPhase === 'afterCilok') {
      return plays.length ? { type: 'JUAL', playerId, cardIds: plays[0].cards.map((c) => c.id) } : { type: 'PASS', playerId }
    }
    if (!leading && (plays.length === 0 || Math.random() < 0.3)) {
      if (canCilok(state, playerId, false) && Math.random() < 0.12) {
        return { type: 'CILOK', playerId, stamp: false, end: Math.random() < 0.5 ? 'low' : 'high' }
      }
      return { type: 'PASS', playerId }
    }
    const play = plays[Math.floor(Math.random() * plays.length)]
    return { type: 'JUAL', playerId, cardIds: play.cards.map((c) => c.id) }
  }

  const options: Option[] = []
  for (const play of legalPlays(me.hand, gerai)) {
    options.push({ action: { type: 'JUAL', playerId, cardIds: play.cards.map((c) => c.id) }, value: playValue(me.hand, play) })
  }

  if (canPass(state, playerId)) {
    let v = handValue(me.hand) - 1.2
    if (ownerHand <= 2) v -= 6
    options.push({ action: { type: 'PASS', playerId }, value: v })
  }

  for (const end of ENDS) {
    const steal = cilokResult(gerai, end)
    if (!steal) continue
    const hand = [...me.hand, steal.card]
    const blockBonus = nextIsOwner ? 0 : steal.shape.rank * 0.08
    if (canCilok(state, playerId, false)) {
      options.push({
        action: { type: 'CILOK', playerId, stamp: false, end },
        value: handValue(hand) - 1.5 - (ownerHand <= 2 ? 2 : 0) + blockBonus,
      })
    }
    if (canCilok(state, playerId, true)) {
      const after = { ...gerai, cards: steal.remaining, shape: steal.shape }
      const follow = legalPlays(hand, after).filter((p) => beats(p.shape, steal.shape))
      let best = -Infinity
      for (const p of follow) best = Math.max(best, playValue(hand, p))
      // Saving the stamp for later has some value of its own.
      if (best > -Infinity) {
        options.push({ action: { type: 'CILOK', playerId, stamp: true, end }, value: best - 1.5 - (danger > 4 ? 1 : 0) })
      }
    }
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
