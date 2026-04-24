import { Pause, Play } from 'lucide-react';
import { Cover } from './Cover';
import { Button } from './ui/button';
import { usePlayer } from '@/store/player';
import { cn } from '@/lib/cn';

// Up-next list shown inside the fullscreen player. Clicking a row jumps
// straight to that track; the current one is marked + can be toggled.
export function QueuePanel({ className }: { className?: string }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);

  if (!queue.length) {
    return (
      <div className={cn('hairline rounded-xl p-6 text-sm text-muted-foreground text-center', className)}>
        Очередь пуста.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {queue.map((t, i) => {
        const isCurrent = i === index;
        return (
          <button
            key={`${t.source}-${t.id}`}
            type="button"
            onClick={() => {
              if (isCurrent) setIsPlaying(!isPlaying);
              else {
                playTrack(t, queue);
                setIsPlaying(true);
              }
            }}
            className={cn(
              'group flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
              isCurrent ? 'bg-secondary text-foreground' : 'hover:bg-secondary text-muted-foreground',
            )}
          >
            <div className="relative">
              <Cover
                src={t.thumb}
                title={t.title}
                artist={t.artist}
                rounded="sm"
                className="size-10 shrink-0"
              />
              {isCurrent && (
                <div className="absolute inset-0 rounded-sm bg-black/40 flex items-center justify-center text-accent-foreground">
                  {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('truncate text-sm font-medium', isCurrent ? 'text-foreground' : 'text-foreground/90')}>
                {t.title}
              </div>
              <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
            </div>
            {!isCurrent && (
              <Button variant="ghost" size="icon-sm" aria-label={`Играть ${t.title}`}>
                <Play size={14} fill="currentColor" />
              </Button>
            )}
          </button>
        );
      })}
    </div>
  );
}
