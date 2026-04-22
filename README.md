# БРАТАН-музончик 🎧

Бесплатный музыкальный плеер прямо в браузере — ищешь трек, жмёшь ▶, слушаешь.
Без регистрации, без подписок, без рекламы. Только официальные релизы.

## Что под капотом

- **Источник музыки** — публичный SoundCloud API v2 (`api-v2.soundcloud.com`).
  Никаких ключей, никакого логина — `client_id` скрэпится c главной страницы
  `soundcloud.com` (встроен в сборку).
- **Плеер** — нативный `<audio>` + [hls.js](https://github.com/video-dev/hls.js)
  для HLS-стримов. Формат: plain-HLS MP3 128 kbps (без DRM). На Safari/iOS HLS
  играется нативно, hls.js не грузится.
- **Только официал** — пропускаем трек только если:
    1. автор верифицирован (синяя галочка SoundCloud), ИЛИ
    2. у трека заполнен `publisher_metadata.artist/album/isrc` — т.е. релиз через лейбл;
  плюс жёсткий словарь отсева (cover, karaoke, sped up, slowed, nightcore, remix,
  mashup, fan edit, lyric video, instrumental, acapella, type beat и т.д.).
  Рядом с верифицированными артистами — галочка ✓.
- **Плейлист** — сохраняется в `localStorage` твоего браузера. Можно
  экспортировать в JSON и импортировать назад.
- **Фронт** — ванильный HTML/CSS/JS без сборки, без своего бэкенда.

## Фичи

- Поиск по SoundCloud с автоматическим отсевом неофициальных треков.
- Управление: play/pause, next/prev, seek, громкость, повтор плейлиста (🔁), перемешать (🔀).
- Перетаскивание треков в плейлисте для смены порядка (за ручку `≡`).
- Импорт/экспорт плейлиста в JSON.
- Хоткеи: `Space` — play/pause, `Shift+→` — next, `Shift+←` — prev.

## Как запустить локально

Просто открой `index.html` в браузере. Или из этой папки:

```sh
python3 -m http.server 8080
```

и открой http://localhost:8080.

## Деплой

Автоматически деплоится на GitHub Pages через Actions при пуше в `main`.
Workflow: [.github/workflows/pages.yml](.github/workflows/pages.yml).

## Оговорки

- SoundCloud `client_id` периодически ротируется (раз в несколько месяцев). Если поиск
  вдруг начнёт отдавать 401 — нужно выдернуть новый id из JS-бандла на https://soundcloud.com
  и добавить в массив `SC_CLIENT_IDS` в [app.js](app.js).
- Качество — 128 kbps MP3 (единственный вариант без DRM у SoundCloud публично).
  160 kbps AAC у SoundCloud идёт с FairPlay-шифрованием (`cbc-encrypted-hls`),
  который в браузере проиграть нельзя.
- Не все артисты есть на SoundCloud — если нужного трека там нет, поиск
  вернёт пусто. Коверэйдж для мейнстрима (Weeknd, Drake, Dua Lipa, Taylor Swift,
  Billie Eilish, Post Malone, Kendrick Lamar, Daft Punk и т.д.) почти полный.
- Это клиент-сайд плеер. Никакие твои плейлисты никуда не уходят — всё в `localStorage` твоего браузера.

## История источников

В ветке `main` до коммита `e7e97e9` источником был YouTube Music через
[Piped](https://github.com/TeamPiped/Piped). Пришлось мигрировать на SoundCloud
потому что:
1. Почти все публичные Piped-инстансы остановили анонимный API или не отдают CORS.
2. Единственный оставшийся CORS-friendly инстанс (`api.piped.private.coffee`)
   упёрся в YouTube-шный `SignInConfirmNotBotException` — YouTube забанил его IP
   за анонимные запросы к `/watch`.
3. YouTube IFrame Player на мейджор-лейбле блочит embedding у большинства хитов
   (The Weeknd, Daft Punk, Drake и т.д.), что ломает fallback-план.
