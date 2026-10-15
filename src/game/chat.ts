import type { ChatMsg, GameData } from './types'
import { FIRST, bestMate, pick } from './people'
import { ALLAWEE, dayOf, hourOf, naira, weekdayOf } from './time'

/** The corpers in your LGA WhatsApp group: your bunkmates plus a few corpers you meet at the LGA. */
export function chatMembers(s: GameData): { name: string; shirt: string }[] {
  const mates = s.mates.map((m) => ({ name: m.name, shirt: m.shirt }))
  const locals = FIRST.filter((n) => !s.mates.some((m) => m.name === n))
    .slice(0, 3)
    .map((name, i) => ({ name, shirt: ['#26a69a', '#8d6e63', '#5c6bc0'][i] }))
  return [...mates, ...locals]
}

export const groupName = (s: GameData) => `${s.posting?.lga ?? 'LGA'} Corpers 🇳🇬`

const msg = (s: GameData, from: string, text: string): ChatMsg => ({ at: s.minutes, from, text })

function speaker(s: GameData, not?: string) {
  const all = chatMembers(s).filter((m) => m.name !== not)
  return pick(all).name
}

/** Lines the group posts on its own as the days go by. */
function gist(s: GameData): string {
  const lga = s.posting?.lga ?? 'this town'
  return pick([
    'Who else PPA is giving wahala? My principal wants me to teach 4 subjects 😩',
    `Abeg which side get light for ${lga}? NEPA took it since morning`,
    'Mama Put by the junction added ₦200 to rice. Economy is wicked',
    'Anybody selling a fan? Mine just packed up',
    'Who wants to split a bag of rice? Bulk is cheaper',
    'The okada man charged me ₦700 for that short distance 😂',
    'Corpers night is coming up soon. Start saving for your outfit',
    'I just saw a job opening for after service. Will drop the link when I find it',
    'Make sure una no miss clearance o. My friend got extended last batch',
    'The bank queue today was crazy. Network was down for 2 hours',
    'Church was lit today. Choir did their thing 🙌',
    "Jumu'ah was full today. The Imam even prayed for corpers",
    'Who has a good tailor here? I want to sew my POP outfit',
    'Rain beat me well today 🌧️ khaki is soaked',
    'My landlord said he will increase rent. I said sir, I am a corper 😭',
    'Japa plans loading. Who is writing IELTS?',
  ])
}

/** Messages tied to the calendar, posted at the start of the hour named in the key. */
function scheduled(s: GameData): string | null {
  const wd = weekdayOf(s.minutes)
  const h = Math.floor(hourOf(s.minutes))
  if (wd === 0 && h === 9) return pick(['Allawee don land!!! 💸💸', `Credit alert! ${naira(ALLAWEE)} 🙏🏾`, 'Has anybody gotten alert? Mine never land o'])
  if (wd === 2 && h === 20) return 'Reminder: CDS tomorrow morning at the LGA secretariat. Wear your khaki!'
  if (wd === 4 && h === 8) return 'LGI is at the secretariat for clearance today and tomorrow, 9am to 3pm. Don’t forget!'
  if (wd === 4 && h === 11) return "Brothers, see you at Jumu'ah by 12. The central mosque"
  if (wd === 6 && h === 7) return 'Sunday service starts by 8 at the church. Corpers fellowship is Wednesday evening'
  return null
}

/** Called at the top of each hour during the service year. */
export function hourlyChat(s: GameData): ChatMsg | null {
  const h = hourOf(s.minutes)
  if (h < 7 || h >= 23) return null
  const fixed = scheduled(s)
  if (fixed) return msg(s, speaker(s), fixed)
  if (Math.random() < 0.18) return msg(s, speaker(s), gist(s))
  return null
}

const has = (t: string, ...w: string[]) => w.some((x) => t.includes(x))

/** What someone in the group says back when you post. */
export function replyTo(s: GameData, text: string): ChatMsg {
  const t = text.toLowerCase()
  const buddy = bestMate(s)?.name
  const from = buddy && Math.random() < 0.5 ? buddy : speaker(s)
  let r: string
  if (has(t, 'allawee', 'alert', 'money', 'pay')) r = `Allawee is ${naira(ALLAWEE)} and it lands Monday morning, only if you were cleared the week before.`
  else if (has(t, 'clearance', 'clear', 'lgi')) r = 'Clearance is Friday or Saturday, 9am–3pm at the LGA. You need 3 days at PPA and CDS attendance that month.'
  else if (has(t, 'extend', 'extension', 'miss')) r = 'If you miss clearance they add one more month to your service. You still finish, just later. No let it happen again 😅'
  else if (has(t, 'cds', 'project')) r = 'CDS is Thursday 9am–12pm at the secretariat. After that you can work on the project any weekday.'
  else if (has(t, 'bank', 'save', 'savings', 'account')) r = 'Open a savings account at the bank, weekdays 8am–4pm. It pays small interest every month and keeps you from spending everything.'
  else if (has(t, 'church', 'service', 'fellowship', 'nccf', 'choir')) r = 'Sunday service is 8am. NCCF fellowship is Wednesday 5pm and choir practice is Saturday 4pm. Come and join us!'
  else if (has(t, 'mosque', 'jumat', "jumu'ah", 'jummah', 'pray', 'salat', 'nasfat', 'mssn')) r = "Jumu'ah is Friday 12–3pm at the central mosque. Our corpers' halaqah is Sunday 4pm, and the madrasa needs teachers on Saturday morning."
  else if (has(t, 'hustle', 'job', 'side', 'work', 'business')) r = 'POS stand at the market pays daily. Private lessons at the estate pay well too, weekdays 4–7pm.'
  else if (has(t, 'food', 'hungry', 'eat', 'chop')) r = 'Mama Put buka for quick food. If you want to save money, buy foodstuff at the market and cook.'
  else if (has(t, 'rent', 'landlord', 'lodge')) r = 'Rent comes out every month o. Negotiate with your landlord if he tries to increase it.'
  else if (/\b(hi|hello|hey|sup)\b|how far|good (morning|afternoon|evening)/.test(t)) r = pick(['How far! We dey', 'Hello o! How PPA?', 'Good to see you here 🙌', 'Welcome! How your side?'])
  else if (has(t, 'japa', 'abroad', 'ielts')) r = 'Save your allawee and you can japa after POP. I am also planning 😄'
  else r = pick(['😂😂', 'True talk', 'Abeg no vex, I just saw this', 'Na so o!', 'Lol, you no serious', 'I agree with you', '🙏🏾'])
  return msg(s, from, r)
}

export const QUICK_REPLIES = ['How far everyone? 👋', 'When is clearance?', 'Any side hustle around here?', 'Which church or mosque do corpers go to?', 'Has allawee dropped?']

/** You get a small mood and friendship boost the first time you chat each day. */
export const chattedToday = (s: GameData) => (s.f.chatDay ?? 0) === dayOf(s.minutes) + 1

export const unreadChat = (s: GameData) => s.chat.filter((m) => !m.me && m.at > (s.f.chatReadAt ?? -1)).length
