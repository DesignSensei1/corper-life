import { create } from 'zustand'
import type { Action, Background, Effect, GameData, GameEvent, MinigameKind, Station, Travel } from './types'
import { CAMP_STATIONS, TOWN_STATIONS } from './stations'
import { assignPPA, randomCallUp } from './states'
import { CDS_EVENT, ROLE_EVENT, TRADE_EVENT, rollEvent } from './events'
import { PPA_WORK, makeMates, ppaKind } from './people'
import { BACKGROUNDS, nightBusMishap, travelOptions } from './journey'
import { ALLAWEE, END_DAY, MIN_PER_SEC, PPA_START_DAY, RENT, dayOf, hourOf, monthOf, naira, weekdayOf, WEEKDAYS } from './time'

const SAVE_KEY = 'corper-life-save-v1'

export interface Msg {
  id: number
  text: string
  kind: 'info' | 'good' | 'bad' | 'money'
}

interface Runtime {
  messages: Msg[]
  event: GameEvent | null
  eventResult: string | null
  showPosting: boolean
  showCallUp: boolean
  phoneOpen: boolean
  mapOpen: boolean
  nearby: string | null
  eventClock: number
  seenEvents: string[]
  hasSave: boolean
  /** what happened on the trip to camp, shown before you enter */
  tripLog: string[] | null
  /** a mini-game waiting to be played before an action resolves */
  minigame: { kind: MinigameKind; stationId: string; actionId: string } | null
}

interface Api {
  newGame: (name: string, home: string) => void
  travelToCamp: (t: Travel) => void
  continueGame: () => void
  quitToMenu: () => void
  tick: (realSeconds: number) => void
  doAction: (stationId: string, actionId: string, score?: number) => void
  finishMinigame: (score: number) => void
  chooseEvent: (i: number) => void
  closeEventResult: () => void
  travelToPPA: () => void
  setNearby: (id: string | null) => void
  togglePhone: (open?: boolean) => void
  toggleMap: (open?: boolean) => void
  closeCallUp: () => void
  dismissMsg: (id: number) => void
}

export type Store = GameData & Runtime & Api

const fresh = (name: string, home = '', background: Background = ''): GameData => ({
  phase: 'camp',
  name,
  home,
  background,
  travel: '',
  minutes: 7 * 60, // Monday 7:00am, you arrive at camp
  energy: 85,
  hunger: 70,
  mood: 65,
  money: 25000,
  rating: 50,
  skills: 0,
  project: 0,
  posting: null,
  month: { ppaDays: 0, cds: 0, cleared: false },
  monthsCleared: 0,
  monthsMissed: 0,
  txs: [{ day: 0, label: 'Pocket money from home', amount: 25000 }],
  platoon: 1 + Math.floor(Math.random() * 10),
  cup: Array.from({ length: 10 }, () => Math.floor(Math.random() * 6)),
  mates: makeMates(),
  role: '',
  trade: '',
  gear: 0,
  bizEarned: 0,
  cdsKind: '',
  f: {},
})

const DATA_KEYS = Object.keys(fresh('')) as (keyof GameData)[]

function pickData(s: Store): GameData {
  const out: Record<string, unknown> = {}
  for (const k of DATA_KEYS) out[k] = s[k]
  return out as unknown as GameData
}

function save(s: Store) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(pickData(s)))
  } catch {
    /* storage unavailable: play continues without saving */
  }
}

function loadSave(): GameData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as GameData
    // saves from older versions lack the newer fields
    return d.phase && d.phase !== 'menu' ? { ...fresh(d.name), ...d } : null
  } catch {
    return null
  }
}

export const stationsFor = (phase: GameData['phase']): Station[] => (phase === 'ppa' ? TOWN_STATIONS : CAMP_STATIONS)

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

let msgId = 1
type Draft = { d: GameData; msgs: Msg[] }

function note(dr: Draft, text: string, kind: Msg['kind'] = 'info') {
  dr.msgs.push({ id: msgId++, text, kind })
}

function applyEffect(dr: Draft, e: Effect, fallbackTx: string) {
  const d = dr.d
  d.energy = clamp(d.energy + (e.energy ?? 0))
  d.hunger = clamp(d.hunger + (e.hunger ?? 0))
  d.mood = clamp(d.mood + (e.mood ?? 0))
  d.rating = clamp(d.rating + (e.rating ?? 0))
  d.skills = clamp(d.skills + (e.skills ?? 0))
  d.project = clamp(d.project + (e.project ?? 0))
  if (e.money) {
    d.money += e.money
    d.txs = [...d.txs, { day: dayOf(d.minutes), label: e.tx ?? fallbackTx, amount: e.money }].slice(-40)
    if (e.money > 0) note(dr, `+${naira(e.money)} · ${e.tx ?? fallbackTx}`, 'money')
  }
  if (e.bond) d.mates = d.mates.map((m) => ({ ...m, bond: clamp(m.bond + e.bond!) }))
  if (e.cup && d.phase === 'camp') d.cup = d.cup.map((p, i) => (i === d.platoon - 1 ? p + e.cup! : p))
  if (e.f) d.f = { ...d.f, ...e.f }
  if (e.data) Object.assign(d, e.data)
  if (e.msg) note(dr, e.msg, e.rating && e.rating < 0 ? 'bad' : 'info')
}

/** Move the clock forward, applying needs decay and calendar events. */
function advance(dr: Draft, mins: number, sleeping = false) {
  const d = dr.d
  const startDay = dayOf(d.minutes)
  const starving = d.hunger <= 0
  d.hunger = clamp(d.hunger - mins * (sleeping ? 0.06 : 0.13))
  if (!sleeping) d.energy = clamp(d.energy - mins * 0.055 * (starving ? 3 : 1))
  if (d.hunger < 15) d.mood = clamp(d.mood - mins * 0.03)
  d.mood = clamp(d.mood + (50 - d.mood) * Math.min(1, mins * 0.0008))
  d.minutes += mins

  for (let day = startDay + 1; day <= dayOf(d.minutes); day++) onNewDay(dr, day)

  // Camp allawee lands on Tuesday noon once you're registered
  if (d.phase === 'camp' && d.f.registered && !d.f.campAllawee && d.minutes >= 1440 + 12 * 60) {
    d.f = { ...d.f, campAllawee: 1 }
    applyEffect(dr, { money: ALLAWEE, tx: 'Camp allawee' }, 'Camp allawee')
    note(dr, '📱 Credit alert! Your first allawee has landed.', 'good')
  }

  if (d.phase !== 'ended' && d.energy <= 0) {
    // fainting: carried to the clinic, lose half a day
    d.minutes += 6 * 60
    d.energy = 45
    d.mood = clamp(d.mood - 15)
    applyEffect(dr, { money: -3000, tx: 'Clinic bill (fainted)' }, 'Clinic bill')
    note(dr, 'You fainted from exhaustion! You woke up in the clinic 6 hours later. Eat and sleep well.', 'bad')
  }
}

function onNewDay(dr: Draft, day: number) {
  const d = dr.d
  if (d.phase === 'camp') {
    // the other platoons keep scoring too
    d.cup = d.cup.map((p, i) => p + (i === d.platoon - 1 ? Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 18)))
    return
  }
  if (d.phase !== 'ppa' || day <= PPA_START_DAY || (day - PPA_START_DAY) % 7 !== 0) return
  // a service "month" just ended
  const m = (day - PPA_START_DAY) / 7
  const work = PPA_WORK[ppaKind(d)]
  if (work.stipend && d.month.ppaDays >= 3) {
    applyEffect(dr, { money: work.stipend, tx: `PPA stipend (month ${m})` }, 'PPA stipend')
  }
  if (d.month.cleared) {
    d.monthsCleared++
    applyEffect(dr, { money: ALLAWEE, tx: `Allawee (month ${m})` }, 'Allawee')
    note(dr, `📱 Credit alert! Month ${m} allawee paid.`, 'good')
  } else {
    d.monthsMissed++
    d.rating = clamp(d.rating - 8)
    note(dr, `You were not cleared for month ${m}, so no allawee. Your service year may be extended.`, 'bad')
  }
  d.month = { ppaDays: 0, cds: 0, cleared: false }
  if (day >= END_DAY) {
    d.phase = 'ended'
    return
  }
  const rent = d.f.rent ?? RENT
  applyEffect(dr, { money: -rent, tx: 'Lodge rent' }, 'Lodge rent')
  note(dr, `Rent of ${naira(rent)} paid for the month.`, 'info')
}

function inWindow(h: number, [from, to]: [number, number]) {
  return from < to ? h >= from && h < to : h >= from || h < to
}

export const hourLabel = (h: number) => {
  const hh = h % 24
  return `${hh % 12 === 0 ? 12 : hh % 12}${hh < 12 ? 'am' : 'pm'}`
}

export const costOf = (s: GameData, a: Action) => (typeof a.cost === 'function' ? a.cost(s) : a.cost ?? 0)
export const labelOf = (s: GameData, a: Action) => a.labelFor?.(s) ?? a.label

export function actionStatus(s: GameData, stationId: string, a: Action): string | null {
  const day = dayOf(s.minutes)
  if (a.weekdays && !a.weekdays.includes(weekdayOf(s.minutes))) return 'Only on ' + a.weekdays.map((w) => WEEKDAYS[w].slice(0, 3)).join(', ')
  if (a.window && !inWindow(hourOf(s.minutes), a.window)) return `Open ${hourLabel(a.window[0])}–${hourLabel(a.window[1])}`
  if (a.oncePerDay && s.f[`done:${stationId}:${a.id}`] === day + 1) return 'Done for today'
  const cost = costOf(s, a)
  if (cost && s.money < cost) return `Need ${naira(cost)}`
  const extra = a.check?.(s)
  if (extra) return extra
  const eff = typeof a.effect === 'function' ? null : a.effect
  if (eff?.energy && eff.energy < 0 && s.energy + eff.energy < 5) return 'Too tired. Rest first'
  if (!eff && s.energy < 12 && !a.sleeping) return 'Too tired. Rest first'
  return null
}

const initial: GameData & Runtime = {
  ...fresh(''),
  phase: 'menu',
  messages: [],
  event: null,
  eventResult: null,
  showPosting: false,
  showCallUp: false,
  phoneOpen: false,
  mapOpen: false,
  nearby: null,
  eventClock: 0,
  seenEvents: [],
  hasSave: !!loadSave(),
  tripLog: null,
  minigame: null,
}

export const useGame = create<Store>()((set, get) => {
  /** Run a mutation on a copy of the game data and commit it with its messages. */
  function commit(fn: (dr: Draft) => void, persist = true) {
    const s = get()
    const dr: Draft = { d: { ...pickData(s), f: { ...s.f }, month: { ...s.month } }, msgs: [] }
    fn(dr)
    set({ ...dr.d, messages: [...s.messages, ...dr.msgs].slice(-5) })
    if (persist) save(get())
  }

  return {
    ...initial,

    newGame: (name, home) => {
      const bg: Background = Math.random() < 0.5 ? 'nepo' : 'lapo'
      const b = BACKGROUNDS[bg]
      set({
        ...fresh(name.trim() || 'Corper', home, bg),
        money: b.wallet,
        txs: [{ day: 0, label: b.tx, amount: b.wallet }],
        posting: randomCallUp(home),
        messages: [], event: null, eventResult: null, showPosting: false, showCallUp: true, tripLog: null, mapOpen: false, eventClock: 0, seenEvents: [], minigame: null,
      })
      save(get())
    },

    travelToCamp: (t) => {
      const s = get()
      const opt = travelOptions(s.home, s.posting?.state ?? '', s.background).find((o) => o.id === t)
      if (!opt || s.tripLog) return
      const log: string[] = []
      commit((dr) => {
        const d = dr.d
        d.travel = t
        d.minutes = opt.arrive
        d.energy = opt.energy
        d.mood = opt.mood
        applyEffect(dr, { money: -opt.cost, tx: opt.id === 'flight' ? 'Flight + taxi to camp' : opt.id === 'night' ? 'Night bus to camp' : 'Bus fare to camp' }, 'Transport to camp')
        const bad = t === 'night' ? nightBusMishap(d.money) : null
        if (bad) {
          const { arriveLate, msg, ...eff } = bad
          if (arriveLate) d.minutes += arriveLate
          applyEffect(dr, eff, 'Night bus')
          if (msg) log.push(msg)
        } else if (t === 'night') log.push('The road was rough but you made it in one piece. You slept through most of it.')
        else if (t === 'flight') log.push('Smooth flight, cold zobo on arrival. You stroll into camp looking fresh.')
        else log.push('Long ride, loud music and three "toilet stops" in the bush. You made it.')
        dr.msgs = []
      })
      set({ tripLog: log })
    },

    continueGame: () => {
      const d = loadSave()
      if (!d) return
      set({ ...d, posting: d.posting ?? randomCallUp(d.home), messages: [], event: null, minigame: null, showCallUp: !!d.home && !d.travel, tripLog: null, mapOpen: false, showPosting: d.phase === 'camp' && !!d.f.postingReady })
    },

    quitToMenu: () => {
      save(get())
      set({ phase: 'menu', hasSave: !!loadSave(), phoneOpen: false, mapOpen: false, event: null })
    },

    tick: (secs) => {
      const s = get()
      if (s.phase !== 'camp' && s.phase !== 'ppa') return
      if (s.event || s.eventResult || s.showPosting || s.showCallUp || s.mapOpen || s.minigame) return
      const mins = secs * MIN_PER_SEC
      const hourBefore = Math.floor(s.minutes / 60)
      commit((dr) => advance(dr, mins), false)
      const after = get()
      if (Math.floor(after.minutes / 60) !== hourBefore) save(after)

      // random life events
      const clock = after.eventClock + mins
      if (clock >= 150) {
        const ev = Math.random() < 0.35 ? rollEvent(pickData(after), after.seenEvents) : null
        set({ eventClock: 0, event: ev, seenEvents: ev ? [...after.seenEvents, ev.id].slice(-6) : after.seenEvents })
      } else set({ eventClock: clock })
    },

    doAction: (stationId, actionId, score) => {
      const s = get()
      const st = stationsFor(s.phase).find((x) => x.id === stationId)
      const a = st?.actions.find((x) => x.id === actionId)
      if (!st || !a || s.event || s.eventResult || (s.minigame && score === undefined)) return
      const reason = actionStatus(pickData(s), stationId, a)
      if (reason) {
        commit((dr) => note(dr, reason, 'bad'), false)
        return
      }
      if (a.minigame && score === undefined) {
        set({ minigame: { kind: a.minigame, stationId, actionId } })
        return
      }
      const firstSaed = actionId === 'saed' && !s.trade
      const firstCds = actionId === 'cdsmeet' && !s.cdsKind
      commit((dr) => {
        if (score !== undefined) dr.d.f = { ...dr.d.f, score: Math.round(score) }
        const before = { ...dr.d }
        const label = labelOf(before, a)
        const cost = costOf(before, a)
        const dur = typeof a.duration === 'function' ? a.duration(before) : a.duration
        const eff = typeof a.effect === 'function' ? a.effect(before) : a.effect
        if (cost) applyEffect(dr, { money: -cost, tx: label }, label)
        if (a.done) Object.assign(dr.d, a.done(dr.d))
        if (a.oncePerDay) dr.d.f = { ...dr.d.f, [`done:${stationId}:${a.id}`]: dayOf(before.minutes) + 1 }
        advance(dr, dur, a.sleeping)
        applyEffect(dr, eff, label)
        if (!eff.msg && !eff.money) note(dr, `${label} ✓`, 'good')
      })
      if (actionId === 'posting') {
        const g = get()
        set({ posting: assignPPA(g.posting, g.rating, g.role), showPosting: true })
        save(get())
      }
      if (actionId === 'swear' && !get().role) set({ event: ROLE_EVENT })
      if (firstSaed) set({ event: TRADE_EVENT })
      if (firstCds) set({ event: CDS_EVENT })
    },

    finishMinigame: (score) => {
      const mg = get().minigame
      if (!mg) return
      set({ minigame: null })
      get().doAction(mg.stationId, mg.actionId, score)
    },

    chooseEvent: (i) => {
      const ev = get().event
      if (!ev) return
      let text = ''
      commit((dr) => {
        const eff = ev.choices[i].resolve(dr.d)
        applyEffect(dr, { ...eff, msg: undefined }, eff.tx ?? (typeof ev.title === 'string' ? ev.title : 'Event'))
        if (ev.story) dr.d.f = { ...dr.d.f, ['ev:' + ev.id]: 1 }
        text = eff.msg ?? ''
      })
      set({ event: null, eventResult: text || null })
    },

    closeEventResult: () => set({ eventResult: null }),

    travelToPPA: () => {
      if (!get().posting) return
      commit((dr) => {
        const d = dr.d
        d.phase = 'ppa'
        d.minutes = PPA_START_DAY * 1440 + 7 * 60
        d.month = { ppaDays: 0, cds: 0, cleared: false }
        d.energy = clamp(d.energy + 20)
        applyEffect(dr, { money: -5000, tx: 'Transport to PPA' }, 'Transport')
        applyEffect(dr, { money: -RENT, tx: 'Lodge rent' }, 'Lodge rent')
        note(dr, `Welcome to ${d.posting?.lga}! Month ${monthOf(d.minutes)} begins. Work at your PPA, attend CDS on Thursday, then get cleared.`, 'good')
      })
      set({ showPosting: false, nearby: null, event: get().trade ? null : TRADE_EVENT })
    },

    setNearby: (id) => {
      if (get().nearby !== id) set({ nearby: id })
    },

    togglePhone: (open) => set({ phoneOpen: open ?? !get().phoneOpen, mapOpen: false }),

    toggleMap: (open) => set({ mapOpen: open ?? !get().mapOpen, phoneOpen: false }),

    closeCallUp: () => {
      set({ showCallUp: false, tripLog: null })
      commit((dr) => note(dr, 'Welcome to orientation camp! Walk to the Registration Tent near the gate to register. Tap 🗺️ for the camp map.', 'good'))
    },

    dismissMsg: (id) => set({ messages: get().messages.filter((m) => m.id !== id) }),
  }
})

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}

// handy for debugging from the browser console
;(globalThis as unknown as { __game: typeof useGame }).__game = useGame
