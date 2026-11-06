// suction: big cutaway of the habitat interior. The balloon plug seated in the riser is deflated; the pressure difference
// (low pressure inside the line / high-pressure water outside) drags the water and the five lights into the pipe mouth:
// violent vortex, shake, the camera is pulled into the bore and everything collapses into black (next scene: hard cut).
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, rgba, glow, text, measure, roundRect, flash, drift, FONT } = L;
const { K, at, dark, souls, chip, suffocate } = window.PK;

function cam(ctx, { x, y, zoom = 1, rot = 0, shake = 0, t = 0, seed = 0, cy = 850 }) {
  const sx = shake * noise1(t * 22, seed + 1) * 18, sy = shake * noise1(t * 22, seed + 2) * 18, sr = shake * noise1(t * 15, seed + 3) * .012;
  ctx.translate(540 + sx, cy + sy); ctx.rotate(rot + sr); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
}
// geometry (world == screen at zoom 1)
const G = { cx: 540, L: 92, R: 988, top: 492, bot: 904, ix0: 120, ix1: 960, iy0: 520, floor: 876, surf: 712, rim: 790, bore: 74, wall: 20, plugY: 986, plugW: 73, plugH: 70 };
const OW = G.bore + G.wall; // outer half-width of the pipe
const LP = [[255, 694], [376, 664], [540, 646], [704, 664], [826, 694]];
const ORDER = [2, 1, 3, 0, 4];

function quiet(ctx, k) {
  let g = ctx.createLinearGradient(0, 300, 0, 480); g.addColorStop(0, `rgba(1,2,3,${.7 * k})`); g.addColorStop(1, 'rgba(1,2,3,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 300, W, 180); ctx.fillStyle = `rgba(1,2,3,${.7 * k})`; ctx.fillRect(0, 0, W, 300);
  g = ctx.createLinearGradient(0, 1200, 0, 1300); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${.82 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 1200, W, 100); ctx.fillStyle = `rgba(1,2,3,${.88 * k})`; ctx.fillRect(0, 1300, W, H - 1300); ctx.restore();
}
function gauge(ctx, x, y, r, v, col) {
  ctx.save(); ctx.fillStyle = '#081013'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(200,230,245,.75)'; ctx.lineWidth = 2.5; ctx.stroke();
  const a0 = Math.PI * .75, a1 = Math.PI * 2.25; ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) { const an = lerp(a0, a1, i / 10); ctx.strokeStyle = i >= 8 ? K.red : 'rgba(200,230,245,.55)'; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * .6, y + Math.sin(an) * r * .6); ctx.lineTo(x + Math.cos(an) * r * .82, y + Math.sin(an) * r * .82); ctx.stroke(); }
  const an = lerp(a0, a1, clamp(v)); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * r * .74, y + Math.sin(an) * r * .74); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * .14, 0, 7); ctx.fill(); ctx.restore();
}
function gchip(ctx, s, x, y, a, v, col, o = {}) {
  if (a <= 0) return; const size = o.size || 34, tw = measure(ctx, s, size, FONT.sub, 800), w = tw + 108, h = size + 34;
  const sc = lerp(.86, 1, E.outBack(clamp(a)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(a);
  ctx.fillStyle = 'rgba(3,8,12,.88)'; roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.strokeStyle = o.border || 'rgba(160,220,255,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
  gauge(ctx, -w / 2 + 38, 0, 23, v, col);
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); text(ctx, s, -w / 2 + 72, 2, { size, weight: 800, color: o.color || '#e8f4ff', align: 'left', alpha: clamp(a) }); ctx.restore();
}
function lead(ctx, x0, y0, x1, y1, a, col = 'rgba(160,220,255,.6)') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, clamp(a)), lerp(y0, y1, clamp(a))); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 4, 0, 7); ctx.fill(); ctx.restore();
}
// surface of the habitat pool (with surge, slosh and the vortex funnel)
function surfY(x, t, s) {
  const dx = (x - G.cx);
  return s.base + Math.sin(x * .021 - t * 2.4) * s.A * .5 + Math.sin(x * .047 + t * 3.3) * s.A * .3 + Math.cos(t * 3.6) * (dx / 420) * s.slosh
    + s.sag * Math.exp(-(dx * dx) / (s.w * s.w)) + noise1(x * .03 + t * 4, 7) * s.A * .35;
}
// the inflatable plug (balloon bladder) seated in the bore
function plug(ctx, t, cx, cy, f, wr) {
  const rx = G.plugW * lerp(.56, 1, f), ry = G.plugH * lerp(.66, 1, f), n = 3.6, N = 80;
  const path = new Path2D();
  for (let i = 0; i <= N; i++) {
    const th = i / N * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const k = 1 + wr * (.05 * Math.sin(th * 7 + 1.1) + .04 * Math.sin(th * 13 + t * .7) + .03 * noise1(th * 3 + t * 1.5, 9));
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx * k, y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry * k + wr * ry * .14 * Math.max(0, s);
    i ? path.lineTo(cx + x, cy + y) : path.moveTo(cx + x, cy + y);
  }
  path.closePath();
  ctx.save();
  const g = ctx.createRadialGradient(cx - rx * .35, cy - ry * .45, 4, cx, cy, Math.max(rx, ry) * 1.25);
  g.addColorStop(0, window.PK.lerp2('#c98a55', '#7a5030', 1 - f)); g.addColorStop(.5, window.PK.lerp2('#8a4b22', '#4f2c13', 1 - f)); g.addColorStop(1, '#241006');
  ctx.fillStyle = g; ctx.fill(path);
  ctx.save(); ctx.clip(path);
  ctx.fillStyle = 'rgba(25,10,3,.35)'; for (const by of [-.5, .42]) ctx.fillRect(cx - rx - 4, cy + by * ry - 7, rx * 2 + 8, 14);
  ctx.fillStyle = 'rgba(255,210,170,.12)'; for (const by of [-.5, .42]) ctx.fillRect(cx - rx - 4, cy + by * ry - 7, rx * 2 + 8, 2);
  if (wr > 0) { ctx.strokeStyle = `rgba(20,8,2,${.45 * wr})`; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { const yy = cy - ry * .5 + k * ry * .34; ctx.beginPath(); ctx.moveTo(cx - rx, yy + Math.sin(k * 2.1) * 8); ctx.bezierCurveTo(cx - rx * .3, yy - 14 * wr, cx + rx * .3, yy + 16 * wr, cx + rx, yy + Math.cos(k * 1.7) * 8); ctx.stroke(); } }
  ctx.fillStyle = `rgba(255,236,210,${.22 * f})`; ctx.beginPath(); ctx.ellipse(cx - rx * .38, cy - ry * .5, rx * .32, ry * .16, -.35, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(143,211,232,.35)'; ctx.lineWidth = 2; ctx.stroke(path);
  ctx.fillStyle = '#1b1d1f'; ctx.fillRect(cx - 9, cy - ry - 10, 18, 14); ctx.fillStyle = '#5b666d'; ctx.fillRect(cx - 12, cy - ry - 14, 24, 5);
  ctx.restore();
  return { top: cy - ry - 12, rx, ry };
}
// steel pipe body (cutaway) between y0 and y1; bore interior filled by caller
function pipeWalls(ctx, y0, y1) {
  for (const sgn of [-1, 1]) {
    const x0 = G.cx + sgn * G.bore, x1 = G.cx + sgn * OW; const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#5d6a72'); g.addColorStop(.25, '#3a454c'); g.addColorStop(1, '#151b1f');
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), y0, G.wall, y1 - y0);
    ctx.fillStyle = 'rgba(190,220,232,.28)'; ctx.fillRect(x0 - (sgn > 0 ? 0 : 2), y0, 2, y1 - y0);
  }
}
function hatchRing(ctx, outer, inner) {
  ctx.save(); const p = new Path2D(); p.addPath(outer); p.addPath(inner);
  const g = ctx.createLinearGradient(G.L, 0, G.R, 0); g.addColorStop(0, '#6b5014'); g.addColorStop(.25, '#b48828'); g.addColorStop(.7, '#93701d'); g.addColorStop(1, '#4b380c');
  ctx.fillStyle = g; ctx.fill(p, 'evenodd'); ctx.clip(p, 'evenodd');
  ctx.strokeStyle = 'rgba(40,26,4,.45)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let k = -1200; k < 1200; k += 16) { ctx.moveTo(G.L + k, G.top - 20); ctx.lineTo(G.L + k + 460, G.bot + 440); } ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.stroke(outer); ctx.strokeStyle = 'rgba(255,220,140,.35)'; ctx.lineWidth = 2; ctx.stroke(inner); ctx.restore();
}

// the hatched shell never changes: render it once at 1.5x and blit it
let SHELL = null;
function shellSprite() {
  if (SHELL) return SHELL; const k = 1.5, x0 = G.L - 4, y0 = G.top - 4, w = G.R - G.L + 8, h = G.bot - G.top + 8;
  const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const x = c.getContext('2d');
  x.scale(k, k); x.translate(-x0, -y0);
  const outer = new Path2D(); outer.roundRect(G.L, G.top, G.R - G.L, G.bot - G.top, 30); const inner = new Path2D(); inner.rect(G.ix0, G.iy0, G.ix1 - G.ix0, G.floor - G.iy0);
  hatchRing(x, outer, inner);
  x.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 22; i++) { x.beginPath(); x.arc(G.L + 30 + i * (G.R - G.L - 60) / 21, G.top + 13, 3, 0, 7); x.fill(); }
  SHELL = { c, x0, y0, w, h }; return SHELL;
}
// low-cost version of PK.dark for the black-out: same oily sheen texture, composed in a quarter-res buffer then upscaled once
let SHEEN = null;
function sheen() {
  if (SHEEN) return SHEEN; const rec = { drawImage(img) { SHEEN = SHEEN || img; } };
  const fake = new Proxy(rec, { get: (o, kk) => (kk in o ? o[kk] : () => {}), set: () => true });
  dark(fake, 0, { k: 1 }); return SHEEN;
}
function darkLite(ctx, t, k, seed) {
  const tex = sheen(); const [b, bx] = L.buf('suction_sheen', 270, 480);
  bx.fillStyle = '#010203'; bx.fillRect(0, 0, 270, 480);
  if (tex) { bx.globalCompositeOperation = 'screen'; for (let l = 0; l < 2; l++) { const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5); bx.globalAlpha = (.075 - l * .025) * k; bx.drawImage(tex, dx / 4, dy / 4, 270 * sc / 4, 480 * sc / 4); } }
  ctx.drawImage(b, 0, 0, W, H);
  ctx.save(); for (let i = 0; i < 9; i++) { const life = 3 + hash(i * 5 + seed) * 2, ph = ((t / life + hash(i + seed)) % 1); const x = hash(i * 7 + seed * 3) * W, y = 520 + hash(i * 11 + seed) * 760, r = 30 + ph * 180;
    ctx.strokeStyle = rgba('#8fd3e8', .08 * k * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .28, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}

window.PK.scenes.suction = function (ctx, t, d, info) {
  const tBal = at(info, '풍선', .02), tAir = at(info, '바람을', .15), tMom = at(info, '순간', .26), tKwan = at(info, '관', .4), tPr = at(info, '압력', .48),
    tCha = at(info, '차가', .53), tThem = at(info, '그들을', .6), tGd = at(info, '그대로', .69), tS = at(info, '빨아들였습니다', .77);
  // ---------- state ----------
  const deflate = P(t, tAir - .05, tAir + 1.2, E.outQ), wr = P(t, tAir + .1, tAir + 1.0);
  const plugDY = 30 * P(t, tMom - .05, tMom + .22, E.outBack) + 34 * P(t, tMom + .3, tS - .2, E.inQ) + 900 * P(t, tS - .18, tS + .3, E.inQ);
  const gap = P(t, tAir + .3, tMom + .2) * .4 + P(t, tMom, tMom + .3) * .6;
  const rush = P(t, tS - .2, tS + .15);
  const sag = 10 * P(t, tMom, tMom + .5, E.outQ) + 26 * P(t, tPr, tThem) + 210 * P(t, tGd - .15, tS + .35, E.inQ);
  const S = { base: G.surf - 18 * P(t, tPr, tThem, E.inOutQ) - 90 * P(t, tGd, tS + .45, E.inQ), A: 2.4 + 9 * P(t, tPr - .1, tPr + .5) + 16 * P(t, tGd - .2, tS), slosh: 16 * P(t, tPr, tPr + .4) * (1 - .5 * P(t, tS, tS + .5)), sag, w: lerp(170, 120, P(t, tGd, tS)) };
  const vort = P(t, tGd - .25, tS, E.inQ) * (1 - P(t, tS + .7, tS + 1.1));
  const lamp = (1 - P(t, tS + .05, tS + .5)) * (t > tMom && t < tMom + .3 ? (hash(Math.floor(t * 40)) > .4 ? 1 : .35) : 1) * (t > tS - .25 && t < tS + .5 ? (hash(Math.floor(t * 30) + 7) > .45 ? 1 : .3) : 1);
  const bo = P(t, tS + .58, tS + .95, E.inQ);
  // ---------- camera ----------
  const dr = drift(t, 1, 33);
  const pPlug = P(t, tAir - .2, tAir + .7, E.inOutQ) * (1 - P(t, tKwan - .25, tKwan + .4, E.inOutQ));
  const dive = P(t, tS - .05, tS + .75, E.inOutQ);
  let cy = lerp(lerp(842, 872, pPlug), 1390, dive), z = lerp(1.03, 1, P(t, -.3, tAir)) * lerp(1, 1.08, pPlug) * (1 + .07 * P(t, tThem, tS, E.inQ));
  z *= Math.exp(Math.log(2.5) * dive);
  const shake = .5 * (t > tMom - .03 ? Math.exp(-(t - tMom + .03) * 6) : 0) + .22 * P(t, tThem, tS) + 1.0 * P(t, tS - .1, tS + .05) * (1 - P(t, tS + .45, tS + 1.0)) + .5 * (t > tS + .35 ? Math.exp(-(t - tS - .35) * 5) : 0);
  ctx.save(); ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H); ctx.restore();
  // culling: nothing of the world survives the black-out; the habitat leaves the frame as the camera dives down the bore
  const habVis = (cy - 850 / z) < G.bot + 40;
  if (bo < 1) {
  ctx.save();
  cam(ctx, { x: 540 + dr.x / z, y: cy + dr.y / z, zoom: z, rot: dr.r, shake, t, seed: 4 });
  // ---------- outside sea ----------
  let g = ctx.createLinearGradient(0, 380, 0, 1300); g.addColorStop(0, '#062631'); g.addColorStop(.5, '#03141b'); g.addColorStop(1, '#010508');
  ctx.fillStyle = g;
  if (habVis) { ctx.fillRect(-600, -600, 2300, G.top + 634); ctx.fillRect(-600, G.bot - 34, 2300, 1300 - G.bot + 34); ctx.fillRect(-600, G.top, G.L + 634, G.bot - G.top); ctx.fillRect(G.R - 34, G.top, 1700 - G.R, G.bot - G.top); }
  else ctx.fillRect(-600, -600, 2300, 3400);
  L.motes(ctx, t, { n: 50, color: '#9cc9d6', a: .25, size: 1.8, speed: 7 + 60 * vort, seed: 19, area: [-100, 880, 1280, 420] });
  // ---------- interior back wall ----------
  const inner = new Path2D(); inner.rect(G.ix0, G.iy0, G.ix1 - G.ix0, G.floor - G.iy0);
  if (habVis) {
  ctx.save(); ctx.clip(inner);
  g = ctx.createLinearGradient(0, G.iy0, 0, G.floor); g.addColorStop(0, window.PK.lerp2('#07090a', '#2a1e0d', lamp)); g.addColorStop(1, window.PK.lerp2('#030404', '#100b05', lamp));
  ctx.fillStyle = g; ctx.fillRect(G.ix0, G.iy0, G.ix1 - G.ix0, G.floor - G.iy0);
  for (let k = 0; k < 6; k++) { const x = G.ix0 + 70 + k * 145; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, G.iy0, 18, G.floor - G.iy0); ctx.fillStyle = rgba('#ffcf8a', .06 * lamp); ctx.fillRect(x - 2, G.iy0, 2, G.floor - G.iy0); }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(G.ix0, 572, G.ix1 - G.ix0, 10);
  // lamps + cones
  for (const lx of [300, 780]) {
    const fl = lamp * (.9 + .1 * noise1(t * 7, lx));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cg = ctx.createLinearGradient(0, G.iy0, 0, G.floor); cg.addColorStop(0, rgba('#ffd9a0', .16 * fl)); cg.addColorStop(1, 'rgba(255,217,160,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(lx - 22, G.iy0 + 22); ctx.lineTo(lx + 22, G.iy0 + 22); ctx.lineTo(lx + 190, G.floor); ctx.lineTo(lx - 190, G.floor); ctx.closePath(); ctx.fill(); ctx.restore();
    glow(ctx, lx, G.iy0 + 24, 170, '#ffd9a0', .46 * fl);
    ctx.fillStyle = '#20262a'; ctx.beginPath(); ctx.moveTo(lx - 26, G.iy0 + 22); ctx.lineTo(lx + 26, G.iy0 + 22); ctx.lineTo(lx + 16, G.iy0 + 4); ctx.lineTo(lx - 16, G.iy0 + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba('#fff3dc', .95 * fl); ctx.fillRect(lx - 20, G.iy0 + 20, 40, 5);
  }
  // caustic shimmer thrown onto the back wall by the pool + warm dust in the air
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.5;
  for (let k = 0; k < 4; k++) {
    const yb = S.base - 22 - k * 20; ctx.strokeStyle = rgba('#9fe7ff', (.055 - k * .012) * (lamp * .7 + .3) * (1 + S.A * .04)); ctx.beginPath();
    for (let x = G.ix0; x <= G.ix1; x += 14) { const y = yb + Math.sin(x * .03 + t * (1.6 + k * .2) + k) * (4 + S.A * .4) + Math.sin(x * .011 - t * 1.1 + k * 2) * 6; x === G.ix0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  L.motes(ctx, t, { n: 36, color: '#ffd9a0', a: .22 * lamp, size: 1.6, speed: 5 + 40 * vort, seed: 23, area: [G.ix0, G.iy0, G.ix1 - G.ix0, S.base - G.iy0] });
  // hanging hoses
  ctx.lineCap = 'round';
  [[180, '#c99a3a', 4, 0], [212, '#1c2124', 5, 1.2], [905, '#b98c34', 4, 2.3]].forEach(([hx, c, lw, ph]) => {
    const sw = Math.sin(t * .9 + ph) * 8 + vort * 40 * Math.sin(t * 9 + ph) + (G.cx - hx) * .25 * P(t, tS - .1, tS + .4, E.inQ);
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(hx, G.iy0); ctx.bezierCurveTo(hx + 10 + sw * .3, 600, hx - 6 + sw, 680, hx + sw * 1.2, S.base + 40); ctx.stroke();
  });
  ctx.restore();
  }
  // ---------- pipe: stub inside the pool + riser below the floor (cutaway) ----------
  const py = G.plugY + plugDY;
  const boreTop = G.rim + 18;
  // bore interior: habitat water above the plug, black void (low pressure) below it
  g = ctx.createLinearGradient(0, boreTop, 0, py); g.addColorStop(0, '#0d3a45'); g.addColorStop(1, '#06171c');
  ctx.fillStyle = g; ctx.fillRect(G.cx - G.bore, boreTop, G.bore * 2, Math.max(0, py - boreTop));
  ctx.fillStyle = '#010203'; ctx.fillRect(G.cx - G.bore, Math.min(py, 2600), G.bore * 2, 2600);
  if (rush > 0) { g = ctx.createLinearGradient(0, boreTop, 0, boreTop + 480); g.addColorStop(0, rgba('#0d3a45', rush)); g.addColorStop(1, 'rgba(3,12,16,0)'); ctx.fillStyle = g; ctx.fillRect(G.cx - G.bore, boreTop, G.bore * 2, 480); }
  // oily sheen in the void
  ctx.save(); ctx.beginPath(); ctx.rect(G.cx - G.bore, py, G.bore * 2, 1600); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const yy = py + 60 + ((hash(i * 3) * 400 + t * 30) % 420); ctx.strokeStyle = rgba(['#4fd1c5', '#8f7bff', '#e6b450'][i % 3], .05); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(G.cx + (hash(i) - .5) * 60, yy, 40 + 20 * hash(i * 5), 5, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  // leaks past the shrinking plug, then the full rush
  ctx.save(); ctx.beginPath(); ctx.rect(G.cx - G.bore, boreTop, G.bore * 2, 2400); ctx.clip(); ctx.lineCap = 'round';
  const nL = Math.round(6 + 10 * gap + 44 * rush), groups = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  for (let i = 0; i < nL; i++) {
    const big = i >= 16; const sp = (big ? 2200 : 700) * (.6 + .6 * hash(i * 7)); const span = big ? 1500 : 520;
    const y0 = big ? boreTop : py + 10; const y = y0 + ((hash(i * 3 + 1) * span + t * sp) % span);
    const xs = big ? G.cx + (hash(i * 11) - .5) * G.bore * 1.9 : G.cx + (i % 2 ? 1 : -1) * (G.bore - 5 - hash(i) * 10);
    const len = (big ? 140 : 40) * (.5 + hash(i * 13)); const gp = groups[(big ? 3 : 0) + i % 3];
    gp.moveTo(xs, y); gp.lineTo(xs, y + len);
  }
  groups.forEach((gp, j) => { const big = j >= 3; ctx.strokeStyle = rgba('#8fd3e8', (big ? .3 * rush : .45 * gap) * [.45, .72, 1][j % 3]); ctx.lineWidth = big ? 3 : 2; ctx.stroke(gp); });
  ctx.restore();
  // plug
  let pg = { top: py - G.plugH - 12, rx: G.plugW, ry: G.plugH };
  if (py < 1900) pg = plug(ctx, t, G.cx, py, 1 - deflate, wr);
  // pipe walls + flange at the mouth + pressure ring travelling down on "순간"
  pipeWalls(ctx, G.rim + 8, 2600);
  ctx.fillStyle = '#4b575e'; for (let fy = 1060; fy < 1500; fy += 170) { ctx.fillRect(G.cx - OW - 8, fy, 8, 18); ctx.fillRect(G.cx + OW, fy, 8, 18); }
  const ring = P(t, tMom - .02, tMom + .6); if (ring > 0 && ring < 1) { const ry = lerp(G.rim, 1400, ring); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#bfe9ff', .35 * (1 - ring)); ctx.fillRect(G.cx - OW, ry, G.wall, 26); ctx.fillRect(G.cx + G.bore, ry, G.wall, 26); ctx.restore(); }
  g = ctx.createLinearGradient(0, G.rim, 0, G.rim + 22); g.addColorStop(0, '#87969e'); g.addColorStop(.4, '#56636b'); g.addColorStop(1, '#232b30');
  ctx.fillStyle = g; ctx.fillRect(G.cx - OW - 22, G.rim, (OW + 22) * 2, 22); ctx.fillStyle = '#0d1215'; for (let k = 0; k < 7; k++) ctx.fillRect(G.cx - OW - 14 + k * ((OW + 14) * 2 - 10) / 6, G.rim + 8, 10, 6);
  // deflation hose: plug valve -> up out of the mouth -> manifold on the right wall
  const hs = P(t, tS - .18, tS + .3, E.inQ);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#121416'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(G.cx + 2, pg.top + 4);
  ctx.bezierCurveTo(G.cx + 14, lerp(780, 1100, hs), G.cx + 40 + Math.sin(t * 2) * 6, lerp(640, 900, hs), 900, 622); ctx.stroke();
  ctx.strokeStyle = 'rgba(160,190,200,.35)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  // manifold + valve wheel (turns on "바람을")
  ctx.save(); ctx.fillStyle = '#2b3338'; roundRect(ctx, 884, 596, 46, 70, 6); ctx.fill(); ctx.strokeStyle = 'rgba(200,220,230,.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.translate(907, 616); ctx.rotate(P(t, tAir - .2, tAir + .5, E.inOutQ) * Math.PI * 1.5); ctx.strokeStyle = '#c23b2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.stroke(); ctx.restore();
  // ---------- pool water (translucent over the stub) ----------
  if (habVis) {
  ctx.save(); ctx.clip(inner);
  const wp = new Path2D(); wp.moveTo(G.ix0, G.floor + 4);
  for (let x = G.ix0; x <= G.ix1 + 6; x += 6) wp.lineTo(x, surfY(x, t, S)); wp.lineTo(G.ix1, G.floor + 4); wp.closePath();
  g = ctx.createLinearGradient(0, S.base - 40, 0, G.floor); g.addColorStop(0, 'rgba(26,92,108,.78)'); g.addColorStop(1, 'rgba(5,24,30,.9)');
  ctx.fillStyle = g; ctx.fill(wp);
  // warm lamp reflections + cyan surface line
  ctx.strokeStyle = rgba('#bfe9ff', .7); ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = G.ix0; x <= G.ix1 + 6; x += 6) { const y = surfY(x, t, S); x === G.ix0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { const x = G.ix0 + 40 + i * 60 + Math.sin(t * 1.3 + i) * 10; const y = surfY(x, t, S) + 6; ctx.fillStyle = rgba('#ffcf8a', .16 * lamp * (.5 + .5 * Math.sin(t * 3 + i * 2))); ctx.fillRect(x - 14, y, 28, 2); }
  ctx.restore();
  // inward ripples toward the mouth (suction building)
  const rp = P(t, tMom, tMom + .3) * (1 - P(t, tS, tS + .3));
  if (rp > 0) for (let k = 0; k < 4; k++) { const q = 1 - ((t * .9 + k / 4) % 1); const rr = 40 + q * 330; ctx.strokeStyle = rgba('#8fd3e8', .22 * rp * Math.sin(q * Math.PI)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(G.cx, surfY(G.cx + rr, t, S) + 4, rr, rr * .07, 0, 0, Math.PI); ctx.stroke(); }
  // bubbles escaping past the deflating plug, rising through the mouth to the surface
  const bA = P(t, tAir, tAir + .25) * (1 - P(t, tMom + .5, tKwan + .4));
  if (bA > 0) {
    ctx.strokeStyle = 'rgba(216,246,255,.8)'; ctx.lineWidth = 1.8;
    for (let i = 0; i < 26; i++) {
      const life = .9 + hash(i * 5) * .8, ph = ((t / life + hash(i * 3)) % 1); const y0 = pg.top + 10, y1 = surfY(G.cx, t, S) + 6; const y = lerp(y0, y1, ph);
      const spread = y > G.rim ? G.bore - 12 : lerp(G.bore - 12, 120, clamp((G.rim - y) / 70));
      const x = G.cx + (hash(i * 7) - .5) * 2 * spread + Math.sin(t * 6 + i) * 4, r = 2.5 + hash(i * 11) * 6;
      ctx.globalAlpha = bA * Math.sin(ph * Math.PI); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // ---------- shell (hatched cutaway) + floor seal around the riser ----------
  const SH = shellSprite(); ctx.drawImage(SH.c, SH.x0, SH.y0, SH.w, SH.h);
  g = ctx.createLinearGradient(0, boreTop, 0, Math.max(py, G.bot + 40)); g.addColorStop(0, '#0d3a45'); g.addColorStop(1, '#06171c');
  ctx.fillStyle = g; ctx.fillRect(G.cx - G.bore, G.floor - 2, G.bore * 2, G.bot - G.floor + 4);
  pipeWalls(ctx, G.floor - 2, G.bot + 2);
  ctx.fillStyle = '#3b464d'; ctx.fillRect(G.cx - OW - 16, G.bot, 16, 14); ctx.fillRect(G.cx + OW, G.bot, 16, 14);
  // ---------- pressure diagram ----------
  const lowA = P(t, tKwan - .05, tKwan + .3) * (1 - P(t, tGd - .2, tGd + .15));
  const hiA = P(t, tPr - .05, tPr + .3) * (1 - P(t, tGd - .2, tGd + .15));
  const dpA = P(t, tCha - .08, tCha + .25) * (1 - P(t, tS - .15, tS + .1));
  if (hiA > 0) {
    // chevrons pressing in toward the mouth (pool) and against the shell (sea)
    ctx.save(); ctx.strokeStyle = rgba('#8fd3e8', .75 * hiA); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 3; k++) {
      const q = ((t * 1.1 + k / 3) % 1), al = Math.sin(q * Math.PI);
      for (const sgn of [-1, 1]) {
        const x = G.cx + sgn * lerp(360, 150, q), y = G.floor - 40; ctx.globalAlpha = al;
        ctx.beginPath(); ctx.moveTo(x + sgn * 14, y - 16); ctx.lineTo(x - sgn * 4, y); ctx.lineTo(x + sgn * 14, y + 16); ctx.stroke();
        const xo = sgn > 0 ? lerp(1060, G.R + 14, q) : lerp(20, G.L - 14, q), yo = 600 + k * 0;
        for (const yy of [610, 760]) { ctx.beginPath(); ctx.moveTo(xo + sgn * 12, yy - 14); ctx.lineTo(xo - sgn * 3, yy); ctx.lineTo(xo + sgn * 12, yy + 14); ctx.stroke(); }
      }
    }
    ctx.restore();
  }
  if (dpA > 0) {
    // big red ΔP arrow down into the pipe
    const p = P(t, tCha - .08, tCha + .3, E.outC), y0 = G.rim - 40, y1 = 1172, yl = lerp(y0, y1, p), hw = 50, hl = 62, sw = 15;
    const ap = new Path2D(); ap.moveTo(G.cx - sw, y0); ap.lineTo(G.cx + sw, y0); ap.lineTo(G.cx + sw, yl - hl); ap.lineTo(G.cx + hw, yl - hl); ap.lineTo(G.cx, yl); ap.lineTo(G.cx - hw, yl - hl); ap.lineTo(G.cx - sw, yl - hl); ap.closePath();
    ctx.save(); ctx.globalAlpha *= dpA; ctx.shadowColor = K.red; ctx.shadowBlur = 30; ctx.fillStyle = K.red; ctx.fill(ap); ctx.shadowBlur = 0;
    ctx.clip(ap); ctx.strokeStyle = 'rgba(255,200,200,.5)'; ctx.lineWidth = 6;
    for (let k = 0; k < 9; k++) { const yy = y0 + ((k * 52 + t * 260) % 470); ctx.beginPath(); ctx.moveTo(G.cx - 60, yy - 26); ctx.lineTo(G.cx, yy); ctx.lineTo(G.cx + 60, yy - 26); ctx.stroke(); }
    ctx.restore();
    glow(ctx, G.cx, yl - 30, 160, K.red, .25 * dpA);
  }
  // labels (world space; camera is near 1x here)
  const pA = P(t, tBal, tBal + .3, E.outQ) * (1 - P(t, tKwan - .3, tKwan));
  lead(ctx, G.cx + pg.rx - 6, py - 6, 760, 1004, pA);
  chip(ctx, '풍선 마개', 820, 1030, pA, { size: 34, border: 'rgba(255,190,120,.55)', color: '#ffe3c4' });
  lead(ctx, G.cx + 20, 1110, 760, 1050, lowA);
  gchip(ctx, '관 속 저압', 812, 1030, lowA, lerp(.5, .06, P(t, tKwan, tKwan + .7, E.outBack)) + .02 * noise1(t * 20, 2), '#8fd3e8');
  gchip(ctx, '바깥 물 고압', 268, 1030, hiA, lerp(.5, .9, P(t, tPr, tPr + .7, E.outBack)) + .02 * noise1(t * 20, 5), '#ffd7a0');
  if (dpA > 0) { const s = lerp(.8, 1, E.outBack(P(t, tCha - .05, tCha + .3))); ctx.save(); ctx.translate(G.cx, 1196); ctx.scale(s, s); chip(ctx, 'ΔP (델타 P) · 압력 차', 0, 0, dpA, { size: 38, color: '#fff', border: K.red, bg: 'rgba(40,4,6,.9)' }); ctx.restore(); }
  // ---------- vortex streaks around the funnel ----------
  if (vort > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const life = .55 + hash(i * 3) * .5, ph = ((t * (1 + vort * 1.5) / life + hash(i * 7)) % 1);
      const rr = lerp(400, 18, Math.pow(ph, .8)), yy = lerp(S.base - 10, G.rim + 30 + 200 * rush, Math.pow(ph, 1.6));
      const a0 = hash(i * 13) * 7 + ph * 9 + t * 2, len = .5 + .9 * vort;
      ctx.strokeStyle = rgba(i % 5 ? '#a9e6ff' : '#ffffff', .4 * vort * Math.sin(ph * Math.PI)); ctx.lineWidth = 1.5 + 3 * hash(i);
      ctx.beginPath(); ctx.ellipse(G.cx, yy, rr, rr * .13, 0, a0, a0 + len); ctx.stroke();
    }
    ctx.restore();
  }
  }
  // ---------- the five lives ----------
  const bpm = lerp(78, 132, P(t, tMom, tS));
  const pts = []; const trails = [];
  ORDER.forEach((i, rank) => {
    const [x0, y0] = LP[i]; const sgn = x0 >= G.cx ? 1 : -1;
    // working idle -> lean toward the mouth on "바람을" -> jolt on "그들을"
    const lean = .06 * P(t, tAir, tAir + .6, E.inOutQ) + .1 * P(t, tThem - .05, tThem + .25, E.outBack);
    const bx = lerp(x0, G.cx, lean) + noise1(t * .7, i * 9) * 5 + (t > tThem ? noise1(t * 14, i) * 5 : 0), by = lerp(y0, S.base - 12, lean * 2) + noise1(t * .6, i * 9 + 3) * 4;
    const kk = (u) => P(u, tGd + .12 + rank * .06, tS + .3 + rank * .08, E.inC);
    const pos = (k) => {
      if (k <= 0) return [bx, by];
      if (k < .6) { const q = k / .6, R0 = Math.abs(bx - G.cx), R = R0 * (1 - E.inQ(q)), an = (sgn > 0 ? 0 : Math.PI) + q * Math.PI * 1.6 * sgn;
        return [G.cx + Math.cos(an) * R, lerp(by, G.rim + 6, E.inQ(q)) + Math.sin(an) * R * .12]; }
      const q = (k - .6) / .4; return [G.cx + Math.sin(q * 7 + i) * 26 * (1 - q) + (rank - 2) * 9 * q, lerp(G.rim + 6, 1330 + rank * 34, E.outQ(q)) + Math.max(0, t - tS - .3 - rank * .08) * 140];
    };
    const k = kk(t); const p = pos(k); pts[i] = { x: p[0], y: p[1], a: 1, s: lerp(1.55, 1.15, k) / Math.pow(z, .55) };
    if (k > 0) trails.push(Array.from({ length: 9 }, (_, j) => pos(kk(t - j * .018))));
  });
  if (trails.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    trails.forEach(tr => { for (let j = 1; j < tr.length; j++) { ctx.strokeStyle = rgba('#ffb347', .5 * (1 - j / tr.length)); ctx.lineWidth = 22 * (1 - j / tr.length) + 3; ctx.beginPath(); ctx.moveTo(tr[j - 1][0], tr[j - 1][1]); ctx.lineTo(tr[j][0], tr[j][1]); ctx.stroke(); } });
    ctx.restore();
  }
  pts.forEach((p, i) => glow(ctx, p.x, p.y, 70 * p.s, '#ffb347', .3 + .2 * window.PK.beat(t + i * .19, bpm)));
  souls(ctx, t, pts.map(p => ({ x: p.x, y: p.y, a: p.a, s: p.s })), { bpm });
  ctx.restore();
  }
  // ---------- screen space: speed lines converging into the mouth, quiet bands, black-out ----------
  const sl = P(t, tS - .1, tS + .2) * (1 - P(t, tS + .6, tS + .9));
  if (sl > 0 && bo < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const an = hash(i * 7) * Math.PI * 2, ph = ((t * 2.6 + hash(i * 3)) % 1), r0 = lerp(1100, 120, ph), r1 = r0 + 120 + 200 * hash(i);
      ctx.strokeStyle = rgba('#bfe9ff', .28 * sl * Math.sin(ph * Math.PI)); ctx.lineWidth = 2 + 3 * hash(i * 5);
      ctx.beginPath(); ctx.moveTo(540 + Math.cos(an) * r0, 900 + Math.sin(an) * r0); ctx.lineTo(540 + Math.cos(an) * r1, 900 + Math.sin(an) * r1); ctx.stroke();
    }
    ctx.restore();
  }
  if (bo < 1) {
    quiet(ctx, 1 - P(t, tS + .3, tS + .7));
    suffocate(ctx, t, .12 + .3 * P(t, tPr, tS) + .5 * P(t, tS, tS + .6, E.inQ), .3 + .3 * P(t, tMom, tS));
    flash(ctx, .2 * P(t, tS - .06, tS) * (1 - P(t, tS, tS + .3)), '#bfe9ff');
  }
  // collapse into black: only the faintest oily sheen and a last dying swirl remain
  if (bo > 0) {
    ctx.save(); ctx.globalAlpha = bo; darkLite(ctx, t, .6, 6); ctx.restore();
    const sw = P(t, tS + .7, tS + .9) * (1 - P(t, tS + 1.0, d + .05));
    if (sw > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const ph = ((t * .7 + hash(i * 3)) % 1), rr = lerp(420, 40, ph), a0 = hash(i * 9) * 7 + t * (1.6 + ph * 2); ctx.strokeStyle = rgba('#8fd3e8', .14 * sw * Math.sin(ph * Math.PI)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(540, 880, rr, rr * .32, 0, a0, a0 + .7); ctx.stroke(); }
      ctx.restore();
    }
    suffocate(ctx, t, .9 * bo, .25);
  }
};
})();
