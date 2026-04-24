import { useEffect, useState } from 'react';
import type { Track } from '@/lib/types';
import { TrackList } from '@/components/TrackList';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Section } from '@/components/Section';
import { PaywallBanner } from '@/components/PaywallBanner';
import { TelegramLogin } from '@/components/TelegramLogin';
import { Card, CardContent } from '@/components/ui/card';
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

// Library is a hybrid surface: local saved tracks (localStorage) +
// Telegram auth + paywall. Keeping the TG login slot visible on this page
// is deliberate — most users come here when they want playlist sync.
export function LibraryPage() {
  const [tracks] = useState<Track[]>(() => readLibrary());
  const user = useAuth((s) => s.user);
  const sub = useAuth((s) => s.subscription);
  const refreshSubscription = useAuth((s) => s.refreshSubscription);

  useEffect(() => {
    if (user) void refreshSubscription();
  }, [user, refreshSubscription]);

  // `Date.now()` is impure, so we derive once at render. Any re-render
  // refreshes it — which is fine, this page re-renders rarely.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const subActive = !!(sub && !sub.admin && sub.subscribed && sub.until * 1000 > nowMs);
  const subUntil = sub?.until ? new Date(sub.until * 1000) : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Библиотека"
        title="Твоя музыка"
        description="Сохранённые треки, аккаунт и подписка. Всё в одном месте."
      />

      <Section title="Аккаунт">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <TelegramLogin />
            {user && sub?.admin && (
              <div className="text-[11px] text-accent">Админ-безлимит активен.</div>
            )}
            {user && subActive && subUntil && (
              <div className="text-[11px] text-muted-foreground">
                Подписка активна до{' '}
                <span className="text-foreground">
                  {subUntil.toLocaleDateString('ru-RU')}
                </span>
                .
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <PaywallBanner />

      <Section title="Сохранённые треки" subtitle="Здесь появятся треки, которые ты добавишь на странице поиска.">
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
