#!/usr/bin/env python3
"""engine/build.py: episode script -> timeline.json -> audio -> frames -> mp4   (docs/SPEC.md sections 3, 6, 7)

  python3 engine/build.py series/<slug>/ep01.json                  all steps -> out/<slug>_ep01.mp4
  python3 engine/build.py series/<slug>/ep01.json timeline         resolve + cut table; exit 1 on rule violations
  python3 engine/build.py series/<slug>/ep01.json audio|render|mux|cover
options: --workers N (render processes, default 2)   --no-check (build even if the writing rules fail)
"""
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, W, H = 30, 1080, 1920
MAX_CHARS, MAX_LINES, MAX_BUBBLES = 13, 2, 3
MIN_CUTS, MAX_CUTS, MIN_TOTAL, MAX_TOTAL = 8, 13, 54.0, 63.0
LEAD, TAIL, EMPTY_CUT, END_CARD = 0.5, 0.6, 2.0, 2.5

LAYOUTS = ['full', 'tall', 'stack2a', 'stack2b', 'big+small:a', 'big+small:b', 'small+big:a', 'small+big:b',
           'stack3a', 'stack3b', 'stack3c', 'inset']
NEW_PAGE_LAYOUTS = {'full', 'tall', 'stack2a', 'big+small:a', 'small+big:a', 'stack3a'}
TRANS = {'cut': 0.0, 'fade': 0.4, 'scroll': 0.5, 'push': 0.45, 'whip': 0.28, 'flash': 0.36, 'iris': 0.5, 'pop': 0.3}
CAMS = ['still', 'pushIn', 'pullOut', 'panLeft', 'panRight', 'tiltUp', 'tiltDown', 'drift', 'shake']
FX = ['sparkle', 'hearts', 'petals', 'speedlines', 'focuslines', 'flash', 'vignette', 'rain', 'bokeh', 'pinkMood',
      'gloomMood', 'shake', 'heartbeat']
EMOTES = ['heart', 'sweat', 'exclaim', 'question', 'sparkle', 'anger', 'gloom', 'note', 'zzz', 'blushLines']
BUBBLES = ['speech', 'thought', 'shout', 'whisper', 'narration', 'sfx', 'text', 'caption']
SHOTS = ['closeup', 'bust', 'waist', 'full', 'eyes', 'hands', 'back']
TIMES = ['day', 'evening', 'night', 'dawn', 'indoor']
FACINGS = ['left', 'right', 'front', 'back']
ENTERS = ['left', 'right', 'up', 'down', 'fade', 'pop']
MOODS = ['sweet', 'comic', 'flutter', 'calm', 'sad', 'tension', 'bright']
SFX = ['pop', 'pop2', 'whoosh', 'scroll', 'ding', 'sparkle', 'heartbeat', 'heartbeatLoop', 'doorbell', 'knock', 'doorOpen',
       'doorClose', 'footsteps', 'thud', 'rustle', 'phoneBuzz', 'messageIn', 'keyClick', 'cat', 'birds', 'cicada',
       'rainLoop', 'cityNight', 'elevatorDing', 'plateClink', 'sip', 'gasp', 'comicBoing', 'sting']
EXPRS = ['neutral', 'smile', 'softsmile', 'laugh', 'shy', 'flustered', 'surprised', 'sad', 'teary', 'pout', 'angry',
         'annoyed', 'wink', 'closed', 'sleepy', 'love', 'nervous', 'thinking', 'smirk', 'shock']
POSES = ['stand', 'wave', 'hold', 'reachOut', 'handToMouth', 'handOnHead', 'armsCrossed', 'cheekHands', 'phone',
         'point', 'bow', 'peek', 'lean', 'sit', 'walk', 'run']
HEART_PERIOD, HEART_FIRST = 0.95, 0.095       # must match LIB.heartPulse in engine/lib.js
PUNCT = ',.…?!~'


# ----------------------------------------------------------------------------- text
def plain(text):
    return str('' if text is None else text).replace('*', '')


def count_chars(text):
    """non-space characters (emphasis asterisks do not count)"""
    return len(re.sub(r'\s', '', plain(text)))


def reading_time(text):
    return max(1.3, min(4.5, 0.9 + 0.075 * count_chars(text)))


def wrap_words(words, max_chars=MAX_CHARS, single=False):
    """wrap by 어절, balanced. MUST stay identical to LIB.text.wrapWords in engine/lib.js"""
    n = len(words)
    if n <= 1:
        return [words]
    lens = [len(w) for w in words]

    def ln(i, j):
        return sum(lens[i:j]) + (j - i - 1)

    total = ln(0, n)
    best = None
    for i in range(1, n):
        a, b = ln(0, i), ln(i, n)
        if max(a, b) > max_chars:
            continue
        cost = abs(a - b) + (0.4 if a > b else 0) - (2.5 if words[i - 1][-1] in PUNCT else 0)
        if min(a, b) < 2:
            cost += 4
        if best is None or cost < best[1]:
            best = (i, cost)
    if total <= max_chars and (single or total <= 8 or best is None or best[1] > 5):
        return [words]
    if best is not None:
        return [words[:best[0]], words[best[0]:]]
    lines, cur = [], []
    for w in words:
        if cur and sum(len(x) for x in cur) + len(cur) + len(w) > max_chars:
            lines.append(cur)
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    return lines


SINGLE_LINE_TYPES = ('narration', 'text', 'caption')      # stay on one line when they fit


def wrap_ko(text, max_chars=MAX_CHARS, btype='speech'):
    """-> list of lines exactly as the player will letter them (an explicit \\n forces a break)"""
    out = []
    for para in plain(text).split('\n'):
        words = para.split()
        if words:
            out.extend(' '.join(l) for l in wrap_words(words, max_chars, btype in SINGLE_LINE_TYPES))
    return out


# ----------------------------------------------------------------------------- resolve
class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, where, msg):
        self.errors.append('%s: %s' % (where, msg))

    def warn(self, where, msg):
        self.warnings.append('%s: %s' % (where, msg))


def frames(sec):
    return max(1, int(round(sec * FPS)))


def r4(x):
    return round(float(x), 4)


def rel_time(at, bubble_rel, where, rep, default=0.0):
    """'at' -> seconds from the cut start. number | "b2" (when bubble 2 appears) | "b2+0.3" """
    if at is None:
        return default
    if isinstance(at, (int, float)) and not isinstance(at, bool):
        return float(at)
    m = re.match(r'^b(\d+)\s*([+-]\s*\d+(?:\.\d+)?)?$', str(at).strip())
    if not m:
        rep.err(where, 'cannot read time "%s" (use seconds or "b2" = when bubble 2 appears)' % at)
        return default
    i = int(m.group(1))
    if i < 1 or i > len(bubble_rel):
        rep.err(where, '"%s" refers to bubble %d but the cut has %d bubble(s)' % (at, i, len(bubble_rel)))
        return default
    return bubble_rel[i - 1] + (float(m.group(2).replace(' ', '')) if m.group(2) else 0.0)


def vocab(value, allowed, where, what, rep, hard=True):
    if value is None or value in allowed:
        return
    (rep.err if hard else rep.warn)(where, 'unknown %s "%s" (known: %s)' % (what, value, ', '.join(allowed)))


def resolve(script, rep):
    cuts_in = script.get('cuts') or []
    if not cuts_in:
        rep.err('script', 'no cuts')
    meta = {'series': script.get('series', ''), 'seriesTitle': script.get('seriesTitle', ''), 'ep': script.get('ep', 1),
            'epTitle': script.get('epTitle', '')}
    if script.get('pageColor'):
        meta['pageColor'] = script['pageColor']
    cuts, sfx, t, ids = [], [], 0, set()       # t in frames
    page_no, prev_page_key = 0, object()
    for ci, src in enumerate(cuts_in):
        cid = str(src.get('id') or 'c%02d' % (ci + 1))
        where = cid
        if cid in ids:
            rep.err(where, 'duplicate cut id')
        ids.add(cid)
        cut = dict(src)
        cut['id'] = cid
        layout = src.get('layout') or 'full'
        vocab(layout, LAYOUTS, where, 'layout', rep)
        cut['layout'] = layout
        # ---- page
        if ci == 0:
            new_page = True
        elif layout == 'inset':
            new_page = False
            if 'page' in src and src['page'] != cuts_in[ci - 1].get('page', src['page']):
                rep.warn(where, 'an inset always pops over the previous cut; its "page" is ignored')
        elif 'page' in src:
            new_page = src['page'] != prev_page_key
            if not new_page and layout in ('full', 'tall'):
                rep.warn(where, 'layout "%s" covers the whole page but shares page %s with the previous cut' % (layout, src['page']))
            if new_page and layout not in NEW_PAGE_LAYOUTS:
                rep.warn(where, 'layout "%s" starts a new page: the slots above it stay empty' % layout)
        else:
            new_page = layout in NEW_PAGE_LAYOUTS
        if new_page:
            page_no += 1
        prev_page_key = src.get('page', prev_page_key) if layout != 'inset' else prev_page_key
        cut['page'] = page_no
        # ---- vocabulary
        vocab(src.get('time'), TIMES, where, 'time', rep)
        cam = src.get('cam')
        vocab(cam.get('move') if isinstance(cam, dict) else cam, CAMS, where, 'cam', rep)
        # ---- bubbles + duration
        bl = [dict(b) for b in (src.get('bubbles') or [])]
        reads = []
        for bi, b in enumerate(bl):
            bw = '%s bubble %d' % (cid, bi + 1)
            b['type'] = b.get('type') or 'speech'
            vocab(b['type'], BUBBLES, bw, 'bubble type', rep)
            if not plain(b.get('text')).strip():
                rep.err(bw, 'empty text')
            reads.append(reading_time(b.get('text')))
        natural = LEAD + sum(reads) + TAIL if bl else EMPTY_CUT
        if src.get('dur') is not None:
            dur = float(src['dur'])
            if dur < 0.4:
                rep.err(where, 'dur %.2f is too short' % dur)
                dur = 0.4
            if bl and dur < natural * 0.6:
                rep.warn(where, 'dur %.1f s leaves little time to read %d bubble(s) (natural %.1f s)' % (dur, len(bl), natural))
        else:
            dur = natural
        nf = frames(dur)
        dur = nf / FPS
        t0, t1 = t / FPS, (t + nf) / FPS
        rel = []
        if bl:
            lead, tail = (LEAD, TAIL) if dur >= natural - 1e-6 else (min(LEAD, dur * 0.14), min(TAIL, dur * 0.18))
            k = min(1.0, (dur - lead - tail) / sum(reads))
            acc = lead
            for b, rd in zip(bl, reads):
                rel.append(acc)
                acc += rd * k
            for bi, b in enumerate(bl):
                if b.get('at') is not None:
                    rel[bi] = rel_time(b['at'], rel[:bi], '%s bubble %d' % (cid, bi + 1), rep, rel[bi])
                b['t0'], b['t1'] = r4(t0 + rel[bi]), r4(t1)
        cut['bubbles'] = bl
        cut['t0'], cut['t1'] = r4(t0), r4(t1)
        # ---- transition into this cut
        tr = src.get('trans')
        tr = dict(tr) if isinstance(tr, dict) else ({'type': tr} if tr else {})
        if not tr.get('type'):
            tr['type'] = 'cut' if ci == 0 else ('scroll' if new_page else ('pop' if layout == 'inset' else 'fade'))
        vocab(tr['type'], list(TRANS), where, 'trans', rep)
        if ci == 0:
            tr = {'type': 'cut', 'dur': 0.0}
        tr['dur'] = r4(min(float(tr.get('dur', TRANS.get(tr['type'], 0.4))), dur * 0.6))
        cut['trans'] = tr
        # ---- actors: timed keys, emotes, enter/exit
        actors = []
        for ai, a in enumerate(src.get('actors') or []):
            a = dict(a)
            aw = '%s actor %s' % (cid, a.get('who', ai + 1))
            if not a.get('who'):
                rep.err(aw, 'missing "who"')
            vocab(a.get('shot'), SHOTS, aw, 'shot', rep)
            vocab(a.get('facing'), FACINGS, aw, 'facing', rep)
            if isinstance(a.get('at'), str):
                vocab(a['at'], ['left', 'center', 'right'], aw, 'at', rep)
            vocab(a.get('expr'), EXPRS, aw, 'expr (not canonical)', rep, hard=False)
            vocab(a.get('pose'), POSES, aw, 'pose (not canonical)', rep, hard=False)
            em = a.get('emote')
            if isinstance(em, dict):
                em = dict(em)
                em['at'] = r4(rel_time(em.get('at'), rel, aw + ' emote', rep, 0.4))
                a['emote'] = em
            vocab(em.get('kind') if isinstance(em, dict) else em, EMOTES, aw, 'emote', rep)
            for fld in ('enter', 'exit'):
                v = a.get(fld)
                if isinstance(v, dict):
                    v = dict(v)
                    if v.get('at') is not None:
                        v['at'] = r4(rel_time(v['at'], rel, aw + ' ' + fld, rep))
                    a[fld] = v
                vocab(v.get('from', v.get('to')) if isinstance(v, dict) else v, ENTERS, aw, fld, rep)
            keys = []
            for k in a.get('keys') or []:
                k = dict(k)
                rt = rel_time(k.get('at'), rel, aw + ' key', rep)
                k['at'], k['t'] = r4(rt), r4(t0 + rt)
                vocab(k.get('expr'), EXPRS, aw + ' key', 'expr (not canonical)', rep, hard=False)
                vocab(k.get('pose'), POSES, aw + ' key', 'pose (not canonical)', rep, hard=False)
                if k.get('emote') not in (None, 'none'):
                    vocab(k['emote'], EMOTES, aw + ' key', 'emote', rep)
                keys.append(k)
            if keys:
                a['keys'] = sorted(keys, key=lambda x: x['t'])
            actors.append(a)
        if 'actors' in src:
            cut['actors'] = actors
        # ---- fx
        fx = []
        for f in src.get('fx') or []:
            f = dict(f) if isinstance(f, dict) else {'type': f}
            vocab(f.get('type'), FX, where, 'fx', rep)
            f['at'] = r4(rel_time(f.get('at'), rel, where + ' fx', rep))
            fx.append(f)
        if 'fx' in src:
            cut['fx'] = fx
        # ---- sound: explicit + automatic (SPEC section 6)
        auto = src.get('autoSfx', True) is not False

        def add(tt, typ, gain=None):
            e = {'t': r4(max(0.0, tt)), 'type': typ}
            if gain is not None:
                e['gain'] = gain
            sfx.append(e)

        for s in src.get('sfx') or []:
            s = dict(s) if isinstance(s, dict) else {'type': s}
            vocab(s.get('type'), SFX, where + ' sfx', 'sfx', rep)
            add(t0 + rel_time(s.get('at'), rel, where + ' sfx', rep), s.get('type'), s.get('gain'))
        if auto:
            if ci > 0:
                ty = {'scroll': ('scroll', 0.7), 'push': ('whoosh', 0.7), 'whip': ('whoosh', 0.9), 'pop': ('pop2', 0.5)}.get(tr['type'])
                if ty and tr['dur'] > 0:
                    add(t0, ty[0], ty[1])
            for b in bl:
                ty = {'speech': ('pop', 0.6), 'thought': ('pop', 0.45), 'whisper': ('pop', 0.3), 'shout': ('pop2', 0.85),
                      'text': ('messageIn', 0.7)}.get(b['type'])
                if ty:
                    add(b['t0'], ty[0], ty[1])
            for a in actors:
                em = a.get('emote')
                if (em.get('kind') if isinstance(em, dict) else em) == 'heart':
                    add(t0 + (em.get('at', 0.4) if isinstance(em, dict) else 0.4), 'heartbeat', 0.8)
                for k in a.get('keys') or []:
                    if k.get('emote') == 'heart':
                        add(k['t'], 'heartbeat', 0.8)
            for f in fx:
                if f['type'] == 'sparkle':
                    add(t0 + f['at'] + 0.05, 'sparkle', 0.6)
                elif f['type'] == 'heartbeat':
                    tt, stop = t0 + f['at'] + HEART_FIRST - 0.03, min(t1, t0 + f['at'] + f['dur']) if f.get('dur') else t1
                    while tt < stop - 0.35:
                        add(tt, 'heartbeat', 0.8)
                        tt += HEART_PERIOD
        cuts.append(cut)
        t += nf
    end_src = script.get('end') or {}
    e0 = t / FPS
    end = dict(end_src)
    end.update({'t0': r4(e0), 't1': r4(e0 + END_CARD), 'text': end_src.get('text') or '다음 화에 계속', 'teaser': end_src.get('teaser') or ''})
    sfx.append({'t': r4(e0), 'type': 'sting', 'gain': 0.8})
    # ---- music
    by_id = {c['id']: c for c in cuts}
    music = []
    for m in script.get('music') or []:
        vocab(m.get('mood'), MOODS, 'music', 'mood', rep)
        if m.get('from') is not None and m['from'] not in by_id:
            rep.err('music', '"from": "%s" is not a cut id' % m['from'])
            continue
        music.append({'t': by_id[m['from']]['t0'] if m.get('from') is not None else 0.0, 'mood': m.get('mood', 'sweet')})
    music.sort(key=lambda m: m['t'])
    if not music:
        music = [{'t': 0.0, 'mood': 'sweet'}]
    music[0]['t'] = 0.0
    sfx.sort(key=lambda s: (s['t'], s['type']))
    tl = {'fps': FPS, 'w': W, 'h': H, 'duration': r4(e0 + END_CARD), 'meta': meta, 'cuts': cuts, 'end': end,
          'audio': {'music': music, 'sfx': sfx}}
    if script.get('cover'):
        tl['cover'] = script['cover']
        if script['cover'].get('cut') and script['cover']['cut'] not in by_id:
            rep.err('cover', '"cut": "%s" is not a cut id' % script['cover']['cut'])
    return tl


# ----------------------------------------------------------------------------- writing rules (SPEC section 3)
def check_rules(script, tl, rep, relaxed=False):
    soft = rep.warn if relaxed else rep.err
    cuts = tl['cuts']
    for c in cuts:
        bl = c.get('bubbles') or []
        if len(bl) > MAX_BUBBLES:
            rep.err(c['id'], '%d bubbles in one cut (max %d)' % (len(bl), MAX_BUBBLES))
        for bi, b in enumerate(bl):
            lines = wrap_ko(b.get('text'), MAX_CHARS, b.get('type'))
            where = '%s bubble %d "%s"' % (c['id'], bi + 1, plain(b.get('text')).replace('\n', '/'))
            long_ = [l for l in lines if len(l) > MAX_CHARS]
            if long_:
                rep.err(where, 'line "%s" has %d characters (max %d per line)' % (long_[0], len(long_[0]), MAX_CHARS))
            elif len(lines) > MAX_LINES:
                rep.err(where, 'needs %d lines (max %d): %s' % (len(lines), MAX_LINES, ' / '.join(lines)))
    if not (MIN_CUTS <= len(cuts) <= MAX_CUTS):
        soft('script', '%d cuts (the rule is %d-%d per episode)' % (len(cuts), MIN_CUTS, MAX_CUTS))
    if not (MIN_TOTAL <= tl['duration'] <= MAX_TOTAL):
        soft('script', 'total %.1f s (the rule is %.0f-%.0f s including the %.1f s end card)' % (tl['duration'], MIN_TOTAL, MAX_TOTAL, END_CARD))
    if cuts:
        c0 = cuts[0]
        bl = c0.get('bubbles') or []
        if not c0.get('actors') and not c0.get('bg') and bl and all(b['type'] == 'caption' for b in bl):
            soft(c0['id'], 'the first cut must be the hook, not a title card (the series badge is an overlay)')
    if not (script.get('end') or {}).get('teaser'):
        rep.warn('end', 'no teaser line for the end card')


def external_check(script_path):
    """reuse scripts/check_script.py when the repo has one; -> (ok, output)"""
    chk = os.path.join(ROOT, 'scripts', 'check_script.py')
    if not os.path.exists(chk):
        return True, ''
    r = subprocess.run([sys.executable, chk, script_path], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout + r.stderr).strip()


# ----------------------------------------------------------------------------- report
def print_table(tl):
    m = tl['meta']
    print('%s  EP.%02d  %s' % (m.get('seriesTitle') or m.get('series'), int(m.get('ep') or 0), m.get('epTitle') or ''))
    print('%-6s %-4s %-12s %7s %7s %5s  %-7s %s' % ('id', 'page', 'layout', 't0', 't1', 'dur', 'trans', 'bubbles'))
    nb = 0
    for c in tl['cuts']:
        bl = c.get('bubbles') or []
        nb += len(bl)
        first = True
        for b in bl or [None]:
            txt = ''
            if b:
                who = b.get('who') or b.get('near') or ''
                txt = '%5.2f [%s%s] %s' % (b['t0'], b['type'], ' ' + who if who else '', ' / '.join(wrap_ko(b.get('text'), MAX_CHARS, b['type'])))
            if first:
                print('%-6s %-4s %-12s %7.2f %7.2f %5.2f  %-7s %s' % (c['id'], c['page'], c['layout'], c['t0'], c['t1'], c['t1'] - c['t0'], c['trans']['type'], txt))
            else:
                print('%-52s %s' % ('', txt))
            first = False
    e = tl['end']
    print('%-6s %-4s %-12s %7.2f %7.2f %5.2f  %-7s %s' % ('end', '', 'end card', e['t0'], e['t1'], e['t1'] - e['t0'], '', e['text'] + (' / ' + e['teaser'] if e.get('teaser') else '')))
    print('total %.2f s   %d cuts, %d bubbles, %d sfx, music: %s' % (tl['duration'], len(tl['cuts']), nb, len(tl['audio']['sfx']),
                                                                 ' > '.join('%s@%.1f' % (x['mood'], x['t']) for x in tl['audio']['music'])))


# ----------------------------------------------------------------------------- steps
def run(cmd, **kw):
    print('$ ' + ' '.join(cmd), flush=True)
    r = subprocess.run(cmd, **kw)
    if r.returncode != 0:
        sys.exit('build: step failed (%s)' % cmd[0])


def write_silence(path, seconds):
    sr = 48000
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b'\x00' * (int(math.ceil(seconds * sr)) * 4))


def step_audio(build_dir, tl):
    audio_py = os.path.join(ROOT, 'engine', 'audio.py')
    out = os.path.join(build_dir, 'audio.wav')
    if os.path.exists(audio_py):
        run([sys.executable, audio_py, build_dir])
        if not os.path.exists(out):
            sys.exit('build: engine/audio.py did not write ' + out)
    else:
        print('build: engine/audio.py is missing -> writing SILENCE to %s' % os.path.relpath(out, ROOT))
        write_silence(out, tl['duration'])


def step_render(build_dir, workers):
    run(['node', os.path.join(ROOT, 'engine', 'render.cjs'), build_dir, '--out', os.path.join(build_dir, 'video.mp4'), '--workers', str(workers)])


def step_cover(build_dir, out_png):
    run(['node', os.path.join(ROOT, 'engine', 'render.cjs'), build_dir, '--cover', '--out', out_png])


def step_mux(build_dir, tl, out_mp4):
    video, audio = os.path.join(build_dir, 'video.mp4'), os.path.join(build_dir, 'audio.wav')
    if not os.path.exists(video):
        sys.exit('build: no video.mp4 yet (run the render step)')
    if not os.path.exists(audio):
        print('build: no audio.wav -> muxing SILENCE')
        write_silence(audio, tl['duration'])
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
    # the render step already encoded H.264 yuv420p (crf 17): copy it, encode the audio, put the index first
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'apad', '-t', '%.4f' % tl['duration'], '-movflags', '+faststart', out_mp4])
    print('build: -> %s (%.1f MB)' % (os.path.relpath(out_mp4, ROOT), os.path.getsize(out_mp4) / 1e6))


def main(argv):
    opts = {'workers': int(os.environ.get('AIREELS_WORKERS', '2')), 'check': True}
    pos = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--workers':
            opts['workers'] = int(argv[i + 1])
            i += 1
        elif a == '--no-check':
            opts['check'] = False
        elif a in ('-h', '--help'):
            print(__doc__)
            return 0
        else:
            pos.append(a)
        i += 1
    if not pos:
        print(__doc__)
        return 2
    script_path = os.path.abspath(pos[0])
    step = pos[1] if len(pos) > 1 else 'all'
    if step not in ('all', 'timeline', 'audio', 'render', 'mux', 'cover'):
        sys.exit('build: unknown step "%s" (all|timeline|audio|render|mux|cover)' % step)
    try:
        with open(script_path, encoding='utf-8') as f:
            script = json.load(f)
    except (OSError, ValueError) as e:
        sys.exit('build: cannot read %s: %s' % (pos[0], e))
    series_dir = os.path.dirname(script_path)
    slug = script.get('series') or os.path.basename(series_dir)
    if slug != os.path.basename(series_dir):
        print('build: note: "series": "%s" but the script lives in series/%s/' % (slug, os.path.basename(series_dir)))
    ep = int(script.get('ep') or 1)
    build_dir = os.path.join(series_dir, 'build', 'ep%02d' % ep)
    out_mp4 = os.path.join(ROOT, 'out', '%s_ep%02d.mp4' % (slug, ep))
    relaxed = os.path.basename(series_dir).startswith('_')        # demo / test reels are not held to the episode length

    rep = Report()
    tl = resolve(script, rep)
    check_rules(script, tl, rep, relaxed)
    ext_ok, ext_out = external_check(script_path)
    print_table(tl)
    for w in rep.warnings:
        print('warning: ' + w)
    for e in rep.errors:
        print('ERROR: ' + e)
    if not ext_ok:
        print('ERROR: scripts/check_script.py rejected the script:\n' + ext_out)
    failed = bool(rep.errors) or not ext_ok
    if failed and opts['check']:
        print('build: %d rule violation(s): fix the script (SPEC section 3) or pass --no-check' % (len(rep.errors) + (0 if ext_ok else 1)))
        return 1
    os.makedirs(build_dir, exist_ok=True)
    with open(os.path.join(build_dir, 'timeline.json'), 'w', encoding='utf-8') as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    print('build: timeline -> %s' % os.path.relpath(os.path.join(build_dir, 'timeline.json'), ROOT))
    if step == 'timeline':
        return 0
    t0 = time.time()
    if step in ('all', 'audio'):
        step_audio(build_dir, tl)
    if step in ('all', 'render'):
        step_render(build_dir, opts['workers'])
    if step in ('all', 'mux'):
        step_mux(build_dir, tl, out_mp4)
    if step == 'cover' or (step == 'all' and script.get('cover')):
        step_cover(build_dir, os.path.join(ROOT, 'out', '%s_ep%02d_cover.png' % (slug, ep)))
    print('build: %s done in %.1f s' % (step, time.time() - t0))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
