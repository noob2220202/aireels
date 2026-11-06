// bridge (65.72-70.73): "그사이 선장과 항해사는 배를 직접 몰아 되돌아오고 있었습니다."
// Hard cut UP from the black seabed to the ship's bridge at night, seen from behind the two officers (faceless dark backs):
// through the raked windows the bow pitches against a rolling horizon, the deck floods throw amber on the foredeck, spray
// bursts over the bow and slaps the glass (sea spray, no rain). Credit tone: they are bringing her back by hand.
//  cut (0)          -> a sheet of spray hits the glass (white haze, jolt) — the contrast after the darkness
//  '선장과'          -> the left figure's rim catches the light, small label '선장'
//  '항해사는'     -> the right figure, label '항해사'
//  '배를'            -> inset map (top-left): crosshair over the site, the ship icon far off it, red drift line + data.drift
//  '직접'            -> both hands shove the thruster levers forward, the thrust bars light amber, the camera leans in;
//                      chip data.manual (first half)
//  '몰아'            -> engine surge: the frame vibrates, the bow digs in (spray over the bow and onto the glass), the view yaws
//  '되돌아오고'       -> on the map the ship icon arcs back toward the crosshair, its track drawing; the rest of data.manual
//  '있었습니다.'      -> the ROV monitor (top-right) powers on: two cones find a small still shape on the beam; chip data.rov
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;
const HUD = '#8fd3e8';
const WT = 318, WB = 1046, HOR = 776;           // window top, sill, horizon at rest
const POSTS = [4, 360, 720, 1076];              // window posts (centre at the sill)
const BOW = [540, 904];                         // bow tip (fixed to the ship = fixed in frame)
const BURSTS = [-.16, 1.48, 3.2, 4.52];         // the bow digs in; the spray hits the glass ~.16 s later
const BK = [1, .5, 1, .55];
const HIT = .16;
const MAP = { x: 46, y: 486, w: 456, h: 262 }, ROV = { x: 578, y: 486, w: 456, h: 262 };
const CAPT = { x: 284, y: 1004, s: .8, side: 1 }, MATE = { x: 798, y: 998, s: .78, side: -1 };

// ---------------- sky + sea gradient as a cached 1-px strip (drawn stretched, nearest neighbour) ----------------
let _strip = null;
function strip() {
  if (_strip) return _strip;
  const c = document.createElement('canvas'); c.width = 1; c.height = 1800; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1800);        // horizon at 1000
  g.addColorStop(0, '#010304'); g.addColorStop(.36, '#03080a'); g.addColorStop(.52, '#0b1a1e'); g.addColorStop(.552, '#1d3439');
  g.addColorStop(.5556, '#2a454b'); g.addColorStop(.5575, '#0f2024'); g.addColorStop(.62, '#081518'); g.addColorStop(1, '#030909');
  x.fillStyle = g; x.fillRect(0, 0, 1, 1800); return (_strip = c);
}
// ---------------- the night sea through the windows (rolls/pitches/yaws with the ship) ----------------
function outside(ctx, t, pitch, roll, yaw) {
  ctx.save();
  ctx.beginPath(); ctx.rect(-80, WT, W + 160, WB - WT + 4); ctx.clip();
  ctx.translate(540, HOR + pitch); ctx.rotate(roll);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(strip(), 0, 0, 1, 1800, -1100, -1000, 2200, 1800); ctx.imageSmoothingEnabled = true;
  // wave crests in perspective rows, rolling toward the bow; whitecaps flicker; the near ones catch the deck floods
  ctx.lineCap = 'round';
  const N = 24, sp = .34;
  for (let k = 0; k < N; k++) {
    const q = k + t * sp, cyc = Math.floor(q / N), zz = (q % N) / N, z = zz * zz, y = 3 + 660 * Math.pow(zz, 2.15), sc = .14 + 1.9 * z;
    const fade = clamp(zz * 5) * clamp((1 - zz) * 7), id = k * 37 + cyc * 911;
    if (fade <= .01) continue;
    for (let j = 0; j < 8; j++) {
      const xb = hi(id + j * 13) * 2200 - 1100, x = ((((xb + yaw / sc) + 1100) % 2200 + 2200) % 2200 - 1100) * sc;
      if (x < -1150 || x > 1150) continue;
      const len = (22 + 70 * hi(id + j * 7 + 1)) * sc, cap = hi(id + j * 3 + 2) > .74;
      const near = clamp(1 - Math.abs(x) / (700 * Math.max(.6, sc))) * clamp((zz - .45) * 2.5);
      const fl = cap ? .6 + .4 * Math.sin(t * 3 + j * 2.1 + k) : 1;
      const col = cap ? LM.mix('#cfe3e6', '#ffd29a', near * .7) : LM.mix('#47666c', '#b0814a', near * .65);
      ctx.strokeStyle = rgba(col, fade * (cap ? .22 + .5 * z : .14 + .26 * z) * fl * (1 + .8 * near)); ctx.lineWidth = Math.max(1, (cap ? 2.4 : 1.6) * sc);
      ctx.beginPath(); ctx.moveTo(x - len, y + 2 * sc); ctx.quadraticCurveTo(x, y - 4 * sc, x + len, y + 1 * sc); ctx.stroke();
    }
  }
  ctx.restore();
}
// ---------------- foredeck (fixed to the ship), deck floods, foremast ----------------
let _deck = null;
const DK = { x: -80, y: 760, w: W + 160, h: 620 };
function deckCache() {
  if (_deck) return _deck;
  const mk = () => { const c = document.createElement('canvas'); c.width = DK.w; c.height = DK.h; const x = c.getContext('2d'); x.translate(-DK.x, -DK.y); return [c, x]; };
  const [dc, ctx] = mk();
  const deck = () => { ctx.beginPath(); ctx.moveTo(-80, WB + 6); ctx.lineTo(BOW[0] - 30, BOW[1] + 6); ctx.quadraticCurveTo(BOW[0], BOW[1] - 6, BOW[0] + 30, BOW[1] + 6); ctx.lineTo(W + 80, WB + 6); ctx.closePath(); };
  deck(); const g = ctx.createLinearGradient(0, BOW[1], 0, WB); g.addColorStop(0, '#07090a'); g.addColorStop(.55, '#1a150e'); g.addColorStop(1, '#46321a'); ctx.fillStyle = g; ctx.fill();
  // bulwark + rails along both edges (perspective posts)
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const e0 = [540 + sd * 620, WB - 4], e1 = [BOW[0] + sd * 26, BOW[1] + 2], r0 = [540 + sd * 620, WB - 64], r1 = [BOW[0] + sd * 20, BOW[1] - 14];
    ctx.strokeStyle = '#0a0d0e'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.stroke();
    ctx.strokeStyle = '#11171a'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]);
    for (let k = 0; k <= 9; k++) { const u = 1 - Math.pow(1 - k / 9, 1.8), a = [lerp(e0[0], e1[0], u), lerp(e0[1], e1[1], u)], b = [lerp(r0[0], r1[0], u), lerp(r0[1], r1[1], u)]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    ctx.strokeStyle = rgba(COL.amber, .28); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r0[0], r0[1] - 1); ctx.lineTo(lerp(r0[0], r1[0], .55), lerp(r0[1], r1[1], .55) - 1); ctx.stroke();
  }
  // deck fittings: capstan, two bollard pairs, hatch
  ctx.fillStyle = '#0b0e0f';
  for (const [bx, by, rw, rh] of [[540, 958, 26, 9], [452, 992, 14, 6], [474, 994, 14, 6], [606, 992, 14, 6], [628, 994, 14, 6]]) { ctx.beginPath(); ctx.ellipse(bx, by, rw, rh, 0, 0, TAU); ctx.fill(); ctx.fillRect(bx - rw * .7, by - rh * 2.4, rw * 1.4, rh * 2.4); }
  ctx.fillStyle = 'rgba(255,190,110,.18)'; for (const bx of [540, 452, 474, 606, 628]) ctx.fillRect(bx - 6, bx === 540 ? 936 : 979, 12, 2);
  ctx.fillStyle = '#0c1011'; ctx.beginPath(); ctx.moveTo(470, 1030); ctx.lineTo(610, 1030); ctx.lineTo(590, 1010); ctx.lineTo(490, 1010); ctx.closePath(); ctx.fill();
  // foremast
  ctx.strokeStyle = '#0b0f10'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(540, BOW[1] + 2); ctx.lineTo(540, 808); ctx.moveTo(526, 828); ctx.lineTo(554, 828); ctx.stroke();
  // deck floods (below the sill, out of view): their warm pools — a separate additive layer
  const [fc, fx] = mk();
  for (const px of [262, 818]) { LM.glow(fx, px, WB + 10, 300, COL.amber, .22); LM.glow(fx, px, WB - 6, 90, COL.warm, .3); }
  return (_deck = [dc, fc]);
}
function foredeck(ctx, t) {
  const [dc, fc] = deckCache();
  ctx.drawImage(dc, DK.x, DK.y);
  LM.glow(ctx, 540, 806, 26, '#ffffff', .75); LM.glow(ctx, 540, 806, 70, '#cfe6ea', .16);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fc, DK.x, DK.y); ctx.restore();
}
// green water at the bow: a white sheet of spray bursts up over the bow, breaks into mist and blows aft toward the glass
function bowSpray(ctx, t) {
  BURSTS.forEach((b, bi) => {
    const u = t - b, k = BK[bi]; if (u < -.05 || u > 1.9) return;
    const uu = Math.max(0, u), env = k * clamp(u * 7) * Math.pow(clamp(1 - uu / 1.9), 1.2);
    // the sheet: soft columns of white water rising off the bow (stretched glows), collapsing as it blows back
    const rise = Math.sin(Math.PI * clamp(uu / .95)), hw = 60 + 400 * E.outC(clamp(uu / .8)), H0 = 250 * rise * (.75 + .25 * k);
    if (H0 > 6) {
      const base = BOW[1] + 16 + 70 * uu, r = Math.max(34, hw * .2);
      for (let i = 0; i < 9; i++) {
        const x = i / 4 - 1, hgt = H0 * Math.pow(1 - x * x * .9, .6) * (.65 + .35 * hi(i * 7 + bi * 13)), cxp = BOW[0] + x * hw + 10 * Math.sin(t * 3 + i);
        ctx.save(); ctx.translate(cxp, base - hgt * .45); ctx.scale(1, hgt / r * .55);
        LM.glow(ctx, 0, 0, r, i % 3 ? '#dfeced' : '#f0dcc0', .4 * env * (.7 + .3 * hi(i * 3 + bi)));
        ctx.restore();
      }
    }
    // mist blowing aft (down the frame, spreading)
    for (let j = 0; j < 2; j++) {
      const sd = (j - .5) * 1.2 + (hi(j * 5 + bi * 11) - .5) * .4, px = BOW[0] + sd * (40 + 300 * uu), py = BOW[1] - 90 * Math.sin(Math.PI * clamp(uu / 1.2)) + 120 * uu * uu;
      LM.glow(ctx, px, py, Math.min(270, 110 + 200 * uu), j ? '#d8e8ea' : '#e6d6bc', .3 * env);
    }
    // a few heavy droplets arcing out of the sheet
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let j = 0; j < 26; j++) {
      const sd = hi(j * 7 + bi) - .5, vx = sd * 760 * (.4 + hi(j * 3 + bi * 5)), vy = 380 + 420 * hi(j * 11 + bi), g = 900 * (1 + .4 * hi(j));
      const pos = w => [BOW[0] + sd * 120 + vx * w, BOW[1] + 10 - vy * w + g * w * w];
      const life = .7 + .5 * hi(j * 17), a = k * clamp(u * 10) * Math.pow(clamp(1 - uu / life), 1.2); if (a <= .01) continue;
      const p1 = pos(uu), p0 = pos(Math.max(0, uu - .025)); if (p1[1] > WB + 40) continue;
      ctx.strokeStyle = rgba('#e3f1f3', .35 * a); ctx.lineWidth = 1.6 + 2.4 * hi(j * 5 + bi);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1] + .1); ctx.stroke();
    }
    ctx.restore();
  });
}
// salt spray on the glass: droplets that land with each burst, then run down and dry off (sprites: cold / warm-lit)
const _drop = {};
function dropSpr(warm) {
  const k = warm ? 'w' : 'c'; if (_drop[k]) return _drop[k];
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = 'rgba(11,21,23,.55)'; x.beginPath(); x.arc(16, 17.5, 12, 0, TAU); x.fill();
  x.strokeStyle = warm ? 'rgba(255,201,138,.4)' : 'rgba(169,200,206,.36)'; x.lineWidth = 2; x.beginPath(); x.arc(16, 16, 12, 0, TAU); x.stroke();
  x.fillStyle = warm ? 'rgba(255,226,184,.8)' : 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(12, 11.5, 4, 0, TAU); x.fill();
  return (_drop[k] = c);
}
function droplets(ctx, t) {
  ctx.save();
  const N = 170, dc = dropSpr(false), dw = dropSpr(true);
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    let bi = i % 4, bt = BURSTS[bi] + HIT + .1 * hi(i * 5 + 1), u = t - bt;
    if (u < 0) { if (bi === 0) continue; u += 4.5; }                 // the older generation still on the glass
    if (u > 4.6) continue;
    if (BK[bi] < .7 && hi(i * 3 + 9) > .55) continue;
    const x = hi(i * 7 + 3) * W, y0 = WT + 16 + hi(i * 11 + 5) * (WB - WT - 30);
    const r = 1.4 + 6 * Math.pow(hi(i * 13 + 7), 2.4), runs = r > 4.2;
    const yy = y0 + 5 * u + (runs ? 34 * u * u : 0), xx = x + 16 * u * (hi(i * 17) - .25);
    const a = clamp(u * 14) * clamp(1 - u / 4.6);
    if (runs) { ctx.globalAlpha = .09 * a; ctx.strokeStyle = '#9fbcc2'; ctx.lineWidth = r * .7; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(xx, yy - r); ctx.stroke(); }
    ctx.globalAlpha = a; ctx.drawImage(yy > 900 ? dw : dc, xx - r * 1.33, yy - r * 1.33, r * 2.67, r * 2.67);
  }
  ctx.restore();
  // the slap: a white haze sheet over the glass (one gradient)
  BURSTS.forEach((b, bi) => {
    const u = t - b - HIT; if (u < 0 || u > 1) return; const k = BK[bi] * Math.exp(-u * 5.5);
    const cx = 300 + 480 * hi(bi * 3), cy = 700, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 620);
    g.addColorStop(0, rgba('#e0eef0', .4 * k)); g.addColorStop(.45, rgba('#d8ecef', .16 * k)); g.addColorStop(1, rgba('#d8ecef', 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - 620, WT, 1240, WB - WT); ctx.restore();
  });
}
// ---------------- the bridge interior frame ----------------
function frame(ctx, t) {
  ctx.save();
  // ceiling + header beam
  ctx.fillStyle = '#020506'; ctx.fillRect(-60, -60, W + 120, WT + 60);
  ctx.fillStyle = '#081013'; ctx.fillRect(-60, WT - 22, W + 120, 22); ctx.fillStyle = 'rgba(140,175,185,.12)'; ctx.fillRect(-60, WT - 2, W + 120, 2);
  // raked posts
  for (const px of POSTS) {
    const tx = px + (px - 540) * .07;
    ctx.fillStyle = '#04080a'; ctx.beginPath(); ctx.moveTo(tx - 15, WT - 4); ctx.lineTo(tx + 15, WT - 4); ctx.lineTo(px + 19, WB); ctx.lineTo(px - 19, WB); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,185,195,.13)'; ctx.lineWidth = 2; const sd = px < 540 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(tx + sd * 15, WT); ctx.lineTo(px + sd * 19, WB); ctx.stroke();
  }
  // sill
  ctx.fillStyle = '#071012'; ctx.fillRect(-60, WB - 4, W + 120, 26); ctx.fillStyle = 'rgba(255,200,130,.16)'; ctx.fillRect(-60, WB - 4, W + 120, 2);
  // console: far face + top surface
  ctx.fillStyle = '#05090b'; ctx.fillRect(-60, WB + 22, W + 120, 40);
  const g = ctx.createLinearGradient(0, WB + 62, 0, 1240); g.addColorStop(0, '#0c1416'); g.addColorStop(1, '#030607'); ctx.fillStyle = g; ctx.fillRect(-60, WB + 62, W + 120, 1300 - WB);
  ctx.fillStyle = 'rgba(150,190,200,.1)'; ctx.fillRect(-60, WB + 62, W + 120, 2);
  // reflections of the console screens in the glass (faint)
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(95,200,190,.035)'; roundRect(ctx, 470, 928, 140, 60, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,179,71,.03)'; roundRect(ctx, 250, 940, 90, 40, 6); ctx.fill(); roundRect(ctx, 740, 936, 90, 40, 6); ctx.fill();
  ctx.restore();
}
function consoleGear(ctx, t, eng) {
  ctx.save();
  // radar/plot screen between them: dark disc with range rings and a rotating sweep
  const rc = [540, 1124];
  ctx.fillStyle = '#081a1b'; roundRect(ctx, rc[0] - 60, rc[1] - 30, 120, 60, 9); ctx.fill(); ctx.strokeStyle = 'rgba(120,200,190,.28)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(rc[0], rc[1]); ctx.scale(1, .45);
  ctx.strokeStyle = 'rgba(110,220,200,.28)'; ctx.lineWidth = 2; for (const r of [18, 36, 54]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
  const sw = t * 2.4;
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 10; k++) { ctx.fillStyle = `rgba(110,230,205,${.18 * (1 - k / 10)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 54, sw - (k + 1) * .07, sw - k * .07); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  LM.glow(ctx, rc[0], rc[1], 150, '#5fd0c0', .13);
  // indicator lights along the console's far face
  for (let i = 0; i < 18; i++) {
    const x = 70 + i * 54 + (i > 8 ? 30 : 0); if (Math.abs(x - 540) < 120) continue;
    const on = hi(Math.floor(t * (1 + hi(i) * 2)) * 7 + i) > .3, c = i % 5 === 2 ? '#7be08a' : COL.amber;
    ctx.fillStyle = rgba(c, on ? .65 : .18); ctx.fillRect(x, 1080, 8, 4);
  }
  ctx.restore();
}
// a thruster lever on the console; push 0..1 shoves the knob forward (up the frame); thrust bar on the console face above
function lever(ctx, x, y, push, t) {
  const kx = x, ky = y - 34 - 30 * push;
  ctx.save(); ctx.lineCap = 'round';
  // thrust demand bar (segments light amber left -> right)
  const n = 7, lit = .6 + 6.4 * push + .3 * Math.sin(t * 9) * push;
  for (let k = 0; k < n; k++) { const on = k < lit; ctx.fillStyle = on ? rgba(k > 4 ? '#ffd27a' : COL.amber, .95) : 'rgba(55,66,68,.6)'; ctx.fillRect(x - 38 + k * 11, 1072, 8, 12); }
  ctx.fillStyle = '#0a1012'; roundRect(ctx, x - 26, y - 8, 52, 20, 6); ctx.fill(); ctx.fillStyle = 'rgba(150,190,200,.18)'; ctx.fillRect(x - 26, y - 8, 52, 2);
  ctx.fillStyle = '#020405'; ctx.fillRect(x - 4, y - 32, 8, 30);
  ctx.strokeStyle = '#1c2629'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = 'rgba(170,205,215,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(kx - 3, ky + 4); ctx.stroke();
  ctx.fillStyle = '#27302f'; roundRect(ctx, kx - 15, ky - 7, 30, 14, 6); ctx.fill();
  ctx.restore();
  LM.glow(ctx, x, 1078, 70 + 40 * push, COL.amber, .16 + .3 * push);
  return [kx, ky];
}
// ---------------- an officer from behind: plain dark head, jacket, arms forward to the console (no features) ----------------
// O = {x, y (base of the neck), s, side (+1: the lever hand is on his right)}; hands = [left hand, right hand] (screen)
function officer(ctx, O, hands, o) {
  const { x, y, s } = O, tilt = o.tilt || 0, ct = Math.cos(tilt), st = Math.sin(tilt);
  const wp = (u, v) => [x + (u * ct - v * st) * s, y + (u * st + v * ct) * s];
  const arms = [[wp(-112, 78), hands[0], -1], [wp(112, 78), hands[1], 1]].map(([sh, hd, sd]) => {
    const inner = sd === O.side, el = [sh[0] + sd * (inner ? 16 : 34) * s, sh[1] + (inner ? 150 : 140) * s];
    return [sh, el, hd];
  });
  const body = (c) => {
    c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s, s);
    c.beginPath();
    c.moveTo(-30, -16); c.quadraticCurveTo(-42, 4, -80, 20); c.quadraticCurveTo(-120, 34, -134, 68); c.quadraticCurveTo(-148, 104, -144, 160); c.lineTo(-134, 1100); c.lineTo(134, 1100);
    c.lineTo(144, 160); c.quadraticCurveTo(148, 104, 134, 68); c.quadraticCurveTo(120, 34, 80, 20); c.quadraticCurveTo(42, 4, 30, -16); c.quadraticCurveTo(0, -26, -30, -16); c.closePath(); c.fill();
    c.fillRect(-19, -34, 38, 30);                                                                        // neck
    c.beginPath(); c.ellipse(0, -66, 39, 48, 0, 0, TAU); c.fill();                                       // head (back of)
    c.beginPath(); c.ellipse(-38, -60, 7, 13, .15, 0, TAU); c.ellipse(38, -60, 7, 13, -.15, 0, TAU); c.fill();   // ears
    c.restore();
  };
  const limbs = (c) => {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [sh, el, hd] of arms) {
      c.lineWidth = 56 * s; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(el[0], el[1]); c.stroke();
      c.lineWidth = 42 * s; c.beginPath(); c.moveTo(el[0], el[1]); c.lineTo(hd[0], hd[1]); c.stroke();
      c.beginPath(); c.ellipse(hd[0], hd[1], 21 * s, 16 * s, 0, 0, TAU); c.fill();
    }
  };
  const all = (c, col) => { c.fillStyle = c.strokeStyle = col; limbs(c); body(c); };
  const rA = o.rimA, rc = o.rimC || COL.amber;
  // rims: warm from the deck floods ahead (head + shoulders; fades down the back), a hint of the radar's cyan on the inner side
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 400 * s, y - 220 * s, 800 * s, 330 * s); ctx.clip();
  ctx.globalAlpha = .3 * rA; ctx.save(); ctx.translate(0, -5); all(ctx, rc); ctx.restore();
  ctx.globalAlpha = .85 * rA; ctx.save(); ctx.translate(0, -2.2); all(ctx, LM.mix(rc, '#fff1dc', .35)); ctx.restore();
  ctx.globalAlpha = .5 * rA; ctx.save(); ctx.translate(-O.side * 2.4, -.8); all(ctx, LM.mix(rc, '#fff1dc', .2)); ctx.restore();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = .4; ctx.translate(O.side * 2.4, 1.2); ctx.fillStyle = ctx.strokeStyle = '#5fb8b0'; limbs(ctx); ctx.restore();
  ctx.save(); all(ctx, '#020405'); ctx.restore();
  // the back of the jacket catches a hint of light (seam, collar)
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  ctx.strokeStyle = rgba(rc, .16 * rA); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-28, -12); ctx.quadraticCurveTo(0, -4, 28, -12); ctx.stroke();
  ctx.restore();
}
// ---------------- inset chart: crosshair over the site, the drifted ship, the return arc ----------------
function bez(F, C, Q, u) { const v = 1 - u; return [v * v * F[0] + 2 * u * v * C[0] + u * u * Q[0], v * v * F[1] + 2 * u * v * C[1] + u * u * Q[1]]; }
function chart(ctx, t, o) {
  const { x, y, w, h } = MAP, a = o.a; if (a <= .01) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(-26 * (1 - o.inn), 0);
  ctx.fillStyle = '#0a0e10'; roundRect(ctx, x - 12, y - 12, w + 24, h + 24, 14); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,210,.24)'; ctx.lineWidth = 2; ctx.stroke();
  roundRect(ctx, x, y, w, h, 6); ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#071a1d'); g.addColorStop(1, '#020808'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(HUD, .07); ctx.lineWidth = 1; ctx.beginPath();
  for (let gx = x + 14; gx < x + w; gx += 28) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); } for (let gy = y + 10; gy < y + h; gy += 28) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } ctx.stroke();
  const S = [x + w * .28, y + h * .58], F = [x + w * .84, y + h * .72], C = [x + w * .74, y + h * .08], Q = [x + w * .33, y + h * .5];
  // the site: ghost of the structure + crosshair
  LM.structure(ctx, S[0], S[1], .085, t, { view: 'top', amb: .6, ambColor: '#7fb8c0', a: .32 });
  ctx.lineCap = 'round'; ctx.strokeStyle = rgba(HUD, .3); ctx.lineWidth = 1.5; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 14; ctx.beginPath();
  ctx.moveTo(x, S[1]); ctx.lineTo(S[0] - 22, S[1]); ctx.moveTo(S[0] + 22, S[1]); ctx.lineTo(x + w, S[1]); ctx.moveTo(S[0], y); ctx.lineTo(S[0], S[1] - 22); ctx.moveTo(S[0], S[1] + 22); ctx.lineTo(S[0], y + h); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = rgba(HUD, .7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(S[0], S[1], 16, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(HUD, .18); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(S[0], S[1], 74, 0, TAU); ctx.stroke();
  ctx.beginPath(); for (let k = 0; k < 36; k++) { const q = k / 36 * TAU + t * .1, l = k % 3 ? 4 : 9; ctx.moveTo(S[0] + Math.cos(q) * 74, S[1] + Math.sin(q) * 74); ctx.lineTo(S[0] + Math.cos(q) * (74 - l), S[1] + Math.sin(q) * (74 - l)); } ctx.stroke();
  ctx.fillStyle = rgba(HUD, .95); ctx.beginPath(); ctx.arc(S[0], S[1], 3.5, 0, TAU); ctx.fill();
  const near = o.ret > .55 ? P(o.ret, .55, .9) : 0;
  if (near > 0) { const q = (t * 1.3) % 1; ctx.strokeStyle = rgba('#e8f6ff', .5 * near * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S[0], S[1], 16 + q * 60, 0, TAU); ctx.stroke(); }
  // drift: red dashed from the site to where the ship ended up
  if (o.drift > 0) {
    const e = [lerp(S[0], F[0], o.drift), lerp(S[1], F[1], o.drift)], da = 1 - .45 * o.ret;
    ctx.strokeStyle = rgba(COL.red, .85 * da); ctx.lineWidth = 3; ctx.setLineDash([11, 8]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.setLineDash([]);
    const ang = Math.atan2(F[1] - S[1], F[0] - S[0]);
    if (o.drift > .3) { ctx.save(); ctx.fillStyle = rgba(COL.red, .9 * da); ctx.translate(e[0] - Math.cos(ang) * 24, e[1] - Math.sin(ang) * 24); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-9, -8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }
  // the return arc (amber track behind the ship)
  const u = o.ret, B = bez(F, C, Q, u);
  if (u > .005) {
    ctx.lineJoin = 'round';
    for (const [lw, aa] of [[9, .14], [3.5, .95]]) { ctx.strokeStyle = rgba(COL.amber, aa); ctx.lineWidth = lw; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const p = bez(F, C, Q, u * k / 40); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
  }
  // ship icon heading along the track
  const d1 = bez(F, C, Q, Math.min(1, u + .01)), d0 = bez(F, C, Q, Math.max(0, u - .01)), hd = Math.atan2(d1[1] - d0[1], d1[0] - d0[0]);
  const pr = (t * 1.6) % 1; ctx.strokeStyle = rgba(COL.amber, .6 * (1 - pr)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(B[0], B[1], 12 + pr * 26, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(B[0], B[1]); ctx.rotate(hd); ctx.fillStyle = '#fff4e2'; ctx.beginPath(); ctx.moveTo(19, 0); ctx.quadraticCurveTo(10, -8, 2, -8); ctx.lineTo(-16, -8); ctx.lineTo(-16, 8); ctx.lineTo(2, 8); ctx.quadraticCurveTo(10, 8, 19, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.restore();
  LM.glow(ctx, B[0] - 26 * (1 - o.inn), B[1], 60, COL.amber, .45 * a);
}

window.PK.scenes.bridge = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tMean = at('그사이', .02), tCap = at('선장과', .12), tMate = at('항해사는', .24), tShip = at('배를', .41);
  const tSelf = at('직접', .55), tDrive = at('몰아', .62), tBack = at('되돌아오고', .67), tWas = at('있었습니다', .78);

  // ---- story values ----
  const pushC = E.outBack(P(t, tSelf - .14, tSelf + .3)), pushM = E.outBack(P(t, tDrive - .12, tDrive + .3));
  const eng = P(t, tDrive - .15, tDrive + .25) * (1 - .35 * P(t, tWas, d));                 // engine surge
  const turn = P(t, tDrive - .2, d + .6, E.inOutQ);
  const ret = .9 * P(t, tBack - .25, d + .25, E.inOutQ);

  // ---- ship motion (the outside moves; the bridge is the camera's frame) ----
  let pitch = 30 * Math.sin(t * 1.05 + .8) + 11 * Math.sin(t * 2.2 + 2);
  let roll = .052 * Math.sin(t * .92 + .3) + .018 * Math.sin(t * 1.95 + 1) + .03 * turn;
  BURSTS.forEach((b, i) => { const u = t - b + .25; if (u > 0 && u < 2) pitch -= 34 * BK[i] * Math.sin(Math.min(Math.PI, u * 2.6)) * Math.exp(-u * .6); });
  const yaw = 30 * t + 1500 * turn;

  // ---- camera (handheld + impacts + engine vibration), leaning in on '직접' ----
  let jx = 0, jy = 0;
  BURSTS.forEach((b, i) => { const j = LM.jolt(t, b + HIT, .8 * BK[i]); jx += j.x; jy += j.y; });
  const jd = LM.jolt(t, tDrive, .6); jx += jd.x; jy += jd.y;
  const sk = LM.shake(t, .3 + .35 * eng, 7), vib = eng * 2.2 * Math.sin(t * 47), vib2 = eng * 1.6 * Math.sin(t * 41 + 1);
  const dr = { x: fb(t * .35, 61) * 10, y: fb(t * .3, 62) * 8, r: fb(t * .25, 63) * .004 };
  const z = 1.0 + .16 * (1 - P(t, -.1, .95, E.outC)) + .025 * P(t, -.2, d + .2) + .055 * P(t, tSelf - .1, tSelf + .7, E.outC) + .012 * Math.exp(-Math.max(0, t) * 4);
  const cx = 540 + dr.x + sk.x + jx + vib, cy = 1000 + dr.y + sk.y + jy + vib2;

  // ---- draw (camera space) ----
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(dr.r + sk.r); ctx.scale(z, z); ctx.translate(-540, -1000);
  outside(ctx, t, pitch, roll, yaw);
  foredeck(ctx, t);
  bowSpray(ctx, t);
  droplets(ctx, t);
  frame(ctx, t);
  consoleGear(ctx, t, eng);
  // levers in front of the officers (the inner hands), rails for the outer hands
  const jig = (s2) => .05 * Math.sin(t * 2.3 + s2) * (1 - pushC);
  const kC = lever(ctx, 448, 1118, clamp(.1 + jig(0) + .9 * pushC), t), kM = lever(ctx, 632, 1116, clamp(.08 + jig(2) + .92 * pushM), t);
  ctx.save(); ctx.strokeStyle = '#121a1d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(30, 1118); ctx.lineTo(220, 1115); ctx.moveTo(860, 1115); ctx.lineTo(1050, 1118); ctx.stroke(); ctx.restore();
  // the officers sway against the roll; each catches the light on his word
  const capA = .42 + .58 * Math.exp(-Math.pow((t - tCap - .3) / .45, 2)) + .2 * pushC, mateA = .42 + .58 * Math.exp(-Math.pow((t - tMate - .35) / .5, 2)) + .2 * pushM;
  const leanC = 6 * pushC, leanM = 6 * pushM;
  officer(ctx, Object.assign({}, MATE, { y: MATE.y - leanM }), [kM, [930, 1112 + 2 * Math.sin(t * 1.3)]], { tilt: -roll * .45 + .02 * Math.sin(t * 1.1 + 2), rimA: mateA });
  officer(ctx, Object.assign({}, CAPT, { y: CAPT.y - leanC }), [[150, 1114 + 2 * Math.sin(t * 1.2)], kC], { tilt: -roll * .45 + .02 * Math.sin(t * 1.2), rimA: capA });
  ctx.restore();

  // flash of contrast on the cut
  if (t < .5) L.flash(ctx, .14 * Math.exp(-Math.max(0, t) * 7), '#dceef2');
  LM.subBand(ctx, .82);

  // ---- overlays (screen space) ----
  // role labels (from the narration)
  const outL = 1 - P(t, tShip - .1, tShip + .25);
  const lc = P(t, tCap - .05, tCap + .2, E.outQ) * outL, lm = P(t, tMate - .05, tMate + .2, E.outQ) * outL;
  if (lc > 0) { const hx = (CAPT.x - 540) * z + cx, hy = (CAPT.y - 118 - leanC - 1000) * z + cy; PK.chip(ctx, '선장', hx, hy - 30, lc, { size: 28, color: '#ffe6c8', border: 'rgba(255,200,130,.5)' }); }
  if (lm > 0) { const hx = (MATE.x - 540) * z + cx, hy = (MATE.y - 116 - leanM - 1000) * z + cy; PK.chip(ctx, '항해사', hx, hy - 30, lm, { size: 28, color: '#ffe6c8', border: 'rgba(255,200,130,.5)' }); }
  // the chart
  const mapIn = P(t, tShip - .1, tShip + .25, E.outC), mapA = mapIn * (1 - .3 * P(t, tWas, tWas + .4));
  chart(ctx, t, { a: mapA, inn: mapIn, drift: P(t, tShip + .02, tShip + .45, E.inOutQ), ret });
  const dA = P(t, tShip + .22, tShip + .45, E.outQ) * (1 - P(t, tWas - .05, tWas + .2));
  PK.chip(ctx, D.drift || '', MAP.x + MAP.w / 2, MAP.y + MAP.h + 44, dA, { size: 27, color: '#ffd9d2', border: 'rgba(227,38,47,.55)' });
  // the ROV feed
  const on = P(t, tWas - .12, tWas + .3);
  if (on > 0) {
    ctx.save(); ctx.globalAlpha = P(t, tWas - .12, tWas + .02);
    LM.rovFeed(ctx, ROV.x, ROV.y, ROV.w, ROV.h, t, { on, found: P(t, tWas + .1, tWas + .6, E.inOutQ), lock: P(t, tWas + .35, tWas + .85), life: .6, tx: .5, ty: .6, seed: 6 });
    ctx.restore();
    PK.chip(ctx, D.rov || '', 540, ROV.y + ROV.h + 44, P(t, tWas + .2, tWas + .45, E.outQ), { size: 27, color: '#e8f6ff', border: 'rgba(160,220,255,.45)' });
  }
  // data.manual: first half on '직접', the rest on '되돌아오고'
  const man = (D.manual || '').split(' · ');
  const m1 = P(t, tSelf - .08, tSelf + .14, E.outQ);
  if (m1 > 0) {
    const s = lerp(.86, 1, E.outBack(P(t, tSelf - .08, tSelf + .3)));
    ctx.save(); ctx.translate(540, 1180); ctx.scale(s, s); PK.chip(ctx, man[0], 0, 0, m1, { size: 34, color: '#ffffff', border: 'rgba(255,190,110,.65)' }); ctx.restore();
  }
  const m2 = P(t, tBack, tBack + .25);
  if (m2 > 0 && man[1]) text(ctx, L.typeSub(man[1], P(t, tBack, tBack + .4)), 540, 1230, { size: 26, weight: 800, color: '#cfe8ff', alpha: m2, stroke: 'rgba(0,0,0,.7)', strokeW: 6 });
  void tMean;
};
})();
