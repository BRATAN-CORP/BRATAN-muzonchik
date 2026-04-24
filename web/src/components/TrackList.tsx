import type { Track } from '@/lib/types';
import { TrackRow } from './TrackRow';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './EmptyState';

interface TrackListProps {
  tracks: Track[] | null;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  showAlbum?: boolean;
  showArtist?: boolean;
  /** When true, rows are numbered 1..n — useful on album/playlist pages. */
  numbered?: boolean;
  /**
   * Optional override for row click — allows the search page to start the
   * queue from an arbitrary track without having TrackRow know about it.
   */
  onPlayTrack?: (track: Track) => void;
}

export function TrackList({
  tracks,
  loading,
  error,
  emptyTitle = 'Ничего не найдено',
  emptyDescription,
  showAlbum,
  showArtist,
  numbered = true,
  onPlayTrack,
}: TrackListProps) {
  if (error) {
    return (
      <EmptyState
        tone="destructive"
        title="Не удалось загрузить"
        description={error}
      />
    );
  }
  if (loading || tracks === null) {
    return (
      <div className="flex flex-col gap-0.5" aria-busy>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 sm:px-3 py-2">
            {numbered && <Skeleton className="h-3 w-4" />}
            <Skeleton className="size-10 rounded-sm" />
            <div className="flex-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton className="h-3 w-10 hidden md:block" />
          </div>
        ))}
      </div>
    );
  }
  if (!tracks.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {tracks.map((t, i) => (
        <TrackRow
          key={`${t.source}-${t.id}`}
          track={t}
          index={numbered ? i : undefined}
          queue={tracks}
          showAlbum={showAlbum}
          showArtist={showArtist}
          onPlay={onPlayTrack}
        />
      ))}
    </div>
  );
}
