import { ALL_CARDS, CARD_BY_ID, GROUPS, HAND_SIZE, shuffle, sortCards } from './cards'
import { OPPONENT_ORDER, PERSONAS } from './personas'
import { checkJual, cilokResult, isQuad } from './rules'
import { TUTORIAL_HANDS } from './tutorial'
import type { Card, GameAction, GameConfig, GameState, Gerai, NewGameEvent, Player, RoundScore } from './types'

const EMPTY_GERAI: Gerai = { cards: [], pile: [], ownerId: null, shape: null }
const MAX_EVENTS = 40

export const initialState: GameState = {
  status: 'idle',
  players: [],
  gerai: EMPTY_GERAI,
  pusing: false,
  turn: 0,
  subPhase: 'normal',
  round: 0,
  totalRounds: 3,
  difficulty: 'standard',
  starter: 0,
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

function makePlayers(config: GameConfig): Player[] {
  const personas = ['you' as const, ...OPPONENT_ORDER.slice(0, config.numPlayers - 1)]
  return personas.map((persona, id) => ({
    id,
    name: PERSONAS[persona].name,
    isHuman: id === 0,
    persona,
    hand: [],
    habuan: [],
    duit: 0,
    stampUsed: false,
    total: 0,
    roundScores: [],
  }))
}

/** The holder of the lowest dish (Kopitiam breaks ties) opens round one. */
function lowestHolder(players: Player[]): number {
  let best = 0
  let bestKey = Infinity
  for (const p of players) {
    for (const c of p.hand) {
      const key = c.value * 10 + GROUPS.indexOf(c.group)
      if (key < bestKey) {
        bestKey = key
        best = p.id
      }
    }
  }
  return best
}

function deal(state: GameState, round: number): GameState {
  let players: Player[]
  if (state.tutorial) {
    players = state.players.map((p, i) => ({
      ...p,
      hand: sortCards(TUTORIAL_HANDS[i].map((id) => CARD_BY_ID.get(id)!)),
    }))
  } else {
    const deck = shuffle(ALL_CARDS)
    const size = HAND_SIZE[state.players.length]
    players = state.players.map((p, i) => ({ ...p, hand: sortCards(deck.slice(i * size, (i + 1) * size)) }))
  }
  players = players.map((p) => ({ ...p, habuan: [], duit: 0, stampUsed: false }))
  const starter = state.tutorial ? 0 : state.lastWinner ?? lowestHolder(players)
  const next: GameState = {
    ...state,
    status: 'playing',
    players,
    gerai: EMPTY_GERAI,
    pusing: false,
    turn: starter,
    starter,
    subPhase: 'normal',
    round,
  }
  return pushEvent(next, { type: 'deal', round, starter })
}

function updatePlayer(players: Player[], id: number, fn: (p: Player) => Player): Player[] {
  return players.map((p) => (p.id === id ? fn(p) : p))
}

/** Move to the next hawker; if it comes back to the Gerai owner, they collect it as Habuan. */
function advanceTurn(state: GameState): GameState {
  const next = (state.turn + 1) % state.players.length
  let s: GameState = { ...state, subPhase: 'normal', turn: next }
  if (s.gerai.ownerId === next && s.gerai.cards.length) {
    const won = [...s.gerai.pile, ...s.gerai.cards]
    s = { ...s, players: updatePlayer(s.players, next, (p) => ({ ...p, habuan: [...p.habuan, ...won] })), gerai: EMPTY_GERAI }
    s = pushEvent(s, { type: 'collect', actor: next, count: won.length })
  }
  return s
}

export function scoreRound(p: Player): RoundScore {
  const habuan = p.habuan.length
  const hand = p.hand.length
  return { habuan, duit: p.duit, hand, score: habuan + p.duit - hand }
}

function endRound(state: GameState, winner: number): GameState {
  const players = state.players.map((p) => {
    const rs = scoreRound(p)
    return { ...p, roundScores: [...p.roundScores, rs], total: p.total + rs.score }
  })
  return pushEvent({ ...state, players, status: 'roundEnd', lastWinner: winner }, { type: 'roundEnd', winner })
}

function isTurnOf(state: GameState, playerId: number) {
  return state.status === 'playing' && state.turn === playerId
}

export function canCilok(state: GameState, playerId: number, stamp: boolean): boolean {
  if (!isTurnOf(state, playerId) || state.subPhase !== 'normal') return false
  if (state.gerai.ownerId === playerId || !cilokResult(state.gerai)) return false
  return !stamp || !state.players[playerId].stampUsed
}

export function canPass(state: GameState, playerId: number): boolean {
  return isTurnOf(state, playerId) && (state.subPhase === 'afterCilok' || state.gerai.cards.length > 0)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const { config } = action
      const base: GameState = {
        ...initialState,
        players: makePlayers(config),
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
      const cards = action.cardIds.map((id) => player.hand.find((c) => c.id === id)).filter(Boolean) as Card[]
      if (cards.length !== action.cardIds.length) return state
      const check = checkJual(cards, state.gerai, state.pusing)
      if (!check.ok || !check.shape) return state

      const ids = new Set(action.cardIds)
      const hand = player.hand.filter((c) => !ids.has(c.id))
      const flips = isQuad(check.shape)
      const pusing = flips ? !state.pusing : state.pusing
      const gerai: Gerai = {
        cards: sortCards(cards),
        pile: [...state.gerai.pile, ...state.gerai.cards],
        ownerId: action.playerId,
        shape: check.shape,
      }
      let s: GameState = {
        ...state,
        players: updatePlayer(state.players, action.playerId, (p) => ({ ...p, hand })),
        gerai,
        pusing,
      }
      s = pushEvent(s, {
        type: 'jual',
        actor: action.playerId,
        cards: gerai.cards,
        shape: check.shape,
        beat: state.gerai.ownerId,
        pusing: flips ? pusing : null,
      })

      if (hand.length === 0) {
        const won = [...gerai.pile, ...gerai.cards]
        s = {
          ...s,
          players: updatePlayer(s.players, action.playerId, (p) => ({ ...p, habuan: [...p.habuan, ...won] })),
          gerai: EMPTY_GERAI,
        }
        s = pushEvent(s, { type: 'collect', actor: action.playerId, count: won.length })
        return endRound(s, action.playerId)
      }
      return advanceTurn(s)
    }

    case 'CILOK': {
      if (!canCilok(state, action.playerId, action.stamp)) return state
      const result = cilokResult(state.gerai)!
      const target = state.gerai.ownerId!
      let players = updatePlayer(state.players, action.playerId, (p) => ({
        ...p,
        hand: sortCards([...p.hand, result.card]),
        stampUsed: p.stampUsed || action.stamp,
      }))
      players = updatePlayer(players, target, (p) => ({ ...p, duit: p.duit + 1 }))
      let s: GameState = {
        ...state,
        players,
        gerai: { ...state.gerai, cards: result.remaining, shape: result.shape },
      }
      s = pushEvent(s, { type: 'cilok', actor: action.playerId, target, card: result.card, stamp: action.stamp })
      return action.stamp ? { ...s, subPhase: 'afterCilok' } : advanceTurn(s)
    }

    case 'PASS': {
      if (!canPass(state, action.playerId)) return state
      return advanceTurn(pushEvent(state, { type: 'pass', actor: action.playerId }))
    }

    case 'NEXT_ROUND': {
      if (state.status !== 'roundEnd') return state
      if (state.round >= state.totalRounds) {
        const winner = [...state.players].sort((a, b) => b.total - a.total)[0].id
        return pushEvent({ ...state, status: 'gameOver' }, { type: 'gameOver', winner })
      }
      return deal(state, state.round + 1)
    }

    case 'RESET':
      return { ...initialState, seq: state.seq }
  }
}
