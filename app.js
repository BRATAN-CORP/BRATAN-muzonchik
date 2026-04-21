// БРАТАН-музончик — бесплатный плеер на базе YouTube Music через публичные Piped-инстансы.
// Поиск идёт через Piped `music_songs` (вкладка "Songs" в YouTube Music — уже курируется
// и содержит только официальные релизы: Official Artist Channel + `Artist - Topic`).
// Воспроизведение — НЕ через iframe (его лейблы массово блочат), а напрямую через
// аудио-стримы Piped `/streams/{id}`. Мы выбираем самый жирный audioStream (обычно
// Opus ~128-160 kbps из YouTube Music — это максимум без Premium) и отдаём его в
// HTML `<audio>` тег. В отличие от iframe, эти стримы не подвержены embed-блокам.

(() => {
  'use strict';

  // ---------- Public Piped API instances (rotated on failure) ----------
  const DEFAULT_INSTANCES = [
    'https://api.piped.private.coffee',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.smnz.de',
    'https://pipedapi.r4fo.com',
    'https://pipedapi.drgns.space',
    'https://pipedapi.reallyaweso.me',
    'https://pipedapi.ducks.party',
    'https://pipedapi.ggtyler.dev',
    'https://pipedapi.orangenet.cc',
    'https://pipedapi.phoenixthrush.com',
  ];

  const LS_KEY_PLAYLIST = 'bratan:playlist:v1';
  const LS_KEY_INSTANCE = 'bratan:instance:v1';
  const LS_KEY_VOLUME = 'bratan:volume:v1';
  const LS_KEY_LOOP = 'bratan:loop:v1';

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    search: $('#search'),
    searchBtn: $('#searchBtn'),
    instance: $('#instance'),
    results: $('#results'),
    playlist: $('#playlist'),
    statusLine: $('#statusLine'),
    quality: $('#qualityBadge'),
    audio: $('#audioEl'),
    nowThumb: $('#nowThumb'),
    nowTitle: $('#nowTitle'),
    nowArtist: $('#nowArtist'),
    prevBtn: $('#prevBtn'),
    playBtn: $('#playBtn'),
    nextBtn: $('#nextBtn'),
    loopBtn: $('#loopBtn'),
    seek: $('#seek'),
    volume: $('#volume'),
    curTime: $('#curTime'),
    durTime: $('#durTime'),
    shuffleBtn: $('#shuffleBtn'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    clearBtn: $('#clearBtn'),
    importFile: $('#importFile'),
  };

  // ---------- State ----------
  const state = {
    instance: localStorage.getItem(LS_KEY_INSTANCE) || DEFAULT_INSTANCES[0],
    results: [],          // {id, title, artist, thumb, duration}
    playlist: loadPlaylist(),
    currentId: null,      // id currently loaded in YT
    currentSource: null,  // 'playlist' | 'results'
    isPlaying: false,
    loop: localStorage.getItem(LS_KEY_LOOP) === '1',
    volume: clampInt(parseInt(localStorage.getItem(LS_KEY_VOLUME) || '80', 10), 0, 100),
    consecutiveErrors: 0,
    currentReqToken: 0,   // generation token to cancel stale /streams fetches
  };

  // ---------- Helpers ----------
  function clampInt(n, min, max) { n = parseInt(n, 10); if (isNaN(n)) return min; return Math.max(min, Math.min(max, n)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  function setStatus(text) { els.statusLine.textContent = text || ''; }
  function setRangeFill(input) {
    const min = parseFloat(input.min || 0), max = parseFloat(input.max || 100);
    const val = parseFloat(input.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--pct', pct + '%');
  }
  function savePlaylist() { localStorage.setItem(LS_KEY_PLAYLIST, JSON.stringify(state.playlist)); }
  function loadPlaylist() {
    try {
      const raw = localStorage.getItem(LS_KEY_PLAYLIST);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((x) => x && typeof x.id === 'string');
    } catch { return []; }
  }

  // ---------- Instance selector ----------
  function initInstanceSelect() {
    els.instance.innerHTML = '';
    for (const url of DEFAULT_INSTANCES) {
      const opt = document.createElement('option');
      opt.value = url;
      opt.textContent = url.replace(/^https?:\/\//, '');
      if (url === state.instance) opt.selected = true;
      els.instance.appendChild(opt);
    }
    els.instance.addEventListener('change', () => {
      state.instance = els.instance.value;
      localStorage.setItem(LS_KEY_INSTANCE, state.instance);
    });
  }

  // ---------- Search ----------
  // We trust the Piped `filter=music_songs` endpoint — it maps to YouTube Music's
  // "Songs" tab which is already curated to contain only official releases
  // (Official Artist Channel uploads + auto-generated `Artist - Topic` tracks
  //  from labels). No random user reuploads make it into that tab.
  //
  // On top of that, we aggressively filter out anything that *looks* like a
  // reupload/cover/karaoke/sped-up/slowed/remix-by-fan using title heuristics.
  // Not all Piped instances populate `uploaderVerified`, so we don't rely on it
  // as a hard requirement — we just use it to render a ✓ badge when available.
  const REUPLOAD_PATTERNS = [
    /\breupload(ed)?\b/i,
    /\bkaraoke\b/i,
    /\bcover\b/i,
    /\bsped\s*up\b/i,
    /\bspedup\b/i,
    /\bslowed\b/i,
    /\breverb\b/i,
    /\b8d\s*(audio|version)\b/i,
    /\bnightcore\b/i,
    /\bfan\s*(made|edit|remix)\b/i,
    /\bmashup\b/i,
    /\blyric(s)?\s*video\b/i,
  ];
  function looksLikeReupload(item) {
    const t = (item.title || '') + ' ' + (item.artist || '');
    return REUPLOAD_PATTERNS.some((re) => re.test(t));
  }

  function normalizeItem(it) {
    // Piped returns url like "/watch?v=ID"
    let id = null;
    if (typeof it.url === 'string') {
      const m = it.url.match(/[?&]v=([\w-]{6,})/);
      if (m) id = m[1];
    }
    if (!id && typeof it.videoId === 'string') id = it.videoId;
    if (!id) return null;
    const thumbs = Array.isArray(it.thumbnails) ? it.thumbnails : null;
    let thumb = it.thumbnail || (thumbs && thumbs[0] && thumbs[0].url) || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    if (thumb && thumb.startsWith('//')) thumb = 'https:' + thumb;
    const rawArtist = (it.uploaderName || '').trim();
    const artist = rawArtist.replace(/\s[-–—]\s?Topic$/i, '').trim() || rawArtist;
    const duration = typeof it.duration === 'number' ? it.duration : null;
    return {
      id,
      title: (it.title || '').trim() || '(без названия)',
      artist: artist || 'Неизвестный исполнитель',
      thumb,
      duration,
      verified: it.uploaderVerified === true,
      topic: /\s[-–—]\s?Topic$/i.test(rawArtist),
    };
  }

  async function searchPiped(query) {
    const instances = [state.instance, ...DEFAULT_INSTANCES.filter((i) => i !== state.instance)];
    let lastErr = null;
    for (const base of instances) {
      try {
        setStatus(`Ищу на ${base.replace(/^https?:\/\//, '')}…`);
        const res = await fetchWithTimeout(`${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`, 9000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        // if this instance worked, stick with it
        if (base !== state.instance) {
          state.instance = base;
          localStorage.setItem(LS_KEY_INSTANCE, base);
          els.instance.value = base;
        }
        return items;
      } catch (e) {
        lastErr = e;
        // try next
      }
    }
    throw lastErr || new Error('Все инстансы недоступны');
  }

  function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, mode: 'cors' }).finally(() => clearTimeout(t));
  }

  async function runSearch() {
    const q = els.search.value.trim();
    if (!q) return;
    els.results.innerHTML = '';
    setStatus('Ищу…');
    try {
      const raw = await searchPiped(q);
      const normalized = raw.map(normalizeItem).filter(Boolean);
      // YouTube Music `music_songs` filter is curated to official releases.
      // We only filter out obvious reupload/cover/karaoke noise on top.
      const official = normalized.filter((it) => !looksLikeReupload(it));
      state.results = official;
      renderResults();
      const dropped = normalized.length - official.length;
      if (official.length === 0 && normalized.length > 0) {
        setStatus('Только перезаливы в выдаче — уточни запрос (артист + трек).');
      } else if (official.length === 0) {
        setStatus('Ничего не нашёл, бро.');
      } else if (dropped > 0) {
        setStatus(`Найдено: ${official.length} официальных · отсеял ${dropped} перезалив(а/ов).`);
      } else {
        setStatus(`Найдено: ${official.length} официальных треков.`);
      }
    } catch (e) {
      console.error(e);
      setStatus('Поиск не удался. Переключи API в правом верхнем углу и попробуй ещё раз.');
    }
  }

  // ---------- Rendering ----------
  function renderResults() {
    els.results.innerHTML = '';
    if (!state.results.length) {
      els.results.innerHTML = '<li class="empty">Чё, бро? Введи запрос сверху — найдём официал.</li>';
      return;
    }
    const tpl = document.getElementById('tpl-result');
    for (const item of state.results) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      fillRow(node, item);
      node.querySelector('.play').addEventListener('click', () => playItem(item, 'results'));
      node.querySelector('.add').addEventListener('click', (ev) => {
        ev.stopPropagation();
        addToPlaylist(item);
      });
      node.addEventListener('dblclick', () => playItem(item, 'results'));
      if (state.currentId === item.id) node.classList.add('playing');
      els.results.appendChild(node);
    }
  }

  function renderPlaylist() {
    els.playlist.innerHTML = '';
    if (!state.playlist.length) {
      els.playlist.innerHTML = '<li class="empty">Плейлист пуст. Добавляй треки кнопкой ＋ из результатов.</li>';
      return;
    }
    const tpl = document.getElementById('tpl-plitem');
    state.playlist.forEach((item, idx) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      fillRow(node, item);
      node.dataset.id = item.id;
      node.dataset.index = String(idx);
      node.querySelector('.play').addEventListener('click', () => playItem(item, 'playlist'));
      node.querySelector('.remove').addEventListener('click', (ev) => {
        ev.stopPropagation();
        removeFromPlaylist(item.id);
      });
      node.addEventListener('dblclick', () => playItem(item, 'playlist'));
      attachDragHandlers(node);
      if (state.currentId === item.id && state.currentSource === 'playlist') node.classList.add('playing');
      els.playlist.appendChild(node);
    });
  }

  function fillRow(node, item) {
    const img = node.querySelector('.thumb');
    img.src = item.thumb;
    img.loading = 'lazy';
    img.alt = '';
    node.querySelector('.title').textContent = item.title;
    const durStr = item.duration ? ' · ' + fmtTime(item.duration) : '';
    const badge = item.verified ? ' ✓' : (item.topic ? ' ♪' : '');
    node.querySelector('.sub').textContent = item.artist + badge + durStr;
  }

  // ---------- Playlist mgmt ----------
  function addToPlaylist(item) {
    if (state.playlist.some((x) => x.id === item.id)) {
      setStatus(`«${item.title}» уже в плейлисте.`);
      return;
    }
    state.playlist.push({
      id: item.id, title: item.title, artist: item.artist,
      thumb: item.thumb, duration: item.duration || null,
      verified: !!item.verified, topic: !!item.topic,
    });
    savePlaylist();
    renderPlaylist();
    setStatus(`Добавил в плейлист: ${item.title}`);
  }

  function removeFromPlaylist(id) {
    state.playlist = state.playlist.filter((x) => x.id !== id);
    savePlaylist();
    renderPlaylist();
  }

  function clearPlaylist() {
    if (!state.playlist.length) return;
    if (!confirm('Точно снести весь плейлист?')) return;
    state.playlist = [];
    savePlaylist();
    renderPlaylist();
  }

  function shufflePlaylist() {
    const arr = state.playlist.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.playlist = arr;
    savePlaylist();
    renderPlaylist();
  }

  function exportPlaylist() {
    const blob = new Blob([JSON.stringify(state.playlist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bratan-playlist.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importPlaylist(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('not array');
        const clean = arr.filter((x) => x && typeof x.id === 'string' && typeof x.title === 'string');
        // merge: existing first, then new items not already present
        const seen = new Set(state.playlist.map((x) => x.id));
        for (const it of clean) if (!seen.has(it.id)) { state.playlist.push(it); seen.add(it.id); }
        savePlaylist();
        renderPlaylist();
        setStatus(`Импортировал ${clean.length} треков.`);
      } catch (e) {
        setStatus('Не смог прочитать файл плейлиста.');
      }
    };
    reader.readAsText(file);
  }

  // ---------- Drag & drop reorder ----------
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
      renderPlaylist();
    });
  }

  // ---------- Audio player (direct streams, no iframe) ----------
  function initAudio() {
    els.audio.volume = state.volume / 100;
    els.audio.addEventListener('play', () => {
      state.isPlaying = true;
      els.playBtn.textContent = '⏸';
    });
    els.audio.addEventListener('playing', () => {
      state.isPlaying = true;
      state.consecutiveErrors = 0;
      els.playBtn.textContent = '⏸';
    });
    els.audio.addEventListener('pause', () => {
      state.isPlaying = false;
      els.playBtn.textContent = '▶';
    });
    els.audio.addEventListener('ended', () => {
      state.isPlaying = false;
      els.playBtn.textContent = '▶';
      onTrackEnded();
    });
    els.audio.addEventListener('timeupdate', () => {
      const cur = els.audio.currentTime || 0;
      const dur = els.audio.duration || 0;
      els.curTime.textContent = fmtTime(cur);
      if (dur > 0 && isFinite(dur)) {
        els.durTime.textContent = fmtTime(dur);
        if (!els.seek._dragging) {
          els.seek.value = Math.floor((cur / dur) * 1000);
          setRangeFill(els.seek);
        }
      }
    });
    els.audio.addEventListener('loadedmetadata', () => {
      const dur = els.audio.duration || 0;
      if (dur > 0 && isFinite(dur)) els.durTime.textContent = fmtTime(dur);
    });
    els.audio.addEventListener('error', () => {
      onStreamError('Стрим отвалился');
    });
    updateLoopBtn();
  }

  function onStreamError(reason) {
    const title = els.nowTitle.textContent || 'трек';
    setStatus(`${reason} на «${title}». Переключаюсь дальше…`);
    state.consecutiveErrors++;
    if (state.consecutiveErrors > 6) {
      setStatus('Много подряд проблемных треков — останавливаюсь. Попробуй другой API сверху или другой запрос.');
      state.consecutiveErrors = 0;
      return;
    }
    onTrackEnded();
  }

  // Fetch highest-bitrate audio stream for a videoId. Tries the selected instance
  // first, then falls back through the rest. Returns {url, bitrate, codec, mime, quality}.
  async function fetchBestAudio(videoId) {
    const instances = [state.instance, ...DEFAULT_INSTANCES.filter((i) => i !== state.instance)];
    let lastErr = null;
    for (const base of instances) {
      try {
        const res = await fetchWithTimeout(`${base}/streams/${encodeURIComponent(videoId)}`, 10000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
        if (!streams.length) throw new Error('нет аудио-стримов');
        // Prefer opus (better quality per bitrate), fall back to anything
        const opus = streams.filter((s) => /opus/i.test(s.codec || '') || /opus/i.test(s.mimeType || ''));
        const pool = opus.length ? opus : streams;
        pool.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = pool[0];
        if (!best || !best.url) throw new Error('нет URL у стрима');
        // remember working instance for next time
        if (base !== state.instance) {
          state.instance = base;
          localStorage.setItem(LS_KEY_INSTANCE, base);
          els.instance.value = base;
        }
        return {
          url: best.url,
          bitrate: best.bitrate || 0,
          codec: (best.codec || '').split('.')[0] || (best.mimeType || '').split('/')[1] || '',
          mime: best.mimeType || '',
          quality: best.quality || '',
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('не нашёл аудио');
  }

  async function playItem(item, source) {
    state.currentId = item.id;
    state.currentSource = source;
    els.nowThumb.src = item.thumb || '';
    els.nowTitle.textContent = item.title;
    els.nowArtist.textContent = item.artist;
    els.curTime.textContent = '0:00';
    els.durTime.textContent = item.duration ? fmtTime(item.duration) : '0:00';
    els.seek.value = 0; setRangeFill(els.seek);
    els.quality.textContent = '';
    // highlight
    for (const li of document.querySelectorAll('.row.playing')) li.classList.remove('playing');
    renderResults(); renderPlaylist();

    // Cancel any in-flight stream fetch for a previous track
    const token = ++state.currentReqToken;
    setStatus(`Граблю аудио «${item.title}»…`);
    try {
      const stream = await fetchBestAudio(item.id);
      if (token !== state.currentReqToken) return; // user moved on already
      els.audio.src = stream.url;
      els.audio.volume = state.volume / 100;
      try { await els.audio.play(); } catch (e) {
        // browser may block autoplay on the very first track without user gesture — but since
        // playItem is called from a click handler this should work. If not, surface error.
        onStreamError('Не удалось запустить'); return;
      }
      const kbps = stream.bitrate ? Math.round(stream.bitrate / 1000) : null;
      const badge = [kbps ? `${kbps} kbps` : null, stream.codec || null].filter(Boolean).join(' · ');
      els.quality.textContent = badge;
      setStatus(`Играю «${item.title}» (${badge || 'авто'})`);
    } catch (e) {
      if (token !== state.currentReqToken) return;
      console.error(e);
      onStreamError('Не достал стрим');
    }
  }

  function currentList() {
    if (state.currentSource === 'playlist') return state.playlist;
    if (state.currentSource === 'results') return state.results;
    return [];
  }

  function onTrackEnded() {
    const list = currentList();
    if (!list.length) return;
    const idx = list.findIndex((x) => x.id === state.currentId);
    if (idx < 0) return;
    let nextIdx = idx + 1;
    if (nextIdx >= list.length) {
      if (state.loop && state.currentSource === 'playlist') nextIdx = 0;
      else return;
    }
    playItem(list[nextIdx], state.currentSource);
  }

  function playPrev() {
    const list = currentList();
    if (list.length && state.currentId) {
      const idx = list.findIndex((x) => x.id === state.currentId);
      let prev = idx - 1;
      if (prev < 0) {
        prev = (state.loop && state.currentSource === 'playlist') ? list.length - 1 : 0;
      }
      playItem(list[prev], state.currentSource);
    } else if (state.playlist.length) {
      playItem(state.playlist[0], 'playlist');
    }
  }
  function playNext() {
    const list = currentList();
    if (list.length && state.currentId) {
      const idx = list.findIndex((x) => x.id === state.currentId);
      let next = idx + 1;
      if (next >= list.length) {
        next = (state.loop && state.currentSource === 'playlist') ? 0 : list.length - 1;
      }
      playItem(list[next], state.currentSource);
    } else if (state.playlist.length) {
      playItem(state.playlist[0], 'playlist');
    }
  }
  function togglePlay() {
    if (!state.currentId) {
      if (state.playlist.length) playItem(state.playlist[0], 'playlist');
      return;
    }
    if (els.audio.paused) { els.audio.play().catch(() => {}); }
    else els.audio.pause();
  }
  function updateLoopBtn() {
    els.loopBtn.classList.toggle('active', state.loop);
  }

  // ---------- Wiring ----------
  function wire() {
    els.searchBtn.addEventListener('click', runSearch);
    els.search.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
    els.playBtn.addEventListener('click', togglePlay);
    els.prevBtn.addEventListener('click', playPrev);
    els.nextBtn.addEventListener('click', playNext);
    els.loopBtn.addEventListener('click', () => {
      state.loop = !state.loop;
      localStorage.setItem(LS_KEY_LOOP, state.loop ? '1' : '0');
      updateLoopBtn();
    });
    els.shuffleBtn.addEventListener('click', shufflePlaylist);
    els.clearBtn.addEventListener('click', clearPlaylist);
    els.exportBtn.addEventListener('click', exportPlaylist);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importPlaylist(f);
      els.importFile.value = '';
    });

    els.seek.addEventListener('input', () => {
      els.seek._dragging = true;
      setRangeFill(els.seek);
    });
    els.seek.addEventListener('change', () => {
      els.seek._dragging = false;
      const dur = els.audio.duration || 0;
      if (dur > 0 && isFinite(dur)) {
        const pct = parseInt(els.seek.value, 10) / 1000;
        try { els.audio.currentTime = dur * pct; } catch {}
      }
    });
    els.volume.value = state.volume;
    setRangeFill(els.volume);
    els.volume.addEventListener('input', () => {
      state.volume = clampInt(els.volume.value, 0, 100);
      localStorage.setItem(LS_KEY_VOLUME, String(state.volume));
      setRangeFill(els.volume);
      els.audio.volume = state.volume / 100;
    });

    // keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '')) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight' && e.shiftKey) playNext();
      else if (e.key === 'ArrowLeft' && e.shiftKey) playPrev();
    });
  }

  // ---------- Boot ----------
  initInstanceSelect();
  initAudio();
  wire();
  renderResults();
  renderPlaylist();
  setStatus('');
})();
