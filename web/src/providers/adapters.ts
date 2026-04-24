import type { Track } from '@/types/media'

const REUPLOAD_PATTERNS = [
  /\breupload(ed)?\b/i, /\bkaraoke\b/i, /\bcover\b/i,
  /\bsped\s*up\b/i, /\bspedup\b/i, /\bslowed\b/i, /\breverb\b/i,
  /\b8d\s*(audio|version)\b/i, /\bnightcore\b/i,
  /\bfan\s*(made|edit|remix|version)\b/i, /\bmashup\b/i,
  /\blyric(s)?\s*video\b/i, /\bremix\b/i, /\binstrumental\b/i,
  /\bacapella\b/i, /\ba\s*capella\b/i, /\btype\s*beat\b/i, /\bfull\s*album\b/i,
]

function looksLikeReupload(title: string, artist: string): boolean {
  const t = (title || '') + ' ' + (artist || '')
  return REUPLOAD_PATTERNS.some((re) => re.test(t))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickHlsMp3Transcoding(tr: any) {
  const list = tr?.media?.transcodings
  if (!Array.isArray(list)) return null
  return list.find((t: { format?: { protocol?: string; mime_type?: string } }) => {
    const fmt = t.format || {}
    return fmt.protocol === 'hls' && fmt.mime_type === 'audio/mpeg'
  }) || null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOfficialSCTrack(tr: any): boolean {
  if (!tr || tr.kind !== 'track') return false
  if (tr.state !== 'finished') return false
  if (tr.streamable === false) return false
  if (tr.sharing && tr.sharing !== 'public') return false
  const user = tr.user || {}
  const pm = tr.publisher_metadata || null
  const verified = user.verified === true
  const hasPublisher = !!(pm && (pm.artist || pm.album_title || pm.isrc))
  if (!verified && !hasPublisher) return false
  if (looksLikeReupload(tr.title, user.username)) return false
  if (!pickHlsMp3Transcoding(tr)) return false
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSCTrack(tr: any): Track {
  const user = tr.user || {}
  const pm = tr.publisher_metadata || {}
  const artist = (pm.artist || user.username || 'Unknown Artist').trim()
  let thumb = tr.artwork_url || user.avatar_url || ''
  if (thumb) thumb = thumb.replace(/-large(\.[a-z]+)$/i, '-t300x300$1')
  return {
    source: 'soundcloud',
    id: tr.id,
    title: (tr.title || '').trim() || '(untitled)',
    artist,
    thumb,
    duration: tr.duration ? Math.round(tr.duration / 1000) : null,
    verified: user.verified === true,
    permalink: tr.permalink_url || '',
    transcoding: pickHlsMp3Transcoding(tr)?.url || null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeYtTrack(it: any): Track {
  return {
    source: 'youtube',
    id: it.id,
    title: (it.title || '').trim() || '(untitled)',
    artist: (it.uploader || 'YouTube').replace(/\s*-\s*Topic$/i, ''),
    thumb: it.thumbnail || `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`,
    duration: typeof it.duration === 'number' ? it.duration : null,
    verified: !!it.verified || /-?\s*Topic$/i.test(it.uploader || ''),
    permalink: `https://music.youtube.com/watch?v=${it.id}`,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOfficialYt(item: any): boolean {
  if (!item?.id) return false
  if (item.duration != null && item.duration < 30) return false
  if (looksLikeReupload(item.title, item.artist)) return false
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTidalTrack(it: any): Track {
  return {
    source: 'tidal',
    id: it.id,
    title: (it.title || '').trim() || '(untitled)',
    artist: it.artist || (it.artists?.[0]) || 'Tidal',
    thumb: it.cover || '',
    duration: typeof it.duration === 'number' ? it.duration : null,
    verified: true,
    permalink: `https://tidal.com/browse/track/${it.id}`,
    audioQuality: it.audioQuality || null,
    explicit: !!it.explicit,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOfficialTidal(item: any): boolean {
  if (!item?.id) return false
  if (item.duration != null && item.duration < 30) return false
  return true
}

export function tidalQualityLabel(q: string): string {
  switch ((q || '').toUpperCase()) {
    case 'HI_RES_LOSSLESS': return 'HiRes FLAC'
    case 'HI_RES': return 'MQA'
    case 'LOSSLESS': return 'FLAC 16/44'
    case 'HIGH': return 'AAC 320'
    case 'LOW': return 'AAC 96'
    default: return q
  }
}
