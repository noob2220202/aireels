// chamber: "곧장 올라오면 위험했기에, 그는 감압 챔버에서 약 60시간을 더 보내야 했습니다."
// Calmer, a clean side-view diagram (the audio un-muffles here): the sea column from the surface down to the seabed, the
// overturned hull lying on it, the diving bell hanging on its wire from the support vessel's moonpool, and on deck above it
// the decompression chamber. A pressure gauge (HUD, lower left) reads '수심 30m ≈ 약 4기압'.
// '곧장 올라오면' -> a dashed arrow shoots from his warm light straight up to the surface; '위험했기에' -> a red X stamps on
// it, the arrow turns red, the gauge needle trembles in its red zone. '그는' -> a small helmet lamp leads his light to the
// bell ('잠수종'); '감압' -> the bell rises up its wire, the camera following; '챔버에서' -> '감압 챔버' appears and the bell
// mates under the chamber (a soft clunk); his light passes up into the chamber. '약 60시간을' -> the counter
// '약 60시간 (보도에 따라 2~3일)' with a running clock, the sky above the vessel turns through days and nights and the gauge
// needle eases from 4 down to 1. '더 보내야 했습니다' -> stillness: his light beating slow and steady inside the chamber.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK;

// ---- diagram world ----
const YS = 600, YB = 1110;                                    // sea surface / seabed
const MP = { x: 560, y0: 552, y1: 642, hw: 42 };              // moonpool through the vessel
const CH = { x: 560, y: 510, hl: 128, r: 34 };                // deck chamber (centre, half length, radius)
const TR = { y0: 544, y1: 572 };                              // mating trunk under the chamber
const BELL_R = 30, BELL0 = { x: 560, y: 925 }, DOCK_Y = TR.y1 + BELL_R + 6;
const HIM0 = { x: 668, y: 994 }, GUIDE0 = { x: 630, y: 968 };

function surfY(x, t) { return YS + Math.sin(x * .02 + t * 1.4) * 3 + Math.sin(x * .051 - t * .9) * 1.5; }
function seaAndSky(ctx, t, day) {
  // sky: night <-> day (subtle)
  const sky = ctx.createLinearGradient(0, 0, 0, YS);
  sky.addColorStop(0, '#03060a'); sky.addColorStop(1, '#07121a');
  ctx.fillStyle = sky; ctx.fillRect(-600, -400, 2400, YS + 400);
  if (day > .01) {
    const dg = ctx.createLinearGradient(0, 100, 0, YS); dg.addColorStop(0, rgba('#2f5a6e', .55 * day)); dg.addColorStop(1, rgba('#8fb9c4', .32 * day));
    ctx.fillStyle = dg; ctx.fillRect(-600, -400, 2400, YS + 400);
  }
  // sea column
  const sg = ctx.createLinearGradient(0, YS, 0, YB); sg.addColorStop(0, '#0d3a47'); sg.addColorStop(.35, '#082630'); sg.addColorStop(1, '#030e13');
  ctx.beginPath(); ctx.moveTo(-600, YB + 400); for (let x = -600; x <= 1700; x += 12) ctx.lineTo(x, surfY(x, t)); ctx.lineTo(1700, YB + 400); ctx.closePath();
  ctx.fillStyle = sg; ctx.fill();
  if (day > .01) { ctx.save(); ctx.globalAlpha = .25 * day; const lg = ctx.createLinearGradient(0, YS, 0, YS + 300); lg.addColorStop(0, '#5fa9bd'); lg.addColorStop(1, 'rgba(95,169,189,0)'); ctx.fillStyle = lg; ctx.fillRect(-600, YS, 2400, 300); ctx.restore(); }
  // surface line
  ctx.strokeStyle = rgba('#bfe9ff', .55 + .25 * day); ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = -600; x <= 1700; x += 12) { const y = surfY(x, t); x === -600 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  // seabed
  ctx.fillStyle = '#0c0d0c'; ctx.fillRect(-600, YB, 2400, 500);
  ctx.strokeStyle = 'rgba(150,130,100,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-600, YB); ctx.lineTo(1700, YB); ctx.stroke();
  // depth scale on the left edge of the column (ticks only)
  ctx.strokeStyle = 'rgba(160,210,230,.22)'; ctx.lineWidth = 2;
  for (let k = 0; k <= 6; k++) { const y = lerp(YS, YB, k / 6); ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(k % 3 === 0 ? 92 : 78, y); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(60, YS); ctx.lineTo(60, YB); ctx.stroke();
}
// the overturned tug on the seabed (keel up, deckhouse into the mud)
function wreck(ctx, t) {
  ctx.save(); ctx.translate(800, YB);
  ctx.beginPath(); ctx.moveTo(-200, -26); ctx.lineTo(-190, -64); ctx.quadraticCurveTo(-170, -92, -120, -96); ctx.lineTo(150, -96); ctx.quadraticCurveTo(196, -94, 214, -60); ctx.lineTo(222, -26); ctx.closePath();
  const hg = ctx.createLinearGradient(0, -96, 0, -26); hg.addColorStop(0, '#5a2a24'); hg.addColorStop(.35, '#3a1d19'); hg.addColorStop(.4, '#1b2226'); hg.addColorStop(1, '#0d1215');
  ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = 'rgba(170,200,212,.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#0a0e10'; ctx.fillRect(-120, -26, 170, 26); ctx.strokeRect(-120, -26, 170, 26);   // deckhouse, upside down, half buried
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-200, -26, 422, 4);
  ctx.restore();
  // silt mound
  ctx.save(); const mg = ctx.createRadialGradient(800, YB, 10, 800, YB, 300); mg.addColorStop(0, 'rgba(90,85,70,.25)'); mg.addColorStop(1, 'rgba(90,85,70,0)'); ctx.fillStyle = mg; ctx.fillRect(500, YB - 80, 600, 80); ctx.restore();
}
// support vessel (cutaway at the moonpool) + the deck decompression chamber
function vessel(ctx, t, o) {
  ctx.save();
  // hull
  const hull = new Path2D(); hull.moveTo(118, 534); hull.lineTo(950, 548); hull.lineTo(952, 608); hull.quadraticCurveTo(940, 640, 900, 644); hull.lineTo(250, 644); hull.quadraticCurveTo(170, 640, 140, 600); hull.closePath();
  const hg = ctx.createLinearGradient(0, 534, 0, 644); hg.addColorStop(0, '#2b3740'); hg.addColorStop(.5, '#1a2329'); hg.addColorStop(1, '#0c1114');
  ctx.fillStyle = hg; ctx.fill(hull);
  // moonpool (cut through the hull: water inside)
  ctx.fillStyle = '#062029'; ctx.fillRect(MP.x - MP.hw, MP.y0, MP.hw * 2, MP.y1 - MP.y0 + 4);
  ctx.strokeStyle = 'rgba(180,215,228,.45)'; ctx.lineWidth = 2; ctx.stroke(hull);
  ctx.beginPath(); ctx.moveTo(MP.x - MP.hw, MP.y0); ctx.lineTo(MP.x - MP.hw, MP.y1 + 2); ctx.moveTo(MP.x + MP.hw, MP.y0); ctx.lineTo(MP.x + MP.hw, MP.y1 + 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(180,215,228,.25)'; ctx.beginPath(); ctx.moveTo(130, 552); ctx.lineTo(948, 552); ctx.stroke();   // deck line
  // bridge (left) with a mast
  ctx.fillStyle = '#1d272d'; roundRect(ctx, 170, 456, 170, 92, 6); ctx.fill(); ctx.strokeStyle = 'rgba(180,215,228,.4)'; ctx.stroke();
  ctx.fillStyle = '#121a1f'; roundRect(ctx, 196, 418, 118, 40, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba('#9fd0e0', .25 + .25 * o.day); for (let k = 0; k < 5; k++) ctx.fillRect(204 + k * 22, 428, 14, 12);
  ctx.strokeStyle = 'rgba(180,215,228,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(256, 418); ctx.lineTo(256, 360); ctx.moveTo(240, 378); ctx.lineTo(272, 378); ctx.stroke();
  // stern crane (right)
  ctx.lineWidth = 5; ctx.strokeStyle = '#2b363d'; ctx.beginPath(); ctx.moveTo(860, 548); ctx.lineTo(860, 470); ctx.lineTo(930, 420); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(180,215,228,.3)'; ctx.stroke();
  // mating trunk + chamber
  ctx.fillStyle = '#2a353c'; ctx.fillRect(CH.x - 15, TR.y0, 30, TR.y1 - TR.y0); ctx.strokeStyle = 'rgba(200,225,235,.5)'; ctx.lineWidth = 2; ctx.strokeRect(CH.x - 15, TR.y0, 30, TR.y1 - TR.y0);
  // saddles
  ctx.fillStyle = '#1b2328'; ctx.fillRect(CH.x - CH.hl + 24, 538, 26, 14); ctx.fillRect(CH.x + CH.hl - 50, 538, 26, 14);
  const cp = new Path2D(); cp.moveTo(CH.x - CH.hl, CH.y - CH.r); cp.lineTo(CH.x + CH.hl, CH.y - CH.r); cp.arc(CH.x + CH.hl, CH.y, CH.r, -Math.PI / 2, Math.PI / 2); cp.lineTo(CH.x - CH.hl, CH.y + CH.r); cp.arc(CH.x - CH.hl, CH.y, CH.r, Math.PI / 2, Math.PI * 1.5); cp.closePath();
  const cg = ctx.createLinearGradient(0, CH.y - CH.r, 0, CH.y + CH.r); cg.addColorStop(0, '#8a9aa2'); cg.addColorStop(.25, '#56656d'); cg.addColorStop(1, '#1e272c');
  ctx.fillStyle = cg; ctx.fill(cp);
  // cutaway window: the dark interior, warm when he is inside
  ctx.save(); ctx.clip(cp);
  const iw = new Path2D(); iw.roundRect(CH.x - CH.hl + 22, CH.y - CH.r + 10, CH.hl * 2 - 44, CH.r * 2 - 20, 14);
  ctx.fillStyle = '#05080a'; ctx.fill(iw);
  if (o.inside > 0) { ctx.save(); ctx.clip(iw); const ig = ctx.createRadialGradient(o.hx, o.hy, 0, o.hx, o.hy, 200); ig.addColorStop(0, rgba('#ffb36b', .55 * o.inside)); ig.addColorStop(1, rgba('#ffb36b', .06 * o.inside)); ctx.fillStyle = ig; ctx.fill(iw); ctx.restore(); }
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.stroke(iw);
  ctx.restore();
  ctx.strokeStyle = rgba('#e8f6ff', .5 + .3 * o.hot); ctx.lineWidth = 2.5; ctx.stroke(cp);
  ctx.strokeStyle = 'rgba(20,28,32,.8)'; ctx.lineWidth = 3; for (const dx of [-CH.hl + 6, CH.hl - 6]) { ctx.beginPath(); ctx.moveTo(CH.x + dx, CH.y - CH.r + 2); ctx.lineTo(CH.x + dx, CH.y + CH.r - 2); ctx.stroke(); }
  ctx.restore();
}
// closed diving bell (side view). warm: its viewports / hatch lit by the light inside
function bell(ctx, x, y, warm, hot) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#1a2328'; ctx.fillRect(-BELL_R - 7, -8, 7, 36); ctx.fillRect(BELL_R, -8, 7, 36);           // frame / ballast
  ctx.fillRect(-BELL_R - 9, 26, BELL_R * 2 + 18, 6);
  const bg = ctx.createRadialGradient(-10, -12, 4, 0, 0, BELL_R + 4); bg.addColorStop(0, '#8d9ca3'); bg.addColorStop(.5, '#4b5960'); bg.addColorStop(1, '#1b2328');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, BELL_R, 0, 7); ctx.fill();
  ctx.strokeStyle = rgba('#e8f6ff', .45 + .4 * hot); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#2a353c'; ctx.fillRect(-8, -BELL_R - 6, 16, 8);                                          // padeye
  ctx.fillStyle = '#0b1013'; ctx.fillRect(-11, BELL_R - 4, 22, 9);                                            // bottom hatch
  ctx.fillStyle = rgba('#ffd9a0', .15 + .75 * warm); ctx.fillRect(-9, BELL_R - 2, 18, 5);
  for (const vx of [-12, 12]) { ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.arc(vx, -3, 6, 0, 7); ctx.fill(); ctx.fillStyle = rgba('#ffd9a0', .8 * warm); ctx.beginPath(); ctx.arc(vx, -3, 4.5, 0, 7); ctx.fill(); }
  ctx.restore();
  if (warm > .02) glow(ctx, x, y, 90, '#ffb347', .3 * warm);
}
// pressure gauge (HUD): v in atm (1..4)
function gauge(ctx, t, x, y, R, v, a, danger, calm, label) {
  if (a <= 0) return;
  const A0 = Math.PI * .75, A1 = Math.PI * 2.25, ang = vv => lerp(A0, A1, (vv - 1) / 3);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(3,8,12,.88)'; ctx.beginPath(); ctx.arc(x, y, R + 16, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(160,220,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R + 16, 0, 7); ctx.stroke();
  // red zone around 4, calm zone at 1
  ctx.lineCap = 'butt'; ctx.lineWidth = 9;
  ctx.strokeStyle = rgba('#e3262f', .45 + .5 * danger * (.6 + .4 * Math.sin(t * 22))); ctx.beginPath(); ctx.arc(x, y, R - 4, ang(3.35), ang(4)); ctx.stroke();
  ctx.strokeStyle = rgba('#8fe0c8', .3 + .6 * calm); ctx.beginPath(); ctx.arc(x, y, R - 4, ang(1), ang(1.45)); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,230,245,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R - 10, A0, A1); ctx.stroke();
  for (let k = 0; k <= 12; k++) { const q = lerp(A0, A1, k / 12), l = k % 4 === 0 ? 14 : 7; ctx.strokeStyle = 'rgba(220,240,250,.7)'; ctx.lineWidth = k % 4 === 0 ? 3 : 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(q) * (R - 10), y + Math.sin(q) * (R - 10)); ctx.lineTo(x + Math.cos(q) * (R - 10 - l), y + Math.sin(q) * (R - 10 - l)); ctx.stroke(); }
  ctx.restore();
  for (let k = 1; k <= 4; k++) { const q = ang(k); text(ctx, String(k), x + Math.cos(q) * (R - 38), y + Math.sin(q) * (R - 38) + 1, { size: 24, weight: 800, color: k === 4 ? '#ffb0ad' : '#dff1ff', alpha: a }); }
  // needle
  const q = ang(v);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  ctx.strokeStyle = danger > .05 ? rgba('#ff5a5f', 1) : '#ffffff'; ctx.lineWidth = 5; ctx.shadowColor = danger > .05 ? '#e3262f' : '#9fd8ff'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(x - Math.cos(q) * 12, y - Math.sin(q) * 12); ctx.lineTo(x + Math.cos(q) * (R - 18), y + Math.sin(q) * (R - 18)); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#dfe9ef'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
  ctx.restore();
  text(ctx, label, x, y + R + 46, { size: 28, weight: 800, color: '#dff1ff', stroke: '#000', strokeW: 6, alpha: a });
}
// the dashed arrow straight up, and the red X
function upArrow(ctx, x, y0, y1, p, red, a) {
  if (p <= 0 || a <= 0) return;
  const y = lerp(y0, y1, p), col = red > .5 ? '#ff4d55' : '#e8f6ff';
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([16, 14]); ctx.lineDashOffset = 0;
  ctx.shadowColor = red > .5 ? '#e3262f' : '#9fd8ff'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y + 18); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x - 17, y + 24); ctx.lineTo(x + 17, y + 24); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function redX(ctx, x, y, p, a, t) {
  if (p <= 0 || a <= 0) return;
  const s = lerp(2.2, 1, E.outBack(clamp(p), 2.4)), r = 56;
  ctx.save(); ctx.globalAlpha *= a * clamp(p * 3); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.06);
  ctx.fillStyle = 'rgba(3,6,8,.75)'; ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, 7); ctx.fill();
  ctx.strokeStyle = '#e3262f'; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.shadowColor = '#e3262f'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(r, -r); ctx.lineTo(-r, r); ctx.stroke();
  ctx.restore();
}
function clock(ctx, x, y, r, p, a, t) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(223,241,255,.25)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r + 9, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#ffcf8a'; ctx.beginPath(); ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p)); ctx.stroke();
  ctx.strokeStyle = '#dff1ff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  const mA = -Math.PI / 2 + p * 60 * Math.PI * 2 / 6, hA = -Math.PI / 2 + p * 60 * Math.PI * 2 / 72;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(mA) * r * .78, y + Math.sin(mA) * r * .78); ctx.stroke();
  ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(hA) * r * .5, y + Math.sin(hA) * r * .5); ctx.stroke();
  ctx.restore();
}

window.PK.scenes.chamber = function (ctx, t, d, info) {
  const HG = PK.HG, RV = PK.RV, { at, beat, souls } = PK, D = info.sc.data || {};
  const tGo = at(info, '곧장', .02), tOl = at(info, '올라오면', .09), tWi = at(info, '위험했기에', .17), tGe = at(info, '그는', .34),
    tGa = at(info, '감압', .4), tCh = at(info, '챔버에서', .46), tYak = at(info, '약', .58), t60 = at(info, '60시간을', .65), tDe = at(info, '더', .77);

  // ---- beats ----
  const arrowP = P(t, tGo - .05, tOl + .3, E.outC), arrowA = 1 - P(t, tGe - .45, tGe - .05, E.inQ);
  const xP = P(t, tWi + .02, tWi + .32), danger = P(t, tWi, tWi + .15) * (1 - P(t, tGe - .4, tGe));
  const go = P(t, tGe - .3, tGa + .12, E.inOutQ);                       // his light follows the guide into the bell
  const tDock = tCh + .55;
  const lift = P(t, tGa + .02, tDock, E.inOutC);
  const dock = P(t, tDock - .02, tDock + .04), up = P(t, tDock + .05, tDock + .5, E.inOutQ);
  const pass = P(t, tYak - .05, d - .5, E.inOutQ);                       // time in the chamber
  const v = 4 - 3 * P(t, tYak + .1, d - .35, E.inOutQ) + .07 * danger * RV.nz(t * 30, 7);
  const day = .5 - .5 * Math.cos(Math.PI * 2 * 2.5 * pass);               // days and nights going by
  const calm = P(t, d - .7, d - .2);

  // ---- positions (world) ----
  const bellY = lerp(BELL0.y, DOCK_Y, lift);
  const hatch = { x: BELL0.x, y: bellY + BELL_R + 6 };
  const g1 = P(t, tGe - .35, tGa - .05, E.inOutQ);
  const guide = { x: lerp(GUIDE0.x, hatch.x + 4, g1), y: lerp(GUIDE0.y, hatch.y - 8, g1) + Math.sin(t * 1.2) * 3 * (1 - g1) };
  let him = { x: lerp(HIM0.x, hatch.x + 2, go) + RV.fb(t * .5, 3) * 3 * (1 - go), y: lerp(HIM0.y, hatch.y - 4, go) + Math.sin(t * 1.3 + 1) * 3 * (1 - go) };
  const inBell = P(t, tGa - .05, tGa + .2);
  if (inBell > 0) { him = { x: lerp(him.x, BELL0.x, inBell), y: lerp(him.y, bellY, inBell) }; }
  if (up > 0) { him = { x: CH.x, y: lerp(bellY, CH.y + 2, up) }; }
  const inChamber = P(t, tDock + .25, tDock + .55);

  // ---- camera: the whole column -> follow the bell up -> close on the chamber ----
  const cam1 = P(t, tGa - .05, tDock + .1, E.inOutQ), cam2 = P(t, tDock, d + .3, E.inOutQ);
  let cx = lerp(612, 560, cam1), cy = lerp(900, 600, cam1), z = lerp(1.1, 1.56, cam1);
  cy = lerp(cy, 605, cam2); z *= lerp(1, 1.08, cam2);
  cy += lerp(-14, 0, P(t, -.3, .6, E.outQ));                                // a slow settle as it fades in
  const [kx, ky, kr] = RV.shake(t, .35 * dock * Math.exp(-Math.max(0, t - tDock) * 5) + .25 * xP * Math.exp(-Math.max(0, t - tWi - .1) * 6), 51);
  const dr = { x: RV.fb(t * .25, 501) * 5, y: RV.fb(t * .22, 502) * 5 };
  HG.darkFast(ctx, t + 90, .35, 21);
  ctx.save();
  ctx.translate(540 + kx + dr.x, 860 + ky + dr.y); ctx.rotate(kr); ctx.scale(z, z); ctx.translate(-cx, -cy);
  const Mw = ctx.getTransform();
  seaAndSky(ctx, t, day * pass * .85);
  // light from above in the water (faint caustic shafts)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const x = 140 + i * 160 + Math.sin(t * .4 + i * 1.7) * 30, al = (.03 + .05 * day * pass) * (.5 + .5 * Math.sin(t * .8 + i * 2.1));
    const g = ctx.createLinearGradient(0, YS, 0, YS + 420); g.addColorStop(0, rgba('#9fe7ff', al)); g.addColorStop(1, 'rgba(159,231,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, YS); ctx.lineTo(x + 20, YS); ctx.lineTo(x + 90, YS + 420); ctx.lineTo(x - 50, YS + 420); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  wreck(ctx, t);
  // bell wire from the moonpool
  ctx.strokeStyle = 'rgba(210,190,150,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(BELL0.x, TR.y1); ctx.lineTo(BELL0.x, bellY - BELL_R - 6); ctx.stroke();
  const warmBell = inBell * (1 - up * .7) + .15;
  vessel(ctx, t, { day: day * pass, inside: inChamber, hx: him.x, hy: him.y, hot: dock * Math.exp(-Math.max(0, t - tDock) * 4) });
  bell(ctx, BELL0.x, bellY, warmBell * (.85 + .15 * beat(t, 80)), dock * Math.exp(-Math.max(0, t - tDock) * 4));
  // bubbles trailing the bell as it rises
  if (lift > 0 && lift < 1) PK.HG.bubbles(ctx, t, tGa + .1, { x: BELL0.x, y: bellY + 30, n: 16, seed: 77, spread: 50, rise: 80, drift: 0, life: 1.0, a: .5, size: .7 });
  // the danger arrow and X
  upArrow(ctx, HIM0.x, HIM0.y - 36, YS + 8, arrowP, xP, arrowA);
  redX(ctx, HIM0.x, lerp(HIM0.y, YS, .5), xP, arrowA, t);
  if (danger > 0) glow(ctx, HIM0.x, lerp(HIM0.y, YS, .5), 220, '#e3262f', .25 * danger * Math.exp(-Math.max(0, t - tWi) * 2));
  // guide: a small helmet with its lamp, leading him to the bell
  const gA = 1 - inBell;
  if (gA > 0) {
    const ga = lerp(-2.6, -2.3, g1);
    RV.helmet(ctx, guide.x - 18, guide.y + 4, .3, { ang: ga + Math.PI, rx: him.x, ry: him.y, rim: '#ffb36b', rimA: .6, cold: .25, a: gA, t });
    glow(ctx, guide.x, guide.y, 70, '#cfeaff', .45 * gA); glow(ctx, guide.x, guide.y, 18, '#ffffff', .9 * gA);
  }
  // his light
  const bt = beat(t, lerp(96, 70, P(t, tDock, d, E.inOutQ)));
  const hA = 1 - .55 * inBell * (1 - up);
  PK.HG.light(ctx, q => { PK.HG.heart(q, him.x, him.y, .6 * hA + .25 * inChamber, bt, .6 + .1 * inChamber); });
  souls(ctx, t, [{ x: him.x, y: him.y, a: hA, s: lerp(1.5, .8, inBell) + .2 * inChamber }], { bpm: lerp(96, 70, P(t, tDock, d, E.inOutQ)) });
  // dock flash at the trunk
  if (dock > 0) { const u = t - tDock; if (u < .8) { glow(ctx, CH.x, TR.y1, 120, '#e8f6ff', .5 * Math.exp(-u * 5)); ctx.save(); ctx.strokeStyle = rgba('#e8f6ff', .6 * (1 - u / .8)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(CH.x, TR.y1, 20 + u * 140, (20 + u * 140) * .35, 0, 0, 7); ctx.stroke(); ctx.restore(); } }
  ctx.restore();

  // ---- labels (screen space, crisp) ----
  const sp = (x, y) => Mw.transformPoint(new DOMPoint(x, y));
  const lb = sp(BELL0.x - BELL_R - 26, bellY - 4), la = P(t, tGe - .25, tGe + .1, E.outQ) * (1 - P(t, tDock - .1, tDock + .3));
  if (la > 0) { L.hline(ctx, lb.x + 4, lb.y, 14, rgba('#ffd9a0', .7 * la), 2); text(ctx, '잠수종', lb.x - 4, lb.y + 1, { size: 38, weight: 900, color: '#ffe3b8', align: 'right', stroke: '#000', strokeW: 7, alpha: la }); }
  const lc = sp(CH.x, CH.y - CH.r - 14), lca = P(t, tCh - .12, tCh + .2, E.outQ);
  if (lca > 0) { const sc = lerp(.85, 1, E.outBack(lca)); ctx.save(); ctx.translate(lc.x, lc.y - 26); ctx.scale(sc, sc); text(ctx, '감압 챔버', 0, 0, { size: 44, weight: 900, color: '#fff', stroke: '#000', strokeW: 8, alpha: lca }); ctx.restore(); }

  HG.iris(ctx, .26 - .1 * cam2, .2 * bt, 540, 820);
  // ---- HUD: gauge (lower left) + counter (lower right) ----
  const hudA = P(t, -.2, .35, E.outQ);
  gauge(ctx, t, 196, 1040, 80, v, hudA, danger, calm, D.gauge || '');
  const cA = P(t, tYak - .1, tYak + .2, E.outQ), cP = E.outBack(P(t, t60 - .08, t60 + .3));
  if (cA > 0) {
    const full = D.dur || '', i = full.indexOf(' ('), main = i > 0 ? full.slice(0, i) : full, sub = i > 0 ? full.slice(i + 1) : '';
    const g = ctx.createLinearGradient(0, 960, 0, 1200); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.3, 'rgba(1,2,3,.55)'); g.addColorStop(1, 'rgba(1,2,3,.55)');
    ctx.save(); ctx.globalAlpha = cA; ctx.fillStyle = g; ctx.fillRect(380, 960, 700, 240); ctx.restore();
    clock(ctx, 456, 1046, 30, pass, cA, t);
    ctx.save(); ctx.translate(510, 1034); const sc = lerp(.8, 1, cP); ctx.scale(sc, sc);
    text(ctx, main, 0, 0, { size: 62, weight: 900, color: '#ffd27a', align: 'left', stroke: '#000', strokeW: 10, alpha: cA });
    ctx.restore();
    if (sub) text(ctx, sub, 512, 1094, { size: 30, weight: 800, color: '#cfe8ff', align: 'left', stroke: '#000', strokeW: 6, alpha: cA * P(t, t60 + .1, t60 + .45) });
  }
  HG.subBand(ctx);
};
})();
