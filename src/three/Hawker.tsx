import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { PERSONAS, pick, type Persona } from '../game/personas'
import type { GameEvent, Player } from '../game/types'
import { useGame } from '../state/GameContext'
import type { Seat, V3 } from './layout'

export type ReactionType = 'idle' | 'think' | 'joy' | 'slap' | 'annoyed' | 'sly' | 'shrug' | 'cheer' | 'sad'

interface Reaction {
  type: ReactionType
  at: number
  line?: string
  key: number
}

const DURATION: Record<ReactionType, number> = {
  idle: 0,
  think: 0,
  joy: 2.0,
  slap: 2.0,
  annoyed: 2.4,
  sly: 1.8,
  shrug: 1.6,
  cheer: 6,
  sad: 6,
}

const lerp = THREE.MathUtils.lerp
const damp = (cur: number, target: number, dt: number, speed = 10) => lerp(cur, target, 1 - Math.exp(-speed * dt))

function HawkerModel({ persona, reaction, active }: { persona: Persona; reaction: Reaction; active: boolean }) {
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const browL = useRef<THREE.Mesh>(null!)
  const browR = useRef<THREE.Mesh>(null!)
  const smile = useRef<THREE.Mesh>(null!)
  const mouthOpen = useRef<THREE.Mesh>(null!)
  const eyes = useRef<THREE.Group>(null!)
  const tool = useRef<THREE.Group>(null!)
  const pose = useRef({ bodyY: 0, headX: 0, headY: 0, headZ: 0, lx: -1.05, lz: 0.15, rx: -1.05, rz: -0.15, brow: 0, toolSpin: 0 })

  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: persona.skin, roughness: 0.65 }), [persona])
  const shirt = useMemo(() => new THREE.MeshStandardMaterial({ color: persona.shirt, roughness: 0.85 }), [persona])
  const apron = useMemo(() => new THREE.MeshStandardMaterial({ color: persona.apron, roughness: 0.9 }), [persona])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1B1210', roughness: 0.6 }), [])

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime
    const t = now - reaction.at
    const live = t < DURATION[reaction.type]
    const type: ReactionType = live ? reaction.type : active ? 'think' : 'idle'
    const p = pose.current
    const breath = Math.sin(now * 1.8) * 0.02
    // Rest pose: forearms on the table.
    let bodyY = breath
    let headX = Math.sin(now * 0.7) * 0.04
    let headY = Math.sin(now * 0.4) * 0.12
    let headZ = 0
    let lx = -1.05
    let lz = 0.15
    let rx = -1.05
    let rz = -0.15
    let brow = 0
    let open = false
    let happy = true
    let toolSpin = 0

    switch (type) {
      case 'think':
        headZ = 0.18
        headX = 0.12
        rx = -2.35
        rz = 0.55
        happy = Math.sin(now * 0.8) > -0.5
        break
      case 'joy':
        bodyY = Math.abs(Math.sin(t * 9)) * 0.08
        headX = -0.25 + Math.sin(t * 18) * 0.06
        open = true
        rx = -2.8 + Math.sin(t * 7) * 0.3
        toolSpin = t * 14
        lx = -2.4
        lz = 0.5
        break
      case 'slap': {
        const hit = Math.abs(Math.sin(t * 8))
        bodyY = hit * 0.05
        headX = -0.2
        open = true
        rx = -0.6 - hit * 1.6
        lx = -0.6 - (1 - hit) * 1.6
        toolSpin = t * 10
        break
      }
      case 'annoyed':
        headY = Math.sin(t * 16) * 0.35 * Math.max(0, 1 - t / 1.4)
        headX = t < 0.4 ? -0.3 : 0.05
        brow = 1
        open = t < 0.8
        happy = false
        lx = -1.6
        lz = -0.1
        rx = t > 1.2 ? -0.8 : -1.05
        break
      case 'sly':
        headZ = -0.2
        headY = 0.25
        brow = -0.6
        rx = -1.3 + Math.sin(t * 10) * 0.12
        lx = -1.3 - Math.sin(t * 10) * 0.12
        lz = -0.25
        rz = 0.25
        break
      case 'shrug':
        bodyY = 0.04
        headZ = 0.2
        lz = 0.9
        rz = -0.9
        lx = -0.7
        rx = -0.7
        happy = false
        break
      case 'cheer':
        bodyY = Math.abs(Math.sin(t * 6)) * 0.35
        headX = -0.3
        open = true
        lx = -3.0 + Math.sin(t * 12) * 0.2
        rx = -3.0 - Math.sin(t * 12) * 0.2
        lz = 0.3
        rz = -0.3
        toolSpin = t * 12
        break
      case 'sad':
        headX = 0.35
        happy = false
        lx = -0.3
        rx = -0.3
        brow = -0.4
        break
    }

    p.bodyY = damp(p.bodyY, bodyY, dt, 14)
    p.headX = damp(p.headX, headX, dt)
    p.headY = damp(p.headY, headY, dt, 14)
    p.headZ = damp(p.headZ, headZ, dt)
    p.lx = damp(p.lx, lx, dt, 12)
    p.lz = damp(p.lz, lz, dt, 12)
    p.rx = damp(p.rx, rx, dt, 12)
    p.rz = damp(p.rz, rz, dt, 12)
    p.brow = damp(p.brow, brow, dt)
    p.toolSpin = toolSpin ? toolSpin : damp(p.toolSpin % (Math.PI * 2), 0, dt, 6)

    body.current.position.y = p.bodyY
    head.current.rotation.set(p.headX, p.headY, p.headZ)
    armL.current.rotation.set(p.lx, 0, p.lz)
    armR.current.rotation.set(p.rx, 0, p.rz)
    browL.current.rotation.z = p.brow * -0.45
    browR.current.rotation.z = p.brow * 0.45
    browL.current.position.y = 0.17 + (p.brow < 0 ? -p.brow * 0.04 : 0)
    browR.current.position.y = 0.17 + (p.brow < 0 ? -p.brow * 0.04 : 0)
    smile.current.visible = !open
    smile.current.rotation.z = happy ? Math.PI : 0
    smile.current.position.y = happy ? -0.12 : -0.17
    mouthOpen.current.visible = open
    mouthOpen.current.scale.y = 0.8 + Math.abs(Math.sin(now * 14)) * 0.5
    // Blink.
    eyes.current.scale.y = now % 3.7 < 0.12 ? 0.1 : 1
    if (tool.current) tool.current.rotation.x = p.toolSpin
    root.current.position.y = 0
  })

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Torso, apron, neck */}
        <mesh position={[0, 0.55, 0]} scale={[1, 1, 0.72]} material={shirt} castShadow>
          <capsuleGeometry args={[0.48, 0.6, 6, 16]} />
        </mesh>
        <mesh position={[0, 0.42, 0.33]} rotation={[-0.08, 0, 0]} material={apron}>
          <boxGeometry args={[0.72, 0.7, 0.04]} />
        </mesh>
        <mesh position={[0, 1.15, 0]} material={skin}>
          <cylinderGeometry args={[0.13, 0.15, 0.2, 12]} />
        </mesh>

        {/* Head */}
        <group ref={head} position={[0, 1.5, 0]}>
          <mesh material={skin} castShadow>
            <sphereGeometry args={[0.36, 24, 20]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.35, -0.02, 0]} material={skin}>
              <sphereGeometry args={[0.07, 10, 8]} />
            </mesh>
          ))}
          <group ref={eyes}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.12, 0.05, 0.31]}>
                <mesh>
                  <sphereGeometry args={[0.065, 12, 10]} />
                  <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.045]} material={dark}>
                  <sphereGeometry args={[0.035, 10, 8]} />
                </mesh>
              </group>
            ))}
          </group>
          <mesh ref={browL} position={[-0.12, 0.17, 0.32]} material={dark}>
            <boxGeometry args={[0.13, 0.025, 0.02]} />
          </mesh>
          <mesh ref={browR} position={[0.12, 0.17, 0.32]} material={dark}>
            <boxGeometry args={[0.13, 0.025, 0.02]} />
          </mesh>
          <mesh position={[0, -0.03, 0.35]} material={skin}>
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
          <mesh ref={smile} position={[0, -0.12, 0.33]} rotation={[0, 0, Math.PI]} material={dark}>
            <torusGeometry args={[0.08, 0.016, 8, 16, Math.PI]} />
          </mesh>
          <mesh ref={mouthOpen} position={[0, -0.15, 0.32]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[0.07, 14, 10]} />
            <meshStandardMaterial color="#5A1A1A" roughness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.22, -0.08, 0.28]}>
              <circleGeometry args={[0.05, 12]} />
              <meshBasicMaterial color="#F08080" transparent opacity={0.5} />
            </mesh>
          ))}
          <PersonaHead persona={persona} dark={dark} />
        </group>

        {/* Arms pivot at the shoulders. */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? armL : armR} position={[s * 0.56, 0.98, 0]}>
            <mesh position={[0, -0.32, 0]} material={shirt} castShadow>
              <capsuleGeometry args={[0.12, 0.42, 4, 10]} />
            </mesh>
            <mesh position={[0, -0.66, 0]} material={skin}>
              <sphereGeometry args={[0.11, 12, 10]} />
            </mesh>
            {s > 0 && persona.id !== 'lina' && (
              <group ref={tool} position={[0, -0.7, 0.05]}>
                <mesh position={[0, -0.18, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
                  <meshStandardMaterial color="#6B4226" />
                </mesh>
                <mesh position={[0, -0.42, 0.02]}>
                  <boxGeometry args={[0.2, 0.18, 0.02]} />
                  <meshStandardMaterial color="#BFC5C9" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
            )}
          </group>
        ))}
        <PersonaBody persona={persona} />
      </group>
    </group>
  )
}

function PersonaHead({ persona, dark }: { persona: Persona; dark: THREE.Material }) {
  if (persona.id === 'ahseng') {
    return (
      <group>
        <mesh position={[0, 0.06, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.06, 8, 24]} />
          <meshStandardMaterial color="#D8D4CC" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.13, 0.33]}>
          <torusGeometry args={[0.07, 0.008, 6, 20]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    )
  }
  if (persona.id === 'lina') {
    return (
      <group>
        <mesh position={[0, 0.04, -0.05]} scale={[1.08, 1.12, 1.05]}>
          <sphereGeometry args={[0.37, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color="#F28C28" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.12, -0.12]} rotation={[0.12, 0, 0]}>
          <sphereGeometry args={[0.42, 20, 16, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.35, Math.PI * 0.45]} />
          <meshStandardMaterial color="#F28C28" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.38, 0.05]}>
          <coneGeometry args={[0.5, 0.45, 20, 1, true]} />
          <meshStandardMaterial color="#F28C28" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }
  if (persona.id === 'mat') {
    return (
      <group>
        <mesh position={[0, 0.3, -0.02]} rotation={[-0.1, 0, 0]} material={dark}>
          <cylinderGeometry args={[0.3, 0.31, 0.24, 24]} />
        </mesh>
        <mesh position={[0, -0.07, 0.34]} material={dark}>
          <boxGeometry args={[0.2, 0.035, 0.03]} />
        </mesh>
      </group>
    )
  }
  return null
}

function PersonaBody({ persona }: { persona: Persona }) {
  if (persona.id === 'ahseng') {
    // Good-morning towel over the shoulder.
    return (
      <group position={[0.32, 1.02, 0.05]} rotation={[0, 0, -0.5]}>
        <mesh>
          <boxGeometry args={[0.2, 0.5, 0.5]} />
          <meshStandardMaterial color="#FFFFFF" roughness={1} />
        </mesh>
        <mesh position={[0.001, -0.15, 0]}>
          <boxGeometry args={[0.205, 0.05, 0.505]} />
          <meshStandardMaterial color="#C8352B" roughness={1} />
        </mesh>
      </group>
    )
  }
  if (persona.id === 'mat') {
    return (
      <mesh position={[0, 0.6, 0.35]}>
        <boxGeometry args={[0.6, 0.06, 0.02]} />
        <meshStandardMaterial color="#F4B42A" />
      </mesh>
    )
  }
  return null
}

// ───────────────────────── telemetry & bubbles ─────────────────────────

function Telemetry({ player, active, glow }: { player: Player; active: boolean; glow: boolean }) {
  const persona = PERSONAS[player.persona]
  return (
    <div
      className={`telemetry pointer-events-none select-none ${active ? 'telemetry-active' : ''} ${glow ? 'tut-glow' : ''}`}
      style={{ ['--accent' as string]: persona.accent }}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: persona.accent }} />
        <span className="font-retro text-[13px] font-extrabold leading-none text-kopi">{player.name}</span>
      </div>
      <div className="mt-1 flex gap-2 text-[12px] font-semibold text-kopi/80">
        <span title="Cards in hand">🂠 {player.hand.length}</span>
        <span title="Duit coins">🪙 {player.duit}</span>
        <span title="Habuan">🏆 {player.habuan.length}</span>
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-kopi/60">Total {player.total}</div>
    </div>
  )
}

interface FloatText {
  id: number
  seat: number
  text: string
  color: string
}

let floatId = 0

export function Hawkers({ seats }: { seats: Seat[] }) {
  const { state, highlights } = useGame()
  const [reactions, setReactions] = useState<Record<number, Reaction>>({})
  const [floats, setFloats] = useState<FloatText[]>([])
  const clockRef = useRef(0)
  const lastSeq = useRef(state.seq)

  // Menu screen: show the three hawkers waiting at a four-seat table.
  const players: Player[] = state.players.length
    ? state.players
    : (['you', 'ahseng', 'lina', 'mat'] as const).map((persona, id) => ({
        id,
        name: PERSONAS[persona].name,
        isHuman: id === 0,
        persona,
        hand: [],
        habuan: [],
        duit: 0,
        stampUsed: false,
        total: 0,
        roundScores: [],
      }))

  useFrame(({ clock }) => {
    clockRef.current = clock.elapsedTime
  })

  useEffect(() => {
    const fresh = state.events.filter((e) => e.seq > lastSeq.current)
    lastSeq.current = state.seq
    if (!fresh.length) return
    const now = clockRef.current
    const next: Record<number, Reaction> = {}
    const add: FloatText[] = []
    const react = (id: number, type: ReactionType, lines?: (p: Persona) => string[], delay = 0) => {
      const p = state.players[id]
      if (!p || p.isHuman) return
      const persona = PERSONAS[p.persona]
      next[id] = { type, at: now + delay, line: lines ? pick(lines(persona)) : undefined, key: Math.random() }
    }
    for (const e of fresh as GameEvent[]) {
      switch (e.type) {
        case 'jual':
          react(e.actor, e.beat !== null && Math.random() < 0.5 ? 'slap' : 'joy', (p) => p.lines.jual)
          break
        case 'cilok':
          react(e.target, 'annoyed', (p) => p.lines.stolen, 0.15)
          react(e.actor, 'sly', (p) => p.lines.cilok)
          add.push({ id: ++floatId, seat: e.target, text: '+1 DUIT', color: '#F4B42A' })
          break
        case 'pass':
          react(e.actor, 'shrug', (p) => p.lines.pass)
          break
        case 'collect':
          add.push({ id: ++floatId, seat: e.actor, text: `+${e.count} HABUAN`, color: '#00A859' })
          break
        case 'roundEnd':
        case 'gameOver':
          state.players.forEach((p) => {
            react(p.id, p.id === e.winner ? 'cheer' : 'sad', (ps) => (p.id === e.winner ? ps.lines.win : ps.lines.lose), 0.3)
            if (e.type === 'roundEnd') {
              const rs = p.roundScores[p.roundScores.length - 1]
              if (rs) add.push({ id: ++floatId, seat: p.id, text: `${rs.score >= 0 ? '+' : ''}${rs.score}`, color: rs.score >= 0 ? '#00A859' : '#D7362B' })
            }
          })
          break
      }
    }
    if (Object.keys(next).length) setReactions((r) => ({ ...r, ...next }))
    if (add.length) {
      setFloats((f) => [...f, ...add])
      const ids = new Set(add.map((a) => a.id))
      window.setTimeout(() => setFloats((f) => f.filter((x) => !ids.has(x.id))), 2200)
    }
  }, [state.seq, state.events, state.players])

  const telemetryGlow = highlights.some((h) => h.kind === 'telemetry')

  return (
    <group>
      {players.map((p, i) => {
        const seat = seats[i]
        if (!seat) return null
        const persona = PERSONAS[p.persona]
        const reaction = reactions[p.id] ?? { type: 'idle', at: -99, key: 0 }
        const active = state.status === 'playing' && state.turn === p.id
        const floatsHere = floats.filter((f) => f.seat === p.id)
        if (p.isHuman) {
          return (
            <group key={p.id} position={[seat.plate[0], 0.6, seat.plate[2]]}>
              {floatsHere.map((f) => (
                <Html key={f.id} center zIndexRange={[20, 0]}>
                  <div className="float-text" style={{ color: f.color }}>
                    {f.text}
                  </div>
                </Html>
              ))}
            </group>
          )
        }
        return (
          <group key={p.id}>
            {state.players.length > 0 && (
              <Html position={seat.panel} center zIndexRange={[10, 0]}>
                <Telemetry player={p} active={active} glow={telemetryGlow} />
              </Html>
            )}
          <group position={seat.avatar as V3} rotation={[0, seat.yaw, 0]}>
            <HawkerModel persona={persona} reaction={reaction} active={active} />
            {active && (
              <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.9, 1.05, 48]} />
                <meshBasicMaterial color="#00A859" toneMapped={false} transparent opacity={0.85} />
              </mesh>
            )}
            {/* The bubble fades itself out with CSS; a new reaction key restarts it. */}
            {reaction.line && (
              <Html key={reaction.key} position={[0.5, 2.05, 0]} zIndexRange={[15, 0]}>
                <div className="speech">{reaction.line}</div>
              </Html>
            )}
            {floatsHere.map((f) => (
              <Html key={f.id} position={[0, 2.0, 0]} center zIndexRange={[20, 0]}>
                <div className="float-text" style={{ color: f.color }}>
                  {f.text}
                </div>
              </Html>
            ))}
          </group>
          </group>
        )
      })}
    </group>
  )
}
