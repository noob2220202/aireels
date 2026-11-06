"""Procedural cinematic sound design + mixing for aireels.

Everything is synthesized (no samples), so the result is 100% original / royalty free.
Driven by build/timeline.json written by build.py.
"""
import json
import sys
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
RNG = np.random.default_rng(7)


# ---------------- helpers ----------------
def secs(n):
    return np.arange(int(n * SR)) / SR


def sos(kind, f, order=2):
    if isinstance(f, (list, tuple)):
        f = [min(max(x, 10), SR / 2 - 100) for x in f]
    else:
        f = min(max(f, 10), SR / 2 - 100)
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def env_ad(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / max(d, 1e-4) * curve / 4))
    return e


def noise(n, color='white'):
    w = RNG.standard_normal(n)
    if color == 'pink':
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
        a = [1, -2.494956002, 2.017265875, -0.522189400]
        w = signal.lfilter(b, a, w) * 3.5
    elif color == 'brown':
        w = np.cumsum(w)
        w = filt(w, 'highpass', 15) / 60
    return w


def sweep_filter(x, f0, f1, kind='bandpass', q=1.2, blocks=64):
    """time-varying filter by blockwise processing with crossfade."""
    n = len(x)
    out = np.zeros(n)
    bs = int(np.ceil(n / blocks))
    win = bs // 4
    for i in range(blocks):
        a, b = i * bs, min(n, (i + 1) * bs + win)
        if a >= n:
            break
        k = i / max(1, blocks - 1)
        f = f0 * (f1 / f0) ** k
        if kind == 'bandpass':
            s = sos('bandpass', [f / (1 + 1 / q), f * (1 + 1 / q)])
        else:
            s = sos(kind, f)
        y = signal.sosfilt(s, x[max(0, a - 2048):b])[min(a, 2048):]
        fade = np.ones(len(y))
        if i > 0:
            fade[:win] = np.linspace(0, 1, win)[:len(fade[:win])]
        if b < n:
            fade[-win:] = np.minimum(fade[-win:], np.linspace(1, 0, win)[-len(fade[-win:]):])
        out[a:a + len(y)] += y * fade
    return out


_IR = {}


def reverb(x, rt=2.2, mix=.3, pre=.02, bright=4000):
    key = (rt, bright)
    if key not in _IR:
        n = int(rt * SR)
        t = np.arange(n) / SR
        ir = RNG.standard_normal((2, n)) * np.exp(-6.9 * t / rt)
        ir = np.stack([filt(ch, 'lowpass', bright) for ch in ir])
        ir[:, :int(pre * SR)] = 0
        ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
        _IR[key] = ir
    ir = _IR[key]
    if x.ndim == 1:
        x = np.stack([x, x])
    wet = np.stack([signal.fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])
    return x * (1 - mix) + wet * mix * 1.6


def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414])


def place(bus, x, t, gain=1.0):
    if x.ndim == 1:
        x = stereo(x)
    i = int(t * SR)
    if i >= bus.shape[1]:
        return
    if i < 0:
        x = x[:, -i:]
        i = 0
    n = min(x.shape[1], bus.shape[1] - i)
    bus[:, i:i + n] += x[:, :n] * gain


def db(x):
    return 10 ** (x / 20)


# ---------------- instruments ----------------
def saw_additive(f, t, nh=24, bright=1.0):
    y = np.zeros_like(t)
    for h in range(1, nh + 1):
        if f * h > SR / 2.2:
            break
        roll = np.exp(-h / (3 + 10 * bright))
        y += np.sin(2 * np.pi * f * h * t + h * 1.3) / h * roll
    return y


def drone(dur, root=73.42, intensity=None):
    """dark evolving pad: root + fifth + minor 3rd, detuned, slow filter movement."""
    t = secs(dur)
    lfo = .5 + .5 * np.sin(2 * np.pi * t / 9.0)
    out = np.zeros((2, len(t)))
    voices = [(root, 0, .9), (root * 1.4983, .2, .45), (root * 2 * 1.1892, -.25, .35), (root / 2, 0, .8)]
    for f, pan, amp in voices:
        for det in (-0.07, 0.0, 0.06):
            ff = f * 2 ** (det / 12)
            y = saw_additive(ff, t, nh=18, bright=.25 + .35 * lfo.mean())
            out += stereo(y * amp / 3, pan + det * 3)
    # slow filter movement via crossfade between dark/bright versions
    dark = np.stack([filt(c, 'lowpass', 280) for c in out])
    bright = np.stack([filt(c, 'lowpass', 1100) for c in out])
    mixk = lfo if intensity is None else np.clip(intensity, 0, 1)
    out = dark * (1 - mixk) + bright * mixk
    # air layer
    air = filt(noise(len(t), 'pink'), 'bandpass', [2500, 7000]) * .05 * (.6 + .4 * np.sin(2 * np.pi * t / 6.3))
    out += stereo(air, .3)
    fade = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.0)
    return out * fade * .22


def heartbeat(bpm=60):
    n = int(.9 * SR)
    t = np.arange(n) / SR
    def thump(off, g):
        tt = np.clip(t - off, 0, None)
        f = 48 + 30 * np.exp(-tt * 30)
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph) * np.exp(-tt * 14) * (t >= off) * g
    y = thump(0, 1.0) + thump(.24, .7)
    y = filt(y, 'lowpass', 180) * .9
    # upper-harmonic knock so the pulse reads on phone speakers
    def knock(off, g):
        tt = np.clip(t - off, 0, None)
        return filt(noise(n), 'bandpass', [140, 900]) * np.exp(-tt * 45) * (t >= off) * g
    return y + knock(0, .55) + knock(.24, .38)


def tick():
    n = int(.05 * SR)
    y = noise(n) * env_ad(n, .0005, .006)
    y = filt(y, 'bandpass', [2500, 7000]) * 1.2
    ping = np.sin(2 * np.pi * 3200 * np.arange(n) / SR) * env_ad(n, .0005, .01) * .3
    return y + ping


def impact(size=1.0):
    n = int(3.2 * SR)
    t = np.arange(n) / SR
    f = 30 + 110 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    crack = filt(noise(n), 'lowpass', 3500) * np.exp(-t * 28) * .8
    body = filt(noise(n, 'brown'), 'lowpass', 300) * np.exp(-t * 3.5) * 1.5
    y = boom * 1.1 + crack + body
    y = np.tanh(y * 1.6) * .8
    return reverb(y, rt=2.8, mix=.35) * size


def braam(root=36.71, dur=2.6):
    """cinematic low brass hit for reveals."""
    t = secs(dur)
    e = np.minimum(1, t / .06) * np.exp(-t * 1.1)
    y = np.zeros_like(t)
    for f, a in ((root, 1), (root * 2, .8), (root * 3, .45), (root * 2 * 1.1892, .5), (root * 4, .3)):
        for det in (-.12, 0, .1):
            y += saw_additive(f * 2 ** (det / 12), t, nh=30, bright=.6) * a / 3
    cutoff_open = filt(y, 'lowpass', 1400)
    cutoff_closed = filt(y, 'lowpass', 300)
    k = np.exp(-t * 2.5)
    y = cutoff_open * k + cutoff_closed * (1 - k)
    y = np.tanh(y * 2.2) * e * .6
    return reverb(y, rt=3.0, mix=.35, bright=2500)


def riser(dur=2.0):
    t = secs(dur)
    x = noise(len(t))
    y = sweep_filter(x, 300, 9000, 'bandpass', q=2.5, blocks=48)
    f = 110 * 2 ** (t / dur * 2.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * .12
    e = (t / dur) ** 2.2
    return reverb((y * .5 + tone) * e, rt=1.6, mix=.25)


def whoosh(dur=.55, up=True):
    t = secs(dur)
    x = noise(len(t), 'pink')
    y = sweep_filter(x, 250 if up else 3500, 3500 if up else 250, 'bandpass', q=1.6, blocks=24)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return reverb(y * e * 1.4, rt=1.2, mix=.2)


def typekey():
    n = int(.06 * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'bandpass', [1500, 6000]) * np.exp(-t * 300)
    y += np.sin(2 * np.pi * 180 * t) * np.exp(-t * 120) * .5
    return y * .8


def stampfx():
    n = int(.5 * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'lowpass', 900) * np.exp(-t * 35) * 1.6
    y += np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 18)
    return reverb(np.tanh(y * 1.5), rt=.8, mix=.15)


def glitchfx(dur=.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    seg = (RNG.integers(0, 6, size=n // 800 + 1)).repeat(800)[:n]
    f = 200 + seg * 330
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .25
    y = np.round(y * 4) / 4
    y += filt(noise(n), 'highpass', 3000) * .3 * (RNG.random(n // 400 + 1).repeat(400)[:n] > .5)
    return y * np.minimum(1, (dur - t) / .05)


def bell(f, dur=4.0):
    t = secs(dur)
    y = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)
         + .25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6))
    return y * np.exp(-t * 1.2) * np.minimum(1, t / .004) * .5


def rain_amb(dur):
    n = int(dur * SR)
    x = filt(noise(n, 'pink'), 'highpass', 600) * .35
    x = filt(x, 'lowpass', 9000)
    drops = np.zeros(n)
    idx = RNG.integers(0, n, size=int(dur * 40))
    drops[idx] = RNG.random(len(idx)) * .6
    drops = filt(drops, 'bandpass', [1500, 5000])
    y = np.stack([x + drops, filt(noise(n, 'pink'), 'highpass', 600) * .35 + np.roll(drops, 900)])
    return y * .5


def wind(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = noise(n, 'pink')
    y = sweep_filter(x, 300, 900, 'bandpass', q=3, blocks=40)
    mod = .6 + .4 * np.sin(2 * np.pi * t / 5.3) * np.sin(2 * np.pi * t / 2.1)
    return stereo(y * mod * .9, .1)


def engine_rumble(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = filt(noise(n, 'brown'), 'lowpass', 220) * 2.2
    whine = filt(noise(n), 'bandpass', [1800, 2600]) * .06
    hum = np.sin(2 * np.pi * 92 * t) * .08 + np.sin(2 * np.pi * 184 * t) * .04
    y = (x + whine + hum) * (1 + .1 * np.sin(2 * np.pi * t * 3.7))
    return stereo(y * .8)


def clock_ticks(dur, bpm=60, accent_every=0):
    n = int(dur * SR)
    out = np.zeros(n)
    k = tick()
    step = 60 / bpm
    i = 0
    tt = 0.0
    while tt < dur:
        j = int(tt * SR)
        m = min(len(k), n - j)
        out[j:j + m] += k[:m] * (1.0 if i % 2 == 0 else .7)
        tt += step
        i += 1
    return out


def creak(dur=.7):
    """rusty hinge: stick-slip friction = jittery pulse train through resonances."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 38 + 30 * np.sin(np.pi * t / dur) + 12 * np.cumsum(RNG.standard_normal(n)) / np.sqrt(SR) * 20
    f = np.clip(f, 18, 90)
    ph = np.cumsum(f) / SR
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (0.6 + 0.4 * RNG.random(n))
    y = sum(filt(pulses, 'bandpass', [fc * .93, fc * 1.07]) * g for fc, g in ((620, 1), (1350, .7), (2300, .5), (3700, .3)))
    e = np.minimum(1, t / .05) * np.minimum(1, (dur - t) / .1)
    return reverb(y * e * 6, rt=.9, mix=.2)


def shimmer(dur=1.6):
    t = secs(dur)
    y = np.zeros_like(t)
    for i, f in enumerate([1318.5, 1567.98, 1975.5, 2349.3, 2637.0, 3135.9]):
        on = i * .07
        tt = np.clip(t - on, 0, None)
        y += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.2) * (t >= on) * (1 + .3 * np.sin(2 * np.pi * 6 * tt))
    y += filt(noise(len(t)), 'highpass', 7000) * np.exp(-t * 3) * .15
    return reverb(y * .25, rt=2.8, mix=.5, bright=9000)


def rewind(dur=.7):
    t = secs(dur)
    f = 2200 * (1 - t / dur) ** 1.5 + 300
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .12 + filt(noise(len(t)), 'bandpass', [1500, 6000]) * .25
    y *= (1 + .5 * np.sign(np.sin(2 * np.pi * 37 * t)))
    return y * np.minimum(1, t / .02) * np.minimum(1, (dur - t) / .05)


def snap():
    n = int(.4 * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'highpass', 1500) * np.exp(-t * 90) * 1.5
    y += np.sin(2 * np.pi * (900 * np.exp(-t * 25) + 120) * t) * np.exp(-t * 20) * .6
    return reverb(y, rt=.8, mix=.15)


def flap(count=8, dur=.6):
    n = int(dur * SR)
    out = np.zeros(n)
    k = int(.03 * SR)
    for i in range(count):
        j = int(i / count * (n - k))
        click = filt(noise(k), 'bandpass', [800, 5000]) * np.exp(-np.arange(k) / SR * 220)
        out[j:j + k] += click * (.6 + .4 * RNG.random())
    return out * 1.2


def snip():
    n = int(.18 * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'bandpass', [3000, 9000]) * np.exp(-t * 60)
    y += np.sin(2 * np.pi * 4200 * t) * np.exp(-t * 80) * .3
    return y


def rustle(dur=.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    g = (RNG.random(n // 300 + 1) ** 3).repeat(300)[:n]
    y = filt(noise(n), 'bandpass', [1200, 7000]) * filt(g, 'lowpass', 60) * 2.5
    return y * np.sin(np.pi * t / dur)


def crinkle(dur=.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    idx = RNG.integers(0, n, size=int(dur * 260))
    y[idx] = RNG.standard_normal(len(idx))
    y = filt(y, 'highpass', 1800) * 2.0 + filt(noise(n), 'bandpass', [2000, 8000]) * .08
    return y * np.sin(np.pi * t / dur) ** .5


def revcymbal(dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'highpass', 4000) * np.exp(-(dur - t) * 3.5)
    y = reverb(y, rt=1.2, mix=.3)
    return y * .7


def scan(dur=1.0):
    t = secs(dur)
    y = np.sin(2 * np.pi * 120 * t) * .25 + np.sin(2 * np.pi * 240 * t) * .12
    y += np.sin(2 * np.pi * (1200 + 900 * t / dur) * t) * .08
    y *= (1 + .4 * np.sin(2 * np.pi * 14 * t))
    return y * np.minimum(1, t / .05) * np.minimum(1, (dur - t) / .1)


def slam():
    n = int(.8 * SR)
    t = np.arange(n) / SR
    y = filt(noise(n), 'lowpass', 2500) * np.exp(-t * 30) * 1.4
    y += np.sin(2 * np.pi * (95 * np.exp(-t * 6) + 40) * t) * np.exp(-t * 9)
    return reverb(np.tanh(y * 1.4), rt=1.0, mix=.2)


def slash():
    n = int(.3 * SR)
    t = np.arange(n) / SR
    y = sweep_filter(noise(n), 1500, 6000, 'bandpass', q=2, blocks=12) * np.sin(np.pi * t / .3) * 1.4
    return y


def thunk():
    n = int(.4 * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (180 * np.exp(-t * 30) + 70) * t) * np.exp(-t * 18)
    y += filt(noise(n), 'bandpass', [400, 2500]) * np.exp(-t * 60) * .5
    return y


def piano(f=146.83, dur=3.0):
    t = secs(dur)
    y = np.zeros_like(t)
    for h, a in ((1, 1), (2, .5), (3, .25), (4, .12), (5, .08)):
        y += np.sin(2 * np.pi * f * h * t * (1 + .0004 * h * h)) * a * np.exp(-t * (1.2 + h * .5))
    y *= np.minimum(1, t / .003)
    return reverb(y * .6, rt=3.2, mix=.45)


SFX = {
    'impact': lambda o: impact(o.get('size', 1.0)),
    'braam': lambda o: braam(o.get('root', 36.71), o.get('dur', 2.6)),
    'riser': lambda o: riser(o.get('dur', 2.0)),
    'whoosh': lambda o: whoosh(o.get('dur', .55), o.get('up', True)),
    'type': lambda o: typekey(),
    'stamp': lambda o: stampfx(),
    'glitch': lambda o: glitchfx(o.get('dur', .35)),
    'heartbeat': lambda o: heartbeat(),
    'tick': lambda o: tick(),
    'bell': lambda o: reverb(bell(o.get('f', 587.33), o.get('dur', 4.0)), rt=3.5, mix=.5),
    'rain': lambda o: rain_amb(o.get('dur', 4.0)),
    'wind': lambda o: wind(o.get('dur', 4.0)),
    'engine': lambda o: engine_rumble(o.get('dur', 4.0)),
    'creak': lambda o: creak(o.get('dur', .7)),
    'shimmer': lambda o: shimmer(o.get('dur', 1.6)),
    'rewind': lambda o: rewind(o.get('dur', .7)),
    'snap': lambda o: snap(),
    'flap': lambda o: flap(o.get('count', 8), o.get('dur', .6)),
    'snip': lambda o: snip(),
    'rustle': lambda o: rustle(o.get('dur', .8)),
    'crinkle': lambda o: crinkle(o.get('dur', .9)),
    'revcymbal': lambda o: revcymbal(o.get('dur', 1.4)),
    'scan': lambda o: scan(o.get('dur', 1.0)),
    'slam': lambda o: slam(),
    'slash': lambda o: slash(),
    'thunk': lambda o: thunk(),
    'piano': lambda o: piano(o.get('f', 146.83), o.get('dur', 3.0)),
}


# ---------------- music bed ----------------
def music_bed(TL):
    dur = TL['duration'] + 1.5
    n = int(dur * SR)
    bus = np.zeros((2, n))
    M = TL.get('music', {})
    root = M.get('root', 73.42)
    t = secs(dur)
    # intensity curve from keyframes [[t, v], ...]
    kf = M.get('intensity', [[0, .3], [dur, .6]])
    inten = np.interp(t, [k[0] for k in kf], [k[1] for k in kf])
    bus += drone(dur, root, intensity=inten)[:, :n] * db(M.get('drone_db', 0))
    # heartbeat pulse, tempo follows intensity
    hb = heartbeat()
    tt = M.get('pulse_start', 0.0)
    stops = M.get('pulse_stops', [])
    while tt < dur - 1:
        if not any(a <= tt < b for a, b in stops):
            g = .35 + .65 * np.interp(tt, t, inten)
            place(bus, hb, tt, gain=.55 * g * db(M.get('pulse_db', 0)))
        tt += 60 / (58 + 40 * np.interp(tt, t, inten))
        if M.get('pulse_end') and tt >= M['pulse_end']:
            break
    # clock ticks
    if M.get('ticks', True):
        ck = clock_ticks(dur, bpm=120) * .12 * db(M.get('tick_db', 0))
        mask = np.interp(t, [k[0] for k in kf], [1 if k[1] < .85 else 0 for k in kf])
        for a, b in stops:
            mask[int(a * SR):int(b * SR)] = 0
        bus += stereo(ck * mask, .35)
    # sparse bell motif (minor), on given times
    for i, bt in enumerate(M.get('bells', [])):
        notes = [587.33, 698.46, 554.37, 440.0, 587.33, 523.25]
        place(bus, reverb(bell(notes[i % len(notes)] * M.get('bell_oct', .5), 4), rt=3.5, mix=.55), bt, .22)
    # gain automation in dB keyframes [[t, db], ...]
    if M.get('gain'):
        g = np.interp(t, [k[0] for k in M['gain']], [k[1] for k in M['gain']])
        bus = bus * db(g)[:bus.shape[1]]
    # tame sub energy (inaudible on phones, eats loudness headroom)
    bus = np.stack([filt(c, 'highpass', 38, 4) for c in bus])
    low = np.stack([filt(c, 'lowpass', 110) for c in bus])
    bus = bus - .45 * low
    return bus


def rms(x):
    return np.sqrt((x ** 2).mean() + 1e-12)


# ---------------- voice processing ----------------
def load_voice(path):
    x, sr = sf.read(path, always_2d=False)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


def process_voice(x):
    x = filt(x, 'highpass', 75)
    # gentle presence + warmth shelving via parallel bands
    pres = filt(x, 'bandpass', [2500, 5000]) * .25
    warm = filt(x, 'bandpass', [120, 260]) * .18
    x = x + pres + warm
    # simple compressor
    e = np.abs(signal.hilbert(x))
    e = filt(e, 'lowpass', 25)
    thr = .18
    g = np.where(e > thr, (thr + (e - thr) / 3) / np.maximum(e, 1e-6), 1)
    x = x * g
    x = x / (np.abs(x).max() + 1e-9) * .9
    room = reverb(x, rt=.7, mix=.08, bright=6000)
    return room


def mix(project):
    project = Path(project)
    B = project / 'build'
    TL = json.loads((B / 'timeline.json').read_text())
    dur = TL['duration'] + .6
    n = int(dur * SR)
    voice = np.zeros((2, n))
    for v in TL['voice']:
        x = load_voice(B / v['file'])
        place(voice, process_voice(x), v['t'], 1.0)
    music = music_bed(TL)[:, :n]
    if music.shape[1] < n:
        music = np.pad(music, ((0, 0), (0, n - music.shape[1])))
    sfx = np.zeros((2, n))
    for c in TL['sfx']:
        f = SFX[c['type']](c)
        place(sfx, f, c['t'], db(c.get('db', 0)))
    # ducking: music follows voice envelope
    venv = filt(np.abs(voice.mean(axis=0)), 'lowpass', 6)
    venv = venv / (venv.max() + 1e-9)
    duck = 1 - .55 * np.clip(venv * 4, 0, 1)
    duck = filt(duck, 'lowpass', 3)
    M = TL.get('music', {})
    # auto-gain: music bed sits rel_db under the voice (RMS), sfx peaks relative to voice
    vr = rms(voice[:, np.abs(voice).max(axis=0) > 1e-4]) if np.any(voice) else .1
    music = music * (vr * db(M.get('rel_db', -8)) / rms(music))
    sfx = sfx * (vr * db(TL.get('sfx_rel_db', 12)) / (np.abs(sfx).max() + 1e-9)) if np.any(sfx) else sfx
    out = voice * db(TL.get('voice_db', 0)) + music * duck + sfx
    # stems for diagnostics
    for nm, x in (('stem_voice', voice), ('stem_music', music * duck), ('stem_sfx', sfx)):
        sf.write(B / f'{nm}.wav', x.T, SR, subtype='PCM_16')
    # fade out tail
    fo = int(.4 * SR)
    out[:, -fo:] *= np.linspace(1, 0, fo)
    out = np.tanh(out * 1.1) / 1.1
    raw = B / 'mix_raw.wav'
    sf.write(raw, out.T, SR, subtype='PCM_24')
    # loudness normalize for social (-14 LUFS, -1 dBTP)
    final = B / 'mix.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11', '-ar', str(SR), str(final)], check=True)
    print(final)


if __name__ == '__main__':
    mix(sys.argv[1])
