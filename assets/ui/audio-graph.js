// Shared Web Audio graph for the <audio> element. Wires up:
//   <audio> -> MediaElementSource -> [10-band EQ] -> AnalyserNode -> destination
//
// Exposes:
//   ensureGraph(audioEl)  — lazy-create on first user interaction (autoplay policy)
//   getAnalyser()         — AnalyserNode for visualizer
//   getEqBands()          — array of 10 BiquadFilterNode
//   setEqBandGain(i, db)  — update band gain, clamped
//   setEqEnabled(bool)    — bypass when off
//   EQ_FREQS              — center frequencies in Hz
//
// All audio processing stays in the browser; we never upload raw audio
// anywhere. This only acts on <audio> output — YouTube iframe audio routes
// through YT's player and can't be tapped (CORS/origin), so EQ/visualizer
// are visually indicated as unavailable for YT tracks.

export const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const state = {
  ctx: null,
  source: null,
  analyser: null,
  bands: [],
  enabled: true,
  firstInput: null,
  lastOutput: null,
};

export function ensureGraph(audioEl) {
  if (state.ctx) return state;
  const Ctx = window.AudioContext || window.webkitAudioContext;
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
    analyser.smoothingTimeConstant = 0.8;

    // wire chain: source -> band[0] -> band[1] -> ... -> analyser -> destination
    source.connect(bands[0]);
    for (let i = 0; i < bands.length - 1; i++) bands[i].connect(bands[i + 1]);
    bands[bands.length - 1].connect(analyser);
    analyser.connect(ctx.destination);

    state.ctx = ctx;
    state.source = source;
    state.bands = bands;
    state.analyser = analyser;
    state.firstInput = bands[0];
    state.lastOutput = analyser;
  } catch (e) {
    console.warn('AudioContext wiring failed — EQ/visualizer disabled', e);
    return null;
  }
  return state;
}

export function resume() {
  if (state.ctx && state.ctx.state === 'suspended') {
    state.ctx.resume().catch(() => {});
  }
}

export function getAnalyser() { return state.analyser; }
export function getEqBands() { return state.bands; }
export function getAudioContext() { return state.ctx; }

export function setEqBandGain(i, db) {
  if (!state.bands[i]) return;
  const clamped = Math.max(-12, Math.min(12, Number(db) || 0));
  state.bands[i].gain.value = state.enabled ? clamped : 0;
  state.bands[i]._savedGain = clamped;
}

export function getEqBandGain(i) {
  if (!state.bands[i]) return 0;
  return state.bands[i]._savedGain ?? state.bands[i].gain.value;
}

export function setEqEnabled(on) {
  state.enabled = !!on;
  state.bands.forEach((b, i) => {
    b.gain.value = state.enabled ? (b._savedGain ?? 0) : 0;
  });
}

export function isEqEnabled() { return state.enabled; }

if (typeof window !== 'undefined') {
  window.BRATAN_AUDIO = {
    ensureGraph, resume, getAnalyser, getEqBands, getAudioContext,
    setEqBandGain, getEqBandGain, setEqEnabled, isEqEnabled, EQ_FREQS,
  };
}
