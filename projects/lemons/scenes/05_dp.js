// dp (20.52-25.02): "밤 10시쯤, 배를 제자리에 붙잡아 두던 장치가 멈췄습니다."
// Top-down, from high above the night sea: wind-torn dark water (crests, whitecaps, spindrift streaking left -> right), the
// dive support vessel (no name/logo) holding station bow-into-the-wind over a seabed crosshair (the work site, a ghost of the
// lattice structure deep below). Small thruster arrows keep correcting around the hull — no anchors.
//  '10시쯤,'  -> time chip (first half of data.time)
//  '배를'     -> corner brackets lock onto the ship
//  '제자리에'  -> the crosshair pings; the moonpool marker sits dead on it
//  '붙잡아'   -> the thrusters flare (holding against the wind)
//  '장치가'   -> the alarm lamp blinks amber, then red; the rest of data.time types in; the bridge blinks
//  '멈췄습니다.' -> thunk: the thruster arrows sputter out, wind arrows (data.wind) sweep in and push the ship off the
//              crosshair; a drift trail stretches from the site to the moonpool; data.cause as a small footnote.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

const SITE = [540, 868];                  // crosshair = the work site on the seabed (screen at rest)
const SHIP_S = .8, ROT0 = Math.PI - .16;  // bow to the left (into the wind), slightly up
const HUD = '#8fd3e8';

// ---------- top-down sea surface: baked once (half resolution, drawn 2x into a full-size layer) ----------
function vn(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hi(Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(s + 1, 83492791));
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
}
let SEA = null;
// wind-driven sea from far above: a sum of directional waves (crests across the wind), amplitude-modulated by noise, shaded
// by slope (sky glow from the upper right), foam on the steepest crests
const WAVES = [[330, 0, 1], [220, .36, .62], [170, -.46, .55], [118, .14, .38], [86, -.32, .26], [60, .52, .14]];
function seaTex() {
  if (SEA) return SEA;
  const FW = W + 360, FH = H + 240, w = Math.ceil(FW / 2), h = Math.ceil(FH / 2);
  const half = document.createElement('canvas'); half.width = w; half.height = h;
  const x = half.getContext('2d'), id = x.createImageData(w, h);
  const c0 = [2, 9, 11], c1 = [17, 46, 51], c2 = [92, 132, 134];
  const WV = WAVES.map(([lam, ang, a], i) => ({ kx: Math.cos(ang) * TAU / lam, ky: Math.sin(ang) * TAU / lam, a, ph: hi(i * 17 + 3) * TAU, i }));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = i * 2, Y = j * 2;
    let hh = 0, sx = 0, sy = 0;
    for (const v of WV) {
      const m = .3 + 1.4 * vn(X / 420 + v.i * 3.1, Y / 520 + v.i * 1.7, v.i), q = v.kx * X + v.ky * Y + v.ph + 5 * (vn(X / 260, Y / 300, v.i + 50) - .5), c = Math.cos(q);
      hh += v.a * m * Math.sin(q); sx += v.a * m * v.kx * c; sy += v.a * m * v.ky * c;
    }
    const slope = (sx * .8 - sy * .6) * 34, I = .5 + .5 * Math.tanh(slope);
    const chop = vn(X / 11, Y / 19, 21), rid = 1 - Math.abs(2 * vn(X / 26 + 3 * vn(X / 90, Y / 90, 23), Y / 48, 22) - 1);
    const crest = clamp((hh - 1.0) / .9) * clamp(slope * .6 + .4) * (.4 + .9 * chop);
    const lum = clamp(.08 + .74 * I * (.65 + .35 * vn(X / 300, Y / 300, 31)) + .1 * (chop - .5) + .12 * (Math.pow(rid, 4) - .2));
    const q = (j * w + i) * 4;
    for (let ch = 0; ch < 3; ch++) id.data[q + ch] = Math.min(255, lerp(c0[ch], c1[ch], lum) + (c2[ch] - c1[ch]) * crest * .9);
    id.data[q + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  const full = document.createElement('canvas'); full.width = FW; full.height = FH;
  const fx = full.getContext('2d'); fx.imageSmoothingQuality = 'high'; fx.drawImage(half, 0, 0, FW, FH);
  return (SEA = full);
}

// whitecaps seen from altitude: short broken lines of foam across the wind, with a faint smear trailing downwind
function whitecaps(ctx, t, ox, oy, a, gust) {
  ctx.save(); ctx.lineCap = 'round';
  const TW = W + 300, TH = H + 200;
  for (let i = 0; i < 70; i++) {
    const per = 2.4 + 2.4 * hi(i * 5 + 1), ph = ((t / per + hi(i * 7 + 3)) % 1 + 1) % 1, life = Math.pow(Math.sin(Math.PI * ph), .7) * (1 - .6 * ph);
    const cyc = Math.floor(t / per + hi(i * 7 + 3)), id = i * 31 + cyc * 7;
    let px = hi(id + 11) * TW + t * (64 + 30 * hi(i)) + ox, py = hi(id + 13) * TH + oy;
    px = ((px % TW) + TW) % TW - 150; py = ((py % TH) + TH) % TH - 100;
    if (py < 440 || py > 1270) continue;
    const L0 = (10 + 30 * hi(i * 3)) * (.7 + .5 * ph), A = a * life * (.3 + .45 * hi(i * 9));
    const n = 4 + Math.floor(5 * hi(i * 19));
    for (let k = 0; k < n; k++) {
      const v = (k / (n - 1) - .5) * L0, jx = (hi(i * 23 + k) - .5) * 6 + v * v * .012, r = (1.2 + 2.6 * hi(i * 29 + k)) * (1 - Math.abs(v) / L0 * .8);
      ctx.fillStyle = rgba('#e6f6f6', A * (.6 + .4 * hi(k + i))); ctx.beginPath(); ctx.ellipse(px + jx, py + v, r * .8, r * 1.3, 0, 0, TAU); ctx.fill();
    }
    const sl = (40 + 90 * hi(i * 17)) * ph * (1 + .6 * gust);
    ctx.strokeStyle = rgba('#cfe9ea', A * .28); ctx.lineWidth = Math.max(1.5, L0 * .25);
    ctx.beginPath(); ctx.moveTo(px + 2, py); ctx.lineTo(px + 2 + sl, py + 2); ctx.stroke();
  }
  ctx.restore();
}
// the thrusters' push: chevrons flowing toward the hull (mostly into the wind), angles always correcting
function thrustForce(ctx, t, pts, k, hold) {
  if (k <= .01) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  pts.forEach(([x, y, ang], i) => {
    const q = ang + .5 * fb(t * .55 + i * 4.3, 40 + i), s = 1 + .3 * hold, L1 = (62 + 18 * Math.sin(t * 5.3 + i * 2)) * s;
    LM.glow(ctx, x, y, 70 * s, '#9fe0ff', .2 * k);
    ctx.save(); ctx.translate(x, y); ctx.rotate(q);
    const g = ctx.createLinearGradient(-L1 - 30, 0, 0, 0); g.addColorStop(0, rgba('#d8f4ff', 0)); g.addColorStop(1, rgba('#d8f4ff', .9 * k));
    ctx.strokeStyle = g; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(-L1 - 30, 0); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.fillStyle = rgba('#e8f8ff', .95 * k); ctx.beginPath(); ctx.moveTo(6 * s, 0); ctx.lineTo(-16 * s, -14 * s); ctx.lineTo(-16 * s, 14 * s); ctx.closePath(); ctx.fill();
    for (let c = 0; c < 2; c++) { const ph = ((t * 2.2 + c / 2 + i * .3) % 1), dd = -L1 - 20 + ph * (L1 + 10); ctx.fillStyle = rgba('#ffffff', .7 * k * Math.sin(Math.PI * ph)); ctx.beginPath(); ctx.arc(dd, 0, 4.5 * s, 0, TAU); ctx.fill(); }
    ctx.restore();
  });
  ctx.restore();
}
// wind arrows: long streamlines flowing left -> right
function windArrows(ctx, t, a, lanes) {
  if (a <= .01) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  lanes.forEach(([y, x0, x1, k], li) => {
    for (let j = 0; j < 2; j++) {
      const ph = ((t * .62 + j * .5 + hi(li * 7) * .5) % 1), len = 210 * k, hx = lerp(x0 - 60, x1 + len, ph), tx = hx - len;
      const env = clamp(Math.min((hx - x0) / 120, (x1 + len - hx) / 160)), A = a * env * k;
      if (A <= .01) continue;
      const wv = y + 7 * Math.sin(t * 2.2 + li + j);
      const g = ctx.createLinearGradient(tx, 0, hx, 0); g.addColorStop(0, rgba('#e8f6ff', 0)); g.addColorStop(1, rgba('#e8f6ff', .85 * A));
      ctx.strokeStyle = g; ctx.lineWidth = 5 * k;
      ctx.beginPath(); ctx.moveTo(tx, wv + 6); ctx.quadraticCurveTo((tx + hx) / 2, wv - 6, hx, wv); ctx.stroke();
      ctx.strokeStyle = rgba('#e8f6ff', .9 * A); ctx.lineWidth = 5 * k;
      ctx.beginPath(); ctx.moveTo(hx - 24 * k, wv - 20 * k); ctx.lineTo(hx, wv); ctx.lineTo(hx - 24 * k, wv + 20 * k); ctx.stroke();
    }
  });
  ctx.restore();
}
function brackets(ctx, cx, cy, w, h, a, col, len = 34, lw = 4) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = cx + sx * w / 2, y = cy + sy * h / 2; ctx.beginPath(); ctx.moveTo(x - sx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * len); ctx.stroke(); }
  ctx.restore();
}
function splitDot(s) { const i = s.indexOf(' · '); return i > 0 ? [s.slice(0, i), s.slice(i + 3)] : [s, '']; }

window.PK.scenes.dp = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const t10 = at('10시쯤', .06), tShip = at('배를', .28), tPlace = at('제자리에', .36), tHold = at('붙잡아', .47);
  const tDev = at('장치가', .64), tStop = at('멈췄습니다', .74);
  const after = t >= tStop;

  // ---- story values ----
  const u = clamp((t - tStop) / (d + .2 - tStop)), dr = after ? 70 * E.outQ(P(t, tStop, tStop + .6)) + 250 * Math.pow(u, 1.5) : 0;
  const hold = Math.exp(-Math.pow((t - tHold - .25) / .45, 2));              // the thrusters bite on '붙잡아'
  const sput = P(t, tStop - .02, tStop + .3);
  const thrust = (1 - sput) * (sput > 0 ? (hi(Math.floor(t * 26) + 5) > .45 ? 1 : .25) : 1) * (1 + .5 * hold);
  const alarmOn = P(t, tDev - .08, tDev);
  const red = P(t, tDev + .3, tDev + .38);
  const gust = P(t, tStop - .05, tStop + .4, E.outQ);

  // ---- camera ----
  const z = lerp(1.08, 1, P(t, -.15, 1.5, E.outC)) + .03 * P(t, tHold - .2, tStop, E.inOutQ) - .02 * gust;
  const sh = LM.shake(t, .25 + .35 * gust, 5), jo = LM.jolt(t, tStop, 1.1);
  const panX = .2 * dr, panY = .04 * dr;
  const ox = sh.x + jo.x - panX, oy = sh.y + jo.y - panY;
  const S = p => [(p[0] - SITE[0]) * z + SITE[0] + ox, (p[1] - SITE[1]) * z + SITE[1] + oy];

  // ---- the ship (world = screen at rest) ----
  const wob = after ? 0 : 1;
  const tw = Math.min(t, tStop);                                            // station-keeping wobble freezes when it fails
  const rot = ROT0 + .012 * nz(tw * .6, 6) + .14 * u * u + .04 * u;
  const sR = LM.ship(null, 0, 0, SHIP_S, t, { view: 'top', rot });            // moonpool offset from the hull centre
  const shipP = [SITE[0] - sR.moonpool[0] + 5 * nz(tw * .8, 3) + dr, SITE[1] - sR.moonpool[1] + 4 * nz(tw * .7, 4) + dr * .17];
  const mp = [shipP[0] + sR.moonpool[0], shipP[1] + sR.moonpool[1]];

  // ================= sea =================
  const sea = seaTex();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sea, Math.round(-240 + ((t * 34) % 120) + ox - panX * .1), Math.round(-120 + oy));
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16;
  ctx.drawImage(sea, Math.round(-60 - t * 22 + ox), Math.round(-200 + t * 9 + oy));
  ctx.restore();
  // night: darken the top and the bottom (light falls off), cold sheen in the middle
  { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(1,4,5,.82)'); g.addColorStop(.26, 'rgba(1,4,5,.32)'); g.addColorStop(.45, 'rgba(1,4,5,.1)'); g.addColorStop(.62, 'rgba(1,4,5,.28)'); g.addColorStop(.75, 'rgba(1,3,4,.7)'); g.addColorStop(1, 'rgba(0,2,2,.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  // ================= deep below: the work site (ghost of the lattice) + crosshair =================
  ctx.save(); ctx.translate(SITE[0] + ox, SITE[1] + oy); ctx.scale(z, z); ctx.translate(-SITE[0], -SITE[1]);
  const st = SITE, ping = P(t, tPlace - .05, tPlace + .9);
  const lost = P(t, tStop + .05, tStop + .5);
  const hudC = LM.mix(HUD, COL.red, lost);
  LM.structure(ctx, st[0], st[1], .44, t, { view: 'top', amb: .55, ambColor: '#7fb8c0', a: .2 + .08 * Math.exp(-Math.pow((t - tPlace - .1) / .35, 2)) });
  LM.glow(ctx, st[0], st[1], 260, '#2f8a96', .12);
  ctx.save(); ctx.lineCap = 'round';
  // long cross lines with a gap in the middle
  const cl = 460, gap = 38;
  ctx.strokeStyle = rgba(hudC, .32); ctx.lineWidth = 2; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.moveTo(st[0] - cl, st[1]); ctx.lineTo(st[0] - gap, st[1]); ctx.moveTo(st[0] + gap, st[1]); ctx.lineTo(st[0] + cl, st[1]);
  ctx.moveTo(st[0], st[1] - 330); ctx.lineTo(st[0], st[1] - gap); ctx.moveTo(st[0], st[1] + gap); ctx.lineTo(st[0], st[1] + 330); ctx.stroke(); ctx.setLineDash([]);
  // station circle + outer ring with ticks (rotating slowly)
  ctx.strokeStyle = rgba(hudC, .55 + .3 * lost * (Math.sin(t * 16) > 0 ? 1 : .3)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st[0], st[1], 56, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(hudC, .22); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(st[0], st[1], 250, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(hudC, .35); ctx.beginPath();
  for (let k = 0; k < 48; k++) { const q = k / 48 * TAU + t * .08, l = k % 4 ? 8 : 18; ctx.moveTo(st[0] + Math.cos(q) * 250, st[1] + Math.sin(q) * 250); ctx.lineTo(st[0] + Math.cos(q) * (250 - l), st[1] + Math.sin(q) * (250 - l)); }
  ctx.stroke();
  ctx.fillStyle = rgba(hudC, .9); ctx.beginPath(); ctx.arc(st[0], st[1], 5, 0, TAU); ctx.fill();
  // ping on '제자리에'
  if (ping > 0 && ping < 1) for (let k = 0; k < 2; k++) { const q = clamp(ping * 1.3 - k * .25); if (q <= 0 || q >= 1) continue; ctx.strokeStyle = rgba('#e8f6ff', .7 * (1 - q)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st[0], st[1], 30 + q * 260, 0, TAU); ctx.stroke(); }
  if (ping > 0) LM.glow(ctx, st[0], st[1], 120, '#bfefff', .5 * Math.exp(-Math.max(0, t - tPlace) * 3));
  ctx.restore();

  // ================= the ship =================
  // thruster wash (white churn) while it holds
  const TH = [[330, -60], [330, 60], [-410, -50], [-410, 50], [140, 0]], cr = Math.cos(rot), sr = Math.sin(rot);
  const shipMap = (lx, ly) => [shipP[0] + (lx * cr - ly * sr) * SHIP_S, shipP[1] + (lx * sr + ly * cr) * SHIP_S];
  if (thrust > .02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    TH.forEach(([lx, ly], i) => {
      const p = shipMap(lx, ly);
      for (let k = 0; k < 7; k++) { const q = hi(i * 13 + k) * TAU + t * (1.5 + hi(k)), r = 10 + 30 * hi(i * 5 + k) + 8 * Math.sin(t * 6 + k), rr = 6 + 10 * hi(k * 3 + i);
        ctx.fillStyle = rgba('#dff4f6', .09 * thrust); ctx.beginPath(); ctx.arc(p[0] + Math.cos(q) * r, p[1] + Math.sin(q) * r, rr, 0, TAU); ctx.fill(); }
    });
    ctx.restore();
  }
  // wake/foam smear on the windward side once it drifts
  if (after) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) { const p = shipMap(-380 + k * 60, (k % 2 ? 1 : -1) * 92);
      ctx.strokeStyle = rgba('#dff4f6', .12 * lost * (.5 + .5 * hi(k))); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0] - 140 * u - 20, p[1]); ctx.lineTo(p[0] - 10, p[1]); ctx.stroke(); }
    ctx.restore();
  }
  // deck floods glinting on the wave faces around the hull
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const q = hi(i * 3 + 1) * TAU, r = 90 + 300 * hi(i * 5 + 2), gp = [shipP[0] + Math.cos(q) * r * 1.5, shipP[1] + Math.sin(q) * r * .55], fl = Math.max(0, Math.sin(t * (2 + 2 * hi(i)) + i * 2.1));
    ctx.fillStyle = rgba(COL.amber, .35 * fl * fl * (1 - r / 420)); ctx.fillRect(gp[0] - 6, gp[1] - 1, 12 + 10 * hi(i * 7), 2);
  }
  ctx.restore();
  LM.ship(ctx, shipP[0], shipP[1], SHIP_S, t, { view: 'top', rot, thrust: 0, lights: 1 });
  if (hold > .05 && thrust > .05) TH.forEach(([lx, ly]) => { const p = shipMap(lx, ly); LM.glow(ctx, p[0], p[1], 46, '#bfe9ff', .45 * hold * thrust); });
  // the push that holds it: arrows at the bow and stern thrusters pointing into the wind / onto the hull
  { const FP = [[330, -122], [330, 122], [-380, -122], [-380, 122]].map(([lx, ly]) => { const p = shipMap(lx, ly); return [p[0], p[1], p[1] < shipP[1] ? Math.PI * .72 : -Math.PI * .72]; });
    thrustForce(ctx, t, FP, clamp(thrust, 0, 1.3), hold); }
  // bridge alarm (blinks on the bridge roof)
  const blink = alarmOn * (((t - tDev) * (red > .5 ? 3.2 : 2.4)) % 1 < .55 ? 1 : .12);
  const alC = red > .5 ? COL.red : COL.alarm;
  if (alarmOn > 0) { const b = shipMap(260, 0); LM.glow(ctx, b[0], b[1], 150, alC, .55 * blink); LM.glow(ctx, b[0], b[1], 34, '#fff2d0', .8 * blink); }
  // corner brackets lock onto the ship on '배를'
  const bA = P(t, tShip - .05, tShip + .2, E.outQ) * (1 - P(t, tDev - .2, tDev + .1));
  if (bA > 0) {
    ctx.save(); ctx.translate(shipP[0], shipP[1]); ctx.rotate(rot);
    const k = lerp(1.35, 1, E.outBack(P(t, tShip - .05, tShip + .35)));
    brackets(ctx, 0, 0, 980 * SHIP_S * k, 230 * SHIP_S * k, bA, rgba(COL.amber, .85), 30, 4);
    ctx.restore();
  }
  // moonpool marker (where the bell wire goes down) + drift trail from the site
  const mpA = P(t, tPlace - .1, tPlace + .2);
  if (lost > 0 || dr > 1) {
    ctx.save(); ctx.strokeStyle = rgba(COL.red, .85 * lost); ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 60; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.lineTo(mp[0], mp[1]); ctx.stroke(); ctx.setLineDash([]);
    const ang = Math.atan2(mp[1] - st[1], mp[0] - st[0]), L1 = Math.hypot(mp[0] - st[0], mp[1] - st[1]);
    if (L1 > 40) { ctx.fillStyle = rgba(COL.red, .9 * lost); ctx.translate(mp[0] - Math.cos(ang) * 16, mp[1] - Math.sin(ang) * 16); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-14, -12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  if (mpA > 0) {
    const mc = LM.mix(COL.amber, COL.red, lost);
    ctx.save(); ctx.strokeStyle = rgba(mc, .95 * mpA); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(mp[0], mp[1], 17, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mp[0] - 28, mp[1]); ctx.lineTo(mp[0] - 20, mp[1]); ctx.moveTo(mp[0] + 20, mp[1]); ctx.lineTo(mp[0] + 28, mp[1]); ctx.moveTo(mp[0], mp[1] - 28); ctx.lineTo(mp[0], mp[1] - 20); ctx.moveTo(mp[0], mp[1] + 20); ctx.lineTo(mp[0], mp[1] + 28); ctx.stroke(); ctx.restore();
    LM.glow(ctx, mp[0], mp[1], 44, mc, .6 * mpA);
  }
  ctx.restore();   // camera

  // ================= surface weather (over everything, screen space) =================
  whitecaps(ctx, t, ox, oy, .75 + .25 * gust, gust);
  // spindrift streaks: fine, fast lines along the wind
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const sp = 520 + 400 * hi(i * 3 + 2), y = 470 + hi(i * 5 + 7) * 780 + 8 * Math.sin(t * 1.3 + i), len = 60 + 140 * hi(i * 11) * (1 + gust);
    const x = ((hi(i * 7 + 1) * (W + 600) + t * sp) % (W + 600)) - 300;
    ctx.strokeStyle = rgba('#cfe9ea', (.06 + .08 * gust) * (.5 + .5 * hi(i * 13))); ctx.lineWidth = 1.2 + hi(i) * 1.4;
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke();
  }
  ctx.restore();
  // wind arrows push in on '멈췄습니다.'
  const wA = P(t, tStop - .05, tStop + .35, E.outQ);
  windArrows(ctx, t - tStop, wA, [[742, -20, 820, 1], [866, -60, 170, .75], [1010, -40, 420, .85], [1090, 0, 820, 1]]);

  // alarm: edge pulse in amber -> red
  if (alarmOn > 0) {
    const ea = .2 * blink + .08 * lost;
    const g = ctx.createRadialGradient(540, 860, 330, 540, 860, 980); g.addColorStop(0, rgba(alC, 0)); g.addColorStop(.6, rgba(alC, ea * .45)); g.addColorStop(1, rgba(alC, ea));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  LM.subBand(ctx, .82);

  // ================= labels =================
  const [tm1, tm2] = splitDot(D.time || '22:10경 · 동적위치제어(DP) 경보 → 위치 상실');
  // time (first half) on '10시쯤,'
  const t1A = P(t, t10 - .1, t10 + .12, E.outQ);
  if (t1A > 0) {
    const s = lerp(.86, 1, E.outBack(P(t, t10 - .1, t10 + .3)));
    ctx.save(); ctx.translate(540, 508); ctx.scale(s, s); PK.chip(ctx, tm1, 0, 0, t1A, { size: 46, color: '#ffffff', border: 'rgba(255,217,160,.6)' }); ctx.restore();
  }
  // alarm lamp + the rest of data.time on '장치가'
  const t2A = P(t, tDev - .1, tDev + .1, E.outQ);
  if (t2A > 0) {
    const sz = 32, tw = measure(ctx, tm2, sz, FONT.sub, 800), cw = tw + 40 + 74, cx = 540, cy = 586, x0 = cx - cw / 2;
    const s = lerp(.9, 1, E.outBack(P(t, tDev - .1, tDev + .3)));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    ctx.save(); ctx.globalAlpha *= t2A; ctx.fillStyle = 'rgba(14,4,4,.86)'; roundRect(ctx, x0, cy - 30, cw, 60, 10); ctx.fill();
    ctx.strokeStyle = rgba(alC, .5 + .4 * blink); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    LM.alarm(ctx, x0 + 38, cy + 12, t, { on: t2A, color: alC, mode: 'blink', rate: red > .5 ? 3.2 : 2.4, phase: -tDev * (red > .5 ? 3.2 : 2.4), s: .62 });
    const shown = L.typeSub(tm2, P(t, tDev - .02, tDev + .45));
    text(ctx, shown, x0 + 74, cy + 2, { size: sz, weight: 800, color: '#ffe6c8', align: 'left', alpha: t2A });
    ctx.restore();
  }
  // wind label by the arrows
  const wlA = P(t, tStop + .12, tStop + .4, E.outQ);
  if (wlA > 0) {
    const s = lerp(.9, 1, E.outBack(P(t, tStop + .12, tStop + .5)));
    ctx.save(); ctx.translate(250, 672); ctx.scale(s, s); PK.chip(ctx, D.wind || '바람 약 30~35노트', 0, 0, wlA, { size: 34, color: '#e8f6ff', border: 'rgba(200,235,255,.5)' }); ctx.restore();
  }
  // cause: small footnote under the picture (two short lines)
  const cA = P(t, tStop + .4, tStop + .7) * (1 - P(t, d + .05, d + .2));
  if (cA > 0) {
    const [c1, c2] = splitDot(D.cause || '');
    text(ctx, c1, 540, 1168, { size: 26, weight: 800, color: 'rgba(214,226,232,.92)', alpha: cA, stroke: 'rgba(0,0,0,.6)', strokeW: 5 });
    if (c2) text(ctx, c2, 540, 1204, { size: 22, weight: 700, color: 'rgba(160,185,196,.9)', alpha: cA, stroke: 'rgba(0,0,0,.6)', strokeW: 5 });
  }
};
})();
