// setup: dark stylised map (Trinidad, Gulf of Paria to the west) -> pin at Pointe-à-Pierre -> dive below the surface ->
// site schematic (berth deck, habitat on the riser, riser to an elbow, line on the seabed) -> five amber lights at work
// inside the warm habitat. Calm before the storm; ends pushing in on the habitat.
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, text, measure, roundRect, flash, drift, FONT } = L;
const { K, at, souls, chip, suffocate } = window.PK;

// camera with the focal centre at y 850 (content band 470-1230)
function cam(ctx, { x, y, zoom = 1, rot = 0, shake = 0, t = 0, seed = 0, cy = 850 }) {
  const sx = shake * noise1(t * 22, seed + 1) * 18, sy = shake * noise1(t * 22, seed + 2) * 18, sr = shake * noise1(t * 15, seed + 3) * .012;
  ctx.translate(540 + sx, cy + sy); ctx.rotate(rot + sr); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
}
const toS = (m, x, y) => { const p = m.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };

// ---------------- geography (approximate outlines, lon/lat) ----------------
const TRI = [[-61.655, 10.692], [-61.62, 10.703], [-61.57, 10.712], [-61.52, 10.727], [-61.47, 10.742], [-61.42, 10.757], [-61.36, 10.767], [-61.30, 10.782], [-61.24, 10.795], [-61.17, 10.808], [-61.10, 10.822], [-61.03, 10.832], [-60.97, 10.838], [-60.915, 10.842],
  [-60.935, 10.80], [-60.965, 10.765], [-61.01, 10.73], [-61.045, 10.69], [-61.065, 10.655], [-61.055, 10.61], [-61.035, 10.56], [-61.02, 10.50], [-61.012, 10.44], [-61.005, 10.37], [-60.998, 10.30], [-61.0, 10.23], [-61.012, 10.18], [-60.995, 10.14],
  [-61.04, 10.128], [-61.10, 10.12], [-61.17, 10.11], [-61.24, 10.10], [-61.31, 10.088], [-61.39, 10.078], [-61.47, 10.07], [-61.55, 10.065], [-61.63, 10.06], [-61.71, 10.058], [-61.79, 10.06], [-61.86, 10.064], [-61.925, 10.068],
  [-61.905, 10.092], [-61.86, 10.104], [-61.80, 10.118], [-61.745, 10.135], [-61.70, 10.158], [-61.665, 10.185], [-61.635, 10.215], [-61.60, 10.238], [-61.555, 10.252], [-61.51, 10.262], [-61.475, 10.275],
  [-61.478, 10.30], [-61.497, 10.322], [-61.49, 10.345], [-61.472, 10.37], [-61.462, 10.40], [-61.455, 10.44], [-61.45, 10.48], [-61.455, 10.52], [-61.47, 10.56], [-61.49, 10.60], [-61.505, 10.635], [-61.525, 10.655], [-61.56, 10.665], [-61.60, 10.672], [-61.635, 10.68]];
const TOB = [[-60.845, 11.152], [-60.81, 11.165], [-60.765, 11.188], [-60.71, 11.21], [-60.655, 11.235], [-60.60, 11.26], [-60.56, 11.285], [-60.53, 11.31], [-60.508, 11.338], [-60.515, 11.355], [-60.55, 11.348], [-60.60, 11.325], [-60.65, 11.30], [-60.70, 11.278], [-60.75, 11.252], [-60.80, 11.225], [-60.835, 11.195], [-60.855, 11.17]];
const VEN = [[-63.6, 10.74], [-62.6, 10.73], [-62.3, 10.72], [-62.05, 10.71], [-61.93, 10.715], [-61.875, 10.73], [-61.89, 10.69], [-61.95, 10.66], [-62.05, 10.635], [-62.18, 10.61], [-62.28, 10.57], [-62.34, 10.50], [-62.36, 10.42], [-62.33, 10.33], [-62.27, 10.24], [-62.18, 10.16], [-62.10, 10.10], [-62.02, 10.05], [-61.96, 10.0], [-61.88, 9.96], [-61.75, 9.93], [-61.6, 9.9], [-61.4, 9.86], [-61.2, 9.82], [-61.0, 9.78], [-60.8, 9.72], [-60.5, 9.6], [-60.0, 9.4], [-59.0, 9.0], [-59.0, 8.2], [-63.6, 8.2]];
// Bocas islands off the north-west tip (Chacachacare, Huevos, Monos, Gaspar Grande)
const BOCAS = [[[-61.768, 10.688], [-61.752, 10.706], [-61.733, 10.697], [-61.744, 10.679]], [[-61.727, 10.706], [-61.713, 10.713], [-61.705, 10.703], [-61.718, 10.698]],
  [[-61.703, 10.699], [-61.687, 10.711], [-61.674, 10.701], [-61.69, 10.69]], [[-61.668, 10.664], [-61.651, 10.672], [-61.644, 10.661], [-61.659, 10.655]]];
const DEG = 760, LON0 = -61.45, LAT0 = 10.45, KX = Math.cos(LAT0 * Math.PI / 180);
const pj = (lo, la) => [540 + (lo - LON0) * DEG * KX, 850 - (la - LAT0) * DEG];
const PAP = pj(-61.502, 10.323);
let GEO = null;
function geo() {
  if (GEO) return GEO;
  const chaikin = (P0, n) => { let q = P0; for (let k = 0; k < n; k++) { const r = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; r.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } q = r; } return q; };
  const mk = (poly, seed, amp) => {
    const pts = chaikin(poly.map(p => pj(p[0], p[1])), 2); const out = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n = Math.max(1, Math.round(len / 2.5)); const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (let k = 0; k < n; k++) { const u = k / n; const q = s + u * len, dd = amp * (fbm(q * .028, seed, 5) + .3 * noise1(q * .13, seed + 3) + .14 * noise1(q * .42, seed + 5)); out.push([lerp(a[0], b[0], u) + nx * dd, lerp(a[1], b[1], u) + ny * dd]); }
      s += len;
    }
    const path = new Path2D(); let L0 = 0, cx = 0, cy = 0;
    out.forEach(([x, y], i) => { if (i) { L0 += Math.hypot(x - out[i - 1][0], y - out[i - 1][1]); path.lineTo(x, y); } else path.moveTo(x, y); cx += x; cy += y; });
    path.closePath();
    return { path, len: L0 + 10, cx: cx / out.length, cy: cy / out.length };
  };
  GEO = { tri: mk(TRI, 3, 7), tob: mk(TOB, 5, 3.5), ven: mk(VEN, 7, 6), bocas: BOCAS.map((b, i) => mk(b, 11 + i, 1.2)) };
  const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
  x.fillStyle = 'rgba(143,211,232,.20)'; x.beginPath(); x.arc(6, 6, 1.15, 0, 7); x.fill(); GEO.dots = c;
  return GEO;
}

function drawMap(ctx, t, z, o) {
  const G = geo();
  // sea: deep teal pool of light under the islands
  glow(ctx, 560, 860, 1000, '#0f4656', .22, 'source-over');
  // lat / lon grid, revealed by a scan line
  ctx.save(); ctx.strokeStyle = rgba('#8fd3e8', .07 * o.grid); ctx.lineWidth = 1.3 / z;
  for (let lo = -63.5; lo <= -59; lo += .25) { const x = pj(lo, 10)[0]; ctx.beginPath(); ctx.moveTo(x, -1500); ctx.lineTo(x, 3000); ctx.stroke(); }
  for (let la = 8.5; la <= 12.5; la += .25) { const y = pj(-61, la)[1]; ctx.beginPath(); ctx.moveTo(-2000, y); ctx.lineTo(3000, y); ctx.stroke(); }
  ctx.restore();
  // Venezuela: dim, out of focus coast to the west / south (frames the gulf)
  ctx.save(); ctx.globalAlpha *= o.ven;
  ctx.fillStyle = '#0b1619'; ctx.fill(G.ven.path);
  ctx.globalAlpha *= .4; ctx.fillStyle = ctx.createPattern(G.dots, 'repeat'); ctx.fill(G.ven.path); ctx.globalAlpha /= .4;
  ctx.strokeStyle = rgba('#8fd3e8', .1); ctx.lineWidth = 7 / z; ctx.stroke(G.ven.path);
  ctx.strokeStyle = rgba('#8fd3e8', .32); ctx.lineWidth = 1.6 / z; ctx.stroke(G.ven.path);
  ctx.restore();
  // depth contours around Trinidad
  [[1.045, .14], [1.095, .085], [1.16, .05]].forEach(([s, a], i) => {
    ctx.save(); ctx.translate(G.tri.cx, G.tri.cy); ctx.scale(s, s * (1 + i * .012)); ctx.translate(-G.tri.cx, -G.tri.cy);
    ctx.strokeStyle = rgba('#8fd3e8', a * o.coast); ctx.lineWidth = 1.4 / z / s; ctx.setLineDash([6 / z, 7 / z]); ctx.lineDashOffset = -t * 6 / z; ctx.stroke(G.tri.path); ctx.restore();
  });
  // land fill + halftone dots
  for (const [g, hl] of [[G.tri, o.triHL], [G.tob, o.tobHL]]) {
    ctx.save(); ctx.globalAlpha *= o.fill;
    const gr = ctx.createRadialGradient(g.cx - 120, g.cy, 20, g.cx, g.cy, 520); gr.addColorStop(0, lerpC('#0f1d22', '#173640', hl)); gr.addColorStop(1, lerpC('#0a1418', '#0f252c', hl));
    ctx.fillStyle = gr; ctx.fill(g.path);
    const pat = ctx.createPattern(G.dots, 'repeat'); ctx.globalAlpha *= .55 + .45 * hl; ctx.fillStyle = pat; ctx.fill(g.path);
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha *= o.fill; ctx.fillStyle = '#132a31'; G.bocas.forEach(b => ctx.fill(b.path)); ctx.globalAlpha *= o.coastP;
  ctx.strokeStyle = rgba('#cfe8ff', .7); ctx.lineWidth = 1.6 / z; G.bocas.forEach(b => ctx.stroke(b.path)); ctx.restore();
  // coastline: drawn on, soft glow + crisp edge
  for (const [g, p, hl] of [[G.tri, o.coastP, o.triHL], [G.tob, o.tobP, o.tobHL]]) {
    if (p <= 0) continue;
    ctx.save(); ctx.setLineDash([g.len * p, g.len * 2]); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#8fd3e8', .16 + .14 * hl); ctx.lineWidth = 9 / z; ctx.stroke(g.path);
    ctx.strokeStyle = rgba('#cfe8ff', .75 + .25 * hl); ctx.lineWidth = 2.2 / z; ctx.stroke(g.path);
    ctx.restore();
  }
}
function lerpC(a, b, k) { return window.PK.lerp2(a, b, clamp(k)); }

// typed chip with a stable box
function typedChip(ctx, t, s, x, y, a, p, o = {}) {
  if (a <= 0) return; const size = o.size || 38, full = measure(ctx, s, size, FONT.sub, 800), w = full + 44, h = size + 26;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(4,10,14,.86)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,255,.4)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  const shown = L.typeSub(s, p);
  text(ctx, shown, x - full / 2, y + 2, { size, weight: 800, color: o.color || '#e8f4ff', align: 'left', alpha: a });
  if (p < 1 && p > 0) { const cw = measure(ctx, shown, size, FONT.sub, 800); ctx.save(); ctx.globalAlpha *= a * (Math.sin(t * 40) > 0 ? 1 : .2); ctx.fillStyle = '#8fd3e8'; ctx.fillRect(x - full / 2 + cw + 4, y - size * .42, 3, size * .84); ctx.restore(); }
}
// leader-line tag (screen space)
function lead(ctx, x0, y0, x1, y1, a, col = 'rgba(160,220,255,.55)') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 3.5, 0, 7); ctx.fill(); ctx.restore();
}
function pinMark(ctx, x, y, t, p) {
  if (p <= 0) return; const s = E.outBack(clamp(p), 2.2), drop = (1 - E.outQ(clamp(p * 1.4))) * -90;
  for (let k = 0; k < 3; k++) { const q = ((t * .8 + k / 3) % 1); ctx.save(); ctx.strokeStyle = rgba(K.red, (1 - q) * .7 * clamp(p * 2)); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 10 + q * 70, (10 + q * 70) * .62, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  glow(ctx, x, y, 70, K.red, .35 * clamp(p * 2));
  ctx.save(); ctx.translate(x, y + drop); ctx.scale(s, s); ctx.globalAlpha *= clamp(p * 3);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
  ctx.fillStyle = K.red; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, -14, -17, -22, -17, -36); ctx.arc(0, -36, 17, Math.PI, 0); ctx.bezierCurveTo(17, -22, 6, -14, 0, 0); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -36, 6, 0, 7); ctx.fill(); ctx.restore();
}

function quiet(ctx, k) {
  let g = ctx.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, `rgba(1,2,3,${.8 * k})`); g.addColorStop(.78, `rgba(1,2,3,${.72 * k})`); g.addColorStop(1, 'rgba(1,2,3,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 480);
  g = ctx.createLinearGradient(0, 1195, 0, 1300); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${.8 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 1195, W, 105); ctx.fillStyle = `rgba(1,2,3,${.86 * k})`; ctx.fillRect(0, 1300, W, H - 1300); ctx.restore();
}
// ---------------- site schematic (side view) ----------------
const ST = { rx: 420, surf: 640, deck: 604, hab: 836, hw: 190, hh: 152, bed: 1136, r: 21 };
ST.ry = ST.bed - ST.r - 4;
function pipePath(ctx) { const { rx, hab, hh, ry } = ST; ctx.beginPath(); ctx.moveTo(rx, hab + hh / 2 - 8); ctx.lineTo(rx, ry - 70); ctx.quadraticCurveTo(rx, ry, rx + 70, ry); ctx.lineTo(1900, ry); }
const PIPE_LEN = (ST.ry - 70 - (ST.hab + ST.hh / 2 - 8)) + 112 + (1900 - ST.rx - 70);
let SHORE = null;
function shore() {
  if (SHORE) return SHORE; const R = L.rng(41); const s = [];
  for (let x = -700; x < 2100;) { const k = R(); const w = 20 + R() * 60; s.push({ x, w, h: k < .35 ? 14 + R() * 18 : k < .5 ? 50 + R() * 40 : 6 + R() * 8, tank: k < .35, stack: k >= .35 && k < .5, lit: R() }); x += w + R() * 30; }
  SHORE = s; return s;
}
function drawSite(ctx, t, z, o) {
  const { rx, surf, deck, hab, hw, hh, bed, r, ry } = ST;
  // sky (mostly under the title band) + distant industrial shoreline
  let g = ctx.createLinearGradient(0, surf - 360, 0, surf); g.addColorStop(0, '#020507'); g.addColorStop(1, '#0b1a21');
  ctx.fillStyle = g; ctx.fillRect(-900, surf - 1200, 3000, 1200);
  ctx.fillStyle = '#060c0f';
  for (const s of shore()) {
    const by = surf - 2;
    if (s.tank) { ctx.fillRect(s.x, by - s.h, s.w, s.h); ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, by - s.h, s.w / 2, 4, 0, Math.PI, 0); ctx.fill(); }
    else if (s.stack) { ctx.fillRect(s.x + s.w * .4, by - s.h, 5, s.h); if (s.lit > .3) { ctx.save(); ctx.fillStyle = rgba(K.amber, .35 + .35 * (.5 + .5 * Math.sin(t * 3 + s.lit * 9))); ctx.fillRect(s.x + s.w * .4, by - s.h - 3, 5, 3); ctx.restore(); } }
    else ctx.fillRect(s.x, by - s.h, s.w, s.h);
  }
  // sea
  g = ctx.createLinearGradient(0, surf, 0, bed); g.addColorStop(0, '#0b3341'); g.addColorStop(.4, '#062029'); g.addColorStop(1, '#020b10');
  ctx.fillStyle = g; ctx.fillRect(-900, surf, 3000, bed - surf + 40);
  // light shafts below the surface
  ctx.save(); ctx.beginPath(); ctx.rect(-900, surf, 3000, bed - surf); ctx.clip();
  for (let i = 0; i < 8; i++) {
    const x = -200 + i * 190 + Math.sin(t * .35 + i * 1.7) * 40, w = 30 + 50 * hash(i * 5 + 2), al = .07 * (.45 + .55 * (.5 + .5 * Math.sin(t * .8 + i * 2.3)));
    const sg = ctx.createLinearGradient(0, surf, 0, bed); sg.addColorStop(0, rgba('#9fe7ff', al)); sg.addColorStop(1, 'rgba(159,231,255,0)'); ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(x - w * .4, surf); ctx.lineTo(x + w * .4, surf); ctx.lineTo(x + w * 1.8 + 160, bed); ctx.lineTo(x - w * 1.8 + 160, bed); ctx.closePath(); ctx.fill();
  }
  const ug = ctx.createLinearGradient(0, surf, 0, surf + 60); ug.addColorStop(0, 'rgba(160,225,245,.16)'); ug.addColorStop(1, 'rgba(160,225,245,0)'); ctx.fillStyle = ug; ctx.fillRect(-900, surf, 3000, 60);
  ctx.restore();
  // seabed
  g = ctx.createLinearGradient(0, bed, 0, bed + 500); g.addColorStop(0, '#16120c'); g.addColorStop(1, '#030302');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-900, bed + 40);
  for (let x = -900; x <= 2100; x += 30) ctx.lineTo(x, bed + Math.sin(x * .011) * 5 + noise1(x * .02, 4) * 4); ctx.lineTo(2100, bed + 600); ctx.lineTo(-900, bed + 600); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,128,90,.3)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -900; x <= 2100; x += 30) { const y = bed + Math.sin(x * .011) * 5 + noise1(x * .02, 4) * 4; x === -900 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  // berth: piles + deck
  for (let px = -560; px <= rx - 80; px += 118) {
    const pg = ctx.createLinearGradient(px, 0, px + 18, 0); pg.addColorStop(0, '#3d4850'); pg.addColorStop(.4, '#232b30'); pg.addColorStop(1, '#0e1316');
    ctx.fillStyle = pg; ctx.fillRect(px, deck, 18, bed - deck + 6);
  }
  g = ctx.createLinearGradient(0, deck - 16, 0, deck + 12); g.addColorStop(0, '#56636b'); g.addColorStop(.3, '#2f383e'); g.addColorStop(1, '#141a1d');
  ctx.fillStyle = g; ctx.fillRect(-900, deck - 16, rx + 90 + 900, 28);
  ctx.fillStyle = '#1b2226'; for (let bx = -400; bx < rx + 60; bx += 160) { ctx.fillRect(bx, deck - 30, 16, 14); ctx.fillRect(bx - 4, deck - 33, 24, 5); }
  // surface line (over the piles)
  ctx.strokeStyle = 'rgba(190,235,255,.62)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = -900; x <= 2100; x += 12) { const y = surf + Math.sin(x * .02 + t * 1.5) * 3 + Math.sin(x * .007 - t) * 2; x === -900 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  // umbilicals from the deck down to the habitat
  ctx.save(); ctx.lineCap = 'round';
  [[-34, '#c99a3a', 3.2, 0], [-12, '#1a1f22', 4, 1.3], [16, '#b98c34', 2.6, 2.1]].forEach(([dx, c, lw, ph]) => {
    const sw = Math.sin(t * .7 + ph) * 10; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(rx + dx * .5 + 40, deck + 10);
    ctx.bezierCurveTo(rx + 70 + sw, deck + 80, rx + dx + 20 - sw, hab - hh / 2 - 60, rx + dx, hab - hh / 2 + 2); ctx.stroke();
  });
  ctx.restore();
  // pipe: riser from the habitat floor down to the elbow, then the line along the seabed
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (let sx = rx + 150; sx < 1900; sx += 230) { ctx.fillStyle = '#0c0b09'; ctx.fillRect(sx - 14, ry + r - 4, 28, bed - ry - r + 10); }
  if (o.pipeHL > 0) { pipePath(ctx); ctx.strokeStyle = rgba('#8fd3e8', .5 * o.pipeHL); ctx.lineWidth = r * 2 + 7; ctx.stroke(); }
  pipePath(ctx); ctx.strokeStyle = '#323d43'; ctx.lineWidth = r * 2; ctx.stroke();
  ctx.save(); ctx.translate(-r * .3, -r * .3); pipePath(ctx); ctx.strokeStyle = rgba('#93a5ae', .55); ctx.lineWidth = r * .42; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(r * .45, r * .45); pipePath(ctx); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = r * .5; ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; for (let sx = rx + 120; sx < 1900; sx += 230) ctx.fillRect(sx, ry - r, 6, r * 2);
  for (const fy of [hab + hh / 2 + 70, ry - 160]) { ctx.fillStyle = '#4a565d'; ctx.fillRect(rx - r - 6, fy, r * 2 + 12, 10); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(rx - r - 6, fy + 7, r * 2 + 12, 3); }
  // travelling cyan pulse along the pipe on "송유관을"
  if (o.pulse > 0 && o.pulse < 1) {
    const pos = o.pulse * PIPE_LEN; ctx.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[r * 2.6, .18], [r * 1.1, .55], [r * .4, .9]]) { pipePath(ctx); ctx.setLineDash([150, PIPE_LEN * 3]); ctx.lineDashOffset = -(pos - 150); ctx.strokeStyle = rgba('#bfe9ff', a * Math.sin(o.pulse * Math.PI)); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  ctx.restore();
  // diameter callout on the seabed line
  if (o.dim > 0) {
    const dx = 820; ctx.save(); ctx.globalAlpha *= o.dim; ctx.strokeStyle = '#cfe8ff'; ctx.fillStyle = '#cfe8ff'; ctx.lineWidth = 2;
    const e = E.outC(o.dim); ctx.beginPath(); ctx.moveTo(dx - 16, ry - r); ctx.lineTo(dx + 16, ry - r); ctx.moveTo(dx - 16, ry + r); ctx.lineTo(dx + 16, ry + r);
    ctx.moveTo(dx, ry - r * e); ctx.lineTo(dx, ry + r * e); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx, ry - r); ctx.lineTo(dx - 5, ry - r + 8); ctx.lineTo(dx + 5, ry - r + 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(dx, ry + r); ctx.lineTo(dx - 5, ry + r - 8); ctx.lineTo(dx + 5, ry + r - 8); ctx.fill();
    ctx.restore();
  }
  drawHabitat(ctx, t, o);
  // slow bubbles from the habitat hatch up to the surface
  ctx.save(); ctx.beginPath(); ctx.rect(-900, surf + 4, 3000, bed); ctx.clip(); ctx.strokeStyle = 'rgba(216,246,255,.55)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 12; i++) {
    const life = 3.2 + hash(i * 3 + 1) * 2.2, ph = ((t / life + hash(i + 7)) % 1); const y0 = hab - hh / 2 - 6, y = lerp(y0, surf - 10, ph);
    const x = rx + 30 + (hash(i * 7) - .5) * 40 + Math.sin(t * 2.2 + i) * 6 * ph, rr = 2.4 + hash(i * 11) * 4 * (1 + ph * .5);
    ctx.globalAlpha = Math.sin(ph * Math.PI) * .8; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke();
  }
  ctx.restore();
  L.motes(ctx, t, { n: 70, color: '#9cc9d6', a: .28, size: 1.8, speed: 7, seed: 15, area: [-200, surf + 10, 1500, bed - surf - 10] });
}
const HL = [[-64, 22], [-33, 4], [0, -6], [33, 6], [64, 20]];
function drawHabitat(ctx, t, o) {
  const { rx: x, hab: y, hw: w, hh: h } = ST; const on = o.on;
  ctx.save();
  // warm spill into the water around the chamber
  glow(ctx, x, y, 200, '#ffb347', .18 * on);
  // shell
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#6e5214'); g.addColorStop(.28, '#c4962f'); g.addColorStop(.62, '#a87d22'); g.addColorStop(1, '#4b370b');
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 20); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#3a2b0a'; ctx.fillRect(x - 22, y - h / 2 - 12, 44, 14); // top hatch
  // cutaway interior
  const ix = x - w / 2 + 14, iy = y - h / 2 + 14, iw = w - 28, ih = h - 30;
  ctx.save(); roundRect(ctx, ix, iy, iw, ih, 10); ctx.clip();
  const gi = ctx.createLinearGradient(0, iy, 0, iy + ih); gi.addColorStop(0, lerpC('#0c0905', '#2e200c', on)); gi.addColorStop(1, lerpC('#060403', '#0f0a04', on));
  ctx.fillStyle = gi; ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 1; k < 4; k++) ctx.fillRect(ix + iw * k / 4 - 2, iy, 4, ih);
  const fl = on * (1 - .12 * (.5 + .5 * noise1(t * 9, 3)));
  glow(ctx, x - 40, iy + 6, 110, '#ffd9a0', .4 * fl); glow(ctx, x + 46, iy + 6, 90, '#ffd9a0', .32 * fl);
  ctx.fillStyle = rgba('#fff1d0', .9 * fl); ctx.fillRect(x - 48, iy, 16, 4); ctx.fillRect(x + 38, iy, 16, 4);
  // pool + pipe stub (mouth just under the water)
  const py = y + 34;
  ctx.fillStyle = '#2a3237'; ctx.fillRect(x - ST.r - 4, py + 8, ST.r * 2 + 8, ih); ctx.fillStyle = '#5b6870'; ctx.fillRect(x - ST.r - 9, py + 6, ST.r * 2 + 18, 7);
  ctx.fillStyle = '#05080a'; ctx.fillRect(x - ST.r + 4, py + 8, ST.r * 2 - 8, 4);
  const wg = ctx.createLinearGradient(0, py, 0, iy + ih); wg.addColorStop(0, 'rgba(22,80,94,.82)'); wg.addColorStop(1, 'rgba(6,26,32,.92)');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(ix, iy + ih);
  for (let xx = ix; xx <= ix + iw + 6; xx += 6) ctx.lineTo(xx, py + Math.sin(xx * .08 + t * 2.4) * 1.6); ctx.lineTo(ix + iw, iy + ih); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#bfe9ff', .55); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let xx = ix; xx <= ix + iw + 6; xx += 6) { const yy = py + Math.sin(xx * .08 + t * 2.4) * 1.6; xx === ix ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
  ctx.restore();
  // rim + rivets
  ctx.strokeStyle = 'rgba(255,225,150,.35)'; ctx.lineWidth = 1.5; roundRect(ctx, ix, iy, iw, ih, 10); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x - w / 2 + 12 + k * (w - 24) / 8, y - h / 2 + 7, 2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x - w / 2 + 12 + k * (w - 24) / 8, y + h / 2 - 8, 2, 0, 7); ctx.fill(); }
  ctx.restore();
  // five lives at work around the riser mouth
  const pts = HL.map(([dx, dy], i) => ({ x: x + dx + noise1(t * .6, i * 5) * 3, y: y + dy + noise1(t * .5, i * 5 + 2) * 2.5, a: o.lights[i], s: o.ls || .68 }));
  souls(ctx, t, pts, { bpm: 70 });
}

window.PK.scenes.setup = function (ctx, t, d, info) {
  const tYr = at(info, '2022', .02), tTri = at(info, '트리니다드', .2), tTob = at(info, '토바고', .3), tGuk = at(info, '국영기업', .42), tPar = at(info, '파리아의', .5),
    tSea = at(info, '해저', .56), tPipe = at(info, '송유관을', .6), tFix = at(info, '고치던', .66), tSub = at(info, '하청', .72), tDiv = at(info, '잠수부', .78), t5 = at(info, '다섯', .84);
  const dr = drift(t, 1, 21);
  ctx.save(); ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H); ctx.restore();
  // ---------------- MAP PHASE ----------------
  const mapA = 1 - P(t, tSea - .02, tSea + .24, E.inQ);
  let pinS = null;
  if (mapA > 0) {
    const pPush = P(t, tTob + .2, tPar - .05, E.inOutC), pDive = P(t, tSea - .22, tSea + .3, E.inC);
    const zw = .66 * (1 + .05 * P(t, -.3, tTob + .2)), zn = 1.5 * (1 + .14 * P(t, tPar - .05, tSea, E.inQ));
    const z = Math.exp(lerp(Math.log(zw), Math.log(zn), pPush)) * (1 + 7 * pDive);
    const cx = lerp(600, PAP[0] + 30, E.inOutQ(pPush)) + dr.x / z, cy = lerp(745, PAP[1] - 10, E.inOutQ(pPush)) + dr.y / z;
    L.motes(ctx, t, { n: 40, color: '#8fd3e8', a: .16, size: 1.5, speed: 5, seed: 31, area: [0, 470, W, 780] });
    ctx.save(); ctx.globalAlpha = mapA;
    cam(ctx, { x: cx, y: cy, zoom: z, rot: dr.r * .5, t });
    drawMap(ctx, t, z, {
      grid: P(t, -.25, 1.0), ven: P(t, -.2, .8), coast: P(t, .1, 1.2), fill: P(t, -.1, 1.1),
      coastP: P(t, -.3, 1.35, E.inOutQ), tobP: P(t, .4, 1.5, E.inOutQ),
      triHL: P(t, tTri - .05, tTri + .4, E.outQ) * (1 - .5 * P(t, tTob - .05, tTob + .3)), tobHL: P(t, tTob - .05, tTob + .3, E.outQ) * (1 - P(t, tTob + .6, tGuk + .2)),
    });
    const m = ctx.getTransform(); pinS = toS(m, PAP[0], PAP[1]);
    ctx.restore();
    // sweep line that "scans" the map in
    const sw = P(t, .0, 1.3, E.inOutQ); if (sw > 0 && sw < 1) { const y = lerp(470, 1240, sw); ctx.save(); const sg = ctx.createLinearGradient(0, y - 90, 0, y); sg.addColorStop(0, 'rgba(143,211,232,0)'); sg.addColorStop(1, 'rgba(143,211,232,.09)'); ctx.fillStyle = sg; ctx.fillRect(0, y - 90, W, 90); ctx.fillStyle = 'rgba(191,233,255,.35)'; ctx.fillRect(0, y, W, 1.5); ctx.restore(); }
    // pin + tags (screen space)
    const pinP = P(t, tTri + .05, tTri + .55);
    ctx.save(); ctx.globalAlpha = mapA;
    pinMark(ctx, pinS[0], pinS[1], t, pinP);
    const tagA = P(t, tTri + .25, tTri + .6, E.outQ) * (1 - P(t, tSea - .2, tSea + .1));
    const tyy = pinS[1] - 150;
    lead(ctx, pinS[0], pinS[1] - 48, pinS[0] - 40, tyy + 30, tagA);
    chip(ctx, 'Pointe-à-Pierre, 트리니다드', clamp(pinS[0] - 40, 300, 780), tyy, tagA, { size: 34 });
    // state-company chip: in on '국영기업', held until the dive on '해저'
    const cA = P(t, tGuk - .05, tGuk + .3, E.outQ) * (1 - P(t, tSea - .05, tSea + .15));
    const cy2 = pinS[1] + 120;
    lead(ctx, pinS[0], pinS[1] + 10, pinS[0] - 40, cy2 - 30, cA);
    const cs = lerp(.9, 1, E.outBack(P(t, tGuk - .05, tGuk + .3)));
    ctx.save(); ctx.translate(clamp(pinS[0] - 40, 300, 780), cy2); ctx.scale(cs, cs); chip(ctx, 'Paria Fuel Trading (국영)', 0, 0, cA, { size: 34, color: '#fff', border: 'rgba(255,200,130,.5)' }); ctx.restore();
    ctx.restore();
    // date (top info slot), typed on "2022년"
    const dA = P(t, tYr - .1, tYr + .15) * (1 - P(t, tSea - .2, tSea + .15));
    typedChip(ctx, t, '2022.2.25', 540, 528, dA, P(t, tYr, tYr + .6), { size: 40 });
  }
  // ---------------- DIVE + SITE PHASE ----------------
  const siteA = P(t, tSea + .1, tSea + .42, E.inOutQ);
  if (siteA > 0) {
    const desc = P(t, tSea - .05, tSea + .8, E.outC);
    // push in on '하청' so the habitat is ~630 px wide by '다섯 명이' (lights countable), then keep closing in so the five
    // lights land where the suction cutaway opens (spread ~±320 px, y ~630-690) for the hand-over
    const e1 = E.inOutQ(P(t, tSub - .15, t5 + .05)), e2 = E.inQ(P(t, t5 + .05, d + .2));
    const z = Math.pow(3.3, e1) * Math.pow(5 / 3.3, e2);
    const cx = lerp(540, ST.rx, e1) + dr.x / z, cy = lerp(lerp(lerp(380, 850, desc), ST.hab - 6, e1), 874, e2) + dr.y / z;
    ctx.save(); ctx.globalAlpha = siteA;
    cam(ctx, { x: cx, y: cy, zoom: z, rot: dr.r, t, shake: .12 * (1 - desc) });
    drawSite(ctx, t, z, {
      pipeHL: P(t, tPipe, tPipe + .6) * (1 - .6 * P(t, tFix + .2, tSub + .3)), pulse: P(t, tPipe - .05, tFix + .55, E.inOutQ), dim: P(t, tPipe + .1, tPipe + .55) * (1 - P(t, tSub + .05, tSub + .3)),
      on: .25 + .75 * P(t, tFix - .05, tFix + .35, E.outQ) * (hash(Math.floor(t * 12)) > .35 || t > tFix + .3 ? 1 : .55),
      lights: [0, 1, 2, 3, 4].map(i => P(t, tSub + i * .17, tSub + i * .17 + .35, E.outQ)), ls: .68 * Math.min(1, 2.2 / z),
    });
    const m = ctx.getTransform();
    const dimS = toS(m, 820, ST.ry - ST.r), deckS = toS(m, ST.rx + 40, ST.deck - 16);
    ctx.restore();
    // labels (screen space)
    const bA = siteA * P(t, tPipe - .15, tPipe + .2, E.outQ) * (1 - P(t, d - .7, d - .2));
    lead(ctx, deckS[0], deckS[1], 540, 560, bA * (1 - P(t, tFix, tFix + .4)));
    chip(ctx, '6번 부두 · 36번 해저관', 540, 528, bA, { size: 36 });
    const dA = siteA * P(t, tPipe + .15, tPipe + .5, E.outQ) * (1 - P(t, tSub + .05, tSub + .3));
    lead(ctx, dimS[0], dimS[1] - 4, dimS[0], dimS[1] - 64, dA);
    chip(ctx, '지름 30인치 ≈ 76cm', clamp(dimS[0], 260, 820), dimS[1] - 96, dA, { size: 32 });
    // crew chip: in on '하청', out before the hand-over so it never ghosts over the next scene
    const cA = P(t, tSub - .1, tSub + .25, E.outQ) * (1 - P(t, d - .45, d - .2)), cs = lerp(.88, 1, E.outBack(P(t, tSub - .1, tSub + .3))) * (1 + .05 * Math.exp(-Math.max(0, t - t5) * 6) * (t > t5 ? 1 : 0));
    ctx.save(); ctx.translate(540, 1150); ctx.scale(cs, cs); chip(ctx, '하청 LMCS 잠수부 5명', 0, 0, cA, { size: 38, color: '#fff', border: 'rgba(255,179,71,.6)' }); ctx.restore();
  }
  flash(ctx, .14 * P(t, tSea - .08, tSea + .02) * (1 - P(t, tSea + .02, tSea + .35)), '#bfe9ff');
  // crossing the sea surface on "해저": a bright wavy waterline sweeps up through the frame
  const wipe = P(t, tSea - .02, tSea + .4, E.inOutQ);
  if (wipe > 0 && wipe < 1) {
    const y = lerp(1300, 380, wipe), al = Math.sin(wipe * Math.PI);
    ctx.save(); let wg = ctx.createLinearGradient(0, y, 0, y + 260); wg.addColorStop(0, rgba('#9fe7ff', .16 * al)); wg.addColorStop(1, 'rgba(159,231,255,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, y, W, 260); ctx.strokeStyle = rgba('#d8f6ff', .7 * al); ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= W; x += 12) { const yy = y + Math.sin(x * .018 + t * 7) * 10 + Math.sin(x * .05 - t * 5) * 4; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); ctx.restore();
  }
  // keep the title band and the subtitle band quiet
  quiet(ctx, 1);
  // dive: burst of bubbles rushing up past the lens
  const bb = P(t, tSea - .2, tSea + 1.2);
  if (bb > 0 && bb < 1) {
    ctx.save(); ctx.lineWidth = 2.2;
    for (let i = 0; i < 70; i++) {
      const st = tSea - .15 + hash(i * 3 + 1) * .4, age = t - st; if (age < 0 || age > 1.1) continue;
      const sp = 1100 + hash(i * 5) * 1500, x = hash(i * 7 + 2) * W + Math.sin(age * 7 + i) * 14, y = 1150 + hash(i * 11) * 1100 - age * sp, rr = 4 + hash(i * 13) * (i % 7 === 0 ? 34 : 14);
      const al = (1 - age / 1.1) * .75; ctx.strokeStyle = rgba('#d8f6ff', al); ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', al * .6); ctx.beginPath(); ctx.arc(x - rr * .35, y - rr * .35, rr * .22, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // the calm before the storm: a faint tightening as we close in on the habitat
  suffocate(ctx, t, .12 * P(t, tSub, d + .2, E.inQ), .25);
  // hand-over: the frame goes dark through the transition window (only rendered there) so the outgoing habitat
  // does not ghost over the suction cutaway
  const ho = P(t, d - .2, d + .2);
  if (ho > 0) { ctx.save(); ctx.fillStyle = `rgba(1,2,3,${(.97 * E.outQ(clamp(ho * 3.6))).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
};
})();
