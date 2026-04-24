import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { usePlayer } from '@/hooks/player-context'
import { TrackRow } from '@/components/TrackRow'
import { apiSearchTidal, apiSearchSoundCloud, apiSearchYouTube } from '@/lib/api'
import {
  normalizeTidalTrack, isOfficialTidal,
  normalizeSCTrack, isOfficialSCTrack,
  normalizeYtTrack, isOfficialYt,
} from '@/providers/adapters'
import type { Track, ProviderSource } from '@/types/media'
import { cn } from '@/lib/utils'

const SOURCE_OPTIONS: { value: ProviderSource; label: string }[] = [
  { value: 'tidal', label: 'Tidal (lossless)' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'youtube', label: 'YouTube' },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { source, setSource, setResults, results, statusText } = usePlayer()
  const initialQ = useMemo(() => searchParams.get('q') || '', []) // eslint-disable-line react-hooks/exhaustive-deps
  const [query, setQuery] = useState(initialQ)
  const [loading, setLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchedQ = useRef('')

  const runSearch = useCallback(async (q: string, src: ProviderSource) => {
    if (!q.trim()) return
    setLoading(true)
    setLocalStatus(`Searching on ${src === 'tidal' ? 'Tidal' : src === 'youtube' ? 'YouTube Music' : 'SoundCloud'}...`)
    setResults([])

    try {
      let items: Track[] = []

      if (src === 'tidal') {
        const raw = await apiSearchTidal(q)
        items = raw.map(normalizeTidalTrack).filter(isOfficialTidal)
      } else if (src === 'youtube') {
        const raw = await apiSearchYouTube(q)
        items = raw.map(normalizeYtTrack).filter(isOfficialYt)
      } else {
        const raw = await apiSearchSoundCloud(q)
        items = raw.filter(isOfficialSCTrack).map(normalizeSCTrack)
      }

      setResults(items)
      if (!items.length) setLocalStatus('No results found. Try a different query.')
      else setLocalStatus(`Found ${items.length} tracks`)
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'network error'
      setLocalStatus(`Search failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [setResults])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== lastSearchedQ.current) {
      lastSearchedQ.current = q
      runSearch(q, source)
    }
  }, [searchParams, runSearch, source])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchParams({ q: query })
    runSearch(query, source)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-4">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Track, artist, album..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            autoComplete="off"
            aria-label="Search query"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          aria-label="Search"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Source selector */}
      <div className="flex gap-1.5 mb-4">
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              source === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setSource(opt.value)
              if (query.trim()) runSearch(query, opt.value)
            }}
            aria-label={`Source: ${opt.label}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {(localStatus || statusText) && (
        <p className="text-xs text-muted-foreground mb-3">{localStatus || statusText}</p>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-1">
          {results.map((track) => (
            <TrackRow key={`${track.source}:${track.id}`} track={track} listType="results" />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && !localStatus && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a query to search for music</p>
        </div>
      )}
    </div>
  )
}
