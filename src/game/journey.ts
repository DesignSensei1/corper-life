import type { Background, Effect, Travel } from './types'
import { fmtTime, naira } from './time'

/** Rough location (lat, lon) of each state capital, for road distance and fares. */
const AT: Record<string, [number, number]> = {
  Abia: [5.53, 7.49], Adamawa: [9.21, 12.48], 'Akwa Ibom': [5.04, 7.91], Anambra: [6.21, 7.07], Bauchi: [10.31, 9.84],
  Bayelsa: [4.92, 6.26], Benue: [7.73, 8.52], Borno: [11.83, 13.15], 'Cross River': [4.95, 8.32], Delta: [6.2, 6.73],
  Ebonyi: [6.32, 8.11], Edo: [6.34, 5.63], Ekiti: [7.62, 5.22], Enugu: [6.45, 7.51], 'FCT Abuja': [9.06, 7.49],
  Gombe: [10.29, 11.17], Imo: [5.48, 7.03], Jigawa: [11.76, 9.34], Kaduna: [10.52, 7.44], Kano: [12.0, 8.52],
  Katsina: [12.99, 7.6], Kebbi: [12.45, 4.2], Kogi: [7.8, 6.74], Kwara: [8.5, 4.55], Lagos: [6.52, 3.38],
  Nasarawa: [8.49, 8.52], Niger: [9.61, 6.56], Ogun: [7.15, 3.35], Ondo: [7.25, 5.2], Osun: [7.77, 4.56],
  Oyo: [7.38, 3.95], Plateau: [9.9, 8.86], Rivers: [4.82, 7.03], Sokoto: [13.06, 5.24], Taraba: [8.89, 11.36],
  Yobe: [11.75, 11.96], Zamfara: [12.16, 6.66],
}

/** Road distance in km between two states (straight line plus a bit for the roads). */
export function roadKm(from: string, to: string): number {
  const a = AT[from]
  const b = AT[to]
  if (!a || !b || from === to) return 40
  const r = Math.PI / 180
  const dLat = (b[0] - a[0]) * r
  const dLon = (b[1] - a[1]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3)
}

export const BACKGROUNDS: Record<Exclude<Background, ''>, { title: string; wallet: number; tx: string; blurb: string }> = {
  nepo: {
    title: 'NEPO baby',
    wallet: 200000,
    tx: 'Upkeep from Daddy',
    blurb: 'Daddy knows people. Your account is loaded and the family travel agent is on speed dial.',
  },
  lapo: {
    title: 'LAPO baby',
    wallet: 40000,
    tx: 'Savings + small loan',
    blurb: 'You scraped your savings together with a small loan. Every naira has a job to do.',
  },
}

export const MIN_FLIGHT_KM = 250

export interface TravelOption {
  id: Travel
  title: string
  cost: number
  /** minutes since Monday 00:00 when you reach camp (negative = Sunday) */
  arrive: number
  energy: number
  mood: number
  note: string
}

const busHours = (km: number) => km / 55 + 1

/** "Sunday 9:00pm" for a time that many minutes before or after Monday 00:00 */
function when(m: number) {
  const day = m < -1440 ? 'Saturday' : m < 0 ? 'Sunday' : 'Monday'
  return `${day} ${fmtTime((((Math.round(m / 30) * 30) % 1440) + 1440) % 1440)}`
}

export function travelOptions(home: string, camp: string, bg: Background): TravelOption[] {
  const km = roadKm(home, camp)
  const fare = Math.round((3000 + km * 9) / 100) * 100
  const hrs = busHours(km)
  const opts: TravelOption[] = []
  if (bg === 'nepo' && km >= MIN_FLIGHT_KM)
    opts.push({ id: 'flight', title: '✈️ Fly', cost: 85000 + Math.round(km * 10 / 1000) * 1000, arrive: 10 * 60, energy: 88, mood: 72, note: 'Monday morning flight and a taxi to camp. Fast and comfy.' })
  // day bus leaves at 6am on Monday, or Sunday for long trips; camp gates open at 6am
  const busLeave = hrs > 12 ? -18 * 60 : 6 * 60
  const busArrive = Math.max(6 * 60, Math.round(busLeave + hrs * 60))
  opts.push({
    id: 'bus',
    title: '🚌 Day bus',
    cost: fare,
    arrive: busArrive,
    energy: Math.max(45, Math.round(80 - hrs * 2)),
    mood: 60,
    note: `About ${Math.round(hrs)} hours on the road (${km} km), leaving ${when(busLeave)}. Safe, but long.`,
  })
  // night bus leaves at 9pm (Saturday for the longest trips); you wait at the gate till 5am if early
  const nightLeave = hrs > 20 ? -27 * 60 : -3 * 60
  const nightArrive = Math.max(5 * 60, Math.round(nightLeave + hrs * 60))
  opts.push({
    id: 'night',
    title: '🌙 Night bus',
    cost: Math.round((fare * 0.7) / 100) * 100,
    arrive: nightArrive,
    energy: 55,
    mood: 55,
    note: `Leaves ${when(nightLeave)}. Cheaper, but night roads are risky.`,
  })
  return opts
}

/** What happened on the night bus, if anything. */
export function nightBusMishap(money: number): (Effect & { arriveLate?: number }) | null {
  const r = Math.random()
  if (r < 0.15) {
    const lost = Math.round((money * 0.3) / 100) * 100
    return { money: -lost, mood: -20, tx: 'Robbed on the night bus', msg: `Armed robbers stopped the bus at 2am. They took ${naira(lost)} from you. You're shaken, but alive.` }
  }
  if (r < 0.35) return { energy: -15, mood: -8, arriveLate: 4 * 60, msg: 'The bus broke down in the middle of nowhere. You waited four hours for a mechanic.' }
  if (r < 0.5) return { money: -2000, tx: 'Checkpoint "settlement"', mood: -5, msg: 'Checkpoint after checkpoint. The driver collected ₦2,000 from everyone to "settle" them.' }
  return null
}
