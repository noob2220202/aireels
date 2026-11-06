// hook: a 30-inch pipe mouth swallows the water; five lights are pulled into the dark; 5 -> 1, one light comes back.
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, rgba, glow, text, camera, drift, flash } = L;
const { K, at, souls, chip, beat } = window.PK;
// PK.dark's sheen texture can index past its hue table for negative noise (crash after the lib hash fix);
// this file keeps a fixed copy (shared cache with "lost": same generator) and composes the sheen at quarter resolution.
function sheenTexH() {
  if (window.PK._sheenRB) return window.PK._sheenRB;
  const { fbm } = L;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenRB = c; return c;
}
function dark(ctx, t, { k = 1, seed = 1, base = '#010203' } = {}) {
  const [b, x] = L.buf('hookDark', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexH(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.drawImage(b, 0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const life = 3 + hash(i * 5 + seed) * 2, ph = ((t / life + hash(i + seed)) % 1);
    const px = hash(i * 7 + seed * 3) * W, py = 520 + hash(i * 11 + seed) * 760, r = 30 + ph * 180;
    ctx.strokeStyle = rgba('#8fd3e8', .08 * k * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, r, r * .28, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function mouth(ctx, t, cx, cy, R, swirl) {
  // flange + bolts
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, R * .8, cx, cy, R * 1.35); g.addColorStop(0, '#3e4a52'); g.addColorStop(.5, '#59666e'); g.addColorStop(1, '#1a2024');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(190,215,225,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * 1.34, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  ctx.fillStyle = '#11171b'; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.18, cy + Math.sin(a) * R * 1.18, R * .045, 0, 7); ctx.fill(); }
  // void
  const v = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); v.addColorStop(0, '#000'); v.addColorStop(.7, '#020405'); v.addColorStop(1, '#0d1519');
  ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  // the bore going away: rings recede toward a vanishing point that wanders a little (depth), faster with the pull
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  const vx = cx + Math.sin(t * .5) * R * .16, vy = cy - R * .1 + Math.cos(t * .4) * R * .06;
  for (let i = 0; i < 10; i++) {
    const z = ((i + (t * (.5 + 1.6 * swirl)) % 1) / 10), s = Math.pow(1 - z, 1.7), rr = R * s;
    if (rr < 2) continue;
    const x = lerp(vx, cx, s), y = lerp(vy, cy, s);
    ctx.strokeStyle = rgba('#7c939e', .3 * s * (1 - P(z, 0, .08) * 0 ) * Math.min(1, z * 6)); ctx.lineWidth = 3.4 * s + .4;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke();
  }
  // weld seam lines running down the bore
  ctx.strokeStyle = 'rgba(124,147,158,.10)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(vx + Math.cos(a) * 3, vy + Math.sin(a) * 3); ctx.stroke(); }
  const core = ctx.createRadialGradient(vx, vy, 0, vx, vy, R * .45); core.addColorStop(0, 'rgba(0,0,0,.95)'); core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  ctx.restore();
  // swirling water streaks being drawn in (denser and brighter as the pull peaks)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const n = Math.round(60 + 70 * swirl);
  for (let i = 0; i < n; i++) {
    const life = .9 + hash(i * 3) * .8, ph = ((t * (0.6 + swirl * 1.6) / life + hash(i * 7)) % 1);
    const r0 = R * (2.7 - ph * 2.5), a0 = hash(i * 13) * 7 + ph * (2.5 + swirl * 3.4) + t * .4;
    const len = .45 + swirl * .85 * (.6 + .4 * hash(i * 17));
    ctx.strokeStyle = rgba(hash(i * 19) > .8 ? '#e2f6ff' : '#a9e6ff', (.05 + .26 * swirl) * Math.sin(ph * Math.PI)); ctx.lineWidth = (1.5 + 3 * hash(i)) * (.6 + .6 * (1 - ph));
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r0), a0, a0 + len); ctx.stroke();
  }
  // suspended silt dragged in along a spiral (short motion streaks)
  for (let i = 0; i < 46; i++) {
    const life = 1.1 + hash(i * 23) * 1.2, sp = .5 + swirl * 1.6, ph0 = hash(i * 29);
    const pos = q => { const ph = ((q * sp / life + ph0) % 1 + 1) % 1, r = R * (3.1 - ph * 2.9), a = hash(i * 31) * 7 + ph * (3 + swirl * 4); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * .92, ph]; };
    const [x1, y1, ph] = pos(t), [x0, y0, ph2] = pos(t - .05);
    if (ph2 > ph) continue;
    ctx.strokeStyle = rgba('#cfeaf5', .35 * Math.sin(ph * Math.PI) * (.4 + .6 * swirl)); ctx.lineWidth = 1.2 + hash(i) * 1.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
}
// one of the five lights: hovering, then pulled in along a tightening spiral
function lightPos(i, tt, tS, cx, cy, R) {
  const k = P(tt, tS - .35 + i * .09, tS + .75 + i * .12, E.inC);
  const a0 = i / 5 * Math.PI * 2 + .6, rr = lerp(R * 2.05 + 40 * hash(i), 6, k), ang = a0 + k * 4.2;
  const hx = noise1(tt * .6, 40 + i) * 14 * (1 - k), hy = noise1(tt * .5, 50 + i) * 12 * (1 - k);
  return { x: cx + Math.cos(ang) * rr + hx, y: cy + Math.sin(ang) * rr * .9 + hy, k };
}
window.PK.scenes.hook = function (ctx, t, d, info) {
  const tS = at(info, '빨려', .3), t5 = at(info, '다섯', .15), t1 = at(info, '한', .62), tLive = at(info, '살아', .8);
  const swirl = clamp(.25 + P(t, 0, tS, E.inQ) * .5 + P(t, tS, tS + .6) * .5 - P(t, t1, t1 + 1.2) * .6);
  dark(ctx, t, { k: .6, seed: 2 });
  const dr = drift(t, 1.2, 3);
  ctx.save();
  camera(ctx, { x: 540 + dr.x, y: 860 + dr.y, zoom: lerp(1.0, 1.22, P(t, 0, d, E.inOutQ)), rot: dr.r, shake: P(t, tS - .1, tS + .3) * (1 - P(t, tS + .9, tS + 1.6)) * .9, t });
  const cx = 540, cy = 860, R = 230;
  // surrounding murky water
  glow(ctx, cx, cy, 760, '#0f4656', .35, 'screen');
  mouth(ctx, t, cx, cy, R, swirl);
  // implosion ring: the pressure difference pulling the water in on '빨려'
  const ir = P(t, tS - .12, tS + .45, E.inQ);
  if (ir > 0 && ir < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#bfe9ff', .35 * Math.sin(ir * Math.PI)); ctx.lineWidth = 3 + 10 * (1 - ir); ctx.beginPath(); ctx.arc(cx, cy, lerp(R * 3.2, R * .95, ir), 0, 7); ctx.stroke(); ctx.restore(); }
  // five lights spiral in after "빨려", dragging warm trails
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const p = lightPos(i, t, tS, cx, cy, R), a = (1 - P(p.k, .85, 1)) * P(t, 0, .35);
    if (p.k > 0 && p.k < 1 && a > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      let q0 = p;
      for (let j = 1; j <= 9; j++) {
        const q = lightPos(i, t - j * .028, tS, cx, cy, R), f = 1 - j / 10;
        ctx.strokeStyle = rgba('#ffb347', .5 * f * a * Math.min(1, p.k * 8)); ctx.lineWidth = 9 * f * lerp(1.1, .4, p.k);
        ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q.x, q.y); ctx.stroke(); q0 = q;
      }
      ctx.restore();
    }
    pts.push({ x: p.x, y: p.y, a, s: lerp(1.1, .3, p.k) });
  }
  souls(ctx, t, pts);
  // one light comes back out of the dark on "살아"
  const back = P(t, t1 + .15, tLive + .35, E.outBack);
  if (back > 0) souls(ctx, t, [{ x: cx + lerp(0, 150, back), y: cy - lerp(0, 380, back), a: back, s: lerp(.3, 1.5, back) }], { bpm: 88 });
  ctx.restore();
  // keep the subtitle band calm under the vortex
  { const g = ctx.createLinearGradient(0, 1150, 0, 1300); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.62)'); ctx.fillStyle = g; ctx.fillRect(0, 1150, W, 150); ctx.fillStyle = 'rgba(1,2,3,.62)'; ctx.fillRect(0, 1300, W, H - 1300); }
  // 5 -> 1 counter
  const c5 = P(t, t5 - .05, t5 + .25, E.outBack), flip = P(t, t1 - .05, t1 + .2, E.inOutQ);
  if (c5 > 0) {
    const y = 875, sc = lerp(.6, 1, c5) * (1 + .04 * beat(t, 80));
    ctx.save(); ctx.translate(540, y); ctx.scale(sc, sc * (1 - Math.sin(flip * Math.PI) * .9));
    const n = flip < .5 ? '5' : '1', col = flip < .5 ? '#ffffff' : '#ffb347';
    text(ctx, n, 0, 0, { size: 230, weight: 900, color: col, stroke: '#000', strokeW: 16, alpha: c5 });
    ctx.restore();
    text(ctx, flip < .5 ? '명이 빨려 들어갔다' : '명만 살아 나왔다', 540, 1222, { size: 46, weight: 800, color: '#cfe8ff', alpha: c5, stroke: '#000', strokeW: 8 });
  }
  // content warning (first ~2.2 s)
  const wa = P(t, .05, .35) * (1 - P(t, 2.0, 2.4));
  chip(ctx, '※ 실제 생존자 음성 포함 · 시청 주의', 540, 492, wa, { size: 30, color: '#ffd9a0', border: 'rgba(255,180,90,.45)' });
  // suction flash
  flash(ctx, .18 * (1 - P(t, tS, tS + .25)) * P(t, tS - .08, tS), '#bfe9ff');
  flash(ctx, .5 * (1 - P(t, 0, .25)), '#000');
};
})();
