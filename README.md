# БРАТАН-музончик

Минималистичный музыкальный плеер. Единая графитовая палитра, один акцентный цвет
(`#7C5CFF`), без разноцветных градиентов. Работает в одну колонку на мобиле и как
полноценное SPA на десктопе.

## Стек

- **Frontend**: React 18 + TypeScript + Vite + Tailwind 4
- **UI base**: shadcn-подход (border-based, muted surfaces) + копия
  [`TiltedCard`](https://reactbits.dev/components/tilted-card) из
  [react-bits](https://github.com/DavidHDev/react-bits) для лендинга
- **Аудио**: Web Audio API (MediaElementSource → 10-band EQ → AnalyserNode →
  destination), hls.js лениво подгружается для SoundCloud HLS
- **PWA**: `vite-plugin-pwa` с monochrome theme
- **Деплой**: GitHub Pages, сборка через Actions
- **Backend**: Cloudflare Worker в `worker/` (Tidal/SoundCloud/YouTube прокси,
  без изменений)

## Разработка

```bash
cd web
npm install
npm run dev       # dev-server на http://localhost:5173/BRATAN-muzonchik/
npm run build     # production build в web/dist
npm run preview   # предпросмотр production-сборки
```

## Дизайн

Палитра определяется токенами в `src/styles/globals.css`:

- `--color-graphite-50 … --color-graphite-950` — нейтральная шкала
- `--accent` (#7C5CFF) — единственный акцентный цвет, используется только для
  активных состояний (progress fill, активные иконки, брендовая точка)
- Тёмная тема по умолчанию, светлая — через `data-theme="light"` на `<html>`

## Структура

```
web/
├─ src/
│  ├─ components/     # UI-примитивы, плеер, TiltedCard из react-bits
│  ├─ pages/          # Landing, Search, Library, Album, Artist
│  ├─ lib/            # api-клиент, audio-graph, извлечение палитры
│  ├─ store/          # zustand store плеера
│  └─ styles/         # globals.css (Tailwind + tokens)
├─ public/            # favicon.svg, icon.svg, hero-card.svg
└─ vite.config.ts     # base: '/BRATAN-muzonchik/' + PWA
worker/               # Cloudflare Worker (Tidal/SC/YT прокси)
```

## Деплой

- Пуш в `main` → GitHub Actions собирает `web/dist` → публикует на
  https://bratan-corp.github.io/BRATAN-muzonchik/
- Worker деплоится отдельно через `wrangler` из `worker/`.
