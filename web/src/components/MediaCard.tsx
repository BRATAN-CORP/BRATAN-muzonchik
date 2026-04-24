import { Play } from 'lucide-react'
import type { Track } from '@/types/media'
import { usePlayer } from '@/hooks/player-context'
import { cn } from '@/lib/utils'

interface MediaCardProps {
  track: Track
  listType: 'results' | 'playlist'
  className?: string
}

export function MediaCard({ track, listType, className }: MediaCardProps) {
  const { playTrack } = usePlayer()

  return (
    <button
      className={cn(
        'group flex flex-col gap-2 p-3 rounded-xl bg-card hover:bg-surface-hover transition-all text-left border border-transparent hover:border-border',
        className
      )}
      onClick={() => playTrack(track, listType)}
      aria-label={`Play ${track.title} by ${track.artist}`}
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
        {track.thumb ? (
          <img
            src={track.thumb}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
      </div>
    </button>
  )
}
