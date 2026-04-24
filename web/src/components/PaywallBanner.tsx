import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { TG_BOT_USERNAME, SUB_PRICE_STARS, SUB_PERIOD_DAYS } from '@/lib/constants';
import { cn } from '@/lib/cn';

// Strict glass CTA — no radial glow. Hidden once an active subscription
// or admin flag is detected client-side. Playback gating happens server-
// side in the worker; this is just the marketing surface.
export function PaywallBanner({ className }: { className?: string }) {
  const user = useAuth((s) => s.user);
  const sub = useAuth((s) => s.subscription);

  if (sub?.admin) return null;
  // eslint-disable-next-line react-hooks/purity
  if (sub?.subscribed && sub.until * 1000 > Date.now()) return null;

  const payUrl = user
    ? `https://t.me/${TG_BOT_USERNAME}?start=pay_${encodeURIComponent(String(user.id))}`
    : `https://t.me/${TG_BOT_USERNAME}?start=pay`;

  return (
    <aside aria-label="Подписка" className={cn('glass-shell', className)}>
      <div className="glass-inner p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Подписка
          </div>
          <h3 className="mt-1 text-[18px] leading-6 font-semibold tracking-tight">
            Безлимит за {SUB_PRICE_STARS} ⭐ / {SUB_PERIOD_DAYS} дней
          </h3>
          <p className="mt-1 max-w-prose text-[12px] leading-4 text-muted-foreground">
            Оплата через Telegram Stars — без карт, в один тап.
            {!user && ' Чтобы подписка привязалась к аккаунту, сначала войди через Telegram.'}
          </p>
        </div>
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] text-[12px] font-medium shrink-0',
            'bg-accent text-accent-foreground border border-[rgba(255,255,255,0.1)]',
            'hover:bg-[color:color-mix(in_oklab,var(--accent)_88%,white_12%)]',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          )}
        >
          Оформить
          <ExternalLink size={12} strokeWidth={1.5} />
        </a>
      </div>
    </aside>
  );
}
