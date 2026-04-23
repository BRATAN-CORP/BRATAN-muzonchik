// Tiny hash-based router. Generic, framework-free. Registers handlers by
// pattern; handlers get parsed params. Works on GitHub Pages without server
// config because we never change the path, only the hash.
//
// Route patterns support `:param` and `*rest`:
//   '#/'               -> home/landing
//   '#/search/:q'      -> search with query
//   '#/artist/:id'     -> artist page
//   '#/album/:src/:id' -> album page
//   '#/library'        -> playlist
//
// The router is a safe sink for user input: we never inject hash content as
// HTML. Params are decoded and passed through as plain strings — consumers
// are responsible for escaping when rendering.

const routes = [];
let onChange = null;
let currentPath = null;

export function route(pattern, handler) {
  const parts = pattern.split('/').filter(Boolean);
  const matcher = (hash) => {
    const hashParts = hash.split('/').filter(Boolean);
    if (parts.length !== hashParts.length && !parts.some((p) => p.startsWith('*'))) return null;
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const h = hashParts[i];
      if (p.startsWith(':')) {
        if (h === undefined) return null;
        params[p.slice(1)] = safeDecode(h);
      } else if (p.startsWith('*')) {
        params[p.slice(1)] = hashParts.slice(i).map(safeDecode).join('/');
        return { params, handler };
      } else if (p !== h) {
        return null;
      }
    }
    return { params, handler };
  };
  routes.push(matcher);
}

export function navigate(hashPath, { replace = false } = {}) {
  const full = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
  if (replace) {
    location.replace(full);
  } else if (location.hash !== full) {
    location.hash = full;
  } else {
    // Force handler re-run when re-navigating to the same route (e.g. search).
    resolve();
  }
}

export function start(defaultPath = '/') {
  window.addEventListener('hashchange', resolve);
  if (!location.hash) {
    navigate(defaultPath, { replace: true });
  } else {
    resolve();
  }
}

export function onRoute(fn) {
  onChange = fn;
}

function resolve() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  if (hash === currentPath) {
    // still notify listener — useful for scroll-to-top, etc.
  }
  currentPath = hash;
  for (const matcher of routes) {
    const res = matcher(hash);
    if (res) {
      try { res.handler(res.params, hash); } catch (e) { console.error('route handler failed', e); }
      if (onChange) onChange(hash, res.params);
      return;
    }
  }
  if (onChange) onChange(hash, {});
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

if (typeof window !== 'undefined') {
  window.BRATAN_ROUTER = { route, navigate, start, onRoute };
}
