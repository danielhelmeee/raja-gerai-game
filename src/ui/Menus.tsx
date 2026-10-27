import { audio } from '../audio/AudioEngine'
import { OPPONENT_ORDER, PERSONAS } from '../game/personas'
import type { Difficulty } from '../game/types'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { AudioToggles, click, Modal, Toggle } from './common'

export function MainMenu() {
  const { setScreen, startTutorial, setOverlay } = useGame()
  const go = (fn: () => void) => () => {
    audio.unlock()
    click()
    fn()
  }
  return (
    <div className="fade-in pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between p-6 sm:items-start sm:p-12">
      <div className="pointer-events-auto self-end">
        <AudioToggles />
      </div>
      <div className="pointer-events-auto flex flex-col items-center sm:items-start">
        <p className="mb-1 font-retro text-sm font-semibold uppercase tracking-[0.35em] text-kunyit/90">Pasar Malam Showdown</p>
        <h1 className="neon-title text-7xl leading-none sm:text-9xl">CILOK!</h1>
        <p className="mt-3 max-w-sm text-center font-retro text-base text-kertas/80 sm:text-left">
          Out-sell the rival hawkers, snatch their best dishes, and stack the biggest Habuan on your plate.
        </p>
        <div className="mt-7 flex w-64 flex-col gap-3">
          <button className="btn btn-jual py-3.5 text-base" onClick={go(() => setScreen('setup'))}>
            Start Game
          </button>
          <button className="btn btn-stamp py-3" onClick={go(startTutorial)}>
            Interactive Tutorial
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-plain" onClick={go(() => setOverlay('howto'))}>
              How to Play
            </button>
            <button className="btn btn-plain" onClick={go(() => setOverlay('settings'))}>
              Settings
            </button>
          </div>
        </div>
      </div>
      <p className="pointer-events-auto text-xs text-kertas/40">1 player vs up to 3 AI hawkers · climbing card game with a cheeky twist</p>
    </div>
  )
}

export function SetupScreen() {
  const { setScreen, startGame } = useGame()
  const { settings, update } = useSettings()
  const opponents = OPPONENT_ORDER.slice(0, settings.numPlayers - 1).map((id) => PERSONAS[id])
  return (
    <Modal onClose={() => setScreen('menu')}>
      <h2 className="font-display text-3xl text-sambal">Buka Gerai</h2>
      <p className="mt-1 text-sm text-kopi/70">Set up tonight's market.</p>

      <div className="mt-5 space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-kopi/60">Hawkers at the table</h3>
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
          <p className="mt-2 text-sm text-kopi/80">
            You vs <strong>{opponents.map((o) => o.name).join(', ')}</strong>
          </p>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-kopi/60">Difficulty</h3>
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
          <p className="mt-2 text-xs text-kopi/60">
            {settings.difficulty === 'easy'
              ? 'Easy: the hawkers play loosely and rarely cilok.'
              : settings.difficulty === 'standard'
                ? 'Standard: sensible play with the odd surprise.'
                : 'Hard: sharp hawkers who save their bombs and steal with purpose.'}
          </p>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-kopi/60">Rounds</h3>
          <Toggle
            label="Rounds"
            value={settings.totalRounds}
            onChange={(r) => update({ totalRounds: r })}
            options={[
              { value: 1, label: '1' },
              { value: 3, label: '3' },
              { value: 5, label: '5' },
            ]}
          />
        </section>
      </div>

      <div className="mt-7 flex gap-3">
        <button
          className="btn btn-plain flex-1 border-2 border-kopi/15"
          onClick={() => {
            click()
            setScreen('menu')
          }}
        >
          Back
        </button>
        <button
          className="btn btn-jual flex-[2] py-3 text-base"
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
  { term: 'Dish cards', color: '#3B2416', body: '40 cards: numbers 1–10 in four food groups (Kopitiam, Nasi, Roti, Kuih). Only the number matters for play. Sort your hand however you like.' },
  { term: 'GERAI', color: '#3B2416', body: "The dishes on sale in the middle of the table. Whoever played last owns it." },
  { term: 'JUAL', color: '#00A859', body: 'Play a set that beats the Gerai: same shape, higher number. Shapes: single, pair, triple, four of a kind, or a run of 3+ numbers in a row (a run of 3 only beats a run of 3, and so on). On an empty Gerai, open with any shape.' },
  { term: 'LALU', color: '#3B2416', body: "Pass. You can still play later in the same Gerai." },
  { term: 'HABUAN', color: '#00A859', body: 'When play comes back round to the Gerai owner without anyone beating it, they collect every dish played on that Gerai as Habuan (+1 point each) and open the next one.' },
  { term: 'CILOK!', color: '#D7362B', body: "Instead of playing, snatch the highest dish from another hawker's Gerai (it needs 2+ dishes) into your hand. The Gerai shrinks (a pair becomes a single, a run loses its top) and your turn ends." },
  { term: 'DUIT', color: '#B8740E', body: 'Whoever you CILOK from gets a DUIT coin as compensation: +1 point at the end of the round.' },
  { term: 'CILOK & JUAL', color: '#B8740E', body: 'Once per round, use your wooden stamp to CILOK and then JUAL in the same turn: steal a dish, then sell straight away.' },
  { term: 'PUSING', color: '#7A2335', body: 'Four of a kind beats any Gerai and flips the ranking: for the rest of the round, LOWER numbers win. Another four of a kind flips it back.' },
  { term: 'Round end', color: '#3B2416', body: 'The round ends the moment someone empties their hand (they also take the Gerai). The winner opens the next round. Highest total after the last round is Raja Pasar Malam!' },
]

export function HowToPlay() {
  const { setOverlay, startTutorial, screen } = useGame()
  return (
    <Modal wide onClose={() => setOverlay(screen === 'game' ? 'pause' : 'none')}>
      <h2 className="font-display text-3xl text-sambal">How to Play</h2>
      <p className="mt-1 text-sm text-kopi/70">A climbing card game in the Big Two tradition, at a 1980s pasar malam.</p>
      <dl className="mt-5 space-y-3">
        {RULES.map((r) => (
          <div key={r.term} className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[130px_1fr]">
            <dt className="font-display text-sm leading-6" style={{ color: r.color }}>
              {r.term}
            </dt>
            <dd className="text-sm leading-6 text-kopi/90">{r.body}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 rounded-2xl bg-kopi/5 p-3 text-xs text-kopi/70">
        Shortcuts: <b>J</b> Jual · <b>C</b> Cilok · <b>S</b> Cilok &amp; Jual · <b>L</b> Lalu · <b>Esc</b> pause. Drag the table or scroll to tilt the camera.
      </div>
      <div className="mt-6 flex gap-3">
        {screen !== 'game' && (
          <button
            className="btn btn-stamp flex-1"
            onClick={() => {
              audio.unlock()
              click()
              startTutorial()
            }}
          >
            Try the tutorial
          </button>
        )}
        <button
          className="btn btn-jual flex-1"
          onClick={() => {
            click()
            setOverlay(screen === 'game' ? 'pause' : 'none')
          }}
        >
          Faham! (Got it)
        </button>
      </div>
    </Modal>
  )
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm font-semibold">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function SettingsPanel() {
  const { setOverlay, screen } = useGame()
  const { settings, update } = useSettings()
  return (
    <Modal onClose={() => setOverlay(screen === 'game' ? 'pause' : 'none')}>
      <h2 className="font-display text-3xl text-sambal">Settings</h2>
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-kopi/60">Audio</span>
          <AudioToggles light />
        </div>
        <Slider label="Master" value={settings.master} onChange={(v) => update({ master: v })} />
        <Slider label="Music" value={settings.music} onChange={(v) => update({ music: v })} />
        <Slider label="Effects" value={settings.sfx} onChange={(v) => update({ sfx: v })} />
        <Slider label="Ambience" value={settings.ambience} onChange={(v) => update({ ambience: v })} />
        <div className="border-t border-kopi/10 pt-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-kopi/60">Table</span>
        </div>
        <Slider label="Camera tilt" min={-1} max={1} step={0.05} value={settings.cameraTilt} onChange={(v) => update({ cameraTilt: v })} />
        <div className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm font-semibold">
          <span>Sort hand</span>
          <Toggle
            label="Sort hand by"
            value={settings.sortMode}
            onChange={(v) => update({ sortMode: v })}
            options={[
              { value: 'value', label: 'Number' },
              { value: 'group', label: 'Food group' },
            ]}
          />
        </div>
      </div>
      <button
        className="btn btn-jual mt-7 w-full"
        onClick={() => {
          click()
          setOverlay(screen === 'game' ? 'pause' : 'none')
        }}
      >
        Done
      </button>
    </Modal>
  )
}
