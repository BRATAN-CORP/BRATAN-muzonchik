import { usePlayer } from '@/store/player';
import { Cover } from './Cover';
import { Button } from './ui/Button';
import {
  IconMaximize,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
  IconVolume,
} from './icons';

// Bottom player bar. Pure graphite + accent-on-primary. Always respects
// the bottom safe-area (iPhone home indicator, Android gesture bar).
export function PlayerBar() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const setVolume = usePlayer((s) => s.setVolume);
  const shuffle = usePlayer((s) => s.shuffle);
  const loop = usePlayer((s) => s.loop);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const toggleLoop = usePlayer((s) => s.toggleLoop);
  const openFull = usePlayer((s) => s.openFull);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-border-base bg-bg-base/85 backdrop-blur-xl"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 16px)',
        paddingRight: 'max(env(safe-area-inset-right), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}
    >
      <div className="h-0.5 w-full bg-border-base overflow-hidden">
        <div
          className="h-full bg-[color:var(--accent)] transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 py-3">
        {/* Track meta */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:max-w-sm">
          <button
            type="button"
            onClick={() => current && openFull()}
            className="relative size-12 shrink-0 rounded-md overflow-hidden hairline hover:border-border-strong transition"
            aria-label="Развернуть плеер"
          >
            <Cover
              src={current?.thumb}
              title={current?.title}
              artist={current?.artist}
              rounded="md"
              className="size-full"
            />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-fg-base">
              {current?.title ?? 'Ничего не играет'}
            </div>
            <div className="truncate text-xs text-fg-muted">{current?.artist ?? '—'}</div>
          </div>
        </div>

        {/* Transport */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="icon"
            size="sm"
            onClick={toggleShuffle}
            aria-label="Перемешать"
            className={shuffle ? 'text-[color:var(--accent)]' : undefined}
          >
            <IconShuffle size={16} />
          </Button>
          <Button variant="icon" size="sm" onClick={prev} aria-label="Предыдущий">
            <IconPrev size={18} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="size-10 rounded-full p-0"
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? <IconPause size={16} /> : <IconPlay size={16} />}
          </Button>
          <Button variant="icon" size="sm" onClick={next} aria-label="Следующий">
            <IconNext size={18} />
          </Button>
          <Button
            variant="icon"
            size="sm"
            onClick={toggleLoop}
            aria-label="Повтор"
            className={loop ? 'text-[color:var(--accent)]' : undefined}
          >
            <IconRepeat size={16} />
          </Button>
        </div>

        {/* Mobile: single play button + expand */}
        <div className="flex sm:hidden items-center gap-1 ml-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="size-10 rounded-full p-0"
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? <IconPause size={16} /> : <IconPlay size={16} />}
          </Button>
          <Button variant="icon" size="sm" onClick={() => current && openFull()} aria-label="Развернуть">
            <IconMaximize size={18} />
          </Button>
        </div>

        {/* Volume (desktop only) */}
        <div className="hidden md:flex items-center gap-2 w-40 justify-end">
          <IconVolume size={16} className="text-fg-muted" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="accent-[color:var(--accent)] w-full h-1"
            aria-label="Громкость"
          />
          <Button variant="icon" size="sm" onClick={() => current && openFull()} aria-label="Развернуть">
            <IconMaximize size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
