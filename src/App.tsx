import { useEffect } from 'react'
import { audio } from './audio/AudioEngine'
import { PixelStage } from './pixel/PixelStage'
import { GameProvider, useGame } from './state/GameContext'
import { SettingsProvider } from './state/settings'
import { GameHUD } from './ui/GameHUD'
import { HowToPlay, MainMenu, SettingsPanel, SetupScreen } from './ui/Menus'

function Screens() {
  const { screen, overlay, state } = useGame()

  // The deciding round gets a faster tune.
  useEffect(() => {
    audio.setFinalRound(screen === 'game' && state.totalRounds > 1 && state.round === state.totalRounds)
  }, [screen, state.round, state.totalRounds])

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
        <div className="fixed inset-0 bg-[#0a0610]">
          <PixelStage />
        </div>
        <Screens />
      </GameProvider>
    </SettingsProvider>
  )
}
