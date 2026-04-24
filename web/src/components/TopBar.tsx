import { Link } from 'react-router-dom';
import { TelegramLogin } from './TelegramLogin';
import { cn } from '@/lib/cn';

interface TopBarProps {
  className?: string;
}

// Thin header — wordmark on the left, Telegram login in the corner. The
// browser already owns back/forward navigation; we don't duplicate it.
export function TopBar({ className }: TopBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center justify-between gap-3',
        'glass border-b border-border',
        'h-12 px-4 sm:px-6',
        className,
      )}
    >
      {/* Compact wordmark visible on mobile — on desktop the sidebar
       * already shows the brand. */}
      <Link
        to="/"
        className="lg:hidden inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight"
      >
        <span
          aria-hidden
          className="inline-block size-[14px] rounded-[4px] bg-accent"
        />
        БРАТАН
      </Link>
      <span className="hidden lg:inline-block" aria-hidden />

      <TelegramLogin placement="topbar" />
    </div>
  );
}
