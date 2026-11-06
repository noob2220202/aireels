// yuasa (70.73-75.74): "배가 돌아오자, 동료 데이브 유아사가 그를 다이빙 벨로 끌고 왔습니다."
// Underwater, side view, the same lattice as before (bucket on the right, the bell's side). The ROV hovers up-left, its two
// cold cones on the small still shape on the top deck (the image from the bridge monitor). His amber light is only an ember.
//  '배가 돌아오자,'  -> the bell comes down out of the dark beside the structure, its porthole warm, and settles with a bob;
//                     chip data.time
//  '동료'            -> the hatch glows open: a cold white helmet lamp drops out of the bottom of the bell
//  '데이브 유아사가'   -> label data.who; he swims down to the deck, his lamp sweeping onto the curled figure, his umbilical
//                     paying out behind him with a warm pulse (his line is alive)
//  '그를'            -> he reaches down and clips on (a small glint at the harness)
//  '벨로 끌고'      -> he leans back and hauls: the limp silhouette lifts off the steel and follows, pull by pull (surges,
//                     exhale bubbles, lamp bobbing) toward the warm hatch; the camera closes in on the pair
//  '왔습니다.'        -> still hauling, slowly; the warm hatch light ahead (continues in 'superhuman')
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, roundRect } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const BED = 1150, SX = 296, SS = .92;                  // seabed, structure base centre + scale
const LEM = [440, 0], DS = .46, YS = .5;               // Lemons on the top deck (y from the structure), diver scales
const BX = 822, BY = 572, BS = .7;                     // the bell (final)
const ROVP = [168, 548];

const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]];
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// work-class ROV seen from the side: frame + buoyancy block, thrusters, folded arm, two lamps at the front. Returns lamp points.
function rov(ctx, x, y, s, t, a) {
  const L0 = [x + 92 * s, y + 30 * s], L1 = [x + 74 * s, y + 44 * s];
  if (!ctx || a <= 0) return [L0, L1];
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(150,170,175,.35)'; ctx.lineWidth = 3 / s; ctx.beginPath(); ctx.moveTo(-10, -44); ctx.bezierCurveTo(-20, -180, 30, -320, -10, -700); ctx.stroke();   // tether
  ctx.fillStyle = '#0b1214'; roundRect(ctx, -96, -44, 190, 34, 8); ctx.fill();                       // buoyancy block
  ctx.fillStyle = '#5a4a24'; roundRect(ctx, -96, -44, 190, 8, 4); ctx.fill();
  ctx.strokeStyle = '#141c1f'; ctx.lineWidth = 7; ctx.strokeRect(-88, -10, 172, 62);                  // frame
  ctx.fillStyle = '#081012'; ctx.fillRect(-70, -6, 120, 50);
  ctx.fillStyle = '#121a1d'; roundRect(ctx, -118, 4, 34, 22, 9); ctx.fill(); roundRect(ctx, 84, 6, 30, 20, 9); ctx.fill();   // thrusters
  ctx.strokeStyle = '#141c1f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(60, 50); ctx.lineTo(96, 66); ctx.lineTo(82, 84); ctx.stroke();   // folded arm
  ctx.strokeStyle = 'rgba(180,215,225,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-96, -44); ctx.lineTo(94, -44); ctx.moveTo(-88, -10); ctx.lineTo(84, -10); ctx.stroke();
  ctx.fillStyle = '#1b2427'; for (const [lx, ly] of [[92, 30], [74, 44]]) { ctx.beginPath(); ctx.arc(lx, ly, 9, 0, TAU); ctx.fill(); }
  ctx.restore();
  return [L0, L1];
}

window.PK.scenes.yuasa = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tShip = at('배가', .02), tBack = at('돌아오자', .07), tMate = at('동료', .26), tDave = at('데이브', .34), tYu = at('유아사가', .42);
  const tHim = at('그를', .56), tBell = at('벨로', .64), tDrag = at('끌고', .74), tCame = at('왔습니다', .8);

  // ---- the structure + him on the deck ----
  const st = LM.structure(null, SX, BED, SS, t);
  const lem0 = [LEM[0], st.topY + 5];
  // ---- the bell comes down and settles ----
  const dn = E.outC(P(t, -.35, tBack + .95));
  const bob = t > tBack + .95 ? 9 * Math.sin((t - tBack - .95) * 3.2) * Math.exp(-(t - tBack - .95) * 1.4) : 0;
  const by = lerp(-330, BY, dn) + bob, bx = BX + 4 * Math.sin(t * .6);
  const hatchK = P(t, tMate - .35, tMate + .1);
  const bellO = { glow: 1, hatch: hatchK, lamps: .55, amb: .14, swing: .03 * Math.sin(t * .9) + .02 * (1 - dn), wireTop: -60 };
  const bR = LM.bell(null, bx, by, BS, t, bellO);
  const hatch = bR.hatch;

  // ---- Yuasa: drops out of the hatch, swims to him, clips on, hauls him back ----
  const lemDeck = LM.diver(null, lem0[0], lem0[1], DS, t, { pose: 'curl', anchor: 'base', dir: 1 });
  const reach = [lemDeck.chest[0] + 104, lemDeck.chest[1] - 64];
  const ex = P(t, tMate - .12, tMate + .5, E.outC), sw = P(t, tMate + .4, tHim - .05, E.inOutQ);
  const pulls = [0, 1, 2, 3].map(k => tDrag - .1 + k * .62);
  let prog = 0; for (const tp of pulls) prog += 30 * E.inOutQ(P(t, tp, tp + .42));
  prog += 14 * P(t, tDrag, d + .3);
  const pullPh = pulls.reduce((m, tp) => (t >= tp ? tp : m), -9), pu = t - pullPh, heave = pullPh > 0 ? Math.sin(Math.PI * clamp(pu / .42)) : 0;
  const exitP = [lerp(hatch[0] + 6, hatch[0] - 26, ex), lerp(hatch[1] - 70, hatch[1] + 96, ex)];
  const swimP = [lerp(exitP[0], reach[0], sw), lerp(exitP[1], reach[1], sw) - 46 * Math.sin(Math.PI * sw)];
  const yC = [swimP[0] + prog + 2 * Math.sin(t * 1.7), swimP[1] - prog * .3 + 3 * Math.sin(t * 1.3)];
  const dragK = P(t, tHim - .25, tHim + .3, E.inOutQ), lean = P(t, tDrag - .25, tDrag + .2, E.inOutQ);
  const swimK = (1 - dragK) * P(t, tMate + .2, tMate + .55);
  const YO = { pose: 'float', pose2: 'swim', mix: swimK, dir: -1, rot: lerp(0, -.08, swimK), idle: .8, kick: .35 * swimK + .25 * lean, phase: 1.3,
    lamp: P(t, tMate - .2, tMate + .05), beamLen: 900, bailout: true, rim: '#d8eef8', rimA: .75, light: [hatch[0], hatch[1] + 40], halo: .22, detail: .8 };
  if (dragK > 0) {
    // reaching down to him, then leaning back into the haul (heave = each pull)
    const dg = LM.POSES.drag;
    YO.pose = { T: lerp(.62, dg.T - .1 * heave, lean), h: lerp(.55, .5, lean), na: [lerp(.45, 1.05 + .25 * heave, lean), lerp(.35, .55 + .35 * heave, lean)], fa: [lerp(.3, .9 + .25 * heave, lean), lerp(.5, .7 + .3 * heave, lean)],
      nl: [lerp(.6, .9 + .3 * heave, lean), lerp(-.9, -.7, lean)], fl: [lerp(.2, -.4 - .2 * heave, lean), lerp(-.6, -.3, lean)] };
    YO.pose2 = null; YO.mix = 0;
    YO.pose = Object.assign({}, YO.pose); if (dragK < 1) { const f = LM.POSES.float; for (const k of ['T', 'h']) YO.pose[k] = lerp(f[k], YO.pose[k], dragK); for (const k of ['na', 'fa', 'nl', 'fl']) YO.pose[k] = YO.pose[k].map((v, i) => lerp(f[k][i], v, dragK)); }
    YO.rot = lerp(0, -.12, lean); YO.kick = .15 * lean;
  }
  const lemNow = lemDeck;
  YO.lampAng = Math.atan2(lemNow.chest[1] - yC[1] + 40, lemNow.chest[0] - yC[0]) + .1 * Math.sin(t * 2.1) * (1 - dragK) + .08 * heave;
  const yv = LM.diver(null, yC[0], yC[1], YS, t, YO);
  const yuasaOn = t > tMate - .2;

  // ---- him: curled on the deck; after '그를' a tug, then lifted and towed (limp) at Yuasa's hands ----
  const lift = P(t, tDrag - .15, tDrag + .55, E.inOutQ), tug = Math.exp(-Math.pow((t - tHim - .3) / .18, 2));
  const grip = [(yv.hand[0] + yv.hand2[0]) / 2, (yv.hand[1] + yv.hand2[1]) / 2];
  // towed: almost horizontal, head toward Yuasa, back (harness + bailout) up, arms and legs trailing
  const LO = { pose: 'curl', pose2: { T: .12, h: .6, na: [.32 + .06 * Math.sin(t * 1.3), .25], fa: [.18 + .06 * Math.sin(t * 1.1 + 1), .35], nl: [.06, -.14], fl: [-.08, -.22] }, mix: lift, dir: 1,
    rot: lerp(0, 1.32 - .06 * heave, lift), idle: .2 * lift, anchor: lift > 0 ? 'chest' : 'base', life: .42, lifeS: .35, bpm: 38, phase: 2.1, bailout: true,
    rim: '#ffc58a', rimA: .45, rim2A: .08, halo: .06, detail: .45, fill: '#030505', light: [yC[0], yC[1] - 60] };
  const lemC0 = LM.diver(null, lem0[0], lem0[1], DS, t, Object.assign({}, LO, { pose2: null, mix: 0, rot: 0, anchor: 'base' })).chest;
  let lp;
  if (lift > 0) {
    const o0 = LM.diver(null, 0, 0, DS, t, LO), off = [o0.valve[0] - o0.chest[0], o0.valve[1] - o0.chest[1]];
    const tgt = [grip[0] - off[0] - 6 - 8 * heave, grip[1] - off[1] + 16];
    lp = [lerp(lemC0[0] + 3 * tug, tgt[0], lift), lerp(lemC0[1], tgt[1], lift)];
  } else lp = [lem0[0] + 4 * tug, lem0[1]];
  const lv = LM.diver(null, lp[0], lp[1], DS, t, LO);

  // ---- camera: wide, then in on the pair as he starts to haul ----
  const zk = P(t, tHim - .4, d + .3, E.inOutQ), z = lerp(1, 1.42, zk);
  const foc = [lerp(540, (yC[0] + lv.chest[0]) / 2 + 30, zk), lerp(830, (yC[1] + lv.chest[1]) / 2, zk)];
  const scr = [540, lerp(830, 840, zk)];
  const dr = { x: fb(t * .35, 71) * 9, y: fb(t * .3, 72) * 8, r: fb(t * .25, 73) * .003 };
  const sk = LM.shake(t, .2 + .25 * heave * lean, 77), jo = LM.jolt(t, tBack + .95, .45);
  const ox = scr[0] + dr.x + sk.x + jo.x, oy = scr[1] + dr.y + sk.y + jo.y;
  const toS = p => [(p[0] - foc[0]) * z + ox, (p[1] - foc[1]) * z + oy];

  // ---- lights ----
  const rovA = 1, rl = rov(null, ROVP[0], ROVP[1] + 6 * Math.sin(t * .8), 1, t, rovA);
  const rovT = [lemNow.chest[0] - 10, lemNow.chest[1] + 6];
  const rovTarget = lift > 0 ? [lerp(rovT[0], lv.chest[0], lift * .6), lerp(rovT[1], lv.chest[1], lift * .6)] : rovT;
  const lights = [LM.light(rovTarget[0], rovTarget[1] - 20, 300, COL.lamp, .55), LM.light((rl[0][0] + rovTarget[0]) / 2, (rl[0][1] + rovTarget[1]) / 2, 200, COL.lamp, .25)]
    .concat(bR.lights, lv.lights, yuasaOn ? yv.lights : []);
  const sl = lights.map(Lt => { const p = toS([Lt.x, Lt.y]); return { x: p[0], y: p[1], r: Lt.r * z, color: Lt.color, a: Lt.a }; });

  // ================= draw =================
  LM.sea(ctx, t, { dark: .8, lights: sl, seed: 41, haze: 0, snow: 1, current: [-4, -2], cam: [(foc[0] - 540) * z, (foc[1] - 830) * z] });
  // scattering haze, only around the strong sources (gradient fills: far cheaper than one sprite glow per light)
  sl.filter(Lt => Lt.r > 150).sort((a, b) => b.r * b.a - a.r * a.a).slice(0, 3).forEach(Lt => softGlow(ctx, Lt.x, Lt.y, Math.min(Lt.r * .85, 520), Lt.color, .15 * Lt.a));
  ctx.save();
  ctx.translate(ox, oy); ctx.rotate(dr.r + sk.r); ctx.scale(z, z); ctx.translate(-foc[0], -foc[1]);
  LM.seabed(ctx, BED, t, { dark: .8, lights, seed: 4 });
  // ROV + its cones on him
  const rp = [ROVP[0], ROVP[1] + 6 * Math.sin(t * .8)];
  for (const lpnt of rl) LM.lampBeam(ctx, t, lpnt[0], lpnt[1], Math.atan2(rovTarget[1] - lpnt[1], rovTarget[0] - lpnt[0]), .62, { len: 560, spread: .17, s: .8, seed: 13 + Math.round(lpnt[1]) });
  rov(ctx, rp[0], rp[1], 1, t, rovA);
  LM.structure(ctx, SX, BED, SS, t, { lights, amb: .05 });
  // his severed line: a short frayed stub at the helmet
  {
    const u0 = lv.umb, k = DS / .46, sw2 = Math.sin(t * .9) * 6;
    const stub = [[u0[0], u0[1]], [u0[0] + (14 + sw2) * k, u0[1] - 40 * k], [u0[0] + (40 + sw2 * 1.5) * k, u0[1] - 58 * k]];
    LM.umbilical(ctx, stub, t, { w: 8, lit: .3, tension: .1, sway: 4, cut: { at: t - 4, frac: .99, recoil: 0, whip: 0 } });
  }
  LM.diver(ctx, lp[0], lp[1], DS, t, LO);
  softGlow(ctx, lv.chest[0], lv.chest[1], 150, COL.amber, .16 * (.8 + .2 * lv.beat));
  // Yuasa's own umbilical (alive: a warm pulse runs down it), then him, then the bell over the hatch trunk
  if (yuasaOn) {
    const e0 = bR.exit, u1 = yv.umb, mid = [lerp(e0[0], u1[0], .5) + 20, Math.max(e0[1], u1[1]) + 70 + 20 * Math.sin(t * .7)];
    LM.umbilical(ctx, [e0, mid, u1], t, { w: 9, lit: .5, sag: 30, tension: .05, sway: 6, pulse: .55, pulseSpeed: 260, glow: .25 });
    LM.diver(ctx, yC[0], yC[1], YS, t, YO);
    const bursts = []; for (let k = 0; k < 6; k++) { const tb = tMate + .5 + k * .7; if (tb < t + .01) bursts.push(tb); }
    LM.bubbles(ctx, t, yv.head[0] - 6, yv.head[1] - 26, { bursts, a: .7, s: .8, seed: 23, n: 10 });
  }
  LM.bell(ctx, bx, by, BS, t, bellO);
  // the clip: a small glint at his harness
  const cg = Math.exp(-Math.pow((t - tHim - .18) / .12, 2));
  if (cg > .02) { LM.glow(ctx, grip[0], grip[1], 60, '#ffffff', .8 * cg); LM.glow(ctx, grip[0], grip[1], 160, COL.lamp, .3 * cg); }
  if (lift > 0) { ctx.save(); ctx.strokeStyle = rgba('#c8b07a', .7); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(grip[0], grip[1]); ctx.lineTo(lv.valve[0], lv.valve[1]); ctx.stroke(); ctx.restore(); }
  ctx.restore();

  LM.subBand(ctx, .82);
  // ---- labels ----
  const tA = P(t, tShip - .05, tShip + .2, E.outQ) * (1 - P(t, tDave - .25, tDave));
  if (tA > 0) { const s = lerp(.88, 1, E.outBack(P(t, tShip - .05, tShip + .3))); ctx.save(); ctx.translate(540, 500); ctx.scale(s, s); PK.chip(ctx, D.time || '', 0, 0, tA, { size: 34, color: '#ffffff', border: 'rgba(255,200,130,.55)' }); ctx.restore(); }
  const rA = P(t, -.1, .25) * (1 - P(t, tMate - .2, tMate + .1));
  if (rA > 0) { const p = toS([rp[0], rp[1] - 70]); text(ctx, 'ROV', p[0], p[1], { size: 26, weight: 800, color: '#cfe8ff', alpha: rA * .85, stroke: 'rgba(0,0,0,.7)', strokeW: 5 }); }
  const wA = P(t, tDave - .1, tDave + .15, E.outQ) * (1 - P(t, d - .15, d + .2));
  if (wA > 0) {
    const hp = toS(yv.head), cx = clamp(hp[0] + 40, 250, 830), cy = Math.max(560, hp[1] - 150);
    ctx.save(); ctx.globalAlpha = wA * .7; ctx.strokeStyle = 'rgba(220,240,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy + 26); ctx.lineTo(hp[0] + 6, hp[1] - 50); ctx.stroke(); ctx.restore();
    PK.chip(ctx, D.who || '', cx, cy, wA, { size: 32, color: '#e8f6ff', border: 'rgba(220,240,255,.55)' });
  }
  void tYu; void tBell; void tCame; void H; void W;
};
})();
