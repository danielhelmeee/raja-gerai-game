import { useEffect, useState } from 'react'
import { audio } from '../audio/AudioEngine'
import { PERSONAS } from '../game/personas'
import { cilokResult } from '../game/rules'
import { useGame, type ActionId } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { AudioToggles, click, Modal } from './common'

const TONE_STYLE: Record<string, string> = {
  jual: 'bg-[#00A859] text-white',
  cilok: 'bg-[#C8352B] text-white',
  pass: 'bg-[#FBF3DF] text-[#3B2416]',
  collect: 'bg-[#F4B42A] text-[#3B2416]',
  round: 'bg-[#3B2416] text-[#F4B42A]',
  info: 'bg-[#FBF3DF] text-[#3B2416]',
}

function TopBar() {
  const { state, setOverlay, tutorial } = useGame()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-[max(calc(var(--s)*3),6px)]">
      <div className="pointer-events-auto flex gap-2">
        <button className="px-btn btn-ghost !px-2" aria-label="Pause menu" onClick={() => (click(), setOverlay('pause'))}>
          ≡
        </button>
        <button className="px-btn btn-ghost !px-2.5" aria-label="How to play" onClick={() => (click(), setOverlay('howto'))}>
          ?
        </button>
      </div>
      <div className="px-dark font-pixel text-[max(calc(var(--s)*5),11px)] uppercase text-kunyit" style={{ padding: 'max(calc(var(--s)*2),5px) max(calc(var(--s)*4),9px)' }}>
        {tutorial.active ? 'Tutorial' : `Pusingan ${state.round}/${state.totalRounds}`}
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
    <div className="pointer-events-none fixed inset-x-0 top-[max(calc(var(--s)*17),40px)] z-20 flex flex-col items-center px-3">
      <button
        key={last.id}
        className={`wipe-in pointer-events-auto max-w-[min(94vw,700px)] border-[length:var(--u)] border-[#1A0F14] px-3 py-1 text-center font-body text-[max(calc(var(--s)*5),12px)] font-semibold shadow-[var(--u)_var(--u)_0_rgba(0,0,0,0.5)] ${TONE_STYLE[last.tone]}`}
        onClick={() => setShowLog((s) => !s)}
        title="Show recent plays"
      >
        {last.text}
      </button>
      {showLog && (
        <div className="px-panel pointer-events-auto mt-2 max-h-56 w-[min(94vw,480px)] overflow-y-auto p-3">
          {[...messages]
            .reverse()
            .slice(0, 14)
            .map((m) => (
              <div key={m.id} className="px-text border-b border-dashed border-kopi/20 py-1 last:border-0">
                {m.text}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function PlayerStats({ compact }: { compact?: boolean }) {
  const { state } = useGame()
  const me = state.players[0]
  if (!me) return null
  const active = state.status === 'playing' && state.turn === 0
  return (
    <div
      className={`px-panel flex items-center gap-2 font-pixel uppercase ${active ? '!border-[#00A859] !shadow-[0_0_0_var(--u)_#00A859,calc(var(--u)*2)_calc(var(--u)*2)_0_rgba(0,0,0,0.55)]' : ''}`}
      style={{ padding: 'max(calc(var(--s)*1.5),4px) max(calc(var(--s)*3),7px)', fontSize: 'max(calc(var(--s)*4.5),10px)' }}
    >
      <span className="inline-block h-[max(calc(var(--s)*3),6px)] w-[max(calc(var(--s)*3),6px)] bg-[#00A859]" />
      <span>You</span>
      <span title="Cards in hand">🂠{me.hand.length}</span>
      <span title="Duit coins">🪙{me.duit}</span>
      <span title="Habuan">🏆{me.habuan.length}</span>
      {!compact && <span className="text-kopi/60">Total {me.total}</span>}
      {active && <span className="blink bg-[#00A859] px-1 text-white">Your turn</span>}
    </div>
  )
}

function ActionBar() {
  const { state, can, jual, cilok, cilokMode, pass, selectionCheck, selected, highlights, tutorial } = useGame()
  const { settings, update } = useSettings()
  const me = state.players[0]
  if (!me || state.status !== 'playing') return null
  const myTurn = state.turn === 0
  const target = (id: ActionId) => highlights.some((h) => h.kind === 'button' && h.id === id)
  const current = state.players[state.turn]
  const ends = { low: cilokResult(state.gerai, 'low')?.card, high: cilokResult(state.gerai, 'high')?.card }

  let hint: string
  if (!myTurn) hint = `${current.name} is thinking…`
  else if (cilokMode) hint = `Tap an end of the Gerai: ← ${ends.low?.value ?? ''} or ${ends.high?.value ?? ''} →`
  else if (state.subPhase === 'afterCilok') hint = selected.length ? selectionCheck.reason : 'Stamped! Now JUAL something that beats the Gerai, or LALU.'
  else if (selected.length) hint = selectionCheck.reason
  else if (!state.gerai.cards.length) hint = 'Your Gerai to open: tap dishes, then JUAL any shape.'
  else hint = 'Beat the Gerai, CILOK an end dish, or LALU.'
  const hintTone = myTurn && selected.length && !cilokMode ? (selectionCheck.ok ? 'text-[#00A859]' : 'text-[#C8352B]') : 'text-kopi'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center justify-end gap-[max(calc(var(--s)*1.5),4px)] px-2 pb-[max(calc(var(--s)*2),5px)]"
      style={{ height: 'var(--action-h)' }}
    >
      <div className="flex w-full max-w-[min(100%,980px)] items-center justify-center gap-2">
        <div className="pointer-events-auto hidden [html[data-layout=landscape]_&]:block">
          <PlayerStats />
        </div>
        <div className={`px-panel pointer-events-auto px-text truncate !leading-tight ${hintTone}`} style={{ padding: 'max(calc(var(--s)*1),3px) max(calc(var(--s)*3),8px)' }}>
          {hint}
        </div>
        <button
          className="px-btn btn-ghost pointer-events-auto !px-2 !text-[max(calc(var(--s)*4),9px)] [html[data-layout=portrait]_&]:hidden"
          onClick={() => (click(), update({ sortMode: settings.sortMode === 'value' ? 'group' : 'value' }))}
          title="Change how your hand is sorted"
        >
          Sort: {settings.sortMode === 'value' ? '1-10' : 'Group'}
        </button>
      </div>
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-[max(calc(var(--s)*2),6px)]">
        <button className={`px-btn btn-jual ${target('jual') ? 'tut-target' : ''}`} disabled={!can.jual} onClick={jual}>
          Jual
        </button>
        <button
          className={`px-btn btn-cilok ${target('cilok') ? 'tut-target' : ''} ${cilokMode && !cilokMode.stamp ? 'armed' : ''}`}
          data-armed={!!cilokMode && !cilokMode.stamp}
          disabled={!can.cilok}
          onClick={() => cilok(false)}
          title="Snatch an end dish from a rival's Gerai"
        >
          {cilokMode && !cilokMode.stamp ? 'Cancel' : 'Cilok!'}
        </button>
        <button
          className={`px-btn btn-stamp ${target('stamp') ? 'tut-target' : ''} ${cilokMode?.stamp ? 'armed' : ''}`}
          data-armed={!!cilokMode?.stamp}
          disabled={!can.stamp}
          onClick={() => cilok(true)}
          title="Once per round: CILOK then JUAL in the same turn"
        >
          {cilokMode?.stamp ? 'Cancel' : me.stampUsed ? 'Stamp used' : 'Cilok & Jual'}
        </button>
        <button className={`px-btn btn-plain ${target('pass') ? 'tut-target' : ''}`} disabled={!can.pass} onClick={pass}>
          Lalu
        </button>
      </div>
      {!tutorial.active && (
        <div className="pointer-events-auto hidden [html[data-layout=portrait]_&]:block">
          <PlayerStats compact />
        </div>
      )}
    </div>
  )
}

function PauseMenu() {
  const { setOverlay, quitToMenu } = useGame()
  return (
    <Modal onClose={() => setOverlay('none')}>
      <h2 className="px-title text-center">Rehat Sekejap</h2>
      <p className="px-text mt-1 text-center text-kopi/70">The market waits for you.</p>
      <div className="mt-5 flex flex-col gap-3">
        <button className="px-btn btn-jual" onClick={() => (click(), setOverlay('none'))}>
          Resume
        </button>
        <button className="px-btn btn-plain" onClick={() => (click(), setOverlay('howto'))}>
          How to Play
        </button>
        <button className="px-btn btn-plain" onClick={() => (click(), setOverlay('settings'))}>
          Settings
        </button>
        <button className="px-btn btn-cilok" onClick={() => (click(), quitToMenu())}>
          Quit to Main Menu
        </button>
      </div>
    </Modal>
  )
}

/** Score digits tick up one step at a time, like an arcade tally. */
function Tally({ value, delay, className }: { value: number; delay: number; className?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let n = 0
    const step = value >= 0 ? 1 : -1
    let id = 0
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        if (n === value) return window.clearInterval(id)
        n += step
        setV(n)
        audio.play('select')
      }, 45)
    }, delay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(id)
    }
  }, [value, delay])
  return <span className={`tabular-nums ${className ?? ''}`}>{v}</span>
}

export function Settlement() {
  const { state, nextRound, quitToMenu, startGame, startTutorial } = useGame()
  if (state.status !== 'roundEnd' && state.status !== 'gameOver') return null
  const ranked = [...state.players].sort((a, b) => b.total - a.total)
  const roundWinner = state.players[state.lastWinner ?? 0]
  const cell = 'px-2 py-1.5 text-center font-pixel text-[max(calc(var(--s)*5),11px)]'

  if (state.status === 'gameOver') {
    const champ = ranked[0]
    return (
      <Modal wide>
        <p className="px-label text-center">Pasar dah tutup</p>
        <h2 className="px-title mt-1 text-center">{champ.isHuman ? 'You are' : `${champ.name} is`} Raja Pasar Malam!</h2>
        <ol className="mt-5 space-y-2">
          {ranked.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 border-[length:var(--u)] border-[#1A0F14] px-3 py-2 ${i === 0 ? 'bg-[#F4B42A]/40' : 'bg-kopi/5'}`}>
              <span className="font-pixel text-[max(calc(var(--s)*7),15px)] text-kopi/60">{i + 1}</span>
              <span className="inline-block h-3 w-3" style={{ background: PERSONAS[p.persona].accent }} />
              <span className="flex-1 font-pixel text-[max(calc(var(--s)*5.5),12px)] uppercase">{p.isHuman ? 'You' : p.name}</span>
              <span className="px-text text-kopi/60">{p.roundScores.map((r) => (r.score >= 0 ? `+${r.score}` : r.score)).join(' · ')}</span>
              <Tally value={p.total} delay={300 + i * 250} className="w-12 text-right font-pixel text-[max(calc(var(--s)*7),15px)]" />
            </li>
          ))}
        </ol>
        <div className="mt-6 flex gap-3">
          <button className="px-btn btn-plain flex-1" onClick={() => (click(), quitToMenu())}>
            Main Menu
          </button>
          <button
            className="px-btn btn-jual flex-[2]"
            onClick={() => (click(), startGame({ numPlayers: state.players.length, difficulty: state.difficulty, totalRounds: state.totalRounds }))}
          >
            Main Lagi!
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal wide>
      <p className="px-label text-center">{state.tutorial ? 'Tutorial complete' : `Pusingan ${state.round} selesai`}</p>
      <h2 className="px-title mt-1 text-center">{roundWinner.isHuman ? 'You cleared your stall!' : `${roundWinner.name} cleared the stall!`}</h2>
      <p className="mx-auto mt-3 w-fit border-[length:var(--u)] border-[#1A0F14] bg-kopi px-3 py-1 text-center font-pixel text-[max(calc(var(--s)*4.5),10px)] uppercase text-kertas">
        Score = <span className="text-[#3CE08A]">Habuan</span> + <span className="text-[#F4B42A]">Duit</span> − <span className="text-[#FF6A5A]">Hand</span>
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="px-label">
              <th className="px-2 py-1 text-left">Hawker</th>
              <th>Habuan</th>
              <th>Duit</th>
              <th>Hand</th>
              <th>Round</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p, i) => {
              const rs = p.roundScores[p.roundScores.length - 1]
              const d = 200 + i * 400
              return (
                <tr key={p.id} className={`border-t-[length:var(--u)] border-dashed border-kopi/25 ${p.id === state.lastWinner ? 'bg-[#00A859]/15' : ''}`}>
                  <td className="px-2 py-1.5 font-pixel text-[max(calc(var(--s)*5),11px)] uppercase">
                    <span className="mr-2 inline-block h-2.5 w-2.5" style={{ background: PERSONAS[p.persona].accent }} />
                    {p.isHuman ? 'You' : p.name}
                  </td>
                  <td className={`${cell} text-[#00A859]`}>
                    +<Tally value={rs.habuan} delay={d} />
                  </td>
                  <td className={`${cell} text-[#B8740E]`}>+{rs.duit}</td>
                  <td className={`${cell} text-[#C8352B]`}>−{rs.hand}</td>
                  <td className={cell}>{rs.score >= 0 ? `+${rs.score}` : rs.score}</td>
                  <td className={cell}>{p.total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {state.tutorial ? (
        <>
          <p className="px-text mt-4 text-center text-kopi/80">
            Every Habuan card and DUIT coin is +1, every dish stuck in your hand is −1. A full game runs several rounds and the highest total wins.
          </p>
          <div className="mt-5 flex gap-3">
            <button className="px-btn btn-plain flex-1" onClick={() => (click(), startTutorial())}>
              Replay
            </button>
            <button className="px-btn btn-jual flex-1" onClick={() => (click(), quitToMenu())}>
              Main Menu
            </button>
          </div>
        </>
      ) : (
        <button className="px-btn btn-jual mt-5 w-full" onClick={nextRound}>
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
    <div className="pointer-events-none fixed inset-x-0 top-[max(calc(var(--s)*16),40px)] z-30 flex justify-center px-2 [html[data-layout=landscape]_&]:right-auto [html[data-layout=landscape]_&]:left-[max(calc(var(--s)*3),6px)] [html[data-layout=landscape]_&]:w-[max(calc(var(--s)*150),300px)] [html[data-layout=landscape]_&]:px-0">
      <div key={index} className="px-panel pop-in pointer-events-auto w-full max-w-[460px] p-[max(calc(var(--s)*4),10px)]">
        <div className="flex items-center justify-between">
          <span className="px-label">
            Step {index + 1}/{total}
          </span>
          <button className="px-label underline" onClick={() => (click(), quitToMenu())}>
            Skip
          </button>
        </div>
        <div className="mt-1 flex gap-[2px]">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-[max(calc(var(--s)*1.5),4px)] flex-1 ${i <= index ? 'bg-[#00A859]' : 'bg-kopi/15'}`} />
          ))}
        </div>
        <h3 className="mt-2 font-pixel text-[max(calc(var(--s)*6),13px)] uppercase text-[#C8352B]">{step.title}</h3>
        <p className="px-text mt-1 text-kopi/90">{step.text}</p>
        <div className="mt-2 flex justify-end">
          {step.kind === 'info' && (
            <button className="px-btn btn-jual" onClick={tutorial.next}>
              Next ►
            </button>
          )}
          {step.kind === 'do' && <span className="blink font-pixel text-[max(calc(var(--s)*4.5),10px)] uppercase text-[#00A859]">► Your move</span>}
          {step.kind === 'ai' && <span className="blink font-pixel text-[max(calc(var(--s)*4.5),10px)] uppercase text-kopi/60">Watch Uncle…</span>}
        </div>
      </div>
    </div>
  )
}

export function GameHUD() {
  const { overlay, setOverlay, jual, cilok, cilokMode, cancelCilok, chooseEnd, pass, state, tutorial } = useGame()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cilokMode) {
          cancelCilok()
          audio.play('cancel')
        } else setOverlay(overlay === 'none' ? 'pause' : 'none')
        return
      }
      if (overlay !== 'none' || state.status !== 'playing') return
      if (cilokMode && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        chooseEnd(e.key === 'ArrowLeft' ? 'low' : 'high')
        return
      }
      if (tutorial.active && tutorial.step?.kind === 'info' && (e.key === 'Enter' || e.key === ' ')) {
        tutorial.next()
        return
      }
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
