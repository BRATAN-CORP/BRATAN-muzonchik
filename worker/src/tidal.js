// Tidal integration for bratan-muzonchik Worker.
// Handles OAuth token refresh + proxies search / stream / download requests.
//
// Configuration (Worker secrets / vars):
//   TIDAL_CLIENT_ID      - OAuth client_id used to mint tokens (from tidalapi mobile client)
//   TIDAL_CLIENT_SECRET  - matching client_secret
//   TIDAL_REFRESH_TOKEN  - long-lived refresh token (obtained once by the user via link.tidal.com)
//   TIDAL_COUNTRY        - ISO country code for catalog, defaults to "US"
//   TIDAL_KV             - KV namespace binding that caches { accessToken, expiryMs }

const TIDAL_AUTH_URL = "https://auth.tidal.com/v1/oauth2/token";
const TIDAL_API = "https://api.tidal.com/v1";

const DEFAULT_CLIENT_ID = "fX2JxdmntZWK0ixT";
const DEFAULT_CLIENT_SECRET = "1Nn9AfDAjxrgJFJbKNWLeAyKGVGmINuXPPLHVXAvxAg=";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type, Range",
  "access-control-expose-headers": "Content-Length, Content-Type, Content-Range, Accept-Ranges, Content-Disposition",
  "access-control-max-age": "86400",
};

const TIDAL_CDN_ALLOWED = [
  /^(.+\.)?audio\.tidal\.com$/i,
  /^(.+\.)?tidal\.com$/i,
  /^(.+\.)?akamaized\.net$/i,
  /^(.+\.)?cloudfront\.net$/i,
  /^(.+\.)?fa-v\d+\.tidal\.com$/i,
  /^sp-ap-\w+\.audio\.tidal\.com$/i,
  /^sp-[a-z0-9-]+\.audio\.tidal\.com$/i,
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

function err(msg, status = 500, extra = {}) {
  return json({ error: msg, ...extra }, status);
}

// ---- Token handling ----

let memo = { accessToken: null, expiryMs: 0 };

async function kvGet(env) {
  if (!env.TIDAL_KV) return null;
  try {
    const s = await env.TIDAL_KV.get("access_token_blob");
    if (!s) return null;
    return JSON.parse(s);
  } catch { return null; }
}

async function kvPut(env, blob) {
  if (!env.TIDAL_KV) return;
  try {
    const ttlSec = Math.max(30, Math.floor((blob.expiryMs - Date.now()) / 1000) - 60);
    await env.TIDAL_KV.put("access_token_blob", JSON.stringify(blob), {
      expirationTtl: ttlSec,
    });
  } catch { /* ignore */ }
}

async function refreshAccessToken(env) {
  const clientId = env.TIDAL_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = env.TIDAL_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  const refreshToken = env.TIDAL_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("TIDAL_REFRESH_TOKEN not configured");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: "r_usr w_usr w_sub",
  });
  const r = await fetch(TIDAL_AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("tidal auth non-json: " + text.slice(0, 200)); }
  if (!r.ok || !data.access_token) {
    throw new Error("tidal auth failed: " + r.status + " " + JSON.stringify(data));
  }
  const blob = {
    accessToken: data.access_token,
    expiryMs: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    tokenType: data.token_type || "Bearer",
  };
  memo = { accessToken: blob.accessToken, expiryMs: blob.expiryMs };
  return blob;
}

async function getAccessToken(env, ctx, { force = false } = {}) {
  const now = Date.now();
  if (!force && memo.accessToken && memo.expiryMs - now > 60_000) return memo.accessToken;
  if (!force) {
    const kv = await kvGet(env);
    if (kv && kv.expiryMs - now > 60_000) {
      memo = { accessToken: kv.accessToken, expiryMs: kv.expiryMs };
      return kv.accessToken;
    }
  }
  const blob = await refreshAccessToken(env);
  if (ctx && ctx.waitUntil) ctx.waitUntil(kvPut(env, blob));
  else await kvPut(env, blob);
  return blob.accessToken;
}

async function tidalFetch(env, ctx, path, init = {}) {
  const country = env.TIDAL_COUNTRY || "US";
  const url = new URL(path.startsWith("http") ? path : TIDAL_API + path);
  if (!url.searchParams.has("countryCode")) url.searchParams.set("countryCode", country);

  const doCall = async (tok) => fetch(url.toString(), {
    ...init,
    headers: {
      ...(init.headers || {}),
      authorization: `Bearer ${tok}`,
      accept: "application/json",
      "user-agent": "TIDAL/1052 CFNetwork/1494.0.7 Darwin/23.4.0",
    },
  });

  let tok = await getAccessToken(env, ctx);
  let r = await doCall(tok);
  if (r.status === 401) {
    tok = await getAccessToken(env, ctx, { force: true });
    r = await doCall(tok);
  }
  return r;
}

// ---- Public handlers ----

export async function handleTidalHealth(env, ctx) {
  try {
    const tok = await getAccessToken(env, ctx);
    return json({ ok: true, hasToken: !!tok, tokenPrefix: tok ? tok.slice(0, 12) + "..." : null });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

export async function handleTidalSearch(url, env, ctx) {
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 50);
  if (!q) return err("missing q", 400);
  const path = `/search/tracks?query=${encodeURIComponent(q)}&limit=${limit}&offset=0`;
  try {
    const r = await tidalFetch(env, ctx, path);
    if (!r.ok) {
      const body = await r.text();
      return err("tidal_search_failed", r.status === 401 ? 502 : r.status, { status: r.status, body: body.slice(0, 500) });
    }
    const data = await r.json();
    const items = (data.items || data.data || []).map((t) => normalizeTrack(t)).filter(Boolean);
    return json({ items });
  } catch (e) {
    return err("tidal_search_error", 502, { detail: String(e && e.message || e) });
  }
}

// Artist search — returns artist cards (id, name, picture).
export async function handleTidalArtistsSearch(url, env, ctx) {
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 50);
  if (!q) return err("missing q", 400);
  try {
    const r = await tidalFetch(env, ctx, `/search/artists?query=${encodeURIComponent(q)}&limit=${limit}&offset=0`);
    if (!r.ok) return err("tidal_artists_search_failed", r.status, { body: (await r.text()).slice(0, 300) });
    const data = await r.json();
    const items = (data.items || data.data || []).map(normalizeArtist).filter(Boolean);
    return json({ items });
  } catch (e) {
    return err("tidal_artists_search_error", 502, { detail: String(e && e.message || e) });
  }
}

// Album search — returns album cards (id, title, artist, cover).
export async function handleTidalAlbumsSearch(url, env, ctx) {
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 50);
  if (!q) return err("missing q", 400);
  try {
    const r = await tidalFetch(env, ctx, `/search/albums?query=${encodeURIComponent(q)}&limit=${limit}&offset=0`);
    if (!r.ok) return err("tidal_albums_search_failed", r.status, { body: (await r.text()).slice(0, 300) });
    const data = await r.json();
    const items = (data.items || data.data || []).map(normalizeAlbum).filter(Boolean);
    return json({ items });
  } catch (e) {
    return err("tidal_albums_search_error", 502, { detail: String(e && e.message || e) });
  }
}

// Album detail — album metadata + full track list.
export async function handleTidalAlbum(url, env, ctx) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^\d+$/.test(id)) return err("bad id", 400);
  try {
    const [metaR, tracksR] = await Promise.all([
      tidalFetch(env, ctx, `/albums/${id}`),
      tidalFetch(env, ctx, `/albums/${id}/tracks?limit=100&offset=0`),
    ]);
    if (!metaR.ok) return err("tidal_album_failed", metaR.status, { body: (await metaR.text()).slice(0, 300) });
    const meta = await metaR.json();
    const album = normalizeAlbum(meta);
    let tracks = [];
    if (tracksR.ok) {
      const td = await tracksR.json();
      tracks = (td.items || td.data || []).map(normalizeTrack).filter(Boolean);
    }
    return json({ album, tracks });
  } catch (e) {
    return err("tidal_album_error", 502, { detail: String(e && e.message || e) });
  }
}

// Artist detail — metadata + top tracks + albums list, so the UI can show a
// real artist page instead of an aggregation of unrelated search hits.
export async function handleTidalArtist(url, env, ctx) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^\d+$/.test(id)) return err("bad id", 400);
  try {
    const [metaR, topR, albumsR] = await Promise.all([
      tidalFetch(env, ctx, `/artists/${id}`),
      tidalFetch(env, ctx, `/artists/${id}/toptracks?limit=50&offset=0`),
      tidalFetch(env, ctx, `/artists/${id}/albums?limit=50&offset=0&filter=ALBUMS`),
    ]);
    if (!metaR.ok) return err("tidal_artist_failed", metaR.status, { body: (await metaR.text()).slice(0, 300) });
    const meta = await metaR.json();
    const artist = normalizeArtist(meta);
    let topTracks = [];
    if (topR.ok) {
      const td = await topR.json();
      topTracks = (td.items || td.data || []).map(normalizeTrack).filter(Boolean);
    }
    let albums = [];
    if (albumsR.ok) {
      const ad = await albumsR.json();
      albums = (ad.items || ad.data || []).map(normalizeAlbum).filter(Boolean);
    }
    return json({ artist, topTracks, albums });
  } catch (e) {
    return err("tidal_artist_error", 502, { detail: String(e && e.message || e) });
  }
}

function normalizeAlbum(a) {
  if (!a || typeof a.id !== "number") return null;
  const artists = Array.isArray(a.artists) ? a.artists.map((x) => x.name).filter(Boolean) : [];
  const cover = a.cover ? `https://resources.tidal.com/images/${a.cover.replace(/-/g, "/")}/320x320.jpg` : "";
  return {
    id: a.id,
    title: a.title || "",
    artist: (a.artist && a.artist.name) || artists[0] || "",
    artists,
    cover,
    numberOfTracks: typeof a.numberOfTracks === "number" ? a.numberOfTracks : null,
    releaseDate: a.releaseDate || null,
    explicit: !!a.explicit,
  };
}

function normalizeArtist(a) {
  if (!a || typeof a.id !== "number") return null;
  const picture = a.picture ? `https://resources.tidal.com/images/${a.picture.replace(/-/g, "/")}/320x320.jpg` : "";
  return {
    id: a.id,
    name: a.name || "",
    picture,
    popularity: typeof a.popularity === "number" ? a.popularity : null,
  };
}

function normalizeTrack(t) {
  if (!t || typeof t.id !== "number") return null;
  const artists = Array.isArray(t.artists) ? t.artists.map((a) => a.name).filter(Boolean) : [];
  const primaryArtist = (t.artist && t.artist.name) || artists[0] || "";
  const cover = t.album && t.album.cover ? `https://resources.tidal.com/images/${t.album.cover.replace(/-/g, "/")}/320x320.jpg` : "";
  return {
    id: t.id,
    title: t.title || "",
    version: t.version || "",
    artist: primaryArtist,
    artists,
    album: (t.album && t.album.title) || "",
    duration: typeof t.duration === "number" ? t.duration : null,
    audioQuality: t.audioQuality || null,
    explicit: !!t.explicit,
    cover,
    url: t.url || "",
    isrc: t.isrc || null,
    popularity: typeof t.popularity === "number" ? t.popularity : null,
  };
}

function decodeManifest(b64) {
  try {
    const bin = atob(b64);
    return JSON.parse(bin);
  } catch { return null; }
}

async function fetchPlaybackInfo(env, ctx, id, quality) {
  const path = `/tracks/${id}/playbackinfopostpaywall?audioquality=${encodeURIComponent(quality)}&playbackmode=STREAM&assetpresentation=FULL`;
  return tidalFetch(env, ctx, path);
}

async function resolveStream(env, ctx, id, requested = "LOSSLESS") {
  // Try requested quality; if not available, fall back.
  const ladder = ["HI_RES_LOSSLESS", "HI_RES", "LOSSLESS", "HIGH", "LOW"];
  const start = ladder.indexOf(requested.toUpperCase());
  const seq = start >= 0 ? ladder.slice(start) : ["LOSSLESS", "HIGH", "LOW"];
  let lastErr = null;
  for (const q of seq) {
    try {
      const r = await fetchPlaybackInfo(env, ctx, id, q);
      if (r.status === 404 || r.status === 400) { lastErr = `${q}:${r.status}`; continue; }
      if (!r.ok) {
        const body = await r.text();
        lastErr = `${q}:${r.status}:${body.slice(0, 200)}`;
        continue;
      }
      const data = await r.json();
      if (!data.manifest) { lastErr = `${q}:no_manifest`; continue; }
      const mime = data.manifestMimeType || "";
      const manifest = decodeManifest(data.manifest);
      if (!manifest) { lastErr = `${q}:manifest_decode_failed`; continue; }
      return { data, manifest, mime, quality: q };
    } catch (e) {
      lastErr = `${q}:${String(e && e.message || e)}`;
    }
  }
  throw new Error("no playable stream: " + lastErr);
}

export async function handleTidalTrack(url, env, ctx) {
  const id = (url.searchParams.get("id") || "").trim();
  const quality = (url.searchParams.get("quality") || "LOSSLESS").toUpperCase();
  if (!/^\d+$/.test(id)) return err("bad id", 400);
  try {
    const resolved = await resolveStream(env, ctx, id, quality);
    // For BTS/vnd.tidal.bts manifest: { mimeType, codecs, encryptionType, urls:[...] }
    // For DASH/mpd manifest: a base64 MPD XML (rare for LOSSLESS).
    const m = resolved.manifest;
    const urls = Array.isArray(m.urls) ? m.urls : [];
    const encryption = (m.encryptionType || "").toUpperCase();
    if (!urls.length) return err("no_stream_urls", 502, { mime: resolved.mime });
    if (encryption && encryption !== "NONE") {
      return err("encrypted_stream_unsupported", 415, { encryption, quality: resolved.quality });
    }
    const primary = urls[0];
    const codec = m.codecs || "";
    const mimeType = m.mimeType || resolved.mime || "";
    const ext = codec.includes("flac") ? "flac"
      : codec.includes("mp4a") || mimeType.includes("mp4") ? "m4a"
      : codec.includes("mp3") ? "mp3"
      : "bin";
    const reqOrigin = new URL(url.toString()).origin;
    const streamUrl = `${reqOrigin}/tidal/audio?url=${encodeURIComponent(primary)}`;
    const downloadUrl = `${reqOrigin}/tidal/download?id=${id}&quality=${encodeURIComponent(resolved.quality)}`;
    return json({
      id,
      quality: resolved.quality,
      audioQuality: resolved.data.audioQuality || resolved.quality,
      bitDepth: resolved.data.bitDepth || null,
      sampleRate: resolved.data.sampleRate || null,
      codec,
      mime: mimeType,
      ext,
      stream: streamUrl,
      direct: primary,
      download: downloadUrl,
      urls,
    });
  } catch (e) {
    return err("tidal_track_error", 502, { detail: String(e && e.message || e) });
  }
}

export async function handleTidalAudio(url, req) {
  const target = url.searchParams.get("url");
  if (!target) return err("missing url", 400);
  let parsed;
  try { parsed = new URL(target); } catch { return err("invalid url", 400); }
  if (parsed.protocol !== "https:") return err("https only", 400);
  const host = parsed.hostname.toLowerCase();
  if (!TIDAL_CDN_ALLOWED.some((re) => re.test(host))) return err("host not allowed: " + host, 400);
  const headers = new Headers();
  const range = req.headers.get("range");
  if (range) headers.set("range", range);
  const upstream = await fetch(target, { headers });
  const outHeaders = new Headers();
  for (const k of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) {
    const v = upstream.headers.get(k);
    if (v) outHeaders.set(k, v);
  }
  for (const [k, v] of Object.entries(CORS_HEADERS)) outHeaders.set(k, v);
  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}

export async function handleTidalDownload(url, req, env, ctx) {
  const id = (url.searchParams.get("id") || "").trim();
  const quality = (url.searchParams.get("quality") || "LOSSLESS").toUpperCase();
  if (!/^\d+$/.test(id)) return err("bad id", 400);
  let resolved;
  try {
    resolved = await resolveStream(env, ctx, id, quality);
  } catch (e) {
    return err("tidal_download_resolve_failed", 502, { detail: String(e && e.message || e) });
  }
  const m = resolved.manifest;
  const urls = Array.isArray(m.urls) ? m.urls : [];
  const encryption = (m.encryptionType || "").toUpperCase();
  if (!urls.length) return err("no_stream_urls", 502);
  if (encryption && encryption !== "NONE") {
    return err("encrypted_stream_unsupported", 415, { encryption, quality: resolved.quality });
  }
  // Fetch track metadata for filename
  let filename = `tidal_${id}`;
  try {
    const metaR = await tidalFetch(env, ctx, `/tracks/${id}`);
    if (metaR.ok) {
      const meta = await metaR.json();
      const t = normalizeTrack(meta);
      if (t) {
        const safe = (s) => (s || "").replace(/[\/\\?%*:|"<>\n\r\t]+/g, " ").trim().slice(0, 80);
        const base = `${safe(t.artist)} - ${safe(t.title)}`.trim() || filename;
        filename = base;
      }
    }
  } catch { /* keep default filename */ }

  const codec = m.codecs || "";
  const ext = codec.includes("flac") ? "flac"
    : codec.includes("mp4a") || (m.mimeType || "").includes("mp4") ? "m4a"
    : codec.includes("mp3") ? "mp3"
    : "bin";
  filename = `${filename}.${ext}`;

  // Stream all URL parts sequentially as one response body.
  const parts = urls.slice();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const u of parts) {
          const r = await fetch(u);
          if (!r.ok || !r.body) {
            controller.error(new Error(`part fetch failed: ${r.status}`));
            return;
          }
          const reader = r.body.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  const asciiName = filename.replace(/[^\x20-\x7E]+/g, "_");
  const outHeaders = new Headers({
    "content-type": m.mimeType || (ext === "flac" ? "audio/flac" : "audio/mp4"),
    "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    ...CORS_HEADERS,
  });
  return new Response(stream, { status: 200, headers: outHeaders });
}
