// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "엑스레이와 뒷면 봉인을 대조한 결과 진품, 추정가 6천만 유로 이상."
// An authentication lab, cool navy, one examiner silhouette (right, cyan rim light). Beats on narration words:
//  start      match-dissolve from "bag": the canvas fills the frame exactly where bag left it, camera pulls back
//  엑스레이와  the 1996 radiograph slides over the canvas as a transparency, a scan line sweeps it, the face /
//             hat / earring keypoints lock in gold; a checklist panel rises with row 1 typing
//             "1996년 X선·적외선 기록과 대조"; the film then shrinks and flies into row 1 (check)
//  뒷면       the examiner grips the right edge and turns the canvas over (perspective flip, edge light streak,
//             stretcher side visible, overshoot wobble) — the back: stretcher bars, labels, ink stamp, wax seals
//  봉인을     a loupe in his hand hops stamp → wax seal → label on the three tick sfx; each gets a green check
//             + tag (도장 / 밀랍 봉인 / 라벨); row 2 "뒷면 도장 · 밀랍 봉인 · 라벨" fills its three dots and checks
//  대조한     both evidence rows send light lines into the canvas (comparison converges)
//  결과       anticipation: room dims, gold brackets lock on, the examiner turns the canvas back to the front
//  진품       the red/gold seal slams onto the canvas (stamp sfx): flash, shockwave, gold burst, camera kick,
//             glasses glint; chip "2020.1.17 검찰 발표 · 진품"
//  추정가     checklist folds away, the value panel unfolds ("추정가" tab), camera eases back
//  6천만      split-flap digits roll and lock left→right on the 12 flap sfx: €60,000,000
//  유로/이상  € pulses, "+" pops on the tick, gold glint sweep, sub-label "미술관 추정 6천만~1억 유로"
//  end        slow push, motes; framing matches the opening of "condition" for a clean crossfade
// ---------------------------------------------------------------------------

let V = null;
const PC = { x: 540, y: 800 }, PS = .72;            // canvas world centre + scale of the 620x720 card sprite
const IW = 620, IH = 720;                            // card sprite (600x700 texture + stretcher edge)
const FLOOR = 1390;
const EX = { x: 1012, y: 1700, h: 1000 };            // examiner: feet point, faces left (toward the canvas)
const BX0 = -260, BY0 = -260, BW = 1600, BH = 2500;  // lab backdrop sprite world rect
const TGT = [[140, -172], [-138, 56], [128, 170]];   // back side: ink stamp, wax seal, label (texture coords from centre)
const TGT_NAME = ['도장', '밀랍 봉인', '라벨'];
const GREEN = '#7dffb0';

// ---------- utils ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
function camAt(keys, t) { // Catmull-Rom through [t, x, y, z]
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < 4; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}
// 2-link IK in figure-local coords (0 rad = straight down, x = sin a, y = cos a); returns [a1, a2]
function ik(root, tgt, l1, l2) {
  const dx = tgt[0] - root[0], dy = tgt[1] - root[1], d0 = Math.hypot(dx, dy);
  const d = clamp(d0, Math.abs(l1 - l2) + 1, l1 + l2 - .5);
  const base = Math.atan2(dx, dy), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  let best = null;
  for (const s of [1, -1]) {
    const a1 = base + s * al, ex = root[0] + Math.sin(a1) * l1, ey = root[1] + Math.cos(a1) * l1;
    const tx = root[0] + dx / d0 * d, ty = root[1] + dy / d0 * d;
    const a2 = Math.atan2(tx - ex, ty - ey) - a1;
    if (!best || ey > best.ey) best = { a1, a2, ey };     // elbow hangs low
  }
  return [best.a1, best.a2];
}
function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; }

// ---------- sprites (built once) ----------
function makeFront() {
  const [c, x] = mk(IW, IH);
  x.fillStyle = '#5c4630'; x.fillRect(0, 0, IW, IH);
  x.fillStyle = '#cbbd9e'; x.fillRect(5, 5, IW - 10, IH - 10);
  x.drawImage(T.portrait, 10, 10);
  const g = x.createLinearGradient(0, 0, IW, IH); g.addColorStop(0, 'rgba(255,250,235,.06)'); g.addColorStop(.5, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  x.fillStyle = g; x.fillRect(10, 10, 600, 700);
  return c;
}
function waxSeal(x, sx, sy, r, seed) {
  const R = rng(seed);
  x.save(); x.shadowColor = 'rgba(40,10,5,.55)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  const rg = x.createRadialGradient(sx - r * .35, sy - r * .35, r * .1, sx, sy, r * 1.15); rg.addColorStop(0, '#e2454c'); rg.addColorStop(.55, '#a3161f'); rg.addColorStop(1, '#5a070c');
  x.fillStyle = rg; x.beginPath();
  for (let k = 0; k <= 30; k++) { const a = k / 30 * Math.PI * 2, rr = r * (1 + (R() - .5) * .16 + .05 * Math.sin(a * 5 + seed)); k ? x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : x.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
  x.closePath(); x.fill(); x.restore();
  x.strokeStyle = 'rgba(60,0,4,.55)'; x.lineWidth = 3; x.beginPath(); x.arc(sx, sy, r * .62, 0, 7); x.stroke();
  x.strokeStyle = 'rgba(255,170,170,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(sx - 1, sy - 1, r * .62, 3.4, 5.4); x.stroke();
  // abstract embossed motif (no real crest)
  x.strokeStyle = 'rgba(70,0,6,.6)'; x.lineWidth = 2.5;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; x.beginPath(); x.moveTo(sx + Math.cos(a) * r * .14, sy + Math.sin(a) * r * .14); x.lineTo(sx + Math.cos(a) * r * .45, sy + Math.sin(a) * r * .45); x.stroke(); }
  x.fillStyle = 'rgba(255,200,200,.5)'; x.beginPath(); x.ellipse(sx - r * .38, sy - r * .42, r * .2, r * .09, -.6, 0, 7); x.fill();
}
function inkStamp(x, sx, sy, r, col, seed) {
  const R = rng(seed);
  x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = col; x.fillStyle = col;
  x.lineWidth = 4; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(sx, sy, r * .72, 0, 7); x.stroke();
  for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2; x.fillRect(sx + Math.cos(a) * r * .86 - 2, sy + Math.sin(a) * r * .86 - 2, 4, 4); }
  x.lineWidth = 3; x.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; const px = sx + Math.cos(a) * r * .4, py = sy + Math.sin(a) * r * .4; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke();
  x.restore();
  x.save(); x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 160; i++) { x.globalAlpha = R() * .7; x.beginPath(); x.arc(sx + (R() - .5) * r * 2.4, sy + (R() - .5) * r * 2.4, R() * 2.2 + .4, 0, 7); x.fill(); }
  x.restore();
}
function paperLabel(x, lx, ly, lw, lh, rot, seed) {
  const R = rng(seed);
  x.save(); x.translate(lx, ly); x.rotate(rot);
  x.shadowColor = 'rgba(40,25,10,.35)'; x.shadowBlur = 6; x.shadowOffsetY = 2; x.fillStyle = '#efe7d1'; x.fillRect(-lw / 2, -lh / 2, lw, lh); x.shadowColor = 'transparent';
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .5; x.fillStyle = pat; x.fillRect(-lw / 2, -lh / 2, lw, lh); x.globalAlpha = 1;
  x.strokeStyle = 'rgba(70,50,25,.55)'; x.lineWidth = 2; x.strokeRect(-lw / 2 + 6, -lh / 2 + 6, lw - 12, lh - 12);
  x.fillStyle = 'rgba(50,40,30,.7)'; x.fillRect(-lw / 2 + 16, -lh / 2 + 16, lw * .5, 7);
  for (let k = 0; k < 3; k++) { x.fillStyle = `rgba(60,48,35,${.35 + R() * .2})`; x.fillRect(-lw / 2 + 16, -lh / 2 + 32 + k * 13, (lw - 40) * (.55 + R() * .45), 4); }
  const g = x.createLinearGradient(-lw / 2, 0, lw / 2, 0); g.addColorStop(0, 'rgba(150,110,40,.12)'); g.addColorStop(1, 'rgba(150,110,40,0)'); x.fillStyle = g; x.fillRect(-lw / 2, -lh / 2, lw, lh);
  x.restore();
}
function makeBack() {
  const [c, x] = mk(IW, IH); const R = rng(612);
  x.translate(IW / 2, IH / 2);
  x.fillStyle = '#3f2e1d'; x.fillRect(-310, -360, 620, 720);
  let g = x.createLinearGradient(-300, -350, 300, 350); g.addColorStop(0, '#d2c3a0'); g.addColorStop(1, '#b5a47f');
  x.fillStyle = g; x.fillRect(-305, -355, 610, 710);
  for (let i = -355; i < 355; i += 4) { x.fillStyle = `rgba(90,70,40,${.04 + R() * .06})`; x.fillRect(-305, i, 610, 1.4); }
  for (let i = -305; i < 305; i += 4) { x.fillStyle = `rgba(255,250,235,${.03 + R() * .05})`; x.fillRect(i, -355, 1.4, 710); }
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .3; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(-305, -355, 610, 710); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // stretcher bars (outer frame + cross brace) with grain + cast shadows on the linen
  const bars = [[-305, -355, 610, 50, 0], [-305, 305, 610, 50, 0], [-305, -305, 50, 610, 1], [255, -305, 50, 610, 1], [-24, -305, 48, 610, 1], [-255, -24, 510, 48, 0]];
  for (const [bx, by, bw, bh, vert] of bars) { // soft shadow first
    x.save(); x.shadowColor = 'rgba(30,18,6,.55)'; x.shadowBlur = 14; x.shadowOffsetX = vert ? 4 : 0; x.shadowOffsetY = vert ? 0 : 5; x.fillStyle = '#6f5034'; x.fillRect(bx, by, bw, bh); x.restore();
  }
  for (const [bx, by, bw, bh, vert] of bars) {
    const gg = vert ? x.createLinearGradient(bx, 0, bx + bw, 0) : x.createLinearGradient(0, by, 0, by + bh);
    gg.addColorStop(0, '#5a3f26'); gg.addColorStop(.22, '#8c6b45'); gg.addColorStop(.7, '#77583a'); gg.addColorStop(1, '#4a3320');
    x.fillStyle = gg; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = 'rgba(45,28,12,.38)'; x.lineWidth = 1.3;
    for (let k = 0; k < 8; k++) {
      x.beginPath();
      if (vert) { const xx = bx + 4 + R() * (bw - 8); x.moveTo(xx, by); x.bezierCurveTo(xx + (R() - .5) * 9, by + bh * .3, xx + (R() - .5) * 9, by + bh * .7, xx + (R() - .5) * 6, by + bh); }
      else { const yy = by + 4 + R() * (bh - 8); x.moveTo(bx, yy); x.bezierCurveTo(bx + bw * .3, yy + (R() - .5) * 9, bx + bw * .7, yy + (R() - .5) * 9, bx + bw, yy + (R() - .5) * 6); }
      x.stroke();
    }
    x.fillStyle = 'rgba(255,225,180,.12)'; if (vert) x.fillRect(bx + 2, by, 2, bh); else x.fillRect(bx, by + 2, bw, 2);
  }
  // corner keys
  for (const [kx, ky, kr] of [[-262, -312, .78], [262, -312, -.78], [-262, 312, -.78], [262, 312, .78]]) { x.save(); x.translate(kx, ky); x.rotate(kr); x.fillStyle = '#9a7a52'; x.fillRect(-16, -7, 32, 14); x.strokeStyle = 'rgba(40,25,10,.5)'; x.lineWidth = 1.5; x.strokeRect(-16, -7, 32, 14); x.restore(); }
  // tacks along the edge
  for (let i = 0; i < 22; i++) { const s = i / 21; for (const [px, py] of [[-305 + s * 610, -352], [-305 + s * 610, 352], [-302, -355 + s * 710], [302, -355 + s * 710]]) { x.fillStyle = 'rgba(40,40,44,.8)'; x.beginPath(); x.arc(px, py, 2.6, 0, 7); x.fill(); } }
  // labels, stamps, seals (generic, no real marks)
  paperLabel(x, -140, -180, 178, 96, -.03, 3);
  paperLabel(x, TGT[2][0], TGT[2][1], 164, 84, .035, 9);
  inkStamp(x, TGT[0][0], TGT[0][1], 46, 'rgba(48,44,120,.85)', 21);
  inkStamp(x, -150, 210, 34, 'rgba(30,30,34,.8)', 22);
  waxSeal(x, TGT[1][0], TGT[1][1], 34, 4);
  waxSeal(x, 150, -330, 20, 7);
  // pencil / chalk marks on the bars
  x.strokeStyle = 'rgba(240,235,220,.45)'; x.lineWidth = 3; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-290, 60); x.quadraticCurveTo(-278, 40, -268, 70); x.quadraticCurveTo(-262, 90, -276, 110); x.stroke();
  x.beginPath(); x.moveTo(-60, 330); x.lineTo(-20, 322); x.moveTo(-10, 334); x.quadraticCurveTo(8, 318, 20, 336); x.stroke();
  const v = x.createRadialGradient(0, 0, 220, 0, 0, 520); v.addColorStop(0, 'rgba(30,18,6,0)'); v.addColorStop(1, 'rgba(30,18,6,.3)'); x.fillStyle = v; x.fillRect(-310, -360, 620, 720);
  return c;
}
function makeFilm() { // the 1996 radiograph on a film sheet (same 620x720 frame as the card so it registers 1:1)
  const [c, x] = mk(IW, IH);
  const [r, rx] = mk(600, 700);
  rx.filter = 'grayscale(1) contrast(1.6) brightness(.85)'; rx.drawImage(T.portrait, 0, 0); rx.filter = 'none';
  rx.globalCompositeOperation = 'multiply'; rx.fillStyle = '#7fd2ff'; rx.fillRect(0, 0, 600, 700);
  rx.globalCompositeOperation = 'lighter'; rx.fillStyle = '#03101c'; rx.fillRect(0, 0, 600, 700);
  rx.globalAlpha = .95; rx.drawImage(T.ghost, 0, 0); rx.globalAlpha = 1; rx.globalCompositeOperation = 'source-over';
  const R = rng(96); for (let i = 0; i < 9000; i++) { rx.fillStyle = `rgba(${R() < .5 ? '210,240,255' : '0,8,16'},${R() * .07})`; rx.fillRect(R() * 600, R() * 700, 2, 2); }
  const vg = rx.createRadialGradient(300, 350, 160, 300, 350, 520); vg.addColorStop(0, 'rgba(0,8,16,0)'); vg.addColorStop(1, 'rgba(0,8,16,.6)'); rx.fillStyle = vg; rx.fillRect(0, 0, 600, 700);
  x.fillStyle = 'rgba(6,18,30,.96)'; roundRect(x, 0, 0, IW, IH, 10); x.fill();
  x.drawImage(r, 10, 10);
  x.strokeStyle = 'rgba(140,220,255,.55)'; x.lineWidth = 3; roundRect(x, 2, 2, IW - 4, IH - 4, 9); x.stroke();
  x.fillStyle = 'rgba(140,220,255,.85)'; x.font = '400 22px "Special Elite"'; x.textBaseline = 'top'; x.fillText('X-RAY · 1996', 24, 18);
  x.fillStyle = 'rgba(140,220,255,.5)'; x.fillRect(IW - 70, 20, 44, 14);
  return c;
}
function makeStamp() {
  const S = 360, [c, x] = mk(S, S); x.translate(S / 2, S / 2); const R = rng(55);
  x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 22; x.shadowOffsetY = 10;
  const rg = x.createRadialGradient(-50, -60, 10, 0, 0, 175); rg.addColorStop(0, '#ff5a62'); rg.addColorStop(.45, '#c41d29'); rg.addColorStop(1, '#5e070c');
  x.fillStyle = rg; x.beginPath();
  for (let k = 0; k <= 56; k++) { const a = k / 56 * Math.PI * 2, rr = 156 + (k % 2 ? 7 : 0) + (R() - .5) * 3; k ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  x.closePath(); x.fill(); x.restore();
  x.strokeStyle = '#f6d77f'; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 132, 0, 7); x.stroke();
  x.lineWidth = 2.5; x.beginPath(); x.arc(0, 0, 114, 0, 7); x.stroke();
  x.fillStyle = '#f6d77f'; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * 123, Math.sin(a) * 123, 2.6, 0, 7); x.fill(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '400 112px "Black Han Sans"'; x.fillStyle = 'rgba(60,0,4,.6)'; x.fillText('진품', 3, -6); x.fillStyle = '#fff3cf'; x.fillText('진품', 0, -10);
  x.font = '800 22px "Pretendard"'; x.letterSpacing = '5px'; x.fillStyle = '#fff3cf'; x.fillText('AUTHENTIC', 2, 66); x.letterSpacing = '0px';
  x.fillStyle = '#f6d77f'; for (const sx of [-88, 88]) { x.beginPath(); x.arc(sx, 66, 4, 0, 7); x.fill(); }
  const hg = x.createRadialGradient(-60, -80, 0, -60, -80, 150); hg.addColorStop(0, 'rgba(255,255,255,.28)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hg; x.beginPath(); x.arc(0, 0, 150, 0, 7); x.fill();
  x.save(); x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 500; i++) { x.globalAlpha = R() * .35; x.beginPath(); x.arc((R() - .5) * 330, (R() - .5) * 330, R() * 2.4 + .3, 0, 7); x.fill(); }
  x.restore();
  return c;
}
function viewer(x, vx, vy, vw, vh, R, portraitGhost) {
  x.save(); x.shadowColor = 'rgba(150,210,255,.6)'; x.shadowBlur = 70; x.fillStyle = '#a3c9e8'; x.fillRect(vx, vy, vw, vh); x.restore();
  x.fillStyle = '#cfe5f6'; x.fillRect(vx + 6, vy + 6, vw - 12, vh - 12);
  const n = Math.max(1, Math.round(vw / 170));
  for (let k = 0; k < n; k++) {
    const fw = (vw - 24) / n - 10, fx = vx + 12 + k * (fw + 10), fy = vy + 14, fh = vh - 28;
    const fg = x.createLinearGradient(fx, fy, fx + fw, fy + fh); fg.addColorStop(0, '#1b2b3b'); fg.addColorStop(1, '#0c1723'); x.fillStyle = fg; x.fillRect(fx, fy, fw, fh);
    if (portraitGhost && k === 0) {
      x.save(); x.globalAlpha = .55; x.globalCompositeOperation = 'lighter'; x.drawImage(T.ghost, fx, fy + 8, fw, fw * 700 / 600); x.restore();
    } else for (let j = 0; j < 6; j++) { const bx = fx + R() * fw, by = fy + R() * fh, br = 14 + R() * 40; const rg = x.createRadialGradient(bx, by, 0, bx, by, br); rg.addColorStop(0, 'rgba(190,225,250,.45)'); rg.addColorStop(1, 'rgba(190,225,250,0)'); x.fillStyle = rg; x.fillRect(bx - br, by - br, br * 2, br * 2); }
    x.fillStyle = '#3a4048'; x.fillRect(fx + fw / 2 - 12, fy - 10, 24, 12);
  }
}
function makeLab() {
  const [c, x] = mk(BW, BH); x.translate(-BX0, -BY0); const R = rng(1201);
  let g = x.createLinearGradient(0, BY0, 0, FLOOR); g.addColorStop(0, '#04070d'); g.addColorStop(.48, '#0b1424'); g.addColorStop(1, '#070b14');
  x.fillStyle = g; x.fillRect(BX0, BY0, BW, FLOOR - BY0);
  for (let px = BX0 + 40; px < BX0 + BW; px += 240) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, BY0, 5, FLOOR - BY0); x.fillStyle = 'rgba(150,190,255,.035)'; x.fillRect(px + 5, BY0, 2, FLOOR - BY0); }
  x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(BX0, 330, BW, 4);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '170,200,255' : '0,0,0'},${R() * .035})`; x.fillRect(BX0 + R() * BW, BY0 + R() * (FLOOR - BY0), 2, 2); }
  viewer(x, -210, 430, 420, 300, R, true);
  viewer(x, 930, 380, 300, 210, R, false);
  // archive shelves (right) and cabinet (left)
  x.fillStyle = '#04070c';
  for (const sy of [760, 930, 1100, 1270]) x.fillRect(880, sy, 420, 12);
  x.fillRect(890, 700, 12, 690); x.fillRect(1290, 700, 12, 690);
  for (let i = 0; i < 18; i++) { const sy = [760, 930, 1100, 1270][i % 4], bx = 905 + R() * 360, bw = 40 + R() * 70, bh = 50 + R() * 90; x.fillStyle = `rgb(${10 + R() * 10},${14 + R() * 12},${22 + R() * 14})`; x.fillRect(bx, sy - bh, bw, bh); x.fillStyle = 'rgba(150,190,255,.05)'; x.fillRect(bx, sy - bh, bw, 2); }
  x.fillStyle = '#05080e'; x.fillRect(-250, 960, 300, 430);
  x.fillStyle = 'rgba(150,190,255,.06)'; x.fillRect(-250, 960, 300, 3);
  // workbench behind the easel with a microscope + a lamp silhouette
  x.fillStyle = '#060a12'; x.fillRect(BX0, 1240, BW, 26); x.fillStyle = 'rgba(150,190,255,.07)'; x.fillRect(BX0, 1240, BW, 2);
  x.fillStyle = '#05080e'; x.fillRect(BX0, 1266, BW, FLOOR - 1266);
  x.fillStyle = '#03050a';
  x.fillRect(150, 1180, 70, 60); x.fillRect(178, 1060, 16, 130); x.save(); x.translate(186, 1060); x.rotate(-.5); x.fillRect(-12, -70, 24, 90); x.restore();
  x.beginPath(); x.moveTo(760, 1240); x.lineTo(790, 1100); x.lineTo(850, 1060); x.lineWidth = 10; x.strokeStyle = '#03050a'; x.stroke();
  x.beginPath(); x.ellipse(860, 1060, 40, 18, .4, 0, 7); x.fill();
  // floor
  g = x.createLinearGradient(0, FLOOR, 0, BY0 + BH); g.addColorStop(0, '#0a101a'); g.addColorStop(1, '#020306'); x.fillStyle = g; x.fillRect(BX0, FLOOR, BW, BY0 + BH - FLOOR);
  x.fillStyle = 'rgba(140,190,255,.08)'; x.fillRect(BX0, FLOOR, BW, 2);
  x.strokeStyle = 'rgba(140,190,255,.03)'; x.lineWidth = 2;
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(540 + i * 80, FLOOR); x.lineTo(540 + i * 300, BY0 + BH); x.stroke(); }
  // cool pool of light behind the easel
  const rg = x.createRadialGradient(PC.x, PC.y - 60, 0, PC.x, PC.y - 60, 640); rg.addColorStop(0, 'rgba(70,120,180,.26)'); rg.addColorStop(.45, 'rgba(70,120,180,.08)'); rg.addColorStop(1, 'rgba(70,120,180,0)');
  x.globalCompositeOperation = 'lighter'; x.fillStyle = rg; x.fillRect(PC.x - 640, PC.y - 700, 1280, 1280); x.globalCompositeOperation = 'source-over';
  const [c2, x2] = mk(BW, BH); x2.filter = 'blur(3px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  // overhead copy light + its pool on the floor, baked (static) on top of the soft backdrop
  x2.translate(-BX0, -BY0);
  const Rr = makeRays(.5, 1500, '#a9cff2', .9, 7, 3);
  x2.globalCompositeOperation = 'lighter'; x2.globalAlpha = .085; x2.drawImage(Rr.c, PC.x - 10 - Rr.w / 2, 60, Rr.w, Rr.h); x2.globalAlpha = 1;
  const pg = x2.createRadialGradient(PC.x, FLOOR + 30, 10, PC.x, FLOOR + 30, 400); pg.addColorStop(0, 'rgba(110,170,230,.16)'); pg.addColorStop(1, 'rgba(110,170,230,0)');
  x2.save(); x2.translate(PC.x, FLOOR + 30); x2.scale(1, .16); x2.translate(-PC.x, -FLOOR - 30); x2.fillStyle = pg; x2.fillRect(PC.x - 400, FLOOR - 370, 800, 800); x2.restore();
  x2.globalCompositeOperation = 'source-over';
  return c2;
}
function makeRays(spread, len, color, a, n, seed) {
  const k = .5, w = Math.ceil(2 * len * Math.sin(spread / 2 + .14) * k) + 4, h = Math.ceil(len * k);
  const [c, x] = mk(w, h); x.globalCompositeOperation = 'lighter'; x.scale(k, k); const ox = w / k / 2;
  for (let i = 0; i < n; i++) {
    const q = i / (n - 1) - .5, aa = Math.PI / 2 + q * spread, ww = spread / n * (.6 + .5 * hash(i * 13 + seed)), al = a * (.3 + .7 * hash(i * 7 + seed));
    const g = x.createLinearGradient(ox, 0, ox + Math.cos(aa) * len, Math.sin(aa) * len); g.addColorStop(0, rgba(color, al)); g.addColorStop(1, rgba(color, 0)); x.fillStyle = g;
    x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox + Math.cos(aa - ww) * len, Math.sin(aa - ww) * len); x.lineTo(ox + Math.cos(aa + ww) * len, Math.sin(aa + ww) * len); x.closePath(); x.fill();
  }
  return { c, w: w / k, h: h / k };
}
function makeSoft() { const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; x.fillRect(52, 52, 152, 152); x.filter = 'none'; return c; }
function softRect(ctx, x, y, w, h, a) { const k = 52, sx = w / 152, sy = h / 152; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(V.soft, x - k * sx, y - k * sy, 256 * sx, 256 * sy); ctx.restore(); }
function makeFG() { // out-of-focus foreground: a lamp arm + bokeh on the left edge
  const [c, x] = mk(420, 1500);
  x.fillStyle = '#020306'; x.save(); x.translate(120, 0);
  x.beginPath(); x.moveTo(-40, 1500); x.lineTo(40, 1500); x.lineTo(90, 700); x.lineTo(30, 690); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(60, 700); x.lineTo(150, 380); x.lineWidth = 34; x.strokeStyle = '#020306'; x.stroke();
  x.beginPath(); x.ellipse(170, 360, 90, 46, -.5, 0, 7); x.fill();
  x.strokeStyle = 'rgba(120,190,255,.35)'; x.lineWidth = 4; x.beginPath(); x.moveTo(86, 1500); x.lineTo(118, 720); x.stroke();
  x.restore();
  const R = rng(8); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const bx = 40 + R() * 340, by = 200 + R() * 1200, br = 18 + R() * 40; const g = x.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, `rgba(140,200,255,${.06 + R() * .1})`); g.addColorStop(.8, `rgba(140,200,255,${.04 + R() * .05})`); g.addColorStop(1, 'rgba(140,200,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
  const [c2, x2] = mk(420, 1500); x2.filter = 'blur(9px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  return c2;
}
function initV() {
  V = { front: makeFront(), back: makeBack(), film: makeFilm(), stampS: makeStamp(), lab: makeLab(), soft: makeSoft(), fg: makeFG() };
}

// ---------- drawing pieces ----------
// the canvas rotating about its vertical axis through PC (th = 0 front, PI back); pseudo-perspective via strips
function drawCard(ctx, t, th, filmA, scanP) {
  const c = Math.cos(th), sn = Math.sin(th), front = c >= 0, img = front ? V.front : V.back;
  const sg = front ? sn : -sn, ac = Math.max(.004, Math.abs(c)), Fd = 2400;
  const N = ac > .995 ? 1 : 26, xs = [], fs = [];
  for (let i = 0; i <= N; i++) { const b = (-IW / 2 + IW * i / N) * PS, f = Fd / (Fd - b * sg); xs.push(PC.x + b * ac * f); fs.push(f); }
  // cast shadow on the backdrop
  const wN = Math.abs(xs[N] - xs[0]);
  softRect(ctx, Math.min(xs[0], xs[N]) + 26, PC.y - IH * PS / 2 + 34, Math.max(20, wN), IH * PS, .7);
  // stretcher side (near edge)
  const near = sg >= 0 ? N : 0, thick = 24 * PS * Math.abs(sn) * fs[near];
  if (thick > .5) {
    const ex = xs[near], hh = IH * PS * fs[near], dir = near === N ? 1 : -1;
    const g = ctx.createLinearGradient(ex, 0, ex + dir * thick, 0); g.addColorStop(0, '#6e5134'); g.addColorStop(1, '#2a1d11');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex, PC.y - hh / 2); ctx.lineTo(ex + dir * thick, PC.y - hh / 2 + thick * .08); ctx.lineTo(ex + dir * thick, PC.y + hh / 2 - thick * .08); ctx.lineTo(ex, PC.y + hh / 2); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < N; i++) {
    const f = (fs[i] + fs[i + 1]) / 2, x0 = Math.min(xs[i], xs[i + 1]), x1 = Math.max(xs[i], xs[i + 1]), hh = IH * PS * f;
    ctx.drawImage(img, IW * i / N, 0, IW / N, IH, x0, PC.y - hh / 2, x1 - x0 + (N > 1 ? .7 : 0), hh);
  }
  // 1996 film overlay registered on the front (before the flip)
  if (front && filmA > 0) {
    ctx.save(); ctx.globalAlpha *= filmA; ctx.drawImage(V.film, PC.x - IW * PS / 2, PC.y - IH * PS / 2, IW * PS, IH * PS); ctx.restore();
  }
  // shading + spec highlight while turning
  const quad = () => { ctx.beginPath(); ctx.moveTo(xs[0], PC.y - IH * PS * fs[0] / 2); ctx.lineTo(xs[N], PC.y - IH * PS * fs[N] / 2); ctx.lineTo(xs[N], PC.y + IH * PS * fs[N] / 2); ctx.lineTo(xs[0], PC.y + IH * PS * fs[0] / 2); ctx.closePath(); };
  const shade = (1 - ac) * .62;
  if (shade > .01) { ctx.fillStyle = `rgba(0,0,0,${shade})`; quad(); ctx.fill(); }
  const spec = Math.pow(Math.abs(sn), 3) * (ac > .02 ? 1 : 0);
  if (spec > .02) {
    ctx.save(); quad(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const mx = lerp(xs[0], xs[N], .5 + .45 * Math.sin(th * 2));
    const g = ctx.createLinearGradient(mx - 90, 0, mx + 90, 0); g.addColorStop(0, 'rgba(200,230,255,0)'); g.addColorStop(.5, `rgba(220,240,255,${.35 * spec})`); g.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - 90, PC.y - 500, 180, 1000); ctx.restore();
  }
  return { xs, fs, N, front, ac };
}
function hudCorners(ctx, x0, y0, x1, y1, a, color, len = 40, lw = 5) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.shadowColor = color; ctx.shadowBlur = 12;
  for (const [sx, sy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const px = sx ? x1 : x0, py = sy ? y1 : y0, dx = sx ? -1 : 1, dy = sy ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(px, py + dy * len); ctx.lineTo(px, py); ctx.lineTo(px + dx * len, py); ctx.stroke();
  }
  ctx.restore();
}
function checkMark(ctx, x, y, r, p, color, a = 1) { // ring + drawn tick
  if (p <= 0) return; const s = E.outBack(clamp(p * 1.4), 2.2);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(4,20,12,.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = r * .16; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  const q = clamp((p - .25) / .6); ctx.lineWidth = r * .2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-r * .45, 0);
  const q1 = clamp(q * 2), q2 = clamp(q * 2 - 1);
  ctx.lineTo(-r * .45 + r * .3 * q1, r * .3 * q1); if (q2 > 0) ctx.lineTo(-r * .15 + r * .6 * q2, r * .3 - r * .68 * q2); ctx.stroke();
  ctx.restore();
}
function glassPanel(ctx, x, y, w, h, a, border = 'rgba(160,210,255,.35)') {
  softRect(ctx, x + 6, y + 14, w - 12, h, .8 * a);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(6,9,15,.86)'; roundRect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 2.5; roundRect(ctx, x, y, w, h, 16); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 16, y + 3, w - 32, 2);
  ctx.restore();
}
function digitCell(ctx, cx, cy, cw, ch, s, roll, lockP, size, color) {
  // roll: null = locked/static glyph s; number = continuous wheel position (digits scroll upward)
  ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRect(ctx, cx - cw / 2 + 2, cy - ch / 2 + 6, cw, ch, 9); ctx.fill();
  ctx.fillStyle = '#10141c'; roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 9); ctx.fill();
  ctx.save(); ctx.beginPath(); roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 9); ctx.clip();
  if (roll != null) {
    const a = Math.floor(roll), f = roll - a, step = ch * .82;
    for (let k = -1; k <= 1; k++) {
      const dgt = String(((a + k) % 10 + 10) % 10), yy = cy + (k - f) * step;
      text(ctx, dgt, cx, yy + size * .05, { size, family: FONT.disp, weight: 400, color: '#8a93a6', alpha: .85 - Math.abs(k - f) * .45 });
    }
  } else {
    const q = clamp(lockP), yy = cy + (1 - E.outBack(q, 2.2)) * ch * .5;
    text(ctx, s, cx, yy + size * .05, { size, family: FONT.disp, weight: 400, color, alpha: clamp(q * 3) });
  }
  ctx.restore();
  const g = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.12, 'rgba(0,0,0,.35)'); g.addColorStop(.3, 'rgba(0,0,0,0)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(.88, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g; roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 9); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx - cw / 2, cy - 1.5, cw, 3);
  if (roll == null && lockP < 1 && lockP > 0) glow(ctx, cx, cy, cw * 1.3, K.gold, .55 * (1 - lockP));
}

window.KL.scenes.verdict = function (ctx, t, d, info) {
  if (!V) initV();
  const tX = at(info, '엑스레이와', .0), tB = at(info, '뒷면', .14), tS = at(info, '봉인을', .23), tD = at(info, '대조한', .315), tR = at(info, '결과', .392),
    tJ = at(info, '진품', .459), tE = at(info, '추정가', .592), tMin = at(info, '최소', .743), tM = at(info, '6천만', .825), tU = at(info, '유로', .927);
  const tI = tU + .25;                                 // tick sfx (유로 +.25): the '+' pops
  const tc = [tB + .15, tB + .33, tB + .51];          // the three tick sfx (checks)
  const tImp = tJ + .08;                               // stamp sfx
  const tF0 = tB - .17, tF1 = tB + .1;                 // flip to back (whoosh at tB - .15)
  const tG0 = tR - .08, tG1 = tR + .22;                // flip back to front
  const lockT = k => tM + .08 + k * .068;

  // ---- canvas angle ----
  let th = -.06 * tri(t, tF0 - .2, tF0 + .02) + Math.PI * P(t, tF0, tF1, E.inOutC);
  if (t > tF1) th += .085 * Math.sin((t - tF1) * 21) * Math.exp(-(t - tF1) * 9);
  th += Math.PI * P(t, tG0, tG1, E.inOutC);
  if (t > tG1) th += .07 * Math.sin((t - tG1) * 21) * Math.exp(-(t - tG1) * 9);

  // ---- camera ----
  const keys = [[-.45, 540, 871, 1.42], [0, 540, 878, 1.37], [tB - .1, 540, 960, 1.0], [tB + .15, 546, 952, 1.04], [tc[2], 550, 946, 1.055], [tD, 541, 958, 1.0],
    [tR, 540, 953, 1.035], [tImp, 540, 948, 1.085], [tImp + .5, 540, 956, 1.04], [tE, 540, 966, 1.0], [tM, 540, 985, .935], [d, 540, 990, .95], [d + .5, 540, 992, .955]];   // end framing == condition's opening
  let [cx, cy, z] = camAt(keys, t);
  const imp = t >= tImp ? Math.exp(-(t - tImp) * 9) : 0;
  z *= 1 + .035 * imp * Math.sin(Math.min(1, (t - tImp) * 6) * Math.PI);
  const edgeEnv = P(t, 0, .6) * (1 - P(t, d - .6, d));  // calm the handheld drift at the crossfades so neighbours register
  const dr = drift(t, .5 * edgeEnv + .1, 21);
  const shk = imp * 1.1 + .25 * tri(t, tF0 + .05, tF1 + .05);
  const sx = dr.x + shk * noise1(t * 42, 5) * 10, sy = dr.y + shk * noise1(t * 42, 6) * 10;
  const layer = f => { const zf = 1 + (z - 1) * f; ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (cx - 540) * f) - sx * f, -(960 + (cy - 960) * f) - sy * f); };
  const toS = (x, y) => [W / 2 + (x - cx - sx) * z, H / 2 + (y - cy - sy) * z];

  // ---- backdrop ----
  ctx.save(); layer(.6); ctx.drawImage(V.lab, BX0, BY0);
  // film viewer flicker + a breathing copy light on the easel
  glow(ctx, 0, 580, 280, '#9cc8f0', .08 + .04 * noise1(t * 6, 2));
  glow(ctx, PC.x, PC.y - 330, 240, '#bfdcff', .05 + .035 * fbm(t * 1.6, 3));
  ctx.restore();
  const dim = .55 * P(t, tR - .3, tR) * (1 - P(t, tImp, tImp + .25));    // anticipation dim before the verdict

  // ---- mid layer ----
  ctx.save(); layer(1);
  // easel (behind the canvas)
  ctx.save(); ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [[PC.x, 470, PC.x, FLOOR + 30, 22], [PC.x - 6, 600, PC.x - 220, FLOOR + 40, 18], [PC.x + 6, 600, PC.x + 220, FLOOR + 40, 18]]) {
    ctx.strokeStyle = '#080a0e'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(130,190,250,.15)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 - w * .4, y0); ctx.lineTo(x1 - w * .4, y1); ctx.stroke();
  }
  ctx.fillStyle = '#080a0e'; ctx.fillRect(PC.x - 60, 480, 120, 18);
  ctx.restore();

  // film overlay timing
  const filmIn = P(t, tX - .08, tX + .3, E.outC), filmFly = P(t, tB - .16, tB + .06, E.inOutC);
  const filmOn = filmIn * (filmFly > 0 ? 0 : 1);
  const card = drawCard(ctx, t, th, .78 * filmOn * (filmIn >= 1 ? 1 : 0), 0);
  // film sliding in (not yet registered)
  if (filmIn > 0 && filmIn < 1) {
    ctx.save(); ctx.translate(PC.x + lerp(-760, 0, filmIn), PC.y + lerp(60, 0, filmIn)); ctx.rotate(lerp(-.2, 0, filmIn)); ctx.globalAlpha *= .78 * clamp(filmIn * 2);
    ctx.drawImage(V.film, -IW * PS / 2, -IH * PS / 2, IW * PS, IH * PS); ctx.restore();
  }
  // scan line over the registered film + keypoint locks
  const scan = P(t, tX + .14, tB - .14, E.inOutQ);
  if (filmOn > 0 && filmIn >= 1) {
    const top = PC.y - 350 * PS, bot = PC.y + 350 * PS, yy = lerp(top, bot, scan);
    if (scan > 0 && scan < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, yy - 70, 0, yy); g.addColorStop(0, 'rgba(95,227,255,0)'); g.addColorStop(1, 'rgba(95,227,255,.5)');
      ctx.fillStyle = g; ctx.fillRect(PC.x - 300 * PS, yy - 70, 600 * PS, 70); ctx.fillStyle = '#eafcff'; ctx.fillRect(PC.x - 330 * PS, yy - 2, 660 * PS, 4);
      ctx.restore();
    }
    // keypoints on the shared face (texture coords from the portrait): eye, lips, earring, hat brim edge
    const kps = [[293, 279], [272, 362], [368, 350], [130, 214], [470, 200]];
    kps.forEach(([u, v], i) => {
      const px = PC.x + (u - 300) * PS, py = PC.y + (v - 350) * PS, ky = (py - top) / (bot - top);
      const p = clamp((scan - ky) / .12);
      if (p <= 0) return;
      const s = E.outBack(p, 2.5), col = i < 3 ? K.goldHi : K.cyan;
      ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(24, 0); ctx.moveTo(0, -24); ctx.lineTo(0, -8); ctx.moveTo(0, 8); ctx.lineTo(0, 24); ctx.stroke();
      ctx.restore();
    });
    hudCorners(ctx, PC.x - 318 * PS, PC.y - 368 * PS, PC.x + 318 * PS, PC.y + 368 * PS, P(t, tX + .1, tX + .3) * (1 - P(t, tB - .25, tB - .12)), K.cyan, 34, 4);
  }
  // easel ledge (in front of the canvas)
  { const ly = PC.y + IH * PS / 2 - 6; const g = ctx.createLinearGradient(0, ly, 0, ly + 26); g.addColorStop(0, '#2a2016'); g.addColorStop(1, '#0b0805'); ctx.fillStyle = g; ctx.fillRect(PC.x - 230, ly, 460, 26); ctx.fillStyle = 'rgba(160,200,255,.18)'; ctx.fillRect(PC.x - 230, ly, 460, 2); }
  // edge-on light streak during the flips
  for (const [a0, a1] of [[tF0, tF1], [tG0, tG1]]) {
    const q = tri(t, a0 + (a1 - a0) * .3, a0 + (a1 - a0) * .7);
    if (q > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ex = (card.xs[0] + card.xs[card.N]) / 2, g = ctx.createLinearGradient(ex - 420, 0, ex + 420, 0);
      g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(.5, `rgba(220,245,255,${.45 * q})`); g.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = g; ctx.fillRect(ex - 420, PC.y - 3, 840, 6);
      ctx.fillStyle = `rgba(230,248,255,${.5 * q})`; ctx.fillRect(ex - 2, PC.y - IH * PS / 2, 4, IH * PS);
      ctx.restore();
    }
  }
  // seal checks on the back + loupe
  const T0 = TGT.map(([u, v]) => [PC.x + u * PS, PC.y + v * PS]);
  const backVis = !card.front && card.ac > .5;
  if (backVis) {
    T0.forEach(([px, py], i) => {
      const p = P(t, tc[i] - .04, tc[i] + .22);
      if (p <= 0) return;
      const fade = 1 - P(t, tR - .2, tR);
      glow(ctx, px, py, 90, GREEN, .45 * p * (1 - P(t, tc[i] + .2, tc[i] + .7) * .6) * fade);
      checkMark(ctx, px, py, 22, p, GREEN, fade);
    });
  }
  // loupe path
  const lp = (() => {
    const a = P(t, tc[0] + .05, tc[1] - .05, E.inOutC), b = P(t, tc[1] + .05, tc[2] - .05, E.inOutC);
    let p = T0[0];
    if (a > 0) p = bez(T0[0], [T0[0][0] - 40, T0[0][1] + 90], [T0[1][0] + 70, T0[1][1] - 60], T0[1], a);
    if (b > 0) p = bez(T0[1], [T0[1][0] + 60, T0[1][1] + 30], [T0[2][0] - 80, T0[2][1] - 20], T0[2], b);
    return p;
  })();
  const lIn = P(t, tc[0] - .2, tc[0] - .05, E.outBack), lOut = P(t, tc[2] + .14, tc[2] + .3, E.inQ);
  const lS = lIn * (1 - lOut), LR = 74, MAG = 2.3;
  const lx = lp[0] + (1 - lIn) * 70, ly = lp[1] + (1 - lIn) * 60;
  if (lS > .01 && backVis) {
    ctx.save(); ctx.translate(lx, ly); ctx.scale(lS, lS); ctx.translate(-lx, -ly);
    ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, LR, 0, 7); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(lx - LR, ly - LR, LR * 2, LR * 2);
    ctx.translate(lx, ly); ctx.scale(MAG, MAG); ctx.translate(-lx, -ly);
    ctx.drawImage(V.back, PC.x - IW * PS / 2, PC.y - IH * PS / 2, IW * PS, IH * PS);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(K.cyan, .06); ctx.beginPath(); ctx.arc(lx, ly, LR, 0, 7); ctx.fill(); ctx.restore();
    // crosshair
    ctx.strokeStyle = rgba(K.cyan, .55); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx - LR + 16, ly); ctx.lineTo(lx - 12, ly); ctx.moveTo(lx + 12, ly); ctx.lineTo(lx + LR - 16, ly); ctx.moveTo(lx, ly - LR + 16); ctx.lineTo(lx, ly - 12); ctx.moveTo(lx, ly + 12); ctx.lineTo(lx, ly + LR - 16); ctx.stroke();
    // lens glass + rim
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(lx - LR * .4, ly - LR * .45, 0, lx - LR * .4, ly - LR * .45, LR * 1.1); lg.addColorStop(0, 'rgba(220,240,255,.22)'); lg.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, LR, 0, 7); ctx.fill(); ctx.restore();
    // handle toward the examiner's hand
    const ha = .72, hx0 = lx + Math.cos(ha) * LR, hy0 = ly + Math.sin(ha) * LR, hx1 = lx + Math.cos(ha) * (LR + 78), hy1 = ly + Math.sin(ha) * (LR + 78);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#0c0f14'; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx1, hy1); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,200,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx0 - 5, hy0 - 6); ctx.lineTo(hx1 - 5, hy1 - 6); ctx.stroke();
    ctx.strokeStyle = '#1b2029'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(lx, ly, LR, 0, 7); ctx.stroke();
    ctx.strokeStyle = rgba(K.cyan, .8); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(lx, ly, LR - 7, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly, LR - 1, 3.5, 4.6); ctx.stroke();
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 + t * .8; ctx.strokeStyle = rgba(K.cyan, k % 6 ? .35 : .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + Math.cos(a) * (LR - 14), ly + Math.sin(a) * (LR - 14)); ctx.lineTo(lx + Math.cos(a) * (LR - (k % 6 ? 19 : 24)), ly + Math.sin(a) * (LR - (k % 6 ? 19 : 24))); ctx.stroke(); }
    ctx.restore();
  }
  // tags next to each checked item
  if (backVis) T0.forEach(([px, py], i) => {
    const p = P(t, tc[i] + .02, tc[i] + .22, E.outBack) * (1 - P(t, tD - .1, tD + .1));
    if (p <= 0) return;
    const side = i === 1 ? -1 : 1, tx = px + side * (LR + 70), ty = py - 46;
    ctx.save(); ctx.translate(tx, ty); ctx.scale(p, p); label(ctx, TGT_NAME[i], 0, 0, { size: 26, color: '#dfffe9', bg: 'rgba(4,18,10,.88)', border: rgba(GREEN, .8), padX: 14, padY: 8 }); ctx.restore();
  });

  // ---- examiner (right, faces left), near arm by IK ----
  const u = EX.h / 8, shW = 1.12 * u;
  const lean = .045 * P(t, tB - .5, tB - .2) * (1 - P(t, tc[2] + .1, tc[2] + .5)) + .03 * P(t, tR - .3, tR - .1) * (1 - P(t, tG1, tG1 + .3)) - .025 * imp + .006 * Math.sin(t * 1.7);
  const rootL = [shW * .9, -6.7 * u + .1 * u];
  const toLocal = (X, Y) => { const lx0 = -(X - EX.x), ly0 = Y - EX.y, c = Math.cos(-lean), s = Math.sin(-lean); return [lx0 * c - ly0 * s, lx0 * s + ly0 * c]; };
  const rest = [rootL[0] + 50, rootL[1] + 300];
  const edgeR = [card.xs[card.N] - 4, PC.y + 30];
  const wGrip1 = P(t, tF0 - .32, tF0 - .04, E.inOutQ) * (1 - P(t, tF0 + .12, tF0 + .24, E.inOutQ));
  const wLoupe = P(t, tc[0] - .24, tc[0] - .06, E.inOutQ) * (1 - P(t, tc[2] + .14, tc[2] + .5, E.inOutQ));
  const wGrip2 = P(t, tG0 - .26, tG0 - .02, E.inOutQ) * (1 - P(t, tG0 + .13, tG0 + .4, E.inOutQ));
  const handLoupe = [lx + Math.cos(.72) * (LR + 70), ly + Math.sin(.72) * (LR + 70)];
  let tgt = rest;
  const blendTo = (w, X, Y) => { if (w <= 0) return; const q = toLocal(X, Y); tgt = [lerp(tgt[0], q[0], w), lerp(tgt[1], q[1], w)]; };
  blendTo(wGrip1, edgeR[0], edgeR[1]); blendTo(wLoupe, handLoupe[0], handLoupe[1]); blendTo(wGrip2, edgeR[0], edgeR[1]);
  const armR = ik(rootL, tgt, 1.45 * u, 1.35 * u);
  const glint = imp * .5;
  const fo = { flip: true, face: 1, coat: true, glasses: true, glint, lean, armR, armL: [-.12 + .02 * Math.sin(t * 1.7), .2], headTurn: -.4 * P(t, tE - .2, tE + .4) * (1 - P(t, d - .8, d)), shadow: false };
  ctx.restore();   // leave mid layer (examiner drawn in its own pass for rim)
  ctx.save(); layer(1);
  F.figure(ctx, EX.x - 6, EX.y - 3, EX.h, Object.assign({}, fo, { fill: rgba('#7fd0ff', .55 + .35 * imp), glint: 0 }));
  F.figure(ctx, EX.x, EX.y, EX.h, fo);
  ctx.restore();

  // ---- foreground (out of focus, faster parallax) ----
  ctx.save(); layer(1.35); ctx.globalAlpha = .9; ctx.drawImage(V.fg, -330, 560, 420, 1500); ctx.restore();

  // motes in the copy light
  ctx.save(); layer(.95); motes(ctx, t, { n: 46, color: '#cfe6ff', a: .35, seed: 31, area: [PC.x - 360, 260, 720, 1000], size: 2.6, speed: 14 }); ctx.restore();

  // anticipation dim, then the verdict light
  if (dim > 0) { const [px, py] = toS(PC.x, PC.y); darkness(ctx, px, py, 760, dim, .3); }
  const [pX, pY] = toS(PC.x, PC.y), pW = IW * PS * z, pH = IH * PS * z;

  // gold brackets lock on before the stamp
  const br = P(t, tR - .12, tR + .14);
  if (br > 0) brackets(ctx, pX - pW / 2 - 18, pY - pH / 2 - 18, pW + 36, pH + 36, br, K.goldHi, 50, 6);

  // ---- comparison lines (대조한) from the checklist rows into the canvas ----
  const PANY = 1146, ROW = [PANY - 32, PANY + 32], ICX = 178;
  const cmp = P(t, tD - .06, tR + .02), cmpOut = P(t, tR + .02, tR + .3);
  if (cmp > 0 && cmpOut < 1) {
    ROW.forEach((ry, i) => {
      const p0 = [ICX + 40, ry - 8], p3 = [pX + (i ? 60 : -60), pY + 40], p1 = [p0[0] + 40, ry - 200], p2 = [p3[0] + (i ? 120 : -160), p3[1] + 160];
      const pts = []; for (let k = 0; k <= 40; k++) pts.push(bez(p0, p1, p2, p3, k / 40));
      const pr = E.inOutQ(clamp(cmp * 1.25 - i * .25));
      ctx.save(); ctx.globalAlpha *= 1 - cmpOut;
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 120;
      const col = i ? '#ff8a8a' : K.cyan;
      const head = pathReveal(ctx, pts, pr, { color: col, w: 4, glowC: col, head: true });
      ctx.restore();
    });
    const cv = P(t, tR - .12, tR + .1);
    if (cv > 0) glow(ctx, pX, pY + 40, 260 * cv, K.goldHi, .6 * (1 - cmpOut));
  }

  // ---- stamp ----
  const SPx = PC.x + 150, SPy = PC.y + 168, sd = P(t, tImp - .17, tImp, E.inQ);
  if (t >= tImp - .17) {
    const [qx, qy] = toS(SPx, SPy), s0 = .62 * z;
    if (t < tImp) {
      const a = clamp(sd * 2.2);
      softRect(ctx, qx - 110 * z + 20, qy - 100 * z + 30, 220 * z, 200 * z, .5 * sd);
      for (let k = 2; k >= 0; k--) { // motion ghosts
        const sk = lerp(2.4, 1, clamp(sd - k * .12));
        ctx.save(); ctx.globalAlpha = a * (k ? .18 : .95); ctx.translate(qx, qy - (1 - clamp(sd - k * .12)) * 140); ctx.rotate(-.2 - (1 - sd) * .4); ctx.scale(s0 * sk, s0 * sk); ctx.drawImage(V.stampS, -180, -180); ctx.restore();
      }
    } else {
      const k = t - tImp, bounce = 1 - .06 * Math.sin(Math.min(1, k / .16) * Math.PI) * Math.exp(-k * 4);
      const wob = .03 * Math.sin(k * 18) * Math.exp(-k * 6);
      // shockwaves
      for (let i = 0; i < 2; i++) { const q = clamp((k - i * .07) / .55); if (q > 0 && q < 1) { ctx.save(); ctx.strokeStyle = rgba(i ? K.goldHi : '#ff6a70', (1 - q) * .8); ctx.lineWidth = 10 * (1 - q) + 1; ctx.beginPath(); ctx.arc(qx, qy, (110 + q * 360) * z, 0, 7); ctx.stroke(); ctx.restore(); } }
      softRect(ctx, qx - 110 * z + 10, qy - 100 * z + 14, 220 * z, 200 * z, .55);
      ctx.save(); ctx.translate(qx, qy); ctx.rotate(-.2 + wob); ctx.scale(s0 * bounce, s0 * bounce); ctx.drawImage(V.stampS, -180, -180); ctx.restore();
      // gold burst
      if (k < 1.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 46; i++) {
          const a = hash(i * 13 + 5) * 6.283, sp = 260 + hash(i * 7 + 2) * 620, kk = E.outC(clamp(k / 1.1)), r = 70 + kk * sp;
          const px = qx + Math.cos(a) * r * z, py = qy + Math.sin(a) * r * z + kk * kk * 120;
          ctx.fillStyle = `rgba(255,${200 + hash(i) * 50},${110 + hash(i * 3) * 60},${(1 - kk) * .9})`; ctx.beginPath(); ctx.arc(px, py, (2 + hash(i * 3) * 4) * (1 - kk * .5), 0, 7); ctx.fill();
        }
        ctx.restore();
      }
      if (k < 1.2) glow(ctx, pX, pY, 620, K.goldHi, .3 * Math.exp(-k * 3.5));
    }
  }
  // slow gold glint sweeps across the canvas after the verdict
  for (const g0 of [tImp + .35, tI - .05]) {
    const gl = P(t, g0, g0 + .7);
    if (gl > 0 && gl < 1 && card.front) {
      ctx.save(); ctx.beginPath(); ctx.rect(pX - pW / 2, pY - pH / 2, pW, pH); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      ctx.translate(lerp(pX - pW, pX + pW, E.inOutQ(gl)), pY); ctx.rotate(.38);
      const gg = ctx.createLinearGradient(-70, 0, 70, 0); gg.addColorStop(0, 'rgba(246,215,127,0)'); gg.addColorStop(.5, 'rgba(255,236,170,.4)'); gg.addColorStop(1, 'rgba(246,215,127,0)');
      ctx.fillStyle = gg; ctx.fillRect(-70, -900, 140, 1800); ctx.restore();
    }
  }

  // ---- film flying into checklist row 1 ----
  const icon1 = [ICX, ROW[0]], IWs = 42, IHs = 49;
  if (filmFly > 0) {
    const e = filmFly;
    const fx = lerp(pX, icon1[0], e), fy = lerp(pY, icon1[1], e) - Math.sin(e * Math.PI) * 120, fw = lerp(pW, IWs, e), fh = lerp(pH, IHs, e);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(e * Math.PI) * -.25); ctx.globalAlpha = lerp(.8, 1, e);
    if (e < 1) { ctx.shadowColor = rgba(K.cyan, .6); ctx.shadowBlur = 30; }
    ctx.drawImage(V.film, -fw / 2, -fh / 2, fw, fh); ctx.restore();
  }

  // ---- checklist panel (screen space) ----
  const panIn = P(t, tX + .15, tX + .45, E.outC), panOut = P(t, tE - .14, tE + .12, E.inQ);
  if (panIn > 0 && panOut < 1) {
    const a = panIn * (1 - panOut), oy = (1 - panIn) * 60 + panOut * 50;
    ctx.save(); ctx.translate(0, oy);
    const verdictGlow = P(t, tImp, tImp + .2) * (1 - P(t, tImp + .6, tImp + 1.2));
    glassPanel(ctx, 110, PANY - 70, 860, 140, a, verdictGlow > 0 ? rgba(K.goldHi, .35 + .5 * verdictGlow) : 'rgba(160,210,255,.32)');
    // row 1
    const r1 = typeSub('1996년 X선·적외선 기록과 대조', P(t, tX + .3, tB - .1));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = rgba(K.cyan, .5); ctx.lineWidth = 2; ctx.strokeRect(ICX - IWs / 2 - 4, ROW[0] - IHs / 2 - 4, IWs + 8, IHs + 8);
    if (filmFly >= 1) ctx.drawImage(V.film, ICX - IWs / 2, ROW[0] - IHs / 2, IWs, IHs);
    text(ctx, r1, ICX + 44, ROW[0], { size: 32, weight: 800, color: '#e6f4ff', align: 'left' });
    // row 2 icon: a mini wax seal
    const r2a = P(t, tB, tB + .3);
    if (r2a > 0) {
      ctx.save(); ctx.globalAlpha *= r2a; ctx.translate(ICX, ROW[1]);
      const rg = ctx.createRadialGradient(-6, -6, 2, 0, 0, 22); rg.addColorStop(0, '#e2454c'); rg.addColorStop(1, '#6e0d12'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,190,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke(); ctx.restore();
      text(ctx, typeSub('뒷면 도장 · 밀랍 봉인 · 라벨', P(t, tB + .02, tB + .3)), ICX + 44, ROW[1], { size: 32, weight: 800, color: '#e6f4ff', align: 'left' });
      tc.forEach((tt, i) => { const on = P(t, tt - .02, tt + .08); ctx.fillStyle = on > 0 ? rgba(GREEN, .4 + .6 * on) : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(800 + i * 26, ROW[1], 7 + 3 * tri(t, tt - .02, tt + .2), 0, 7); ctx.fill(); });
    }
    ctx.restore();
    checkMark(ctx, 920, ROW[0], 21, P(t, tB + .04, tB + .3), GREEN, a);
    checkMark(ctx, 920, ROW[1], 21, P(t, tc[2] + .1, tc[2] + .36), GREEN, a);
    // gold sweep across both rows when the comparison converges
    const sw = P(t, tD - .02, tD + .5);
    if (sw > 0 && sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); roundRect(ctx, 110, PANY - 70, 860, 140, 16); ctx.clip(); const gx = lerp(60, 1020, E.inOutQ(sw)); const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0); g.addColorStop(0, 'rgba(246,215,127,0)'); g.addColorStop(.5, `rgba(246,215,127,${.3 * a})`); g.addColorStop(1, 'rgba(246,215,127,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 90, PANY - 70, 180, 140); ctx.restore(); }
    ctx.restore();
  }

  // ---- verdict chip (approved label) ----
  const cp = P(t, tImp + .1, tImp + .4, E.outBack);
  if (cp > 0) {
    ctx.save(); ctx.translate(540, lerp(470, 490, clamp(cp))); ctx.scale(lerp(.85, 1, clamp(cp)), lerp(.85, 1, clamp(cp)));
    label(ctx, '2020.1.17 검찰 발표 · 진품', 0, 0, { size: 33, color: '#fff2c9', bg: 'rgba(40,4,8,.88)', border: rgba(K.red, .95), a: clamp(cp), padX: 22, padY: 11 });
    ctx.restore();
  }

  // ---- value panel ----
  const vIn = P(t, tE - .05, tE + .3, E.outExpo);
  if (vIn > 0) {
    const wv = 840 * vIn, X0 = 540 - wv / 2, Y0 = PANY - 66, HV = 132;
    glassPanel(ctx, X0, Y0, wv, HV, clamp(vIn * 2), rgba(K.goldHi, .55));
    // gold hairlines extending from the centre
    ctx.save(); ctx.strokeStyle = rgba(K.goldHi, .8 * vIn); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540 - wv / 2 + 20, Y0 + HV + 10); ctx.lineTo(540 + wv / 2 - 20, Y0 + HV + 10); ctx.stroke(); ctx.restore();
    // tab
    const tb = P(t, tE + .05, tE + .3, E.outBack);
    if (tb > 0) { ctx.save(); ctx.translate(196, Y0 - 4); ctx.scale(tb, tb); label(ctx, '추정가', 0, 0, { size: 28, color: '#1a1206', bg: K.goldHi, a: clamp(tb), padX: 16, padY: 7, weight: 900 }); ctx.restore(); }
    const mn = P(t, tMin - .04, tMin + .2, E.outBack);
    if (mn > 0) { ctx.save(); ctx.translate(300, Y0 - 4); ctx.scale(mn, mn); label(ctx, '최소', 0, 0, { size: 28, color: K.goldHi, bg: 'rgba(30,20,4,.92)', border: K.goldHi, a: clamp(mn), padX: 16, padY: 7, weight: 900 }); ctx.restore();
      if (mn < 1) glow(ctx, 300, Y0 - 4, 90, K.goldHi, .5 * (1 - mn)); }
    if (vIn > .6) {
      const size = 80, cw = size * .66, ch = size * 1.24, gap = size * .07, sepW = size * .3;
      const cells = '€60,000,000'.split('');
      let tw = 0; cells.forEach(cc => { tw += (cc === ',' ? sepW : cw) + gap; }); tw -= gap; tw += cw * .9 + gap;   // room for '+'
      let x = 540 - tw / 2; const y = Y0 + HV / 2;
      let dk = 0;
      ctx.save(); ctx.globalAlpha *= clamp((vIn - .6) * 3);
      cells.forEach((cc, i) => {
        if (cc === ',') { text(ctx, ',', x + sepW / 2, y + size * .3, { size: size * .9, family: FONT.disp, weight: 400, color: t > lockT(Math.max(0, dk - 1)) ? K.goldHi : '#5b6272' }); x += sepW + gap; return; }
        if (cc === '€') {
          const pu = 1 + .18 * tri(t, tU - .05, tU + .3);
          ctx.save(); ctx.translate(x + cw / 2, y); ctx.scale(pu, pu); ctx.translate(-(x + cw / 2), -y);
          digitCell(ctx, x + cw / 2, y, cw, ch, '€', null, P(t, tE + .25, tE + .4), size * .9, K.goldHi); ctx.restore();
          if (tri(t, tU - .05, tU + .35) > 0) glow(ctx, x + cw / 2, y, 110, K.goldHi, .5 * tri(t, tU - .05, tU + .35));
          x += cw + gap; return;
        }
        const lt = lockT(dk++), rolling = t < lt;
        const roll = rolling ? (t - tE) * (11 + hash(i * 5) * 7) * P(t, tE + .2, tE + .6) + hash(i * 17) * 10 : null;
        digitCell(ctx, x + cw / 2, y, cw, ch, cc, roll, P(t, lt, lt + .12), size, K.goldHi);
        x += cw + gap;
      });
      // '+' pops on the tick
      const pp = P(t, tI - .04, tI + .18, E.outBack);
      if (pp > 0) { ctx.save(); ctx.translate(x + cw * .45, y); ctx.scale(pp * 1.0, pp * 1.0); text(ctx, '+', 0, 4, { size: size * 1.05, family: FONT.disp, weight: 400, color: K.goldHi, shadow: { color: 'rgba(255,200,90,.8)', blur: 26, y: 0 } }); ctx.restore(); glow(ctx, x + cw * .45, y, 120, K.goldHi, .6 * (1 - P(t, tI + .1, tI + .6))); }
      // glint across the digits
      const gl = P(t, tI - .02, tI + .5);
      if (gl > 0 && gl < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.rect(X0, Y0, wv, HV); ctx.clip(); ctx.translate(lerp(X0 - 100, X0 + wv + 100, E.inOutQ(gl)), y); ctx.rotate(.4); const gg = ctx.createLinearGradient(-50, 0, 50, 0); gg.addColorStop(0, 'rgba(255,236,170,0)'); gg.addColorStop(.5, 'rgba(255,236,170,.5)'); gg.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gg; ctx.fillRect(-50, -200, 100, 400); ctx.restore(); }
      ctx.restore();
      // rising gold motes from the panel
      motes(ctx, t, { n: 22, color: '#ffd98a', a: .45 * P(t, tM, tM + .5), seed: 44, area: [X0, Y0 - 160, wv, 200], size: 2.6, speed: 40 });
    }
    // approved range sub-label
    const sl = P(t, tU - .05, tU + .25);
    if (sl > 0) text(ctx, '미술관 추정 6천만~1억 유로', 540, Y0 + HV + 38, { size: 28, weight: 700, color: '#d9cfae', alpha: sl, shadow: { color: 'rgba(0,0,0,.8)', blur: 10, y: 2 } });
  }

  // flash on impact
  flash(ctx, .16 * Math.exp(-Math.max(0, t - tImp) * 18) * (t >= tImp ? 1 : 0), '#ffe2b0');
};
})();
