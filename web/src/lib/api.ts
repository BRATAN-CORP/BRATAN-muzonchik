const API_BASE = 'https://bratan-muzonchik.bratan-muzonchik.workers.dev'

export async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { signal: ctrl.signal, mode: 'cors' }).finally(() => clearTimeout(t))
}

export async function apiSearchSoundCloud(query: string) {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=40`
  const res = await fetchWithTimeout(url, 15000)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  return Array.isArray(data.collection) ? data.collection : []
}

export async function apiSearchYouTube(query: string) {
  const url = `${API_BASE}/yt/search?q=${encodeURIComponent(query)}`
  const res = await fetchWithTimeout(url, 15000)
  if (!res.ok) {
    let body: Record<string, string> = {}
    try { body = await res.json() } catch { /* empty */ }
    throw new Error(body.error || ('HTTP ' + res.status))
  }
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

export async function apiSearchTidal(query: string) {
  const url = `${API_BASE}/tidal/search?q=${encodeURIComponent(query)}&limit=30`
  const res = await fetchWithTimeout(url, 15000)
  if (!res.ok) {
    let body: Record<string, string> = {}
    try { body = await res.json() } catch { /* empty */ }
    throw new Error(body.error || ('HTTP ' + res.status))
  }
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

export async function apiResolveSCStream(transcodingUrl: string): Promise<string> {
  const url = `${API_BASE}/resolve?url=${encodeURIComponent(transcodingUrl)}`
  const res = await fetchWithTimeout(url, 15000)
  if (!res.ok) throw new Error('stream resolve HTTP ' + res.status)
  const data = await res.json()
  if (!data?.url) throw new Error('no m3u8 url')
  return data.url
}

export async function apiGetTidalStream(trackId: string | number) {
  const url = `${API_BASE}/tidal/track?id=${encodeURIComponent(trackId)}&quality=LOSSLESS`
  const res = await fetchWithTimeout(url, 20000)
  if (!res.ok) {
    let body: Record<string, string> = {}
    try { body = await res.json() } catch { /* empty */ }
    throw new Error(body.error || ('HTTP ' + res.status))
  }
  return res.json()
}

export async function apiRefetchSCTrack(id: number) {
  const res = await fetchWithTimeout(`${API_BASE}/search?q=${encodeURIComponent(String(id))}&limit=10`, 10000)
  if (!res.ok) throw new Error('track refetch HTTP ' + res.status)
  const data = await res.json()
  const arr = Array.isArray(data.collection) ? data.collection : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hit = arr.find((t: any) => t.id === id)
  if (!hit) throw new Error('track not found')
  return hit
}

export function getTidalDownloadUrl(trackId: string | number): string {
  return `${API_BASE}/tidal/download?id=${encodeURIComponent(trackId)}&quality=LOSSLESS`
}

export async function apiTgLoginPoll(token: string) {
  const url = `${API_BASE}/tg/login/poll?token=${encodeURIComponent(token)}`
  const res = await fetchWithTimeout(url, 10000)
  if (!res.ok) return null
  const data = await res.json()
  return data?.ok ? data : null
}

export async function apiTgGetPlaylist(session: string) {
  const res = await fetch(`${API_BASE}/tg/playlist?session=${encodeURIComponent(session)}`)
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return data?.ok ? data : null
}

export async function apiTgPushPlaylist(session: string, playlist: unknown[]) {
  const body = JSON.stringify(playlist)
  const res = await fetch(`${API_BASE}/tg/playlist?session=${encodeURIComponent(session)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  return res.ok
}

export async function apiTgRefreshSubscription(session: string) {
  const url = `${API_BASE}/tg/subscription?session=${encodeURIComponent(session)}`
  const res = await fetchWithTimeout(url, 8000)
  if (!res.ok) return null
  return res.json()
}
