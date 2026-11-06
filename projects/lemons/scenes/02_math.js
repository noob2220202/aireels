// math (real audio, BBC Outlook 2019): "Five minutes, I've probably used it for two or three, I've only got two left here"
// Flash-forward into total darkness. Hard cut from the hook's last frame: the same gas clock, big and centred (RING), with him
// inside it as a barely-there silhouette lit only by his own faint amber heartbeat. No numbers anywhere: the ring carries the
// sum. '5분' -> five pips ring in around the clock (one per minute) and the ring brightens; '2~3분은 썼을 테니' -> the ring
// drains clockwise, pausing between two and three pips (he isn't sure), the used arc left as a dim ghost; '이제 2분 남았구나' ->
// it settles on two pips: those two segments throb with his heartbeat, the remaining pips light up, the frame leans in.
// Breath bubbles rise in bursts from the helmet. He slowly curls in on himself (saving gas). After the voice the ring
// spins back to full (counter-clockwise, 'rewind') as the scene dips to black, into the start of the story ('night').
// Attribution card up while the voice plays; tag '본인 회상'.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const RING = { x: 540, y: 830, r: 300 };
const TAU = Math.PI * 2;
// the hook ends with the ring at this level (1 - .035 * its drain progress at the cut)
const F0 = .973;

// subtitle chunk start/end times (scene-relative) for this clip, falling back to fractions of the voice
function chunks(info) {
  const sc = info.sc, S = (info.TL && info.TL.subs || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0, f = [[0, .18], [.18, .65], [.65, 1]];
  return f.map((q, i) => S[i] ? [S[i].t0 - sc.t0, S[i].t1 - sc.t0] : [lerp(v0, v1, q[0]), lerp(v0, v1, q[1])]);
}

window.PK.scenes.math = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const [c5, cUsed, cLeft] = chunks(info);
  const vEnd = info.sc.voice_end - info.sc.t0;

  // ---- the sum, carried by the ring ----
  let frac = F0 - .006 * P(t, 0, c5[0]);
  frac = lerp(frac, .6, P(t, cUsed[0] + .05, cUsed[0] + .95, E.inOutQ));           // "two..."
  frac = lerp(frac, .5, P(t, cUsed[0] + 1.12, cUsed[1] - .1, E.inOutQ));            // "...or three"
  frac = lerp(frac, .4, P(t, cLeft[0] + .02, cLeft[0] + .5, E.inOutQ));             // "two left"
  frac -= .004 * P(t, cLeft[0] + .5, vEnd);
  const rew = P(t, vEnd + .02, d + .02, E.inOutC);                                 // rewind into 'night'
  const shown = lerp(frac, 1, rew);
  const pips = P(t, c5[0] - .05, c5[0] + .45);                                     // five minutes, five pips
  const left = P(t, cLeft[0] + .25, cLeft[0] + .7, E.outQ) * (1 - rew);
  const bpm = 104;
  const bt = PK.beat(t, bpm);

  // ---- camera: slow lean-in, handheld drift ----
  const z = 1 + .035 * P(t, -.3, d, E.inOutQ) + .03 * left;
  const dr = { x: fb(t * .35, 61) * 7, y: fb(t * .3, 62) * 7, r: fb(t * .25, 63) * .003 };
  const fade = 1 - P(t, vEnd + .1, d + .25, E.inQ);                                 // the dip into 'night'

  // ---- him: the hook's last pose, slowly curling in ----
  const curl = P(t, .2, d, E.inOutQ) * .4;
  const DO = { pose: 'crouch', pose2: 'huddle', mix: curl, dir: -1, adj: null, life: .85, bpm, lifeS: .8,
    rim: '#ffc58a', rimA: .32, rim2A: .05, halo: .06, detail: .4, fill: '#030606', bailout: true, idle: .8 };
  if (curl < .05) DO.adj = { T: .92, h: .22 };
  const dv0 = LM.diver(null, 0, 0, 1.28, t, DO);
  const lifeL = { x: RING.x, y: RING.y, r: dv0.lights[0].r * z, color: COL.amber, a: dv0.lights[0].a * .7 * fade };

  // ---- draw ----
  LM.sea(ctx, t, { dark: .97, lights: [lifeL], seed: 8, haze: .6, snow: .9, cam: [0, t * 14] });
  ctx.save();
  ctx.translate(RING.x + dr.x, RING.y + dr.y); ctx.rotate(dr.r); ctx.scale(z, z); ctx.translate(-RING.x, -RING.y);
  ctx.globalAlpha = fade;
  // the diver (chest at the ring centre), very dim
  const dv = LM.diver(ctx, RING.x, RING.y, 1.28, t, DO);
  // breath: bursts from the helmet, quicker as he counts
  const bursts = [];
  for (let k = 0; k < 6; k++) { const tb = .15 + k * 1.18 - (k > 2 ? (k - 2) * .12 : 0); if (tb < vEnd + .4) bursts.push(tb); }
  LM.bubbles(ctx, t, dv.head[0] - 24, dv.head[1] - 64, { bursts, a: .42, s: 1.35, seed: 11, n: 12 });

  // the used arc: a dim ghost from 12 o'clock to the head (it was there, it is gone)
  const used = 1 - shown;
  if (used > .004) {
    const a0 = -Math.PI / 2, a1 = -Math.PI / 2 + used * TAU;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#8a5038', .42 * (1 - rew)); ctx.lineWidth = 3.5; ctx.setLineDash([2, 11]);
    ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, a0, a1); ctx.stroke(); ctx.restore();
  }
  // the gas clock (rewind adds a short motion smear behind the head)
  const g = LM.gasClock(ctx, RING.x, RING.y, RING.r, shown, t, { w: 7, bpm, ticks: .55 * pips });
  if (rew > 0 && rew < 1) {
    const ah = -Math.PI / 2 + (1 - shown) * TAU;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let k = 1; k <= 5; k++) { ctx.strokeStyle = rgba(COL.warm, .16 * (1 - k / 6) * Math.sin(rew * Math.PI)); ctx.lineWidth = 7 + k * 3; ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, ah, ah + k * .09); ctx.stroke(); }
    ctx.restore();
  }
  // the remaining two minutes throb with his heartbeat
  if (left > 0) {
    const ah = -Math.PI / 2 + (1 - shown) * TAU;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(COL.amber, (.1 + .22 * bt) * left); ctx.lineWidth = 26 + 10 * bt; ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, ah, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  }
  // five minute pips around the ring (no numbers): pop in one by one on '5분'; the two still ahead light up on '2분'
  if (pips > 0) {
    for (let k = 0; k < 5; k++) {
      const pk = P(t, c5[0] - .05 + k * .09, c5[0] + .2 + k * .09, E.outBack), q = -Math.PI / 2 + k / 5 * TAU;
      if (pk <= 0) continue;
      const gone = (k / 5) < used - .001 && k > 0, ahead = k === 0 || k / 5 >= used - .001;
      const r0 = RING.r + 16, r1 = RING.r + 16 + 34 * pk;
      const hot = ahead ? left : 0, col = gone ? '#6d4a3a' : mix(COL.warm, '#fff3e0', hot);
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(col, (gone ? .35 : .75 + .25 * hot) * Math.min(1, pk));
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(RING.x + Math.cos(q) * r0, RING.y + Math.sin(q) * r0); ctx.lineTo(RING.x + Math.cos(q) * r1, RING.y + Math.sin(q) * r1); ctx.stroke();
      ctx.restore();
      if (hot > 0) LM.glow(ctx, RING.x + Math.cos(q) * (r0 + 13), RING.y + Math.sin(q) * (r0 + 13), 40, COL.amber, .5 * hot * (.7 + .3 * bt));
    }
    // a soft bloom of the whole ring on '5분'
    const bl = Math.exp(-Math.pow((t - c5[0] - .2) / .22, 2));
    if (bl > .01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(COL.warm, .22 * bl); ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
  ctx.restore();
  void g;

  LM.subBand(ctx, .82);
  // tag + attribution card (visible while the voice plays)
  PK.chip(ctx, D.tag || '', 540, 492, P(t, .05, .3) * (1 - P(t, vEnd + .05, vEnd + .3)), { size: 30, color: '#ffe3b8', border: 'rgba(255,190,110,.45)' });
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
const mix = (a, b, k) => PK.lerp2(a, b, clamp(k));
})();
