// thisisit (real audio, BBC Outlook 2019): "But when it did come there was a definite realisation that this was it, and I really
// hope it doesn't hurt."
// Hard cut from 'curl' onto the same gas clock (RING, as in 'math'), now seen from the side: he lies curled on the top deck,
// a dim silhouette inside the ring, lit only by his own faint amber light. Very still: almost no camera motion, the voice
// carries it. 'But when it did come' -> the red head of the clock flares once; 'a definite realisation' -> the frame leans in
// a hair; 'this was it' -> the last sliver runs out: the head reaches twelve o'clock, a small last spark, and the ring's
// track fades away; the darkness deepens a step and the heartbeat steps down. 'I really hope it doesn't hurt' -> stillness:
// a few last tiny bubbles leave the helmet, his silhouette sinks into the black until only the faintest amber glow is left
// (he lives: it never goes out). Attribution card up while the voice plays.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const RING = { x: 540, y: 830, r: 300 };
const DS = 1.25;                          // diver scale (curled on the deck, chest at the ring centre)
const SS = DS * 1.92;                     // structure scale (same diver/structure ratio as the other scenes)
const F0 = .09;                           // where 'curl' left the clock

const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function lifeGlow(ctx, b, x, y, a, s) {
  if (a <= 0) return;
  softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a * .8);
}
// the lit world (seabed + structure) exists only inside the pools of light: it is drawn at half resolution into a buffer,
// cut to the union of soft holes (screen space) and drawn up over the pools' bounding box. In this renderer that is several
// times cheaper than the full-res lit structure at close-up scales plus a full-frame darkness veil; the softer steel reads
// as depth of field behind the full-res diver.
function poolWorld(ctx, holes, camT, draw) {
  const BW = 400, BH = 400;                                    // half-res buffer: covers up to 800x800 screen px of pools
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const h of holes) { x0 = Math.min(x0, h.x - h.r); y0 = Math.min(y0, h.y - h.r); x1 = Math.max(x1, h.x + h.r); y1 = Math.max(y1, h.y + h.r); }
  x0 = Math.max(0, Math.floor(x0 / 8) * 8); y0 = Math.max(0, Math.floor(y0 / 8) * 8); x1 = Math.min(1080, Math.ceil(x1 / 8) * 8); y1 = Math.min(1920, Math.ceil(y1 / 8) * 8);
  if (x1 - x0 > 2 * BW) { const c = Math.round(clamp(holes[0].x, x0 + BW, x1 - BW) / 8) * 8; x0 = c - BW; x1 = c + BW; }
  if (y1 - y0 > 2 * BH) { const c = Math.round(clamp(holes[0].y, y0 + BH, y1 - BH) / 8) * 8; y0 = c - BH; y1 = c + BH; }
  if (x1 - x0 < 8 || y1 - y0 < 8) return;
  const bw = x1 - x0, bh = y1 - y0, [b, x] = L.buf('lmItPW', BW, BH);
  x.clearRect(0, 0, BW, BH);
  x.save(); x.beginPath(); x.rect(0, 0, bw / 2, bh / 2); x.clip(); x.scale(.5, .5); x.translate(-x0, -y0); camT(x); draw(x); x.restore();
  const [m, mx] = L.buf('lmItPM', 135, 240);
  mx.clearRect(0, 0, 135, 240); mx.globalCompositeOperation = 'lighter';
  for (const h of holes) {
    const r = h.r / 8, a = clamp(h.a == null ? 1 : h.a); if (r < .5) continue;
    const g = mx.createRadialGradient(h.x / 8, h.y / 8, 0, h.x / 8, h.y / 8, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.45, `rgba(255,255,255,${a * .78})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    mx.fillStyle = g; mx.fillRect(h.x / 8 - r, h.y / 8 - r, 2 * r, 2 * r);
  }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, x0 / 8, y0 / 8, bw / 8, bh / 8, 0, 0, bw / 2, bh / 2); x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(b, 0, 0, bw / 2, bh / 2, x0, y0, bw, bh); ctx.restore();
}
const thump = ph => { ph = ((ph % 1) + 1) % 1; return Math.exp(-ph * 16) + (ph > .2 ? .55 * Math.exp(-(ph - .2) * 16) : 0); };
// subtitle chunk start/end times (scene-relative) for this clip, falling back to fractions of the voice
function chunks(info) {
  const sc = info.sc, S = (info.TL && info.TL.subs || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0, f = [[0, .23], [.23, .68], [.68, 1]];
  return f.map((q, i) => S[i] ? [S[i].t0 - sc.t0, S[i].t1 - sc.t0] : [lerp(v0, v1, q[0]), lerp(v0, v1, q[1])]);
}

window.PK.scenes.thisisit = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const [cCome, cReal, cHurt] = chunks(info);
  const vEnd = info.sc.voice_end - info.sc.t0;
  const tCome = cCome[0] + .25;                                     // 'come'
  const tIt = lerp(cReal[0], cReal[1], .8);                          // '...this was it'
  const tHurt = cHurt[0];

  // ---- the clock runs out on 'this was it' ----
  const frac = F0 * (1 - P(t, 0, tIt, E.inQ) * .55) * (1 - P(t, tIt - .7, tIt, E.inOutQ));
  const gone = P(t, tIt + .05, tIt + 1.1, E.inOutQ);                // the ring's track fades after the last spark
  const spark = Math.exp(-Math.pow((t - tIt) / .16, 2));
  const flare = Math.exp(-Math.pow((t - tCome - .1) / .25, 2));     // the red head flares once on 'when it did come'

  // ---- him, fading into the black; the heartbeat slows and steps down ----
  const fade = P(t, tIt - .2, tHurt + 1.1, E.inOutQ);
  const lifeA = lerp(.78, .34, fade) * (1 - .25 * P(t, vEnd, d + .3));
  const beat = thump((t + 1.35) * lerp(46, 38, P(t, 0, d)) / 60) * lerp(1, .55, fade);
  const z = 1 + .03 * P(t, cReal[0] - .2, d, E.inOutQ);              // leans in a hair on 'a definite realisation'
  const dr = { x: fb(t * .25, 71) * 2.5 * (1 - fade), y: fb(t * .22, 72) * 2.5 * (1 - fade) };
  const DO = { pose: 'curl', dir: 1, rot: .04, idle: .25 * (1 - fade), life: lifeA, lifeS: LIFE_S, bpm: 42, phase: 1.35, bailout: true,
    rim: '#ffc58a', rimA: lerp(.42, .06, fade), rim2A: 0, halo: 0, detail: lerp(.35, .05, fade), fill: '#020404', light: [RING.x + 220, RING.y - 320] };
  const C = [RING.x + dr.x, RING.y + dr.y];
  const lifeR = 330 * lerp(1, .7, fade);
  const sLight = { x: C[0], y: C[1], r: lifeR * z, color: COL.amber, a: .85 * lifeA * (.85 + .15 * beat) };

  // ---- draw ----
  LM.sea(ctx, t, { dark: .985, lights: [sLight], seed: 37, haze: 0, snow: .7 * (1 - .5 * fade), murk: .6, current: [0, -2] });
  softGlow(ctx, C[0], C[1], Math.min(sLight.r * .9, 440), COL.amber, .18 * sLight.a);
  const deckY = RING.y + 119 * DS + 2;                                // the curl pose rests its lowest point here
  const wl = [{ x: RING.x, y: RING.y, r: lifeR, color: COL.amber, a: sLight.a }];
  const camT = c => { c.translate(C[0], C[1]); c.scale(z, z); c.translate(-RING.x, -RING.y); };
  poolWorld(ctx, [{ x: C[0], y: C[1], r: lifeR * z * 1.12, a: 1 }], camT, c => LM.structure(c, RING.x + 260, deckY + 344 * SS, SS, t, { lights: wl, amb: .004 }));
  ctx.save(); camT(ctx);
  // the deck edge he lies on, catching the last of his light
  const eg = ctx.createLinearGradient(RING.x - 380, 0, RING.x + 380, 0);
  eg.addColorStop(0, rgba(COL.amber, 0)); eg.addColorStop(.5, rgba(COL.amber, .3 * lifeA)); eg.addColorStop(1, rgba(COL.amber, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = eg; ctx.fillRect(RING.x - 380, deckY - 3, 760, 4); ctx.restore();
  const R = LM.diver(ctx, RING.x, RING.y, DS, t, DO);
  // the last small bubbles: a short exhale at the cut, then a few thin strings, fewer and smaller
  LM.bubbles(ctx, t, R.head[0] + 6, R.head[1] - 48, { bursts: [-.05, tIt - .35], a: .42 * (1 - .4 * fade), s: 1.0, seed: 61, n: 6, rise: .8 });
  LM.bubbles(ctx, t, R.head[0] + 6, R.head[1] - 48, { bursts: [tHurt + .4], a: .3, s: .65, seed: 67, n: 3, rise: .6 });
  ctx.restore();
  // a step darker after 'this was it' (everything but the ember)
  const dk = .5 * P(t, tIt + .1, tHurt + 1.2, E.inOutQ);
  if (dk > 0) { ctx.save(); ctx.globalAlpha = dk; ctx.fillStyle = '#000101'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  lifeGlow(ctx, beat, R.chest[0] * z + C[0] - RING.x * z, R.chest[1] * z + C[1] - RING.y * z, lifeA * lerp(1, .8, fade), DS * .62 * lerp(1, .75, fade));

  // the gas clock, emptying; then only its fading track
  const ca = P(t, -.2, .05) * (1 - gone);
  if (ca > 0) {
    LM.gasClock(ctx, C[0], C[1], RING.r * z, frac, t, { a: ca * .95, w: 6.5 });
    if (flare > .02 && frac > .001) {
      const a0 = -Math.PI / 2 + (1 - frac) * TAU, hd = [C[0] + Math.cos(a0) * RING.r * z, C[1] + Math.sin(a0) * RING.r * z];
      LM.glow(ctx, hd[0], hd[1], 70, COL.red, .5 * flare);
    }
  }
  if (spark > .02) {
    const top = [C[0], C[1] - RING.r * z];
    LM.glow(ctx, top[0], top[1], 90, COL.red, .55 * spark); LM.glow(ctx, top[0], top[1], 26, '#fff1dc', .9 * spark);
  }

  LM.subBand(ctx, .84);
  const cA = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', cA, 1185);
};
})();
