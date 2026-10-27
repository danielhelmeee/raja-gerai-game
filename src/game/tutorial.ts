import type { End } from './types'

/**
 * Scripted one-round lesson: you vs Uncle Ah Seng with fixed hands, so every
 * step below happens exactly as described.
 */
export const TUTORIAL_HANDS: string[][] = [
  ['kopitiam-2', 'kopitiam-3', 'nasi-3', 'kopitiam-4', 'kopitiam-5', 'kopitiam-6', 'nasi-6', 'kopitiam-7', 'kopitiam-8', 'nasi-8', 'kopitiam-9'],
  [
    'nasi-1', 'kuih-1', 'roti-2', 'roti-3', 'nasi-4', 'nasi-5', 'roti-5', 'kuih-5', 'roti-6', 'kuih-6', 'nasi-7', 'kuih-8',
    'nasi-9', 'kopitiam-10', 'nasi-10',
  ],
]

export type TutAction =
  /** 'rest' means every dish still in your hand. */
  | { type: 'jual'; cardIds: string[] | 'rest' }
  /** Without an end, either end is accepted. */
  | { type: 'cilok'; stamp: boolean; end?: End }
  | { type: 'pass' }

export type Highlight =
  | { kind: 'cards'; ids: string[] }
  | { kind: 'hand' }
  | { kind: 'gerai' }
  | { kind: 'geraiEnd'; end: End | 'both' }
  | { kind: 'plate'; seat: number }
  | { kind: 'coins'; seat: number }
  | { kind: 'stamp'; seat: number }
  | { kind: 'button'; id: 'jual' | 'cilok' | 'stamp' | 'pass' }
  | { kind: 'telemetry' }

export interface TutorialStep {
  kind: 'info' | 'do' | 'ai'
  title: string
  text: string
  action?: TutAction
  highlight?: Highlight[]
}

const cards = (...ids: string[]): Highlight => ({ kind: 'cards', ids })

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'info',
    title: 'Selamat datang!',
    text: "You're running a stall against Uncle Ah Seng. Sell every dish in your hand first. Each round you score HABUAN + DUIT - dishes left in hand.",
    highlight: [{ kind: 'telemetry' }],
  },
  {
    kind: 'info',
    title: 'Your dishes',
    text: 'Each card has ONE number (1-10) and a food group: Kopitiam, Nasi, Roti or Kuih. The group is just decoration. Only the number matters. Your hand stays sorted for you.',
    highlight: [{ kind: 'hand' }],
  },
  {
    kind: 'info',
    title: 'The GERAI',
    text: 'The middle of the table is the GERAI, the dishes on sale right now. To JUAL you must beat it with the same shape and a higher number. Shapes: single, pair, triple, four of a kind, or a run of 3+ numbers in a row.',
    highlight: [{ kind: 'gerai' }],
  },
  {
    kind: 'do',
    title: 'Open the Gerai',
    text: 'The Gerai is empty, so any shape goes. Tap your two 3s, then press JUAL.',
    action: { type: 'jual', cardIds: ['kopitiam-3', 'nasi-3'] },
    highlight: [cards('kopitiam-3', 'nasi-3'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle answers...',
    text: 'Uncle Ah Seng looks for a higher pair.',
    action: { type: 'jual', cardIds: ['roti-6', 'kuih-6'] },
  },
  {
    kind: 'do',
    title: 'Beat it!',
    text: 'Uncle sold a pair of 6s. Only a higher pair can beat it. Tap your two 8s and JUAL.',
    action: { type: 'jual', cardIds: ['kopitiam-8', 'nasi-8'] },
    highlight: [cards('kopitiam-8', 'nasi-8'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle is stuck...',
    text: "Uncle can't beat a pair of 8s, so he says LALU (pass).",
    action: { type: 'pass' },
  },
  {
    kind: 'info',
    title: 'HABUAN!',
    text: 'Play came back to you unbeaten, so the whole Gerai (every dish played on it) goes onto your plate as HABUAN. Each Habuan card is +1 point. You also open the next Gerai.',
    highlight: [{ kind: 'plate', seat: 0 }],
  },
  {
    kind: 'do',
    title: 'Sell a run',
    text: 'A run is 3 or more numbers in a row, from any food groups. Tap 4, 5 and 6, then JUAL.',
    action: { type: 'jual', cardIds: ['kopitiam-4', 'kopitiam-5', 'kopitiam-6'] },
    highlight: [cards('kopitiam-4', 'kopitiam-5', 'kopitiam-6'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle answers...',
    text: 'A run of 3 can only be beaten by a higher run of 3.',
    action: { type: 'jual', cardIds: ['nasi-7', 'kuih-8', 'nasi-9'] },
  },
  {
    kind: 'info',
    title: 'Time to CILOK!',
    text: "Instead of selling, you can CILOK!: snatch the dish at EITHER END of another hawker's Gerai (it needs 2+ dishes). They get 1 DUIT coin as compensation, and your turn ends.",
    highlight: [{ kind: 'geraiEnd', end: 'both' }, { kind: 'button', id: 'cilok' }],
  },
  {
    kind: 'info',
    title: 'Which end?',
    text: 'Take the LEFT end (7) and Uncle is left with 8-9, a strong Gerai. Take the RIGHT end (9) and he keeps a weaker 7-8. Here the 9 is more useful: it pairs with the 9 in your hand.',
    highlight: [{ kind: 'geraiEnd', end: 'both' }, cards('kopitiam-9')],
  },
  {
    kind: 'do',
    title: 'Snatch the 9',
    text: 'Press CILOK!, then tap the 9 at the right end of the Gerai.',
    action: { type: 'cilok', stamp: false, end: 'high' },
    highlight: [{ kind: 'button', id: 'cilok' }, { kind: 'geraiEnd', end: 'high' }],
  },
  {
    kind: 'info',
    title: 'DUIT',
    text: "Uncle got +1 DUIT. Each coin is +1 point for him at round end. Play then came back to Uncle, the Gerai owner, so he took what was left as Habuan. Your stolen 9 is in your hand now: it costs -1 if you're stuck with it.",
    highlight: [{ kind: 'coins', seat: 1 }, cards('nasi-9', 'kopitiam-9')],
  },
  {
    kind: 'ai',
    title: 'Uncle opens...',
    text: 'Uncle Ah Seng opens a new Gerai with three 5s.',
    action: { type: 'jual', cardIds: ['nasi-5', 'roti-5', 'kuih-5'] },
  },
  {
    kind: 'info',
    title: 'The CILOK & JUAL stamp',
    text: 'Once per round you can use your wooden stamp to CILOK and then JUAL in the same turn. Snatch a 5 and his triple becomes a pair, and you have a pair of 9s ready.',
    highlight: [{ kind: 'stamp', seat: 0 }, { kind: 'button', id: 'stamp' }],
  },
  {
    kind: 'do',
    title: 'Stamp it!',
    text: 'Press CILOK & JUAL, then tap either end of the Gerai. Every card in a triple is a 5, so either end will do.',
    action: { type: 'cilok', stamp: true },
    highlight: [{ kind: 'stamp', seat: 0 }, { kind: 'button', id: 'stamp' }, { kind: 'geraiEnd', end: 'both' }],
  },
  {
    kind: 'do',
    title: '...and JUAL',
    text: 'The Gerai is now a pair of 5s. Tap your two 9s and JUAL, all in the same turn.',
    action: { type: 'jual', cardIds: ['kopitiam-9', 'nasi-9'] },
    highlight: [cards('kopitiam-9', 'nasi-9'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle passes',
    text: 'No higher pair for Uncle. LALU. The Gerai is yours again.',
    action: { type: 'pass' },
  },
  {
    kind: 'do',
    title: 'Lead a single',
    text: 'Open with your single 2.',
    action: { type: 'jual', cardIds: ['kopitiam-2'] },
    highlight: [cards('kopitiam-2'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle answers...',
    text: 'Uncle slams down a 10.',
    action: { type: 'jual', cardIds: ['kopitiam-10'] },
  },
  {
    kind: 'do',
    title: 'Know when to LALU',
    text: "Nothing beats a 10, and Uncle's Gerai has only one dish, so there's nothing to CILOK. Press LALU to pass. He collects the Gerai.",
    action: { type: 'pass' },
    highlight: [{ kind: 'button', id: 'pass' }],
  },
  {
    kind: 'ai',
    title: 'Uncle opens...',
    text: 'Uncle opens with a run: 1-2-3.',
    action: { type: 'jual', cardIds: ['nasi-1', 'roti-2', 'roti-3'] },
  },
  {
    kind: 'do',
    title: 'Clear your stall',
    text: 'Your stolen 5 plus your 6 and 7 make a higher run! Tap all three and JUAL to empty your hand and end the round.',
    action: { type: 'jual', cardIds: 'rest' },
    highlight: [{ kind: 'hand' }, { kind: 'button', id: 'jual' }],
  },
]
