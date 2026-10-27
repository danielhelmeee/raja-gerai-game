/** The four suits, lowest to highest (like ◆ ♣ ♥ ♠). */
export type Group = 'karipap' | 'tehtarik' | 'ramly' | 'nasilemak'

/** Dai Di ranks: 3–10, J=11, Q=12, K=13, A=14, and 2=15 (highest). */
export interface Card {
  id: string
  rank: number
  group: Group
  dish: string
}

export type Kind = 'single' | 'pair' | 'triple' | 'five'
/** Five-card hands, weakest to strongest: straight, flush, full house, four of a kind + 1, straight flush. */
export type FiveKind = 'barisan' | 'tapau' | 'kenduri' | 'borong' | 'tapaubarisan'

export interface Shape {
  kind: Kind
  count: number
  five?: FiveKind
  /** Compared within the same kind (and five-card category); higher wins. */
  key: number
}

export type Difficulty = 'easy' | 'standard' | 'hard'
export type PersonaId =
  | 'you'
  | 'ahseng'
  | 'lina'
  | 'mat'
  | 'ayan'
  | 'pakdan'
  | 'meiling'
  | 'anand'
  | 'kavitha'
  | 'gurdev'
  | 'dayang'
  | 'joanne'
  | 'robert'
  | 'ahkow'
  | 'sweelian'
  | 'mamakali'

export interface RoundScore {
  cardsLeft: number
  multiplier: number
  /** DUIT won (positive, for the winner) or paid (negative). */
  delta: number
}

export interface Player {
  id: number
  name: string
  isHuman: boolean
  persona: PersonaId
  hand: Card[]
  /** Running DUIT across the match; can go negative. */
  duit: number
  roundScores: RoundScore[]
}

export interface Gerai {
  cards: Card[]
  ownerId: number | null
  shape: Shape | null
}

export interface Payout {
  id: number
  amount: number
}

export type GameEvent =
  | { seq: number; type: 'deal'; round: number; starter: number }
  | { seq: number; type: 'jual'; actor: number; cards: Card[]; shape: Shape; beat: number | null }
  | { seq: number; type: 'pass'; actor: number }
  | { seq: number; type: 'clear'; actor: number; count: number }
  | { seq: number; type: 'roundEnd'; winner: number; payouts: Payout[] }
  | { seq: number; type: 'gameOver'; winner: number }

/** Distributive Omit so each event variant keeps its own fields. */
export type NewGameEvent = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'seq'> : never) : never

export type Status = 'idle' | 'playing' | 'roundEnd' | 'gameOver'

export interface GameState {
  status: Status
  players: Player[]
  gerai: Gerai
  /** Cards from GERAIs that have been beaten or cleared. */
  discard: Card[]
  turn: number
  /** Each round's first play must include the Karipap 3. */
  opening: boolean
  round: number
  totalRounds: number
  difficulty: Difficulty
  lastWinner: number | null
  tutorial: boolean
  events: GameEvent[]
  seq: number
}

export interface GameConfig {
  difficulty: Difficulty
  totalRounds: number
  /** The three AI hawkers at the table, in seat order. */
  opponents: PersonaId[]
  tutorial?: boolean
}

export type GameAction =
  | { type: 'NEW_GAME'; config: GameConfig }
  | { type: 'JUAL'; playerId: number; cardIds: string[] }
  | { type: 'PASS'; playerId: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET' }
