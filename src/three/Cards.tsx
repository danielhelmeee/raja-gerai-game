import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { ALL_CARDS } from '../game/cards'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/settings'
import { cilokTargetId, computeTargets, DECK_POS, type CardTarget, type Seat } from './layout'
import { CARD_H, CARD_W, getCardBack, getCardTexture, roundedRectGeometry } from './textures'

const frontGeo = roundedRectGeometry(CARD_W, CARD_H, 0.06)
const backGeo = roundedRectGeometry(CARD_W, CARD_H, 0.06)
const edgeGeo = roundedRectGeometry(CARD_W + 0.012, CARD_H + 0.012, 0.064)
const edgeMat = new THREE.MeshStandardMaterial({ color: '#E9DFC6', roughness: 1 })

type Glow = 'none' | 'select' | 'tutorial' | 'cilok'
const GLOW_COLOR: Record<Exclude<Glow, 'none'>, THREE.Color> = {
  select: new THREE.Color('#00A859'),
  tutorial: new THREE.Color('#00E07A'),
  cilok: new THREE.Color('#FF4A3A'),
}

const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ')
const tmpQuat = new THREE.Quaternion()
const tmpVec = new THREE.Vector3()

interface CardProps {
  id: string
  target: CardTarget
  glow: Glow
  dealSeq: number
  dealDelay: number
  interactive: boolean
  onPick: (id: string) => void
  onHover: (id: string | null) => void
}

function Card3D({ id, target, glow, dealSeq, dealDelay, interactive, onPick, onHover }: CardProps) {
  const group = useRef<THREE.Group>(null!)
  const vel = useRef(new THREE.Vector3())
  const holdUntil = useRef(0)
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({ map: getCardBack(), roughness: 0.85 }), [])
  const frontMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: getCardTexture(id), roughness: 0.92, emissive: new THREE.Color('#000000') }),
    [id],
  )

  // On every deal, snap back into the deck and wait for this card's turn to fly out.
  useEffect(() => {
    if (!dealSeq || !group.current) return
    group.current.position.set(DECK_POS[0], 0.02 + Math.random() * 0.2, DECK_POS[2])
    group.current.quaternion.setFromEuler(tmpEuler.set(Math.PI / 2, 0.2, 0))
    vel.current.set(0, 0, 0)
    holdUntil.current = performance.now() + dealDelay
  }, [dealSeq, dealDelay])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const d = Math.min(dt, 1 / 30)
    if (performance.now() < holdUntil.current) return
    tmpVec.set(target.pos[0], target.pos[1], target.pos[2])
    // Arc over the table when travelling far.
    const dx = tmpVec.x - g.position.x
    const dz = tmpVec.z - g.position.z
    const dist = Math.hypot(dx, dz)
    tmpVec.y += Math.min(dist * 0.35, 1.1)
    const k = 90
    const c = 2 * Math.sqrt(k) * 0.95
    vel.current.x += (k * (tmpVec.x - g.position.x) - c * vel.current.x) * d
    vel.current.y += (k * (tmpVec.y - g.position.y) - c * vel.current.y) * d
    vel.current.z += (k * (tmpVec.z - g.position.z) - c * vel.current.z) * d
    g.position.addScaledVector(vel.current, d)
    tmpQuat.setFromEuler(tmpEuler.set(target.rot[0], target.rot[1], target.rot[2]))
    g.quaternion.slerp(tmpQuat, 1 - Math.exp(-11 * d))
    const sc = THREE.MathUtils.lerp(g.scale.x, target.scale ?? 1, 1 - Math.exp(-8 * d))
    g.scale.setScalar(sc)

    if (glow === 'none') frontMat.emissiveIntensity = 0
    else {
      frontMat.emissive.copy(GLOW_COLOR[glow])
      const pulse = glow === 'select' ? 0.22 : 0.25 + Math.sin(state.clock.elapsedTime * 6) * 0.18
      frontMat.emissiveIntensity = pulse
    }
  })

  return (
    <group
      ref={group}
      position={[DECK_POS[0], 0.02, DECK_POS[2]]}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              onHover(id)
              document.body.style.cursor = 'pointer'
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              onHover(null)
              document.body.style.cursor = ''
            }
          : undefined
      }
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              onPick(id)
            }
          : undefined
      }
    >
      <mesh geometry={frontGeo} material={frontMat} position={[0, 0, 0.003]} castShadow />
      <mesh geometry={edgeGeo} material={edgeMat} />
      <mesh geometry={backGeo} material={backMat} position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

export function Cards({ seats }: { seats: Seat[] }) {
  const { state, selected, toggleSelect, highlights, cilokPreview, screen } = useGame()
  const { settings } = useSettings()
  const { viewport, camera, size } = useThree()
  const handScale = size.width / size.height < 0.85 ? 1.45 : 1
  const [hovered, setHovered] = useState<string | null>(null)

  // Hand width that fits the screen at the hand's depth.
  const handWidth = useMemo(() => {
    const vp = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0.95, 3.2))
    return Math.max(2.2, Math.min(vp.width * 0.86 - CARD_W * handScale, 6.3))
  }, [viewport, camera, handScale])

  const targets = useMemo(
    () => computeTargets(state, seats, { selected, hovered, sortMode: settings.sortMode, handWidth, handScale }),
    [state, seats, selected, hovered, settings.sortMode, handWidth, handScale],
  )

  const dealEvent = [...state.events].reverse().find((e) => e.type === 'deal')
  const dealSeq = dealEvent?.seq ?? 0

  const dealOrder = useMemo(() => {
    const order = new Map<string, number>()
    const n = state.players.length
    state.players.forEach((p, pi) => p.hand.forEach((c, i) => order.set(c.id, (i * n + pi) * 45)))
    return order
    // Only recompute on a new deal so cards don't re-stagger mid-round.
  }, [dealSeq])

  const tutorialIds = new Set(highlights.flatMap((h) => (h.kind === 'cards' ? h.ids : [])))
  const handGlow = highlights.some((h) => h.kind === 'hand')
  const cilokId = cilokPreview ? cilokTargetId(state) : null
  const canInteract = screen === 'game' && state.status === 'playing'

  return (
    <group>
      {ALL_CARDS.map((c) => {
        const t = targets.get(c.id)!
        const glow: Glow =
          c.id === cilokId
            ? 'cilok'
            : selected.includes(c.id)
              ? 'select'
              : tutorialIds.has(c.id) || (handGlow && t.zone === 'hand')
                ? 'tutorial'
                : 'none'
        return (
          <Card3D
            key={c.id}
            id={c.id}
            target={t}
            glow={glow}
            dealSeq={dealSeq}
            dealDelay={dealOrder.get(c.id) ?? 0}
            interactive={canInteract && t.zone === 'hand'}
            onPick={toggleSelect}
            onHover={setHovered}
          />
        )
      })}
    </group>
  )
}
