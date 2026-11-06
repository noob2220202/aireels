// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.hook = function (ctx, t, d, info) {
    const tOpen = at(info, '나왔다', .85) - .2;
    const op = E.outBack(P(t, tOpen, tOpen + .45), 1.2);
    const beat = (tt) => .045 * Math.exp(-Math.pow((t - tt) * 7, 2)) * (t > tt - .05 ? 1 : 0);
    const tM = at(info, '명화가', .2), tW = at(info, '벽', .62);
    const zoom = lerp(1.0, 1.3, E.inOutQ(P(t, 0, d))) + beat(tM) + beat(tW) * 1.4;
    const seep = (1 - P(t, tOpen, tOpen + .2)) * (.45 + .2 * Math.sin(t * 7) + 2.2 * (beat(tM) + beat(tW)) / .045 * .25);
    ivyWallScene(ctx, t, {
      cx: 540, cy: 805, zoom, shake: .9 * Math.exp(-t * 4) + .25 * P(t, tOpen, tOpen + .2) * Math.exp(-(t - tOpen) * 3),
      open: op, light: P(t, tOpen, tOpen + .5, E.outQ), dust: P(t, tOpen, tOpen + .3) * (1 - P(t, tOpen + 1, tOpen + 2)),
      inside(c, L0, T0, s) { const k = P(t, tOpen, tOpen + .6, E.outQ); glow(c, L0 + s / 2, T0 + s / 2, s * .9, K.gold, .9 * k); drawBag(c, L0 + s * .5, T0 + s * .74, s * .9, s * .5, 0, t); },
      after(c) {
        if (seep > 0) {
          const { x: hx, y: hy, s: hs } = HATCH;
          c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ffcf6a', clamp(seep) * .8); c.lineWidth = 3; c.shadowColor = '#ffb93a'; c.shadowBlur = 44;
          c.strokeRect(hx - hs / 2 + 2, hy - hs / 2 + 2, hs - 4, hs - 4); c.restore();
          glow(c, hx, hy + hs / 2, 260, '#ffb93a', .22 * seep);
          motes(c, t, { n: 24, color: '#ffd98a', a: .55 * seep, area: [hx - 200, hy - 200, 400, 420], size: 2.6, speed: 18, seed: 21 });
        }
        const k = P(t, tOpen + .2, tOpen + .9, E.outC);
        if (k > 0) {
          const cx = lerp(HATCH.x + 10, HATCH.x + 60, k), cy = lerp(HATCH.y + 40, HATCH.y + 120, k), sc = lerp(.22, .46, k);
          c.save(); c.globalAlpha = clamp(k * 3); canvasPiece(c, cx, cy, sc, lerp(.18, -.1, k)); drawBag(c, cx - 10, cy + 700 * sc * .36, 660 * sc, 330 * sc, 0, t); c.restore();
        }
        brackets(c, HATCH.x - HATCH.s / 2 - 30, HATCH.y - HATCH.s / 2 - 30, HATCH.s + 60, HATCH.s + 60, P(t, tOpen + .7, tOpen + 1.0));
      },
    });
    chip(ctx, '2019.12 · 이탈리아 피아첸차', 540, 1180, P(t, tOpen + .9, tOpen + 1.2));
  };
})();
