// name (clip, BBC 2023 edit of the DCN radio): "Alright, what's your name?" / "Harrison, Harrison." / "Harrison?" / "Yes, sir."
// Calm after the shock. The radio static of the cut settles into the dark wreck by the doorway (the hook's bulkhead, only
// what the lamp reveals). Upper left: a faceless helmeted diver silhouette, its lamp a cold-white light, beam reaching down
// to the warm amber light of Okene in the dark doorway (lower right; rim light from him on the helmet). The two voices are
// two lights exchanging rings: whoever speaks, a ring of voice-ticks opens around his light (driven by the real audio's
// loudness) and arcs of sound travel to the other light, which answers with a soft swell when they arrive. The camera leans
// gently toward whoever speaks. "Harrison, Harrison." -> his warm light swells, heart steady; "Yes, sir." -> a last warm
// reply, both lights calm. Attribution card up while the voice plays; speaker-labelled subtitles come from the timeline.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow } = L;
const PK = window.PK;

// loudness of the clip (30 fps RMS of the real audio from voice start, 0-99)
const RMS = [22, 29, 36, 40, 41, 39, 50, 40, 29, 13, 4, 5, 5, 3, 4, 4, 4, 4, 5, 4, 2, 6, 13, 55, 96, 53, 10, 12, 6, 5, 6, 46, 52, 71, 56, 19, 20, 26, 52, 50, 49, 48, 54, 32, 9, 5, 4, 5, 10, 63, 7, 5, 5, 15, 18, 23, 36, 22, 46, 21, 4, 4, 3, 13, 27, 13, 10, 35, 31, 35, 23, 24, 15, 5, 3, 4, 9, 14, 8, 5, 4, 3, 4, 9, 7, 5, 6, 4, 6, 7, 7, 7, 9, 8, 9, 7, 7, 6, 9, 6, 8, 7, 10, 55, 99, 95, 60, 64, 43, 8, 8, 11, 65, 86, 34, 4, 3, 4, 4, 8, 25, 49, 33, 27, 6, 5, 4, 8, 31, 35, 18, 6, 3, 3, 3, 4, 3, 4, 4, 5, 4, 4, 5, 4, 4, 6];
// who speaks when (seconds from voice start; Whisper word timestamps of the real audio): R = rescuer, O = Okene
const SEG = [{ w: 'R', a: .12, b: 1.62 }, { w: 'O', a: 1.90, b: 2.70 }, { w: 'R', a: 3.40, b: 3.82 }, { w: 'O', a: 4.00, b: 4.52 }];
const NORM = { R: 1, O: .62 };
const V = 600, R0 = 46;                      // ring speed (px/s), start radius

// world (screen at z = 1): the diver's helmet upper left, his light in the dark doorway lower right
const HC = { x: 282, y: 700 }, OK = { x: 772, y: 968 };
PK.RVN = { HC, OK };                         // shared with home (same positions at the cut)

let RINGS = null;
function rings(loud) {
  if (RINGS) return RINGS;
  RINGS = [];
  for (const s of SEG) for (let te = s.a; te < s.b; te += .13) { const v = clamp(loud(te + .03) / NORM[s.w]); if (v > .14) RINGS.push({ w: s.w, te, s: v }); }
  return RINGS;
}
function act(tc, who) { let a = 0; for (const s of SEG) if (s.w === who) a = Math.max(a, P(tc, s.a - .1, s.a + .08) * (1 - P(tc, s.b - .02, s.b + .3))); return a; }
// a ring of voice ticks around a speaking light
function voiceRing(ctx, x, y, R, lv, a, color, t, seed) {
  if (a <= .01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const n = 60;
  for (let i = 0; i < n; i++) {
    const q = i / n * Math.PI * 2, k = Math.abs(PK.RV.nz(i * .55 + t * 7, seed)) * .7 + .3 * Math.abs(PK.RV.nz(i * 1.7 - t * 11, seed + 3));
    const len = 4 + 52 * lv * k;
    ctx.strokeStyle = rgba(color, a * (.25 + .6 * k * clamp(lv * 1.6))); ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * R, y + Math.sin(q) * R); ctx.lineTo(x + Math.cos(q) * (R + len), y + Math.sin(q) * (R + len)); ctx.stroke();
  }
  ctx.strokeStyle = rgba(color, a * .22); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, R - 6, 0, 7); ctx.stroke();
  ctx.restore();
}
// sound arcs travelling from one light to the other
function arcs(ctx, t, tc, list, A, B, who, color) {
  const D = Math.hypot(B.x - A.x, B.y - A.y), dir = Math.atan2(B.y - A.y, B.x - A.x);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const r of list) {
    if (r.w !== who) continue; const u = tc - r.te; if (u < 0) continue;
    const rad = R0 + V * u; if (rad > D + 90) continue;
    const al = r.s * clamp(1 - (rad - R0) / (D + 90)) * clamp(u * 20) * .9, sp = .5 + .15 * r.s;
    ctx.strokeStyle = rgba(color, al * .16); ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(A.x, A.y, rad, dir - sp * .8, dir + sp * .8); ctx.stroke();
    ctx.strokeStyle = rgba(color, al * .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(A.x, A.y, rad, dir - sp, dir + sp); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', al * .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A.x, A.y, rad, dir - sp * .35, dir + sp * .35); ctx.stroke();
  }
  ctx.restore();
}
// swell of the listener when arcs arrive
function recv(tc, list, who, D) { let s = 0; for (const r of list) { if (r.w !== who) continue; const ta = r.te + (D - R0) / V; if (tc > ta) s += r.s * Math.exp(-(tc - ta) * 5); } return clamp(s * .55); }

window.PK.scenes.name = function (ctx, t, d, info) {
  const HG = PK.HG, RV = PK.RV, { beat, souls } = PK, D = info.sc.data || {};
  const loud = RV._nameLoud || (RV._nameLoud = RV.env(RMS));
  const v0 = info.sc.voice_t - info.sc.t0, tc = t - v0, list = rings(loud);
  const aR = act(tc, 'R'), aO = act(tc, 'O');
  const lv = loud(tc), lR = clamp(lv / NORM.R) * aR, lO = clamp(lv / NORM.O) * aO;

  // ---- the two lights (slow bob) ----
  const hc = { x: HC.x + RV.fb(t * .3, 401) * 10, y: HC.y + Math.sin(t * .9) * 5 };
  const ok = { x: OK.x + RV.fb(t * .35, 402) * 5, y: OK.y + Math.sin(t * 1.1 + 1) * 4 };
  const dist = Math.hypot(ok.x - hc.x, ok.y - hc.y);
  const rvO = recv(tc, list, 'R', dist), rvR = recv(tc, list, 'O', dist);
  const bt = beat(t, 88);

  // ---- camera: calm drift, leaning toward whoever speaks ----
  const lean = (aO - aR) * .5;
  const z = lerp(1, 1.05, P(t, -.3, d, E.inOutQ));
  const cx = 540 + 26 * lean + RV.fb(t * .3, 411) * 8, cy = 860 + 18 * lean + RV.fb(t * .27, 412) * 8;
  HG.darkFast(ctx, t + 70, .5, 15);
  ctx.save();
  ctx.translate(540, 860); ctx.rotate(RV.fb(t * .22, 413) * .004); ctx.scale(z, z); ctx.translate(-cx, -cy);
  // helmet first (to know where the lamp is), drawn after the wall
  const hAng = Math.atan2(ok.y - hc.y, ok.x - hc.x) - .08;
  const ca = Math.cos(hAng), sa = Math.sin(hAng), s = 1.38;
  const lamp = { x: hc.x + (58 * ca + 67 * sa) * s, y: hc.y + (58 * sa - 67 * ca) * s };
  const bAng = Math.atan2(ok.y - lamp.y, ok.x - lamp.x) + .05 + RV.fb(t * .4, 414) * .02;
  const b = { x: lamp.x, y: lamp.y, ang: bAng, spread: .24, len: 900, a: .62 + .08 * aR };
  HG.wall(ctx, b, { amb: 0, gain: .95 });
  const warmK = .75 + .5 * lO + .45 * rvO + .2 * aO;
  HG.light(ctx, q => {
    HG.cone(q, t, b, { lamp: .9 + .3 * lR + .3 * rvR });
    HG.heart(q, ok.x, ok.y, warmK, bt, 1.3 + .25 * lO);
    glow(q, hc.x + 30, hc.y - 20, 260, '#9fd8ff', .05 + .12 * lR);
  });
  HG.silt(ctx, t * .8, b, { n: 140, seed: 23, area: [-60, 440, 1200, 900], ambient: .025 });
  // rim from his light on the helmet + umbilical going up-left into the dark
  ctx.save(); const ug = ctx.createLinearGradient(hc.x, hc.y, hc.x - 260, hc.y - 420); ug.addColorStop(0, 'rgba(120,140,150,.5)'); ug.addColorStop(1, 'rgba(120,140,150,0)');
  ctx.strokeStyle = ug; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hc.x - 52, hc.y - 8);
  ctx.bezierCurveTo(hc.x - 130, hc.y - 40, hc.x - 120 + 12 * Math.sin(t * .6), hc.y - 250, hc.x - 250, hc.y - 430); ctx.stroke(); ctx.restore();
  RV.helmet(ctx, hc.x, hc.y, s, { ang: hAng, rx: ok.x, ry: ok.y, rim: '#ffb36b', rimA: .3 + .35 * lO + .25 * rvO, cold: .16 + .2 * lR, t });
  // voice: rings around the speaker, arcs to the listener
  arcs(ctx, t, tc, list, lamp, ok, 'R', '#dff3ff');
  arcs(ctx, t, tc, list, ok, lamp, 'O', '#ffc27a');
  voiceRing(ctx, lamp.x, lamp.y, 70, clamp(lR * 1.2), aR, '#dff3ff', t, 431);
  voiceRing(ctx, ok.x, ok.y, 84, clamp(lO * 1.3), aO, '#ffc27a', t, 437);
  // his light (the heartbeat)
  souls(ctx, t, [{ x: ok.x, y: ok.y, a: 1, s: 2.5 + .6 * lO + .4 * rvO }], { bpm: 88 });
  // the lamp itself
  glow(ctx, lamp.x, lamp.y, 46, '#ffffff', .55 + .3 * lR + .25 * rvR);
  ctx.restore();

  HG.iris(ctx, .3 - .05 * aO, .3 * bt, 560, 850);
  // static settling from the previous cut
  RV.tears(ctx, t, .7 * (1 - P(t, 0, .26, E.outQ)), 0, 470, W, 680);
  HG.subBand(ctx);
  RV.card(ctx, t, d, D, lv);
};
})();
