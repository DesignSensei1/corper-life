import type { GameEvent } from './types'
import { hourOf, naira } from './time'

const h = (m: number) => hourOf(m)

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
            ? { energy: -10, hunger: 30, mood: 15, rating: 3, msg: 'Your platoon won! Everyone ate the winning egusi.' }
            : { energy: -10, hunger: 20, mood: 4, msg: 'Platoon 7 won, but at least you ate well.' },
      },
      { label: 'Not today', resolve: () => ({ mood: -3, msg: 'Your platoon mates hissed.' }) },
    ],
  },
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

export function rollEvent(s: Parameters<GameEvent['when']>[0], seen: string[]): GameEvent | null {
  const pool = EVENTS.filter((e) => e.when(s) && !seen.slice(-3).includes(e.id))
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
