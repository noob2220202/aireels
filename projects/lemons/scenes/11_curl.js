// curl: "마음을 가라앉혀 기체를 아끼며 웅크렸고, 호흡은 점점 뻑뻑해졌다고 합니다."
// Seen from straight above, as if we were sinking toward him: the top deck of the lattice in plan view, black, lit only in a
// pool around his amber light; he is small, hunched on the steel, alone in the vast dark. The camera descends (zoom +
// parallax snow rushing outward) and slowly unwinds its rotation the whole scene, ending on his chest at RING so the cut to
// 'thisisit' lands on the same gas clock.
//  '마음을 가라앉혀' -> his heartbeat slows (the light thumps slower, phase-locked to the heartbeat sfx), the handheld calms.
//  '기체를 아끼며'   -> the gas clock draws in around him at the level 'climb' left it; it drains, low, turning red.
//  '웅크렸고'        -> he curls up tight on the deck (huddle -> curl), the light pulls in.
//  '호흡은 점점'      -> the exhale bubbles rise toward us, fewer and slower each breath; tunnel vision starts to close.
//  '뻑뻑해졌다고'     -> the labored inhale: the iris tightens on the breath, the frame strains in, the clock nearly empty.
// Small tag: data.tag (his own account).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

const RING = { x: 540, y: 830, r: 300 };   // the clock's place for the cut into 'thisisit' (as in 'math')
const CH = [-104, -30];                    // his chest on the top deck (world; structure plan centred at 0, 0)
const DS = .62, RW = 150;                  // diver scale (top view), gas-clock radius (world)
const Z0 = .8, Z1 = RING.r / RW;           // zoom: far above -> the ring at RING.r
const F0 = .366;                           // where 'climb' left the clock
const BREATH = 1 / .26;                    // breathing sfx period: inhale at k*P (.42 P long), exhale from k*P + .5 P

const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// heartbeat from an integrated phase (the rate slows while he calms himself, beats stay locked to the sfx)
const thump = ph => { ph = ((ph % 1) + 1) % 1; return Math.exp(-ph * 16) + (ph > .2 ? .55 * Math.exp(-(ph - .2) * 16) : 0); };
function lifeGlow(ctx, b, x, y, a, s) {
  if (a <= 0) return;
  softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a * .8);
}
// marine snow in a top-down descent: layered flakes that stream outward from the centre as the camera sinks (parallax)
function snowDescent(ctx, t, z, rot, A, lights, a, seed) {
  if (a <= .01) return;
  const n = 70, cr = Math.cos(rot), sr = Math.sin(rot), dsp = 1.4;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const f = .35 + 1.5 * hi(i * 13 + seed);                       // depth: > 1 = closer to the lens than the deck
    const bx = (hi(i * 7 + seed) - .5) * 1700 + fb(t * .1 + i, seed) * 30, by = (hi(i * 11 + seed) - .5) * 2600 + fb(t * .09 + i * 1.7, seed + 3) * 30;
    const k = Math.pow(z, f) * .9, u = bx * k, v = by * k, px = A[0] + u * cr - v * sr, py = A[1] + u * sr + v * cr;
    if (px < -40 || px > W + 40 || py < -40 || py > H + 40) continue;
    let lum = .05 * f;
    for (const Lt of lights) { const dx = px - Lt.x, dy = py - Lt.y, d2 = dx * dx + dy * dy; if (d2 < Lt.r * Lt.r) lum += (1 - Math.sqrt(d2) / Lt.r) * (Lt.a == null ? 1 : Lt.a) * .7; }
    const r = (.8 + 1.6 * hi(i * 5 + seed)) * Math.pow(f, 1.4) * dsp;
    ctx.fillStyle = rgba(lum > .12 ? '#ffd9a8' : COL.snow, Math.min(.7, lum * a * (f > 1.2 ? .55 : 1)));
    ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// exhaled bubbles rising straight up toward the lens: they swell and slide outward from the vanishing point, then pass us
function bubblesUp(ctx, t, bursts, src, A, z, a) {
  ctx.save(); ctx.lineCap = 'round';
  bursts.forEach((B, bi) => {
    for (let i = 0; i < B.n; i++) {
      const t0 = B.t + hi(bi * 31 + i * 7) * B.spread, u = t - t0; if (u < 0) continue;
      const hgt = B.v * u * (1 + .12 * hi(i * 3 + bi)), kk = 1 / Math.max(.08, 1 - hgt / 950);
      if (kk > 5.5) continue;
      const wob = 7 * Math.sin(u * 4.5 + i * 1.9);
      const ox = (hi(i * 5 + bi * 3) - .5) * 26 + wob + fb(u * .7 + i, 7 + bi) * 10, oy = (hi(i * 9 + bi * 5) - .5) * 26 + fb(u * .6 + i * 2, 9 + bi) * 10;
      const sx = src[0] + ox * z, sy = src[1] + oy * z, px = A[0] + (sx - A[0]) * kk, py = A[1] + (sy - A[1]) * kk;
      const r = (2.8 + 4.5 * hi(i * 11 + bi)) * z * kk * .62, aa = a * B.a * clamp(1.15 - kk / 5.5) * clamp(u * 6);
      if (aa <= .01) continue;
      const lit = clamp(1 - Math.hypot(px - src[0], py - src[1]) / 260);
      ctx.strokeStyle = rgba(lit > .05 ? '#ffe2bd' : '#dff3ff', aa * (.55 + .4 * lit)); ctx.lineWidth = Math.max(1.2, r * .16);
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', aa * .45); ctx.beginPath(); ctx.arc(px - r * .35, py - r * .38, r * .22, 0, TAU); ctx.fill();
    }
  });
  ctx.restore();
}
// the lit world (seabed + structure) exists only inside the pools of light: it is drawn at half resolution into a buffer,
// cut to the union of soft holes (screen space) and drawn up over the pools' bounding box. In this renderer that is several
// times cheaper than the full-res lit structure at close-up scales plus a full-frame darkness veil; the softer steel reads
// as depth of field behind the full-res diver.
function poolWorld(ctx, holes, camT, draw) {
  const BW = 600, BH = 600;                                    // half-res buffer: covers up to 1200x1200 screen px of pools
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const h of holes) { x0 = Math.min(x0, h.x - h.r); y0 = Math.min(y0, h.y - h.r); x1 = Math.max(x1, h.x + h.r); y1 = Math.max(y1, h.y + h.r); }
  x0 = Math.max(0, Math.floor(x0 / 8) * 8); y0 = Math.max(0, Math.floor(y0 / 8) * 8); x1 = Math.min(1080, Math.ceil(x1 / 8) * 8); y1 = Math.min(1920, Math.ceil(y1 / 8) * 8);
  if (x1 - x0 > 2 * BW) { const c = Math.round(clamp(holes[0].x, x0 + BW, x1 - BW) / 8) * 8; x0 = c - BW; x1 = c + BW; }
  if (y1 - y0 > 2 * BH) { const c = Math.round(clamp(holes[0].y, y0 + BH, y1 - BH) / 8) * 8; y0 = c - BH; y1 = c + BH; }
  if (x1 - x0 < 8 || y1 - y0 < 8) return;
  const bw = x1 - x0, bh = y1 - y0, [b, x] = L.buf('lmCurlPW', BW, BH);
  x.clearRect(0, 0, BW, BH);
  x.save(); x.beginPath(); x.rect(0, 0, bw / 2, bh / 2); x.clip(); x.scale(.5, .5); x.translate(-x0, -y0); camT(x); draw(x); x.restore();
  const [m, mx] = L.buf('lmCurlPM', 135, 240);
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
// tunnel vision: a dark iris around (x, y), inner radius r0, soft width w
function iris(ctx, x, y, r0, w, a) {
  if (a <= .01) return;
  // gradient only over the annulus (r0 .. r0 + w); solid outside it: about half the cost of a full-frame gradient
  const g = ctx.createRadialGradient(x, y, r0, x, y, r0 + w); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, `rgba(0,1,1,${.7 * a})`); g.addColorStop(1, `rgba(0,1,1,${.97 * a})`);
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r0 + w + 1, 0, TAU); ctx.arc(x, y, r0, 0, TAU, true); ctx.fill();
  ctx.fillStyle = `rgba(0,1,1,${.97 * a})`; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r0 + w, 0, TAU, true); ctx.fill(); ctx.restore();
}

window.PK.scenes.curl = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tCalm = at('마음을', .02), tGas = at('기체를', .2), tSave = at('아끼며', .28), tCurl = at('웅크렸고', .34);
  const tBr = at('호흡은', .53), tMore = at('점점', .63), tHard = at('뻑뻑해졌다고', .72);
  const vEnd = info.sc.voice_end - info.sc.t0;

  // ---- heartbeat: 76 -> 46 bpm while he calms down, locked so beats land on the sfx ('웅크렸고', '호흡은' + .3) ----
  const b0 = 76, b1 = 46, ta = tCalm, tb = tCurl - .15;
  const phi = u => u < ta ? b0 * u / 60 : u < tb ? (b0 * ta + b0 * (u - ta) + (b1 - b0) * (u - ta) * (u - ta) / (2 * (tb - ta))) / 60 : (b0 * ta + (b0 + b1) / 2 * (tb - ta) + b1 * (u - tb)) / 60;
  const beat = thump(phi(t) - phi(tCurl));
  // ---- breathing (sfx): inhale [kP, kP + .42P], exhale from kP + .5P ----
  const inhale = k => Math.sin(Math.PI * clamp((t - k * BREATH) / (.42 * BREATH))) ** 1.5;
  const labored = P(t, tBr - .2, tHard + .3, E.inOutQ);
  const inh = Math.max(inhale(0) * .3, inhale(1) * (.35 + .65 * labored));

  // ---- the clock ----
  let frac = F0 - .1 * P(t, tGas, tMore, E.inOutQ);
  frac -= .16 * P(t, tMore, vEnd, E.inOutQ);
  frac -= .016 * P(t, vEnd, d);                         // ends at .09 (where 'thisisit' picks it up)
  const clockA = P(t, tGas - .05, tGas + .35, E.outQ), draw = E.inOutQ(P(t, tGas - .05, tGas + .55));

  // ---- camera: sinking toward him (zoom), rotation unwinding; held on his chest at RING ----
  const zk = P(t, -.4, d + .05, E.inOutQ);
  const z = Z0 * Math.pow(Z1 / Z0, zk) * (1 + .018 * inh * labored);
  const rot = lerp(-.42, 0, P(t, -.4, d, E.inOutQ));
  const calm = 1 - .65 * P(t, tCalm, tCurl, E.inOutQ);
  const dr = { x: fb(t * .35, 51) * 8 * calm, y: fb(t * .3, 52) * 8 * calm, r: fb(t * .25, 53) * .004 * calm };
  const sk = LM.shake(t, .18 * calm + .25 * labored * inh, 57);
  const A = [RING.x + dr.x + sk.x, RING.y + dr.y + sk.y], CR = rot + dr.r + sk.r, cR = Math.cos(CR), sR = Math.sin(CR);
  const toS = (wx, wy) => { const u = (wx - CH[0]) * z, v = (wy - CH[1]) * z; return [A[0] + u * cR - v * sR, A[1] + u * sR + v * cR]; };

  // ---- him: hunched -> curled tight on '웅크렸고' ----
  const cu = P(t, tCurl - .1, tCurl + .75, E.inOutQ);
  const lifeA = lerp(.95, .8, cu) * (1 - .12 * P(t, tHard, d));
  const DO = { pose: 'huddle', pose2: 'curl', mix: lerp(.35, 1, cu), dir: 1, rot: lerp(-.62, -.5, cu), idle: .35 * calm, tremble: .35 * labored * inh,
    life: lifeA, lifeS: LIFE_S, bpm: b1, phase: -tCurl, bailout: true, rim: '#ffc58a', rimA: .85, rim2A: 0, halo: 0, detail: .6, fill: '#030606', light: [CH[0] + 160, CH[1] - 200] };
  const dv = LM.diver(null, CH[0], CH[1], DS, t, DO);
  const lifeL = { x: CH[0], y: CH[1], r: lerp(300, 245, cu) * lerp(1, .82, zk), color: COL.amber, a: .9 * lifeA * (.85 + .15 * beat) };
  const lights = [lifeL];
  const sl = lights.map(Lt => { const p = toS(Lt.x, Lt.y); return { x: p[0], y: p[1], r: Lt.r * z, color: Lt.color, a: Lt.a }; });

  // ---- draw ----
  LM.sea(ctx, t, { dark: .975, lights: sl, seed: 31, haze: 0, snow: 0, murk: .8 });
  softGlow(ctx, sl[0].x, sl[0].y, Math.min(sl[0].r * .95, 430), COL.amber, .2 * sl[0].a);
  const camT = c => { c.translate(A[0], A[1]); c.rotate(CR); c.scale(z, z); c.translate(-CH[0], -CH[1]); };
  poolWorld(ctx, sl.map(Lt => ({ x: Lt.x, y: Lt.y, r: Lt.r * 1.08, a: 1 })), camT, c => LM.structure(c, 0, 0, 1, t, { view: 'top', lights, amb: .008 }));
  ctx.save(); camT(ctx);
  const R = LM.diver(ctx, CH[0], CH[1], DS, t, DO);
  lifeGlow(ctx, beat, R.chest[0], R.chest[1], lifeA, DS * .8);
  ctx.restore();
  snowDescent(ctx, t, z, CR, A, sl, .95, 17);

  // exhales: the burst before the scene (still rising), then one per breath, each fewer and slower
  const hd = toS(R.head[0], R.head[1]);
  bubblesUp(ctx, t, [
    { t: -BREATH * .5 - .1, n: 10, v: 260, a: .8, spread: .6 },
    { t: BREATH * .5, n: 10, v: 190, a: .9, spread: .8 },
    { t: BREATH * 1.5, n: 4, v: 110, a: .85, spread: .5 },
  ], hd, A, z, 1);

  // the gas clock, around him, draining; it rings in from slightly larger
  if (clockA > 0) {
    const c = toS(CH[0], CH[1]);
    LM.gasClock(ctx, c[0], c[1], RW * z * lerp(1.18, 1, draw), frac, t, { a: clockA * .95, w: lerp(4, 6.5, zk), bpm: 0 });
    // a slow pulse of the remaining arc with each heartbeat
    if (beat > .05) {
      const a0 = -Math.PI / 2 + (1 - frac) * TAU;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(PK.lerp2(COL.amber, COL.red, clamp((.3 - frac) / .3) * .9), .16 * beat * clockA);
      ctx.lineWidth = 18 + 10 * beat; ctx.beginPath(); ctx.arc(c[0], c[1], RW * z * lerp(1.18, 1, draw), a0, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    }
  }
  // tunnel vision closing in with the breath
  const tv = P(t, tBr - .4, d + .1, E.inOutQ);
  iris(ctx, A[0], A[1], lerp(980, 345, tv) * (1 - .08 * inh * labored), lerp(700, 300, tv), .25 + .75 * tv);

  LM.subBand(ctx, .84);
  PK.chip(ctx, D.tag || '', 540, 500, P(t, tCalm + .1, tCalm + .4) * (1 - P(t, d - .35, d - .05)), { size: 27, color: '#cfe8ff', border: 'rgba(150,210,255,.3)' });
  void tSave; void H;
};
})();
