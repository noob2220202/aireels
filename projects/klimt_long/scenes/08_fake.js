// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.fake = function (ctx, t, d, info) {
    const tP = at(info, '찾았다', .3), tJ = at(info, '정교한', .65), tF = at(info, '가짜', .9);
    gradBG(ctx, [[0, '#121722'], [1, '#07090d']]); lamp(ctx, 540, 600, 1000, .22);
    // parcel
    ctx.save(); ctx.translate(540, 980);
    ctx.fillStyle = '#7a5a36'; poly(ctx, [[-360, -120], [360, -120], [400, 360], [-400, 360]], '#8a6a42');
    poly(ctx, [[-360, -120], [-470, -230], [-120, -230], [0, -120]], '#a07a4c'); poly(ctx, [[360, -120], [470, -230], [120, -230], [0, -120]], '#9a7448');
    ctx.fillStyle = 'rgba(230,220,190,.6)'; ctx.fillRect(-60, -120, 120, 480);
    ctx.restore();
    const rise = P(t, .1, tP + .3, E.outC);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 980 - 120 + 6); ctx.clip();
    ctx.save(); ctx.filter = 'hue-rotate(-14deg) saturate(.8) contrast(.92)'; canvasPiece(ctx, 540, lerp(1150, 720, rise), .78, lerp(.06, -.03, rise)); ctx.restore();
    ctx.restore();
    chip(ctx, '1997.04 · 이탈리아-프랑스 국경 근처', 540, 1240, P(t, tP - .1, tP + .2));
    if (t > tJ - .1) {
      const mx = lerp(420, 560, P(t, tJ - .1, tF, E.inOutQ)), my = lerp(650, 610, P(t, tJ - .1, tF));
      magnifier(ctx, mx, my, 120, (c) => { c.save(); c.filter = 'hue-rotate(-14deg) saturate(.8) contrast(.92)'; canvasPiece(c, 540, 720, .78, -.03); c.restore(); });
    }
    stamp(ctx, '가짜', 560, 950, P(t, tF, tF + .25), { size: 190, color: '#d4202c', rot: -.2 });
  };
})();
