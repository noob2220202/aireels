// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "1996년, 한 여고생이 이 그림에서 사라진 클림트 초상화를 알아봤다."
// Beats: 1996 split-flap → it docks as a header, Italy draws, pin drops on Piacenza (thunk)
// → camera dives into the map (whoosh) and lands in the gallery (1996, daylight)
// → the student walks in and stops before the painting (여고생이 / 이 그림에서)
// → she opens a book, the old b/w reproduction of the lost Klimt lifts out and flips (사라진)
// → glint + face-to-face match lines (클림트) → the reproduction slides onto the painting, faces lock (초상화를, bell)
// → comparison wipe settles on the face, she points, approved label pops (알아봤다).
// ---------------------------------------------------------------------------
let G = null;
const WX0 = -320, WY0 = -420, WW = 1760, WH = 2760;           // gallery backdrop sprite covers this world rect
const FLOOR = 1290;
const PX = 560, PY = 740, FW = 400, FH = FW * 860 / 760;      // the painting on the wall (world)
const IMG = { x: PX - FW * .39, y: PY - FH * .4, w: FW * .78, h: FH * .8 };
const tw = (u, v) => [IMG.x + u / 600 * IMG.w, IMG.y + v / 700 * IMG.h]; // portrait texture → world
const FACE = [[250, 214], [236, 250], [234, 270], [230, 300], [236, 338], [250, 370], [270, 390], [300, 396], [348, 370], [368, 328], [404, 250], [372, 180], [318, 166]];
const CARDW = 232, CIMG = { x: 13, y: 13, w: 206, h: 240 }, CARDH = 13 + 240 + 48; // b/w reproduction card (world units at scale 1)
const SIDE = { x: 872, y: 706, r: .06 };                       // where the card hovers next to the painting
const STU = { y: 1610, h: 880 };                                // student: feet line + height (her own depth layer)

// ---------- sprites ----------
function smallPainting(x, cx, cy, w, h, kind, seed) {
  const R = rng(seed);
  x.save(); x.translate(cx, cy);
  x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 30; x.shadowOffsetY = 14; x.fillStyle = '#3a2c14'; x.fillRect(-w / 2, -h / 2, w, h); x.shadowColor = 'transparent';
  const fg = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); fg.addColorStop(0, '#6d5326'); fg.addColorStop(.5, '#a8853f'); fg.addColorStop(1, '#4d3915');
  x.fillStyle = fg; x.fillRect(-w / 2, -h / 2, w, h);
  x.strokeStyle = 'rgba(20,12,2,.7)'; x.lineWidth = 4; x.strokeRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
  const iw = w - 44, ih = h - 44; x.save(); x.beginPath(); x.rect(-iw / 2, -ih / 2, iw, ih); x.clip();
  if (kind === 0) { // dusky landscape
    const g = x.createLinearGradient(0, -ih / 2, 0, ih / 2); g.addColorStop(0, '#2c3a44'); g.addColorStop(.55, '#55605a'); g.addColorStop(1, '#1d2419'); x.fillStyle = g; x.fillRect(-iw / 2, -ih / 2, iw, ih);
    x.fillStyle = '#1b2318'; x.beginPath(); x.moveTo(-iw / 2, ih * .15); for (let i = 0; i <= 10; i++) x.lineTo(-iw / 2 + iw * i / 10, ih * .12 - R() * ih * .2); x.lineTo(iw / 2, ih / 2); x.lineTo(-iw / 2, ih / 2); x.fill();
    x.fillStyle = 'rgba(230,210,160,.35)'; x.beginPath(); x.arc(iw * .2, -ih * .22, 14, 0, 7); x.fill();
  } else { // dark still life
    const g = x.createRadialGradient(0, 0, 10, 0, 0, ih * .8); g.addColorStop(0, '#4a3b2a'); g.addColorStop(1, '#16110b'); x.fillStyle = g; x.fillRect(-iw / 2, -ih / 2, iw, ih);
    x.fillStyle = '#2a2018'; x.fillRect(-iw / 2, ih * .2, iw, ih * .3);
    x.fillStyle = '#6b5a3a'; x.beginPath(); x.ellipse(-iw * .1, ih * .05, iw * .16, ih * .2, 0, 0, 7); x.fill();
    x.fillStyle = '#8a3a2a'; x.beginPath(); x.arc(iw * .2, ih * .16, iw * .08, 0, 7); x.fill();
  }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .06})`; x.fillRect((R() - .5) * iw, (R() - .5) * ih, 2, 2); }
  x.restore(); x.restore();
}
function makeGallery() {
  const [c, x] = mk(WW, WH); x.translate(-WX0, -WY0); const R = rng(96);
  // plaster wall
  let g = x.createLinearGradient(0, WY0, 0, FLOOR); g.addColorStop(0, '#161c25'); g.addColorStop(.5, '#222a35'); g.addColorStop(1, '#141920');
  x.fillStyle = g; x.fillRect(WX0, WY0, WW, FLOOR - WY0);
  for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .022})`; x.beginPath(); x.arc(WX0 + R() * WW, WY0 + R() * (FLOOR - WY0), 12 + R() * 70, 0, 7); x.fill(); }
  for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .035})`; x.fillRect(WX0 + R() * WW, WY0 + R() * (FLOOR - WY0), 2, 2); }
  // crown + picture rail
  x.fillStyle = '#0d1117'; x.fillRect(WX0, WY0, WW, 330); x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(WX0, -94, WW, 3);
  x.fillStyle = '#10151b'; x.fillRect(WX0, 404, WW, 16); x.fillStyle = 'rgba(220,230,245,.12)'; x.fillRect(WX0, 404, WW, 2);
  // hanging wires
  x.strokeStyle = 'rgba(190,200,215,.22)'; x.lineWidth = 1.6;
  for (const [cx, top, half] of [[PX, PY - FH / 2, FW * .3], [90, 760 - 160, 80], [1010, 720 - 150, 70]]) { x.beginPath(); x.moveTo(cx - 6, 418); x.lineTo(cx - half, top + 6); x.moveTo(cx + 6, 418); x.lineTo(cx + half, top + 6); x.stroke(); }
  // side artworks (generic, dim)
  smallPainting(x, 90, 760, 260, 320, 0, 5); smallPainting(x, 1010, 720, 240, 300, 1, 6);
  // soft cast shadow of the main frame
  x.save(); x.filter = 'blur(26px)'; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(PX - FW / 2 + 16, PY - FH / 2 + 30, FW, FH); x.restore();
  // dado rail + wainscot
  x.fillStyle = '#0f1318'; x.fillRect(WX0, 1110, WW, FLOOR - 1110); x.fillStyle = 'rgba(220,230,245,.1)'; x.fillRect(WX0, 1110, WW, 3);
  x.fillStyle = '#0a0d11'; x.fillRect(WX0, 1124, WW, 10);
  for (let px = WX0 + 20; px < WX0 + WW; px += 300) { x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 2; x.strokeRect(px, 1150, 260, 100); x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeRect(px + 3, 1153, 260, 100); }
  x.fillStyle = '#07090c'; x.fillRect(WX0, FLOOR - 22, WW, 22);
  // polished floor
  g = x.createLinearGradient(0, FLOOR, 0, WY0 + WH); g.addColorStop(0, '#1b1a1a'); g.addColorStop(.4, '#100f10'); g.addColorStop(1, '#060606'); x.fillStyle = g; x.fillRect(WX0, FLOOR, WW, WY0 + WH - FLOOR);
  x.strokeStyle = 'rgba(255,235,210,.05)'; x.lineWidth = 2;
  for (let i = 0, y = FLOOR + 8; y < WY0 + WH; i++, y += 16 + i * 9) { x.beginPath(); x.moveTo(WX0, y); x.lineTo(WX0 + WW, y); x.stroke(); }
  for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(540 + i * 70, FLOOR); x.lineTo(540 + i * 330, WY0 + WH); x.stroke(); }
  // reflection of the painting on the floor
  x.save(); x.beginPath(); x.rect(WX0, FLOOR, WW, 600); x.clip(); x.globalAlpha = .16; x.filter = 'blur(5px)';
  x.translate(0, FLOOR * 2 + 24); x.scale(1, -1); x.drawImage(T.portrait, IMG.x, IMG.y + (FLOOR - PY - FH / 2) * 2 + 90, IMG.w, IMG.h); x.drawImage(T.frame, PX - FW / 2, PY - FH / 2 + (FLOOR - PY - FH / 2) * 2 + 90, FW, FH); x.restore();
  g = x.createLinearGradient(0, FLOOR, 0, FLOOR + 600); g.addColorStop(0, 'rgba(6,6,6,0)'); g.addColorStop(1, 'rgba(6,6,6,1)'); x.fillStyle = g; x.fillRect(WX0, FLOOR, WW, 600);
  return c;
}
function makeCardBack() {
  const S = 2, [c, x] = mk(CARDW * S, CARDH * S); x.scale(S, S);
  x.fillStyle = '#e6dcc4'; x.fillRect(0, 0, CARDW, CARDH);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .4; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(0, 0, CARDW, CARDH); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.strokeStyle = 'rgba(70,50,20,.35)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(26, 60 + i * 26); x.lineTo(CARDW - 30 - hash(i) * 60, 60 + i * 26); x.stroke(); }
  return c;
}
function makeCardFront() {
  const S = 2, [c, x] = mk(CARDW * S, CARDH * S); x.scale(S, S);
  x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, CARDW, CARDH);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .35; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(0, 0, CARDW, CARDH); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#2a241c'; x.fillRect(CIMG.x - 1, CIMG.y - 1, CIMG.w + 2, CIMG.h + 2);
  text(x, '사라진 클림트 작품', CARDW / 2, CIMG.y + CIMG.h + 25, { size: 24, weight: 800, color: '#3a2c18' });
  return c;
}
function initG() {
  G = { bg: makeGallery(), back: makeCardBack(), front: makeCardFront() };
}

// ---------- helpers ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
function poseLerp(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
function ik(sx, sy, tx, ty, l1, l2, bend = 1) {
  const dx = tx - sx, dy = ty - sy, dd = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const phi = Math.atan2(dx, dy), al = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1)), be = Math.acos(clamp((l1 * l1 + l2 * l2 - dd * dd) / (2 * l1 * l2), -1, 1));
  return [phi + bend * al, -bend * (Math.PI - be)];
}
// Catmull-Rom through camera keys [t, x, y, z]
function camAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u;
  const out = [];
  for (let j = 1; j < 4; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}
function faceStroke(ctx, p, color, w, blur) {
  if (p <= 0) return; const pts = FACE.map(([u, v]) => tw(u, v));
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = blur;
  ctx.setLineDash([1000 * clamp(p), 2000]); ctx.beginPath(); smooth(ctx, pts); ctx.stroke(); ctx.restore();
}

// ---------- map (phase A) ----------
function drawMap(ctx, t, tDive, a) {
  const IT = ITALY_(); const mp = project(); const [pzx, pzy] = mp(9.69, 45.05);
  const push = E.inOutQ(P(t, .55, tDive + .05)), dive = E.inExpo(P(t, tDive, tDive + .42));
  const mz = (1 + .02 * t + .85 * push) * (1 + 13 * dive);
  const mcx = lerp(540, pzx, push * .92 + dive * .08), mcy = lerp(930, pzy + 30, push * .92 + dive * .08) - 30 * dive;
  ctx.save(); ctx.globalAlpha *= a;
  gradBG(ctx, [[0, '#05070c'], [.6, '#0a0f19'], [1, '#05070b']]);
  ctx.save(); ctx.translate(540, 960); ctx.scale(mz, mz); ctx.translate(-mcx, -mcy);
  const lw = 1 / Math.pow(mz, .75);
  // lat/long grid
  ctx.strokeStyle = 'rgba(120,150,190,.08)'; ctx.lineWidth = 1.5 * lw;
  for (let lo = 2; lo <= 22; lo++) { const [x0, y0] = mp(lo, 50), [x1, y1] = mp(lo, 34); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  for (let la = 34; la <= 50; la++) { const [x0, y0] = mp(2, la), [x1, y1] = mp(22, la); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  const mpP = P(t, .1, .95, E.inOutQ), dim = lerp(.45, 1, P(t, .45, .7));
  if (mpP > 0 && IT) {
    ctx.save(); ctx.globalAlpha *= dim;
    IT.forEach((ring, i) => {
      const pts = ring.map(([lo, la]) => mp(lo, la));
      ctx.save(); ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
      ctx.fillStyle = `rgba(217,169,58,${.09 * mpP})`; ctx.fill(); ctx.restore();
      pathReveal(ctx, pts, mpP, { color: K.gold, w: 3.5 * lw, glowC: 'rgba(255,200,90,.7)', head: i === 0 });
    });
    ctx.restore();
    // cities for orientation
    const cp = P(t, .7, .95);
    for (const [nm, lo, la, dx, dy] of [['Milano', 9.19, 45.46, -70, -4], ['Parma', 10.33, 44.80, 92, 56]]) {
      const [x, y] = mp(lo, la); ctx.save(); ctx.globalAlpha *= cp * .9 * (1 - dive); ctx.fillStyle = '#cfd6e2'; ctx.beginPath(); ctx.arc(x, y, 6 * lw, 0, 7); ctx.fill(); ctx.restore();
      text(ctx, nm, x + dx * lw, y + (-26 + dy) * lw, { size: 40 * lw, color: '#dfe6f0', weight: 800, alpha: cp * (1 - dive), stroke: '#000', strokeW: 6 * lw });
    }
  }
  ctx.restore();
  // Piacenza pin (screen space so it stays crisp), drops in on the thunk
  const sx = 540 + (pzx - mcx) * mz, sy = 960 + (pzy - mcy) * mz;
  const drop = P(t, .5, .68, E.inQ), mk2 = P(t, .62, .9);
  if (drop > 0 && dive < .6) {
    const yy = lerp(sy - 260, sy, drop);
    if (drop < 1) { ctx.save(); ctx.strokeStyle = rgba(K.red, .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, yy - 90); ctx.lineTo(sx, yy - 10); ctx.stroke(); ctx.restore(); }
    if (drop >= 1) { const q = P(t, .68, 1.1, E.outC); ctx.save(); ctx.strokeStyle = rgba(K.red, (1 - q) * .9); ctx.lineWidth = 6 * (1 - q) + 1; ctx.beginPath(); ctx.ellipse(sx, sy, 20 + 150 * q, (20 + 150 * q) * .55, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha *= 1 - P(dive, .2, .6); marker(ctx, sx, yy, t, 1, K.red); ctx.restore();
    ctx.save(); ctx.globalAlpha *= 1 - dive * 1.6; tag(ctx, '피아첸차 · 리치오디 미술관', sx, sy, mk2, { size: 42, dx: 150, dy: 130 }); ctx.restore();
  }
  // speed lines while diving
  if (dive > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const an = hash(i * 17) * 6.283, r0 = 120 + ((hash(i * 5) * 900 + t * 2600) % 900), r1 = r0 + 120 + 380 * dive;
      ctx.strokeStyle = rgba(i % 3 ? '#cfe0ff' : '#f6d77f', .35 * dive * hash(i * 3)); ctx.lineWidth = 2 + 3 * hash(i);
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(an) * r0, sy + Math.sin(an) * r0); ctx.lineTo(sx + Math.cos(an) * r1, sy + Math.sin(an) * r1); ctx.stroke();
    }
    ctx.restore();
    glow(ctx, sx, sy, 300 + 700 * dive, '#cfe0ff', .5 * dive);
  }
  ctx.restore();
}

// ---------- gallery (phase B) ----------
window.KL.scenes.y1996 = function (ctx, t, d, info) {
  if (!G) initG();
  const studentState = studentFn(info);
  const tY = at(info, '1996', .02), tS = at(info, '여고생이', .2), tG = at(info, '그림에서', .32), tO = at(info, '사라진', .5),
    tK = at(info, '클림트', .6), tF = at(info, '초상화를', .75), tA = at(info, '알아봤다', .86);
  const tDive = tS - .37;                                   // whoosh starts ~0.35s before 여고생이
  const tLand = tDive + .3;                                 // gallery appears under the flash

  // ---- phase A: year flap + map ----
  if (t < tLand + .2) drawMap(ctx, t, tDive, 1);
  // ---- phase B: gallery ----
  if (t >= tLand) {
    const arrive = P(t, tLand, tLand + .55, E.outExpo);
    const keys = [[tLand, 540, 930, .74], [tLand + .45, 545, 900, .95], [tG, 560, 850, 1.07], [tO + .05, 650, 790, 1.22], [tF - .1, 655, 782, 1.27],
      [tF + .2, 590, 760, 1.42], [tA + .2, 566, 748, 1.62], [d + .25, 560, 738, 1.92]];
    let [cx, cy, z] = camAt(keys, t);
    z += .018 * tri(t, tF + .08, tF + .4);                       // tiny punch on the match
    const dr = drift(t, .5, 7);
    const layer = (f) => { const zf = 1 + (z - 1) * f; ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (cx - 540) * f) - dr.x * f, -(960 + (cy - 960) * f) - dr.y * f); };
    const toScreen = (f, x, y) => { const zf = 1 + (z - 1) * f; return [W / 2 + (x - (540 + (cx - 540) * f) - dr.x * f) * zf, H / 2 + (y - (960 + (cy - 960) * f) - dr.y * f) * zf]; };
    const fromScreen = (f, sx, sy) => { const zf = 1 + (z - 1) * f; return [(sx - W / 2) / zf + 540 + (cx - 540) * f + dr.x * f, (sy - H / 2) / zf + 960 + (cy - 960) * f + dr.y * f]; };
    const cloud = .75 + .25 * fbm(t * .6, 4);                   // daylight drifting through the skylight

    ctx.save();
    ctx.globalAlpha = clamp((t - tLand) / .08);
    ctx.translate(W / 2, H / 2); ctx.rotate(dr.r); ctx.translate(-W / 2, -H / 2);
    // ---- wall layer ----
    ctx.save(); layer(1);
    ctx.fillStyle = '#05070a'; ctx.fillRect(WX0 - 2000, WY0 - 2000, WW + 4000, WH + 4000);
    ctx.drawImage(G.bg, WX0, WY0);
    godrays(ctx, 240, -380, Math.PI / 2 - .32, .55, 2300, '#bcd3ef', .055 * cloud, t, 7);
    godrays(ctx, 820, -380, Math.PI / 2 + .3, .45, 2200, '#bcd3ef', .035 * cloud, t + 3, 6);
    // picture light (brass bar) + warm wash on the painting
    const lampOn = .75 + .25 * P(t, tG - .1, tG + .2, E.outQ);
    { const ly = PY - FH / 2 - 44; ctx.fillStyle = '#2a2418'; ctx.fillRect(PX - 4, ly - 40, 8, 40); const bg = ctx.createLinearGradient(0, ly - 10, 0, ly + 12); bg.addColorStop(0, '#8a7448'); bg.addColorStop(1, '#2c2416');
      ctx.fillStyle = bg; roundRect(ctx, PX - 120, ly - 10, 240, 22, 8); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cg = ctx.createLinearGradient(0, ly, 0, PY + FH / 2 + 60); cg.addColorStop(0, `rgba(255,214,150,${.2 * lampOn})`); cg.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(PX - 110, ly + 10); ctx.lineTo(PX + 110, ly + 10); ctx.lineTo(PX + FW / 2 + 70, PY + FH / 2 + 60); ctx.lineTo(PX - FW / 2 - 70, PY + FH / 2 + 60); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // the painting
    ctx.drawImage(T.portrait, IMG.x, IMG.y, IMG.w, IMG.h);
    // ---- the b/w reproduction: lift from the book → hover → slide onto the painting → comparison wipe ----
    const fly = P(t, tO - .02, tO + .42), onto = P(t, tF - .06, tF + .14, E.inOutC);
    const wipeIn = P(t, tF + .16, tF + .5, E.inOutC), settle = P(t, tA - .05, tA + .5, E.outBack);
    if (fly > 0 || onto > 0) {
      // book position (student layer) → world
      const st = studentState(t); const [bsx, bsy] = toScreen(1.12, st.book[0], st.book[1]); const [bwx, bwy] = fromScreen(1, bsx, bsy);
      const cardAt = (q) => { // position/scale/rot along the flight
        const e = E.outBack(clamp(q), 1.1), qq = E.inOutQ(clamp(q));
        const mx = lerp(bwx, SIDE.x, .45), my = Math.min(bwy, SIDE.y) - 260;
        const u = qq, x = (1 - u) * (1 - u) * bwx + 2 * (1 - u) * u * mx + u * u * SIDE.x, y = (1 - u) * (1 - u) * bwy + 2 * (1 - u) * u * my + u * u * SIDE.y;
        return { x: lerp(x, SIDE.x, e - qq), y, s: lerp(.24, 1, e), r: lerp(-.5, SIDE.r, qq) + .05 * Math.sin(q * 9) * (1 - q), flip: lerp(-1, 1, E.inOutQ(clamp(q * 1.25))) };
      };
      const drawCard = (c, a, border, imgRect) => {
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.scale(c.s * (Math.abs(c.flip) < .02 ? .02 : c.flip), c.s);
        const w = CARDW, h = CARDH;
        if (c.flip < 0) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; ctx.drawImage(G.back, -w / 2, -h / 2, w, h); }
        else {
          ctx.save(); ctx.globalAlpha *= border; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; ctx.drawImage(G.front, -w / 2, -h / 2, w, h); ctx.restore();
          ctx.drawImage(T.oldphoto, -w / 2 + CIMG.x, -h / 2 + CIMG.y, CIMG.w, CIMG.h);
        }
        ctx.restore();
      };
      if (onto <= 0) {
        // motion trail while flying
        if (fly < 1) for (let k = 3; k >= 1; k--) { const q = fly - k * .07; if (q > 0) drawCard(cardAt(q), .12 * (4 - k), 1); }
        const c = cardAt(fly); drawCard(c, 1, 1);
        // glint across the reproduction on "클림트"
        const gl = P(t, tK - .05, tK + .4);
        if (gl > 0 && gl < 1) {
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.beginPath(); ctx.rect(-CARDW / 2, -CARDH / 2, CARDW, CARDH); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
          const gx = lerp(-CARDW, CARDW, gl); const gg = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0); gg.addColorStop(0, 'rgba(246,215,127,0)'); gg.addColorStop(.5, 'rgba(246,215,127,.55)'); gg.addColorStop(1, 'rgba(246,215,127,0)');
          ctx.rotate(.35); ctx.fillStyle = gg; ctx.fillRect(-CARDW * 1.5, -CARDH, CARDW * 3, CARDH * 2); ctx.restore();
        }
        if (gl > 0) brackets(ctx, c.x - CARDW / 2 - 12, c.y - CARDH / 2 - 12, CARDW + 24, CARDH + 24, gl * 2, K.goldHi, 30, 5);
        // face ↔ face match lines on the comparison beat
        const ml = P(t, tK + .12, tF - .08, E.inOutQ);
        if (ml > 0) {
          const [fx, fy] = tw(312, 290); const pcx = c.x + (-CARDW / 2 + CIMG.x + 312 / 600 * CIMG.w) * c.s, pcy = c.y + (-CARDH / 2 + CIMG.y + 290 / 700 * CIMG.h) * c.s;
          ctx.save(); ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; ctx.shadowColor = K.gold; ctx.shadowBlur = 14;
          for (const off of [-34, 0, 34]) { ctx.beginPath(); ctx.moveTo(pcx, pcy + off * .6); ctx.lineTo(lerp(pcx, fx, ml), lerp(pcy + off * .6, fy + off, ml)); ctx.stroke(); }
          ctx.setLineDash([]); ctx.globalAlpha *= ml; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(fx, fy, 74, 96, -.05, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(pcx, pcy, 50, 64, -.05, 0, 7); ctx.stroke(); ctx.restore();
        }
      } else {
        // slide & scale so the reproduction's picture lands exactly on the painting
        const c0 = cardAt(1); const s0 = c0.s;
        const ix0 = c0.x + (-CARDW / 2 + CIMG.x) * s0, iy0 = c0.y + (-CARDH / 2 + CIMG.y) * s0;
        const ix = lerp(ix0, IMG.x, onto), iy = lerp(iy0, IMG.y, onto), iw = lerp(CIMG.w * s0, IMG.w, onto), ih = lerp(CIMG.h * s0, IMG.h, onto);
        const rr = lerp(c0.r, 0, onto), sc = iw / CIMG.w;
        ctx.save(); ctx.translate(ix + iw / 2, iy + ih / 2); ctx.rotate(rr);
        // paper border fades as it lands
        ctx.save(); ctx.globalAlpha *= 1 - P(onto, .3, 1); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.drawImage(G.front, -iw / 2 - CIMG.x * sc, -ih / 2 - CIMG.y * sc, CARDW * sc, CARDH * sc); ctx.restore();
        // picture, clipped by the comparison wipe once it has landed
        const wx = lerp(IMG.x + IMG.w + 2, tw(316, 0)[0], wipeIn) + 9 * Math.sin((t - tA) * 7) * Math.exp(-Math.max(0, t - tA) * 2.5) * (t > tA ? 1 : 0);
        ctx.beginPath(); ctx.rect(-iw / 2 - 40, -ih / 2 - 40, onto < 1 ? iw + 80 : (wx - IMG.x) + 40, ih + 80); ctx.clip();
        ctx.drawImage(T.oldphoto, -iw / 2, -ih / 2, iw, ih);
        ctx.restore();
        if (onto >= 1) {
          // wipe line
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(wx - 26, 0, wx + 26, 0); lg.addColorStop(0, 'rgba(246,215,127,0)'); lg.addColorStop(.5, 'rgba(246,215,127,.5)'); lg.addColorStop(1, 'rgba(246,215,127,0)');
          ctx.fillStyle = lg; ctx.fillRect(wx - 26, IMG.y - 18, 52, IMG.h + 36); ctx.restore();
          ctx.save(); ctx.fillStyle = '#fff4d0'; ctx.shadowColor = K.goldHi; ctx.shadowBlur = 16; ctx.fillRect(wx - 2, IMG.y - 18, 4, IMG.h + 36);
          for (const yy of [IMG.y - 18, IMG.y + IMG.h + 18]) { ctx.beginPath(); ctx.moveTo(wx, yy - 10); ctx.lineTo(wx + 9, yy); ctx.lineTo(wx, yy + 10); ctx.lineTo(wx - 9, yy); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
      }
    }
    // gold frame on top of everything painted inside it
    ctx.drawImage(T.frame, PX - FW / 2, PY - FH / 2, FW, FH);
    glow(ctx, PX, PY - 30, 430, '#e8cf8e', .1 * lampOn);
    // "same face" lock-on when the faces coincide (bell)
    const lock = P(t, tF + .1, tF + .55);
    if (lock > 0) {
      const ring = P(t, tF + .1, tF + .7, E.outC), [fx, fy] = tw(318, 300);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(K.goldHi, (1 - ring) * .9); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(fx, fy, 70 + 160 * ring, 90 + 190 * ring, 0, 0, 7); ctx.stroke(); ctx.restore();
      faceStroke(ctx, lock, rgba(K.goldHi, .9 * (1 - .5 * P(t, tA + .6, d))), 3.5, 18);
      const ep = P(t, tF + .35, tF + .6, E.outBack);
      if (ep > 0) for (const [u, v, r] of [[293, 279, 20], [272, 362, 22]]) { const [ex, ey] = tw(u, v); ctx.save(); ctx.strokeStyle = rgba(K.goldHi, .85); ctx.lineWidth = 2.5; ctx.shadowColor = K.gold; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(ex, ey, r * ep, 0, 7); ctx.stroke(); ctx.restore(); }
      glow(ctx, fx, fy, 260, K.goldHi, .35 * tri(t, tF + .05, tF + .5));
    }
    // brackets on "이 그림에서"
    const brp = P(t, tG - .05, tG + .3) * (1 - P(t, tO + .2, tO + .5));
    if (brp > 0) brackets(ctx, PX - FW / 2 - 24, PY - FH / 2 - 24, FW + 48, FH + 48, brp, K.goldHi, 46, 6);
    motes(ctx, t, { n: 50, color: '#dfe9ff', a: .35 * cloud, area: [-100, 0, 1300, 1300], size: 2.6, speed: 14, seed: 41 });
    motes(ctx, t, { n: 24, color: '#ffe0a0', a: .5 * lampOn, area: [PX - 260, PY - 320, 520, 640], size: 2.2, speed: 10, seed: 43 });
    ctx.restore();

    // ---- student layer ----
    ctx.save(); layer(1.12);
    { const st = studentState(t);
      // pointing arm: target the face of the painting, mapped into this layer
      const [fsx, fsy] = toScreen(1, ...tw(300, 300)); const [fx, fy] = fromScreen(1.12, fsx, fsy);
      const u = STU.h / 8, shX = .95 * u * .9, shY = -6.6 * u;
      const dx = fx - st.x - shX, dy = fy - STU.y - shY, dl = Math.hypot(dx, dy), ext = 2.8 * u * .93;
      const point = ik(shX, shY, shX + dx / dl * ext, shY + dy / dl * ext, 1.45 * u, 1.35 * u, -1);
      const pk = E.outBack(P(t, tA - .12, tA + .22), 1.5), pdip = tri(t, tA - .3, tA - .1) * .2;
      const armR = poseLerp(st.armR, point, pk); armR[0] -= pdip;
      const o = { female: true, hair: 'long', face: 1, headTurn: .7, fill: '#05070a', shadow: false, lean: st.lean, armL: st.armL, armR, walk: st.walk, stride: st.stride };
      // warm bounce from the painting on her front edge, cool skylight rim on top
      ctx.save(); ctx.globalAlpha *= .9; F.figure(ctx, st.x + 4, STU.y - 2, STU.h, Object.assign({}, o, { fill: rgba('#ffcf8a', .55 * lampOn), shadow: false })); ctx.restore();
      F.figure(ctx, st.x, STU.y, STU.h, Object.assign({}, o, { rim: rgba('#a9c8ff', .8 * cloud), rimX: -3, rimY: -5, rimBlur: 9 }));
      // soft contact shadow
      const sg = ctx.createRadialGradient(st.x, STU.y, 4, st.x, STU.y, 150); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(st.x, STU.y); ctx.scale(1, .18); ctx.translate(-st.x, -STU.y); ctx.fillStyle = sg; ctx.fillRect(st.x - 150, STU.y - 150, 300, 300); ctx.restore();
      // the book
      drawBook(ctx, t, st);
    }
    ctx.restore();
    ctx.restore();

    // focus falloff toward the painting + gentle breathing vignette
    const [psx, psy] = toScreen(1, PX, PY);
    darkness(ctx, psx, psy + 60, 1000 + 120 * Math.sin(t * .9), .62, .3);

    // labels (screen space)
    const cA = P(t, tS + .1, tS + .4) * (1 - P(t, tK - .1, tK + .15));
    if (cA > 0) {
      const st = studentState(t); const u = STU.h / 8; const [hx, hy] = toScreen(1.12, st.x, STU.y - 6.9 * u);
      const ly = 1186, lx = 540;
      ctx.save(); ctx.globalAlpha *= cA; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(clamp(hx, 60, 1020) + 30, hy + 60); ctx.lineTo(lx - 240, ly - 34); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(lx, ly + 20 * (1 - E.outBack(cA))); chip(ctx, '1996 · 고교생 클라우디아 마가', 0, 0, cA, { size: 36 }); ctx.restore();
    }
    const lA = P(t, tA + .02, tA + .32, E.outBack);
    if (lA > 0) {
      ctx.save(); ctx.translate(540, 1186); ctx.scale(lerp(.6, 1, clamp(lA)), lerp(.6, 1, clamp(lA)));
      label(ctx, '사라진 클림트 〈Backfisch〉와 같은 얼굴', 0, 0, { size: 40, color: '#1a1408', bg: K.goldHi, a: clamp(lA * 1.5), padX: 26, padY: 14 });
      ctx.restore();
    }
  }
  // landing flash between map and gallery
  const fl = tri(t, tLand - .16, tLand + .3);
  if (fl > 0) flash(ctx, fl * .8, '#dbe7ff');
  // ---- year flap: big, then docks as a header (on the thunk), leaves with the dive ----
  const dock = E.outBack(P(t, .52, .8), 1.2), fa = 1 - P(t, tDive + .05, tDive + .3);
  if (fa > 0) {
    ctx.save(); ctx.globalAlpha *= fa; ctx.translate(540, lerp(840, 528, dock)); const sc = lerp(1, .52, dock) * (1 + .05 * tri(t, .38, .6)); ctx.scale(sc, sc);
    flap(ctx, '1996', 0, 0, t, -.02, { size: 150, roll: .24, lock: .06 });
    ctx.restore();
  }
};

function drawBook(ctx, t, st) {
  const [bx, by] = st.book; const u = STU.h / 8, w = .95 * u, h = 1.25 * u, op = st.open;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(st.bookRot || 0);
  if (op <= .02) { ctx.fillStyle = '#16120c'; ctx.fillRect(-w * .2, -h / 2, w * .4, h); ctx.fillStyle = rgba('#a9c8ff', .5); ctx.fillRect(-w * .2, -h / 2, w * .4, 2); }
  else {
    const pw = w * op;
    ctx.fillStyle = '#d9cfb6'; ctx.beginPath(); ctx.moveTo(0, -h * .42); ctx.lineTo(-pw, -h * .5); ctx.lineTo(-pw, h * .38); ctx.lineTo(0, h * .45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8dfc8'; ctx.beginPath(); ctx.moveTo(0, -h * .42); ctx.lineTo(pw, -h * .5); ctx.lineTo(pw, h * .38); ctx.lineTo(0, h * .45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,20,.45)'; ctx.fillRect(pw * .2, -h * .3, pw * .6, h * .4);
    ctx.restore(); glow(ctx, bx, by, 120 * op, '#ffe6b0', .35 * op * st.glowK); return;
  }
  ctx.restore();
}

// student animation: walk in, stop before the painting, open the book, lower it (pointing is layered on top)
function studentFn(info) {
  const tS = at(info, '여고생이', .2), tG = at(info, '그림에서', .32), tO = at(info, '사라진', .5), tA = at(info, '알아봤다', .86);
  const t0 = tS - .3, t1 = tG + .15, X0 = -170, X1 = 292, u = STU.h / 8;
  return function (tt) {
    const p = clamp((tt - t0) / (t1 - t0)), e = 1 - Math.pow(1 - p, 2.2);
    const x = lerp(X0, X1, e), dist = (X1 - X0) * e, speed = (X1 - X0) * 2.2 * Math.pow(1 - p, 1.2) / (t1 - t0);
    const moving = clamp(speed / 520);
    const walk = dist / 330 * Math.PI, stride = .4 * moving;
    const openK = E.inOutQ(P(tt, tO - .32, tO - .04)) * (1 - E.inOutQ(P(tt, tO + .55, tO + .95)));
    const swing = Math.sin(walk) * stride * .8;
    const armL = poseLerp([.12 - swing * .5, -.55], [.62, -.95], openK), armR = poseLerp([-swing + .05, .15], [.4, -1.05], openK);
    const sh = [-.855 * u, -6.6 * u], e1 = [sh[0] + Math.sin(armL[0]) * 1.45 * u, sh[1] + Math.cos(armL[0]) * 1.45 * u];
    const hand = [e1[0] + Math.sin(armL[0] + armL[1]) * 1.35 * u, e1[1] + Math.cos(armL[0] + armL[1]) * 1.35 * u];
    const lean = -.02 * P(tt, t1 - .1, t1 + .5, E.inOutQ) + .025 * tri(tt, tA - .05, tA + .45) - .01 * tri(tt, tA - .3, tA - .05) + .015 * moving;
    const bob = Math.abs(Math.sin(walk)) * u * .08;
    return { x, walk, stride, lean, armL, armR, open: E.outBack(P(tt, tO - .2, tO + .05)) * (1 - P(tt, tO + .55, tO + .8)), glowK: 1 - P(tt, tO + .3, tO + .8),
      book: [x + hand[0] + .25 * u, STU.y + hand[1] - .15 * u + bob], bookRot: lerp(.25, 0, openK) };
  };
}
})();
