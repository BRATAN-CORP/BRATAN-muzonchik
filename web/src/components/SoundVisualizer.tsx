import { useEffect, useRef } from 'react';
import { getAnalyser, isGraphReady } from '@/lib/audio-graph';
import { cn } from '@/lib/cn';

interface SoundVisualizerProps {
  active?: boolean;
  className?: string;
  bars?: number;
}

const VERTEX_SHADER = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

// Fragment shader renders `u_count` vertical bars by mapping v_uv.x into a
// bar index and comparing v_uv.y against the stored amplitude. Anti-aliased
// edges via smoothstep. Colour is a straight blue accent — no aurora.
const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_count;
  uniform float u_gap;
  uniform float u_values[64];
  uniform vec3 u_accent;

  float sampleValue(float idx) {
    // Unrolled sampling — WebGL1 uniforms can't be dynamically indexed.
    for (int i = 0; i < 64; i++) {
      if (float(i) == idx) return u_values[i];
    }
    return 0.0;
  }

  void main() {
    float col = floor(v_uv.x * u_count);
    float pos = fract(v_uv.x * u_count);
    float inside = step(u_gap, pos) * step(pos, 1.0 - u_gap);

    float amp = sampleValue(col);
    float from = 0.5 - amp * 0.5;
    float to   = 0.5 + amp * 0.5;

    float visY = smoothstep(from - 0.01, from, v_uv.y)
               * smoothstep(to + 0.01, to, v_uv.y);
    float vis = inside * visY;

    vec3 color = u_accent * mix(0.55, 1.0, amp);
    gl_FragColor = vec4(color * vis, vis);
  }
`;

function parseHexColor(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [0.235, 0.51, 1]; // #3C82FF fallback
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// WebGL bar visualizer driven by the AnalyserNode. Falls back to a calm
// idle waveform when audio isn't ready yet or the user prefers reduced
// motion. One context per mount, cleaned up on unmount. Never allocates
// per frame.
export function SoundVisualizer({ active = true, className, bars = 48 }: SoundVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsClamped = Math.max(4, Math.min(64, bars));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: true,
      premultipliedAlpha: true,
      alpha: true,
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Fullscreen quad (two triangles).
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uCount = gl.getUniformLocation(program, 'u_count');
    const uGap = gl.getUniformLocation(program, 'u_gap');
    const uValues = gl.getUniformLocation(program, 'u_values');
    const uAccent = gl.getUniformLocation(program, 'u_accent');

    const accentHex =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3c82ff';
    const [ar, ag, ab] = parseHexColor(accentHex);
    gl.uniform3f(uAccent, ar, ag, ab);
    gl.uniform1f(uCount, barsClamped);
    gl.uniform1f(uGap, 0.18);

    const values = new Float32Array(64);
    const freq = new Uint8Array(256);
    let raf = 0;
    const start = performance.now();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const w = Math.max(1, canvas.clientWidth | 0);
      const h = Math.max(1, canvas.clientHeight | 0);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const readValues = () => {
      const analyser = getAnalyser();
      if (active && analyser && isGraphReady()) {
        const size = Math.min(freq.length, analyser.frequencyBinCount);
        const view = new Uint8Array(freq.buffer, 0, size);
        analyser.getByteFrequencyData(view);
        // Downsample to `barsClamped` bars. We bias towards the bottom
        // 70% of the spectrum where most musical energy lives.
        for (let i = 0; i < barsClamped; i++) {
          const bin = Math.floor((i / barsClamped) * (size * 0.72));
          values[i] = (freq[bin] ?? 0) / 255;
        }
      } else {
        // Idle waveform — steady, not "AI-glowy". Sine blend.
        const t = (performance.now() - start) / 1000;
        for (let i = 0; i < barsClamped; i++) {
          const norm = i / barsClamped;
          values[i] = 0.3 + 0.22 * Math.sin(t * 1.4 + norm * Math.PI * 2);
        }
      }
      for (let i = barsClamped; i < values.length; i++) values[i] = 0;
    };

    const draw = () => {
      readValues();
      gl.uniform1fv(uValues, values);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!prefersReduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    };
  }, [active, barsClamped]);

  return <canvas ref={canvasRef} aria-hidden className={cn('w-full h-full block', className)} />;
}
