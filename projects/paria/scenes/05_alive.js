// alive: "그런데, 다섯 명 모두 아직 살아 있었습니다."
// Continues the hell POV down the pipe: his light is joined, one by one, by four more amber lights at different
// distances along the faintly revealed pipe interior (each arrival warms the weld ring nearest to it); all five are lit
// by the end of '다섯 명 모두' (the counter climbs with the words), and on '살아' all five hearts fall into one beat.
// A small swell of warmth, but the dark still presses in (iris, oily walls, slow dolly back).
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, camera, drift, flash, text } = L;
const { K, at, dark, souls, beat, lerp2 } = window.PK;

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
function iris(ctx, k, pulse, cx = 540, cy = 840) {
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// flicker-on: faint ember before, a few stutters, then steady
function ignite(t, t0, seed) {
  if (t < t0 - .3) return 0;
  if (t < t0) return .07 * P(t, t0 - .3, t0, E.inQ);
  const u = t - t0, f = Math.floor(u * 30);
  const stut = u < .34 ? (hash(f * 7 + seed * 31) > .42 ? 1 : .3) : 1;
  return E.outQ(P(u, 0, .5)) * stut;
}
// world positions down the pipe (z = distance, xo = across, yo = height above the axis; heads just above the oil)
const MEN = [
  { z: 1.41, xo: -.08, yo: .3, seed: 1 },  // the first light (continues from "hell": same distance, z 1.15, at the start)
  { z: 3.7, xo: .56, yo: .3, seed: 2 },
  { z: 1.26, xo: .55, yo: .33, seed: 3 },
  { z: 6.2, xo: -.42, yo: .3, seed: 4 },
  { z: 2.6, xo: -.62, yo: .31, seed: 5 },
];
const PH = [0, .37, .71, .19, .53];  // heartbeat phases (fall into one beat on '살아')

window.PK.scenes.alive = function (ctx, t, d, info) {
  const tA = at(info, '그런데', .0), t5 = at(info, '다섯', .27), tM = at(info, '모두', .43), tL = at(info, '살아', .65);
  const on = [tA + .08, t5, at(info, '명', .35), tM, tM + .3];   // 2..5 climb with '다섯 명 모두' (all five lit before '살아')
  const sync = P(t, tL - .15, tL + .35, E.inOutQ);
  const bpm = lerp(92, 80, P(t, 0, tL + .5, E.inOutQ));
  const swell = Math.exp(-Math.pow((t - tL - .25) / .45, 2));          // the gentle swell on '살아'
  const reveal = P(t, tA, tL + .4, E.inOutQ);
  const camZ = lerp(.26, -.06, P(t, -.25, tL + .7, E.inOutQ)) - .06 * P(t, tL + .7, d + .3);  // slow dolly back
  const carry = 1 - P(t, 0, tA + 1.1, E.inOutQ);                     // hell's close, warm framing hands over, then eases off
  const lights = MEN.map((m, i) => {
    let a = ignite(t, on[i], m.seed);
    if (i === 0) a = Math.max(a, .62 * (1 - P(t, on[0], on[0] + .3)));   // already glowing weakly from "hell"
    a *= .88 + .12 * noise1(t * 9, i + 3);
    const u = t - on[i], flare = u > 0 ? Math.exp(-u / .5) * P(u, 0, .08) : 0;   // each arrival warms the ring nearest to it
    return Object.assign({}, m, { a, w: 1 + .5 * swell + 3.2 * flare + (i === 0 ? 3.5 * carry : 0) });
  });

  darkFast(ctx, t, { k: .4 + .15 * reveal, seed: 7 });
  const dr = drift(t, .9, 7);
  const p0 = lightXY(MEN[0], camZ);
  const zoom = lerp(1.45, 1.35, reveal) + .04 * P(t, tL, d + .3, E.inOutQ);
  ctx.save();
  camera(ctx, { x: lerp(p0.x, 590, reveal) + dr.x * .6, y: lerp(p0.y + 80 / zoom, 820 + 120 / zoom, reveal) + dr.y, zoom, rot: dr.r, t, seed: 7 });
  const sweep = t > tA && t < tA + 1.8 ? lerp(.4, 10, P(t, tA, tA + 1.8, E.inQ)) : -1;
  povTunnel(ctx, t, { k: .45 + .35 * reveal + .2 * swell, lights, camZ, ripple: .8, sweep, warmK: .1, warmMax: .6 });
  // the five lights, far to near
  const order = [3, 1, 4, 0, 2];
  for (const i of order) {
    const l = lights[i]; if (l.a <= .002) continue;
    const p = lightXY(l, camZ), tb = t + PH[i] * (1 - sync);
    glow(ctx, p.x, p.y + 8, 170 * p.s, '#ff9a3c', (.08 + .06 * swell) * clamp(l.a));
    souls(ctx, tb, [{ x: p.x, y: p.y, a: clamp(l.a), s: p.s * (1.05 + .18 * swell) * (i === 0 ? 1 + .3 * carry : 1) }], { bpm });
    // ignition bloom ring
    const u = t - on[i];
    if (u > 0 && u < .9) {
      const q = E.outC(u / .9);
      glow(ctx, p.x, p.y, (30 + 170 * q) * p.s, '#ffcf8a', .42 * (1 - q) * (i === 0 ? .6 : 1));
    }
  }
  ctx.restore();

  // tunnel vision eases a little as the lights come on, then the dark leans back in
  const hbAll = beat(t, bpm);
  iris(ctx, lerp(.74, .5, reveal) + .08 * P(t, tL + .9, d + .3, E.inOutQ) - .06 * swell, hbAll * sync + .4 * (1 - sync) * beat(t, bpm), 540, 840);

  // a small count that climbs 1 -> 5 with the lights (mirror of the hook's 5 -> 1); beats with them on '살아'
  let n = 0; for (let i = 0; i < 5; i++) if (t >= on[i]) n = i + 1;
  if (n > 0) {
    const tn = on[n - 1], flip = P(t, tn - .02, tn + .22, E.outQ), ca = P(t, on[0] - .1, on[0] + .3, E.outQ);
    const sc = (1 + .06 * beat(t, bpm) * sync + .1 * swell) * lerp(.7, 1, E.outBack(flip));
    const y = 536;
    glow(ctx, 540, y, 120, '#ffb347', (.12 + .18 * swell) * ca);
    ctx.save(); ctx.translate(540, y); ctx.scale(sc, sc);
    text(ctx, String(n), 0, (1 - flip) * -14, { size: 78, weight: 900, color: n === 5 ? '#ffc76a' : '#ffd9a0', stroke: '#000', strokeW: 10, alpha: ca * lerp(.2, 1, flip) });
    ctx.restore();
  }
};
})();
