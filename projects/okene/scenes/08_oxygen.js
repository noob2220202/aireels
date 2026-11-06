// oxygen (clip, BBC): "The oxygen in the air pockets, it was almost gone, because I was already struggling to breathe."
// Extreme close INSIDE the air gap of the overturned cabin, at eye level just above the black water: the old floor tiles are
// the ceiling pressing down, the water is a black oily mirror creeping up toward it, and at the far wall the remaining air is
// a thin slit (the upside-down bunk hangs from the ceiling at the left, legs pointing down at the water). His warm light sits
// on the stacked mattresses at the water line, dim and fluttering; caustic ripples of his light crawl over the tiles; every
// exhale hangs as warm haze that pools under the ceiling; drops of condensation fall from the tiles. The tunnel vision closes
// on every breath (synced to the breath sfx) and tightens over the clip: 'it was almost gone' -> the light dims, the water
// creeps up, the haze thickens; 'struggling to breathe' -> breathing harder, faster heartbeat, a slight tremble, the iris
// narrows; the last half second closes almost to black for the hard cut to the knocks. Attribution card up while the voice plays.
//
// This file also holds the small kit shared by oxygen / divers / signal (window.PK.KN): local noise, quarter-res oily
// background, 1/3-res additive light layer, tunnel-vision iris, low-frequency shake/jolts, the inverted cabin (same design and
// coordinates as the hand scene's cabin: PK.room geometry, level .6) inside a cutaway of the upside-down hull (keel side up,
// the hull side plating right behind the cabin's right wall, the sea outside), shock rings through the steel, falling dust.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, roundRect } = L;
const PK = window.PK;
const KN = PK.KN = PK.KN || {};

// ---------- local hash / noise (L.hash loses precision for large arguments) ----------
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
Object.assign(KN, { hi, nz, fb });

// ---------- oily black background: PK.dark's sheen, composed at quarter resolution ----------
function sheenTex() {
  if (PK._sheenHG) return PK._sheenHG;           // identical texture, if the hook kit already built it
  if (KN._sheen) return KN._sheen;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.min(5, Math.floor(h6))];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); KN._sheen = c; return c;
}
KN.sheenTex = sheenTex;
KN.dark = function (ctx, t, k = .5, seed = 1, base = '#010203') {
  const [b, x] = L.buf('knDark', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  if (k > 0) {
    const tex = sheenTex(); x.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
      x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
};
// ---------- additive light layer at 1/3 resolution (glows, haze, cones); rows below LB are dropped (subtitle band) ----------
const LB = 1332;
KN.light = function (ctx, draw) {
  const M = ctx.getTransform(), [bb, x] = L.buf('knLight', 360, 640);
  x.clearRect(0, 0, 360, 640); x.setTransform(M.a / 3, M.b / 3, M.c / 3, M.d / 3, M.e / 3, M.f / 3); draw(x);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bb, 0, 0, 360, LB / 3, 0, 0, W, LB); ctx.restore();
};
// ---------- tunnel vision (quarter res): k = how tight, close = extra closing (a breath), centred on (cx, cy) ----------
KN.iris = function (ctx, k, close = 0, cx = 540, cy = 860) {
  if (k <= 0) return;
  const r0 = H * lerp(.42, .08, clamp(k)) * (1 - .24 * close), r1 = r0 + H * lerp(.5, .28, clamp(k)) * (1 - .3 * close), [bb, x] = L.buf('knIris', 270, 480);
  x.clearRect(0, 0, 270, 480); x.scale(.25, .25);
  const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${clamp(.42 + .38 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.72 + .3 * k).toFixed(3)})`);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bb, 0, 0, W, H); ctx.restore();
};
// keep the subtitle band quiet
KN.subBand = function (ctx, a = .86) {
  const g = ctx.createLinearGradient(0, 1150, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${a})`);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 1150, W, 140); ctx.fillStyle = `rgba(1,2,3,${a})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
};
// low-frequency handheld tremble (<= ~6 px/frame at k = 1)
KN.shake = (t, k, seed = 1) => [k * (nz(t * 6, seed) * 15 + nz(t * 19, seed + 5) * 2), k * (nz(t * 6, seed + 2) * 15 + nz(t * 19, seed + 7) * 2), k * nz(t * 5, seed + 3) * .007];
// decaying jolts on impacts (peak speed ~ .9 * amp px per frame at 30 fps)
KN.jolt = (t, times, amp = 6, seed = 1) => {
  let x = 0, y = 0, r = 0;
  times.forEach((tk, i) => { const u = t - tk; if (u < 0 || u > 1.2) return; const e = Math.exp(-u * 6) * Math.sin(u * Math.PI * 2 * 4.2); y += amp * e; x += amp * .5 * e * (hi(i * 7 + seed) - .5) * 2; r += .004 * e * (hi(i * 5 + seed) - .5); });
  return [x, y, r];
};
// knock hits from the sfx track inside an absolute window, as times relative to this scene
KN.knocks = function (info, from, to) {
  const out = [];
  ((info.TL && info.TL.sfx) || []).forEach(s => { if (s.type !== 'knock' || s.t == null) return; for (let k = 0; k < (s.n || 3); k++) { const tk = s.t + k * (s.gap || .32); if (tk >= from && tk < to) out.push(tk - info.sc.t0); } });
  return out.sort((a, b) => a - b);
};

// =====================================================================================================
// world: the cabin (hand scene / PK.room geometry) inside the upside-down hull
const RM = { x: 140, y: 520, w: 800, h: 620, wall: 26 };
const DR = { x0: RM.x + RM.w * .38, x1: RM.x + RM.w * .58, y0: RM.y + 30, y1: RM.y + 30 + RM.h * .7 };
const WTOP = RM.y + RM.h * .4;                                   // level .6, as in the hand scene
const SH = { top: 300, side: 994, th: 28, r: 180 };               // hull plating: old bottom on top, side plating at the right
const HC = { x: SH.side - SH.r, y: SH.top + SH.r };               // bilge corner centre
const SRC = { x: HC.x + Math.cos(-.72) * (SH.r + 4), y: HC.y + Math.sin(-.72) * (SH.r + 4) };   // where the knocks land outside
const LAMP = { x: 1250, y: 640 };                                 // a diver's lamp, outside in the dark
// where he pulled the wall panels off (right of the door, behind the mattresses): the opening, the stringer, two deep frames
const BW = { x0: RM.x + RM.w * .7, x1: RM.x + RM.w * .97, y0: RM.y + 40, ry: RM.y + 102, fr: [RM.x + RM.w * .72 + 3, RM.x + RM.w * .9 + 3] };
Object.assign(KN, { RM, DR, WTOP, SH, SRC, LAMP, BW });

// water surface (with the vibration of passing shock rings)
KN.surfY = function (x, t, rings) {
  let v = WTOP + Math.sin(x * .021 + t * 1.3) * 4 + Math.sin(x * .057 - t * .9) * 2;
  if (rings) for (const r of rings) { const u = t - r.t0 - Math.hypot(x - r.x, WTOP - r.y) / r.v; if (u > 0 && u < 1.4) v += (r.wa || 1) * 3.4 * Math.exp(-u * 4.2) * Math.sin(u * 36 + x * .09); }
  return v;
};
let _paths = null;
function paths() {
  if (_paths) return _paths;
  const { x, y, w, h, wall } = RM, ti = SH.top + SH.th, si = SH.side - SH.th;
  // the sea side of the plating (everything inside is hull)
  const inner = new Path2D(); inner.moveTo(-900, 1700); inner.lineTo(-900, ti); inner.lineTo(HC.x, ti); inner.arc(HC.x, HC.y, SH.r - SH.th, -Math.PI / 2, 0); inner.lineTo(si, 1700); inner.closePath();
  const shell = new Path2D(); shell.moveTo(-900, SH.top); shell.lineTo(HC.x, SH.top); shell.arc(HC.x, HC.y, SH.r, -Math.PI / 2, 0); shell.lineTo(SH.side, 1700); shell.lineTo(si, 1700); shell.lineTo(si, HC.y); shell.arc(HC.x, HC.y, SH.r - SH.th, 0, -Math.PI / 2, true); shell.lineTo(-900, ti); shell.closePath();
  const outer = new Path2D(); outer.moveTo(-900, SH.top); outer.lineTo(HC.x, SH.top); outer.arc(HC.x, HC.y, SH.r, -Math.PI / 2, 0); outer.lineTo(SH.side, 1700);
  // structure between the plating and the cabin: floors in the old double bottom, a girder, bulkheads, the deck under the cabin
  const frames = new Path2D();
  for (let fx = -880; fx < HC.x - 30; fx += 118) frames.rect(fx, ti, 12, y - wall - ti);
  frames.rect(-900, 404, HC.x - 60 + 900, 10);
  frames.rect(x - wall - 150, y - wall, 16, 1300); frames.rect(-900, y + h + wall + 160, 2000, 14);
  for (let fy = y + 60; fy < 1700; fy += 210) frames.rect(x - wall - 134, fy, 14, 60);
  // the cabin's steel (shell ring, exposed frames behind the pulled-off panels, door frame and coaming)
  const room = new Path2D();
  room.rect(x - wall, y - wall, w + wall * 2, wall); room.rect(x - wall, y + h, w + wall * 2, wall); room.rect(x - wall, y, wall, h); room.rect(x + w, y, wall, h);
  room.rect(BW.fr[1] - 12, BW.y0, 26, WTOP - BW.y0);
  room.rect(DR.x0 - 14, DR.y0 - 12, DR.x1 - DR.x0 + 28, 16); room.rect(DR.x0 - 3, DR.y0, 5, DR.y1 - DR.y0); room.rect(DR.x1 - 2, DR.y0, 5, DR.y1 - DR.y0);
  const steel = new Path2D(); steel.addPath(shell); steel.addPath(frames); steel.addPath(room);
  _paths = { inner, shell, outer, frames, room, steel }; return _paths;
}
KN.paths = paths;

// the upside-down hull around the cabin (draw before KN.cabin). sweep: a cold glint travelling along the plating (0..1)
KN.hull = function (ctx, t, { sweep = -1, sweepA = 0, amb = 1 } = {}) {
  const p = paths();
  ctx.save();
  // the sea outside
  const g = ctx.createLinearGradient(0, -200, 0, 1500); g.addColorStop(0, '#08222b'); g.addColorStop(.45, '#04151b'); g.addColorStop(1, '#010507');
  ctx.fillStyle = g; ctx.fillRect(-1600, -1000, 4000, 3800);
  // hull interior void
  ctx.fillStyle = '#020405'; ctx.fill(p.inner);
  // structure (faint; the rings reveal it)
  ctx.fillStyle = '#091013'; ctx.fill(p.frames);
  ctx.fillStyle = rgba('#9fb3bd', .035 * amb); ctx.save(); ctx.translate(-2, -2); ctx.fill(p.frames); ctx.restore();
  // plating
  const gs = ctx.createLinearGradient(0, SH.top, 0, SH.top + 300); gs.addColorStop(0, '#36434a'); gs.addColorStop(1, '#1d262b');
  ctx.fillStyle = gs; ctx.fill(p.shell);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#5fa9c4', .08 * amb); ctx.lineWidth = 26; ctx.stroke(p.outer); ctx.restore();
  ctx.strokeStyle = rgba('#a8d6e8', .3 * amb); ctx.lineWidth = 3; ctx.stroke(p.outer);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  for (let xx = -880; xx < HC.x; xx += 34) ctx.fillRect(xx, SH.top + 9, 5, 5);
  for (let yy = HC.y; yy < 1600; yy += 34) ctx.fillRect(SH.side - 14, yy, 5, 5);
  // a cold glint running along the plating (names the hull)
  if (sweepA > 0 && sweep >= 0) {
    const L1 = HC.x + 900, L2 = Math.PI / 2 * SH.r, L3 = 900, s = sweep * (L1 + L2 + L3);
    let px, py; if (s < L1) { px = -900 + s; py = SH.top; } else if (s < L1 + L2) { const a = -Math.PI / 2 + (s - L1) / SH.r; px = HC.x + Math.cos(a) * SH.r; py = HC.y + Math.sin(a) * SH.r; } else { px = SH.side; py = HC.y + s - L1 - L2; }
    ctx.save(); ctx.clip(p.shell); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(px, py, 0, px, py, 260); gg.addColorStop(0, rgba('#e8f6ff', .55 * sweepA)); gg.addColorStop(1, 'rgba(232,246,255,0)');
    ctx.fillStyle = gg; ctx.fillRect(px - 260, py - 260, 520, 520); ctx.restore();
  }
  ctx.restore();
};

// the patch of wall where he pulled the lining panels off (straight panel-seam sides, a ragged top where the screws tore out)
let _tear = null;
function tearPath() {
  if (_tear) return _tear;
  const { x0, x1, y0 } = BW, y1 = WTOP, p = new Path2D();
  p.moveTo(x0, y1 + 4); p.lineTo(x0, y0 + 10);
  for (let i = 1; i <= 12; i++) p.lineTo(x0 + (x1 - x0) * i / 12, y0 + (i % 2 ? 7 : 1) + hi(i * 13 + 5) * 6 + (i > 8 ? 4 : 0));
  p.lineTo(x1, y1 + 4); p.closePath();
  _tear = p; return p;
}
// wall panels pulled off: the bare hull steel behind them (a plate, not a hole: seams, rivet rows, one deep frame), the cut
// panel edges and a bent panel stub left on its last screws. Same place as the old exposed frames (BW). Shared: KN.cabin
// draws it; other cabin drawings can call it at the same coordinates.
KN.bareWall = function (ctx, warm = .6, lx = 812, ly = 746) {
  const { x0, x1, y0, ry, fr } = BW, y1 = WTOP, tp = tearPath(), wk = clamp(warm), lt = (x, y, r = 220) => wk * Math.exp(-Math.hypot(x - lx, y - ly) / r);
  ctx.save();
  ctx.fillStyle = '#0b1418'; ctx.fill(tp);
  ctx.save(); ctx.clip(tp);
  if (wk > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 330); g.addColorStop(0, rgba('#ffb36b', .2 * wk)); g.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0 + 4); }
  { const g = ctx.createLinearGradient(x0, 0, x0 + 26, 0); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x0, y0, 26, y1 - y0 + 4); }
  // plate butt seam + lap seam, rivet rows along them
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x0, ry + 56, x1 - x0, 3); ctx.fillRect(x0 + 92, y0, 3, ry + 56 - y0);
  ctx.fillStyle = rgba('#9fb3bd', .06 + .12 * wk); ctx.fillRect(x0, ry + 59, x1 - x0, 1.5); ctx.fillRect(x0 + 95, y0, 1.5, ry + 56 - y0);
  for (let rx = x0 + 12; rx < x1 - 4; rx += 22) { const l = lt(rx, ry + 48); ctx.fillStyle = rgba(l > .12 ? '#ffd2a0' : '#9fb3bd', .1 + .45 * l); ctx.beginPath(); ctx.arc(rx, ry + 48, 2, 0, 7); ctx.arc(rx + 11, ry + 68, 2, 0, 7); ctx.fill(); }
  for (let yy = y0 + 22; yy < ry + 44; yy += 22) { const l = lt(x0 + 86, yy); ctx.fillStyle = rgba('#9fb3bd', .08 + .3 * l); ctx.beginPath(); ctx.arc(x0 + 86, yy, 2, 0, 7); ctx.fill(); }
  // one deep frame (web edge-on, flange toward the room); the flank facing his light catches it
  { const fx = fr[1], l = wk * Math.exp(-Math.abs(fx - lx) / 200), hiR = fx < lx;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(fx - 20, y0, 8, y1 - y0 + 4);
    ctx.fillStyle = '#121b20'; ctx.fillRect(fx - 12, y0, 26, y1 - y0 + 4);
    ctx.fillStyle = '#1b262c'; ctx.fillRect(fx - 12, y0, 6, y1 - y0 + 4);
    ctx.fillStyle = rgba('#ffcf9a', .06 + .38 * l); ctx.fillRect(hiR ? fx + 12 : fx - 12, y0, 2, y1 - y0 + 4);
    ctx.fillStyle = rgba('#9fb3bd', .1 + .1 * wk); ctx.fillRect(hiR ? fx - 12 : fx + 12, y0, 1.5, y1 - y0 + 4); }
  ctx.restore();
  // cut panel edges (the lining's thickness) and the screws left along the top
  ctx.lineJoin = 'round'; ctx.strokeStyle = '#141c21'; ctx.lineWidth = 5; ctx.stroke(tp);
  ctx.strokeStyle = rgba('#9fb3bd', .06 + .12 * wk); ctx.lineWidth = 1.4; ctx.stroke(tp);
  // a bent panel stub hanging off its last screws at the left edge
  ctx.save(); ctx.translate(x0 + 4, y0 + 14); ctx.rotate(.2);
  ctx.fillStyle = '#0d1418'; ctx.fillRect(0, 0, 30, 118);
  ctx.fillStyle = rgba('#ffcf9a', .04 + .3 * lt(x0 + 30, y0 + 80, 260)); ctx.fillRect(28, 0, 2, 118);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 118, 30, 6);
  ctx.restore();
  ctx.restore();
};

// the cabin: same design and coordinates as the hand scene's cabin (no diver light here)
KN.cabin = function (ctx, t, o = {}) {
  const { x, y, w, h, wall } = RM;
  const { warm = .6, lx = 812, ly = 746, rings = null } = o;
  const sy = xx => KN.surfY(xx, t, rings);
  ctx.save();
  const gs = ctx.createLinearGradient(0, y - wall, 0, y + h + wall); gs.addColorStop(0, '#4a565e'); gs.addColorStop(.5, '#1b2328'); gs.addColorStop(1, '#3a454c');
  ctx.fillStyle = gs; ctx.fillRect(x - wall, y - wall, w + wall * 2, h + wall * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 26; i++) ctx.fillRect(x - wall + i * (w + 2 * wall) / 26, y - wall, 2, wall);
  ctx.fillStyle = '#030607'; ctx.fillRect(x, y, w, h);
  if (warm > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .7); g.addColorStop(0, rgba('#ffb36b', .22 * warm)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = 'rgba(160,190,205,.12)'; for (let i = 1; i < 6; i++) ctx.fillRect(x + w * i / 6, y, 2, h);
  // wall panels pulled off (right): the bare steel behind them
  KN.bareWall(ctx, warm, lx, ly);
  // old floor tiles on the ceiling
  ctx.fillStyle = '#0e1418'; ctx.strokeStyle = rgba('#9fb3bd', .22 + .25 * warm); ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) ctx.strokeRect(x + i * w / 9, y, w / 9, 18);
  // the bunk, upside down: frame bolted to the ceiling, legs pointing down
  { const bx = x + 24, bw = w * .3, by = y + 18; ctx.fillStyle = '#0c1216'; ctx.fillRect(bx, by + 46, bw, 26); ctx.fillRect(bx + 8, by, 14, 50); ctx.fillRect(bx + bw - 22, by, 14, 50);
    ctx.strokeStyle = rgba('#9fb3bd', .2 + .25 * warm); ctx.lineWidth = 2.5; ctx.strokeRect(bx, by + 46, bw, 26); ctx.beginPath(); ctx.moveTo(bx + 8, by + 72); ctx.lineTo(bx + 8, by + 140); ctx.moveTo(bx + bw - 8, by + 72); ctx.lineTo(bx + bw - 8, by + 140); ctx.stroke(); }
  // door: frame, dark opening, the old sill (coaming) now at the top, the leaf swung open against the wall
  ctx.fillStyle = '#010203'; ctx.fillRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  ctx.strokeStyle = rgba('#9fb3bd', .3 + .25 * warm); ctx.lineWidth = 4; ctx.strokeRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  ctx.fillStyle = '#28323a'; ctx.fillRect(DR.x0 - 14, DR.y0 - 12, DR.x1 - DR.x0 + 28, 16);
  ctx.fillStyle = '#0b1115'; ctx.fillRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16); ctx.strokeStyle = rgba('#9fb3bd', .18 + .2 * warm); ctx.lineWidth = 2; ctx.strokeRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16);
  ctx.beginPath(); ctx.arc(DR.x0 - 80, DR.y0 + 8 + (DR.y1 - DR.y0) * .38, 7, 0, 7); ctx.stroke();
  // the stacked mattresses (right, at the water line)
  { const mx = x + w * .66, mw = w * .3; for (let k = 0; k < 3; k++) { const my = WTOP + 26 - k * 22 + Math.sin(t * 1.1 + k) * 1.5, ww = mw - k * 18;
      ctx.fillStyle = k === 2 ? '#1a1712' : '#12100d'; ctx.beginPath(); ctx.roundRect(mx + k * 9, my - 18, ww, 22, 8); ctx.fill();
      ctx.strokeStyle = rgba('#ffcf9a', .1 + .25 * warm); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + k * 9 + 8, my - 18); ctx.lineTo(mx + k * 9 + ww - 8, my - 18); ctx.stroke(); } }
  // water from the bottom
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(xx, sy(xx));
  ctx.lineTo(x + w, y + h); ctx.closePath();
  const gw = ctx.createLinearGradient(0, WTOP, 0, y + h); gw.addColorStop(0, '#0f2c35'); gw.addColorStop(.25, '#06161b'); gw.addColorStop(1, '#010304');
  ctx.save(); ctx.globalAlpha = .93; ctx.fillStyle = gw; ctx.fill(); ctx.restore();
  ctx.strokeStyle = rgba('#9fd8ea', .45); ctx.lineWidth = 2; ctx.beginPath();
  for (let xx = x; xx <= x + w + 8; xx += 8) { const yy = sy(xx); xx === x ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
  ctx.stroke();
  if (warm > 0) { const g = ctx.createLinearGradient(lx - 170, 0, lx + 170, 0); g.addColorStop(0, 'rgba(255,179,107,0)'); g.addColorStop(.5, rgba('#ffb36b', .35 * warm)); g.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 170, WTOP - 3, 340, 6); }
  ctx.restore();
};

// shock rings: a hard bright band through the steel, a faint wavefront through air / water / sea, a short ring-down glow
// rings: [{x, y, t0, v, life, col, a, band}]
KN.rings = function (ctx, t, rings) {
  const p = paths();
  let ring = 0, col = '#dff3ff';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const r of rings) {
    const u = t - r.t0; if (u <= 0 || u >= r.life) continue; const R = u * r.v, a = r.a * Math.pow(1 - u / r.life, 1.3);
    const wb = 16, wg = ctx.createRadialGradient(r.x, r.y, Math.max(0, R - wb), r.x, r.y, R + wb); wg.addColorStop(0, rgba(r.col, 0)); wg.addColorStop(.6, rgba(r.col, .16 * a)); wg.addColorStop(1, rgba(r.col, 0));
    ctx.strokeStyle = wg; ctx.lineWidth = wb * 2; ctx.beginPath(); ctx.arc(r.x, r.y, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = rgba(r.col, .22 * a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(r.x, r.y, R, 0, 7); ctx.stroke();
    if (R > 40) { ctx.strokeStyle = rgba(r.col, .08 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, R - 36, 0, 7); ctx.stroke(); }
    const rd = Math.exp(-u * 5) * r.a; if (rd > ring) { ring = rd; col = r.col; }
  }
  ctx.save(); ctx.clip(p.steel);
  if (ring > .01) { ctx.fillStyle = rgba(col, .07 * ring); ctx.fill(p.steel); }
  for (const r of rings) {
    const u = t - r.t0; if (u <= 0 || u >= r.life) continue; const R = u * r.v, a = r.a * Math.pow(1 - u / r.life, 1.3), band = r.band || 34;
    const g = ctx.createRadialGradient(r.x, r.y, Math.max(0, R - band), r.x, r.y, R + band);
    g.addColorStop(0, rgba(r.col, 0)); g.addColorStop(.6, rgba(r.col, .95 * a)); g.addColorStop(1, rgba(r.col, 0));
    ctx.strokeStyle = g; ctx.lineWidth = band * 2; ctx.beginPath(); ctx.arc(r.x, r.y, R, 0, 7); ctx.stroke();
  }
  ctx.restore(); ctx.restore();
};
// dust and rust flakes shaken off the ceiling (the old floor) as each ring passes; lit by his light
KN.dust = function (ctx, t, rings, { lx = 812, ly = 746, warm = .6, n = 30, sz = 1 } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  rings.forEach((r, k) => {
    if (r.dust === 0) return;
    for (let i = 0; i < n; i++) {
      const x0 = RM.x + 12 + hi(k * 977 + i * 13 + 5) * (RM.w - 24), y0 = RM.y + 20;
      const u = t - r.t0 - Math.hypot(x0 - r.x, y0 - r.y) / r.v - hi(k * 31 + i) * .12; if (u <= 0 || u > 2) continue;
      const yy = y0 + 2 + .5 * 760 * u * u * (.55 + .6 * hi(i * 5 + k)); if (yy > KN.surfY(x0, t) - 2) continue;
      const xx = x0 + Math.sin(u * 4 + i) * 6 * u, dl = Math.hypot(xx - lx, yy - ly), lit = warm * Math.exp(-dl / 230);
      const s = (2.4 + 3.2 * hi(i * 3 + k * 7)) * sz;
      ctx.globalAlpha = clamp((.22 + 1.6 * lit) * Math.min(1, u * 10)) * (r.dustA == null ? 1 : r.dustA);
      ctx.fillStyle = lit > .12 ? '#ffd29a' : '#a9c4cf'; ctx.fillRect(xx - s / 2, yy - s / 2, s, s * (1 + hi(i) * .8));
    }
  });
  ctx.restore();
};
KN.heart = function (q, x, y, a, bt, r = 1) {
  if (a <= 0) return;
  glow(q, x, y, 420 * r * (1 + .08 * bt), '#ff9a3c', (.09 + .08 * bt) * a);
  glow(q, x, y, 160 * r * (1 + .12 * bt), '#ffb347', (.13 + .16 * bt) * a);
};

// =====================================================================================================
function fillPoly(ctx, pts, fill) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
// diagonal section hatch for cut steel faces
function hatch(ctx, x0, y0, x1, y1, a = .05, step = 22) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = `rgba(190,215,225,${a})`; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let k = x0 - (y1 - y0); k < x1; k += step) { ctx.moveTo(k, y1); ctx.lineTo(k + (y1 - y0), y0); }
  ctx.stroke(); ctx.restore();
}
const DRIPS = [.85, 2.05, 3.3, 4.35, 5.55, 6.45];

window.PK.scenes.oxygen = function (ctx, t, d, info) {
  const { beat, souls, sourceCard } = PK, D = info.sc.data || {}, sc = info.sc;
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0;
  const subs = ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  // "it was almost gone" (second clip segment; its own subtitle chunk if the first quote is split in two)
  const s2 = subs.length >= 3 ? subs[1].t0 - sc.t0 : v0 + (v1 - v0) * .417;
  const s3 = subs.length >= 2 ? subs[subs.length - 1].t0 - sc.t0 : v0 + (v1 - v0) * .742;    // "because I was already struggling to breathe"
  const br = ((info.TL && info.TL.sfx) || []).find(s => s.type === 'breath' && Math.abs(s.t - sc.t0) < .1);
  const per = br ? 1 / ((br.rate || .6) + (br.fast || 0)) : .625;
  const ph = ((t / per) % 1 + 1) % 1, inh = ph < .42 ? Math.pow(Math.sin(Math.PI * ph / .42), 1.5) : 0;
  const gone = P(t, s2 - .15, s2 + 1.3, E.inOutQ), strug = P(t, s3 - .25, s3 + .5, E.inOutQ), endK = P(t, d - .75, d - .04, E.inQ);
  const dip = (hi(Math.floor(t * 7) + 11) > .84 ? .2 : 0) * (.35 + gone);
  const I = (1 - .3 * gone - .1 * strug) * (1 - .12 * (.5 + .5 * nz(t * 9, 4)) - dip) * (1 - .3 * endK);
  const bpm = lerp(84, 112, strug), bt = beat(t, bpm);

  // ---- section perspective: the near cut faces (steel slab above, hull-side wall at the right, water below) frame the gap,
  //      which recedes to a thin dark slit at the cabin's far wall. Front-plane coords; depth scale s: 1 (cut) .. SB (far wall)
  // the water keeps climbing: slowly all through, a step on 'almost gone', and again while he struggles to breathe
  const rise = .3 * P(t, 0, d, E.inOutQ) + .4 * gone + .3 * P(t, s3 - .5, d - .35, E.inOutQ);
  const yC = 600, yW = lerp(852, 772, rise), VX = 610, VY = 712, SB = .56, XL = -260, XR = 1010;
  const p3 = (x, y, s) => [VX + (x - VX) * s, VY + (y - VY) * s];
  const sL = .88, xLf = 650, yLf = yW - 42 + 2 * Math.sin(t * 1.1);   // his light rides the mattresses up with the water
  const Lp = p3(xLf, yLf, sL), Lc = p3(xLf, yC, sL);
  const wy = (x, tt) => yW + Math.sin(x * .021 + tt * 1.3) * 4 + Math.sin(x * .057 - tt * .9) * 2;

  ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const dr = { x: fb(t * .35, 81) * 10, y: fb(t * .3, 82) * 10, r: fb(t * .25, 83) * .006 };
  const [shx, shy, shr] = KN.shake(t, .16 * strug, 8);
  // close and low in the gap: his light held low in the frame (cold's last framing of the cabin: the old floor just under the
  // title, the light low right), pushing in as the water lifts him toward the ceiling; ends where divers opens on him
  const cam = P(t, -.3, d + .2, E.inOutQ), z = lerp(1.45, 1.9, cam) * (1 + .012 * bt);
  const AX = lerp(660, 570, P(t, 0, d, E.inOutQ)), AY = lerp(965, 925, P(t, 0, d, E.inOutQ));
  ctx.translate(AX + dr.x + shx, AY + dr.y + shy); ctx.rotate(dr.r + shr); ctx.scale(z, z); ctx.translate(-Lp[0], -Lp[1] + 6);

  // ---- far wall (thin slit) with the doorway, side walls ----
  const fq = [p3(XL, yC, SB), p3(XR, yC, SB), p3(XR, yW, SB), p3(XL, yW, SB)];
  fillPoly(ctx, fq, '#060c0f');
  { const g = ctx.createRadialGradient(Lp[0], fq[0][1] + 40, 0, Lp[0], fq[0][1] + 40, 380); g.addColorStop(0, rgba('#ff9f5a', .1 * I)); g.addColorStop(1, 'rgba(255,160,90,0)'); ctx.fillStyle = g; ctx.fill(); }
  // the cabin's wall panel seams (KN.cabin spacing), cool steel
  ctx.fillStyle = 'rgba(160,190,205,.12)'; for (let k = 1; k < 10; k++) { const a = p3(XL + k * 133, yC, SB), b = p3(XL + k * 133, yW, SB); ctx.fillRect(a[0] - 1, a[1], 2, b[1] - a[1]); }
  { const a = p3(190, yC + 30, SB), b = p3(430, yW, SB); ctx.fillStyle = '#000'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.strokeStyle = 'rgba(150,175,188,.13)'; ctx.lineWidth = 2; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    ctx.fillStyle = '#161d21'; ctx.fillRect(a[0] - 6, a[1] - 7, b[0] - a[0] + 12, 7); }
  fillPoly(ctx, [p3(XL, yC, 1), p3(XL, yC, SB), p3(XL, yW, SB), p3(XL, yW, 1)], '#040708');
  const rwq = [p3(XR, yC, 1), p3(XR, yC, SB), p3(XR, yW, SB), p3(XR, yW, 1)];
  fillPoly(ctx, rwq, '#070b0d');
  { const g = ctx.createRadialGradient(Lp[0], Lp[1], 0, Lp[0], Lp[1], 460); g.addColorStop(0, rgba('#ffa860', .16 * I)); g.addColorStop(1, 'rgba(255,160,90,0)'); ctx.fillStyle = g; ctx.fill(); }
  // the bare steel where he pulled the wall panels off: one deep frame, rivet rows (as KN.bareWall)
  { const a = p3(XR, yC, .8), b = p3(XR, yW, .8), lit = I * Math.exp(-Math.abs(.8 - sL) * 6);
    ctx.fillStyle = '#121b20'; ctx.fillRect(a[0] - 10, a[1], 16, b[1] - a[1]); ctx.fillStyle = rgba('#ffcf9a', .05 + .35 * lit); ctx.fillRect(a[0] - 10, a[1], 2, b[1] - a[1]);
    ctx.fillStyle = rgba('#9fb3bd', .1 + .2 * I); for (const s of [.94, .88, .74, .68, .63]) { const r = p3(XR, yC + 70, s); ctx.fillRect(r[0] - 1.5, r[1], 3 * s, 3 * s); } }
  // ---- ceiling: the old floor tiles, lit from below by his light; caustic ripples crawl over them ----
  const cq = [p3(XL, yC, 1), p3(XR, yC, 1), p3(XR, yC, SB), p3(XL, yC, SB)];
  fillPoly(ctx, cq, '#0e1418');                                       // KN.cabin's tile steel
  ctx.save(); ctx.clip();
  { const g = ctx.createLinearGradient(0, yC, 0, cq[2][1]); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.6)'); ctx.fillStyle = g; ctx.fillRect(-300, yC - 2, 1700, cq[2][1] - yC + 4); }
  const zs = j => 1 / (1 + (1 / SB - 1) * j), TW = 800 / 9, NT = Math.ceil((XR - XL) / TW);   // KN.cabin's tile size
  for (let i = 0; i < NT; i++) for (let j = 0; j < 6; j++) {         // stained / missing tiles
    const h0 = hi(i * 37 + j * 11 + 3); if (h0 < .8) continue; const x0 = XL + i * TW;
    fillPoly(ctx, [p3(x0, yC, zs(j / 6)), p3(x0 + TW, yC, zs(j / 6)), p3(x0 + TW, yC, zs((j + 1) / 6)), p3(x0, yC, zs((j + 1) / 6))], h0 > .92 ? 'rgba(40,52,58,.5)' : 'rgba(0,0,0,.4)');
  }
  ctx.save(); ctx.translate(Lc[0], Lc[1]); ctx.scale(1.5, .3);
  { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 420); g.addColorStop(0, rgba('#ffb877', .26 * I * (.85 + .15 * bt))); g.addColorStop(.45, rgba('#ff9a50', .06 * I)); g.addColorStop(1, 'rgba(255,150,80,0)'); ctx.fillStyle = g; ctx.fillRect(-460, -460, 920, 920); }
  ctx.restore();
  { const tg = ctx.createRadialGradient(Lc[0], Lc[1], 0, Lc[0], Lc[1], 520);
    tg.addColorStop(0, rgba('#ffd2a0', .45 * I)); tg.addColorStop(.35, rgba('#9fb3bd', .1 * I + .2)); tg.addColorStop(1, 'rgba(159,179,189,.16)');
    ctx.strokeStyle = tg; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let k = 0; k <= NT; k++) { const a = p3(XL + k * TW, yC, 1), b = p3(XL + k * TW, yC, SB); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    for (let j = 1; j <= 6; j++) { const a = p3(XL, yC, zs(j / 6)), b = p3(XR, yC, zs(j / 6)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke(); }
  { ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(Lc[0], Lc[1], 0, Lc[0], Lc[1], 330); cg.addColorStop(0, rgba('#ffc890', .38 * I)); cg.addColorStop(.6, rgba('#ffb070', .1 * I)); cg.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.strokeStyle = cg; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i < 9; i++) { const si = sL + (i - 4) * .035; for (let j = 0; j <= 24; j++) { const x = xLf - 330 + j * 660 / 24, ds = .012 * Math.sin(x * .028 + t * 2.3 + i * 1.7) + .007 * Math.sin(x * .061 - t * 3.4 + i), p = p3(x, yC, clamp(si + ds, SB, 1)); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } }
    ctx.stroke(); }
  ctx.restore();
  // ---- the bunk, upside down: bolted to the ceiling at the left, legs pointing down at the water ----
  { const bx1 = 120, s0 = .97, s1 = .72, by1 = yC + 52;
    fillPoly(ctx, [p3(XL, by1, s0), p3(bx1, by1, s0), p3(bx1, by1, s1), p3(XL, by1, s1)], '#080c0e');
    fillPoly(ctx, [p3(bx1, yC, s0), p3(bx1, yC, s1), p3(bx1, by1, s1), p3(bx1, by1, s0)], '#0b1013');
    fillPoly(ctx, [p3(XL, yC, s0), p3(bx1, yC, s0), p3(bx1, by1, s0), p3(XL, by1, s0)], '#0f161a');
    ctx.strokeStyle = rgba('#c8b49a', .1 + .14 * I); ctx.lineWidth = 2; ctx.beginPath(); { const a = p3(XL, by1, s0), b = p3(bx1, by1, s0), c = p3(bx1, by1, s1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); } ctx.stroke();
    for (const [lxx, ss] of [[bx1 - 16, s0 - .02], [bx1 - 16, s1 + .02], [-150, s0 - .02]]) {
      const a = p3(lxx, by1, ss), b = p3(lxx, by1 + 104, ss), wl = 14 * ss;
      ctx.fillStyle = '#0d1316'; ctx.fillRect(a[0] - wl / 2, a[1], wl, b[1] - a[1]); ctx.fillStyle = rgba('#c8b49a', .07 + .12 * I); ctx.fillRect(a[0] + wl / 2 - 2, a[1], 2, b[1] - a[1]);
    }
  }
  // ---- the water surface receding to the far wall ----
  const wq = [p3(XL, yW, SB), p3(XR, yW, SB), p3(XR, yW, 1), p3(XL, yW, 1)];
  { const g = ctx.createLinearGradient(0, wq[0][1], 0, yW); g.addColorStop(0, '#081a20'); g.addColorStop(1, '#0d2a33'); fillPoly(ctx, wq, g); }
  ctx.save(); ctx.clip();
  { const tex = sheenTex(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .22; ctx.drawImage(tex, -380 + Math.sin(t * .09) * 120 + t * 6, wq[0][1] - 60, 1900, 380); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.strokeStyle = 'rgba(143,211,232,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wq[0][0], wq[0][1]); ctx.lineTo(wq[1][0], wq[1][1]); ctx.stroke();
  { const Mr = p3(xLf, yW + 10, (sL + 1) / 2), rg = ctx.createRadialGradient(Mr[0], Mr[1], 0, Mr[0], Mr[1], 520);
    rg.addColorStop(0, rgba('#ffc184', .7 * I)); rg.addColorStop(.3, rgba('#ffa860', .22 * I)); rg.addColorStop(1, 'rgba(130,200,220,.12)');
    ctx.strokeStyle = rg; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let j = 1; j < 12; j++) {
      const s = zs(1 - j / 12), w0 = Math.sin(t * 1.7 + j * 1.9); let on = false;
      for (let i = 0; i <= 30; i++) {
        const x = XL + (XR - XL) * i / 30, y = yW + 3 * Math.sin(x * .02 + t * 1.6 + j * 1.9) + 2 * Math.sin(x * .05 - t * 2.2 + j * .7) * w0, p = p3(x, y, s);
        const vis = Math.sin(x * .013 + j * 2.1 + t * .5) > -.1;
        if (vis && on) ctx.lineTo(p[0], p[1]); else if (vis) ctx.moveTo(p[0], p[1]); on = vis;
      }
    }
    ctx.stroke(); }
  // his reflection on the surface in front of him
  { ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) { const s = lerp(sL + .01, 1, k / 9), p = p3(xLf + Math.sin(k * 2.3 + t * 2.2) * 8, yW, s), w = (34 + 50 * (1 - k / 10)) * (.6 + .4 * Math.sin(k * 1.9 + t * 3.1)) * s;
      ctx.fillStyle = rgba('#ffb36b', .5 * I * (1 - k / 12) * (.7 + .3 * bt)); ctx.fillRect(p[0] - w / 2, p[1] - 1, w, 2.5); } }
  // condensation drips ringing out on the surface
  { ctx.globalCompositeOperation = 'lighter';
    DRIPS.forEach((tf, i) => {
      const x = xLf + (hi(i * 3 + 1) - .5) * 700, s = lerp(.62, .97, hi(i * 5 + 2)), u = t - tf - .3; if (u <= 0 || u > 1.6) return;
      const C = p3(x, yW, s), lit = I * Math.exp(-Math.abs(x - xLf) / 300);
      for (let k = 0; k < 2; k++) { const q = clamp(u / 1.6 * 1.15 - k * .18); if (q <= 0) continue; const rr = (6 + 90 * q) * s;
        ctx.strokeStyle = rgba(lit > .3 ? '#ffc48a' : '#9fd8ea', (.3 + .5 * lit) * (1 - q)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(C[0], C[1], rr, rr * .16, 0, 0, 7); ctx.stroke(); }
    }); }
  ctx.restore();
  // ---- the stacked mattresses, his light on them ----
  { const s0 = .99, s1 = .7, yT = yW - 34 + 1.5 * Math.sin(t * 1.1), LH = (yW + 2 - yT) / 3;
    // the top surface (his light lies on it), then the three mattresses' front faces, stacked and offset as in KN.cabin
    const top = [p3(548, yT, s0), p3(866, yT, s0), p3(866, yT, s1), p3(548, yT, s1)];
    fillPoly(ctx, top, '#15110d');
    { const g = ctx.createRadialGradient(Lp[0], Lp[1], 0, Lp[0], Lp[1], 260); g.addColorStop(0, rgba('#ffb36b', .45 * I)); g.addColorStop(1, 'rgba(255,170,100,0)'); ctx.fillStyle = g; ctx.fill(); }
    const eg = ctx.createRadialGradient(Lp[0], Lp[1], 0, Lp[0], Lp[1], 360); eg.addColorStop(0, rgba('#ffd2a0', .8 * I)); eg.addColorStop(1, 'rgba(255,200,150,.04)');
    for (let k = 0; k < 3; k++) {
      const ya = yW + 2 - (k + 1) * LH, fa = p3(520 + k * 14, ya, s0), fb2 = p3(906 - k * 20, ya + LH + 1, s0);
      ctx.fillStyle = k === 2 ? '#15120e' : '#0d0b09'; ctx.beginPath(); ctx.roundRect(fa[0], fa[1], fb2[0] - fa[0], fb2[1] - fa[1], 6); ctx.fill();
      ctx.strokeStyle = eg; ctx.lineWidth = k === 2 ? 2.5 : 1.6; ctx.beginPath(); ctx.moveTo(fa[0] + 6, fa[1] + .5); ctx.lineTo(fb2[0] - 6, fa[1] + .5); ctx.stroke();
    } }
  souls(ctx, t, [{ x: Lp[0], y: Lp[1], a: clamp(.45 + .55 * I), s: 2.6 }], { bpm });

  // ---- the near cut faces: water body, hull-side wall, the steel slab overhead ----
  { ctx.beginPath(); ctx.moveTo(-300, 1500); for (let x = -300; x <= XR + 8; x += 8) ctx.lineTo(x, wy(x, t)); ctx.lineTo(XR, 1500); ctx.closePath();
    const g = ctx.createLinearGradient(0, yW, 0, yW + 420); g.addColorStop(0, '#0b222a'); g.addColorStop(.22, '#041116'); g.addColorStop(1, '#010304'); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(Lp[0], yW + 30); ctx.scale(.85, 1.5);
    { const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 260); sg.addColorStop(0, rgba('#ff9f50', .2 * I)); sg.addColorStop(.5, rgba('#c86a30', .06 * I)); sg.addColorStop(1, 'rgba(255,150,80,0)'); ctx.fillStyle = sg; ctx.fillRect(-260, -40, 520, 300); }
    ctx.restore();
    for (let k = 0; k < 6; k++) {      // his light leaking down into the black water
      const a0 = Math.PI / 2 + (k - 2.5) * .16 + .05 * Math.sin(t * .7 + k * 2), len = 260 + 90 * hi(k * 7), x0 = Lp[0] + (k - 2.5) * 14, al = .05 * I * (.6 + .4 * Math.sin(t * 1.3 + k * 1.7));
      const g2 = ctx.createLinearGradient(x0, yW, x0 + Math.cos(a0) * len, yW + Math.sin(a0) * len); g2.addColorStop(0, rgba('#ffb36b', al)); g2.addColorStop(1, 'rgba(255,179,107,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x0 - 6, yW); ctx.lineTo(x0 + 6, yW); ctx.lineTo(x0 + Math.cos(a0 - .05) * len, yW + Math.sin(a0 - .05) * len); ctx.lineTo(x0 + Math.cos(a0 + .05) * len, yW + Math.sin(a0 + .05) * len); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 46; i++) {     // suspended particles
      const x = ((hi(i * 3 + 7) * 1400 + t * 6 * (hi(i) - .5) + fb(t * .2 + i, 3) * 40) % 1400 + 1400) % 1400 - 200, y = yW + 14 + ((hi(i * 5 + 1) * 380 - t * 4 + fb(t * .15 + i, 5) * 20) % 380 + 380) % 380;
      const lit = I * Math.exp(-Math.hypot(x - Lp[0], y - yW) / 200); ctx.fillStyle = rgba(lit > .2 ? '#ffd0a0' : '#9cc9d6', .1 + .6 * lit); ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
    ctx.strokeStyle = rgba('#9fd8ea', .5); ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = -300; x <= XR + 8; x += 8) { const y = wy(x, t); x === -300 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    const rl = ctx.createLinearGradient(Lp[0] - 220, 0, Lp[0] + 220, 0); rl.addColorStop(0, 'rgba(255,179,107,0)'); rl.addColorStop(.5, rgba('#ffb36b', .5 * I)); rl.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = rl; ctx.fillRect(Lp[0] - 220, yW - 3, 440, 6); }
  { const g = ctx.createLinearGradient(XR, 0, XR + 140, 0); g.addColorStop(0, '#2c363c'); g.addColorStop(.25, '#171d21'); g.addColorStop(1, '#0c1013');
    ctx.fillStyle = g; ctx.fillRect(XR, -200, 300, 1800); hatch(ctx, XR, -200, XR + 300, 1600, .045);
    const wg = ctx.createRadialGradient(XR, Lp[1], 0, XR, Lp[1], 340); wg.addColorStop(0, rgba('#ffb36b', .35 * I)); wg.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = wg; ctx.fillRect(XR, Lp[1] - 340, 3, 680);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; for (let y = 640; y < 1300; y += 64) ctx.fillRect(XR + 40, y, 6, 6); }
  { const g = ctx.createLinearGradient(0, yC - 200, 0, yC); g.addColorStop(0, '#080b0d'); g.addColorStop(.72, '#1b2227'); g.addColorStop(1, '#343f46');
    ctx.fillStyle = g; ctx.fillRect(-300, yC - 600, XR + 300, 600); hatch(ctx, -300, yC - 600, XR, yC - 18, .03);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; for (let x = -280; x < XR; x += 52) ctx.fillRect(x, yC - 62, 6, 6);
    ctx.fillStyle = '#141b1f'; ctx.fillRect(-300, yC - 18, XR + 300, 18);            // the old floor tiles in section
    ctx.fillStyle = 'rgba(0,0,0,.6)'; for (let x = XL; x < XR; x += TW) ctx.fillRect(x - 1, yC - 18, 2, 18);
    const tg = ctx.createLinearGradient(Lp[0] - 380, 0, Lp[0] + 380, 0); tg.addColorStop(0, 'rgba(255,190,130,0)'); tg.addColorStop(.5, rgba('#ffc890', .55 * I)); tg.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = tg; ctx.fillRect(Lp[0] - 380, yC - 3, 760, 3);
    ctx.fillStyle = 'rgba(160,190,205,.18)'; ctx.fillRect(-300, yC - 19, XR + 300, 1); }

  // ---- haze in the gap, his breath pooling under the ceiling, condensation drops ----
  const haze = .6 + .55 * gone + .35 * strug;
  KN.light(ctx, q => {
    for (let i = 0; i < 9; i++) {
      const s = lerp(.6, 1, hi(i * 11 + 1)), x = -100 + hi(i * 7 + 3) * 1100 + 40 * Math.sin(t * .3 + i), y = lerp(yC + 30, yW - 20, hi(i * 5 + 2)) + 10 * Math.sin(t * .4 + i * 2);
      const p = p3(x, y, s), lit = Math.exp(-Math.hypot(p[0] - Lp[0], p[1] - Lp[1]) / 260);
      q.save(); q.translate(p[0], p[1]); q.scale(2.2, .45); glow(q, 0, 0, 160 + 80 * hi(i), lit > .3 ? '#ffb070' : '#6f8e99', (.07 + .15 * lit * I) * haze); q.restore();
    }
    const k0 = Math.max(0, Math.floor((t - 2.5) / per) - 1);
    for (let k = k0; k * per + per * .5 <= t; k++) {      // a warm puff on every exhale, rising to the tiles and spreading under them
      const u = (t - (k * per + per * .5)) / 2.4; if (u < 0 || u > 1) continue;
      const rise2 = 1 - Math.pow(1 - Math.min(1, u * 1.7), 2), px = Lp[0] + nz(k * 3.1, 9) * 30 * u, py = lerp(Lp[1] - 10, Lc[1] + 16, rise2);
      q.save(); q.translate(px, py); q.scale(1 + 1.6 * u * rise2, .6); glow(q, 0, 0, 40 + 130 * u, '#ffc89a', .2 * Math.pow(1 - u, 1.3) * Math.min(1, u * 12) * I * (1 + .8 * strug)); q.restore();
    }
    q.save(); q.translate(Lc[0], Lc[1] + 22); q.scale(2.6, .3); glow(q, 0, 0, 220, '#ffb57a', .12 * haze * I); q.restore();
    KN.heart(q, Lp[0], Lp[1], 1.05 * I, bt, 1.2);
  });
  { ctx.save(); ctx.globalCompositeOperation = 'lighter';
    DRIPS.forEach((tf, i) => {
      const x = xLf + (hi(i * 3 + 1) - .5) * 700, s = lerp(.62, .97, hi(i * 5 + 2)), u = t - tf, lit = I * Math.exp(-Math.abs(x - xLf) / 300), fall = .3;
      if (u > -.7 && u <= 0) { const p = p3(x, yC, s), r = (2 + 2.5 * (1 + u / .7)) * s; ctx.fillStyle = rgba('#ffe0b8', .35 + .55 * lit); ctx.beginPath(); ctx.ellipse(p[0], p[1] + r, r * .8, r * 1.25, 0, 0, 7); ctx.fill(); }
      else if (u > 0 && u < fall) { const q2 = u / fall, y = lerp(yC, yW, q2 * q2), p = p3(x, y, s), p2 = p3(x, Math.max(yC, y - 30 - 50 * q2), s);
        ctx.strokeStyle = rgba('#ffe0b8', .35 + .5 * lit); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    });
    ctx.restore(); }
  const LS = ctx.getTransform().transformPoint(new DOMPoint(Lp[0], Lp[1]));
  ctx.restore();

  // ---- tunnel vision: closes on every inhale, tighter as the air runs out ----
  const irisK = clamp(.45 + .1 * P(t, 0, s2) + .15 * gone + .2 * strug + .6 * endK);
  KN.iris(ctx, irisK, inh * (.8 + .8 * strug), LS.x, LS.y - 70);
  // the last beat goes dark but for a faint ember of his light (hard cut to the knocks)
  if (endK > 0) { ctx.fillStyle = `rgba(1,2,3,${(.9 * endK).toFixed(3)})`; ctx.fillRect(0, 0, W, 1290); glow(ctx, LS.x, LS.y, 60, '#ffb347', .35 * endK); }
  KN.subBand(ctx);
  // where we are now: the officer's cabin next door (approved label), gone before the real voice gets going
  const cA = P(t, .15, .4, E.outQ) * (1 - P(t, 1.6, 1.9, E.inQ));
  if (cA > 0) { const s = lerp(.86, 1, E.outBack(clamp(P(t, .15, .4)))); ctx.save(); ctx.translate(540, 540); ctx.scale(s, s); PK.chip(ctx, '사관 선실', 0, 0, cA, { size: 34, color: '#cfe8ff' }); ctx.restore(); }
  sourceCard(ctx, D.who || '', D.where || '', P(t, .03, .28, E.outQ) * (1 - P(t, d - .22, d, E.inQ)));
};
})();
