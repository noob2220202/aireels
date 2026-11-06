// AIREELS drawing library — deterministic, time-based canvas primitives.
// Every function is a pure function of (ctx, t, params) so any frame can be rendered in isolation.
(function () {
'use strict';

const W = 1080, H = 1920;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  inOutQ: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  inOutC: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1),
};
// progress of t within [t0,t1], eased
const P = (t, t0, t1, ease = E.lin) => ease(clamp((t - t0) / (t1 - t0)));
// 0→1→0 envelope with fade in/out
const env = (t, t0, t1, fin = .2, fout = .2) => Math.min(P(t, t0, t0 + fin, E.outQ), 1 - P(t, t1 - fout, t1, E.inQ));

// integer hash -> [0,1]. The float formula loses precision for |n| >= ~300 (constant output), which froze noise1/fbm,
// drift() and camera shake; large inputs therefore use exact 32-bit math (small inputs keep their original values).
function hash(n) {
  if (Math.abs(n) < 300) { n = (n << 13) ^ n; return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0) * .5 + .5; }
  n = n | 0; n = (n << 13) ^ n;
  const m = (Math.imul(n, (Math.imul(Math.imul(n, n), 15731) + 789221) | 0) + 1376312589) & 0x7fffffff;
  return (1.0 - m / 1073741824.0) * .5 + .5;
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 1013), hash(i + 1 + seed * 1013), u) * 2 - 1; }
// fractal noise
function fbm(x, seed = 0, oct = 3) { let v = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise1(x * f, seed + i * 7); a *= .5; f *= 2; } return v; }

// ---------- color ----------
const C = {
  ink: '#07080c', night: '#0b1020', navy: '#121a33', steel: '#2a3550', fog: '#8a93a8',
  paper: '#e9dfc7', paperDark: '#cbbd9b', red: '#e3262f', blood: '#a3121a', amber: '#ffb52e', yellow: '#ffd400',
  white: '#f4f1ea', cyan: '#4fd1ff', green: '#4ade80',
};
function rgba(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

// ---------- offscreen buffers ----------
const _bufs = {};
function buf(name, w = W, h = H) {
  let b = _bufs[name];
  if (!b || b.width !== w || b.height !== h) { b = document.createElement('canvas'); b.width = w; b.height = h; _bufs[name] = b; }
  const x = b.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  return [b, x];
}

// ---------- textures (generated once) ----------
const TEX = {};
function initTextures() {
  const R = rng(1234);
  TEX.grain = [];
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const id = x.createImageData(512, 512);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); TEX.grain.push(c);
  }
  // paper fibre texture
  const pc = document.createElement('canvas'); pc.width = pc.height = 512; const px = pc.getContext('2d');
  const pd = px.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4; const n = (R() - .5) * 26 + Math.sin(x * .05 + y * .002) * 3 + (R() < .004 ? -60 * R() : 0);
    pd.data[i] = 233 + n; pd.data[i + 1] = 223 + n; pd.data[i + 2] = 199 + n * .9; pd.data[i + 3] = 255;
  }
  px.putImageData(pd, 0, 0); TEX.paper = pc;
  // dust & scratches layer
  const dc = document.createElement('canvas'); dc.width = 1080; dc.height = 1920; const dx = dc.getContext('2d');
  for (let i = 0; i < 260; i++) { dx.fillStyle = `rgba(255,255,255,${.15 + R() * .4})`; dx.beginPath(); dx.arc(R() * 1080, R() * 1920, R() * 2.2 + .3, 0, 7); dx.fill(); }
  for (let i = 0; i < 14; i++) { dx.strokeStyle = `rgba(255,255,255,${.06 + R() * .12})`; dx.lineWidth = R() * 1.5 + .4; dx.beginPath(); let x0 = R() * 1080, y0 = R() * 1920; dx.moveTo(x0, y0); dx.bezierCurveTo(x0 + (R() - .5) * 60, y0 + 100, x0 + (R() - .5) * 60, y0 + 200, x0 + (R() - .5) * 40, y0 + 120 + R() * 400); dx.stroke(); }
  TEX.dust = dc;
}

// ---------- global post FX ----------
function grain(ctx, t, amt = .09, fps = 24) {
  const f = Math.floor(t * fps); const g = TEX.grain[f % TEX.grain.length];
  const ox = Math.floor(hash(f) * 512), oy = Math.floor(hash(f + 99) * 512);
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(g, 'repeat'); pat.setTransform(new DOMMatrix().translate(-ox, -oy));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function dust(ctx, t, amt = .5, fps = 12) {
  const f = Math.floor(t * fps); if (hash(f * 3 + 1) > .55) return;
  ctx.save(); ctx.globalAlpha = amt * (.4 + hash(f) * .6); ctx.globalCompositeOperation = 'screen';
  ctx.translate(W / 2, H / 2); ctx.rotate(Math.floor(hash(f + 5) * 4) * Math.PI / 2 * (hash(f + 8) > .5 ? 1 : 0)); ctx.scale(hash(f + 2) > .5 ? 1 : -1, 1);
  ctx.drawImage(TEX.dust, -W / 2 - hash(f + 3) * 200, -H / 2 - hash(f + 4) * 300, W * 1.2, H * 1.2); ctx.restore();
}
function vignette(ctx, s = .75, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H * .47, H * .18, W / 2, H * .5, H * .78);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${s})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function flicker(t, amt = .05, seed = 0) { return 1 - amt * (.5 + .5 * noise1(t * 18, seed)) - (hash(Math.floor(t * 24) + seed) > .97 ? amt * 2 : 0); }
function flash(ctx, a, color = '#fff') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function scanlines(ctx, a = .08) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#000'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); ctx.restore(); }
function tint(ctx, color, a, op = 'soft-light') { ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// camera: call inside save/restore
function camera(ctx, { x = W / 2, y = H / 2, zoom = 1, rot = 0, shake = 0, t = 0, seed = 0 } = {}) {
  const sx = shake * noise1(t * 22, seed + 1) * 18, sy = shake * noise1(t * 22, seed + 2) * 18, sr = shake * noise1(t * 15, seed + 3) * .012;
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(rot + sr); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
}
// handheld drift
function drift(t, amt = 1, seed = 0) { return { x: fbm(t * .35, seed) * 14 * amt, y: fbm(t * .3, seed + 9) * 14 * amt, r: fbm(t * .25, seed + 4) * .006 * amt }; }

// ---------- backgrounds ----------
function gradBG(ctx, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
}
function glow(ctx, x, y, r, color, a = 1, op = 'lighter') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(.4, rgba(color, a * .35)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function godrays(ctx, x, y, ang, spread, len, color, a, t = 0, n = 7) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - .5, aa = ang + k * spread, w = spread / n * (.6 + .5 * hash(i * 13));
    const al = a * (.5 + .5 * noise1(t * .8 + i * 3.1, i));
    const g = ctx.createLinearGradient(x, y, x + Math.cos(aa) * len, y + Math.sin(aa) * len);
    g.addColorStop(0, rgba(color, al)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa - w) * len, y + Math.sin(aa - w) * len); ctx.lineTo(x + Math.cos(aa + w) * len, y + Math.sin(aa + w) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- particles ----------
function rain(ctx, t, { n = 260, ang = .18, speed = 2600, len = 70, a = .35, color = '#9fb4d9', seed = 3, w = 2, area = [0, 0, W, H] } = {}) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  const [ax, ay, aw, ah] = area; const dx = Math.sin(ang), dy = Math.cos(ang);
  for (let i = 0; i < n; i++) {
    const z = .35 + hash(i * 7 + seed) * .65; const sp = speed * z;
    const x0 = ax + hash(i * 3 + seed) * (aw + 400) - 200; const y = ay + ((hash(i * 5 + seed) * ah + t * sp) % (ah + len * 2)) - len;
    const x = x0 + (y - ay) * dx / dy;
    ctx.globalAlpha = a * z; ctx.lineWidth = w * z;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * len * z, y - dy * len * z); ctx.stroke();
  }
  ctx.restore();
}
function motes(ctx, t, { n = 60, color = '#ffe6b0', a = .5, seed = 11, area = [0, 0, W, H], size = 3, speed = 20 } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const [ax, ay, aw, ah] = area;
  for (let i = 0; i < n; i++) {
    const x = ax + ((hash(i * 3 + seed) * aw + fbm(t * .2 + i, seed) * 80 + t * speed * (hash(i + seed) - .3)) % aw + aw) % aw;
    const y = ay + ((hash(i * 5 + seed) * ah - t * speed * (.3 + hash(i * 2)) + fbm(t * .15 + i * 2, seed + 1) * 60) % ah + ah) % ah;
    const s = size * (.4 + hash(i * 11 + seed)); const al = a * (.4 + .6 * (.5 + .5 * Math.sin(t * 2 + i)));
    ctx.fillStyle = rgba(color, al); ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function snow(ctx, t, o = {}) { motes(ctx, t, Object.assign({ color: '#ffffff', a: .55, size: 4, speed: 60, n: 120 }, o)); }
function fogLayer(ctx, t, y, h, color = '#9aa6c0', a = .18, seed = 1, speed = 20) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const x = ((hash(i + seed) * W * 1.6 + t * speed * (.6 + hash(i * 3))) % (W * 1.6)) - W * .3;
    const yy = y + (hash(i * 7 + seed) - .5) * h; const r = 260 + hash(i * 9) * 260;
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.save(); ctx.translate(x, yy); ctx.scale(2.2, .5); ctx.translate(-x, -yy); ctx.fillRect(x - r, yy - r, r * 2, r * 2); ctx.restore();
  }
  ctx.restore();
}

// ---------- text ----------
const FONT = { sub: 'Pretendard', disp: 'Black Han Sans', serif: 'Noto Serif KR', type: 'Special Elite' };
function setFont(ctx, size, family = FONT.sub, weight = 900) { ctx.font = `${weight} ${size}px "${family}"`; }
function text(ctx, s, x, y, o = {}) {
  const { size = 64, family = FONT.sub, weight = 900, color = '#fff', stroke = null, strokeW = 10, align = 'center', base = 'middle', shadow = null, ls = 0, alpha = 1 } = o;
  ctx.save(); setFont(ctx, size, family, weight); ctx.textAlign = align; ctx.textBaseline = base; ctx.letterSpacing = ls + 'px'; ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (shadow) { ctx.shadowColor = shadow.color || 'rgba(0,0,0,.6)'; ctx.shadowBlur = shadow.blur || 20; ctx.shadowOffsetY = shadow.y || 6; ctx.shadowOffsetX = shadow.x || 0; }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.strokeText(s, x, y); ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function measure(ctx, s, size, family = FONT.sub, weight = 900, ls = 0) { ctx.save(); setFont(ctx, size, family, weight); ctx.letterSpacing = ls + 'px'; const m = ctx.measureText(s).width; ctx.restore(); return m; }
// rich line: segments [{s, color}] drawn centered
function richLine(ctx, segs, cx, y, o = {}) {
  const { size = 64, family = FONT.sub, weight = 900, stroke = '#000', strokeW = 12, ls = 0, shadow = { color: 'rgba(0,0,0,.55)', blur: 18, y: 6 } } = o;
  const total = segs.reduce((a, s) => a + measure(ctx, s.s, size, family, weight, ls), 0);
  let x = cx - total / 2;
  for (const sg of segs) { text(ctx, sg.s, x, y, { size, family, weight, color: sg.color || '#fff', stroke, strokeW, align: 'left', ls, shadow }); x += measure(ctx, sg.s, size, family, weight, ls); }
  return total;
}
// glitch text: RGB split + slice offsets
function glitchText(ctx, s, x, y, amt, t, o = {}) {
  const f = Math.floor(t * 30); const off = amt * 14 * (hash(f) - .3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  text(ctx, s, x - off, y, Object.assign({}, o, { color: '#ff1744', stroke: null, alpha: .85 }));
  text(ctx, s, x + off, y + amt * 2, Object.assign({}, o, { color: '#00e5ff', stroke: null, alpha: .85 }));
  ctx.restore();
  text(ctx, s, x, y, o);
}
// typewriter reveal (counts graphemes)
function typeSub(s, p) { const a = Array.from(s); return a.slice(0, Math.floor(a.length * clamp(p) + .0001)).join(''); }
// counter
function countUp(from, to, p, dec = 0) { const v = lerp(from, to, p); return v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

// ---------- graphic elements ----------
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function paper(ctx, x, y, w, h, { rot = 0, seed = 1, shadow = true, tone = 1, torn = false } = {}) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; }
  ctx.beginPath();
  if (torn) { ctx.moveTo(0, 0); for (let i = 0; i <= 40; i++) ctx.lineTo(w * i / 40, (hash(i + seed) * 10)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); }
  else ctx.rect(0, 0, w, h);
  const pat = ctx.createPattern(TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(hash(seed) * 512, hash(seed + 1) * 512));
  ctx.fillStyle = pat; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.clip();
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .75);
  g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, `rgba(110,80,30,${.35 * tone})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // coffee stain
  if (hash(seed * 3) > .4) { ctx.strokeStyle = 'rgba(120,80,30,.18)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w * (.6 + hash(seed) * .3), h * (.7 + hash(seed + 2) * .2), 70, 0, 6); ctx.stroke(); }
  ctx.restore();
}
function tape(ctx, x, y, w, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = 'rgba(235,225,190,.75)'; ctx.fillRect(-w / 2, -22, w, 44); ctx.restore(); }
function pin(ctx, x, y, color = C.red) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
  const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 18); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill(); ctx.restore();
}
function stringLine(ctx, x0, y0, x1, y1, p = 1, color = C.red, sag = 40) {
  if (p <= 0) return; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;
  ctx.beginPath(); const N = 30; for (let i = 0; i <= N * p; i++) { const k = i / N; const x = lerp(x0, x1, k), y = lerp(y0, y1, k) + Math.sin(k * Math.PI) * sag; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
}
// stamp with rough ink
function stamp(ctx, s, x, y, p, { size = 120, color = C.red, rot = -.12, family = FONT.disp, box = true, ls = 6 } = {}) {
  if (p <= 0) return;
  const k = E.outBack(clamp(p * 1.0), 2.2); const sc = lerp(2.6, 1, clamp(p * 1.6)); const a = clamp(p * 4);
  const [b, bx] = buf('stamp', 1400, 700);
  bx.clearRect(0, 0, 1400, 700); bx.translate(700, 350);
  setFont(bx, size, family, 400); bx.letterSpacing = ls + 'px'; const tw = bx.measureText(s).width;
  bx.fillStyle = color; bx.strokeStyle = color; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillText(s, 0, size * .05);
  if (box) { bx.lineWidth = size * .09; roundRect(bx, -tw / 2 - size * .35, -size * .78, tw + size * .7, size * 1.56, size * .12); bx.stroke(); bx.lineWidth = size * .035; roundRect(bx, -tw / 2 - size * .22, -size * .64, tw + size * .44, size * 1.28, size * .08); bx.stroke(); }
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'destination-out';
  const R = rng(77); for (let i = 0; i < 1400; i++) { bx.globalAlpha = R() * .8; bx.beginPath(); bx.arc(R() * 1400, R() * 700, R() * 5 + .5, 0, 7); bx.fill(); }
  bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc * (k / Math.max(k, .001)), sc); ctx.globalAlpha *= a * .92; ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(b, -700, -350); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha *= .35; ctx.drawImage(b, -700, -350); ctx.restore();
}
// animated stroke along polyline/curve points
function pathReveal(ctx, pts, p, { color = C.red, w = 6, dash = null, glowC = null, head = true } = {}) {
  if (p <= 0 || pts.length < 2) return;
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  const target = L * clamp(p); let acc = 0; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash); if (glowC) { ctx.shadowColor = glowC; ctx.shadowBlur = 24; }
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); let hx = pts[0][0], hy = pts[0][1];
  for (let i = 1; i < pts.length; i++) { if (acc + seg[i - 1] >= target) { const k = (target - acc) / seg[i - 1]; hx = lerp(pts[i - 1][0], pts[i][0], k); hy = lerp(pts[i - 1][1], pts[i][1], k); ctx.lineTo(hx, hy); break; } acc += seg[i - 1]; ctx.lineTo(pts[i][0], pts[i][1]); hx = pts[i][0]; hy = pts[i][1]; }
  ctx.stroke(); ctx.restore();
  if (head && p < 1) { glow(ctx, hx, hy, 50, color, .9); ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, w * .9, 0, 7); ctx.fill(); ctx.restore(); }
  return [hx, hy];
}
function bezierPts(p0, p1, p2, p3, n = 60) { const r = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return r; }
// pulsing location marker
function marker(ctx, x, y, t, p = 1, color = C.red) {
  if (p <= 0) return; const s = E.outBack(clamp(p));
  for (let k = 0; k < 3; k++) { const q = ((t * .9 + k / 3) % 1); ctx.save(); ctx.strokeStyle = rgba(color, (1 - q) * .8 * p); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14 + q * 70, 0, 7); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 25; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); ctx.restore();
}
// label tag with line (e.g. on maps)
function tag(ctx, s, x, y, p, { color = '#fff', bg = 'rgba(10,12,20,.82)', size = 40, dx = 0, dy = -70, border = C.red } = {}) {
  if (p <= 0) return; const a = E.outC(clamp(p)); const w = measure(ctx, s, size) + 44, h = size + 30;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy * a + h / 2); ctx.stroke();
  ctx.translate(x + dx, y + dy * a); ctx.fillStyle = bg; roundRect(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill(); ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore(); text(ctx, s, x + dx, y + dy * a + 2, { size, color, alpha: a, weight: 800 });
}
// redaction bars
function redact(ctx, x, y, w, h, p) { if (p <= 0) return; ctx.save(); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y, w * E.outExpo(clamp(p)), h); ctx.restore(); }
function hline(ctx, x, y, w, color, lw = 3, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); ctx.restore(); }

// ---------- subtitles ----------
// chunks: [{t0,t1,text,hl:[words to highlight]}]
function subtitles(ctx, t, chunks, { y = 1270, size = 74, maxW = 900, color = '#fff', hlColor = C.yellow } = {}) {
  const c = chunks.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const p = clamp((t - c.t0) / .12); const sc = lerp(1.12, 1, E.outBack(p)); const a = clamp((t - c.t0) / .05);
  let lines = c.lines || [c.text];
  if (c.quote) lines = lines.map((l, i) => (i === 0 ? '“' : '') + l + (i === lines.length - 1 ? '”' : ''));
  // keep long lines inside maxW (the pop-in overshoot is 1.12x)
  const widest = Math.max(...lines.map(l => measure(ctx, l, size, FONT.sub, 900)));
  if (widest * 1.04 > maxW) size = Math.floor(size * maxW / (widest * 1.04));
  // transcript lines (speaker-labelled text cards) type on instead of popping
  if (c.who && c.typed !== false) {
    const n = Math.ceil(clamp((t - c.t0) / .4) * lines.join('').length); let k = n;
    lines = lines.map(l => { const s2 = l.slice(0, Math.max(0, k)); k -= l.length; return s2; });
  }
  const base = c.quote ? '#cfe8ff' : color;  // real testimony audio: quoted, cool tint
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.globalAlpha = a;
  lines.forEach((ln, i) => {
    const words = ln.split(' '); const segs = [];
    words.forEach((w, j) => { const isH = (c.hl || []).some(h => { h = (h || '').replace(/[.,!?…]+$/, ''); return h && w.includes(h); }); segs.push({ s: w + (j < words.length - 1 ? ' ' : ''), color: isH ? hlColor : base }); });
    richLine(ctx, segs, 0, (i - (lines.length - 1) / 2) * size * 1.22, { size, strokeW: size * .2 });
  });
  // optional: speaker label above, original-language line below (real quotes)
  const half = (lines.length / 2) * size * 1.22;
  if (c.who) { setFont(ctx, size * .4, FONT.sub, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(207,232,255,.75)'; ctx.fillText(c.who, 0, -half - size * .32); }
  if (c.en) {
    setFont(ctx, size * .44, FONT.sub, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * .08; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineJoin = 'round';
    // long English lines wrap in two balanced halves (split at the space nearest the middle, so no orphaned last word)
    let en = c.en;
    if (en.length > 58) {
      const mid = en.length / 2; let k = -1;
      for (let i = 0; i < en.length; i++) if (en[i] === ' ' && (k < 0 || Math.abs(i - mid) < Math.abs(k - mid))) k = i;
      if (k > 0) en = en.slice(0, k) + '\n' + en.slice(k + 1);
    }
    en.split('\n').forEach((s, i) => { const yy = half + size * (.42 + i * .56); ctx.strokeText(s, 0, yy); ctx.fillStyle = 'rgba(207,232,255,.62)'; ctx.fillText(s, 0, yy); });
  }
  ctx.restore();
}

// ---------- silhouettes / props helpers ----------
function poly(ctx, pts, fill, stroke = null, lw = 2) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function ellipse(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
// rim light helper: draws shape fn twice (offset light edge then fill)
function rimmed(ctx, drawShape, rimColor, offX = -5, offY = -3, fill = '#05060a', rimBlur = 10) {
  ctx.save(); ctx.translate(offX, offY); ctx.shadowColor = rimColor; ctx.shadowBlur = rimBlur; ctx.fillStyle = rimColor; drawShape(ctx); ctx.fill(); ctx.restore();
  ctx.save(); ctx.fillStyle = fill; drawShape(ctx); ctx.fill(); ctx.restore();
}

// ---------- transitions (compose two rendered buffers) ----------
const TRANS = {
  cut(ctx, A, B, p) { ctx.drawImage(p < .5 ? A : B, 0, 0); },
  fade(ctx, A, B, p) { ctx.drawImage(A, 0, 0); ctx.globalAlpha = E.inOutQ(p); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; },
  dip(ctx, A, B, p) { const k = p < .5 ? 1 - p * 2 : (p - .5) * 2; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = E.inOutQ(k); ctx.drawImage(p < .5 ? A : B, 0, 0); ctx.globalAlpha = 1; },
  flash(ctx, A, B, p) { ctx.drawImage(p < .5 ? A : B, 0, 0); flash(ctx, 1 - Math.abs(p - .5) * 2.2); },
  whip(ctx, A, B, p) {
    const e = E.inOutC(p); const blur = Math.sin(p * Math.PI) * 40;
    ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.drawImage(A, -e * W * 1.1, 0); ctx.drawImage(B, W * 1.1 - e * W * 1.1, 0); ctx.restore();
  },
  whipV(ctx, A, B, p) {
    const e = E.inOutC(p); const blur = Math.sin(p * Math.PI) * 40;
    ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.drawImage(A, 0, -e * H); ctx.drawImage(B, 0, H - e * H); ctx.restore();
  },
  zoom(ctx, A, B, p) {
    // soft push-through: outgoing scales up a little and blurs while the incoming settles from 1.12x
    const e = E.inOutQ(p);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + e * .25, 1 + e * .25); ctx.filter = `blur(${e * 6}px)`; ctx.drawImage(A, -W / 2, -H / 2); ctx.restore();
    ctx.save(); ctx.globalAlpha = E.inOutQ(clamp((p - .15) / .7)); ctx.translate(W / 2, H / 2); ctx.scale(1.12 - e * .12, 1.12 - e * .12); ctx.filter = `blur(${(1 - e) * 6}px)`; ctx.drawImage(B, -W / 2, -H / 2); ctx.restore();
    flash(ctx, Math.sin(p * Math.PI) * .08);
  },
  glitch(ctx, A, B, p) {
    const src = p < .5 ? A : B; ctx.drawImage(src, 0, 0); const f = Math.floor(p * 20); const amt = Math.sin(p * Math.PI);
    for (let i = 0; i < 14; i++) { const y = hash(f * 31 + i) * H, h = 20 + hash(f * 17 + i) * 140, off = (hash(f * 7 + i) - .5) * 260 * amt; ctx.drawImage(hash(i + f) > .5 ? A : B, 0, y, W, h, off, y, W, h); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 * amt; ctx.drawImage(src, 12 * amt, 0); ctx.restore();
  },
  push(ctx, A, B, p) { const e = E.inOutC(p); ctx.save(); ctx.filter = `brightness(${1 - e * .5})`; ctx.drawImage(A, 0, -e * H * .05); ctx.restore(); ctx.save(); ctx.globalAlpha = E.inOutQ(clamp(p * 1.25)); ctx.drawImage(B, 0, H * .12 * (1 - e)); ctx.restore(); },
};

window.L = { W, H, clamp, lerp, E, P, env, hash, rng, noise1, fbm, C, rgba, buf, TEX, initTextures, grain, dust, vignette, flicker, flash, scanlines, tint, camera, drift, gradBG, glow, godrays, rain, motes, snow, fogLayer, FONT, setFont, text, measure, richLine, glitchText, typeSub, countUp, roundRect, paper, tape, pin, stringLine, stamp, pathReveal, bezierPts, marker, tag, redact, hline, subtitles, poly, ellipse, rimmed, TRANS };
})();
