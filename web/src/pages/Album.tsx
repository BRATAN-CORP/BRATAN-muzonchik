import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchTidalAlbum } from '@/lib/api';
import type { AlbumSet, Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { TrackRow } from '@/components/TrackRow';
import { IconPlay } from '@/components/icons';
import { usePlayer } from '@/store/player';

export function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<AlbumSet | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);

  useEffect(() => {
    if (!id) return;
    setError(null);
    let cancelled = false;
    fetchTidalAlbum(id)
      .then(({ album, tracks }) => {
        if (cancelled) return;
        setAlbum(album);
        setTracks(tracks);
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
          src={album?.thumb}
          title={album?.title}
          artist={album?.artist}
          rounded="lg"
          className="size-48 md:size-56 shadow-float shrink-0"
        />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Альбом</div>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight truncate">
            {album?.title ?? '—'}
          </h1>
          <p className="mt-1 text-sm text-fg-muted truncate">{album?.artist}</p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={!tracks?.length}
              onClick={() => {
                if (!tracks?.length) return;
                playTrack(tracks[0], tracks);
                setIsPlaying(true);
              }}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-fg-base text-bg-base font-medium hover:opacity-90 disabled:opacity-40"
            >
              <IconPlay size={16} /> Слушать
            </button>
          </div>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-0.5">
        {tracks === null ? (
          <div className="h-40 rounded-md bg-bg-overlay animate-pulse" />
        ) : tracks.length === 0 ? (
          <div className="text-sm text-fg-muted">Треков не найдено.</div>
        ) : (
          tracks.map((t, i) => (
            <TrackRow key={`${t.source}-${t.id}`} track={t} index={i} queue={tracks} />
          ))
        )}
      </div>
    </div>
  );
}
