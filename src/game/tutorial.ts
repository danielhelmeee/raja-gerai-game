/**
 * Scripted one-round lesson: you vs Uncle Ah Seng with fixed hands, so every
 * step below happens exactly as described.
 */
export const TUTORIAL_HANDS: string[][] = [
  [
    'kopitiam-1', 'kopitiam-2', 'nasi-2', 'roti-2', 'kuih-2', 'kopitiam-3', 'nasi-3', 'kopitiam-4',
    'kopitiam-5', 'kopitiam-6', 'nasi-6', 'kopitiam-7', 'kopitiam-8', 'nasi-8', 'roti-8', 'kopitiam-9',
  ],
  [
    'nasi-1', 'roti-3', 'nasi-4', 'nasi-5', 'roti-5', 'kuih-5', 'roti-6', 'kuih-6', 'nasi-7', 'kuih-8',
    'nasi-9', 'kopitiam-10', 'nasi-10',
  ],
]

export type TutAction =
  | { type: 'jual'; cardIds: string[] }
  | { type: 'cilok'; stamp: boolean }
  | { type: 'pass' }

export type Highlight =
  | { kind: 'cards'; ids: string[] }
  | { kind: 'hand' }
  | { kind: 'gerai' }
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
    title: 'Selamat datang ke Pasar Malam!',
    text: "You're running a stall against Uncle Ah Seng. Be the first to sell every dish in your hand. Each round you score HABUAN + DUIT − dishes left in hand.",
    highlight: [{ kind: 'telemetry' }],
  },
  {
    kind: 'info',
    title: 'Your dishes',
    text: 'Each card has ONE number (1–10) and a food group: Kopitiam, Nasi, Roti or Kuih. The group is just decoration. Only the number matters. Your hand stays sorted for you.',
    highlight: [{ kind: 'hand' }],
  },
  {
    kind: 'info',
    title: 'The GERAI',
    text: "The middle of the table is the GERAI, the dishes on sale right now. To JUAL you must beat it with the same shape and a higher number. Shapes: single, pair, triple, four of a kind, or a run of 3+ numbers in a row.",
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
    title: 'Uncle answers…',
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
    title: 'Uncle is stuck…',
    text: "Uncle can't beat a pair of 8s, so he says LALU (pass).",
    action: { type: 'pass' },
  },
  {
    kind: 'info',
    title: 'HABUAN!',
    text: 'Everyone else passed, so the whole Gerai (every dish played on it) lands on your plate as HABUAN. Each Habuan card is +1 point. You also open the next Gerai.',
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
    title: 'Uncle answers…',
    text: 'A run of 3 can only be beaten by a higher run of 3.',
    action: { type: 'jual', cardIds: ['nasi-7', 'kuih-8', 'nasi-9'] },
  },
  {
    kind: 'info',
    title: 'Time to CILOK!',
    text: "Instead of selling, you can CILOK!: snatch the highest dish off another hawker's Gerai (it needs 2+ dishes). They get 1 DUIT coin as compensation, and your turn ends.",
    highlight: [{ kind: 'gerai' }, { kind: 'button', id: 'cilok' }],
  },
  {
    kind: 'do',
    title: 'Snatch it',
    text: "Press CILOK! to take Uncle's 9.",
    action: { type: 'cilok', stamp: false },
    highlight: [{ kind: 'gerai' }, { kind: 'button', id: 'cilok' }],
  },
  {
    kind: 'info',
    title: 'DUIT',
    text: "Uncle got +1 DUIT. Every coin is +1 point for him at the end of the round. The play passed back to Uncle as the Gerai owner, so he took what was left as Habuan. Your stolen 9 is in your hand now: it costs −1 if you're stuck with it.",
    highlight: [{ kind: 'coins', seat: 1 }],
  },
  {
    kind: 'ai',
    title: 'Uncle opens…',
    text: 'Uncle Ah Seng opens a new Gerai with three 5s.',
    action: { type: 'jual', cardIds: ['nasi-5', 'roti-5', 'kuih-5'] },
  },
  {
    kind: 'info',
    title: 'The CILOK & JUAL stamp',
    text: 'Once per round you can use your wooden stamp to CILOK and then JUAL in the same turn. Here is the plan: the 9 you stole earlier plus your own 9 makes a pair.',
    highlight: [{ kind: 'stamp', seat: 0 }, { kind: 'button', id: 'stamp' }],
  },
  {
    kind: 'do',
    title: 'Stamp it!',
    text: "Press CILOK & JUAL to snatch a 5 from Uncle's triple.",
    action: { type: 'cilok', stamp: true },
    highlight: [{ kind: 'stamp', seat: 0 }, { kind: 'button', id: 'stamp' }],
  },
  {
    kind: 'do',
    title: '…and JUAL',
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
    title: 'PUSING!',
    text: 'Four of a kind beats ANY Gerai and starts PUSING: for the rest of the round, LOWER numbers beat higher ones (another four of a kind flips it back). Tap all four 2s and JUAL.',
    action: { type: 'jual', cardIds: ['kopitiam-2', 'nasi-2', 'roti-2', 'kuih-2'] },
    highlight: [cards('kopitiam-2', 'nasi-2', 'roti-2', 'kuih-2'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle passes',
    text: 'Only another four of a kind could answer that.',
    action: { type: 'pass' },
  },
  {
    kind: 'do',
    title: 'Low is high',
    text: 'PUSING is on. Open with the single 5 you stole.',
    action: { type: 'jual', cardIds: ['kuih-5'] },
    highlight: [cards('kuih-5'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle answers…',
    text: 'Under PUSING, a 3 beats a 5!',
    action: { type: 'jual', cardIds: ['roti-3'] },
  },
  {
    kind: 'do',
    title: 'Go lower',
    text: "Your 1 beats Uncle's 3 while PUSING is on. JUAL the 1.",
    action: { type: 'jual', cardIds: ['kopitiam-1'] },
    highlight: [cards('kopitiam-1'), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle passes',
    text: 'Nothing lower than 1. LALU.',
    action: { type: 'pass' },
  },
  {
    kind: 'do',
    title: 'Clear your stall',
    text: 'Empty your hand to end the round. JUAL your last run: 6-7-8.',
    action: { type: 'jual', cardIds: ['nasi-6', 'kopitiam-7', 'roti-8'] },
    highlight: [cards('nasi-6', 'kopitiam-7', 'roti-8'), { kind: 'button', id: 'jual' }],
  },
]
