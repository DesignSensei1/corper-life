import type { Action, Effect, GameData, Station } from './types'
import { WEEKDAYS, dayOf, fmtTime, hourOf, minutesUntilHour, monthOf, naira, weekdayOf } from './time'
import { BIZ_GOAL } from './endings'
import { CDS, GEAR_COST, PPA_WORK, ROLES, TRADES, bestMate, bizIncome, isOffice, ppaKind, pick } from './people'

export { pick }
const flag = (s: GameData, k: string) => s.f[k] ?? 0

/** Where the player stands to use a station. Houses face +z. */
export function doorOf(st: Station): [number, number] {
  const [x, z] = st.pos
  if (st.building.kind === 'open') return [x, z]
  return [x, z + st.building.size[2] / 2 + 1.8]
}

function sleepAction(wakeHour: number): Action {
  return {
    id: 'sleep',
    label: `Sleep till ${wakeHour}am`,
    window: [19, wakeHour],
    sleeping: true,
    duration: (s) => minutesUntilHour(s.minutes, wakeHour),
    effect: (s) => {
      const hrs = minutesUntilHour(s.minutes, wakeHour) / 60
      return { energy: Math.min(100, hrs * 14), mood: 4, msg: wakeHour === 5 ? 'BUGLE! 🎺 "Corpers, wake up!" It is 5am.' : 'Good morning! A new day.' }
    },
  }
}

const nap: Action = { id: 'nap', label: 'Take a 1-hour nap', duration: 60, sleeping: true, effect: { energy: 14 }, window: [8, 19] }

const registered = (s: GameData) => (flag(s, 'registered') ? null : 'Register at the tent by the gate first')

// ---------------------------------------------------------------- CAMP

export const CAMP_STATIONS: Station[] = [
  {
    id: 'registration',
    name: 'Registration Tent',
    pos: [14, 30],
    building: { size: [10, 3.2, 6], color: '#f4f1e8', roof: '#2e7d32', kind: 'tent' },
    actions: [
      {
        id: 'register',
        label: 'Submit documents & register',
        minigame: 'register',
        duration: (s) => (flag(s, 'score') >= 100 ? 90 : 20),
        hidden: (s) => !!flag(s, 'registered'),
        check: (s) => (flag(s, 'regRetry') > s.minutes ? `Come back at ${fmtTime(flag(s, 'regRetry'))}` : null),
        effect: (s) =>
          flag(s, 'score') >= 100
            ? {
                energy: -6,
                mood: 6,
                msg: `Registered! You got your kits: whites, khaki, jungle boots and cap. You're in Platoon ${s.platoon}, Bunk 14, Hostel B, with ${s.mates.map((m) => m.name).join(', ')}.`,
              }
            : { energy: -4, mood: -8, msg: '"Oga corper, you are wasting my time! Go and arrange your documents and come back in 2 hours."' },
        done: (s) => (flag(s, 'score') >= 100 ? { f: { ...s.f, registered: 1 } } : { f: { ...s.f, regRetry: s.minutes + 20 + 120 } }),
      },
      {
        id: 'regwait',
        label: 'Wait in the shade till they call you back',
        hidden: (s) => !!flag(s, 'registered') || flag(s, 'regRetry') <= s.minutes,
        duration: (s) => Math.max(1, flag(s, 'regRetry') - s.minutes),
        effect: { energy: 4, mood: -3, msg: 'You sat under the tent, fanning yourself with your call-up letter. The officer is ready for you again.' },
      },
      {
        id: 'schedule',
        label: 'Ask for the camp schedule',
        duration: 5,
        hidden: (s) => !flag(s, 'registered'),
        effect: {
          msg: 'Bugle 5am · Drills 6–9am · Lectures 10am–1pm · SAED 2–5pm · Man O\' War 3–6pm · Social night 7–11pm. Swearing-in is Tuesday morning. Posting letters come out Thursday 4pm.',
        },
      },
    ],
  },
  {
    id: 'parade',
    name: 'Parade Ground',
    pos: [0, -2],
    building: { size: [36, 0, 22], color: '#c9b48a', roof: '#fff', kind: 'open' },
    actions: [
      {
        id: 'drill',
        label: 'Morning drill',
        window: [5, 9],
        oncePerDay: true,
        duration: 120,
        minigame: 'drill',
        check: registered,
        effect: (s) => {
          const sc = flag(s, 'score')
          const lead = s.role === 'leader'
          return {
            energy: -20,
            hunger: -12,
            rating: Math.round(1 + sc / 25) + (lead ? 2 : 0),
            mood: sc >= 70 ? 4 : -2,
            cup: Math.round(sc / 10) + (lead ? 4 : 0),
            bond: 2,
            msg: sc >= 85 ? `Perfect steps (${sc}%)! The soldier made your platoon the example.` : sc >= 50 ? `"Left! Right! Left!" Decent drill (${sc}%).` : `You kept missing the steps (${sc}%). The soldier shouted at Platoon ${s.platoon}.`,
          }
        },
        done: (s) => ({ f: { ...s.f, drills: flag(s, 'drills') + 1 } }),
      },
      {
        id: 'swear',
        label: 'Swearing-in ceremony',
        window: [8, 13],
        duration: 180,
        hidden: (s) => !!flag(s, 'swornIn'),
        check: (s) => registered(s) ?? (dayOf(s.minutes) < 1 ? 'Swearing-in is on Tuesday morning' : null),
        effect: (s) => ({ rating: 6, mood: 12, energy: -10, msg: `"I, ${s.name}, do solemnly swear…" You are now officially a corps member! 🇳🇬` }),
        done: (s) => ({ f: { ...s.f, swornIn: 1 } }),
      },
      {
        id: 'manowar',
        label: "Man O' War drills",
        window: [15, 18],
        oncePerDay: true,
        duration: 90,
        minigame: 'manowar',
        check: registered,
        effect: (s) => {
          const sc = flag(s, 'score')
          const mw = s.role === 'manowar' ? 1.5 : 1
          return {
            energy: -24,
            hunger: -10,
            mood: sc >= 60 ? 8 : 2,
            rating: Math.round((1 + sc / 30) * mw),
            cup: Math.round((sc / 12) * mw),
            msg: sc >= 80 ? `You flew through the course (${sc}%) and screamed "Man O' War!"` : sc >= 40 ? `You finished the course (${sc}%), muddy but proud.` : `You got stuck on the obstacles (${sc}%). The instructor laughed.`,
          }
        },
        done: (s) => ({ f: { ...s.f, drills: flag(s, 'drills') + 1 } }),
      },
      {
        id: 'leadparade',
        label: 'Lead platoon parade practice',
        window: [17, 19],
        oncePerDay: true,
        duration: 60,
        hidden: (s) => s.role !== 'leader',
        effect: (s) => ({ energy: -10, rating: 4, cup: 8, bond: 2, msg: `Platoon ${s.platoon} marched like soldiers under your command.` }),
      },
      {
        id: 'posting',
        label: 'Collect posting letter',
        duration: 30,
        check: (s) => {
          if (!flag(s, 'swornIn')) return 'You must be sworn in first'
          if (dayOf(s.minutes) < 3 || (dayOf(s.minutes) === 3 && hourOf(s.minutes) < 16)) return 'Posting letters come out Thursday 4pm'
          return null
        },
        effect: (s) => {
          const ok = flag(s, 'drills') >= 3 && flag(s, 'lectures') >= 2
          const place = cupPlace(s)
          const won = place === 1
          const cup = won
            ? ` 🏆 Platoon ${s.platoon} won the camp cup! Everyone in your platoon gets ${naira(10000)}.`
            : ` Platoon ${cupLeader(s)} won the camp cup. Your platoon came ${ordinal(place)}.`
          const base = ok
            ? { rating: 5, mood: 10, msg: 'Posting letter in hand. Time to see where you are going!' + cup }
            : { rating: -10, mood: -5, msg: 'The camp director frowned at your low attendance (-10 rating). Posting letter collected.' + cup }
          return won ? { ...base, rating: base.rating + 5, mood: base.mood + 10, money: 10000, tx: 'Camp cup prize', f: { cupWon: 1 } } : base
        },
        done: (s) => ({ f: { ...s.f, postingReady: 1 } }),
      },
    ],
  },
  {
    id: 'hostel',
    name: 'Hostel B',
    pos: [-22, -30],
    building: { size: [18, 4, 8], color: '#e8dcc0', roof: '#8d6e63' },
    actions: [
      sleepAction(5),
      nap,
      {
        id: 'bath',
        label: 'Bath & wash your whites',
        duration: 45,
        oncePerDay: true,
        check: registered,
        effect: { mood: 8, energy: -3, msg: 'Fresh! You queued for water but it was worth it.' },
      },
      {
        id: 'gist',
        label: 'Gist with your bunkmates',
        duration: 40,
        oncePerDay: true,
        check: registered,
        effect: (s) => ({
          mood: 8,
          bond: 6,
          msg: pick([
            `${s.mates[0]?.name} told the whole bunk about their crush in Platoon 5.`,
            `${s.mates[1]?.name} from ${s.mates[1]?.from} taught everyone a new card game.`,
            `${s.mates[2]?.name} shared garri and groundnut with the bunk.`,
            `You all argued about who has the worst PPA luck. ${s.mates[3]?.name} won.`,
          ]),
        }),
      },
      {
        id: 'sneak',
        label: 'Sneak out after lights-out',
        window: [22, 2],
        oncePerDay: true,
        duration: 90,
        check: registered,
        effect: (s) =>
          Math.random() < 0.6
            ? { mood: 18, bond: 5, money: -1500, tx: 'Mammy market at night', msg: `You and ${s.mates[0]?.name} slipped out to Mammy market for suya and cold drinks. Nobody saw you!` }
            : { energy: -15, rating: -8, mood: -6, bond: 3, msg: 'A soldier caught you by the fence! Frog jumps till midnight and your name went in the book.' },
      },
      {
        id: 'patrol',
        label: "Man O' War night patrol",
        window: [21, 23],
        oncePerDay: true,
        duration: 90,
        hidden: (s) => s.role !== 'manowar',
        effect: { energy: -12, rating: 3, cup: 5, msg: 'You patrolled the hostels with your torch and caught two corpers sneaking out.' },
      },
    ],
  },
  {
    id: 'kitchen',
    name: 'Camp Kitchen',
    pos: [-30, 6],
    building: { size: [12, 4, 9], color: '#d7ccc8', roof: '#5d4037' },
    actions: [
      {
        id: 'campfood',
        label: 'Eat camp food (free)',
        duration: 30,
        check: (s) => {
          const r = registered(s)
          if (r) return r
          const meal = mealSlot(s)
          if (meal < 0) return 'Meals: 7–9am, 1–3pm, 6–8pm'
          if (flag(s, 'lastMeal') === dayOf(s.minutes) * 3 + meal) return 'You already ate this meal'
          return null
        },
        effect: () =>
          pick([
            { hunger: 35, mood: -2, msg: 'Beans and bread. There was a stone in the beans.' },
            { hunger: 38, mood: 2, msg: 'Jollof rice day! Small chicken, but still sweet.' },
            { hunger: 30, mood: -4, msg: 'Pap and akara. The akara was cold.' },
          ].map((e) => ({ ...e, bond: 1 }))),
        done: (s) => ({ f: { ...s.f, lastMeal: dayOf(s.minutes) * 3 + mealSlot(s) } }),
      },
    ],
  },
  {
    id: 'market',
    name: 'Mammy Market',
    pos: [28, -6],
    building: { size: [14, 3, 7], color: '#ffb74d', roof: '#e53935', kind: 'stalls' },
    actions: [
      { id: 'jollof', label: 'Jollof rice & chicken', cost: 2500, duration: 30, window: [6, 23], effect: { hunger: 45, mood: 8 } },
      { id: 'indomie', label: 'Indomie & egg', cost: 1200, duration: 20, window: [6, 23], effect: { hunger: 30, mood: 2 } },
      { id: 'suya', label: 'Suya', cost: 1500, duration: 20, window: [16, 24], effect: { hunger: 20, mood: 10 } },
      { id: 'drink', label: 'Cold malt', cost: 500, duration: 10, window: [6, 24], effect: { energy: 6, mood: 4 } },
    ],
  },
  {
    id: 'lecture',
    name: 'Lecture Hall',
    pos: [24, -34],
    building: { size: [16, 5, 10], color: '#bbdefb', roof: '#1565c0' },
    actions: [
      {
        id: 'lecture',
        label: 'Attend lecture',
        window: [10, 13],
        oncePerDay: true,
        duration: 120,
        check: registered,
        effect: () => ({
          energy: -8,
          rating: 3,
          skills: 3,
          msg: 'Lecture: ' + pick(['Security awareness in your PPA', 'NYSC bye-laws', 'Entrepreneurship and SAED', 'Health: HIV and malaria', 'Culture of your host community']),
        }),
        done: (s) => ({ f: { ...s.f, lectures: flag(s, 'lectures') + 1 } }),
      },
    ],
  },
  {
    id: 'saed',
    name: 'SAED Tent',
    pos: [32, 22],
    building: { size: [10, 3.2, 6], color: '#fff8e1', roof: '#f9a825', kind: 'tent' },
    actions: [
      {
        id: 'saed',
        label: 'Skill acquisition class',
        window: [14, 17],
        oncePerDay: true,
        duration: 120,
        check: registered,
        effect: (s) =>
          s.trade
            ? { energy: -10, skills: 10, mood: 4, msg: `SAED: ${TRADES[s.trade].title}. You're getting good at this.` }
            : { energy: -10, skills: 8, mood: 3, msg: 'SAED orientation: the trainers showed every trade. Time to pick yours.' },
        done: (s) => ({ f: { ...s.f, saed: flag(s, 'saed') + 1 } }),
      },
    ],
  },
  {
    id: 'clinic',
    name: 'Camp Clinic',
    pos: [-36, -12],
    building: { size: [8, 3.5, 6], color: '#ffffff', roof: '#c62828' },
    actions: [
      { id: 'nurse', label: 'Rest at the clinic', duration: 60, oncePerDay: true, effect: { energy: 15, mood: 2, msg: 'The nurse gave you ORS and told you to drink water.' } },
      { id: 'pcm', label: 'Buy paracetamol', cost: 300, duration: 5, effect: { energy: 5 } },
    ],
  },
  {
    id: 'social',
    name: 'Social Arena',
    pos: [-20, 28],
    building: { size: [10, 0, 10], color: '#a1887f', roof: '#fff', kind: 'open' },
    actions: [
      {
        id: 'socialnight',
        label: 'Social night',
        window: [19, 23],
        oncePerDay: true,
        duration: 120,
        check: registered,
        effect: () => ({
          energy: -8,
          mood: 20,
          cup: 3,
          bond: 3,
          msg: pick(['Mr Macho contest! Platoon 4 went wild.', 'Miss NYSC pageant. The crowd was loud.', 'Talent night: someone did a mad Shaku Shaku.', 'Bonfire and gist with your platoon mates.']),
        }),
        done: (s) => ({ f: { ...s.f, socials: flag(s, 'socials') + 1 } }),
      },
      {
        id: 'football',
        label: 'Platoon football match',
        window: [16, 19],
        oncePerDay: true,
        duration: 90,
        check: registered,
        effect: (s) => {
          const opp = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => p !== s.platoon))
          const win = Math.random() < 0.4 + s.mates.reduce((t, m) => t + m.bond, 0) / s.mates.length / 200
          return win
            ? { energy: -15, hunger: -8, mood: 14, cup: 12, bond: 4, msg: `Platoon ${s.platoon} beat Platoon ${opp} 2–1! ${bestMate(s)?.name} scored the winner.` }
            : { energy: -15, hunger: -8, mood: -3, cup: 3, bond: 2, msg: `Platoon ${opp} beat you 3–0. The referee was clearly bought.` }
        },
      },
      {
        id: 'obs',
        label: 'Host the OBS radio show',
        window: [12, 14],
        oncePerDay: true,
        duration: 60,
        hidden: (s) => s.role !== 'obs',
        effect: (s) => ({ energy: -6, skills: 4, mood: 10, cup: 5, msg: `"This is OBS, the voice of ${s.posting?.camp} camp!" Your shout-out to Platoon ${s.platoon} was a hit.` }),
      },
    ],
  },
]

export const cupLeader = (s: GameData) => s.cup.indexOf(Math.max(...s.cup)) + 1
export const cupPlace = (s: GameData) => 1 + s.cup.filter((p, i) => i !== s.platoon - 1 && p > s.cup[s.platoon - 1]).length
export const ordinal = (n: number) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

function mealSlot(s: GameData) {
  const h = hourOf(s.minutes)
  if (h >= 7 && h < 9) return 0
  if (h >= 13 && h < 15) return 1
  if (h >= 18 && h < 20) return 2
  return -1
}

// ---------------------------------------------------------------- PPA TOWN

const notCleared = (s: GameData) => !s.month.cleared

export const TOWN_STATIONS: Station[] = [
  {
    id: 'lodge',
    name: "Corpers' Lodge",
    pos: [-24, -22],
    building: { size: [12, 4, 8], color: '#ffe0b2', roof: '#6d4c41' },
    actions: [
      sleepAction(6),
      nap,
      {
        id: 'cook',
        label: 'Cook at home',
        duration: 45,
        check: (s) => (flag(s, 'food') > 0 ? null : 'No foodstuff. Buy some at the market'),
        effect: { hunger: 42, mood: 4, msg: 'Stew and rice. Mama would be proud.' },
        done: (s) => ({ f: { ...s.f, food: flag(s, 'food') - 1 } }),
      },
      {
        id: 'biz',
        label: 'Run your business',
        labelFor: (s) => (s.trade ? TRADES[s.trade].verb : 'Run your business'),
        oncePerDay: true,
        duration: 180,
        cost: (s) => (s.trade ? TRADES[s.trade].cost : 0),
        hidden: (s) => !s.trade,
        check: (s) => {
          if (!s.trade) return null
          const t = TRADES[s.trade]
          if (t.weekdays && !t.weekdays.includes(weekdayOf(s.minutes))) return 'Only on ' + t.weekdays.map((w) => WEEKDAYS[w].slice(0, 3)).join(', ')
          const h = hourOf(s.minutes)
          if (h < t.window[0] || h >= t.window[1]) return `Open ${t.window[0]}:00–${t.window[1]}:00`
          return null
        },
        effect: (s) => {
          const pay = bizIncome(s)
          return { energy: -16, hunger: -8, mood: 4, skills: 1, money: pay, tx: `${s.trade ? TRADES[s.trade].title : 'Business'} sales`, data: { bizEarned: s.bizEarned + pay }, msg: s.trade ? TRADES[s.trade].line : '' }
        },
      },
      { id: 'bath', label: 'Bath & iron your khaki', duration: 40, oncePerDay: true, effect: { mood: 7 } },
    ],
  },
  {
    id: 'ppa',
    name: 'Your PPA',
    pos: [26, -26],
    building: { size: [18, 5, 9], color: '#c8e6c9', roof: '#2e7d32' },
    actions: [
      {
        id: 'work',
        label: 'Work at PPA',
        labelFor: (s) => PPA_WORK[ppaKind(s)].label,
        weekdays: [0, 1, 2, 4],
        window: [7, 10],
        oncePerDay: true,
        duration: (s) => PPA_WORK[ppaKind(s)].hours * 60,
        check: (s) => (isOffice(ppaKind(s)) && !flag(s, 'outfit') ? 'Buy a corporate outfit at the market first' : null),
        effect: (s) => {
          const w = PPA_WORK[ppaKind(s)]
          const late = hourOf(s.minutes) >= 8.5
          return {
            energy: w.energy,
            hunger: -22,
            rating: late ? 2 : 4,
            skills: 2,
            f: { boss: flag(s, 'boss') + (late ? -2 : 3) },
            msg: (late ? `You came late and ${w.boss.toLowerCase()} noticed. ` : '') + pick(w.tasks),
          }
        },
        done: (s) => ({ month: { ...s.month, ppaDays: s.month.ppaDays + 1 }, f: { ...s.f, ppaDays: flag(s, 'ppaDays') + 1 } }),
      },
      { id: 'gist', label: 'Gist with colleagues', window: [8, 16], duration: 20, effect: { mood: 5 } },
    ],
  },
  {
    id: 'cds',
    name: 'LGA Secretariat',
    pos: [-26, 16],
    building: { size: [14, 5, 9], color: '#e1bee7', roof: '#6a1b9a' },
    actions: [
      {
        id: 'cdsmeet',
        label: 'Attend CDS meeting',
        weekdays: [3],
        window: [9, 12],
        oncePerDay: true,
        duration: 180,
        effect: { rating: 4, mood: 3, energy: -10, msg: 'CDS meeting done. Your group is planning a project for the community.' },
        done: (s) => ({ month: { ...s.month, cds: s.month.cds + 1 }, f: { ...s.f, cds: flag(s, 'cds') + 1 } }),
      },
      {
        id: 'project',
        label: 'Work on CDS project',
        labelFor: (s) => (s.cdsKind ? `Work on the ${CDS[s.cdsKind].title.toLowerCase()}` : 'Work on CDS project'),
        weekdays: [0, 1, 2, 3, 4, 5],
        window: [8, 17],
        oncePerDay: true,
        cost: (s) => (flag(s, 'sponsor') > 0 || !s.cdsKind ? 0 : CDS[s.cdsKind].cost),
        duration: 180,
        check: (s) => (flag(s, 'cds') > 0 && s.cdsKind ? null : 'Attend a CDS meeting first (Thursdays)'),
        hidden: (s) => s.project >= 100,
        effect: (s) => {
          const c = s.cdsKind ? CDS[s.cdsKind] : CDS.borehole
          const sponsored = flag(s, 'sponsor') > 0
          return {
            energy: -20,
            hunger: -10,
            rating: 3,
            project: c.step,
            f: sponsored ? { sponsor: flag(s, 'sponsor') - 1 } : undefined,
            msg: s.project + c.step >= 100 ? 'Project complete! ' + c.done : (sponsored ? 'The chairman’s money paid for materials. ' : '') + c.work,
          }
        },
      },
      {
        id: 'sponsor',
        label: 'Ask the LGA chairman for sponsorship',
        weekdays: [0, 1, 2, 3, 4],
        window: [9, 15],
        duration: 90,
        hidden: (s) => s.project >= 100 || !s.cdsKind,
        check: (s) => (flag(s, 'sponsorMonth') === monthOf(s.minutes) ? 'You already asked this month' : null),
        effect: (s): Effect =>
          Math.random() < s.rating / 110
            ? { rating: 2, mood: 10, f: { sponsor: 2, sponsorMonth: monthOf(s.minutes) }, msg: 'The chairman was impressed and will pay for your next 2 project sessions!' }
            : { mood: -6, f: { sponsorMonth: monthOf(s.minutes) }, msg: 'The chairman said "come back next month". His PA collected your proposal and smiled.' },
      },
      {
        id: 'clearance',
        label: 'Monthly clearance (LGI)',
        weekdays: [4, 5],
        window: [9, 15],
        duration: 60,
        hidden: (s) => !notCleared(s),
        check: (s) => {
          if (s.month.ppaDays < 3) return `Need 3 PPA days this month (${s.month.ppaDays}/3)`
          if (s.month.cds < 1) return 'Need to attend CDS this month'
          return null
        },
        effect: { rating: 2, mood: 6, msg: 'The LGI signed your clearance. Allawee is coming on Monday!' },
        done: (s) => ({ month: { ...s.month, cleared: true } }),
      },
    ],
  },
  {
    id: 'market',
    name: 'Town Market',
    pos: [28, 14],
    building: { size: [16, 3, 7], color: '#ffcc80', roof: '#00897b', kind: 'stalls' },
    actions: [
      {
        id: 'foodstuff',
        label: 'Buy foodstuff (3 meals)',
        cost: 1800,
        window: [7, 19],
        duration: 30,
        effect: { msg: 'Rice, beans, garri, pepper and oil. Enough for 3 meals.' },
        done: (s) => ({ f: { ...s.f, food: flag(s, 'food') + 3 } }),
      },
      { id: 'puff', label: 'Puff-puff & zobo', cost: 400, window: [7, 21], duration: 10, effect: { hunger: 12, mood: 3 } },
      {
        id: 'pos',
        label: 'Run a POS stand (3 hrs)',
        window: [9, 17],
        oncePerDay: true,
        duration: 180,
        effect: (s) => ({ energy: -14, hunger: -8, money: 2500 + Math.round(s.skills * 40), tx: 'POS hustle', msg: 'Busy day at the POS stand.' }),
      },
      {
        id: 'outfit',
        label: 'Buy a corporate outfit',
        cost: 8000,
        window: [8, 19],
        duration: 40,
        hidden: (s) => !isOffice(ppaKind(s)) || !!flag(s, 'outfit'),
        effect: { mood: 8, f: { outfit: 1 }, msg: 'Shirt, trousers, tie and shiny shoes. You look like a banker already.' },
      },
      {
        id: 'gear',
        label: 'Buy equipment',
        labelFor: (s) => (s.trade ? `Buy a ${TRADES[s.trade].gear[s.gear].toLowerCase()}` : 'Buy equipment'),
        cost: (s) => GEAR_COST[s.gear] ?? 0,
        window: [8, 19],
        duration: 30,
        hidden: (s) => !s.trade || s.gear >= 2,
        effect: (s) => ({ mood: 10, data: { gear: s.gear + 1 }, msg: `New ${s.trade ? TRADES[s.trade].gear[s.gear].toLowerCase() : 'equipment'}! Your business will earn more now.` }),
      },
    ],
  },
  {
    id: 'buka',
    name: 'Mama Put Buka',
    pos: [0, 26],
    building: { size: [9, 3.5, 6], color: '#fff59d', roof: '#ef6c00' },
    actions: [
      { id: 'rice', label: 'Rice, beans & plantain', cost: 1500, window: [7, 21], duration: 30, effect: { hunger: 45, mood: 4 } },
      { id: 'amala', label: 'Amala & ewedu', cost: 1300, window: [11, 21], duration: 30, effect: { hunger: 40, mood: 6 } },
      {
        id: 'buddy',
        label: 'Eat & gist with your camp friend',
        labelFor: (s) => `Eat & gist with ${bestMate(s)?.name ?? 'your camp friend'}`,
        cost: 1500,
        window: [17, 22],
        oncePerDay: true,
        duration: 60,
        hidden: (s) => !s.mates.length,
        effect: (s) => ({ hunger: 40, mood: 12, bond: 4, msg: `${bestMate(s)?.name} gisted you about their PPA. ${pick(['Their boss is wahala.', 'They are dating a local!', 'They want to japa after service.'])}` }),
      },
    ],
  },
  {
    id: 'lesson',
    name: 'Estate (Lessons)',
    pos: [-4, -36],
    building: { size: [11, 4.5, 8], color: '#b3e5fc', roof: '#37474f' },
    actions: [
      {
        id: 'teach',
        label: 'Teach a private lesson',
        weekdays: [0, 1, 2, 3, 4],
        window: [16, 19],
        oncePerDay: true,
        duration: 120,
        effect: (s) => ({ energy: -14, money: 4000 + Math.round(s.skills * 30), tx: 'Private lesson', rating: 1, msg: "You taught the chairman's children Maths." }),
      },
    ],
  },
  {
    id: 'viewing',
    name: 'Viewing Centre',
    pos: [44, -14],
    building: { size: [8, 3.5, 7], color: '#cfd8dc', roof: '#263238' },
    actions: [
      { id: 'football', label: 'Watch football', cost: 300, window: [16, 23], duration: 120, effect: { mood: 18, energy: -4, msg: 'Super Eagles won! The whole centre shouted.' } },
      { id: 'fifa', label: 'Play FIFA', cost: 500, window: [10, 23], duration: 60, effect: { mood: 10 } },
    ],
  },
]

export function objectives(s: GameData): { text: string; done: boolean }[] {
  if (s.phase === 'camp') {
    return [
      { text: 'Register at the tent by the gate', done: !!flag(s, 'registered') },
      { text: 'Get sworn in (Tuesday morning)', done: !!flag(s, 'swornIn') },
      { text: `Attend 3 drills (${Math.min(3, flag(s, 'drills'))}/3)`, done: flag(s, 'drills') >= 3 },
      { text: `Attend 2 lectures (${Math.min(2, flag(s, 'lectures'))}/2)`, done: flag(s, 'lectures') >= 2 },
      { text: s.trade ? `Learn a SAED trade (${TRADES[s.trade].title})` : 'Take a SAED class and pick a trade', done: !!s.trade },
      { text: s.role ? `Camp role: ${ROLES[s.role].title}` : 'Get sworn in to pick a camp role', done: !!s.role },
      { text: `Win the platoon cup (Platoon ${s.platoon} is ${ordinal(cupPlace(s))})`, done: cupPlace(s) === 1 && !!flag(s, 'postingReady') },
      { text: 'Collect posting letter (Thursday 4pm+)', done: !!flag(s, 'postingReady') },
    ]
  }
  if (s.phase === 'ppa') {
    return [
      { text: `Month ${monthOf(s.minutes)}: work 3 days at PPA (${Math.min(3, s.month.ppaDays)}/3)`, done: s.month.ppaDays >= 3 },
      { text: 'Attend CDS on Thursday', done: s.month.cds >= 1 },
      { text: 'Get cleared by the LGI (Fri/Sat)', done: s.month.cleared },
      ...(isOffice(ppaKind(s)) ? [{ text: 'Buy a corporate outfit for the office', done: !!flag(s, 'outfit') }] : []),
      { text: `Finish the ${s.cdsKind ? CDS[s.cdsKind].title.toLowerCase() : 'CDS project'} (${s.project}%)`, done: s.project >= 100 },
      ...(s.trade ? [{ text: `Grow your ${TRADES[s.trade].title.toLowerCase()} business (${naira(s.bizEarned)} of ${naira(BIZ_GOAL)})`, done: s.bizEarned >= BIZ_GOAL }] : []),
      { text: `Save money for after service (${naira(s.money)})`, done: s.money >= 100000 },
    ]
  }
  return []
}
