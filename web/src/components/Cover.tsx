import { useEffect, useState } from 'react';
import { FallbackCover } from './FallbackCover';
import { cn } from '@/lib/cn';

interface CoverProps {
  src?: string;
  title?: string;
  artist?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  alt?: string;
}

// Wraps an <img> with automatic fallback to the monochrome plate whenever
// the source is missing, still loading, or errored out. Callers never have
// to think about idle/error states.
export function Cover({ src, title, artist, className, rounded = 'md', alt }: CoverProps) {
  const [status, setStatus] = useState<'idle' | 'loaded' | 'error'>(src ? 'idle' : 'error');

  useEffect(() => {
    setStatus(src ? 'idle' : 'error');
  }, [src]);

  if (!src || status === 'error') {
    return <FallbackCover title={title} artist={artist} className={className} rounded={rounded} />;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-bg-overlay',
        rounded === 'sm' && 'rounded-sm',
        rounded === 'md' && 'rounded-md',
        rounded === 'lg' && 'rounded-lg',
        rounded === 'xl' && 'rounded-xl',
        rounded === 'full' && 'rounded-full',
        className
      )}
    >
      <img
        src={src}
        alt={alt ?? title ?? ''}
        crossOrigin="anonymous"
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
      />
      {status !== 'loaded' && (
        <div className="absolute inset-0">
          <FallbackCover title={title} artist={artist} rounded={rounded} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
