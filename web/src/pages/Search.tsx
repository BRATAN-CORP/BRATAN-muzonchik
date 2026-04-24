import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  searchSoundCloudTracks,
  searchTidalAlbums,
  searchTidalArtists,
  searchTidalTracks,
  searchYouTubeTracks,
} from '@/lib/api';
import type { AlbumSet, ArtistSet, Track } from '@/lib/types';
import { TrackList } from '@/components/TrackList';
import { AlbumCard } from '@/components/AlbumCard';
import { ArtistCard } from '@/components/ArtistCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { encodeQuery } from '@/lib/safe-url';
import { usePlayer } from '@/store/player';
import { cn } from '@/lib/cn';

type Tab = 'tracks' | 'albums' | 'artists';
type Source = 'tidal' | 'soundcloud' | 'youtube';

// /search — strict single-column grid. Source toggle applies only to
// tracks (Tidal / SoundCloud / YouTube). Albums and artists come from
// Tidal only because that's all the worker exposes for those shapes.
export function SearchPage() {
  const { q: encoded } = useParams();
  const navigate = useNavigate();

  const q = useMemo(() => {
    try {
      return decodeURIComponent(encoded ?? '').trim();
    } catch {
      return (encoded ?? '').trim();
    }
  }, [encoded]);

  const [input, setInput] = useState(q);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput(q);
  }, [q]);

  const [tab, setTab] = useState<Tab>('tracks');
  const [source, setSource] = useState<Source>('tidal');

  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [albums, setAlbums] = useState<AlbumSet[] | null>(null);
  const [artists, setArtists] = useState<ArtistSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!q) {
      setTracks(null);
      setAlbums(null);
      setArtists(null);
      setError(null);
      return;
    }
    setError(null);
    let cancelled = false;
    const fail = (err: unknown) => {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить';
      setError(msg);
    };

    if (tab === 'tracks') {
      setTracks(null);
      const p =
        source === 'tidal'
          ? searchTidalTracks(q)
          : source === 'soundcloud'
            ? searchSoundCloudTracks(q)
            : searchYouTubeTracks(q);
      p.then((items) => !cancelled && setTracks(items)).catch(fail);
    } else if (tab === 'albums') {
      setAlbums(null);
      searchTidalAlbums(q).then((items) => !cancelled && setAlbums(items)).catch(fail);
    } else {
      setArtists(null);
      searchTidalArtists(q).then((items) => !cancelled && setArtists(items)).catch(fail);
    }

    return () => {
      cancelled = true;
    };
  }, [q, tab, source]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    navigate(`/search/${encodeQuery(query)}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Поиск"
        title="Найти что послушать"
        description="Tidal, SoundCloud и YouTube — в одном интерфейсе."
      />

      <form onSubmit={submit} className="flex gap-2 items-center" role="search">
        <SearchInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onClear={() => {
            setInput('');
            if (q) navigate('/search');
          }}
          placeholder="Что ищем?"
          autoFocus
          aria-label="Поисковый запрос"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            'h-10 px-4 rounded-[8px] text-[12px] font-medium shrink-0',
            'bg-accent text-accent-foreground border border-[rgba(255,255,255,0.1)]',
            'hover:bg-[color:color-mix(in_oklab,var(--accent)_88%,white_12%)]',
            'disabled:opacity-50 disabled:pointer-events-none',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          )}
        >
          Найти
        </button>
      </form>

      {!q ? (
        <EmptyState
          title="Пока ничего не ищем"
          description="Введи название трека, альбома или имя артиста — увидишь живые результаты."
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="tracks">Треки</TabsTrigger>
              <TabsTrigger value="albums">Альбомы</TabsTrigger>
              <TabsTrigger value="artists">Артисты</TabsTrigger>
            </TabsList>
            {tab === 'tracks' && (
              <div className="flex items-center gap-1 rounded-[8px] border border-[rgba(255,255,255,0.1)] p-1">
                <SourcePill active={source === 'tidal'} onClick={() => setSource('tidal')} label="Tidal" />
                <SourcePill
                  active={source === 'soundcloud'}
                  onClick={() => setSource('soundcloud')}
                  label="SoundCloud"
                />
                <SourcePill
                  active={source === 'youtube'}
                  onClick={() => setSource('youtube')}
                  label="YouTube"
                />
              </div>
            )}
          </div>

          <TabsContent value="tracks">
            <TrackList
              tracks={tracks ?? []}
              loading={tracks === null}
              error={error}
              numbered
              showAlbum
              emptyTitle="Ничего не нашлось"
              emptyDescription="Попробуй другое слово или переключи источник."
              onPlayTrack={(t) => {
                if (!tracks?.length) return;
                playTrack(t, tracks);
                setIsPlaying(true);
              }}
            />
          </TabsContent>

          <TabsContent value="albums">
            <CardGrid
              loading={albums === null}
              empty={albums?.length === 0}
              error={error}
              skeletonKeys={8}
              emptyTitle="Альбомы не нашлись"
            >
              {albums?.map((a) => (
                <AlbumCard key={a.id} album={a} />
              ))}
            </CardGrid>
          </TabsContent>

          <TabsContent value="artists">
            <CardGrid
              loading={artists === null}
              empty={artists?.length === 0}
              error={error}
              skeletonKeys={8}
              emptyTitle="Артисты не нашлись"
            >
              {artists?.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </CardGrid>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SourcePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-6 px-2.5 rounded-[6px] text-[11px] font-medium transition-colors duration-150',
        active
          ? 'bg-[rgba(60,130,255,0.14)] text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function CardGrid({
  loading,
  empty,
  error,
  children,
  skeletonKeys,
  emptyTitle,
}: {
  loading: boolean;
  empty?: boolean;
  error: string | null;
  skeletonKeys: number;
  emptyTitle: string;
  children?: React.ReactNode;
}) {
  if (error) {
    return <EmptyState title="Не получилось загрузить" description={error} />;
  }
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: skeletonKeys }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (empty) {
    return <EmptyState title={emptyTitle} description="Попробуй другой запрос." />;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {children}
    </div>
  );
}
