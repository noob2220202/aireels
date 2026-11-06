// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.bag = function (ctx, t, d, info) {
    const tB = at(info, '쓰레기봉투', .2), tF = at(info, '액자', .55), tN = at(info, '없는', .7), tP = at(info, '그림', .9);
    const rv = P(t, tP - .05, tP + .25, E.outExpo);
    if (rv < 1) {
      ctx.save(); const dr = drift(t, 1, 11); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1, 1.12, P(t, 0, tP)) * (1 + rv * .6), t });
      gradBG(ctx, [[0, '#0d0b0a'], [1, '#050404']]);
      poly(ctx, [[-100, -100], [1180, -100], [860, 500], [220, 500]], '#3a312a'); poly(ctx, [[-100, -100], [220, 500], [220, 1300], [-100, 2000]], '#2b241f');
      poly(ctx, [[1180, -100], [1180, 2000], [860, 1300], [860, 500]], '#221c18'); poly(ctx, [[220, 1300], [860, 1300], [1180, 2000], [-100, 2000]], '#40362e');
      ctx.fillStyle = '#17120f'; ctx.fillRect(220, 500, 640, 800);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(220, 560 + i * 100); ctx.lineTo(860, 560 + i * 100); ctx.stroke(); }
      for (let i = 0; i < 16; i++) { const x = 120 + hash(i * 3) * 840, y = 1320 + hash(i * 5) * 420, r = 30 + hash(i) * 60; ctx.fillStyle = `rgb(${30 + hash(i * 7) * 25},${26 + hash(i * 7) * 20},${22 + hash(i * 7) * 18})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, hash(i * 2), 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3a3d40'; ctx.lineWidth = 9; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(150 + i * 170, 1500 + hash(i) * 200); ctx.lineTo(250 + i * 170, 1460 + hash(i + 3) * 200); ctx.stroke(); }
      const cr = P(t, tB + .5, tF + .1, E.outC);
      if (cr > 0) canvasPiece(ctx, 540, lerp(1150, 860, cr), lerp(.55, .78, cr), lerp(.1, -.04, cr));
      drawBag(ctx, 540, 1180, 820, 520, P(t, tB + .4, tB + .9, E.inOutQ), t);
      const fo = P(t, tF, tF + .2) * (1 - P(t, tN + .25, tN + .45));
      if (fo > 0) {
        ctx.save(); ctx.globalAlpha = fo; ctx.setLineDash([22, 14]); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 8; ctx.shadowColor = K.gold; ctx.shadowBlur = 18;
        const cy = lerp(1150, 860, cr), sw = 600 * .78 + 140, sh = 700 * .78 + 140; ctx.strokeRect(540 - sw / 2, cy - sh / 2, sw, sh); ctx.restore();
        const sp = P(t, tN, tN + .18); if (sp > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.strokeStyle = K.red; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(170, 1180); ctx.lineTo(lerp(170, 910, sp), lerp(1180, 520, sp)); ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
      const fx = lerp(260, 560, E.inOutQ(P(t, 0, 1.1))) + Math.sin(t * 3) * 30, fy = lerp(1000, 920, P(t, 0, 1.2)) + Math.cos(t * 2.3) * 25;
      darkness(ctx, fx, fy, lerp(520, 760, P(t, tB, tF)), .86, .3); glow(ctx, fx, fy, 300, '#fff6e0', .22);
      flash(ctx, Math.pow(rv, 3) * .95, '#fff4d6');
      return;
    }
    const k = t - tP - .25;
    gradBG(ctx, [[0, '#0a1712'], [1, '#040806']]); glow(ctx, 540, 860, 900, '#3e9a6b', .35);
    godrays(ctx, 540, 860, -Math.PI / 2, 6.28, 1200, '#ffd98a', .06, t, 14);
    canvasPiece(ctx, 540, 860, k < .3 ? 1.0 : lerp(1.0, 1.04, P(t, tP + .55, d)), 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) { const a = hash(i * 13) * 6.28, sp = 300 + hash(i * 7) * 900, kk = E.outC(clamp(k / 1.2)); const r = 30 + kk * sp; ctx.fillStyle = `rgba(255,${200 + hash(i) * 40},120,${(1 - kk) * .9})`; ctx.beginPath(); ctx.arc(540 + Math.cos(a) * r, 860 + Math.sin(a) * r * 1.1, 3 + hash(i * 3) * 6, 0, 7); ctx.fill(); }
    ctx.restore(); flash(ctx, Math.max(0, 1 - k * 9), '#fff4d6');
  };
})();
