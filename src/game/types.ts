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
  /** raise (or lower) your bond with every bunkmate */
  bond?: number
  /** points for your platoon in the camp cup */
  cup?: number
  /** counters and flags to set */
  f?: Record<string, number>
  /** other game data to replace (role, trade, cdsKind…) */
  data?: Partial<GameData>
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

export type PpaKind = 'school' | 'hospital' | 'lga' | 'bank' | 'ministry' | 'corporate'

export interface Posting {
  state: string
  camp: string
  lga: string
  ppa: string
  kind?: PpaKind
}

export interface Mate {
  name: string
  /** state of origin, for flavour */
  from: string
  bond: number
  shirt: string
}

export type Role = '' | 'none' | 'leader' | 'obs' | 'manowar'
export type Trade = '' | 'baking' | 'fashion' | 'ict' | 'photo' | 'makeup'
export type CdsKind = '' | 'borehole' | 'library' | 'health'
export type Background = '' | 'nepo' | 'lapo'
export type Travel = '' | 'flight' | 'bus' | 'night'

export interface GameData {
  phase: Phase
  name: string
  /** state of residence you travel from */
  home: string
  /** NEPO baby (rich) or LAPO baby (average) */
  background: Background
  travel: Travel
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
  platoon: number
  /** camp cup points for platoons 1–10 (index 0 = platoon 1) */
  cup: number[]
  mates: Mate[]
  role: Role
  trade: Trade
  /** trade equipment level 0–2 */
  gear: number
  /** total earned from your SAED trade business */
  bizEarned: number
  cdsKind: CdsKind
  /** generic counters and flags: drills, lectures, registered, food, last-done days... */
  f: Record<string, number>
}

export type MinigameKind = 'drill' | 'manowar' | 'register'

export interface Action {
  id: string
  label: string
  /** whole-hour window [from, to) when it can be started */
  window?: [number, number]
  /** 0 = Monday ... 6 = Sunday */
  weekdays?: number[]
  oncePerDay?: boolean
  duration: number | ((s: GameData) => number)
  cost?: number | ((s: GameData) => number)
  sleeping?: boolean
  effect: Effect | ((s: GameData) => Effect)
  /** play a mini-game first; its score (0–100) is in s.f.score when the effect runs */
  minigame?: MinigameKind
  /** label can depend on state (e.g. your trade) */
  labelFor?: (s: GameData) => string
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
  label: string | ((s: GameData) => string)
  resolve: (s: GameData) => Effect
}

export interface GameEvent {
  id: string
  title: string | ((s: GameData) => string)
  text: string | ((s: GameData) => string)
  /** storyline steps are picked before ordinary random events */
  story?: boolean
  when: (s: GameData) => boolean
  choices: Choice[]
}
