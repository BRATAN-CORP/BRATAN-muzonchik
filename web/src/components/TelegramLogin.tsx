import { Send } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Cover } from './Cover';
import { cn } from '@/lib/cn';

type Placement = 'inline' | 'topbar';

// Compact Telegram login widget. Lives in the top-right corner by default
// (placement="topbar") and collapses to avatar + "Выйти" once the user
// signs in. Handles the deep-link handshake; no modal.
export function TelegramLogin({ placement = 'topbar' }: { placement?: Placement }) {
  const user = useAuth((s) => s.user);
  const pending = useAuth((s) => s.pendingToken);
  const error = useAuth((s) => s.pollError);
  const startLogin = useAuth((s) => s.startLogin);
  const cancel = useAuth((s) => s.cancelLogin);
  const signOut = useAuth((s) => s.signOut);

  if (user) {
    const label =
      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      (user.username ? `@${user.username}` : `TG ${user.id}`);
    return (
      <div className={cn('flex items-center gap-2', placement === 'topbar' && 'max-w-[220px]')}>
        <Cover
          src={user.photo_url ?? undefined}
          title={label}
          rounded="full"
          className="size-7 shrink-0"
          alt={label}
        />
        <div className="min-w-0 hidden md:block">
          <div className="truncate text-[12px] leading-4 text-foreground">{label}</div>
          {user.username && (
            <div className="truncate text-[10px] leading-3 text-muted-foreground">@{user.username}</div>
          )}
        </div>
        <button
          type="button"
          onClick={signOut}
          aria-label="Выйти"
          className="h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-150"
        >
          Выйти
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="soft-spin inline-block size-3 rounded-full border-[1.5px] border-[rgba(255,255,255,0.2)] border-t-foreground"
          aria-hidden
        />
        <span className="hidden md:inline text-[11px] text-muted-foreground">Ждём Telegram…</span>
        <button
          type="button"
          onClick={cancel}
          className="h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-150"
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={startLogin}
        className={cn(
          'inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] font-medium',
          'bg-accent text-accent-foreground',
          'border border-[rgba(255,255,255,0.1)]',
          'hover:bg-[color:color-mix(in_oklab,var(--accent)_88%,white_12%)]',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        )}
        aria-label="Войти через Telegram"
      >
        <Send size={13} strokeWidth={1.5} />
        <span className="hidden sm:inline">Войти через Telegram</span>
        <span className="inline sm:hidden">Войти</span>
      </button>
      {error && <span className="hidden md:inline text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
