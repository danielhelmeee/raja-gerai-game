/**
 * Scripted one-round lesson at a full four-hawker table with fixed hands, so
 * every step happens exactly as described. Ids are `${group}-${rank}`.
 */
const k = (r: number) => `karipap-${r}`
const n = (r: number) => `tehtarik-${r}`
const r = (rank: number) => `ramly-${rank}`
const b = (rank: number) => `nasilemak-${rank}`

// Your hand: the Karipap 3, a pair of 9s, a Barisan 10-J-Q-K-A and a Kenduri (6s full of 3s).
const YOU = [k(3), n(9), r(9), n(10), k(11), k(12), k(13), k(14), k(6), n(6), r(6), n(3), r(3)]
const UNCLE = [r(8), n(12), r(12), k(4), n(5), b(6), k(7), n(8), n(4), r(4), n(7), r(7), k(8)]
const LINA = [r(11), b(3), b(4), b(5), b(7), b(9), k(9), k(10), r(10), b(10), n(11), b(11), b(12)]
const MAT = [r(15), k(5), r(5), b(8), n(13), r(13), b(13), n(14), r(14), b(14), k(15), n(15), b(15)]

export const TUTORIAL_HANDS: string[][] = [YOU, UNCLE, LINA, MAT]

export type TutAction = { type: 'jual'; cardIds: string[] | 'rest' } | { type: 'pass' }

export type Highlight =
  | { kind: 'cards'; ids: string[] }
  | { kind: 'hand' }
  | { kind: 'gerai' }
  | { kind: 'discard' }
  | { kind: 'button'; id: 'jual' | 'pass' }
  | { kind: 'telemetry' }

export interface TutorialStep {
  kind: 'info' | 'do' | 'ai'
  title: string
  text: string
  /** For 'do' steps: what you must do. */
  action?: TutAction
  /** For 'ai' steps: the hawkers' moves, in turn order. */
  moves?: { player: number; action: TutAction }[]
  highlight?: Highlight[]
}

const cards = (...ids: string[]): Highlight => ({ kind: 'cards', ids })
const jual = (player: number, ...cardIds: string[]) => ({ player, action: { type: 'jual' as const, cardIds } })
const pass = (player: number) => ({ player, action: { type: 'pass' as const } })

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    kind: 'info',
    title: 'Selamat datang!',
    text: 'This is Dai Di at the pasar malam. Four hawkers, 13 cards each. Be the first to sell every card. Whoever is left holding cards pays you DUIT.',
    highlight: [{ kind: 'telemetry' }],
  },
  {
    kind: 'info',
    title: 'Card order',
    text: '3 is the lowest card, then 4 up to 10, J, Q, K, A, and 2 is the highest. On equal numbers the suit decides, like a normal deck: Karipap ♦ < Teh Tarik ♣ < Ramly Burger ♥ < Nasi Lemak ♠.',
    highlight: [{ kind: 'hand' }],
  },
  {
    kind: 'info',
    title: 'The Karipap 3♦ opens',
    text: 'Whoever holds the Karipap 3♦ (the 3 of diamonds) starts, and the first play must include it. That is you!',
    highlight: [cards(k(3))],
  },
  {
    kind: 'do',
    title: 'Open the Gerai',
    text: 'Tap the Karipap 3♦, then press JUAL to put it on the Gerai mat.',
    action: { type: 'jual', cardIds: [k(3)] },
    highlight: [cards(k(3)), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Round the table...',
    text: 'Each hawker must beat the last play with the same number of cards: Uncle plays an 8, Kak Lina a J, Abang Mat a 2!',
    moves: [jual(1, r(8)), jual(2, r(11)), jual(3, r(15))],
    highlight: [{ kind: 'gerai' }],
  },
  {
    kind: 'do',
    title: 'Say LALU',
    text: 'Only a higher 2 beats a Ramly Burger 2♥, and you have none. Press LALU to pass. You can still play later.',
    action: { type: 'pass' },
    highlight: [{ kind: 'button', id: 'pass' }],
  },
  {
    kind: 'ai',
    title: 'Abang Mat wins the Gerai',
    text: 'Everyone passed, so play returns to Abang Mat. The Gerai is cleared to the side and he opens again with anything he likes: a pair of 5s.',
    moves: [pass(1), pass(2), jual(3, k(5), r(5))],
    highlight: [{ kind: 'discard' }],
  },
  {
    kind: 'do',
    title: 'Beat the pair',
    text: 'A pair is beaten only by a higher pair. Tap your two 9s and JUAL.',
    action: { type: 'jual', cardIds: [n(9), r(9)] },
    highlight: [cards(n(9), r(9)), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Uncle answers',
    text: 'Uncle beats you with a pair of Qs. Kak Lina and Abang Mat pass.',
    moves: [jual(1, n(12), r(12)), pass(2), pass(3)],
  },
  {
    kind: 'do',
    title: 'Keep your big hands',
    text: 'You could break up your 6s to answer, but they belong to a Kenduri. Save it: press LALU.',
    action: { type: 'pass' },
    highlight: [{ kind: 'button', id: 'pass' }, cards(k(6), n(6), r(6), n(3), r(3))],
  },
  {
    kind: 'ai',
    title: 'Uncle leads five',
    text: 'Uncle won the Gerai and opens with a Barisan (straight) 4-5-6-7-8. Kak Lina and Abang Mat pass.',
    moves: [jual(1, k(4), n(5), b(6), k(7), n(8)), pass(2), pass(3)],
  },
  {
    kind: 'info',
    title: 'Five-card hands',
    text: 'Five-card hands only beat other five-card hands. From weakest: BARISAN (straight), TAPAU (5 of one suit), KENDURI (full house), BORONG (four of a kind + 1), TAPAU BARISAN (straight flush). 10-J-Q-K-A of one suit is the HIDANGAN DIRAJA.',
    highlight: [{ kind: 'gerai' }],
  },
  {
    kind: 'do',
    title: 'A higher Barisan',
    text: 'Your 10-J-Q-K-A is a higher Barisan than his 4 to 8. Tap all five and JUAL.',
    action: { type: 'jual', cardIds: [n(10), k(11), k(12), k(13), k(14)] },
    highlight: [cards(n(10), k(11), k(12), k(13), k(14)), { kind: 'button', id: 'jual' }],
  },
  {
    kind: 'ai',
    title: 'Tapau!',
    text: 'Uncle passes, then Kak Lina plays a TAPAU: five Nasi Lemak ♠. Any Tapau beats any Barisan.',
    moves: [pass(1), jual(2, b(3), b(4), b(5), b(7), b(9)), pass(3)],
  },
  {
    kind: 'do',
    title: 'Kenduri to finish',
    text: 'A KENDURI beats a Tapau, and it is your last five cards. Tap them all and JUAL to empty your hand and win the round!',
    action: { type: 'jual', cardIds: 'rest' },
    highlight: [{ kind: 'hand' }, { kind: 'button', id: 'jual' }],
  },
]
