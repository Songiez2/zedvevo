import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MusicPlayer from '@/components/player/MusicPlayer'
import { usePlayerStore } from '@/stores/playerStore'

export default function Layout() {
  const showMiniPlayer = usePlayerStore(s => s.showMiniPlayer)
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      <Navbar />
      <main className={`flex-1 ${showMiniPlayer ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      <Footer />
      {showMiniPlayer && <MusicPlayer />}
    </div>
  )
}
