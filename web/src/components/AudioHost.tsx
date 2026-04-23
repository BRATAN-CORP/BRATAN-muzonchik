import { useEffect, useRef } from 'react';
import { usePlayer } from '@/store/player';
import { ensureGraph } from '@/lib/audio-graph';
import { resolveSoundCloudStream } from '@/lib/api';
import type { Track } from '@/lib/types';

// Single <audio> element at the app root. Keeps all playback state authority
// in one place — the rest of the UI just drives it via the player store.
export function AudioHost() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const current = usePlayer((s) => s.current);
  const volume = usePlayer((s) => s.volume);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const setTime = usePlayer((s) => s.setTime);
  const next = usePlayer((s) => s.next);

  // Volume wire-up
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume]);

  // React to changes in the current track — load the source. SoundCloud
  // needs its transcoding URL resolved first; Tidal lets the worker proxy
  // the audio stream directly.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    let cancelled = false;

    async function load(track: Track) {
      const el = audioRef.current;
      if (!el) return;
      try {
        teardownHls();
        if (track.source === 'tidal') {
          el.src = `https://bratan-muzonchik.bratan-muzonchik.workers.dev/tidal/audio?id=${encodeURIComponent(
            track.id
          )}`;
        } else if (track.source === 'soundcloud') {
          const tc = track.transcoding as { url?: string } | undefined;
          if (!tc?.url) throw new Error('нет transcoding url');
          const streamUrl = await resolveSoundCloudStream(tc.url);
          if (cancelled) return;
          if (streamUrl.includes('.m3u8')) {
            await playHls(el, streamUrl);
          } else {
            el.src = streamUrl;
          }
        } else {
          // YouTube audio isn't streamed through <audio> — a future iteration
          // can wire the YouTube IFrame Player here. For now we simply skip
          // to the next track.
          next();
          return;
        }
        await el.play().catch(() => {});
      } catch (err) {
        console.warn('playback failed', err);
        next();
      }
    }

    load(current);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.source]);

  // React to play/pause intent
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      ensureGraph(audio);
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, current]);

  function teardownHls() {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        /* ignore */
      }
      hlsRef.current = null;
    }
  }

  async function playHls(audio: HTMLAudioElement, url: string) {
    // Lazy-load hls.js from a pinned CDN to keep the main bundle small.
    // Safari plays HLS natively, so we skip on those.
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      return;
    }
    type HlsCtor = new (opts?: unknown) => {
      loadSource(u: string): void;
      attachMedia(el: HTMLAudioElement): void;
      destroy(): void;
      on(event: string, cb: (...args: unknown[]) => void): void;
    };
    type HlsMod = { default: HlsCtor & { isSupported(): boolean } };
    // @ts-expect-error — dynamic CDN import, no local type package
    const mod: HlsMod = await import(
      /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/hls.js@1.6.0/dist/hls.esm.js'
    );
    if (!mod.default.isSupported()) {
      audio.src = url;
      return;
    }
    const hls = new mod.default();
    hls.loadSource(url);
    hls.attachMedia(audio);
    hlsRef.current = hls;
  }

  return (
    <audio
      ref={audioRef}
      onPlay={() => {
        setIsPlaying(true);
        if (audioRef.current) ensureGraph(audioRef.current);
      }}
      onPause={() => setIsPlaying(false)}
      onEnded={() => {
        setIsPlaying(false);
        next();
      }}
      onTimeUpdate={() => {
        const a = audioRef.current;
        if (!a) return;
        setTime(a.currentTime || 0, a.duration || 0);
      }}
      onLoadedMetadata={() => {
        const a = audioRef.current;
        if (!a) return;
        setTime(a.currentTime || 0, a.duration || 0);
      }}
      preload="metadata"
      className="hidden"
    />
  );
}
