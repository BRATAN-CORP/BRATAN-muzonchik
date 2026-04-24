import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import { fetchTidalAlbum } from '@/lib/api';
import type { AlbumSet, Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { TrackList } from '@/components/TrackList';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/store/player';

function totalSeconds(tracks: Track[] | null) {
  if (!tracks?.length) return 0;
  return tracks.reduce((acc, t) => acc + (typeof t.duration === 'number' ? t.duration : 0), 0);
}

function formatTotal(sec: number) {
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

export function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<AlbumSet | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!id) return;
    setAlbum(null);
    setTracks(null);
    setError(null);
    let cancelled = false;
    fetchTidalAlbum(id)
      .then((data) => {
        if (cancelled) return;
        setAlbum(data.album);
        setTracks(data.tracks);
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
    if (!tracks?.length) return;
    playTrack(tracks[0], tracks);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        {album ? (
          <Cover
            src={album.thumb}
            title={album.title}
            artist={album.artist}
            rounded="lg"
            className="size-48 md:size-56 shrink-0 shadow-float"
          />
        ) : (
          <Skeleton className="size-48 md:size-56 rounded-xl" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Альбом</div>
          <h1 className="mt-1 text-3xl md:text-5xl font-semibold tracking-tight">
            {album?.title ?? <Skeleton className="h-9 w-60 inline-block align-middle" />}
          </h1>
          {album?.artist && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-foreground">
                <Link to="#" className="hover:underline" onClick={(e) => e.preventDefault()}>
                  {album.artist}
                </Link>
              </span>
              {tracks && tracks.length > 0 && (
                <>
                  <span className="mx-1.5">·</span>
                  <span>{tracks.length} треков</span>
                  {formatTotal(totalSeconds(tracks)) && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span>{formatTotal(totalSeconds(tracks))}</span>
                    </>
                  )}
                </>
              )}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="default" size="lg" onClick={playAll} disabled={!tracks?.length}>
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

      <TrackList
        tracks={tracks ?? []}
        loading={tracks === null}
        numbered
        emptyTitle="Треки не найдены"
        emptyDescription="Альбом пуст или Tidal вернул пустой список."
      />
    </div>
  );
}
