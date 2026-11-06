// whyme (text hold, ≈89.86-96.14; the subtitles type his words with the label '해리슨 오케네'):
// '매주 (하나님께) 묻습니다.' / ''왜 저만입니까?' / '왜 제 동료들은 죽어야 했습니까?''
// Picks up eleven's row of places exactly where it ended; the hull dissolves, and the row slowly recedes to the horizon of a
// still, dark sea at night: eleven warm places far away, all still lit (the one never found keeps its dotted outline around
// a warm core). In the foreground one warm light (him), alive: a calm heartbeat, its reflection trembling on the water; the
// camera keeps pushing in slowly. '왜 저만입니까?' -> one stronger beat, a ring spreads from him across the water. '왜 제
// 동료들은…' -> the camera lifts a little toward the horizon; a second, wider ring travels out to the far row and the places
// glimmer as it reaches them. His light ends at (540, 926), where "after" picks it up. A document card (badge + AP source) sits right
// above the subtitle lines, like the previous reel's transcript card. The calm piano coda starts here.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK;

const HZ = 600, LX = 540, LY = 884;           // horizon, his light
// the sea at night (grazing view): faint cold glints on a long swell, compressed toward the horizon
function sea(ctx, t, k) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#010203'); g.addColorStop(.24, '#03070a'); g.addColorStop(HZ / H - .002, '#09131a'); g.addColorStop(HZ / H + .002, '#071017'); g.addColorStop(.52, '#03080b'); g.addColorStop(1, '#010203');
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  // a little pale haze on the horizon
  ctx.save(); ctx.translate(540, HZ); ctx.scale(4, .35); glow(ctx, 0, 0, 260, '#5f7f92', .08, 'screen'); ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 150; i++) {
    const z = PK.FIN.hi(i * 3 + 7), zz = z * z, y = HZ + 3 + zz * 640;
    const w = 6 + zz * 120 * (.4 + PK.FIN.hi(i * 5 + 1)), dir = PK.FIN.hi(i * 13 + 2) > .5 ? 1 : -1;
    const x = ((PK.FIN.hi(i * 11 + 3) * (W + 400) + t * (3 + 8 * zz) * dir) % (W + 400) + W + 400) % (W + 400) - 200;
    const tw = Math.pow(.5 + .5 * Math.sin(t * (.7 + PK.FIN.hi(i * 17) * 1.4) + i * 2.1), 2);
    const a = (.03 + .1 * (1 - z)) * tw * (1 - P(y, 1080, 1220));
    if (a < .004) continue;
    ctx.fillStyle = rgba('#9fbfd0', a); ctx.fillRect(x - w / 2, y + Math.sin(t * .8 + i) * zz * 3, w, 1 + zz * 2);
  }
  ctx.restore();
}
// a ring spreading on the water around his light, in perspective: a circle of radius R (in units of his distance) on the
// sea plane, projected; the near side runs out of the frame as it grows, the far side climbs toward the horizon
function waterRing(ctx, R, a, wy, col = '#ffcf9a') {
  if (a <= .003 || R <= 0) return;
  const K = wy - HZ, SX = K / .16;
  ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.6; ctx.beginPath();
  let on = false;
  for (let k = 0; k <= 96; k++) {
    const th = k / 96 * Math.PI * 2, D = 1 + R * Math.cos(th);
    if (D < .2) { on = false; continue; }
    const x = LX + R * Math.sin(th) * SX / D, y = HZ + K / D;
    if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();
}
// document card: transcript glyph + badge line + source line (no recording dot: no audio is played)
function docCard(ctx, s, src, y, a, sa) {
  if (a <= 0) return;
  const F = FONT.sub, bs = 32;
  let ss = 27; if (src) { while (ss > 21 && measure(ctx, src, ss, F, 600) > 900) ss--; }
  const tw = measure(ctx, s, bs, F, 800), sw = src ? measure(ctx, src, ss, F, 600) : 0;
  const w = Math.min(1040, Math.max(tw + 70, sw) + 56), h = src ? 98 : 64, x0 = 540 - w / 2, y0 = y - h / 2;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(3,8,12,.88)'; roundRect(ctx, x0, y0, w, h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(143,211,232,.42)'; ctx.lineWidth = 2.5; ctx.stroke();
  const ly = src ? y0 + 30 : y, gx = 540 - (tw + 46) / 2, gy = ly - 15;
  ctx.strokeStyle = 'rgba(207,232,255,.9)'; ctx.lineWidth = 2; roundRect(ctx, gx, gy, 24, 30, 3); ctx.stroke();
  ctx.fillStyle = 'rgba(207,232,255,.9)'; for (let i = 0; i < 4; i++) ctx.fillRect(gx + 5, gy + 6 + i * 5.5, i === 3 ? 8 : 14, 2);
  ctx.restore();
  text(ctx, s, gx + 46, ly + 2, { size: bs, weight: 800, color: '#e8f4ff', align: 'left', alpha: a });
  if (src && sa > 0) text(ctx, src, 540, y0 + h - 27, { size: ss, weight: 600, color: '#a9c6d6', alpha: a * sa });
}

window.PK.scenes.whyme = function (ctx, t, d, info) {
  const FIN = PK.FIN, { ROW, END, fb, nz } = FIN, D = info.sc.data || {}, sc = info.sc;
  // the three typed lines (absolute -> local)
  let lines = ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1).map(c => c.t0 - sc.t0);
  if (lines.length < 3) lines = [.25, 1.85, 3.45];
  const [tA, tB, tC] = lines;

  const rec = P(t, .25, 2.6, E.inOutQ);                 // the row recedes to the horizon
  const seaK = P(t, .1, 1.5, E.inOutQ);
  const bpm = 58, bt = PK.beat(t, bpm);
  const swell = Math.exp(-Math.pow((t - tB - .25) / .35, 2));   // one stronger beat on '왜 저만입니까?'
  // camera: slow push toward him, then a slight lift toward the horizon on the last line (ends with his light at (540, 926))
  const lift = P(t, tC - .2, tC + 2.2, E.inOutQ);
  const z = lerp(1, 1.22, P(t, .2, d + .3, E.inOutQ)), cx = 540, cy = lerp(850, 822, lift);
  const dk = P(t, 0, 1.2, E.inOutQ) * (1 - .85 * P(t, d - 1.5, d - .1, E.inOutQ));   // drift calms for the hand-off to after
  const dr = { x: fb(t * .28, 171) * 8 * dk, y: fb(t * .24, 172) * 6 * dk, r: fb(t * .2, 173) * .0025 * dk };

  ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(540 + dr.x, 850 + dr.y); ctx.rotate(dr.r); ctx.scale(z, z); ctx.translate(-cx, -cy);
  sea(ctx, t, seaK);
  // rings on the water: the heartbeat (small), '왜 저만입니까?' (one), the last line (a wide one that reaches the horizon)
  const wy = LY + 26;
  for (let k = 0; k < 8; k++) { const t0 = .9 + k * 60 / bpm, u = t - t0; if (u < 0 || u > 2.2) continue; const q = u / 2.2; waterRing(ctx, .015 + q * .09, .14 * (1 - q) * seaK, wy); }
  { const u = t - tB - .2; if (u > 0 && u < 3.2) { const q = u / 3.2; waterRing(ctx, .02 + E.outC(q) * .3, .3 * (1 - q), wy); } }
  let reach = 0;
  { const u = t - tC - .1; if (u > 0 && u < 4.5) { const q = clamp(u / 3); waterRing(ctx, .02 + E.inOutQ(q) * 9, .26 * (1 - .6 * q) * (1 - P(u, 3, 4.5)), wy);
      reach = P(q, .7, 1) * (1 - P(u, 3, 4.5)); } }
  // his reflection on the water, broken by the swell
  const lA = P(t, .3, 1, E.outQ);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) {
    const yy = wy + 6 + k * 12, ww = (42 - k * 2.2) * (.55 + .45 * Math.sin(t * 2 + k * 1.3));
    ctx.fillStyle = rgba('#ffb347', (.22 + .1 * bt + .15 * swell) * (1 - k / 14) * lA * seaK); ctx.fillRect(LX - ww + Math.sin(t * 1.4 + k * .8) * 6, yy, ww * 2, 3.4);
  }
  ctx.restore();
  ctx.restore();

  // ---- the row: from eleven's end positions to the far horizon (screen space mapped through this scene's camera) ----
  // all eleven stay warm and lit as they recede (no outlines that could read as switched-off bulbs)
  const toS = (x, y) => [540 + dr.x + (x - cx) * z, 850 + dr.y + (y - cy) * z];
  const ls0 = (END.ls || .84) * END.z;
  for (let i = 0; i < ROW.n; i++) {
    const x0 = 540 + (ROW.x(i) - END.cx) * END.z, y0 = 850 + (ROW.y - END.cy) * END.z;          // eleven's last frame (screen)
    const [x1, y1] = toS(540 + (i - 5) * 50, HZ - 8);
    const e = rec, x = lerp(x0, x1, e), y = lerp(y0, y1, E.inOutQ(e)) + Math.sin(t * .6 + i * 1.3) * 2.2 * (1 - e);
    const s = lerp(ls0, .52, e), sh = 1 + .04 * Math.sin(t * 1.05 + i * 1.7);
    const gl = reach * Math.exp(-Math.pow((i - 5) / 3.5, 2) * .2) * (.6 + .4 * Math.sin(t * 6 + i));
    if (i === ROW.empty) {        // the one never found: his dotted outline around a warm core of its own
      FIN.crewRing(ctx, t, x, y, lerp(.92, .7, e) + .3 * gl, lerp(1.25 * END.z, 1, e));
      FIN.crewLight(ctx, x, y, (lerp(.45, .6, e) + .3 * gl) * sh, lerp(.8 * ls0, .46, e));
    } else FIN.crewLight(ctx, x, y, (lerp(.95, .75, e) + .35 * gl) * sh, s);
    // tiny warm reflection under each far place
    if (e > .5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#ffb347', .16 * P(e, .5, 1)); ctx.fillRect(x - 7, y + 15, 14, 2); ctx.fillRect(x - 4, y + 21, 8, 1.6); ctx.restore(); }
  }

  // ---- him: one warm light, alive (size handed on to "after": souls s 2.6 at (540, 926)) ----
  const [sx, sy] = toS(LX, LY + Math.sin(t * .9) * 2.5);
  if (lA > 0) {
    glow(ctx, sx, sy, 500 * (1 + .1 * bt), '#ff9a3c', (.1 + .05 * bt + .08 * swell) * lA);
    PK.souls(ctx, t, [{ x: sx, y: sy, a: lA, s: 2.6 + .6 * swell }], { bpm });
  }

  // ---- quiet frame + document card ----
  { const g = ctx.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, 'rgba(1,2,3,.8)'); g.addColorStop(.8, 'rgba(1,2,3,.4)'); g.addColorStop(1, 'rgba(1,2,3,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 470); }
  FIN.subBand(ctx, .88, 1120);
  const ba = P(t, .3, .7, E.outQ) * (1 - P(t, d - .25, d + .1));
  docCard(ctx, D.badge || '', D.src || '', 1183 + 8 * (1 - ba), ba, P(t, .45, .9, E.outQ));
};
})();
