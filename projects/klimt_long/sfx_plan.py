"""Writes SFX cues + music automation into script.json (anchored to narration words, with safe fallbacks)."""
import json, sys
p = sys.argv[1]
S = json.load(open(p))
def W(scene, *cands):
    say = next(s for s in S['scenes'] if s['id'] == scene)['say']
    for c in cands:
        if c in say:
            return c
    return None
def cue(type_, scene, word=None, off=0.0, at=None, **kw):
    d = {"type": type_, **kw}
    w = W(scene, *word) if isinstance(word, tuple) else (W(scene, word) if word else None)
    if w: d["word"] = w; d["off"] = off
    else: d["at"] = at if at is not None else off
    return d
SFX = {
 "hook": [cue("impact", "hook", at=0.0, size=1.0), cue("creak", "hook", "나왔다", -0.25, at=3.2, dur=0.6, db=-3), cue("shimmer", "hook", "나왔다", 0.05, at=3.5, db=-2)],
 "culprit": [cue("whoosh", "culprit", at=-0.2, dur=0.45, db=-4)] + [cue("type", "culprit", at=0.18 + i * 0.07, db=-8) for i in range(5)] +
            [cue("snap", "culprit", ("모른다",), 0.0, at=1.4, db=-3), cue("glitch", "culprit", ("모른다",), 0.25, at=1.6, dur=0.3, db=-9)],
 "y1996": [cue("glitch", "y1996", at=-0.12, dur=0.25, db=-10), cue("flap", "y1996", at=0.05, count=6, dur=0.45, db=-7), cue("thunk", "y1996", at=0.6, db=-4),
           cue("whoosh", "y1996", ("학생이", "학생"), -0.35, at=1.2, dur=0.4, db=-9), cue("bell", "y1996", ("얼굴",), 0.1, at=3.5, f=880.0, db=-6)],
 "xray": [cue("scan", "xray", at=0.1, dur=1.6, db=-12), cue("shimmer", "xray", ("모자",), 0.0, at=1.3, db=-7), cue("stamp", "xray", ("유일한", "이중", "두 겹"), 0.0, at=3.6, db=-4)],
 "vanish": [cue("flap", "vanish", ("1997년",), -0.1, at=1.2, count=9, dur=0.55, db=-7), cue("glitch", "vanish", ("사라졌다",), 0.15, at=3.4, dur=0.22, db=-10),
            cue("impact", "vanish", ("사라졌다",), 0.4, at=3.7, size=0.6, db=-6)],
 "roof": [cue("wind", "roof", at=0.0, dur=6.6, db=-16), cue("thunk", "roof", ("액자뿐", "액자"), 0.0, at=0.6, db=-8), cue("whoosh", "roof", ("천창으로", "천창"), 0.0, at=1.6, dur=0.6, db=-12),
          cue("tick", "roof", ("액자는",), -0.2, at=4.0, db=-2), cue("tick", "roof", ("액자는",), 0.15, at=4.3, db=-2), cue("slash", "roof", ("컸다",), 0.05, at=5.2, db=-4),
          cue("piano", "roof", ("컸다",), 0.1, at=5.3, f=146.83, db=-4)],
 "staff": [cue("slam", "staff", at=0.08, db=-6), cue("thunk", "staff", at=0.4, db=-8), cue("whoosh", "staff", ("증거",), -0.2, at=1.4, dur=0.5, db=-12),
           cue("stamp", "staff", ("없었다", "종결", "끝났다"), 0.02, at=2.4, db=0)],
 "fake": [cue("rustle", "fake", at=0.1, dur=0.9, db=-8), cue("thunk", "fake", at=0.2, db=-10), cue("scan", "fake", ("정교한",), -0.1, at=1.4, dur=0.8, db=-14),
          cue("stamp", "fake", ("가짜",), 0.02, at=2.4, db=0), cue("impact", "fake", ("가짜",), 0.05, at=2.45, size=0.5, db=-8)],
 "dna": [cue("glitch", "dna", at=-0.12, dur=0.25, db=-10), cue("scan", "dna", at=0.1, dur=2.4, db=-13), cue("tick", "dna", ("재수사",), 0.0, at=1.2, db=-4),
         cue("glitch", "dna", ("소득은", "성과는", "결과는"), -0.05, at=2.5, dur=0.3, db=-8), cue("thunk", "dna", ("소득은", "성과는", "결과는"), 0.0, at=2.5, db=-5)],
 "found": [cue("flap", "found", at=0.0, count=10, dur=0.6, db=-6), cue("whoosh", "found", ("정원사들이", "정원사"), -0.1, at=1.2, dur=0.5, db=-10),
           cue("snip", "found", ("정원사들이", "정원사"), 0.43, at=1.6, db=-6), cue("rustle", "found", ("정원사들이", "정원사"), 0.46, at=1.6, dur=0.9, db=-9),
           cue("snip", "found", ("담쟁이",), 0.25, at=2.0, db=-6), cue("snip", "found", ("담쟁이",), 0.55, at=2.3, db=-7), cue("rustle", "found", ("담쟁이",), 0.3, at=2.0, dur=0.8, db=-9),
           cue("creak", "found", ("열었다",), -0.02, at=3.6, dur=0.55, db=-4)],
 "bag": [cue("crinkle", "bag", ("쓰레기봉투",), 0.0, at=0.5, dur=1.0, db=-8), cue("revcymbal", "bag", ("그림",), -1.35, at=1.0, dur=1.4, db=-6),
         cue("braam", "bag", ("그림",), 0.0, at=2.4, db=-2), cue("shimmer", "bag", ("그림",), 0.02, at=2.4, db=-4)],
 "verdict": [cue("scan", "verdict", at=0.0, dur=1.0, db=-12), cue("whoosh", "verdict", ("뒷면",), -0.15, at=1.0, dur=0.35, db=-10),
             cue("tick", "verdict", ("뒷면",), 0.15, at=1.2, db=-3), cue("tick", "verdict", ("뒷면",), 0.33, at=1.4, db=-3), cue("tick", "verdict", ("뒷면",), 0.51, at=1.6, db=-3),
             cue("stamp", "verdict", ("진품",), 0.08, at=2.4, db=0), cue("flap", "verdict", ("6천만",), 0.0, at=3.2, count=12, dur=0.75, db=-10), cue("tick", "verdict", ("이상",), 0.1, at=4.0, db=-3)],
 "condition": [cue("piano", "condition", at=0.05, f=196.0, db=-6), cue("tick", "condition", ("검찰도", "검찰"), 0.0, at=2.2, db=-5),
               cue("piano", "condition", ("모른다고", "모른다"), 0.0, at=4.5, f=185.0, db=-5)],
 "letter": [cue("rustle", "letter", at=0.05, dur=0.6, db=-10)] + [cue("type", "letter", ("우리가", "자신들이", "훔쳐", "훔쳤다"), 0.05 + i * 0.11, at=0.5 + i * 0.11, db=-10) for i in range(10)] +
           [cue("stamp", "letter", ("미확인", "확인되지", "않았다"), 0.05, at=4.6, db=0)],
 "closed": [cue("slam", "closed", at=0.05, db=-2), cue("tick", "closed", ("공소시효는", "시효는", "절도죄"), 0.2, at=0.6, db=-4), cue("tick", "closed", ("2021년",), 0.1, at=2.6, db=-4),
            cue("stamp", "closed", ("종결됐다", "끝났다", "종결"), 0.1, at=4.8, db=0), cue("impact", "closed", ("종결됐다", "끝났다", "종결"), 0.12, at=4.8, size=0.7, db=-5)],
 "ending": [cue("piano", "ending", at=0.05, f=110.0, db=-4), cue("piano", "ending", ("누군가",), 0.0, at=1.8, f=103.83, db=-3),
            cue("rustle", "ending", from_="voice_end", at=0.05, dur=0.7, db=-6), cue("slam", "ending", at=0.62, db=-6)],
}
for s in S['scenes']:
    s['sfx'] = SFX.get(s['id'], [])
    for c in s['sfx']:
        if c.pop('from_', None): c['from'] = 'voice_end'
# the last ending slam is relative to voice end
S['scenes'][-1]['sfx'][-1]['from'] = 'voice_end'
def Wa(scene, *c):
    w = W(scene, *c); return f"@{scene}:{w}" if w else f"@{scene}+1.5"
S['music'] = {
  "root": 73.42, "rel_db": -7,
  "intensity": [[0, .75], ["@culprit", .6], ["@y1996", .3], ["@xray", .42], ["@vanish", .55], ["@roof", .4], ["@staff", .5], ["@fake", .55], ["@dna", .6],
                ["@found", .5], ["@bag", .82], ["@verdict", .95], ["@condition", .5], ["@letter", .6], ["@closed", .72], ["@ending", .4]],
  "gain": [[0, 0], [Wa('vanish', '사라졌다') + "+0.45" if W('vanish', '사라졌다') else "@vanish+3.5", 0], ["@roof", -14], ["@roof+1.2", -3], ["@staff", 0],
           [Wa('ending', '누군가') + "-0.1" if W('ending', '누군가') else "@ending+1.6", 0], [Wa('ending', '누군가') + "+0.15" if W('ending', '누군가') else "@ending+1.9", -18]],
  "pulse_start": "@found", "pulse_end": "@condition",
  "ticks": True, "tick_db": -4,
  "bells": [Wa('hook', '나왔다') + "+0.1", Wa('xray', '유일한', '이중') , Wa('bag', '그림') + "+0.1"], "bell_oct": 1.0,
}
json.dump(S, open(p, 'w'), ensure_ascii=False, indent=2)
print('ok', sum(len(s['sfx']) for s in S['scenes']), 'cues')
