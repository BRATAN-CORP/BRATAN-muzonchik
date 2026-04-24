import { Link } from 'react-router-dom';
import { Cover } from './Cover';
import { Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MediaCardProps {
  to: string;
  title: string;
  subtitle?: string;
  thumb?: string;
  rounded?: 'md' | 'lg' | 'full';
  onPlay?: () => void;
  playAriaLabel?: string;
  children?: ReactNode;
}

// Generic grid tile used for albums, playlists and artists. The play CTA
// fades in on hover/focus and triggers an explicit play callback if the
// caller passes one — navigating into the card is the click target
// everywhere else.
export function MediaCard({
  to,
  title,
  subtitle,
  thumb,
  rounded = 'md',
  onPlay,
  playAriaLabel,
  children,
}: MediaCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl p-3 transition-colors',
        'hover:bg-secondary focus-visible:bg-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="relative aspect-square w-full">
        <Cover
          src={thumb}
          title={title}
          artist={subtitle}
          rounded={rounded}
          className="size-full shadow-soft group-hover:shadow-float transition-shadow"
        />
        {onPlay && (
          <button
            type="button"
            aria-label={playAriaLabel ?? `Включить ${title}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            className={cn(
              'absolute right-2 bottom-2 inline-flex size-11 items-center justify-center rounded-full',
              'bg-accent text-accent-foreground shadow-float',
              'translate-y-1 opacity-0 transition-all duration-200',
              'group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100',
              'hover:bg-accent/90',
            )}
          >
            <Play size={18} fill="currentColor" />
          </button>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
        {children}
      </div>
    </Link>
  );
}
