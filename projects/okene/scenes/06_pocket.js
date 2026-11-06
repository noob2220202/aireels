// pocket (≈29.22-35.09): "물 위로 1미터 남짓 공기가 남아 있었고, 그는 뒤집힌 세면대를 붙잡고 버텼습니다."
// Cross-section of the small upside-down toilet (the old floor is the ceiling: floor tiles and skirting at the top,
// the WC and the washbasin hang upside down, the door handle and louvre sit near the top, the dome lamp is under water).
// The camera starts on swept's landing frame and pushes in at once to frame the air gap, not the room; from '그는' it closes
// in on the basin until the old floor sits just under the title and the subtitle band cuts the water (cold opens there).
// '물 위로': a cold glint runs along the waterline; '1미터': a dimension bracket rises from the water to the ceiling;
// '남짓': the approved air-gap chip; '공기가 남아': the air layer breathes. '뒤집힌': a ghost basin flips upside down into
// place; '세면대를': the basin is traced and tagged; '붙잡고': his light (never a body: no hand here) rises out of the water,
// drips running off, and presses against the end of the basin rim, which lights up warm where it holds on;
// '버텼습니다': heartbeat, tremble on the light, ripples, tunnel vision.
// This file also hosts the shared room kit (window.PK.okRoom) used by swept's last beat and by cold.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, hash, rng, noise1, fbm, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK;

// ======================================================================================================
// shared kit: the inverted toilet (world coords == pocket's base frame, camera centre (540, 850) zoom 1)
// ======================================================================================================
const RM = { x: 100, y: 500, w: 880, h: 700, wall: 26 }; RM.r = RM.x + RM.w; RM.b = RM.y + RM.h;
const LV0 = .54;                                    // pocket's water level (fraction of the room height from the bottom)
const lvY = lv => RM.b - lv * RM.h;
const SLAB = { x0: 845, x1: RM.r, y0: 718, y1: 732 }; // basin rim slab (its old top face now faces down at y1)
const BOWL = { x0: 860, x1: 964, top: 672 };          // the bowl now sits above the slab
const DOOR = { x0: 420, x1: 606, y0: RM.y + 16, y1: RM.y + 556 };
const GRIP = { x: 878, y: SLAB.y0, s: 1.42 };             // hand hooked over the slab's top edge (gripHand: kept in the kit, no longer used)
const RIM = { x: 838, y: SLAB.y1 + 13 };                  // his light pressed up against the end of the basin rim (beside the bowl, not under it)
const CAM_END = { x: 790, y: 760, z: 1.6 };          // pocket's final framing == cold's first framing (ceiling just under the title)

const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };

function surf(x, T, top, amp = 1) { return top + amp * (Math.sin(x * .021 + T * 1.3) * 3.4 + Math.sin(x * .057 - T * .9) * 1.7 + Math.sin(x * .009 - T * .55) * 2.2); }
// his light at rest beside the basin (bobbing with the water); k pushes it toward the basin as the water rises
function restLight(T, lv) {
  const top = lvY(lv), k = clamp((lv - LV0) / .11);
  return { x: lerp(832, 806, k) + Math.sin(T * .7) * 3, y: top - 14 + Math.sin(T * 1.25 + .6) * 3.2 };
}
// his light holding on at the basin rim: k 0 (resting at the waterline) .. 1 (pressed against the rim), tr = tremble
// (absolute time, so pocket's last frame and cold's first frame match)
function rimLight(T, k = 1, tr = 0) {
  const r = restLight(T, LV0), ke = clamp(k);
  return { x: lerp(r.x, RIM.x, ke) + tr * nz(T * 13, 5) * 1.6, y: lerp(r.y, RIM.y + Math.sin(T * 1.25 + .6) * 1.2, ke) + tr * nz(T * 13, 6) * 1.3 };
}
// the warm contact where his light presses against the rim slab's underside (world coords; a = strength 0..1)
function rimContact(ctx, T, x, y, a, warm = 1) {
  if (a <= 0) return;
  const k = clamp(a) * clamp(1 - Math.abs(y - RIM.y) / 40), col = PK.lerp2('#cfe2ea', '#ffc47e', warm), x0 = Math.max(SLAB.x0, x - 80), x1 = Math.min(SLAB.x1, x + 90);
  if (k <= 0 || x1 <= x0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, SLAB.y1 + 2); ctx.scale(1, .22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 110); g.addColorStop(0, rgba(col, .5 * k)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-110, -110, 220, 220); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createLinearGradient(x0, 0, x1, 0); gl.addColorStop(0, rgba('#fff0d6', 0)); gl.addColorStop(clamp((x - x0) / (x1 - x0)), rgba('#fff0d6', .75 * k)); gl.addColorStop(1, rgba('#fff0d6', 0));
  ctx.fillStyle = gl; ctx.fillRect(x0, SLAB.y1 - 1.5, x1 - x0, 3);
  if (x < SLAB.x0 + 20) { const ge = ctx.createLinearGradient(0, SLAB.y0, 0, SLAB.y1); ge.addColorStop(0, rgba('#fff0d6', .15 * k)); ge.addColorStop(1, rgba('#fff0d6', .6 * k)); ctx.fillStyle = ge; ctx.fillRect(SLAB.x0 - 1.5, SLAB.y0 + 2, 3, SLAB.y1 - SLAB.y0 - 2); }
  ctx.restore();
}
// handheld drift on absolute time (so neighbouring scenes line up across a fade)
function drift(T, amt = 1) { return { x: fb(T * .32, 41) * 12 * amt, y: fb(T * .27, 52) * 10 * amt, r: fb(T * .22, 63) * .005 * amt }; }
function camMatrix(cx, cy, z, rot = 0, sx = 0, sy = 0) { return new DOMMatrix().translate(540 + sx, 850 + sy).rotate(rot * 180 / Math.PI).scale(z).translate(-cx, -cy); }
function applyCam(ctx, M) { ctx.setTransform(ctx.getTransform().multiply(M)); }
function toS(M, x, y) { const p = M.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; }

// ---- cheaper PK.dark: oily sheen composed at quarter resolution ----
function sheenTexLite() {
  if (PK._sheenLite) return PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); PK._sheenLite = c; return c;
}
// under(x): optional painter for the quarter-res base (screen coords scaled by .25), e.g. a water gradient, before the sheen
function darkFast(ctx, t, { k = 1, seed = 1, base = '#010203', under = null } = {}) {
  const [b, x] = L.buf('okDarkFast', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  if (under) { x.save(); under(x); x.restore(); }
  if (k > 0) {
    const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + (t % 60) * (6 + l * 5);
      x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}

// ---- fixture outlines (world coords) ----
const CM = 2.7;  // px per cm
function wcPath() {  // upside-down WC against the left wall: u = cm from the wall, v = cm below the ceiling (old floor)
  const p = new Path2D(), X = u => RM.x + u * CM, Y = v => RM.y + v * CM;
  p.moveTo(X(17), Y(0)); p.lineTo(X(46), Y(0));
  p.bezierCurveTo(X(44), Y(9), X(42), Y(15), X(45), Y(21));        // pedestal waist
  p.bezierCurveTo(X(55), Y(25), X(64), Y(29), X(66), Y(36));        // bowl front
  p.lineTo(X(67), Y(41)); p.lineTo(X(21), Y(42));                    // seat (now underneath)
  p.lineTo(X(21), Y(80)); p.quadraticCurveTo(X(21), Y(83), X(18), Y(83)); p.lineTo(X(0), Y(83)); // cistern
  p.lineTo(X(0), Y(34)); p.bezierCurveTo(X(8), Y(30), X(16), Y(18), X(17), Y(0)); p.closePath();
  return p;
}
function basinPath() {   // slab + bowl (inverted) as one outline
  const p = new Path2D();
  p.moveTo(SLAB.x1, SLAB.y1); p.lineTo(SLAB.x0 + 4, SLAB.y1); p.quadraticCurveTo(SLAB.x0, SLAB.y1, SLAB.x0, SLAB.y1 - 4);
  p.lineTo(SLAB.x0, SLAB.y0 + 3); p.quadraticCurveTo(SLAB.x0, SLAB.y0, SLAB.x0 + 4, SLAB.y0); p.lineTo(BOWL.x0, SLAB.y0);
  p.bezierCurveTo(BOWL.x0 + 2, BOWL.top + 14, BOWL.x0 + 24, BOWL.top, (BOWL.x0 + BOWL.x1) / 2, BOWL.top);
  p.bezierCurveTo(BOWL.x1 - 24, BOWL.top, BOWL.x1 - 2, BOWL.top + 14, BOWL.x1, SLAB.y0);
  p.lineTo(SLAB.x1, SLAB.y0); p.closePath();
  return p;
}
function tapPath() {     // tap now hangs below the slab, its spout curling back up
  const p = new Path2D(), x = 946;
  p.moveTo(x - 7, SLAB.y1); p.lineTo(x - 7, SLAB.y1 + 34); p.quadraticCurveTo(x - 7, SLAB.y1 + 44, x - 18, SLAB.y1 + 44);
  p.lineTo(x - 34, SLAB.y1 + 44); p.lineTo(x - 34, SLAB.y1 + 36); p.lineTo(x - 18, SLAB.y1 + 36); p.quadraticCurveTo(x + 1, SLAB.y1 + 36, x + 1, SLAB.y1 + 26);
  p.lineTo(x + 7, SLAB.y1 + 26); p.lineTo(x + 7, SLAB.y1); p.closePath();
  return p;
}
let PATHS = null;
function paths() { if (!PATHS) PATHS = { wc: wcPath(), basin: basinPath(), tap: tapPath() }; return PATHS; }

// lit amount of a point by his light (0..1)
const litAt = (x, y, lx, ly, r = 430) => Math.exp(-((x - lx) * (x - lx) + (y - ly) * (y - ly)) / (2 * r * r));

// salt crystals (deterministic, generated once): {x, y, r, th, rot, n}
let SALT = null;
function saltList() {
  if (SALT) return SALT; const R = rng(77), a = [];
  const add = (x, y, th, r) => a.push({ x, y, th: clamp(th), r, rot: R() * 6.28, n: 4 + Math.floor(R() * 3), tw: R() });
  for (let i = 0; i < 125; i++) { const x = RM.x + R() * RM.w, d = Math.pow(R(), 2.6) * 46; add(x, RM.y + 1 + d, d / 46 * .65 + R() * .35, 1.6 + R() * 3.4); }                 // along the old floor
  for (let i = 0; i < 90; i++) { const sd = R() < .5, d = Math.pow(R(), 2.6) * 40, y = RM.y + Math.pow(R(), 1.4) * 300; add(sd ? RM.x + 1 + d : RM.r - 1 - d, y, d / 40 * .5 + (y - RM.y) / 300 * .35 + R() * .15, 1.6 + R() * 3); }
  for (let i = 0; i < 40; i++) { const x = SLAB.x0 + R() * (SLAB.x1 - SLAB.x0); add(x, SLAB.y1 + 1 + R() * 3, .1 + R() * .8, 1.3 + R() * 2.4); }               // basin rim
  for (let i = 0; i < 26; i++) { const u = R(); add(lerp(BOWL.x0, BOWL.x1, u), BOWL.top + 3 + Math.abs(u - .5) * 50 * R(), .2 + R() * .7, 1.3 + R() * 2); }
  SALT = a; return a;
}
function drawSalt(ctx, T, k, lx, ly) {
  if (k <= 0) return; ctx.save();
  for (const c of saltList()) {
    const g = clamp((k - c.th) / .18); if (g <= 0) continue;
    const r = c.r * (.4 + .6 * g), lit = .35 + .65 * litAt(c.x, c.y, lx, ly, 380);
    ctx.fillStyle = rgba('#dfe8ea', .42 * g * lit); ctx.beginPath();
    for (let i = 0; i < c.n; i++) { const an = c.rot + i / c.n * 6.283, rr = r * (.6 + .4 * hi(i + c.x * 13)); i ? ctx.lineTo(c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr) : ctx.moveTo(c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill();
    if (c.tw > .94) { const s = .5 + .5 * Math.sin(T * 3 + c.tw * 40); ctx.fillStyle = rgba('#ffffff', .7 * g * s * lit); ctx.fillRect(c.x - .8, c.y - r * 1.4, 1.6, r * 2.8); ctx.fillRect(c.x - r * 1.4, c.y - .8, r * 2.8, 1.6); }
  }
  ctx.restore();
}

// ---- the room ----
// o: lv (water level), lx/ly (his light), light (0..1), salt (0..1), ghost (old waterline y or null), haze, zoom (for hairlines),
//    cold (0..1), airGlow, onWall(ctx) (drawn on the back wall: cast shadows)
function shadowOf(ctx, path, lx, ly, k, a) { ctx.save(); ctx.translate(lx, ly); ctx.scale(k, k); ctx.translate(-lx, -ly); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fill(path); ctx.restore(); }
function drawRoom(ctx, T, o = {}) {
  const { lv = LV0, lx = 735, ly = 808, light = 1, salt = 0, ghost = null, haze = 0, zoom = 1, cold = 0, drips = 1, airGlow = 0, onWall = null } = o;
  const top = lvY(lv), hl = 1 / zoom, P_ = paths();
  ctx.save();
  // --- neighbouring spaces beyond the cut walls (the officer's cabin to the right): barely there ---
  const wl = RM.wall;
  {
    const ex0 = RM.x - 900, ex1 = RM.r + 900;
    const gL = ctx.createLinearGradient(ex0, 0, RM.x, 0); gL.addColorStop(0, 'rgba(6,10,12,0)'); gL.addColorStop(1, 'rgba(8,12,15,.9)');
    const gR = ctx.createLinearGradient(RM.r, 0, ex1, 0); gR.addColorStop(0, 'rgba(8,12,15,.9)'); gR.addColorStop(1, 'rgba(6,10,12,0)');
    ctx.fillStyle = gL; ctx.fillRect(ex0, RM.y - wl, RM.x - ex0, wl); ctx.fillRect(ex0, RM.b, RM.x - ex0, wl);
    ctx.fillStyle = gR; ctx.fillRect(RM.r, RM.y - wl, ex1 - RM.r, wl); ctx.fillRect(RM.r, RM.b, ex1 - RM.r, wl);
    ctx.strokeStyle = 'rgba(150,180,195,.07)'; ctx.lineWidth = 1.4 * hl; ctx.beginPath();
    for (const [xa, xb] of [[ex0, RM.x], [RM.r, ex1]]) for (const yy of [RM.y - wl, RM.y, RM.b, RM.b + wl]) { ctx.moveTo(xa, yy); ctx.lineTo(xb, yy); }
    for (let k = 1; k <= 3; k++) { ctx.moveTo(RM.r + k * 230, RM.y); ctx.lineTo(RM.r + k * 230, RM.b); ctx.moveTo(RM.x - k * 230, RM.y); ctx.lineTo(RM.x - k * 230, RM.b); }
    ctx.stroke();
    // the cabin's water continues beyond the wall (same level), very dim
    const lvl = lvY(lv); const gw0 = ctx.createLinearGradient(RM.r, 0, RM.r + 700, 0); gw0.addColorStop(0, 'rgba(8,24,30,.55)'); gw0.addColorStop(1, 'rgba(8,24,30,0)');
    ctx.fillStyle = gw0; ctx.fillRect(RM.r, lvl + 4, 700, RM.b - lvl - 4);
    const gw1 = ctx.createLinearGradient(RM.x - 700, 0, RM.x, 0); gw1.addColorStop(0, 'rgba(8,24,30,0)'); gw1.addColorStop(1, 'rgba(8,24,30,.55)');
    ctx.fillStyle = gw1; ctx.fillRect(RM.x - 700, lvl + 4, 700, RM.b - lvl - 4);
    if (light > 0) { const g = ctx.createRadialGradient(RM.r, ly, 0, RM.r, ly, 360); g.addColorStop(0, rgba('#ffb36b', .05 * light)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(RM.r, ly - 360, 360, 720); }
  }
  // --- cut steel shell, hatched ---
  const gs = ctx.createLinearGradient(0, RM.y - wl, 0, RM.b + wl); gs.addColorStop(0, '#222c31'); gs.addColorStop(.5, '#10161a'); gs.addColorStop(1, '#1b2428');
  // (the interior is painted opaque right after, so the shell is drawn as full bands without clipping)
  ctx.fillStyle = gs; ctx.fillRect(RM.x - wl, RM.y - wl, RM.w + 2 * wl, wl); ctx.fillRect(RM.x - wl, RM.b, RM.w + 2 * wl, wl); ctx.fillRect(RM.x - wl, RM.y, wl, RM.h); ctx.fillRect(RM.r, RM.y, wl, RM.h);
  ctx.save(); ctx.beginPath(); ctx.rect(RM.x - wl, RM.y - wl, RM.w + 2 * wl, RM.h + 2 * wl); ctx.clip();
  ctx.strokeStyle = 'rgba(150,180,195,.08)'; ctx.lineWidth = 1.4 * hl; ctx.beginPath();
  for (let s = -RM.h - 2 * wl; s < RM.w + 2 * wl; s += 15) { ctx.moveTo(RM.x - wl + s, RM.b + wl); ctx.lineTo(RM.x - wl + s + RM.h + 2 * wl, RM.y - wl); }
  ctx.stroke(); ctx.restore();
  if (light > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 520); g.addColorStop(0, rgba('#ffb36b', .16 * light)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g;
    ctx.fillRect(RM.x - wl, RM.y - wl, RM.w + 2 * wl, wl); ctx.fillRect(RM.x - wl, RM.b, RM.w + 2 * wl, wl); ctx.fillRect(RM.x - wl, RM.y, wl, RM.h); ctx.fillRect(RM.r, RM.y, wl, RM.h); }
  ctx.strokeStyle = 'rgba(150,190,205,.22)'; ctx.lineWidth = 1.6 * hl; ctx.strokeRect(RM.x - wl, RM.y - wl, RM.w + 2 * wl, RM.h + 2 * wl);
  ctx.strokeStyle = rgba('#bcd3dc', .2 + .2 * light); ctx.strokeRect(RM.x, RM.y, RM.w, RM.h);
  // --- interior (clipped) ---
  ctx.save(); ctx.beginPath(); ctx.rect(RM.x, RM.y, RM.w, RM.h); ctx.clip();
  {  // back wall + his warm pool in one opaque pass
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 640);
    g.addColorStop(0, PK.lerp2('#030607', '#ffb36b', .26 * light)); g.addColorStop(.3, PK.lerp2('#030607', '#b8682e', .1 * light)); g.addColorStop(1, '#030607');
    ctx.fillStyle = g; ctx.fillRect(RM.x, RM.y, RM.w, RM.h);
  }
  // cold light bouncing off the water onto the wall just above it
  let gw = ctx.createLinearGradient(0, top - 170, 0, top); gw.addColorStop(0, 'rgba(60,140,165,0)'); gw.addColorStop(1, rgba('#3d8fa6', .06 + .05 * cold)); ctx.fillStyle = gw; ctx.fillRect(RM.x, top - 170, RM.w, 170);
  // depth planes: old floor (top), side walls, old ceiling (bottom)
  const dp = 30;
  const plane = (pts, c0, c1, gx0, gy0, gx1, gy1) => { const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  const fl = light * litAt(lx, RM.y, lx, ly, 330);
  plane([[RM.x, RM.y], [RM.r, RM.y], [RM.r - dp, RM.y + dp], [RM.x + dp, RM.y + dp]], rgba('#3a3128', .55 * fl + .1), 'rgba(8,10,12,.9)', 0, RM.y, 0, RM.y + dp);
  plane([[RM.x, RM.y], [RM.x + dp, RM.y + dp], [RM.x + dp, RM.b - dp], [RM.x, RM.b]], 'rgba(0,0,0,.6)', 'rgba(10,14,16,.6)', RM.x, 0, RM.x + dp, 0);
  plane([[RM.r, RM.y], [RM.r - dp, RM.y + dp], [RM.r - dp, RM.b - dp], [RM.r, RM.b]], rgba('#2a241e', .5 * light * litAt(RM.r, ly, lx, ly, 300)), 'rgba(10,14,16,.6)', RM.r, 0, RM.r - dp, 0);
  // old floor tiles seen from below (converging grout lines) + skirting band now along the top
  ctx.strokeStyle = rgba('#c9b8a0', .08 + .3 * fl); ctx.lineWidth = 1.2 * hl; ctx.beginPath();
  for (let i = 0; i <= 22; i++) { const x0 = RM.x + i * RM.w / 22, x1 = RM.x + dp + i * (RM.w - 2 * dp) / 22; ctx.moveTo(x0, RM.y); ctx.lineTo(x1, RM.y + dp); }
  ctx.moveTo(RM.x + 7, RM.y + 8); ctx.lineTo(RM.r - 7, RM.y + 8); ctx.moveTo(RM.x + 16, RM.y + 17); ctx.lineTo(RM.r - 16, RM.y + 17); ctx.stroke();
  ctx.fillStyle = 'rgba(8,12,14,.95)'; ctx.fillRect(RM.x + dp, RM.y + dp, RM.w - 2 * dp, 20);
  ctx.fillStyle = rgba('#d6c4ac', .06 + .3 * light * litAt(lx, RM.y + 50, lx, ly, 380)); ctx.fillRect(RM.x + dp, RM.y + dp + 20, RM.w - 2 * dp, 1.6 * hl);
  // wall panels: seams + rivets
  for (let i = 1; i < 6; i++) {
    const x = RM.x + dp + i * (RM.w - 2 * dp) / 6; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1.5, RM.y + dp, 3, RM.h - 2 * dp);
    ctx.fillStyle = rgba('#d6c4ac', .02 + .16 * light * litAt(x, ly, lx, ly, 300)); ctx.fillRect(x + 1.5, RM.y + dp, 1.3 * hl, RM.h - 2 * dp);
    for (let y = RM.y + 74; y < RM.b - 30; y += 46) { const lt = light * litAt(x, y, lx, ly, 280); if (lt < .04) continue; ctx.fillStyle = rgba('#e3cfb4', .3 * lt); ctx.beginPath(); ctx.arc(x - 9, y, 2.2, 0, 7); ctx.arc(x + 9, y, 2.2, 0, 7); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(RM.x + dp, RM.y + 300, RM.w - 2 * dp, 3);
  // old ceiling (now the bottom, under water): panel strip + dome lamp pointing up
  ctx.fillStyle = 'rgba(14,20,24,.9)'; ctx.fillRect(RM.x + dp, RM.b - dp - 16, RM.w - 2 * dp, 16);
  ctx.fillStyle = '#151d21'; ctx.beginPath(); ctx.ellipse(540, RM.b - dp - 16, 70, 30, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,215,.18)'; ctx.lineWidth = 1.4 * hl; ctx.stroke();
  // --- cast shadows of the fixtures (his light is a point light in front of the wall) ---
  if (light > 0) { shadowOf(ctx, P_.basin, lx, ly, 1.18, .5 * light); shadowOf(ctx, P_.tap, lx, ly, 1.18, .45 * light); shadowOf(ctx, P_.wc, lx, ly, 1.1, .35 * light); }
  if (onWall) onWall(ctx);
  // --- door (inverted: louvre near the top, handle high, keyhole above it, hinges on the left) ---
  const dl = light * litAt((DOOR.x0 + DOOR.x1) / 2, 700, lx, ly, 330);
  const gd = ctx.createLinearGradient(DOOR.x0, 0, DOOR.x1, 0); gd.addColorStop(0, '#070d10'); gd.addColorStop(1, rgba('#2a2018', .8 * dl + .2)); ctx.fillStyle = gd;
  ctx.fillRect(DOOR.x0, DOOR.y0, DOOR.x1 - DOOR.x0, DOOR.y1 - DOOR.y0);
  ctx.strokeStyle = rgba('#d0c2ad', .12 + .45 * dl); ctx.lineWidth = 2.2 * hl; ctx.strokeRect(DOOR.x0, DOOR.y0, DOOR.x1 - DOOR.x0, DOOR.y1 - DOOR.y0);
  ctx.strokeStyle = rgba('#d0c2ad', .06 + .22 * dl); ctx.lineWidth = 1.4 * hl; ctx.strokeRect(DOOR.x0 + 14, DOOR.y0 + 14, DOOR.x1 - DOOR.x0 - 28, DOOR.y1 - DOOR.y0 - 28);
  ctx.beginPath(); for (let k = 0; k < 6; k++) { const y = DOOR.y0 + 34 + k * 11; ctx.moveTo(DOOR.x0 + 40, y); ctx.lineTo(DOOR.x1 - 40, y + 4); } ctx.stroke();
  const hx = DOOR.x1 - 26, hy = RM.y + 270;
  ctx.fillStyle = rgba('#e3d6c4', .18 + .6 * dl); ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 7); ctx.fill(); ctx.fillRect(hx - 44, hy - 3, 44, 6);
  ctx.beginPath(); ctx.arc(hx, hy - 30, 3.5, 0, 7); ctx.fill();
  ctx.fillRect(DOOR.x0 - 4, DOOR.y0 + 40, 6, 38); ctx.fillRect(DOOR.x0 - 4, DOOR.y1 - 90, 6, 38);
  // --- porcelain: upside-down WC (left) and washbasin (right), lit by him ---
  const porc = (path, cx, cy, lit, lw) => {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 520); g.addColorStop(0, rgba('#6d5a48', .25 + .6 * lit)); g.addColorStop(1, '#0d1316'); ctx.fillStyle = g; ctx.fill(path);
    ctx.fillStyle = 'rgba(8,12,14,.55)'; ctx.fill(path);
    ctx.strokeStyle = rgba('#f0e2cc', .18 + .6 * lit); ctx.lineWidth = lw * hl; ctx.stroke(path);
  };
  const wlit = light * litAt(220, 600, lx, ly, 380);
  porc(P_.wc, 220, 600, wlit, 2.2);
  ctx.strokeStyle = rgba('#f0e2cc', .08 + .3 * wlit); ctx.lineWidth = 1.3 * hl; ctx.beginPath(); ctx.moveTo(RM.x + 22 * CM, RM.y + 38 * CM); ctx.lineTo(RM.x + 66 * CM, RM.y + 37.5 * CM); ctx.moveTo(RM.x + 21 * CM, RM.y + 44 * CM); ctx.lineTo(RM.x + 2 * CM, RM.y + 44 * CM); ctx.stroke();
  ctx.fillStyle = rgba('#f0e2cc', .1 + .35 * wlit); ctx.fillRect(RM.x + 7 * CM, RM.y + 77 * CM, 8 * CM, 2.4);   // flush button, now underneath
  const blit = light * litAt(900, 720, lx, ly, 330);
  ctx.strokeStyle = rgba('#8f9da3', .35 + .45 * blit); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(912, BOWL.top + 4); ctx.lineTo(912, 640); ctx.quadraticCurveTo(912, 628, 926, 628); ctx.lineTo(RM.r, 628); ctx.stroke();
  ctx.strokeStyle = '#0c1316'; ctx.lineWidth = 5; ctx.stroke(); ctx.lineCap = 'butt';
  porc(P_.basin, 900, 700, blit, 2.4);
  ctx.fillStyle = rgba('#fff2de', .06 + .3 * blit); ctx.fillRect(SLAB.x0 + 3, SLAB.y1 - 3, SLAB.x1 - SLAB.x0 - 6, 2);
  ctx.fillStyle = '#141c20'; ctx.fill(P_.tap); ctx.strokeStyle = rgba('#e8eef0', .2 + .55 * blit); ctx.lineWidth = 1.8 * hl; ctx.stroke(P_.tap);
  // --- light reflected off the rippling water onto the wall above it (warm) + cold glints ---
  if (light > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const yb = top - 12 - i * 15 - 6 * Math.sin(T * .9 + i), a = .1 * light * (1 - i / 9);
      ctx.strokeStyle = rgba(i % 3 === 2 ? '#9fe0ef' : '#ffcf96', a); ctx.lineWidth = (2.6 - i * .18) * hl; ctx.beginPath();
      for (let k = 0; k <= 14; k++) { const x = lx - 280 + k * 40, y = yb + Math.sin(k * 1.3 + T * (2.1 + i * .23) + i) * (5 + i * .6); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // --- the air layer (optional cool glow / stale haze), warm motes in the air near him ---
  if (airGlow > 0) { const g = ctx.createLinearGradient(0, RM.y, 0, top); g.addColorStop(0, rgba('#7fd6ff', .015 * airGlow)); g.addColorStop(1, rgba('#7fd6ff', .085 * airGlow)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(RM.x, RM.y, RM.w, top - RM.y); ctx.restore(); }
  if (haze > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 2; i++) {
      const x = RM.x + ((hash(i * 7 + 3) * RM.w + T * 14 * (i % 2 ? 1 : -1)) % RM.w + RM.w) % RM.w, y = lerp(RM.y + 50, top - 30, .3 + .5 * hash(i * 5 + 1)), r = 190 + 50 * hash(i);
      ctx.save(); ctx.translate(x, y); ctx.scale(2.2, .5); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, rgba('#8fa59a', .1 * haze)); g.addColorStop(1, 'rgba(143,165,154,0)');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    }
    ctx.restore();
  }
  if (light > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const px = lx + (hi(i * 3 + 1) - .5) * 520 + fb(T * .15 + i, 3) * 40, py = RM.y + 40 + ((hi(i * 7 + 2) * (top - RM.y - 50) - T * (4 + 6 * hi(i))) % (top - RM.y - 50) + (top - RM.y - 50)) % (top - RM.y - 50);
      const a = .5 * light * litAt(px, py, lx, ly, 170) * (.5 + .5 * Math.sin(T * 1.7 + i * 2.1)); if (a < .02) continue;
      ctx.fillStyle = rgba('#ffe2b8', a); ctx.beginPath(); ctx.arc(px, py, 1.1 + 1.3 * hi(i * 11), 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // --- drips from the old floor into the water ---
  const ripples = [];
  if (drips > 0) {
    [[300, 3.1, 0], [626, 3.7, 1.3], [884, 2.9, 2.1], [470, 4.3, .6]].forEach(([dx, per, ph]) => {
      const c = ((T + ph) / per) % 1, form = .55, sy = surf(dx, T, top), y0 = RM.y + dp + 22;
      if (c < form) { const r = 1.5 + 3 * (c / form); ctx.fillStyle = rgba('#bfe6f2', .4 * drips); ctx.beginPath(); ctx.ellipse(dx, y0 + r, r * .8, r, 0, 0, 7); ctx.fill(); }
      else { const f = (c - form) / (1 - form), fallT = .36; const yy = y0 + (sy - y0) * Math.min(1, (f / fallT) * (f / fallT));
        if (f < fallT) { ctx.fillStyle = rgba('#d8f2fa', .6 * drips); ctx.beginPath(); ctx.ellipse(dx, yy, 2.2, 5.5, 0, 0, 7); ctx.fill(); }
        else ripples.push([dx, (f - fallT) / (1 - fallT)]); }
    });
  }
  // --- water body ---
  const wp = new Path2D(); wp.moveTo(RM.x, RM.b);
  for (let x = RM.x; x <= RM.r + 8; x += 8) wp.lineTo(Math.min(x, RM.r), surf(x, T, top));
  wp.lineTo(RM.r, RM.b); wp.closePath();
  const gwb = ctx.createLinearGradient(0, top, 0, RM.b); gwb.addColorStop(0, rgba('#0f2a33', .9)); gwb.addColorStop(.18, rgba('#06161c', .94)); gwb.addColorStop(1, 'rgba(1,4,6,.98)');
  ctx.fillStyle = gwb; ctx.fill(wp);
  ctx.save(); ctx.beginPath(); ctx.rect(RM.x, top + 7, RM.w, RM.b - top - 7); ctx.clip();
  if (light > 0) { glow(ctx, lx, top + 50, 230, '#ff9f55', .14 * light); glow(ctx, lx, top + 12, 110, '#ffd09a', .14 * light); }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const px = RM.x + ((hi(i * 5 + 3) * RM.w + T * (6 + 8 * hi(i)) * (i % 2 ? 1 : -1)) % RM.w + RM.w) % RM.w, py = top + 20 + ((hi(i * 9 + 1) * (RM.b - top - 30) + T * 5 * hi(i * 3)) % (RM.b - top - 30));
    const al = (.12 + .25 * litAt(px, py, lx, ly, 260) * light) * (.5 + .5 * Math.sin(T * 1.3 + i));
    ctx.fillStyle = rgba(i % 4 ? '#8fc9d8' : '#ffd09a', al); ctx.beginPath(); ctx.arc(px, py, 1 + 1.4 * hi(i * 7), 0, 7); ctx.fill();
  }
  ctx.strokeStyle = rgba('#6fc6dc', .035 + .03 * cold); ctx.lineWidth = 1.5 * hl;
  for (let i = 0; i < 5; i++) { const yb = top + 26 + i * 30; ctx.beginPath(); for (let k = 0; k <= 22; k++) { const x = RM.x + k * 40, y = yb + Math.sin(k * .9 + T * (1.4 + i * .2) + i * 2) * 6; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  // oily film along the surface
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= .22; const tex = sheenTexLite();
  ctx.save(); ctx.beginPath(); ctx.rect(RM.x, top + 2, RM.w, 18); ctx.clip();
  ctx.drawImage(tex, RM.x - 200 + Math.sin(T * .1) * 80, top - 300, 1300, 700); ctx.restore();
  ctx.restore();
  // surface line + warm glitter under the light
  ctx.save(); ctx.lineWidth = 2.2 * hl; ctx.strokeStyle = rgba('#a9e2f2', .5 + .15 * cold); ctx.beginPath();
  for (let x = RM.x; x <= RM.r + 8; x += 8) { const y = surf(Math.min(x, RM.r), T, top); x === RM.x ? ctx.moveTo(x, y) : ctx.lineTo(Math.min(x, RM.r), y); } ctx.stroke();
  if (light > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) { const x = lx - 200 + k * 50 + Math.sin(T * 2.3 + k) * 10, y = surf(x, T, top) + 3 + (k % 3) * 3, w = 26 + 22 * hash(k); const a = .4 * light * (1 - Math.abs(x - lx) / 230); if (a <= 0) continue;
      ctx.fillStyle = rgba('#ffd7a6', a); ctx.fillRect(x - w / 2, y, w, 2.2); }
  }
  ctx.restore();
  ctx.save(); ctx.lineWidth = 1.6 * hl;
  for (const [x, f] of ripples) { const y = surf(x, T, top); ctx.strokeStyle = rgba('#cfeef8', .4 * (1 - f) * drips); ctx.beginPath(); ctx.ellipse(x, y + 2, 6 + f * 70, 1.5 + f * 9, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  if (ghost != null) {
    ctx.save(); ctx.setLineDash([14 * hl, 10 * hl]); ctx.strokeStyle = rgba('#a9e2f2', .4); ctx.lineWidth = 1.8 * hl;
    ctx.beginPath(); ctx.moveTo(RM.x + 6, ghost); ctx.lineTo(RM.r - 6, ghost); ctx.stroke(); ctx.restore();
  }
  drawSalt(ctx, T, salt, lx, ly);
  ctx.restore();  // interior clip
  ctx.restore();
  return top;
}

// ---- neutral backlit hand (dorsal view) hooked over a ledge's top edge: no skin tone, near-black fill + rim light ----
// (x, y) = the ledge's top edge under the middle of the hand; c: 0 reaching (fingers up and spread) .. 1 hooked over.
// (sx, sy): where the arm goes (his light), so the forearm melts into the glow. mode 'shadow' fills a flat silhouette.
const FG = [ // [x at the knuckle, width, top when hooked, open tip [x, y]]
  [-15.5, 8.4, -8.5, [-22, -36]], [-5.2, 9, -11, [-7, -42]], [5, 8.6, -10, [7, -39]], [14.4, 7.4, -6.5, [19, -30]]];
function handGeom(c, ax, ay) {
  const ce = E.inOutQ(clamp(c));
  const fingers = FG.map(([fx, w, tg, op]) => { const by = 9; const tx = lerp(op[0], fx + 1.5, ce), ty = lerp(op[1], tg, ce); return { b: [lerp(fx * 1.06, fx, ce), by], t: [tx, ty], w: lerp(w * .92, w, ce) }; });
  const thumb = { b: [-16, 33], m: [lerp(-29, -26, ce), lerp(12, 16, ce)], t: [lerp(-33, -24, ce), lerp(-6, 5, ce)] };
  let dx = ax + 1, dy = ay - 48; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  return { fingers, thumb, wr: [-1, 48], dir: [dx, dy], len: Math.min(dl, 150) * .92, ce };
}
function handPath(G, grow = 0) {
  const p = new Path2D();
  // back of the hand
  p.moveTo(-21 - grow, 6 - grow); p.quadraticCurveTo(0, 1 - grow, 19.5 + grow, 5 - grow); p.quadraticCurveTo(20 + grow, 22, 15 + grow, 34); p.quadraticCurveTo(9 + grow, 48, 10 + grow, 54 + grow);
  p.lineTo(-12 - grow, 54 + grow); p.quadraticCurveTo(-13 - grow, 44, -20 - grow, 33); p.quadraticCurveTo(-24 - grow, 20, -21 - grow, 6 - grow); p.closePath();
  // fingers (capsules)
  for (const f of G.fingers) {
    const [x0, y0] = f.b, [x1, y1] = f.t, r = f.w / 2 + grow; let nx = y1 - y0, ny = -(x1 - x0); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const an = Math.atan2(y1 - y0, x1 - x0);
    p.moveTo(x0 + nx * r, y0 + ny * r); p.lineTo(x1 + nx * r, y1 + ny * r); p.arc(x1, y1, r, an - Math.PI / 2, an + Math.PI / 2); p.lineTo(x0 - nx * r, y0 - ny * r); p.closePath();
  }
  // thumb: two segments
  const segs = [[G.thumb.b, G.thumb.m, 6 + grow], [G.thumb.m, G.thumb.t, 5 + grow]];
  for (const [[x0, y0], [x1, y1], r] of segs) {
    let nx = y1 - y0, ny = -(x1 - x0); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; const an = Math.atan2(y1 - y0, x1 - x0);
    p.moveTo(x0 + nx * r, y0 + ny * r); p.lineTo(x1 + nx * r, y1 + ny * r); p.arc(x1, y1, r, an - Math.PI / 2, an + Math.PI / 2); p.lineTo(x0 - nx * r, y0 - ny * r); p.arc(x0, y0, r, an + Math.PI / 2, an + Math.PI * 1.5); p.closePath();
  }
  return p;
}
function forearm(ctx, G, col, fade, grow = 0) {
  const [wx, wy] = G.wr, [dx, dy] = G.dir, nx = -dy, ny = dx, L_ = G.len, ex = wx + dx * L_, ey = wy + dy * L_;
  const g = ctx.createLinearGradient(wx, wy, ex, ey); g.addColorStop(0, col); g.addColorStop(.45, fade(.75)); g.addColorStop(1, fade(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx + nx * (12 + grow), wy + ny * (12 + grow)); ctx.lineTo(ex + nx * (17 + grow), ey + ny * (17 + grow)); ctx.lineTo(ex - nx * (17 + grow), ey - ny * (17 + grow)); ctx.lineTo(wx - nx * (12 + grow), wy - ny * (12 + grow)); ctx.closePath(); ctx.fill();
}
function gripHand(ctx, x, y, s, o = {}) {
  const { cutTop = null, T = 0 } = o;
  if (cutTop == null || o.mode === 'shadow') return gripHand1(ctx, x, y, s, o);
  // above the surface: full; below it: a murky ghost (refracted, dim)
  // (straight cut at the local surface height: rect clips are much cheaper than a wavy path clip)
  const cy = surf(x - 10, T, cutTop) + 1;
  const air = new Path2D(); air.rect(x - 400, y - 400, 800, cy - (y - 400));
  const wat = new Path2D(); wat.rect(x - 400, cy, 800, 1000);
  ctx.save(); ctx.clip(air); gripHand1(ctx, x, y, s, o); ctx.restore();
  ctx.save(); ctx.clip(wat); ctx.globalAlpha *= .3; gripHand1(ctx, x + 2, y + 3, s, Object.assign({}, o, { rimA: (o.rimA || .85) * .35, cool: 0, blur: 0 })); ctx.restore();
}
function gripHand1(ctx, x, y, s, { c = 1, a = 1, sx = x - 100, sy = y + 90, rim = '#ffd9b0', rimA = .85, cool = .3, tremble = 0, T = 0, mode = 'full', shadowA = .5, blur = 1 } = {}) {
  if (a <= 0) return;
  const ox = tremble * nz(T * 13, 5) * 1.4, oy = tremble * nz(T * 13, 6) * 1.1;
  const G = handGeom(c, (sx - x) / s, (sy - y) / s);
  ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(s, s); ctx.globalAlpha *= a;
  if (mode === 'shadow') { forearm(ctx, G, `rgba(0,0,0,${shadowA})`, k => `rgba(0,0,0,${shadowA * k})`); ctx.fillStyle = `rgba(0,0,0,${shadowA})`; ctx.fill(handPath(G), 'nonzero'); ctx.restore(); return; }
  const hp = handPath(G), hpR = handPath(G, .25);
  // warm rim (his light, lower-left) + cool rim (water glints, above)
  ctx.save(); ctx.translate(-1.7, 1.5); if (blur) { ctx.shadowColor = rgba(rim, .8); ctx.shadowBlur = 5 * s; } forearm(ctx, G, rgba(rim, rimA), k => rgba(rim, rimA * k), .7); ctx.fillStyle = rgba(rim, rimA); ctx.fill(hpR); ctx.restore();
  if (cool > 0) { ctx.save(); ctx.translate(.8, -1.1); ctx.fillStyle = rgba('#bfe6ff', cool * .8); ctx.fill(hpR); ctx.restore(); }
  forearm(ctx, G, '#05080a', k => `rgba(5,8,10,${k})`); ctx.fillStyle = '#05080a'; ctx.fill(hp);
  // subtle anatomy: knuckles catching the rim light
  ctx.strokeStyle = rgba(rim, .32 * rimA * G.ce); ctx.lineWidth = 1.1; for (const f of G.fingers) { ctx.beginPath(); ctx.arc(f.t[0], f.t[1] + 8, f.w * .32, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  ctx.restore();
}

// dimension bracket (vertical) with end caps; p = draw-on progress from the bottom
function bracket(ctx, x, y0, y1, p, a, col, hl = 1) {
  if (a <= 0 || p <= 0) return; const yt = lerp(y1, y0, E.outC(clamp(p)));
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.6 * hl; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, yt); ctx.stroke();
  ctx.lineWidth = 2.2 * hl; ctx.beginPath(); ctx.moveTo(x - 16, y1); ctx.lineTo(x + 16, y1); ctx.stroke();
  if (p > .85) { ctx.globalAlpha *= clamp((p - .85) / .15); ctx.beginPath(); ctx.moveTo(x - 16, y0); ctx.lineTo(x + 16, y0); ctx.stroke(); }
  const ah = 13; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x - 7, yt + ah); ctx.lineTo(x + 7, yt + ah); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x - 7, y1 - ah); ctx.lineTo(x + 7, y1 - ah); ctx.closePath(); ctx.fill();
  for (let k = 1; k < 4; k++) { const ty = lerp(y1, y0, k / 4); if ((y1 - ty) > (y1 - yt)) break; ctx.lineWidth = 1.6 * hl; ctx.beginPath(); ctx.moveTo(x - 8, ty); ctx.lineTo(x, ty); ctx.stroke(); }
  ctx.restore();
}
// chip with one or two lines (stable box), scale-pop with a
function chip2(ctx, l1, l2, x, y, a, o = {}) {
  if (a <= 0) return; const s1 = o.s1 || 44, s2 = o.s2 || 26, w = Math.max(measure(ctx, l1, s1, FONT.sub, 900), l2 ? measure(ctx, l2, s2, FONT.sub, 700) : 0) + 44, h = s1 + (l2 ? s2 + 14 : 0) + 26;
  const sc = lerp(.86, 1, E.outBack(clamp(a))); const al = clamp(a);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= al;
  ctx.fillStyle = o.bg || 'rgba(3,9,12,.86)'; roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,255,.5)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const y1 = l2 ? -h / 2 + 13 + s1 / 2 + 1 : 2;
  text(ctx, l1, 0, y1, { size: s1, weight: 900, color: o.color || '#fff', alpha: al });
  if (l2) text(ctx, l2, 0, y1 + s1 / 2 + 8 + s2 / 2, { size: s2, weight: 700, color: o.color2 || '#9fc6d8', alpha: al });
  ctx.restore();
  return { w: w * sc, h: h * sc };
}
// quiet bands: keep the title zone readable and the subtitle band dark
function quiet(ctx, k = 1) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  let g = ctx.createLinearGradient(0, 380, 0, 476); g.addColorStop(0, `rgba(1,2,3,${.55 * k})`); g.addColorStop(1, 'rgba(1,2,3,0)'); ctx.fillStyle = g; ctx.fillRect(0, 380, W, 96);
  ctx.fillStyle = `rgba(1,2,3,${.55 * k})`; ctx.fillRect(0, 0, W, 380);
  g = ctx.createLinearGradient(0, 1210, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${.86 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 1210, W, 80);
  ctx.fillStyle = `rgba(1,2,3,${.88 * k})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
}
// tunnel vision centred on a screen point
// (only the content band is filled: above/below it the quiet bands are dark anyway). extra: uniform darkening folded in.
function iris(ctx, k, pulse, cx = 540, cy = 850, extra = 0) {
  if (k <= 0 && extra <= 0) return; const r0 = H * lerp(.44, .1, k) * (1 + .06 * pulse), r1 = r0 + H * lerp(.5, .28, k);
  const e = clamp(extra), mix = a => clamp(1 - (1 - a) * (1 - e)).toFixed(3);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, `rgba(1,2,3,${mix(0)})`); g.addColorStop(.55, `rgba(1,2,3,${mix(.4 + .4 * k)})`); g.addColorStop(1, `rgba(1,2,3,${mix(clamp(.75 + .25 * k))})`);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 360, W, 960); ctx.restore();
}
function blackBG(ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
// his light: amber, breathing + heartbeat (absolute time keeps neighbouring scenes in phase)
function lifeLight(ctx, T, x, y, { a = 1, s = 1.45, bpm = 72, breath = .45, warm = 1, zoom = 1 } = {}) {
  if (a <= 0) return; const b = PK.beat(T, bpm), br = .5 + .5 * Math.sin(T * breath * Math.PI * 2);
  const k = s * (1 + .07 * br) / Math.sqrt(Math.max(1, zoom)), col = PK.lerp2('#b9c6cc', '#ffb347', warm);
  glow(ctx, x, y, (190 + 40 * b) * k, col, .22 * a);
  glow(ctx, x, y, (110 + 26 * b) * k, PK.lerp2('#d8dfe2', '#ffc77a', warm), .42 * a);
  glow(ctx, x, y, (40 + 12 * b) * k, '#fff0d6', .8 * a);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#fff8ec'; ctx.beginPath(); ctx.arc(x, y, (7.5 + 3 * b) * k, 0, 7); ctx.fill(); ctx.restore();
}

// re-cover a region with the water body (for things drawn after the room that dip below the surface)
function waterOver(ctx, T, top, x0, x1, a = .82) {
  x0 = Math.max(RM.x, x0); x1 = Math.min(RM.r, x1); if (x1 <= x0) return;
  ctx.save(); const p = new Path2D(); p.moveTo(x0, RM.b); for (let x = x0; x <= x1 + 6; x += 6) p.lineTo(Math.min(x, x1), surf(Math.min(x, x1), T, top)); p.lineTo(x1, RM.b); p.closePath();
  const g = ctx.createLinearGradient(0, top, 0, top + 120); g.addColorStop(0, rgba('#0f2a33', a)); g.addColorStop(1, rgba('#06161c', Math.min(1, a + .12))); ctx.fillStyle = g; ctx.fill(p);
  ctx.strokeStyle = rgba('#a9e2f2', .5); ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0; x <= x1 + 6; x += 6) { const y = surf(Math.min(x, x1), T, top); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(Math.min(x, x1), y); } ctx.stroke();
  ctx.restore();
}
window.PK.okRoom = { waterOver, blackBG, RM, LV0, lvY, SLAB, BOWL, DOOR, GRIP, RIM, CAM_END, surf, restLight, rimLight, rimContact, drift, camMatrix, applyCam, toS, darkFast, sheenTexLite, drawRoom, gripHand, bracket, chip2, quiet, iris, lifeLight, nz, fb, hi, litAt, basinPath: () => paths().basin, tapPath: () => paths().tap };

// ======================================================================================================
// the pocket scene
// ======================================================================================================
const { at } = PK;
window.PK.scenes.pocket = function (ctx, t, d, info) {
  const T = info.sc.t0 + t;
  const tW = at(info, '물', .02), t1m = at(info, '1미터', .13), tNam = at(info, '남짓', .2), tAir = at(info, '공기가', .25), tLeft = at(info, '남아', .3),
    tHe = at(info, '그는', .48), tInv = at(info, '뒤집힌', .55), tBas = at(info, '세면대', .63), tGrab = at(info, '붙잡고', .72), tHold = at(info, '버텼', .8);

  // ---- camera: starts on swept's landing frame (z 1) and pushes in at once, framing the air gap rather than the room;
  //      from '그는' on it closes in on the basin: the old floor ends up just under the title, the water cut by the subtitle band ----
  const pA = P(t, .05, tHe, E.inOutQ), pB = P(t, tHe - .25, d - .05, E.inOutQ);
  const z = 1 + .32 * pA + (CAM_END.z - 1.32) * pB;
  const cx = lerp(lerp(540, 700, pA), CAM_END.x, pB), cy = lerp(lerp(850, 700, pA), CAM_END.y, pB);
  const dr = drift(T, 1);
  const grabK = P(t, tGrab + .06, tGrab + .14) * Math.exp(-Math.max(0, t - tGrab - .14) * 6);
  const sh = 2.4 * grabK;
  const M = camMatrix(cx + dr.x, cy + dr.y, z, dr.r, sh * nz(T * 9, 3), sh * nz(T * 9, 4));

  // ---- him: resting at the waterline -> on '붙잡고' his light rises out of the water and presses against the basin rim ----
  // (no hand: the hold is told by his light against the rim, the warm contact on the slab, the drips and the tremble)
  const reachK = t2 => E.inOutQ(P(t2, tGrab - .32, tGrab + .1));
  const bt = PK.beat(T, 72), holdK = P(t, tHold - .1, tHold + .4);
  const Lp = rimLight(T, reachK(t), .8 * holdK);
  const contact = P(t, tGrab, tGrab + .12) * (.72 + .28 * bt) + .6 * P(t, tGrab + .06, tGrab + .1) * Math.exp(-Math.max(0, t - tGrab - .1) * 5);

  blackBG(ctx);
  ctx.save(); applyCam(ctx, M);
  const top = drawRoom(ctx, T, { lv: LV0, lx: Lp.x, ly: Lp.y, light: .9 + .1 * bt, zoom: z, airGlow: (.55 * P(t, tW + .15, tAir) * (1 - .45 * P(t, tHe, tHe + .8)) + .25 * (.5 + .5 * Math.sin(T * .45 * Math.PI * 2)) * P(t, tW, tAir)) * (1 - P(t, tHold, d - .2)) });

  // '물 위로': a cold glint runs along the waterline (left -> right)
  const sw = P(t, tW - .05, tW + .75, E.inOutQ);
  if (sw > 0 && sw < 1) {
    const sx = lerp(RM.x - 60, RM.r + 60, sw);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = -6; k <= 6; k++) { const x = sx + k * 14, y = surf(x, T, top); if (x < RM.x || x > RM.r) continue; ctx.fillStyle = rgba('#d8f6ff', .55 * (1 - Math.abs(k) / 7)); ctx.fillRect(x - 7, y - 1.5, 14, 3); }
    glow(ctx, sx, surf(sx, T, top), 120, '#9fe7ff', .35);
    ctx.restore();
  }
  // '1미터': dimension bracket from the waterline up to the ceiling (old floor)
  const BX = 400, by1 = surf(BX, T, top) - 4;
  const bA = P(t, t1m - .2, t1m + .05) * (1 - .35 * P(t, tHe, tHe + .6));
  bracket(ctx, BX, RM.y + 4, by1, P(t, t1m - .15, t1m + .35), bA, '#bfeaff', 1 / z);
  if (bA > 0) glow(ctx, BX, lerp(by1, RM.y, E.outC(P(t, t1m - .15, t1m + .35))), 50, '#bfeaff', .4 * bA * (1 - P(t, t1m + .35, t1m + .7)));

  // '뒤집힌': ghost of the upright basin flips over into place; '세면대를': the basin outline is traced
  const flip = P(t, tInv - .1, tInv + .42, E.inOutC), fA = P(t, tInv - .15, tInv) * (1 - P(t, tInv + .35, tInv + .6));
  if (fA > 0) {
    const mid = (BOWL.top + SLAB.y1 + 44) / 2;
    ctx.save(); ctx.translate(0, mid); ctx.scale(1, lerp(-1, 1, flip)); ctx.translate(0, -mid);
    ctx.globalAlpha = fA * .75; ctx.strokeStyle = '#ffe2b8'; ctx.lineWidth = 2.4 / z; ctx.setLineDash([9 / z, 7 / z]);
    ctx.stroke(PK.okRoom.basinPath()); ctx.stroke(PK.okRoom.tapPath()); ctx.restore();
  }
  const tr = P(t, tBas - .2, tBas + .45, E.inOutQ), trA = P(t, tBas - .2, tBas) * (1 - .6 * P(t, tGrab + .3, tGrab + .9));
  if (trA > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [w, al, col] of [[11, .12, '#ffb347'], [6, .22, '#ffc77a'], [3, .85, '#ffe7c4']]) {
      ctx.strokeStyle = rgba(col, al * trA); ctx.lineWidth = w / z; ctx.setLineDash([900 * tr, 900]); ctx.stroke(PK.okRoom.basinPath()); ctx.setLineDash([140 * tr, 140]); ctx.stroke(PK.okRoom.tapPath()); }
    ctx.restore();
  }

  // '붙잡고': the warm contact where his light holds the rim
  rimContact(ctx, T, Lp.x, Lp.y, contact);
  // water running off him as he rises: a few drops fall back to the surface and ring
  ctx.save(); ctx.lineWidth = 1.6 / z;
  for (let i = 0; i < 5; i++) {
    const t0 = tGrab - .16 + i * .16, age = t - t0; if (age <= 0) continue;
    const L0 = rimLight(info.sc.t0 + t0, reachK(t0), 0), x0 = L0.x + (hi(i * 7 + 3) - .5) * 26, y0 = L0.y + 8, ys = surf(x0, T, top), fallT = Math.sqrt(Math.max(0, 2 * (ys - y0) / 1400));
    if (age < fallT) { ctx.fillStyle = rgba('#d8f2fa', .55); ctx.beginPath(); ctx.ellipse(x0, y0 + 700 * age * age, 2, 4.5, 0, 0, 7); ctx.fill(); }
    else { const f = (age - fallT) / .7; if (f < 1) { ctx.strokeStyle = rgba('#cfeef8', .45 * (1 - f)); ctx.beginPath(); ctx.ellipse(x0, ys + 2, 5 + f * 60, 1.5 + f * 8, 0, 0, 7); ctx.stroke(); } }
  }
  ctx.restore();
  // grip ripples: rings spreading on the water under him
  ctx.save(); ctx.lineWidth = 2 / z;
  [tGrab + .15, tHold + .1, tHold + .9].forEach((tr0, i) => { const f = P(t, tr0, tr0 + 1.3); if (f <= 0 || f >= 1) return; const y = surf(Lp.x, T, top) + 3;
    ctx.strokeStyle = rgba('#cfeef8', .5 * (1 - f)); ctx.beginPath(); ctx.ellipse(Lp.x, y, 14 + f * 210, 3 + f * 22, 0, 0, 7); ctx.stroke(); });
  ctx.restore();
  // him
  lifeLight(ctx, T, Lp.x, Lp.y, { a: 1, s: 1.45 + .15 * P(t, tHe - .1, tHe + .4) * (1 - P(t, tHe + .4, tHe + 1.4)), zoom: z });
  ctx.restore();

  // ---- screen space ----
  const [sx, sy] = toS(M, Lp.x, Lp.y);
  // tunnel vision (closing in from swept's open landing frame) + heartbeat pulse on the hold (subtle darkening between beats)
  iris(ctx, .12 + .18 * P(t, 0, 1.2, E.inOutQ) + .25 * P(t, tHe, d) + .05 * holdK * bt, .5 + .5 * Math.sin(T * .45 * Math.PI * 2), lerp(540, sx, .5), lerp(850, sy, .5), .1 * holdK * (1 - bt));
  quiet(ctx, 1);
  // air-gap chip (approved string, broken over two lines) next to the bracket
  const [bx, byM] = toS(M, BX, (RM.y + by1) / 2);
  const cA = P(t, tNam - .12, tNam + .2) * (1 - .3 * P(t, tGrab, tGrab + .6)) * (1 - P(t, d - .45, d - .1));
  if (cA > 0) {
    const cw = 430, chx = Math.max(bx + 26 + cw / 2, 30 + cw / 2), chy = byM;
    ctx.save(); ctx.globalAlpha = clamp(cA); ctx.strokeStyle = 'rgba(191,234,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, chy); ctx.lineTo(chx - cw / 2, chy); ctx.stroke(); ctx.restore();
    chip2(ctx, '공기층 약 1.2m', '(약 4피트 · 로이터, 실측 아님)', chx, chy, cA, { s1: 46, s2: 26 });
  }
  // '세면대' tag above the basin
  const [tx, ty] = toS(M, (BOWL.x0 + BOWL.x1) / 2, BOWL.top - 40);
  const tA = P(t, tBas - .05, tBas + .2) * (1 - P(t, d - .4, d - .1));
  if (tA > 0) PK.chip(ctx, '세면대', Math.min(tx, W - 110), ty - 18, tA, { size: 34, color: '#ffe7c4', border: 'rgba(255,179,71,.6)' });
};
})();
