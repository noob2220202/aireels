// setup (≈12.56-17.25): "그보다 약 60시간 전, 2013년 5월 나이지리아 앞바다."
// Rewind (VHS tracking tear, reversed bubbles, a 60-tick dial whose hand spins back; the counter lands on −60시간 with "60시간")
// -> the dial collapses into the offshore marker of a night chart of the Niger Delta coast drawn in thin lines (swell rolling in)
// -> date + place chips -> dive into the marker on "나이지리아" -> plan view of the mooring: a tanker on the loading buoy, held
// astern by the small tug on a taut line while heavy swell crests roll through; the camera pushes in on the tug for the
// hand-over to "capsize". The place chip is screen-fixed in the lower slot and holds from the chart through the dive.
// Chip strings come from the scene data (info.sc.data) so a script.json correction reaches the video.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, text, measure, roundRect, drift, FONT } = L;
const { K, at, chip } = window.PK;

// low-frequency camera (heavy lurch + faint buzz) with the focal centre at y 850
function cam(ctx, { x, y, zoom = 1, rot = 0, shake = 0, t = 0, seed = 0, cy = 850 }) {
  const sx = shake * (noise1(t * 7, seed + 1) * 16 + noise1(t * 19, seed + 6) * 1.5), sy = shake * (noise1(t * 7, seed + 2) * 16 + noise1(t * 19, seed + 7) * 1.5);
  const sr = shake * noise1(t * 5, seed + 3) * .005;
  ctx.translate(540 + sx, cy + sy); ctx.rotate(rot + sr); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
}

// ---- cached oily sheen (same texture as PK.dark), composed at quarter resolution and blitted once ----
function sheenTexLite() {
  if (window.PK._sheenLite) return window.PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLite = c; return c;
}
function darkS(ctx, t, k, seed) {
  const [b, x] = L.buf('okSetupDark', 270, 480);
  x.fillStyle = '#010203'; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.drawImage(b, 0, 0, W, H);
}

// keep the title band and the subtitle band quiet
function quiet(ctx, k) {
  let g = ctx.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, `rgba(1,2,3,${.82 * k})`); g.addColorStop(.8, `rgba(1,2,3,${.66 * k})`); g.addColorStop(1, 'rgba(1,2,3,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 470);
  g = ctx.createLinearGradient(0, 1200, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${.82 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 1200, W, 90); ctx.fillStyle = `rgba(1,2,3,${.86 * k})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
}
// typed chip with a stable box
function typedChip(ctx, t, s, x, y, a, p, o = {}) {
  if (a <= 0) return; const size = o.size || 38, full = measure(ctx, s, size, FONT.sub, 800), w = full + 44, h = size + 26;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(4,10,14,.86)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,255,.4)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  const shown = L.typeSub(s, p);
  text(ctx, shown, x - full / 2, y + 2, { size, weight: 800, color: o.color || '#e8f4ff', align: 'left', alpha: a });
  if (p < 1 && p > 0) { const cw = measure(ctx, shown, size, FONT.sub, 800); ctx.save(); ctx.globalAlpha *= a * (Math.sin(t * 40) > 0 ? 1 : .2); ctx.fillStyle = '#8fd3e8'; ctx.fillRect(x - full / 2 + cw + 4, y - size * .42, 3, size * .84); ctx.restore(); }
}
function lead(ctx, x0, y0, x1, y1, a, col = 'rgba(160,220,255,.55)') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 4, 0, 7); ctx.fill(); ctx.restore();
}

// =====================================================================================================================
// REWIND: dial + counter
// =====================================================================================================================
const DC = { x: 540, y: 850, R: 320 };
const PLX = 470, PLY = 1160;                                // place chip: fixed lower slot, under the marker and clear of the tug's ring
function rewindFX(ctx, t, spd, u) {
  if (spd <= .002) return;
  // reversed bubbles: streaking DOWN (time running backwards)
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const z = .45 + hash(i * 11 + 3) * .55, y0 = hash(i * 7 + 1) * (H + 300), y = ((y0 + u * 3400 * z) % (H + 300)) - 150;
    const x = hash(i * 3 + 5) * W + Math.sin(u * 9 + i) * 10, len = (24 + spd * 300) * z, r = 3 + 9 * z * hash(i * 13);
    const a = (.16 + .3 * z) * clamp(spd * 1.6);
    const g = ctx.createLinearGradient(x, y - len, x, y); g.addColorStop(0, 'rgba(216,246,255,0)'); g.addColorStop(1, rgba('#d8f6ff', a));
    ctx.strokeStyle = g; ctx.lineWidth = r * .9; ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
    ctx.strokeStyle = rgba('#e8f6ff', a * 1.3); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }
  ctx.restore();
  // VHS tracking: bright bands rolling up + horizontal tear strips (copy of the frame, shifted)
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const bh = 26 + hash(i * 17) * 110, y = ((hash(i * 13 + 2) * H - u * 5200 * (1 + hash(i))) % H + H) % H;
    const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, rgba('#cfeaff', .12 * spd)); g.addColorStop(1, 'rgba(207,234,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y, W, bh); ctx.fillStyle = rgba('#e8f6ff', .3 * spd); ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = rgba('#ff4a55', .14 * spd); ctx.fillRect(0, y + 4, W, 1.5); ctx.fillStyle = rgba('#3fe0ff', .14 * spd); ctx.fillRect(0, y - 3, W, 1.5);
  }
  const f = Math.floor(t * 30);
  if (spd > .08) for (let i = 0; i < 3; i++) {
    const y = Math.floor(470 + hash(f * 7 + i * 31) * 760), h = Math.floor(14 + hash(f * 3 + i) * 46), off = Math.round((hash(f * 5 + i * 9) - .5) * 120 * spd);
    ctx.drawImage(ctx.canvas, 0, y, W, h, off, y, W, h);
  }
  ctx.restore();
}
function rewIcon(ctx, x, y, s, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#e8f6ff'; ctx.shadowColor = '#7fd6ff'; ctx.shadowBlur = 14;
  for (const dx of [0, -s * 1.05]) { ctx.beginPath(); ctx.moveTo(x + dx + s * .55, y - s * .6); ctx.lineTo(x + dx - s * .5, y); ctx.lineTo(x + dx + s * .55, y + s * .6); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function dial(ctx, t, o) {
  const { x, y, R, a, v, hand, spd, land, numA } = o; if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  // dark lens behind the dial (focus)
  const bg = ctx.createRadialGradient(x, y, R * .2, x, y, R * 1.25); bg.addColorStop(0, 'rgba(8,30,38,.55)'); bg.addColorStop(1, 'rgba(8,30,38,0)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, 7); ctx.fill();
  const lw = Math.max(1, R / 300);
  // outer ring
  ctx.strokeStyle = rgba('#8fd3e8', .35); ctx.lineWidth = 2 * lw; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  ctx.strokeStyle = rgba('#8fd3e8', .12); ctx.lineWidth = 1.2 * lw; ctx.beginPath(); ctx.arc(x, y, R * .86, 0, 7); ctx.stroke();
  // swept arc (counter-clockwise from 12 o'clock): elapsed hours wound back
  const sw = v / 60 * Math.PI * 2;
  if (sw > 0) {
    ctx.strokeStyle = rgba('#7fd6ff', .22); ctx.lineWidth = 26 * lw; ctx.beginPath(); ctx.arc(x, y, R * .93, -Math.PI / 2, -Math.PI / 2 - sw, true); ctx.stroke();
    ctx.strokeStyle = rgba('#e8f6ff', .85); ctx.lineWidth = 3 * lw; ctx.beginPath(); ctx.arc(x, y, R * .93 + 13 * lw, -Math.PI / 2, -Math.PI / 2 - sw, true); ctx.stroke();
  }
  // 60 ticks (hours), lit as the sweep passes
  for (let i = 0; i < 60; i++) {
    const an = -Math.PI / 2 - i / 60 * Math.PI * 2, maj = i % 5 === 0, lit = i <= v && v > 0;
    const r0 = R * (maj ? .78 : .82), r1 = R * .86;
    ctx.strokeStyle = lit ? rgba('#e8f6ff', maj ? .95 : .7) : rgba('#8fd3e8', maj ? .3 : .16); ctx.lineWidth = (maj ? 4 : 2) * lw;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke();
  }
  // spinning hand with a motion trail (counter-clockwise)
  ctx.lineCap = 'round';
  for (let k = 6; k >= 0; k--) {
    const an = hand + k * .07 * spd * 3; const al = k ? .12 * spd * (1 - k / 7) : .9;
    ctx.strokeStyle = rgba(k ? '#7fd6ff' : '#e8f6ff', al); ctx.lineWidth = (k ? 8 : 4) * lw;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * R * .2, y + Math.sin(an) * R * .2); ctx.lineTo(x + Math.cos(an) * R * .74, y + Math.sin(an) * R * .74); ctx.stroke();
  }
  ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(x, y, 6 * lw, 0, 7); ctx.fill();
  // landing pulse
  if (land > 0 && land < 1) { ctx.strokeStyle = rgba('#e8f6ff', .6 * (1 - land)); ctx.lineWidth = 3 * lw; ctx.beginPath(); ctx.arc(x, y, R * (1 + .45 * E.outC(land)), 0, 7); ctx.stroke(); }
  ctx.restore();
  // counter
  if (numA > 0) {
    const pop = 1 + .14 * (land > 0 ? Math.exp(-land * 6) * (1 - land) : 0) * 1.6;
    const s1 = `${v}`, s2 = '시간', z1 = 178, z2 = 70, mw = 52, mg = 16;
    const w1 = measure(ctx, s1, z1, FONT.disp, 400), w2 = measure(ctx, s2, z2, FONT.disp, 400), x0 = -(mw + mg + w1 + 10 + w2) / 2 + mw + mg;
    ctx.save(); ctx.translate(x, y + 18); ctx.scale(pop, pop); ctx.globalAlpha *= a * numA;
    const off = spd * 14;
    if (off > .5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      text(ctx, s1, x0 - off, 0, { size: z1, family: FONT.disp, weight: 400, color: '#ff3b47', align: 'left', alpha: .55 });
      text(ctx, s1, x0 + off, 2, { size: z1, family: FONT.disp, weight: 400, color: '#2fd8ff', align: 'left', alpha: .55 });
      ctx.restore();
    }
    ctx.save(); ctx.fillStyle = '#e8f6ff'; ctx.shadowColor = 'rgba(127,214,255,.45)'; ctx.shadowBlur = 30; roundRect(ctx, x0 - mg - mw, -8, mw, 17, 4); ctx.fill(); ctx.restore();
    text(ctx, s1, x0, 0, { size: z1, family: FONT.disp, weight: 400, color: '#e8f6ff', align: 'left', shadow: { color: 'rgba(127,214,255,.45)', blur: 30, y: 0 } });
    text(ctx, s2, x0 + w1 + 10, 32, { size: z2, family: FONT.disp, weight: 400, color: '#9fd8ef', align: 'left' });
    ctx.restore();
  }
}

// =====================================================================================================================
// NIGHT CHART of the western Niger Delta (approximate outlines, lon/lat)
// =====================================================================================================================
const COAST = [[2.6, 6.37], [3.0, 6.39], [3.4, 6.41], [3.8, 6.43], [4.2, 6.40], [4.45, 6.32], [4.62, 6.20], [4.78, 6.08], [4.92, 5.95], [5.02, 5.83], [5.06, 5.76],
  [5.10, 5.68], [5.16, 5.58], [5.24, 5.48], [5.33, 5.38], [5.42, 5.29], [5.52, 5.17], [5.62, 5.04], [5.72, 4.92], [5.82, 4.78], [5.92, 4.60], [6.0, 4.42], [6.07, 4.29],
  [6.20, 4.29], [6.38, 4.31], [6.58, 4.33], [6.78, 4.36], [7.0, 4.38], [7.2, 4.42], [7.45, 4.46], [7.7, 4.5], [8.0, 4.53], [8.3, 4.62], [8.7, 4.62]];
const LAND = COAST.concat([[8.7, 9], [2.6, 9]]);
const RIVERS = [
  [[6.8, 7.4], [6.78, 6.6], [6.75, 6.15], [6.62, 5.8], [6.53, 5.55]],                       // Niger
  [[6.53, 5.55], [6.3, 5.42], [6.05, 5.36], [5.8, 5.33], [5.55, 5.37], [5.33, 5.38]],         // Forcados
  [[6.53, 5.55], [6.46, 5.2], [6.33, 4.88], [6.17, 4.56], [6.07, 4.29]],                      // Nun
  [[5.78, 5.52], [5.55, 5.55], [5.33, 5.565], [5.16, 5.58]],                                  // Escravos
  [[5.62, 6.02], [5.38, 5.9], [5.06, 5.76]],                                                  // Benin
  [[6.3, 5.42], [6.15, 5.1], [5.95, 4.86], [5.82, 4.78]],                                     // a western distributary
  [[6.46, 5.2], [6.7, 4.85], [6.78, 4.36]],
];
const LON0 = 5.2, LAT0 = 5.45, DEG = 420, KX = Math.cos(LAT0 * Math.PI / 180);
const pj = (lo, la) => [540 + (lo - LON0) * DEG * KX, 850 - (la - LAT0) * DEG];
const MK = pj(4.958, 5.447), ESC = pj(5.17, 5.578), NG = pj(5.47, 5.74);
let GEO = null;
function geo() {
  if (GEO) return GEO;
  const chaikin = (q, n, closed) => { for (let k = 0; k < n; k++) { const r = closed ? [] : [q[0]]; const m = closed ? q.length : q.length - 1; for (let i = 0; i < m; i++) { const a = q[i], b = q[(i + 1) % q.length]; r.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } if (!closed) r.push(q[q.length - 1]); q = r; } return q; };
  const rough = (pts, seed, amp, step, closed) => {
    const out = []; let s = 0; const m = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n = Math.max(1, Math.round(len / step)); const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (let k = 0; k < n; k++) { const u = k / n; const q = s + u * len, dd = amp * (fbm(q * .03, seed, 4) + .35 * noise1(q * .16, seed + 3) + .18 * noise1(q * .5, seed + 5)); out.push([lerp(a[0], b[0], u) + nx * dd, lerp(a[1], b[1], u) + ny * dd]); }
      s += len;
    }
    if (!closed) out.push(pts[pts.length - 1]);
    return out;
  };
  const toPath = (pts, closed) => { const p = new Path2D(); let L0 = 0; pts.forEach(([x, y], i) => { if (i) { L0 += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]); p.lineTo(x, y); } else p.moveTo(x, y); }); if (closed) p.closePath(); return { path: p, len: L0 + 10 }; };
  // coastline: only the shore part is roughened (estuary notches), the land polygon is closed far inland
  const coastPts = rough(chaikin(COAST.map(p => pj(p[0], p[1])), 2, false), 3, 5, 2.2, false);
  const coast = toPath(coastPts, false);
  const landPts = coastPts.concat([pj(8.7, 9), pj(2.6, 9)]);
  const land = toPath(landPts, true);
  const rivers = RIVERS.map((r, i) => toPath(rough(chaikin(r.map(p => pj(p[0], p[1])), 2, false), 20 + i, 3.2, 2.5, false), false));
  // creeks: short wiggly side channels across the delta (deterministic)
  const R = L.rng(77); const creeks = [];
  for (let i = 0; i < 26; i++) {
    const lo = 5.25 + R() * 1.6, la = 4.5 + R() * 1.25; const pts = []; let x = lo, y = la; const ang = R() * Math.PI * 2;
    for (let k = 0; k < 7; k++) { pts.push(pj(x, y)); x += Math.cos(ang + (R() - .5) * 1.4) * .06; y += Math.sin(ang + (R() - .5) * 1.4) * .06; }
    creeks.push(toPath(chaikin(pts, 2, false), false));
  }
  const c = document.createElement('canvas'); c.width = c.height = 10; const x = c.getContext('2d');
  x.fillStyle = 'rgba(143,211,232,.22)'; x.beginPath(); x.arc(5, 5, 1.05, 0, 7); x.fill();
  GEO = { coast, land, rivers, creeks, dots: c };
  return GEO;
}
function drawMap(ctx, t, z, o) {
  const G = geo();
  glow(ctx, MK[0] + 80, MK[1] - 40, 900, '#0f4656', .2, 'source-over');
  // graticule (0.5°)
  ctx.save(); ctx.strokeStyle = rgba('#8fd3e8', .06 * o.grid); ctx.lineWidth = 1.3 / z;
  for (let lo = 2.5; lo <= 9; lo += .5) { const x = pj(lo, 5)[0]; ctx.beginPath(); ctx.moveTo(x, -2000); ctx.lineTo(x, 3000); ctx.stroke(); }
  for (let la = 3; la <= 8; la += .5) { const y = pj(5, la)[1]; ctx.beginPath(); ctx.moveTo(-2000, y); ctx.lineTo(3000, y); ctx.stroke(); }
  ctx.restore();
  // heavy swell: crest lines rolling in from the south-west (drawn under the land)
  ctx.save(); ctx.lineCap = 'round';
  const dx = Math.cos(-.7), dy = Math.sin(-.7), nx = -dy, ny = dx, SP = 46, span = SP * 34;
  for (let k = 0; k < 34; k++) {
    const s = ((k * SP + t * 16) % span) - span / 2; const cx = MK[0] + dx * s, cy = MK[1] + dy * s;
    const a = o.swell * (.07 + .07 * (.5 + .5 * Math.sin(k * 1.7))) * (1 - Math.abs(s) / (span / 2) * .6);
    ctx.strokeStyle = rgba('#9fd8ef', a); ctx.lineWidth = (k % 3 === 0 ? 2.2 : 1.2) / z; ctx.beginPath();
    for (let u = -900; u <= 900; u += 30) { const w = Math.sin(u * .012 + k * 2.1 + t * .6) * 5 + noise1(u * .01 + k * 3, 4) * 6; const px = cx + nx * u + dx * w, py = cy + ny * u + dy * w; u === -900 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.stroke();
  }
  ctx.restore();
  // depth contours: the coastline pushed seaward (scaled about a point inland), dashed
  const CC = pj(6.4, 6.9);
  [[1.035, .2], [1.075, .13], [1.13, .08]].forEach(([s, a], i) => {
    ctx.save(); ctx.translate(CC[0], CC[1]); ctx.scale(s, s); ctx.translate(-CC[0], -CC[1]);
    ctx.strokeStyle = rgba('#8fd3e8', a * o.coastP); ctx.lineWidth = 1.4 / z / s; ctx.setLineDash([7 / z, 8 / z]); ctx.lineDashOffset = -t * 6 / z - i * 5; ctx.stroke(G.coast.path); ctx.restore();
  });
  // land: dark fill + halftone dots
  ctx.save(); ctx.globalAlpha *= o.fill;
  const gr = ctx.createRadialGradient(NG[0], NG[1], 30, NG[0], NG[1], 900); gr.addColorStop(0, '#11272e'); gr.addColorStop(1, '#091418');
  ctx.fillStyle = gr; ctx.fill(G.land.path);
  ctx.globalAlpha *= .6; ctx.fillStyle = ctx.createPattern(G.dots, 'repeat'); ctx.fill(G.land.path);
  ctx.restore();
  // rivers + creeks (thin, faint), drawn on
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  G.rivers.forEach((r, i) => { const p = clamp(o.rivers * 1.3 - i * .06); if (p <= 0) return; ctx.setLineDash([r.len * p, r.len * 2]); ctx.strokeStyle = rgba('#8fd3e8', .32); ctx.lineWidth = 1.5 / z; ctx.stroke(r.path); });
  ctx.setLineDash([]); ctx.strokeStyle = rgba('#8fd3e8', .12 * o.rivers); ctx.lineWidth = 1 / z; G.creeks.forEach(c => ctx.stroke(c.path));
  ctx.restore();
  // coastline: glow + crisp edge, drawn on from west to east
  if (o.coastP > 0) {
    ctx.save(); ctx.setLineDash([G.coast.len * o.coastP, G.coast.len * 2]); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#8fd3e8', .18); ctx.lineWidth = 9 / z; ctx.stroke(G.coast.path);
    ctx.strokeStyle = rgba('#cfe8ff', .85); ctx.lineWidth = 2.2 / z; ctx.stroke(G.coast.path);
    ctx.restore();
  }
  // dotted range: Escravos mouth -> the mooring (~30 km)
  if (o.range > 0) {
    const e = E.inOutQ(o.range); const x1 = lerp(ESC[0], MK[0], e), y1 = lerp(ESC[1], MK[1], e);
    ctx.save(); ctx.strokeStyle = rgba('#ffd9a0', .85); ctx.lineWidth = 2.4 / z; ctx.setLineDash([6 / z, 6 / z]); ctx.lineDashOffset = -t * 20 / z;
    ctx.beginPath(); ctx.moveTo(ESC[0], ESC[1]); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    const ang = Math.atan2(MK[1] - ESC[1], MK[0] - ESC[0]), px = -Math.sin(ang) * 10 / z, py = Math.cos(ang) * 10 / z;
    ctx.beginPath(); ctx.moveTo(ESC[0] - px, ESC[1] - py); ctx.lineTo(ESC[0] + px, ESC[1] + py); ctx.stroke();
    ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(ESC[0], ESC[1], 3.5 / z, 0, 7); ctx.fill();
    ctx.restore();
  }
}
function mapCam(t, T) {
  // wide (whole western delta) -> push toward the marker -> dive into it
  const pPush = P(t, T.cm + .2, T.dive, E.inOutQ), pDive = P(t, T.dive, T.dive + .5, E.inQ);
  const zw = .56 * (1 + .06 * P(t, .8, T.cm + .2)), zn = 1.6 * (1 + .1 * P(t, T.cm + .9, T.dive));
  const z = Math.exp(lerp(Math.log(zw), Math.log(zn), pPush)) * Math.exp(Math.log(26) * pDive);
  const c0 = pj(5.7, 5.12), c1 = pj(5.1, 5.49);
  const cx = lerp(lerp(c0[0], c1[0], pPush), MK[0], E.inOutQ(clamp(pDive * 2.2))), cy = lerp(lerp(c0[1], c1[1], pPush), MK[1], E.inOutQ(clamp(pDive * 2.2)));
  return { x: cx, y: cy, z, pPush };
}
const mS = (m, p) => [540 + (p[0] - m.x) * m.z, 850 + (p[1] - m.y) * m.z];
function marker(ctx, x, y, t, p, s = 1) {
  if (p <= 0) return; const e = E.outBack(clamp(p), 2.2);
  for (let k = 0; k < 3; k++) { const q = ((t * .8 + k / 3) % 1); ctx.save(); ctx.strokeStyle = rgba(K.red, (1 - q) * .75 * clamp(p * 2)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, (12 + q * 64) * s, 0, 7); ctx.stroke(); ctx.restore(); }
  glow(ctx, x, y, 80 * s, K.red, .35 * clamp(p * 2));
  ctx.save(); ctx.translate(x, y); ctx.scale(e * s, e * s); ctx.fillStyle = K.red; ctx.shadowColor = K.red; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.restore();
}

// =====================================================================================================================
// MOORING (plan view). Local frame: axis vertical, buoy at the top, tanker below it, tug at the bottom (bow pointing away).
// The group is rotated so the axis runs from the upper-left (buoy) to the lower-right (tug), heading into the swell.
// =====================================================================================================================
const TH = -1.0;
const MT = { buoy: -404, bow: -334, stern: 142, tugS: 292, tugB: 396 };
function swellPlan(ctx, t, a) {
  // crests perpendicular to the axis (horizontal in the local frame), rolling from the buoy end toward the tug
  const SP = 172, span = SP * 18;
  // local y-range covered by the canvas (crests are horizontal lines here, so this test is exact); off-screen crests are skipped
  const inv = ctx.getTransform().inverse(); let vy0 = 1e9, vy1 = -1e9;
  for (const [qx, qy] of [[0, 0], [W, 0], [0, H], [W, H]]) { const q = inv.transformPoint(new DOMPoint(qx, qy)); vy0 = Math.min(vy0, q.y); vy1 = Math.max(vy1, q.y); }
  ctx.save(); ctx.lineCap = 'round';
  for (let k = 0; k < 18; k++) {
    const yk = ((k * SP + t * 74) % span) - span / 2;
    if (yk + 130 < vy0 || yk - 130 > vy1) continue;     // band reaches yk-60-38 .. yk+70+38
    const pts = []; for (let x = -1500; x <= 1500; x += 40) pts.push([x, yk + Math.sin(x * .006 + k * 1.3) * 22 + noise1(x * .008 + k * 5, 2) * 16]);
    // trough shade ahead of the crest
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 70);
    ctx.closePath(); const g = ctx.createLinearGradient(0, yk, 0, yk + 70); g.addColorStop(0, rgba('#000000', .32 * a)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill();
    // back slope glint
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] - 60);
    ctx.closePath(); const g2 = ctx.createLinearGradient(0, yk - 60, 0, yk); g2.addColorStop(0, 'rgba(60,140,160,0)'); g2.addColorStop(1, rgba('#3c8ca0', .14 * a)); ctx.fillStyle = g2; ctx.fill();
    // crest foam line
    ctx.strokeStyle = rgba('#cfeaf5', (.2 + .14 * hash(k * 3)) * a); ctx.lineWidth = 2.6; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    // broken whitecaps along the crest
    ctx.fillStyle = rgba('#e8f6ff', .22 * a);
    for (let i = 0; i < 22; i++) { const x = -1300 + hash(k * 31 + i) * 2600, y = yk + Math.sin(x * .006 + k * 1.3) * 22 + noise1(x * .008 + k * 5, 2) * 16; ctx.beginPath(); ctx.ellipse(x, y + 3, 10 + hash(i * 7 + k) * 26, 2.5, 0, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  // wind streaks along the axis
  ctx.save(); ctx.strokeStyle = rgba('#bfe9ff', .07 * a); ctx.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) { const x = -1300 + hash(i * 5 + 1) * 2600, y = ((hash(i * 9) * 2600 + t * 260) % 2600) - 1300, l = 20 + hash(i * 3) * 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + l); ctx.stroke(); }
  ctx.restore();
}
function tankerPath(c) { c.beginPath(); c.moveTo(0, MT.bow); c.quadraticCurveTo(41, MT.bow + 12, 42, -250); c.lineTo(42, 130); c.quadraticCurveTo(42, MT.stern, 30, MT.stern); c.lineTo(-30, MT.stern); c.quadraticCurveTo(-42, MT.stern, -42, 130); c.lineTo(-42, -250); c.quadraticCurveTo(-41, MT.bow + 12, 0, MT.bow); c.closePath(); }
function tugPath(c) { c.beginPath(); c.moveTo(-14, MT.tugS); c.lineTo(14, MT.tugS); c.lineTo(15, 352); c.quadraticCurveTo(14.5, 380, 0, MT.tugB); c.quadraticCurveTo(-14.5, 380, -15, 352); c.closePath(); }
function mooring(ctx, t, o) {
  const a = o.a; ctx.save(); ctx.globalAlpha *= a;
  swellPlan(ctx, t, 1);
  // buoy anchor legs (under water)
  ctx.save(); ctx.strokeStyle = rgba('#8fd3e8', .14); ctx.lineWidth = 1.6; ctx.setLineDash([8, 8]);
  for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + .3; ctx.beginPath(); ctx.moveTo(0, MT.buoy); ctx.lineTo(Math.cos(an) * 200, MT.buoy + Math.sin(an) * 200); ctx.stroke(); }
  ctx.restore();
  // the tug's prop wash: white water streaming back toward the tanker
  const sway = Math.sin(t * 1.3) * 5, tugX = sway;
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const ph = ((t * .9 + hash(i * 3)) % 1), y = MT.tugS - 4 - ph * 120, x = tugX * (1 - ph) + (hash(i * 7) - .5) * (8 + ph * 46) + Math.sin(t * 3 + i) * 3;
    ctx.fillStyle = rgba('#dff4ff', .3 * (1 - ph)); ctx.beginPath(); ctx.ellipse(x, y, 3 + ph * 10, 2 + ph * 4, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
  // floating hose string: buoy -> tanker manifold
  ctx.save(); ctx.lineCap = 'round';
  const hose = new Path2D(); hose.moveTo(16, MT.buoy + 6); hose.bezierCurveTo(70 + Math.sin(t * .8) * 6, -380, 118 + Math.sin(t * .6 + 1) * 8, -230, 42, -62);
  ctx.strokeStyle = 'rgba(10,8,6,.8)'; ctx.lineWidth = 7; ctx.stroke(hose);
  ctx.setLineDash([14, 10]); ctx.strokeStyle = rgba('#b0743a', .75); ctx.lineWidth = 5; ctx.stroke(hose); ctx.restore();
  // hawser buoy -> bow
  ctx.save(); ctx.strokeStyle = rgba('#cfe8ff', .75); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-3, MT.buoy + 16); ctx.lineTo(-4, MT.bow + 3); ctx.moveTo(3, MT.buoy + 16); ctx.lineTo(4, MT.bow + 3); ctx.stroke(); ctx.restore();
  // bow spray when a crest meets the tanker bow
  const bs = Math.pow(.5 + .5 * Math.sin(t * 2.7), 6);
  if (bs > .02) { ctx.save(); ctx.fillStyle = rgba('#eaf8ff', .35 * bs); for (let i = 0; i < 16; i++) { const an = -Math.PI / 2 + (hash(i * 5) - .5) * 2.6, r = 12 + hash(i * 9) * 40 * bs; ctx.beginPath(); ctx.arc(Math.cos(an) * r, MT.bow + 6 + Math.sin(an) * r * .6, 2 + hash(i) * 3, 0, 7); ctx.fill(); } ctx.restore(); }
  // tanker hull + deck
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 10;
  tankerPath(ctx); const hg = ctx.createLinearGradient(-42, 0, 42, 0); hg.addColorStop(0, '#0d1418'); hg.addColorStop(.45, '#1d282e'); hg.addColorStop(1, '#0a0f12'); ctx.fillStyle = hg; ctx.fill();
  ctx.restore();
  ctx.save(); tankerPath(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(150,190,205,.22)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 66); ctx.moveTo(-8, -296); ctx.lineTo(-8, 66); ctx.moveTo(8, -296); ctx.lineTo(8, 66); ctx.stroke();
  for (let y = -270; y < 60; y += 42) { ctx.strokeRect(-30, y, 14, 20); ctx.strokeRect(16, y, 14, 20); }
  ctx.strokeStyle = 'rgba(150,190,205,.35)'; ctx.beginPath(); ctx.moveTo(-42, -62); ctx.lineTo(42, -62); ctx.moveTo(-42, -56); ctx.lineTo(42, -56); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-36, -284); ctx.quadraticCurveTo(0, -300, 36, -284); ctx.stroke();
  ctx.restore();
  ctx.save(); tankerPath(ctx); ctx.strokeStyle = rgba('#9fd0e2', .6); ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
  // accommodation block at the stern
  ctx.save(); ctx.fillStyle = '#232d33'; ctx.fillRect(-36, 72, 72, 56); ctx.fillStyle = '#2c383f'; ctx.fillRect(-46, 72, 92, 9);
  ctx.strokeStyle = 'rgba(170,205,220,.45)'; ctx.lineWidth = 1.4; ctx.strokeRect(-36, 72, 72, 56); ctx.fillStyle = '#0c1114'; ctx.fillRect(-11, 108, 22, 18); ctx.restore();
  // tanker lights (cold white)
  [[0, -300], [-34, -60], [34, -60], [-40, 76], [40, 76], [0, 96], [-20, 120], [20, 120], [0, -150]].forEach(([x, y], i) => {
    const f = .75 + .25 * noise1(t * 3 + i * 7, 9); glow(ctx, x, y, 26, '#e8f6ff', .5 * f); ctx.fillStyle = rgba('#ffffff', .9 * f); ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  });
  // towline: tanker stern -> tug stern, taut (bright, with strain pulses running along it)
  const y0 = MT.stern + 1, y1 = MT.tugS - 1, vib = Math.sin(t * 47) * .7 * o.strain;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#7fd6ff', .25); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(tugX, y1); ctx.stroke();
  ctx.strokeStyle = rgba('#e8f6ff', .95); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, y0); ctx.quadraticCurveTo(tugX / 2 + vib, (y0 + y1) / 2, tugX, y1); ctx.stroke();
  for (let k = 0; k < 3; k++) { const q = ((t * 1.1 + k / 3) % 1); const py = lerp(y1, y0, q); glow(ctx, lerp(tugX, 0, q), py, 16, '#e8f6ff', .55 * Math.sin(q * Math.PI) * o.strain); }
  ctx.restore();
  // tug
  ctx.save(); ctx.translate(tugX, 0);
  glow(ctx, 0, 346, 130, K.amber, .28 * o.tugHL); glow(ctx, 0, 346, 52, '#ffd9a0', .4 * o.tugHL);
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 4;
  tugPath(ctx); const tg = ctx.createLinearGradient(-12, 0, 12, 0); tg.addColorStop(0, '#1a2227'); tg.addColorStop(.5, '#36424a'); tg.addColorStop(1, '#151b1f'); ctx.fillStyle = tg; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba('#ffd9a0', .7); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#4a565e'; ctx.fillRect(-10, 340, 20, 30); ctx.fillStyle = '#5c6a72'; ctx.fillRect(-7, 350, 14, 14); ctx.fillStyle = '#0c1114'; ctx.fillRect(-7, 300, 14, 5); ctx.fillRect(-3, 326, 6, 8);
  ctx.strokeStyle = 'rgba(160,190,205,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11, 300); ctx.lineTo(-11, 338); ctx.moveTo(11, 300); ctx.lineTo(11, 338); ctx.stroke();
  ctx.fillStyle = rgba('#ffd9a0', .9); [[-6, 345], [6, 345], [0, 360], [-6, 366], [6, 366]].forEach(([x, y]) => { ctx.fillRect(x - 1.5, y - 1.5, 3, 3); });
  ctx.restore();
  // amber ring marking the tug
  if (o.ring > 0) {
    for (let k = 0; k < 2; k++) { const q = ((t * .7 + k / 2) % 1); ctx.save(); ctx.strokeStyle = rgba(K.amber, (1 - q) * .7 * o.ring); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tugX, 346, 46 + q * 64, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  // buoy (CALM buoy: skirt + turntable + flashing light)
  ctx.save(); ctx.translate(0, MT.buoy);
  ctx.fillStyle = rgba('#dff4ff', .18); ctx.beginPath(); ctx.ellipse(0, 0, 34 + Math.sin(t * 2) * 3, 34 + Math.sin(t * 2) * 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#20282c'; ctx.beginPath(); ctx.arc(0, 0, 25, 0, 7); ctx.fill();
  const bg = ctx.createRadialGradient(-5, -5, 2, 0, 0, 19); bg.addColorStop(0, '#c9a24a'); bg.addColorStop(1, '#6e5418'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a3236'; ctx.fillRect(-5, -4, 10, 22); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.stroke();
  const fl = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.4)), 10); glow(ctx, 0, -2, 60, '#ffffff', .7 * fl); ctx.fillStyle = rgba('#ffffff', .4 + .6 * fl); ctx.beginPath(); ctx.arc(0, -2, 3, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
}
// mooring sea backdrop (static radial gradient): painted once, then blitted (a full-frame radial fill costs ~6 ms more)
let SEA = null;
function seaBG() {
  if (SEA) return SEA; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const sg = x.createRadialGradient(560, 860, 60, 540, 860, 1100); sg.addColorStop(0, '#0a2730'); sg.addColorStop(.6, '#051419'); sg.addColorStop(1, '#010405');
  x.fillStyle = sg; x.fillRect(0, 0, W, H); SEA = c; return c;
}
// rain over the open sea (plan view: fast fine streaks + pin-prick ripples)
function rainPlan(ctx, t, a) {
  if (a <= 0) return;
  L.rain(ctx, t, { n: 150, ang: .32, speed: 2300, len: 46, a: .14 * a, color: '#bcd6ea', w: 1.6, seed: 9, area: [0, 440, W, 830] });
  ctx.save(); ctx.strokeStyle = rgba('#bfe9ff', .12 * a); ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) { const ph = ((t * 2.2 + hash(i * 3)) % 1), x = hash(i * 7 + Math.floor(t * 2.2 + hash(i * 3)) * 13) * W, y = 470 + hash(i * 11 + Math.floor(t * 2.2 + hash(i * 3)) * 5) * 760; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(x, y, 3 + ph * 14, (3 + ph * 14) * .5, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}

window.PK.scenes.setup = function (ctx, t, d, info) {
  // the incoming half of a dip/cut/flash only ever shows the outgoing scene: skip the work (pixel-identical composite)
  const tr = info.sc.trans; if (t < 0 && tr && (tr.type === 'dip' || tr.type === 'cut' || tr.type === 'flash')) return;
  const D = info.sc.data || {};
  const t60 = at(info, '60시간', .19), tJeon = at(info, '전', .3), tYr = at(info, '2013', .43), tMay = at(info, '5월', .63), tNg = at(info, '나이지리아', .7), tSea = at(info, '앞바다', .82);
  const T = { cm: tJeon - .33, dive: tNg - .05 };           // chart in (≈1.1) / dive into the marker on "나이지리아" (≈3.2)
  const dr = drift(t, 1, 41);
  ctx.save(); ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H); ctx.restore();

  // ---------------- REWIND ----------------
  const u = E.outC(P(t, -.3, t60 + .06)), spd = Math.pow(1 - P(t, -.3, t60 + .06), 1.6);
  const v = Math.round(60 * E.outQ(P(t, -.05, t60)));
  const land = P(t, t60, t60 + .7);
  const cp = P(t, T.cm, T.cm + .48, E.inOutC);            // dial collapses into the marker
  const mapA = P(t, T.cm - .05, T.cm + .4, E.inOutQ) * (1 - P(t, T.dive + .2, T.dive + .45, E.inQ));
  const mc = mapCam(t, T);
  const mkS = mS(mc, MK);
  if (cp < 1) {
    darkS(ctx, t, .9 * (1 - cp), 5);
    const R = lerp(DC.R, 14, cp), x = lerp(DC.x, mkS[0], cp), y = lerp(DC.y, mkS[1], cp);
    const hand = -Math.PI / 2 - u * Math.PI * 2 * 7;
    ctx.save(); ctx.translate(dr.x * .6, dr.y * .6);
    dial(ctx, t, { x, y, R, a: 1 - P(t, T.cm + .3, T.cm + .48), v, hand, spd, land, numA: 1 - P(t, T.cm - .02, T.cm + .22, E.inQ) });
    rewIcon(ctx, DC.x + 12, DC.y - 168, 22, (1 - cp) * clamp(spd * 3) * (Math.sin(t * 18) > -.3 ? 1 : .35));
    ctx.restore();
    rewindFX(ctx, t, spd * (1 - cp), u);
  }

  // ---------------- NIGHT CHART ----------------
  if (mapA > 0) {
    ctx.save(); ctx.globalAlpha = mapA;
    cam(ctx, { x: mc.x + dr.x / mc.z, y: mc.y + dr.y / mc.z, zoom: mc.z, rot: dr.r * .4, t });
    drawMap(ctx, t, mc.z, {
      grid: P(t, T.cm - .1, T.cm + .9), fill: P(t, T.cm - .1, T.cm + .5), swell: P(t, T.cm, T.cm + .8),
      coastP: P(t, T.cm - .1, T.cm + .9, E.inOutQ), rivers: P(t, T.cm + .3, T.cm + 1.5, E.inOutQ), range: P(t, tYr + .25, tYr + .85),
    });
    ctx.restore();
    // a scan line sweeping the chart in
    const swp = P(t, T.cm - .05, T.cm + .9, E.inOutQ);
    if (swp > 0 && swp < 1) { const y = lerp(470, 1240, swp); ctx.save(); ctx.globalAlpha = mapA; const sg = ctx.createLinearGradient(0, y - 110, 0, y); sg.addColorStop(0, 'rgba(143,211,232,0)'); sg.addColorStop(1, 'rgba(143,211,232,.1)'); ctx.fillStyle = sg; ctx.fillRect(0, y - 110, W, 110); ctx.fillStyle = 'rgba(191,233,255,.4)'; ctx.fillRect(0, y, W, 1.5); ctx.restore(); }
    // screen-space overlays: country label, marker, chips
    const ngS = mS(mc, pj(lerp(6.1, 5.47, mc.pPush), lerp(6.02, 5.74, mc.pPush)));   // inland in the wide view, near the coast when pushed in
    text(ctx, '나이지리아', ngS[0] + dr.x, ngS[1] + dr.y, { size: 44, weight: 800, color: '#9fc6d8', ls: 10, alpha: mapA * .7 * P(t, T.cm + .35, T.cm + .9) * (1 - P(t, T.dive, T.dive + .25)) });
    const mk = [mkS[0] + dr.x, mkS[1] + dr.y];
    ctx.save(); ctx.globalAlpha = mapA; marker(ctx, mk[0], mk[1], t, P(t, T.cm + .32, T.cm + .7), 1 + 1.6 * P(t, T.dive, T.dive + .4, E.inQ)); ctx.restore();
    // leader from the marker down to the place chip (chart only; retracts into the marker before the dive)
    lead(ctx, mk[0], mk[1] + 24, mk[0], PLY - 30, P(t, tYr + .3, tYr + .62, E.outQ) * (1 - P(t, T.dive - .3, T.dive - .02)));
  }

  // ---------------- MOORING (plan view) ----------------
  const moA = P(t, T.dive + .18, T.dive + .5, E.inOutQ);
  if (moA > 0) {
    const grow = E.outExpo(P(t, T.dive + .15, T.dive + .85));
    const push = E.inOutQ(P(t, tSea + .25, d + .2));
    const th = TH + .03 * Math.sin(t * .7);
    const z = lerp(.34, 1.1, grow) * lerp(1, 1.8, push) * (1 + .015 * Math.sin(t * 1.4));
    const cxl = 0, cyl = lerp(-14, MT.tugS + 50, push);              // camera centre in the local (un-rotated) frame
    const ox = lerp(mkS[0] - 540, 0, grow) + dr.x, oy = lerp(mkS[1] - 880, 0, grow) + dr.y;
    const sh = .25 * push, shx = sh * (noise1(t * 7, 51) * 16 + noise1(t * 19, 56) * 1.5), shy = sh * (noise1(t * 7, 52) * 16 + noise1(t * 19, 57) * 1.5);
    const m = new DOMMatrix().translate(540 + ox + shx, 880 + oy + shy).scale(z).rotate(th * 180 / Math.PI).translate(-cxl, -cyl);
    // sea
    ctx.save(); ctx.globalAlpha = moA;
    ctx.drawImage(seaBG(), 0, 0);
    ctx.setTransform(ctx.getTransform().multiply(m));
    mooring(ctx, t, { a: 1, strain: .6 + .4 * P(t, tSea, d), tugHL: .4 + .6 * P(t, T.dive + .4, T.dive + .85), ring: P(t, T.dive + .45, T.dive + .85) });
    ctx.restore();
    rainPlan(ctx, t, moA);
    // chip: loading buoy / tanker mooring, with a leader to the buoy
    const rp = (lx, ly) => { const q = m.transformPoint(new DOMPoint(lx, ly)); return [q.x, q.y]; };
    const bS = rp(0, MT.buoy);
    const nA = P(t, T.dive + .22, T.dive + .47, E.outQ) * (1 - P(t, d - .2, d + .02));
    lead(ctx, bS[0], bS[1] - 30, clamp(bS[0], 260, 820), 560, nA * (1 - push));
    const ns = lerp(.9, 1, E.outBack(P(t, T.dive + .22, T.dive + .55)));
    ctx.save(); ctx.translate(540, 528); ctx.scale(ns, ns); chip(ctx, D.note || '셰브런 원유 선적 부이 · 유조선 계류 작업', 0, 0, nA, { size: 33, color: '#fff' }); ctx.restore();
  }
  // ---------------- chips over the chart / mooring ----------------
  // place chip: screen-fixed in the lower slot, held from the chart through the dive into the mooring ("나이지리아 앞바다")
  const pA = P(t, tYr + .3, tYr + .62, E.outQ) * (1 - P(t, tSea + .2, tSea + .45));
  const cs = lerp(.9, 1, E.outBack(P(t, tYr + .3, tYr + .66)));
  ctx.save(); ctx.translate(PLX, PLY); ctx.scale(cs, cs); chip(ctx, D.place || '에스크라보스 앞바다 · 해안에서 약 30km', 0, 0, pA, { size: 33, color: '#fff', border: 'rgba(255,217,160,.55)' }); ctx.restore();
  // date chip (top slot), typed on "2013년"
  const dA = P(t, tYr - .12, tYr + .1) * (1 - P(t, T.dive + .02, T.dive + .22));
  typedChip(ctx, t, D.date || '2013.5.26', 540, 528, dA, P(t, tYr - .05, tYr + .45), { size: 42 });
  // crossing into the mooring: a soft cold flash
  L.flash(ctx, .12 * P(t, T.dive + .12, T.dive + .2) * (1 - P(t, T.dive + .2, T.dive + .5)), '#bfe9ff');
  quiet(ctx, 1);
};
})();
