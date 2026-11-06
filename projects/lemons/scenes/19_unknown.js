// unknown (91.67-94.89): "기체 없이 버틴 시간은, 아무도 모릅니다."
// Calm, almost still: a clean timeline bar over dark water. '기체' -> the left end pops (a small white flash, the parting):
// '22:12~13' / '절단'. '없이' -> a short amber stretch (his bailout gas, generic label '비상 기체') runs from it and fades out
// with no hard edge — nobody knows exactly when it ran out. '버틴' -> the rest of the bar draws on in grey, hatched. '시간은,' ->
// the right end pops in warm: '22:46경' / '헬멧 제거'. '아무도' -> a bracket closes over the grey stretch and a big soft '?'
// rises above it; the amber/grey boundary keeps shimmering. '모릅니다.' -> data.note (two lines) and data.why fade in, small.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, C = PK.LMC, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const BAR = { x0: 118, x1: 962, y: 810, h: 20 };
const GAS = .2, FUZZ = .14;          // amber gas stretch (fraction of the bar) and the width of its soft end

let _hatch = null;
function hatchPat(ctx) {
  if (!_hatch) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.strokeStyle = 'rgba(210,225,230,.32)'; x.lineWidth = 3; x.beginPath(); for (let k = -16; k <= 32; k += 8) { x.moveTo(k, 16); x.lineTo(k + 16, 0); } x.stroke(); _hatch = c; }
  return ctx.createPattern(_hatch, 'repeat');
}

window.PK.scenes.unknown = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tGas = at('기체', .04), tWo = at('없이', .12), tHeld = at('버틴', .22), tTime = at('시간은', .33), tNo = at('아무도', .6), tKnow = at('모릅니다', .74);
  const dr = { x: fb(t * .25, 191) * 5, y: fb(t * .22, 192) * 5 };

  // ---- calm dark water ----
  const ember = LM.light(BAR.x0 + 80, BAR.y, 420, COL.amber, .25 * P(t, tWo, tWo + .6) * (1 - .6 * P(t, tHeld, tTime + .5)));
  LM.sea(ctx, t, { dark: .93, seed: 41, snow: .55, murk: .7, current: [3, -2], lights: [ember], haze: .5 });
  ctx.save(); ctx.translate(dr.x, dr.y);
  const x0 = BAR.x0, x1 = BAR.x1, w = x1 - x0, y = BAR.y, bh = BAR.h;
  const X = f => x0 + w * f;

  // track (faint, from the start)
  const trA = P(t, -.25, .15);
  ctx.save(); ctx.globalAlpha = trA; ctx.fillStyle = 'rgba(160,190,200,.12)'; roundRect(ctx, x0, y - bh / 2, w, bh, bh / 2); ctx.fill(); ctx.restore();
  // grey 'unknown' stretch with hatching, drawn on from the gas end to the right
  const gp = E.inOutQ(P(t, tWo + .05, tTime + .05));
  if (gp > 0) {
    const gx0 = X(GAS * .55), gx1 = lerp(gx0, x1, gp);
    ctx.save(); roundRect(ctx, x0, y - bh / 2, w, bh, bh / 2); ctx.clip();
    ctx.fillStyle = '#4c575e'; ctx.fillRect(gx0, y - bh / 2, gx1 - gx0, bh);
    ctx.fillStyle = hatchPat(ctx); ctx.save(); ctx.translate(-t * 10, 0); ctx.fillRect(gx0 + t * 10, y - bh / 2, gx1 - gx0, bh); ctx.restore();
    ctx.restore();
  }
  // amber gas stretch: solid, then a soft end that shimmers (no exact moment)
  const ap = E.outC(P(t, tWo - .1, tWo + .55));
  if (ap > 0) {
    const sh = .025 * Math.sin(t * 2.3) + .015 * nz(t * 1.7, 5), end = (GAS + FUZZ + sh) * ap;
    const g = ctx.createLinearGradient(x0, 0, X(end), 0);
    g.addColorStop(0, '#ffd28a'); g.addColorStop(clamp((GAS * ap) / Math.max(.001, end) * .62), COL.amber); g.addColorStop(1, rgba(COL.amber, 0));
    ctx.save(); roundRect(ctx, x0, y - bh / 2, w, bh, bh / 2); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x0, y - bh / 2, X(end) - x0, bh); ctx.restore();
    LM.glow(ctx, X(GAS * .5 * ap), y, 120, COL.amber, .3 * ap);
    text(ctx, '비상 기체', X(GAS * .45), y - 42, { size: 30, weight: 800, color: '#ffd9a0', alpha: P(t, tWo + .1, tWo + .4) });
  }
  // left end: the parting (white tick + flash)
  const lA = P(t, tGas - .06, tGas + .14);
  if (lA > 0) {
    const fl = Math.exp(-Math.max(0, t - tGas) * 7) * lA;
    ctx.save(); ctx.fillStyle = rgba('#ffffff', lA); ctx.fillRect(x0 - 3, y - 36, 6, 72); ctx.restore();
    LM.glow(ctx, x0, y, 90 + 160 * (1 - fl), '#e8f6ff', .9 * fl); LM.glow(ctx, x0, y, 24, '#ffffff', .8 * lA);
    const sl = 22 * (1 - E.outC(P(t, tGas, tGas + .35)));
    text(ctx, '22:12~13', x0 - 6 + sl, y + 74, { size: 50, weight: 900, color: '#ffffff', align: 'left', alpha: lA });
    text(ctx, '절단', x0 - 4 + sl, y + 124, { size: 36, weight: 800, color: '#a9cbd8', align: 'left', alpha: lA });
  }
  // right end: helmet off in the bell (warm)
  const rA = P(t, tTime - .08, tTime + .16);
  if (rA > 0) {
    const k = lerp(.6, 1, E.outBack(P(t, tTime - .08, tTime + .3)));
    ctx.save(); ctx.translate(x1, y); ctx.scale(k, k); ctx.fillStyle = rgba('#ffd28a', rA); ctx.fillRect(-3, -36, 6, 72); ctx.restore();
    LM.glow(ctx, x1, y, 110, COL.amber, .55 * rA); LM.glow(ctx, x1, y, 22, COL.core, .9 * rA);
    const sl = 22 * (1 - E.outC(P(t, tTime, tTime + .35)));
    text(ctx, '22:46경', x1 + 6 - sl, y + 74, { size: 50, weight: 900, color: '#ffe3b8', align: 'right', alpha: rA });
    text(ctx, '헬멧 제거', x1 + 4 - sl, y + 124, { size: 36, weight: 800, color: '#e8c89a', align: 'right', alpha: rA });
  }
  // '아무도' -> bracket over the grey stretch + the question mark
  const qA = P(t, tNo - .1, tNo + .35, E.outQ);
  if (qA > 0) {
    const bx0 = X(GAS + .08), bx1 = x1 - 26, by = y - 44, bk = E.outC(P(t, tNo - .1, tNo + .45)), cx = (bx0 + bx1) / 2, hw = (bx1 - bx0) / 2 * bk;
    ctx.save(); ctx.globalAlpha = qA; ctx.strokeStyle = 'rgba(205,220,226,.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - hw, by + 16); ctx.lineTo(cx - hw, by); ctx.lineTo(cx - 18, by); ctx.lineTo(cx, by - 14); ctx.lineTo(cx + 18, by); ctx.lineTo(cx + hw, by); ctx.lineTo(cx + hw, by + 16); ctx.stroke(); ctx.restore();
    const br = 1 + .03 * Math.sin(t * 2.2), rise = 26 * (1 - E.outC(P(t, tNo - .1, tNo + .6)));
    C.softGlow(ctx, cx, by - 150, 280, '#9fb8c4', .16 * qA);
    ctx.save(); ctx.translate(cx, by - 150 + rise); ctx.scale(br, br);
    text(ctx, '?', 0, 0, { size: 240, family: FONT.disp, weight: 400, color: '#dbe6ea', stroke: '#000', strokeW: 10, alpha: qA });
    ctx.restore();
  }
  ctx.restore();

  // ---- small lines ----
  const nA = P(t, tKnow - .05, tKnow + .3) * (1 - P(t, d - .05, d + .25));
  if (nA > 0) {
    const note = D.note || '', i = note.indexOf(' · '), l1 = i > 0 ? note.slice(0, i) : note, l2 = i > 0 ? note.slice(i + 3) : '';
    text(ctx, l1, 540 + dr.x, 1012 + dr.y, { size: 34, weight: 800, color: '#dcecf4', alpha: nA });
    if (l2) text(ctx, l2, 540 + dr.x, 1060 + dr.y, { size: 34, weight: 800, color: '#dcecf4', alpha: nA });
  }
  const wA = P(t, tKnow + .3, tKnow + .6) * (1 - P(t, d - .05, d + .25));
  if (wA > 0) {
    const s = D.why || '', mw = measure(ctx, s, 28, FONT.sub, 700) + 44;
    ctx.save(); ctx.globalAlpha = wA; ctx.strokeStyle = 'rgba(160,200,215,.3)'; ctx.lineWidth = 2; roundRect(ctx, 540 - mw / 2 + dr.x, 1108 + dr.y, mw, 50, 10); ctx.stroke(); ctx.restore();
    text(ctx, s, 540 + dr.x, 1134 + dr.y, { size: 28, weight: 700, color: '#a9c6d2', alpha: wA });
  }
  LM.subBand(ctx, .7, 1170);
};
})();
