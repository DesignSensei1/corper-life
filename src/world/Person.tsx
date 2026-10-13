import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

export interface Look {
  shirt: string
  pants: string
  skin?: string
  cap?: string
  boots?: string
}

/** A simple low-poly person whose legs and arms swing with `speed.current`. */
export function Person({ look, speed }: { look: Look; speed: { current: number } }) {
  const lLeg = useRef<Group>(null)
  const rLeg = useRef<Group>(null)
  const lArm = useRef<Group>(null)
  const rArm = useRef<Group>(null)
  const phase = useRef(Math.random() * 10)
  const skin = look.skin ?? '#6d4c41'
  const boots = look.boots ?? '#212121'

  useFrame((_, dt) => {
    const v = speed.current
    phase.current += dt * (4 + v * 1.6)
    const swing = Math.min(1, v / 3) * 0.7 * Math.sin(phase.current)
    if (lLeg.current) lLeg.current.rotation.x = swing
    if (rLeg.current) rLeg.current.rotation.x = -swing
    if (lArm.current) lArm.current.rotation.x = -swing
    if (rArm.current) rArm.current.rotation.x = swing
  })

  return (
    <group>
      {/* legs pivot at hip */}
      <group ref={lLeg} position={[-0.14, 0.85, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.22]} />
          <meshStandardMaterial color={look.pants} />
        </mesh>
        <mesh position={[0, -0.8, 0.04]} castShadow>
          <boxGeometry args={[0.22, 0.14, 0.32]} />
          <meshStandardMaterial color={boots} />
        </mesh>
      </group>
      <group ref={rLeg} position={[0.14, 0.85, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.22]} />
          <meshStandardMaterial color={look.pants} />
        </mesh>
        <mesh position={[0, -0.8, 0.04]} castShadow>
          <boxGeometry args={[0.22, 0.14, 0.32]} />
          <meshStandardMaterial color={boots} />
        </mesh>
      </group>
      {/* torso */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.55, 0.72, 0.3]} />
        <meshStandardMaterial color={look.shirt} />
      </mesh>
      {/* arms pivot at shoulder */}
      <group ref={lArm} position={[-0.36, 1.5, 0]}>
        <mesh position={[0, -0.32, 0]} castShadow>
          <boxGeometry args={[0.15, 0.62, 0.16]} />
          <meshStandardMaterial color={look.shirt} />
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <boxGeometry args={[0.13, 0.12, 0.13]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      <group ref={rArm} position={[0.36, 1.5, 0]}>
        <mesh position={[0, -0.32, 0]} castShadow>
          <boxGeometry args={[0.15, 0.62, 0.16]} />
          <meshStandardMaterial color={look.shirt} />
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <boxGeometry args={[0.13, 0.12, 0.13]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      {/* head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.36, 0.38, 0.34]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* eyes so you can tell which way they face */}
      <mesh position={[-0.08, 1.84, 0.175]}>
        <boxGeometry args={[0.06, 0.06, 0.01]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[0.08, 1.84, 0.175]}>
        <boxGeometry args={[0.06, 0.06, 0.01]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {look.cap && (
        <group position={[0, 2.02, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.4, 0.12, 0.38]} />
            <meshStandardMaterial color={look.cap} />
          </mesh>
          <mesh position={[0, -0.04, 0.24]}>
            <boxGeometry args={[0.36, 0.03, 0.16]} />
            <meshStandardMaterial color={look.cap} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export const LOOKS = {
  campWhites: { shirt: '#fafafa', pants: '#fafafa', cap: '#fafafa', boots: '#fafafa' },
  khaki: { shirt: '#b9a26f', pants: '#b9a26f', cap: '#b9a26f', boots: '#1b1b1b' },
  soldier: { shirt: '#4e5b31', pants: '#4e5b31', cap: '#3b4425', boots: '#111' },
  mama: { shirt: '#e91e63', pants: '#ff9800', skin: '#5d4037', boots: '#795548' },
  civil: { shirt: '#1976d2', pants: '#37474f' },
  official: { shirt: '#ffffff', pants: '#263238' },
} satisfies Record<string, Look>
