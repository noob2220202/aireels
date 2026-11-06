// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, text, measure, typeSub, roundRect, glow, godrays, motes, fogLayer,
  flash, tint, camera, drift, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, noise2, poly, darkness, brackets, shears, at } = window.KL;
const F_ = () => window.F;

// ---------------------------------------------------------------------------
// "그리고 2019년 12월, 담쟁이를 걷어내던 정원사들이 미술관 철문을 열었다."
// Daytime (overcast December light), never night. Beats, all anchored on narration words:
//  0.0  fade in on a wide shot of the ivy-covered outer wall: two gardener silhouettes at work
//       (one snipping with hand shears, one hauling down a long ivy strand), mist at the ground,
//       a split-flap date rolls in (flap sfx) and locks: 2019.12.10
//  2019 / 12월  gold underline sweeps under "2019", then under "12"; caption "담쟁이 제거 작업 중" types in
//  담쟁이를  anticipation pull-back, then a fast dolly-in (whoosh) through the gardeners (parallax layer
//       flies out) onto the ivy patch
//  snip ×3   right glove + shears cut the ivy at three points (each snip = clippings burst + camera kick);
//       the left glove drags the strand down-left, the ivy peels away leaf by leaf
//  정원사들이 a gardener's soft shadow passes over the wall; the left glove peels the last curtain off a metal hatch
//  미술관     callout "외벽의 잠기지 않은 작은 철제 덮개" types in, the camera settles
//  철문을     red brackets snap on, a cold glint runs across the steel, push-in, the right glove takes the handle
//  열었다     rattle → the door swings open (creak) with a bounce, a dust puff, light catches a black bag inside
//  end        the camera dives into the opening (the zoom transition carries it into the "bag" scene)
// Performance: the ivy wall (3.8k leaf sprites) is baked once into two cached sprites (wide / close-up);
// only the ~170 leaves around the hatch are drawn live (they sway, then fall).
// ---------------------------------------------------------------------------
const HX = HATCH.x, HY = HATCH.y, HS = HATCH.s, HL = HX - HS / 2, HT = HY - HS / 2;
const GROUND = 1440;            // wall base line (world)
const FEET = 1495;              // gardeners stand a step in front of the wall
const Z0 = .61;                 // zoom at which the gardener layer and the wall layer coincide
const WIDE = { sc: .64, x0: -520, y0: -820, w: 2120, h: 3600, dark: [1450, .55] };
const CLOSE = { sc: 1.16, x0: -160, y0: -340, w: 1400, h: 2400, dark: [780, .735] };
const SNIP_PT = [[664, 655], [724, 798], [682, 944]];   // world points the shears close on
const SNIP_ROT = [.66, .42, .16];
const SHS = .66;                // shears scale
let S = null;

// ---------- leaf list (exact copy of KL.makeLeaves' generator so the wall matches every other ivy shot) ----------
function genLeaves() {
  const R = rng(5); const out = [];
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
    out.push({ x, y, s: 30 + R() * 22 + layer * 4, rot: (R() - .5) * 1.6 + (x < 540 ? .3 : -.3), v: layer === 0 ? Math.floor(R() * 2) : 2 + Math.floor(R() * 4), layer, ph: R() * 6.28,
      cover, late: !cover && r < 340, dist: r, fallDir: R() < .5 ? -1 : 1, fallJ: R() });
  }
  out.sort((a, b) => a.layer - b.layer || a.y - b.y);
  return out;
}
function leafImg(x, L0, px, py, rot, sc, sx = 1, set = T.leaf) {
  const S0 = set[L0.v];
  x.save(); x.translate(px, py); x.rotate(rot); x.scale(sc * sx, sc); x.drawImage(S0, -S0.width / 2, -S0.height / 2 - 10); x.restore();
}

// ---------- baked sprites ----------
function plinthAndGround(x, R, part) {
  if (part === 'plinth') {
    const g = x.createLinearGradient(0, GROUND - 92, 0, GROUND); g.addColorStop(0, '#3a352e'); g.addColorStop(.25, '#2b2722'); g.addColorStop(1, '#16130f');
    x.fillStyle = g; x.fillRect(R.x0, GROUND - 92, R.w, 92);
    x.fillStyle = 'rgba(210,220,235,.10)'; x.fillRect(R.x0, GROUND - 92, R.w, 4);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(R.x0, GROUND - 100, R.w, 8);
    const r = rng(77);
    for (let X = R.x0 + 60; X < R.x0 + R.w; X += 230 + r() * 60) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(X, GROUND - 88, 4, 88); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '200,210,220'},${r() * .12})`; x.beginPath(); x.arc(R.x0 + r() * R.w, GROUND - 90 + r() * 88, 1 + r() * 3, 0, 7); x.fill(); }
    return;
  }
  // ground: damp gravel path in front of the wall
  const g = x.createLinearGradient(0, GROUND, 0, GROUND + 900); g.addColorStop(0, '#1d1a15'); g.addColorStop(.12, '#14120e'); g.addColorStop(1, '#040403');
  x.fillStyle = g; x.fillRect(R.x0, GROUND, R.w, R.y0 + R.h - GROUND);
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(R.x0, GROUND, R.w, 10);
  const r = rng(91);
  for (let i = 0; i < 2600; i++) {
    const yy = GROUND + 8 + Math.pow(r(), 1.6) * 900, sz = (1 + r() * 2.6) * (1 + (yy - GROUND) / 500);
    x.fillStyle = `rgba(${r() < .55 ? '150,150,140' : '0,0,0'},${.05 + r() * .12})`; x.beginPath(); x.ellipse(R.x0 + r() * R.w, yy, sz * 1.6, sz, 0, 0, 7); x.fill();
  }
  // fallen ivy leaves + a heap of cut ivy (right) + a bucket (left) + a rake leaning on the wall (far right)
  const flat = (px, py, s, v, rot, a) => { const S0 = T.leaf[v]; x.save(); x.globalAlpha = a; x.translate(px, py); x.scale(1, .5); x.rotate(rot); x.scale(s, s); x.drawImage(S0, -S0.width / 2, -S0.height / 2); x.restore(); };
  for (let i = 0; i < 46; i++) flat(R.x0 + 200 + r() * (R.w - 400), GROUND + 20 + r() * 260, .35 + r() * .25, 2 + Math.floor(r() * 4), r() * 6.28, .65);
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI, rr = Math.sqrt(r()); flat(1135 + Math.cos(a) * 150 * rr, GROUND + 40 - Math.sin(a) * 70 * rr, .5 + r() * .3, 2 + Math.floor(r() * 4), r() * 6.28, .9); }
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(1135, GROUND + 52, 170, 22, 0, 0, 7); x.fill();
  // bucket
  x.save(); x.translate(360, GROUND + 70);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.ellipse(0, 4, 70, 12, 0, 0, 7); x.fill();
  const bg = x.createLinearGradient(-55, 0, 55, 0); bg.addColorStop(0, '#2e3439'); bg.addColorStop(.35, '#4a535a'); bg.addColorStop(1, '#15191c');
  x.fillStyle = bg; x.beginPath(); x.moveTo(-58, -110); x.lineTo(58, -110); x.lineTo(46, 0); x.lineTo(-46, 0); x.closePath(); x.fill();
  x.fillStyle = '#0b0d0f'; x.beginPath(); x.ellipse(0, -110, 58, 12, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(200,215,230,.25)'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, -110, 58, 12, 0, Math.PI, 0); x.stroke();
  for (let i = 0; i < 7; i++) { const S0 = T.leaf[2 + i % 4]; x.save(); x.translate(-40 + i * 13, -118 - (i % 3) * 10); x.rotate(-.8 + i * .25); x.scale(.42, .42); x.drawImage(S0, -S0.width / 2, -S0.height / 2); x.restore(); }
  x.strokeStyle = '#1b1f22'; x.lineWidth = 4; x.beginPath(); x.arc(0, -110, 60, Math.PI * 1.05, Math.PI * 1.95, true); x.stroke();
  x.restore();
  // rake
  x.save(); x.strokeStyle = '#231d18'; x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.moveTo(1345, GROUND + 26); x.lineTo(1232, 760); x.stroke();
  x.strokeStyle = 'rgba(200,210,225,.12)'; x.lineWidth = 3; x.beginPath(); x.moveTo(1338, GROUND + 20); x.lineTo(1226, 762); x.stroke();
  x.fillStyle = '#1a1c1e'; x.fillRect(1280, GROUND + 18, 140, 14); for (let k = 0; k < 9; k++) x.fillRect(1284 + k * 16, GROUND + 30, 5, 28);
  x.restore();
}
function bake(R) {
  const [c, x] = mk(Math.ceil(R.w * R.sc), Math.ceil(R.h * R.sc));
  x.scale(R.sc, R.sc); x.translate(-R.x0, -R.y0);
  x.fillStyle = '#0b0907'; x.fillRect(R.x0, R.y0, R.w, R.h);
  x.drawImage(T.bricks, WALL_OX, -420);
  // soft fade of the brick texture edges into the dark surround
  const eg = x.createLinearGradient(0, -420, 0, -250); eg.addColorStop(0, '#0b0907'); eg.addColorStop(1, 'rgba(11,9,7,0)'); x.fillStyle = eg; x.fillRect(R.x0, -421, R.w, 172);
  const lg = x.createRadialGradient(300, 300, 50, 400, 600, 1300); lg.addColorStop(0, 'rgba(120,150,200,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = lg; x.fillRect(R.x0, R.y0, R.w, R.h);
  glow(x, 160, 260, 1100, '#9fb6d6', .09);
  plinthAndGround(x, R, 'plinth');
  for (const L0 of S.stat) { if (L0.y > GROUND - 26) continue; leafImg(x, L0, L0.x + Math.sin(L0.ph) * (2 + L0.layer * 1.5), L0.y + Math.cos(L0.ph) * 1.5, L0.rot + Math.sin(L0.ph) * (.05 + L0.layer * .02), L0.s / 64); }
  plinthAndGround(x, R, 'ground');
  // overcast daylight lift, light falloff around the hatch + the cold daylight grade (per-shot values)
  x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(64,76,92,.2)'; x.fillRect(R.x0, R.y0, R.w, GROUND - R.y0); x.restore();
  darkness(x, HX, HY + 40, R.dark[0], R.dark[1], .3);
  x.setTransform(1, 0, 0, 1, 0, 0); gradeCold(x, c.width, c.height);
  return c;
}
const GRADE = ['#7d8a96', .2];
function gradeCold(x, w, h) { x.save(); x.globalCompositeOperation = 'color'; x.globalAlpha = GRADE[1]; x.fillStyle = GRADE[0]; x.fillRect(0, 0, w, h); x.restore(); }
function gradedSprite(src, filter) {
  const [c, x] = mk(src.width, src.height); if (filter) x.filter = filter; x.drawImage(src, 0, 0); x.filter = 'none';
  gradeCold(x, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); return c;
}
function makeFG() {
  // out-of-focus foreground ivy (blurred once)
  const [a, ax] = mk(560, 560); const r = rng(808);
  ax.strokeStyle = '#0a1a10'; ax.lineWidth = 16; ax.lineCap = 'round'; ax.beginPath(); ax.moveTo(40, 540); ax.bezierCurveTo(160, 380, 260, 300, 470, 160); ax.stroke();
  for (let i = 0; i < 9; i++) {
    const k = i / 8, px = lerp(60, 470, k) + (r() - .5) * 120, py = lerp(520, 170, k) + (r() - .5) * 120, S0 = T.leaf[2 + (i % 3)];
    ax.save(); ax.translate(px, py); ax.rotate(r() * 6.28); ax.scale(1.3 + r() * .6, 1.3 + r() * .6); ax.drawImage(S0, -S0.width / 2, -S0.height / 2); ax.restore();
  }
  const [b, bx] = mk(560, 560); bx.filter = 'blur(10px) brightness(.75)'; bx.drawImage(a, 0, 0); bx.filter = 'none';
  return b;
}
function makeShadowFig() {
  const [a, ax] = mk(360, 640);
  F_().figure(ax, 180, 640, 600, { shadow: false, coat: true, coatLen: 1.0, fill: '#000', armL: [.3, -.4], armR: [2.3, -.3], face: 1 });
  const [b, bx] = mk(360, 640); bx.filter = 'blur(16px)'; bx.drawImage(a, 0, 0); bx.filter = 'none';
  return b;
}
function init() {
  S = {};
  S.leaves = genLeaves();
  S.dyn = S.leaves.filter(l => l.cover || l.late);
  S.stat = S.leaves.filter(l => !l.cover && !l.late);
  S.wide = bake(WIDE); S.close = bake(CLOSE);
  S.fg = makeFG(); S.shadow = makeShadowFig();
  // leaves that are being handled catch more light than the wall behind them
  S.bright = [2, 3, 4, 5].map(v => gradedSprite(T.leaf[v], 'brightness(1.65) saturate(1.1)'));
  S.leafG = T.leaf.map(l => gradedSprite(l));                      // live leaves get the same grade as the baked wall
}

// ---------- timing ----------
function times(info, d) {
  const t19 = at(info, '2019', .1), t12 = at(info, '12월', .22), tD = at(info, '담쟁이를', .35), tGo = at(info, '걷어내던', .47);
  const tG = at(info, '정원사들이', .57), tM = at(info, '미술관', .7), tH = at(info, '철문을', .8), tO = at(info, '열었다', .9);
  return { d, t19, t12, tD, tGo, tG, tM, tH, tO,
    ant: tD - .32, p0: tD - .1, p1: tD + .33,
    snip: [tD + .35, tD + .75, tD + 1.15],                 // = snip sfx offsets
    p1a: tD + .42, p1b: tD + 1.22,                         // first pull (rustle @ 담쟁이를 +.38)
    p2a: tG + .12, p2b: tG + .76,                          // second pull (rustle @ 정원사들이 +.1)
    open: tO - .03 };                                      // creak @ 열었다 -.02
}
// piecewise eased keys: [time, value...] with the ease used to arrive at that key
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0].slice(1, -1);
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1], b = ks[i];
    if (t <= b[0]) { const e = (b[b.length - 1] || E.inOutQ)(clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0]))); const out = []; for (let k = 1; k < b.length - 1; k++) out.push(lerp(a[k], b[k], e)); return out; }
  }
  const l = ks[ks.length - 1]; return l.slice(1, -1);
}
function camAt(t, tm) {
  const [z, cy] = keys(t, [
    [0, .585, 980, null], [tm.ant, .633, 962, E.inOutQ], [tm.p0, .614, 964, E.inOutQ], [tm.p1, 1.13, 790, E.inOutC],
    [tm.tM, 1.05, 798, E.inOutQ], [tm.tH, 1.07, 798, E.inOutQ], [tm.tH + .38, 1.27, 802, E.outC], [tm.open + .26, 1.30, 804, E.inOutQ], [tm.d, 1.98, 822, E.inC]]);
  let kick = 0; for (const s of tm.snip) if (t > s) kick += Math.exp(-(t - s) * 16) * (t - s < .5 ? 1 : 0);
  if (t > tm.open) kick += .6 * Math.exp(-(t - tm.open) * 9);
  const dr = drift(t, .6, 7);
  return { z, x: 540 + (dr.x + noise1(t * 30, 3) * 7 * kick) / z, y: cy + (dr.y + noise1(t * 30, 5) * 7 * kick) / z, r: dr.r };
}
function worldTo(cam, wx, wy, zf = cam.z) { return [W / 2 + (wx - cam.x) * zf, H / 2 + (wy - cam.y) * zf]; }

// ---------- dynamic leaves: sway, shiver when about to be torn, then tumble down ----------
function release(L0, tm) {
  const dx = L0.x - HX, dy = L0.y - HY, j = L0.fallJ;
  if (L0.cover) return [tm.p2a + clamp((L0.y - HT) / HS) * .36 + j * .06, 3];
  if (dx > 70) { const k = dy < -60 ? 0 : dy < 75 ? 1 : 2; const [sx, sy] = SNIP_PT[k]; return [tm.snip[k] + .02 + Math.hypot(L0.x - sx, L0.y - sy) / 1300 + j * .08, 1, sx, sy]; }
  if (dx < -70) return [tm.p1a + clamp((L0.y - (HY - 340)) / 680) * (tm.p1b - tm.p1a) + j * .1, 2];
  return dy < 0 ? [tm.snip[0] + .12 + j * .14 + (-dy) / 1600, 1, SNIP_PT[0][0], SNIP_PT[0][1]] : [tm.snip[2] + .06 + j * .14, 1, SNIP_PT[2][0], SNIP_PT[2][1]];
}
function drawDyn(ctx, t, tm) {
  for (const L0 of S.dyn) {
    const [rt, kind, sx0, sy0] = release(L0, tm);
    let x = L0.x + Math.sin(t * 1.1 + L0.ph) * (2 + L0.layer * 1.5), y = L0.y + Math.cos(t * .9 + L0.ph) * 1.5;
    let rot = L0.rot + Math.sin(t * 1.6 + L0.ph) * (.05 + L0.layer * .02), sc = L0.s / 64, a = 1, sx = 1;
    const f = t - rt;
    if (f > -.3 && f <= 0) { const sh = (1 + f / .3) * 4; x += noise1(t * 40, L0.ph * 10) * sh; y += noise1(t * 40, L0.ph * 10 + 3) * sh; rot += noise1(t * 30, L0.ph) * .06 * sh; }
    if (f > 0) {
      if (f > 1.3) continue;
      const j = L0.fallJ; let vx, vy;
      if (kind === 1) { const ux = L0.x - sx0, uy = L0.y - sy0, n = Math.hypot(ux, uy) || 1; vx = ux / n * 240 + (j - .5) * 140; vy = -150 - j * 110; }
      else if (kind === 2) { vx = -230 - j * 120; vy = 90 + j * 60; }
      else { vx = (j - .5) * 220 + L0.fallDir * 50; vy = 160 + j * 80; }
      const k = 2.4;
      x = L0.x + vx * (1 - Math.exp(-k * f)) / k + Math.sin(f * (5 + j * 3) + L0.ph) * 34 * f;
      y = L0.y + vy * f + .5 * 2300 * f * f / (1 + f * .9);
      rot = L0.rot + L0.fallDir * f * (4 + j * 5);
      sx = .2 + .8 * Math.abs(Math.cos(f * (5 + j * 6) + L0.ph));
      a = 1 - clamp((f - .75) / .5);
    }
    ctx.save(); ctx.globalAlpha *= a; leafImg(ctx, L0, x, y, rot, sc, sx, S.leafG); ctx.restore();
  }
}
// short-lived clipping bursts (leaf fragments + stem bits)
function burst(ctx, t, t0, x0, y0, n, seed, o = {}) {
  const f = t - t0; if (f < 0 || f > 1.4) return;
  const floor = o.floor || 1e9;
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed * 31 + i * 7), h2 = hash(seed * 17 + i * 13), h3 = hash(seed * 7 + i * 3);
    const ang = -Math.PI / 2 + (h1 - .5) * 2.6 + (o.bias || 0), sp = (160 + h2 * 380) * (o.sp || 1);
    const k = 3;
    let x = x0 + Math.cos(ang) * sp * (1 - Math.exp(-k * f)) / k + Math.sin(f * 7 + i) * 18 * f;
    let y = y0 + Math.sin(ang) * sp * (1 - Math.exp(-k * f)) / k + .5 * 2000 * f * f / (1 + f);
    if (y > floor) y = floor;
    const a = 1 - clamp((f - .8) / .55);
    ctx.save(); ctx.globalAlpha *= a;
    if (i % 4 === 3) { ctx.translate(x, y); ctx.rotate(f * 9 * (h3 - .5) + h1 * 6); ctx.strokeStyle = '#3c3a22'; ctx.lineWidth = 4 * (o.s || 1); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14 * (o.s || 1), 0); ctx.lineTo(14 * (o.s || 1), 0); ctx.stroke(); }
    else { const S0 = S.bright[i % 4], s = (.22 + h3 * .2) * (o.s || 1); ctx.translate(x, y); ctx.rotate(h1 * 6 + f * 8 * (h2 - .5)); ctx.scale(s * (.2 + .8 * Math.abs(Math.cos(f * 9 + i))), s); ctx.drawImage(S0, -S0.width / 2, -S0.height / 2); }
    ctx.restore();
  }
}
// ivy strand: stem from a (wall) through hand b, optionally dangling to c
function strand(ctx, t, pts, n, seed, a = 1, ls = .44) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  ctx.strokeStyle = '#4b4a2e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,210,170,.3)'; ctx.lineWidth = 2; ctx.stroke();
  // leaves along the polyline
  let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  for (let i = 0; i < n; i++) {
    let dd = tot * (i + .5) / n, k = 0; while (k < seg.length - 1 && dd > seg[k]) { dd -= seg[k]; k++; }
    const u = seg[k] ? dd / seg[k] : 0, px = lerp(pts[k][0], pts[k + 1][0], u), py = lerp(pts[k][1], pts[k + 1][1], u);
    const ang = Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0]), side = i % 2 ? 1 : -1;
    const S0 = S.bright[(i + seed) % 4], s = ls + hash(seed + i) * .18;
    ctx.save(); ctx.translate(px + Math.cos(ang + side * 1.57) * 14, py + Math.sin(ang + side * 1.57) * 14); ctx.rotate(ang + side * 1.2 + Math.sin(t * 5 + i * 2) * .25); ctx.scale(s, s);
    ctx.drawImage(S0, -S0.width / 2, -S0.height / 2); ctx.restore();
  }
  ctx.restore();
}

// ---------- props ----------
function gloveFX(ctx, x, y, s, rot, left, curl = 0, rim = .0) {
  // KL.glove with a grip (curl 0..1): shorter, bent fingers + knuckle shading
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(left ? -s : s, s);
  // work-jacket sleeve: widens toward the elbow and falls off into shadow (reads as an arm, not a pole)
  const sleeve = () => { ctx.beginPath(); ctx.moveTo(-74, 96); ctx.lineTo(74, 96); ctx.bezierCurveTo(94, 400, 112, 800, 122, 1300); ctx.lineTo(-116, 1300); ctx.bezierCurveTo(-106, 800, -94, 400, -74, 96); ctx.closePath(); };
  // soft-ish cast shadow on the ivy (two offset passes instead of a per-frame shadowBlur)
  for (const [ox, oy, sa] of [[16, 22, .2], [28, 38, .14]]) { ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = `rgba(0,0,0,${sa})`; sleeve(); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -40, 95, 120, 0, 0, 7); ctx.fill(); ctx.restore(); }
  sleeve(); const sl = ctx.createLinearGradient(-100, 0, 110, 0); sl.addColorStop(0, '#3b4550'); sl.addColorStop(.35, '#232a31'); sl.addColorStop(1, '#0b0e11'); ctx.fillStyle = sl; ctx.fill(); ctx.shadowColor = 'transparent';
  sleeve(); const fade = ctx.createLinearGradient(0, 260, 0, 1050); fade.addColorStop(0, 'rgba(4,5,7,0)'); fade.addColorStop(1, 'rgba(4,5,7,.94)'); ctx.fillStyle = fade; ctx.fill();
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = 6;
  for (const [yy, k] of [[240, 1], [330, -1], [470, 1]]) { ctx.beginPath(); ctx.moveTo(-72 - yy * .03, yy); ctx.quadraticCurveTo(0, yy + 24 * k, 74 + yy * .035, yy - 12); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200,215,235,.16)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-72, 112); ctx.bezierCurveTo(-92, 400, -102, 700, -108, 1000); ctx.stroke();
  const g = ctx.createLinearGradient(-90, -120, 90, 120); g.addColorStop(0, '#d9bd8e'); g.addColorStop(1, '#86663a');
  ctx.fillStyle = '#6d5532'; roundRect(ctx, -70, 60, 140, 50, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; for (let i = -60; i < 70; i += 14) { ctx.beginPath(); ctx.moveTo(i, 62); ctx.lineTo(i, 108); ctx.stroke(); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-70, 66); ctx.bezierCurveTo(-86, 10, -80, -40, -62, -58); ctx.lineTo(66, -58); ctx.bezierCurveTo(84, -30, 84, 20, 70, 66); ctx.closePath(); ctx.fill();
  const fing = [[-50, -58, -.12, 92], [-17, -60, -.04, 104], [16, -60, .04, 100], [48, -56, .12, 84]];
  for (const [fx, fy, fr, fl0] of fing) {
    const fl = fl0 * (1 - .5 * curl);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fr * (1 - curl));
    ctx.fillStyle = g; roundRect(ctx, -15, -fl, 30, fl + 12, 15); ctx.fill();
    if (curl > .2) { ctx.fillStyle = `rgba(70,45,15,${.45 * curl})`; roundRect(ctx, -15, -fl, 30, 18, 12); ctx.fill(); }
    ctx.strokeStyle = 'rgba(60,40,15,.45)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -fl * .45); ctx.quadraticCurveTo(0, -fl * .42, 10, -fl * .45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(ctx, -9, -fl + 6, 7, fl * .6, 4); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(72, 6); ctx.rotate(.95 - curl * .5); ctx.fillStyle = g; roundRect(ctx, -15, -78 * (1 - .25 * curl), 32, 92 * (1 - .25 * curl), 16); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(60,40,15,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-60, -10); ctx.quadraticCurveTo(0, 6, 60, -10); ctx.stroke();
  if (rim > 0) { ctx.strokeStyle = `rgba(215,230,250,${rim})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-66, 60); ctx.bezierCurveTo(-82, 10, -78, -40, -62, -58); ctx.stroke(); }
  ctx.restore();
}
// shears pose by time: enter, go snip-to-snip, leave
function shearsPose(t, tm) {
  const tip2pivot = (k) => { const r = SNIP_ROT[k], L = 330 * SHS; return [SNIP_PT[k][0] + Math.cos(r) * L, SNIP_PT[k][1] + Math.sin(r) * L, r]; };
  const A = tip2pivot(0), B = tip2pivot(1), Cc = tip2pivot(2);
  const s = tm.snip;
  const [x, y, r] = keys(t, [[tm.p0 + .18, 1640, 1640, .9, null], [s[0] - .08, A[0], A[1], A[2], E.outC], [s[0] + .14, A[0], A[1], A[2], E.lin],
    [s[1] - .08, B[0], B[1], B[2], E.inOutQ], [s[1] + .14, B[0], B[1], B[2], E.lin], [s[2] - .08, Cc[0], Cc[1], Cc[2], E.inOutQ], [s[2] + .2, Cc[0], Cc[1], Cc[2], E.lin], [s[2] + .62, 1420, 1500, .5, E.inQ]]);
  let close = 0; for (const ts of s) close = Math.max(close, P(t, ts - .07, ts, E.inQ) * (1 - P(t, ts + .05, ts + .3, E.outQ)));
  return { x, y, r, open: .5 * (1 - close) + .03, close };
}
function leftGlovePose(t, tm) {
  const [x, y, r, curl] = keys(t, [[tm.p0 + .24, -420, 1820, .7, 0, null], [tm.p1a - .02, 440, 650, .52, .2, E.outC], [tm.p1a + .08, 440, 650, .52, 1, E.outQ],
    [tm.p1b, 290, 1050, .72, 1, E.inOutQ], [tm.p1b + .1, 300, 1040, .7, .1, E.outQ], [tm.p2a, 548, 690, .42, .3, E.inOutQ], [tm.p2a + .08, 548, 694, .42, 1, E.outQ],
    [tm.p2b, 462, 1130, .55, 1, E.inOutQ], [tm.p2b + .1, 462, 1124, .55, .2, E.outQ], [tm.p2b + .5, -40, 1560, .7, 0, E.inQ]]);
  return { x, y, r, curl };
}
function rightGlovePose(t, tm, door) {
  // reaches for the door handle at 철문을, follows it as the door swings, lets go
  const hx = door.hx, hy = door.hy;
  const [x, y, r, curl] = keys(t, [[tm.tH - .05, 1240, 1300, -.35, 0, null], [tm.tH + .32, hx + 34, hy + 52, -.45, .15, E.outC], [tm.tH + .42, hx + 30, hy + 50, -.45, 1, E.outQ]]);
  if (t <= tm.open) return { x, y, r, curl, a: 1 };
  const let_ = P(t, tm.open + .18, tm.open + .55, E.inQ);
  return { x: hx + 30 + let_ * 520, y: hy + 50 + let_ * 760, r: -.45 - let_ * .3, curl: 1 - P(t, tm.open + .16, tm.open + .26), a: 1 };
}

// ---------- hatch (variant of KL.drawHatch: no per-frame blur, glint sweep, rattle, richer interior) ----------
function doorGeo(open) {
  const a = clamp(open) * 1.38, w = HS * Math.cos(a), pe = Math.sin(a) * .16;
  const q = (u, v) => [HL + u * w, HT + v * HS + (v - .5) * 2 * HS * pe * u];
  const [hx, hy] = q(.9, .5);
  return { a, w, pe, q, hx, hy };
}
function hatchFX(ctx, t, open, o) {
  const s = HS, L0 = HL, T0 = HT, d = 40;
  ctx.save();
  ctx.fillStyle = '#020202'; ctx.fillRect(L0, T0, s, s);
  if (open > 0 && o.inside) { ctx.save(); ctx.beginPath(); ctx.rect(L0, T0, s, s); ctx.clip(); o.inside(ctx, L0, T0, s); ctx.restore(); }
  else {
    poly(ctx, [[L0, T0], [L0 + s, T0], [L0 + s - d, T0 + d], [L0 + d, T0 + d]], '#1d1814');
    poly(ctx, [[L0, T0], [L0 + d, T0 + d], [L0 + d, T0 + s - d], [L0, T0 + s]], '#120e0b');
  }
  ctx.strokeStyle = '#3c4044'; ctx.lineWidth = 14; ctx.strokeRect(L0 - 7, T0 - 7, s + 14, s + 14);
  ctx.strokeStyle = 'rgba(220,230,245,.16)'; ctx.lineWidth = 2; ctx.strokeRect(L0 - 13, T0 - 13, s + 26, s + 26);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.strokeRect(L0 - 1, T0 - 1, s + 2, s + 2);
  const G = doorGeo(open), { a, w, q } = G;
  if (open > 0) { // door shadow on the wall (gradient, no blur filter)
    const sw = s * .38 * Math.sin(a), g = ctx.createLinearGradient(L0, 0, L0 - sw, 0);
    g.addColorStop(0, `rgba(0,0,0,${.55 * Math.sin(a)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    poly(ctx, [[L0, T0 + 6], [L0 - sw, T0 + 26], [L0 - sw, T0 + s + 36], [L0, T0 + s]], null); ctx.fillStyle = g; ctx.fill();
  }
  const shade = 1 - Math.sin(a) * .55;
  const g = ctx.createLinearGradient(L0, T0, L0 + Math.max(4, w), T0 + s);
  g.addColorStop(0, `rgb(${Math.round(126 * shade)},${Math.round(131 * shade)},${Math.round(137 * shade)})`); g.addColorStop(1, `rgb(${Math.round(66 * shade)},${Math.round(70 * shade)},${Math.round(76 * shade)})`);
  poly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], g);
  ctx.strokeStyle = 'rgba(0,0,0,.38)'; ctx.lineWidth = 3; poly(ctx, [q(.1, .1), q(.9, .1), q(.9, .9), q(.1, .9)]); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${.13 * shade})`; ctx.lineWidth = 2; poly(ctx, [q(.11, .11), q(.89, .11), q(.89, .89), q(.11, .89)]); ctx.stroke();
  // brushed lines
  ctx.strokeStyle = `rgba(255,255,255,${.04 * shade})`; ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { const v = .14 + i * .052; const [ax, ay] = q(.13, v), [bx, by] = q(.87, v + .01); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  for (let i = 0; i < 9; i++) { const [rx, ry] = q(.2 + hash(i * 3) * .6, .2 + hash(i * 5) * .6); const rr = 6 + hash(i) * 16; const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * Math.max(.2, w / s)); rg.addColorStop(0, 'rgba(120,60,25,.45)'); rg.addColorStop(1, 'rgba(120,60,25,0)'); ctx.fillStyle = rg; ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2); }
  // rust streak under the bottom rivets
  { const [rx, ry] = q(.3, .92); const rg = ctx.createLinearGradient(0, ry, 0, ry + 40); rg.addColorStop(0, 'rgba(110,55,20,.3)'); rg.addColorStop(1, 'rgba(110,55,20,0)'); ctx.fillStyle = rg; ctx.fillRect(rx - 6 * Math.max(.3, w / s), ry, 12 * Math.max(.3, w / s), 40); }
  for (const [u, v] of [[.05, .05], [.95, .05], [.95, .95], [.05, .95]]) { const [rx, ry] = q(u, v); ctx.fillStyle = '#2a2c2f'; ctx.beginPath(); ctx.ellipse(rx, ry, 6 * Math.max(.25, w / s), 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(rx - 1.5, ry - 1.5, 1.6, 0, 7); ctx.fill(); }
  { const [hx, hy] = q(.9, .5), k = Math.max(.3, w / s); ctx.fillStyle = '#1c1e21'; roundRect(ctx, hx - 9 * k, hy - 30, 14 * k, 60, 4); ctx.fill(); ctx.fillStyle = 'rgba(230,240,255,.28)'; ctx.fillRect(hx - 8 * k, hy - 27, 3 * k, 54); }
  ctx.fillStyle = '#2e3134'; ctx.fillRect(L0 - 12, T0 + 30, 18, 46); ctx.fillRect(L0 - 12, T0 + s - 76, 18, 46);
  ctx.fillStyle = 'rgba(220,230,245,.18)'; ctx.fillRect(L0 - 12, T0 + 30, 4, 46); ctx.fillRect(L0 - 12, T0 + s - 76, 4, 46);
  // glint sweep across the steel (철문을)
  if (o.glint > 0 && o.glint < 1 && w > 20) {
    ctx.save(); poly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], null); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const gx = lerp(L0 - 160, L0 + w + 160, o.glint); const gg = ctx.createLinearGradient(gx - 70, T0, gx + 70, T0 + 60);
    gg.addColorStop(0, 'rgba(200,225,255,0)'); gg.addColorStop(.5, 'rgba(220,235,255,.55)'); gg.addColorStop(1, 'rgba(200,225,255,0)');
    ctx.fillStyle = gg; ctx.fillRect(L0 - 200, T0 - 20, s + 400, s + 40); ctx.restore();
  }
  ctx.restore();
  return G;
}
// a compact black garbage bag sitting low in the cavity
function bagMini(ctx, x, y, w, h, t, lit) {
  ctx.save(); ctx.translate(x, y);
  const body = () => { ctx.beginPath(); ctx.moveTo(-w * .5, h * .5); ctx.bezierCurveTo(-w * .62, h * .05, -w * .5, -h * .42, -w * .22, -h * .5);
    ctx.bezierCurveTo(-w * .08, -h * .36, w * .08, -h * .62, w * .26, -h * .48); ctx.bezierCurveTo(w * .54, -h * .3, w * .62, h * .12, w * .5, h * .5); ctx.closePath(); };
  const bg = ctx.createLinearGradient(-w * .4, -h * .5, w * .3, h * .5); bg.addColorStop(0, `rgb(${22 + 18 * lit},${23 + 19 * lit},${27 + 22 * lit})`); bg.addColorStop(.55, '#08080a'); bg.addColorStop(1, '#030304');
  body(); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = (hash(i * 3) - .5) * .9, b = (hash(i * 5) - .5) * .8, l = .12 + hash(i * 7) * .16, an = -.6 + hash(i * 11) * 1.4;
    const x0 = a * w, y0 = b * h, x1 = x0 + Math.cos(an) * l * w, y1 = y0 + Math.sin(an) * l * w;
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0 + 3); ctx.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6, x1, y1 + 3); ctx.stroke();
    const al = lit * (.2 + .45 * (.5 + .5 * Math.sin(t * 2.2 + i * 1.7))) * (a < .1 ? 1 : .55);
    ctx.strokeStyle = `rgba(205,218,240,${al})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6, x1, y1); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = `rgba(180,195,220,${.35 * lit})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-w * .5, h * .45); ctx.bezierCurveTo(-w * .6, h * .05, -w * .48, -h * .4, -w * .22, -h * .5); ctx.stroke();
  ctx.restore();
}
function cavity(ctx, L0, T0, s, t, open, tm) {
  const d = 40, lit = P(t, tm.open + .05, tm.open + .5, E.outQ);
  // depth: back wall + bevel faces of the recess, lit a little by the opening door
  ctx.fillStyle = '#060505'; ctx.fillRect(L0, T0, s, s);
  poly(ctx, [[L0, T0], [L0 + s, T0], [L0 + s - d, T0 + d], [L0 + d, T0 + d]], '#1d1814');
  poly(ctx, [[L0, T0], [L0 + d, T0 + d], [L0 + d, T0 + s - d], [L0, T0 + s]], '#141009');
  poly(ctx, [[L0 + s, T0], [L0 + s, T0 + s], [L0 + s - d, T0 + s - d], [L0 + s - d, T0 + d]], '#0c0a08');
  poly(ctx, [[L0, T0 + s], [L0 + d, T0 + s - d], [L0 + s - d, T0 + s - d], [L0 + s, T0 + s]], `rgb(${36 + 30 * lit},${29 + 26 * lit},${24 + 22 * lit})`);
  // daylight wedge entering
  if (lit > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(L0, T0, L0 + s * .7, T0 + s); g.addColorStop(0, `rgba(170,190,215,${.18 * lit})`); g.addColorStop(1, 'rgba(170,190,215,0)');
    ctx.fillStyle = g; poly(ctx, [[L0 + s * .15, T0], [L0 + s, T0], [L0 + s, T0 + s], [L0 + s * .5, T0 + s]], null); ctx.fill(); ctx.restore();
  }
  bagMini(ctx, L0 + s * .52, T0 + s * .74, s * .86, s * .5, t, .25 + .75 * lit);
  // glint on the plastic as light hits it
  const gl = P(t, tm.open + .18, tm.open + .32) * (1 - P(t, tm.open + .4, tm.open + .8));
  if (gl > 0) glow(ctx, L0 + s * .38, T0 + s * .58, 70, '#e6f0ff', .65 * gl);
  const vg = ctx.createRadialGradient(L0 + s * .5, T0 + s * .62, s * .2, L0 + s * .5, T0 + s * .55, s * .78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = vg; ctx.fillRect(L0, T0, s, s);
}
function puff(ctx, t, t0) {
  const f = t - t0; if (f < 0 || f > 1.6) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16; i++) {
    const h1 = hash(i * 11 + 3), h2 = hash(i * 5 + 9), side = i % 4;
    const sx = side === 0 ? HL + h1 * HS : side === 1 ? HL : side === 2 ? HL + HS : HL + h1 * HS;
    const sy = side === 0 ? HT : side === 1 ? HT + h1 * HS : side === 2 ? HT + h1 * HS : HT + HS;
    const k = E.outC(clamp(f / (1 + h2 * .5)));
    const x = sx + (sx - HX) * .9 * k - 60 * k + Math.sin(f * 2 + i) * 10, y = sy + (sy - HY) * .7 * k + 40 * k * k;
    const r = 24 + 62 * k * (.6 + h2), a = (1 - clamp(f / 1.1)) * .15 * (.5 + h1) * P(f, 0, .08);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(170,160,145,${a})`); g.addColorStop(1, 'rgba(170,160,145,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  motes(ctx, f + 3, { n: 26, color: '#e2dccf', a: .55 * (1 - clamp(f / 1.6)), area: [HL - 140, HT - 120, HS + 280, HS + 300], size: 2.6, speed: 70, seed: 41 });
}

// ---------- gardeners (wide shot) ----------
function handWorld(x, y, lean, hand) { const c = Math.cos(lean), s = Math.sin(lean); return [x + c * hand[0] - s * hand[1], y + s * hand[0] + c * hand[1]]; }
// G1 (left) holds a vine and snips it with pruners; G2 (right) hauls a long strand down off the wall.
// Hands are posed by target (2-bone IK), so they stay on the ivy. Both work away from the centre,
// keeping the ivy patch the camera later dives into clear.
function ik(sx, sy, tx, ty, l1, l2, bend) {
  const dx = tx - sx, dy = ty - sy, dm = Math.min(Math.hypot(dx, dy), (l1 + l2) * .995), phi = Math.atan2(dx, dy);
  const al = Math.acos(clamp((l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm), -1, 1)), be = Math.acos(clamp((l1 * l1 + l2 * l2 - dm * dm) / (2 * l1 * l2), -1, 1));
  return [phi + bend * al, -bend * (Math.PI - be)];
}
function poseArms(p, hl, hr, bl = 1, br = -1) {
  // world hand targets -> figure-local IK (figure frame is rotated by lean about the feet)
  const u = p.h / 8, c = Math.cos(-p.lean), s = Math.sin(-p.lean);
  const loc = ([wx, wy]) => { const x = wx - p.x, y = wy - p.y; return [c * x - s * y, s * x + c * y]; };
  const [lx, ly] = loc(hl), [rx, ry] = loc(hr);
  p.armL = ik(-1.008 * u, -6.6 * u, lx, ly, 1.45 * u, 1.35 * u, bl);
  p.armR = ik(1.008 * u, -6.6 * u, rx, ry, 1.45 * u, 1.35 * u, br);
  return p;
}
const G1A = [-40, 430], G2A = [1120, 400];          // where each gardener's strand is still attached to the wall
function g1Pose(t) {
  const ph = (t + .9) / 1.1 * 6.283, pull = .5 - .5 * Math.cos(ph);
  const hl = [lerp(38, 74, pull), lerp(690, 846, pull)], hr = [302 + 6 * Math.sin(t * 1.3), 1140 + 8 * Math.sin(t * 1.6)];
  return Object.assign(poseArms({ x: 200, y: FEET, h: 700, lean: -.022 + .03 * pull }, hl, hr), { pull, hl, hr });
}
function g2Pose(t) {
  const ph = (t + .25) / 1.3 * 6.283, pull = .5 - .5 * Math.cos(ph);      // 0 = arms up, 1 = hauled down
  const hr = [lerp(1012, 1050, pull), lerp(680, 880, pull)], hl = [lerp(968, 990, pull), lerp(730, 922, pull)];
  return Object.assign(poseArms({ x: 880, y: FEET, h: 720, lean: .02 - .04 * pull }, hl, hr, -1, -1), { pull, hl, hr });
}
function drawFigure(ctx, p, extra, rimA) {
  const o = Object.assign({ shadow: false, coat: true, coatLen: 1.0, face: 0, lean: p.lean, armL: p.armL, armR: p.armR }, extra);
  F_().figure(ctx, p.x - 7, p.y - 5, p.h, Object.assign({}, o, { fill: rgba('#c3d5ea', .62 * rimA) }));
  F_().figure(ctx, p.x + 5, p.y - 2, p.h, Object.assign({}, o, { fill: rgba('#6f8aa8', .35 * rimA) }));
  const info = F_().figure(ctx, p.x, p.y, p.h, Object.assign({}, o, { fill: '#07090c' }));
  // knit cap
  const u = info.u, c = Math.cos(p.lean), s = Math.sin(p.lean);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.lean); ctx.fillStyle = '#07090c';
  ctx.beginPath(); ctx.ellipse(info.head[0], info.head[1] - .22 * u, .52 * u, .44 * u, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(info.head[0] - .52 * u, info.head[1] - .26 * u, 1.04 * u, .14 * u);
  ctx.strokeStyle = rgba('#b7cbe2', .35 * rimA); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(info.head[0], info.head[1] - .22 * u, .52 * u, .44 * u, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.restore();
  return { info, hands: info.hands.map(hh => handWorld(p.x, p.y, p.lean, hh)), c, s };
}
function gardeners(ctx, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  // contact shadows + faint wall shadows
  for (const [x, w] of [[205, 170], [900, 180]]) { const g = ctx.createRadialGradient(x, FEET, 0, x, FEET, w); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(x, FEET); ctx.scale(1, .16); ctx.translate(-x, -FEET); ctx.fillStyle = g; ctx.fillRect(x - w, FEET - w, w * 2, w * 2); ctx.restore(); }
  ctx.save(); ctx.globalAlpha *= .2; ctx.drawImage(S.shadow, 205 - 150 + 50, FEET - 720 - 40, 300, 740); ctx.drawImage(S.shadow, 900 - 150 + 50, FEET - 740 - 40, 300, 760); ctx.restore();
  // G2 hauls a long strand (its wall anchor peels downward over time) onto a pile
  // The gardeners face the wall: the part of each strand hanging below the hands is behind the body,
  // the part running up to the wall is in front.
  const sw = Math.sin(t * 2.3);
  const p2 = g2Pose(t), a2 = [G2A[0], G2A[1] + 130 * clamp(t / 2.2)];
  strand(ctx, t, [p2.hl, [p2.hl[0] + 30 + sw * 18, p2.hl[1] + 190], [p2.hl[0] + 90 + sw * 26, FEET - 40], [1110, FEET - 26]], 9, 3, 1, .6);
  drawFigure(ctx, p2, {}, 1);
  strand(ctx, t, [a2, [lerp(a2[0], p2.hr[0], .5) + 10, lerp(a2[1], p2.hr[1], .5) + 26 * (1 - p2.pull)], p2.hr, p2.hl], 6, 7, 1, .62);
  const p1 = g1Pose(t), a1 = [G1A[0], G1A[1] + 120 * clamp(t / 2.2)], sw1 = Math.sin(t * 1.9 + .6);
  strand(ctx, t, [p1.hl, [p1.hl[0] - 24 + sw1 * 16, p1.hl[1] + 200], [p1.hl[0] + 10 + sw1 * 24, FEET - 50]], 7, 5, 1, .56);
  drawFigure(ctx, p1, {}, 1);
  strand(ctx, t, [a1, [lerp(a1[0], p1.hl[0], .5) - 6, lerp(a1[1], p1.hl[1], .5) + 22 * (1 - p1.pull)], p1.hl], 5, 9, 1, .6);
  strand(ctx, t, [p1.hr, [p1.hr[0] + 14 + Math.sin(t * 1.9) * 10, p1.hr[1] + 110], [p1.hr[0] + 2 + Math.sin(t * 1.9 + .7) * 16, p1.hr[1] + 220]], 6, 5, 1, .52);
  ctx.restore();
  return { a1, a2 };
}

// ---------- screen-space text ----------
function flapDate(ctx, s, x, y, t, o) {
  const chars = Array.from(s), size = o.size, cw = size * .74, ch = size * 1.28, gap = size * .085;
  const adv = c => (c === '.' ? cw * .42 : cw) + gap;
  const total = chars.reduce((a, c) => a + adv(c), 0) - gap;
  let cx = x - total / 2; const cells = [];
  chars.forEach((c, i) => {
    if (c === '.') { text(ctx, '.', cx + cw * .21, y + size * .32, { size, family: FONT.disp, color: '#f4f1ea', weight: 400 }); cx += adv(c); return; }
    const tl = o.lockAt(i), locked = t >= tl, rate = 22, k = Math.floor(t * rate), ph = t * rate - k;
    const dig = n => String(Math.floor(hash(n * 13 + i * 71) * 10));
    const cur = locked ? c : dig(k), prev = locked ? (t - tl < 1 / rate ? dig(Math.floor(tl * rate) - 1) : c) : dig(k - 1);
    const hl = o.hl(i), col = hl > 0 ? `rgb(${Math.round(lerp(244, 246, hl))},${Math.round(lerp(241, 215, hl))},${Math.round(lerp(234, 127, hl))})` : (locked ? '#f4f1ea' : '#9aa3b4');
    const pop = locked ? 1 + .14 * Math.exp(-(t - tl) * 14) * Math.sin((t - tl) * 30) : 1;
    ctx.save(); ctx.translate(cx + cw / 2, y); ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRect(ctx, -cw / 2 + 2, -ch / 2 + 9, cw, ch, 12); ctx.fill(); ctx.fillStyle = '#121419'; roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 10); ctx.fill();
    if (hl > 0) { ctx.strokeStyle = rgba('#f6d77f', .7 * hl); ctx.lineWidth = 3; roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 10); ctx.stroke(); }
    const half = (str, top, sy) => { ctx.save(); ctx.beginPath(); ctx.rect(-cw / 2, top ? -ch / 2 : 0, cw, ch / 2); ctx.clip(); ctx.scale(1, sy); text(ctx, str, 0, size * .04, { size, family: FONT.disp, color: col, weight: 400 }); ctx.restore(); };
    const flipP = locked ? clamp((t - tl) * rate) : ph;
    if (flipP < 1 && (!locked || t - tl < 1 / rate)) {
      half(cur, true, 1); half(prev, false, 1);
      if (flipP < .5) half(prev, true, 1 - flipP * 2); else half(cur, false, (flipP - .5) * 2);
    } else { half(cur, true, 1); half(cur, false, 1); }
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 10); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(-cw / 2, -2, cw, 4);
    ctx.restore();
    cells.push([cx, cx + cw, i]); cx += adv(c);
  });
  return { cells, ch };
}
function pill(ctx, s, x, y, p, typed, o = {}) {
  if (p <= 0) return;
  const size = o.size || 34, w = measure(ctx, s, size, FONT.sub, 800) + 48, h = size + 26, sc = lerp(.6, 1, E.outBack(clamp(p * 1.4)));
  ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(x, y); ctx.scale(sc, 1);
  ctx.fillStyle = o.bg || 'rgba(8,10,14,.84)'; roundRect(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(246,215,127,.65)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = o.accent || K.gold; ctx.fillRect(-w / 2 + 10, -h / 2 + 10, 5, h - 20);
  ctx.restore();
  text(ctx, typed, x - w / 2 + 26, y + 2, { size, align: 'left', color: o.color || '#eef1f5', weight: 800, alpha: clamp(p * 3) });
  return w;
}

// ---------------------------------------------------------------------------
window.KL.scenes.found = function (ctx, t, d, info) {
  if (!S) init();
  const tm = times(info, d), cam = camAt(t, tm);
  const close = cam.z > .86;                         // which baked wall to use (switches mid-whip)
  const wideA = 1 - P(cam.z, .86, .97);              // gardener layer: flung out of frame by parallax, then dropped
  const open = (() => {
    const o = tm.open; if (t < o) return Math.max(0, .018 * Math.sin((t - (o - .16)) * 70) * P(t, o - .16, o - .1) * (1 - P(t, o - .02, o)));
    const k = P(t, o, o + .42, E.outC); return clamp(k - .07 * Math.sin(P(t, o + .3, o + .75) * Math.PI));
  })();

  // ---------------- world layer ----------------
  ctx.save();
  camera(ctx, { x: cam.x, y: cam.y, zoom: cam.z, rot: cam.r, t });
  const B = close ? CLOSE : WIDE, img = close ? S.close : S.wide;
  ctx.drawImage(img, B.x0, B.y0, B.w, B.h);
  const door = hatchFX(ctx, t, open, { glint: P(t, tm.tH + .02, tm.tH + .5, E.inOutQ), inside: (c, L0, T0, s) => cavity(c, L0, T0, s, t, open, tm) });
  drawDyn(ctx, t, tm);
  if (open > 0) puff(ctx, t, tm.open + .02);
  // close-up ivy work: clippings, strands, shears, gloves
  if (t > tm.p0) {
    tm.snip.forEach((ts, k) => burst(ctx, t, ts, SNIP_PT[k][0], SNIP_PT[k][1], 14, 11 + k, { bias: .35, sp: 1.1, s: 1.15 }));
    const lg = leftGlovePose(t, tm);
    // strand 1: dragged down-left during the first pull, then dropped
    const a1 = P(t, tm.p1a - .1, tm.p1a + .05) * (1 - P(t, tm.p1b + .15, tm.p1b + .45));
    if (a1 > 0) {
      const pk = P(t, tm.p1a, tm.p1b, E.inOutQ), fall = Math.max(0, t - tm.p1b - .08), dy = 900 * fall * fall;
      const ax = lerp(452, 418, pk), ay = lerp(610, 1000, pk) + dy, gx = t < tm.p1b + .08 ? lg.x : 300 - 40 * fall, gy = t < tm.p1b + .08 ? lg.y : 1040 + dy;
      strand(ctx, t, [[ax, ay], [lerp(ax, gx, .5) + 30, lerp(ay, gy, .5) - 10], [gx, gy], [gx - 30 + Math.sin(t * 4) * 12, gy + 140 + dy * .2]], 8, 1, a1);
    }
    const a2 = P(t, tm.p2a - .05, tm.p2a + .05) * (1 - P(t, tm.p2b + .1, tm.p2b + .4));
    if (a2 > 0) {
      const pk = P(t, tm.p2a, tm.p2b, E.inOutQ), fall = Math.max(0, t - tm.p2b - .06), dy = 900 * fall * fall;
      const ax = lerp(560, 600, pk), ay = lerp(668, 905, pk) + dy, gx = t < tm.p2b + .06 ? lg.x : 462 - 30 * fall, gy = t < tm.p2b + .06 ? lg.y : 1124 + dy;
      strand(ctx, t, [[ax, ay], [lerp(ax, gx, .5) + 20, lerp(ay, gy, .5)], [gx, gy], [gx + 20 + Math.sin(t * 4 + 1) * 12, gy + 130 + dy * .2]], 7, 2, a2);
    }
    if (t < tm.p2b + .55) gloveFX(ctx, lg.x, lg.y, .44, lg.r, true, lg.curl, .55);
    const sp = shearsPose(t, tm);
    if (t < tm.snip[2] + .65) {
      shears(ctx, sp.x, sp.y, sp.r, sp.open, SHS);
      if (sp.close > .9) { const k = tm.snip.findIndex(ts => Math.abs(t - ts) < .08); if (k >= 0) glow(ctx, SNIP_PT[k][0], SNIP_PT[k][1], 46, '#eaf3ff', .7); }
      const hd = [Math.cos(sp.r), Math.sin(sp.r)];
      gloveFX(ctx, sp.x + hd[0] * 122, sp.y + hd[1] * 122, .46, sp.r - Math.PI / 2, false, 1, .4);
    }
    if (t > tm.tH - .1) { const rg = rightGlovePose(t, tm, door); if (rg.y < 1500) gloveFX(ctx, rg.x, rg.y, .44, rg.r, false, rg.curl, .45); }
  }
  // red brackets at 철문을 (expand + fade as the camera dives in)
  const bp = P(t, tm.tH, tm.tH + .28), bo = 1 - P(t, tm.open + .35, tm.open + .7);
  if (bp > 0 && bo > 0) { ctx.save(); ctx.globalAlpha *= bo; const ex = 26 + 30 * P(t, tm.open + .2, tm.open + .7, E.inQ); brackets(ctx, HL - ex, HT - ex, HS + ex * 2, HS + ex * 2, bp); ctx.restore(); }
  // daylight grade: cool bounce from the upper left, falloff around the focus
  ctx.restore();

  // ---------------- gardener layer (nearer the lens: stronger parallax) ----------------
  if (wideA > 0) {
    ctx.save();
    const zf = cam.z * Math.pow(cam.z / Z0, 3.0);
    ctx.translate(W / 2, H / 2); ctx.rotate(cam.r); ctx.scale(zf, zf); ctx.translate(-cam.x, -cam.y);
    gardeners(ctx, t, wideA);
    // clippings around the gardeners (fall to the ground)
    for (const tb of [.2, 1.3]) burst(ctx, t, tb, G1A[0] + 30, G1A[1] + 120 * clamp(tb / 2.2) + 20, 7, Math.round(tb * 10), { s: .9, sp: .6, floor: FEET - 10 });
    for (const tb of [.4, 1.7]) burst(ctx, t, tb, G2A[0] - 20, G2A[1] + 130 * clamp(tb / 2.2) + 20, 7, 40 + Math.round(tb * 10), { s: .9, sp: .6, floor: FEET - 10 });
    fogLayer(ctx, t, FEET - 40, 160, '#8f9bb0', .07, 3, 14);
    ctx.restore();
  }
  // ---------------- screen space ----------------
  // gardener's shadow sweeping over the wall (정원사들이)
  const sh = P(t, tm.tG - .25, tm.tG + .15) * (1 - P(t, tm.tM + .1, tm.tM + .5));
  if (sh > 0 && cam.z > .9) { ctx.save(); ctx.globalAlpha = .3 * sh; const sx = lerp(1060, 860, P(t, tm.tG - .3, tm.tM + .5, E.inOutQ)); ctx.drawImage(S.shadow, sx - 330, 380, 660, 1180); ctx.restore(); }
  // out-of-focus foreground ivy (wide shot), flies out during the dolly
  if (cam.z < 1.02) {
    const zf = Math.pow(cam.z / Z0, 2.6), a = 1 - P(cam.z, .8, 1.02);
    ctx.save(); ctx.globalAlpha = .92 * a;
    for (const [fx, fy, s, rot] of [[-40, 1500, 1.15, 0], [1120, 520, .9, 2.6], [1160, 1640, 1.0, 1.4]]) {
      const x = W / 2 + (fx - W / 2) * zf, y = H / 2 + (fy - H / 2) * zf + Math.sin(t * .9 + fx) * 6;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot + Math.sin(t * .7 + fy) * .02); ctx.scale(s * zf, s * zf); ctx.drawImage(S.fg, -280, -280); ctx.restore();
    }
    ctx.restore();
  }
  // speed lines on the whip-in
  const vz = (camAt(t + .02, tm).z - camAt(t - .02, tm).z) / .04 / cam.z;
  if (vz > .6) {
    const a = clamp((vz - .6) / 2.2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const an = hash(i * 7) * 6.283, r0 = 260 + hash(i * 3) * 380 + ((t * 2400 + hash(i) * 800) % 600), len = 140 + vz * 70 * hash(i * 5);
      ctx.strokeStyle = `rgba(220,232,250,${(.05 + .1 * hash(i * 9)) * a})`; ctx.lineWidth = 2 + hash(i * 11) * 3;
      ctx.beginPath(); ctx.moveTo(540 + Math.cos(an) * r0, 960 + Math.sin(an) * r0); ctx.lineTo(540 + Math.cos(an) * (r0 + len), 960 + Math.sin(an) * (r0 + len)); ctx.stroke();
    }
    ctx.restore();
  }
  // date flap + caption (wide shot), lift away on the dolly
  const fo = 1 - P(t, tm.p0 - .05, tm.p0 + .22, E.inQ);
  if (fo > 0) {
    ctx.save(); ctx.globalAlpha = fo; const lift = (1 - fo) * -70; ctx.translate(0, lift);
    const bandA = P(t, 0, .25);
    const bg = ctx.createLinearGradient(0, 470, 0, 800); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(.3, `rgba(0,0,0,${.45 * bandA})`); bg.addColorStop(.75, `rgba(0,0,0,${.4 * bandA})`); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 470, W, 330);
    const g19 = P(t, tm.t19, tm.t19 + .3, E.outC), g12 = P(t, tm.t12, tm.t12 + .3, E.outC);
    const fd = flapDate(ctx, '2019.12.10', 540, 600, t, { size: 100, lockAt: i => .16 + i * .045, hl: i => (i < 4 ? g19 : (i === 5 || i === 6) ? g12 : 0) });
    for (const [i0, i1, g] of [[0, 3, g19], [5, 6, g12]]) {
      if (g <= 0) continue; const c0 = fd.cells.find(c => c[2] === i0), c1 = fd.cells.find(c => c[2] === i1);
      const x0 = c0[0], x1 = lerp(c0[0], c1[1], g), yy = 600 + fd.ch / 2 + 14;
      ctx.save(); ctx.shadowColor = K.gold; ctx.shadowBlur = 16; ctx.fillStyle = K.goldHi; ctx.fillRect(x0, yy, x1 - x0, 7); ctx.restore();
      if (g < 1) glow(ctx, x1, yy + 3, 40, '#ffe7a0', .8);
    }
    const cp = P(t, tm.t12 - .25, tm.t12 + .05);
    pill(ctx, '담쟁이 제거 작업 중', 540, 726, cp, typeSub('담쟁이 제거 작업 중', P(t, tm.t12 - .15, tm.t12 + .35)), { size: 34 });
    ctx.restore();
  }
  // callout: approved label, types in at 미술관; leader to the hatch top
  const la = P(t, tm.tM - .05, tm.tM + .2) * (1 - P(t, tm.open + .1, tm.open + .4));
  if (la > 0) {
    const s = '외벽의 잠기지 않은 작은 철제 덮개', [ax, ay] = worldTo(cam, HX, HT - 30), ly = 690;
    const lp = P(t, tm.tM - .05, tm.tM + .3, E.outC);
    ctx.save(); ctx.globalAlpha = la; ctx.strokeStyle = rgba(K.goldHi, .8); ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(540, ly + 34); ctx.lineTo(540, lerp(ly + 34, Math.max(ly + 40, ay), lp)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = K.goldHi; ctx.beginPath(); ctx.arc(540, Math.max(ly + 40, ay), 6 * lp, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = la; pill(ctx, s, 540, ly, P(t, tm.tM - .05, tm.tM + .15), typeSub(s, P(t, tm.tM, tm.tM + .5)), { size: 34 }); ctx.restore();
  }
};
})();
