// cold (≈35.09-40.36): "춥고 목이 타는 사이, 물은 차오르고 공기는 점점 줄어들었습니다."
// Same inverted toilet and framing as pocket's last frame (his light at the basin, the backlit hand on the rim).
// '춥고': the image goes cold (teal grade), the frame shivers, the hand trembles; salt crust starts growing on the steel
// edges and at the frame edges. '목이 타는': his light pales and flickers; salt creeps along the old waterline and the rim.
// An hours counter climbs 24시간 -> 36시간 ('사이') -> 48시간 ('공기는'), used loosely as time passing.
// '물은': the camera pulls back to the whole room; '차오르고': the water heaves up a step (gurgle), a dashed line keeps
// the old level, chevrons push up from the surface, his light rises with it. '공기는': the '공기층' bracket lights up;
// '점점': a second rise, the bracket squeezes; '줄어들었습니다': it turns red, stale haze thickens in the gap,
// the heartbeat quickens and tunnel vision closes in. Ends darker for the hard cut into his own voice (oxygen clip).
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
// hours counter with an odometer roll between values (fixed box)
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

window.PK.scenes.cold = function (ctx, t, d, info) {
  const OK = PK.okRoom; const T = info.sc.t0 + t;
  const { RM, LV0, CAM_END, GRIP } = OK;
  const tCold = at(info, '춥고', .02), tThroat = at(info, '목이', .1), tDry = at(info, '타는', .15), tSai = at(info, '사이', .2), tW = at(info, '물은', .32),
    tRise = at(info, '차오르고', .38), tAir = at(info, '공기는', .49), tMore = at(info, '점점', .6), tLess = at(info, '줄어들었', .69);
  const vEnd = info.sc.voice_end - info.sc.t0;

  // ---------------- state ----------------
  const r1 = E.inOutQ(P(t, tRise - .12, tRise + .6)), r2 = E.inOutQ(P(t, tMore - .08, tMore + .65));
  const lv = LV0 + .06 * r1 + .045 * r2 + .006 * P(t, tLess, d);
  const top = OK.lvY(lv);
  const surge = Math.exp(-Math.pow((t - tRise - .25) / .3, 2)) + .7 * Math.exp(-Math.pow((t - tMore - .25) / .3, 2));
  const coldK = P(t, tCold - .1, tCold + .5, E.outQ);
  const thirst = P(t, tThroat - .05, tDry + .5, E.inOutQ);
  const danger = P(t, tLess - .1, tLess + .6, E.inOutQ);
  const bpm = lerp(72, 96, P(t, tRise, d));
  const Lp = OK.restLight(T, lv);
  Lp.y -= 6 * surge;

  // ---------------- camera: pocket's last framing -> pull back on '물은' -> slow push / tunnel ----------------
  const back = P(t, tW - .25, tRise + .35, E.inOutQ), push = P(t, tLess - .3, d + .3, E.inOutQ);
  const z = lerp(lerp(CAM_END.z, 1.22, back), 1.42, push);
  const cx = lerp(lerp(CAM_END.x, 614, back), 728, push), cy = lerp(lerp(CAM_END.y, 772, back), 752, push);
  const dr = OK.drift(T, 1);
  const shiver = coldK * (1 - .4 * back) + 1.6 * P(t, tCold - .05, tCold + .08) * Math.exp(-Math.max(0, t - tCold - .08) * 3);
  const shx = shiver * (OK.nz(T * 11, 31) * 2.4) + surge * OK.nz(T * 6, 33) * 4, shy = shiver * (OK.nz(T * 11, 32) * 1.8) + surge * OK.nz(T * 6, 34) * 3.5;
  const M = OK.camMatrix(cx + dr.x, cy + dr.y, z, dr.r, shx, shy);

  OK.blackBG(ctx);
  ctx.save(); OK.applyCam(ctx, M);
  const warm = 1 - .35 * thirst;
  const flick = 1 - .12 * thirst * (.5 + .5 * OK.nz(T * 9, 41));
  const light = (.9 + .1 * PK.beat(T, bpm)) * flick * lerp(1, .85, thirst);
  const ghost = top < OK.lvY(LV0) - 4 ? OK.lvY(LV0) : null;
  // forearm: toward his light at first (pocket), then down into the water as it rises
  const armK = P(t, tRise - .2, tRise + .6, E.inOutQ);
  const handOpts = { c: 1, a: 1, sx: lerp(Lp.x, Lp.x - 34, armK), sy: lerp(Lp.y + 2, top + 90, armK), tremble: .8 + 1.4 * coldK, T, rimA: (.7 + .25 * PK.beat(T, bpm)) * lerp(1, .8, thirst), rim: PK.lerp2('#cfe2ea', '#ffd9b0', warm) };
  OK.drawRoom(ctx, T, {
    lv, lx: Lp.x, ly: Lp.y, light, zoom: z, cold: coldK, salt: lerp(.05, 1, P(t, tCold, d - .3)), ghost, haze: .9 * P(t, tAir - .3, d),
    airGlow: .25 * P(t, tAir - .2, tAir + .3) * (1 - .5 * danger),
    onWall: c => { c.save(); c.translate(Lp.x, Lp.y); c.scale(1.55, 1.55); c.translate(-Lp.x, -Lp.y); OK.gripHand(c, GRIP.x, GRIP.y, GRIP.s, Object.assign({}, handOpts, { mode: 'shadow', shadowA: .42 * light })); c.restore(); },
  });
  // cold grade over the room (his light and hand stay warm on top)
  if (coldK > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${Math.round(lerp(255, 150, coldK))},${Math.round(lerp(255, 205, coldK))},${Math.round(lerp(255, 228, coldK))},1)`; ctx.fillRect(RM.x - RM.wall, RM.y - RM.wall, RM.w + 2 * RM.wall, RM.h + 2 * RM.wall); ctx.restore(); }
  // the air layer: bracket from the ceiling to the water, squeezing (no number)
  const BX = 318, by1 = OK.surf(BX, T, top) - 4;
  const bA = P(t, tW - .1, tRise);
  const bCol = PK.lerp2('#bfeaff', '#ff6a6a', danger);
  OK.bracket(ctx, BX, RM.y + 4, by1, 1, bA, bCol, 1 / z);
  if (danger > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, RM.y, 0, top); g.addColorStop(0, rgba('#e3262f', 0)); g.addColorStop(1, rgba('#e3262f', .1 * danger * (.6 + .4 * Math.sin(T * 6)))); ctx.fillStyle = g; ctx.fillRect(RM.x, RM.y, RM.w, top - RM.y); ctx.restore(); }
  // chevrons pushing up from the surface while it rises
  const chA = Math.max(P(t, tRise - .1, tRise + .1) * (1 - P(t, tRise + .5, tRise + .8)), P(t, tMore - .1, tMore + .1) * (1 - P(t, tMore + .5, tMore + .8)));
  if (chA > 0) {
    ctx.save(); ctx.strokeStyle = rgba('#bfeaff', .7 * chA); ctx.lineWidth = 4 / z; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [430, 560, 690].forEach((x, i) => { const yy = OK.surf(x, T, top) - 18 - ((T * 60 + i * 14) % 30); for (let k = 0; k < 2; k++) { const y = yy - k * 16; ctx.globalAlpha = 1 - k * .4; ctx.beginPath(); ctx.moveTo(x - 18, y + 10); ctx.lineTo(x, y - 6); ctx.lineTo(x + 18, y + 10); ctx.stroke(); } });
    ctx.restore();
  }
  // the hand on the rim (shivering), its submerged part covered by the water again
  OK.gripHand(ctx, GRIP.x, GRIP.y, GRIP.s, Object.assign({ cutTop: top }, handOpts));
  // surge rings
  ctx.save(); ctx.lineWidth = 2 / z;
  [tRise + .1, tMore + .1].forEach(tr => { const f = P(t, tr, tr + 1.2); if (f <= 0 || f >= 1) return; ctx.strokeStyle = rgba('#cfeef8', .5 * (1 - f)); ctx.beginPath(); ctx.ellipse(Lp.x, OK.surf(Lp.x, T, top) + 3, 20 + f * 300, 3 + f * 26, 0, 0, 7); ctx.stroke(); });
  ctx.restore();
  // him: paler with thirst, faster heart
  OK.lifeLight(ctx, T, Lp.x, Lp.y, { a: flick, s: 1.45 * lerp(1, .88, thirst), bpm, breath: lerp(.45, .75, P(t, tRise, d)), warm, zoom: z });
  ctx.restore();

  // ---------------- screen space ----------------
  const [sx, sy] = OK.toS(M, Lp.x, Lp.y);
  drawCrust(ctx, P(t, tCold, d) * .9);
  const cw = P(t, tCold - .05, tCold + .15) * (1 - P(t, tCold + .2, tCold + 1.1));
  if (cw > 0) { const g = ctx.createRadialGradient(540, 850, 260, 540, 850, 900); g.addColorStop(0, 'rgba(160,215,235,0)'); g.addColorStop(1, `rgba(160,215,235,${(.16 * cw).toFixed(3)})`); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const irisK = .32 + .08 * P(t, tCold, tW) + .3 * P(t, tMore, d) + .05 * PK.beat(T, bpm);
  const endDark = .5 * P(t, vEnd - .2, d, E.inQ);
  OK.iris(ctx, irisK, .5 + .5 * Math.sin(T * lerp(.45, .75, P(t, tRise, d)) * Math.PI * 2), lerp(540, sx, .5), lerp(850, sy, .5), 1 - (1 - .1 * (1 - PK.beat(T, bpm))) * (1 - endDark));
  // darker for the cut into the clip
  OK.quiet(ctx, 1);
  // hours counter (top slot)
  hours(ctx, t, 540, 530, P(t, tCold - .05, tCold + .25) * (1 - .5 * P(t, vEnd, d)), [24, 36, 48], [tCold, tSai, tAir]);
  // '공기층' label beside the bracket
  const [bx, byM] = OK.toS(M, BX, (RM.y + by1) / 2);
  const lA = P(t, tAir - .15, tAir + .15) * (1 - .5 * P(t, vEnd, d));
  if (lA > 0) {
    const s = lerp(.86, 1, E.outBack(clamp(lA))), lx = bx + 30 + 72;
    ctx.save(); ctx.globalAlpha = clamp(lA); ctx.strokeStyle = rgba(bCol, .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, byM); ctx.lineTo(lx - 66, byM); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(lx, byM); ctx.scale(s, s); chip(ctx, '공기층', 0, 0, clamp(lA), { size: 40, color: danger > .5 ? '#ffd0d0' : '#fff', border: rgba(bCol, .7) }); ctx.restore();
  }
};
})();
