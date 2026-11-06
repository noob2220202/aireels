// eleven (≈83.31-89.86): "선장을 포함한 11명은 돌아오지 못했습니다. 1명은 끝내 찾지 못했습니다."
// Quiet and slow. Dark open water on the seabed at ~30 m: the tug's overturned hull (the capsize scene's own model, frozen in
// its final upside-down pose: antifouling red on top, the deckhouse down in the silt) as a cold silhouette. Above it, a row of
// eleven places. '선장을' -> the first small warm light comes up on its own; '포함한' -> nine more come up one after another,
// left to right, each laying a faint warm touch on the upturned hull below it; '11명은' -> the eleventh place is drawn as an
// empty dotted outline (no light ever goes out: it was never lit). '돌아오지 못했습니다' -> slow pull back to the whole hull,
// the footnote fades in. '1명은' -> a single faint cold ring from the empty outline, its dashes brighten; '1명 실종' in the
// footnote lifts with it. Then stillness: a slow push, drifting silt. No bodies, no dimming, no names.
// Also defines window.PK.FIN: the small kit shared by the closing scenes (eleven, whyme, after, ocean, memorial).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, FONT } = L;
const PK = window.PK;

// =============================== shared kit for the closing scenes ===============================
// local 32-bit hash / value noise (L.hash loses precision for large arguments)
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
// word time (exact word, n-th occurrence) relative to the scene start; falls back to a fraction of the voice span
function wt(info, w, frac = 0, nth = 0) {
  const sc = info.sc, ws = (sc.words || []).filter(o => o.w.replace(/[.,!?'"]/g, '') === w);
  if (ws[nth]) return ws[nth].t - sc.t0;
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0; return v0 + (v1 - v0) * frac;
}
// one steady warm light (no heartbeat: these are the eleven), as a cached additive sprite
let LSPR = null;
function lightSprite() {
  if (LSPR) return LSPR;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  let g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,170,90,.55)'); g.addColorStop(.12, 'rgba(255,160,70,.32)'); g.addColorStop(.3, 'rgba(255,145,55,.12)'); g.addColorStop(.6, 'rgba(255,140,50,.035)'); g.addColorStop(1, 'rgba(255,140,50,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  g = x.createRadialGradient(128, 128, 0, 128, 128, 26);
  g.addColorStop(0, 'rgba(255,246,228,1)'); g.addColorStop(.22, 'rgba(255,236,200,.95)'); g.addColorStop(.5, 'rgba(255,200,130,.45)'); g.addColorStop(1, 'rgba(255,180,100,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  LSPR = c; return c;
}
function crewLight(ctx, x, y, a, s = 1) {
  if (a <= .002) return; const R = 128 * s;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a); ctx.drawImage(lightSprite(), x - R, y - R, R * 2, R * 2); ctx.restore();
}
// the empty place: a dotted outline (p = how much of it is drawn), slowly turning
function crewRing(ctx, t, x, y, a, s = 1, p = 1, col = '#cfe8ff') {
  if (a <= .002 || p <= 0) return; const r = 15 * s;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.4, 2.6 * s); ctx.lineCap = 'round';
  ctx.setLineDash([2.5 * s, 6.2 * s]); ctx.lineDashOffset = -t * 4 * s;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p)); ctx.stroke(); ctx.restore();
}
// keep the subtitle band and the app UI area quiet
function subBand(ctx, a = .86, y0 = 1150) {
  const g = ctx.createLinearGradient(0, y0, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, `rgba(1,2,3,${a})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, y0, W, 1290 - y0); ctx.fillStyle = `rgba(1,2,3,${a})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
}
// the row of eleven places (world coords of this scene; whyme starts from the same screen positions)
const ROW = { y: 640, x: i => 130 + i * 82, n: 11, empty: 10 };
// camera at the end of eleven (whyme picks the row up exactly there)
const END = { cx: 540, cy: 850, z: 1.025 };
PK.FIN = { hi, nz, fb, wt, lightSprite, crewLight, crewRing, subBand, ROW, END };

// =============================== the overturned hull (capsize scene geometry, final pose) ===============================
const ZC = 70, B2 = 92, BS = 74, SC = .98;
const HULL = [[-380, 124], [-384, 64], [-369, 26], [-334, 7], [-262, 0], [226, 0], [296, 9], [344, 32], [374, 80], [398, 162], [356, 158], [44, 154], [40, 124]];
const KEEL = [[-369, 26], [-334, 7], [-262, 0], [226, 0], [296, 9], [344, 32], [374, 80]];
const hb = x => x < 120 ? B2 : B2 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 120) / 285, 2)));
const HOUSE = [[46, 306, 52, 296, 154, 208], [72, 284, 76, 278, 208, 256], [112, 276, 106, 290, 256, 302]];
function hullOutline(c, ys, sn, cs) { c.beginPath(); HULL.forEach(([x, z], i) => { const y = ys * hb(x), v = -(y * sn + (z - ZC) * cs); i ? c.lineTo(x, v) : c.moveTo(x, v); }); c.closePath(); }
const sideT = (ctx, y, sn, cs) => ctx.transform(1, 0, 0, -cs, 0, -(y * sn - ZC * cs));
function houseSide(ctx, ys, sn, cs, k) {
  const [a0, a1, b0, b1, z0, z1] = HOUSE[k];
  ctx.save(); sideT(ctx, ys * BS, sn, cs);
  ctx.beginPath(); ctx.moveTo(a0, z0); ctx.lineTo(a1, z0); ctx.lineTo(b1, z1); ctx.lineTo(b0, z1); ctx.closePath();
  const g = ctx.createLinearGradient(0, z0, 0, z1); g.addColorStop(0, '#161c20'); g.addColorStop(1, '#20272c'); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#081014';
  if (k === 2) for (let i = 0; i < 7; i++) ctx.fillRect(122 + i * 23, 270, 17, 20);
  if (k === 1) for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(90 + i * 25, 232, 6, 0, 7); ctx.fill(); }
  if (k === 0) for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(70 + i * 25, 182, 6, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = rgba('#9fc6d8', .4); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(b0, z1); ctx.lineTo(b1, z1); ctx.stroke();
  ctx.restore();
}
function hullSide(ctx, ys, sn, cs) {
  ctx.save(); hullOutline(ctx, ys, sn, cs);
  ctx.save(); ctx.clip(); sideT(ctx, ys * B2, sn, cs);
  const gr = ctx.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, '#171c1f'); gr.addColorStop(.6, '#222a2f'); gr.addColorStop(1, '#2e383e');
  ctx.fillStyle = gr; ctx.fillRect(-420, -10, 860, 200);
  ctx.fillStyle = '#3d1714'; ctx.fillRect(-420, -10, 860, 66);
  ctx.fillStyle = '#0b0d0e'; ctx.fillRect(-420, 56, 860, 9);
  ctx.fillStyle = '#121619'; ctx.fillRect(-420, 104, 860, 11); ctx.fillStyle = rgba('#9fb3bd', .18); ctx.fillRect(-420, 114, 860, 2);
  ctx.fillStyle = '#0a0f12'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(80 + k * 30, 140, 5.5, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; for (let x = -340; x < 360; x += 62) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 150); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = rgba('#a9d8ea', .5); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();
}
function bottomFace(ctx, sn, cs) {
  ctx.save(); ctx.beginPath();
  KEEL.forEach(([x, z], i) => { const v = -(hb(x) * sn + (z - ZC) * cs); i ? ctx.lineTo(x, v) : ctx.moveTo(x, v); });
  for (let i = KEEL.length - 1; i >= 0; i--) { const [x, z] = KEEL[i]; ctx.lineTo(x, -(-hb(x) * sn + (z - ZC) * cs)); }
  ctx.closePath();
  const vc = ZC * cs, vh = B2 * sn;
  const g = ctx.createLinearGradient(0, vc - vh, 0, vc + vh); g.addColorStop(0, '#5a221d'); g.addColorStop(.5, '#34130f'); g.addColorStop(1, '#1e0a09');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba('#bfe6f5', .55); ctx.lineWidth = 2.4; ctx.stroke();
  ctx.restore();
}
function flats(ctx, y, sn, cs, part) {
  ctx.save(); sideT(ctx, y, sn, cs);
  if (part === 'mast') {
    ctx.strokeStyle = '#3a454c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(198, 300); ctx.lineTo(204, 424); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(168, 396); ctx.lineTo(236, 396); ctx.moveTo(150, 334); ctx.lineTo(250, 334); ctx.stroke();
  } else if (part === 'crane') {
    ctx.strokeStyle = '#323c42'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-150, 124); ctx.lineTo(-150, 180); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-150, 178); ctx.lineTo(-40, 214); ctx.stroke();
    ctx.fillStyle = '#2b3439'; ctx.fillRect(-338, 124, 7, 26); ctx.fillRect(-318, 124, 7, 26); ctx.fillStyle = '#262f34'; ctx.fillRect(0, 124, 44, 40);
  } else {
    ctx.beginPath(); ctx.moveTo(-2, 124); ctx.lineTo(38, 124); ctx.lineTo(28, 272); ctx.lineTo(-14, 272); ctx.closePath();
    ctx.fillStyle = '#2a3338'; ctx.fill();
  }
  ctx.restore();
}
// the hull in its final pose, cached as two sprites: cold (as found) and the warm touch of the lights above
const HPOSE = { phi: -188.5 * Math.PI / 180, pitch: -.035 }, HSP = { w: 840, h: 520, ox: 420, oy: 96 };
let HSPR = null;
function hullSprites() {
  if (HSPR) return HSPR;
  const sn = Math.sin(HPOSE.phi), cs = Math.cos(HPOSE.phi);
  const mk = () => { const c = document.createElement('canvas'); c.width = HSP.w; c.height = HSP.h; return c; };
  const base = mk(), x = base.getContext('2d');
  x.translate(HSP.ox, HSP.oy); x.rotate(HPOSE.pitch); x.scale(SC, SC);
  // painter's order for this pose (cs < 0: the far side is +y; the bottom face is up and toward us)
  // (same depth sort as capsize's drawShip for this roll angle: far -> near)
  flats(x, -46, sn, cs, 'funnel'); flats(x, 0, sn, cs, 'mast'); flats(x, 0, sn, cs, 'crane');
  bottomFace(x, sn, cs); flats(x, 46, sn, cs, 'funnel');
  for (let k = 2; k >= 0; k--) houseSide(x, -1, sn, cs, k);
  hullSide(x, -1, sn, cs);
  x.setTransform(1, 0, 0, 1, 0, 0);
  // as found: dark, cold, the colours almost gone
  x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(0, 0, 0, HSP.h); g.addColorStop(0, 'rgba(4,14,20,.5)'); g.addColorStop(.3, 'rgba(2,8,12,.72)'); g.addColorStop(1, 'rgba(1,3,5,.9)');
  x.fillStyle = g; x.fillRect(0, 0, HSP.w, HSP.h);
  // warm version: the upturned bottom catching light from above
  const warm = mk(), y = warm.getContext('2d');
  y.drawImage(base, 0, 0); y.globalCompositeOperation = 'source-atop';
  const wg = y.createLinearGradient(0, 0, 0, HSP.h); wg.addColorStop(0, 'rgba(255,170,90,.55)'); wg.addColorStop(.14, 'rgba(255,150,70,.22)'); wg.addColorStop(.32, 'rgba(255,140,60,.05)'); wg.addColorStop(.5, 'rgba(255,140,60,0)');
  y.fillStyle = wg; y.fillRect(0, 0, HSP.w, HSP.h);
  // keep only the warm-lit parts: subtract the base so the warm sprite is an additive overlay
  const add = mk(), z = add.getContext('2d');
  z.drawImage(warm, 0, 0); z.globalCompositeOperation = 'difference'; z.drawImage(base, 0, 0);
  HSPR = { base, add }; return HSPR;
}

// =============================== scene ===============================
const YB = 1066, HS = .86, HX = 548;            // seabed line, hull scale, hull x
const HY = YB - 192 * HS;                       // roll axis (the deckhouse rests in the silt)
const KEELY = HY - 70 * SC * HS;                // top of the upturned bottom
const bedY = x => YB + Math.sin(x * .006 + .7) * 5 + nz(x * .011, 3) * 7;

function water(ctx, t) {
  const g = ctx.createLinearGradient(0, 300, 0, YB + 80);
  g.addColorStop(0, '#05202a'); g.addColorStop(.35, '#04161e'); g.addColorStop(.75, '#030c11'); g.addColorStop(1, '#020507');
  ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
  // dim daylight far above, barely reaching 30 m
  ctx.save(); ctx.translate(560, 260); ctx.scale(2.2, 1); glow(ctx, 0, 0, 420, '#2b7f95', .1, 'lighter'); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = 180 + i * 190 + Math.sin(t * .23 + i * 1.7) * 30, w = 50 + 40 * hi(i * 5 + 1), a = .028 * (.5 + .5 * Math.sin(t * .5 + i * 2.1));
    const sg = ctx.createLinearGradient(0, 200, 0, 980); sg.addColorStop(0, rgba('#7fcfe4', a)); sg.addColorStop(1, 'rgba(127,207,228,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - w * .3, 200); ctx.lineTo(x + w * .3, 200); ctx.lineTo(x + w * 1.6 + 60, 980); ctx.lineTo(x - w * 1.6 + 60, 980); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function seabedBack(ctx) {
  const g = ctx.createLinearGradient(0, YB - 60, 0, YB + 20); g.addColorStop(0, 'rgba(24,26,22,0)'); g.addColorStop(1, '#0f110e');
  ctx.fillStyle = g; ctx.fillRect(-300, YB - 60, W + 600, 80);
}
function seabedFront(ctx, t) {
  ctx.save();
  const g = ctx.createLinearGradient(0, YB - 8, 0, YB + 220); g.addColorStop(0, '#16150f'); g.addColorStop(.35, '#0a0a07'); g.addColorStop(1, '#020202');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-300, YB + 600); for (let x = -300; x <= W + 320; x += 20) ctx.lineTo(x, bedY(x)); ctx.lineTo(W + 300, YB + 600); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#8a7d60', .22); ctx.lineWidth = 2; ctx.beginPath(); for (let x = -300; x <= W + 320; x += 20) { x === -300 ? ctx.moveTo(x, bedY(x)) : ctx.lineTo(x, bedY(x)); } ctx.stroke();
  ctx.strokeStyle = 'rgba(120,105,80,.09)'; ctx.lineWidth = 1.5;
  for (let k = 1; k < 5; k++) { ctx.beginPath(); for (let x = -300; x <= W + 330; x += 30) { const y = bedY(x) + k * 20 + Math.sin(x * .02 + k) * 3; x === -300 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  // silt heaped against the buried deckhouse
  ctx.fillStyle = '#121109';
  ctx.beginPath(); ctx.moveTo(HX + 40, YB + 30); ctx.quadraticCurveTo(HX + 110, YB - 16, HX + 190, YB - 10); ctx.quadraticCurveTo(HX + 270, YB - 14, HX + 330, YB + 30); ctx.closePath(); ctx.fill();
  ctx.restore();
}

window.PK.scenes.eleven = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const tCap = wt(info, '선장을', .02), tInc = wt(info, '포함한', .1), t11 = wt(info, '11명은', .17), tRet = wt(info, '돌아오지', .27);
  const tNo = wt(info, '못했습니다', .36, 0), tOne = wt(info, '1명은', .58), tEnd = wt(info, '끝내', .68);
  // when each place comes up: the captain's light alone, then nine more left to right; the empty place is drawn on '11명은'
  const T = []; for (let i = 0; i < ROW.n; i++) T.push(i === 0 ? tCap + .02 : tInc + (i - 1) * Math.max(.04, (t11 - .06 - tInc) / 8));
  const order = [5, 0, 1, 2, 3, 4, 6, 7, 8, 9];   // the first light sits in the middle of the row, the rest fill in left to right
  const lightAt = i => { if (i === ROW.empty) return t11; const k = order.indexOf(i); return T[k]; };
  const lit = []; let warmSum = 0;
  for (let i = 0; i < ROW.n; i++) { if (i === ROW.empty) { lit.push(0); continue; } const a = P(t, lightAt(i) - .03, lightAt(i) + .45, E.outQ); lit.push(a); warmSum += a; }
  warmSum /= 10;

  // camera: in close on the row -> slow pull back to the whole hull -> very slow push to the end
  const pull = P(t, -.3, tRet + 1.4, E.inOutQ), push = P(t, tRet + 1.4, d + .3, E.inOutQ);
  const z = lerp(1.11, 1, pull) * lerp(1, END.z, push), cy = lerp(790, END.cy, pull), cx = END.cx;
  const dk = 1 - P(t, d - 1.2, d, E.inOutQ);                       // drift settles to zero for the hand-off to whyme
  const dr = { x: fb(t * .3, 101) * 9 * dk, y: fb(t * .26, 102) * 7 * dk, r: fb(t * .2, 103) * .003 * dk };

  ctx.save();
  ctx.translate(540 + dr.x, 850 + dr.y); ctx.rotate(dr.r); ctx.scale(z, z); ctx.translate(-cx, -cy);
  water(ctx, t);
  seabedBack(ctx);
  // the hull
  const HSPR = hullSprites(), k = HS;
  ctx.drawImage(HSPR.base, HX - HSP.ox * k, HY - HSP.oy * k, HSP.w * k, HSP.h * k);
  if (warmSum > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .42 * warmSum; ctx.drawImage(HSPR.add, HX - HSP.ox * k, HY - HSP.oy * k, HSP.w * k, HSP.h * k); ctx.restore(); }
  // each light lays a faint warm touch on the upturned bottom below it
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < ROW.n; i++) {
    if (lit[i] <= 0) continue; const x = ROW.x(i); if (x < HX - 330 * HS || x > HX + 390 * HS) continue;
    ctx.save(); ctx.translate(x, KEELY + 6); ctx.scale(1, .32); glow(ctx, 0, 0, 74, '#ffb347', .16 * lit[i]); ctx.restore();
  }
  ctx.restore();
  seabedFront(ctx, t);
  // silt drifting slowly through the water column
  L.motes(ctx, t, { n: 70, color: '#9cc9d6', a: .22, size: 2, speed: 6, seed: 61, area: [-60, 420, W + 120, 760] });
  L.motes(ctx, t * .7, { n: 26, color: '#c8dde4', a: .14, size: 3.4, speed: 4, seed: 67, area: [-60, 420, W + 120, 760] });

  // ---- the row ----
  if (warmSum > 0) { ctx.save(); ctx.translate(540, ROW.y); ctx.scale(3.2, .5); glow(ctx, 0, 0, 200, '#ff9a3c', .07 * warmSum); ctx.restore(); }
  for (let i = 0; i < ROW.n; i++) {
    const x = ROW.x(i), y = ROW.y + Math.sin(t * .6 + i * 1.3) * 2.2;
    if (i === ROW.empty) {
      const p = P(t, t11 - .02, t11 + .55, E.inOutQ);
      const lift = P(t, tOne - .05, tOne + .5, E.outQ);
      crewRing(ctx, t, x, y, (.62 + .3 * lift) * P(t, t11 - .05, t11 + .1), 1.25, p);
      // '1명은': one faint cold ring, once
      const u = t - tOne;
      if (u > 0 && u < 2.4) { const q = u / 2.4; ctx.save(); ctx.strokeStyle = rgba('#cfe8ff', .3 * (1 - q) * (1 - q)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 18 + E.outC(q) * 120, 0, 7); ctx.stroke(); ctx.restore(); }
      continue;
    }
    const a = lit[i], u = t - lightAt(i), boost = u > 0 ? .5 * Math.exp(-u * 3) : 0;
    const sh = 1 + .045 * Math.sin(t * 1.05 + i * 1.7) + .025 * nz(t * 2.1, 40 + i);
    crewLight(ctx, x, y, a * (.95 + boost) * sh, .84 + .12 * boost);
    // the moment it comes up: a small warm ring, very faint
    if (u > 0 && u < 1.3) { const q = u / 1.3; ctx.save(); ctx.strokeStyle = rgba('#ffcf9a', .22 * (1 - q)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 14 + E.outC(q) * 46, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  ctx.restore();

  // ---- quiet frame: dark top under the title, dark subtitle band ----
  { const g = ctx.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, 'rgba(1,2,3,.85)'); g.addColorStop(.75, 'rgba(1,2,3,.5)'); g.addColorStop(1, 'rgba(1,2,3,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 480); }
  subBand(ctx, .88, 1105);


  // ---- footnote (data.note), two lines; '1명 실종' lifts on '1명은' ----
  const note = D.note || '', parts = note.split(' · ');
  const fa = P(t, tNo + .2, tNo + .9, E.outQ);
  if (note && fa > 0) {
    const l1a = parts.length >= 3 ? parts[0] + ' · ' : note, l1b = parts.length >= 3 ? parts[1] : '', l2 = parts.length >= 3 ? parts.slice(2).join(' · ') : '';
    const s1 = 31, s2 = 25, y1 = 1158 + 6 * (1 - fa), y2 = 1199 + 6 * (1 - fa);
    const wa = measure(ctx, l1a, s1, FONT.sub, 700), wb = measure(ctx, l1b, s1, FONT.sub, 800), x0 = 540 - (wa + wb) / 2;
    const hl = P(t, tOne - .05, tOne + .45, E.outQ);
    ctx.save(); ctx.globalAlpha = fa * .5; ctx.fillStyle = '#8fb3c4'; ctx.fillRect(540 - 26, y1 - 40, 52, 1.5); ctx.restore();
    text(ctx, l1a, x0, y1, { size: s1, weight: 700, color: '#c9d6de', align: 'left', alpha: fa });
    if (l1b) {
      text(ctx, l1b, x0 + wa, y1, { size: s1, weight: 800, color: hl > .5 ? '#ffffff' : '#c9d6de', align: 'left', alpha: fa });
      if (hl > 0) { ctx.save(); ctx.globalAlpha = fa * hl * .8; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x0 + wa, y1 + 22); ctx.lineTo(x0 + wa + wb * hl, y1 + 22); ctx.stroke(); ctx.restore(); }
    }
    if (l2) text(ctx, l2, 540, y2, { size: s2, weight: 600, color: '#8fa9b8', alpha: fa });
  }
};
})();
