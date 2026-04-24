import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchTidalArtist } from '@/lib/api';
import type { AlbumSet, ArtistSet, Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { TrackList } from '@/components/TrackList';
import { AlbumCard } from '@/components/AlbumCard';
import { Section } from '@/components/Section';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, Shuffle } from 'lucide-react';
import { usePlayer } from '@/store/player';

export function ArtistPage() {
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistSet | null>(null);
  const [topTracks, setTopTracks] = useState<Track[] | null>(null);
  const [albums, setAlbums] = useState<AlbumSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!id) return;
    // Clearing on id change is the standard "reset + fetch" pattern —
    // the key-based reset alternative doesn't apply to a routed
    // component whose id is the URL param itself.
    setArtist(null);
    setTopTracks(null);
    setAlbums(null);
    setError(null);
    let cancelled = false;
    fetchTidalArtist(id)
      .then((data) => {
        if (cancelled) return;
        setArtist(data.artist);
        setTopTracks(data.topTracks);
        setAlbums(data.albums);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (error) {
    return <EmptyState title="Ошибка" description={error} />;
  }

  const playAll = () => {
    if (!topTracks?.length) return;
    playTrack(topTracks[0], topTracks);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        {artist ? (
          <Cover
            src={artist.thumb}
            title={artist.name}
            rounded="full"
            className="size-36 md:size-44 shrink-0 shadow-float"
          />
        ) : (
          <Skeleton className="size-36 md:size-44 rounded-full" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Артист</div>
          <h1 className="mt-1 text-3xl md:text-5xl font-semibold tracking-tight truncate">
            {artist?.name ?? <Skeleton className="h-9 w-60 inline-block align-middle" />}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="default" size="lg" onClick={playAll} disabled={!topTracks?.length}>
              <Play size={16} fill="currentColor" /> Слушать
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              className={shuffle ? 'text-accent' : ''}
            >
              <Shuffle size={16} /> Перемешать
            </Button>
          </div>
        </div>
      </header>

      <Section title="Популярные треки">
        <TrackList
          tracks={topTracks ?? []}
          loading={topTracks === null}
          numbered
          emptyTitle="Нет треков"
          emptyDescription="Tidal не вернул популярные треки."
        />
      </Section>

      <Section title="Альбомы">
        {albums === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <EmptyState title="Альбомов нет" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
