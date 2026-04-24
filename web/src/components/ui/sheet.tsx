import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

// Side/bottom Sheet primitive. Uses framer-motion for animation and a
// simple focus trap + Escape handling for a11y. Not full Radix, but covers
// the surfaces we need (Queue panel, Equalizer panel, mobile drawers).

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'right' | 'bottom';
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

export function Sheet({ open, onOpenChange, side = 'right', children, className, labelledBy }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    // focus first focusable inside
    const focus = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focus?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onOpenChange]);

  const fromAxis = side === 'right' ? 'x' : 'y';
  const initial = side === 'right' ? { x: '100%' } : { y: '100%' };
  const animate = side === 'right' ? { x: 0 } : { y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal
            aria-labelledby={labelledBy}
            initial={initial}
            animate={animate}
            exit={initial}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            key={fromAxis}
            className={cn(
              'relative ml-auto h-full w-full bg-popover text-popover-foreground shadow-float',
              side === 'right' && 'max-w-md border-l border-border',
              side === 'bottom' && 'max-h-[85vh] w-full mt-auto rounded-t-2xl border-t border-border',
              className,
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
