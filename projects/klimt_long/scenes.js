// "도둑맞은 클림트, 22년 뒤 그 미술관 벽 속에서" — scene drawings.
// All artwork is original, drawn in code. The portrait is a stylized homage, not a copy of the real painting.
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;

const K = { gold: '#d9a93a', goldHi: '#f6d77f', goldDeep: '#8a6418', red: '#e3262f', cold: '#8ea3b8', cyan: '#5fe3ff', ivy: '#2f8048' };
const HATCH = { x: 540, y: 800, s: 250 };
const T = {};
let LEAVES = [];
let ITALY = null;

// ---------- helpers ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function wt(info, w, fb = 0) { const x = info.sc.words.find(o => o.w.includes(w)); return x ? x.t - info.sc.t0 : fb; }
function vend(info) { return info.sc.voice_end - info.sc.t0; }
function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash(((a * 73856093) ^ (b * 19349663) ^ (seed * 83492791)) | 0);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
function darkness(ctx, x, y, r, a = .9, soft = .55) {
  const g = ctx.createRadialGradient(x, y, r * soft, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
}
function brackets(ctx, x, y, w, h, p, color = K.red, len = 46, lw = 7) {
  if (p <= 0) return; const s = lerp(1.35, 1, E.outBack(clamp(p))), a = clamp(p * 3);
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
  ctx.shadowColor = color; ctx.shadowBlur = 16;
  const X = w / 2, Y = h / 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(sx * X, sy * Y + -sy * len); ctx.lineTo(sx * X, sy * Y); ctx.lineTo(sx * X - sx * len, sy * Y); ctx.stroke(); }
  ctx.restore();
}
function label(ctx, s, x, y, o = {}) {
  const { size = 36, color = '#fff', bg = 'rgba(8,10,14,.78)', border = null, a = 1, family = FONT.sub, weight = 800, padX = 20, padY = 12 } = o;
  if (a <= 0) return; const w = measure(ctx, s, size, family, weight) + padX * 2, h = size + padY * 2;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - h / 2, w, h, 8); ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore(); text(ctx, s, x, y + 2, { size, color, family, weight, alpha: a });
}
// split-flap text: chars roll until lock
function flap(ctx, s, x, y, t, t0, { size = 120, cell = .74, lock = .07, roll = .45, color = '#f4f1ea', bg = '#14161b' } = {}) {
  const chars = Array.from(s); const cw = size * cell, ch = size * 1.28, gap = size * .08;
  const total = chars.length * (cw + gap) - gap; let cx = x - total / 2;
  const pool = '0123456789';
  chars.forEach((c, i) => {
    const tl = t0 + roll + i * lock; const locked = t >= tl;
    const f = Math.floor(t * 30) + i * 7;
    const shown = locked || c === '.' || c === ' ' ? c : pool[Math.floor(hash(f) * 10)];
    if (c !== '.' && c !== ' ') {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      ctx.fillStyle = bg; roundRect(ctx, cx, y - ch / 2, cw, ch, 10); ctx.fill(); ctx.restore();
      const g = ctx.createLinearGradient(0, y - ch / 2, 0, y + ch / 2); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; roundRect(ctx, cx, y - ch / 2, cw, ch, 10); ctx.fill();
      const flip = locked ? clamp((t - tl) / .08) : (t * 30 % 1);
      ctx.save(); ctx.beginPath(); ctx.rect(cx, y - ch / 2, cw, ch); ctx.clip();
      ctx.translate(cx + cw / 2, y); ctx.scale(1, locked ? lerp(.2, 1, E.outBack(flip)) : .85 + .15 * Math.cos(flip * Math.PI));
      text(ctx, shown, 0, size * .04, { size, family: FONT.disp, color: locked ? color : '#aab', weight: 400 });
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(cx, y - 2, cw, 4);
    } else {
      text(ctx, c, cx + cw * .2, y + size * .3, { size, family: FONT.disp, color, weight: 400 });
    }
    cx += (c === '.' ? cw * .4 : cw) + gap;
  });
}

// ---------- textures ----------
function makeBricks() {
  const [c, x] = mk(1700, 2700); // world origin offset (-310,-420)
  x.fillStyle = '#100c0a'; x.fillRect(0, 0, 1700, 2700);
  const R = rng(42), bw = 152, bh = 56, m = 10;
  for (let row = 0; row * (bh + m) < 2700; row++) {
    const off = (row % 2) * (bw + m) / 2;
    for (let col = -1; col * (bw + m) < 1700 + bw; col++) {
      const X = col * (bw + m) - off + (R() - .5) * 3, Y = row * (bh + m) + (R() - .5) * 3;
      const l = 15 + R() * 11, s = 16 + R() * 16, hue = 8 + R() * 16;
      x.fillStyle = `hsl(${hue},${s}%,${l}%)`; roundRect(x, X, Y, bw, bh, 6); x.fill();
      x.fillStyle = 'rgba(255,215,180,.06)'; x.fillRect(X + 4, Y + 2, bw - 8, 6);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(X + 4, Y + bh - 8, bw - 8, 8);
      for (let k = 0; k < 18; k++) { x.fillStyle = `rgba(0,0,0,${R() * .28})`; x.beginPath(); x.arc(X + R() * bw, Y + R() * bh, R() * 3 + .5, 0, 7); x.fill(); }
      for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(255,230,200,${R() * .06})`; x.beginPath(); x.arc(X + R() * bw, Y + R() * bh, R() * 4 + 1, 0, 7); x.fill(); }
      if (R() < .18) { x.fillStyle = 'rgba(40,70,45,.16)'; roundRect(x, X, Y, bw, bh, 6); x.fill(); }
    }
  }
  for (let i = 0; i < 26; i++) { // grime streaks
    const X = R() * 1700, Y = R() * 1800, w = 30 + R() * 90;
    const g = x.createLinearGradient(X, Y, X, Y + 900); g.addColorStop(0, `rgba(0,0,0,${.12 + R() * .2})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(X, Y, w, 900);
  }
  // vines (stems) drawn into the wall texture
  x.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let px = R() < .5 ? R() * 500 : 1200 + R() * 500, py = 2700 - R() * 600, ang = -Math.PI / 2 + (px < 850 ? .35 : -.35);
    x.strokeStyle = `rgba(${40 + R() * 20},${45 + R() * 20},${25},.9)`; x.lineWidth = 5 + R() * 6;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 60; k++) { ang += (R() - .5) * .5; px += Math.cos(ang) * 30; py += Math.sin(ang) * 30; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}
const WALL_OX = -310, WALL_OY = -420;

function leafPath(x, r) {
  x.beginPath(); const N = 140;
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI + i / N * 2 * Math.PI, g = (c, w) => Math.exp(-Math.abs(th - c) / w);
    let rr = .56 + .5 * g(0, .34) + .26 * (g(1.05, .3) + g(-1.05, .3)) + .1 * (g(2.1, .32) + g(-2.1, .32));
    rr *= 1 - .42 * Math.exp(-Math.pow((Math.abs(th) - Math.PI) / .26, 2));
    const px = Math.sin(th) * rr * r, py = -Math.cos(th) * rr * r;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}
function leafSprite(r, c0, c1, vein) {
  const S = Math.ceil(r * 2.6); const [c, x] = mk(S, S); x.translate(S / 2, S / 2);
  leafPath(x, r);
  const g = x.createLinearGradient(-r, -r, r, r); g.addColorStop(0, c1); g.addColorStop(1, c0); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.5; x.stroke();
  x.strokeStyle = vein; x.lineWidth = 2.4; x.lineCap = 'round';
  for (const a of [0, .95, -.95, 2.0, -2.0]) {
    const Lr = a === 0 ? r * 1.0 : (Math.abs(a) < 1.5 ? r * .78 : r * .52);
    x.beginPath(); x.moveTo(0, r * .2); x.quadraticCurveTo(Math.sin(a) * Lr * .45, r * .2 - Math.cos(a) * Lr * .45, Math.sin(a) * Lr * .92, -Math.cos(a) * Lr * .92 + r * .06); x.stroke();
  }
  const hg = x.createRadialGradient(-r * .3, -r * .45, 0, -r * .3, -r * .45, r); hg.addColorStop(0, 'rgba(255,255,255,.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = hg; leafPath(x, r); x.fill();
  return c;
}
function makeLeaves() {
  const cols = [['#030c07', '#0a2214', 'rgba(110,160,120,.10)'], ['#05140c', '#0f2f1c', 'rgba(130,180,130,.12)'], ['#071a0f', '#163f26', 'rgba(150,200,150,.15)'],
    ['#0a2214', '#1e5132', 'rgba(170,215,165,.18)'], ['#0c2a18', '#28663e', 'rgba(185,225,175,.2)'], ['#081d11', '#1a4a2d', 'rgba(150,200,150,.15)']];
  T.leaf = cols.map(([a, b, v]) => leafSprite(64, a, b, v));
  const R = rng(5); LEAVES = [];
  const hx = HATCH.x, hy = HATCH.y, hs = HATCH.s / 2;
  for (let gy = -500; gy < 2300; gy += 36) for (let gx = -450; gx < 1550; gx += 36) {
    const x = gx + (R() - .5) * 34, y = gy + (R() - .5) * 34;
    const dx = Math.abs(x - hx), dy = Math.abs(y - hy), r = Math.hypot(x - hx, y - hy);
    const inHatch = dx < hs + 18 && dy < hs + 18;
    let d = .02 + .7 * clamp((Math.abs(x - 540) - 190) / 320) + .3 * clamp((y - 1100) / 500) + .7 * (noise2(x * .006, y * .006, 3) - .5);
    d += (r > 165 && r < 300) ? .3 * (1 - Math.abs(r - 232) / 70) : 0;
    if (y < 300) d += .2;
    const cover = inHatch;
    if (cover) d = .95;
    if (R() > clamp(d)) continue;
    const layer = R() < .35 ? 0 : (R() < .6 ? 1 : 2);
    LEAVES.push({ x, y, s: 30 + R() * 22 + layer * 4, rot: (R() - .5) * 1.6 + (x < 540 ? .3 : -.3), v: layer === 0 ? Math.floor(R() * 2) : 2 + Math.floor(R() * 4), layer, ph: R() * 6.28,
      cover, late: !cover && r < 340, dist: r, fallDir: R() < .5 ? -1 : 1, fallJ: R() });
  }
  LEAVES.sort((a, b) => a.layer - b.layer || a.y - b.y);
}
// draw leaves in world coords. o: {cover:bool, cutT:time leaves near hatch start falling (S5), grow: 0..1 regrow of late leaves}
function drawLeaves(ctx, t, o = {}) {
  const cutR = o.cutR || 0;
  for (const L0 of LEAVES) {
    if (L0.cover && !o.cover) continue;
    let x = L0.x + Math.sin(t * 1.1 + L0.ph) * (2 + L0.layer * 1.5), y = L0.y + Math.cos(t * .9 + L0.ph) * 1.5;
    let rot = L0.rot + Math.sin(t * 1.6 + L0.ph) * (.05 + L0.layer * .02), sc = L0.s / 64, a = 1;
    if (o.grow != null && L0.late) { const k = clamp((o.grow - (1 - L0.dist / 340) * .6) / .4); if (k <= 0) continue; sc *= E.outBack(k); }
    if (o.cut != null && (L0.cover || L0.late)) {
      const start = o.cut + (L0.cover ? (L0.dist / 200) * .5 : .35 + (L0.dist / 340) * .5) + L0.fallJ * .15;
      const f = clamp((t - start) / .9);
      if (f >= 1) continue;
      if (f > 0) { y += f * f * 700; x += L0.fallDir * f * 120; rot += L0.fallDir * f * 4; a = 1 - f * f; }
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= a;
    const S = T.leaf[L0.v]; ctx.drawImage(S, -S.width / 2, -S.height / 2 - 10); ctx.restore();
  }
}

function makeFrame(w = 760, h = 860, b = 84) {
  const [c, x] = mk(w, h);
  const g = x.createLinearGradient(0, 0, w, h);
  [['0', '#6b4a12'], ['.18', '#e8c46a'], ['.32', '#9c7424'], ['.5', '#f7dc8c'], ['.68', '#8a6418'], ['.84', '#e0b95c'], ['1', '#6b4a12']].forEach(([o, col]) => g.addColorStop(+o, col));
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const ring = (ins, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.strokeRect(ins, ins, w - ins * 2, h - ins * 2); };
  ring(4, 'rgba(60,35,5,.8)', 6); ring(16, 'rgba(255,240,190,.55)', 3); ring(24, 'rgba(70,45,8,.7)', 5); ring(44, 'rgba(255,235,170,.5)', 3); ring(62, 'rgba(60,35,5,.75)', 6); ring(74, 'rgba(255,240,200,.5)', 2);
  // bead row
  for (const [ins, step] of [[34, 22], [54, 18]]) {
    const pts = []; for (let X = ins; X <= w - ins; X += step) { pts.push([X, ins], [X, h - ins]); } for (let Y = ins; Y <= h - ins; Y += step) { pts.push([ins, Y], [w - ins, Y]); }
    for (const [X, Y] of pts) { const rg = x.createRadialGradient(X - 2, Y - 2, 0, X, Y, 6); rg.addColorStop(0, '#fff3c4'); rg.addColorStop(.5, '#c99a3a'); rg.addColorStop(1, '#5a3b0a'); x.fillStyle = rg; x.beginPath(); x.arc(X, Y, ins === 34 ? 5.5 : 4.2, 0, 7); x.fill(); }
  }
  // corner rosettes + side cartouches
  const rose = (X, Y, r) => {
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.save(); x.translate(X, Y); x.rotate(a); const rg = x.createLinearGradient(0, -r, 0, 0); rg.addColorStop(0, '#fff0b8'); rg.addColorStop(1, '#7a5212'); x.fillStyle = rg; x.beginPath(); x.ellipse(0, -r * .55, r * .22, r * .5, 0, 0, 7); x.fill(); x.restore(); }
    const rg = x.createRadialGradient(X - 4, Y - 4, 0, X, Y, r * .35); rg.addColorStop(0, '#fff5cf'); rg.addColorStop(1, '#8a6418'); x.fillStyle = rg; x.beginPath(); x.arc(X, Y, r * .32, 0, 7); x.fill();
  };
  rose(b * .5, b * .5, 52); rose(w - b * .5, b * .5, 52); rose(b * .5, h - b * .5, 52); rose(w - b * .5, h - b * .5, 52);
  for (const [X, Y, rt] of [[w / 2, b * .45, 0], [w / 2, h - b * .45, 0], [b * .45, h / 2, Math.PI / 2], [w - b * .45, h / 2, Math.PI / 2]]) {
    x.save(); x.translate(X, Y); x.rotate(rt); for (let k = -3; k <= 3; k++) { const rg = x.createLinearGradient(0, -18, 0, 18); rg.addColorStop(0, '#fff0b8'); rg.addColorStop(1, '#6b4a12'); x.fillStyle = rg; x.beginPath(); x.ellipse(k * 22, 0, 9, 18 - Math.abs(k) * 2, k * .2, 0, 7); x.fill(); } x.restore();
  }
  // inner shadow lip
  x.clearRect(b, b, w - b * 2, h - b * 2);
  x.strokeStyle = 'rgba(30,18,2,.9)'; x.lineWidth = 8; x.strokeRect(b - 4, b - 4, w - b * 2 + 8, h - b * 2 + 8);
  return c;
}

function spiral(x, cx, cy, r, col, lw = 3) {
  x.strokeStyle = col; x.lineWidth = lw; x.beginPath();
  for (let a = 0; a < Math.PI * 6; a += .1) { const rr = r * a / (Math.PI * 6); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; a ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.stroke();
}
function smooth(x, pts, closed = true, k = .5) {
  const n = pts.length; x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3, p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]);
  }
  if (closed) x.closePath();
}
function makePortrait() {
  const [c, x] = mk(600, 700); const R = rng(9);
  let g = x.createRadialGradient(290, 300, 30, 300, 360, 560); g.addColorStop(0, '#2d7657'); g.addColorStop(.5, '#164c38'); g.addColorStop(1, '#07211a');
  x.fillStyle = g; x.fillRect(0, 0, 600, 700);
  x.lineCap = 'round';
  for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${R() < .5 ? '70,150,108' : '6,40,28'},${R() * .18})`; x.lineWidth = 2 + R() * 10; x.beginPath(); const X = R() * 600, Y = R() * 700, a = R() * 6.28, l = 10 + R() * 44; x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke(); }
  // Klimt-like ornaments: gold spirals, dotted rings, small flowers
  const gold = 'rgba(232,190,92,.8)';
  for (const [cx, cy, r] of [[78, 96, 44], [528, 112, 36], [552, 380, 28], [58, 420, 26], [492, 268, 16], [118, 262, 14], [470, 470, 12]]) {
    spiral(x, cx, cy, r, gold, 2.6); x.strokeStyle = 'rgba(232,190,92,.55)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r + 8, 0, 7); x.stroke();
    for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28; x.fillStyle = gold; x.beginPath(); x.arc(cx + Math.cos(a) * (r + 17), cy + Math.sin(a) * (r + 17), 2.4, 0, 7); x.fill(); }
  }
  for (const [cx, cy, col] of [[180, 140, '#c8553d'], [450, 200, '#d7a23b'], [520, 560, '#c8553d'], [90, 560, '#d7a23b'], [210, 58, '#9b6bb0']]) {
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; x.fillStyle = col; x.beginPath(); x.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 6, 0, 7); x.fill(); }
    x.fillStyle = '#f2d27a'; x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.fill();
  }
  for (let i = 0; i < 180; i++) { const X = R() * 600, Y = R() * 520; if (Math.hypot(X - 320, Y - 300) < 175) continue; x.fillStyle = `rgba(240,200,100,${.2 + R() * .5})`; x.beginPath(); x.arc(X, Y, 1 + R() * 2.4, 0, 7); x.fill(); }
  // ---- body: bare back/shoulder, head turned back over the shoulder ----
  const skin = x.createLinearGradient(60, 0, 600, 0); skin.addColorStop(0, '#f2d4ba'); skin.addColorStop(.42, '#e0b391'); skin.addColorStop(1, '#9c6a52');
  x.beginPath(); smooth(x, [[10, 700], [40, 610], [110, 530], [196, 486], [262, 466], [292, 446], [300, 392], [372, 360], [380, 420], [430, 458], [520, 500], [585, 570], [610, 700]], false); x.lineTo(610, 700); x.closePath();
  x.fillStyle = skin; x.fill();
  let sg = x.createRadialGradient(470, 610, 10, 470, 610, 210); sg.addColorStop(0, 'rgba(110,60,40,.45)'); sg.addColorStop(1, 'rgba(110,60,40,0)'); x.fillStyle = sg; x.fillRect(0, 0, 600, 700);
  sg = x.createRadialGradient(170, 540, 10, 170, 540, 140); sg.addColorStop(0, 'rgba(255,242,228,.4)'); sg.addColorStop(1, 'rgba(255,242,228,0)'); x.fillStyle = sg; x.fillRect(0, 0, 600, 700);
  // neck shadow (right side) blended
  sg = x.createLinearGradient(300, 0, 390, 0); sg.addColorStop(0, 'rgba(120,70,48,0)'); sg.addColorStop(1, 'rgba(120,70,48,.5)');
  x.save(); x.beginPath(); smooth(x, [[292, 446], [300, 392], [372, 360], [380, 420], [330, 450]]); x.clip(); x.fillStyle = sg; x.fillRect(280, 340, 120, 130); x.restore();
  // shoulder-blade + spine hints
  x.strokeStyle = 'rgba(130,80,58,.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(430, 520); x.quadraticCurveTo(470, 560, 455, 640); x.stroke();
  // shawl with gold mosaic
  x.save(); x.beginPath(); x.moveTo(0, 650); x.bezierCurveTo(120, 604, 262, 636, 362, 612); x.bezierCurveTo(452, 592, 540, 604, 600, 560); x.lineTo(600, 700); x.lineTo(0, 700); x.closePath();
  const shg = x.createLinearGradient(0, 560, 0, 700); shg.addColorStop(0, '#22343a'); shg.addColorStop(1, '#0e1a1e'); x.fillStyle = shg; x.fill(); x.clip();
  for (let i = 0; i < 120; i++) { const X = R() * 600, Y = 560 + R() * 140; const r = R(); x.fillStyle = r < .45 ? 'rgba(232,190,92,.9)' : r < .75 ? 'rgba(196,82,58,.8)' : 'rgba(240,235,220,.8)'; if (R() < .5) { x.save(); x.translate(X, Y); x.rotate(R() * .5); x.fillRect(-5, -5, 8 + R() * 9, 8 + R() * 9); x.restore(); } else { x.beginPath(); x.arc(X, Y, 3 + R() * 5, 0, 7); x.fill(); } }
  x.strokeStyle = 'rgba(232,190,92,.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 650); x.bezierCurveTo(120, 604, 262, 636, 362, 612); x.bezierCurveTo(452, 592, 540, 604, 600, 560); x.stroke();
  x.restore();
  // ---- head (3/4 turned to the left) ----
  const face = [[250, 214], [236, 250], [234, 270], [230, 300], [236, 338], [250, 370], [270, 390], [300, 396], [348, 370], [368, 328], [404, 250], [372, 180], [318, 166]];
  const fg = x.createLinearGradient(228, 0, 400, 0); fg.addColorStop(0, '#f7dfc8'); fg.addColorStop(.5, '#ecc7a6'); fg.addColorStop(1, '#b98466');
  x.beginPath(); smooth(x, face); x.fillStyle = fg; x.fill();
  sg = x.createRadialGradient(340, 360, 5, 340, 360, 70); sg.addColorStop(0, 'rgba(130,78,55,.45)'); sg.addColorStop(1, 'rgba(130,78,55,0)'); x.fillStyle = sg; x.fillRect(260, 290, 160, 140);
  // ear + earring
  x.fillStyle = '#d6a084'; x.beginPath(); x.ellipse(366, 318, 12, 23, .18, 0, 7); x.fill(); x.strokeStyle = 'rgba(120,70,50,.6)'; x.lineWidth = 2; x.beginPath(); x.arc(366, 316, 8, -1.2, 1.6); x.stroke();
  // hair
  const hair = x.createLinearGradient(240, 150, 430, 360); hair.addColorStop(0, '#7a3d22'); hair.addColorStop(.6, '#43200f'); hair.addColorStop(1, '#22100a');
  x.fillStyle = hair; x.beginPath(); smooth(x, [[238, 238], [244, 196], [276, 164], [322, 150], [372, 158], [412, 190], [424, 244], [414, 296], [398, 336], [378, 356], [372, 300], [358, 262], [332, 236], [296, 222], [262, 226]]); x.fill();
  x.beginPath(); x.arc(410, 164, 54, 0, 7); x.fill();
  x.strokeStyle = 'rgba(232,160,100,.45)'; x.lineWidth = 2;
  for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(410, 164, 14 + k * 4.4, -1.4 + k * .22, 1.7 + k * .12); x.stroke(); }
  for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(250 + k * 16, 214 - k * 5); x.bezierCurveTo(300 + k * 12, 170 + k * 4, 360 + k * 8, 190 + k * 8, 396 + k * 3, 250 + k * 12); x.stroke(); }
  x.fillStyle = 'rgba(232,190,92,.9)'; for (let k = 0; k < 7; k++) { const a = -2.4 + k * .35; x.beginPath(); x.arc(410 + Math.cos(a) * 58, 164 + Math.sin(a) * 58, 4, 0, 7); x.fill(); }
  x.fillStyle = '#f3cf74'; x.shadowColor = '#ffd98a'; x.shadowBlur = 10; x.beginPath(); x.arc(368, 346, 4.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(368, 360, 5.5, 9, 0, 0, 7); x.fill(); x.shadowBlur = 0;
  // brows
  x.strokeStyle = '#4b2414'; x.lineWidth = 3.4;
  x.beginPath(); x.moveTo(276, 254); x.quadraticCurveTo(296, 244, 322, 252); x.stroke();
  x.lineWidth = 2.8; x.beginPath(); x.moveTo(240, 258); x.quadraticCurveTo(250, 252, 260, 256); x.stroke();
  // near eye
  x.fillStyle = '#fbf2e8'; x.beginPath(); x.moveTo(278, 280); x.quadraticCurveTo(298, 267, 320, 279); x.quadraticCurveTo(298, 289, 278, 280); x.fill();
  x.save(); x.beginPath(); x.moveTo(278, 280); x.quadraticCurveTo(298, 267, 320, 279); x.quadraticCurveTo(298, 289, 278, 280); x.clip();
  x.fillStyle = '#3b2416'; x.beginPath(); x.arc(293, 279, 8.5, 0, 7); x.fill(); x.fillStyle = '#120a06'; x.beginPath(); x.arc(293, 279, 4, 0, 7); x.fill(); x.restore();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(290, 276, 2.2, 0, 7); x.fill();
  x.strokeStyle = '#25120a'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(276, 280); x.quadraticCurveTo(298, 264, 322, 278); x.stroke();
  x.lineWidth = 1.6; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(300 + k * 6, 271 + k); x.lineTo(304 + k * 8, 264 + k); x.stroke(); }
  x.strokeStyle = 'rgba(140,80,60,.4)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(282, 286); x.quadraticCurveTo(300, 292, 318, 284); x.stroke();
  // far eye (foreshortened)
  x.fillStyle = '#f6ebe0'; x.beginPath(); x.moveTo(240, 281); x.quadraticCurveTo(250, 273, 262, 280); x.quadraticCurveTo(250, 286, 240, 281); x.fill();
  x.fillStyle = '#3b2416'; x.beginPath(); x.arc(250, 280, 5, 0, 7); x.fill();
  x.strokeStyle = '#25120a'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(239, 281); x.quadraticCurveTo(250, 271, 263, 279); x.stroke();
  // nose
  x.strokeStyle = 'rgba(120,66,46,.75)'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(268, 286); x.quadraticCurveTo(258, 312, 246, 328); x.quadraticCurveTo(252, 338, 266, 334); x.stroke();
  sg = x.createRadialGradient(270, 318, 2, 270, 318, 22); sg.addColorStop(0, 'rgba(140,80,58,.25)'); sg.addColorStop(1, 'rgba(140,80,58,0)'); x.fillStyle = sg; x.fillRect(240, 290, 60, 60);
  // lips
  x.fillStyle = '#b83440'; x.beginPath(); x.moveTo(252, 360); x.quadraticCurveTo(262, 351, 271, 355); x.quadraticCurveTo(282, 351, 292, 359); x.quadraticCurveTo(272, 366, 252, 360); x.fill();
  x.fillStyle = '#cf4b55'; x.beginPath(); x.moveTo(254, 361); x.quadraticCurveTo(272, 368, 290, 360); x.quadraticCurveTo(274, 378, 254, 361); x.fill();
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(274, 368, 7, 2.5, 0, 0, 7); x.fill();
  // blush
  sg = x.createRadialGradient(308, 318, 2, 308, 318, 40); sg.addColorStop(0, 'rgba(232,112,110,.38)'); sg.addColorStop(1, 'rgba(232,112,110,0)'); x.fillStyle = sg; x.fillRect(260, 270, 100, 100);
  // gold line-art accents
  x.strokeStyle = 'rgba(244,206,118,.85)'; x.lineWidth = 2.4;
  x.beginPath(); smooth(x, [[10, 700], [40, 610], [110, 530], [196, 486], [262, 466], [292, 446]], false); x.stroke();
  x.beginPath(); smooth(x, [[380, 420], [430, 458], [520, 500], [585, 570], [610, 700]], false); x.stroke();
  x.beginPath(); smooth(x, face.slice(0, 8), false); x.stroke();
  // canvas weave + varnish
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .05})`; x.fillRect(R() * 600, R() * 700, 2, 2); }
  const vg = x.createRadialGradient(300, 330, 200, 300, 350, 520); vg.addColorStop(0, 'rgba(40,20,0,0)'); vg.addColorStop(1, 'rgba(30,15,0,.35)'); x.fillStyle = vg; x.fillRect(0, 0, 600, 700);
  return c;
}
function makeGhost() {
  const [c, x] = mk(600, 700);
  x.strokeStyle = 'rgba(140,240,255,.95)'; x.lineWidth = 4; x.lineCap = 'round'; x.shadowColor = '#5fe3ff'; x.shadowBlur = 14;
  x.beginPath(); x.ellipse(300, 214, 184, 44, -.08, 0, 7); x.stroke();
  x.beginPath(); x.moveTo(214, 212); x.bezierCurveTo(212, 140, 250, 108, 312, 106); x.bezierCurveTo(372, 106, 396, 140, 392, 200); x.stroke();
  x.beginPath(); x.moveTo(222, 186); x.quadraticCurveTo(300, 170, 388, 180); x.stroke();
  x.beginPath(); x.moveTo(248, 392); x.bezierCurveTo(300, 418, 380, 420, 420, 396); x.stroke();
  x.beginPath(); x.moveTo(256, 404); x.bezierCurveTo(268, 470, 300, 520, 330, 560); x.stroke();
  x.beginPath(); x.moveTo(402, 410); x.bezierCurveTo(430, 470, 440, 520, 430, 590); x.stroke();
  x.globalAlpha = .5; x.beginPath(); x.ellipse(306, 300, 84, 104, -.05, 0, 7); x.stroke();
  x.beginPath(); x.moveTo(262, 280); x.lineTo(296, 280); x.moveTo(320, 282); x.lineTo(352, 282); x.moveTo(286, 340); x.quadraticCurveTo(306, 350, 326, 340); x.stroke();
  return c;
}
function makeBoard() {
  const [c, x] = mk(1080, 1920);
  x.fillStyle = '#121316'; x.fillRect(0, 0, 1080, 1920);
  const R = rng(31);
  for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(255,255,255,${R() * .025})`; x.fillRect(R() * 1080, R() * 1920, 2, 2); }
  x.filter = 'blur(6px)';
  for (let i = 0; i < 9; i++) { const X = R() * 1000, Y = 300 + R() * 1400, w = 160 + R() * 160, h = 120 + R() * 200; x.save(); x.translate(X, Y); x.rotate((R() - .5) * .3); x.fillStyle = `rgba(${200 + R() * 30},${190 + R() * 30},${160 + R() * 30},.16)`; x.fillRect(0, 0, w, h); x.restore(); }
  x.filter = 'none';
  return c;
}
function makeCrate(w, h, seed) {
  const [c, x] = mk(w, h); const R = rng(seed);
  x.fillStyle = '#6b5136'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 34) { x.fillStyle = `hsl(28,${28 + R() * 10}%,${26 + R() * 8}%)`; x.fillRect(0, y, w, 31); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y + 31, w, 3); }
  x.strokeStyle = '#3d2b1a'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
  x.beginPath(); x.moveTo(14, 14); x.lineTo(w - 14, h - 14); x.stroke();
  x.font = '600 28px "Special Elite"'; x.fillStyle = 'rgba(20,10,5,.55)'; x.fillText('FRAGILE', 30, h / 2 + 10);
  return c;
}

// ---------- composite pieces ----------
function wallBG(ctx, warm = 1) { ctx.drawImage(T.bricks, WALL_OX, WALL_OY); }
function drawBag(ctx, x, y, w, h, open = 0, t = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#060607'; ctx.beginPath();
  ctx.moveTo(-w * .5, h * .5); ctx.bezierCurveTo(-w * .62, h * .1, -w * .55, -h * .35, -w * .3, -h * .45 + open * h * .25);
  ctx.bezierCurveTo(-w * .1, -h * .62 + open * h * .3, w * .15, -h * .4 + open * h * .3, w * .32, -h * .5 + open * h * .2);
  ctx.bezierCurveTo(w * .55, -h * .3, w * .6, h * .15, w * .5, h * .5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const hl = [[-w * .38, -h * .1, -w * .22, -h * .32], [-w * .1, -h * .2, w * .05, -h * .05], [w * .2, -h * .25, w * .35, -h * .05], [-w * .3, h * .25, -w * .15, h * .1], [w * .1, h * .2, w * .3, h * .3]];
  hl.forEach(([a, b, c2, d], i) => { ctx.globalAlpha = .4 + .4 * Math.sin(t * 2 + i); ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c2) / 2 + 10, (b + d) / 2 - 14, c2, d); ctx.stroke(); });
  ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = hash(i * 7) * w - w / 2, b = hash(i * 9) * h - h / 2; ctx.beginPath(); ctx.moveTo(a * .8, b * .8); ctx.lineTo(a * .8 + 20, b * .8 + 10); ctx.lineTo(a * .8 + 34, b * .8 - 6); ctx.stroke(); }
  ctx.restore();
}
function canvasPiece(ctx, x, y, s, rot, crop = null, edge = true) {
  // unframed canvas on stretcher, centered at x,y; s = scale of 600x700 texture
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  if (edge) { ctx.fillStyle = '#6a5236'; ctx.fillRect(-309, -359, 618, 718); ctx.shadowColor = 'transparent'; ctx.fillStyle = '#cbbd9e'; ctx.fillRect(-304, -354, 608, 708); }
  ctx.shadowColor = 'transparent';
  if (crop) ctx.drawImage(T.portrait, crop[0], crop[1], crop[2], crop[3], -300 + crop[0], -350 + crop[1], crop[2], crop[3]);
  else ctx.drawImage(T.portrait, -300, -350);
  ctx.restore();
}
// hatch at world coords; open 0..1; inside(ctx, L, T0, s)
function drawHatch(ctx, open, inside, o = {}) {
  const { x, y, s } = HATCH, L0 = x - s / 2, T0 = y - s / 2, d = 40;
  ctx.save();
  ctx.fillStyle = '#020202'; ctx.fillRect(L0, T0, s, s);
  poly(ctx, [[L0, T0], [L0 + s, T0], [L0 + s - d, T0 + d], [L0 + d, T0 + d]], '#1d1814');
  poly(ctx, [[L0, T0], [L0 + d, T0 + d], [L0 + d, T0 + s - d], [L0, T0 + s]], '#120e0b');
  poly(ctx, [[L0 + s, T0], [L0 + s, T0 + s], [L0 + s - d, T0 + s - d], [L0 + s - d, T0 + d]], '#0c0a08');
  poly(ctx, [[L0, T0 + s], [L0 + d, T0 + s - d], [L0 + s - d, T0 + s - d], [L0 + s, T0 + s]], '#241d18');
  ctx.fillStyle = '#060505'; ctx.fillRect(L0 + d, T0 + d, s - 2 * d, s - 2 * d);
  if (inside && open > 0) { ctx.save(); ctx.beginPath(); ctx.rect(L0, T0, s, s); ctx.clip(); inside(ctx, L0, T0, s); ctx.restore(); }
  // flange
  ctx.strokeStyle = '#3c4044'; ctx.lineWidth = 14; ctx.strokeRect(L0 - 7, T0 - 7, s + 14, s + 14);
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.strokeRect(L0 - 13, T0 - 13, s + 26, s + 26);
  // door
  const a = clamp(open) * 1.38, w = s * Math.cos(a), pe = Math.sin(a) * .16;
  const q = (u, v) => [L0 + u * w, T0 + v * s + (v - .5) * 2 * s * pe * u];
  // door shadow on wall
  if (open > 0) { ctx.save(); ctx.globalAlpha = .45 * Math.sin(a); ctx.fillStyle = '#000'; ctx.filter = 'blur(12px)'; poly(ctx, [[L0, T0], [L0 - s * .35 * Math.sin(a), T0 + 20], [L0 - s * .35 * Math.sin(a), T0 + s + 30], [L0, T0 + s]], '#000'); ctx.restore(); }
  const shade = 1 - Math.sin(a) * .55;
  const g = ctx.createLinearGradient(L0, T0, L0 + Math.max(4, w), T0 + s);
  g.addColorStop(0, `rgb(${Math.round(118 * shade)},${Math.round(122 * shade)},${Math.round(126 * shade)})`); g.addColorStop(1, `rgb(${Math.round(70 * shade)},${Math.round(74 * shade)},${Math.round(78 * shade)})`);
  poly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], g);
  // panel inset + brushed lines + rust
  ctx.strokeStyle = `rgba(0,0,0,${.35})`; ctx.lineWidth = 3; poly(ctx, [q(.1, .1), q(.9, .1), q(.9, .9), q(.1, .9)]); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${.12 * shade})`; ctx.lineWidth = 2; poly(ctx, [q(.11, .11), q(.89, .11), q(.89, .89), q(.11, .89)]); ctx.stroke();
  for (let i = 0; i < 9; i++) { const [rx, ry] = q(.2 + hash(i * 3) * .6, .2 + hash(i * 5) * .6); const rr = 6 + hash(i) * 16; const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * Math.max(.2, w / s)); rg.addColorStop(0, 'rgba(120,60,25,.45)'); rg.addColorStop(1, 'rgba(120,60,25,0)'); ctx.fillStyle = rg; ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2); }
  for (const [u, v] of [[.05, .05], [.95, .05], [.95, .95], [.05, .95]]) { const [rx, ry] = q(u, v); ctx.fillStyle = '#2a2c2f'; ctx.beginPath(); ctx.ellipse(rx, ry, 6 * Math.max(.25, w / s), 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(rx - 1.5, ry - 1.5, 1.6, 0, 7); ctx.fill(); }
  { const [hx, hy] = q(.9, .5); ctx.fillStyle = '#222427'; ctx.fillRect(hx - 8 * Math.max(.3, w / s), hy - 26, 12 * Math.max(.3, w / s), 52); }
  // hinges
  ctx.fillStyle = '#2e3134'; ctx.fillRect(L0 - 12, T0 + 30, 18, 46); ctx.fillRect(L0 - 12, T0 + s - 76, 18, 46);
  if (o.dust) motes(ctx, o.t || 0, { n: 30, color: '#d8d0c0', a: .5 * o.dust, area: [L0 - 60, T0 - 40, s + 120, s + 120], size: 3.5, speed: 60, seed: 4 });
  ctx.restore();
}

// ---------- scenes ----------
function ivyWallScene(ctx, t, o) {
  // o: {zoom, cx, cy, open, inside, leafOpts, light}
  const dr = drift(t, .7, 3);
  ctx.save();
  camera(ctx, { x: o.cx + dr.x, y: o.cy + dr.y, zoom: o.zoom, rot: dr.r + (o.rot || 0), shake: o.shake || 0, t });
  wallBG(ctx);
  // key light: top-left cold + hatch warm
  const lg = ctx.createRadialGradient(300, 300, 50, 400, 600, 1300); lg.addColorStop(0, 'rgba(120,150,200,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = lg; ctx.fillRect(-600, -700, 2400, 3400);
  drawHatch(ctx, o.open || 0, o.inside, { dust: o.dust, t });
  drawLeaves(ctx, t, o.leafOpts || {});
  // low-key falloff: focus on the hatch
  darkness(ctx, HATCH.x, HATCH.y, o.falloff || 760, o.dark != null ? o.dark : .78, .25);
  if (o.light > 0) {
    glow(ctx, HATCH.x, HATCH.y, 520, K.gold, .55 * o.light);
    godrays(ctx, HATCH.x, HATCH.y, Math.PI / 2 + .2, 2.6, 900, '#ffd27a', .07 * o.light, t, 9);
    motes(ctx, t, { n: 50, color: '#ffd98a', a: .7 * o.light, area: [HATCH.x - 380, HATCH.y - 380, 760, 760], size: 3, speed: 25, seed: 8 });
  }
  if (o.after) o.after(ctx, t);
  ctx.restore();
}

// local time of a narration word inside this scene; falls back to a fraction of the voice span
function at(info, w, frac = 0) {
  const x = w ? info.sc.words.find(o => o.w.includes(w)) : null;
  if (x) return x.t - info.sc.t0;
  const v0 = info.sc.voice_t - info.sc.t0, v1 = info.sc.voice_end - info.sc.t0;
  return v0 + (v1 - v0) * frac;
}
function chip(ctx, s, x, y, a = 1, o = {}) { label(ctx, s, x, y, Object.assign({ size: 34, color: '#e9edf3', bg: 'rgba(8,10,14,.82)', border: 'rgba(255,255,255,.28)', a }, o)); }
function dateFlap(ctx, s, t, t0, y = 540, size = 92) {
  const a = P(t, t0, t0 + .15) * (1 - P(t, t0 + 1.6, t0 + 1.9)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; flap(ctx, s, 540, y, t, t0, { size, roll: .25, lock: .04 }); ctx.restore();
}
function mapView(ctx, t, { year, tIt, tDive, label: lab = '피아첸차' }) {
  gradBG(ctx, [[0, '#06080d'], [1, '#0b0f17']]);
  const z = 1 + E.inExpo(P(t, tDive - .15, tDive + .25)) * 7;
  const mp = project(); const [pxp, pyp] = mp(9.69, 45.05);
  ctx.save(); ctx.translate(pxp, pyp); ctx.scale(z, z); ctx.translate(-pxp, -pyp);
  const mpP = P(t, .15, tIt + .2, E.inOutQ);
  if (mpP > 0) {
    ctx.save(); ctx.globalAlpha = clamp(mpP * 3);
    ITALY.forEach((ring, i) => {
      const pts = ring.map(([lo, la]) => mp(lo, la));
      ctx.save(); ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = `rgba(217,169,58,${.08 * mpP})`; ctx.fill(); ctx.restore();
      pathReveal(ctx, pts, mpP, { color: K.gold, w: 3.5, glowC: 'rgba(255,200,90,.7)', head: i === 0 });
    });
    ctx.restore();
    const pp = P(t, tIt - .1, tIt + .2);
    for (const [nm, lo, la, dx, dy] of [['Milano', 9.19, 45.46, -70, -4], ['Parma', 10.33, 44.80, 92, 56]]) { const [x, y] = mp(lo, la); ctx.save(); ctx.globalAlpha = pp * .9; ctx.fillStyle = '#cfd6e2'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.restore(); text(ctx, nm, x + dx, y - 26 + dy, { size: 40, color: '#dfe6f0', weight: 800, alpha: pp, stroke: '#000', strokeW: 6 }); }
    marker(ctx, pxp, pyp, t, pp, K.red);
    tag(ctx, lab, pxp, pyp, P(t, tIt, tIt + .35), { size: 42, dx: -40, dy: 120 });
  }
  ctx.restore();
  const fa = 1 - P(t, .7, .95);
  if (fa > 0) { ctx.save(); ctx.globalAlpha = fa; flap(ctx, year, 540, 820, t, -.05, { size: 150, roll: .25, lock: .05 }); ctx.restore(); }
}
function oldPhoto(ctx, x, y, w, rot, a = 1) {
  if (a <= 0) return; const h = w * 1.22;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
  const iw = w - 28, ih = h - 70; ctx.drawImage(T.oldphoto, -iw / 2, -h / 2 + 14, iw, ih);
  text(ctx, '사라진 클림트 작품', 0, h / 2 - 28, { size: Math.round(w * .085), weight: 800, color: '#3a2c18' });
  ctx.restore();
}
function makeOldPhoto() {
  const [c, x] = mk(600, 700);
  x.filter = 'grayscale(1) sepia(.55) contrast(1.15) brightness(.95)'; x.drawImage(T.portrait, 0, 0); x.filter = 'none';
  x.fillStyle = '#1b1712';
  x.beginPath(); x.ellipse(300, 214, 190, 46, -.08, 0, 7); x.fill(); // hat brim
  x.beginPath(); x.moveTo(212, 212); x.bezierCurveTo(210, 136, 252, 100, 314, 98); x.bezierCurveTo(376, 98, 400, 136, 396, 202); x.closePath(); x.fill();
  x.fillStyle = 'rgba(40,34,28,.92)'; x.beginPath(); x.moveTo(246, 392); x.bezierCurveTo(300, 424, 384, 426, 424, 396); x.bezierCurveTo(446, 470, 440, 540, 426, 600); x.bezierCurveTo(380, 560, 300, 540, 250, 470); x.closePath(); x.fill();
  const R = rng(4); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,250,235' : '30,20,10'},${R() * .08})`; x.fillRect(R() * 600, R() * 700, 2, 2); }
  const v = x.createRadialGradient(300, 350, 150, 300, 350, 480); v.addColorStop(0, 'rgba(60,40,10,0)'); v.addColorStop(1, 'rgba(60,40,10,.55)'); x.fillStyle = v; x.fillRect(0, 0, 600, 700);
  return c;
}
function lightbox(ctx) {
  gradBG(ctx, [[0, '#0b1424'], [1, '#05080f']]);
  ctx.save(); ctx.shadowColor = 'rgba(180,220,255,.6)'; ctx.shadowBlur = 80; ctx.fillStyle = '#dfeaf5'; ctx.fillRect(190, 470, 700, 760); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; for (let x = 190; x <= 890; x += 70) { ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, 1230); ctx.stroke(); }
}
function scanGhost(ctx, sp, PS = .9, PY = 850, alpha = .9) {
  const top = PY - 350 * PS, bot = PY + 350 * PS, sy = lerp(top, bot, sp);
  ctx.save(); ctx.beginPath(); ctx.rect(540 - 300 * PS, top, 600 * PS, sy - top); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.drawImage(T.ghost, 540 - 300 * PS, top, 600 * PS, 700 * PS); ctx.restore();
  if (sp > 0 && sp < 1) { const g = ctx.createLinearGradient(0, sy - 40, 0, sy + 6); g.addColorStop(0, 'rgba(95,227,255,0)'); g.addColorStop(1, 'rgba(95,227,255,.85)'); ctx.fillStyle = g; ctx.fillRect(220, sy - 40, 640, 46); ctx.fillStyle = '#e8fbff'; ctx.fillRect(220, sy, 640, 4); }
}
function canvasBack(ctx, x, y, s, t, chk) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.fillStyle = '#cdbf9f'; ctx.fillRect(-304, -354, 608, 708); ctx.shadowColor = 'transparent';
  const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .35; ctx.fillStyle = pg; ctx.fillRect(-304, -354, 608, 708); ctx.globalAlpha = 1;
  ctx.fillStyle = '#7a5a36'; for (const [rx, ry, rw, rh] of [[-304, -354, 608, 46], [-304, 308, 608, 46], [-304, -354, 46, 708], [258, -354, 46, 708], [-23, -354, 46, 708]]) ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = 'rgba(40,25,10,.4)'; ctx.lineWidth = 2; for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.moveTo(-300, -330 + i * 23); ctx.lineTo(300, -332 + i * 23); ctx.stroke(); }
  const labels = [[-170, -200, 170, 90, '#efe6cf'], [130, -120, 150, 70, '#e7dcc0'], [-150, 140, 200, 80, '#f1e9d6']];
  labels.forEach(([lx, ly, lw, lh, col]) => { ctx.fillStyle = col; ctx.fillRect(lx - lw / 2, ly - lh / 2, lw, lh); ctx.strokeStyle = 'rgba(60,40,10,.4)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(lx - lw / 2 + 12, ly - lh / 2 + 20 + k * 18); ctx.lineTo(lx + lw / 2 - 12 - hash(k + lx) * 40, ly - lh / 2 + 20 + k * 18); ctx.stroke(); } });
  const seals = [[150, 60], [-60, -40], [140, 230]];
  seals.forEach(([sx, sy], i) => {
    const rg = ctx.createRadialGradient(sx - 8, sy - 8, 4, sx, sy, 40); rg.addColorStop(0, '#e2424a'); rg.addColorStop(1, '#7a0e14');
    ctx.fillStyle = rg; ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, r = 36 + (k % 2) * 5; k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,200,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 20, 0, 7); ctx.stroke();
    const c = P(t, chk + i * .18, chk + i * .18 + .15);
    if (c > 0) { glow(ctx, sx, sy, 90, '#7dffb0', .5 * c); ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - 22, sy); ctx.lineTo(sx - 22 + 14 * Math.min(1, c * 2), sy + 14 * Math.min(1, c * 2)); if (c > .5) ctx.lineTo(sx - 8 + 30 * (c - .5) * 2, sy + 14 - 34 * (c - .5) * 2); ctx.stroke(); }
  });
  ctx.restore();
}
function desk(ctx) {
  gradBG(ctx, [[0, '#1b130d'], [1, '#0a0705']]);
  ctx.save(); ctx.strokeStyle = 'rgba(255,220,180,.05)'; ctx.lineWidth = 3; for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.moveTo(0, i * 70 + hash(i) * 30); ctx.bezierCurveTo(300, i * 70 + 20, 700, i * 70 - 20, 1080, i * 70 + hash(i + 1) * 30); ctx.stroke(); } ctx.restore();
}
function lamp(ctx, x, y, r = 900, a = .32) { const pg = ctx.createRadialGradient(x, y, 40, x, y, r); pg.addColorStop(0, `rgba(255,214,150,${a})`); pg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H); }
function magnifier(ctx, x, y, r, drawInside) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.translate(x, y); ctx.scale(1.8, 1.8); ctx.translate(-x, -y); drawInside(ctx); ctx.restore();
  ctx.save(); ctx.strokeStyle = '#2b2f33'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r - 10, 3.6, 4.6); ctx.stroke();
  ctx.lineCap = 'round'; ctx.strokeStyle = '#15171a'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(x + r * .72, y + r * .72); ctx.lineTo(x + r * 1.6, y + r * 1.6); ctx.stroke(); ctx.restore();
}
function idCard(ctx, x, y, s, n) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; ctx.fillStyle = '#ece6d8'; ctx.fillRect(-120, -150, 240, 300); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#9aa1a8'; ctx.fillRect(-90, -125, 180, 170);
  ctx.fillStyle = '#4b525a'; ctx.beginPath(); ctx.arc(0, -70, 42, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 30, 74, 52, 0, Math.PI, 0); ctx.fill();
  text(ctx, '?', 0, -70, { size: 54, family: FONT.disp, weight: 400, color: 'rgba(255,255,255,.7)' });
  text(ctx, n === '' ? '관리인' : `관계자 ${n}`, 0, 82, { size: 30, weight: 800, color: '#333' });
  L.hline(ctx, -90, 118, 180, 'rgba(60,40,10,.35)', 3);
  ctx.restore();
}
function newspaper(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillStyle = '#e4dfd2'; ctx.fillRect(-360, -480, 720, 960); ctx.shadowColor = 'transparent';
  const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .3; ctx.fillStyle = pg; ctx.fillRect(-360, -480, 720, 960); ctx.globalAlpha = 1;
  text(ctx, '지역 일간지 · 피아첸차', 0, -420, { size: 52, family: FONT.serif, weight: 900, color: '#1d1d1d' });
  L.hline(ctx, -330, -380, 660, '#222', 4); text(ctx, '2020 · 01', 0, -356, { size: 24, family: FONT.type, weight: 400, color: '#333' }); L.hline(ctx, -330, -334, 660, '#222', 2);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-330, -300, 660, 34); ctx.fillRect(-330, -252, 480, 34);
  ctx.fillStyle = '#b9b3a6'; ctx.fillRect(-330, -190, 300, 240);
  ctx.save(); ctx.globalAlpha = .9; ctx.filter = 'grayscale(1) contrast(1.2)'; ctx.drawImage(T.portrait, -320, -182, 280, 224); ctx.restore();
  for (let i = 0; i < 22; i++) { ctx.fillStyle = 'rgba(40,40,40,.35)'; const col = i < 11 ? 0 : 1; ctx.fillRect(col ? -330 : 0, (col ? 70 : -190) + (i % 11) * 28, col ? 300 : 330 - hash(i) * 60, 10); }
  ctx.restore();
}
function dnaHelix(ctx, x, y, h, t, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const k = i / 25, yy = y - h / 2 + k * h, ph = t * 2.6 + k * 9;
    const x1 = x + Math.sin(ph) * 90, x2 = x - Math.sin(ph) * 90, z = Math.cos(ph);
    ctx.strokeStyle = `rgba(160,140,255,${.35 + .25 * Math.abs(z)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
    for (const [xx, zz] of [[x1, z], [x2, -z]]) { ctx.fillStyle = zz > 0 ? '#c7b8ff' : '#6f5fd6'; ctx.beginPath(); ctx.arc(xx, yy, 9 + 3 * zz, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

const scenes = {
  hook(ctx, t, d, info) {
    const tOpen = at(info, '나왔다', .85) - .2;
    const op = E.outBack(P(t, tOpen, tOpen + .45), 1.2);
    const beat = (tt) => .045 * Math.exp(-Math.pow((t - tt) * 7, 2)) * (t > tt - .05 ? 1 : 0);
    const tM = at(info, '명화가', .2), tW = at(info, '벽', .62);
    const zoom = lerp(1.0, 1.3, E.inOutQ(P(t, 0, d))) + beat(tM) + beat(tW) * 1.4;
    const seep = (1 - P(t, tOpen, tOpen + .2)) * (.45 + .2 * Math.sin(t * 7) + 2.2 * (beat(tM) + beat(tW)) / .045 * .25);
    ivyWallScene(ctx, t, {
      cx: 540, cy: 805, zoom, shake: .9 * Math.exp(-t * 4) + .25 * P(t, tOpen, tOpen + .2) * Math.exp(-(t - tOpen) * 3),
      open: op, light: P(t, tOpen, tOpen + .5, E.outQ), dust: P(t, tOpen, tOpen + .3) * (1 - P(t, tOpen + 1, tOpen + 2)),
      inside(c, L0, T0, s) { const k = P(t, tOpen, tOpen + .6, E.outQ); glow(c, L0 + s / 2, T0 + s / 2, s * .9, K.gold, .9 * k); drawBag(c, L0 + s * .5, T0 + s * .74, s * .9, s * .5, 0, t); },
      after(c) {
        if (seep > 0) {
          const { x: hx, y: hy, s: hs } = HATCH;
          c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba('#ffcf6a', clamp(seep) * .8); c.lineWidth = 3; c.shadowColor = '#ffb93a'; c.shadowBlur = 44;
          c.strokeRect(hx - hs / 2 + 2, hy - hs / 2 + 2, hs - 4, hs - 4); c.restore();
          glow(c, hx, hy + hs / 2, 260, '#ffb93a', .22 * seep);
          motes(c, t, { n: 24, color: '#ffd98a', a: .55 * seep, area: [hx - 200, hy - 200, 400, 420], size: 2.6, speed: 18, seed: 21 });
        }
        const k = P(t, tOpen + .2, tOpen + .9, E.outC);
        if (k > 0) {
          const cx = lerp(HATCH.x + 10, HATCH.x + 60, k), cy = lerp(HATCH.y + 40, HATCH.y + 120, k), sc = lerp(.22, .46, k);
          c.save(); c.globalAlpha = clamp(k * 3); canvasPiece(c, cx, cy, sc, lerp(.18, -.1, k)); drawBag(c, cx - 10, cy + 700 * sc * .36, 660 * sc, 330 * sc, 0, t); c.restore();
        }
        brackets(c, HATCH.x - HATCH.s / 2 - 30, HATCH.y - HATCH.s / 2 - 30, HATCH.s + 60, HATCH.s + 60, P(t, tOpen + .7, tOpen + 1.0));
      },
    });
    chip(ctx, '2019.12 · 이탈리아 피아첸차', 540, 1180, P(t, tOpen + .9, tOpen + 1.2));
  },

  culprit(ctx, t, d, info) {
    const swing = .13 * Math.sin(t * 2.4 + .6);
    const bx = 540 + Math.sin(swing) * 330, by = 120 + Math.cos(swing) * 330;
    ctx.drawImage(T.board, 0, 0); lamp(ctx, bx, by + 520, 900, .3);
    const tSnap = at(info, '않았다', .8);
    ctx.save(); ctx.translate(250, 600); ctx.rotate(-.08);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 10; ctx.fillStyle = '#ece6d8'; ctx.fillRect(-120, -140, 240, 270); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#16231d'; ctx.fillRect(-100, -120, 200, 190); ctx.drawImage(T.frame, -70, -96, 140, 158);
    text(ctx, '1997', 0, 100, { size: 30, family: FONT.type, color: '#333', weight: 400 }); ctx.restore(); pin(ctx, 250, 470);
    const rock = .05 * Math.sin(t * 3.2) * Math.exp(-t * .4) + (t > tSnap ? .09 * Math.sin((t - tSnap) * 9) * Math.exp(-(t - tSnap) * 2.5) : 0);
    ctx.save(); ctx.translate(640, 690); ctx.rotate(rock); ctx.translate(0, 170);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; ctx.fillStyle = '#efe9db'; ctx.fillRect(-200, -150, 400, 300); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200,60,60,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-200, -100); ctx.lineTo(200, -100); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,120,170,.25)'; ctx.lineWidth = 1.5; for (let y = -70; y < 150; y += 36) { ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(200, y); ctx.stroke(); }
    text(ctx, 'SUSPECT', -180, -125, { size: 30, family: FONT.type, color: '#444', align: 'left', weight: 400 });
    text(ctx, '?', 0, 30, { size: 200, family: FONT.disp, color: 'rgba(40,40,40,.14)', weight: 400 }); ctx.restore(); pin(ctx, 640, 690);
    if (t < tSnap) stringLine(ctx, 250, 470, 640, 690, P(t, .05, .4, E.outQ), K.red, lerp(40, 4, P(t, .4, tSnap)));
    else {
      const f = clamp((t - tSnap) / .7), mx = lerp(250, 640, .52), my = lerp(470, 690, .52);
      ctx.save(); ctx.strokeStyle = K.red; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(250, 470); ctx.quadraticCurveTo(lerp(mx, 300, f), lerp(my, 700, f), lerp(mx - 10, 260, f), lerp(my, 470 + 420 * E.outQ(f), f)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640, 690); ctx.quadraticCurveTo(lerp(mx, 620, f), lerp(my, 900, f), lerp(mx + 10, 650, f), lerp(my, 690 + 380 * E.outQ(f), f)); ctx.stroke(); ctx.restore();
      if (f < .3) glow(ctx, mx, my, 120, '#ff6a50', (1 - f / .3) * .8);
    }
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(540, -10); ctx.lineTo(bx, by - 30); ctx.stroke();
    ctx.translate(bx, by); ctx.rotate(-swing); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-16, -44, 32, 30);
    const bg2 = ctx.createRadialGradient(0, 8, 2, 0, 8, 30); bg2.addColorStop(0, '#fff7e0'); bg2.addColorStop(1, '#ffb347'); ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(0, 10, 24, 30, 0, 0, 7); ctx.fill(); ctx.restore();
    glow(ctx, bx, by + 10, 260, '#ffcf80', .55 * L.flicker(t, .08, 2));
    const s1 = '범인 : ', tp = P(t, .15, .5); const all = typeSub(s1 + '???', tp);
    const w1 = measure(ctx, s1, 120, FONT.disp, 400), w2 = measure(ctx, '???', 120, FONT.disp, 400); const x0 = 540 - (w1 + w2) / 2;
    text(ctx, all.slice(0, s1.length), x0, 1160, { size: 120, family: FONT.disp, weight: 400, color: '#f4f1ea', align: 'left', stroke: '#000', strokeW: 10 });
    if (all.length > s1.length) glitchText(ctx, all.slice(s1.length), x0 + w1, 1160, t > tSnap ? .6 + .6 * hash(Math.floor(t * 24)) : .3, t, { size: 120, family: FONT.disp, weight: 400, color: K.red, align: 'left', stroke: '#000', strokeW: 10 });
    darkness(ctx, bx, by + 400, 1100, .75, .3); vignette(ctx, .5 + .3 * Math.exp(-Math.pow((t - tSnap) * 6, 2)));
  },

  y1996(ctx, t, d, info) {
    const tS = at(info, '여고생이', .2), tO = at(info, '사라진', .5), tF = at(info, '초상화를', .75);
    const tDive = tS - .3;
    if (t < tDive + .25) { mapView(ctx, t, { year: '1996', tIt: .55, tDive, label: '피아첸차 · 리치오디 미술관' }); L.scanlines(ctx, .05); return; }
    const k = P(t, tDive + .25, tDive + .55, E.outQ);
    ctx.save(); const dr = drift(t, .5, 7); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1.18, 1.04, E.outC(P(t, tDive + .25, d))), t });
    galleryInterior(ctx, t, { gone: 0, calm: true, noTag: true });
    F.figure(ctx, 250, 1560, 640, { female: true, hair: 'long', fill: '#05070a', rim: '#9cc3ff', rimX: 5, armL: [.05, -.1], armR: [-.4, -1.5], shadow: true });
    ctx.restore();
    // the old reproduction of the lost Klimt, then face-matching lines
    const op = P(t, tO - .05, tO + .3, E.outBack);
    const ox = 830, oy = 610;
    oldPhoto(ctx, ox, lerp(oy + 60, oy, op), 230, .07, clamp(op * 2));
    const mt = P(t, tF - .1, tF + .35, E.inOutQ);
    if (mt > 0) {
      const fx = 540, fy = 690, gx = ox - 6, gy = oy - 60;
      for (const [a1, b1] of [[fx, fy], [fx + 10, fy - 30]]) { ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; ctx.shadowColor = K.gold; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(lerp(a1, gx, mt), lerp(b1, gy + (b1 - fy) * .5, mt)); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 5; ctx.globalAlpha = mt; ctx.beginPath(); ctx.arc(fx, fy - 10, 48, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(gx, gy, 34, 0, 7); ctx.stroke(); ctx.restore();
      label(ctx, '같은 얼굴', 700, 1010, { size: 40, color: '#111', bg: K.goldHi, a: P(t, tF + .2, tF + .45) });
    }
    chip(ctx, '1996 · 고교생 클라우디아 마가', 330, 1150, P(t, tS, tS + .3));
    flash(ctx, (1 - k) * .5, '#cfe0ff');
  },

  xray(ctx, t, d, info) {
    const tM = at(info, '모자', .3), tD = at(info, '캔버스에', .75);
    lightbox(ctx);
    canvasPiece(ctx, 540, 850, .9, 0);
    scanGhost(ctx, P(t, .1, tM + .1, E.inOutQ));
    const hl = P(t, tM, tM + .3) * (1 - P(t, tD - .1, tD + .2));
    if (hl > 0) { glow(ctx, 540, 590, 320, K.cyan, .35 * hl * (0.7 + .3 * Math.sin(t * 9))); chip(ctx, 'X선·적외선 · 모자와 스카프를 두른 같은 여인', 540, 1180, hl, { color: K.cyan, border: K.cyan }); }
    label(ctx, 'X-RAY · 1996', 330, 520, { size: 30, family: FONT.type, weight: 400, color: K.cyan, bg: 'rgba(0,20,30,.8)', border: K.cyan, a: P(t, 0, .2) });
    const dp = P(t, tD - .05, tD + .3, E.outBack);
    if (dp > 0) {
      ctx.save(); ctx.translate(540, 1150); ctx.scale(dp, dp);
      ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -370, -70, 740, 140, 20); ctx.fill(); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = K.cyan; ctx.lineWidth = 5; ctx.strokeRect(-335, -40, 52, 66); ctx.strokeStyle = K.goldHi; ctx.strokeRect(-315, -26, 52, 66);
      text(ctx, '한 캔버스에 두 점의 클림트', 45, 2, { size: 46, family: FONT.disp, weight: 400, color: K.goldHi });
      ctx.restore();
    }
  },

  vanish(ctx, t, d, info) {
    const tE = at(info, '특별전을', .15), tY = at(info, '1997년', .45), tGo = at(info, '사라졌다', .9);
    ctx.save(); const dr = drift(t, .5, 9); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1.0, 1.1, P(t, 0, d)), t });
    galleryInterior(ctx, t, { gone: tGo + .1, banner: P(t, tE - .1, tE + .3) });
    ctx.restore();
    dateFlap(ctx, '1997.02', t, tY - .1, 540, 96);
    if (t > tGo + .1 && t < tGo + .4) flash(ctx, .15 * (1 - (t - tGo - .1) / .3), '#cfe0ff');
  },

  roof(ctx, t, d, info) {
    const tE = at(info, '지붕', .12), tS = at(info, '창으로', .4), tF = at(info, '액자가', .75), tX = at(info, '컸다', .92);
    ctx.save(); camera(ctx, { x: 540, y: 960, zoom: 1.02, rot: -E.inOutQ(P(t, 0, d)) * .085, t });
    gradBG(ctx, [[0, '#59626c'], [.45, '#3a424b'], [1, '#1d2228']]);
    fogLayer(ctx, t, 520, 400, '#b9c3cf', .14, 2, 25);
    poly(ctx, [[-200, 980], [80, 980], [80, 900], [180, 860], [280, 900], [280, 960], [600, 960], [600, 920], [760, 920], [760, 880], [880, 840], [1000, 880], [1000, 960], [1300, 960], [1300, 1200], [-200, 1200]], '#2a3038');
    const roofG = ctx.createLinearGradient(0, 1000, 0, 1500); roofG.addColorStop(0, '#4a4f55'); roofG.addColorStop(1, '#23272c');
    poly(ctx, [[-200, 1060], [1300, 1020], [1300, 1600], [-200, 1600]], roofG);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-200, 1100 + i * 55); ctx.lineTo(1300, 1060 + i * 57); ctx.stroke(); }
    ctx.fillStyle = '#16191d'; ctx.fillRect(-200, 1590, 1500, 400);
    const sx = 300, sw = 220, sy = 1040;
    poly(ctx, [[sx - sw / 2, sy + 20], [sx + sw / 2, sy + 16], [sx + sw / 2 - 18, sy - 70], [sx - sw / 2 + 18, sy - 66]], '#6d8193');
    const gl = ctx.createLinearGradient(sx - sw / 2, sy - 70, sx + sw / 2, sy + 20); gl.addColorStop(0, 'rgba(210,230,255,.55)'); gl.addColorStop(.5, 'rgba(120,150,180,.25)'); gl.addColorStop(1, 'rgba(210,230,255,.4)');
    poly(ctx, [[sx - sw / 2 + 12, sy + 12], [sx + sw / 2 - 12, sy + 9], [sx + sw / 2 - 26, sy - 60], [sx - sw / 2 + 26, sy - 57]], gl);
    ctx.strokeStyle = '#2b333c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy + 11); ctx.lineTo(sx, sy - 59); ctx.stroke();
    const fx = 760, fy = 1120, fw = 400;
    ctx.save(); ctx.translate(fx, fy); ctx.transform(1, -.03, -.55, .32, 0, 0); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 20; ctx.drawImage(T.frame, -fw / 2, -fw * 860 / 760 / 2, fw, fw * 860 / 760); ctx.restore();
    const sp = P(t, .1, tE + .3, E.inOutC); const lx = lerp(-100, fx - 10, sp), ly = lerp(1150, fy, sp);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(lx, ly, 20, lx, ly, 300); sg.addColorStop(0, 'rgba(255,255,240,.32)'); sg.addColorStop(.7, 'rgba(255,255,240,.12)'); sg.addColorStop(1, 'rgba(255,255,240,0)'); ctx.fillStyle = sg; ctx.save(); ctx.translate(lx, ly); ctx.scale(1, .45); ctx.translate(-lx, -ly); ctx.fillRect(lx - 300, ly - 300, 600, 600); ctx.restore(); ctx.restore();
    const dl = P(t, tS - .05, tS + .55, E.inOutQ);
    const route = L.bezierPts([sx, 1480], [sx - 10, 900], [sx + 120, 820], [fx - 90, 1085], 60);
    pathReveal(ctx, route, dl, { color: 'rgba(255,255,255,.9)', w: 5, dash: [14, 12], head: true });
    label(ctx, '경찰 초기 가설 · 낚싯줄로 빼냈다?', sx + 260, 770, { size: 34, a: P(t, tS + .2, tS + .5), border: 'rgba(255,255,255,.5)' });
    const mb = (x0, x1, y, p, lab, col) => {
      if (p <= 0) return; const s = E.outBack(clamp(p), 2.2); const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 * s;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(cx - hw, y + 26); ctx.lineTo(cx - hw, y); ctx.lineTo(cx + hw, y); ctx.lineTo(cx + hw, y + 26); ctx.stroke(); ctx.restore();
      label(ctx, lab, cx, y - 46, { size: 40, color: '#111', bg: col, a: clamp(p * 3) });
    };
    mb(sx - sw / 2 + 18, sx + sw / 2 - 18, 945, P(t, tF - .25, tF + .05), '천장 창', '#e8edf3');
    mb(fx - 240, fx + 250, 1010, P(t, tF + .1, tF + .4), '액자', K.gold);
    const xp = P(t, tX, tX + .25);
    if (xp > 0) {
      ctx.save(); ctx.strokeStyle = K.red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.shadowColor = K.red; ctx.shadowBlur = 18;
      const cx = sx + 20, cy = 1000, r = 90;
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(lerp(cx - r, cx + r, clamp(xp * 2)), lerp(cy - r, cy + r, clamp(xp * 2))); ctx.stroke();
      if (xp > .5) { ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(lerp(cx + r, cx - r, clamp(xp * 2 - 1)), lerp(cy - r, cy + r, clamp(xp * 2 - 1))); ctx.stroke(); }
      ctx.restore();
      const qp = P(t, tX + .15, tX + .4), pulse = 1 + .08 * Math.sin((t - tX) * 10);
      ctx.save(); ctx.translate(fx + 20, 820); ctx.scale(E.outBack(qp) * pulse, E.outBack(qp) * pulse); text(ctx, '?', 0, 0, { size: 170, family: FONT.disp, color: K.red, weight: 400, stroke: '#000', strokeW: 10 }); ctx.restore();
    }
    ctx.restore();
    tint(ctx, '#6f8aa6', .18);
  },

  staff(ctx, t, d, info) {
    const tE = at(info, '증거', .6), tN = at(info, '끝났다', .88);
    desk(ctx); lamp(ctx, 540, 700, 1000, .28);
    const k = P(t, 0, .4, E.outC);
    ctx.save(); ctx.translate(540, lerp(1140, 900, k)); ctx.rotate(lerp(.08, -.02, k)); ctx.scale(.86, .86);
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 25; ctx.fillStyle = '#c9a86a'; roundRect(ctx, -400, -440, 800, 880, 10); ctx.fill(); ctx.shadowColor = 'transparent';
    const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .25; ctx.fillStyle = pg; ctx.fillRect(-400, -440, 800, 880); ctx.globalAlpha = 1;
    text(ctx, '1997 · 미술관 관리인 조사', 0, -360, { size: 50, weight: 900, color: '#3a2a12' }); L.hline(ctx, -330, -310, 660, 'rgba(60,40,10,.6)', 3);
    for (let i = 0; i < 5; i++) L.hline(ctx, -300, 260 + i * 34, 600 - hash(i) * 200, 'rgba(60,40,10,.22)', 3);
    ctx.restore();
    const ip = P(t, .25, .6, E.outBack); if (ip > 0) idCard(ctx, 540, lerp(1000, 800, ip), 1.15, '');
    if (t > tE - .2 && t < tN + .3) { const mx = lerp(420, 660, P(t, tE - .2, tN, E.inOutQ)); magnifier(ctx, mx, 780, 120, (c) => idCard(c, 540, 800, 1.15, '')); }
    const sp = P(t, tN, tN + .25);
    stamp(ctx, '증거 없음', 540, 1080, sp, { size: 130, color: '#d4202c', rot: -.14 });
    chip(ctx, '증거 불충분 → 종결', 540, 1230, P(t, tN + .2, tN + .45));
  },

  fake(ctx, t, d, info) {
    const tP = at(info, '찾았다', .3), tJ = at(info, '정교한', .65), tF = at(info, '가짜', .9);
    gradBG(ctx, [[0, '#121722'], [1, '#07090d']]); lamp(ctx, 540, 600, 1000, .22);
    // parcel
    ctx.save(); ctx.translate(540, 980);
    ctx.fillStyle = '#7a5a36'; poly(ctx, [[-360, -120], [360, -120], [400, 360], [-400, 360]], '#8a6a42');
    poly(ctx, [[-360, -120], [-470, -230], [-120, -230], [0, -120]], '#a07a4c'); poly(ctx, [[360, -120], [470, -230], [120, -230], [0, -120]], '#9a7448');
    ctx.fillStyle = 'rgba(230,220,190,.6)'; ctx.fillRect(-60, -120, 120, 480);
    ctx.restore();
    const rise = P(t, .1, tP + .3, E.outC);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 980 - 120 + 6); ctx.clip();
    ctx.save(); ctx.filter = 'hue-rotate(-14deg) saturate(.8) contrast(.92)'; canvasPiece(ctx, 540, lerp(1150, 720, rise), .78, lerp(.06, -.03, rise)); ctx.restore();
    ctx.restore();
    chip(ctx, '1997.04 · 이탈리아-프랑스 국경 근처', 540, 1240, P(t, tP - .1, tP + .2));
    if (t > tJ - .1) {
      const mx = lerp(420, 560, P(t, tJ - .1, tF, E.inOutQ)), my = lerp(650, 610, P(t, tJ - .1, tF));
      magnifier(ctx, mx, my, 120, (c) => { c.save(); c.filter = 'hue-rotate(-14deg) saturate(.8) contrast(.92)'; canvasPiece(c, 540, 720, .78, -.03); c.restore(); });
    }
    stamp(ctx, '가짜', 560, 950, P(t, tF, tF + .25), { size: 190, color: '#d4202c', rot: -.2 });
  },

  dna(ctx, t, d, info) {
    const tR = at(info, '재수사했지만', .45), tN = at(info, '소득은', .75);
    gradBG(ctx, [[0, '#120c22'], [1, '#05040b']]);
    glow(ctx, 380, 760, 600, '#7a4dff', .35);
    ctx.save(); ctx.translate(380, 800); ctx.rotate(-.06); ctx.drawImage(T.frame, -190, -215, 380, 430); ctx.restore();
    // UV sweep over the frame
    const sw = (t * .9) % 1.4; if (sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const yy = 585 + sw * 430; const g = ctx.createLinearGradient(0, yy - 30, 0, yy + 30); g.addColorStop(0, 'rgba(160,120,255,0)'); g.addColorStop(.5, 'rgba(190,160,255,.7)'); g.addColorStop(1, 'rgba(160,120,255,0)'); ctx.fillStyle = g; ctx.fillRect(170, yy - 30, 420, 60); ctx.restore(); }
    for (let i = 0; i < 6; i++) { const fx = 240 + hash(i * 5) * 280, fy = 620 + hash(i * 7) * 360; glow(ctx, fx, fy, 30, '#d9c8ff', .5 + .3 * Math.sin(t * 5 + i)); }
    dnaHelix(ctx, 820, 800, 620, t, P(t, .1, .5));
    chip(ctx, '2014 재수사 · 2016 액자 DNA 흔적', 540, 470 + 50, P(t, tR - .3, tR));
    const rp = P(t, tN - .1, tN + .2, E.outBack);
    if (rp > 0) {
      ctx.save(); ctx.translate(540, 1170); ctx.scale(rp, rp);
      ctx.fillStyle = 'rgba(8,8,14,.92)'; roundRect(ctx, -330, -70, 660, 140, 18); ctx.fill(); ctx.strokeStyle = K.red; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, 'MATCH : 0', -120, 0, { size: 48, family: FONT.type, weight: 400, color: K.red });
      text(ctx, '용의자 없음', 170, 2, { size: 46, weight: 900, color: '#fff' });
      ctx.restore();
    }
  },

  found(ctx, t, d, info) {
    const tD = at(info, '담쟁이를', .3), tG = at(info, '정원사들이', .55), tH = at(info, '철문을', .78), tO = at(info, '열었다', .9);
    const push = E.inOutC(P(t, tD - .15, tD + .45));
    const zoom = lerp(.58, 1.22, push), cy = lerp(940, 820, push);
    const cut = tD + .35;
    const op = E.outQ(P(t, tO, tO + .5));
    ivyWallScene(ctx, t, {
      cx: 540, cy, zoom, open: op, dust: P(t, tO, tO + .2) * (1 - P(t, tO + .6, tO + 1.2)),
      leafOpts: { cover: true, cut },
      inside(c, L0, T0, s) { const g = P(t, tO + .35, tO + .55) * (1 - P(t, tO + .7, tO + 1)); if (g > 0) glow(c, L0 + s * .55, T0 + s * .7, 60, '#ffffff', g); drawBag(c, L0 + s * .5, T0 + s * .76, s * .9, s * .48, 0, t); darkness(c, L0 + s * .55, T0 + s * .7, s * .7, .8, .1); },
      after(c) {
        c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(70,80,90,.25)'; c.fillRect(-1000, -1000, 3200, 4000); c.restore();
        brackets(c, HATCH.x - HATCH.s / 2 - 26, HATCH.y - HATCH.s / 2 - 26, HATCH.s + 52, HATCH.s + 52, P(t, tH, tH + .25));
        const hp = P(t, tD - .05, tD + .3, E.outC) * (1 - P(t, tO + .55, tO + .9, E.inQ));
        if (hp > 0) {
          const snipA = (tt) => Math.exp(-Math.pow((t - tt) * 9, 2));
          const openAng = .38 - .34 * Math.max(snipA(cut - .02), snipA(cut + .38), snipA(cut + .78));
          shears(c, lerp(1050, 800, hp), lerp(1180, 990, hp), -.8, openAng, .72);
          const pull = P(t, tO - .1, tO + .4, E.inOutQ);
          glove(c, lerp(-150, 380, hp) + pull * 120, lerp(1000, 800, hp) - pull * 10, .62, .45 - pull * .25, true);
        }
      },
    });
    tint(ctx, '#7d8a96', .22, 'color');
    const ws = P(t, .55, .8) * (1 - P(t, tD - .3, tD - .05));
    if (ws > 0) {
      ctx.save(); ctx.globalAlpha = ws; ctx.translate(760, 600); ctx.rotate(.05);
      ctx.fillStyle = '#ece6d8'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.fillRect(-140, -150, 280, 300); ctx.shadowColor = 'transparent';
      const [b, bx] = buf('inset', 540, 540); bx.fillStyle = '#000'; bx.fillRect(0, 0, 540, 540); bx.save(); bx.scale(.5, .5); bx.translate(0, -560); galleryInterior(bx, 3.0, { gone: 0, noTag: true }); bx.restore();
      ctx.drawImage(b, -120, -130, 240, 240); text(ctx, '1997.02', 0, 128, { size: 30, family: FONT.type, color: '#333', weight: 400 }); ctx.restore();
      ctx.save(); ctx.globalAlpha = ws; ctx.setLineDash([12, 10]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(620, 690); ctx.quadraticCurveTo(560, 760, 560, 820); ctx.stroke(); ctx.restore();
      label(ctx, '같은 미술관 외벽', 760, 420 + 60, { size: 44, a: ws, color: '#111', bg: K.goldHi });
    }
    const fa = 1 - P(t, .55, .8);
    if (fa > 0) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${.55 * fa})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = fa; flap(ctx, '2019.12.10', 540, 780, t, -.05, { size: 112, roll: .22, lock: .035 }); ctx.restore(); }
  },

  bag(ctx, t, d, info) {
    const tB = at(info, '쓰레기봉투', .2), tF = at(info, '액자', .55), tN = at(info, '없는', .7), tP = at(info, '그림', .9);
    const rv = P(t, tP - .05, tP + .25, E.outExpo);
    if (rv < 1) {
      ctx.save(); const dr = drift(t, 1, 11); camera(ctx, { x: 540 + dr.x, y: 900 + dr.y, zoom: lerp(1, 1.12, P(t, 0, tP)) * (1 + rv * .6), t });
      gradBG(ctx, [[0, '#0d0b0a'], [1, '#050404']]);
      poly(ctx, [[-100, -100], [1180, -100], [860, 500], [220, 500]], '#3a312a'); poly(ctx, [[-100, -100], [220, 500], [220, 1300], [-100, 2000]], '#2b241f');
      poly(ctx, [[1180, -100], [1180, 2000], [860, 1300], [860, 500]], '#221c18'); poly(ctx, [[220, 1300], [860, 1300], [1180, 2000], [-100, 2000]], '#40362e');
      ctx.fillStyle = '#17120f'; ctx.fillRect(220, 500, 640, 800);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(220, 560 + i * 100); ctx.lineTo(860, 560 + i * 100); ctx.stroke(); }
      for (let i = 0; i < 16; i++) { const x = 120 + hash(i * 3) * 840, y = 1320 + hash(i * 5) * 420, r = 30 + hash(i) * 60; ctx.fillStyle = `rgb(${30 + hash(i * 7) * 25},${26 + hash(i * 7) * 20},${22 + hash(i * 7) * 18})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, hash(i * 2), 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3a3d40'; ctx.lineWidth = 9; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(150 + i * 170, 1500 + hash(i) * 200); ctx.lineTo(250 + i * 170, 1460 + hash(i + 3) * 200); ctx.stroke(); }
      const cr = P(t, tB + .5, tF + .1, E.outC);
      if (cr > 0) canvasPiece(ctx, 540, lerp(1150, 860, cr), lerp(.55, .78, cr), lerp(.1, -.04, cr));
      drawBag(ctx, 540, 1180, 820, 520, P(t, tB + .4, tB + .9, E.inOutQ), t);
      const fo = P(t, tF, tF + .2) * (1 - P(t, tN + .25, tN + .45));
      if (fo > 0) {
        ctx.save(); ctx.globalAlpha = fo; ctx.setLineDash([22, 14]); ctx.strokeStyle = K.goldHi; ctx.lineWidth = 8; ctx.shadowColor = K.gold; ctx.shadowBlur = 18;
        const cy = lerp(1150, 860, cr), sw = 600 * .78 + 140, sh = 700 * .78 + 140; ctx.strokeRect(540 - sw / 2, cy - sh / 2, sw, sh); ctx.restore();
        const sp = P(t, tN, tN + .18); if (sp > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.strokeStyle = K.red; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(170, 1180); ctx.lineTo(lerp(170, 910, sp), lerp(1180, 520, sp)); ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
      const fx = lerp(260, 560, E.inOutQ(P(t, 0, 1.1))) + Math.sin(t * 3) * 30, fy = lerp(1000, 920, P(t, 0, 1.2)) + Math.cos(t * 2.3) * 25;
      darkness(ctx, fx, fy, lerp(520, 760, P(t, tB, tF)), .86, .3); glow(ctx, fx, fy, 300, '#fff6e0', .22);
      flash(ctx, Math.pow(rv, 3) * .95, '#fff4d6');
      return;
    }
    const k = t - tP - .25;
    gradBG(ctx, [[0, '#0a1712'], [1, '#040806']]); glow(ctx, 540, 860, 900, '#3e9a6b', .35);
    godrays(ctx, 540, 860, -Math.PI / 2, 6.28, 1200, '#ffd98a', .06, t, 14);
    canvasPiece(ctx, 540, 860, k < .3 ? 1.0 : lerp(1.0, 1.04, P(t, tP + .55, d)), 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) { const a = hash(i * 13) * 6.28, sp = 300 + hash(i * 7) * 900, kk = E.outC(clamp(k / 1.2)); const r = 30 + kk * sp; ctx.fillStyle = `rgba(255,${200 + hash(i) * 40},120,${(1 - kk) * .9})`; ctx.beginPath(); ctx.arc(540 + Math.cos(a) * r, 860 + Math.sin(a) * r * 1.1, 3 + hash(i * 3) * 6, 0, 7); ctx.fill(); }
    ctx.restore(); flash(ctx, Math.max(0, 1 - k * 9), '#fff4d6');
  },

  verdict(ctx, t, d, info) {
    const tB = at(info, '뒷면', .25), tR = at(info, '결과', .45), tJ = at(info, '진품', .55), tM = at(info, '6천만', .75), tI = at(info, '이상', .95);
    lightbox(ctx);
    const flip = P(t, tB - .15, tB + .15, E.inOutQ) - P(t, tR - .15, tR + .15, E.inOutQ);
    const sx = Math.abs(Math.cos(flip * Math.PI / 2));
    const shake = (t > tI && t < tI + .3) ? (hash(Math.floor(t * 60)) - .5) * 14 * (1 - (t - tI) / .3) : 0;
    ctx.save(); ctx.translate(540 + shake, 850); ctx.scale(Math.max(.02, sx), 1); ctx.translate(-540, -850);
    if (flip < .5) { canvasPiece(ctx, 540, 850, .9, 0); scanGhost(ctx, P(t, .05, tB - .2, E.inOutQ), .9, 850, .55 * (1 - P(t, tB - .2, tB))); }
    else canvasBack(ctx, 540, 850, .9, t, tB + .15);
    ctx.restore();
    label(ctx, flip < .5 ? '1996년 X선 사진과 대조' : '뒷면 도장 · 밀랍 봉인 · 라벨', 540, 520, { size: 32, color: K.cyan, bg: 'rgba(0,20,30,.85)', border: K.cyan, a: P(t, 0, .2) * (1 - P(t, tJ, tJ + .2)) });
    const st = P(t, tJ + .02, tJ + .3);
    if (st > 0) {
      const s = lerp(2.4, 1, E.outBack(st, 2)), a = clamp(st * 3);
      ctx.save(); ctx.translate(790 + shake, 640); ctx.rotate(-.22); ctx.scale(s * .85, s * .85); ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; const rg = ctx.createRadialGradient(-20, -20, 10, 0, 0, 150); rg.addColorStop(0, '#f0283a'); rg.addColorStop(1, '#8c0e18'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 140, 0, 7); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = K.goldHi; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 124, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 108, 0, 7); ctx.stroke();
      text(ctx, '진품', 0, -6, { size: 96, family: FONT.disp, weight: 400, color: '#fff2c9' }); text(ctx, 'AUTHENTIC · 2020.01.17', 0, 66, { size: 22, weight: 800, color: '#fff2c9', ls: 1 });
      ctx.restore(); flash(ctx, (1 - clamp(st * 4)) * .35, '#fff');
    }
    const vp = P(t, tM - .05, tI + .05, E.outC);
    if (vp > 0) {
      const v = Math.round(lerp(0, 60, vp)); const pop = t > tI ? 1 + .12 * Math.exp(-(t - tI) * 8) : 1;
      ctx.save(); ctx.translate(540 + shake, 1110); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(6,8,12,.86)'; roundRect(ctx, -390, -74, 780, 148, 18); ctx.fill(); ctx.strokeStyle = 'rgba(246,215,127,.6)'; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, `€${v},000,000+`, 0, 6, { size: 104, family: FONT.serif, weight: 900, color: t > tI ? K.goldHi : '#e8d39a', stroke: '#2a1a00', strokeW: 6, shadow: { color: 'rgba(255,200,90,.6)', blur: 30, y: 0 } });
      ctx.restore();
    }
  },

  condition(ctx, t, d, info) {
    const tQ = at(info, '검찰은', .45), tW = at(info, '내내', .6), tK = at(info, '모른다고', .85);
    gradBG(ctx, [[0, '#101820'], [1, '#06090c']]); lamp(ctx, 540, 600, 900, .18);
    canvasPiece(ctx, 540, 760, .62, 0);
    // condition checklist
    const cp = P(t, .05, .35, E.outBack);
    if (cp > 0) {
      ctx.save(); ctx.translate(820, 560); ctx.rotate(.05); ctx.scale(cp, cp);
      ctx.fillStyle = '#ece6d8'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.fillRect(-150, -90, 300, 180); ctx.shadowColor = 'transparent';
      text(ctx, '보존 상태', 0, -48, { size: 30, weight: 900, color: '#333' });
      text(ctx, '비교적 양호', 0, 10, { size: 44, family: FONT.disp, weight: 400, color: '#1f7a46' });
      text(ctx, '✓', -120, 10, { size: 44, weight: 900, color: '#1f7a46' });
      ctx.restore();
    }
    // timeline 1997 —?— 2019
    const tp = P(t, tQ - .2, tW + .2, E.inOutQ);
    if (tp > 0) {
      const y = 1130, x0 = 170, x1 = 910;
      ctx.save(); ctx.globalAlpha = clamp(tp * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, tp), y); ctx.stroke(); ctx.setLineDash([]);
      for (const [x, s] of [[x0, '1997'], [x1, '2019']]) { ctx.fillStyle = K.goldHi; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); text(ctx, s, x, y + 50, { size: 38, family: FONT.disp, weight: 400, color: K.goldHi }); }
      const q = (Math.sin(t * 2.2) * .5 + .5); const qx = lerp(x0 + 80, x1 - 80, q);
      text(ctx, '?', qx, y - 60, { size: 96, family: FONT.disp, weight: 400, color: K.red, stroke: '#000', strokeW: 8 });
      ctx.restore();
      chip(ctx, '22년 내내 벽 속에?', 540, 1035, P(t, tW - .1, tW + .2), { color: '#fff', border: K.red });
    }
    const qp = P(t, tK - .1, tK + .25, E.outBack);
    if (qp > 0) {
      ctx.save(); ctx.translate(270, 540); ctx.rotate(-.05); ctx.scale(qp, qp);
      ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -170, -70, 340, 140, 16); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, '검찰', 0, -30, { size: 30, weight: 800, color: '#aab' }); text(ctx, '“알 수 없다”', 0, 22, { size: 46, weight: 900, color: '#fff' });
      ctx.restore();
    }
  },

  letter(ctx, t, d, info) {
    const tL = at(info, '자기들이', .12), tG = at(info, '선물로', .4), tV = at(info, '확인된', .82), tU = at(info, '없다', .94);
    desk(ctx); lamp(ctx, 500, 700, 1000, .3);
    newspaper(ctx, 400, 860, .78, -.1);
    const lp = P(t, tL - .3, tL + .1, E.outC);
    ctx.save(); ctx.translate(lerp(1300, 700, lp), 900); ctx.rotate(lerp(.3, .06, lp));
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 35; ctx.shadowOffsetY = 15; ctx.fillStyle = '#f3efe4'; ctx.fillRect(-250, -320, 500, 640); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(80,110,160,.25)'; ctx.lineWidth = 1.5; for (let y = -250; y < 300; y += 48) { ctx.beginPath(); ctx.moveTo(-220, y); ctx.lineTo(220, y); ctx.stroke(); }
    const l1 = '“우리가 훔쳤고,', l2 = '도시에 주는 선물로', l3 = '돌려놓았다”';
    const tp = P(t, tL, tG + .7);
    const full = l1 + l2 + l3, shown = typeSub(full, tp);
    const s1 = shown.slice(0, l1.length), s2 = shown.slice(l1.length, l1.length + l2.length), s3 = shown.slice(l1.length + l2.length);
    for (const [s, y] of [[s1, -160], [s2, -60], [s3, 40]]) if (s) text(ctx, s, -215, y, { size: 46, family: FONT.serif, weight: 900, color: '#1d2a44', align: 'left' });
    text(ctx, '— 자칭 범인들의 주장 (요지)', 0, 150, { size: 28, weight: 700, color: '#666', alpha: P(t, tG, tG + .3) });
    ctx.restore();
    chip(ctx, '2020.01 · 지역 일간지 앞 편지', 540, 1240, P(t, tL - .2, tL + .1));
    stamp(ctx, '진위 미확인', 650, 1075, P(t, tU - .1, tU + .15), { size: 110, color: '#d4202c', rot: -.12 });
    if (t > tV - .1) vignette(ctx, .25 * P(t, tV - .1, tV + .2));
  },

  closed(ctx, t, d, info) {
    const tC = at(info, '공소시효는', .1), tY = at(info, '2021년', .55), tE = at(info, '종결됐다', .92);
    desk(ctx);
    const k = P(t, 0, .3, E.outC);
    const shakeY = (t > .25 && t < .5) ? Math.sin(t * 80) * 10 * (1 - (t - .25) / .25) : 0;
    ctx.save(); ctx.translate(lerp(1400, 540, k), 900 + shakeY); ctx.rotate(lerp(.25, -.03, k)); ctx.scale(.86, .86);
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 25; ctx.fillStyle = '#c9a86a'; roundRect(ctx, -380, -470, 760, 940, 10); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#d4b679'; roundRect(ctx, 120, -520, 240, 70, 10); ctx.fill();
    const pg = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha = .25; ctx.fillStyle = pg; ctx.fillRect(-380, -470, 760, 940); ctx.globalAlpha = 1;
    text(ctx, 'CASE 1997-PC', 240, -480, { size: 30, family: FONT.type, color: '#4a3a20', weight: 400 });
    text(ctx, 'RITRATTO DI SIGNORA', 0, -330, { size: 42, family: FONT.type, color: '#3a2a12', weight: 400 });
    text(ctx, '여인의 초상 · 도난 사건', 0, -260, { size: 50, weight: 800, color: '#3a2a12' });
    L.hline(ctx, -300, -210, 600, 'rgba(60,40,10,.6)', 3);
    const rows = [['절도죄 공소시효', '만료', tC + .2], ['발견 후 수사', '2021 종결', tY + .1], ['기소된 사람', '0명', tY + .5]];
    rows.forEach(([a, b, tt], i) => { const p = P(t, tt, tt + .25); text(ctx, a, -300, -130 + i * 80, { size: 40, weight: 800, color: '#3a2a12', align: 'left', alpha: p }); text(ctx, b, 300, -130 + i * 80, { size: 44, weight: 900, color: '#a3121a', align: 'right', alpha: p }); });
    ctx.restore();
    const sp = P(t, tE + .05, tE + .3);
    stamp(ctx, '미제 종결', 540 + shakeY * .3, 1040, sp, { size: 140, color: '#d4202c', rot: -.18 });
    if (sp > .4) text(ctx, 'UNSOLVED · 2021', 540, 1190, { size: 46, family: FONT.type, weight: 400, color: '#d4202c', alpha: P(t, tE + .2, tE + .4) });
    if (sp > 0 && sp < .5) motes(ctx, t, { n: 40, color: '#e9dcc0', a: .8 * (1 - sp * 2), area: [240, 920, 600, 260], size: 4, speed: 90, seed: 5 });
  },

  ending(ctx, t, d, info) {
    const tN = at(info, '누군가', .5), ve = vend(info);
    const close = E.inOutQ(P(t, ve + .1, ve + .6));
    const back = E.inOutC(P(t, ve + .1, d - .05));
    const freeze = t > tN && t < tN + .5; const tt = freeze ? tN : t;
    ivyWallScene(ctx, tt, {
      cx: 540, cy: 805, zoom: lerp(lerp(1.15, 1.42, E.inOutQ(P(t, 0, ve))), 1.0, back),
      open: 1 - close, light: 0, leafOpts: { grow: P(t, ve - .1, ve + .7) },
      inside(c, L0, T0, s) { const gg = c.createRadialGradient(L0 + s / 2, T0 + s / 2, 10, L0 + s / 2, T0 + s / 2, s * .7); gg.addColorStop(0, 'rgba(40,32,26,.6)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(L0, T0, s, s); },
    });
    const card = (s1, s2, x, y, p, pulse, icon) => {
      if (p <= 0) return; const sc = E.outBack(clamp(p)) * (1 + .05 * pulse);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = 'rgba(12,14,18,.88)'; roundRect(ctx, -220, -110, 440, 220, 22); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = pulse > .5 ? K.goldHi : 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, s1, 0, -50, { size: 44, family: FONT.disp, weight: 400, color: pulse > .5 ? K.goldHi : '#fff' }); text(ctx, s2, 0, 18, { size: 40, weight: 800, color: '#fff' });
      icon(ctx); ctx.restore();
    };
    const cp = 1 - P(t, ve + .05, ve + .3);
    const pa = .5 + .5 * Math.sin(t * 7), pb = .5 + .5 * Math.sin(t * 7 + Math.PI);
    card('A', '처음부터 벽 속에', 290, 600, P(t, .15, .45) * cp, t < tN ? 1 : pa, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(-26, 50); c.lineTo(26, 50); c.lineTo(-26, 96); c.lineTo(26, 96); c.closePath(); c.stroke(); });
    card('B', '누군가 돌려놨다', 790, 600, P(t, tN, tN + .3) * cp, freeze ? 1 : pb, (c) => { text(c, '?', 0, 72, { size: 56, family: FONT.disp, weight: 400, color: K.red }); });
    if (freeze) vignette(ctx, .6);
    const sa = P(t, ve + .35, ve + .7);
    if (sa > 0) text(ctx, '이 그림, 서울에도 왔었다 · 2025.12–2026.03', 540, 1350, { size: 38, weight: 800, color: K.goldHi, alpha: sa, stroke: '#000', strokeW: 8 });
  },
};

// ---------- interior used in y1997 and inset ----------
function galleryInterior(ctx, t, o) {
  gradBG(ctx, [[0, '#2c3540'], [.62, '#1f262f'], [1, '#0e1216']]);
  godrays(ctx, 540, 120, Math.PI / 2, .7, 1600, '#c9dcf0', .07, t, 7);
  // floor
  const fg = ctx.createLinearGradient(0, 1260, 0, 1920); fg.addColorStop(0, '#1a1f25'); fg.addColorStop(1, '#090b0d'); ctx.fillStyle = fg; ctx.fillRect(-200, 1260, 1500, 900);
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2; for (let i = -6; i < 14; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 40, 1260); ctx.lineTo(540 + i * 160, 1920); ctx.stroke(); }
  // scaffolding (left)
  ctx.strokeStyle = '#0c0f12'; ctx.lineWidth = 14;
  for (const x of [40, 230]) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1300); ctx.stroke(); }
  for (const y of [520, 820, 1100]) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(270, y); ctx.stroke(); }
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(40, 520); ctx.lineTo(230, 820); ctx.moveTo(230, 820); ctx.lineTo(40, 1100); ctx.stroke();
  ctx.fillStyle = '#0c0f12'; ctx.fillRect(0, 805, 280, 22);
  // crates (right)
  ctx.save(); ctx.globalAlpha = .9; ctx.drawImage(T.crate1, 760, 1050, 300, 220); ctx.drawImage(T.crate2, 800, 880, 220, 170); ctx.restore();
  ctx.save(); ctx.translate(700, 1270); ctx.rotate(-.12); ctx.drawImage(T.crate2, -40, -230, 120, 230); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(700, 880, 400, 400);
  // the painting on the wall
  const px = 540, py = 720, fw = 380, fh = fw * 860 / 760;
  let vis = 1;
  if (o.gone > 0) {
    const g = t - o.gone;
    if (g > 0) vis = g < .08 ? 0 : g < .14 ? 1 : g < .22 ? .2 : g < .26 ? .9 : 0;
  }
  // dust outline + nail
  ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = 'rgba(200,215,230,.35)'; ctx.lineWidth = 3; ctx.setLineDash([3, 6]); ctx.strokeRect(px - fw / 2, py - fh / 2, fw, fh); ctx.restore();
  ctx.fillStyle = 'rgba(160,175,190,.10)'; ctx.fillRect(px - fw / 2, py - fh / 2, fw, fh);
  ctx.fillStyle = '#9aa4ae'; ctx.beginPath(); ctx.arc(px, py - fh / 2 - 26, 6, 0, 7); ctx.fill();
  if (vis > 0) {
    ctx.save(); ctx.globalAlpha = vis; if (vis < 1) ctx.translate((hash(Math.floor(t * 60)) - .5) * 20, 0);
    ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.drawImage(T.portrait, px - fw * .39, py - fh * .4, fw * .78, fh * .8);
    ctx.shadowColor = 'transparent'; ctx.drawImage(T.frame, px - fw / 2, py - fh / 2, fw, fh);
    ctx.restore();
    glow(ctx, px, py - 40, 420, '#e8cf8e', .12 * vis);
  }
  if (o.banner > 0) {
    ctx.save(); ctx.globalAlpha *= o.banner; const bxx = 905, byy = 470;
    ctx.strokeStyle = '#0c0f12'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bxx - 60, byy - 40); ctx.lineTo(bxx - 60, byy); ctx.moveTo(bxx + 60, byy - 40); ctx.lineTo(bxx + 60, byy); ctx.stroke();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 25; ctx.fillStyle = '#7a1018'; ctx.beginPath(); ctx.moveTo(bxx - 75, byy); ctx.lineTo(bxx + 75, byy); ctx.lineTo(bxx + 75, byy + 400); ctx.lineTo(bxx, byy + 360); ctx.lineTo(bxx - 75, byy + 400); ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = K.gold; ctx.lineWidth = 3; ctx.strokeRect(bxx - 62, byy + 12, 124, 330);
    ['특', '별', '전'].forEach((c2, i) => text(ctx, c2, bxx, byy + 70 + i * 80, { size: 62, family: FONT.disp, weight: 400, color: K.goldHi }));
    text(ctx, 'KLIMT', bxx, byy + 312, { size: 26, family: FONT.type, weight: 400, color: K.goldHi });
    ctx.restore();
  }
  if (!o.noTag) label(ctx, '분실 확인 1997.02.22 · 반출 시점 불명', px, py + fh / 2 + 70, { size: 32, color: '#d5dbe3', bg: 'rgba(10,12,16,.7)', border: 'rgba(255,255,255,.25)' });
}

// ---------- props ----------
function shears(ctx, x, y, rot, openA, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * openA / 2);
    const bg = ctx.createLinearGradient(0, -12, 0, 12); bg.addColorStop(0, '#e7ecf0'); bg.addColorStop(.5, '#8d969e'); bg.addColorStop(1, '#4b535a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(0, -s * 10); ctx.lineTo(-330, -s * 2); ctx.lineTo(-330, s * 4); ctx.lineTo(0, s * 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a1f1f'; roundRect(ctx, 20, -16 + s * 6, 230, 32, 14); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.fillStyle = '#c9ced3'; ctx.beginPath(); ctx.arc(-3, -3, 5, 0, 7); ctx.fill();
  ctx.restore();
}
function glove(ctx, x, y, s, rot, left) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(left ? -s : s, s);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  const sl = ctx.createLinearGradient(-80, 120, 80, 120); sl.addColorStop(0, '#2b3036'); sl.addColorStop(1, '#14171a');
  ctx.fillStyle = sl; roundRect(ctx, -76, 90, 150, 320, 40); ctx.fill(); ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(-90, -120, 90, 120); g.addColorStop(0, '#d7b98a'); g.addColorStop(1, '#8a6a3c');
  ctx.fillStyle = '#6d5532'; roundRect(ctx, -70, 60, 140, 50, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; for (let i = -60; i < 70; i += 14) { ctx.beginPath(); ctx.moveTo(i, 62); ctx.lineTo(i, 108); ctx.stroke(); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-70, 66); ctx.bezierCurveTo(-86, 10, -80, -40, -62, -58); ctx.lineTo(66, -58); ctx.bezierCurveTo(84, -30, 84, 20, 70, 66); ctx.closePath(); ctx.fill();
  const fing = [[-50, -58, -.12, 92], [-17, -60, -.04, 104], [16, -60, .04, 100], [48, -56, .12, 84]];
  for (const [fx, fy, fr, fl] of fing) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fr);
    ctx.fillStyle = g; roundRect(ctx, -15, -fl, 30, fl + 12, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,15,.45)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -fl * .45); ctx.quadraticCurveTo(0, -fl * .42, 10, -fl * .45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(ctx, -9, -fl + 6, 7, fl * .7, 4); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(72, 6); ctx.rotate(.95); ctx.fillStyle = g; roundRect(ctx, -15, -78, 32, 92, 16); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(60,40,15,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-60, -10); ctx.quadraticCurveTo(0, 6, 60, -10); ctx.stroke();
  ctx.restore();
}

// ---------- map projection ----------
function project() {
  const lon0 = 12.3, lat0 = 41.9, k = 74, cosl = Math.cos(42 * Math.PI / 180);
  return (lo, la) => [540 + (lo - lon0) * k * cosl, 920 - (la - lat0) * k];
}

// ---------- post: title, subtitles, finishing ----------
function topTitle(ctx, TL) {
  const g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.62, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 560);
  text(ctx, TL.title.l1, 540, 282, { size: 80, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 12 });
  text(ctx, TL.title.l2, 540, 382, { size: 80, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 12 });
}

window.PROJECT = {
  async init(TL) {
    T.bricks = makeBricks(); makeLeaves(); T.frame = makeFrame(); T.portrait = makePortrait(); T.ghost = makeGhost(); T.board = makeBoard();
    T.crate1 = makeCrate(300, 220, 3); T.crate2 = makeCrate(220, 170, 4);
    ITALY = await (await fetch('/projects/klimt_long/italy.json')).json();
    T.oldphoto = makeOldPhoto();
  },
  scenes,
  post(ctx, T0, TL) {
    const bg = ctx.createLinearGradient(0, 1150, 0, 1920); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = bg; ctx.fillRect(0, 1150, W, 770);
    grain(ctx, T0, .085); dust(ctx, T0, .35); vignette(ctx, .55);
    if (!window.COVER_MODE) { topTitle(ctx, TL); subtitles(ctx, T0, TL.subs, { y: 1345, size: 78 }); }
    else window.COVER(ctx, TL);
  },
};
window.COVER = function (ctx, TL) {
  const g = ctx.createLinearGradient(0, 900, 0, 1700); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.4, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 900, W, 1020);
  label(ctx, '해외 미제사건', 540, 330, { size: 46, color: '#fff', bg: K.red, padX: 26, padY: 14 });
  text(ctx, '도둑맞은 명화가', 540, 1215, { size: 118, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 16 });
  text(ctx, '그 미술관 벽 속에서', 540, 1360, { size: 118, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 16 });
  text(ctx, '나왔다', 540, 1505, { size: 118, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 16 });
};
})();
