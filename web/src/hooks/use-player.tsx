import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import type { Track, ProviderSource } from '@/types/media'
import { itemKey } from '@/types/media'
import { audioEngine } from '@/lib/audio-engine'
import { apiResolveSCStream, apiGetTidalStream, apiRefetchSCTrack } from '@/lib/api'
import { tidalQualityLabel } from '@/providers/adapters'
import {
  loadPlaylist, savePlaylist, loadSource, saveSource as persistSource,
  loadVolume, saveVolume, loadLoop, saveLoop,
  canPlay, recordPlay,
} from '@/lib/store'
import { formatTime } from '@/lib/utils'
import { PlayerContext, type PlayerState, type PlayerActions } from './player-context'

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(() => ({
    playlist: loadPlaylist(),
    results: [],
    currentTrack: null,
    currentList: null,
    isPlaying: false,
    loop: loadLoop(),
    volume: loadVolume(),
    source: loadSource(),
    currentTime: 0,
    duration: 0,
    currentTimeStr: '0:00',
    durationStr: '0:00',
    seekPosition: 0,
    qualityLabel: '',
    statusText: '',
    showPaywall: false,
    fullscreen: false,
  }))

  const reqToken = useRef(0)
  const consecutiveErrors = useRef(0)
  const onStreamErrorRef = useRef<(m: string) => void>(null)
  const autoAdvanceRef = useRef<() => void>(null)

  useEffect(() => {
    audioEngine.setVolume(state.volume)
  }, [state.volume])

  const onStreamError = useCallback((message: string) => {
    consecutiveErrors.current++
    setState(s => ({ ...s, statusText: `${message}. Skipping...` }))
    if (consecutiveErrors.current > 6) {
      setState(s => ({ ...s, statusText: 'Too many errors in a row. Try another track.' }))
      return
    }
    setTimeout(() => autoAdvanceRef.current?.(), 300)
  }, [])

  useEffect(() => {
    onStreamErrorRef.current = onStreamError
  }, [onStreamError])

  useEffect(() => {
    const audio = audioEngine.audio
    const onPlay = () => setState(s => ({ ...s, isPlaying: true }))
    const onPause = () => setState(s => ({ ...s, isPlaying: false }))
    const onEnded = () => {
      setState(s => ({ ...s, isPlaying: false }))
      consecutiveErrors.current = 0
      autoAdvanceRef.current?.()
    }
    const onTimeUpdate = () => {
      const cur = audio.currentTime || 0
      const dur = audio.duration || 0
      setState(s => {
        if (s.currentTrack?.source === 'youtube') return s
        return {
          ...s,
          currentTime: cur,
          duration: dur,
          currentTimeStr: formatTime(cur),
          durationStr: dur > 0 && isFinite(dur) ? formatTime(dur) : s.durationStr,
          seekPosition: dur > 0 ? (cur / dur) * 1000 : 0,
        }
      })
    }
    const onError = () => {
      onStreamErrorRef.current?.('Stream error')
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('playing', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('error', onError)
    }
  }, [])

  const playTrackInternal = useCallback(async (track: Track, list: 'playlist' | 'results') => {
    if (!canPlay(track)) {
      setState(s => ({ ...s, showPaywall: true, statusText: 'Daily free limit reached' }))
      return
    }
    recordPlay(track)

    setState(s => ({
      ...s,
      currentTrack: track,
      currentList: list,
      currentTime: 0,
      duration: track.duration || 0,
      currentTimeStr: '0:00',
      durationStr: track.duration ? formatTime(track.duration) : '0:00',
      seekPosition: 0,
      qualityLabel: '',
      statusText: `Loading "${track.title}"...`,
    }))

    const token = ++reqToken.current
    audioEngine.stop()

    try {
      if (track.source === 'tidal') {
        const data = await apiGetTidalStream(track.id)
        if (token !== reqToken.current) return
        if (!data.stream) throw new Error('no stream url')
        await audioEngine.playDirectUrl(data.stream)
        const qLabel = tidalQualityLabel(data.quality || data.audioQuality || '')
        const bits = data.bitDepth && data.sampleRate
          ? ` ${data.bitDepth}bit/${Math.round(data.sampleRate / 1000)}kHz`
          : ''
        setState(s => ({
          ...s,
          qualityLabel: `Tidal ${qLabel}${bits}`,
          statusText: `Playing "${track.title}" (${qLabel})`,
        }))
      } else if (track.source === 'soundcloud') {
        let transcoding = track.transcoding
        if (!transcoding) {
          const tr = await apiRefetchSCTrack(track.id as number)
          if (token !== reqToken.current) return
          const pick = tr?.media?.transcodings?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.format?.protocol === 'hls' && t.format?.mime_type === 'audio/mpeg'
          )
          if (!pick) throw new Error('No plain-HLS available (DRM)')
          transcoding = pick.url
        }
        const m3u8 = await apiResolveSCStream(transcoding!)
        if (token !== reqToken.current) return
        await audioEngine.playHls(m3u8)
        setState(s => ({
          ...s,
          qualityLabel: '128 kbps MP3 HLS',
          statusText: `Playing "${track.title}" (128 kbps)`,
        }))
      }

      if (token === reqToken.current) {
        consecutiveErrors.current = 0
      }
    } catch (e) {
      if (token !== reqToken.current) return
      console.error(e)
      onStreamError('Could not load stream')
    }
  }, [onStreamError])

  const autoAdvance = useCallback(() => {
    setState(s => {
      const list = s.currentList === 'playlist' ? s.playlist : s.results
      if (!list.length || !s.currentTrack) return s
      const key = itemKey(s.currentTrack)
      const idx = list.findIndex(x => itemKey(x) === key)
      if (idx < 0) return s
      const nextIdx = idx + 1
      if (nextIdx >= list.length) {
        if (s.loop && s.currentList === 'playlist') {
          setTimeout(() => playTrackInternal(list[0], 'playlist'), 0)
          return s
        }
        return { ...s, statusText: 'End of list.' }
      }
      setTimeout(() => playTrackInternal(list[nextIdx], s.currentList!), 0)
      return s
    })
  }, [playTrackInternal])

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance
  }, [autoAdvance])

  const actions: PlayerActions = {
    search: async () => { /* handled in SearchPage */ },
    playTrack: (track, list) => playTrackInternal(track, list),
    togglePlay: () => {
      setState(s => {
        if (!s.currentTrack) {
          if (s.playlist.length) {
            setTimeout(() => playTrackInternal(s.playlist[0], 'playlist'), 0)
          }
          return s
        }
        if (audioEngine.audio.paused) {
          audioEngine.resumeContext()
          audioEngine.audio.play().catch(() => { /* noop */ })
        } else {
          audioEngine.audio.pause()
        }
        return s
      })
    },
    playNext: () => {
      setState(s => {
        const list = s.currentList === 'playlist' ? s.playlist : s.results
        if (list.length && s.currentTrack) {
          const key = itemKey(s.currentTrack)
          const idx = list.findIndex(x => itemKey(x) === key)
          let next = idx + 1
          if (next >= list.length) next = s.loop && s.currentList === 'playlist' ? 0 : list.length - 1
          setTimeout(() => playTrackInternal(list[next], s.currentList!), 0)
        } else if (s.playlist.length) {
          setTimeout(() => playTrackInternal(s.playlist[0], 'playlist'), 0)
        }
        return s
      })
    },
    playPrev: () => {
      setState(s => {
        const list = s.currentList === 'playlist' ? s.playlist : s.results
        if (list.length && s.currentTrack) {
          const key = itemKey(s.currentTrack)
          const idx = list.findIndex(x => itemKey(x) === key)
          let prev = idx - 1
          if (prev < 0) prev = s.loop && s.currentList === 'playlist' ? list.length - 1 : 0
          setTimeout(() => playTrackInternal(list[prev], s.currentList!), 0)
        } else if (s.playlist.length) {
          setTimeout(() => playTrackInternal(s.playlist[0], 'playlist'), 0)
        }
        return s
      })
    },
    seek: (pct: number) => {
      pct = Math.max(0, Math.min(1, pct))
      const dur = audioEngine.audio.duration || 0
      if (dur > 0 && isFinite(dur)) {
        try { audioEngine.audio.currentTime = dur * pct } catch { /* noop */ }
      }
    },
    setVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(100, v))
      saveVolume(clamped)
      audioEngine.setVolume(clamped)
      setState(s => ({ ...s, volume: clamped }))
    },
    toggleLoop: () => {
      setState(s => {
        const next = !s.loop
        saveLoop(next)
        return { ...s, loop: next }
      })
    },
    setSource: (source: ProviderSource) => {
      persistSource(source)
      setState(s => ({ ...s, source, results: [], statusText: '' }))
    },
    addToPlaylist: (track: Track) => {
      setState(s => {
        if (s.playlist.some(x => itemKey(x) === itemKey(track))) {
          return { ...s, statusText: `"${track.title}" already in playlist.` }
        }
        const next = [...s.playlist, {
          source: track.source,
          id: track.id,
          title: track.title,
          artist: track.artist,
          thumb: track.thumb,
          duration: track.duration,
          verified: track.verified,
          permalink: track.permalink,
          transcoding: track.transcoding || null,
          audioQuality: track.audioQuality || null,
        }]
        savePlaylist(next)
        return { ...s, playlist: next, statusText: `Added: ${track.title}` }
      })
    },
    removeFromPlaylist: (track: Track) => {
      setState(s => {
        const key = itemKey(track)
        const next = s.playlist.filter(x => itemKey(x) !== key)
        savePlaylist(next)
        return { ...s, playlist: next }
      })
    },
    clearPlaylist: () => {
      setState(s => {
        savePlaylist([])
        return { ...s, playlist: [] }
      })
    },
    shufflePlaylist: () => {
      setState(s => {
        const arr = [...s.playlist]
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        savePlaylist(arr)
        return { ...s, playlist: arr }
      })
    },
    exportPlaylist: () => {
      setState(s => {
        const blob = new Blob([JSON.stringify(s.playlist, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'bratan-playlist.json'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return s
      })
    },
    importPlaylist: (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const arr = JSON.parse(reader.result as string)
          if (!Array.isArray(arr)) throw new Error('not array')
          setState(s => {
            const seen = new Set(s.playlist.map(itemKey))
            const newItems = arr
              .filter((x: Track) => x && (typeof x.id === 'number' || typeof x.id === 'string') && typeof x.title === 'string')
              .filter((x: Track) => !seen.has(itemKey(x)))
            const next = [...s.playlist, ...newItems]
            savePlaylist(next)
            return { ...s, playlist: next, statusText: `Imported ${newItems.length} tracks.` }
          })
        } catch {
          setState(s => ({ ...s, statusText: 'Could not read playlist file.' }))
        }
      }
      reader.readAsText(file)
    },
    setResults: (results: Track[]) => {
      setState(s => ({ ...s, results }))
    },
    setShowPaywall: (v: boolean) => {
      setState(s => ({ ...s, showPaywall: v }))
    },
    setFullscreen: (v: boolean) => {
      setState(s => ({ ...s, fullscreen: v }))
    },
    reorderPlaylist: (from: number, to: number) => {
      setState(s => {
        const arr = [...s.playlist]
        const [item] = arr.splice(from, 1)
        arr.splice(to, 0, item)
        savePlaylist(arr)
        return { ...s, playlist: arr }
      })
    },
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.code === 'Space') { e.preventDefault(); actions.togglePlay() }
      else if (e.key === 'ArrowRight' && e.shiftKey) actions.playNext()
      else if (e.key === 'ArrowLeft' && e.shiftKey) actions.playPrev()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PlayerContext.Provider value={{ ...state, ...actions }}>
      {children}
    </PlayerContext.Provider>
  )
}
