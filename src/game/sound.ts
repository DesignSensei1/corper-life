import { create } from 'zustand'

/**
 * Camp sounds, all made in the browser: the morning bugle is synthesized with Web Audio,
 * and the drill commands use the browser's own speech voice. Nothing is downloaded.
 */

const MUTE_KEY = 'corper-life-muted'

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export const useSound = create<{ muted: boolean; toggle: () => void }>()((set, get) => ({
  muted: loadMuted(),
  toggle: () => {
    const muted = !get().muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (muted) stopAll()
    set({ muted })
  },
}))

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { c: AudioContext; out: GainNode } | null {
  if (useSound.getState().muted || typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    // a short echo so the bugle sounds like it is carrying across an open field
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.23
    const fb = ctx.createGain()
    fb.gain.value = 0.28
    master.connect(ctx.destination)
    master.connect(delay)
    delay.connect(fb).connect(delay)
    delay.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return { c: ctx, out: master! }
}

/** Call from a click or key press so browsers allow sound to play later. */
export function unlockSound() {
  audio()
  if (typeof speechSynthesis !== 'undefined' && !useSound.getState().muted) speechSynthesis.getVoices()
}

function stopAll() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  if (ctx) ctx.suspend().catch(() => {})
}

/** One brassy bugle note: a bright sawtooth through a filter that opens as the note starts. */
function brass(c: AudioContext, out: AudioNode, freq: number, t: number, dur: number, vol: number) {
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(freq * 0.97, t)
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.04)
  const vib = c.createOscillator()
  vib.frequency.value = 5.5
  const vibAmt = c.createGain()
  vibAmt.gain.value = freq * 0.005
  vib.connect(vibAmt).connect(o.frequency)
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.Q.value = 2
  f.frequency.setValueAtTime(freq * 1.2, t)
  f.frequency.linearRampToValueAtTime(freq * 5, t + 0.05)
  f.frequency.linearRampToValueAtTime(freq * 3, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.025)
  g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.05, dur * 0.75))
  g.gain.linearRampToValueAtTime(0, t + dur)
  o.connect(f).connect(g).connect(out)
  o.start(t)
  vib.start(t)
  o.stop(t + dur + 0.05)
  vib.stop(t + dur + 0.05)
}

// a bugle only plays the notes of its harmonic series
const G4 = 392
const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5

/** Reveille-style wake-up call, in beats. */
const REVEILLE: [number, number][] = [
  [G4, 0.5], [C5, 0.5], [E5, 0.25], [C5, 0.25], [G4, 0.5], [C5, 0.5], [E5, 0.25], [C5, 0.25],
  [G4, 0.5], [C5, 0.5], [E5, 0.25], [C5, 0.25], [G4, 0.5], [E5, 1], [C5, 1],
  [G4, 0.5], [C5, 0.5], [E5, 0.25], [C5, 0.25], [G4, 0.5], [C5, 0.5], [E5, 0.25], [C5, 0.25],
  [G4, 0.5], [C5, 0.5], [E5, 0.5], [G5, 0.5], [E5, 0.5], [C6, 0.25], [G5, 0.25], [C5, 2],
]

let bugleUntil = 0

/** Play the morning bugle. */
export function bugle() {
  const a = audio()
  if (!a || a.c.currentTime < bugleUntil) return
  const beat = 0.34
  let t = a.c.currentTime + 0.05
  for (const [f, b] of REVEILLE) {
    brass(a.c, a.out, f, t, b * beat * 0.92, 0.22)
    t += b * beat
  }
  bugleUntil = t
}

/** A boot hitting the ground. */
export function stamp(vol = 0.6) {
  const a = audio()
  if (!a) return
  const { c, out } = a
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.2)
  // dust and gravel
  const len = Math.floor(c.sampleRate * 0.08)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const n = c.createBufferSource()
  n.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 900
  const ng = c.createGain()
  ng.gain.value = vol * 0.5
  n.connect(f).connect(ng).connect(out)
  n.start(t)
}

let voice: SpeechSynthesisVoice | null | undefined

function soldierVoice() {
  if (voice !== undefined && voice !== null) return voice
  const all = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  // prefer a deep male English voice; Nigerian English if the device has one
  voice =
    all.find((v) => v.lang === 'en-NG') ??
    all.find((v) => /male|daniel|fred|alex|google uk english male|david|george/i.test(v.name) && !/female/i.test(v.name)) ??
    all[0] ??
    null
  return voice
}

/** A soldier barking a drill command ("LEFT!", "RIGHT!", "Squad, attention!"). */
export function command(text: string, vol = 1) {
  if (useSound.getState().muted) return
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    stamp(vol * 0.6)
    return
  }
  const u = new SpeechSynthesisUtterance(text)
  const v = soldierVoice()
  if (v) u.voice = v
  u.rate = 1.25
  u.pitch = 0.4
  u.volume = Math.max(0, Math.min(1, vol))
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

/** Distant platoons marching: "Left, left, left right left!" */
export function cadence(vol: number) {
  command(['Left! Left! Left, right, left!', 'Left! Right! Left! Right!', 'Squad! Quick march! Left, right, left!', 'Left! Left! Left right left!'][Math.floor(Math.random() * 4)], vol)
}
