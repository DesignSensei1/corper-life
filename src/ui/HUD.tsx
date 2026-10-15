import { useEffect, useRef } from 'react'
import { actionStatus, costOf, labelOf, stationsFor, useGame } from '../game/store'
import { objectives } from '../game/stations'
import type { Action, GameData } from '../game/types'
import { WEEKDAYS, dayOf, fmtTime, monthLabel, naira, weekdayOf } from '../game/time'
import { useSound } from '../game/sound'
import { unreadChat } from '../game/chat'
import { input } from '../game/input'

function Bar({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bar" title={`${label}: ${Math.round(value)}`}>
      <span className="bar-icon">{icon}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%`, background: value < 20 ? '#e53935' : color }} />
      </div>
    </div>
  )
}

const dur = (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round(m)}m`)

function TopBar() {
  const s = useGame()
  const day = dayOf(s.minutes)
  const when = s.phase === 'camp' ? `Camp · Day ${day + 1}` : monthLabel(s.minutes, s.monthsMissed)
  const sound = useSound()
  const unread = s.phase === 'ppa' ? unreadChat(s) : 0
  const next = objectives(s).find((o) => !o.done)
  return (
    <div className="topbar">
      <div className="panel stats">
        <div className="clock">
          <strong>{WEEKDAYS[weekdayOf(s.minutes)]}</strong> {fmtTime(s.minutes)}
          <span className="muted"> · {when}</span>
        </div>
        <Bar icon="⚡" label="Energy" value={s.energy} color="#fdd835" />
        <Bar icon="🍲" label="Fullness" value={s.hunger} color="#ff9800" />
        <Bar icon="😊" label="Mood" value={s.mood} color="#66bb6a" />
        <div className="money">{naira(s.money)}</div>
        {next && <div className="next">🎯 {next.text}</div>}
      </div>
      <div className="top-buttons">
        <button className="icon-btn map-btn" onClick={() => s.toggleMap()} aria-label="Map">
          🗺️<span>Map</span>
        </button>
        <button className="icon-btn" onClick={() => s.togglePhone()} aria-label={unread ? `Phone, ${unread} new chat messages` : 'Phone'}>
          📱{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button className="icon-btn" onClick={sound.toggle} aria-label={sound.muted ? 'Turn sound on' : 'Mute sound'} title={sound.muted ? 'Sound off' : 'Sound on'}>
          {sound.muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" onClick={() => s.quitToMenu()} aria-label="Save and quit">
          ☰
        </button>
      </div>
    </div>
  )
}

function Toasts() {
  const messages = useGame((s) => s.messages)
  const dismiss = useGame((s) => s.dismissMsg)
  useEffect(() => {
    if (!messages.length) return
    const first = messages[0]
    const t = setTimeout(() => dismiss(first.id), 3500 + first.text.length * 35)
    return () => clearTimeout(t)
  }, [messages, dismiss])
  return (
    <div className="toasts">
      {messages.slice(-3).map((m) => (
        <div key={m.id} className={`toast ${m.kind}`} onClick={() => dismiss(m.id)}>
          {m.text}
        </div>
      ))}
    </div>
  )
}

function ActionPanel() {
  const s = useGame()
  const st = stationsFor(s.phase).find((x) => x.id === s.nearby)
  const visible = st ? st.actions.filter((a) => !a.hidden?.(s)) : []
  const ref = useRef<{ id: string; actions: Action[] } | null>(null)
  ref.current = st ? { id: st.id, actions: visible } : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = ref.current
      if (!cur) return
      const n = e.code === 'KeyE' ? 1 : Number(e.key)
      if (n >= 1 && n <= cur.actions.length) useGame.getState().doAction(cur.id, cur.actions[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!st || s.event || s.eventResult || s.showPosting || s.showCallUp || s.mapOpen || s.phoneOpen || s.minigame) return null
  const name = st.id === 'ppa' && s.posting ? s.posting.ppa : st.name
  return (
    <div className="actions panel">
      <div className="actions-title">{name}</div>
      {visible.length === 0 && <div className="muted">Nothing to do here right now.</div>}
      {visible.map((a, i) => {
        const reason = actionStatus(s as GameData, st.id, a)
        const minutes = typeof a.duration === 'function' ? a.duration(s) : a.duration
        const cost = costOf(s, a)
        return (
          <button key={a.id} className="action" disabled={!!reason} onClick={() => s.doAction(st.id, a.id)}>
            <span className="key">{i + 1}</span>
            <span className="action-label">
              {labelOf(s, a)}
              {a.minigame && ' 🎮'}
              <small>{reason ?? [cost ? naira(cost) : null, dur(minutes)].filter(Boolean).join(' · ')}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)

  const move = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId || !base.current || !knob.current) return
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    input.joyX = dx / max
    input.joyZ = dy / max
  }
  const end = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return
    pid.current = null
    input.joyX = 0
    input.joyZ = 0
    if (knob.current) knob.current.style.transform = ''
  }
  return (
    <div
      className="joystick"
      ref={base}
      onPointerDown={(e) => {
        pid.current = e.pointerId
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" ref={knob} />
    </div>
  )
}

export function HUD() {
  const touch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)
  return (
    <div className="hud">
      <TopBar />
      <Toasts />
      <ActionPanel />
      {touch ? <Joystick /> : <div className="hint">WASD / arrows to move · Shift to run · 1–4 or E to act · M for map · P for phone</div>}
    </div>
  )
}
