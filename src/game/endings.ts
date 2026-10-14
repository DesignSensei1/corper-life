import type { GameData } from './types'
import { TRADES, isOffice, ppaKind } from './people'
import { naira } from './time'

export interface Ending {
  title: string
  text: string
  /** extra honours shown under the ending */
  badges: string[]
}

export const BIZ_GOAL = 250000
export const JAPA_GOAL = 450000

/** Your life after POP depends on your record, your money and the people you met. */
export function ending(s: GameData): Ending {
  const badges: string[] = []
  if (s.project >= 100 && s.rating >= 80 && s.monthsMissed === 0) badges.push('🏅 State Honours Award for your CDS project')
  if (s.f.cupWon) badges.push(`🏆 Camp cup winners: Platoon ${s.platoon}`)
  const close = s.mates.filter((m) => m.bond >= 60).map((m) => m.name)
  if (close.length) badges.push(`🤝 Friends for life: ${close.join(', ')}`)

  if (s.monthsMissed > 0)
    return {
      title: 'Service year extended',
      text: `You missed clearance for ${s.monthsMissed} month(s). You must serve extra months before you get your certificate.`,
      badges,
    }

  const ppa = s.posting?.ppa ?? 'your PPA'
  // a boss who rates you highly makes an offer even if you never had "the talk"
  if (s.f.offer === 1 || (s.f.offer === undefined && (s.f.boss ?? 0) >= 40))
    return isOffice(ppaKind(s))
      ? { title: '💼 Job offer!', text: `${ppa} offered you a full-time job starting the Monday after POP. Corporate life, here you come.`, badges }
      : { title: '🏫 Retained by your PPA', text: `${ppa} kept you on as staff after service. Steady salary, and the community already knows you.`, badges }

  if (s.trade && s.bizEarned >= BIZ_GOAL && s.gear >= 1)
    return {
      title: '🛍️ Your own business',
      text: `Your ${TRADES[s.trade].title.toLowerCase()} business made ${naira(s.bizEarned)} during service. You registered it with CAC and went full-time.`,
      badges,
    }

  if (s.money >= JAPA_GOAL)
    return { title: '✈️ Japa!', text: `You saved ${naira(s.money)}: enough for IELTS, a visa and a flight. See you abroad!`, badges }

  return { title: '🎓 Passing Out Parade!', text: 'You collected your Certificate of National Service. On to the labour market!', badges }
}
