// memorial (≈106.94-112.92): "재스콘 4호 선원 열한 분의 명복을 빕니다." (no subtitles here: the scene carries its own text)
// Dawn at sea, seen at the waterline: the sky above slowly paling toward a warm horizon, the water below. Eleven warm lights
// (the same row spacing as in "eleven"; all eleven equally warm, the one never found marked only by a faint dotted halo around
// his light) rise slowly, unhurried and not in order, from the dark below. '재스콘' -> they begin to rise and
// 'In memoriam · 재스콘 4호 선원 11명 · 2013.5.26' fades in below (the scene carries the dedication for sound-off viewers);
// '열한 분의' -> the first ones reach the surface, each laying a soft ring on the water, and '고인들의 명복을 빕니다' comes up;
// '명복을' (bell) -> the last settles, the row is complete on the surface and the horizon warms. Then stillness: the
// lights float with the swell while the view drifts very slowly closer. No names (not reliably published).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, FONT } = L;
const PK = window.PK;

const HZ = 726;                                    // waterline = horizon (camera at the surface)
const RIPY = 968, MEMY = 1040;
function sky(ctx, t, k, warm) {
  const lc = PK.lerp2;
  const g = ctx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, lc('#010203', '#03060c', k)); g.addColorStop(.38, lc('#03070c', '#0c1a2c', k)); g.addColorStop(.7, lc('#07111b', '#26384e', k)); g.addColorStop(.9, lc('#0e1b25', '#566577', k)); g.addColorStop(1, lc('#16232c', '#8f8a86', k));
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, HZ + 100);
  // where the sun will come up: a pale warmth low on the horizon
  ctx.save(); ctx.translate(730, HZ + 6); ctx.scale(3.6, .5);
  glow(ctx, 0, 0, 330, '#e3b48c', (.26 + .22 * warm) * k * k, 'screen'); glow(ctx, 0, 0, 120, '#f6dcbf', (.2 + .25 * warm) * k * k, 'screen'); ctx.restore();
  // the last stars, fading with the dawn
  ctx.save(); for (let i = 0; i < 46; i++) { const sx = PK.FIN.hi(i * 13 + 1) * W, sy = PK.FIN.hi(i * 7 + 3) * HZ * .62, tw = .5 + .5 * Math.sin(t * (1.3 + PK.FIN.hi(i) * 2) + i * 2.7);
    ctx.fillStyle = rgba('#dfe9f2', (.18 + .3 * PK.FIN.hi(i * 5)) * tw * (1 - .8 * k) * (1 - sy / (HZ * .7))); ctx.fillRect(sx, sy, 1.6 + PK.FIN.hi(i * 3) * 1.4, 1.6 + PK.FIN.hi(i * 3) * 1.4); } ctx.restore();
  // thin, slow cloud bands (soft, stretched)
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const y = HZ - 60 - i * 44 - PK.FIN.hi(i * 7) * 24, x = ((PK.FIN.hi(i * 3) * 1400 + t * (3 + i)) % 1500) - 200, w = 380 + PK.FIN.hi(i * 5) * 420;
    ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(w / 200, .07 + .05 * PK.FIN.hi(i * 9)); glow(ctx, 0, 0, 100, '#b8c4cc', (.08 + .06 * PK.FIN.hi(i)) * k, 'screen'); ctx.restore();
  }
  ctx.restore();
}
function surfY(x, t) { return HZ + Math.sin(x * .011 + t * .9) * 3.2 + Math.sin(x * .027 - t * 1.3) * 1.6; }
function under(ctx, t, k) {
  const g = ctx.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, PK.lerp2('#0b2430', '#1d4a5a', k)); g.addColorStop(.12, PK.lerp2('#061620', '#0f2c38', k)); g.addColorStop(.4, '#040c11'); g.addColorStop(1, '#010203');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-100, H + 100); for (let x = -100; x <= W + 110; x += 12) ctx.lineTo(x, surfY(x, t)); ctx.lineTo(W + 100, H + 100); ctx.closePath(); ctx.fill();
  // dawn light falling into the water
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x0 = 140 + i * 140 + Math.sin(t * .3 + i * 1.9) * 30, w = 30 + 40 * PK.FIN.hi(i * 5 + 4), al = .045 * k * (.4 + .6 * (.5 + .5 * Math.sin(t * .7 + i * 2.1)));
    const sg = ctx.createLinearGradient(0, HZ, 0, HZ + 560); sg.addColorStop(0, rgba('#bfe6f0', al)); sg.addColorStop(1, 'rgba(191,230,240,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x0 - w * .3, HZ); ctx.lineTo(x0 + w * .3, HZ); ctx.lineTo(x0 + w * 1.5 - 80, HZ + 560); ctx.lineTo(x0 - w * 1.5 - 80, HZ + 560); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the surface line, catching the sky
  ctx.save(); ctx.strokeStyle = rgba('#d9e6ee', .28 + .25 * k); ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -100; x <= W + 110; x += 12) { const y = surfY(x, t); x === -100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
}

window.PK.scenes.memorial = function (ctx, t, d, info) {
  const FIN = PK.FIN, { ROW, hi, fb, nz, wt } = FIN, D = info.sc.data || {};
  const tJ = wt(info, '재스콘', .02), tS = wt(info, '선원', .3), tY = wt(info, '열한', .45), tM = wt(info, '명복을', .62);
  const k = lerp(.4, 1, P(t, -.4, d, E.inOutQ)), warm = P(t, tM - .1, tM + 1.6, E.inOutQ);
  // rise schedule: unhurried, not in order; all on the surface by '명복을'
  const RS = []; for (let i = 0; i < ROW.n; i++) { const s0 = tJ - .1 + hi(i * 17 + 5) * .55, s1 = Math.min(tM - .02, tY - .25 + hi(i * 29 + 3) * (tM - tY + .2)); RS.push([s0, Math.max(s0 + 1.2, s1)]); }

  // very slow drift closer
  const z = lerp(1, 1.08, P(t, .2, d + .4, E.inOutQ)), dx = fb(t * .16, 201) * 5, dy = fb(t * .14, 202) * 4;
  ctx.save(); ctx.translate(540, HZ); ctx.rotate(fb(t * .12, 203) * .0015); ctx.scale(z, z); ctx.translate(-540 - dx, -HZ - dy);
  sky(ctx, t, k, warm);
  under(ctx, t, k);
  L.motes(ctx, t, { n: 50, color: '#bcd8e2', a: .18, size: 2, speed: 5, seed: 207, area: [-40, HZ + 30, W + 80, 600] });
  // the lights
  for (let i = 0; i < ROW.n; i++) {
    const [s0, s1] = RS[i], u = P(t, s0, s1, E.inOutQ);
    const x = ROW.x(i) + Math.sin(t * .7 + i * 2.1) * 8 * (1 - u) + (hi(i * 3 + 9) - .5) * 40 * (1 - u);
    const y0 = 1010 + hi(i * 7 + 2) * 90, sy = surfY(x, t) - 2;
    const y = lerp(y0, sy, u);
    const settled = P(t, s1 - .05, s1 + .3), ring = t - s1;
    if (ring > 0 && ring < 2.6) {          // a soft ring on the water as it arrives
      const q = ring / 2.6; ctx.save(); ctx.strokeStyle = rgba('#ffd9a8', .32 * (1 - q) * (1 - q)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, sy + 1, 14 + E.outC(q) * 120, 2.5 + E.outC(q) * 9, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    // every place is the same warm light; the one never found keeps only a faint dotted halo around his
    const a = lerp(.4, 1, u) * (1 + .05 * Math.sin(t * 1.1 + i * 1.7) + .03 * nz(t * 2, 60 + i));
    FIN.crewLight(ctx, x, y, a, lerp(.95, 1.1, u));
    if (i === ROW.empty) FIN.crewRing(ctx, t, x, y, .35 * lerp(.6, 1, u), 1.75);
    // on the surface: warm light laid on the water, above and below
    if (settled > 0) {
      ctx.save(); ctx.translate(x, sy + 3); ctx.scale(1, .22); glow(ctx, 0, 0, 90, '#ffb347', .2 * settled); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 6; s++) { const w = (16 - s * 2.2) * (.6 + .4 * Math.sin(t * 2.2 + s * 1.3 + i)); ctx.fillStyle = rgba('#ffc477', .14 * settled * (1 - s / 6)); ctx.fillRect(x - w + Math.sin(t * 1.6 + s + i) * 3, sy + 10 + s * 12, w * 2, 2); }
      ctx.restore();
    }
  }
  ctx.restore();

  // keep the lower frame dark
  { const g = ctx.createLinearGradient(0, 1100, 0, 1300); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.85)'); ctx.fillStyle = g; ctx.fillRect(0, 1100, W, 200); ctx.fillStyle = 'rgba(1,2,3,.85)'; ctx.fillRect(0, 1300, W, H - 1300); }

  // ---- text (subtitles are off here, so the dedication is carried from the first word) ----
  const line = D.line || '', rip = D.rip || '', v0 = info.sc.voice_t - info.sc.t0;
  const amT = Math.max(v0, tS - .1), am = P(t, amT, amT + .8, E.outQ);   // after the rising lights have cleared the line
  if (line && am > 0) {
    let ls = 38; while (ls > 30 && measure(ctx, line, ls, FONT.sub, 700, 2) > 900) ls--;
    const w = measure(ctx, line, ls, FONT.sub, 700, 2), bl = Math.max(0, Math.min(50, (1040 - w) / 2 - 24));
    if (bl > 8) { ctx.save(); ctx.globalAlpha = am * .6; ctx.fillStyle = '#b4c8d4'; ctx.fillRect(540 - w / 2 - 20 - bl, MEMY, bl, 1.5); ctx.fillRect(540 + w / 2 + 20, MEMY, bl, 1.5); ctx.restore(); }
    text(ctx, line, 540, MEMY + 1, { size: ls, weight: 700, color: '#d2dee6', alpha: am, ls: 2, shadow: { color: 'rgba(0,0,0,.55)', blur: 10, y: 2 } });
  }
  const ar = P(t, tY - .05, tY + 1.1, E.inOutQ);
  if (rip && ar > 0) text(ctx, rip, 540, RIPY + 10 * (1 - ar), { size: 60, family: FONT.serif, weight: 900, color: '#f3e8d8', alpha: ar, ls: lerp(10, 4, ar), shadow: { color: 'rgba(0,0,0,.6)', blur: 18, y: 4 } });
};
})();
