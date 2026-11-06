// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.found = function (ctx, t, d, info) {
    const tD = at(info, '담쟁이를', .3), tG = at(info, '정원사들이', .55), tH = at(info, '철문을', .78), tO = at(info, '열었다', .9);
    const push = E.inOutC(P(t, tD - .15, tD + .45));
    const zoom = lerp(.58, 1.22, push), cy = lerp(940, 820, push);
    const cut = tD + .35;
    const op = E.outQ(P(t, tO, tO + .5));
    ivyWallScene(ctx, t, {
      cx: 540, cy, zoom, open: op, dust: P(t, tO, tO + .2) * (1 - P(t, tO + .6, tO + 1.2)),
      leafOpts: { cover: true, cut },
      inside(c, L0, T0, s) { const g = P(t, tO + .35, tO + .55) * (1 - P(t, tO + .7, tO + 1)); if (g > 0) glow(c, L0 + s * .55, T0 + s * .7, 60, '#ffffff', g); drawBag(c, L0 + s * .5, T0 + s * .76, s * .9, s * .48, 0, t); darkness(c, L0 + s * .55, T0 + s * .7, s * .7, .8, .1); },
      after(c) {
        c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(70,80,90,.25)'; c.fillRect(-1000, -1000, 3200, 4000); c.restore();
        brackets(c, HATCH.x - HATCH.s / 2 - 26, HATCH.y - HATCH.s / 2 - 26, HATCH.s + 52, HATCH.s + 52, P(t, tH, tH + .25));
        const hp = P(t, tD - .05, tD + .3, E.outC) * (1 - P(t, tO + .55, tO + .9, E.inQ));
        if (hp > 0) {
          const snipA = (tt) => Math.exp(-Math.pow((t - tt) * 9, 2));
          const openAng = .38 - .34 * Math.max(snipA(cut - .02), snipA(cut + .38), snipA(cut + .78));
          shears(c, lerp(1050, 800, hp), lerp(1180, 990, hp), -.8, openAng, .72);
          const pull = P(t, tO - .1, tO + .4, E.inOutQ);
          glove(c, lerp(-150, 380, hp) + pull * 120, lerp(1000, 800, hp) - pull * 10, .62, .45 - pull * .25, true);
        }
      },
    });
    tint(ctx, '#7d8a96', .22, 'color');
    const ws = P(t, .55, .8) * (1 - P(t, tD - .3, tD - .05));
    if (ws > 0) {
      ctx.save(); ctx.globalAlpha = ws; ctx.translate(760, 600); ctx.rotate(.05);
      ctx.fillStyle = '#ece6d8'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.fillRect(-140, -150, 280, 300); ctx.shadowColor = 'transparent';
      const [b, bx] = buf('inset', 540, 540); bx.fillStyle = '#000'; bx.fillRect(0, 0, 540, 540); bx.save(); bx.scale(.5, .5); bx.translate(0, -560); galleryInterior(bx, 3.0, { gone: 0, noTag: true }); bx.restore();
      ctx.drawImage(b, -120, -130, 240, 240); text(ctx, '1997.02', 0, 128, { size: 30, family: FONT.type, color: '#333', weight: 400 }); ctx.restore();
      ctx.save(); ctx.globalAlpha = ws; ctx.setLineDash([12, 10]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(620, 690); ctx.quadraticCurveTo(560, 760, 560, 820); ctx.stroke(); ctx.restore();
      label(ctx, '같은 미술관 외벽', 760, 420 + 60, { size: 44, a: ws, color: '#111', bg: K.goldHi });
    }
    const fa = 1 - P(t, .55, .8);
    if (fa > 0) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${.55 * fa})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = fa; flap(ctx, '2019.12.10', 540, 780, t, -.05, { size: 112, roll: .22, lock: .035 }); ctx.restore(); }
  };
})();
