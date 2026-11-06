// scene module: ending (69.14 – 74.38 s). The two hypotheses are acted out on the wall, then the ivy regrows and the
// hatch slams shut back to the exact framing of the first frame of 01_hook.js (shared renderer: window.KL.loopWall).
// (1) 처음부터 벽 속에 있었을까: the bag materialises in the cavity, the door closes, 22-year time-lapse (1997 → 2019).
// rewind in the pause before 누군가 (the year counter dissolves mid-spin: no year is paired with hypothesis 2).
// (2) 누군가 몰래 돌려놓았을까: an anonymous, neutral-rimmed silhouette is already stepping in on 누군가, pushes the bag
// into the hatch and walks off; its legs dissolve above the subtitle band. No closing card (nothing beyond the labels).
(function () {
'use strict';
const { W, H, P, E, clamp, lerp, hash, noise1, rgba, text, measure, roundRect, glow, motes, tint, FONT } = L;
const { K, drawBag, label, at, vend } = window.KL;

function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], (ks[i][2] || E.inOutQ)(clamp((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]))));
  return ks[ks.length - 1][1];
}
// E.outBack(0) is 2e-16, not 0: guard so 'not started' really is zero
const OB = (x, s) => (x <= 0 ? 0 : E.outBack(x, s));
const pulse = (t, t0, w = 7) => (t > t0 - .04 ? Math.exp(-Math.pow((t - t0) * w, 2)) : 0);
const bagPath = (c, w, h) => { c.beginPath(); c.moveTo(-w * .5, h * .5); c.bezierCurveTo(-w * .62, h * .1, -w * .55, -h * .35, -w * .3, -h * .45); c.bezierCurveTo(-w * .1, -h * .62, w * .15, -h * .4, w * .32, -h * .5); c.bezierCurveTo(w * .55, -h * .3, w * .6, h * .15, w * .5, h * .5); c.closePath(); };

// hypothesis tab: [가설 (n) text]
function hypo(ctx, n, s, x, y, a, accent) {
  if (a <= 0) return;
  const size = 42, tw = measure(ctx, '가설', size, FONT.disp, 400), sw = measure(ctx, s, size, FONT.sub, 800), cr = 22, pad = 26;
  const w = pad + 12 + tw + 14 + cr * 2 + 16 + sw + pad, h = 84;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba(accent, .85); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = accent; ctx.fillRect(-w / 2 + 10, -h / 2 + 14, 7, h - 28);
  let cx = -w / 2 + pad + 12;
  text(ctx, '가설', cx, 3, { size, family: FONT.disp, weight: 400, color: accent, align: 'left' }); cx += tw + 14 + cr;
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, 0, cr, 0, 7); ctx.fill();
  text(ctx, String(n), cx, 3, { size: 32, family: FONT.disp, weight: 400, color: '#0b0c10' }); cx += cr + 16;
  text(ctx, s, cx, 3, { size, weight: 800, color: '#f4f1ea', align: 'left' });
  ctx.restore();
}
// "rewind" glyph (two left triangles)
function rewindIcon(ctx, x, y, s, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#f4f1ea'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 12;
  for (const ox of [0, s * .9]) { ctx.beginPath(); ctx.moveTo(x + ox - s * .45, y); ctx.lineTo(x + ox + s * .45, y - s * .5); ctx.lineTo(x + ox + s * .45, y + s * .5); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

window.KL.scenes.ending = function (ctx, t, d, info) {
  const LW = window.KL.loopWall;
  const tau = t - d;                                     // loop clock: 0 on the last frame = hook's first frame
  const tA = at(info, '처음부터', .02), tWall = at(info, '벽', .2), tSok = at(info, '속에', .25), tQ1 = at(info, '있었을까', .32),
    tB = at(info, '누군가', .52), tSec = at(info, '몰래', .68), tRet = at(info, '돌려놓았을까', .75), ve = vend(info);
  const { HX, HY, HS } = LW;

  // ---- phases
  const gA = P(t, tA + .05, tA + .55, E.inOutQ);                       // (1) the bag appears inside the cavity
  const c1 = E.inOutC(P(t, tWall - .05, tSok + .28));                  // (1) door closes over it
  const tR0 = tB - .4, tR1 = tB - .08;                                 // rewind window (in the pause before 누군가)
  const tl = P(t, tQ1 - .1, tR0 - .02, E.inOutQ);                      // (1) 22 years time-lapse
  const rw = P(t, tR0, tR1, E.inOutQ);                                 // rewind
  const rwA = Math.sin(Math.PI * rw);
  const tWalk0 = tB - .12, tStop = tSec + .04, tRel = tRet + .06, tTurn = tRel + .26, tGone = ve + .02;
  const reach = P(t, tStop - .04, tRel, E.inOutQ), retract = P(t, tRel + .02, tTurn, E.inOutQ);
  const tSlam = ve + .6, close = E.inQ(P(t, ve + .1, tSlam));
  const slamK = t > tSlam ? Math.exp(-(t - tSlam) * 7) : 0, settle = 1 - P(t, d - .45, d - .08);

  // ---- door
  let open;
  if (t < tR0) open = 1 - c1;
  else if (t < ve + .1) open = lerp(1 - c1, 1, rw);
  else open = 1 - close;
  if (t > tSlam) open += .05 * Math.abs(Math.sin((t - tSlam) * 26)) * slamK * settle;
  const jf = Math.floor(t * 40), jit = .55 * pulse(t, tSok + .3, 9) + slamK * settle;
  const jx = jit * (hash(jf) - .5) * 6, jy = jit * (hash(jf + 77) - .5) * 5;

  // ---- ivy
  const regrow = P(t, ve + .05, ve + .78);
  const lateFade = P(t, tQ1 - .05, tQ1 + .45) * (1 - rw);           // (1) time-lapse: ring fades in (cheap cached path)
  const cov = P(t, tQ1 + .05, tR0) * (1 - rw);
  const sway = 1 + .9 * rwA + .5 * Math.sin(Math.PI * tl) + .6 * Math.sin(Math.PI * regrow);
  const gust = .7 * rwA * Math.sin(t * 30) + .4 * Math.sin(Math.PI * regrow);

  // ---- camera: slow push during (1), kick on the rewind, widen for (2) right on 누군가 (so the figure is
  // already in frame), then settle on the hook framing
  const tWide = tB + .32;
  const zoom = keys(t, [[0, 1.16], [tR0, 1.27, E.inOutQ], [tR1, 1.13, E.inOutC], [tWide, .9, E.outC], [ve - .1, .95, E.inOutQ], [d - .02, 1, E.inOutC]]) - .025 * pulse(t, tSok + .3, 8);
  const cx = keys(t, [[0, 540], [tR1, 540], [tWide, 640, E.outC], [ve - .1, 628, E.inOutQ], [d - .02, 540, E.inOutC]]);
  const cy = keys(t, [[0, 842], [tR0, 850, E.inOutQ], [tR1, 842, E.inOutC], [tWide, 905, E.outC], [ve - .1, 898, E.inOutQ], [d - .02, 805, E.inOutC]]);
  const shake = .35 * rwA + .45 * slamK * settle;
  const seep = t > tSlam ? LW.seepRest(tau) : 0;

  // ---- the figure for hypothesis (2): an anonymous silhouette, never a face (smaller + higher so the feet stay
  // above the subtitle band; the shoulder still lines up with the hatch)
  const FX = 900, FY = 1262, FH = 610, WALK0 = 260;
  const walkIn = P(t, tWalk0, tStop, E.outQ), walkOut = P(t, tTurn, tGone + .3, E.inQ);
  const figA = P(t, tWalk0 - .05, tWalk0 + .2) * (1 - P(t, ve - .35, tGone)) * (.9 + .1 * noise1(t * 6, 3));
  let fig = null;
  if (figA > 0) {
    const out = t > tTurn;
    const x = out ? lerp(FX, FX + 380, walkOut) : lerp(FX + WALK0, FX, walkIn);
    const walking = out ? walkOut > 0 && walkOut < 1 : walkIn < 1;
    const phase = out ? walkOut * Math.PI * 2 : walkIn * Math.PI * 2;
    const armR = out ? [-.05, .12] : [lerp(.12, 1.48, reach) * (1 - retract) + .12 * retract, lerp(.1, .04, reach)];
    const lean = .09 * reach * (1 - retract);
    fig = { x, out, walking, phase, armR, lean };
  }
  // bag position: carried -> pushed into the cavity -> released
  const cavBag = [HX, HY + 60, 225, 125];
  let bagWorld = null; const bagIn = t >= tRel;

  // ---- render the wall
  const m = LW.draw(ctx, tau, {
    cam: { x: cx, y: cy, zoom, shake, hh: .7 }, open, jx, jy, sway, gust, seep, late: regrow > 0 ? regrow : undefined, lateFade: regrow > 0 ? undefined : lateFade, cover: cov > 0 ? cov : null, amb: 1,
    inside(c, L0, T0, s) {
      const gg = c.createRadialGradient(L0 + s / 2, T0 + s / 2, 10, L0 + s / 2, T0 + s / 2, s * .7); gg.addColorStop(0, 'rgba(46,36,28,.65)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(L0, T0, s, s);
      // (1) the painting in its bag "materialises" in the cavity (a hypothesis, drawn translucent with a scan line)
      const ga = gA * (1 - rw);
      if (ga > 0 && t < tB + .3) {
        const sy = lerp(T0, T0 + s, gA);
        c.save(); c.beginPath(); c.rect(L0, T0, s, sy - T0); c.clip(); c.globalAlpha = .82 * (1 - rw);
        LW.canvasSprite(c, HX, HY - 5, .3, .04); drawBag(c, HX, HY + 60, 225, 125, 0, t); c.restore();
        if (gA < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(K.goldHi, .8 * (1 - gA)); c.fillRect(L0, sy - 2, s, 4); c.restore(); glow(c, HX, sy, 120, K.gold, .5 * (1 - gA)); }
      }
      // (2) the bag that was put back
      if (bagIn) drawBag(c, cavBag[0], cavBag[1], cavBag[2], cavBag[3], 0, t);
    },
    after(c, m) {
      // (1) X-ray view through the closed door: the bag stays visible inside the wall while the ivy grows over it
      const xa = c1 * (1 - rw) * (t < tB + .3 ? 1 : 0);
      if (xa > 0) {
        const L0 = HX - HS / 2, T0 = HY - HS / 2;
        c.save(); c.beginPath(); c.rect(L0 - 6, T0 - 6, HS + 12, HS + 12); c.clip();
        c.globalAlpha = .45 * xa; c.fillStyle = '#04070b'; c.fillRect(L0 - 6, T0 - 6, HS + 12, HS + 12);
        c.globalAlpha = .22 * xa; LW.canvasSprite(c, HX, HY - 5, .3, .04);
        c.globalAlpha = xa * (.75 + .25 * Math.sin(t * 6)); c.strokeStyle = K.goldHi; c.lineWidth = 3.5; c.setLineDash([12, 8]); c.lineDashOffset = -t * 40;
        c.save(); c.translate(HX, HY - 5); c.rotate(.04); c.strokeRect(-90, -105, 180, 210); c.restore();
        c.save(); c.translate(HX, HY + 60); bagPath(c, 225, 125); c.fillStyle = 'rgba(4,6,9,.75)'; c.fill(); c.stroke(); c.restore();
        c.restore();
        glow(c, HX, HY + 20, 200, K.gold, .22 * xa * (.8 + .2 * Math.sin(t * 6)));
      }
      // (2) anonymous silhouette carries a bag to the hatch, pushes it in, walks away
      if (fig) {
        const [b, bx] = L.buf('kl_end_fig', 800, 1040); bx.clearRect(0, 0, 800, 1040);
        const o = { coat: true, coatLen: 2.1, face: 1, flip: !fig.out, rim: 'rgba(236,206,160,.72)', rimX: fig.out ? -4 : 4, rimY: -3, rimBlur: 8, shadow: false, fill: '#05060a', lean: fig.lean, armR: fig.armR };
        if (fig.walking) { o.walk = fig.phase; o.stride = .36; }
        const fi = F.figure(bx, 400, 1000, FH, o);
        // reconstruction look (it is a hypothesis, not footage): fine scanlines cut through the silhouette
        bx.globalCompositeOperation = 'destination-out'; bx.fillStyle = 'rgba(0,0,0,.32)';
        const so = Math.floor(t * 40) % 7; for (let y = 240 + so; y < 1010; y += 7) bx.fillRect(0, y, 800, 2);
        // legs dissolve into the dark before the subtitle band (screen y 1170 → 1250, mapped into the buffer)
        const by0 = (1170 - m.f) / m.d - (FY - 1000), by1 = (1250 - m.f) / m.d - (FY - 1000);
        if (by0 < 1040) { const fg = bx.createLinearGradient(0, by0, 0, by1); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)'); bx.fillStyle = fg; bx.fillRect(0, Math.max(0, by0), 800, 1040 - Math.max(0, by0)); }
        bx.globalCompositeOperation = 'source-over';
        // world position of the right hand (figure() returns it in its local, un-flipped, lean-rotated frame)
        const [hx0, hy0] = fi.hands[1], cl = Math.cos(fig.lean), sl = Math.sin(fig.lean), fs = o.flip ? -1 : 1;
        const hx = fig.x + fs * (hx0 * cl - hy0 * sl), hy = FY + hx0 * sl + hy0 * cl;
        if (!bagIn) {
          const k = E.inOutQ(clamp((reach - .55) / .45));
          bagWorld = [lerp(hx, cavBag[0], k), lerp(hy + 58, cavBag[1], k), lerp(190, cavBag[2], k), lerp(118, cavBag[3], k)];
        }
        c.save(); c.globalAlpha *= figA;
        c.drawImage(b, fig.x - 400, FY - 1000);
        if (bagWorld) drawBag(c, bagWorld[0], bagWorld[1], bagWorld[2], bagWorld[3], 0, t);
        c.restore();
        // question mark over the silhouette
        const qa = OB(P(t, tRet - .05, tRet + .2)) * (1 - P(t, ve - .3, ve));
        if (qa > 0) {
          const qx = fig.x - 10 * fs, qy = FY - FH - 95 + Math.sin(t * 5) * 6;
          c.save(); c.translate(qx, qy); c.scale(qa, qa);
          glow(c, 0, 0, 110, K.red, .35);
          text(c, '?', 0, 6, { size: 150, family: FONT.disp, weight: 400, color: K.red, stroke: '#000', strokeW: 10 });
          c.restore();
        }
      }
      // slam: dust shaken off the frame
      const dt = t - tSlam;
      if (dt > 0 && dt < .7) {
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) {
          const u = hash(i * 7 + 1), side = i % 2 ? 1 : -1, px = HX - HS / 2 + u * HS + side * 6 * dt, py = HY - HS / 2 - 8 + (60 + 160 * hash(i * 3)) * dt + 140 * dt * dt;
          c.fillStyle = rgba('#d8d0c0', (1 - dt / .7) * .55 * hash(i * 13 + 2)); c.beginPath(); c.arc(px, py, 1.5 + 2.5 * hash(i * 5), 0, 7); c.fill();
        }
        c.restore();
      }
    },
  });

  // ---- screen-space layer
  // time-lapse light sweeps (days passing)
  if (tl > 0 && tl < 1) {
    const ph = (Math.pow(tl, 1.25) * 3) % 1, a = .13 * Math.sin(Math.PI * tl);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(540, 960); ctx.rotate(.38); const x = lerp(-1100, 1100, ph);
    const g = ctx.createLinearGradient(x - 240, 0, x + 240, 0); g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(.5, rgba('#ffd696', a)); g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 240, -1400, 480, 2800); ctx.restore();
  }
  // rewind: tracking glitch + desaturation
  if (rwA > .02) {
    tint(ctx, '#7d8a96', .28 * rwA, 'color');
    const f = Math.floor(t * 30);
    const [sb, sx] = L.buf('kl_end_snap'); sx.drawImage(ctx.canvas, 0, 0);   // one snapshot, then shifted slices from it
    for (let i = 0; i < 7; i++) { const yy = Math.floor(hash(f * 13 + i) * H), hh = 14 + Math.floor(hash(f * 7 + i) * 70), off = Math.round((hash(f * 3 + i) - .5) * 90 * rwA); ctx.drawImage(sb, 0, yy, W, hh, off, yy, W, hh); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { ctx.fillStyle = rgba('#ffffff', .1 * rwA); ctx.fillRect(0, ((hash(f + i * 5) * H) + t * 900) % H, W, 2 + 3 * hash(i + f)); } ctx.restore();
  }
  // year counter: 1997 -> 2019 during (1); on the rewind it starts spinning back and dissolves mid-spin, so no year
  // is ever shown next to hypothesis (2); the rewind glyph slides to the centre and carries the rest of the rewind
  const ycOut = P(t, tR0 + .04, tR0 + .17);
  const yc = P(t, tQ1 - .16, tQ1 + .02) * (1 - ycOut);
  if (yc > 0) {
    const yf = t < tR0 ? lerp(1997, 2019, tl) : lerp(2019, 1997, rw);
    LW.yearCounter(ctx, 540, 650, Math.min(yf, 2019), yc, 66);
  }
  rewindIcon(ctx, lerp(540 - 230, 540 - 20, E.inOutQ(ycOut)), 650, lerp(34, 44, ycOut), clamp(rwA * 1.4));
  // hypothesis tabs
  const a1 = OB(P(t, tA - .02, tA + .3)), out1 = P(t, tB - .2, tB + .05, E.inQ);
  const a2 = OB(P(t, tB, tB + .3));
  const sum = OB(P(t, ve - .08, ve + .2)), sumOut = P(t, tSlam - .12, tSlam + .12);
  if (sum <= 0) {
    if (a1 > 0 && out1 < 1) { ctx.save(); ctx.translate(-700 * out1 + 60 * (1 - clamp(a1)), 0); hypo(ctx, 1, '처음부터 벽 속', 540, 522, clamp(a1 * 2) * (1 - out1), K.goldHi); ctx.restore(); }
    if (a2 > 0) { ctx.save(); ctx.translate(90 * (1 - clamp(a2)), 0); hypo(ctx, 2, '누군가 몰래 반환', 540, 522, clamp(a2 * 2), K.red); ctx.restore(); }
  } else {
    const k = clamp(sum), fa = 1 - sumOut;
    hypo(ctx, 2, '누군가 몰래 반환', 500, lerp(522, 606, E.inOutQ(k)), fa, K.red);
    ctx.save(); ctx.translate(-120 * (1 - k), 0); hypo(ctx, 1, '처음부터 벽 속', 500, 516, clamp(k * 2) * fa, K.goldHi); ctx.restore();
    const qs = OB(P(t, ve + .02, ve + .3), 2.4) * fa;
    if (qs > 0) {
      ctx.save(); ctx.translate(900, 562); ctx.scale(qs * (1 + .04 * Math.sin(t * 8)), qs * (1 + .04 * Math.sin(t * 8)));
      glow(ctx, 0, 0, 130, K.red, .4); text(ctx, '?', 0, 8, { size: 170, family: FONT.disp, weight: 400, color: K.red, stroke: '#000', strokeW: 12 }); ctx.restore();
    }
  }
};
})();
