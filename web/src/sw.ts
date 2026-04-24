/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

const CACHE = 'bratan-shell-v4'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  if (
    url.pathname.startsWith('/tidal/audio') ||
    url.pathname.startsWith('/tidal/download') ||
    url.pathname.startsWith('/hls') ||
    url.pathname.includes('playlist.m3u8') ||
    url.pathname.endsWith('.flac') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.m4a') ||
    url.hostname.endsWith('.workers.dev') ||
    url.hostname.endsWith('.sndcdn.com') ||
    url.hostname.endsWith('.googlevideo.com') ||
    url.hostname.endsWith('audio.tidal.com')
  ) {
    return
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((resp) => {
          if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp
          const copy = resp.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
          return resp
        })
        .catch(() => caches.match('./index.html').then(r => r || new Response('Offline', { status: 503 })))
    })
  )
})

export {}
