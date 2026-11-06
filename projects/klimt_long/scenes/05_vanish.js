// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.vanish = function (ctx, t, d, info) {
    const tE = at(info, '특별전을', .15), tY = at(info, '1997년', .45), tGo = at(info, '사라졌다', .9);
    ctx.save(); const dr = drift(t, .5, 9); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1.0, 1.1, P(t, 0, d)), t });
    galleryInterior(ctx, t, { gone: tGo + .1, banner: P(t, tE - .1, tE + .3) });
    ctx.restore();
    dateFlap(ctx, '1997.02', t, tY - .1, 540, 96);
    if (t > tGo + .1 && t < tGo + .4) flash(ctx, .15 * (1 - (t - tGo - .1) / .3), '#cfe0ff');
  };
})();
