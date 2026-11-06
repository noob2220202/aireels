// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "빈 액자는 지붕 위에, 경찰은 그림을 천장 창으로 빼냈다고 봤지만 액자가 그 창보다 컸다."
// A small 3D rooftop (overcast daylight; the time of the theft is unknown, so no night staging).
// Beats: close on the empty gold frame lying on the roof, glint + "빈 액자" (빈 액자는)
// → thunk: pull back and crane up to reveal the rooftop, pigeons flush, ring + "지붕 위" (지붕 위에)
// → two police silhouettes walk in from both sides (경찰은); one points at the frame (그림을), the other at the skylight (천장)
// → hypothesis diagram: a ghost of the painting is hoisted up through the skylight on a line along a dotted route (창으로/빼냈다고)
// → the route greys out and the camera turns to the frame (봤지만); the officer kneels and tapes the frame (액자가, tick)
// → whip to the skylight, the second officer tapes the opening (tick); a gold ghost of the frame flies over and settles on it (창보다)
// → it overhangs on every side: red overhang, jolt, X slash, approved label "액자 > 천장 창" (컸다).
// Everything is a pure function of t.
// ---------------------------------------------------------------------------

// ---- world (metres; y up; the camera looks roughly toward -z) ----
const SK = { x: -1.05, z: -.35, ow: .44, od: .35, h: .28, iw: .36, id: .27, rh: .1 };           // skylight: curb outer half-sizes, opening half-sizes, glass ridge rise
const FR = { x: 1.15, z: .38, yaw: -.32, w: .5, d: .565, b: .11, th: .045 };                     // the empty frame lying on the roof (half sizes, border, thickness)
const ROOF = { x0: -9, x1: 9, z0: -4.6, z1: 2.6 };
const NEAR = .25;
let RS = null;

// ---------- sprites (built once) ----------
function skylineSprite(seed, w, h, col, hi, campanile) {
  const [c, x] = mk(w, h); const R = rng(seed);
  x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
  let px = 0;
  while (px < w) {
    const bw = 60 + R() * 150, bh = h * (.25 + R() * .4), roofK = R();
    x.lineTo(px, h - bh);
    if (roofK < .55) { x.lineTo(px + bw * .5, h - bh - bw * .22); x.lineTo(px + bw, h - bh); }   // pitched tile roof
    else x.lineTo(px + bw, h - bh);
    if (R() < .35) { const cx = px + bw * (.2 + R() * .6); x.lineTo(cx, h - bh); }
    px += bw;
  }
  x.lineTo(w, h); x.closePath(); x.fill();
  // chimneys
  for (let i = 0; i < 26; i++) { const cx = R() * w, cy = h * (.35 + R() * .3); x.fillRect(cx, cy - 22 - R() * 18, 10 + R() * 8, 60); x.fillRect(cx - 3, cy - 26 - R() * 18, 18, 6); }
  if (campanile) { // generic bell tower + dome far away (not a specific building)
    const bx = w * .68; x.fillRect(bx, h * .02, 46, h); x.beginPath(); x.moveTo(bx - 6, h * .05); x.lineTo(bx + 23, -h * .06); x.lineTo(bx + 52, h * .05); x.closePath(); x.fill();
    x.fillStyle = hi; for (let k = 0; k < 2; k++) x.fillRect(bx + 10 + k * 16, h * .1, 8, 26); x.fillStyle = col;
    const dx = w * .3; x.beginPath(); x.arc(dx, h * .38, 70, Math.PI, 0); x.fill(); x.fillRect(dx - 74, h * .38, 148, h); x.fillRect(dx - 4, h * .38 - 104, 8, 40);
  }
  // window specks + top haze line
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(200,210,225,${R() * .08})`; x.fillRect(R() * w, h * (.45 + R() * .5), 6, 9); }
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgba(hi, .0)); g.addColorStop(1, rgba('#0b0e12', .35));
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  return c;
}
function initRoof() {
  RS = {};
  { // far town + nearer roofs, pre-blurred for depth of field
    const a = skylineSprite(71, 2600, 420, '#434c57', '#8a96a5', true);
    const [c, x] = mk(2600, 420); x.filter = 'blur(2.5px)'; x.drawImage(a, 0, 0); RS.far = c;
    const b = skylineSprite(83, 2400, 380, '#232930', '#6f7b8a', false);
    const [c2, x2] = mk(2400, 380); x2.filter = 'blur(1.2px)'; x2.drawImage(b, 0, 0); RS.near = c2;
  }
  { // overcast cloud deck
    const [c, x] = mk(1400, 560); const R = rng(17); x.filter = 'blur(18px)';
    for (let i = 0; i < 70; i++) { const X = R() * 1400, Y = 60 + R() * 440, r = 60 + R() * 170; const g = x.createRadialGradient(X, Y, 0, X, Y, r); const v = 150 + R() * 70;
      g.addColorStop(0, `rgba(${v},${v + 8},${v + 18},${.18 + R() * .2})`); g.addColorStop(1, `rgba(${v},${v + 8},${v + 18},0)`); x.fillStyle = g; x.save(); x.translate(X, Y); x.scale(2.4, .6); x.translate(-X, -Y); x.fillRect(X - r, Y - r, r * 2, r * 2); x.restore(); }
    RS.clouds = c;
  }
  { // roof membrane / gravel tile (used as a pattern mapped onto the roof plane)
    const S = 512, [c, x] = mk(S, S); const R = rng(23); const id = x.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const n = R() + R() - 1 + (R() < .03 ? -.8 : 0), v = n > 0 ? 235 : 0; id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v + (n > 0 ? 10 : 0); id.data[i * 4 + 3] = Math.min(255, Math.abs(n) * (n > 0 ? 22 : 42)); }
    x.putImageData(id, 0, 0);
    for (let i = 0; i < 40; i++) { const X = R() * S, Y = R() * S, r = 20 + R() * 70; const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(0,0,0,${.03 + R() * .06})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); }
    RS.tile = c;
  }
  { // drifting cloud shadows on the roof
    const S = 512, [c, x] = mk(S, S); const R = rng(29); x.filter = 'blur(26px)';
    for (let i = 0; i < 16; i++) { const X = R() * S, Y = R() * S, r = 40 + R() * 90; x.fillStyle = `rgba(0,0,0,${.25 + R() * .25})`; x.beginPath(); x.ellipse(X, Y, r * 1.8, r, R() * 3, 0, 7); x.fill(); }
    RS.shadow = c;
  }
  { // drifting mist band
    const [c, x] = mk(1600, 360); const R = rng(37); x.filter = 'blur(20px)';
    for (let i = 0; i < 26; i++) { const X = R() * 1600, Y = 120 + R() * 120, r = 50 + R() * 110; x.fillStyle = `rgba(190,200,214,${.18 + R() * .2})`; x.beginPath(); x.ellipse(X, Y, r * 2.6, r * .55, 0, 0, 7); x.fill(); }
    RS.fog = c;
  }
  { // soft round blob used for contact shadows
    const [c, x] = mk(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); RS.blob = c;
  }
  // rasterise the filtered sprites now rather than on first use
  for (const k in RS) RS[k].getContext('2d').getImageData(0, 0, 1, 1);
}

function mist(ctx, t, y, a, speed) { // one pre-blurred sprite, wrapped horizontally
  const off = ((t * speed) % 1600 + 1600) % 1600; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .35;
  ctx.drawImage(RS.fog, off - 1600, y - 180); ctx.drawImage(RS.fog, off, y - 180); ctx.restore();
}

// ---------- camera ----------
function makeCam(eye, tgt, f, roll, ox, oy) {
  let fx = tgt[0] - eye[0], fy = tgt[1] - eye[1], fz = tgt[2] - eye[2]; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const Cm = { eye, f };
  Cm.c = (x, y, z) => { const dx = x - eye[0], dy = y - eye[1], dz = z - eye[2]; return [dx * rx + dz * rz, dx * ux + dy * uy + dz * uz, dx * fx + dy * fy + dz * fz]; };
  Cm.s = (c) => { const sx = f * c[0] / c[2], sy = -f * c[1] / c[2]; return [540 + ox + sx * cr - sy * sr, 960 + oy + sx * sr + sy * cr, c[2]]; };
  Cm.p = (x, y, z) => Cm.s(Cm.c(x, y, z));
  Cm.horizon = () => Cm.p(eye[0] + fx * 4000, eye[1], eye[2] + fz * 4000);
  return Cm;
}
function camAt(keys, t) { // Catmull-Rom through [t, ex,ey,ez, tx,ty,tz, f]
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = E.inOutQ((t - k1[0]) / (k2[0] - k1[0])) * .55 + (t - k1[0]) / (k2[0] - k1[0]) * .45, uu = u * u, uuu = uu * u;
  const out = [];
  for (let j = 1; j < k1.length; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}

// ---------- 3D drawing helpers ----------
function clipPts(Cm, pts) {
  const cs = pts.map(p => Cm.c(p[0], p[1], p[2])); const out = [];
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b = cs[(i + 1) % cs.length], ai = a[2] > NEAR, bi = b[2] > NEAR;
    if (ai) out.push(a);
    if (ai !== bi) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
  }
  return out.map(Cm.s);
}
function pathS(ctx, s) { ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
function quad(ctx, Cm, pts, fill) { const s = clipPts(Cm, pts); if (s.length < 3) return null; pathS(ctx, s); if (fill) { ctx.fillStyle = fill; ctx.fill(); } return s; }
function seg(Cm, a, b) {
  let ca = Cm.c(a[0], a[1], a[2]), cb = Cm.c(b[0], b[1], b[2]);
  if (ca[2] <= NEAR && cb[2] <= NEAR) return null;
  if (ca[2] <= NEAR) { const k = (NEAR - ca[2]) / (cb[2] - ca[2]); ca = [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, NEAR]; }
  if (cb[2] <= NEAR) { const k = (NEAR - cb[2]) / (ca[2] - cb[2]); cb = [cb[0] + (ca[0] - cb[0]) * k, cb[1] + (ca[1] - cb[1]) * k, NEAR]; }
  return [Cm.s(ca), Cm.s(cb)];
}
// local affine of the horizontal plane y at (x,z) with axes rotated by yaw: (u,v) metres → screen
function planeXf(Cm, x, y, z, yaw = 0) {
  const e = .05, c = Math.cos(yaw), s = Math.sin(yaw);
  const p0 = Cm.p(x, y, z), pu = Cm.p(x + e * c, y, z + e * s), pv = Cm.p(x - e * s, y, z + e * c);
  return [(pu[0] - p0[0]) / e, (pu[1] - p0[1]) / e, (pv[0] - p0[0]) / e, (pv[1] - p0[1]) / e, p0[0], p0[1]];
}
function blobShadow(ctx, Cm, x, y, z, rx, rz, a) {
  const m = planeXf(Cm, x, y, z); ctx.save(); ctx.globalAlpha *= a; ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); ctx.drawImage(RS.blob, -rx, -rz, rx * 2, rz * 2); ctx.restore();
}
const frameAt = (fr, u, v, y) => { const c = Math.cos(fr.yaw), s = Math.sin(fr.yaw); return [fr.x + u * c - v * s, y, fr.z + u * s + v * c]; };
const rectAt = (fr, hw, hd, y) => [frameAt(fr, -hw, -hd, y), frameAt(fr, hw, -hd, y), frameAt(fr, hw, hd, y), frameAt(fr, -hw, hd, y)];

// ---------- the gold frame, drawn in true perspective ----------
const RINGS = [[.005, 'rgba(60,35,5,.8)', 2.2], [.021, 'rgba(255,240,190,.55)', 1.2], [.032, 'rgba(70,45,8,.7)', 1.8], [.058, 'rgba(255,235,170,.5)', 1.2], [.082, 'rgba(60,35,5,.75)', 2.2], [.097, 'rgba(255,240,200,.5)', .8]];
function drawFrame(ctx, Cm, fr, y, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return;
  const { w, d, b, th } = fr;
  ctx.save(); ctx.globalAlpha *= a;
  const top = y + th;
  const outer = rectAt(fr, w, d, top), inner = rectAt(fr, w - b, d - b, top);
  const so = clipPts(Cm, outer), si = clipPts(Cm, inner);
  if (so.length < 3) { ctx.restore(); return; }
  // sides (thickness)
  if (!o.ghost) {
    const ob = rectAt(fr, w, d, y);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; const mx = (ob[i][0] + ob[j][0]) / 2, mz = (ob[i][2] + ob[j][2]) / 2, nx = mx - fr.x, nz = mz - fr.z;
      if (nx * (Cm.eye[0] - mx) + nz * (Cm.eye[2] - mz) > 0) quad(ctx, Cm, [ob[i], ob[j], outer[j], outer[i]], '#4a3409'); }
  }
  // top face with a gold gradient across its screen bbox
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; so.forEach(([px, py]) => { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); });
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  [[0, '#6b4a12'], [.18, '#e8c46a'], [.32, '#9c7424'], [.5, '#f7dc8c'], [.68, '#8a6418'], [.84, '#e0b95c'], [1, '#6b4a12']].forEach(([k, col]) => g.addColorStop(k, col));
  ctx.beginPath(); so.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
  si.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
  ctx.fillStyle = g; ctx.fill('evenodd');
  const ppm = Cm.f / Math.max(.3, Cm.c(fr.x, top, fr.z)[2]); // px per metre near the frame
  // carved rings
  for (const [ins, col, lw] of RINGS) { const s = clipPts(Cm, rectAt(fr, w - ins, d - ins, top)); pathS(ctx, s); ctx.strokeStyle = col; ctx.lineWidth = Math.max(.6, lw * ppm / 380); ctx.stroke(); }
  // bead rows
  if (ppm > 150 && !o.ghost) {
    const rr = Math.max(.8, .005 * ppm);
    for (const [ins, step] of [[.045, .045], [.071, .04]]) {
      const hw = w - ins, hd = d - ins;
      const n1 = Math.round(hw * 2 / step), n2 = Math.round(hd * 2 / step);
      ctx.fillStyle = '#5a3b0a';
      ctx.beginPath();
      const pts = [];
      for (let i = 0; i <= n1; i++) { const u = -hw + i * hw * 2 / n1; pts.push(frameAt(fr, u, -hd, top), frameAt(fr, u, hd, top)); }
      for (let i = 1; i < n2; i++) { const v = -hd + i * hd * 2 / n2; pts.push(frameAt(fr, -hw, v, top), frameAt(fr, hw, v, top)); }
      const sp = pts.map(p => Cm.p(p[0], p[1], p[2])).filter(p => p[2] > NEAR);
      sp.forEach(([px, py]) => { ctx.moveTo(px + rr, py + rr * .3); ctx.arc(px, py + rr * .3, rr, 0, 7); }); ctx.fill();
      ctx.fillStyle = '#fff1c2'; ctx.beginPath(); sp.forEach(([px, py]) => { ctx.moveTo(px + rr * .45, py - rr * .2); ctx.arc(px - rr * .15, py - rr * .2, rr * .45, 0, 7); }); ctx.fill();
    }
    // corner rosettes
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const c3 = frameAt(fr, su * (w - b / 2), sv * (d - b / 2), top), [px, py] = Cm.p(c3[0], c3[1], c3[2]); const r = .036 * ppm;
      const rg = ctx.createRadialGradient(px - r * .3, py - r * .3, 0, px, py, r); rg.addColorStop(0, '#fff5cf'); rg.addColorStop(.6, '#b98a2e'); rg.addColorStop(1, 'rgba(90,60,12,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(px, py, r, r * .75, 0, 0, 7); ctx.fill();
    }
  }
  // inner lip
  pathS(ctx, si); ctx.strokeStyle = 'rgba(30,18,2,.9)'; ctx.lineWidth = Math.max(1, 3 * ppm / 380); ctx.stroke();
  // glint sweep
  if (o.glint > 0 && o.glint < 1) {
    ctx.save(); ctx.beginPath(); so.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); si.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'lighter'; const gx = lerp(x0 - 160, x1 + 160, o.glint);
    const gg = ctx.createLinearGradient(gx - 70, y0, gx + 70, y0 + 40); gg.addColorStop(0, 'rgba(255,240,200,0)'); gg.addColorStop(.5, 'rgba(255,244,214,.85)'); gg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gg; ctx.fillRect(x0 - 200, y0 - 50, x1 - x0 + 400, y1 - y0 + 100); ctx.restore();
  }
  if (o.ghost) { // luminous outline
    ctx.save(); ctx.shadowColor = K.goldHi; ctx.shadowBlur = 18; ctx.strokeStyle = rgba(K.goldHi, .95); ctx.lineWidth = 4; pathS(ctx, so); ctx.stroke(); ctx.lineWidth = 2.5; pathS(ctx, si); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  return { so, si };
}

// ---------- skylight ----------
function drawSkylight(ctx, Cm, t, o) {
  const { x, z, ow, od, h, iw, id, rh } = SK; const E3 = Cm.eye;
  const Pt = (dx, y, dz) => [x + dx, y, z + dz];
  blobShadow(ctx, Cm, x + .05, 0, z + .08, ow * 1.35, od * 1.45, .55);
  // curb faces visible from the eye
  const fFront = [Pt(-ow, 0, od), Pt(ow, 0, od), Pt(ow, h, od), Pt(-ow, h, od)];
  const fRight = [Pt(ow, 0, od), Pt(ow, 0, -od), Pt(ow, h, -od), Pt(ow, h, od)];
  const fLeft = [Pt(-ow, 0, -od), Pt(-ow, 0, od), Pt(-ow, h, od), Pt(-ow, h, -od)];
  if (E3[0] > x + ow) quad(ctx, Cm, fRight, '#2b3036');
  if (E3[0] < x - ow) quad(ctx, Cm, fLeft, '#262a30');
  { const s = quad(ctx, Cm, fFront, null); if (s) { const g = ctx.createLinearGradient(0, Math.min(s[2][1], s[3][1]), 0, Math.max(s[0][1], s[1][1])); g.addColorStop(0, '#5a636d'); g.addColorStop(1, '#30363d'); ctx.fillStyle = g; ctx.fill(); } }
  // flashing ring on top of the curb
  { const so = clipPts(Cm, [Pt(-ow, h, -od), Pt(ow, h, -od), Pt(ow, h, od), Pt(-ow, h, od)]), si = clipPts(Cm, [Pt(-iw, h, -id), Pt(iw, h, -id), Pt(iw, h, id), Pt(-iw, h, id)]);
    ctx.beginPath(); so.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); si.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
    ctx.fillStyle = '#737d88'; ctx.fill('evenodd');
    pathS(ctx, so); ctx.strokeStyle = 'rgba(220,230,240,.35)'; ctx.lineWidth = 2; ctx.stroke();
    // the dark interior below the glass
    pathS(ctx, si); ctx.fillStyle = '#0a0d12'; ctx.fill();
    if (o.inner > 0) { ctx.save(); ctx.clip(); const c3 = Cm.p(x, h, z); glow(ctx, c3[0], c3[1], 160, '#ffd9a0', .45 * o.inner); ctx.restore(); }
  }
  // hipped glass: ridge along x
  const rx = iw - id, top = h + rh;
  const gBack = [Pt(-iw, h, -id), Pt(iw, h, -id), Pt(rx, top, 0), Pt(-rx, top, 0)];
  const gFront = [Pt(-iw, h, id), Pt(iw, h, id), Pt(rx, top, 0), Pt(-rx, top, 0)];
  const gL = [Pt(-iw, h, -id), Pt(-iw, h, id), Pt(-rx, top, 0)], gR = [Pt(iw, h, -id), Pt(iw, h, id), Pt(rx, top, 0)];
  const glass = (pts, a0, a1) => { const s = quad(ctx, Cm, pts, null); if (!s) return; let ymin = 1e9, ymax = -1e9; s.forEach(p => { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); });
    const g = ctx.createLinearGradient(0, ymin, 0, ymax); g.addColorStop(0, `rgba(205,220,236,${a0})`); g.addColorStop(1, `rgba(80,100,122,${a1})`); ctx.fillStyle = g; ctx.fill(); };
  glass(gBack, .30, .16); glass(gL, .26, .14); glass(gR, .34, .18); glass(gFront, .46, .22);
  // sliding sky reflection on the front pane
  { const s = clipPts(Cm, gFront); if (s.length > 2) { ctx.save(); pathS(ctx, s); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      let x0 = 1e9, x1 = -1e9, y0 = 1e9; s.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); });
      const k = ((t * .22) % 1.6) - .3, gx = lerp(x0, x1, k); const gg = ctx.createLinearGradient(gx - 60, y0, gx + 60, y0 + 60); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.5, 'rgba(235,242,250,.32)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(x0 - 100, y0 - 100, x1 - x0 + 200, 400); ctx.restore(); } }
  // metal glazing bars
  ctx.save(); ctx.strokeStyle = '#1c2026'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
  for (const [a, b] of [[Pt(-rx, top, 0), Pt(rx, top, 0)], [Pt(-iw, h, id), Pt(-rx, top, 0)], [Pt(iw, h, id), Pt(rx, top, 0)], [Pt(-iw, h, -id), Pt(-rx, top, 0)], [Pt(iw, h, -id), Pt(rx, top, 0)], [Pt(0, h, id), Pt(0, top, 0)]]) {
    const sg = seg(Cm, a, b); if (sg) { ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); ctx.stroke(); } }
  const si = clipPts(Cm, [Pt(-iw, h, -id), Pt(iw, h, -id), Pt(iw, h, id), Pt(-iw, h, id)]); pathS(ctx, si); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,238,248,.35)'; ctx.lineWidth = 1.5; { const sg = seg(Cm, Pt(-rx, top, 0), Pt(rx, top, 0)); if (sg) { ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1] - 1.5); ctx.lineTo(sg[1][0], sg[1][1] - 1.5); ctx.stroke(); } }
  ctx.restore();
}

// ---------- police silhouette rig (adapted from engine/figures.js, with kneel + torso lean) ----------
function copShape(ctx, h, o) {
  const { capsule, limb } = window.F;
  const u = h / 8, walking = o.walk != null, walk = o.walk || 0, stride = walking ? (o.stride != null ? o.stride : .38) : 0, k = o.kneel || 0;
  const bob = walking ? Math.abs(Math.sin(walk)) * u * .08 : 0;
  const hipY = -4.1 * u + bob + k * 1.62 * u;
  const Fl = () => { ctx.fill(); ctx.beginPath(); };
  ctx.beginPath();
  const lA = Math.sin(walk) * stride, rA = -Math.sin(walk) * stride;
  const kneeL = Math.max(0, -Math.cos(walk)) * stride * 1.2, kneeR = Math.max(0, Math.cos(walk)) * stride * 1.2;
  const LL = [lerp(-lA, -.12, k), lerp(-kneeL, -1.43, k)], RL = [lerp(-rA, 1.32, k), lerp(-kneeR, -1.32, k)];
  const [lfx, lfy] = limb(ctx, -.25 * u, hipY, LL[0], LL[1], 2.05 * u, 2.0 * u, .36 * u, .28 * u, .2 * u); Fl();
  const [rfx, rfy] = limb(ctx, .25 * u, hipY, RL[0], RL[1], 2.05 * u, 2.0 * u, .36 * u, .28 * u, .2 * u); Fl();
  ctx.ellipse(lfx + .12 * u * (1 - k) - .1 * u * k, lfy - .08 * u, .42 * u, .17 * u, k * -.5, 0, 7); Fl();
  ctx.ellipse(rfx + .12 * u, rfy - .08 * u, .42 * u, .17 * u, 0, 0, 7); Fl();
  // upper body rotates about the hip
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(o.lean || 0); ctx.translate(0, -hipY);
  const shY = hipY - 2.6 * u, headY = hipY - 3.35 * u;
  const shW = 1.12 * u, waistW = .82 * u, coatLen = 2.1 * u * (1 - .35 * k), sw = walking ? Math.sin(walk) * .15 * u : 0;
  ctx.moveTo(-shW, shY + .15 * u); ctx.quadraticCurveTo(-shW * 1.02, shY - .25 * u, -.3 * u, shY - .32 * u); ctx.lineTo(.3 * u, shY - .32 * u);
  ctx.quadraticCurveTo(shW * 1.02, shY - .25 * u, shW, shY + .15 * u); ctx.lineTo(waistW, hipY - .6 * u);
  ctx.lineTo(waistW * 1.16 + sw + k * .5 * u, hipY + coatLen); ctx.lineTo(-waistW * 1.16 + sw - k * .3 * u, hipY + coatLen); ctx.lineTo(-waistW, hipY - .6 * u); ctx.closePath(); Fl();
  ctx.rect(-.2 * u, shY - .6 * u, .4 * u, .7 * u); Fl();
  const hx = (o.headTurn || 0) * .12 * u, hy = headY + (o.nod || 0) * .1 * u;
  ctx.ellipse(hx, hy, .46 * u, .56 * u, 0, 0, 7); Fl();
  ctx.moveTo(hx + .44 * u, hy - .05 * u); ctx.lineTo(hx + .6 * u, hy + .12 * u); ctx.lineTo(hx + .4 * u, hy + .2 * u); ctx.closePath(); Fl();
  // peaked police cap: band, flat crown, visor
  ctx.save(); ctx.translate(hx, hy - .38 * u); ctx.rotate(-.05 + (o.nod || 0) * .15);
  ctx.moveTo(-.5 * u, .12 * u); ctx.lineTo(.5 * u, .12 * u); ctx.lineTo(.56 * u, -.14 * u); ctx.lineTo(-.56 * u, -.2 * u); ctx.closePath(); Fl();
  ctx.moveTo(-.62 * u, -.14 * u); ctx.quadraticCurveTo(0, -.42 * u, .66 * u, -.1 * u); ctx.lineTo(.56 * u, -.04 * u); ctx.lineTo(-.56 * u, -.08 * u); ctx.closePath(); Fl();
  ctx.moveTo(.3 * u, .08 * u); ctx.quadraticCurveTo(.75 * u, .1 * u, .92 * u, .24 * u); ctx.lineTo(.4 * u, .2 * u); ctx.closePath(); Fl();
  ctx.restore();
  // arms
  const swing = walking ? Math.sin(walk) * stride * .9 : 0;
  const aL = o.armL || [swing + .08, -.15], aR = o.armR || [-swing - .08, .15];
  const sl = .3 * u;
  const [lhx, lhy] = limb(ctx, -shW * .9, shY + .1 * u, aL[0], aL[1], 1.45 * u, 1.35 * u, sl, sl * .85, .2 * u); Fl();
  const [rhx, rhy] = limb(ctx, shW * .9, shY + .1 * u, aR[0], aR[1], 1.45 * u, 1.35 * u, sl, sl * .85, .2 * u); Fl();
  ctx.arc(lhx, lhy, .2 * u, 0, 7); Fl(); ctx.arc(rhx, rhy, .2 * u, 0, 7); Fl();
  ctx.restore();
}
// draw a cop standing on the roof at (x,z); billboard follows the projected vertical
function drawCop(ctx, Cm, st, rim) {
  const pf = Cm.p(st.x, 0, st.z), ph = Cm.p(st.x, 1.8, st.z); if (pf[2] < NEAR || ph[2] < NEAR) return;
  const hpx = Math.hypot(ph[0] - pf[0], ph[1] - pf[1]), ang = Math.atan2(ph[0] - pf[0], pf[1] - ph[1]);
  blobShadow(ctx, Cm, st.x + (st.kneel || 0) * .25 * st.face, 0, st.z, .38 + (st.kneel || 0) * .2, .22, .7);
  ctx.save(); ctx.translate(pf[0], pf[1]); ctx.rotate(ang); if (st.face < 0) ctx.scale(-1, 1);
  const u = hpx / 8;
  ctx.save(); ctx.translate(-u * .07, -u * .05); ctx.fillStyle = rim; ctx.shadowColor = rim; ctx.shadowBlur = Math.max(4, u * .12); copShape(ctx, hpx, st); ctx.restore();
  ctx.fillStyle = '#0a0c10'; copShape(ctx, hpx, st);
  ctx.restore();
}

// ---------- pigeons ----------
const BIRDS = [
  { x: .25, z: -.9, ph: 1.2, d: [-1.1, 2.3, -2.2], dl: .0 }, { x: 2.35, z: -1.25, ph: 3.1, d: [1.4, 2.6, -1.8], dl: .07 },
  { x: -.2, z: .9, ph: .4, d: [-1.8, 2.2, -1.0], dl: .12 },
  { x: -2.6, z: -4.55, y: .66, ph: 2.2, d: [-1.2, 1.6, -1.8], dl: .18 }, { x: -1.9, z: -4.55, y: .66, ph: 5.1, d: [.6, 1.8, -2.4], dl: .1 },
  { x: 3.4, z: -4.55, y: .66, ph: 4.0, d: [1.6, 1.5, -1.6], dl: .22 }, { x: 4.1, z: -4.55, y: .66, ph: .9, d: [2.0, 1.4, -1.5], dl: .05 },
];
function drawBird(ctx, Cm, b, t, tFlush) {
  const tf = t - tFlush - b.dl; let x = b.x, y = b.y || 0, z = b.z, fly = 0, flap = 0;
  if (tf > 0) { const k = 1 - Math.exp(-tf * 1.4); x += b.d[0] * tf * .9; y += b.d[1] * tf + .9 * k; z += b.d[2] * tf; fly = 1; flap = Math.sin(tf * 26 + b.ph); }
  const p = Cm.p(x, y + .12, z); if (p[2] < NEAR) return; const s = Cm.f * .3 / p[2];
  if (s < 2) return;
  const dir = b.d[0] >= 0 ? 1 : -1;
  ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(dir, 1); ctx.fillStyle = '#16191e'; ctx.strokeStyle = '#16191e';
  if (!fly) { // sitting: body, head bobbing (pecking), tail
    const peck = Math.max(0, Math.sin(t * 3.2 + b.ph * 2)) ** 6;
    ctx.beginPath(); ctx.ellipse(0, s * .12, s * .32, s * .17, -.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * .3, lerp(-s * .05, s * .18, peck), s * .1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * .25, s * .1); ctx.lineTo(-s * .5, s * .04); ctx.lineTo(-s * .45, s * .16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,210,225,.25)'; ctx.beginPath(); ctx.ellipse(0, s * .02, s * .2, s * .05, -.12, 0, 7); ctx.fill();
  } else {
    const wy = flap * s * .45;
    ctx.beginPath(); ctx.ellipse(0, 0, s * .26, s * .1, -.15, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(s * .26, -s * .06, s * .08, 0, 7); ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * .07); ctx.lineCap = 'round';
    for (const zz of [-1, 1]) { ctx.globalAlpha = zz < 0 ? .7 : 1; ctx.beginPath(); ctx.moveTo(-s * .02, -s * .02); ctx.quadraticCurveTo(-s * .12 + zz * s * .05, -s * .2 - wy * .6, -s * .4 + zz * s * .08, -wy - s * .05); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- measuring tape on a horizontal plane ----------
function tape(ctx, Cm, a, b, y, p, col, side) {
  if (p <= .002) return null;
  const L0 = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L0, dz = (b[1] - a[1]) / L0, nx = -dz * side, nz = dx * side, ww = .028;
  const e = lerp(0, L0, clamp(p)); const ex = a[0] + dx * e, ez = a[1] + dz * e;
  ctx.save();
  const s = quad(ctx, Cm, [[a[0], y, a[1]], [ex, y, ez], [ex + nx * ww, y, ez + nz * ww], [a[0] + nx * ww, y, a[1] + nz * ww]], col);
  if (s) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.strokeStyle = 'rgba(20,16,4,.85)'; ctx.lineWidth = 1.4;
  for (let m = .05; m < e; m += .05) { const long = Math.round(m * 100) % 10 === 0, l = long ? ww * .9 : ww * .5; const sg = seg(Cm, [a[0] + dx * m, y, a[1] + dz * m], [a[0] + dx * m + nx * l, y, a[1] + dz * m + nz * l]); if (sg) { ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); ctx.stroke(); } }
  // tape case at the start, hook at the end
  const cs = .05; const cb = [[a[0] - dx * cs * 1.6, y, a[1] - dz * cs * 1.6], [a[0], y, a[1]], [a[0] + nx * cs * 1.4, y, a[1] + nz * cs * 1.4], [a[0] - dx * cs * 1.6 + nx * cs * 1.4, y, a[1] - dz * cs * 1.6 + nz * cs * 1.4]];
  quad(ctx, Cm, cb.map(q => [q[0], q[1] + .045, q[2]]), '#d9b21c'); ctx.strokeStyle = '#3a2f06'; ctx.lineWidth = 1.5; ctx.stroke();
  const hp = Cm.p(ex, y, ez); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(hp[0] - 3, hp[1] - 5, 6, 10);
  ctx.restore();
  return [Cm.p(a[0], y, a[1]), hp];
}

// glowing dimension line with extension ticks and arrowheads, offset from a measured edge
function dimLine(ctx, Cm, a, b, y, o, p, col) {
  if (p <= .002) return;
  const A = [a[0] + o[0], y, a[1] + o[1]], B = [b[0] + o[0], y, b[1] + o[1]], q = clamp(p), Ee = [lerp(A[0], B[0], q), y, lerp(A[2], B[2], q)];
  const sa = Cm.p(A[0], A[1], A[2]), se = Cm.p(Ee[0], Ee[1], Ee[2]); if (sa[2] < NEAR || se[2] < NEAR) return;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(sa[0], sa[1]); ctx.lineTo(se[0], se[1]); ctx.stroke();
  const ext = (P3) => { const s0 = Cm.p(P3[0] - o[0] * .75, y, P3[2] - o[1] * .75), s1 = Cm.p(P3[0] + o[0] * .35, y, P3[2] + o[1] * .35); ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke(); };
  const head = (s, d) => { const ang = Math.atan2(d[1], d[0]); ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-16, -8); ctx.lineTo(-16, 8); ctx.closePath(); ctx.fill(); ctx.restore(); };
  ext(A); head(sa, [sa[0] - se[0], sa[1] - se[1]]);
  if (q >= 1) { ext(B); head(se, [se[0] - sa[0], se[1] - sa[1]]); }
  ctx.restore();
}

// ---------- the scene ----------
window.KL.scenes.roof = function (ctx, t, d, info) {
  if (!RS) initRoof();
  const tAc = at(info, '액자는', .08), tRoof = at(info, '지붕', .15), tUp = at(info, '위에', .2), tPol = at(info, '경찰은', .3), tPic = at(info, '그림을', .4),
    tCeil = at(info, '천장', .46), tWin = at(info, '창으로', .52), tOut = at(info, '빼냈다고', .58), tBut = at(info, '봤지만', .66), tF = at(info, '액자가', .75),
    tCmp = at(info, '창보다', .86), tX = at(info, '컸다', .93);
  const tMeasF = tF - .2, tMeasS = tF + .15;              // the two "tick" sounds
  const tWhip0 = tF + .0, tWhip1 = tF + .32;

  // ---- camera path ----
  const keys = [
    [-.4, FR.x + .3, 2.45, FR.z + 2.35, FR.x, 0, FR.z + .12, 1320],
    [tRoof - .12, FR.x + .2, 2.2, FR.z + 2.05, FR.x, 0, FR.z + .62, 1320],
    [tRoof + .62, .25, 2.6, 4.7, .1, .05, .12, 1000],
    [tPic, .4, 2.5, 4.5, .12, .1, .15, 1000],
    [tOut + .05, .0, 2.45, 4.45, .05, .5, -.05, 1060],
    [tBut + .22, FR.x - .45, 2.75, FR.z + 3.25, FR.x + .25, .3, FR.z + .02, 1300],
    [tWhip0, FR.x - .5, 2.65, FR.z + 3.05, FR.x + .25, .28, FR.z + .05, 1300],
    [tWhip1, SK.x + .2, 3.1, 2.05, SK.x - .1, .35, SK.z + .02, 1300],
    [tX, SK.x + .15, 3.05, 1.85, SK.x - .1, .32, SK.z + .05, 1300],
    [d + .5, SK.x + .08, 2.7, 1.4, SK.x - .1, .32, SK.z + .1, 1300],
  ];
  const cv = camAt(keys, t);
  const dr = drift(t, .55, 21);
  const thunkK = Math.exp(-Math.max(0, t - tRoof) * 7) * (t > tRoof ? 1 : 0), slashK = Math.exp(-Math.max(0, t - tX) * 9) * (t > tX ? 1 : 0);
  const shk = (thunkK * .6 + slashK * .8);
  const shx = dr.x + shk * 14 * noise1(t * 40, 3), shy = dr.y + shk * 14 * noise1(t * 40, 5);
  const Cm = makeCam([cv[0], cv[1], cv[2]], [cv[3], cv[4], cv[5]], cv[6], dr.r * .8 + shk * .006 * noise1(t * 30, 7), shx, shy);
  const whip = Math.sin(clamp((t - tWhip0) / (tWhip1 - tWhip0)) * Math.PI);
  const cloudT = t * .9;

  // ---- soft background pass at half resolution (sky, far town, mist, roof surface), upscaled once ----
  const [BG, bctx] = buf('roofBG', 540, 960); bctx.setTransform(.5, 0, 0, .5, 0, 0);
  { const ctx = bctx;
    // ---- sky + far town ----
    const hz = Cm.horizon();
    { const g = ctx.createLinearGradient(0, hz[1] - 1100, 0, hz[1] + 40); g.addColorStop(0, '#171b21'); g.addColorStop(.6, '#353d47'); g.addColorStop(1, '#646e7a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (hz[1] > -200) {
      ctx.save(); ctx.globalAlpha = .9; const cx = ((hz[0] * .25 - cloudT * 22) % 1400 + 1400) % 1400;
      for (let k = -1; k < 2; k++) ctx.drawImage(RS.clouds, cx + k * 1400 - 700, hz[1] - 760, 1400, 560); ctx.restore();
      const fa = Cm.p(-60, -8, -70), fb = Cm.p(60, 18, -70); if (fa[2] > 1) ctx.drawImage(RS.far, fa[0], fb[1], fb[0] - fa[0], fa[1] - fb[1]);
      const na = Cm.p(-26, -12, -22), nb = Cm.p(26, 4.6, -22); if (na[2] > 1) ctx.drawImage(RS.near, na[0], nb[1], nb[0] - na[0], na[1] - nb[1]);
      mist(ctx, t, hz[1] + 40, .5, 26);
    }

    // ---- roof surface ----
    const roofPts = [[ROOF.x0, 0, ROOF.z0], [ROOF.x1, 0, ROOF.z0], [ROOF.x1, 0, ROOF.z1], [ROOF.x0, 0, ROOF.z1]];
    const rs = clipPts(Cm, roofPts);
    if (rs.length > 2) {
      let ymin = 1e9, ymax = -1e9; rs.forEach(p => { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); });
      ctx.save(); pathS(ctx, rs); ctx.clip();
      const g = ctx.createLinearGradient(0, ymin, 0, ymax); g.addColorStop(0, '#6b737c'); g.addColorStop(.35, '#4a5058'); g.addColorStop(1, '#262a30'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // gravel texture mapped onto the plane around the look-at point
      const m = planeXf(Cm, cv[3], 0, cv[5]); const pat = ctx.createPattern(RS.tile, 'repeat'); const sc = 1.6 / 512;
      pat.setTransform(new DOMMatrix([m[0] * sc, m[1] * sc, m[2] * sc, m[3] * sc, m[4], m[5]]));
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      // membrane seams converge in perspective
      ctx.lineWidth = 2;
      for (let xx = -8.5; xx <= 8.5; xx += 1.1) { const sg = seg(Cm, [xx, 0, ROOF.z0], [xx, 0, ROOF.z1]); if (!sg) continue; ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); ctx.stroke(); ctx.strokeStyle = 'rgba(210,220,232,.07)'; ctx.beginPath(); ctx.moveTo(sg[0][0] + 2, sg[0][1]); ctx.lineTo(sg[1][0] + 2, sg[1][1]); ctx.stroke(); }
      for (let zz = ROOF.z0 + 1.4; zz < ROOF.z1; zz += 1.6) { const sg = seg(Cm, [ROOF.x0, 0, zz], [ROOF.x1, 0, zz]); if (!sg) continue; ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); ctx.stroke(); }
      // cloud shadows drifting across the roof (overcast daylight)
      { const m2 = planeXf(Cm, 0, 0, -1); ctx.save(); ctx.transform(m2[0], m2[1], m2[2], m2[3], m2[4], m2[5]); ctx.globalAlpha = .5;
        const off = (t * .45) % 16; for (let k = -1; k < 2; k++) ctx.drawImage(RS.shadow, -8 + off + k * 16 - 8, -8, 16, 16); ctx.restore(); }
      // a soft break in the clouds keeps the focal point lit; it follows the camera's look-at point
      { const m3 = planeXf(Cm, cv[3], 0, cv[5] - .1); ctx.save(); ctx.transform(m3[0], m3[1], m3[2], m3[3], m3[4], m3[5]); ctx.globalCompositeOperation = 'lighter';
        const br = .8 + .2 * fbm(t * .7, 13); const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.6); lg.addColorStop(0, `rgba(226,232,240,${.17 * br})`); lg.addColorStop(.5, `rgba(200,210,224,${.06 * br})`); lg.addColorStop(1, 'rgba(200,210,224,0)');
        ctx.fillStyle = lg; ctx.fillRect(-2.6, -2.6, 5.2, 5.2); ctx.restore(); }
      ctx.restore();
    }
  }
  ctx.drawImage(BG, 0, 0, W, H);
  // back parapet + far roof clutter
  { const z0 = ROOF.z0; quad(ctx, Cm, [[ROOF.x0, 0, z0], [ROOF.x1, 0, z0], [ROOF.x1, .62, z0], [ROOF.x0, .62, z0]], '#2a3038');
    quad(ctx, Cm, [[ROOF.x0, .62, z0], [ROOF.x1, .62, z0], [ROOF.x1, .66, z0 - .25], [ROOF.x0, .66, z0 - .25]], '#6a737d');
    const vent = (x, z, r, hh) => { const a = Cm.p(x, 0, z), b = Cm.p(x, hh, z); if (a[2] < NEAR) return; const rw = Cm.f * r / a[2]; ctx.fillStyle = '#20252b'; ctx.fillRect(b[0] - rw, b[1], rw * 2, a[1] - b[1]); ctx.fillStyle = '#59616b'; ctx.beginPath(); ctx.ellipse(b[0], b[1], rw * 1.2, rw * .45, 0, 0, 7); ctx.fill(); };
    vent(3.3, -2.7, .09, .55); vent(-3.6, -2.2, .07, .45); vent(-.4, -3.6, .06, .4);
    // a utility box on the far right
    const bx = 4.4, bz = -3.3, bw = .55, bd = .35, bh = .6;
    quad(ctx, Cm, [[bx - bw, 0, bz + bd], [bx + bw, 0, bz + bd], [bx + bw, bh, bz + bd], [bx - bw, bh, bz + bd]], '#2c3239');
    quad(ctx, Cm, [[bx - bw, bh, bz - bd], [bx + bw, bh, bz - bd], [bx + bw, bh, bz + bd], [bx - bw, bh, bz + bd]], '#4d555e');
    if (Cm.eye[0] < bx - bw) quad(ctx, Cm, [[bx - bw, 0, bz - bd], [bx - bw, 0, bz + bd], [bx - bw, bh, bz + bd], [bx - bw, bh, bz - bd]], '#22272d');
  }

  // ---- police choreography ----
  // walk along a straight line at speed v and ease into a stop; feet are phase-locked to the distance travelled
  const walker = (t0, X0, Z0, X1, Z1, v) => {
    const dist = Math.hypot(X1 - X0, Z1 - Z0), T = dist / v * 1.22, p = clamp((t - t0) / T), e = 1 - Math.pow(1 - p, 1.4);
    return { x: lerp(X0, X1, e), z: lerp(Z0, Z1, e), moving: p > 0 && p < 1, walk: e * dist / .6 * Math.PI, stride: .42 * clamp((1 - p) * 3.5), p };
  };
  const copA = (() => { // enters from the right, stops by the frame, points at it, kneels and tapes it
    const w = walker(tRoof + .2, 3.35, .05, 1.98, -.42, 1.6);
    const pt = P(t, tPic - .1, tPic + .15, E.outBack) * (1 - P(t, tOut - .1, tOut + .15, E.inOutQ));
    const kn = P(t, tBut - .12, tBut + .22, E.inOutQ);
    const reach = P(t, tMeasF - .12, tMeasF + .06, E.outQ);
    const look = P(t, tX + .15, tX + .45, E.inOutQ);
    const stand = w.p >= 1;
    const armR = stand ? [lerp(lerp(-.08, 1.0, pt), lerp(.35, .5, reach), kn), lerp(lerp(.15, -.05, pt), lerp(.45, .15, reach), kn)] : null;
    const armL = stand ? [lerp(.08, .3, kn), lerp(-.15, .55, kn)] : null;
    return { x: w.x, z: w.z, face: -1, walk: stand ? null : w.walk, stride: w.stride, kneel: kn, lean: kn * lerp(.3, .45, reach) - look * .15, armR, armL, nod: kn * .45 * (1 - look), headTurn: -look * 1.4 };
  })();
  const copB = (() => { // enters from the left, stops by the skylight, points at it, kneels and tapes the opening
    const w0 = walker(tRoof + .3, -3.2, -1.55, -1.92, -.98, 1.55), w1 = walker(tBut + .08, -1.92, -.98, -2.05, -.38, 2.2);
    const w = t < tBut + .08 ? w0 : Object.assign(w1, { walk: w0.walk + w1.walk });
    const pt = P(t, tCeil - .12, tCeil + .14, E.outBack) * (1 - P(t, tBut - .1, tBut + .2, E.inOutQ));
    const kn = P(t, tF - .02, tF + .3, E.inOutQ);
    const reach = P(t, tMeasS - .1, tMeasS + .08, E.outQ);
    const look = P(t, tX + .3, tX + .6, E.inOutQ);
    const stand = w.p >= 1;
    const armR = stand ? [lerp(lerp(-.08, .95, pt), lerp(.4, .55, reach), kn), lerp(lerp(.15, .05, pt), lerp(.45, .15, reach), kn)] : null;
    const armL = stand ? [lerp(.08, .3, kn), lerp(-.15, .55, kn)] : null;
    return { x: w.x, z: w.z, face: 1, walk: stand ? null : w.walk, stride: w.stride, kneel: kn, lean: kn * lerp(.28, .42, reach) - look * .12, armR, armL, nod: kn * .35 * (1 - look) - look * .25, headTurn: look * .8 };
  })();

  // ---- roof objects, far → near ----
  const items = [];
  const zc = (x, y, z) => Cm.c(x, y, z)[2];
  BIRDS.forEach((b, i) => items.push([zc(b.x, b.y || 0, b.z) + (t > tRoof + b.dl ? -50 : 0), () => drawBird(ctx, Cm, b, t, tRoof + .02)]));
  items.push([zc(SK.x, 0, SK.z + SK.od), () => drawSkylight(ctx, Cm, t, { inner: P(t, tPic - .05, tCeil + .2) * (1 - P(t, tBut, tBut + .4)) })]);
  items.push([zc(FR.x, 0, FR.z + .3), () => {
    blobShadow(ctx, Cm, FR.x + .03, 0, FR.z + .05, .78, .8, .55);
    drawFrame(ctx, Cm, FR, 0, { glint: P(t, tAc - .25, tAc + .45, E.inOutQ) });
    // "empty" — where the canvas should be
    const ea = P(t, tAc - .05, tAc + .15) * (1 - P(t, tRoof + .25, tRoof + .6));
    if (ea > 0) { const s = clipPts(Cm, rectAt(FR, FR.w - FR.b - .03, FR.d - FR.b - .03, FR.th)); ctx.save(); ctx.globalAlpha *= ea * (.65 + .35 * Math.sin(t * 9)); ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = '#eef3f8'; ctx.lineWidth = 3; pathS(ctx, s); ctx.stroke(); ctx.restore(); }
  }]);
  const tA0 = tRoof + .42, tB0 = tRoof + .55;
  if (t > tA0 - .05) items.push([zc(copA.x, 0, copA.z), () => drawCop(ctx, Cm, copA, '#c9d6e8')]);
  if (t > tB0 - .05) items.push([zc(copB.x, 0, copB.z), () => drawCop(ctx, Cm, copB, '#c9d6e8')]);
  items.sort((a, b) => b[0] - a[0]).forEach(it => it[1]());

  // ---- ground ring on "지붕" ----
  { const q = P(t, tRoof, tRoof + .9, E.outC); if (q > 0 && q < 1) { const m = planeXf(Cm, FR.x, .01, FR.z); ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); ctx.strokeStyle = rgba(K.goldHi, (1 - q) * .9); ctx.lineWidth = .02 + .03 * (1 - q); ctx.beginPath(); ctx.arc(0, 0, .7 + 1.6 * q, 0, 7); ctx.stroke(); ctx.restore(); } }

  // ---- hypothesis: ghost of the painting hoisted up through the skylight along a dotted route ----
  const rP = P(t, tCeil + .02, tOut + .35, E.inOutQ), grey = P(t, tBut - .05, tBut + .2), routeA = 1 - P(t, tBut + .08, tBut + .38);
  const route = (() => { const pts = []; const A = [SK.x, SK.h + SK.rh + .05, SK.z], B = [SK.x, 1.35, SK.z], Cc = [SK.x + .85, 1.85, SK.z + .2], D = [FR.x - .05, .42, FR.z];
    for (let i = 0; i <= 50; i++) { const k = i / 50, uu = 1 - k; pts.push([uu * uu * uu * A[0] + 3 * uu * uu * k * B[0] + 3 * uu * k * k * Cc[0] + k * k * k * D[0], uu * uu * uu * A[1] + 3 * uu * uu * k * B[1] + 3 * uu * k * k * Cc[1] + k * k * k * D[1], uu * uu * uu * A[2] + 3 * uu * uu * k * B[2] + 3 * uu * k * k * Cc[2] + k * k * k * D[2]]); }
    return pts; })();
  if (rP > 0 && routeA > 0) {
    const col = grey > 0 ? `rgba(${Math.round(lerp(245, 150, grey))},${Math.round(lerp(248, 156, grey))},${Math.round(lerp(252, 166, grey))},${.92 * routeA})` : 'rgba(245,248,252,.92)';
    const sp = route.map(p => Cm.p(p[0], p[1], p[2]));
    // the part below the glass is only visible through the skylight opening
    const open = clipPts(Cm, [[SK.x - SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z + SK.id], [SK.x - SK.iw, SK.h, SK.z + SK.id]]);
    const jit = grey > 0 && grey < 1 ? (hash(Math.floor(t * 40)) - .5) * 16 : 0;
    ctx.save(); ctx.translate(jit, 0);
    const head = pathReveal(ctx, sp, rP, { color: col, w: 5, dash: [14, 12], head: grey <= 0 });
    // ghost painting riding the head of the route (upright billboard)
    ctx.restore();
  }
  { // the fishing line drops into the skylight before the ghost painting is hoisted
    const dn = P(t, tPic - .22, tPic + .14, E.outC), lineA = dn * (1 - P(t, tOut + .2, tBut + .1));
    if (lineA > 0) {
      const rise = P(t, tPic + .12, tCeil + .02, E.inOutQ), gk = rP * 50, gi = Math.min(49, Math.floor(gk)), gf = gk - gi;
      const gp = rP <= 0 ? [SK.x, lerp(-.6, SK.h + SK.rh + .05, rise), SK.z] : [lerp(route[gi][0], route[gi + 1][0], gf), lerp(route[gi][1], route[gi + 1][1], gf), lerp(route[gi][2], route[gi + 1][2], gf)];
      const topY = gp[1] + .54, hookY = rise > 0 || rP > 0 ? topY : lerp(6, SK.h - .25, dn);
      const sway = .04 * Math.sin(t * 2.3);
      const a3 = Cm.p(gp[0] + sway + .6 * rP, 7, gp[2]), b3 = Cm.p(gp[0], hookY, gp[2]);
      const open = clipPts(Cm, [[SK.x - SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z + SK.id], [SK.x - SK.iw, SK.h, SK.z + SK.id]]);
      ctx.save(); ctx.globalAlpha *= lineA;
      if (hookY < SK.h + SK.rh) { const yBack = Math.min(...open.map(q => q[1])); ctx.beginPath(); ctx.rect(-50, -2000, W + 100, yBack + 2000); open.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.clip(); }
      ctx.strokeStyle = 'rgba(236,242,250,.85)'; ctx.lineWidth = 1.8; ctx.shadowColor = '#cfe3ff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(a3[0], a3[1]); ctx.lineTo(b3[0], b3[1]); ctx.stroke();
      if (rise <= 0 && rP <= 0) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b3[0], b3[1]); ctx.lineTo(b3[0], b3[1] + 10); ctx.arc(b3[0] + 7, b3[1] + 10, 7, Math.PI, 0, true); ctx.stroke(); }
      ctx.restore();
    }
  }
  { // ghost painting: rises inside the skylight, then rides the head of the route (upright billboard)
    const rise = P(t, tPic + .12, tCeil + .02, E.inOutQ);
    const gk = rP * 50, gi = Math.min(49, Math.floor(gk)), gf = gk - gi;
    const gp = rP <= 0 ? [SK.x, lerp(-.6, SK.h + SK.rh + .05, rise), SK.z] : [lerp(route[gi][0], route[gi + 1][0], gf), lerp(route[gi][1], route[gi + 1][1], gf), lerp(route[gi][2], route[gi + 1][2], gf)];
    const ga = P(t, tPic + .1, tPic + .25) * (1 - P(t, tOut + .2, tBut + .1));
    if (ga > 0) {
      const open = clipPts(Cm, [[SK.x - SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z - SK.id], [SK.x + SK.iw, SK.h, SK.z + SK.id], [SK.x - SK.iw, SK.h, SK.z + SK.id]]);
      const pc = Cm.p(gp[0], gp[1] + .27, gp[2]), pu = Cm.p(gp[0], gp[1] + .77, gp[2]); const hpx = Math.hypot(pu[0] - pc[0], pu[1] - pc[1]), wpx = hpx * .44 / .5;
      ctx.save();
      if (gp[1] < SK.h + SK.rh + .02) { // below the glass: visible only through the opening (and above the skylight's far edge)
        const yBack = Math.min(...open.map(q => q[1])); ctx.beginPath(); ctx.rect(-50, -2000, W + 100, yBack + 2000); open.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.clip(); }
      ctx.translate(pc[0], pc[1]); ctx.rotate(Math.atan2(pu[0] - pc[0], pc[1] - pu[1]) + .06 * Math.sin(t * 5));
      // the framed painting as the theory imagines it (a translucent, symbolic ghost)
      ctx.globalAlpha *= ga; ctx.save(); ctx.globalAlpha *= .55; ctx.drawImage(T.portrait, -wpx * .39, -hpx * .4, wpx * .78, hpx * .8); ctx.globalAlpha /= .55; ctx.globalAlpha *= .6; ctx.drawImage(T.frame, -wpx / 2, -hpx / 2, wpx, hpx); ctx.restore();
      ctx.setLineDash([8, 6]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#cfe3ff'; ctx.shadowBlur = 14; ctx.strokeRect(-wpx / 2 - 4, -hpx / 2 - 4, wpx + 8, hpx + 8);
      ctx.restore();
    }
  }
  if (rP > 0 && routeA > 0) {
    const grey = P(t, tBut - .05, tBut + .2); const sp = route.map(p => Cm.p(p[0], p[1], p[2]));
    const jit = grey > 0 && grey < 1 ? (hash(Math.floor(t * 40)) - .5) * 16 : 0;
    ctx.save(); ctx.translate(jit, 0);
    // hypothesis label near the apex
    const la = P(t, tWin, tWin + .25, E.outBack) * routeA;
    if (la > 0) { const ap = sp[30]; ctx.save(); ctx.translate(ap[0] + 10, ap[1] - 70); ctx.scale(lerp(.7, 1, clamp(la)), lerp(.7, 1, clamp(la)));
      label(ctx, '낚싯줄 가설', 0, 0, { size: 40, color: grey > .5 ? '#c3c8cf' : '#f4f6f9', bg: 'rgba(10,13,18,.82)', border: grey > .5 ? 'rgba(150,156,166,.6)' : 'rgba(255,255,255,.7)', a: clamp(la * 2) });
      if (grey > 0) { ctx.globalAlpha *= grey; ctx.strokeStyle = 'rgba(200,205,212,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-118, 2); ctx.lineTo(lerp(-118, 118, grey), 2); ctx.stroke(); }
      ctx.restore(); }
    ctx.restore();
  }

  // ---- measuring: tape across the frame (tick), then across the skylight opening (tick) ----
  const mA = P(t, tMeasF, tMeasF + .18, E.outBack), mFade = 1 - P(t, tWhip1 + .4, tWhip1 + .7);
  if (mA > 0 && mFade > 0) {
    ctx.save(); ctx.globalAlpha *= mFade;
    const a3 = frameAt(FR, FR.w + .045, -FR.d, 0), b3 = frameAt(FR, FR.w + .045, FR.d, 0);
    const ends = tape(ctx, Cm, [a3[0], a3[2]], [b3[0], b3[2]], .012, mA, '#f2cf3a', 1);
    const ou = [Math.cos(FR.yaw) * .17, Math.sin(FR.yaw) * .17], a4 = frameAt(FR, FR.w, -FR.d, 0), b4 = frameAt(FR, FR.w, FR.d, 0);
    dimLine(ctx, Cm, [a4[0], a4[2]], [b4[0], b4[2]], .015, ou, P(t, tMeasF + .02, tMeasF + .2, E.outC), K.goldHi);
    if (ends) { const mx = (ends[0][0] + ends[1][0]) / 2, my = (ends[0][1] + ends[1][1]) / 2; const la = P(t, tMeasF + .05, tMeasF + .25, E.outBack);
      ctx.save(); ctx.translate(mx + 128, my + 6); ctx.scale(la, la); label(ctx, '액자', 0, 0, { size: 40, color: '#1a1408', bg: K.goldHi, a: clamp(la * 2) }); ctx.restore(); }
    ctx.restore();
  }
  const mB = P(t, tMeasS, tMeasS + .18, E.outBack);
  if (mB > 0) {
    const fadeB = 1 - P(t, tCmp - .25, tCmp + .05);
    ctx.save(); ctx.globalAlpha *= fadeB;
    const ends = tape(ctx, Cm, [SK.x - SK.iw, SK.z + SK.id + .025], [SK.x + SK.iw, SK.z + SK.id + .025], SK.h + .012, mB, '#f2cf3a', -1);
    dimLine(ctx, Cm, [SK.x - SK.iw, SK.z + SK.od], [SK.x + SK.iw, SK.z + SK.od], .01, [0, .14], P(t, tMeasS + .02, tMeasS + .2, E.outC), '#eef4fb');
    if (ends) { const mx = (ends[0][0] + ends[1][0]) / 2, my = (ends[0][1] + ends[1][1]) / 2; const la = P(t, tMeasS + .05, tMeasS + .25, E.outBack);
      ctx.save(); ctx.translate(mx, my + 56); ctx.scale(la, la); label(ctx, '천장 창', 0, 0, { size: 40, color: '#10141a', bg: '#e8edf3', a: clamp(la * 2) }); ctx.restore(); }
    ctx.restore();
  }

  // ---- the frame's ghost flies over and settles on the skylight ----
  const fl = P(t, tF + .22, tCmp + .12, E.inOutC);
  if (fl > 0) {
    const yTop = SK.h + SK.rh + .04;
    const lift = Math.sin(fl * Math.PI) * .75;
    const jolt = t > tX ? -.05 * Math.exp(-(t - tX) * 10) * Math.sin((t - tX) * 40) : 0;
    const gx = lerp(FR.x, SK.x, fl), gz = lerp(FR.z, SK.z, fl), gy = lerp(0, yTop, E.inQ(fl)) + lift + jolt, yaw = lerp(FR.yaw, 0, E.inOutQ(clamp(fl * 1.3)));
    const gfr = Object.assign({}, FR, { x: gx, z: gz, yaw });
    // footprint shadow on the roof and drop lines once it hovers above the opening
    blobShadow(ctx, Cm, gx, SK.h, gz, .6, .65, .25 * fl);
    // motion trail
    if (fl < 1) for (let k = 3; k >= 1; k--) { const q = clamp(fl - k * .06); if (q <= 0) continue; const tr = Object.assign({}, FR, { x: lerp(FR.x, SK.x, q), z: lerp(FR.z, SK.z, q), yaw: lerp(FR.yaw, 0, E.inOutQ(clamp(q * 1.3))) });
      drawFrame(ctx, Cm, tr, lerp(0, yTop, E.inQ(q)) + Math.sin(q * Math.PI) * .75, { a: .1 * (4 - k), ghost: true }); }
    // overhang: frame footprint minus the opening, filled red after "컸다"
    const over = P(t, tX - .02, tX + .2);
    const settled = P(t, tCmp - .05, tCmp + .2);
    if (settled > 0) {
      const so = clipPts(Cm, rectAt(gfr, gfr.w, gfr.d, SK.h + .005)), si = clipPts(Cm, [[SK.x - SK.iw, SK.h + .005, SK.z - SK.id], [SK.x + SK.iw, SK.h + .005, SK.z - SK.id], [SK.x + SK.iw, SK.h + .005, SK.z + SK.id], [SK.x - SK.iw, SK.h + .005, SK.z + SK.id]]);
      if (over > 0) { ctx.save(); ctx.beginPath(); so.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); si.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
        ctx.fillStyle = rgba(K.red, .42 * over * (1 - .25 * Math.sin((t - tX) * 6) ** 2)); ctx.fill('evenodd'); ctx.restore(); }
      // the opening, outlined
      ctx.save(); ctx.globalAlpha *= settled; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12; ctx.strokeStyle = '#f4f8fc'; ctx.lineWidth = 4; pathS(ctx, si); ctx.stroke(); ctx.restore();
      // drop lines from the ghost corners
      ctx.save(); ctx.globalAlpha *= settled * .8; ctx.setLineDash([6, 6]); ctx.strokeStyle = rgba(K.goldHi, .8); ctx.lineWidth = 2;
      rectAt(gfr, gfr.w, gfr.d, gy).forEach((c3, i) => { const sg = seg(Cm, c3, [c3[0], 0, c3[2]]); if (sg) { ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); ctx.stroke(); } }); ctx.restore();
    }
    const gA = .62 + .2 * over;
    const fr2 = drawFrame(ctx, Cm, gfr, gy, { a: gA, ghost: true });
    if (over > 0 && fr2) { ctx.save(); ctx.globalAlpha *= over; ctx.strokeStyle = K.red; ctx.shadowColor = K.red; ctx.shadowBlur = 20; ctx.lineWidth = 5; pathS(ctx, fr2.so); ctx.stroke(); ctx.restore(); }
  }

  // ---- foreground parapet (out of focus, dark) ----
  { const z1 = ROOF.z1; const s = quad(ctx, Cm, [[ROOF.x0, 0, z1], [ROOF.x1, 0, z1], [ROOF.x1, .7, z1], [ROOF.x0, .7, z1]], null);
    if (s) { ctx.fillStyle = '#121519'; ctx.fill(); }
    quad(ctx, Cm, [[ROOF.x0, .7, z1], [ROOF.x1, .7, z1], [ROOF.x1, .74, z1 + .28], [ROOF.x0, .74, z1 + .28]], '#30363e');
    quad(ctx, Cm, [[ROOF.x0, -3, z1 + .28], [ROOF.x1, -3, z1 + .28], [ROOF.x1, .74, z1 + .28], [ROOF.x0, .74, z1 + .28]], '#0d0f12');
  }

  // ---- atmosphere: soft daylight shafts, wind-blown motes, fog wisps ----
  godrays(ctx, 120, -260, 1.05, .5, 1900, '#dfe7f1', .05, t, 4);
  motes(ctx, t, { n: 46, color: '#dfe7f2', a: .32, seed: 61, area: [-60, 380, 1200, 1000], size: 2.4, speed: 34 });
  mist(ctx, t * 1.5 + 3, 1000, .28, 60);
  // whip-pan streaks
  if (whip > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const y = 420 + hash(i * 7) * 900, len = 200 + hash(i * 3) * 500, x = ((hash(i * 11) * 1600 + t * 4200) % 1800) - 300;
      ctx.strokeStyle = `rgba(220,230,245,${.16 * whip * hash(i * 5)})`; ctx.lineWidth = 2 + 6 * hash(i); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * whip, y); ctx.stroke(); }
    ctx.restore();
  }

  // ---- labels (screen space) ----
  const fc = Cm.p(FR.x, FR.th, FR.z), fn3 = frameAt(FR, 0, FR.d, FR.th), fn = Cm.p(fn3[0], fn3[1], fn3[2]);
  const tagE = P(t, tAc - .02, tAc + .25) * (1 - P(t, tRoof - .05, tRoof + .1));
  if (tagE > 0) tag(ctx, '빈 액자', fn[0], fn[1] + 6, tagE, { size: 44, dx: 0, dy: 110, border: K.goldHi });
  const tagR = P(t, tUp - .05, tUp + .25) * (1 - P(t, tPol - .15, tPol + .1));
  if (tagR > 0) { marker(ctx, fc[0], fc[1], t, tagR, K.goldHi); tag(ctx, '지붕 위', fc[0], fc[1], tagR, { size: 42, dx: -40, dy: -170, border: K.goldHi }); }
  const tagP = P(t, tPol - .05, tPol + .2) * (1 - P(t, tPic + .2, tPic + .45));
  if (tagP > 0) { const hp = Cm.p(copA.x, 1.9, copA.z), hb = Cm.p(copB.x, 1.9, copB.z); tag(ctx, '경찰', clamp(hp[0], 0, 1000), hp[1], tagP, { size: 36, dx: -110, dy: -60, border: 'rgba(220,230,245,.7)' }); }

  // red slash on "컸다" + verdict chip
  const xs = P(t, tX + .02, tX + .2, E.outQ);
  if (xs > 0) {
    const c0 = Cm.p(SK.x, SK.h + SK.rh, SK.z); const r = 150;
    ctx.save(); ctx.strokeStyle = K.red; ctx.lineCap = 'round'; ctx.shadowColor = K.red; ctx.shadowBlur = 22; ctx.lineWidth = 16;
    const a1 = clamp(xs * 1.8), a2 = clamp(xs * 1.8 - .8);
    ctx.beginPath(); ctx.moveTo(c0[0] - r, c0[1] - r * .8); ctx.lineTo(lerp(c0[0] - r, c0[0] + r, a1), lerp(c0[1] - r * .8, c0[1] + r * .8, a1)); ctx.stroke();
    if (a2 > 0) { ctx.beginPath(); ctx.moveTo(c0[0] + r, c0[1] - r * .8); ctx.lineTo(lerp(c0[0] + r, c0[0] - r, a2), lerp(c0[1] - r * .8, c0[1] + r * .8, a2)); ctx.stroke(); }
    ctx.restore();
    if (xs < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - xs) * .5; glow(ctx, c0[0], c0[1], 380, K.red, .5); ctx.restore(); }
  }
  const ch = P(t, tCmp + .22, tCmp + .5, E.outBack);
  if (ch > .002) { ctx.save(); ctx.translate(540, 1188 + 30 * (1 - clamp(ch))); ctx.scale(lerp(.7, 1, clamp(ch)), lerp(.7, 1, clamp(ch)));
    label(ctx, '액자 > 천장 창', 0, 0, { size: 46, color: '#fff', bg: K.red, a: clamp(ch * 2), padX: 28, padY: 14 }); ctx.restore(); }

  // ---- grade: cool overcast tint, breathing falloff ----
  darkness(ctx, 540, 860, 1050 + 60 * Math.sin(t * 1.1), .5, .35);
  if (thunkK > 0) flash(ctx, thunkK * .08, '#dfe8f5');
};
})();
