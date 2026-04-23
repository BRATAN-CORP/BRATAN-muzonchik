import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TiltedCard from '@/components/reactbits/TiltedCard';
import { IconLibrary, IconSearch } from '@/components/icons';

// The landing page leans on negative space + typography + the TiltedCard
// hero from react-bits. Exactly one accent touch (the brand dot).
export function LandingPage() {
  return (
    <div className="px-5 md:px-10 pt-8 pb-24">
      <section className="grid md:grid-cols-2 gap-10 items-center min-h-[68vh]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-xs text-fg-muted">
            <span className="size-1.5 rounded-full bg-[color:var(--accent)]" /> Минимализм в музыке
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-balance">
            Музыка без шума.
            <br />
            Только то, что важно<span className="brand-dot" />
          </h1>
          <p className="mt-5 text-base md:text-lg text-fg-muted max-w-lg">
            Плеер с единой графитовой палитрой, живыми анимациями и честным поиском —
            Tidal, SoundCloud, YouTube. Ни одного лишнего цвета.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/search/"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-fg-base px-6 text-[15px] font-medium text-bg-base transition-opacity hover:opacity-90"
            >
              <IconSearch size={16} /> Найти трек
            </Link>
            <Link
              to="/library"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-6 text-[15px] font-medium text-fg-base transition-colors hover:bg-bg-overlay"
            >
              <IconLibrary size={16} /> Библиотека
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-fg-subtle">
            <span>Tidal · SoundCloud · YouTube</span>
            <span>10-полосный EQ</span>
            <span>Полный экран</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="flex items-center justify-center"
        >
          <TiltedCard
            imageSrc={`${import.meta.env.BASE_URL}hero-card.svg`}
            altText="БРАТАН музончик"
            captionText="БРАТАН · музончик"
            containerHeight="min(60vmin, 420px)"
            containerWidth="min(60vmin, 420px)"
            imageHeight="min(60vmin, 420px)"
            imageWidth="min(60vmin, 420px)"
            rotateAmplitude={10}
            scaleOnHover={1.06}
            showMobileWarning={false}
            showTooltip={true}
            displayOverlayContent={false}
          />
        </motion.div>
      </section>

      <section className="mt-16 grid sm:grid-cols-3 gap-4">
        <Feature title="Один цвет" desc="Графитовая шкала и один акцент. Никаких радуг и ИИ-эстетики." />
        <Feature title="Настоящий EQ" desc="10 полос, пресеты, сохранение своих. Работает поверх любого источника." />
        <Feature title="Как в кино" desc="Полноэкранный плеер с монохромным свечением, что дышит в такт басу." />
      </section>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="hairline rounded-xl p-5 bg-bg-elevated">
      <div className="text-sm font-semibold text-fg-base">{title}</div>
      <p className="mt-2 text-sm text-fg-muted">{desc}</p>
    </div>
  );
}
