import { useEffect, useState } from 'react';
import { TrackRow } from '@/components/TrackRow';
import type { Track } from '@/lib/types';

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

export function LibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => setTracks(readLibrary()), []);

  return (
    <div className="px-5 md:px-10 pt-8 pb-24 max-w-[1200px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Библиотека</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Сохранённые треки. Синхронизация с Telegram подключится в следующем релизе.
      </p>
      <div className="mt-6 flex flex-col gap-0.5">
        {tracks.length === 0 ? (
          <div className="hairline rounded-xl p-10 text-center text-sm text-fg-muted">
            Здесь пока пусто. Добавь треки из поиска.
          </div>
        ) : (
          tracks.map((t, i) => (
            <TrackRow key={`${t.source}-${t.id}`} track={t} index={i} queue={tracks} />
          ))
        )}
      </div>
    </div>
  );
}
