// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "범인은 끝내 밝혀지지 않았다." — evidence board under a swinging lamp.
// Beats: whip-in landing → red string runs photo→suspect card, "범인 : ???" types (범인은)
// → detective silhouette reaches for the card, side leads fan out (끝내)
// → mugshot window cycles generic silhouettes, scan bar (밝혀지지)
// → string SNAPS, card swings, leads go slack, 미제 사건 stamp, lamp flickers (않았다).
// ---------------------------------------------------------------------------
let S = null; // sprites, built once
const POL = { x: 250, pinY: 500 }, CARD = { x: 515, pinY: 688, w: 430, h: 320 };
const SMALL = [{ x: 845, pinY: 548, rot: .07, v: 0 }, { x: 170, pinY: 968, rot: -.06, v: 1 }];
const MUG = { x: 20, y: 82, w: 160, h: 218 }; // inside the suspect card (card-local, top-left origin)

function paperFill(x, w, h, seed, base = '#efe9db') {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(-hash(seed) * 400, -hash(seed + 3) * 400));
  x.save(); x.globalAlpha = .45; x.globalCompositeOperation = 'multiply'; x.fillStyle = pat; x.fillRect(0, 0, w, h); x.restore();
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .8);
  g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(100,72,30,.32)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
}
function scribble(x, x0, y, w, seed, col = 'rgba(30,30,40,.55)') {
  x.save(); x.strokeStyle = col; x.lineWidth = 2.4; x.lineCap = 'round'; x.beginPath();
  const R = rng(seed); let px = x0; x.moveTo(px, y);
  while (px < x0 + w) { const s = 6 + R() * 10; x.quadraticCurveTo(px + s * .5, y - 6 - R() * 8, px + s, y + (R() - .5) * 4); px += s; if (R() < .12) { px += 8; x.moveTo(px, y); } }
  x.stroke(); x.restore();
}
function bust(x, cx, top, o) { // head & shoulders silhouette from the figure rig
  const h = 430; F.figure(x, cx, top + h * 7.45 / 8 - 6, h, Object.assign({ shadow: false, coat: true, armL: [.12, 0], armR: [-.12, 0] }, o));
}
function initSprites() {
  S = {};
  // polaroid of the stolen painting
  { const [c, x] = mk(250, 290); paperFill(x, 250, 290, 2, '#ede7da');
    x.fillStyle = '#0e1418'; x.fillRect(16, 16, 218, 206);
    const fw = 150, fh = fw * 860 / 760;
    x.drawImage(T.portrait, 125 - fw * .39, 119 - fh * .4, fw * .78, fh * .8); x.drawImage(T.frame, 125 - fw / 2, 119 - fh / 2, fw, fh);
    const g = x.createLinearGradient(16, 16, 234, 222); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
    x.fillStyle = g; x.fillRect(16, 16, 218, 206);
    text(x, '1997', 125, 256, { size: 32, family: FONT.type, weight: 400, color: '#2c2c30' });
    S.pol = c; }
  // suspect index card (mugshot window is drawn live)
  { const { w, h } = CARD; const [c, x] = mk(w, h); paperFill(x, w, h, 7);
    x.strokeStyle = 'rgba(80,120,170,.28)'; x.lineWidth = 1.6; for (let y = 104; y < h; y += 34) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    x.strokeStyle = 'rgba(200,60,60,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 70); x.lineTo(w, 70); x.stroke();
    text(x, 'SUSPECT', 22, 40, { size: 34, family: FONT.type, weight: 400, color: '#3a3a40', align: 'left' });
    for (let i = 0; i < 6; i++) scribble(x, 218, 128 + i * 34, 200 - hash(i * 5) * 70, 40 + i);
    x.strokeStyle = 'rgba(190,30,40,.75)'; x.lineWidth = 3.4; x.lineCap = 'round';
    for (const i of [1, 3, 4]) { x.beginPath(); x.moveTo(214, 124 + i * 34); x.lineTo(214 + 190 - hash(i * 5) * 60, 120 + i * 34 + (hash(i) - .5) * 6); x.stroke(); }
    S.card = c; }
  // mugshot backdrop with height chart
  { const { w, h } = MUG; const [c, x] = mk(w, h);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b9b5ab'); g.addColorStop(1, '#8e8a82'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(30,30,30,.35)'; x.lineWidth = 1.5; for (let y = 14; y < h; y += 18) { x.beginPath(); x.moveTo(0, y); x.lineTo(y % 36 === 14 ? 26 : 14, y); x.stroke(); }
    S.mugBG = c; }
  // generic mugshot silhouettes (no faces, nobody in particular)
  const vars = [{ hat: 'fedora' }, {}, { female: true, hair: 'long' }, { female: true, hair: 'bun' }, { hat: 'fedora', hatTilt: .12, coat: false }];
  S.mugs = vars.map((o, i) => { const [c, x] = mk(MUG.w, MUG.h); bust(x, MUG.w / 2 + (i % 2 ? 4 : -3), 30 + (i % 3) * 5, Object.assign({ fill: '#2b2e34', rim: 'rgba(230,230,240,.35)', rimX: 2, rimY: -2, rimBlur: 4 }, o)); return c; });
  { const [c, x] = mk(MUG.w, MUG.h); bust(x, MUG.w / 2, 36, { fill: '#33363c' }); S.unknown = c; }
  // small "?" lead cards
  S.small = [0, 1].map(v => {
    const [c, x] = mk(176, 132); paperFill(x, 176, 132, 20 + v, v ? '#e9e2d0' : '#efe8d6');
    x.fillStyle = '#9d988d'; x.fillRect(12, 14, 70, 94); x.save(); x.beginPath(); x.rect(12, 14, 70, 94); x.clip();
    F.figure(x, 47, 14 + 180, 190, { fill: '#3a3d43', shadow: false, coat: true, hat: v ? null : 'fedora', armL: [.1, 0], armR: [-.1, 0] }); x.restore();
    text(x, '?', 131, 64, { size: 76, family: FONT.disp, weight: 400, color: 'rgba(60,60,66,.75)' });
    for (let i = 0; i < 2; i++) scribble(x, 96, 104 + i * 14, 60, 60 + v * 3 + i, 'rgba(30,30,40,.4)');
    return c;
  });
}

// ---------- small utilities ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
function poseLerp(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
// 2-bone IK in the figure rig's convention (angle 0 = straight down, +x = sin, +y = cos). bend = ±1 picks the elbow side.
function ik(sx, sy, tx, ty, l1, l2, bend = 1) {
  const dx = tx - sx, dy = ty - sy, dd = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const phi = Math.atan2(dx, dy), al = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1)), be = Math.acos(clamp((l1 * l1 + l2 * l2 - dd * dd) / (2 * l1 * l2), -1, 1));
  return [phi + bend * al, -bend * (Math.PI - be)];
}
// red yarn with sag + optional pluck vibration, drawn up to fraction p (with glowing head while drawing)
function yarn(ctx, x0, y0, x1, y1, p, sag, { a = 1, w = 5, vib = 0, t = 0 } = {}) {
  if (p <= 0) return; const N = 34, n = Math.max(1, Math.floor(N * clamp(p)));
  const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = K.red; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 6;
  ctx.beginPath(); let hx = x0, hy = y0;
  for (let i = 0; i <= n; i++) {
    const k = i / N, s = Math.sin(k * Math.PI);
    const v = vib * Math.sin(k * Math.PI * 2) * Math.sin(t * 60);
    hx = lerp(x0, x1, k) + nx / nl * v; hy = lerp(y0, y1, k) + s * sag + ny / nl * v;
    i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
  }
  ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.globalAlpha *= .35; ctx.strokeStyle = '#ff8a7a'; ctx.lineWidth = w * .35; ctx.stroke();
  ctx.restore();
  if (p < 1) { glow(ctx, hx, hy, 46, '#ff5a46', .9 * a); ctx.save(); ctx.fillStyle = '#fff2ec'; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 7); ctx.fill(); ctx.restore(); }
}
// a snapped half of yarn dangling from its pin (damped pendulum)
function dangle(ctx, px, py, ang0, len, ts, side) {
  const hang = side * .1, th = hang + (ang0 - hang) * Math.exp(-ts * 3.2) * Math.cos(ts * 9.5);
  const ex = px + Math.sin(th) * len, ey = py + Math.cos(th) * len;
  const curl = side * 40 * Math.exp(-ts * 2) * Math.sin(ts * 14);
  ctx.save(); ctx.strokeStyle = K.red; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo((px + ex) / 2 + curl + side * 10, (py + ey) / 2 + 20, ex, ey); ctx.stroke(); ctx.restore();
  // frayed tip
  ctx.save(); ctx.strokeStyle = '#ff6b5c'; ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + (hash(i * 7 + side * 3) - .5) * 16, ey + 6 + hash(i * 3) * 10); ctx.stroke(); } ctx.restore();
}
function hangingCard(ctx, img, px, py, w, h, rot, lx, ly, shadowA = .6) {
  // pinned at (px,py) near its top edge; rotates around the pin; drop shadow pushed away from the lamp
  ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
  const ox = clamp((px - lx) * .045, -26, 26), oy = 16 + clamp((py - ly) * .02, -6, 14);
  ctx.shadowColor = `rgba(0,0,0,${shadowA})`; ctx.shadowBlur = 34; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
  ctx.drawImage(img, -w / 2, -16, w, h); ctx.restore();
}

window.KL.scenes.culprit = function (ctx, t, d, info) {
  if (!S) initSprites();
  const tB = at(info, '범인은', .05), tK = at(info, '끝내', .3), tM = at(info, '밝혀지지', .5), tSnap = at(info, '않았다', .8);
  const ts = t - tSnap, after = ts > 0;
  const kick = after ? Math.exp(-ts * 6) : 0;

  // ---------------- camera ----------------
  const land = 1 - E.outC(P(t, -.22, .55));            // keep travelling left after the whip
  const punch = after ? .045 * Math.exp(-ts * 5) * (1 - Math.exp(-ts * 40)) : 0;
  const z = 1.0 + .1 * E.inOutQ(P(t, -.1, tSnap)) + .05 * E.outQ(P(t, tSnap, d + .3)) + punch;
  const camX = lerp(540, 562, E.inOutQ(P(t, 0, tSnap + .3))) - land * 90, camY = lerp(905, 862, E.inOutQ(P(t, 0, d)));
  const dr = drift(t, .55, 5), shake = .55 * kick;
  const shx = shake * noise1(t * 24, 31) * 18, shy = shake * noise1(t * 24, 32) * 18;
  const layer = (f) => { const zf = 1 + (z - 1) * f; ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (camX - 540) * f) - dr.x * f, -(960 + (camY - 960) * f) - dr.y * f); };
  const toScreen = (f, x, y) => { const zf = 1 + (z - 1) * f; return [W / 2 + (x - (540 + (camX - 540) * f) - dr.x * f) * zf + shx, H / 2 + (y - (960 + (camY - 960) * f) - dr.y * f) * zf + shy]; };
  const fromScreen = (f, sx, sy) => { const zf = 1 + (z - 1) * f; return [(sx - shx - W / 2) / zf + 540 + (camX - 540) * f + dr.x * f, (sy - shy - H / 2) / zf + 960 + (camY - 960) * f + dr.y * f]; };

  // lamp: pendulum + flicker (flicker spikes with the glitch hit after the snap)
  const sw = .11 * Math.sin(t * 2.3 + .5) + .05 * kick * Math.sin(ts * 11);
  const LP = { x: 560, y: -90, len: 545 }; const lbx = LP.x + Math.sin(sw) * LP.len, lby = LP.y + Math.cos(sw) * LP.len;
  const glitchK = after ? tri(t, tSnap + .22, tSnap + .52) : 0;
  const fl = L.flicker(t, .05, 2) * (glitchK > 0 && hash(Math.floor(t * 30) + 5) > .45 ? .45 : 1);
  const [bsx, bsy] = toScreen(1.12, lbx, lby);

  ctx.save(); ctx.fillStyle = '#0a0b0e'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + shx, H / 2 + shy); ctx.rotate(dr.r + shake * noise1(t * 15, 33) * .012); ctx.translate(-W / 2, -H / 2);

  // ---- layer 0: board wall (slight parallax) ----
  ctx.save(); layer(.85); ctx.drawImage(T.board, 540 - 610, 960 - 1085, 1220, 2170); ctx.restore();

  // ---- layer 1: pinned evidence ----
  ctx.save(); layer(1);
  const lx = lbx, ly = lby + 120; // lamp position projected on the board for shadow direction
  const P2 = [CARD.x, CARD.pinY], P1 = [POL.x, POL.pinY];
  const leadP = P(t, tK - .08, tK + .38, E.outC);
  // small lead cards (flutter more once their strings go slack)
  const slack = after ? E.outQ(P(t, tSnap + .05, tSnap + .7)) : 0;
  SMALL.forEach((s, i) => {
    const flut = .018 * Math.sin(t * 2.6 + i * 2) + slack * .06 * Math.exp(-(ts - .1) * 2.4) * Math.sin(ts * 10 + i);
    const a = .55 + .45 * leadP;
    ctx.save(); ctx.globalAlpha *= a; hangingCard(ctx, S.small[s.v], s.x, s.pinY, 176, 132, s.rot + flut, lx, ly); ctx.restore();
  });
  // polaroid of the painting (gentle sway)
  hangingCard(ctx, S.pol, POL.x, POL.pinY, 238, 276, -.09 + .014 * Math.sin(t * 2.1 + 1), lx, ly);
  // suspect card — rocks around its pin, swings hard when the string snaps
  const rock = .025 * Math.sin(t * 2.7) * Math.exp(-Math.max(0, t) * .5) + (after ? .12 * Math.sin(ts * 8.5) * Math.exp(-ts * 2.6) + .05 * (1 - Math.exp(-ts * 4)) : 0)
    + (t > tK ? .03 * Math.sin((t - tK) * 13) * Math.exp(-(t - tK) * 5) : 0);
  ctx.save(); ctx.translate(P2[0], P2[1]); ctx.rotate(.025 + rock);
  { const ox = clamp((P2[0] - lx) * .045, -26, 26); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.62)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = 20; ctx.drawImage(S.card, -CARD.w / 2, -16, CARD.w, CARD.h); ctx.restore(); }
  ctx.translate(-CARD.w / 2, -16);
  // mugshot window: blank → cycling candidates with scan bar → unknown
  ctx.save(); ctx.beginPath(); ctx.rect(MUG.x, MUG.y, MUG.w, MUG.h); ctx.clip(); ctx.drawImage(S.mugBG, MUG.x, MUG.y);
  const scanOn = t > tM - .12 && !after;
  if (scanOn) {
    const fi = Math.floor(t * 13); const im = S.mugs[fi % S.mugs.length];
    const jit = (hash(fi * 3) - .5) * 6; ctx.globalAlpha = .9; ctx.drawImage(im, MUG.x + jit, MUG.y); ctx.globalAlpha = 1;
    const sy = MUG.y + ((t - tM) * 1.9 % 1) * MUG.h;
    const g = ctx.createLinearGradient(0, sy - 46, 0, sy); g.addColorStop(0, 'rgba(255,80,70,0)'); g.addColorStop(1, 'rgba(255,80,70,.45)');
    ctx.fillStyle = g; ctx.fillRect(MUG.x, sy - 46, MUG.w, 46); ctx.fillStyle = 'rgba(255,230,225,.9)'; ctx.fillRect(MUG.x, sy - 2, MUG.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = MUG.y; y < MUG.y + MUG.h; y += 4) ctx.fillRect(MUG.x, y, MUG.w, 1.5);
  } else {
    ctx.drawImage(S.unknown, MUG.x, MUG.y);
    const red = after ? E.outQ(P(t, tSnap, tSnap + .2)) : 0;
    const gq = glitchK * (hash(Math.floor(t * 30)) - .3) * 12;
    text(ctx, '?', MUG.x + MUG.w / 2 + gq * .5, MUG.y + 112, { size: 130 + 14 * kick, family: FONT.disp, weight: 400, color: rgba('#e1e1e6', .55 - .35 * red) });
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,40,45,.8)'; ctx.lineWidth = 3; ctx.strokeRect(MUG.x, MUG.y, MUG.w, MUG.h);
  // 미제 사건 stamp slams onto the card
  const stp = P(t, tSnap + .06, tSnap + .38);
  if (stp > 0) stamp(ctx, '미제 사건', CARD.w / 2 + 6, 186, stp, { size: 70, color: '#d4202c', rot: -.17, ls: 4 });
  ctx.restore();
  // red string: photo → suspect, then the side leads
  const mainP = P(t, .02, .42, E.inOutQ);
  if (!after) {
    const pluck = t > tK - .05 ? 7 * Math.exp(-(t - tK) * 6) : 0;
    const tense = P(t, tM, tSnap, E.inQ);
    yarn(ctx, P1[0], P1[1], P2[0], P2[1], mainP, lerp(46, 6, P(t, .3, tSnap, E.inOutQ)), { vib: pluck + 3 * tense, t });
    if (tense > 0) glow(ctx, lerp(P1[0], P2[0], .5), lerp(P1[1], P2[1], .5) + 6, 60 + 40 * tense, '#ff5040', .35 * tense * (.7 + .3 * Math.sin(t * 40)));
  } else {
    const a0 = Math.atan2(P2[0] - P1[0], P2[1] - P1[1]), half = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) * .5;
    dangle(ctx, P1[0], P1[1], a0, half, ts, 1); dangle(ctx, P2[0], P2[1], a0 + Math.PI, half * .95, ts, -1);
    // yarn fibres burst from the break
    const bx = lerp(P1[0], P2[0], .5), by = lerp(P1[1], P2[1], .5) + 6;
    if (ts < .7) {
      glow(ctx, bx, by, 150, '#ff6a50', .9 * Math.exp(-ts * 7));
      ctx.save(); ctx.fillStyle = '#ff7466';
      for (let i = 0; i < 18; i++) { const an = hash(i * 13) * 6.28, sp = 180 + hash(i * 7) * 420; const px = bx + Math.cos(an) * sp * ts, py = by + Math.sin(an) * sp * ts + 900 * ts * ts; ctx.globalAlpha = clamp(1 - ts / .7) * .9; ctx.fillRect(px, py, 3 + hash(i) * 4, 2); }
      ctx.restore();
    }
  }
  SMALL.forEach((s, i) => yarn(ctx, P2[0], P2[1], s.x, s.pinY, leadP, lerp(26, 120, slack) + (i ? 10 : 0), { a: lerp(.95, .55, slack), w: 4 }));
  // pins (on top)
  pin(ctx, P1[0], P1[1]); SMALL.forEach(s => pin(ctx, s.x, s.pinY, '#c8202a'));
  { const pk = after ? 1 + .25 * Math.exp(-ts * 8) : 1; ctx.save(); ctx.translate(P2[0], P2[1]); ctx.scale(pk, pk); pin(ctx, 0, 0); ctx.restore(); }
  // corner brackets lock onto the suspect card on "범인은"
  const brA = P(t, tB, tB + .3) * (1 - P(t, tSnap - .1, tSnap + .1));
  if (brA > 0) brackets(ctx, CARD.x - CARD.w / 2 - 26, CARD.pinY - 34, CARD.w + 52, CARD.h + 40, brA, K.red, 40, 6);
  ctx.restore();

  // ---- lamp light on the board ----
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const pool = ctx.createRadialGradient(bsx, bsy + 330, 30, bsx, bsy + 330, 900); pool.addColorStop(0, `rgba(255,205,140,${.2 * fl})`); pool.addColorStop(.5, `rgba(255,190,120,${.07 * fl})`); pool.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H); ctx.restore();
  darkness(ctx, bsx, bsy + 380, 1080, lerp(.9, .82, fl), .22);
  fogLayer(ctx, t, bsy + 260, 280, '#ffd7a0', .045 * fl, 3, 26);
  godrays(ctx, bsx, bsy + 20, Math.PI / 2 + sw * .8, .95, 1100, '#ffd59a', .055 * fl, t, 8);

  // ---- layer 2: lamp (cord, conical shade, bulb) ----
  ctx.save(); layer(1.12);
  ctx.strokeStyle = '#050505'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(LP.x, LP.y); ctx.lineTo(lbx - Math.sin(sw) * 40, lby - Math.cos(sw) * 40); ctx.stroke();
  ctx.save(); ctx.translate(lbx, lby); ctx.rotate(-sw);
  const sg = ctx.createLinearGradient(-60, 0, 60, 0); sg.addColorStop(0, '#0d0e10'); sg.addColorStop(.45, '#2b2d31'); sg.addColorStop(1, '#08090a');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-14, -44); ctx.lineTo(14, -44); ctx.lineTo(62, 4); ctx.lineTo(-62, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(255,220,160,${.55 * fl})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-62, 4); ctx.lineTo(62, 4); ctx.stroke();
  const bg2 = ctx.createRadialGradient(0, 8, 1, 0, 8, 22); bg2.addColorStop(0, '#fffaf0'); bg2.addColorStop(1, `rgba(255,190,90,${fl})`); ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(0, 8, 20, 13, 0, 0, Math.PI); ctx.fill();
  ctx.restore(); ctx.restore();
  glow(ctx, bsx, bsy + 12, 240, '#ffcf80', .6 * fl);
  glow(ctx, bsx, bsy + 12, 70, '#fff3d6', .7 * fl);

  // ---- layer 3: detective silhouette (foreground, in profile, facing the board) ----
  ctx.save(); layer(1.22);
  { const DX = 1000, DY = 1835, DH = 1000, u = DH / 8, rest = [.06, -.1];
    const shX = -1.008 * u, shY = -6.6 * u, reachL = 2.8 * u;
    // point at the mugshot window (follows the card's rock), mapped into this layer
    const cr = .025 + rock, mx = MUG.x + MUG.w / 2 - CARD.w / 2, my = MUG.y + MUG.h / 2 - 16;
    const [sx, sy] = toScreen(1, P2[0] + Math.cos(cr) * mx - Math.sin(cr) * my, P2[1] + Math.sin(cr) * mx + Math.cos(cr) * my);
    const [hx, hy] = fromScreen(1.22, sx, sy);
    const jab = t > tM - .05 && !after ? Math.max(0, Math.sin((t - tM + .05) * 16)) : 0;
    const dx = hx - DX - shX, dy = hy - DY - shY, dl = Math.hypot(dx, dy), ext = reachL * (.95 - .09 * jab);
    const point = ik(shX, shY, shX + dx / dl * ext, shY + dy / dl * ext, 1.45 * u, 1.35 * u, -1);
    const up = E.outBack(P(t, tK - .14, tK + .24), 1.6) * (after ? 1 - E.inQ(P(t, tSnap + .04, tSnap + .34)) : 1);
    const dip = tri(t, tK - .3, tK - .13) * .14; // anticipation: arm pulls back before it rises
    let aL = poseLerp(rest, point, up); aL = [aL[0] + dip, aL[1]];
    if (after) { const sw2 = P(t, tSnap + .34, tSnap + .8); aL = [aL[0] - .1 * Math.sin(sw2 * Math.PI * 2) * (1 - sw2), aL[1]]; }
    const recoil = after ? .03 * Math.sin(Math.min(1, ts / .45) * Math.PI) + .012 * P(t, tSnap + .3, d, E.inOutQ) : 0;
    const breathe = .005 * Math.sin(t * 2.2);
    F.figure(ctx, DX, DY, DH, { hat: 'fedora', coat: true, coatLen: 2.6, fill: '#040507', face: -1, rim: rgba('#ffc977', .85 * fl), rimX: -5, rimY: -4, rimBlur: 10,
      armL: aL, armR: [-.1, .14], lean: breathe + recoil, headTurn: -.6, shadow: false, hatTilt: .06 }); }
  ctx.restore();

  // dust motes floating in the beam (nearest depth)
  motes(ctx, t, { n: 46, color: '#ffe2b0', a: .55 * fl, area: [bsx - 420, bsy + 40, 840, 1100], size: 2.6, speed: 16, seed: 17 });
  ctx.restore();

  // ---------------- screen-space type: 범인 : ??? ----------------
  const s1 = '범인 : ', full = s1 + '???', tp = P(t, .15, .52); const typed = typeSub(full, tp); const nT = Array.from(typed).length;
  const fs = 112, w1 = measure(ctx, s1, fs, FONT.disp, 400), w2 = measure(ctx, '???', fs, FONT.disp, 400); const x0 = 520 - (w1 + w2) / 2, ty = 1186;
  const lift = after ? -10 * Math.exp(-ts * 6) : 0;
  if (nT > 0) {
    const head = typed.slice(0, Math.min(nT, s1.length));
    text(ctx, head, x0, ty + lift, { size: fs, family: FONT.disp, weight: 400, color: '#f4f1ea', align: 'left', stroke: '#000', strokeW: 12, shadow: { color: 'rgba(0,0,0,.7)', blur: 24, y: 8 } });
    if (nT > s1.length) {
      const q = typed.slice(s1.length); const qPop = 1 + .25 * Math.exp(-(t - (.15 + .37 * (nT / Array.from(full).length))) * 18);
      const gA = after ? .5 + .9 * glitchK + .25 * hash(Math.floor(t * 24)) : .25;
      ctx.save(); ctx.translate(x0 + w1, ty + lift); ctx.scale(after ? 1 + .12 * kick : qPop, after ? 1 + .12 * kick : qPop);
      glitchText(ctx, q, 0, 0, gA, t, { size: fs, family: FONT.disp, weight: 400, color: K.red, align: 'left', stroke: '#000', strokeW: 12 }); ctx.restore();
    }
  }
  if (tp > 0 && !after && Math.floor(t * 4) % 2 === 0) { const cw = measure(ctx, typed, fs, FONT.disp, 400); ctx.fillStyle = '#f4f1ea'; ctx.fillRect(x0 + cw + 10, ty - 52, 8, 100); }

  // snap hit: red rim flash + breathing vignette
  if (after && ts < .35) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .11 * (1 - ts / .35); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  vignette(ctx, .42 + .05 * Math.sin(t * 1.7) + .3 * kick);
};
})();
