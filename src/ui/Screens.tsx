import { useEffect, useState } from 'react'
import { clearSave, useGame } from '../game/store'
import { objectives } from '../game/stations'
import { ALLAWEE, naira } from '../game/time'
import { STATES } from '../game/states'

export function Menu() {
  const hasSave = useGame((s) => s.hasSave)
  const newGame = useGame((s) => s.newGame)
  const cont = useGame((s) => s.continueGame)
  const [name, setName] = useState('')
  return (
    <div className="overlay menu">
      <div className="card">
        <div className="flag">
          <span />
          <span />
          <span />
        </div>
        <h1>Corper Life</h1>
        <p className="muted">
          Survive orientation camp, serve at your PPA, finish your CDS project and make it to Passing Out Parade with your allawee intact.
        </p>
        <label className="field">
          Your name
          <input value={name} maxLength={20} placeholder="e.g. Chiamaka Bello" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newGame(name)} />
        </label>
        <button className="primary" onClick={() => newGame(name)}>
          {hasSave ? 'Start a new service year' : 'Report to camp'}
        </button>
        {hasSave && (
          <button className="secondary" onClick={cont}>
            Continue saved game
          </button>
        )}
        <p className="tiny muted">Move with WASD or the on-screen stick. Walk onto a yellow ring to see what you can do there.</p>
      </div>
    </div>
  )
}

export function PostingModal() {
  const s = useGame()
  if (!s.showPosting || !s.posting) return null
  return (
    <div className="overlay">
      <div className="card letter">
        <div className="tiny muted">NATIONAL YOUTH SERVICE CORPS · POSTING LETTER</div>
        <h2>You have been posted!</h2>
        <p>
          Dear <strong>{s.name}</strong>, you are posted to:
        </p>
        <div className="posting">
          <div>
            <span className="muted">State</span> {s.posting.state}
          </div>
          <div>
            <span className="muted">LGA</span> {s.posting.lga}
          </div>
          <div>
            <span className="muted">PPA</span> {s.posting.ppa}
          </div>
        </div>
        <p className="muted">Transport costs {naira(5000)} and your first month's lodge rent is due on arrival.</p>
        <button className="primary" onClick={s.travelToPPA}>
          Travel to {s.posting.lga}
        </button>
      </div>
    </div>
  )
}

export function EventModal() {
  const ev = useGame((s) => s.event)
  const result = useGame((s) => s.eventResult)
  const choose = useGame((s) => s.chooseEvent)
  const close = useGame((s) => s.closeEventResult)
  if (result)
    return (
      <div className="overlay">
        <div className="card">
          <p>{result}</p>
          <button className="primary" onClick={close}>
            Continue
          </button>
        </div>
      </div>
    )
  if (!ev) return null
  return (
    <div className="overlay">
      <div className="card">
        <h2>{ev.title}</h2>
        <p>{ev.text}</p>
        {ev.choices.map((c, i) => (
          <button key={i} className={i === 0 ? 'primary' : 'secondary'} onClick={() => choose(i)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Phone() {
  const s = useGame()
  const [tab, setTab] = useState<'tasks' | 'wallet' | 'me'>('tasks')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') useGame.getState().togglePhone()
      if (e.code === 'Escape') useGame.getState().togglePhone(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (!s.phoneOpen) return null
  return (
    <div className="overlay" onClick={() => s.togglePhone(false)}>
      <div className="phone" onClick={(e) => e.stopPropagation()}>
        <div className="phone-notch" />
        <div className="tabs">
          {(['tasks', 'wallet', 'me'] as const).map((t) => (
            <button key={t} className={tab === t ? 'tab on' : 'tab'} onClick={() => setTab(t)}>
              {t === 'tasks' ? 'Tasks' : t === 'wallet' ? 'Allawee Wallet' : 'Profile'}
            </button>
          ))}
        </div>
        <div className="phone-body">
          {tab === 'tasks' && (
            <ul className="tasks">
              {objectives(s).map((o) => (
                <li key={o.text} className={o.done ? 'done' : ''}>
                  {o.done ? '✅' : '⬜'} {o.text}
                </li>
              ))}
              <li className="muted tiny">
                {s.phase === 'camp'
                  ? 'Camp lasts till Thursday. Camp allawee lands Tuesday noon after you register.'
                  : `Each month: 3 PPA days, CDS on Thursday, clearance Friday or Saturday. Allawee (${naira(ALLAWEE)}) pays Monday if cleared.`}
              </li>
            </ul>
          )}
          {tab === 'wallet' && (
            <div>
              <div className="balance">
                <span className="muted tiny">Balance</span>
                <strong>{naira(s.money)}</strong>
              </div>
              <ul className="txs">
                {[...s.txs].reverse().map((t, i) => (
                  <li key={i}>
                    <span>
                      {t.label}
                      <small className="muted"> · day {t.day + 1}</small>
                    </span>
                    <span className={t.amount >= 0 ? 'credit' : 'debit'}>
                      {t.amount >= 0 ? '+' : '−'}
                      {naira(Math.abs(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'me' && (
            <div className="profile">
              <h3>{s.name}</h3>
              <p className="muted">{s.posting?.ppa ? `${s.posting.ppa}, ${s.posting.lga}, ${s.posting.state} State` : `${s.posting?.camp ?? ''} Orientation Camp, ${s.posting?.state ?? ''}`}</p>
              <Stat label="Corps rating" v={s.rating} />
              <Stat label="Skills (SAED)" v={s.skills} />
              <Stat label="CDS project" v={s.project} />
              <p className="tiny muted">Higher skills pay more at side hustles. Finish the CDS project with a high rating to win a State Honours Award.</p>
            </div>
          )}
        </div>
        <button className="secondary" onClick={() => s.togglePhone(false)}>
          Close
        </button>
      </div>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${v}%`, background: '#26a69a' }} />
      </div>
      <span className="num">{Math.round(v)}</span>
    </div>
  )
}

export function EndScreen() {
  const s = useGame()
  const honours = s.project >= 100 && s.rating >= 80 && s.monthsMissed === 0
  const extended = s.monthsMissed > 0
  const title = honours ? '🏅 State Honours Award!' : extended ? 'Service year extended' : '🎓 Passing Out Parade!'
  const text = honours
    ? 'Your CDS project changed the community and your record was spotless. The governor shook your hand at POP.'
    : extended
      ? `You missed clearance for ${s.monthsMissed} month(s). You must serve extra months before you get your certificate.`
      : 'You collected your Certificate of National Service. On to the labour market!'
  return (
    <div className="overlay menu">
      <div className="card">
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="posting">
          <div>
            <span className="muted">Savings</span> {naira(s.money)}
          </div>
          <div>
            <span className="muted">Corps rating</span> {Math.round(s.rating)}/100
          </div>
          <div>
            <span className="muted">CDS project</span> {Math.round(s.project)}%
          </div>
          <div>
            <span className="muted">Months cleared</span> {s.monthsCleared}
          </div>
          <div>
            <span className="muted">Skills</span> {Math.round(s.skills)}/100
          </div>
        </div>
        <button
          className="primary"
          onClick={() => {
            clearSave()
            useGame.setState({ phase: 'menu', hasSave: false })
          }}
        >
          Play again
        </button>
      </div>
    </div>
  )
}

/** Call-up letter shown right after you enter your name: a quick shuffle through states, then your posting. */
export function CallUpModal() {
  const show = useGame((s) => s.showCallUp)
  const posting = useGame((s) => s.posting)
  const name = useGame((s) => s.name)
  const close = useGame((s) => s.closeCallUp)
  const [spin, setSpin] = useState<string | null>(null)

  useEffect(() => {
    if (!show || !posting) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setSpin(null)
      return
    }
    let n = 0
    setSpin(STATES[0].state)
    const id = setInterval(() => {
      n++
      if (n > 18) {
        clearInterval(id)
        setSpin(null)
      } else setSpin(STATES[Math.floor(Math.random() * STATES.length)].state)
    }, 70)
    return () => clearInterval(id)
  }, [show, posting])

  if (!show || !posting) return null
  return (
    <div className="overlay menu">
      <div className="card letter">
        <div className="tiny muted">NATIONAL YOUTH SERVICE CORPS · CALL-UP LETTER</div>
        <p>
          Dear <strong>{name}</strong>, you have been mobilised for the national service year and posted to
        </p>
        <div className={spin ? 'callup-state spinning' : 'callup-state'}>{spin ?? `${posting.state}${posting.state.startsWith('FCT') ? '' : ' State'}`}</div>
        {!spin && (
          <>
            <div className="posting">
              <div>
                <span className="muted">Report to</span> NYSC Orientation Camp, {posting.camp}
              </div>
              <div>
                <span className="muted">Camp duration</span> Monday to Thursday
              </div>
              <div>
                <span className="muted">Bring</span> Call-up letter, statement of result, passport photos
              </div>
            </div>
            <button className="primary" onClick={close}>
              Report to camp
            </button>
          </>
        )}
      </div>
    </div>
  )
}
