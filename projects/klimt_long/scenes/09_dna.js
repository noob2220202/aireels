// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.dna = function (ctx, t, d, info) {
    const tR = at(info, '재수사했지만', .45), tN = at(info, '소득은', .75);
    gradBG(ctx, [[0, '#120c22'], [1, '#05040b']]);
    glow(ctx, 380, 760, 600, '#7a4dff', .35);
    ctx.save(); ctx.translate(380, 800); ctx.rotate(-.06); ctx.drawImage(T.frame, -190, -215, 380, 430); ctx.restore();
    // UV sweep over the frame
    const sw = (t * .9) % 1.4; if (sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const yy = 585 + sw * 430; const g = ctx.createLinearGradient(0, yy - 30, 0, yy + 30); g.addColorStop(0, 'rgba(160,120,255,0)'); g.addColorStop(.5, 'rgba(190,160,255,.7)'); g.addColorStop(1, 'rgba(160,120,255,0)'); ctx.fillStyle = g; ctx.fillRect(170, yy - 30, 420, 60); ctx.restore(); }
    for (let i = 0; i < 6; i++) { const fx = 240 + hash(i * 5) * 280, fy = 620 + hash(i * 7) * 360; glow(ctx, fx, fy, 30, '#d9c8ff', .5 + .3 * Math.sin(t * 5 + i)); }
    dnaHelix(ctx, 820, 800, 620, t, P(t, .1, .5));
    chip(ctx, '2014 재수사 · 2016 액자 DNA 흔적', 540, 470 + 50, P(t, tR - .3, tR));
    const rp = P(t, tN - .1, tN + .2, E.outBack);
    if (rp > 0) {
      ctx.save(); ctx.translate(540, 1170); ctx.scale(rp, rp);
      ctx.fillStyle = 'rgba(8,8,14,.92)'; roundRect(ctx, -330, -70, 660, 140, 18); ctx.fill(); ctx.strokeStyle = K.red; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, 'MATCH : 0', -120, 0, { size: 48, family: FONT.type, weight: 400, color: K.red });
      text(ctx, '용의자 없음', 170, 2, { size: 46, weight: 900, color: '#fff' });
      ctx.restore();
    }
  };
})();
