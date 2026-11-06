// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "4월에 찾았다 싶던 그림은 정교한 가짜."  (3.0 s, top-down on an evidence desk under a swinging lamp)
// Beats (anchored to narration words):
//  push-in   the wrapped bundle lies on the desk (continues staff's desk), lamp swaying, dust in the beam
//  4월에      approved chip "1997.4 · 벤티밀리아(이탈리아-프랑스 국경)" drops in; scissors slide in
//  (snip)    twine is cut, the knot springs apart
//  찾았다     paper flaps unfold one after another; the portrait appears, warm gold "hope" glow + sheen sweep
//  싶던       gold lock-on brackets; the lamp hesitates (flicker)
//  그림은     an inspector's shadow falls over the desk; a gloved hand brings a loupe in; camera pushes in
//  정교한     the loupe glides over eye → earring; red check-rings mark the details one by one
//  (antic.)  hand pulls away, camera eases back
//  가짜       stamp slams: shake, red flash, ink specks, shock ring; the painting drains to grey,
//            brackets turn red, the lamp goes cold, approved label "위작 판명" pops
// Nothing here depicts a seizure or a theft; it is only the found bundle being examined.
// ---------------------------------------------------------------------------

let S = null;
const PX = 540, PY = 790, PS = .7;                 // painting (600x700 texture) world centre + scale
const PW = 600 * PS, PH = 700 * PS;                // 420 x 490
const M = 14;                                       // paper margin around the stretcher
const BX = PX - PW / 2 - M, BY = PY - PH / 2 - M, BW = PW + 2 * M, BH = PH + 2 * M;
const DX0 = -340, DY0 = -260, DW = 1760, DH = 2420; // desk sprite world rect
const MARKS = [[293, 279, 34], [368, 352, 30], [438, 640, 40]]; // eye, earring, shawl (portrait texture coords, radius)

// ---------- small utils ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
const pulse = (t, t0, k = 8) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));
function camAt(keys, t) { // Catmull-Rom through [t, x, y, z]
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < 4; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}
const tex2w = (u, v) => [PX + (u - 300) * PS, PY + (v - 350) * PS];

// ---------- sprites (built once) ----------
function makeDesk() {
  const [c, x] = mk(DW, DH); x.translate(-DX0, -DY0); const R = rng(808);
  for (let y = DY0; y < DY0 + DH; y += 168) { // horizontal walnut planks
    const l = 11 + R() * 4, hue = 20 + R() * 7;
    x.fillStyle = `hsl(${hue},${38 + R() * 12}%,${l}%)`; x.fillRect(DX0, y, DW, 168);
    for (let k = 0; k < 30; k++) {
      x.strokeStyle = `rgba(${R() < .55 ? '0,0,0' : '255,205,160'},${R() * .11})`; x.lineWidth = .8 + R() * 2.6;
      const yy = y + R() * 168, ph = R() * 9, am = 2 + R() * 7; x.beginPath(); x.moveTo(DX0, yy);
      for (let xx = DX0; xx <= DX0 + DW; xx += 60) x.lineTo(xx, yy + Math.sin(xx * .0045 + ph) * am + Math.sin(xx * .021 + ph * 2) * 1.5);
      x.stroke();
    }
    if (R() < .7) { const kx = DX0 + R() * DW, ky = y + 30 + R() * 108; for (let r = 4; r < 36; r += 5) { x.strokeStyle = `rgba(0,0,0,${.18 - r * .004})`; x.lineWidth = 1.5; x.beginPath(); x.ellipse(kx, ky, r * 2.4, r * .7, 0, 0, 7); x.stroke(); } }
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(DX0, y + 165, DW, 3); x.fillStyle = 'rgba(255,210,170,.05)'; x.fillRect(DX0, y + 168, DW, 2);
  }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,220,180' : '0,0,0'},${R() * .05})`; x.fillRect(DX0 + R() * DW, DY0 + R() * DH, 2, 2); }
  // coffee ring + scuffs
  x.strokeStyle = 'rgba(20,8,2,.35)'; x.lineWidth = 7; x.beginPath(); x.arc(930, 1180, 64, 0, 5.6); x.stroke();
  // peripheral props, softened for depth of field
  x.filter = 'blur(4px)';
  // manila folder (top left)
  x.save(); x.translate(90, 300); x.rotate(-.22); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 30; x.shadowOffsetY = 14;
  x.fillStyle = '#a88a52'; x.fillRect(-250, -170, 500, 340); x.shadowColor = 'transparent'; x.fillStyle = '#b99b60'; x.fillRect(-250, -200, 160, 40);
  x.fillStyle = '#d9cfb8'; x.fillRect(-220, -150, 440, 290); x.fillStyle = 'rgba(40,30,20,.35)'; for (let i = 0; i < 7; i++) x.fillRect(-190, -110 + i * 34, 300 - (i % 3) * 60, 9);
  x.restore();
  // reference print of the known painting (top right), clipped
  x.save(); x.translate(950, 380); x.rotate(.13); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 26; x.shadowOffsetY = 12; x.fillStyle = '#e9e4d8'; x.fillRect(-130, -155, 260, 310); x.shadowColor = 'transparent';
  x.filter = 'blur(4px) grayscale(1) contrast(1.1)'; x.drawImage(T.portrait, -112, -137, 224, 260); x.filter = 'blur(4px)';
  x.fillStyle = '#8b9096'; x.fillRect(-30, -170, 60, 30);
  x.restore();
  // pencil (bottom left)
  x.save(); x.translate(110, 1230); x.rotate(.62); x.fillStyle = '#c8962a'; x.fillRect(-170, -11, 300, 22); x.fillStyle = '#e8c9a0'; x.beginPath(); x.moveTo(130, -11); x.lineTo(175, 0); x.lineTo(130, 11); x.fill(); x.fillStyle = '#222'; x.beginPath(); x.moveTo(163, -3); x.lineTo(175, 0); x.lineTo(163, 3); x.fill(); x.restore();
  // forensic L-scale (bottom right)
  x.save(); x.translate(930, 1300); x.rotate(-.42); x.fillStyle = '#d8d4c8'; x.fillRect(-30, -260, 60, 420); x.fillRect(-30, 130, 260, 60);
  x.fillStyle = '#1b1b1b'; for (let i = 0; i < 20; i++) x.fillRect(-30, -250 + i * 20, i % 5 ? 18 : 34, 3); for (let i = 0; i < 12; i++) x.fillRect(i * 20, 130, 3, i % 5 ? 18 : 34);
  x.restore();
  x.filter = 'none';
  // warm lamp pool baked in (the moving hot spot is added per frame)
  x.globalCompositeOperation = 'lighter';
  const lg = x.createRadialGradient(552, 770, 0, 552, 770, 780); lg.addColorStop(0, 'rgba(255,200,121,.32)'); lg.addColorStop(.4, 'rgba(255,200,121,.11)'); lg.addColorStop(1, 'rgba(255,200,121,0)');
  x.fillStyle = lg; x.fillRect(552 - 780, 770 - 780, 1560, 1560); x.globalCompositeOperation = 'source-over';
  // half resolution: soft wood is fine and the per-frame blit is much cheaper
  const [h, hx] = mk(DW / 2, DH / 2); hx.imageSmoothingQuality = 'high'; hx.drawImage(c, 0, 0, DW / 2, DH / 2);
  return h;
}
function makeKraft(seed, base, light) {
  const [c, x] = mk(512, 512); const R = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,235,200' : '50,30,10'},${R() * .07})`; x.fillRect(R() * 512, R() * 512, 1 + R() * 2, 1); }
  x.lineCap = 'round';
  for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(${R() < .5 ? '255,230,190' : '40,24,8'},${R() * .12})`; x.lineWidth = .6 + R(); const X = R() * 512, Y = R() * 512, a = R() * 6.28, l = 6 + R() * 22; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 9; i++) { // soft crinkle creases
    const X = R() * 512, Y = R() * 512, a = R() * 6.28, l = 80 + R() * 200;
    x.strokeStyle = `rgba(255,240,210,${light})`; x.lineWidth = 2; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke();
    x.strokeStyle = 'rgba(30,16,4,.16)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X + 2, Y + 2); x.lineTo(X + 2 + Math.cos(a) * l, Y + 2 + Math.sin(a) * l); x.stroke();
  }
  return c;
}
function makePaint(filter) {
  const [c, x] = mk(640, 740); x.translate(320, 370);
  x.fillStyle = '#5c4630'; x.fillRect(-310, -360, 620, 720); x.fillStyle = '#cbbd9e'; x.fillRect(-304, -354, 608, 708);
  x.filter = filter; x.drawImage(T.portrait, -300, -350); x.filter = 'none';
  // fresh, even varnish: a faint uniform sheen (the fake looks almost too clean)
  const g = x.createLinearGradient(-300, -350, 300, 350); g.addColorStop(0, 'rgba(255,240,210,.08)'); g.addColorStop(.5, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(255,240,210,.05)');
  x.fillStyle = g; x.fillRect(-300, -350, 600, 700);
  return c;
}
function makeShadowMan() { // inspector's cast shadow (head + shoulders + fedora), pre-blurred
  const [a, ax] = mk(1000, 1000);
  F.figure(ax, 500, 1960, 1800, { fill: '#000', shadow: false, hat: 'fedora', coat: true, armL: [.35, -.2], armR: [-.5, -.9] });
  const [c, x] = mk(1000, 1000); x.filter = 'blur(18px)'; x.drawImage(a, 0, 0); x.filter = 'none';
  return c;
}
function makeSoft() { const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; x.fillRect(52, 52, 152, 152); x.filter = 'none'; return c; }
// soft drop shadow for an axis-aligned rect without per-frame shadowBlur (cheap)
function softRect(ctx, x, y, w, h, a, spread = 1) { if (a <= 0) return; const k = 52 * spread, sx = w / 152, sy = h / 152; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(S.soft, 0, 0, 256, 256, x - k * sx, y - k * sy, w + 2 * k * sx, h + 2 * k * sy); ctx.restore(); }
// cached copy of L.stamp (same look, but the inked buffer is built once instead of every frame)
function makeStamp(s, size, color, family = FONT.disp, ls = 6) {
  const [m, mx] = mk(8, 8); setFontLocal(mx, size, family, 400); mx.letterSpacing = ls + 'px'; const tw = mx.measureText(s).width;
  const bw = Math.ceil(tw + size * .9 + 20), bh = Math.ceil(size * 1.8 + 20);
  const [b, bx] = mk(bw, bh); bx.translate(bw / 2, bh / 2);
  setFontLocal(bx, size, family, 400); bx.letterSpacing = ls + 'px';
  bx.fillStyle = color; bx.strokeStyle = color; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillText(s, 0, size * .05);
  bx.lineWidth = size * .09; roundRect(bx, -tw / 2 - size * .35, -size * .78, tw + size * .7, size * 1.56, size * .12); bx.stroke(); bx.lineWidth = size * .035; roundRect(bx, -tw / 2 - size * .22, -size * .64, tw + size * .44, size * 1.28, size * .08); bx.stroke();
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'destination-out';
  const R = rng(77); for (let i = 0; i < Math.round(1400 * bw * bh / 980000); i++) { bx.globalAlpha = R() * .8; bx.beginPath(); bx.arc(R() * bw, R() * bh, R() * 5 + .5, 0, 7); bx.fill(); }
  return b;
}
function setFontLocal(c, size, family, weight) { c.font = `${weight} ${size}px "${family}"`; }
function stampCached(ctx, x, y, p, rot) {
  if (p <= 0) return;
  if (!S.stamp) S.stamp = makeStamp('가짜', 190, '#d4202c');
  const sc = lerp(2.6, 1, clamp(p * 1.6)), a = clamp(p * 4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= a * .92; ctx.globalCompositeOperation = 'multiply';
  const w2 = S.stamp.width / 2, h2 = S.stamp.height / 2;
  ctx.drawImage(S.stamp, -w2, -h2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha *= .35; ctx.drawImage(S.stamp, -w2, -h2); ctx.restore();
}
function makeSoftDot() { const [c, x] = mk(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; }
function build() {
  S = {
    desk: makeDesk(), kOut: makeKraft(61, '#7a5a36', .10), kIn: makeKraft(62, '#8e6c45', .14),
    paint: makePaint('hue-rotate(-14deg) saturate(.82) contrast(.94)'),
    shadow: makeShadowMan(), dot: makeSoftDot(), soft: makeSoft(),
  };
  const [g, gx] = mk(640, 740); gx.filter = 'grayscale(.9) brightness(.9) contrast(1.05)'; gx.drawImage(S.paint, 0, 0); gx.filter = 'none';
  gx.globalCompositeOperation = 'multiply'; gx.fillStyle = '#c3cad6'; gx.fillRect(0, 0, 640, 740); S.gray = g;
}

// ---------- pieces ----------
// one paper flap hinged on segment p0-p1, folding toward unit normal n (inward) with length Lf; th = 0 folded on top, PI = flat outside
function drawFlap(ctx, p0, p1, n, Lf, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const ex = p1[0] - p0[0], ey = p1[1] - p0[1], el = Math.hypot(ex, ey), ux = ex / el, uy = ey / el;
  const k = s * 34, fx = n[0] * Lf * c, fy = n[1] * Lf * c;
  const q = [p0, p1, [p1[0] + fx + ux * k, p1[1] + fy + uy * k], [p0[0] + fx - ux * k, p0[1] + fy - uy * k]];
  ctx.save();
  { const xs = q.map(p => p[0]), ys = q.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    softRect(ctx, x0 + 6 + 30 * s, y0 + 10 + 46 * s, Math.max(4, x1 - x0), Math.max(4, y1 - y0), .45 + .35 * s, .25 + .6 * s); }
  const pat = ctx.createPattern(c >= 0 ? S.kOut : S.kIn, 'repeat'); pat.setTransform(new DOMMatrix().translate(p0[0] * .7, p0[1] * .3));
  poly(ctx, q, pat);
  // shading: darker as it stands up, crease at the hinge, light catching the far edge
  const g = ctx.createLinearGradient(p0[0], p0[1], p0[0] + fx, p0[1] + fy + .01);
  const dark = .5 * s;
  g.addColorStop(0, `rgba(0,0,0,${.18 + dark * .6})`); g.addColorStop(1, `rgba(0,0,0,${dark})`);
  poly(ctx, q, g);
  if (c < 0) poly(ctx, q, `rgba(8,4,0,${.3 * -c})`); // lying open outside the lamp's hot spot
  for (const f of [.34, .72]) { // soft fold creases parallel to the hinge
    const ax = lerp(p0[0], q[3][0], f), ay = lerp(p0[1], q[3][1], f), bx = lerp(p1[0], q[2][0], f), by = lerp(p1[1], q[2][1], f);
    ctx.strokeStyle = 'rgba(255,235,200,.10)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(ax + 2, ay + 2); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,230,190,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[3][0], q[3][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,10,2,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
  ctx.restore();
}
const FLAPS = [
  { p0: [BX, BY + 8], p1: [BX, BY + BH - 8], n: [1, 0], L: PW * .36 + M },              // left tuck
  { p0: [BX + BW, BY + 8], p1: [BX + BW, BY + BH - 8], n: [-1, 0], L: PW * .36 + M },   // right tuck
  { p0: [BX + 4, BY], p1: [BX + BW - 4, BY], n: [0, 1], L: PH * .56 + M },              // top
  { p0: [BX + 4, BY + BH], p1: [BX + BW - 4, BY + BH], n: [0, -1], L: PH * .56 + M },   // bottom
];
function drawBase(ctx) { // paper base sheet under the stretcher
  softRect(ctx, BX + 8, BY + 20, BW, BH, .75, .5);
  const pt = ctx.createPattern(S.kIn, 'repeat'); poly(ctx, [[BX - 6, BY - 6], [BX + BW + 6, BY - 6], [BX + BW + 6, BY + BH + 6], [BX - 6, BY + BH + 6]], pt);
}
function makeOpenBundle() {
  const ox = BX - 240, oy = BY - 340, [c, x] = mk(BW + 560, BH + 740); x.translate(-ox, -oy);
  drawBase(x); for (const f of FLAPS) drawFlap(x, f.p0, f.p1, f.n, f.L, Math.PI - .07);
  return { c, ox, oy };
}
function drawTwine(ctx, t, tCut) {
  const k = P(t, tCut, tCut + .32, E.outC), a = 1 - P(t, tCut + .18, tCut + .5);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  const ends = [[BX - 6, PY], [BX + BW + 6, PY], [PX, BY - 6], [PX, BY + BH + 6]];
  for (let i = 0; i < 4; i++) {
    const [ex, ey] = ends[i];
    const L = 1 - k * (.75 + .2 * hash(i * 3)); // the cut halves spring back toward their edge
    const sx = lerp(ex, PX, L), sy = lerp(ey, PY, L);
    const wob = Math.sin((t - tCut) * 30 + i) * 14 * k * (1 - k);
    const mx = (sx + ex) / 2 + (i < 2 ? 0 : wob), my = (sy + ey) / 2 + (i < 2 ? wob : 0) + 10 * k;
    for (const [col, lw, o] of [['rgba(0,0,0,.45)', 9, 5], ['#b99d6a', 6, 0], ['rgba(255,240,200,.5)', 2, -1]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ex + o, ey + o); ctx.quadraticCurveTo(mx + o, my + o, sx + o, sy + o); ctx.stroke();
    }
  }
  const ka = 1 - k; // knot
  if (ka > 0) {
    ctx.globalAlpha *= ka; ctx.fillStyle = '#a88c5a'; ctx.strokeStyle = '#6e5630'; ctx.lineWidth = 3;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(PX + s * 22, PY - 4, 24, 12, s * .5, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(PX, PY, 10, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function drawLoupe(ctx, t, lx, ly, r, mag, drawInside) {
  // lens content
  ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.clip();
  ctx.translate(lx, ly); ctx.scale(mag, mag); ctx.translate(-lx, -ly); drawInside(ctx);
  ctx.restore();
  ctx.save();
  // glass: inner vignette + chromatic fringe + highlights
  let g = ctx.createRadialGradient(lx, ly, r * .55, lx, ly, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.85, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(90,200,255,.35)'; ctx.beginPath(); ctx.arc(lx - 1.5, ly, r - 3, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,90,90,.3)'; ctx.beginPath(); ctx.arc(lx + 1.5, ly, r - 3, 0, 7); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(lx, ly, r - 16, 3.75, 4.55); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly, r - 16, 4.75, 4.95); ctx.stroke();
  const sh = ctx.createLinearGradient(lx - r, ly - r, lx + r, ly + r); const sp = (t * .35) % 1;
  sh.addColorStop(clamp(sp - .08), 'rgba(255,255,255,0)'); sh.addColorStop(sp, 'rgba(255,255,255,.12)'); sh.addColorStop(clamp(sp + .08), 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // brass rim
  g = ctx.createLinearGradient(lx - r, ly - r, lx + r, ly + r); g.addColorStop(0, '#f2d88f'); g.addColorStop(.35, '#8a6418'); g.addColorStop(.6, '#d9b25a'); g.addColorStop(1, '#4a3308');
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 22;
  ctx.strokeStyle = g; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(lx, ly, r + 6, 0, 7); ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(30,20,4,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, r - 1, 0, 7); ctx.stroke();
  ctx.restore();
}
// white cotton conservator's glove (variant of KL.glove), fingers toward -y, cuff/sleeve toward +y
function cottonGlove(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 34; ctx.shadowOffsetX = 18; ctx.shadowOffsetY = 26;
  const sl = ctx.createLinearGradient(-80, 0, 80, 0); sl.addColorStop(0, '#1d2128'); sl.addColorStop(.5, '#2c313a'); sl.addColorStop(1, '#101317');
  ctx.fillStyle = sl; roundRect(ctx, -84, 96, 168, 360, 44); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e9e6de'; roundRect(ctx, -80, 92, 160, 26, 8); ctx.fill(); // shirt cuff
  const g = ctx.createLinearGradient(-90, -140, 90, 120); g.addColorStop(0, '#fbf8f0'); g.addColorStop(.6, '#d9d4c8'); g.addColorStop(1, '#a8a296');
  ctx.fillStyle = '#cfc9bc'; roundRect(ctx, -72, 54, 144, 52, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2.5; for (let i = -60; i < 70; i += 12) { ctx.beginPath(); ctx.moveTo(i, 58); ctx.lineTo(i, 102); ctx.stroke(); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-70, 64); ctx.bezierCurveTo(-88, 10, -80, -40, -62, -58); ctx.lineTo(66, -58); ctx.bezierCurveTo(84, -30, 84, 20, 70, 64); ctx.closePath(); ctx.fill();
  const fing = [[-50, -56, -.2, 70], [-17, -60, -.06, 88], [16, -60, .05, 84], [48, -54, .18, 66]]; // curled around the handle
  for (const [fx, fy, fr, fl] of fing) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fr);
    ctx.fillStyle = g; roundRect(ctx, -15, -fl, 30, fl + 12, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(90,85,75,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -fl * .45); ctx.quadraticCurveTo(0, -fl * .4, 10, -fl * .45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, -9, -fl + 6, 7, fl * .62, 4); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(-72, 4); ctx.rotate(-.9); ctx.fillStyle = g; roundRect(ctx, -15, -74, 32, 88, 16); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(90,85,75,.3)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-60, -8); ctx.quadraticCurveTo(0, 8, 60, -8); ctx.stroke();
  ctx.restore();
}
function drawMarks(ctx, t, times, a = 1, red = K.red, lw = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  MARKS.forEach(([u, v, r], i) => {
    const p = P(t, times[i], times[i] + .16, E.outC); if (p <= 0) return;
    const [x, y] = tex2w(u, v), pop = E.outBack(P(t, times[i], times[i] + .2), 2.4);
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(1.5, 1, pop), lerp(1.5, 1, pop));
    ctx.shadowColor = red; ctx.shadowBlur = 14 * lw;
    ctx.strokeStyle = red; ctx.lineWidth = 5 * lw; ctx.beginPath(); ctx.arc(0, 0, r, -1.9, -1.9 + 6.4 * p); ctx.stroke();
    // little leader tick
    const lp = P(t, times[i] + .08, times[i] + .22, E.outC);
    if (lp > 0) { ctx.lineWidth = 4 * lw; ctx.beginPath(); ctx.moveTo(r * .72, -r * .72); ctx.lineTo(r * .72 + 34 * lp, -r * .72 - 34 * lp); ctx.lineTo(r * .72 + 58 * lp, -r * .72 - 34 * lp); ctx.stroke(); }
    ctx.restore();
    const fl = pulse(t, times[i], 9); if (fl > 0 && lw >= 1) glow(ctx, x, y, r * 2.6, red, .55 * fl);
  });
  ctx.restore();
}

window.KL.scenes.fake = function (ctx, t, d, info) {
  if (!S) build();
  const tA = at(info, '4월에', .05), tP = at(info, '찾았다', .2), tS = at(info, '싶던', .35), tG = at(info, '그림은', .45), tJ = at(info, '정교한', .62), tF = at(info, '가짜', .8);
  const tCut = tA + .2, hit = tF + .1;
  // flap opening times (bottom-most paper layer opens last)
  const fo = [tA + .24, tA + .33, tP - .1, tP - .02];
  const flapTh = (i) => P(t, fo[i], fo[i] + .32, E.inOutC) * (Math.PI - .07);

  // ---------------- camera ----------------
  const [cx, cy, cz] = camAt([
    [-.35, 545, 905, .9], [tA, 542, 895, .94], [tP, 540, 880, .99], [tG, 545, 865, 1.03],
    [tJ, 572, 820, 1.2], [tF - .12, 568, 832, 1.12], [hit, 556, 850, 1.08], [d + .4, 548, 855, 1.15],
  ], t);
  const dr = drift(t, .9, 21);
  const shk = pulse(t, hit, 6.5) * (t > hit ? 1 : 0);
  ctx.save();
  const sx_ = shk * noise1(t * 26, 6) * 22, sy_ = shk * noise1(t * 26, 7) * 22; // translation-only shake
  camera(ctx, { x: cx + dr.x + sx_, y: cy + dr.y + sy_, zoom: cz, rot: 0, t }); // no camera roll: an axis-aligned blit of the desk is much cheaper

  // ---------------- desk + lamp ----------------
  ctx.drawImage(S.desk, DX0, DY0, DW, DH);
  const cold = P(t, hit, hit + .55, E.outC);
  const fl = L.flicker(t, .05, 3) - .35 * tri(t, tS + .02, tS + .2) - .25 * tri(t, tS + .22, tS + .3); // hesitation flicker on 싶던
  const lx = 552 + Math.sin(t * 1.25) * 34, ly = 770 + Math.cos(t * 1.05) * 14;
  glow(ctx, lx, ly, 400, '#ffd9a0', (.24 - .14 * cold) * fl);
  if (fl < .97) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${(1 - fl) * .9})`; ctx.fillRect(-W, -H, 3 * W, 3 * H); ctx.restore(); }

  // ---------------- the bundle ----------------
  // paper base sheet under the stretcher
  const flaps = FLAPS, order = [3, 2, 1, 0]; // opening order index -> flap (bottom, top, right, left)
  const thOf = fi => flapTh(order.indexOf(fi));
  if (t >= fo[3] + .34) { // fully unwrapped: the flat paper is static, use the pre-rendered sprite
    if (!S.open) S.open = makeOpenBundle();
    ctx.drawImage(S.open.c, S.open.ox, S.open.oy);
  } else {
    drawBase(ctx);
    // flaps already folded open lie flat outside the bundle (under everything)
    for (const fi of [0, 1, 2, 3]) { const th = thOf(fi); if (th > Math.PI / 2) drawFlap(ctx, flaps[fi].p0, flaps[fi].p1, flaps[fi].n, flaps[fi].L, th); }
  }
  // the painting
  const gray = P(t, hit, hit + .45, E.outC);
  softRect(ctx, PX - 310 * PS + 6, PY - 360 * PS + 10, 620 * PS, 720 * PS, .6, .25);
  ctx.drawImage(S.paint, PX - 320 * PS, PY - 370 * PS, 640 * PS, 740 * PS);
  if (gray > 0) { ctx.save(); ctx.globalAlpha *= gray; ctx.drawImage(S.gray, PX - 320 * PS, PY - 370 * PS, 640 * PS, 740 * PS); ctx.restore(); }
  // hope: warm sheen sweeping across the varnish
  const hope = P(t, tP - .05, tP + .25, E.outC) * (1 - cold);
  if (hope > 0) {
    glow(ctx, PX, PY, 520, K.gold, .13 * hope * (.8 + .2 * Math.sin(t * 5)));
    const sp = P(t, tP + .02, tS + .2, E.inOutQ);
    if (sp > 0 && sp < 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(PX - PW / 2, PY - PH / 2, PW, PH); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const x0 = lerp(PX - PW, PX + PW, sp); const g = ctx.createLinearGradient(x0 - 120, PY - 300, x0 + 120, PY + 300);
      g.addColorStop(0, 'rgba(255,230,160,0)'); g.addColorStop(.5, 'rgba(255,236,180,.3)'); g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g; ctx.fillRect(PX - PW, PY - PH, PW * 2, PH * 2); ctx.restore();
    }
  }
  if (hope > 0) motes(ctx, t, { n: 26, color: '#ffd98a', a: .55 * hope, area: [PX - 300, PY - 340, 600, 680], size: 3, speed: 40, seed: 17 });
  // flaps still standing / folded over the painting, in paper layer order
  for (const fi of [0, 1, 2, 3]) { const th = thOf(fi); if (th <= Math.PI / 2) drawFlap(ctx, flaps[fi].p0, flaps[fi].p1, flaps[fi].n, flaps[fi].L, th); }
  drawTwine(ctx, t, tCut);

  // scissors snip the twine (right edge)
  const sIn = P(t, -.3, tCut - .02, E.outC), sOut = P(t, tCut + .08, tCut + .45, E.inQ);
  if (sOut < 1) {
    const sx = lerp(1260, BX + BW + 120, sIn) + sOut * 520, sy = lerp(980, PY + 6, sIn) + sOut * 120;
    const openA = t < tCut ? .5 - .1 * Math.sin(t * 8) : lerp(.04, .45, P(t, tCut + .05, tCut + .25));
    shears(ctx, sx, sy, .06 - sOut * .3, openA, .55);
  }
  const snip = pulse(t, tCut, 14); if (snip > 0 && t > tCut) glow(ctx, BX + BW + 6, PY, 120, '#fff2d0', .8 * snip);

  // gold lock-on brackets (hope) → red after the stamp
  const bp = P(t, tS - .12, tS + .12);
  if (bp > 0) { const col = cold > .5 ? K.red : K.goldHi; const br = .75 + .25 * Math.sin(t * 7);
    ctx.save(); ctx.globalAlpha *= (cold > 0 && cold < .5 ? 1 - cold * 2 : 1) * (cold >= .5 ? (cold - .5) * 2 * br : 1);
    brackets(ctx, PX - PW / 2 - 26, PY - PH / 2 - 26, PW + 52, PH + 52, cold >= .5 ? 1 : bp, col, 54, 6); ctx.restore(); }

  // ---------------- inspection ----------------
  const shIn = P(t, tG - .2, tG + .35, E.outC), shOut = P(t, tF - .12, tF + .2, E.inOutQ) * .35;
  if (shIn > 0) { // inspector's shadow leans over the desk
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= .85 * shIn;
    ctx.translate(lerp(-160, 250, shIn) - shOut * 240, lerp(1560, 1110, shIn) + shOut * 200); ctx.rotate(.7 + Math.sin(t * .9) * .02);
    ctx.drawImage(S.shadow, -500, -330, 1000, 1000); ctx.restore();
  }
  const markT = [tJ + .1, tJ + .22, tJ + .33]; let lens = null;
  // loupe path: in from bottom right → eye → earring → withdraw before the stamp
  const hIn = P(t, tG - .1, tJ - .05, E.outC), hMid = P(t, tJ + .05, tJ + .26, E.inOutQ), hOut = P(t, tF - .14, tF + .06, E.inC);
  if (hIn > 0 && hOut < 1) {
    const [ex, ey] = tex2w(293, 279), [rx, ry] = tex2w(368, 352);
    let lxp = lerp(1240, ex, hIn) + (rx - ex) * hMid, lyp = lerp(1500, ey, hIn) + (ry - ey) * hMid;
    lxp += hOut * 700 + Math.sin(t * 3.3) * 4; lyp += hOut * 640 + Math.cos(t * 2.7) * 4;
    const LR = 104, dir = [.64, .77]; lens = [lxp, lyp, LR];
    const hx = lxp + dir[0] * (LR + 150), hy = lyp + dir[1] * (LR + 150);
    if (hOut > 0) { // motion streak on the fast withdraw
      ctx.save(); ctx.globalAlpha *= .25 * Math.sin(hOut * Math.PI); ctx.strokeStyle = '#ffe9c0'; ctx.lineWidth = LR * 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lxp - 160 * dir[0], lyp - 160 * dir[1]); ctx.lineTo(lxp, lyp); ctx.stroke(); ctx.restore();
    }
    // handle
    ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 22;
    ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(lxp + dir[0] * LR, lyp + dir[1] * LR); ctx.lineTo(hx + dir[0] * 60, hy + dir[1] * 60); ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,220,170,.18)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lxp + dir[0] * (LR + 10) - 8, lyp + dir[1] * (LR + 10) + 4); ctx.lineTo(hx - 8, hy + 4); ctx.stroke();
    ctx.restore();
    drawLoupe(ctx, t, lxp, lyp, LR, 2.0, c => {
      c.drawImage(S.paint, PX - 320 * PS, PY - 370 * PS, 640 * PS, 740 * PS);
      // crisp canvas weave visible only under the glass
      c.save(); c.globalAlpha = .18; c.strokeStyle = '#fff'; c.lineWidth = .6; for (let k = -12; k <= 12; k++) { c.beginPath(); c.moveTo(lxp - 60, lyp + k * 5); c.lineTo(lxp + 60, lyp + k * 5); c.stroke(); } c.restore();
      drawMarks(c, t, markT, .9, K.red, .5); // the same check-rings seen through the glass
    });
    cottonGlove(ctx, hx, hy, .6, Math.atan2(-dir[0], dir[1]) + Math.sin(t * 2.1) * .03);
  }
  if (cold > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= .55 * cold; ctx.fillStyle = '#7f90ad'; ctx.fillRect(-W, -H, 3 * W, 3 * H); ctx.restore(); } // cold, desaturated room after the verdict
  ctx.save();
  if (lens) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, 3 * H); ctx.arc(lens[0], lens[1], lens[2] + 15, 0, 7); ctx.clip('evenodd'); }
  drawMarks(ctx, t, markT, 1 - .55 * cold);
  ctx.restore();

  // ---------------- the stamp ----------------
  const stP = P(t, tF - .05, tF + .2);
  if (stP > 0) {
    const [sx, sy] = [PX + 20, PY + 70];
    if (t < hit) { const k = 1 - stP * .4; ctx.save(); ctx.translate(sx + 40, sy + 40); ctx.rotate(-.2); softRect(ctx, -230 * k, -90 * k, 460 * k, 180 * k, .55 * stP, .6); ctx.restore(); }
    stampCached(ctx, sx, sy, stP, -.2);
    if (t > hit) {
      const q = P(t, hit, hit + .4, E.outC);
      if (q < 1) { ctx.save(); ctx.strokeStyle = rgba('#ffd0c0', (1 - q) * .7); ctx.lineWidth = 10 * (1 - q) + 1; ctx.beginPath(); ctx.ellipse(sx, sy, 200 + 320 * q, 120 + 210 * q, -.2, 0, 7); ctx.stroke(); ctx.restore(); }
      // ink specks thrown out by the impact (they land and stay)
      ctx.save(); ctx.fillStyle = '#c51d28'; ctx.globalAlpha *= .85;
      for (let i = 0; i < 22; i++) {
        const a = hash(i * 7 + 3) * 6.28, dd = 170 + hash(i * 11) * 190, k = P(t, hit, hit + .14 + hash(i) * .08, E.outC);
        const px = sx + Math.cos(a) * dd * k * 1.25, py = sy + Math.sin(a) * dd * k * .8, rr = 2 + hash(i * 5) * 6;
        ctx.beginPath(); ctx.ellipse(px, py, rr * (1 + (1 - k) * 2), rr, a, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }
  // dust in the lamp beam (kicked up by the stamp)
  motes(ctx, t, { n: 34, color: cold > .5 ? '#cfd8e6' : '#ffe2b0', a: .32 + .5 * pulse(t, hit, 3) * (t > hit ? 1 : 0), area: [PX - 520, PY - 560, 1040, 1100], size: 2.6, speed: 18 + 120 * pulse(t, hit, 4) * (t > hit ? 1 : 0), seed: 31 });

  // low-key falloff around the lamp pool
  darkness(ctx, lx, ly + 40, 780, .9, .22);
  ctx.restore();

  // ---------------- screen space ----------------
  const ca = P(t, tA - .06, tA + .2, E.outC);
  if (ca > 0) { ctx.save(); ctx.translate(0, lerp(-26, 0, ca)); chip(ctx, '1997.4 · 벤티밀리아(이탈리아-프랑스 국경)', 540, 500, ca * (1 - .3 * cold), { size: 33 }); ctx.restore(); }
  const vp = P(t, hit + .16, hit + .42);
  if (vp > 0) {
    const s = lerp(1.6, 1, E.outBack(vp, 2.2));
    ctx.save(); ctx.translate(540, 1216); ctx.scale(s, s);
    label(ctx, '위작 판명', 0, 0, { size: 46, color: '#fff', bg: rgba('#b3121c', .92), border: '#ff8a8a', a: clamp(vp * 3), padX: 30, padY: 14 });
    ctx.restore();
  }
  if (t > hit) { const fa = pulse(t, hit, 12); if (fa > .01) glow(ctx, 560, 900, 640, '#ff4030', .5 * fa); }
  if (t > tCut) flash(ctx, .06 * pulse(t, tCut, 16), '#fff3d6');
};
})();
