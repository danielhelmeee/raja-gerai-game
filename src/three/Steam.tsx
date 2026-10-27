import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeSoftSprite } from './textures'

const vert = /* glsl */ `
  attribute float aAge;
  attribute float aSize;
  varying float vAge;
  void main() {
    vAge = aAge;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + aAge * 2.5) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAge;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    float fade = smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
    gl_FragColor = vec4(uColor, t.a * fade * uOpacity);
  }
`

/** Rising steam or smoke from a point. */
export function Steam({
  position,
  count = 40,
  spread = 0.15,
  rise = 1.6,
  life = 3,
  size = 0.35,
  color = '#FFF6EA',
  opacity = 0.28,
}: {
  position: [number, number, number]
  count?: number
  spread?: number
  rise?: number
  life?: number
  size?: number
  color?: string
  opacity?: number
}) {
  const points = useRef<THREE.Points>(null!)
  const { geo, seeds } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aAge', new THREE.BufferAttribute(new Float32Array(count), 1))
    const sizes = new Float32Array(count).map(() => size * (0.6 + Math.random() * 0.8))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    const seeds = Array.from({ length: count }, () => ({
      offset: Math.random() * life,
      dx: (Math.random() - 0.5) * spread,
      dz: (Math.random() - 0.5) * spread,
      sway: Math.random() * Math.PI * 2,
    }))
    return { geo, seeds }
  }, [count, spread, life, size])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: makeSoftSprite() }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
      }),
    [color, opacity],
  )

  useFrame(({ clock }) => {
    const pos = geo.attributes.position as THREE.BufferAttribute
    const age = geo.attributes.aAge as THREE.BufferAttribute
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      const a = ((t + s.offset) % life) / life
      const drift = a * a
      pos.setXYZ(
        i,
        s.dx * (1 + a * 3) + Math.sin(t * 0.8 + s.sway) * 0.15 * a + drift * 0.3,
        a * rise,
        s.dz * (1 + a * 3) + Math.cos(t * 0.6 + s.sway) * 0.12 * a,
      )
      age.setX(i, a)
    })
    pos.needsUpdate = true
    age.needsUpdate = true
  })

  return <points ref={points} geometry={geo} material={mat} position={position} frustumCulled={false} />
}

/** Kopi cup on the table and a smoky satay grill behind the hawkers. */
export function SteamyProps() {
  return (
    <group>
      <group position={[-5.05, 0, 3.05]}>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.32, 0.3, 0.04, 28]} />
          <meshStandardMaterial color="#FBF8F0" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.32, 28]} />
          <meshStandardMaterial color="#FBF8F0" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.205, 0.17, 0.06, 28]} />
          <meshStandardMaterial color="#2F8F5B" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.355, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#2B160C" roughness={0.2} />
        </mesh>
        <Steam position={[0, 0.38, 0]} count={26} spread={0.12} rise={1.3} life={2.6} size={0.22} opacity={0.22} />
      </group>
      <group position={[-8.6, 0, -6.6]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[2.4, 0.3, 0.7]} />
          <meshStandardMaterial color="#333" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.07, 0]}>
          <boxGeometry args={[2.2, 0.04, 0.5]} />
          <meshBasicMaterial color="#FF6A2A" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.4, 0.3]} color="#FF7A2A" intensity={8} distance={6} decay={1.6} />
        <Steam position={[0, 1.15, 0]} count={60} spread={1.8} rise={4.5} life={4.5} size={1.1} color="#D8CEC6" opacity={0.18} />
      </group>
    </group>
  )
}
