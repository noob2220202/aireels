// lab/d_bamti_lanky/scene.js — "현실 고증 밤티": crude brush-pen cut, all drawn by code (Canvas 2D).
// Building blocks: noise -> roughStroke/roughFill -> head/hair/eyes/body/arm/bubble/door -> hero/heroine -> draw.
(function () {
  const W = 1080, H = 1920;
  const C = {
    bg: '#f8f6f1', ink: '#161617', room: '#e2e0db', leaf: '#cfcdc8',
    skin: '#f6e2d7', skinS: '#e2c3b6', bag: '#e9d3cd', blush: '#f1b7a8',
    black: '#17171a', brown: '#74492d', brownD: '#4b2d1c',
    hood: '#a3a4a9', hoodS: '#85868c', pants: '#56575e',
    cream: '#eedfb4', creamS: '#d9c58f', tee: '#fdfcf8', skirt: '#a59078',
    kraft: '#d0a873', kraftS: '#b08856', bread: '#e0a44c', breadS: '#b97b2c',
  };
  let ctx, SEED = 11;
  const ns = () => (SEED += 17);

  // ---------- deterministic noise (no Math.random / Date) ----------
  function hash(n) { n |= 0; n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; }
  function vnoise(seed, t) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return (hash(seed * 7919 + i) * (1 - u) + hash(seed * 7919 + i + 1) * u) * 2 - 1; }

  // ---------- path helpers ----------
  const pt = (...a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
  function dens(P, closed, step = 5) {
    const Q = closed ? P.concat([P[0]]) : P, out = [Q[0].slice()];
    for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    return out;
  }
  function spl(P, closed, step = 5) { // Catmull-Rom through the control points
    const n = P.length, out = [], g = i => closed ? P[((i % n) + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2), k = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
      for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t, f = q => 0.5 * (2 * b[q] + (c[q] - a[q]) * t + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * t2 + (3 * b[q] - a[q] - 3 * c[q] + d[q]) * t3); out.push([f(0), f(1)]); }
    }
    out.push(closed ? out[0].slice() : P[n - 1].slice());
    return out;
  }
  function ell(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, rot = 0, pow = 2) {
    const out = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 5)), cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, c = Math.cos(a), s = Math.sin(a), x = Math.sign(c) * Math.pow(Math.abs(c), 2 / pow) * rx, y = Math.sign(s) * Math.pow(Math.abs(s), 2 / pow) * ry; out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
    return out;
  }

  // ---------- the pen: a filled ribbon with low-frequency wobble and uneven pressure ----------
  function roughStroke(pts, o = {}) {
    if (pts.length < 2) return;
    const w = o.w ?? 6.5, wob = o.wob ?? 3.1, seed = o.seed ?? ns(), over = o.over ?? 5, t0 = o.t0 ?? 0.6, t1 = o.t1 ?? 0.22;
    const p = pts.map(q => q.slice()), ext = (a, b, d) => { const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / l * d, a[1] + (a[1] - b[1]) / l * d]; };
    if (over) { const m = Math.min(3, p.length - 1); p.unshift(ext(p[0], p[m], over * (0.5 + hash(seed)))); p.push(ext(p[p.length - 1], p[p.length - 1 - m], over * (0.4 + 1.2 * hash(seed + 1)))); }
    const n = p.length, s = [0]; for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const L = s[n - 1] || 1, tl = Math.min(L * 0.4, o.tail ?? 70), A = [], B = [];
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const d = wob * (vnoise(seed, s[i] / 85) + 0.4 * vnoise(seed + 3, s[i] / 26));
      const press = 0.82 + 0.5 * vnoise(seed + 5, s[i] / 105) + 0.12 * vnoise(seed + 9, s[i] / 17);
      const st = t0 + (1 - t0) * Math.min(1, s[i] / 12), en = (L - s[i]) < tl ? t1 + (1 - t1) * Math.pow((L - s[i]) / tl, 0.8) : 1;
      const hw = Math.max(0.7, w * press * st * en) / 2, x = p[i][0] + nx * d, y = p[i][1] + ny * d;
      A.push([x + nx * hw, y + ny * hw]); B.push([x - nx * hw, y - ny * hw]);
    }
    ctx.fillStyle = o.color ?? C.ink; ctx.beginPath();
    A.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); for (let i = n - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]);
    ctx.closePath(); ctx.fill();
    const r0 = Math.hypot(A[0][0] - B[0][0], A[0][1] - B[0][1]) / 2; ctx.beginPath(); ctx.arc((A[0][0] + B[0][0]) / 2, (A[0][1] + B[0][1]) / 2, r0, 0, 7); ctx.fill();
    if (o.dbl && hash(seed * 31 + 7) < o.dbl && pts.length > 12) { // the occasional doubled stroke
      const i0 = Math.floor(pts.length * (0.08 + 0.3 * hash(seed + 21))), i1 = Math.floor(pts.length * (0.6 + 0.35 * hash(seed + 22)));
      roughStroke(pts.slice(i0, i1), { ...o, w: w * 0.42, wob: wob * 1.6 + 1.2, seed: seed + 101, dbl: 0, over: 0 });
    }
  }
  function roughFill(pts, color, o = {}) { // flat fill that sits a little off the line, like quick colouring
    const dx = o.dx ?? 5, dy = o.dy ?? 4, wob = o.wob ?? 3, seed = o.seed ?? ns(); let s = 0;
    ctx.fillStyle = color; ctx.beginPath();
    pts.forEach((q, i) => { if (i) s += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]); const x = q[0] + dx + wob * vnoise(seed, s / 70), y = q[1] + dy + wob * vnoise(seed + 1, s / 70); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill();
  }
  // shorthands: F = fill, L = one curved stroke, K = straight segments each drawn as its own stroke (overshooting corners), LP = curve drawn in several pen lifts
  const F = (P, col, o = {}) => roughFill(o.curve === false ? dens(P, true) : spl(P, true), col, o);
  const L = (P, o = {}) => roughStroke(o.raw ? P : spl(P, !!o.closed), { dbl: 0.32, ...o });
  const K = (P, o = {}) => { for (let i = 1; i < P.length; i++) roughStroke(dens([P[i - 1], P[i]]), { dbl: 0.32, ...o, seed: (o.seed ?? ns()) + i * 13 }); };
  function LP(pts, parts, o = {}) { const n = pts.length; for (let k = 0; k < parts; k++) { const s0 = o.seed ?? ns(), i0 = Math.max(0, Math.floor(n * k / parts) + (k ? Math.round(3 * hash(s0 + 4)) : 0)), i1 = Math.min(n, Math.floor(n * (k + 1) / parts) + 1 - Math.round(2 * hash(s0 + 6))); roughStroke(pts.slice(i0, i1), { dbl: 0.32, ...o, seed: s0 + k * 7 }); } }
  const dot = (x, y, r, col) => { ctx.fillStyle = col ?? C.ink; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0.3, 0, 7); ctx.fill(); };
  const at = (dx, dy, sc, fn) => { ctx.save(); ctx.translate(dx, dy); if (sc && sc !== 1) ctx.scale(sc, sc); fn(); ctx.restore(); };

  // ---------- reusable parts ----------
  // eyes: 'sleepy' = heavy flat lid, half-hidden pupil, bag underneath; 'bright' = round open eye with highlight
  function eye(x, y, o = {}) {
    const w = o.w ?? 18, lk = o.look ?? [0, 0];
    if (o.kind === 'bright') {
      roughFill(ell(x, y, w, w * 0.82), '#fff', { dx: 1, dy: 1, wob: 1 });
      dot(x + lk[0], y + lk[1], w * 0.46); dot(x + lk[0] + w * 0.2, y + lk[1] - w * 0.22, w * 0.17, '#fff');
      L(pt(x - w - 3, y + 2, x - w * 0.5, y - w * 0.8, x + w * 0.4, y - w * 0.86, x + w + 4, y - 1), { w: 6, wob: 1.2, over: 2 });
      L(pt(x - w + 3, y + w * 0.74, x, y + w * 0.9, x + w - 2, y + w * 0.6), { w: 2.6, wob: 1, over: 0 });
      if (o.lash) { L(pt(x + o.lash * (w + 2), y - 3, x + o.lash * (w + 11), y - 10), { w: 3.4, wob: .6, over: 0 }); }
      return;
    }
    if (o.bag) roughFill(spl(pt(x - w, y + 9, x, y + 13, x + w, y + 9, x + w - 3, y + 21, x, y + 26, x - w + 3, y + 21), true), C.bag, { dx: 2, dy: 2, wob: 1.2 });
    roughFill(spl(pt(x - w, y + 2, x, y - 2, x + w, y + 1, x + w - 4, y + 10, x, y + 12, x - w + 4, y + 10), true), '#fff', { dx: 0, dy: 1, wob: .8 });
    ctx.save(); ctx.beginPath(); ctx.rect(x - w - 6, y + 1, w * 2 + 12, 13); ctx.clip(); dot(x + lk[0], y + 4 + lk[1], 7.6); ctx.restore();
    L(pt(x - w - 5, y + 3, x - 3, y - 2, x + w + 5, y + 2), { w: 7.5, wob: 1.2, over: 3, t1: .5 });
    L(pt(x - w + 5, y + 12, x, y + 13.5, x + w - 5, y + 12), { w: 2.6, wob: .8, over: 0 });
    if (o.bag) L(pt(x - w + 4, y + 21, x, y + 26, x + w - 1, y + 20), { w: 2.6, wob: 1, over: 2, color: '#8c7773' });
  }
  function brow(x, y, len, tilt, o = {}) { L(pt(x - len / 2, y + tilt, x, y - (o.arch ?? 0), x + len / 2, y - tilt), { w: o.w ?? 8, wob: 1.2, over: 2, t1: .45 }); }
  // head: fill + outline in a few pen lifts
  function head(P, o = {}) { const p = spl(P, true); roughFill(p, C.skin, { dx: 3, dy: 2, wob: 1.5 }); LP(p, o.parts ?? 3, { w: o.w ?? 6.5, wob: 2 }); }
  function ear(x, y, side) { const P = pt(x, y - 18, x + side * 16, y - 20, x + side * 20, y + 4, x + side * 6, y + 24, x, y + 14); F(P, C.skin, { dx: 1, dy: 1, wob: 1 }); L(P, { w: 5.5, wob: 1.4 }); L(pt(x + side * 6, y - 8, x + side * 11, y, x + side * 6, y + 9), { w: 2.8, wob: .8, over: 0 }); }
  // hair: solid flat mass + scratchy strand strokes poking out of the edge
  function strands(list, o = {}) { list.forEach(s => L(pt(...s), { w: o.w ?? 5, wob: 1.6, over: 0, t0: 1, t1: 0.08, tail: 200, color: o.color ?? C.black, dbl: 0 })); }
  // arm: a sleeve tube from two edge curves, cuff line at the end
  function arm(outer, inner, col, o = {}) {
    const a = spl(outer), b = spl(inner); roughFill(a.concat(b.slice().reverse()), col, { dx: 3, dy: 2, wob: 2 });
    roughStroke(a, { w: 6.5, dbl: .3 }); roughStroke(b, { w: 6 });
    const e1 = outer[outer.length - 1], e2 = inner[inner.length - 1]; K([e1, e2], { w: 5.5 });
    if (o.cuff) { const k = o.cuff; L([[e1[0] + k[0], e1[1] + k[1]], [e2[0] + k[0], e2[1] + k[1]]], { w: 3.4, wob: 1.2, raw: false }); }
  }
  // speech bubble: wobbly hand-drawn oval, thin outline, small sharp tail; text in plain bold gothic
  function bubble(cx, cy, lines, o = {}) {
    const size = o.size ?? 56, lh = size * (o.lh ?? 1.24); ctx.font = `800 ${size}px "PretendardEB"`;
    const tw = Math.max(...lines.map(t => ctx.measureText(t).width)), rx = tw / 2 + (o.px ?? 58), ry = lines.length * lh / 2 + (o.py ?? 50), sd = o.seed ?? ns();
    const base = ell(cx, cy, rx, ry, -1.9, -1.9 + Math.PI * 2 + 0.16, o.rot ?? 0, 2.35);
    const pts = base.map((q, i) => { const k = 1 + 0.028 * vnoise(sd, i / 26) + 0.012 * vnoise(sd + 2, i / 7); return [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k]; });
    roughFill(pts, '#fff', { dx: 0, dy: 0, wob: 0 });
    roughStroke(pts, { w: o.w ?? 4.6, wob: 1.6, over: 10, t0: .8, t1: .35, seed: sd + 5 });
    if (o.tail) {
      const [tx, ty] = o.tail, a = Math.atan2((ty - cy) / ry, (tx - cx) / rx), bw = o.tw ?? 0.12;
      const e = t => [cx + Math.cos(t) * rx * 0.985, cy + Math.sin(t) * ry * 0.985], p1 = e(a - bw), p2 = e(a + bw), mid = e(a), in1 = [p1[0] + (cx - p1[0]) * .12, p1[1] + (cy - p1[1]) * .12], in2 = [p2[0] + (cx - p2[0]) * .12, p2[1] + (cy - p2[1]) * .12];
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(in1[0], in1[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(tx, ty); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(in2[0], in2[1]); ctx.closePath(); ctx.fill();
      roughStroke(dens([p1, [tx, ty]]), { w: 4.4, wob: 1, over: 2, t0: .9, t1: .5, seed: sd + 8 }); roughStroke(dens([[tx, ty], p2]), { w: 4.2, wob: 1, over: 3, t0: .7, t1: .7, seed: sd + 9 });
    }
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((t, i) => ctx.fillText(t, cx + (o.tx ?? 0), cy + (i - (lines.length - 1) / 2) * lh + size * 0.04));
    REPORT.push({ what: lines.join(' / '), text: [Math.round(cx - tw / 2), Math.round(cy - lines.length * lh / 2), Math.round(cx + tw / 2), Math.round(cy + lines.length * lh / 2)], oval: [Math.round(cx - rx), Math.round(cy - ry), Math.round(cx + rx), Math.round(cy + ry)] });
  }
  function aside(cx, cy, lines, o = {}) { // bubble-less line floating next to a character
    const size = o.size ?? 40, lh = size * 1.22; ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot ?? 0);
    ctx.font = `700 ${size}px "PretendardB"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const tw = Math.max(...lines.map(t => ctx.measureText(t).width));
    lines.forEach((t, i) => { const y = (i - (lines.length - 1) / 2) * lh; ctx.strokeStyle = o.halo ?? C.bg; ctx.lineWidth = 14; ctx.strokeText(t, 0, y); });
    lines.forEach((t, i) => { const y = (i - (lines.length - 1) / 2) * lh; ctx.fillStyle = '#1b1b1c'; ctx.fillText(t, 0, y); });
    ctx.restore();
    REPORT.push({ what: lines.join(' / '), text: [Math.round(cx - tw / 2), Math.round(cy - lines.length * lh / 2), Math.round(cx + tw / 2), Math.round(cy + lines.length * lh / 2)] });
  }
  // door: scribbled outline (+ flat fill if open), optional lever handle and number plate
  function door(x0, y0, x1, o = {}) {
    if (o.fill) roughFill(dens(pt(x0, y0, x1, y0, x1, H + 20, x0, H + 20), true), o.fill, { dx: 7, dy: 6, wob: 3 });
    if (o.leaf) { const lx = o.leaf; roughFill(dens(pt(x1, y0, lx, y0 + 46, lx, H + 20, x1, H + 20), true), C.leaf, { dx: 3, dy: 4, wob: 2 }); K(pt(x1 - 2, y0 + 2, lx, y0 + 46, lx - 2, H + 20), { w: 5, wob: 3 }); K(pt(lx - 6, 1262, lx - 44, 1266, lx - 46, 1284), { w: 6, wob: 1.2 }); }
    if (o.left !== false) K(pt(x0 + 3, H + 20, x0, y0 - 2), { w: 6, wob: 3.4, over: 9 });
    K(pt(x0 - 4, y0 + 2, x1 + 3, y0 - 3), { w: 6, wob: 3, over: 12 });
    if (o.right !== false) K(pt(x1, y0, x1 + 4, H + 20), { w: 6, wob: 3.4, over: 9 });
    if (o.handle) { const [hx, hy] = o.handle; K(pt(hx, hy, hx + 44, hy + 2), { w: 6.5, wob: 1.2 }); K(pt(hx + 2, hy - 2, hx, hy + 22), { w: 5, wob: 1 }); }
    if (o.plate) { const [px, py, txt] = o.plate; roughFill(dens(pt(px, py, px + 96, py - 2, px + 98, py + 46, px + 1, py + 48), true), '#fff', { dx: 2, dy: 2 }); K(pt(px, py, px + 96, py - 2, px + 98, py + 46, px + 1, py + 48, px, py), { w: 3.6, wob: 1.4, over: 5 }); ctx.font = '700 44px "Gaegu"'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, px + 49, py + 25); }
  }

  // ---------- HERO: 29, night-shift WFH, tall, messy black hair, grey hoodie, sleepy & blank ----------
  function heroBody() {
    // hood lump behind the neck
    F(pt(600, 850, 608, 780, 642, 752, 702, 748, 732, 778, 744, 850), C.hoodS, { dx: 2, dy: 2 }); L(pt(600, 850, 608, 780, 642, 752, 702, 748, 732, 778, 744, 850), { w: 6 });
    // sweatpants
    F(pt(570, 1408, 798, 1408, 806, 1940, 560, 1940), C.pants, { curve: false, dx: 5, dy: 0 });
    L(pt(568, 1420, 562, 1700, 560, 1940), { w: 6.5 }); L(pt(798, 1420, 804, 1700, 806, 1940), { w: 6.5 }); L(pt(684, 1575, 680, 1740, 683, 1940), { w: 5 });
    L(pt(660, 1470, 678, 1530, 684, 1580), { w: 3.6, over: 0 }); L(pt(712, 1480, 694, 1540, 686, 1572), { w: 3.2, over: 0 });
    // far arm (viewer right): hangs long and limp, big hand
    arm(pt(806, 902, 830, 1100, 836, 1330, 830, 1520), pt(782, 985, 790, 1200, 794, 1520), C.hood, { cuff: [0, -22] });
    const hand = pt(796, 1524, 788, 1580, 798, 1640, 822, 1648, 840, 1596, 832, 1524);
    F(hand, C.skin, { dx: 2, dy: 2 }); L(hand, { w: 5.5 });
    L(pt(808, 1590, 810, 1642), { w: 3, over: 0 }); L(pt(822, 1594, 821, 1640), { w: 2.6, over: 0 }); L(pt(795, 1544, 780, 1574, 790, 1602), { w: 4.5, over: 0 });
    // hoodie torso: narrow, steeply sloping shoulders, long tube
    F(pt(628, 812, 592, 846, 560, 902, 563, 1000, 566, 1200, 566, 1420, 796, 1420, 798, 1200, 802, 1000, 808, 902, 774, 846, 714, 812, 670, 850), C.hood, { curve: false });
    F(pt(766, 920, 798, 912, 794, 1416, 756, 1416, 764, 1150), C.hoodS, { curve: false, dx: 2, dy: 2 });
    L(pt(628, 810, 592, 846, 560, 902, 563, 1000, 566, 1200, 566, 1424), { w: 7, dbl: .7 }); L(pt(714, 810, 774, 846, 808, 902, 802, 1000, 798, 1200, 796, 1424), { w: 7 });
    K(pt(558, 1422, 804, 1418), { w: 6.5 }); L(pt(562, 1396, 680, 1400, 800, 1394), { w: 3, over: 0 });
    K(pt(616, 1238, 748, 1240, 772, 1384), { w: 4.5, wob: 2 }); K(pt(616, 1238, 594, 1386), { w: 4.5, wob: 2 });
    // near arm (viewer left): hangs straight, hand flipped palm-up — already receiving
    arm(pt(560, 902, 540, 1100, 535, 1300, 538, 1436), pt(588, 940, 579, 1200, 576, 1436), C.hood, { cuff: [0, -16] });
    const palm = pt(578, 1440, 580, 1474, 512, 1492, 458, 1488, 440, 1472, 458, 1456, 512, 1452, 538, 1440);
    F(palm, C.skin, { dx: 2, dy: 2 }); L(palm, { w: 5.5, closed: true }); L(pt(446, 1473, 500, 1471), { w: 2.8, over: 0 }); L(pt(486, 1454, 478, 1438, 496, 1436, 506, 1452), { w: 4.5, over: 0 });
    // neck (too long) + chin shadow
    F(pt(642, 690, 637, 818, 668, 852, 704, 816, 698, 690), C.skin, { curve: false, dx: 2, dy: 1 });
    F(pt(641, 700, 699, 700, 702, 760, 668, 744, 640, 768), C.skinS, { curve: false, dx: 1, dy: 2 });
    L(pt(641, 700, 638, 770, 632, 816), { w: 6 }); L(pt(699, 700, 702, 770, 708, 814), { w: 6 }); L(pt(662, 770, 668, 782, 663, 794), { w: 2.8, over: 0 });
    L(pt(626, 806, 646, 842, 670, 852, 694, 842, 716, 806), { w: 6.5, dbl: 1 });
    L(pt(650, 850, 646, 930, 649, 996), { w: 3.6 }); L(pt(690, 848, 696, 940, 693, 1040), { w: 3.6 }); dot(649, 1002, 5); dot(693, 1046, 5);
  }
  function heroHead() {
    ear(574, 626, -1); ear(759, 622, 1);
    // long plain face, heavy jaw
    head(pt(668, 478, 720, 492, 752, 548, 758, 612, 750, 678, 722, 728, 664, 756, 608, 728, 582, 674, 577, 606, 584, 546, 612, 495));
    // bed-head: lumpy black mass, squashed on one side, clumpy fringe with a forehead gap
    const outer = spl(pt(568, 652, 558, 592, 556, 520, 580, 462, 626, 430, 668, 440, 708, 416, 754, 440, 782, 500, 778, 572, 768, 644));
    const fringe = dens(pt(768, 644, 757, 602, 752, 556, 742, 586, 730, 540, 716, 572, 700, 518, 684, 512, 668, 562, 652, 588, 640, 548, 626, 594, 610, 552, 598, 598, 588, 566, 581, 614, 568, 652));
    roughFill(outer.concat(fringe), C.black, { dx: 1, dy: 0, wob: 2 });
    strands([[706, 424, 724, 396, 752, 380], [688, 432, 700, 404, 722, 392], [560, 560, 532, 548, 512, 556], [558, 584, 534, 580, 520, 592], [562, 530, 540, 512, 524, 512], [780, 520, 800, 512, 812, 494],
      [770, 600, 780, 632, 774, 664], [568, 610, 558, 640, 564, 672], [742, 570, 746, 594, 740, 608], [652, 566, 654, 592, 648, 606], [626, 578, 624, 600, 630, 614], [598, 582, 594, 604, 600, 620], [716, 556, 720, 576, 714, 592]], { w: 6 });
    strands([[604, 506, 634, 474, 684, 466], [592, 540, 612, 506, 646, 494], [724, 476, 752, 506, 760, 540]], { w: 3, color: '#5c5c62' });
    // face: tiny half-lidded eyes looking down at her, short flat brows, nose hinted by a shadow, small flat mouth
    eye(630, 624, { look: [-6, 3], bag: true, w: 15 }); eye(706, 622, { look: [-6, 3], bag: true, w: 14 });
    brow(628, 599, 30, -1, { w: 9 }); brow(708, 597, 28, 1, { w: 9 });
    F(pt(660, 634, 670, 672, 666, 692, 648, 690), C.skinS, { curve: false, dx: 1, dy: 1, wob: 1 });
    L(pt(662, 638, 656, 668, 646, 688, 661, 695), { w: 4.4, wob: 1, over: 1 }); L(pt(669, 692, 676, 687), { w: 3, wob: .5, over: 0 });
    L(pt(642, 724, 658, 726, 678, 722), { w: 6, wob: 1, over: 2, t1: .6 }); L(pt(650, 737, 668, 737), { w: 2.6, wob: .6, over: 0 });
    [[634, 712], [646, 708], [672, 707], [684, 712], [640, 738], [654, 746], [672, 745], [684, 737], [628, 728], [692, 727]].forEach(([x, y]) => dot(x, y, 1.7, '#8d807b'));
  }

  // ---------- HEROINE: 28, baker, wavy brown bob with thin bangs, cream cardigan, flour on cheek ----------
  function heroine() {
    // skirt
    F(pt(100, 1560, 342, 1560, 366, 1940, 76, 1940), C.skirt, { curve: false, dx: 4, dy: 0 });
    L(pt(98, 1574, 84, 1750, 76, 1940), { w: 6.5 }); L(pt(342, 1574, 356, 1750, 366, 1940), { w: 6.5 });
    L(pt(180, 1600, 172, 1760, 168, 1940), { w: 3.4, over: 0 }); L(pt(262, 1604, 274, 1770, 280, 1940), { w: 3.2, over: 0 });
    // hanging arm (viewer left): long and limp
    arm(pt(112, 1102, 90, 1300, 85, 1500, 88, 1584), pt(140, 1185, 131, 1400, 127, 1584), C.cream, { cuff: [0, -20] });
    F(pt(92, 1588, 86, 1640, 96, 1684, 114, 1688, 128, 1644, 124, 1588), C.skin, { dx: 2, dy: 2 }); L(pt(92, 1588, 86, 1640, 96, 1684, 114, 1688, 128, 1644, 124, 1588), { w: 5.5 }); L(pt(106, 1644, 107, 1684), { w: 2.8, over: 0 });
    // cardigan torso
    F(pt(196, 1046, 150, 1066, 110, 1104, 106, 1300, 100, 1566, 342, 1566, 336, 1300, 330, 1104, 296, 1066, 256, 1046), C.cream, { curve: false });
    F(pt(204, 1050, 250, 1050, 228, 1196), C.tee, { curve: false, dx: 1, dy: 2 });
    F(pt(300, 1150, 332, 1140, 338, 1560, 308, 1560, 312, 1350), C.creamS, { curve: false, dx: 2, dy: 2 });
    L(pt(196, 1046, 150, 1066, 110, 1104, 106, 1300, 100, 1570), { w: 7, dbl: .6 }); L(pt(256, 1046, 296, 1066, 330, 1104, 336, 1300, 342, 1570), { w: 7 });
    K(pt(94, 1568, 348, 1566), { w: 6.5 }); L(pt(98, 1540, 220, 1546, 344, 1538), { w: 3, over: 0 });
    K(pt(202, 1048, 228, 1198), { w: 5.5 }); K(pt(252, 1048, 228, 1198), { w: 5.5 }); L(pt(228, 1198, 224, 1380, 228, 1566), { w: 4.5 });
    [1250, 1350, 1450].forEach((y, i) => { roughFill(ell(214, y, 9, 9), C.tee, { dx: 1, dy: 1, wob: .5 }); roughStroke(ell(214, y, 9, 9, .4, 6.9), { w: 3, wob: .8, over: 2 }); });
    // hair mass (wavy, to the shoulders) behind the face
    const hairP = pt(222, 740, 292, 754, 340, 800, 354, 870, 366, 930, 348, 985, 370, 1040, 352, 1094, 318, 1084, 300, 1058, 222, 1040, 150, 1060, 128, 1086, 96, 1096, 78, 1040, 98, 985, 78, 930, 90, 868, 106, 800, 154, 754);
    const hp = spl(hairP, true); roughFill(hp, C.brown, { dx: 2, dy: 1, wob: 2.5 }); LP(hp, 4, { w: 6, wob: 3, color: C.brownD });
    strands([[352, 880, 374, 900, 380, 930], [356, 990, 380, 1012, 384, 1044], [90, 880, 68, 902, 64, 934], [86, 990, 62, 1016, 60, 1050], [260, 746, 282, 728, 304, 726], [190, 746, 176, 728, 160, 730], [350, 1090, 366, 1104, 364, 1122], [98, 1094, 84, 1110, 88, 1128]], { w: 4.5, color: C.brownD });
    // neck
    F(pt(200, 980, 198, 1052, 228, 1070, 254, 1052, 252, 980), C.skin, { curve: false, dx: 1, dy: 1 }); F(pt(200, 990, 252, 988, 253, 1020, 228, 1010, 200, 1026), C.skinS, { curve: false, dx: 1, dy: 1 });
    L(pt(200, 984, 198, 1050), { w: 5.5 }); L(pt(252, 984, 255, 1050), { w: 5.5 });
    // face
    head(pt(222, 786, 276, 794, 314, 838, 326, 896, 316, 946, 288, 980, 244, 996, 196, 984, 152, 950, 126, 896, 132, 838, 168, 796), { parts: 3 });
    // hair cap + thin see-through bangs
    F(pt(126, 866, 136, 806, 180, 766, 224, 756, 280, 768, 318, 812, 326, 862, 304, 836, 264, 822, 222, 826, 180, 832, 146, 846), C.brown, { dx: 1, dy: 0, wob: 1.5 });
    strands([[150, 838, 146, 866, 152, 888], [176, 830, 172, 858, 178, 876], [200, 826, 200, 852, 194, 872], [226, 824, 230, 850, 226, 868], [252, 822, 258, 848, 254, 866], [278, 826, 286, 850, 284, 870], [302, 836, 310, 860, 308, 882]], { w: 4.6, color: C.brown });
    strands([[166, 790, 200, 772, 246, 770], [150, 820, 176, 800, 210, 792], [270, 782, 300, 800, 314, 830], [108, 900, 100, 950, 110, 1000], [342, 900, 350, 950, 340, 1000], [122, 1010, 112, 1050, 118, 1080], [330, 1010, 342, 1048, 334, 1078]], { w: 3.2, color: C.brownD });
    // side locks in front of the cheeks
    L(pt(128, 858, 120, 910, 130, 960), { w: 6, color: C.brownD, over: 0 }); L(pt(326, 858, 334, 910, 322, 958), { w: 6, color: C.brownD, over: 0 });
    // bright, slightly dopey face looking up at him
    roughFill(ell(168, 942, 22, 13), C.blush, { dx: 0, dy: 0, wob: 1.5 }); roughFill(ell(296, 936, 20, 13), C.blush, { dx: 0, dy: 0, wob: 1.5 });
    eye(188, 904, { kind: 'bright', w: 19, look: [6, -6], lash: -1 }); eye(272, 899, { kind: 'bright', w: 15, look: [5, -4], lash: 1 });
    brow(186, 868, 34, 3, { arch: 7, w: 6 }); brow(274, 862, 32, -2, { arch: 7, w: 6 });
    L(pt(238, 922, 244, 934, 234, 938), { w: 4, wob: .8, over: 0 });
    const mouth = pt(192, 948, 240, 956, 288, 944, 276, 972, 242, 984, 206, 974);
    F(mouth, '#8a3f37', { dx: 0, dy: 0, wob: 1 }); roughFill(dens(pt(200, 951, 240, 958, 280, 948, 277, 960, 240, 968, 203, 962), true), '#fff', { dx: 0, dy: 0, wob: .6 });
    roughFill(ell(244, 978, 20, 7), '#e58f86', { dx: 0, dy: -2, wob: .5 }); L(mouth, { w: 5, wob: 1.2, closed: true, over: 0 });
    L(pt(184, 940, 190, 950), { w: 3.4, wob: .5, over: 0 }); L(pt(296, 936, 289, 946), { w: 3.4, wob: .5, over: 0 });
    // flour on the cheek: two finger-swipe smears with a dusty, broken edge and a spray of specks
    [[pt(280, 944, 296, 926, 318, 918, 324, 928, 304, 940, 288, 956), 5], [pt(292, 962, 308, 948, 326, 942, 330, 950, 314, 960, 300, 972), 4]].forEach(([P, n]) => { const sm = spl(P, true); roughFill(sm, '#fff', { dx: 0, dy: 0, wob: 1.5 }); LP(sm, n, { w: 2, wob: 1.2, color: '#a09a93', over: 0, dbl: 0, t0: .3, t1: .1 }); });
    [[336, 926], [338, 962], [274, 966], [322, 976], [306, 908], [344, 944]].forEach(([x, y], i) => { dot(x, y, 2.4 + (i % 2), '#fff'); roughStroke(ell(x, y, 2.8 + (i % 2), 2.6 + (i % 2), 0, 4.4), { w: 1.5, wob: .3, color: '#a09a93', over: 0, t1: 1 }); });
    [[150, 1176], [162, 1190], [176, 1172], [170, 1206], [144, 1200]].forEach(([x, y], i) => dot(x, y, 2.6 + (i % 2) * 1.4, '#fff'));
  }

  // ---------- bread bag + her holding arm ----------
  function bread(cx, cy, rot) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    const P = pt(-56, 6, -40, -22, 0, -32, 40, -22, 56, 6, 34, 26, 0, 30, -34, 26); F(P, C.bread, { dx: 2, dy: 1 }); L(P, { w: 5.5, closed: true });
    L(pt(-24, -24, -18, 0, -24, 24), { w: 3.6, color: C.breadS, over: 0 }); L(pt(0, -30, 6, 0, 0, 28), { w: 3.6, color: C.breadS, over: 0 }); L(pt(24, -24, 30, 0, 24, 24), { w: 3.6, color: C.breadS, over: 0 });
    [[-10, -14], [14, -10], [-34, -4], [38, -2]].forEach(([x, y]) => dot(x, y, 2.6, '#fff'));
    ctx.restore();
  }
  function breadBag() {
    bread(528, 1092, -0.5); bread(578, 1078, 0.35);
    const top = []; for (let i = 0; i <= 12; i++) top.push([472 + (606 - 472) * i / 12, 1120 - 10 * i / 12 + (i % 2 ? -7 : 5)]);
    roughFill(dens(top.concat(pt(617, 1400, 480, 1408)), true), C.kraft, { dx: 2, dy: 2, wob: 1.5 });
    F(pt(586, 1116, 607, 1110, 617, 1400, 594, 1402), C.kraftS, { curve: false, dx: 1, dy: 1, wob: 1 });
    K(top, { w: 4.2, wob: .8, over: 2, dbl: 0 }); K(pt(472, 1122, 476, 1260, 480, 1410), { w: 6.5 }); K(pt(476, 1406, 620, 1398), { w: 6.5 }); K(pt(606, 1108, 612, 1250, 617, 1402), { w: 6.5 }); L(pt(586, 1118, 590, 1260, 594, 1400), { w: 3.4, over: 0 });
    L(pt(500, 1150, 506, 1180, 498, 1210), { w: 2.6, over: 0, color: C.kraftS }); L(pt(560, 1340, 572, 1362, 566, 1388), { w: 2.6, over: 0, color: C.kraftS });
    roughStroke(ell(532, 1300, 44, 42, .3, 6.75), { w: 4, wob: 1.6, over: 6, color: '#5a3a22' });
    ctx.save(); ctx.translate(532, 1303); ctx.rotate(-0.06); ctx.font = '700 62px "Gaegu"'; ctx.fillStyle = '#5a3a22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('빵', 0, 0); ctx.restore();
  }
  function holdingArm() {
    arm(pt(322, 1090, 400, 1136, 468, 1180), pt(330, 1152, 394, 1188, 456, 1230), C.cream, { cuff: [-16, -10] });
    const fist = pt(460, 1176, 492, 1170, 510, 1190, 508, 1226, 488, 1242, 458, 1234);
    F(fist, C.skin, { dx: 1, dy: 1 }); L(fist, { w: 5.5, closed: true }); L(pt(484, 1190, 506, 1192), { w: 2.8, over: 0 }); L(pt(482, 1206, 507, 1208), { w: 2.8, over: 0 }); L(pt(482, 1222, 504, 1224), { w: 2.8, over: 0 });
  }

  // ---------- the cut ----------
  const REPORT = [];
  const POS = { hero: [14, 58, 1], heroHead: [8, 20, 1], heroine: [0, 0, 1], bag: [0, 6, 1] };
  function draw(canvas) {
    ctx = canvas.getContext('2d'); SEED = 11; REPORT.length = 0;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // hallway, reduced to scribbles: her closed door, his open door, a sensor lamp
    door(26, 300, 284, { handle: [44, 1330], plate: [58, 506, '301'] });
    door(510, 262, 1014, { fill: C.room, leaf: 944 });
    L(pt(366, 86, 372, 112, 400, 124, 428, 112, 434, 84), { w: 5 }); K(pt(360, 84, 442, 82), { w: 5 }); K(pt(380, 138, 372, 158), { w: 3 }); K(pt(402, 144, 402, 168), { w: 3 }); K(pt(424, 138, 434, 158), { w: 3 });
    at(...POS.hero, heroBody); at(...POS.heroHead, heroHead);
    at(...POS.heroine, heroine);
    at(...POS.bag, () => { breadBag(); holdingArm(); });
    bubble(262, 342, ['할머니, 오늘은', '소금빵이에요!'], { tail: [226, 520], seed: 501, tw: .085 });
    bubble(826, 300, ['…할머니', '아닌데요.'], { tail: [782, 448], seed: 601, px: 62, py: 44, tw: .1 });
    aside(402, 600, ['(2주째', '받아먹는 중)'], { rot: -0.03 });
    return REPORT;
  }
  window.SCENE = { draw, W, H, faces: [{ x: 238, y: 890, w: 360, h: 360 }, { x: 684, y: 620, w: 360, h: 400 }] };
})();
