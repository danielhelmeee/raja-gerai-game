import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { audio } from '../audio/AudioEngine'
import { decide } from '../game/ai'
import { describe, type Tone } from '../game/describe'
import { canPass, gameReducer, initialState } from '../game/engine'
import { checkJual, type JualCheck } from '../game/rules'
import { TUTORIAL_STEPS, type Highlight, type TutAction, type TutorialStep } from '../game/tutorial'
import type { GameAction, GameConfig, GameState } from '../game/types'
import { useSettings } from './settings'

export type Screen = 'menu' | 'setup' | 'game'
export type Overlay = 'none' | 'howto' | 'settings' | 'pause'
export type ActionId = 'jual' | 'pass'

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
  pass: () => void
  startGame: (config: GameConfig) => void
  startTutorial: () => void
  nextRound: () => void
  quitToMenu: () => void
  tutorial: { active: boolean; index: number; step: TutorialStep | null; total: number; next: () => void }
  highlights: Highlight[]
  messages: Message[]
}

const Ctx = createContext<GameCtx | null>(null)

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

export function GameProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [screen, setScreen] = useState<Screen>('menu')
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [selected, setSelected] = useState<string[]>([])
  const [tutIndex, setTutIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
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
      const line = describe(e, state.players)
      if (line) add.push({ id: ++msgId.current, ...line })
      switch (e.type) {
        case 'deal':
          audio.play('deal')
          if (state.players[e.starter]?.isHuman) audio.play('turn', 2.2)
          break
        case 'jual':
          if (e.shape.five === 'diraja') audio.play('royal', 0.1)
          else if (e.shape.kind === 'five') audio.play('combo', 0.1)
          else audio.play('jual', 0.1)
          if (state.players[e.actor]?.hand.length === 1) {
            audio.play('alert', 0.5)
            add.push({ id: ++msgId.current, text: `${state.players[e.actor].isHuman ? 'You have' : `${state.players[e.actor].name} has`} ONE card left!`, tone: 'alert' })
          }
          break
        case 'pass':
          audio.play('pass')
          break
        case 'clear':
          audio.play('clear', 0.2)
          break
        case 'roundEnd':
          audio.play('gong', 0.3)
          e.payouts.forEach((_, i) => audio.play('coin', 0.9 + i * 0.25))
          break
        case 'gameOver':
          audio.play('fanfare')
          break
      }
    }
    setMessages((m) => [...m, ...add].slice(-30))
  }, [state.seq, state.events, state.players])

  // A soft chime when the turn comes back to you.
  const prevTurn = useRef(state.turn)
  useEffect(() => {
    if (state.status === 'playing' && state.turn === 0 && prevTurn.current !== 0) audio.play('turn', 0.3)
    prevTurn.current = state.turn
  }, [state.turn, state.status])

  // AI hawkers take their turns.
  useEffect(() => {
    if (screen !== 'game' || state.status !== 'playing' || state.tutorial || overlay !== 'none') return
    const p = state.players[state.turn]
    if (!p || p.isHuman) return
    const last = state.events[state.events.length - 1]
    const extra = last?.type === 'deal' ? 2600 : last?.type === 'clear' ? 700 : 0
    const delay = 850 + Math.random() * 600 + extra
    const id = window.setTimeout(() => dispatch(decide(state, state.turn)), delay)
    return () => window.clearTimeout(id)
  }, [state, screen, overlay])

  // Tutorial: the hawkers' scripted moves, one after another.
  useEffect(() => {
    if (!state.tutorial || screen !== 'game' || !tutStep || tutStep.kind !== 'ai' || overlay !== 'none') return
    const timers = tutStep.moves!.map((m, i) =>
      window.setTimeout(
        () => {
          const a: GameAction =
            m.action.type === 'pass'
              ? { type: 'PASS', playerId: m.player }
              : { type: 'JUAL', playerId: m.player, cardIds: m.action.cardIds === 'rest' ? [] : m.action.cardIds }
          dispatch(a)
          if (i === tutStep.moves!.length - 1) setTutIndex((t) => t + 1)
        },
        900 + i * 1250,
      ),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
    // Only re-run when the step changes; dispatches inside would otherwise restart the timers.
  }, [tutStep, screen, overlay])

  const selectedCards = useMemo(() => (human ? human.hand.filter((c) => selected.includes(c.id)) : []), [human, selected])
  const selectionCheck = useMemo(() => checkJual(selectedCards, state.gerai, state.opening), [selectedCards, state.gerai, state.opening])

  const tutAllows = (id: ActionId) => {
    if (!state.tutorial) return true
    if (!tutStep || tutStep.kind !== 'do' || !tutStep.action) return false
    return tutStep.action.type === id
  }

  const matchesTutorial = (action: TutAction): boolean => {
    if (!tutStep || tutStep.kind !== 'do' || !tutStep.action) return false
    const want = tutStep.action
    if (want.type !== action.type) return false
    if (want.type === 'jual' && action.type === 'jual') {
      const ids = want.cardIds === 'rest' ? human.hand.map((c) => c.id) : want.cardIds
      return sameSet(ids, action.cardIds as string[])
    }
    return true
  }

  const can: Record<ActionId, boolean> = {
    jual: myTurn && selectionCheck.ok && tutAllows('jual'),
    pass: myTurn && canPass(state, 0) && tutAllows('pass'),
  }

  const toggleSelect = useCallback(
    (id: string) => {
      if (state.tutorial) {
        const a = tutStep?.action
        const allowed = a?.type === 'jual' && (a.cardIds === 'rest' || a.cardIds.includes(id))
        if (!tutStep || tutStep.kind !== 'do' || !allowed) {
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
      if (!matchesTutorial(tut)) {
        audio.play('error')
        return
      }
      setTutIndex((i) => i + 1)
    }
    run()
  }

  const jual = () => {
    if (!can.jual) return audio.play('error')
    runHuman({ type: 'jual', cardIds: selected }, () => {
      dispatch({ type: 'JUAL', playerId: 0, cardIds: selected })
      setSelected([])
    })
  }

  const pass = () => {
    if (!can.pass) return audio.play('error')
    runHuman({ type: 'pass' }, () => {
      audio.play('ui')
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

  const highlights = useMemo<Highlight[]>(() => tutStep?.highlight ?? [], [tutStep])

  // Dev-only handle so automated browser checks can drive the game.
  if (import.meta.env.DEV) {
    ;(window as unknown as { __raja: unknown }).__raja = {
      toggleSelect,
      state,
      tutIndex,
      autoplay: () => state.status === 'playing' && state.turn === 0 && dispatch(decide(state, 0)),
    }
  }

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
    pass,
    startGame,
    startTutorial: () => startGame({ difficulty: settings.difficulty, totalRounds: 1, tutorial: true }),
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
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGame outside GameProvider')
  return ctx
}
