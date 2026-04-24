// MediaElementSource → BiquadFilter[10] → AnalyserNode → destination.
//
// Created lazily on the first user gesture so that Safari, which starts
// AudioContexts suspended, doesn't silently drop the graph. The filters are
// always connected — when the user toggles the EQ off we just zero the
// gains on every band without tearing the graph down, which avoids
// re-creating a MediaElementSource for the same <audio> element (the API
// forbids that and throws InvalidStateError).

import type { EqGains } from './eq-presets';

export const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

interface GraphState {
  ctx: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  analyser: AnalyserNode | null;
  bands: BiquadFilterNode[];
  enabled: boolean;
  saved: number[];
}

const state: GraphState = {
  ctx: null,
  source: null,
  analyser: null,
  bands: [],
  enabled: true,
  saved: new Array(EQ_FREQS.length).fill(0),
};

export function ensureGraph(audioEl: HTMLAudioElement): GraphState | null {
  if (state.ctx) {
    if (state.ctx.state === 'suspended') state.ctx.resume().catch(() => {});
    return state;
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(audioEl);
    const bands = EQ_FREQS.map((freq, i) => {
      const node = ctx.createBiquadFilter();
      if (i === 0) node.type = 'lowshelf';
      else if (i === EQ_FREQS.length - 1) node.type = 'highshelf';
      else node.type = 'peaking';
      node.frequency.value = freq;
      node.Q.value = 1;
      node.gain.value = 0;
      return node;
    });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(bands[0]);
    for (let i = 0; i < bands.length - 1; i++) bands[i].connect(bands[i + 1]);
    bands[bands.length - 1].connect(analyser);
    analyser.connect(ctx.destination);

    state.ctx = ctx;
    state.source = source;
    state.bands = bands;
    state.analyser = analyser;

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (err) {
    console.warn('AudioContext wiring failed — EQ/visualizer disabled', err);
    return null;
  }
  return state;
}

export function getAnalyser(): AnalyserNode | null {
  return state.analyser;
}

export function setBandGain(i: number, db: number) {
  const clamped = Math.max(-12, Math.min(12, Number(db) || 0));
  state.saved[i] = clamped;
  const node = state.bands[i];
  if (node) node.gain.value = state.enabled ? clamped : 0;
}

export function getBandGain(i: number): number {
  return state.saved[i] ?? 0;
}

export function setAllGains(gains: EqGains) {
  gains.forEach((g, i) => setBandGain(i, g));
}

export function getAllGains(): number[] {
  return state.saved.slice();
}

export function setEqEnabled(on: boolean) {
  state.enabled = !!on;
  state.bands.forEach((b, i) => {
    b.gain.value = state.enabled ? state.saved[i] ?? 0 : 0;
  });
}

export function isEqEnabled() {
  return state.enabled;
}

export function isGraphReady() {
  return !!state.ctx;
}
