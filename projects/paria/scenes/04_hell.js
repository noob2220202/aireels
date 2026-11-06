// hell (real audio, Boodram): pitch-black POV inside the pipe right after the suction.
// Afterimage burn of the impact, eyes trying to adjust (phosphenes that swim and fade), one weak amber light (him)
// barely flickering with a heartbeat, a breathing tunnel-vision iris, an extremely slow push.
// "...not sure if I was alive" -> the light nearly goes out, then catches; "...this was hell" -> the blotches burn red, the dark closes in
// (snaps shut on "hell", with one short red flash at the periphery).
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, camera, drift, flash } = L;
const { K, dark, souls, beat, sourceCard, lerp2 } = window.PK;

// loudness of the real clip (30 fps RMS, 0-99, clip-relative from voice_t) -> drives the small waveform only
const ENV = [1,1,1,1,2,1,13,22,27,57,23,6,4,9,55,56,53,50,63,75,75,65,63,60,50,39,51,33,43,58,68,65,63,54,56,57,63,61,61,34,26,41,36,45,81,91,75,76,57,25,16,24,58,56,52,38,30,23,59,52,40,41,38,44,65,75,83,58,48,58,54,49,41,41,20,13,11,9,4,7,12,24,31,66,48,31,27,25,21,12,4,3,2,4,4,4,2,4,2,2,2,2,2,3,2,2,1,2,3,2,1,1,1,1,70,90,82,93,68,51,48,33,37,37,56,99,69,68,52,49,41,32,17,10,9,4,3,2,2,1,1,1,1,2,1,2,2,1,1,1];
function venv(tc) { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= ENV.length - 1) return 0; return lerp(ENV[i], ENV[i + 1], f - i) / 99; }

// ---- cheaper variant of PK.dark (same oily sheen, same parameters): composed at quarter resolution and blitted once,
// opaque. `extra(x)` may add screen-space layers into the same buffer (x is pre-scaled to 1080x1920 units). ----
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
function darkFast(ctx, t, { k = 1, seed = 1, base = '#010203', extra = null } = {}) {
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
  if (extra) extra(x);
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H);
  if (k > 0) {
    for (let i = 0; i < 9; i++) {
      const life = 3 + hash(i * 5 + seed) * 2, ph = ((t / life + hash(i + seed)) % 1);
      const px = hash(i * 7 + seed * 3) * W, py = 520 + hash(i * 11 + seed) * 760, r = 30 + ph * 180;
      ctx.strokeStyle = rgba('#8fd3e8', .08 * k * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, r, r * .28, 0, 0, 7); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- POV down the pipe (shared geometry with "alive"): vanishing point, radius scale, fluid level (20 of 76 cm) ----
const VP = { cx: 540, cy: 740, R0: 600, lv: .474, hw: .88 };
const LV_A = Math.asin(VP.lv);
function povTunnel(ctx, t, { k = 1, lights = [], camZ = 0, ripple = 1, sweep = -1, warmK = .13, warmMax = .3 } = {}) {
  const { cx, cy, R0, lv, hw } = VP;
  ctx.save();
  // oily fluid surface: a wedge from the vanishing point
  const yb = 1300, sl = hw / lv;
  const g = ctx.createRadialGradient(cx, cy + 150, 20, cx, cy + 200, 620);
  g.addColorStop(0, rgba('#0f3440', .2 * k)); g.addColorStop(.5, rgba('#0b2a33', .1 * k)); g.addColorStop(1, rgba('#0b2a33', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sl * (yb - cy), yb); ctx.lineTo(cx - sl * (yb - cy), yb); ctx.closePath(); ctx.fill();
  // weld rings (only the part above the fluid), lit faintly cold + warmly by nearby lights
  const dz = .62, N = 20, off = ((camZ % dz) + dz) % dz;
  ctx.lineCap = 'round';
  for (let i = N - 1; i >= 0; i--) {
    const z = .42 + i * dz - off; if (z < .36) continue;
    const r = R0 / z, fog = Math.exp(-z * .2);
    let warm = 0; for (const l of lights) warm += (l.a || 0) * Math.exp(-Math.abs(z - (l.z - camZ)) * 1.5) * (l.w == null ? 1 : l.w);
    const sw = sweep >= 0 ? Math.exp(-Math.pow((z - sweep) / .5, 2)) : 0;
    const cold = k * (.05 + .1 * sw) * fog * (.8 + .2 * noise1(t * .7 + i, 3)), wa = clamp(warm * warmK, 0, warmMax);
    const a = cold + wa; if (a < .004) continue;
    ctx.strokeStyle = rgba(lerp2('#6f8792', '#ffb36b', clamp(wa / a)), a); ctx.lineWidth = Math.max(1, 7.5 / z);
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI - LV_A, Math.PI * 2 + LV_A); ctx.stroke();
    // cold glints where the ring meets the oily surface
    const gy = cy + lv * r, gx = hw * r, ga = clamp(cold * 2.6 + wa * .8);
    ctx.fillStyle = rgba('#8fd3e8', ga); ctx.fillRect(cx - gx - 10 / z, gy - 1, 20 / z + 2, 2); ctx.fillRect(cx + gx - 10 / z, gy - 1, 20 / z + 2, 2);
  }
  // slow ripples on the fluid surface
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 13; j++) {
    const zj = .55 + ((j * .71 + t * .16 * ripple + hash(j) * .5) % 9.2); const r = R0 / zj, y0 = cy + lv * r, hwj = hw * r * .98;
    const sw = sweep >= 0 ? Math.exp(-Math.pow((zj - sweep) / .6, 2)) : 0;
    const a = (k * .07 * Math.exp(-zj * .25) + .22 * sw) * Math.sin(clamp(((j * .71 + t * .16 * ripple + hash(j) * .5) % 9.2) / 9.2) * Math.PI);
    if (a < .005) continue;
    ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = Math.max(1, 3 / zj); ctx.beginPath();
    for (let s = 0; s <= 24; s++) { const u = s / 24 * 2 - 1, x = cx + u * hwj, y = y0 + Math.sin(u * 7 + t * 1.3 + j) * 2.2 / zj * (1 - u * u); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  // amber reflections of the lights on the oil
  for (const l of lights) {
    if (!(l.a > 0)) continue; const z = l.z - camZ; if (z < .36) continue;
    const r = R0 / z, x = cx + l.xo * r, y0 = cy + lv * r;
    const sz = 1 / Math.sqrt(z), len = 70 * sz;
    ctx.save(); ctx.translate(x, y0 + len * .45); ctx.scale(.22, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, len); rg.addColorStop(0, rgba('#ffb347', l.a * .16)); rg.addColorStop(1, rgba('#ffb347', 0));
    ctx.fillStyle = rg; ctx.fillRect(-len, -len, len * 2, len * 2); ctx.restore();
    for (let s = 0; s < 4; s++) {
      const y = y0 + (4 + s * 11) * sz + Math.sin(t * 1.7 + s) * 1.5, w = (20 - s * 3.5) * sz * (.7 + .3 * Math.sin(t * 2.6 + s * 1.9)), xx = x + Math.sin(t * 2.1 + s * 1.3) * 5 * sz;
      ctx.fillStyle = rgba('#ffc477', l.a * .11 * (1 - s / 4)); ctx.fillRect(xx - w, y, w * 2, Math.max(1, 2 * sz));
    }
  }
  ctx.restore();
}
function lightXY(l, camZ = 0) { const z = l.z - camZ, r = VP.R0 / z; return { x: VP.cx + l.xo * r, y: VP.cy + (l.yo == null ? .3 : l.yo) * r, s: clamp(1.55 / Math.pow(z, .75), .25, 1.6) }; }

// ---- phosphenes: soft blotches that swim and fade (screen space), turning a burnt red as 'red' rises ----
function phosphenes(ctx, t, amt, red) {
  if (amt <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 10; i++) {
    const life = 2.3 + hash(i * 13 + 5) * 1.7, u = t / life + hash(i * 7 + 1), cyc = Math.floor(u), ph = u - cyc;
    const ev = Math.pow(Math.sin(ph * Math.PI), 2);
    const x = 540 + (hash(i * 31 + cyc * 17) - .5) * 820 + fbm(t * .22 + i, i) * 120;
    const y = 830 + (hash(i * 23 + cyc * 11) - .5) * 720 + fbm(t * .2 + i * 3, i + 4) * 120 - ph * 40;
    const R = 120 + hash(i * 5 + cyc * 3) * 230;
    const isRed = hash(i * 3 + cyc * 5) < .22 + .7 * red;
    const col = isRed ? (hash(i + cyc * 2) > .5 ? '#a8311f' : '#7a1622') : (hash(i + cyc) > .5 ? '#1a5c68' : '#35214f');
    const a = amt * ev * (isRed ? .2 + .17 * red : .2);
    ctx.save(); ctx.translate(x, y); ctx.rotate(hash(i * 9 + cyc) * 3); ctx.scale(1, .65 + hash(i * 4 + cyc) * .35);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    if (i % 4 === 0) { g.addColorStop(0, rgba(col, a * .2)); g.addColorStop(.45, rgba(col, a * .7)); g.addColorStop(.7, rgba(col, a * .45)); g.addColorStop(1, rgba(col, 0)); }
    else { g.addColorStop(0, rgba(col, a)); g.addColorStop(.45, rgba(col, a * .45)); g.addColorStop(1, rgba(col, 0)); }
    ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
  }
  ctx.restore();
}
function sparks(ctx, t, amt, red) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const f = Math.floor(t * 7 + hash(i * 3) * 7), on = hash(f * 13 + i * 7); if (on < .7) continue;
    const x = 540 + (hash(f * 5 + i) - .5) * 900, y = 840 + (hash(f * 9 + i * 3) - .5) * 800;
    ctx.fillStyle = rgba(hash(i + f) > .5 + .3 * red ? '#8fd3e8' : '#ff8a6a', amt * .3 * (on - .7) / .3); ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i * 11 + f) * 2.2, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// ---- tunnel-vision iris centred on (cx,cy); pulse widens it a little with each heartbeat ----
function iris(ctx, k, pulse, cx = 540, cy = 840) {
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function waveLine(ctx, t, x, y, w, h, a, lev) {
  if (a <= 0) return; const n = 34;
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) * 2 - 1, bell = Math.exp(-u * u * 2.2);
    const v = .08 + .92 * clamp(lev * (.55 + .45 * Math.abs(noise1(t * 7 + i * .61, 5))) * bell * 1.25);
    const bh = Math.max(2, h * v); ctx.fillStyle = i % 2 ? '#8fd3e8' : '#cfe8ff';
    ctx.fillRect(x - w / 2 + i * w / n, y - bh / 2, w / n * .5, bh);
  }
  ctx.restore();
}

window.PK.scenes.hell = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const v0 = info.sc.voice_t - info.sc.t0;              // voice starts (~0.5 s)
  // clip RMS: "...if I was alive" ends ~2.95, silence 3.0-3.8, "and this" 3.8-4.1, "hell" ~4.12-4.45 (clip-relative)
  const tAlive = v0 + 2.05, tAdj = v0 + 2.6, tAnd = v0 + 3.8, tHell = v0 + 4.12;
  const red = P(t, tAnd - .1, tHell + .3, E.inOutQ) * (1 - .35 * P(t, d - .3, d + .3));
  const bpm = lerp(92, 116, P(t, tHell - .6, tHell + .3, E.inOutQ));
  const hb = beat(t, bpm);
  const adj = P(t, .4, tAdj, E.outQ) * (1 - .55 * P(t, tAnd - .1, tHell + .3, E.inOutQ));   // eyes adjust, then the dark closes back in
  const closeIn = P(t, tAnd - .1, tHell - .05, E.inOutQ);                // the dark starts to lean in on "and this"...
  const snap = P(t, tHell - .05, tHell + .3, E.outQ);                     // ...and snaps shut on "hell"
  const rflash = P(t, tHell - .03, tHell + .02) * (1 - P(t, tHell + .09, tHell + .22, E.inQ));   // one ~0.12 s red flash

  // retina layer, composed into the quarter-res background: phosphenes swimming as the eyes try to adjust,
  // the afterimage of the impact burnt in, and a burning periphery on "hell"
  const retina = rx => {
    phosphenes(rx, t, .55 + .45 * P(t, 0, 1.2) + .25 * red, red);
    const ap = P(t, 0, 1.4, E.outQ);
    rx.globalCompositeOperation = 'screen';
    if (ap < 1) {
      rx.lineWidth = 30 * (1 - ap) + 10; rx.strokeStyle = rgba('#7fd6e8', .32 * Math.pow(1 - ap, 1.4)); rx.beginPath(); rx.arc(546, 770, 240 + 70 * ap, 0, 7); rx.stroke();
      rx.lineWidth = 16; rx.strokeStyle = rgba('#b0303a', .18 * Math.pow(1 - ap, 1.2)); rx.beginPath(); rx.arc(530, 760, 200 + 40 * ap, 0, 7); rx.stroke();
    }
    if (red > 0) {
      const g = rx.createRadialGradient(540, 840, H * .22, 540, 860, H * .7);
      g.addColorStop(0, 'rgba(120,20,16,0)'); g.addColorStop(1, rgba('#7a1612', .16 * red * (.8 + .2 * hb)));
      rx.fillStyle = g; rx.fillRect(0, 0, W, H);
    }
    rx.globalCompositeOperation = 'source-over';
  };
  darkFast(ctx, t, { k: lerp(.45, .25, red), seed: 6, extra: retina });
  const dr = drift(t, .9, 6), shake = .85 * (1 - P(t, 0, .8, E.outQ));
  const zoom = (lerp(1.0, 1.13, P(t, -.2, d + .3, E.inOutQ)) + .03 * snap) * (1 + .015 * hb);
  // his light: barely there, flickering with the heartbeat; nearly goes out on "...if I was", catches on "alive"
  const me = { z: 1.15, xo: -.08, yo: .3 };
  const doubt = 1 - .78 * P(t, tAlive - .55, tAlive + .05, E.inOutQ) * (1 - P(t, tAlive + .2, tAlive + .45, E.outQ));
  const catchP = Math.exp(-Math.pow((t - tAlive - .38) / .22, 2));
  const flick = .84 + .16 * noise1(t * 11, 3) - (hash(Math.floor(t * 30) + 7) > .94 ? .22 : 0);
  me.a = P(t, .25, 1.15, E.outQ) * doubt * flick * (.62 + .38 * hb) * (1 + .3 * catchP);
  me.w = .85;
  const lp = lightXY(me);

  ctx.save();
  camera(ctx, { x: lp.x + dr.x * .6, y: lp.y + 80 / zoom + dr.y, zoom, rot: dr.r, shake, t, seed: 6 });
  // his own light warms the nearest weld rings: the steel tube around him shows, the rest stays black
  povTunnel(ctx, t, { k: .45 + .4 * adj, lights: [me], ripple: .6, warmK: .55, warmMax: .65 });
  glow(ctx, lp.x, lp.y + 10, 420, '#ff9a3c', .1 * clamp(me.a));
  souls(ctx, t, [{ x: lp.x, y: lp.y, a: clamp(me.a), s: lp.s * (1.15 + .35 * catchP) }], { bpm, size: 1.5 });
  ctx.restore();

  sparks(ctx, t, .55 + .45 * P(t, 0, 1.2) + .25 * red, red);
  // tunnel vision: breathes with every heartbeat, leans in on "and this", snaps shut on "hell"
  iris(ctx, .42 + .13 * closeIn + .2 * snap + .06 * (1 - adj), hb, 540, 860);
  if (rflash > 0) {
    const g = ctx.createRadialGradient(540, 860, H * .16, 540, 860, H * .62);
    g.addColorStop(0, 'rgba(150,18,22,0)'); g.addColorStop(.45, rgba('#9c1418', .3 * rflash)); g.addColorStop(1, rgba('#b3161c', .55 * rflash));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // attribution + a subtle waveform of the real voice
  const ca = P(t, .1, .45, E.outQ) * (1 - P(t, d + .02, d + .25));
  waveLine(ctx, t, 540, 1093, 300, 40, ca * .6, venv(t - v0));
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
  // impact residue right after the cut
  flash(ctx, .14 * (1 - P(t, 0, .45, E.outQ)), '#8fd3e8');
};
})();
