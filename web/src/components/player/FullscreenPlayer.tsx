import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Visualizer } from './Visualizer'
import { usePlayer } from '@/hooks/player-context'
import { cn } from '@/lib/utils'

export function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, loop, volume, currentTimeStr, durationStr,
    seekPosition, qualityLabel,
    togglePlay, playNext, playPrev, seek, setVolume, toggleLoop, setFullscreen,
  } = usePlayer()

  if (!currentTrack) return null

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden"
    >
      {/* Cover glow background */}
      {currentTrack.thumb && (
        <div
          className="absolute inset-0 cover-glow pointer-events-none"
          style={{
            backgroundImage: `url(${currentTrack.thumb})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(120px) saturate(1.8) brightness(0.3)',
          }}
        />
      )}
      <div className="absolute inset-0 bg-background/60" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-safe max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
          {qualityLabel && (
            <span className="px-3 py-1 rounded-full border border-border/50 text-xs text-muted-foreground">
              {qualityLabel}
            </span>
          )}
        </div>

        {/* Album art */}
        <div className="w-full max-w-72 aspect-square rounded-2xl overflow-hidden shadow-2xl mb-8 mt-16">
          {currentTrack.thumb ? (
            <img
              src={currentTrack.thumb}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
        </div>

        {/* Visualizer */}
        <div className="w-full h-16 mb-6 opacity-80">
          <Visualizer barCount={48} />
        </div>

        {/* Track info */}
        <div className="w-full text-center mb-6">
          <h2 className="text-xl font-bold truncate">{currentTrack.title}</h2>
          <p className="text-sm text-muted-foreground truncate mt-1">{currentTrack.artist}</p>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-3 w-full mb-6">
          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
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
          <span className="text-xs text-muted-foreground tabular-nums w-9">
            {durationStr}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLoop}
            className={cn(loop && 'text-primary')}
            aria-label="Toggle repeat"
          >
            <Repeat className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={playPrev} aria-label="Previous">
            <SkipBack className="w-6 h-6 fill-current" />
          </Button>
          <Button
            variant="default"
            className="w-16 h-16 rounded-full"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} aria-label="Next">
            <SkipForward className="w-6 h-6 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVolume(volume > 0 ? 0 : 80)}
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
          <Slider
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.currentTarget.value))}
            className="flex-1"
            aria-label="Volume"
          />
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </motion.div>
  )
}
