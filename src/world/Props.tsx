import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { Group, Mesh } from 'three'
import type { Station } from '../game/types'
import { doorOf } from '../game/stations'
import { useGame } from '../game/store'
import { Person, type Look } from './Person'

export function Label({ text, y = 0, small }: { text: string; y?: number; small?: boolean }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={small ? 16 : 22} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className={small ? 'label small' : 'label'}>{text}</div>
    </Html>
  )
}

export function Ground({ size, color }: { size: number; color: string }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[size / 2, 0.5, size / 2]} position={[0, -0.5, 0]} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

/** Flat coloured patch on the ground (paths, roads, parade ground). */
export function Patch({ pos, size, color, y = 0.02 }: { pos: [number, number]; size: [number, number]; color: string; y?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[pos[0], y, pos[1]]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export function Wall({ pos, size, color = '#9e9e9e' }: { pos: [number, number]; size: [number, number, number]; color?: string }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[pos[0], size[1] / 2, pos[1]]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

/** Four walls around a square area of half-width `r`, with an optional gate gap on +z. */
export function Fence({ r, gate = 0, color }: { r: number; gate?: number; color?: string }) {
  const h = 2.2
  const t = 0.6
  const side = (r * 2 - gate) / 2
  return (
    <>
      <Wall pos={[0, -r]} size={[r * 2, h, t]} color={color} />
      <Wall pos={[-r, 0]} size={[t, h, r * 2]} color={color} />
      <Wall pos={[r, 0]} size={[t, h, r * 2]} color={color} />
      {gate > 0 ? (
        <>
          <Wall pos={[-r + side / 2, r]} size={[side, h, t]} color={color} />
          <Wall pos={[r - side / 2, r]} size={[side, h, t]} color={color} />
          {/* gate stops the player walking out */}
          <RigidBody type="fixed" colliders={false} position={[0, 1, r + 0.5]}>
            <CuboidCollider args={[gate / 2, 1, 0.3]} />
          </RigidBody>
        </>
      ) : (
        <Wall pos={[0, r]} size={[r * 2, h, t]} color={color} />
      )}
    </>
  )
}

export function Tree({ pos, s = 1 }: { pos: [number, number]; s?: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[pos[0], 0, pos[1]]}>
      <CuboidCollider args={[0.3 * s, 1.5 * s, 0.3 * s]} position={[0, 1.5 * s, 0]} />
      <mesh position={[0, 1.4 * s, 0]} castShadow>
        <cylinderGeometry args={[0.18 * s, 0.28 * s, 2.8 * s, 6]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      <mesh position={[0, 3.4 * s, 0]} castShadow>
        <icosahedronGeometry args={[1.5 * s, 0]} />
        <meshStandardMaterial color="#388e3c" flatShading />
      </mesh>
    </RigidBody>
  )
}

export function Palm({ pos }: { pos: [number, number] }) {
  const fronds = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), [])
  return (
    <RigidBody type="fixed" colliders={false} position={[pos[0], 0, pos[1]]}>
      <CuboidCollider args={[0.25, 2.5, 0.25]} position={[0, 2.5, 0]} />
      <mesh position={[0, 2.5, 0]} rotation-z={0.06} castShadow>
        <cylinderGeometry args={[0.14, 0.24, 5, 6]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>
      {fronds.map((a) => (
        <mesh key={a} position={[Math.sin(a) * 1.1, 4.9, Math.cos(a) * 1.1]} rotation={[Math.cos(a) * 0.5, a, -Math.sin(a) * 0.5]} castShadow>
          <boxGeometry args={[0.5, 0.06, 2.4]} />
          <meshStandardMaterial color="#43a047" />
        </mesh>
      ))}
    </RigidBody>
  )
}

function Marker({ at, active }: { at: [number, number]; active: boolean }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.08
    ref.current.scale.set(k, k, 1)
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[at[0], 0.05, at[1]]}>
      <ringGeometry args={[0.9, 1.15, 32]} />
      <meshBasicMaterial color={active ? '#00e676' : '#ffd600'} transparent opacity={0.9} />
    </mesh>
  )
}

export function StationBuilding({ st, decor }: { st: Station; decor?: boolean }) {
  const { size, color, roof, kind = 'house' } = st.building
  const [w, h, d] = size
  const door = doorOf(st)
  const active = useGame((s) => s.nearby === st.id)
  const marker = decor ? null : <Marker at={door} active={active} />

  if (kind === 'open') {
    return (
      <>
        {marker}
        <group position={[door[0], 0, door[1]]}>
          <Label text={st.name} y={3} />
        </group>
      </>
    )
  }

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[st.pos[0], 0, st.pos[1]]}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
        {kind === 'house' && <House w={w} h={h} d={d} color={color} roof={roof} />}
        {kind === 'tent' && <Tent w={w} h={h} d={d} color={color} roof={roof} />}
        {kind === 'stalls' && <Stalls w={w} h={h} d={d} color={color} roof={roof} />}
        <Label text={st.name} y={h + 2.2} />
      </RigidBody>
      {marker}
    </>
  )
}

type Dims = { w: number; h: number; d: number; color: string; roof: string }

function House({ w, h, d, color, roof }: Dims) {
  const windows = Math.max(1, Math.floor(w / 4))
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* corrugated-style sloping roof */}
      <mesh position={[0, h + 0.6, 0]} rotation-y={Math.PI / 4} scale={[w / Math.SQRT2 + 0.6, 1, d / Math.SQRT2 + 0.6]} castShadow>
        <coneGeometry args={[1, 1.4, 4]} />
        <meshStandardMaterial color={roof} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.2, d / 2 + 0.02]}>
        <planeGeometry args={[1.6, 2.4]} />
        <meshStandardMaterial color="#4e342e" />
      </mesh>
      {Array.from({ length: windows }, (_, i) => {
        const x = -w / 2 + ((i + 0.5) * w) / windows
        if (Math.abs(x) < 1.4) return null
        return (
          <mesh key={i} position={[x, h * 0.6, d / 2 + 0.02]}>
            <planeGeometry args={[1.2, 1]} />
            <meshStandardMaterial color="#90caf9" emissive="#1e3a5f" />
          </mesh>
        )
      })}
    </group>
  )
}

function Tent({ w, h, d, color, roof }: Dims) {
  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <boxGeometry args={[w * 0.96, h * 0.8, d * 0.96]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h + 0.3, 0]} rotation-y={Math.PI / 4} scale={[w / Math.SQRT2 + 0.4, 1, d / Math.SQRT2 + 0.4]} castShadow>
        <coneGeometry args={[1, 1.4, 4]} />
        <meshStandardMaterial color={roof} flatShading />
      </mesh>
      {/* open front flap */}
      <mesh position={[0, 1.1, d / 2 * 0.96 + 0.02]}>
        <planeGeometry args={[2.4, 2.2]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
    </group>
  )
}

const STALL_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa']

function Stalls({ w, h, d, color, roof }: Dims) {
  const n = Math.max(3, Math.round(w / 3.5))
  const sw = w / n
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + sw * (i + 0.5)
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.5, d * 0.25]} castShadow>
              <boxGeometry args={[sw * 0.9, 1, d * 0.3]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.5, -d * 0.2]} castShadow>
              <boxGeometry args={[sw * 0.9, h, d * 0.5]} />
              <meshStandardMaterial color="#8d6e63" />
            </mesh>
            <mesh position={[0, h + 0.1, 0.2]} rotation-x={0.2} castShadow>
              <boxGeometry args={[sw * 0.98, 0.1, d * 1.05]} />
              <meshStandardMaterial color={i % 2 ? roof : STALL_COLORS[i % STALL_COLORS.length]} />
            </mesh>
            {/* produce on the table */}
            <mesh position={[-sw * 0.2, 1.1, d * 0.25]}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshStandardMaterial color={STALL_COLORS[(i + 2) % STALL_COLORS.length]} />
            </mesh>
            <mesh position={[sw * 0.15, 1.1, d * 0.25]}>
              <sphereGeometry args={[0.16, 6, 6]} />
              <meshStandardMaterial color="#ff7043" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Ambient character that walks a loop between waypoints, or stands still. */
export function NPC({ look, path, name, speed = 1.6 }: { look: Look; path: [number, number][]; name?: string; speed?: number }) {
  const ref = useRef<Group>(null)
  const sp = useRef(0)
  const state = useRef({ i: 0, x: path[0][0], z: path[0][1] })
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    if (path.length < 2) {
      sp.current = 0
      return
    }
    const st = state.current
    const [tx, tz] = path[(st.i + 1) % path.length]
    const dx = tx - st.x
    const dz = tz - st.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.2) {
      st.i = (st.i + 1) % path.length
      return
    }
    const step = Math.min(dist, speed * Math.min(dt, 0.1))
    st.x += (dx / dist) * step
    st.z += (dz / dist) * step
    g.position.set(st.x, 0, st.z)
    g.rotation.y = Math.atan2(dx, dz)
    sp.current = speed
  })
  return (
    <group ref={ref} position={[path[0][0], 0, path[0][1]]}>
      <Person look={look} speed={sp} />
      {name && <Label text={name} y={2.6} small />}
    </group>
  )
}

export function FlagPole({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 8, 6]} />
        <meshStandardMaterial color="#bdbdbd" />
      </mesh>
      {/* Nigerian flag: green white green */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.35 + i * 0.6, 7.3, 0]}>
          <boxGeometry args={[0.6, 1.1, 0.03]} />
          <meshStandardMaterial color={i === 1 ? '#ffffff' : '#008751'} />
        </mesh>
      ))}
    </group>
  )
}

export function Car({ pos, color, rot = 0 }: { pos: [number, number]; color: string; rot?: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[pos[0], 0, pos[1]]} rotation-y={rot}>
      <CuboidCollider args={[1, 0.8, 2]} position={[0, 0.8, 0]} />
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.9, 0.7, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.7, 0.6, 2.2]} />
        <meshStandardMaterial color="#cfd8dc" />
      </mesh>
      {[-1, 1].map((x) =>
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.95, 0.3, z]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 10]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )),
      )}
    </RigidBody>
  )
}

/** A yellow keke (tricycle) that loops along a road. */
export function Keke({ path, speed = 5 }: { path: [number, number][]; speed?: number }) {
  const ref = useRef<Group>(null)
  const st = useRef({ i: 0, x: path[0][0], z: path[0][1] })
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = st.current
    const [tx, tz] = path[(s.i + 1) % path.length]
    const dx = tx - s.x
    const dz = tz - s.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.3) {
      s.i = (s.i + 1) % path.length
      return
    }
    const step = Math.min(dist, speed * Math.min(dt, 0.1))
    s.x += (dx / dist) * step
    s.z += (dz / dist) * step
    g.position.set(s.x, 0, s.z)
    g.rotation.y = Math.atan2(dx, dz)
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.3, 1.1, 2.2]} />
        <meshStandardMaterial color="#fdd835" />
      </mesh>
      <mesh position={[0, 1.65, -0.1]} castShadow>
        <boxGeometry args={[1.4, 0.12, 2.4]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[0, 0.3, 1.1]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.3, 0.3, 0.15, 10]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.3, -0.7]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.3, 0.3, 0.15, 10]} />
          <meshStandardMaterial color="#212121" />
        </mesh>
      ))}
    </group>
  )
}
