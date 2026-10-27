import type { ReactNode } from 'react'
import { audio } from '../audio/AudioEngine'
import { useSettings } from '../state/settings'

export const click = () => audio.play('ui')

/** Icons drawn on an 8×8 pixel grid. */
function PixelIcon({ rows }: { rows: string[] }) {
  return (
    <svg viewBox="0 0 8 8" className="h-[max(calc(var(--s)*7),14px)] w-[max(calc(var(--s)*7),14px)]" shapeRendering="crispEdges" fill="currentColor">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  )
}

const NOTE = ['...####.', '...#..#.', '...#..#.', '...#..#.', '.###.##.', '####.###', '.##..##.', '........']
const NOTE_OFF = ['#..####.', '.#.#..#.', '..##..#.', '...#..#.', '.####.#.', '####.##.', '.##..###', '.......#']
const SPEAKER = ['...#....', '..##..#.', '####.#..', '####.#.#', '####.#.#', '####.#..', '..##..#.', '...#....']
const SPEAKER_OFF = ['...#....', '..##....', '####.#.#', '####..#.', '####..#.', '####.#.#', '..##....', '...#....']

export function AudioToggles({ light }: { light?: boolean }) {
  const { settings, update } = useSettings()
  const cls = light ? 'btn-plain' : 'btn-ghost'
  return (
    <div className="flex gap-2">
      <button
        className={`px-btn ${cls} !px-2`}
        aria-label={settings.musicOn ? 'Mute music' : 'Play music'}
        title="Music"
        onClick={() => {
          audio.unlock()
          update({ musicOn: !settings.musicOn })
          click()
        }}
      >
        <PixelIcon rows={settings.musicOn ? NOTE : NOTE_OFF} />
      </button>
      <button
        className={`px-btn ${cls} !px-2`}
        aria-label={settings.sfxOn ? 'Mute sound effects' : 'Unmute sound effects'}
        title="Sound effects"
        onClick={() => {
          audio.unlock()
          update({ sfxOn: !settings.sfxOn })
          if (!settings.sfxOn) window.setTimeout(click, 30)
        }}
      >
        <PixelIcon rows={settings.sfxOn ? SPEAKER : SPEAKER_OFF} />
      </button>
    </div>
  )
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(10,5,15,0.7)] p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className={`px-panel pop-in max-h-[94vh] w-full overflow-y-auto p-[max(calc(var(--s)*7),16px)] ${wide ? 'max-w-[680px]' : 'max-w-[440px]'}`}>
        {children}
      </div>
    </div>
  )
}

export function Toggle<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          data-on={o.value === value}
          className="px-chip"
          onClick={() => {
            click()
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
