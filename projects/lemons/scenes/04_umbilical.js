// umbilical (13.96-20.52): "숨 쉴 기체도, 온수도, 빛과 통신도, 모두 다이빙 벨과 이어진 줄 하나에 달렸습니다."
// A) Cutaway of the umbilical: the braided, taped line comes down from above (from the bell) and ends in a cut face seen
//    slightly from below: jacket, filler, white strength member at the core, the gas hose, the hot-water hose, the power /
//    light / video cables and the comms cable. Each channel ignites on its word (white flash -> its own colour, a flow
//    stripe starts running DOWN the line inside the jacket) and gets its label from info.sc.data (gas, water, power, comms).
//    On "모두" one bright pulse runs down the whole line into the face and everything flares together.
// B) On "다이빙 벨과 이어진" the camera pulls back (log zoom ~29x -> 1x, rotating so the cut face lands ON the line): the
//    cross-section shrinks into a point of the single umbilical hanging from the bell (upper right) down to Lemons' helmet
//    (standing on the dark top deck). Pulses of light run down it; a trace runs bell -> helmet on "이어진" and his lamp
//    brightens as it arrives; data.name on "줄 하나에". On "달렸습니다" everything else dims and the camera eases in on the
//    one line, which keeps pulsing — fragile, alone in the black water.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const { at } = window.PK;
const LM = window.PK.LM, COL = LM.COL, hi = LM.hi, mix = LM.mix;
const TAU = Math.PI * 2;

// ---------------- A: cross-section geometry (A-local = screen at rest) ----------------
const C = [540, 905], R = 232, K = .7, VP = [540, -1250], TOPY = -140;
const CHS = [
  { k: 'gas', x: -.40, y: -.30, r: .25, w: .07, hose: '#262c2f', glow: '#cfeeff', word: '기체도', side: -1, top: true },
  { k: 'water', x: .30, y: -.27, r: .30, w: .075, hose: '#7e3424', glow: '#ffa057', word: '온수도', side: 1, top: true },
  { k: 'power', x: .40, y: .37, r: .1, cab: [[-.11, -.06], [.11, -.06], [0, .12]], hose: '#34597c', glow: '#ffe08a', word: '빛과', side: 1, top: false },
  { k: 'comms', x: -.31, y: .45, r: .12, cab: [[0, 0]], hose: '#2d4c45', glow: '#8ff0cc', word: '통신도', side: -1, top: false },
];
const SM = { x: -.04, y: .12, r: .17 };                 // strength member (core rope, unlabeled)
const fp = (x, y) => [C[0] + x * R, C[1] + y * R * K];   // face-local -> A space
// body half-width at A-space y (perspective toward VP)
const bodyAt = y => { const f = (C[1] - y) / (C[1] - VP[1]); return { cx: lerp(C[0], VP[0], f), hw: R * (1 - f) }; };

// ---------- cached sprites: the tube body and the cut face (static), drawn once ----------
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // body: A-space region x 0..1080, y TOPY..C.y
  const bw = 1080, bh = Math.ceil(C[1] - TOPY) + 4, body = mk(bw, bh), b = body.getContext('2d');
  b.translate(0, -TOPY);
  const top = bodyAt(TOPY);
  const sil = () => { b.beginPath(); b.moveTo(C[0] - R, C[1]); b.lineTo(top.cx - top.hw, TOPY); b.lineTo(top.cx + top.hw, TOPY); b.lineTo(C[0] + R, C[1]); b.closePath(); };
  sil(); const base = mix('#050606', COL.umb, .42);
  const g = b.createLinearGradient(C[0] - R, 0, C[0] + R, 0);
  g.addColorStop(0, mix(base, '#000000', .78)); g.addColorStop(.18, mix(base, '#000000', .3)); g.addColorStop(.36, mix(base, '#fff0cc', .12)); g.addColorStop(.55, base); g.addColorStop(.85, mix(base, '#000000', .62)); g.addColorStop(1, mix(base, '#000000', .85));
  b.fillStyle = g; b.fill();
  b.save(); sil(); b.clip();
  // braid: rings of slanted strands, perspective-spaced
  for (let s = 0; s < 400; s++) {
    const y = VP[1] + (C[1] - VP[1]) / (1 + s * .045); if (y < TOPY - 10) break;
    const { cx, hw } = bodyAt(y), ry = hw * .28, st = Math.max(3, hw * .05);
    b.lineWidth = Math.max(.8, hw * .012);
    for (let q = -1; q <= 1.0001; q += .14) {
      const xx = cx + q * hw * .98, yy = y + Math.sqrt(Math.max(0, 1 - q * q)) * ry;
      b.strokeStyle = (s + Math.round(q * 7)) % 2 ? 'rgba(0,0,0,.32)' : 'rgba(255,236,190,.07)';
      b.beginPath(); b.moveTo(xx - st, yy - st * .7); b.lineTo(xx + st, yy + st * .7); b.stroke();
    }
  }
  // black tape bands
  for (const s of [3, 11, 23, 41, 70, 118]) {
    const y = VP[1] + (C[1] - VP[1]) / (1 + s * .045); if (y < TOPY) continue; const { cx, hw } = bodyAt(y), ry = hw * .28, th = hw * .16;
    b.fillStyle = 'rgba(6,8,8,.92)'; b.beginPath(); b.ellipse(cx, y, hw + 1, ry, 0, 0, Math.PI); b.lineTo(cx - hw - 1, y - th); b.ellipse(cx, y - th, hw + 1, ry, 0, Math.PI, 0, true); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(200,225,230,.12)'; b.lineWidth = 1.5; b.beginPath(); b.ellipse(cx, y - th, hw, ry, 0, .2, Math.PI - .2); b.stroke();
  }
  // soft key light on the left, cold rim on the right
  const kl = b.createLinearGradient(C[0] - R, 0, C[0] + R, 0); kl.addColorStop(0, 'rgba(255,240,210,0)'); kl.addColorStop(.3, 'rgba(255,240,210,.07)'); kl.addColorStop(.42, 'rgba(255,240,210,0)'); b.fillStyle = kl; b.fillRect(0, TOPY, bw, bh);
  b.restore();
  b.strokeStyle = 'rgba(143,200,224,.28)'; b.lineWidth = 2.5; b.beginPath(); b.moveTo(C[0] + R - 1, C[1]); b.lineTo(top.cx + top.hw - 1, TOPY); b.stroke();
  b.strokeStyle = 'rgba(255,230,190,.12)'; b.lineWidth = 2; b.beginPath(); b.moveTo(C[0] - R + 1, C[1]); b.lineTo(top.cx - top.hw + 1, TOPY); b.stroke();
  // fade the far end into the dark
  b.globalCompositeOperation = 'destination-out'; const ff = b.createLinearGradient(0, TOPY, 0, TOPY + 520); ff.addColorStop(0, 'rgba(0,0,0,1)'); ff.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = ff; b.fillRect(0, TOPY, bw, 520);

  // face: A-space box around C
  const fw = Math.ceil(R * 2 + 20), fh = Math.ceil(R * K * 2 + 20), face = mk(fw, fh), f = face.getContext('2d');
  f.translate(fw / 2 - C[0], fh / 2 - C[1]);
  const el = (x, y, r, fill) => { const [px, py] = fp(x, y); f.beginPath(); f.ellipse(px, py, r * R, r * R * K, 0, 0, TAU); if (fill) { f.fillStyle = fill; f.fill(); } };
  // jacket ring (braided)
  el(0, 0, 1, mix('#060706', COL.umb, .5));
  f.save(); el(0, 0, 1); f.clip();
  for (let i = 0; i < 160; i++) { const q = i / 160 * TAU; f.strokeStyle = i % 2 ? 'rgba(0,0,0,.4)' : 'rgba(255,236,190,.1)'; f.lineWidth = 3;
    f.beginPath(); f.moveTo(C[0] + Math.cos(q) * R * .87, C[1] + Math.sin(q) * R * K * .87); f.lineTo(C[0] + Math.cos(q + .06) * R, C[1] + Math.sin(q + .06) * R * K); f.stroke(); }
  f.restore();
  el(0, 0, .875, '#0c0e0d'); el(0, 0, .86, '#0a0c0b');
  // filler texture
  f.save(); el(0, 0, .86); f.clip();
  for (let i = 0; i < 260; i++) { const [px, py] = fp((hi(i * 3) - .5) * 1.8, (hi(i * 5) - .5) * 1.8); f.fillStyle = `rgba(${hi(i) > .5 ? '120,130,120' : '0,0,0'},${.06 + .1 * hi(i * 7)})`; f.beginPath(); f.arc(px, py, 1 + 3 * hi(i * 11), 0, TAU); f.fill(); }
  const fg = f.createRadialGradient(C[0] - R * .3, C[1] - R * .3, 10, C[0], C[1], R); fg.addColorStop(0, 'rgba(160,190,190,.08)'); fg.addColorStop(1, 'rgba(0,0,0,.25)'); f.fillStyle = fg; f.fillRect(C[0] - R, C[1] - R, 2 * R, 2 * R);
  f.restore();
  // strength member: white braided rope
  el(SM.x, SM.y, SM.r, '#3a3833');                     // 7-strand rope: 6 strands around a core
  for (let k = 0; k < 7; k++) {
    const q = k / 6 * TAU + .3, rr = k === 6 ? 0 : SM.r * .62, sx = SM.x + Math.cos(q) * rr, sy = SM.y + Math.sin(q) * rr, r1 = SM.r * .34;
    el(sx, sy, r1, '#a8a292'); const [px, py] = fp(sx, sy);
    f.fillStyle = 'rgba(255,250,235,.35)'; f.beginPath(); f.ellipse(px - r1 * R * .25, py - r1 * R * K * .25, r1 * R * .45, r1 * R * K * .4, 0, 0, TAU); f.fill();
    f.strokeStyle = 'rgba(40,36,30,.6)'; f.lineWidth = 1.5; f.beginPath(); f.ellipse(px, py, r1 * R, r1 * R * K, 0, 0, TAU); f.stroke();
  }
  // hoses and cables
  for (const ch of CHS) {
    if (!ch.cab) {
      el(ch.x, ch.y, ch.r, ch.hose);
      const [px, py] = fp(ch.x, ch.y); f.strokeStyle = 'rgba(255,255,255,.16)'; f.lineWidth = 2; f.beginPath(); f.ellipse(px, py, ch.r * R - 3, ch.r * R * K - 3, 0, 3.6, 5.4); f.stroke();
      el(ch.x, ch.y, ch.r - ch.w, '#040506');
      f.strokeStyle = 'rgba(0,0,0,.5)'; f.lineWidth = 2; f.beginPath(); f.ellipse(px, py, (ch.r - ch.w) * R, (ch.r - ch.w) * R * K, 0, 0, TAU); f.stroke();
    } else for (const [dx, dy] of ch.cab) {
      const cx = ch.x + dx, cy = ch.y + dy; el(cx, cy, ch.r, ch.hose); el(cx, cy, ch.r * .72, '#08090a');
      const [px, py] = fp(cx, cy); f.strokeStyle = 'rgba(255,255,255,.18)'; f.lineWidth = 1.5; f.beginPath(); f.ellipse(px, py, ch.r * R - 2, ch.r * R * K - 2, 0, 3.6, 5.4); f.stroke();
      for (let k = 0; k < 4; k++) { const q = k / 4 * TAU + .4, qx = px + Math.cos(q) * ch.r * R * .36, qy = py + Math.sin(q) * ch.r * R * K * .36; f.fillStyle = '#6a4a2a'; f.beginPath(); f.arc(qx, qy, ch.r * R * .17, 0, TAU); f.fill(); }
    }
  }
  // cut-face sheen + top rim
  f.save(); el(0, 0, 1); f.clip(); const sg = f.createLinearGradient(C[0] - R, C[1] - R * K, C[0] + R, C[1] + R * K); sg.addColorStop(0, 'rgba(220,240,245,.1)'); sg.addColorStop(.5, 'rgba(220,240,245,0)'); f.fillStyle = sg; f.fillRect(C[0] - R, C[1] - R, 2 * R, 2 * R); f.restore();
  f.strokeStyle = 'rgba(230,240,240,.35)'; f.lineWidth = 2.5; f.beginPath(); f.ellipse(C[0], C[1], R - 1, R * K - 1, 0, 3.3, 5.9); f.stroke();
  SPR = { body, face, fw, fh };
  return SPR;
}

// ---------------- labels ----------------
function chLabel(ctx, l1, l2, x, y, align, a, col, s) {
  if (a <= 0) return null; const s1 = 46, s2 = 30, w1 = measure(ctx, l1, s1, FONT.sub, 900), w2 = l2 ? measure(ctx, l2, s2, FONT.sub, 700) : 0, w = Math.max(w1, w2) + 60, h = l2 ? s1 + s2 + 34 : s1 + 28;
  const x0 = align === 'right' ? x - w : x;
  ctx.save(); ctx.translate(x0 + (align === 'right' ? w : 0), y + h / 2); ctx.scale(s, s); ctx.translate(-(x0 + (align === 'right' ? w : 0)), -(y + h / 2));
  ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(3,7,8,.86)'; roundRect(ctx, x0, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = rgba(col, .55); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = col; roundRect(ctx, x0 + 16, y + 14, 6, h - 28, 3); ctx.fill();
  ctx.globalAlpha = 1;
  text(ctx, l1, x0 + 36, y + 14 + s1 * .52, { size: s1, weight: 900, color: '#ffffff', align: 'left', alpha: a });
  if (l2) text(ctx, l2, x0 + 36, y + 22 + s1 + s2 * .52, { size: s2, weight: 700, color: mix(col, '#ffffff', .25), align: 'left', alpha: a });
  ctx.restore();
  return { x0, y, w, h };
}
function lead(ctx, x0, y0, x1, y1, a, col) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(col, .75); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 5, 0, TAU); ctx.fill(); ctx.restore();
}
function split2(s) { const i = s.indexOf(' ('); return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, '']; }

// ---------------- B: the single line from the bell to his helmet (B space = screen at zoom 1) ----------------
const BB = { bell: [806, 602], bellS: .62, st: [420, 1500], stS: .95, lem: [372], lemS: .6 };
const LEMO = { pose: 'stand', dir: -1, anchor: 'base', life: 1, lamp: .85, bpm: 64, lifeS: .9, bailout: true, rim: '#9fd0e4', light: [806, 602], halo: .26, idle: 1,
  adj: { na: [.7, .5], h: .2 } };
function geomB(t) {
  const bellO = { glow: 1, hatch: .8, lamps: .4, swing: .02 * Math.sin(t * .55), amb: .2, wireTop: -600 };
  const bell = LM.bell(null, BB.bell[0], BB.bell[1], BB.bellS, t, bellO);
  const st = LM.structure(null, BB.st[0], BB.st[1], BB.stS, t);
  const lem = LM.diver(null, BB.lem[0], st.topY + 3, BB.lemS, t, LEMO);
  const ex = bell.exit, um = lem.umb;
  const pts = [ex, [ex[0] - 6, ex[1] + 150], [ex[0] - 80, ex[1] + 290], [lerp(ex[0], um[0], .55), um[1] + 150], [um[0] + 70, um[1] + 70], um];
  return { bell, bellO, st, lem, pts };
}

window.PK.scenes.umbilical = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const tw = { gas: at(info, '기체도', .07), water: at(info, '온수도', .2), power: at(info, '빛과', .33), comms: at(info, '통신도', .38) };
  const tAll = at(info, '모두', .52), tDiv = at(info, '다이빙', .58), tBell = at(info, '벨과', .65), tCon = at(info, '이어진', .7), tLine = at(info, '줄', .76), tOne = at(info, '하나에', .79), tHang = at(info, '달렸습니다', .84);
  const sh = LM.shake(t, .35, 13);

  // ---- B geometry (static parts) + the match point on the line ----
  const G = geomB(t);
  const um0 = LM.umbilical(null, G.pts, t, { w: 16, sag: 20, sway: 4 });
  const iB = Math.floor(um0.pts.length * .2), PB = um0.pts[iB], PB2 = um0.pts[Math.max(0, iB - 4)];
  const tau = Math.atan2(PB2[1] - PB[1], PB2[0] - PB[0]);         // tangent toward the bell
  const rho0 = -Math.PI / 2 - tau, Z0 = R / 8;
  // pull back: log zoom Z0 -> 1, anchor C -> PB, rotation rho0 -> 0
  const u = P(t, tDiv - .12, tDiv + .9), e = E.inOutC(u);
  const push = E.inOutQ(P(t, tHang - .1, d + .2));
  const Z = Math.exp(Math.log(Z0) * (1 - e)) * (1 + .2 * push), rho = rho0 * (1 - e);
  const Q = [lerp(C[0], PB[0], e) + sh.x - 40 * push, lerp(C[1], PB[1], e) + sh.y - 30 * push];
  const aA = 1 - P(u, .5, .8), aB = P(u, .3, .58);
  const mB = new DOMMatrix().translate(Q[0], Q[1]).rotate(rho * 180 / Math.PI).scale(Z).translate(-PB[0], -PB[1]);
  const toS = p => { const q = mB.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };

  // ---- lights (screen space) for the water ----
  const aLights = [];
  for (const ch of CHS) { const lit = P(t, tw[ch.k] - .05, tw[ch.k] + .12); if (lit > 0) { const [px, py] = fp(ch.x, ch.y); aLights.push(LM.light(px, py, 420, ch.glow, .35 * lit * aA)); } }
  const bLights = aB > 0 ? G.bell.lights.slice(0, 2).concat(G.lem.lights) : [];     // (frame-lamp beams draw their own lit silt)
  const dimB = 1 - .3 * P(t, tHang, tHang + .8);
  const onS = (p, r) => p[0] > -r && p[0] < W + r && p[1] > -r && p[1] < H + r;
  const sLights = aLights.concat(bLights.map(L2 => { const p = toS([L2.x, L2.y]); return { x: p[0], y: p[1], r: Math.min(900, L2.r * Z), color: L2.color, a: L2.a * aB * dimB }; }).filter(L2 => L2.a > .01 && onS([L2.x, L2.y], L2.r)));
  LM.sea(ctx, t, { dark: .62, lights: sLights, seed: 8, snow: .8, murk: .8, haze: .8 * clamp((1.3 - Z) / .3), current: [-3, 2] });

  // =========================== B: the bell, the line, the diver ===========================
  if (aB > .01) {
    ctx.save(); ctx.globalAlpha = aB; ctx.setTransform(ctx.getTransform().multiply(mB));
    const lights = G.bell.lights.concat(G.lem.lights).map(L2 => Object.assign({}, L2, { a: L2.a * dimB }));
    if (onS(toS(BB.bell), 330 * BB.bellS * Z)) LM.bell(ctx, BB.bell[0], BB.bell[1], BB.bellS, t, Object.assign({}, G.bellO, { glow: (.8 + .2 * P(t, tBell - .1, tBell + .3)) * dimB, lamps: G.bellO.lamps * clamp((4 - Z) / 2.5) }));
    if (Z < 1.5) LM.structure(ctx, BB.st[0], BB.st[1], BB.stS, t, { lights, amb: .07 });
    // the line: pulses travel bell -> helmet; brighter from "이어진"
    const con = P(t, tCon - .1, tCon + .3);
    const um = LM.umbilical(ctx, G.pts, t, { w: 16, sag: 20, sway: 4, lit: .55 + .15 * con, pulse: .45 + .55 * con, pulseN: 3, pulseSpeed: 330, glow: .3 + .5 * con, tension: .08 * P(t, tHang, d) });
    // trace along the whole line on "이어진" (one line, bell -> helmet)
    const tr = P(t, tCon - .05, tCon + .55, E.inOutQ);
    if (tr > 0 && tr < 1) {
      const n = Math.floor(um.pts.length * tr), p = um.pts[Math.min(um.pts.length - 1, n)];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba('#fff1dc', .55); ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i <= n; i++) (i ? ctx.lineTo(um.pts[i][0], um.pts[i][1]) : ctx.moveTo(um.pts[i][0], um.pts[i][1])); ctx.stroke(); ctx.restore();
      LM.glow(ctx, p[0], p[1], 90, COL.warm, .8); LM.glow(ctx, p[0], p[1], 20, '#ffffff', 1);
    }
    // the diver: his lamp kicks brighter as the trace arrives
    const arrive = Math.exp(-Math.max(0, t - (tCon + .55)) * 3) * P(t, tCon + .45, tCon + .55);
    const lo = Object.assign({}, LEMO, { lamp: (.75 + .25 * arrive) * dimB + .1, a: 1, rimA: dimB });
    if (onS(toS(G.lem.chest), 330 * BB.lemS * Z)) LM.diver(ctx, BB.lem[0], G.st.topY + 3, BB.lemS, t, lo);
    if (arrive > .01) LM.glow(ctx, G.lem.umb[0], G.lem.umb[1], 70, COL.warm, .6 * arrive);
    ctx.restore();
  }

  // =========================== A: the cross-section ===========================
  if (aA > 0) {
    const S = sprites();
    const sA = Z / Z0, push0 = lerp(.965, 1.02, P(t, -.2, tDiv, E.inOutQ));
    ctx.save(); ctx.globalAlpha = aA;
    ctx.translate(Q[0], Q[1]); ctx.rotate(rho - rho0); ctx.scale(sA * push0, sA * push0); ctx.translate(-C[0], -C[1]);
    // halo behind the line
    LM.glow(ctx, C[0], C[1] - 120, 620, '#4a8a90', .16);
    ctx.drawImage(S.body, 0, TOPY);
    // flow stripes inside the jacket (x-ray): one per lit channel, dashes flowing DOWN toward the face
    const top = bodyAt(TOPY);
    ctx.save(); ctx.beginPath(); ctx.moveTo(C[0] - R, C[1]); ctx.lineTo(top.cx - top.hw, TOPY); ctx.lineTo(top.cx + top.hw, TOPY); ctx.lineTo(C[0] + R, C[1]); ctx.closePath(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const ch of CHS) {
      const lit = P(t, tw[ch.k] - .02, tw[ch.k] + .3); if (lit <= 0) continue;
      const [fx, fy] = fp(ch.x, ch.y), x0 = fx, y0 = fy - ch.r * R * K, f1 = (C[1] - TOPY) / (C[1] - VP[1]);
      const xt = lerp(fx, VP[0], f1), wS = Math.max(3, ch.r * R * .55);
      const gS = ctx.createLinearGradient(0, TOPY, 0, y0); gS.addColorStop(0, rgba(ch.glow, 0)); gS.addColorStop(1, rgba(ch.glow, .16 * lit));
      ctx.strokeStyle = gS; ctx.lineWidth = wS * 1.8; ctx.beginPath(); ctx.moveTo(xt, TOPY); ctx.lineTo(x0, y0); ctx.stroke();
      const sp = .55, nD = 7;
      for (let k = 0; k < nD; k++) {
        const ph = ((t * sp + k / nD + hi(ch.k.length * 7)) % 1), v0 = Math.pow(ph, 1.6), v1 = Math.pow(clamp(ph + .05), 1.6);    // perspective: faster near the face
        const ya = lerp(TOPY, y0, v0), yb = lerp(TOPY, y0, v1), xa = lerp(xt, x0, v0), xb = lerp(xt, x0, v1), aa = .7 * lit * Math.sin(Math.PI * ph);
        ctx.strokeStyle = rgba(ch.glow, aa); ctx.lineWidth = wS * (.4 + .6 * v0); ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
      }
    }
    // "모두": one bright pulse down the whole line
    const mp = P(t, tAll - .06, tAll + .26, E.inQ);
    if (mp > 0 && mp < 1) {
      const y = lerp(500, C[1], mp), { cx, hw } = bodyAt(y);
      const gp = ctx.createLinearGradient(0, y - 140, 0, y + 30); gp.addColorStop(0, 'rgba(255,241,220,0)'); gp.addColorStop(.8, rgba('#fff1dc', .5)); gp.addColorStop(1, 'rgba(255,241,220,0)');
      ctx.fillStyle = gp; ctx.fillRect(cx - hw, y - 140, hw * 2, 170);
    }
    ctx.restore();
    // the cut face (slices in at the head of the scene)
    const sl = P(t, -.18, .3, E.inOutQ);
    ctx.save();
    if (sl < 1) { const yc = lerp(C[1] - R * K - 4, C[1] + R * K + 4, sl); ctx.beginPath(); ctx.rect(0, -2000, W, yc + 2000); ctx.clip(); }
    ctx.drawImage(S.face, C[0] - S.fw / 2, C[1] - S.fh / 2);
    ctx.restore();
    if (sl > 0 && sl < 1) { const yc = lerp(C[1] - R * K, C[1] + R * K, sl), hw = R * Math.sqrt(Math.max(0, 1 - Math.pow((yc - C[1]) / (R * K), 2)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#e8f6ff', .9); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(C[0] - hw, yc); ctx.lineTo(C[0] + hw, yc); ctx.stroke(); ctx.restore();
      LM.glow(ctx, C[0] - hw, yc, 50, '#e8f6ff', .8); LM.glow(ctx, C[0] + hw, yc, 50, '#e8f6ff', .8); }
    // channels light up
    const all = Math.exp(-Math.max(0, t - (tAll + .26)) * 4) * P(t, tAll + .2, tAll + .27);
    for (const ch of CHS) {
      const t0 = tw[ch.k], lit = P(t, t0 - .05, t0 + .12); if (lit <= 0) continue;
      const fl = Math.exp(-Math.max(0, t - t0) * 6) * lit, br = clamp(.82 + .12 * Math.sin(t * 5 + ch.r * 30) + .5 * all);
      const parts = ch.cab ? ch.cab.map(([dx, dy]) => [ch.x + dx, ch.y + dy, ch.r * .72]) : [[ch.x, ch.y, ch.r - ch.w]];
      for (const [cx, cy, rr] of parts) {
        const [px, py] = fp(cx, cy), rx = rr * R, ry = rr * R * K;
        ctx.save(); ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.clip();
        const g = ctx.createRadialGradient(px, py, 0, px, py, rx); g.addColorStop(0, rgba(mix(ch.glow, '#ffffff', .55 + .45 * fl), lit * br)); g.addColorStop(.55, rgba(ch.glow, .75 * lit * br)); g.addColorStop(1, rgba(mix(ch.glow, '#000000', .5), .6 * lit));
        ctx.fillStyle = g; ctx.fillRect(px - rx, py - ry, rx * 2, ry * 2);
        if (!ch.cab) for (let k = 0; k < 2; k++) {   // flow rings in the bore
          const q = ((t * .9 + k * .5) % 1); ctx.strokeStyle = rgba('#ffffff', .22 * lit * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, rx * q, ry * q, 0, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        LM.glow(ctx, px, py, rx * 2.6, ch.glow, (.32 + .3 * all) * lit);
        if (fl > .02) LM.glow(ctx, px, py, rx * (2 + 3 * (1 - fl)), '#ffffff', .9 * fl);
      }
    }
    // "모두": shock ring around the face
    if (all > .01) { ctx.save(); ctx.strokeStyle = rgba('#fff1dc', .6 * all); ctx.lineWidth = 3; const q = 1 + .25 * (1 - all); ctx.beginPath(); ctx.ellipse(C[0], C[1], R * q, R * K * q, 0, 0, TAU); ctx.stroke(); ctx.restore(); LM.glow(ctx, C[0], C[1], R * 1.6, COL.warm, .25 * all); }
    ctx.restore();

    // labels (screen space; they clear as the camera pulls back)
    const la = 1 - P(t, tDiv - .1, tDiv + .15);
    if (la > 0) {
      const mA = new DOMMatrix().translate(Q[0], Q[1]).rotate((rho - rho0) * 180 / Math.PI).scale(sA * push0).translate(-C[0], -C[1]);
      const sp2 = p => { const q = mA.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
      const order = ['gas', 'water', 'power', 'comms'];
      for (const ch of CHS) {
        const t0 = tw[ch.k], a0 = P(t, t0 - .06, t0 + .14, E.outQ); if (a0 <= 0) continue;
        const nextT = tw[order[order.indexOf(ch.k) + 1]], dim = nextT != null ? 1 - .35 * P(t, nextT - .05, nextT + .2) : 1, a = a0 * la * clamp(dim + .5 * P(t, tAll + .2, tAll + .3) * (1 - P(t, tAll + .6, tAll + 1.1)));
        const s = lerp(.88, 1, E.outBack(P(t, t0 - .06, t0 + .28)));
        const [l1, l2] = split2(D[ch.k] || { gas: '호흡 기체 (헬륨+산소)', water: '온수 (잠수복 난방)', power: '전기·조명·영상', comms: '통신' }[ch.k]);
        const y = ch.top ? 588 : 1094, x = ch.side < 0 ? 40 : 1040;
        const box = chLabel(ctx, l1, l2, x, y, ch.side < 0 ? 'left' : 'right', a, ch.glow, s);
        const [px, py] = sp2(fp(ch.x + ch.side * (ch.cab ? .2 : ch.r * .7), ch.y));
        lead(ctx, px, py, ch.side < 0 ? box.x0 + box.w : box.x0, box.y + box.h / 2, a * P(t, t0, t0 + .2), ch.glow);
      }
    }
  }

  // =========================== B overlays ===========================
  if (aB > 0) {
    // "다이빙 벨" (generic label) on "벨과"
    const ba = P(u, .86, 1, E.outQ) * aB * (1 - P(t, tLine - .2, tLine + .05));
    if (ba > 0) { const bp = toS([BB.bell[0] - 120, BB.bell[1] - 40]); PK.chip(ctx, '다이빙 벨', bp[0] - 110, bp[1] - 30, ba, { size: 32, color: '#ffe3b8', border: rgba(COL.amber, .6) }); }
    // data.name on "줄 하나에": the one message of the scene
    const na = P(t, tLine - .05, tLine + .2, E.outQ) * aB;
    if (na > 0) {
      const s = D.name || '엄빌리컬 = 생명줄', i = s.indexOf('= '), a1 = i > 0 ? s.slice(0, i + 2) : s, a2 = i > 0 ? s.slice(i + 2) : '';
      const sz = 52, w1 = measure(ctx, a1, sz, FONT.sub, 900), w2 = measure(ctx, a2, sz, FONT.sub, 900), w = w1 + w2 + 64, h = sz + 40, x = 60, y = 600;
      const lp = toS(G.pts[1]), sc = lerp(.86, 1, E.outBack(P(t, tLine - .05, tLine + .3)));
      lead(ctx, lp[0] - 10, lp[1], x + w - 30, y + h, na * P(t, tLine + .05, tLine + .3), COL.amber);
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2)); ctx.globalAlpha *= na;
      ctx.fillStyle = 'rgba(3,7,8,.88)'; roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.strokeStyle = rgba(COL.amber, .7); ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
      text(ctx, a1, x + 32, y + h / 2 + 2, { size: sz, weight: 900, color: '#ffffff', align: 'left', alpha: na });
      text(ctx, a2, x + 32 + w1, y + h / 2 + 2, { size: sz, weight: 900, color: '#ffc46b', align: 'left', alpha: na });
      ctx.restore();
    }
  }
  // fragile ending: the black water closes in around the one line
  const vg = P(t, tHang, d, E.inOutQ);
  if (vg > 0) {
    const c0 = toS(G.pts[2]); const g = ctx.createRadialGradient(c0[0], c0[1], 160, c0[0], c0[1], 900);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,1,1,${.55 * vg})`); ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  LM.subBand(ctx, .82);
};
})();
