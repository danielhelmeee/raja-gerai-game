import { ALL_CARDS, CARD_BY_ID, HAND_SIZE, OPENING_CARD, PLAYERS, shuffle, sortCards } from './cards'
import { OPPONENT_ORDER, PERSONAS } from './personas'
import { checkJual } from './rules'
import { TUTORIAL_HANDS } from './tutorial'
import type { GameAction, GameState, Gerai, NewGameEvent, Payout, Player } from './types'

const EMPTY_GERAI: Gerai = { cards: [], ownerId: null, shape: null }
const MAX_EVENTS = 40

export const initialState: GameState = {
  status: 'idle',
  players: [],
  gerai: EMPTY_GERAI,
  discard: [],
  turn: 0,
  opening: true,
  round: 0,
  totalRounds: 3,
  difficulty: 'standard',
  lastWinner: null,
  tutorial: false,
  events: [],
  seq: 0,
}

function pushEvent(state: GameState, event: NewGameEvent): GameState {
  const seq = state.seq + 1
  const events = [...state.events, { ...event, seq } as GameState['events'][number]].slice(-MAX_EVENTS)
  return { ...state, seq, events }
}

function makePlayers(): Player[] {
  const personas = ['you' as const, ...OPPONENT_ORDER]
  return personas.map((persona, id) => ({
    id,
    name: PERSONAS[persona].name,
    isHuman: id === 0,
    persona,
    hand: [],
    duit: 0,
    roundScores: [],
  }))
}

/**
 * Payout for a hawker left holding cards: 1 DUIT each, doubled at 10+ cards,
 * tripled if they never got to play (all 13 still in hand).
 */
export function payoutFor(cardsLeft: number): { multiplier: number; amount: number } {
  const multiplier = cardsLeft >= HAND_SIZE ? 3 : cardsLeft >= 10 ? 2 : 1
  return { multiplier, amount: cardsLeft * multiplier }
}

function deal(state: GameState, round: number): GameState {
  const hands = state.tutorial
    ? TUTORIAL_HANDS.map((ids) => ids.map((id) => CARD_BY_ID.get(id)!))
    : (() => {
        const deck = shuffle(ALL_CARDS)
        return state.players.map((_, i) => deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE))
      })()
  const players = state.players.map((p, i) => ({ ...p, hand: sortCards(hands[i]) }))
  // Round one opens with the Kopitiam 3; later rounds, the last winner leads anything.
  const opening = round === 1
  const starter = opening ? players.findIndex((p) => p.hand.some((c) => c.id === OPENING_CARD)) : (state.lastWinner ?? 0)
  const next: GameState = { ...state, status: 'playing', players, gerai: EMPTY_GERAI, discard: [], turn: starter, opening, round }
  return pushEvent(next, { type: 'deal', round, starter })
}

/** Move to the next hawker; if it comes back to the Gerai owner, they've won it and lead again. */
function advanceTurn(state: GameState): GameState {
  const next = (state.turn + 1) % state.players.length
  let s: GameState = { ...state, turn: next }
  if (s.gerai.ownerId === next && s.gerai.cards.length) {
    const count = s.gerai.cards.length
    s = { ...s, discard: [...s.discard, ...s.gerai.cards], gerai: EMPTY_GERAI }
    s = pushEvent(s, { type: 'clear', actor: next, count })
  }
  return s
}

function endRound(state: GameState, winner: number): GameState {
  const payouts: Payout[] = []
  let pot = 0
  const players = state.players.map((p) => {
    if (p.id === winner) return p
    const { multiplier, amount } = payoutFor(p.hand.length)
    pot += amount
    payouts.push({ id: p.id, amount })
    return { ...p, duit: p.duit - amount, roundScores: [...p.roundScores, { cardsLeft: p.hand.length, multiplier, delta: -amount }] }
  })
  const w = players[winner]
  players[winner] = { ...w, duit: w.duit + pot, roundScores: [...w.roundScores, { cardsLeft: 0, multiplier: 1, delta: pot }] }
  return pushEvent({ ...state, players, status: 'roundEnd', lastWinner: winner }, { type: 'roundEnd', winner, payouts })
}

const isTurnOf = (state: GameState, playerId: number) => state.status === 'playing' && state.turn === playerId

/** You can't pass when the Gerai is empty: whoever leads must play. */
export const canPass = (state: GameState, playerId: number) => isTurnOf(state, playerId) && state.gerai.cards.length > 0

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const { config } = action
      const base: GameState = {
        ...initialState,
        players: makePlayers().slice(0, PLAYERS),
        totalRounds: config.tutorial ? 1 : config.totalRounds,
        difficulty: config.difficulty,
        tutorial: !!config.tutorial,
        seq: state.seq,
      }
      return deal(base, 1)
    }

    case 'JUAL': {
      if (!isTurnOf(state, action.playerId)) return state
      const player = state.players[action.playerId]
      const cards = action.cardIds.map((id) => player.hand.find((c) => c.id === id))
      if (cards.some((c) => !c) || new Set(action.cardIds).size !== cards.length) return state
      const check = checkJual(cards as NonNullable<(typeof cards)[number]>[], state.gerai, state.opening)
      if (!check.ok || !check.shape) return state

      const ids = new Set(action.cardIds)
      const hand = player.hand.filter((c) => !ids.has(c.id))
      const played = sortCards(cards as NonNullable<(typeof cards)[number]>[])
      let s: GameState = {
        ...state,
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, hand } : p)),
        discard: [...state.discard, ...state.gerai.cards],
        gerai: { cards: played, ownerId: action.playerId, shape: check.shape },
        opening: false,
      }
      s = pushEvent(s, { type: 'jual', actor: action.playerId, cards: played, shape: check.shape, beat: state.gerai.ownerId })
      if (hand.length === 0) return endRound(s, action.playerId)
      return advanceTurn(s)
    }

    case 'PASS': {
      if (!canPass(state, action.playerId)) return state
      return advanceTurn(pushEvent(state, { type: 'pass', actor: action.playerId }))
    }

    case 'NEXT_ROUND': {
      if (state.status !== 'roundEnd') return state
      if (state.round >= state.totalRounds) {
        const winner = [...state.players].sort((a, b) => b.duit - a.duit)[0].id
        return pushEvent({ ...state, status: 'gameOver' }, { type: 'gameOver', winner })
      }
      return deal(state, state.round + 1)
    }

    case 'RESET':
      return { ...initialState, seq: state.seq }
  }
}
