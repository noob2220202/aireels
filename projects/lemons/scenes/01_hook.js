// hook: "북해 수심 약 90미터, 잠수사의 생명줄이 끊겼습니다."
// Cold open in black-green North Sea water. From the first frame the camera is sinking down a braided umbilical (amber pulses
// running down it) through drifting silt; a depth ruler scrolls on the left. On '90미터,' the descent settles on the seabed
// lattice structure: a lone faceless sat diver crouched on its top deck (amber life-light, cold helmet lamp), his line running
// down under the protruding bucket and up into the dark; a '수심 약 90m' chip pops. '잠수사의' -> slow push. '생명줄이' -> the line
// is dragged into a bowstring: it straightens, vibrates and grinds at the bucket lip, the diver is pulled back. '끊겼습니다.' -> it
// SNAPS: white flash, sparks, frayed ends whip away, the helmet lamp flickers out, the world freezes for a beat and jolts, then
// only his amber heartbeat is left. The gas clock rings in around him, full, and starts draining; the camera pushes into it so
// the cut to 'math' lands on the same ring, big and centred (RING).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;

// ---- world (identity camera = the establishing frame) ----
const SX = 296, SY = 1215, SS = 1.22;                 // structure base centre / scale (top deck at SY - 344*SS)
const DX = 470, DS = .64;                             // diver on the top deck
const TOP = [985, -1700];                            // the umbilical runs up to the bell, far above
const RING = { x: 540, y: 830, r: 300 };              // where the gas clock lands for the cut into 'math'
const DOPT = { pose: 'crouch', dir: -1, anchor: 'base', rim: '#9fd8ff', halo: .26 };
// cheap big glows: in this renderer a radial-gradient fill is ~2.5x cheaper than a scaled sprite at large radii, so the
// water haze and the big part of his life-light are drawn here (the kit diver gets a tiny lifeS so its own glows stay small)
const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function haze(ctx, lights, k = 1, cap = 640) { for (const Lt of lights) softGlow(ctx, Lt.x, Lt.y, Math.min(Lt.r * .9, cap), Lt.color, .24 * (Lt.a == null ? 1 : Lt.a) * k); }
function lifeGlow(ctx, t, x, y, a, s, bpm) {
  if (a <= 0) return; const b = PK.beat(t, bpm);
  softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a * .8);
}
const lifeLight = (c, r, a, t, bpm) => ({ x: c[0], y: c[1], r, color: COL.amber, a: .9 * a * (.85 + .15 * PK.beat(t, bpm)) });

function wordT(info, w, frac) { return PK.at(info, w, frac); }
// screen <- world for camera c = {ax, ay, cx, cy, z}
const toS = (c, x, y) => [(x - c.cx) * c.z + c.ax, (y - c.cy) * c.z + c.ay];

// near-field silt streaks that show vertical camera motion (vy px/s on screen, + = the camera sinks, silt rises)
function streaks(ctx, t, vy, a, seed, lights, camY) {
  if (a <= .004) return;
  const n = 46, len = clamp(Math.abs(vy) * .045, 2, 90), dirY = vy >= 0 ? 1 : -1;
  ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = .5 + hi(i * 7 + seed) * .9, x = hi(i * 3 + seed) * (W + 80) - 40 + fb(t * .2 + i, seed + 3) * 30;
    const y = ((hi(i * 5 + seed) * (H + 200) - t * 26 * z - camY * z) % (H + 200) + H + 200) % (H + 200) - 100;
    let lum = .1;
    for (const Lt of lights) { const dx = x - Lt.x, dy = y - Lt.y, d2 = dx * dx + dy * dy; if (d2 < Lt.r * Lt.r) lum += (1 - Math.sqrt(d2) / Lt.r) * (Lt.a == null ? 1 : Lt.a) * .8; }
    ctx.strokeStyle = rgba('#bcd9d4', Math.min(.6, a * lum * z)); ctx.lineWidth = .8 + z * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dirY * len * z); ctx.stroke();
  }
  ctx.restore();
}

window.PK.scenes.hook = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const tDep = wordT(info, '90미터', .22), tJam = wordT(info, '잠수사의', .45), tLine = wordT(info, '생명줄이', .6), tCut = wordT(info, '끊겼습니다', .75);
  const cutU = t - tCut, after = cutU >= 0 ? 1 : 0;
  // world clock: holds for a beat on the snap (freeze), then runs on
  const tm = t < tCut ? t : t < tCut + .1 ? tCut : t - .1;
  const strain = P(t, tLine - .35, tCut - .05, E.inQ);              // the line drags into a bowstring
  const pull = strain * (1 - after);

  // ---- geometry (no drawing): structure, diver, line ----
  const st = LM.structure(null, SX, SY, SS, tm);
  const fallK = P(t, tCut, tCut + .5, E.outQ);
  const dOpt = Object.assign({}, DOPT, {
    adj: { T: lerp(.7, .5, pull) + .22 * fallK, h: lerp(.1, -.08, pull) + .12 * fallK },
    life: 1, lifeS: LIFE_S, bpm: after ? 112 : lerp(80, 104, strain), tremble: .5 * pull,
    rim: after ? '#ffc58a' : '#9fd8ff', rimA: lerp(1, .5, fallK), rim2A: lerp(.18, .08, fallK), halo: lerp(.26, .1, fallK),
  });
  const dX = DX + 9 * pull - 4 * fallK + fb(tm * .4, 7) * 3, dY = st.topY + 6;
  const lampOn = t < tCut ? 1 : (hi(Math.floor(t * 38)) > .45 ? .75 : .08) * (1 - P(t, tCut + .04, tCut + .34));
  dOpt.lamp = lampOn; dOpt.lampAng = 2.25 + fb(tm * .3, 9) * .08 - .25 * pull;
  const dv = LM.diver(null, dX, dY, DS, tm, dOpt);
  const hook = [st.hook[0] + 4, st.hook[1] + 9];
  const umbPts = () => [TOP, hook, [dv.umb[0] + 70, dv.umb[1] + 44 - 20 * pull], dv.umb];
  const tension = lerp(.58, 1, strain);
  const UO = { w: 15, lit: .5 + .12 * pull, tension, vib: 6.5, sway: 9, pulse: .9 * (1 - pull * .4), pulseSpeed: 560, glow: .35, pulseColor: COL.amber };
  // the line parts in the open water above the deck (world y ~ 640), computed from the intact line at the moment of the snap
  const pre = LM.umbilical(null, umbPts(), tCut - .001, Object.assign({}, UO, { tension: 1 }));
  let acc = 0, best = 1e9, frac = .6;
  for (let i = 1; i < pre.pts.length; i++) { acc += Math.hypot(pre.pts[i][0] - pre.pts[i - 1][0], pre.pts[i][1] - pre.pts[i - 1][1]); const e = Math.abs(pre.pts[i][1] - 640); if (pre.pts[i][1] < hook[1] - 40 && e < best) { best = e; frac = acc / pre.len; } }
  UO.cut = { at: tCut, frac, recoil: 260, whip: 1.25 };
  const um = LM.umbilical(null, umbPts(), t, UO);
  const fl = after ? um.flash : 0;
  const cutP = um.cut || pre.cut || [900, 640];

  // ---- camera: sinking down the line -> establishing frame (on '90미터,') -> slow push -> push into the ring ----
  const pD = P(t, -.45, tDep + .3, E.inOutQ), pPush = P(t, tJam - .3, tCut, E.inOutQ), pIn = P(t, tCut + .5, d + .05, E.inOutC);
  const chest0 = LM.diver(null, DX, dY, DS, tCut, Object.assign({}, dOpt, { adj: { T: .92, h: .22 } })).chest;
  let cx = lerp(585, 540, pD), cy = lerp(585, 960, pD), z = lerp(1.34, 1, pD), ax = 540, ay = 960;
  cx = lerp(cx, 615, pPush * .9); cy = lerp(cy, 800, pPush * .9); z *= 1 + .28 * pPush;
  ax = lerp(ax, RING.x, pIn); ay = lerp(ay, RING.y, pIn); cx = lerp(cx, chest0[0], pIn); cy = lerp(cy, chest0[1], pIn); z = lerp(z, RING.r / 150, pIn);
  const dr = { x: fb(t * .35, 41) * 10, y: fb(t * .3, 50) * 10, r: fb(t * .25, 45) * .004 };
  const sk = LM.shake(t, .25 + .65 * pull, 3), jo = LM.jolt(t, tCut, 1.4);
  const kick = after ? .05 * Math.exp(-cutU * 7) : 0;
  const C = { ax, ay, cx, cy, z: z * (1 + kick) };
  // vertical camera speed (screen px/s) for the silt streaks
  const camY = tt => { const q = P(tt, -.45, tDep + .3, E.inOutQ); return lerp(585, 960, q) * lerp(1.34, 1, q); };
  const vy = (camY(t + .02) - camY(t - .02)) / .04;
  const cY = camY(t);

  // ---- lights ----
  const lifeL = lifeLight(dv.chest, 520 * DS, 1, tm, dOpt.bpm);
  const wl = [lifeL];
  if (lampOn > .01 && dv.lights[1]) wl.push(dv.lights[1]);
  if (fl > .01) wl.push(LM.light(cutP[0], cutP[1], 950, COL.lamp, 1.35 * fl));
  if (!after) wl.push(LM.light(hook[0], hook[1], 200, COL.amber, .12 + .25 * pull));    // the line grinds at the bucket lip
  const sl = wl.map(Lt => ({ x: (Lt.x - C.cx) * C.z + C.ax, y: (Lt.y - C.cy) * C.z + C.ay, r: Lt.r * C.z, color: Lt.color, a: Lt.a }));
  const darkK = lerp(.5, .9, P(t, tCut, tCut + .4)) + .08 * pIn;

  // ---- draw ----
  LM.sea(ctx, tm, { dark: darkK, cam: [(C.cx - 540) * .3, clamp((C.cy - 960) * C.z * .45, -400, 400)], lights: sl, seed: 5, haze: 0, snow: 1.1 });
  haze(ctx, sl, .85, 460);
  streaks(ctx, tm, vy, .9 * (1 - P(t, tDep, tDep + .6)) + .25, 17, sl, cY);

  ctx.save();
  ctx.translate(C.ax + sk.x + jo.x + dr.x, C.ay + sk.y + jo.y + dr.y); ctx.rotate(sk.r + dr.r); ctx.scale(C.z, C.z); ctx.translate(-C.cx, -C.cy);
  const stA = 1 - P(pIn, .12, .5);
  // the seabed only when it rises above the (dark) subtitle band — it sits just under it in this framing
  if (stA > 0 && (SY - 6 - C.cy) * C.z + C.ay < 1170) LM.seabed(ctx, SY - 6, tm, { dark: darkK, lights: wl, seed: 4 });
  // (the structure sinks into the black as the camera pushes into the ring; skipped once gone: it is costly at zoom 2)
  if (stA > 0) LM.structure(ctx, SX, SY, SS, tm, { lights: wl, amb: lerp(.08, .03, P(t, tCut, tCut + .4)), a: stA });
  // dust puff where the line grinds on the bucket lip
  if (pull > .05) for (let i = 0; i < 10; i++) {
    const u = ((t * 1.3 + hi(i * 7)) % 1), px = hook[0] + (hi(i * 3) - .3) * 40 + u * 30 * (hi(i * 5) - .5), py = hook[1] + 8 + u * 46 * hi(i * 11);
    ctx.fillStyle = rgba('#c9d6cf', .35 * pull * (1 - u)); ctx.beginPath(); ctx.arc(px, py, 1.5 + 3 * u, 0, 7); ctx.fill();
  }
  LM.umbilical(ctx, umbPts(), t, UO);
  // breath: a slow rhythm, quicker as the line drags, a big gasp burst on the snap
  const bursts = [];
  for (let b = -2; b < 6; b++) { const tb = .4 + b * 1.55 - (b > 1 ? (b - 1) * .4 : 0); if (tb < tCut - .1) bursts.push(tb); }
  bursts.push(tCut + .06, tCut + .9);
  LM.bubbles(ctx, tm, dv.head[0] - 14, dv.head[1] - 40, { bursts, a: .55, s: .8, seed: 5, n: 12 });
  LM.diver(ctx, dX, dY, DS, tm, dOpt);
  lifeGlow(ctx, tm, dv.chest[0], dv.chest[1], 1, DS, dOpt.bpm);
  // gas clock: rings in full around him just after the snap, then starts draining
  const ga = P(t, tCut + .14, tCut + .5, E.outQ);
  if (ga > 0) {
    const sc = lerp(1.35, 1, E.outBack(P(t, tCut + .14, tCut + .6)));
    const frac = 1 - .035 * P(t, tCut + .55, d + .3);
    LM.gasClock(ctx, dv.chest[0], dv.chest[1], 150 * sc, frac, t, { a: ga, w: 3.5, bpm: 112 });
  }
  ctx.restore();

  // ---- screen-space overlays ----
  // depth ruler: ticks scroll while the camera sinks, settle on '90미터,'
  const ra = P(t, .05, .4) * (1 - P(t, tLine - .2, tLine + .3));
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha = ra; const rx = 64, off = ((cY * .6) % 40 + 40) % 40;
    ctx.strokeStyle = 'rgba(190,225,230,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, 520); ctx.lineTo(rx, 1160); ctx.stroke();
    ctx.beginPath();
    for (let y = 520 - off; y < 1160; y += 40) { if (y < 520) continue; const k = Math.round((y + off + cY * .6) / 40) % 5 === 0; ctx.moveTo(rx, y); ctx.lineTo(rx + (k ? 22 : 11), y); }
    ctx.stroke();
    ctx.fillStyle = rgba(COL.amber, .9); ctx.beginPath(); ctx.moveTo(rx - 4, 700); ctx.lineTo(rx - 18, 690); ctx.lineTo(rx - 18, 710); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // depth chip on '90미터,'
  const dA = P(t, tDep - .05, tDep + .15) * (1 - P(t, tLine - .2, tLine + .2));
  if (dA > 0) { const k = lerp(.8, 1, E.outBack(P(t, tDep - .05, tDep + .3))); ctx.save(); ctx.translate(212, 700); ctx.scale(k, k); PK.chip(ctx, '수심 약 90m', 0, 0, dA, { size: 40, color: '#fff', border: 'rgba(160,220,255,.6)' }); ctx.restore(); }

  LM.subBand(ctx, .8);
  // warning (first ~2.5 s), tag (slides up into its place when the warning goes)
  PK.chip(ctx, D.warning || '', 540, 492, P(t, .04, .3) * (1 - P(t, 2.3, 2.6)), { size: 32, color: '#ffd9a0', border: 'rgba(255,180,90,.45)' });
  const tagY = lerp(556, 492, P(t, 2.45, 2.85, E.inOutQ));
  PK.chip(ctx, D.tag || '', 540, tagY, P(t, .25, .55) * (1 - P(t, tCut + .2, tCut + .6)), { size: 28, color: '#cfe8ff', border: 'rgba(150,210,255,.35)' });
  // snap: cold flash
  if (after) L.flash(ctx, .5 * Math.exp(-cutU * 11), '#e8f6ff');
};
})();
