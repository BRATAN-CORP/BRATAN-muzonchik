import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Library, Search, Sliders, Waves } from 'lucide-react';
import { PaywallBanner } from '@/components/PaywallBanner';
import { Section } from '@/components/Section';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

// Landing page — minimalist hero, one accent touch, a short value
// prop grid and the paywall CTA (hidden once the user has an active
// subscription).
export function LandingPage() {
  const prefersReduced = useReducedMotion();
  const fade = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
      };

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <motion.section {...fade} className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Минимализм в музыке
          </div>
          <h1 className="mt-5 text-[34px] leading-[1.05] sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
            Музыка без шума.<br />
            Только то, что важно<span className="brand-dot" aria-hidden />
          </h1>
          <p className="mt-5 max-w-lg text-[15px] sm:text-base text-muted-foreground">
            Плеер с единой графитовой палитрой, живыми анимациями и честным поиском
            по Tidal и SoundCloud. Один акцент, один шрифт, один дизайн-язык.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/search"
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[15px] font-medium text-primary-foreground',
                'hover:opacity-90 transition-opacity',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              <Search size={16} /> Найти трек
            </Link>
            <Link
              to="/library"
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-md border border-border bg-transparent px-6 text-[15px] font-medium',
                'hover:bg-secondary transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              <Library size={16} /> Библиотека
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>Tidal · SoundCloud</span>
            <span>10-полосный EQ</span>
            <span>Визуализатор звука</span>
            <span>Полный экран</span>
          </div>
        </div>

        <motion.div
          {...fade}
          transition={{ ...(fade.transition ?? {}), delay: prefersReduced ? 0 : 0.08 }}
          className="relative aspect-square w-full max-w-[440px] mx-auto"
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-[32px] blur-3xl opacity-60"
            style={{
              background:
                'radial-gradient(closest-side at 30% 30%, var(--accent), transparent 70%), radial-gradient(closest-side at 70% 70%, color-mix(in oklab, var(--accent) 50%, var(--foreground)), transparent 65%)',
            }}
          />
          <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-border bg-card shadow-float">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(140deg, color-mix(in oklab, var(--accent) 24%, var(--card)) 0%, var(--card) 55%)',
              }}
            />
            <div className="relative h-full w-full flex items-end p-6 sm:p-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Сейчас играет
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">
                  БРАТАН · музончик
                </div>
                <div className="text-sm text-muted-foreground">
                  Монохромная обложка · графитовая шкала
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      <PaywallBanner />

      <Section title="Зачем ещё один плеер" subtitle="Сфокусировано на звуке, а не на визуальном шуме.">
        <div className="grid sm:grid-cols-3 gap-3">
          <Feature
            icon={<Waves size={16} />}
            title="Настоящий звук"
            desc="10-полосный Web Audio эквалайзер с пресетами и сохранением своих настроек."
          />
          <Feature
            icon={<Sliders size={16} />}
            title="Один дизайн-язык"
            desc="Графитовая палитра и один акцент на всех поверхностях — ни одного случайного цвета."
          />
          <Feature
            icon={<Search size={16} />}
            title="Чистый поиск"
            desc="Tidal и SoundCloud в одном интерфейсе, без рекламы и баннеров."
          />
        </div>
      </Section>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2">
        <div className="inline-flex size-8 items-center justify-center rounded-md border border-border text-foreground">
          {icon}
        </div>
        <CardTitle className="mt-1 text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}
