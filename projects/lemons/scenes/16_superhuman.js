// superhuman (real audio, BBC Radio 5 Live 2019): "It was a real superhuman effort to come and drag me back."
// Close on the drag, continuing 'yuasa' (same staging: Yuasa on the right, facing back toward him, leaning into the haul;
// the limp silhouette towed behind him by the harness, head toward Yuasa, the faint amber ember still in his chest).
// Mostly dark so the real voice carries it: the cold helmet lamp on the limp shape, black water, silt; up-right, the warm
// hatch of the bell coming closer pull by pull.
//  each pull (on the stresses): Yuasa heaves back and kicks, the pair surges up-right, a burst of exhale bubbles bursts from his
//  helmet and climbs toward the light, the lamp beam jerks; the limp body swings and trails.
//  'superhuman effort' -> the hardest haul (bigger surge, a jolt, the biggest burst)
//  'drag me back'      -> the last hauls: the bell's lower frame and the open hatch come into frame, the warm cone pours over
//                         them, the cold rim on both turns warm; the frame ends washed in the hatch's amber (-> inside the bell).
// Attribution card up throughout.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const YS = 1.0, DS = .93, BS = 1.55;

const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]];
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function chunks(info) {
  const sc = info.sc, S = (info.TL && info.TL.subs || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0;
  return [S[0] ? [S[0].t0 - sc.t0, S[0].t1 - sc.t0] : [v0, lerp(v0, v1, .55)], S[1] ? [S[1].t0 - sc.t0, S[1].t1 - sc.t0] : [lerp(v0, v1, .55), v1]];
}

window.PK.scenes.superhuman = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const [c1, c2] = chunks(info);
  // the hauls, on the stresses: "It was a REAL SUPERhuman efFORT / to come and DRAG me BACK"
  const L1 = c1[1] - c1[0], L2 = c2[1] - c2[0];
  const pulls = [[c1[0] - .25, .7], [c1[0] + L1 * .36, 1.35], [c1[0] + L1 * .8, .8], [c2[0] + L2 * .38, 1.15], [c2[0] + L2 * .78, .7]];
  const KS = pulls.reduce((a, p) => a + p[1], 0);
  let q = .1 * clamp(t / d), heave = 0, kickK = 0;
  for (const [tp, k] of pulls) {
    const u = t - tp; q += .9 * k / KS * E.inOutQ(clamp(u / .5));
    if (u > -.05 && u < .7) heave = Math.max(heave, k * Math.sin(Math.PI * clamp(u / .55)));
    kickK = Math.max(kickK, k * Math.exp(-Math.pow((u - .2) / .35, 2)));
  }
  q = clamp(q);
  const tStrong = pulls[1][0];
  const warm = P(t, c2[0] - .3, d, E.inOutQ);             // the hatch light takes over
  const arrive = P(t, c2[1] - .6, d + .1, E.inOutQ);

  // ---- the pair (screen): Yuasa right, leaning back into the haul; him towed behind by the harness ----
  const dr = { x: fb(t * .35, 91) * 9, y: fb(t * .3, 92) * 8, r: fb(t * .25, 93) * .003 };
  const sk = LM.shake(t, .25 + .3 * heave, 97), jo = LM.jolt(t, tStrong + .12, .9), jo2 = LM.jolt(t, pulls[3][0] + .12, .6);
  const ox = dr.x + sk.x + jo.x + jo2.x, oy = dr.y + sk.y + jo.y + jo2.y;
  const yc = [688 + 34 * q + 16 * heave + ox, 770 - 40 * q - 10 * heave + oy];
  const dg = LM.POSES.drag;
  const YO = { pose: { T: dg.T - .16 * heave, h: .5 - .05 * heave, na: [1.05 + .3 * heave, .55 + .4 * heave], fa: [.9 + .3 * heave, .7 + .35 * heave], nl: [.62 + .32 * kickK, -.95 - .25 * kickK], fl: [-.2 - .3 * kickK, -.5 + .15 * kickK] },
    dir: -1, rot: -.14 - .05 * heave, idle: .6, kick: .2, phase: 1.3, bailout: true, rimA: .85, halo: .22, detail: 1, lamp: 1, beamLen: 820 };
  YO.rim = LM.mix('#d8eef8', '#ffcf94', warm);
  const yv0 = LM.diver(null, yc[0], yc[1], YS, t, YO);
  const grip = [(yv0.hand[0] + yv0.hand2[0]) / 2, (yv0.hand[1] + yv0.hand2[1]) / 2];
  const LO = { pose: { T: .12, h: .6 + .08 * Math.sin(t * 1.2), na: [.32 + .1 * Math.sin(t * 1.3) - .15 * heave, .25], fa: [.18 + .1 * Math.sin(t * 1.1 + 1) - .15 * heave, .35], nl: [.06 + .05 * Math.sin(t * .9), -.14], fl: [-.08 + .05 * Math.sin(t * .8 + 1), -.22] },
    dir: 1, rot: 1.18 - .07 * heave, idle: .3, life: .45 + .06 * warm, lifeS: .32, bpm: 38, phase: 2.1, bailout: true, rimA: .55, rim2A: .08, halo: 0, detail: .6, fill: '#030505' };
  LO.rim = LM.mix('#ffc58a', '#ffd9a8', warm);
  const o0 = LM.diver(null, 0, 0, DS, t, LO), off = [o0.valve[0] - o0.chest[0], o0.valve[1] - o0.chest[1]];
  const lc = [grip[0] - off[0] - 10 - 16 * heave, grip[1] - off[1] + 22 + 6 * heave];
  const lv = LM.diver(null, lc[0], lc[1], DS, t, LO);
  YO.lampAng = Math.atan2(lv.chest[1] - yv0.lamp[1] - 10, lv.chest[0] - yv0.lamp[0]) + .12 * heave + .04 * Math.sin(t * 2.3);
  const yv = LM.diver(null, yc[0], yc[1], YS, t, YO);

  // ---- the bell, coming closer up-right (only its lower frame + hatch enter the frame) ----
  const bp = E.inOutQ(q);
  const hatchS = [lerp(1110, 806, bp) + ox * .6, lerp(250, 470, bp) + oy * .6];
  const bx = hatchS[0], by = hatchS[1] - 174 * BS;
  const bellO = { glow: 1, hatch: 1, lamps: .5, amb: .1 + .1 * warm, swing: .015 * Math.sin(t * .8), wireTop: -60 };
  const bR = LM.bell(null, bx, by, BS, t, bellO);
  YO.light = LO.light = [bR.hatch[0], bR.hatch[1] + 60];

  const lights = bR.lights.concat(yv.lights, lv.lights);
  // ================= draw =================
  LM.sea(ctx, t, { dark: lerp(.88, .8, warm), lights, seed: 53, haze: 0, snow: 1.1, current: [-30 - 40 * heave, 18 + 20 * heave], cam: [q * 300, -q * 200] });
  softGlow(ctx, bR.hatch[0], bR.hatch[1] + 160, 560 + 300 * warm, COL.amber, .12 + .24 * warm + .22 * arrive * arrive);   // the warm light pours down over them
  { const yl = yv.lights[1] || yv.lights[0]; if (yl) softGlow(ctx, yl.x, yl.y, 380, COL.lamp, .1); }
  softGlow(ctx, lv.chest[0], lv.chest[1], 300, COL.amber, .07);
  // the bell's lower half, its lamps and the open hatch's warm cone
  LM.bell(ctx, bx, by, BS, t, bellO);
  // Yuasa's umbilical up to the bell (alive), his stub of severed line
  {
    // his line hangs in a slack bight off to the right between the bell and his helmet
    const e0 = bR.exit, u1 = yv.umb, sw = 14 * Math.sin(t * .8);
    const m1 = [Math.max(e0[0], u1[0]) + 150 + sw, lerp(e0[1], u1[1], .25) + 120], m2 = [u1[0] + 120 + sw * .6, u1[1] + 150];
    LM.umbilical(ctx, [e0, m1, m2, u1], t, { w: 15, lit: .55 + .2 * warm, sag: 10, tension: .05 + .25 * heave, sway: 8, pulse: .6, pulseSpeed: 300, glow: .35 });
    const s0 = lv.umb, sw2 = Math.sin(t * .9) * 10;
    LM.umbilical(ctx, [[s0[0], s0[1]], [s0[0] - 20 + sw2, s0[1] - 70], [s0[0] - 70 + sw2 * 1.4, s0[1] - 104]], t, { w: 13, lit: .32, tension: .1, sway: 6, cut: { at: t - 5, frac: .99, recoil: 0, whip: 0 } });
  }
  // him (towed), the harness strap, Yuasa
  LM.diver(ctx, lc[0], lc[1], DS, t, LO);
  softGlow(ctx, lv.chest[0], lv.chest[1], 230, COL.amber, .14 * (.8 + .2 * lv.beat));
  ctx.save(); ctx.strokeStyle = rgba('#c8b07a', .8); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(grip[0], grip[1]); ctx.lineTo(lv.valve[0], lv.valve[1]); ctx.stroke(); ctx.restore();
  LM.diver(ctx, yc[0], yc[1], YS, t, YO);
  // exhale bursts after each haul (the hardest one biggest), climbing toward the light
  const bursts = pulls.map(([tp]) => tp + .38);
  LM.bubbles(ctx, t, yv.head[0] + 6, yv.head[1] - 40, { bursts: bursts.slice(0, 1).concat(bursts.slice(2)), a: .75, s: 1.25, seed: 31, n: 12, rise: 1.2 });
  LM.bubbles(ctx, t, yv.head[0] + 6, yv.head[1] - 40, { bursts: [bursts[1]], a: .9, s: 1.6, seed: 37, n: 22, rise: 1.4 });
  if (arrive > 0) LM.glow(ctx, bR.hatch[0], bR.hatch[1], 220, COL.core, .5 * arrive);

  LM.subBand(ctx, .82);
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
  void H; void nz; void hi;
};
})();
