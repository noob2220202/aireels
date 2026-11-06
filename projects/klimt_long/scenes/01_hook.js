// scene module: hook (0 – 4.45 s). Loop partner of 16_ending.js: the first frame of this scene equals the last frame of
// the ending (closed hatch, zoom 1.0 centred on the hatch, same ivy, same faint gold seam light).
// This file also registers window.KL.loopWall, the cached ivy-wall renderer both scenes share so the loop seam is exact.
(function () {
'use strict';
const { W, H, P, E, clamp, lerp, hash, rng, noise1, rgba, text, measure, roundRect, pathReveal, glow, godrays, motes, flash, camera, drift, FONT } = L;
const { K, HATCH, T, mk, noise2, poly, darkness, brackets, label, drawBag, canvasPiece, at } = window.KL;

// =====================================================================================================================
// loopWall: ivy wall + hatch, rendered from cached layers (the per-leaf wall in common.js costs ~170 ms per frame).
// Time argument `tau` is the loop clock: hook passes t, ending passes t - d, so both meet at tau = 0.
// =====================================================================================================================
const LW = (function () {
  const HX = HATCH.x, HY = HATCH.y, HS = HATCH.s;
  const WALL_X = -310, WALL_Y = -420;                    // T.bricks world origin (common.js)
  const CX0 = -570, CY0 = -620, CW = 2210, CH = 3010;    // world rect of the cached leaf layers
  let LV = null, DYN = null, LAY = null, FG = null;

  // exact replica of common.js makeLeaves() placement (same seed, same RNG call order) so this wall matches the other ivy scenes
  function placeLeaves() {
    const R = rng(5), out = [], hs = HS / 2;
    for (let gy = -500; gy < 2300; gy += 36) for (let gx = -450; gx < 1550; gx += 36) {
      const x = gx + (R() - .5) * 34, y = gy + (R() - .5) * 34;
      const dx = Math.abs(x - HX), dy = Math.abs(y - HY), r = Math.hypot(x - HX, y - HY);
      const inHatch = dx < hs + 18 && dy < hs + 18;
      let d = .02 + .7 * clamp((Math.abs(x - 540) - 190) / 320) + .3 * clamp((y - 1100) / 500) + .7 * (noise2(x * .006, y * .006, 3) - .5);
      d += (r > 165 && r < 300) ? .3 * (1 - Math.abs(r - 232) / 70) : 0;
      if (y < 300) d += .2;
      if (inHatch) d = .95;
      if (R() > clamp(d)) continue;
      const layer = R() < .35 ? 0 : (R() < .6 ? 1 : 2);
      out.push({ x, y, s: 30 + R() * 22 + layer * 4, rot: (R() - .5) * 1.6 + (x < 540 ? .3 : -.3), v: layer === 0 ? Math.floor(R() * 2) : 2 + Math.floor(R() * 4), layer, ph: R() * 6.28,
        cover: inHatch, late: !inHatch && r < 340, dist: r, fd: R(), fj: R() });
    }
    out.sort((a, b) => a.layer - b.layer || a.y - b.y);
    return out;
  }
  function stampLeaf(x, L0) {
    x.save(); x.translate(L0.x, L0.y); x.rotate(L0.rot); const sc = L0.s / 64; x.scale(sc, sc);
    const S = T.leaf[L0.v]; x.drawImage(S, -S.width / 2, -S.height / 2 - 10); x.restore();
  }
  // leaf sprites cropped to their opaque bounds (per-leaf drawing is fill-rate bound; this saves ~30% of the pixels)
  let CROP = null;
  function cropLeaves() {
    CROP = T.leaf.map(S => {
      const w = S.width, h = S.height, dta = S.getContext('2d').getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dta[(y * w + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(h - 1, y1 + 1);
      const [c, x] = mk(x1 - x0 + 1, y1 - y0 + 1); x.drawImage(S, -x0, -y0);
      return { c, ox: x0 - w / 2, oy: y0 - h / 2 - 10 };
    });
  }
  function edgeFade(x) {
    const f = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
    f(0, WALL_Y, 0, WALL_Y + 200, WALL_X, WALL_Y, 1700, 200);
    f(0, WALL_Y + 2700, 0, WALL_Y + 2520, WALL_X, WALL_Y + 2520, 1700, 180);
    f(WALL_X, 0, WALL_X + 170, 0, WALL_X, WALL_Y, 170, 2700);
    f(WALL_X + 1700, 0, WALL_X + 1530, 0, WALL_X + 1530, WALL_Y, 170, 2700);
  }
  function fgSprite(k) { // big out-of-focus foreground ivy cluster (pre-blurred once)
    const [c, x] = mk(600, 600); const R = rng(300 + k * 17);
    x.filter = 'blur(10px) brightness(.5)';
    for (let i = 0; i < 6; i++) {
      x.save(); x.translate(300 + (R() - .5) * 250, 300 + (R() - .5) * 250); x.rotate(R() * 6.28); const s = 1.5 + R() * 1.1; x.scale(s, s);
      const S = T.leaf[[1, 3, 2][i % 3]]; x.drawImage(S, -S.width / 2, -S.height / 2); x.restore();
    }
    x.filter = 'none';
    return c;
  }
  const RING = 440;                                       // half-size of the cached ring of leaves around the hatch
  let RINGC = null, SEAM = null, CANV = null;
  function build() {
    if (LV) return;
    LV = placeLeaves(); DYN = LV.filter(l => l.cover || l.late); cropLeaves();
    // far layers 0+1 are merged with the bricks (one blit); layer 2 is separate so it can breathe
    LAY = [0, 2].map(n => {
      const [c, x] = mk(CW, CH); x.translate(-CX0, -CY0);
      if (n === 0) {
        x.drawImage(T.bricks, WALL_X, WALL_Y); edgeFade(x);
        const lg = x.createRadialGradient(300, 300, 50, 400, 600, 1300); lg.addColorStop(0, 'rgba(120,150,200,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.45)');
        x.fillStyle = lg; x.fillRect(CX0, CY0, CW, CH);
      }
      for (const L0 of LV) if ((n === 0 ? L0.layer < 2 : L0.layer === 2) && !L0.cover && !L0.late) stampLeaf(x, L0);
      return c;
    });
    // the fully grown ring of leaves around the hatch (drawn per leaf only while it regrows)
    { const [c, x] = mk(RING * 2, RING * 2); x.translate(RING - HX, RING - HY); for (const L0 of DYN) if (L0.late) stampLeaf(x, L0); RINGC = c; }
    // glowing seam outline of the closed door (blurred once)
    { const p = 80, [c, x] = mk(HS + p * 2, HS + p * 2); x.strokeStyle = '#ffcf6a'; x.lineWidth = 5; x.shadowColor = '#ffb22e'; x.shadowBlur = 44;
      for (let i = 0; i < 3; i++) x.strokeRect(p + 2, p + 2, HS - 4, HS - 4); SEAM = c; }
    // unframed canvas on its stretcher with a soft drop shadow (replaces canvasPiece's per-frame shadowBlur)
    { const [c, x] = mk(800, 920); x.translate(400, 450); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 40; x.shadowOffsetY = 20;
      x.fillStyle = '#6a5236'; x.fillRect(-309, -359, 618, 718); x.shadowColor = 'transparent'; x.fillStyle = '#cbbd9e'; x.fillRect(-304, -354, 608, 708);
      x.drawImage(T.portrait, -300, -350); CANV = c; }
    FG = [fgSprite(0), fgSprite(1)];
  }
  function canvasSprite(ctx, x, y, s, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.drawImage(CANV, -400, -450); ctx.restore(); }

  // group motion of the ivy ring around the hatch: slow breathing + wind gust (shared by the cached and per-leaf paths)
  function ringXf(tau, sw, g) {
    return { dx: (Math.sin(tau * 1.1 + 4) * 3 + g * 9) * sw, dy: Math.cos(tau * .9 + 6) * 1.6 * sw, s: 1 + (.007 * Math.sin(tau * 1.25) + .004 * g) * sw, r: (.006 * Math.sin(tau * .8 + 1) + .01 * g * Math.sin(tau * 9)) * sw };
  }
  // leaves near the hatch. o.late / o.cover: grow 0..1 per leaf (null = full / hidden). Fully grown ring -> one cached blit.
  // o.lateFade (0..1) fades the cached ring in instead of growing it leaf by leaf (cheap; used for the time-lapse).
  function drawDyn(ctx, tau, o) {
    const sw = o.sway != null ? o.sway : 1, X = ringXf(tau, sw, o.gust || 0);
    ctx.save(); ctx.translate(HX + X.dx, HY + X.dy); ctx.rotate(X.r); ctx.scale(X.s, X.s); ctx.translate(-HX, -HY);
    const fade = o.lateFade != null, lateFull = fade || o.late == null || o.late >= 1;
    if (fade) { if (o.lateFade > 0) { ctx.save(); ctx.globalAlpha *= clamp(o.lateFade); ctx.drawImage(RINGC, HX - RING, HY - RING); ctx.restore(); } }
    else if (lateFull) ctx.drawImage(RINGC, HX - RING, HY - RING);
    if (!lateFull || o.cover != null) {
      const m = ctx.getTransform();
      for (const L0 of DYN) {
        let sc = L0.s / 64;
        if (L0.cover) { if (o.cover == null) continue; const k = clamp((o.cover - (1 - L0.dist / 200) * .6) / .4); if (k <= 0) continue; sc *= E.outBack(k); }
        else { if (lateFull) continue; const k = clamp((o.late - (1 - L0.dist / 340) * .6) / .4); if (k <= 0) continue; sc *= E.outBack(k); }
        const cs = Math.cos(L0.rot) * sc, sn = Math.sin(L0.rot) * sc, x = L0.x, y = L0.y;
        ctx.setTransform(m.a * cs + m.c * sn, m.b * cs + m.d * sn, m.c * cs - m.a * sn, m.d * cs - m.b * sn, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f);
        const S = CROP[L0.v]; ctx.drawImage(S.c, S.ox, S.oy);
      }
      ctx.setTransform(m);
    }
    ctx.restore();
  }

  // hatch (variant of common.js drawHatch: soft gradient door shadow instead of a blur filter, door jitter, overshoot)
  function hatch(ctx, open, inside, o) {
    const s = HS, L0 = HX - s / 2, T0 = HY - s / 2, d = 40;
    ctx.fillStyle = '#020202'; ctx.fillRect(L0, T0, s, s);
    poly(ctx, [[L0, T0], [L0 + s, T0], [L0 + s - d, T0 + d], [L0 + d, T0 + d]], '#1d1814');
    poly(ctx, [[L0, T0], [L0 + d, T0 + d], [L0 + d, T0 + s - d], [L0, T0 + s]], '#120e0b');
    poly(ctx, [[L0 + s, T0], [L0 + s, T0 + s], [L0 + s - d, T0 + s - d], [L0 + s - d, T0 + d]], '#0c0a08');
    poly(ctx, [[L0, T0 + s], [L0 + d, T0 + s - d], [L0 + s - d, T0 + s - d], [L0 + s, T0 + s]], '#241d18');
    ctx.fillStyle = '#060505'; ctx.fillRect(L0 + d, T0 + d, s - 2 * d, s - 2 * d);
    if (inside && open > 0) { ctx.save(); ctx.beginPath(); ctx.rect(L0, T0, s, s); ctx.clip(); inside(ctx, L0, T0, s); ctx.restore(); }
    ctx.strokeStyle = '#3c4044'; ctx.lineWidth = 14; ctx.strokeRect(L0 - 7, T0 - 7, s + 14, s + 14);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.strokeRect(L0 - 13, T0 - 13, s + 26, s + 26);
    const a = Math.max(0, Math.min(open, 1.1)) * 1.38, w = s * Math.cos(a), pe = Math.sin(a) * .16;
    if (open > 0) {
      const sx = L0 - s * .38 * Math.sin(a), g = ctx.createLinearGradient(L0, 0, sx, 0);
      g.addColorStop(0, `rgba(0,0,0,${.5 * Math.sin(a)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      poly(ctx, [[L0, T0 - 4], [sx, T0 + 22], [sx, T0 + s + 30], [L0, T0 + s + 4]], g);
    }
    ctx.save(); ctx.translate(o.jx || 0, o.jy || 0);
    const q = (u, v) => [L0 + u * w, T0 + v * s + (v - .5) * 2 * s * pe * u];
    const shade = 1 - Math.sin(a) * .55;
    const g = ctx.createLinearGradient(L0, T0, L0 + Math.max(4, w), T0 + s);
    g.addColorStop(0, `rgb(${Math.round(118 * shade)},${Math.round(122 * shade)},${Math.round(126 * shade)})`); g.addColorStop(1, `rgb(${Math.round(70 * shade)},${Math.round(74 * shade)},${Math.round(78 * shade)})`);
    poly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], g);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; poly(ctx, [q(.1, .1), q(.9, .1), q(.9, .9), q(.1, .9)]); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${.12 * shade})`; ctx.lineWidth = 2; poly(ctx, [q(.11, .11), q(.89, .11), q(.89, .89), q(.11, .89)]); ctx.stroke();
    for (let i = 0; i < 9; i++) { const [rx, ry] = q(.2 + hash(i * 3) * .6, .2 + hash(i * 5) * .6); const rr = 6 + hash(i) * 16; const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * Math.max(.2, w / s)); rg.addColorStop(0, 'rgba(120,60,25,.45)'); rg.addColorStop(1, 'rgba(120,60,25,0)'); ctx.fillStyle = rg; ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2); }
    for (const [u, v] of [[.05, .05], [.95, .05], [.95, .95], [.05, .95]]) { const [rx, ry] = q(u, v); ctx.fillStyle = '#2a2c2f'; ctx.beginPath(); ctx.ellipse(rx, ry, 6 * Math.max(.25, w / s), 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(rx - 1.5, ry - 1.5, 1.6, 0, 7); ctx.fill(); }
    { const [hx, hy] = q(.9, .5); ctx.fillStyle = '#222427'; ctx.fillRect(hx - 8 * Math.max(.3, w / s), hy - 26, 12 * Math.max(.3, w / s), 52); }
    if (o.doorLight > 0) { // warm reflection on the door when gold light hits it
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(o.doorLight) * .35; poly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], '#7a5310'); ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = '#2e3134'; ctx.fillRect(L0 - 12, T0 + 30, 18, 46); ctx.fillRect(L0 - 12, T0 + s - 76, 18, 46);
  }

  // gold light leaking through the closed door's seams
  function seep(ctx, tau, s) {
    if (s <= 0) return;
    const L0 = HX - HS / 2, T0 = HY - HS / 2, fl = .86 + .14 * noise1(tau * 8, 5), a = clamp(s) * fl;
    glow(ctx, HX, HY + HS * .45, 190 + 160 * s, '#ffb93a', .16 * a * (1 + .4 * s));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // light rays escaping the four seams
    const n = 6, len = 40 + 210 * clamp(s - .15, 0, 1.4);
    for (let e = 0; e < 4; e++) for (let i = 0; i < n; i++) {
      const u = (i + .5 + (hash(e * 31 + i) - .5) * .6) / n, al = a * (.18 + .22 * hash(e * 7 + i * 3)) * (.75 + .25 * Math.sin(tau * 3 + i + e * 2));
      let x0, y0, dx, dy; if (e === 0) { x0 = L0 + u * HS; y0 = T0; dx = 0; dy = -1; } else if (e === 1) { x0 = L0 + HS; y0 = T0 + u * HS; dx = 1; dy = 0; } else if (e === 2) { x0 = L0 + u * HS; y0 = T0 + HS; dx = 0; dy = 1; } else { x0 = L0; y0 = T0 + u * HS; dx = -1; dy = 0; }
      const ll = len * (.55 + .7 * hash(e * 13 + i * 5)), ww = 5 + 9 * hash(i * 9 + e);
      const g = ctx.createLinearGradient(x0, y0, x0 + dx * ll, y0 + dy * ll); g.addColorStop(0, rgba('#ffd27a', al)); g.addColorStop(1, 'rgba(255,210,122,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - dy * ww * .3, y0 - dx * ww * .3); ctx.lineTo(x0 + dx * ll - dy * ww, y0 + dy * ll - dx * ww); ctx.lineTo(x0 + dx * ll + dy * ww, y0 + dy * ll + dx * ww); ctx.lineTo(x0 + dy * ww * .3, y0 + dx * ww * .3); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = Math.min(1, a * 1.1); ctx.drawImage(SEAM, L0 - 80, T0 - 80);
    if (s > .7) { ctx.globalAlpha = Math.min(1, (s - .7) * 1.5); ctx.drawImage(SEAM, L0 - 80, T0 - 80); }
    ctx.globalAlpha = 1; ctx.strokeStyle = rgba('#fff4d6', Math.min(1, a * .85)); ctx.lineWidth = 1.5 + clamp(s); ctx.strokeRect(L0 + 2, T0 + 2, HS - 4, HS - 4);
    ctx.restore();
  }

  function fgLeaves(ctx, tau, c, amt) {
    const z = c.zoom, vis = amt * clamp((z - .8) / .18); if (vis <= 0) return;
    const k = 1 + (z - 1) * 1.7, px = -(c.x - 540) * z * .5, py = -(c.y - 805) * z * .5;
    ctx.save(); ctx.globalAlpha *= vis;
    for (const [x0, y0, i, s0, ph] of [[-70, 520, 0, 1.0, .4], [1150, 470, 1, .85, 2.2], [-60, 1650, 1, 1.2, 4.1], [1140, 1600, 0, 1.05, 1.3]]) {
      const sx = 540 + (x0 - 540) * k + px + Math.sin(tau * .7 + ph) * 12, sy = 960 + (y0 - 960) * k + py + Math.cos(tau * .55 + ph) * 9;
      const S = FG[i], s = s0 * k;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ph + Math.sin(tau * .5 + ph) * .07); ctx.scale(s, s); ctx.drawImage(S, -S.width / 2, -S.height / 2); ctx.restore();
    }
    ctx.restore();
  }

  // the faint gold seam light that is present at the loop seam (tau = 0); the ending ramps up to it, the hook starts from it
  const SEEP0 = .24;
  const seepRest = (tau) => SEEP0 * E.inOutQ(P(tau, -.75, 0));

  // o: {cam:{x,y,zoom,rot,shake,hh}, open, inside, jx, jy, doorLight, late, cover, sway, gust, seep, light, amb, dark, world, after, fg}
  function draw(ctx, tau, o) {
    build();
    const c = o.cam, dr = drift(tau, c.hh != null ? c.hh : .7, 3);
    ctx.save();
    // handheld drift and shake are translation only (a rotated full-frame blit costs ~60% more in the software rasterizer)
    const sh = c.shake || 0, sx = sh * noise1(tau * 22, 1) * 18, sy = sh * noise1(tau * 22, 2) * 18;
    camera(ctx, { x: c.x + dr.x - sx / c.zoom, y: c.y + dr.y - sy / c.zoom, zoom: c.zoom, rot: c.rot || 0, shake: 0, t: tau, seed: 0 });
    const m = ctx.getTransform();
    ctx.drawImage(LAY[0], CX0, CY0);
    hatch(ctx, o.open || 0, o.inside, o);
    const sw = o.sway != null ? o.sway : 1, g = o.gust || 0;
    ctx.drawImage(LAY[1], CX0 + (Math.sin(tau * 1.1 + 4) * 3 + g * 11) * sw, CY0 + Math.cos(tau * .9 + 6) * 1.6 * sw);
    drawDyn(ctx, tau, o);
    seep(ctx, tau, o.seep || 0);
    if (o.world) o.world(ctx, m);
    const fall = 760 * Math.max(1, Math.pow(1 / c.zoom, 1.15)) * (1 + .025 * Math.sin(tau * 1.3));
    darkness(ctx, HX, HY, fall, o.dark != null ? o.dark : .78, .25);
    const amb = o.amb != null ? o.amb : 1;
    if (amb > 0) motes(ctx, tau, { n: 22, color: '#ffe2a8', a: .22 * amb, area: [HX - 430, HY - 480, 860, 940], size: 2.3, speed: 12, seed: 31 });
    if (o.light > 0) {
      glow(ctx, HX, HY, 520, K.gold, .5 * o.light);
      godrays(ctx, HX, HY, Math.PI / 2 + .2, 2.6, 900, '#ffd27a', .07 * o.light, tau, 9);
      motes(ctx, tau, { n: 44, color: '#ffd98a', a: .65 * o.light, area: [HX - 380, HY - 380, 760, 760], size: 3, speed: 25, seed: 8 });
    }
    if (o.after) o.after(ctx, m);
    ctx.restore();
    fgLeaves(ctx, tau, c, o.fg != null ? o.fg : 1);
    return m;
  }
  const ws = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];

  // year counter with a rolling digit change (used by both scenes); yf = fractional year
  function yearCounter(ctx, x, y, yf, a, size = 76, color = K.goldHi) {
    if (a <= 0) return;
    const y0 = Math.floor(yf), f = yf - y0, roll = E.inOutQ(clamp((f - .55) / .45));
    const s0 = String(y0), s1 = String(y0 + 1), cw = size * .62, n = 4, bw = n * cw + size * .7, bh = size * 1.3;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = 'rgba(8,10,14,.9)'; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 14); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(K.gold, .75); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.rect(-bw / 2, -bh / 2 + 5, bw, bh - 10); ctx.clip();
    for (let i = 0; i < n; i++) {
      const cx = -n * cw / 2 + cw * (i + .5);
      if (s0[i] === s1[i] || roll <= 0) text(ctx, s0[i], cx, size * .04, { size, family: FONT.disp, weight: 400, color });
      else { text(ctx, s0[i], cx, size * .04 - roll * bh, { size, family: FONT.disp, weight: 400, color, alpha: 1 - roll }); text(ctx, s1[i], cx, size * .04 + (1 - roll) * bh, { size, family: FONT.disp, weight: 400, color, alpha: roll }); }
    }
    const sh = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); sh.addColorStop(0, 'rgba(8,10,14,.9)'); sh.addColorStop(.25, 'rgba(8,10,14,0)'); sh.addColorStop(.75, 'rgba(8,10,14,0)'); sh.addColorStop(1, 'rgba(8,10,14,.9)');
    ctx.fillStyle = sh; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  // four-point star glint
  function glint(ctx, x, y, r, a, color = '#fff2c8') {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [dx, l] of [[1, 1], [0, .75]]) {
      const g = dx ? ctx.createLinearGradient(x - r * l, y, x + r * l, y) : ctx.createLinearGradient(x, y - r * l, x, y + r * l);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; if (dx) ctx.fillRect(x - r * l, y - 2, r * 2 * l, 4); else ctx.fillRect(x - 2, y - r * l, 4, r * 2 * l);
    }
    ctx.restore();
    glow(ctx, x, y, r * .45, color, a * .8);
  }
  // horizontal anamorphic flare streak (screen space)
  function streak(ctx, x, y, a, len = 1300, color = '#ffd27a') {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [hh, al] of [[46, .16], [12, .45], [3, 1]]) {
      const g = ctx.createLinearGradient(x - len / 2, 0, x + len / 2, 0); g.addColorStop(0, rgba(color, 0)); g.addColorStop(.5, rgba(color, a * al)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.fillRect(x - len / 2, y - hh / 2, len, hh);
    }
    ctx.restore();
  }
  return { draw, ws, seepRest, SEEP0, yearCounter, glint, streak, canvasSprite, HX, HY, HS };
})();
window.KL.loopWall = LW;

// ---------- hook-only helpers ----------
// piecewise keyframes: [[t, v], [t, v, ease], ...] (ease applies to the segment ending at that key)
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], (ks[i][2] || E.inOutQ)(clamp((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]))));
  return ks[ks.length - 1][1];
}
// E.outBack(0) is 2e-16, not 0: guard so 'not started' really is zero
const OB = (x, s) => (x <= 0 ? 0 : E.outBack(x, s));
const pulse = (t, t0, w = 7) => (t > t0 - .04 ? Math.exp(-Math.pow((t - t0) * w, 2)) : 0);
// museum facade schematic drawn in world space around the hatch (a generic elevation outline, no real building details)
const FACADE = (() => {
  const X0 = -300, X1 = 1380, Y0 = -100;
  const arch = (cx, w, yt, yb) => { const p = [[cx - w / 2, yb], [cx - w / 2, yt]]; for (let i = 1; i < 12; i++) { const a = Math.PI + i / 12 * Math.PI; p.push([cx + Math.cos(a) * w / 2, yt + Math.sin(a) * w / 2]); } p.push([cx + w / 2, yt], [cx + w / 2, yb], [cx - w / 2, yb]); return p; };
  const rect = (cx, w, yt, yb) => [[cx - w / 2, yb], [cx - w / 2, yt], [cx + w / 2, yt], [cx + w / 2, yb], [cx - w / 2, yb]];
  // s = start offset from '바로' (s), u = duration; drawn bottom-up so nothing traces through the title band mid-move
  return [
    { pts: [[X0, 1150], [X0, Y0 + 34]], s: .08, u: .5 }, { pts: [[X1, 1150], [X1, Y0 + 34]], s: .08, u: .5 },
    { pts: rect(90, 190, 610, 1030), s: .22, u: .4 }, { pts: rect(990, 190, 610, 1030), s: .27, u: .4 },
    { pts: [[X0, 470], [X1, 470]], s: .33, u: .35, a: .55 },
    { pts: arch(90, 180, 70, 390), s: .38, u: .38 }, { pts: arch(540, 180, 70, 390), s: .44, u: .38 }, { pts: arch(990, 180, 70, 390), s: .5, u: .38 },
    { pts: [[540, Y0], [X0 - 40, Y0]], s: .56, u: .3 }, { pts: [[540, Y0], [X1 + 40, Y0]], s: .56, u: .3 },
    { pts: [[540, Y0 + 34], [X0 - 16, Y0 + 34]], s: .6, u: .3 }, { pts: [[540, Y0 + 34], [X1 + 16, Y0 + 34]], s: .6, u: .3 },
  ];
})();

window.KL.scenes.hook = function (ctx, t, d, info) {
  const tSt = at(info, '도둑맞은', .03), tM = at(info, '명화가', .18), t22 = at(info, '22년', .28), tMan = at(info, '만에', .4),
    tBaro = at(info, '바로', .45), tMus = at(info, '미술관의', .6), tWall = at(info, '벽', .72), tIn = at(info, '속에서', .76), tN = at(info, '나왔다', .85);
  const tOpen = tN - .25;                       // creak SFX lands here
  const tRush = tWall - .13, tArr = tIn + .03;  // whoosh back into the hatch
  const { HX, HY, HS } = LW;

  // ---- camera: push in -> pull back to the facade -> rush into the hatch -> settle on the emerging canvas
  // t = 0 is the loop seam (zoom 1, cy 805): the impact at the seam kicks off a fast push-in instead of a slow creep
  const zoom = keys(t, [[0, 1], [.5, 1.12, E.outC], [tMan - .02, 1.15, E.inOutQ], [tMus + .26, .56, E.inOutC], [tRush, .545, E.lin], [tArr, 1.24, E.inOutC], [d, 1.1, E.outC]])
    + .035 * pulse(t, tM + .03, 6) + .02 * pulse(t, t22 + .03, 7);
  const cy = keys(t, [[0, 805], [.5, 836, E.outC], [tMan - .02, 868], [tMus + .26, 640, E.inOutC], [tRush, 636, E.lin], [tArr, 812, E.inOutC], [d, 792, E.outC]]);
  const rush = Math.sin(Math.PI * P(t, tRush, tArr));
  const shake = .3 * P(t, 0, .12, E.inOutQ) * Math.exp(-t * 4) + .22 * P(t, tWall, tOpen) * (t < tOpen + .02 ? 1 : 0) + .4 * (t > tOpen ? Math.exp(-(t - tOpen) * 4.5) : 0);
  const cam = { x: 540, y: cy, zoom, shake, hh: lerp(.7, 1.15, P(t, 0, 1.2)) * (1 - .5 * rush) };

  // ---- hatch state
  const open = OB(P(t, tOpen, tOpen + .5), 1.3);
  const rattle = P(t, tWall - .05, tOpen) * (t < tOpen ? 1 : 0) + .7 * P(t, 0, .03) * Math.exp(-t * 7);
  const jf = Math.floor(t * 40);
  const jx = rattle * (hash(jf) - .5) * 6, jy = rattle * (hash(jf + 77) - .5) * 4;
  const seepS = LW.seepRest(t) + .34 * P(t, 0, .06) * Math.exp(-t * 4) + .28 * P(t, tSt, tMan, E.inOutQ) + .55 * pulse(t, tM + .02, 5) + .25 * P(t, tBaro, tMus) +
    .7 * P(t, tWall - .1, tOpen, E.inQ);
  const seepV = seepS * (1 - P(t, tOpen + .02, tOpen + .2));
  const light = P(t, tOpen, tOpen + .45, E.outQ);
  const kE = P(t, tN - .08, tN + .72, E.outC);       // canvas emergence
  const breath = .5 + .5 * Math.sin(t * 2.4 - 1.57);  // ivy "breathing" (0 at t = 0)
  const sway = 1 + .55 * breath * P(t, 0, .6) + 1.2 * rush;
  const gust = .9 * Math.sin(Math.PI * P(t, tRush - .05, tOpen + .3)) + .5 * pulse(t, tOpen + .1, 4);

  // canvas pose (shared by the in-cavity view and the emergence)
  const cv = { x: lerp(HX, HX + 8, kE), y: lerp(HY - 5, HY - 40, kE) + Math.sin(t * 2.2) * 4 * kE, s: lerp(.3, .64, kE), r: lerp(.04, -.045, E.outBack(kE, 1.4)) };
  // black plastic bag: wraps the canvas in the cavity; on emergence it slips off BEHIND the canvas and is gone by ~tN + .15
  const bagSlide = E.inOutQ(P(t, tN - .1, tN + .3));
  const drawBagOn = (c) => {
    const bA = 1 - P(t, tN - .05, tN + .15); if (bA <= 0) return;
    const bs = cv.s, w = 690 * bs, h = 380 * bs;
    c.save(); c.globalAlpha *= bA; c.translate(cv.x - 10 * bagSlide, cv.y + 235 * bs + bagSlide * 200); c.rotate(cv.r + bagSlide * .3);
    drawBag(c, 0, 0, w, h, 0, t);
    // glossy crinkle highlights so it reads as the same plastic bag as in scene 'bag', not a matte blob
    c.lineCap = 'round';
    [[-.36, .02, -.12, -.2, .5], [-.06, .1, .2, -.06, .42], [.14, .3, .38, .16, .46], [-.4, .36, -.18, .26, .34]].forEach(([a, b, c2, d2, al], i) => {
      c.strokeStyle = `rgba(214,220,232,${al * (.75 + .25 * Math.sin(t * 3 + i * 1.7))})`; c.lineWidth = Math.max(2, 9 * bs);
      c.beginPath(); c.moveTo(a * w, b * h); c.quadraticCurveTo((a + c2) / 2 * w + 8 * bs, (b + d2) / 2 * h - 30 * bs, c2 * w, d2 * h); c.stroke();
    });
    c.restore();
  };

  const m = LW.draw(ctx, t, {
    cam, open, jx, jy, doorLight: light, sway, gust, seep: seepV, light: light * (1 - kE), amb: 1,
    inside(c, L0, T0, s) {
      const k = P(t, tOpen, tOpen + .55, E.outQ);
      glow(c, L0 + s / 2, T0 + s * .45, s * .95, K.gold, .95 * k);
      glow(c, L0 + s / 2, T0 + s * .4, s * .45, '#fff1c8', .5 * k);
      if (kE <= 0) { LW.canvasSprite(c, cv.x, cv.y, cv.s, cv.r); drawBagOn(c); }
    },
    after(c) {
      // "도둑맞은 명화가": a see-through glimpse of the portrait behind the closed door (0 at t = 0, so the loop seam is untouched)
      const gh = .55 * Math.sin(Math.PI * P(t, tSt, tM + .12)); // ends before the 1997 label appears (no 'in the wall since 1997' implication)
      if (gh > 0) {
        c.save(); c.beginPath(); c.rect(HX - HS / 2, HY - HS / 2, HS, HS); c.clip();
        c.globalCompositeOperation = 'screen'; c.globalAlpha = gh; LW.canvasSprite(c, HX, HY - 5, .3, .04);
        c.restore();
      }
      // the impact shakes dust off the hatch frame (the ending's slam dust has just settled at the loop seam)
      if (t < 1.3) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const k0 = P(t, 0, .06);
        for (let i = 0; i < 30; i++) {
          const dt = t - hash(i * 17 + 4) * .25; if (dt <= 0 || dt > 1.05) continue;
          const u = hash(i * 7 + 2), px = HX - HS / 2 - 10 + u * (HS + 20) + Math.sin(dt * 5 + i) * 6, py = HY - HS / 2 - 12 + (30 + 120 * hash(i * 3 + 1)) * dt + 260 * dt * dt;
          c.fillStyle = rgba(i % 4 ? '#d8d0c0' : '#ffe2a8', k0 * (1 - dt / 1.05) * (.35 + .4 * hash(i * 13))); c.beginPath(); c.arc(px, py, 1.4 + 2.4 * hash(i * 5), 0, 7); c.fill();
        }
        c.restore();
      }
      // museum facade schematic (wide shot)
      const fa = P(t, tBaro - .08, tBaro + .2) * (1 - P(t, tRush - .02, tRush + .16));
      if (fa > 0) {
        c.save();
        for (const f of FACADE) {
          const p = P(t, tBaro + f.s, tBaro + f.s + f.u, E.inOutQ); if (p <= 0) continue; c.globalAlpha = fa * (f.a || 1);
          pathReveal(c, f.pts, p, { color: 'rgba(246,215,127,.22)', w: 16, head: false });
          pathReveal(c, f.pts, p, { color: K.goldHi, w: 4.5, head: p < 1 });
        }
        c.restore();
      }
      // the canvas comes out of the wall
      if (kE > 0) {
        const w = 600 * cv.s, h = 700 * cv.s;
        glow(c, cv.x, cv.y, 420 * kE + 60, K.gold, .5 * kE);
        godrays(c, cv.x, cv.y, t * .25, 6.2, 640 * kE, '#ffe1a0', .06 * kE, t, 10);
        c.save(); c.globalAlpha *= clamp(kE * 4); drawBagOn(c); LW.canvasSprite(c, cv.x, cv.y, cv.s, cv.r); c.restore();
        // light sweeping over the varnish
        const sw2 = P(t, tN + .25, tN + .85, E.inOutQ);
        if (sw2 > 0 && sw2 < 1) {
          c.save(); c.translate(cv.x, cv.y); c.rotate(cv.r); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip(); c.globalCompositeOperation = 'lighter';
          const sx = lerp(-w, w, sw2), g = c.createLinearGradient(sx - 80, -h / 2, sx + 80, h / 2); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.32)'); g.addColorStop(1, 'rgba(255,240,200,0)');
          c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h); c.restore();
        }
        // sparkles on the gold ornaments when the shimmer hits
        const cs = Math.cos(cv.r), sn = Math.sin(cv.r);
        [[78, 96], [528, 112], [552, 380], [410, 164]].forEach(([px, py], i) => {
          const lx = (px - 300) * cv.s, ly = (py - 350) * cv.s, a = Math.sin(Math.PI * P(t, tN + .05 + i * .1, tN + .5 + i * .1));
          LW.glint(c, cv.x + lx * cs - ly * sn, cv.y + lx * sn + ly * cs, 44 + 30 * hash(i), a * .9);
        });
        // burst of gold dust
        const bt = t - (tN + .02);
        if (bt > 0 && bt < 1.4) {
          c.save(); c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 46; i++) {
            const ang = hash(i * 17 + 3) * 6.283, sp = 260 + hash(i * 29 + 1) * 620, dd = sp * (1 - Math.exp(-bt * 2.6)) / 2.6;
            const px = HX + Math.cos(ang) * dd, py = HY - 20 + Math.sin(ang) * dd + 60 * bt * bt, a = (1 - bt / 1.4) * (.45 + .55 * hash(i * 5));
            c.fillStyle = rgba(i % 3 ? '#ffd98a' : '#fff4d8', a); c.beginPath(); c.arc(px, py, 1.6 + 3.2 * hash(i * 11), 0, 7); c.fill();
          }
          c.restore();
        }
        const bp = P(t, tN + .48, tN + .78);
        if (bp > 0) brackets(c, cv.x - w / 2 - 26, cv.y - h / 2 - 26, w + 52, h + 52, bp);
      }
    },
  });

  // ---- screen-space layer
  const [sx, sy] = LW.ws(m, HX, HY);
  // rush: zoom echo + speed lines
  if (rush > .02) {
    ctx.save(); ctx.globalAlpha = .3 * rush;
    for (const k of [1.07]) { ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k); ctx.translate(-sx, -sy); ctx.drawImage(ctx.canvas, 0, 0); ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const prog = P(t, tRush, tArr);
    for (let i = 0; i < 44; i++) {
      const ang = hash(i * 7 + 2) * 6.283, r0 = 180 + ((hash(i * 3 + 5) * 900 + prog * 1400) % 1100), len = 120 + hash(i * 5) * 380;
      ctx.strokeStyle = rgba(i % 4 ? '#e8eefc' : '#ffd98a', rush * (.12 + .3 * hash(i * 11))); ctx.lineWidth = 1 + 2.5 * hash(i * 13);
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(ang) * r0, sy + Math.sin(ang) * r0); ctx.lineTo(sx + Math.cos(ang) * (r0 + len), sy + Math.sin(ang) * (r0 + len)); ctx.stroke();
    }
    ctx.restore();
  }
  // door bursts open: anamorphic streak + warm flash
  LW.streak(ctx, sx, sy, .85 * Math.exp(-Math.max(0, t - tOpen - .06) * 4) * P(t, tOpen, tOpen + .06), 1500);
  flash(ctx, .2 * pulse(t, tOpen + .1, 9), '#ffe2a6');

  // hatch marker + museum label in the wide shot
  const mk1 = P(t, tMus - .12, tMus + .15) * (1 - P(t, tRush - .02, tRush + .12));
  if (mk1 > 0) {
    ctx.save(); ctx.globalAlpha = mk1;
    for (let k = 0; k < 3; k++) { const q = (t * .9 + k / 3) % 1; ctx.strokeStyle = rgba(K.red, (1 - q) * .85); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx, sy, 70 + q * 90, 0, 7); ctx.stroke(); }
    const sz = HS * zoom * .5 + 16; ctx.strokeStyle = K.red; ctx.lineWidth = 5; ctx.shadowColor = K.red; ctx.shadowBlur = 14; ctx.strokeRect(sx - sz, sy - sz, sz * 2, sz * 2);
    ctx.restore();
  }
  const lb = OB(P(t, tMus - .05, tMus + .25)) * (1 - P(t, tRush - .05, tRush + .1));
  if (lb > 0) {
    const ly = 1215 - 16 * (1 - lb);
    ctx.save(); ctx.globalAlpha = clamp(lb); ctx.strokeStyle = rgba(K.red, .9); ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(sx, sy + HS * zoom * .5 + 18); ctx.lineTo(sx, ly - 30); ctx.stroke(); ctx.restore();
    label(ctx, '이탈리아 피아첸차 · 리치 오디 미술관', 540, ly, { size: 38, color: '#fff', bg: 'rgba(8,10,14,.88)', border: K.red, a: clamp(lb) });
  }

  // timeline: 1997.2 도난 -> 2019.12.10 발견 (the year counter rides the progress head)
  const ta = P(t, tM + .1, tM + .35, E.outC) * (1 - P(t, tBaro - .05, tBaro + .2, E.inQ));
  if (ta > 0) {
    const y = 1172, xa = 150, xb = 930, lp = P(t, t22 - .02, tMan + .02, E.inOutQ), hx = lerp(xa, xb, lp);
    ctx.save(); ctx.globalAlpha = ta; ctx.translate(0, 14 * (1 - ta));
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
    for (let i = 1; i < 22; i++) { const x = lerp(xa, xb, i / 22); ctx.fillStyle = x <= hx ? 'rgba(255,230,170,.8)' : 'rgba(255,255,255,.2)'; ctx.fillRect(x - 1.5, y - 8, 3, 16); }
    if (lp > 0) { const g = ctx.createLinearGradient(xa, 0, xb, 0); g.addColorStop(0, K.red); g.addColorStop(1, K.goldHi); ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.shadowColor = K.gold; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(hx, y); ctx.stroke(); ctx.shadowBlur = 0; }
    const n1 = OB(P(t, tM + .1, tM + .4));
    ctx.fillStyle = K.red; ctx.beginPath(); ctx.arc(xa, y, 12 * n1, 0, 7); ctx.fill();
    label(ctx, '1997.2 도난', xa + 95, y - 66, { size: 36, color: '#fff', bg: 'rgba(130,14,22,.94)', a: clamp(n1 * 1.5) });
    const n2 = OB(P(t, tMan - .06, tMan + .22), 2.2);
    if (n2 > 0) {
      ctx.fillStyle = K.goldHi; ctx.shadowColor = K.gold; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(xb, y, 14 * n2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      label(ctx, '2019.12.10 발견', xb - 128, y - 66, { size: 36, color: '#111', bg: K.goldHi, a: clamp(n2 * 1.5) });
    }
    const ca = P(t, t22 - .04, t22 + .1) * (1 - P(t, tMan - .18, tMan)); // gone before the '2019.12.10 발견' tag pops
    if (ca > 0) { glow(ctx, hx, y, 70, K.goldHi, .7 * ca); LW.yearCounter(ctx, clamp(hx, xa + 80, xb - 80), y, lerp(1997, 2019, lp), ca, 46); }
    ctx.restore();
  }
};
})();
