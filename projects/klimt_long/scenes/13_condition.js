// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "상태는 비교적 양호했고, 검찰은 내내 벽 속에 있었는지 모른다고 했다."
// Part A — conservation studio (warm, low-key). Opens on exactly the framing "verdict" ends on.
//  상태는    a conservator silhouette (left, cropped) switches on a penlight; the beam rakes across the
//            canvas while an inspection grid lights up cell by cell where the light has passed
//  비교적    a paper condition report slides up: "보존 상태 / □ 비교적 양호"
//  양호했고  the box is ticked (green), a green pulse runs over the whole grid, the conservator nods,
//            switches off and walks out of frame
// Part B — the question. One continuous dolly-back: the canvas recedes into the open hatch of the same
//          ivy wall seen in "found"/"bag" (the wall closes in around it, big out-of-focus leaves fly past)
//  검찰은    tick: quote card types the approved label "검찰: '내내 거기 있었는지 지금은 알 수 없다'"
//  내내      a 1997.2 → 2019.12 timeline draws; the year counter runs while the ivy grows back around the
//  벽 속에   hatch (time-lapse: leaves creep in, light passes over the wall); "22년" span bracket
//  있었는지  the canvas in the cavity flickers present / absent, the timeline turns to dashes with "?" marks
//  모른다고  piano: a big red "?" lands over the cavity (shockwave), "알 수 없다" is underlined in red
//  했다      hold: ghost canvas breathes, leaves sway, dust drifts, slow push-in into the "letter" push
// ---------------------------------------------------------------------------

let V = null;
const PC = { x: 540, y: 800 }, PS = .72;             // studio: canvas world centre + card scale (same as verdict)
const IW = 620, IH = 720;
const FLOOR = 1390;
const CON = { x: 40, y: 1745, h: 1060 };              // conservator: feet point, faces right
const BX0 = -260, BY0 = -260, BW = 1600, BH = 2500;   // studio backdrop sprite world rect
const HX = HATCH.x, HY = HATCH.y, HS = HATCH.s, HL = HX - HS / 2, HT = HY - HS / 2, HD = 40;
const WALL_OY = -420;
const WX0 = 40, WY0 = 120, WWd = 1000, WHd = 1500;    // baked wall crop (wall world)
const HSY = 826;                                      // screen y of the hatch centre in part B
const CS = .30;                                       // card scale inside the cavity (wall world)
const GREEN = '#7dffb0';

// ---------- utils ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
function camAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < 4; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}
function ik(root, tgt, l1, l2) {
  const dx = tgt[0] - root[0], dy = tgt[1] - root[1], d0 = Math.max(1e-3, Math.hypot(dx, dy));
  const d = clamp(d0, Math.abs(l1 - l2) + 1, l1 + l2 - .5);
  const base = Math.atan2(dx, dy), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  let best = null;
  for (const s of [1, -1]) {
    const a1 = base + s * al, ex = root[0] + Math.sin(a1) * l1, ey = root[1] + Math.cos(a1) * l1;
    const tx = root[0] + dx / d0 * d, ty = root[1] + dy / d0 * d;
    const a2 = Math.atan2(tx - ex, ty - ey) - a1;
    if (!best || ey > best.ey) best = { a1, a2, ey };
  }
  return [best.a1, best.a2];
}

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
function leafImg(x, L0, px, py, rot, sc) {
  const S0 = T.leaf[L0.v];
  x.save(); x.translate(px, py); x.rotate(rot); x.scale(sc, sc); x.drawImage(S0, -S0.width / 2, -S0.height / 2 - 10); x.restore();
}

// ---------- sprites (built once) ----------
function makeFront() {
  const [c, x] = mk(IW, IH);
  x.fillStyle = '#5c4630'; x.fillRect(0, 0, IW, IH);
  x.fillStyle = '#cbbd9e'; x.fillRect(5, 5, IW - 10, IH - 10);
  x.drawImage(T.portrait, 10, 10);
  const g = x.createLinearGradient(0, 0, IW, IH); g.addColorStop(0, 'rgba(255,250,235,.06)'); g.addColorStop(.5, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  x.fillStyle = g; x.fillRect(10, 10, 600, 700);
  return c;
}
function makeLit(src) { const [c, x] = mk(IW, IH); x.filter = 'brightness(1.55) contrast(1.18) saturate(1.2)'; x.drawImage(src, 0, 0); x.filter = 'none'; return c; }
function makeStudio() {
  const [c, x] = mk(BW, BH); x.translate(-BX0, -BY0); const R = rng(1313);
  let g = x.createLinearGradient(0, BY0, 0, FLOOR); g.addColorStop(0, '#0b0908'); g.addColorStop(.5, '#1a1511'); g.addColorStop(1, '#0d0b09');
  x.fillStyle = g; x.fillRect(BX0, BY0, BW, FLOOR - BY0);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,220,180' : '0,0,0'},${R() * .03})`; x.fillRect(BX0 + R() * BW, BY0 + R() * (FLOOR - BY0), 2, 2); }
  // wainscot line
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(BX0, 1020, BW, 5); x.fillStyle = 'rgba(255,210,160,.04)'; x.fillRect(BX0, 1025, BW, 2);
  // shelves (left) with jars / bottles / brushes
  x.fillStyle = '#070605';
  for (const sy of [560, 760, 960]) x.fillRect(-250, sy, 470, 12);
  x.fillRect(-240, 420, 12, 970); x.fillRect(205, 420, 12, 600);
  for (let i = 0; i < 24; i++) {
    const sy = [560, 760, 960][i % 3], bx = -225 + R() * 410, bw = 18 + R() * 40, bh = 34 + R() * 90;
    x.fillStyle = `rgb(${10 + R() * 8},${8 + R() * 6},${7 + R() * 5})`;
    if (R() < .5) { roundRect(x, bx, sy - bh, bw, bh, 6); x.fill(); x.fillRect(bx + bw * .3, sy - bh - 10, bw * .4, 12); }
    else { x.fillRect(bx, sy - bh * .6, bw, bh * .6); for (let k = 0; k < 4; k++) { x.fillRect(bx + 3 + k * bw / 5, sy - bh * .6 - 40 - R() * 30, 3, 50); } }
    x.fillStyle = 'rgba(255,200,140,.08)'; x.fillRect(bx + bw - 3, sy - bh, 2, bh);
  }
  // tall cabinet (right) with drawers
  x.fillStyle = '#080605'; x.fillRect(880, 640, 330, 600);
  for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(255,200,140,.05)'; x.fillRect(895, 660 + k * 112, 300, 2); x.fillStyle = 'rgba(255,200,140,.12)'; x.fillRect(1030, 700 + k * 112, 30, 6); }
  // second canvas leaning (back) + worktable
  x.fillStyle = '#0a0806'; x.save(); x.translate(1080, 1180); x.rotate(.08); x.fillRect(-120, -260, 240, 300); x.fillStyle = '#16110c'; x.fillRect(-110, -250, 220, 18); x.fillRect(-110, -10, 220, 18); x.fillRect(-10, -250, 20, 260); x.restore();
  x.fillStyle = '#080605'; x.fillRect(BX0, 1240, BW, 24); x.fillStyle = 'rgba(255,210,160,.08)'; x.fillRect(BX0, 1240, BW, 2);
  x.fillStyle = '#060504'; x.fillRect(BX0, 1264, BW, FLOOR - 1264);
  g = x.createLinearGradient(0, FLOOR, 0, BY0 + BH); g.addColorStop(0, '#120e0b'); g.addColorStop(1, '#030202'); x.fillStyle = g; x.fillRect(BX0, FLOOR, BW, BY0 + BH - FLOOR);
  x.fillStyle = 'rgba(255,210,160,.06)'; x.fillRect(BX0, FLOOR, BW, 2);
  // warm pool behind the easel
  const rg = x.createRadialGradient(PC.x + 40, PC.y - 80, 0, PC.x + 40, PC.y - 80, 680); rg.addColorStop(0, 'rgba(255,190,120,.22)'); rg.addColorStop(.45, 'rgba(255,170,100,.07)'); rg.addColorStop(1, 'rgba(255,170,100,0)');
  x.globalCompositeOperation = 'lighter'; x.fillStyle = rg; x.fillRect(PC.x - 700, PC.y - 800, 1500, 1500); x.globalCompositeOperation = 'source-over';
  const [c2, x2] = mk(BW, BH); x2.filter = 'blur(3px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  // warm work-lamp shafts from the top right (static, baked)
  const Rr = makeRays(.62, 1600, '#ffd9a0', .9, 7, 5);
  x2.translate(-BX0, -BY0); x2.globalCompositeOperation = 'lighter'; x2.globalAlpha = .08;
  x2.save(); x2.translate(980, 120); x2.rotate(.38); x2.drawImage(Rr.c, -Rr.w / 2, 0, Rr.w, Rr.h); x2.restore();
  x2.globalAlpha = 1; x2.globalCompositeOperation = 'source-over';
  return c2;
}
// radial light falloff around the hatch (same curve as KL.darkness(HX, HY, 470, .9, .3)), baked into sprites
const FALL = (x, y) => .9 * clamp((Math.hypot(x - HX, y - HY) - 141) / 329);
function bakeFalloff(x, x0, y0, w, h) {
  const g = x.createRadialGradient(HX, HY, 141, HX, HY, 470); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.9)');
  x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(x0, y0, w, h); x.restore();
}
function makeWall(LV) {
  const [c, x] = mk(WWd, WHd); x.translate(-WX0, -WY0);
  x.drawImage(T.bricks, WALL_OX, WALL_OY);
  const lg = x.createRadialGradient(300, 300, 50, 400, 600, 1300); lg.addColorStop(0, 'rgba(120,150,200,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = lg; x.fillRect(WX0, WY0, WWd, WHd);
  // plinth + ground (as in "found")
  const GR = 1440; let g = x.createLinearGradient(0, GR - 92, 0, GR); g.addColorStop(0, '#3a352e'); g.addColorStop(.25, '#2b2722'); g.addColorStop(1, '#16130f');
  x.fillStyle = g; x.fillRect(WX0, GR - 92, WWd, 92); x.fillStyle = 'rgba(210,220,235,.10)'; x.fillRect(WX0, GR - 92, WWd, 4);
  g = x.createLinearGradient(0, GR, 0, GR + 300); g.addColorStop(0, '#1d1a15'); g.addColorStop(1, '#050504'); x.fillStyle = g; x.fillRect(WX0, GR, WWd, WY0 + WHd - GR);
  for (const L0 of LV) {
    if (L0.cover || L0.late) continue;
    if (L0.x < WX0 - 60 || L0.x > WX0 + WWd + 60 || L0.y < WY0 - 60 || L0.y > WY0 + WHd + 60) continue;
    leafImg(x, L0, L0.x, L0.y, L0.rot, L0.s / 64);
  }
  x.fillStyle = 'rgba(2,4,3,.34)'; x.fillRect(WX0, WY0, WWd, WHd);
  bakeFalloff(x, WX0, WY0, WWd, WHd);
  return c;
}
// ivy regrowth around the hatch (time-lapse). Each leaf pops in over a short window, creeping inward;
// fully grown leaves come from pre-baked stage caches so only the narrow growing band is drawn live.
const LC = { x0: HX - 430, y0: HY - 430, w: 860, h: 860 }, NST = 16;
const growK = (L0, g) => clamp((g - (1 - L0.dist / 340) * .85) / .15);
function leafDark(x, L0, px, py, rot, sc) {
  const S0 = V.dleaf[Math.min(5, Math.round(FALL(L0.x, L0.y) / .9 * 5))][L0.v];
  x.save(); x.translate(px, py); x.rotate(rot); x.scale(sc, sc); x.drawImage(S0, -S0.width / 2, -S0.height / 2 - 10); x.restore();
}
function makeStages() {
  const out = [null];
  for (let i = 1; i <= NST; i++) {
    const g = i / NST, [c, x] = mk(LC.w, LC.h); x.translate(-LC.x0, -LC.y0);
    for (const L0 of V.live) if (growK(L0, g) >= 1) leafDark(x, L0, L0.x, L0.y, L0.rot, L0.s / 64);
    out.push(c);
  }
  return out;
}
function makeRays(spread, len, color, a, n, seed) {
  const k = .5, w = Math.ceil(2 * len * Math.sin(spread / 2 + .14) * k) + 4, h = Math.ceil(len * k);
  const [c, x] = mk(w, h); x.globalCompositeOperation = 'lighter'; x.scale(k, k); const ox = w / k / 2;
  for (let i = 0; i < n; i++) {
    const q = i / (n - 1) - .5, aa = Math.PI / 2 + q * spread, ww = spread / n * (.6 + .5 * hash(i * 13 + seed)), al = a * (.3 + .7 * hash(i * 7 + seed));
    const g = x.createLinearGradient(ox, 0, ox + Math.cos(aa) * len, Math.sin(aa) * len); g.addColorStop(0, rgba(color, al)); g.addColorStop(1, rgba(color, 0)); x.fillStyle = g;
    x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox + Math.cos(aa - ww) * len, Math.sin(aa - ww) * len); x.lineTo(ox + Math.cos(aa + ww) * len, Math.sin(aa + ww) * len); x.closePath(); x.fill();
  }
  return { c, w: w / k, h: h / k };
}
function makeSoft() { const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; x.fillRect(52, 52, 152, 152); x.filter = 'none'; return c; }
function softRect(ctx, x, y, w, h, a) { const k = 52, sx = w / 152, sy = h / 152; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(V.soft, x - k * sx, y - k * sy, 256 * sx, 256 * sy); ctx.restore(); }
function makeFGLeaf(v) { // big out-of-focus foreground leaf
  const S0 = T.leaf[v], k = 3.2, [c, x] = mk(Math.ceil(S0.width * k) + 60, Math.ceil(S0.height * k) + 60);
  x.filter = 'blur(10px) brightness(.55)'; x.drawImage(S0, 30, 30, S0.width * k, S0.height * k); x.filter = 'none'; return c;
}
// inspection grid: for each cell the spot-path parameter at which the light first reaches it
const GC = 6, GR_ = 7;
function spotPath(u) { return [-215 * Math.cos(u * Math.PI * 3), lerp(-268, 268, u)]; }
function initGrid() {
  const first = [];
  for (let j = 0; j < GR_; j++) for (let i = 0; i < GC; i++) {
    const cx = -300 + (i + .5) * 100, cy = -350 + (j + .5) * 100; let f = 1.05;
    for (let k = 0; k <= 400; k++) { const u = k / 400, [sx, sy] = spotPath(u); if (Math.hypot(sx - cx, sy - cy) < 112) { f = u; break; } }
    first.push(f);
  }
  return first;
}
function initV() {
  const LV = genLeaves();
  const front = makeFront();
  V = { front, lit: makeLit(front), studio: makeStudio(), wall: makeWall(LV), soft: makeSoft(), grid: initGrid(),
    live: LV.filter(L0 => L0.late && !L0.cover), fgl: [makeFGLeaf(4), makeFGLeaf(2), makeFGLeaf(5)],
  };
  V.dleaf = [0, 1, 2, 3, 4, 5].map(lv => T.leaf.map(S0 => { const [c, x] = mk(S0.width, S0.height); x.filter = `brightness(${(.66 * (1 - .9 * lv / 5)).toFixed(3)})`; x.drawImage(S0, 0, 0); x.filter = 'none'; return c; }));
  V.stages = makeStages();
}

// ---------- pieces ----------
function easel(ctx) {
  ctx.save(); ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [[PC.x, 470, PC.x, FLOOR + 30, 22], [PC.x - 6, 600, PC.x - 220, FLOOR + 40, 18], [PC.x + 6, 600, PC.x + 220, FLOOR + 40, 18]]) {
    ctx.strokeStyle = '#0a0806'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,.14)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + w * .4, y0); ctx.lineTo(x1 + w * .4, y1); ctx.stroke();
  }
  ctx.fillStyle = '#0a0806'; ctx.fillRect(PC.x - 60, 480, 120, 18);
  ctx.restore();
}
function ledge(ctx) { const ly = PC.y + IH * PS / 2 - 6; const g = ctx.createLinearGradient(0, ly, 0, ly + 26); g.addColorStop(0, '#2c2016'); g.addColorStop(1, '#0b0805'); ctx.fillStyle = g; ctx.fillRect(PC.x - 230, ly, 460, 26); ctx.fillStyle = 'rgba(255,210,160,.18)'; ctx.fillRect(PC.x - 230, ly, 460, 2); }
// the conservator; returns penlight tip + spot (world) for the beam pass
function conservator(ctx, t, s) {
  const u = CON.h / 8, shW = .95 * u, root = [shW * .9, -6.7 * u + .1 * u];
  const walking = s.walk > 0;
  const x = CON.x - 470 * s.walk, flip = walking;
  const lean = s.lean;
  const toLocal = (X, Y) => { const lx0 = (X - x) * (flip ? -1 : 1), ly0 = Y - CON.y, c = Math.cos(-lean), sn = Math.sin(-lean); return [lx0 * c - ly0 * sn, lx0 * sn + ly0 * c]; };
  let armR = null;
  if (!walking) {
    const rest = [root[0] + 40, root[1] + 310];
    const q = toLocal(s.hand[0], s.hand[1]);
    armR = ik(root, [lerp(rest[0], q[0], s.armW), lerp(rest[1], q[1], s.armW)], 1.45 * u, 1.35 * u);
  }
  const o = { female: true, hair: 'bun', coat: true, coatLen: 2.5, glasses: true, face: 1, flip, lean, headTurn: s.headTurn, armR: armR || undefined, armL: walking ? undefined : [.08 + .02 * Math.sin(t * 1.5), -.25], shadow: false };
  if (walking) { o.walk = s.phase; o.stride = .42; }
  F.figure(ctx, x + 6, CON.y - 3, CON.h, Object.assign({}, o, { fill: rgba('#ffc98a', .5) }));
  const fi = F.figure(ctx, x, CON.y, CON.h, o);
  return { fi, x, flip };
}

window.KL.scenes.condition = function (ctx, t, d, info) {
  if (!V) initV();
  const tS = at(info, '상태는', .0), tC = at(info, '비교적', .136), tG = at(info, '양호', .235), tP = at(info, '검찰은', .405), tN = at(info, '내내', .543),
    tWl = at(info, '벽', .606), tIn = at(info, '속에', .647), tWas = at(info, '있었는지', .693), tK = at(info, '모른다고', .803), tH = at(info, '했다', .905);
  const tB0 = tP - .1, tB1 = tP + .72;                          // dolly-back into the wall
  const m = E.inOutC(P(t, tB0, tB1));

  // ---------- camera A (studio) ----------
  const keysA = [[-.5, 540, 994, .945], [0, 540, 990, .95], [tG, 540, 976, 1.0], [tP, 540, 968, 1.035], [tP + 1, 540, 966, 1.045]];
  const [cx, cy, z] = camAt(keysA, t);
  const edgeEnv = P(t, 0, .6);
  const dr = drift(t, .5 * edgeEnv + .1, 21);
  const aPX = W / 2 + (PC.x - cx - dr.x) * z, aPY = H / 2 + (PC.y - cy - dr.y) * z, aS = PS * z;
  // ---------- camera B (wall) ----------
  const zEnd = 1.64 * (1 + .05 * P(t, tB1, d + .3, E.inOutQ));          // settled wall zoom (slow push after the dolly)
  const zw = Math.exp(lerp(Math.log(9), Math.log(1.64), m)) * (zEnd / 1.64);
  const drB = drift(t + 7, .45, 33);
  const bX = W / 2 + drB.x, bY = HSY + drB.y;                   // screen position of the hatch centre
  const pX = lerp(aPX, bX, m), pY = lerp(aPY, bY + 4 * zEnd, m), pS = Math.exp(lerp(Math.log(aS), Math.log(CS * zEnd), m));
  const kA = pS / aS;                                           // studio rides with the canvas as it recedes

  // ---------- part A: studio ----------
  const spotU = P(t, tS + .04, tG - .04, E.inOutQ);
  const beamA = P(t, tS - .04, tS + .1) * (1 - P(t, tG + .02, tG + .2));
  const [su, sv] = spotPath(spotU);
  const spotW = [PC.x + su * PS, PC.y + sv * PS];
  const gridA = P(t, tS - .02, tS + .25) * (1 - P(t, tG + .45, tG + .85));
  if (m < .995) {
    ctx.save();
    ctx.translate(pX, pY); ctx.scale(kA, kA); ctx.translate(-aPX, -aPY);
    // backdrop (parallax .6 relative to the camera)
    const f = .6, zf = 1 + (z - 1) * f;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zf, zf); ctx.translate(-(540 + (cx - 540) * f) - dr.x * f, -(960 + (cy - 960) * f) - dr.y * f);
    ctx.drawImage(V.studio, BX0, BY0);
    ctx.restore();
    // world layer
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx - dr.x, -cy - dr.y);
    glow(ctx, 760, 560, 300, '#ffd9a0', .04 + .03 * fbm(t * 1.4, 7));
    easel(ctx);
    { const g = ctx.createRadialGradient(PC.x, FLOOR + 30, 10, PC.x, FLOOR + 30, 400); g.addColorStop(0, 'rgba(255,190,120,.14)'); g.addColorStop(1, 'rgba(255,190,120,0)'); ctx.save(); ctx.translate(PC.x, FLOOR + 30); ctx.scale(1, .16); ctx.translate(-PC.x, -FLOOR - 30); ctx.fillStyle = g; ctx.fillRect(PC.x - 400, FLOOR - 370, 800, 800); ctx.restore(); }
    softRect(ctx, PC.x - IW * PS / 2 + 26, PC.y - IH * PS / 2 + 34, IW * PS, IH * PS, .7 * (1 - m));
    if (m <= 0) {
      ctx.drawImage(V.front, PC.x - IW * PS / 2, PC.y - IH * PS / 2, IW * PS, IH * PS);
      // raking light: lit copy of the canvas inside the spot (two-step soft edge) + glow
      if (beamA > 0) {
        for (const [rr, a] of [[118, .35], [82, .55]]) {
          ctx.save(); ctx.beginPath(); ctx.ellipse(spotW[0], spotW[1], rr * PS, rr * PS * .9, 0, 0, 7); ctx.clip(); ctx.globalAlpha *= a * beamA;
          ctx.drawImage(V.lit, PC.x - IW * PS / 2, PC.y - IH * PS / 2, IW * PS, IH * PS); ctx.restore();
        }
      }
      // inspection grid
      if (gridA > 0) {
        const pulse0 = tG + .02;
        ctx.save(); ctx.translate(PC.x, PC.y); ctx.scale(PS, PS); ctx.globalAlpha *= gridA;
        for (let j = 0; j < GR_; j++) for (let i = 0; i < GC; i++) {
          const k = j * GC + i, cxx = -300 + i * 100, cyy = -350 + j * 100;
          const lit = clamp((spotU - V.grid[k]) / .05) * (t > tS ? 1 : 0);
          const dc = Math.hypot(cxx + 50, cyy + 50) / 460, q = tri(t, pulse0 + dc * .3, pulse0 + dc * .3 + .4);
          const fill = .06 * lit + .3 * q;
          if (fill > .005) { ctx.fillStyle = rgba(GREEN, fill); ctx.fillRect(cxx + 3, cyy + 3, 94, 94); }
          if (lit > 0) { ctx.strokeStyle = rgba(GREEN, .65 * lit + .3 * q); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cxx + 8, cyy + 22); ctx.lineTo(cxx + 8, cyy + 8); ctx.lineTo(cxx + 22, cyy + 8); ctx.moveTo(cxx + 92, cyy + 78); ctx.lineTo(cxx + 92, cyy + 92); ctx.lineTo(cxx + 78, cyy + 92); ctx.stroke(); }
        }
        ctx.strokeStyle = 'rgba(190,255,220,.22)'; ctx.lineWidth = 1.6;
        for (let i = 0; i <= GC; i++) { ctx.beginPath(); ctx.moveTo(-300 + i * 100, -350); ctx.lineTo(-300 + i * 100, 350); ctx.stroke(); }
        for (let j = 0; j <= GR_; j++) { ctx.beginPath(); ctx.moveTo(-300, -350 + j * 100); ctx.lineTo(300, -350 + j * 100); ctx.stroke(); }
        ctx.restore();
      }
    }
    ledge(ctx);
    // conservator
    const handT = [330 + (spotW[0] - PC.x) * .2, 905 + (spotW[1] - PC.y) * .3];
    const armW = P(t, -.3, tS - .02, E.inOutQ) * (1 - P(t, tG + .15, tG + .55, E.inOutQ)) * .85 + .15 * (1 - P(t, tG + .15, tG + .55, E.inOutQ));
    const walk = P(t, tG + .55, tB0 + .55, E.inQ);
    const nod = .05 * tri(t, tG - .02, tG + .3) - .03 * tri(t, tG + .25, tG + .5);
    const cs = conservator(ctx, t, { hand: handT, armW: Math.max(armW, .15), walk, phase: (t - tG - .55) * 9.5, lean: walking(walk) ? 0 : .05 * armW + nod + .006 * Math.sin(t * 1.4), headTurn: walk > 0 ? 0 : .5 * (spotW[0] - PC.x) / 220 });
    // penlight + beam
    if (walk <= 0 && cs.fi) {
      const hand = [cs.x + cs.fi.hands[1][0], CON.y + cs.fi.hands[1][1]];
      // hands come back in the figure's local frame (lean-rotated) — rotate them into the world
      const lean = .05 * armW + nod + .006 * Math.sin(t * 1.4), hl = cs.fi.hands[1], c = Math.cos(lean), s = Math.sin(lean);
      hand[0] = cs.x + hl[0] * c - hl[1] * s; hand[1] = CON.y + hl[0] * s + hl[1] * c;
      const dx = spotW[0] - hand[0], dy = spotW[1] - hand[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
      const tip = [hand[0] + ux * 42, hand[1] + uy * 42];
      ctx.lineCap = 'round'; ctx.strokeStyle = '#0b0c0e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(hand[0] - ux * 8, hand[1] - uy * 8); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,.35)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hand[0] - ux * 6 - uy * 4, hand[1] - uy * 6 + ux * 4); ctx.lineTo(tip[0] - uy * 4, tip[1] + ux * 4); ctx.stroke();
      if (beamA > 0) {
        const rs = 100 * PS;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(tip[0], tip[1], spotW[0], spotW[1]); g.addColorStop(0, `rgba(255,244,215,${.42 * beamA})`); g.addColorStop(1, `rgba(255,236,200,${.06 * beamA})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tip[0] - uy * 5, tip[1] + ux * 5); ctx.lineTo(spotW[0] - uy * rs, spotW[1] + ux * rs); ctx.lineTo(spotW[0] + uy * rs, spotW[1] - ux * rs); ctx.lineTo(tip[0] + uy * 5, tip[1] - ux * 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        glow(ctx, tip[0], tip[1], 40, '#fff1d6', .9 * beamA);
        glow(ctx, spotW[0], spotW[1], 150 * PS, '#ffe9c4', .35 * beamA);
      }
    }
    motes(ctx, t, { n: 40, color: '#ffe0b0', a: .3 * (1 - m), seed: 61, area: [PC.x - 380, 300, 800, 950], size: 2.6, speed: 12 });
    ctx.restore();
    ctx.restore();
  }

  // ---------- part B: the wall closes in around the canvas ----------
  if (m > 0) {
    const open = [bX - HS / 2 * zw, bY - HS / 2 * zw, HS * zw, HS * zw];
    const wallT = () => { ctx.translate(bX, bY); ctx.scale(zw, zw); ctx.translate(-HX, -HY); };
    // cavity interior fading in over the studio
    const cavA = P(m, .25, .75);
    if (cavA > 0) {
      ctx.save(); wallT(); ctx.globalAlpha *= cavA;
      ctx.fillStyle = '#030303'; ctx.fillRect(HL, HT, HS, HS);
      poly(ctx, [[HL, HT], [HL + HS, HT], [HL + HS - HD, HT + HD], [HL + HD, HT + HD]], '#1d1814');
      poly(ctx, [[HL, HT], [HL + HD, HT + HD], [HL + HD, HT + HS - HD], [HL, HT + HS]], '#120e0b');
      poly(ctx, [[HL + HS, HT], [HL + HS, HT + HS], [HL + HS - HD, HT + HS - HD], [HL + HS - HD, HT + HD]], '#0c0a08');
      poly(ctx, [[HL, HT + HS], [HL + HD, HT + HS - HD], [HL + HS - HD, HT + HS - HD], [HL + HS, HT + HS]], '#241d18');
      ctx.fillStyle = '#060505'; ctx.fillRect(HL + HD, HT + HD, HS - 2 * HD, HS - 2 * HD);
      ctx.restore();
    }
  }
  // the canvas (shared by both parts once the dolly starts)
  const pres = (() => { // presence in the cavity: solid → flicker → ghost
    if (t < tWas - .04) return 1;
    if (t < tK) { const f = Math.floor(t * 15); return hash(f * 7 + 3) > .5 ? (hash(f + 11) > .3 ? 1 : .55) : .06; }
    return .3 + .14 * Math.sin((t - tK) * 4.2);
  })();
  if (m > 0) {
    const glitch = t >= tWas - .04 && t < tK ? (hash(Math.floor(t * 30)) - .5) * 26 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(bX - HS / 2 * zw, bY - HS / 2 * zw, HS * zw, HS * zw); if (m > .02) ctx.clip();
    ctx.save(); ctx.translate(pX, pY); ctx.scale(pS, pS);
    ctx.globalAlpha *= pres;
    ctx.drawImage(V.front, -IW / 2 + glitch / pS, -IH / 2, IW, IH);
    if (glitch) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .35; ctx.drawImage(V.front, 0, 120, IW, 90, -IW / 2 - glitch * 1.6 / pS, -IH / 2 + 120, IW, 90); ctx.restore(); }
    // the black bag around the lower part
    const bagA = P(m, .45, .9);
    if (bagA > 0) { ctx.save(); ctx.globalAlpha *= bagA; drawBag(ctx, 0, 345, 800, 380, .15, t); ctx.restore(); }
    // cavity shade: top catches the daylight, bottom falls into the dark
    const sh = P(m, .3, .9);
    if (sh > 0) { const g = ctx.createLinearGradient(0, -IH / 2, 0, IH / 2); g.addColorStop(0, `rgba(0,0,0,${.1 * sh})`); g.addColorStop(1, `rgba(0,0,0,${.6 * sh})`); ctx.fillStyle = g; ctx.fillRect(-IW / 2 - 100, -IH / 2, IW + 200, IH + 120); }
    ctx.restore();
    // dashed outline of where it is / was
    const ol = P(t, tWas - .05, tWas + .2);
    if (ol > 0) { ctx.save(); ctx.globalAlpha *= ol * .85; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 50; ctx.strokeStyle = '#e9edf3'; ctx.lineWidth = 3; ctx.strokeRect(pX - IW / 2 * pS, pY - IH / 2 * pS, IW * pS, IH * pS); ctx.restore(); }
    // a sliver of cold daylight into the cavity
    glow(ctx, pX - 40 * pS, pY - 300 * pS, 200 * pS, '#bcd2f0', .18 * m);
    ctx.restore();
  }
  if (m > 0) {
    // wall plane with the opening (even-odd hole)
    ctx.save(); ctx.translate(bX, bY); ctx.scale(zw, zw); ctx.translate(-HX, -HY);
    ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); ctx.rect(HL, HT, HS, HS); ctx.clip('evenodd');
    ctx.drawImage(V.wall, WX0, WY0);
    // time-lapse: light passing over the wall while the years run
    const tl = P(t, tN - .05, tWas + .05);
    if (tl > 0 && tl < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) { const q = clamp(tl * 2 - k * .8); if (q <= 0 || q >= 1) continue; const gx = lerp(-300, 1400, q); const g = ctx.createLinearGradient(gx - 260, 0, gx + 260, 0); g.addColorStop(0, 'rgba(200,215,240,0)'); g.addColorStop(.5, `rgba(200,215,240,${.10 * Math.sin(q * Math.PI)})`); g.addColorStop(1, 'rgba(200,215,240,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 260, WY0, 520, WHd); }
      ctx.restore();
    }
    // ivy growing back around the hatch (time-lapse): baked stage + the band currently popping in
    const grow = P(t, tN - .1, tWas + .1, E.inOutQ), si = Math.min(NST, Math.floor(grow * NST + 1e-6));
    if (si > 0) ctx.drawImage(V.stages[si], LC.x0, LC.y0);
    if (grow > 0) for (const L0 of V.live) {
      const k = growK(L0, grow); if (k <= 0 || (si > 0 && growK(L0, si / NST) >= 1)) continue;
      const e = E.outBack(k, 2.2), sw = (1 - k) * .5;
      leafDark(ctx, L0, L0.x, L0.y, L0.rot + sw * (L0.fallDir), L0.s / 64 * e);
    }
    ctx.restore();
    // flange + the open door (as found)
    ctx.strokeStyle = '#3c4044'; ctx.lineWidth = 14; ctx.strokeRect(HL - 7, HT - 7, HS + 14, HS + 14);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.strokeRect(HL - 13, HT - 13, HS + 26, HS + 26);
    { const a = 1.48, w = HS * Math.cos(a), pe = Math.sin(a) * .16, q = (uu, vv) => [HL + uu * w, HT + vv * HS + (vv - .5) * 2 * HS * pe * uu];
      const sg = ctx.createLinearGradient(HL - 110, 0, HL, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = sg; ctx.fillRect(HL - 110, HT + 10, 110, HS);
      const g = ctx.createLinearGradient(HL, HT, HL + w, HT + HS); g.addColorStop(0, '#5a5d61'); g.addColorStop(1, '#2f3236');
      ctx.fillStyle = g; ctx.beginPath(); for (const [i, p] of [q(0, 0), q(1, 0), q(1, 1), q(0, 1)].entries()) i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2e3134'; ctx.fillRect(HL - 12, HT + 30, 18, 46); ctx.fillRect(HL - 12, HT + HS - 76, 18, 46);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); const p0 = q(1, 0), p1 = q(1, 1); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
    // dust in the cold light
    motes(ctx, t, { n: 30, color: '#dfe6f2', a: .35 * m, seed: 9, area: [HL - 160, HT - 220, HS + 320, HS + 420], size: 2.4, speed: 16 });
    ctx.restore();
    // big out-of-focus leaves flying past during the dolly (parallax depth)
    const fl = 1 - m;
    if (fl > 0.01) {
      const spots = [[-.62, -.35, 0, .9], [.7, .1, 1, -.6], [-.5, .55, 2, .3]];
      spots.forEach(([ax, ay, v, r]) => {
        const S0 = V.fgl[v], sc = 1 + 2.5 * fl, ox = W / 2 + ax * W * (1 + 2.2 * fl), oy = H / 2 + ay * H * (1 + 2.2 * fl);
        ctx.save(); ctx.globalAlpha = clamp(fl * 3) * clamp(m * 6); ctx.translate(ox, oy); ctx.rotate(r + fl); ctx.scale(sc, sc); ctx.drawImage(S0, -S0.width / 2, -S0.height / 2); ctx.restore();
      });
    }
  }

  if (m > 0) { const g = ctx.createLinearGradient(0, 1060, 0, 1560); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.35, `rgba(0,0,0,${.6 * m})`); g.addColorStop(1, `rgba(0,0,0,${.75 * m})`); ctx.fillStyle = g; ctx.fillRect(0, 1060, W, 860); }
  // ---------- HUD ----------
  // condition report (part A)
  const rIn = P(t, tC - .1, tC + .22, E.outBack), rOut = P(t, tB0 - .05, tB0 + .25, E.inQ);
  if (rIn > 0 && rOut < 1) {
    const ck = P(t, tG - .02, tG + .22);
    const bump = 1 + .04 * tri(t, tG, tG + .3);
    ctx.save(); ctx.translate(540, 1158 + (1 - rIn) * 240 + rOut * 120); ctx.rotate(-.012 + (1 - rIn) * .06); ctx.scale(bump, bump); ctx.globalAlpha = clamp(rIn * 2) * (1 - rOut);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fillStyle = '#ebe4d2'; ctx.fillRect(-290, -66, 580, 132); ctx.shadowColor = 'transparent';
    const pat = ctx.createPattern(L.TEX.paper, 'repeat'); ctx.globalAlpha *= .5; ctx.fillStyle = pat; ctx.fillRect(-290, -66, 580, 132); ctx.globalAlpha = clamp(rIn * 2) * (1 - rOut);
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-52, -78, 104, 22); ctx.fillStyle = '#c9ced3'; ctx.fillRect(-48, -76, 96, 6);   // clip
    text(ctx, '보존 상태', -262, -34, { size: 26, weight: 800, color: '#55504a', align: 'left' });
    L.hline(ctx, -262, -14, 524, 'rgba(60,50,40,.25)', 2);
    // highlighter swipe behind the verdict once ticked
    const hl = P(t, tG + .1, tG + .38, E.outC);
    if (hl > 0) { ctx.fillStyle = 'rgba(110,220,150,.35)'; ctx.fillRect(-170, 8, 330 * hl, 44); }
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 4; ctx.strokeRect(-246, 10, 42, 42);
    text(ctx, '비교적 양호', -180, 33, { size: 50, family: FONT.disp, weight: 400, color: ck > .3 ? '#1f7a46' : '#2c2a27', align: 'left' });
    if (ck > 0) {
      ctx.strokeStyle = '#1f9a52'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      const q1 = clamp(ck * 2), q2 = clamp(ck * 2 - 1); ctx.moveTo(-240, 30); ctx.lineTo(-240 + 14 * q1, 30 + 14 * q1); if (q2 > 0) ctx.lineTo(-226 + 34 * q2, 44 - 50 * q2); ctx.stroke();
    }
    ctx.restore();
    if (ck > 0 && ck < 1) glow(ctx, 320, 1190, 140, GREEN, .35 * (1 - ck));
  }

  // quote card (approved label) — types in on 검찰은
  const qIn = P(t, tP - .03, tP + .16, E.outBack);
  if (qIn > 0) {
    const segs = [{ s: '검찰', c: '#ff6b70' }, { s: ": '내내 거기 있었는지 지금은 ", c: '#eef1f5' }, { s: '알 수 없다', c: t > tK ? '#ffd400' : '#eef1f5' }, { s: "'", c: '#eef1f5' }];
    const full = segs.map(s => s.s).join(''), n = Array.from(full).length;
    const shown = Math.floor(n * P(t, tP + .04, tN + .2) + .0001);
    let size = 34; const tw0 = measure(ctx, full, size, FONT.sub, 800); if (tw0 > 900) size = Math.floor(size * 900 / tw0);
    const tw = measure(ctx, full, size, FONT.sub, 800), Y = 498;
    ctx.save(); ctx.translate(540, Y); ctx.scale(lerp(.9, 1, clamp(qIn)), lerp(.9, 1, clamp(qIn))); ctx.translate(-540, -Y); ctx.globalAlpha = clamp(qIn * 2);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(8,10,14,.88)'; roundRect(ctx, 540 - tw / 2 - 30, Y - 34, tw + 60, 68, 12); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = K.red; ctx.fillRect(540 - tw / 2 - 30, Y - 34, 7, 68);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; roundRect(ctx, 540 - tw / 2 - 30, Y - 34, tw + 60, 68, 12); ctx.stroke();
    let x = 540 - tw / 2, used = 0, ulX0 = 0, ulX1 = 0;
    for (const sg of segs) {
      const cs = Array.from(sg.s), vis = cs.slice(0, Math.max(0, Math.min(cs.length, shown - used))).join(''); used += cs.length;
      const wFull = measure(ctx, sg.s, size, FONT.sub, 800);
      if (sg.s === '알 수 없다') { ulX0 = x; ulX1 = x + wFull; }
      if (vis) text(ctx, vis, x, Y + 2, { size, weight: 800, color: sg.c, align: 'left' });
      x += wFull;
    }
    if (shown < n && shown > 0) { const cxw = measure(ctx, Array.from(full).slice(0, shown).join(''), size, FONT.sub, 800); if (Math.floor(t * 6) % 2 === 0) { ctx.fillStyle = '#eef1f5'; ctx.fillRect(540 - tw / 2 + cxw + 3, Y - size * .45, 3, size * .9); } }
    const ul = P(t, tK + .02, tK + .3, E.outC);
    if (ul > 0) { ctx.fillStyle = K.red; ctx.fillRect(ulX0, Y + size * .62, (ulX1 - ulX0) * ul, 5); }
    ctx.restore();
  }

  // timeline 1997.2 → 2019.12
  const tlA = P(t, tN - .35, tN - .1);
  if (tlA > 0) {
    const LY = 1158, X0 = 190, X1 = 890;
    const bandA = tlA * .7; const bg = ctx.createLinearGradient(0, LY - 130, 0, LY + 110); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(.35, `rgba(0,0,0,${bandA})`); bg.addColorStop(1, `rgba(0,0,0,${bandA})`); ctx.fillStyle = bg; ctx.fillRect(0, LY - 130, W, 240);
    const hp = P(t, tN, tWas - .02, E.inOutQ), hx = lerp(X0, X1, hp);
    const dash = P(t, tWas + .02, tWas + .3);
    ctx.save(); ctx.globalAlpha = tlA;
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X0, LY); ctx.lineTo(X1, LY); ctx.stroke();
    if (hp > 0) {
      ctx.save(); ctx.globalAlpha *= 1 - dash; ctx.strokeStyle = K.goldHi; ctx.lineWidth = 6; ctx.shadowColor = K.gold; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(X0, LY); ctx.lineTo(hx, LY); ctx.stroke(); ctx.restore();
      if (dash > 0) { ctx.save(); ctx.globalAlpha *= dash; ctx.setLineDash([18, 14]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = K.goldHi; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(X0, LY); ctx.lineTo(X1, LY); ctx.stroke(); ctx.restore(); }
    }
    for (const [x, yr, cap, t0] of [[X0, '1997.2', '도난', tN - .35], [X1, '2019.12', '발견', tN - .25]]) {
      const p = E.outBack(P(t, t0, t0 + .25), 2.4); if (p <= 0) continue;
      const lit = x === X1 ? P(t, tWas - .08, tWas + .1) : 1;
      ctx.save(); ctx.translate(x, LY); ctx.scale(p, p); ctx.fillStyle = K.goldHi; ctx.shadowColor = K.gold; ctx.shadowBlur = 16 * lit; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.restore();
      text(ctx, yr, x, LY + 44, { size: 36, family: FONT.disp, weight: 400, color: K.goldHi, alpha: clamp(p), stroke: '#000', strokeW: 6 });
      text(ctx, cap, x, LY + 80, { size: 24, weight: 800, color: '#b9c0cc', alpha: clamp(p) });
      if (x === X1 && lit > 0 && lit < 1) glow(ctx, x, LY, 90, K.goldHi, .6 * (1 - lit));
    }
    // moving head + year counter
    if (hp > 0 && hp < 1) {
      glow(ctx, hx, LY, 60, K.goldHi, .8); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(hx, LY, 8, 0, 7); ctx.fill();
      text(ctx, String(Math.round(lerp(1997, 2019, hp))), hx, LY - 48, { size: 46, family: FONT.disp, weight: 400, color: '#fff2c9', stroke: '#000', strokeW: 7 });
    }
    // 22년 span bracket
    const br = P(t, tWas - .08, tWas + .22, E.outC);
    if (br > 0) {
      const by = LY - 50, half = (X1 - X0) / 2 * br, cxm = (X0 + X1) / 2;
      ctx.strokeStyle = rgba(K.goldHi, .8); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cxm - half, by + 14); ctx.lineTo(cxm - half, by); ctx.lineTo(cxm - 70, by); ctx.moveTo(cxm + 70, by); ctx.lineTo(cxm + half, by); ctx.lineTo(cxm + half, by + 14); ctx.stroke();
      text(ctx, '22년', cxm, by + 2, { size: 40, family: FONT.disp, weight: 400, color: K.goldHi, alpha: clamp(br * 2), stroke: '#000', strokeW: 6 });
      const qq = P(t, tK, tK + .2, E.outBack);
      if (qq > 0) { ctx.save(); ctx.translate(cxm + 58, by - 4); ctx.scale(qq, qq); text(ctx, '?', 0, 0, { size: 44, family: FONT.disp, weight: 400, color: K.red, stroke: '#000', strokeW: 6 }); ctx.restore(); }
    }
    // small question marks along the uncertain span
    [.28, .5, .72].forEach((f, i) => {
      const p = P(t, tWas + .14 + i * .12, tWas + .34 + i * .12, E.outBack); if (p <= 0) return;
      const x = lerp(X0, X1, f), bob = Math.sin(t * 3 + i * 2) * 4;
      ctx.save(); ctx.translate(x, LY + bob); ctx.scale(p, p); ctx.fillStyle = '#0a0b0e'; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill(); ctx.strokeStyle = K.red; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, '?', 0, 2, { size: 28, family: FONT.disp, weight: 400, color: '#ff6b70' }); ctx.restore();
    });
    ctx.restore();
  }

  // the big question mark over the cavity
  const qm = P(t, tK - .03, tK + .24);
  if (qm > 0) {
    const k = t - tK, s = lerp(2.3, 1, E.outBack(qm, 1.8)), bob = Math.sin(t * 2.2) * 6, rot = .04 * Math.sin(t * 1.7) - .1 * (1 - qm);
    for (let i = 0; i < 2; i++) { const q = clamp((k - i * .08) / .6); if (q > 0 && q < 1) { ctx.save(); ctx.strokeStyle = rgba(K.red, (1 - q) * .7); ctx.lineWidth = 8 * (1 - q) + 1; ctx.beginPath(); ctx.arc(bX, bY, 120 + q * 380, 0, 7); ctx.stroke(); ctx.restore(); } }
    glow(ctx, bX, bY, 300, K.red, .3 * clamp(qm * 2) * (.8 + .2 * Math.sin(t * 3)));
    ctx.save(); ctx.translate(bX + 6, bY + bob); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = clamp(qm * 3) * .95;
    text(ctx, '?', 0, 8, { size: 250, family: FONT.disp, weight: 400, color: K.red, stroke: '#0a0000', strokeW: 16, shadow: { color: 'rgba(255,40,50,.6)', blur: 40, y: 0 } });
    ctx.restore();
  }
  if (t > tK - .05) { const v = P(t, tK - .05, tK + .2) * (1 - .4 * P(t, tK + .4, tK + 1)); tint(ctx, '#3a0005', .25 * v, 'multiply'); }
};

function walking(w) { return w > 0; }
})();
