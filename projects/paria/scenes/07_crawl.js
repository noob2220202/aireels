// crawl: "다친 몸으로 서로를 사슬처럼 붙잡고 나아갔습니다. 그 목소리는 카짐 알리 주니어의 고프로에 남았습니다."
// Continues the "who" cutaway (same pipe geometry and framing). The two lights that just found each other are joined by
// the others dragging themselves closer; on '서로를' threads of light link them, on '사슬처럼' the chain closes with a pulse,
// on '붙잡고' it tightens, then from '나아갔습니다' it inches left in effortful surges (pull, rest, pull) with wakes in the oil.
// The fifth light stays dim and apart on the right (nothing is shown about it). '목소리는' -> faint voice rings; '카짐' -> focus
// on the second light; '고프로에' -> a generic action-camera icon rises from it: black screen, live audio line, label.
// The camera then leans in on the black screen while the dark closes (hand-off to the transcript card).
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, camera, text, roundRect, flash } = L;
const { at, souls, beat, chip } = window.PK;
// local integer hash / value noise (L.hash loses precision above ~1000, which flattens L.noise1/fbm for seeds >= 1)
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
const drift2 = (t, amt, s) => ({ x: fb(t * .35, s) * 16 * amt, y: fb(t * .3, s + 9) * 16 * amt, r: fb(t * .25, s + 4) * .006 * amt });
const shake2 = (t, k, s) => ({ x: k * nz(t * 22, s + 1) * 18, y: k * nz(t * 22, s + 2) * 18, r: k * nz(t * 15, s + 3) * .01 });

// ---- cheaper variant of PK.dark (same oily sheen): composed at quarter resolution and blitted once ----
function sheenTexLite() {
  if (window.PK._sheenLite) return window.PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLite = c; return c;
}
function darkFastC(ctx, t, { k = 1, seed = 1, base = '#010203' } = {}) {
  const [b, x] = L.buf('pkDarkFast', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  if (k > 0) {
    const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
      x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}

// ---- pipe geometry: identical to "who" (side cutaway, oil/water about 20 of 76 cm) ----
const TB = { cy: 820, r: 190, wall: 18 };
TB.top = TB.cy - TB.r; TB.bot = TB.cy + TB.r; TB.fl = TB.bot - .263 * 2 * TB.r;
const LY = TB.fl - 26;
const surf = (x, t) => TB.fl + Math.sin(x * .021 - t * 1.4) * 2.2 + Math.sin(x * .057 + t * 1.1) * 1.4;

// inner back wall of the cutaway: oily, streaked steel, only visible where the lights reach it (cached texture,
// composed at half resolution through the current camera transform, masked by an ellipse of light around the chain)
function wallTex() {
  if (window.PK._crawlWallTex) return window.PK._crawlWallTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  const id = x.createImageData(512, 160);
  for (let j = 0; j < 160; j++) for (let i = 0; i < 512; i++) {
    const u = i / 512, v = j / 160;
    const n = fb(v * 14 + fb(u * 3, 13) * 1.2, 17, 4) * .9 + fb(u * 22 + v * 4, 19) * .35 + (hi(i * 3 + j * 1013) - .5) * .18;
    const val = clamp(.42 + n * 1.3), o = (j * 512 + i) * 4;
    id.data[o] = 205 * val; id.data[o + 1] = 172 * val; id.data[o + 2] = 140 * val; id.data[o + 3] = 255 * Math.pow(val, 1.3);
  }
  x.putImageData(id, 0, 0); window.PK._crawlWallTex = c; return c;
}
function backWall(ctx, x0, x1, top, bot, cx, cy, rx, ry, a) {
  if (a <= 0) return;
  const [b, x] = L.buf('crawlWall', 540, 960); x.clearRect(0, 0, 540, 960);
  const m = ctx.getTransform(); x.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2);
  x.save(); x.beginPath(); x.rect(x0, top, x1 - x0, bot - top); x.clip();
  const tw = 900; for (let xx = Math.floor(x0 / tw) * tw; xx < x1; xx += tw) x.drawImage(wallTex(), xx, top, tw, bot - top);
  x.restore();
  x.globalCompositeOperation = 'destination-in';
  x.translate(cx, cy); x.scale(rx / ry, 1);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, ry); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(-ry, -ry, ry * 2, ry * 2);
  // blit only the lit ellipse's screen bounds
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (const [px, py] of [[cx - rx, cy - ry], [cx + rx, cy - ry], [cx - rx, cy + ry], [cx + rx, cy + ry]]) { const sx = m.a * px + m.c * py + m.e, sy = m.b * px + m.d * py + m.f; bx0 = Math.min(bx0, sx); bx1 = Math.max(bx1, sx); by0 = Math.min(by0, sy); by1 = Math.max(by1, sy); }
  bx0 = Math.max(0, Math.floor(bx0 / 2) * 2); by0 = Math.max(0, Math.floor(by0 / 2) * 2); bx1 = Math.min(W, Math.ceil(bx1)); by1 = Math.min(H, Math.ceil(by1));
  if (bx1 - bx0 < 4 || by1 - by0 < 4) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(b, bx0 / 2, by0 / 2, (bx1 - bx0) / 2, (by1 - by0) / 2, bx0, by0, bx1 - bx0, by1 - by0); ctx.restore();
}
function pipe(ctx, t, x0, x1, k, lights) {
  const { top, bot, fl, wall } = TB;
  ctx.save();
  const g = ctx.createLinearGradient(0, top - wall, 0, top); g.addColorStop(0, rgba('#6d7a83', .08 * k)); g.addColorStop(1, rgba('#20282d', .12 * k));
  ctx.fillStyle = g; ctx.fillRect(x0, top - wall, x1 - x0, wall); ctx.fillRect(x0, bot, x1 - x0, wall);
  ctx.fillStyle = rgba('#a0bec9', .07 * k); ctx.fillRect(x0, top - 1, x1 - x0, 2); ctx.fillRect(x0, bot - 1, x1 - x0, 2);
  // weld seams, barely there
  ctx.fillStyle = rgba('#a0bec9', .035 * k);
  for (let x = Math.floor(x0 / 520) * 520 + 140; x < x1; x += 520) { ctx.fillRect(x, top - wall, 3, wall); ctx.fillRect(x, bot, 3, wall); }
  // warm spill of the lights on the inner top wall (the only thing that shows the steel)
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!(l.a > .02)) continue; const hw = 150 * (l.s || 1);
    const lg = ctx.createLinearGradient(l.x - hw, 0, l.x + hw, 0);
    lg.addColorStop(0, rgba('#ff9a3c', 0)); lg.addColorStop(.5, rgba('#ffb36b', .09 * l.a)); lg.addColorStop(1, rgba('#ff9a3c', 0));
    ctx.fillStyle = lg; ctx.fillRect(l.x - hw, top - wall * .6, hw * 2, wall * .6 + 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // oil and water: dark body, faint cold surface
  ctx.beginPath(); ctx.moveTo(x0, bot);
  for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, surf(x, t));
  ctx.lineTo(x1, bot); ctx.closePath();
  const gf = ctx.createLinearGradient(0, fl, 0, bot); gf.addColorStop(0, rgba('#16323a', .55 * k)); gf.addColorStop(.3, rgba('#0b1c22', .6 * k)); gf.addColorStop(1, rgba('#040809', .7 * k));
  ctx.fillStyle = gf; ctx.fill();
  ctx.strokeStyle = rgba('#8fd3e8', .13 * k); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = x0; x <= x1 + 10; x += 10) { const y = surf(x, t); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.restore();
}
function iris(ctx, k, pulse, cx = 540, cy = 840) {
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// faint voice ring in the air gap (same language as "who", quieter)
function ring(ctx, ex, ey, R, a) {
  const { top, fl, wall } = TB;
  ctx.save(); ctx.beginPath(); ctx.rect(-600, top, W + 1200, fl - top); ctx.clip();
  ctx.lineWidth = 1.2 + 2 * a; ctx.strokeStyle = rgba('#cfe8ff', .5 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke();
  ctx.restore();
  const dy = Math.abs(ey - top); if (R <= dy) return;
  const dx = Math.sqrt(R * R - dy * dy);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const px of [ex - dx, ex + dx]) {
    const hw = 60 + Math.min(90, dx * .2); const lg = ctx.createLinearGradient(px - hw, 0, px + hw, 0);
    lg.addColorStop(0, rgba('#9fb3bd', 0)); lg.addColorStop(.5, rgba('#9fb3bd', .24 * a)); lg.addColorStop(1, rgba('#9fb3bd', 0));
    ctx.fillStyle = lg; ctx.fillRect(px - hw, top - wall, hw * 2, wall);
    ctx.fillStyle = rgba('#e6f6ff', .45 * a); ctx.fillRect(px - 8, top - 1, 16, 2);
  }
  ctx.restore();
}
// generic action camera (no brand, no REC light): lens on the left, dead black screen with a live audio line on the right
function actionCam(ctx, t, x, y, s, a, live) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
  const w = 156, h = 100;
  glow(ctx, 0, 0, 170, '#8fd3e8', .07);
  ctx.fillStyle = '#10171b'; roundRect(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(160,220,245,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#1a2328'; roundRect(ctx, -w / 2 + 16, -h / 2 - 9, 30, 10, 3); ctx.fill();          // shutter button
  ctx.strokeStyle = 'rgba(160,220,245,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  // lens
  const lx = -w / 2 + 40;
  ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.arc(lx, 4, 27, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(160,220,245,.6)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(160,220,245,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx, 4, 17, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(220,245,255,.5)'; ctx.beginPath(); ctx.arc(lx - 8, -5, 4, 0, 7); ctx.fill();
  // screen: black, with the sound still being written across it
  const sx = 4, sy = -h / 2 + 20, sw = w / 2 - 20, sh = h - 34;
  ctx.fillStyle = '#000'; roundRect(ctx, sx, sy, sw, sh, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(160,220,245,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); roundRect(ctx, sx, sy, sw, sh, 6); ctx.clip();
  ctx.fillStyle = 'rgba(160,220,245,.06)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * .55, sy); ctx.lineTo(sx, sy + sh * .7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(143,211,232,.95)'; ctx.lineWidth = 2; ctx.beginPath();
  const n = 44;
  for (let i = 0; i <= n; i++) {
    const u = i / n, xx = sx + 4 + u * (sw - 8);
    const env = Math.pow(Math.sin(u * Math.PI), .7);
    const v = (nz(t * 6 - u * 7, 5) * .7 + nz(t * 17 - u * 23, 8) * .3) * env * (.2 + .8 * live);
    const yy = sy + sh / 2 + v * sh * .38; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  ctx.restore();
  ctx.restore();          // no recording indicator: the recording is only ever shown as a text transcript
}

// ---- motion of the five lights (world x) ----
const START = [683, 746, 915, 985, 1060];
function plan(info) {
  const tS = at(info, '서로를', .12), tG = at(info, '붙잡고', .27), tN = at(info, '나아갔습니다', .34);
  const mv = [[], [], [[.35, .62, -45], [1.12, .58, -40]], [[.6, .62, -42], [1.38, .58, -43]], []];
  mv[0].push([tG - .05, .45, -8]); mv[1].push([tG, .45, -5]); mv[2].push([tG + .05, .45, -3]);
  const pulls = [0, 1.14, 2.27, 3.38, 4.36].map(o => tN + o), dx = [-54, -48, -50, -42, -36];
  for (let i = 0; i < 4; i++) pulls.forEach((p, k) => mv[i].push([p + i * .12, .62, dx[k]]));
  return { mv, pulls, tS, tG, tN };
}
function xAt(pl, i, t) { let x = START[i]; for (const [a, d, dx] of pl.mv[i]) x += dx * E.inOutQ(clamp((t - a) / d)); return x; }
function moving(pl, i, t) { let m = 0; for (const [a, d] of pl.mv[i]) m = Math.max(m, Math.sin(clamp((t - a) / d) * Math.PI)); return m; }

window.PK.scenes.crawl = function (ctx, t, d, info) {
  const pl = plan(info);
  const tC = at(info, '사슬처럼', .2), tV = at(info, '목소리', .55), tK = at(info, '카짐', .63), tP = at(info, '고프로에', .78);
  const bpm = 98;

  // ---- lights ----
  const L5 = [];
  for (let i = 0; i < 5; i++) {
    const m = moving(pl, i, t);
    const x = xAt(pl, i, t), y = LY - 6 * m + nz(t * .8, i + 2) * 2;
    let a;
    if (i < 2) a = .86;
    else if (i < 4) a = lerp(.2, .82, P(t, .25 + (i - 2) * .25, 1.5 + (i - 2) * .2, E.inOutQ));
    else a = .24;                                             // the fifth: dim, apart, unchanged
    if (i < 4) a *= (.9 + .1 * nz(t * 7, i + 9)) * (hi(Math.floor(t * 14) + i * 97) > .95 ? .72 : 1) * (1 + .12 * m);
    L5.push({ x, y, a: clamp(a), s: i < 4 ? lerp(.62, 1, clamp((a - .2) / .6)) : .5, m });
  }
  // focus on the second light on '카짐'; others step back a little
  const focus = P(t, tK - .1, tK + .4, E.inOutQ) * (1 - P(t, d - .2, d + .3));
  for (let i = 0; i < 4; i++) if (i !== 1) L5[i].a *= 1 - .3 * focus;

  // ---- camera ----
  // tracks the chain with a soft lag (smoothed centre of the four), keeps them a little left of centre
  let cc = 0; for (let k = 0; k < 6; k++) { const tt = t - k * .14; let s = 0; for (let i = 0; i < 4; i++) s += xAt(pl, i, tt); cc += s / 4; } cc /= 6;
  const push = P(t, d - 1.25, d + .15, E.inOutQ);
  const camIcon = L5[1].x;
  let camX = lerp(680, cc + 62, P(t, -.2, 1.6, E.inOutQ)); camX = lerp(camX, camIcon, push);
  // close on the air gap (picks up who's eased-back ~1.5 framing, then tightens on the chain)
  const zoom = lerp(1.5, 1.8, P(t, 0, 2.4, E.inOutQ)) + .04 * P(t, 2.4, d - 1.2) + 1.0 * E.inQ(push);
  const dr = drift2(t, 1, 21);
  let sh = 0; for (const p of pl.pulls) sh += .32 * Math.exp(-Math.pow((t - p - .12) / .1, 2));
  sh += .3 * Math.exp(-Math.pow((t - tP + .1) / .09, 2));
  const sk = shake2(t, sh, 21);
  const camY = lerp(TB.cy + lerp(145, 100, P(t, 0, 1.6, E.inOutQ)) / zoom, TB.top + 108 + 260 / zoom, push);

  darkFastC(ctx, t, { k: .3, seed: 8 });
  ctx.save();
  camera(ctx, { x: camX + (dr.x + sk.x) / zoom, y: camY + (dr.y + sk.y) / zoom, zoom, rot: dr.r + sk.r, t });
  const x0 = camX - 760 / zoom - 60, x1 = camX + 760 / zoom + 60;
  pipe(ctx, t, x0, x1, 1, L5.slice(0, 4));
  { const xs = L5.slice(0, 4).map(l => l.x), cxw = (Math.min(...xs) + Math.max(...xs)) / 2, hw = (Math.max(...xs) - Math.min(...xs)) / 2;
    const la = (L5[0].a + L5[1].a + L5[2].a + L5[3].a) / 4;
    backWall(ctx, x0, x1, TB.top, TB.fl + 4, cxw, LY + 10, hw + 240, 250, .45 * la * (.9 + .1 * beat(t, bpm))); }

  // ---- dimension labels (anchored to the frame's left edge, they ride with the camera) ----
  const la = P(t, .15, .55, E.outQ) * (1 - P(t, 3.75, 4.25, E.inQ));
  const lb = P(t, .6, 1.0, E.outQ) * (1 - P(t, 3.8, 4.3, E.inQ));
  const lx = camX + (96 - 540) / zoom;
  if (la > 0) {
    const g = E.outC(la), mid = TB.cy, h = (TB.bot - TB.top) / 2 * g;
    ctx.save(); ctx.globalAlpha = la; ctx.strokeStyle = 'rgba(207,232,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, mid - h); ctx.lineTo(lx, mid + h); ctx.moveTo(lx - 9, mid - h); ctx.lineTo(lx + 9, mid - h); ctx.moveTo(lx - 9, mid + h); ctx.lineTo(lx + 9, mid + h); ctx.stroke();
    ctx.restore();
    text(ctx, '지름 76cm', lx + 20, TB.top + 34, { size: 30, weight: 800, color: '#cfe8ff', align: 'left', alpha: la * .95, stroke: '#000', strokeW: 6 });
  }
  if (lb > 0) {
    const bx = lx + 34, g = E.outC(lb);
    ctx.save(); ctx.globalAlpha = lb; ctx.strokeStyle = 'rgba(143,211,232,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx + 8, TB.fl + 2); ctx.lineTo(bx, TB.fl + 2); ctx.lineTo(bx, TB.fl + 2 + (TB.bot - TB.fl - 4) * g); ctx.lineTo(bx + 8, TB.fl + 2 + (TB.bot - TB.fl - 4) * g); ctx.stroke();
    ctx.restore();
    text(ctx, '기름·물 약 20cm', bx + 18, (TB.fl + TB.bot) / 2 + 2, { size: 28, weight: 800, color: '#8fd3e8', align: 'left', alpha: lb * .95, stroke: '#000', strokeW: 6 });
  }

  // ---- drips from the pipe crown into the oil (something always moves in the dark) ----
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = Math.floor((t + 2) / .95) - 2; k <= Math.floor((t + 2) / .95); k++) {
    const t0 = k * .95 - 2 + hi(k * 7 + 1) * .4, u = t - t0; if (u < 0 || u > 1.9) continue;
    const dx = camX + (hi(k * 13 + 5) * 2 - 1) * 430 / zoom;
    if (u < .5) { const yy = TB.top + 4 + (TB.fl - TB.top - 4) * Math.pow(u / .5, 2); ctx.fillStyle = rgba('#bfe9ff', .3); ctx.beginPath(); ctx.ellipse(dx, yy, 2, 4.5, 0, 0, 7); ctx.fill(); }
    else { const q = (u - .5) / 1.4; ctx.strokeStyle = rgba('#8fd3e8', .2 * (1 - q)); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(dx, TB.fl + 1, 6 + q * 90, 1.5 + q * 5, 0, 0, 7); ctx.stroke(); }
  }
  ctx.restore();

  // ---- voice rings on '목소리는' ----
  for (const [c, src, s] of [[tV, 0, .8], [tV + .42, 1, .7], [tV + .8, 0, .55]]) {
    const age = t - c; if (age < 0 || age > 1.9) continue;
    const R = 14 + 400 * age, a = s * Math.pow(1 - age / 1.9, 1.5) * P(R, 14, 90, E.inQ);
    ring(ctx, L5[src].x, LY, R, a);
  }

  // ---- shared warmth carried over from "who" (fades as the others join) ----
  const warmCarry = 1 - P(t, 0, 1.6, E.inOutQ);
  if (warmCarry > 0) { const mx = (L5[0].x + L5[1].x) / 2; glow(ctx, mx, LY, 300, '#ff9a3c', .16 * warmCarry); glow(ctx, mx, LY, 120, '#ffd27a', .12 * warmCarry); }

  // ---- the chain: threads of light between the four ----
  const tS = pl.tS, cFlash = Math.exp(-Math.pow((t - tC - .35) / .32, 2));
  const bead = P(t, tC, tC + .75, E.inOutQ);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const rv = P(t, tS + j * .17, tS + j * .17 + .45, E.outQ); if (rv <= 0) continue;
    const A = L5[j], B = L5[j + 1], dist = B.x - A.x;
    const taut = clamp((dist - 60) / 26), sag = lerp(15, 2, taut) + 3 * Math.sin(t * 1.3 + j);
    const ax = A.x + 13, ay = A.y + 2, bx = B.x - 13, by = B.y + 2, mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    const ex = lerp(ax, bx, rv), ey = lerp(ay, by, rv);
    const cx = lerp(ax, mx, rv), cy = lerp(ay, my, rv);
    const pull = Math.max(A.m, B.m);
    // tension pulse: on each pull a flare runs back along the chain from the front light
    let tp = 0; for (const p of pl.pulls) tp = Math.max(tp, Math.exp(-Math.pow((t - p - .08 - j * .1) / .13, 2)));
    const al = (.2 + .25 * taut + .25 * pull + .55 * cFlash + .5 * tp) * Math.min(A.a, B.a) * 1.15;
    ctx.strokeStyle = rgba('#ff9a3c', al * .2); ctx.lineWidth = 10 + 6 * tp; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    ctx.strokeStyle = rgba('#ffd9a0', clamp(al * .9)); ctx.lineWidth = 2.4 + 1.2 * tp; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    const cy2 = lerp(ay, my + 4 * Math.sin(t * 2.1 + j * 2) - sag * .35, rv);
    ctx.strokeStyle = rgba('#ffc477', al * .4); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ax, ay - 1); ctx.quadraticCurveTo(cx, cy2, ex, ey - 1); ctx.stroke();
    // the flare itself: a bright bead running from A to B along this link
    for (const p of pl.pulls) {
      const u = (t - p - .02 - j * .1) / .16; if (u < 0 || u > 1 || rv < 1) continue;
      const bxp = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, byp = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
      const ba = Math.sin(u * Math.PI) * Math.min(A.a, B.a);
      glow(ctx, bxp, byp, 34, '#ffd27a', .5 * ba); ctx.fillStyle = rgba('#fff0d7', .85 * ba); ctx.beginPath(); ctx.arc(bxp, byp, 2.6, 0, 7); ctx.fill();
    }
    // bead of light travelling along the chain on '사슬처럼'
    const bq = bead * 3 - j;
    if (bead > 0 && bead < 1 && bq >= 0 && bq <= 1) {
      const u = bq, bxp = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, byp = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
      glow(ctx, bxp, byp, 40, '#ffd27a', .55); ctx.fillStyle = 'rgba(255,240,215,.9)'; ctx.beginPath(); ctx.arc(bxp, byp, 3, 0, 7); ctx.fill();
    }
  }
  ctx.restore();

  // ---- wakes in the oil while they drag themselves forward ----
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const ph = (t * 1.5 + j / 4 + i * .13) % 1, tt = t - ph * .9;
    const am = moving(pl, i, tt), a = am * (1 - ph) * .6 * L5[i].a; if (a < .01) continue;
    const ex = xAt(pl, i, tt) + 10;
    ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(ex, TB.fl + 1, 10 + ph * 60, 2 + ph * 4, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  }
  ctx.restore();

  // ---- the lights ----
  // the fifth, apart
  souls(ctx, t + .55, [{ x: L5[4].x, y: L5[4].y, a: L5[4].a, s: L5[4].s }], { bpm });
  for (let i = 3; i >= 0; i--) {
    const l = L5[i];
    glow(ctx, l.x, l.y, 170, '#ff9a3c', .06 * l.a);
    souls(ctx, t + [0, .29, .47, .71][i], [{ x: l.x, y: l.y, a: l.a, s: l.s * (1 + .08 * l.m) }], { bpm: bpm + 8 * l.m });
  }
  // amber reflections on the oil
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of L5) {
    const len = 58 * l.s; ctx.save(); ctx.translate(l.x, TB.fl + len * .45); ctx.scale(.22, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, len); rg.addColorStop(0, rgba('#ffb347', l.a * .2)); rg.addColorStop(1, rgba('#ffb347', 0));
    ctx.fillStyle = rg; ctx.fillRect(-len, -len, len * 2, len * 2); ctx.restore();
    for (let s = 0; s < 4; s++) { const w = (17 - s * 3.5) * l.s * (.7 + .3 * Math.sin(t * 2.6 + s * 1.9 + l.x)); ctx.fillStyle = rgba('#ffc477', l.a * .1 * (1 - s / 4)); ctx.fillRect(l.x - w + Math.sin(t * 2 + s) * 4, TB.fl + 4 + s * 11 + Math.sin(t * 1.7 + s) * 1.5, w * 2, 1.5); }
  }
  ctx.restore();

  // ---- focus reticle on the second light ('카짐 알리 주니어의') ----
  const K1 = L5[1];
  const rq = P(t, tK, tK + .55, E.outC), ra = P(t, tK - .05, tK + .2) * (1 - P(t, tP + .1, tP + .5));
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = 'rgba(207,232,255,.75)'; ctx.lineWidth = 2;
    const rr = lerp(52, 34, rq); ctx.beginPath(); ctx.arc(K1.x, K1.y, rr, -Math.PI / 2, -Math.PI / 2 + rq * Math.PI * 2); ctx.stroke();
    for (let q = 0; q < 4; q++) { const an = q * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(K1.x + Math.cos(an) * (rr + 5), K1.y + Math.sin(an) * (rr + 5)); ctx.lineTo(K1.x + Math.cos(an) * (rr + 13), K1.y + Math.sin(an) * (rr + 13)); ctx.stroke(); }
    ctx.restore();
  }

  // ---- the action camera rises from his light on '고프로에' ----
  const ce = P(t, tP - .02, tP + .55), cs = E.outBack(ce, 1.4), ca = P(t, tP - .02, tP + .2);
  let iconSX = 540, iconSY = 700;
  if (ca > 0) {
    const iy = lerp(K1.y - 10, TB.top + 108, E.outC(ce)), ix = K1.x;
    // dashed leader to the light
    ctx.save(); ctx.globalAlpha = ca * .7; ctx.strokeStyle = 'rgba(160,220,245,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(ix, iy + 52 * cs); ctx.lineTo(ix, K1.y - 20); ctx.stroke(); ctx.restore();
    const glit = t > tP - .15 && t < tP + .35 && hi(Math.floor(t * 30) * 5 + 2) > .55 ? (hi(Math.floor(t * 30)) - .5) * 14 : 0;
    actionCam(ctx, t, ix + glit, iy, lerp(.25, 1, cs), ca, .6 + .4 * Math.abs(nz(t * 3, 4)));
    const m = ctx.getTransform(); iconSX = m.a * ix + m.c * iy + m.e; iconSY = m.b * ix + m.d * iy + m.f;
  }
  ctx.restore();

  // ---- static burst as the recording is named ----
  const st = P(t, tP - .18, tP - .1) * (1 - P(t, tP + .2, tP + .45));
  if (st > 0) {
    const f = Math.floor(t * 30); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) { const yy = 540 + hi(f * 31 + i) * 520, hh = 1 + hi(f * 17 + i) * 2.5, xx = hi(f * 7 + i) * W * .75; ctx.fillStyle = rgba('#cfe8ff', st * (.04 + .08 * hi(i + f * 3))); ctx.fillRect(xx, yy, 80 + hi(i * 3 + f * 5) * 260, hh); }
    ctx.restore();
    flash(ctx, .05 * st, '#8fd3e8');
  }

  // ---- tunnel vision: breathing, then closing on the black screen ----
  const brth = .5 + .5 * Math.sin(t * Math.PI * 2 * .42);
  const ik = lerp(.52, .62, P(t, 1.5, d - 1.4, E.inOutQ)) + .3 * push;
  iris(ctx, ik, .6 * brth + .4 * beat(t, bpm), lerp(540, iconSX, push), lerp(900, iconSY + 40, push));

  // ---- label (screen space, under the pipe) ----
  const lab = P(t, tP + .25, tP + .6, E.outQ);
  if (lab > 0) chip(ctx, '화면은 꺼졌지만 녹음은 계속됐다', 540, 1150 + 10 * (1 - lab), lab, { size: 32, color: '#cfe8ff', border: 'rgba(143,211,232,.45)' });
};
})();
