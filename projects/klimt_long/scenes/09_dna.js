// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;
const ITALY_ = () => window.KL.ITALY;

// ---------------------------------------------------------------------------
// "훗날 액자에 남은 DNA로 재수사했지만 소득은 없었다."  (3.8 s, forensic lab, eye level)
// Beats (anchored to narration words):
//  fade-in   the empty gold frame (the one left on the roof) on a lab table, cool overhead light, camera creeping in
//  훗날       year odometer rolls 1997 → 2014 under the title
//  액자에     room lights drop, a technician (silhouette, lab coat) clicks on a UV torch; the beam starts sweeping the frame
//  남은       glowing traces bloom on the gilt wherever the beam passes; glasses glint
//  DNA로      (on the word) the beam has settled on one trace: lock-on brackets, odometer ticks 2014 → 2016; the trace lifts
//            off as particles that stream right — the camera follows them to the analysis monitor, where a double helix
//            assembles (helix drawing from the word onset, complete ~0.4 s in)
//  재수사했지만 approved chip "2014 재수사 · 2016 액자 DNA 흔적"; the sample profile is analysed (scrolling band columns, scan line)
//  소득은      the comparison stops dead: monitor glitch, helix greys out and unzips, camera pulls back to the whole room;
//            approved result card "결정적 단서 없음"
//  없었다      the technician lowers the torch, UV clicks off, the traces fade one by one, the room goes cold and dark
// ---------------------------------------------------------------------------

let S = null;
const BG = { x: -560, y: -220, w: 2240, h: 1960 };       // lab backdrop sprite world rect
const TABLE = { x0: 240, top: 1030, front: 1082 };
const FR = { x: 520, y: 800, w: 420, h: 475 };             // the empty frame (T.frame 760x860)
const MON = { x: 1150, y: 768, w: 380, h: 470 };           // analysis monitor (screen centre)
const TECH = { x: 140, y: 1340, h: 830 };
const rel = (u, v) => [FR.x + u * FR.w, FR.y + v * FR.h];      // frame-relative → world
const TR = [[-.445, -.22, 1.0, 0], [-.12, -.455, .8, 1], [.3, -.452, .9, 2], [-.44, .3, 1.0, 1], [.06, .455, .8, 0], [.445, .17, .85, 2], [.445, -.2, 1.4, 0]]
  .map(([u, v, s, k]) => [...rel(u, v), s, k]); // glowing traces on the gilt (last = the sampled one)
const MAIN = TR.length - 1;

// ---------- small utils ----------
const tri = (t, t0, t1) => { const p = clamp((t - t0) / (t1 - t0)); return Math.sin(p * Math.PI); };
const pulse = (t, t0, k = 8) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));
function camAt(keys, t) { // Catmull-Rom through [t, ...values]
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
  for (let j = 1; j < k1.length; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
  return out;
}

// ---------- sprites (built once) ----------
function makeLab() {
  const [c, x] = mk(BG.w, BG.h); x.translate(-BG.x, -BG.y); const R = rng(909);
  let g = x.createLinearGradient(0, BG.y, 0, TABLE.top + 100); g.addColorStop(0, '#0a0918'); g.addColorStop(.55, '#100e22'); g.addColorStop(1, '#0a0914');
  x.fillStyle = g; x.fillRect(BG.x, BG.y, BG.w, BG.h);
  for (let px = BG.x; px < BG.x + BG.w; px += 236) { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(px, BG.y, 4, BG.h); x.fillStyle = 'rgba(170,150,255,.03)'; x.fillRect(px + 4, BG.y, 2, BG.h); }
  for (let i = 0; i < 12000; i++) { x.fillStyle = `rgba(${R() < .5 ? '190,180,255' : '0,0,0'},${R() * .035})`; x.fillRect(BG.x + R() * BG.w, BG.y + R() * BG.h, 2, 2); }
  // window with blinds (cold night-blue spill is avoided: it's a dim interior window)
  x.fillStyle = '#0d1424'; x.fillRect(720, 180, 300, 330);
  for (let y = 186; y < 506; y += 18) { x.fillStyle = 'rgba(120,140,190,.22)'; x.fillRect(724, y, 292, 9); }
  x.strokeStyle = '#05060b'; x.lineWidth = 12; x.strokeRect(714, 174, 312, 342);
  // shelving with bottles and jars (left + right)
  const shelf = (x0, x1, ys) => {
    for (const sy of ys) {
      x.fillStyle = '#06050c'; x.fillRect(x0, sy, x1 - x0, 12); x.fillStyle = 'rgba(170,150,255,.08)'; x.fillRect(x0, sy, x1 - x0, 2);
      for (let bx = x0 + 10; bx < x1 - 30;) {
        const bw = 22 + R() * 46, bh = 40 + R() * 90, kind = R();
        x.fillStyle = `rgb(${10 + R() * 10},${10 + R() * 10},${20 + R() * 16})`;
        if (kind < .4) { roundRect(x, bx, sy - bh, bw, bh, 6); x.fill(); x.fillRect(bx + bw * .3, sy - bh - 14, bw * .4, 16); }
        else if (kind < .7) { x.beginPath(); x.moveTo(bx + bw * .35, sy - bh); x.lineTo(bx + bw * .65, sy - bh); x.lineTo(bx + bw * .65, sy - bh * .55); x.lineTo(bx + bw, sy); x.lineTo(bx, sy); x.lineTo(bx + bw * .35, sy - bh * .55); x.closePath(); x.fill(); }
        else { x.fillRect(bx, sy - bh * .6, bw, bh * .6); }
        if (R() < .5) { x.fillStyle = `rgba(${R() < .5 ? '150,120,255' : '90,220,255'},.10)`; x.fillRect(bx + 3, sy - bh * .45, bw - 6, bh * .3); }
        bx += bw + 8 + R() * 24;
      }
    }
  };
  shelf(-520, 160, [380, 600, 820]);
  shelf(1330, 1660, [360, 580]);
  // tall cabinet with glass doors (right)
  x.fillStyle = '#07060e'; x.fillRect(1380, 640, 260, 420); x.strokeStyle = 'rgba(170,150,255,.12)'; x.lineWidth = 3; x.strokeRect(1395, 655, 110, 380); x.strokeRect(1515, 655, 110, 380);
  x.strokeStyle = 'rgba(200,190,255,.06)'; x.lineWidth = 16; x.beginPath(); x.moveTo(1405, 1000); x.lineTo(1495, 700); x.stroke();
  // equipment LEDs (bokeh after the blur)
  for (let i = 0; i < 18; i++) { const lx = -480 + R() * 2100, ly = 260 + R() * 700, col = ['#5fe3ff', '#7dffb0', '#ff6b6b', '#b69cff'][Math.floor(R() * 4)]; const rg = x.createRadialGradient(lx, ly, 0, lx, ly, 14); rg.addColorStop(0, rgba(col, .8)); rg.addColorStop(1, rgba(col, 0)); x.fillStyle = rg; x.fillRect(lx - 14, ly - 14, 28, 28); }
  // floor under the table
  g = x.createLinearGradient(0, TABLE.top, 0, BG.y + BG.h); g.addColorStop(0, '#08070f'); g.addColorStop(1, '#030306'); x.fillStyle = g; x.fillRect(BG.x, TABLE.top + 80, BG.w, BG.h);
  const [c2, x2] = mk(BG.w, BG.h); x2.filter = 'blur(5px)'; x2.drawImage(c, 0, 0); x2.filter = 'none';
  return c2;
}
function makeSmudge(seed) { // glowing trace blob (UV fluorescence)
  const [c, x] = mk(128, 128); const R = rng(seed); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const px = 64 + (R() - .5) * 34, py = 64 + (R() - .5) * 26, r = 8 + R() * 16;
    const g = x.createRadialGradient(px, py, 0, px, py, r * 2.2); g.addColorStop(0, 'rgba(225,215,255,.55)'); g.addColorStop(.35, 'rgba(160,130,255,.3)'); g.addColorStop(1, 'rgba(120,80,255,0)');
    x.fillStyle = g; x.save(); x.translate(px, py); x.rotate(R() * 3); x.scale(1, .55 + R() * .4); x.translate(-px, -py); x.fillRect(px - r * 2.2, py - r * 2.2, r * 4.4, r * 4.4); x.restore();
  }
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(235,230,255,${.3 + R() * .5})`; x.beginPath(); x.arc(64 + (R() - .5) * 50, 64 + (R() - .5) * 40, .8 + R() * 2, 0, 7); x.fill(); }
  return c;
}
function build() {
  S = { lab: makeLab(), sm: [makeSmudge(1), makeSmudge(2), makeSmudge(3)] };
}

// ---------- monitor content (drawn into a small buffer every frame) ----------
const SW = 380, SH = 470;
const bandsOf = (seed, n = 13) => { const a = []; for (let i = 0; i < n; i++) a.push([78 + hash(seed * 31 + i * 7) * 300, 3 + hash(seed * 17 + i * 3) * 7]); return a; };
const SAMPLE = bandsOf(5);
function drawHelixScreen(x, t, cx, top, bot, prog, sat, unzip) {
  const n = 18, pts = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), yy = lerp(top, bot, k), ph = t * 2.4 * (1 - .8 * unzip) + k * 7.5;
    const a = clamp((prog * (n + 3) - i) / 3); if (a <= 0) continue;
    const s = Math.sin(ph) * 52, z = Math.cos(ph), fall = unzip * unzip * (60 + hash(i * 9) * 120);
    pts.push([i, yy, s, z, a, fall]);
  }
  const col = (h, l, al) => sat > .5 ? `hsla(${h},95%,${l}%,${al})` : `hsla(${h},${Math.round(95 * sat * 2)}%,${l * .8}%,${al})`;
  // rungs
  for (const [i, yy, s, z, a, fall] of pts) {
    const ra = a * (1 - clamp(unzip * 1.4 - hash(i) * .4));
    if (ra > 0) { x.strokeStyle = col(i % 2 ? 255 : 190, 70, (.25 + .35 * Math.abs(z)) * ra); x.lineWidth = 4; x.beginPath(); x.moveTo(cx + s * .92, yy + fall * .2); x.lineTo(cx - s * .92, yy + fall * .4); x.stroke(); }
  }
  // backbones
  for (const side of [1, -1]) {
    x.strokeStyle = col(side > 0 ? 258 : 192, 72, .9); x.lineWidth = 3.5; x.beginPath();
    pts.forEach(([i, yy, s, z, a, fall], j) => { const px = cx + side * s + side * unzip * 26, py = yy + (side > 0 ? fall * .15 : fall * .3); j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    for (const [i, yy, s, z, a, fall] of pts) {
      const zz = side * z, px = cx + side * s + side * unzip * 26, py = yy + (side > 0 ? fall * .15 : fall * .3);
      x.fillStyle = col(side > 0 ? 258 : 192, zz > 0 ? 82 : 52, a); x.beginPath(); x.arc(px, py, (6 + 2.5 * zz) * E.outBack(a), 0, 7); x.fill();
    }
  }
}
function drawScreen(t, tm) {
  const [b, x] = buf('dnaScreen', SW, SH);
  const g = x.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#120c2a'); g.addColorStop(1, '#07051a'); x.fillStyle = g; x.fillRect(0, 0, SW, SH);
  x.strokeStyle = 'rgba(160,140,255,.07)'; x.lineWidth = 1; for (let i = 0; i < SW; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, SH); x.stroke(); } for (let i = 0; i < SH; i += 24) { x.beginPath(); x.moveTo(0, i); x.lineTo(SW, i); x.stroke(); }
  const on = tm.boot;
  x.globalAlpha = on;
  text(x, 'DNA PROFILE', 18, 30, { size: 22, family: FONT.type, weight: 400, color: '#bfaeff', align: 'left' });
  if (Math.floor(t * 3) % 2 === 0 || tm.dead > 0) { x.fillStyle = tm.dead > 0 ? '#ff4a52' : '#7dffb0'; x.beginPath(); x.arc(SW - 24, 30, 6, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(190,175,255,.25)'; x.fillRect(16, 48, SW - 32, 2);
  // helix (left)
  drawHelixScreen(x, t, 92, 82, 400, tm.helix, 1 - tm.dead, tm.unzip);
  x.fillStyle = 'rgba(190,175,255,.18)'; x.fillRect(176, 70, 2, 350);
  // sample ladder
  const lad = (lx, bands, a, colr) => { x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(lx - 22, 72, 44, 336); for (const [by, bh] of bands) { x.fillStyle = rgba(colr, a); x.fillRect(lx - 18, by, 36, bh); } };
  const sa = tm.sample;
  if (sa > 0) {
    x.save(); x.beginPath(); x.rect(0, 70, SW, 340 * sa + 2); x.clip(); lad(212, SAMPLE, .9, tm.dead > 0 ? '#9b9bb0' : '#d8ccff'); x.restore();
    text(x, 'SAMPLE', 212, 428, { size: 15, family: FONT.type, weight: 400, color: '#a898e0' });
  }
  // database records scrolling past (compare)
  if (tm.db > 0) {
    x.save(); x.globalAlpha *= tm.db; x.beginPath(); x.rect(236, 70, SW - 250, 340); x.clip();
    const sc = tm.scroll;
    for (let col = 0; col < 2; col++) {
      const lx = 280 + col * 64;
      for (let r = -1; r < 3; r++) {
        const idx = Math.floor(sc / 340) + r + col * 7, oy = r * 340 - (sc % 340);
        x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(lx - 22, oy + 72, 44, 330);
        bandsOf(idx + 11).forEach(([by, bh], k) => {
          const mis = tm.dead <= 0 && hash(idx * 13 + k + Math.floor(t * 14)) > .78;
          x.fillStyle = mis ? 'rgba(255,74,82,.9)' : (tm.dead > 0 ? 'rgba(130,130,150,.6)' : 'rgba(150,200,255,.75)'); x.fillRect(lx - 18, by + oy, 36, bh);
        });
      }
    }
    x.restore();
    if (tm.dead <= 0) { // comparison line
      const ly = 80 + ((t * 1.6) % 1) * 320; x.fillStyle = 'rgba(125,255,176,.55)'; x.fillRect(190, ly, SW - 200, 2);
      text(x, 'SCAN', 312, 428, { size: 15, family: FONT.type, weight: 400, color: '#a898e0' });
    }
  }
  // status line
  if (tm.db > 0 && tm.dead <= 0) text(x, 'ANALYZING' + '...'.slice(0, Math.floor(t * 6) % 4), 18, 452, { size: 17, family: FONT.type, weight: 400, color: '#7dffb0', align: 'left' });
  if (tm.dead > 0) { x.fillStyle = rgba('#ff4a52', .85 * tm.dead); x.fillRect(16, 444, SW - 32, 3); }
  x.globalAlpha = 1;
  // scanlines + bloom edge
  x.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < SH; y += 3) x.fillRect(0, y, SW, 1);
  const rl = (t * 140) % SH; x.fillStyle = 'rgba(200,190,255,.05)'; x.fillRect(0, rl, SW, 26);
  if (tm.dead > 0) { x.globalCompositeOperation = 'color'; x.fillStyle = rgba('#6a6f80', .7 * tm.dead); x.fillRect(0, 0, SW, SH); x.globalCompositeOperation = 'source-over'; }
  return b;
}

// ---------- pieces ----------
function drawTable(ctx) {
  let g = ctx.createLinearGradient(0, TABLE.top, 0, TABLE.front); g.addColorStop(0, '#1a1828'); g.addColorStop(1, '#262338');
  ctx.fillStyle = g; ctx.fillRect(TABLE.x0, TABLE.top, 2000, TABLE.front - TABLE.top);
  ctx.fillStyle = 'rgba(190,175,255,.22)'; ctx.fillRect(TABLE.x0, TABLE.front - 2, 2000, 2);
  g = ctx.createLinearGradient(0, TABLE.front, 0, TABLE.front + 600); g.addColorStop(0, '#0e0c17'); g.addColorStop(1, '#040308');
  ctx.fillStyle = g; ctx.fillRect(TABLE.x0, TABLE.front, 2000, 900);
  ctx.fillStyle = '#05040a'; ctx.fillRect(TABLE.x0 + 30, TABLE.front, 46, 900);
}
function drawStandFrame(ctx) {
  // small black easel stand behind the frame
  // neutral evidence backdrop board behind the frame
  const bx0 = FR.x - 330, bx1 = FR.x + 330, by0 = FR.y - FR.h / 2 - 90;
  let g = ctx.createLinearGradient(0, by0, 0, TABLE.top); g.addColorStop(0, '#1d1c2a'); g.addColorStop(1, '#2a2838');
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.fillStyle = g; ctx.fillRect(bx0, by0, bx1 - bx0, TABLE.top - by0 + 4); ctx.restore();
  g = ctx.createRadialGradient(FR.x, FR.y - 60, 40, FR.x, FR.y, 420); g.addColorStop(0, 'rgba(160,170,210,.10)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.fillRect(bx0, by0, bx1 - bx0, TABLE.top - by0 + 4);
  ctx.fillStyle = 'rgba(220,215,200,.5)'; for (let i = 0; i < 24; i++) ctx.fillRect(bx1 - 22, by0 + 20 + i * 20, i % 5 ? 10 : 18, 2); // edge scale
  // low support block + rear leg
  ctx.fillStyle = '#07070c'; ctx.fillRect(FR.x - 120, FR.y + FR.h / 2 - 16, 240, 30);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 16;
  ctx.drawImage(T.frame, FR.x - FR.w / 2, FR.y - FR.h / 2, FR.w, FR.h); ctx.restore();
  // contact shadow on the table
  ctx.save(); ctx.globalAlpha = .6; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(FR.x, FR.y + FR.h / 2 + 6, FR.w * .55, 12, 0, 0, 7); ctx.fill(); ctx.restore();
  // evidence tag on a string from the bottom-left corner
  ctx.save(); ctx.strokeStyle = 'rgba(230,220,200,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(FR.x - FR.w / 2 + 24, FR.y + FR.h / 2 - 20); ctx.quadraticCurveTo(FR.x - FR.w / 2 - 10, FR.y + FR.h / 2 + 10, FR.x - FR.w / 2 - 30, TABLE.top + 26); ctx.stroke();
  ctx.translate(FR.x - FR.w / 2 - 44, TABLE.top + 30); ctx.rotate(-.12); ctx.fillStyle = '#d9cfb3'; ctx.fillRect(-36, -14, 72, 30); ctx.fillStyle = '#c0392b'; ctx.fillRect(-36, -14, 14, 30); ctx.restore();
}
function drawMonitor(ctx, scr, glitch, t) {
  const x0 = MON.x - SW / 2, y0 = MON.y - SH / 2;
  // stand + base
  ctx.fillStyle = '#07070d'; ctx.fillRect(MON.x - 18, MON.y + SH / 2, 36, TABLE.top + 18 - (MON.y + SH / 2)); ctx.beginPath(); ctx.ellipse(MON.x, TABLE.top + 20, 110, 14, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillStyle = '#0b0b12'; roundRect(ctx, x0 - 22, y0 - 22, SW + 44, SH + 44, 16); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(190,175,255,.16)'; ctx.lineWidth = 2; roundRect(ctx, x0 - 22, y0 - 22, SW + 44, SH + 44, 16); ctx.stroke();
  return [x0, y0];
}
function blitScreen(ctx, scr, glitch, t, a) {
  const x0 = MON.x - SW / 2, y0 = MON.y - SH / 2;
  ctx.save(); ctx.globalAlpha *= a;
  if (glitch > 0) {
    ctx.drawImage(scr, x0, y0);
    const f = Math.floor(t * 30);
    for (let i = 0; i < 8; i++) { const y = hash(f * 31 + i) * SH, h = 10 + hash(f * 17 + i) * 60, off = (hash(f * 7 + i) - .5) * 90 * glitch; ctx.drawImage(scr, 0, y, SW, Math.min(h, SH - y), x0 + off, y0 + y, SW, Math.min(h, SH - y)); }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .4 * glitch; ctx.drawImage(scr, x0 + 8 * glitch, y0); ctx.globalCompositeOperation = 'source-over';
  } else ctx.drawImage(scr, x0, y0);
  ctx.restore();
  glow(ctx, MON.x, MON.y, 420, '#7a5cff', .16 * a);
}
function drawProps(ctx) {
  // forensic L-scale lying in front of the frame
  ctx.save(); ctx.translate(690, TABLE.top + 30); ctx.scale(1, .32);
  ctx.fillStyle = '#d6d2c6'; ctx.fillRect(0, -20, 170, 26); ctx.fillRect(0, -20, 26, 90);
  ctx.fillStyle = '#121212'; for (let i = 0; i < 16; i++) ctx.fillRect(4 + i * 10, -20, 2, i % 5 ? 9 : 16);
  ctx.restore();
  // swab tube rack near the monitor
  ctx.save(); ctx.translate(880, TABLE.top + 22);
  ctx.fillStyle = '#121019'; ctx.fillRect(-60, -26, 120, 30);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(200,210,230,.35)'; ctx.fillRect(-50 + i * 28, -96, 16, 72); ctx.fillStyle = i === 1 ? '#7a5cff' : '#3a3f4c'; ctx.fillRect(-52 + i * 28, -104, 20, 12); }
  ctx.restore();
}

window.KL.scenes.dna = function (ctx, t, d, info) {
  if (!S) build();
  const tH = at(info, '훗날', .03), tF = at(info, '액자에', .13), tN = at(info, '남은', .2), tD = at(info, 'DNA', .3),
    tR = at(info, '재수사', .45), tX = at(info, '소득은', .67), tE = at(info, '없었다', .8);

  // ---------------- timing / state ----------------
  const uvOn = P(t, tF - .1, tF - .02) * (hash(Math.floor(t * 40)) > .35 || t > tF + .06 ? 1 : .3) * (1 - P(t, tE - .1, tE + .02)) * (t > tE - .1 && t < tE + .02 ? (hash(Math.floor(t * 50) + 7) > .4 ? 1 : .2) : 1);
  const roomDim = P(t, tF - .12, tF + .1, E.outQ) * (1 - .45 * P(t, tE, tE + .45));
  const lowered = P(t, tX + .1, tE + .25, E.inOutQ);
  // beam target path across the frame, ending on the sampled trace
  // one sweep around the gilt (keys strictly increasing in time), settling on the sampled trace just before 'DNA로'
  const BEAM = [[tF - .1, ...rel(.4, -.56)], [tF + .02, ...rel(.12, -.47)], [tF + .13, ...rel(-.28, -.44)], [tN - .06, ...rel(-.47, -.06)], [tN + .06, ...rel(-.3, .42)],
    [tN + .17, ...rel(.18, .43)], [tD - .1, ...rel(.45, .08)], [tD - .02, TR[MAIN][0], TR[MAIN][1]], [tX + 2, TR[MAIN][0], TR[MAIN][1]]];
  const tgt = camAt(BEAM, t);
  tgt[0] += noise1(t * 3, 4) * 6 + lowered * 60; tgt[1] += noise1(t * 3, 5) * 6 + lowered * 280;
  const reveal = TR.map(([x, y]) => { // first moment the beam passed close to each trace
    for (let s = tF - .1; s <= t; s += .02) { const p = camAt(BEAM, s); if (Math.hypot(p[0] - x, p[1] - y) < 95) return s; }
    return 1e9;
  });
  const dead = P(t, tX - .02, tX + .2);
  const tm = {
    boot: P(t, tD - .45, tD - .15), helix: P(t, tD - .05, tD + .4), sample: P(t, tD + .3, tD + .65, E.outC),
    db: P(t, tR - .1, tR + .1), scroll: 0,
    dead, unzip: P(t, tX + .05, tE + .4, E.inOutQ),
  };
  tm.scroll = t < tX ? Math.max(0, t - tR) * 950 : (tX - tR) * 950 + 60 * (1 - Math.exp(-(t - tX) * 14));

  // ---------------- camera ----------------
  const [cx, cy, cz] = camAt([
    [-.4, 520, 866, 1.1], [tH, 520, 860, 1.09], [tF, 526, 848, 1.1], [tN, 540, 836, 1.13], [tD - .08, 600, 822, 1.15], // opens matched to fake's painting (match dissolve)
    [tD + .2, 955, 806, 1.1], [tR, 985, 806, 1.12], [tX - .05, 1010, 810, 1.17], [tX + .45, 770, 862, .9], [d + .4, 760, 868, .86],
  ], t);
  const dr = drift(t, .8, 37);
  const shk = (t > tX ? pulse(t, tX, 9) : 0);
  // backdrop with parallax
  ctx.save();
  camera(ctx, { x: 540 + (cx - 540) * .55 + dr.x * .5, y: 960 + (cy - 960) * .55 + dr.y * .5, zoom: 1 + (cz - 1) * .55, t }); // no roll: axis-aligned blits are much cheaper
  ctx.drawImage(S.lab, BG.x, BG.y);
  ctx.restore();

  ctx.save();
  camera(ctx, { x: cx + dr.x + shk * noise1(t * 26, 3) * 12, y: cy + dr.y + shk * noise1(t * 26, 4) * 12, zoom: cz, t });
  // overhead cool work light (on until the UV inspection starts)
  const lampA = (1 - roomDim * .85) * L.flicker(t, .04, 2);
  glow(ctx, FR.x + 40, FR.y - 120, 760, '#8fa6d8', .2 * lampA);
  drawTable(ctx);
  const tg = ctx.createLinearGradient(0, TABLE.top, 0, TABLE.front); tg.addColorStop(0, rgba('#9fb4e0', .10 * lampA)); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(TABLE.x0, TABLE.top, 2000, TABLE.front - TABLE.top);
  drawStandFrame(ctx);
  const scr = drawScreen(t, tm);
  drawMonitor(ctx, scr, 0, t);
  drawProps(ctx);

  // ---------------- technician (silhouette, lab coat, UV torch) ----------------
  const u = TECH.h / 8, shX = TECH.x + 1.12 * u * .9, shY = TECH.y - 6.6 * u;
  const lean = .035 * lowered;
  let a1, a2;
  { const phi = Math.atan2(tgt[0] - shX, tgt[1] - shY);
    const aimA1 = phi - .62, aimA2 = 1.0;
    const restA1 = .22, restA2 = -.08;
    const raise = P(t, tH - .05, tF - .06, E.inOutQ); // lifts the torch on 훗날, clicks it on at 액자에
    a1 = lerp(lerp(.2, aimA1, raise), restA1, lowered); a2 = lerp(lerp(-.1, aimA2, raise), restA2, lowered); }
  const glint = uvOn * (.25 + .4 * Math.max(0, Math.sin(t * 2.2))) * (1 - lowered);
  const fo = { face: 1, coat: true, coatLen: 2.7, glasses: true, glint, shadow: false, lean, armR: [a1, a2], armL: [.18 - .1 * lowered, -.55 + .25 * lowered], headTurn: .4 * P(t, tD - .1, tD + .2) - .6 * lowered, fill: '#06060b' };
  glow(ctx, TECH.x + 40, TECH.y - TECH.h * .82, 420, '#5a4aa8', .22 + .12 * uvOn);
  F.figure(ctx, TECH.x + 6, TECH.y - 4, TECH.h, Object.assign({}, fo, { fill: rgba('#b49cff', .7 * uvOn + .3), glint: 0 }));
  F.figure(ctx, TECH.x - 4, TECH.y - 2, TECH.h, Object.assign({}, fo, { fill: rgba('#8fa6d8', .35 * (1 - roomDim * .7)), glint: 0 }));
  const fi = F.figure(ctx, TECH.x, TECH.y, TECH.h, fo);
  // hand → world (figure rotates by lean around its feet)
  const [hxl, hyl] = fi.hands[1]; const cl = Math.cos(lean), sl = Math.sin(lean);
  const hx = TECH.x + hxl * cl - hyl * sl, hy = TECH.y + hxl * sl + hyl * cl;
  const ang = Math.atan2(tgt[1] - hy, tgt[0] - hx), torchAng = lerp(lerp(Math.PI / 2 + .3, ang, P(t, tH, tF - .06, E.inOutQ)), Math.PI / 2 + .3, lowered);
  const tipX = hx + Math.cos(torchAng) * 46, tipY = hy + Math.sin(torchAng) * 46;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(torchAng); ctx.fillStyle = '#16151d'; roundRect(ctx, -14, -11, 62, 22, 6); ctx.fill(); ctx.fillStyle = '#26242f'; ctx.fillRect(36, -14, 14, 28); ctx.restore();

  // ---------------- room dim (UV inspection) ----------------
  ctx.save(); ctx.fillStyle = `rgba(2,1,8,${.5 * roomDim})`; ctx.fillRect(-W, -H, 3 * W, 3 * H); ctx.restore();
  blitScreen(ctx, scr, tri(t, tX - .02, tX + .32), t, tm.boot * (1 - .45 * P(t, tE, tE + .5)));

  // ---------------- UV light ----------------
  if (uvOn > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bx = tgt[0] - tipX, by = tgt[1] - tipY, bl = Math.hypot(bx, by), nx = -by / bl, ny = bx / bl, sp = 70;
    const g = ctx.createLinearGradient(tipX, tipY, tgt[0], tgt[1]); g.addColorStop(0, rgba('#c9b2ff', .55 * uvOn)); g.addColorStop(1, rgba('#7a4dff', .12 * uvOn));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tipX + nx * 9, tipY + ny * 9); ctx.lineTo(tgt[0] + nx * sp, tgt[1] + ny * sp); ctx.lineTo(tgt[0] - nx * sp, tgt[1] - ny * sp); ctx.lineTo(tipX - nx * 9, tipY - ny * 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(ctx, tgt[0], tgt[1], 190, '#7a4dff', .45 * uvOn);
    glow(ctx, tgt[0], tgt[1], 70, '#d8c8ff', .4 * uvOn);
    glow(ctx, tipX, tipY, 40, '#e8dcff', .9 * uvOn);
    motes(ctx, t, { n: 22, color: '#c9b6ff', a: .45 * uvOn, area: [Math.min(tipX, tgt[0]) - 60, Math.min(tipY, tgt[1]) - 80, Math.abs(tgt[0] - tipX) + 120, Math.abs(tgt[1] - tipY) + 160], size: 2.2, speed: 14, seed: 52 });
  }
  // glowing traces
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  TR.forEach(([x, y, s, v], i) => {
    const rv = P(t, reveal[i], reveal[i] + .18, E.outC); if (rv <= 0) return;
    const near = Math.exp(-Math.pow(Math.hypot(tgt[0] - x, tgt[1] - y) / 110, 2));
    const fade = 1 - P(t, tE + .05 + i * .07, tE + .4 + i * .07);
    const lift = i === MAIN ? 1 - .6 * P(t, tD - .05, tD + .3) : 1;
    const a = rv * (.45 + .55 * near) * Math.max(uvOn, .25) * fade * lift;
    if (a <= 0) return;
    const sc = s * (.9 + .25 * pulse(t, reveal[i], 6)) * (1 + .05 * Math.sin(t * 4 + i));
    ctx.globalAlpha = a; ctx.drawImage(S.sm[v], x - 64 * sc * .85, y - 64 * sc * .85, 128 * sc * .85, 128 * sc * .85);
  });
  ctx.restore();
  // lock-on bracket + trace → monitor particle stream
  const [mx, my] = TR[MAIN];
  const bk = P(t, tD - .14, tD + .04) * (1 - P(t, tD + .6, tD + .9));
  if (bk > 0) brackets(ctx, mx - 44, my - 44, 88, 88, bk, '#cbb8ff', 22, 4);
  const hx0 = MON.x - SW / 2 + 92, hy0 = MON.y - 20;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) {
    const st = tD - .06 + i * .008, dur = .34 + hash(i * 3) * .1;
    const k0 = (t - st) / dur; if (k0 <= 0 || k0 >= 1.05) continue;
    for (let tr = 0; tr < 4; tr++) {
      const k = E.inOutQ(clamp(k0 - tr * .035)); if (k <= 0) continue;
      const o = (hash(i * 7) - .5) * 70, u1 = 1 - k;
      const px = u1 * u1 * u1 * mx + 3 * u1 * u1 * k * (mx + 120) + 3 * u1 * k * k * (hx0 - 160) + k * k * k * (hx0 + (hash(i) - .5) * 60);
      const py = u1 * u1 * u1 * my + 3 * u1 * u1 * k * (my - 210 + o) + 3 * u1 * k * k * (hy0 - 230 - o) + k * k * k * (hy0 + (hash(i * 5) - .5) * 260);
      ctx.fillStyle = rgba(i % 3 ? '#c9b6ff' : '#7fe8ff', (1 - tr / 4) * .9 * (1 - clamp((k0 - 1) * 20)));
      ctx.beginPath(); ctx.arc(px, py, (4 - tr * .7), 0, 7); ctx.fill();
    }
  }
  ctx.restore();
  // monitor result flash
  if (t > tX) { const fl = pulse(t, tX, 6); glow(ctx, MON.x, MON.y, 360, '#ff3b46', .35 * fl); }

  // cold, low-key falloff that tightens at the end
  const fx = lerp(lerp(FR.x + 60, MON.x - 120, P(t, tD - .1, tD + .3, E.inOutQ)), 760, P(t, tX, tX + .5, E.inOutQ));
  darkness(ctx, fx, 820, lerp(1050, 900, P(t, tE, d)), .85, .3);
  ctx.restore();

  // ---------------- screen space ----------------
  if (dead > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .4 * dead; ctx.fillStyle = '#8d93a8'; ctx.fillRect(0, 0, W, H); ctx.restore(); } // the room goes cold
  // year odometer: 1997 → 2014 (훗날) → 2016 (DNA)
  const oa = P(t, -.3, tH + .05) * (1 - P(t, tR - .25, tR - .05));
  if (oa > 0) {
    const v = lerp(lerp(1997, 2014, P(t, tH, tH + .5, E.inOutC)), 2016, P(t, tD - .05, tD + .3, E.inOutC));
    odometer(ctx, v, 540, 528, 96, oa, t);
  }
  const ca = P(t, tR - .1, tR + .15, E.outBack);
  if (ca > 0) { ctx.save(); ctx.translate(540, 520); ctx.scale(lerp(.7, 1, ca), lerp(.7, 1, ca)); chip(ctx, '2014 재수사 · 2016 액자 DNA 흔적', 0, 0, clamp(ca), { size: 36, border: rgba('#b69cff', .7) }); ctx.restore(); }
  // result card
  const rp = P(t, tX, tX + .22, E.outBack);
  if (rp > 0) resultCard(ctx, t, tX, rp);
  if (t > tF - .1 && t < tF + .1) flash(ctx, .08 * pulse(t, tF - .06, 20), '#c9b6ff');
};

function odometer(ctx, v, cx, cy, size, a, t) {
  const digits = 4, cw = size * .72, ch = size * 1.24, gap = size * .1, total = digits * cw + (digits - 1) * gap;
  ctx.save(); ctx.globalAlpha *= a;
  for (let k = 0; k < digits; k++) {
    const p = Math.pow(10, digits - 1 - k), x = cx - total / 2 + k * (cw + gap);
    const base = Math.floor(v / p) % 10, rem = v - Math.floor(v / p) * p;
    const frac = p === 1 ? v - Math.floor(v) : clamp(rem - (p - 1));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = 'rgba(16,14,26,.92)'; roundRect(ctx, x, cy - ch / 2, cw, ch, 10); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(182,156,255,.35)'; ctx.lineWidth = 2; roundRect(ctx, x, cy - ch / 2, cw, ch, 10); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(x, cy - ch / 2, cw, ch); ctx.clip();
    const moving = frac > .02 && frac < .98;
    for (const [dg, oy] of [[base, -frac], [(base + 1) % 10, 1 - frac]]) {
      text(ctx, String(dg), x + cw / 2, cy + size * .05 + oy * ch, { size, family: FONT.disp, weight: 400, color: moving ? '#c9bcf0' : '#f4f1ea', alpha: moving ? .8 : 1 });
    }
    ctx.restore();
    const gl = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2); gl.addColorStop(0, 'rgba(255,255,255,.08)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); gl.addColorStop(.5, 'rgba(0,0,0,.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; roundRect(ctx, x, cy - ch / 2, cw, ch, 10); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, cy - 1.5, cw, 3);
  }
  ctx.restore();
}
function resultCard(ctx, t, tX, rp) {
  const gl = Math.max(0, 1 - (t - tX) / .35), f = Math.floor(t * 30);
  const jx = gl > 0 ? (hash(f) - .5) * 30 * gl : 0;
  ctx.save(); ctx.translate(540 + jx, 1182); ctx.scale(lerp(1.35, 1, rp), lerp(1.35, 1, rp)); ctx.globalAlpha *= clamp(rp * 2.5);
  const w = 640, h = 124;
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fillStyle = 'rgba(10,8,16,.94)'; roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = K.red; ctx.lineWidth = 4; ctx.shadowColor = K.red; ctx.shadowBlur = 18 + 10 * Math.sin(t * 6); roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.stroke(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent';
  // icon: helix glyph with a slash
  ctx.save(); ctx.translate(-w / 2 + 74, 0); ctx.strokeStyle = '#cfc8e6'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const s of [1, -1]) { ctx.beginPath(); for (let k = 0; k <= 20; k++) { const yy = -34 + k * 3.4, xx = s * Math.sin(k * .45) * 14; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
  ctx.strokeStyle = K.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-28, -28); ctx.lineTo(28, 28); ctx.stroke();
  ctx.restore();
  const o = { size: 54, weight: 900, color: '#ffffff', align: 'center' };
  if (gl > 0) glitchText(ctx, '결정적 단서 없음', 50, 4, gl, t, o); else text(ctx, '결정적 단서 없음', 50, 4, o);
  ctx.restore();
}
})();
