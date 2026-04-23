import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '@/store/player';
import { extractPalette } from '@/lib/palette';
import { getAnalyser } from '@/lib/audio-graph';
import { Cover } from './Cover';
import { Button } from './ui/Button';
import {
  IconChevronDown,
  IconMore,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
  IconSlider,
} from './icons';

// Fullscreen player. Single centered column, monochrome surface, pulsing
// monochrome halo behind the artwork that tracks bass from the AnalyserNode.
// No colorful gradients — the halo just fades fg-base in and out by volume.
export function FullPlayer() {
  const open = usePlayer((s) => s.fullOpen);
  const close = usePlayer((s) => s.closeFull);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const toggleLoop = usePlayer((s) => s.toggleLoop);
  const shuffle = usePlayer((s) => s.shuffle);
  const loop = usePlayer((s) => s.loop);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);

  const haloRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [palette, setPalette] = useState<string[] | null>(null);

  // Palette extraction — feeds the halo so it subtly reflects the cover art
  // without introducing rainbow gradients. We only use a single dominant
  // color at ~18% opacity so it always reads monochrome with a tint.
  useEffect(() => {
    if (!current?.thumb) {
      setPalette(null);
      return;
    }
    let cancelled = false;
    extractPalette(current.thumb, 1).then((p) => {
      if (!cancelled) setPalette(p);
    });
    return () => {
      cancelled = true;
    };
  }, [current?.thumb]);

  // Beat-sync the halo
  useEffect(() => {
    if (!open) return;
    const halo = haloRef.current;
    if (!halo) return;
    let smoothed = 0;
    const tick = () => {
      const analyser = getAnalyser();
      let low = 0;
      if (analyser && isPlaying) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        let s = 0;
        const n = Math.min(8, data.length);
        for (let i = 1; i < n; i++) s += data[i];
        low = n ? s / (n - 1) / 255 : 0;
      } else {
        low = isPlaying ? 0.28 + Math.sin(performance.now() / 550) * 0.12 : 0.18;
      }
      smoothed = smoothed * 0.75 + low * 0.25;
      halo.style.setProperty('--halo-scale', (1 + smoothed * 0.35).toFixed(3));
      halo.style.setProperty('--halo-opacity', (0.6 + smoothed * 0.35).toFixed(3));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, isPlaying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const haloColor = palette?.[0] ?? 'var(--fg)';
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.section
          key="full"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed inset-0 z-40 flex flex-col bg-bg-base text-fg-base isolate"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            minHeight: '100svh',
          }}
          aria-modal
          role="dialog"
          aria-labelledby="full-title"
        >
          {/* Monochrome halo */}
          <div
            ref={haloRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[38%] -z-10 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(closest-side, ${haloColor} 0%, transparent 70%)`,
              opacity: 'var(--halo-opacity, 0.65)',
              transform: 'translate(-50%, -50%) scale(var(--halo-scale, 1))',
              transition: 'transform 120ms linear, opacity 120ms linear, background 600ms ease',
              mixBlendMode: 'screen',
            }}
          />

          {/* Header */}
          <header className="flex items-center justify-between px-5 pt-4">
            <Button variant="icon" size="md" onClick={close} aria-label="Свернуть">
              <IconChevronDown size={22} />
            </Button>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Сейчас играет</div>
              <div className="text-xs text-fg-muted">{current.artist}</div>
            </div>
            <Button variant="icon" size="md" aria-label="Ещё">
              <IconMore size={22} />
            </Button>
          </header>

          {/* Single centered column */}
          <main className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-6 mx-auto w-full max-w-[640px] overflow-y-auto">
            <div className="w-full max-w-[min(80vmin,440px)] aspect-square relative">
              <Cover
                src={current.thumb}
                title={current.title}
                artist={current.artist}
                rounded="xl"
                className="absolute inset-0 size-full shadow-float"
              />
            </div>

            <div className="text-center">
              <h1 id="full-title" className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-balance">
                {current.title}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">{current.artist}</p>
            </div>

            <div className="w-full flex items-center gap-3">
              <span className="text-xs tabular-nums text-fg-muted w-10 text-right">{fmt(position)}</span>
              <div className="h-1 flex-1 rounded-full bg-border-base overflow-hidden">
                <div className="h-full bg-fg-base transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs tabular-nums text-fg-muted w-10">{fmt(duration)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                size="md"
                onClick={toggleShuffle}
                className={shuffle ? 'text-[color:var(--accent)]' : undefined}
                aria-label="Перемешать"
              >
                <IconShuffle size={20} />
              </Button>
              <Button variant="icon" size="lg" onClick={prev} aria-label="Предыдущий">
                <IconPrev size={24} />
              </Button>
              <Button
                variant="primary"
                size="xl"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Пауза' : 'Играть'}
                className="rounded-full size-16"
              >
                {isPlaying ? <IconPause size={22} /> : <IconPlay size={22} />}
              </Button>
              <Button variant="icon" size="lg" onClick={next} aria-label="Следующий">
                <IconNext size={24} />
              </Button>
              <Button
                variant="icon"
                size="md"
                onClick={toggleLoop}
                className={loop ? 'text-[color:var(--accent)]' : undefined}
                aria-label="Повтор"
              >
                <IconRepeat size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-1 mt-2 text-fg-muted">
              <Button variant="icon" size="sm" aria-label="Эквалайзер" onClick={() => usePlayer.getState().toggleEq()}>
                <IconSlider size={18} />
              </Button>
            </div>
          </main>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
