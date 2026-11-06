// snap: "호스가 막혀 비상 기체로 바꿨고, 곧 생명줄이 총소리처럼 끊어졌습니다."
// Helmet-side close-up, in the cold white of his own lamp. His umbilical leaves the back of the helmet and runs taut up into
// the dark (amber pulses = gas, heat, power still flowing down it), breath bubbles coming fast. '호스가' -> the line strains;
// '막혀' -> it is yanked into a sharp kink just behind the helmet: the pulses pile up at the fold and die there, the breathing
// stops. '비상 기체로' -> his gloved hand reaches back to the side of the helmet and turns the bailout valve; the small cylinder
// on his back lights amber, gas runs up its whip hose, breath bursts out again; chip '비상 기체(베일아웃) 개방'; the gas clock rings
// in around him, full, and starts draining. '곧 생명줄이' -> the line creaks into a bowstring: vibration, fibres popping at the
// weak point, the camera creeps toward it. '총소리처럼' -> it PARTS: white flash, sparks, the ends whip into the black, the helmet
// lamp flickers out, a hard jolt — then near-black silence: only his amber heartbeat, the valve's ember and the draining
// ring. Chips: time, his "shotgun" words, a small order note. He starts to fall back (hand-off to 'dark').
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

const DS = 1.82;                          // close-up scale of the diver
const C0 = [600, 890];                    // chest (anchor) at rest
const FAR = [1190, -70];                   // the line runs up to the bell, off frame
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

// two-bone IK for the near arm (hand point) in the rig's angle convention (0 = down, +PI/2 = forward), elbow back
function ik(sh, tg, l1 = 76, l2 = 84) {
  const dx = tg[0] - sh[0], dy = tg[1] - sh[1], D = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const q = Math.atan2(dx, dy), A = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
  const a1 = q + A, e = [sh[0] + Math.sin(a1) * l1, sh[1] + Math.cos(a1) * l1], a2 = Math.atan2(tg[0] - e[0], tg[1] - e[1]);
  return [a1, a2 - a1];
}
// pose-space (pre-flip) helpers mirroring the kit's rig, for the IK target on the helmet side block
function rigPts(T, h) {
  const cT = Math.cos(T), sT = Math.sin(T), tor = (u, v) => [u * cT - v * sT, u * sT + v * cT];
  const neck = tor(8, -166), HA = T + h, cH = Math.cos(HA), sH = Math.sin(HA);
  const hel = (u, v) => [neck[0] + u * cH - v * sH, neck[1] + u * sH + v * cH];
  return { shN: tor(12, -140), hel };
}
// helmet-local point -> screen, from two known points the kit returns (umb = hel(-34,-26), head = hel(12,-52)); dir = -1 mirror
function helMap(R, dir) {
  const w = [46 * dir, -26], S = [R.head[0] - R.umb[0], R.head[1] - R.umb[1]];
  const phi = Math.atan2(S[1], S[0]) - Math.atan2(w[1], w[0]), k = Math.hypot(S[0], S[1]) / Math.hypot(w[0], w[1]), c = Math.cos(phi), s = Math.sin(phi);
  return (u, v) => { const x = (u + 34) * dir * k, y = (v + 26) * k; return [R.umb[0] + x * c - y * s, R.umb[1] + x * s + y * c]; };
}
// pose space (the kit's rig, before the dir flip) -> screen, for a chest-anchored LM.diver at (x, y, s, dir, rot)
function poseMap(x, y, s, dir, rot, T) {
  const cr = Math.cos(rot), sr = Math.sin(rot), cT = Math.cos(T), sT = Math.sin(T);
  const tw = q => { const u = dir * q[0] * s, v = q[1] * s; return [u * cr - v * sr, u * sr + v * cr]; };
  const ch = tw([16 * cT + 106 * sT, 16 * sT - 106 * cT]);
  return q => { const w = tw(q); return [x + w[0] - ch[0], y + w[1] - ch[1]]; };
}
// the reaching arm, re-drawn on top with its own rim so it reads against the body (same geometry as the kit's near arm);
// the glove sits on the valve wheel and twists with it
function armOver(ctx, map, T, na, s, rim, a, warm, twist, chest) {
  if (a <= .01) return;
  const cT = Math.cos(T), sT = Math.sin(T), sh = [12 * cT + 140 * sT, 12 * sT - 140 * cT];
  const e = [sh[0] + Math.sin(na[0]) * 76, sh[1] + Math.cos(na[0]) * 76], a2 = na[0] + na[1], w = [e[0] + Math.sin(a2) * 70, e[1] + Math.cos(a2) * 70], hd = [w[0] + Math.sin(a2) * 16, w[1] + Math.cos(a2) * 16];
  const S = [sh, e, w].map(map), Hd = map(hd), ang = Math.atan2(Hd[1] - S[2][1], Hd[0] - S[2][0]);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const arm = (lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(S[0][0], S[0][1]); ctx.lineTo(S[1][0], S[1][1]); ctx.lineTo(S[2][0], S[2][1]); ctx.stroke(); };
  const glove = (g) => { ctx.save(); ctx.translate(Hd[0], Hd[1]); ctx.rotate(ang + twist); ctx.beginPath();
    ctx.ellipse(0, 0, 21 * s + g, 16 * s + g, 0, 0, 7); ctx.moveTo(4 * s, -12 * s); ctx.ellipse(6 * s, -16 * s, 9 * s + g, 6 * s + g, -.6, 0, 7); ctx.fill(); ctx.restore(); };
  arm(35 * s + 7, rgba(rim, .85)); ctx.fillStyle = rgba(rim, .85); glove(3.5);
  arm(35 * s, '#05090b'); ctx.fillStyle = '#05090b'; glove(0);
  // cuff band + a faint sleeve seam
  ctx.strokeStyle = rgba(rim, .35); ctx.lineWidth = 3; ctx.beginPath(); const c0 = [lerp(S[1][0], S[2][0], .82), lerp(S[1][1], S[2][1], .82)], nx = -Math.sin(ang) * 17 * s, ny = Math.cos(ang) * 17 * s;
  ctx.moveTo(c0[0] - nx, c0[1] - ny); ctx.lineTo(c0[0] + nx, c0[1] + ny); ctx.stroke();
  if (warm > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(COL.amber, .3 * warm); glove(0); }
  // the suit is warmed by his life-light near the chest, like the kit's body
  if (chest) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(chest[0], chest[1], 0, chest[0], chest[1], 230 * s);
    g.addColorStop(0, rgba(COL.amber, .3)); g.addColorStop(.5, rgba(COL.amber, .08)); g.addColorStop(1, rgba(COL.amber, 0)); arm(35 * s, g); }
  ctx.restore();
}
// the small bailout cylinder on his back lights up (its outline in the torso frame, mapped to screen)
function cylGlow(ctx, map, T, k, t) {
  if (k <= .01) return;
  const cT = Math.cos(T), sT = Math.sin(T), tor = (u, v) => [u * cT - v * sT, u * sT + v * cT], pts = [];
  for (let i = 0; i < 28; i++) { const q = i / 28 * Math.PI * 2, cx = -64, cy = -97; pts.push(map(tor(cx + Math.cos(q) * 20, cy + Math.max(-1, Math.min(1, Math.sin(q) * 1.6)) * 61))); }
  const c = map(tor(-64, -97)), top = map(tor(-64, -150)), bot = map(tor(-64, -40));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  const g = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1]); g.addColorStop(0, rgba(COL.warm, .5 * k)); g.addColorStop(.6, rgba(COL.amber, .2 * k)); g.addColorStop(1, rgba(COL.amber, .05 * k));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(COL.warm, .55 * k * (.8 + .2 * Math.sin(t * 9))); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  LM.glow(ctx, c[0], c[1], 150, COL.amber, .22 * k);
}
function streaks(ctx, t, vy, a, seed, lights, off) {
  if (a <= .004) return;
  const n = 40, len = clamp(Math.abs(vy) * .05, 2, 80);
  ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = .5 + hi(i * 7 + seed) * .9, x = hi(i * 3 + seed) * (W + 80) - 40 + fb(t * .2 + i, seed + 3) * 30;
    const y = ((hi(i * 5 + seed) * (H + 200) - off * z) % (H + 200) + H + 200) % (H + 200) - 100;
    let lum = .1; for (const Lt of lights) { const dx = x - Lt.x, dy = y - Lt.y, d2 = dx * dx + dy * dy; if (d2 < Lt.r * Lt.r) lum += (1 - Math.sqrt(d2) / Lt.r) * (Lt.a == null ? 1 : Lt.a) * .8; }
    ctx.strokeStyle = rgba('#bcd9d4', Math.min(.55, a * lum * z)); ctx.lineWidth = .8 + z * 1.3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len * z); ctx.stroke();
  }
  ctx.restore();
}

window.PK.scenes.snap = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tHo = at('호스가', .02), tMak = at('막혀', .1), tBi = at('비상', .18), tGi = at('기체로', .25), tBak = at('바꿨고', .31);
  const tGot = at('곧', .5), tLine = at('생명줄이', .54), tCut = at('총소리처럼', .66), tEnd = at('끊어졌습니다', .8);
  const cutU = t - tCut, after = cutU >= 0 ? 1 : 0;
  const tm = t < tCut ? t : t < tCut + .09 ? tCut : t - .09;                 // freeze for a beat on the snap

  // ---- story values ----
  const kink = P(t, tMak - .04, tMak + .14, E.outBack);                    // the fold
  const reach = P(t, tBi - .2, tGi + .05, E.inOutQ) * (1 - P(t, tGot - .7, tGot - .1, E.inOutQ));
  const turn = P(t, tGi - .02, tBak + .12, E.inOutQ);                       // valve rotation
  const gas = P(t, tGi + .12, tGi + .4);                                    // bailout open
  const creak = P(t, tGot - .3, tCut - .03, E.inQ) * (1 - after);
  const breathing = t < tMak ? 1 : t < tGi + .2 ? 0 : 1;
  const fall = P(t, tCut + .5, d + .4, E.inQ);                               // he starts to fall back (into 'dark')
  const lampOn = t < tCut ? 1 : (hi(Math.floor(t * 40) + 3) > .45 ? .7 : .06) * (1 - P(t, tCut + .03, tCut + .32));

  // ---- the diver (geometry first) ----
  const T = lerp(.36, .28, kink) - .06 * creak + .2 * P(t, tCut, tCut + .4, E.outQ), h = lerp(-.08, .05, kink) + .1 * after;
  const rp = rigPts(T, h);
  const base = LM.POSES.crouch, na0 = [base.na[0] + .1, base.na[1] + .1];
  const tw = .14 * Math.sin(turn * Math.PI * 3) * (turn > 0 && turn < 1 ? 1 : 0);
  const naR = ik(rp.shN, rp.hel(-56, -44)); naR[1] += tw;
  const na = [lerp(na0[0], naR[0], reach), lerp(na0[1], naR[1], reach)];
  const fa = after ? [lerp(.72, 2.2, P(t, tCut, tCut + .6, E.outQ)), lerp(.86, .4, P(t, tCut, tCut + .6))] : [.85, .7];
  const rimC = after ? '#ffc58a' : '#bfe6ff';
  const DO = {
    pose: 'crouch', dir: -1, adj: { T, h, na, fa, nl: [1.35, -1.4], fl: [.15, -1.3] }, idle: .6, tremble: .35 * creak + .3 * (1 - breathing) * (t < tCut ? 1 : 0),
    life: after ? .8 : 1, bpm: after ? 118 : lerp(92, 112, creak), lifeS: LIFE_S, lamp: lampOn, lampAng: 2.55 + fb(tm * .4, 3) * .06 - .1 * kink, beamLen: 700,
    bailout: true, bailoutLit: gas * (after ? .75 : 1), rim: rimC, rimA: after ? .3 : .9, rim2A: 0, halo: 0, rimW: 3.6, light: [200, 300],
    rot: .5 * fall + .05 * P(t, tCut, tCut + .3, E.outQ),
  };
  const cx0 = C0[0] + 40 * fall + 6 * creak, cy0 = C0[1] + 150 * fall * fall;
  const dv = LM.diver(null, cx0, cy0, DS, tm, DO);
  const hm = helMap(dv, -1);

  // ---- the line: [far end, fold, helmet] ----
  const umb = dv.umb, Kc = [umb[0] + 170, umb[1] - 40], Kk = [umb[0] + 185, umb[1] + 168];
  const K = [lerp(Kc[0], Kk[0], kink), lerp(Kc[1], Kk[1], kink)];
  const pts = [FAR, K, umb];
  const UO = { w: 21, lit: .55 + .15 * creak, tension: lerp(.86, 1, Math.max(kink, creak)), vib: 3 + 7 * creak, sway: 6, pulse: 0, glow: .25 * (1 - kink * .6) };
  const pre = LM.umbilical(null, pts, tCut - .001, Object.assign({}, UO, { tension: 1 }));
  let acc = 0, best = 1e9, frac = .4;
  for (let i = 1; i < pre.pts.length; i++) { acc += Math.hypot(pre.pts[i][0] - pre.pts[i - 1][0], pre.pts[i][1] - pre.pts[i - 1][1]); const e = Math.abs(pre.pts[i][1] - 610); if (e < best) { best = e; frac = acc / pre.len; } }
  UO.cut = { at: tCut, frac, recoil: 380, whip: 1.5 };
  const um = LM.umbilical(null, pts, t, UO);
  const fl = after ? um.flash : 0, cutP = um.cut || [900, 560];

  // ---- camera: creeps toward the weak point while it creaks, jolts on the snap, sinks with his fall ----
  const push = P(t, -.3, tCut, E.inOutQ);
  const z = 1 + .05 * push + .05 * creak + (after ? .06 * Math.exp(-cutU * 6) : 0);
  const fx = lerp(600, 700, creak * .6), fy = lerp(820, 760, creak * .6);
  const dr = { x: fb(t * .35, 71) * 9, y: fb(t * .3, 72) * 9, r: fb(t * .25, 73) * .004 };
  const sk = LM.shake(t, .2 + .5 * creak + .4 * Math.exp(-Math.max(0, t - tMak) * 5) * (t > tMak ? 1 : 0), 8), jo = LM.jolt(t, tCut, 1.6);
  const camF = tt => 520 * P(tt, tCut + .5, d + .4, E.inQ);
  const camOff = camF(t), vy = (camF(t + .02) - camF(t - .02)) / .04;
  const toS = (x, y) => [(x - fx) * z + fx + sk.x + jo.x + dr.x, (y - fy) * z + fy + sk.y + jo.y + dr.y - camOff * 0];

  // ---- lights (screen) ----
  const wl = [lifeLight(dv.chest, 520 * DS * .8, DO.life, tm, DO.bpm)];
  if (lampOn > .01 && dv.lights[1]) wl.push(dv.lights[1]);
  if (fl > .01) wl.push(LM.light(cutP[0], cutP[1], 1300, COL.lamp, 1.4 * fl));
  if (gas > 0) wl.push(LM.light(dv.valve[0], dv.valve[1], 260, COL.amber, .5 * gas));
  const sl = wl.map(Lt => { const p = toS(Lt.x, Lt.y); return { x: p[0], y: p[1], r: Lt.r * z, color: Lt.color, a: Lt.a }; });
  const darkK = after ? lerp(.62, .97, P(t, tCut + .05, tCut + .5)) : .62;

  // ---- draw ----
  LM.sea(ctx, tm, { dark: darkK, lights: sl, seed: 12, haze: 0, snow: 1.15, cam: [0, -camOff * .4] });
  haze(ctx, sl, .8, 430);
  streaks(ctx, tm, vy, P(t, tCut + .6, tCut + 1.2) * .9, 23, sl, camOff + tm * 20);
  ctx.save();
  ctx.translate(fx + sk.x + jo.x + dr.x, fy + sk.y + jo.y + dr.y); ctx.rotate(sk.r + dr.r); ctx.scale(z, z); ctx.translate(-fx, -fy);

  // breath
  const bursts = [];
  for (let k = 0; k < 2; k++) { const tb = -.5 + k * .55; if (tb < tMak) bursts.push(tb); }
  bursts.push(tGi + .28); for (let k = 1; k < 4; k++) bursts.push(tGi + .28 + k * .62);
  bursts.push(tCut + .05); bursts.push(tCut + 1.1);
  const bub = hm(70, -10);
  LM.bubbles(ctx, tm, bub[0], bub[1], { bursts: bursts.filter(b => b < tCut || b >= tCut), a: .7, s: 1.6, seed: 13, n: 14 });

  LM.diver(ctx, cx0, cy0, DS, tm, DO);
  lifeGlow(ctx, tm, dv.chest[0], dv.chest[1], DO.life, DS * .8, DO.bpm);
  // the line (it leaves the back of the helmet toward us, over the bailout cylinder)
  LM.umbilical(ctx, pts, t, UO);
  if (!after) {
    // amber pulses (gas, heat, power) running down to him; after the fold they stop there and pile up
    const P0 = um.pts, cum = [0]; for (let i = 1; i < P0.length; i++) cum.push(cum[i - 1] + Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]));
    const L0 = cum[cum.length - 1]; let iK = 0, bd = 1e9; for (let i = 0; i < P0.length; i++) { const e = Math.hypot(P0[i][0] - K[0], P0[i][1] - K[1]); if (e < bd) { bd = e; iK = i; } }
    const dK = cum[iK], stop = kink > .5, n = 4, sp = 620;
    const idx = dd => { let lo = 0, hi2 = cum.length - 1; while (lo < hi2) { const m = (lo + hi2) >> 1; if (cum[m] < dd) lo = m + 1; else hi2 = m; } return lo; };
    for (let k = 0; k < n; k++) {
      const dd = (((t * sp) / L0 + k / n) % 1) * L0; if (stop && dd > dK) continue;
      const p = P0[idx(dd)], f = clamp(dd / 80) * clamp((L0 - dd) / 60);
      LM.glow(ctx, p[0], p[1], 70, COL.amber, .55 * f); LM.glow(ctx, p[0], p[1], 18, COL.core, .6 * f);
    }
    if (kink > 0) {   // blocked at the fold: a hot, choked ember
      const bk = PK.beat(t, 140), kp = P0[iK];
      LM.glow(ctx, kp[0], kp[1], 150 + 40 * bk, COL.alarm, (.38 + .3 * bk) * kink * (1 - creak * .3));
      LM.glow(ctx, kp[0], kp[1], 60, COL.red, (.25 + .2 * bk) * kink);
      LM.glow(ctx, kp[0], kp[1], 30, '#fff0d0', .6 * kink);
    }
    // fibres popping at the weak point while it creaks
    if (creak > .05) {
      ctx.save(); ctx.lineCap = 'round';
      for (let j = 0; j < 14; j++) {
        const on = P(t, tGot + j * .055, tGot + j * .055 + .08); if (on <= 0) continue;
        const q = hi(j * 7 + 5) * TAU, L1 = (10 + 26 * hi(j * 3 + 1)) * on, ox = (hi(j * 11) - .5) * 30;
        const x0 = cutP[0] + ox, y0 = cutP[1] + ox * -.4;
        ctx.strokeStyle = rgba(j % 3 ? '#d9cba0' : '#ece6d6', .85); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(q) * L1 * .6, y0 + Math.sin(q) * L1 * .3, x0 + Math.cos(q) * L1, y0 + Math.sin(q) * L1); ctx.stroke();
      }
      ctx.restore();
      LM.glow(ctx, cutP[0], cutP[1], 90, COL.lamp, .18 * creak);
    }
  }
  // (replicate the kit's idle / tremble offsets so the overlay sits exactly on the kit's arm)
  const idl = DO.idle, Ti = T + .012 * idl * Math.sin(tm * .5), naI = [na[0] + .05 * idl * Math.sin(tm * .9), na[1] + DO.tremble * .08 * nz(tm * 13, 3)];
  armOver(ctx, poseMap(cx0, cy0, DS, -1, DO.rot, Ti), Ti, naI, DS, rimC, t < tGot - .75 ? P(reach, .15, .45) : P(reach, .6, .92), gas, .35 * Math.sin(turn * Math.PI * 3) * (turn > 0 && turn < 1 ? 1 : 0), dv.chest);

  // bailout: valve knob on the helmet side block turns; gas runs from the cylinder up the whip
  const kb = hm(-50, -50), kr = 13 * DS;
  if (reach > .05 || gas > 0) {
    const ka = turn * 3.6, lit = gas;
    ctx.save(); ctx.translate(kb[0], kb[1]); ctx.rotate(ka);
    ctx.strokeStyle = rgba(lit > .05 ? COL.warm : '#9fc6d8', .55 + .35 * lit); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, kr, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k < 3; k++) { const q = k * TAU / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(q) * kr, Math.sin(q) * kr); } ctx.stroke();
    ctx.restore();
    if (lit > 0) LM.glow(ctx, kb[0], kb[1], 60, COL.amber, .5 * lit);
  }
  if (gas > 0) {
    const v = dv.valve, hb = hm(-40, -52), c = [Math.max(v[0], hb[0]) + 40, Math.min(v[1], hb[1]) - 30];
    for (let k = 0; k < 3; k++) {
      const u = ((t * 1.4 + k / 3) % 1), w = 1 - u;
      const px = w * w * v[0] + 2 * w * u * c[0] + u * u * hb[0], py = w * w * v[1] + 2 * w * u * c[1] + u * u * hb[1];
      LM.glow(ctx, px, py, 34, COL.amber, .55 * gas * (after ? .6 : 1));
    }
    cylGlow(ctx, poseMap(cx0, cy0, DS, -1, DO.rot, T + .012 * DO.idle * Math.sin(tm * .5)), T + .012 * DO.idle * Math.sin(tm * .5), gas * (after ? .55 : 1) * (1 - .25 * fall), t);
  }
  // gas clock: rings in with the bailout, drains
  const ga = P(t, tGi + .2, tGi + .55, E.outQ);
  const ringC = [lerp(dv.chest[0], dv.head[0], .45), lerp(dv.chest[1], dv.head[1], .45)];
  if (ga > 0) {
    const sc = lerp(1.3, 1, E.outBack(P(t, tGi + .2, tGi + .7)));
    LM.gasClock(ctx, ringC[0], ringC[1], 250 * sc, 1 - .07 * P(t, tGi + .6, d + .2), t, { a: ga * (1 - .15 * fall), w: 5, bpm: after ? 118 : 104 });
  }
  ctx.restore();

  LM.subBand(ctx, .82);
  // chips
  const bA = P(t, tBak - .1, tBak + .15) * (1 - P(t, tCut - .1, tCut + .05));
  if (bA > 0) {
    const vs = toS(dv.valve[0] + 40, dv.valve[1] + 150), cxp = 790, cyp = 1112, k = lerp(.85, 1, E.outBack(P(t, tBak - .1, tBak + .25)));
    ctx.save(); ctx.globalAlpha = bA; ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cxp + 40, cyp - 30); ctx.lineTo(vs[0], vs[1] + 10); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(cxp, cyp); ctx.scale(k, k); PK.chip(ctx, D.bailout || '', 0, 0, bA, { size: 34, color: '#ffe3b8', border: 'rgba(255,179,71,.65)' }); ctx.restore();
  }
  const tA = P(t, tCut + .35, tCut + .6) * (1 - P(t, d - .25, d));
  if (tA > 0) PK.chip(ctx, D.time || '', 540, 500, tA, { size: 36, color: '#fff', border: 'rgba(160,220,255,.5)' });
  const nA = P(t, tEnd - .05, tEnd + .25) * (1 - P(t, d - .25, d));
  if (nA > 0) PK.chip(ctx, D.note || '', 540, 1088, nA, { size: 32, color: '#cfe8ff', border: 'rgba(150,210,255,.35)' });
  const oA = P(t, tEnd + .2, tEnd + .5) * (1 - P(t, d - .25, d));
  if (oA > 0) L.text(ctx, D.order || '', 540, 1158, { size: 24, weight: 700, color: 'rgba(170,200,212,.8)', alpha: oA });
  // the shot: cold white flash, then black
  if (after) L.flash(ctx, .55 * Math.exp(-cutU * 10), '#eef8ff');
};
})();
