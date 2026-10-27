import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { V3 } from './layout'
import { makeCoinFace, makePlateTexture, makeStampFace, makeWoodTexture } from './textures'

export const TABLE = { w: 11.4, d: 7.6 }

export function Table() {
  const wood = useMemo(() => makeWoodTexture(), [])
  const legMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A2B17', roughness: 0.8 }), [])
  return (
    <group>
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow>
        <boxGeometry args={[TABLE.w, 0.32, TABLE.d]} />
        <meshStandardMaterial attach="material-0" color="#5C3820" roughness={0.8} />
        <meshStandardMaterial attach="material-1" color="#5C3820" roughness={0.8} />
        <meshStandardMaterial attach="material-2" map={wood} roughness={0.72} />
        <meshStandardMaterial attach="material-3" color="#3A2213" roughness={0.9} />
        <meshStandardMaterial attach="material-4" color="#6A4126" roughness={0.8} />
        <meshStandardMaterial attach="material-5" color="#6A4126" roughness={0.8} />
      </mesh>
      {/* Brass edge trim, a common detail on old hawker tables. */}
      <mesh position={[0, -0.02, TABLE.d / 2 + 0.01]}>
        <boxGeometry args={[TABLE.w + 0.04, 0.05, 0.04]} />
        <meshStandardMaterial color="#B98B3E" metalness={0.7} roughness={0.35} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (TABLE.w / 2 - 0.4), -1.7, sz * (TABLE.d / 2 - 0.4)]} material={legMat} castShadow>
          <boxGeometry args={[0.28, 2.8, 0.28]} />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────── Habuan plate ─────────────────────────

const plateRimGeo = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.5, 0.0),
    new THREE.Vector2(0.56, 0.02),
    new THREE.Vector2(0.66, 0.075),
    new THREE.Vector2(0.68, 0.08),
    new THREE.Vector2(0.67, 0.085),
    new THREE.Vector2(0.56, 0.04),
    new THREE.Vector2(0.5, 0.03),
  ],
  48,
)

export function Plate({ pos }: { pos: V3 }) {
  const tex = useMemo(() => makePlateTexture(), [])
  return (
    <group position={pos}>
      <mesh geometry={plateRimGeo} receiveShadow castShadow>
        <meshStandardMaterial color="#F5F1E6" roughness={0.25} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.087, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.68, 48]} />
        <meshStandardMaterial map={tex} roughness={0.25} transparent alphaTest={0.01} />
      </mesh>
    </group>
  )
}

// ───────────────────────── Duit coins ─────────────────────────

const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.045, 36)
let coinMats: THREE.Material[] | null = null
function getCoinMats() {
  if (!coinMats) {
    const face = makeCoinFace()
    const faceMat = new THREE.MeshStandardMaterial({ map: face, metalness: 0.75, roughness: 0.32 })
    coinMats = [new THREE.MeshStandardMaterial({ color: '#B8862F', metalness: 0.85, roughness: 0.3 }), faceMat, faceMat]
  }
  return coinMats
}

const STACK_OFFSETS: [number, number][] = [
  [0, 0],
  [0.36, 0.05],
  [-0.2, 0.32],
  [0.2, -0.33],
  [-0.34, -0.1],
]

function coinSlot(base: V3, i: number): V3 {
  const [ox, oz] = STACK_OFFSETS[Math.floor(i / 5) % STACK_OFFSETS.length]
  return [base[0] + ox, 0.024 + (i % 5) * 0.047, base[2] + oz]
}

function Coin({ pos, from }: { pos: V3; from: V3 | null }) {
  const ref = useRef<THREE.Mesh>(null!)
  const born = useRef(performance.now())
  const spin = useRef(Math.random() * Math.PI)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const t = from ? Math.min((performance.now() - born.current) / 750, 1) : 1
    if (t < 1 && from) {
      const e = 1 - Math.pow(1 - t, 3)
      m.position.set(
        THREE.MathUtils.lerp(from[0], pos[0], e),
        THREE.MathUtils.lerp(from[1] + 0.3, pos[1], e) + Math.sin(Math.PI * t) * 1.4,
        THREE.MathUtils.lerp(from[2], pos[2], e),
      )
      m.rotation.set(t * 14, spin.current, t * 3)
    } else {
      m.position.set(pos[0], pos[1], pos[2])
      m.rotation.set(0, spin.current, 0)
    }
  })
  return <mesh ref={ref} geometry={coinGeo} material={getCoinMats()} castShadow position={from ?? pos} />
}

export function CoinStack({ base, count, from, round }: { base: V3; count: number; from: V3 | null; round: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Coin key={`${round}-${i}`} pos={coinSlot(base, i)} from={from} />
      ))}
    </group>
  )
}

// ───────────────────────── CILOK & JUAL stamp ─────────────────────────

export function Stamp({ pos, yaw, used, ready }: { pos: V3; yaw: number; used: boolean; ready: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const face = useMemo(() => makeStampFace(), [])
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9A6236', roughness: 0.6 }), [])
  const knobMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C8352B', roughness: 0.4, emissive: '#FF8A3A', emissiveIntensity: 0 }), [])
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: face, roughness: 0.7, emissive: '#FF7A2A', emissiveIntensity: 0 }), [face])
  const flip = useRef(0)
  const usedAt = useRef<number | null>(null)

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    if (used && usedAt.current === null) usedAt.current = state.clock.elapsedTime
    if (!used) usedAt.current = null
    const target = used ? 1 : 0
    flip.current += (target - flip.current) * (1 - Math.exp(-5 * dt))
    const f = flip.current
    // Hop up and turn over so the stamped face shows, resting on its knob.
    g.position.set(pos[0], Math.sin(f * Math.PI) * 0.9 + f * 0.6, pos[2])
    g.rotation.set(f * Math.PI, yaw, 0)
    const since = usedAt.current !== null ? state.clock.elapsedTime - usedAt.current : 99
    const flash = since < 1.6 ? 1.2 * (1 - since / 1.6) : 0
    const pulse = ready ? 0.35 + Math.sin(state.clock.elapsedTime * 4) * 0.25 : 0
    knobMat.emissiveIntensity = pulse
    faceMat.emissiveIntensity = flash
    const dim = used && since > 1.6 ? 0.45 : 1
    woodMat.color.setRGB(0.6 * dim, 0.38 * dim, 0.21 * dim)
    faceMat.color.setScalar(used && since > 1.6 ? 0.45 : 1)
  })

  return (
    <group ref={ref} position={pos}>
        <mesh position={[0, 0.1, 0]} material={woodMat} castShadow>
          <boxGeometry args={[0.52, 0.16, 0.52]} />
        </mesh>
        <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} material={faceMat}>
          <planeGeometry args={[0.48, 0.48]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={woodMat} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.28, 16]} />
        </mesh>
        <mesh position={[0, 0.48, 0]} material={knobMat} castShadow>
          <sphereGeometry args={[0.12, 20, 16]} />
        </mesh>
    </group>
  )
}
