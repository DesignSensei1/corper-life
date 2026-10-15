// Game time is counted in minutes since Monday 00:00 of camp week.
export const MIN_PER_SEC = 2 // one real second = two game minutes
export const PPA_START_DAY = 7 // service year starts the Monday after camp
export const SERVICE_MONTHS = 12 // each in-game "month" is one week
/** Saves made before the 12-month service year carry an older calendar number. */
export const CALENDAR = 12
export const ALLAWEE = 77000
export const RENT = 12000

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const dayOf = (m: number) => Math.floor(m / 1440)
export const hourOf = (m: number) => (m % 1440) / 60
export const weekdayOf = (m: number) => dayOf(m) % 7
export const monthOf = (m: number) => Math.floor((dayOf(m) - PPA_START_DAY) / 7) + 1

/** "Month 3 of 12"; every missed clearance adds an extension month to the total. */
export function monthLabel(m: number, missed: number) {
  return `Month ${monthOf(m)} of ${SERVICE_MONTHS + missed}${missed ? ' (extended)' : ''}`
}

export function fmtTime(m: number) {
  const mins = Math.floor(m % 1440)
  const h = Math.floor(mins / 60)
  const mm = String(mins % 60).padStart(2, '0')
  const ampm = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm}${ampm}`
}

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

/** Minutes from now until the next occurrence of `hour` o'clock. */
export function minutesUntilHour(m: number, hour: number) {
  const now = m % 1440
  let target = hour * 60
  if (target <= now) target += 1440
  return target - now
}
