import { useEffect, useState } from 'react'
import { actionStatus, hourLabel, stationsFor, useGame } from '../game/store'
import { doorOf } from '../game/stations'
import { playerPos } from '../game/input'
import type { Action, GameData, Station } from '../game/types'
import { WEEKDAYS, naira } from '../game/time'
import { CAMP_DECOR, TOWN_DECOR } from '../world/Worlds'

type Rect = { pos: [number, number]; size: [number, number]; color: string }

// ground features drawn under the buildings, matching the 3D worlds
const CAMP_GROUND: Rect[] = [
  { pos: [0, 0], size: [104, 104], color: '#d2bf94' },
  { pos: [0, -2], size: [36, 22], color: '#bfa877' },
  { pos: [0, 30], size: [4, 44], color: '#a1887f' },
]
const TOWN_GROUND: Rect[] = [
  { pos: [0, 0], size: [110, 110], color: '#8bc34a' },
  { pos: [0, 0], size: [110, 8], color: '#546e7a' },
  { pos: [10, 0], size: [8, 110], color: '#546e7a' },
]

function schedule(a: Action) {
  const parts: string[] = []
  if (a.weekdays) parts.push(a.weekdays.map((w) => WEEKDAYS[w].slice(0, 3)).join(', '))
  parts.push(a.window ? `${hourLabel(a.window[0])}–${hourLabel(a.window[1])}` : 'any time')
  if (a.cost) parts.push(naira(a.cost))
  return parts.join(' · ')
}

export function MapView() {
  const s = useGame()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'KeyM') useGame.getState().toggleMap()
      if (e.code === 'Escape') useGame.getState().toggleMap(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (s.mapOpen) setSelected(s.nearby)
    // only when the map opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mapOpen])

  if (!s.mapOpen || (s.phase !== 'camp' && s.phase !== 'ppa')) return null

  const isTown = s.phase === 'ppa'
  const stations = stationsFor(s.phase)
  const decor = isTown ? TOWN_DECOR : CAMP_DECOR
  const ground = isTown ? TOWN_GROUND : CAMP_GROUND
  const r = isTown ? 55 : 52
  const sel = stations.find((st) => st.id === selected)
  const title = isTown ? `${s.posting?.lga ?? 'Town'} map` : 'Camp map'
  const heading = (playerPos.facing * 180) / Math.PI

  const nameOf = (st: Station) => (st.id === 'ppa' && s.posting?.ppa ? 'Your PPA' : st.name)

  return (
    <div className="overlay" onClick={() => s.toggleMap(false)}>
      <div className="card map-card" onClick={(e) => e.stopPropagation()}>
        <div className="map-head">
          <div>
            <h2>{title}</h2>
            <p className="muted tiny">{isTown ? `${s.posting?.state ?? ''} State` : `NYSC Orientation Camp, ${s.posting?.camp ?? ''}, ${s.posting?.state ?? ''}`} · Tap a place to see what you can do there</p>
          </div>
          <button className="secondary close" onClick={() => s.toggleMap(false)} aria-label="Close map">
            ✕
          </button>
        </div>
        <div className="map-wrap">
          <svg viewBox={`${-r - 4} ${-r - 4} ${2 * r + 8} ${2 * r + 10}`} className="map-svg" role="img" aria-label={title}>
            <rect x={-r - 4} y={-r - 4} width={2 * r + 8} height={2 * r + 10} fill={isTown ? '#7cb342' : '#689f38'} />
            {ground.map((g, i) => (
              <rect key={i} x={g.pos[0] - g.size[0] / 2} y={g.pos[1] - g.size[1] / 2} width={g.size[0]} height={g.size[1]} fill={g.color} />
            ))}
            {/* fence */}
            <rect x={-r} y={-r} width={2 * r} height={2 * r} fill="none" stroke="#5d4037" strokeWidth={0.8} />
            {!isTown && (
              <>
                <rect x={-4} y={r - 1} width={8} height={2} fill="#689f38" />
                <text x={0} y={r + 4.5} className="map-label gate" textAnchor="middle">
                  Main gate
                </text>
              </>
            )}

            {decor.map((d) => (
              <g key={d.id} opacity={0.75}>
                <rect x={d.pos[0] - d.building.size[0] / 2} y={d.pos[1] - d.building.size[2] / 2} width={d.building.size[0]} height={d.building.size[2]} fill={d.building.color} stroke="#6d4c41" strokeWidth={0.3} rx={0.5} />
                <text x={d.pos[0]} y={d.pos[1] + 1} className="map-label decor" textAnchor="middle">
                  {d.name}
                </text>
              </g>
            ))}

            {stations.map((st) => {
              const [w, , d] = st.building.size
              const door = doorOf(st)
              const on = st.id === selected
              const open = st.building.kind === 'open'
              const available = st.actions.some((a) => !a.hidden?.(s) && !actionStatus(s as GameData, st.id, a))
              return (
                <g key={st.id} className="map-place" onClick={() => setSelected(st.id)}>
                  <rect
                    x={st.pos[0] - w / 2}
                    y={st.pos[1] - d / 2}
                    width={w}
                    height={d}
                    rx={open ? 2 : 0.6}
                    fill={open ? 'rgba(255,255,255,0.18)' : st.building.roof}
                    stroke={on ? '#00e676' : open ? '#fff' : '#3e2723'}
                    strokeWidth={on ? 1 : 0.4}
                    strokeDasharray={open ? '1.5 1' : undefined}
                  />
                  <circle cx={door[0]} cy={door[1]} r={1.3} fill={available ? '#00e676' : '#ffd600'} stroke="#1b1b1b" strokeWidth={0.3} />
                  <text x={st.pos[0]} y={open ? st.pos[1] - 1.5 : st.pos[1] + 1} className={on ? 'map-label on' : 'map-label'} textAnchor="middle">
                    {nameOf(st)}
                  </text>
                </g>
              )
            })}

            {/* you are here */}
            <g transform={`translate(${playerPos.x} ${playerPos.z}) rotate(${-heading})`}>
              <circle r={3.2} fill="rgba(33,150,243,0.25)" />
              <path d="M0 2.6 L1.8 -1.6 L0 -0.6 L-1.8 -1.6 Z" fill="#1565c0" stroke="#fff" strokeWidth={0.4} />
            </g>
            <text x={playerPos.x} y={playerPos.z - 4} className="map-label you" textAnchor="middle">
              You
            </text>
          </svg>
        </div>

        <div className="map-legend tiny muted">
          <span>
            <i className="dot green" /> open now
          </span>
          <span>
            <i className="dot yellow" /> closed now
          </span>
          <span>
            <i className="dot blue" /> you
          </span>
        </div>

        {sel ? (
          <div className="map-detail">
            <strong>{sel.id === 'ppa' && s.posting?.ppa ? s.posting.ppa : sel.name}</strong>
            <ul>
              {sel.actions
                .filter((a) => !a.hidden?.(s))
                .map((a) => {
                  const reason = actionStatus(s as GameData, sel.id, a)
                  return (
                    <li key={a.id}>
                      <span className={reason ? 'muted' : ''}>{a.label}</span>
                      <small className="muted">{schedule(a)}</small>
                    </li>
                  )
                })}
            </ul>
          </div>
        ) : (
          <p className="tiny muted">Tap a building to see its activities and opening hours.</p>
        )}
      </div>
    </div>
  )
}
