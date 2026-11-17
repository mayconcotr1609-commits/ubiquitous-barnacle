/*
 * KYO-WEB-ONLINE // product showreel
 * 15s, 1920x1080. Every frame is a pure function of time: render(t).
 * Palette + fonts mirror Kyonax/kyonax.github.io (src/scss/abstracts/_variables.scss).
 */
'use strict';

const W = 1920, H = 1080, DUR = 15, FPS = 60;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let g = ctx; // current drawing target (swapped for glow passes)

/* ── palette (oklch tokens from the site, converted to sRGB) ─────────────── */
const C = {
  bg: '#0a0a0a', card: '#131315', card2: '#18181b',
  y: '#f9cd26', y50: '#f6e6a0', y200: '#c9a61c', y300: '#977d10', y400: '#665409', y500: '#3a2b06',
  blue: '#265ef9', mag: '#ee3ec5', green: '#6cb42a', orange: '#f98b26', red: '#d1263d',
  white: '#f8f8f8', text: '#b8b8b8', sub: '#c3c3cc', mute: '#a5a5ae', dim: '#7a7a7a', zinc: '#3f3f46',
  line: 'rgba(255,255,255,0.2)', line2: 'rgba(255,255,255,0.08)',
};
const MONO = 'SpaceMono, "DejaVu Sans Mono", monospace';
const SANS = 'Geomanist, "DejaVu Sans", sans-serif';

/* ── math ────────────────────────────────────────────────────────────────── */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out3: t => 1 - Math.pow(1 - t, 3),
  in3: t => t * t * t,
  inOut3: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};
const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const GLY = '░▒▓█#%&@$*+=-:/\\|<>[]{}01KYONAX京';
const rglyph = (i, t) => GLY[Math.floor(hash(i * 7.31 + Math.floor(t * 30) * 3.7) * GLY.length)];

/* Scramble-resolve: chars resolve left→right, a short band of noise leads. */
function scr(str, p, seed = 0, t = 0, band = 5) {
  if (p >= 1) return str;
  if (p <= 0) return '';
  const n = str.length, r = p * (n + band);
  let o = '';
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    if (i < r - band) o += ch;
    else if (i < r) o += ch === ' ' ? ' ' : rglyph(i + seed, t);
    else break;
  }
  return o;
}
/* Morph one string into another through noise. */
function morph(a, b, p, seed, t) {
  if (p <= 0) return a;
  if (p >= 1) return b;
  const n = Math.max(a.length, b.length);
  let o = '';
  for (let i = 0; i < n; i++) {
    const k = i / n;
    if (k < p - 0.25) o += b[i] || '';
    else if (k < p + 0.05) o += rglyph(i + seed, t);
    else o += a[i] || '';
  }
  return o;
}

/* ── drawing helpers ─────────────────────────────────────────────────────── */
function txt(s, x, y, o = {}) {
  const { font = MONO, size = 24, weight = 400, color = C.white, align = 'left', base = 'alphabetic', alpha = 1, ls = 0 } = o;
  if (!s || alpha <= 0) return 0;
  g.save();
  g.globalAlpha *= alpha;
  g.font = `${weight} ${size}px ${font}`;
  g.letterSpacing = ls + 'px';
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  g.fillText(s, x, y);
  const w = g.measureText(s).width;
  g.restore();
  return w;
}
function measure(s, size, font = MONO, weight = 400, ls = 0) {
  g.save(); g.font = `${weight} ${size}px ${font}`; g.letterSpacing = ls + 'px';
  const w = g.measureText(s).width; g.restore(); return w;
}
function rrect(x, y, w, h, r, fill, stroke, lw = 1.5) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function line(x1, y1, x2, y2, color, lw = 1.5, dash) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw;
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function brackets(x, y, w, h, len, color, lw = 2) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.beginPath();
  g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y);
  g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len);
  g.moveTo(x + w, y + h - len); g.lineTo(x + w, y + h); g.lineTo(x + w - len, y + h);
  g.moveTo(x + len, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - len);
  g.stroke(); g.restore();
}
function chip(s, x, y, color, o = {}) {
  const { size = 14, fill = null, textColor = color, dot = false, alpha = 1, pad = 14, h = size * 2.1 } = o;
  const w = measure(s, size, MONO, 700, 1.5) + pad * 2 + (dot ? 18 : 0);
  g.save(); g.globalAlpha *= alpha;
  rrect(x, y, w, h, h / 2, fill || hexA(color, 0.12), hexA(color, 0.75), 1.5);
  if (dot) { g.fillStyle = color; g.beginPath(); g.arc(x + pad + 4, y + h / 2, 5, 0, 7); g.fill(); }
  txt(s, x + pad + (dot ? 18 : 0), y + h / 2 + 1, { size, weight: 700, color: textColor, base: 'middle', ls: 1.5 });
  g.restore();
  return w;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ── ASCII shading (░▒▓█▀▄) as real dither patterns ───────────────────────── */
const patCache = {};
function pat(ch, color) {
  const k = ch + color;
  if (patCache[k]) return patCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 4;
  const x = c.getContext('2d'); x.fillStyle = color;
  ({ '░': [[0, 0]], '▒': [[0, 0], [2, 2]], '▓': [[0, 0], [2, 2], [2, 0]] })[ch].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
  return (patCache[k] = ctx.createPattern(c, 'repeat'));
}
function block(ch, x, y, w, h, color) {
  switch (ch) {
    case ' ': return;
    case '█': g.fillStyle = color; g.fillRect(x, y, w + 0.5, h + 0.5); return;
    case '▀': g.fillStyle = color; g.fillRect(x, y, w + 0.5, h / 2); return;
    case '▄': g.fillStyle = color; g.fillRect(x, y + h / 2, w + 0.5, h / 2); return;
    case '░': case '▒': case '▓': g.fillStyle = pat(ch, color); g.fillRect(x, y, w + 0.5, h + 0.5); return;
    default:
      g.fillStyle = color; g.font = `700 ${Math.round(h * 0.8)}px ${MONO}`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '0px';
      g.fillText(ch, x + w / 2, y + h / 2);
  }
}
const shadeColor = ch => ({ '█': C.y, '▓': C.y50, '▒': C.y200, '░': C.y300, '▀': C.y, '▄': C.y })[ch] || C.y;

/* The KN mark — verbatim from Kyonax/kyonax.github.io src/assets/ascii/kyo-website.txt */
const LOGO = [
  '           ░░░░░░░',
  '░░░░░░░░░░░▒█████▒░░░░░░░░░░░ ░░░░░░░░            ░░░░░░░░░',
  '░▓▓▓▓▓▓▓▓▓▒▒█████▒▒▓▓▓▓▓▓▓▓▒░ ░▒▓▓▓▓▒░░           ░▒▓▓▓▓▓▓▒',
  '▒█████████▒▒█████▒▒████████▓░ ░▓██████▒░░         ░▓██████▒',
  '▒█████████▒▒█████▒▒████████▓░ ░▓████████▒░░       ░▓██████▒',
  '▒█████████▒▒█████▒▒████████▓░ ░▓██████████▓░░     ░▓██████▒',
  '▒███████▒░░▒█████▒░░▒██████▓░ ░▓████████████▓▒░   ░▓██████▒',
  '▒███████░░ ▒▓███▓▒ ░░██████▓░ ░▓██████████████▓▒░ ░▓██████▒',
  '▒███████░░  ░░░░░  ░░██████▓░ ░▓█████████████████▒░▓██████▒',
  '▒███████░░         ░░██████▓░ ░▓██████▒░▒█████████████████▒',
  '▒███████▓▓▓▓▓▓▓▓▓▓▓▓▓██████▓░ ░▓██████▒░░░▒▓██████████████▒',
  '▒██████████████████████████▓░ ░▓██████▒░   ░▒▓████████████▒',
  '▒██████████████████████████▓░ ░▓██████▒░     ░░▓██████████▒',
  '▒██████████████████████████▓░ ░▓██████▒░      ░░░▒████████▒',
  '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░░░░░░░░░          ░░░░░░░░░',
];
const LC = Math.max(...LOGO.map(l => [...l].length)), LR = LOGO.length;
const LOGO_CELLS = LOGO.map(l => [...l]);

/* Generic ASCII renderer with per-cell reveal. */
function drawAscii(cells, x0, y0, cw, ch, o = {}) {
  const { prog = 1, t = 0, mode = 'sweep', color = shadeColor, alpha = 1, seed = 0 } = o;
  const rows = cells.length, cols = Math.max(...cells.map(r => r.length));
  g.save(); g.globalAlpha *= alpha;
  for (let r = 0; r < rows; r++) {
    const row = cells[r];
    for (let c = 0; c < row.length; c++) {
      const k = row[c];
      if (k === ' ') continue;
      const id = r * 131 + c + seed;
      let x = x0 + c * cw, y = y0 + r * ch;
      let d, local;
      if (mode === 'sweep') {
        d = (c / cols) * 0.62 + hash(id) * 0.22;
        local = clamp((prog - d) / 0.16);
      } else if (mode === 'drop') {
        d = (c / cols) * 0.45 + hash(id) * 0.12;
        local = clamp((prog - d) / 0.3);
        y -= (1 - E.outBack(local)) * 140;
      } else if (mode === 'rows') {
        d = (r / rows) * 0.7 + hash(id) * 0.15;
        local = clamp((prog - d) / 0.15);
      } else local = 1;
      if (local <= 0) continue;
      if (local < 1) {
        const fl = hash(id + Math.floor(t * 40));
        g.globalAlpha = alpha * (0.4 + 0.6 * local);
        block(fl > 0.55 ? '█' : rglyph(id, t), x, y, cw, ch, fl > 0.8 ? C.white : C.y);
        g.globalAlpha = alpha;
      } else block(k, x, y, cw, ch, color(k, r, c));
    }
  }
  g.restore();
}

/* ── offscreen buffers ───────────────────────────────────────────────────── */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const FX = mk(W, H), FXc = FX.getContext('2d');
const HALF = mk(W / 2, H / 2), HALFc = HALF.getContext('2d');
const TMP = mk(W, H), TMPc = TMP.getContext('2d');

/* Draw fn into a glow layer: crisp + half-res blurred additive bloom. */
function glow(fn, blur = 14, strength = 0.9) {
  FXc.setTransform(1, 0, 0, 1, 0, 0); FXc.clearRect(0, 0, W, H);
  FXc.setTransform(g.getTransform());
  const prev = g; g = FXc; fn(); g = prev;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(FX, 0, 0);
  HALFc.clearRect(0, 0, W / 2, H / 2);
  HALFc.filter = `blur(${blur / 2}px)`;
  HALFc.drawImage(FX, 0, 0, W / 2, H / 2);
  HALFc.filter = 'none';
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = strength;
  g.drawImage(HALF, 0, 0, W, H);
  g.restore();
}

/* grain / scanlines / vignette, precomputed */
const GRAIN = [0, 1, 2, 3].map(s => {
  const c = mk(W / 2, H / 2), x = c.getContext('2d'), d = x.createImageData(W / 2, H / 2);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = hash(i * 0.37 + s * 999.1) * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c;
});
const SCAN = (() => { const c = mk(1, 4), x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 3, 1, 1); return ctx.createPattern(c, 'repeat'); })();
const VIG = (() => {
  const c = mk(W, H), x = c.getContext('2d');
  const gr = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
  x.fillStyle = gr; x.fillRect(0, 0, W, H); return c;
})();

/* ── assets ──────────────────────────────────────────────────────────────── */
const IMG = {}, ICON = {};
let PORTRAIT_CELLS = null, RECKIT_CELLS = null;
const BRANDS = ['vue', 'vite', 'ts', 'node', 'react', 'docker', 'playwright', 'postgresql', 'nest', 'scss', 'mongodb', 'githubactions', 'claude', 'bash'];
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function loadAssets() {
  const fonts = ['400 20px SpaceMono', '700 20px SpaceMono', '400 20px Geomanist', '700 20px Geomanist'];
  await Promise.all(fonts.map(f => document.fonts.load(f, 'AKYO░▒▓█')));
  for (const k of ['portrait', 'org2html', 'kyo-blog', 'reckit']) IMG[k] = await loadImg(`assets/${k}.jpg`);
  for (const b of BRANDS) {
    try {
      const svg = await (await fetch(`assets/brands/${b}.svg`)).text();
      ICON[b] = {
        w: await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/currentColor/g, '#d9d9de'))),
        y: await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/currentColor/g, C.y))),
      };
    } catch (e) { /* icon optional */ }
  }
  try {
    const raw = await (await fetch('assets/reckit.txt')).text();
    RECKIT_CELLS = raw.split('\n').filter(l => l.trim() && !/^[a-z-]+\s/.test(l)).map(l => [...l]);
  } catch (e) { RECKIT_CELLS = LOGO_CELLS; }
  if (IMG.portrait) {
    const cols = 50, rows = 25, c = mk(cols, rows), x = c.getContext('2d');
    x.drawImage(IMG.portrait, 0, 0, cols, rows);
    try {
      const d = x.getImageData(0, 0, cols, rows).data;
      PORTRAIT_CELLS = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let q = 0; q < cols; q++) {
          const i = (r * cols + q) * 4, l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          row.push(l < 0.12 ? ' ' : l < 0.3 ? '░' : l < 0.5 ? '▒' : l < 0.7 ? '▓' : '█');
        }
        PORTRAIT_CELLS.push(row);
      }
    } catch (e) { PORTRAIT_CELLS = null; }
  }
}

/* ── timeline ────────────────────────────────────────────────────────────── */
const CUT = { flow: 2.8, assets: 6.4, site: 8.8, slam: 12.0, outro: 13.6 };
const SCENES = [
  { id: '00 // BOOT', a: 0, b: CUT.flow, fn: sceneBoot },
  { id: '01 // HOW IT WORKS', a: CUT.flow, b: CUT.assets, fn: sceneFlow },
  { id: '02 // ASSETS + I18N', a: CUT.assets, b: CUT.site, fn: sceneAssets },
  { id: '03 // USE CASES', a: CUT.site, b: CUT.slam, fn: sceneSite },
  { id: '04 // BY THE NUMBERS', a: CUT.slam, b: CUT.outro, fn: sceneSlam },
  { id: '05 // KYONAX.COM', a: CUT.outro, b: DUR + 1, fn: sceneOutro },
];

/* ── backgrounds ─────────────────────────────────────────────────────────── */
function dotGrid(t, ox = 0, oy = 0, alpha = 1, step = 48) {
  g.save(); g.globalAlpha = 0.16 * alpha; g.fillStyle = '#ffffff';
  const sx = ((-ox % step) + step) % step, sy = ((-oy % step) + step) % step;
  for (let x = sx; x < W; x += step) for (let y = sy; y < H; y += step) g.fillRect(x - 1, y - 1, 2, 2);
  g.restore();
}
function floorGrid(t, color = C.y, alpha = 0.35, speed = 1) {
  g.save();
  const hy = H * 0.62, n = 22;
  g.strokeStyle = color; g.lineWidth = 1;
  for (let i = -n; i <= n; i++) {
    g.globalAlpha = alpha * 0.5 * (1 - Math.abs(i) / n);
    g.beginPath(); g.moveTo(W / 2 + i * 40, hy); g.lineTo(W / 2 + i * 260, H); g.stroke();
  }
  const off = (t * speed) % 1;
  for (let k = 0; k < 14; k++) {
    const z = (k + off) / 14, y = hy + Math.pow(z, 2.2) * (H - hy);
    g.globalAlpha = alpha * z;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  const gr = g.createLinearGradient(0, hy - 10, 0, hy + 140);
  gr.addColorStop(0, C.bg); gr.addColorStop(1, 'rgba(10,10,10,0)');
  g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, hy - 10, W, 150);
  g.restore();
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 0 — BOOT: terminal → ASCII mark resolves → wordmark
 * ════════════════════════════════════════════════════════════════════════ */
function sceneBoot(t) {
  dotGrid(t, 0, t * 20, P(t, 0, 0.6));
  const CW = 16, CH = 32, lw = LC * CW, lh = LR * CH;
  const lx = (W - lw) / 2, ly = 470 - lh / 2;
  const zoom = E.inExpo(P(t, 2.35, 2.8));
  g.save();
  g.translate(W / 2, 470); g.scale(1 + zoom * 5, 1 + zoom * 5); g.rotate(zoom * 0.08); g.translate(-W / 2, -470);

  // terminal
  const tUp = E.inOut3(P(t, 0.92, 1.3));
  if (tUp < 1) {
    g.save(); g.globalAlpha = 1 - tUp; g.translate(0, -tUp * 260);
    const tx = 400, ty = 470;
    const prompt = 'kyonax@ccs ~/kyo-web-online $ ';
    const cmd = 'npm run dev';
    const typed = cmd.slice(0, Math.floor(P(t, 0.12, 0.45) * cmd.length));
    const pw = txt(prompt, tx, ty, { size: 30, color: C.dim });
    const cw = txt(typed, tx + pw, ty, { size: 30, color: C.white, weight: 700 });
    if (Math.floor(t * 4) % 2 === 0 || t < 0.5) { g.fillStyle = C.y; g.fillRect(tx + pw + cw + 4, ty - 26, 16, 32); }
    const logs = [
      [0.5, '›  predev   convert:ascii     ░▒▓█ → jpg · webp · avif', C.text],
      [0.58, '›  predev   convert:images    sharp  q90 · q75', C.text],
      [0.66, '›  predev   generate:sitemap  /  ·  /es/', C.text],
      [0.76, '   VITE  dev server  →  http://localhost:9000', C.y],
    ];
    logs.forEach(([at, s, col], i) => {
      const p = P(t, at, at + 0.12);
      if (p > 0) {
        txt(scr(s, p, i * 50, t), tx, ty + 56 + i * 42, { size: 22, color: col, alpha: p });
        if (i < 3 && p >= 1) txt('✓', tx + 1030, ty + 56 + i * 42, { size: 22, color: C.green, weight: 700 });
      }
    });
    g.restore();
  }

  // ASCII mark
  const lp = P(t, 0.88, 2.0);
  if (lp > 0) {
    glow(() => drawAscii(LOGO_CELLS, lx, ly, CW, CH, { prog: lp, t, mode: 'sweep' }), 30, 0.42);
    if (lp < 0.97) { // scanning beam
      const bx = lx + clamp(lp / 0.84) * (lw + 40) - 20;
      glow(() => { g.fillStyle = C.white; g.fillRect(bx - 2, ly - 60, 4, lh + 120); g.fillStyle = hexA(C.y, 0.25); g.fillRect(bx - 40, ly - 60, 40, lh + 120); }, 30, 1);
    }
    // version tag like the README
    const vp = E.outBack(P(t, 1.85, 2.15));
    if (vp > 0) txt('v2.0', lx + lw + 18, ly + lh - 6, { size: 22, color: C.y, weight: 700, alpha: clamp(vp) });
  }
  // wordmark + tagline
  const wp = P(t, 1.7, 2.15);
  if (wp > 0) {
    txt(scr('KYO-WEB-ONLINE', wp, 3, t), W / 2, 800, { font: SANS, size: 78, weight: 700, color: C.white, align: 'center', ls: 22 });
    const sp = P(t, 1.92, 2.3);
    txt(scr('CYBERPUNK PORTFOLIO  ·  EN / ES  ·  VUE 3 + VITE + VITE-SSG', sp, 9, t), W / 2, 860, { size: 20, color: C.mute, align: 'center', ls: 4 });
    const lnw = E.outExpo(P(t, 1.75, 2.2)) * 520;
    line(W / 2 - lnw, 728, W / 2 + lnw, 728, hexA(C.y, 0.6), 1.5);
  }
  g.restore();
  // completion flash
  const f = 1 - P(t, 2.0, 2.25);
  if (t > 2.0 && f > 0) { g.fillStyle = hexA(C.y50, 0.18 * f); g.fillRect(0, 0, W, H); }
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 1 — HOW IT WORKS: data → i18n → precheck → ssg → dist → CI → live
 * ════════════════════════════════════════════════════════════════════════ */
const NODE_X = i => 220 + i * 480;
const NODE_W = 390, NODE_TOP = 430, NODE_H = 360, WIRE_Y = 610;
const SEG = [0.36, 0.36, 0.8, 0.36, 0.36, 0.36];
const ARR = SEG.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0.4]);
const GATES = ['i18n', 'i18n-keys', 'trans', 'color', 'aliases', 'licenses', 'json-ld', 'projects-media'];
function packetX(u) {
  const cx = i => NODE_X(i) + NODE_W / 2;
  if (u <= ARR[0]) return lerp(cx(0) - 500, cx(0), E.out3(P(u, 0, ARR[0])));
  for (let i = 0; i < 6; i++) if (u < ARR[i + 1]) return lerp(cx(i), cx(i + 1), E.inOut3(P(u, ARR[i] + 0.06, ARR[i + 1])));
  return cx(6);
}
function sceneFlow(t) {
  const u = t - CUT.flow;
  const X = packetX(u);
  const camX = clamp(X - 760, 0, NODE_X(6) + NODE_W + 220 - W);
  dotGrid(t, camX * 0.5, 0, 1, 56);

  // header (screen space)
  const hp = E.outExpo(P(u, 0.05, 0.5));
  g.save();
  g.beginPath(); g.rect(100, 120, 1200, 130); g.clip();
  txt('01 //', 120, 156, { size: 20, color: C.y, weight: 700, ls: 3, alpha: hp });
  txt('HOW IT WORKS', 120, 230 + (1 - hp) * 90, { font: SANS, size: 72, weight: 700, color: C.white, ls: 4 });
  g.restore();
  txt(scr('EDIT DATA  →  VALIDATE  →  PRE-RENDER PER LOCALE  →  SHIP', P(u, 0.25, 0.8), 1, t), 124, 290, { size: 20, color: C.mute, ls: 3 });

  g.save(); g.translate(-camX, 0);
  // wires
  for (let i = 0; i < 6; i++) {
    const x1 = NODE_X(i) + NODE_W, x2 = NODE_X(i + 1);
    line(x1, WIRE_Y, x2, WIRE_Y, C.line, 2, [6, 8]);
    const lit = clamp((X - x1) / (x2 - x1));
    if (lit > 0) glow(() => line(x1, WIRE_Y, x1 + (x2 - x1) * lit, WIRE_Y, C.y, 3), 10, 0.8);
  }
  for (let i = 0; i < 7; i++) {
    const x = NODE_X(i);
    if (x - camX > W + 50 || x + NODE_W - camX < -50) continue;
    const a = E.outExpo(P(u, ARR[i] - 0.04, ARR[i] + 0.25));
    const enter = E.outBack(P(u, i * 0.07, i * 0.07 + 0.5));
    const pop = Math.sin(Math.PI * P(u, ARR[i] - 0.04, ARR[i] + 0.3)) * 0.05;
    g.save();
    g.translate(x + NODE_W / 2, NODE_TOP + NODE_H / 2);
    g.scale(1 + pop, 1 + pop);
    g.translate(-(x + NODE_W / 2), -(NODE_TOP + NODE_H / 2) + (1 - enter) * 160);
    g.globalAlpha = clamp(enter * 1.4);
    nodeCard(i, x, NODE_TOP, a, u - ARR[i], t);
    g.restore();
  }
  // packet
  glow(() => {
    g.fillStyle = C.white; g.beginPath(); g.arc(X, WIRE_Y, 9, 0, 7); g.fill();
    const tail = g.createLinearGradient(X - 180, 0, X, 0);
    tail.addColorStop(0, hexA(C.y, 0)); tail.addColorStop(1, hexA(C.y, 0.9));
    g.fillStyle = tail; g.fillRect(X - 180, WIRE_Y - 3, 180, 6);
  }, 24, 1.1);
  g.restore();

  // footnote ticker
  txt('npm run build  ⟶  precheck (8 gates)  ⟶  vite-ssg  ⟶  dist/  ⟶  build-main  ⟶  kyonax.com', 124, 900,
    { size: 18, color: C.dim, ls: 2, alpha: P(u, 0.6, 1) });
}
function nodeCard(i, x, y, a, du, t) {
  const w = NODE_W, h = NODE_H;
  rrect(x, y, w, h, 14, C.card, C.line, 1.5);
  if (a > 0) {
    g.save(); g.globalAlpha *= a; rrect(x, y, w, h, 14, null, hexA(C.y, 0.85), 2); g.restore();
    g.fillStyle = C.y; g.fillRect(x + 14, y, (w - 28) * a, 3);
  }
  const labels = ['SOURCE', 'LOCALES', 'VALIDATE', 'PRE-RENDER', 'OUTPUT', 'DEPLOY', 'LIVE'];
  const titles = ['src/data', 'vue-i18n', 'precheck', 'vite-ssg', 'dist/', 'Actions', 'kyonax.com'];
  txt(`${String(i + 1).padStart(2, '0')} · ${labels[i]}`, x + 28, y + 46, { size: 14, color: a > 0.5 ? C.y : C.mute, weight: 700, ls: 3 });
  txt(titles[i], x + 28, y + 100, { font: SANS, size: 40, weight: 700, color: C.white });
  const bx = x + 28, by = y + 150, L = { size: 18, color: C.text };
  const rev = k => clamp(P(du, k * 0.05, k * 0.05 + 0.15));
  switch (i) {
    case 0:
      ['projects.js', 'snippets.js   EN + ES', 'data.js       SKILLS · SEO'].forEach((s, k) =>
        txt((a > 0 ? '▸ ' : '  ') + s, bx, by + k * 40, { ...L, alpha: 0.5 + 0.5 * a }));
      txt('one source of truth', bx, by + 150, { size: 16, color: C.dim, ls: 1 });
      break;
    case 1: {
      const sw = E.inOut3(clamp(((du % 0.6) + 0.6) % 0.6 / 0.3)) * (du > 0 ? 1 : 0);
      chip('EN', bx, by, sw < 0.5 ? C.y : C.mute, { size: 20 });
      txt('⇄', bx + 92, by + 30, { size: 30, color: C.y });
      chip('ES', bx + 140, by, sw >= 0.5 ? C.y : C.mute, { size: 20 });
      txt('key parity', bx, by + 100, L);
      if (du > 0.15) txt('✓ PASS', bx + 210, by + 100, { ...L, color: C.green, weight: 700, alpha: rev(3) });
      txt('t()  ·  <i18n-t>  ·  v-html', bx, by + 150, { size: 16, color: C.dim });
      break;
    }
    case 2: {
      GATES.forEach((gname, k) => {
        const yy = by - 8 + k * 25;
        const ok = du > 0.08 + k * 0.075;
        txt('check:' + gname, bx, yy, { size: 16, color: ok ? C.text : C.dim });
        if (ok) txt('PASS', x + w - 28, yy, { size: 16, color: C.green, weight: 700, align: 'right' });
        else txt(['·  ', ' · ', '  ·'][Math.floor(t * 12 + k) % 3], x + w - 28, yy, { size: 16, color: C.dim, align: 'right' });
      });
      if (du > 0.75) chip('8/8', x + w - 100, y + 26, C.green, { size: 14 });
      break;
    }
    case 3:
      [['/', 'index.html'], ['/es/', 'index.html'], ['/resume', '+ es'], ['/blog', '+ es']].forEach(([r, f], k) => {
        txt(r, bx, by + k * 36, { ...L, color: C.y, alpha: 0.4 + 0.6 * rev(k) });
        txt('→ ' + f, bx + 120, by + k * 36, { ...L, alpha: 0.4 + 0.6 * rev(k) });
      });
      txt('pre-baked HTML · instant paint', bx, by + 165, { size: 16, color: C.dim });
      break;
    case 4:
      ['dist/', '├─ index.html', '├─ es/index.html', '├─ assets/*.avif  *.webp', '└─ sitemap.xml'].forEach((s, k) =>
        txt(s, bx, by + k * 34, { ...L, color: k === 0 ? C.y : C.text, alpha: 0.35 + 0.65 * rev(k) }));
      break;
    case 5: {
      txt('main  ⟶  build-main', bx, by, L);
      txt('develop  ⟶  build-dev', bx, by + 38, { ...L, color: C.dim });
      const bp = E.out3(clamp(du / 0.35));
      rrect(bx, by + 80, w - 56, 10, 5, C.zinc);
      if (bp > 0) rrect(bx, by + 80, (w - 56) * bp, 10, 5, C.y);
      txt(bp >= 1 ? 'deploy ✓' : 'publishing…', bx, by + 130, { ...L, color: bp >= 1 ? C.green : C.mute });
      break;
    }
    case 6: {
      const pulse = du > 0 ? (du * 1.6) % 1 : 0;
      g.save();
      if (du > 0) { g.strokeStyle = hexA(C.green, 1 - pulse); g.lineWidth = 3; g.beginPath(); g.arc(bx + 18, by + 14, 10 + pulse * 40, 0, 7); g.stroke(); }
      g.fillStyle = du > 0 ? C.green : C.zinc; g.beginPath(); g.arc(bx + 18, by + 14, 11, 0, 7); g.fill();
      g.restore();
      txt(du > 0 ? 'LIVE' : 'OFFLINE', bx + 46, by + 24, { size: 28, weight: 700, color: du > 0 ? C.green : C.dim, ls: 4 });
      txt('Hostinger · .htaccess', bx, by + 86, L);
      txt('locale routing · cache headers', bx, by + 120, { size: 16, color: C.dim });
      break;
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 2 — ASSET PIPELINE (ASCII → raster) + LIVE LOCALE SWITCH
 * ════════════════════════════════════════════════════════════════════════ */
function sceneAssets(t) {
  const u = t - CUT.assets;
  dotGrid(t, 0, -t * 30, 1, 56);
  const hp = E.outExpo(P(u, 0.0, 0.45));
  g.save(); g.beginPath(); g.rect(100, 110, 1700, 140); g.clip();
  txt('02 //', 120, 156, { size: 20, color: C.y, weight: 700, ls: 3, alpha: hp });
  txt('ASSETS + I18N', 120, 230 + (1 - hp) * 90, { font: SANS, size: 72, weight: 700, color: C.white, ls: 4 });
  g.restore();

  // left: ascii source → raster
  const px = 120, py = 300, pw = 860, ph = 560;
  const lin = E.outExpo(P(u, 0.05, 0.5));
  g.save(); g.translate(-(1 - lin) * 300, 0); g.globalAlpha = lin;
  rrect(px, py, pw, ph, 14, C.card, C.line);
  rrect(px, py, pw, 46, [14, 14, 0, 0], C.card2);
  txt('src/assets/ascii/reckit.txt', px + 22, py + 30, { size: 16, color: C.mute });
  txt('npm run convert:ascii', px + pw - 22, py + 30, { size: 16, color: C.y, align: 'right', weight: 700 });
  const cells = RECKIT_CELLS || LOGO_CELLS;
  const cols = Math.max(...cells.map(r => r.length)), rows = cells.length;
  const cw = 13, chh = 26, ax = px + (pw - cols * cw) / 2, ay = py + 74;
  const scan = ax + E.inOut3(P(u, 0.35, 1.25)) * (cols * cw + 20);
  // raw text (left of scan: rendered blocks, right: raw glyphs)
  g.save(); g.beginPath(); g.rect(scan, ay - 10, pw, rows * chh + 20); g.clip();
  g.font = `400 20px "DejaVu Sans Mono", monospace`; g.fillStyle = C.dim; g.textBaseline = 'top'; g.letterSpacing = '0px';
  cells.forEach((row, r) => row.forEach((k, c) => { if (k !== ' ') g.fillText(k, ax + c * cw, ay + r * chh + 2); }));
  g.restore();
  g.save(); g.beginPath(); g.rect(ax - 10, ay - 10, scan - ax + 10, rows * chh + 20); g.clip();
  glow(() => drawAscii(cells, ax, ay, cw, chh, { mode: 'none', color: (k, r) => (r < 5 ? C.y50 : shadeColor(k)) }), 16, 0.45);
  g.restore();
  if (u > 0.3 && u < 1.35) glow(() => { g.fillStyle = C.white; g.fillRect(scan - 1.5, ay - 20, 3, rows * chh + 40); }, 24, 1);
  // output formats
  const fmts = [['JPG', C.text], ['WEBP · q90', C.y], ['AVIF · q75', C.y]];
  let fx = px + 22;
  fmts.forEach(([s, col], k) => {
    const p = E.outBack(P(u, 1.15 + k * 0.1, 1.45 + k * 0.1));
    if (p <= 0) return;
    g.save(); g.translate(0, (1 - p) * 40); g.globalAlpha *= clamp(p);
    fx += chip(s, fx, py + ph - 70, col, { size: 16 }) + 14;
    g.restore();
  });
  txt('sharp ^0.34', px + pw - 22, py + ph - 42, { size: 16, color: C.dim, align: 'right', alpha: P(u, 1.3, 1.6) });
  g.restore();

  // right: locale toggle on live hero copy
  const rx = 1040, ry = 300, rw = 760, rh = 560;
  const rin = E.outExpo(P(u, 0.12, 0.6));
  g.save(); g.translate((1 - rin) * 300, 0); g.globalAlpha = rin;
  rrect(rx, ry, rw, rh, 14, C.card, C.line);
  rrect(rx, ry, rw, 46, [14, 14, 0, 0], C.card2);
  const sw = E.inOut3(P(u, 0.95, 1.2));
  txt(sw < 0.5 ? 'kyonax.com/' : 'kyonax.com/es/', rx + 22, ry + 30, { size: 16, color: C.mute });
  // toggle
  const tx = rx + rw - 150, ty = ry + 9;
  rrect(tx, ty, 128, 28, 14, C.bg, C.line);
  rrect(tx + 2 + sw * 62, ty + 2, 62, 24, 12, C.y);
  txt('EN', tx + 33, ty + 15, { size: 13, weight: 700, color: sw < 0.5 ? C.bg : C.mute, align: 'center', base: 'middle' });
  txt('ES', tx + 95, ty + 15, { size: 13, weight: 700, color: sw >= 0.5 ? C.bg : C.mute, align: 'center', base: 'middle' });
  const mp = P(u, 1.0, 1.55);
  const M = (a, b, s) => morph(a, b, mp, s, t);
  const bx = rx + 40;
  chip(M('AVAILABLE FOR HIRE', 'ABIERTO A CONTRATOS', 1), bx, ry + 84, C.green, { dot: true, size: 15 });
  txt(M('ROLE', 'ROL', 2), bx, ry + 180, { size: 15, color: C.mute, ls: 3 });
  txt(M('SENIOR SOFTWARE ENGINEER', 'INGENIERO DE SOFTWARE SENIOR', 3), bx, ry + 224, { font: SANS, size: 36, weight: 700, color: C.white });
  txt('(FULL-STACK)', bx, ry + 266, { font: SANS, size: 36, weight: 700, color: C.y });
  txt(M('LOCATION', 'UBICACION', 4), bx, ry + 322, { size: 15, color: C.mute, ls: 3 });
  txt('VILLAVICENCIO / COLOMBIA', bx, ry + 352, { size: 20, color: C.text });
  rrect(bx, ry + 392, 300, 58, 6, C.y);
  txt(M('VIEW EXPERIENCE', 'VER EXPERIENCIA', 5), bx + 150, ry + 422, { size: 18, weight: 700, color: C.bg, align: 'center', base: 'middle', ls: 1 });
  rrect(bx + 320, ry + 392, 240, 58, 6, null, C.y, 2);
  txt(M('CONTACT ME', 'CONTÁCTAME', 6), bx + 440, ry + 422, { size: 18, weight: 700, color: C.y, align: 'center', base: 'middle', ls: 1 });
  txt(M('SCROLL // EXPLORE', 'SCROLL // EXPLORA', 7), bx, ry + 510, { size: 15, color: C.dim, ls: 3 });
  // parity stamp
  const sp = E.outBack(P(u, 1.6, 1.9));
  if (sp > 0) {
    g.save(); g.translate(rx + rw - 60, ry + rh - 60); g.rotate(-0.12); g.scale(sp, sp);
    const w = measure('✓ check:i18n  PARITY', 18, MONO, 700, 2) + 40;
    rrect(-w, -46, w, 50, 8, hexA(C.green, 0.15), C.green, 2.5);
    txt('✓ check:i18n  PARITY', -w / 2, -21, { size: 18, weight: 700, color: C.green, align: 'center', base: 'middle', ls: 2 });
    g.restore();
  }
  g.restore();
  txt('EN + ES  ·  same keys  ·  pre-rendered per locale  ·  hreflang', 124, 930, { size: 18, color: C.dim, ls: 2, alpha: P(u, 0.8, 1.2) });
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 3 — USE CASES: the live site, guided tour
 * ════════════════════════════════════════════════════════════════════════ */
const SITE_H = 736;
function sceneSite(t) {
  const u = t - CUT.site;
  dotGrid(t, t * 25, 0, 1, 56);
  const s1 = E.inOutExpo(P(u, 0.8, 1.2)), s2 = E.inOutExpo(P(u, 2.05, 2.42));
  const scrollY = (s1 + s2) * SITE_H;
  const stage = u < 1.0 ? 0 : u < 2.2 ? 1 : u < 2.65 ? 2 : 3;

  // header + callouts
  const hp = E.outExpo(P(u, 0.0, 0.45));
  g.save(); g.beginPath(); g.rect(100, 110, 520, 160); g.clip();
  txt('03 //', 120, 156, { size: 20, color: C.y, weight: 700, ls: 3, alpha: hp });
  txt('USE CASES', 120, 230 + (1 - hp) * 90, { font: SANS, size: 64, weight: 700, color: C.white, ls: 3 });
  g.restore();
  const items = [
    ['HIRE-READY HERO', 'CV download · CTAs · live feed'],
    ['LIVE PROJECT STATES', 'status model · countdown worker'],
    ['EXPERIENCE TIMELINE', 'HUD timeline · skills grid'],
    ['SEO + AEO BUILT IN', 'JSON-LD · hreflang · sitemap'],
  ];
  items.forEach(([a, b], k) => {
    const p = E.outExpo(P(u, 0.15 + k * 0.08, 0.6 + k * 0.08));
    const on = k === stage, y = 340 + k * 130;
    g.save(); g.globalAlpha = p * (on ? 1 : 0.45); g.translate(-(1 - p) * 80, 0);
    if (on) { g.fillStyle = C.y; g.fillRect(112, y - 30, 4, 80); }
    txt(String(k + 1).padStart(2, '0'), 132, y, { size: 16, weight: 700, color: on ? C.y : C.mute });
    txt(a, 176, y, { font: SANS, size: 28, weight: 700, color: on ? C.white : C.text });
    txt(b, 176, y + 34, { size: 15, color: C.mute });
    g.restore();
  });

  // browser
  const bx = 640, by = 150, bw = 1180, bh = 790;
  const ein = E.outExpo(P(u, 0.0, 0.7));
  g.save();
  g.translate(bx + bw / 2, by + bh / 2);
  g.rotate((1 - ein) * 0.12);
  g.scale(lerp(0.82, 1, ein), lerp(0.82, 1, ein));
  g.translate(-(bx + bw / 2), -(by + bh / 2) + (1 - ein) * 500);
  // shadow + frame
  g.save(); g.shadowColor = hexA(C.y, 0.18); g.shadowBlur = 80; rrect(bx, by, bw, bh, 16, '#0d0d0f'); g.restore();
  rrect(bx, by, bw, bh, 16, null, C.line, 1.5);
  rrect(bx, by, bw, 50, [16, 16, 0, 0], C.card2);
  [C.red, C.orange, C.green].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(bx + 26 + k * 22, by + 25, 6.5, 0, 7); g.fill(); });
  rrect(bx + 120, by + 11, 520, 28, 14, C.bg);
  txt('🔒 https://kyonax.com' + (stage === 3 ? '/#faq' : ''), bx + 140, by + 30, { size: 14, color: C.mute });
  // viewport
  const vx = bx, vy = by + 50, vw = bw, vh = bh - 50;
  g.save(); g.beginPath(); g.rect(vx, vy, vw, vh); g.clip();
  g.fillStyle = C.bg; g.fillRect(vx, vy, vw, vh);
  g.translate(vx, vy - scrollY);
  siteHero(u, t);
  siteProjects(u - 1.05, t);
  siteExperience(u - 2.25, t);
  g.restore();
  siteNav(vx, vy, vw, stage, t);
  g.restore();

  // JSON-LD card
  const jp = E.outBack(P(u, 2.62, 2.95));
  if (jp > 0) {
    g.save(); g.translate(1340, 610); g.rotate(-0.04); g.scale(jp, jp); g.globalAlpha = clamp(jp);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 50; rrect(0, 0, 500, 300, 12, '#101012', hexA(C.y, 0.8), 2); g.restore();
    const code = [
      ['<script type="application/ld+json">', C.dim],
      ['{ "@type": "Person",', C.y50],
      ['  "name": "Cristian D. Moreno",', C.text],
      ['  "jobTitle": "Senior Software Engineer",', C.text],
      ['  "knowsAbout": ["Vue.js","TypeScript"…] }', C.text],
      ['+ WebSite · FAQPage · hreflang', C.y],
    ];
    const cp = P(u, 2.7, 3.15);
    code.forEach(([s, col], k) => txt(scr(s, clamp(cp * 6 - k), k * 9, t), 24, 48 + k * 42, { size: 15, color: col }));
    g.restore();
  }
}
function siteNav(x, y, w, stage, t) {
  g.save();
  g.fillStyle = 'rgba(10,10,10,0.92)'; g.fillRect(x, y, w, 64);
  line(x, y + 64, x + w, y + 64, C.line2, 1);
  drawAscii(LOGO_CELLS, x + 26, y + 14, 1.5, 2.6, { mode: 'none' });
  const nav = ['HOME', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'FAQ', 'CONTACT'];
  const act = [0, 3, 2, 4][stage];
  let nx = x + 190;
  nav.forEach((s, k) => {
    const on = k === act;
    const ww = txt(s, nx, y + 38, { size: 14, weight: 700, color: on ? C.y : C.mute, ls: 2 });
    if (on) { g.fillStyle = C.y; g.fillRect(nx, y + 50, ww, 2); }
    nx += ww + 34;
  });
  chip('EN | ES', x + w - 120, y + 18, C.y, { size: 12 });
  g.restore();
}
function siteHero(u, t) {
  const L = 60, rv = k => E.outExpo(P(u, 0.25 + k * 0.06, 0.7 + k * 0.06));
  const sl = (k, fn) => { const p = rv(k); g.save(); g.globalAlpha = p; g.translate(0, (1 - p) * 30); fn(); g.restore(); };
  sl(0, () => chip('AVAILABLE FOR HIRE', L, 120, C.green, { dot: true, size: 14 }));
  sl(1, () => txt('CRISTIAN D.', L, 260, { font: SANS, size: 92, weight: 700, color: C.white }));
  sl(2, () => txt('MORENO', L, 352, { font: SANS, size: 92, weight: 700, color: C.white }));
  sl(3, () => txt('@KYONAX_ON_TECH  ·  CCS :: 001', L, 400, { size: 18, weight: 700, color: C.y, ls: 3 }));
  sl(4, () => {
    txt('ROLE', L, 460, { size: 13, color: C.mute, ls: 3 }); txt('SENIOR SOFTWARE ENGINEER (FULL-STACK)', L, 488, { size: 18, color: C.white });
    txt('LOCATION', L, 530, { size: 13, color: C.mute, ls: 3 }); txt('VILLAVICENCIO / COLOMBIA', L, 558, { size: 18, color: C.white });
  });
  sl(5, () => {
    rrect(L, 600, 250, 54, 6, C.y); txt('VIEW EXPERIENCE', L + 125, 628, { size: 16, weight: 700, color: C.bg, align: 'center', base: 'middle', ls: 1 });
    rrect(L + 270, 600, 200, 54, 6, null, C.y, 2); txt('CONTACT ME', L + 370, 628, { size: 16, weight: 700, color: C.y, align: 'center', base: 'middle', ls: 1 });
    txt('↓ CV  PDF  EN · ES', L + 500, 634, { size: 15, color: C.mute, ls: 1 });
  });
  // portrait: ASCII → photo
  const fx = 720, fy = 100, fs = 400;
  const ap = P(u, 0.3, 0.9), ph = E.inOut3(P(u, 0.85, 1.2));
  rrect(fx, fy, fs, fs, 8, '#0f0f10');
  if (IMG.portrait && ph > 0) { g.save(); g.globalAlpha = ph; g.beginPath(); g.roundRect(fx, fy, fs, fs, 8); g.clip(); g.drawImage(IMG.portrait, fx, fy, fs, fs); g.restore(); }
  if (PORTRAIT_CELLS) drawAscii(PORTRAIT_CELLS, fx, fy, 8, 16, { prog: ap, t, mode: 'rows', alpha: 1 - ph * 0.82, seed: 77 });
  brackets(fx - 14, fy - 14, fs + 28, fs + 28, 26, C.y, 2.5);
  chip('CCS :: 001', fx, fy + fs + 30, C.y, { size: 13, alpha: rv(4) });
  chip('ORCID', fx + 150, fy + fs + 30, C.green, { size: 13, alpha: rv(5) });
  // live feed
  const fp = P(u, 0.5, 1.1);
  const states = ['fetching', 'decrypting', 'loaded', 'synced'];
  txt(`Progress ▸ Mapping Memory  ${'█'.repeat(Math.floor(fp * 14))}${'░'.repeat(14 - Math.floor(fp * 14))}  ${Math.floor(fp * 100)}%  ·  ${states[Math.min(3, Math.floor(fp * 4))]}`,
    L, 700, { size: 14, color: fp >= 1 ? C.green : C.mute });
}
function siteProjects(v, t) {
  const top = SITE_H, L = 60;
  txt('// NOW SHIPPING', L, top + 80, { size: 15, weight: 700, color: C.y, ls: 3 });
  txt('PROJECTS', L, top + 140, { font: SANS, size: 54, weight: 700, color: C.white });
  const P3 = [
    ['org2html', 'ORG 2 HTML', 'Org files → HTML + Vue hydration', ['vue', 'vite', 'ts'], 'Jan 06 21:00:00'],
    ['kyo-blog', 'KYO BLOG', 'Build in public · AI, Linux, code', ['vue', 'node', 'bash'], 'Dec 01 18:00:00'],
    ['reckit', 'RECKIT', 'Capture-time OBS automation', ['bash', 'node', 'docker'], 'Dec 19 20:00:00'],
  ];
  P3.forEach(([img, name, desc, stack, _d], k) => {
    const x = L + k * 370, y = top + 180, w = 345, h = 470;
    const p = E.outBack(P(v, -0.15 + k * 0.08, 0.3 + k * 0.08));
    g.save(); g.translate(x + w / 2, y + h); g.scale(1, clamp(p, 0, 1.2)); g.translate(-(x + w / 2), -(y + h)); g.globalAlpha = clamp(p);
    rrect(x, y, w, h, 12, C.card, C.line);
    if (IMG[img]) { g.save(); g.beginPath(); g.roundRect(x, y, w, 190, [12, 12, 0, 0]); g.clip(); const im = IMG[img], s = Math.max(w / im.width, 190 / im.height); g.drawImage(im, x + (w - im.width * s) / 2, y + (190 - im.height * s) / 2, im.width * s, im.height * s); g.restore(); }
    txt(name, x + 22, y + 240, { font: SANS, size: 30, weight: 700, color: C.white });
    txt(desc, x + 22, y + 272, { size: 13, color: C.mute });
    chip('IN_PROGRESS', x + 22, y + 296, C.y, { size: 12, dot: true });
    // live countdown (worker-driven on the site), ms ticking
    const base = [27 * 86400 + 11 * 3600 + 42 * 60 + 17, 14 * 86400 + 6 * 3600 + 9 * 60 + 51, 32 * 86400 + 3 * 3600 + 30 * 60 + 5][k];
    const rem = base - t;
    const dd = Math.floor(rem / 86400), hh = Math.floor(rem / 3600) % 24, mm = Math.floor(rem / 60) % 60, ss = Math.floor(rem) % 60, ms = Math.floor((rem % 1) * 1000);
    txt('DEV RELEASE IN', x + 22, y + 368, { size: 12, color: C.mute, ls: 2 });
    txt(`${String(dd).padStart(2, '0')}D ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`, x + 22, y + 400, { size: 22, weight: 700, color: C.y });
    stack.forEach((b, q) => { if (ICON[b]) g.drawImage(ICON[b].w, x + 22 + q * 36, y + 424, 24, 24); });
    g.restore();
  });
  // state model legend
  const states = [['WORKING_ON', C.mag], ['IN_PROGRESS', C.y], ['ON_HOLD', C.orange], ['ON_TODO', C.blue], ['DONE', C.green], ['LIVE', C.green], ['DEPRECATED', C.red]];
  let lx = L;
  states.forEach(([s, c], k) => { const p = P(v, 0.2 + k * 0.04, 0.35 + k * 0.04); lx += chip(s, lx, top + 680, c, { size: 11, alpha: p }) + 8; });
}
function siteExperience(v, t) {
  const top = SITE_H * 2, L = 60;
  txt('// TIMELINE', L, top + 80, { size: 15, weight: 700, color: C.y, ls: 3 });
  txt('EXPERIENCE', L, top + 140, { font: SANS, size: 54, weight: 700, color: C.white });
  const lp = E.out3(P(v, -0.1, 0.5));
  line(L + 10, top + 190, L + 10, top + 190 + 500 * lp, C.line, 2);
  glow(() => line(L + 10, top + 190, L + 10, top + 190 + 500 * lp, C.y, 2), 8, 0.6);
  const XP = [
    ['10/2025 — 05/2026', 'AGILE-ENGINE // MADISON-REED', 'SENIOR SOFTWARE ENGINEER (FRONTEND)', '~500k monthly visits · 18–25 CMS templates'],
    ['11/2023 — 07/2025', 'SOFTTEK // MARITZ', 'SENIOR FULL-STACK ENGINEER', '$1.2B incentives provider · initial engineer'],
    ['01/2018 — PRESENT', 'ZERØNET-LABS', 'INDEPENDENT FULL-STACK ENGINEER', '20+ websites · solo end to end'],
  ];
  XP.forEach(([d, co, role, note], k) => {
    const y = top + 220 + k * 160, p = E.outExpo(P(v, k * 0.1, 0.35 + k * 0.1));
    g.save(); g.globalAlpha = p; g.translate((1 - p) * 60, 0);
    g.fillStyle = C.bg; g.strokeStyle = C.y; g.lineWidth = 3; g.beginPath(); g.arc(L + 10, y + 4, 9, 0, 7); g.fill(); g.stroke();
    txt(d + '  ·  ' + co, L + 44, y + 10, { size: 14, weight: 700, color: C.y, ls: 1 });
    txt(role, L + 44, y + 52, { font: SANS, size: 28, weight: 700, color: C.white });
    txt(note, L + 44, y + 84, { size: 14, color: C.mute });
    g.restore();
  });
  // skills grid
  const gx = 740, gy = top + 200, sk = ['vue', 'react', 'ts', 'node', 'nest', 'vite', 'scss', 'postgresql', 'mongodb', 'docker', 'playwright', 'githubactions'];
  txt('SKILLS', gx, gy - 20, { size: 13, weight: 700, color: C.mute, ls: 3, alpha: P(v, 0, 0.3) });
  sk.forEach((b, k) => {
    const c = k % 4, r = Math.floor(k / 4), x = gx + c * 100, y = gy + r * 100;
    const p = E.outBack(P(v, 0.05 + k * 0.03, 0.3 + k * 0.03));
    if (p <= 0) return;
    g.save(); g.translate(x + 42, y + 42); g.scale(p, p); g.translate(-(x + 42), -(y + 42));
    rrect(x, y, 84, 84, 10, C.card, C.line);
    const hot = Math.floor(t * 6) % 12 === k;
    if (ICON[b]) g.drawImage(hot ? ICON[b].y : ICON[b].w, x + 22, y + 22, 40, 40);
    if (hot) rrect(x, y, 84, 84, 10, null, C.y, 2);
    g.restore();
  });
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 4 — KINETIC SLAM
 * ════════════════════════════════════════════════════════════════════════ */
const BEATS = [
  { bg: C.y, fg: C.bg, big: '8 GATES', small: 'PRECHECK  ·  EVERY BUILD  ·  CI', acc: C.bg },
  { bg: C.bg, fg: C.y, big: 'EN / ES', small: '2 LOCALES  ·  1 SOURCE OF TRUTH', acc: C.y },
  { bg: C.mag, fg: C.bg, big: '0 HEX', small: 'HARDCODED COLORS  ·  60/30/10 AUDIT', acc: C.bg },
  { bg: C.blue, fg: C.white, big: 'SSG', small: 'PRE-BAKED HTML  ·  INSTANT FIRST PAINT', acc: C.y },
];
function sceneSlam(t) {
  const u = t - CUT.slam, bl = (CUT.outro - CUT.slam) / BEATS.length;
  const k = Math.min(BEATS.length - 1, Math.floor(u / bl)), v = u - k * bl, B = BEATS[k];
  g.fillStyle = B.bg; g.fillRect(0, 0, W, H);
  // previous beat color wipes off
  if (k > 0) {
    const wp = E.inOutExpo(clamp(v / 0.16));
    g.fillStyle = BEATS[k - 1].bg;
    const dir = k % 2 ? 1 : -1;
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.25 * dir); g.fillRect(-W * 1.5, -H * 1.5 + dir * wp * H * 3, W * 3, H * 3); g.restore();
  }
  // stripes
  g.save(); g.globalAlpha = 0.08; g.fillStyle = B.fg;
  for (let i = -6; i < 20; i++) { const x = i * 140 + ((u * 600) % 140); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x - 240, H); g.lineTo(x - 300, H); g.fill(); }
  g.restore();
  // giant outline index
  g.save(); g.font = `700 620px ${SANS}`; g.lineWidth = 3; g.strokeStyle = hexA(B.fg === C.white ? '#ffffff' : B.fg, 0.14); g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.strokeText(String(k + 1).padStart(2, '0'), W + 40 - v * 200, H + 60); g.restore();
  // big type punch
  const pin = E.outExpo(clamp(v / 0.18));
  const dir = k % 2 ? -1 : 1;
  g.save();
  g.translate(W / 2 + dir * (1 - pin) * 500, 560);
  const sc = lerp(1.35, 1, pin) + v * 0.08;
  g.scale(sc, sc);
  for (let s = 3; s >= 0; s--) { // motion smear
    const off = s * dir * (1 - pin) * -60;
    txt(B.big, off, 0, { font: SANS, size: 270, weight: 700, color: B.fg, align: 'center', base: 'middle', alpha: s ? 0.18 : 1, ls: 6 });
  }
  g.restore();
  const sp = E.outExpo(P(v, 0.06, 0.22));
  g.fillStyle = B.acc; g.fillRect(W / 2 - 300 * sp, 730, 600 * sp, 6);
  txt(scr(B.small, sp, k * 13, t), W / 2, 790, { size: 26, weight: 700, color: B.fg, align: 'center', ls: 6 });
}

/* ════════════════════════════════════════════════════════════════════════
 * SCENE 5 — OUTRO: mark drops in, URL, credits, CRT off
 * ════════════════════════════════════════════════════════════════════════ */
function sceneOutro(t) {
  const u = t - CUT.outro;
  floorGrid(t, C.y, 0.28, 0.8);
  const CW = 16, CH = 32, lw = LC * CW, lh = LR * CH, lx = (W - lw) / 2, ly = 380 - lh / 2;
  glow(() => drawAscii(LOGO_CELLS, lx, ly, CW, CH, { prog: P(u, 0, 0.6), t, mode: 'drop' }), 30, 0.45);
  const up = P(u, 0.33, 0.66);
  txt(scr('KYONAX.COM', up, 21, t), W / 2, 730, { font: SANS, size: 92, weight: 700, color: C.white, align: 'center', ls: 26 });
  const lp = E.outExpo(P(u, 0.42, 0.8));
  line(W / 2 - 360 * lp, 768, W / 2 + 360 * lp, 768, C.y, 2);
  txt(scr('CRISTIAN D. MORENO  ·  SENIOR SOFTWARE ENGINEER (FULL-STACK)', P(u, 0.48, 0.82), 4, t), W / 2, 818, { size: 22, color: C.text, align: 'center', ls: 3 });
  txt('KYO-WEB-ONLINE v2.0  ·  VUE 3  ·  VITE  ·  VITE-SSG  ·  GPL-2.0', W / 2, 862, { size: 16, color: C.y300, align: 'center', ls: 4, alpha: P(u, 0.65, 0.9) });
}

/* ── transitions & post ──────────────────────────────────────────────────── */
function wipe(t, T) {
  const q = P(t, T - 0.24, T + 0.24);
  if (q <= 0 || q >= 1) return;
  const e = E.inOut3(q), sk = 320;
  const lead = -sk + e * (2 * W + 1600);
  const band = (off, wd, col) => {
    const a = lead - off, b = a - wd;
    g.fillStyle = col; g.beginPath();
    g.moveTo(b, H); g.lineTo(a, H); g.lineTo(a + sk, 0); g.lineTo(b + sk, 0); g.closePath(); g.fill();
  };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  band(-70, 22, C.mag);
  band(-30, 14, C.blue);
  band(0, W + 950, C.y);
  band(W + 950, 280, C.bg);
  // label riding the band
  const lx = lead - (W + 950) / 2;
  const s = SCENES.find(sc => sc.a === T);
  if (s) txt(s.id, lx + sk / 2, H / 2 + 30, { font: SANS, size: 96, weight: 700, color: C.bg, align: 'center', ls: 8 });
  g.restore();
}
function glitch(t, amt, seed) {
  if (amt <= 0) return;
  TMPc.setTransform(1, 0, 0, 1, 0, 0); TMPc.clearRect(0, 0, W, H); TMPc.drawImage(cv, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.floor(6 + amt * 14), fr = Math.floor(t * FPS);
  for (let i = 0; i < n; i++) {
    const r1 = hash(seed + i * 3.1 + fr), r2 = hash(seed + i * 7.7 + fr * 1.3), r3 = hash(seed + i * 1.9 + fr * 0.7);
    const y = r1 * H, h = 4 + r2 * 70 * amt, dx = (r3 - 0.5) * 220 * amt;
    g.drawImage(TMP, 0, y, W, h, dx, y, W, h);
    if (r2 > 0.75) { g.fillStyle = hexA([C.mag, C.blue, C.y][i % 3], 0.35 * amt); g.fillRect(0, y, W, h * 0.3); }
  }
  // chroma split
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * amt;
  g.drawImage(TMP, 10 * amt, 0); g.drawImage(TMP, -10 * amt, 0);
  g.restore();
}
function hud(t, scene) {
  if (t < 0.12 || t > CUT.outro + 1.2) return;
  const a = P(t, 0.12, 0.4) * (1 - P(t, CUT.outro + 0.9, CUT.outro + 1.2));
  const onSlam = t >= CUT.slam && t < CUT.outro;
  const fg = onSlam ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)';
  const acc = onSlam ? C.bg : C.y;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a;
  brackets(36, 36, W - 72, H - 72, 30, fg, 2);
  const w1 = txt('KYO-WEB-ONLINE', 70, 76, { size: 14, weight: 700, color: acc, ls: 3 });
  txt('  //  PRODUCT REEL  ·  2026', 70 + w1, 76, { size: 14, color: fg, ls: 3 });
  const fr = Math.floor(t * FPS), ss = Math.floor(t), ff = fr % FPS;
  txt(`00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, W - 70, 76, { size: 14, weight: 700, color: fg, align: 'right', ls: 2 });
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = C.red; g.beginPath(); g.arc(W - 262, 71, 6, 0, 7); g.fill(); }
  txt('REC', W - 248, 76, { size: 14, weight: 700, color: C.red, ls: 2 });
  txt(scene.id, 70, H - 62, { size: 14, weight: 700, color: fg, ls: 3 });
  txt('1920×1080 · 60FPS', W - 70, H - 62, { size: 14, color: fg, align: 'right', ls: 2 });
  // progress
  const px = 400, pw = W - 800;
  g.fillStyle = onSlam ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)'; g.fillRect(px, H - 68, pw, 2);
  g.fillStyle = acc; g.fillRect(px, H - 68, pw * (t / DUR), 2);
  Object.values(CUT).forEach(c => { g.fillRect(px + pw * (c / DUR) - 1, H - 74, 2, 14); });
  g.restore();
}

/* ── frame ───────────────────────────────────────────────────────────────── */
function render(t) {
  g = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const scene = SCENES.find(s => t >= s.a && t < s.b) || SCENES[SCENES.length - 1];
  ctx.save(); scene.fn(t); ctx.restore();

  [CUT.flow, CUT.assets, CUT.site].forEach(T => wipe(t, T));
  // glitch hits
  const hits = [[2.0, 0.12, 0.7], [CUT.slam, 0.1, 1], [CUT.slam + 0.4, 0.05, 0.5], [CUT.slam + 0.8, 0.05, 0.5], [CUT.slam + 1.2, 0.05, 0.5], [CUT.outro, 0.14, 1], [CUT.outro + 0.5, 0.06, 0.4], [4.95, 0.04, 0.35], [10.1, 0.04, 0.35]];
  hits.forEach(([at, d, amp], i) => { const q = 1 - Math.abs(t - at) / d; if (q > 0) glitch(t, q * amp, i * 100); });
  if (Math.abs(t - CUT.outro) < 0.06) { ctx.fillStyle = hexA(C.white, 0.5 * (1 - Math.abs(t - CUT.outro) / 0.06)); ctx.fillRect(0, 0, W, H); }

  // film finish
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  ctx.drawImage(GRAIN[Math.floor(t * FPS) % 4], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.22; ctx.fillStyle = SCAN; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.drawImage(VIG, 0, 0);
  ctx.restore();
  hud(t, scene);

  // CRT power-off
  const off = P(t, DUR - 0.32, DUR - 0.02);
  const fadeIn = 1 - P(t, 0, 0.12);
  if (off > 0) {
    TMPc.setTransform(1, 0, 0, 1, 0, 0); TMPc.clearRect(0, 0, W, H); TMPc.drawImage(cv, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const sy = Math.max(0.004, 1 - E.inExpo(clamp(off / 0.55))), sx = off < 0.55 ? 1 : Math.max(0.002, 1 - E.inExpo(clamp((off - 0.55) / 0.45)));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sx, sy);
    ctx.filter = `brightness(${1 + off * 3})`;
    ctx.drawImage(TMP, -W / 2, -H / 2); ctx.restore();
    if (off > 0.5) { ctx.fillStyle = hexA(C.white, 1 - off); ctx.fillRect(W / 2 - W * sx / 2, H / 2 - 2, W * sx, 4); }
  }
  if (fadeIn > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeIn})`; ctx.fillRect(0, 0, W, H); }
}

/* ── boot ────────────────────────────────────────────────────────────────── */
const params = new URLSearchParams(location.search);
window.DUR = DUR; window.FPS = FPS;
window.renderFrame = t => { render(t); return true; };
window.READY = loadAssets().then(() => { render(0); return true; });
if (params.has('render')) document.body.classList.add('render');
else window.READY.then(() => {
  let playing = true, t0 = performance.now(), tt = params.has('t') ? +params.get('t') : 0;
  t0 -= tt * 1000;
  const loop = now => {
    if (playing) tt = ((now - t0) / 1000) % DUR;
    render(tt); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  addEventListener('keydown', e => { if (e.code === 'Space') { playing = !playing; t0 = performance.now() - tt * 1000; e.preventDefault(); } });
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); tt = ((e.clientX - r.left) / r.width) * DUR; t0 = performance.now() - tt * 1000; });
});
