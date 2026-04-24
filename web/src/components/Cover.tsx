import { useEffect, useState } from 'react';
import { FallbackCover } from './FallbackCover';
import { cn } from '@/lib/cn';
import { safeHttpUrl } from '@/lib/safe-url';

type Rounded = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface CoverProps {
  src?: string;
  title?: string;
  artist?: string;
  className?: string;
  rounded?: Rounded;
  alt?: string;
}

// Wraps an <img> with automatic fallback to the monochrome plate whenever
// the source is missing, loading, or errored out. External URLs are run
// through the safeHttpUrl guard before hitting the DOM so we don't embed
// hostile schemes into the page.
export function Cover({ src, title, artist, className, rounded = 'md', alt }: CoverProps) {
  const safe = safeHttpUrl(src);
  const [status, setStatus] = useState<'idle' | 'loaded' | 'error'>(safe ? 'idle' : 'error');

  // Reset load state whenever the underlying URL changes — the <img> tag
  // receives a new `src` and must re-report its load/error.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setStatus(safe ? 'idle' : 'error'), [safe]);

  if (!safe || status === 'error') {
    return <FallbackCover title={title} artist={artist} className={className} rounded={rounded} />;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        rounded === 'sm' && 'rounded-sm',
        rounded === 'md' && 'rounded-md',
        rounded === 'lg' && 'rounded-lg',
        rounded === 'xl' && 'rounded-xl',
        rounded === 'full' && 'rounded-full',
        className,
      )}
    >
      <img
        src={safe}
        alt={alt ?? title ?? ''}
        crossOrigin="anonymous"
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
        draggable={false}
      />
      {status !== 'loaded' && (
        <div className="absolute inset-0">
          <FallbackCover title={title} artist={artist} rounded={rounded} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
