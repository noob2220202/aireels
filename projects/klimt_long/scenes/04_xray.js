// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.xray = function (ctx, t, d, info) {
    const tM = at(info, '모자', .3), tD = at(info, '캔버스에', .75);
    lightbox(ctx);
    canvasPiece(ctx, 540, 850, .9, 0);
    scanGhost(ctx, P(t, .1, tM + .1, E.inOutQ));
    const hl = P(t, tM, tM + .3) * (1 - P(t, tD - .1, tD + .2));
    if (hl > 0) { glow(ctx, 540, 590, 320, K.cyan, .35 * hl * (0.7 + .3 * Math.sin(t * 9))); chip(ctx, 'X선·적외선 · 모자와 스카프를 두른 같은 여인', 540, 1180, hl, { color: K.cyan, border: K.cyan }); }
    label(ctx, 'X-RAY · 1996', 330, 520, { size: 30, family: FONT.type, weight: 400, color: K.cyan, bg: 'rgba(0,20,30,.8)', border: K.cyan, a: P(t, 0, .2) });
    const dp = P(t, tD - .05, tD + .3, E.outBack);
    if (dp > 0) {
      ctx.save(); ctx.translate(540, 1150); ctx.scale(dp, dp);
      ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -370, -70, 740, 140, 20); ctx.fill(); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = K.cyan; ctx.lineWidth = 5; ctx.strokeRect(-335, -40, 52, 66); ctx.strokeStyle = K.goldHi; ctx.strokeRect(-315, -26, 52, 66);
      text(ctx, '한 캔버스에 두 점의 클림트', 45, 2, { size: 46, family: FONT.disp, weight: 400, color: K.goldHi });
      ctx.restore();
    }
  };
})();
