import { create } from 'zustand';
import { API_BASE } from '@/lib/api';
import { TG_BOT_USERNAME, TG_LOGIN_POLL_MS, TG_LOGIN_TIMEOUT_MS } from '@/lib/constants';

// Telegram deep-link auth. Flow:
//   1) Generate a random login token client-side.
//   2) Open t.me/<bot>?start=login_<token>.
//   3) Poll /tg/login/poll?token=<token> every 2s until the worker hands
//      back { user, session, subscription } (one-shot — the worker deletes
//      the key afterwards).
//
// The session token is stored in localStorage so playlist/featured sync
// survives a reload. Nothing sensitive ever leaves the backend — the
// client only gets the opaque session string.

export interface TgUser {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
}

export interface TgSubscription {
  subscribed: boolean;
  until: number;
  admin?: boolean;
}

interface AuthState {
  user: TgUser | null;
  session: string | null;
  subscription: TgSubscription | null;
  pendingToken: string | null;
  pollError: string | null;
  startLogin: () => string | null;
  cancelLogin: () => void;
  signOut: () => void;
  refreshSubscription: () => Promise<void>;
}

const LS_USER = 'bratan.tg.user.v1';
const LS_SESSION = 'bratan.tg.session.v1';
const LS_SUB = 'bratan.tg.sub.v1';

function randomToken(bytes = 24) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadInitial() {
  if (typeof window === 'undefined') {
    return { user: null, session: null, subscription: null };
  }
  return {
    user: safeJSON<TgUser>(localStorage.getItem(LS_USER)),
    session: localStorage.getItem(LS_SESSION),
    subscription: safeJSON<TgSubscription>(localStorage.getItem(LS_SUB)),
  };
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollDeadline = 0;

function clearPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  pollDeadline = 0;
}

export const useAuth = create<AuthState>((set, get) => ({
  ...loadInitial(),
  pendingToken: null,
  pollError: null,

  startLogin: () => {
    const token = randomToken(24);
    try {
      const url = `https://t.me/${TG_BOT_USERNAME}?start=login_${token}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      return null;
    }
    clearPoll();
    pollDeadline = Date.now() + TG_LOGIN_TIMEOUT_MS;
    set({ pendingToken: token, pollError: null });

    pollTimer = setInterval(async () => {
      if (Date.now() > pollDeadline) {
        clearPoll();
        set({ pendingToken: null, pollError: 'Время ожидания истекло. Попробуй ещё раз.' });
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/tg/login/poll?token=${encodeURIComponent(token)}`,
          { method: 'GET' },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          pending?: boolean;
          user?: TgUser;
          session?: string;
          subscription?: TgSubscription;
        };
        if (data.pending) return;
        if (!data.ok || !data.user || !data.session) return;
        clearPoll();
        localStorage.setItem(LS_USER, JSON.stringify(data.user));
        localStorage.setItem(LS_SESSION, data.session);
        if (data.subscription) {
          localStorage.setItem(LS_SUB, JSON.stringify(data.subscription));
        }
        set({
          user: data.user,
          session: data.session,
          subscription: data.subscription ?? null,
          pendingToken: null,
          pollError: null,
        });
      } catch {
        // transient network error — keep polling until deadline
      }
    }, TG_LOGIN_POLL_MS);

    return token;
  },

  cancelLogin: () => {
    clearPoll();
    set({ pendingToken: null, pollError: null });
  },

  signOut: () => {
    clearPoll();
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_SESSION);
      localStorage.removeItem(LS_SUB);
    } catch {
      /* ignore */
    }
    set({ user: null, session: null, subscription: null, pendingToken: null });
  },

  refreshSubscription: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const res = await fetch(
        `${API_BASE}/tg/status?id=${encodeURIComponent(String(user.id))}`,
      );
      const data = (await res.json()) as { ok?: boolean; subscription?: TgSubscription };
      if (data.ok && data.subscription) {
        localStorage.setItem(LS_SUB, JSON.stringify(data.subscription));
        set({ subscription: data.subscription });
      }
    } catch {
      /* ignore */
    }
  },
}));
