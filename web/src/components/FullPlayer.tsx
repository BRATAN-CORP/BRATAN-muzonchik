import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ListMusic,
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
} from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Sheet } from './ui/sheet';
import { CoverGlow } from './CoverGlow';
import { SoundVisualizer } from './SoundVisualizer';
import { EqualizerPanel } from './EqualizerPanel';
import { QueuePanel } from './QueuePanel';
import { usePlayer } from '@/store/player';
import { cn } from '@/lib/cn';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Fullscreen player — strict dark surface, glass cover tile, WebGL
// visualizer strip. No radial cover glow, no backdrop pulse. Escape
// closes; subpanels take priority.
export function FullPlayer() {
  const fullOpen = usePlayer((s) => s.fullOpen);
  const closeFull = usePlayer((s) => s.closeFull);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const eqOpen = usePlayer((s) => s.eqOpen);
  const queueOpen = usePlayer((s) => s.queueOpen);

  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const seekTo = usePlayer((s) => s.seekTo);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const setVolume = usePlayer((s) => s.setVolume);
  const setEqOpen = usePlayer((s) => s.setEqOpen);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);
  const toggleEq = usePlayer((s) => s.toggleEq);
  const toggleQueue = usePlayer((s) => s.toggleQueue);

  useEffect(() => {
    if (!fullOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !eqOpen && !queueOpen) closeFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullOpen, eqOpen, queueOpen, closeFull]);

  return (
    <AnimatePresence>
      {fullOpen && current && (
        <motion.div
          key="full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-40 bg-background text-foreground"
          role="dialog"
          aria-modal="true"
          aria-label="Полноэкранный плеер"
        >
          {/* Top bar — minimal, matches app TopBar height */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-8 h-12 border-b border-border">
            <Button variant="ghost" size="icon-sm" aria-label="Свернуть плеер" onClick={closeFull}>
              <ChevronDown size={16} strokeWidth={1.5} />
            </Button>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Сейчас играет
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={eqOpen}
                aria-label="Эквалайзер"
                onClick={toggleEq}
                className={eqOpen ? 'text-accent' : ''}
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={queueOpen}
                aria-label="Очередь"
                onClick={toggleQueue}
                className={queueOpen ? 'text-accent' : ''}
              >
                <ListMusic size={14} strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="mx-auto max-w-[820px] px-5 sm:px-8 pb-8 pt-6 flex flex-col items-center gap-6 h-[calc(100%-48px)] overflow-y-auto">
            <CoverGlow
              src={current.thumb}
              title={current.title}
              artist={current.artist}
              className="w-full"
            />

            <div className="w-full text-center">
              <h1 className="text-[22px] sm:text-[28px] leading-tight font-semibold tracking-[-0.02em] text-balance">
                {current.title}
              </h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {current.artistId ? (
                  <Link
                    to={`/artist/td/${encodeURIComponent(current.artistId)}`}
                    className="hover:text-foreground hover:underline"
                    onClick={closeFull}
                  >
                    {current.artist}
                  </Link>
                ) : (
                  current.artist
                )}
                {current.album && current.albumId && (
                  <>
                    <span className="mx-1.5">·</span>
                    <Link
                      to={`/album/td/${encodeURIComponent(current.albumId)}`}
                      className="hover:text-foreground hover:underline"
                      onClick={closeFull}
                    >
                      {current.album}
                    </Link>
                  </>
                )}
              </p>
            </div>

            {/* Visualizer — strict glass frame */}
            <div className="w-full glass-shell">
              <div className="glass-inner h-20 sm:h-24 overflow-hidden">
                <SoundVisualizer active={isPlaying} />
              </div>
            </div>

            {/* Progress */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right">
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
              <span className="text-[11px] tabular-nums text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={shuffle}
                onClick={toggleShuffle}
                aria-label={shuffle ? 'Выключить shuffle' : 'Включить shuffle'}
                className={shuffle ? 'text-accent' : ''}
              >
                <Shuffle size={14} strokeWidth={1.5} />
              </Button>
              <Button variant="ghost" size="icon-lg" aria-label="Предыдущий" onClick={prev}>
                <SkipBack size={20} fill="currentColor" strokeWidth={1.5} />
              </Button>
              <Button
                variant="default"
                size="icon-xl"
                aria-label={isPlaying ? 'Пауза' : 'Играть'}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause size={24} fill="currentColor" strokeWidth={1.5} />
                ) : (
                  <Play size={24} fill="currentColor" strokeWidth={1.5} />
                )}
              </Button>
              <Button variant="ghost" size="icon-lg" aria-label="Следующий" onClick={next}>
                <SkipForward size={20} fill="currentColor" strokeWidth={1.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Режим повтора"
                aria-pressed={repeat !== 'off'}
                onClick={cycleRepeat}
                className={repeat !== 'off' ? 'text-accent' : ''}
              >
                {repeat === 'one' ? (
                  <Repeat1 size={14} strokeWidth={1.5} />
                ) : (
                  <Repeat size={14} strokeWidth={1.5} />
                )}
              </Button>
            </div>

            {/* Volume (desktop) */}
            <div className="hidden md:flex w-full max-w-sm items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                onClick={toggleMute}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={14} strokeWidth={1.5} />
                ) : (
                  <Volume2 size={14} strokeWidth={1.5} />
                )}
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
          </div>

          {/* Side sheets */}
          <Sheet open={eqOpen} onOpenChange={setEqOpen} side="right" labelledBy="eq-title">
            <div className={cn('flex flex-col h-full')}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 id="eq-title" className="text-[14px] font-semibold tracking-tight">
                  Эквалайзер
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Закрыть эквалайзер"
                  onClick={() => setEqOpen(false)}
                >
                  <ChevronDown size={14} strokeWidth={1.5} />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <EqualizerPanel />
              </div>
            </div>
          </Sheet>

          <Sheet open={queueOpen} onOpenChange={setQueueOpen} side="right" labelledBy="queue-title">
            <div className={cn('flex flex-col h-full')}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 id="queue-title" className="text-[14px] font-semibold tracking-tight">
                  Очередь
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Закрыть очередь"
                  onClick={() => setQueueOpen(false)}
                >
                  <ChevronDown size={14} strokeWidth={1.5} />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <QueuePanel />
              </div>
            </div>
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
