import { useEffect } from 'react'
import { create } from 'zustand'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useGame } from '../game/store'

/**
 * Campmates: other real players posted to the same state camp.
 * Uses Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set;
 * without them the game runs offline and the phone tab says so.
 */

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const ONLINE_ENABLED = !!(SB_URL && KEY)

const ID_KEY = 'corper-life-player-id'
const HEARTBEAT_MS = 2 * 60 * 1000

export interface Campmate {
  id: string
  name: string
  state: string
  camp: string
  lga: string | null
  phase: string | null
  last_seen: string
}

/** A chat line from a real player in the same state. Broadcast only: never stored. */
export interface LiveMsg {
  id: string
  name: string
  text: string
  at: number
  me?: boolean
}

interface OnlineState {
  status: 'off' | 'connecting' | 'live' | 'error'
  mates: Campmate[]
  /** ids of players with the game open right now */
  here: string[]
  chat: LiveMsg[]
}

export const useOnline = create<OnlineState>()(() => ({ status: ONLINE_ENABLED ? 'connecting' : 'off', mates: [], here: [], chat: [] }))

let liveChannel: RealtimeChannel | null = null
let lastSent = 0

const pushLive = (m: LiveMsg) => useOnline.setState({ chat: [...useOnline.getState().chat, m].slice(-50) })

/** Send a chat line to everyone playing in your state right now. Returns false when it couldn't be sent. */
export function sendLiveChat(name: string, text: string): boolean {
  const t = text.trim().slice(0, 200)
  if (!t || !liveChannel || Date.now() - lastSent < 2000) return false
  lastSent = Date.now()
  const m: LiveMsg = { id: playerId(), name: name.slice(0, 30), text: t, at: Date.now() }
  liveChannel.send({ type: 'broadcast', event: 'chat', payload: m })
  pushLive({ ...m, me: true })
  return true
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)))

function playerId(): string {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = newId()
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return newId()
  }
}

let client: Promise<SupabaseClient> | null = null
function getClient() {
  // loaded on demand so offline builds don't ship the Supabase bundle to every player
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SB_URL!, KEY!, { auth: { persistSession: false } }))
  return client
}

/** Keeps this player's row fresh and the campmates list in sync while a game is running. */
export function useCampmatesSync() {
  const name = useGame((s) => s.name)
  const phase = useGame((s) => s.phase)
  const state = useGame((s) => s.posting?.state ?? '')
  const camp = useGame((s) => s.posting?.camp ?? '')
  const lga = useGame((s) => s.posting?.lga || null)
  const playing = phase === 'camp' || phase === 'ppa' || phase === 'ended'

  useEffect(() => {
    if (!ONLINE_ENABLED || !playing || !state) return
    const me = playerId()
    let channel: RealtimeChannel | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    let stopped = false

    const run = async () => {
      const sb = await getClient()
      if (stopped) return
      const beat = async () => {
        const { error } = await sb.from('players').upsert({ id: me, name, state, camp, lga, phase, last_seen: new Date().toISOString() })
        if (error) throw error
        const res = await sb.from('players').select('*').eq('state', state).neq('id', me).order('last_seen', { ascending: false }).limit(50)
        if (res.error) throw res.error
        if (!stopped) useOnline.setState({ status: 'live', mates: res.data as Campmate[] })
      }
      const safeBeat = () =>
        beat().catch((e) => {
          console.warn('Campmates sync failed', e)
          if (!stopped) useOnline.setState({ status: 'error' })
        })
      await safeBeat()
      timer = setInterval(safeBeat, HEARTBEAT_MS)

      // live presence: who has the game open right now in this camp
      channel = sb.channel(`camp:${state}`, { config: { presence: { key: me } } })
      channel
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          const m = payload as LiveMsg
          if (typeof m?.text !== 'string' || typeof m?.name !== 'string' || m.id === me) return
          pushLive({ id: String(m.id), name: m.name.slice(0, 30), text: m.text.slice(0, 200), at: Date.now() })
        })
        .on('presence', { event: 'sync' }, () => {
          const ids = Object.keys(channel!.presenceState())
          useOnline.setState({ here: ids })
          // someone new showed up who isn't in our list yet
          if (ids.some((id) => id !== me && !useOnline.getState().mates.some((m) => m.id === id))) safeBeat()
        })
        .subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            channel?.track({ name })
            liveChannel = channel
          }
        })
    }

    useOnline.setState({ status: 'connecting' })
    run().catch(() => useOnline.setState({ status: 'error' }))
    return () => {
      stopped = true
      clearInterval(timer)
      liveChannel = null
      if (channel) client?.then((sb) => sb.removeChannel(channel!))
      useOnline.setState({ here: [] })
    }
  }, [playing, name, state, camp, lga, phase])
}

export function lastSeen(iso: string, online: boolean): string {
  if (online) return 'Online now'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 5) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
