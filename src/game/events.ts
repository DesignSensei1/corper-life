import type { CdsKind, Effect, GameData, GameEvent, PpaKind, Role, Trade } from './types'
import { dayOf, hourOf, monthOf, naira } from './time'
import { CDS, PPA_WORK, ROLES, TRADES, bestMate, bondAvg, mateName, ppaKind } from './people'

const h = (m: number) => hourOf(m)
const seen = (s: GameData, id: string) => !!s.f['ev:' + id]
const ppaMonth = (s: GameData) => (s.phase === 'ppa' ? monthOf(s.minutes) : 0)

export const EVENTS: GameEvent[] = [
  {
    id: 'soldier',
    title: 'Soldier on patrol!',
    text: 'A soldier spots you loitering during drill time. "You! Corper! Why you no dey parade ground?"',
    when: (s) => s.phase === 'camp' && h(s.minutes) >= 6 && h(s.minutes) < 9,
    choices: [
      { label: 'Do the frog jump', resolve: () => ({ energy: -15, mood: -5, msg: '20 frog jumps later, your legs are shaking.' }) },
      {
        label: 'Run!',
        resolve: () =>
          Math.random() < 0.5
            ? { mood: 6, msg: 'You escaped behind Hostel B. Close one!' }
            : { energy: -20, rating: -5, msg: 'He caught you. Frog jump AND your name went in the book.' },
      },
    ],
  },
  {
    id: 'redeploy',
    title: 'Redeployment "connect"',
    text: `A man in a suit says he can "help" you get redeployed to Lagos for ${naira(50000)}.`,
    when: (s) => s.phase === 'camp' && s.money >= 50000,
    choices: [
      { label: 'Pay him', resolve: () => ({ money: -50000, mood: -20, tx: 'Redeployment scam', msg: 'He vanished with your money. Redeployment only happens through the NYSC portal. Lesson learnt.' }) },
      { label: 'Refuse', resolve: () => ({ mood: 6, msg: 'Smart. Redeployment only happens through the official NYSC portal.' }) },
    ],
  },
  {
    id: 'platoon',
    title: 'Platoon competition',
    text: 'Your platoon is short of people for the cooking competition. The platoon leader begs you to join.',
    when: (s) => s.phase === 'camp' && h(s.minutes) >= 12 && h(s.minutes) < 19,
    choices: [
      {
        label: 'Join in',
        resolve: () =>
          Math.random() < 0.6
            ? { energy: -10, hunger: 30, mood: 15, rating: 3, cup: 15, bond: 4, msg: 'Your platoon won! Everyone ate the winning egusi.' }
            : { energy: -10, hunger: 20, mood: 4, cup: 4, bond: 2, msg: 'Another platoon won, but at least you ate well.' },
      },
      { label: 'Not today', resolve: () => ({ mood: -3, bond: -3, msg: 'Your platoon mates hissed.' }) },
    ],
  },
  ...STORIES(),
  {
    id: 'nepa',
    title: 'NEPA took light',
    text: 'Power is out and the night is hot. Your neighbour has a generator.',
    when: (s) => s.phase === 'ppa' && (h(s.minutes) >= 19 || h(s.minutes) < 2),
    choices: [
      { label: `Contribute ${naira(1000)} for fuel`, resolve: () => ({ money: -1000, mood: 4, tx: 'Generator fuel', msg: 'Light is back. You charged your phone too.' }) },
      { label: 'Endure the heat', resolve: () => ({ mood: -8, energy: -5, msg: 'Mosquitoes had a party on you.' }) },
    ],
  },
  {
    id: 'principal',
    title: 'Extra classes',
    text: 'The principal asks you to cover extra classes on Saturday for the WAEC students.',
    when: (s) => s.phase === 'ppa' && h(s.minutes) >= 8 && h(s.minutes) < 17,
    choices: [
      { label: 'Accept', resolve: () => ({ energy: -15, rating: 6, money: 3000, tx: 'Extra classes stipend', msg: 'The principal gave you a small stipend and praised you at assembly.' }) },
      { label: 'Politely decline', resolve: () => ({ rating: -2, msg: 'He said "No problem"… but his face said otherwise.' }) },
    ],
  },
  {
    id: 'family',
    title: 'Call from home',
    text: 'Your younger sibling calls. School fees are due and they are short.',
    when: (s) => s.phase === 'ppa' && s.money >= 15000,
    choices: [
      { label: `Send ${naira(10000)}`, resolve: () => ({ money: -10000, mood: 10, tx: 'Sent to sibling', msg: 'They were so grateful. You feel good.' }) },
      { label: 'Tell them you are broke', resolve: () => ({ mood: -8, msg: 'You feel bad, but allawee is not much.' }) },
    ],
  },
  {
    id: 'chief',
    title: "Chief's party",
    text: 'The village chief invites all corpers to his birthday party. Food and drinks are free.',
    when: (s) => s.phase === 'ppa' && h(s.minutes) >= 15 && h(s.minutes) < 21,
    choices: [
      { label: 'Go', resolve: () => ({ hunger: 50, mood: 15, energy: -8, msg: 'Pounded yam, goat meat and dancing. The chief loved you.' }) },
      { label: 'Stay home', resolve: () => ({ energy: 5, msg: 'You rested instead.' }) },
    ],
  },
  {
    id: 'fuel',
    title: 'Fuel scarcity',
    text: 'Fuel price jumped again. Keke fares have doubled across town.',
    when: (s) => s.phase === 'ppa' && h(s.minutes) >= 7 && h(s.minutes) < 18,
    choices: [
      { label: 'Pay the new fare', resolve: () => ({ money: -800, mood: -3, tx: 'Transport (fuel scarcity)', msg: 'Your wallet felt that.' }) },
      { label: 'Trek instead', resolve: () => ({ energy: -12, hunger: -6, msg: 'Long trek under the sun.' }) },
    ],
  },
]

export function rollEvent(s: GameData, recent: string[]): GameEvent | null {
  const pool = EVENTS.filter((e) => e.when(s) && !recent.slice(-3).includes(e.id) && !(e.story && seen(s, e.id)))
  const stories = pool.filter((e) => e.story)
  const from = stories.length && Math.random() < 0.7 ? stories : pool
  if (!from.length) return null
  return from[Math.floor(Math.random() * from.length)]
}

// ---------------------------------------------------------------- STORYLINES
// Each step runs once (the store marks ev:<id> when you choose) and later steps wait for earlier ones.

function STORIES(): GameEvent[] {
  const camp = (s: GameData) => s.phase === 'camp' && !!s.f.registered
  return [
    {
      id: 'whites',
      story: true,
      title: 'Missing whites',
      text: (s) => `${mateName(s, 1)} can't find their whites and swearing-in is soon. You have a spare set.`,
      when: (s) => camp(s) && !s.f.swornIn,
      choices: [
        { label: 'Lend them your spare', resolve: (s) => ({ mood: 6, bond: 8, msg: `${mateName(s, 1)} hugged you. The whole bunk saw it.` }) },
        { label: 'Not my problem', resolve: (s) => ({ bond: -6, msg: `${mateName(s, 1)} borrowed from Hostel A instead and stopped greeting you.` }) },
      ],
    },
    {
      id: 'malaria',
      story: true,
      title: 'Bunkmate down',
      text: (s) => `${mateName(s, 2)} is shivering with malaria on the top bunk.`,
      when: (s) => camp(s) && dayOf(s.minutes) >= 1,
      choices: [
        { label: 'Take them to the clinic', resolve: (s) => ({ energy: -8, bond: 10, rating: 1, msg: `The nurse gave ${mateName(s, 2)} drugs. They swear they owe you for life.` }) },
        { label: 'Let them sleep it off', resolve: () => ({ bond: -5, msg: 'They recovered, slowly. The bunk was quiet that night.' }) },
      ],
    },
    {
      id: 'crush',
      story: true,
      title: 'Love letter',
      text: (s) => `${mateName(s, 0)} wants you to deliver a note to their crush in Platoon 5 at social night.`,
      when: (s) => camp(s) && h(s.minutes) >= 17,
      choices: [
        {
          label: 'Deliver it',
          resolve: (s) =>
            Math.random() < 0.6
              ? { mood: 12, bond: 8, msg: `The crush smiled and said yes! ${mateName(s, 0)} has not stopped grinning.` }
              : { mood: 4, bond: 5, msg: `The crush laughed and said "Tell your friend to try again." ${mateName(s, 0)} is heartbroken.` },
        },
        { label: 'Tell them to do it themselves', resolve: () => ({ bond: -2, mood: 2, msg: 'They chickened out. Maybe at POP.' }) },
      ],
    },

    // landlord arc
    {
      id: 'land1',
      story: true,
      title: 'Landlord wahala',
      text: `Your landlord says "economy is hard" and wants to raise your rent to ${naira(18000)} a month.`,
      when: (s) => ppaMonth(s) >= 1,
      choices: [
        { label: 'Accept it', resolve: () => ({ mood: -6, f: { rent: 18000 }, msg: `Rent is now ${naira(18000)}. Your wallet is crying.` }) },
        {
          label: 'Negotiate',
          resolve: () =>
            Math.random() < 0.5
              ? { mood: 8, f: { rent: 12000 }, msg: 'You begged and praised his agbada. Rent stays the same!' }
              : { mood: -2, f: { rent: 15000 }, msg: `He met you halfway: ${naira(15000)} a month.` },
        },
        { label: 'Move to a cheaper room', resolve: () => ({ mood: -10, energy: -10, f: { rent: 8000 }, msg: `You moved to a ${naira(8000)} room. No fan, no light, but cheap.` }) },
      ],
    },
    {
      id: 'land2',
      story: true,
      title: "Landlord's son",
      text: 'Your landlord’s son is writing JAMB. The landlord offers to cut your rent if you teach him at weekends.',
      when: (s) => ppaMonth(s) >= 3 && seen(s, 'land1'),
      choices: [
        { label: 'Teach him', resolve: (s) => ({ energy: -15, skills: 3, f: { rent: Math.max(5000, (s.f.rent ?? 12000) - 4000) }, msg: 'He scored 280 in JAMB! Your rent dropped by ₦4,000.' }) },
        { label: 'No time', resolve: () => ({ msg: 'The landlord hissed and walked away.' }) },
      ],
    },

    // boss arc
    {
      id: 'boss1',
      story: true,
      title: 'Urgent work',
      text: (s) => `${PPA_WORK[ppaKind(s)].boss} asks you to stay late to finish an urgent job.`,
      when: (s) => ppaMonth(s) >= 1 && (s.f.ppaDays ?? 0) >= 1 && h(s.minutes) >= 9 && h(s.minutes) < 18,
      choices: [
        { label: 'Stay late', resolve: (s) => ({ energy: -18, rating: 2, f: { boss: (s.f.boss ?? 0) + 8 }, msg: 'You finished at 9pm. Your boss noticed.' }) },
        { label: 'Go home on time', resolve: (s) => ({ mood: 4, f: { boss: (s.f.boss ?? 0) - 3 }, msg: 'You left at closing time. Your boss said nothing, loudly.' }) },
      ],
    },
    {
      id: 'boss2',
      story: true,
      title: (s) => BIG[ppaKind(s)].title,
      text: (s) => BIG[ppaKind(s)].text,
      when: (s) => ppaMonth(s) >= 2 && seen(s, 'boss1') && h(s.minutes) >= 8 && h(s.minutes) < 18,
      choices: [
        { label: (s) => BIG[ppaKind(s)].yes, resolve: (s) => BIG[ppaKind(s)].go(s) },
        { label: 'Stay out of it', resolve: (s) => ({ f: { boss: (s.f.boss ?? 0) - 2 }, msg: 'Someone else got the credit.' }) },
      ],
    },
    {
      id: 'boss3',
      story: true,
      title: 'A word in the office',
      text: (s) => `${PPA_WORK[ppaKind(s)].boss} calls you in. "Your service year is almost over. We would like to keep you after POP. Will you stay?"`,
      when: (s) => ppaMonth(s) >= 9 && seen(s, 'boss2') && (s.f.boss ?? 0) >= 30,
      choices: [
        { label: 'Yes, I will stay', resolve: () => ({ mood: 25, f: { offer: 1 }, msg: 'You have a job waiting after service! 🎉' }) },
        { label: 'I have other plans', resolve: () => ({ mood: 5, f: { offer: 0 }, msg: 'They said the door is always open.' }) },
      ],
    },

    // Mama Put arc
    {
      id: 'mama1',
      story: true,
      title: 'Mama Put needs help',
      text: 'Mama Put’s son is sick and she must rush to the hospital. Can you watch the buka for the afternoon?',
      when: (s) => ppaMonth(s) >= 1 && h(s.minutes) >= 11 && h(s.minutes) < 16,
      choices: [
        { label: 'Watch the buka', resolve: () => ({ energy: -12, hunger: 30, mood: 6, f: { mamaHelped: 1 }, msg: 'You served 40 plates of rice. Mama Put came back in tears of gratitude.' }) },
        { label: 'Sorry, I am busy', resolve: () => ({ mood: -3, msg: 'She closed the buka for the day.' }) },
      ],
    },
    {
      id: 'mama2',
      story: true,
      title: 'Mama Put remembers',
      text: 'Mama Put stops you on the street with a big cooler. "My pikin is well now. This one is for you."',
      when: (s) => ppaMonth(s) >= 2 && seen(s, 'mama1') && (s.f.mamaHelped ?? 0) === 1,
      choices: [{ label: 'Thank you, Mama!', resolve: (s) => ({ mood: 12, f: { food: (s.f.food ?? 0) + 5 }, msg: 'Five portions of jollof and stew. Your kitchen is full.' }) }],
    },

    // camp friend arc
    {
      id: 'bud1',
      story: true,
      title: 'Familiar face',
      text: (s) => `${bestMate(s)?.name ?? 'Your bunkmate'} from camp was posted to ${s.posting?.lga} too! They live on the next street.`,
      when: (s) => ppaMonth(s) >= 1 && s.mates.length > 0,
      choices: [
        { label: `Celebrate at the buka (${naira(2000)})`, resolve: () => ({ money: -2000, tx: 'Buka with camp friend', mood: 15, bond: 8, msg: 'Pepper soup, cold drinks and camp gist till late.' }) },
        { label: 'Wave and keep moving', resolve: () => ({ bond: -3, msg: 'You promised to link up later.' }) },
      ],
    },
    {
      id: 'bud2',
      story: true,
      title: 'Business proposal',
      text: (s) => `${bestMate(s)?.name} wants to start a small business with you: buy bags of rice in bulk and sell to corpers. Your share is ${naira(20000)}.`,
      when: (s) => ppaMonth(s) >= 2 && seen(s, 'bud1') && s.money >= 20000,
      choices: [
        { label: `Invest ${naira(20000)}`, resolve: () => ({ money: -20000, tx: 'Rice business with camp friend', f: { invest: 1 }, msg: 'You shook hands. Partners!' }) },
        { label: 'Not now', resolve: () => ({ msg: 'They found another partner.' }) },
      ],
    },
    {
      id: 'bud3',
      story: true,
      title: 'Rice business payout',
      text: (s) => `${bestMate(s)?.name} calls about the rice business.`,
      when: (s) => ppaMonth(s) >= 4 && (s.f.invest ?? 0) === 1,
      choices: [
        {
          label: 'Hear the news',
          resolve: (s) =>
            Math.random() < 0.65 + bondAvg(s) / 400
              ? { money: 45000, tx: 'Rice business payout', mood: 20, bond: 5, msg: 'Every bag sold! Your share came to ₦45,000.' }
              : { mood: -15, msg: 'Rats ate half the rice in the store. You lost your ₦20,000.' },
        },
      ],
    },

    // CDS project risk
    {
      id: 'theft',
      story: true,
      title: 'Trouble at the CDS site',
      text: (s) => `Thieves have been stealing materials from your ${s.cdsKind ? CDS[s.cdsKind].title.toLowerCase() : 'CDS project'} site at night.`,
      when: (s) => s.phase === 'ppa' && s.project >= 20 && s.project < 80,
      choices: [
        { label: `Pay a night guard (${naira(5000)})`, resolve: () => ({ money: -5000, tx: 'CDS site guard', msg: 'The vigilante guarded the site. Nothing else went missing.' }) },
        { label: 'Leave it', resolve: () => ({ project: -20, mood: -10, msg: 'More materials vanished. Your project went back 20%.' }) },
      ],
    },
  ]
}

const BIG: Record<PpaKind, { title: string; text: string; yes: string; go: (s: GameData) => Effect }> = {
  school: { title: 'WAEC inspection', text: 'Inspectors are visiting your class tomorrow. The principal is nervous.', yes: 'Prepare all night', go: (s) => ({ energy: -20, rating: 5, f: { boss: (s.f.boss ?? 0) + 10 }, msg: 'The inspectors praised your lesson. The principal beamed.' }) },
  hospital: { title: 'Cholera outbreak', text: 'Cholera cases are filling the wards. The medical director needs volunteers for extra shifts.', yes: 'Volunteer', go: (s) => ({ energy: -25, rating: 6, mood: 6, f: { boss: (s.f.boss ?? 0) + 10 }, msg: 'You worked double shifts. Lives were saved.' }) },
  lga: { title: "Chairman's audit", text: 'Auditors are coming and the council records are a mess.', yes: 'Sort the records', go: (s) => ({ energy: -18, rating: 4, f: { boss: (s.f.boss ?? 0) + 9 }, msg: 'The audit passed. The council secretary owes you one.' }) },
  bank: {
    title: 'Month-end target',
    text: 'Every staff must open 20 new accounts before month-end. Your bunkmates could help.',
    yes: 'Call your camp friends',
    go: (s) =>
      bondAvg(s) >= 30
        ? { money: 5000, tx: 'Target bonus', rating: 3, f: { boss: (s.f.boss ?? 0) + 12 }, msg: 'Your camp friends all opened accounts. You hit target first!' }
        : { mood: -6, f: { boss: (s.f.boss ?? 0) - 2 }, msg: 'Nobody picked your calls. Maybe be nicer to your bunkmates next time.' },
  },
  ministry: { title: "Commissioner's visit", text: 'The commissioner is visiting and nobody has written the speech.', yes: 'Write the speech', go: (s) => ({ energy: -15, rating: 5, skills: 3, f: { boss: (s.f.boss ?? 0) + 10 }, msg: 'The commissioner read your speech word for word. The permanent secretary nodded at you.' }) },
  corporate: {
    title: 'Client pitch',
    text: 'The team lead is sick and the big client pitch is in an hour.',
    yes: 'Present it yourself',
    go: (s) =>
      Math.random() < 0.4 + s.skills / 150
        ? { rating: 5, mood: 15, f: { boss: (s.f.boss ?? 0) + 14 }, msg: 'The client signed! Your line manager is telling everyone about you.' }
        : { mood: -10, f: { boss: (s.f.boss ?? 0) - 4 }, msg: 'You froze on slide 3. The client said they will "get back to us".' },
  },
}

// ---------------------------------------------------------------- CHOICES THE GAME ASKS YOU AT KEY MOMENTS

export const ROLE_EVENT: GameEvent = {
  id: 'role',
  title: 'Pick your camp role',
  text: 'You are sworn in! The camp director is looking for volunteers.',
  when: () => false,
  choices: (['leader', 'obs', 'manowar', 'none'] as Role[]).map((r) => ({
    label: `${ROLES[r as Exclude<Role, ''>].title}: ${ROLES[r as Exclude<Role, ''>].blurb}`,
    resolve: () => ({ data: { role: r }, rating: r === 'none' ? 0 : 2, msg: r === 'none' ? 'You kept a low profile.' : `You are now the ${ROLES[r as Exclude<Role, ''>].title.toLowerCase()}!` }),
  })),
}

export const TRADE_EVENT: GameEvent = {
  id: 'trade',
  title: 'Choose your SAED trade',
  text: 'Pick one skill to learn properly. You can turn it into a business at your PPA.',
  when: () => false,
  choices: (Object.keys(TRADES) as Trade[]).map((t) => ({
    label: `${TRADES[t as Exclude<Trade, ''>].title}`,
    resolve: () => ({ data: { trade: t }, skills: 4, msg: `You signed up for ${TRADES[t as Exclude<Trade, ''>].title}. Practise at SAED and start your business at your PPA.` }),
  })),
}

export const CDS_EVENT: GameEvent = {
  id: 'cdschoice',
  title: 'Pick your CDS project',
  text: 'Your CDS group must choose a project for the community.',
  when: () => false,
  choices: (Object.keys(CDS) as CdsKind[]).map((k) => {
    const c = CDS[k as Exclude<CdsKind, ''>]
    return {
      label: `${c.title} (${naira(c.cost)} a session, ${c.step}% each)`,
      resolve: () => ({ data: { cdsKind: k }, msg: `Your group chose the ${c.title.toLowerCase()}. Work on it at the LGA Secretariat, and ask the chairman for sponsorship.` }),
    }
  }),
}
