// blackout: "그리고, 의식을 잃었습니다."
// The same still frame 'thisisit' faded out on (his chest at RING, curled on the deck, almost gone in the black). No clock any
// more. '그리고,' -> one last bubble slips from the helmet and rises, slowly, alone, wobbling up through the empty water — warm
// while it is near his light, cold silver as it climbs — and leaves the frame at the top. '의식을' -> the small tag fades in
// (nobody knows when). '잃었습니다.' -> his amber light sinks to a barely visible ember; the silhouette is gone. It does NOT go
// out: the ember keeps a very slow, faint pulse to the last frame (he lives). Everything is still.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const RING = { x: 540, y: 830 };
const DS = 1.25, Z0 = 1.03;               // as 'thisisit' ends

const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
const thump = ph => { ph = ((ph % 1) + 1) % 1; return Math.exp(-ph * 16) + (ph > .2 ? .55 * Math.exp(-(ph - .2) * 16) : 0); };
// the one last bubble: a slightly squashed, wobbling sphere with a rim, a highlight and a faint inner reflection
function lastBubble(ctx, x, y, r, a, warm, t) {
  if (a <= .005) return;
  const sq = 1 + .1 * Math.sin(t * 9.5), col = PK.lerp2('#dff3ff', '#ffd9a8', warm);
  softGlow(ctx, x, y, r * 4.2, warm > .3 ? COL.amber : '#9fd0e0', .1 * a);
  ctx.save(); ctx.translate(x, y); ctx.scale(1 / sq, sq);
  ctx.fillStyle = rgba(col, .07 * a); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col, .85 * a); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', .35 * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r * .72, .4, 1.5); ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', .9 * a); ctx.beginPath(); ctx.ellipse(-r * .38, -r * .4, r * .24, r * .17, -.6, 0, TAU); ctx.fill();
  ctx.restore();
}

window.PK.scenes.blackout = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tAnd = at('그리고', .03), tLose = at('의식을', .35), tLost = at('잃었습니다', .55);

  // ---- him: the silhouette dissolves, the light sinks to an ember (never out) ----
  const sink = P(t, tLose - .1, tLost + .7, E.inOutQ);
  const lifeA = lerp(.25, .1, sink) * (1 - .15 * P(t, tLost + .7, d + .3));
  const beat = thump((t + 2.1) * lerp(38, 32, P(t, 0, d)) / 60) * lerp(.55, .35, sink);
  const silA = 1 - P(t, tAnd, tLost + .5, E.inOutQ);
  const Z = Z0 + .1 * P(t, -.25, d + .2, E.inOutQ);            // a very slow lean in: stillness, not a freeze
  const DO = { pose: 'curl', dir: 1, rot: .04, idle: 0, life: lifeA * .6, lifeS: LIFE_S * .6, bpm: 35, phase: 2.1, bailout: true,
    rim: '#ffc58a', rimA: .13 * silA, rim2A: 0, halo: 0, detail: .08 * silA, fill: '#020303', light: [RING.x + 220, RING.y - 320], a: .9 };
  const R0 = LM.diver(null, RING.x, RING.y, DS, t, DO);
  const toS = p => [RING.x + (p[0] - RING.x) * Z, RING.y + (p[1] - RING.y) * Z];
  const ch = toS(R0.chest), hd = toS(R0.head);
  const lightS = { x: ch[0], y: ch[1], r: 230 * Z * lerp(1, .6, sink), color: COL.amber, a: .85 * lifeA };

  // ---- draw ----
  LM.sea(ctx, t, { dark: .99, lights: [lightS], seed: 37, haze: 0, snow: .45, murk: .5, current: [0, -1.5] });
  if (silA > .01) {
    ctx.save(); ctx.globalAlpha = silA;
    ctx.translate(RING.x, RING.y); ctx.scale(Z, Z); ctx.translate(-RING.x, -RING.y);
    LM.diver(ctx, RING.x, RING.y, DS, t, DO);
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = .55; ctx.fillStyle = '#000101'; ctx.fillRect(0, 0, W, H); ctx.restore();   // the step of darkness 'thisisit' ended on
  // the ember
  const ek = lifeA / .25;
  softGlow(ctx, ch[0], ch[1], 330 * lerp(1, .75, sink) * (1 + .05 * beat), COL.amber, (.12 + .05 * beat) * lerp(1, .75, sink));
  softGlow(ctx, ch[0], ch[1], 105 * lerp(1, .8, sink) * (1 + .1 * beat), COL.warm, (.3 + .16 * beat) * ek * .8);
  LM.glow(ctx, ch[0], ch[1], 24 * lerp(1, .8, sink), COL.core, (.6 + .25 * beat) * clamp(ek));

  // ---- the one last bubble ----
  const t0 = tAnd + .14, u = t - t0;
  if (u > 0) {
    const rise = 165 * u + 52 * u * u;
    const bx = hd[0] + 8 + 16 * Math.sin(u * 2.4) * clamp(u * 1.5) + fb(u * .6, 91) * 14, by = hd[1] - 46 - rise;
    const r = 17 * (1 + .14 * u) * clamp(.4 + u * 3);             // it swells a little as it rises
    const warm = clamp(1 - rise / 330);
    lastBubble(ctx, bx, by, r, clamp(u * 5) * (by > -40 ? 1 : 0), warm, t);
    // a faint trail of silt it disturbs
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= 5; i++) {
      const uu = u - i * .09; if (uu <= 0) continue;
      const rr = 165 * uu + 52 * uu * uu, tx = hd[0] + 8 + 16 * Math.sin(uu * 2.4) * clamp(uu * 1.5) + fb(uu * .6, 91) * 14, ty = hd[1] - 46 - rr;
      ctx.fillStyle = rgba('#cfe8f0', .07 * (1 - i / 6)); ctx.beginPath(); ctx.arc(tx, ty + r * .9, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  LM.subBand(ctx, .84);
  PK.chip(ctx, D.tag || '', 540, 1172, P(t, tLose, tLose + .35) * (1 - P(t, d - .12, d + .2)), { size: 28, color: '#cfe8ff', border: 'rgba(150,210,255,.3)' });
};
})();
