// close (104.62-112.66): "레몬스가 꼽는, 살아남은 큰 이유 하나. 곁에 있던 사람들입니다."
// Out of the dip, the camera is close on the work site as 'same' left it (bell, Lemons on the deck, Yuasa at the lattice) and
// pulls all the way back and up: the whole water column, the dive support vessel (no name/logo) on the night swell, its lift wire
// down to the bell, the two umbilicals down to the divers — three small lights (warm bell, cold Yuasa, amber Lemons) and the
// ship's lights above, all joined by thin lines. '레몬스가 꼽는,' -> his own words fade in small below (data.quote, English).
// '살아남은 큰 이유 하나.' -> the pull-back completes; stillness. '곁에' -> rings on the bell and on Yuasa; '있던' -> the ship's
// lights brighten (a ring at the bridge); '사람들입니다.' -> every line warms and glows, an amber ring from him, 'the people around
// me' in the quote turns warm. Final hold: data.line and data.names fade in above the quote; everything breathes gently, warm.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, C = PK.LMC, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
// the work site of 'same', scaled down into the column (world = screen at the final framing)
const K = .349, X0 = 470, Y0 = 1000, SURF = 618;
const f = p => [X0 + (p[0] - 418) * K, Y0 + (p[1] - 1190) * K];
const BELL = f([800, 598]), BS = .5 * K, DS = .46 * K, SS = .86 * K;
const SHIP = { x: BELL[0] - 20 * .42, s: .42 };
const LEMB = f([432, 1190 - 344 * .86 + 3]), YUAC = f([748, 962]);

function glowLine(ctx, pts, a, col, w) {
  if (a <= .01 || pts.length < 2) return;
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(col, .08 * a); ctx.lineWidth = w * 9; path(); ctx.stroke();
  ctx.strokeStyle = rgba(col, .2 * a); ctx.lineWidth = w * 3.5; path(); ctx.stroke();
  ctx.strokeStyle = rgba('#fff3dc', .75 * a); ctx.lineWidth = w; path(); ctx.stroke();
  ctx.restore();
}
function ring(ctx, x, y, u, col, r0, r1, lw = 4) {
  if (u < 0 || u > 1) return; const k = E.outC(u);
  ctx.save(); ctx.strokeStyle = rgba(col, .7 * Math.pow(1 - u, 1.3)); ctx.lineWidth = lw * (1 - u) + 1; ctx.beginPath(); ctx.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); ctx.stroke(); ctx.restore();
}
function quoteParts(q) {
  const m = /^\s*["“](.+?)["”]\s*(.*)$/.exec(q || ''); const en = m ? m[1] : (q || ''), attr = m ? m[2] : '';
  const mid = en.length / 2; let k = -1; for (let i = 0; i < en.length; i++) if (en[i] === ' ' && (k < 0 || Math.abs(i - mid) < Math.abs(k - mid))) k = i;
  return { l1: '“' + (k > 0 ? en.slice(0, k) : en), l2: (k > 0 ? en.slice(k + 1) : '') + '”', attr };
}
// a line of text with one warm phrase
function warmLine(ctx, s, phrase, x, y, size, col, warm, a) {
  const i = phrase ? s.indexOf(phrase) : -1;
  if (i < 0 || warm <= 0) { text(ctx, s, x, y, { size, weight: 600, color: col, alpha: a }); return; }
  const A = s.slice(0, i), Bp = s.slice(i, i + phrase.length), Cs = s.slice(i + phrase.length);
  const wA = measure(ctx, A, size, FONT.sub, 600), wB = measure(ctx, Bp, size, FONT.sub, 600), wC = measure(ctx, Cs, size, FONT.sub, 600), x0 = x - (wA + wB + wC) / 2;
  text(ctx, A, x0, y, { size, weight: 600, color: col, align: 'left', alpha: a });
  text(ctx, Bp, x0 + wA, y, { size, weight: 700, color: PK.lerp2('#cfe8ff', '#ffd28a', warm), align: 'left', alpha: a });
  text(ctx, Cs, x0 + wA + wB, y, { size, weight: 600, color: col, align: 'left', alpha: a });
  if (warm > .05) LM.glow(ctx, x0 + wA + wB / 2, y, wB * .7, COL.amber, .12 * warm * a);
}

window.PK.scenes.close = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, fr) => PK.at(info, w, fr);
  const tPick = at('꼽는', .1), tLive = at('살아남은', .25), tOne = at('하나', .5), tBy = at('곁에', .6), tWere = at('있던', .66), tPeople = at('사람들입니다', .72);
  const vEnd = info.sc.voice_end - info.sc.t0;
  // camera: from the work site (as 'same' left it) all the way back
  const pb = E.inOutQ(P(t, -.3, tOne + .5));
  const z = lerp(2.6, 1.1, pb), cx = lerp(548, 556, pb) + fb(t * .2, 221) * 4 * pb, cy = lerp(862, 788, pb) + fb(t * .18, 222) * 4 * pb;
  const sk = LM.shake(t, .06, 223);
  const cam = { x: cx, y: cy, z, ox: sk.x, oy: sk.y - 90 * pb, r: sk.r * .3 };
  const toS = p => C.siteToS(cam, p);
  // warmth beats
  const wBy = P(t, tBy - .1, tBy + .5), wWere = P(t, tWere - .1, tWere + .5), wAll = P(t, tPeople - .1, tPeople + .9, E.inOutQ);
  const breathe = .5 + .5 * Math.sin(t * 1.4);
  const beat = C.thump(t * 64 / 60);
  // geometry (world)
  const bO = { glow: .9 + .3 * wBy, hatch: .8, lamps: .4, amb: .22, swing: .01 * Math.sin(t * .8), wireTop: SURF + 66 * SHIP.s, rim: '#bfe6f0' };
  const bR = LM.bell(null, BELL[0], BELL[1], BS, t, bO);
  const lemO = { pose: 'crouch', dir: -1, anchor: 'base', idle: .6, life: 1 + .2 * wAll, bpm: 64, lifeS: 1, lamp: .9, lampAng: Math.PI * .66, beamLen: 620, bailout: true, rim: '#a8dcf0', light: bR.port, halo: .25 };
  const yuaO = { pose: 'float', dir: -1, rot: .08, idle: 1, phase: 1.7, adj: { na: [1.5, .25], fa: [1.25, .4] }, kick: .12, lamp: .9 + .4 * wBy, lampAng: Math.PI * 1.06, beamLen: 700, bailout: true, rim: '#a8dcf0', light: bR.port, halo: .25 };
  const lemR = LM.diver(null, LEMB[0], LEMB[1], DS, t, lemO), yuaR = LM.diver(null, YUAC[0], YUAC[1], DS, t, yuaO);
  const shR = LM.ship(null, SHIP.x, SURF, SHIP.s, t, { lights: 1 });
  // lights for the water (screen space)
  const wl = bR.lights.concat(lemR.lights, yuaR.lights, shR.lights.map(Lt => Object.assign({}, Lt, { a: Lt.a * (1 + .5 * wWere) })));
  const sl = wl.map(Lt => { const p = toS([Lt.x, Lt.y]); return Object.assign({}, Lt, { x: p[0], y: p[1], r: Lt.r * z }); });
  LM.sea(ctx, t, { dark: .6, lights: sl, seed: 71, snow: .7, murk: .7, current: [3, -1], haze: .7, cam: [(cx - 540) * z, (cy - 860) * z], top: '#123a48', mid: '#0a2430', bottom: '#030c10' });

  ctx.save(); ctx.translate(540 + cam.ox, 860 + cam.oy); ctx.rotate(cam.r); ctx.scale(z, z); ctx.translate(-cx, -cy);
  // surface + ship
  LM.swell(ctx, SURF, t, 7, { under: .45, seed: 5, caps: .15 });
  LM.ship(ctx, SHIP.x, SURF, SHIP.s, t, { lights: 1 + .4 * wWere, under: .55, rim: '#9fc0cc' });
  LM.swell(ctx, SURF, t, 7, { front: true, seed: 5, under: 0, a: .6 });
  // seabed + structure (lit by their lamps)
  LM.seabed(ctx, Y0, t, { dark: .55, lights: wl, seed: 9 });
  LM.structure(ctx, X0, Y0, SS, t, { lights: wl, amb: .1, ambColor: '#a8d0e0' });
  // the lines: lift wire (ship -> bell), two umbilicals (bell -> divers)
  const ex = bR.exit, mp = [BELL[0], SURF + 66 * SHIP.s], wire = [mp, bR.wire];
  const uL = LM.umbilical(ctx, [ex, [lerp(ex[0], lemR.umb[0], .5), Math.max(ex[1], lemR.umb[1]) + 24], lemR.umb], t, { w: 2.6, lit: .55, sway: 3, pulse: .4, pulseSpeed: 90, pulseN: 1 });
  const uY = LM.umbilical(ctx, [ex, [lerp(ex[0], yuaR.umb[0], .5) + 4, Math.max(ex[1], yuaR.umb[1]) + 12], yuaR.umb], t, { w: 2.6, lit: .55, sway: 3, pulse: .4, pulseSpeed: 90, pulseN: 1 });
  LM.bell(ctx, BELL[0], BELL[1], BS, t, bO);
  LM.diver(ctx, YUAC[0], YUAC[1], DS, t, yuaO);
  LM.diver(ctx, LEMB[0], LEMB[1], DS, t, lemO);
  // the network warms: first near him (the bell, Yuasa), then the ship, then all of it
  const lk = clamp(.18 + .35 * wBy + .2 * wWere + .6 * wAll) * (.9 + .1 * breathe);
  glowLine(ctx, uL.pts, lk, COL.warm, 1.4 / Math.max(1, z * .6));
  glowLine(ctx, uY.pts, lk, COL.warm, 1.4 / Math.max(1, z * .6));
  glowLine(ctx, wire, clamp(.12 + .4 * wWere + .6 * wAll) * (.9 + .1 * breathe), COL.warm, 1.2 / Math.max(1, z * .6));
  ctx.restore();

  // ---- the three lights + the ship's (screen space, so they stay readable at any zoom) ----
  const pB = toS(bR.port), pY = toS(yuaR.lamp), pL = toS(lemR.chest), pS = toS(shR.bridge);
  C.softGlow(ctx, pB[0], pB[1], 90 + 40 * wBy, COL.amber, .3 + .25 * wBy + .15 * wAll);
  C.softGlow(ctx, pY[0], pY[1], 80 + 40 * wBy, COL.lamp, .22 + .25 * wBy + .1 * wAll);
  C.softGlow(ctx, pL[0], pL[1], (100 + 30 * wAll) * (1 + .1 * beat), COL.amber, .3 + .12 * beat + .2 * wAll);
  C.softGlow(ctx, pS[0], pS[1], 120, COL.amber, .1 + .25 * wWere + .1 * wAll);
  ring(ctx, pB[0], pB[1], (t - tBy - .02) / 1.2, COL.warm, 16, 130, 3);
  ring(ctx, pY[0], pY[1], (t - tBy - .14) / 1.2, COL.lamp, 16, 120, 3);
  ring(ctx, pS[0], pS[1], (t - tWere - .02) / 1.2, COL.warm, 20, 170, 3);
  ring(ctx, pL[0], pL[1], (t - tPeople - .05) / 1.6, COL.amber, 20, 260, 4);
  ring(ctx, pL[0], pL[1], (t - tPeople - .3) / 1.6, COL.warm, 20, 200, 3);

  // ---- words ----
  LM.subBand(ctx, .8, 1150);
  const lA = P(t, vEnd - .25, vEnd + .3), nA = P(t, vEnd + .15, vEnd + .7);
  if (lA > 0) { const g = ctx.createLinearGradient(0, 960, 0, 1250); g.addColorStop(0, 'rgba(1,4,5,0)'); g.addColorStop(.35, `rgba(1,4,5,${.5 * lA})`); g.addColorStop(1, `rgba(1,4,5,${.5 * lA})`); ctx.fillStyle = g; ctx.fillRect(0, 960, W, 290); }
  const qp = quoteParts(D.quote), qA = P(t, tPick - .05, tPick + .45);
  if (qA > 0) {
    warmLine(ctx, qp.l1, 'the people around me', 540, 1140, 28, '#cfe8ff', wAll, qA);
    warmLine(ctx, qp.l2, 'the people around me', 540, 1177, 28, '#cfe8ff', wAll, qA);
    text(ctx, qp.attr, 540, 1214, { size: 23, weight: 700, color: '#8fb2c0', alpha: qA });
  }
  if (lA > 0) {
    const k = lerp(.94, 1, E.outC(lA));
    ctx.save(); ctx.translate(540, 1036); ctx.scale(k, k);
    text(ctx, D.line || '', 0, 0, { size: 50, weight: 900, color: '#ffffff', stroke: 'rgba(0,0,0,.8)', strokeW: 8, alpha: lA });
    ctx.restore();
  }
  if (nA > 0) text(ctx, D.names || '', 540, 1090, { size: 31, weight: 800, color: '#ffd9a0', alpha: nA });
};
})();
