// leave (real audio, Boodram recalling): "Kaz was like, 'Chris, don't go and leave me. Don't go and leave me.'"
// Close on the crown of a nearly flooded pipe: a thin sliver of air between the steel and the oil, two lights in it, still joined
// by the last thread of the chain. The front light turns back once ("Kaz was like"), then on "Chris" it starts to pull away in
// slow, effortful drags with rests. On each "don't go and leave me" the rear light sends small voice rings and a bead of light
// along the thread towards him. The thread stretches, trembles and thins strand by strand; it never snaps.
// Camera: slow push-in, then eases back so both stay in frame; the dark is squeezed into a horizontal sliver.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, camera } = L;
const { souls, beat, sourceCard } = window.PK;
// local integer hash / value noise (L.hash loses precision for large arguments)
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
const drift2 = (t, amt, s) => ({ x: fb(t * .35, s) * 16 * amt, y: fb(t * .3, s + 9) * 16 * amt, r: fb(t * .25, s + 4) * .006 * amt });
const shake2 = (t, k, s) => ({ x: k * nz(t * 22, s + 1) * 18, y: k * nz(t * 22, s + 2) * 18, r: k * nz(t * 15, s + 3) * .01 });

// ---- PK.dark look (same oily sheen), composed at quarter resolution and blitted once ----
function sheenTexLite() {
  if (window.PK._sheenLiteLPS) return window.PK._sheenLiteLPS;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLiteLPS = c; return c;
}
function darkLite(ctx, t, k, seed, base = '#010203') {
  const [b, x] = L.buf('pkDarkFast', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}
// ---- the far inner wall seen through the air gap: oily, streaked steel (cached), lit only around the lights ----
function wallTex() {
  if (window.PK._leaveWallTex) return window.PK._leaveWallTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
  const id = x.createImageData(512, 96);
  for (let j = 0; j < 96; j++) for (let i = 0; i < 512; i++) {
    const u = i / 512, v = j / 96;
    const n = fb(v * 11 + fb(u * 2.5, 13) * 1.3, 17, 4) * .9 + fb(u * 26 + v * 3, 19) * .3 + (hi(i * 3 + j * 1013) - .5) * .16;
    const val = clamp(.42 + n * 1.3) * (.75 + .25 * Math.sin(v * Math.PI)), o = (j * 512 + i) * 4;
    id.data[o] = 205 * val; id.data[o + 1] = 170 * val; id.data[o + 2] = 138 * val; id.data[o + 3] = 255 * Math.pow(val, 1.3);
  }
  x.putImageData(id, 0, 0); window.PK._leaveWallTex = c; return c;
}
function backWall(ctx, x0, x1, top, bot, lights) {
  const [b, x] = L.buf('leaveWall', 360, 640); x.clearRect(0, 0, 360, 640);
  const m = ctx.getTransform(); x.setTransform(m.a / 3, m.b / 3, m.c / 3, m.d / 3, m.e / 3, m.f / 3);
  x.save(); x.beginPath(); x.rect(x0, top, x1 - x0, bot - top); x.clip();
  const tw = 760;
  for (let k = Math.floor(x0 / tw); k * tw < x1; k++) { if (k & 1) { x.save(); x.translate((k + 1) * tw, 0); x.scale(-1, 1); x.drawImage(wallTex(), 0, top, tw, bot - top); x.restore(); } else x.drawImage(wallTex(), k * tw, top, tw, bot - top); }
  x.restore();
  // light mask: sum of soft pools around each light
  const [mb, mx] = L.buf('leaveWallMask', 360, 640); mx.clearRect(0, 0, 360, 640);
  mx.setTransform(m.a / 3, m.b / 3, m.c / 3, m.d / 3, m.e / 3, m.f / 3); mx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!(l.a > .02)) continue; const R = 210 * (l.s || 1);
    mx.save(); mx.translate(l.x, l.y); mx.scale(1.35, 1);
    const g = mx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(0,0,0,${.9 * l.a})`); g.addColorStop(.4, `rgba(0,0,0,${.38 * l.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    mx.fillStyle = g; mx.fillRect(-R, -R, R * 2, R * 2); mx.restore();
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mb, 0, 0);
  // blit only the band of rows the gap occupies on screen
  const ya = m.d * top + m.f, yb = m.d * bot + m.f, r0 = clamp(Math.floor((Math.min(ya, yb) - 60) / 3), 0, 639), r1 = clamp(Math.ceil((Math.max(ya, yb) + 60) / 3), r0 + 1, 640);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .34; ctx.drawImage(b, 0, r0, 360, r1 - r0, 0, r0 * 3, W, (r1 - r0) * 3); ctx.restore();
}

// ---- geometry (world units): crown of the pipe, ~15 cm of air above the oil (76 cm pipe ~ 600 units) ----
const G = { crown: 640, wall: 36, gap: 118 };
const surfY = (x, t, rise) => G.crown + G.gap - rise + Math.sin(x * .017 - t * 1.25) * 2.6 + Math.sin(x * .049 + t * .9) * 1.5;
// clip-relative onsets from the real audio: "Chris," / "don't go and leave me" x2 (rings from the rear light), beads on each plea
const RINGS = [[.95, .55], [1.74, .9], [2.06, .55], [2.32, .65], [2.68, .85], [2.96, .55], [3.2, .55]];
const BEADS = [1.74, 2.68];
const ENV = [0,5,7,10,19,19,69,57,68,42,26,40,54,68,48,31,19,16,41,57,49,32,22,10,13,8,13,22,18,83,66,45,47,37,30,26,23,21,19,16,12,17,9,10,15,11,12,11,12,14,10,17,75,99,84,83,63,58,63,65,78,81,89,81,79,68,77,76,74,63,36,19,16,18,43,38,44,42,40,29,63,73,72,73,83,85,87,75,67,77,64,66,49,34,25,23,32,29,43,31,34,23,25,21,24,15,20,18,9,17,8,6];
const env = tc => { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= ENV.length - 1) return 0; return lerp(ENV[i], ENV[i + 1], f - i) / 99; };

// front light (his): one turn back towards the voice, then slow drags with rests
function pulls(v0) { return [[v0 + .42, .5, 14], [v0 + .86, .52, -62], [v0 + 1.56, .52, -86], [v0 + 2.26, .52, -96], [v0 + 2.96, .52, -102], [v0 + 3.62, .52, -112], [v0 + 4.3, .52, -90]]; }
function bX(pl, t) { let x = 500; for (const [a, d, dx] of pl) x += dx * E.inOutQ(clamp((t - a) / d)); return x; }
function bMov(pl, t) { let m = 0; for (const [a, d, dx] of pl) if (dx < 0) m = Math.max(m, Math.sin(clamp((t - a) / d) * Math.PI)); return m; }

function threadPts(ax, ay, bx, by, sag, amp, t, ph, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, en = Math.sin(u * Math.PI);
    const tr = amp * en * (Math.sin(t * 27 + u * 15 + ph) * .5 + nz(t * 6 + u * 5 + ph * 3, 31) * .5);
    pts.push([lerp(ax, bx, u), lerp(ay, by, u) + sag * en + tr]);
  }
  return pts;
}
function strokePts(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
function ring(ctx, ex, ey, R, a, top, bot) {
  const q = 1 / Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
  ctx.save(); ctx.beginPath(); ctx.rect(ex - R - 20, top, 2 * R + 40, bot - top); ctx.clip();
  ctx.lineWidth = (1.2 + 1.8 * a) * q; ctx.strokeStyle = rgba('#cfe8ff', .4 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [wy, c, k] of [[top, '#9fb3bd', .3], [bot, '#8fd3e8', .32]]) {
    const dy = Math.abs(ey - wy); if (R <= dy) continue;
    const dx = Math.sqrt(R * R - dy * dy);
    for (const px of [ex - dx, ex + dx]) {
      const hw = 50 + Math.min(80, dx * .2); const lg = ctx.createLinearGradient(px - hw, 0, px + hw, 0);
      lg.addColorStop(0, rgba(c, 0)); lg.addColorStop(.5, rgba(c, k * a)); lg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = lg; ctx.fillRect(px - hw, wy - (wy === top ? 10 : 2), hw * 2, wy === top ? 12 : 4);
      ctx.fillStyle = rgba('#e6f6ff', .45 * a); ctx.fillRect(px - 8, wy - 1, 16, 2);
    }
  }
  ctx.restore();
}

window.PK.scenes.leave = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const v0 = info.sc.voice_t - info.sc.t0, tc = t - v0;
  const pl = pulls(v0);
  const bpm = 98;
  const rise = 7 * P(t, 0, d, E.inOutQ);                       // the oil creeps up, barely
  const LY = G.crown + G.gap - rise - 34;

  // ---- the two lights ----
  // camera zoom first (light size compensates a little as the camera eases back)
  const kaz = P(tc, .05, .7, E.inOutQ) * (1 - P(tc, .95, 1.9, E.inOutQ));      // "Kaz was like": attention turns to the rear light
  const zoom = lerp(1.78, 1.9, P(t, -.2, v0 + .8, E.inOutQ)) - .9 * P(t, v0 + 1.0, d + .35, E.inOutQ);
  const ss = Math.pow(1.9 / zoom, .45);
  const mB = bMov(pl, t);
  const B = { x: bX(pl, t), y: LY - 5 * mB + nz(t * .8, 3) * 1.5, a: .9, s: 1.1 * ss };
  let plea = 0; for (const c of BEADS) plea = Math.max(plea, P(tc, c - .1, c + .25, E.outQ) * (1 - P(tc, c + .45, c + 1.2, E.inOutQ)));
  const K = { x: 640 - 16 * plea, y: LY - 3 * plea + nz(t * .7, 5) * 1.5, a: .84 * (1 + .14 * env(tc) * P(tc, .9, 1.1)) * (1 + .16 * kaz), s: 1.05 * ss * (1 + .12 * kaz) };
  B.a *= .92 + .08 * nz(t * 6, 11); K.a = clamp(K.a * (.93 + .07 * nz(t * 5, 12)));

  // ---- camera: slow push-in, then ease back as the gap between them grows; tracks the pair with a lag ----
  const bias = .56 + .14 * kaz;
  let cxw = 0; for (let k = 0; k < 6; k++) { const tt = t - k * .12; cxw += (1 - bias) * bX(pl, tt) + bias * 640; } cxw /= 6;
  const dr = drift2(t, .9, 41);
  let sh = 0; for (const [a, du, dx] of pl) if (dx < 0) sh += .07 * Math.exp(-Math.pow((t - a - du * .35) / .12, 2));
  const sk = shake2(t, sh, 41);
  const camY = G.crown + G.gap / 2 + (960 - 780) / zoom;

  darkLite(ctx, t, .28, 23);
  ctx.save();
  camera(ctx, { x: cxw + (dr.x + sk.x) / zoom, y: camY + (dr.y + sk.y) / zoom, zoom, rot: dr.r + sk.r, t });
  const x0 = cxw - 640 / zoom - 80, x1 = cxw + 640 / zoom + 80, px = 1 / zoom;
  const top = G.crown, sMean = G.crown + G.gap - rise;

  // far inner wall, only where the lights reach it
  backWall(ctx, x0, x1, top, sMean + 6, [B, K]);
  // voice rings from the rear light on the quoted words
  for (const [c, s] of RINGS) {
    const age = tc - c; if (age < 0 || age > 1.6) continue;
    const R = 12 + 340 * age, a = s * Math.pow(1 - age / 1.6, 1.5) * P(R, 12, 70, E.inQ);
    ring(ctx, K.x, K.y, R, a, top, sMean);
  }
  // the lights (their glow is trapped between steel and oil)
  for (const l of [B, K]) { glow(ctx, l.x, l.y, 200, '#ff9a3c', .08 * l.a); glow(ctx, l.x, l.y, 70, '#ffb347', .16 * l.a); }
  souls(ctx, t + .29, [{ x: K.x, y: K.y, a: K.a, s: K.s * (1 + .1 * plea) }], { bpm });
  souls(ctx, t, [{ x: B.x, y: B.y, a: B.a, s: B.s * (1 + .08 * mB) }], { bpm: bpm + 10 * mB });

  // oil and water: almost to the crown
  ctx.beginPath(); ctx.moveTo(x0, G.crown + 760);
  for (let x = x0; x <= x1 + 12; x += 12) ctx.lineTo(x, surfY(x, t, rise));
  ctx.lineTo(x1 + 12, G.crown + 760); ctx.closePath();
  const gf = ctx.createLinearGradient(0, sMean, 0, sMean + 640);
  gf.addColorStop(0, 'rgba(14,36,44,.9)'); gf.addColorStop(.07, 'rgba(6,16,20,.92)'); gf.addColorStop(.35, 'rgba(2,6,8,.88)'); gf.addColorStop(1, 'rgba(1,2,3,.94)');
  ctx.fillStyle = gf; ctx.fill();
  // light bleeding a little way into the oil, and its reflection streaks on the surface
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of [B, K]) {
    ctx.save(); ctx.translate(l.x, sMean + 26); ctx.scale(1.7, .55);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 120); rg.addColorStop(0, rgba('#c07a35', .16 * l.a)); rg.addColorStop(1, rgba('#c07a35', 0));
    ctx.fillStyle = rg; ctx.fillRect(-120, -120, 240, 240); ctx.restore();
    for (let s = 0; s < 6; s++) {
      const w = (20 - s * 2.8) * (.55 + .45 * Math.sin(t * 2.4 + s * 1.9 + l.x * .01));
      ctx.fillStyle = rgba('#ffc477', l.a * .13 * (1 - s / 6)); ctx.fillRect(l.x - w + Math.sin(t * 2 + s * 1.3) * 4, sMean + 5 + s * 9 + Math.sin(t * 1.7 + s) * 1.5, w * 2, 1.3 * px);
    }
  }
  ctx.strokeStyle = rgba('#8fd3e8', .24); ctx.lineWidth = 1.6 * px; ctx.beginPath();
  for (let x = x0; x <= x1 + 12; x += 12) { const y = surfY(x, t, rise); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  // suspended specks in the oil, caught by the nearest light
  for (let i = 0; i < 46; i++) {
    const sx = x0 + ((hi(i * 3 + 7) * (x1 - x0) + t * (6 + 10 * hi(i)) ) % (x1 - x0)), sy = sMean + 14 + hi(i * 5 + 1) * 230 + nz(t * .4 + i, 3) * 8;
    let lit = 0; for (const l of [B, K]) lit += l.a * Math.exp(-Math.pow(Math.hypot(sx - l.x, (sy - sMean) * 1.6) / 170, 2));
    const a = .05 + .5 * lit; ctx.fillStyle = rgba(lit > .1 ? '#ffc98a' : '#8fd3e8', a * (.5 + .5 * hi(i * 9)));
    ctx.beginPath(); ctx.arc(sx, sy, (.8 + 1.2 * hi(i * 11)) * px * 1.4, 0, 7); ctx.fill();
  }
  // warm sheen on the surface between and around the lights
  for (const l of [B, K]) {
    const hw = 220; const lg = ctx.createLinearGradient(l.x - hw, 0, l.x + hw, 0);
    lg.addColorStop(0, rgba('#ffb36b', 0)); lg.addColorStop(.5, rgba('#ffb36b', .16 * l.a)); lg.addColorStop(1, rgba('#ffb36b', 0));
    ctx.fillStyle = lg; ctx.fillRect(l.x - hw, sMean - 2, hw * 2, 3);
  }
  ctx.restore();

  // wakes in the oil when he drags himself forward
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 5; j++) {
    const ph = (t * 1.5 + j / 5) % 1, tt = t - ph * .9, am = bMov(pl, tt), a = am * (1 - ph) * .34; if (a < .01) continue;
    const ex = bX(pl, tt) + 14;
    ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = 1.5 * px; ctx.beginPath(); ctx.ellipse(ex, sMean + 1, 12 + ph * 80, 2 + ph * 5, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  }
  ctx.restore();

  // the crown: steel pressing down on the sliver of air; warm spill where the lights touch it
  const gs = ctx.createLinearGradient(0, top - G.wall, 0, top);
  gs.addColorStop(0, '#040506'); gs.addColorStop(.75, '#0c1013'); gs.addColorStop(1, '#141a1e');
  ctx.fillStyle = gs; ctx.fillRect(x0, top - G.wall, x1 - x0, G.wall);
  ctx.fillStyle = 'rgba(1,2,3,.94)'; ctx.fillRect(x0, top - G.wall - 320, x1 - x0, 320);
  ctx.fillStyle = 'rgba(150,180,195,.06)'; ctx.fillRect(x0, top - 1.2 * px, x1 - x0, 1.5 * px);
  ctx.fillStyle = 'rgba(150,180,195,.035)'; for (let x = Math.floor(x0 / 560) * 560 + 260; x < x1; x += 560) ctx.fillRect(x, top - G.wall, 2.5 * px, G.wall);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of [B, K]) {
    ctx.save(); ctx.translate(l.x, top); ctx.scale(4.2, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 40); rg.addColorStop(0, rgba('#ffb36b', .2 * l.a)); rg.addColorStop(.5, rgba('#ff9a3c', .07 * l.a)); rg.addColorStop(1, rgba('#ff9a3c', 0));
    ctx.fillStyle = rg; ctx.fillRect(-40, -G.wall, 80, G.wall); ctx.restore();
    const hw = 150; const lg = ctx.createLinearGradient(l.x - hw, 0, l.x + hw, 0);
    lg.addColorStop(0, rgba('#ffd9a0', 0)); lg.addColorStop(.5, rgba('#ffd9a0', .2 * l.a)); lg.addColorStop(1, rgba('#ffd9a0', 0));
    ctx.fillStyle = lg; ctx.fillRect(l.x - hw, top - 1.2 * px, hw * 2, 1.5 * px);
  }
  ctx.restore();

  // drips from the crown
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = Math.floor((t + 2) / .8) - 2; k <= Math.floor((t + 2) / .8); k++) {
    const t0 = k * .8 - 2 + hi(k * 7 + 1) * .3, u = t - t0; if (u < 0 || u > 1.6) continue;
    const dx = cxw + (hi(k * 13 + 5) * 2 - 1) * 420 / zoom;
    if (u < .32) { const yy = top + 3 + (sMean - top - 3) * Math.pow(u / .32, 2); ctx.fillStyle = rgba('#bfe9ff', .32); ctx.beginPath(); ctx.ellipse(dx, yy, 2, 4.5, 0, 0, 7); ctx.fill(); }
    else { const q = (u - .32) / 1.28; ctx.strokeStyle = rgba('#8fd3e8', .22 * (1 - q)); ctx.lineWidth = 1.3 * px; ctx.beginPath(); ctx.ellipse(dx, sMean + 1, 6 + q * 90, 1.5 + q * 5, 0, 0, 7); ctx.stroke(); }
  }
  ctx.restore();

  // ---- the last thread between them: stretches, trembles, thins strand by strand ----
  {
    const dist = K.x - B.x, tens = clamp((dist - 150) / 420);
    const ax = B.x, ay = B.y + 1, ex = K.x, ey = K.y + 1;
    const sag = lerp(2.5, .6, tens) + .8 * Math.sin(t * 1.3);
    const amp = .5 + 3.4 * tens * (.55 + .45 * Math.max(mB, plea));
    const fray = .72 * P(t, v0 + 2.9, d + .2, E.inOutQ);
    const strands = [[1, 0, 1], [.8, 2.1, 1 - P(tens, .12, .38)], [1.2, 4.3, 1 - P(tens, .34, .62)]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const base = lerp(.62, .5, tens) * Math.min(B.a, K.a) * (1 + .5 * Math.max(mB, plea) * tens);
    for (let s = strands.length - 1; s >= 0; s--) {
      const [sk2, ph, sa] = strands[s]; if (sa <= .01) continue;
      const pts = threadPts(ax, ay, ex, ey, sag * sk2, amp * (1 + s * .3), t, ph);
      ctx.strokeStyle = rgba('#ff9a3c', base * sa * lerp(.12, .07, tens)); ctx.lineWidth = lerp(5, 3, tens) * px; strokePts(ctx, pts);
      if (s === 0 && fray > 0) {
        // fraying: brightness breaks up along the length (still one continuous hair)
        ctx.lineWidth = lerp(1.4, .9, tens) * px;
        for (let i = 1; i < pts.length; i++) {
          const u = i / (pts.length - 1), k = 1 - fray * (.55 + .45 * nz(u * 9 - t * 1.4, 37));
          ctx.strokeStyle = rgba('#ffd9a0', base * .9 * clamp(k)); ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
        }
      } else { ctx.strokeStyle = rgba('#ffd9a0', base * sa * (s ? .55 : .9)); ctx.lineWidth = (s ? .9 : lerp(1.4, .9, tens)) * px; strokePts(ctx, pts); }
    }
    // "Kaz": his attention runs back along the thread (dimmer); the plea then travels along it to him
    for (const c of [.12].concat(BEADS)) {
      const back = c < .5, q = P(tc, c - .05, c + (back ? .8 : .6), E.inOutQ); if (q <= 0 || q >= 1) continue;
      const u = back ? q : 1 - q, en = Math.sin(u * Math.PI);
      const bxp = lerp(ax, ex, u), byp = lerp(ay, ey, u) + sag * en;
      const a = Math.sin(q * Math.PI) * base * (back ? .6 : 1);
      glow(ctx, bxp, byp, 46, '#ffd27a', .5 * a); ctx.fillStyle = rgba('#fff0d8', .85 * a); ctx.beginPath(); ctx.arc(bxp, byp, 2.6 * px * 1.4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // light cores over the thread ends (same core as PK.souls)
  for (const [l, ph, bp] of [[K, .29, bpm], [B, 0, bpm + 10 * mB]]) {
    const r = (11 + 6 * beat(t + ph, bp)) * l.s * (l === B ? 1 + .08 * mB : 1 + .1 * plea);
    ctx.save(); ctx.globalAlpha = l.a; ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.arc(l.x, l.y, r * .42, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.restore();

  // ---- tunnel vision squeezed into a horizontal sliver, breathing with the heartbeat ----
  const m = { x: 540 + ((B.x + K.x) / 2 - cxw) * zoom, y: 960 + (LY - camY) * zoom };
  const k = lerp(.6, .7, P(t, v0 + .8, d, E.inOutQ));
  const pulse = .55 * (.5 + .5 * Math.sin(t * Math.PI * 2 * .45)) + .45 * beat(t, bpm);
  const r0 = H * lerp(.4, .085, k) * (1 + .06 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  ctx.save(); ctx.translate(m.x, m.y); ctx.scale(1.65, 1);
  const ig = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
  ig.addColorStop(0, 'rgba(1,2,3,0)'); ig.addColorStop(.55, `rgba(1,2,3,${(.5 + .3 * k).toFixed(3)})`); ig.addColorStop(1, 'rgba(1,2,3,.97)');
  ctx.fillStyle = ig; ctx.fillRect(-W * 1.2, -H * 1.2, W * 2.4, H * 2.4); ctx.restore();

  // attribution: up while the voice plays
  const ca = P(t, -.05, .3, E.outQ) * (1 - P(t, d, d + .25));
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
