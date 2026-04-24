import { useEffect, useState } from 'react';
import type { Track } from '@/lib/types';
import { TrackList } from '@/components/TrackList';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Section } from '@/components/Section';
import { PaywallBanner } from '@/components/PaywallBanner';
import { useAuth } from '@/store/auth';

const LS_KEY = 'bratan.library.v1';

function readLibrary(): Track[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Track[]) : [];
  } catch {
    return [];
  }
}

// Library: local saved tracks + subscription status. Telegram login now
// lives in the TopBar corner — we don't duplicate it here.
export function LibraryPage() {
  const [tracks] = useState<Track[]>(() => readLibrary());
  const user = useAuth((s) => s.user);
  const sub = useAuth((s) => s.subscription);
  const refreshSubscription = useAuth((s) => s.refreshSubscription);

  useEffect(() => {
    if (user) void refreshSubscription();
  }, [user, refreshSubscription]);

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const subActive = !!(sub && !sub.admin && sub.subscribed && sub.until * 1000 > nowMs);
  const subUntil = sub?.until ? new Date(sub.until * 1000) : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Библиотека"
        title="Твоя музыка"
        description="Сохранённые треки и подписка."
      />

      {user && (sub?.admin || subActive) && (
        <div className="glass-shell">
          <div className="glass-inner p-4 flex items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="size-[6px] rounded-full bg-accent" aria-hidden />
              <span className="text-foreground">
                {sub?.admin ? 'Админ-безлимит активен' : 'Подписка активна'}
              </span>
            </div>
            {!sub?.admin && subActive && subUntil && (
              <span className="text-muted-foreground">
                до {subUntil.toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>
        </div>
      )}

      <PaywallBanner />

      <Section
        title="Сохранённые треки"
        subtitle="Здесь появятся треки, которые ты добавишь на странице поиска."
      >
        {tracks.length === 0 ? (
          <EmptyState
            title="Пока пусто"
            description="Добавь треки из поиска или альбома — они появятся здесь."
          />
        ) : (
          <TrackList tracks={tracks} numbered showAlbum />
        )}
      </Section>
    </div>
  );
}
