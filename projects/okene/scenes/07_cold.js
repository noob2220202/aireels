// cold (≈35.09-40.36): "춥고 목이 타는 사이, 물은 차오르고 공기는 점점 줄어들었습니다."
// Opens on pocket's last frame (his light pressed against the basin rim in the small inverted toilet; no hand).
// '춥고': the image goes cold (teal grade), the frame shivers, the light trembles; salt crust starts growing on the steel
// and at the frame edges. '목이 타는': his light pales and flickers. An hours counter climbs 24시간 -> 36시간 ('사이') ->
// 48시간 ('공기는'). Facts (Reuters): he held the basin for about a day, then swam into the officer's cabin next door and
// got out of the water on a platform of wall panels and mattresses. So at the 24 -> 36 roll his light lets go of the rim,
// drops into the water and swims under the wall into the cabin next door (the camera pans with him, same world, the cabin
// to the right of the toilet as in swept's passage), where it climbs onto the mattress rack: the cabin of oxygen / divers
// (PK.KN geometry, inside the upside-down hull). '물은' / '차오르고': the water there climbs up the rack toward him (gurgle,
// chevrons, a dashed line keeps the old level) while the old floor stays pressed just under the counter; '공기는': the
// '공기층' bracket lights up; '점점': a second rise, the bracket squeezes; '줄어들었습니다': it turns red, stale haze thickens
// in the gap, the heartbeat quickens and tunnel vision closes in. The water ends at the cabin's level .6, as divers shows it.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK;
const { at, chip } = PK;

// salt / crust at the frame edges (screen space), generated once
let EDGE = null;
function edgeCrust() {
  if (EDGE) return EDGE; const R = L.rng(311), a = [];
  for (let i = 0; i < 110; i++) {
    const side = i % 2, d = Math.pow(R(), 3) * 70, y = 480 + R() * 760;
    a.push({ x: side ? W - 3 - d : 3 + d, y, r: 1.6 + R() * 4.2 * (1 - d / 90), th: clamp(d / 70 * .7 + R() * .3), rot: R() * 6.28, n: 4 + Math.floor(R() * 3) });
  }
  EDGE = a; return a;
}
function drawCrust(ctx, k) {
  if (k <= 0) return; ctx.save();
  for (const c of edgeCrust()) {
    const g = clamp((k - c.th) / .2); if (g <= 0) continue; const r = c.r * (.4 + .6 * g);
    ctx.fillStyle = `rgba(214,226,230,${(.34 * g).toFixed(3)})`; ctx.beginPath();
    for (let i = 0; i < c.n; i++) { const an = c.rot + i / c.n * 6.283, rr = r * (.55 + .45 * ((i * 37 + Math.floor(c.x)) % 7) / 6); i ? ctx.lineTo(c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr) : ctx.moveTo(c.x + Math.cos(an) * rr, c.y + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill();
  }
  // soft rime glow hugging the edges
  let g = ctx.createLinearGradient(0, 0, 90, 0); g.addColorStop(0, `rgba(190,215,225,${(.1 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(190,215,225,0)'); ctx.fillStyle = g; ctx.fillRect(0, 460, 90, 800);
  g = ctx.createLinearGradient(W, 0, W - 90, 0); g.addColorStop(0, `rgba(190,215,225,${(.1 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(190,215,225,0)'); ctx.fillStyle = g; ctx.fillRect(W - 90, 460, 90, 800);
  ctx.restore();
}
// hours counter with an odometer roll between values (fixed box); top slot, raised clear of the rooms' steel
const HOURS_Y = 492;
function hours(ctx, t, x, y, a, vals, times) {
  if (a <= 0) return; const size = 48, bw = measure(ctx, '48시간', size, FONT.sub, 900) + 56, bh = size + 30;
  const sc = lerp(.86, 1, E.outBack(clamp(a)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(a);
  ctx.fillStyle = 'rgba(3,9,12,.88)'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12); ctx.fill(); ctx.strokeStyle = 'rgba(160,220,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.save(); roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12); ctx.clip();
  let i = 0; for (let k = 1; k < times.length; k++) if (t >= times[k] - .2) i = k;
  const roll = i > 0 ? E.inOutC(P(t, times[i] - .2, times[i] + .15)) : 1;
  if (i > 0 && roll < 1) text(ctx, vals[i - 1] + '시간', 0, 3 - roll * bh, { size, weight: 900, color: '#fff' });
  text(ctx, vals[i] + '시간', 0, 3 + (1 - roll) * bh, { size, weight: 900, color: '#fff' });
  // flash on change
  if (i > 0) { const f = 1 - P(t, times[i], times[i] + .5); if (f > 0) { ctx.fillStyle = `rgba(160,220,255,${(.18 * f).toFixed(3)})`; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); } }
  ctx.restore(); ctx.restore();
}


// ---------------- the officer's cabin next door (PK.KN cabin design + geometry, drawn in its own coordinates) ----------------
// placed in the toilet's world at (COX, COY): its old floor level with the toilet's, its left steel 150 px right of the
// toilet's. Same drawing as KN.cabin but with a variable water level wy (cabin coords) and the rack under the mattresses.
const COX = 1042, COY = -20;
const cabWY = lv => 1140 - 620 * lv;                       // KN.RM: y 520, h 620 -> water top for a level (fraction from the bottom)
function cabinAt(ctx, T, KN, o) {
  const { x, y, w, h, wall } = KN.RM, DR = KN.DR, WTOP = KN.WTOP;
  const { wy, warm = .6, lx = 812, ly = 746, hl = 1 } = o;
  const sy = xx => wy + Math.sin(xx * .021 + T * 1.3) * 4 + Math.sin(xx * .057 - T * .9) * 2;
  ctx.save();
  const gs = ctx.createLinearGradient(0, y - wall, 0, y + h + wall); gs.addColorStop(0, '#4a565e'); gs.addColorStop(.5, '#1b2328'); gs.addColorStop(1, '#3a454c');
  ctx.fillStyle = gs; ctx.fillRect(x - wall, y - wall, w + wall * 2, h + wall * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 26; i++) ctx.fillRect(x - wall + i * (w + 2 * wall) / 26, y - wall, 2, wall);
  ctx.fillStyle = '#030607'; ctx.fillRect(x, y, w, h);
  if (warm > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .7); g.addColorStop(0, rgba('#ffb36b', .22 * warm)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = 'rgba(160,190,205,.12)'; for (let i = 1; i < 6; i++) ctx.fillRect(x + w * i / 6, y, 2, h);
  // wall panels pulled off (right): the bare hull steel behind them (shared with oxygen/divers/signal: PK.KN.bareWall)
  KN.bareWall(ctx, warm, lx, ly);
  // old floor tiles on the ceiling
  ctx.fillStyle = '#0e1418'; ctx.strokeStyle = rgba('#9fb3bd', .22 + .25 * warm); ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) ctx.strokeRect(x + i * w / 9, y, w / 9, 18);
  // the bunk, upside down: frame bolted to the ceiling, legs pointing down
  { const bx = x + 24, bw = w * .3, by = y + 18; ctx.fillStyle = '#0c1216'; ctx.fillRect(bx, by + 46, bw, 26); ctx.fillRect(bx + 8, by, 14, 50); ctx.fillRect(bx + bw - 22, by, 14, 50);
    ctx.strokeStyle = rgba('#9fb3bd', .2 + .25 * warm); ctx.lineWidth = 2.5; ctx.strokeRect(bx, by + 46, bw, 26); ctx.beginPath(); ctx.moveTo(bx + 8, by + 72); ctx.lineTo(bx + 8, by + 140); ctx.moveTo(bx + bw - 8, by + 72); ctx.lineTo(bx + bw - 8, by + 140); ctx.stroke(); }
  // door: frame, dark opening, the old sill (coaming) now at the top, the leaf swung open against the wall
  ctx.fillStyle = '#010203'; ctx.fillRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  ctx.strokeStyle = rgba('#9fb3bd', .3 + .25 * warm); ctx.lineWidth = 4; ctx.strokeRect(DR.x0, DR.y0, DR.x1 - DR.x0, DR.y1 - DR.y0);
  ctx.fillStyle = '#28323a'; ctx.fillRect(DR.x0 - 14, DR.y0 - 12, DR.x1 - DR.x0 + 28, 16);
  ctx.fillStyle = '#0b1115'; ctx.fillRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16); ctx.strokeStyle = rgba('#9fb3bd', .18 + .2 * warm); ctx.lineWidth = 2; ctx.strokeRect(DR.x0 - 96, DR.y0 + 8, 84, DR.y1 - DR.y0 - 16);
  ctx.beginPath(); ctx.arc(DR.x0 - 80, DR.y0 + 8 + (DR.y1 - DR.y0) * .38, 7, 0, 7); ctx.stroke();
  // the rack he built from the wall panels (standing on the old ceiling, under water at level .6) + the stacked mattresses
  const mx = x + w * .66, mw = w * .3;
  ctx.fillStyle = '#0d1418'; [14, mw * .5 - 5, mw - 24].forEach(px => ctx.fillRect(mx + px, WTOP + 30, 10, y + h - WTOP - 30));
  ctx.fillStyle = '#141c21'; ctx.fillRect(mx - 6, WTOP + 26, mw + 12, 9);
  ctx.fillStyle = rgba('#ffcf9a', .08 + .2 * warm); ctx.fillRect(mx - 6, WTOP + 26, mw + 12, 2);
  ctx.strokeStyle = rgba('#9fb3bd', .08 + .12 * warm); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 19, WTOP + 40); ctx.lineTo(mx + mw * .5, WTOP + 120); ctx.lineTo(mx + mw - 19, WTOP + 40); ctx.stroke();
  for (let k = 0; k < 3; k++) { const my = WTOP + 26 - k * 22 + Math.sin(T * 1.1 + k) * 1.5, ww = mw - k * 18;
    ctx.fillStyle = k === 2 ? '#1a1712' : '#12100d'; ctx.beginPath(); ctx.roundRect(mx + k * 9, my - 18, ww, 22, 8); ctx.fill();
    ctx.strokeStyle = rgba('#ffcf9a', .1 + .25 * warm); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + k * 9 + 8, my - 18); ctx.lineTo(mx + k * 9 + ww - 8, my - 18); ctx.stroke(); }
  // water from the bottom
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(Math.min(xx, x + w), sy(xx));
  ctx.lineTo(x + w, y + h); ctx.closePath();
  const gw = ctx.createLinearGradient(0, wy, 0, y + h); gw.addColorStop(0, '#0f2c35'); gw.addColorStop(.25, '#06161b'); gw.addColorStop(1, '#010304');
  ctx.save(); ctx.globalAlpha = .93; ctx.fillStyle = gw; ctx.fill(); ctx.restore();
  ctx.strokeStyle = rgba('#9fd8ea', .45); ctx.lineWidth = 2 * hl; ctx.beginPath();
  for (let xx = x; xx <= x + w + 8; xx += 8) { const yy = sy(Math.min(xx, x + w)); xx === x ? ctx.moveTo(xx, yy) : ctx.lineTo(Math.min(xx, x + w), yy); }
  ctx.stroke();
  if (warm > 0) { const g = ctx.createLinearGradient(lx - 170, 0, lx + 170, 0); g.addColorStop(0, 'rgba(255,179,107,0)'); g.addColorStop(.5, rgba('#ffb36b', .35 * warm)); g.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 170, sy(lx) - 3, 340, 6); }
  ctx.restore();
  return sy;
}

window.PK.scenes.cold = function (ctx, t, d, info) {
  const OK = PK.okRoom, KN = PK.KN; const T = info.sc.t0 + t;
  const { RM, LV0, CAM_END, RIM } = OK;
  const tCold = at(info, '춥고', .02), tThroat = at(info, '목이', .1), tDry = at(info, '타는', .15), tSai = at(info, '사이', .2), tW = at(info, '물은', .32),
    tRise = at(info, '차오르고', .38), tAir = at(info, '공기는', .49), tMore = at(info, '점점', .6), tLess = at(info, '줄어들었', .69);
  const vEnd = info.sc.voice_end - info.sc.t0;
  const tGo = tSai - .2, tSplash = tGo + .22, tArr = tW - .12;             // lets go of the rim / hits the water / surfaces in the cabin

  // ---------------- state ----------------
  const coldK = P(t, tCold - .1, tCold + .5, E.outQ);
  const thirst = P(t, tThroat - .05, tDry + .5, E.inOutQ);
  const r1 = E.inOutQ(P(t, tRise - .12, tRise + .6)), r2 = E.inOutQ(P(t, tMore - .08, tMore + .65));
  const LVC0 = .42, lvc = LVC0 + .08 * r1 + .1 * r2 + .004 * P(t, tLess, d);   // the cabin's water: up the rack to level .6 (divers)
  const cwy = cabWY(lvc), cwyW = cwy + COY;                                 // cabin water top (cabin / toilet-world coords)
  const surge = Math.exp(-Math.pow((t - tRise - .25) / .3, 2)) + .7 * Math.exp(-Math.pow((t - tMore - .25) / .3, 2));
  const danger = P(t, tLess - .1, tLess + .6, E.inOutQ);
  const bpm = lerp(72, 96, P(t, tRise, d)), bt = PK.beat(T, bpm);
  const tTop = OK.lvY(LV0);                                                 // the toilet's water stays where pocket left it
  const cabSurf = xw => cwyW + Math.sin((xw - COX) * .021 + T * 1.3) * 4 + Math.sin((xw - COX) * .057 - T * .9) * 2;

  // ---------------- his light (toilet-world coords) ----------------
  const drop = P(t, tGo, tSplash, E.inQ), swim = P(t, tSplash, tArr, E.inOutQ), climb = P(t, tArr - .06, tArr + .36, E.inOutQ);
  const STACK = { x: 812 + COX, y: 746 + COY }, XS = 1690;                  // his place on the mattresses (as divers) / where he surfaces
  const R = OK.rimLight(T, 1, .8 + 1.4 * coldK);
  let lx = R.x, ly = R.y, under = 0;
  if (drop > 0) { lx = R.x + 10 * drop; ly = lerp(R.y, OK.surf(lx, T, tTop) + 6, drop); under = .3 * P(t, tSplash - .06, tSplash); }
  if (swim > 0) {
    lx = lerp(R.x + 10, XS, swim);
    const sw = lx < 1100 ? OK.surf(lx, T, tTop) : lerp(OK.surf(lx, T, tTop), cabSurf(lx), clamp((lx - 1100) / 120));
    ly = sw + lerp(6, 30, P(swim, 0, .2)) * (1 - P(swim, .85, 1)) + 4 * Math.sin(T * 5);
    under = lerp(.3, 1, P(swim, 0, .15)) * (1 - P(swim, .9, 1));
  }
  if (climb > 0) { lx = lerp(XS, STACK.x, climb); ly = lerp(cabSurf(XS) - 10, STACK.y + Math.sin(T * 1.1) * 1.5, climb) - 44 * Math.sin(Math.PI * climb); under = 0; }
  const inWall = clamp(1 - Math.abs(lx - 1094) / 110);                    // passing under the wall between the two rooms
  const flick = 1 - .12 * thirst * (.5 + .5 * OK.nz(T * 9, 41));
  const warm = (1 - .35 * thirst) * lerp(1, .55, under);
  const lightA = flick * lerp(1, .75, under) * (1 - .3 * inWall);       // dimmed under water/the wall, but never reads as going out
  const contact = (.72 + .28 * PK.beat(T, 72)) * (1 - P(t, tGo - .04, tGo + .08));

  // ---------------- camera: pocket's last framing -> pans with him into the cabin (the old floor kept just under the counter) ----------------
  const pan = P(t, tGo + .06, tW + .12, E.inOutC);
  const zc = lerp(1.5, 1.6, P(t, tW, d, E.inOutQ)), LID = 588 + 10 * r1 + 12 * r2;   // in the cabin: its old floor held just under the counter (and pressing down a little as the water rises)
  const cabC = { x: 1772, y: 500 + (850 - LID) / zc };
  const z = lerp(CAM_END.z, zc, pan) * (1 - .2 * Math.sin(Math.PI * pan));
  const cx = lerp(CAM_END.x, cabC.x, pan) + .12 * Math.sin(Math.PI * pan) * (lx - lerp(CAM_END.x, cabC.x, pan)), cy = lerp(CAM_END.y, cabC.y, pan);
  const dr = OK.drift(T, 1);
  const shiver = coldK * (1 - .5 * pan) + 1.6 * P(t, tCold - .05, tCold + .08) * Math.exp(-Math.max(0, t - tCold - .08) * 3);
  const shx = shiver * (OK.nz(T * 11, 31) * 2.4) + surge * OK.nz(T * 6, 33) * 4, shy = shiver * (OK.nz(T * 11, 32) * 1.8) + surge * OK.nz(T * 6, 34) * 3.5;
  const M = OK.camMatrix(cx + dr.x, cy + dr.y, z, dr.r, shx, shy);
  const inv = M.inverse(), vx0 = inv.transformPoint(new DOMPoint(-30, 850)).x, vx1 = inv.transformPoint(new DOMPoint(W + 30, 850)).x;
  const showToilet = vx0 < RM.r + RM.wall + 40, showCabin = vx1 > COX + 114 - 40 && KN;

  OK.blackBG(ctx);
  ctx.save(); OK.applyCam(ctx, M);
  // the upside-down hull around the cabin (structure above the rooms, side plating and the sea to the right)
  const hullA = P(t, tGo - .1, tGo + .3);
  if (KN && hullA > 0) { ctx.save(); ctx.globalAlpha = hullA; ctx.translate(COX, COY); KN.hull(ctx, T, { amb: .8 }); ctx.restore(); }
  const salt = .7 * P(t, tCold - .1, tGo + .2);
  if (showToilet) {
    const tl = (.9 + .1 * PK.beat(T, 72)) * flick * lerp(1, .85, thirst) * lerp(1, .5, under) * clamp(1 - (lx - RM.r) / 260);
    OK.drawRoom(ctx, T, { lv: LV0, lx, ly, light: tl, zoom: z, cold: coldK, salt });
    if (contact > 0) OK.rimContact(ctx, T, lx, ly, contact * flick, 1 - .35 * thirst);
  }
  if (showCabin) {
    ctx.save(); ctx.translate(COX, COY);
    const cw = .62 * flick * lerp(.25, 1, climb) * clamp((lx - 1050) / 500) * (1 - .25 * thirst);
    cabinAt(ctx, T, KN, { wy: cwy, warm: cw, lx: lx - COX, ly: ly - COY, hl: 1 / z });
    ctx.restore();
  }
  // cold grade over the rooms (his light stays warm on top)
  if (coldK > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${Math.round(lerp(255, 150, coldK))},${Math.round(lerp(255, 205, coldK))},${Math.round(lerp(255, 228, coldK))},1)`;
    if (showToilet) ctx.fillRect(RM.x - RM.wall, RM.y - RM.wall, RM.w + 2 * RM.wall, RM.h + 2 * RM.wall);
    if (showCabin) ctx.fillRect(COX + 114, COY + 494, 852, 672);
    ctx.restore();
  }
  // the cabin's air layer: cool glow, stale haze, red when it runs out; the old level dashed; a bracket from the old floor to the water
  const CX0 = COX + 140, CX1 = COX + 940, CY0 = COY + 520;
  if (showCabin) {
    const airG = .25 * P(t, tAir - .2, tAir + .3) * (1 - .5 * danger), haze = .9 * P(t, tAir - .3, d);
    ctx.save(); ctx.beginPath(); ctx.rect(CX0, CY0, CX1 - CX0, cwyW - CY0); ctx.clip();
    if (airG > 0) { const g = ctx.createLinearGradient(0, CY0, 0, cwyW); g.addColorStop(0, rgba('#7fd6ff', .015 * airG)); g.addColorStop(1, rgba('#7fd6ff', .085 * airG)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(CX0, CY0, CX1 - CX0, cwyW - CY0); }
    if (haze > 0) {
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 2; i++) { const hx = CX0 + ((L.hash(i * 7 + 3) * 800 + T * 14 * (i % 2 ? 1 : -1)) % 800 + 800) % 800, hy = lerp(CY0 + 40, cwyW - 30, .3 + .4 * L.hash(i * 5 + 1)), r = 200 + 50 * L.hash(i);
        ctx.save(); ctx.translate(hx, hy); ctx.scale(2.2, .5); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, rgba('#8fa59a', .12 * haze)); g.addColorStop(1, 'rgba(143,165,154,0)'); ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); }
    }
    if (danger > 0) { const g = ctx.createLinearGradient(0, CY0, 0, cwyW); g.addColorStop(0, rgba('#e3262f', 0)); g.addColorStop(1, rgba('#e3262f', .1 * danger * (.6 + .4 * Math.sin(T * 6)))); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(CX0, CY0, CX1 - CX0, cwyW - CY0); }
    ctx.restore();
    const gy = cabWY(LVC0) + COY;
    if (cwyW < gy - 4) { ctx.save(); ctx.setLineDash([14 / z, 10 / z]); ctx.strokeStyle = rgba('#a9e2f2', .4); ctx.lineWidth = 1.8 / z; ctx.beginPath(); ctx.moveTo(CX0 + 6, gy); ctx.lineTo(CX1 - 6, gy); ctx.stroke(); ctx.restore(); }
  }
  const BX = COX + 520, by1 = cabSurf(BX) - 4;
  const bA = P(t, tW - .1, tRise) * (showCabin ? 1 : 0);
  const bCol = PK.lerp2('#bfeaff', '#ff6a6a', danger);
  OK.bracket(ctx, BX, CY0 + 4, by1, 1, bA, bCol, 1 / z);
  // chevrons pushing up from the surface while it rises
  const chA = Math.max(P(t, tRise - .1, tRise + .1) * (1 - P(t, tRise + .5, tRise + .8)), P(t, tMore - .1, tMore + .1) * (1 - P(t, tMore + .5, tMore + .8)));
  if (chA > 0) {
    ctx.save(); ctx.strokeStyle = rgba('#bfeaff', .7 * chA); ctx.lineWidth = 4 / z; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [COX + 610, COX + 690].forEach((x, i) => { const yy = cabSurf(x) - 18 - ((T * 60 + i * 14) % 30); for (let k = 0; k < 2; k++) { const y = yy - k * 16; ctx.globalAlpha = 1 - k * .4; ctx.beginPath(); ctx.moveTo(x - 18, y + 10); ctx.lineTo(x, y - 6); ctx.lineTo(x + 18, y + 10); ctx.stroke(); } });
    ctx.restore();
  }
  // surge rings around the rack
  ctx.save(); ctx.lineWidth = 2 / z;
  [tRise + .1, tMore + .1].forEach(tr => { const f = P(t, tr, tr + 1.2); if (f <= 0 || f >= 1) return; ctx.strokeStyle = rgba('#cfeef8', .5 * (1 - f)); ctx.beginPath(); ctx.ellipse(STACK.x - 40, cabSurf(STACK.x - 40) + 3, 30 + f * 300, 3 + f * 26, 0, 0, 7); ctx.stroke(); });
  // the splash where he lets go, and the rings where he surfaces
  { const f = P(t, tSplash, tSplash + 1.1); if (f > 0 && f < 1) { ctx.strokeStyle = rgba('#cfeef8', .55 * (1 - f)); ctx.beginPath(); ctx.ellipse(R.x + 10, OK.surf(R.x + 10, T, tTop) + 3, 16 + f * 230, 3 + f * 22, 0, 0, 7); ctx.stroke(); } }
  { const f = P(t, tArr - .1, tArr + 1.0); if (f > 0 && f < 1) { ctx.strokeStyle = rgba('#cfeef8', .5 * (1 - f)); ctx.beginPath(); ctx.ellipse(XS, cabSurf(XS) + 3, 14 + f * 200, 3 + f * 20, 0, 0, 7); ctx.stroke(); } }
  ctx.restore();
  // drops thrown up by the splash
  { const age = t - tSplash; if (age > 0 && age < .5) { ctx.save(); ctx.fillStyle = rgba('#d8f2fa', .6 * (1 - age / .5));
    for (let i = 0; i < 7; i++) { const vx = (OK.hi(i * 5 + 1) - .5) * 260, vy = -(160 + 220 * OK.hi(i * 9 + 2)); const x = R.x + 10 + vx * age, y = OK.surf(R.x, T, tTop) + vy * age + 900 * age * age; if (y > OK.surf(x, T, tTop)) continue; ctx.beginPath(); ctx.ellipse(x, y, 2, 3.5, 0, 0, 7); ctx.fill(); }
    ctx.restore(); } }
  // him: paler with thirst, faster heart; under the water: dim, cool, and re-covered by the water
  OK.lifeLight(ctx, T, lx, ly, { a: lightA, s: 1.45 * lerp(1, .88, thirst) * lerp(1, .7, under), bpm, breath: lerp(.45, .75, P(t, tRise, d)), warm, zoom: z });
  if (under > 0) {
    // bubbles from him rising to the surface
    ctx.save(); ctx.strokeStyle = rgba('#d8f6ff', .5 * under); ctx.lineWidth = 1.5 / z;
    for (let i = 0; i < 10; i++) { const tb = tSplash + i * .06, age = t - tb; if (age <= 0 || age > .5) continue; const pb = P(tb, tSplash, tArr, E.inOutQ), bx = lerp(R.x + 10, XS, pb) + Math.sin(age * 9 + i) * 5, sfc = bx < 1100 ? OK.surf(bx, T, tTop) : cabSurf(bx), by = ly + 6 - age * 200; if (by < sfc + 3) continue; ctx.beginPath(); ctx.arc(bx, by, 2 + 3 * OK.hi(i * 3), 0, 7); ctx.stroke(); }
    ctx.restore();
    if (lx < RM.r) OK.waterOver(ctx, T, tTop, lx - 240, lx + 240, .5 * under);
    else if (lx > COX + 140) {   // the cabin's water over him
      const x0 = Math.max(CX0, lx - 240), x1 = Math.min(CX1, lx + 240);
      if (x1 > x0) { ctx.save(); ctx.beginPath(); ctx.moveTo(x0, COY + 1140); for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(Math.min(x, x1), cabSurf(Math.min(x, x1))); ctx.lineTo(x1, COY + 1140); ctx.closePath();
        const g = ctx.createLinearGradient(0, cwyW, 0, cwyW + 120); g.addColorStop(0, rgba('#0f2a33', .5 * under)); g.addColorStop(1, rgba('#06161c', .62 * under)); ctx.fillStyle = g; ctx.fill(); ctx.restore(); }
    }
  }
  ctx.restore();

  // ---------------- screen space ----------------
  const [sx, sy] = OK.toS(M, lx, ly);
  drawCrust(ctx, P(t, tCold, d) * .9);
  const cwv = P(t, tCold - .05, tCold + .15) * (1 - P(t, tCold + .2, tCold + 1.1));
  if (cwv > 0) { const g = ctx.createRadialGradient(540, 850, 260, 540, 850, 900); g.addColorStop(0, 'rgba(160,215,235,0)'); g.addColorStop(1, `rgba(160,215,235,${(.16 * cwv).toFixed(3)})`); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // tunnel vision: pocket's (.55) -> opens a little while he swims -> closes to ~.8 as the air runs out
  const irisK = lerp(.55, .5, pan) - .1 * Math.sin(Math.PI * pan) + .3 * P(t, tMore - .2, d, E.inOutQ) + .05 * bt;
  const endDark = .5 * P(t, vEnd - .2, d, E.inQ);
  OK.iris(ctx, irisK, .5 + .5 * Math.sin(T * lerp(.45, .75, P(t, tRise, d)) * Math.PI * 2), lerp(540, sx, .5), lerp(850, sy, .5), 1 - (1 - .1 * (1 - bt)) * (1 - endDark));
  OK.quiet(ctx, 1);
  // hours counter (top slot, on the dark above the cabin's old floor)
  hours(ctx, t, 540, HOURS_Y, P(t, tCold - .05, tCold + .25) * (1 - .5 * P(t, vEnd, d)), [24, 36, 48], [tCold, tSai, tAir]);
  // '공기층' label beside the bracket
  const [bx, byM] = OK.toS(M, BX, (CY0 + by1) / 2);
  const lA = P(t, tAir - .15, tAir + .15) * (1 - .5 * P(t, vEnd, d)) * (showCabin ? 1 : 0);
  if (lA > 0) {
    const s = lerp(.86, 1, E.outBack(clamp(lA))), lx2 = bx + 30 + 72;
    ctx.save(); ctx.globalAlpha = clamp(lA); ctx.strokeStyle = rgba(bCol, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, byM); ctx.lineTo(lx2 - 66, byM); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(lx2, byM); ctx.scale(s, s); chip(ctx, '공기층', 0, 0, clamp(lA), { size: 40, color: danger > .5 ? '#ffd0d0' : '#fff', border: rgba(bCol, .7) }); ctx.restore();
  }
};
})();
