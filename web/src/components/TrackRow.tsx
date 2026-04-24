import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { Cover } from './Cover';
import { Badge } from './ui/badge';
import { usePlayer } from '@/store/player';
import type { Track } from '@/lib/types';
import { cn } from '@/lib/cn';

interface TrackRowProps {
  track: Track;
  index?: number;
  queue?: Track[];
  showAlbum?: boolean;
  showArtist?: boolean;
  /** If provided, overrides the default play behaviour (which uses the
   *  `queue` prop as the upcoming list). */
  onPlay?: (track: Track) => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Dense list row used on search / album / artist / library surfaces. The
// entire row is a button (double click also plays), but the artist/album
// links remain independently clickable with keyboard and mouse.
export function TrackRow({
  track,
  index,
  queue,
  showAlbum = false,
  showArtist = true,
  onPlay,
}: TrackRowProps) {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);

  const isCurrent = !!current && current.id === track.id && current.source === track.source;
  const active = isCurrent && isPlaying;

  const toggle = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (onPlay) {
      onPlay(track);
      return;
    }
    playTrack(track, queue);
    setIsPlaying(true);
  };

  return (
    <div
      className={cn(
        'group relative grid items-center gap-3 rounded-md px-2 sm:px-3 py-2 transition-colors',
        'hover:bg-secondary',
        isCurrent ? 'text-foreground' : 'text-muted-foreground',
      )}
      style={{
        gridTemplateColumns:
          typeof index === 'number'
            ? 'minmax(1.5rem,auto) auto minmax(0,1fr) auto'
            : 'auto minmax(0,1fr) auto',
      }}
      onDoubleClick={toggle}
    >
      {typeof index === 'number' && (
        <div className="relative w-6 shrink-0 text-xs tabular-nums text-muted-foreground text-right">
          <span className={cn(active ? 'opacity-0' : 'group-hover:opacity-0')}>{index + 1}</span>
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={active ? 'Пауза' : `Играть ${track.title}`}
          >
            {active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          {active && (
            <span className="absolute inset-0 flex items-center justify-center text-accent" aria-hidden>
              <EqIndicator />
            </span>
          )}
        </div>
      )}

      <Cover
        src={track.thumb}
        title={track.title}
        artist={track.artist}
        rounded="sm"
        className="size-10 shrink-0"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('truncate text-sm font-medium', isCurrent ? 'text-accent' : 'text-foreground')}>
            {track.title}
          </span>
          {track.explicit && (
            <span
              aria-label="Explicit"
              title="Explicit"
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border text-[9px] font-semibold text-muted-foreground"
            >
              E
            </span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {showArtist && track.artistId ? (
            <Link
              to={`/artist/td/${encodeURIComponent(track.artistId)}`}
              className="hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist}
            </Link>
          ) : showArtist ? (
            track.artist
          ) : null}
          {showAlbum && track.album && track.albumId && (
            <>
              <span className="mx-1">·</span>
              <Link
                to={`/album/td/${encodeURIComponent(track.albumId)}`}
                className="hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {track.album}
              </Link>
            </>
          )}
          {showAlbum && track.album && !track.albumId && (
            <>
              <span className="mx-1">·</span>
              <span>{track.album}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {track.audioQuality && /LOSSLESS|HI_RES/i.test(track.audioQuality) && (
          <Badge variant="outline" className="hidden md:inline-flex">
            {/HI_RES/.test(track.audioQuality) ? 'Hi-Res' : 'Lossless'}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {track.duration ? fmt(track.duration) : ''}
        </span>
      </div>
    </div>
  );
}

function EqIndicator() {
  return (
    <div className="flex items-end gap-[2px] h-4" aria-hidden>
      <span className="w-[2px] bg-current rounded-sm origin-bottom animate-[eq-bar_0.9s_ease-in-out_infinite]" style={{ height: '100%' }} />
      <span className="w-[2px] bg-current rounded-sm origin-bottom animate-[eq-bar_0.7s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '-0.2s' }} />
      <span className="w-[2px] bg-current rounded-sm origin-bottom animate-[eq-bar_1.1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '-0.4s' }} />
    </div>
  );
}
