// snag (25.02-29.96): "배가 바람에 밀려나면서, 그의 생명줄이 구조물에 걸렸습니다."
// Side view, one continuous camera move down the water column (depth compressed, not to scale).
//  '배가'      -> at the surface: the dive support vessel (no name/logo) in the wind-torn swell, spray streaking right; its
//                lift wire runs down into the dark at an angle (the bell lags behind). Generic label '잠수지원선'.
//  '밀려나면서,' -> it slides right; data.drift chip with an arrow.
//  '그의'      -> the camera tilts down the wire, plunging through the column (silt streaks).
//  '생명줄이'   -> settles on the seabed: the bell being dragged sideways (swinging on its wire), Yuasa's cold lamp dragged
//                along with it by his own line, Lemons (amber life-light) on top of the lattice heading toward the bell; an
//                amber pulse runs down his umbilical, which hangs in a slack loop past the protruding bucket.
//  '구조물에'   -> the loop is drawn up as the bell moves away...
//  '걸렸습니다.' -> ...and catches under the bucket's lip: the line snaps bowstring-tight, vibrating; a jolt, a puff of silt,
//                Lemons is yanked toward the edge and braces; data.tag at the snag point. The camera pushes in on the hook
//                (hand-over to the extreme close-up in 'weight').
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// ---------------- world (px at zoom 1): surface y = 0, seabed y = SB ----------------
const SB = 1900, ST = { x: 400, s: .92 }, BELL_Y = 1300, BELL_S = .56, SHIP_S = .8, FY = 850;
const LEM_S = .5, YUA_S = .46;
const shipX = t => 960 + 62 * t + 6 * t * t;
const bellX = t => 760 + 30 * t + 11 * t * t;

// world-anchored marine snow (streaks while the camera tilts down) — as in 'night'
function worldSnow(ctx, t, c, vy, map, layer, deepK) {
  const CELL = layer ? 230 : 150, n = layer ? 1 : 2, z = c.z;
  const wx0 = c.x - 600 / z, wx1 = c.x + 600 / z, wy0 = c.y - (FY + 60) / z, wy1 = c.y + (H - FY + 60) / z;
  const sl = clamp(Math.abs(vy) * z / 30 * (layer ? 1.6 : .8), 0, layer ? 220 : 120);
  ctx.save(); ctx.lineCap = 'round';
  for (let j = Math.floor(wy0 / CELL); j <= Math.floor(wy1 / CELL); j++) for (let i = Math.floor(wx0 / CELL); i <= Math.floor(wx1 / CELL); i++) {
    if (j < 0) continue;
    for (let k = 0; k < n; k++) {
      const id = (i * 7919 + j * 104729 + k * 31 + (layer ? 5003 : 0)) | 0;
      const wx = (i + hi(id)) * CELL + fb(t * .12 + hi(id + 3) * 9, id) * 24 + t * 14 * hi(id + 8), wy = (j + hi(id + 1)) * CELL + fb(t * .1 + hi(id + 4) * 9, id + 7) * 20 + t * 6 * hi(id + 5);
      const [sx, sy] = map(wx, wy); if (sx < -20 || sx > W + 20 || sy < -40 || sy > H + 40) continue;
      const r = (layer ? 2.6 + 4 * hi(id + 2) : .9 + 1.6 * hi(id + 2)) * Math.max(.7, z);
      const a = (layer ? .13 : .22 + .2 * hi(id + 6)) * (1 - .45 * deepK) * (.7 + .3 * Math.sin(t * 1.4 + id));
      if (sl > 3) {
        ctx.strokeStyle = rgba(COL.snow, Math.min(.6, a * clamp(18 / (sl + 6) + .55))); ctx.lineWidth = r * 1.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + sl * Math.sign(vy)); ctx.stroke();
      } else { ctx.fillStyle = rgba(COL.snow, a); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
    }
  }
  ctx.restore();
}
function lead(ctx, x0, y0, x1, y1, a, col) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 5, 0, 7); ctx.fill(); ctx.restore();
}
function arrowGlyph(ctx, x, y, len, a, col, t) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
  const k = (t * 1.4) % 1, x1 = x + len * (.8 + .2 * k);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1 - 14, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 + 8, y); ctx.lineTo(x1 - 16, y - 15); ctx.lineTo(x1 - 16, y + 15); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Lemons' line in structure-local units (bucket on the right): from the deck edge down inside the bucket bracket, under the
// bucket bottom, out at the lip. SLACK = hanging loop before it catches; TAUT = wrapped under the lip.
const SLACK = [[318, -350], [338, -236], [376, -132], [436, -112], [496, -168]];
const TAUT = [[318, -350], [334, -268], [350, -203], [415, -203], null];

window.PK.scenes.snag = function (ctx, t, d, info) {
  const D = info.sc.data || {}, at = (w, f) => PK.at(info, w, f);
  const tShip = at('배가', .02), tWind = at('바람에', .09), tPush = at('밀려나면서', .16), tHis = at('그의', .39), tLine = at('생명줄이', .45);
  const tStr = at('구조물에', .58), tSnag = at('걸렸습니다', .69);
  const snapK = P(t, tSnag - .14, tSnag + .06, E.inQ);            // the loop catches and goes tight
  const after = t >= tSnag - .02;

  // ---------------- camera ----------------
  const pu = P(t, tHis - .5, tLine + .35), e = E.inOutC(pu);
  const c1 = { x: 900 + 40 * P(t, -.2, 1.6), y: 56, z: .94 }, c3 = { x: 610 + 40 * P(t, tLine, d), y: 1588, z: 1 };
  const st0 = LM.structure(null, ST.x, SB, ST.s, t), hookW = st0.hook;
  const pp = E.inOutQ(P(t, tSnag + .05, d + .25));
  const c = {
    x: lerp(lerp(c1.x, c3.x, E.inOutQ(pu)), hookW[0] - 70, pp), y: lerp(lerp(c1.y, c3.y, e), hookW[1] - 96, pp),
    z: lerp(lerp(c1.z, c3.z, e) - .14 * Math.sin(Math.PI * pu), 1.36, pp),
  };
  const camY = tt => { const q = P(tt, tHis - .5, tLine + .35); return lerp(c1.y, c3.y, E.inOutC(q)); };
  const vy = (camY(t + .02) - camY(t - .02)) / .04;
  const sh = LM.shake(t, .35 + .4 * Math.sin(Math.PI * pu) + .35 * pp, 17), jo = LM.jolt(t, tSnag, 1.3);
  const ox = sh.x + jo.x, oy = sh.y + jo.y, zs = c.z;
  const map = (wx, wy) => [540 + (wx - c.x) * zs + ox, FY + (wy - c.y) * zs + oy];
  const onS = (p, r) => p[0] > -r && p[0] < W + r && p[1] > -r && p[1] < H + r;
  const deep = clamp(c.y / 1500);

  // ---------------- world geometry ----------------
  const sxW = shipX(t), bxW = bellX(t), swing = .1 + .05 * P(t, 0, d) + .025 * Math.sin(t * 1.1) + .05 * Math.exp(-Math.max(0, t - tSnag) * 3) * (after ? 1 : 0);
  // Lemons: walking toward the bell on the top deck, yanked toward the edge on the snag
  const walk = P(t, tLine - .4, tSnag - .05, E.inOutQ), yank = E.outBack(P(t, tSnag - .02, tSnag + .45), 1.6), creep = P(t, tSnag + .4, d + .3);
  const lemX = 452 + 78 * walk + 26 * yank + 8 * creep;
  const stp = Math.sin(walk * Math.PI * 2.4);
  const lemO = {
    pose: 'stand', pose2: 'crouch', mix: lerp(.35, .95, yank), dir: 1, anchor: 'base', life: 1, lamp: .75, bpm: lerp(66, 96, P(t, tSnag, tSnag + .8)), lifeS: .8,
    bailout: true, rim: '#9fd0e4', rimDir: -2.1, halo: .26, idle: 1, tremble: .5 * P(t, tSnag, tSnag + .5),
    adj: {
      T: lerp(.32, .72, yank), h: lerp(-.25, .1, yank),
      na: [lerp(1.75, 1.1, yank), lerp(.25, .7, yank)], fa: [lerp(1.35, .95, yank), lerp(.4, .9, yank)],
      nl: [lerp(.42 + .32 * stp, 1.35, yank), lerp(-.45 - .2 * Math.max(0, stp), -1.45, yank)], fl: [lerp(.1 - .32 * stp, .2, yank), lerp(-.5 + .2 * Math.min(0, stp), -1.3, yank)],
    },
  };
  const lemW = LM.diver(null, lemX, st0.topY + 3, LEM_S, t, lemO);
  const bellO = { glow: .85, hatch: .65, lamps: .45, swing, amb: .18 };
  const bellW = LM.bell(null, bxW, BELL_Y, BELL_S, t, bellO);
  // he looks toward the bell as he heads for it; when the line yanks him he looks down at what holds it
  const toBell = Math.atan2(bellW.hatch[1] - lemW.lamp[1], bellW.hatch[0] - lemW.lamp[0]), toHook = Math.atan2(hookW[1] - lemW.lamp[1], hookW[0] - 20 - lemW.lamp[0]);
  lemO.lampAng = lerp(toBell, toHook, P(t, tSnag + .05, tSnag + .45, E.inOutQ)) + .05 * Math.sin(t * .9);
  // Yuasa: hauled toward the bell by his own umbilical; his lamp keeps swinging back toward Lemons
  const drag = P(t, tLine - .6, d + .4);
  const yW = [bxW + 70 - 30 * drag, BELL_Y + 350 - 100 * drag + 10 * Math.sin(t * 1.3)];
  const yuaO = { pose: 'float', dir: -1, rot: -.22 - .12 * drag + .05 * Math.sin(t * 1.7), lamp: 1, bailout: true, rim: '#cfe8ff', rimDir: -1.2, halo: .2, phase: 1.7, idle: 1, kick: .25,
    adj: { na: [2.0 + .25 * Math.sin(t * 2.1), .35], fa: [1.7 + .2 * Math.sin(t * 1.8 + 1), .5], h: .25 } };
  const yuaW0 = LM.diver(null, yW[0], yW[1], YUA_S, t, yuaO);
  const sweep = .3 * Math.sin(t * 1.25 + .8) - .18 * Math.exp(-Math.pow((t - tStr - .1) / .35, 2));
  yuaO.lampAng = Math.atan2(hookW[1] - 30 - yuaW0.lamp[1], hookW[0] - 60 - yuaW0.lamp[0]) + sweep;

  // ---------------- screen components ----------------
  const shipP = map(sxW, 6 * Math.sin(t * 1.05)), roll = .04 * Math.sin(t * .95 + .3) - .02;
  const shipO = { under: 1, lights: 1, roll, thrust: 0, rim: '#8fb4c2', dir: -1 };
  const surfY = map(0, 0)[1], bedY = map(0, SB)[1];
  const shipR = surfY > -520 ? LM.ship(null, shipP[0], shipP[1], SHIP_S * zs, t, shipO) : null;
  const mpW = [sxW - 20 * SHIP_S, 66 * SHIP_S], mp = shipR ? shipR.moonpool : map(mpW[0], mpW[1]);
  const bellP = map(bxW, BELL_Y), bellR = LM.bell(null, bellP[0], bellP[1], BELL_S * zs, t, bellO);
  bellO.wireTop = mp[1]; bellO.wireDx = mp[0] - bellR.wire[0];
  const bedVis = bedY < H + 460;
  const stP = map(ST.x, SB), st = LM.structure(null, stP[0], stP[1], ST.s * zs, t);
  const lemP = map(lemX, st0.topY + 3), yuaP = map(yW[0], yW[1]);
  const lemR = bedVis ? LM.diver(null, lemP[0], lemP[1], LEM_S * zs, t, lemO) : null;
  const yuaR = bedVis ? LM.diver(null, yuaP[0], yuaP[1], YUA_S * zs, t, yuaO) : null;
  const lights = [].concat(shipR ? shipR.lights : [], bellR.lights.slice(0, 2), lemR ? lemR.lights : [], yuaR ? yuaR.lights : []);
  const hook = st.hook;
  // snag glint as a light
  const sg = after ? Math.exp(-(t - tSnag) * 3.5) : 0;
  if (sg > .02) lights.push(LM.light(hook[0], hook[1], 380 * zs, '#dff4ff', .9 * sg));

  // ================= water =================
  LM.sea(ctx, t, { dark: lerp(.3, .58, deep), lights: lights.filter(L2 => onS([L2.x, L2.y], L2.r)), seed: 6, snow: .55, murk: .9, haze: .9, current: [-6, 0],
    surface: .9 * (1 - deep), surfaceY: surfY + 10, surfaceColor: '#a99a74', top: '#15363b', mid: '#0a1c1d', bottom: '#020808' });

  // ================= surface: sky, swell, the ship sliding right =================
  if (surfY > -300 && shipR) {
    LM.swell(ctx, surfY, t, 26 * zs, { caps: 1, under: .55, seed: 4 });
    // wind-driven spray streaks above the swell
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const sp = 700 + 500 * hi(i * 3), y = surfY - 20 - hi(i * 5 + 1) * 330 * zs, len = (40 + 120 * hi(i * 7)) * zs, x = ((hi(i * 11) * (W + 400) + t * sp) % (W + 400)) - 200;
      ctx.strokeStyle = rgba('#d8eef2', .12 + .16 * hi(i * 13)); ctx.lineWidth = 1 + 1.4 * hi(i * 17);
      ctx.beginPath(); ctx.moveTo(x - len, y + len * .05); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
    LM.ship(ctx, shipP[0], shipP[1], SHIP_S * zs, t, shipO);
    LM.swell(ctx, surfY, t, 26 * zs, { front: true, sky: false, caps: .7, under: 0, seed: 4, a: .8 });
    // amber glints of the deck floods on the swell + foam piling on the windward side of the hull
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const yA = LM.swell(null, surfY, t, 26 * zs, { seed: 4 });
    for (let i = 0; i < 24; i++) {
      const gx = shipP[0] + (hi(i * 3) - .5) * 700 * zs + Math.sin(t * .8 + i) * 20, gy = yA(gx) + 3 + hi(i * 5) * 50 * zs, ph = .5 + .5 * Math.sin(t * 3.1 + i * 2.2);
      ctx.fillStyle = rgba(COL.amber, .25 * ph * clamp(1 - Math.abs(gx - shipP[0]) / (420 * zs))); ctx.fillRect(gx - 9 * zs, gy, 18 * zs, 2);
    }
    for (let i = 0; i < 18; i++) {
      const fx = shipP[0] - 300 * zs - hi(i * 7) * 120 * zs, fy = yA(fx) + (hi(i * 9) - .3) * 14, ph = (t * .9 + hi(i)) % 1;
      ctx.fillStyle = rgba('#e3f5f6', .3 * Math.sin(Math.PI * ph)); ctx.beginPath(); ctx.ellipse(fx - ph * 40, fy, 10 + 14 * hi(i * 3), 3, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  worldSnow(ctx, t, c, vy, map, 0, deep);

  // ---- the lift wire through the column (from the moonpool down to the bell) ----
  { const w0 = mp, w1 = bellR.wire;
    if (w1[1] > -20 && w0[1] < H + 20) { ctx.save(); ctx.strokeStyle = rgba('#b8d4da', .28); ctx.lineWidth = Math.max(1.5, 2.8 * zs); ctx.beginPath(); ctx.moveTo(w0[0], w0[1]); ctx.lineTo(w1[0], w1[1]); ctx.stroke();
      // a faint warm glint sliding down the wire as the camera follows it
      const q = clamp((FY - w0[1]) / Math.max(1, w1[1] - w0[1])); if (pu > 0 && pu < 1) LM.glow(ctx, lerp(w0[0], w1[0], q), lerp(w0[1], w1[1], q), 60, COL.warm, .35 * Math.sin(Math.PI * pu));
      ctx.restore(); } }

  // ================= seabed: structure, divers, lines, bell =================
  if (bedVis) {
    if (bedY < H - 40) LM.seabed(ctx, bedY, t, { dark: .45, lights, cam: [(c.x - 600) * zs, 0], seed: 5 });
    const strLights = lights.slice();
    // '구조물에': Yuasa's beam slides over the bucket
    const bk = Math.exp(-Math.pow((t - tStr - .15) / .3, 2));
    if (bk > .02) strLights.push(LM.light(st.bucket[0], st.bucket[1], 160 * zs, COL.lamp, .7 * bk));
    LM.structure(ctx, stP[0], stP[1], ST.s * zs, t, { lights: strLights, amb: .1 });

    // Yuasa's umbilical (short, hauling him) + Yuasa
    const ex = bellR.exit;
    const yPts = [[ex[0] + 8 * zs, ex[1]], [lerp(ex[0], yuaR.umb[0], .5) + 20 * zs, lerp(ex[1], yuaR.umb[1], .5) + 30 * zs], yuaR.umb];
    LM.umbilical(ctx, yPts, t + 1.1, { w: 8 * zs, lit: .4, tension: .55, sag: 20 * zs, pulse: .3, pulseSpeed: 240 * zs, glow: .1, sway: 4, vib: 1.4 });
    if (onS(yuaR.chest, 300 * YUA_S * zs)) LM.diver(ctx, yuaP[0], yuaP[1], YUA_S * zs, t, yuaO);
    else LM.lampBeam(ctx, t, yuaR.lamp[0], yuaR.lamp[1], yuaR.lampAng, 1, { len: 820 * YUA_S * zs, spread: .27, s: Math.max(.4, YUA_S * zs), seed: 9 });

    // the bell, dragged sideways
    LM.bell(ctx, bellP[0], bellP[1], BELL_S * zs, t, bellO);

    // Lemons' umbilical: bell exit -> (loop | under the lip) -> deck edge -> behind him -> helmet
    const k = E.inOutQ(P(t, tStr - .35, tSnag + .02));
    const loc = TAUT.map((q, i) => (q ? q : null));
    const lp = SLACK.map((sl, i) => { const tq = loc[i]; if (!tq) return st.map(sl[0], sl[1]); const a = st.map(sl[0], sl[1]), b = st.map(tq[0], tq[1]); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; });
    const lip = st.map(415, -203);
    // the last control point moves onto the straight run from the lip to the bell
    const lastT = [lerp(lip[0], ex[0], .3), lerp(lip[1], ex[1], .3)]; lp[4] = [lerp(lp[4][0], lastT[0], k), lerp(lp[4][1], lastT[1], k)];
    const u0 = lemR.umb, pel = lemR.pelvis;
    // down his back (clipped to the harness), then out behind his legs toward the deck edge
    const back = [[u0[0] - 20 * zs, u0[1] + 44 * zs], [pel[0] - 30 * zs, pel[1] - 30 * zs], [pel[0] + 24 * zs, pel[1] + 22 * zs]];
    const pts = [[ex[0] - 6 * zs, ex[1]]].concat(lp.slice().reverse(), back.slice().reverse(), [u0]);
    const tension = lerp(.12, .97, snapK) + .03 * P(t, tSnag + .2, d);
    const pulseA = P(t, tLine - .15, tLine + .2) * (1 - .6 * snapK);
    const um = LM.umbilical(ctx, pts, t, { w: 11 * zs, lit: .5 + .15 * pulseA + .1 * snapK, sag: 46 * zs, tension, vib: (3.2 + 3 * P(t, tSnag, d)) * zs * .6, sway: 6, pulse: .35 + .65 * pulseA, pulseN: 2, pulseSpeed: 420 * zs, glow: .3 + .3 * pulseA });
    // stress highlight racing along the line on the snap-tight
    const sr = P(t, tSnag - .04, tSnag + .4);
    if (sr > 0 && sr < 1) {
      const P0 = um.pts, n = P0.length, i0 = Math.floor(n * lerp(.42, 0, sr)), i1 = Math.floor(n * lerp(.42, .85, sr));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#eaf8ff', .55 * (1 - sr)); ctx.lineWidth = 4 * zs;
      ctx.beginPath(); for (let i = i0; i <= i1; i++) (i === i0 ? ctx.moveTo(P0[i][0], P0[i][1]) : ctx.lineTo(P0[i][0], P0[i][1])); ctx.stroke(); ctx.restore();
    }
    // Lemons
    if (onS(lemR.chest, 300 * LEM_S * zs)) LM.diver(ctx, lemP[0], lemP[1], LEM_S * zs, t, lemO);
    // breathing: quick bursts after the snag
    const bursts = [tLine - .3, tStr - .1]; for (let b = 0; b < 4; b++) bursts.push(tSnag + .15 + b * .55);
    LM.bubbles(ctx, t, lemR.head[0] - 6 * zs, lemR.head[1] - 40 * zs, { bursts, a: .65, s: zs * .8, seed: 7 });

    // the snag point: glint, puff of silt, fibres creaking under the lip
    if (after) {
      const u = t - tSnag;
      LM.glow(ctx, lip[0], lip[1], 110 * zs, '#eaf8ff', .7 * Math.exp(-u * 5));
      ctx.save();
      for (let i = 0; i < 30; i++) {
        const q = -Math.PI * (.05 + .9 * hi(i * 7 + 2)) + Math.PI, sp = (40 + 140 * hi(i * 3)) * zs, r = sp * (1 - Math.exp(-u * 2.2)), a = .5 * Math.exp(-u * 1.4) * (.4 + .6 * hi(i * 5));
        const px = lip[0] + Math.cos(q) * r * 1.2, py = lip[1] + 10 * zs - Math.abs(Math.sin(q)) * r * .35 + u * 12 * zs;
        ctx.fillStyle = rgba('#a9c4bc', a); ctx.beginPath(); ctx.arc(px, py, (1.5 + 3 * hi(i * 11)) * zs, 0, TAU); ctx.fill();
      }
      ctx.lineCap = 'round';
      const cr = P(t, tSnag + .3, d);
      for (let j = 0; j < 7; j++) {
        const on = P(t, tSnag + .35 + j * .16, tSnag + .45 + j * .16); if (on <= 0) continue;
        const q = -Math.PI * .5 + (hi(j * 7) - .5) * 2.2, L1 = (5 + 9 * hi(j * 3)) * zs * on, x0 = lip[0] + (hi(j * 11) - .6) * 14 * zs, y0 = lip[1] + 3 * zs;
        ctx.strokeStyle = rgba(j % 2 ? '#d9cba0' : '#ece6d6', .8 * cr); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(q) * L1, y0 + Math.sin(q) * L1 + 4 * zs); ctx.stroke();
      }
      ctx.restore();
      LM.glow(ctx, lip[0], lip[1], 40 * zs, '#fff1dc', .25 + .2 * Math.abs(Math.sin(t * 23)) * cr);
    }
  }
  worldSnow(ctx, t, c, vy, map, 1, deep);

  // ================= overlays =================
  LM.subBand(ctx, .82);
  const out1 = 1 - P(t, tHis - .55, tHis - .2);
  // generic label on the ship ('배가')
  if (shipR) {
    const a = P(t, tShip - .05, tShip + .2, E.outQ) * out1;
    if (a > 0) { const bp = shipR.bridge, lx = 330, ly = 520, s = lerp(.9, 1, E.outBack(P(t, tShip - .05, tShip + .3)));
      lead(ctx, bp[0] - 10, bp[1] - 10, lx + 70, ly + 22, a, rgba(COL.amber, .7));
      ctx.save(); ctx.translate(lx, ly); ctx.scale(s, s); PK.chip(ctx, '잠수지원선', 0, 0, a, { size: 32, color: '#ffe3b8', border: rgba(COL.amber, .6) }); ctx.restore(); }
    // data.drift with an arrow ('밀려나면서,')
    const da = P(t, tPush - .08, tPush + .15, E.outQ) * out1;
    if (da > 0) {
      const s = lerp(.9, 1, E.outBack(P(t, tPush - .08, tPush + .3))), txt = D.drift || '배가 밀려남', tw = measure(ctx, txt, 38, FONT.sub, 800);
      ctx.save(); ctx.translate(500, 1010); ctx.scale(s, s); PK.chip(ctx, txt, 0, 0, da, { size: 38, color: '#ffffff', border: 'rgba(200,235,255,.55)' }); ctx.restore();
      arrowGlyph(ctx, 500 + tw / 2 + 40, 1010, 120, da, '#e8f6ff', t);
    }
  }
  // data.tag at the snag point ('걸렸습니다.')
  const ta = P(t, tSnag + .02, tSnag + .25, E.outQ);
  if (ta > 0 && bedVis) {
    const lip = st.map(415, -203), txt = D.tag || '튀어나온 금속 구조물에 걸림', sz = 38, tw = measure(ctx, txt, sz, FONT.sub, 900), bw = tw + 60, bh = sz + 34;
    const cx = clamp(lip[0] - 60, bw / 2 + 30, W - bw / 2 - 30), cy = 1118, s = lerp(.86, 1, E.outBack(P(t, tSnag + .02, tSnag + .4)));
    lead(ctx, lip[0], lip[1] + 12 * zs, clamp(lip[0], cx - bw / 2 + 30, cx + bw / 2 - 30), cy - bh / 2, ta, rgba(COL.alarm, .85));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha *= ta;
    ctx.fillStyle = 'rgba(16,8,3,.88)'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12); ctx.fill(); ctx.strokeStyle = rgba(COL.alarm, .8); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = COL.alarm; roundRect(ctx, -bw / 2 + 14, -bh / 2 + 13, 6, bh - 26, 3); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); text(ctx, txt, 10, 2, { size: sz, weight: 900, color: '#ffffff', alpha: ta }); ctx.restore();
  }
};
})();
