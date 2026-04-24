import { useEffect, useState } from 'react';
import { Cover } from './Cover';
import { extractPalette } from '@/lib/palette';
import { safeHttpUrl } from '@/lib/safe-url';
import { cn } from '@/lib/cn';

interface CoverGlowProps {
  src?: string;
  title?: string;
  artist?: string;
  className?: string;
  pulse?: boolean;
}

// Giant centered cover with dominant-color glow. The pulsing is driven by
// a slow CSS animation and automatically disabled for reduced-motion
// users.
export function CoverGlow({ src, title, artist, className, pulse = true }: CoverGlowProps) {
  const safe = safeHttpUrl(src);
  const [palette, setPalette] = useState<string[] | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    if (!safe) {
      setPalette(null);
      return () => {
        active = false;
      };
    }
    extractPalette(safe, 3)
      .then((p) => {
        if (active) setPalette(p);
      })
      .catch(() => {
        if (active) setPalette(null);
      });
    return () => {
      active = false;
    };
  }, [safe]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [c1, c2, c3] =
    palette && palette.length > 0
      ? [palette[0], palette[1] ?? palette[0], palette[2] ?? palette[1] ?? palette[0]]
      : ['var(--accent)', 'var(--accent)', 'var(--accent)'];

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-[48px] blur-[80px] opacity-70 will-change-transform',
          pulse && 'animate-[coverglow_4.8s_ease-in-out_infinite]',
        )}
        style={{
          background: `radial-gradient(closest-side at 30% 30%, ${c1}, transparent 70%),
                       radial-gradient(closest-side at 75% 70%, ${c2}, transparent 70%),
                       radial-gradient(closest-side at 50% 60%, ${c3}, transparent 60%)`,
          transform: 'translateZ(0)',
        }}
      />
      <div className="relative aspect-square w-full max-w-[min(72vh,520px)]">
        <Cover
          src={safe}
          title={title}
          artist={artist}
          rounded="xl"
          className="size-full shadow-float"
        />
      </div>
    </div>
  );
}
