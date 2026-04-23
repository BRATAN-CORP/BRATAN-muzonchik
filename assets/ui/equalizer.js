// 10-band equalizer UI + preset store. Persists settings in localStorage
// (EQ values only — no sensitive data ever). Driven by audio-graph.js.
//
// Safety notes:
//   - User-created preset names are length-limited and escaped when rendered.
//   - We store plain numbers (gain in dB) plus a short string name — no HTML,
//     no URLs, no tokens. Corrupt storage is silently ignored.

const LS_KEY_EQ = 'bratan:eq:v1';
const MAX_PRESET_NAME = 40;
const MAX_CUSTOM_PRESETS = 24;

export const BUILTIN_PRESETS = [
  { id: 'flat',      name: 'Flat',            gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'bass',      name: 'Bass Boost',      gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { id: 'treble',    name: 'Treble Boost',    gains: [0, 0, 0, 0, 0, 2, 4, 5, 6, 6] },
  { id: 'vocal',     name: 'Vocal',           gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
  { id: 'electronic',name: 'Electronic',      gains: [4, 3, 1, 0, -1, 0, 1, 2, 3, 4] },
  { id: 'classical', name: 'Classical',       gains: [4, 3, 2, 1, 0, 0, -1, -1, 2, 3] },
  { id: 'rock',      name: 'Rock',            gains: [4, 3, 2, -1, -2, -1, 2, 3, 4, 4] },
  { id: 'lounge',    name: 'Lounge',          gains: [-2, -1, 0, 2, 3, 2, 0, -1, 1, 2] },
];

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY_EQ) || 'null');
    if (!raw || typeof raw !== 'object') throw 0;
    return {
      enabled: raw.enabled !== false,
      activePreset: typeof raw.activePreset === 'string' ? raw.activePreset : 'flat',
      current: Array.isArray(raw.current) && raw.current.length === 10
        ? raw.current.map((v) => clampGain(v))
        : new Array(10).fill(0),
      customPresets: Array.isArray(raw.customPresets)
        ? raw.customPresets
            .slice(0, MAX_CUSTOM_PRESETS)
            .filter((p) => p && typeof p.name === 'string' && Array.isArray(p.gains) && p.gains.length === 10)
            .map((p) => ({
              id: 'custom:' + safeName(p.name),
              name: safeName(p.name),
              gains: p.gains.map(clampGain),
            }))
        : [],
    };
  } catch {
    return {
      enabled: true,
      activePreset: 'flat',
      current: new Array(10).fill(0),
      customPresets: [],
    };
  }
}

function saveStore(store) {
  try { localStorage.setItem(LS_KEY_EQ, JSON.stringify(store)); } catch {}
}

function clampGain(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-12, Math.min(12, Math.round(n)));
}

function safeName(s) {
  return String(s)
    .replace(/[\s\S]/g, (c) => (c === '\n' || c === '\r' || c === '\t' ? ' ' : c))
    .slice(0, MAX_PRESET_NAME)
    .trim() || 'My preset';
}

export function createEqualizer({ container, audio, onAny }) {
  if (!container) return null;
  const store = loadStore();
  const freqs = (window.BRATAN_AUDIO && window.BRATAN_AUDIO.EQ_FREQS) || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  container.innerHTML = `
    <div class="eq-head">
      <div class="eq-title-row">
        <div class="eq-title">Эквалайзер</div>
        <label class="eq-switch">
          <input type="checkbox" class="eq-enabled" ${store.enabled ? 'checked' : ''}>
          <span class="eq-switch-slider"></span>
        </label>
      </div>
      <div class="eq-presets" role="tablist"></div>
    </div>
    <div class="eq-bands"></div>
    <div class="eq-actions">
      <button class="btn btn-ghost eq-reset" type="button">Сбросить</button>
      <div class="eq-save-wrap">
        <input type="text" class="eq-preset-name input-sm" maxlength="${MAX_PRESET_NAME}" placeholder="Имя пресета" />
        <button class="btn btn-accent eq-save" type="button">Сохранить</button>
      </div>
    </div>
  `;

  const bandsEl = container.querySelector('.eq-bands');
  const presetsEl = container.querySelector('.eq-presets');
  const enabledInput = container.querySelector('.eq-enabled');
  const nameInput = container.querySelector('.eq-preset-name');

  freqs.forEach((f, i) => {
    const wrap = document.createElement('label');
    wrap.className = 'eq-band';
    wrap.innerHTML = `
      <span class="eq-band-val" data-i="${i}">0</span>
      <input type="range" min="-12" max="12" step="1" value="${store.current[i]}" data-i="${i}" class="eq-slider" orient="vertical" aria-label="${f >= 1000 ? (f / 1000) + 'кГц' : f + 'Гц'}"/>
      <span class="eq-band-label">${f >= 1000 ? (f / 1000) + 'k' : f}</span>
    `;
    bandsEl.appendChild(wrap);
  });

  function renderPresets() {
    presetsEl.innerHTML = '';
    const all = [...BUILTIN_PRESETS, ...store.customPresets];
    all.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'eq-preset' + (p.id === store.activePreset ? ' active' : '');
      btn.textContent = p.name;
      btn.dataset.id = p.id;
      btn.addEventListener('click', () => applyPreset(p));
      presetsEl.appendChild(btn);

      if (p.id.startsWith('custom:')) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'eq-preset-del';
        del.title = 'Удалить пресет';
        del.setAttribute('aria-label', 'Удалить пресет');
        del.innerHTML = '<span data-icon="close" data-icon-size="12"></span>';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          store.customPresets = store.customPresets.filter((x) => x.id !== p.id);
          if (store.activePreset === p.id) store.activePreset = 'flat';
          saveStore(store);
          renderPresets();
        });
        btn.appendChild(del);
        if (window.BRATAN_ICONS) window.BRATAN_ICONS.hydrateIcons(btn);
      }
    });
  }

  function applyGainsToEngine() {
    const api = window.BRATAN_AUDIO;
    if (!api) return;
    api.setEqEnabled(store.enabled);
    store.current.forEach((v, i) => api.setEqBandGain(i, v));
  }

  function applyPreset(p) {
    store.activePreset = p.id;
    store.current = p.gains.slice();
    saveStore(store);
    // update slider positions
    container.querySelectorAll('.eq-slider').forEach((s) => {
      const i = parseInt(s.dataset.i, 10);
      s.value = store.current[i];
      const lbl = container.querySelector('.eq-band-val[data-i="' + i + '"]');
      if (lbl) lbl.textContent = String(store.current[i]);
    });
    renderPresets();
    applyGainsToEngine();
    onAny && onAny(store);
  }

  bandsEl.addEventListener('input', (ev) => {
    const s = ev.target.closest('.eq-slider');
    if (!s) return;
    const i = parseInt(s.dataset.i, 10);
    const v = clampGain(s.value);
    store.current[i] = v;
    // editing always moves to "custom (unsaved)" preset
    store.activePreset = 'custom:unsaved';
    const lbl = container.querySelector('.eq-band-val[data-i="' + i + '"]');
    if (lbl) lbl.textContent = String(v);
    saveStore(store);
    applyGainsToEngine();
    // visual de-activation of preset chips
    container.querySelectorAll('.eq-preset.active').forEach((n) => n.classList.remove('active'));
    onAny && onAny(store);
  });

  enabledInput.addEventListener('change', () => {
    store.enabled = enabledInput.checked;
    saveStore(store);
    applyGainsToEngine();
    onAny && onAny(store);
  });

  container.querySelector('.eq-reset').addEventListener('click', () => {
    applyPreset(BUILTIN_PRESETS[0]);
  });

  container.querySelector('.eq-save').addEventListener('click', () => {
    const raw = nameInput.value.trim();
    const name = safeName(raw || 'My preset');
    if (store.customPresets.length >= MAX_CUSTOM_PRESETS) {
      store.customPresets.shift();
    }
    const entry = { id: 'custom:' + Date.now().toString(36), name, gains: store.current.slice() };
    store.customPresets.push(entry);
    store.activePreset = entry.id;
    nameInput.value = '';
    saveStore(store);
    renderPresets();
  });

  // init values
  container.querySelectorAll('.eq-slider').forEach((s) => {
    const i = parseInt(s.dataset.i, 10);
    const lbl = container.querySelector('.eq-band-val[data-i="' + i + '"]');
    if (lbl) lbl.textContent = String(store.current[i]);
  });
  renderPresets();
  applyGainsToEngine();

  return {
    destroy() { container.innerHTML = ''; },
    getStore() { return store; },
  };
}

if (typeof window !== 'undefined') {
  window.BRATAN_EQ = { createEqualizer, BUILTIN_PRESETS };
}
