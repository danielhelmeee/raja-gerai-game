import { useEffect, useState } from 'react'
import { audio } from '../audio/AudioEngine'
import { OPPONENT_ORDER, PERSONAS } from '../game/personas'
import type { Difficulty } from '../game/types'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { AudioToggles, click, Modal, Toggle } from './common'

export function MainMenu() {
  const { setScreen, startTutorial, setOverlay, overlay } = useGame()
  const [active, setActive] = useState(0)
  const items: [string, () => void][] = [
    ['Start Game', () => setScreen('setup')],
    ['Tutorial', startTutorial],
    ['How to Play', () => setOverlay('howto')],
    ['Settings', () => setOverlay('settings')],
  ]
  const choose = (i: number) => {
    audio.unlock()
    click()
    items[i][1]()
  }

  // Classic menu cursor: arrow keys to move, Enter to choose.
  useEffect(() => {
    if (overlay !== 'none') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        audio.unlock()
        audio.play('select')
        setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        choose(active)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between p-4 sm:items-start sm:p-[calc(var(--s)*12)]">
      <div className="pointer-events-auto self-end">
        <AudioToggles />
      </div>
      <div className="pointer-events-auto flex flex-col items-center sm:items-start">
        <p className="font-pixel text-[max(calc(var(--s)*5),11px)] uppercase tracking-[0.3em] text-kunyit [text-shadow:var(--u)_var(--u)_0_#1a0f14]">
          Pasar Malam Showdown
        </p>
        <h1 className="neon-title mt-2">CILOK!</h1>
        <nav className="mt-[max(calc(var(--s)*10),20px)] flex flex-col" aria-label="Main menu">
          {items.map(([label], i) => (
            <button key={label} className="menu-item" data-active={active === i} onPointerEnter={() => setActive(i)} onClick={() => choose(i)}>
              <span className="cursor">►</span>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <p className="blink pointer-events-auto font-pixel text-[max(calc(var(--s)*4.5),10px)] uppercase text-kertas/70">
        ↑ ↓ + Enter or click · 1 player vs up to 3 hawkers
      </p>
    </div>
  )
}

export function SetupScreen() {
  const { setScreen, startGame } = useGame()
  const { settings, update } = useSettings()
  const opponents = OPPONENT_ORDER.slice(0, settings.numPlayers - 1).map((id) => PERSONAS[id])
  return (
    <Modal onClose={() => setScreen('menu')}>
      <h2 className="px-title">Buka Gerai</h2>
      <p className="px-text mt-1 text-kopi/70">Set up tonight's market.</p>
      <div className="mt-4 space-y-4">
        <section>
          <h3 className="px-label mb-2">Hawkers at the table</h3>
          <Toggle
            label="Number of players"
            value={settings.numPlayers}
            onChange={(n) => update({ numPlayers: n })}
            options={[
              { value: 2, label: '2 players' },
              { value: 3, label: '3 players' },
              { value: 4, label: '4 players' },
            ]}
          />
          <p className="px-text mt-2 text-kopi/80">
            You vs <b>{opponents.map((o) => o.name).join(', ')}</b>
          </p>
        </section>
        <section>
          <h3 className="px-label mb-2">Difficulty</h3>
          <Toggle<Difficulty>
            label="Difficulty"
            value={settings.difficulty}
            onChange={(d) => update({ difficulty: d })}
            options={[
              { value: 'easy', label: 'Santai' },
              { value: 'standard', label: 'Biasa' },
              { value: 'hard', label: 'Otai' },
            ]}
          />
          <p className="px-text mt-2 text-kopi/60">
            {settings.difficulty === 'easy'
              ? 'Easy: the hawkers play loosely and rarely cilok.'
              : settings.difficulty === 'standard'
                ? 'Standard: sensible play with the odd surprise.'
                : 'Hard: sharp hawkers who pick the right end to steal.'}
          </p>
        </section>
        <section>
          <h3 className="px-label mb-2">Rounds</h3>
          <Toggle
            label="Rounds"
            value={settings.totalRounds}
            onChange={(r) => update({ totalRounds: r })}
            options={[
              { value: 1, label: '1 round' },
              { value: 3, label: '3 rounds' },
              { value: 5, label: '5 rounds' },
            ]}
          />
        </section>
      </div>
      <div className="mt-6 flex gap-3">
        <button className="px-btn btn-plain flex-1" onClick={() => (click(), setScreen('menu'))}>
          Back
        </button>
        <button
          className="px-btn btn-jual flex-[2]"
          onClick={() => {
            audio.unlock()
            click()
            startGame({ numPlayers: settings.numPlayers, difficulty: settings.difficulty, totalRounds: settings.totalRounds })
          }}
        >
          Buka Gerai!
        </button>
      </div>
    </Modal>
  )
}

const RULES: { term: string; color: string; body: string }[] = [
  { term: 'Goal', color: '#3B2416', body: 'Sell every dish in your hand before the other hawkers. Each round scores HABUAN + DUIT − dishes left in your hand.' },
  { term: 'Dishes', color: '#3B2416', body: '40 cards: numbers 1–10 in four food groups (Kopitiam, Nasi, Roti, Kuih). Only the number matters. Your hand is sorted for you.' },
  { term: 'Gerai', color: '#3B2416', body: 'The dishes on sale in the middle of the table. Whoever played last owns it.' },
  { term: 'Jual', color: '#00A859', body: 'Play dishes that beat the Gerai: same shape, higher number. Shapes: single, pair, triple, four of a kind, or a run of 3+ numbers in a row (a run of 3 only beats a run of 3, and so on). On an empty Gerai, open with any shape.' },
  { term: 'Lalu', color: '#3B2416', body: 'Pass. You can still play later in the same Gerai.' },
  { term: 'Habuan', color: '#00A859', body: 'When play comes back round to the Gerai owner unbeaten, they collect every dish played on that Gerai (+1 point each) and open the next one.' },
  { term: 'Cilok!', color: '#C8352B', body: "Instead of playing, snatch the dish at EITHER END of another hawker's Gerai (it needs 2+ dishes) into your hand. Press CILOK!, then tap the left or right dish. Taking the top of a run leaves it weaker; taking the bottom leaves it stronger for the next hawker. Your turn then ends." },
  { term: 'Duit', color: '#B8740E', body: 'Whoever you CILOK from gets a DUIT coin as compensation: +1 point at the end of the round.' },
  { term: 'Cilok & Jual', color: '#B8740E', body: 'Once per round, stamp your wooden stamp to CILOK and then JUAL in the same turn: steal a dish, then sell straight away.' },
  { term: 'Round end', color: '#3B2416', body: 'The round ends the moment someone empties their hand (they also take the Gerai). The winner opens the next round. The highest total after the last round is Raja Pasar Malam!' },
]

export function HowToPlay() {
  const { setOverlay, startTutorial, screen } = useGame()
  const back = () => setOverlay(screen === 'game' ? 'pause' : 'none')
  return (
    <Modal wide onClose={back}>
      <h2 className="px-title">How to Play</h2>
      <p className="px-text mt-1 text-kopi/70">A climbing card game in the Big Two tradition, at a 1980s pasar malam.</p>
      <dl className="mt-4 space-y-3">
        {RULES.map((r) => (
          <div key={r.term} className="grid grid-cols-[minmax(84px,26%)_1fr] gap-3">
            <dt className="font-pixel text-[max(calc(var(--s)*5),11px)] uppercase leading-6" style={{ color: r.color }}>
              {r.term}
            </dt>
            <dd className="px-text text-kopi/90">{r.body}</dd>
          </div>
        ))}
      </dl>
      <div className="px-text mt-5 border-[length:var(--u)] border-dashed border-kopi/30 p-3 text-kopi/70">
        Keys: <b>J</b> Jual · <b>C</b> Cilok · <b>S</b> Cilok &amp; Jual · <b>← →</b> pick an end · <b>L</b> Lalu · <b>Esc</b> cancel / pause
      </div>
      <div className="mt-5 flex gap-3">
        {screen !== 'game' && (
          <button
            className="px-btn btn-stamp flex-1"
            onClick={() => {
              audio.unlock()
              click()
              startTutorial()
            }}
          >
            Try the tutorial
          </button>
        )}
        <button className="px-btn btn-jual flex-1" onClick={() => (click(), back())}>
          Faham!
        </button>
      </div>
    </Modal>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[110px_1fr] items-center gap-3">
      <span className="px-label !text-kopi">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function SettingsPanel() {
  const { setOverlay, screen } = useGame()
  const { settings, update } = useSettings()
  const back = () => setOverlay(screen === 'game' ? 'pause' : 'none')
  return (
    <Modal onClose={back}>
      <h2 className="px-title">Settings</h2>
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="px-label">Audio</span>
          <AudioToggles light />
        </div>
        <Slider label="Master" value={settings.master} onChange={(v) => update({ master: v })} />
        <Slider label="Music" value={settings.music} onChange={(v) => update({ music: v })} />
        <Slider label="Effects" value={settings.sfx} onChange={(v) => update({ sfx: v })} />
        <Slider label="Ambience" value={settings.ambience} onChange={(v) => update({ ambience: v })} />
        <div className="border-t-[length:var(--u)] border-dashed border-kopi/20 pt-4">
          <span className="px-label">Display</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] items-center gap-3">
          <span className="px-label !text-kopi">Scanlines</span>
          <Toggle
            label="CRT scanlines"
            value={settings.scanlines ? 'on' : 'off'}
            onChange={(v) => update({ scanlines: v === 'on' })}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </div>
        <div className="grid grid-cols-[110px_1fr] items-center gap-3">
          <span className="px-label !text-kopi">Sort hand</span>
          <Toggle
            label="Sort hand by"
            value={settings.sortMode}
            onChange={(v) => update({ sortMode: v })}
            options={[
              { value: 'value', label: 'Number' },
              { value: 'group', label: 'Group' },
            ]}
          />
        </div>
      </div>
      <button className="px-btn btn-jual mt-6 w-full" onClick={() => (click(), back())}>
        Done
      </button>
    </Modal>
  )
}
