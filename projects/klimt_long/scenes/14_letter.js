// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.letter = function (ctx, t, d, info) {
    const tL = at(info, '자기들이', .12), tG = at(info, '선물로', .4), tV = at(info, '확인된', .82), tU = at(info, '없다', .94);
    desk(ctx); lamp(ctx, 500, 700, 1000, .3);
    newspaper(ctx, 400, 860, .78, -.1);
    const lp = P(t, tL - .3, tL + .1, E.outC);
    ctx.save(); ctx.translate(lerp(1300, 700, lp), 900); ctx.rotate(lerp(.3, .06, lp));
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 35; ctx.shadowOffsetY = 15; ctx.fillStyle = '#f3efe4'; ctx.fillRect(-250, -320, 500, 640); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(80,110,160,.25)'; ctx.lineWidth = 1.5; for (let y = -250; y < 300; y += 48) { ctx.beginPath(); ctx.moveTo(-220, y); ctx.lineTo(220, y); ctx.stroke(); }
    const l1 = '“우리가 훔쳤고,', l2 = '도시에 주는 선물로', l3 = '돌려놓았다”';
    const tp = P(t, tL, tG + .7);
    const full = l1 + l2 + l3, shown = typeSub(full, tp);
    const s1 = shown.slice(0, l1.length), s2 = shown.slice(l1.length, l1.length + l2.length), s3 = shown.slice(l1.length + l2.length);
    for (const [s, y] of [[s1, -160], [s2, -60], [s3, 40]]) if (s) text(ctx, s, -215, y, { size: 46, family: FONT.serif, weight: 900, color: '#1d2a44', align: 'left' });
    text(ctx, '— 자칭 범인들의 주장 (요지)', 0, 150, { size: 28, weight: 700, color: '#666', alpha: P(t, tG, tG + .3) });
    ctx.restore();
    chip(ctx, '2020.01 · 지역 일간지 앞 편지', 540, 1240, P(t, tL - .2, tL + .1));
    stamp(ctx, '진위 미확인', 650, 1075, P(t, tU - .1, tU + .15), { size: 110, color: '#d4202c', rot: -.12 });
    if (t > tV - .1) vignette(ctx, .25 * P(t, tV - .1, tV + .2));
  };
})();
