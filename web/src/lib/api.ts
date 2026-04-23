// Thin client over the existing Cloudflare Worker API. All endpoints already
// exist and have not been changed — only the frontend was rewritten.

import type { AlbumSet, ArtistSet, Track } from './types';

export const API_BASE = 'https://bratan-muzonchik.bratan-muzonchik.workers.dev';

async function json<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && typeof body.error === 'string') msg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------- Tidal

interface TidalSearchRaw {
  items?: Array<{
    id: string | number;
    title?: string;
    artist?: string;
    artists?: string[];
    artistId?: string | number;
    albumId?: string | number;
    album?: string;
    cover?: string;
    duration?: number | null;
    audioQuality?: string | null;
    explicit?: boolean;
  }>;
}

export async function searchTidalTracks(q: string): Promise<Track[]> {
  const data = await json<TidalSearchRaw>(
    `${API_BASE}/tidal/search?q=${encodeURIComponent(q)}&limit=30`
  );
  return (data.items ?? []).map(normalizeTidalTrack);
}

export async function searchTidalAlbums(q: string): Promise<AlbumSet[]> {
  const data = await json<{
    items?: Array<{
      id: string | number;
      title?: string;
      artist?: string;
      artists?: string[];
      cover?: string;
      numberOfTracks?: number;
    }>;
  }>(`${API_BASE}/tidal/search/albums?q=${encodeURIComponent(q)}&limit=30`);
  return (data.items ?? []).map((a) => ({
    id: String(a.id),
    title: (a.title ?? '').trim() || '(без названия)',
    artist: (a.artist ?? a.artists?.[0] ?? '').trim(),
    thumb: a.cover ?? '',
    trackCount: typeof a.numberOfTracks === 'number' ? a.numberOfTracks : 0,
    kind: 'album' as const,
    source: 'tidal' as const,
  }));
}

export async function searchTidalArtists(q: string): Promise<ArtistSet[]> {
  const data = await json<{
    items?: Array<{ id: string | number; name?: string; picture?: string }>;
  }>(`${API_BASE}/tidal/search/artists?q=${encodeURIComponent(q)}&limit=30`);
  return (data.items ?? []).map((a) => ({
    id: String(a.id),
    name: (a.name ?? '').trim() || '(без имени)',
    thumb: a.picture ?? '',
    source: 'tidal' as const,
  }));
}

export async function fetchTidalAlbum(id: string): Promise<{ album: AlbumSet; tracks: Track[] }> {
  const data = await json<{
    album: {
      id: string | number;
      title?: string;
      artist?: string;
      cover?: string;
      numberOfTracks?: number;
    };
    tracks: TidalSearchRaw['items'];
  }>(`${API_BASE}/tidal/album?id=${encodeURIComponent(id)}`);
  return {
    album: {
      id: String(data.album.id),
      title: data.album.title ?? 'Альбом',
      artist: data.album.artist ?? '',
      thumb: data.album.cover ?? '',
      trackCount: data.album.numberOfTracks ?? 0,
      kind: 'album',
      source: 'tidal',
    },
    tracks: (data.tracks ?? []).map(normalizeTidalTrack),
  };
}

export async function fetchTidalArtist(id: string): Promise<{
  artist: ArtistSet;
  topTracks: Track[];
  albums: AlbumSet[];
}> {
  const data = await json<{
    artist: { id: string | number; name?: string; picture?: string };
    topTracks?: TidalSearchRaw['items'];
    albums?: Array<{
      id: string | number;
      title?: string;
      artist?: string;
      cover?: string;
      numberOfTracks?: number;
    }>;
  }>(`${API_BASE}/tidal/artist?id=${encodeURIComponent(id)}`);
  return {
    artist: {
      id: String(data.artist.id),
      name: data.artist.name ?? '',
      thumb: data.artist.picture ?? '',
      source: 'tidal',
    },
    topTracks: (data.topTracks ?? []).map(normalizeTidalTrack),
    albums: (data.albums ?? []).map((a) => ({
      id: String(a.id),
      title: a.title ?? '(без названия)',
      artist: a.artist ?? '',
      thumb: a.cover ?? '',
      trackCount: a.numberOfTracks ?? 0,
      kind: 'album',
      source: 'tidal',
    })),
  };
}

function normalizeTidalTrack(it: NonNullable<TidalSearchRaw['items']>[number]): Track {
  return {
    source: 'tidal',
    id: String(it.id),
    title: (it.title ?? '').trim() || '(без названия)',
    artist: it.artist ?? it.artists?.[0] ?? 'Tidal',
    artistId: it.artistId != null ? String(it.artistId) : undefined,
    albumId: it.albumId != null ? String(it.albumId) : undefined,
    album: it.album,
    thumb: it.cover,
    duration: typeof it.duration === 'number' ? it.duration : null,
    verified: true,
    permalink: `https://tidal.com/browse/track/${it.id}`,
    audioQuality: it.audioQuality ?? null,
    explicit: !!it.explicit,
  };
}

// -------------------------------------------------------------- SoundCloud

interface SoundCloudTrackRaw {
  id: number | string;
  urn?: string;
  title?: string;
  user?: { username?: string; verified?: boolean; avatar_url?: string };
  artwork_url?: string;
  duration?: number;
  permalink_url?: string;
  media?: { transcodings?: Array<{ url: string; format?: { mime_type?: string } }> };
}

export async function searchSoundCloudTracks(q: string): Promise<Track[]> {
  const data = await json<{ collection?: SoundCloudTrackRaw[] }>(
    `${API_BASE}/sc/tracks?q=${encodeURIComponent(q)}&limit=30`
  );
  return (data.collection ?? []).filter((t) => !!t && !!t.media).map((t) => {
    let thumb = t.artwork_url ?? t.user?.avatar_url ?? '';
    if (thumb) thumb = thumb.replace(/-large(\.[a-z]+)$/i, '-t300x300$1');
    return {
      source: 'soundcloud',
      id: String(t.id),
      urn: t.urn,
      title: (t.title ?? '').trim() || '(без названия)',
      artist: (t.user?.username ?? '').trim() || 'SoundCloud',
      thumb,
      duration: typeof t.duration === 'number' ? Math.round(t.duration / 1000) : null,
      verified: !!t.user?.verified,
      permalink: t.permalink_url,
      transcoding: t.media?.transcodings?.find((tc) =>
        (tc.format?.mime_type ?? '').includes('mpegurl')
      ) ?? t.media?.transcodings?.[0],
    } satisfies Track;
  });
}

export async function resolveSoundCloudStream(transcodingUrl: string): Promise<string> {
  const data = await json<{ url?: string }>(
    `${API_BASE}/resolve?url=${encodeURIComponent(transcodingUrl)}`
  );
  if (!data.url) throw new Error('no stream url');
  return data.url;
}
