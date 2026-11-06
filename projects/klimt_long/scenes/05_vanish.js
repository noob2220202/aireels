// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "그런데 특별전을 준비하던 1997년 2월, 그림이 사라졌다."
// Daylight gallery under renovation (no night, no thief).
//  opening   match cut from xray: the same canvas, now framed on the gallery wall; camera dollies back
//  그런데      gallery revealed: skylight rays, scaffolding with a plasterer at work, swinging work lamp, plastic sheet
//  특별전을    a worker on a ladder lets the rolled "특별전" banner drop; it unfurls and settles
//  준비하던    approved chip "보수공사 중 · 특별전 준비"; crates, dust, lamp sway keep the room alive
//  1997년     split-flap date board drops in under the title: 1997.02
//  2월        the month locks with a gold underline + pulse
//  그림이      camera pushes in, room dims, gold brackets lock on the painting (anticipation)
//  사라졌다    glitch-stutter, the framed painting is gone: pale patch, bare hook, swinging wire, dust;
//             red outline draws on the impact; approved label "1997.2.22 아침 도난 확인"
//  end       camera drifts down into the push transition to the roof scene
// ---------------------------------------------------------------------------

let V = null;
const GX0 = -260, GY0 = -260, GW = 1620, GH = 2300;   // gallery backdrop sprite world rect
const FLOOR = 1290, RAIL = 330;
const PX = 540, PY = 720, FW = 380, FH = FW * 860 / 760;  // framed painting (world)
const IMG = { x: PX - FW * .39, y: PY - FH * .4, w: FW * .78, h: FH * .8 };
const BAN = { x: 862, y: 452, w: 140, h: 380 };          // banner rod centre-top + cloth size
const LAD = { x: 1000, top: 760 };                        // ladder
const W2 = { x: 1004, y: 958, h: 400 };                   // worker on the ladder (feet on a rung)
const SC = { x0: -20, x1: 250, plank: 820 };              // scaffolding span + plank height
const W1 = { x: 150, y: 820, h: 330 };                    // plasterer on the plank

const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
function camAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < 4; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}
const poseLerp = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// ---------- sprites ----------
function makeGallery() {
  const [c, x] = mk(GW, GH); x.translate(-GX0, -GY0); const R = rng(97);
  // ceiling + skylight well
  let g = x.createLinearGradient(0, GY0, 0, RAIL); g.addColorStop(0, '#0c1016'); g.addColorStop(1, '#141a22'); x.fillStyle = g; x.fillRect(GX0, GY0, GW, RAIL - GY0);
  g = x.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, '#c7d6e6'); g.addColorStop(1, '#7d8fa3'); x.fillStyle = g; x.fillRect(290, -120, 500, 250);
  x.fillStyle = '#0c1016'; for (let k = 1; k < 4; k++) x.fillRect(290 + k * 125 - 5, -120, 10, 250); x.fillRect(290, 0, 500, 10);
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(270, 130, 540, 30);
  { const rg = x.createRadialGradient(540, 60, 0, 540, 60, 520); rg.addColorStop(0, 'rgba(207,224,244,.15)'); rg.addColorStop(.4, 'rgba(207,224,244,.05)'); rg.addColorStop(1, 'rgba(207,224,244,0)');
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rg; x.fillRect(20, -460, 1040, 1040); x.restore(); }
  // plaster wall
  g = x.createLinearGradient(0, RAIL, 0, FLOOR); g.addColorStop(0, '#2a3440'); g.addColorStop(.55, '#232c37'); g.addColorStop(1, '#161c24');
  x.fillStyle = g; x.fillRect(GX0, RAIL, GW, FLOOR - RAIL);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .02})`; x.beginPath(); x.arc(GX0 + R() * GW, RAIL + R() * (FLOOR - RAIL), 12 + R() * 70, 0, 7); x.fill(); }
  for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .03})`; x.fillRect(GX0 + R() * GW, RAIL + R() * (FLOOR - RAIL), 2, 2); }
  // renovation: patched plaster + cracks on the left wall
  for (let i = 0; i < 6; i++) { const X0 = -120 + R() * 360, Y0 = 380 + R() * 600, w = 60 + R() * 120, h = 40 + R() * 90; x.fillStyle = `rgba(200,205,200,${.05 + R() * .05})`; roundRect(x, X0, Y0, w, h, 14); x.fill(); }
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
  for (let i = 0; i < 5; i++) { let X0 = -100 + R() * 330, Y0 = 400 + R() * 500; x.beginPath(); x.moveTo(X0, Y0); for (let k = 0; k < 8; k++) { X0 += (R() - .4) * 30; Y0 += 10 + R() * 26; x.lineTo(X0, Y0); } x.stroke(); }
  // picture rail + cornice
  x.fillStyle = '#0f141a'; x.fillRect(GX0, RAIL - 18, GW, 22); x.fillStyle = 'rgba(220,230,245,.14)'; x.fillRect(GX0, RAIL + 2, GW, 2);
  // a covered artwork waiting for the show (draped sheet) behind the scaffold
  x.save(); x.translate(110, 640);
  g = x.createLinearGradient(-110, -150, 110, 170); g.addColorStop(0, '#5d6670'); g.addColorStop(1, '#30373f'); x.fillStyle = g;
  x.beginPath(); x.moveTo(-110, -150); x.quadraticCurveTo(0, -165, 110, -150); x.lineTo(124, 150); x.quadraticCurveTo(60, 172, 0, 160); x.quadraticCurveTo(-70, 176, -126, 152); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 6; for (const k of [-60, -10, 45]) { x.beginPath(); x.moveTo(k, -150); x.quadraticCurveTo(k + 14, 0, k - 6, 160); x.stroke(); }
  x.restore();
  // soft cast shadow of the main frame
  x.save(); x.filter = 'blur(24px)'; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(PX - FW / 2 + 16, PY - FH / 2 + 30, FW, FH); x.restore();
  // dado + wainscot
  x.fillStyle = '#10151b'; x.fillRect(GX0, 1110, GW, FLOOR - 1110); x.fillStyle = 'rgba(220,230,245,.1)'; x.fillRect(GX0, 1110, GW, 3);
  for (let px = GX0 + 30; px < GX0 + GW; px += 300) { x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2; x.strokeRect(px, 1150, 260, 100); x.strokeStyle = 'rgba(0,0,0,.45)'; x.strokeRect(px + 3, 1153, 260, 100); }
  x.fillStyle = '#07090c'; x.fillRect(GX0, FLOOR - 22, GW, 22);
  // floor
  g = x.createLinearGradient(0, FLOOR, 0, GY0 + GH); g.addColorStop(0, '#1b1c1e'); g.addColorStop(.4, '#101112'); g.addColorStop(1, '#060606'); x.fillStyle = g; x.fillRect(GX0, FLOOR, GW, GY0 + GH - FLOOR);
  x.strokeStyle = 'rgba(235,240,250,.05)'; x.lineWidth = 2;
  for (let i = 0, y = FLOOR + 8; y < GY0 + GH; i++, y += 16 + i * 9) { x.beginPath(); x.moveTo(GX0, y); x.lineTo(GX0 + GW, y); x.stroke(); }
  for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(540 + i * 70, FLOOR); x.lineTo(540 + i * 330, GY0 + GH); x.stroke(); }
  // drop cloth on the left floor
  x.fillStyle = 'rgba(170,165,150,.09)'; x.beginPath(); x.moveTo(-200, FLOOR + 10); x.lineTo(420, FLOOR + 6); x.lineTo(520, FLOOR + 160); x.lineTo(-200, FLOOR + 210); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 4; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(-180 + k * 110, FLOOR + 20); x.quadraticCurveTo(-150 + k * 110, FLOOR + 90, -170 + k * 120, FLOOR + 190); x.stroke(); }
  // exhibition crates (right)
  x.save(); x.globalAlpha = .92; x.drawImage(T.crate1, 760, 1060, 300, 220); x.drawImage(T.crate2, 800, 892, 220, 170); x.restore();
  x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect(760, 892, 300, 388);
  x.save(); x.translate(1180, 1286); x.rotate(.06); x.drawImage(T.crate2, -110, -170, 220, 170); x.restore();
  // scaffolding (static frame)
  x.lineCap = 'butt';
  const pole = (x0, y0, x1, y1, w) => { x.strokeStyle = '#0a0d11'; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.strokeStyle = 'rgba(190,210,235,.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(x0 + w * .35, y0); x.lineTo(x1 + w * .35, y1); x.stroke(); };
  for (const X0 of [SC.x0, SC.x1]) pole(X0, 300, X0, FLOOR + 30, 14);
  for (const Y0 of [520, 1080]) pole(SC.x0 - 30, Y0, SC.x1 + 30, Y0, 10);
  pole(SC.x0, 520, SC.x1, SC.plank, 7); pole(SC.x1, SC.plank, SC.x0, 1080, 7); pole(SC.x0, 1080, SC.x1, FLOOR + 20, 7);
  x.fillStyle = '#0c0f13'; x.fillRect(SC.x0 - 40, SC.plank - 4, SC.x1 - SC.x0 + 80, 24); x.fillStyle = 'rgba(190,210,235,.15)'; x.fillRect(SC.x0 - 40, SC.plank - 4, SC.x1 - SC.x0 + 80, 2);
  x.fillRect(SC.x0 - 40, 300, SC.x1 - SC.x0 + 80, 3);
  // paint bucket on the plank
  x.fillStyle = '#12161b'; x.fillRect(40, SC.plank - 46, 44, 42); x.fillStyle = 'rgba(200,205,200,.25)'; x.fillRect(40, SC.plank - 46, 44, 4);
  return c;
}
function makeBanner() {
  const [c, x] = mk(BAN.w, BAN.h + 40);
  const w = BAN.w, h = BAN.h;
  let g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#5a0c12'); g.addColorStop(.3, '#8a1520'); g.addColorStop(.7, '#7a111b'); g.addColorStop(1, '#4a0a0f');
  x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h + 36); x.lineTo(w / 2, h); x.lineTo(0, h + 36); x.closePath(); x.fill();
  x.strokeStyle = K.gold; x.lineWidth = 3; x.strokeRect(12, 14, w - 24, h - 40);
  x.strokeStyle = 'rgba(217,169,58,.5)'; x.lineWidth = 1.5; x.strokeRect(18, 20, w - 36, h - 52);
  ['특', '별', '전'].forEach((ch, i) => text(x, ch, w / 2, 86 + i * 92, { size: 70, family: FONT.disp, weight: 400, color: K.goldHi }));
  // small gold ornament (spiral) at the bottom
  spiral(x, w / 2, h - 46, 16, 'rgba(246,215,127,.8)', 2);
  const R = rng(5); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,220,200' : '0,0,0'},${R() * .05})`; x.fillRect(R() * w, R() * (h + 36), 2, 2); }
  return c;
}
function makeFore() { // blurred foreground props for depth of field (sawhorse + bucket left, rolled cloth right)
  const [c, x] = mk(1400, 520); x.filter = 'blur(7px)';
  x.fillStyle = '#030405';
  x.save(); x.translate(160, 300); x.fillRect(-170, -30, 360, 34); x.lineCap = 'round'; x.strokeStyle = '#030405'; x.lineWidth = 26;
  for (const [a, b] of [[-140, -260], [-110, 40], [150, 260], [120, -20]]) { x.beginPath(); x.moveTo(a, 0); x.lineTo(b, 240); x.stroke(); }
  x.restore();
  x.beginPath(); x.ellipse(1180, 330, 210, 120, -.08, 0, 7); x.fill(); x.fillRect(1000, 330, 400, 200);
  x.fillStyle = '#060708'; x.fillRect(1090, 180, 120, 160);
  x.filter = 'none';
  return c;
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
function initV() {
  V = { bg: makeGallery(), ban: makeBanner(), fore: makeFore(), rays: [makeRays(.78, 1700, '#d6e4f4', 1, 8, 2), makeRays(.78, 1700, '#d6e4f4', 1, 8, 9)] };
  { const [c, x] = mk(256, 256); x.filter = 'blur(20px)'; x.fillStyle = '#000'; x.fillRect(48, 48, 160, 160); V.soft = c; }
}

// ---------- pieces ----------
function drawPainting(ctx, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.drawImage(T.portrait, IMG.x, IMG.y, IMG.w, IMG.h);
  ctx.drawImage(T.frame, PX - FW / 2, PY - FH / 2, FW, FH);
  ctx.restore();
}
function drawBanner(ctx, t, un, sway) {
  // rod + rolled cloth; the cloth drops from the roll (un 0..1) with a damped flutter
  const x0 = BAN.x - BAN.w / 2, y0 = BAN.y, len = (BAN.h + 36) * un, N = 14, sw = V.ban.width;
  ctx.save();
  ctx.strokeStyle = '#0a0d11'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(BAN.x - 50, RAIL + 2); ctx.lineTo(BAN.x - 62, y0); ctx.moveTo(BAN.x + 50, RAIL + 2); ctx.lineTo(BAN.x + 62, y0); ctx.stroke();
  if (len > 2) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    for (let i = 0; i < N; i++) {
      const v0 = i / N * len, v1 = (i + 1) / N * len, k = (i + .5) / N;
      const ox = sway * Math.sin(k * 2.4 + t * 2.2) * k * 16 + sway * k * k * 10;
      ctx.drawImage(V.ban, 0, v0, sw, v1 - v0 + .8, x0 + ox, y0 + v0, BAN.w, v1 - v0 + .8);
      if (i === 0) ctx.shadowColor = 'transparent';
    }
    ctx.restore();
    // fold shading
    ctx.save(); ctx.globalAlpha *= .3 * un; const fg = ctx.createLinearGradient(x0, 0, x0 + BAN.w, 0); fg.addColorStop(0, 'rgba(0,0,0,.6)'); fg.addColorStop(.35, 'rgba(255,255,255,.12)'); fg.addColorStop(.6, 'rgba(0,0,0,.25)'); fg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = fg; ctx.fillRect(x0 + sway * 3, y0, BAN.w, Math.min(len, BAN.h)); ctx.restore();
  }
  // the roll travels down while unfurling, then rests as a bottom batten
  const ry = y0 + len;
  ctx.fillStyle = '#3a0a0e'; roundRect(ctx, x0 - 8, y0 - 12, BAN.w + 16, 20, 9); ctx.fill();
  ctx.fillStyle = K.gold; ctx.fillRect(x0 - 12, y0 - 6, 6, 10); ctx.fillRect(x0 + BAN.w + 6, y0 - 6, 6, 10);
  if (un < .995) { const rr = 15 * (1 - un) + 4; ctx.fillStyle = '#6d1018'; roundRect(ctx, x0 - 4, ry - rr, BAN.w + 8, rr * 2, rr); ctx.fill(); ctx.fillStyle = 'rgba(255,200,200,.18)'; ctx.fillRect(x0, ry - rr + 2, BAN.w, 2); }
  ctx.restore();
}
function drawLadder(ctx) {
  ctx.save(); ctx.lineCap = 'round';
  const L0 = [LAD.x - 70, FLOOR + 10], L1 = [LAD.x - 18, LAD.top], R0 = [LAD.x + 70, FLOOR + 10], R1 = [LAD.x + 18, LAD.top];
  for (const [a, b] of [[L0, L1], [R0, R1]]) { ctx.strokeStyle = '#07090c'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = 'rgba(190,210,235,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0] - 5, a[1]); ctx.lineTo(b[0] - 5, b[1]); ctx.stroke(); }
  ctx.strokeStyle = '#07090c'; ctx.lineWidth = 8;
  for (let k = 1; k <= 5; k++) { const q = k / 6, y = lerp(FLOOR + 10, LAD.top, q); ctx.beginPath(); ctx.moveTo(lerp(L0[0], L1[0], q), y); ctx.lineTo(lerp(R0[0], R1[0], q), y); ctx.stroke(); }
  ctx.restore();
}
function rimFigure(ctx, x, y, h, o, rim, ra, dx = -4, dy = -3) {
  if (ra > 0) F.figure(ctx, x + dx, y + dy, h, Object.assign({}, o, { fill: rgba(rim, ra), glint: 0 }));
  return F.figure(ctx, x, y, h, o);
}

window.KL.scenes.vanish = function (ctx, t, d, info) {
  if (!V) initV();
  const tB = at(info, '그런데', .02), tE = at(info, '특별전을', .15), tJ = at(info, '준비하던', .25), tY = at(info, '1997년', .45), tF = at(info, '2월', .6),
    tP = at(info, '그림이', .72), tGo = at(info, '사라졌다', .9);
  const gone = tGo + .1;                       // first frame of the glitch
  const out = tGo + .36;                       // painting fully gone (lands on the impact sfx)
  const after = t >= out;

  // ---- camera: match cut (painting = xray's final canvas framing) → dolly back → push in → drift down into the push ----
  const keys = [[-.5, 540, 825, 1.62], [.06, 540, 825, 1.62], [tJ + .2, 540, 860, .975], [tF - .2, 540, 850, .99], [tP + .02, 540, 838, 1.14], [tGo + .05, 540, 800, 1.38],
    [out + .45, 540, 790, 1.44], [d - .3, 540, 792, 1.48], [d + .35, 540, 870, 1.5]];
  let [cx, cy, z] = camAt(keys, t);
  z *= 1 + .035 * tri(t, out - .05, out + .3);
  const dr = drift(t, .55, 13);
  const shk = .9 * tri(t, out - .02, out + .3);
  dr.x += shk * noise1(t * 38, 5) * 10; dr.y += shk * noise1(t * 38, 6) * 10;
  const layer = (f) => { const zf = 1 + (z - 1) * f; ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (cx - 540) * f) - dr.x * f, -(960 + (cy - 960) * f) - dr.y * f); };
  const toS = (f, x, y) => { const zf = 1 + (z - 1) * f; return [W / 2 + (x - (540 + (cx - 540) * f) - dr.x * f) * zf, H / 2 + (y - (960 + (cy - 960) * f) - dr.y * f) * zf]; };

  const cloud = .78 + .22 * fbm(t * .5, 21);            // daylight drifting through the skylight
  const focus = P(t, tP - .15, tP + .35, E.inOutQ);    // anticipation: room dims, painting holds the light
  const cold = P(t, out, out + .6);                     // after the loss: colder grade

  ctx.save();

  // ===== wall layer =====
  ctx.save(); layer(1);
  ctx.drawImage(V.bg, GX0, GY0);
  { const rk = .5 + .5 * Math.sin(t * .8), ra = (.085 - .03 * focus) * cloud; drawRays(ctx, V.rays[0], 540, 120, ra * rk); drawRays(ctx, V.rays[1], 540, 120, ra * (1 - rk)); }

  // work lamp hanging from the scaffold: swings, warm pool on the wall
  const la = .07 * Math.sin(t * 1.9) + .025 * Math.sin(t * 3.3 + 1), lx0 = SC.x1 + 20, ly0 = 300, lL = 230;
  const lbx = lx0 + Math.sin(la) * lL, lby = ly0 + Math.cos(la) * lL, lfl = L.flicker(t, .06, 3);
  glow(ctx, lbx + 30, lby + 60, 300, '#ffc27a', .22 * lfl * (1 - .5 * focus));
  ctx.strokeStyle = '#06080b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx0, ly0); ctx.lineTo(lbx, lby); ctx.stroke();
  ctx.save(); ctx.translate(lbx, lby); ctx.rotate(-la); ctx.fillStyle = '#0b0d10'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.lineTo(22, 26); ctx.lineTo(-22, 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#fff0c8', .95 * lfl); ctx.beginPath(); ctx.arc(0, 30, 9, 0, 7); ctx.fill(); ctx.restore();
  glow(ctx, lbx, lby + 30, 90, '#ffd9a0', .7 * lfl);

  // painting: picture light + frame, then the loss
  const lampOn = .8 + .2 * focus;
  { const ly = PY - FH / 2 - 44; ctx.fillStyle = '#2a2418'; ctx.fillRect(PX - 4, ly - 40, 8, 40); const bg = ctx.createLinearGradient(0, ly - 10, 0, ly + 12); bg.addColorStop(0, '#8a7448'); bg.addColorStop(1, '#2c2416');
    ctx.fillStyle = bg; roundRect(ctx, PX - 120, ly - 10, 240, 22, 8); ctx.fill();
    { const lo = after ? (t < out + .25 ? (Math.floor(t * 30) % 3 ? .35 : 1) : .9) : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= lo; const cg = ctx.createLinearGradient(0, ly, 0, PY + FH / 2 + 60); cg.addColorStop(0, `rgba(255,214,150,${.2 * lampOn})`); cg.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(PX - 110, ly + 10); ctx.lineTo(PX + 110, ly + 10); ctx.lineTo(PX + FW / 2 + 70, PY + FH / 2 + 60); ctx.lineTo(PX - FW / 2 - 70, PY + FH / 2 + 60); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  // pale patch where the frame protected the wall + bare hook (visible once it is gone)
  if (t >= gone) {
    const pa = after ? 1 : .6;
    ctx.save(); ctx.globalAlpha *= pa;
    ctx.fillStyle = 'rgba(190,200,215,.16)'; ctx.fillRect(PX - FW / 2 + 6, PY - FH / 2 + 6, FW - 12, FH - 12);
    ctx.strokeStyle = 'rgba(200,210,225,.18)'; ctx.lineWidth = 3; ctx.setLineDash([4, 7]); ctx.strokeRect(PX - FW / 2 + 6, PY - FH / 2 + 6, FW - 12, FH - 12); ctx.setLineDash([]);
    ctx.restore();
  }
  // hanging wires: taut with the frame, then dangling and swinging
  { const hookY = RAIL + 4, topY = PY - FH / 2 + 8;
    ctx.save(); ctx.strokeStyle = 'rgba(200,210,225,.38)'; ctx.lineWidth = 2;
    if (!after) { ctx.beginPath(); ctx.moveTo(PX - 5, hookY); ctx.lineTo(PX - FW * .3, topY); ctx.moveTo(PX + 5, hookY); ctx.lineTo(PX + FW * .3, topY); ctx.stroke(); }
    else {
      const k = t - out, sw = Math.sin(k * 6.5) * Math.exp(-k * 1.6) * 40 + Math.sin(t * 1.3) * 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(PX + s * 5, hookY); ctx.quadraticCurveTo(PX + s * 30 + sw * .5, hookY + 90, PX + s * 22 + sw, hookY + 165); ctx.stroke(); }
    }
    ctx.fillStyle = '#aab4bf'; ctx.beginPath(); ctx.arc(PX, hookY, 6, 0, 7); ctx.fill(); ctx.restore(); }
  // the framed painting (with glitch stutter on the loss)
  if (t < gone) {
    drawPainting(ctx, 1);
    glow(ctx, PX, PY - 30, 430, '#e8cf8e', .11 * lampOn);
  } else if (!after) {
    const f = Math.floor(t * 30), on = [1, 0, 1, 1, 0, 1, 0, 0][f % 8] && hash(f * 3) > .25;
    const amt = P(t, gone, out);
    if (on) {
      for (let i = 0; i < 9; i++) {
        const y0 = PY - FH / 2 - 10 + i * (FH + 20) / 9, h = (FH + 20) / 9, off = (hash(f * 11 + i) - .5) * 90 * (.4 + amt);
        ctx.save(); ctx.beginPath(); ctx.rect(PX - FW / 2 - 140, y0, FW + 280, h); ctx.clip(); ctx.translate(off, 0); drawPainting(ctx, 1 - amt * .6); ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .4;
      ctx.translate(-14 - 20 * amt, 0); ctx.fillStyle = 'rgba(255,40,60,.5)'; ctx.fillRect(PX - FW / 2, PY - FH / 2, FW, FH);
      ctx.translate(28 + 40 * amt, 0); ctx.fillStyle = 'rgba(0,220,255,.5)'; ctx.fillRect(PX - FW / 2, PY - FH / 2, FW, FH); ctx.restore();
    }
  }
  // dust shaken loose where it hung
  if (after) motes(ctx, t, { n: 34, color: '#dfe6ef', a: .5 * (1 - P(t, out + 1.2, out + 2.2)) + .2, area: [PX - FW / 2 - 20, PY - FH / 2, FW + 40, FH + 80], size: 2.6, speed: 26, seed: 77 });

  // scaffold plastic sheet (breathing in the draft)
  { ctx.save(); const sx = SC.x1 + 18, top = 300, bot = FLOOR + 10;
    ctx.beginPath(); ctx.moveTo(sx - 8, top);
    for (let k = 0; k <= 12; k++) { const y = lerp(top, bot, k / 12); ctx.lineTo(sx + 26 * Math.sin(k * .9 + t * 1.6) * (k / 12) + 34 * (k / 12) + 6 * noise1(t * .8 + k, 9), y); }
    ctx.lineTo(sx - 30, bot); ctx.closePath();
    const pg = ctx.createLinearGradient(sx - 30, 0, sx + 70, 0); pg.addColorStop(0, 'rgba(200,215,230,.04)'); pg.addColorStop(.6, 'rgba(210,225,240,.14)'); pg.addColorStop(1, 'rgba(230,240,250,.22)');
    ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = 'rgba(230,240,250,.18)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }

  // plasterer on the scaffold plank (only while the room is busy)
  if (!after) {
    const u = W1.h / 8, s1 = Math.sin(t * 4.6), s2 = Math.sin(t * 4.6 + 1.1);
    const armR = [2.4 + .3 * s1, .35 + .25 * s2], armL = [.35 + .08 * s2, .55];
    const o = { face: 1, flip: true, hat: 'cap', armR, armL, lean: .03 + .02 * s1, shadow: false, fill: '#05070a' };
    const fi = rimFigure(ctx, W1.x, W1.y, W1.h, o, '#cfe0f4', .5 * cloud, 3, -3);
    // trowel in hand
    const [hx, hy] = fi.hands[1]; ctx.save(); ctx.translate(W1.x - hx, W1.y + hy); ctx.rotate(-.6 + .3 * s1); ctx.fillStyle = '#0a0c10'; ctx.fillRect(-4, -18, 8, 18); ctx.fillStyle = '#5f6b78'; ctx.fillRect(-18, -30, 36, 12); ctx.restore();
    // plaster dust from the strokes
    motes(ctx, t, { n: 14, color: '#e8e4da', a: .45, area: [W1.x - 160, W1.y - u * 9, 140, 220], size: 2, speed: 40, seed: 31 });
  }

  // banner + ladder + worker who drops it
  const un = clamp(E.outBack(P(t, tE - .08, tE + .5), 1.15), 0, 1.04);
  const flut = Math.exp(-Math.max(0, t - tE - .3) * 1.8) * Math.sin((t - tE) * 9) * (t > tE ? 1 : 0) + .25 * Math.sin(t * 1.4);
  drawBanner(ctx, t, Math.min(1, un), flut);
  drawLadder(ctx);
  if (!after) {
    const rel = E.inOutQ(P(t, tE - .1, tE + .2)), down = E.inOutQ(P(t, tE + .5, tJ + .6)), look = P(t, tJ + .3, tY, E.inOutQ);
    const armHold = [2.75, .05], armRel = [1.25, .55], armRest = [.25, .35];
    const armR = poseLerp(poseLerp(armHold, armRel, rel), armRest, down), armL = poseLerp(poseLerp([2.6, .12], [1.0, .7], rel), [-.15, .4], down);
    armR[0] += .04 * Math.sin(t * 2.1); armL[0] += .04 * Math.sin(t * 2.4 + 1);
    const o = { face: 1, flip: true, hat: 'cap', armR, armL, lean: -.04 * rel + .02 * Math.sin(t * 1.2), shadow: false, fill: '#05070a', headTurn: -.4 + .8 * look };
    rimFigure(ctx, W2.x, W2.y, W2.h, o, '#d8e6f6', .55 * cloud, -4, -3);
    // tag on the worker's light: warm bounce from the banner
    glow(ctx, W2.x - 40, W2.y - W2.h * .7, 120, '#ff6a6a', .08 * un);
  }
  ctx.restore();

  // ===== foreground (blurred props, faster parallax) =====
  ctx.save(); layer(1.28); ctx.globalAlpha *= .95; ctx.drawImage(V.fore, -300, FLOOR + 40); ctx.restore();

  // floating dust in the skylight
  motes(ctx, t, { n: 60, color: '#e6eef8', a: .32 * cloud, area: [-60, 300, 1200, 1100], size: 2.5, speed: 13, seed: 52 });

  // anticipation: brackets lock on "그림이"
  const [p0x, p0y] = toS(1, PX - FW / 2, PY - FH / 2), [p1x, p1y] = toS(1, PX + FW / 2, PY + FH / 2);
  const brk = P(t, tP - .04, tP + .3) * (1 - P(t, gone - .05, gone + .08));
  if (brk > 0) brackets(ctx, p0x - 18, p0y - 18, p1x - p0x + 36, p1y - p0y + 36, brk, K.goldHi, 50, 6);
  // after: red evidence outline + corner marks
  if (after) {
    const q = P(t, out + .02, out + .4, E.inOutQ);
    const r0 = toS(1, PX - FW / 2 + 6, PY - FH / 2 + 6), r1 = toS(1, PX + FW / 2 - 6, PY + FH / 2 - 6);
    const pts = [[r0[0], r0[1]], [r1[0], r0[1]], [r1[0], r1[1]], [r0[0], r1[1]], [r0[0], r0[1]]];
    ctx.save(); ctx.globalAlpha *= .9; pathReveal(ctx, pts, q, { color: K.red, w: 5, dash: [18, 12], glowC: 'rgba(227,38,47,.8)', head: true }); ctx.restore();
    const pr = P(t, out + .25, out + .5) * (.85 + .15 * Math.sin(t * 6));
    if (pr > 0) brackets(ctx, r0[0] - 20, r0[1] - 20, r1[0] - r0[0] + 40, r1[1] - r0[1] + 40, pr, K.red, 46, 7);
  }

  ctx.restore();

  // ===== grade =====
  const [pcx, pcy] = toS(1, PX, PY);
  darkness(ctx, pcx, pcy + 40, lerp(1150, 760, focus) + 60 * Math.sin(t * 1.05), lerp(.55, .78, focus), .3);
  if (cold > 0) { ctx.save(); ctx.fillStyle = rgba('#0c1a2e', .2 * cold); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // loss: cool flash on the vanish + subtle screen glitch bands
  if (t >= gone && t < out + .3) {
    flash(ctx, .2 * (1 - P(t, out, out + .3)) * (t >= out ? 1 : .4), '#cfe0ff');
    const f = Math.floor(t * 30);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const y = 460 + hash(f * 7 + i) * 800, h = 6 + hash(f * 3 + i) * 26; ctx.fillStyle = rgba(i % 2 ? '#ff2740' : '#30e0ff', .12); ctx.fillRect(0, y, W, h); }
    ctx.restore();
  }

  // ===== labels =====
  // renovation + exhibition prep
  const cA = P(t, tJ - .06, tJ + .22) * (1 - P(t, tF - .15, tF + .1));
  if (cA > 0) { ctx.save(); ctx.translate(540, 1196 + 24 * (1 - E.outBack(cA))); chip(ctx, '보수공사 중 · 특별전 준비', 0, 0, cA, { size: 38, border: rgba(K.goldHi, .6) }); ctx.restore(); }
  // date board: 1997.02 drops in under the title, month locks on "2월"
  const fa = P(t, tY - .14, tY + .04) * (1 - P(t, tP - .05, tP + .2));
  if (fa > 0) {
    const drop = E.outBack(P(t, tY - .14, tY + .2), 1.3), mo = P(t, tF - .06, tF + .3, E.outC);
    ctx.save(); ctx.globalAlpha *= fa; ctx.translate(540, lerp(462, 522, drop)); const sc = .92 + .06 * tri(t, tF - .05, tF + .3); ctx.scale(sc, sc);
    // year locks on "1997년"; the month keeps rolling and only locks on "2월"
    const FS = 84, cw = FS * .74, gap = FS * .08, x0 = -(6.4 * cw + 6 * gap) / 2;
    flap(ctx, '1997', x0 + (4 * cw + 3 * gap) / 2, 0, t, tY - .16, { size: FS, roll: .22, lock: .045 });
    flap(ctx, '.02', x0 + 4 * (cw + gap) + (3 * cw + 2 * gap) / 2, 0, t, tF - .36, { size: FS, roll: .22, lock: .07 });
    if (mo > 0) { // gold underline + ring around the month digits
      const mx0 = x0 + 4 * (cw + gap) + .4 * cw + gap, mw = 2 * cw + gap;
      ctx.save(); ctx.shadowColor = K.goldHi; ctx.shadowBlur = 16; ctx.fillStyle = K.goldHi; ctx.fillRect(mx0, 62, mw * mo, 7); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(K.goldHi, .9 * (1 - P(t, tF + .25, tF + .7))); ctx.lineWidth = 4; roundRect(ctx, mx0 - 8, -62, mw + 16, 124, 12); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  // discovery label after the loss
  const lA = P(t, out + .05, out + .33, E.outBack);
  if (lA > 0) {
    ctx.save(); ctx.translate(540, 1196); const s = lerp(.65, 1, clamp(lA)); ctx.scale(s, s);
    label(ctx, '1997.2.22 아침 도난 확인', 0, 0, { size: 42, color: '#fff', bg: 'rgba(120,10,16,.92)', border: '#ff5a62', a: clamp(lA * 1.6), padX: 28, padY: 14 });
    ctx.restore();
  }
};
})();
