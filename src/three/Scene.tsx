import { Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { shapeName } from '../game/rules'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { Cards } from './Cards'
import { Lights, World } from './Environment'
import { Hawkers } from './Hawker'
import { GERAI_POS, seatsFor, type Seat, type V3 } from './layout'
import { CoinStack, Plate, Stamp, Table } from './Props'
import { SteamyProps } from './Steam'

function CameraRig() {
  const { camera, size, gl } = useThree()
  const { screen, state } = useGame()
  const { settings } = useSettings()
  const pos = useRef(new THREE.Vector3(0, 9, 13))
  const vel = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3(0, 0.5, -0.5))
  const drag = useRef(0)
  const kick = useRef(new THREE.Vector3())
  const lastSeq = useRef(state.seq)
  const target = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  // Drag on empty table space (or scroll) to tilt the camera.
  useEffect(() => {
    const el = gl.domElement
    let startY: number | null = null
    let startDrag = 0
    const down = (e: PointerEvent) => {
      if (document.body.style.cursor === 'pointer') return
      startY = e.clientY
      startDrag = drag.current
    }
    const move = (e: PointerEvent) => {
      if (startY === null) return
      drag.current = THREE.MathUtils.clamp(startDrag + (e.clientY - startY) / 260, -1.2, 1.2)
    }
    const up = () => {
      startY = null
    }
    const wheel = (e: WheelEvent) => {
      drag.current = THREE.MathUtils.clamp(drag.current + e.deltaY / 900, -1.2, 1.2)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  // A little camera bump on slams and snatches.
  useEffect(() => {
    for (const e of state.events) {
      if (e.seq <= lastSeq.current) continue
      if (e.type === 'jual') kick.current.y -= e.shape.count >= 4 ? 1.6 : 0.7
      if (e.type === 'cilok') kick.current.x += 0.8
    }
    lastSeq.current = state.seq
  }, [state.seq, state.events])

  useFrame((st, dt) => {
    const d = Math.min(dt, 1 / 30)
    const aspect = size.width / size.height
    const portrait = aspect < 0.85
    const squarish = aspect < 1.35
    const fov = portrait ? 56 : squarish ? 46 : 40
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    const t = st.clock.elapsedTime
    let yaw: number
    let elev: number
    let dist: number
    if (screen !== 'game') {
      yaw = Math.sin(t * 0.07) * 0.4
      elev = 0.42 + Math.sin(t * 0.05) * 0.05
      dist = portrait ? 17 : 12.5
      lookTarget.set(0, 0.9, -1.2)
    } else {
      const tilt = THREE.MathUtils.clamp(settings.cameraTilt + drag.current, -1.2, 1.2)
      yaw = st.pointer.x * 0.05
      elev = (portrait ? 1.12 : 0.9) + tilt * 0.2 + st.pointer.y * 0.025
      dist = portrait ? 17 : squarish ? 14.5 : 13.2
      lookTarget.set(0, 0, portrait ? 0.9 : 0.05)
    }
    target.set(
      lookTarget.x + Math.sin(yaw) * Math.cos(elev) * dist,
      lookTarget.y + Math.sin(elev) * dist,
      lookTarget.z + Math.cos(yaw) * Math.cos(elev) * dist,
    )
    // Spring with slight overshoot for a physical feel.
    const k = 26
    const c = 2 * Math.sqrt(k) * 0.8
    vel.current.addScaledVector(target.clone().sub(pos.current).multiplyScalar(k).sub(vel.current.clone().multiplyScalar(c)), d)
    vel.current.add(kick.current)
    kick.current.set(0, 0, 0)
    pos.current.addScaledVector(vel.current, d)
    look.current.lerp(lookTarget, 1 - Math.exp(-4 * d))
    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })
  return null
}

function HighlightRing({ pos, rx, rz = rx }: { pos: V3; rx: number; rz?: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.06
    ref.current.scale.set(rx * s, rz * s, 1)
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(clock.elapsedTime * 5) * 0.3
  })
  return (
    <mesh ref={ref} position={[pos[0], 0.03, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial color="#00E07A" transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function TableProps({ seats }: { seats: Seat[] }) {
  const { state, highlights, can } = useGame()
  const count = state.players.length || 4
  const lastCilok = useMemo(() => {
    const m = new Map<number, V3>()
    for (const e of state.events) if (e.type === 'cilok' && seats[e.actor]) m.set(e.target, seats[e.actor].coins)
    return m
  }, [state.events, seats])

  return (
    <group>
      {seats.slice(0, count).map((seat, i) => {
        const p = state.players[i]
        return (
          <group key={seat.key}>
            <Plate pos={seat.plate} />
            <CoinStack base={seat.coins} count={p?.duit ?? 0} from={lastCilok.get(i) ?? null} round={state.round} />
            <Stamp pos={seat.stamp} yaw={seat.yaw} used={!!p?.stampUsed} ready={i === 0 && can.stamp} />
          </group>
        )
      })}
      {highlights.map((h, i) => {
        if (h.kind === 'gerai') return <HighlightRing key={i} pos={[GERAI_POS[0], 0, GERAI_POS[2]]} rx={2.1} rz={1.3} />
        if (h.kind === 'plate') return <HighlightRing key={i} pos={seats[h.seat].plate} rx={0.85} />
        if (h.kind === 'coins') return <HighlightRing key={i} pos={seats[h.seat].coins} rx={0.6} />
        if (h.kind === 'stamp') return <HighlightRing key={i} pos={seats[h.seat].stamp} rx={0.5} />
        return null
      })}
    </group>
  )
}

function GeraiLabel() {
  const { state, screen } = useGame()
  if (screen !== 'game' || state.status !== 'playing') return null
  const { gerai, pusing } = state
  const owner = gerai.ownerId !== null ? state.players[gerai.ownerId] : null
  return (
    <Html position={[0, 0.02, -1.3]} center zIndexRange={[5, 0]}>
      <div className="gerai-label">
        <span className="font-display tracking-wide">GERAI</span>
        <span className="opacity-80">
          {owner ? `${owner.isHuman ? 'Yours' : owner.name}: ${shapeName(gerai.shape!, gerai.cards)}` : 'empty: open with any set'}
        </span>
        {pusing && <span className="pusing-chip">PUSING ⟲</span>}
      </div>
    </Html>
  )
}

function SceneContents() {
  const { state } = useGame()
  const seats = useMemo(() => seatsFor(state.players.length || 4), [state.players.length])
  return (
    <>
      <CameraRig />
      <Lights />
      <World />
      <Table />
      <SteamyProps />
      <TableProps seats={seats} />
      <Cards seats={seats} />
      <Hawkers seats={seats} />
      <GeraiLabel />
    </>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.1, far: 120, position: [0, 9, 13] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <color attach="background" args={['#140C1F']} />
      <fog attach="fog" args={['#1A1026', 18, 46]} />
      <SceneContents />
    </Canvas>
  )
}
