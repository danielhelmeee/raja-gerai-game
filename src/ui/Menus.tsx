import { useEffect, useState } from 'react'
import { audio } from '../audio/AudioEngine'
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
        <h1 className="neon-title mt-2 text-center sm:text-left">
          RAJA
          <br />
          GERAI
        </h1>
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
        ↑ ↓ + Enter or click · Dai Di vs 3 hawkers
      </p>
    </div>
  )
}

export function SetupScreen() {
  const { setScreen, startGame } = useGame()
  const { settings, update } = useSettings()
  return (
    <Modal onClose={() => setScreen('menu')}>
      <h2 className="px-title">Buka Gerai</h2>
      <p className="px-text mt-1 text-kopi/70">You vs Uncle Ah Seng, Kak Lina and Abang Mat. 13 cards each.</p>
      <div className="mt-4 space-y-4">
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
              ? 'Easy: the hawkers play loosely and waste their big cards.'
              : settings.difficulty === 'standard'
                ? 'Standard: sensible Dai Di with the odd surprise.'
                : 'Hard: they plan their hands, hold their 2s and block your last card.'}
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
            startGame({ difficulty: settings.difficulty, totalRounds: settings.totalRounds })
          }}
        >
          Buka Gerai!
        </button>
      </div>
    </Modal>
  )
}

const RULES: { term: string; color: string; body: string }[] = [
  { term: 'Goal', color: '#3B2416', body: 'Be the first of the four hawkers to sell all 13 of your cards. Everyone still holding cards pays you DUIT.' },
  { term: 'Card order', color: '#3B2416', body: '3 is lowest, then 4–10, J, Q, K, A, and 2 is highest. On equal numbers the food group decides: Kopitiam < Nasi < Roti < Kuih.' },
  { term: 'Opening', color: '#3B2416', body: 'In the first round, whoever holds the Kopitiam 3 starts and must include it in their first play. In later rounds, the last winner leads.' },
  { term: 'Jual', color: '#00A859', body: 'Play onto the Gerai mat a single, pair, three of a kind, or a 5-card hand that beats what is there: same number of cards, higher value.' },
  { term: '5-card hands', color: '#7A2335', body: 'Weakest to strongest: BARISAN (straight; 2s can\'t be in one), SET MENU (5 of one food group), KENDURI (full house), BORONG (four of a kind + 1), HIDANGAN DIRAJA (straight flush). A higher type always wins; the same type compares the top card or the main number.' },
  { term: 'Lalu', color: '#3B2416', body: 'Pass. You can still play later in the same Gerai. When everyone else passes, the last hawker to play wins the Gerai: it\'s cleared and they lead anything.' },
  { term: 'Last card', color: '#C8352B', body: 'A hawker with one card left is flagged LAST CARD!: time to block with your strongest singles.' },
  { term: 'Duit', color: '#B8740E', body: 'When someone empties their hand, every other hawker pays them 1 DUIT per card left. 10 or more cards pays double; never played at all (13 cards) pays triple.' },
  { term: 'Raja Gerai', color: '#3B2416', body: 'After the last round, the hawker with the most DUIT is crowned Raja Gerai.' },
]

export function HowToPlay() {
  const { setOverlay, startTutorial, screen } = useGame()
  const back = () => setOverlay(screen === 'game' ? 'pause' : 'none')
  return (
    <Modal wide onClose={back}>
      <h2 className="px-title">How to Play</h2>
      <p className="px-text mt-1 text-kopi/70">Classic Dai Di (Big Two), served at a 1980s pasar malam.</p>
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
        Keys: <b>J</b> Jual · <b>L</b> Lalu · <b>X</b> clear selection · <b>Esc</b> pause
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
