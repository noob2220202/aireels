// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.closed = function (ctx, t, d, info) {
    const tC = at(info, '공소시효는', .1), tY = at(info, '2021년', .55), tE = at(info, '종결됐다', .92);
    desk(ctx);
    const k = P(t, 0, .3, E.outC);
    const shakeY = (t > .25 && t < .5) ? Math.sin(t * 80) * 10 * (1 - (t - .25) / .25) : 0;
    ctx.save(); ctx.translate(lerp(1400, 540, k), 900 + shakeY); ctx.rotate(lerp(.25, -.03, k)); ctx.scale(.86, .86);
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 25; ctx.fillStyle = '#c9a86a'; roundRect(ctx, -380, -470, 760, 940, 10); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#d4b679'; roundRect(ctx, 120, -520, 240, 70, 10); ctx.fill();
    const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .25; ctx.fillStyle = pg; ctx.fillRect(-380, -470, 760, 940); ctx.globalAlpha = 1;
    text(ctx, 'CASE 1997-PC', 240, -480, { size: 30, family: FONT.type, color: '#4a3a20', weight: 400 });
    text(ctx, 'RITRATTO DI SIGNORA', 0, -330, { size: 42, family: FONT.type, color: '#3a2a12', weight: 400 });
    text(ctx, '여인의 초상 · 도난 사건', 0, -260, { size: 50, weight: 800, color: '#3a2a12' });
    L.hline(ctx, -300, -210, 600, 'rgba(60,40,10,.6)', 3);
    const rows = [['절도죄 공소시효', '만료', tC + .2], ['발견 후 수사', '2021 종결', tY + .1], ['기소된 사람', '0명', tY + .5]];
    rows.forEach(([a, b, tt], i) => { const p = P(t, tt, tt + .25); text(ctx, a, -300, -130 + i * 80, { size: 40, weight: 800, color: '#3a2a12', align: 'left', alpha: p }); text(ctx, b, 300, -130 + i * 80, { size: 44, weight: 900, color: '#a3121a', align: 'right', alpha: p }); });
    ctx.restore();
    const sp = P(t, tE + .05, tE + .3);
    stamp(ctx, '미제 종결', 540 + shakeY * .3, 1040, sp, { size: 140, color: '#d4202c', rot: -.18 });
    if (sp > .4) text(ctx, 'UNSOLVED · 2021', 540, 1190, { size: 46, family: FONT.type, weight: 400, color: '#d4202c', alpha: P(t, tE + .2, tE + .4) });
    if (sp > 0 && sp < .5) motes(ctx, t, { n: 40, color: '#e9dcc0', a: .8 * (1 - sp * 2), area: [240, 920, 600, 260], size: 4, speed: 90, seed: 5 });
  };
})();
