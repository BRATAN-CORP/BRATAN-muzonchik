export type ProviderSource = 'tidal' | 'soundcloud' | 'youtube'

export interface Track {
  source: ProviderSource
  id: string | number
  title: string
  artist: string
  thumb: string
  duration: number | null
  verified: boolean
  permalink: string
  transcoding?: string | null
  audioQuality?: string | null
  explicit?: boolean
  album?: string
}

export interface Artist {
  id: string | number
  name: string
  avatar: string
  source: ProviderSource
  verified: boolean
}

export interface Album {
  id: string | number
  title: string
  artist: string
  cover: string
  source: ProviderSource
  tracks: Track[]
  year?: number
}

export interface EQPreset {
  name: string
  gains: number[]
}

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

export const EQ_PRESETS: EQPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6] },
  { name: 'Vocal', gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
  { name: 'Rock', gains: [4, 3, 1, 0, -1, -1, 0, 2, 3, 4] },
  { name: 'Electronic', gains: [4, 3, 1, 0, -2, -1, 0, 2, 4, 5] },
  { name: 'Deep Bass', gains: [8, 6, 4, 2, 0, -1, -2, -2, -1, 0] },
  { name: 'Acoustic', gains: [3, 2, 1, 0, 1, 1, 2, 3, 2, 1] },
]

export function itemKey(item: Track): string {
  return `${item.source}:${item.id}`
}
