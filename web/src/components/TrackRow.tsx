import { Cover } from './Cover';
import { Button } from './ui/Button';
import { IconPause, IconPlay } from './icons';
import { usePlayer } from '@/store/player';
import type { Track } from '@/lib/types';

interface TrackRowProps {
  track: Track;
  index?: number;
  queue?: Track[];
}

export function TrackRow({ track, index, queue }: TrackRowProps) {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);

  const isCurrent = !!current && current.id === track.id && current.source === track.source;
  const active = isCurrent && isPlaying;

  const onClick = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(track, queue);
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={[
        'group flex items-center gap-3 px-3 py-2 rounded-md',
        'hover:bg-bg-overlay transition-colors',
        isCurrent ? 'text-fg-base' : 'text-fg-muted',
      ].join(' ')}
    >
      {typeof index === 'number' && (
        <div className="relative w-6 shrink-0 text-xs tabular-nums text-fg-subtle">
          <span className={active ? 'opacity-0' : 'group-hover:opacity-0'}>{index + 1}</span>
          <button
            type="button"
            onClick={onClick}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-fg-base transition-opacity"
            aria-label={active ? 'Пауза' : 'Играть'}
          >
            {active ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          {active && (
            <span className="absolute inset-0 flex items-center justify-center text-[color:var(--accent)]">
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
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-fg-base">{track.title}</div>
        <div className="truncate text-xs text-fg-muted">{track.artist}</div>
      </div>
      <div className="hidden md:block text-xs text-fg-subtle tabular-nums">
        {track.duration ? fmt(track.duration) : ''}
      </div>
      <Button variant="icon" size="sm" onClick={onClick} aria-label={active ? 'Пауза' : 'Играть'}>
        {active ? <IconPause size={16} /> : <IconPlay size={16} />}
      </Button>
    </div>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Three vertical bars, pulsing. No CSS keyframe — wired to analyser via the
// fullplayer for true beat-sync. Falls back to a gentle loop if no analyser.
function EqIndicator() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      <span className="w-[2px] bg-current rounded-sm animate-[eq-bar_0.9s_ease-in-out_infinite]" style={{ height: '40%' }} />
      <span className="w-[2px] bg-current rounded-sm animate-[eq-bar_0.7s_ease-in-out_infinite]" style={{ height: '70%', animationDelay: '-0.2s' }} />
      <span className="w-[2px] bg-current rounded-sm animate-[eq-bar_1.1s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '-0.4s' }} />
      <style>{`@keyframes eq-bar { 0%,100% { transform: scaleY(0.4) } 50% { transform: scaleY(1) } }`}</style>
    </div>
  );
}
