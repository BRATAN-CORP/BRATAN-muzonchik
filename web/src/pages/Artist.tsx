import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchTidalArtist } from '@/lib/api';
import type { AlbumSet, ArtistSet, Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { TrackRow } from '@/components/TrackRow';
import { CardTile } from '@/components/CardTile';

export function ArtistPage() {
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistSet | null>(null);
  const [topTracks, setTopTracks] = useState<Track[] | null>(null);
  const [albums, setAlbums] = useState<AlbumSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setError(null);
    let cancelled = false;
    fetchTidalArtist(id)
      .then(({ artist, topTracks, albums }) => {
        if (cancelled) return;
        setArtist(artist);
        setTopTracks(topTracks);
        setAlbums(albums);
      })
      .catch((err) => !cancelled && setError(err.message || 'не удалось загрузить'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error)
    return <div className="p-10 text-sm text-fg-muted">Ошибка: {error}</div>;

  return (
    <div className="px-5 md:px-10 pt-8 pb-24 max-w-[1200px] mx-auto">
      <header className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        <Cover
          src={artist?.thumb}
          title={artist?.name}
          rounded="full"
          className="size-40 md:size-48 shadow-float shrink-0"
        />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Артист</div>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight truncate">
            {artist?.name ?? '—'}
          </h1>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">Популярные треки</h2>
        <div className="mt-3 flex flex-col gap-0.5">
          {topTracks === null ? (
            <div className="h-40 rounded-md bg-bg-overlay animate-pulse" />
          ) : topTracks.length === 0 ? (
            <div className="text-sm text-fg-muted">Нет треков.</div>
          ) : (
            topTracks.slice(0, 10).map((t, i) => (
              <TrackRow key={`${t.source}-${t.id}`} track={t} index={i} queue={topTracks} />
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">Альбомы</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {albums === null ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3">
                <div className="aspect-square rounded-md bg-bg-overlay animate-pulse" />
                <div className="mt-3 h-3 w-3/4 bg-bg-overlay rounded animate-pulse" />
              </div>
            ))
          ) : albums.length === 0 ? (
            <div className="text-sm text-fg-muted col-span-full">Альбомов нет.</div>
          ) : (
            albums.map((a) => (
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
      </section>
    </div>
  );
}
