/// <reference types="vite/client" />

// Vite dev dynamic-URL imports (hls.js from CDN) — declare a wildcard module
// so TypeScript doesn't freak out about the remote path.
declare module 'https://cdn.jsdelivr.net/*' {
  const anyExport: unknown;
  export default anyExport;
}
