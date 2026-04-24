// Thin client over the Cloudflare Worker. All requests go through the
// worker so secrets stay server-side — the frontend never touches a Tidal
// or SoundCloud key. Each provider gets an adapter that normalizes the
// response into our domain models from `./types`.

import type { AlbumSet, ArtistSet, Track } from './types';
import { safeHttpUrl } from './safe-url';

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

// ----- Tidal --------------------------------------------------------------

interface TidalTrackRaw {
  id: string | number;
  title?: string;
  artist?: string;
  artists?: Array<string | { name?: string; id?: string | number }>;
  artistId?: string | number;
  albumId?: string | number;
  album?: string | { title?: string; id?: string | number; cover?: string };
  cover?: string;
  duration?: number | null;
  audioQuality?: string | null;
  explicit?: boolean;
}

interface TidalAlbumRaw {
  id: string | number;
  title?: string;
  artist?: string;
  artists?: Array<string | { name?: string }>;
  cover?: string;
  numberOfTracks?: number;
  releaseDate?: string;
  type?: string;
}

interface TidalArtistRaw {
  id: string | number;
  name?: string;
  picture?: string;
}

function firstArtistName(raw: TidalTrackRaw | TidalAlbumRaw): string {
  if ('artist' in raw && typeof raw.artist === 'string' && raw.artist.trim()) return raw.artist.trim();
  if (raw.artists && raw.artists.length > 0) {
    const first = raw.artists[0];
    if (typeof first === 'string') return first.trim();
    if (first && typeof first === 'object' && typeof first.name === 'string') return first.name.trim();
  }
  return '';
}

function albumTitleOf(raw: TidalTrackRaw): string | undefined {
  if (typeof raw.album === 'string') return raw.album;
  if (raw.album && typeof raw.album === 'object' && typeof raw.album.title === 'string') return raw.album.title;
  return undefined;
}

function albumIdOf(raw: TidalTrackRaw): string | undefined {
  if (raw.albumId != null) return String(raw.albumId);
  if (raw.album && typeof raw.album === 'object' && raw.album.id != null) return String(raw.album.id);
  return undefined;
}

function normalizeTidalTrack(raw: TidalTrackRaw): Track {
  const title = (raw.title ?? '').trim() || 'Без названия';
  const artist = firstArtistName(raw) || 'Неизвестный артист';
  return {
    source: 'tidal',
    id: String(raw.id),
    title,
    artist,
    artistId: raw.artistId != null ? String(raw.artistId) : undefined,
    album: albumTitleOf(raw),
    albumId: albumIdOf(raw),
    thumb: safeHttpUrl(raw.cover),
    coverUrl: safeHttpUrl(raw.cover),
    duration: typeof raw.duration === 'number' ? raw.duration : null,
    verified: true,
    permalink: `https://tidal.com/browse/track/${raw.id}`,
    audioQuality: raw.audioQuality ?? null,
    explicit: !!raw.explicit,
    isOfficial: true,
  };
}

function normalizeTidalAlbum(raw: TidalAlbumRaw): AlbumSet {
  return {
    id: String(raw.id),
    title: (raw.title ?? '').trim() || 'Без названия',
    artist: firstArtistName(raw) || '',
    thumb: safeHttpUrl(raw.cover),
    trackCount: typeof raw.numberOfTracks === 'number' ? raw.numberOfTracks : undefined,
    kind: 'album',
    source: 'tidal',
  };
}

function normalizeTidalArtist(raw: TidalArtistRaw): ArtistSet {
  return {
    id: String(raw.id),
    name: (raw.name ?? '').trim() || 'Неизвестный артист',
    thumb: safeHttpUrl(raw.picture),
    source: 'tidal',
  };
}

export async function searchTidalTracks(q: string, limit = 30): Promise<Track[]> {
  const data = await json<{ items?: TidalTrackRaw[] }>(
    `${API_BASE}/tidal/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return (data.items ?? []).map(normalizeTidalTrack);
}

export async function searchTidalAlbums(q: string, limit = 30): Promise<AlbumSet[]> {
  const data = await json<{ items?: TidalAlbumRaw[] }>(
    `${API_BASE}/tidal/search/albums?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return (data.items ?? []).map(normalizeTidalAlbum);
}

export async function searchTidalArtists(q: string, limit = 30): Promise<ArtistSet[]> {
  const data = await json<{ items?: TidalArtistRaw[] }>(
    `${API_BASE}/tidal/search/artists?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return (data.items ?? []).map(normalizeTidalArtist);
}

export async function fetchTidalAlbum(
  id: string,
): Promise<{ album: AlbumSet; tracks: Track[] }> {
  const data = await json<{ album: TidalAlbumRaw; tracks?: TidalTrackRaw[] }>(
    `${API_BASE}/tidal/album?id=${encodeURIComponent(id)}`,
  );
  return {
    album: normalizeTidalAlbum(data.album),
    tracks: (data.tracks ?? []).map(normalizeTidalTrack),
  };
}

export async function fetchTidalArtist(id: string): Promise<{
  artist: ArtistSet;
  topTracks: Track[];
  albums: AlbumSet[];
}> {
  const data = await json<{
    artist: TidalArtistRaw;
    topTracks?: TidalTrackRaw[];
    albums?: TidalAlbumRaw[];
  }>(`${API_BASE}/tidal/artist?id=${encodeURIComponent(id)}`);
  return {
    artist: normalizeTidalArtist(data.artist),
    topTracks: (data.topTracks ?? []).map(normalizeTidalTrack),
    albums: (data.albums ?? []).map(normalizeTidalAlbum),
  };
}

// ----- SoundCloud ---------------------------------------------------------

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

export async function searchSoundCloudTracks(q: string, limit = 30): Promise<Track[]> {
  const data = await json<{ collection?: SoundCloudTrackRaw[] }>(
    `${API_BASE}/sc/tracks?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return (data.collection ?? [])
    .filter((t) => !!t && !!t.media)
    .map((t) => {
      let thumb = t.artwork_url ?? t.user?.avatar_url ?? '';
      if (thumb) thumb = thumb.replace(/-large(\.[a-z]+)$/i, '-t300x300$1');
      return {
        source: 'soundcloud',
        id: String(t.id),
        urn: t.urn,
        title: (t.title ?? '').trim() || 'Без названия',
        artist: (t.user?.username ?? '').trim() || 'SoundCloud',
        thumb: safeHttpUrl(thumb),
        coverUrl: safeHttpUrl(thumb),
        duration: typeof t.duration === 'number' ? Math.round(t.duration / 1000) : null,
        verified: !!t.user?.verified,
        permalink: t.permalink_url,
        isOfficial: !!t.user?.verified,
        transcoding:
          t.media?.transcodings?.find((tc) =>
            (tc.format?.mime_type ?? '').includes('mpegurl'),
          ) ?? t.media?.transcodings?.[0],
      } satisfies Track;
    });
}

export async function resolveSoundCloudStream(transcodingUrl: string): Promise<string> {
  const data = await json<{ url?: string }>(
    `${API_BASE}/resolve?url=${encodeURIComponent(transcodingUrl)}`,
  );
  if (!data.url) throw new Error('no stream url');
  return data.url;
}
