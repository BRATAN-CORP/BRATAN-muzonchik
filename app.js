// БРАТАН-музончик — music player (frontend).
// Three sources (unchanged from v1): Tidal / SoundCloud / YouTube, routed
// through a Cloudflare Worker proxy. Playlist in localStorage. Optional TG
// login for cross-device sync + paywall (3 free tracks/day).
//
// This file is the app entrypoint. It owns:
//   * DOM wiring to the new shell (see index.html)
//   * Hash router -> page views
//   * Unified play queue (playlist + search results)
//   * Integration with the shared Web Audio graph (EQ + visualizer)
//   * Fullscreen player overlay + mini-player synchronisation
//
// Intentionally written as a single classic <script> — the repo is deployed
// statically to GitHub Pages, no build step. The module-scripts loaded from
// assets/ expose helpers on window.BRATAN_* namespaces for us to consume.

(() => {
  'use strict';

  // ============================================================== Config ==

  const API_BASE = 'https://bratan-muzonchik.bratan-muzonchik.workers.dev';

  const LS = {
    PLAYLIST: 'bratan:playlist:v2',
    VOLUME:   'bratan:volume:v1',
    LOOP:     'bratan:loop:v1',
    SOURCE:   'bratan:source:v1',
    OFFICIAL: 'bratan:official-only:v1',
    FEATURED: 'bratan:featured:v1',
    TG_USER:  'bratan:tg_user:v1',
    TG_SESSION: 'bratan:tg_session:v1',
    PLAYS:    'bratan:plays:v1',
    THEME:    'bratan:theme:v1',
  };

  const SOURCES = { SC: 'soundcloud', YT: 'youtube', TD: 'tidal' };
  const VALID_SOURCES = new Set(Object.values(SOURCES));

  // Telegram paywall / auth constants.
  const TG_BOT_USERNAME = 'bratan_muzonchik_bot';
  const PAYWALL_TG_URL = `https://t.me/${TG_BOT_USERNAME}?start=pay`;
  const PAYWALL_PRICE_LABEL = 'Оплатить 99 ₽/мес';
  const FREE_DAILY_LIMIT = 3;
  const ADMIN_TG_IDS = new Set([898846950, 422896004]);
  const TG_LOGIN_POLL_INTERVAL_MS = 2000;
  const TG_LOGIN_POLL_TIMEOUT_MS = 5 * 60 * 1000;

  // ============================================================ DOM refs ==

  const $ = (sel, root) => (root || document).querySelector(sel);

  const els = {
    // Shell
    view:           $('#view'),
    status:         null, // created dynamically per page
    sidebar:        $('#sidebar'),
    sidebarToggle:  $('#sidebarToggle'),
    themeToggle:    $('#themeToggle'),

    // Topbar
    search:         $('#search'),
    searchForm:     $('#searchForm'),
    sourceSel:      $('#sourceSel'),
    officialToggle: $('#officialToggle'),
    installBtn:     $('#installBtn'),
    navBack:        $('[data-nav-back]'),
    navForward:     $('[data-nav-forward]'),

    // TG auth
    tgLoginBtn:     $('#tgLoginBtn'),
    tgUserPill:     $('#tgUserPill'),
    tgUserPhoto:    $('#tgUserPhoto'),
    tgUserName:     $('#tgUserName'),
    tgAdminBadge:   $('#tgAdminBadge'),
    tgLogoutBtn:    $('#tgLogoutBtn'),
    payBtn:         $('#payBtn'),
    sidebarPlaylistHint: $('#sidebarPlaylistHint'),

    // Mini player
    audio:          $('#audioEl'),
    ytWrap:         $('#ytEmbedWrap'),
    nowArt:         $('#nowArt'),
    nowThumb:       $('#nowThumb'),
    nowTitle:       $('#nowTitle'),
    nowArtist:      $('#nowArtist'),
    shuffleBtn:     $('#shuffleBtn'),
    prevBtn:        $('#prevBtn'),
    playBtn:        $('#playBtn'),
    nextBtn:        $('#nextBtn'),
    loopBtn:        $('#loopBtn'),
    likeBtn:        $('#likeBtn'),
    seek:           $('#seek'),
    volume:         $('#volume'),
    curTime:        $('#curTime'),
    durTime:        $('#durTime'),
    quality:        $('#qualityBadge'),
    eqBtn:          $('#eqBtn'),
    queueBtn:       $('#queueBtn'),
    fullscreenBtn:  $('#fullscreenBtn'),

    // Fullscreen
    fullplayer:     $('#fullplayer'),
    fullCloseBtn:   $('#fullCloseBtn'),
    fullArt:        $('#fullArt'),
    fullTitle:      $('#fullTitle'),
    fullArtist:     $('#fullArtist'),
    fullKicker:     $('#fullKicker'),
    fullSeek:       $('#fullSeek'),
    fullCur:        $('#fullCur'),
    fullDur:        $('#fullDur'),
    fullPlay:       $('#fullPlay'),
    fullPrev:       $('#fullPrev'),
    fullNext:       $('#fullNext'),
    fullShuffle:    $('#fullShuffle'),
    fullLoop:       $('#fullLoop'),
    fullEqBtn:      $('#fullEqBtn'),
    fullEqPanel:    $('#fullEqPanel'),
    fullArtistBtn:  $('#fullArtistBtn'),
    fullAlbumBtn:   $('#fullAlbumBtn'),
    vizCanvas:      $('#vizCanvas'),

    // Modals / hidden inputs
    paywallModal:   $('#paywallModal'),
    paywallCta:     $('#paywallCta'),
    importFile:     $('#importFile'),
    featuredImgFile: $('#featuredImgFile'),
  };

  // ============================================================== State ===

  const state = {
    source: loadSource(),
    officialOnly: loadOfficialOnly(),
    resultTab: 'tracks',             // 'tracks' | 'albums' | 'playlists' (SC only)
    lastQuery: '',
    results: [],                      // normalized search items
    sets: [],                         // SC albums/playlists
    featured: loadFeaturedLocal(),
    playlist: loadPlaylist(),
    currentId: null,
    currentItem: null,
    currentList: null,                // 'playlist' | 'results' | 'set'
    currentRoute: '/',
    isPlaying: false,
    loop: localStorage.getItem(LS.LOOP) === '1',
    volume: clampInt(parseInt(localStorage.getItem(LS.VOLUME) || '80', 10), 0, 100),
    consecutiveErrors: 0,
    currentReqToken: 0,
    hls: null,
    ytPlayer: null,
    ytReadyP: null,
    ytTimer: null,
    audioGraphReady: false,
    vizStop: null,
    eqInstance: null,
  };

  // =============================================================== Utils ==

  function clampInt(n, min, max) { n = parseInt(n, 10); if (isNaN(n)) return min; return Math.max(min, Math.min(max, n)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function setRangeFill(input) {
    const min = parseFloat(input.min || 0), max = parseFloat(input.max || 100);
    const val = parseFloat(input.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', pct + '%');
  }
  function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, mode: 'cors' }).finally(() => clearTimeout(t));
  }
  function itemKey(item) { return `${item.source}:${item.id}`; }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ----- Cover helpers -----------------------------------------------------
  // Stable pseudo-hash of a string → [0..1) — used to derive two deterministic
  // hues for the liquid-glass fallback cover from an item's title+artist, so
  // the fallback always looks the same for the same track.
  function strHash(s) {
    let h = 0;
    for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return ((h >>> 0) % 1000) / 1000;
  }
  function coverColors(item) {
    const seed = strHash((item && (item.title || '')) + '|' + (item && (item.artist || '')));
    const h1 = Math.floor(seed * 360);
    const h2 = (h1 + 60 + Math.floor(seed * 80)) % 360;
    return {
      c1: `hsl(${h1}, 70%, 55%)`,
      c2: `hsl(${h2}, 70%, 50%)`,
    };
  }
  function coverInitials(item) {
    const t = (item && (item.title || '')).trim();
    const a = (item && (item.artist || '')).trim();
    if (t && a) {
      return (t[0] + a[0]).toUpperCase();
    }
    const s = t || a || '?';
    return s.slice(0, 2).toUpperCase();
  }
  function applyCover(imgEl, item, opts = {}) {
    if (!imgEl) return;
    const parent = imgEl.parentElement;
    // Always rebuild the fallback so a cover change wipes any stale one.
    if (parent) {
      const prev = parent.querySelector('.cover-fallback');
      if (prev) prev.remove();
    }
    const thumb = item && item.thumb;
    if (thumb) {
      imgEl.hidden = false;
      imgEl.src = thumb;
      imgEl.alt = item && (item.artist || item.title) || '';
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.removeAttribute('src');
        imgEl.hidden = true;
        attachFallback(parent, item);
      };
      return;
    }
    imgEl.hidden = true;
    imgEl.removeAttribute('src');
    attachFallback(parent, item);
  }
  // Apply a Telegram user's avatar to an <img>, falling back to a deterministic
  // "initials on gradient" avatar when the user didn't expose a photo_url (rare
  // but happens for users with a default avatar). No external Telegram API is
  // hit — the Login Widget gives us photo_url directly on success, so this is
  // purely a presentational fallback.
  function applyTgAvatar(imgEl, user) {
    if (!imgEl) return;
    const wrap = imgEl.parentElement;
    if (wrap) {
      const prev = wrap.querySelector('.tg-avatar-fallback');
      if (prev) prev.remove();
    }
    if (user && user.photo_url) {
      imgEl.hidden = false;
      imgEl.src = user.photo_url;
      imgEl.alt = user.first_name || user.username || '';
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.removeAttribute('src');
        imgEl.hidden = true;
        attachTgFallback(wrap, user);
      };
      return;
    }
    imgEl.hidden = true;
    imgEl.removeAttribute('src');
    attachTgFallback(wrap, user);
  }
  function attachTgFallback(wrap, user) {
    if (!wrap) return;
    const seed = strHash(String((user && (user.username || user.first_name || user.id)) || '?'));
    const h1 = Math.floor(seed * 360);
    const h2 = (h1 + 45) % 360;
    const el = document.createElement('span');
    el.className = 'tg-avatar-fallback';
    el.style.background = `linear-gradient(135deg, hsl(${h1}, 65%, 55%), hsl(${h2}, 65%, 50%))`;
    const initial = ((user && (user.first_name || user.username)) || '?')
      .trim().slice(0, 1).toUpperCase();
    el.textContent = initial;
    wrap.appendChild(el);
  }

  function attachFallback(parent, item) {
    if (!parent) return;
    const { c1, c2 } = coverColors(item || {});
    const el = document.createElement('div');
    el.className = 'cover-fallback';
    el.style.setProperty('--c1', c1);
    el.style.setProperty('--c2', c2);
    el.setAttribute('aria-hidden', 'true');
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.textContent = coverInitials(item || {});
    el.appendChild(glyph);
    parent.appendChild(el);
  }

  // ----- Icon helpers ------------------------------------------------------
  function renderIcons(root) {
    if (window.BRATAN_ICONS) window.BRATAN_ICONS.hydrateIcons(root || document);
  }
  function iconSvg(name, size, stroke) {
    if (!window.BRATAN_ICONS) return '';
    return window.BRATAN_ICONS.icon(name, { size: size || 18, strokeWidth: stroke || 2 });
  }
  function swapIcon(btn, name, size) {
    if (!btn || !window.BRATAN_ICONS) return;
    const span = btn.querySelector('.icon') || btn;
    span.innerHTML = window.BRATAN_ICONS.icon(name, { size: size || 18 });
  }

  // ----- Status-line helper (lives at top of the current page) ------------
  function setStatus(text, { busy } = {}) {
    if (!els.status) return;
    const msg = els.status.querySelector('.msg');
    const dot = els.status.querySelector('.dot');
    if (msg) msg.textContent = text || '';
    if (dot) els.status.classList.toggle('is-idle', !busy && !text);
  }

  // ---------- Storage helpers (playlist / featured / source / etc) --------

  function savePlaylist() {
    localStorage.setItem(LS.PLAYLIST, JSON.stringify(state.playlist));
    scheduleServerPlaylistPush();
  }
  function loadPlaylist() {
    try {
      const raw = localStorage.getItem(LS.PLAYLIST);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x) => x && (typeof x.id === 'number' || typeof x.id === 'string'))
        .map((x) => {
          const src = VALID_SOURCES.has(x.source) ? x.source : SOURCES.SC;
          return { ...x, source: src };
        });
    } catch { return []; }
  }
  function loadSource() {
    const s = localStorage.getItem(LS.SOURCE);
    if (s && VALID_SOURCES.has(s)) return s;
    return SOURCES.TD;
  }
  function saveSource(s) { localStorage.setItem(LS.SOURCE, s); }
  function loadOfficialOnly() { return localStorage.getItem(LS.OFFICIAL) === '1'; }
  function saveOfficialOnly(v) { localStorage.setItem(LS.OFFICIAL, v ? '1' : '0'); }

  function loadFeaturedLocal() {
    try {
      const s = localStorage.getItem(LS.FEATURED);
      if (!s) return null;
      const f = JSON.parse(s);
      if (f && f.item && f.item.id && f.item.source) return f;
    } catch {}
    return null;
  }
  function saveFeaturedLocal(f) {
    if (f && f.item) localStorage.setItem(LS.FEATURED, JSON.stringify(f));
    else localStorage.removeItem(LS.FEATURED);
  }

  // ============================================================ Filtering ==
  //
  // Keep exactly the same official-only policy as v1 — the dictionary of
  // known "reupload" patterns + "verified / has publisher_metadata" rule for
  // SoundCloud. Mirroring the previous behaviour means the worker keeps
  // working, and users don't lose the "hide covers/karaoke/nightcore" option.

  const REUPLOAD_PATTERNS = [
    /\breupload(ed)?\b/i, /\bkaraoke\b/i, /\bcover\b/i,
    /\bsped\s*up\b/i, /\bspedup\b/i, /\bslowed\b/i, /\breverb\b/i,
    /\b8d\s*(audio|version)\b/i, /\bnightcore\b/i,
    /\bfan\s*(made|edit|remix|version)\b/i, /\bmashup\b/i,
    /\blyric(s)?\s*video\b/i, /\bremix\b/i, /\binstrumental\b/i,
    /\bacapella\b/i, /\ba\s*capella\b/i, /\btype\s*beat\b/i, /\bfull\s*album\b/i,
  ];
  function looksLikeReupload(title, artist) {
    const t = (title || '') + ' ' + (artist || '');
    return REUPLOAD_PATTERNS.some((re) => re.test(t));
  }

  function isPlayableSCTrack(tr) {
    if (!tr || tr.kind !== 'track') return false;
    if (tr.state !== 'finished') return false;
    if (tr.streamable === false) return false;
    if (tr.sharing && tr.sharing !== 'public') return false;
    if (!pickHlsMp3Transcoding(tr)) return false;
    return true;
  }
  function isOfficialSCTrack(tr) {
    if (!isPlayableSCTrack(tr)) return false;
    const user = tr.user || {};
    const pm = tr.publisher_metadata || null;
    const verified = user.verified === true;
    const hasPublisherReleaseInfo = !!(pm && (pm.artist || pm.album_title || pm.isrc));
    if (!verified && !hasPublisherReleaseInfo) return false;
    if (looksLikeReupload(tr.title, user.username)) return false;
    return true;
  }
  function pickHlsMp3Transcoding(tr) {
    const list = (tr && tr.media && Array.isArray(tr.media.transcodings)) ? tr.media.transcodings : [];
    return list.find((t) => {
      const fmt = t.format || {};
      return fmt.protocol === 'hls' && fmt.mime_type === 'audio/mpeg';
    }) || null;
  }
  function normalizeSCTrack(tr) {
    const user = tr.user || {};
    const pm = tr.publisher_metadata || {};
    const artist = (pm.artist || user.username || 'Неизвестный исполнитель').trim();
    let thumb = tr.artwork_url || user.avatar_url || '';
    if (thumb) thumb = thumb.replace(/-large(\.[a-z]+)$/i, '-t300x300$1');
    return {
      source: SOURCES.SC,
      id: tr.id,
      urn: tr.urn || `soundcloud:tracks:${tr.id}`,
      title: (tr.title || '').trim() || '(без названия)',
      artist,
      artistId: (user.id != null) ? String(user.id) : '',
      thumb,
      duration: tr.duration ? Math.round(tr.duration / 1000) : null,
      verified: (user.verified === true),
      permalink: tr.permalink_url || '',
      transcoding: pickHlsMp3Transcoding(tr)?.url || null,
    };
  }

  function normalizeYtItem(it) {
    return {
      source: SOURCES.YT,
      id: it.id,
      title: (it.title || '').trim() || '(без названия)',
      artist: (it.uploader || 'YouTube').replace(/\s*-\s*Topic$/i, ''),
      artistId: it.uploaderId || '',
      thumb: it.thumbnail || `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`,
      duration: typeof it.duration === 'number' ? it.duration : null,
      verified: !!it.verified || /-?\s*Topic$/i.test(it.uploader || ''),
      permalink: `https://music.youtube.com/watch?v=${it.id}`,
    };
  }
  function isPlayableYt(item) {
    if (!item || !item.id) return false;
    if (item.duration != null && item.duration < 30) return false;
    return true;
  }
  function isOfficialYt(item) {
    if (!isPlayableYt(item)) return false;
    if (looksLikeReupload(item.title, item.artist)) return false;
    return true;
  }

  function normalizeTidalItem(it) {
    return {
      source: SOURCES.TD,
      id: it.id,
      title: (it.title || '').trim() || '(без названия)',
      artist: it.artist || (it.artists && it.artists[0]) || 'Tidal',
      artistId: it.artistId || '',
      albumId: it.albumId || '',
      album: it.album || '',
      thumb: it.cover || '',
      duration: typeof it.duration === 'number' ? it.duration : null,
      verified: true,
      permalink: `https://tidal.com/browse/track/${it.id}`,
      audioQuality: it.audioQuality || null,
      explicit: !!it.explicit,
    };
  }
  function isOfficialTidal(item) {
    if (!item || !item.id) return false;
    if (item.duration != null && item.duration < 30) return false;
    return true;
  }

  function normalizeScSet(s) {
    const user = s.user || {};
    let thumb = s.artwork_url || (user.avatar_url || '');
    if (thumb) thumb = thumb.replace(/-large(\.[a-z]+)$/i, '-t300x300$1');
    return {
      id: s.id,
      title: (s.title || '').trim() || '(без названия)',
      artist: (user.username || '').trim() || 'SoundCloud',
      thumb,
      trackCount: s.track_count || 0,
      kind: s.set_type || (s.is_album ? 'album' : 'playlist'),
    };
  }

  // ================================================================ API ===

  async function searchSoundCloud(query) {
    const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=40`;
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return Array.isArray(data.collection) ? data.collection : [];
  }
  async function searchYouTube(query) {
    const url = `${API_BASE}/yt/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) {
      let body = {}; try { body = await res.json(); } catch {}
      throw new Error(body.error || ('HTTP ' + res.status));
    }
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }
  async function searchTidal(query) {
    const url = `${API_BASE}/tidal/search?q=${encodeURIComponent(query)}&limit=30`;
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) {
      let body = {}; try { body = await res.json(); } catch {}
      throw new Error(body.error || ('HTTP ' + res.status));
    }
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }
  async function searchScSets(query, kind) {
    const url = `${API_BASE}/sc/${kind}?q=${encodeURIComponent(query)}&limit=30`;
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return Array.isArray(data.collection) ? data.collection : [];
  }
  async function fetchScSet(id) {
    const url = `${API_BASE}/sc/set?id=${encodeURIComponent(id)}`;
    const res = await fetchWithTimeout(url, 20000);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function runSearch(query, { replaceResults = true } = {}) {
    const q = (query == null ? (els.search && els.search.value) : query).trim();
    state.lastQuery = q;
    if (!q) return;
    const resultsHost = $('#resultsHost');
    if (resultsHost && replaceResults) resultsHost.innerHTML = '';
    const srcLabel = state.source === SOURCES.TD ? 'Tidal'
      : state.source === SOURCES.YT ? 'YouTube Music'
      : 'SoundCloud';
    setStatus(`Ищу на ${srcLabel}…`, { busy: true });
    try {
      // Note: every tab except "playlists" (SoundCloud-specific) is derived
      // from the shared track search — albums/artists are grouped client-side
      // from the Tidal/YouTube/SC track results. This keeps backend contract
      // unchanged while still giving the user real album + artist cards.
      if (state.resultTab === 'playlists' && state.source === SOURCES.SC) {
        const raw = await searchScSets(q, 'playlists');
        const sets = raw.map(normalizeScSet).filter((s) => s.id);
        state.sets = sets; state.results = [];
        renderSearchResults();
        setStatus(sets.length ? `Найдено: ${sets.length} плейлистов.` : 'Не нашёл плейлистов.');
      } else if (state.source === SOURCES.TD) {
        const raw = await searchTidal(q);
        const items = raw.map(normalizeTidalItem).filter(isOfficialTidal);
        state.results = items; state.sets = [];
        renderSearchResults();
        setStatus(items.length ? `Найдено: ${items.length} треков (Tidal).` : 'Ничего не нашёл.');
      } else if (state.source === SOURCES.YT) {
        const raw = await searchYouTube(q);
        const passes = state.officialOnly ? isOfficialYt : isPlayableYt;
        const items = raw.map(normalizeYtItem).filter(passes);
        state.results = items; state.sets = [];
        renderSearchResults();
        const dropped = raw.length - items.length;
        if (!items.length && raw.length) setStatus('Только перезаливы или каверы — уточни запрос.');
        else if (!items.length) setStatus('Ничего не нашёл.');
        else if (state.officialOnly && dropped > 0) setStatus(`Найдено: ${items.length} · отсеял ${dropped}.`);
        else setStatus(`Найдено: ${items.length} треков (YouTube).`);
      } else if (state.resultTab === 'albums' && state.source === SOURCES.SC) {
        // SoundCloud has a real album endpoint — prefer it over client grouping.
        const raw = await searchScSets(q, 'albums');
        const sets = raw.map(normalizeScSet).filter((s) => s.id);
        state.sets = sets; state.results = [];
        renderSearchResults();
        setStatus(sets.length ? `Найдено: ${sets.length} альбомов.` : 'Не нашёл альбомов.');
      } else {
        // SoundCloud tracks path — also used to derive the "artists" tab.
        const raw = await searchSoundCloud(q);
        const passes = state.officialOnly ? isOfficialSCTrack : isPlayableSCTrack;
        const items = raw.filter(passes).map(normalizeSCTrack);
        state.results = items; state.sets = [];
        renderSearchResults();
        const dropped = raw.length - items.length;
        if (!items.length && raw.length && state.officialOnly) setStatus('Только перезаливы — выключи «только официал».');
        else if (!items.length) setStatus('Ничего не нашёл.');
        else if (state.officialOnly && dropped > 0) setStatus(`Найдено: ${items.length} · отсеял ${dropped}.`);
        else setStatus(`Найдено: ${items.length} треков (SoundCloud).`);
      }
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) || 'сеть';
      if (state.source === SOURCES.YT && /piped|unreachable|bot/i.test(msg)) {
        setStatus('YouTube временно недоступен. Переключись на другой источник.');
      } else if (state.source === SOURCES.TD) {
        setStatus('Tidal недоступен: ' + msg + '.');
      } else {
        setStatus('Поиск не удался: ' + msg);
      }
    }
  }

  // =========================================================== Rendering ==
  //
  // Generic row / card factories. The templates in index.html keep markup
  // declarative — we never build HTML strings from untrusted data, we clone
  // a template and fill specific `.title` / `.sub` etc via .textContent.

  function fillRow(node, item, opts) {
    const img = node.querySelector('.thumb');
    if (img) {
      img.loading = 'lazy';
      applyCover(img, item);
    }

    const titleEl = node.querySelector('.title');
    titleEl.textContent = '';
    titleEl.appendChild(document.createTextNode(item.title));
    if (item.verified) {
      const v = document.createElement('span');
      v.className = 'badge-verified';
      v.title = 'Верифицированный';
      v.innerHTML = iconSvg('verified', 14, 2);
      titleEl.appendChild(document.createTextNode(' '));
      titleEl.appendChild(v);
    }

    const durStr = item.duration ? ' · ' + fmtTime(item.duration) : '';
    const srcTag = item.source === SOURCES.YT ? 'YouTube'
      : item.source === SOURCES.TD ? 'Tidal'
      : 'SoundCloud';
    const qTag = (item.source === SOURCES.TD && item.audioQuality)
      ? ' · ' + tidalQualityLabel(item.audioQuality)
      : '';
    const parts = [srcTag, item.artist + durStr + qTag].filter(Boolean);
    node.querySelector('.sub').textContent = parts.join(' · ');

    const dl = node.querySelector('.dl');
    if (dl) {
      if (item.source === SOURCES.TD) {
        dl.hidden = false;
        dl.addEventListener('click', (ev) => { ev.stopPropagation(); downloadTidal(item); });
      } else { dl.hidden = true; }
    }

    // Clicking the meta (title/artist) navigates to artist page for that track.
    const meta = node.querySelector('.meta');
    if (meta) {
      meta.addEventListener('click', () => openArtistForItem(item));
      meta.style.cursor = 'pointer';
    }

    if (opts && opts.index != null) {
      const idx = node.querySelector('.idx');
      if (idx) idx.textContent = String(opts.index + 1);
    }
  }

  function tidalQualityLabel(q) {
    switch ((q || '').toUpperCase()) {
      case 'HI_RES_LOSSLESS': return 'HiRes FLAC';
      case 'HI_RES': return 'MQA';
      case 'LOSSLESS': return 'FLAC 16/44';
      case 'HIGH': return 'AAC 320';
      case 'LOW': return 'AAC 96';
      default: return q || '';
    }
  }

  function downloadTidal(item) {
    if (!item || item.source !== SOURCES.TD) return;
    const url = `${API_BASE}/tidal/download?id=${encodeURIComponent(item.id)}&quality=LOSSLESS`;
    const a = document.createElement('a');
    a.href = url; a.download = ''; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setStatus(`Качаю «${item.title}»…`);
  }

  function renderTrackList(host, items, listHint, { sortable } = {}) {
    host.innerHTML = '';
    if (!items.length) {
      host.innerHTML = '<div class="empty"><h3>Пусто</h3><p>Добавь треки или поищи что-нибудь.</p></div>';
      return;
    }
    const tplId = sortable ? 'tpl-playlist-row' : 'tpl-track-row';
    const tpl = document.getElementById(tplId);
    const ul = document.createElement('ul');
    ul.className = 'track-list';
    const curKey = state.currentItem ? itemKey(state.currentItem) : null;
    const featKey = state.featured && state.featured.item ? itemKey(state.featured.item) : null;

    items.forEach((item, idx) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = String(item.id);
      node.dataset.index = String(idx);
      fillRow(node, item, { index: idx });

      const playBtn = node.querySelector('.play');
      if (playBtn) playBtn.addEventListener('click', (ev) => { ev.stopPropagation(); playItem(item, listHint); });
      node.addEventListener('dblclick', () => playItem(item, listHint));

      const addBtn = node.querySelector('.add');
      if (addBtn) addBtn.addEventListener('click', (ev) => { ev.stopPropagation(); addToPlaylist(item); });

      const rmBtn = node.querySelector('.remove');
      if (rmBtn) rmBtn.addEventListener('click', (ev) => { ev.stopPropagation(); removeFromPlaylist(item); });

      const pinBtn = node.querySelector('.pin');
      if (pinBtn && loadTgUser()) {
        pinBtn.hidden = false;
        if (featKey && itemKey(item) === featKey) pinBtn.classList.add('is-active');
        pinBtn.addEventListener('click', (ev) => { ev.stopPropagation(); pinTrackAsFeatured(item); });
      }

      if (sortable) attachDragHandlers(node);

      if (curKey && itemKey(item) === curKey && (!listHint || state.currentList === listHint)) {
        node.classList.add('is-playing');
        // replace idx with EQ indicator bars
        const idxCell = node.querySelector('.idx');
        if (idxCell) {
          idxCell.innerHTML = '<span class="eq-indicator" aria-hidden="true"><span></span><span></span><span></span></span>';
        }
      }

      ul.appendChild(node);
    });
    host.appendChild(ul);
    renderIcons(host);
  }

  function renderSetList(host, sets) {
    host.innerHTML = '';
    if (!sets.length) {
      host.innerHTML = '<div class="empty"><h3>Ничего нет</h3><p>Попробуй другой запрос.</p></div>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'track-list';
    const tpl = document.getElementById('tpl-set-row');
    sets.forEach((s, idx) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const img = node.querySelector('.thumb');
      if (img) { img.loading = 'lazy'; applyCover(img, { title: s.title, artist: s.artist, thumb: s.thumb }); }
      const idxCell = node.querySelector('.idx');
      if (idxCell) idxCell.textContent = String(idx + 1);
      node.querySelector('.title').textContent = s.title;
      const countLabel = s.trackCount ? ` · ${s.trackCount} трек.` : '';
      node.querySelector('.sub').textContent = `${s.artist}${countLabel}`;
      const openBtn = node.querySelector('.open-set');
      if (openBtn) openBtn.addEventListener('click', () => window.BRATAN_ROUTER.navigate(`/album/${SOURCES.SC}/${encodeURIComponent(s.id)}`));
      node.addEventListener('dblclick', () => openScSet(s));
      ul.appendChild(node);
    });
    host.appendChild(ul);
    renderIcons(host);
  }

  function renderSearchResults() {
    const host = $('#resultsHost');
    if (!host) return;
    if (state.resultTab === 'albums') {
      if (state.sets && state.sets.length) {
        renderSetList(host, state.sets);
        return;
      }
      const albums = groupByAlbum(state.results || []);
      if (!albums.length) {
        host.innerHTML = '<div class="empty"><h3>Альбомы не найдены</h3><p>Попробуй другой запрос или переключи источник.</p></div>';
        return;
      }
      renderAlbumGrid(host, albums);
      return;
    }
    if (state.resultTab === 'artists') {
      const artists = groupByArtist(state.results || []);
      if (!artists.length) {
        host.innerHTML = '<div class="empty"><h3>Артисты не найдены</h3><p>Попробуй другой запрос.</p></div>';
        return;
      }
      renderArtistGrid(host, artists);
      return;
    }
    if (state.sets && state.sets.length) {
      renderSetList(host, state.sets);
      return;
    }
    renderTrackList(host, state.results, 'results', { sortable: false });
  }

  // Group raw track results by album (falling back to a synthetic key built
  // from the artist name + album title when the backend didn't give us IDs).
  function groupByAlbum(items) {
    const map = new Map();
    for (const it of items) {
      const key = it.albumId ? `${it.source}:${it.albumId}` : (it.album ? `${it.source}:${it.artist}::${it.album}` : null);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          id: it.albumId || `${it.artist}__${it.album}`,
          source: it.source,
          title: it.album || it.title,
          artist: it.artist,
          thumb: it.thumb,
          tracks: [],
        });
      }
      map.get(key).tracks.push(it);
    }
    return Array.from(map.values()).sort((a, b) => b.tracks.length - a.tracks.length);
  }
  function groupByArtist(items) {
    const map = new Map();
    for (const it of items) {
      const key = it.artistId ? `${it.source}:${it.artistId}` : `${it.source}::${(it.artist || '').toLowerCase()}`;
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          id: it.artistId || it.artist,
          source: it.source,
          name: it.artist,
          thumb: it.thumb,
          tracks: [],
        });
      }
      map.get(key).tracks.push(it);
    }
    return Array.from(map.values()).sort((a, b) => b.tracks.length - a.tracks.length);
  }
  function renderAlbumGrid(host, albums) {
    host.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid';
    const tpl = document.getElementById('tpl-grid-card');
    albums.forEach((al) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const art = node.querySelector('.art');
      const img = node.querySelector('.art img');
      applyCover(img, { title: al.title, artist: al.artist, thumb: al.thumb });
      node.querySelector('.title').textContent = al.title;
      node.querySelector('.sub').textContent = `${al.artist} · ${al.tracks.length} трек.`;
      const play = node.querySelector('.play-overlay');
      if (play) play.addEventListener('click', (ev) => { ev.stopPropagation(); playItem(al.tracks[0], 'results'); });
      art.addEventListener('click', () => openAlbumGroup(al));
      grid.appendChild(node);
    });
    host.appendChild(grid);
    renderIcons(host);
  }
  function renderArtistGrid(host, artists) {
    host.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid';
    const tpl = document.getElementById('tpl-grid-card');
    artists.forEach((ar) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.classList.add('artist');
      const art = node.querySelector('.art');
      const img = node.querySelector('.art img');
      applyCover(img, { title: ar.name, artist: ar.name, thumb: ar.thumb });
      node.querySelector('.title').textContent = ar.name;
      node.querySelector('.sub').textContent = `${ar.tracks.length} трек.`;
      const play = node.querySelector('.play-overlay');
      if (play) play.addEventListener('click', (ev) => { ev.stopPropagation(); playItem(ar.tracks[0], 'results'); });
      art.addEventListener('click', () => openArtistForItem(ar.tracks[0]));
      grid.appendChild(node);
    });
    host.appendChild(grid);
    renderIcons(host);
  }
  function openAlbumGroup(al) {
    // Tidal has a real album route; for the derived groups we just swap to the
    // Tracks tab and filter results locally so the user sees that album's list.
    if (al.source === SOURCES.TD && al.tracks[0] && al.tracks[0].albumId) {
      window.BRATAN_ROUTER.navigate(`/album/${al.source}/${encodeURIComponent(al.tracks[0].albumId)}`);
      return;
    }
    state.resultTab = 'tracks';
    state.results = al.tracks;
    state.sets = [];
    mountPage(pageSearch());
    wireSearchTabs();
    renderSearchResults();
  }

  // ---------- Drag-and-drop playlist reordering ---------------------------
  let dragSrcIndex = null;
  function attachDragHandlers(node) {
    node.addEventListener('dragstart', (e) => {
      dragSrcIndex = parseInt(node.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragSrcIndex)); } catch {}
      node.style.opacity = '0.5';
    });
    node.addEventListener('dragend', () => { node.style.opacity = ''; dragSrcIndex = null; });
    node.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    node.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = dragSrcIndex;
      const to = parseInt(node.dataset.index, 10);
      if (from == null || isNaN(to) || from === to) return;
      const item = state.playlist.splice(from, 1)[0];
      state.playlist.splice(to, 0, item);
      savePlaylist();
      if (els.view) renderCurrentRoute();
    });
  }

  // =============================================================== Pages ==
  //
  // Each page returns clean HTML skeletons; data-heavy nodes (track lists)
  // are populated imperatively by the render helpers above.

  function pageLanding() {
    const playing = state.playlist.length;
    return `
      <section class="landing">
        <div class="landing-inner">
          <div class="landing-eyebrow">Минималистичный музыкальный плеер</div>
          <h1>Слушай что хочешь.<br/><span class="gradient-text">Без лишних понтов.</span></h1>
          <p>Поиск по Tidal lossless, SoundCloud и YouTube. Локальный плейлист, эквалайзер, оффлайн-установка. Один красивый интерфейс — на ноутбуке, телефоне и в PWA.</p>
          <div class="landing-actions">
            <button class="btn btn-accent btn-lg" data-action="focus-search">
              ${iconSvg('search', 18)} <span>Найти музыку</span>
            </button>
            <a class="btn btn-ghost btn-lg" href="#/library">
              ${iconSvg('library', 18)} <span>Моя музыка${playing ? ` · ${playing}` : ''}</span>
            </a>
          </div>
        </div>
      </section>

      <section class="landing-features">
        <div class="feature">
          <div class="icon-wrap">${iconSvg('music', 20)}</div>
          <h3>Полный поиск</h3>
          <p>Tidal lossless, SoundCloud и YouTube — не только «официалы». Фильтр перезаливов — опционально.</p>
        </div>
        <div class="feature">
          <div class="icon-wrap">${iconSvg('sliders', 20)}</div>
          <h3>Эквалайзер с пресетами</h3>
          <p>10 полос, готовые пресеты (Bass, Vocal, Rock и&nbsp;др.) и свои — всё сохраняется локально.</p>
        </div>
        <div class="feature">
          <div class="icon-wrap">${iconSvg('maximize', 20)}</div>
          <h3>Полноэкранный плеер</h3>
          <p>Большая обложка, анимация звука&nbsp;— волны, пульс. Всё как в Spotify и Яндекс&nbsp;Музыке.</p>
        </div>
        <div class="feature">
          <div class="icon-wrap">${iconSvg('install', 20)}</div>
          <h3>PWA и оффлайн</h3>
          <p>Установи как приложение, интерфейс работает без сети. Плейлист — в твоём браузере, не в облаке.</p>
        </div>
      </section>

      <section class="section-head"><h2>Последние добавленные</h2><a class="btn btn-ghost btn-sm" href="#/library">Открыть</a></section>
      <div id="resultsHost"></div>
    `;
  }

  function pageSearch() {
    // Three tabs visible for every source; "Плейлисты" only makes sense on
    // SoundCloud so we hide it for Tidal/YouTube.
    const showPlaylists = state.source === SOURCES.SC;
    return `
      <div class="section-head">
        <h2>Поиск</h2>
        <div class="status-bar is-idle" id="statusBar"><span class="dot"></span><span class="msg"></span></div>
      </div>
      <div id="searchTabs" class="tabs" role="tablist" style="margin-bottom: var(--s-4);">
        <button class="tab ${state.resultTab === 'tracks' ? 'is-active' : ''}" data-tab="tracks" type="button">Треки</button>
        <button class="tab ${state.resultTab === 'albums' ? 'is-active' : ''}" data-tab="albums" type="button">Альбомы</button>
        <button class="tab ${state.resultTab === 'artists' ? 'is-active' : ''}" data-tab="artists" type="button">Артисты</button>
        ${showPlaylists ? `<button class="tab ${state.resultTab === 'playlists' ? 'is-active' : ''}" data-tab="playlists" type="button">Плейлисты</button>` : ''}
      </div>
      <div id="resultsHost"></div>
    `;
  }

  function pageLibrary() {
    return `
      <div class="section-head">
        <h2>Моя музыка</h2>
        <div class="status-bar is-idle" id="statusBar"><span class="dot"></span><span class="msg"></span></div>
      </div>

      <div id="featuredHost"></div>

      <div class="section-head" style="margin-top: var(--s-4);">
        <h2 style="font-size: 16px;">Плейлист · <span id="plCount" style="color: var(--text-2); font-weight: 500;"></span></h2>
        <div style="display:flex; gap: var(--s-1);">
          <button class="icon-btn icon-btn-sm" id="btnPlShuffle" type="button" title="Перемешать">${iconSvg('shuffle2', 16)}</button>
          <button class="icon-btn icon-btn-sm" id="btnPlExport" type="button" title="Экспорт JSON">${iconSvg('download', 16)}</button>
          <button class="icon-btn icon-btn-sm" id="btnPlImport" type="button" title="Импорт JSON">${iconSvg('upload', 16)}</button>
          <button class="icon-btn icon-btn-sm" id="btnPlClear" type="button" title="Очистить">${iconSvg('trash', 16)}</button>
        </div>
      </div>

      <div id="playlistHost"></div>
    `;
  }

  function pageArtist(params) {
    const src = params.src;
    const q = decodeURIComponent(params.q || '');
    return `
      <div class="section-head">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-2); font-weight: 700;">Артист</div>
          <h2 style="font-size: 28px; margin-top: 4px;">${escapeHtml(q)}</h2>
        </div>
        <div class="status-bar is-idle" id="statusBar"><span class="dot"></span><span class="msg"></span></div>
      </div>
      <p style="color: var(--text-1); margin-bottom: var(--s-4);">Треки, найденные на ${escapeHtml(labelSource(src))}.</p>
      <div id="resultsHost"></div>
    `;
  }

  function pageAlbum(params) {
    return `
      <div class="section-head">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-2); font-weight: 700;">Альбом / Плейлист</div>
          <h2 id="albumTitle" style="font-size: 28px; margin-top: 4px;">Загрузка…</h2>
          <div id="albumSub" style="color: var(--text-1); margin-top: 4px;"></div>
        </div>
        <div class="status-bar is-idle" id="statusBar"><span class="dot"></span><span class="msg"></span></div>
      </div>
      <div id="albumActions" style="display: flex; gap: var(--s-2); margin-bottom: var(--s-4);"></div>
      <div id="resultsHost"></div>
    `;
  }

  function labelSource(s) {
    if (s === SOURCES.TD) return 'Tidal';
    if (s === SOURCES.YT) return 'YouTube';
    return 'SoundCloud';
  }

  // ================================================ Route / View manager ==

  function mountPage(html) {
    if (!els.view) return;
    els.view.innerHTML = html;
    els.status = $('#statusBar');
    renderIcons(els.view);
  }

  function setActiveSidebar(route) {
    document.querySelectorAll('.sidebar-item[data-route]').forEach((a) => {
      const r = a.getAttribute('data-route');
      a.classList.toggle('is-active',
        r === '/' ? (route === '/' || route === '')
        : r === '/search' ? route.startsWith('/search')
        : r === '/library' ? (route === '/library')
        : false
      );
    });
  }

  function renderCurrentRoute() {
    const hash = (location.hash || '#/').replace(/^#/, '');
    handleRoute(hash);
  }

  function handleRoute(path) {
    state.currentRoute = path;
    const clean = path.replace(/^\/+/, '/');
    setActiveSidebar(clean);
    // close mobile sidebar if open
    if (els.sidebar) els.sidebar.classList.remove('is-open');

    if (clean === '/' || clean === '') {
      mountPage(pageLanding());
      // show "recently added" from playlist on landing
      const host = $('#resultsHost');
      if (host) renderTrackList(host, state.playlist.slice(-10).reverse(), 'playlist', { sortable: false });
      const focusBtn = els.view.querySelector('[data-action="focus-search"]');
      if (focusBtn) focusBtn.addEventListener('click', () => { els.search && els.search.focus(); });
      return;
    }

    if (clean.startsWith('/search')) {
      mountPage(pageSearch());
      setStatus('');
      wireSearchTabs();
      // honour ?q=... from hash: #/search/<urlencoded>
      const parts = clean.split('/').filter(Boolean);
      if (parts[1]) {
        const q = safeDecodeComponent(parts[1]);
        if (els.search) els.search.value = q;
        runSearch(q);
      } else if (state.results.length) {
        renderSearchResults();
      }
      return;
    }

    if (clean === '/library') {
      mountPage(pageLibrary());
      wireLibrary();
      return;
    }

    if (clean.startsWith('/artist/')) {
      const parts = clean.split('/').filter(Boolean);
      // #/artist/<source>/<urlencoded-query>
      const src = parts[1] || 'soundcloud';
      const q = parts[2] ? safeDecodeComponent(parts[2]) : '';
      mountPage(pageArtist({ src, q: parts[2] || '' }));
      if (els.search) els.search.value = q;
      state.source = src;
      if (els.sourceSel) els.sourceSel.value = src;
      runSearch(q);
      return;
    }

    if (clean.startsWith('/album/')) {
      const parts = clean.split('/').filter(Boolean);
      const src = parts[1] || 'soundcloud';
      const id = parts[2] ? safeDecodeComponent(parts[2]) : '';
      mountPage(pageAlbum({ src, id }));
      if (src === SOURCES.SC && id) loadScAlbumIntoView(id);
      else {
        const title = $('#albumTitle');
        if (title) title.textContent = 'Недоступно';
        const sub = $('#albumSub');
        if (sub) sub.textContent = 'Альбомы из этого источника пока не поддерживаются.';
      }
      return;
    }

    // Fallback: go home
    mountPage(pageLanding());
  }

  function wireSearchTabs() {
    const tabs = $('#searchTabs');
    if (!tabs) return;
    tabs.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab === state.resultTab) return;
      state.resultTab = tab;
      tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
      if (els.search.value.trim()) runSearch();
    });
  }

  function wireLibrary() {
    renderFeaturedHost();
    const host = $('#playlistHost');
    if (host) renderTrackList(host, state.playlist, 'playlist', { sortable: true });
    const count = $('#plCount');
    if (count) count.textContent = `${state.playlist.length}`;
    const shBtn = $('#btnPlShuffle');
    const exBtn = $('#btnPlExport');
    const imBtn = $('#btnPlImport');
    const clBtn = $('#btnPlClear');
    if (shBtn) shBtn.addEventListener('click', shufflePlaylist);
    if (exBtn) exBtn.addEventListener('click', exportPlaylist);
    if (imBtn) imBtn.addEventListener('click', () => els.importFile.click());
    if (clBtn) clBtn.addEventListener('click', clearPlaylist);
  }

  async function loadScAlbumIntoView(id) {
    const title = $('#albumTitle');
    const sub = $('#albumSub');
    const actions = $('#albumActions');
    const host = $('#resultsHost');
    try {
      const data = await fetchScSet(id);
      const meta = normalizeScSet(data);
      if (title) title.textContent = meta.title;
      if (sub) sub.textContent = `${meta.artist}${meta.trackCount ? ' · ' + meta.trackCount + ' трек.' : ''}`;
      const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
      const tracks = rawTracks.filter(isPlayableSCTrack).map(normalizeSCTrack);
      state.results = tracks;
      if (host) renderTrackList(host, tracks, 'results', { sortable: false });
      if (actions) {
        actions.innerHTML = '';
        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-accent';
        playBtn.innerHTML = iconSvg('play', 16) + ' <span>Играть</span>';
        playBtn.addEventListener('click', () => {
          if (tracks.length) playItem(tracks[0], 'results');
        });
        const addAllBtn = document.createElement('button');
        addAllBtn.className = 'btn btn-ghost';
        addAllBtn.innerHTML = iconSvg('plus', 16) + ' <span>Добавить все в плейлист</span>';
        addAllBtn.addEventListener('click', () => { openScSet(meta); });
        actions.append(playBtn, addAllBtn);
      }
      renderIcons(els.view);
    } catch (e) {
      if (title) title.textContent = 'Не смог открыть альбом';
      if (sub) sub.textContent = (e && e.message) || 'ошибка';
    }
  }

  async function openScSet(s) {
    setStatus(`Открываю «${s.title}»…`, { busy: true });
    try {
      const data = await fetchScSet(s.id);
      const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
      const tracks = rawTracks.filter(isPlayableSCTrack).map(normalizeSCTrack);
      if (!tracks.length) { setStatus('В этом наборе нет воспроизводимых треков.'); return; }
      let added = 0;
      for (const t of tracks) {
        if (!state.playlist.some((x) => itemKey(x) === itemKey(t))) {
          state.playlist.push({
            source: t.source, id: t.id, urn: t.urn, title: t.title,
            artist: t.artist, thumb: t.thumb, duration: t.duration,
            verified: !!t.verified, permalink: t.permalink, transcoding: t.transcoding,
          });
          added++;
        }
      }
      savePlaylist();
      renderCurrentRoute();
      setStatus(`Добавил в плейлист ${added} из ${tracks.length} треков.`);
    } catch (e) {
      setStatus('Не смог открыть набор: ' + ((e && e.message) || 'ошибка'));
    }
  }

  function openArtistForItem(item) {
    if (!item) return;
    const q = encodeURIComponent(item.artist || '');
    window.BRATAN_ROUTER.navigate(`/artist/${item.source}/${q}`);
  }

  function openAlbumForItem(item) {
    if (!item) return;
    // We don't have a generic "album id" across all sources. For SC we can
    // only land on the search results page; for Tidal we *do* have albumId.
    if (item.source === SOURCES.TD && item.albumId) {
      window.BRATAN_ROUTER.navigate(`/album/${item.source}/${encodeURIComponent(item.albumId)}`);
    } else {
      const q = encodeURIComponent(item.artist + ' ' + (item.album || ''));
      window.BRATAN_ROUTER.navigate(`/search/${q}`);
    }
  }

  function safeDecodeComponent(s) { try { return decodeURIComponent(s); } catch { return s; } }

  // ------------- Featured card (library page) ------------------------------

  function renderFeaturedHost() {
    const host = $('#featuredHost');
    if (!host) return;
    host.innerHTML = '';
    const user = loadTgUser();
    const f = state.featured;
    if (!user || !f || !f.item) return;
    const card = document.createElement('div');
    card.className = 'featured';
    const img = f.image || f.item.thumb || '';
    card.innerHTML = `
      <div class="art">
        <img alt="" />
        <button class="pin-play" type="button" aria-label="Играть">${iconSvg('play', 20)}</button>
      </div>
      <div class="meta">
        <div class="featured-label">Закреплено</div>
        <div class="featured-title"></div>
        <div class="featured-artist"></div>
        <div class="featured-actions">
          <button class="btn btn-ghost btn-sm" data-action="change-image">${iconSvg('image', 14)} <span>Картинка</span></button>
          <button class="btn btn-ghost btn-sm" data-action="unpin">${iconSvg('close', 14)} <span>Убрать</span></button>
        </div>
      </div>
    `;
    applyCover(card.querySelector('img'), { title: f.item.title, artist: f.item.artist, thumb: img });
    card.querySelector('.featured-title').textContent = f.item.title;
    card.querySelector('.featured-artist').textContent = f.item.artist;
    card.querySelector('.pin-play').addEventListener('click', () => playItem(f.item, 'playlist'));
    card.querySelector('[data-action="change-image"]').addEventListener('click', () => els.featuredImgFile.click());
    card.querySelector('[data-action="unpin"]').addEventListener('click', () => removeFeatured());
    host.appendChild(card);
    renderIcons(host);
  }

  // ================================================= Featured sync (KV) ==

  function normalizeFeaturedItem(item) {
    return {
      source: item.source, id: item.id, urn: item.urn || null,
      title: item.title, artist: item.artist, thumb: item.thumb || '',
      duration: item.duration || null, verified: !!item.verified,
      permalink: item.permalink || '', transcoding: item.transcoding || null,
      audioQuality: item.audioQuality || null,
    };
  }
  function pinTrackAsFeatured(item) {
    const prevImage = (state.featured && state.featured.item && itemKey(state.featured.item) === itemKey(item))
      ? (state.featured.image || '') : '';
    state.featured = { item: normalizeFeaturedItem(item), image: prevImage };
    saveFeaturedLocal(state.featured);
    renderCurrentRoute();
    scheduleServerFeaturedPush();
    setStatus(`Закрепил «${item.title}». Залей свою картинку.`);
  }
  function removeFeatured() {
    state.featured = null;
    saveFeaturedLocal(null);
    renderCurrentRoute();
    scheduleServerFeaturedPush(true);
  }
  async function setFeaturedImageFromFile(file) {
    if (!file) return;
    if (!/^image\//i.test(file.type)) { setStatus('Нужен файл-картинка.'); return; }
    if (file.size > 600 * 1024) {
      try {
        const dataUrl = await resizeImageToDataUrl(file, 600);
        applyFeaturedImage(dataUrl);
      } catch { setStatus('Не смог прочитать картинку.'); }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => applyFeaturedImage(String(reader.result || ''));
    reader.onerror = () => setStatus('Не смог прочитать картинку.');
    reader.readAsDataURL(file);
  }
  function applyFeaturedImage(dataUrl) {
    if (!state.featured) return;
    state.featured.image = dataUrl || '';
    saveFeaturedLocal(state.featured);
    renderCurrentRoute();
    scheduleServerFeaturedPush();
    setStatus('Картинка закреплена.');
  }
  async function resizeImageToDataUrl(file, maxSide) {
    const blobUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = blobUrl;
      });
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.85);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  let featuredPushTimer = null;
  let lastPushedFeaturedJson = null;
  function scheduleServerFeaturedPush(immediate) {
    const session = loadTgSession();
    if (!session) return;
    if (featuredPushTimer) clearTimeout(featuredPushTimer);
    featuredPushTimer = setTimeout(pushServerFeatured, immediate ? 0 : 1200);
  }
  async function pushServerFeatured() {
    const session = loadTgSession();
    if (!session) return;
    try {
      if (!state.featured || !state.featured.item) {
        const r = await fetch(`${API_BASE}/tg/featured?session=${encodeURIComponent(session)}`, { method: 'DELETE' });
        if (r.ok) lastPushedFeaturedJson = '';
        else if (r.status === 401) saveTgSession(null);
        return;
      }
      const body = JSON.stringify(state.featured);
      if (body === lastPushedFeaturedJson) return;
      const r = await fetch(`${API_BASE}/tg/featured?session=${encodeURIComponent(session)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (r.ok) lastPushedFeaturedJson = body;
      else if (r.status === 401) saveTgSession(null);
    } catch { /* transient */ }
  }
  async function pullServerFeatured() {
    const session = loadTgSession();
    if (!session) return;
    try {
      const r = await fetch(`${API_BASE}/tg/featured?session=${encodeURIComponent(session)}`);
      if (!r.ok) { if (r.status === 401) saveTgSession(null); return; }
      const data = await r.json().catch(() => null);
      if (!data || !data.ok) return;
      if (data.featured && data.featured.item) {
        state.featured = data.featured;
        saveFeaturedLocal(state.featured);
        renderCurrentRoute();
      }
      lastPushedFeaturedJson = JSON.stringify(state.featured || '');
    } catch {}
  }

  // ============================================================= Playlist ==

  function addToPlaylist(item) {
    if (state.playlist.some((x) => itemKey(x) === itemKey(item))) {
      setStatus(`«${item.title}» уже в плейлисте.`);
      return;
    }
    state.playlist.push({
      source: item.source, id: item.id, urn: item.urn || null,
      title: item.title, artist: item.artist, thumb: item.thumb,
      duration: item.duration || null, verified: !!item.verified,
      permalink: item.permalink || '', transcoding: item.transcoding || null,
      audioQuality: item.audioQuality || null,
    });
    savePlaylist();
    if (state.currentRoute.startsWith('/library')) wireLibrary();
    setStatus(`Добавил: ${item.title}`);
  }
  function removeFromPlaylist(item) {
    const key = itemKey(item);
    state.playlist = state.playlist.filter((x) => itemKey(x) !== key);
    savePlaylist();
    if (state.currentRoute.startsWith('/library')) wireLibrary();
  }
  function clearPlaylist() {
    if (!state.playlist.length) return;
    if (!confirm('Точно снести весь плейлист?')) return;
    state.playlist = [];
    savePlaylist();
    renderCurrentRoute();
  }
  function shufflePlaylist() {
    const arr = state.playlist.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.playlist = arr;
    savePlaylist();
    renderCurrentRoute();
  }
  function exportPlaylist() {
    const blob = new Blob([JSON.stringify(state.playlist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bratan-playlist.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importPlaylist(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('not array');
        const clean = arr
          .filter((x) => x && (typeof x.id === 'number' || typeof x.id === 'string') && typeof x.title === 'string')
          .map((x) => ({ ...x, source: x.source || SOURCES.SC }));
        const seen = new Set(state.playlist.map(itemKey));
        for (const it of clean) if (!seen.has(itemKey(it))) { state.playlist.push(it); seen.add(itemKey(it)); }
        savePlaylist();
        renderCurrentRoute();
        setStatus(`Импортировал ${clean.length} треков.`);
      } catch { setStatus('Не смог прочитать файл плейлиста.'); }
    };
    reader.readAsText(file);
  }

  // =========================================================== Audio =======

  function initAudio() {
    els.audio.volume = state.volume / 100;
    els.audio.addEventListener('play', () => {
      state.isPlaying = true; reflectPlayingUi();
      // Lazy wire the Web Audio graph (requires a user gesture for AudioContext).
      ensureAudioGraph();
    });
    els.audio.addEventListener('playing', () => {
      state.isPlaying = true; reflectPlayingUi(); state.consecutiveErrors = 0;
    });
    els.audio.addEventListener('pause', () => { state.isPlaying = false; reflectPlayingUi(); });
    els.audio.addEventListener('ended', () => { state.isPlaying = false; reflectPlayingUi(); onTrackEnded(); });
    els.audio.addEventListener('timeupdate', () => {
      if (state.currentItem && state.currentItem.source === SOURCES.YT) return;
      const cur = els.audio.currentTime || 0;
      const dur = els.audio.duration || 0;
      reflectTime(cur, dur);
    });
    els.audio.addEventListener('loadedmetadata', () => {
      if (state.currentItem && state.currentItem.source === SOURCES.YT) return;
      const dur = els.audio.duration || 0;
      if (dur > 0 && isFinite(dur)) reflectTime(els.audio.currentTime || 0, dur);
    });
    els.audio.addEventListener('error', () => {
      if (state.currentItem && state.currentItem.source === SOURCES.YT) return;
      onStreamError('Стрим отвалился');
    });
  }

  function reflectTime(cur, dur) {
    els.curTime.textContent = fmtTime(cur);
    if (els.fullCur) els.fullCur.textContent = fmtTime(cur);
    if (dur > 0 && isFinite(dur)) {
      els.durTime.textContent = fmtTime(dur);
      if (els.fullDur) els.fullDur.textContent = fmtTime(dur);
      const pct = Math.floor((cur / dur) * 1000);
      if (!els.seek._dragging) { els.seek.value = pct; setRangeFill(els.seek); }
      if (els.fullSeek && !els.fullSeek._dragging) { els.fullSeek.value = pct; setRangeFill(els.fullSeek); }
    }
  }

  function ensureAudioGraph() {
    if (state.audioGraphReady) return;
    if (!window.BRATAN_AUDIO) return;
    const g = window.BRATAN_AUDIO.ensureGraph(els.audio);
    if (g) {
      state.audioGraphReady = true;
      // Kick off visualizer (painting it is idempotent; it draws idle anim
      // when audio is not playing).
      startVisualizerIfNeeded();
    }
  }

  function reflectPlayingUi() {
    const playing = state.isPlaying;
    const iconName = playing ? 'pause' : 'play';
    swapIcon(els.playBtn, iconName, 20);
    if (els.fullPlay) swapIcon(els.fullPlay, iconName, 28);
    if (els.nowArt) els.nowArt.classList.toggle('is-pulsing', playing);
    document.querySelectorAll('.track-row.is-playing').forEach((r) => r.classList.add('is-playing'));
  }

  function teardownHls() { if (state.hls) { try { state.hls.destroy(); } catch {} state.hls = null; } }
  function stopCurrent() {
    teardownHls();
    try { els.audio.pause(); } catch {}
    els.audio.removeAttribute('src');
    els.audio.load();
    stopYt();
  }
  function onStreamError(message) {
    state.consecutiveErrors++;
    setStatus(`${message}. Переключаюсь…`);
    if (state.consecutiveErrors > 6) { setStatus('Слишком много подряд недоступных треков.'); return; }
    setTimeout(() => autoAdvance(), 300);
  }

  async function resolveSCStream(transcodingUrl) {
    const url = `${API_BASE}/resolve?url=${encodeURIComponent(transcodingUrl)}`;
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) throw new Error('stream resolve HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.url) throw new Error('нет m3u8 url');
    return data.url;
  }
  function attachPlaylistUrl(m3u8Url) {
    teardownHls();
    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      state.hls = hls;
      return new Promise((resolve, reject) => {
        let settled = false;
        const done = (err) => { if (settled) return; settled = true; if (err) reject(err); else resolve(); };
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data && data.fatal) done(new Error('HLS fatal: ' + (data.details || data.type || '')));
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => { els.audio.play().then(() => done()).catch(done); });
        hls.loadSource(m3u8Url);
        hls.attachMedia(els.audio);
      });
    }
    if (els.audio.canPlayType('application/vnd.apple.mpegurl')) {
      els.audio.src = m3u8Url;
      return els.audio.play();
    }
    throw new Error('браузер не умеет HLS');
  }
  async function refetchSCTrack(id) {
    const res = await fetchWithTimeout(`${API_BASE}/search?q=${encodeURIComponent(String(id))}&limit=10`, 10000);
    if (!res.ok) throw new Error('track refetch HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data.collection) ? data.collection : [];
    const hit = arr.find((t) => t.id === id);
    if (!hit) throw new Error('track not found');
    return hit;
  }

  async function playTidal(item, token) {
    const url = `${API_BASE}/tidal/track?id=${encodeURIComponent(item.id)}&quality=LOSSLESS`;
    const res = await fetchWithTimeout(url, 20000);
    if (token !== state.currentReqToken) return;
    if (!res.ok) { let body = {}; try { body = await res.json(); } catch {} throw new Error(body.error || ('HTTP ' + res.status)); }
    const data = await res.json();
    if (!data.stream) throw new Error('нет stream url');
    teardownHls();
    els.audio.src = data.stream;
    els.audio.volume = state.volume / 100;
    await els.audio.play();
    const qLabel = tidalQualityLabel(data.quality || data.audioQuality);
    const bits = data.bitDepth && data.sampleRate ? ` · ${data.bitDepth}bit/${Math.round(data.sampleRate/1000)}kHz` : '';
    setQualityBadge(`Tidal · ${qLabel}${bits}`);
    setStatus(`Играю «${item.title}» (${qLabel})`);
  }
  async function playSoundCloud(item, token) {
    let transcoding = item.transcoding;
    if (!transcoding) {
      const tr = await refetchSCTrack(item.id);
      if (token !== state.currentReqToken) return;
      const pick = pickHlsMp3Transcoding(tr);
      if (!pick) throw new Error('у трека нет plain-HLS');
      transcoding = pick.url;
      const pi = state.playlist.find((x) => itemKey(x) === itemKey(item));
      if (pi) { pi.transcoding = transcoding; savePlaylist(); }
    }
    const m3u8 = await resolveSCStream(transcoding);
    if (token !== state.currentReqToken) return;
    await attachPlaylistUrl(m3u8);
    els.audio.volume = state.volume / 100;
    setQualityBadge('128 kbps · mp3 · HLS');
    setStatus(`Играю «${item.title}»`);
  }

  function setQualityBadge(text) {
    if (!els.quality) return;
    els.quality.textContent = text || '';
    els.quality.style.display = text ? '' : 'none';
  }

  // ---- YouTube branch (iframe API, can't be tapped by Web Audio) ---------

  function ensureYtApi() {
    if (state.ytReadyP) return state.ytReadyP;
    state.ytReadyP = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') { try { prev(); } catch {} }
        resolve();
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
    return state.ytReadyP;
  }
  function stopYtTimer() { if (state.ytTimer) { clearInterval(state.ytTimer); state.ytTimer = null; } }
  function stopYt() {
    stopYtTimer();
    if (state.ytPlayer) { try { state.ytPlayer.stopVideo(); } catch {} }
  }
  function startYtTimer() {
    stopYtTimer();
    state.ytTimer = setInterval(() => {
      const p = state.ytPlayer;
      if (!p || !p.getCurrentTime) return;
      let cur = 0, dur = 0;
      try { cur = p.getCurrentTime() || 0; dur = p.getDuration() || 0; } catch {}
      reflectTime(cur, dur);
    }, 500);
  }
  function playYouTube(item, token) {
    return new Promise(async (resolve, reject) => {
      try {
        await ensureYtApi();
        if (token !== state.currentReqToken) return resolve();
        if (state.ytPlayer) { try { state.ytPlayer.destroy(); } catch {} state.ytPlayer = null; }
        const frame = document.createElement('div');
        frame.id = 'ytFrame';
        els.ytWrap.innerHTML = '';
        els.ytWrap.appendChild(frame);
        let settled = false;
        const done = (err) => { if (settled) return; settled = true; if (err) reject(err); else resolve(); };
        state.ytPlayer = new window.YT.Player('ytFrame', {
          width: '100%', height: '100%', videoId: item.id,
          playerVars: { autoplay: 1, playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0 },
          events: {
            onReady: (ev) => {
              try { ev.target.setVolume(state.volume); ev.target.playVideo(); } catch {}
              startYtTimer();
              setQualityBadge('YouTube');
              setStatus(`Играю «${item.title}»`);
              done();
            },
            onStateChange: (ev) => {
              const s = ev.data;
              if (s === 1) { state.isPlaying = true; reflectPlayingUi(); state.consecutiveErrors = 0; }
              else if (s === 2) { state.isPlaying = false; reflectPlayingUi(); }
              else if (s === 0) { state.isPlaying = false; reflectPlayingUi(); onTrackEnded(); }
            },
            onError: (ev) => {
              const code = ev && ev.data;
              const embedBlocked = code === 101 || code === 150;
              done(new Error(embedBlocked ? 'лейбл запретил embed' : 'YouTube err ' + code));
            },
          },
        });
      } catch (e) { reject(e); }
    });
  }

  // ========================================================= Paywall ======

  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function readPlays() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS.PLAYS) || 'null');
      if (raw && raw.date === todayKey() && Array.isArray(raw.ids)) return raw;
    } catch {}
    return { date: todayKey(), ids: [] };
  }
  function writePlays(plays) { try { localStorage.setItem(LS.PLAYS, JSON.stringify(plays)); } catch {} }
  function isSubscribed() {
    const user = loadTgUser();
    if (!user) return false;
    if (ADMIN_TG_IDS.has(Number(user.id))) return true;
    const sub = user.subscription;
    if (!sub) return false;
    if (sub.subscribed === true) return true;
    if (sub.until && Number(sub.until) > Math.floor(Date.now() / 1000)) return true;
    return false;
  }
  function canPlay(item) {
    if (isSubscribed()) return true;
    const plays = readPlays();
    if (plays.ids.includes(itemKey(item))) return true;
    return plays.ids.length < FREE_DAILY_LIMIT;
  }
  function recordPlay(item) {
    if (isSubscribed()) return;
    const plays = readPlays();
    const key = itemKey(item);
    if (!plays.ids.includes(key)) { plays.ids.push(key); writePlays(plays); }
  }
  function showPaywall() {
    if (!els.paywallModal) return;
    if (els.paywallCta) els.paywallCta.href = els.payBtn ? els.payBtn.href : PAYWALL_TG_URL;
    els.paywallModal.hidden = false;
    els.paywallModal.setAttribute('aria-hidden', 'false');
  }
  function hidePaywall() {
    if (!els.paywallModal) return;
    els.paywallModal.hidden = true;
    els.paywallModal.setAttribute('aria-hidden', 'true');
  }
  function setupPaywallModal() {
    if (!els.paywallModal) return;
    els.paywallModal.addEventListener('click', (e) => {
      const t = e.target;
      if (t && (t.hasAttribute('data-close') || t.closest('[data-close]'))) hidePaywall();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.paywallModal.hidden) hidePaywall();
    });
  }

  // ================================================== Unified play/nav ====

  async function playItem(item, listHint) {
    if (!canPlay(item)) {
      setStatus(`Лимит: ${FREE_DAILY_LIMIT} трека в день на бесплатном тарифе`);
      showPaywall();
      return;
    }
    recordPlay(item);
    state.currentId = item.id;
    state.currentItem = item;
    state.currentList = listHint;

    applyCover(els.nowThumb, item);
    els.nowTitle.textContent = item.title;
    els.nowArtist.textContent = item.artist;
    els.curTime.textContent = '0:00';
    els.durTime.textContent = item.duration ? fmtTime(item.duration) : '0:00';
    els.seek.value = 0; setRangeFill(els.seek);
    if (els.fullSeek) { els.fullSeek.value = 0; setRangeFill(els.fullSeek); }
    setQualityBadge('');

    // Fullscreen overlay reflect — artwork, blurred background, derived accents.
    applyCover(els.fullArt, item);
    updateFullplayerBackground(item);
    if (els.fullTitle) els.fullTitle.textContent = item.title;
    if (els.fullArtist) els.fullArtist.textContent = item.artist;
    if (els.fullKicker) els.fullKicker.textContent = labelSource(item.source);

    document.querySelectorAll('.track-row.is-playing').forEach((n) => n.classList.remove('is-playing'));
    if (state.currentRoute.startsWith('/library') || state.currentRoute.startsWith('/search') || state.currentRoute === '/' || state.currentRoute === '') {
      renderCurrentRoute();
    }

    const token = ++state.currentReqToken;
    if (item.source === SOURCES.YT) {
      teardownHls();
      try { els.audio.pause(); } catch {}
      els.audio.removeAttribute('src');
      els.audio.load();
    } else {
      stopYt();
    }

    setStatus(`Готовлю «${item.title}»…`, { busy: true });
    try {
      if (item.source === SOURCES.YT) await playYouTube(item, token);
      else if (item.source === SOURCES.TD) await playTidal(item, token);
      else await playSoundCloud(item, token);
      if (token !== state.currentReqToken) return;
      // When playing a non-YT source, Web Audio graph + visualizer become
      // available. YT audio is sandboxed inside the iframe — we keep the idle
      // animation going so the overlay still looks alive.
      ensureAudioGraph();
      startVisualizerIfNeeded();
    } catch (e) {
      if (token !== state.currentReqToken) return;
      console.error(e);
      const msg = (e && e.message) || 'ошибка';
      if (/embed|piped|unreachable|bot|151?0?/i.test(msg)) onStreamError('Этот трек недоступен');
      else onStreamError('Не достал стрим');
    }
  }

  function listFor() {
    if (state.currentList === 'playlist') return state.playlist;
    if (state.currentList === 'results') return state.results;
    return [];
  }
  function currentIndex(list) {
    if (!state.currentItem) return -1;
    const key = itemKey(state.currentItem);
    return list.findIndex((x) => itemKey(x) === key);
  }
  function autoAdvance() {
    const list = listFor();
    if (!list.length) return;
    const idx = currentIndex(list);
    if (idx < 0) return;
    const nextIdx = idx + 1;
    if (nextIdx >= list.length) {
      if (state.loop && state.currentList === 'playlist') { playItem(list[0], state.currentList); return; }
      setStatus('Доехали до конца списка.');
      return;
    }
    playItem(list[nextIdx], state.currentList);
  }
  function onTrackEnded() { state.consecutiveErrors = 0; autoAdvance(); }
  function playPrev() {
    const list = listFor();
    if (list.length && state.currentItem) {
      const idx = currentIndex(list);
      let prev = idx - 1;
      if (prev < 0) prev = (state.loop && state.currentList === 'playlist') ? list.length - 1 : 0;
      playItem(list[prev], state.currentList);
    } else if (state.playlist.length) playItem(state.playlist[0], 'playlist');
  }
  function playNext() {
    const list = listFor();
    if (list.length && state.currentItem) {
      const idx = currentIndex(list);
      let next = idx + 1;
      if (next >= list.length) next = (state.loop && state.currentList === 'playlist') ? 0 : list.length - 1;
      playItem(list[next], state.currentList);
    } else if (state.playlist.length) playItem(state.playlist[0], 'playlist');
  }
  function togglePlay() {
    if (!state.currentItem) {
      if (state.playlist.length) playItem(state.playlist[0], 'playlist');
      return;
    }
    if (state.currentItem.source === SOURCES.YT) {
      const p = state.ytPlayer; if (!p) return;
      try { const s = p.getPlayerState(); if (s === 1 || s === 3) p.pauseVideo(); else p.playVideo(); } catch {}
    } else {
      if (els.audio.paused) els.audio.play().catch(() => {});
      else els.audio.pause();
    }
  }
  function seekTo(pct) {
    pct = Math.max(0, Math.min(1, pct));
    if (state.currentItem && state.currentItem.source === SOURCES.YT) {
      const p = state.ytPlayer; if (!p) return;
      try { const dur = p.getDuration() || 0; if (dur > 0) p.seekTo(dur * pct, true); } catch {}
    } else {
      const dur = els.audio.duration || 0;
      if (dur > 0 && isFinite(dur)) { try { els.audio.currentTime = dur * pct; } catch {} }
    }
  }
  function setVolume(v) {
    state.volume = clampInt(v, 0, 100);
    localStorage.setItem(LS.VOLUME, String(state.volume));
    els.audio.volume = state.volume / 100;
    if (state.ytPlayer) { try { state.ytPlayer.setVolume(state.volume); } catch {} }
  }
  function updateLoopBtn() {
    if (els.loopBtn) els.loopBtn.classList.toggle('is-active', state.loop);
    if (els.fullLoop) els.fullLoop.classList.toggle('is-active', state.loop);
  }

  function applySourceToUi() {
    if (els.sourceSel) els.sourceSel.value = state.source;
    state.results = []; state.sets = []; state.resultTab = 'tracks';
    const ph = state.source === SOURCES.TD ? 'Tidal lossless — трек, артист, альбом…'
      : state.source === SOURCES.YT ? 'YouTube Music — трек, артист, альбом…'
      : 'Искать треки, артистов, альбомы…';
    if (els.search) els.search.placeholder = ph;
  }

  // ========================================================= Fullscreen ==

  function openFullplayer() {
    if (!els.fullplayer) return;
    els.fullplayer.hidden = false;
    // next frame so the CSS transition kicks in
    requestAnimationFrame(() => els.fullplayer.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    startVisualizerIfNeeded();
  }
  function closeFullplayer() {
    if (!els.fullplayer) return;
    els.fullplayer.classList.remove('is-open');
    setTimeout(() => { els.fullplayer.hidden = true; }, 420);
    document.body.style.overflow = '';
  }
  function toggleFullplayer() {
    if (!els.fullplayer) return;
    if (els.fullplayer.hidden) openFullplayer();
    else closeFullplayer();
  }

  function startVisualizerIfNeeded() {
    if (!window.BRATAN_VIZ) return;
    if (!state.vizStop && els.vizCanvas) {
      state.vizStop = window.BRATAN_VIZ.startVisualizer(els.vizCanvas, {
        getAnalyser: () => window.BRATAN_AUDIO ? window.BRATAN_AUDIO.getAnalyser() : null,
        isPlaying: () => state.isPlaying,
      });
    }
    if (!state.beatStop && window.BRATAN_VIZ.startBeatSync) {
      // Drives CSS vars on <html> for the row eq-indicator, and on the
      // fullplayer for the halo / artwork pulse.
      state.beatStop = window.BRATAN_VIZ.startBeatSync(document.documentElement, {
        getAnalyser: () => window.BRATAN_AUDIO ? window.BRATAN_AUDIO.getAnalyser() : null,
        isPlaying: () => state.isPlaying,
      });
      if (els.fullplayer) {
        state.beatStopFull = window.BRATAN_VIZ.startBeatSync(els.fullplayer, {
          getAnalyser: () => window.BRATAN_AUDIO ? window.BRATAN_AUDIO.getAnalyser() : null,
          isPlaying: () => state.isPlaying,
        });
      }
    }
  }

  function updateFullplayerBackground(item) {
    const bg = document.getElementById('fullBgImg');
    if (!bg) return;
    if (item && item.thumb) {
      // Use the cover itself as the backdrop. Blur + darken is applied via CSS.
      const safe = String(item.thumb).replace(/"/g, '%22');
      bg.style.backgroundImage = `url("${safe}")`;
    } else {
      bg.style.backgroundImage = 'none';
    }
    // Also feed the halo colors off the deterministic hash, so each track has
    // its own look even before we've had a chance to read the actual image.
    const { c1, c2 } = coverColors(item || {});
    if (els.fullplayer) {
      els.fullplayer.style.setProperty('--cover-1', c1);
      els.fullplayer.style.setProperty('--cover-2', c2);
    }
  }

  function toggleEqPanel() {
    if (!els.fullEqPanel) return;
    const hidden = els.fullEqPanel.hasAttribute('hidden');
    if (hidden) {
      els.fullEqPanel.hidden = false;
      if (!state.eqInstance && window.BRATAN_EQ) {
        ensureAudioGraph();
        state.eqInstance = window.BRATAN_EQ.createEqualizer({
          container: els.fullEqPanel,
          audio: els.audio,
        });
        renderIcons(els.fullEqPanel);
      }
    } else {
      els.fullEqPanel.hidden = true;
    }
  }

  // ========================================================== Theme ======

  function applyTheme(t) {
    const theme = (t === 'light' || t === 'dark') ? t : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS.THEME, theme);
    if (els.themeToggle) swapIcon(els.themeToggle, theme === 'dark' ? 'sun' : 'moon', 18);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  // =========================================================== Wiring =====

  function wire() {
    // Search
    els.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = els.search.value.trim();
      if (!q) return;
      window.BRATAN_ROUTER.navigate(`/search/${encodeURIComponent(q)}`);
    });
    els.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = els.search.value.trim();
        if (q) window.BRATAN_ROUTER.navigate(`/search/${encodeURIComponent(q)}`);
      }
    });

    // Mini player controls
    els.playBtn.addEventListener('click', () => { ensureAudioGraph(); togglePlay(); });
    els.prevBtn.addEventListener('click', playPrev);
    els.nextBtn.addEventListener('click', playNext);
    els.loopBtn.addEventListener('click', () => {
      state.loop = !state.loop;
      localStorage.setItem(LS.LOOP, state.loop ? '1' : '0');
      updateLoopBtn();
    });
    els.shuffleBtn.addEventListener('click', shufflePlaylist);
    els.seek.addEventListener('input', () => { els.seek._dragging = true; setRangeFill(els.seek); });
    els.seek.addEventListener('change', () => { els.seek._dragging = false; seekTo(parseInt(els.seek.value, 10) / 1000); });
    els.volume.value = state.volume; setRangeFill(els.volume);
    els.volume.addEventListener('input', () => { setVolume(els.volume.value); setRangeFill(els.volume); });

    if (els.likeBtn) els.likeBtn.addEventListener('click', () => {
      if (state.currentItem) addToPlaylist(state.currentItem);
    });

    if (els.nowArt) els.nowArt.addEventListener('click', openFullplayer);
    if (els.fullscreenBtn) els.fullscreenBtn.addEventListener('click', toggleFullplayer);
    if (els.fullCloseBtn) els.fullCloseBtn.addEventListener('click', closeFullplayer);
    if (els.eqBtn) els.eqBtn.addEventListener('click', () => { openFullplayer(); toggleEqPanel(); });
    if (els.queueBtn) els.queueBtn.addEventListener('click', () => window.BRATAN_ROUTER.navigate('/library'));

    // Fullscreen controls mirror mini-player
    if (els.fullPlay)    els.fullPlay.addEventListener('click', () => { ensureAudioGraph(); togglePlay(); });
    if (els.fullPrev)    els.fullPrev.addEventListener('click', playPrev);
    if (els.fullNext)    els.fullNext.addEventListener('click', playNext);
    if (els.fullShuffle) els.fullShuffle.addEventListener('click', shufflePlaylist);
    if (els.fullLoop)    els.fullLoop.addEventListener('click', () => {
      state.loop = !state.loop;
      localStorage.setItem(LS.LOOP, state.loop ? '1' : '0');
      updateLoopBtn();
    });
    if (els.fullSeek) {
      els.fullSeek.addEventListener('input', () => { els.fullSeek._dragging = true; setRangeFill(els.fullSeek); });
      els.fullSeek.addEventListener('change', () => { els.fullSeek._dragging = false; seekTo(parseInt(els.fullSeek.value, 10) / 1000); });
    }
    if (els.fullEqBtn) els.fullEqBtn.addEventListener('click', toggleEqPanel);
    if (els.fullArtistBtn) els.fullArtistBtn.addEventListener('click', () => {
      if (state.currentItem) { closeFullplayer(); openArtistForItem(state.currentItem); }
    });
    if (els.fullAlbumBtn) els.fullAlbumBtn.addEventListener('click', () => {
      if (state.currentItem) { closeFullplayer(); openAlbumForItem(state.currentItem); }
    });

    // Source / official toggle
    if (els.sourceSel) els.sourceSel.addEventListener('change', () => {
      state.source = els.sourceSel.value;
      saveSource(state.source);
      applySourceToUi();
      if (state.currentRoute.startsWith('/search') && els.search.value.trim()) runSearch();
    });
    if (els.officialToggle) {
      els.officialToggle.checked = !!state.officialOnly;
      els.officialToggle.addEventListener('change', () => {
        state.officialOnly = !!els.officialToggle.checked;
        saveOfficialOnly(state.officialOnly);
        if (els.search.value.trim() && state.currentRoute.startsWith('/search')) runSearch();
      });
    }

    // Sidebar (mobile)
    if (els.sidebarToggle) els.sidebarToggle.addEventListener('click', () => {
      els.sidebar.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => {
      if (!els.sidebar || !els.sidebar.classList.contains('is-open')) return;
      if (e.target.closest('#sidebar') || e.target.closest('#sidebarToggle')) return;
      els.sidebar.classList.remove('is-open');
    });

    // Theme
    if (els.themeToggle) els.themeToggle.addEventListener('click', toggleTheme);

    // Nav buttons
    if (els.navBack) els.navBack.addEventListener('click', () => history.back());
    if (els.navForward) els.navForward.addEventListener('click', () => history.forward());

    // File inputs
    els.importFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importPlaylist(f);
      els.importFile.value = '';
    });
    els.featuredImgFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setFeaturedImageFromFile(f);
      els.featuredImgFile.value = '';
    });

    // Hotkeys
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '')) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight' && e.shiftKey) playNext();
      else if (e.key === 'ArrowLeft'  && e.shiftKey) playPrev();
      else if (e.key === 'Escape' && els.fullplayer && !els.fullplayer.hidden) closeFullplayer();
    });
  }

  // ================================================== Telegram login ======

  function loadTgUser() { try { return JSON.parse(localStorage.getItem(LS.TG_USER) || 'null'); } catch { return null; } }
  function saveTgUser(u) { if (u) localStorage.setItem(LS.TG_USER, JSON.stringify(u)); else localStorage.removeItem(LS.TG_USER); }
  function loadTgSession() { try { return localStorage.getItem(LS.TG_SESSION) || null; } catch { return null; } }
  function saveTgSession(s) { if (s) localStorage.setItem(LS.TG_SESSION, s); else localStorage.removeItem(LS.TG_SESSION); }

  let serverPushTimer = null;
  let lastPushedPlaylistJson = null;
  function scheduleServerPlaylistPush() {
    if (!loadTgSession()) return;
    if (serverPushTimer) clearTimeout(serverPushTimer);
    serverPushTimer = setTimeout(pushServerPlaylist, 1500);
  }
  async function pushServerPlaylist() {
    const session = loadTgSession();
    if (!session) return;
    const body = JSON.stringify(state.playlist || []);
    if (body === lastPushedPlaylistJson) return;
    try {
      const r = await fetch(`${API_BASE}/tg/playlist?session=${encodeURIComponent(session)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body,
      });
      if (r.ok) lastPushedPlaylistJson = body;
      else if (r.status === 401) saveTgSession(null);
    } catch {}
  }
  async function pullServerPlaylist() {
    const session = loadTgSession();
    if (!session) return;
    try {
      const r = await fetch(`${API_BASE}/tg/playlist?session=${encodeURIComponent(session)}`);
      if (!r.ok) { if (r.status === 401) saveTgSession(null); return; }
      const data = await r.json().catch(() => null);
      if (!data || !data.ok) return;
      const text = String(data.playlist || '');
      if (!text) { lastPushedPlaylistJson = JSON.stringify(state.playlist || []); return; }
      let remote; try { remote = JSON.parse(text); } catch { return; }
      if (!Array.isArray(remote)) return;
      const seen = new Set();
      const merged = [];
      for (const it of remote) {
        if (!it || !it.source || !it.id) continue;
        const k = itemKey(it);
        if (!seen.has(k)) { seen.add(k); merged.push(it); }
      }
      for (const it of (state.playlist || [])) {
        const k = itemKey(it);
        if (!seen.has(k)) { seen.add(k); merged.push(it); }
      }
      state.playlist = merged;
      localStorage.setItem(LS.PLAYLIST, JSON.stringify(merged));
      renderCurrentRoute();
      lastPushedPlaylistJson = JSON.stringify(merged);
      if (merged.length !== remote.length) scheduleServerPlaylistPush();
    } catch {}
  }

  function renderAuthUi() {
    const user = loadTgUser();
    if (user) {
      if (els.tgLoginBtn) els.tgLoginBtn.hidden = true;
      if (els.tgUserPill) els.tgUserPill.hidden = false;
      if (els.tgUserName) els.tgUserName.textContent = user.username ? '@' + user.username : (user.first_name || 'you');
      if (els.tgUserPhoto) {
        applyTgAvatar(els.tgUserPhoto, user);
      }
      if (els.tgAdminBadge) els.tgAdminBadge.hidden = !ADMIN_TG_IDS.has(Number(user.id));
      if (els.payBtn) {
        const url = new URL(PAYWALL_TG_URL);
        url.searchParams.set('start', 'pay_' + user.id);
        els.payBtn.href = url.toString();
      }
      if (els.sidebarPlaylistHint) els.sidebarPlaylistHint.hidden = true;
    } else {
      if (els.tgLoginBtn) { els.tgLoginBtn.hidden = false; els.tgLoginBtn.classList.remove('loading'); }
      if (els.tgUserPill) els.tgUserPill.hidden = true;
      if (els.tgAdminBadge) els.tgAdminBadge.hidden = true;
      if (els.payBtn) els.payBtn.href = PAYWALL_TG_URL;
      if (els.sidebarPlaylistHint) els.sidebarPlaylistHint.hidden = false;
    }
  }

  function genLoginToken() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
    const a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  let tgPollTimer = null;
  let tgPollDeadline = 0;
  function stopTgPoll() {
    if (tgPollTimer) { clearTimeout(tgPollTimer); tgPollTimer = null; }
    if (els.tgLoginBtn) els.tgLoginBtn.classList.remove('loading');
  }
  async function pollOnce(token) {
    try {
      const r = await fetch(`${API_BASE}/tg/login/poll?token=${encodeURIComponent(token)}`);
      const data = await r.json().catch(() => ({}));
      if (data && data.ok && data.user) {
        saveTgUser({ ...data.user, subscription: data.subscription || null });
        if (data.session) saveTgSession(data.session);
        renderAuthUi();
        hidePaywall();
        setStatus('Вошёл как @' + (data.user.username || data.user.first_name || data.user.id));
        pullServerPlaylist();
        pullServerFeatured();
        return true;
      }
    } catch {}
    return false;
  }
  function schedulePoll(token) {
    if (Date.now() > tgPollDeadline) { stopTgPoll(); setStatus('Время на вход вышло.'); return; }
    tgPollTimer = setTimeout(async () => {
      const ok = await pollOnce(token);
      if (ok) { stopTgPoll(); return; }
      schedulePoll(token);
    }, TG_LOGIN_POLL_INTERVAL_MS);
  }
  function startTgLogin() {
    stopTgPoll();
    const token = genLoginToken();
    tgPollDeadline = Date.now() + TG_LOGIN_POLL_TIMEOUT_MS;
    const url = `https://t.me/${TG_BOT_USERNAME}?start=login_${token}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (els.tgLoginBtn) els.tgLoginBtn.classList.add('loading');
    setStatus('Ждём подтверждения в Telegram…');
    schedulePoll(token);
  }
  async function refreshSubscription() {
    const user = loadTgUser();
    if (!user || !user.id) return;
    if (ADMIN_TG_IDS.has(Number(user.id))) {
      saveTgUser({ ...user, subscription: { subscribed: true, until: 9999999999, admin: true } });
      renderAuthUi();
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/tg/status?id=${encodeURIComponent(user.id)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data && data.ok) {
        saveTgUser({ ...user, subscription: data.subscription || null });
        renderAuthUi();
      }
    } catch {}
  }
  function setupAuth() {
    renderAuthUi();
    if (loadTgUser()) refreshSubscription();
    if (els.tgLoginBtn) els.tgLoginBtn.addEventListener('click', startTgLogin);
    if (els.tgLogoutBtn) {
      els.tgLogoutBtn.addEventListener('click', () => {
        stopTgPoll();
        saveTgUser(null);
        saveTgSession(null);
        lastPushedPlaylistJson = null;
        lastPushedFeaturedJson = null;
        renderAuthUi();
        renderCurrentRoute();
      });
    }
    if (loadTgSession()) { pullServerPlaylist(); pullServerFeatured(); }
    window.addEventListener('beforeunload', stopTgPoll);
  }

  // =============================================================== PWA ===

  function setupPwa() {
    if (els.payBtn) { els.payBtn.href = PAYWALL_TG_URL; }
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
    let deferredPrompt = null;
    const installBtn = els.installBtn;
    const isStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn && !isStandalone()) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installBtn.disabled = true;
        try { deferredPrompt.prompt(); await deferredPrompt.userChoice; } catch {}
        deferredPrompt = null;
        installBtn.hidden = true;
        installBtn.disabled = false;
      });
    }
    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.hidden = true;
      deferredPrompt = null;
    });
  }

  // ==============================================================  Boot ==

  function boot() {
    // Theme from storage or system preference.
    const storedTheme = localStorage.getItem(LS.THEME);
    if (storedTheme === 'light' || storedTheme === 'dark') applyTheme(storedTheme);
    else applyTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

    renderIcons(document);
    initAudio();
    applySourceToUi();
    wire();
    updateLoopBtn();
    setupPwa();
    setupAuth();
    setupPaywallModal();

    // Router setup — pages consume `view` container.
    // We don't use the route() helper here to keep it simple; we route all
    // hash-changes ourselves via the central handleRoute().
    window.addEventListener('hashchange', () => renderCurrentRoute());
    if (!location.hash) location.replace('#/');
    renderCurrentRoute();

    // Kick off an idle visualizer frame so it looks alive even before play.
    // AudioContext is only created after a user gesture, so the visualizer
    // falls back to a lovely idle sine wave until then.
    startVisualizerIfNeeded();
  }

  // If DOM is already ready (defer), boot synchronously.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
