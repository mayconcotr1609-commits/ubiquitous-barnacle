// Renders index.html frame-by-frame with headless Chromium, then encodes with ffmpeg.
// usage: node render.mjs [--out out.mp4] [--frames dir] [--workers 3] [--only 1.5,4.2] [--fps 60]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, 'kyo-showreel.mp4')));
const FRAMES = path.resolve(arg('frames', path.join(ROOT, '.frames')));
const WORKERS = +arg('workers', 3);
const ONLY = arg('only', null);
const FPS = +arg('fps', 60), DUR = 15;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render`;

fs.mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-device-scale-factor=1'] });
async function worker(times) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto(url);
  await page.evaluate(() => window.READY);
  await page.addStyleTag({ content: 'canvas{width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}body{display:block!important}' });
  const canvas = await page.$('canvas');
  for (const [name, t] of times) {
    await page.evaluate(t => window.renderFrame(t), t);
    await canvas.screenshot({ path: path.join(FRAMES, name), type: 'png' });
  }
}
const t0 = Date.now();
if (ONLY) {
  const times = ONLY.split(',').map(s => [`still_${s}.png`, +s]);
  await worker(times);
  console.log('stills →', FRAMES);
} else {
  const N = Math.round(DUR * FPS);
  const all = Array.from({ length: N }, (_, f) => [`f${String(f).padStart(5, '0')}.png`, f / FPS]);
  const chunks = Array.from({ length: WORKERS }, (_, w) => all.filter((_, i) => i % WORKERS === w));
  let done = 0; const tick = setInterval(() => { done = fs.readdirSync(FRAMES).filter(f => f.startsWith('f')).length; process.stdout.write(`\r${done}/${N} frames`); }, 3000);
  await Promise.all(chunks.map(worker));
  clearInterval(tick);
  console.log(`\nrendered ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const audio = path.join(ROOT, 'soundtrack.wav');
  const a = fs.existsSync(audio) ? ['-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest'] : [];
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.png'), ...a,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log(r.status === 0 ? `✓ ${OUT}` : 'ffmpeg failed');
}
await browser.close();
server.close();
