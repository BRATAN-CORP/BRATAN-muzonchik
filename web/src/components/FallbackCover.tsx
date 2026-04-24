import { useMemo } from 'react';
import { cn } from '@/lib/cn';

interface FallbackCoverProps {
  title?: string;
  artist?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Monochrome placeholder used whenever a cover URL is missing / failed.
// Matches the card surface so it reads as "nothing here" instead of a
// broken state, and stays fully theme-safe.
export function FallbackCover({ title, artist, className, rounded = 'md' }: FallbackCoverProps) {
  const initials = useMemo(() => extractInitials(title, artist), [title, artist]);
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        'bg-muted text-muted-foreground border border-border',
        rounded === 'sm' && 'rounded-sm',
        rounded === 'md' && 'rounded-md',
        rounded === 'lg' && 'rounded-lg',
        rounded === 'xl' && 'rounded-xl',
        rounded === 'full' && 'rounded-full',
        className,
      )}
      aria-hidden={!title && !artist}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(closest-side at 30% 25%, var(--foreground) 0%, transparent 70%), radial-gradient(closest-side at 75% 70%, var(--foreground) 0%, transparent 70%)',
        }}
      />
      <span className="relative z-10 font-semibold tracking-tight select-none text-[0.9em]">
        {initials}
      </span>
    </div>
  );
}

function extractInitials(title?: string, artist?: string): string {
  const src = (title?.trim() || artist?.trim() || '').split(/\s+/).filter(Boolean);
  const first = (src[0]?.[0] ?? '').toUpperCase();
  const second = (src[1]?.[0] ?? '').toUpperCase();
  const joined = first + second;
  return joined || '';
}
