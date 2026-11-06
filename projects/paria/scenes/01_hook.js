// hook: a 30-inch pipe mouth swallows the water; five lights are pulled into the dark; 5 -> 1, one light comes back.
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, rgba, glow, text, camera, drift, flash } = L;
const { K, at, dark, souls, chip, beat } = window.PK;
function mouth(ctx, t, cx, cy, R, swirl) {
  // flange + bolts
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, R * .8, cx, cy, R * 1.35); g.addColorStop(0, '#3e4a52'); g.addColorStop(.5, '#59666e'); g.addColorStop(1, '#1a2024');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 7); ctx.fill();
  ctx.fillStyle = '#11171b'; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.18, cy + Math.sin(a) * R * 1.18, R * .045, 0, 7); ctx.fill(); }
  // void
  const v = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); v.addColorStop(0, '#000'); v.addColorStop(.7, '#020405'); v.addColorStop(1, '#0d1519');
  ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  // receding rings inside
  for (let i = 1; i < 7; i++) { const z = ((i - (t * 1.2 * swirl) % 1) / 7); const rr = R * (1 - z) ; ctx.strokeStyle = rgba('#6f8590', .25 * (1 - z)); ctx.lineWidth = 3 * (1 - z) + .5; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, rr), 0, 7); ctx.stroke(); }
  ctx.restore();
  // swirling water streaks being drawn in
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const life = .9 + hash(i * 3) * .8, ph = ((t * (0.6 + swirl * 1.4) / life + hash(i * 7)) % 1);
    const r0 = R * (2.6 - ph * 2.4), a0 = hash(i * 13) * 7 + ph * (2.5 + swirl * 3) + t * .4;
    const len = .5 + swirl * .7;
    ctx.strokeStyle = rgba('#a9e6ff', (.05 + .2 * swirl) * Math.sin(ph * Math.PI)); ctx.lineWidth = 2 + 3 * hash(i);
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r0), a0, a0 + len); ctx.stroke();
  }
  ctx.restore();
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
  // five lights spiral in after "빨려"
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const k = P(t, tS - .35 + i * .09, tS + .75 + i * .12, E.inC);
    const a0 = i / 5 * Math.PI * 2 + .6, rr = lerp(R * 2.05 + 40 * hash(i), 6, k), ang = a0 + k * 4.2;
    pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr * .9, a: (1 - P(k, .85, 1)) * P(t, 0, .35), s: lerp(1.1, .3, k) });
  }
  souls(ctx, t, pts);
  // one light comes back out of the dark on "살아"
  const back = P(t, t1 + .15, tLive + .35, E.outBack);
  if (back > 0) souls(ctx, t, [{ x: cx + lerp(0, 150, back), y: cy - lerp(0, 380, back), a: back, s: lerp(.3, 1.5, back) }], { bpm: 88 });
  ctx.restore();
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
