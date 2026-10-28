import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { World, type Snapshot } from './world'

/**
 * Hosts the pixel canvas. The DOM overlay reads `--s` (CSS px per game pixel)
 * and `--action-h` so its panels line up with the pixel grid.
 */
export function PixelStage() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef<World | null>(null)
  const game = useGame()
  const { settings } = useSettings()
  const [error, setError] = useState<string | null>(null)

  const snapshot: Snapshot = {
    state: game.state,
    inGame: game.screen === 'game',
    selected: game.selected,
    highlights: game.highlights,
    sortMode: settings.sortMode,
    scanlines: settings.scanlines,
  }
  const callbacks = { pickHand: game.toggleSelect }

  useEffect(() => {
    world.current?.setSnapshot(snapshot)
    world.current?.setCallbacks(callbacks)
  })

  useEffect(() => {
    const el = canvas.current!
    let w: World
    try {
      w = new World(el, snapshot, callbacks)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return
    }
    world.current = w
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const { scale, W, H, layout } = w.resize(window.innerWidth, window.innerHeight, dpr)
      const cssScale = scale / dpr
      el.style.width = `${W * cssScale}px`
      el.style.height = `${H * cssScale}px`
      const root = document.documentElement.style
      root.setProperty('--s', `${cssScale}px`)
      root.setProperty('--action-h', `${layout.actionH * cssScale}px`)
      // Positions in page px, including the gap above the centred canvas.
      const top = (window.innerHeight - H * cssScale) / 2
      root.setProperty('--table-top', `${top + layout.tableTop * cssScale}px`)
      root.setProperty('--cloth-top', `${top + layout.cloth.y * cssScale}px`)
      root.setProperty('--cloth-bottom', `${top + (layout.cloth.y + layout.cloth.h) * cssScale}px`)
      root.setProperty('--portrait', layout.portrait ? '1' : '0')
      document.documentElement.dataset.layout = layout.portrait ? 'portrait' : 'landscape'
      window.dispatchEvent(new Event('layoutchange'))
    }
    fit()
    window.addEventListener('resize', fit)
    w.start()
    return () => {
      window.removeEventListener('resize', fit)
      w.stop()
      world.current = null
    }
    // The world is created once; later props flow in through setSnapshot.
  }, [])

  const toLogical = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    const { W, H } = world.current?.size ?? { W: 1, H: 1 }
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center font-pixel text-kunyit">
        This game needs WebGL2, which isn't available here. ({error})
      </div>
    )
  }

  return (
    <canvas
      ref={canvas}
      className="pixel-canvas absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      onPointerMove={(e) => {
        const [x, y] = toLogical(e)
        e.currentTarget.style.cursor = world.current?.pointerMove(x, y) ? 'pointer' : ''
      }}
      onPointerDown={(e) => {
        const [x, y] = toLogical(e)
        world.current?.pointerDown(x, y)
      }}
    />
  )
}

/** Whether the pixel stage is using its portrait (phone) layout. */
export function usePortrait() {
  const read = () => document.documentElement.dataset.layout === 'portrait'
  const [portrait, setPortrait] = useState(read)
  useEffect(() => {
    const on = () => setPortrait(read())
    window.addEventListener('layoutchange', on)
    // The stage may have measured itself before this listener existed.
    on()
    return () => window.removeEventListener('layoutchange', on)
  }, [])
  return portrait
}
