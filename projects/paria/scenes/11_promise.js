// promise (real audio, Trinidad Express interview): "I promise each and every one of them that I'll be back for them.
// If I can't come back, I'll send help."
// Side cutaway, kept close (zoom 1.5-1.9). The pipe dips gently to the left; the air pocket tapers to nothing and beyond it
// the line is completely flooded. His light stops where the air runs out ("I promise"); on "each and every one" the camera
// dollies along the pocket and the four lights give one pulse each, in turn, as each nears frame centre, each lighting its own
// pool of steel (three together, one further back). The camera swings back to him for "back", where his own light answers
// once. On "If I can't come back" he slips under the surface (ripple, then bubbles that rise to the crown and creep back up
// the slope towards the air); the camera follows him down into the flooded line and the pocket, small and steady, slides
// away up-frame and out around "I'll send help". The last thread from "leave" dissolves in the first second.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, camera } = L;
const { souls, beat, sourceCard } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
const drift2 = (t, amt, s) => ({ x: fb(t * .35, s) * 16 * amt, y: fb(t * .3, s + 9) * 16 * amt, r: fb(t * .25, s + 4) * .006 * amt });
const shake2 = (t, k, s) => ({ x: k * nz(t * 22, s + 1) * 18, y: k * nz(t * 22, s + 2) * 18, r: k * nz(t * 15, s + 3) * .01 });
const sm = u => u * u * (3 - 2 * u);

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

// ---- geometry (world): 76 cm pipe = 380 units, air gap ~15 cm = 75 units where the line is level ----
const PR = { r: 190, wall: 20, base: 800, dip: 270, xd: 360, len: 920 };
const cyAt = x => PR.base + PR.dip * sm(clamp((PR.xd - x) / PR.len));
const topAt = x => cyAt(x) - PR.r, botAt = x => cyAt(x) + PR.r;
const SURF = PR.base - PR.r + 75;
const surfY = (x, t) => SURF + Math.sin(x * .02 - t * 1.2) * 2 + Math.sin(x * .051 + t * .9) * 1.2;
let XT = 0; { let a = -400, b = PR.xd; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (topAt(m) > SURF) a = m; else b = m; } XT = (a + b) / 2; }  // where the air runs out
const LYP = SURF - 22;                                                    // heads just above the oil in the pocket
const OTH = [{ x: 520, a: .84, s: 1.25 }, { x: 586, a: .8, s: 1.2 }, { x: 650, a: .78, s: 1.2 }, { x: 812, a: .52, s: 1.02 }];
// clip-relative onsets from the real audio
const PULSE = [.97, 1.25, 1.52, 1.8];                                     // "each" "and" "every" "one"
const BACK = 2.72;                                                        // "back"

// his path: in from the right to where the air ends, holds, slips under, then swims on along the flooded line
function hisPath(v0, t) {
  const hy = x => lerp(topAt(x), SURF, .66);
  const xPre = 252 - 82 * E.inOutQ(P(t, -.3, v0 + .55)) - 4 * Math.sin(P(t, v0 + .55, v0 + 3.3) * Math.PI);
  const dv = P(t, v0 + 3.42, v0 + 4.5, E.inOutQ), dvY = P(t, v0 + 3.5, v0 + 4.55, E.inOutC);
  const pre = Math.sin(P(t, v0 + 3.15, v0 + 3.55) * Math.PI);            // a breath before going under
  let x = lerp(xPre, 50, dv);
  const strokes = [[v0 + 4.55, .55, -40], [v0 + 5.2, .55, -44], [v0 + 5.85, .55, -46], [v0 + 6.45, .55, -42]];
  let mv = 0; for (const [a, d, dx] of strokes) { const q = clamp((t - a) / d); x += dx * E.inOutQ(q); mv = Math.max(mv, Math.sin(q * Math.PI)); }
  const y = lerp(hy(xPre) - 5 * pre, topAt(x) + 58, dvY);
  const under = clamp((y - SURF + 4) / 18);
  return { x, y, under, mv, dv, pre };
}

function ring(ctx, ex, ey, R, a, x0, x1, q) {
  // clipped to the air pocket
  ctx.save(); ctx.beginPath(); ctx.moveTo(Math.max(x0, XT), SURF + 2);
  for (let x = Math.max(x0, XT); x <= x1 + 16; x += 16) ctx.lineTo(x, topAt(x));
  ctx.lineTo(x1 + 16, SURF + 2); ctx.closePath(); ctx.clip();
  ctx.lineWidth = (1.1 + 1.6 * a) * q; ctx.strokeStyle = rgba('#ffe2b8', .6 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke();
  ctx.restore();
  // where it touches the crown and the oil: brief highlights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [wy, c] of [[topAt(ex), '#9fb3bd'], [SURF, '#8fd3e8']]) {
    const dy = Math.abs(ey - wy); if (R <= dy) continue;
    const dx = Math.sqrt(R * R - dy * dy);
    for (const px of [ex - dx, ex + dx]) { if (px < XT) continue; const yy = c === '#8fd3e8' ? SURF : topAt(px); ctx.fillStyle = rgba(c, .4 * a); ctx.fillRect(px - 12, yy - q, 24, 2 * q); }
  }
  ctx.restore();
}

// ---- the far inner wall seen through the air pocket: same oily steel as "leave" (identical generator and cache key, so
// whichever scene builds it first, the texture is the same), lit only around the lights ----
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
function pocketWall(ctx, x0, x1, lights) {
  const top = PR.base - PR.r, bot = SURF + 6, xa = Math.max(x0, XT - 8);
  if (xa >= x1) return;
  const [b, x] = L.buf('promiseWall', 360, 640); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 360, 640);
  const m = ctx.getTransform(); x.setTransform(m.a / 3, m.b / 3, m.c / 3, m.d / 3, m.e / 3, m.f / 3);
  x.save(); x.beginPath(); x.moveTo(xa, bot); for (let xx = xa; xx <= x1 + 16; xx += 16) x.lineTo(xx, topAt(xx)); x.lineTo(x1 + 16, bot); x.closePath(); x.clip();
  const tw = 760;
  for (let k = Math.floor(xa / tw); k * tw < x1; k++) { if (k & 1) { x.save(); x.translate((k + 1) * tw, 0); x.scale(-1, 1); x.drawImage(wallTex(), 0, top, tw, bot - top); x.restore(); } else x.drawImage(wallTex(), k * tw, top, tw, bot - top); }
  x.restore();
  const [mb, mx] = L.buf('promiseWallMask', 360, 640); mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, 360, 640);
  mx.setTransform(m.a / 3, m.b / 3, m.c / 3, m.d / 3, m.e / 3, m.f / 3); mx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!(l.a > .02)) continue; const R = 150 * (l.s || 1) * (1 + .5 * (l.p || 0));
    mx.save(); mx.translate(l.x, l.y); mx.scale(1.35, 1);
    const g = mx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, .9 * l.a + .5 * (l.p || 0))})`); g.addColorStop(.4, `rgba(0,0,0,${Math.min(1, .38 * l.a + .3 * (l.p || 0))})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    mx.fillStyle = g; mx.fillRect(-R, -R, R * 2, R * 2); mx.restore();
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mb, 0, 0); x.globalCompositeOperation = 'source-over';
  const ya = m.d * top + m.f, yb = m.d * bot + m.f, r0 = clamp(Math.floor((Math.min(ya, yb) - 90) / 3), 0, 639), r1 = clamp(Math.ceil((Math.max(ya, yb) + 90) / 3), r0 + 1, 640);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .34; ctx.drawImage(b, 0, r0, 360, r1 - r0, 0, r0 * 3, W, (r1 - r0) * 3); ctx.restore();
}

window.PK.scenes.promise = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const v0 = info.sc.voice_t - info.sc.t0, tc = t - v0;
  const bpm = 100;
  const B = hisPath(v0, t);

  // ---- camera: close the whole way. Opens on him where the air runs out, dollies along the pocket so each light is near
  // frame centre as it pulses ("each and every one"), swings back to him for "back", then follows him down into the
  // flooded line ("If I can't come back") while the pocket slides away up-frame. ----
  const push = P(t, d - .95, d + .2, E.inQ);
  let zoom = lerp(1.9, 1.76, P(tc, -.3, .9, E.inOutQ));
  zoom = lerp(zoom, 1.62, P(tc, 1.95, 2.75, E.inOutQ));
  zoom = lerp(zoom, 1.5, P(tc, 3.3, 4.7, E.inOutQ)) + .08 * push;
  let bs = 0, by = 0; for (let k = 0; k < 6; k++) { const q = hisPath(v0, t - k * .09); bs += q.x; by += q.y; } bs /= 6; by /= 6;
  let camX = 300 + 400 * E.inOutQ(P(tc, .55, 1.85)) - 340 * E.inOutQ(P(tc, 2.0, 2.75)) - 50 * E.inOutQ(P(tc, 2.9, 3.9));
  const fol = P(tc, 3.1, 4.6, E.inOutQ);
  camX = lerp(camX, bs + lerp(215, 120, P(tc, 4.3, 6.7)), fol);   // the pocket slides out right around "send help"
  const yScr = lerp(860, 830, fol);
  const camY = lerp(LYP, by, .8 * P(tc, 3.5, 5.8, E.inOutQ)) + (960 - yScr) / zoom;
  const dr = drift2(t, .9, 53);
  let sh = .12 * Math.exp(-Math.pow((tc - 3.95) / .12, 2));
  const sk = shake2(t, sh, 53);
  const px = 1 / zoom;

  darkLite(ctx, t, .26, 31);
  ctx.save();
  camera(ctx, { x: camX + (dr.x + sk.x) / zoom, y: camY + (dr.y + sk.y) / zoom, zoom, rot: dr.r + sk.r, t });
  const x0 = camX - 600 / zoom - 60, x1 = camX + 600 / zoom + 60;

  // ---- lights in the pocket: steady, each one pulses once on "each and every one" ----
  const pl = OTH.map((o, i) => {
    const tp = PULSE[i], p = P(tc, tp - .05, tp + .12, E.outQ) * (1 - P(tc, tp + .14, tp + .85, E.inOutQ));
    return { x: o.x, y: LYP + nz(t * .7, i + 3) * 1.4, a: clamp(o.a * (.94 + .06 * nz(t * 5, i + 7)) + .3 * p), s: o.s * (1 + .45 * p), p, tp };
  });
  const rep = P(tc, BACK - .05, BACK + .12, E.outQ) * (1 - P(tc, BACK + .14, BACK + .9, E.inOutQ));
  const Bl = { x: B.x, y: B.y, a: .92 * (.94 + .06 * nz(t * 6, 2)) + .08 * rep, s: 1.32 * (1 + .35 * rep) * (1 + .08 * B.mv) };

  // ---- the pipe: black inside, a faint warm spill on the crown above the lights ----
  ctx.beginPath(); ctx.moveTo(x0, topAt(x0));
  for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, topAt(x));
  for (let x = x1 + 16; x >= x0 - 16; x -= 16) ctx.lineTo(x, botAt(x));
  ctx.closePath(); ctx.fillStyle = 'rgba(2,4,5,.92)'; ctx.fill();
  // far wall of the pocket, its steel lit in a pool around each light (a pulse widens and brightens its pool)
  pocketWall(ctx, x0, x1, pl.concat(B.under < 1 ? [{ x: Bl.x, y: Bl.y, a: Bl.a * (1 - B.under), s: Bl.s, p: rep }] : []));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of pl.concat(B.under < 1 ? [Bl] : [])) {
    const a = l.a * (l === Bl ? 1 - B.under : 1); if (a < .02) continue;
    const pp = l === Bl ? rep : l.p;
    ctx.save(); ctx.translate(l.x, (topAt(l.x) + SURF) / 2); ctx.scale(3, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 60); rg.addColorStop(0, rgba('#ffb36b', .1 * a + .2 * pp)); rg.addColorStop(1, rgba('#ff9a3c', 0));
    ctx.fillStyle = rg; ctx.fillRect(-60, -60, 120, 120); ctx.restore();
  }
  ctx.restore();

  // pulse rings in the pocket
  for (const l of pl) { const age = tc - l.tp; if (age < 0 || age > 1.1) continue; ring(ctx, l.x, l.y, 10 + 210 * age, .8 * Math.pow(1 - age / 1.1, 1.4) * P(age, 0, .08), x0, x1, px); }
  { const age = tc - BACK; if (age > 0 && age < 1.1) ring(ctx, B.x, B.y, 10 + 210 * age, .7 * Math.pow(1 - age / 1.1, 1.4) * P(age, 0, .08) * (1 - B.under), x0, x1, px); }

  // lights above the oil
  pl.forEach((l, i) => { glow(ctx, l.x, l.y, 150, '#ff9a3c', .05 * l.a); if (l.p > .01) glow(ctx, l.x, l.y, 120, '#ffcf8a', .24 * l.p); souls(ctx, t + [.29, .47, .71, .55][i], [{ x: l.x, y: l.y, a: l.a, s: l.s }], { bpm: bpm - 8 }); });
  if (B.under < 1) { glow(ctx, Bl.x, Bl.y, 170, '#ff9a3c', .07 * Bl.a); souls(ctx, t, [{ x: Bl.x, y: Bl.y, a: Bl.a * (1 - B.under * .6), s: Bl.s }], { bpm: bpm + 8 }); }

  // ---- oil and water: fills everything below the pocket, and the whole line beyond it ----
  ctx.beginPath(); ctx.moveTo(x0, botAt(x0));
  for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, Math.max(topAt(x), surfY(x, t)));
  for (let x = x1 + 16; x >= x0 - 16; x -= 16) ctx.lineTo(x, botAt(x));
  ctx.closePath();
  const gf = ctx.createLinearGradient(0, SURF, 0, SURF + 520);
  gf.addColorStop(0, 'rgba(14,36,44,.9)'); gf.addColorStop(.08, 'rgba(6,16,20,.92)'); gf.addColorStop(.4, 'rgba(2,6,8,.9)'); gf.addColorStop(1, 'rgba(1,2,3,.94)');
  ctx.fillStyle = gf; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // the oil surface, only where there is still air above it; a glint where it meets the steel
  ctx.strokeStyle = rgba('#8fd3e8', .26); ctx.lineWidth = 1.5 * px; ctx.beginPath();
  let first = true; for (let x = Math.max(x0, XT); x <= x1 + 16; x += 12) { const y = surfY(x, t); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
  ctx.stroke();
  glow(ctx, XT, SURF, 34, '#bfe9ff', .22 + .08 * Math.sin(t * 2.2));
  // reflections under the pocket lights
  for (const l of pl.concat(B.under < .5 ? [Bl] : [])) {
    for (let s = 0; s < 5; s++) {
      const w = (16 - s * 2.6) * l.s * (.55 + .45 * Math.sin(t * 2.4 + s * 1.9 + l.x * .01));
      ctx.fillStyle = rgba('#ffc477', l.a * .12 * (1 - s / 5)); ctx.fillRect(l.x - w + Math.sin(t * 2 + s * 1.3) * 3, SURF + 4 + s * 8 + Math.sin(t * 1.7 + s) * 1.2, w * 2, 1.4 * px);
    }
    // light bleeding a little way into the oil
    ctx.save(); ctx.translate(l.x, SURF + 24); ctx.scale(1.7, .55);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 110); bg.addColorStop(0, rgba('#c07a35', .14 * l.a)); bg.addColorStop(1, rgba('#c07a35', 0));
    ctx.fillStyle = bg; ctx.fillRect(-110, -110, 220, 220); ctx.restore();
  }
  // suspended specks in the oil (fixed in the world, drifting slowly), caught by the nearest light
  {
    const lits = pl.concat(B.under < 1 ? [{ x: Bl.x, y: SURF, a: Bl.a }] : []);
    for (let i = 0; i < 70; i++) {
      const sx = -400 + ((hi(i * 3 + 7) * 1500 + t * (5 + 9 * hi(i))) % 1500); if (sx < x0 || sx > x1) continue;
      const sy = SURF + 12 + hi(i * 5 + 1) * 200 + nz(t * .4 + i, 3) * 7; if (sy < topAt(sx) + 4 || sy > botAt(sx) - 4) continue;
      let lit = 0; for (const l of lits) lit += l.a * Math.exp(-Math.pow(Math.hypot(sx - l.x, (sy - SURF) * 1.6) / 150, 2));
      const a = (.04 + .5 * lit) * (.5 + .5 * hi(i * 9)); if (a < .02) continue;
      ctx.fillStyle = rgba(lit > .1 ? '#ffc98a' : '#8fd3e8', a); ctx.beginPath(); ctx.arc(sx, sy, (.8 + 1.2 * hi(i * 11)) * px * 1.4, 0, 7); ctx.fill();
    }
  }
  // entry ripple when he goes under
  { const te = v0 + 3.92, age = t - te; if (age > 0 && age < 1.6) for (let k = 0; k < 3; k++) { const a2 = age - k * .16; if (a2 <= 0) continue; const q = a2 / 1.6; ctx.strokeStyle = rgba('#8fd3e8', .4 * (1 - q) * (1 - k * .25)); ctx.lineWidth = 1.4 * px; ctx.beginPath(); ctx.ellipse(118, SURF + 1, 8 + q * 170, 1.5 + q * 5, 0, 0, 7); ctx.stroke(); } }
  ctx.restore();

  // ---- him, under the oil: warm but muffled, specks of silt, bubbles that rise to the crown and creep back towards the air ----
  if (B.under > 0) {
    const u = B.under;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(Bl.x, Bl.y); ctx.scale(1.25, 1);
    const hz = ctx.createRadialGradient(0, 0, 0, 0, 0, 230); hz.addColorStop(0, rgba('#b98a52', .28 * u)); hz.addColorStop(.35, rgba('#3f6a66', .1 * u)); hz.addColorStop(1, 'rgba(20,50,60,0)');
    ctx.fillStyle = hz; ctx.fillRect(-230, -230, 460, 460); ctx.restore();
    for (let i = 0; i < 26; i++) {
      const sx = Bl.x + (hi(i * 3 + 1) - .5) * 420 + nz(t * .3 + i, 4) * 20 + ((t * 30 * (.5 + hi(i))) % 60), sy = Bl.y + (hi(i * 7 + 2) - .5) * 200 + nz(t * .25 + i, 6) * 14;
      if (sy < topAt(sx) + 3 || sy > botAt(sx) - 3) continue;
      const dd = Math.hypot(sx - Bl.x, sy - Bl.y), a = u * .55 * Math.exp(-Math.pow(dd / 150, 2));
      ctx.fillStyle = rgba('#ffd2a0', a); ctx.beginPath(); ctx.arc(sx, sy, (1 + hi(i * 5) * 1.3) * px * 1.2, 0, 7); ctx.fill();
    }
    ctx.restore();
    souls(ctx, t, [{ x: Bl.x, y: Bl.y, a: Bl.a * lerp(1, .82, u), s: Bl.s * lerp(1, .92, u) }], { bpm: bpm + 14 * B.mv + 6, color: '#f0a050' });
  }
  // bubbles: born at his position, rise to the crown, then slide up the slope towards the pocket
  {
    const t0 = v0 + 3.9; ctx.save(); ctx.strokeStyle = 'rgba(207,240,255,.55)'; ctx.lineWidth = 1.2 * px;
    for (let k = 0; k < 34; k++) {
      const tb = t0 + k * .14 + hi(k * 13) * .08; const age = t - tb; if (age < 0 || age > 3.2) continue;
      const p0 = hisPath(v0, tb), bx0 = p0.x + 10 + (hi(k * 5) - .5) * 14, by0 = p0.y - 8;
      const ceil0 = topAt(bx0) + 6, rise = (by0 - ceil0) / 170;
      let bx, by;
      if (age < rise) { bx = bx0 + Math.sin(age * 9 + k) * 3; by = by0 - 170 * age; }
      else { bx = bx0 + 85 * (age - rise); by = topAt(bx) + 6; if (bx > XT - 4) continue; }
      const r = (2 + 3 * hi(k * 7)) * (age < rise ? 1 : 1.3);
      ctx.globalAlpha = .7 * P(age, 0, .1) * (1 - P(age, 2.6, 3.2)); ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- steel walls (light stays inside), outside dark ----
  const band = (edge, dir) => {
    ctx.beginPath(); ctx.moveTo(x0 - 16, edge(x0 - 16));
    for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, edge(x));
    for (let x = x1 + 16; x >= x0 - 16; x -= 16) ctx.lineTo(x, edge(x) + dir * PR.wall);
    ctx.closePath();
  };
  ctx.fillStyle = '#0e1316'; band(topAt, -1); ctx.fill();
  // at these zooms the bottom wall falls in the subtitle band: keep it as dark as the outside so it adds no stripe there
  const bz = P(zoom, 1.25, 1.45);
  ctx.fillStyle = `rgb(${Math.round(lerp(14, 3, bz))},${Math.round(lerp(19, 4, bz))},${Math.round(lerp(22, 5, bz))})`; band(botAt, 1); ctx.fill();
  ctx.fillStyle = 'rgba(1,2,3,.95)';
  ctx.beginPath(); ctx.moveTo(x0 - 16, topAt(x0 - 16) - PR.wall); for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, topAt(x) - PR.wall); ctx.lineTo(x1 + 16, topAt(x1) - 1600); ctx.lineTo(x0 - 16, topAt(x1) - 1600); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0 - 16, botAt(x0 - 16) + PR.wall); for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, botAt(x) + PR.wall); ctx.lineTo(x1 + 16, botAt(x0) + 1600); ctx.lineTo(x0 - 16, botAt(x0) + 1600); ctx.closePath(); ctx.fill();
  // inner edge highlights (the bottom one only when it sits well below the subtitle band, i.e. never at these zooms)
  ctx.lineWidth = 1.4 * px;
  for (const [edge, ea] of [[topAt, .11], [botAt, .11 * (1 - P(zoom, 1.25, 1.45))]]) { if (ea < .005) continue; ctx.strokeStyle = `rgba(150,185,200,${ea.toFixed(3)})`; ctx.beginPath(); for (let x = x0; x <= x1 + 16; x += 16) { const y = edge(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  // girth welds
  ctx.strokeStyle = 'rgba(150,185,200,.06)'; ctx.lineWidth = 2.5 * px;
  for (let x = Math.floor(x0 / 540) * 540 + 130; x < x1; x += 540) { ctx.beginPath(); ctx.moveTo(x, topAt(x) - PR.wall); ctx.lineTo(x, topAt(x)); ctx.moveTo(x, botAt(x)); ctx.lineTo(x, botAt(x) + PR.wall); ctx.stroke(); }
  // warm spill on the crown steel above the pocket lights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of pl.concat(B.under < 1 ? [Bl] : [])) {
    const a = l.a * (l === Bl ? 1 - B.under : 1), pp = l === Bl ? rep * (1 - B.under) : l.p; const hw = 120 * l.s; const yy = topAt(l.x);
    const lg = ctx.createLinearGradient(l.x - hw, 0, l.x + hw, 0); lg.addColorStop(0, rgba('#ffd9a0', 0)); lg.addColorStop(.5, rgba('#ffd9a0', .2 * a + .35 * pp)); lg.addColorStop(1, rgba('#ffd9a0', 0));
    ctx.fillStyle = lg; ctx.fillRect(l.x - hw, yy - 1.2 * px, hw * 2, 1.6 * px);
  }
  ctx.restore();

  // ---- the last thread from "leave": a hair that fades as he moves off ----
  const ta = .5 * (1 - P(t, .05, 1.0, E.inOutQ));
  if (ta > 0) {
    const A = Bl, K = pl[0];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffd9a0', ta); ctx.lineWidth = .9 * px; ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30, en = Math.sin(u * Math.PI); const x = lerp(A.x, K.x, u), y = lerp(A.y, K.y, u) + en * (1 + 2.5 * nz(t * 6 + u * 5, 9)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();

  // ---- tunnel vision: centred on the pocket while the camera rides along it, closing on him as he goes ----
  const focus = P(t, v0 + 3.3, d, E.inOutQ);
  const sB = { x: 540 + (B.x - camX) * zoom, y: 960 + (B.y - camY) * zoom };
  const yP = 960 + (LYP - camY) * zoom;
  const cx = lerp(540, lerp(540, sB.x, .55), focus), cy = lerp(yP, lerp(yP, sB.y, .7), focus);
  const k = lerp(.5, .6, focus) + .06 * push;
  const pulse = .55 * (.5 + .5 * Math.sin(t * Math.PI * 2 * .42)) + .45 * beat(t, bpm);
  const r0 = H * lerp(.4, .085, k) * (1 + .06 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.55, 1);
  const ig = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
  ig.addColorStop(0, 'rgba(1,2,3,0)'); ig.addColorStop(.55, `rgba(1,2,3,${(.5 + .3 * k).toFixed(3)})`); ig.addColorStop(1, 'rgba(1,2,3,.97)');
  ctx.fillStyle = ig; ctx.fillRect(-W * 1.5, -H * 1.5, W * 3, H * 3); ctx.restore();

  // attribution: up while the voice plays (full from the first frame: the card from "leave" is full at the hard cut)
  const ca = 1 - P(t, d - .3, d - .02, E.inQ);                                                 // voice ends ~0.35 s before the cut
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
