import { useRef } from 'react'
import { Shuffle, Download, Upload, Trash2, ListMusic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackRow } from '@/components/TrackRow'
import { usePlayer } from '@/hooks/player-context'

export function LibraryPage() {
  const {
    playlist, shufflePlaylist, exportPlaylist, importPlaylist, clearPlaylist,
  } = usePlayer()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) importPlaylist(f)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Library</h1>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={shufflePlaylist} aria-label="Shuffle playlist">
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={exportPlaylist} aria-label="Export playlist">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => fileRef.current?.click()} aria-label="Import playlist">
            <Upload className="w-4 h-4" />
          </Button>
          {playlist.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { if (confirm('Clear entire playlist?')) clearPlaylist() }}
              aria-label="Clear playlist"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {playlist.length} tracks in your playlist. Stored locally in your browser.
      </p>

      {playlist.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListMusic className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Your playlist is empty.</p>
          <p className="text-xs mt-1">Search and add tracks to build your playlist.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {playlist.map((track, index) => (
            <TrackRow
              key={`${track.source}:${track.id}`}
              track={track}
              listType="playlist"
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
