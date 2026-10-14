import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../game/store'
import { Documents } from './Documents'

interface Move {
  id: string
  label: string
  keys: string[]
}

interface Game {
  title: string
  intro: string
  rounds: number
  /** ms allowed for the first and last round */
  speed: [number, number]
  moves: Move[]
  prompts: { text: string; move: string }[]
}

const GAMES: Record<'drill' | 'manowar', Game> = {
  drill: {
    title: 'Morning drill',
    intro: 'The soldier calls the step. Hit the matching foot before the next call!',
    rounds: 12,
    speed: [1100, 650],
    moves: [
      { id: 'left', label: '⬅ Left', keys: ['ArrowLeft', 'KeyA', 'Digit1'] },
      { id: 'right', label: 'Right ➡', keys: ['ArrowRight', 'KeyD', 'Digit2'] },
    ],
    prompts: [
      { text: 'LEFT!', move: 'left' },
      { text: 'RIGHT!', move: 'right' },
    ],
  },
  manowar: {
    title: "Man O' War obstacle course",
    intro: 'Obstacles are coming fast. Pick the right move for each one!',
    rounds: 8,
    speed: [1800, 1000],
    moves: [
      { id: 'jump', label: '⬆ Jump', keys: ['ArrowUp', 'KeyW', 'Space', 'Digit1'] },
      { id: 'crawl', label: '⬇ Crawl', keys: ['ArrowDown', 'KeyS', 'Digit2'] },
      { id: 'climb', label: '🧗 Climb', keys: ['ArrowRight', 'KeyD', 'Digit3'] },
    ],
    prompts: [
      { text: '🕳️ Muddy ditch!', move: 'jump' },
      { text: '🪵 Log hurdle!', move: 'jump' },
      { text: '〰️ Barbed wire!', move: 'crawl' },
      { text: '🚇 Low tunnel!', move: 'crawl' },
      { text: '🧱 High wall!', move: 'climb' },
      { text: '🕸️ Rope net!', move: 'climb' },
    ],
  },
}

type Phase = 'intro' | 'play' | 'done'

export function Minigame() {
  const mg = useGame((s) => s.minigame)
  if (!mg) return null
  if (mg.kind === 'register') return <Documents key={mg.stationId + mg.actionId} />
  return <Round key={mg.stationId + mg.actionId} kind={mg.kind} />
}

function Round({ kind }: { kind: 'drill' | 'manowar' }) {
  const g = GAMES[kind]
  const finish = useGame((s) => s.finishMinigame)
  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState(0)
  const [hits, setHits] = useState(0)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const seq = useMemo(() => Array.from({ length: g.rounds }, () => g.prompts[Math.floor(Math.random() * g.prompts.length)]), [g])
  const answered = useRef(false)

  const ms = g.speed[0] + ((g.speed[1] - g.speed[0]) * round) / Math.max(1, g.rounds - 1)
  const score = Math.round((hits / g.rounds) * 100)

  const next = useCallback(
    (ok: boolean) => {
      if (answered.current) return
      answered.current = true
      if (ok) setHits((h) => h + 1)
      setFlash(ok ? 'hit' : 'miss')
      setTimeout(() => {
        setFlash(null)
        answered.current = false
        setRound((r) => {
          if (r + 1 >= g.rounds) setPhase('done')
          return r + 1
        })
      }, 220)
    },
    [g.rounds],
  )

  // a round times out if you don't answer
  useEffect(() => {
    if (phase !== 'play') return
    const t = setTimeout(() => next(false), ms)
    return () => clearTimeout(t)
  }, [phase, round, ms, next])

  const press = useCallback(
    (id: string) => {
      if (phase !== 'play' || answered.current) return
      next(seq[round]?.move === id)
    },
    [phase, round, seq, next],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault()
        setPhase('play')
        return
      }
      if (phase === 'done' && e.code === 'Enter') {
        finish(score)
        return
      }
      const mv = g.moves.find((m) => m.keys.includes(e.code))
      if (mv) {
        e.preventDefault()
        e.stopPropagation()
        press(mv.id)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phase, g, press, finish, score])

  return (
    <div className="overlay">
      <div className="card minigame">
        <h2>{g.title}</h2>
        {phase === 'intro' && (
          <>
            <p>{g.intro}</p>
            <p className="tiny muted">Keys: {g.moves.map((m) => m.label).join(' · ')} (or tap the buttons)</p>
            <button className="primary" onClick={() => setPhase('play')}>
              Start
            </button>
          </>
        )}
        {phase === 'play' && seq[round] && (
          <>
            <div className="tiny muted">
              {round + 1} / {g.rounds} · {hits} hit
            </div>
            <div className={`mg-prompt ${flash ?? ''}`}>{flash === 'hit' ? '✅' : flash === 'miss' ? '❌' : seq[round].text}</div>
            <div className="mg-timer">
              <div key={round} style={{ animationDuration: `${ms}ms` }} />
            </div>
            <div className="mg-moves">
              {g.moves.map((m) => (
                <button key={m.id} className="secondary" onPointerDown={() => press(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
        {phase === 'done' && (
          <>
            <div className="mg-prompt">{score}%</div>
            <p>{score >= 85 ? 'Excellent! The soldiers are impressed.' : score >= 50 ? 'Not bad, corper.' : 'Hmm. The soldiers are shaking their heads.'}</p>
            <button className="primary" onClick={() => finish(score)}>
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}
