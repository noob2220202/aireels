// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.verdict = function (ctx, t, d, info) {
    const tB = at(info, '뒷면', .25), tR = at(info, '결과', .45), tJ = at(info, '진품', .55), tM = at(info, '6천만', .75), tI = at(info, '이상', .95);
    lightbox(ctx);
    const flip = P(t, tB - .15, tB + .15, E.inOutQ) - P(t, tR - .15, tR + .15, E.inOutQ);
    const sx = Math.abs(Math.cos(flip * Math.PI / 2));
    const shake = (t > tI && t < tI + .3) ? (hash(Math.floor(t * 60)) - .5) * 14 * (1 - (t - tI) / .3) : 0;
    ctx.save(); ctx.translate(540 + shake, 850); ctx.scale(Math.max(.02, sx), 1); ctx.translate(-540, -850);
    if (flip < .5) { canvasPiece(ctx, 540, 850, .9, 0); scanGhost(ctx, P(t, .05, tB - .2, E.inOutQ), .9, 850, .55 * (1 - P(t, tB - .2, tB))); }
    else canvasBack(ctx, 540, 850, .9, t, tB + .15);
    ctx.restore();
    label(ctx, flip < .5 ? '1996년 X선 사진과 대조' : '뒷면 도장 · 밀랍 봉인 · 라벨', 540, 520, { size: 32, color: K.cyan, bg: 'rgba(0,20,30,.85)', border: K.cyan, a: P(t, 0, .2) * (1 - P(t, tJ, tJ + .2)) });
    const st = P(t, tJ + .02, tJ + .3);
    if (st > 0) {
      const s = lerp(2.4, 1, E.outBack(st, 2)), a = clamp(st * 3);
      ctx.save(); ctx.translate(790 + shake, 640); ctx.rotate(-.22); ctx.scale(s * .85, s * .85); ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; const rg = ctx.createRadialGradient(-20, -20, 10, 0, 0, 150); rg.addColorStop(0, '#f0283a'); rg.addColorStop(1, '#8c0e18'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 140, 0, 7); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = K.goldHi; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 124, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 108, 0, 7); ctx.stroke();
      text(ctx, '진품', 0, -6, { size: 96, family: FONT.disp, weight: 400, color: '#fff2c9' }); text(ctx, 'AUTHENTIC · 2020.01.17', 0, 66, { size: 22, weight: 800, color: '#fff2c9', ls: 1 });
      ctx.restore(); flash(ctx, (1 - clamp(st * 4)) * .35, '#fff');
    }
    const vp = P(t, tM - .05, tI + .05, E.outC);
    if (vp > 0) {
      const v = Math.round(lerp(0, 60, vp)); const pop = t > tI ? 1 + .12 * Math.exp(-(t - tI) * 8) : 1;
      ctx.save(); ctx.translate(540 + shake, 1110); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(6,8,12,.86)'; roundRect(ctx, -390, -74, 780, 148, 18); ctx.fill(); ctx.strokeStyle = 'rgba(246,215,127,.6)'; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, `€${v},000,000+`, 0, 6, { size: 104, family: FONT.serif, weight: 900, color: t > tI ? K.goldHi : '#e8d39a', stroke: '#2a1a00', strokeW: 6, shadow: { color: 'rgba(255,200,90,.6)', blur: 30, y: 0 } });
      ctx.restore();
    }
  };
})();
