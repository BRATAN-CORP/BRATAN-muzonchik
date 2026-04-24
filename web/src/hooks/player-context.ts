import { createContext, useContext } from 'react'
import type { Track, ProviderSource } from '@/types/media'

export interface PlayerState {
  playlist: Track[]
  results: Track[]
  currentTrack: Track | null
  currentList: 'playlist' | 'results' | null
  isPlaying: boolean
  loop: boolean
  volume: number
  source: ProviderSource
  currentTime: number
  duration: number
  currentTimeStr: string
  durationStr: string
  seekPosition: number
  qualityLabel: string
  statusText: string
  showPaywall: boolean
  fullscreen: boolean
}

export interface PlayerActions {
  search: (query: string) => Promise<void>
  playTrack: (track: Track, list: 'playlist' | 'results') => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seek: (pct: number) => void
  setVolume: (v: number) => void
  toggleLoop: () => void
  setSource: (s: ProviderSource) => void
  addToPlaylist: (track: Track) => void
  removeFromPlaylist: (track: Track) => void
  clearPlaylist: () => void
  shufflePlaylist: () => void
  exportPlaylist: () => void
  importPlaylist: (file: File) => void
  setResults: (results: Track[]) => void
  setShowPaywall: (v: boolean) => void
  setFullscreen: (v: boolean) => void
  reorderPlaylist: (from: number, to: number) => void
}

export const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null)

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
