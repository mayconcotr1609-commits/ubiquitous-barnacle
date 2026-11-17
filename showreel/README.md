# KYO-WEB-ONLINE · product showreel

A 15-second, 1920×1080 @ 60 fps motion piece for **kyo-web-online** ([kyonax.com](https://kyonax.com)).
It is fully procedural: a canvas animation in `reel.js` where each frame is a pure function of time, plus a synthesized score.

**Output:** `kyo-showreel.mp4`

| Time | Beat | What it shows |
|---|---|---|
| 0.0–2.8 | Boot | `npm run dev` and the predev pipelines; the ASCII **KN** mark resolves cell by cell; wordmark |
| 2.8–6.4 | 01 · How it works | `src/data` → `vue-i18n` → `precheck` (8 gates pass) → `vite-ssg` → `dist/` → Actions → **LIVE** |
| 6.4–8.8 | 02 · Assets + i18n | `reckit.txt` scanned into a raster (JPG / WEBP q90 / AVIF q75); live EN ⇄ ES copy swap; parity stamp |
| 8.8–12.0 | 03 · Use cases | Guided site tour: hero (ASCII→photo portrait), project cards with live countdowns and the status model, experience timeline, skills, JSON-LD |
| 12.0–13.6 | 04 · Numbers | Kinetic slam: 8 GATES · EN / ES · 0 HEX · SSG |
| 13.6–15.0 | 05 · Outro | Mark drops in, KYONAX.COM, credits, CRT power-off |

The palette (`#f9cd26` brand yellow on `oklch(14.5% 0 0)`, plus the blue, magenta, green, orange and red state colors), the Space Mono and Geomanist fonts, and the ASCII art all come from the site's own sources.

## Rebuild

```bash
./fetch-assets.sh                 # copies fonts/images/ascii from Kyonax/kyonax.github.io
python3 soundtrack.py             # -> soundtrack.wav (needs numpy + scipy)
node render.mjs --workers 4       # -> kyo-showreel.mp4 (needs playwright + ffmpeg)
```

Live preview: serve this folder (for example with `python3 -m http.server`) and open `index.html`. Press space to play or pause, and click to scrub.
Stills: `node render.mjs --only 3.6,9.9 --frames ./stills`.
