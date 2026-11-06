// dark (real audio, BBC Outlook 2019): "Suddenly, a plunge from this world of panic and light to complete silence and darkness."
// Hard cut from the snap: he is falling backwards through black water, the camera falling with him (silt streaks rush up past
// the frame). Above him, the last of 'the world of panic and light': the diving bell, its open hatch spilling amber and its
// lamps sweeping, with the parted end of his line swinging under it — receding up and away, shrinking. His own severed line
// trails slack above him, frayed. 'Suddenly, a plunge' -> a lurch: the fall kicks, the streaks spike, the frame jolts.
// 'panic and light' -> breath bursts rise toward the bell, his heartbeat races, the bell's lights flicker as they shrink.
// 'complete silence and darkness' -> the bell is a speck, then nothing; the streaks slow and stop; his silhouette, the line and
// the gas clock dissolve; only a faint amber heartbeat (and the subtitles) are left. Attribution card up throughout.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const F0 = .934;                                       // gas clock level at the end of 'snap'
// cheap big glows: in this renderer a radial-gradient fill is ~2.5x cheaper than a scaled sprite at large radii, so the
// water haze and the big part of his life-light are drawn here (the kit diver gets a tiny lifeS so its own glows stay small)
const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function haze(ctx, lights, k = 1, cap = 640) { for (const Lt of lights) softGlow(ctx, Lt.x, Lt.y, Math.min(Lt.r * .9, cap), Lt.color, .24 * (Lt.a == null ? 1 : Lt.a) * k); }
function lifeGlow(ctx, t, x, y, a, s, bpm) {
  if (a <= 0) return; const b = PK.beat(t, bpm);
  softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a * .8);
}
const lifeLight = (c, r, a, t, bpm) => ({ x: c[0], y: c[1], r, color: COL.amber, a: .9 * a * (.85 + .15 * PK.beat(t, bpm)) });

function chunks(info) {
  const sc = info.sc, S = (info.TL && info.TL.subs || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0;
  return [S[0] ? [S[0].t0 - sc.t0, S[0].t1 - sc.t0] : [v0, lerp(v0, v1, .66)], S[1] ? [S[1].t0 - sc.t0, S[1].t1 - sc.t0] : [lerp(v0, v1, .66), v1]];
}
// fall distance (screen px) of the camera/diver: a lurch on 'Suddenly', a long fall that slows to a stop in the dark
const fallOff = (t, tq, tS) => 2100 * E.outC(P(t, -.35, tS + .8)) + 380 * P(t, tq, tq + .55, E.inOutQ);
function streaks(ctx, t, vy, a, seed, lights, off) {
  if (a <= .004) return;
  const n = 54, len = clamp(Math.abs(vy) * .06, 1, 120);
  ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = .45 + hi(i * 7 + seed) * 1.0, x = hi(i * 3 + seed) * (W + 80) - 40 + fb(t * .2 + i, seed + 3) * 30;
    const y = ((hi(i * 5 + seed) * (H + 240) - off * z) % (H + 240) + H + 240) % (H + 240) - 120;
    let lum = .12; for (const Lt of lights) { const dx = x - Lt.x, dy = y - Lt.y, d2 = dx * dx + dy * dy; if (d2 < Lt.r * Lt.r) lum += (1 - Math.sqrt(d2) / Lt.r) * (Lt.a == null ? 1 : Lt.a) * .9; }
    ctx.strokeStyle = rgba('#bcd9d4', Math.min(.6, a * lum * z)); ctx.lineWidth = .7 + z * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len * z); ctx.stroke();
  }
  ctx.restore();
}

window.PK.scenes.dark = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const [c1, c2] = chunks(info);
  const tq = c1[0] + .05;                                // 'Suddenly'
  const tS = c2[0];                                      // 'complete silence and darkness'
  const gone = P(t, tS + .05, tS + .95, E.inOutQ);       // everything dissolves but the heartbeat
  const lightK = 1 - P(t, tS - .35, tS + .45, E.inQ);    // the bell's light dies into the distance

  // ---- the fall ----
  const off = fallOff(t, tq, tS), vy = (fallOff(t + .02, tq, tS) - fallOff(t - .02, tq, tS)) / .04;
  const lurch = Math.exp(-Math.pow((t - tq - .2) / .25, 2));
  const sk = LM.shake(t, .25 + .7 * lurch, 21), jo = LM.jolt(t, tq, 1.2);
  const dr = { x: fb(t * .35, 81) * 9, y: fb(t * .3, 82) * 9 };
  const spin = .035 * Math.sin(t * .5) + .05 * P(t, 0, d, E.inOutQ);

  // ---- the bell, receding up and away (the world of panic and light) ----
  const rp = E.outQ(P(t, -.4, tS + .6));
  const bs = lerp(.58, .045, rp), bx = lerp(770, 770, rp) + fb(t * .4, 84) * 8, by = lerp(640, 500, rp);
  const flick = 1 - .35 * (hi(Math.floor(t * 14) + 9) > .78 ? 1 : 0) * (1 - gone);
  const bellO = { glow: lightK * flick, hatch: 1, lamps: lightK * (.8 + .2 * nz(t * 6, 5)) * flick, amb: .12 * lightK, swing: .07 * Math.sin(t * 1.3) + .04, wireTop: -40 };
  const bR = LM.bell(null, bx, by, bs, t, bellO);
  // ---- him ----
  const ds = 1.12 - .1 * P(t, 0, d), dx0 = 440 + 30 * P(t, 0, d, E.inOutQ), dy0 = 880 + 50 * E.outC(P(t, tq, tS + .8));
  const rot = lerp(.42, 1.05, E.inOutQ(P(t, -.2, tS + .9))) + .12 * lurch;
  const bpm = lerp(124, 72, P(t, tS, d));
  const DO = { pose: 'float', dir: -1, rot, adj: { na: [2.35 + .2 * Math.sin(t * 1.6), .35], fa: [2.0 + .2 * Math.sin(t * 1.3 + 1), .5], nl: [.55, -.7], fl: [.2, -.45], h: .3 },
    idle: 1, kick: .25 * (1 - gone), life: 1, bpm, lifeS: .75, bailout: true, bailoutLit: .55 * (1 - gone),
    rim: '#ffc58a', light: [bx, by], rimA: lerp(.6 + .2 * lightK, .1, gone), rim2A: lerp(.05, 0, gone), halo: lerp(.08, 0, gone), detail: lerp(1, .12, gone) };
  DO.life = lerp(1, .62, gone) * (1 - .25 * P(t, d - .8, d)); DO.lifeS = LIFE_S; const lS = lerp(.75, .95, gone);
  const dv = LM.diver(null, dx0, dy0, ds, t, DO);

  // ---- lights ----
  const lifeL = lifeLight(dv.chest, 520 * ds * lS, DO.life * lerp(1, .45, gone), t, bpm);
  const lights = [lifeL].concat(bR.lights.map(Lt => Object.assign({}, Lt, { a: Lt.a * lightK })));

  // ---- draw ----
  LM.sea(ctx, t, { dark: lerp(.86, 1, gone), lights, seed: 14, haze: 0, snow: .9 * (1 - gone * .8), cam: [0, clamp(off * .25, -400, 400) - 200] });
  haze(ctx, lights, .9, 460);
  streaks(ctx, t, vy, (.75 + .6 * lurch) * (1 - gone), 31, lights, off);
  ctx.save();
  ctx.translate(540 + sk.x + jo.x + dr.x, 900 + sk.y + jo.y + dr.y); ctx.rotate(spin + sk.r); ctx.translate(-540, -900);

  // the bell and the parted end of his line swinging under it
  if (lightK > .01 || bs > .02) {
    ctx.save(); ctx.globalAlpha = 1 - gone;
    const ex = bR.exit, k = bs / .58, sw = Math.sin(t * 2.1) * 40 * k;
    const hp = [[ex[0], ex[1]], [ex[0] + 20 * k + sw * .4, ex[1] + 150 * k], [ex[0] + 50 * k + sw, ex[1] + 250 * k]];
    LM.umbilical(ctx, hp, t, { w: Math.max(2, 24 * bs), lit: .45 * lightK + .05, tension: .2, sway: 8 * k, cut: { at: t - 2.8, frac: .985, recoil: 0, whip: 0 } });
    LM.bell(ctx, bx, by, bs, t, bellO);
    ctx.restore();
  }
  // his own severed line trailing slack above him as he falls
  const ua = 1 - gone;
  if (ua > .01) {
    const u0 = dv.umb, s2 = ds / 1.12;      // short enough that its frayed end stays in frame (it must not read as still attached)
    const tp = [[u0[0], u0[1]], [u0[0] + (-6 + 18 * Math.sin(t * 1.1)) * s2, u0[1] - 120 * s2], [u0[0] + (-60 + 26 * Math.sin(t * .8 + 1)) * s2, u0[1] - 215 * s2], [u0[0] + (-105 + 34 * Math.sin(t * .7 + 2)) * s2, u0[1] - 262 * s2]];
    ctx.save(); ctx.globalAlpha = ua;
    LM.umbilical(ctx, tp, t, { w: 12 * s2, lit: .3 + .2 * lightK, tension: .1, sway: 12, cut: { at: t - 3.1, frac: .99, recoil: 0, whip: 0 } });
    ctx.restore();
  }
  // breath bursts rising toward the light (panic), fading with everything else
  const bursts = []; for (let k = 0; k < 8; k++) { const tb = -.4 + k * .62; if (tb < tS) bursts.push(tb); }
  ctx.save(); ctx.globalAlpha = 1 - gone;
  LM.bubbles(ctx, t, dv.head[0] - 10, dv.head[1] - 30, { bursts, a: .55, s: 1.2, seed: 19, n: 12, rise: 1.3 });
  ctx.restore();
  // him (the silhouette dissolves on 'silence and darkness'; his heartbeat stays)
  LM.diver(ctx, dx0, dy0, ds, t, DO);
  lifeGlow(ctx, t, dv.chest[0], dv.chest[1], DO.life, ds * lS, bpm);
  // the gas clock, lost in the dark with the rest
  const ga = (1 - P(t, tS - .2, tS + .6)) * .85;
  if (ga > .01) LM.gasClock(ctx, dv.chest[0], dv.chest[1], 150 * ds / .82, F0 - .01 * P(t, 0, d), t, { a: ga, w: 4, bpm });
  ctx.restore();

  LM.subBand(ctx, .82);
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
