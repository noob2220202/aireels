// lab/e_bamti_doodle/scene.js — "병맛 낙서" (개밤티) doodle cut. Everything is drawn by code:
// rough marker ribbons + slightly mis-registered flat fills. No Math.random / Date (seeded noise only).
(function (root) {
  'use strict';
  const W = 1080, H = 1920;
  const INK = '#151515', PAPER = '#f7f4ec';
  const FILL_OFF = [5, 4];            // global "quick colouring" misregistration

  // ---------- seeded noise ----------
  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return (n >>> 0) / 4294967296;
  }
  function vnoise(seed, x) {           // 1D value noise, [-1, 1]
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = hash(seed * 7919 + i * 104729), b = hash(seed * 7919 + (i + 1) * 104729);
    return (a + (b - a) * u) * 2 - 1;
  }
  let _seed = 1;
  const nextSeed = () => (_seed += 17);
  const rnd = (seed, k) => hash(seed * 31 + (k || 0) * 977 + 5);   // [0,1)

  // ---------- geometry ----------
  function spline(pts, closed, step) { // Catmull-Rom through pts -> dense polyline
    step = step || 5; const n = pts.length, out = [];
    const P = i => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t, c = d =>
          0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
        out.push([c(0), c(1)]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function polyline(pts, closed, step) { // straight segments, densified
    step = step || 5; const out = [], n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function resample(pl, step) {
    const out = [pl[0].slice()]; let acc = 0;
    for (let i = 1; i < pl.length; i++) {
      let a = pl[i - 1], b = pl[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (acc + d >= step && d > 0) {
        const t = (step - acc) / d; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        out.push(a); d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0;
      }
      acc += d;
    }
    const l = pl[pl.length - 1], o = out[out.length - 1];
    if (Math.hypot(l[0] - o[0], l[1] - o[1]) > step * 0.4) out.push(l.slice());
    return out;
  }
  function normals(pts, closed) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = closed ? pts[(i - 2 + n) % n] : pts[Math.max(0, i - 2)], b = closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; out.push([-ty / l, tx / l]);
    }
    return out;
  }
  function ellipsePts(cx, cy, rx, ry, a0, a1, n) {
    const out = []; n = n || 48;
    for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
  }
  // wavy displacement along the normal (hair waves)
  function wavy(pl, amp, wavelength, phase) {
    const pts = resample(pl, 4), nr = normals(pts, false);
    return pts.map((p, i) => { const d = Math.sin(i * 4 / wavelength * Math.PI * 2 + (phase || 0)) * amp; return [p[0] + nr[i][0] * d, p[1] + nr[i][1] * d]; });
  }

  // ---------- the rough marker ----------
  // A stroke is a filled ribbon: low-frequency wobble + pressure-varying width + blunt-ish tapered ends.
  function roughStroke(ctx, pl, o) {
    o = o || {}; const w = o.w || 9, seed = o.seed != null ? o.seed : nextSeed();
    const wob = o.wob != null ? o.wob : 1.4 + w * 0.24, fq = o.freq || 1 / 80, ST = 4;
    let pts = resample(pl, ST); if (pts.length < 2) return;
    const over = o.over || 0;
    if (over) {                                           // overshoot both ends along the tangent
      const ext = (p, q) => { const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [p[0] + (p[0] - q[0]) / l * over, p[1] + (p[1] - q[1]) / l * over]; };
      pts = resample([ext(pts[0], pts[1])].concat(pts, [ext(pts[pts.length - 1], pts[pts.length - 2])]), ST);
    }
    const n = pts.length, L = (n - 1) * ST, nr = normals(pts, false), left = [], right = [];
    const tIn = o.taperIn != null ? o.taperIn : 16, tOut = o.taperOut != null ? o.taperOut : 26;
    let endW = [1, 1];
    for (let i = 0; i < n; i++) {
      const s = i * ST, d = wob * (vnoise(seed, s * fq) + 0.38 * vnoise(seed + 11, s * fq * 3.4)) + w * 0.3 * vnoise(seed + 5, s / 260);
      const head = Math.min(1, 0.62 + 0.38 * s / tIn), tail = Math.min(1, 0.42 + 0.58 * (L - s) / tOut);
      const press = 0.86 + 0.27 * vnoise(seed + 23, s / 55) + 0.08 * vnoise(seed + 29, s / 13);
      const hw = Math.max(0.7, w * 0.5 * press * Math.min(head, tail));
      const x = pts[i][0] + nr[i][0] * d, y = pts[i][1] + nr[i][1] * d;
      left.push([x + nr[i][0] * hw, y + nr[i][1] * hw]); right.push([x - nr[i][0] * hw, y - nr[i][1] * hw]);
      if (i === 0) endW[0] = [x, y, hw]; if (i === n - 1) endW[1] = [x, y, hw];
    }
    ctx.fillStyle = o.color || INK; ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath(); ctx.fill();
    for (const e of endW) { ctx.beginPath(); ctx.arc(e[0], e[1], e[2], 0, 6.2832); ctx.fill(); }
    if (o.double) {                                       // the occasional doubled stroke: a thinner re-stroke over part of the path
      const a = Math.floor(n * (0.12 + 0.3 * rnd(seed, 1))), b = Math.min(n - 1, a + Math.floor(n * (0.3 + 0.25 * rnd(seed, 2))));
      const sub = pts.slice(a, b).map((p, i) => [p[0] + nr[a + i][0] * w * 0.55, p[1] + nr[a + i][1] * w * 0.55]);
      if (sub.length > 3) roughStroke(ctx, sub, { w: w * 0.5, seed: seed + 101, wob: wob * 1.2, color: o.color, taperIn: 30, taperOut: 40 });
    }
  }
  // closed outline: starts somewhere, runs round and overlaps (or stops short of) its own start
  function roughLoop(ctx, pl, o) {
    o = o || {}; const pts = resample(pl.concat([pl[0]]), 4), n = pts.length - 1;
    const st = Math.floor(n * (o.start != null ? o.start : 0.3)), lap = o.lap != null ? o.lap : 14;   // lap<0 -> gap
    const k = Math.round(lap / 4), run = [];
    for (let i = 0; i <= n + k; i++) run.push(pts[(st + i) % n]);
    roughStroke(ctx, run, o);
  }
  // flat fill that misses the line a little: shifted + its own wobble
  function roughFill(ctx, pl, color, o) {
    o = o || {}; const seed = o.seed != null ? o.seed : nextSeed(), wob = o.wob != null ? o.wob : 3;
    const off = o.off || FILL_OFF, pts = resample(pl, 6), nr = normals(pts, true), n = pts.length;
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const d = wob * vnoise(seed, i * 6 / 110) + (o.grow || 0);
      const x = pts[i][0] + nr[i][0] * d + off[0], y = pts[i][1] + nr[i][1] * d + off[1];
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
  function shape(ctx, pl, o) {            // fill + rough outline
    if (o.fill) roughFill(ctx, pl, o.fill, { off: o.off, wob: o.fwob, grow: o.grow });
    if (o.w !== 0) roughLoop(ctx, pl, o);
  }
  const line = (ctx, pts, o) => roughStroke(ctx, pts.length > 2 ? spline(pts, false) : polyline(pts, false), o);
  function dot(ctx, x, y, r, color, seed) { // wonky filled dot
    seed = seed != null ? seed : nextSeed(); const pts = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832, rr = r * (1 + 0.14 * vnoise(seed, k * 0.9)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (1 + 0.1 * vnoise(seed + 3, 1))]); }
    ctx.fillStyle = color || INK; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
  }

  // ---------- reusable parts (future rig) ----------
  // head: potato outline from normalised points (clockwise from the top)
  function head(ctx, cx, cy, rx, ry, pot, o) {
    const pl = spline(pot.map(p => [cx + p[0] * rx, cy + p[1] * ry]), true);
    shape(ctx, pl, { fill: o.skin, w: o.w || 10, start: o.start != null ? o.start : 0.42, lap: o.lap });
    return pl;
  }
  function ear(ctx, x, y, side, skin, s) {
    s = s || 1; const pl = spline([[x, y - 20 * s], [x + side * 15 * s, y - 16 * s], [x + side * 20 * s, y + 2 * s], [x + side * 11 * s, y + 22 * s], [x, y + 18 * s]], false);
    roughFill(ctx, pl, skin); roughStroke(ctx, pl, { w: 8 });
    line(ctx, [[x + side * 5 * s, y - 6 * s], [x + side * 11 * s, y + 1 * s], [x + side * 5 * s, y + 9 * s]], { w: 4 });
  }
  // sleepy eye: heavy lid line, half a white, pupil pushed where he is looking, a tired bag under it
  function eyeSleepy(ctx, x, y, w, o) {
    o = o || {}; const sl = o.slant || 0, dp = w * 0.4, px = o.px != null ? o.px : -0.5;
    const under = spline([[x - w / 2, y - sl], [x - w * 0.3, y + dp * 0.8 - sl * 0.5], [x + w * 0.05, y + dp], [x + w * 0.36, y + dp * 0.72 + sl * 0.5], [x + w / 2, y + sl]], false);
    roughFill(ctx, under, '#ffffff', { off: [1, 1], wob: 1 });
    dot(ctx, x + px * w * 0.2, y + dp * 0.42, w * 0.19, INK);
    roughStroke(ctx, under, { w: 3.6, wob: 1 });
    line(ctx, [[x - w / 2 - 5, y - sl + 1], [x, y - 2], [x + w / 2 + 6, y + sl + 2]], { w: o.lw || 8, wob: 1.4 });
    line(ctx, [[x - w * 0.34, y + dp + 9], [x + w * 0.02, y + dp + 13], [x + w * 0.36, y + dp + 8]], { w: 3.4, color: '#9b8a86', wob: 1 });
  }
  // dot eye: potato pupil, sparkle, lid arc, two lashes
  function eyeDot(ctx, x, y, rx, ry, o) {
    o = o || {}; const side = o.side || 1;
    const pl = spline([[x, y - ry], [x + rx, y - ry * 0.3], [x + rx * 0.8, y + ry * 0.8], [x - rx * 0.2, y + ry], [x - rx, y + ry * 0.2], [x - rx * 0.75, y - ry * 0.75]], true, 3);
    roughFill(ctx, pl, INK, { off: [0, 0], wob: 0.8 });
    dot(ctx, x - rx * 0.3, y - ry * 0.38, Math.max(3, rx * 0.34), '#ffffff');
    line(ctx, [[x - rx * 1.5, y - ry * 0.75], [x, y - ry * 1.45], [x + rx * 1.6, y - ry * 0.7]], { w: 5.5, wob: 1.2 });
    line(ctx, [[x + side * rx * 1.45, y - ry * 0.85], [x + side * rx * 2.3, y - ry * 1.5]], { w: 4.5, wob: 0.8 });
    line(ctx, [[x + side * rx * 1.0, y - ry * 1.2], [x + side * rx * 1.5, y - ry * 2.0]], { w: 4, wob: 0.8 });
  }
  // noodle arm: a tube along a centre line; fill + the two side strokes (shoulder end left open)
  function arm(ctx, pts, o) {
    const c = resample(spline(pts, false), 4), nr = normals(c, false), n = c.length, hw = (o.w || 46) / 2;
    const wAt = i => hw * (1 + (o.flare || 0) * (i / n));
    const A = c.map((p, i) => [p[0] + nr[i][0] * wAt(i), p[1] + nr[i][1] * wAt(i)]), B = c.map((p, i) => [p[0] - nr[i][0] * wAt(i), p[1] - nr[i][1] * wAt(i)]);
    roughFill(ctx, A.concat(B.slice().reverse()), o.fill, { wob: 2 });
    const sa = Math.floor(n * (o.skipA || 0)), sb = Math.floor(n * (o.skipB || 0));
    roughStroke(ctx, A.slice(sa), { w: o.lw || 10, double: o.doubleA });
    roughStroke(ctx, B.slice(sb), { w: o.lw || 10, double: o.doubleB });
    if (o.cuff !== false) roughStroke(ctx, [A[n - 4], B[n - 4]], { w: 7, over: 3 });      // cuff line
    return { end: c[n - 1], dir: Math.atan2(c[n - 1][1] - c[n - 6][1], c[n - 1][0] - c[n - 6][0]) };
  }
  // mitten hand: potato palm + finger slits + thumb nub
  function hand(ctx, x, y, ang, s, o) {
    o = o || {}; const ca = Math.cos(ang), sa = Math.sin(ang), T = (u, v) => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s], th = o.thumb || 1;
    if (o.thumbBack !== false) shape(ctx, spline([T(-0.1, th * 0.4), T(0.12, th * 0.78), T(0.42, th * 0.74), T(0.4, th * 0.4)], true, 3), { fill: o.skin, w: 6, start: 0.1 });
    shape(ctx, spline([T(-0.5, -0.4), T(0.1, -0.5), T(0.66, -0.42), T(0.86, -0.05), T(0.7, 0.42), T(0.1, 0.5), T(-0.5, 0.42)], true, 3), { fill: o.skin, w: 8, start: 0.95, lap: -10 });
    roughStroke(ctx, [T(0.42, -0.2), T(0.8, -0.2)], { w: 4 }); roughStroke(ctx, [T(0.38, 0.03), T(0.84, 0.05)], { w: 4 }); roughStroke(ctx, [T(0.42, 0.25), T(0.76, 0.27)], { w: 4 });
  }
  // hand-drawn wobbly oval bubble with a small sharp tail + centred text
  function bubble(ctx, b) {
    const seed = nextSeed(), N = 96, ph1 = rnd(seed, 1) * 6.28, ph2 = rnd(seed, 2) * 6.28, ta = b.tailAngle * Math.PI / 180, hwA = (b.tailHalf || 7) * Math.PI / 180;
    const at = a => { const r = 1 + 0.028 * Math.sin(2 * a + ph1) + 0.02 * Math.sin(3 * a + ph2) + 0.012 * Math.sin(5 * a + ph1 * 2); const c = Math.cos(a), s = Math.sin(a), e = 2 / 2.35;
      return [b.cx + Math.sign(c) * Math.pow(Math.abs(c), e) * b.rx * r, b.cy + Math.sign(s) * Math.pow(Math.abs(s), e) * b.ry * r]; };
    const body = []; for (let k = 0; k <= N; k++) body.push(at(ta + hwA + (6.2832 - 2 * hwA) * k / N));
    const b1 = body[0], b2 = body[N], tip = b.tip;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.lineTo(tip[0], tip[1]); ctx.closePath(); ctx.fill();
    roughStroke(ctx, body, { w: b.lw || 5.5, wob: 2.2, freq: 1 / 120, seed: seed + 1, taperIn: 4, taperOut: 8 });
    roughStroke(ctx, [b1, tip], { w: (b.lw || 5.5) * 0.95, wob: 1, over: 3, taperOut: 40 });
    roughStroke(ctx, [tip, b2], { w: (b.lw || 5.5) * 0.95, wob: 1, over: 3, taperIn: 40 });
    ctx.font = b.font; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = b.lh, y0 = b.cy + (b.ty || 0) - (b.lines.length - 1) * lh / 2; let box = [1e9, 1e9, -1e9, -1e9];
    b.lines.forEach((t, i) => { const y = y0 + i * lh, tw = ctx.measureText(t).width, x = b.cx + (b.tx || 0); ctx.fillText(t, x, y);
      const half = lh * 0.42, chord = b.rx * Math.sqrt(Math.max(0, 1 - Math.pow((Math.abs(y - b.cy) + half) / b.ry, 2))) * 2;
      if (tw > chord - 30) console.log('WARN bubble text tight:', t, 'w', tw.toFixed(0), 'chord', chord.toFixed(0));
      box = [Math.min(box[0], x - tw / 2), Math.min(box[1], y - half), Math.max(box[2], x + tw / 2), Math.max(box[3], y + half)]; });
    return box;
  }
  // door: three scribbled frame strokes that run off the bottom; extras are optional
  function door(ctx, x, y, w, o) {
    o = o || {}; const lw = o.lw || 6, col = o.color || '#1d1d1d';
    if (o.inside) roughFill(ctx, polyline([[x, y], [x + w, y], [x + w, H + 20], [x, H + 20]], true), o.inside, { off: [7, 6], wob: 4 });
    if (o.slab) {                                          // a sliver of the opened door leaf, swung inwards
      const sx = x + w - o.slab;
      roughFill(ctx, polyline([[sx, y + 26], [x + w, y + 2], [x + w, H + 20], [sx, H + 20]], true), o.slabFill || '#ecebe4', { off: [3, 2], wob: 2 });
      roughStroke(ctx, polyline([[sx, y + 22], [sx - 3, H + 20]], false), { w: lw, color: col, wob: 3, over: 6 });
      roughStroke(ctx, polyline([[sx, y + 26], [x + w, y + 3]], false), { w: lw * 0.8, color: col, over: 4 });
      shape(ctx, ellipsePts(sx + 36, o.knobY || 1260, 12, 13, 0, 6.2, 16), { fill: '#d9d6cc', w: 5, start: 0.2 });
    }
    roughStroke(ctx, polyline([[x, y], [x - 4, H + 20]], false), { w: lw, color: col, wob: 3.2, over: 14, double: o.double });
    roughStroke(ctx, polyline([[x + w, y], [x + w + 5, H + 20]], false), { w: lw, color: col, wob: 3.2, over: 9 });
    roughStroke(ctx, polyline([[x, y], [x + w, y + (o.tilt || 0)]], false), { w: lw, color: col, wob: 2.6, over: 13 });
    if (o.plate) { const p = o.plate, r = polyline([[p.x - p.w / 2, p.y - p.h / 2], [p.x + p.w / 2, p.y - p.h / 2 + 3], [p.x + p.w / 2 + 2, p.y + p.h / 2], [p.x - p.w / 2 - 2, p.y + p.h / 2 - 2]], true);
      shape(ctx, r, { fill: '#e7e4d9', w: 5, start: 0.05, lap: 10, color: col, off: [3, 3] });
      ctx.save(); ctx.translate(p.x, p.y + 3); ctx.rotate(-0.03); ctx.font = `700 ${p.size || 46}px "Gaegu"`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.text, 0, 0); ctx.restore(); }
    if (o.peep) { shape(ctx, ellipsePts(o.peep[0], o.peep[1], 11, 12, 0, 6.2, 16), { w: 5, start: 0.6, color: col }); dot(ctx, o.peep[0] + 1, o.peep[1] + 1, 3.5, col); }
  }
  // ---------- effect marks ----------
  function sparkle(ctx, x, y, r, rot, fill) {
    const pts = []; for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4, rr = k % 2 ? r * 0.3 : r * (k % 4 ? 0.82 : 1); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    shape(ctx, spline(pts, true, 3), { fill: fill || '#f7d04a', w: Math.max(3.2, r * 0.16), start: 0.07, lap: 8, fwob: 1.5, off: [3, 2] });
  }
  function sweat(ctx, x, y, s, rot) {
    const ca = Math.cos(rot), sa = Math.sin(rot), T = (u, v) => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s];
    shape(ctx, spline([T(0, -1.1), T(0.42, -0.1), T(0.5, 0.55), T(0, 1), T(-0.5, 0.55), T(-0.4, -0.1)], true, 3), { fill: '#bfe2f1', w: 5.5, start: 0.02, lap: 6, off: [3, 2], fwob: 1 });
    roughStroke(ctx, [T(-0.18, 0.2), T(-0.2, 0.55)], { w: 3.5, color: '#ffffff' });
  }
  function blush(ctx, x, y, w, h) {
    roughFill(ctx, ellipsePts(x, y, w, h, 0, 6.2832, 20), '#f6aeaa', { off: [2, 2], wob: 2 });
    for (let k = -1; k <= 1; k++) roughStroke(ctx, [[x + k * w * 0.5 - 5, y + h * 0.55], [x + k * w * 0.5 + 6, y - h * 0.55]], { w: 3.6, color: '#e2807b', wob: 0.8 });
  }
  function flour(ctx, x, y, s) {            // flour dusting: a small white smudge + loose specks, thin grey edge
    const G = '#bdb5aa', pl = spline([[x - 15 * s, y - 2 * s], [x - 4 * s, y - 10 * s], [x + 12 * s, y - 7 * s], [x + 17 * s, y + 3 * s], [x + 4 * s, y + 9 * s], [x - 10 * s, y + 8 * s]], true, 3);
    roughFill(ctx, pl, G, { off: [0, 0], wob: 1.5, grow: 1.8 }); roughFill(ctx, pl, '#ffffff', { off: [0, 0], wob: 1.5 });
    [[-28, -12, 4.5], [27, -15, 5], [33, 8, 3.5], [-24, 14, 4], [4, -24, 3.5], [14, 22, 4.5], [-38, 4, 3], [42, -4, 2.5], [-8, 24, 3]].forEach(d => { dot(ctx, x + d[0] * s, y + d[1] * s, d[2] * s + 1.7, G); dot(ctx, x + d[0] * s, y + d[1] * s, d[2] * s, '#ffffff'); });
  }

  // ---------- characters ----------
  const POT_HIM = [[0, -1], [0.55, -0.9], [0.93, -0.5], [1.0, 0.0], [0.95, 0.42], [0.74, 0.8], [0.3, 1.02], [-0.12, 1.05], [-0.58, 0.84], [-0.9, 0.44], [-1.0, 0.0], [-0.92, -0.5], [-0.5, -0.92]];
  const POT_HER = [[0, -1], [0.55, -0.88], [0.92, -0.5], [1.02, 0.02], [0.99, 0.46], [0.74, 0.86], [0.26, 1.03], [-0.2, 1.0], [-0.7, 0.82], [-1.0, 0.42], [-1.0, -0.05], [-0.9, -0.52], [-0.5, -0.9]];

  function drawHero(ctx) {
    const cx = 680, cy = 700, SK = '#f6e1d2', SKS = '#e3c4b3', HD = '#a8abb1', HD2 = '#8b8e95';
    // sweatpants
    shape(ctx, polyline([[570, 1588], [792, 1588], [803, 1940], [557, 1940]], true), { fill: '#3b3b41', w: 10, start: 0.02 });
    line(ctx, [[683, 1700], [679, 1820], [684, 1940]], { w: 6, color: '#18181b' });
    // hood bunched behind the neck
    shape(ctx, spline([[604, 938], [600, 884], [630, 850], [680, 838], [730, 849], [760, 888], [758, 942], [680, 950]], true), { fill: HD2, w: 10, start: 0.6 });
    // long neck + hard chin shadow
    roughFill(ctx, polyline([[650, 800], [712, 800], [716, 918], [680, 934], [646, 918]], true), SK, { wob: 1 });
    roughFill(ctx, polyline([[648, 812], [714, 812], [714, 850], [650, 868]], true), SKS, { off: [2, 2], wob: 1 });
    line(ctx, [[651, 826], [648, 870], [646, 914]], { w: 9 }); line(ctx, [[712, 824], [716, 872], [715, 914]], { w: 9 });
    // hoodie torso: narrow, sloping, one shoulder lower than the other
    shape(ctx, spline([[640, 905], [600, 930], [562, 975], [566, 1100], [574, 1300], [570, 1480], [562, 1594], [620, 1612], [680, 1616], [742, 1612], [798, 1594], [792, 1480], [788, 1300], [798, 1110], [806, 994], [770, 942], [722, 905], [680, 930]], true), { fill: HD, w: 10, start: 0.02, double: true });
    line(ctx, [[568, 1556], [680, 1570], [794, 1556]], { w: 6 });                                         // rib hem
    line(ctx, [[612, 1556], [620, 1392], [656, 1356], [704, 1352], [744, 1360], [754, 1400], [760, 1556]], { w: 7 }); // pocket
    line(ctx, [[658, 936], [651, 1010], [657, 1092]], { w: 5.5 }); line(ctx, [[705, 936], [713, 1000], [707, 1058]], { w: 5.5 }); // strings
    dot(ctx, 657, 1098, 6); dot(ctx, 707, 1064, 6);
    // noodle arms hanging dead straight (uneven lengths)
    const a1 = arm(ctx, [[590, 962], [563, 1090], [551, 1250], [553, 1490], [556, 1596]], { w: 52, fill: HD, skipB: 0.17, doubleA: true });
    const a2 = arm(ctx, [[774, 974], [812, 1100], [829, 1250], [823, 1500], [816, 1626]], { w: 52, fill: HD, skipA: 0.17 });
    hand(ctx, a1.end[0] + 1, a1.end[1] + 24, a1.dir, 44, { skin: SK, thumb: -1 });
    hand(ctx, a2.end[0] - 1, a2.end[1] + 24, a2.dir, 44, { skin: SK, thumb: 1 });
    // head (tilted a little, looking down at her)
    ctx.save(); ctx.translate(cx, cy + 112); ctx.rotate(-0.075); ctx.translate(-cx, -(cy + 112));
    ear(ctx, cx - 94, cy + 16, -1, SK); ear(ctx, cx + 93, cy + 22, 1, SK);
    head(ctx, cx, cy, 96, 124, POT_HIM, { skin: SK, start: 0.36, lap: 16 });
    // deadpan face, looking down-left at her
    line(ctx, [[cx - 64, cy - 25], [cx - 44, cy - 27], [cx - 24, cy - 21]], { w: 8.5, wob: 1.2 });           // brows
    line(ctx, [[cx + 22, cy - 17], [cx + 42, cy - 19], [cx + 60, cy - 13]], { w: 8, wob: 1.2 });
    eyeSleepy(ctx, cx - 45, cy + 5, 52, { px: -0.9, slant: 2 });
    eyeSleepy(ctx, cx + 40, cy + 15, 38, { px: -0.9, slant: 1, lw: 7.5 });
    roughFill(ctx, polyline([[cx - 2, cy + 34], [cx + 12, cy + 62], [cx - 4, cy + 66]], true), SKS, { off: [1, 1], wob: 1 }); // nose shadow
    line(ctx, [[cx - 1, cy + 30], [cx - 8, cy + 60], [cx + 5, cy + 65]], { w: 4.8, wob: 1 });
    line(ctx, [[cx - 24, cy + 89], [cx - 2, cy + 92], [cx + 17, cy + 90]], { w: 7, wob: 1 });                // mouth: a flat line
    line(ctx, [[cx + 19, cy + 86], [cx + 23, cy + 96]], { w: 4.5 });
    // messy black bed-hair: lumpy mop with uneven tufts + scratchy strands
    const hairPts = [[-98, 14], [-103, -30], [-123, -46], [-104, -66], [-117, -99], [-98, -110], [-97, -139], [-70, -137], [-58, -161], [-31, -150], [-24, -178], [-3, -152], [29, -159], [44, -148], [73, -157], [82, -130], [112, -121], [100, -98], [119, -69], [102, -58], [108, -30], [100, 12],
      [91, -18], [86, -52], [70, -44], [58, -66], [41, -38], [30, -62], [8, -52], [-6, -70], [-27, -34], [-44, -60], [-66, -50], [-82, -66], [-88, -24]].map(p => [cx + p[0], cy + p[1]]);
    roughFill(ctx, polyline(hairPts, true, 4), '#141414', { off: [0, 0], wob: 2.2 });
    [[[-26, -170], [-34, -205]], [[-18, -172], [-10, -200]], [[70, -150], [92, -170]], [[108, -118], [132, -124]], [[-114, -96], [-136, -108]], [[114, -70], [136, -62]], [[-118, -46], [-136, -40]],
     [[-27, -40], [-31, -22]], [[41, -44], [38, -26]], [[-96, -134], [-108, -152]]].forEach(s =>
      roughStroke(ctx, [[cx + s[0][0], cy + s[0][1]], [cx + s[1][0], cy + s[1][1]]], { w: 5, wob: 1.2, taperOut: 34 }));
    line(ctx, [[cx - 46, cy - 112], [cx - 14, cy - 124], [cx + 22, cy - 112]], { w: 3.5, color: '#5a5a60' });   // one dull highlight scratch
    ctx.restore();
    return { face: [cx - 110, cy - 150, cx + 110, cy + 135] };
  }

  function drawHeroine(ctx) {
    const cx = 255, cy = 1055, SK = '#fde4d2', SKS = '#ecc6b2', CD = '#ecd9a2', HR = '#8a5631', HRD = '#4d2b16';
    // skirt + cream cardigan
    shape(ctx, polyline([[142, 1682], [376, 1682], [402, 1940], [116, 1940]], true), { fill: '#7f8aa1', w: 10, start: 0.02 });
    shape(ctx, spline([[222, 1228], [182, 1244], [142, 1284], [146, 1400], [156, 1560], [144, 1650], [140, 1702], [200, 1715], [258, 1718], [320, 1715], [378, 1702], [372, 1650], [356, 1560], [366, 1400], [372, 1284], [330, 1244], [290, 1228], [256, 1246]], true), { fill: CD, w: 10, start: 0.02, double: true });
    roughFill(ctx, polyline([[224, 1232], [256, 1424], [290, 1232]], true), '#fcfbf6', { off: [2, 1], wob: 1 });  // inner top
    line(ctx, [[222, 1230], [234, 1330], [255, 1430]], { w: 8 }); line(ctx, [[292, 1230], [279, 1330], [258, 1430]], { w: 8 });
    line(ctx, [[256, 1430], [252, 1580], [255, 1710]], { w: 6 });
    [[268, 1496], [266, 1596], [265, 1672]].forEach(b => shape(ctx, ellipsePts(b[0], b[1], 10, 10, 0, 6.2, 14), { fill: '#b98b52', w: 4.5, start: 0.3, off: [2, 2] }));
    shape(ctx, polyline([[172, 1572], [232, 1570], [230, 1652], [174, 1648]], true), { w: 6, start: 0.03, lap: -8 });   // patch pocket
    // noodle arms: one dangling, one swooping up to shove the bag at him
    const a1 = arm(ctx, [[166, 1280], [138, 1372], [117, 1480], [127, 1640], [136, 1700]], { w: 46, fill: CD, skipB: 0.18 });
    hand(ctx, a1.end[0], a1.end[1] + 22, a1.dir, 40, { skin: SK, thumb: -1 });
    arm(ctx, [[348, 1284], [372, 1342], [392, 1400], [436, 1392], [454, 1276]], { w: 44, fill: CD, skipA: 0.2, doubleB: true });
    flour(ctx, 404, 1404, 0.7);
    // wavy shoulder-length brown hair: back mass first, silhouette stroke after the head
    ctx.save(); ctx.translate(cx, 1236); ctx.rotate(0.055); ctx.translate(-cx, -1236);
    const sil = [[74, 1264], [100, 1215], [116, 1150], [116, 1080], [128, 998], [178, 933], [255, 918], [332, 933], [382, 998], [394, 1080], [392, 1150], [408, 1215], [434, 1264]];
    const silW = wavy(spline(sil, false), 5, 74, 1.1);
    roughFill(ctx, silW.concat(spline([[434, 1264], [380, 1276], [330, 1258], [255, 1242], [180, 1258], [128, 1278], [74, 1264]], false)), HR, { wob: 2 });
    line(ctx, [[434, 1264], [380, 1277], [330, 1259], [292, 1246]], { w: 9 }); line(ctx, [[74, 1264], [128, 1279], [180, 1259], [220, 1246]], { w: 9 });
    // neck
    roughFill(ctx, polyline([[231, 1150], [281, 1150], [285, 1238], [257, 1266], [229, 1238]], true), SK, { wob: 1 });
    roughFill(ctx, polyline([[230, 1160], [283, 1160], [283, 1188], [232, 1200]], true), SKS, { off: [2, 2], wob: 1 });
    line(ctx, [[232, 1172], [229, 1236], [256, 1264], [284, 1236], [282, 1172]], { w: 7 });
    // potato head
    head(ctx, cx, cy, 116, 110, POT_HER, { skin: SK, start: 0.3, lap: 14 });
    // face: uneven dot eyes, raised brows, big lopsided grin
    blush(ctx, cx - 76, cy + 40, 26, 15); blush(ctx, cx + 76, cy + 36, 24, 14);
    eyeDot(ctx, cx - 47, cy + 3, 15, 19, { side: -1 }); eyeDot(ctx, cx + 46, cy - 7, 10, 12, { side: 1 });
    line(ctx, [[cx - 70, cy - 40], [cx - 48, cy - 51], [cx - 26, cy - 44]], { w: 5.5, color: HRD, wob: 1 });
    line(ctx, [[cx + 24, cy - 50], [cx + 46, cy - 60], [cx + 66, cy - 51]], { w: 5.5, color: HRD, wob: 1 });
    line(ctx, [[cx - 4, cy + 16], [cx + 4, cy + 23], [cx - 4, cy + 27]], { w: 4.5, wob: 0.8 });                 // nose
    const mouth = spline([[cx - 44, cy + 46], [cx - 10, cy + 52], [cx + 30, cy + 46], [cx + 50, cy + 36], [cx + 40, cy + 74], [cx + 8, cy + 94], [cx - 26, cy + 82]], true, 3);
    roughFill(ctx, mouth, '#7c2d2a', { off: [1, 1], wob: 1 });
    roughFill(ctx, spline([[cx - 14, cy + 82], [cx + 8, cy + 72], [cx + 30, cy + 78], [cx + 12, cy + 92]], true, 3), '#f0928a', { off: [1, 1], wob: 1 });   // tongue
    roughFill(ctx, spline([[cx - 40, cy + 47], [cx - 10, cy + 52], [cx + 30, cy + 46], [cx + 47, cy + 38], [cx + 44, cy + 52], [cx + 10, cy + 63], [cx - 32, cy + 60]], true, 3), '#ffffff', { off: [1, 1], wob: 0.8 }); // teeth
    roughLoop(ctx, mouth, { w: 7, start: 0.02, lap: 10, wob: 1.4 });
    line(ctx, [[cx - 52, cy + 38], [cx - 46, cy + 48]], { w: 4.5 }); line(ctx, [[cx + 56, cy + 27], [cx + 53, cy + 39]], { w: 4.5 });
    flour(ctx, cx + 80, cy + 52, 0.8);
    // hair cap (arch over the face) + thin see-through bangs
    const capIn = [[136, 1082], [146, 1012], [184, 968], [255, 952], [326, 968], [362, 1012], [374, 1082]];
    roughFill(ctx, spline(capIn, false).concat(spline([[392, 1070], [380, 998], [330, 936], [255, 921], [180, 936], [130, 998], [118, 1070]], false)), HR, { off: [0, 0], wob: 1.5 });
    line(ctx, capIn, { w: 9, over: 2 });
    roughStroke(ctx, silW, { w: 10, double: true });
    [[[200, 962], [196, 1000], [186, 1024]], [[222, 956], [224, 996], [218, 1018]], [[246, 954], [250, 992], [246, 1022]], [[270, 954], [272, 990], [278, 1014]], [[294, 958], [300, 994], [298, 1020]], [[316, 964], [326, 998], [330, 1016]]]
      .forEach(s => line(ctx, s, { w: 6, color: HR, wob: 1.2, taperOut: 30 }));
    // strands: darker flow lines + scratchy fly-aways
    [[[150, 990], [136, 1060], [130, 1130]], [[366, 990], [378, 1060], [380, 1130]], [[110, 1170], [104, 1220], [92, 1250]], [[400, 1170], [410, 1222], [420, 1252]], [[220, 934], [190, 944], [166, 966]], [[292, 934], [322, 946], [344, 968]]]
      .forEach(s => line(ctx, s, { w: 4.2, color: HRD, wob: 1.4 }));
    [[[76, 1262], [54, 1268]], [[434, 1262], [458, 1262]], [[250, 918], [240, 890]], [[272, 920], [284, 894]], [[120, 1040], [100, 1030]]].forEach(s => roughStroke(ctx, s, { w: 4.5, wob: 1, taperOut: 30 }));
    ctx.restore();
    // the bread bag: 소금빵 peeking out of a kraft paper bag, held from the corner
    const bread = spline([[438, 1096], [444, 1050], [474, 1014], [516, 1002], [556, 1018], [574, 1056], [566, 1096]], true);
    shape(ctx, bread, { fill: '#e2a64c', w: 9, start: 0.6 });
    line(ctx, [[464, 1034], [476, 1054], [474, 1078]], { w: 5, color: '#8a5a22' }); line(ctx, [[498, 1014], [512, 1042], [510, 1074]], { w: 5, color: '#8a5a22' }); line(ctx, [[534, 1018], [550, 1046], [548, 1074]], { w: 5, color: '#8a5a22' });
    [[486, 1032], [524, 1028], [492, 1058], [530, 1056]].forEach(g => dot(ctx, g[0], g[1], 4.5, '#ffffff'));
    const top = []; for (let k = 0; k <= 12; k++) top.push([432 + (566 - 432) * k / 12, 1078 - 8 * k / 12 + (k % 2 ? -9 : 4)]);
    const bag = polyline([[440, 1258]].concat(top, [[576, 1250]]), true, 4);
    shape(ctx, bag, { fill: '#cf9f62', w: 9, start: 0.0, lap: 12 });
    roughFill(ctx, polyline([[541, 1078], [564, 1076], [573, 1246], [549, 1248]], true), '#b5844a', { off: [1, 1], wob: 1 });   // side fold: hard shadow
    line(ctx, [[541, 1080], [546, 1160], [549, 1246]], { w: 4.5 });
    shape(ctx, ellipsePts(488, 1166, 37, 36, 0, 6.2, 22), { fill: '#fffdf6', w: 5, start: 0.4, lap: 12, off: [2, 2] });
    ctx.save(); ctx.translate(489, 1170); ctx.rotate(-0.1); ctx.font = '700 52px "Gaegu"'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('빵', 0, 0); ctx.restore();
    hand(ctx, 452, 1250, -1.45, 40, { skin: SK, thumbBack: false });
    return { face: [cx - 125, cy - 130, cx + 125, cy + 120] };
  }

  // ---------- the cut ----------
  function draw(canvas) {
    _seed = 1; canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d'); ctx.lineJoin = 'round';
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const rep = { faces: [], texts: [] };
    // hallway = two scribbled doors and a number plate
    door(ctx, 62, 545, 338, { plate: { x: 232, y: 652, w: 124, h: 62, text: '301', size: 54 }, peep: [232, 772], tilt: -5, double: true });
    door(ctx, 485, 534, 390, { inside: '#d2d2cf', slab: 60, knobY: 1196, tilt: 4 });
    const DX = -20; ctx.save(); ctx.translate(DX, 0); const f1 = drawHero(ctx); ctx.restore(); rep.faces.push([f1.face[0] + DX - 12, f1.face[1], f1.face[2] + DX, f1.face[3]]);
    const DY = -45; ctx.save(); ctx.translate(0, DY);
    const f2 = drawHeroine(ctx); ctx.restore(); rep.faces.push([f2.face[0], f2.face[1] + DY, f2.face[2], f2.face[3] + DY]);
    // scribbled effect marks
    sweat(ctx, 788, 656, 19, 0.25);
    sparkle(ctx, 402, 958, 33, 0.1); sparkle(ctx, 440, 890, 22, 0.45);
    line(ctx, [[488, 938], [478, 916], [492, 896], [482, 872]], { w: 5, color: '#444' }); line(ctx, [[526, 934], [536, 914], [524, 894], [534, 874]], { w: 5, color: '#444' });
    // bubbles (hers first, top-left; his lower right) + his bubble-less aside
    rep.texts.push(bubble(ctx, { cx: 296, cy: 332, rx: 254, ry: 124, tailAngle: 98, tailHalf: 4, tip: [254, 506], lines: ['할머니, 오늘은', '소금빵이에요!'], font: '800 58px "PretendardXB"', lh: 76, ty: 2 }));
    rep.texts.push(bubble(ctx, { cx: 762, cy: 392, rx: 182, ry: 114, tailAngle: 112, tailHalf: 6, tip: [690, 532], lines: ['…할머니', '아닌데요.'], font: '700 56px "PretendardB"', lh: 72, ty: 2 }));
    ctx.save(); ctx.translate(966, 694); ctx.rotate(-0.045); ctx.font = '700 40px "PretendardB"'; ctx.fillStyle = '#1c1c1c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let mw = 0; ['(2주째', '받아먹는', '중)'].forEach((t, i) => { ctx.fillText(t, 0, (i - 1) * 50); mw = Math.max(mw, ctx.measureText(t).width); });
    ctx.restore(); rep.texts.push([966 - mw / 2, 694 - 72, 966 + mw / 2, 694 + 72]);
    return rep;
  }

  root.SCENE = { W, H, draw, roughStroke, roughLoop, roughFill, shape, spline, polyline, head, ear, eyeSleepy, eyeDot, arm, hand, bubble, door, sparkle, sweat, blush, flour };
})(typeof window !== 'undefined' ? window : globalThis);
