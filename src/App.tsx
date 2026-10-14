import { useEffect } from 'react'
import { useGame } from './game/store'
import { bindKeyboard } from './game/input'
import { Scene } from './world/Scene'
import { HUD } from './ui/HUD'
import { CallUpModal, EndScreen, EventModal, Menu, Phone, PostingModal } from './ui/Screens'
import { MapView } from './ui/Map'
import { Minigame } from './ui/Minigame'
import { useCampmatesSync } from './online/campmates'

export default function App() {
  const phase = useGame((s) => s.phase)
  useEffect(() => bindKeyboard(), [])
  useCampmatesSync()

  if (phase === 'menu') return <Menu />
  if (phase === 'ended') return <EndScreen />
  return (
    <>
      <Scene />
      <HUD />
      <EventModal />
      <PostingModal />
      <Phone />
      <MapView />
      <CallUpModal />
      <Minigame />
    </>
  )
}
