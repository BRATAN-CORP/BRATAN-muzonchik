import { useNavigate } from 'react-router-dom'
import { Search, Headphones, Music, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TelegramLogin } from '@/components/auth/TelegramLogin'
import { usePlayer } from '@/hooks/player-context'
import { TrackRow } from '@/components/TrackRow'

const QUICK_SEARCHES = [
  'The Weeknd', 'Drake', 'Dua Lipa', 'Billie Eilish',
  'Kendrick Lamar', 'Daft Punk', 'Taylor Swift', 'Post Malone',
]

export function HomePage() {
  const navigate = useNavigate()
  const { playlist } = usePlayer()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            BRATAN<span className="text-primary">-music</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tidal lossless + SoundCloud + YouTube
          </p>
        </div>
        <TelegramLogin />
      </div>

      {/* Search CTA */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-border text-muted-foreground hover:border-primary/30 hover:bg-surface-hover transition-all mb-8 text-left"
        onClick={() => navigate('/search')}
        aria-label="Go to search"
      >
        <Search className="w-5 h-5 text-muted-foreground/60" />
        <span className="text-sm">Search for tracks, artists, albums...</span>
      </button>

      {/* Quick searches */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Popular Artists
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((q) => (
            <Button
              key={q}
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
              className="rounded-full"
            >
              {q}
            </Button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: Headphones, title: 'Lossless Audio', desc: 'FLAC 16/44.1 via Tidal' },
          { icon: Music, title: 'Official Only', desc: 'Verified artists & labels' },
          { icon: Radio, title: 'Multi-source', desc: 'Tidal, SoundCloud, YouTube' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Recent playlist */}
      {playlist.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Your Playlist
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
              View all
            </Button>
          </div>
          <div className="space-y-1">
            {playlist.slice(0, 5).map((track) => (
              <TrackRow key={`${track.source}:${track.id}`} track={track} listType="playlist" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
