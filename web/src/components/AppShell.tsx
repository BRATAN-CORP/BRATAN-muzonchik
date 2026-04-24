import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TopBar } from './TopBar';
import { PlayerBar } from './PlayerBar';
import { AudioHost } from './AudioHost';
import { FullPlayer } from './FullPlayer';
import { cn } from '@/lib/cn';
import { usePlayer } from '@/store/player';

interface AppShellProps {
  children: ReactNode;
}

// Top-level layout: sidebar + main + mini-player + fullscreen overlay.
// Rendered once in App and hosts the <audio> element so playback survives
// route changes.
export function AppShell({ children }: AppShellProps) {
  const hasCurrent = usePlayer((s) => !!s.current);
  return (
    <div className="min-h-svh flex">
      <Sidebar />

      <div className="flex-1 flex min-w-0 flex-col">
        <TopBar />
        <main
          id="main"
          className={cn(
            'flex-1 overflow-x-hidden',
            // leave room for mini-player + mobile nav
            hasCurrent ? 'pb-[calc(120px+env(safe-area-inset-bottom))]' : 'pb-[calc(72px+env(safe-area-inset-bottom))]',
            'lg:pb-[104px]',
          )}
        >
          <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      <PlayerBar />
      <MobileNav />
      <AudioHost />
      <FullPlayer />
    </div>
  );
}
