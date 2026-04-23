// Shared data shapes mirroring the existing worker API. These are the
// minimum fields the UI needs — the worker itself returns more.

export type Source = 'tidal' | 'soundcloud' | 'youtube';

export interface Track {
  source: Source;
  id: string;
  urn?: string;
  title: string;
  artist: string;
  artistId?: string;
  albumId?: string;
  album?: string;
  thumb?: string;
  duration?: number | null;
  verified?: boolean;
  permalink?: string;
  transcoding?: unknown;
  explicit?: boolean;
  audioQuality?: string | null;
}

export interface AlbumSet {
  id: string;
  title: string;
  artist: string;
  thumb?: string;
  trackCount?: number;
  kind?: 'album' | 'playlist' | 'artist';
  source: Source;
}

export interface ArtistSet {
  id: string;
  name: string;
  thumb?: string;
  source: Source;
}
