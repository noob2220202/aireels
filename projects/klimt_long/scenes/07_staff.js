// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.staff = function (ctx, t, d, info) {
    const tE = at(info, '증거', .6), tN = at(info, '끝났다', .88);
    desk(ctx); lamp(ctx, 540, 700, 1000, .28);
    const k = P(t, 0, .4, E.outC);
    ctx.save(); ctx.translate(540, lerp(1140, 900, k)); ctx.rotate(lerp(.08, -.02, k)); ctx.scale(.86, .86);
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 25; ctx.fillStyle = '#c9a86a'; roundRect(ctx, -400, -440, 800, 880, 10); ctx.fill(); ctx.shadowColor = 'transparent';
    const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .25; ctx.fillStyle = pg; ctx.fillRect(-400, -440, 800, 880); ctx.globalAlpha = 1;
    text(ctx, '1997 · 미술관 관리인 조사', 0, -360, { size: 50, weight: 900, color: '#3a2a12' }); L.hline(ctx, -330, -310, 660, 'rgba(60,40,10,.6)', 3);
    for (let i = 0; i < 5; i++) L.hline(ctx, -300, 260 + i * 34, 600 - hash(i) * 200, 'rgba(60,40,10,.22)', 3);
    ctx.restore();
    const ip = P(t, .25, .6, E.outBack); if (ip > 0) idCard(ctx, 540, lerp(1000, 800, ip), 1.15, '');
    if (t > tE - .2 && t < tN + .3) { const mx = lerp(420, 660, P(t, tE - .2, tN, E.inOutQ)); magnifier(ctx, mx, 780, 120, (c) => idCard(c, 540, 800, 1.15, '')); }
    const sp = P(t, tN, tN + .25);
    stamp(ctx, '증거 없음', 540, 1080, sp, { size: 130, color: '#d4202c', rot: -.14 });
    chip(ctx, '증거 불충분 → 종결', 540, 1230, P(t, tN + .2, tN + .45));
  };
})();
