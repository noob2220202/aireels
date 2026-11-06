// breaths (80.38-87.59): "생명줄이 끊긴 지 약 35분, 벨 안의 던컨 올콕이 숨을 두 번 불어넣자, 그가 숨을 들이켰다고 합니다."
// Inside the diving bell (warm cutaway, kit LM.bell inside). He is being hauled up out of the black water of the floor hatch
// (Yuasa's cold lamp still glowing under it), his amber light only an ember. The bellman — a faceless warm presence — kneels
// behind him and takes him under the arms.
//  '생명줄이 끊긴 지 약 35분,' -> a big counter over the dim bell rolls up to '약 35분' (pop on '35분,'), a thin time line fills.
//  '벨 안의'      -> the counter docks as a small chip; the camera pushes in on the two of them; label data.bell on the bellman.
//  '던컨 올콕이'   -> the bellman lifts the helmet off (back/side view, no face: the head under it is a plain dark shape) and sets
//                   it on the bench; chip data.time under the counter chip.
//  '숨을 두 번 불어넣자,' -> two soft warm breath pulses travel from the bellman's head to his and sink into his chest (a swell
//                   and a ring each time); the bellman leans in for each.
//  '그가 숨을'     -> stillness: the bell light dips, the ember almost goes, the frame leans in a hair.
//  '들이켰다고'    -> the moment of life: his amber light flares back to full with ripple rings through the bell, the lamp
//                   warms to full, the hatch water rings, a small kick; his heartbeat starts.
//  '합니다.'       -> warm hold, the bellman sits back a little, small data.note.
// This file also holds the small kit shared by the closing scenes (breaths .. close): window.PK.LMC.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// =====================================================================================================
// PK.LMC: small kit for the closing scenes
// =====================================================================================================
const C = PK.LMC = PK.LMC || {};
const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]];
// radial-gradient glow (cheaper than a scaled sprite at large radii in this renderer)
C.softGlow = function (ctx, x, y, r, color, a = 1, op = 'lighter') {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
};
// his amber life-light (b = heartbeat 0..1)
C.lifeGlow = function (ctx, b, x, y, a, s) {
  if (!(a > .003)) return;
  C.softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  C.softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, Math.min(1, (.8 + .2 * b) * a * .8));
};
C.thump = ph => { ph = ((ph % 1) + 1) % 1; return Math.exp(-ph * 16) + (ph > .2 ? .55 * Math.exp(-(ph - .2) * 16) : 0); };
// figure-frame helpers (same rig conventions as LM.diver, rot = 0, anchor 'pelvis')
C.tor = (T, u, v) => [u * Math.cos(T) - v * Math.sin(T), u * Math.sin(T) + v * Math.cos(T)];
C.fig = (pel, S, dir, q) => [pel[0] + dir * q[0] * S, pel[1] + q[1] * S];
C.unfig = (pel, S, dir, p) => [(p[0] - pel[0]) / S * dir, (p[1] - pel[1]) / S];
C.figR = (pel, S, dir, rot, q) => { const u = dir * q[0] * S, v = q[1] * S, c = Math.cos(rot), s2 = Math.sin(rot); return [pel[0] + u * c - v * s2, pel[1] + u * s2 + v * c]; };
// 2-bone IK in the figure frame (limb angle a: direction (sin a, cos a)); returns [upper, bend] for a pose limb.
// The elbow/knee goes to the lower of the two solutions (natural for arms reaching forward/down).
C.ik = function (sh, tg, L1 = 76, L2 = 84) {
  const dx = tg[0] - sh[0], dy = tg[1] - sh[1], d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + .5, L1 + L2 - .5), base = Math.atan2(dx, dy);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  let best = null;
  for (const sg of [1, -1]) {
    const a1 = base + sg * A, el = [sh[0] + Math.sin(a1) * L1, sh[1] + Math.cos(a1) * L1], a2 = Math.atan2(tg[0] - el[0], tg[1] - el[1]);
    if (!best || el[1] > best.ey) best = { ey: el[1], r: [a1, a2 - a1] };
  }
  return best.r;
};
// a detached diving helmet (same shape as the kit's), drawn at neck point (x, y), head angle ang, scale s, facing dir.
// Faceless: a dark faceplate with one glint. o: {fill, rim, rimDir, rimW, a, warm}
function helmetParts(c) {
  const part = f => { c.beginPath(); f(); c.fill(); };
  part(() => c.ellipse(8, 2, 44, 14, 0, 0, TAU));
  part(() => c.ellipse(12, -52, 50, 53, 0, 0, TAU));
  part(() => { c.moveTo(40, -92); c.lineTo(64, -80); c.quadraticCurveTo(76, -50, 68, -18); c.lineTo(44, -10); c.closePath(); });
  part(() => c.arc(58, -6, 15, 0, TAU));
  part(() => c.rect(-46, -68, 18, 34)); part(() => c.arc(-34, -26, 11, 0, TAU));
  part(() => c.rect(12, -118, 32, 14));
}
C.helmet = function (ctx, x, y, ang, s, dir, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return;
  const rd = o.rimDir == null ? -1.7 : o.rimDir, rw = (o.rimW || 3), rim = o.rim || COL.warm;
  const tf = c => { c.translate(x, y); c.scale(dir * s, s); c.rotate(ang); };
  ctx.save(); ctx.globalAlpha *= a;
  ctx.save(); ctx.translate(Math.cos(rd) * rw, Math.sin(rd) * rw); tf(ctx); ctx.fillStyle = rim; ctx.globalAlpha *= .85; helmetParts(ctx); ctx.restore();
  ctx.save(); tf(ctx); ctx.fillStyle = o.fill || '#0c0805'; helmetParts(ctx);
  if (o.warm > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = rgba(COL.amber, .16 * o.warm); ctx.fillRect(-80, -130, 170, 160); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = '#08141b'; ctx.beginPath(); ctx.moveTo(45, -86); ctx.lineTo(62, -77); ctx.quadraticCurveTo(71, -50, 64, -22); ctx.lineTo(47, -15); ctx.quadraticCurveTo(57, -50, 45, -86); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#ffe7c4', .45); ctx.lineWidth = 2.6 / s; ctx.beginPath(); ctx.moveTo(53, -78); ctx.quadraticCurveTo(61, -62, 59, -44); ctx.stroke();
  ctx.strokeStyle = rgba(rim, .4); ctx.lineWidth = 3 / s; ctx.beginPath(); ctx.arc(12, -52, 44, -2.6, -1.25); ctx.stroke();
  ctx.strokeStyle = rgba(rim, .22); ctx.lineWidth = 2 / s; ctx.beginPath(); ctx.ellipse(8, 2, 40, 10, 0, Math.PI, TAU); ctx.stroke();
  ctx.restore();
  ctx.restore();
};
// attribution card for real-audio clips; a long `who` is split at ' (' onto a second, smaller line (card grows upward)
C.card = function (ctx, who, where, a, y = 1185) {
  if (a <= 0) return;
  let l1 = who, l2 = '';
  if (measure(ctx, who, 32, FONT.sub, 900) > 650) { const i = who.indexOf(' ('); if (i > 0) { l1 = who.slice(0, i); l2 = who.slice(i + 1); } }
  let s1 = 32; while (s1 > 22 && measure(ctx, l1, s1, FONT.sub, 900) > 650) s1--;
  if (!l2) { PK.sourceCard(ctx, l1, where, a, y); return; }
  const w = 760, h = 128, bot = y + 46, top = bot - h;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(3,8,12,.86)'; roundRect(ctx, 540 - w / 2, top, w, h, 14); ctx.fill();
  ctx.fillStyle = PK.K.red; ctx.beginPath(); ctx.arc(540 - w / 2 + 34, top + 32, 9, 0, TAU); ctx.fill(); ctx.restore();
  text(ctx, l1, 540 - w / 2 + 60, top + 32, { size: s1, weight: 900, color: '#fff', align: 'left', alpha: a });
  text(ctx, l2, 540 - w / 2 + 60, top + 68, { size: 25, weight: 700, color: '#d8ecf6', align: 'left', alpha: a });
  text(ctx, where, 540 - w / 2 + 60, top + 102, { size: 25, weight: 700, color: '#9fc6d8', align: 'left', alpha: a });
};
C.cardDot = (ctx, who, y = 1185) => (measure(ctx, who, 32, FONT.sub, 900) > 650 && who.indexOf(' (') > 0 ? y + 46 - 128 + 32 : y);
// loudness envelope (30 fps, 0-99) -> 0..1 at clip time tc
C.env = arr => tc => { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= arr.length - 1) return 0; return lerp(arr[i], arr[i + 1], f - i) / 99; };
// thin leader line with a dot (grows with a)
C.lead = function (ctx, x0, y0, x1, y1, a, col = 'rgba(255,214,160,.6)') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, clamp(a)), lerp(y0, y1, clamp(a))); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 5, 0, TAU); ctx.fill(); ctx.restore();
};
// a soft pool of light around p: everything outside falls off into shadow (bounded fill: the subtitle band is dark anyway)
C.spot = function (ctx, p, a, r0 = 180, r1 = 760, y0 = 300, y1 = 1300) {
  if (a <= .01) return; const g = ctx.createRadialGradient(p[0], p[1] - 60, r0, p[0], p[1] - 60, r1);
  g.addColorStop(0, 'rgba(2,1,0,0)'); g.addColorStop(1, `rgba(2,1,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  ctx.fillStyle = `rgba(2,1,0,${a})`; ctx.fillRect(0, 0, W, y0); ctx.fillRect(0, y1, W, H - y1);
};
// subtitle chunks of this scene (scene-relative [t0, t1])
C.subs = function (info) {
  const sc = info.sc; return ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1).map(c => [c.t0 - sc.t0, c.t1 - sc.t0, c]);
};

// =====================================================================================================
// breaths: the bell interior world (bell-local units mapped to world = screen at zoom 1)
// =====================================================================================================
const BC = { x: 540, y: 870, s: .76 };              // bell interior centre / scale
const FS = .82 * BC.s;                               // figure scale (as the kit's bellman)
const map = (lx, ly) => [BC.x + lx * BC.s, BC.y + ly * BC.s];
const BMP = map(4, 226);                             // the bellman's pelvis (kneeling behind him at his side, sitting on his heels, facing left)
const BM = { T0: .22, Th: .5, Tlift: .55, Tc: .36, Tl: .2, h0: .34, hc: .42, hl: .42 };
const LEM = { x0: map(14, 400)[0], y0: map(14, 400)[1], r0: -.42, x: map(54, 290)[0], y: map(54, 290)[1], r: -Math.PI / 2 + .03, h: -.18, hCare: -.22 };   // him: out of the hatch -> on his back, head left
const HATCH = map(0, 358), HR = [140 * BC.s, 34 * BC.s];
const BENCH = map(-226, 112);                        // where the helmet is set down (neck point)

C.breathsTimes = function (sc) {
  const fake = { sc }, at = (w, f) => PK.at(fake, w, f);
  const T = { cut: at('끊긴', .1), yak: at('약', .18), n35: at('35분', .22), bel: at('벨', .35), dun: at('던컨', .4), ol: at('올콕이', .45),
    sum: at('숨을', .5), du: at('두', .55), bul: at('불어넣자', .6), he: at('그가', .73), gasp: at('들이켰다고', .82), end: at('합니다', .9) };
  T.p1 = T.du - .06; T.p2 = T.bul + .26;               // the two breaths
  T.lift0 = T.dun - .05; T.lift1 = T.sum - .1;         // helmet off and onto the bench
  return T;
};
// camera: {fx, fy} world point shown at screen (540, FYS), zoom z
const FYS = 860;
C.breathsCam = function (t, T) {
  const push = P(t, T.bel - .15, T.bel + 1.15, E.inOutQ), tense = P(t, T.he - .1, T.gasp, E.inQ), rel = P(t, T.gasp + .45, T.gasp + 2.6, E.inOutQ);
  const fA = [520, 1000], fB = [500, 1040];
  const z = lerp(1.22, 1.72, push) + .07 * tense * (1 - rel) - .1 * rel;
  const fx = lerp(fA[0], fB[0], push), fy = lerp(fA[1], fB[1], push) - 12 * rel;
  const sk = LM.shake(t, .12 + .1 * tense, 171), jo = LM.jolt(t, T.gasp + .02, .9), dr = { x: fb(t * .3, 172) * 6, y: fb(t * .27, 173) * 5 };
  return { fx, fy, z, ox: sk.x + jo.x + dr.x, oy: sk.y + jo.y + dr.y, r: sk.r * .5 };
};
C.applyCam = (ctx, c) => { ctx.translate(540 + c.ox, FYS + c.oy); ctx.rotate(c.r); ctx.scale(c.z, c.z); ctx.translate(-c.fx, -c.fy); };
C.toScreen = (c, p) => { const x = (p[0] - c.fx) * c.z, y = (p[1] - c.fy) * c.z, cr = Math.cos(c.r), sr = Math.sin(c.r); return [540 + c.ox + x * cr - y * sr, FYS + c.oy + x * sr + y * cr]; };

// state of the two figures at time t (breaths clock)
function state(t, T) {
  const haul = E.inOutQ(P(t, -.9, T.bel - .25));                    // hauled up out of the hatch and laid down
  const lift = P(t, T.lift0, T.lift1, E.inOutQ);                     // helmet: 0 on his head -> 1 on the bench
  const gasp = t - T.gasp;
  const pk = tp => Math.exp(-Math.pow((t - tp - .1) / .22, 2));      // the bellman bends lower for each breath
  const lean = pk(T.p1) + pk(T.p2);
  const care = P(t, T.lift1 - .3, T.p1 - .1, E.inOutQ);
  const relief = P(t, T.gasp + .35, T.gasp + 1.6, E.inOutQ);
  // him: from half out of the hatch to lying on his back behind it, head left
  const pel = [lerp(LEM.x0, LEM.x, haul), lerp(LEM.y0, LEM.y, E.outQ(haul))];
  const rot = lerp(LEM.r0, LEM.r, haul);
  const breathe = gasp > 0 ? .05 * Math.sin(gasp * 2.6 - .4) * clamp(gasp * 2) : 0;
  const LH = lerp(.35, LEM.h, haul) + LEM.hCare * care + .1 * Math.exp(-Math.pow((gasp - .1) / .15, 2)) * (gasp > -1 ? 1 : 0);
  const lemPose = { T: breathe, h: LH, na: [lerp(.1, .22, haul), .16], fa: [lerp(-.2, -.06, haul), .2], nl: [lerp(.3, .03, haul), lerp(-.4, .02, haul)], fl: [lerp(.1, -.05, haul), lerp(-.3, .06, haul)] };
  const LR = q => C.figR(pel, FS, 1, rot, q);
  const lemNeck = LR(C.tor(breathe, 8, -166)), lemHA = breathe + LH;
  const hq = (u, v) => { const n = C.tor(breathe, 8, -166); return [n[0] + u * Math.cos(lemHA) - v * Math.sin(lemHA), n[1] + u * Math.sin(lemHA) + v * Math.cos(lemHA)]; };
  const lemHead = LR(hq(12, -52)), lemFace = LR(hq(62, -40)), lemChest = LR(C.tor(breathe, 16, -106));
  const lemShN = LR(C.tor(breathe, 12, -140)), lemShF = LR(C.tor(breathe, -4, -144));
  // the helmet (neck point + world angle): on his head -> lifted up -> set down on the bench, upright
  const hp0 = lemNeck, hp2 = BENCH, hp1 = [lerp(hp0[0], hp2[0], .2), Math.min(hp0[1], hp2[1]) - 70 * BC.s];
  const u = lift, hx = (1 - u) * (1 - u) * hp0[0] + 2 * u * (1 - u) * hp1[0] + u * u * hp2[0], hy = (1 - u) * (1 - u) * hp0[1] + 2 * u * (1 - u) * hp1[1] + u * u * hp2[1];
  const hAng = lerp(lemHA + rot, .04, E.inOutQ(clamp(u * 1.2)));
  const hpt = (nk, A, uu, vv) => [nk[0] + (uu * Math.cos(A) - vv * Math.sin(A)) * FS, nk[1] + (uu * Math.sin(A) + vv * Math.cos(A)) * FS];
  const helmC = hpt([hx, hy], hAng, 12, -52);
  // the bellman (kneeling behind him at his side, facing left): bent to haul, reaching to the helmet, over his head after
  const kH = 1 - P(t, T.bel - .5, T.lift0 - .2, E.inOutQ), kL = P(t, T.lift0 - .35, T.lift0 + .05, E.inOutQ) * (1 - P(t, T.lift1 - .1, T.lift1 + .25, E.inOutQ)), kC = P(t, T.lift1 - .1, T.lift1 + .25, E.inOutQ);
  const BT = BM.T0 + BM.Th * kH + BM.Tlift * kL * (1 - lift) + BM.Tc * kC * (1 - .6 * relief) + BM.Tl * lean + .012 * Math.sin(t * .9);
  const BH = BM.h0 + BM.hc * kC * (1 - .6 * relief) + BM.hl * lean + .03 * Math.sin(t * .6);
  const shN = C.tor(BT, 12, -140), shF = C.tor(BT, -4, -144);
  // hand targets (world): under his arms (haul) -> the helmet's sides (lift) -> his chest and under his head (care)
  const hcR = [Math.cos(hAng), Math.sin(hAng)];
  const tHaulN = [lemShN[0] + 6 * BC.s, lemShN[1] - 6 * BC.s], tHaulF = [lemShF[0] - 12 * BC.s, lemShF[1] - 4 * BC.s];
  const tLiftN = [helmC[0] + hcR[0] * 46 * FS, helmC[1] + hcR[1] * 46 * FS + 6], tLiftF = [helmC[0] - hcR[0] * 50 * FS, helmC[1] - hcR[1] * 50 * FS + 4];
  const tCareN = [lemChest[0] + 6 * BC.s, lemChest[1] - 30 * BC.s], tCareF = [lemHead[0] - 6 * BC.s, lemHead[1] - 30 * BC.s];
  const k0 = Math.max(0, 1 - kL - kC), mixP = (a, b, c) => [a[0] * k0 + b[0] * kL + c[0] * kC, a[1] * k0 + b[1] * kL + c[1] * kC];
  const tgN = mixP(tHaulN, tLiftN, tCareN), tgF = mixP(tHaulF, tLiftF, tCareF);
  const na = C.ik(shN, C.unfig(BMP, FS, -1, tgN)), fa = C.ik(shF, C.unfig(BMP, FS, -1, tgF));
  const bmPose = { T: BT, h: BH, na, fa, nl: [.95, -2.5], fl: [.82, -2.42] };
  const bmNeck = C.fig(BMP, FS, -1, C.tor(BT, 8, -166)), bHA = BT + BH;
  const bmHead = C.fig(BMP, FS, -1, [C.tor(BT, 8, -166)[0] + 12 * Math.cos(bHA) + 52 * Math.sin(bHA), C.tor(BT, 8, -166)[1] + 12 * Math.sin(bHA) - 52 * Math.cos(bHA)]);
  const bmFace = C.fig(BMP, FS, -1, [C.tor(BT, 8, -166)[0] + 50 * Math.cos(bHA) + 36 * Math.sin(bHA), C.tor(BT, 8, -166)[1] + 50 * Math.sin(bHA) - 36 * Math.cos(bHA)]);
  // his light: an ember (no beat) -> small swells with each breath -> the flare, then a steady heartbeat
  const sw = tp => { const v = t - tp - .32; return v > 0 ? Math.exp(-v * 3) * clamp(v * 8) : 0; };
  const flare = P(t, T.gasp - .03, T.gasp + .3, E.outC);
  const dip = P(t, T.he - .1, T.gasp - .05) * (1 - flare);
  const ember = (.17 + .05 * nz(t * 2.2, 77)) * (1 - .6 * dip) + .22 * (sw(T.p1) + sw(T.p2));
  const life = lerp(ember, 1, flare) + .55 * (gasp > 0 ? Math.exp(-gasp * 2.6) * flare : 0);
  const bpm = 78, beat = gasp > 0 ? C.thump(gasp * bpm / 60) * clamp(gasp * 3) : 0;
  const glow = lerp(.74, .5, dip) * (1 - flare) + flare * (1 + .25 * Math.exp(-Math.max(0, gasp) * 2.2));
  return { haul, lift, lean, relief, gasp, pel, rot, lemPose, lemNeck, lemHA, lemHead, lemFace, lemChest, hx, hy, hAng, helmC, bmPose, bmHead, bmFace, life, beat, bpm, glow, flare, dip };
}

// draw the bell world (caller has applied the camera). Returns the state.
C.breathsWorld = function (ctx, t, T, o = {}) {
  const S = state(t, T);
  const gk = clamp(S.glow, 0, 1.25);
  // ---- the bell interior (kit), lamp-lit; the figures are ours ----
  const bR = LM.bell(ctx, BC.x, BC.y, BC.s, t, { inside: true, bellman: 0, glow: Math.min(1, gk), water: 1 });
  if (gk > 1.02) LM.glow(ctx, bR.lamp[0], bR.lamp[1] + 40, 520 * BC.s, COL.amber, .3 * (gk - 1) * 4);
  // ---- the hatch: Yuasa's cold lamp still under the water as he is pushed up ----
  const yA = .6 * (1 - P(t, T.bel - .6, T.bel + .5));
  if (yA > .01) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(HATCH[0], HATCH[1], HR[0], HR[1], 0, 0, TAU); ctx.clip();
    C.softGlow(ctx, HATCH[0] + 40 * BC.s + 10 * Math.sin(t * 1.3), HATCH[1] + 30 * BC.s, 190 * BC.s, COL.lamp, .55 * yA);
    LM.glow(ctx, HATCH[0] + 46 * BC.s, HATCH[1] + 12 * BC.s, 34 * BC.s, '#ffffff', .5 * yA);
    ctx.restore();
  }
  // warm presence behind the bellman (Allcock)
  C.softGlow(ctx, S.bmHead[0] - 20 * BC.s, S.bmHead[1] + 50 * BC.s, 300 * BC.s, COL.amber, (.16 + .08 * S.lean) * Math.min(1, gk) + .1 * S.flare * (1 - P(t, T.gasp + .6, T.gasp + 2)));
  const lam = bR.lamp, hasHelmet = S.lift <= 0;
  // ---- the bellman (faceless warm presence): kneeling behind him, so he is rendered once into a screen-size buffer and
  // composited twice — whole, before him (his body hides the bellman's legs), then above the line of his body, after him
  const BO = { kind: 'bellman', pose: S.bmPose, anchor: 'pelvis', dir: -1, idle: 0, fill: '#0c0805', rim: COL.warm, rimA: .9, light: lam, halo: .3, warm: .6 + .3 * S.flare };
  const bmR = LM.diver(null, BMP[0], BMP[1], FS, t, BO);
  const M = ctx.getTransform(), sp = q => { const r = M.transformPoint(new DOMPoint(q[0], q[1])); return [r.x, r.y]; };
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (const q of [bmR.head, bmR.hand, bmR.hand2, bmR.foot, bmR.foot2, bmR.pelvis, bmR.chest]) { const r = sp(q); bx0 = Math.min(bx0, r[0]); by0 = Math.min(by0, r[1]); bx1 = Math.max(bx1, r[0]); by1 = Math.max(by1, r[1]); }
  const mg = 130 * FS * Math.hypot(M.a, M.b) + 20;
  bx0 = clamp(Math.floor(bx0 - mg), 0, W); by0 = clamp(Math.floor(by0 - mg), 0, H); bx1 = clamp(Math.ceil(bx1 + mg), 0, W); by1 = clamp(Math.ceil(by1 + mg), 0, H);
  const [bmB, bmX] = L.buf('lmcBellman', W, H);
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw > 0 && bh > 0) {
    bmX.clearRect(bx0, by0, bw, bh); bmX.save(); bmX.beginPath(); bmX.rect(bx0, by0, bw, bh); bmX.clip(); bmX.setTransform(M); bmX.globalAlpha = 1;
    LM.diver(bmX, BMP[0], BMP[1], FS, t, BO); bmX.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bmB, bx0, by0, bw, bh, bx0, by0, bw, bh); ctx.restore();
  }
  // ---- him (clipped by the floor in front of the hatch: below the hatch line only the opening shows) ----
  const LO = { pose: S.lemPose, anchor: 'pelvis', dir: 1, rot: S.rot, idle: 0, helmet: hasHelmet, bailout: false, fill: '#0b0806', rim: COL.warm, rimA: .85, light: lam, rim2A: .12, halo: .22,
    warm: .45, life: Math.min(1, S.life) * .7, lifeS: .14, bpm: S.bpm, detail: .9 };
  ctx.save();
  ctx.beginPath(); ctx.rect(BC.x - 400 * BC.s, BC.y - 600 * BC.s, 800 * BC.s, (358 + 600) * BC.s); ctx.ellipse(HATCH[0], HATCH[1], HR[0], HR[1], 0, 0, TAU); ctx.clip();
  const dvR = LM.diver(ctx, S.pel[0], S.pel[1], FS, S.gasp, LO);
  ctx.restore();
  // the near water over his legs + rings where he breaks the surface
  ctx.save(); ctx.beginPath(); ctx.ellipse(HATCH[0], HATCH[1], HR[0], HR[1], 0, 0, Math.PI); ctx.closePath(); ctx.fillStyle = 'rgba(1,4,5,.62)'; ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.ellipse(HATCH[0], HATCH[1], HR[0], HR[1], 0, 0, TAU); ctx.clip(); ctx.lineWidth = 2;
  const wx = S.pel[0] - 6 * BC.s;
  for (let k = 0; k < 3; k++) { const ph = (t * (.5 + .3 * (1 - S.haul)) + k / 3) % 1; ctx.strokeStyle = rgba(COL.warm, (.18 + .2 * (1 - S.haul)) * (1 - ph) * Math.min(1, gk)); ctx.beginPath(); ctx.ellipse(wx, HATCH[1] + 4, 40 * BC.s + ph * 120 * BC.s, 7 * BC.s + ph * 22 * BC.s, 0, 0, TAU); ctx.stroke(); }
  if (S.gasp > 0) for (let k = 0; k < 2; k++) { const u = S.gasp - k * .22; if (u < 0 || u > 1.4) continue; const e = E.outC(u / 1.4); ctx.strokeStyle = rgba(COL.core, .5 * (1 - u / 1.4)); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(wx, HATCH[1] + 4, 40 * BC.s + e * 170 * BC.s, 7 * BC.s + e * 36 * BC.s, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  // ---- the helmet, once it is off his head ----
  if (!hasHelmet) C.helmet(ctx, S.hx, S.hy, S.hAng, FS, 1, { fill: '#0b0806', rim: COL.warm, rimDir: Math.atan2(lam[1] - S.hy, lam[0] - S.hx), warm: .5 });
  // ---- the bellman, second pass: his arms and upper body over him ----
  // he kneels behind him: drawn before him (his body hides the bellman's legs) and once more, above the line of his body, after him
  if (bw > 0 && bh > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(BC.x - 400 * BC.s, BC.y - 700 * BC.s, 800 * BC.s, (700 + lerp(470, 250, S.haul)) * BC.s); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bmB, bx0, by0, bw, bh, bx0, by0, bw, bh); ctx.restore();
  }
  // ---- the two breaths ----
  for (const tp of [T.p1, T.p2]) {
    const u = t - tp; if (u < 0 || u > 1.3) continue;
    const k1 = E.inOutQ(clamp(u / .34)), px = lerp(S.bmFace[0], S.lemFace[0], k1), py = lerp(S.bmFace[1], S.lemFace[1], k1), a1 = Math.sin(Math.PI * clamp(u / .5));
    C.softGlow(ctx, px, py, 80 * BC.s, COL.warm, .5 * a1); LM.glow(ctx, px, py, 22 * BC.s, COL.core, .55 * a1);
    const u2 = u - .3;
    if (u2 > 0) {
      const a2 = Math.exp(-u2 * 2.6) * clamp(u2 * 8), ch = S.lemChest;
      C.softGlow(ctx, ch[0], ch[1], 200 * BC.s, COL.amber, .4 * a2);
      ctx.save(); ctx.strokeStyle = rgba(COL.warm, .55 * a2); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ch[0], ch[1], (26 + 150 * E.outC(clamp(u2 / 1))) * BC.s, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  // ---- his light ----
  const ch = S.lemChest;
  C.lifeGlow(ctx, S.beat, ch[0], ch[1], S.life, .95 * BC.s);
  // the moment of life: ripple rings through the bell
  if (S.gasp > -.02) {
    const g = Math.max(0, S.gasp);
    if (g < 1.5) C.softGlow(ctx, ch[0], ch[1], 600 * BC.s, COL.amber, .46 * Math.exp(-g * 2.2) * (1 - P(g, 1.1, 1.5)));
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const u = g - k * .17; if (u < 0 || u > 1.7) continue; const q = u / 1.7, r = (40 + 720 * E.outC(q)) * BC.s;
      ctx.strokeStyle = rgba(k ? COL.warm : COL.core, (k ? .45 : .8) * Math.pow(1 - q, 1.5)); ctx.lineWidth = (7 * (1 - q) + 1.5) * BC.s; ctx.beginPath(); ctx.arc(ch[0], ch[1], r, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  S.bell = bR; S.dv = dvR; S.bm = bmR;
  return S;
};

window.PK.scenes.breaths = function (ctx, t, d, info) {
  const D = info.sc.data || {}, T = C.breathsTimes(info.sc);
  const cam = C.breathsCam(t, T);
  ctx.fillStyle = '#020303'; ctx.fillRect(0, 0, W, H);
  ctx.save(); C.applyCam(ctx, cam);
  const S = C.breathsWorld(ctx, t, T);
  ctx.restore();
  // a soft pool on the two of them: the bell's edges fall off into shadow
  C.spot(ctx, C.toScreen(cam, S.lemChest), .62 - .22 * S.flare);
  // dim the frame behind the big counter (beat A), deepen the edges for the tense beat
  const cA = P(t, -.2, .25) * (1 - P(t, T.bel - .28, T.bel + .06, E.inQ));
  if (cA > 0) {
    const g = ctx.createRadialGradient(540, 660, 40, 540, 660, 420); g.addColorStop(0, `rgba(1,2,2,${.78 * cA})`); g.addColorStop(1, 'rgba(1,2,2,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 240, W, 840);
  }
  if (S.dip > 0) { const g = ctx.createRadialGradient(540, 880, 260, 540, 880, 900); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.5 * S.dip})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (S.gasp > 0) L.flash(ctx, .14 * Math.exp(-S.gasp * 5), '#ffd9a0');

  // ---- the counter: '생명줄이 끊긴 지 약 35분' ----
  if (cA > .01) {
    const y0 = 650 - 50 * E.inQ(P(t, T.bel - .28, T.bel + .06));
    const la = P(t, .02, .35, E.outQ);
    text(ctx, '생명줄이 끊긴 지', 540, y0 - 92, { size: 40, weight: 800, color: '#cfe8ff', alpha: la * cA });
    const n = Math.round(35 * E.outC(P(t, T.cut, T.n35))), pop = 1 + .16 * Math.exp(-Math.pow((t - T.n35 - .06) / .12, 2));
    const yakA = P(t, T.yak - .05, T.yak + .15), sz = 124, wY = measure(ctx, '약 ', sz, FONT.disp, 400), wN = measure(ctx, '35분', sz, FONT.disp, 400), x0 = 540 - (wY + wN) / 2;
    ctx.save(); ctx.globalAlpha *= cA * P(t, T.cut - .04, T.cut + .1);
    ctx.translate(x0 + wY + wN / 2, y0); ctx.scale(pop, pop);
    text(ctx, n + '분', 0, 0, { size: sz, family: FONT.disp, weight: 400, color: '#ffd28a', stroke: '#000', strokeW: 12 });
    ctx.restore();
    if (yakA > 0) text(ctx, '약', x0 + wY * .42, y0, { size: sz, family: FONT.disp, weight: 400, color: '#ffd28a', stroke: '#000', strokeW: 12, alpha: yakA * cA });
    // time line: the snap (white tick) -> now
    const lp = E.outC(P(t, T.cut, T.n35)), lx0 = 330, lx1 = 750, ly = y0 + 96;
    ctx.save(); ctx.globalAlpha *= cA * la; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(160,200,210,.22)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke();
    const gl = ctx.createLinearGradient(lx0, 0, lx1, 0); gl.addColorStop(0, '#e8f6ff'); gl.addColorStop(.12, COL.amber); gl.addColorStop(1, '#ffd28a');
    ctx.strokeStyle = gl; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lerp(lx0, lx1, lp), ly); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(lx0 - 2, ly - 14, 4, 28);
    ctx.restore();
    if (lp > 0) LM.glow(ctx, lerp(lx0, lx1, lp), ly, 36, COL.amber, .8 * cA * (1 - P(t, T.n35 + .2, T.n35 + .8) * .5));
  }
  // ---- chips ----
  const topA = P(t, T.bel + .02, T.bel + .32) * (1 - P(t, T.gasp + .7, T.gasp + 1.1));
  PK.chip(ctx, '생명줄이 끊긴 지 약 35분', 540, 490, topA, { size: 30, color: '#ffe3b8', border: rgba(COL.amber, .5) });
  const tmA = P(t, T.lift0 + .1, T.lift0 + .4) * (1 - P(t, T.gasp + .7, T.gasp + 1.1));
  if (tmA > 0) { const k = lerp(.85, 1, E.outBack(P(t, T.lift0 + .1, T.lift0 + .45))); ctx.save(); ctx.translate(540, 548); ctx.scale(k, k); PK.chip(ctx, D.time || '', 0, 0, tmA, { size: 30, color: '#ffffff', border: 'rgba(255,220,170,.55)' }); ctx.restore(); }
  const bA = P(t, T.bel + .18, T.bel + .48) * (1 - P(t, T.sum - .05, T.sum + .25));
  if (bA > 0) {
    const hs = C.toScreen(cam, S.bmHead), cx = clamp(hs[0] + 250, 300, 820), cy = clamp(hs[1] - 120, 640, 1000);
    C.lead(ctx, hs[0] + 30, hs[1] - 30, cx - 120, cy + 20, bA);
    PK.chip(ctx, D.bell || '', cx, cy, bA, { size: 30, color: '#ffe3b8', border: rgba(COL.amber, .6) });
  }
  LM.subBand(ctx, .82, 1150);
  const nA = P(t, T.gasp + .7, T.gasp + 1.05) * (1 - P(t, d - .15, d + .1));
  PK.chip(ctx, D.note || '', 540, 1186, nA, { size: 26, color: '#cfe8ff', border: 'rgba(150,210,255,.3)' });
};
})();
