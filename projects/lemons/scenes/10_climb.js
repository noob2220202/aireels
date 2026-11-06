// climb: "더듬어 구조물 위로 올랐지만, 벨의 불빛은 어디에도 없었습니다."
// Near-black. Picks up from the end of 'dark' (only his faint amber heartbeat left). Three moves, one camera language:
//  1) CLOSE (더듬어 · 구조물): his gloved hand gropes through black water; there is nothing to see but what his own
//     amber light touches. It knocks against a steel member (knock sfx) and the lattice is revealed only in a small pool
//     around the contact; the second knock lands higher, on the leg beside the old hose.
//  2) MEDIUM, following him up (위로 올랐지만): he climbs the old hose hand over hand (IK grips on the hose), the lattice
//     slides past and is lit only as his glow passes it; the gauge note pops (he could not read his gauge in the dark).
//  3) He hauls himself over the top edge, kneels, and on '벨의 불빛은' looks up; the camera tilts with him into the empty
//     water above: completely black. A faint dotted outline marks where the bell used to hang (dotted wire up into the
//     dark); on '어디에도' it slides away up and to the right and dissolves (tag: the bell had been pushed away with the
//     ship). On '없었습니다' the gas clock draws in around him, low (its level from 'math'), with the bailout note.
(function () {
'use strict';
const { E, P, clamp, lerp, rgba } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// ---- world: the lattice on the seabed, his line of climb up the old hose on its left side ----
const SX = 900, SY = 1530, SS = 1.5;      // structure base centre / scale (top deck at SY - 344*SS = 1014)
const DS = .78;                           // diver scale (same structure/diver ratio as the hook)
const F_MATH = .396;                      // the gas clock level where 'math' left it ("two left")
const GHOST = { x: 884, y: 562, s: .56 };   // where the bell used to hang (world)
const K1 = [476, 1459], K2 = [440, 1388];  // the two touches: the bottom brace, then the leg beside the hose
const KNEEL = [600, 1018];                 // base of his kneeling pose on the top deck

// cheap big glows (same helpers as the neighbouring scenes)
const GS = [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]], LIFE_S = .14;
function softGlow(ctx, x, y, r, color, a = 1) {
  if (!(a > .003) || !(r > .5)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [o, k] of GS) g.addColorStop(o, rgba(color, Math.min(1, a) * k));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function haze(ctx, lights, k = 1, cap = 640) { for (const Lt of lights) softGlow(ctx, Lt.x, Lt.y, Math.min(Lt.r * .9, cap), Lt.color, .24 * (Lt.a == null ? 1 : Lt.a) * k); }
function lifeGlow(ctx, t, x, y, a, s, bpm) {
  if (a <= 0) return; const b = PK.beat(t, bpm);
  softGlow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  softGlow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a * .9);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a * .8);
}

// two-bone IK in the kit rig's angle convention (0 = down, +PI/2 = forward)
function ik(sh, tg, l1 = 76, l2 = 84, flip = 1) {
  const dx = tg[0] - sh[0], dy = tg[1] - sh[1], D = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const q = Math.atan2(dx, dy), A = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
  const a1 = q + A * flip, e = [sh[0] + Math.sin(a1) * l1, sh[1] + Math.cos(a1) * l1], a2 = Math.atan2(tg[0] - e[0], tg[1] - e[1]);
  return [a1, a2 - a1];
}
// pose space <-> world for a chest-anchored LM.diver (rot 0) at (x, y, s, dir) with torso tilt T
function rigMap(x, y, s, dir, T) {
  const cT = Math.cos(T), sT = Math.sin(T), tor = (u, v) => [u * cT - v * sT, u * sT + v * cT], ch = tor(16, -106);
  return {
    toW: q => [x + dir * s * (q[0] - ch[0]), y + s * (q[1] - ch[1])],
    toP: w => [(w[0] - x) / (dir * s) + ch[0], (w[1] - y) / s + ch[1]],
    shN: tor(12, -140), shF: tor(-4, -144),
  };
}
// x of the old hose at world height y (the structure's hose polyline, bottom -> top)
function hoseX(hose, y) {
  for (let i = 1; i < hose.length; i++) {
    const a = hose[i - 1], b = hose[i];
    if ((y <= a[1] && y >= b[1]) || (y >= a[1] && y <= b[1])) { const k = (y - a[1]) / ((b[1] - a[1]) || 1); return lerp(a[0], b[0], k); }
  }
  return y > hose[0][1] ? hose[0][0] : hose[hose.length - 1][0];
}
// a thick work glove (5 fingers, gauntlet cuff), +x = along the forearm toward the fingertips; grip 0..1 curls the fingers
function glove(ctx, x, y, ang, s, rim, a, grip, light) {
  if (a <= .01) return;
  const fing = [[-10.5, 23, 8.2], [-3.5, 26, 8.6], [3.5, 25, 8.4], [10.2, 21, 7.8]];
  const shape = g => {
    ctx.beginPath();
    ctx.moveTo(-36 - g, -17 - g); ctx.lineTo(-6, -15 - g); ctx.lineTo(-6, 15 + g); ctx.lineTo(-36 - g, 17 + g); ctx.closePath();   // gauntlet cuff
    ctx.moveTo(26 + g, 0); ctx.ellipse(10, 0, 17 + g, 14.5 + g, 0, 0, TAU);                                                 // palm
    for (const [fy, len, w] of fing) {                                                                                       // fingers curl toward +y
      const c = grip * 1.45, mx = 22 + Math.cos(c * .55) * len * .55, my = fy + Math.sin(c * .55) * len * .55, ex = mx + Math.cos(c) * len * .5, ey = my + Math.sin(c) * len * .5;
      ctx.moveTo(22 + w / 2 + g, fy); ctx.arc(22, fy, w / 2 + g, 0, TAU); ctx.moveTo(mx + w / 2 + g, my); ctx.arc(mx, my, w / 2 + g, 0, TAU);
      ctx.moveTo(ex + w / 2 + g, ey); ctx.arc(ex, ey, w / 2 + g, 0, TAU);
    }
    const tc = .9 + grip * .6;                                                                                               // thumb
    ctx.moveTo(4 + 9 + g, -12); ctx.arc(4, -12, 9 + g, 0, TAU); ctx.moveTo(4 + Math.cos(-tc) * 16 + 8 + g, -12 + Math.sin(-tc) * 16); ctx.arc(4 + Math.cos(-tc) * 16, -12 + Math.sin(-tc) * 16, 8 + g, 0, TAU);
  };
  const capsules = g => {   // finger segments (strokes) so the curled fingers read as one piece
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [fy, len, w] of fing) {
      const c = grip * 1.45, mx = 22 + Math.cos(c * .55) * len * .55, my = fy + Math.sin(c * .55) * len * .55, ex = mx + Math.cos(c) * len * .5, ey = my + Math.sin(c) * len * .5;
      ctx.lineWidth = w + 2 * g; ctx.beginPath(); ctx.moveTo(18, fy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    }
    const tc = .9 + grip * .6; ctx.lineWidth = 16 + 2 * g; ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(4, -12); ctx.lineTo(4 + Math.cos(-tc) * 16, -12 + Math.sin(-tc) * 16); ctx.stroke();
  };
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.globalAlpha *= a;
  const lo = light ? [Math.cos(light - ang) * 2.4, Math.sin(light - ang) * 2.4] : [-1.6, -1.6];
  ctx.save(); ctx.translate(lo[0], lo[1]); ctx.fillStyle = ctx.strokeStyle = rgba(rim, .7); shape(1.2); ctx.fill(); capsules(1.2); ctx.restore();
  ctx.fillStyle = ctx.strokeStyle = '#040707'; shape(0); ctx.fill(); capsules(0);
  ctx.strokeStyle = rgba(rim, .32); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-9, 14); ctx.moveTo(-30, -16); ctx.lineTo(-30, 16); ctx.stroke();   // cuff seams
  ctx.globalCompositeOperation = 'lighter';
  const gg = ctx.createRadialGradient(-34, 6, 0, -34, 6, 70); gg.addColorStop(0, rgba(COL.amber, .3)); gg.addColorStop(1, rgba(COL.amber, 0));
  ctx.fillStyle = ctx.strokeStyle = gg; shape(0); ctx.fill(); capsules(0);
  ctx.restore();
}
// the lit world (seabed + structure) exists only inside the pools of light: it is drawn at half resolution into a buffer,
// cut to the union of soft holes (screen space) and drawn up over the pools' bounding box. In this renderer that is several
// times cheaper than the full-res lit structure at close-up scales plus a full-frame darkness veil; the softer steel reads
// as depth of field behind the full-res diver.
function poolWorld(ctx, holes, camT, draw) {
  const BW = 540, BH = 960;                                    // half-res buffer: covers up to 1080x1920 screen px of pools
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const h of holes) { x0 = Math.min(x0, h.x - h.r); y0 = Math.min(y0, h.y - h.r); x1 = Math.max(x1, h.x + h.r); y1 = Math.max(y1, h.y + h.r); }
  x0 = Math.max(0, Math.floor(x0 / 8) * 8); y0 = Math.max(0, Math.floor(y0 / 8) * 8); x1 = Math.min(1080, Math.ceil(x1 / 8) * 8); y1 = Math.min(1920, Math.ceil(y1 / 8) * 8);
  if (x1 - x0 > 2 * BW) { const c = Math.round(clamp(holes[0].x, x0 + BW, x1 - BW) / 8) * 8; x0 = c - BW; x1 = c + BW; }
  if (y1 - y0 > 2 * BH) { const c = Math.round(clamp(holes[0].y, y0 + BH, y1 - BH) / 8) * 8; y0 = c - BH; y1 = c + BH; }
  if (x1 - x0 < 8 || y1 - y0 < 8) return;
  const bw = x1 - x0, bh = y1 - y0, [b, x] = L.buf('lmClimbPW', BW, BH);
  x.clearRect(0, 0, BW, BH);
  x.save(); x.beginPath(); x.rect(0, 0, bw / 2, bh / 2); x.clip(); x.scale(.5, .5); x.translate(-x0, -y0); camT(x); draw(x); x.restore();
  const [m, mx] = L.buf('lmClimbPM', 135, 240);
  mx.clearRect(0, 0, 135, 240); mx.globalCompositeOperation = 'lighter';
  for (const h of holes) {
    const r = h.r / 8, a = clamp(h.a == null ? 1 : h.a); if (r < .5) continue;
    const g = mx.createRadialGradient(h.x / 8, h.y / 8, 0, h.x / 8, h.y / 8, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.45, `rgba(255,255,255,${a * .78})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    mx.fillStyle = g; mx.fillRect(h.x / 8 - r, h.y / 8 - r, 2 * r, 2 * r);
  }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, x0 / 8, y0 / 8, bw / 8, bh / 8, 0, 0, bw / 2, bh / 2); x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(b, 0, 0, bw / 2, bh / 2, x0, y0, bw, bh); ctx.restore();
}
// the dotted outline of the bell where it used to hang (local coordinates as LM.bell, centred on the vessel)
function ghostBell(ctx, x, y, s, a, dash) {
  if (a <= .005) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  ctx.lineWidth = 3.8 / s; ctx.setLineDash([2 / s, 13 / s]); ctx.lineDashOffset = -dash / s;
  ctx.strokeStyle = 'rgba(184,220,228,.9)';
  ctx.beginPath(); ctx.moveTo(0, -292); ctx.lineTo(0, -292 - 1600); ctx.stroke();                         // the lift wire, up into the dark
  ctx.beginPath(); ctx.arc(0, -70, 112, Math.PI, TAU); ctx.lineTo(112, 36); ctx.ellipse(0, 36, 112, 76, 0, 0, Math.PI); ctx.closePath(); ctx.stroke();   // vessel
  ctx.beginPath(); ctx.moveTo(-150, -176); ctx.lineTo(-150, 214); ctx.moveTo(150, -176); ctx.lineTo(150, 214); ctx.moveTo(-182, 214); ctx.lineTo(182, 214);
  ctx.moveTo(-150, -176); ctx.lineTo(0, -292); ctx.lineTo(150, -176); ctx.stroke();                         // frame + bridle
  ctx.beginPath(); ctx.ellipse(0, 172, 46, 10, 0, 0, TAU); ctx.stroke();                                    // hatch (dark)
  ctx.beginPath(); ctx.arc(56, -30, 24, 0, TAU); ctx.stroke();                                              // porthole (no light)
  ctx.restore();
}

window.PK.scenes.climb = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tGr = at('더듬어', .02), tK1 = at('구조물', .1) - .2, tK2 = tK1 + .5, tUp = at('위로', .2), tOl = at('올랐지만', .24);
  const tBell = at('벨의', .45), tLt = at('불빛은', .5), tNo = at('어디에도', .65), tEnd = at('없었습니다', .78);
  const shot2 = t >= tUp - .02;                             // hard cut from the hand close-up to the climb, on '위로'

  const st = LM.structure(null, SX, SY, SS, t);
  const hose = st.hose;
  const bpm = 110, ph = -tLt;                              // fast heartbeat, phase-locked to the heartbeat sfx on '불빛은'

  // ---------------- him ----------------
  let x, y, T, h, pose = 'crouch', pose2 = null, mix = 0, adj = {}, tgN = null, tgF = null, gripN = 0, gripF = 0, idle = 0;
  const tTop = tBell - .3, tOn = tBell + .22;               // last pull ends / he is up on the deck
  const over = shot2 ? P(t, tTop - .1, tOn, E.inOutQ) : 0;    // hauling over the top-left corner onto the deck
  if (!shot2) {
    // ---- 1) on the seabed beside the lattice, groping for it ----
    x = 318 + 8 * P(t, tK1, tK2, E.inOutQ); y = 1386 - 12 * P(t, tK2 - .2, tUp, E.inOutQ);
    T = lerp(.56, .42, P(t, tK1, tUp)); h = lerp(.28, -.08, P(t, tK1 - .2, tK2));
    const s0 = [x + 60, y + 130], sw = P(t, -.4, tK1, E.inOutQ);
    const grope = [lerp(s0[0], K1[0], sw) + Math.sin(sw * 5.2) * 24 * (1 - sw), lerp(s0[1], K1[1], sw) - Math.sin(sw * Math.PI) * 50];
    const up = P(t, tK2 - .32, tK2, E.inOutQ);
    tgN = up > 0 ? [lerp(K1[0], K2[0], up) - Math.sin(up * Math.PI) * 30, lerp(K1[1], K2[1], up)] : grope;
    gripN = Math.max(P(t, tK1 - .05, tK1 + .08) * (1 - P(t, tK2 - .32, tK2 - .2)), P(t, tK2 - .05, tK2 + .08));
    tgF = [x + 50 + 12 * Math.sin(t * 2.1), y + 160 + 6 * Math.sin(t * 1.7)];  // far hand braced low, on the seabed
    adj = { nl: [1.45, -1.55], fl: [.15, -1.5] };
  } else {
    // ---- 2) up the old hose, hand over hand; 3) over the top edge, kneel, look up ----
    const y0 = 1236, y1 = 1000, N = 3, stepH = (y0 - y1) / N;
    const s = N * P(t, tUp - .05, tTop), si = Math.min(N - 1e-6, s), sf = Math.floor(si) + E.inOutQ(si - Math.floor(si));
    const cy = y0 - sf * stepH, cx = hoseX(hose, cy - 120) - 92;
    const kneel = LM.diver(null, KNEEL[0], KNEEL[1], DS, t, { pose: 'crouch', anchor: 'base', dir: 1, adj: { T: .5, h: .1 }, idle: 0 }).chest;
    x = lerp(cx, kneel[0], over); y = lerp(cy, kneel[1], over) - Math.sin(over * Math.PI) * 46;
    pose = 'climb'; pose2 = 'crouch'; mix = over;
    // he looks up into the water above on '벨의 불빛은', then his head drops on '없었습니다'
    const look = P(t, tBell - .05, tLt + .3, E.inOutQ) * (1 - .6 * P(t, tEnd - .05, tEnd + .7, E.inOutQ));
    T = lerp(.08, lerp(.5, .18, look), over); h = lerp(-.38, lerp(.12, -1.0, look), over);
    if (over < .999) {
      // grips: each hand holds a point on the hose for two steps, then reaches up to the next one
      const reach = 150, gripAt = j => { const gy = y0 - j * stepH - reach; return [hoseX(hose, gy) - 4, gy]; };
      const hand = o => {
        const k = (s + o) / 2, i = Math.floor(k), f = k - i, mv = P(f, .55, 1, E.inOutQ);
        const g0 = gripAt(2 * i - o), g1 = gripAt(2 * i + 2 - o);
        return { p: [lerp(g0[0], g1[0], mv) - Math.sin(mv * Math.PI) * 34, lerp(g0[1], g1[1], mv)], g: 1 - Math.sin(mv * Math.PI) * .9 };
      };
      const hN = hand(0), hF = hand(1), deckN = [528, 1012], deckF = [470, 1010];   // over the top: both hands flat on the deck edge
      const ho = P(over, 0, .6, E.inOutQ);
      tgN = [lerp(hN.p[0], deckN[0], ho), lerp(hN.p[1], deckN[1], ho)]; gripN = lerp(hN.g, .35, ho);
      tgF = [lerp(hF.p[0], deckF[0], ho), lerp(hF.p[1], deckF[1], ho)]; gripF = lerp(hF.g, .35, ho);
      const ph = s * Math.PI;
      adj = { nl: [lerp(1.0 + .5 * Math.sin(ph), 1.5, over), lerp(-1.6 - .25 * Math.sin(ph), -1.56, over)], fl: [lerp(.1 - .4 * Math.sin(ph), .1, over), lerp(-.45 - .45 * Math.cos(ph), -1.48, over)] };
    }
    idle = .5 * over;
  }
  // IK for the hands that hold something
  const M = rigMap(x, y, DS, 1, T);
  const fullAdj = Object.assign({ T, h }, adj);
  // IK while he holds on; from the top edge the arms ease from the grip into the kneeling pose (no pop)
  const relax = shot2 ? P(over, .55, 1, E.inOutQ) : 0, CP = LM.POSES.crouch;
  const blendA = (q, r) => [lerp(q[0], r[0], relax), lerp(q[1], r[1], relax)];
  if (tgN) fullAdj.na = blendA(ik(M.shN, M.toP(tgN), 76, 84), CP.na);
  if (tgF) fullAdj.fa = blendA(ik(M.shF, M.toP(tgF), 76, 84), CP.fa);
  if (relax >= 1) { delete fullAdj.na; delete fullAdj.fa; }
  const wake = P(t, -.1, .45, E.outQ);                       // the silhouette comes back out of the dark of 'dark'
  const lifeA = lerp(.62, .85, wake);
  const DO = { pose, pose2, mix, dir: 1, adj: fullAdj, idle: (tgN || tgF) ? idle * relax : idle, life: lifeA, lifeS: LIFE_S, bpm, phase: ph, bailout: true,
    rim: '#ffc58a', rimA: lerp(.12, .55, wake), rim2A: 0, halo: 0, detail: lerp(.15, .5, wake), fill: '#030606', light: [x + 160, y - 260] };
  const dv = LM.diver(null, x, y, DS, t, DO);

  // ---------------- camera ----------------
  let cam;
  if (!shot2) {
    const k = P(t, -.3, tUp, E.inOutQ);
    cam = { cx: lerp(398, 410, k), cy: lerp(1420, 1404, k), z: lerp(2.05, 2.22, k) };
  } else {
    // follows him up (chest held left of centre, the hose and lattice to his right), then tilts up past him into the
    // empty water when he looks up, and settles in a little for the clock
    const fol = { cx: x + 110 / 1.62, cy: y - 50 / 1.62, z: 1.62 };
    const lk = { cx: 684, cy: 759, z: 1.2 }, fin = { cx: 666, cy: 811, z: 1.3 };
    const up = P(t, tBell - .35, tLt + .4, E.inOutQ), settle = P(t, tEnd - .1, d + .3, E.inOutQ);
    cam = { cx: lerp(fol.cx, lk.cx, up), cy: lerp(fol.cy, lk.cy, up), z: lerp(fol.z, lk.z, up) };
    cam = { cx: lerp(cam.cx, fin.cx, settle), cy: lerp(cam.cy, fin.cy, settle), z: lerp(cam.z, fin.z, settle) };
  }
  const climbing = shot2 ? P(t, tUp, tUp + .2) * (1 - P(t, tOn - .2, tOn + .2)) : 0;
  const sk = LM.shake(t, .3 + .45 * climbing, 31);
  const jo1 = LM.jolt(t, tK1, .6), jo2 = LM.jolt(t, tK2, .45), jo3 = LM.jolt(t, tOn - .12, .35);
  const dr = { x: fb(t * .35, 33) * 7, y: fb(t * .3, 34) * 7, r: fb(t * .25, 35) * .003 };
  const AX = 540 + sk.x + jo1.x + jo2.x + jo3.x + dr.x, AY = 900 + sk.y + jo1.y + jo2.y + jo3.y + dr.y, CR = sk.r + dr.r + (shot2 ? 0 : .012);
  const cR = Math.cos(CR), sR = Math.sin(CR);
  const toS = (wx, wy) => { const u = (wx - cam.cx) * cam.z, v = (wy - cam.cy) * cam.z; return [AX + u * cR - v * sR, AY + u * sR + v * cR]; };

  // ---------------- lights (world) ----------------
  const onTop = shot2 ? P(t, tTop, tOn + .2) : 0;
  const lifeR = shot2 ? lerp(300, 420, onTop) : 150, lifeL = { x: dv.chest[0], y: dv.chest[1], r: lifeR, color: COL.amber, a: .85 * lifeA * (.85 + .15 * PK.beat(t + ph, bpm)) };
  const lights = [lifeL];
  // touch: where the glove meets the steel, the lattice is 'felt' — revealed in a small pool that lingers
  if (!shot2) for (const [tk, p] of [[tK1, K1], [tK2, K2]]) {
    const u = t - tk; if (u < -.02) continue;
    const k = .3 + .7 * Math.exp(-Math.max(0, u) * 2.2);
    lights.push({ x: p[0], y: p[1], r: 90 + 170 * E.outC(clamp(u / .6)), color: '#ffd7a0', a: .8 * k });
  }
  const sl = lights.map(Lt => { const p = toS(Lt.x, Lt.y); return { x: p[0], y: p[1], r: Lt.r * cam.z, color: Lt.color, a: Lt.a }; });

  // ---------------- draw ----------------
  LM.sea(ctx, t, { dark: shot2 ? .965 : 1, murk: shot2 ? 1 : .4, lights: sl, seed: 23, haze: 0, snow: .95, cam: [(cam.cx - 540) * .4, clamp((cam.cy - 900) * .5, -400, 400)] });
  haze(ctx, sl, .7, 380);
  ctx.save();
  ctx.translate(AX, AY); ctx.rotate(CR); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  // the empty water above: the dotted bell that is no longer there (faint, cold), sliding away and dissolving
  if (shot2) {
    const gIn = P(t, tLt - .05, tLt + .4, E.outQ), gOut = P(t, tNo - .02, tNo + .75, E.inOutQ);
    const ga = .78 * gIn * (1 - gOut) * (.82 + .18 * nz(t * 9, 3));
    ghostBell(ctx, GHOST.x + 90 * gOut, GHOST.y - 80 * gOut + 6 * Math.sin(t * .9), GHOST.s * (1 - .12 * gOut), ga, t * 12);
  }
  const camT = c => { c.translate(AX, AY); c.rotate(CR); c.scale(cam.z, cam.z); c.translate(-cam.cx, -cam.cy); };
  const holes = sl.map(Lt => ({ x: Lt.x, y: Lt.y, r: Lt.r * (shot2 ? 1.12 : 1.18), a: shot2 ? 1 : Math.min(1, Lt.a * 1.25) }));
  poolWorld(ctx, holes, camT, c => { LM.seabed(c, SY - 2, t, { dark: .97, lights, seed: 7 }); LM.structure(c, SX, SY, SS, t, { lights, amb: .006 }); });
  // the old hose catches his light where he holds it
  if (shot2 && over < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 1; i < hose.length; i++) {
      const a = hose[i - 1], b = hose[i], dd = Math.hypot((a[0] + b[0]) / 2 - dv.chest[0], (a[1] + b[1]) / 2 - dv.chest[1]), k = clamp(1 - dd / 260);
      if (k <= 0) continue;
      ctx.strokeStyle = rgba(COL.amber, .32 * k * k * (1 - over)); ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(a[0] - 3, a[1] - 3); ctx.lineTo(b[0] - 3, b[1] - 3); ctx.stroke();
    }
    ctx.restore();
  }
  // the top deck edge catches his light once he is up there (he kneels on something, not on nothing)
  if (shot2 && onTop > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ey = st.topY, cxp = dv.chest[0];
    const g = ctx.createLinearGradient(cxp - 330, 0, cxp + 330, 0); g.addColorStop(0, rgba(COL.amber, 0)); g.addColorStop(.5, rgba(COL.amber, .34 * onTop)); g.addColorStop(1, rgba(COL.amber, 0));
    ctx.fillStyle = g; ctx.fillRect(Math.max(st.topL[0] - 8, cxp - 330), ey - 2.5, 660, 3.5);
    const g2 = ctx.createLinearGradient(cxp - 260, 0, cxp + 260, 0); g2.addColorStop(0, rgba(COL.amber, 0)); g2.addColorStop(.5, rgba(COL.amber, .08 * onTop)); g2.addColorStop(1, rgba(COL.amber, 0));
    ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(Math.max(st.topL[0] - 8, cxp - 260), ey); ctx.lineTo(cxp + 260, ey); ctx.lineTo(cxp + 260 + 69, ey - 42); ctx.lineTo(Math.max(st.topL[0] - 8, cxp - 260) + 69, ey - 42); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // silt kicked up where he touches the steel
  if (!shot2) for (const [tk, p] of [[tK1, K1], [tK2, K2]]) {
    const u = t - tk; if (u < 0 || u > 1.6) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const q = hi(i * 7 + Math.round(tk * 100)) * TAU, sp = 16 + 38 * hi(i * 3 + 1), r = sp * (1 - Math.exp(-u * 3)), px = p[0] + Math.cos(q) * r, py = p[1] + Math.sin(q) * r * .7 - u * 7;
      ctx.fillStyle = rgba('#e2cfa8', .45 * (1 - u / 1.6) * (.3 + .7 * hi(i * 5 + 2))); ctx.beginPath(); ctx.arc(px, py, .8 + 1.4 * hi(i * 11), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // far glove (behind), body, near glove (in front)
  const shW = M.toW(M.shN), shFW = M.toW(M.shF);
  const R = LM.diver(ctx, x, y, DS, t, DO);
  const gs = DS * (shot2 ? .92 : 1.0);
  if (tgF && shot2) glove(ctx, R.hand2[0], R.hand2[1], Math.atan2(R.hand2[1] - shFW[1], R.hand2[0] - shFW[0]), gs, '#ffc58a', .9 * (1 - over), gripF, -2.2);
  if (tgN) glove(ctx, R.hand[0], R.hand[1], Math.atan2(R.hand[1] - shW[1], R.hand[0] - shW[0]), gs, '#ffc58a', shot2 ? 1 - over : 1, gripN, -2.2);
  lifeGlow(ctx, t + ph, R.chest[0], R.chest[1], lifeA, DS * .72, bpm);
  // breath: exhale bursts from the helmet, on the exhales of the breathing sfx (period 1/.66 s, exhale at +.5 period)
  LM.bubbles(ctx, t, R.head[0] - 4, R.head[1] - 42, { bursts: [-.75, .76, 2.27, 3.79], a: .45, s: .9, seed: 41, n: 13, rise: 1.1 });
  // the gas clock: back at the level 'math' left it, low, draining
  if (shot2) {
    const cA = P(t, tEnd - .12, tEnd + .3, E.outQ);
    if (cA > 0) {
      const draw = E.inOutQ(P(t, tEnd - .12, tEnd + .6));
      const fr = F_MATH - .03 * P(t, tEnd + .6, d + .2);
      LM.gasClock(ctx, R.chest[0], R.chest[1], 122 * lerp(1.22, 1, draw), fr, t, { a: cA * .95, w: 3.4, bpm });
    }
  }
  ctx.restore();

  LM.subBand(ctx, .84);
  // ---- notes ----
  const gA = shot2 ? P(t, tOl - .08, tOl + .17) * (1 - P(t, tBell + .05, tBell + .3)) : 0;
  if (gA > 0) PK.chip(ctx, D.gauge || '', 540, 500, gA, { size: 29, color: '#cfe8ff', border: 'rgba(150,210,255,.35)' });
  const tA = P(t, tNo + .05, tNo + .35) * (1 - P(t, d - .1, d + .2));
  if (tA > 0) { const gp = toS(GHOST.x, GHOST.y); PK.chip(ctx, D.tag || '', clamp(gp[0] - 40, 300, 820), clamp(gp[1] + 40, 560, 800), tA, { size: 30, color: '#e8f4ff', border: 'rgba(160,220,255,.4)' }); }
  const bA = P(t, tEnd + .02, tEnd + .3) * (1 - P(t, d - .1, d + .2));
  if (bA > 0) PK.chip(ctx, D.bailout || '', 540, 1182, bA, { size: 29, color: '#ffe3b8', border: 'rgba(255,179,71,.55)' });
};
})();
