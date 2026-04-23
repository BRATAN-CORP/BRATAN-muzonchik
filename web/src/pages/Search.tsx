import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  searchSoundCloudTracks,
  searchTidalAlbums,
  searchTidalArtists,
  searchTidalTracks,
} from '@/lib/api';
import type { AlbumSet, ArtistSet, Track } from '@/lib/types';
import { TrackRow } from '@/components/TrackRow';
import { CardTile } from '@/components/CardTile';
import { cn } from '@/lib/cn';

type Tab = 'tracks' | 'albums' | 'artists';
type Source = 'tidal' | 'soundcloud';

export function SearchPage() {
  const { q: encoded } = useParams();
  const navigate = useNavigate();
  const q = useMemo(() => {
    try {
      return decodeURIComponent(encoded ?? '');
    } catch {
      return encoded ?? '';
    }
  }, [encoded]);

  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);

  const [tab, setTab] = useState<Tab>('tracks');
  const [source, setSource] = useState<Source>('tidal');
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [albums, setAlbums] = useState<AlbumSet[] | null>(null);
  const [artists, setArtists] = useState<ArtistSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setTracks(null);
      setAlbums(null);
      setArtists(null);
      return;
    }
    setError(null);
    let cancelled = false;

    if (tab === 'tracks') {
      setTracks(null);
      const promise = source === 'tidal' ? searchTidalTracks(q) : searchSoundCloudTracks(q);
      promise
        .then((items) => !cancelled && setTracks(items))
        .catch((err) => !cancelled && setError(err.message || 'ошибка поиска'));
    } else if (tab === 'albums') {
      setAlbums(null);
      searchTidalAlbums(q)
        .then((items) => !cancelled && setAlbums(items))
        .catch((err) => !cancelled && setError(err.message || 'ошибка поиска'));
    } else {
      setArtists(null);
      searchTidalArtists(q)
        .then((items) => !cancelled && setArtists(items))
        .catch((err) => !cancelled && setError(err.message || 'ошибка поиска'));
    }

    return () => {
      cancelled = true;
    };
  }, [q, tab, source]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    navigate(`/search/${encodeURIComponent(query)}`);
  };

  return (
    <div className="px-5 md:px-10 pt-8 pb-24 max-w-[1200px] mx-auto">
      <form onSubmit={onSubmit} className="flex gap-3 items-center">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Что ищем?"
          className="flex-1 h-12 px-4 rounded-md bg-bg-overlay border border-border-base text-base text-fg-base placeholder:text-fg-subtle focus:outline-none focus:border-border-strong"
        />
        <button
          type="submit"
          className="h-12 px-6 rounded-md bg-fg-base text-bg-base font-medium hover:opacity-90"
        >
          Найти
        </button>
      </form>

      {q && (
        <>
          <div className="mt-6 flex items-center gap-4">
            <TabButton active={tab === 'tracks'} onClick={() => setTab('tracks')}>Треки</TabButton>
            <TabButton active={tab === 'albums'} onClick={() => setTab('albums')}>Альбомы</TabButton>
            <TabButton active={tab === 'artists'} onClick={() => setTab('artists')}>Артисты</TabButton>
            <div className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
              {tab === 'tracks' && (
                <>
                  <SourceToggle active={source === 'tidal'} onClick={() => setSource('tidal')}>Tidal</SourceToggle>
                  <SourceToggle active={source === 'soundcloud'} onClick={() => setSource('soundcloud')}>SoundCloud</SourceToggle>
                </>
              )}
            </div>
          </div>

          <div className="mt-5">
            {error && (
              <div className="hairline rounded-md p-4 text-sm text-fg-muted">
                Не получилось загрузить: {error}
              </div>
            )}
            {tab === 'tracks' && (
              <div className="flex flex-col gap-0.5">
                {tracks === null && !error ? (
                  <Skeleton rows={8} />
                ) : tracks && tracks.length === 0 ? (
                  <Empty />
                ) : (
                  tracks?.map((t, i) => <TrackRow key={`${t.source}-${t.id}`} track={t} index={i} queue={tracks} />)
                )}
              </div>
            )}
            {tab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {albums === null && !error ? (
                  <Skeleton rows={6} grid />
                ) : albums && albums.length === 0 ? (
                  <Empty />
                ) : (
                  albums?.map((a) => (
                    <CardTile
                      key={a.id}
                      to={`/album/td/${encodeURIComponent(a.id)}`}
                      title={a.title}
                      subtitle={a.artist}
                      thumb={a.thumb}
                    />
                  ))
                )}
              </div>
            )}
            {tab === 'artists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {artists === null && !error ? (
                  <Skeleton rows={6} grid />
                ) : artists && artists.length === 0 ? (
                  <Empty />
                ) : (
                  artists?.map((a) => (
                    <CardTile
                      key={a.id}
                      to={`/artist/td/${encodeURIComponent(a.id)}`}
                      title={a.name}
                      thumb={a.thumb}
                      rounded="full"
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 px-4 rounded-full text-sm transition-colors',
        active
          ? 'bg-fg-base text-bg-base'
          : 'text-fg-muted hover:text-fg-base hover:bg-bg-overlay'
      )}
    >
      {children}
    </button>
  );
}

function SourceToggle({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 px-3 rounded-full text-xs transition-colors border',
        active
          ? 'border-fg-base text-fg-base'
          : 'border-border-base text-fg-muted hover:text-fg-base'
      )}
    >
      {children}
    </button>
  );
}

function Skeleton({ rows, grid = false }: { rows: number; grid?: boolean }) {
  return grid ? (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3">
          <div className="aspect-square rounded-md bg-bg-overlay animate-pulse" />
          <div className="mt-3 h-3 w-3/4 bg-bg-overlay rounded animate-pulse" />
          <div className="mt-2 h-3 w-1/2 bg-bg-overlay rounded animate-pulse" />
        </div>
      ))}
    </>
  ) : (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="size-10 rounded-sm bg-bg-overlay animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-2/3 bg-bg-overlay rounded animate-pulse" />
            <div className="mt-2 h-3 w-1/3 bg-bg-overlay rounded animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}

function Empty() {
  return (
    <div className="hairline rounded-xl p-10 text-center text-sm text-fg-muted">
      Ничего не нашлось. Попробуй другое слово.
    </div>
  );
}
