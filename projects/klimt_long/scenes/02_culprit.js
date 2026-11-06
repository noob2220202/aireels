// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.culprit = function (ctx, t, d, info) {
    const swing = .13 * Math.sin(t * 2.4 + .6);
    const bx = 540 + Math.sin(swing) * 330, by = 120 + Math.cos(swing) * 330;
    ctx.drawImage(T.board, 0, 0); lamp(ctx, bx, by + 520, 900, .3);
    const tSnap = at(info, '않았다', .8);
    ctx.save(); ctx.translate(250, 600); ctx.rotate(-.08);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 10; ctx.fillStyle = '#ece6d8'; ctx.fillRect(-120, -140, 240, 270); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#16231d'; ctx.fillRect(-100, -120, 200, 190); ctx.drawImage(T.frame, -70, -96, 140, 158);
    text(ctx, '1997', 0, 100, { size: 30, family: FONT.type, color: '#333', weight: 400 }); ctx.restore(); pin(ctx, 250, 470);
    const rock = .05 * Math.sin(t * 3.2) * Math.exp(-t * .4) + (t > tSnap ? .09 * Math.sin((t - tSnap) * 9) * Math.exp(-(t - tSnap) * 2.5) : 0);
    ctx.save(); ctx.translate(640, 690); ctx.rotate(rock); ctx.translate(0, 170);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; ctx.fillStyle = '#efe9db'; ctx.fillRect(-200, -150, 400, 300); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200,60,60,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-200, -100); ctx.lineTo(200, -100); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,120,170,.25)'; ctx.lineWidth = 1.5; for (let y = -70; y < 150; y += 36) { ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(200, y); ctx.stroke(); }
    text(ctx, 'SUSPECT', -180, -125, { size: 30, family: FONT.type, color: '#444', align: 'left', weight: 400 });
    text(ctx, '?', 0, 30, { size: 200, family: FONT.disp, color: 'rgba(40,40,40,.14)', weight: 400 }); ctx.restore(); pin(ctx, 640, 690);
    if (t < tSnap) stringLine(ctx, 250, 470, 640, 690, P(t, .05, .4, E.outQ), K.red, lerp(40, 4, P(t, .4, tSnap)));
    else {
      const f = clamp((t - tSnap) / .7), mx = lerp(250, 640, .52), my = lerp(470, 690, .52);
      ctx.save(); ctx.strokeStyle = K.red; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(250, 470); ctx.quadraticCurveTo(lerp(mx, 300, f), lerp(my, 700, f), lerp(mx - 10, 260, f), lerp(my, 470 + 420 * E.outQ(f), f)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640, 690); ctx.quadraticCurveTo(lerp(mx, 620, f), lerp(my, 900, f), lerp(mx + 10, 650, f), lerp(my, 690 + 380 * E.outQ(f), f)); ctx.stroke(); ctx.restore();
      if (f < .3) glow(ctx, mx, my, 120, '#ff6a50', (1 - f / .3) * .8);
    }
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(540, -10); ctx.lineTo(bx, by - 30); ctx.stroke();
    ctx.translate(bx, by); ctx.rotate(-swing); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-16, -44, 32, 30);
    const bg2 = ctx.createRadialGradient(0, 8, 2, 0, 8, 30); bg2.addColorStop(0, '#fff7e0'); bg2.addColorStop(1, '#ffb347'); ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(0, 10, 24, 30, 0, 0, 7); ctx.fill(); ctx.restore();
    glow(ctx, bx, by + 10, 260, '#ffcf80', .55 * L.flicker(t, .08, 2));
    const s1 = '범인 : ', tp = P(t, .15, .5); const all = typeSub(s1 + '???', tp);
    const w1 = measure(ctx, s1, 120, FONT.disp, 400), w2 = measure(ctx, '???', 120, FONT.disp, 400); const x0 = 540 - (w1 + w2) / 2;
    text(ctx, all.slice(0, s1.length), x0, 1160, { size: 120, family: FONT.disp, weight: 400, color: '#f4f1ea', align: 'left', stroke: '#000', strokeW: 10 });
    if (all.length > s1.length) glitchText(ctx, all.slice(s1.length), x0 + w1, 1160, t > tSnap ? .6 + .6 * hash(Math.floor(t * 24)) : .3, t, { size: 120, family: FONT.disp, weight: 400, color: K.red, align: 'left', stroke: '#000', strokeW: 10 });
    darkness(ctx, bx, by + 400, 1100, .75, .3); vignette(ctx, .5 + .3 * Math.exp(-Math.pow((t - tSnap) * 6, 2)));
  };
})();
