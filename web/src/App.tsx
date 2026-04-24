import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';

const LandingPage = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.LandingPage })));
const SearchPage = lazy(() => import('@/pages/Search').then((m) => ({ default: m.SearchPage })));
const LibraryPage = lazy(() => import('@/pages/Library').then((m) => ({ default: m.LibraryPage })));
const AlbumPage = lazy(() => import('@/pages/Album').then((m) => ({ default: m.AlbumPage })));
const ArtistPage = lazy(() => import('@/pages/Artist').then((m) => ({ default: m.ArtistPage })));

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/search/:q" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/album/td/:id" element={<AlbumPage />} />
          <Route path="/artist/td/:id" element={<ArtistPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function RouteFallback() {
  return (
    <div className="py-20 flex items-center justify-center">
      <div
        className="size-6 rounded-full border-2 border-border border-t-accent soft-spin"
        aria-label="Загрузка"
        role="status"
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center text-sm text-muted-foreground">
      Страница не найдена.
    </div>
  );
}
