import { useEffect, useRef } from 'react';
import { usePlayer, takePendingSeek } from '@/store/player';
import { ensureGraph, setAllGains, setEqEnabled } from '@/lib/audio-graph';
import {
  gainsForPreset,
  readEqEnabled,
  readSelectedPreset,
} from '@/lib/eq-presets';
import {
  resolveSoundCloudStream,
  resolveTidalStream,
  resolveYouTubeStream,
} from '@/lib/api';

// Owns the single <audio> element and the Web Audio graph. Mounted once
// in the AppShell so playback survives route changes. No visual output —
// this is state wiring only.

export function AudioHost() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const repeat = usePlayer((s) => s.repeat);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const setTime = usePlayer((s) => s.setTime);
  const next = usePlayer((s) => s.next);

  // Seed the graph (and apply persisted EQ) on first user gesture. We
  // can't create an AudioContext before a gesture on iOS Safari without
  // it immediately suspending.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bootstrap = () => {
      if (!ensureGraph(el)) return;
      setAllGains(gainsForPreset(readSelectedPreset()));
      setEqEnabled(readEqEnabled());
      window.removeEventListener('pointerdown', bootstrap);
      window.removeEventListener('keydown', bootstrap);
    };
    window.addEventListener('pointerdown', bootstrap);
    window.addEventListener('keydown', bootstrap);
    return () => {
      window.removeEventListener('pointerdown', bootstrap);
      window.removeEventListener('keydown', bootstrap);
    };
  }, []);

  // Load the right stream URL whenever the current track changes.
  useEffect(() => {
    const el = ref.current;
    if (!el || !current) return;
    let cancelled = false;
    (async () => {
      try {
        let src = '';
        if (current.source === 'tidal') {
          src = await resolveTidalStream(current.id);
        } else if (current.source === 'soundcloud') {
          const tc = current.transcoding as { url?: string } | undefined;
          if (tc?.url) {
            src = await resolveSoundCloudStream(tc.url);
          }
        } else if (current.source === 'youtube') {
          src = await resolveYouTubeStream(current.id);
        }
        if (cancelled || !src) return;
        el.src = src;
        el.currentTime = 0;
        try {
          await el.play();
          setIsPlaying(true);
        } catch {
          /* autoplay blocked — leave to user gesture */
        }
      } catch {
        if (!cancelled) setIsPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.source]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !current) return;
    if (isPlaying) el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [isPlaying, current, setIsPlaying]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, volume / 100));
    el.muted = muted || volume === 0;
  }, [volume, muted]);

  // Pending seek — consumed once, triggered by store.seekTo.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => {
      const s = takePendingSeek();
      if (s != null) {
        try {
          el.currentTime = s;
        } catch {
          /* ignore */
        }
      }
    };
    const unsub = usePlayer.subscribe(handle);
    return () => unsub();
  }, []);

  return (
    <audio
      ref={ref}
      preload="metadata"
      crossOrigin="anonymous"
      onPlay={() => setIsPlaying(true)}
      onPause={() => {
        const el = ref.current;
        if (el && !el.ended) setIsPlaying(false);
      }}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        setTime(el.currentTime || 0, el.duration || 0);
      }}
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        setTime(el.currentTime || 0, el.duration || 0);
      }}
      onEnded={() => {
        if (repeat === 'one') {
          const el = ref.current;
          if (el) {
            el.currentTime = 0;
            el.play().catch(() => setIsPlaying(false));
          }
        } else {
          next();
        }
      }}
      aria-hidden
      tabIndex={-1}
      className="sr-only"
    />
  );
}
