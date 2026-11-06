// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.condition = function (ctx, t, d, info) {
    const tQ = at(info, '검찰은', .45), tW = at(info, '내내', .6), tK = at(info, '모른다고', .85);
    gradBG(ctx, [[0, '#101820'], [1, '#06090c']]); lamp(ctx, 540, 600, 900, .18);
    canvasPiece(ctx, 540, 760, .62, 0);
    // condition checklist
    const cp = P(t, .05, .35, E.outBack);
    if (cp > 0) {
      ctx.save(); ctx.translate(820, 560); ctx.rotate(.05); ctx.scale(cp, cp);
      ctx.fillStyle = '#ece6d8'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.fillRect(-150, -90, 300, 180); ctx.shadowColor = 'transparent';
      text(ctx, '보존 상태', 0, -48, { size: 30, weight: 900, color: '#333' });
      text(ctx, '비교적 양호', 0, 10, { size: 44, family: FONT.disp, weight: 400, color: '#1f7a46' });
      text(ctx, '✓', -120, 10, { size: 44, weight: 900, color: '#1f7a46' });
      ctx.restore();
    }
    // timeline 1997 —?— 2019
    const tp = P(t, tQ - .2, tW + .2, E.inOutQ);
    if (tp > 0) {
      const y = 1130, x0 = 170, x1 = 910;
      ctx.save(); ctx.globalAlpha = clamp(tp * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, tp), y); ctx.stroke(); ctx.setLineDash([]);
      for (const [x, s] of [[x0, '1997'], [x1, '2019']]) { ctx.fillStyle = K.goldHi; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); text(ctx, s, x, y + 50, { size: 38, family: FONT.disp, weight: 400, color: K.goldHi }); }
      const q = (Math.sin(t * 2.2) * .5 + .5); const qx = lerp(x0 + 80, x1 - 80, q);
      text(ctx, '?', qx, y - 60, { size: 96, family: FONT.disp, weight: 400, color: K.red, stroke: '#000', strokeW: 8 });
      ctx.restore();
      chip(ctx, '22년 내내 벽 속에?', 540, 1035, P(t, tW - .1, tW + .2), { color: '#fff', border: K.red });
    }
    const qp = P(t, tK - .1, tK + .25, E.outBack);
    if (qp > 0) {
      ctx.save(); ctx.translate(270, 540); ctx.rotate(-.05); ctx.scale(qp, qp);
      ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -170, -70, 340, 140, 16); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, '검찰', 0, -30, { size: 30, weight: 800, color: '#aab' }); text(ctx, '“알 수 없다”', 0, 22, { size: 46, weight: 900, color: '#fff' });
      ctx.restore();
    }
  };
})();
