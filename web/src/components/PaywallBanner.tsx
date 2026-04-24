import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { TG_BOT_USERNAME, SUB_PRICE_STARS, SUB_PERIOD_DAYS } from '@/lib/constants';
import { cn } from '@/lib/cn';

// CTA card. Playback gating lives in the worker — this banner just
// surfaces the Telegram Stars invoice and hides itself when an active
// subscription is detected client-side.
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
    <aside
      aria-label="Подписка"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6',
        'shadow-soft',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full opacity-25"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 85%, transparent), transparent 70%)',
        }}
      />
      <div className="relative flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Подписка
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight">
            Безлимит за {SUB_PRICE_STARS} ⭐ / {SUB_PERIOD_DAYS} дней
          </h3>
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            Оплата через Telegram Stars — без карт, без привязок, один тап в Telegram.
            {!user && ' Чтобы подписка привязалась к аккаунту, сначала войди через Telegram.'}
          </p>
        </div>
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'shrink-0 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-medium',
            'bg-accent text-accent-foreground hover:bg-accent/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          Оформить <ExternalLink size={14} />
        </a>
      </div>
    </aside>
  );
}
