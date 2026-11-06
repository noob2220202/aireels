// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.y1996 = function (ctx, t, d, info) {
    const tS = at(info, '여고생이', .2), tO = at(info, '사라진', .5), tF = at(info, '초상화를', .75);
    const tDive = tS - .3;
    if (t < tDive + .25) { mapView(ctx, t, { year: '1996', tIt: .55, tDive, label: '피아첸차 · 리치오디 미술관' }); L.scanlines(ctx, .05); return; }
    const k = P(t, tDive + .25, tDive + .55, E.outQ);
    ctx.save(); const dr = drift(t, .5, 7); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1.18, 1.04, E.outC(P(t, tDive + .25, d))), t });
    galleryInterior(ctx, t, { gone: 0, calm: true, noTag: true });
    F.figure(ctx, 250, 1560, 640, { female: true, hair: 'long', fill: '#05070a', rim: '#9cc3ff', rimX: 5, armL: [.05, -.1], armR: [-.4, -1.5], shadow: true });
    ctx.restore();
    // the old reproduction of the lost Klimt, then face-matching lines
    const op = P(t, tO - .05, tO + .3, E.outBack);
    const ox = 830, oy = 610;
    oldPhoto(ctx, ox, lerp(oy + 60, oy, op), 230, .07, clamp(op * 2));
    const mt = P(t, tF - .1, tF + .35, E.inOutQ);
    if (mt > 0) {
      const fx = 540, fy = 690, gx = ox - 6, gy = oy - 60;
      for (const [a1, b1] of [[fx, fy], [fx + 10, fy - 30]]) { ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; ctx.shadowColor = K.gold; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(lerp(a1, gx, mt), lerp(b1, gy + (b1 - fy) * .5, mt)); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 5; ctx.globalAlpha = mt; ctx.beginPath(); ctx.arc(fx, fy - 10, 48, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(gx, gy, 34, 0, 7); ctx.stroke(); ctx.restore();
      label(ctx, '같은 얼굴', 700, 1010, { size: 40, color: '#111', bg: K.goldHi, a: P(t, tF + .2, tF + .45) });
    }
    chip(ctx, '1996 · 고교생 클라우디아 마가', 330, 1150, P(t, tS, tS + .3));
    flash(ctx, (1 - k) * .5, '#cfe0ff');
  };
})();
