// Normalized domain models. The UI is written against these types so
// provider-specific responses (Tidal / SoundCloud / …) never leak into the
// components. Each provider gets an adapter in lib/api.ts that maps its
// response into these shapes.

export type ProviderSource = 'tidal' | 'soundcloud' | 'youtube';
// Re-export the older `Source` name so existing code keeps compiling.
export type Source = ProviderSource;

export type AudioQuality = 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS' | 'HI_RES' | string;

export interface Artist {
  id: string;
  source: ProviderSource;
  name: string;
  imageUrl?: string;
  verified?: boolean;
  bio?: string;
}

export interface Album {
  id: string;
  source: ProviderSource;
  title: string;
  artists: Artist[];
  coverUrl?: string;
  releaseDate?: string;
  trackCount?: number;
  type?: 'album' | 'ep' | 'single' | 'compilation' | 'playlist';
}

export interface Track {
  id: string;
  source: ProviderSource;
  title: string;
  artist: string;
  artists?: Artist[];
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: number | null;
  explicit?: boolean;
  thumb?: string;
  coverUrl?: string;
  urn?: string;
  verified?: boolean;
  permalink?: string;
  audioQuality?: AudioQuality | null;
  isOfficial?: boolean;
  /** Raw provider payload bits the audio host needs to stream (SC transcoding). */
  transcoding?: unknown;
  providerMeta?: Record<string, unknown>;
}

export interface SearchResult {
  tracks: Track[];
  albums: AlbumSet[];
  artists: ArtistSet[];
}

/** Lightweight album/artist projections used in grids and cards. */
export interface AlbumSet {
  id: string;
  title: string;
  artist: string;
  thumb?: string;
  trackCount?: number;
  kind?: 'album' | 'playlist' | 'artist';
  source: ProviderSource;
}

export interface ArtistSet {
  id: string;
  name: string;
  thumb?: string;
  source: ProviderSource;
}
