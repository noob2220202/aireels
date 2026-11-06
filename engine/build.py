"""aireels build pipeline.

  python3 engine/build.py <project> tts          # TTS per scene -> build/timeline.json
  python3 engine/build.py <project> audio        # synth + mix -> build/mix.wav
  python3 engine/build.py <project> render       # frames -> build/video_only.mp4
  python3 engine/build.py <project> mux          # -> out/<name>.mp4
  python3 engine/build.py <project> all
  python3 engine/build.py <project> stills 0.5,3,8   # review frames
  python3 engine/build.py <project> sheet [n]        # contact sheet of n frames
"""
import asyncio
import hashlib
import json
import os
import re
import ssl
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CA = '/root/.ccr/ca-bundle.crt'


# ---------------- TTS ----------------
async def _tts(text, voice, rate, pitch, out_mp3):
    import edge_tts
    import edge_tts.communicate as c
    if Path(CA).exists():
        c._SSL_CTX = ssl.create_default_context(cafile=CA)
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
    words = []
    with open(out_mp3, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'t': ch['offset'] / 1e7, 'd': ch['duration'] / 1e7, 'w': ch['text']})
    return words


def tts(text, V, cache):
    key = hashlib.sha1(json.dumps([text, V], ensure_ascii=False).encode()).hexdigest()[:12]
    mp3 = cache / f'{key}.mp3'
    meta = cache / f'{key}.json'
    if not (mp3.exists() and meta.exists() and mp3.stat().st_size > 1000):
        for attempt in range(4):
            try:
                words = asyncio.run(_tts(text, V['name'], V.get('rate', '+0%'), V.get('pitch', '+0Hz'), mp3))
                break
            except Exception as e:  # network hiccup
                print('tts retry', attempt, e)
        meta.write_text(json.dumps(words, ensure_ascii=False))
    return key, mp3, json.loads(meta.read_text())


def ffprobe_dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]).decode())


# ---------------- word timing ----------------
def word_times(tts_text, bounds):
    """return start time for each space-separated word of tts_text."""
    words = tts_text.split()
    starts, pos = [], 0
    for w in words:
        i = tts_text.index(w, pos)
        starts.append(i)
        pos = i + len(w)
    # boundary char spans
    spans, cur = [], 0
    for b in bounds:
        j = tts_text.find(b['w'], cur)
        if j < 0:
            # tolerate normalisation differences: search loosely
            j = cur
        spans.append((j, j + max(1, len(b['w'])), b['t'], b['d']))
        cur = j + len(b['w'])
    out = []
    for s in starts:
        best = None
        for (a, e, t, d) in spans:
            if a <= s < e:
                best = t + d * (s - a) / max(1, e - a)
                break
            if a > s:
                best = t
                break
        if best is None:
            best = spans[-1][2] if spans else 0
        out.append(best)
    # monotonic
    for i in range(1, len(out)):
        out[i] = max(out[i], out[i - 1] + .01)
    return words, out


def unit_len(s):
    n = 0.0
    for ch in s:
        if '가' <= ch <= '힣':
            n += 1
        elif ch.isdigit() or ch.isalpha():
            n += .62
        elif ch == ' ':
            n += .3
        else:
            n += .35
    return n


def chunk_words(words, maxu=10.5):
    chunks, cur = [], []
    for i, w in enumerate(words):
        cand = ' '.join([x for _, x in cur] + [w])
        hard_break = cur and re.search(r'[.?!,…]$', cur[-1][1])
        if cur and (unit_len(cand) > maxu or hard_break):
            chunks.append(cur)
            cur = []
        cur.append((i, w))
    if cur:
        chunks.append(cur)
    return chunks


def clean_sub(s):
    s = re.sub(r'[.,]+$', '', s.strip())
    s = re.sub(r'(?<!\.)\.(?=\s)', '', s)
    return s


def word_spans(tts_text, bounds):
    """start/end time for each space-separated word, from WordBoundary events."""
    words = tts_text.split()
    cstart, pos = [], 0
    for w in words:
        i = tts_text.index(w, pos)
        cstart.append(i)
        pos = i + len(w)
    spans, cur = [], 0
    for b in bounds:
        j = tts_text.find(b['w'], cur)
        j = cur if j < 0 else j
        spans.append((j, j + max(1, len(b['w'])), b['t'], b['t'] + b['d']))
        cur = j + len(b['w'])
    owner = []
    for s in cstart:
        k = next((i for i, (a, e, _, _) in enumerate(spans) if a <= s < e), None)
        if k is None:
            k = next((i for i, (a, _, _, _) in enumerate(spans) if a > s), len(spans) - 1)
        owner.append(k)
    starts, ends = [], []
    for wi, s in enumerate(cstart):
        a, e, t, te = spans[owner[wi]]
        starts.append(t + (te - t) * (s - a) / max(1, e - a))
    for wi in range(len(words)):
        if wi + 1 < len(words) and owner[wi + 1] == owner[wi]:
            ends.append(starts[wi + 1])
        else:
            ends.append(spans[owner[wi]][3])
    for i in range(1, len(starts)):
        starts[i] = max(starts[i], starts[i - 1] + .01)
    return words, starts, ends


def continuous_tracks(S, V, B, cache):
    """One TTS pass for the whole script (natural flow between sentences), split into scenes by word timing."""
    sl = S['scenes']
    texts = [sc.get('tts', sc['say']) for sc in sl]
    full = ' '.join(t.strip() for t in texts)
    key, mp3, bounds = tts(full, V, cache)
    _, st, en = word_spans(full, bounds)
    counts = [len(t.split()) for t in texts]
    assert sum(counts) == len(st), (sum(counts), len(st))
    first = max(0, st[0] - .05)
    last = min(ffprobe_dur(mp3), en[-1] + .3)
    wav = cache / f'{key}_trim.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-ss', f'{first:.3f}', '-to', f'{last:.3f}',
                    '-ac', '1', '-ar', '48000', str(wav)], check=True)
    # tighten long pauses between words (keeps sentence intonation, removes dead air)
    mp = S.get('max_pause')
    if mp:
        import numpy as np
        import soundfile as sf
        x, sr = sf.read(str(wav), dtype='float32')
        cuts = []  # (start, end) in trimmed-audio seconds
        for i in range(len(st) - 1):
            g0, g1 = en[i] - first, st[i + 1] - first
            if g1 - g0 > mp:
                rem = (g1 - g0) - mp
                mid = (g0 + g1) / 2
                cuts.append((mid - rem / 2, mid + rem / 2))
        if cuts:
            keep, prev, fade = [], 0, int(.008 * sr)
            for a, b in cuts:
                keep.append(x[int(prev * sr):int(a * sr)])
                prev = b
            keep.append(x[int(prev * sr):])
            for k in range(1, len(keep)):
                if len(keep[k]) > fade and len(keep[k - 1]) > fade:
                    keep[k - 1][-fade:] *= np.linspace(1, 0, fade)
                    keep[k][:fade] *= np.linspace(0, 1, fade)
            sf.write(str(wav), np.concatenate(keep), sr)

            def remap(t):
                tt = t - first
                return first + tt - sum(min(max(0, tt - a), b - a) for a, b in cuts)
            st, en = [remap(t) for t in st], [remap(t) for t in en]
            last = first + len(np.concatenate(keep)) / sr
            print(f'pauses tightened: {len(cuts)} gaps, {sum(b - a for a, b in cuts):.2f}s removed')
    off = S.get('start_pad', .1) - first
    rows, idx = [], 0
    for k, sc in enumerate(sl):
        n = counts[k]
        dwords = sc['say'].split()
        assert len(dwords) == n, f"say/tts word count mismatch in {sc['id']}"
        ws = [x + off for x in st[idx:idx + n]]
        we = [x + off for x in en[idx:idx + n]]
        rows.append((sc, dwords, ws, we))
        idx += n
    scenes, subs, sfx = [], [], []
    t0s = [0.0] + [r[2][0] - r[0].get('lead', .12) for r in rows[1:]]
    for k, (sc, dwords, ws, we) in enumerate(rows):
        t0 = t0s[k]
        vt, vend = ws[0], we[-1]
        t1 = t0s[k + 1] if k + 1 < len(rows) else vend + S.get('end_pad', 1.0)
        words = [{'w': w, 't': round(t, 3)} for w, t in zip(dwords, ws)]
        chs = chunk_words(dwords, sc.get('maxu', S.get('maxu', 10.5)))
        for j, ch in enumerate(chs):
            a = ws[ch[0][0]]
            b = ws[chs[j + 1][0][0]] if j + 1 < len(chs) else min(vend + .12, t1 + .1)
            subs.append({'t0': round(a, 3), 't1': round(b, 3), 'lines': [clean_sub(' '.join(w for _, w in ch))], 'hl': sc.get('hl', [])})
        for c in sc.get('sfx', []):
            c = dict(c)
            if 'word' in c:
                m = next((x for x in words if c['word'] in x['w']), None)
                base = m['t'] if m else vt
            elif c.get('from') == 'voice_end':
                base = vend
            else:
                base = t0
            c['t'] = round(base + c.get('at', 0) + c.get('off', 0), 3)
            sfx.append(c)
        scenes.append({'id': sc['id'], 't0': round(t0, 3), 't1': round(t1, 3), 'trans': sc.get('trans'),
                       'voice_t': round(vt, 3), 'voice_end': round(vend, 3), 'words': words, 'data': sc.get('data', {})})
    voice = [{'file': str(wav.relative_to(B)), 't': round(S.get('start_pad', .1), 3), 'dur': round(last - first, 3)}]
    return scenes, voice, subs, sfx, scenes[-1]['t1']


# ---------------- build steps ----------------
def step_tts(P):
    S = json.loads((P / 'script.json').read_text())
    B = P / 'build'
    cache = B / 'tts'
    cache.mkdir(parents=True, exist_ok=True)
    V = S['voice']
    cursor = S.get('start_pad', .1)
    scenes, voice, subs, sfx = [], [], [], []
    continuous = S.get('narration') == 'continuous'
    if continuous:
        scenes, voice, subs, sfx, cursor = continuous_tracks(S, V, B, cache)
    for k, sc in enumerate([] if continuous else S['scenes']):
        say = sc['say']
        tts_text = sc.get('tts', say)
        key, mp3, bounds = tts(tts_text, dict(V, **sc.get('voice', {})), cache)
        full = ffprobe_dur(mp3)
        first = max(0, (bounds[0]['t'] if bounds else 0) - .05)
        last = (bounds[-1]['t'] + bounds[-1]['d'] + .18) if bounds else full
        last = min(full, last)
        wav = cache / f'{key}_trim.wav'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-ss', f'{first:.3f}', '-to', f'{last:.3f}',
                        '-ac', '1', '-ar', '48000', str(wav)], check=True)
        vdur = last - first
        lead = sc.get('lead', 0.0)
        tail = sc.get('tail', .22)
        dur = max(sc.get('min', 0), lead + vdur + tail)
        if k == len(S['scenes']) - 1:
            dur += S.get('end_pad', 1.0)
        t0 = cursor
        vt = t0 + lead
        twords, ttimes = word_times(tts_text, bounds)
        dwords = say.split()
        if len(dwords) == len(twords):
            dtimes = ttimes
        else:  # proportional fallback
            dtimes = [ttimes[min(len(ttimes) - 1, int(i * len(ttimes) / len(dwords)))] for i in range(len(dwords))]
        abs_times = [vt + x - first for x in dtimes]
        words = [{'w': w, 't': round(t, 3)} for w, t in zip(dwords, abs_times)]
        vend = vt + vdur
        # subtitle chunks
        if sc.get('subs'):
            # manual chunks: list of strings, each must start with a word of `say`
            idx, chs = 0, []
            for ch in sc['subs']:
                n = len(ch.replace('|', ' ').split())
                chs.append((idx, ch))
                idx += n
            for j, (wi, ch) in enumerate(chs):
                a = abs_times[wi]
                b = abs_times[chs[j + 1][0]] if j + 1 < len(chs) else vend + .1
                subs.append({'t0': round(a, 3), 't1': round(b, 3), 'lines': [clean_sub(x) for x in ch.split('|')], 'hl': sc.get('hl', [])})
        else:
            chs = chunk_words(dwords, sc.get('maxu', S.get('maxu', 10.5)))
            for j, ch in enumerate(chs):
                a = abs_times[ch[0][0]]
                b = abs_times[chs[j + 1][0][0]] if j + 1 < len(chs) else vend + .1
                subs.append({'t0': round(a, 3), 't1': round(b, 3), 'lines': [clean_sub(' '.join(w for _, w in ch))], 'hl': sc.get('hl', [])})
        voice.append({'file': str(wav.relative_to(B)), 't': round(vt, 3), 'dur': round(vdur, 3)})
        for c in sc.get('sfx', []):
            c = dict(c)
            if 'word' in c:
                m = next((x for x in words if c['word'] in x['w']), None)
                base = m['t'] if m else vt
            elif c.get('from') == 'voice_end':
                base = vend
            else:
                base = t0
            c['t'] = round(base + c.get('at', 0) + c.get('off', 0), 3)
            sfx.append(c)
        scenes.append({'id': sc['id'], 't0': round(t0, 3), 't1': round(t0 + dur, 3), 'trans': sc.get('trans'),
                       'voice_t': round(vt, 3), 'voice_end': round(vend, 3), 'words': words, 'data': sc.get('data', {})})
        cursor = t0 + dur
    # optional: convert every narration clip into a reference voice (your own voice only)
    if V.get('clone_ref') and not os.environ.get('AIREELS_NO_CLONE'):
        ref = (ROOT / V['clone_ref']).resolve()
        steps = int(V.get('clone_steps', 25))
        tag = hashlib.sha1(ref.read_bytes()).hexdigest()[:8] + f'_{steps}'
        todo = []
        for v in voice:
            src = B / v['file']
            dst = src.with_name(src.stem + f'_vc_{tag}_{hashlib.sha1(src.read_bytes()).hexdigest()[:8]}.wav')
            if not dst.exists():
                todo.append(f'{src}:{dst}')
            v['file'] = str(dst.relative_to(B))
        if todo:
            print(f'voice clone: converting {len(todo)} clip(s) to {ref.name} (CPU, takes a while)')
            subprocess.run([str(ROOT / '.vendor' / 'vcenv' / 'bin' / 'python'), str(ROOT / 'engine' / 'voice_convert.py'),
                            '--ref', str(ref), '--steps', str(steps), *todo], check=True)
    TL = {'duration': round(cursor, 3), 'fps': S.get('fps', 30), 'scenes': scenes, 'subs': subs, 'voice': voice,
          'sfx': sfx + [dict(c) for c in S.get('global_sfx', [])], 'music': S.get('music', {}), 'title': S.get('title', {}),
          'voice_db': S.get('voice_db', 0), 'voice_match': S.get('voice_match'), 'sfx_rel_db': S.get('sfx_rel_db', 12), 'meta': S.get('meta', {})}
    # global music keyframes may reference scene ids: ["@scene_id", value] or ["@scene_id+0.5", v]
    def resolve(tk):
        # "@scene", "@scene+0.3", "@scene:word-0.1", "@scene:end" (voice end)
        if isinstance(tk, str) and tk.startswith('@'):
            m = re.match(r'@([\w-]+)(?::([^+-]+))?([+-][\d.]+)?$', tk)
            sc = next(s for s in scenes if s['id'] == m.group(1))
            base = sc['t0']
            if m.group(2) == 'end':
                base = sc['voice_end']
            elif m.group(2):
                base = next(w['t'] for w in sc['words'] if m.group(2) in w['w'])
            return round(base + float(m.group(3) or 0), 3)
        return tk
    M = TL['music']
    if 'intensity' in M:
        M['intensity'] = sorted([[resolve(a), b] for a, b in M['intensity']])
    if 'bells' in M:
        M['bells'] = [resolve(x) for x in M['bells']]
    for k in ('pulse_start', 'pulse_end'):
        if k in M:
            M[k] = resolve(M[k])
    if 'gain' in M:
        M['gain'] = sorted([[resolve(a), b] for a, b in M['gain']])
    if 'pulse_stops' in M:
        M['pulse_stops'] = [[resolve(a), resolve(b)] for a, b in M['pulse_stops']]
    for c in TL['sfx']:
        if 'abs' in c:
            c['t'] = resolve(c['abs'])
    (B / 'timeline.json').write_text(json.dumps(TL, ensure_ascii=False, indent=1))
    print(f"timeline: {TL['duration']:.2f}s, {len(scenes)} scenes, {len(subs)} subtitle chunks")
    for s in scenes:
        print(f"  {s['id']:<12} {s['t0']:6.2f} -> {s['t1']:6.2f}  ({s['t1'] - s['t0']:.2f}s)")
    return TL


def step_audio(P):
    subprocess.run([sys.executable, str(ROOT / 'engine' / 'audio.py'), str(P)], check=True)


def step_render(P, extra=()):
    subprocess.run(['node', str(ROOT / 'engine' / 'render.cjs'), str(P), *extra], check=True)


def step_mux(P):
    B = P / 'build'
    S = json.loads((P / 'script.json').read_text())
    out = ROOT / 'out'
    out.mkdir(exist_ok=True)
    name = S.get('name', P.name)
    final = out / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(B / 'video_only.mp4'), '-i', str(B / 'mix.wav'),
                    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '14M', '-bufsize', '28M',
                    '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
                    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', str(final)], check=True)
    print(final)
    return final


def step_sheet(P, n=12):
    TL = json.loads((P / 'build' / 'timeline.json').read_text())
    d = TL['duration']
    ts = [round(d * (i + .5) / n, 2) for i in range(n)]
    sheet(P, ts)


def sheet(P, ts, cols=4, tag='sheet'):
    from PIL import Image, ImageDraw
    sd = P / 'build' / 'stills'
    step_render(P, ['--stills', ','.join(map(str, ts)), '--outdir', str(sd)])
    ims = [Image.open(sd / f'still_{t:06.2f}.png').convert('RGB').resize((270, 480)) for t in ts]
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * 274, rows * 504), (30, 30, 30))
    dr = ImageDraw.Draw(S)
    for i, (im, t) in enumerate(zip(ims, ts)):
        x, y = (i % cols) * 274 + 2, (i // cols) * 504 + 2
        S.paste(im, (x, y))
        dr.text((x + 4, y + 484), f'{t:.2f}s', fill=(255, 255, 0))
    f = P / 'build' / f'{tag}.jpg'
    S.save(f, quality=88)
    print(f)


if __name__ == '__main__':
    P = Path(sys.argv[1]).resolve()
    cmd = sys.argv[2]
    if cmd == 'tts':
        step_tts(P)
    elif cmd == 'audio':
        step_audio(P)
    elif cmd == 'render':
        step_render(P, sys.argv[3:])
    elif cmd == 'mux':
        step_mux(P)
    elif cmd == 'stills':
        sheet(P, [float(x) for x in sys.argv[3].split(',')], tag=sys.argv[4] if len(sys.argv) > 4 else 'stills')
    elif cmd == 'sheet':
        step_sheet(P, int(sys.argv[3]) if len(sys.argv) > 3 else 12)
    elif cmd == 'all':
        step_tts(P)
        step_audio(P)
        step_render(P)
        step_mux(P)
