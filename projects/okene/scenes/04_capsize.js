// capsize (≈17.25-23.37): "새벽, 12명이 탄 예인선 재스콘 4호가 뒤집힌 채 30미터 해저로 가라앉았습니다."
// Cutaway side view at night: rough swell, rain, the tanker's stern looming at the left, the tug holding it on a taut line.
// 12 small warm lights come on in the deckhouse (the 12 aboard; no figures). On "뒤집힌" the tug heels and rolls over
// (faux-3D roll about its long axis: the bottom swings into view, the deckhouse goes under; no single giant wave = cause left
// open); the camera leans into the roll and pushes in, and the spray bursts only as the roll completes so the roll reads.
// The lights NEVER go out: they turn with the deckhouse (sliding through the centreline while it is edge-on, then on the
// side now facing us), go under with it and are only dimmed, all together and slowly, by the water and the murk. The camera
// follows the inverted hull down through the water column (depth gauge 0 -> 30 m) until it settles upside down on the seabed
// in a cloud of silt; muffled darkness closes in over the whole frame. Chip strings come from the scene data (info.sc.data).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, text, measure, roundRect, drift, FONT } = L;
const { K, at, chip, souls, beat, suffocate } = window.PK;

// ---------------- tug geometry (local units; x: stern -380 .. bow +396, z: up from the keel) ----------------
const ZC = 70, B2 = 92, BS = 74, SC = .98;                     // roll axis height, half-beam (hull / deckhouse), local->world scale
const HULL = [[-380, 124], [-384, 64], [-369, 26], [-334, 7], [-262, 0], [226, 0], [296, 9], [344, 32], [374, 80], [398, 162], [356, 158], [44, 154], [40, 124]];
const KEEL = [[-369, 26], [-334, 7], [-262, 0], [226, 0], [296, 9], [344, 32], [374, 80]];
const hb = x => x < 120 ? B2 : B2 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 120) / 285, 2)));
// deckhouse blocks on the fo'c'sle: [x0 bottom, x1 bottom, x0 top, x1 top, z0, z1]
const HOUSE = [[46, 306, 52, 296, 154, 208], [72, 284, 76, 278, 208, 256], [112, 276, 106, 290, 256, 302]];
// 12 warm lights (the 12 aboard): [x, z, on hull side?]
const LIGHTS = [[146, 280], [196, 280], [246, 280], [100, 232], [150, 232], [200, 232], [250, 232], [84, 182], [150, 182], [222, 182], [118, 140, 1], [262, 140, 1]];
const LORDER = [5, 1, 9, 3, 11, 7, 0, 6, 10, 2, 8, 4];

// low-frequency camera (heavy lurch + faint buzz)
function camM(x, y, zoom, rot, shake, t, seed = 0) {
  const sx = shake * (noise1(t * 7, seed + 1) * 16 + noise1(t * 19, seed + 6) * 1.5), sy = shake * (noise1(t * 7, seed + 2) * 16 + noise1(t * 19, seed + 7) * 1.5);
  return new DOMMatrix().translate(540 + sx, 850 + sy).rotate((rot + shake * noise1(t * 5, seed + 3) * .005) * 180 / Math.PI).scale(zoom).translate(-x, -y);
}
function surfY(x, t, amp = 1) { return 900 + amp * (28 * Math.sin(x * .0055 - t * 1.15) + 11 * Math.sin(x * .013 + t * .8 + 1) + 4 * Math.sin(x * .034 - t * 2.3)); }

// ---------------- the ship, drawn in its local frame (after translate/rotate/scale to world) ----------------
// Faux-3D roll about the long axis: a point (x, y = toward the viewer, z = up) projects to screen v = -(y sinφ + (z-ZC) cosφ).
// Every planar face is an affine map of its own 2D art, faces are culled by their rotated normal and painted far -> near.
// φ < 0 rolls the top TOWARD the viewer (deck tilts up into view, the deckhouse swings down into the sea).
function hullOutline(c, ys, sn, cs) { // per-vertex half-beam so the bow narrows as it rolls
  c.beginPath(); HULL.forEach(([x, z], i) => { const y = ys * hb(x), v = -(y * sn + (z - ZC) * cs); i ? c.lineTo(x, v) : c.moveTo(x, v); }); c.closePath();
}
const sideT = (ctx, y, sn, cs) => ctx.transform(1, 0, 0, -cs, 0, -(y * sn - ZC * cs));     // plane y = const, art in (x, z)
const topT = (ctx, z, sn, cs) => ctx.transform(1, 0, 0, -sn, 0, -(z - ZC) * cs);           // plane z = const, art in (x, y)
function houseSide(ctx, ys, sn, cs, uw, k) {
  const [a0, a1, b0, b1, z0, z1] = HOUSE[k];
  ctx.save(); sideT(ctx, ys * BS, sn, cs);
  ctx.beginPath(); ctx.moveTo(a0, z0); ctx.lineTo(a1, z0); ctx.lineTo(b1, z1); ctx.lineTo(b0, z1); ctx.closePath();
  const g = ctx.createLinearGradient(0, z0, 0, z1); g.addColorStop(0, '#161c20'); g.addColorStop(1, ys > 0 ? '#2c353b' : '#20272c'); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#081014';
  if (k === 2) { for (let i = 0; i < 7; i++) ctx.fillRect(122 + i * 23, 270, 17, 20); ctx.fillStyle = 'rgba(160,200,215,.08)'; ctx.fillRect(122, 286, 160, 3); }
  if (k === 1) { for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(90 + i * 25, 232, 6, 0, 7); ctx.fill(); } ctx.fillStyle = '#12191d'; ctx.fillRect(266, 212, 12, 30); }
  if (k === 0) { for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(70 + i * 25, 182, 6, 0, 7); ctx.fill(); } ctx.fillStyle = '#12191d'; ctx.fillRect(56, 158, 16, 34); }
  ctx.strokeStyle = rgba('#9fb3bd', .28); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a0, z1 - 2); ctx.lineTo(a1, z1 - 2); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#9fc6d8', .3 + .2 * uw); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(b0, z1); ctx.lineTo(b1, z1); ctx.stroke();
  ctx.restore();
}
function houseTop(ctx, sn, cs, uw, k) {
  const [, , b0, b1, , z1] = HOUSE[k];
  ctx.save(); topT(ctx, z1, sn, cs);
  ctx.fillStyle = k === 2 ? '#323c42' : '#2a3338'; ctx.fillRect(b0, -BS, b1 - b0, BS * 2);
  ctx.strokeStyle = rgba('#9fc6d8', .25 + .2 * uw); ctx.lineWidth = 1.6; ctx.strokeRect(b0, -BS, b1 - b0, BS * 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; if (k === 2) { ctx.fillRect(180, -22, 40, 44); ctx.fillRect(120, -BS, 8, BS * 2); }
  ctx.restore();
}
function deckTop(ctx, sn, cs, uw, fwd) {
  ctx.save();
  if (!fwd) {        // aft working deck: timber sheathing, towing pins, stern roller, winch
    topT(ctx, 124, sn, cs);
    ctx.fillStyle = '#221f1b'; ctx.fillRect(-380, -B2, 420, B2 * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2; for (let y = -B2 + 9; y < B2; y += 9) { ctx.beginPath(); ctx.moveTo(-380, y); ctx.lineTo(40, y); ctx.stroke(); }
    ctx.fillStyle = '#16191b'; ctx.fillRect(-386, -62, 22, 124); ctx.fillRect(-340, -26, 9, 9); ctx.fillRect(-340, 17, 9, 9); ctx.fillRect(-4, -46, 44, 92);
    ctx.fillStyle = '#3a454c'; ctx.fillRect(-388, -B2, 8, B2 * 2); ctx.fillRect(-380, -B2, 420, 6); ctx.fillRect(-380, B2 - 6, 420, 6);
    ctx.strokeStyle = rgba('#9fc6d8', .22 + .2 * uw); ctx.lineWidth = 1.6; ctx.strokeRect(-380, -B2, 420, B2 * 2);
  } else {            // fo'c'sle deck (mostly under the deckhouse) + windlass
    topT(ctx, 154, sn, cs);
    ctx.beginPath(); ctx.moveTo(40, -B2); for (let x = 40; x <= 398; x += 14) ctx.lineTo(x, -hb(x)); for (let x = 398; x >= 40; x -= 14) ctx.lineTo(x, hb(x)); ctx.closePath();
    ctx.fillStyle = '#242c31'; ctx.fill(); ctx.strokeStyle = rgba('#9fc6d8', .22 + .2 * uw); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#14191c'; ctx.beginPath(); ctx.arc(338, -22, 10, 0, 7); ctx.arc(338, 22, 10, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function hullSide(ctx, ys, sn, cs, uw) {
  ctx.save(); hullOutline(ctx, ys, sn, cs);
  ctx.save(); ctx.clip();
  sideT(ctx, ys * B2, sn, cs);
  const gr = ctx.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, '#171c1f'); gr.addColorStop(.6, '#222a2f'); gr.addColorStop(1, '#2e383e');
  ctx.fillStyle = gr; ctx.fillRect(-420, -10, 860, 200);
  ctx.fillStyle = '#3d1714'; ctx.fillRect(-420, -10, 860, 66);          // antifouling below the waterline
  ctx.fillStyle = '#0b0d0e'; ctx.fillRect(-420, 56, 860, 9);            // boot-top
  ctx.fillStyle = '#121619'; ctx.fillRect(-420, 104, 860, 11); ctx.fillStyle = rgba('#9fb3bd', .18); ctx.fillRect(-420, 114, 860, 2);
  ctx.fillStyle = '#0a0f12'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(80 + k * 30, 140, 5.5, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; for (let x = -340; x < 360; x += 62) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 150); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; for (let x = -350; x < 20; x += 46) ctx.fillRect(x, 116, 20, 6);
  ctx.restore();
  ctx.strokeStyle = rgba('#a9d8ea', .22 + .3 * uw); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();
}
function bottomFace(ctx, sn, cs, uw) {
  ctx.save(); ctx.beginPath();
  KEEL.forEach(([x, z], i) => { const v = -(hb(x) * sn + (z - ZC) * cs); i ? ctx.lineTo(x, v) : ctx.moveTo(x, v); });
  for (let i = KEEL.length - 1; i >= 0; i--) { const [x, z] = KEEL[i]; ctx.lineTo(x, -(-hb(x) * sn + (z - ZC) * cs)); }
  ctx.closePath();
  const vc = ZC * cs, vh = B2 * sn;
  const g = ctx.createLinearGradient(0, vc - vh, 0, vc + vh); g.addColorStop(0, '#5a221d'); g.addColorStop(.5, '#34130f'); g.addColorStop(1, '#1e0a09');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba('#bfe6f5', .2 + .4 * uw); ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-334, vc); ctx.lineTo(300, vc); ctx.stroke();
  ctx.restore();
}
// vertical cut-outs on the centreline / funnels: drawn flat in their own y plane
function flats(ctx, y, sn, cs, uw, part) {
  ctx.save(); sideT(ctx, y, sn, cs);
  if (part === 'mast') {
    ctx.strokeStyle = '#3a454c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(198, 300); ctx.lineTo(204, 424); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(168, 396); ctx.lineTo(236, 396); ctx.moveTo(150, 334); ctx.lineTo(250, 334); ctx.stroke();
    ctx.fillStyle = '#2e383e'; ctx.fillRect(176, 334, 46, 8);
  } else if (part === 'crane') {
    ctx.strokeStyle = '#323c42'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-150, 124); ctx.lineTo(-150, 180); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-150, 178); ctx.lineTo(-40, 214); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#4a565e'; ctx.beginPath(); ctx.moveTo(-40, 214); ctx.lineTo(-40, 160); ctx.stroke();
    ctx.fillStyle = '#2b3439'; ctx.fillRect(-338, 124, 7, 26); ctx.fillRect(-318, 124, 7, 26); ctx.fillStyle = '#262f34'; ctx.fillRect(0, 124, 44, 40);
    ctx.fillStyle = '#3a454c'; ctx.beginPath(); ctx.arc(-374, 118, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#1a2024'; ctx.beginPath(); ctx.arc(-374, 118, 5, 0, 7); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-2, 124); ctx.lineTo(38, 124); ctx.lineTo(28, 272); ctx.lineTo(-14, 272); ctx.closePath();
    const g = ctx.createLinearGradient(-14, 0, 38, 0); g.addColorStop(0, '#20282c'); g.addColorStop(.5, '#3a454b'); g.addColorStop(1, '#1c2327'); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#0c0f11'; ctx.fillRect(-14, 260, 42, 12); ctx.strokeStyle = rgba('#9fc6d8', .2 + .2 * uw); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, 272); ctx.lineTo(28, 272); ctx.stroke();
  }
  ctx.restore();
}
// world position of a local ship point
function shipPt(S, x, y, z) { const v = -(y * S.sn + (z - ZC) * S.cs); const c = Math.cos(S.pitch), s = Math.sin(S.pitch); return [S.x + (x * c - v * s) * SC, S.y + (x * s + v * c) * SC]; }
function drawShip(ctx, t, S, o) {
  const { sn, cs } = S, uw = o.uw; const F = [];
  const dep = (y, z) => y * cs - (z - ZC) * sn;          // toward the viewer
  const add = (vis, y, z, fn) => { if (vis) F.push({ d: dep(y, z), fn }); };
  add(cs > .002, B2, 70, () => hullSide(ctx, 1, sn, cs, uw));
  add(cs < -.002, -B2, 70, () => hullSide(ctx, -1, sn, cs, uw));
  add(sn > .004, 0, 0, () => bottomFace(ctx, sn, cs, uw));
  add(sn < -.004, 0, 124, () => deckTop(ctx, sn, cs, uw, false));
  add(sn < -.004, 0, 154, () => deckTop(ctx, sn, cs, uw, true));
  for (let k = 0; k < 3; k++) {
    const [, , , , z0, z1] = HOUSE[k];
    add(cs > .002, BS, (z0 + z1) / 2, () => houseSide(ctx, 1, sn, cs, uw, k));
    add(cs < -.002, -BS, (z0 + z1) / 2, () => houseSide(ctx, -1, sn, cs, uw, k));
    add(sn < -.004, 0, z1, () => houseTop(ctx, sn, cs, uw, k));
  }
  const fl = Math.abs(cs) > .04;
  add(fl, 0, 362, () => flats(ctx, 0, sn, cs, uw, 'mast'));
  add(fl, 0, 150, () => flats(ctx, 0, sn, cs, uw, 'crane'));
  add(fl, 46, 200, () => flats(ctx, 46, sn, cs, uw, 'funnel'));
  add(fl, -46, 200, () => flats(ctx, -46, sn, cs, uw, 'funnel'));
  F.sort((a, b) => a.d - b.d);
  ctx.save(); ctx.translate(S.x, S.y); ctx.rotate(S.pitch); ctx.scale(SC, SC);
  F.forEach(f => f.fn());
  ctx.restore();
}
function drawLights(ctx, t, S, lit, pops) {
  if (lit <= 0) return;
  // the lights sit on whichever side faces the camera; while that side is edge-on they slide in to the centreline, so their
  // screen positions stay continuous through the whole roll (never culled, never switched off)
  const ys = (S.cs < 0 ? -1 : 1) * Math.min(1, Math.abs(S.cs) * 3);
  const pts = LIGHTS.map(([x, z, hullSide], i) => { const [px, py] = shipPt(S, x, ys * (hullSide ? B2 : BS), z); return { x: px, y: py, a: lit * pops[i], s: .56 }; });
  const [cx, cy] = shipPt(S, 180, ys * BS, 230); glow(ctx, cx, cy, 230, K.amber, .16 * lit * (pops.reduce((a, b) => a + b, 0) / 12));
  souls(ctx, t, pts, { bpm: 70 });
}

// ---------------- environment ----------------
function sky(ctx, t, x0, x1, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#010203'); g.addColorStop(.7, '#05101400'); g.addColorStop(1, '#0a1c22');
  ctx.fillStyle = '#010203'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // low cloud masses drifting
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x = ((hash(i * 5) * 1800 + t * (18 + 10 * hash(i))) % 1800) - 400, y = 520 + hash(i * 9) * 260, r = 260 + hash(i * 3) * 220;
    ctx.save(); ctx.translate(x, y); ctx.scale(2.4, .55); const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r); cg.addColorStop(0, rgba('#1a2a30', .35)); cg.addColorStop(1, 'rgba(26,42,48,0)');
    ctx.fillStyle = cg; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  }
  ctx.restore();
}
function tanker(ctx, t, a) {
  // the loaded tanker's stern, far behind at the left (scale ~.75), with cold deck lights
  ctx.save(); ctx.globalAlpha *= a;
  glow(ctx, 90, 700, 380, '#9fd8ef', .06, 'lighter');
  ctx.fillStyle = '#070b0d';
  ctx.beginPath(); ctx.moveTo(-500, 770); ctx.lineTo(196, 770); ctx.lineTo(210, 800); ctx.lineTo(196, 846); ctx.lineTo(-500, 846); ctx.closePath(); ctx.fill();
  ctx.fillRect(40, 640, 150, 132); ctx.fillRect(20, 640, 190, 10); ctx.fillRect(98, 588, 46, 54); ctx.fillRect(116, 556, 4, 34);
  ctx.strokeStyle = rgba('#8fb7c8', .25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-500, 770); ctx.lineTo(196, 770); ctx.lineTo(210, 800); ctx.moveTo(20, 640); ctx.lineTo(210, 640); ctx.stroke();
  // windows + deck lights
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { if (hash(r * 7 + k * 3) < .45) continue; const f = .7 + .3 * noise1(t * 2 + r * 5 + k, 4); ctx.fillStyle = rgba('#dcefff', .55 * f); ctx.fillRect(52 + k * 23, 662 + r * 26, 9, 6); }
  [[180, 640], [-60, 770], [-260, 770], [30, 770]].forEach(([x, y], i) => { const f = .75 + .25 * noise1(t * 3 + i * 7, 9); glow(ctx, x, y - 6, 70, '#e8f6ff', .32 * f); ctx.fillStyle = rgba('#ffffff', .85 * f); ctx.fillRect(x - 2, y - 8, 4, 4); });
  ctx.restore();
}
function farSea(ctx, t, x0, x1) {
  // receding sea between the horizon and the near cut plane
  const g = ctx.createLinearGradient(0, 800, 0, 930); g.addColorStop(0, '#081b21'); g.addColorStop(1, '#0d2b34');
  ctx.fillStyle = g; ctx.fillRect(x0, 800, x1 - x0, 140);
  ctx.save(); ctx.strokeStyle = rgba('#9fd8ef', .1); ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { const y = 808 + i * i * 1.6, ph = t * (.6 + i * .12); ctx.beginPath(); for (let x = x0; x <= x1; x += 24) { const yy = y + Math.sin(x * (.02 - i * .0012) + ph + i) * (1 + i * .5); x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
  ctx.restore();
}
function surfacePath(x0, x1, t, amp) { const p = new Path2D(); for (let x = x0; x <= x1; x += 12) { const y = surfY(x, t, amp); x === x0 ? p.moveTo(x, y) : p.lineTo(x, y); } return p; }
// soft blob sprite (silt / foam), built once
let BLOB = null;
function blob() {
  if (BLOB) return BLOB; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); BLOB = c; return c;
}
let SILT_T = null;
function siltTinted() { if (SILT_T) return SILT_T; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.drawImage(blob(), 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#5f6a63'; x.fillRect(0, 0, 128, 128); SILT_T = c; return c; }

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
function quiet(ctx, k) {
  let g = ctx.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, `rgba(1,2,3,${.82 * k})`); g.addColorStop(.8, `rgba(1,2,3,${.6 * k})`); g.addColorStop(1, 'rgba(1,2,3,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 470);
  g = ctx.createLinearGradient(0, 1200, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${.82 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 1200, W, 90); ctx.fillStyle = `rgba(1,2,3,${.86 * k})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
}
// slim depth gauge at the right edge (ticks + pointer only; the reading itself sits in the top slot)
function gauge(ctx, t, a, m) {
  // inset from the right edge (Reels action column)
  if (a <= 0) return; const x = 990, y0 = 560, y1 = 1100; const yy = lerp(y0, y1, clamp(m / 30));
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = rgba('#8fd3e8', .4); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  for (let k = 0; k <= 30; k += 2) { const ty = lerp(y0, y1, k / 30), mj = k % 10 === 0; ctx.lineWidth = mj ? 2.5 : 1.5; ctx.beginPath(); ctx.moveTo(x - (mj ? 14 : 7), ty); ctx.lineTo(x, ty); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, y0, 0, yy); g.addColorStop(0, 'rgba(127,214,255,.1)'); g.addColorStop(1, 'rgba(127,214,255,.7)'); ctx.fillStyle = g; ctx.fillRect(x - 2, y0, 4, yy - y0);
  ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x - 20, yy - 8); ctx.lineTo(x - 20, yy + 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  glow(ctx, x, yy, 36, '#bfe9ff', .45 * a);
}

window.PK.scenes.capsize = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const tDawn = at(info, '새벽', .02), t12 = at(info, '12명', .12), tTug = at(info, '예인선', .27), tJas = at(info, '재스콘', .36), t4 = at(info, '4호가', .43),
    tFlip = at(info, '뒤집힌', .5), tChae = at(info, '채', .58), t30 = at(info, '30미터', .63), tSea = at(info, '해저로', .73), tSank = at(info, '가라앉', .8);
  const tLand = tSank + .36, Ybed = 2250;
  const dr = drift(t, 1, 61);

  // ---------------- ship state ----------------
  const cap = E.inOutC(P(t, tFlip - .1, tFlip + .62));
  const settle = t > tFlip + .62 ? 5 * Math.sin((t - tFlip - .62) * 5.5) * Math.exp(-(t - tFlip - .62) * 2.2) : 0;
  const base = 1.5 + 5 * Math.sin(t * 2.1 + .4) + 20 * P(t, t4 - .3, tFlip, E.inQ);
  const phi = -(lerp(base, 188, cap) + settle * cap) * Math.PI / 180;     // negative: the top rolls toward the camera
  const S = { sn: Math.sin(phi), cs: Math.cos(phi) };
  const sx0 = 590 + Math.sin(t * .45) * 8;
  const amp = 1 + .25 * P(t, t4, tFlip);
  const heave = (surfY(sx0 - 220, t, amp) + surfY(sx0, t, amp) + surfY(sx0 + 220, t, amp)) / 3;
  const slope = Math.atan2(surfY(sx0 + 260, t, amp) - surfY(sx0 - 260, t, amp), 520) * .55;
  const sinkP = P(t, tChae - .02, tLand), sinkE = (sinkP * sinkP + sinkP) / 2;
  const yFloat = heave - 2 * SC + 44 * cap;
  const bounce = t > tLand ? -9 * Math.sin((t - tLand) * 9) * Math.exp(-(t - tLand) * 4) : 0;
  S.x = sx0 - 52 * sinkE; S.y = lerp(yFloat, Ybed - 196, sinkE) + bounce;
  S.pitch = lerp(slope * (1 - cap), -.05, sinkE) + .04 * Math.sin(t * 1.3) * (1 - cap) + (t > tLand ? -.012 * Math.exp(-(t - tLand) * 3) : 0);
  const depthM = 30 * sinkE;

  // ---------------- camera ----------------
  const follow = P(t, tChae - .1, t30 + .5, E.inOutQ);
  const camYsink = Math.min(S.y - 30, Ybed - 196);
  // flip push-in: lean in on the deckhouse as it rolls, released while the camera starts following the hull down
  const fIn = P(t, tFlip - .35, tFlip + .2, E.inOutQ), fOut = P(t, tChae, tSea, E.inOutQ), fK = fIn * (1 - fOut);
  let camY = lerp(842 + dr.y, camYsink, follow), camX = lerp(lerp(568, S.x + 120, fK), S.x - 10, follow * .6) + dr.x;
  let zoom = lerp(1.03, 1.1, P(t, -.2, tFlip, E.inOutQ)) * lerp(1, .97, P(t, tFlip, tFlip + .5)) * lerp(1, 1.13, P(t, tChae, tLand, E.inOutQ)) * lerp(1, 1.07, P(t, tLand, d + .3, E.inOutQ));
  zoom *= lerp(1, 1.15, fIn) * lerp(1, 1 / 1.15, fOut);
  const shake = .9 * P(t, tFlip - .15, tFlip + .05) * Math.exp(-Math.max(0, t - tFlip - .05) * 2.4) + .5 * P(t, tLand - .04, tLand) * Math.exp(-Math.max(0, t - tLand) * 4.5) + .12 * (1 - cap) * P(t, t4 - .3, tFlip);
  const roll = -.075 * Math.sin(Math.PI * cap) * (1 - follow);            // the camera leans with the roll
  const M = camM(camX, camY, zoom, dr.r * .6 + slope * .08 * (1 - follow) + roll, shake, t, 7);
  const toS = (wx, wy) => { const q = M.transformPoint(new DOMPoint(wx, wy)); return [q.x, q.y]; };
  const uw = clamp((camY - 1050) / 300);                       // how far "underwater" the view is
  const deep = clamp((camY - 900) / (Ybed - 196 - 900));

  ctx.save(); ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const T0 = ctx.getTransform();                              // the caller's base transform
  ctx.save(); ctx.setTransform(T0.multiply(M));
  const X0 = camX - 900 / zoom, X1 = camX + 900 / zoom;
  // ---- background: sky, tanker, far sea (above the cut), deep water (below) ----
  if (camY < 1500) { sky(ctx, t, X0, X1, 400, 810); tanker(ctx, t, 1 - P(t, tFlip + .2, tFlip + .8)); farSea(ctx, t, X0, X1); }
  const wg = ctx.createLinearGradient(0, 880, 0, Ybed + 40); wg.addColorStop(0, '#0b2c36'); wg.addColorStop(.25, '#061a20'); wg.addColorStop(.7, '#03090c'); wg.addColorStop(1, '#010304');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(X0, 1000); for (let x = X0; x <= X1 + 12; x += 12) ctx.lineTo(x, surfY(x, t, amp)); ctx.lineTo(X1, Ybed + 600); ctx.lineTo(X0, Ybed + 600); ctx.closePath(); ctx.fill();
  // faint caustic-less cold light from above, fading with depth
  if (deep < .8) glow(ctx, S.x, 1000, 900, '#2a7f93', .12 * (1 - deep) * clamp((.8 - deep) / .3), 'lighter');   // gone by deep .8 (saves a full-frame blend)
  // seabed (back layer)
  if (camY > 1500) {
    const bg = ctx.createLinearGradient(0, Ybed - 40, 0, Ybed + 300); bg.addColorStop(0, 'rgba(30,26,20,0)'); bg.addColorStop(.12, '#15120d'); bg.addColorStop(1, '#030302');
    ctx.fillStyle = bg; ctx.fillRect(X0, Ybed - 40, X1 - X0, 90);
  }
  // ---- towline: tanker stern -> tug stern roller (taut, then lost in the roll) ----
  const tlA = 1 - P(t, tFlip + .05, tFlip + .45);
  if (tlA > 0) {
    const [rx, ry] = shipPt(S, -374, 0, 118); const vib = Math.sin(t * 43) * 1.2 * (.4 + P(t, t4, tFlip));
    ctx.save(); ctx.globalAlpha = tlA; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#7fd6ff', .18); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(204, 790); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.strokeStyle = rgba('#d8eef8', .85); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(204, 790); ctx.quadraticCurveTo((204 + rx) / 2 + vib, (790 + ry) / 2 + vib + 30 * P(t, tFlip, tFlip + .45), rx, ry); ctx.stroke();
    ctx.restore();
  }
  // ---- the tug ----
  // the 12 lights stay on: only the water and murk dim them, all together and slowly (nothing is synced to the impact)
  const lit = 1 - .55 * P(t, tFlip + .3, tLand + .5, E.inOutQ);
  const pops = LIGHTS.map((_, i) => { const k = LORDER.indexOf(i); return P(t, t12 - .05 + k * .045, t12 + .1 + k * .045, E.outQ); });
  drawShip(ctx, t, S, { lit, uw });
  drawLights(ctx, t, S, lit, pops);
  // ---- bubbles: air escaping from the hull as it goes down ----
  const bStart = tFlip + .25;
  if (t > bStart) {
    ctx.save(); ctx.lineWidth = 2;
    for (let k = 0; k < 90; k++) {
      const tb = bStart + k * .034, age = t - tb; if (age < 0 || age > 2.6) continue;
      const cS = { sn: 0, cs: 0, x: 0, y: 0, pitch: 0 };
      // hull state at birth (re-evaluated cheaply: position only)
      const pb = P(tb, tChae - .02, tLand), eb = (pb * pb + pb) / 2; const capb = E.inOutC(P(tb, tFlip - .1, tFlip + .62));
      const hx = 590 + Math.sin(tb * .45) * 8 - 52 * eb, hy = lerp((surfY(hx, tb) - 2 * SC + 44 * capb), Ybed - 196, eb);
      const ex = hx + (hash(k * 7 + 1) - .5) * 640, ey = hy - 30 - hash(k * 3) * 40;
      const sp = 260 + hash(k * 5) * 300, by = ey - sp * age - 60 * age * age, bx = ex + Math.sin(age * 5 + k) * 8 * age;
      const surf = surfY(bx, t, amp); if (by < surf) continue;
      const r = (3 + hash(k * 11) * 9) * (1 + age * .35), a = (1 - age / 2.6) * .75;
      ctx.strokeStyle = rgba('#d8f6ff', a); ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', a * .5); ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .35, r * .25, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // ---- front water body (cutaway): hides the submerged hull when seen from above the surface ----
  const fa = lerp(.72, .14 + .26 * deep, uw);
  const fg = ctx.createLinearGradient(0, 880, 0, 1500); fg.addColorStop(0, rgba('#0a2a33', fa)); fg.addColorStop(1, rgba('#020709', Math.min(.95, fa + .15)));
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(X0, 1000); for (let x = X0; x <= X1 + 12; x += 12) ctx.lineTo(x, surfY(x, t, amp) + 2); ctx.lineTo(X1, Ybed + 600); ctx.lineTo(X0, Ybed + 600); ctx.closePath(); ctx.fill();
  // surface line + foam
  const sp = surfacePath(X0, X1 + 12, t, amp);
  ctx.save(); ctx.strokeStyle = rgba('#cfeef8', .7); ctx.lineWidth = 2.5; ctx.stroke(sp); ctx.strokeStyle = rgba('#9fd8ef', .18); ctx.lineWidth = 10; ctx.stroke(sp); ctx.restore();
  ctx.save(); ctx.fillStyle = rgba('#e8f6ff', .25);
  for (let i = 0; i < 40; i++) { const x = X0 + ((hash(i * 7) * (X1 - X0) + t * 40 * (hash(i) - .3)) % (X1 - X0) + (X1 - X0)) % (X1 - X0); const y = surfY(x, t, amp); ctx.beginPath(); ctx.ellipse(x, y + 2, 10 + hash(i * 3) * 30, 2.5, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // foam boil where the hull rolled over + spray burst
  const tSp = tFlip + .42;                    // bursts as the roll completes (the roll itself stays readable)
  if (t > tSp - .05 && t < tSp + 2.2) {
    const age = Math.max(0, t - tSp);
    ctx.save();
    const bl = blob();
    for (let i = 0; i < 22; i++) {
      const x = S.x + (hash(i * 13) - .5) * 760, y = surfY(x, t, amp) + 4, r = (30 + hash(i * 5) * 70) * (.6 + E.outC(clamp(age / 1.2)) * .9), a = .3 * (1 - clamp(age / 2.2)) * clamp(age * 8 + .2);
      ctx.globalAlpha = a; ctx.drawImage(bl, x - r * 1.6, y - r * .35, r * 3.2, r * .7);
    }
    // mist plume thrown up where the deckhouse hits the water
    for (let i = 0; i < 16; i++) {
      const x = S.x + 40 + (hash(i * 19) - .5) * 620, rise = (60 + hash(i * 23) * 160) * E.outC(clamp(age / 1.4)), r = (40 + hash(i * 29) * 60) * (.5 + E.outC(clamp(age / 1.2)));
      const y = surfY(x, t, amp) - rise; ctx.globalAlpha = .2 * (1 - clamp(age / 1.9)) * clamp(age * 3);
      ctx.drawImage(bl, x - r, y - r * .8, r * 2, r * 1.6);
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#e8f6ff'; ctx.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const x0 = S.x + 40 + (hash(i * 7 + 2) - .5) * 640, y0 = surfY(x0, tSp, amp), vx = (hash(i * 3) - .5) * 360, vy = -(300 + hash(i * 9) * 700), tt = age * (.8 + hash(i) * .4);
      const x = x0 + vx * tt, y = y0 + vy * tt + 1500 * tt * tt; if (y > surfY(x, t, amp) + 6 || age > 1.3) continue;
      const dvx = vx, dvy = vy + 3000 * tt, sp = Math.hypot(dvx, dvy) || 1, ln = Math.min(4 + sp * .02, 1 + age * 90);
      ctx.globalAlpha = .75 * (1 - age / 1.3); ctx.lineWidth = 1.4 + hash(i * 11) * 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dvx / sp * ln, y - dvy / sp * ln); ctx.stroke();
    }
    ctx.restore();
  }
  // ---- seabed front layer: silt plain the hull settles into + silt cloud on impact ----
  if (camY > 1500) {
    const fy = x => Ybed + Math.sin(x * .006) * 6 + noise1(x * .012, 3) * 8;
    ctx.save(); const sg = ctx.createLinearGradient(0, Ybed - 10, 0, Ybed + 220); sg.addColorStop(0, '#1d1a14'); sg.addColorStop(.3, '#0d0b08'); sg.addColorStop(1, '#030302');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(X0, Ybed + 600); for (let x = X0; x <= X1 + 20; x += 20) ctx.lineTo(x, fy(x)); ctx.lineTo(X1, Ybed + 600); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#8a7a5c', .28); ctx.lineWidth = 2; ctx.beginPath(); for (let x = X0; x <= X1 + 20; x += 20) { x === X0 ? ctx.moveTo(x, fy(x)) : ctx.lineTo(x, fy(x)); } ctx.stroke();
    // ripples / tracks in the silt
    ctx.strokeStyle = 'rgba(120,105,80,.12)'; ctx.lineWidth = 1.5; for (let k = 1; k < 5; k++) { ctx.beginPath(); for (let x = X0; x <= X1 + 30; x += 30) { const y = fy(x) + k * 22 + Math.sin(x * .02 + k) * 3; x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore();
    if (t > tLand - .05) {
      // silt cloud: soft blobs composed at half resolution (a quarter of the fill cost), then blitted over their bounding strip
      const age = Math.max(0, t - tLand), st = siltTinted();
      const [sb, sx] = L.buf('okCapSilt', W / 2, H / 2); sx.clearRect(0, 0, W / 2, H / 2); sx.setTransform(new DOMMatrix().scale(.5).multiply(M));
      let x0b = 1e9, y0b = 1e9, x1b = -1e9, y1b = -1e9;
      for (let i = 0; i < 28; i++) {
        const side = hash(i * 3) > .5 ? 1 : -1, x0 = S.x + (hash(i * 7) - .5) * 700, sp2 = 60 + hash(i * 11) * 260;
        const hi = hash(i * 13), x = x0 + side * sp2 * E.outC(clamp(age / 2.6)) * (.4 + .6 * hash(i * 5)) + Math.sin(age * .8 + i) * 10, y = Ybed - 6 - (10 + hi * hi * 230) * E.outQ(clamp(age / 3.2));
        const r = (34 + hash(i * 17) * 72) * (.45 + 1.15 * E.outC(clamp(age / 2.2))) * (1 + hi * .45);
        sx.globalAlpha = (.34 + .2 * hash(i)) * clamp(age * 6) * (1 - .45 * clamp((age - 1) / 2));
        sx.drawImage(st, x - r, y - r * .7, r * 2, r * 1.4);
        x0b = Math.min(x0b, x - r); x1b = Math.max(x1b, x + r); y0b = Math.min(y0b, y - r * .7); y1b = Math.max(y1b, y + r * .7);
      }
      // screen-space bounding box of the cloud (all four corners: the camera may be rotated a little)
      let qx0 = 1e9, qy0 = 1e9, qx1 = -1e9, qy1 = -1e9;
      for (const [wx, wy] of [[x0b, y0b], [x1b, y0b], [x0b, y1b], [x1b, y1b]]) { const [qx, qy] = toS(wx, wy); qx0 = Math.min(qx0, qx); qx1 = Math.max(qx1, qx); qy0 = Math.min(qy0, qy); qy1 = Math.max(qy1, qy); }
      const bx0 = Math.max(0, Math.floor(qx0 / 2) - 2), by0 = Math.max(0, Math.floor(qy0 / 2) - 2), bx1 = Math.min(W / 2, Math.ceil(qx1 / 2) + 2), by1 = Math.min(H / 2, Math.ceil(qy1 / 2) + 2);
      if (bx1 > bx0 && by1 > by0) { ctx.save(); ctx.setTransform(T0); ctx.drawImage(sb, bx0, by0, bx1 - bx0, by1 - by0, bx0 * 2, by0 * 2, (bx1 - bx0) * 2, (by1 - by0) * 2); ctx.restore(); }
    }
  }
  // drifting particles in the water column
  if (uw > 0) L.motes(ctx, t, { n: 50, color: '#9cc9d6', a: .3 * uw, size: 2, speed: 10, seed: 23, area: [X0, camY - 500, X1 - X0, 1000] });
  ctx.restore();

  // ---- rain (above water only) ----
  const rainA = 1 - P(t, t30 - .2, t30 + .3);
  if (rainA > 0) {
    const [, sy] = toS(540, 900);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.max(0, sy - 10)); ctx.clip();
    L.rain(ctx, t, { n: 200, ang: .26, speed: 2400, len: 60, a: .2 * rainA, color: '#b5cde0', w: 1.6, seed: 4, area: [0, 380, W, 700] });
    ctx.restore();
  }
  // ---- darkness closing in after the impact (muffled) ----
  const dk = .25 * deep + .55 * P(t, tLand + .2, d + .2, E.inQ);
  if (dk > 0) { ctx.save(); ctx.fillStyle = `rgba(1,2,3,${clamp(dk).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  suffocate(ctx, t, .15 * deep + .4 * P(t, tLand, d + .2), .22);
  // impact flash on the roll
  L.flash(ctx, .1 * P(t, tFlip + .08, tFlip + .12) * (1 - P(t, tFlip + .12, tFlip + .4)), '#cfeef8');

  // ---------------- labels (screen space) ----------------
  // clock (top slot), typed on "새벽"
  const cA = P(t, tDawn - .12, tDawn + .1) * (1 - P(t, tFlip - .35, tFlip - .1));
  typedChip(ctx, t, D.clock || '04:50경 (본인 기억) · AP 04:30경', 540, 528, cA, P(t, tDawn - .05, tDawn + .7), { size: 34 });
  // crew: on "12명이", above the deckhouse lights
  const [wx, wy] = toS(...shipPt(S, 200, BS, 302));
  const kA = P(t, t12 + .1, t12 + .42, E.outQ) * (1 - P(t, tFlip - .3, tFlip - .08));
  const ks = lerp(.86, 1, E.outBack(P(t, t12 + .1, t12 + .45)));
  lead(ctx, wx + 30, wy - 4, 905, 668, kA, 'rgba(255,200,130,.6)');
  ctx.save(); ctx.translate(905, 638); ctx.scale(ks, ks); chip(ctx, D.crew || '승선 12명', 0, 0, kA, { size: 40, color: '#fff', border: 'rgba(255,179,71,.7)' }); ctx.restore();
  // name: on "예인선 재스콘 4호가", under the hull
  const [hx, hy] = toS(...shipPt(S, 40, B2, 60));
  const nA = P(t, tTug - .08, tTug + .15, E.outQ) * (1 - P(t, tFlip - .25, tFlip));
  lead(ctx, hx, hy + 30, hx, 1066, nA * .8);
  typedChip(ctx, t, '예인선 재스콘 4호', 540, 1100, nA, P(t, tTug - .05, tJas + .3), { size: 44, color: '#fff' });
  // depth gauge from "30미터"; the settled reading becomes the approved chip
  const gA = P(t, t30 - .15, t30 + .15) * (1 - P(t, d - .35, d));
  gauge(ctx, t, gA, depthM);
  const settled = t > tLand;
  const dA = gA * (settled ? 1 - P(t, d - .3, d) : 1);
  const ds = settled ? lerp(.86, 1, E.outBack(P(t, tLand, tLand + .35))) : 1;
  ctx.save(); ctx.translate(540, 528); ctx.scale(ds, ds);
  const depthS = D.depth || '수심 약 30m';
  if (settled) chip(ctx, depthS, 0, 0, dA, { size: 46, color: '#fff', border: 'rgba(160,220,255,.6)' });
  else if (dA > 0) {   // running ticker in a box of the final chip's size (no width jitter)
    const bw = measure(ctx, depthS, 46, FONT.sub, 800) + 40;
    ctx.save(); ctx.globalAlpha *= dA; ctx.fillStyle = 'rgba(4,10,14,.84)'; roundRect(ctx, -bw / 2, -35, bw, 70, 10); ctx.fill(); ctx.strokeStyle = 'rgba(160,220,255,.3)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    text(ctx, '수심 ' + Math.round(depthM) + 'm', 0, 2, { size: 46, weight: 800, color: '#e8f4ff', alpha: dA });
  }
  ctx.restore();
  quiet(ctx, 1);
};
})();
