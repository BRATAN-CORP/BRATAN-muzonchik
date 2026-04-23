// Extract up to N dominant colors from an image using canvas sampling.
// Used to drive the aurora-glow behind the fullscreen player.
//
// This is intentionally a tiny bucket-sort rather than k-means so it runs
// on every track change without measurable cost, even on low-end phones.

const cache = new Map<string, string[]>();

export async function extractPalette(url: string, count = 3): Promise<string[] | null> {
  if (!url) return null;
  const cached = cache.get(url);
  if (cached) return cached;

  const colors = await new Promise<string[] | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        resolve(samplePalette(img, count));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  if (colors) cache.set(url, colors);
  return colors;
}

function samplePalette(img: HTMLImageElement, count: number): string[] | null {
  const W = 32, H = 32;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null;
  }

  type Bucket = { r: number; g: number; b: number; n: number };
  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 24) continue;       // near-black
    if (min > 232) continue;      // near-white
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
    buckets.set(key, cur);
  }

  const arr: Array<{ r: number; g: number; b: number; score: number }> = [];
  buckets.forEach((v) => {
    const rr = v.r / v.n, gg = v.g / v.n, bb = v.b / v.n;
    const sat = Math.max(rr, gg, bb) - Math.min(rr, gg, bb);
    const score = v.n * (1 + (sat / 255) * 2);
    arr.push({ r: rr, g: gg, b: bb, score });
  });
  arr.sort((a, b) => b.score - a.score);

  const pick: typeof arr = [];
  for (const c of arr) {
    if (pick.some((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) < 48)) continue;
    pick.push(c);
    if (pick.length >= count) break;
  }
  if (!pick.length) return null;
  return pick.map((c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`);
}
