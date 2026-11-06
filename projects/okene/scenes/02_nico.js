// nico (real audio, BBC 2023 — diver Nico van Heerden): "The exact moment when he stuck his hand out to grab my hand /
// was the most terrifying moment of my career."
// A slow-motion replay of the hook's grip, closer and darker, so the real voice carries it. The cut lands on the locked grip;
// in the 0.3 s before the voice it rewinds (the hand slides back into the dark). Then, synced to the words (clip word times from
// the audio): "stuck his hand out" -> the bare hand rises out of the dark in slow motion; "grab my hand" -> the fingers close
// over the glove's wrist; "was ... the most terrifying" -> the hold: his breath streams out of the suit in bursts, the glove
// trembles, the warm heartbeat glow of the man in the dark pulses behind the grip, the silt turns slowly around the hands.
// The attribution card stays up while the voice plays; its red dot rings with the voice.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, flash } = L;
const PK = window.PK;

// loudness of the clip (30 fps RMS of the real audio from voice start, 0-99)
const RMS = [0, 3, 13, 18, 54, 82, 80, 71, 21, 20, 45, 61, 96, 99, 57, 6, 4, 5, 56, 75, 71, 74, 67, 71, 69, 70, 40, 18, 36, 55, 55, 60, 46, 25, 38, 39, 8, 4, 39, 39, 11, 7, 16, 55, 24, 16, 12, 41, 43, 47, 50, 53, 67, 60, 77, 68, 56, 46, 27, 8, 8, 13, 11, 6, 5, 13, 31, 12, 9, 47, 73, 74, 77, 57, 14, 36, 63, 52, 49, 42, 48, 47, 52, 50, 40, 37, 34, 22, 12, 9, 7, 5, 3, 3, 3, 5, 7, 7, 5, 2, 3, 6, 8, 10, 12, 11, 9, 8, 21, 63, 85, 73, 50, 50, 43, 31, 25, 37, 36, 32, 37, 31, 14, 10, 8, 6, 6, 3, 3, 3, 14, 19, 25, 63, 59, 57, 57, 55, 52, 51, 48, 49, 45, 44, 43, 45, 45, 43, 33, 15, 10, 12, 40, 59, 70, 67, 46, 31, 29, 8, 8, 15, 59, 84, 65, 60, 23, 7, 6, 3, 46, 59, 54, 41, 37, 27, 20, 11, 6, 6, 9, 8, 6, 4, 5, 6, 9, 10, 10, 12, 41, 44, 45, 51, 62, 65, 62, 49, 21, 16, 16, 21, 41, 31, 32, 25, 10, 7, 13, 30, 51, 54, 65, 73, 92, 78, 44, 21, 9, 3, 3, 5, 3, 3, 3];
const loud = tc => { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= RMS.length - 1) return 0; return lerp(RMS[i], RMS[i + 1], f - i) / 99; };
// word onsets in the clip (seconds from voice start; Whisper word timestamps of the real audio)
const WD = { stuck: 1.12, hand1: 1.54, out: 1.74, grab: 2.22, my: 2.42, hand2: 2.68, was: 2.94, most: 4.64, terrifying: 5.26, moment: 5.7, career: 6.88 };

window.PK.scenes.nico = function (ctx, t, d, info) {
  const HG = PK.HG, { beat, sourceCard } = PK, D = info.sc.data || {};
  const { S, LAMP, G0, nz, fb } = HG;
  const v0 = info.sc.voice_t - info.sc.t0, w = k => v0 + WD[k];
  const tOut = w('stuck') - .15, tGrab = w('grab') + .05, tLock = w('hand2') + .18, tWas = w('was'), tTer = w('terrifying');
  const slow = .32;                                                       // slow-motion clock for silt / searching fingers
  const tm = 40 + t * slow;
  const lockA = P(t, tLock - .12, tLock + .05), hold = P(t, tLock, tLock + 1.2, E.inOutQ);

  // ---- camera: close on the grip, very slow push; a soft thump on the lock ----
  const pushK = P(t, 0, d, E.inOutQ);
  const bt = beat(t, lerp(92, 116, hold));
  const cx = lerp(505, 515, pushK), cy = lerp(968, 950, pushK);
  // slow push + a heartbeat micro-push through the hold (his pulse in the frame) and a slow ~1.4 deg roll while 'terrifying' lands
  let z = lerp(1.5, 1.84, pushK) * (1 + .03 * Math.exp(-Math.max(0, t - tLock) * 5) * lockA) * (1 + .014 * bt * hold);
  const dr = { x: fb(t * .22, 81) * 12, y: fb(t * .2, 82) * 12, r: fb(t * .18, 83) * .005 + .025 * P(t, tWas, d, E.inOutQ) };
  const tremble = .05 * hold + .1 * P(t, tTer - .2, tTer + .3) * (1 - P(t, tTer + 1.2, d));
  const [sx, sy, sr] = HG.shake(t, tremble, 11);
  const rew = 1 - P(t, .02, .3, E.inQ);                                  // the rewind at the head of the clip
  const rj = rew > 0 && rew < 1 ? (nz(t * 60, 5) * 6) : 0;

  HG.darkFast(ctx, t + 30, .45, 6, '#010203', true);
  ctx.save();
  HG.cam(ctx, cx, cy, z, dr.r + sr, dr.x + sx + rj, dr.y + sy);
  const M = ctx.getTransform();

  const b = { x: LAMP.x + fb(t * .25, 84) * 6, y: LAMP.y + fb(t * .3, 85) * 7, ang: .58 + fb(tm * .5, 86) * .02 + tremble * nz(t * 3, 87) * .05, spread: .29, len: 1150, a: .82 - .06 * (.5 + .5 * nz(t * 9, 88)) };
  HG.wall(ctx, b, { amb: .035, gain: .95 });
  // ---- poses ----
  const creep = P(t, .3, tLock, E.inOutQ);
  const yank = P(t, tLock - .05, tLock + .45, E.outQ) * (1 - .5 * P(t, tLock + .6, tLock + 2.4, E.inOutQ));
  const pull = .7 * P(t, tWas + .3, tWas + 1.6, E.inOutQ) + .5 * P(t, tTer - .1, tTer + .6, E.inOutQ) * (1 - P(t, tTer + .8, d, E.inOutQ));
  const gu = -(1 - creep) * 2.6 - (1 - P(t, -.1, .3)) * 0 + yank * .8 - pull * .6;
  const tr = tremble * nz(t * 4, 90) * .6;
  const g = { x: G0.x + Math.cos(G0.ang) * gu * S - Math.sin(G0.ang) * (yank * 10 + tr * S), y: G0.y + Math.sin(G0.ang) * gu * S + Math.cos(G0.ang) * (yank * 12 + tr * S), ang: G0.ang + .03 * yank, sp: .55 + .12 * fb(tm * 1.1, 91) - .2 * lockA, cg: .16 + .1 * fb(tm * .9, 92) + .22 * lockA, wig: (1 - lockA) * .8, t: tm };
  const lock = HG.gripPose(g);
  const far = { x: lock.x - Math.cos(lock.ang) * 26 * S, y: lock.y - Math.sin(lock.ang) * 26 * S };
  const near = { x: lock.x - 2.5 * S, y: lock.y + 11 * S };   // hovering just under the cuff, open, against his own glow
  let h = null;
  if (t < .3) {                     // rewind: locked -> back into the dark
    const q = rew; h = { x: lerp(far.x, lock.x, q), y: lerp(far.y, lock.y, q), ang: lock.ang + .25 * (1 - q), open: 1, curl: P(q, .55, 1), vis: P(q, 0, .25) };
  } else if (t > tOut - .1) {       // slow emergence -> hover -> close
    const e1 = P(t, tOut - .1, tGrab + .1, E.outC), e2 = P(t, tGrab + .05, tLock - .02, E.inOutQ);
    const px = lerp(lerp(far.x, near.x, e1), lock.x, e2), py = lerp(lerp(far.y, near.y, e1), lock.y, e2);
    h = { x: px, y: py, ang: lock.ang + .22 * (1 - e1) - .05 * (1 - e2) * e1, open: lerp(.55, 1.15, e1) - .2 * e2, curl: P(t, tGrab + .22, tLock + .02, E.inOutQ), vis: 1 };
  }
  const rimUp = h ? lerp(.3, 1.05, clamp(P(t, tOut, tGrab + .2) + (t < .3 ? rew : 0))) : 0;
  // ---- the man in the dark: warm heartbeat glow behind the grip (faint before he is seen) ----
  const heartA = .45 + .55 * P(t, tOut - .3, tOut + .5) - .2 * hold;
  const hx0 = h ? h.x + Math.cos(h.ang) * 6 * S : near.x + 40, hy0 = h ? h.y + Math.sin(h.ang) * 6 * S : near.y + 120;
  const hpX = lerp(hx0, lock.x + 30, hold), hpY = lerp(hy0, lock.y + 60, hold);
  HG.light(ctx, x => { HG.heart(x, hpX, hpY, heartA * (t < .3 ? .6 : 1), bt, 1.15); HG.cone(x, t, b); });
  HG.silt(ctx, tm, b, { n: 150, seed: 13, sizeK: 1.15, speed: 1, push: { x: G0.x + 80, y: G0.y + 30, k: .25 * hold + .15 * Math.sin(tm * .8) * hold } });
  if (t < .3 && h) HG.smear(ctx, [{ ...h, x: lerp(h.x, lock.x, .3), y: lerp(h.y, lock.y, .3) }, { ...h, x: lerp(h.x, lock.x, .6), y: lerp(h.y, lock.y, .6) }], g, .7 * (1 - rew) * rew * 3);
  HG.hands(ctx, { g, h, b, bareRim: rimUp * 1.25, bareHalo: .45 * rimUp, gloveHalo: .1 });
  // ---- breath: a trickle, then bursts on 'was' and 'terrifying' ----
  const vx = g.x - Math.cos(g.ang) * 13 * S, vy = g.y - Math.sin(g.ang) * 13 * S - 5.6 * S;
  HG.bubbles(ctx, t * .6, -2, { x: vx + 40, y: vy + 20, n: 9, seed: 31, b, spread: 22, rise: 130, drift: 30, life: 2.4, a: .5, size: .7 });
  HG.bubbles(ctx, t * .6, (tWas + .05) * .6, { x: vx + 60, y: vy + 20, n: 30, seed: 33, b, spread: 80, rise: 170, drift: 60, life: 1.9, size: 1.0 });
  HG.bubbles(ctx, t * .6, (tTer + .05) * .6, { x: vx + 160, y: vy + 30, n: 60, seed: 35, b, spread: 110, rise: 210, drift: 70, life: 2.0, size: 1.4 });
  ctx.restore();

  HG.bokeh(ctx, tm, b, M, { n: 7, seed: 25, a: .26 });
  HG.iris(ctx, lerp(.44, .58, hold) - .05 * bt, .5 * bt, 560, 860);
  HG.subBand(ctx);
  // rewind: a few tape-like streaks
  if (rew > 0 && rew < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const y = 500 + HG.hi(i * 7 + Math.floor(t * 30)) * 700; ctx.fillStyle = rgba('#bfe4f7', .07 * Math.sin(rew * Math.PI)); ctx.fillRect(0, y, W, 2 + 6 * HG.hi(i * 3 + 1)); }
    ctx.restore();
  }
  // attribution card (+ a ring on its red dot that answers the voice)
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));     // fully up from the first voice frame (like RV.card)
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
  const lv = loud(t - v0);
  if (ca > 0 && lv > .05) { ctx.save(); ctx.strokeStyle = rgba('#ff6a6f', ca * .55 * lv); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(540 - 380 + 34, 1185, 13 + 10 * lv, 0, 7); ctx.stroke(); ctx.restore(); }
  // the lock: a faint cold pulse, nothing like the hook's flash
  flash(ctx, .08 * Math.exp(-Math.max(0, t - tLock) * 6) * lockA, '#cfeaff');
  // settle toward the dip into 'setup'
  const tail = P(t, Math.max(d - .5, info.sc.voice_end - info.sc.t0), d + .1, E.inOutQ);   // only after the voice ends
  if (tail > 0) { ctx.fillStyle = `rgba(1,2,3,${(.5 * tail).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
};
})();
