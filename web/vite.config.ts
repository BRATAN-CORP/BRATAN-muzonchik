import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// The repo is served under https://bratan-corp.github.io/BRATAN-muzonchik/
// so Vite needs a matching base for asset URLs to resolve.
export default defineConfig({
  base: '/BRATAN-muzonchik/',
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'БРАТАН-музончик',
        short_name: 'БРАТАН',
        description: 'Минималистичный музыкальный плеер',
        theme_color: '#0b0b0c',
        background_color: '#0b0b0c',
        display: 'standalone',
        start_url: '/BRATAN-muzonchik/',
        scope: '/BRATAN-muzonchik/',
        icons: [
          { src: 'icon.svg', sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/bratan-muzonchik\.bratan-muzonchik\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'bratan-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
