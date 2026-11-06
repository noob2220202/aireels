// home (clip, DCN helmet-cam radio, surface supervisor): "And then we're gonna bring you home, okay?"
// Continues the name exchange from the same positions (diver's helmet + cold lamp upper left, his warm light in the doorway).
// The voice now comes from above: arcs of sound descend from a faint warm light high in the dark: the diving bell. The diver
// drifts down to his side, turns his helmet and beam up toward it, and the two lights start to rise together, the diver's
// umbilical leading back up to the bell. The camera tilts up with them; the wreck's bulkhead falls back into the dark.
// "home" -> the bell's warm light swells (warm hope), its rays reach down to them; "okay?" -> a second, softer swell.
// Attribution card up while the voice plays.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, godrays } = L;
const PK = window.PK;

const RMS = [12, 15, 21, 28, 13, 17, 34, 36, 11, 12, 24, 34, 16, 12, 50, 36, 24, 96, 70, 18, 16, 48, 45, 41, 19, 11, 24, 23, 20, 33, 50, 31, 21, 23, 49, 77, 80, 73, 67, 58, 38, 37, 33, 26, 30, 37, 13, 9, 19, 53, 78, 99, 73, 50, 43, 44, 35, 21, 8, 5, 4, 4, 5, 8, 13, 15, 20];
const WD = { bring: .78, home: 1.16, homeEnd: 1.44, okay: 1.60, end: 2.02 };
const BELL = { x: 850, y: 540 };

// the diving bell (silhouette from the RV kit: a dome over a flat skirt), hanging on its lift wire
function bellSil(ctx, x, y, s, warm, cold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // lift wire up into the dark: it fades out before the title band (screen y 470)
  const M = ctx.getTransform(), yTop = (470 - M.f) / (M.d || 1);
  if (yTop < -50) {
    const wg = ctx.createLinearGradient(0, -44, 0, yTop); wg.addColorStop(0, rgba('#c9b48a', .5)); wg.addColorStop(1, 'rgba(201,180,138,0)');
    ctx.strokeStyle = wg; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, yTop); ctx.stroke();
  }
  const p = PK.RV.bellPath();
  // warm rim: backlit by its own light from the open bottom hatch
  ctx.strokeStyle = rgba('#ffcf8a', .45 * warm); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(p);
  ctx.fillStyle = '#06090b'; ctx.fill(p);
  ctx.fillRect(-7, -44, 14, 7);                                             // padeye
  ctx.fillRect(-40, 22, 80, 5);                                             // skirt ring
  // the diver's cold lamp catching its lower-left flank (metal, not a flat cut-out)
  if (cold > .01) { ctx.save(); ctx.clip(p); const cg = ctx.createLinearGradient(-36, 20, 6, -10); cg.addColorStop(0, rgba('#cfeaff', .22 * cold)); cg.addColorStop(1, 'rgba(207,234,255,0)'); ctx.fillStyle = cg; ctx.fillRect(-40, -40, 80, 66); ctx.restore(); }
  // a faint structural seam across the dome (unlit: no 'eyes')
  ctx.strokeStyle = rgba('#c9b48a', .12 + .08 * warm); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-27, -6); ctx.lineTo(27, -6); ctx.stroke();
  // lit hatch: a thin flat line of warm light under the skirt
  ctx.fillStyle = rgba('#ffd9a0', .55 + .4 * warm); ctx.beginPath(); ctx.ellipse(0, 28, 16, 2, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function arcsDown(ctx, tc, list, A, B, color) {
  const D = Math.hypot(B.x - A.x, B.y - A.y), dir = Math.atan2(B.y - A.y, B.x - A.x);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const r of list) {
    const u = tc - r.te; if (u < 0) continue; const rad = 30 + 520 * u; if (rad > D + 80) continue;
    const al = r.s * clamp(1 - rad / (D + 80)) * clamp(u * 20) * .8, sp = .42 + .1 * r.s;
    ctx.strokeStyle = rgba(color, al * .15); ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(A.x, A.y, rad, dir - sp * .8, dir + sp * .8); ctx.stroke();
    ctx.strokeStyle = rgba(color, al * .5); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(A.x, A.y, rad, dir - sp, dir + sp); ctx.stroke();
  }
  ctx.restore();
}
let LIST = null;

window.PK.scenes.home = function (ctx, t, d, info) {
  if (PK.RV.hiddenInCut(t, d, info)) return;                      // the other side of a hard cut is on screen
  const HG = PK.HG, RV = PK.RV, { beat, souls } = PK, D = info.sc.data || {};
  const { HC, OK } = PK.RVN || { HC: { x: 282, y: 700 }, OK: { x: 772, y: 968 } };
  const loud = RV._homeLoud || (RV._homeLoud = RV.env(RMS));
  const v0 = info.sc.voice_t - info.sc.t0, tc = t - v0, w = k => v0 + WD[k], lv = loud(tc);
  if (!LIST) { LIST = []; for (let te = 0; te < WD.end; te += .13) { const v = clamp(loud(te + .03) * 1.15); if (v > .15) LIST.push({ te, s: v }); } }

  // ---- motion: the diver comes to his side, both turn up toward the bell and start to rise ----
  const meet = P(t, .02, 1.1, E.inOutQ), rise = P(t, .8, d + .9, E.inOutQ);
  const bob = Math.sin(t * .9) * 5;
  const hc = { x: lerp(HC.x, 560, meet) + 100 * rise + RV.fb(t * .3, 401) * 10 * (1 - meet), y: lerp(HC.y, 842, meet) - 180 * rise + bob };
  const ok = { x: lerp(OK.x, 742, meet) + 100 * rise + RV.fb(t * .35, 402) * 5, y: lerp(OK.y, 884, meet) - 180 * rise + Math.sin(t * 1.1 + 1) * 4 };
  const toBell = Math.atan2(BELL.y - hc.y, BELL.x - hc.x);
  const a0 = Math.atan2(OK.y - HC.y, OK.x - HC.x) - .08, hAng = lerp(a0, toBell + .12, P(t, .35, 1.4, E.inOutQ));
  const s = 1.38, ca = Math.cos(hAng), sa = Math.sin(hAng);
  const lamp = { x: hc.x + (58 * ca + 67 * sa) * s, y: hc.y + (58 * sa - 67 * ca) * s };
  const bAng = lerp(Math.atan2(ok.y - lamp.y, ok.x - lamp.x) + .05, toBell - .05, P(t, .35, 1.4, E.inOutQ)) + RV.fb(t * .4, 414) * .02;
  const b = { x: lamp.x, y: lamp.y, ang: bAng, spread: .24, len: 900, a: .66 };
  const bellA = .3 + .3 * P(t, w('bring') - .3, w('home') + .2, E.inOutQ) + .55 * Math.exp(-Math.max(0, t - w('home')) * 2.6) * P(t, w('home') - .1, w('home')) + .3 * Math.exp(-Math.max(0, t - w('okay')) * 3) * P(t, w('okay') - .1, w('okay'));
  const bt = beat(t, 86);
  const mid = { x: (lamp.x + ok.x) / 2, y: (lamp.y + ok.y) / 2 };

  // ---- camera: from the name framing, tilting up with them ----
  const tilt = P(t, .45, d + .5, E.inOutQ);
  const z = lerp(1.05, .97, tilt), cx = 540 + 60 * tilt + RV.fb(t * .3, 411) * 8, cy = 860 - 190 * tilt + RV.fb(t * .27, 412) * 8;
  HG.darkFast(ctx, t + 80, .5, 15);
  ctx.save();
  ctx.translate(540, 860); ctx.rotate(RV.fb(t * .22, 413) * .004); ctx.scale(z, z); ctx.translate(-cx, -cy);
  const WO = (PK.RVN && PK.RVN.WO) || { x: 260, y: 120 }, wg = .8 * (1 - P(t, .25, 1.5, E.inOutQ));
  if (wg > 0) { ctx.save(); ctx.translate(WO.x, WO.y); HG.wall(ctx, { ...b, x: b.x - WO.x, y: b.y - WO.y }, { amb: 0, gain: wg }); ctx.restore(); }
  HG.light(ctx, q => {
    // the bell's warm light high above, rays reaching down toward them
    glow(q, BELL.x, BELL.y, 620, '#ff9a3c', .16 * bellA); glow(q, BELL.x, BELL.y, 210, '#ffcf8a', .4 * bellA);
    godrays(q, BELL.x, BELL.y + 20, Math.atan2(mid.y - BELL.y, mid.x - BELL.x), .6, 820, '#ffcf8a', .16 * bellA, t, 7);
    HG.cone(q, t, b, { lamp: .95 });
    HG.heart(q, ok.x, ok.y, .85 + .2 * bellA, bt, 1.3);
  });
  HG.silt(ctx, t * .8 + 4.4, b, { n: 140, seed: 23, area: [-60, 200, 1200, 1000], ambient: .025 });
  bellSil(ctx, BELL.x, BELL.y, 1.25, bellA, .3 + .7 * P(t, .35, 1.4, E.inOutQ));
  arcsDown(ctx, tc, LIST, { x: BELL.x, y: BELL.y + 20 }, mid, '#ffe1b0');
  // umbilical from the helmet back up toward the bell
  ctx.save(); ctx.lineCap = 'round';
  const u0 = { x: hc.x - 52 * ca + 8 * sa, y: hc.y - 52 * sa - 8 * ca }, ug = ctx.createLinearGradient(u0.x, u0.y, BELL.x, BELL.y);
  ug.addColorStop(0, 'rgba(120,140,150,.5)'); ug.addColorStop(.7, rgba('#c9a46a', .25 * (.6 + .4 * bellA))); ug.addColorStop(1, rgba('#ffcf8a', .1));
  ctx.strokeStyle = ug; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(u0.x, u0.y);
  ctx.bezierCurveTo(u0.x - 150, u0.y - 30, lerp(u0.x - 140, BELL.x - 260, .5), lerp(u0.y - 260, BELL.y + 160, .5) + 10 * Math.sin(t * .7), BELL.x - 30, BELL.y + 30); ctx.stroke(); ctx.restore();
  PK.RV.helmet(ctx, hc.x, hc.y, s, { ang: hAng, rx: ok.x, ry: ok.y, rim: '#ffb36b', rimA: .42, cold: .18, t });
  souls(ctx, t, [{ x: ok.x, y: ok.y, a: 1, s: 2.5 + .3 * bellA }], { bpm: 86 });
  glow(ctx, lamp.x, lamp.y, 46, '#ffffff', .6);
  ctx.restore();

  HG.iris(ctx, .3 - .12 * tilt, .3 * bt, 600, 760);
  HG.subBand(ctx);
  RV.card(ctx, t, d, D, lv);
};
})();
