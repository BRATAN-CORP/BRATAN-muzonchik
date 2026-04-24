import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Library, Search, Sliders, Waves } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PaywallBanner } from '@/components/PaywallBanner';
import { cn } from '@/lib/cn';

gsap.registerPlugin(ScrollTrigger);

// Landing page — strict full-bleed grid, glass hero tile, three feature
// tiles. No radial glows, no aurora. GSAP ScrollTrigger drives the
// feature reveal so the page has controlled motion.
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      gsap.from('[data-reveal="hero"]', {
        opacity: 0,
        y: 8,
        duration: prefersReduced ? 0 : 0.3,
        ease: 'power2.out',
        stagger: 0.05,
      });
      const tiles = gsap.utils.toArray<HTMLElement>('[data-reveal="tile"]');
      tiles.forEach((tile) => {
        gsap.from(tile, {
          opacity: 0,
          y: 10,
          duration: prefersReduced ? 0 : 0.3,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: tile,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-8">
      {/* Hero: strict full-bleed two-column grid */}
      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="glass-shell" data-reveal="hero">
          <div className="glass-inner p-6 sm:p-8 flex flex-col gap-4 h-full">
            <div
              className="inline-flex items-center gap-2 h-6 px-2 rounded-[4px] text-[10px] uppercase tracking-[0.16em] text-muted-foreground border border-[rgba(255,255,255,0.1)] w-fit"
            >
              <span className="size-[6px] rounded-[2px] bg-accent" aria-hidden />
              Минимализм в музыке
            </div>
            <h1 className="text-[30px] sm:text-[42px] lg:text-[52px] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
              Музыка без шума.<br />
              Только то, что важно.
            </h1>
            <p className="max-w-[48ch] text-[12px] leading-4 text-muted-foreground">
              Плеер со строгим дизайн-языком, 10-полосным Web Audio эквалайзером
              и WebGL визуализатором. Tidal · SoundCloud · YouTube в одном интерфейсе.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link
                to="/search"
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] text-[12px] font-medium',
                  'bg-accent text-accent-foreground border border-[rgba(255,255,255,0.1)]',
                  'hover:bg-[color:color-mix(in_oklab,var(--accent)_88%,white_12%)]',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                )}
              >
                <Search size={13} strokeWidth={1.5} /> Найти трек
              </Link>
              <Link
                to="/library"
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] text-[12px] font-medium',
                  'border border-[rgba(255,255,255,0.1)] text-foreground',
                  'hover:bg-[rgba(255,255,255,0.04)]',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                )}
              >
                <Library size={13} strokeWidth={1.5} /> Библиотека
              </Link>
            </div>
            <div className="mt-auto pt-2 grid grid-cols-4 gap-2 text-[10px] leading-4 text-muted-foreground uppercase tracking-[0.14em]">
              <div>Tidal</div>
              <div>SoundCloud</div>
              <div>YouTube</div>
              <div>10-band EQ</div>
            </div>
          </div>
        </div>

        {/* Right tile: wordmark / now-playing placeholder */}
        <div className="glass-shell" data-reveal="hero">
          <div className="glass-inner p-6 flex flex-col justify-between aspect-square lg:aspect-auto min-h-[280px]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Сейчас играет
            </div>
            <div>
              <div className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] leading-7">
                БРАТАН · музончик
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Строгий минимализм · чёрный фон · синий акцент
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-[6px] rounded-full bg-accent" aria-hidden />
              Live · GSAP + WebGL
            </div>
          </div>
        </div>
      </section>

      <PaywallBanner />

      {/* Feature grid — flat tiles, icons NOT nested in borders */}
      <section className="flex flex-col gap-3">
        <header className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Зачем ещё один плеер
            </div>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
              Сфокусировано на звуке
            </h2>
          </div>
        </header>
        <div className="grid sm:grid-cols-3 gap-3">
          <Tile
            icon={<Waves size={14} strokeWidth={1.5} />}
            title="Настоящий звук"
            desc="10-полосный Web Audio эквалайзер с пресетами и сохранением настроек."
          />
          <Tile
            icon={<Sliders size={14} strokeWidth={1.5} />}
            title="Один дизайн-язык"
            desc="Чёрный фон, синий акцент, стекло. Никаких случайных цветов и градиентов."
          />
          <Tile
            icon={<Search size={14} strokeWidth={1.5} />}
            title="Чистый поиск"
            desc="Tidal, SoundCloud и YouTube в одном интерфейсе, без рекламы и баннеров."
          />
        </div>
      </section>
    </div>
  );
}

function Tile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-shell" data-reveal="tile">
      <div className="glass-inner p-4 flex flex-col gap-2 h-full">
        <div className="inline-flex items-center gap-2 text-accent">
          {icon}
          <span className="text-[10px] uppercase tracking-[0.16em]">Feature</span>
        </div>
        <div className="text-[14px] font-semibold tracking-tight mt-1">{title}</div>
        <p className="text-[11px] leading-4 text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
