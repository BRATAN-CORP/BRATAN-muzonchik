import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/store/auth';
import { Cover } from './Cover';
import { cn } from '@/lib/cn';

// Inline widget shown in the sidebar / topbar. Handles the deep-link
// handshake end-to-end and surfaces pending + error states without
// dropping into a modal dialog.
export function TelegramLogin({ compact = false }: { compact?: boolean }) {
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
      <div className={cn('flex items-center gap-3', compact ? 'w-full' : 'w-full')}>
        <Cover
          src={user.photo_url ?? undefined}
          title={label}
          rounded="full"
          className="size-8 shrink-0"
          alt={label}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-foreground">{label}</div>
          {user.username && (
            <div className="truncate text-[11px] text-muted-foreground">@{user.username}</div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} aria-label="Выйти">
          Выйти
        </Button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex flex-col gap-2 hairline rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="soft-spin inline-block size-3 rounded-full border-2 border-border border-t-foreground" aria-hidden />
          <span className="text-foreground">Ждём подтверждение в Telegram…</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Нажми <b>Start</b> в открывшемся чате с ботом.
        </div>
        <Button variant="ghost" size="sm" onClick={cancel}>
          Отмена
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="accent" size="md" onClick={startLogin}>
        <Send size={14} />
        Войти через Telegram
      </Button>
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
