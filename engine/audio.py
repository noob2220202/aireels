#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aireels audio engine: procedural music + SFX for one cut-drama episode.

    python3 engine/audio.py <build_dir>          reads <build_dir>/timeline.json (SPEC section 6),
                                                 writes <build_dir>/audio.wav (48 kHz, stereo, 16-bit)
    python3 engine/audio.py --demo <dir>         writes <dir>/timeline.json covering every mood and
                                                 every SFX, then renders <dir>/audio.wav
    options:  --report   also write <build_dir>/audio_report.json (plan + loudness numbers)
              --quiet    no log lines

Everything is synthesized with numpy/scipy: no samples, no external assets.

MUSIC. One series theme (a singable 8-bar melody with an antecedent A, a consequent A' and a
bridge B) is written once in scale degrees. Every mood is an arrangement / re-harmonisation of that
theme, so the whole series shares one audio identity:

    sweet    F major   84 bpm   celesta + music box melody, felt-piano arpeggios, soft bass, pad
    flutter  G major   96 bpm   celesta melody over pizzicato pulses that climb, opens on IVmaj7
    comic    C major  112 bpm   swung staccato mallet + pizzicato, oom-pah bass, woodblock, shaker
    calm     Bb major  72 bpm   sparse felt piano (theme without passing notes) on a warm pad
    sad      D minor   66 bpm   the theme in minor, slow piano, harmonic-minor cadence
    tension  D sus    100 bpm   theme fragments that never resolve, sus chords, pedal pulse
    bright   G major   92 bpm   piano in octaves, pad, bass line, light lofi drums

A mood change lands on a bar line placed at the requested time: the outgoing mood bends its tempo by
a few percent and closes with a short dominant "pivot" bar (V7sus4 of the new key) so tempo and key
changes sound prepared; sustained notes are released at the bar line, which is the crossfade.
The last segment is laid out backwards from the end card so that the consequent phrase cadences
exactly there: a slight ritardando, a soft tonic chord, then a fade over the last 0.4 s.

SFX. Every type of the SPEC vocabulary, soft and round. Pitched ones (pop, ding, sparkle,
messageIn, doorbell, elevatorDing, sting) are tuned to the key of the music at that moment.

MIX. Music bed + SFX, gentle ducking of the music under loud SFX, soft-knee look-ahead limiter,
BS.1770 integrated loudness -14 LUFS, true peak <= -1 dBTP. Deterministic: same timeline, same file.
"""
from __future__ import annotations

import json
import math
import os
import sys
import time
from functools import lru_cache
from itertools import combinations

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

SR = 48000
TWO_PI = 2.0 * math.pi
TARGET_LUFS = -14.0
TRUE_PEAK_MAX_DB = -1.0
END_FADE_S = 0.4

_QUIET = False


def log(*a):
    if not _QUIET:
        print('[audio]', *a, file=sys.stderr)


def warn(*a):
    print('[audio] WARNING:', *a, file=sys.stderr)


# --------------------------------------------------------------------------------------------
# small DSP helpers
# --------------------------------------------------------------------------------------------

_T = np.arange(SR * 12, dtype=np.float64) / SR


def _tb(n):
    """Shared read-only time base (seconds) of n samples."""
    global _T
    if n > len(_T):
        _T = np.arange(n + SR, dtype=np.float64) / SR
    return _T[:n]


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def db(x):
    return 20.0 * math.log10(max(float(x), 1e-12))


def from_db(d):
    return 10.0 ** (d / 20.0)


def _rng(*key):
    """Deterministic RandomState from any printable key."""
    s = 0x9E3779B1
    for k in key:
        for ch in str(k):
            s = ((s * 1000003) ^ ord(ch)) & 0xFFFFFFFF
        s = ((s * 1000003) ^ 0x7F) & 0xFFFFFFFF
    return np.random.RandomState(s)


def _fade(x, a, r):
    """In-place raised-cosine fade-in over a samples and fade-out over r samples."""
    n = len(x)
    a = int(min(a, n // 2))
    r = int(min(r, n // 2))
    if a > 1:
        w = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
        x[:a] *= w if x.ndim == 1 else w[:, None]
    if r > 1:
        w = 0.5 + 0.5 * np.cos(np.pi * (np.arange(r) + 1) / r)
        x[-r:] *= w if x.ndim == 1 else w[:, None]
    return x


@lru_cache(maxsize=None)
def _sos(kind, lo, hi, order):
    ny = SR / 2.0
    if kind == 'lp':
        return signal.butter(order, min(lo, ny * 0.98) / ny, 'low', output='sos')
    if kind == 'hp':
        return signal.butter(order, lo / ny, 'high', output='sos')
    return signal.butter(order, [lo / ny, min(hi, ny * 0.98) / ny], 'band', output='sos')


def lp(x, fc, order=2):
    return signal.sosfilt(_sos('lp', float(fc), 0.0, order), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(_sos('hp', float(fc), 0.0, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos('bp', float(lo), float(hi), order), x, axis=0)


def _norm(x, peak=1.0):
    m = float(np.max(np.abs(x))) if len(x) else 0.0
    return x * (peak / m) if m > 1e-9 else x


def _sweep_noise(rng, n, f_traj, width_oct=0.9):
    """Noise through a band-pass whose centre follows f_traj (Hz per sample): a small filter bank
    cross-faded with triangular weights on a log-frequency axis (fully vectorised, no zipper)."""
    x = rng.standard_normal(n)
    lf = np.log2(np.maximum(f_traj, 20.0))
    lo_o, hi_o = float(lf.min()) - 0.3, float(lf.max()) + 0.3
    step = 0.45
    k = max(2, int(math.ceil((hi_o - lo_o) / step)) + 1)
    centers = np.linspace(lo_o, hi_o, k)
    step = centers[1] - centers[0]
    out = np.zeros(n)
    for c in centers:
        fc = 2.0 ** c
        y = bp(x, fc * 2 ** (-width_oct / 2), min(fc * 2 ** (width_oct / 2), 20000.0), 2)
        w = np.clip(1.0 - np.abs(lf - c) / step, 0.0, 1.0)
        out += w * y
    return out


def pan_gains(pan):
    a = (min(1.0, max(-1.0, pan)) + 1.0) * math.pi / 4.0
    return math.cos(a), math.sin(a)


# --------------------------------------------------------------------------------------------
# instruments (all return float64 mono, or (n, 2) stereo for the pad; every note is faded)
# --------------------------------------------------------------------------------------------

_BURSTS = {}


def _burst(kind, fc, tau, var=0):
    """Short filtered-noise transient (hammer felt, finger, mallet), unit peak."""
    key = (kind, int(fc), round(tau, 4), var)
    b = _BURSTS.get(key)
    if b is None:
        n = int(SR * tau * 7) + 64
        t = _tb(n)
        x = _rng('burst', *key).standard_normal(n)
        x = lp(x, fc, 2)
        x = x * (1.0 - np.exp(-t / 0.0012)) * np.exp(-t / tau)
        b = _fade(_norm(x), 8, 32)
        _BURSTS[key] = b
    return b


def syn_piano(midi, dur, vel):
    """Felt piano: soft hammer (steep partial roll-off that opens with velocity), slightly
    inharmonic partials, faster decay for higher partials, two-stage decay and a detuned second
    string on the low partials, a tiny felt thump, damper release."""
    f0 = mtof(midi)
    n = int((dur + 0.5) * SR)
    t = _tb(n)
    tau1 = 2.5 * 2.0 ** ((60.0 - midi) / 20.0)
    slope = (7.2 - 3.2 * vel) * 2.0 ** ((midi - 60.0) / 40.0)      # dB per partial
    inh = max(6e-5, 2.0e-4 * 2.0 ** ((midi - 60.0) / 10.0))
    out = np.zeros(n)
    a1 = 0.35 + 0.65 * abs(math.sin(math.pi * 0.118 + 0.25))
    for k in range(1, 40):
        fk = k * f0 * math.sqrt(1.0 + inh * k * k)
        if fk > 8000.0:
            break
        a = 10.0 ** (-slope * (k - 1) / 20.0) * (0.35 + 0.65 * abs(math.sin(math.pi * k * 0.118 + 0.25))) / a1
        if k > 2 and a < 0.003:
            break
        tk = tau1 / (1.0 + 0.45 * (k - 1))
        nk = min(n, int(SR * tk * math.log(max(a, 2e-4) / 1e-4)) + 1)
        if nk < 64:
            continue
        tt = t[:nk]
        env = np.exp(tt * (-1.0 / tk))
        if k <= 2:
            env = 0.6 * env + 0.4 * np.exp(tt * (-1.0 / (0.15 * tk)))
        w = TWO_PI * fk
        s = np.sin(w * tt)
        if k <= 3:
            s = 0.62 * s + 0.38 * np.sin((w * 1.0007) * tt + 0.9 * k)
        seg = (a * env) * s
        if nk < n:
            _fade(seg, 0, 256)
        out[:nk] += seg
    th = _burst('felt', min(1400.0, max(300.0, 3.0 * f0)), 0.012, int(midi) % 5)
    m = min(len(th), n)
    out[:m] += th[:m] * (0.035 + 0.05 * vel)
    nd = min(n - 1, int(dur * SR))
    out[nd:] *= np.exp(t[:n - nd] * (-1.0 / 0.10))
    _fade(out, int(SR * (0.004 + 0.007 * (1.0 - vel))), int(SR * 0.03))
    return out * 0.42


_CEL = {
    # ratio, amplitude, decay seconds (at C5)
    'celesta': ((1.0, 1.00, 1.05), (2.0, 0.20, 0.55), (3.0, 0.05, 0.32), (4.07, 0.10, 0.22), (6.3, 0.03, 0.07)),
    'musicbox': ((1.0, 1.00, 1.35), (2.0, 0.08, 0.70), (3.01, 0.03, 0.40), (5.4, 0.09, 0.14), (8.9, 0.035, 0.05)),
    'mallet': ((1.0, 1.00, 0.30), (3.93, 0.22, 0.09), (2.0, 0.10, 0.16), (9.2, 0.05, 0.03)),
    'bell': ((1.0, 1.00, 1.00), (2.0, 0.42, 0.75), (3.0, 0.16, 0.50), (4.1, 0.10, 0.30), (5.35, 0.05, 0.16)),
}


def syn_celesta(midi, dur, vel, kind='celesta'):
    """Celesta / music box / soft mallet / chime: a few (partly inharmonic) sine partials with their
    own decays; a soft 2-3 ms mallet attack so there is no click."""
    f0 = mtof(midi)
    scale = 2.0 ** ((72.0 - midi) / 22.0)
    damp = kind in ('celesta', 'mallet')
    n = int((dur + (0.45 if damp else 1.6 * scale)) * SR)
    t = _tb(n)
    out = np.zeros(n)
    bright = 0.55 + 0.6 * vel
    for i, (ratio, amp, tau) in enumerate(_CEL[kind]):
        fk = f0 * ratio
        if fk > 9500.0:
            continue
        a = amp * (bright if i else 1.0)
        tk = tau * scale
        nk = min(n, int(SR * tk * math.log(max(a, 2e-4) / 1e-4)) + 1)
        if nk < 48:
            continue
        tt = t[:nk]
        seg = (a * np.exp(tt * (-1.0 / tk))) * np.sin((TWO_PI * fk) * tt)
        if nk < n:
            _fade(seg, 0, 256)
        out[:nk] += seg
    if kind == 'mallet':
        th = _burst('mallet', 1800.0, 0.006, int(midi) % 4)
        m = min(len(th), n)
        out[:m] += th[:m] * 0.07
    if damp:
        nd = min(n - 1, int(dur * SR))
        out[nd:] *= np.exp(t[:n - nd] * (-1.0 / 0.16))
    _fade(out, int(SR * 0.0028), int(SR * 0.04))
    return out * 0.5


def syn_pluck(midi, dur, vel, kind='pizz'):
    """Pizzicato / plucked string: harmonic partials shaped by the pluck position, upper partials
    die quickly (woody), a slight initial pitch drop, a small finger/body thump, damped at note-off."""
    f0 = mtof(midi)
    mute = kind == 'mute'
    tau0 = {'mute': 0.16, 'harp': 1.0}.get(kind, 0.42) * 2.0 ** ((60.0 - midi) / 18.0)
    roll = 4.5 if mute else (3.4 - 1.2 * vel)                       # extra dB per partial
    n = int((min(dur, tau0 * 7.0) + 0.12) * SR)
    t = _tb(n)
    tt_all = t + 0.010 * 0.022 * (1.0 - np.exp(t * (-1.0 / 0.022)))  # +1 % sharp, relaxing in 22 ms
    out = np.zeros(n)
    for k in range(1, 24):
        fk = k * f0
        if fk > 6000.0:
            break
        a = abs(math.sin(math.pi * k * 0.21)) / (k ** 1.05) * 10.0 ** (-roll * (k - 1) / 20.0)
        if a < 0.004:
            if k > 4:
                break
            continue
        tk = tau0 / (1.0 + 0.55 * (k - 1) ** 1.25)
        nk = min(n, int(SR * tk * math.log(max(a, 2e-4) / 1e-4)) + 1)
        if nk < 48:
            continue
        seg = (a * np.exp(t[:nk] * (-1.0 / tk))) * np.sin((TWO_PI * fk) * tt_all[:nk])
        if nk < n:
            _fade(seg, 0, 128)
        out[:nk] += seg
    th = _burst('pluck', min(900.0, max(250.0, 2.0 * f0)), 0.005, int(midi) % 4)
    m = min(len(th), n)
    out[:m] += th[:m] * 0.10
    nd = min(n - 1, int(dur * SR))
    out[nd:] *= np.exp(t[:n - nd] * (-1.0 / 0.035))
    _fade(out, int(SR * 0.0018), int(SR * 0.02))
    return out * 0.8


def syn_bass(midi, dur, vel):
    """Soft upright / sub bass: sine fundamental with a few quickly decaying harmonics (so it still
    reads on phone speakers), rounded 12 ms attack, soft thump."""
    f0 = mtof(midi)
    n = int((dur + 0.25) * SR)
    t = _tb(n)
    tt = t + 0.012 * 0.03 * (1.0 - np.exp(t * (-1.0 / 0.03)))
    out = np.zeros(n)
    for k, a, tau in ((1, 1.0, 1.3), (2, 0.40 + 0.2 * vel, 0.60), (3, 0.20 + 0.1 * vel, 0.36), (4, 0.09, 0.24), (5, 0.05, 0.16)):
        nk = min(n, int(SR * tau * 7.5))
        out[:nk] += _fade((a * np.exp(t[:nk] * (-1.0 / tau))) * np.sin((TWO_PI * k * f0) * tt[:nk]), 0, 256)
    th = _burst('bass', 320.0, 0.012, int(midi) % 3)
    m = min(len(th), n)
    out[:m] += th[:m] * 0.12
    nd = min(n - 1, int(dur * SR))
    out[nd:] *= np.exp(t[:n - nd] * (-1.0 / 0.07))
    _fade(out, int(SR * 0.012), int(SR * 0.03))
    return out * 0.6


_PAD_SR = 16000


def syn_pad(midi, dur, vel):
    """Warm pad (stereo): three slightly detuned voices of soft harmonics, slow attack and release,
    gentle tremolo. Synthesized at 16 kHz (nothing above 3.2 kHz) and resampled."""
    f0 = mtof(midi)
    att, rel = 0.5, 0.9
    n = int((dur + rel) * _PAD_SR)
    t = np.arange(n) / _PAD_SR
    r = _rng('pad', round(midi, 2))
    left = np.zeros(n)
    right = np.zeros(n)
    for vi, cents in enumerate((-7.0, 0.0, 6.0)):
        f = f0 * 2.0 ** (cents / 1200.0)
        v = np.zeros(n)
        for k in range(1, 7):
            fk = f * k
            if fk > 3200.0:
                break
            a = 1.0 / k ** (1.9 - 0.5 * vel)
            v += a * np.sin((TWO_PI * fk) * t + r.uniform(0, TWO_PI))
        if vi == 0:
            left += v
        elif vi == 2:
            right += v
        else:
            left += 0.6 * v
            right += 0.6 * v
    x = np.stack([left, right], axis=1)
    env = np.ones(n)
    na = int(att * _PAD_SR)
    nr = int(rel * _PAD_SR)
    na = min(na, max(1, (n - nr) ))
    env[:na] = 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    env[n - nr:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nr) / nr)
    env *= 1.0 + 0.07 * np.sin(TWO_PI * 0.23 * t + r.uniform(0, TWO_PI))
    x *= env[:, None]
    y = signal.resample_poly(x, SR // _PAD_SR, 1, axis=0)
    return _fade(y, 64, 256) * 0.22


_PERC = {}


def perc(kind, var=0):
    """Light percussion one-shots (cached): shaker, hat, rim, wood, kick, brush."""
    key = (kind, var)
    x = _PERC.get(key)
    if x is not None:
        return x
    r = _rng('perc', kind, var)
    if kind == 'shaker':
        n = int(0.16 * SR)
        t = _tb(n)
        x = bp(r.standard_normal(n), 4200.0, 9500.0, 2)
        x = x * (1.0 - np.exp(-t / 0.006)) * np.exp(-t / (0.030 + 0.004 * var))
        x = _norm(x) * 0.5
    elif kind == 'hat':
        n = int(0.10 * SR)
        t = _tb(n)
        x = lp(hp(r.standard_normal(n), 5500.0, 2), 11000.0, 2)
        x = x * (1.0 - np.exp(-t / 0.002)) * np.exp(-t / (0.016 + 0.003 * var))
        x = _norm(x) * 0.4
    elif kind == 'rim':
        n = int(0.14 * SR)
        t = _tb(n)
        x = 0.8 * np.sin(TWO_PI * (430.0 + 12 * var) * t) * np.exp(-t / 0.022)
        x += 0.45 * np.sin(TWO_PI * (1710.0 + 30 * var) * t) * np.exp(-t / 0.010)
        x += 0.25 * lp(r.standard_normal(n), 5000.0, 2) * np.exp(-t / 0.004)
        x = _norm(lp(x, 6000.0, 1)) * 0.6
    elif kind == 'wood':
        n = int(0.16 * SR)
        t = _tb(n)
        f = (880.0, 1046.5, 784.0)[var % 3]
        x = np.sin(TWO_PI * f * t) * np.exp(-t / 0.028)
        x += 0.35 * np.sin(TWO_PI * f * 2.71 * t) * np.exp(-t / 0.010)
        x += 0.15 * lp(r.standard_normal(n), 3000.0, 2) * np.exp(-t / 0.003)
        x = _norm(x) * 0.55
    elif kind == 'kick':
        n = int(0.42 * SR)
        t = _tb(n)
        ph = TWO_PI * (60.0 * t + 70.0 * 0.026 * (1.0 - np.exp(-t / 0.026)))
        x = np.sin(ph) * np.exp(-t / 0.085)
        x += 0.30 * np.sin(2.0 * ph) * np.exp(-t / 0.045)
        x += 0.10 * lp(r.standard_normal(n), 1500.0, 2) * np.exp(-t / 0.006)
        x = _norm(lp(x, 2500.0, 1)) * 0.9
    elif kind == 'brush':
        n = int(0.30 * SR)
        t = _tb(n)
        x = bp(r.standard_normal(n), 1400.0, 6500.0, 2)
        x = x * (1.0 - np.exp(-t / 0.012)) * np.exp(-t / 0.060)
        x = _norm(x) * 0.45 + 0.25 * np.sin(TWO_PI * 196.0 * t) * np.exp(-t / 0.035)
    else:
        raise KeyError(kind)
    x = _fade(np.array(x, dtype=np.float64), 24, int(SR * 0.012))
    _PERC[key] = x
    return x


_NOTE_CACHE = {}

# instrument -> (synth, gain, reverb send, default pan)
INSTR = {
    'piano': (lambda m, d, v: syn_piano(m, d, v), 0.50, 0.26, 0.0),
    'celesta': (lambda m, d, v: syn_celesta(m, d, v, 'celesta'), 0.42, 0.34, 0.12),
    'musicbox': (lambda m, d, v: syn_celesta(m, d, v, 'musicbox'), 0.28, 0.40, -0.15),
    'mallet': (lambda m, d, v: syn_celesta(m, d, v, 'mallet'), 0.42, 0.24, 0.10),
    'pluck': (lambda m, d, v: syn_pluck(m, d, v, 'pizz'), 0.42, 0.24, -0.10),
    'mute': (lambda m, d, v: syn_pluck(m, d, v, 'mute'), 0.50, 0.14, 0.0),
    'bass': (lambda m, d, v: syn_bass(m, d, v), 0.48, 0.03, 0.0),
    'pad': (lambda m, d, v: syn_pad(m, d, v), 0.24, 0.30, 0.0),
}
PERC_GAIN = {'shaker': (0.30, 0.10, 0.25), 'hat': (0.26, 0.08, 0.20), 'rim': (0.42, 0.14, -0.15),
             'wood': (0.40, 0.16, 0.20), 'kick': (0.70, 0.0, 0.0), 'brush': (0.34, 0.14, -0.10)}


def note_wave(inst, midi, dur, vel):
    dq = max(0.03, round(dur * 100.0) / 100.0)
    vq = min(1.0, max(0.1, round(vel * 8.0) / 8.0))
    key = (inst, round(midi, 2), dq, vq)
    w = _NOTE_CACHE.get(key)
    if w is None:
        w = INSTR[inst][0](midi, dq, vq)
        _NOTE_CACHE[key] = w
    return w


# --------------------------------------------------------------------------------------------
# THE SERIES THEME  (written once; every mood arranges it)
# --------------------------------------------------------------------------------------------
# Notes are (beat, beats, scale degree); degree 0 = tonic, 7 = tonic an octave higher. In C major
# the antecedent A reads:
#   | E4 G4 C5. D5 | D5. B4 G4~ | A4 C5 E5. D5 | C5. A4 F4~ | G4 C5 E5. G5 | F5. E5 D5 C5 | A4 C5 F5. E5 | D5~~ |
# the consequent A' (called A2) repeats bars 1-6 with small ornaments and cadences
#   | D5. C5 B4 D5 | C5~~ |
# and the bridge B is a falling sequence on the dotted rhythm of bar 2:
#   | F5. E5 D5~ | E5. D5 C5~ | D5. C5 A4~ | B4~~ G4 | F5. E5 D5 F5 | E5. G5 C5~ | A4 C5 F5. E5 | D5~~ |

MAJOR = (0, 2, 4, 5, 7, 9, 11)
MINOR = (0, 2, 3, 5, 7, 8, 10)
NOTE_NAMES = ('C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B')

THEME = {
    'A': [
        [(0, 1, 2), (1, 1, 4), (2, 1.5, 7), (3.5, .5, 8)],
        [(0, 1.5, 8), (1.5, .5, 6), (2, 2, 4)],
        [(0, 1, 5), (1, 1, 7), (2, 1.5, 9), (3.5, .5, 8)],
        [(0, 1.5, 7), (1.5, .5, 5), (2, 2, 3)],
        [(0, 1, 4), (1, 1, 7), (2, 1.5, 9), (3.5, .5, 11)],
        [(0, 1.5, 10), (1.5, .5, 9), (2, 1, 8), (3, 1, 7)],
        [(0, 1, 5), (1, 1, 7), (2, 1.5, 10), (3.5, .5, 9)],
        [(0, 3, 8)],
    ],
    'A2': [
        [(0, 1, 2), (1, 1, 4), (2, 1.5, 7), (3.5, .5, 8)],
        [(0, 1.5, 8), (1.5, .5, 6), (2, 1, 4), (3, .5, 4), (3.5, .5, 6)],
        [(0, 1, 5), (1, 1, 7), (2, 1.5, 9), (3.5, .5, 8)],
        [(0, 1.5, 7), (1.5, .5, 5), (2, 1, 3), (3, .5, 2), (3.5, .5, 3)],
        [(0, 1, 4), (1, 1, 7), (2, 1.5, 9), (3.5, .5, 11)],
        [(0, 1.5, 10), (1.5, .5, 9), (2, 1, 8), (3, 1, 7)],
        [(0, 1.5, 8), (1.5, .5, 7), (2, 1, 6), (3, 1, 8)],
        [(0, 3, 7)],
    ],
    'B': [
        [(0, 1.5, 10), (1.5, .5, 9), (2, 2, 8)],
        [(0, 1.5, 9), (1.5, .5, 8), (2, 2, 7)],
        [(0, 1.5, 8), (1.5, .5, 7), (2, 2, 5)],
        [(0, 3, 6), (3, 1, 4)],
        [(0, 1.5, 10), (1.5, .5, 9), (2, 1, 8), (3, 1, 10)],
        [(0, 1.5, 9), (1.5, .5, 11), (2, 2, 7)],
        [(0, 1, 5), (1, 1, 7), (2, 1.5, 10), (3.5, .5, 9)],
        [(0, 3, 8)],
    ],
    # tension: only the contour of the theme's head, in fourths, always stopping on the 2nd or 4th
    'T': [
        [(0, 1, 1), (1, 1, 4), (2, 1.5, 7), (3.5, .5, 8)],
        [(0, 3, 8)],
        [(0, 1, 5), (1, 1, 7), (2, 1.5, 9), (3.5, .5, 10)],
        [(0, 3, 10)],
        [(0, 1, 4), (1, 1, 7), (2, 1.5, 8), (3.5, .5, 11)],
        [(0, 3, 10)],
        [(0, 1.5, 10), (1.5, .5, 9), (2, 1, 8), (3, 1, 7)],
        [(0, 3, 8)],
    ],
}


def _c(pcs, bass=None, add=None, dom=False):
    return {'pcs': tuple(pcs), 'bass': pcs[0] if bass is None else bass, 'add': add, 'dom': dom}


# pitch classes relative to the tonic: (root, third or sus, fifth[, seventh]); add = colour tone
CHORDS = {
    'maj': {
        'I': _c((0, 4, 7), add=2), 'I6': _c((0, 4, 7), bass=4), 'V6': _c((7, 11, 2), bass=11),
        'vi': _c((9, 0, 4), add=7), 'IV': _c((5, 9, 0), add=7), 'IVM7': _c((5, 9, 0, 4)),
        'ii7': _c((2, 5, 9, 0)), 'Vsus4': _c((7, 0, 2)), 'V': _c((7, 11, 2), dom=True),
        'V7': _c((7, 11, 2, 5), dom=True),
    },
    'min': {
        'I': _c((0, 3, 7), add=2), 'I6': _c((0, 3, 7), bass=3), 'V6': _c((7, 10, 2), bass=10),
        'vi': _c((8, 0, 3), add=7), 'IV': _c((5, 8, 0)), 'ii7': _c((2, 5, 8, 0)),
        'Vsus4': _c((7, 0, 2)), 'V': _c((7, 11, 2), dom=True), 'V7': _c((7, 11, 2, 5), dom=True),
    },
    'sus': {
        'I': _c((0, 2, 7)), 's2': _c((0, 2, 7)), 's4': _c((0, 5, 7)), 'b6': _c((8, 10, 3), bass=0),
        's4g': _c((5, 7, 0), bass=0), 'v4': _c((7, 0, 2)), 'v74': _c((7, 0, 2, 5)),
    },
}

PROG = {
    'maj': {
        'A': [['I'], ['V6'], ['vi'], ['IV'], ['I6'], ['IV'], ['ii7'], [(0, 'Vsus4'), (2, 'V')]],
        'A2': [['I'], ['V6'], ['vi'], ['IV'], ['I6'], [(0, 'IV'), (2, 'ii7')], [(0, 'Vsus4'), (2, 'V7')], ['I']],
        'B': [['IV'], ['I6'], ['ii7'], ['V'], ['IV'], ['I6'], ['ii7'], [(0, 'Vsus4'), (2, 'V')]],
    },
    'min': {
        'A': [['I'], ['V6'], ['vi'], ['IV'], ['I6'], ['IV'], ['vi'], [(0, 'Vsus4'), (2, 'V')]],
        'A2': [['I'], ['V6'], ['vi'], ['IV'], ['I6'], [(0, 'IV'), (2, 'ii7')], [(0, 'Vsus4'), (2, 'V7')], ['I']],
        'B': [['IV'], ['I6'], ['ii7'], ['V'], ['IV'], ['I6'], ['vi'], [(0, 'Vsus4'), (2, 'V')]],
    },
    'sus': {
        'T': [['s2'], ['s4'], ['b6'], ['s4g'], ['s2'], ['b6'], ['v4'], ['v74']],
    },
}

# key = tonic pitch class, base = MIDI note of scale degree 0 of the melody
MOODS = {
    'sweet': dict(bpm=84, key=5, base=65, mode='maj', swing=0.5, lead='celesta', comp='piano', trim=-1.0),
    'flutter': dict(bpm=96, key=7, base=67, mode='maj', swing=0.5, lead='celesta', comp='pluck', trim=-0.6),
    'comic': dict(bpm=112, key=0, base=72, mode='maj', swing=0.6, lead='mallet', comp='pluck', trim=3.1),
    'calm': dict(bpm=72, key=10, base=58, mode='maj', swing=0.5, lead='piano', comp='piano', trim=2.4),
    'sad': dict(bpm=66, key=2, base=62, mode='min', swing=0.5, lead='piano', comp='piano', trim=3.2),
    'tension': dict(bpm=100, key=2, base=62, mode='sus', swing=0.5, lead='piano', comp='pluck', trim=2.7),
    'bright': dict(bpm=92, key=7, base=67, mode='maj', swing=0.5, lead='piano', comp='piano', trim=0.0),
}
# stem balance per mood, dB by role (roles not listed: 0)
MIX = {
    'sweet': {'pad': -0.5},
    'flutter': {'comp': 3.5, 'bass': -1.0, 'pad': 2.0, 'perc': 8.0, 'fill': 2.0},
    'comic': {'comp': -1.0, 'bass': -3.0, 'perc': 4.5},
    'calm': {'mel': 1.0, 'comp': -2.0, 'pad': -5.0, 'bass': -2.5},
    'sad': {'comp': -1.0, 'pad': -1.0},
    'tension': {'pulse': -2.0, 'pad': -2.0, 'perc': -5.5, 'bass': -4.0},
    'bright': {'comp': -2.0, 'bass': -2.5, 'perc': -1.5},
}
SILENT_MOODS = ('none', 'silence', 'off')
MIN_SEGMENT_S = 1.6
DYN = (0.92, 0.95, 1.0, 0.95, 1.06, 1.03, 0.97, 0.90)


def mood_scale(mood):
    return MAJOR if MOODS[mood]['mode'] == 'maj' else MINOR


def deg_to_midi(deg, base, scale, raised=False):
    o, i = divmod(int(deg), 7)
    return base + 12 * o + scale[i] + (1 if (raised and i == 6) else 0)


def nearest_pitch(pc, target, lo, hi):
    c = [p for p in range(lo, hi + 1) if p % 12 == pc % 12]
    if not c:
        c = [p for p in range(lo - 6, hi + 7) if p % 12 == pc % 12]
    return min(c, key=lambda p: (abs(p - target), p))


def _voicing_search(pcs, lo, hi, n, prev, center, pull):
    cands = [p for p in range(lo, hi + 1) if p % 12 in pcs]
    best, bc = None, 1e9
    for combo in combinations(cands, n):
        if len({p % 12 for p in combo}) < len(pcs):
            continue
        gaps = [b - a for a, b in zip(combo, combo[1:])]
        if min(gaps) < 2 or max(gaps) > 9 or combo[-1] - combo[0] > 17:
            continue
        if any(g == 2 and a < 57 for a, g in zip(combo, gaps)):              # no seconds down low
            continue
        if any(g1 == 2 and g2 == 2 for g1, g2 in zip(gaps, gaps[1:])):       # no three-note clusters
            continue
        cost = pull * abs(sum(combo) / n - center)
        cost += sum((1.5 if a >= 62 else 6.0) for a, g in zip(combo, gaps) if g == 2)
        if combo[0] < 55 and gaps[0] < 4:
            cost += 2.0
        if prev and len(prev) == n:
            cost += sum(abs(a - b) for a, b in zip(combo, prev))
        elif prev:
            cost += abs(combo[-1] - prev[-1]) + abs(combo[0] - prev[0])
        if cost < bc - 1e-9:
            best, bc = combo, cost
    return list(best) if best else None


def choose_voicing(pcs, lo, hi, n, prev=None, center=None, pull=0.35):
    """Pick n ascending pitches in [lo, hi] covering the chord's pitch classes, as close as
    possible to the previous voicing (voice leading), with no muddy or cramped spacing. With more
    pitch classes than voices the root is left to the bass. Returns None when nothing fits."""
    pcs = list(dict.fromkeys(p % 12 for p in pcs))
    if len(pcs) > n:
        pcs = pcs[1:][:n]
    if center is None:
        center = (lo + hi) / 2.0
    for dlo, dhi in ((0, 0), (-3, 0), (-5, 0), (-5, 2), (-7, 4)):
        v = _voicing_search(pcs, lo + dlo, hi + dhi, n, prev, center, pull)
        if v:
            return v
    return None


class Bar:
    __slots__ = ('kind', 'phrase', 'idx', 'rep', 'nbeats', 'chords', 'mel', 'b0', 'next_mood', 'last', 'spans')

    def __init__(self, kind, nbeats=4, phrase='', idx=0, rep=0, chords=(), mel=(), next_mood=None):
        self.kind, self.nbeats, self.phrase, self.idx, self.rep = kind, nbeats, phrase, idx, rep
        self.chords, self.mel, self.next_mood = list(chords), list(mel), next_mood
        self.b0, self.last, self.spans = 0.0, False, []


def phrase_bars(mood, phrase, rep, lo=0, hi=8):
    mode = MOODS[mood]['mode']
    prog = PROG[mode][phrase]
    out = []
    for i in range(lo, hi):
        chords = [(c if isinstance(c, tuple) else (0, c)) for c in prog[i]]
        if mood == 'flutter' and i == 0 and phrase in ('A', 'A2'):
            chords = [(0, 'IVM7')]          # floating re-harmonisation of the head
        out.append(Bar('theme', 4, phrase, i, rep, chords, THEME[phrase][i]))
    return out


def _cycle(mood):
    return ('T', 'T', 'T', 'T') if MOODS[mood]['mode'] == 'sus' else ('A', 'A2', 'B', 'A2')


def layout_open(mood, nb, next_mood, heard):
    """Bars of a segment that hands over to another mood: theme from bar 1, then a pivot bar of
    2-5 beats (dominant of the next key) that ends exactly on the change."""
    cyc = _cycle(mood)
    if next_mood is None:
        pivot, content = 0, nb
    else:
        pivot = {0: 4, 1: 5, 2: 2, 3: 3}[nb % 4]
        content = nb - pivot
        if content == 0 and nb >= 4:
            pivot, content = nb - 2, 2
    nfull, rem = divmod(content, 4)
    bars = _forward_bars(mood, nfull, heard)
    if rem:
        b = phrase_bars(mood, cyc[(nfull // 8) % 4], nfull // 8 + heard, nfull % 8, nfull % 8 + 1)[0]
        b.nbeats = rem
        bars.append(b)
    if pivot:
        bars.append(Bar('pivot', pivot, next_mood=next_mood))
    return bars


def _forward_bars(mood, nfull, heard):
    cyc = _cycle(mood)
    bars = []
    for j in range(nfull):
        bars += phrase_bars(mood, cyc[(j // 8) % 4], j // 8 + heard, j % 8, j % 8 + 1)
    return bars


def layout_final(mood, nb, heard):
    """Bars of the last segment: the theme from bar 1, and the bar before the end card is always a
    cadence (Vsus4 - V7 with the 4-3 suspension in the melody) that absorbs left-over beats as a
    broadened dominant. If the consequent would have closed one bar early, that bar becomes a plagal
    IV under the held tonic so the music still moves into the final chord."""
    sus = MOODS[mood]['mode'] == 'sus'
    n, r = divmod(nb, 4)
    bars = []
    if n == 0:
        b = Bar('theme', r, 'T' if sus else 'A2', 6, heard, [(0, 'v74' if sus else 'V7')], [(0, r, 8)])
        bars.append(b)
    else:
        bars = _forward_bars(mood, n, heard)
        last = bars[-1]
        rep = last.rep
        if sus:
            if last.idx == 7:
                cad = Bar('theme', 4 + r, 'T', 7, rep, [(0, 'v74')], [(0, 3 + r, 8)])
            else:
                cad = Bar('theme', 4 + r, 'T', 6, rep, [(0, 'v4'), (2, 'v74')],
                          [(0, 1.5, 10), (1.5, .5, 9), (2, 1, 8), (3, 1 + r, 7)])
        elif last.phrase == 'A2' and last.idx == 7:
            cad = Bar('theme', 4 + r, 'A2', 7, rep, [(0, 'IV')], [(0, 3 + r, 7)])
        else:
            cad = Bar('theme', 4 + r, 'A2', 6, rep, [(0, 'Vsus4'), (2, 'V7')],
                      [(0, 1.5, 8), (1.5, .5, 7), (2, 1, 6), (3, 1 + r, 8)])
        bars[-1] = cad
    bars[-1].last = True
    bars.append(Bar('end', 4))
    return bars


class Segment:
    def __init__(self, index, mood, t0, t1, bars, final, total):
        self.index, self.mood, self.t0, self.t1, self.final, self.total = index, mood, t0, t1, final, total
        self.cfg = MOODS[mood]
        self.bars = bars
        b = 0.0
        for bar in bars:
            bar.b0 = b
            if bar.kind != 'end':
                b += bar.nbeats
            ch = bar.chords
            bar.spans = [(c[0], (ch[i + 1][0] if i + 1 < len(ch) else bar.nbeats) - c[0], c[1])
                         for i, c in enumerate(ch) if c[0] < bar.nbeats]
        self.nbeats = b
        nq = int(round(b * 4))
        w = np.ones(max(nq, 1))
        if final and nq >= 16:                       # slight ritardando into the last chord
            w[-16:] *= 1.0 + 0.24 * (np.arange(16) / 15.0) ** 1.6
        w *= (t1 - t0) / w.sum()
        self.spb = (t1 - t0) / max(b, 1e-9)
        ext = np.full(64, w[-1])
        self.qt = t0 + np.concatenate([[0.0], np.cumsum(np.concatenate([w, ext]))])

    @property
    def bpm(self):
        return 60.0 / self.spb

    def time(self, bar, beat):
        x = (bar.b0 + beat) * 4.0
        if x <= 0:
            return self.t0 + x * (self.qt[1] - self.qt[0])
        i = min(int(x), len(self.qt) - 2)
        return float(self.qt[i] + (x - i) * (self.qt[i + 1] - self.qt[i]))


def plan_music(music, t_end, total):
    """timeline.audio.music -> list of Segments (and silent gaps). The bar line of every change is
    put on the requested time by bending the outgoing tempo (at most 5 %)."""
    req = []
    last_mood = 'sweet'
    for m in sorted((m for m in (music or []) if isinstance(m, dict)), key=lambda m: float(m.get('t', 0.0))):
        mood = m.get('mood')
        t = max(0.0, float(m.get('t', 0.0)))
        if mood in SILENT_MOODS:
            mood = None
        elif mood not in MOODS:
            warn('unknown mood %r at t=%.2f -> %s' % (mood, t, last_mood))
            mood = last_mood
        if mood:
            last_mood = mood
        if t > t_end - MIN_SEGMENT_S:
            if mood is not None:
                warn('mood change to %r at t=%.2f is too close to the end card, ignored' % (mood, t))
            continue
        if req and t - req[-1][0] < MIN_SEGMENT_S:
            warn('mood segment at t=%.2f shorter than %.1f s, replaced by %r' % (req[-1][0], MIN_SEGMENT_S, mood))
            req[-1] = (req[-1][0], mood)
        else:
            req.append((t, mood))
        while len(req) >= 2 and req[-1][1] == req[-2][1]:
            req.pop()
    while req and req[-1][1] is None:
        req.pop()
    segs, keys = [], []
    if not req:
        return segs, keys
    cur = req[0][0]
    heard = {}
    for i, (_, mood) in enumerate(req):
        final = i == len(req) - 1
        t_next = t_end if final else req[i + 1][0]
        if mood is None:
            cur = t_next
            continue
        cfg = MOODS[mood]
        spb0 = 60.0 / cfg['bpm']
        length = t_next - cur
        nb = max(2, int(round(length / spb0)))
        nb4 = 4 * int(round(length / (4.0 * spb0)))
        if nb4 >= 4 and abs(length / nb4 / spb0 - 1.0) <= (0.06 if final else 0.045):
            nb = nb4                                  # whole bars when a small tempo bend allows it
        if final:
            t1 = t_end
            bars = layout_final(mood, nb, heard.get(mood, 0))
        else:
            spb = min(1.05, max(0.95, length / nb / spb0)) * spb0
            t1 = cur + nb * spb
            bars = layout_open(mood, nb, req[i + 1][1], heard.get(mood, 0))
        seg = Segment(len(segs), mood, cur, t1, bars, final, total)
        segs.append(seg)
        keys.append((cur, cfg['key'], cfg['mode']))
        heard[mood] = heard.get(mood, 0) + 1
        cur = t1
    return segs, keys


# --------------------------------------------------------------------------------------------
# arrangers: bars -> note events
# --------------------------------------------------------------------------------------------

class Arr:
    """Collects note events for one segment. An event is
    (time s, instrument, midi (or variant for percussion), dur s, velocity, pan, gain, role, segment)."""

    def __init__(self, seg, events):
        self.seg, self.cfg, self.ev = seg, seg.cfg, events
        self.rng = _rng('arr', seg.index, seg.mood, round(seg.t0, 3))
        self.key = seg.cfg['key']
        self.scale = mood_scale(seg.mood)
        self.prev_v = {}
        self.prev_bass = {}
        trim = seg.cfg['trim']
        self.gains = {r: from_db(trim + d) for r, d in MIX[seg.mood].items()}
        self.gain = from_db(trim)

    def t(self, bar, beat):
        sw = self.cfg['swing']
        if sw != 0.5 and abs((beat % 1.0) - 0.5) < 1e-6:
            beat += sw - 0.5
        return self.seg.time(bar, beat)

    def _jit(self, sd):
        return float(np.clip(self.rng.normal(0.0, sd), -2.5 * sd, 2.5 * sd)) if sd > 0 else 0.0

    def note(self, inst, bar, beat, dur, midi, vel, role='comp', pan=None, human=0.004, late=0.0):
        t0 = self.t(bar, beat)
        d = max(0.04, self.t(bar, beat + dur) - t0)
        self.put(inst, t0 + late + self._jit(human), d, midi, vel, role, pan)

    def put(self, inst, t, dur, midi, vel, role='comp', pan=None):
        v = min(1.0, max(0.05, vel * (1.0 + self._jit(0.04))))
        self.ev.append((max(0.0, t), inst, midi, dur, v, pan, self.gains.get(role, self.gain), role, self.seg.index))

    def hit(self, kind, bar, beat, vel, var=0, human=0.002):
        v = min(1.0, max(0.05, vel * (1.0 + self._jit(0.06))))
        self.ev.append((max(0.0, self.t(bar, beat) + self._jit(human)), kind, var, 0.0, v, None,
                        self.gains.get('perc', self.gain), 'perc', self.seg.index))

    def chord(self, name):
        return CHORDS[self.cfg['mode']][name]

    def pcs(self, ch, rich=False):
        p = [(self.key + x) % 12 for x in ch['pcs']]
        if rich and ch['add'] is not None:
            p.append((self.key + ch['add']) % 12)
        return p

    def bass_pitch(self, ch, lo, hi, slot='bass'):
        p = nearest_pitch(self.key + ch['bass'], self.prev_bass.get(slot, (lo + hi) / 2.0), lo, hi)
        self.prev_bass[slot] = p
        return p

    def voicing(self, ch, lo, hi, n=3, rich=False, slot='v', center=None, pull=0.35, bar=None):
        """Voice-led chord in [lo, hi]; with `bar`, kept below that bar's lowest melody note so a
        passing dissonance is never a bare minor second against the accompaniment."""
        if bar is not None and bar.mel:
            floor = min(m for _, _, m in self.melody(bar))
            hi = max(lo + 9, min(hi, floor - 2))
        v = None
        if rich and ch['add'] is not None and n >= 4:
            v = choose_voicing(self.pcs(ch, True), lo, hi, 4, self.prev_v.get(slot), center, pull)
        if v is None:
            pcs = self.pcs(ch)
            v = choose_voicing(pcs, lo, hi, min(n, len(pcs)), self.prev_v.get(slot), center, pull)
        if v is None:                          # cannot happen with the chords above; stay safe
            v = sorted(nearest_pitch(pc, (lo + hi) // 2, lo, hi) for pc in self.pcs(ch)[:3])
        self.prev_v[slot] = v
        return v

    def tone_above(self, ch, floor, rich=False):
        pcs = set(self.pcs(ch, rich))
        p = int(math.ceil(floor))
        while p % 12 not in pcs:
            p += 1
        return p

    def fifth_of(self, ch, near, lo, hi):
        """A second bass note: the chord's fifth (the root when the chord is inverted)."""
        pc = ch['pcs'][2] if ch['bass'] == ch['pcs'][0] else ch['pcs'][0]
        return nearest_pitch(self.key + pc, near, lo, hi)

    def melody(self, bar, thin=False):
        """(beat, beats, midi) of the bar's melody in this mood's key and mode."""
        out = []
        for b, d, deg in bar.mel:
            if b >= bar.nbeats:
                continue
            d = min(d, bar.nbeats - b)
            raised = False
            if self.cfg['mode'] == 'min':
                for s0, sl, name in bar.spans:
                    if s0 <= b < s0 + sl:
                        raised = self.chord(name)['dom']
            m = deg_to_midi(deg, self.cfg['base'], self.scale, raised)
            if thin and d <= 0.5 and out:
                pb, pd, pm = out[-1]
                out[-1] = (pb, pd + d, pm)
                continue
            out.append((b, d, m))
        return out

    def pad(self, bar, b0, ln, pitches, vel):
        for p in pitches:
            self.note('pad', bar, b0, ln, p, vel, 'pad', human=0.0)


def _arp_order(nn, ne):
    if ne == 4:
        return [0, 1, 2, 3] if nn == 4 else [0, 2, 3, 4]
    base = [0, 1, 2, 3, 2, 1, 2, 1] if nn == 4 else [0, 1, 2, 3, 4, 3, 2, 3]
    return [base[i % 8] for i in range(ne)]


def arr_sweet(A, bar):
    dyn = DYN[bar.idx]
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        bass = A.bass_pitch(ch, 36, 47)
        A.note('bass', bar, b0, min(ln, 3.6), bass, 0.50, 'bass')
        v = A.voicing(ch, 55, 69, 4, rich=True, bar=bar)
        n0 = bass + 12
        while n0 >= v[0] - 1:
            n0 -= 12
        notes = [n0] + v
        ne = int(round(ln * 2))
        for e, i in enumerate(_arp_order(len(notes), ne)):
            vel = (0.46 if e == 0 else 0.31 + 0.05 * i / len(notes) + (0.03 if e % 2 == 0 else 0.0)) * dyn
            A.note('piano', bar, b0 + e * 0.5, min(ln - e * 0.5 + 0.1, 2.5), notes[i], vel)
        A.pad(bar, b0, ln, A.voicing(ch, 53, 67, 3, slot='pad', bar=bar), 0.27 + 0.05 * min(bar.rep, 1))
    for b, d, m in A.melody(bar):
        A.note('celesta', bar, b, d + 0.25, m, 0.62 * dyn, 'mel')
        A.note('musicbox', bar, b, d, m + 12, (0.42 if bar.rep >= 1 else 0.30) * dyn, 'mel2')


def arr_flutter(A, bar):
    dyn = 0.86 + 0.028 * bar.idx
    full = bar.rep >= 1 or bar.idx >= 4
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        bass = A.bass_pitch(ch, 43, 54)
        A.note('bass', bar, b0, 0.9, bass, 0.40, 'bass')
        if ln >= 4:
            A.note('bass', bar, b0 + 2, 0.9, A.fifth_of(ch, bass, 43, 57), 0.34, 'bass')
        v = A.voicing(ch, 59, 76, 3, center=64.0 + 0.6 * bar.idx, pull=1.3, bar=bar)
        for e in range(int(round(ln * 2))):
            p = (v[0], v[2], v[1], v[2])[e % 4]
            A.note('pluck', bar, b0 + e * 0.5, 0.36, p, (0.42 if e % 2 == 0 else 0.31) * dyn)
        A.pad(bar, b0, ln, v, 0.22 + 0.012 * bar.idx)
    for b, d, m in A.melody(bar):
        A.note('celesta', bar, b, d + 0.25, m, 0.60 * dyn, 'mel')
        if full:
            A.note('musicbox', bar, b, d, m + 12, 0.38 * dyn, 'mel2')
    if full:
        for b in range(bar.nbeats):
            A.hit('shaker', bar, b + 0.5, 0.42, var=b % 3)
    if bar.kind == 'theme' and bar.idx == 7 and bar.phrase in ('A', 'B') and bar.nbeats == 4:
        for j, deg in enumerate((4, 6, 8, 11)):          # rising run into the next phrase
            A.note('pluck', bar, 3.0 + 0.25 * j, 0.3, deg_to_midi(deg, A.cfg['base'], A.scale), 0.30 + 0.05 * j, 'fill')


def arr_comic(A, bar):
    walk = bar.kind == 'theme' and bar.idx == 7 and bar.phrase in ('A', 'B') and bar.nbeats == 4
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        root = A.bass_pitch(ch, 36, 48)
        A.note('bass', bar, b0, 0.55, root, 0.52, 'bass')
        if ln >= 4:
            A.note('bass', bar, b0 + 2, 0.55, A.fifth_of(ch, root, 36, 50), 0.46, 'bass')
        v = A.voicing(ch, 52, 65, 3)
        for o in ((1, 3) if ln >= 4 else (1,)):
            if o < ln:
                for p in v:
                    A.note('pluck', bar, b0 + o, 0.3, p, 0.36)
                A.hit('wood', bar, b0 + o, 0.36, var=int(b0 + o) % 3)
    if walk:                                              # so - la - ti walk-up into the next phrase
        g = A.prev_bass.get('bass', 43)
        A.note('bass', bar, 3.0, 0.45, g + 2, 0.44, 'bass')
        A.note('bass', bar, 3.5, 0.45, g + 4, 0.48, 'bass')
        A.prev_bass['bass'] = g + 4
    for e in range(bar.nbeats * 2):
        A.hit('shaker', bar, e * 0.5, 0.44 if e % 2 else 0.30, var=e % 3)
    for b, d, m in A.melody(bar):
        A.note('mallet', bar, b, min(d, 0.45), m, 0.64, 'mel')
        A.note('pluck', bar, b, min(d, 0.40), m, 0.40, 'mel2')
        if d >= 1.5 and b >= 1 and b % 1.0 == 0:          # chromatic grace note from below
            A.put('mallet', A.t(bar, b) - 0.085, 0.08, m - 1, 0.36, 'grace')
        if d >= 2:                                        # bouncing echo on the off-beat
            A.note('mallet', bar, b + 1.5, 0.3, m, 0.36, 'echo')


def arr_calm(A, bar):
    dyn = DYN[bar.idx]
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        p0 = A.bass_pitch(ch, 39, 50)
        A.note('bass', bar, b0, ln * 0.95, p0, 0.36, 'bass')
        v = A.voicing(ch, 53, 65, 3, bar=bar)
        A.pad(bar, b0, ln, v, 0.36)
        p1 = A.tone_above(ch, p0 + 6)
        p2 = A.tone_above(ch, p1 + 3)
        A.note('piano', bar, b0, ln + 0.1, p0, 0.40 * dyn)
        if ln >= 2:
            A.note('piano', bar, b0 + 1, ln - 0.9, p1, 0.30 * dyn)
        if ln >= 3:
            A.note('piano', bar, b0 + 2, ln - 1.9, p2, 0.33 * dyn)
        if ln >= 4 and bar.rep >= 1:
            A.note('piano', bar, b0 + 3, 1.1, A.tone_above(ch, p2 + 3, True), 0.26 * dyn)
    for b, d, m in A.melody(bar, thin=True):
        A.note('piano', bar, b, d + 0.2, m, 0.54 * dyn, 'mel', human=0.007)
        if bar.rep >= 1 and d >= 1.5:
            A.note('celesta', bar, b, d, m + 12, 0.24, 'mel2')


def arr_sad(A, bar):
    dyn = DYN[bar.idx]
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        p0 = A.bass_pitch(ch, 41, 52)
        p1 = A.tone_above(ch, p0 + 6)
        p2 = A.tone_above(ch, p1 + 3)
        for o, p, vel in ((0, p0, 0.38), (1, p1, 0.28), (2, p2, 0.32), (3, p1, 0.26)):
            if o < ln:
                A.note('piano', bar, b0 + o, ln - o + 0.1, p, vel * dyn, human=0.008)
        v = A.voicing(ch, 53, 65, 3, bar=bar)
        A.pad(bar, b0, ln, v, 0.21)
    for b, d, m in A.melody(bar):
        A.note('piano', bar, b, d + 0.2, m, 0.56 * dyn, 'mel', human=0.009, late=0.012)
        if bar.rep >= 1 and d >= 2:                       # a music-box memory an octave up
            A.note('celesta', bar, b + 1.0, 1.5, m + 12, 0.24, 'mel2')


def arr_tension(A, bar):
    acc = (0.52, 0.30, 0.38, 0.30, 0.46, 0.30, 0.38, 0.33)
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        ped = A.bass_pitch(ch, 43, 54, 'ped')
        for e in range(int(round(ln * 2))):
            A.note('mute', bar, b0 + e * 0.5, 0.4, ped, acc[e % 8], 'pulse', human=0.002)
        if bar.idx % 2 == 0 or bar.kind != 'theme':
            A.note('bass', bar, b0, 7.5 if bar.kind == 'theme' else ln, A.bass_pitch(ch, 38, 49), 0.44, 'bass')
        v = A.voicing(ch, 57, 71, 3, bar=bar)
        A.pad(bar, b0, ln, v, 0.34)
    A.hit('kick', bar, 0.0, 0.50)                         # a held-breath heartbeat
    if bar.nbeats >= 2:
        A.hit('kick', bar, 0.55, 0.30)
    if bar.rep >= 1:
        for b in (1, 3):
            if b < bar.nbeats:
                A.hit('rim', bar, b, 0.22, var=b)
    for b, d, m in A.melody(bar):
        A.note('piano', bar, b, d + 0.25, m, 0.50, 'mel')
        if bar.rep >= 1 and d >= 1:
            A.note('celesta', bar, b + 1.0, 1.0, m + 12, 0.22, 'mel2')


def arr_bright(A, bar):
    dyn = DYN[bar.idx]
    nb = bar.nbeats
    for base in range(0, nb, 4):
        for b, vel in ((0, 0.62), (1.5, 0.38), (2, 0.52)) + (((3.5, 0.33),) if bar.idx % 2 == 1 else ()):
            if base + b < nb:
                A.hit('kick', bar, base + b, vel)
        for b in (1, 3):
            if base + b < nb:
                A.hit('rim', bar, base + b, 0.44, var=b % 2)
                A.hit('brush', bar, base + b, 0.30)
    for e in range(nb * 2):
        A.hit('hat', bar, e * 0.5, 0.42 if e % 2 else 0.28, var=e % 3)
    if bar.kind == 'theme' and bar.idx == 7 and nb == 4:
        A.hit('brush', bar, 3.5, 0.22)
        A.hit('brush', bar, 3.75, 0.28)
    for b0, ln, name in bar.spans:
        ch = A.chord(name)
        root = A.bass_pitch(ch, 40, 51)
        A.note('bass', bar, b0, 1.2 if ln >= 4 else 0.9, root, 0.55, 'bass')
        if ln >= 2:
            A.note('bass', bar, b0 + 1.5, 0.45, root, 0.40, 'bass')
        if ln >= 4:
            A.note('bass', bar, b0 + 2, 0.9, A.fifth_of(ch, root, 40, 54), 0.46, 'bass')
            A.note('bass', bar, b0 + 3.5, 0.45, root, 0.38, 'bass')
        v = A.voicing(ch, 55, 69, 4, rich=True, bar=bar)
        for o, d, vel in ((0, 1.3, 0.42), (1.5, 0.9, 0.34)) + (((3, 0.9, 0.36),) if ln >= 4 else ()):
            if o < ln:
                for j, p in enumerate(v):
                    A.note('piano', bar, b0 + o, min(d, ln - o + 0.05), p, vel, late=0.008 * j)
        A.pad(bar, b0, ln, A.voicing(ch, 53, 67, 3, slot='pad', bar=bar), 0.26)
    for b, d, m in A.melody(bar):
        A.note('piano', bar, b, d + 0.2, m, 0.66 * dyn, 'mel')
        A.note('piano', bar, b, d + 0.2, m - 12, 0.42 * dyn, 'mel2')
        if bar.rep >= 1:
            A.note('celesta', bar, b, d, m + 12, 0.30 * dyn, 'mel2')


ARRANGERS = {'sweet': arr_sweet, 'flutter': arr_flutter, 'comic': arr_comic, 'calm': arr_calm,
             'sad': arr_sad, 'tension': arr_tension, 'bright': arr_bright}


def first_melody_note(mood):
    cfg = MOODS[mood]
    ph = 'T' if cfg['mode'] == 'sus' else 'A'
    return deg_to_midi(THEME[ph][0][0][2], cfg['base'], mood_scale(mood))


def arr_pivot(A, bar):
    """Dominant preparation of the NEXT mood's key: V7sus4, a rising arpeggio, and a two-note
    lead-in (5th of V, then the step above the new melody's first note)."""
    nxt = MOODS[bar.next_mood]
    nk, nb = nxt['key'], bar.nbeats
    pcs = [(nk + 7) % 12, nk % 12, (nk + 2) % 12, (nk + 5) % 12]
    bass = nearest_pitch(pcs[0], A.prev_bass.get('bass', 43), 36, 50)
    A.note('bass', bar, 0, nb - 0.25, bass, 0.44, 'bass')
    v = choose_voicing(pcs, 53, 69, 4, A.prev_v.get('v')) or sorted(nearest_pitch(pc, 61, 53, 69) for pc in pcs)
    A.pad(bar, 0, nb, v, 0.26)
    seq = v + [p + 12 for p in v]
    comp = A.cfg['comp']
    ne = nb * 2
    for e in range(ne):
        p = seq[min(7, int(e * 8 / ne))] if ne > 8 else seq[e + (8 - ne) // 2 if ne < 8 else e]
        dur = (nb - e * 0.5 + 0.2) if comp == 'piano' else 0.45
        A.note(comp, bar, e * 0.5, min(dur, 2.5), p, 0.30 + 0.12 * e / ne)
    m0 = first_melody_note(bar.next_mood)
    scale = mood_scale(bar.next_mood)
    pick = m0 + 1
    while (pick - nk) % 12 not in scale:
        pick += 1
    hold = nearest_pitch(nk + 2, pick - 2, pick - 9, pick + 5)
    lead = A.cfg['lead']
    if lead == 'mallet':
        for b in range(nb - 1):
            A.note(lead, bar, b, 0.4, hold, 0.50 - 0.04 * (b % 2), 'mel')
    else:
        A.note(lead, bar, 0, nb - 1 + 0.3, hold, 0.50, 'mel')
    A.note(lead, bar, nb - 1, 1.0, pick, 0.52, 'mel')


def arr_end(A, bar):
    """The soft ending chord on the end card: tonic (add9), rolled upwards, ringing to the end."""
    t = A.seg.time(bar, 0.0)
    ring = max(0.6, A.seg.total - t)
    mode, key = A.cfg['mode'], A.key
    third = {'maj': 4, 'min': 3}.get(mode)
    pcs = [key % 12, (key + (third if third is not None else 7)) % 12, (key + 7) % 12, (key + 2) % 12]
    bass = nearest_pitch(key, A.prev_bass.get('bass', 41), 36, 47)
    A.put('bass', t, min(ring, 2.4), bass, 0.50, 'bass')
    pcs = list(dict.fromkeys(pcs))
    v = choose_voicing(pcs, 53, 69, len(pcs), A.prev_v.get('v')) or sorted(nearest_pitch(pc, 61, 53, 69) for pc in pcs)
    for p in v:
        A.put('pad', t, max(0.3, ring - 0.9), p, 0.30, 'pad')
    for i, p in enumerate([bass + 12] + v):
        A.put('piano', t + 0.075 * i, ring, p, 0.44 - 0.02 * i, 'comp')
    do = A.cfg['base'] + 12
    lead = A.cfg['lead'] if A.cfg['lead'] != 'mallet' else 'celesta'
    A.put(lead, t, ring, do, 0.58, 'mel')
    top = nearest_pitch(key, 78, 72, 84)
    if lead != 'celesta' or top != do:
        A.put('celesta', t + 0.02, ring, top, 0.46, 'mel2')
    A.put('musicbox', t + 0.42, ring, top + 7, 0.34, 'mel2')
    A.put('musicbox', t + 0.84, ring, top + 12, 0.30, 'mel2')


def arrange(segs):
    """Segments -> one sorted event list. Notes of an outgoing segment are released at its last bar
    line; their release tails and the reverb are the crossfade into the next mood."""
    events = []
    for seg in segs:
        ev = []
        A = Arr(seg, ev)
        fn = ARRANGERS[seg.mood]
        for bar in seg.bars:
            if bar.kind == 'pivot':
                arr_pivot(A, bar)
            elif bar.kind == 'end':
                arr_end(A, bar)
            else:
                fn(A, bar)
        if not seg.final:
            cut = seg.t1 + 0.03
            ev = [(e[0], e[1], e[2], min(e[3], max(0.04, cut - e[0])), *e[4:]) for e in ev if e[0] < seg.t1 - 0.01]
        events += ev
    events.sort(key=lambda e: (e[0], e[1], e[2]))
    return events


def render_events(events, n):
    """Mix note events into a dry and a reverb-send stereo bus."""
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))
    for t, inst, midi, dur, vel, pan, gain, _role, _seg in events:
        if inst in PERC_GAIN:
            w = perc(inst, midi)
            g, sd, pan0 = PERC_GAIN[inst]
            amp = g * vel ** 1.3 * gain
        else:
            w = note_wave(inst, midi, dur, vel)
            _, g, sd, pan0 = INSTR[inst]
            amp = g * vel ** 1.4 * gain
        i0 = int(round(t * SR))
        if i0 >= n:
            continue
        m = min(len(w), n - i0)
        if w.ndim == 1:
            l, r = pan_gains(pan0 if pan is None else pan)
            x = w[:m] * amp
            dry[i0:i0 + m, 0] += x * l
            dry[i0:i0 + m, 1] += x * r
            send[i0:i0 + m, 0] += x * (l * sd)
            send[i0:i0 + m, 1] += x * (r * sd)
        else:
            x = w[:m] * amp
            dry[i0:i0 + m] += x
            send[i0:i0 + m] += x * sd
    return dry, send


@lru_cache(maxsize=None)
def reverb_ir(rt60=1.5, predelay=0.014, seed=1):
    """A small algorithmic room: a few early reflections plus a dense diffuse tail built from
    band-split noise with a shorter decay at the top and the bottom (warm, never metallic)."""
    n = int((rt60 * 1.25 + 0.1) * SR)
    t = _tb(n)
    out = np.zeros((n, 2))
    bands = ((150.0, 500.0, 0.90), (500.0, 2000.0, 1.00), (2000.0, 5000.0, 0.70), (5000.0, 9000.0, 0.38))
    for ch in range(2):
        r = _rng('ir', seed, ch)
        x = r.standard_normal(n)
        y = np.zeros(n)
        for lo_, hi_, k in bands:
            y += bp(x, lo_, hi_, 2) * np.exp(-6.91 * t / (rt60 * k)) * (1.0 if k >= 0.7 else 0.6)
        y *= 1.0 - np.exp(-t / 0.012)
        y /= math.sqrt(float(np.sum(y * y)))
        er = np.zeros(n)
        for j in range(7):
            d = 0.007 + 0.0063 * j * (1.0 + 0.17 * ch) + 0.002 * r.uniform()
            er[int(d * SR)] += (0.55 * 0.8 ** j) * (1 if (j + ch) % 3 else -1)
        er = lp(er, 5000.0, 1)
        er /= math.sqrt(float(np.sum(er * er)))
        z = 0.92 * y + 0.38 * er
        pd = int(predelay * SR)
        out[pd:, ch] = z[:n - pd]
    return _fade(out, 0, int(0.1 * SR))


def reverb(send, rt60=1.5, seed=1):
    ir = reverb_ir(rt60, 0.014, seed)
    n = len(send)
    out = np.empty_like(send)
    for ch in range(2):
        out[:, ch] = signal.fftconvolve(send[:, ch], ir[:, ch])[:n]
    return out


# --------------------------------------------------------------------------------------------
# SFX (soft and round; pitched ones follow the key of the music at that moment)
# --------------------------------------------------------------------------------------------

class SfxCtx:
    def __init__(self, typ, variant, dur, key, mode):
        self.typ, self.idx, self.dur, self.key, self.mode = typ, variant, dur, key, mode
        self.rng = _rng('sfx', typ, variant, dur)
        self.pent_pcs = [(key + x) % 12 for x in ((0, 2, 4, 7, 9) if mode == 'maj' else (0, 3, 5, 7, 10))]
        self.rel_major = key if mode == 'maj' else (key + 3) % 12

    def pent(self, i, around):
        """MIDI note of pentatonic step i (of the current key) nearest to `around`."""
        return nearest_pitch(self.pent_pcs[i % 5], around, int(around) - 7, int(around) + 7)

    def pent_run(self, start, count):
        """`count` ascending pentatonic notes starting at or above `start`."""
        out, p = [], int(start)
        while len(out) < count:
            if p % 12 in self.pent_pcs:
                out.append(p)
            p += 1
        return out


def _thump(f0, f1, tau, n, k=0.03):
    t = _tb(n)
    ph = TWO_PI * (f1 * t + (f0 - f1) * k * (1.0 - np.exp(-t / k)))
    return np.sin(ph) * np.exp(-t / tau)


def _place(buf, x, t0, g=1.0, pan=None):
    i0 = int(t0 * SR)
    m = min(len(x), len(buf) - i0)
    if m <= 0:
        return
    if buf.ndim == 1:
        buf[i0:i0 + m] += x[:m] * g
    elif x.ndim == 2:
        buf[i0:i0 + m] += x[:m] * g
    else:
        l, r = pan_gains(pan or 0.0)
        buf[i0:i0 + m, 0] += x[:m] * (g * l)
        buf[i0:i0 + m, 1] += x[:m] * (g * r)


def _tick(f=1900.0, tau=0.004):
    n = int(0.06 * SR)
    t = _tb(n)
    x = np.sin(TWO_PI * f * t) * np.exp(-t / tau) + 0.6 * np.sin(TWO_PI * f * 0.33 * t) * np.exp(-t / (tau * 3))
    return _fade(x, 12, 200)


def sfx_pop(c):
    f = mtof(c.pent((2, 4, 0, 3, 1)[c.idx % 5], 77))
    n = int(0.10 * SR)
    t = _tb(n)
    k = 0.012
    ph = TWO_PI * f * (0.74 * t + 0.46 * (t + k * (np.exp(-t / k) - 1.0)))       # quick rise: a soft "pop"
    x = np.sin(ph) * np.exp(-t / 0.020) + 0.2 * np.sin(2.0 * ph) * np.exp(-t / 0.010)
    return _fade(x, int(0.0015 * SR), int(0.02 * SR))


def sfx_pop2(c):
    f = mtof(c.pent((0, 3, 1, 4, 2)[c.idx % 5], 70))
    n = int(0.14 * SR)
    t = _tb(n)
    k = 0.02
    ph = TWO_PI * f * (1.25 * t - 0.45 * (t + k * (np.exp(-t / k) - 1.0)))       # falling "bloop"
    x = np.sin(ph) * np.exp(-t / 0.030) + 0.15 * np.sin(2.0 * ph) * np.exp(-t / 0.012)
    return _fade(x, int(0.002 * SR), int(0.03 * SR))


def _swish(c, d, f_of_u, env_of_u, width, pan_a, pan_b, top=6000.0):
    n = int(d * SR)
    u = np.linspace(0.0, 1.0, n)
    x = lp(_sweep_noise(c.rng, n, f_of_u(u), width) * env_of_u(u), top, 1)
    a = (pan_a + (pan_b - pan_a) * u + 1.0) * (math.pi / 4.0)
    return _fade(np.stack([x * np.cos(a), x * np.sin(a)], axis=1), 64, 512)


def sfx_whoosh(c):
    return _swish(c, c.dur or 0.45, lambda u: 320.0 * 2.0 ** (2.7 * np.sin(np.pi * u) ** 1.2),
                  lambda u: np.sin(np.pi * u) ** 1.6, 1.1, -0.55, 0.55)


def sfx_scroll(c):
    d = c.dur or 0.5
    y = _swish(c, d, lambda u: 1700.0 * 2.0 ** (-2.1 * u), lambda u: np.minimum(u / 0.18, 1.0) ** 1.5 * (1.0 - u) ** 1.3,
               0.9, 0.0, 0.0, 5000.0)
    th = _burst('bass', 320.0, 0.012, 1) * 0.5 * float(np.max(np.abs(y)))
    _place(y, th, d * 0.8, 1.0, 0.0)                                            # the page settles
    return y


def sfx_ding(c):
    return syn_celesta(nearest_pitch(c.key, 88, 82, 93), 0.08, 0.6, 'bell')[:int(1.3 * SR)].copy()


def sfx_elevatorDing(c):
    m = nearest_pitch(c.key + 7, 84, 78, 89)
    a, b = syn_celesta(m, 0.4, 0.7, 'bell'), syn_celesta(m + 0.05, 0.4, 0.5, 'bell')
    k = min(len(a), len(b), int(2.2 * SR))
    return _fade(a[:k] + 0.7 * b[:k], 0, 2000)                                    # two bars beating slowly


def sfx_sparkle(c):
    n = int(1.1 * SR)
    out = np.zeros((n, 2))
    notes = c.pent_run(nearest_pitch(c.key, 86, 80, 91), 7)
    order = (0, 2, 1, 3, 5, 4, 6)
    for j, i in enumerate(order):
        w = syn_celesta(notes[i], 0.04, 0.5, 'musicbox')[:int(0.55 * SR)].copy()
        _fade(w, 0, int(0.1 * SR))
        _place(out, w, 0.055 * j + 0.006 * c.rng.uniform(), 0.55 + 0.45 * j / 6.0, (-0.5, 0.5, -0.2, 0.3)[j % 4])
    t = _tb(n)
    sh = bp(c.rng.standard_normal(n), 6500.0, 10500.0, 2) * (1.0 - np.exp(-t / 0.08)) * np.exp(-t / 0.22)
    out += (0.03 * float(np.max(np.abs(out))) / max(1e-9, float(np.max(np.abs(sh))))) * sh[:, None]
    return _fade(out, 16, 2000)


def _heart(amp2=0.75):
    n = int(0.62 * SR)
    x = np.zeros(n)
    kn = _burst('bass', 260.0, 0.014, 2)
    lub = _thump(96.0, 54.0, 0.075, int(0.4 * SR)) + 0.35 * _thump(192.0, 108.0, 0.05, int(0.4 * SR))
    dub = _thump(112.0, 64.0, 0.055, int(0.3 * SR)) + 0.35 * _thump(224.0, 128.0, 0.04, int(0.3 * SR))
    _place(x, _fade(lub, 96, 400), 0.0)
    _place(x, kn, 0.0, 0.30)
    _place(x, _fade(dub, 96, 400), 0.27, amp2)
    _place(x, kn, 0.27, 0.22)
    return x


def sfx_heartbeat(c):
    return _heart()


def sfx_heartbeatLoop(c):
    d = c.dur or 4.0
    n = int(d * SR)
    x = np.zeros(n)
    h = _heart()
    t = 0.0
    while t < d - 0.3:
        _place(x, h, t)
        t += 0.80
    return _fade(x, int(0.05 * SR), int(min(0.5, d / 4) * SR))


def sfx_doorbell(c):
    hi_ = nearest_pitch(c.rel_major + 4, 76, 70, 81)
    n = int(2.2 * SR)
    x = np.zeros(n)
    _place(x, syn_celesta(hi_, 0.38, 0.6, 'bell'), 0.0)
    _place(x, syn_celesta(hi_ - 4, 0.5, 0.6, 'bell'), 0.44, 0.95)
    return _fade(x, 8, 4000)


def _knock(f, g=1.0):
    n = int(0.16 * SR)
    t = _tb(n)
    x = 0.9 * np.sin(TWO_PI * f * t) * np.exp(-t / 0.028) + 0.5 * np.sin(TWO_PI * 2.2 * f * t) * np.exp(-t / 0.016)
    x += 0.25 * np.sin(TWO_PI * 4.7 * f * t) * np.exp(-t / 0.007)
    b = _burst('felt', 1400.0, 0.004, 1)
    x[:len(b)] += 0.4 * b
    return _fade(x, 24, 400) * g


def sfx_knock(c):
    x = np.zeros(int(0.62 * SR))
    for t0, g, f in ((0.0, 0.85, 185.0), (0.17, 1.0, 190.0), (0.34, 0.9, 182.0)):
        _place(x, _knock(f), t0, g)
    return x


def sfx_doorOpen(c):
    n = int(0.8 * SR)
    x = np.zeros(n)
    _place(x, _tick(1900.0), 0.0, 0.7)
    _place(x, _tick(1500.0, 0.005), 0.055, 0.45)
    m = int(0.45 * SR)
    u = np.linspace(0.0, 1.0, m)
    rate = 34.0 + 46.0 * u ** 1.3                                               # a small friendly creak
    ph = np.cumsum(rate) / SR
    imp = np.zeros(m)
    imp[np.nonzero(np.diff(np.floor(ph + 0.15 * np.sin(7.0 * ph))) > 0)[0]] = 1.0
    cr = bp(imp, 620.0, 980.0, 2) + 0.45 * bp(imp, 1500.0, 2100.0, 2)
    cr = lp(cr, 3000.0, 1) * np.sin(np.pi * u) ** 0.8
    _place(x, _norm(cr), 0.11, 0.42)
    air = lp(c.rng.standard_normal(m), 700.0, 2) * np.sin(np.pi * u) ** 2
    _place(x, _norm(air), 0.10, 0.25)
    return _fade(x, 8, 2000)


def sfx_doorClose(c):
    n = int(0.62 * SR)
    x = np.zeros(n)
    m = int(0.13 * SR)
    u = np.linspace(0.0, 1.0, m)
    _place(x, _norm(lp(c.rng.standard_normal(m), 600.0, 2) * u ** 2.5 * (1.0 - u ** 12)), 0.0, 0.22)
    th = _thump(125.0, 60.0, 0.065, int(0.4 * SR)) + 0.35 * _thump(250.0, 120.0, 0.04, int(0.4 * SR))
    _place(x, _fade(th, 64, 600), 0.125, 0.9)
    _place(x, _burst('bass', 420.0, 0.022, 1), 0.125, 0.45)
    _place(x, _tick(1700.0, 0.004), 0.165, 0.38)
    return _fade(x, 8, 1500)


def sfx_footsteps(c):
    d = c.dur or 2.0
    n = int(d * SR)
    out = np.zeros((n, 2))
    heel = _burst('bass', 380.0, 0.020, 0)
    toe = _burst('felt', 1200.0, 0.012, 2)
    low = _fade(_thump(140.0, 82.0, 0.032, int(0.2 * SR)), 48, 300)
    t, j = 0.03, 0
    while t < d - 0.2:
        g = 0.82 + 0.18 * c.rng.uniform()
        pan = 0.14 if j % 2 else -0.14
        _place(out, heel, t, 0.9 * g, pan)
        _place(out, low, t, 0.55 * g, pan)
        _place(out, toe, t + 0.085, 0.30 * g, pan)
        t += 0.48 + 0.02 * c.rng.uniform(-1, 1)
        j += 1
    return out


def sfx_thud(c):
    n = int(0.48 * SR)
    x = _thump(118.0, 52.0, 0.09, n) + 0.4 * _thump(236.0, 110.0, 0.05, n)
    b = _burst('bass', 520.0, 0.03, 0)
    x[:len(b)] += 0.5 * b
    return _fade(x, 72, 1500)


def sfx_rustle(c):
    d = c.dur or 0.6
    n = int(d * SR)
    t = _tb(n)
    env = np.zeros(n)
    for _ in range(int(14 * d) + 3):
        c0, w = c.rng.uniform(0.04, d - 0.06), c.rng.uniform(0.02, 0.06)
        env += c.rng.uniform(0.4, 1.0) * np.exp(-0.5 * ((t - c0) / w) ** 2)
    x = lp(bp(c.rng.standard_normal(n), 1800.0, 7500.0, 2) * env, 8000.0, 1)
    return _fade(x, 200, 1500)


def sfx_phoneBuzz(c):
    d = c.dur or 1.0
    n = int(d * SR)
    t = _tb(n)
    f = 158.0
    car = np.zeros(n)
    for k, a in enumerate((1.0, 0.55, 0.38, 0.22, 0.12, 0.07), 1):
        car += a * np.sin(TWO_PI * k * f * t + 0.6 * k)
    car *= 0.78 + 0.22 * np.sin(TWO_PI * 31.0 * t)
    rat = bp(c.rng.standard_normal(n), 900.0, 2600.0, 2) * np.maximum(np.sin(TWO_PI * f * t), 0.0) ** 4
    x = lp(car + 0.9 * rat, 1800.0, 2)
    gate = np.zeros(n)
    on, off, t0 = 0.36, 0.16, 0.0
    while t0 < d - 0.1:
        i0, i1 = int(t0 * SR), min(n, int((t0 + on) * SR))
        seg = np.ones(i1 - i0)
        _fade(seg, int(0.02 * SR), int(0.03 * SR))
        gate[i0:i1] = seg
        t0 += on + off
    return x * gate


def sfx_messageIn(c):
    m1 = nearest_pitch(c.rel_major + 7, 86, 80, 91)
    n = int(1.0 * SR)
    x = np.zeros(n)
    _place(x, syn_celesta(m1, 0.10, 0.6, 'celesta'), 0.0, 0.9)
    _place(x, syn_celesta(m1 + 5, 0.30, 0.6, 'celesta'), 0.115, 1.0)
    return _fade(x, 8, 2000)


def sfx_keyClick(c):
    n = int(0.05 * SR)
    t = _tb(n)
    v = c.idx % 4
    x = 0.8 * _norm(bp(c.rng.standard_normal(n), 1800.0, 5500.0, 2) * np.exp(-t / 0.0035))
    x += 0.3 * np.sin(TWO_PI * (3000.0 + 160.0 * v) * t) * np.exp(-t / 0.0025)
    x += 0.5 * np.sin(TWO_PI * (600.0 + 35.0 * v) * t) * np.exp(-t / 0.008)
    return _fade(x, 10, 300)


def sfx_cat(c):
    d = 0.62
    n = int(d * SR)
    t = _tb(n)
    u = t / d
    f0 = 500.0 + 280.0 * np.sin(np.pi * u ** 0.7) ** 1.3 - 80.0 * u              # "mya-ow" contour
    f0 = f0 * (1.0 + 0.012 * np.sin(TWO_PI * 6.0 * t))
    ph = TWO_PI * np.cumsum(f0) / SR
    f1 = 650.0 + 520.0 * np.sin(np.pi * u)
    f2 = 2400.0 - 1300.0 * u
    opening = np.clip(u / 0.16, 0.0, 1.0) ** 2                                    # closed-mouth "m"
    x = np.zeros(n)
    for k in range(1, 15):
        fk = k * f0
        a = k ** -0.7 * (np.exp(-0.5 * ((fk - f1) / 230.0) ** 2) + 0.5 * np.exp(-0.5 * ((fk - f2) / 360.0) ** 2) + 0.04)
        if k >= 3:
            a = a * opening
        x += a * np.sin(k * ph)
    env = np.clip(u / 0.10, 0.0, 1.0) ** 1.5 * np.clip((1.0 - u) / 0.42, 0.0, 1.0) ** 1.4
    return _fade(lp(x * env, 5000.0, 2), 64, 800)


def sfx_birds(c):
    d = c.dur or 2.4
    n = int(d * SR)
    out = np.zeros((n, 2))
    r = c.rng
    tc = 0.05
    while tc < d - 0.35:
        bird = int(r.randint(2))
        fb = (3300.0, 4250.0)[bird] * r.uniform(0.93, 1.07)
        for _ in range(int(r.randint(2, 5))):
            cd = r.uniform(0.05, 0.09)
            m = int(cd * SR)
            uu = np.arange(m) / m
            shape = (1.0 + 0.28 * np.sin(np.pi * uu)) if bird == 0 else (1.25 - 0.4 * uu)
            ph = TWO_PI * np.cumsum(fb * shape) / SR
            ch = (np.sin(ph) + 0.12 * np.sin(2.0 * ph)) * np.sin(np.pi * uu) ** 1.2 * r.uniform(0.6, 1.0)
            _place(out, ch, tc, 1.0, (-0.45, 0.5)[bird])
            tc += cd + r.uniform(0.03, 0.07)
            if tc > d - 0.15:
                break
        tc += r.uniform(0.25, 0.7)
    return lp(out, 8000.0, 1)


def sfx_cicada(c):
    d = c.dur or 3.5
    n = int(d * SR)
    t = _tb(n)
    pulse = (0.5 + 0.5 * np.sin(TWO_PI * 86.0 * t)) ** 2
    macro = (0.5 - 0.5 * np.cos(TWO_PI * 2.1 * t)) ** 0.8                          # maem - maem - maem
    swell = np.clip(t / 0.5, 0.0, 1.0) * np.clip((d - t) / min(1.0, d / 3), 0.0, 1.0) ** 1.5
    tone = 0.4 * np.sin(TWO_PI * 4400.0 * t + 3.0 * np.sin(TWO_PI * 37.0 * t))
    out = np.zeros((n, 2))
    for ch in range(2):
        car = bp(_rng('cic', ch, c.dur).standard_normal(n), 3600.0, 6200.0, 2) * 2.2 + tone
        out[:, ch] = lp(car * pulse * (0.35 + 0.65 * macro) * swell, 7500.0, 2)
    return out


def sfx_rainLoop(c):
    d = c.dur or 6.0
    n = int(d * SR)
    t = _tb(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        r = _rng('rain', ch, c.dur)
        hiss = lp(hp(r.standard_normal(n), 900.0, 1), 7500.0, 2)
        low = bp(r.standard_normal(n), 150.0, 600.0, 2) * 0.5
        imp = np.zeros(n)
        k = int(32 * d)
        imp[r.randint(0, n, k)] = r.uniform(0.3, 1.0, k) * r.choice((-1.0, 1.0), k)
        drops = bp(imp, 1800.0, 5200.0, 2) * 7.0
        out[:, ch] = (0.7 * hiss + low + drops) * (1.0 + 0.12 * np.sin(TWO_PI * 0.27 * t + 2.0 * ch))
    out /= math.sqrt(float(np.mean(out * out))) + 1e-12
    return _fade(out, int(min(0.5, d / 4) * SR), int(min(0.8, d / 3) * SR))


def sfx_cityNight(c):
    d = c.dur or 6.0
    n = int(d * SR)
    t = _tb(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        r = _rng('city', ch, c.dur)
        rumble = lp(hp(np.cumsum(r.standard_normal(n)), 30.0, 2), 240.0, 2)
        rumble /= math.sqrt(float(np.mean(rumble * rumble))) + 1e-12
        air = bp(r.standard_normal(n), 300.0, 1400.0, 2)
        car = bp(r.standard_normal(n), 250.0, 900.0, 2) * np.exp(-((t - d * (0.5 + 0.1 * ch)) / (d * 0.17)) ** 2)
        out[:, ch] = rumble + 0.9 * air + 2.2 * car
    out /= math.sqrt(float(np.mean(out * out))) + 1e-12
    for j, (f, pan, ph0) in enumerate(((4300.0, 0.45, 0.0), (3880.0, -0.4, 0.37))):   # two crickets
        gate = ((t * 1.1 + ph0) % 1.0 < 0.40).astype(float)
        gate = uniform_filter1d(gate, int(0.02 * SR))
        chirp = np.sin(TWO_PI * f * t) * (0.5 + 0.5 * np.sin(TWO_PI * 31.0 * t)) ** 2 * gate
        l, r_ = pan_gains(pan)
        out[:, 0] += 0.55 * l * chirp
        out[:, 1] += 0.55 * r_ * chirp
    return _fade(out, int(min(0.6, d / 4) * SR), int(min(0.9, d / 3) * SR))


def sfx_plateClink(c):
    def clink(f):
        n = int(0.35 * SR)
        t = _tb(n)
        x = np.zeros(n)
        for ratio, a, tau in ((1.0, 1.0, 0.09), (1.69, 0.6, 0.07), (2.55, 0.35, 0.05), (3.72, 0.2, 0.03)):
            x += a * np.sin(TWO_PI * f * ratio * t) * np.exp(-t / tau)
        return _fade(x, 48, 600)
    x = np.zeros(int(0.5 * SR))
    _place(x, clink(1850.0), 0.0, 1.0)
    _place(x, clink(2080.0), 0.12, 0.6)
    return lp(x, 7500.0, 1)


def sfx_sip(c):
    d = 0.34
    n = int(d * SR)
    t = _tb(n)
    u = t / d
    x = _sweep_noise(c.rng, n, 700.0 * 2.0 ** (2.0 * u), 0.8)
    env = np.minimum(u / 0.25, 1.0) ** 1.5 * np.clip((1.0 - u) / 0.14, 0.0, 1.0)
    x = x * env * (1.0 - 0.35 * (0.5 + 0.5 * np.sin(TWO_PI * 27.0 * t)))
    return _fade(lp(x, 6000.0, 1), 64, 400)


def sfx_gasp(c):
    d = 0.36
    n = int(d * SR)
    t = _tb(n)
    u = t / d
    x = _sweep_noise(c.rng, n, 500.0 * 2.0 ** (2.2 * u ** 0.7), 1.5)
    x = x + 0.3 * bp(c.rng.standard_normal(n), 3000.0, 6500.0, 2) * u
    env = np.clip(t / 0.03, 0.0, 1.0) * (0.3 + 0.7 * u) ** 1.5 * np.clip((1.0 - u) / 0.12, 0.0, 1.0)
    return _fade(lp(x * env, 7000.0, 1), 64, 400)


def sfx_comicBoing(c):
    d = 0.78
    n = int(d * SR)
    t = _tb(n)
    u = t / d
    f = 150.0 * (1.0 + 0.9 * u) * (1.0 + 0.42 * np.exp(-t / 0.22) * np.sin(TWO_PI * 10.5 * t))
    ph = TWO_PI * np.cumsum(f) / SR
    x = np.zeros(n)
    for k, a in enumerate((1.0, 0.6, 0.42, 0.3, 0.2, 0.12, 0.08), 1):
        x += a * np.sin(k * ph)
    x *= (1.0 - np.exp(-t / 0.004)) * np.exp(-t / 0.25)
    return _fade(lp(x, 3500.0, 2), 32, 1500)


def sfx_sting(c):
    """End-card sting: a harp-like gliss up the tonic add9 chord of the final key and a soft bell."""
    steps = {'maj': (0, 7, 12, 14, 16, 19, 24), 'min': (0, 7, 12, 14, 15, 19, 24)}.get(c.mode, (0, 7, 12, 14, 19, 24))
    base = nearest_pitch(c.key, 62, 57, 68)
    n = int(2.4 * SR)
    out = np.zeros((n, 2))
    for j, iv in enumerate(steps):
        w = syn_pluck(base + iv, 1.6, 0.5, 'harp')
        _place(out, w, 0.06 * j, 0.55 + 0.05 * j, -0.5 + j / (len(steps) - 1.0))
    top = base + 24
    _place(out, syn_celesta(top, 0.6, 0.6, 'bell'), 0.06 * len(steps), 0.8, 0.15)
    _place(out, syn_celesta(top + 7, 0.3, 0.5, 'musicbox'), 0.06 * len(steps) + 0.16, 0.42, -0.25)
    return _fade(out, 8, int(0.5 * SR))


# type -> (generator, level, reverb send, ducks the music, level is RMS (ambience bed), variants)
SFX = {
    'pop': (sfx_pop, 0.15, 0.10, False, False, 5),
    'pop2': (sfx_pop2, 0.15, 0.10, False, False, 5),
    'whoosh': (sfx_whoosh, 0.17, 0.10, False, False, 1),
    'scroll': (sfx_scroll, 0.14, 0.08, False, False, 1),
    'ding': (sfx_ding, 0.24, 0.30, True, False, 1),
    'sparkle': (sfx_sparkle, 0.20, 0.35, False, False, 1),
    'heartbeat': (sfx_heartbeat, 0.44, 0.03, True, False, 1),
    'heartbeatLoop': (sfx_heartbeatLoop, 0.38, 0.03, True, False, 1),
    'doorbell': (sfx_doorbell, 0.30, 0.25, True, False, 1),
    'knock': (sfx_knock, 0.34, 0.14, True, False, 1),
    'doorOpen': (sfx_doorOpen, 0.24, 0.14, True, False, 1),
    'doorClose': (sfx_doorClose, 0.38, 0.12, True, False, 1),
    'footsteps': (sfx_footsteps, 0.24, 0.12, False, False, 1),
    'thud': (sfx_thud, 0.44, 0.08, True, False, 1),
    'rustle': (sfx_rustle, 0.12, 0.08, False, False, 1),
    'phoneBuzz': (sfx_phoneBuzz, 0.24, 0.05, True, False, 1),
    'messageIn': (sfx_messageIn, 0.26, 0.25, True, False, 1),
    'keyClick': (sfx_keyClick, 0.11, 0.06, False, False, 4),
    'cat': (sfx_cat, 0.26, 0.14, True, False, 1),
    'birds': (sfx_birds, 0.13, 0.20, False, False, 1),
    'cicada': (sfx_cicada, 0.030, 0.10, False, True, 1),
    'rainLoop': (sfx_rainLoop, 0.034, 0.05, False, True, 1),
    'cityNight': (sfx_cityNight, 0.032, 0.08, False, True, 1),
    'elevatorDing': (sfx_elevatorDing, 0.26, 0.30, True, False, 1),
    'plateClink': (sfx_plateClink, 0.18, 0.18, False, False, 1),
    'sip': (sfx_sip, 0.15, 0.08, False, False, 1),
    'gasp': (sfx_gasp, 0.19, 0.12, True, False, 1),
    'comicBoing': (sfx_comicBoing, 0.28, 0.12, True, False, 1),
    'sting': (sfx_sting, 0.30, 0.38, False, False, 1),
}
SFX_TYPES = tuple(SFX)


def key_at(keys, t):
    """(tonic pitch class, mode) of the music at time t; F major when there is no music."""
    if not keys:
        return 5, 'maj'
    k = keys[0]
    for seg in keys:
        if seg[0] <= t + 0.05:
            k = seg
    return k[1], k[2]


def render_sfx(sfx, n, keys, total):
    """timeline.audio.sfx -> (dry, reverb send, ducking side-chain)."""
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))
    side = np.zeros(n)
    cache, count, unknown, used = {}, {}, set(), {}
    evs = [e for e in (sfx or []) if isinstance(e, dict)]
    evs.sort(key=lambda e: (float(e.get('t', 0.0)), str(e.get('type'))))
    for e in evs:
        typ = e.get('type')
        if typ not in SFX:
            if typ not in unknown:
                warn('unknown sfx type %r skipped' % (typ,))
                unknown.add(typ)
            continue
        t = max(0.0, float(e.get('t', 0.0)))
        gain = min(2.5, float(e.get('gain', 1.0) if e.get('gain') is not None else 1.0))
        if t >= total - 0.02 or gain <= 0.0:
            continue
        fn, level, sd, ducks, is_rms, nvar = SFX[typ]
        dur = e.get('dur')
        dur = round(min(max(float(dur), 0.3), 120.0), 2) if dur else None
        idx = count.get(typ, 0)
        count[typ] = idx + 1
        key, mode = key_at(keys, t)
        ck = (typ, idx % nvar, dur, key, mode)
        w = cache.get(ck)
        if w is None:
            w = np.asarray(fn(SfxCtx(typ, idx % nvar, dur, key, mode)), dtype=np.float64)
            ref = math.sqrt(float(np.mean(w * w))) if is_rms else float(np.max(np.abs(w)))
            w = w * (level / max(ref, 1e-9))
            cache[ck] = w
        used[typ] = used.get(typ, 0) + 1
        i0 = int(round(t * SR))
        m = min(len(w), n - i0)
        if m <= 0:
            continue
        x = w[:m] * gain
        if m < len(w):                       # cut by the end of the episode
            x = _fade(x.copy(), 0, min(m, int(0.05 * SR)))
        pan = e.get('pan')
        if x.ndim == 1:
            l, r = pan_gains(float(pan) if pan is not None else 0.0)
            x = np.stack([x * l, x * r], axis=1)
        elif pan is not None:
            l, r = pan_gains(float(pan))
            x = x * np.array([l, r]) * math.sqrt(2.0)
        dry[i0:i0 + m] += x
        send[i0:i0 + m] += x * sd
        if ducks:
            side[i0:i0 + m] += 0.5 * (x[:, 0] + x[:, 1])
    return dry, send, side, used


# --------------------------------------------------------------------------------------------
# loudness, limiter, mix
# --------------------------------------------------------------------------------------------

_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def lufs(x):
    """Integrated loudness, ITU-R BS.1770-4 (K-weighting, 400 ms blocks, 75 % overlap, absolute
    gate -70 LUFS, relative gate -10 LU). x is (n, 2) at 48 kHz."""
    y = signal.lfilter(_K2[0], _K2[1], signal.lfilter(_K1[0], _K1[1], x, axis=0), axis=0)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(y) < blk:
        return -120.0
    c = np.concatenate([[0.0], np.cumsum(np.sum(y * y, axis=1))])
    i = np.arange(0, len(y) - blk + 1, hop)
    z = (c[i + blk] - c[i]) / blk
    l = -0.691 + 10.0 * np.log10(z + 1e-20)
    keep = l > -70.0
    if not keep.any():
        return -120.0
    thr = -0.691 + 10.0 * math.log10(float(np.mean(z[keep]))) - 10.0
    keep &= l > thr
    return -0.691 + 10.0 * math.log10(float(np.mean(z[keep])))


def true_peak_db(x):
    """True peak (4x oversampled), dBTP."""
    return db(float(np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))))


def limiter(x, ceiling_db=-1.5, knee_db=5.0, hold_ms=20.0, smooth_ms=10.0):
    """Soft-knee look-ahead limiter. The gain computer is a soft-knee curve with infinite ratio on
    the stereo-linked peak; the gain is the minimum over +-hold and then smoothed by two box filters
    whose total span fits inside the hold, so the output never exceeds the ceiling."""
    peak = np.max(np.abs(x), axis=1)
    over = 20.0 * np.log10(np.maximum(peak, 1e-9)) - ceiling_db
    gr = np.where(over <= -knee_db / 2.0, 0.0,
                  np.where(over >= knee_db / 2.0, -over, -((over + knee_db / 2.0) ** 2) / (2.0 * knee_db)))
    h = int(hold_ms * SR / 1000.0)
    s = int(smooth_ms * SR / 1000.0)
    g = minimum_filter1d(gr, size=2 * h + 1, mode='nearest')
    g = uniform_filter1d(uniform_filter1d(g, size=s, mode='nearest'), size=s, mode='nearest')
    return x * (10.0 ** (g / 20.0))[:, None], float(-g.min())


def duck_gain(side):
    """Gentle ducking of the music under loud SFX: up to 4 dB, eased in and out."""
    p = uniform_filter1d(side * side, int(0.04 * SR), mode='nearest')
    lev = 10.0 * np.log10(p + 1e-12)
    red = np.clip((lev + 36.0) / 14.0, 0.0, 1.0) * 4.0
    red = maximum_filter1d(red, int(0.20 * SR), mode='nearest')
    w = int(0.09 * SR)
    red = uniform_filter1d(uniform_filter1d(red, w, mode='nearest'), w, mode='nearest')
    return 10.0 ** (-red / 20.0), float(red.max())


MUSIC_REF_LUFS = -18.0          # level of the music bed before SFX are laid on top


def render(timeline):
    """timeline dict -> (stereo float array of exactly duration*SR samples, stats dict)."""
    t_start = time.time()
    total = float(timeline.get('duration') or 0.0)
    audio = timeline.get('audio') or {}
    end = timeline.get('end') or {}
    if total <= 0.0:
        cuts = timeline.get('cuts') or []
        total = max([float(c.get('t1', 0.0)) for c in cuts] + [float(end.get('t1', 0.0)), 1.0])
        warn('timeline has no duration, using %.2f s' % total)
    n = int(round(total * SR))
    t_end = float(end.get('t0', total - 2.5)) if end else total - 2.5
    t_end = min(max(t_end, 0.5), total - 0.5)
    stats = {'duration': round(total, 3), 'end_t0': round(t_end, 3)}

    # ---- music
    segs, keys = plan_music(audio.get('music'), t_end, total)
    events = arrange(segs)
    dry, send = render_events(events, n)
    music = dry + reverb(send, 1.5, 1)
    has_music = bool(events)
    if has_music:
        l0 = lufs(music)
        music *= from_db(MUSIC_REF_LUFS - l0)
    stats['segments'] = [{'mood': s.mood, 't0': round(s.t0, 3), 't1': round(s.t1, 3), 'bpm': round(s.bpm, 2),
                          'key': NOTE_NAMES[s.cfg['key']] + (' minor' if s.cfg['mode'] == 'min' else (' sus' if s.cfg['mode'] == 'sus' else ' major')),
                          'bars': [(b.phrase + str(b.idx + 1) if b.kind == 'theme' else b.kind) + ('' if b.nbeats == 4 else '/%d' % b.nbeats)
                                   for b in s.bars]} for s in segs]
    stats['notes'] = len(events)
    t_music = time.time()

    # ---- sfx
    sdry, ssend, side, used = render_sfx(audio.get('sfx'), n, keys, total)
    sfx = sdry + reverb(ssend, 0.9, 2) if used else sdry
    stats['sfx'] = dict(sorted(used.items()))
    duck_db = 0.0
    if has_music and used:
        g, duck_db = duck_gain(side)
        music *= g[:, None]
    stats['max_duck_db'] = round(duck_db, 2)
    mix = music + sfx
    t_sfx = time.time()

    # ---- master
    mix = hp(mix, 30.0, 2)
    _fade(mix, int(0.004 * SR), int(min(END_FADE_S, total / 4) * SR))
    l_in = lufs(mix)
    if l_in < -70.0:
        out, gr, l_out, tp = mix, 0.0, l_in, -120.0
    else:
        gain_db = TARGET_LUFS - l_in
        if not has_music:
            gain_db = min(gain_db, TARGET_LUFS - MUSIC_REF_LUFS + 2.0)    # SFX only: do not blow them up
        ceiling = -1.5
        for _ in range(3):
            for _ in range(5):
                out, gr = limiter(mix * from_db(gain_db), ceiling)
                l_out = lufs(out)
                if abs(l_out - TARGET_LUFS) < 0.03 or not has_music:
                    break
                gain_db += TARGET_LUFS - l_out
            tp = true_peak_db(out)
            if tp <= TRUE_PEAK_MAX_DB - 0.02:
                break
            ceiling -= tp - (TRUE_PEAK_MAX_DB - 0.1)
    stats.update({'lufs': round(l_out, 2), 'true_peak_db': round(tp, 2), 'limiter_max_gr_db': round(gr, 2),
                  'render_s': {'music': round(t_music - t_start, 2), 'sfx': round(t_sfx - t_music, 2),
                               'master': round(time.time() - t_sfx, 2), 'total': round(time.time() - t_start, 2)}})
    return out, stats


def write_wav(path, x):
    """16-bit PCM stereo with TPDF dither (deterministic)."""
    r = _rng('dither')
    d = (r.uniform(-0.5, 0.5, x.shape) + r.uniform(-0.5, 0.5, x.shape)) / 32768.0
    pcm = np.clip(np.round((x + d) * 32767.0), -32768, 32767).astype('<i2')
    tmp = path + '.tmp'
    try:
        import soundfile as sf
        sf.write(tmp, pcm, SR, subtype='PCM_16', format='WAV')
    except Exception:
        import wave
        with wave.open(tmp, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
    os.replace(tmp, path)


def demo_timeline():
    """A timeline that plays every mood and every SFX type once (some twice)."""
    plan = (('sweet', 13.0), ('flutter', 11.5), ('comic', 10.0), ('calm', 13.5), ('sad', 14.5), ('tension', 10.5), ('bright', 15.0))
    music, t = [], 0.0
    for mood, d in plan:
        music.append({'t': round(t, 2), 'mood': mood})
        t += d
    end_t0 = round(t, 2)
    total = end_t0 + 2.5
    loops = {'heartbeatLoop': 3.2, 'rainLoop': 5.0, 'cityNight': 5.0, 'cicada': 3.5, 'birds': 2.4, 'footsteps': 2.0, 'phoneBuzz': 1.0}
    sfx = []
    types = [x for x in SFX_TYPES if x != 'sting']
    step = (end_t0 - 4.0) / len(types)
    for i, typ in enumerate(types):
        e = {'t': round(1.2 + i * step, 2), 'type': typ}
        if typ in loops:
            e['dur'] = loops[typ]
        sfx.append(e)
    for i in range(24):                                   # bubble pops, as build.py adds them
        sfx.append({'t': round(0.5 + i * 3.6, 2), 'type': 'pop', 'gain': 0.6})
    for i in range(6):
        sfx.append({'t': round(30.3 + i * 0.17, 2), 'type': 'keyClick', 'gain': 0.8})
    sfx.append({'t': 20.0, 'type': 'notARealSfx'})        # exercises the warn-and-skip path
    sfx.append({'t': end_t0, 'type': 'sting'})
    sfx.sort(key=lambda e: e['t'])
    cuts = []
    for i, (mood, d) in enumerate(plan):
        t0 = music[i]['t']
        cuts.append({'id': 'c%02d' % (i + 1), 't0': t0, 't1': round(t0 + d, 2), 'page': i + 1, 'layout': 'full',
                     'trans': {'type': 'cut', 'dur': 0}, 'bubbles': [{'type': 'caption', 'text': mood, 't0': t0, 't1': round(t0 + d, 2)}]})
    return {'fps': 30, 'w': 1080, 'h': 1920, 'duration': total,
            'meta': {'series': '_demo', 'seriesTitle': 'audio demo', 'ep': 0, 'epTitle': 'every mood, every SFX'},
            'cuts': cuts, 'end': {'t0': end_t0, 't1': total, 'text': '다음 화에 계속', 'teaser': ''},
            'audio': {'music': music, 'sfx': sfx}}


def main(argv):
    global _QUIET
    args = [a for a in argv if not a.startswith('--')]
    flags = {a for a in argv if a.startswith('--')}
    _QUIET = '--quiet' in flags
    if len(args) != 1 or flags - {'--demo', '--report', '--quiet'}:
        print(__doc__.split('MUSIC.')[0].strip(), file=sys.stderr)
        return 2
    build_dir = args[0]
    tl_path = os.path.join(build_dir, 'timeline.json')
    if '--demo' in flags:
        os.makedirs(build_dir, exist_ok=True)
        with open(tl_path, 'w', encoding='utf-8') as f:
            json.dump(demo_timeline(), f, ensure_ascii=False, indent=1)
        log('wrote', tl_path)
    if not os.path.isfile(tl_path):
        print('audio.py: %s not found' % tl_path, file=sys.stderr)
        return 1
    with open(tl_path, encoding='utf-8') as f:
        timeline = json.load(f)
    out, stats = render(timeline)
    wav = os.path.join(build_dir, 'audio.wav')
    write_wav(wav, out)
    for s in stats['segments']:
        log('%-8s %6.2f-%6.2f s  %5.1f bpm  %-8s %s' % (s['mood'], s['t0'], s['t1'], s['bpm'], s['key'], ' '.join(s['bars'])))
    log('%d notes, sfx: %s' % (stats['notes'], ', '.join('%s x%d' % kv for kv in stats['sfx'].items()) or 'none'))
    log('%.2f s  %.2f LUFS  true peak %.2f dBTP  limiter max GR %.1f dB  duck max %.1f dB  rendered in %.1f s -> %s'
        % (stats['duration'], stats['lufs'], stats['true_peak_db'], stats['limiter_max_gr_db'], stats['max_duck_db'],
           stats['render_s']['total'], wav))
    if '--report' in flags:
        with open(os.path.join(build_dir, 'audio_report.json'), 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
