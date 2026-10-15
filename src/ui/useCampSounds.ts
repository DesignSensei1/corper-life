import { useEffect } from 'react'
import { useGame } from '../game/store'
import { bugle, cadence, unlockSound, useSound } from '../game/sound'
import { dayOf, hourOf } from '../game/time'
import { playerPos } from '../game/input'

const PARADE: [number, number] = [0, -2]

/** The 5am bugle in camp, and soldiers calling the step on the parade ground during morning drills. */
export function useCampSounds() {
  useEffect(() => {
    // browsers only allow sound after the player has clicked or pressed a key
    const unlock = () => unlockSound()
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
    for (const e of events) window.addEventListener(e, unlock, { capture: true, passive: true })

    const unsub = useGame.subscribe((s, prev) => {
      // the bugle greets you as you walk through the camp gate
      if (prev.showCallUp && !s.showCallUp && s.phase === 'camp') bugle()
      if (s.phase !== 'camp' || prev.phase !== 'camp' || s.minutes <= prev.minutes) return
      const bugleAt = dayOf(s.minutes) * 1440 + 5 * 60
      if (prev.minutes < bugleAt && s.minutes >= bugleAt) bugle()
    })

    const timer = setInterval(() => {
      const s = useGame.getState()
      if (useSound.getState().muted || s.phase !== 'camp' || s.minigame || s.event || s.showCallUp || document.hidden) return
      const h = hourOf(s.minutes)
      if (h < 6 || h >= 9 || Math.random() < 0.4) return
      const dist = Math.hypot(playerPos.x - PARADE[0], playerPos.z - PARADE[1])
      if (dist > 45) return
      cadence(Math.max(0.15, 1 - dist / 45))
    }, 5000)

    return () => {
      for (const e of events) window.removeEventListener(e, unlock, { capture: true })
      unsub()
      clearInterval(timer)
    }
  }, [])
}
