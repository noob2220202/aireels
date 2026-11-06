// memoriam: "파이잘 쿠르반. 카짐 알리 주니어. 리시 나가사르. 유수프 헨리."
// A dark sea at first light, completely still but for the swell. Four small floating lanterns sit unlit on the water;
// each one is lit exactly on its name's last word (with the bell): the flame catches, a soft ring spreads on the water,
// the warm reflection lengthens. The Korean name comes up with the first word, the English with the light. A small
// light in the centre of each row is lit with its lantern. 'In memoriam · 2022 파리아 잠수부 참사' sits at the foot of
// the focal area from the start; in the last ~2.5 s '고인들의 명복을 빕니다' fades in. No heartbeat here: candle flicker only.
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, text, measure, roundRect, FONT } = L;
const { at, lerp2 } = window.PK;

const HZ = 628;                                     // horizon (screen y)
const LAN = [{ x: 206, y: 792, s: 1.36 }, { x: 428, y: 748, s: 1.14 }, { x: 652, y: 772, s: 1.25 }, { x: 872, y: 738, s: 1.08 }];
const ROW0 = 906, ROWH = 64, RIPY = 1156, MEMY = 1216;

function sky(ctx, t, k) {
  const g = ctx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, '#010203'); g.addColorStop(.45, lerp2('#03070b', '#0a1520', k)); g.addColorStop(.74, lerp2('#07111a', '#1b2a37', k)); g.addColorStop(.93, lerp2('#0f1b24', '#3b4d5c', k)); g.addColorStop(1, lerp2('#16232c', '#566a79', k));
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, HZ + 60);
  // where the sun will come up: a faint, pale warmth on the horizon (very low)
  ctx.save(); ctx.translate(700, HZ + 4); ctx.scale(3.4, .5); glow(ctx, 0, 0, 300, '#e3b892', .2 * k * k, 'screen'); glow(ctx, 0, 0, 110, '#f6dfc4', .16 * k * k, 'screen'); ctx.restore();
  // thin, slow cloud bands
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const y = HZ - 40 - i * 34 - hash(i * 7) * 20, x = ((hash(i * 3) * 1400 + t * (3 + i)) % 1500) - 200, w = 380 + hash(i * 5) * 420;
    const cg = ctx.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, 'rgba(150,175,195,0)'); cg.addColorStop(.5, rgba('#96afc3', (.05 + .03 * hash(i)) * k)); cg.addColorStop(1, 'rgba(150,175,195,0)');
    ctx.fillStyle = cg; ctx.fillRect(x, y, w, 3 + hash(i * 9) * 5);
  }
  ctx.restore();
  ctx.fillStyle = rgba('#c3d6e2', .22 * k); ctx.fillRect(-60, HZ - 1, W + 120, 2);
}
function sea(ctx, t, k) {
  const g = ctx.createLinearGradient(0, HZ, 0, 1420);
  g.addColorStop(0, lerp2('#0c171f', '#26384a', k)); g.addColorStop(.12, lerp2('#060d12', '#0f1d27', k)); g.addColorStop(.45, '#04090c'); g.addColorStop(1, '#010203');
  ctx.fillStyle = g; ctx.fillRect(-60, HZ, W + 120, H - HZ + 60);
  // sky glints on the swell: short horizontal strokes, compressed toward the horizon
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 170; i++) {
    const z = hash(i * 3 + 7), zz = z * z, y = HZ + 3 + zz * 560 + Math.sin(t * .9 + i) * zz * 3;
    const w = 6 + zz * 110 * (.4 + hash(i * 5 + 1)), dir = hash(i * 13 + 2) > .5 ? 1 : -1;
    const x = ((hash(i * 11 + 3) * (W + 400) + t * (4 + 9 * zz) * dir) % (W + 400) + W + 400) % (W + 400) - 200;
    const tw = Math.pow(.5 + .5 * Math.sin(t * (.8 + hash(i * 17) * 1.6) + i * 2.1), 2);
    const a = (.05 + .16 * (1 - z)) * k * tw * (1 - P(y, 1150, 1300));
    if (a < .004) continue;
    ctx.fillStyle = rgba('#a9c4d4', a); ctx.fillRect(x - w / 2, y, w, 1 + zz * 2.2);
  }
  // the pale light laid on the water under the brightest part of the sky
  ctx.save(); ctx.translate(700, HZ + 70); ctx.scale(.9, .55); glow(ctx, 0, 0, 220, '#d9c2a8', .06 * k * k); ctx.restore();
  for (let i = 0; i < 26; i++) {
    const z = hash(i * 7 + 300), y = HZ + 4 + z * z * 230, w = (10 + z * 70) * (.5 + hash(i * 3 + 301)), x = 700 + (hash(i * 5 + 302) - .5) * (60 + z * 260) + Math.sin(t * .7 + i) * 6;
    const a = (.12 * (1 - z) + .03) * k * k * Math.pow(.5 + .5 * Math.sin(t * (1.1 + hash(i) * 1.5) + i * 1.3), 2);
    ctx.fillStyle = rgba('#efd9bf', a); ctx.fillRect(x - w / 2, y, w, 1 + z * 1.6);
  }
  ctx.restore();
  // low mist over the water
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const x = ((hash(i + 41) * 1700 + t * (6 + 4 * hash(i * 3))) % 1700) - 300, y = HZ + 14 + hash(i * 7 + 2) * 70, r = 260 + hash(i * 9) * 200;
    ctx.save(); ctx.translate(x, y); ctx.scale(2.4, .32); const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    mg.addColorStop(0, rgba('#8fa8ba', .07 * k)); mg.addColorStop(1, 'rgba(143,168,186,0)'); ctx.fillStyle = mg; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  }
  ctx.restore();
}
// a small floating lantern: dark float, tapered paper body, a cap; lit = 0..1, boost = brief bloom after lighting
function lantern(ctx, t, i, x, y, s, lit, boost, ring) {
  const fl = 1 + .07 * noise1(t * 6 + i * 13, 70 + i) + .04 * noise1(t * 15 + i * 7, 80 + i), Lt = lit * fl;
  const rot = Math.sin(t * .9 + i * 2.3) * .035;
  // ring on the water when it is lit
  if (ring > 0 && ring < 1) {
    for (let r = 0; r < 2; r++) {
      const q = clamp(ring * 1.15 - r * .15); if (q <= 0 || q >= 1) continue; const rx = (16 + q * 210) * s;
      ctx.strokeStyle = rgba('#ffd9a8', .32 * (1 - q) * (1 - r * .4)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 4 * s, rx, rx * .14, 0, 0, 7); ctx.stroke();
    }
  }
  // reflection, broken by the swell
  if (Lt > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 11; k++) {
      const yy = y + 8 * s + k * 10 * s, ww = (24 - k * 1.7) * s * (.55 + .45 * Math.sin(t * 2.2 + k * 1.3 + i * 1.7));
      const off = Math.sin(t * 1.5 + k * .8 + i * 2) * 4 * s;
      ctx.fillStyle = rgba('#ffb347', (.34 * Lt + .2 * boost) * (1 - k / 11)); ctx.fillRect(x - ww + off, yy, ww * 2, 2.4 * s);
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + 26 * s); ctx.scale(1, .3); glow(ctx, 0, 0, 170 * s, '#ff9a3c', .16 * Lt + .1 * boost); ctx.restore();
    glow(ctx, x, y - 22 * s, 290 * s, '#ff9a3c', .09 * Lt + .1 * boost);
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  // float
  ctx.fillStyle = '#07090b'; roundRect(ctx, -26, -5, 52, 10, 3); ctx.fill();
  // paper body
  ctx.beginPath(); ctx.moveTo(-19, -5); ctx.lineTo(-15, -50); ctx.lineTo(15, -50); ctx.lineTo(19, -5); ctx.closePath();
  ctx.fillStyle = '#121a20'; ctx.fill();
  if (Lt > 0) {
    const gb = ctx.createLinearGradient(-19, 0, 19, 0);
    gb.addColorStop(0, rgba('#b85f1c', Lt)); gb.addColorStop(.3, rgba('#ffc477', Lt)); gb.addColorStop(.5, rgba('#ffe7bd', Lt)); gb.addColorStop(.7, rgba('#ffc477', Lt)); gb.addColorStop(1, rgba('#b85f1c', Lt));
    ctx.fillStyle = gb; ctx.fill();
    const gv = ctx.createLinearGradient(0, -50, 0, -5); gv.addColorStop(0, 'rgba(60,25,5,.35)'); gv.addColorStop(.6, 'rgba(255,240,210,0)'); gv.addColorStop(1, 'rgba(90,40,10,.25)');
    ctx.fillStyle = gv; ctx.fill();
  }
  ctx.strokeStyle = rgba('#2a1a0c', .5 * lit + .2); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -5); ctx.moveTo(-17, -28); ctx.lineTo(17, -28); ctx.stroke();
  // cold dawn rim on the sky side (what makes the unlit lantern readable)
  ctx.strokeStyle = rgba('#a9c1d0', .42 * (1 - .75 * lit)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-19, -5); ctx.lineTo(-15, -50); ctx.lineTo(15, -50); ctx.stroke();
  ctx.fillStyle = '#07090b'; ctx.fillRect(-17, -55, 34, 6);
  ctx.restore();
  if (Lt > 0) { glow(ctx, x, y - 26 * s, 34 * s, '#fff1d6', .55 * Lt + .4 * boost); }
  // waterline: the float sits in the water
  ctx.fillStyle = 'rgba(2,5,8,.75)'; ctx.beginPath(); ctx.ellipse(x, y + 5 * s, 30 * s, 4 * s, 0, 0, 7); ctx.fill();
}

window.PK.scenes.memoriam = function (ctx, t, d, info) {
  const names = info.sc.data.names, line = info.sc.data.line, rip = info.sc.data.rip;
  const F = [at(info, '파이잘', .02), at(info, '카짐', .3), at(info, '리시', .5), at(info, '유수프', .7)];
  const N = [at(info, '쿠르반', .12), at(info, '주니어', .4), at(info, '나가사르', .6), at(info, '헨리', .85)];
  const k = lerp(.4, 1, P(t, -.4, d, E.inOutQ));               // first light coming up
  const tR = d - 2.5;

  // ---- world: sky + sea + lanterns, under a very slow push ----
  const z = lerp(1, 1.035, P(t, -.4, d + .2, E.inOutQ)), dx = fbm(t * .16, 91) * 6, dy = fbm(t * .14, 92) * 4;
  ctx.save(); ctx.translate(540, 820); ctx.rotate(fbm(t * .12, 93) * .002); ctx.scale(z, z); ctx.translate(-540 - dx, -820 - dy);
  sky(ctx, t, k); sea(ctx, t, k);
  for (let i = 0; i < 4; i++) {
    const L0 = LAN[i], tw = N[i] - .05;
    const bx = L0.x + Math.sin(t * .23 + i * 1.9) * 7, by = L0.y + Math.sin(t * 1.05 + i * 1.7) * 2.6 * L0.s;
    const lit = P(t, tw - .04, tw + .4, E.outQ), boost = t > tw ? Math.exp(-(t - tw) * 2.2) * P(t, tw - .04, tw + .08) : 0;
    lantern(ctx, t, i, bx, by, L0.s, lit, boost, P(t, tw, tw + 2.6, E.outQ));
  }
  ctx.restore();
  // keep the subtitle band and the lower frame dark
  { const g = ctx.createLinearGradient(0, 1100, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.8)'); ctx.fillStyle = g; ctx.fillRect(0, 1100, W, 190); ctx.fillStyle = 'rgba(1,2,3,.8)'; ctx.fillRect(0, 1290, W, H - 1290); }

  // ---- names: Korean with the first word, English with the light ----
  for (let i = 0; i < 4; i++) {
    const y = ROW0 + i * ROWH, tw = N[i] - .05;
    const ak = P(t, F[i] - .08, F[i] + .6, E.outC), ae = P(t, tw - .02, tw + .6, E.outC), lit = P(t, tw - .04, tw + .4, E.outQ);
    if (ak > 0) text(ctx, names[i][1], 512, y + 8 * (1 - ak), { size: 42, weight: 700, color: '#f2eadc', align: 'right', alpha: ak });
    if (ae > 0) text(ctx, names[i][0], 568, y + 2 + 8 * (1 - ae), { size: 31, weight: 500, color: '#b3c7d4', align: 'left', alpha: ae });
    // centre light of the row
    const ra = Math.max(ak * .5, lit);
    if (ra > 0) {
      ctx.save(); ctx.globalAlpha = ra * (1 - lit) * .6; ctx.strokeStyle = '#a9c1d0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(540, y, 5, 0, 7); ctx.stroke(); ctx.restore();
      if (lit > 0) { const fl = 1 + .08 * noise1(t * 6 + i * 13, 70 + i); glow(ctx, 540, y, 26, '#ffb347', .55 * lit * fl); ctx.save(); ctx.globalAlpha = lit; ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.arc(540, y, 3.6, 0, 7); ctx.fill(); ctx.restore(); }
    }
  }
  // ---- in memoriam line (foot of the focal area) ----
  const am = P(t, .05, .9, E.outQ);
  if (am > 0) {
    const w = measure(ctx, line, 27, FONT.sub, 700, 2);
    ctx.save(); ctx.globalAlpha = am * .55; ctx.fillStyle = '#8fa6b5'; ctx.fillRect(540 - w / 2 - 70, MEMY, 50, 1.5); ctx.fillRect(540 + w / 2 + 20, MEMY, 50, 1.5); ctx.restore();
    text(ctx, line, 540, MEMY + 1, { size: 27, weight: 700, color: '#a3b8c7', alpha: am * .95, ls: 2 });
  }
  // ---- last ~2.5 s ----
  const ar = P(t, tR, tR + 1.3, E.inOutQ);
  if (ar > 0) text(ctx, rip, 540, RIPY + 10 * (1 - ar), { size: 46, family: FONT.serif, weight: 900, color: '#f3e8d8', alpha: ar, ls: lerp(10, 4, ar) });
};
})();
