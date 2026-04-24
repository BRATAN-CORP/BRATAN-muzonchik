import { useEffect, useRef } from 'react';
import { getAnalyser, isGraphReady } from '@/lib/audio-graph';
import { cn } from '@/lib/cn';

interface SoundVisualizerProps {
  active?: boolean;
  className?: string;
  bars?: number;
  accent?: string;
}

// Canvas-based bar visualizer driven by the AnalyserNode. Falls back to a
// calm idle animation when the audio graph isn't ready yet or when the
// user prefers reduced motion.
export function SoundVisualizer({ active = true, className, bars = 48, accent }: SoundVisualizerProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const w = canvas.clientWidth | 0;
      const h = canvas.clientHeight | 0;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const data = new Uint8Array(256);
    let raf = 0;
    const start = performance.now();

    const read = (): number => {
      const a = getAnalyser();
      if (active && a && isGraphReady()) {
        const size = Math.min(data.length, a.frequencyBinCount);
        // Reuse the existing ArrayBuffer to avoid per-frame allocs.
        const view = new Uint8Array(data.buffer, 0, size);
        a.getByteFrequencyData(view);
        return size;
      }
      const t = (performance.now() - start) / 1000;
      for (let i = 0; i < data.length; i++) {
        const norm = i / data.length;
        const v =
          40 +
          35 * Math.sin(t * 1.7 + norm * Math.PI * 2) +
          18 * Math.sin(t * 0.7 + norm * 6);
        data[i] = Math.max(0, Math.min(255, v));
      }
      return data.length;
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const size = read();
      const barWidth = w / bars;
      const gap = Math.max(2, barWidth * 0.25);
      const color =
        accent ??
        (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
          '#7c5cff');
      for (let i = 0; i < bars; i++) {
        const s = Math.floor((i / bars) * (size * 0.72));
        const v = data[s] / 255;
        const barH = Math.max(4 * dpr, v * h * 0.9);
        const x = i * barWidth + gap / 2;
        const y = (h - barH) / 2;
        const radius = Math.min(barWidth - gap, barH) / 2;
        drawBar(ctx, x, y, barWidth - gap, barH, radius, color, v);
      }
      if (!prefersReduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, bars, accent]);

  return <canvas ref={ref} aria-hidden className={cn('w-full h-full block', className)} />;
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  alpha: number,
) {
  ctx.beginPath();
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.25 + alpha * 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
}
