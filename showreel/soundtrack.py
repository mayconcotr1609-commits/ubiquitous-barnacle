"""Procedural 15s score for the KYO-WEB-ONLINE reel, synced to reel.js cut points.

150 BPM (beat = 0.4s): cuts at 2.8 / 6.4 / 8.8 / 12.0 / 13.6 all sit on the grid.
Writes soundtrack.wav (48 kHz stereo, 16-bit).
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, os

SR, DUR = 48000, 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
BEAT = 0.4
CUTS = dict(flow=2.8, assets=6.4, site=8.8, slam=12.0, outro=13.6)

def t_(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def put(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan)) * 1.414
def saw(f, t): return 2 * ((t * f) % 1) - 1
def env(t, a, d): return np.minimum(t / max(a, 1e-4), 1) * np.exp(-np.maximum(t - a, 0) / d)

# ── instruments ────────────────────────────────────────────────────────────
def kick(big=False):
    t = t_(0.5 if big else 0.32)
    f = 45 + (150 if big else 110) * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    k = np.sin(ph) * np.exp(-t * (5 if big else 9))
    k += 0.25 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)
    return np.tanh(k * 1.6)
def hat(open_=False):
    t = t_(0.18 if open_ else 0.05)
    return hp(rng.standard_normal(len(t)), 7000, 4) * np.exp(-t * (18 if open_ else 90)) * 0.35
def clap():
    t = t_(0.25); n = bp(rng.standard_normal(len(t)), 900, 3500)
    e = sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0, 0.012, 0.024)) + np.exp(-t * 14) * 0.6
    return n * e * 0.5
def blip(f, d=0.09, g=0.3):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sign(np.sin(2 * np.pi * f * 2 * t))) * env(t, 0.002, d / 4) * g
def click():
    t = t_(0.02); return hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 400) * 0.8
def whoosh(d, up=True):
    t = t_(d); n = rng.standard_normal(len(t))
    out = np.zeros_like(n); seg = 512
    for i in range(0, len(n), seg):
        p = i / len(n); p = p if up else 1 - p
        lo = 200 + 5000 * p ** 2
        out[i:i + seg] = bp(n[max(0, i - 2048):i + seg], lo, min(lo * 2.5, 20000))[-len(n[i:i + seg]):]
    sh = (t / d) ** 2 if up else (1 - t / d) ** 1.5
    return out * sh * 0.6
def impact():
    t = t_(1.4)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.4)
    crack = lp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 12) * 0.5
    return np.tanh((boom + crack) * 1.4)
def glitch(d=0.12):
    t = t_(d); x = np.sign(np.sin(2 * np.pi * (300 + 2400 * rng.random()) * t)) * rng.random()
    x = np.repeat(x[::40], 40)[: len(t)]
    return x * 0.18 * (rng.random(len(t)) > 0.3)
def riser(d):
    t = t_(d); f = 220 * 2 ** (t / d * 2)
    s = saw(1, np.cumsum(f) / SR) + saw(1, np.cumsum(f * 1.01) / SR)
    return lp(s, 6000) * (t / d) ** 2.5 * 0.18

# ── harmony: Am – F – C – G, one chord per bar (1.6s) ─────────────────────
CH = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
BASS = [45, 41, 48, 43]
m2f = lambda m: 440 * 2 ** ((m - 69) / 12)
def pad_note(f, d):
    t = t_(d)
    s = sum(saw(f * dt, t + ph) for dt, ph in ((1, 0), (1.006, 0.3), (0.994, 0.6)))
    return lp(s, 1400) * env(t, 0.25, d * 3) * np.minimum(1, (d - t) / 0.2) * 0.05

# drone (whole piece, swells)
td = t_(DUR)
drone = lp(saw(55, td) + saw(55.2, td) + 0.5 * saw(82.4, td), 300) * 0.07
drone *= np.clip(td / 0.8, 0, 1) * np.clip((DUR - td) / 0.6, 0, 1)
put(drone, 0)

# boot: typing clicks, log blips, riser into the logo, impact at 2.0
for i in range(11): put(click(), 0.12 + i * 0.03, 0.9, rng.uniform(-0.3, 0.3))
for i, at in enumerate((0.5, 0.58, 0.66, 0.76)): put(blip(880 * (1 + i * 0.25)), at, 0.5, 0.2)
put(riser(1.1), 0.9, 1.0)
put(impact(), 2.0, 0.9)
put(glitch(0.14), 2.0, 1.0, -0.3)
put(whoosh(0.5), 2.3, 0.9)

# groove: from the first cut until the slam
bar0 = CUTS['flow']
for b in range(int((CUTS['slam'] - bar0) / BEAT)):
    at = bar0 + b * BEAT
    put(kick(), at, 0.95)
    put(hat(), at + BEAT / 2, 0.8, 0.35)
    if b % 4 == 3: put(hat(True), at + BEAT * 0.75, 0.5, -0.35)
    if b % 2 == 1: put(clap(), at, 0.7, 0.05)
# sidechain-pumped bass + pads per bar
for bar in range(int((CUTS['slam'] - bar0) / (4 * BEAT)) + 1):
    at = bar0 + bar * 4 * BEAT
    ci = bar % 4
    for n in CH[ci]: put(pad_note(m2f(n + 12), 1.6), at, 1.0, rng.uniform(-0.5, 0.5))
    for s in range(8):  # 8th-note bass, ducked by the kick
        tb = t_(0.2); f = m2f(BASS[ci] - 12 + (12 if s % 4 == 3 else 0))
        x = lp(saw(f, tb) + 0.5 * np.sin(2 * np.pi * f / 2 * tb), 700) * env(tb, 0.004, 0.1) * 0.22
        x *= 0.35 + 0.65 * np.clip((tb + (s % 2) * 0.2) / 0.15, 0, 1)
        put(x, at + s * 0.2)

# transitions
for k in ('flow', 'assets', 'site'):
    put(whoosh(0.45), CUTS[k] - 0.42, 1.0, -0.2)
    put(whoosh(0.35, up=False), CUTS[k], 0.6, 0.2)
    put(blip(1760, 0.06, 0.25), CUTS[k], 1.0)
# flow: node arrivals (pentatonic), precheck ticks
ARR = np.cumsum([0.4, 0.36, 0.36, 0.8, 0.36, 0.36, 0.36])
notes = [69, 72, 74, 76, 79, 81, 84]
for i, a in enumerate(ARR): put(blip(m2f(notes[i]), 0.14, 0.35), CUTS['flow'] + a - 0.04, 1.0, -0.6 + i * 0.2)
for k in range(8): put(blip(2200 + k * 120, 0.03, 0.18), CUTS['flow'] + ARR[2] + 0.08 + k * 0.075, 1.0, 0.4)
# assets: scanner hum, locale flip glitch, stamp
ts = t_(0.9); put(lp(saw(110, ts) * np.sin(2 * np.pi * 3 * ts) ** 2, 2500) * 0.06 * np.sin(np.pi * ts / 0.9), CUTS['assets'] + 0.35)
put(glitch(0.25), CUTS['assets'] + 1.0, 1.0, 0.4)
put(clap(), CUTS['assets'] + 1.62, 1.0, 0.3)
# site: scroll whooshes, JSON-LD pop
for at in (0.8, 2.05): put(whoosh(0.4), CUTS['site'] + at - 0.05, 0.6, 0.3)
put(blip(1320, 0.12, 0.3), CUTS['site'] + 2.62, 1.0, 0.5)
put(riser(0.9), CUTS['slam'] - 0.9, 1.2)

# slam: four hits
for i in range(4):
    at = CUTS['slam'] + i * 0.4
    put(kick(True), at, 1.0); put(impact(), at, 0.45); put(clap(), at, 0.8)
    put(glitch(0.08), at, 1.0, (-1) ** i * 0.5)
    put(hat(), at + 0.2, 0.9); put(hat(), at + 0.3, 0.6)
# outro: big hit, logo drop sparkle, final chord, CRT zap
put(impact(), CUTS['outro'], 1.1); put(kick(True), CUTS['outro'], 1.0); put(glitch(0.16), CUTS['outro'], 1.0)
for i in range(10): put(blip(m2f(81 + [0, 3, 5, 7, 10][i % 5] + 12 * (i // 5)), 0.06, 0.12), CUTS['outro'] + 0.05 + i * 0.05, 1.0, -0.8 + i * 0.16)
for n in (57, 64, 69, 72, 76): put(pad_note(m2f(n), 1.4) * 2.2, CUTS['outro'] + 0.02, 1.0, rng.uniform(-0.6, 0.6))
tz = t_(0.3); put(np.sin(2 * np.pi * np.cumsum(3000 * np.exp(-tz * 14) + 60) / SR) * np.exp(-tz * 8) * 0.25, DUR - 0.33)

# ── master: short plate reverb, glue, limiter ──────────────────────────────
tir = t_(1.1)
ir = rng.standard_normal(len(tir)) * np.exp(-tir * 4.5)
irL, irR = lp(ir, 5000), lp(np.roll(ir, 211), 5000)
wetL = fftconvolve(L, irL)[:N] * 0.06; wetR = fftconvolve(R, irR)[:N] * 0.06
mixL, mixR = L + wetL, R + wetR
fade = np.clip((DUR - td) / 0.08, 0, 1)
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
mixL = np.tanh(mixL / peak * 1.5) / np.tanh(1.5) * 0.89 * fade
mixR = np.tanh(mixR / peak * 1.5) / np.tanh(1.5) * 0.89 * fade
out = (np.stack([mixL, mixR], 1) * 32767).astype('<i2')
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('✓', path)
