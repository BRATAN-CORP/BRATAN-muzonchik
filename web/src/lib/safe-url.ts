// Whitelisting helper for externally-sourced image/audio URLs. The worker
// only ever returns URLs from a known set of providers; we double-check on
// the client so a misbehaving response can't inject arbitrary schemes.

export function safeHttpUrl(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  try {
    const u = new URL(input, window.location.origin);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
    return undefined;
  } catch {
    return undefined;
  }
}

export function encodeQuery(value: string): string {
  return encodeURIComponent(value.trim());
}
