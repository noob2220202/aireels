// night (8.84-13.96): "2012년 9월 밤, 크리스 레몬스는 해저 구조물에서 일하고 있었습니다."
// A quick rewind wipe out of the clip (tape streaks, bubbles falling back down, a tracking line wiping the night in), then a
// vertical cross-section of the water column at night: rough swell with the dive support vessel (no name/logo) on top, its
// deck floods, the lift wire down through the dark to the lit diving bell, and below it the lattice structure on the seabed.
// Date chip typed on "2012년", place chip on "밤,". Then the camera PLUNGES through the surface and dives the whole column
// (world-anchored marine snow streaks past, a depth ruler scrolls, a loose depth counter runs to ~90 m) and settles on the
// seabed: the bell (label) hanging above the structure, two helmet lamps working on it — Lemons crouched on the top deck
// (amber life-light, tagged with data.who on "레몬스는"), the second diver beside the lattice with a cold lamp; amber pulses run
// down both umbilicals. Depth chip on landing, the small saturation-diving note on "일하고"; on "있었습니다" the camera pushes
// in on Lemons and the umbilical rising from his helmet (hand-over to the umbilical cutaway). All strings: info.sc.data.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, measure, roundRect, FONT } = L;
const { at, chip } = window.PK;
const LM = window.PK.LM, COL = LM.COL, hi = LM.hi, fb = LM.fb;

// ---------------- world (px at zoom 1): surface y = 0, seabed y = SEABED ----------------
const SEABED = 2650, ST = { x: 470, s: .85 }, BELL = { x: 766, y: 2052, s: .52 }, SHIP = { x: 520, s: .74 };
const LEM = { x: 386, s: .48 }, YUA = { x: 44, s: .48 };
const FY = 850;                                        // screen focal y
const M_PER = SEABED / 90;                             // world px per metre (ruler)

// camera path: surface hold -> plunge -> settle on the seabed -> push in on Lemons
function camAt(t, T, lemHead) {
  const hold = { x: 520, y: 92 - 22 * P(t, 0, T.dive0, E.inOutQ), z: lerp(1.0, 1.08, P(t, 0, T.dive0)) };
  const u = P(t, T.dive0, T.dive1), h = E.outC(u) * E.inOutQ(clamp(u / .16));
  const end = { x: 470, y: 2302, z: 1 };
  let c = { x: lerp(hold.x, end.x, E.inOutQ(u)), y: lerp(hold.y, end.y, h), z: lerp(hold.z, end.z, E.inOutQ(u)) - .2 * Math.sin(Math.PI * clamp(u * 1.08)) };
  // slow settle drift on the seabed, then the push toward Lemons' helmet (umbilical rising above it)
  c.y += 10 * P(t, T.dive1, T.push0, E.inOutQ);
  const pu = E.inOutQ(P(t, T.push0, T.push1));
  if (pu > 0) { c = { x: lerp(c.x, lemHead[0] + 30, pu), y: lerp(c.y, lemHead[1] - 40, pu), z: lerp(c.z, 1.6, pu) }; }
  return Object.assign(c, { h, u });
}

// ---------------- small overlay helpers ----------------
function typedChip(ctx, t, s, x, y, a, p, o = {}) {
  if (a <= 0) return; const size = o.size || 38, full = measure(ctx, s, size, FONT.sub, 800), w = full + 44, h = size + 26;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(3,9,10,.86)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,230,.4)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  const shown = L.typeSub(s, p);
  text(ctx, shown, x - full / 2, y + 2, { size, weight: 800, color: o.color || '#e8f4ff', align: 'left', alpha: a });
  if (p < 1 && p > 0) { const cw = measure(ctx, shown, size, FONT.sub, 800); ctx.save(); ctx.globalAlpha *= a * (Math.sin(t * 40) > 0 ? 1 : .2); ctx.fillStyle = '#8fd3e8'; ctx.fillRect(x - full / 2 + cw + 4, y - size * .42, 3, size * .84); ctx.restore(); }
}
function lead(ctx, x0, y0, x1, y1, a, col = 'rgba(160,220,235,.6)', dot = true) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
  if (dot) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 4.5, 0, 7); ctx.fill(); } ctx.restore();
}
// two-line tag (title line + small line), left-aligned, with an accent bar; returns its box
function tag2(ctx, l1, l2, x, y, a, o = {}) {
  const s1 = o.s1 || 38, s2 = o.s2 || 28, w = Math.max(measure(ctx, l1, s1, FONT.sub, 900), l2 ? measure(ctx, l2, s2, FONT.sub, 700) : 0) + 58, h = l2 ? s1 + s2 + 34 : s1 + 26;
  const box = { x, y, w, h }; if (a <= 0) return box;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(3,8,9,.84)'; roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = o.border || rgba(COL.amber, .55); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = o.accent || COL.amber; roundRect(ctx, x + 16, y + 14, 6, h - 28, 3); ctx.fill(); ctx.restore();
  text(ctx, l1, x + 36, y + 13 + s1 * .55, { size: s1, weight: 900, color: o.c1 || '#fff', align: 'left', alpha: a });
  if (l2) text(ctx, l2, x + 36, y + 20 + s1 + s2 * .55, { size: s2, weight: 700, color: o.c2 || '#ffd9a0', align: 'left', alpha: a });
  return box;
}
// split "A (B)" -> ["A", "(B)"]; "A · B" -> ["A", "B"]
function split2(s) { const i = s.indexOf(' ('); if (i > 0) return [s.slice(0, i), s.slice(i + 1)]; const j = s.indexOf(' · '); if (j > 0) return [s.slice(0, j), s.slice(j + 3)]; return [s, '']; }

// ---------------- rewind wipe (out of the clip) ----------------
function rewindFX(ctx, t, k, wipeY) {
  if (k <= .002) return;
  ctx.save();
  // below the wiping tracking line: the rewinding tape (dark, noisy); above it the night is already there
  ctx.fillStyle = `rgba(1,3,4,${.9 * k})`; ctx.fillRect(0, wipeY, W, H - wipeY);
  ctx.lineCap = 'round';
  for (let i = 0; i < 44; i++) {           // bubbles streaking DOWN (time running backwards)
    const z = .45 + hi(i * 11 + 3) * .55, y = ((hi(i * 7 + 1) * (H + 300) + t * 5200 * z) % (H + 300)) - 150;
    const x = hi(i * 3 + 5) * W + Math.sin(t * 9 + i) * 10, len = (40 + 260 * k) * z, r = 3 + 9 * z * hi(i * 13), a = (.14 + .3 * z) * k;
    ctx.strokeStyle = rgba('#d8f6ff', a * .35); ctx.lineWidth = r * .9; ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y - r); ctx.stroke();
    ctx.strokeStyle = rgba('#e8f6ff', a * 1.3); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {            // VHS tracking bands rolling up
    const bh = 26 + hi(i * 17) * 110, y = ((hi(i * 13 + 2) * H - t * 5200 * (1 + hi(i))) % H + H) % H;
    const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, rgba('#cfeaff', .12 * k)); g.addColorStop(1, 'rgba(207,234,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y, W, bh); ctx.fillStyle = rgba('#e8f6ff', .3 * k); ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = rgba('#ff4a55', .14 * k); ctx.fillRect(0, y + 4, W, 1.5); ctx.fillStyle = rgba('#3fe0ff', .14 * k); ctx.fillRect(0, y - 3, W, 1.5);
  }
  const f = Math.floor(t * 30);           // horizontal tear strips (shifted copies of the frame)
  if (k > .3 && t > .25) for (let i = 0; i < 2; i++) {     // (not inside the dip: self-copies of an offscreen buffer are slow)
    const y = Math.floor(470 + hi(f * 7 + i * 31) * 760), h = Math.floor(14 + hi(f * 3 + i) * 46), off = Math.round((hi(f * 5 + i * 9) - .5) * 140 * k);
    ctx.drawImage(ctx.canvas, 0, y, W, h, off, y, W, h);
  }
  // the wiping tracking line itself
  if (wipeY < H) {
    const g = ctx.createLinearGradient(0, wipeY - 90, 0, wipeY + 6); g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(1, rgba('#d8f2ff', .22 * k + .1));
    ctx.fillStyle = g; ctx.fillRect(0, wipeY - 90, W, 96); ctx.fillStyle = rgba('#f0faff', .75); ctx.fillRect(0, wipeY - 1, W, 3);
    ctx.fillStyle = rgba('#ff4a55', .35); ctx.fillRect(0, wipeY + 3, W, 1.5); ctx.fillStyle = rgba('#3fe0ff', .35); ctx.fillRect(0, wipeY - 5, W, 1.5);
  }
  // ◀◀
  const ia = clamp(k * 2.2) * (Math.sin(t * 22) > -.4 ? 1 : .35);
  if (ia > 0) {
    LM.glow(ctx, 556, 760, 90, '#7fd6ff', .5 * ia);
    ctx.globalAlpha = ia; ctx.fillStyle = '#e8f6ff';
    for (const dx of [0, -40]) { ctx.beginPath(); ctx.moveTo(574 + dx + 21, 760 - 24); ctx.lineTo(574 + dx - 19, 760); ctx.lineTo(574 + dx + 21, 760 + 24); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

// ---------------- world-anchored marine snow (streaks while the camera plunges) ----------------
function worldSnow(ctx, t, c, vy, map, layer) {
  const CELL = layer ? 230 : 150, n = layer ? 1 : 2, z = c.z;
  const wx0 = c.x - 600 / z, wx1 = c.x + 600 / z, wy0 = c.y - (FY + 60) / z, wy1 = c.y + (H - FY + 60) / z;
  const sl = clamp(Math.abs(vy) * z / 30 * (layer ? 1.6 : .8), 0, layer ? 220 : 120);
  const deep = clamp(c.y / 2200);
  ctx.save(); ctx.lineCap = 'round';
  for (let j = Math.floor(wy0 / CELL); j <= Math.floor(wy1 / CELL); j++) for (let i = Math.floor(wx0 / CELL); i <= Math.floor(wx1 / CELL); i++) {
    for (let k = 0; k < n; k++) {
      const id = (i * 7919 + j * 104729 + k * 31 + (layer ? 5003 : 0)) | 0;
      const wx = (i + hi(id)) * CELL + fb(t * .12 + hi(id + 3) * 9, id) * 24, wy = (j + hi(id + 1)) * CELL + fb(t * .1 + hi(id + 4) * 9, id + 7) * 20 + t * 6 * hi(id + 5);
      const [sx, sy] = map(wx, wy); if (sx < -20 || sx > W + 20 || sy < -40 || sy > H + 40) continue;
      const r = (layer ? 2.6 + 4 * hi(id + 2) : .9 + 1.6 * hi(id + 2)) * Math.max(.7, z);
      const a = (layer ? .14 : .22 + .2 * hi(id + 6)) * (1 - .45 * deep) * (.7 + .3 * Math.sin(t * 1.4 + id));
      if (sl > 3) {
        ctx.strokeStyle = rgba(COL.snow, Math.min(.6, a * clamp(18 / (sl + 6) + .55))); ctx.lineWidth = r * 1.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + sl * Math.sign(vy)); ctx.stroke();
      } else { ctx.fillStyle = rgba(COL.snow, a); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
    }
  }
  ctx.restore();
}
// plunge bubbles just under the surface (world-anchored, rising)
function plungeBubbles(ctx, t, map, z, a) {
  if (a <= 0) return; ctx.save(); ctx.lineWidth = 2;
  for (let i = 0; i < 38; i++) {
    const wx = 250 + hi(i * 5 + 1) * 560, wy = 40 + hi(i * 7 + 2) * 520 - t * (30 + 50 * hi(i)), r = (4 + 14 * hi(i * 3)) * z;
    const [sx, sy] = map(wx + Math.sin(t * 3 + i) * 8, wy); if (sy < -30 || sy > H + 30) continue;
    ctx.strokeStyle = rgba('#d8f4ff', .45 * a); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', .35 * a); ctx.beginPath(); ctx.arc(sx - r * .35, sy - r * .35, r * .3, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// depth ruler (left edge): world-anchored ticks every 5 m + a loose counter during the dive
function ruler(ctx, t, c, a, val, va) {
  if (a <= 0) return; const x = 54;
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, 470, 0, 1230); g.addColorStop(0, 'rgba(150,210,225,0)'); g.addColorStop(.12, 'rgba(150,210,225,.5)'); g.addColorStop(.88, 'rgba(150,210,225,.5)'); g.addColorStop(1, 'rgba(150,210,225,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 1, 470, 2, 760);
  for (let m = 0; m <= 95; m += 5) {
    const y = FY + (m * M_PER - c.y) * c.z; if (y < 480 || y > 1220) continue;
    const e = Math.min(1, (y - 470) / 90, (1230 - y) / 90), big = m % 10 === 0;
    ctx.fillStyle = rgba('#a8d8e4', (big ? .7 : .4) * e); ctx.fillRect(x, y - 1, big ? 22 : 12, 2);
  }
  ctx.restore();
  if (va > 0) {
    ctx.save(); ctx.globalAlpha *= a * va;
    ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.moveTo(x + 26, FY); ctx.lineTo(x + 40, FY - 9); ctx.lineTo(x + 40, FY + 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, Math.round(val) + 'm', x + 48, FY + 2, { size: 50, weight: 900, color: '#e8f6ff', align: 'left', alpha: a * va, stroke: 'rgba(0,0,0,.7)', strokeW: 8 });
    text(ctx, '수심', x + 50, FY - 42, { size: 26, weight: 700, color: '#9fc6d0', align: 'left', alpha: a * va });
  }
}

window.PK.scenes.night = function (ctx, t, d, info) {
  // incoming half of the dip only ever shows the outgoing scene
  if (t < 0) return;
  const D = info.sc.data || {};
  const tYr = at(info, '2012년', .02), tSep = at(info, '9월', .17), tNight = at(info, '밤,', .22), tLem = at(info, '레몬스는', .4);
  const tSea = at(info, '해저', .53), tStr = at(info, '구조물에서', .6), tWork = at(info, '일하고', .72), tWas = at(info, '있었습니다', .78);
  const T = { dive0: tNight + .1, dive1: tSea + .12, push0: tWas + .05, push1: d + .25 };

  // ---- world geometry (null passes: positions + lights only) ----
  const lemO = { pose: 'crouch', dir: 1, anchor: 'base', life: 1, lamp: .9, bpm: 64, lifeS: .75, bailout: true, rim: '#9fd0e4', rimDir: -2.0, halo: .26, idle: 1,
    adj: { na: [1.05, .9], fa: [.9, 1.05] } };
  const yuaO = { pose: 'stand', dir: 1, anchor: 'base', lamp: 1, lampAng: .42, bailout: true, rim: '#cfe8ff', rimDir: -2.4, halo: .2, phase: 1.7, idle: 1,
    adj: { na: [1.32, .34], fa: [1.0, .5], T: .14 } };
  const stW = LM.structure(null, ST.x, SEABED, ST.s, t);
  const lemW = LM.diver(null, LEM.x, stW.topY + 3, LEM.s, t, lemO);
  const c = camAt(t, T, lemW.head);
  const sh = LM.shake(t, .45 + .6 * Math.sin(Math.PI * c.u), 7), jt = LM.jolt(t, T.dive0 + .2, .6);
  const ox = sh.x + jt.x, oy = sh.y + jt.y;
  const map = (wx, wy) => [540 + (wx - c.x) * c.z + ox, FY + (wy - c.y) * c.z + oy];
  const zs = c.z;
  // camera vertical velocity (world px/s) for streaks
  const c2 = camAt(t + 1 / 60, T, lemW.head), vy = (c2.y - c.y) * 60;

  // ---- screen-space components ----
  const surfY = map(0, 0)[1], bedY = map(0, SEABED)[1];
  const shipP = map(SHIP.x, 6 * Math.sin(t * 1.05)), roll = .035 * Math.sin(t * .9 + .4);
  const shipO = { under: 1, lights: 1, roll, thrust: .3, rim: '#8fb4c2' };
  const shipR = surfY > -500 ? LM.ship(null, shipP[0], shipP[1], SHIP.s * zs, t, shipO) : null;
  const bellP = map(BELL.x, BELL.y), bellO = { glow: 1, hatch: .9, lamps: .75, swing: .025 * Math.sin(t * .55), amb: .2 };
  const bellR = LM.bell(null, bellP[0], bellP[1], BELL.s * zs, t, bellO);
  const mp = shipR ? shipR.moonpool : map(SHIP.x + 15, 50);
  bellO.wireTop = mp[1]; bellO.wireDx = mp[0] - bellR.wire[0];
  const bedVis = bedY < H + 420;
  const stP = map(ST.x, SEABED);
  const lemP = map(LEM.x, stW.topY + 3), yuaP = map(YUA.x, SEABED + 2);
  const lemR = bedVis ? LM.diver(null, lemP[0], lemP[1], LEM.s * zs, t, lemO) : null;
  const yuaR = bedVis ? LM.diver(null, yuaP[0], yuaP[1], YUA.s * zs, t, yuaO) : null;
  const onS = (p, r) => p[0] > -r && p[0] < W + r && p[1] > -r && p[1] < H + r;
  const lights = [].concat(shipR ? shipR.lights : [], bellR.lights, lemR ? lemR.lights : [], yuaR ? yuaR.lights : []);
  const deep = clamp(c.y / 2200), bellLamps = bellR.lights.slice(2);   // frame-lamp beams draw their own lit silt

  // during the rewind wipe only the part above the tracking line shows the night (the rest is tape noise): skip drawing it
  const wipeY = lerp(-20, H + 20, E.inOutQ(P(t, .02, .5))), clipW = t < .5;
  if (clipW) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.max(1, wipeY + 2)); ctx.clip(); }

  // ---- water ----
  LM.sea(ctx, t, { dark: lerp(.3, .55, deep), lights: lights.filter(L2 => !bellLamps.includes(L2) && onS([L2.x, L2.y], L2.r)), seed: 3, snow: .55, murk: .9, haze: .9, current: [-4, 0],
    surface: .9 * (1 - deep), surfaceY: surfY + 10, surfaceColor: '#a99a74', top: '#15363b', mid: '#0a1c1d', bottom: '#020808' });

  // ---- surface: night sky, rough swell, the ship (hull seen through the water) ----
  if (surfY > -260 && shipR) {
    LM.swell(ctx, surfY, t, 25 * zs, { caps: .85, under: .55, seed: 2 });
    LM.ship(ctx, shipP[0], shipP[1], SHIP.s * zs, t, shipO);
    LM.swell(ctx, surfY, t, 25 * zs, { front: true, sky: false, caps: .6, under: 0, seed: 2, a: .8 });
    // amber glints of the deck floods on the swell
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const yA = LM.swell(null, surfY, t, 25 * zs, { seed: 2 });
    for (let i = 0; i < 22; i++) {
      const gx = shipP[0] + (hi(i * 3) - .5) * 760 * zs + Math.sin(t * .8 + i) * 20, gy = yA(gx) + 3 + hi(i * 5) * 50 * zs, ph = .5 + .5 * Math.sin(t * 3.1 + i * 2.2);
      ctx.fillStyle = rgba(COL.amber, .25 * ph * (1 - Math.abs(gx - shipP[0]) / (420 * zs))); ctx.fillRect(gx - 9 * zs, gy, 18 * zs, 2);
    }
    ctx.restore();
  }
  plungeBubbles(ctx, t, map, zs, P(t, T.dive0 + .05, T.dive0 + .25) * (1 - P(t, T.dive0 + .7, T.dive0 + 1.1)));
  worldSnow(ctx, t, c, vy, map, 0);

  // ---- bell on its wire ----
  LM.bell(ctx, bellP[0], bellP[1], BELL.s * zs, t, bellO);
  // the lift wire: a thin lit guide line through the column (the camera follows it down)
  { const w0 = [mp[0], Math.max(-20, mp[1])], w1 = bellR.wire; if (w1[1] > -20 && w0[1] < H + 20) { ctx.save(); ctx.strokeStyle = rgba('#b8d4da', .26); ctx.lineWidth = Math.max(1.5, 2.6 * zs); ctx.beginPath(); ctx.moveTo(lerp(mp[0], w1[0], (w0[1] - mp[1]) / Math.max(1, w1[1] - mp[1])), w0[1]); ctx.lineTo(w1[0], Math.min(H + 20, w1[1])); ctx.stroke(); ctx.restore(); } }
  // the lift wire, a little brighter near the floods
  if (surfY > -200) { const g = ctx.createLinearGradient(0, mp[1], 0, mp[1] + 500 * zs); g.addColorStop(0, rgba('#ffd9a0', .35)); g.addColorStop(1, 'rgba(255,217,160,0)'); ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 2.5 * zs; ctx.beginPath(); ctx.moveTo(mp[0], mp[1]); ctx.lineTo(bellR.wire[0] + bellO.wireDx, mp[1] + 500 * zs); ctx.stroke(); ctx.restore(); }

  // ---- seabed, structure, umbilicals, divers ----
  if (bedVis) {
    if (bedY < H - 60) LM.seabed(ctx, bedY, t, { dark: .45, lights, cam: [(c.x - 470) * zs, 0], seed: 4 });
    const st = LM.structure(ctx, stP[0], stP[1], ST.s * zs, t, { lights, amb: .1 });
    // umbilicals from the bell's exit: Lemons' hangs down past the bucket side and curls up over the deck edge
    const ex = bellR.exit, pu = .55 + .25 * P(t, tWork - .3, tWork + .3);
    const lemPts = [ex, [ex[0] + 26 * zs, ex[1] + 120 * zs], [st.topR[0] - 10 * zs, st.topY - 6 * zs], [lerp(st.topR[0], lemR.umb[0], .55), st.topY - 12 * zs], [lemR.umb[0] + 46 * zs, lemR.umb[1] + 28 * zs], lemR.umb];
    const yuaPts = [[ex[0] - 14 * zs, ex[1]], [ex[0] - 120 * zs, ex[1] + 70 * zs], [st.topL[0] + 60 * zs, st.topY - 60 * zs], [yuaR.umb[0] + 70 * zs, yuaR.umb[1] - 60 * zs], yuaR.umb];
    LM.umbilical(ctx, yuaPts, t + 1.3, { w: 9 * zs, lit: .35, sag: 30 * zs, pulse: .45, pulseSpeed: 260 * zs, glow: .15, sway: 5 });
    LM.umbilical(ctx, lemPts, t, { w: 10 * zs, lit: .5, sag: 40 * zs, pulse: pu, pulseSpeed: 300 * zs, glow: .35, sway: 5 });
    // (a diver pushed out of frame still throws his lamp beam into it)
    const dv = (P0, s0, o, R0) => { if (onS(R0.chest, 300 * s0)) LM.diver(ctx, P0[0], P0[1], s0, t, o); else if (o.lamp) LM.lampBeam(ctx, t, R0.lamp[0], R0.lamp[1], R0.lampAng, o.lamp, { len: 820 * s0, spread: .27, s: Math.max(.4, s0), seed: 9 }); };
    dv(yuaP, YUA.s * zs, yuaO, yuaR); dv(lemP, LEM.s * zs, lemO, lemR);
    // working breaths: exhaled bubbles from both helmets
    LM.bubbles(ctx, t, lemR.head[0] + 12 * zs, lemR.head[1] - 40 * zs, { every: 3.1, from: tWork - .25, a: .7, s: zs * .8, seed: 5 });
    LM.bubbles(ctx, t, yuaR.head[0] + 8 * zs, yuaR.head[1] - 40 * zs, { every: 3.4, from: tWork + .9, a: .5, s: zs * .7, seed: 9 });
  }
  worldSnow(ctx, t, c, vy, map, 1);

  // ---- overlays ----
  LM.subBand(ctx, .82);
  const quiet = P(t, T.push0 + .1, T.push0 + .6);      // labels clear for the push-in
  // depth ruler + loose counter (dive only), then the depth chip on landing
  ruler(ctx, t, c, P(t, T.dive0 - .1, T.dive0 + .15) * (1 - P(t, tStr + .2, tStr + .6)), 90 * c.h, 1 - P(t, tSea + .25, tSea + .5));
  // date (typed on "2012년"), top slot
  const dA = P(t, tYr - .1, tYr + .1) * (1 - P(t, T.dive0 + .2, T.dive0 + .45));
  typedChip(ctx, t, D.date || '2012.9.18 (화) 밤', 540, 530, dA, P(t, tYr - .02, tSep + .2), { size: 44 });
  // place (on "밤,"), lower slot
  const pA = P(t, tNight - .12, tNight + .12, E.outQ) * (1 - P(t, tLem + .3, tLem + .55));
  const ps = lerp(.9, 1, E.outBack(P(t, tNight - .12, tNight + .2)));
  ctx.save(); ctx.translate(540, 1182); ctx.scale(ps, ps); chip(ctx, D.place || '북해 헌팅턴 유전 · 애버딘 동쪽 약 200km', 0, 0, pA, { size: 33, color: '#fff', border: 'rgba(255,217,160,.55)' }); ctx.restore();
  // depth chip on landing ("해저"), lower slot
  const deA = P(t, tSea, tSea + .25, E.outQ) * (1 - quiet);
  const ds = lerp(.9, 1, E.outBack(P(t, tSea, tSea + .32)));
  ctx.save(); ctx.translate(540, 1182); ctx.scale(ds, ds); chip(ctx, D.depth || '수심 약 90m (보도에 따라 80~100m)', 0, 0, deA, { size: 33, color: '#e8f6ff', border: 'rgba(160,220,235,.5)' }); ctx.restore();
  // bell label (as the bell settles into frame), left of the bell
  const bA = P(t, tLem - .45, tLem - .2) * (1 - P(t, tWork - .35, tWork - .1)) * clamp((1000 - bellP[1]) / 160);
  if (bA > 0) {
    const bp = [bellP[0] - 96 * zs, bellP[1] - 40 * zs], lx = bp[0] - 110, ly = bp[1] - 84;
    lead(ctx, bp[0], bp[1], lx + 60, ly + 24, bA, rgba(COL.amber, .7));
    const bs = lerp(.9, 1, E.outBack(P(t, tLem - .45, tLem - .1)));
    ctx.save(); ctx.translate(lx, ly); ctx.scale(bs, bs); chip(ctx, D.bell || '다이빙 벨', 0, 0, bA, { size: 32, color: '#ffe3b8', border: rgba(COL.amber, .6) }); ctx.restore();
  }
  // Lemons: amber who-tag on "레몬스는" with a leader to his life-light
  if (lemR) {
    const wA = P(t, tLem - .05, tLem + .2, E.outQ) * (1 - quiet);
    const [l1, l2] = (() => { const s = D.who || '포화잠수사 크리스 레몬스 (당시 32세)'; const i = s.indexOf(' ('); return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, '']; })();
    const bx = 44, by = 628, ts = lerp(.92, 1, E.outBack(P(t, tLem - .05, tLem + .3)));
    if (wA > 0) {
      const box = tag2(ctx, l1, l2, 0, 0, 0, { s1: 38, s2: 28 });
      const ax = bx + box.w - 40, ay = by + box.h;
      lead(ctx, lemR.chest[0], lemR.chest[1] - 18 * zs, ax, ay, wA, rgba(COL.amber, .75));
      ctx.save(); ctx.translate(bx, by); ctx.scale(ts, ts); tag2(ctx, l1, l2, 0, 0, wA, { s1: 38, s2: 28 }); ctx.restore();
    }
  }
  // saturation-diving note (on "일하고"), top slot
  const nA = P(t, tWork - .15, tWork + .15, E.outQ) * (1 - P(t, d - .05, d + .2));
  if (nA > 0) {
    const [n1, n2] = split2(D.note || '포화잠수: 몇 주씩 고압 챔버에서 생활 · 곧장 수면으로 올라올 수 없음');
    const w = Math.max(measure(ctx, n1, 30, FONT.sub, 800), measure(ctx, n2, 30, FONT.sub, 800)) + 50, h = 94, ns = lerp(.94, 1, E.outBack(P(t, tWork - .15, tWork + .25)));
    ctx.save(); ctx.translate(540, 520); ctx.scale(ns, ns); ctx.globalAlpha *= nA; ctx.fillStyle = 'rgba(3,8,9,.84)'; roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,235,.38)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(540, 520); ctx.scale(ns, ns);
    text(ctx, n1, 0, -20, { size: 30, weight: 800, color: '#e8f6ff', alpha: nA }); text(ctx, n2, 0, 22, { size: 30, weight: 800, color: '#9fd0dc', alpha: nA });
    ctx.restore();
  }
  // plunge: a cold flash band as the camera breaks the surface
  const pl = P(t, T.dive0 + .08, T.dive0 + .16) * (1 - P(t, T.dive0 + .16, T.dive0 + .5));
  if (pl > 0) L.flash(ctx, .1 * pl, '#cfeaff');
  if (clipW) ctx.restore();
  // rewind wipe (first ~0.55 s)
  const rk = 1 - P(t, .18, .55, E.inQ);
  rewindFX(ctx, t, rk, wipeY);
};
})();
