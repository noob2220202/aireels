// back (94.89-98.90): "약 3주 뒤, 그는 다시 바다로 돌아갔습니다."
// Calmer, bluer water than before (faint surface light from far above, slow silt). The same lattice structure on the seabed, lit
// by a cool ambient light. '약 3주 뒤,' -> the diving bell lowers on its wire into the frame beside the structure and settles
// with a gentle bob; chip data.tag (the decompression / check-up note). '그는' -> the hatch opens, warm light spills down.
// '다시' -> the first helmet lamp drops out of the hatch — the amber-tagged one (Lemons: his amber life-light + a cold lamp),
// his umbilical paying out behind him with a soft amber pulse; '바다로' -> the second (Yuasa, cold white lamp) follows.
// '돌아갔습니다.' -> both swim down toward the structure, their lamps sweeping the lattice; the bell's warm light (the bellman)
// stays above them. Hand-over (cut) to 'same': the two at work on the structure under the bell.
// This file also holds the shared seabed work-site renderer used by back / same / close: PK.LMC.site.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, C = PK.LMC, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// ---------------- the work site (world px; the camera maps cam.{x,y} to screen (540, 860) at zoom cam.z) ----------------
const SITE = C.SITE = { SB: 1190, ST: { x: 418, s: .86 }, BELL: { x: 800, y: 598, s: .5 }, DS: .46 };
SITE.stTop = SITE.SB - 344 * SITE.ST.s;
// work positions (as in 'same')
SITE.LEMW = { x: 432, y: SITE.stTop + 3 };          // Lemons: crouched on the top deck (anchor 'base')
SITE.YUAW = { x: 748, y: 962 };                    // Yuasa: at the lattice's right side (chest)

const camT = (ctx, c) => { ctx.translate(540 + (c.ox || 0), 860 + (c.oy || 0)); ctx.rotate(c.r || 0); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); };
const toS = (c, p) => { const x = (p[0] - c.x) * c.z, y = (p[1] - c.y) * c.z, cr = Math.cos(c.r || 0), sr = Math.sin(c.r || 0); return [540 + (c.ox || 0) + x * cr - y * sr, 860 + (c.oy || 0) + x * sr + y * cr]; };
C.siteToS = toS;

// o: {cam, sea: {...LM.sea opts}, bell: {x,y,s, opts}, divers: [{x,y,s, o, clipY, a}], umbs: [{from:[x,y]|'bell', diver: i, pulse, sag, a, w}],
//     amb, ambColor, stLights (extra world lights for the structure), front (fn(ctx) drawn in world space last)}
// returns {bell, divers: [ret], lights (world), cam}
C.site = function (ctx, t, o) {
  const cam = o.cam, B = o.bell;
  // geometry first (world)
  const bR = LM.bell(null, B.x, B.y, B.s, t, B.o || {});
  const dR = (o.divers || []).map(dv => LM.diver(null, dv.x, dv.y, dv.s, t, dv.o));
  const wl = [];
  bR.lights.forEach(Lt => wl.push(Lt));
  dR.forEach((r, i) => r.lights.forEach(Lt => wl.push(Object.assign({}, Lt, { a: Lt.a * (o.divers[i].a == null ? 1 : o.divers[i].a) }))));
  (o.extraLights || []).forEach(Lt => wl.push(Lt));
  const sl = wl.map(Lt => { const p = toS(cam, [Lt.x, Lt.y]); return Object.assign({}, Lt, { x: p[0], y: p[1], r: Lt.r * cam.z }); });
  // water (screen space)
  LM.sea(ctx, t, Object.assign({ lights: sl, cam: [(cam.x - 540) * cam.z, (cam.y - 860) * cam.z], seed: 61 }, o.sea || {}));
  ctx.save(); camT(ctx, cam);
  const stL = wl.concat(o.stLights || []);
  LM.seabed(ctx, SITE.SB, t, { dark: o.bedDark == null ? .5 : o.bedDark, lights: stL, seed: 7 });
  LM.structure(ctx, SITE.ST.x, SITE.SB, SITE.ST.s, t, { lights: stL, amb: o.amb == null ? .12 : o.amb, ambColor: o.ambColor });
  // umbilicals (behind the divers)
  const uR = [];
  for (const u of (o.umbs || [])) {
    const r = dR[u.diver], dv = o.divers[u.diver]; if (!r || (u.a != null && u.a <= 0)) continue;
    const a0 = u.from === 'bell' || !u.from ? bR.exit : u.from, b0 = r.umb;
    const mid = [lerp(a0[0], b0[0], .5) + (u.dx || 0), Math.max(a0[1], b0[1]) + (u.sag == null ? 60 : u.sag)];
    ctx.save(); ctx.globalAlpha *= (u.a == null ? 1 : u.a) * (dv.a == null ? 1 : dv.a);
    uR[u.diver] = LM.umbilical(ctx, [a0, mid, b0], t, { w: u.w || 7, lit: u.lit == null ? .5 : u.lit, pulse: u.pulse || 0, pulseSpeed: 260, glow: u.glow || 0, sway: 10, vib: 0 });
    ctx.restore();
  }
  LM.bell(ctx, B.x, B.y, B.s, t, B.o || {});
  (o.divers || []).forEach((dv, i) => {
    if (dv.a != null && dv.a <= 0) return;
    ctx.save(); if (dv.clipY != null) { ctx.beginPath(); ctx.rect(-2000, dv.clipY, 6000, 4000); ctx.clip(); }
    if (dv.a != null) ctx.globalAlpha *= dv.a;
    LM.diver(ctx, dv.x, dv.y, dv.s, t, dv.o); ctx.restore();
  });
  if (o.front) o.front(ctx, bR, dR, uR);
  ctx.restore();
  return { bell: bR, divers: dR, umbs: uR, lights: wl, cam };
};

// ---------------- back ----------------
const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1]];
window.PK.scenes.back = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tWeeks = at('3주', .1), tHe = at('그는', .33), tAgain = at('다시', .42), tSea = at('바다로', .52), tBack = at('돌아갔습니다', .64);
  const B = SITE.BELL;
  // the bell lowers and settles (gentle bob)
  const lowP = E.outC(P(t, -.3, tHe - .1)), bob = 6 * Math.sin(t * 1.3) * P(t, tHe - .4, tHe + .4);
  const by = lerp(B.y - 360, B.y, lowP) + bob, sw = .025 * Math.sin(t * .9 + .5) * (1 - .5 * lowP);
  const hatch = P(t, tHe - .1, tHe + .35, E.inOutQ);
  const bO = { glow: .9, hatch, lamps: .55 * P(t, tHe, tHe + .4), amb: .32, swing: sw, wireTop: -400, rim: '#bfe6f0' };
  const bR0 = LM.bell(null, B.x, by, B.s, t, bO), HY = bR0.hatch[1];
  // two divers out of the hatch: first the amber-tagged one (Lemons), then Yuasa
  const diverAt = (t0, P1, P2, phase, lemons) => {
    const u1 = P(t, t0, t0 + .7, E.outQ), u2 = P(t, t0 + .45, d + .4, E.inOutQ);
    const p0 = [bR0.hatch[0] - 6, HY + 150 * SITE.DS / .46];
    const pe = [lerp(bR0.hatch[0], p0[0], u1), lerp(HY - 40, p0[1], u1)];
    const pos = u2 > 0 ? bez(pe, P1, P2, u2) : pe;
    const o = { pose: 'float', pose2: 'swim', mix: .85 * E.inOutQ(clamp(u2 * 1.6)), dir: -1, rot: -.12 * u2, kick: .25 + .25 * u2, idle: 1, phase,
      lamp: P(t, t0 + .15, t0 + .5), lampAng: lerp(Math.PI * .55, Math.PI * .78, u2), beamLen: 760, bailout: true, rim: '#a8dcf0', light: [bR0.port[0], bR0.port[1]], halo: .22, rimA: .9 };
    if (lemons) { o.life = P(t, t0, t0 + .4); o.bpm = 64; o.lifeS = .8; }
    return { x: pos[0], y: pos[1], s: SITE.DS, o, clipY: HY - 6, a: P(t, t0 - .05, t0 + .2) };
  };
  const lem = diverAt(tAgain - .14, [640, 742], [476, 788], 0, true);
  const yua = diverAt(tSea - .1, [800, 870], [768, 940], 1.7, false);
  // camera: calm drift, a slow settle toward the site
  const sk = LM.shake(t, .1, 201), cz = lerp(1.0, 1.04, P(t, 0, d, E.inOutQ));
  const cam = { x: 556 + fb(t * .2, 202) * 8, y: 872 - 10 * P(t, 0, d, E.inOutQ), z: cz, ox: sk.x, oy: sk.y, r: sk.r * .5 };
  const R = C.site(ctx, t, {
    cam, sea: { dark: .3, top: '#1d5770', mid: '#0f3546', bottom: '#06171f', surface: .45, surfaceColor: '#8fd0e0', snow: .8, current: [4, -1.5], murk: .8, haze: .7 },
    amb: .3, ambColor: '#a8d0e0', bedDark: .25,
    bell: { x: B.x, y: by, s: B.s, o: bO },
    divers: [lem, yua].filter(dv => dv.a > 0),
    umbs: [lem, yua].filter(dv => dv.a > 0).map((dv, i) => ({ diver: i, pulse: .55 * dv.a, sag: 40, w: 6.5, lit: .55 })),
  });
  // chip: the decompression / check-up note (on '3주')
  LM.subBand(ctx, .78, 1150);
  const cA = P(t, tWeeks - .05, tWeeks + .3) * (1 - P(t, tBack + .2, tBack + .6));
  if (cA > 0) { const k = lerp(.86, 1, E.outBack(P(t, tWeeks - .05, tWeeks + .4))); ctx.save(); ctx.translate(380, 500); ctx.scale(k, k); PK.chip(ctx, D.tag || '', 0, 0, cA, { size: 32, color: '#e8f6ff', border: 'rgba(170,225,245,.5)' }); ctx.restore(); }
};
})();
