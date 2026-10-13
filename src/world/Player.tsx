import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Vector3, type Group } from 'three'
import { input, playerPos } from '../game/input'
import { useGame } from '../game/store'
import { doorOf } from '../game/stations'
import type { Station } from '../game/types'
import { Person, type Look } from './Person'

const WALK = 4.2
const RUN = 7.5
const camTarget = new Vector3()
const lookAt = new Vector3()

export function Player({ spawn, look, stations }: { spawn: [number, number]; look: Look; stations: Station[] }) {
  const body = useRef<RapierRigidBody>(null)
  const vis = useRef<Group>(null)
  const speed = useRef(0)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const doors = stations.map((st) => ({ id: st.id, at: doorOf(st) }))

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(rawDt, 0.1)
    const g = useGame.getState()
    const frozen = !!(g.event || g.eventResult || g.showPosting || g.showCallUp || g.mapOpen || g.phoneOpen)

    let x = frozen ? 0 : input.x + input.joyX
    let z = frozen ? 0 : input.z + input.joyZ
    const joy = Math.hypot(input.joyX, input.joyZ)
    const len = Math.hypot(x, z)
    if (len > 1) {
      x /= len
      z /= len
    }
    const tired = g.energy < 10
    const max = (input.run || joy > 0.92) && !tired ? RUN : tired ? WALK * 0.6 : WALK
    const v = rb.linvel()
    rb.setLinvel({ x: x * max, y: v.y, z: z * max }, true)
    speed.current = Math.min(1, len) * max

    if (vis.current && len > 0.05) {
      const target = Math.atan2(x, z)
      let diff = target - vis.current.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      vis.current.rotation.y += diff * Math.min(1, dt * 12)
    }

    const p = rb.translation()
    playerPos.x = p.x
    playerPos.z = p.z
    playerPos.facing = vis.current?.rotation.y ?? 0
    if (p.y < -5) rb.setTranslation({ x: spawn[0], y: 1, z: spawn[1] }, true)

    // camera follows from behind and above; pull back a bit on tall phone screens
    const portrait = size.height > size.width
    const back = portrait ? 13 : 11
    const up = portrait ? 14.5 : 13
    camTarget.set(p.x, p.y + up, p.z + back)
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 5))
    lookAt.set(p.x, p.y + 1, p.z)
    camera.lookAt(lookAt)

    // which station is the player standing at?
    let best: string | null = null
    let bestD = 2.6
    for (const d of doors) {
      const dist = Math.hypot(d.at[0] - p.x, d.at[1] - p.z)
      if (dist < bestD) {
        bestD = dist
        best = d.id
      }
    }
    g.setNearby(best)
  })

  return (
    <RigidBody ref={body} colliders={false} position={[spawn[0], 0.2, spawn[1]]} enabledRotations={[false, false, false]} ccd>
      <CapsuleCollider args={[0.55, 0.35]} position={[0, 0.9, 0]} friction={0} />
      <group ref={vis} rotation-y={Math.PI}>
        <Person look={look} speed={speed} />
      </group>
    </RigidBody>
  )
}
