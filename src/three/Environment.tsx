import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeAwning, makeSign, makeSoftSprite } from './textures'

const BOKEH_COLORS = ['#FFB347', '#FF7A45', '#FFD27A', '#FF5E7E', '#7FD6FF', '#FFE9B0', '#9CFF8A']

/** Out-of-focus stall lights in the distance. */
function Bokeh() {
  const tex = useMemo(() => makeSoftSprite(true), [])
  const dots = useMemo(
    () =>
      Array.from({ length: 70 }, () => {
        const side = Math.random()
        const x = side < 0.7 ? (Math.random() - 0.5) * 44 : (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 8)
        const z = side < 0.7 ? -13 - Math.random() * 16 : -6 + Math.random() * 14
        return {
          pos: [x, 0.8 + Math.random() * 7, z] as [number, number, number],
          size: 0.5 + Math.random() * 1.7,
          color: BOKEH_COLORS[Math.floor(Math.random() * BOKEH_COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
        }
      }),
    [],
  )
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    dots.forEach((d, i) => {
      const s = refs.current[i]
      if (s) (s.material as THREE.SpriteMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * d.speed + d.phase) * 0.15
    })
  })
  return (
    <group>
      {dots.map((d, i) => (
        <sprite key={i} ref={(el) => void (refs.current[i] = el)} position={d.pos} scale={[d.size, d.size, 1]}>
          <spriteMaterial map={tex} color={d.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      ))}
    </group>
  )
}

const STALLS: { x: number; z: number; rot: number; sign: string; colors: [string, string]; glow: string }[] = [
  { x: -11, z: -15, rot: 0.15, sign: 'SATAY', colors: ['#C8352B', '#FBF3DF'], glow: '#FFB347' },
  { x: -3.5, z: -17, rot: 0, sign: 'AIR TEBU', colors: ['#2F8F5B', '#FBF3DF'], glow: '#9CFF8A' },
  { x: 4.5, z: -16.5, rot: -0.05, sign: 'APAM BALIK', colors: ['#F4B42A', '#7A2335'], glow: '#FFD27A' },
  { x: 12, z: -14, rot: -0.2, sign: 'ROTI JOHN', colors: ['#3B6FB6', '#FBF3DF'], glow: '#7FD6FF' },
  { x: -16, z: -6, rot: 0.9, sign: 'CENDOL', colors: ['#2F8F5B', '#F4B42A'], glow: '#9CFF8A' },
  { x: 16, z: -5, rot: -0.9, sign: 'MURTABAK', colors: ['#C8352B', '#F4B42A'], glow: '#FF7A45' },
]

function Stall({ x, z, rot, sign, colors, glow }: (typeof STALLS)[number]) {
  const awning = useMemo(() => makeAwning(colors), [colors])
  const signTex = useMemo(() => makeSign(sign, '#1A0F14', glow), [sign, glow])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[4.2, 1.2, 1.6]} />
        <meshStandardMaterial color="#3A2A22" roughness={0.9} />
      </mesh>
      {[-1.9, 1.9].map((px) => (
        <mesh key={px} position={[px, 1.9, 0.6]}>
          <cylinderGeometry args={[0.05, 0.05, 2.6, 8]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.25, 0.2]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[4.6, 1.8]} />
        <meshStandardMaterial map={awning} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.35, 0.95]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={signTex} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.2, 1.4]} color={glow} intensity={6} distance={7} decay={1.6} />
      {/* A few silhouettes of shoppers. */}
      {[-1.2, 0.3, 1.5].map((px, i) => (
        <group key={i} position={[px, 0, 1.9 + (i % 2) * 0.4]}>
          <mesh position={[0, 0.85, 0]}>
            <capsuleGeometry args={[0.28, 0.9, 4, 8]} />
            <meshStandardMaterial color="#120B16" roughness={1} />
          </mesh>
          <mesh position={[0, 1.75, 0]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#120B16" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Festoon of bulbs strung between poles. */
function StringLights({ from, to, sag, count, y }: { from: [number, number]; to: [number, number]; sag: number; count: number; y: number }) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        return [
          THREE.MathUtils.lerp(from[0], to[0], t),
          y - Math.sin(Math.PI * t) * sag,
          THREE.MathUtils.lerp(from[1], to[1], t),
        ] as [number, number, number]
      }),
    [from, to, sag, count, y],
  )
  const curve = useMemo(() => new THREE.CatmullRomCurve3(bulbs.map((b) => new THREE.Vector3(b[0], b[1] + 0.12, b[2]))), [bulbs])
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.012, 4, false]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#FFC36B' : i % 3 === 1 ? '#FFE3A3' : '#FF8F5A'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Overhead incandescent bulb with a cord, gently swaying. */
function HangingBulb({ x, z, h, phase }: { x: number; z: number; h: number; phase: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + phase) * 0.03
  })
  return (
    <group ref={ref} position={[x, 9, z]}>
      <mesh position={[0, -(9 - h) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 9 - h, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[0, -(9 - h) - 0.05, 0]}>
        <coneGeometry args={[0.35, 0.25, 20, 1, true]} />
        <meshStandardMaterial color="#2F5F4A" side={THREE.DoubleSide} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, -(9 - h) - 0.18, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color="#FFE2A8" toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Lights() {
  return (
    <>
      <hemisphereLight args={['#FFD9A8', '#2A1630', 0.55]} />
      <ambientLight intensity={0.12} color="#FFE6C8" />
      <spotLight
        position={[-1.6, 5.6, 0.6]}
        angle={0.95}
        penumbra={0.7}
        intensity={70}
        decay={1.6}
        distance={20}
        color="#FFC98A"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <pointLight position={[2.6, 5.0, -1.4]} intensity={28} decay={1.6} distance={16} color="#FFB870" />
      <pointLight position={[0, 4.2, 4.6]} intensity={10} decay={1.8} distance={11} color="#FFE0B8" />
    </>
  )
}

export function World() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.1, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1E1820" roughness={1} />
      </mesh>
      <HangingBulb x={-1.6} z={0.6} h={5.6} phase={0} />
      <HangingBulb x={2.6} z={-1.4} h={5.0} phase={1.3} />
      <StringLights from={[-14, -8]} to={[14, -8]} sag={1.2} count={28} y={6.8} />
      <StringLights from={[-14, -12]} to={[14, -12]} sag={1.0} count={24} y={7.4} />
      <StringLights from={[-12, -3]} to={[-12, -16]} sag={0.6} count={12} y={6.2} />
      <StringLights from={[12, -3]} to={[12, -16]} sag={0.6} count={12} y={6.2} />
      {STALLS.map((s) => (
        <Stall key={s.sign} {...s} />
      ))}
      <Bokeh />
    </group>
  )
}
