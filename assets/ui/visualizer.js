// Canvas-based audio visualizer. Renders smooth animated bars + a soft
// "pulse" aura. Reads from the shared AnalyserNode in audio-graph.js when
// available; falls back to a silky idle animation so the UI stays alive
// even when no audio is playing or for YouTube tracks (which can't be tapped).
//
// Colors come from CSS custom properties so dark/light theme "just works".

export function startVisualizer(canvas, { getAnalyser, isPlaying }) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  let raf = null;
  let stopped = false;
  let t = 0;

  function readColors() {
    const root = getComputedStyle(document.documentElement);
    return {
      accent: root.getPropertyValue('--accent').trim() || '#7C5CFF',
      accent2: root.getPropertyValue('--accent-2').trim() || '#F472B6',
      accent3: root.getPropertyValue('--accent-3').trim() || '#22D3A5',
      bg: root.getPropertyValue('--bg-2').trim() || '#1A1A26',
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function draw() {
    if (stopped) return;
    raf = requestAnimationFrame(draw);
    t += 0.016;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const colors = readColors();
    const analyser = getAnalyser && getAnalyser();
    const playing = !!(isPlaying && isPlaying());

    let data = null;
    if (analyser) {
      data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
    }

    // --- pulse aura (radial glow) ---
    const cx = w / 2;
    const cy = h / 2;
    let avg = 0;
    if (data) {
      for (let i = 4; i < Math.min(data.length, 40); i++) avg += data[i];
      avg /= 36;
    } else {
      // idle sine breathing
      avg = playing ? 60 + Math.sin(t * 2) * 20 : 30 + Math.sin(t * 1.2) * 10;
    }
    const pulse = Math.min(1, avg / 180);
    const radius = Math.min(w, h) * (0.28 + pulse * 0.22);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, hex2rgba(colors.accent, 0.35 + pulse * 0.3));
    grad.addColorStop(0.5, hex2rgba(colors.accent2, 0.18 + pulse * 0.15));
    grad.addColorStop(1, hex2rgba(colors.accent3, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // --- bars around the bottom ---
    const barCount = 48;
    const barWidth = (w / barCount) * 0.6;
    const gap = (w / barCount) * 0.4;
    const baseY = h * 0.82;
    const maxBar = h * 0.35;
    for (let i = 0; i < barCount; i++) {
      let v;
      if (data) {
        // exponential frequency mapping — pleasing "music" feel
        const idx = Math.floor(Math.pow(i / barCount, 1.6) * (data.length - 1));
        v = data[idx] / 255;
      } else {
        const phase = playing ? t * 3 : t * 0.8;
        v = (Math.sin(i * 0.35 + phase) * 0.5 + 0.5) * (playing ? 0.55 : 0.2);
      }
      v = Math.max(0.05, v);
      const x = i * (barWidth + gap) + gap / 2;
      const barH = v * maxBar;
      const hue = i / barCount;
      const color = mixHex(colors.accent, colors.accent2, hue);
      ctx.fillStyle = color;
      roundedRect(ctx, x, baseY - barH, barWidth, barH, Math.min(barWidth / 2, 4));
      ctx.fill();
      // mirrored reflection
      ctx.fillStyle = hex2rgba(color, 0.18);
      roundedRect(ctx, x, baseY, barWidth, barH * 0.35, Math.min(barWidth / 2, 4));
      ctx.fill();
    }
  }

  draw();

  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    try { ro.disconnect(); } catch {}
  };
}

// Spotify-like circular "pulse ring" beside the play button — tiny, lightweight,
// runs whenever isPlaying() is true.
export function startRingPulse(host, { isPlaying }) {
  if (!host) return () => {};
  let raf = null;
  let stopped = false;
  function tick() {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const active = !!(isPlaying && isPlaying());
    host.classList.toggle('is-pulsing', active);
  }
  tick();
  return () => { stopped = true; if (raf) cancelAnimationFrame(raf); };
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hex2rgba(hex, a) {
  const h = hex.replace('#', '');
  const parsed = h.length === 3
    ? h.split('').map((c) => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return `rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, ${a})`;
}

function mixHex(a, b, t) {
  const pa = hexParts(a);
  const pb = hexParts(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexParts(hex) {
  const h = hex.replace('#', '');
  return h.length === 3
    ? h.split('').map((c) => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Continuously sync CSS custom properties on `target` from the analyser's
// low-band energy. Drives the fullscreen halo pulse + the artwork micro-scale.
// Falls back to a slow sine breathing when no analyser data is available
// (e.g. YouTube iframe).
export function startBeatSync(target, { getAnalyser, isPlaying }) {
  if (!target) return () => {};
  let raf = null;
  let stopped = false;
  let t = 0;
  let smoothedLow = 0;
  let smoothedMid = 0;
  function tick() {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    t += 0.016;
    const analyser = getAnalyser && getAnalyser();
    const playing = !!(isPlaying && isPlaying());
    let low = 0, mid = 0;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      // 20–150 Hz ish — bass / kick.
      let ls = 0, lc = 0;
      for (let i = 1; i < 8 && i < data.length; i++) { ls += data[i]; lc++; }
      low = lc ? ls / lc / 255 : 0;
      // 500–2000 Hz — snare/vocal thwack.
      let ms = 0, mc = 0;
      for (let i = 12; i < 40 && i < data.length; i++) { ms += data[i]; mc++; }
      mid = mc ? ms / mc / 255 : 0;
    } else {
      low = playing ? 0.35 + Math.sin(t * 2.2) * 0.18 : 0.2 + Math.sin(t * 1.2) * 0.08;
      mid = playing ? 0.3 + Math.sin(t * 3.1 + 1) * 0.15 : 0.15;
    }
    smoothedLow = smoothedLow * 0.75 + low * 0.25;
    smoothedMid = smoothedMid * 0.7 + mid * 0.3;

    // The halo/aurora scale & opacity now react hard to bass hits so the
    // full-screen glow visibly "breathes" with the song the way Yandex
    // Music and Apple's lyrics view do — these multipliers were weaker
    // before and the effect read as static on screen.
    const beatScale   = 1 + smoothedLow * 0.45;                 // 1.00 → ~1.45
    const beatOpacity = 0.55 + smoothedLow * 0.45;              // 0.55 → 1.0
    const glowOpacity = 0.7 + smoothedLow * 0.25;               // 0.7 → 0.95
    const artScale    = 1 + smoothedLow * 0.06;                 // subtle art bump
    const rowIntensity = Math.max(0.3, smoothedMid);

    target.style.setProperty('--beat-scale', beatScale.toFixed(3));
    target.style.setProperty('--beat-opacity', beatOpacity.toFixed(3));
    target.style.setProperty('--glow-opacity', glowOpacity.toFixed(3));
    target.style.setProperty('--art-scale', artScale.toFixed(3));
    target.style.setProperty('--row-beat', rowIntensity.toFixed(3));
  }
  tick();
  return () => { stopped = true; if (raf) cancelAnimationFrame(raf); };
}

if (typeof window !== 'undefined') {
  window.BRATAN_VIZ = { startVisualizer, startRingPulse, startBeatSync };
}
