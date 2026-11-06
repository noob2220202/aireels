// same (real audio, BBC World Service Outlook 2019 — Chris Lemons): "As soon as we got into the water, the same three, you know,
// Duncan, Dave and myself, we all went back together to the same place."
// Hard cut from 'back' (same camera, same positions): the two divers settle into work on the lattice — Lemons crouched on the top
// deck (amber life-light + cold lamp), Yuasa holding on at its right side (cold lamp) — under the bell, whose warm light is the
// bellman. 'As soon as we got into the water' -> the blue ambient sinks away: only the three lights and what they touch remain.
// 'the same three' -> three quick soft rings, one on each light. 'Duncan' -> the bell's porthole and hatch bloom + ring + small
// tag '던컨'; 'Dave' -> Yuasa's lamp flares + ring + '데이브'; 'myself' -> Lemons' amber light flares + ring + '레몬스'.
// 'we all went back together' -> warm pulses leave the bell down both umbilicals at once and arrive at both divers together;
// 'to the same place' -> their lamps light the same lattice; a slow pull back. Attribution card (with a small live waveform) up.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, C = PK.LMC, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const RMS = [69, 74, 77, 84, 84, 84, 67, 62, 75, 48, 77, 86, 76, 43, 73, 87, 84, 86, 74, 55, 75, 71, 75, 75, 74, 80, 81, 81, 78, 63, 39, 45, 51, 69, 62, 61, 48, 44, 59, 74, 78, 67, 56, 47, 76, 67, 70, 73, 85, 82, 84, 54, 38, 47, 68, 86, 89, 82, 81, 78, 77, 74, 72, 64, 68, 64, 64, 62, 36, 23, 75, 75, 70, 68, 38, 45, 66, 68, 64, 64, 65, 46, 45, 75, 73, 72, 67, 51, 57, 63, 63, 56, 53, 52, 58, 71, 67, 63, 39, 15, 49, 69, 67, 68, 64, 65, 59, 56, 48, 80, 73, 35, 4, 56, 51, 66, 71, 77, 74, 72, 70, 62, 23, 51, 68, 77, 91, 60, 77, 63, 68, 67, 71, 72, 68, 67, 54, 34, 62, 74, 74, 65, 61, 55, 43, 44, 49, 43, 26, 0, 2, 19, 26, 27];
const loud = C.env(RMS);
// word onsets (s from voice start; Whisper word timestamps of the real audio)
const WD = { water: .78, three: 1.32, duncan: 2.22, dave: 2.70, myself: 2.96, we: 3.34, together: 3.70, same: 4.34, end: 4.78 };
const POS = LM.POSES;
function blendPose(a, b, m) { const r = {}; for (const k in a) r[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], m)) : lerp(a[k], b[k], m); return r; }
// a pulse of warm light travelling along a line's points (f 0..1)
function travel(ctx, pts, f, a, col, w) {
  if (!pts || pts.length < 2 || a <= .01 || f < 0 || f > 1) return;
  const i = Math.min(pts.length - 1, Math.floor(f * (pts.length - 1))), p = pts[i];
  LM.glow(ctx, p[0], p[1], w * 7, col, .7 * a); LM.glow(ctx, p[0], p[1], w * 2, COL.core, .9 * a);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, .7 * a); ctx.lineWidth = w * .8; ctx.lineCap = 'round'; ctx.beginPath();
  const j0 = Math.max(0, i - 10); for (let j = j0; j <= i; j++) (j === j0 ? ctx.moveTo(pts[j][0], pts[j][1]) : ctx.lineTo(pts[j][0], pts[j][1])); ctx.stroke(); ctx.restore();
}
function ring(ctx, x, y, u, col, r0 = 30, r1 = 170, lw = 4) {
  if (u < 0 || u > 1) return; const k = E.outC(u);
  ctx.save(); ctx.strokeStyle = rgba(col, .75 * Math.pow(1 - u, 1.3)); ctx.lineWidth = lw * (1 - u) + 1.2; ctx.beginPath(); ctx.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); ctx.stroke(); ctx.restore();
}

window.PK.scenes.same = function (ctx, t, d, info) {
  const D = info.sc.data || {}, sc = info.sc, v0 = sc.voice_t - sc.t0, tc = t - v0, w = k => v0 + WD[k];
  const SITE = C.SITE, B = SITE.BELL, DS = SITE.DS;
  const lv = loud(tc);
  // settle into work (continuing from the end of 'back')
  const u = P(t, -.1, 1.5, E.inOutQ);
  const dim = P(t, w('water') - .4, w('three') + .2, E.inOutQ);            // the blue ambient sinks away
  const fl = (k, wd) => Math.exp(-Math.pow((t - w(k) - .12) / wd, 2));
  const fD = fl('duncan', .35), fV = fl('dave', .32), fM = fl('myself', .35);
  const tog = P(t, w('together') - .3, w('same') + .1);                   // warm pulses travelling down both lines
  const arrive = Math.exp(-Math.pow((t - w('same') - .1) / .3, 2));
  const pull = P(t, w('same') - .2, d + .3, E.inOutQ);
  // the bell (as 'back' left it)
  const bob = 6 * Math.sin((t + 4.01) * 1.3), sw = .012 * Math.sin((t + 4.01) * .9 + .5);
  const bO = { glow: .92 + .5 * fD + .2 * arrive, hatch: 1, lamps: .55 * (1 - .5 * dim), amb: lerp(.32, .14, dim), swing: sw, wireTop: -400, rim: '#bfe6f0' };
  const bR0 = LM.bell(null, B.x, B.y + bob, B.s, t, bO);
  // Lemons: from swimming (end of 'back') to crouched on the top deck, working
  const crO = { pose: 'crouch', dir: -1, anchor: 'base', idle: 0 };
  const cr = LM.diver(null, SITE.LEMW.x, SITE.LEMW.y, DS, 0, crO).chest;
  const swimP = blendPose(POS.float, POS.swim, .85);
  const lemPose = blendPose(swimP, POS.crouch, u);
  const work = P(t, 1.2, 2);
  lemPose.na = [lemPose.na[0] + .18 * work * Math.sin(t * 2.1), lemPose.na[1] + .2 * work * Math.sin(t * 2.1 + 1)];
  const lemO = { pose: lemPose, dir: -1, rot: lerp(-.12, 0, u), kick: .45 * (1 - u), idle: .6, life: 1 + .5 * fM + .25 * arrive, bpm: 64, lifeS: .8 + .3 * fM,
    lamp: 1 + .2 * arrive, lampAng: lerp(Math.PI * .78, Math.PI * .66, u), beamLen: 640, bailout: true, rim: '#a8dcf0', light: bR0.port, halo: .22 + .2 * fM, rimA: .9 };
  const lemC = [lerp(476, cr[0], u), lerp(788, cr[1], u)];
  // Yuasa: from swimming to holding on at the lattice's right side, lamp on it
  const yuaPose = blendPose(swimP, POS.float, u);
  yuaPose.na = [lerp(yuaPose.na[0], 1.5, u), lerp(yuaPose.na[1], .25, u)]; yuaPose.fa = [lerp(yuaPose.fa[0], 1.25, u), lerp(yuaPose.fa[1], .4, u)];
  const yuaO = { pose: yuaPose, dir: -1, rot: lerp(-.12, .08, u), kick: .3 * (1 - u) + .12, idle: 1, phase: 1.7, lamp: 1 + .9 * fV + .2 * arrive, lampAng: lerp(Math.PI * .7, Math.PI * 1.06, u), beamLen: 700 + 160 * fV,
    bailout: true, rim: '#a8dcf0', light: bR0.port, halo: .22 + .25 * fV, rimA: .9 };
  const yuaC = [lerp(768, SITE.YUAW.x, u), lerp(940, SITE.YUAW.y, u)];
  // camera: from 'back's last framing, a slow push, then a slow pull back on 'the same place'
  const sk = LM.shake(t, .1, 211);
  const cam = { x: lerp(556 + fb((t + 4.01) * .2, 202) * 8, 572, P(t, 0, 2.4, E.inOutQ)), y: lerp(862, 856, P(t, 0, 2.4, E.inOutQ)), z: lerp(1.04, 1.13, P(t, 0, w('same'), E.inOutQ)) - .06 * pull, ox: sk.x, oy: sk.y, r: sk.r * .5 };
  const lemD = { x: lemC[0], y: lemC[1], s: DS, o: lemO }, yuaD = { x: yuaC[0], y: yuaC[1], s: DS, o: yuaO };
  const R = C.site(ctx, t, {
    cam, sea: { dark: lerp(.3, .7, dim), top: '#1d5770', mid: '#0f3546', bottom: '#06171f', surface: .45 * (1 - dim), surfaceColor: '#8fd0e0', snow: .8, current: [4, -1.5], murk: .8, haze: .8 },
    amb: lerp(.3, .07, dim) + .05 * arrive, ambColor: '#a8d0e0', bedDark: lerp(.25, .6, dim),
    bell: { x: B.x, y: B.y + bob, s: B.s, o: bO },
    divers: [lemD, yuaD],
    umbs: [{ diver: 0, pulse: .5, sag: lerp(40, 70, u), w: 6.5, lit: .55, glow: .4 * tog }, { diver: 1, pulse: .5, sag: lerp(40, 30, u), w: 6.5, lit: .55, glow: .4 * tog }],
    front: (c, bR, dR, uR) => {
      // 'together': warm pulses leave the bell down both lines and arrive at the same moment
      for (const k of [0, 1]) if (uR[k]) { const pts = uR[k].pts, f = P(t, w('together') - .15, w('same') + .05, E.inOutQ); travel(c, pts, f, Math.sin(Math.PI * clamp(f * 1.02)) * .95 + .05 * (f > 0 && f < 1), COL.warm, 8); }
    },
  });
  // ---- rings + name tags (screen space) ----
  const cm = R.cam, port = C.siteToS(cm, R.bell.port), lemS = C.siteToS(cm, R.divers[0].chest), yuaS = C.siteToS(cm, R.divers[1].lamp);
  const three = [[port, COL.warm], [yuaS, COL.lamp], [lemS, COL.amber]];
  three.forEach(([p, col], i) => ring(ctx, p[0], p[1], (t - (w('three') + .1 + i * .17)) / .9, col, 24, 120, 3));
  ring(ctx, port[0], port[1], (t - w('duncan') - .05) / 1.1, COL.warm, 30, 220, 5);
  ring(ctx, yuaS[0], yuaS[1], (t - w('dave') - .05) / 1.1, COL.lamp, 26, 200, 5);
  ring(ctx, lemS[0], lemS[1], (t - w('myself') - .05) / 1.1, COL.amber, 30, 230, 5);
  for (const p of [lemS, yuaS]) ring(ctx, p[0], p[1], (t - w('same') - .05) / 1, COL.warm, 30, 160, 3);
  const tagA = (k, t0) => P(t, w(k) - .05, w(k) + .2) * (1 - P(t, d - .4, d - .1));
  const tag = (s, x, y, a, col, bord, ax, ay) => {
    if (a <= 0) return; const k = lerp(.8, 1, E.outBack(clamp(a * 1.2)));
    C.lead(ctx, ax, ay, x, y, a * .9, rgba(bord, .6));
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); PK.chip(ctx, s, 0, 0, a, { size: 34, color: col, border: rgba(bord, .7) }); ctx.restore();
  };
  tag('던컨', port[0] - 170, port[1] + 20, tagA('duncan'), '#ffe3b8', COL.amber, port[0] - 30, port[1] + 6);
  tag('데이브', clamp(yuaS[0] + 150, 120, 960), yuaS[1] + 92, tagA('dave'), '#e8f6ff', '#bfe6ff', yuaS[0] + 20, yuaS[1] + 30);
  tag('레몬스', lemS[0] - 40, lemS[1] - 150, tagA('myself'), '#ffd9a0', COL.amber, lemS[0] - 6, lemS[1] - 50);

  LM.subBand(ctx, .8, 1150);
  const ca = P(t, .03, .3, E.outQ) * (1 - P(t, d - .32, d - .04, E.inQ));
  C.card(ctx, D.who || '', D.where || '', ca, 1185);
  if (ca > 0) {   // small live waveform in the card
    ctx.save(); ctx.globalAlpha = ca;
    for (let i = 0; i < 11; i++) { const v = .15 + .85 * loud(tc - (10 - i) / 30) * (.65 + .35 * Math.sin(t * 11 + i * 1.7)); const bh = 6 + 40 * v; ctx.fillStyle = i % 2 ? '#7fd6ff' : '#bfeaff'; roundRect(ctx, 806 + i * 9.5, 1185 - bh / 2, 5, bh, 2.5); ctx.fill(); }
    ctx.restore();
    if (lv > .05) { ctx.save(); ctx.strokeStyle = rgba('#ff6a6f', ca * .5 * lv); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(540 - 380 + 34, 1185, 13 + 10 * lv, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
};
})();
