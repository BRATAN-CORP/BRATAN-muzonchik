import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadTgUser, saveTgUser, saveTgSession, type TgUser } from '@/lib/store'
import { apiTgLoginPoll, apiTgRefreshSubscription } from '@/lib/api'

const TG_BOT_USERNAME = 'bratan_muzonchik_bot'
const ADMIN_TG_IDS = new Set([898846950, 422896004])
const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 5 * 60 * 1000

function genLoginToken(): string {
  if (typeof window.crypto?.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '')
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function TelegramLogin() {
  const [user, setUser] = useState<TgUser | null>(() => loadTgUser())
  const [loading, setLoading] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deadline = useRef(0)

  const stopPoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    setLoading(false)
  }, [])

  const startLogin = useCallback(() => {
    const token = genLoginToken()
    saveTgSession(token)
    setLoading(true)
    deadline.current = Date.now() + POLL_TIMEOUT

    const url = `https://t.me/${TG_BOT_USERNAME}?start=login_${token}`
    window.open(url, '_blank')

    const poll = async () => {
      if (Date.now() > deadline.current) { stopPoll(); return }
      const data = await apiTgLoginPoll(token)
      if (data?.user) {
        const u: TgUser = data.user
        saveTgUser(u)
        setUser(u)
        stopPoll()

        const sub = await apiTgRefreshSubscription(token)
        if (sub?.subscription) {
          const updated = { ...u, subscription: sub.subscription }
          saveTgUser(updated)
          setUser(updated)
        }
      } else {
        pollTimer.current = setTimeout(poll, POLL_INTERVAL)
      }
    }
    poll()
  }, [stopPoll])

  const logout = useCallback(() => {
    saveTgUser(null)
    saveTgSession(null)
    setUser(null)
    stopPoll()
  }, [stopPoll])

  useEffect(() => {
    return () => stopPoll()
  }, [stopPoll])

  if (user) {
    const isAdmin = ADMIN_TG_IDS.has(Number(user.id))
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-card border border-border text-xs">
          {user.photo_url && (
            <img src={user.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          )}
          <span className="font-medium">
            {user.username ? `@${user.username}` : user.first_name || 'User'}
          </span>
          {isAdmin && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary text-[10px] font-bold text-white">
              <Shield className="w-2.5 h-2.5" />
              ADMIN
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Logout">
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startLogin}
      disabled={loading}
      className="gap-1.5"
    >
      <Send className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">
        {loading ? 'Waiting...' : 'Login via Telegram'}
      </span>
    </Button>
  )
}
