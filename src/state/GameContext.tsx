import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { audio } from '../audio/AudioEngine'
import { decide } from '../game/ai'
import { describe, type Tone } from '../game/describe'
import { canCilok, canPass, gameReducer, initialState } from '../game/engine'
import { checkJual, type JualCheck } from '../game/rules'
import { TUTORIAL_STEPS, type Highlight, type TutAction, type TutorialStep } from '../game/tutorial'
import type { GameConfig, GameState } from '../game/types'
import { useSettings } from './settings'

export type Screen = 'menu' | 'setup' | 'game'
export type Overlay = 'none' | 'howto' | 'settings' | 'pause'
export type ActionId = 'jual' | 'cilok' | 'stamp' | 'pass'

export interface Message {
  id: number
  text: string
  tone: Tone
}

interface GameCtx {
  state: GameState
  screen: Screen
  setScreen: (s: Screen) => void
  overlay: Overlay
  setOverlay: (o: Overlay) => void
  selected: string[]
  toggleSelect: (id: string) => void
  clearSelection: () => void
  selectionCheck: JualCheck
  can: Record<ActionId, boolean>
  jual: () => void
  cilok: (stamp: boolean) => void
  pass: () => void
  startGame: (config: GameConfig) => void
  startTutorial: () => void
  nextRound: () => void
  quitToMenu: () => void
  tutorial: { active: boolean; index: number; step: TutorialStep | null; total: number; next: () => void }
  highlights: Highlight[]
  messages: Message[]
  cilokPreview: boolean
  setCilokPreview: (v: boolean) => void
}

const Ctx = createContext<GameCtx | null>(null)

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

function matchesTutorial(step: TutorialStep | null, action: TutAction): boolean {
  if (!step || step.kind !== 'do' || !step.action) return false
  const want = step.action
  if (want.type !== action.type) return false
  if (want.type === 'jual' && action.type === 'jual') return sameSet(want.cardIds, action.cardIds)
  if (want.type === 'cilok' && action.type === 'cilok') return want.stamp === action.stamp
  return true
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [screen, setScreen] = useState<Screen>('menu')
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [selected, setSelected] = useState<string[]>([])
  const [tutIndex, setTutIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [cilokPreview, setCilokPreview] = useState(false)
  const lastSeq = useRef(state.seq)
  const msgId = useRef(0)

  const human = state.players[0]
  const myTurn = state.status === 'playing' && state.turn === 0 && screen === 'game'
  const tutStep = state.tutorial && tutIndex < TUTORIAL_STEPS.length ? TUTORIAL_STEPS[tutIndex] : null

  // Drop selected cards that have left the hand.
  useEffect(() => {
    if (!human) return
    setSelected((sel) => sel.filter((id) => human.hand.some((c) => c.id === id)))
  }, [human])

  // Events → sound effects and telemetry banners.
  useEffect(() => {
    const fresh = state.events.filter((e) => e.seq > lastSeq.current)
    if (!fresh.length) return
    lastSeq.current = state.seq
    const add: Message[] = []
    for (const e of fresh) {
      switch (e.type) {
        case 'deal':
          for (let i = 0; i < 8; i++) audio.play('slide', 0.2 + i * 0.11)
          break
        case 'jual':
          audio.play('jual', 0.15)
          if (e.pusing !== null) audio.play('pusing', 0.45)
          break
        case 'cilok':
          audio.play('cilok')
          audio.play('coin', 0.6)
          break
        case 'pass':
          audio.play('pass')
          break
        case 'collect':
          audio.play('collect', 0.25)
          break
        case 'roundEnd':
          audio.play('gong', 0.5)
          break
        case 'gameOver':
          audio.play('bell')
          audio.play('gong', 0.3)
          break
      }
      const line = describe(e, state.players)
      if (line) add.push({ id: ++msgId.current, ...line })
      if (e.type === 'jual' && e.pusing !== null) {
        add.push({
          id: ++msgId.current,
          text: e.pusing ? 'PUSING! Lower numbers now beat higher ones' : 'PUSING flipped back: higher numbers win again',
          tone: 'pusing',
        })
      }
    }
    setMessages((m) => [...m, ...add].slice(-30))
  }, [state.seq, state.events, state.players])

  // AI hawkers take their turns.
  useEffect(() => {
    if (screen !== 'game' || state.status !== 'playing' || state.tutorial || overlay !== 'none') return
    const p = state.players[state.turn]
    if (!p || p.isHuman) return
    const last = state.events[state.events.length - 1]
    const extra = last?.type === 'deal' ? 1600 : last?.type === 'collect' ? 700 : 0
    const delay = 950 + Math.random() * 650 + extra + (state.subPhase === 'afterCilok' ? 300 : 0)
    const id = window.setTimeout(() => dispatch(decide(state, state.turn)), delay)
    return () => window.clearTimeout(id)
  }, [state, screen, overlay])

  // Tutorial: scripted Uncle moves.
  useEffect(() => {
    if (!state.tutorial || screen !== 'game' || !tutStep || tutStep.kind !== 'ai' || overlay !== 'none') return
    const a = tutStep.action!
    const id = window.setTimeout(() => {
      dispatch(
        a.type === 'jual'
          ? { type: 'JUAL', playerId: 1, cardIds: a.cardIds }
          : a.type === 'cilok'
            ? { type: 'CILOK', playerId: 1, stamp: a.stamp }
            : { type: 'PASS', playerId: 1 },
      )
      setTutIndex((i) => i + 1)
    }, 1500)
    return () => window.clearTimeout(id)
  }, [state.tutorial, screen, tutStep, overlay])

  const selectedCards = useMemo(
    () => (human ? human.hand.filter((c) => selected.includes(c.id)) : []),
    [human, selected],
  )
  const selectionCheck = useMemo(
    () => checkJual(selectedCards, state.gerai, state.pusing),
    [selectedCards, state.gerai, state.pusing],
  )

  const tutAllows = (id: ActionId) => {
    if (!state.tutorial) return true
    if (!tutStep || tutStep.kind !== 'do' || !tutStep.action) return false
    const a = tutStep.action
    return (id === 'jual' && a.type === 'jual') || (id === 'pass' && a.type === 'pass') || (id === 'cilok' && a.type === 'cilok' && !a.stamp) || (id === 'stamp' && a.type === 'cilok' && a.stamp)
  }

  const can: Record<ActionId, boolean> = {
    jual: myTurn && selectionCheck.ok && tutAllows('jual'),
    cilok: myTurn && canCilok(state, 0, false) && tutAllows('cilok'),
    stamp: myTurn && canCilok(state, 0, true) && tutAllows('stamp'),
    pass: myTurn && canPass(state, 0) && tutAllows('pass'),
  }

  const toggleSelect = useCallback(
    (id: string) => {
      if (state.tutorial) {
        const a = tutStep?.action
        if (!tutStep || tutStep.kind !== 'do' || a?.type !== 'jual' || !a.cardIds.includes(id)) {
          audio.play('error')
          return
        }
      }
      audio.play('select')
      setSelected((sel) => (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]))
    },
    [state.tutorial, tutStep],
  )

  const runHuman = (tut: TutAction, run: () => void) => {
    if (state.tutorial) {
      if (!matchesTutorial(tutStep, tut)) {
        audio.play('error')
        return
      }
      setTutIndex((i) => i + 1)
    }
    audio.play('ui')
    run()
  }

  const jual = () => {
    if (!can.jual) return audio.play('error')
    runHuman({ type: 'jual', cardIds: selected }, () => {
      dispatch({ type: 'JUAL', playerId: 0, cardIds: selected })
      setSelected([])
    })
  }

  const cilok = (stamp: boolean) => {
    if (!(stamp ? can.stamp : can.cilok)) return audio.play('error')
    runHuman({ type: 'cilok', stamp }, () => dispatch({ type: 'CILOK', playerId: 0, stamp }))
    setCilokPreview(false)
  }

  const pass = () => {
    if (!can.pass) return audio.play('error')
    runHuman({ type: 'pass' }, () => {
      dispatch({ type: 'PASS', playerId: 0 })
      setSelected([])
    })
  }

  const startGame = (config: GameConfig) => {
    setSelected([])
    setMessages([])
    setTutIndex(0)
    dispatch({ type: 'NEW_GAME', config })
    setScreen('game')
    setOverlay('none')
  }

  const highlights = useMemo<Highlight[]>(() => {
    if (!tutStep || tutStep.kind === 'ai') return []
    // Only light up the action's cards that are still unselected; then the button.
    return tutStep.highlight ?? []
  }, [tutStep])

  const value: GameCtx = {
    state,
    screen,
    setScreen,
    overlay,
    setOverlay,
    selected,
    toggleSelect,
    clearSelection: () => setSelected([]),
    selectionCheck,
    can,
    jual,
    cilok,
    pass,
    startGame,
    startTutorial: () => startGame({ numPlayers: 2, difficulty: settings.difficulty, totalRounds: 1, tutorial: true }),
    nextRound: () => {
      audio.play('ui')
      dispatch({ type: 'NEXT_ROUND' })
    },
    quitToMenu: () => {
      dispatch({ type: 'RESET' })
      setSelected([])
      setMessages([])
      setScreen('menu')
      setOverlay('none')
    },
    tutorial: {
      active: state.tutorial && screen === 'game',
      index: tutIndex,
      step: tutStep,
      total: TUTORIAL_STEPS.length,
      next: () => {
        if (tutStep?.kind === 'info') {
          audio.play('ui')
          setTutIndex((i) => i + 1)
        }
      },
    },
    highlights,
    messages,
    cilokPreview,
    setCilokPreview,
  }

  // Dev-only handle so automated browser checks can tap 3D cards by id.
  if (import.meta.env.DEV) {
    ;(window as unknown as { __cilok: unknown }).__cilok = {
      toggleSelect,
      state,
      tutIndex,
      autoplay: () => state.status === 'playing' && state.turn === 0 && dispatch(decide(state, 0)),
    }
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGame outside GameProvider')
  return ctx
}
