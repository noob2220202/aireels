// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.ending = function (ctx, t, d, info) {
    const tN = at(info, '누군가', .5), ve = vend(info);
    const close = E.inOutQ(P(t, ve + .1, ve + .6));
    const back = E.inOutC(P(t, ve + .1, d - .05));
    const freeze = t > tN && t < tN + .5; const tt = freeze ? tN : t;
    ivyWallScene(ctx, tt, {
      cx: 540, cy: 805, zoom: lerp(lerp(1.15, 1.42, E.inOutQ(P(t, 0, ve))), 1.0, back),
      open: 1 - close, light: 0, leafOpts: { grow: P(t, ve - .1, ve + .7) },
      inside(c, L0, T0, s) { const gg = c.createRadialGradient(L0 + s / 2, T0 + s / 2, 10, L0 + s / 2, T0 + s / 2, s * .7); gg.addColorStop(0, 'rgba(40,32,26,.6)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(L0, T0, s, s); },
    });
    const card = (s1, s2, x, y, p, pulse, icon) => {
      if (p <= 0) return; const sc = E.outBack(clamp(p)) * (1 + .05 * pulse);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = 'rgba(12,14,18,.88)'; roundRect(ctx, -220, -110, 440, 220, 22); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = pulse > .5 ? K.goldHi : 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, s1, 0, -50, { size: 44, family: FONT.disp, weight: 400, color: pulse > .5 ? K.goldHi : '#fff' }); text(ctx, s2, 0, 18, { size: 40, weight: 800, color: '#fff' });
      icon(ctx); ctx.restore();
    };
    const cp = 1 - P(t, ve + .05, ve + .3);
    const pa = .5 + .5 * Math.sin(t * 7), pb = .5 + .5 * Math.sin(t * 7 + Math.PI);
    card('A', '처음부터 벽 속에', 290, 600, P(t, .15, .45) * cp, t < tN ? 1 : pa, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(-26, 50); c.lineTo(26, 50); c.lineTo(-26, 96); c.lineTo(26, 96); c.closePath(); c.stroke(); });
    card('B', '누군가 돌려놨다', 790, 600, P(t, tN, tN + .3) * cp, freeze ? 1 : pb, (c) => { text(c, '?', 0, 72, { size: 56, family: FONT.disp, weight: 400, color: K.red }); });
    if (freeze) vignette(ctx, .6);
    const sa = P(t, ve + .35, ve + .7);
    if (sa > 0) text(ctx, '이 그림, 서울에도 왔었다 · 2025.12–2026.03', 540, 1350, { size: 38, weight: 800, color: K.goldHi, alpha: sa, stroke: '#000', strokeW: 8 });
  };
})();
