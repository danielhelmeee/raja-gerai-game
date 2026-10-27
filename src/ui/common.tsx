import type { ReactNode } from 'react'
import { audio } from '../audio/AudioEngine'
import { useSettings } from '../state/settings'

export const click = () => audio.play('ui')

export function MusicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  )
}

export function SpeakerIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      {off ? <path d="M23 9l-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />}
    </svg>
  )
}

export function AudioToggles({ light }: { light?: boolean }) {
  const { settings, update } = useSettings()
  const cls = light ? 'btn-plain' : 'btn-ghost'
  return (
    <div className="flex gap-2">
      <button
        className={`btn ${cls} !px-3`}
        aria-label={settings.musicOn ? 'Mute music' : 'Play music'}
        title="Music"
        onClick={() => {
          audio.unlock()
          update({ musicOn: !settings.musicOn })
          click()
        }}
      >
        <MusicIcon off={!settings.musicOn} />
      </button>
      <button
        className={`btn ${cls} !px-3`}
        aria-label={settings.sfxOn ? 'Mute sound effects' : 'Unmute sound effects'}
        title="Sound effects"
        onClick={() => {
          audio.unlock()
          update({ sfxOn: !settings.sfxOn })
          if (!settings.sfxOn) window.setTimeout(click, 30)
        }}
      >
        <SpeakerIcon off={!settings.sfxOn} />
      </button>
    </div>
  )
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className={`panel pop-3d max-h-[92vh] w-full overflow-y-auto p-5 sm:p-7 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>{children}</div>
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
          className="chip-toggle"
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
