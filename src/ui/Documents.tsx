import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../game/store'

const REQUIRED = [
  { id: 'callup', icon: '📄', label: 'Call-up letter' },
  { id: 'result', icon: '🎓', label: 'Statement of result' },
  { id: 'green', icon: '🟩', label: 'Green card' },
  { id: 'photos', icon: '🖼️', label: 'Passport photos' },
  { id: 'medical', icon: '🩺', label: 'Medical certificate' },
  { id: 'idcard', icon: '🪪', label: 'Student ID card' },
]

const DECOYS = [
  { id: 'waec', icon: '📜', label: 'WAEC certificate' },
  { id: 'licence', icon: '🚗', label: "Driver's licence" },
  { id: 'wedding', icon: '💍', label: 'Wedding invitation' },
  { id: 'gym', icon: '🏋️', label: 'Gym card' },
  { id: 'jamb', icon: '🧾', label: 'JAMB result slip' },
  { id: 'account', icon: '🏦', label: 'Statement of account' },
  { id: 'ticket', icon: '🎟️', label: 'Concert ticket' },
]

const TIME_MS = 30000
const PENALTY_MS = 3000

const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

type Phase = 'intro' | 'play' | 'won' | 'lost'

/** Registration: hand the officer each document they ask for before the clock runs out. */
export function Documents() {
  const finish = useGame((s) => s.finishMinigame)
  const [phase, setPhase] = useState<Phase>('intro')
  const order = useMemo(() => shuffle(REQUIRED), [])
  const [step, setStep] = useState(0)
  const [cards, setCards] = useState(() => shuffle([...REQUIRED, ...shuffle(DECOYS).slice(0, 3)]))
  const [left, setLeft] = useState(TIME_MS)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const deadline = useRef(0)

  const start = useCallback(() => {
    deadline.current = performance.now() + TIME_MS
    setPhase('play')
  }, [])

  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      const ms = deadline.current - performance.now()
      setLeft(Math.max(0, ms))
      if (ms <= 0) setPhase('lost')
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  const pick = useCallback(
    (id: string) => {
      if (phase !== 'play') return
      if (order[step]?.id === id) {
        setFlash('hit')
        if (step + 1 >= order.length) setPhase('won')
        else {
          setStep(step + 1)
          setCards((c) => shuffle(c))
        }
      } else {
        deadline.current -= PENALTY_MS
        setFlash('miss')
      }
      setTimeout(() => setFlash(null), 250)
    },
    [phase, order, step],
  )

  const score = phase === 'won' ? 100 : 0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault()
        start()
        return
      }
      if ((phase === 'won' || phase === 'lost') && e.code === 'Enter') {
        finish(score)
        return
      }
      const n = Number(e.code.replace('Digit', '').replace('Numpad', ''))
      if (phase === 'play' && n >= 1 && n <= cards.length) {
        e.preventDefault()
        e.stopPropagation()
        pick(cards[n - 1].id)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phase, cards, pick, start, finish, score])

  const handed = new Set(order.slice(0, step).map((d) => d.id))

  return (
    <div className="overlay">
      <div className="card minigame">
        <h2>Camp registration</h2>
        {phase === 'intro' && (
          <>
            <p>The registration officer will ask for your documents one by one. Find each one in your folder and hand it over before time runs out.</p>
            <p className="tiny muted">You have {TIME_MS / 1000} seconds. Every wrong document costs {PENALTY_MS / 1000} seconds. Fail and you'll be sent away for 2 hours.</p>
            <button className="primary" onClick={start}>
              Join the queue
            </button>
          </>
        )}
        {phase === 'play' && (
          <>
            <div className="tiny muted">
              {step} / {order.length} submitted · {Math.ceil(left / 1000)}s left
            </div>
            <div className={`doc-ask ${flash ?? ''}`}>
              {flash === 'miss' ? '❌ "Is this what I asked for?!"' : `"Bring your ${order[step].label.toLowerCase()}!"`}
            </div>
            <div className="mg-timer">
              <div className="doc-time" style={{ width: `${(left / TIME_MS) * 100}%` }} />
            </div>
            <div className="doc-grid">
              {cards.map((c, i) => (
                <button key={c.id} className={handed.has(c.id) ? 'doc done' : 'doc'} disabled={handed.has(c.id)} onPointerDown={() => pick(c.id)}>
                  <span className="doc-icon">{handed.has(c.id) ? '✅' : c.icon}</span>
                  <span>{c.label}</span>
                  <small className="muted">{i + 1}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {phase === 'won' && (
          <>
            <div className="mg-prompt">✅ Stamped!</div>
            <p>"Correct. Next!" The officer stamps your green card and points you to the kit store.</p>
            <button className="primary" onClick={() => finish(score)}>
              Collect your kits
            </button>
          </>
        )}
        {phase === 'lost' && (
          <>
            <div className="mg-prompt miss">⏰ Time up!</div>
            <p>
              You handed over {step} of {order.length} documents before the officer lost patience. "Come back in 2 hours!"
            </p>
            <button className="primary" onClick={() => finish(score)}>
              Leave the queue
            </button>
          </>
        )}
      </div>
    </div>
  )
}
