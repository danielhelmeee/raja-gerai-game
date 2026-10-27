import { useEffect, useState } from 'react'
import { PERSONAS } from '../game/personas'
import { cilokResult } from '../game/rules'
import { useGame, type ActionId } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { AudioToggles, click, Modal } from './common'

const TONE_STYLE: Record<string, string> = {
  jual: 'bg-hijau text-white',
  cilok: 'bg-sambal text-white',
  pass: 'bg-kertas text-kopi',
  collect: 'bg-kunyit text-kopi',
  pusing: 'bg-[#7A2335] text-kunyit',
  round: 'bg-kopi text-kunyit',
  info: 'bg-kertas text-kopi',
}

function TopBar() {
  const { state, setOverlay, tutorial } = useGame()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex gap-2">
        <button
          className="btn btn-ghost !px-3"
          aria-label="Pause menu"
          onClick={() => {
            click()
            setOverlay('pause')
          }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button
          className="btn btn-ghost !px-3.5 font-display"
          aria-label="How to play"
          onClick={() => {
            click()
            setOverlay('howto')
          }}
        >
          ?
        </button>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="rounded-full bg-kopi/80 px-4 py-1.5 font-display text-sm text-kunyit shadow-lg backdrop-blur">
          {tutorial.active ? 'TUTORIAL' : `PUSINGAN ${state.round}/${state.totalRounds}`}
        </div>
        {state.pusing && <div className="pusing-chip text-xs">PUSING: low beats high</div>}
      </div>
      <div className="pointer-events-auto">
        <AudioToggles />
      </div>
    </div>
  )
}

function Banner() {
  const { messages } = useGame()
  const [showLog, setShowLog] = useState(false)
  const last = messages[messages.length - 1]
  if (!last) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-20 flex flex-col items-center px-3 sm:top-[4.5rem]">
      <button
        key={last.id}
        className={`banner-in pointer-events-auto max-w-[min(92vw,640px)] rounded-2xl px-4 py-2 text-center text-[13px] font-bold shadow-xl sm:text-sm ${TONE_STYLE[last.tone]}`}
        onClick={() => setShowLog((s) => !s)}
        title="Show recent plays"
      >
        {last.text}
      </button>
      {showLog && (
        <div className="panel pointer-events-auto mt-2 max-h-56 w-[min(92vw,460px)] overflow-y-auto p-3 text-xs">
          {[...messages]
            .reverse()
            .slice(0, 14)
            .map((m) => (
              <div key={m.id} className="border-b border-kopi/10 py-1.5 last:border-0">
                {m.text}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function PlayerPanel() {
  const { state } = useGame()
  const me = state.players[0]
  if (!me) return null
  const active = state.status === 'playing' && state.turn === 0
  return (
    <div className={`telemetry !min-w-0 ${active ? 'telemetry-active' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-hijau" />
        <span className="font-retro text-[13px] font-extrabold text-kopi">You</span>
        {active && <span className="ml-1 rounded-full bg-hijau px-1.5 text-[10px] font-extrabold uppercase text-white">Your turn</span>}
      </div>
      <div className="mt-1 flex gap-2 text-[12px] font-semibold text-kopi/80">
        <span title="Cards in hand">🂠 {me.hand.length}</span>
        <span title="Duit coins">🪙 {me.duit}</span>
        <span title="Habuan">🏆 {me.habuan.length}</span>
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-kopi/60">Total {me.total}</div>
    </div>
  )
}

function ActionBar() {
  const { state, can, jual, cilok, pass, selectionCheck, selected, clearSelection, setCilokPreview, highlights, tutorial } = useGame()
  const { settings, update } = useSettings()
  const me = state.players[0]
  if (!me || state.status !== 'playing') return null
  const myTurn = state.turn === 0
  const target = (id: ActionId) => highlights.some((h) => h.kind === 'button' && h.id === id)
  const steal = cilokResult(state.gerai)
  const current = state.players[state.turn]

  let hint: string
  if (!myTurn) hint = `${current.name} is thinking…`
  else if (state.subPhase === 'afterCilok') hint = selected.length ? selectionCheck.reason : 'Stamp used! Now JUAL something that beats the Gerai, or LALU.'
  else if (selected.length) hint = selectionCheck.reason
  else if (!state.gerai.cards.length) hint = 'Your Gerai to open: tap dishes, then JUAL any shape.'
  else hint = 'Beat the Gerai, CILOK a dish, or LALU.'

  const hintTone = myTurn && selected.length ? (selectionCheck.ok ? 'text-hijau' : 'text-sambal') : 'text-kopi/75'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-3 sm:p-4">
      <div className="flex w-full max-w-4xl items-end justify-between gap-2">
        <div className="pointer-events-auto hidden sm:block">
          <PlayerPanel />
        </div>
        <div className={`pointer-events-auto rounded-full bg-kertas/95 px-4 py-1.5 text-center text-xs font-bold shadow-lg sm:text-sm ${hintTone}`}>{hint}</div>
        <div className="pointer-events-auto hidden gap-2 sm:flex">
          <button
            className="btn btn-ghost !px-3 !text-[11px]"
            onClick={() => {
              click()
              update({ sortMode: settings.sortMode === 'value' ? 'group' : 'value' })
            }}
            title="Change how your hand is sorted"
          >
            Sort: {settings.sortMode === 'value' ? 'Number' : 'Group'}
          </button>
          {selected.length > 0 && (
            <button className="btn btn-ghost !px-3 !text-[11px]" onClick={clearSelection}>
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button className={`btn btn-jual min-w-[96px] py-3 text-base ${target('jual') ? 'tut-target' : ''}`} disabled={!can.jual} onClick={jual}>
          JUAL
        </button>
        <button
          className={`btn btn-cilok min-w-[96px] py-3 text-base ${target('cilok') ? 'tut-target' : ''}`}
          disabled={!can.cilok}
          onClick={() => cilok(false)}
          onPointerEnter={() => setCilokPreview(true)}
          onPointerLeave={() => setCilokPreview(false)}
          title={steal ? `Snatch the ${steal.card.value} (${steal.card.dish})` : 'Needs a rival Gerai with 2+ dishes'}
        >
          CILOK!
        </button>
        <button
          className={`btn btn-stamp py-3 ${target('stamp') ? 'tut-target' : ''}`}
          disabled={!can.stamp}
          onClick={() => cilok(true)}
          onPointerEnter={() => setCilokPreview(true)}
          onPointerLeave={() => setCilokPreview(false)}
          title="Once per round: CILOK then JUAL in the same turn"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="4" y="14" width="16" height="5" rx="1" />
            <rect x="10" y="5" width="4" height="9" />
            <circle cx="12" cy="5" r="3" />
          </svg>
          {me.stampUsed ? 'Stamp used' : 'CILOK & JUAL'}
        </button>
        <button className={`btn btn-plain py-3 ${target('pass') ? 'tut-target' : ''}`} disabled={!can.pass} onClick={pass}>
          LALU
        </button>
      </div>
      {!tutorial.active && (
        <div className="pointer-events-auto sm:hidden">
          <PlayerPanel />
        </div>
      )}
    </div>
  )
}

function PauseMenu() {
  const { setOverlay, quitToMenu } = useGame()
  return (
    <Modal onClose={() => setOverlay('none')}>
      <h2 className="text-center font-display text-3xl text-sambal">Rehat Sekejap</h2>
      <p className="mt-1 text-center text-sm text-kopi/70">The market waits for you.</p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn btn-jual py-3" onClick={() => (click(), setOverlay('none'))}>
          Resume
        </button>
        <button className="btn btn-plain border-2 border-kopi/15" onClick={() => (click(), setOverlay('howto'))}>
          How to Play
        </button>
        <button className="btn btn-plain border-2 border-kopi/15" onClick={() => (click(), setOverlay('settings'))}>
          Settings
        </button>
        <button className="btn btn-cilok" onClick={() => (click(), quitToMenu())}>
          Quit to Main Menu
        </button>
      </div>
    </Modal>
  )
}

function useCountUp(target: number, delay: number) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now() + delay
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / 700, 0), 1)
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, delay])
  return v
}

function Num({ value, delay, className }: { value: number; delay: number; className?: string }) {
  const v = useCountUp(value, delay)
  return <span className={`count-up ${className ?? ''}`}>{v}</span>
}

export function Settlement() {
  const { state, nextRound, quitToMenu, startGame, startTutorial } = useGame()
  if (state.status !== 'roundEnd' && state.status !== 'gameOver') return null
  const over = state.status === 'gameOver'
  const ranked = [...state.players].sort((a, b) => b.total - a.total)
  const roundWinner = state.players[state.lastWinner ?? 0]

  if (over) {
    const champ = ranked[0]
    return (
      <Modal wide>
        <p className="text-center text-xs font-extrabold uppercase tracking-[0.3em] text-kopi/50">Pasar dah tutup</p>
        <h2 className="mt-1 text-center font-display text-4xl text-sambal">{champ.isHuman ? 'You are' : `${champ.name} is`} Raja Pasar Malam!</h2>
        <ol className="mt-6 space-y-2">
          {ranked.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${i === 0 ? 'bg-kunyit/30' : 'bg-kopi/5'}`}>
              <span className="font-display text-2xl text-kopi/60">{i + 1}</span>
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: PERSONAS[p.persona].accent }} />
              <span className="flex-1 font-retro text-lg font-extrabold">{p.isHuman ? 'You' : p.name}</span>
              <span className="text-xs text-kopi/60">{p.roundScores.map((r) => (r.score >= 0 ? `+${r.score}` : r.score)).join(' · ')}</span>
              <Num value={p.total} delay={200 + i * 150} className="w-12 text-right font-display text-2xl" />
            </li>
          ))}
        </ol>
        <div className="mt-7 flex gap-3">
          <button className="btn btn-plain flex-1 border-2 border-kopi/15" onClick={() => (click(), quitToMenu())}>
            Main Menu
          </button>
          <button
            className="btn btn-jual flex-[2] py-3"
            onClick={() => (click(), startGame({ numPlayers: state.players.length, difficulty: state.difficulty, totalRounds: state.totalRounds }))}
          >
            Main Lagi! (Play again)
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal wide>
      <p className="text-center text-xs font-extrabold uppercase tracking-[0.3em] text-kopi/50">
        {state.tutorial ? 'Tutorial complete' : `Pusingan ${state.round} selesai`}
      </p>
      <h2 className="mt-1 text-center font-display text-3xl text-sambal">{roundWinner.isHuman ? 'You cleared your stall!' : `${roundWinner.name} cleared the stall!`}</h2>
      <p className="mx-auto mt-3 w-fit rounded-full bg-kopi px-4 py-1.5 text-center text-sm font-bold text-kunyit">
        Score = <span className="text-hijau">Habuan</span> + <span className="text-kunyit">Duit</span> − <span className="text-sambal">Hand</span>
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-kopi/55">
              <th className="py-2 text-left">Hawker</th>
              <th>🏆 Habuan</th>
              <th>🪙 Duit</th>
              <th>🂠 Hand</th>
              <th>Round</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p, i) => {
              const rs = p.roundScores[p.roundScores.length - 1]
              const d = 150 + i * 180
              return (
                <tr key={p.id} className={`border-t border-kopi/10 ${p.id === state.lastWinner ? 'bg-hijau/10' : ''}`}>
                  <td className="py-2.5 font-retro font-extrabold">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: PERSONAS[p.persona].accent }} />
                    {p.isHuman ? 'You' : p.name}
                  </td>
                  <td className="text-center font-bold text-hijau">
                    +<Num value={rs.habuan} delay={d} />
                  </td>
                  <td className="text-center font-bold text-[#B8740E]">
                    +<Num value={rs.duit} delay={d + 100} />
                  </td>
                  <td className="text-center font-bold text-sambal">
                    −<Num value={rs.hand} delay={d + 200} />
                  </td>
                  <td className="text-center font-display text-lg">{rs.score >= 0 ? `+${rs.score}` : rs.score}</td>
                  <td className="text-center font-display text-lg">
                    <Num value={p.total} delay={d + 400} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {state.tutorial ? (
        <>
          <p className="mt-5 text-center text-sm text-kopi/80">
            Every Habuan card and DUIT coin is +1, every dish stuck in your hand is −1. In a full game you play several rounds and the highest total wins.
          </p>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-plain flex-1 border-2 border-kopi/15" onClick={() => (click(), startTutorial())}>
              Replay tutorial
            </button>
            <button className="btn btn-plain flex-1 border-2 border-kopi/15" onClick={() => (click(), quitToMenu())}>
              Main Menu
            </button>
          </div>
        </>
      ) : (
        <button className="btn btn-jual mt-6 w-full py-3.5 text-base" onClick={nextRound}>
          {state.round >= state.totalRounds ? 'Final Results' : 'Next Round'}
        </button>
      )}
    </Modal>
  )
}

export function TutorialPanel() {
  const { tutorial, quitToMenu, state } = useGame()
  if (!tutorial.active || !tutorial.step || state.status !== 'playing') return null
  const { step, index, total } = tutorial
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[7.4rem] z-30 flex justify-center px-3 sm:left-auto sm:right-4 sm:top-20 sm:w-[380px] sm:px-0">
      <div key={index} className="panel banner-in pointer-events-auto w-full max-w-md p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-kopi/50">
            Step {index + 1} / {total}
          </span>
          <button className="text-[11px] font-bold uppercase text-kopi/50 underline" onClick={() => (click(), quitToMenu())}>
            Skip tutorial
          </button>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-kopi/10">
          <div className="h-full rounded-full bg-hijau transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <h3 className="mt-3 font-display text-xl text-sambal">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-kopi/90">{step.text}</p>
        <div className="mt-3 flex justify-end">
          {step.kind === 'info' && (
            <button className="btn btn-jual" onClick={tutorial.next}>
              Next →
            </button>
          )}
          {step.kind === 'do' && <span className="rounded-full bg-hijau/15 px-3 py-1 text-xs font-extrabold uppercase text-hijau">Your move</span>}
          {step.kind === 'ai' && <span className="animate-pulse rounded-full bg-kopi/10 px-3 py-1 text-xs font-extrabold uppercase text-kopi/60">Watch Uncle…</span>}
        </div>
      </div>
    </div>
  )
}

export function GameHUD() {
  const { overlay, setOverlay, jual, cilok, pass, state, tutorial } = useGame()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverlay(overlay === 'none' ? 'pause' : 'none')
        return
      }
      if (overlay !== 'none' || state.status !== 'playing') return
      const k = e.key.toLowerCase()
      if (k === 'j') jual()
      else if (k === 'c') cilok(false)
      else if (k === 's') cilok(true)
      else if (k === 'l' || k === 'p') pass()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <TopBar />
      {!tutorial.active && <Banner />}
      <TutorialPanel />
      <ActionBar />
      <Settlement />
      {overlay === 'pause' && <PauseMenu />}
    </>
  )
}
