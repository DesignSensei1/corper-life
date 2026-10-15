import type { CdsKind, GameData, Mate, PpaKind, Role, Trade } from './types'

export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

// ---------------------------------------------------------------- BUNKMATES

export const FIRST = ['Tobi', 'Ngozi', 'Musa', 'Blessing', 'Emeka', 'Aisha', 'Tunde', 'Chioma', 'Ibrahim', 'Funke', 'Uche', 'Halima', 'Segun', 'Amaka', 'Yusuf', 'Ese']
const FROM = ['Lagos', 'Kano', 'Enugu', 'Rivers', 'Oyo', 'Kaduna', 'Anambra', 'Delta', 'Plateau', 'Ogun', 'Benue', 'Edo']
const SHIRTS = ['#ef5350', '#42a5f5', '#ab47bc', '#ffa726']

export function makeMates(): Mate[] {
  const names = [...FIRST].sort(() => Math.random() - 0.5).slice(0, 4)
  return names.map((name, i) => ({ name, from: pick(FROM), bond: 10, shirt: SHIRTS[i] }))
}

export const bondAvg = (s: GameData) => (s.mates.length ? s.mates.reduce((t, m) => t + m.bond, 0) / s.mates.length : 0)

/** The bunkmate you're closest to. They get posted to your LGA. */
export const bestMate = (s: GameData): Mate | undefined => [...s.mates].sort((a, b) => b.bond - a.bond)[0]

export const mateName = (s: GameData, i = 0) => s.mates[i]?.name ?? 'Your bunkmate'

// ---------------------------------------------------------------- CAMP ROLES

export const ROLES: Record<Exclude<Role, ''>, { title: string; blurb: string }> = {
  leader: { title: 'Platoon leader', blurb: 'Lead parade practice. Extra rating and cup points from drills.' },
  obs: { title: 'OBS presenter', blurb: 'Host the camp radio show. Boosts skills and mood.' },
  manowar: { title: "Man O' War", blurb: "Night patrols and bigger rewards from Man O' War drills." },
  none: { title: 'Regular corper', blurb: 'Keep a low profile and enjoy camp.' },
}

// ---------------------------------------------------------------- SAED TRADES

export interface TradeInfo {
  title: string
  verb: string
  /** what you spend on materials each time */
  cost: number
  base: number
  weekdays?: number[]
  window: [number, number]
  gear: [string, string]
  line: string
}

export const TRADES: Record<Exclude<Trade, ''>, TradeInfo> = {
  baking: { title: 'Catering & baking', verb: 'Bake chin-chin & meat pie to sell', cost: 2500, base: 5000, window: [6, 20], gear: ['Industrial oven', 'Delivery bike'], line: 'Your meat pies sold out at the junction.' },
  fashion: { title: 'Fashion design', verb: 'Sew clothes for customers', cost: 1500, base: 4500, window: [8, 21], gear: ['Electric sewing machine', 'Overlock machine'], line: 'Your customer loved her new Ankara gown.' },
  ict: { title: 'ICT & digital marketing', verb: 'Run social media for a client', cost: 600, base: 4000, window: [8, 23], gear: ['Second-hand laptop', 'Mi-Fi & solar kit'], line: 'The client’s Instagram page grew this week.' },
  photo: { title: 'Photography', verb: 'Shoot an event', cost: 1000, base: 9000, weekdays: [4, 5, 6], window: [10, 18], gear: ['DSLR camera', 'Studio lights'], line: 'The celebrants loved your pictures.' },
  makeup: { title: 'Make-up & gele tying', verb: 'Do make-up & gele for an owambe', cost: 1200, base: 8000, weekdays: [4, 5, 6], window: [7, 15], gear: ['Pro make-up kit', 'Ring light'], line: 'The bride’s gele stood tall all day.' },
}

export const GEAR_COST = [25000, 60000]

export function bizIncome(s: GameData) {
  const t = s.trade ? TRADES[s.trade] : null
  if (!t) return 0
  return Math.round(t.base * (1 + s.gear * 0.6) + s.skills * 60)
}

// ---------------------------------------------------------------- CDS PROJECTS

export const CDS: Record<Exclude<CdsKind, ''>, { title: string; cost: number; step: number; done: string; work: string }> = {
  borehole: { title: 'Community borehole', cost: 4000, step: 20, done: 'The community borehole is flowing! 🎉', work: 'You bought pipes and worked on the borehole.' },
  library: { title: 'School library', cost: 2500, step: 25, done: 'The school library is open and full of books! 📚', work: 'You collected books and built shelves.' },
  health: { title: 'Free health outreach', cost: 3000, step: 20, done: 'Over 300 villagers got free malaria and BP checks! 🩺', work: 'You organised drugs and volunteers for the outreach.' },
}

// ---------------------------------------------------------------- PPA KINDS

export const OFFICE: PpaKind[] = ['bank', 'ministry', 'corporate']
export const isOffice = (k?: PpaKind) => !!k && OFFICE.includes(k)

const BANKS = ['Unity Trust Bank', 'Heritage Union Bank', 'Crestline Bank', 'Sterling Crown Bank']
const MINISTRIES = ['Finance', 'Works & Infrastructure', 'Education', 'Health', 'Budget & Planning', 'Information']
const FIRMS = ['Naija Telecoms Ltd', 'Savannah Foods Plc', 'Deltacrest Oil & Gas', 'Pinnacle Consulting', 'Greenline Logistics']

export const PPA_NAMES: Record<PpaKind, (town: string) => string> = {
  school: (t) => pick([`Govt. Secondary School, ${t}`, `Community High School, ${t}`, `Comprehensive High School, ${t}`]),
  hospital: (t) => `General Hospital, ${t}`,
  lga: (t) => `Local Government Secretariat, ${t}`,
  bank: (t) => `${pick(BANKS)}, ${t} branch`,
  ministry: (t) => `State Ministry of ${pick(MINISTRIES)}, ${t}`,
  corporate: (t) => `${pick(FIRMS)}, ${t} office`,
}

/** Better camp records make an office posting more likely. */
export function pickPpaKind(rating: number, role: Role): PpaKind {
  const officeChance = (rating >= 80 ? 0.65 : rating >= 65 ? 0.4 : rating >= 50 ? 0.2 : 0.08) + (role === 'leader' ? 0.1 : 0)
  if (Math.random() < officeChance) return pick(OFFICE)
  return pick<PpaKind>(['school', 'school', 'hospital', 'lga'])
}

export interface PpaWork {
  label: string
  hours: number
  energy: number
  /** monthly stipend paid on allawee day if you worked 3 days */
  stipend: number
  boss: string
  tasks: string[]
}

export const PPA_WORK: Record<PpaKind, PpaWork> = {
  school: { label: 'Teach at school (6 hrs)', hours: 6, energy: -28, stipend: 0, boss: 'The principal', tasks: ['You taught SS2 Biology.', 'You marked 60 scripts.', 'You covered JSS1 Maths.', 'You helped organise the school records.'] },
  hospital: { label: 'Work a hospital shift (7 hrs)', hours: 7, energy: -30, stipend: 5000, boss: 'The medical director', tasks: ['You ran the records desk.', 'You helped at the immunisation clinic.', 'You took vitals for 40 patients.'] },
  lga: { label: 'Work at the secretariat (6 hrs)', hours: 6, energy: -24, stipend: 0, boss: 'The council secretary', tasks: ['You typed memos for the council.', 'You updated the tax register.', 'You attended a council meeting.'] },
  bank: { label: 'Work at the bank (8 hrs)', hours: 8, energy: -32, stipend: 30000, boss: 'The branch manager', tasks: ['You opened 12 new accounts.', 'You balanced the teller’s cash.', 'You handled customer complaints all day.', 'You marketed loans at the market.'] },
  ministry: { label: 'Work at the ministry (7 hrs)', hours: 7, energy: -24, stipend: 10000, boss: 'The permanent secretary', tasks: ['You drafted letters for the director.', 'You updated the budget spreadsheet.', 'You took minutes at a meeting.', 'You filed memos. Lots of memos.'] },
  corporate: { label: 'Work at the office (8 hrs)', hours: 8, energy: -30, stipend: 25000, boss: 'Your line manager', tasks: ['You built slides for a client pitch.', 'You cleaned up a messy Excel report.', 'You sat in on a strategy meeting.', 'You fixed the printer. Again.'] },
}

export const ppaKind = (s: GameData): PpaKind => s.posting?.kind ?? 'school'
