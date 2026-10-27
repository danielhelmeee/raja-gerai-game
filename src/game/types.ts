export type Group = 'kopitiam' | 'nasi' | 'roti' | 'kuih'

export interface Card {
  id: string
  value: number
  group: Group
  dish: string
}

/** A set is 1–4 cards of the same number; a run is consecutive numbers. */
export type ShapeKind = 'set' | 'run'

export interface Shape {
  kind: ShapeKind
  count: number
  rank: number
}

/** Which end of the Gerai a CILOK takes: the lowest or the highest dish. */
export type End = 'low' | 'high'

export type Difficulty = 'easy' | 'standard' | 'hard'
export type PersonaId = 'you' | 'ahseng' | 'lina' | 'mat'

export interface RoundScore {
  habuan: number
  duit: number
  hand: number
  score: number
}

export interface Player {
  id: number
  name: string
  isHuman: boolean
  persona: PersonaId
  hand: Card[]
  habuan: Card[]
  duit: number
  stampUsed: boolean
  total: number
  roundScores: RoundScore[]
}

export interface Gerai {
  /** The play currently on top: the one to beat. */
  cards: Card[]
  /** Earlier plays this Gerai beat; collected together with the top play. */
  pile: Card[]
  ownerId: number | null
  shape: Shape | null
}

export type GameEvent =
  | { seq: number; type: 'deal'; round: number; starter: number }
  | { seq: number; type: 'jual'; actor: number; cards: Card[]; shape: Shape; beat: number | null }
  | { seq: number; type: 'cilok'; actor: number; target: number; card: Card; end: End; stamp: boolean }
  | { seq: number; type: 'pass'; actor: number }
  | { seq: number; type: 'collect'; actor: number; count: number }
  | { seq: number; type: 'roundEnd'; winner: number }
  | { seq: number; type: 'gameOver'; winner: number }

/** Distributive Omit so each event variant keeps its own fields. */
export type NewGameEvent = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'seq'> : never) : never

export type Status = 'idle' | 'playing' | 'roundEnd' | 'gameOver'

export interface GameState {
  status: Status
  players: Player[]
  gerai: Gerai
  turn: number
  /** After a CILOK & JUAL steal, the same player may still JUAL (or LALU). */
  subPhase: 'normal' | 'afterCilok'
  round: number
  totalRounds: number
  difficulty: Difficulty
  starter: number
  lastWinner: number | null
  tutorial: boolean
  events: GameEvent[]
  seq: number
}

export interface GameConfig {
  numPlayers: number
  difficulty: Difficulty
  totalRounds: number
  tutorial?: boolean
}

export type GameAction =
  | { type: 'NEW_GAME'; config: GameConfig }
  | { type: 'JUAL'; playerId: number; cardIds: string[] }
  | { type: 'CILOK'; playerId: number; stamp: boolean; end: End }
  | { type: 'PASS'; playerId: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET' }
