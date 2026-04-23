// Centralized icon registry. One consistent set of inline SVGs (stroke-based,
// loosely following the Lucide visual language: 24x24 viewBox, stroke-width 2,
// round linecap/join). Using SVGs lets us style color via currentColor, keeps
// bundle small, avoids emoji, and works offline (no icon-font network req).
//
// Usage:
//   import { icon } from './assets/icons.js';
//   btn.innerHTML = icon('play');
//   // or programmatic:
//   btn.appendChild(iconEl('play'));
//
// Adding a new icon: just add one entry below. Keep stroke-based visuals,
// avoid fills so light/dark themes work automatically.

const PATHS = {
  search:
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  play:
    '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
  pause:
    '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  skipForward:
    '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19"/>',
  skipBack:
    '<polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/><line x1="5" y1="19" x2="5" y2="5"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  shuffle:
    '<path d="M21 16V21h-5"/><path d="M21 21-9 9"/><path d="M15 3h6v6"/><path d="m3 3 18 18"/><path d="M14 14 21 7"/><path d="m3 3 7 7"/>',
  shuffle2:
    '<path d="M2 18h1.9c.5 0 1-.3 1.2-.8L9 10"/><path d="M22 6h-1.9c-.5 0-1 .3-1.2.8L15 14"/><path d="m18 3 4 3-4 3"/><path d="m18 15 4 3-4 3"/><path d="M2 6h1.9c.5 0 1 .3 1.2.8L9 14"/>',
  plus:
    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  close:
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  pin:
    '<path d="M12 17v5"/><path d="M9 10.76V2h6v8.76a2 2 0 0 0 .59 1.41l2.7 2.7a1 1 0 0 1-.7 1.71H6.4a1 1 0 0 1-.7-1.71l2.7-2.7A2 2 0 0 0 9 10.76Z"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.83 0L6 21"/>',
  volume:
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volumeMute:
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/>',
  home:
    '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  library:
    '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  user:
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  disc:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  maximize:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  minimize:
    '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
  sliders:
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  moon:
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun:
    '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  check:
    '<polyline points="20 6 9 17 4 12"/>',
  chevronLeft:
    '<polyline points="15 18 9 12 15 6"/>',
  chevronRight:
    '<polyline points="9 18 15 12 9 6"/>',
  chevronDown:
    '<polyline points="6 9 12 15 18 9"/>',
  menu:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list:
    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  lock:
    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  send:
    '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" opacity=".25"/>',
  star:
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  dots:
    '<circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
  drag:
    '<circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>',
  queue:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="13" y2="12"/><line x1="3" y1="18" x2="13" y2="18"/><polygon points="17 12 22 15 17 18 17 12" fill="currentColor" stroke="none"/>',
  music:
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  mic:
    '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  album:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  verified:
    '<path d="m12 2 2.4 2.2 3.2-.3.6 3.1 2.8 1.5-1.3 2.9 1.3 2.9-2.8 1.5-.6 3.1-3.2-.3L12 21l-2.4-2.2-3.2.3-.6-3.1L3 14.5l1.3-2.9L3 8.7l2.8-1.5.6-3.1 3.2.3Z"/><polyline points="9 12 11 14 15 10"/>',
  install:
    '<path d="M12 2v13"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/>',
  refresh:
    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
};

const NS = 'http://www.w3.org/2000/svg';

export function icon(name, { size = 20, className = '', strokeWidth = 2 } = {}) {
  const body = PATHS[name];
  if (!body) return '';
  const cls = className ? ` class="${escapeAttr(className)}"` : '';
  return `<svg xmlns="${NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls}>${body}</svg>`;
}

export function iconEl(name, opts) {
  const wrapper = document.createElement('span');
  wrapper.className = 'icon';
  wrapper.innerHTML = icon(name, opts);
  return wrapper.firstElementChild;
}

// Replace elements with [data-icon="name"] with rendered SVG. Safe to call
// multiple times; skips already-hydrated nodes.
export function hydrateIcons(root = document) {
  const nodes = root.querySelectorAll('[data-icon]:not([data-icon-done])');
  nodes.forEach((node) => {
    const name = node.getAttribute('data-icon');
    const size = parseInt(node.getAttribute('data-icon-size') || '', 10);
    const strokeWidth = parseFloat(node.getAttribute('data-icon-stroke') || '') || 2;
    if (!PATHS[name]) return;
    node.innerHTML = icon(name, {
      size: Number.isFinite(size) ? size : 20,
      strokeWidth,
    });
    node.setAttribute('data-icon-done', '1');
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Expose globally for non-module callers (app.js uses classic script).
if (typeof window !== 'undefined') {
  window.BRATAN_ICONS = { icon, iconEl, hydrateIcons, names: Object.keys(PATHS) };
}
