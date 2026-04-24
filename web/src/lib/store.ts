import type { Track, ProviderSource } from '@/types/media'
import { itemKey } from '@/types/media'

const LS_PLAYLIST = 'bratan:playlist:v2'
const LS_VOLUME = 'bratan:volume:v1'
const LS_LOOP = 'bratan:loop:v1'
const LS_SOURCE = 'bratan:source:v1'
const LS_EQ = 'bratan:eq:v1'
const LS_TG_USER = 'bratan:tg_user:v1'
const LS_TG_SESSION = 'bratan:tg_session:v1'
const LS_PLAYS = 'bratan:plays:v1'

const VALID_SOURCES = new Set<ProviderSource>(['tidal', 'soundcloud', 'youtube'])

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch { /* noop */ }
}

export function loadPlaylist(): Track[] {
  try {
    const raw = safeGet(LS_PLAYLIST)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x: Track) => x && (typeof x.id === 'number' || typeof x.id === 'string'))
      .map((x: Track) => ({
        ...x,
        source: VALID_SOURCES.has(x.source) ? x.source : 'soundcloud' as ProviderSource,
      }))
  } catch { return [] }
}

export function savePlaylist(playlist: Track[]) {
  safeSet(LS_PLAYLIST, JSON.stringify(playlist))
}

export function loadSource(): ProviderSource {
  const s = safeGet(LS_SOURCE) as ProviderSource | null
  if (s && VALID_SOURCES.has(s)) return s
  return 'tidal'
}

export function saveSource(s: ProviderSource) {
  safeSet(LS_SOURCE, s)
}

export function loadVolume(): number {
  const v = parseInt(safeGet(LS_VOLUME) || '80', 10)
  return isNaN(v) ? 80 : Math.max(0, Math.min(100, v))
}

export function saveVolume(v: number) {
  safeSet(LS_VOLUME, String(v))
}

export function loadLoop(): boolean {
  return safeGet(LS_LOOP) === '1'
}

export function saveLoop(v: boolean) {
  safeSet(LS_LOOP, v ? '1' : '0')
}

export function loadEQGains(): number[] | null {
  try {
    const raw = safeGet(LS_EQ)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length === 10) return parsed
    return null
  } catch { return null }
}

export function saveEQGains(gains: number[]) {
  safeSet(LS_EQ, JSON.stringify(gains))
}

// Telegram auth
export interface TgUser {
  id: number
  username?: string
  first_name?: string
  photo_url?: string
  subscription?: { subscribed?: boolean; until?: number }
}

export function loadTgUser(): TgUser | null {
  try { return JSON.parse(safeGet(LS_TG_USER) || 'null') } catch { return null }
}

export function saveTgUser(u: TgUser | null) {
  if (u) safeSet(LS_TG_USER, JSON.stringify(u))
  else { try { localStorage.removeItem(LS_TG_USER) } catch { /* noop */ } }
}

export function loadTgSession(): string | null {
  return safeGet(LS_TG_SESSION)
}

export function saveTgSession(s: string | null) {
  if (s) safeSet(LS_TG_SESSION, s)
  else { try { localStorage.removeItem(LS_TG_SESSION) } catch { /* noop */ } }
}

// Paywall
const FREE_DAILY_LIMIT = 3
const ADMIN_TG_IDS = new Set([898846950, 422896004])

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface PlaysData { date: string; ids: string[] }

function readPlays(): PlaysData {
  try {
    const raw = JSON.parse(safeGet(LS_PLAYS) || 'null')
    if (raw && raw.date === todayKey() && Array.isArray(raw.ids)) return raw
  } catch { /* noop */ }
  return { date: todayKey(), ids: [] }
}

function writePlays(plays: PlaysData) {
  safeSet(LS_PLAYS, JSON.stringify(plays))
}

export function isSubscribed(): boolean {
  const user = loadTgUser()
  if (!user) return false
  if (ADMIN_TG_IDS.has(Number(user.id))) return true
  const sub = user.subscription
  if (!sub) return false
  if (sub.subscribed === true) return true
  if (sub.until && Number(sub.until) > Math.floor(Date.now() / 1000)) return true
  return false
}

export function canPlay(item: Track): boolean {
  if (isSubscribed()) return true
  const plays = readPlays()
  const key = itemKey(item)
  if (plays.ids.includes(key)) return true
  return plays.ids.length < FREE_DAILY_LIMIT
}

export function recordPlay(item: Track) {
  if (isSubscribed()) return
  const plays = readPlays()
  const key = itemKey(item)
  if (!plays.ids.includes(key)) {
    plays.ids.push(key)
    writePlays(plays)
  }
}

export function freePlaysLeft(): number {
  const plays = readPlays()
  return Math.max(0, FREE_DAILY_LIMIT - plays.ids.length)
}
