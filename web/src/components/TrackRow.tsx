import { Play, Plus, Trash2, Download, Pause, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Track } from '@/types/media'
import { itemKey } from '@/types/media'
import { usePlayer } from '@/hooks/player-context'
import { tidalQualityLabel } from '@/providers/adapters'
import { getTidalDownloadUrl } from '@/lib/api'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TrackRowProps {
  track: Track
  listType: 'results' | 'playlist'
  index?: number
}

export function TrackRow({ track, listType }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, addToPlaylist, removeFromPlaylist } = usePlayer()
  const isCurrent = currentTrack && itemKey(currentTrack) === itemKey(track)

  const handlePlay = () => {
    playTrack(track, listType)
  }

  const handleDownload = () => {
    if (track.source !== 'tidal') return
    const url = getTidalDownloadUrl(track.id)
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const sourceTag = track.source === 'tidal' ? 'Tidal' : track.source === 'youtube' ? 'YT' : 'SC'
  const qualityTag = track.source === 'tidal' && track.audioQuality
    ? tidalQualityLabel(track.audioQuality)
    : null

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer',
        'hover:bg-surface-hover',
        isCurrent && 'bg-primary/10 border border-primary/20',
        !isCurrent && 'border border-transparent'
      )}
      onDoubleClick={handlePlay}
      role="row"
      aria-label={`${track.title} by ${track.artist}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handlePlay() }}
    >
      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
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
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handlePlay}
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white" />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm font-semibold truncate',
          isCurrent && 'text-primary'
        )}>
          {track.title}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase">
            {sourceTag}
          </span>
          <span className="truncate">{track.artist}</span>
          {track.verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" aria-label="Verified" />
          )}
          {track.duration && (
            <span className="text-muted-foreground/60">{formatTime(track.duration)}</span>
          )}
          {qualityTag && (
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">
              {qualityTag}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {listType === 'results' && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); addToPlaylist(track) }}
            aria-label="Add to playlist"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
        {track.source === 'tidal' && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            aria-label="Download"
          >
            <Download className="w-4 h-4 text-success" />
          </Button>
        )}
        {listType === 'playlist' && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); removeFromPlaylist(track) }}
            aria-label="Remove from playlist"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  )
}
