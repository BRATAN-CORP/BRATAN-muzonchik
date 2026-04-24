import { Cover } from './Cover';
import { safeHttpUrl } from '@/lib/safe-url';
import { cn } from '@/lib/cn';

interface CoverGlowProps {
  src?: string;
  title?: string;
  artist?: string;
  className?: string;
  pulse?: boolean;
}

// Centered cover art for the fullscreen player. The name is kept for
// backward compatibility — per DESIGN.md the surface is glass/hairline,
// not a pulsing halo. No radial glows, no aurora.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CoverGlow({ src, title, artist, className, pulse: _pulse }: CoverGlowProps) {
  const safe = safeHttpUrl(src);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div className="glass-shell">
        <div className="glass-inner p-0 overflow-hidden">
          <div className="aspect-square w-full max-w-[min(68vh,480px)]">
            <Cover
              src={safe}
              title={title}
              artist={artist}
              rounded="lg"
              className="size-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
