import { create } from 'zustand';
import type { Track } from '@/lib/types';

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  duration: number;
  position: number;
  volume: number;
  shuffle: boolean;
  loop: boolean;
  eqOpen: boolean;
  fullOpen: boolean;

  setQueue: (queue: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setTime: (position: number, duration: number) => void;
  setVolume: (volume: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  openFull: () => void;
  closeFull: () => void;
  toggleEq: () => void;
}

const LS_VOLUME = 'bratan.volume';
const LS_SHUFFLE = 'bratan.shuffle';
const LS_LOOP = 'bratan.loop';

const readInt = (key: string, fallback: number) => {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
};
const readBool = (key: string) => localStorage.getItem(key) === '1';

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  duration: 0,
  position: 0,
  volume: readInt(LS_VOLUME, 80),
  shuffle: readBool(LS_SHUFFLE),
  loop: readBool(LS_LOOP),
  eqOpen: false,
  fullOpen: false,

  setQueue: (queue, startIndex = 0) =>
    set({ queue, index: Math.max(0, Math.min(startIndex, queue.length - 1)) }),

  playTrack: (track, queue) =>
    set((s) => {
      const nextQueue = queue ?? s.queue;
      const idx = nextQueue.findIndex((t) => t.id === track.id && t.source === track.source);
      return {
        queue: nextQueue,
        index: idx >= 0 ? idx : 0,
        current: track,
      };
    }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTime: (position, duration) => set({ position, duration }),

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    localStorage.setItem(LS_VOLUME, String(clamped));
    set({ volume: clamped });
  },

  next: () => {
    const { queue, index, shuffle, loop } = get();
    if (!queue.length) return;
    let nextIdx: number;
    if (shuffle) nextIdx = Math.floor(Math.random() * queue.length);
    else if (index + 1 < queue.length) nextIdx = index + 1;
    else nextIdx = loop ? 0 : queue.length - 1;
    set({ index: nextIdx, current: queue[nextIdx] });
  },

  prev: () => {
    const { queue, index } = get();
    if (!queue.length) return;
    const nextIdx = Math.max(0, index - 1);
    set({ index: nextIdx, current: queue[nextIdx] });
  },

  toggleShuffle: () =>
    set((s) => {
      const v = !s.shuffle;
      localStorage.setItem(LS_SHUFFLE, v ? '1' : '0');
      return { shuffle: v };
    }),

  toggleLoop: () =>
    set((s) => {
      const v = !s.loop;
      localStorage.setItem(LS_LOOP, v ? '1' : '0');
      return { loop: v };
    }),

  openFull: () => set({ fullOpen: true }),
  closeFull: () => set({ fullOpen: false }),
  toggleEq: () => set((s) => ({ eqOpen: !s.eqOpen })),
}));
