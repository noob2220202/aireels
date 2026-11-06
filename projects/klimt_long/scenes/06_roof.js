// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

window.KL.scenes.roof = function (ctx, t, d, info) {
    const tE = at(info, '지붕', .12), tS = at(info, '창으로', .4), tF = at(info, '액자가', .75), tX = at(info, '컸다', .92);
    ctx.save(); camera(ctx, { x: 540, y: 960, zoom: 1.02, rot: -E.inOutQ(P(t, 0, d)) * .085, t });
    gradBG(ctx, [[0, '#59626c'], [.45, '#3a424b'], [1, '#1d2228']]);
    fogLayer(ctx, t, 520, 400, '#b9c3cf', .14, 2, 25);
    poly(ctx, [[-200, 980], [80, 980], [80, 900], [180, 860], [280, 900], [280, 960], [600, 960], [600, 920], [760, 920], [760, 880], [880, 840], [1000, 880], [1000, 960], [1300, 960], [1300, 1200], [-200, 1200]], '#2a3038');
    const roofG = ctx.createLinearGradient(0, 1000, 0, 1500); roofG.addColorStop(0, '#4a4f55'); roofG.addColorStop(1, '#23272c');
    poly(ctx, [[-200, 1060], [1300, 1020], [1300, 1600], [-200, 1600]], roofG);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-200, 1100 + i * 55); ctx.lineTo(1300, 1060 + i * 57); ctx.stroke(); }
    ctx.fillStyle = '#16191d'; ctx.fillRect(-200, 1590, 1500, 400);
    const sx = 300, sw = 220, sy = 1040;
    poly(ctx, [[sx - sw / 2, sy + 20], [sx + sw / 2, sy + 16], [sx + sw / 2 - 18, sy - 70], [sx - sw / 2 + 18, sy - 66]], '#6d8193');
    const gl = ctx.createLinearGradient(sx - sw / 2, sy - 70, sx + sw / 2, sy + 20); gl.addColorStop(0, 'rgba(210,230,255,.55)'); gl.addColorStop(.5, 'rgba(120,150,180,.25)'); gl.addColorStop(1, 'rgba(210,230,255,.4)');
    poly(ctx, [[sx - sw / 2 + 12, sy + 12], [sx + sw / 2 - 12, sy + 9], [sx + sw / 2 - 26, sy - 60], [sx - sw / 2 + 26, sy - 57]], gl);
    ctx.strokeStyle = '#2b333c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy + 11); ctx.lineTo(sx, sy - 59); ctx.stroke();
    const fx = 760, fy = 1120, fw = 400;
    ctx.save(); ctx.translate(fx, fy); ctx.transform(1, -.03, -.55, .32, 0, 0); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 20; ctx.drawImage(T.frame, -fw / 2, -fw * 860 / 760 / 2, fw, fw * 860 / 760); ctx.restore();
    const sp = P(t, .1, tE + .3, E.inOutC); const lx = lerp(-100, fx - 10, sp), ly = lerp(1150, fy, sp);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(lx, ly, 20, lx, ly, 300); sg.addColorStop(0, 'rgba(255,255,240,.32)'); sg.addColorStop(.7, 'rgba(255,255,240,.12)'); sg.addColorStop(1, 'rgba(255,255,240,0)'); ctx.fillStyle = sg; ctx.save(); ctx.translate(lx, ly); ctx.scale(1, .45); ctx.translate(-lx, -ly); ctx.fillRect(lx - 300, ly - 300, 600, 600); ctx.restore(); ctx.restore();
    const dl = P(t, tS - .05, tS + .55, E.inOutQ);
    const route = L.bezierPts([sx, 1480], [sx - 10, 900], [sx + 120, 820], [fx - 90, 1085], 60);
    pathReveal(ctx, route, dl, { color: 'rgba(255,255,255,.9)', w: 5, dash: [14, 12], head: true });
    label(ctx, '경찰 초기 가설 · 낚싯줄로 빼냈다?', sx + 260, 770, { size: 34, a: P(t, tS + .2, tS + .5), border: 'rgba(255,255,255,.5)' });
    const mb = (x0, x1, y, p, lab, col) => {
      if (p <= 0) return; const s = E.outBack(clamp(p), 2.2); const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 * s;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(cx - hw, y + 26); ctx.lineTo(cx - hw, y); ctx.lineTo(cx + hw, y); ctx.lineTo(cx + hw, y + 26); ctx.stroke(); ctx.restore();
      label(ctx, lab, cx, y - 46, { size: 40, color: '#111', bg: col, a: clamp(p * 3) });
    };
    mb(sx - sw / 2 + 18, sx + sw / 2 - 18, 945, P(t, tF - .25, tF + .05), '천장 창', '#e8edf3');
    mb(fx - 240, fx + 250, 1010, P(t, tF + .1, tF + .4), '액자', K.gold);
    const xp = P(t, tX, tX + .25);
    if (xp > 0) {
      ctx.save(); ctx.strokeStyle = K.red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.shadowColor = K.red; ctx.shadowBlur = 18;
      const cx = sx + 20, cy = 1000, r = 90;
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(lerp(cx - r, cx + r, clamp(xp * 2)), lerp(cy - r, cy + r, clamp(xp * 2))); ctx.stroke();
      if (xp > .5) { ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(lerp(cx + r, cx - r, clamp(xp * 2 - 1)), lerp(cy - r, cy + r, clamp(xp * 2 - 1))); ctx.stroke(); }
      ctx.restore();
      const qp = P(t, tX + .15, tX + .4), pulse = 1 + .08 * Math.sin((t - tX) * 10);
      ctx.save(); ctx.translate(fx + 20, 820); ctx.scale(E.outBack(qp) * pulse, E.outBack(qp) * pulse); text(ctx, '?', 0, 0, { size: 170, family: FONT.disp, color: K.red, weight: 400, stroke: '#000', strokeW: 10 }); ctx.restore();
    }
    ctx.restore();
    tint(ctx, '#6f8aa6', .18);
  };
})();
