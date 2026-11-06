// lost: "네 사람은 끝내 돌아오지 못했습니다."
// Very quiet. The same side cutaway of the dark line as before: high oily water, a thin air gap under the crown, four warm
// lights spaced along it, lit only by themselves. From '끝내' they dim gently, one at a time (not in order along the pipe),
// each taking almost a second; as each goes, the steel and the oil it was lighting go back to black. No bodies, no event,
// nothing else happens: a slow pull back, a slight drift, the breath of the vignette. It ends almost black.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow } = L;
const { at, souls } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
function sheenTexL() {
  if (window.PK._sheenLite) return window.PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = (n * 360 * 1.3 + 200) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLite = c; return c;
}
function darkFastL(ctx, t, k, seed) {
  const [b, x] = L.buf('rbDarkL', 270, 480);
  x.fillStyle = '#010203'; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexL(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}
function iris(ctx, k, pulse, cx, cy) {
  const r0 = H * lerp(.42, .1, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---- the line, side cutaway (as in "decision": tilted a hair, water up near the crown) ----
const TB = { cy: 830, r: 190, wall: 18, X0: 560, SL: -.022 };
const yc = x => TB.cy + TB.SL * (x - TB.X0), topY = x => yc(x) - TB.r, botY = x => yc(x) + TB.r;
const S0 = TB.cy + TB.r - .8 * 2 * TB.r;
const LX = [392, 486, 604, 712], ORDER = [1, 3, 0, 2];
function band(ctx, x0, x1, f0, f1) { ctx.beginPath(); ctx.moveTo(x0, f0(x0)); ctx.lineTo(x1, f0(x1)); ctx.lineTo(x1, f1(x1)); ctx.lineTo(x0, f1(x0)); ctx.closePath(); }

window.PK.scenes.lost = function (ctx, t, d, info) {
  const tK = at(info, '끝내', .3);
  // each light: a quiet fade of almost a second, one after another
  const T0 = tK + .08, STEP = .4, DUR = .86;
  const A = LX.map((_, i) => { const k = ORDER.indexOf(i); return .64 * (1 - P(t, T0 + k * STEP, T0 + k * STEP + DUR, E.inOutQ)); });
  const lightSum = A.reduce((a, b) => a + b, 0) / (4 * .64);
  const surf = x => S0 + Math.sin(x * .021 - t * 1.1) * 1.6 + Math.sin(x * .057 + t * .8) * 1.1;

  const z = lerp(1.3, 1.14, P(t, -.4, d + .3, E.inOutQ)), cx = 552 + fb(t * .3, 7) * 10, cy = 790 + fb(t * .25, 8) * 8;
  darkFastL(ctx, t, .28 * (.4 + .6 * lightSum), 23);
  ctx.save();
  ctx.translate(540, 850); ctx.rotate(fb(t * .22, 9) * .004); ctx.scale(z, z); ctx.translate(-cx, -cy);
  const x0 = cx - 700 / z, x1 = cx + 700 / z;
  const vis = .25 + .75 * lightSum;
  // steel, only where the light reaches
  ctx.fillStyle = rgba('#3a454c', .16 * vis); band(ctx, x0, x1, x => topY(x) - TB.wall, topY); ctx.fill(); band(ctx, x0, x1, botY, x => botY(x) + TB.wall); ctx.fill();
  ctx.strokeStyle = rgba('#a0bec9', .09 * vis); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, topY(x0)); ctx.lineTo(x1, topY(x1)); ctx.moveTo(x0, botY(x0)); ctx.lineTo(x1, botY(x1)); ctx.stroke();
  ctx.fillStyle = rgba('#a0bec9', .03 * vis); for (let x = Math.floor(x0 / 520) * 520 + 140; x < x1; x += 520) { ctx.fillRect(x, topY(x) - TB.wall, 3, TB.wall); ctx.fillRect(x, botY(x), 3, TB.wall); }
  // the oil / water body
  ctx.save(); band(ctx, x0, x1, topY, botY); ctx.clip();
  ctx.beginPath(); ctx.moveTo(x0, botY(x0) + 4); for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, surf(x)); ctx.lineTo(x1, botY(x1) + 4); ctx.closePath();
  const gf = ctx.createLinearGradient(0, S0, 0, TB.cy + TB.r); gf.addColorStop(0, rgba('#16323a', .6)); gf.addColorStop(.15, rgba('#0b1c22', .75)); gf.addColorStop(1, rgba('#020405', .95));
  ctx.fillStyle = gf; ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = A[i]; if (a < .01) continue; const lx = LX[i];
    // warm spill on the crown and down into the oil
    const hw = 150, ty = topY(lx); const lg = ctx.createLinearGradient(lx - hw, 0, lx + hw, 0);
    lg.addColorStop(0, 'rgba(255,154,60,0)'); lg.addColorStop(.5, rgba('#ffb36b', .22 * a)); lg.addColorStop(1, 'rgba(255,154,60,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - hw, ty, hw * 2, 6);
    ctx.save(); ctx.translate(lx, surf(lx)); ctx.scale(.34, 1); const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 240);
    rg.addColorStop(0, rgba('#ff9a3c', .09 * a)); rg.addColorStop(1, 'rgba(255,154,60,0)'); ctx.fillStyle = rg; ctx.fillRect(-240, 0, 480, 240); ctx.restore();
    // reflection on the surface
    for (let s = 0; s < 4; s++) { const w = (17 - s * 3.5) * (.7 + .3 * Math.sin(t * 2.2 + s * 1.9 + lx)); ctx.fillStyle = rgba('#ffc477', a * .16 * (1 - s / 4)); ctx.fillRect(lx - w + Math.sin(t * 1.6 + s) * 3, surf(lx) + 4 + s * 10, w * 2, 1.6); }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba('#8fd3e8', .05 + .14 * lightSum); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = x0; x <= x1 + 10; x += 10) { const y = surf(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  // a few specks in the air gap, barely moving
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const px = x0 + hi(i * 3 + 1) * (x1 - x0) + nz(t * .2 + i, 40) * 18, py = lerp(topY(px) + 8, S0 - 6, hi(i * 5 + 2)) + nz(t * .17 + i * 2, 41) * 6;
    ctx.fillStyle = rgba('#cfe8ff', (.05 + .1 * hi(i * 7)) * (.3 + .7 * lightSum)); ctx.beginPath(); ctx.arc(px, py, .8 + hi(i * 9), 0, 7); ctx.fill();
  }
  ctx.restore();
  // the lights
  const ph = [.13, .41, .7, .27];
  for (let i = 0; i < 4; i++) {
    const a = A[i]; if (a < .004) continue; const lx = LX[i] + nz(t * .3, 50 + i) * 1.5, ly = (topY(lx) + S0) / 2 + nz(t * .25, 60 + i) * 1.5;
    glow(ctx, lx, ly, 150, '#ff9a3c', .07 * a);
    souls(ctx, t + ph[i], [{ x: lx, y: ly, a, s: .8 + .2 * (a / .64) }], { bpm: 60 });
  }
  ctx.restore();
  iris(ctx, .5 + .1 * P(t, tK, d), .5 + .5 * Math.sin(t * Math.PI * 2 * .3), 540, 820);
  // come up from the dip; settle into near-black at the end
  ctx.save(); ctx.fillStyle = `rgba(1,2,3,${(.55 * P(t, d - .9, d + .2, E.inOutQ)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
};
})();
