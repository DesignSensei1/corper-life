// Shared, mutable input state read every frame (kept out of React state on purpose).
export const input = { x: 0, z: 0, run: false, joyX: 0, joyZ: 0 }

/** Latest player position, written by the Player each frame and read by the map. */
export const playerPos = { x: 0, z: 0, facing: 0 }

const keys = new Set<string>()

function refresh() {
  const k = (c: string) => keys.has(c)
  input.x = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0)
  input.z = (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0)
  input.run = k('ShiftLeft') || k('ShiftRight')
}

export function bindKeyboard() {
  const down = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return
    keys.add(e.code)
    refresh()
  }
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code)
    refresh()
  }
  const blur = () => {
    keys.clear()
    refresh()
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}
