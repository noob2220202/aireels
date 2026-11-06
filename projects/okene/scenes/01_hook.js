// hook: "시신을 찾던 잠수부의 손을, 누군가 붙잡았습니다."
// Cold open inside the overturned hull, in murky water. A diver's helmet-light cone drifts over dark steel plating (rust streaks
// run UP from the rivets: the hull is upside down; the door's sill is now at the top of the doorway). From the first frame his
// gloved hand is in the beam, searching into the black doorway; '잠수부의' -> it slides deeper; '손을' -> the beam swings onto the
// doorway and the glove reaches into it; '누군가' -> a warm heartbeat throbs twice in the dark under the glove's fingers, where
// his hand will come from; '붙잡았습니다' -> a bare hand (neutral backlit silhouette, no skin tone) shoots out of the dark and
// clamps onto the glove: impact on the word (sfx), freeze-frame jolt, cold flash, the beam jerks, the diver's breath bursts out.
// The content warning chip sits at y 492 for the first ~2.5 s.
//
// This file also holds the shared "hand-grip" kit (window.PK.HG) used by nico and hand: the hull wall sprite, the beam, silt,
// bubbles and the two anatomical hand silhouettes (diver's neoprene glove, bare hand) built from finger skeletons.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, flash } = L;
const PK = window.PK;
const HG = PK.HG = PK.HG || {};

// ---------- local hash / noise (L.hash loses precision for large arguments) ----------
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
Object.assign(HG, { hi, nz, fb });

// ---------- oily black water: PK.dark's sheen composed at quarter resolution (cached texture) ----------
function sheenTex() {
  if (PK._sheenHG) return PK._sheenHG;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.min(5, Math.floor(h6))];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); PK._sheenHG = c; return c;
}
HG.darkFast = function (ctx, t, k = .6, seed = 1, base = '#010203', defer = false) {
  if (defer) { HG._bg = { t, k, seed, base }; ctx.fillStyle = base; ctx.fillRect(0, 0, W, H); return; }
  const [b, x] = HG.sheenBuf(t, k, seed, base);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
};
HG.sheenBuf = function (t, k, seed, base) {
  const [b, x] = L.buf('hgDark', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  if (k > 0) {
    const tex = sheenTex(); x.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
      x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
  }
  return [b, x];
};
// soft round sprite (bokeh / glow dots)
function dotSprite() {
  if (HG._dot) return HG._dot;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); HG._dot = c; return c;
}

// ---------- world (hook framing; the hand scene's close-up uses the same coordinates) ----------
const S = 17;                                              // px per cm for the hands
const LAMP = { x: -46, y: 588 };                            // helmet lamp (just off the left edge)
const DOOR = { x0: 452, x1: 1012, y0: 706, y1: 1390, r: 76 };
const G0 = { x: 466, y: 902, ang: .2 };                     // glove wrist when the grip locks
Object.assign(HG, { S, LAMP, DOOR, G0 });

function rr(x, X0, Y0, X1, Y1, r) { x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X1, Y0, X1, Y1, r); x.arcTo(X1, Y1, X0, Y1, r); x.arcTo(X0, Y1, X0, Y0, r); x.arcTo(X0, Y0, X1, Y0, r); x.closePath(); }
// bulkhead around the doorway, fully lit (the beam reveals it through a light mask). Cached.
function wallSprite() {
  if (HG._wall) return HG._wall;
  const X0 = -220, Y0 = 320, WW = 1520, HH = 1280;
  const c = document.createElement('canvas'); c.width = WW; c.height = HH; const x = c.getContext('2d');
  x.translate(-X0, -Y0);
  const R = L.rng(77);
  const g = x.createLinearGradient(0, Y0, 0, Y0 + HH); g.addColorStop(0, '#5a6870'); g.addColorStop(.45, '#4a575f'); g.addColorStop(1, '#333d43');
  x.fillStyle = g; x.fillRect(X0, Y0, WW, HH);
  // grime / rust mottling
  for (let i = 0; i < 190; i++) {
    const px = X0 + R() * WW, py = Y0 + R() * HH, r = 24 + R() * 130, q = R();
    const col = q < .3 ? '#6a4529' : q < .62 ? '#1d3a41' : '#20272b';
    const gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, rgba(col, .16 + R() * .22)); gg.addColorStop(1, rgba(col, 0));
    x.fillStyle = gg; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 5200; i++) { x.fillStyle = R() < .55 ? 'rgba(0,0,0,.2)' : 'rgba(205,225,235,.07)'; x.fillRect(X0 + R() * WW, Y0 + R() * HH, 1 + R() * 2.2, 1 + R() * 2.2); }
  // plate seams with weld beads
  const seamH = [612, 1236], seamV = [312, 1150];
  x.lineCap = 'round';
  for (const y of seamH) { x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(X0, y - 4, WW, 7); x.fillStyle = 'rgba(210,225,232,.16)'; x.fillRect(X0, y - 6, WW, 2); }
  for (const xx of seamV) { x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(xx - 4, Y0, 7, HH); x.fillStyle = 'rgba(210,225,232,.14)'; x.fillRect(xx - 6, Y0, 2, HH); }
  // rivet rows (with rust streaks running UP: the hull is upside down)
  const rivet = (px, py, r = 5.5) => {
    if (R() < .22) { const lg = x.createLinearGradient(0, py, 0, py - 40 - R() * 110); lg.addColorStop(0, 'rgba(120,70,35,.42)'); lg.addColorStop(1, 'rgba(120,70,35,0)'); x.fillStyle = lg; x.fillRect(px - 2.5 - R() * 2, py - 150, 5 + R() * 3, 150); }
    const rg = x.createRadialGradient(px - r * .35, py - r * .35, 0, px, py, r); rg.addColorStop(0, '#9aa8ae'); rg.addColorStop(.6, '#46525a'); rg.addColorStop(1, '#1a2024');
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(px + 2, py + 2.5, r, 0, 7); x.fill();
    x.fillStyle = rg; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  };
  for (const y of seamH) for (let xx = X0 + 30; xx < X0 + WW; xx += 46) rivet(xx, y + 16);
  for (const xx of seamV) for (let y = Y0 + 20; y < Y0 + HH; y += 46) rivet(xx + 16, y);
  // vertical frame (stiffener) left of the door
  { const x0 = 150, w = 58; const sg = x.createLinearGradient(x0, 0, x0 + w, 0); sg.addColorStop(0, '#2b3439'); sg.addColorStop(.18, '#77868d'); sg.addColorStop(.5, '#56646b'); sg.addColorStop(1, '#232b30');
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(x0 + w, Y0, 16, HH); x.fillStyle = sg; x.fillRect(x0, Y0, w, HH);
    for (let y = Y0 + 34; y < Y0 + HH; y += 70) rivet(x0 + w / 2, y, 5); }
  // overhead (the old floor): non-slip deck plate band at the very top
  { x.fillStyle = '#2a3236'; x.fillRect(X0, Y0, WW, 150); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(X0, Y0 + 150, WW, 10);
    x.strokeStyle = 'rgba(190,205,212,.14)'; x.lineWidth = 3;
    for (let yy = Y0 + 12; yy < Y0 + 148; yy += 22) for (let xx = X0 + ((yy / 22) % 2) * 22; xx < X0 + WW; xx += 44) { x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 14, yy + 8); x.stroke(); } }
  // doorway frame (rounded corners) + the sill/coaming, now at the TOP of the opening
  const D = DOOR, F = 44;
  x.fillStyle = 'rgba(0,0,0,.55)'; rr(x, D.x0 - F + 10, D.y0 - F + 12, D.x1 + F + 10, D.y1 + F + 12, D.r + F); x.fill();
  const fg = x.createLinearGradient(D.x0 - F, D.y0 - F, D.x1 + F, D.y1); fg.addColorStop(0, '#7c8a91'); fg.addColorStop(.35, '#56636a'); fg.addColorStop(1, '#2b3337');
  x.fillStyle = fg; rr(x, D.x0 - F, D.y0 - F, D.x1 + F, D.y1 + F, D.r + F); x.fill();
  x.strokeStyle = 'rgba(220,235,240,.28)'; x.lineWidth = 3; rr(x, D.x0 - F + 2, D.y0 - F + 2, D.x1 + F - 2, D.y1 + F - 2, D.r + F - 2); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 6; rr(x, D.x0 - 4, D.y0 - 4, D.x1 + 4, D.y1 + 4, D.r + 4); x.stroke();
  for (const [px, py] of [[D.x0 - F / 2, 840], [D.x0 - F / 2, 1120], [D.x1 + F / 2, 860], [D.x1 + F / 2, 1150]]) {   // dog handles (wedges)
    x.fillStyle = '#1b2125'; x.fillRect(px - 9, py - 26, 18, 52); x.fillStyle = 'rgba(220,235,240,.3)'; x.fillRect(px - 9, py - 26, 3, 52);
  }
  // coaming (the old door sill) running across the top of the opening
  { const cy0 = D.y0 - F - 34, cy1 = D.y0 - F + 18; const cg = x.createLinearGradient(0, cy0, 0, cy1); cg.addColorStop(0, '#8d9ba2'); cg.addColorStop(.25, '#5f6c73'); cg.addColorStop(1, '#262e33');
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(D.x0 - F - 40, cy1, D.x1 - D.x0 + 2 * F + 80, 16);
    x.fillStyle = cg; x.fillRect(D.x0 - F - 40, cy0, D.x1 - D.x0 + 2 * F + 80, cy1 - cy0);
    x.fillStyle = 'rgba(230,240,245,.35)'; x.fillRect(D.x0 - F - 40, cy0, D.x1 - D.x0 + 2 * F + 80, 3); }
  // inverted cage lamp on the wall (left): dome on top, cage below... upside down
  { const lx = 86, ly = 905; x.fillStyle = '#20282c'; x.fillRect(lx - 36, ly + 40, 72, 16);
    x.fillStyle = '#3a454b'; x.beginPath(); x.ellipse(lx, ly + 40, 34, 46, 0, Math.PI, 0); x.fill();
    x.strokeStyle = 'rgba(200,215,222,.32)'; x.lineWidth = 3; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(lx + k * 13, ly + 40); x.quadraticCurveTo(lx + k * 16, ly - 10, lx, ly - 8); x.stroke(); }
    x.fillStyle = 'rgba(150,190,200,.18)'; x.beginPath(); x.ellipse(lx, ly + 20, 20, 26, 0, 0, 7); x.fill(); }
  // the opening: cut out, then a very dark far wall (the flooded passage beyond) and the open door panel
  x.save(); x.globalCompositeOperation = 'destination-out'; rr(x, D.x0, D.y0, D.x1, D.y1, D.r); x.fill(); x.restore();
  x.save(); rr(x, D.x0, D.y0, D.x1, D.y1, D.r); x.clip();
  const vg = x.createLinearGradient(0, D.y0, 0, D.y1); vg.addColorStop(0, '#121c21'); vg.addColorStop(.6, '#0a1114'); vg.addColorStop(1, '#05080a');
  x.globalAlpha = .55; x.fillStyle = vg; x.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0); x.globalAlpha = 1;
  x.fillStyle = 'rgba(160,190,200,.08)'; x.fillRect(D.x0, D.y0 + 210, D.x1 - D.x0, 3);          // far plating seam
  // open door panel, swung away into the passage (hinged on the right)
  x.beginPath(); x.moveTo(D.x1 - 6, D.y0 + 16); x.lineTo(D.x1 - 168, D.y0 + 78); x.lineTo(D.x1 - 168, D.y1 - 40); x.lineTo(D.x1 - 6, D.y1 - 4); x.closePath();
  x.fillStyle = '#2a3338'; x.fill(); x.strokeStyle = 'rgba(205,220,228,.4)'; x.lineWidth = 4; x.beginPath(); x.moveTo(D.x1 - 168, D.y0 + 78); x.lineTo(D.x1 - 168, D.y1 - 40); x.stroke();
  x.fillStyle = '#151b1e'; x.fillRect(D.x1 - 150, D.y0 + 150, 26, 70);
  x.restore();
  HG._wall = { c, X0, Y0 }; return HG._wall;
}
HG.wallSprite = wallSprite;

// ---------- the beam ----------
// b = {x, y, ang, spread, len, a}: intensity at a world point
HG.beamI = function (b, x, y) {
  const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy) + 1e-3;
  let a = Math.atan2(dy, dx) - b.ang; a = Math.atan2(Math.sin(a), Math.cos(a));
  return b.a * Math.exp(-Math.pow(a / (b.spread * .78), 2)) / (1 + Math.pow(d / b.len, 2) * 3);
};
function halfSprite() {
  if (HG._wallHalf) return HG._wallHalf;
  const w = wallSprite(), c = document.createElement('canvas'); c.width = w.c.width / 2; c.height = w.c.height / 2;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(w.c, 0, 0, c.width, c.height); HG._wallHalf = c; return c;
}
const halfM = M => [M.a * .5, M.b * .5, M.c * .5, M.d * .5, M.e * .5, M.f * .5];
// blit a buffer that covers the whole screen at scale k, only inside the visible band (title / subtitle areas are covered by post)
const BY0 = 0, BY1 = 1332;
function blitBand(ctx, bb, k, op = 'source-over') { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = op; ctx.drawImage(bb, 0, BY0 / k, W / k, (BY1 - BY0) / k, 0, BY0, W, BY1 - BY0); ctx.restore(); }
HG.blitBand = blitBand;
// the wall revealed by the beam: half-res buffer sharing ctx's transform, one light mask with the ambient level baked in
HG.wall = function (ctx, b, { amb = .05, gain = 1 } = {}) {
  const s = wallSprite(), hs = halfSprite(), M = ctx.getTransform(), [bb, x] = L.buf('hgWallLit', 540, 960);
  x.clearRect(0, 0, 540, 960); x.setTransform(...halfM(M)); x.drawImage(hs, s.X0, s.Y0, s.c.width, s.c.height);
  x.globalCompositeOperation = 'destination-in';
  const k = clamp(b.a * gain), hx = b.x + Math.cos(b.ang) * b.len * .5, hy = b.y + Math.sin(b.ang) * b.len * .5, rx = b.len * .62, ry = b.len * Math.tan(b.spread) * .62 + 60;
  x.translate(hx, hy); x.rotate(b.ang); x.scale(1, ry / rx);
  const g = x.createRadialGradient(-rx * .25, 0, 0, 0, 0, rx), al = v => `rgba(0,0,0,${Math.max(amb, v).toFixed(3)})`;
  g.addColorStop(0, al(.95 * k)); g.addColorStop(.35, al(.5 * k)); g.addColorStop(.7, al(.14 * k)); g.addColorStop(1, al(0));
  x.fillStyle = g; x.fillRect(-6000, -6000, 12000, 12000);
  if (HG._bg) {   // deferred oily background goes under the wall in the same half-res pass (one full-screen blit)
    const q = HG._bg; HG._bg = null; const [sb] = HG.sheenBuf(q.t, q.k, q.seed, q.base), [cb, cx2] = L.buf('hgWallBg', 540, 960);
    cx2.drawImage(sb, 0, BY0 / 4, 270, (BY1 - BY0) / 4, 0, BY0 / 2, 540, (BY1 - BY0) / 2); cx2.drawImage(bb, 0, BY0 / 2, 540, (BY1 - BY0) / 2, 0, BY0 / 2, 540, (BY1 - BY0) / 2);
    blitBand(ctx, cb, 2); return;
  }
  blitBand(ctx, bb, 2);
};
// additive light layers (cone, glows) drawn at half resolution and added once
HG.light = function (ctx, draw) {
  const M = ctx.getTransform(), [bb, x] = L.buf('hgLight', 360, 640);
  x.clearRect(0, 0, 360, 640); x.setTransform(M.a / 3, M.b / 3, M.c / 3, M.d / 3, M.e / 3, M.f / 3); draw(x);
  blitBand(ctx, bb, 3, 'lighter');
};
// volumetric cone + lamp
HG.cone = function (ctx, t, b, { lamp = 1 } = {}) {
  if (b.a <= 0) return;
  const { x, y, ang, spread, len, a } = b;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [sp, al] of [[spread * 1.25, .05], [spread * .8, .085], [spread * .38, .085]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, rgba('#e8f6ff', al * a)); g.addColorStop(.3, rgba('#cfeaff', al * .55 * a)); g.addColorStop(.75, rgba('#9fd2f0', al * .16 * a)); g.addColorStop(1, 'rgba(150,210,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - sp, ang + sp); ctx.closePath(); ctx.fill();
  }
  // shafts of denser murk inside the beam
  for (let i = 0; i < 6; i++) {
    const k = (hi(i * 3 + 1) - .5) * 1.7 * spread, w = spread * (.04 + .07 * hi(i * 5 + 2)), al = a * .05 * (.35 + .65 * (.5 + .5 * nz(t * .45 + i * 3.1, 40 + i)));
    const aa = ang + k, L2 = len * (.55 + .4 * hi(i * 7));
    const g = ctx.createLinearGradient(x, y, x + Math.cos(aa) * L2, y + Math.sin(aa) * L2); g.addColorStop(0, rgba('#e8f6ff', al)); g.addColorStop(1, 'rgba(232,246,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa - w) * L2, y + Math.sin(aa - w) * L2); ctx.lineTo(x + Math.cos(aa + w) * L2, y + Math.sin(aa + w) * L2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (lamp > 0) { glow(ctx, x, y, 230, '#bfe6ff', .3 * a * lamp); glow(ctx, x, y, 70, '#ffffff', .85 * a * lamp);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, .07); glow(ctx, 0, 0, 380, '#cfeaff', .22 * a * lamp); ctx.restore(); }
};
// suspended silt, lit by the beam. tm = motion clock (freezes on impacts). push = {x,y,k}: blown away from a point
HG.silt = function (ctx, tm, b, { n = 170, seed = 3, area = [-120, 420, 1320, 980], ambient = .05, push = null, sizeK = 1, speed = 1 } = {}) {
  const [ax, ay, aw, ah] = area, dot = dotSprite();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = hi(i * 7 + seed), vx = (hi(i * 3 + seed) - .4) * 14 * speed, vy = (hi(i * 5 + seed) - .55) * 10 * speed;
    let x = ax + ((hi(i * 11 + seed) * aw + tm * vx + fb(tm * .12 + i, seed) * 50) % aw + aw) % aw;
    let y = ay + ((hi(i * 13 + seed) * ah + tm * vy + fb(tm * .1 + i * 2, seed + 1) * 40) % ah + ah) % ah;
    if (push && push.k > 0) { const dx = x - push.x, dy = y - push.y, d = Math.hypot(dx, dy) + 1; const f = push.k * 160 * Math.exp(-d / 260); x += dx / d * f; y += dy / d * f; }
    const I = HG.beamI(b, x, y) + ambient; const al = clamp(I * (.35 + .65 * z)) * (.55 + .45 * Math.sin(tm * 1.7 + i));
    if (al < .02) continue;
    const r = (1.1 + 2.6 * z * z) * sizeK;
    ctx.globalAlpha = al; ctx.drawImage(dot, x - r * 2, y - r * 2, r * 4, r * 4);
  }
  ctx.restore();
};
// a few big out-of-focus motes near the lens (screen space)
HG.bokeh = function (ctx, tm, b, M, { n = 9, seed = 21, a = .5 } = {}) {
  const dot = dotSprite(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sx = ((hi(i * 3 + seed) * 1300 + tm * (8 + 14 * hi(i)) + fb(tm * .1 + i, seed) * 80) % 1300) - 110, sy = 480 + ((hi(i * 5 + seed) * 760 - tm * 6 + fb(tm * .08 + i, seed + 3) * 60) % 760 + 760) % 760;
    const inv = M.inverse().transformPoint(new DOMPoint(sx, sy)); const I = HG.beamI(b, inv.x, inv.y) + .03;
    const r = 26 + 44 * hi(i * 9 + seed); ctx.globalAlpha = clamp(I * a * (.4 + .6 * hi(i * 13)));
    if (ctx.globalAlpha < .01) continue; ctx.drawImage(dot, sx - r, sy - r, r * 2, r * 2);
  }
  ctx.restore();
};
// breath bubbles: a stream that starts at t0 from (x, y) and drifts up (world). k = how many
HG.bubbles = function (ctx, t, t0, { x, y, n = 26, seed = 5, b = null, spread = 50, rise = 300, drift = 60, a = .9, life = 1.6, size = 1 }) {
  if (t < t0) return;
  ctx.save(); ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const st = t0 + hi(i * 3 + seed) * life * .6, u = t - st; if (u < 0) continue;
    const L2 = life * (.7 + .5 * hi(i * 7 + seed)), q = u / L2; if (q > 1) continue;
    const bx = x + (hi(i * 11 + seed) - .5) * spread + drift * q + Math.sin(u * 7 + i) * 6 * q, by = y - rise * (q * (.7 + .3 * q)) * (.7 + .6 * hi(i * 13 + seed));
    const r = (3 + 9 * Math.pow(hi(i * 17 + seed), 2)) * (1 + .5 * q) * size, I = b ? HG.beamI(b, bx, by) : .5, al = a * clamp(.25 + 1.4 * I) * (1 - q) * Math.min(1, u * 12);
    if (al < .02) continue;
    ctx.strokeStyle = rgba('#e3f6ff', al); ctx.beginPath(); ctx.ellipse(bx, by, r, r * .86, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', al * .7); ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .35, r * .28, 0, 7); ctx.fill();
  }
  ctx.restore();
};

// ---------- hands: skeletal silhouettes ----------
function xf(o) { const c = Math.cos(o.ang), s = Math.sin(o.ang), m = o.mir || 1; return (u, v) => [o.x + (u * c - v * m * s) * S, o.y + (u * s + v * m * c) * S]; }
function chaikin(pts, ws, it = 2) {
  for (let k = 0; k < it; k++) {
    const np = [pts[0]], nw = [ws[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      np.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); nw.push(ws[i] * .75 + ws[i + 1] * .25);
      np.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); nw.push(ws[i] * .25 + ws[i + 1] * .75);
    }
    np.push(pts[pts.length - 1]); nw.push(ws[ws.length - 1]); pts = np; ws = nw;
  }
  return [pts, ws];
}
function chaikinClosed(pts, it = 2) {
  for (let k = 0; k < it; k++) { const np = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; np.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } pts = np; }
  return pts;
}
// outline of a tapering tube along pts (screen px), round cap at the end, flat at the base
function tubeOutline(pts, ws, roundBase = false) {
  const n = pts.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = ws[i] / 2; Lf.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rt.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const e = pts[n - 1], p = pts[Math.max(0, n - 2)], ang = Math.atan2(e[1] - p[1], e[0] - p[0]), r = ws[n - 1] / 2, out = Lf.slice();
  for (let k = 1; k < 12; k++) { const q = ang + Math.PI / 2 - k / 12 * Math.PI; out.push([e[0] + Math.cos(q) * r, e[1] + Math.sin(q) * r]); }
  for (let i = n - 1; i >= 0; i--) out.push(Rt[i]);
  if (roundBase) { const b0 = pts[0], b1 = pts[1], a0 = Math.atan2(b0[1] - b1[1], b0[0] - b1[0]), r0 = ws[0] / 2; for (let k = 1; k < 12; k++) { const q = a0 + Math.PI / 2 - k / 12 * Math.PI; out.push([b0[0] + Math.cos(q) * r0, b0[1] + Math.sin(q) * r0]); } }
  return out;
}
function area(pts) { let a = 0; for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
const orient = pts => (area(pts) < 0 ? pts.slice().reverse() : pts);
function centroid(pts) { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; }
// finger chain in local cm: base B, direction phi (from +u toward +v), visible segment lengths, in-plane bends -> screen outline
function finger(X, B, phi, ls, ws, kb, roundBase = false) {
  const P0 = [[B[0], B[1]]], wv = [ws[0]]; let a = phi, u = B[0], v = B[1];
  for (let i = 0; i < ls.length; i++) { if (ls[i] <= .03) break; a += kb[i] || 0; u += Math.cos(a) * ls[i]; v += Math.sin(a) * ls[i]; P0.push([u, v]); wv.push(ws[i + 1]); }
  if (P0.length < 2) { P0.push([u + Math.cos(a) * .05, v + Math.sin(a) * .05]); wv.push(ws[1]); }
  const sp = P0.map(q => X(q[0], q[1]));
  const [pp, ww] = chaikin(sp, wv.map(w => w * S), 2);
  return orient(tubeOutline(pp, ww, roundBase));
}
// diver's neoprene glove (dorsal view; mir 1 -> thumb toward screen-down when pointing right). Local cm: u -> fingertips.
const GLOVE = {
  palm: [[-.6, -4.15], [2.2, -4.3], [5.5, -4.95], [8.6, -5.05], [9.9, -4.3], [10.5, -2.4], [10.6, 0], [10.4, 2.4], [9.8, 4.3], [7.6, 5.15], [5.0, 5.45], [2.5, 4.95], [.6, 4.2], [-.6, 4.15]],
  fingers: [
    { B: [8.9, -3.7], phi: -.2, l: [3.3, 2.1, 2.0], w: [2.45, 2.32, 2.22, 2.08] },
    { B: [9.9, -1.35], phi: -.08, l: [4.0, 2.6, 2.1], w: [2.65, 2.52, 2.4, 2.24] },
    { B: [10.2, 1.0], phi: .03, l: [4.3, 2.8, 2.2], w: [2.72, 2.58, 2.45, 2.28] },
    { B: [9.6, 3.3], phi: .15, l: [3.9, 2.4, 2.1], w: [2.62, 2.5, 2.38, 2.22] },
  ],
  thumb: { B: [2.6, 3.4], phi: .62, l: [4.0, 3.1, 2.7], w: [3.4, 2.95, 2.7, 2.42] },
};
// bare right hand, PALM view (mir 1 -> thumb on the screen-right when pointing up). The hand comes from behind the glove.
const BARE = {
  arm: [[-34, -4.7], [-22, -4.3], [-11, -3.65], [-3.2, -3.0], [.4, -2.86], [.4, 2.86], [-3.2, 3.05], [-11, 3.75], [-22, 4.4], [-34, 4.8]],
  palm: [[.2, -2.86], [1.9, -3.5], [4.3, -3.95], [6.9, -4.02], [8.35, -3.68], [9.2, -2.62], [9.78, -1.12], [10.08, .48], [9.92, 2.1], [9.4, 3.12], [8.1, 3.55], [6.3, 3.7], [4.3, 3.95], [2.3, 3.6], [.9, 3.05], [.2, 2.86]],
  fingers: [
    { B: [8.4, -2.72], phi: -.12, l: [3.5, 2.1, 1.85], w: [1.66, 1.52, 1.4, 1.22] },
    { B: [9.45, -.92], phi: -.045, l: [4.25, 2.75, 2.05], w: [1.84, 1.7, 1.55, 1.34] },
    { B: [9.85, .98], phi: .02, l: [4.5, 2.95, 2.15], w: [1.92, 1.78, 1.62, 1.4] },
    { B: [9.35, 2.82], phi: .1, l: [4.1, 2.55, 2.05], w: [1.88, 1.72, 1.58, 1.36] },
  ],
  thumb: { B: [1.2, 2.0], phi: .8, l: [4.6, 3.3, 2.75], w: [3.0, 2.4, 2.12, 1.82] },
};
// glove pose g = {x, y, ang, sp (finger spread 0..1), cg (finger flex 0..1), wig (0..1 searching wiggle), t}
function gloveParts(g) {
  const X = xf({ x: g.x, y: g.y, ang: g.ang, mir: 1 }), parts = [];
  const sleeve = []; for (let i = 0; i <= 14; i++) { const u = lerp(-2.0, -38, i / 14); sleeve.push(X(u, -lerp(5.6, 6.8, i / 14) - .32 * Math.sin(i * 2.1 + 1))); }
  for (let i = 14; i >= 0; i--) { const u = lerp(-2.0, -38, i / 14); sleeve.push(X(u, lerp(5.7, 7.0, i / 14) + .3 * Math.sin(i * 1.7))); }
  parts.push({ k: 'sleeve', pts: orient(chaikinClosed(sleeve, 1)) });
  const fl = GLOVE.fingers.map((f, i) => {
    const w = g.wig ? nz((g.t || 0) * 1.6 + i * 1.3, 30 + i) * g.wig : 0, c = clamp((g.cg || 0) + w * .25);
    const a1 = c * .55, a2 = a1 + c * .8, a3 = a2 + c * .6;
    const ls = [f.l[0] * Math.cos(a1), f.l[1] * Math.max(0, Math.cos(a2)), f.l[2] * Math.max(0, Math.cos(a3))];
    return { k: 'f' + i, pts: finger(X, f.B, f.phi * lerp(.55, 1.6, g.sp || 0) + w * .05, ls, f.w, [0, .05 + .08 * c, .05 + .06 * c]) };
  });
  fl.forEach(f => parts.push(f));
  parts.push({ k: 'palm', pts: orient(chaikinClosed(GLOVE.palm.map(q => X(q[0], q[1])), 2)) });
  const T = GLOVE.thumb, tc = clamp(g.cg || 0);
  parts.push({ k: 'thumb', pts: finger(X, T.B, T.phi - .12 * tc, [T.l[0], T.l[1] * Math.cos(tc * .5), T.l[2] * Math.cos(tc * .9)], T.w, [0, -.26, -.2]) });
  const ring = []; for (const [u, v] of [[-2.6, -5.15], [-.5, -5.15], [-.5, 5.15], [-2.6, 5.15]]) ring.push(X(u, v));
  parts.push({ k: 'ring', pts: orient(chaikinClosed(ring, 2)) });
  return { parts, X };
}
// capsule between two screen points (round caps at both ends)
function capsule(p0, p1, w0, w1) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1e-3, a = Math.atan2(dy, dx), out = [];
  for (let k = 0; k <= 12; k++) { const q = a + Math.PI / 2 + k / 12 * Math.PI; out.push([p0[0] + Math.cos(q) * w0 / 2, p0[1] + Math.sin(q) * w0 / 2]); }
  for (let k = 0; k <= 12; k++) { const q = a - Math.PI / 2 + k / 12 * Math.PI; out.push([p1[0] + Math.cos(q) * w1 / 2, p1[1] + Math.sin(q) * w1 / 2]); }
  void l; return orient(out);
}
// the glove's upper / lower contour (local v) at local u: sleeve, cuff ring, wrist, palm
function topV(u) { return u < -2.6 ? -5.62 : u < -.5 ? -5.18 : u < 2.2 ? lerp(-4.15, -4.3, (u + .5) / 2.7) : lerp(-4.3, -4.95, clamp((u - 2.2) / 3.3)); }
function botV(u) { return u < -2.6 ? 5.72 : u < -.5 ? 5.18 : u < 2.5 ? lerp(4.15, 4.9, clamp((u + .5) / 3)) : 5.3; }
function toLocal(g, p) { const c = Math.cos(g.ang), s2 = Math.sin(g.ang), dx = p[0] - g.x, dy = p[1] - g.y; return [(dx * c + dy * s2) / S, (-dx * s2 + dy * c) / S]; }
// distance (cm) along screen direction d from screen point M until the glove edge (top or bottom) is crossed; null if not
function edgeReach(g, M, d, top = true, maxS = 9) {
  const f = s2 => { const q = toLocal(g, [M[0] + d[0] * s2 * S, M[1] + d[1] * s2 * S]); return top ? q[1] - topV(q[0]) : botV(q[0]) - q[1]; };
  if (f(0) * f(maxS) > 0) return null; let lo = 0, hi2 = maxS;
  for (let k = 0; k < 18; k++) { const m = (lo + hi2) / 2; if (f(lo) * f(m) <= 0) hi2 = m; else lo = m; }
  return (lo + hi2) / 2;
}
// capsule between two screen points (round caps at both ends)
function capsule(p0, p1, w0, w1) {
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), out = [];
  for (let k = 0; k <= 12; k++) { const q = a + Math.PI / 2 + k / 12 * Math.PI; out.push([p0[0] + Math.cos(q) * w0 / 2, p0[1] + Math.sin(q) * w0 / 2]); }
  for (let k = 0; k <= 12; k++) { const q = a - Math.PI / 2 + k / 12 * Math.PI; out.push([p1[0] + Math.cos(q) * w1 / 2, p1[1] + Math.sin(q) * w1 / 2]); }
  return orient(out);
}
// where the bare hand sits when the grip is locked (wrist origin, angle): the middle finger's PIP knuckle on the glove's top edge
const OK_ANG = -1.98, GRIP_U = -1.3, MIR = -1;           // a LEFT hand seen from its palm side: thumb toward the screen-left
function gripPose(g) {
  const Xg = xf({ x: g.x, y: g.y, ang: g.ang, mir: 1 });
  const top = Xg(GRIP_U, topV(GRIP_U) - .12);
  const d = [Math.cos(OK_ANG), Math.sin(OK_ANG)], ev = [MIR * -Math.sin(OK_ANG), MIR * Math.cos(OK_ANG)];
  const M = [top[0] - d[0] * 4.3 * S, top[1] - d[1] * 4.3 * S];
  return { x: M[0] - d[0] * 9.85 * S - ev[0] * .98 * S, y: M[1] - d[1] * 9.85 * S - ev[1] * .98 * S, ang: OK_ANG };
}
HG.gripPose = gripPose;
// bare hand pose h = {x, y, ang, open (0..1 spread), curl (0..1 grip)} relative to glove g.
// back (drawn before the glove): forearm, palm, straight fingers / proximal phalanges. front (after the glove): the finger
// hooks folded over the glove's top edge toward us, and the thumb hooking up from below.
function bareParts(h, g) {
  const X = xf({ x: h.x, y: h.y, ang: h.ang, mir: MIR }), front = [], back = [];
  const curl = clamp(h.curl || 0), open = clamp(h.open == null ? 1 : h.open), ce = E.inOutQ(curl);
  back.push({ k: 'arm', pts: orient(chaikinClosed(BARE.arm.map(q => X(q[0], q[1])), 2)) });
  const hooks = [];
  BARE.fingers.forEach((f, i) => {
    const phi = f.phi * lerp(1, 1.55, open) * (1 - .8 * curl) - .025 * curl * (i - 1.5);
    if (curl <= .001) { back.push({ k: 'f' + i, pts: finger(X, f.B, phi, [f.l[0] * .99, f.l[1] * .96, f.l[2] * .92], f.w, [0, .03, .04]) }); return; }
    let reach = f.l[0];
    if (g) {
      const Mb = X(f.B[0], f.B[1]), dv = X(f.B[0] + Math.cos(phi), f.B[1] + Math.sin(phi)), dl = Math.hypot(dv[0] - Mb[0], dv[1] - Mb[1]);
      const r = edgeReach(g, Mb, [(dv[0] - Mb[0]) / dl, (dv[1] - Mb[1]) / dl], true, 8);
      if (r != null) reach = clamp(r - .25, 2.2, f.l[0] + 1.4);
    }
    const lp = lerp(f.l[0], reach, ce), b1 = curl * 1.85, b2 = b1 + curl * 1.3;      // PIP / DIP fold toward the viewer
    back.push({ k: 'f' + i, pts: finger(X, f.B, phi, [lp, Math.max(0, f.l[1] * Math.cos(b1)), Math.max(0, f.l[2] * Math.cos(b2))], f.w, [0, 0, 0]) });
    if (curl > .3) {   // folded part (in front of the glove): knuckle on the edge, middle + distal phalanx down the face
      const pu = f.B[0] + Math.cos(phi) * lp, pv = f.B[1] + Math.sin(phi) * lp, k = E.outQ(P(curl, .3, .85));
      const dn = phi + Math.PI + .06 * (i - 1.5), m2 = f.l[1] * .7 * k, m3 = f.l[2] * .95 * k, bend = -.22 * k;
      const q1 = [pu + Math.cos(dn) * m2, pv + Math.sin(dn) * m2], q2 = [q1[0] + Math.cos(dn + bend) * m3, q1[1] + Math.sin(dn + bend) * m3];
      const sp = [X(pu, pv), X(q1[0], q1[1]), X(q2[0], q2[1])], [pp, ww] = chaikin(sp, [f.w[1] * S * 1.02, f.w[2] * S * .98, f.w[3] * S * .9], 2);
      hooks.push({ k: 'h' + i, pts: orient(tubeOutline(pp, ww, true)), rk: 1.1 });
    }
  });
  back.push({ k: 'palm', pts: orient(chaikinClosed(BARE.palm.map(q => X(q[0], q[1])), 2)) });
  const T = BARE.thumb, tph = lerp(lerp(.66, .78, open), .5, ce), tk = 1 - .18 * (1 - curl) * open;
  (curl > .55 ? front : back).push({ k: 'thumb', pts: finger(X, T.B, tph, [T.l[0] * (1 - .1 * curl), T.l[1] * Math.cos(curl * .6) * tk, T.l[2] * Math.cos(curl * 1.15) * tk], T.w, [0, -.22 - .28 * curl, -.18 - .44 * curl], true) });
  hooks.forEach(q => front.push(q));
  return { front, back, X };
}
HG.gloveParts = gloveParts; HG.bareParts = bareParts;
function pathOf(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
// rim-lit silhouette: each part gets a rim on its light-facing edge (dark fill shifted away from the light)
function drawSil(ctx, parts, b, { fill = '#030405', rim = '#d6efff', rimK = 1, rimMin = .06, off = 3.2, halo = 0, haloC = '#9fd8ff', fills = null } = {}) {
  if (!parts.length) return;
  const c0 = centroid(parts[0].pts); let lx = c0[0] - b.x, ly = c0[1] - b.y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
  if (halo > 0) { const p = new Path2D(); parts.forEach(q => p.addPath(pathOf(q.pts))); ctx.save(); ctx.shadowColor = rgba(haloC, clamp(halo)); ctx.shadowBlur = 14; ctx.fillStyle = fill; ctx.fill(p); ctx.restore(); }
  for (const q of parts) {
    const p = pathOf(q.pts), c = centroid(q.pts), ra = clamp((rimMin + 1.5 * HG.beamI(b, c[0], c[1])) * rimK * (q.rk == null ? 1 : q.rk));
    if (ra > .01) { ctx.fillStyle = rgba(rim, ra); ctx.fill(p); }
    ctx.save(); ctx.translate(lx * off, ly * off); ctx.fillStyle = (fills && fills[q.k]) || fill; ctx.fill(p); ctx.restore();
  }
}
// draw the pair: bare thumb (behind the glove) -> glove -> bare arm/palm/fingers. o: {g, h (or null), b, gloveA, bareRim, halo}
HG.hands = function (ctx, o) {
  const { g, h, b } = o;
  const gp = gloveParts(g), bp = h ? bareParts(h, g) : null;
  const vis = h ? clamp(h.vis == null ? 1 : h.vis) : 0;
  if (bp && vis > 0) { ctx.save(); ctx.globalAlpha *= vis; drawSil(ctx, bp.back, b, { rimK: o.bareRim == null ? 1 : o.bareRim, rimMin: .03, halo: o.bareHalo || 0, haloC: '#a8dcff' }); ctx.restore(); }
  // glove: slate neoprene, lit from the lamp side
  const gc = gp.X(4, -2), gl = o.gloveLit == null ? 1 : o.gloveLit, gg = ctx.createLinearGradient(gc[0] - 220, gc[1] - 160, gc[0] + 160, gc[1] + 200);
  gg.addColorStop(0, '#4a5f6a'); gg.addColorStop(.4, '#2a3a43'); gg.addColorStop(1, '#0e171c');
  const sg = ctx.createLinearGradient(gc[0] - 600, gc[1] - 200, gc[0], gc[1] + 100); sg.addColorStop(0, '#0b1216'); sg.addColorStop(1, '#2a3943');
  drawSil(ctx, gp.parts, b, { fill: gg, fills: { sleeve: sg, ring: '#56656d' }, rim: '#cfeaff', rimK: o.gloveRim == null ? 1 : o.gloveRim, rimMin: .05, halo: 0 });
  // cuff ring highlight + stitched seams along the glove fingers
  { const A = gp.X(-2.6, -5.0), B2 = gp.X(-.5, -5.0), I = clamp(.15 + 1.6 * HG.beamI(b, A[0], A[1]));
    ctx.save(); ctx.strokeStyle = rgba('#e6f5ff', .55 * I); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B2[0], B2[1]); ctx.stroke();
    const C1 = gp.X(-1.55, -5.0), C2 = gp.X(-1.55, 5.0); ctx.strokeStyle = rgba('#000000', .55); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(C1[0], C1[1]); ctx.lineTo(C2[0], C2[1]); ctx.stroke();
    // sleeve folds
    ctx.strokeStyle = rgba('#a9c9d8', .08 * I); ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) { const u = -6 - k * 5.5, p0 = gp.X(u, -5.6), p1 = gp.X(u - 2.2, 0), p2 = gp.X(u + .5, 5.8); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke(); }
    ctx.restore(); }
  if (bp && vis > 0) {
    ctx.save(); ctx.globalAlpha *= vis;
    drawSil(ctx, bp.front, b, { rimK: o.bareRim == null ? 1 : o.bareRim, rimMin: .03 });
    ctx.restore();
  }
  return { gp, bp };
};
// motion smear for a fast move: rim-coloured ghosts of the bare hand at earlier poses
HG.smear = function (ctx, poses, g, a = .2) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  poses.forEach((h, i) => { const bp = bareParts(h, g); const p = new Path2D(); bp.front.concat(bp.back).forEach(q => p.addPath(pathOf(q.pts))); ctx.strokeStyle = rgba('#bfe4f7', a * (1 - i / poses.length) * .55); ctx.lineWidth = 2.5 + 2 * i; ctx.stroke(p); });
  ctx.restore();
};
// camera with the focal centre at screen (540, 860); low-frequency shake (max ~6 px per frame)
HG.cam = function (ctx, cx, cy, z, rot, sx, sy) { ctx.translate(540 + sx, 860 + sy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-cx, -cy); };
HG.shake = (t, k, seed = 1) => [k * (nz(t * 7, seed) * 17 + nz(t * 21, seed + 5) * 2.5), k * (nz(t * 7, seed + 2) * 17 + nz(t * 21, seed + 7) * 2.5), k * nz(t * 5, seed + 3) * .008];
HG.iris = function (ctx, k, pulse, cx = 540, cy = 860) {
  if (k <= 0) return;
  const r0 = H * lerp(.42, .1, k) * (1 + .06 * pulse), r1 = r0 + H * lerp(.5, .3, k), [bb, x] = L.buf('hgIris', 270, 480);
  x.clearRect(0, 0, 270, 480); x.scale(.25, .25);
  const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.42 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  x.fillStyle = g; x.fillRect(0, BY0 - 8, W, BY1 - BY0 + 16);
  blitBand(ctx, bb, 4);
};
// keep the subtitle band quiet
HG.subBand = function (ctx, a = .86) {
  const g = ctx.createLinearGradient(0, 1150, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${a})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 1150, W, 140); ctx.fillStyle = `rgba(1,2,3,${a})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
};
// warm heartbeat glow of the man in the dark (behind the hands)
HG.heart = function (ctx, x, y, a, bt, r = 1) {
  if (a <= 0) return;
  glow(ctx, x, y, 420 * r * (1 + .08 * bt), '#ff9a3c', (.09 + .08 * bt) * a);
  glow(ctx, x, y, 170 * r * (1 + .12 * bt), '#ffb347', (.12 + .16 * bt) * a);
};

// =====================================================================================================
window.PK.scenes.hook = function (ctx, t, d, info) {
  const { at, chip, beat } = PK;
  const D = info.sc.data || {};
  const tJa = at(info, '잠수부의', .22), tSo = at(info, '손을', .36), tNu = at(info, '누군가', .57), tI = at(info, '붙잡았습니다', .72);
  const tL = tI - .19;                                              // the hand leaves the dark
  const tm = t < tI ? t : t < tI + .32 ? tI : tI + (t - tI - .32) * .5;   // motion clock: freezes on the impact
  const after = P(t, tI, tI + .05), relax = P(t, tI + .32, tI + 1.4, E.inOutQ);

  // ---- camera ----
  const push = P(t, -.2, tSo + .5, E.inOutQ), push2 = P(t, tSo + .3, tI, E.inOutQ);
  let cx = lerp(340, 430, push), cy = lerp(850, 875, push), z = lerp(1.12, 1.22, push);
  cx = lerp(cx, 478, push2); cy = lerp(cy, 900, push2); z = lerp(z, 1.4, push2);
  z *= 1 + .085 * Math.exp(-Math.max(0, t - tI) * 6) * after + .05 * P(t, tI + .3, d + .3, E.inOutQ);
  const dr = { x: fb(t * .35, 41) * 14, y: fb(t * .3, 50) * 14, r: fb(t * .25, 45) * .006 };
  const shk = .45 * Math.exp(-Math.max(0, t - tI) * 4.2) * after + .04;
  const [sx, sy, sr] = HG.shake(t, shk, 3);
  const jolt = after * Math.exp(-Math.max(0, t - tI) * 14) * 14;   // one hard downward jolt on the grab

  HG.darkFast(ctx, t, .55, 3, '#010203', true);
  ctx.save();
  HG.cam(ctx, cx, cy, z, dr.r + sr, sx + dr.x, sy + dr.y + jolt);
  const M = ctx.getTransform();

  // ---- beam: drifts over the plating, swings onto the doorway on '손을', jerks when the hand grabs ----
  const bob = fb(t * .4, 60) * 9;
  const aim = lerp(lerp(.7, .64, P(t, 0, tJa, E.inOutQ)), .58, P(t, tJa, tSo + .35, E.inOutQ)) + fb(tm * .5, 61) * .035 - .075 * P(t, tI, tI + .06) * (1 - .7 * relax);
  const b = { x: LAMP.x + fb(t * .3, 62) * 8, y: LAMP.y + bob, ang: aim, spread: .3, len: 1180, a: 1 - .05 * (.5 + .5 * nz(t * 11, 63)) };

  HG.wall(ctx, b, { amb: .06, gain: 1.15 });

  // ---- glove: already reaching into the black doorway on the first frame (searching), slides deeper through '잠수부의',
  // reaches into the dark on '손을', yanked on the grab ----
  const enter = P(t, -1.0, tSo + .15, E.outC), creep = P(t, tSo, tI, E.inOutQ);
  const yank = after * (1 - .55 * relax), back = P(t, tI + .25, tI + .9, E.inOutQ) * .6;
  const gu = -(1 - enter) * 54 - (1 - creep) * 3.2 + yank * .9 - back;
  const ga = G0.ang + (1 - enter) * .12 + .05 * yank;
  const g = { x: G0.x + Math.cos(ga) * gu * S - Math.sin(ga) * yank * 9, y: G0.y + Math.sin(ga) * gu * S + Math.cos(ga) * yank * 14, ang: ga, sp: .5 + .15 * fb(tm * 1.1, 70) - .2 * after, cg: .18 + .12 * fb(tm * .9, 71) + .2 * after, wig: (1 - after) * .9, t: tm };
  // ---- bare hand: out of the dark toward the glove, clamps on the word ----
  const lock = gripPose(g);
  const q = P(t, tL, tI - .03, E.outExpo);
  const far = { x: lock.x + Math.cos(lock.ang) * -30 * S, y: lock.y + Math.sin(lock.ang) * -30 * S };
  const hpose = tt => { const qq = P(tt, tL, tI - .03, E.outExpo); return { x: lerp(far.x, lock.x, qq), y: lerp(far.y, lock.y, qq), ang: lock.ang + .25 * (1 - qq), open: 1, curl: P(tt, tI - .1, tI + .015, E.outQ), vis: 1 }; };
  const h = t >= tL - .02 ? hpose(t) : null;

  // ---- him, before he is seen: on '누군가' a warm heartbeat throbs twice in the dark below the glove, right where his hand
  // will come from; it travels in with the hand and then beats behind the grip ----
  const bt = beat(t, 96);
  const thump = (c, w = .065) => Math.exp(-Math.pow((t - c) / w, 2));
  const pre = P(t, tNu - .2, tNu + .05, E.inOutQ) * (.7 + 1.9 * (thump(tNu + .04) + .85 * thump(tNu + .26)));
  const glowA = pre * (1 - .35 * q) * (1 - after) + after * (.5 + .5 * bt) * lerp(1.2, .8, relax);
  const gP = gripPose({ x: G0.x, y: G0.y, ang: G0.ang });
  const pX = lock.x + 7.8 * S, pY = lock.y + 4.4 * S;          // the dark under the glove's fingers (screen ~ 830, 1130), on his hand's way in
  const hk = Math.max(q, after), hx = lerp(pX, gP.x + 40, hk), hy = lerp(pY, gP.y + 40, hk);
  const hb = after > 0 ? bt : lerp(thump(tNu + .04) + .85 * thump(tNu + .26), bt, q);
  HG.light(ctx, x => { HG.heart(x, hx, hy, glowA, hb, lerp(.8, 1.15, hk)); HG.cone(x, t, b); });
  HG.silt(ctx, tm, b, { n: 190, seed: 3, push: { x: G0.x + 60, y: G0.y + 40, k: P(t, tI, tI + 1.4, E.outQ) * .5 } });

  // smear only while the hand travels (two soft ghosts); gone before the fingers curl, so no extra fingers on the clamp
  const smA = .45 * (1 - q * .4) * (1 - P(t, tI - .12, tI - .06));
  if (h && smA > .005) HG.smear(ctx, [hpose(t - .025), hpose(t - .05)], g, smA);
  const rimUp = lerp(.35, 1.15, q) + .35 * Math.exp(-Math.max(0, t - tI) * 4) * after;
  HG.hands(ctx, { g, h, b, bareRim: rimUp, bareHalo: .35 * q + .2 * after, gloveHalo: .12 });

  // breath bursting from the helmet when the hand grabs (rises through the top of the beam)
  // the diver's air: a thin trickle from the suit valve on his arm, a burst when the hand grabs
  const vx = g.x - Math.cos(g.ang) * 15 * S, vy = g.y - Math.sin(g.ang) * 15 * S - 5.6 * S;
  HG.bubbles(ctx, t, -1.5, { x: vx, y: vy, n: 10, seed: 4, b, spread: 26, rise: 330, drift: 30, life: 2.6, a: .55, size: .8 });
  HG.bubbles(ctx, t, tI + .05, { x: vx + 40, y: vy, n: 38, seed: 9, b, spread: 90, rise: 520, drift: 60, life: 1.7, size: 1.3 });
  ctx.restore();

  HG.bokeh(ctx, tm, b, M, { n: 8, a: .32 });
  // tunnel vision: tightens as the beam closes in on the doorway, beats once hard on the grab
  HG.iris(ctx, lerp(.3, .5, P(t, tSo, tI, E.inOutQ)) - .14 * after * Math.exp(-Math.max(0, t - tI) * 3), .6 * bt, 560, 880);
  HG.subBand(ctx);

  // content warning: from the first frames, gone before the grab
  chip(ctx, D.warning || '', 540, 492, P(t, .04, .3) * (1 - P(t, 2.3, 2.6)), { size: 34, color: '#ffd9a0', border: 'rgba(255,180,90,.45)' });
  // freeze-frame jolt: cold flash + a thin exposure band
  flash(ctx, .5 * Math.exp(-Math.max(0, t - tI) * 13) * after, '#e2f5ff');
};
})();
