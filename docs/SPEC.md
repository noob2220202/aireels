# aireels — webtoon cut-drama pipeline (SPEC)

Shared contract for everyone working in this repo. Read it fully before writing code or scripts.

## 1. What we make

- **Serialized short drama for Instagram Reels**: one series = 24 episodes, each a ~60 s vertical video (1080x1920, 30 fps, H.264 + AAC, -14 LUFS).
- **Look**: a Korean **webtoon / cut-drama (컷드라마)**: drawn panels ("cuts") with characters, speech bubbles and 의성어, shown one after another with **light motion** (slow camera moves, blinks, hair sway, blush, bubbles popping in, sparkles/hearts, webtoon-scroll transitions).
- **No voice.** Dialogue is carried by speech bubbles; sound = background music + sound effects, all synthesized by our own code.
- **All art is drawn by our own code** (Canvas 2D paths/gradients). No image-generation models, no photos, no traced or copied artwork, no real brands/logos, no real people. Characters and story are original.
- First series: a sweet neighbour/everyday romance (이웃·일상 로맨스), wholesome, adult leads (late 20s).
- **Production economics matter most.** The art kit (characters, backgrounds, props) and the engine are built once; after that **an episode is only a JSON script**. No per-episode drawing code unless a new background/prop/pose is truly needed (then it is added to the shared kit).

## 2. Repo layout

```
docs/SPEC.md                 this file
assets/fonts/*.ttf           Korean fonts (run scripts/get_fonts.sh; not committed)
engine/
  build.py                   script.json -> build/timeline.json -> audio -> frames -> mp4   (CLI, see §7)
  render.cjs                 Playwright (chromium) deterministic frame renderer -> ffmpeg
  player.html, player.js     loads lib + toon kit + series cast + timeline, exposes window.renderFrame(t)
  lib.js                     canvas helpers: easing, text layout, bubbles, panels, camera, fx, transitions
  audio.py                   procedural music + SFX from timeline.json -> wav
  toon/                      THE ART KIT (window.TOON): characters, backgrounds, props  (see §5)
  toon_stub.js               placeholder TOON so the engine works before the kit exists
series/<slug>/
  bible.md                   series bible (premise, characters, tone, rules)
  outline.json               24 episode loglines
  cast.js                    character definitions for this series (TOON.defineCharacter(...))
  ep01.json ... ep24.json    episode scripts (§3)
  build/epNN/                build products (gitignored)
out/<slug>_epNN.mp4          finished videos (gitignored)
lab/                         art-style experiments
```

Fonts (family names as registered by the player via @font-face from assets/fonts):
`Pretendard` (Medium/SemiBold/Bold/ExtraBold: UI, bubbles), `Gowun Dodum` (soft bubble text), `Gowun Batang` (inner thoughts, narration), `Gaegu` (handwritten, cute asides), `Nanum Pen` (handwriting), `Jua` (round display, 의성어), `Black Han Sans` (impact 의성어/titles), `Dongle` (cute round bold).

## 3. Episode script (`series/<slug>/epNN.json`)

Writers never compute pixels. They describe each cut; the engine resolves framing, bubble placement and timing.

```jsonc
{
  "series": "slug", "seriesTitle": "시리즈 제목", "ep": 1, "epTitle": "부제",
  "music": [ { "from": "c01", "mood": "sweet" }, { "from": "c07", "mood": "flutter" } ],
  "cuts": [
    {
      "id": "c01",
      "layout": "full",                 // panel layout preset, see below
      "page": 1,                        // cuts with the same page number stay on screen together (webtoon page)
      "bg": "hallway", "time": "evening",       // background id from the kit + time of day: day|evening|night|dawn|indoor
      "cam": "pushIn",                  // camera move inside the panel: still|pushIn|pullOut|panLeft|panRight|tiltUp|tiltDown|drift|shake
      "actors": [
        { "who": "seoa", "shot": "bust", "at": "left", "facing": "right",
          "pose": "hold", "held": "box", "expr": "surprised",
          "keys": [ { "at": 1.6, "expr": "shy", "blush": 1 } ],       // timed changes (seconds from cut start, or "b2" = when bubble 2 appears)
          "emote": "sweat",                                            // heart|sweat|exclaim|question|sparkle|anger|gloom|note|zzz|blushLines
          "enter": "right" }                                           // optional slide-in: left|right|up|down|fade|pop
      ],
      "props": [ { "id": "box", "at": [0.6, 0.8], "scale": 1 } ],     // free-standing props (stage fractions)
      "bubbles": [
        { "who": "seoa", "type": "speech", "text": "저기… 혹시 옆집이세요?" },
        { "who": "jun", "type": "thought", "text": "뭐지, 이 사람" },
        { "type": "sfx", "text": "두근", "near": "seoa" },
        { "type": "narration", "text": "그날 저녁," }
      ],
      "fx": [ "sparkle" ],              // panel fx: sparkle|hearts|petals|speedlines|focuslines|flash|vignette|rain|bokeh|pinkMood|gloomMood|shake|heartbeat
      "sfx": [ { "type": "doorbell", "at": 0.2 } ],
      "trans": "scroll",               // transition INTO this cut: cut|fade|scroll|push|whip|flash|iris
      "dur": 4.0                       // optional override; otherwise computed from the bubbles
    }
  ],
  "end": { "text": "다음 화에 계속", "teaser": "\"…그 택배, 제 건데요?\"" }
}
```

**Layouts** (`layout`): `full` (full-bleed 1080x1920), `tall` (one framed panel with page margins), `stack2a|stack2b` (two stacked panels), `big+small:a|b` (60/40), `stack3a|b|c`, `inset` (a small close-up panel popping over the previous cut, e.g. eyes, hands, a phone screen). Cuts sharing a `page` accumulate on the page; a new `page` scrolls the old page away. Use full-bleed for emotional peaks, stacked panels for quick back-and-forth.

**Shots** (`shot`): `closeup` (face), `bust`, `waist`, `full`, `eyes` (extreme close-up strip), `hands`, `back` (over-the-shoulder is done with two actors, one `facing: "back"`). `at`: `left|center|right` or a 0..1 fraction. `facing`: `left|right|front|back`.

**Bubble types**: `speech`, `thought` (cloud/soft, no hard tail), `shout` (spiky, big bold text), `whisper` (dashed, small grey text), `narration` (caption box), `sfx` (free 의성어/의태어 lettering, rotated/coloured), `text` (phone message bubble; `from: "me"|"them"`), `caption` (centred text on a plain colour card, e.g. "일주일 뒤").
Bubbles appear in order. Reading time per bubble = `clamp(0.9 + 0.075 * (non-space characters), 1.3, 4.5)` s; a cut lasts `0.5 + sum(reading times) + 0.6` s unless `dur` is given; a cut without bubbles defaults to 2.0 s.

**Writing rules** (hard): one bubble <= 2 lines, <= 13 characters per line (the engine wraps; write <= 26 characters, shorter is better); <= 3 bubbles per cut; 8-13 cuts per episode; total computed duration 54-63 s; the first cut is the hook (no title card before it: the series/episode badge is an overlay); the last cut is a cliffhanger or 심쿵 beat followed by the end card (2.5 s, included in the total).

**Canonical expressions** (`expr`): neutral, smile, softsmile, laugh, shy, flustered, surprised, sad, teary, pout, angry, annoyed, wink, closed, sleepy, love, nervous, thinking, smirk, shock.
**Canonical poses** (`pose`): stand, wave, hold (object at chest, `held` = prop id), reachOut (offering), handToMouth, handOnHead (embarrassed scratch), armsCrossed, cheekHands, phone, point, bow, peek (around a door edge), lean, sit, walk, run.

## 4. Screen layout

- Canvas 1080x1920. Instagram UI covers: top ~0-190 (header), bottom ~1560-1920 (caption, audio), right column x > 950 for y 900-1560 (buttons). **No bubble text or faces there.** Art may bleed underneath.
- Persistent overlay: small series title + `EP.01` badge at top-left around y 215-275 (subtle, semi-transparent pill).
- Bubble text: Pretendard SemiBold/Gowun Dodum 52-60 px for speech (must be readable on a phone at arm's length), min 40 px for whispers/asides.
- Bubbles must never cover the speaker's or listener's eyes/mouth; tails point at the speaker's head.

## 5. Art kit interface (`window.TOON`)

Loaded before the series cast. The engine only talks to the kit through this interface.

```js
TOON.defineCharacter(id, def)          // series/<slug>/cast.js registers the cast (palette, hair style, outfits, body type, age feel)
TOON.metrics(id) -> { height, headTop, headCenter:[x,y], headR, eyeY, chinY, shoulderY, chestY, waistY, hipY, kneeY }
                                       // rig units, origin = feet centre on the ground, y negative upward
TOON.drawCharacter(ctx, id, state, t)  // draws at the origin in rig units (1 unit = 1 px at scale 1); the caller sets the transform
   state = {
     view: 'front' | 'q' | 'side' | 'back',   // 'q' (3/4) and 'side' are drawn facing screen-RIGHT; flip mirrors
     flip: false,
     pose: 'stand', held: null | propId,
     expr: 'neutral', exprMix: { to: 'smile', k: 0..1 } | undefined,   // cross-fade between expressions
     blink: 0..1 | undefined (auto, deterministic from t), mouth: 0..1 | undefined, blush: 0..1,
     look: [x, y] in -1..1, headTilt: deg, lean: deg, hairSway: -1..1 | undefined (auto), breath: undefined (auto),
     outfit: 'default' | ..., light: 'day' | 'evening' | 'night' | 'dawn' | 'indoor',
     alpha: 1
   }
TOON.expressions, TOON.poses           // arrays of supported names (unknown names fall back to neutral/stand with a console.warn)
TOON.backgrounds[id](ctx, w, h, t, opts)   // fills a w x h stage; opts = { time, cam: {x, y, z} for parallax, blur: 0..1 }
TOON.props[id](ctx, t, opts)           // draws around the origin, ~rig units
TOON.emote(ctx, kind, x, y, s, t)      // heart, sweat, exclaim, question, sparkle, anger, gloom, note, zzz
```

Rules for kit code: pure functions of their arguments and `t` (no `Math.random`, `Date`, `performance.now`); cache sprites lazily; a full character draws in < 12 ms; no full-canvas `ctx.filter` blur per frame.

## 6. Timeline (`build/epNN/timeline.json`)

`build.py` resolves a script into a timeline; the player and `audio.py` only read the timeline.

```jsonc
{
  "fps": 30, "w": 1080, "h": 1920, "duration": 59.4,
  "meta": { "series": "slug", "seriesTitle": "…", "ep": 1, "epTitle": "…" },
  "cuts": [ { "id": "c01", "t0": 0.0, "t1": 4.2, "page": 1, "layout": "full",
              "trans": { "type": "cut", "dur": 0 },
              "bubbles": [ { "type": "speech", "who": "seoa", "text": "…", "t0": 0.5, "t1": 4.2 } ],
              "...": "all other cut fields copied from the script" } ],
  "end": { "t0": 56.9, "t1": 59.4, "text": "다음 화에 계속", "teaser": "…" },
  "audio": {
    "music": [ { "t": 0.0, "mood": "sweet" }, { "t": 31.2, "mood": "flutter" } ],     // moods: sweet|comic|flutter|calm|sad|tension|bright
    "sfx":   [ { "t": 0.5, "type": "pop", "gain": 0.6 }, { "t": 4.2, "type": "whoosh" } ]
  }
}
```

SFX vocabulary: pop (bubble), pop2, whoosh, scroll, ding, sparkle, heartbeat (single thump-thump), heartbeatLoop, doorbell, knock, doorOpen, doorClose, footsteps, thud, rustle, phoneBuzz, messageIn, keyClick, cat (short meow), birds, cicada, rainLoop, cityNight, elevatorDing, plateClink, sip, gasp (non-vocal airy), comicBoing, sting (end card).
`build.py` auto-adds: a soft `pop` per speech/thought bubble, `whoosh`/`scroll` on transitions, `heartbeat` with a `heart` emote or `heartbeat` fx, `sparkle` with sparkle fx, `sting` at the end card.

## 7. CLI

```
python3 engine/build.py series/<slug>/ep01.json            # all steps -> out/<slug>_ep01.mp4
python3 engine/build.py series/<slug>/ep01.json timeline   # only resolve + print the cut table (id, t0-t1, bubbles) and total duration; exit 1 if rules in §3 are violated
python3 engine/build.py series/<slug>/ep01.json audio|render|mux
node engine/render.cjs series/<slug>/build/ep01 --stills 0.5,3.2,10 --outdir <dir>     # PNG stills at absolute seconds
node engine/render.cjs series/<slug>/build/ep01 --cover --out out/<slug>_ep01_cover.png
```

## 8. Working rules

- Chromium + Playwright are pre-installed: `require('playwright')` works from any directory and `chromium.launch()` needs no options. Do not install another Playwright.
- Verify visually: render stills, make a contact sheet if useful, and LOOK at the images (Read tool). Judge legibility at phone size (downscale to 360x640).
- The machine has 4 CPU cores shared by several agents: keep still batches small (<= 30 per call) and do not run full video renders unless your task says so.
- Only delete files inside directories you created. Do not `git commit` (the orchestrator commits).
- Deterministic output: the same timeline must render identical frames.
