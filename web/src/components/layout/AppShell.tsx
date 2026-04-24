import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { PlayerBar } from '@/components/player/PlayerBar'
import { FullscreenPlayer } from '@/components/player/FullscreenPlayer'
import { PaywallModal } from '@/components/auth/PaywallModal'
import { usePlayer } from '@/hooks/player-context'

export function AppShell() {
  const { fullscreen } = usePlayer()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-40 md:pb-28">
          <Outlet />
        </div>
      </main>

      <PlayerBar />
      <MobileNav />

      {fullscreen && <FullscreenPlayer />}
      <PaywallModal />
    </div>
  )
}
