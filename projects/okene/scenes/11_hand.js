// hand: "잠수부의 불빛이 그냥 지나쳤다가 다시 다가오자, 그는 물속으로 들어가 그 손을 붙잡았습니다."
// Inside the dark cabin (the inverted room cross-section of the pocket/cold scenes: PK.room geometry, old floor tiles on the
// ceiling, the door hanging from the ceiling with its lower part under water). He is the warm light at the water line on the
// stacked mattresses. '불빛이' -> a diver's lamp appears beyond the submerged doorway: cold light pours through it into the
// water and sweeps across the room; '지나쳤다가' -> it slides past and is gone (dark, his heartbeat quickens); '다시 다가오자'
// -> it comes back and stays, the doorway glowing; '그는' -> his light moves to the edge; '물속으로' -> it goes under (rings,
// bubbles, the warm glow turns murky); '들어가' -> the camera pushes into the lit doorway; '그' -> white-out into the hook's
// exact framing; '손을' -> his hand comes up out of the dark; '붙잡았습니다' -> it clamps onto the diver's glove (the full
// version of the hook shot): jolt, a softer flash, the diver's air bursts out, his warm glow beats behind the grip.
// Chip: 2013.5.28.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, flash } = L;
const PK = window.PK;
const RM = { x: 140, y: 520, w: 800, h: 620, wall: 26 };                  // PK.room geometry
const DR = { x0: RM.x + RM.w * .38, x1: RM.x + RM.w * .58, y0: RM.y + 30, y1: RM.y + 30 + RM.h * .7 };   // door (PK.room)
const LEVEL = .6, WTOP = RM.y + RM.h * (1 - LEVEL);

function surfY(x, t) { return WTOP + Math.sin(x * .021 + t * 1.3) * 4 + Math.sin(x * .057 - t * .9) * 2; }
// ---- the cabin: PK.room's shell and fixtures, the door as an opening, light through the submerged doorway ----
function cabin(ctx, t, o) {
  const { x, y, w, h, wall } = RM, HG = PK.HG;
  const { warm = .6, lx = 800, ly = 740, beamI = 0, sweep = 0, under = 0 } = o;
  ctx.save();
  const gs = ctx.createLinearGradient(0, y - wall, 0, y + h + wall); gs.addColorStop(0, '#4a565e'); gs.addColorStop(.5, '#1b2328'); gs.addColorStop(1, '#3a454c');
  ctx.fillStyle = gs; ctx.fillRect(x - wall, y - wall, w + wall * 2, h + wall * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 26; i++) ctx.fillRect(x - wall + i * (w + 2 * wall) / 26, y - wall, 2, wall);   // shell rivets
  ctx.fillStyle = '#030607'; ctx.fillRect(x, y, w, h);
  // his warm light on the steel + the cold light from the doorway
  if (warm > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .7); g.addColorStop(0, rgba('#ffb36b', .22 * warm)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  if (beamI > 0) { const cxx = (DR.x0 + DR.x1) / 2, g = ctx.createRadialGradient(cxx, WTOP + 80, 0, cxx, WTOP + 80, w * .75); g.addColorStop(0, rgba('#9fd8ff', .16 * beamI)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  // seams
  ctx.fillStyle = 'rgba(160,190,205,.12)'; for (let i = 1; i < 6; i++) ctx.fillRect(x + w * i / 6, y, 2, h);
  // wall panels pulled off (right): exposed frames and the dark gap behind them
  ctx.fillStyle = '#010203'; ctx.fillRect(x + w * .7, y + 40, w * .27, WTOP - y - 40);
  ctx.fillStyle = rgba('#9fb3bd', .14 + .2 * warm); for (let k = 0; k < 3; k++) ctx.fillRect(x + w * (.72 + k * .09), y + 40, 7, WTOP - y - 40);
  ctx.strokeStyle = rgba('#9fb3bd', .1 + .15 * warm); ctx.lineWidth = 2; ctx.strokeRect(x + w * .7, y + 40, w * .27, WTOP - y - 40);
  // old floor tiles on the ceiling
  ctx.fillStyle = '#0e1418'; ctx.strokeStyle = rgba('#9fb3bd', .22 + .25 * warm); ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) ctx.strokeRect(x + i * w / 9, y, w / 9, 18);
  // the bunk, upside down: its frame bolted to the ceiling, legs pointing down
  { const bx = x + 24, bw = w * .3, by = y + 18; ctx.fillStyle = '#0c1216'; ctx.fillRect(bx, by + 46, bw, 26); ctx.fillRect(bx + 8, by, 14, 50); ctx.fillRect(bx + bw - 22, by, 14, 50);
    ctx.strokeStyle = rgba('#9fb3bd', .2 + .25 * warm); ctx.lineWidth = 2.5; ctx.strokeRect(bx, by + 46, bw, 26); ctx.beginPath(); ctx.moveTo(bx + 8, by + 72); ctx.lineTo(bx + 8, by + 140); ctx.moveTo(bx + bw - 8, by + 72); ctx.lineTo(bx + bw - 8, by + 140); ctx.stroke(); }
  // door: the frame, and the opening behind it (dark above the water; lit from the passage when the lamp is there)
  ctx.fillStyle = '#010203'; ctx.fillRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  ctx.strokeStyle = rgba('#9fb3bd', .3 + .25 * warm + .3 * beamI); ctx.lineWidth = 4; ctx.strokeRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  // the coaming (old sill) now at the top of the door
  ctx.fillStyle = '#28323a'; ctx.fillRect(DR.x0 - 14, DR.y0 - 12, DR.x1 - DR.x0 + 28, 16);
  // door leaf swung open against the wall (left), handle near its top
  ctx.fillStyle = '#0b1115'; ctx.fillRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16); ctx.strokeStyle = rgba('#9fb3bd', .18 + .2 * warm); ctx.strokeRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16);
  ctx.beginPath(); ctx.arc(DR.x0 - 80, DR.y0 + 8 + (DR.y1 - DR.y0) * .38, 7, 0, 7); ctx.stroke();
  // the mattresses he stacked to get out of the water (right, at the water line)
  { const mx = x + w * .66, mw = w * .3; for (let k = 0; k < 3; k++) { const my = WTOP + 26 - k * 22 + Math.sin(t * 1.1 + k) * 1.5, ww = mw - k * 18;
      ctx.fillStyle = k === 2 ? '#1a1712' : '#12100d'; ctx.beginPath(); ctx.roundRect(mx + k * 9, my - 18, ww, 22, 8); ctx.fill();
      ctx.strokeStyle = rgba('#ffcf9a', .1 + .25 * warm); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + k * 9 + 8, my - 18); ctx.lineTo(mx + k * 9 + ww - 8, my - 18); ctx.stroke(); } }
  // water from the bottom
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(xx, surfY(xx, t));
  ctx.lineTo(x + w, y + h); ctx.closePath();
  const gw = ctx.createLinearGradient(0, WTOP, 0, y + h); gw.addColorStop(0, '#0f2c35'); gw.addColorStop(.25, '#06161b'); gw.addColorStop(1, '#010304');
  ctx.save(); ctx.globalAlpha = .93; ctx.fillStyle = gw; ctx.fill(); ctx.restore();
  // the submerged part of the doorway, lit from the passage (the lamp's hot spot slides with the sweep)
  if (beamI > 0) {
    const cxx = lerp(DR.x0, DR.x1, .5 + .4 * sweep), cyy = (WTOP + DR.y1) / 2 + 20;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.beginPath(); ctx.rect(DR.x0, WTOP + 3, DR.x1 - DR.x0, DR.y1 - WTOP - 3); ctx.clip();
    const g = ctx.createRadialGradient(cxx, cyy, 0, cxx, cyy, 230); g.addColorStop(0, rgba('#f2fbff', .75 * beamI)); g.addColorStop(.3, rgba('#a8dcff', .36 * beamI)); g.addColorStop(.75, rgba('#2a6a86', .1 * beamI)); g.addColorStop(1, rgba('#1a4a5e', .04 * beamI));
    ctx.fillStyle = g; ctx.fillRect(DR.x0, WTOP, DR.x1 - DR.x0, DR.y1 - WTOP); ctx.restore();
    PK.HG.light(ctx, q => { glow(q, cxx, cyy, 300, '#8fd0f0', .22 * beamI); glow(q, cxx, cyy, 110, '#eaf8ff', .3 * beamI); glow(q, cxx, cyy + 40, 260, '#9fd8ff', .22 * beamI); });
    ctx.fillStyle = rgba('#dff3ff', .35 * beamI); ctx.fillRect(DR.x0 - 2, WTOP + 4, 3, DR.y1 - WTOP - 4); ctx.fillRect(DR.x1 - 1, WTOP + 4, 3, DR.y1 - WTOP - 4);
    ctx.restore();
  }
  // light through the doorway into the water: a fan of cold rays that sweeps with the lamp, plus silt in it
  if (beamI > 0) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + h); for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(xx, surfY(xx, t) + 2); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const ox = lerp(DR.x0, DR.x1, .5 + .3 * sweep), oy = (WTOP + DR.y1) / 2 + 30, base = Math.PI / 2 - sweep * .75;
    for (let i = 0; i < 11; i++) {
      const k = (i / 10 - .5) * 2.1, a = base + k, wd = .05 + .05 * HG.hi(i * 5 + 3), L2 = 520 + 260 * HG.hi(i * 7), al = beamI * .06 * (.45 + .55 * (.5 + .5 * HG.nz(t * .6 + i * 2.3, 120 + i))) * (1 - Math.abs(k) * .3);
      const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * L2, oy + Math.sin(a) * L2); g.addColorStop(0, rgba('#dff3ff', al)); g.addColorStop(1, 'rgba(223,243,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - wd) * L2, oy + Math.sin(a - wd) * L2); ctx.lineTo(ox + Math.cos(a + wd) * L2, oy + Math.sin(a + wd) * L2); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
      const sx = x + ((HG.hi(i * 3 + 9) * w + t * 9 * (HG.hi(i) - .5) + HG.fb(t * .2 + i, 4) * 30) % w + w) % w, sy = WTOP + 10 + ((HG.hi(i * 5 + 2) * (h * LEVEL - 20) - t * 5 + HG.fb(t * .15 + i, 5) * 20) % (h * LEVEL - 20) + (h * LEVEL - 20)) % (h * LEVEL - 20);
      const dx = sx - ox, dy = sy - oy, dd = Math.hypot(dx, dy) + 1; let da = Math.atan2(dy, dx) - base; da = Math.atan2(Math.sin(da), Math.cos(da));
      const I = beamI * Math.exp(-da * da / .9) / (1 + dd * dd / 160000); if (I < .03) continue;
      ctx.fillStyle = rgba('#e6f6ff', clamp(I * .9)); ctx.fillRect(sx, sy, 2.2, 2.2);
    }
    ctx.restore();
  }
  // surface line, cold sheen + his warm reflection
  ctx.strokeStyle = rgba('#9fd8ea', .45 + .3 * beamI); ctx.lineWidth = 2; ctx.beginPath();
  for (let xx = x; xx <= x + w + 8; xx += 8) { const yy = surfY(xx, t); xx === x ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
  ctx.stroke();
  if (beamI > 0) {   // caustic shimmer under the surface
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { const cx2 = x + 20 + PK.HG.hi(i * 7 + 1) * (w - 40) + PK.HG.nz(t * .8 + i, 130) * 20, cy2 = surfY(cx2, t) + 6 + PK.HG.hi(i * 3) * 40, al = beamI * .16 * (.5 + .5 * Math.sin(t * 3.3 + i * 1.9)) * Math.exp(-Math.abs(cx2 - (DR.x0 + DR.x1) / 2) / 260);
      ctx.fillStyle = rgba('#d8f2ff', Math.max(0, al)); ctx.fillRect(cx2, cy2, 18 + 30 * PK.HG.hi(i * 5), 2); }
    ctx.restore();
  }
  if (warm > 0 && under < 1) { const g = ctx.createLinearGradient(lx - 170, 0, lx + 170, 0); g.addColorStop(0, 'rgba(255,179,107,0)'); g.addColorStop(.5, rgba('#ffb36b', .35 * warm * (1 - under))); g.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 170, WTOP - 3, 340, 6); }
  ctx.restore();
}

// exact-word lookup ('그' must not match '그냥' / '그는')
function atx(info, w, frac) { const o = (info.sc.words || []).find(q => q.w.replace(/[.,!?]/g, '') === w); return o ? o.t - info.sc.t0 : PK.at(info, null, frac); }
window.PK.scenes.hand = function (ctx, t, d, info) {
  const HG = PK.HG, { at, beat, souls, chip } = PK, D = info.sc.data || {};
  const { S, LAMP, G0, nz, fb } = HG;
  const tBul = at(info, '불빛이', .1), tGn = at(info, '그냥', .2), tJi = at(info, '지나쳤다가', .26), tDs = at(info, '다시', .37), tDa = at(info, '다가오자', .41),
    tGe = at(info, '그는', .56), tMu = at(info, '물속으로', .6), tDe = at(info, '들어가', .68), tKu = atx(info, '그', .75), tSo = at(info, '손을', .79), tI = at(info, '붙잡았습니다', .84);
  const tCut = tKu + .02;                       // white-out into the close-up
  const chipA = P(t, .2, .5) * (1 - P(t, d - .35, d));

  if (t < tCut) {
    // ================= the cabin =================
    // lamp in the passage: far glimmer -> passes -> gone -> back and stays
    let L2 = lerp(-1.7, -.3, P(t, tBul - .5, tGn, E.inOutQ)); L2 = lerp(L2, 1.9, P(t, tGn, tDs - .1, E.inQ));
    if (t > tDs) L2 = lerp(1.7, .05, P(t, tDs, tDa + .55, E.outC));
    const I1 = P(t, .05, tBul + .2, E.inOutQ) * .35 + P(t, tBul, tGn - .15, E.inOutQ) * .75, I1off = 1 - P(t, tJi - .1, tJi + .36, E.inQ);
    const I2 = P(t, tDs, tDs + .2) * .3 + P(t, tDa - .05, tDa + .5, E.outQ) * .85;
    const beamI = (t < tDs ? I1 * I1off : I2) * (.92 + .08 * nz(t * 9, 140)) + .12 * P(t, tDe, tCut, E.inQ);
    const sweep = clamp(L2 / 1.6, -1, 1);
    // his light: on the mattresses -> to the edge -> under -> toward the doorway
    const m1 = P(t, tGe - .05, tMu + .05, E.inOutQ), m2 = P(t, tMu - .02, tMu + .45, E.inOutQ), m3 = P(t, tDe - .1, tCut, E.inOutQ);
    let lx = lerp(812, 690, m1), ly = lerp(WTOP - 22, WTOP - 8, m1);
    lx = lerp(lx, 640, m2); ly = lerp(ly, WTOP + 70, m2); lx = lerp(lx, 560, m3); ly = lerp(ly, (WTOP + DR.y1) / 2 + 40, m3);
    lx += nz(t * .7, 150) * 4 * (1 - m2); ly += Math.sin(t * 1.4) * 2.5;
    const under = m2;
    const bpm = lerp(78, 112, P(t, tJi, tDs, E.inOutQ)) + 12 * P(t, tDa, tMu);
    const bt = beat(t, bpm);
    // camera: slow drift + push, follow him a little, then push into the lit doorway
    const push = P(t, tDe - .05, tCut, E.inQ);
    const cx = lerp(lerp(590, 640, P(t, 0, tGe, E.inOutQ)), 610, m1) * (1 - push) + 548 * push, cy = lerp(790, 812, m2) * (1 - push) + ((WTOP + DR.y1) / 2 + 40) * push;
    const z = lerp(1.26, 1.36, P(t, -.3, tGe, E.inOutQ)) * lerp(1, 2.5, push * push);
    const dr = { x: fb(t * .35, 141) * 12, y: fb(t * .3, 142) * 12, r: fb(t * .25, 143) * .005 };
    const shk = .1 * P(t, tMu - .05, tMu + .1) * (1 - P(t, tMu + .2, tMu + .7));
    const [sx, sy, sr] = HG.shake(t, shk, 7);
    HG.darkFast(ctx, t, .5, 12);
    ctx.save();
    ctx.translate(540 + sx + dr.x, 860 + sy + dr.y); ctx.rotate(dr.r + sr); ctx.scale(z, z); ctx.translate(-cx, -cy);
    const warm = (.5 + .25 * bt) * (1 - .3 * under);
    cabin(ctx, t, { warm, lx, ly, beamI, sweep, under });
    // him: warm light (murky and cooler under water), rings where he goes in, bubbles rising from him
    if (under > 0) {
      const ex = lerp(690, 640, .3), u2 = t - tMu;
      if (u2 > 0 && u2 < 1.6) for (let k = 0; k < 3; k++) { const q = clamp((u2 - k * .18) / 1.2); if (q <= 0) continue; ctx.strokeStyle = rgba('#cfeaff', .5 * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, WTOP, 20 + q * 150, (20 + q * 150) * .18, 0, 0, 7); ctx.stroke(); }
      HG.bubbles(ctx, t, tMu + .05, { x: lx, y: ly - 10, n: 18, seed: 41, spread: 26, rise: 120, drift: 10, life: 1.0, a: .7, size: .8 });
    }
    HG.light(ctx, q => { glow(q, lx, ly, 420, '#ff9a3c', (.13 + .1 * bt) * (1 - .2 * under) + .05 * under); glow(q, lx, ly, 130, '#ffb347', (.22 + .14 * bt) * (1 - .3 * under)); });
    souls(ctx, t, [{ x: lx, y: ly, a: 1 - .15 * under, s: 2.1 - .35 * under }], { bpm });
    ctx.restore();
    HG.iris(ctx, lerp(.32, .5, P(t, tJi, tDs, E.inOutQ)) - .1 * P(t, tDa, tDa + .5) + .1 * under, .5 * bt, 560, 860);
    HG.subBand(ctx);
    chip(ctx, D.date || '', 540, 492, chipA, { size: 34 });
    // white-out into the close-up (centred on the cut)
    const wo = P(t, tDe + .1, tCut, E.inQ);
    if (wo > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(540, 900, 0, 540, 900, 900); g.addColorStop(0, rgba('#eaf8ff', wo)); g.addColorStop(1, rgba('#9fd8ff', wo * .6)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    return;
  }

  // ================= the close-up: the hook's framing, the full version =================
  const after = P(t, tI, tI + .05), relax = P(t, tI + .25, tI + 1.3, E.inOutQ);
  const tm = t < tI ? t : t < tI + .2 ? tI : tI + (t - tI - .2) * .55;
  let z = 1.47 * (1 + .06 * Math.exp(-Math.max(0, t - tI) * 6) * after) * lerp(1, 1.05, P(t, tI, d + .3, E.inOutQ)) * lerp(1.04, 1, P(t, tCut, tCut + .8, E.outQ));
  const cx = 478, cy = 900;
  const dr = { x: fb(t * .35, 41) * 14, y: fb(t * .3, 50) * 14, r: fb(t * .25, 45) * .006 };
  const shk = .32 * Math.exp(-Math.max(0, t - tI) * 4.2) * after + .04;
  const [sx, sy, sr] = HG.shake(t, shk, 5);
  const jolt = after * Math.exp(-Math.max(0, t - tI) * 14) * 10;
  HG.darkFast(ctx, t, .55, 3, '#010203', true);
  ctx.save();
  HG.cam(ctx, cx, cy, z, dr.r + sr, sx + dr.x, sy + dr.y + jolt);
  const M = ctx.getTransform();
  const aim = .58 + fb(tm * .5, 61) * .03 - .06 * P(t, tI, tI + .06) * (1 - .7 * relax);
  const b = { x: LAMP.x + fb(t * .3, 62) * 8, y: LAMP.y + fb(t * .4, 60) * 9, ang: aim, spread: .3, len: 1180, a: 1 - .05 * (.5 + .5 * nz(t * 11, 63)) };
  HG.wall(ctx, b, { amb: .06, gain: 1.15 });
  const bt = beat(t, 118);
  // glove: still reaching in, yanked on the grab
  const yank = after * (1 - .55 * relax), back = P(t, tI + .2, tI + .9, E.inOutQ) * .6;
  const gu = -(1 - P(t, tCut - .2, tI, E.inOutQ)) * 1.6 + yank * .9 - back;
  const ga = G0.ang + .05 * yank;
  const g = { x: G0.x + Math.cos(ga) * gu * S - Math.sin(ga) * yank * 9, y: G0.y + Math.sin(ga) * gu * S + Math.cos(ga) * yank * 14, ang: ga, sp: .5 + .15 * fb(tm * 1.1, 70) - .2 * after, cg: .18 + .12 * fb(tm * .9, 71) + .2 * after, wig: (1 - after) * .9, t: tm };
  const lock = HG.gripPose(g);
  const far = { x: lock.x - Math.cos(lock.ang) * 30 * S, y: lock.y - Math.sin(lock.ang) * 30 * S }, near = { x: lock.x - Math.cos(lock.ang) * 9 * S, y: lock.y - Math.sin(lock.ang) * 9 * S };
  const hpose = tt => { const e1 = P(tt, tCut + .05, tSo + .2, E.outC), e2 = P(tt, tI - .13, tI - .02, E.inQ); return { x: lerp(lerp(far.x, near.x, e1), lock.x, e2), y: lerp(lerp(far.y, near.y, e1), lock.y, e2), ang: lock.ang + .22 * (1 - e1), open: lerp(.6, 1.1, e1) - .1 * e2, curl: P(tt, tI - .09, tI + .015, E.outQ), vis: 1 }; };
  const h = hpose(t);
  // his warm glow comes with the hand, beats behind the grip
  const gP = lock, glowA = .55 + .35 * P(t, tCut, tSo) + after * .3;
  HG.light(ctx, x => { HG.heart(x, lerp(h.x + Math.cos(h.ang) * 5 * S, gP.x + 40, after), lerp(h.y + Math.sin(h.ang) * 5 * S, gP.y + 40, after), glowA, bt, 1.1); HG.cone(x, t, b); });
  HG.silt(ctx, tm, b, { n: 190, seed: 3, push: { x: G0.x + 60, y: G0.y + 40, k: P(t, tI, tI + 1.4, E.outQ) * .5 } });
  if (t > tI - .14 && t < tI + .02) HG.smear(ctx, [hpose(t - .025), hpose(t - .05)], g, .6);
  const rimUp = lerp(.45, 1.15, P(t, tCut, tSo + .25)) + .3 * Math.exp(-Math.max(0, t - tI) * 4) * after;
  HG.hands(ctx, { g, h, b, bareRim: rimUp, bareHalo: .35 + .15 * after, gloveHalo: .12 });
  const vx = g.x - Math.cos(g.ang) * 15 * S, vy = g.y - Math.sin(g.ang) * 15 * S - 5.6 * S;
  HG.bubbles(ctx, t, -1.5, { x: vx, y: vy, n: 10, seed: 4, b, spread: 26, rise: 330, drift: 30, life: 2.6, a: .55, size: .8 });
  HG.bubbles(ctx, t, tI + .05, { x: vx + 40, y: vy, n: 38, seed: 19, b, spread: 90, rise: 520, drift: 60, life: 1.7, size: 1.3 });
  ctx.restore();
  HG.bokeh(ctx, tm, b, M, { n: 8, a: .3 });
  HG.iris(ctx, .46 - .12 * after * Math.exp(-Math.max(0, t - tI) * 3), .6 * bt, 560, 880);
  HG.subBand(ctx);
  chip(ctx, D.date || '', 540, 492, chipA, { size: 34 });
  flash(ctx, .34 * Math.exp(-Math.max(0, t - tI) * 12) * after, '#e2f5ff');
  // the tail of the white-out
  const wo = 1 - P(t, tCut, tCut + .3, E.outQ);
  if (wo > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#dff3ff', wo * .9); ctx.fillRect(0, 0, W, H); ctx.restore(); }
};
})();
