// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "당시 관리인 조사도 증거 없이 끝났다."
// Neutral documentary staging (per the fact check: no figure, no red light on the custodian, just paperwork closing):
// a case folder drops onto a desk under a swaying lamp (slam) → "1997 · 관리인 조사" header, the year is highlighted (당시)
// → the cover swings open (thunk) → a neutral profile card slides in and is clipped on (관리인)
// → the form fills with typed lines (조사도) → a loupe swoops onto the evidence field (whoosh, 증거): the box is empty, "없음" is typed (없이)
// → a rubber stamp comes down with anticipation and lands "종결" (stamp, 끝났다) → approved chip "증거 불충분 → 종결"
// → the cover starts to close as the scene hands over.
// ---------------------------------------------------------------------------
const PG = { x: 300, y: 560, w: 500, h: 660 };                 // the form page (world coords; camera centred near 560,960)
const CARD = { x: 28, y: 100, w: 170, h: 210 };                  // profile card slot (page coords)
const EVB = { x: 28, y: 476, w: 444, h: 150 };                   // evidence box (page coords)
const STP = { x: 322, y: 256, r: -.16 };                         // where the stamp lands (page coords)
let S = null;

// ---------- sprites ----------
function inkText(x, s, px, py, size, o = {}) { text(x, s, px, py, Object.assign({ size, color: '#2b2116', weight: 800, align: 'left' }, o)); }
function makeDesk() {
  const [c, x] = mk(1500, 2400); x.translate(210, 240); const R = rng(301);   // covers world (-210,-240)..(1290,2160)
  let g = x.createLinearGradient(0, -240, 0, 2160); g.addColorStop(0, '#1a120c'); g.addColorStop(.5, '#22170f'); g.addColorStop(1, '#0c0806'); x.fillStyle = g; x.fillRect(-210, -240, 1500, 2400);
  // wood grain
  x.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const y0 = -240 + i * 27 + R() * 12; x.strokeStyle = `rgba(${R() < .5 ? '255,214,170' : '0,0,0'},${.03 + R() * .05})`; x.lineWidth = 1 + R() * 3;
    x.beginPath(); x.moveTo(-210, y0); for (let k = 0; k <= 10; k++) x.lineTo(-210 + k * 150, y0 + Math.sin(k * .8 + i) * 8 + (R() - .5) * 6); x.stroke();
  }
  for (let i = 0; i < 14; i++) { const X = -150 + R() * 1400, Y = -200 + R() * 2300; x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.beginPath(); x.ellipse(X, Y, 30 + R() * 50, 8 + R() * 10, 0, 0, 7); x.stroke(); }
  // out-of-focus props around the folder (blurred once)
  const [pc, px] = mk(1500, 2400); px.translate(210, 240);
  // stack of old folders, top-left
  for (let k = 0; k < 4; k++) { px.save(); px.translate(70 + k * 6, 330 - k * 10); px.rotate(-.12 + k * .05); px.fillStyle = ['#8a6c40', '#9b7b4a', '#7d6038', '#a98a58'][k]; px.fillRect(-170, -120, 340, 240); px.fillStyle = 'rgba(240,230,210,.35)'; px.fillRect(-120, -80, 150, 34); px.restore(); }
  // coffee cup (top view), right
  px.fillStyle = '#4a423a'; px.beginPath(); px.arc(1010, 470, 92, 0, 7); px.fill(); px.fillStyle = '#1a100a'; px.beginPath(); px.arc(1010, 470, 72, 0, 7); px.fill();
  px.fillStyle = 'rgba(255,240,220,.25)'; px.beginPath(); px.ellipse(990, 448, 30, 12, -.5, 0, 7); px.fill(); px.strokeStyle = '#4a423a'; px.lineWidth = 22; px.beginPath(); px.arc(1112, 470, 30, -1.2, 1.2); px.stroke();
  // loose papers bottom-right, a pen bottom-left, paper clips
  px.save(); px.translate(1030, 1350); px.rotate(.22); px.fillStyle = '#d8cfbd'; px.fillRect(-180, -230, 360, 460); px.fillStyle = 'rgba(40,30,20,.25)'; for (let i = 0; i < 9; i++) px.fillRect(-150, -190 + i * 40, 260 - R() * 80, 8); px.restore();
  px.save(); px.translate(150, 1390); px.rotate(-.6); px.fillStyle = '#121212'; roundRect(px, -170, -11, 340, 22, 11); px.fill(); px.fillStyle = '#b08d47'; px.fillRect(110, -11, 26, 22); px.fillStyle = 'rgba(255,255,255,.25)'; px.fillRect(-150, -7, 240, 3); px.restore();
  px.strokeStyle = '#9aa0a6'; px.lineWidth = 4; for (const [X, Y, r] of [[200, 1080, .4], [930, 820, -.8]]) { px.save(); px.translate(X, Y); px.rotate(r); roundRect(px, -24, -8, 48, 16, 8); px.stroke(); roundRect(px, -16, -4, 34, 9, 5); px.stroke(); px.restore(); }
  x.save(); x.filter = 'blur(5px)'; x.drawImage(pc, -210, -240); x.restore();
  return c;
}
function makePage() {
  const SC = 2, [c, x] = mk(PG.w * SC, PG.h * SC); x.scale(SC, SC);
  x.fillStyle = '#ece5d3'; x.fillRect(0, 0, PG.w, PG.h);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .35; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(0, 0, PG.w, PG.h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const vg = x.createRadialGradient(PG.w / 2, PG.h / 2, 120, PG.w / 2, PG.h / 2, 460); vg.addColorStop(0, 'rgba(120,90,40,0)'); vg.addColorStop(1, 'rgba(110,80,30,.22)'); x.fillStyle = vg; x.fillRect(0, 0, PG.w, PG.h);
  // header
  text(x, '1997 · 관리인 조사', PG.w / 2, 46, { size: 34, weight: 900, color: '#2b2116' });
  x.fillStyle = 'rgba(43,33,22,.75)'; x.fillRect(28, 76, PG.w - 56, 3); x.fillRect(28, 82, PG.w - 56, 1);
  // card slot + ruled lines
  x.strokeStyle = 'rgba(60,45,25,.25)'; x.lineWidth = 1.5; x.setLineDash([5, 5]); x.strokeRect(CARD.x, CARD.y, CARD.w, CARD.h); x.setLineDash([]);
  x.strokeStyle = 'rgba(60,45,25,.16)'; x.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(222, 140 + i * 32); x.lineTo(PG.w - 28, 140 + i * 32); x.stroke(); }
  for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(28, 362 + i * 32); x.lineTo(PG.w - 28, 362 + i * 32); x.stroke(); }
  // evidence field
  inkText(x, '증거', EVB.x + 2, EVB.y - 20, 34, { weight: 900, base: 'middle' });
  x.strokeStyle = 'rgba(43,33,22,.6)'; x.lineWidth = 2.5; x.setLineDash([12, 8]); x.strokeRect(EVB.x, EVB.y, EVB.w, EVB.h); x.setLineDash([]);
  // punch holes + fold
  x.fillStyle = 'rgba(20,14,8,.55)'; for (const yy of [160, 500]) { x.beginPath(); x.arc(12, yy, 6, 0, 7); x.fill(); }
  return c;
}
function makeCard() {
  const SC = 2, [c, x] = mk(CARD.w * SC, CARD.h * SC); x.scale(SC, SC);
  x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, CARD.w, CARD.h);
  x.fillStyle = '#a8adb2'; x.fillRect(14, 14, CARD.w - 28, 130);
  const g = x.createLinearGradient(0, 14, 0, 144); g.addColorStop(0, '#b9bec3'); g.addColorStop(1, '#93989e'); x.fillStyle = g; x.fillRect(14, 14, CARD.w - 28, 130);
  // neutral avatar (no face, no features)
  x.fillStyle = '#6c7278'; x.beginPath(); x.arc(CARD.w / 2, 62, 26, 0, 7); x.fill(); x.beginPath(); x.ellipse(CARD.w / 2, 142, 52, 46, 0, Math.PI, 0); x.fill();
  text(x, '관리인', CARD.w / 2, 168, { size: 26, weight: 900, color: '#2b2116' });
  x.fillStyle = 'rgba(43,33,22,.35)'; x.fillRect(30, 190, CARD.w - 60, 3);
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.strokeRect(.5, .5, CARD.w - 1, CARD.h - 1);
  return c;
}
function makeCover(inner) {
  const w = PG.w + 12, h = PG.h + 12, SC = 1.5, [c, x] = mk(Math.round(w * SC), Math.round(h * SC)); x.scale(SC, SC);
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, inner ? '#d2b47a' : '#c6a466'); g.addColorStop(1, inner ? '#bf9d62' : '#a98848'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .3; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.strokeStyle = 'rgba(80,55,20,.35)'; x.lineWidth = 2; x.strokeRect(8, 8, w - 16, h - 16);
  if (!inner) {
    // label sticker with the approved header
    x.save(); x.translate(w / 2, 150); x.rotate(-.02); x.fillStyle = '#efe9da'; x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 6; x.fillRect(-200, -52, 400, 104); x.shadowColor = 'transparent';
    x.strokeStyle = 'rgba(60,40,15,.5)'; x.lineWidth = 2; x.strokeRect(-190, -42, 380, 84);
    text(x, '1997 · 관리인 조사', 0, 2, { size: 38, weight: 900, color: '#2b2116' }); x.restore();
    x.fillStyle = 'rgba(70,45,15,.25)'; for (let i = 0; i < 4; i++) x.fillRect(60, 300 + i * 26, 220 - i * 30, 6);
  } else {
    // inner pocket
    x.fillStyle = 'rgba(120,90,45,.25)'; x.beginPath(); x.moveTo(20, h - 200); x.lineTo(w - 20, h - 260); x.lineTo(w - 20, h - 20); x.lineTo(20, h - 20); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(80,55,20,.35)'; x.lineWidth = 2; x.stroke();
  }
  return c;
}
function makeStampMark() {
  const Wd = 420, Hd = 220, [c, x] = mk(Wd, Hd); x.translate(Wd / 2, Hd / 2);
  x.fillStyle = '#c81e28'; x.strokeStyle = '#c81e28';
  setF(x, 112); x.textAlign = 'center'; x.textBaseline = 'middle'; x.letterSpacing = '18px'; x.fillText('종결', 10, 8);
  x.lineWidth = 11; roundRect(x, -190, -96, 380, 192, 14); x.stroke(); x.lineWidth = 4; roundRect(x, -172, -80, 344, 160, 10); x.stroke();
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; const R = rng(91);
  for (let i = 0; i < 900; i++) { x.globalAlpha = R() * .75; x.beginPath(); x.arc(R() * Wd, R() * Hd, R() * 3.5 + .4, 0, 7); x.fill(); }
  for (let i = 0; i < 6; i++) { x.globalAlpha = .35; x.fillRect(0, R() * Hd, Wd, 2 + R() * 4); }
  return c;
}
function setF(x, size) { x.font = `400 ${size}px "${FONT.disp}"`; }
function makeShadow() { const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; x.fillRect(50, 50, 156, 156); return c; }
function makePuff() { const [c, x] = mk(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(235,212,178,.55)'); g.addColorStop(.5, 'rgba(235,212,178,.18)'); g.addColorStop(1, 'rgba(235,212,178,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; }
function initS() {
  S = { desk: makeDesk(), page: makePage(), card: makeCard(), coverOut: makeCover(false), coverIn: makeCover(true), mark: makeStampMark(), shadow: makeShadow(), puff: makePuff() };
  const [, mx] = mk(8, 8); const full = measure(mx, '1997 · 관리인 조사', 38), yr = measure(mx, '1997', 38);
  S.yr = { x0: (PG.w + 12) / 2 - full / 2 - 4, w: yr + 8 };                  // where "1997" sits on the cover sticker (cover coords)
}

// ---------- helpers ----------
function softShadow(ctx, x, y, w, h, a) { const k = 50 / 156; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(S.shadow, x - w * k, y - h * k, w * 256 / 156, h * 256 / 156); ctx.restore(); }
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
// typed lines: [y, x0, x1, t0]
const LINES = [[140, 222, 470], [172, 222, 452], [204, 222, 470], [236, 222, 430], [268, 222, 470], [300, 222, 400], [362, 28, 470], [394, 28, 455], [426, 28, 340]];
function typedLines(ctx, t, tT) {
  ctx.fillStyle = 'rgba(38,30,20,.78)';
  LINES.forEach(([y, x0, x1], i) => {
    const t0 = tT - .06 + i * .045, q = clamp((t - t0) / .2); if (q <= 0) return;
    const R = rng(500 + i); let x = x0; const xe = lerp(x0, x1, q);
    while (x < xe) { const ww = 18 + R() * 46; const w2 = Math.min(ww, xe - x); if (w2 > 1) ctx.fillRect(x, y - 15, w2, 9); x += ww + 8 + R() * 4; }
    if (q < 1) { ctx.save(); ctx.fillStyle = 'rgba(38,30,20,.9)'; ctx.fillRect(xe + 2, y - 19, 4, 16); ctx.restore(); }
  });
}
// the page with its dynamic contents, in page coordinates
function drawPage(ctx, t, st) {
  ctx.drawImage(S.page, 0, 0, PG.w, PG.h);
  typedLines(ctx, t, st.tT);
  // "없음" typed into the evidence box
  const n = st.none;
  if (n > 0) { const s = n < .5 ? '없' : '없음'; const pop = 1 + .25 * Math.max(0, 1 - (n < .5 ? n * 4 : (n - .5) * 4));
    ctx.save(); ctx.translate(EVB.x + EVB.w / 2, EVB.y + EVB.h / 2 + 4); ctx.scale(pop, pop); text(ctx, s, 0, 0, { size: 54, family: FONT.serif, weight: 900, color: 'rgba(48,36,24,.88)' }); ctx.restore(); }
  // the stamp mark (ink, multiplied into the paper)
  if (st.mark > 0) {
    ctx.save(); ctx.translate(STP.x, STP.y); ctx.rotate(STP.r); const sc = 1 + .05 * (1 - st.mark);
    ctx.scale(sc * .86, sc * .86); ctx.globalAlpha *= .92 * st.mark; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(S.mark, -210, -110);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha *= .35; ctx.drawImage(S.mark, -210, -110); ctx.restore();
  }
  // profile card + paperclip
  if (st.card > 0) {
    const k = st.card, e = E.outBack(k, 1.3);
    const cx = lerp(PG.w + 320, CARD.x, e), cy = lerp(CARD.y + 120, CARD.y, E.outC(k)), rot = lerp(.5, -.025, E.outC(k));
    ctx.save(); ctx.translate(cx + CARD.w / 2, cy + CARD.h / 2); ctx.rotate(rot);
    softShadow(ctx, -CARD.w / 2 + 6, -CARD.h / 2 + 10, CARD.w, CARD.h, .5 + .3 * (1 - k));
    ctx.drawImage(S.card, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h);
    ctx.restore();
    const cl = st.clip; if (cl > 0) { // paperclip snaps on
      const s = lerp(1.4, 1, E.outBack(cl, 2)); ctx.save(); ctx.translate(CARD.x + 52, CARD.y - 6); ctx.rotate(-.04); ctx.scale(s, s); ctx.globalAlpha *= clamp(cl * 3);
      ctx.strokeStyle = '#9ea6ad'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
      ctx.beginPath(); ctx.moveTo(-8, 44); ctx.lineTo(-8, -10); ctx.arc(4, -10, 12, Math.PI, 0); ctx.lineTo(16, 56); ctx.arc(6, 56, 10, 0, Math.PI); ctx.lineTo(-4, 6); ctx.stroke();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, 30); ctx.lineTo(-9, -6); ctx.stroke(); ctx.restore();
    }
  }
}
// rubber stamp seen from above: base block + knob; hgt = height above the paper (0 = contact)
function stampTool(ctx, x, y, rot, hgt, a) {
  if (a <= 0) return;
  const sc = 1 + hgt * .55;
  // shadow on the paper (moves away and softens as it rises)
  softShadow(ctx, x - 150 + hgt * 70, y - 80 + hgt * 110, 300, 160, .55 * a / (1 + hgt * 1.4));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  // base block (wood) with red rubber edge
  ctx.fillStyle = '#7a1218'; roundRect(ctx, -158, -86, 316, 172, 12); ctx.fill();
  const g = ctx.createLinearGradient(-150, -80, 150, 80); g.addColorStop(0, '#6e4a2a'); g.addColorStop(.5, '#4e331c'); g.addColorStop(1, '#2e1d0f'); ctx.fillStyle = g; roundRect(ctx, -150, -80, 300, 160, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,170,.12)'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-140, -60 + i * 24); ctx.bezierCurveTo(-40, -66 + i * 24, 40, -54 + i * 24, 140, -60 + i * 24); ctx.stroke(); }
  // neck + knob, offset toward the viewer (it is nearer the camera)
  ctx.translate(-8, -14);
  ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.ellipse(0, 0, 44, 40, 0, 0, 7); ctx.fill();
  const kg = ctx.createRadialGradient(-18, -22, 6, 0, 0, 74); kg.addColorStop(0, '#a77a4c'); kg.addColorStop(.55, '#5e3d20'); kg.addColorStop(1, '#24170b');
  ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(-6, -10, 66, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,235,200,.28)'; ctx.beginPath(); ctx.ellipse(-26, -34, 22, 12, -.6, 0, 7); ctx.fill();
  ctx.restore();
}
function loupe(ctx, x, y, r, rot, drawInside) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.translate(x, y); ctx.scale(1.75, 1.75); ctx.translate(-x, -y); drawInside(ctx); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x - r * .4, y - r * .45, 0, x - r * .4, y - r * .45, r * .9); lg.addColorStop(0, 'rgba(255,245,225,.22)'); lg.addColorStop(1, 'rgba(255,245,225,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(r * 1.02, 0); ctx.lineTo(r * 2.05, 0); ctx.stroke();
  ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(r * 1.25, 0); ctx.lineTo(r * 2.0, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 1.3, -7); ctx.lineTo(r * 1.95, -7); ctx.stroke();
  const rg = ctx.createLinearGradient(-r, -r, r, r); rg.addColorStop(0, '#d8b46a'); rg.addColorStop(.5, '#6e5022'); rg.addColorStop(1, '#c79f55');
  ctx.strokeStyle = rg; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 9, 3.5, 4.7); ctx.stroke();
  ctx.restore();
}
function camAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < k1.length; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}

// ---------- the scene ----------
window.KL.scenes.staff = function (ctx, t, d, info) {
  if (!S) initS();
  const tD = at(info, '당시', .04), tC = at(info, '관리인', .2), tT = at(info, '조사도', .35), tE = at(info, '증거', .5), tN = at(info, '없이', .6), tK = at(info, '끝났다', .7);
  const tSlam = .08, tOpen0 = .25, tOpen1 = .45, tStamp = tK + .02;

  // ---- folder drop + impacts ----
  const fall = P(t, -.3, tSlam, E.inQ);                                  // folder falling onto the desk
  const slamK = t > tSlam ? Math.exp(-(t - tSlam) * 9) : 0, stampK = t > tStamp ? Math.exp(-(t - tStamp) * 10) : 0;
  const squash = 1 - .018 * Math.sin(clamp((t - tSlam) / .18) * Math.PI) * (t > tSlam ? 1 : 0) - .012 * Math.sin(clamp((t - tStamp) / .16) * Math.PI) * (t > tStamp ? 1 : 0);
  const fScale = lerp(1.32, 1, fall) * squash, fRot = lerp(-.13, -.022, fall) + .006 * Math.sin(t * 1.3);

  // ---- camera ----
  const keys = [[-.3, 550, 930, .93], [.3, 552, 945, 1.0], [.62, 558, 950, 1.04], [tT + .05, 572, 960, 1.1], [tE + .05, 566, 985, 1.17], [tK - .1, 566, 968, 1.11], [d + .3, 562, 980, 1.19]];
  const [cx, cy, cz] = camAt(keys, t);
  const dr = drift(t, .6, 33), shk = slamK * 1.0 + stampK * 1.3;
  ctx.save();
  camera(ctx, { x: cx + dr.x, y: cy + dr.y, zoom: cz * (1 + .012 * stampK), rot: dr.r + .004 * Math.sin(t * .7), shake: shk * .55, t, seed: 4 });

  // ---- desk ----
  ctx.drawImage(S.desk, -210, -240);

  // ---- folder ----
  const fcx = PG.x + PG.w / 2, fcy = PG.y + PG.h / 2;
  ctx.save(); ctx.translate(fcx, fcy); ctx.rotate(fRot); ctx.scale(fScale, fScale); ctx.translate(-fcx, -fcy);
  // drop shadow grows tighter as it lands
  softShadow(ctx, PG.x - 8 + lerp(60, 14, fall), PG.y - 8 + lerp(90, 22, fall), PG.w + 16, PG.h + 16, lerp(.25, .85, fall));
  // back cover + sheets peeking out (they flutter on impact)
  ctx.save(); const bg = ctx.createLinearGradient(PG.x, PG.y, PG.x + PG.w, PG.y + PG.h); bg.addColorStop(0, '#b08f54'); bg.addColorStop(1, '#8e7140'); ctx.fillStyle = bg; ctx.fillRect(PG.x - 6, PG.y - 6, PG.w + 12, PG.h + 12); ctx.restore();
  for (let i = 0; i < 2; i++) {
    const fl = (slamK + stampK * .6) * Math.sin((t - tSlam) * 30 + i * 2) * (.012 + i * .006);
    ctx.save(); ctx.translate(PG.x + PG.w * .5, PG.y + PG.h); ctx.rotate(.012 + i * .014 + fl); ctx.translate(-(PG.x + PG.w * .5), -(PG.y + PG.h));
    ctx.fillStyle = i ? '#ddd5c2' : '#e4ddcb'; ctx.fillRect(PG.x + 8 + i * 6, PG.y + 6 + i * 4, PG.w, PG.h); ctx.restore();
  }
  // the form page
  const st = { tT, none: P(t, tN, tN + .22), mark: P(t, tStamp - .005, tStamp + .03), card: P(t, tC - .14, tC + .22), clip: P(t, tC + .12, tC + .3) };
  ctx.save(); ctx.translate(PG.x, PG.y); drawPage(ctx, t, st); ctx.restore();
  // empty-evidence pulse
  const ep = P(t, tE - .02, tE + .2) * (1 - P(t, tK - .1, tK + .1));
  if (ep > 0) { ctx.save(); ctx.globalAlpha *= ep * (.55 + .45 * Math.sin((t - tE) * 12)); ctx.strokeStyle = K.gold; ctx.lineWidth = 4; ctx.shadowColor = K.goldHi; ctx.shadowBlur = 16; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 50; ctx.strokeRect(PG.x + EVB.x - 6, PG.y + EVB.y - 6, EVB.w + 12, EVB.h + 12); ctx.restore(); }
  // ---- cover: swings open on the hinge (left edge), starts to close again at the end ----
  const open = E.inOutQ(P(t, tOpen0, tOpen1)) - .42 * E.inOutQ(P(t, d - .45, d + .3));
  const th = open * Math.PI;
  {
    const cw = PG.w + 12, ch = PG.h + 12, hx = PG.x - 6, y0 = PG.y - 6, N = 16, outer = th < Math.PI / 2, img = outer ? S.coverOut : S.coverIn;
    const cs = Math.cos(th), sn = Math.sin(th);
    // shadow of the lifted cover on the page
    if (outer && sn > .02) { const ex = hx + cw * cs; const sg = ctx.createLinearGradient(ex, 0, ex + 160 * sn, 0); sg.addColorStop(0, `rgba(0,0,0,${.45 * sn})`); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(ex, y0, 160 * sn, ch); }
    if (!outer && sn > .02) { const ex = hx + cw * cs; const sg = ctx.createLinearGradient(ex, 0, ex - 140 * sn, 0); sg.addColorStop(0, `rgba(0,0,0,${.4 * sn})`); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(ex - 140 * sn, y0, 140 * sn, ch); }
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, x0 = hx + cw * u0 * cs, x1 = hx + cw * u1 * cs;
      const sy = 1 + .2 * ((u0 + u1) / 2) * sn, hh = ch * sy;               // nearer the camera → slightly larger
      const sx0 = outer ? u0 : 1 - u1, sw = 1 / N;
      const dx = Math.min(x0, x1), dw = Math.abs(x1 - x0) + .6;
      if (dw < .7) continue;
      ctx.save(); if (!outer) { ctx.translate(dx + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(dx + dw / 2), 0); }
      ctx.drawImage(img, sx0 * img.width, 0, sw * img.width, img.height, dx, y0 + ch / 2 - hh / 2, dw, hh);
      ctx.restore();
    }
    // year highlight on the cover sticker ("당시"), while the cover is still (nearly) closed
    const hl = P(t, tD - .06, tD + .12, E.outC);
    if (hl > 0 && outer) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(246,205,90,.9)';
      ctx.fillRect(hx + (S.yr.x0) * cs, y0 + 150 - 4 - 24, S.yr.w * hl * cs, 50); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, hx + (S.yr.x0 + S.yr.w / 2) * cs, y0 + 148, 120, K.goldHi, .25 * hl * (1 - P(t, tOpen0, tOpen0 + .1))); ctx.restore(); }
    // shading by angle
    const shade = outer ? .45 * sn : .3 * sn; if (shade > .01) {
      const ex = hx + cw * cs, sh = ch * (1 + .2 * sn);
      ctx.save(); ctx.beginPath(); ctx.moveTo(hx, y0); ctx.lineTo(ex, y0 + ch / 2 - sh / 2); ctx.lineTo(ex, y0 + ch / 2 + sh / 2); ctx.lineTo(hx, y0 + ch); ctx.closePath(); ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fill(); ctx.restore();
    }
  }
  ctx.restore(); // folder transform

  // dust puff on the slam
  if (t > tSlam && t < tSlam + .8) {
    const q = (t - tSlam) / .8; ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 26; i++) { const side = i % 4, k = hash(i * 7); let px, py, vx, vy;
      if (side === 0) { px = PG.x + k * PG.w; py = PG.y + PG.h; vx = (k - .5) * 120; vy = 140; } else if (side === 1) { px = PG.x + k * PG.w; py = PG.y; vx = (k - .5) * 120; vy = -140; }
      else if (side === 2) { px = PG.x; py = PG.y + k * PG.h; vx = -150; vy = (k - .5) * 120; } else { px = PG.x + PG.w; py = PG.y + k * PG.h; vx = 150; vy = (k - .5) * 120; }
      const e = E.outC(q), r = 30 + 90 * e * (.5 + hash(i * 5)); ctx.globalAlpha = .5 * (1 - q) * (.4 + .6 * hash(i * 3)); ctx.drawImage(S.puff, px + vx * e - r, py + vy * e - r, r * 2, r * 2); }
    ctx.restore();
  }

  // ---- loupe: swoops in on the whoosh, rests on the empty evidence box, then lifts away ----
  const lin = P(t, tE - .22, tE + .04, E.outC), lout = P(t, tN + .12, tK - .02, E.inQ);
  if (lin > 0 && lout < 1) {
    const ex = PG.x + EVB.x + 62, ey = PG.y + EVB.y + 22;
    const lx = lerp(lerp(1150, ex, lin), 1250, lout) + 10 * Math.sin(t * 3) * (1 - lout), ly = lerp(lerp(1500, ey, lin), ey - 260, lout) + 6 * Math.cos(t * 2.6);
    const r = 128 * (1 + .2 * lout);
    // trail while moving fast
    if (lin > 0 && lin < 1) { // light streak behind the fast move
      const q0 = clamp(lin - .3); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x0 = lerp(1150, ex, q0), y0 = lerp(1500, ey, q0);
      const sg = ctx.createLinearGradient(x0, y0, lx, ly); sg.addColorStop(0, 'rgba(255,220,160,0)'); sg.addColorStop(1, `rgba(255,220,160,${.35 * (1 - lin)})`);
      ctx.strokeStyle = sg; ctx.lineCap = 'round'; ctx.lineWidth = r * 1.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lx, ly); ctx.stroke(); ctx.restore(); }
    softShadow(ctx, lx - r + 40, ly - r + 60, r * 2, r * 2, .45);
    loupe(ctx, lx, ly, r, .55, (c) => { c.save(); c.translate(fcx, fcy); c.rotate(fRot); c.scale(fScale, fScale); c.translate(-fcx, -fcy); c.translate(PG.x, PG.y); drawPage(c, t, st); c.restore(); });
  }

  // ---- stamp: anticipation hover, slam on "끝났다", lift away ----
  const sIn = P(t, tK - .36, tK - .1, E.outC), sHover = tri(t, tK - .14, tK - .03), sDown = P(t, tK - .06, tStamp, E.inQ), sUp = P(t, tStamp + .09, tStamp + .45, E.inOutQ);
  if (sIn > 0 && sUp < 1) {
    // stamp position follows the folder transform
    const ang = fRot, c0 = Math.cos(ang), s0 = Math.sin(ang);
    const px0 = PG.x + STP.x - fcx, py0 = PG.y + STP.y - fcy; const sxw = fcx + (px0 * c0 - py0 * s0) * fScale, syw = fcy + (px0 * s0 + py0 * c0) * fScale;
    const hgt = t < tStamp ? lerp(lerp(1.9, .55, sIn) + .12 * sHover, 0, sDown) : lerp(0, 1.8, sUp);
    const ox = t < tStamp ? lerp(-60, 0, sIn) : lerp(0, 260, sUp), oy = t < tStamp ? lerp(-620, 0, sIn) : lerp(0, -700, sUp);
    stampTool(ctx, sxw + ox, syw + oy, STP.r + fRot + (t < tStamp ? .08 * (1 - sIn) : -.1 * sUp), hgt, (t < tStamp ? clamp(sIn * 2) : 1 - P(sUp, .6, 1)));
  }
  // ink flash at impact
  if (stampK > .01) { const px0 = PG.x + STP.x, py0 = PG.y + STP.y; glow(ctx, px0, py0, 360, '#ff4a3a', .22 * stampK); }

  ctx.restore(); // camera

  // ---- light: swaying hanging lamp, warm pool, falloff ----
  const swayA = 1 + 2.2 * slamK + 2.5 * stampK;
  const lpx = 560 + 26 * Math.sin(t * 1.5 + .6) * swayA, lpy = 820 + 10 * Math.sin(t * 1.1);
  const fk = L.flicker(t, .03, 5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(lpx, lpy, 30, lpx, lpy, 760); lg.addColorStop(0, `rgba(255,206,140,${.13 * fk})`); lg.addColorStop(.5, `rgba(255,190,120,${.05 * fk})`); lg.addColorStop(1, 'rgba(255,190,120,0)'); ctx.fillStyle = lg; ctx.fillRect(lpx - 760, lpy - 760, 1520, 1520); ctx.restore();
  darkness(ctx, lpx, lpy + 60, 980, .78, .32);
  motes(ctx, t, { n: 40, color: '#ffe2b0', a: .4 * fk, seed: 71, area: [lpx - 420, lpy - 480, 840, 960], size: 2.6, speed: 12 });

  // ---- chip ----
  const chP = P(t, tStamp + .18, tStamp + .45, E.outBack);
  if (chP > .002) { ctx.save(); ctx.translate(540, 1222 + 24 * (1 - clamp(chP))); ctx.scale(lerp(.75, 1, clamp(chP)), lerp(.75, 1, clamp(chP))); chip(ctx, '증거 불충분 → 종결', 0, 0, clamp(chP * 2), { size: 40, padX: 26, padY: 14 }); ctx.restore(); }
};
})();
