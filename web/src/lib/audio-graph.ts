// MediaElementSource → BiquadFilter[10] → AnalyserNode → destination.
// Lazy-initialized on first user gesture because browsers (Safari especially)
// will otherwise keep the AudioContext suspended.

export const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

interface GraphState {
  ctx: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  analyser: AnalyserNode | null;
  bands: BiquadFilterNode[];
  enabled: boolean;
}

const state: GraphState = {
  ctx: null,
  source: null,
  analyser: null,
  bands: [],
  enabled: true,
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
    analyser.fftSize = 256;
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
  const node = state.bands[i];
  if (!node) return;
  const clamped = Math.max(-12, Math.min(12, Number(db) || 0));
  node.gain.value = state.enabled ? clamped : 0;
  (node as BiquadFilterNode & { _saved?: number })._saved = clamped;
}

export function getBandGain(i: number): number {
  const node = state.bands[i] as (BiquadFilterNode & { _saved?: number }) | undefined;
  return node?._saved ?? node?.gain.value ?? 0;
}

export function setEqEnabled(on: boolean) {
  state.enabled = !!on;
  state.bands.forEach((b) => {
    const saved = (b as BiquadFilterNode & { _saved?: number })._saved ?? 0;
    b.gain.value = state.enabled ? saved : 0;
  });
}

export function isEqEnabled() {
  return state.enabled;
}
