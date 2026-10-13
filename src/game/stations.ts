import type { Action, GameData, Station } from './types'
import { dayOf, hourOf, minutesUntilHour, monthOf, naira } from './time'

export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
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
        label: 'Register & collect kits',
        duration: 90,
        hidden: (s) => !!flag(s, 'registered'),
        effect: { energy: -6, mood: 6, msg: 'Registered! You got your kits: whites, khaki, jungle boots and cap. Bunk 14, Hostel B.' },
        done: (s) => ({ f: { ...s.f, registered: 1 } }),
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
        check: registered,
        effect: { energy: -20, hunger: -12, rating: 4, mood: -2, msg: '"Left! Right! Left!" The soldiers drilled you hard.' },
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
        check: registered,
        effect: { energy: -24, hunger: -10, mood: 5, rating: 3, msg: 'You crawled, climbed the rope and screamed "Man O\' War!"' },
        done: (s) => ({ f: { ...s.f, drills: flag(s, 'drills') + 1 } }),
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
          return ok
            ? { rating: 5, mood: 10, msg: 'Posting letter in hand. Time to see where you are going!' }
            : { rating: -10, mood: -5, msg: 'The camp director frowned at your low attendance (-10 rating). Posting letter collected.' }
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
          ]),
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
        effect: () => ({
          energy: -10,
          skills: 8,
          mood: 3,
          msg: 'SAED: ' + pick(['Catering & baking', 'Fashion design', 'ICT & digital marketing', 'Agro-allied (poultry)', 'Photography', 'Make-up & gele tying']),
        }),
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
          msg: pick(['Mr Macho contest! Platoon 4 went wild.', 'Miss NYSC pageant. The crowd was loud.', 'Talent night: someone did a mad Shaku Shaku.', 'Bonfire and gist with your platoon mates.']),
        }),
        done: (s) => ({ f: { ...s.f, socials: flag(s, 'socials') + 1 } }),
      },
    ],
  },
]

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
        label: 'Work at PPA (6 hrs)',
        weekdays: [0, 1, 2, 4],
        window: [7, 10],
        oncePerDay: true,
        duration: 360,
        effect: (s) => {
          const late = hourOf(s.minutes) >= 8.5
          return {
            energy: -28,
            hunger: -22,
            rating: late ? 2 : 4,
            skills: 2,
            msg: (late ? 'You came late and the principal noticed. ' : '') + pick(['You taught SS2 Biology.', 'You marked 60 scripts.', 'You covered JSS1 Maths.', 'You helped organise the school records.']),
          }
        },
        done: (s) => ({ month: { ...s.month, ppaDays: s.month.ppaDays + 1 }, f: { ...s.f, ppaDays: flag(s, 'ppaDays') + 1 } }),
      },
      { id: 'gist', label: 'Staff room gist', window: [8, 16], duration: 20, effect: { mood: 5 } },
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
        weekdays: [0, 1, 2, 3, 4, 5],
        window: [8, 17],
        oncePerDay: true,
        cost: 4000,
        duration: 180,
        check: (s) => (flag(s, 'cds') > 0 ? null : 'Attend a CDS meeting first (Thursdays)'),
        hidden: (s) => s.project >= 100,
        effect: (s) => ({
          energy: -20,
          hunger: -10,
          rating: 3,
          project: 20,
          msg: s.project + 20 >= 100 ? 'Project complete! The community borehole is flowing. 🎉' : 'You bought materials and worked on the community borehole project.',
        }),
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
      { text: 'Take a SAED class', done: flag(s, 'saed') >= 1 },
      { text: 'Collect posting letter (Thursday 4pm+)', done: !!flag(s, 'postingReady') },
    ]
  }
  if (s.phase === 'ppa') {
    return [
      { text: `Month ${monthOf(s.minutes)}: work 3 days at PPA (${Math.min(3, s.month.ppaDays)}/3)`, done: s.month.ppaDays >= 3 },
      { text: 'Attend CDS on Thursday', done: s.month.cds >= 1 },
      { text: 'Get cleared by the LGI (Fri/Sat)', done: s.month.cleared },
      { text: `Finish the CDS project (${s.project}%)`, done: s.project >= 100 },
      { text: `Save money for after service (${naira(s.money)})`, done: s.money >= 100000 },
    ]
  }
  return []
}
