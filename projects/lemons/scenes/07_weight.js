// weight (real audio, BBC Outlook 2019): "The sort of weight of 8,000 tons of boat was pulling it so tight so quickly"
// Extreme close-up of the snag point (hard cut from 'snag', which pushed in on it): the transponder bucket's steel bottom
// fills the frame, the bracket and the structure's leg behind; his umbilical (a thick braided hose bundle) comes down past
// the bucket, wraps under its bottom and over the protruding lip, and runs up into the dark toward a huge black hull, far
// above, slowly drifting right. Lit by his own cold helmet lamp and amber life-light from the upper left.
//  'weight'   -> a heavy lurch: the hull above looms into view, the frame sinks; the braid creaks (stick-slip: the whole
//                weave jumps a few px around the lip toward the ship)
//  'tons'     -> another lurch, silt shaken off the jacket
//  'boat'     -> the hull slides right, the line's angle follows
//  'pulling'  -> tension ramps: the braid stretches (pitch lengthens, the line thins), it straightens into a bowstring and
//                hums; fibres start to pop at the lip
//  'tight'    -> a jerk: strain glints along the edges, more fibres
//  'quickly'  -> the hardest jerk: the frame trembles, fibres flare at the lip — held at breaking point (cut to 'snap').
// Attribution card visible throughout; otherwise dark and minimal so the real voice carries it.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// word times inside the clip (from the word-level transcript of the source, shifted by the clip lead)
const WT = { weight: .96, tons: 1.94, boat: 2.88, pulling: 3.56, tight: 4.30, quickly: 4.74 };
const BOT = 950, R0 = 46, XV = 104, BX0 = 194, BX1 = 552, LIP = [BX1 + 10, BOT - 6], NSTR = 6;
const LEGX = -34, BRY = 650, BTOP = -60;

// ---------- the line's centreline: vertical span -> corner -> run under the bucket -> over the lip -> up to the ship ----------
function ropeGeom(t, R, th, sag, vib, drift) {
  const pts = [], add = (x, y, sp, u) => pts.push([x, y, sp, u]);
  const yRun = BOT + R + 2, r1 = 92, c1 = [XV + r1, yRun - r1], r2 = yRun - LIP[1];
  const yTop = -80;
  // span 0: vertical (down)
  const L0 = c1[1] - yTop; for (let s = 0; s < L0; s += 3) add(XV, yTop + s, 0, s / L0);
  // corner 1
  const ib1 = pts.length;
  for (let a = Math.PI; a > Math.PI / 2; a -= .03) add(c1[0] + Math.cos(a) * r1, c1[1] + Math.sin(a) * r1, 1, 0);
  // span 2: under the bucket
  for (let x = c1[0]; x < LIP[0]; x += 3) add(x, yRun, 2, 0);
  // corner 2 around the lip (theta from PI/2 down to th)
  const ib2 = pts.length;
  for (let a = Math.PI / 2; a > th; a -= .03) add(LIP[0] + Math.cos(a) * r2, LIP[1] + Math.sin(a) * r2, 3, 0);
  const e0 = [LIP[0] + Math.cos(th) * r2, LIP[1] + Math.sin(th) * r2], dir = [Math.sin(th), -Math.cos(th)], L4 = 1300;
  for (let s = 0; s <= L4; s += 3) add(e0[0] + dir[0] * s, e0[1] + dir[1] * s, 4, s / L4);
  // displacement of the free spans: bow (sag) + vibration, along the span normal
  const n0 = [-1, 0], n4 = [-dir[1], dir[0]];
  for (const p of pts) {
    if (p[2] !== 0 && p[2] !== 4) continue;
    const u = p[2] === 0 ? p[3] : p[3] * 1.8, env = Math.sin(Math.PI * clamp(u)), n = p[2] === 0 ? n0 : n4, ph = p[2] === 0 ? 0 : 1.7;
    const d = sag * env * (p[2] === 0 ? .6 : 1) + vib * (env * Math.sin(t * 59 + ph) + .45 * Math.sin(TAU * clamp(u)) * Math.sin(t * 87 + ph * 2));
    p[0] += n[0] * d; p[1] += n[1] * d;
  }
  // cumulative length + left normals
  const cum = [0], N = [];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; N.push([-dy / l, dx / l]); }
  return { pts, cum, N, len: cum[cum.length - 1], e0, dir, bend1: { c: c1, r: r1, i: ib1 }, bend2: { c: LIP, r: r2, th, i: ib2 } };
}
// ---------- the braided jacket ----------
// The jacket: two families of helical strands (plain weave over/under), each strand rounded and cylinder-shaded by the
// lights. A projected braid tile (x = arc length, exactly two pattern periods so it repeats seamlessly; y = across the line)
// is built per (quantised stretch, normal direction, under-the-bucket) and cached — the stretch steps make the weave settle
// in small jumps, which reads as creaking. Straight runs are filled with it as a pattern in short chord pieces; the two bends
// are rendered exactly per pixel in polar form (bendPatch).
const TILES = {};
// lighting of the jacket for surface offset f (-1..1 across the line) and line normal (Nx, Ny): [r, g, b, spec, z]
function lightAt(f, Nx, Ny, Ls, under) {
  const z = Math.sqrt(Math.max(0, 1 - f * f)), nx = f * Nx, ny = f * Ny;
  let dr = 0, dg = 0, db = 0, sp = 0;
  for (const Lt of Ls) { let k = nx * Lt.d[0] + ny * Lt.d[1] + z * Lt.d[2]; if (k <= 0) continue; if (under && Lt.occl) k *= .3;
    dr += Lt.c[0] / 255 * k * Lt.i; dg += Lt.c[1] / 255 * k * Lt.i; db += Lt.c[2] / 255 * k * Lt.i;
    const hz = Lt.d[2] + 1, hl = Math.hypot(Lt.d[0], Lt.d[1], hz); sp += Math.pow(Math.max(0, (nx * Lt.d[0] + ny * Lt.d[1] + z * hz) / hl), 24) * Lt.spec * Lt.i * (under && Lt.occl ? .2 : 1); }
  return [dr + .05, dg + .05, db + .045, sp, z];
}
// the weave at arc position a (in pitches) and around-angle b0 (turns): writes rgba into data[q..q+3]
function weavePx(data, q, a, b0, Lt, alb, alpha) {
  const n = NSTR, uz = (a + b0) * n, us = (-a + b0) * n, iz = Math.floor(uz), is = Math.floor(us);
  const dz = Math.abs(uz - iz - .5) * 2, ds = Math.abs(us - is - .5) * 2, bz = clamp((.84 - dz) / .2), bs = clamp((.84 - ds) / .2);
  let v, hgt, tone;
  if (((iz + is) & 1) === 0) { if (bz > 0) { v = bz; hgt = Math.cos(dz * 1.55); tone = (iz & 1) ? .9 : 1; } else { v = bs; hgt = Math.cos(ds * 1.55) * (1 - .6 * clamp((.95 - dz) / .4)); tone = (is & 1) ? .82 : .92; } }
  else { if (bs > 0) { v = bs; hgt = Math.cos(ds * 1.55); tone = (is & 1) ? .82 : .92; } else { v = bz; hgt = Math.cos(dz * 1.55) * (1 - .6 * clamp((.95 - ds) / .4)); tone = (iz & 1) ? .9 : 1; } }
  const lum = v * tone * (.3 + .7 * hgt) * (.55 + .45 * Lt[4]), s2 = Lt[3] * hgt * hgt * v * 255;
  data[q] = Math.min(255, alb[0] * Lt[0] * lum + s2 + 6); data[q + 1] = Math.min(255, alb[1] * Lt[1] * lum + s2 * .95 + 5); data[q + 2] = Math.min(255, alb[2] * Lt[2] * lum + s2 * .85 + 3); data[q + 3] = alpha;
}
function braidTile(key, R, pitch, nAng, Ls, under, alb) {
  if (TILES[key]) return TILES[key];
  const n = NSTR, per = Math.round(pitch / n * 2), w = per * 2, h = Math.ceil(R * 2);
  pitch = per * n / 2;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), id = x.createImageData(w, h), Nx = Math.cos(nAng), Ny = Math.sin(nAng);
  for (let y = 0; y < h; y++) {
    const f = clamp((y + .5 - R) / R, -.999, .999), b0 = Math.acos(f) / TAU, Lt = lightAt(f, Nx, Ny, Ls, under);
    for (let xx = 0; xx < w; xx++) weavePx(id.data, (y * w + xx) * 4, xx / pitch, b0, Lt, alb, 255);
  }
  x.putImageData(id, 0, 0);
  return (TILES[key] = { c, per, w, h, pitch });
}
// a bend of the line, rendered exactly in polar form: centre (cx, cy), centreline radius r, from angle th0 down to th1
// (the line travels with decreasing angle; its normal points radially outward). s0 = arc length at th0.
const BEND = {};
function bendPatch(ctx, name, cx, cy, r, R, th0, th1, s0, slip, pitch, Ls, alb, underY) {
  const ro = r + R, x0 = Math.floor(cx + Math.min(0, Math.cos(th0), Math.cos(th1)) * ro) - 1, x1 = Math.ceil(cx + Math.max(0, Math.cos(th0), Math.cos(th1)) * ro) + 1;
  const y0 = Math.floor(cy + Math.min(0, Math.sin(th0), Math.sin(th1)) * ro) - 1, y1 = Math.ceil(cy + Math.max(0, Math.sin(th0), Math.sin(th1)) * ro) + 1;
  const w = x1 - x0, h = y1 - y0; let c = BEND[name];
  if (!c || c.width < w || c.height < h) { c = document.createElement('canvas'); c.width = w + 8; c.height = h + 8; BEND[name] = c; }
  const x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data, LC = {};
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x0 + i + .5, py = y0 + j + .5, dx = px - cx, dy = py - cy, rho = Math.hypot(dx, dy), f = (rho - r) / R;
    if (f <= -1.02 || f >= 1.02) continue;
    const th = Math.atan2(dy, dx); if (th > th0 + .004 || th < th1 - .004) continue;
    const fc = clamp(f, -.999, .999), under = underY != null && py > underY ? 1 : 0, kb = Math.round(th * 40) + ':' + Math.round(fc * 30) + ':' + under;
    const Lt = LC[kb] || (LC[kb] = lightAt(fc, Math.cos(th), Math.sin(th), Ls, under));
    const edgeA = clamp((1.02 - Math.abs(f)) / .04);
    weavePx(d, (j * w + i) * 4, (s0 + (th0 - th) * r - slip) / pitch, Math.acos(fc) / TAU, Lt, alb, 255 * edgeA);
  }
  x.clearRect(0, 0, c.width, c.height); x.putImageData(id, 0, 0);
  ctx.drawImage(c, 0, 0, w, h, x0, y0, w, h);
}
function drawRope(ctx, G, R, pitch, slip, Ls, tape, lvl) {
  const { pts, cum, N } = G, n = pts.length;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = of => { ctx.beginPath(); for (let i = 0; i < n; i++) { const x = pts[i][0] + N[i][0] * of, y = pts[i][1] + N[i][1] * of; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
  ctx.strokeStyle = 'rgba(0,0,0,.92)'; ctx.lineWidth = R * 2 + 6; path(0); ctx.stroke();
  const alb = [186, 160, 100];
  const tiles = {}, M = ctx.getTransform(), ma = M.a, mb = M.b, mc = M.c, md = M.d, me = M.e, mf = M.f, Rq = R0 * (1 - .07 * lvl), Pq = Rq * (4.2 + 2.2 * lvl);
  const tileOf = (nx, ny, un) => { const bk = Math.round(Math.atan2(ny, nx) / (Math.PI / 10)), key = lvl.toFixed(3) + ':' + bk + ':' + un;
    const T = tiles[key] || (tiles[key] = braidTile(key, Rq, Pq, bk * Math.PI / 10, Ls, un === 1, alb)); if (!T.pat) T.pat = ctx.createPattern(T.c, 'repeat'); return T; };
  const setT = (tx, ty, nx, ny, x0, y0) => ctx.setTransform(ma * tx + mc * ty, mb * tx + md * ty, ma * nx + mc * ny, mb * nx + md * ny, ma * x0 + mc * y0 + me, mb * x0 + md * y0 + mf);
  let i = 0;
  while (i < n - 1) {
    const sp = pts[i][2];
    if (sp === 0 || sp === 2 || sp === 4) {          // straight-ish run: pattern-filled chord pieces
      let i1 = i + 1; while (i1 < n - 1 && pts[i1][2] === sp && i1 - i < 10) i1++;
      const x0 = pts[i][0], y0 = pts[i][1], dx = pts[i1][0] - x0, dy = pts[i1][1] - y0, Lp = Math.hypot(dx, dy) || 1, tx = dx / Lp, ty = dy / Lp;
      const T = tileOf(-ty, tx, sp === 2 ? 1 : 0);
      T.pat.setTransform(new DOMMatrix().translateSelf(-(cum[i] - slip), -R).scaleSelf(1, 2 * R / T.h));
      setT(tx, ty, -ty, tx, x0, y0); ctx.fillStyle = T.pat; ctx.fillRect(0, -R, Lp + .9, 2 * R);
      i = i1; continue;
    }
    // bends: drawn once per bend as exact polar patches (below)
    i++;
  }
  ctx.setTransform(M);
  { const T = tileOf(1, 0, 0), pitchA = T.pitch, b1 = G.bend1, b2 = G.bend2;
    bendPatch(ctx, 'b1', b1.c[0], b1.c[1], b1.r, R, Math.PI, Math.PI / 2, cum[b1.i], slip, pitchA, Ls, alb, null);
    bendPatch(ctx, 'b2', b2.c[0], b2.c[1], b2.r, R, Math.PI / 2, b2.th, cum[b2.i], slip, pitchA, Ls, alb, LIP[1] + R * .5); }
  ctx.setTransform(M);
  // black tape band (slides with the line)
  if (tape) for (const s0 of tape) {
    const d0 = s0 + slip, i0 = cum.findIndex(c => c >= d0), i1 = cum.findIndex(c => c >= d0 + R * .9); if (i0 < 0 || i1 < 0) continue;
    ctx.strokeStyle = 'rgba(8,9,9,.96)'; ctx.lineWidth = R * 2 + 3; ctx.lineCap = 'butt'; ctx.beginPath(); for (let i = i0; i <= i1; i++) (i === i0 ? ctx.moveTo(pts[i][0], pts[i][1]) : ctx.lineTo(pts[i][0], pts[i][1])); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,225,230,.16)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = i0; i <= i1; i++) { const x = pts[i][0] - N[i][0] * R * .5, y = pts[i][1] - N[i][1] * R * .5; i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  }
  ctx.restore();
}
// fuzz: short stray fibres along the edges (static per arc position, moving with the slip)
function fuzz(ctx, G, R, slip, a, t) {
  const { pts, cum, N } = G; ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1.2;
  let j = 0;
  for (let i = 0; i < pts.length; i += 3) {
    const s = cum[i] - slip, id = Math.floor(s / 9); if (hi(id * 7 + 3) > .3) continue; j++;
    const side = hi(id * 3) > .5 ? 1 : -1, len = 4 + 10 * hi(id * 11), q = (hi(id * 5) - .5) * 1.2;
    const bx = pts[i][0] + N[i][0] * side * R, by = pts[i][1] + N[i][1] * side * R;
    const ex = bx + (N[i][0] * side * Math.cos(q) - N[i][1] * Math.sin(q)) * len, ey = by + (N[i][1] * side * Math.cos(q) + N[i][0] * Math.sin(q)) * len + Math.sin(t * 3 + id) * 1.5;
    ctx.strokeStyle = rgba('#c9b98e', a * (.25 + .35 * hi(id * 13))); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.restore();
}

// ---------- steel: the structure's leg, the bracket, the transponder bucket (cached; lit from the upper left) ----------
let STEEL = null;
function cylGrad(c, x0, x1, base, hiPos = .3) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, LM.mix('#000000', base, .25)); g.addColorStop(hiPos * .6, LM.mix('#000000', base, .8)); g.addColorStop(hiPos, LM.mix(base, '#dfe9ea', .35));
  g.addColorStop(Math.min(.95, hiPos + .18), base); g.addColorStop(1, LM.mix('#000000', base, .15)); return g;
}
function steelSprites() {
  if (STEEL) return STEEL;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = L.rng(41);
  // bucket (screen space x BX0-30..BX1+40, y BTOP..BOT+30)
  const bw = BX1 - BX0 + 70, bh = BOT + 30 - BTOP, B = mk(bw, bh), b = B.getContext('2d'); b.translate(-(BX0 - 30), -BTOP);
  const X0 = BX0, X1 = BX1;
  b.fillStyle = cylGrad(b, X0, X1, '#363f43', .28); b.fillRect(X0, BTOP, X1 - X0, BOT - 22 - BTOP);
  // seam rings + weld beads
  for (const yy of [BOT - 420, BOT - 170]) { b.fillStyle = 'rgba(0,0,0,.45)'; b.fillRect(X0, yy, X1 - X0, 5); b.fillStyle = 'rgba(210,225,226,.16)'; b.fillRect(X0, yy - 3, X1 - X0, 3);
    for (let x = X0 + 6; x < X1 - 4; x += 7) { b.fillStyle = `rgba(200,210,205,${.05 + .07 * R()})`; b.beginPath(); b.arc(x, yy + 2, 2.4, 0, 7); b.fill(); } }
  // rust streaks, scratches, marine growth
  for (let i = 0; i < 26; i++) { const x = X0 + 10 + R() * (X1 - X0 - 20), y0 = BOT - 640 + R() * 560, l = 40 + R() * 160, w = 2 + R() * 9;
    const g = b.createLinearGradient(0, y0, 0, y0 + l); g.addColorStop(0, `rgba(120,70,30,${.12 + .14 * R()})`); g.addColorStop(1, 'rgba(120,70,30,0)'); b.fillStyle = g; b.fillRect(x, y0, w, l); }
  for (let i = 0; i < 40; i++) { b.strokeStyle = `rgba(220,230,230,${.03 + .06 * R()})`; b.lineWidth = .8; const x = X0 + R() * (X1 - X0), y = BOT - 640 + R() * 600; b.beginPath(); b.moveTo(x, y); b.lineTo(x + (R() - .5) * 40, y + (R() - .5) * 10); b.stroke(); }
  for (let i = 0; i < 90; i++) { const x = X0 + R() * (X1 - X0), y = BOT - 26 - Math.pow(R(), 3) * 120; b.fillStyle = `rgba(${38 + R() * 26},${52 + R() * 26},${42 + R() * 18},${.35 + .35 * R()})`; b.beginPath(); b.ellipse(x, y, 2 + R() * 5, 1.5 + R() * 3, R() * 3, 0, 7); b.fill(); }
  // bottom flange (the lip): thick, rounded, bright edge
  b.fillStyle = '#1b2124'; L.roundRect(b, X0 - 14, BOT - 24, X1 - X0 + 34, 30, 9); b.fill();
  const gl = b.createLinearGradient(0, BOT - 24, 0, BOT + 6); gl.addColorStop(0, 'rgba(225,235,236,.55)'); gl.addColorStop(.25, 'rgba(120,135,138,.35)'); gl.addColorStop(1, 'rgba(0,0,0,.4)'); b.fillStyle = gl; L.roundRect(b, X0 - 14, BOT - 24, X1 - X0 + 34, 30, 9); b.fill();
  b.strokeStyle = 'rgba(235,242,242,.55)'; b.lineWidth = 2.5; b.beginPath(); b.moveTo(X0 - 6, BOT - 23); b.lineTo(X1 + 16, BOT - 23); b.arc(X1 + 12, BOT - 15, 9, -Math.PI / 2, .2); b.stroke();
  for (let i = 0; i < 40; i++) { const x = X0 - 10 + R() * (X1 - X0 + 22); b.fillStyle = `rgba(110,62,28,${.15 + .2 * R()})`; b.fillRect(x, BOT - 20 + R() * 20, 2 + R() * 8, 2 + R() * 4); }
  // soft cold key light from the upper left across the body
  const kl = b.createRadialGradient(X0 + 60, BOT - 240, 20, X0 + 60, BOT - 240, 420); kl.addColorStop(0, 'rgba(220,240,250,.10)'); kl.addColorStop(1, 'rgba(220,240,250,0)'); b.fillStyle = kl; b.fillRect(X0, BTOP, X1 - X0, BOT - BTOP - 22);
  b.setTransform(1, 0, 0, 1, 0, 0); { const fg = b.createLinearGradient(0, 0, 0, BOT - 380 - BTOP); fg.addColorStop(0, 'rgba(1,4,5,.92)'); fg.addColorStop(.55, 'rgba(1,4,5,.6)'); fg.addColorStop(1, 'rgba(1,4,5,0)'); b.globalCompositeOperation = 'source-atop'; b.fillStyle = fg; b.fillRect(0, 0, bw, BOT - 380 - BTOP); b.globalCompositeOperation = 'source-over'; }
  // leg + bracket (x -40..320)
  const lw = 300, lh = 1300, Lg = mk(lw, lh), l = Lg.getContext('2d'); l.translate(60, -60);
  l.fillStyle = cylGrad(l, LEGX - 52, LEGX + 52, '#2c3438', .62); l.fillRect(LEGX - 52, 60, 104, 1200);
  for (const yy of [380, 1020]) { l.fillStyle = 'rgba(0,0,0,.5)'; l.fillRect(LEGX - 52, yy, 104, 6); }
  l.fillStyle = 'rgba(0,0,0,.6)'; l.fillRect(LEGX + 40, BRY - 30, BX0 - LEGX - 30, 60);
  const gb = l.createLinearGradient(0, BRY - 24, 0, BRY + 24); gb.addColorStop(0, '#11171a'); gb.addColorStop(.3, '#4a5458'); gb.addColorStop(.45, '#6c787b'); gb.addColorStop(1, '#0a0e10');
  l.fillStyle = gb; l.fillRect(LEGX + 40, BRY - 24, BX0 - LEGX - 28, 48);
  for (let i = 0; i < 50; i++) { const y = 80 + R() * 1150; l.fillStyle = `rgba(${70 + R() * 40},${92 + R() * 30},${72 + R() * 20},${.2 + .3 * R()})`; l.beginPath(); l.ellipse(LEGX - 40 + R() * 80, y, 2 + R() * 7, 1.5 + R() * 4, 0, 0, 7); l.fill(); }
  l.setTransform(1, 0, 0, 1, 0, 0); { const fg = l.createLinearGradient(0, 0, 0, 640); fg.addColorStop(0, 'rgba(1,4,5,.9)'); fg.addColorStop(1, 'rgba(1,4,5,0)'); l.globalCompositeOperation = 'source-atop'; l.fillStyle = fg; l.fillRect(0, 0, lw, 640); }
  STEEL = { B, Lg };
  return STEEL;
}
// the ship far above, seen from below (keel view, bow to the left, no markings): its floodlights make a warm halo in the
// water around the black hull; ripples of the lit surface drift past
function hullBelow(ctx, t, x, y, s, a) {
  if (a <= .01) return;
  ctx.save(); ctx.globalAlpha *= a;
  { const g = ctx.createRadialGradient(x, y, 0, x, y, 470 * s); g.addColorStop(0, rgba('#4f8a8f', .3)); g.addColorStop(.35, rgba('#4f8a8f', .1)); g.addColorStop(1, 'rgba(79,138,143,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - 470 * s, y - 470 * s, 940 * s, 940 * s); ctx.restore(); }
  for (const [fx, fy, r, k] of [[-240, -66, 200, .55], [-20, 64, 210, .6], [220, -62, 190, .5]]) { const ff = .85 + .15 * Math.sin(t * 2.3 + fx);
    LM.glow(ctx, x + fx * s, y + fy * s, r * s, COL.amber, .5 * k * ff); LM.glow(ctx, x + fx * s, y + fy * s * 1.05, 22 * s, '#fff1dc', .8 * k * ff); }
  // lit surface ripples around the hull
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const q = hi(i * 5 + 1) * TAU, rr = (200 + 260 * hi(i * 7)) * s, px = x + Math.cos(q) * rr * 1.25 + ((t * 22 + hi(i) * 60) % 60), py = y + Math.sin(q) * rr * .42;
    const l = (20 + 40 * hi(i * 3)) * s, aa = .25 * (.5 + .5 * Math.sin(t * 2 + i * 1.7)) * (1 - rr / (520 * s));
    ctx.strokeStyle = rgba(hi(i * 9) > .5 ? '#ffd9a0' : '#bfe6ea', Math.max(0, aa)); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px - l, py); ctx.quadraticCurveTo(px, py - 5 * s, px + l, py); ctx.stroke();
  }
  ctx.restore();
  // the hull (keel view)
  ctx.translate(x, y); ctx.scale(s, s);
  const hull = () => { ctx.beginPath(); ctx.moveTo(-330, 0); ctx.bezierCurveTo(-250, -50, -120, -58, 40, -58); ctx.lineTo(240, -56); ctx.quadraticCurveTo(300, -54, 306, 0); ctx.quadraticCurveTo(300, 54, 240, 56); ctx.lineTo(40, 58); ctx.bezierCurveTo(-120, 58, -250, 50, -330, 0); ctx.closePath(); };
  hull(); ctx.fillStyle = '#010303'; ctx.fill();
  ctx.strokeStyle = rgba(COL.amber, .28); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#000101'; for (const [px, py] of [[250, -30], [250, 30], [-210, 0]]) { ctx.beginPath(); ctx.ellipse(px, py, 22, 14, 0, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(160,200,205,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-300, 0); ctx.lineTo(290, 0); ctx.stroke();
  ctx.restore();
}

window.PK.scenes.weight = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const ev = [[WT.weight, 6, .7], [WT.tons, 8, .8], [WT.boat, 6, .6], [WT.pulling, 11, .9], [WT.tight, 14, 1.1], [WT.quickly, 19, 1.4]];
  // ---- story values ----
  const stretch = clamp(.22 + .1 * P(t, .9, 1.4) + .1 * P(t, 1.9, 2.4) + .08 * P(t, 2.85, 3.3) + .25 * P(t, WT.pulling - .05, WT.tight, E.inQ) + .12 * P(t, WT.tight, WT.tight + .12, E.outQ) + .13 * P(t, WT.quickly, WT.quickly + .1, E.outQ));
  let slip = 6 * t, kick = 0, shakeK = .25;
  for (const [te, amt, sk] of ev) { slip += amt * E.outQ(P(t, te, te + .09)); const u = t - te; if (u >= 0 && u < 1.2) { kick = Math.max(kick, Math.exp(-u * 6)); shakeK = Math.max(shakeK, sk * Math.exp(-u * 3)); } }
  shakeK += .45 * P(t, WT.pulling, d);
  const R = R0 * (1 - .07 * stretch), pitch = R * (4.2 + 2.2 * stretch);
  const sag = 26 * (1 - stretch) * (1 - stretch), vib = .6 + 3.4 * stretch * stretch + 4 * kick;
  const drift = P(t, -.2, d + .2) * .6 + .4 * P(t, WT.boat - .1, WT.boat + .9, E.inOutQ);
  const th = .5 - .05 * drift - .03 * stretch;

  // ---- camera ----
  const sh = LM.shake(t, Math.min(1, shakeK), 29), sink = 10 * Math.exp(-Math.max(0, t - WT.weight) * 2.4) * (t > WT.weight ? 1 : 0) + 8 * Math.exp(-Math.max(0, t - WT.tons) * 2.4) * (t > WT.tons ? 1 : 0);
  const jt = LM.jolt(t, WT.quickly, 1.1), jt2 = LM.jolt(t, WT.tight, .8);
  const z = 1 + .05 * P(t, 0, d, E.inOutQ) + .015 * kick, fx = LIP[0], fy = BOT - 40;
  const ox = sh.x + jt.x + jt2.x, oy = sh.y + jt.y + jt2.y + sink;

  // ---- lights (in rope/screen space): his cold lamp + amber life-light from the upper left, faint bell rim from the right ----
  const bt = PK.beat(t, 104);
  const Ls = [
    { d: [-.52, -.62, .58], c: [214, 236, 248], i: .95, spec: .55, occl: true },
    { d: [-.78, -.25, .57], c: [255, 179, 71], i: .6, spec: .2, occl: false },
    { d: [.55, -.7, -.1], c: [150, 200, 214], i: .35, spec: .1, occl: true },
  ];

  // ================= background =================
  const seaL = [LM.light(150, 560 + oy, 760, COL.lamp, .45), LM.light(60, 700 + oy, 600, COL.amber, .3 + .15 * bt)];
  LM.sea(ctx, t, { dark: .74, lights: seaL, seed: 21, snow: .9, murk: 1, haze: 0, surface: 0, current: [8, -3] });
  { const g = ctx.createRadialGradient(150, 600 + oy, 0, 150, 600 + oy, 760); g.addColorStop(0, rgba('#cfe6ee', .1)); g.addColorStop(.4, rgba('#ffcf8a', .045 + .02 * bt)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, 910, 1360); ctx.restore(); }
  ctx.save();
  ctx.translate(fx + ox, fy + oy); ctx.rotate(sh.r * .6); ctx.scale(z, z); ctx.translate(-fx, -fy);

  // the ship far above (looms on 'weight', slides right on 'boat')
  const loom = P(t, WT.weight - .2, WT.weight + .8, E.outQ);
  // far above: the ship seen from below — a black hull outlined by its own deck floods spilling into the water
  const hx = 870 + 70 * drift + 45 * P(t, WT.boat - .1, WT.boat + 1.2, E.inOutQ), hy = lerp(470, 500, loom) + 4 * Math.sin(t * .7), hs = 1 + .08 * loom;
  hullBelow(ctx, t, hx, hy, hs, .45 + .55 * loom);
  // murk between (pushes the hull far away)
  { const g = ctx.createLinearGradient(0, 360, 0, 760); g.addColorStop(0, 'rgba(4,14,16,.3)'); g.addColorStop(.4, 'rgba(4,14,16,.25)'); g.addColorStop(1, 'rgba(3,10,11,0)'); ctx.fillStyle = g; ctx.fillRect(-100, 360, W + 200, 400); }

  // steel behind the line: leg + bracket
  const S = steelSprites();
  ctx.drawImage(S.Lg, -60, 60);

  // ================= the line =================
  const G = ropeGeom(t, R, th, sag, vib, drift);
  drawRope(ctx, G, R, pitch, slip, Ls, [1150, 1900], Math.round(stretch * 16) / 16);
  fuzz(ctx, G, R, slip, .9, t);
  // the bucket over it (its lip bites into the jacket)
  ctx.drawImage(S.B, BX0 - 30, BTOP);
  // contact shadow + strain at the lip
  const lipC = [LIP[0] + Math.cos(.95) * (R + 8), LIP[1] + Math.sin(.95) * (R + 8)];
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; const cs = ctx.createLinearGradient(0, BOT + 2, 0, BOT + 26); cs.addColorStop(0, 'rgba(0,0,0,.75)'); cs.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = cs; ctx.fillRect(XV + 60, BOT + 2, LIP[0] - XV - 50, 24); ctx.restore();
  const strain = clamp(stretch * 1.2 - .3);
  LM.glow(ctx, LIP[0] + 10, BOT + 6, 70 + 40 * kick, '#eaf8ff', (.12 + .25 * strain) * (.7 + .3 * Math.sin(t * 31)) + .35 * kick * strain);
  // strain glints racing along the bowstring edge on each jerk
  for (const te of [WT.pulling, WT.tight, WT.quickly]) {
    const u = (t - te) / .35; if (u < 0 || u > 1) continue;
    const s0 = G.len - 820 + 820 * u * .9, i = Math.min(G.pts.length - 1, Math.max(0, G.cum.findIndex(c => c >= s0))), p = G.pts[i], n = G.N[i];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#eaf8ff', .6 * (1 - u)); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p[0] - n[0] * R * .9 - G.dir[0] * 90, p[1] - n[1] * R * .9 - G.dir[1] * 90); ctx.lineTo(p[0] - n[0] * R * .9 + G.dir[0] * 40, p[1] - n[1] * R * .9 + G.dir[1] * 40); ctx.stroke(); ctx.restore();
  }
  // fibres popping at the lip (from 'pulling'): short springy strands + a glint each
  ctx.save(); ctx.lineCap = 'round';
  for (let j = 0; j < 22; j++) {
    const tp = WT.pulling + .1 + j * .06 + hi(j * 3) * .08; if (t < tp) continue;
    const u = t - tp, q = -Math.PI * .15 + (hi(j * 7) - .5) * 2.2, L1 = (14 + 26 * hi(j * 5)) * E.outBack(clamp(u / .18)), base = [lipC[0] + (hi(j * 11) - .5) * 70, lipC[1] + (hi(j * 13) - .2) * 30];
    const wv = Math.sin(u * 30 + j) * 4 * Math.exp(-u * 5) + (hi(j * 17) - .5) * L1 * .7;
    ctx.strokeStyle = rgba(['#e8ddc0', '#d9cba0', '#b4472f', '#ece6d6'][j % 4], .85); ctx.lineWidth = 1.1 + hi(j) * .9;
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(base[0] + Math.cos(q) * L1 * .5 + wv, base[1] + Math.sin(q) * L1 * .5, base[0] + Math.cos(q) * L1, base[1] + Math.sin(q) * L1 + u * 3); ctx.stroke();
    if (u < .25) LM.glow(ctx, base[0], base[1], 26, '#fff3dc', .7 * (1 - u / .25));
  }
  ctx.restore();
  // silt shaken off the jacket on each lurch
  ctx.save();
  for (const [te] of ev) {
    const u = t - te; if (u < 0 || u > 2.2) continue;
    for (let j = 0; j < 18; j++) {
      const i = Math.floor(hi(j * 7 + te * 10) * G.pts.length * .9), p = G.pts[i], n = G.N[i], sd = hi(j * 3 + te) > .5 ? 1 : -1, sp = 20 + 60 * hi(j * 5 + te);
      const r = sp * (1 - Math.exp(-u * 2)), x = p[0] + n[0] * sd * (R + r), y = p[1] + n[1] * sd * (R + r) + u * 14;
      ctx.fillStyle = rgba('#a9c4bc', .5 * Math.exp(-u * 1.4) * (.4 + .6 * hi(j))); ctx.beginPath(); ctx.arc(x, y, 1.5 + 2.5 * hi(j * 9), 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();   // camera

  // foreground bokeh silt (out of focus, slow)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = ((hi(i * 3 + 1) * 1300 + t * (14 + 10 * hi(i))) % 1300) - 110, y = 480 + hi(i * 5 + 2) * 700 + Math.sin(t * .5 + i) * 20, r = 8 + 16 * hi(i * 7);
    LM.glow(ctx, x + ox * 1.6, y + oy * 1.6, r, '#cfe6e2', .12 + .1 * hi(i * 9));
  }
  ctx.restore();

  LM.subBand(ctx, .84);
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
