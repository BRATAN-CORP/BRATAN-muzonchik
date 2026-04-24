import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, ChevronUp, Sliders } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlayer } from '@/hooks/player-context'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { EQPanel } from './EQPanel'

export function PlayerBar() {
  const {
    currentTrack, isPlaying, loop, volume, currentTimeStr, durationStr,
    seekPosition, qualityLabel,
    togglePlay, playNext, playPrev, seek, setVolume, toggleLoop, setFullscreen,
  } = usePlayer()

  const [showEQ, setShowEQ] = useState(false)

  return (
    <>
      {/* Desktop player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 hidden md:block">
        {/* Cover glow */}
        {currentTrack?.thumb && (
          <div
            className="absolute inset-0 cover-glow pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${currentTrack.thumb})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.5)',
            }}
          />
        )}

        <div className="relative bg-card/90 backdrop-blur-xl border-t border-border">
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 items-center px-4 py-2.5 max-w-screen-2xl mx-auto">
            {/* Now playing info */}
            <div className="flex items-center gap-3 min-w-0">
              {currentTrack?.thumb ? (
                <button
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer group"
                  onClick={() => setFullscreen(true)}
                  aria-label="Open fullscreen player"
                >
                  <img src={currentTrack.thumb} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronUp className="w-5 h-5 text-white" />
                  </div>
                </button>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
              )}
              <div className="min-w-0">
                <div className={cn('text-sm font-semibold truncate', currentTrack && 'text-foreground')}>
                  {currentTrack?.title || 'Nothing playing'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {currentTrack?.artist || 'Add tracks to your playlist'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={playPrev} aria-label="Previous track">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-full"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4.5 h-4.5 fill-current" />
                  ) : (
                    <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                  )}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={playNext} aria-label="Next track">
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleLoop}
                  className={cn(loop && 'text-primary')}
                  aria-label="Toggle repeat"
                >
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full max-w-lg">
                <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">
                  {currentTimeStr}
                </span>
                <Slider
                  min={0}
                  max={1000}
                  value={Math.floor(seekPosition)}
                  onChange={(e) => seek(Number(e.currentTarget.value) / 1000)}
                  className="flex-1"
                  aria-label="Seek"
                />
                <span className="text-[11px] text-muted-foreground tabular-nums w-9">
                  {durationStr}
                </span>
              </div>
            </div>

            {/* Volume & extras */}
            <div className="flex items-center gap-2 justify-end">
              {qualityLabel && (
                <span className="hidden lg:inline-block px-2 py-0.5 rounded-full border border-border text-[10px] text-muted-foreground font-medium">
                  {qualityLabel}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowEQ(!showEQ)}
                className={cn(showEQ && 'text-primary')}
                aria-label="Toggle equalizer"
              >
                <Sliders className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setVolume(volume > 0 ? 0 : 80)}
                aria-label={volume > 0 ? 'Mute' : 'Unmute'}
              >
                {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Slider
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.currentTarget.value))}
                className="w-24"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile player bar */}
      {currentTrack && (
        <div className="fixed bottom-12 left-0 right-0 z-20 md:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="mx-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl">
            <button
              className="flex items-center gap-3 w-full px-3 py-2 text-left"
              onClick={() => setFullscreen(true)}
              aria-label="Open fullscreen player"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                {currentTrack.thumb && (
                  <img src={currentTrack.thumb} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{currentTrack.title}</div>
                <div className="text-xs text-muted-foreground truncate">{currentTrack.artist}</div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => { e.stopPropagation(); togglePlay() }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </Button>
            </button>
          </div>
        </div>
      )}

      {showEQ && <EQPanel onClose={() => setShowEQ(false)} />}
    </>
  )
}
