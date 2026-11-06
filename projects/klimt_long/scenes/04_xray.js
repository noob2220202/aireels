// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "엑스레이를 찍자 물감 밑에 모자 쓴 그 여인이 있었다, 한 캔버스에 두 점의 클림트."
// Beats (all anchored to narration words):
//  0.00  close on the painting (continues y1996's push) → camera pulls back into a dark X-ray lab
//  엑스레이를  the articulated X-ray head swings in and aims; ready LED blinks; technician holds the hand switch
//  (charge)   aperture gathers light
//  찍자        thumb press → exposure flash, cyan beam, glasses glint, small shake
//  물감 밑에    scan line sweeps the canvas, turning it into a radiograph; HUD brackets + ruler track it
//  모자        lock-on box jumps to the head, hidden hat outline draws itself and fills (shimmer)
//  쓴 그       scarf outline draws
//  여인이 있었다 same-face gold lock + approved chip "X선·적외선: 모자·스카프 쓴 같은 여인"
//  한          gold sweep restores the top paint while the canvas turns to 3/4
//  캔버스에     the paint layer splits off the canvas (exploded view, thunk)
//  두 / 점의    badges 1 / 2 pop on the two layers
//  클림트       glint over both layers + approved card "알려진 유일한 '두 겹의 클림트'"
//  end         the layers snap back into one canvas, framed exactly where vanish's painting opens (match cut)
// ---------------------------------------------------------------------------

let X = null;
const CX = 540, CY = 840, CS = .8;                       // canvas (600x700 texture) world centre + scale
const CW = 600 * CS, CH = 700 * CS;
const BX0 = -180, BY0 = -240, BW = 1440, BH = 2320;        // lab backdrop sprite world rect
const FLOOR = 1400;
const FACE = [[250, 214], [236, 250], [234, 270], [230, 300], [236, 338], [250, 370], [270, 390], [300, 396], [348, 370], [368, 328], [404, 250], [372, 180], [318, 166]];
const TECH = { x: 66, y: 1590, h: 800 };                   // technician (foreground layer)

// ---------- small utils ----------
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
function hatPath(x) {
  x.beginPath(); x.ellipse(300, 214, 190, 46, -.08, 0, 7);
  x.moveTo(212, 212); x.bezierCurveTo(210, 136, 252, 100, 314, 98); x.bezierCurveTo(376, 98, 400, 136, 396, 202); x.closePath();
}
function scarfPath(x) {
  x.beginPath(); x.moveTo(246, 392); x.bezierCurveTo(300, 424, 384, 426, 424, 396); x.bezierCurveTo(446, 470, 440, 540, 426, 600); x.bezierCurveTo(380, 560, 300, 540, 250, 470); x.closePath();
}

// ---------- sprites (built once) ----------
function makeLab() {
  const [c, x] = mk(BW, BH); x.translate(-BX0, -BY0); const R = rng(404);
  // lead-lined back wall
  let g = x.createLinearGradient(0, BY0, 0, FLOOR); g.addColorStop(0, '#060a13'); g.addColorStop(.45, '#0c1526'); g.addColorStop(1, '#080d17');
  x.fillStyle = g; x.fillRect(BX0, BY0, BW, FLOOR - BY0);
  for (let px = BX0; px < BX0 + BW; px += 210) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, BY0, 4, FLOOR - BY0); x.fillStyle = 'rgba(140,190,255,.035)'; x.fillRect(px + 4, BY0, 2, FLOOR - BY0); }
  for (let py = 160; py < FLOOR; py += 300) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(BX0, py, BW, 3); }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '180,210,255' : '0,0,0'},${R() * .035})`; x.fillRect(BX0 + R() * BW, BY0 + R() * (FLOOR - BY0), 2, 2); }
  // film viewers with radiograph sheets (become soft bokeh after the blur pass)
  const viewer = (vx, vy, vw, vh, seed) => {
    const r2 = rng(seed);
    x.save(); x.shadowColor = 'rgba(150,210,255,.5)'; x.shadowBlur = 60; x.fillStyle = '#9fc7e6'; x.fillRect(vx, vy, vw, vh); x.restore();
    x.fillStyle = '#c9e2f5'; x.fillRect(vx + 6, vy + 6, vw - 12, vh - 12);
    const n = Math.max(1, Math.round(vw / 150));
    for (let k = 0; k < n; k++) {
      const fw = (vw - 24) / n - 10, fx = vx + 12 + k * (fw + 10), fy = vy + 14, fh = vh - 28;
      const fg = x.createLinearGradient(fx, fy, fx + fw, fy + fh); fg.addColorStop(0, '#1d2c3c'); fg.addColorStop(1, '#0d1824');
      x.fillStyle = fg; x.fillRect(fx, fy, fw, fh);
      for (let j = 0; j < 7; j++) { const bx = fx + r2() * fw, by = fy + r2() * fh, br = 14 + r2() * 40; const rg = x.createRadialGradient(bx, by, 0, bx, by, br); rg.addColorStop(0, 'rgba(190,225,250,.45)'); rg.addColorStop(1, 'rgba(190,225,250,0)'); x.fillStyle = rg; x.fillRect(bx - br, by - br, br * 2, br * 2); }
      x.fillStyle = '#3a4048'; x.fillRect(fx + fw / 2 - 12, fy - 10, 24, 12);
    }
  };
  viewer(-150, 470, 330, 250, 7);
  viewer(930, 520, 300, 230, 8);
  viewer(-120, 790, 220, 170, 9);
  // shelving (right) and cabinet (left)
  x.fillStyle = '#05080e';
  for (const sy of [930, 1080, 1230]) x.fillRect(900, sy, 360, 12);
  x.fillRect(910, 900, 12, 500); x.fillRect(1240, 900, 12, 500);
  for (let i = 0; i < 14; i++) { const bx = 930 + R() * 290, sy = [930, 1080, 1230][i % 3], bw = 26 + R() * 60, bh = 30 + R() * 80; x.fillStyle = `rgb(${8 + R() * 8},${11 + R() * 10},${18 + R() * 12})`; x.fillRect(bx, sy - bh, bw, bh); }
  x.fillRect(-160, 1000, 240, 400);
  x.fillStyle = 'rgba(140,190,255,.06)'; x.fillRect(-160, 1000, 240, 3);
  // floor
  g = x.createLinearGradient(0, FLOOR, 0, BY0 + BH); g.addColorStop(0, '#0b111b'); g.addColorStop(1, '#030509'); x.fillStyle = g; x.fillRect(BX0, FLOOR, BW, BY0 + BH - FLOOR);
  x.fillStyle = 'rgba(140,190,255,.08)'; x.fillRect(BX0, FLOOR, BW, 2);
  x.strokeStyle = 'rgba(140,190,255,.035)'; x.lineWidth = 2;
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(540 + i * 80, FLOOR); x.lineTo(540 + i * 300, BY0 + BH); x.stroke(); }
  // floor cable from the emitter column
  x.strokeStyle = '#020306'; x.lineWidth = 9; x.beginPath(); x.moveTo(BX0 + BW, 1520); x.bezierCurveTo(1000, 1600, 820, 1460, 640, 1560); x.stroke();
  // cool pool of light behind the easel (baked; was a per-frame additive glow)
  { const rg = x.createRadialGradient(CX, CY - 40, 0, CX, CY - 40, 620); rg.addColorStop(0, 'rgba(61,110,168,.26)'); rg.addColorStop(.4, 'rgba(61,110,168,.09)'); rg.addColorStop(1, 'rgba(61,110,168,0)');
    x.globalCompositeOperation = 'lighter'; x.fillStyle = rg; x.fillRect(CX - 620, CY - 660, 1240, 1240); x.globalCompositeOperation = 'source-over'; }
  // depth-of-field: the whole backdrop is soft
  const [c2, x2] = mk(BW, BH); x2.filter = 'blur(3px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  return c2;
}
function makeXR() { // radiograph look of the visible portrait (dense lead white = bright)
  const [c, x] = mk(600, 700);
  x.filter = 'grayscale(1) contrast(1.55) brightness(.92) blur(.7px)'; x.drawImage(T.portrait, 0, 0); x.filter = 'none';
  x.globalCompositeOperation = 'multiply'; x.fillStyle = '#86d6ff'; x.fillRect(0, 0, 600, 700);
  x.globalCompositeOperation = 'lighter'; x.fillStyle = '#04121f'; x.fillRect(0, 0, 600, 700);
  x.globalCompositeOperation = 'source-over';
  const R = rng(17);
  for (let i = 0; i < 14000; i++) { x.fillStyle = `rgba(${R() < .5 ? '210,240,255' : '0,8,16'},${R() * .07})`; x.fillRect(R() * 600, R() * 700, 2, 2); }
  for (let y = 0; y < 700; y += 3) { x.fillStyle = 'rgba(0,10,20,.10)'; x.fillRect(0, y, 600, 1); }
  // canvas weave shows through on film
  x.strokeStyle = 'rgba(160,220,255,.035)'; x.lineWidth = 1; for (let i = 0; i < 700; i += 6) { x.beginPath(); x.moveTo(0, i); x.lineTo(600, i); x.stroke(); } for (let i = 0; i < 600; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 700); x.stroke(); }
  const v = x.createRadialGradient(300, 350, 180, 300, 350, 520); v.addColorStop(0, 'rgba(0,8,16,0)'); v.addColorStop(1, 'rgba(0,8,16,.6)'); x.fillStyle = v; x.fillRect(0, 0, 600, 700);
  return c;
}
function makeHidden() { // the older painting under the paint: hat + scarf as radio-dense underpaint (screen/lighter)
  const [c, x] = mk(600, 700); const R = rng(23);
  x.save(); hatPath(x); x.clip();
  let g = x.createRadialGradient(300, 170, 20, 300, 200, 230); g.addColorStop(0, 'rgba(200,240,255,.62)'); g.addColorStop(1, 'rgba(120,200,240,.30)'); x.fillStyle = g; x.fillRect(80, 60, 440, 220);
  x.lineCap = 'round';
  for (let i = 0; i < 420; i++) { const a = -.08 + (R() - .5) * .5, X0 = 100 + R() * 400, Y0 = 90 + R() * 170, l = 16 + R() * 40; x.strokeStyle = `rgba(${R() < .6 ? '225,248,255' : '20,60,90'},${.06 + R() * .16})`; x.lineWidth = 3 + R() * 6; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0 + Math.cos(a) * l, Y0 + Math.sin(a) * l); x.stroke(); }
  x.restore();
  x.save(); scarfPath(x); x.clip();
  g = x.createLinearGradient(250, 392, 430, 600); g.addColorStop(0, 'rgba(190,235,255,.5)'); g.addColorStop(1, 'rgba(120,200,240,.22)'); x.fillStyle = g; x.fillRect(240, 380, 220, 230);
  for (let i = 0; i < 200; i++) { const a = 1.2 + (R() - .5) * .6, X0 = 250 + R() * 190, Y0 = 395 + R() * 200, l = 14 + R() * 34; x.strokeStyle = `rgba(${R() < .6 ? '225,248,255' : '20,60,90'},${.05 + R() * .14})`; x.lineWidth = 3 + R() * 5; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0 + Math.cos(a) * l, Y0 + Math.sin(a) * l); x.stroke(); }
  x.restore();
  const [c2, x2] = mk(600, 700); x2.filter = 'blur(1.6px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  return c2;
}
function makeRays(spread, len, color, a, n, seed) { // pre-rendered additive light shafts (half-res), origin = top centre, pointing down
  const k = .5, w = Math.ceil(2 * len * Math.sin(spread / 2 + .14) * k) + 4, h = Math.ceil(len * k);
  const [c, x] = mk(w, h); x.globalCompositeOperation = 'lighter'; x.scale(k, k); const ox = w / k / 2;
  for (let i = 0; i < n; i++) {
    const q = i / (n - 1) - .5, aa = Math.PI / 2 + q * spread, ww = spread / n * (.6 + .5 * hash(i * 13 + seed)), al = a * (.3 + .7 * hash(i * 7 + seed));
    const g = x.createLinearGradient(ox, 0, ox + Math.cos(aa) * len, Math.sin(aa) * len); g.addColorStop(0, rgba(color, al)); g.addColorStop(1, rgba(color, 0)); x.fillStyle = g;
    x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox + Math.cos(aa - ww) * len, Math.sin(aa - ww) * len); x.lineTo(ox + Math.cos(aa + ww) * len, Math.sin(aa + ww) * len); x.closePath(); x.fill();
  }
  return { c, w: w / k, h: h / k };
}
function drawRays(ctx, R, x, y, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a; ctx.drawImage(R.c, x - R.w / 2, y, R.w, R.h); ctx.restore(); }
function makeSoft() { const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; x.fillRect(52, 52, 152, 152); x.filter = 'none'; return c; }
function initX() {
  X = { lab: makeLab(), xr: makeXR(), hid: makeHidden(), soft: makeSoft(), rays: [makeRays(.42, 1500, '#9cc8f0', .9, 7, 3), makeRays(.42, 1500, '#9cc8f0', .9, 7, 11)] };
  const [c, x] = mk(600, 700); x.drawImage(X.xr, 0, 0); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .9; x.drawImage(X.hid, 0, 0); X.xrFull = c; // radiograph with the hidden layer fully revealed
}

// ---------- drawing pieces (texture space: origin = canvas centre, 600x700 units) ----------
function softRect(ctx, x, y, w, h, a) { const k = 52, sx = w / 152, sy = h / 152; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(X.soft, x - k * sx, y - k * sy, 256 * sx, 256 * sy); ctx.restore(); }
function revealStroke(ctx, path, p, len, color, w) {
  if (p <= 0) return;
  ctx.save(); ctx.setLineDash([len * clamp(p) + .01, 4000]); ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(color, .22); ctx.lineWidth = w * 3.2; path(ctx); ctx.stroke();
  ctx.strokeStyle = rgba('#e8fbff', .95); ctx.lineWidth = w; path(ctx); ctx.stroke();
  ctx.restore();
}
const brimP = x => { x.beginPath(); x.ellipse(300, 214, 186, 45, -.08, -Math.PI * .98, Math.PI * 1.02); };
const crownP = x => { x.beginPath(); x.moveTo(214, 212); x.bezierCurveTo(212, 140, 250, 108, 312, 106); x.bezierCurveTo(372, 106, 396, 140, 392, 200); };
const bandP = x => { x.beginPath(); x.moveTo(222, 186); x.quadraticCurveTo(300, 170, 388, 180); };
const scarf1 = x => { x.beginPath(); x.moveTo(248, 392); x.bezierCurveTo(300, 418, 380, 420, 420, 396); };
const scarf2 = x => { x.beginPath(); x.moveTo(256, 404); x.bezierCurveTo(268, 470, 300, 520, 330, 560); };
const scarf3 = x => { x.beginPath(); x.moveTo(402, 410); x.bezierCurveTo(430, 470, 440, 520, 430, 590); };
function hiddenOverlay(ctx, t, s) { // s: {hatFill, hatDraw, scarf, full}
  ctx.save(); ctx.translate(-300, -350);
  if (s.hatFill < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .16 + .74 * s.hatFill; ctx.drawImage(X.hid, 0, 0); ctx.restore(); }
  revealStroke(ctx, brimP, s.hatDraw * 1.25, 860, K.cyan, 4.5);
  revealStroke(ctx, crownP, s.hatDraw * 1.4 - .25, 320, K.cyan, 4.5);
  revealStroke(ctx, bandP, s.hatDraw * 1.6 - .55, 170, K.cyan, 3);
  revealStroke(ctx, scarf1, s.scarf * 1.3, 190, K.cyan, 3.6);
  revealStroke(ctx, scarf2, s.scarf * 1.3 - .2, 180, K.cyan, 3.6);
  revealStroke(ctx, scarf3, s.scarf * 1.3 - .3, 190, K.cyan, 3.6);
  if (s.spark > 0) { // light pulse travelling around the revealed brim
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const onBrim = a => [300 + Math.cos(a) * 186 * Math.cos(-.08) - Math.sin(a) * 45 * Math.sin(-.08), 214 + Math.cos(a) * 186 * Math.sin(-.08) + Math.sin(a) * 45 * Math.cos(-.08)];
    for (let k = 0; k < 7; k++) {
      const [px, py] = onBrim(t * 3.1 - k * .07);
      ctx.fillStyle = rgba(k ? K.cyan : '#ffffff', s.spark * (1 - k / 7) * .9); ctx.beginPath(); ctx.arc(px, py, (k ? 6 : 8) * (1 - k / 10), 0, 7); ctx.fill();
    }
    const [px, py] = onBrim(t * 3.1);
    const g = ctx.createRadialGradient(px, py, 0, px, py, 46); g.addColorStop(0, rgba(K.cyan, .45 * s.spark)); g.addColorStop(1, rgba(K.cyan, 0)); ctx.fillStyle = g; ctx.fillRect(px - 46, py - 46, 92, 92);
    ctx.restore();
  }
  ctx.restore();
}
function drawRadiograph(ctx, t, s) {
  ctx.drawImage(s.hatFill >= 1 ? X.xrFull : X.xr, -300, -350);
  hiddenOverlay(ctx, t, s);
}
function faceLock(ctx, t, p, a = 1) {
  if (p <= 0) return;
  const pts = FACE.map(([u, v]) => [u - 300, v - 350]);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  ctx.setLineDash([900 * clamp(p * 1.3), 4000]);
  ctx.strokeStyle = rgba(K.goldHi, .25); ctx.lineWidth = 12; ctx.beginPath(); smooth(ctx, pts); ctx.stroke();
  ctx.strokeStyle = rgba('#fff2c6', .95); ctx.lineWidth = 3.5; ctx.beginPath(); smooth(ctx, pts); ctx.stroke();
  ctx.setLineDash([]);
  const ep = E.outBack(P(p, .5, 1), 2);
  if (ep > 0) for (const [u, v, r] of [[293, 279, 20], [272, 362, 24]]) { ctx.strokeStyle = rgba(K.goldHi, .9); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(u - 300, v - 350, r * ep, 0, 7); ctx.stroke(); }
  const ring = P(p, .3, 1, E.outC);
  if (ring < 1) { ctx.strokeStyle = rgba(K.goldHi, (1 - ring) * .8); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(6, -50, 90 + 170 * ring, 115 + 200 * ring, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}
// x-ray head on an articulated arm; returns aperture position + direction
function emitter(ctx, t, aim, ex, charge, tX, tR) {
  const sw = E.outBack(P(t, tX - .35, tX + .55), 1.25), ret = E.inOutQ(P(t, tR, tR + .7));
  const base = [1175, 380];
  const hx = lerp(1060, 850, sw) + 120 * ret, hy = lerp(430, 606, sw) - 190 * ret + 4 * Math.sin(t * 1.3);
  const ang = Math.atan2(aim[1] - hy, aim[0] - hx);
  const el = [lerp(base[0], hx, .5) + 30, Math.min(base[1], hy) - 40 - 20 * sw];
  ctx.save(); ctx.lineCap = 'round';
  for (const [a0, a1, w] of [[base, el, 30], [el, [hx, hy], 24]]) {
    ctx.strokeStyle = '#05070b'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,205,255,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a0[0] - 2, a0[1] - w * .42); ctx.lineTo(a1[0] - 2, a1[1] - w * .42); ctx.stroke();
  }
  for (const [jx, jy, r] of [[...el, 24], [hx, hy, 20]]) { ctx.fillStyle = '#0b0f16'; ctx.beginPath(); ctx.arc(jx, jy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(150,205,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, r - 4, 3.6, 5.2); ctx.stroke(); }
  ctx.translate(hx, hy); ctx.rotate(ang);
  // housing (tube) + collimator box
  let g = ctx.createLinearGradient(0, -52, 0, 52); g.addColorStop(0, '#2b3442'); g.addColorStop(.35, '#141a24'); g.addColorStop(1, '#06080c');
  ctx.fillStyle = g; roundRect(ctx, -120, -50, 128, 100, 22); ctx.fill();
  ctx.strokeStyle = rgba('#bfe6ff', .45 + .4 * ex); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-104, -48); ctx.lineTo(-2, -48); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,180,240,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-104, 47); ctx.lineTo(-2, 47); ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-104 + k * 12, -30, 5, 60); }
  // radiation trefoil plate
  ctx.save(); ctx.translate(-42, 6); ctx.fillStyle = '#d8b21c'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.fillStyle = '#0b0b0b';
  for (let k = 0; k < 3; k++) { const a0 = -Math.PI / 2 + k * 2.094 - .52; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14, a0, a0 + 1.05); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#d8b21c'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); ctx.fill(); ctx.restore();
  g = ctx.createLinearGradient(0, -38, 0, 38); g.addColorStop(0, '#222a36'); g.addColorStop(1, '#07090d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(70, -30); ctx.lineTo(70, 30); ctx.lineTo(4, 40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#bfe6ff', .35 + .4 * ex); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(6, -40); ctx.lineTo(70, -30); ctx.stroke();
  ctx.fillStyle = '#0d1219'; ctx.fillRect(66, -32, 10, 64);
  // ready LED (amber blink) → cyan after exposure
  const ready = t < tX + .9 ? (Math.sin(t * 16) > 0 ? 1 : .25) : 1;
  ctx.fillStyle = ex > 0 || charge > .98 ? K.cyan : rgba('#ffb52e', .35 + .65 * ready); ctx.beginPath(); ctx.arc(-92, -24, 5, 0, 7); ctx.fill();
  // aperture
  const ap = clamp(.15 + charge * .7 + ex);
  const ag = ctx.createLinearGradient(70, 0, 80, 0); ag.addColorStop(0, rgba('#bff3ff', ap)); ag.addColorStop(1, rgba('#bff3ff', 0));
  ctx.fillStyle = ag; ctx.fillRect(74, -28, 10, 56);
  ctx.restore();
  const ax = hx + Math.cos(ang) * 80, ay = hy + Math.sin(ang) * 80;
  if (charge > 0 && ex <= 0) { // gathering rings
    for (let k = 0; k < 3; k++) { const q = ((charge * 2.2 + k / 3) % 1); ctx.save(); ctx.strokeStyle = rgba(K.cyan, q * .7 * charge); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax, ay, 90 * (1 - q) + 6, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  glow(ctx, ax, ay, 70 + 160 * ex + 50 * charge, K.cyan, .25 + .6 * Math.max(ex, charge * .6));
  return { ax, ay };
}
function beam(ctx, ax, ay, pts, a) { // additive light fan from the aperture onto a target polygon (pts = far edge, in order)
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let far = 0; for (const [x, y] of pts) far = Math.max(far, Math.hypot(x - ax, y - ay));
  const g = ctx.createRadialGradient(ax, ay, 10, ax, ay, far); g.addColorStop(0, rgba('#a8ecff', .5 * a)); g.addColorStop(.55, rgba('#a8ecff', .14 * a)); g.addColorStop(1, rgba('#a8ecff', .03 * a));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ax, ay); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.restore();
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
function badge(ctx, x, y, n, p, color) {
  if (p <= 0) return; const s = E.outBack(clamp(p), 2.4);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= clamp(p * 3);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.fillStyle = 'rgba(6,9,14,.92)'; ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); text(ctx, String(n), 0, 3, { size: 52, family: FONT.disp, weight: 400, color, alpha: clamp(p * 3) }); ctx.restore();
}

window.KL.scenes.xray = function (ctx, t, d, info) {
  if (!X) initX();
  const tX = at(info, '엑스레이를', .02), tC = at(info, '찍자', .15), tPa = at(info, '물감', .21), tM = at(info, '모자', .32), tW = at(info, '여인이', .46),
    tEx = at(info, '있었다', .52), tH = at(info, '한', .64), tCv = at(info, '캔버스에', .69), tTwo = at(info, '두', .8), tPt = at(info, '점의', .84), tK = at(info, '클림트', .88);
  const rjS = Math.max(tK + .26, d - .66), rjE = d - .26;

  // ---- timeline ----
  const charge = P(t, tC - .4, tC - .02, E.inQ) * (t < tC ? 1 : 0);
  const ex = t >= tC ? Math.exp(-(t - tC) * 7.5) : 0;
  const sp = P(t, tC + .08, tM + .04, E.inOutQ);                       // scan progress (radiograph wipes down)
  const st = { hatDraw: P(t, tM - .06, tM + .5, E.inOutQ), hatFill: P(t, tM + .12, tM + .7, E.outQ), scarf: P(t, tM + .3, tW + .12, E.inOutQ), spark: P(t, tM + .45, tM + .7) * (1 - P(t, tH - .3, tH)) };
  const face = P(t, tW - .06, tW + .45);
  const rs = P(t, tH - .1, tCv - .02, E.inOutQ);                        // gold sweep restores the paint layer
  const rj = P(t, rjS, rjE, E.inOutC);
  const rot = P(t, tH - .1, tCv + .22, E.inOutC) * (1 - rj);
  const sepRaw = P(t, tCv - .04, tCv + .45);
  const sep = E.outBack(sepRaw, 1.5) * (1 - rj);
  const hud = P(t, tC + .02, tC + .28) * (1 - P(t, tH - .2, tH + .08));

  // ---- camera ----
  // the face-lock push is capped (z ≈ 1.36) so the full canvas + HUD brackets stay inside y ≈ 465-1250 when the lock box re-expands
  const keys = [[-.5, 546, 826, 1.36], [0, 545, 836, 1.3], [tC - .02, 540, 905, 1.0], [tPa + .12, 540, 900, 1.05], [tM, 542, 893, 1.24], [tW - .05, 544, 911, 1.35],
    [tEx + .4, 545, 914, 1.365], [tCv + .06, 540, 952, .9], [tK - .1, 540, 958, .92], [rjS + .1, 540, 985, .975], [rjE + .04, 540, 1008, 1.0], [d + .6, 540, 1012, 1.0]];
  let [cx, cy, z] = camAt(keys, t);
  z *= 1 + .028 * tri(t, tCv - .03, tCv + .28) + .012 * tri(t, rjE - .08, rjE + .2);
  const dr = drift(t, .55, 5);
  const shk = ex * .9 + .35 * tri(t, tCv - .02, tCv + .2);
  dr.x += shk * noise1(t * 40, 3) * 9; dr.y += shk * noise1(t * 40, 4) * 9;
  const layer = (f) => { const zf = 1 + (z - 1) * f; ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (cx - 540) * f) - dr.x * f, -(960 + (cy - 960) * f) - dr.y * f); };
  const toS = (f, x, y) => { const zf = 1 + (z - 1) * f; return [W / 2 + (x - (540 + (cx - 540) * f) - dr.x * f) * zf, H / 2 + (y - (960 + (cy - 960) * f) - dr.y * f) * zf]; };

  const splitDim = Math.max(rot, clamp(sepRaw * 2)) * (1 - rj * .7);
  ctx.save();

  // ---- backdrop (soft, slower parallax) ----
  ctx.save(); layer(.82);
  ctx.drawImage(X.lab, BX0, BY0);
  ctx.restore();
  // overhead work light falling on the easel (two cached ray sets cross-fading = shimmer)
  const lk = .85 + .15 * fbm(t * 1.7, 2), rk = .5 + .5 * Math.sin(t * .9), ra = .06 * lk * (1 - .6 * Math.max(rot, sep));
  ctx.save(); layer(.92);
  drawRays(ctx, X.rays[0], CX - 20, 150, ra * rk); drawRays(ctx, X.rays[1], CX - 20, 150, ra * (1 - rk));
  ctx.restore();

  // ---- mid layer: easel, canvas layers, emitter ----
  ctx.save(); layer(1);
  // easel (behind the canvas)
  ctx.save(); ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [[CX, 470, CX, FLOOR + 30, 22], [CX - 6, 560, CX - 210, FLOOR + 40, 18], [CX + 6, 560, CX + 210, FLOOR + 40, 18]]) {
    ctx.strokeStyle = '#0b0906'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,180,240,.16)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + w * .4, y0); ctx.lineTo(x1 + w * .4, y1); ctx.stroke();
  }
  ctx.restore();
  // floor contact + light pool
  { const g = ctx.createRadialGradient(CX, FLOOR + 30, 10, CX, FLOOR + 30, 380); g.addColorStop(0, 'rgba(110,170,230,.16)'); g.addColorStop(1, 'rgba(110,170,230,0)'); ctx.save(); ctx.translate(CX, FLOOR + 30); ctx.scale(1, .16); ctx.translate(-CX, -FLOOR - 30); ctx.fillStyle = g; ctx.fillRect(CX - 380, FLOOR - 350, 760, 760); ctx.restore(); }

  // layer transforms (oblique 3/4 turn + depth split)
  const th = -.56 * rot, ca = Math.cos(th), sb = Math.sin(th) * .34;
  const fl1 = Math.sin(t * 2.3) * 7 * clamp(sep), fl2 = Math.sin(t * 2.3 + 1.7) * 7 * clamp(sep);
  const offB = [150 * sep, -98 * sep + fl1], offF = [-140 * sep, 88 * sep + fl2];
  const sB = CS * (1 - .05 * sep), sF = CS;
  const LT = (o, s) => [CX + o[0], CY + o[1], s];
  const [bxC, byC, bS] = LT(offB, sB), [fxC, fyC, fS] = LT(offF, sF);
  const map = (xc, yc, s, u, v) => [xc + u * ca * s, yc + (v + u * sb) * s];
  const applyL = (xc, yc, s) => { ctx.translate(xc, yc); ctx.transform(ca, sb, 0, 1, 0, 0); ctx.scale(s, s); };

  // canvas cast shadow on the easel/wall
  softRect(ctx, CX - CW / 2 + 22, CY - CH / 2 + 34, CW, CH, .75);
  // back layer: original canvas on its stretcher, carries the older painting (radiograph)
  ctx.save(); applyL(bxC, byC, bS);
  if (sep <= .002) { // only the stretcher rim shows around the paint: draw strips, not full fills
    ctx.fillStyle = '#4e3b27'; ctx.fillRect(-309, -359, 618, 9); ctx.fillRect(-309, 350, 618, 9); ctx.fillRect(-309, -350, 9, 700); ctx.fillRect(300, -350, 9, 700);
    ctx.fillStyle = '#b9ab8c'; ctx.fillRect(-304, -354, 608, 4); ctx.fillRect(-304, 350, 608, 4); ctx.fillRect(-304, -350, 4, 700); ctx.fillRect(300, -350, 4, 700);
  } else {
    ctx.fillStyle = '#4e3b27'; ctx.fillRect(-309, -359, 618, 718); ctx.fillStyle = '#b9ab8c'; ctx.fillRect(-304, -354, 608, 708);
    drawRadiograph(ctx, t, { hatDraw: 1, hatFill: 1, scarf: 1 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .5 * clamp(sep); ctx.drawImage(T.ghost, -300, -350); ctx.restore();
    ctx.strokeStyle = rgba(K.cyan, .8 * clamp(sep)); ctx.lineWidth = 3 / bS; ctx.strokeRect(-304, -354, 608, 708);
    // shadow of the paint layer falling on it
    ctx.save(); ctx.beginPath(); ctx.rect(-304, -354, 608, 708); ctx.clip();
    softRect(ctx, -300 + (offF[0] - offB[0]) * .35 / bS, -350 + (offF[1] - offB[1]) * .35 / bS, 600, 700, .55 * clamp(sep * 1.5));
    ctx.restore();
  }
  ctx.restore();
  // exploded-view guides between matching corners
  if (sep > .02) {
    ctx.save(); ctx.globalAlpha *= clamp(sep * 1.4); ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 50; ctx.lineWidth = 2.5;
    for (const [u, v] of [[-300, -350], [300, -350], [300, 350], [-300, 350]]) {
      const [x0, y0] = map(bxC, byC, bS, u, v), [x1, y1] = map(fxC, fyC, fS, u, v);
      const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgba(K.cyan, .8)); g.addColorStop(1, rgba(K.goldHi, .8));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = K.cyan; ctx.beginPath(); ctx.arc(x0, y0, 5, 0, 7); ctx.fill(); ctx.fillStyle = K.goldHi; ctx.beginPath(); ctx.arc(x1, y1, 5, 0, 7); ctx.fill(); ctx.setLineDash([10, 9]);
    }
    ctx.restore();
  }
  // front layer: the visible paint (+ radiograph overlay while scanning)
  const vBot = lerp(-372, 372, sp), vTop = lerp(-372, 372, rs);
  ctx.save(); applyL(fxC, fyC, fS);
  if (sep > .02) softRect(ctx, -300, -350 + 26 * sep, 600, 700, .7 * clamp(sep));
  if (!(vTop <= -350 && vBot >= 350)) ctx.drawImage(T.portrait, -300, -350);
  if (vBot > vTop) {
    ctx.save(); ctx.beginPath(); ctx.rect(-300, Math.max(-350, vTop), 600, Math.min(350, vBot) - Math.max(-350, vTop)); ctx.clip();
    drawRadiograph(ctx, t, st);
    ctx.restore();
  }
  // scan bar
  if (sp > 0 && sp < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createLinearGradient(0, vBot - 70, 0, vBot); g.addColorStop(0, 'rgba(95,227,255,0)'); g.addColorStop(1, 'rgba(95,227,255,.55)');
    ctx.fillStyle = g; ctx.fillRect(-316, vBot - 70, 632, 70);
    ctx.fillStyle = '#eafcff'; ctx.fillRect(-330, vBot - 2.5, 660, 5);
    for (let i = 0; i < 16; i++) { const sx = -300 + hash(i * 13 + Math.floor(t * 30)) * 600; ctx.fillStyle = rgba('#dff8ff', .5 * hash(i * 7 + Math.floor(t * 30))); ctx.fillRect(sx, vBot - 8, 2 + hash(i) * 30, 2); }
    ctx.restore();
  }
  // gold restore sweep
  if (rs > 0 && rs < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, vTop - 60, 0, vTop); g.addColorStop(0, 'rgba(246,215,127,0)'); g.addColorStop(1, 'rgba(246,215,127,.45)');
    ctx.fillStyle = g; ctx.fillRect(-300, vTop - 60, 600, 60); ctx.fillStyle = '#fff3cf'; ctx.fillRect(-312, vTop - 2, 624, 4); ctx.restore();
  }
  faceLock(ctx, t, face, 1 - P(t, tH - .15, tH + .15));
  if (sep > .02) { ctx.strokeStyle = rgba(K.goldHi, .85 * clamp(sep)); ctx.lineWidth = 3 / fS; ctx.strokeRect(-300, -350, 600, 700); }
  // glint across the paint on "클림트"
  const gl = P(t, tK - .02, tK + .55);
  if (gl > 0 && gl < 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(-300, -350, 600, 700); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const gx = lerp(-520, 520, E.inOutQ(gl)); ctx.translate(gx, 0); ctx.rotate(.38);
    const gg = ctx.createLinearGradient(-70, 0, 70, 0); gg.addColorStop(0, 'rgba(246,215,127,0)'); gg.addColorStop(.5, 'rgba(255,236,170,.55)'); gg.addColorStop(1, 'rgba(246,215,127,0)');
    ctx.fillStyle = gg; ctx.fillRect(-70, -700, 140, 1400); ctx.restore();
  }
  // snap-back flash when the layers rejoin
  const snap = tri(t, rjE - .1, rjE + .25);
  if (snap > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#fff3cf', .9 * snap); ctx.lineWidth = 6 / fS; ctx.strokeRect(-304, -354, 608, 708); ctx.restore(); }
  ctx.restore();
  // badges on the two layers
  if (sep > .05) {
    const [b1x, b1y] = map(bxC, byC, bS, 236, -286), [b2x, b2y] = map(fxC, fyC, fS, -236, -286);
    badge(ctx, b1x, b1y, 1, P(t, tTwo - .04, tTwo + .3) * clamp(sep * 2), K.cyan);
    badge(ctx, b2x, b2y, 2, P(t, tPt - .04, tPt + .3) * clamp(sep * 2), K.goldHi);
  }
  // emitter + beam
  const scanY = CY + vBot * CS;
  const aim = sp > 0 && sp < 1 ? [CX, scanY] : [CX, CY - 40];
  const em = emitter(ctx, t, aim, ex, charge, tX, tEx + .1);
  if (ex > .01) beam(ctx, em.ax, em.ay, [[CX + CW / 2, CY - CH / 2], [CX - CW / 2, CY - CH / 2], [CX - CW / 2, CY + CH / 2], [CX + CW / 2, CY + CH / 2]], ex * 1.1);
  if (sp > 0 && sp < 1) beam(ctx, em.ax, em.ay, [[CX - CW / 2 - 16, scanY], [CX + CW / 2 + 16, scanY]], .55 * tri(sp, -.1, 1.1) + .2);
  if (ex > 0) glow(ctx, CX, CY - 60, 520, '#bff3ff', .4 * ex);
  ctx.restore();

  // ---- dust in the room light ----
  motes(ctx, t, { n: 46, color: '#bfe9ff', a: .32 * (1 - splitDim * .5), area: [0, 380, 1080, 1100], size: 2.4, speed: 12, seed: 61 });

  // ---- foreground: technician with the exposure hand switch ----
  const techA = 1 - P(t, tM - .2, tM + .25);
  if (techA > 0) {
    ctx.save(); ctx.globalAlpha *= techA; layer(1.16);
    const u = TECH.h / 8;
    const press = tri(t, tC - .12, tC + .16);
    const armR = [.06 + .1 * press, 2.3 - .25 * press + .03 * Math.sin(t * 1.4)];
    const lean = .012 * Math.sin(t * 1.1) + .02 * press - .02 * P(t, tC + .1, tC + .7, E.outQ);
    const o = { coat: true, coatLen: 2.6, glasses: true, face: 1, armR, armL: [-.06, -.14], lean, shadow: false, fill: '#020306', headTurn: .5, glint: .55 * ex * ex };
    F.figure(ctx, TECH.x + 5, TECH.y - 3, TECH.h, Object.assign({}, o, { fill: rgba('#7fc8ff', .55 + .45 * ex), glint: 0 }));
    const fi = F.figure(ctx, TECH.x, TECH.y, TECH.h, o);
    // hand switch + coiled cable
    const [hx, hy] = fi.hands[1], wx = TECH.x + hx, wy = TECH.y + hy;
    ctx.save(); ctx.translate(wx, wy + 6); ctx.rotate(-.35);
    ctx.fillStyle = '#0a0d12'; roundRect(ctx, -14, -12, 28, 70, 10); ctx.fill();
    ctx.fillStyle = ex > 0 ? K.cyan : (charge > 0 ? '#ffb52e' : rgba('#ffb52e', .5)); ctx.beginPath(); ctx.arc(0, -2, 5 + 2 * press, 0, 7); ctx.fill();
    ctx.restore();
    if (ex > 0 || charge > 0) glow(ctx, wx, wy + 4, 40, ex > 0 ? K.cyan : '#ffb52e', .6 * Math.max(ex, charge));
    ctx.strokeStyle = '#020306'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wx, wy + 60);
    for (let k = 1; k <= 14; k++) ctx.lineTo(wx + 10 * Math.sin(k * 2.1) + k * 3, wy + 60 + k * 18);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ---- grading: focus falloff + breathing vignette, darker room while the layers split ----
  const [pcx, pcy] = toS(1, CX, CY);
  darkness(ctx, pcx, pcy, 1020 + 70 * Math.sin(t * 1.15), .62 + .2 * splitDim, .32);
  if (ex > 0) flash(ctx, .42 * Math.pow(ex, 1.6), '#d4f6ff');

  // ---- HUD (screen space) ----
  if (hud > 0 && rot < .5) {
    const [x0, y0] = toS(1, CX - CW / 2, CY - CH / 2), [x1, y1] = toS(1, CX + CW / 2, CY + CH / 2);
    const lock = E.outBack(P(t, tM - .04, tM + .3), 1.4) * (1 - P(t, tW + .3, tW + .7, E.inOutQ));
    const [h0x, h0y] = toS(1, CX + (96 - 300) * CS, CY + (80 - 350) * CS), [h1x, h1y] = toS(1, CX + (500 - 300) * CS, CY + (430 - 350) * CS);
    const bx0 = lerp(x0 - 16, h0x, lock), by0 = lerp(y0 - 16, h0y, lock), bx1 = lerp(x1 + 16, h1x, lock), by1 = lerp(y1 + 16, h1y, lock);
    hudCorners(ctx, bx0, by0, bx1, by1, hud * (lock > 0 ? 1 : .85), K.cyan, 44, 5);
    // ruler along the left edge with a marker riding the scan line
    ctx.save(); ctx.globalAlpha *= hud * .8; ctx.strokeStyle = rgba(K.cyan, .7); ctx.lineWidth = 2;
    for (let i = 0; i <= 28; i++) { const yy = lerp(y0, y1, i / 28), l = i % 7 === 0 ? 22 : 10; ctx.beginPath(); ctx.moveTo(x0 - 34, yy); ctx.lineTo(x0 - 34 + l, yy); ctx.stroke(); }
    const my = lerp(y0, y1, clamp((vBot + 350) / 700));
    if (sp > 0) { ctx.fillStyle = K.cyan; ctx.beginPath(); ctx.moveTo(x0 - 40, my); ctx.lineTo(x0 - 58, my - 10); ctx.lineTo(x0 - 58, my + 10); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // tag
    const tg = typeSub('X-RAY · 1996', P(t, tC + .02, tC + .4));
    if (tg) label(ctx, tg, Math.max(150, x0 + 120), Math.max(476, y0 - 34), { size: 30, family: FONT.type, weight: 400, color: K.cyan, bg: 'rgba(0,20,30,.85)', border: K.cyan, a: hud });
  }
  // approved label for the reveal
  const chA = P(t, tW - .02, tW + .25) * (1 - P(t, tH - .12, tH + .1));
  if (chA > 0) {
    ctx.save(); ctx.translate(540, 1196 + 26 * (1 - E.outBack(chA))); chip(ctx, 'X선·적외선: 모자·스카프 쓴 같은 여인', 0, 0, chA, { color: '#e9fbff', border: K.cyan, size: 36 }); ctx.restore();
  }
  // final card
  const cp = P(t, tK - .04, tK + .3, E.outBack);
  if (cp > 0) {
    const ca2 = clamp(P(t, tK - .04, tK + .12));
    ctx.save(); ctx.translate(540, 1196); ctx.scale(lerp(.7, 1, cp), lerp(.7, 1, cp)); ctx.globalAlpha *= ca2;
    const tw2 = measure(ctx, "알려진 유일한 '두 겹의 클림트'", 44, FONT.disp, 400), w = tw2 + 150;
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = 'rgba(8,10,14,.92)'; roundRect(ctx, -w / 2, -58, w, 116, 18); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; roundRect(ctx, -w / 2, -58, w, 116, 18); ctx.stroke();
    const ix = -w / 2 + 44; ctx.lineWidth = 5; ctx.strokeStyle = K.cyan; ctx.strokeRect(ix - 8, -30, 40, 52); ctx.strokeStyle = K.goldHi; ctx.strokeRect(ix + 8, -18, 40, 52);
    text(ctx, "알려진 유일한 '두 겹의 클림트'", 50, 2, { size: 44, family: FONT.disp, weight: 400, color: K.goldHi });
    ctx.restore();
  }
};
})();
