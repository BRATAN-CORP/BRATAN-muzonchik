import {
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Volume1,
  ListMusic,
} from 'lucide-react';
import { Cover } from './Cover';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { usePlayer } from '@/store/player';
import { cn } from '@/lib/cn';
import { Link } from 'react-router-dom';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Persistent mini-player docked to the bottom of the viewport. Stays
// readable in both themes (it's painted on the `--player` surface, not
// the main background) and collapses to a compact 1-row layout on
// mobile.
export function PlayerBar() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);

  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const seekTo = usePlayer((s) => s.seekTo);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const openFull = usePlayer((s) => s.openFull);
  const toggleQueue = usePlayer((s) => s.toggleQueue);

  if (!current) return null;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 40 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-30 bg-player text-player-foreground border-t border-border',
        'pb-[env(safe-area-inset-bottom)]',
        'bottom-[calc(62px+env(safe-area-inset-bottom))] lg:bottom-0',
        'shadow-float',
      )}
      role="region"
      aria-label="Текущее воспроизведение"
    >
      <div className="mx-auto max-w-[1240px] px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-[280px]">
          <button
            type="button"
            onClick={openFull}
            aria-label="Открыть полноэкранный плеер"
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <Cover
              src={current.thumb}
              title={current.title}
              artist={current.artist}
              rounded="md"
              className="size-11 sm:size-12"
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{current.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {current.artistId ? (
                <Link
                  to={`/artist/td/${encodeURIComponent(current.artistId)}`}
                  className="hover:text-foreground hover:underline"
                >
                  {current.artist}
                </Link>
              ) : (
                current.artist
              )}
            </div>
          </div>
        </div>

        {/* Controls + progress */}
        <div className="flex-1 flex-col items-center gap-1 hidden sm:flex">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={shuffle}
              aria-label={shuffle ? 'Выключить shuffle' : 'Включить shuffle'}
              onClick={toggleShuffle}
              className={shuffle ? 'text-accent' : ''}
            >
              <Shuffle size={15} />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Предыдущий трек" onClick={prev}>
              <SkipBack size={16} fill="currentColor" />
            </Button>
            <Button
              variant="default"
              size="icon"
              aria-label={isPlaying ? 'Пауза' : 'Играть'}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Следующий трек" onClick={next}>
              <SkipForward size={16} fill="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={repeat !== 'off'}
              aria-label={
                repeat === 'off'
                  ? 'Включить повтор'
                  : repeat === 'all'
                    ? 'Повтор всех'
                    : 'Повтор одного'
              }
              onClick={cycleRepeat}
              className={repeat !== 'off' ? 'text-accent' : ''}
            >
              {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </Button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">
              {formatTime(position)}
            </span>
            <Slider
              className="flex-1"
              value={duration > 0 ? position : 0}
              min={0}
              max={duration > 0 ? duration : 1}
              step={1}
              onChange={(v) => seekTo(v)}
              aria-label="Позиция воспроизведения"
            />
            <span className="text-[10px] tabular-nums text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile-only: play/pause + fullscreen */}
          <Button
            variant="default"
            size="icon-sm"
            className="sm:hidden"
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label="Очередь"
            onClick={toggleQueue}
          >
            <ListMusic size={15} />
          </Button>

          <div className="hidden md:flex items-center gap-2 w-[160px]">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              onClick={toggleMute}
            >
              <VolumeIcon size={15} />
            </Button>
            <Slider
              value={muted ? 0 : volume}
              min={0}
              max={100}
              step={1}
              onChange={(v) => setVolume(v)}
              aria-label="Громкость"
            />
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Эквалайзер"
            onClick={() => {
              openFull();
              setTimeout(() => usePlayer.getState().toggleEq(), 0);
            }}
          >
            <SlidersHorizontal size={15} />
          </Button>

          <Button variant="ghost" size="icon-sm" aria-label="Полноэкранный режим" onClick={openFull}>
            <Maximize2 size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
