import { useMemo } from 'react'
import { useGame } from '../game/store'
import { hourOf, weekdayOf } from '../game/time'
import { CAMP_STATIONS, TOWN_STATIONS } from '../game/stations'
import type { BuildingSpec, PpaKind, Station } from '../game/types'
import { PPA_WORK, bestMate } from '../game/people'
import { Car, Fence, FlagPole, Ground, Keke, Label, NPC, Palm, Patch, StationBuilding, Tree, Wall } from './Props'
import { LOOKS } from './Person'

const decor = (id: string, name: string, pos: [number, number], size: [number, number, number], color: string, roof: string): Station => ({
  id,
  name,
  pos,
  building: { size, color, roof },
  actions: [],
})

/** Deterministic pseudo-random scatter so trees don't move between renders. */
function scatter(seed: number, n: number, r: number, avoid: (x: number, z: number) => boolean): [number, number][] {
  const out: [number, number][] = []
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  let guard = 0
  while (out.length < n && guard++ < n * 40) {
    const x = (rnd() * 2 - 1) * r
    const z = (rnd() * 2 - 1) * r
    if (!avoid(x, z)) out.push([x, z])
  }
  return out
}

function inStation(stations: Station[], x: number, z: number, pad = 5) {
  return stations.some((st) => {
    const [w, , d] = st.building.size
    return Math.abs(x - st.pos[0]) < w / 2 + pad && Math.abs(z - st.pos[1]) < d / 2 + pad + 3
  })
}

// ------------------------------------------------------------------ CAMP

export const CAMP_DECOR = [
  decor('hostelA', 'Hostel A', [0, -38], [16, 4, 8], '#e8dcc0', '#8d6e63'),
  decor('admin', 'Camp Admin', [-38, 34], [10, 4.5, 7], '#fff3e0', '#2e7d32'),
]

export function CampWorld() {
  const campName = useGame((s) => s.posting?.camp ?? '')
  const all = [...CAMP_STATIONS, ...CAMP_DECOR]
  const trees = useMemo(
    () =>
      scatter(7, 40, 49, (x, z) => inStation(all, x, z) || (Math.abs(x) < 21 && z > -16 && z < 12) || (Math.abs(x) < 4 && z > 8)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  return (
    <group>
      <Ground size={240} color="#689f38" />
      <Patch pos={[0, 0]} size={[104, 104]} color="#d2bf94" y={0.01} />
      {/* parade ground with white lines */}
      <Patch pos={[0, -2]} size={[36, 22]} color="#bfa877" y={0.02} />
      {[-10.6, 6.6].map((z) => (
        <Patch key={z} pos={[0, z]} size={[36, 0.3]} color="#fff" y={0.03} />
      ))}
      {[-17.8, 17.8].map((x) => (
        <Patch key={x} pos={[x, -2]} size={[0.3, 22]} color="#fff" y={0.03} />
      ))}
      <Patch pos={[0, 30]} size={[4, 44]} color="#a1887f" y={0.025} />
      <FlagPole pos={[-1, -14]} />
      {/* raised dais for the camp commandant */}
      <Wall pos={[6, -16]} size={[8, 0.6, 3]} color="#8d6e63" />

      <Fence r={52} gate={8} color="#bdbdbd" />
      <group position={[0, 0, 53]}>
        <Label text={`NYSC ORIENTATION CAMP · ${campName.toUpperCase()}`} y={4} />
      </group>
      {[-4.5, 4.5].map((x) => (
        <Wall key={x} pos={[x, 52]} size={[1.2, 4, 1.2]} color="#2e7d32" />
      ))}

      {CAMP_STATIONS.map((st) => (
        <StationBuilding key={st.id} st={st} />
      ))}
      {CAMP_DECOR.map((st) => (
        <StationBuilding key={st.id} st={st} decor />
      ))}

      {/* bonfire logs at the social arena */}
      <group position={[-20, 0, 24]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.2, 0]} rotation={[0, (i * Math.PI) / 3, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 2, 6]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
        ))}
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.5, 1.1, 6]} />
          <meshStandardMaterial color="#ff6d00" emissive="#ff3d00" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {trees.map((p, i) => (i % 3 === 0 ? <Palm key={i} pos={p} /> : <Tree key={i} pos={p} s={0.9 + (i % 4) * 0.12} />))}

      <NPC look={LOOKS.soldier} name="Soldier" path={[[4, -6]]} />
      <NPC look={LOOKS.soldier} name="Soldier" path={[[-16, 12], [16, 12], [16, -14], [-16, -14]]} speed={1.4} />
      <NPC look={LOOKS.official} name="Camp official" path={[[17, 34.4]]} />
      <NPC look={LOOKS.mama} name="Iya Basira" path={[[24, -1.6]]} />
      <Bunkmates />
      <NPC look={LOOKS.campWhites} path={[[-6, 40], [-6, 14], [-24, 14], [-24, -20]]} />
      <NPC look={LOOKS.campWhites} path={[[10, -24], [30, -24], [30, 0], [10, 0]]} speed={1.3} />
      <NPC look={LOOKS.campWhites} path={[[-30, 18], [-10, 18], [-10, 36]]} speed={1.8} />
      <NPC look={LOOKS.campWhites} path={[[22, 40], [36, 40], [36, 10]]} />
      <NPC look={LOOKS.campWhites} path={[[-40, -20], [-40, -40], [-12, -42]]} speed={1.2} />
    </group>
  )
}

// ------------------------------------------------------------------ TOWN

export const TOWN_DECOR = [decor('h2', 'Pharmacy', [-12, -10], [7, 3.5, 5], '#e0f7fa', '#00838f')]

const GOWNS = ['#ffffff', '#f8bbd0', '#fff59d', '#b3e5fc', '#c5e1a5', '#ffccbc', '#d1c4e9']
const dress = (i: number) => ({ shirt: GOWNS[i % GOWNS.length], pants: GOWNS[(i + 3) % GOWNS.length] })
const kaftan = (i: number) => ({ shirt: ['#ffffff', '#eceff1', '#d7ccc8', '#b2dfdb'][i % 4], pants: ['#ffffff', '#eceff1', '#d7ccc8', '#b2dfdb'][i % 4], cap: '#fafafa' })

/** Customers at the bank, worshippers at church on Sunday and at the mosque on Friday. */
function TownLife() {
  const wd = useGame((s) => weekdayOf(s.minutes))
  const h = useGame((s) => Math.floor(hourOf(s.minutes)))
  const bankOpen = wd <= 4 && h >= 8 && h < 16
  const sunday = wd === 6 && h >= 7 && h < 12
  const fellowship = (wd === 2 && h >= 17 && h < 20) || (wd === 5 && h >= 16 && h < 19)
  const jumat = wd === 4 && h >= 12 && h < 15
  const prayerTime = [5, 13, 16, 19].includes(h)
  return (
    <>
      {/* bank: security man always, a queue while the banking hall is open */}
      <NPC look={{ shirt: '#263238', pants: '#263238', cap: '#263238' }} name="Bank security" path={[[-12.5, 16.5]]} />
      {bankOpen && (
        <>
          <NPC look={LOOKS.official} name="Teller" path={[[-8, 16.2]]} />
          {[0, 1, 2, 3].map((i) => (
            <NPC key={i} look={i === 2 ? LOOKS.khaki : dress(i)} path={[[-4 + i * 1.3, 17.5 + i * 0.4]]} />
          ))}
        </>
      )}
      <NPC look={LOOKS.civil} path={[[-2, 20], [-6, 20], [-6, 17.6]]} speed={1} />

      {/* church */}
      {(sunday || fellowship) && <NPC look={{ shirt: '#212121', pants: '#212121' }} name="Pastor" path={[[-40, -7.8]]} />}
      {sunday &&
        Array.from({ length: 10 }, (_, i) => <NPC key={i} look={i % 4 === 1 ? LOOKS.khaki : dress(i)} path={[[-45 + (i % 5) * 2.4, -5 + Math.floor(i / 5) * 1.6]]} />)}
      {sunday && <NPC look={dress(5)} path={[[-20, -4], [-36, -4], [-36, -6]]} speed={1.1} />}
      {fellowship && [0, 1, 2].map((i) => <NPC key={i} look={LOOKS.khaki} path={[[-43 + i * 3, -5.5]]} />)}

      {/* mosque */}
      <NPC look={kaftan(0)} name="Imam" path={[[40, 39.6]]} />
      {jumat &&
        Array.from({ length: 12 }, (_, i) => <NPC key={i} look={i % 5 === 2 ? LOOKS.khaki : kaftan(i)} path={[[35 + (i % 6) * 2, 42 + Math.floor(i / 6) * 1.8]]} />)}
      {(jumat || prayerTime) && <NPC look={kaftan(3)} path={[[16, 44], [36, 44], [36, 41]]} speed={1.1} />}
    </>
  )
}

const BUNK_PATHS: [number, number][][] = [
  [[-30, -22], [-14, -22], [-14, -16], [-30, -16]],
  [[-12, -20], [-12, 0], [-4, 0]],
  [[-34, -18], [-34, 4], [-24, 4]],
  [[-20, -20], [6, -20], [6, -28]],
]

/** Your four bunkmates, wandering between the hostel and the parade ground. */
function Bunkmates() {
  const mates = useGame((s) => s.mates)
  return (
    <>
      {mates.map((m, i) => (
        <NPC key={m.name} look={{ shirt: m.shirt, pants: '#fafafa', cap: '#fafafa', boots: '#fafafa' }} name={m.name} path={BUNK_PATHS[i % BUNK_PATHS.length]} speed={1.2 + i * 0.15} />
      ))}
    </>
  )
}

/** Your PPA building changes with the kind of posting you got. */
const PPA_LOOK: Record<PpaKind, BuildingSpec> = {
  school: TOWN_STATIONS.find((s) => s.id === 'ppa')!.building,
  hospital: { size: [18, 5, 9], color: '#ffffff', roof: '#c62828' },
  lga: { size: [16, 5, 9], color: '#fff3e0', roof: '#6d4c41' },
  bank: { size: [16, 8, 9], color: '#b0bec5', roof: '#1a237e' },
  ministry: { size: [18, 7, 9], color: '#fff8e1', roof: '#2e7d32' },
  corporate: { size: [14, 10, 9], color: '#90caf9', roof: '#0d47a1' },
}

const bossName = (k: PpaKind) => {
  const b = PPA_WORK[k].boss.replace(/^(The|Your) /, '')
  return b[0].toUpperCase() + b.slice(1)
}

export function TownWorld() {
  const kind = useGame((s) => s.posting?.kind ?? 'school')
  const buddy = useGame((s) => bestMate(s))
  const all = [...TOWN_STATIONS, ...TOWN_DECOR]
  const trees = useMemo(
    () => scatter(11, 34, 51, (x, z) => inStation(all, x, z) || Math.abs(z) < 7 || Math.abs(x - 10) < 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  return (
    <group>
      <Ground size={240} color="#7cb342" />
      {/* roads */}
      <Patch pos={[0, 0]} size={[110, 8]} color="#455a64" y={0.02} />
      <Patch pos={[10, 0]} size={[8, 110]} color="#455a64" y={0.021} />
      {Array.from({ length: 18 }, (_, i) => (
        <Patch key={i} pos={[-52 + i * 6, 0]} size={[2.5, 0.25]} color="#fff59d" y={0.03} />
      ))}
      {/* red-earth paths to buildings */}
      <Patch pos={[-24, -10]} size={[3, 12]} color="#bf8a5a" y={0.015} />
      <Patch pos={[26, -13]} size={[3, 10]} color="#bf8a5a" y={0.015} />
      <Patch pos={[-26, 10]} size={[3, 6]} color="#bf8a5a" y={0.015} />
      <Patch pos={[-4, -24]} size={[3, 18]} color="#bf8a5a" y={0.015} />

      <Fence r={55} color="#a1887f" />

      {TOWN_STATIONS.map((st) => (
        <StationBuilding key={st.id} st={st.id === 'ppa' ? { ...st, building: PPA_LOOK[kind] } : st} />
      ))}
      {TOWN_DECOR.map((st) => (
        <StationBuilding key={st.id} st={st} decor />
      ))}
      <TownLife />

      <Car pos={[-14, 6]} color="#c62828" rot={Math.PI / 2} />
      <Car pos={[20, -6]} color="#1565c0" rot={Math.PI / 2} />
      <Car pos={[14.5, 30]} color="#f5f5f5" />
      <Keke path={[[-50, 2], [50, 2], [50, -2], [-50, -2]]} speed={6} />
      <Keke path={[[12, -50], [12, 50], [8, 50], [8, -50]]} speed={5} />

      {trees.map((p, i) => (i % 2 === 0 ? <Palm key={i} pos={p} /> : <Tree key={i} pos={p} s={0.9 + (i % 3) * 0.15} />))}

      <NPC look={LOOKS.official} name={bossName(kind)} path={[[22, -19.5], [30, -19.5]]} speed={0.8} />
      <NPC look={LOOKS.civil} name="LGI" path={[[-22, 22.5]]} />
      <NPC look={LOOKS.mama} name="Mama Put" path={[[3, 30.5]]} />
      {buddy && <NPC look={{ shirt: buddy.shirt, pants: '#37474f' }} name={buddy.name} path={[[-6, 22], [8, 22], [8, 18]]} speed={1.1} />}
      <NPC look={LOOKS.khaki} path={[[-30, 8], [30, 8]]} speed={1.5} />
      <NPC look={LOOKS.civil} path={[[16, -40], [16, 40]]} speed={1.7} />
      <NPC look={{ shirt: '#8e24aa', pants: '#4a148c' }} path={[[-46, -30], [-10, -30], [-10, -46]]} />
      <NPC look={{ shirt: '#ff7043', pants: '#5d4037' }} path={[[20, 24], [44, 24], [44, 40]]} speed={1.3} />
      <NPC look={{ shirt: '#4caf50', pants: '#212121' }} name="Okada man" path={[[6, 6]]} />
    </group>
  )
}
