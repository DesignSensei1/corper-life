import { useEffect, useState } from 'react'
import { clearSave, useGame } from '../game/store'
import { cupPlace, objectives, ordinal } from '../game/stations'
import { ending } from '../game/endings'
import { CDS, ROLES, TRADES, isOffice, PPA_WORK } from '../game/people'
import type { GameData } from '../game/types'
import { ALLAWEE, fmtTime, naira } from '../game/time'
import { BACKGROUNDS, roadKm, travelOptions } from '../game/journey'
import type { Travel } from '../game/types'
import { STATES } from '../game/states'
import { ONLINE_ENABLED, lastSeen, useOnline } from '../online/campmates'

export function Menu() {
  const hasSave = useGame((s) => s.hasSave)
  const newGame = useGame((s) => s.newGame)
  const cont = useGame((s) => s.continueGame)
  const [name, setName] = useState('')
  const [home, setHome] = useState('')
  const start = () => home && newGame(name, home)
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
          <input value={name} maxLength={20} placeholder="e.g. Chiamaka Bello" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()} />
        </label>
        <label className="field">
          State of residence
          <select value={home} onChange={(e) => setHome(e.target.value)}>
            <option value="" disabled>
              Where are you travelling from?
            </option>
            {STATES.map((st) => (
              <option key={st.state} value={st.state}>
                {st.state}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={!home} onClick={start}>
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
        {isOffice(s.posting.kind) && <p className="good-note">Your strong camp record landed you an office posting! You'll need a corporate outfit, and it pays a {naira(PPA_WORK[s.posting.kind!].stipend)} monthly stipend on top of allawee.</p>}
        <p className="muted">Transport costs {naira(5000)} and your first month's lodge rent is due on arrival.</p>
        <button className="primary" onClick={s.travelToPPA}>
          Travel to {s.posting.lga}
        </button>
      </div>
    </div>
  )
}

const txt = (v: string | ((s: GameData) => string), s: GameData) => (typeof v === 'function' ? v(s) : v)

export function EventModal() {
  const s = useGame()
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
        <h2>{txt(ev.title, s)}</h2>
        <p>{txt(ev.text, s)}</p>
        {ev.choices.map((c, i) => (
          <button key={i} className={i === 0 ? 'primary' : 'secondary'} onClick={() => choose(i)}>
            {txt(c.label, s)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Phone() {
  const s = useGame()
  const [tab, setTab] = useState<'tasks' | 'wallet' | 'people' | 'mates' | 'me'>('tasks')
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
          {(['tasks', 'wallet', 'people', 'mates', 'me'] as const).map((t) => (
            <button key={t} className={tab === t ? 'tab on' : 'tab'} onClick={() => setTab(t)}>
              {t === 'tasks' ? 'Tasks' : t === 'wallet' ? 'Wallet' : t === 'people' ? 'Friends' : t === 'mates' ? 'Online' : 'Profile'}
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
          {tab === 'people' && <Friends s={s} />}
          {tab === 'mates' && <Campmates state={s.posting?.state ?? ''} camp={s.posting?.camp ?? ''} />}
          {tab === 'me' && (
            <div className="profile">
              <h3>{s.name}</h3>
              {s.background && (
                <p className="muted">
                  {BACKGROUNDS[s.background].title}
                  {s.home ? ` from ${s.home}` : ''}
                </p>
              )}
              <p className="muted">{s.posting?.ppa ? `${s.posting.ppa}, ${s.posting.lga}, ${s.posting.state} State` : `${s.posting?.camp ?? ''} Orientation Camp, ${s.posting?.state ?? ''}`}</p>
              <Stat label="Corps rating" v={s.rating} />
              <Stat label="Skills (SAED)" v={s.skills} />
              <Stat label="CDS project" v={s.project} />
              <div className="posting">
                <div>
                  <span className="muted">Platoon</span> {s.platoon}
                  {s.role && s.role !== 'none' ? ` · ${ROLES[s.role].title}` : ''}
                </div>
                {s.trade && (
                  <div>
                    <span className="muted">SAED trade</span> {TRADES[s.trade].title}
                    {s.gear > 0 ? ` · ${TRADES[s.trade].gear.slice(0, s.gear).join(', ')}` : ''}
                  </div>
                )}
                {s.cdsKind && (
                  <div>
                    <span className="muted">CDS project</span> {CDS[s.cdsKind].title}
                  </div>
                )}
              </div>
              <p className="tiny muted">Higher skills pay more at your business and side hustles. Finish the CDS project with a high rating to win a State Honours Award. Your boss, your savings and your business decide what happens after POP.</p>
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

function Campmates({ state, camp }: { state: string; camp: string }) {
  const { status, mates, here } = useOnline()
  const online = new Set(here)
  const sorted = [...mates].sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)))
  return (
    <div className="mates">
      <div className="tiny muted">Real players posted to {state} ({camp} camp)</div>
      {!ONLINE_ENABLED && <p className="muted">Campmates isn't switched on for this version of the game yet. You're playing offline.</p>}
      {status === 'connecting' && <p className="muted">Checking who's in camp…</p>}
      {status === 'error' && <p className="muted">Couldn't reach the camp list right now. It will retry in a couple of minutes.</p>}
      {status === 'live' && sorted.length === 0 && <p className="muted">No other corpers here yet. Share the game with your friends!</p>}
      <ul className="txs">
        {sorted.map((m) => (
          <li key={m.id}>
            <span>
              <span className={online.has(m.id) ? 'dot on' : 'dot'} /> {m.name}
              {m.lga && <small className="muted"> · {m.lga}</small>}
            </span>
            <small className="muted">{lastSeen(m.last_seen, online.has(m.id))}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Friends({ s }: { s: GameData }) {
  const ranked = s.cup.map((p, i) => ({ p, n: i + 1 })).sort((a, b) => b.p - a.p)
  return (
    <div className="mates">
      <div className="tiny muted">Your bunkmates. Do things together to get closer.</div>
      {s.mates.map((m) => (
        <div className="stat" key={m.name}>
          <span>
            <span className="dot on" style={{ background: m.shirt }} /> {m.name} <small className="muted">· {m.from}</small>
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${m.bond}%`, background: '#ec407a' }} />
          </div>
          <span className="num">{Math.round(m.bond)}</span>
        </div>
      ))}
      <div className="tiny muted" style={{ marginTop: 12 }}>
        {s.phase === 'camp' ? `Camp cup · Platoon ${s.platoon} is ${ordinal(cupPlace(s))}` : 'Final camp cup table'}
      </div>
      <ul className="txs">
        {ranked.slice(0, 5).map((r, i) => (
          <li key={r.n} className={r.n === s.platoon ? 'mine' : ''}>
            <span>
              {ordinal(i + 1)} · Platoon {r.n}
              {r.n === s.platoon ? ' (you)' : ''}
            </span>
            <span>{r.p} pts</span>
          </li>
        ))}
      </ul>
      {s.phase === 'camp' && <p className="tiny muted">Earn points with drills, Man O' War, football, social nights and platoon competitions. The cup is awarded with the posting letters.</p>}
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
  const { title, text, badges } = ending(s)
  return (
    <div className="overlay menu">
      <div className="card">
        <h1>{title}</h1>
        <p>{text}</p>
        {badges.length > 0 && (
          <ul className="badges">
            {badges.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
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
          {s.trade && (
            <div>
              <span className="muted">Business earnings</span> {naira(s.bizEarned)}
            </div>
          )}
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

/** Call-up letter shown right after you enter your name: a quick shuffle through states, then your posting, then the trip to camp. */
export function CallUpModal() {
  const show = useGame((s) => s.showCallUp)
  const posting = useGame((s) => s.posting)
  const name = useGame((s) => s.name)
  const home = useGame((s) => s.home)
  const close = useGame((s) => s.closeCallUp)
  const [spin, setSpin] = useState<string | null>(null)
  const [step, setStep] = useState<'letter' | 'trip'>('letter')

  useEffect(() => {
    if (!show || !posting) return
    setStep('letter')
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
  // older saves have no home state: skip the trip
  if (step === 'trip' && home) return <Journey />
  return (
    <div className="overlay menu">
      <div className="card letter">
        <div className="tiny muted">NATIONAL YOUTH SERVICE CORPS · CALL-UP LETTER</div>
        <p>
          Dear <strong>{name}</strong>, you have been mobilised for the national service year and posted to
        </p>
        <div className={spin ? 'callup-state spinning' : 'callup-state'}>{spin ?? stateName(posting.state)}</div>
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
            <button className="primary" onClick={() => (home ? setStep('trip') : close())}>
              {home ? 'Plan your trip' : 'Report to camp'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const stateName = (st: string) => `${st}${st.startsWith('FCT') ? '' : ' State'}`

const TRIP_MS = 2600

/** The journey from your state of residence to camp. */
function Journey() {
  const s = useGame()
  const [going, setGoing] = useState<Travel | null>(null)
  const [arrived, setArrived] = useState(false)
  if (!s.posting || !s.background) return null
  const bg = BACKGROUNDS[s.background]
  const camp = s.posting.state
  const opts = travelOptions(s.home, camp, s.background)
  const km = roadKm(s.home, camp)

  const go = (t: Travel) => {
    setGoing(t)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setTimeout(
      () => {
        useGame.getState().travelToCamp(t)
        setArrived(true)
      },
      reduce ? 0 : TRIP_MS,
    )
  }

  return (
    <div className="overlay menu">
      <div className="card letter">
        <div className="tiny muted">THE JOURNEY TO CAMP</div>
        {!going && (
          <>
            <div className={`bg-badge ${s.background}`}>{s.background === 'nepo' ? '💎' : '🪙'} You're a {bg.title}!</div>
            <p>{bg.blurb}</p>
            <div className="posting">
              <div>
                <span className="muted">Wallet</span> <strong>{naira(s.money)}</strong>
              </div>
              <div>
                <span className="muted">Route</span> {s.home === camp ? `Within ${stateName(camp)}` : `${s.home} → ${camp} · about ${km} km`}
              </div>
            </div>
            <p className="tiny muted">How are you getting to camp?</p>
            {opts.map((o) => (
              <button key={o.id} className="secondary trip-opt" disabled={s.money < o.cost} onClick={() => go(o.id)}>
                <span>
                  <strong>{o.title}</strong> · {naira(o.cost)}
                </span>
                <small className="muted">
                  {o.note} Arrive {o.arrive < 1440 ? 'Monday' : 'Tuesday'} ~{fmtTime(o.arrive)}.
                </small>
              </button>
            ))}
            {s.background === 'lapo' && <p className="tiny muted">Flying? On a LAPO budget? Maybe after your first allawee.</p>}
          </>
        )}
        {going && (
          <>
            <div className="trip-road">
              <span className="trip-end">{s.home}</span>
              <div className="trip-track">
                <span className={arrived ? 'trip-vehicle done' : 'trip-vehicle'} style={{ animationDuration: `${TRIP_MS}ms` }}>
                  {going === 'flight' ? '✈️' : '🚌'}
                </span>
              </div>
              <span className="trip-end">{camp}</span>
            </div>
            {!arrived && <p className="muted">{going === 'night' ? 'Rolling through the night…' : going === 'flight' ? 'In the air…' : 'On the road…'}</p>}
            {arrived && (
              <>
                {s.tripLog?.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                <div className="posting">
                  <div>
                    <span className="muted">Arrived</span> Monday {fmtTime(s.minutes)}
                  </div>
                  <div>
                    <span className="muted">Wallet</span> {naira(s.money)}
                  </div>
                </div>
                <button className="primary" onClick={s.closeCallUp}>
                  Enter camp
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
