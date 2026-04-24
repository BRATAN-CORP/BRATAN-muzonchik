import { create } from 'zustand';
import type { Track } from '@/lib/types';

// Repeat model: 'off' → no loop; 'all' → loop whole queue; 'one' → loop current track.
export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  duration: number;
  position: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  // UI surface state
  fullOpen: boolean;
  eqOpen: boolean;
  queueOpen: boolean;

  setQueue: (queue: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setTime: (position: number, duration: number) => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  openFull: () => void;
  closeFull: () => void;
  toggleEq: () => void;
  setEqOpen: (open: boolean) => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
}

// Side-effect used by the AudioHost to imperatively seek the underlying
// <audio> element without tying the store to DOM refs.
let pendingSeek: number | null = null;
export function takePendingSeek(): number | null {
  const s = pendingSeek;
  pendingSeek = null;
  return s;
}

const LS_VOLUME = 'bratan.volume';
const LS_MUTED = 'bratan.muted';
const LS_SHUFFLE = 'bratan.shuffle';
const LS_REPEAT = 'bratan.repeat';

const readInt = (key: string, fallback: number) => {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
};
const readBool = (key: string) => localStorage.getItem(key) === '1';
const readRepeat = (): RepeatMode => {
  const v = localStorage.getItem(LS_REPEAT);
  return v === 'all' || v === 'one' ? v : 'off';
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  duration: 0,
  position: 0,
  volume: readInt(LS_VOLUME, 80),
  muted: readBool(LS_MUTED),
  shuffle: readBool(LS_SHUFFLE),
  repeat: readRepeat(),
  fullOpen: false,
  eqOpen: false,
  queueOpen: false,

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

  seekTo: (seconds) => {
    pendingSeek = Math.max(0, seconds);
    const { duration } = get();
    set({ position: Math.min(Math.max(0, seconds), duration || seconds) });
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    localStorage.setItem(LS_VOLUME, String(clamped));
    set({ volume: clamped, muted: clamped === 0 ? get().muted : false });
  },

  toggleMute: () =>
    set((s) => {
      const next = !s.muted;
      localStorage.setItem(LS_MUTED, next ? '1' : '0');
      return { muted: next };
    }),

  next: () => {
    const { queue, index, shuffle, repeat } = get();
    if (!queue.length) return;
    let nextIdx: number;
    if (repeat === 'one') nextIdx = index;
    else if (shuffle) {
      if (queue.length === 1) nextIdx = 0;
      else {
        let r = index;
        while (r === index) r = Math.floor(Math.random() * queue.length);
        nextIdx = r;
      }
    } else if (index + 1 < queue.length) nextIdx = index + 1;
    else nextIdx = repeat === 'all' ? 0 : queue.length - 1;
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

  cycleRepeat: () =>
    set((s) => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const next = order[(order.indexOf(s.repeat) + 1) % order.length];
      localStorage.setItem(LS_REPEAT, next);
      return { repeat: next };
    }),

  openFull: () => set({ fullOpen: true }),
  closeFull: () => set({ fullOpen: false, eqOpen: false, queueOpen: false }),
  toggleEq: () => set((s) => ({ eqOpen: !s.eqOpen, queueOpen: s.eqOpen ? s.queueOpen : false })),
  setEqOpen: (open) => set({ eqOpen: open }),
  toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen, eqOpen: s.queueOpen ? s.eqOpen : false })),
  setQueueOpen: (open) => set({ queueOpen: open }),
}));
