import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Color, type AmbientLight, type DirectionalLight, type Fog, type HemisphereLight, Object3D } from 'three'
import { stationsFor, useGame } from '../game/store'
import { hourOf } from '../game/time'
import { CampWorld, TownWorld } from './Worlds'
import { Player } from './Player'
import { LOOKS } from './Person'

const NIGHT = new Color('#0d1636')
const DAY = new Color('#8fd3ff')
const DUSK = new Color('#ff9a62')
const sky = new Color()

/** Sun, ambient light and sky colour driven by the in-game clock. */
function DayLight() {
  const sun = useRef<DirectionalLight>(null)
  const amb = useRef<AmbientLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const target = useRef(new Object3D())
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const h = hourOf(useGame.getState().minutes)
    const t = (h - 6) / 12 // 0 at sunrise, 1 at sunset
    const height = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
    const daylight = Math.max(0, Math.min(1, height * 1.6))
    const duskness = Math.max(0, 1 - Math.abs(height - 0.15) / 0.25) * (t > -0.05 && t < 1.05 ? 1 : 0)

    sky.copy(NIGHT).lerp(DAY, daylight).lerp(DUSK, duskness * 0.55)
    if (!(scene.background instanceof Color)) scene.background = new Color()
    ;(scene.background as Color).copy(sky)
    if (scene.fog) (scene.fog as Fog).color.copy(sky)

    if (amb.current) amb.current.intensity = 0.14 + daylight * 0.65
    if (hemi.current) hemi.current.intensity = 0.08 + daylight * 0.3
    if (sun.current) {
      sun.current.intensity = 0.15 + daylight * 1.7
      sun.current.color.set(duskness > 0.3 ? '#ffc48a' : daylight > 0.1 ? '#fff6e5' : '#9fb4ff')
      // keep the shadow camera around the player area (the camera looks at the player)
      const cx = camera.position.x
      const cz = camera.position.z - 14
      const ang = Math.PI * Math.min(1, Math.max(0, t))
      sun.current.position.set(cx + Math.cos(ang) * 30, 10 + height * 35, cz + 12)
      target.current.position.set(cx, 0, cz)
      target.current.updateMatrixWorld()
    }
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.6} />
      <hemisphereLight ref={hemi} args={['#cfe8ff', '#5d4a2c', 0.35]} />
      <directionalLight
        ref={sun}
        castShadow
        target={target.current}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
      />
      <primitive object={target.current} />
      <fog attach="fog" args={['#8fd3ff', 60, 130]} />
    </>
  )
}

/** Advances the game clock a few times a second. */
function Clock() {
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += Math.min(dt, 0.25)
    if (acc.current >= 0.25) {
      useGame.getState().tick(acc.current)
      acc.current = 0
    }
  })
  return null
}

export function Scene() {
  const phase = useGame((s) => s.phase)
  const stations = stationsFor(phase)
  const isTown = phase === 'ppa'
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 50, position: [0, 14, 60], near: 0.5, far: 300 }} gl={{ antialias: true }}>
      <DayLight />
      <Clock />
      <Suspense fallback={null}>
        <Physics key={phase} gravity={[0, -20, 0]}>
          {isTown ? <TownWorld /> : <CampWorld />}
          <Player spawn={isTown ? [-24, -13] : [0, 41]} look={isTown ? LOOKS.khaki : LOOKS.campWhites} stations={stations} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
