import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { audio } from '../audio/AudioEngine'
import type { Difficulty } from '../game/types'

export interface Settings {
  master: number
  music: number
  sfx: number
  ambience: number
  musicOn: boolean
  sfxOn: boolean
  /** CRT-style scanlines over the pixels. */
  scanlines: boolean
  difficulty: Difficulty
  totalRounds: number
  sortMode: 'value' | 'group'
}

const DEFAULTS: Settings = {
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
  ambience: 0.45,
  musicOn: true,
  sfxOn: true,
  scanlines: true,
  difficulty: 'standard',
  totalRounds: 3,
  sortMode: 'value',
}

const KEY = 'rajagerai.settings.v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

interface SettingsCtx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // Storage unavailable (private mode): settings just won't persist.
    }
    audio.setMix(settings)
  }, [settings])

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))
  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings outside SettingsProvider')
  return ctx
}
