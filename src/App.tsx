import { useEffect, useState } from 'react'
import { audio } from './audio/AudioEngine'
import { GameProvider, useGame } from './state/GameContext'
import { SettingsProvider } from './state/settings'
import { Scene } from './three/Scene'
import { GameHUD } from './ui/GameHUD'
import { HowToPlay, MainMenu, SettingsPanel, SetupScreen } from './ui/Menus'

/** Card textures are drawn on canvas, so the web fonts must be loaded first. */
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const loads = ['48px "Bungee"', '800 26px "Fraunces"', '600 15px "Fraunces"'].map((f) => document.fonts.load(f).catch(() => null))
    const timeout = new Promise((r) => window.setTimeout(r, 2500))
    void Promise.race([Promise.all(loads), timeout]).then(() => setReady(true))
  }, [])
  return ready
}

function Screens() {
  const { screen, overlay } = useGame()
  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'game' && <GameHUD />}
      {overlay === 'howto' && <HowToPlay />}
      {overlay === 'settings' && <SettingsPanel />}
    </>
  )
}

export default function App() {
  const ready = useFontsReady()

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <SettingsProvider>
      <GameProvider>
        <div className="fixed inset-0">
          {ready ? (
            <Scene />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-2xl text-kunyit/70">Membuka gerai…</div>
          )}
        </div>
        {ready && <Screens />}
      </GameProvider>
    </SettingsProvider>
  )
}
