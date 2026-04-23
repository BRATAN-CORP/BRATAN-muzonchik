import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { PlayerBar } from '@/components/PlayerBar';
import { FullPlayer } from '@/components/FullPlayer';
import { AudioHost } from '@/components/AudioHost';

const LandingPage = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.LandingPage })));
const SearchPage = lazy(() => import('@/pages/Search').then((m) => ({ default: m.SearchPage })));
const LibraryPage = lazy(() => import('@/pages/Library').then((m) => ({ default: m.LibraryPage })));
const AlbumPage = lazy(() => import('@/pages/Album').then((m) => ({ default: m.AlbumPage })));
const ArtistPage = lazy(() => import('@/pages/Artist').then((m) => ({ default: m.ArtistPage })));

export function App() {
  useEffect(() => {
    const saved = localStorage.getItem('bratan.theme');
    document.documentElement.dataset.theme = saved === 'light' ? 'light' : 'dark';
  }, []);

  return (
    <div className="min-h-[100svh] flex flex-col bg-bg-base text-fg-base">
      <TopBar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="p-10 flex items-center justify-center">
              <div className="size-6 rounded-full border-2 border-border-strong border-t-[color:var(--accent)] animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/search/:q" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/album/td/:id" element={<AlbumPage />} />
            <Route path="/artist/td/:id" element={<ArtistPage />} />
            <Route path="*" element={<div className="p-10 text-fg-muted">404</div>} />
          </Routes>
        </Suspense>
      </main>
      <PlayerBar />
      <FullPlayer />
      <AudioHost />
    </div>
  );
}
