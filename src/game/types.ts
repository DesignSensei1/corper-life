export type Phase = 'menu' | 'camp' | 'ppa' | 'ended'

export interface Effect {
  energy?: number
  hunger?: number
  mood?: number
  money?: number
  rating?: number
  skills?: number
  project?: number
  msg?: string
  /** label for the wallet history when money changes */
  tx?: string
}

export interface Tx {
  day: number
  label: string
  amount: number
}

export interface MonthProgress {
  ppaDays: number
  cds: number
  cleared: boolean
}

export interface Posting {
  state: string
  camp: string
  lga: string
  ppa: string
}

export interface GameData {
  phase: Phase
  name: string
  minutes: number
  energy: number
  hunger: number
  mood: number
  money: number
  rating: number
  skills: number
  project: number
  posting: Posting | null
  month: MonthProgress
  monthsCleared: number
  monthsMissed: number
  txs: Tx[]
  /** generic counters and flags: drills, lectures, registered, food, last-done days... */
  f: Record<string, number>
}

export interface Action {
  id: string
  label: string
  /** whole-hour window [from, to) when it can be started */
  window?: [number, number]
  /** 0 = Monday ... 6 = Sunday */
  weekdays?: number[]
  oncePerDay?: boolean
  duration: number | ((s: GameData) => number)
  cost?: number
  sleeping?: boolean
  effect: Effect | ((s: GameData) => Effect)
  /** extra rule; return a reason string when blocked */
  check?: (s: GameData) => string | null
  /** state changes besides the effect (counters, flags) */
  done?: (s: GameData) => Partial<GameData>
  /** hide entirely instead of showing a reason */
  hidden?: (s: GameData) => boolean
}

export interface BuildingSpec {
  size: [number, number, number]
  color: string
  roof: string
  kind?: 'house' | 'tent' | 'stalls' | 'open'
}

export interface Station {
  id: string
  name: string
  /** centre of the building (x, z) */
  pos: [number, number]
  building: BuildingSpec
  actions: Action[]
}

export interface Choice {
  label: string
  resolve: (s: GameData) => Effect
}

export interface GameEvent {
  id: string
  title: string
  text: string
  when: (s: GameData) => boolean
  choices: Choice[]
}
