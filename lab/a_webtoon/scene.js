/* lab/a_webtoon/scene.js
 * STYLE A "정석 로맨스 웹툰" art-style draft: ONE cut, 1080x1920.
 * Every pixel is drawn by this file with Canvas 2D paths / curves / gradients.
 * Deterministic: no Math.random, no Date.
 * Structure (small reusable parts, meant to grow into a character rig later):
 *   helpers : shape, ink (tapered line), lockPath (hair lock), finger, lg/rg gradients, layer, rimOf
 *   face    : eye, brow, faceF / faceM (3/4 head in "head units": crown y=-100, chin y=+100, facing +x)
 *   hair    : hairBackF, hairFarF, hairFrontF, hairBackM, hairFrontM
 *   body    : torsoF (+ parcel box, sleeves, hands), torsoM (hoodie, raised arm)
 *   stage   : hallway, bubble, sfx, grade
 */
(function (root) {
'use strict';
const W = 1080, H = 1920, TAU = Math.PI * 2;
const INK = '#4a2b22';

/* ───────────── helpers ───────────── */
const P = d => new Path2D(d);
function shape(ctx, d, fill, lw, stroke) {
  const p = typeof d === 'string' ? P(d) : d;
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p); }
  return p;
}
function lg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function rg(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// sample an absolute "M L C Q Z" path string into points
function samplePath(d, n) {
  n = n || 14;
  const tk = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), pts = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '';
  const num = () => parseFloat(tk[i++]);
  while (i < tk.length) {
    if (/[MLCQZ]/i.test(tk[i])) cmd = tk[i++].toUpperCase();
    if (cmd === 'M') { cx = num(); cy = num(); sx = cx; sy = cy; pts.push([cx, cy]); cmd = 'L'; }
    else if (cmd === 'L') { const x = num(), y = num(); for (let k = 1; k <= 4; k++) pts.push([cx + (x - cx) * k / 4, cy + (y - cy) * k / 4]); cx = x; cy = y; }
    else if (cmd === 'C') { const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; pts.push([u*u*u*cx + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x, u*u*u*cy + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y]); } cx = x; cy = y; }
    else if (cmd === 'Q') { const x1 = num(), y1 = num(), x = num(), y = num();
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; pts.push([u*u*cx + 2*u*t*x1 + t*t*x, u*u*cy + 2*u*t*y1 + t*t*y]); } cx = x; cy = y; }
    else if (cmd === 'Z') { pts.push([sx, sy]); cx = sx; cy = sy; }
    else i++;
  }
  return pts;
}
// tapered brush line: w = max width, s0/s1 = fraction of length used to taper in / out
function ink(ctx, d, w, color, s0, s1, alpha) {
  const pts = samplePath(d, 16); if (pts.length < 2) return;
  if (s0 == null) s0 = .35; if (s1 == null) s1 = .35;
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
  const tot = L[L.length-1] || 1, a = [], b = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i-1)], p1 = pts[Math.min(pts.length-1, i+1)];
    let tx = p1[0]-p0[0], ty = p1[1]-p0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const t = L[i] / tot; let pr = Math.min(1, s0 > 0 ? t / s0 : 1, s1 > 0 ? (1 - t) / s1 : 1);
    pr = .1 + .9 * Math.sin(pr * Math.PI / 2);
    const hw = w * pr / 2;
    a.push([pts[i][0] - ty*hw, pts[i][1] + tx*hw]); b.push([pts[i][0] + ty*hw, pts[i][1] - tx*hw]);
  }
  ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha;
  ctx.fillStyle = color || INK; ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]);
  for (let i = 1; i < a.length; i++) ctx.lineTo(a[i][0], a[i][1]);
  for (let i = b.length-1; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// leaf-shaped hair lock from root (x0,y0) to pointed tip (x1,y1); bend>0 bulges to the left of the travel direction
function lockPath(x0, y0, x1, y1, bend, w, rw) {
  const dx = x1-x0, dy = y1-y0, L = Math.hypot(dx, dy) || 1, nx = -dy/L, ny = dx/L, mx = (x0+x1)/2, my = (y0+y1)/2;
  if (rw == null) rw = w * .7;
  const f = v => v.toFixed(2);
  return `M ${f(x0+nx*rw/2)},${f(y0+ny*rw/2)} Q ${f(mx+nx*(bend+w*.62))},${f(my+ny*(bend+w*.62))} ${f(x1)},${f(y1)} Q ${f(mx+nx*(bend-w*.62))},${f(my+ny*(bend-w*.62))} ${f(x0-nx*rw/2)},${f(y0-ny*rw/2)} Z`;
}
// "angel ring": short highlight dashes laid along an arc, each following the hair flow away from the crown
function hiRing(ctx, cx, cy, rx, ry, a0, a1, n, crown, color, alpha, len, wid) {
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), an = (a0 + (a1 - a0) * t) * Math.PI / 180, x = cx + Math.cos(an) * rx, y = cy + Math.sin(an) * ry;
    let dx = x - crown[0], dy = y - crown[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const L = len * (.55 + .75 * hash(i * 3.7 + n)), w = wid * (.7 + .6 * hash(i * 1.3 + 5));
    shape(ctx, lockPath(x - dx * L * .5, y - dy * L * .5, x + dx * L * .6, y + dy * L * .6, 0, w, w * .5), color);
  }
  ctx.restore();
}
function mkCanvas() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
function layer(fn) { const c = mkCanvas(); fn(c.getContext('2d')); return c; }
// edge light: keeps a crescent of `color` on the side of the silhouette opposite to (dx,dy)
function rimOf(src, dx, dy, color) {
  const c = mkCanvas(), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(src, dx, dy);
  return c;
}
function inHead(ctx, hp, fn) { ctx.save(); ctx.translate(hp.x, hp.y); ctx.rotate(hp.rot * Math.PI / 180); ctx.scale(hp.s * (hp.flip ? -1 : 1), hp.s * (hp.sy || 1)); fn(); ctx.restore(); }
// one finger: rounded capsule from base (x,y) along angle
function finger(ctx, x, y, ang, len, wid, skin, sh, mir) {
  ctx.save(); ctx.translate(x, y); if (mir) ctx.scale(-1, 1); ctx.rotate(ang);
  const r = wid / 2, p = new Path2D(); p.moveTo(-4, -r); p.lineTo(len - r, -r); p.arc(len - r, 0, r, -Math.PI/2, Math.PI/2); p.lineTo(-4, r); p.closePath();
  ctx.fillStyle = skin; ctx.fill(p);
  ctx.save(); ctx.clip(p); ctx.fillStyle = sh; ctx.fillRect(-4, r*.35, len + 4, r); // underside tone
  ctx.fillStyle = 'rgba(255,170,160,.55)'; ctx.beginPath(); ctx.ellipse(len - r*1.05, -r*.1, r*.62, r*.55, 0, 0, TAU); ctx.fill(); // nail blush
  ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p);
  ctx.restore();
}

/* ───────────── eyes & brows ───────────── */
// o: cx,cy,w,h  inner:+1/-1 (which way the nose is)  style:'f'|'m'  col:{top,mid,bot,ring,pupil,glow,crease}
//    look:[x,y] in head space  hl:+1/-1 side of the main highlight (head space x)
function eye(ctx, o) {
  const a = o.w / 2, b = o.h / 2, k = o.inner, F = o.style === 'f', c = o.col;
  const X = u => o.cx + k * u * a, Y = v => o.cy + v * b;
  const p = (u, v) => X(u).toFixed(2) + ',' + Y(v).toFixed(2);
  const g = F
    ? { oc: [-1, .30], u1: [-.74, -.95], u2: [-.14, -1.20], um: [.30, -1.0], u3: [.66, -.80], u4: [.92, -.2], ic: [1, .42], l1: [.6, 1.04], l2: [-.45, 1.16] }
    : { oc: [-1, -.06], u1: [-.66, -.98], u2: [-.1, -1.12], um: [.32, -.94], u3: [.66, -.76], u4: [.9, -.15], ic: [1, .48], l1: [.55, .92], l2: [-.5, 1.0] };
  const wp = P(`M ${p(...g.oc)} C ${p(...g.u1)} ${p(...g.u2)} ${p(...g.um)} C ${p(...g.u3)} ${p(...g.u4)} ${p(...g.ic)} C ${p(...g.l1)} ${p(...g.l2)} ${p(...g.oc)} Z`);
  ctx.save(); ctx.clip(wp);
  ctx.fillStyle = '#fffaf6'; ctx.fillRect(o.cx - a - 6, o.cy - b * 1.8, o.w + 12, o.h * 1.9);
  ctx.fillStyle = lg(ctx, 0, o.cy - b * 1.2, 0, o.cy + b * .1, [[0, 'rgba(150,104,112,.60)'], [1, 'rgba(150,104,112,0)']]);
  ctx.fillRect(o.cx - a - 6, o.cy - b * 1.8, o.w + 12, o.h * 1.9);
  // iris
  const ry = b * (F ? 1.16 : 1.04), rx = ry * (o.irisW || .86);
  const ix = o.cx + o.look[0] * .27 * a, iy = o.cy + (.03 + o.look[1] * .3) * b;
  ctx.beginPath(); ctx.ellipse(ix, iy, rx, ry, 0, 0, TAU);
  ctx.fillStyle = lg(ctx, 0, iy - ry, 0, iy + ry, [[0, c.top], [.5, c.mid], [1, c.bot]]); ctx.fill();
  ctx.lineWidth = ry * .13; ctx.strokeStyle = c.ring; ctx.stroke();
  ctx.save(); ctx.globalAlpha = .28; ctx.strokeStyle = c.bot; ctx.lineWidth = ry * .05;      // iris fibres
  for (let i = 0; i < 16; i++) { const an = i / 16 * TAU + .2; ctx.beginPath(); ctx.moveTo(ix + Math.cos(an) * rx * .45, iy + Math.sin(an) * ry * .48); ctx.lineTo(ix + Math.cos(an) * rx * .86, iy + Math.sin(an) * ry * .88); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = c.pupil; ctx.beginPath(); ctx.ellipse(ix, iy + ry * .02, rx * .40, ry * .44, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.globalAlpha = .7; ctx.fillStyle = c.glow; ctx.beginPath(); ctx.ellipse(ix, iy + ry * .62, rx * .60, ry * .26, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = lg(ctx, 0, iy - ry, 0, iy - ry * .05, [[0, 'rgba(18,6,8,.72)'], [1, 'rgba(18,6,8,0)']]);
  ctx.beginPath(); ctx.ellipse(ix, iy, rx, ry, 0, 0, TAU); ctx.fill();
  // highlights (same screen side in both eyes)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(ix + o.hl * rx * .40, iy - ry * .40, rx * .30, ry * .24, o.hl * -.4, 0, TAU); ctx.fill();
  ctx.globalAlpha = .92; ctx.beginPath(); ctx.arc(ix - o.hl * rx * .40, iy + ry * .42, rx * .14, 0, TAU); ctx.fill();
  ctx.restore();
  // upper lash line (filled, tapering toward the nose)
  const th = (F ? .44 : .34) * (o.lashK || 1), wg = o.wing == null ? 1 : o.wing;
  const lash = `M ${p(...g.ic)} C ${p(...g.u4)} ${p(...g.u3)} ${p(...g.um)} C ${p(...g.u2)} ${p(...g.u1)} ${p(...g.oc)}`
    + (F ? ` L ${p(-1 - .22 * wg, .30 - .5 * wg)} C ${p(-1.06, -.6)} ${p(-.76, -1.26 - th * .7)} ${p(-.14, -1.20 - th)}`
         : ` L ${p(-1 - .12 * wg, -.06 - .14 * wg)} C ${p(-.98, -.7)} ${p(-.7, -1.1 - th * .8)} ${p(-.1, -1.12 - th)}`)
    + ` C ${p(.3, g.um[1] - th - .14)} ${p(.74, -.86 - th * .45)} ${p(g.ic[0] + .05, g.ic[1] - .12)} Z`;
  ctx.save(); ctx.globalAlpha = F ? .55 : .5; shape(ctx, `M ${p(.74, -1.22 - th)} C ${p(.3, -1.74 - th)} ${p(-.5, -1.80 - th)} ${p(-1.06, -.96 - th * .5)} L ${p(-.9, -.5)} L ${p(.7, -.7)} Z`, c.lid); ctx.restore();
  shape(ctx, lash, c.lash || '#2a1512');
  if (F && wg > .5) { // a few outer lashes
    ink(ctx, `M ${p(-.98, -.35)} Q ${p(-1.14, -.56)} ${p(-1.30, -.52)}`, 1.4, c.lash, 0, .8);
    ink(ctx, `M ${p(-.86, -.9)} Q ${p(-1.02, -1.16)} ${p(-1.18, -1.2)}`, 1.3, c.lash, 0, .8);
    ink(ctx, `M ${p(-.9, .5)} Q ${p(-1.02, .7)} ${p(-1.16, .72)}`, 1.0, c.lash, 0, .8, .8);
  }
  // double-eyelid crease
  ink(ctx, `M ${p(.74, -1.22 - th)} C ${p(.3, -1.74 - th)} ${p(-.5, -1.80 - th)} ${p(-1.06, -.96 - th * .5)}`, F ? 1.25 : 1.4, c.crease, .3, .3, .9);
  // lower lid
  if (F) ink(ctx, `M ${p(-1.0, .32)} C ${p(-.7, .98)} ${p(-.2, 1.16)} ${p(.34, 1.05)}`, 1.3, INK, .15, .6, .8);
  else ink(ctx, `M ${p(-.96, .0)} C ${p(-.62, .86)} ${p(-.1, .98)} ${p(.42, .9)}`, 1.3, INK, .15, .6, .65);
}
function brow(ctx, x0, y0, x1, y1, arch, thick, color) { // inner (x0,y0) → outer (x1,y1)
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - arch;
  ink(ctx, `M ${x0},${y0} Q ${mx},${my} ${x1},${y1}`, thick, color, .12, .75);
}

/* ───────────── palettes ───────────── */
const PAL = {
  her: { skin: '#ffe9dc', skinSh: '#f7c8b5', blush: '255,120,118',
         hair: '#96593a', hairSh: '#6c3a26', hairHi: '#d9a06c', hairLn: '#45221a',
         eye: { top: '#3a1c12', mid: '#8a4f2a', bot: '#d9965a', ring: '#3a1c12', pupil: '#1e0e09', glow: '#ffc98a', crease: '#b77a66', lash: '#2a1512', lid: '#f6c0b0' } },
  him: { skin: '#fbe1cf', skinSh: '#e8bca5', blush: '240,130,120',
         hair: '#26262f', hairSh: '#131319', hairHi: '#5a627c', hairLn: '#0b0b10',
         eye: { top: '#100c0d', mid: '#33272a', bot: '#74605a', ring: '#141012', pupil: '#070506', glow: '#a48a7c', crease: '#8a5f50', lash: '#17110f', lid: '#e6b7a2' } }
};

/* ───────────── HEROINE head (head units, facing +x, 3/4) ───────────── */
const F_FACE = 'M -78,-20 C -80,12 -74,42 -60,63 C -44,84 -8,101 18,101 C 30,101 40,94 46,84 C 56,68 67,52 69,30 C 70,18 65,10 65,0 C 65,-14 71,-30 69,-50 C 65,-90 20,-100 -10,-100 C -50,-100 -78,-60 -78,-20 Z';
function faceF(ctx, c, ex) {
  const fp = shape(ctx, F_FACE, c.skin, 2.3);
  ctx.save(); ctx.clip(fp);
  ctx.fillStyle = rg(ctx, -10, 20, 10, 120, [[0, 'rgba(255,255,255,.22)'], [.6, 'rgba(255,220,200,0)'], [1, 'rgba(235,150,130,.22)']]); ctx.fillRect(-100, -110, 200, 230);
  // cel shadow: thin cast under the fringe + under the side lock + far jaw
  shape(ctx, 'M -90,-110 L 90,-110 L 90,-46 C 60,-54 30,-58 14,-58 C -10,-56 -36,-50 -54,-30 C -60,-4 -58,40 -52,70 L -90,90 Z', c.skinSh);
  ctx.globalAlpha = .9; shape(ctx, 'M 20,104 C 36,100 52,82 62,58 C 58,80 44,98 30,106 Z', c.skinSh); ctx.globalAlpha = 1;
  const bl = ex.blush;
  ctx.fillStyle = rg(ctx, -30, 45, 2, 28, [[0, `rgba(${c.blush},${.5 * bl})`], [1, `rgba(${c.blush},0)`]]); ctx.fillRect(-70, 10, 80, 80);
  ctx.fillStyle = rg(ctx, 52, 41, 2, 20, [[0, `rgba(${c.blush},${.46 * bl})`], [1, `rgba(${c.blush},0)`]]); ctx.fillRect(25, 15, 60, 60);
  ctx.restore();
  for (let i = 0; i < 3; i++) ink(ctx, `M ${-39 + i * 7.5},49 L ${-44 + i * 7.5},41`, 1.25, '#ea7f7c', .3, .3, .7 * bl);
  for (let i = 0; i < 2; i++) ink(ctx, `M ${50 + i * 6.5},45 L ${46 + i * 6.5},38`, 1.15, '#ea7f7c', .3, .3, .65 * bl);
  const look = ex.look;
  eye(ctx, { cx: -24, cy: 13, w: 48, h: 28, inner: 1, style: 'f', col: c.eye, look, hl: ex.hl, wing: .55 });
  eye(ctx, { cx: 44, cy: 12, w: 34, h: 26.5, inner: -1, style: 'f', col: c.eye, look, hl: ex.hl, irisW: .76, wing: .35 });
  brow(ctx, -3, -19, -52, -12, 5, 3.4, c.hairSh);
  brow(ctx, 30, -20, 62, -14, 4, 3.0, c.hairSh);
  ctx.save(); ctx.globalAlpha = .7; shape(ctx, 'M 33,39 C 39,43 40,48 35,51 C 33,47 33,43 33,39 Z', c.skinSh); ctx.restore();
  ink(ctx, 'M 36,44 Q 40,49 34,52', 1.5, INK, .3, .5, .9);
  // mouth: small flustered open smile
  const mp = P('M 14,67.5 Q 20,65 24.5,66.6 Q 29,65 34.5,67 Q 32,75.5 24.5,76 Q 17,75.5 14,67.5 Z');
  shape(ctx, mp, '#b4504c');
  ctx.save(); ctx.clip(mp); ctx.fillStyle = '#f08f88'; ctx.beginPath(); ctx.ellipse(24.5, 77, 7, 3.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(15, 64.6, 20, 3); ctx.restore();
  ink(ctx, 'M 11.5,67.2 Q 20,64.4 24.5,66.4 Q 29,64.6 37,66.8', 1.8, INK, .25, .25);
  ink(ctx, 'M 15.5,71 Q 18,76.2 24.5,76.6 Q 31,76.2 33.5,71', 1.1, '#8a3a36', .3, .3, .9);
  ctx.save(); ctx.globalAlpha = .45; ctx.fillStyle = '#f7a59c'; ctx.beginPath(); ctx.ellipse(25, 81, 6.5, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
}
function hairBackF(ctx, c) {
  shape(ctx, 'M -86,-50 C -110,-10 -106,40 -100,76 C -96,104 -122,124 -112,150 C -104,170 -78,176 -62,164 C -44,178 -14,172 8,162 C 30,172 62,168 80,150 C 96,132 82,110 88,86 C 94,56 94,10 84,-40 Z', c.hairSh, 2.2, c.hairLn);
  ink(ctx, 'M -84,60 C -86,100 -104,120 -98,152', 1.4, c.hairLn, .3, .4, .8);
  ink(ctx, 'M -70,90 C -70,120 -80,140 -72,162', 1.2, c.hairLn, .3, .4, .7);
}
function hairFarF(ctx, c) { // wavy lock beside the far cheek, behind the face
  const lp = shape(ctx, 'M 68,-40 C 90,-8 88,36 82,66 C 78,92 92,112 90,136 C 88,150 96,158 106,164 C 90,174 70,168 62,150 C 54,132 60,108 56,84 C 52,60 60,20 58,-24 Z', c.hair, 2.0, c.hairLn);
  ctx.save(); ctx.clip(lp); shape(ctx, 'M 50,-30 L 74,-30 C 78,20 70,70 70,100 C 70,130 76,150 84,172 L 50,172 Z', c.hairSh); ctx.restore();
  ink(ctx, 'M 76,10 C 80,50 70,90 76,120 C 78,136 82,148 90,158', 1.2, c.hairLn, .3, .4, .7);
}
function hairFrontF(ctx, c) {
  const cap = 'M -82,10 C -98,-34 -96,-88 -54,-108 C -26,-124 34,-122 60,-101 C 86,-80 92,-42 82,0 C 80,-18 76,-34 68,-45 C 56,-60 36,-68 16,-68 C -8,-66 -40,-60 -58,-40 C -70,-26 -78,-10 -82,10 Z';
  // near side: outer wavy lock that flips out at the shoulder + inner lock that curls in to the collarbone
  const lockA = 'M -64,-48 C -96,-26 -109,16 -102,50 C -98,74 -80,88 -86,112 C -90,134 -112,146 -124,164 C -102,176 -80,166 -68,142 C -58,122 -62,104 -58,84 C -54,58 -64,28 -58,-4 C -55,-26 -56,-40 -64,-48 Z';
  const lockB = 'M -70,70 C -74,100 -68,126 -54,146 C -46,157 -34,163 -20,160 C -34,150 -43,136 -46,118 C -49,96 -52,80 -56,64 Z';
  const lb = shape(ctx, lockB, c.hair, 2.0, c.hairLn);
  ctx.save(); ctx.clip(lb); shape(ctx, 'M -58,60 C -54,96 -48,132 -22,164 L -10,150 L -46,56 Z', c.hairSh); ctx.restore();
  ink(ctx, 'M -64,78 C -66,104 -58,128 -40,152', 1.2, c.hairLn, .3, .4, .7);
  const la = shape(ctx, lockA, c.hair, 2.1, c.hairLn);
  ctx.save(); ctx.clip(la);
  shape(ctx, 'M -60,-20 C -68,20 -64,60 -66,86 C -70,112 -84,140 -104,176 L -50,176 L -50,-20 Z', c.hairSh);
  hiRing(ctx, -86, 22, 15, 6, 170, 10, 6, [-70, -110], c.hairHi, .75, 20, 5);
  hiRing(ctx, -92, 122, 13, 5, 170, 10, 5, [-76, 60], c.hairHi, .65, 16, 4.5);
  ctx.restore();
  ink(ctx, 'M -76,-30 C -94,10 -90,50 -84,70 C -76,96 -88,120 -110,156', 1.4, c.hairLn, .3, .4, .8);
  ink(ctx, 'M -70,-10 C -80,30 -74,66 -72,92 C -72,118 -82,136 -96,160', 1.2, c.hairLn, .3, .4, .7);
  // cap
  const cp = shape(ctx, cap, c.hair, 2.1, c.hairLn);
  ctx.save(); ctx.clip(cp);
  shape(ctx, 'M -100,12 C -100,-40 -86,-86 -50,-108 C -68,-74 -76,-40 -74,-6 L -82,14 Z', c.hairSh);
  shape(ctx, 'M 94,2 C 94,-40 82,-82 58,-104 C 72,-78 78,-44 76,-20 Z', c.hairSh);
  hiRing(ctx, -4, -42, 83, 48, 194, 346, 27, [6, -124], c.hairHi, .72, 17, 5);
  ctx.restore();
  ['M 6,-118 C -24,-110 -56,-88 -70,-46', 'M 8,-118 C -8,-104 -30,-88 -40,-62', 'M 12,-118 C 9,-100 8,-84 14,-70', 'M 16,-118 C 32,-104 48,-88 54,-68', 'M 18,-118 C 48,-110 74,-86 82,-42', 'M 2,-118 C -40,-114 -82,-88 -88,-32']
    .forEach((d, i) => ink(ctx, d, 1.3, c.hairLn, .25, .4, i === 2 ? .9 : .55));
  // see-through bangs: slim curved strands with the forehead visible between them
  const hl = x => -69 + Math.pow(Math.abs(x - 14) / 60, 2) * 12;               // hairline height at x
  const fr = [[-40,9,1],[-31,3,0],[-25,7,1],[-15,2.6,0],[-9,8,1],[0,3,0],[6,6,1],[20,5.5,1],[26,2.6,0],[33,7.5,1],[41,3,0],[47,6.5,1]]; // x, width, long?
  ctx.save(); ctx.globalAlpha = .96;
  fr.forEach((q, i) => { const x = q[0], side = x < 14 ? -1 : 1, d = Math.abs(x - 14);
    const tx = x + side * (4 + d * .34), ty = (q[2] ? -15 : -30) + hash(i * 2.3) * 7 + d * .12;
    shape(ctx, lockPath(x, hl(x) - 3, tx, ty, -side * (3 + d * .1), q[1], q[1] * 1.15), c.hair, q[1] > 4 ? .9 : .5, c.hairLn); });
  // face-framing side strands (longer, curling in at the cheek)
  shape(ctx, 'M -34,-62 C -53,-50 -65,-24 -65,6 C -65,24 -62,38 -56,50 C -64,34 -71,14 -69,-10 C -67,-34 -57,-52 -43,-60 Z', c.hair, .9, c.hairLn);
  shape(ctx, 'M 46,-64 C 58,-52 65,-30 65,-6 C 65,6 63,16 60,24 C 68,10 73,-12 69,-34 C 65,-50 58,-60 53,-63 Z', c.hair, .9, c.hairLn);
  ctx.restore();
  // stray hairs (a little clumsy charm)
  ink(ctx, 'M -10,-119 C -20,-131 -34,-131 -42,-123', 1.3, c.hair, .2, .7);
  ink(ctx, 'M 20,-119 C 30,-129 42,-127 48,-119', 1.2, c.hair, .2, .7);
}

/* ───────────── HERO head (head units, facing +x; drawn mirrored) ───────────── */
const M_FACE = 'M -68,-24 C -70,4 -68,30 -62,50 C -58,62 -50,70 -40,78 C -28,88 -14,96 0,101 C 10,105 22,106 30,103 C 39,100 45,93 48,84 C 57,66 66,48 68,28 C 69,16 64,8 64,-2 C 64,-16 70,-32 68,-52 C 64,-90 20,-100 -10,-100 C -46,-100 -68,-60 -68,-24 Z';
function faceM(ctx, c, ex) {
  shape(ctx, 'M -62,-6 C -78,-15 -87,6 -80,27 C -76,38 -67,40 -61,32 Z', c.skin, 2.2);   // ear
  ink(ctx, 'M -66,1 C -77,0 -80,15 -73,28', 1.3, INK, .3, .4, .7);
  const fp = shape(ctx, M_FACE, c.skin, 2.4);
  ctx.save(); ctx.clip(fp);
  ctx.fillStyle = rg(ctx, 20, 20, 10, 120, [[0, 'rgba(255,255,255,.18)'], [.6, 'rgba(255,220,200,0)'], [1, 'rgba(210,140,120,.20)']]); ctx.fillRect(-100, -110, 200, 230);
  // cel shadow: fringe cast + side plane (he faces the window; the near side turns away from it)
  shape(ctx, 'M -90,-110 L 90,-110 L 90,-34 C 70,-40 60,-26 46,-34 L 30,-60 C 20,-40 12,-22 2,-6 C -8,-18 -18,-10 -28,-4 C -38,-14 -48,-6 -54,4 C -56,24 -54,46 -46,62 C -34,78 -16,92 4,101 L -90,112 Z', c.skinSh);
  ctx.globalAlpha = .7; shape(ctx, 'M 14,106 C 34,104 50,88 60,62 C 56,84 46,100 32,108 Z', c.skinSh); ctx.globalAlpha = 1;
  ctx.fillStyle = rg(ctx, -26, 40, 2, 24, [[0, `rgba(${c.blush},${.2 * ex.blush})`], [1, `rgba(${c.blush},0)`]]); ctx.fillRect(-70, 10, 80, 70);
  ctx.restore();
  const look = ex.look;
  eye(ctx, { cx: -21, cy: 7, w: 46, h: 20, inner: 1, style: 'm', col: c.eye, look, hl: ex.hl, wing: .6 });
  eye(ctx, { cx: 44, cy: 6, w: 32, h: 19, inner: -1, style: 'm', col: c.eye, look, hl: ex.hl, irisW: .76, wing: .2 });
  brow(ctx, 3, -15, -52, -18, 3.5, 6.4, c.hair);
  brow(ctx, 27, -15, 64, -16, 3, 5.6, c.hair);
  // nose: short bridge, tip, small under-shadow
  shape(ctx, 'M 30,50 Q 36,57 42,49 Q 36,53 30,50 Z', c.skinSh);
  ink(ctx, 'M 35,28 C 38,36 41,42 42,47 Q 42,54 32,53.5', 1.7, INK, .6, .3, .9);
  // mouth: slightly parted, just lines
  shape(ctx, 'M 18,72.2 Q 24,71.4 31,72 Q 29,74.6 24,74.6 Q 20,74.6 18,72.2 Z', '#9a5350');
  ink(ctx, 'M 9,72.8 Q 20,70.4 24,71.6 Q 30,70.4 39,71.2', 1.8, INK, .3, .3);
  ink(ctx, 'M 19,83 Q 25,85 31,82.6', 1.2, '#c9907c', .3, .3, .85);
}
function hairBackM(ctx, c) {
  shape(ctx, 'M -76,-44 C -90,-12 -86,24 -74,46 C -68,56 -58,56 -52,48 L -50,6 Z', c.hairSh, 2.2, c.hairLn);
  // slept-on flicks lying along the flow (not horns)
  [[-30,-112,-58,-120,5,10],[-80,-40,-95,-24,-4,10],[40,-110,62,-112,-3,8]]
    .forEach(q => shape(ctx, lockPath(q[0], q[1], q[2], q[3], q[4], q[5], q[5] * 1.4), c.hair, 2.0, c.hairLn));
}
function hairFrontM(ctx, c) {
  const cap = 'M -74,10 C -88,-28 -90,-72 -66,-100 C -42,-122 24,-126 56,-106 C 80,-90 88,-54 82,-16 C 80,-6 76,0 72,4 C 72,-20 66,-40 56,-52 L 30,-74 L -40,-64 C -58,-46 -66,-22 -68,0 Z';
  const cp = shape(ctx, cap, c.hair, 2.2, c.hairLn);
  ctx.save(); ctx.clip(cp);
  shape(ctx, 'M -100,20 C -98,-40 -88,-84 -60,-108 C -74,-70 -76,-40 -70,0 Z', c.hairSh);
  hiRing(ctx, -2, -54, 80, 48, 200, 340, 17, [20, -128], c.hairHi, .7, 18, 5.5);
  ctx.restore();
  // far-side fringe (short), then the main comma fringe swept toward the near temple
  const far = 'M 32,-98 C 50,-94 66,-80 74,-58 C 78,-42 76,-22 70,-4 C 69,-16 67,-26 63,-34 C 63,-26 63,-20 65,-12 C 56,-22 46,-36 38,-50 C 35,-66 33,-84 32,-98 Z';
  const main = 'M 34,-98 C 8,-108 -44,-106 -66,-84 C -80,-64 -82,-30 -76,4 L -68,18 C -68,2 -66,-10 -62,-20 C -60,-12 -58,-6 -56,0 C -52,-12 -48,-22 -42,-30 C -40,-22 -37,-14 -33,-8 C -27,-18 -21,-28 -13,-36 C -11,-28 -8,-18 -4,-10 C 4,-22 14,-36 24,-48 C 30,-62 33,-82 34,-98 Z';
  shape(ctx, far, c.hair, 1.9, c.hairLn);
  const mp = shape(ctx, main, c.hair, 1.9, c.hairLn);
  ctx.save(); ctx.clip(mp);
  shape(ctx, 'M -90,20 C -84,-30 -78,-60 -64,-86 C -72,-50 -72,-20 -66,24 Z', c.hairSh);
  hiRing(ctx, -18, -50, 60, 26, 205, 325, 11, [34, -104], c.hairHi, .65, 16, 5);
  ctx.restore();
  ['M 30,-94 C 12,-82 -2,-62 -8,-30', 'M 26,-98 C -4,-96 -28,-74 -36,-28', 'M 20,-102 C -20,-104 -50,-80 -58,-22', 'M 36,-94 C 50,-84 60,-66 64,-36'].forEach(d => ink(ctx, d, 1.3, c.hairLn, .2, .5, .9));
  shape(ctx, lockPath(30, -90, 19, -20, 9, 5.5, 4), c.hair, 1.2, c.hairLn);          // one loose strand over the parting
  ink(ctx, 'M -30,-116 C -42,-128 -56,-130 -64,-122', 1.6, c.hair, .15, .7);
  ink(ctx, 'M 6,-122 C 14,-136 28,-138 36,-130', 1.5, c.hair, .15, .7);
}

/* ───────────── bodies (screen px) ───────────── */
function ribs(ctx, x0, y0, x1, y1, n, len, ang, col) { // short rib strokes across a knit band
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    ink(ctx, `M ${x},${y} L ${x + Math.cos(ang) * len},${y + Math.sin(ang) * len}`, 1.8, col, .2, .2, .7); }
}
function parcel(ctx) {
  const front = 'M 208,1236 L 512,1218 L 528,1650 L 222,1668 Z', top = 'M 208,1236 L 512,1218 L 494,1184 L 230,1200 Z';
  shape(ctx, top, '#e9c391', 3);
  const fp = shape(ctx, front, lg(ctx, 0, 1220, 0, 1660, [[0, '#dcab73'], [1, '#c08a54']]), 3.2);
  ctx.save(); ctx.clip(fp);
  ctx.fillStyle = 'rgba(150,90,50,.20)'; ctx.fillRect(200, 1215, 340, 34);                    // under-lip shade
  ctx.fillStyle = 'rgba(245,225,180,.9)'; ctx.beginPath(); ctx.moveTo(338, 1228); ctx.lineTo(384, 1225); ctx.lineTo(387, 1332); ctx.lineTo(341, 1335); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,110,60,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
  // plain shipping label (no brand): lines + bars
  ctx.translate(286, 1352); ctx.rotate(-.058);
  ctx.fillStyle = '#fffaf2'; ctx.strokeStyle = 'rgba(120,80,50,.6)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.roundRect(0, 0, 150, 92, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8aba0'; [[10,12,84,6],[10,26,112,6],[10,40,66,6]].forEach(r => ctx.fillRect(r[0], r[1], r[2], r[3]));
  ctx.fillStyle = '#5b4a44'; for (let i = 0; i < 17; i++) ctx.fillRect(10 + i * 7.6, 58, (i % 3 === 0 ? 4.4 : 2.2), 24);
  ctx.restore();
  ctx.fillStyle = 'rgba(245,225,180,.85)'; ctx.beginPath(); ctx.moveTo(338, 1228); ctx.lineTo(384, 1225); ctx.lineTo(376, 1191); ctx.lineTo(344, 1193); ctx.closePath(); ctx.fill();
  ink(ctx, 'M 232,1202 L 492,1186', 1.6, '#a87748', .1, .1, .5);
}
function torsoF(ctx, c) {
  const cream = '#f8eedb', creamSh = '#e6d2b3', band = '#efdfc2', ln = '#5a382b';
  // neck + upper chest
  const sk = shape(ctx, 'M 282,930 C 286,985 284,1020 276,1040 C 258,1058 236,1066 220,1072 L 300,1150 L 400,1150 L 456,1068 C 428,1060 404,1052 396,1040 C 388,1016 388,990 390,960 Z', c.skin, 2.6);
  ctx.save(); ctx.clip(sk);
  shape(ctx, 'M 270,920 L 400,930 L 396,1004 C 372,1030 318,1034 280,1002 Z', c.skinSh); ctx.restore();
  ink(ctx, 'M 304,1066 C 322,1072 336,1072 344,1068', 1.6, '#d9a18c', .3, .3, .9);
  // white inner top (scoop neck)
  const tp = shape(ctx, 'M 250,1060 C 290,1104 376,1108 424,1058 L 470,1080 L 460,1300 L 220,1300 L 214,1080 Z', '#fffdf8', 2.4, ln);
  ctx.save(); ctx.clip(tp); shape(ctx, 'M 250,1060 C 290,1112 376,1116 424,1062 L 424,1082 C 380,1130 286,1126 250,1080 Z', '#ece2de'); ctx.restore();
  // cardigan: two front panels forming a V
  const L = 'M 276,1030 C 250,1054 206,1060 174,1086 C 140,1106 126,1160 122,1235 C 116,1330 112,1410 124,1480 C 132,1530 160,1570 196,1590 L 196,1920 L 338,1920 L 337,1252 L 325,1240 C 300,1170 284,1100 276,1030 Z';
  const R = 'M 396,1030 C 420,1054 470,1058 508,1076 C 540,1090 556,1130 562,1190 C 572,1280 580,1360 574,1440 L 566,1920 L 338,1920 L 337,1252 L 347,1240 C 372,1170 388,1100 396,1030 Z';
  const lp = shape(ctx, L, cream, 3.2, ln), rp = shape(ctx, R, cream, 3.2, ln);
  ctx.save(); ctx.clip(lp);
  shape(ctx, 'M 276,1030 C 284,1100 300,1170 325,1240 L 337,1252 L 337,1300 L 300,1300 C 280,1220 262,1130 256,1046 Z', band);
  shape(ctx, 'M 122,1235 C 150,1250 190,1250 214,1232 L 214,1920 L 110,1920 Z', creamSh);       // arm/side in shade
  shape(ctx, 'M 150,1100 C 190,1130 250,1126 268,1070 L 300,1200 L 150,1220 Z', 'rgba(230,205,170,.55)'); // hair shadow on shoulder
  ctx.restore();
  ctx.save(); ctx.clip(rp);
  shape(ctx, 'M 396,1030 C 388,1100 372,1170 347,1240 L 337,1252 L 337,1300 L 372,1300 C 392,1220 410,1130 416,1046 Z', band);
  shape(ctx, 'M 470,1120 C 500,1180 520,1250 520,1920 L 600,1920 L 600,1100 Z', creamSh);
  ctx.restore();
  ink(ctx, 'M 256,1046 C 262,1130 280,1220 300,1296', 1.5, '#c9ad85', .1, .1, .9);
  ink(ctx, 'M 416,1046 C 410,1130 392,1220 372,1296', 1.5, '#c9ad85', .1, .1, .9);
  ribs(ctx, 262, 1070, 304, 1230, 9, 13, -.25, '#d6bd97'); ribs(ctx, 396, 1070, 356, 1230, 9, 13, Math.PI + .25, '#d6bd97');
  // shoulder seams / folds
  ink(ctx, 'M 176,1090 C 168,1130 160,1180 162,1230', 1.8, ln, .2, .6, .7);
  ink(ctx, 'M 508,1080 C 520,1120 528,1170 528,1215', 1.8, ln, .2, .6, .7);
  ink(ctx, 'M 150,1300 C 160,1330 176,1350 196,1362', 1.6, ln, .3, .5, .6);
}
function sleevesF(ctx, c) {
  const cream = '#f8eedb', creamSh = '#e6d2b3', band = '#efdfc2', ln = '#5a382b';
  // far arm: wraps round the right edge a little higher than the near hand, fingers on the front face
  [[536,1316,-.10,36],[532,1336,-.04,43],[532,1356,.03,41],[536,1375,.09,33]].forEach(q => finger(ctx, q[0], q[1], q[2], q[3], 15.5, c.skin, c.skinSh, true));
  const fs = shape(ctx, 'M 566,1226 C 590,1290 600,1392 588,1440 C 576,1468 548,1464 534,1440 C 528,1408 528,1348 534,1300 C 540,1280 550,1250 566,1226 Z', cream, 3.2, ln);
  ctx.save(); ctx.clip(fs);
  shape(ctx, 'M 600,1380 C 580,1410 556,1418 530,1410 L 530,1480 L 600,1480 Z', creamSh);
  shape(ctx, 'M 526,1296 L 552,1290 L 554,1450 L 528,1446 Z', band); ctx.restore();
  ink(ctx, 'M 552,1294 C 550,1340 550,1400 554,1446', 1.6, '#c9ad85', .1, .1, .9);
  ribs(ctx, 534, 1312, 534, 1432, 7, 13, 0, '#d6bd97');
  // near arm: wraps round the left edge, fingers on the front face
  [[238,1420,-.10,40],[242,1440,-.04,47],[242,1460,.02,45],[238,1479,.08,37]].forEach(q => finger(ctx, q[0], q[1], q[2], q[3], 15.5, c.skin, c.skinSh));
  const ns = shape(ctx, 'M 121,1372 C 110,1440 116,1512 150,1548 C 178,1560 210,1532 230,1500 C 236,1470 240,1436 240,1404 C 200,1390 160,1380 121,1372 Z', cream, 3.2, ln);
  ctx.save(); ctx.clip(ns);
  shape(ctx, 'M 110,1470 C 150,1500 200,1500 236,1470 L 236,1570 L 110,1570 Z', creamSh);
  shape(ctx, 'M 220,1396 L 246,1404 L 238,1506 L 212,1512 Z', band); ctx.restore();
  ink(ctx, 'M 221,1400 C 222,1436 219,1474 212,1508', 1.6, '#c9ad85', .1, .1, .9);
  ribs(ctx, 238, 1414, 230, 1494, 6, -13, 0, '#d6bd97');
  ink(ctx, 'M 130,1420 C 150,1432 172,1436 196,1432', 1.6, ln, .3, .5, .55);
}
function torsoM(ctx, c) {
  const grey = '#a9adba', greySh = '#80859a', greyHi = '#c9ccd6', ln = '#33282f';
  shape(ctx, 'M 690,818 C 704,744 792,712 862,724 C 910,736 940,792 942,866 L 700,876 Z', '#71768a', 3, ln);   // hood, behind the neck
  const nk = shape(ctx, 'M 742,722 C 742,770 734,812 722,848 L 890,848 C 882,800 878,750 880,688 Z', c.skin, 2.8);
  ctx.save(); ctx.clip(nk);
  shape(ctx, 'M 730,700 L 890,680 L 892,860 L 800,860 C 812,820 800,790 770,772 C 752,762 742,750 740,730 Z', c.skinSh); ctx.restore();
  ink(ctx, 'M 866,720 C 846,770 812,812 778,842', 1.8, INK, .3, .5, .5);
  ink(ctx, 'M 741,782 C 736,792 737,800 741,808', 1.6, INK, .3, .3, .6);
  shape(ctx, 'M 716,826 C 756,872 846,876 890,822 L 906,910 L 700,910 Z', '#fdf9f3', 2.4, ln);                 // tee collar
  ink(ctx, 'M 728,846 C 768,884 838,886 880,846', 1.4, '#cfc6c0', .1, .1, .9);
  const bd = shape(ctx, 'M 712,824 C 676,848 600,866 552,892 C 512,914 494,966 488,1050 C 480,1200 474,1500 470,1920 L 1090,1920 L 1090,905 C 1040,880 944,856 890,818 C 850,900 756,902 712,824 Z', grey, 3.4, ln);
  ctx.save(); ctx.clip(bd);
  shape(ctx, 'M 1100,990 C 1040,1010 1000,1100 990,1920 L 1100,1920 Z', greySh);                              // side turned from the window
  shape(ctx, 'M 712,824 C 756,910 850,908 890,818 L 906,872 C 860,960 750,958 696,872 Z', greySh);             // under the hood rim
  shape(ctx, 'M 470,1300 C 560,1240 606,1100 592,1000 L 650,1920 L 470,1920 Z', greySh);                       // behind her
  ctx.globalAlpha = .8; shape(ctx, 'M 552,892 C 520,912 500,960 494,1040 C 520,970 566,930 640,896 Z', greyHi); ctx.globalAlpha = 1;
  ctx.fillStyle = lg(ctx, 0, 1000, 0, 1920, [[0, 'rgba(84,86,116,0)'], [1, 'rgba(84,86,116,.42)']]); ctx.fillRect(460, 1000, 640, 920);
  ctx.fillStyle = rg(ctx, 700, 1010, 20, 330, [[0, 'rgba(255,226,190,.34)'], [1, 'rgba(255,226,190,0)']]); ctx.fillRect(460, 700, 640, 700);
  
  ctx.restore();
  ink(ctx, 'M 592,1004 C 596,1100 588,1220 568,1330', 2, ln, .2, .5, .6);
  ink(ctx, 'M 642,902 C 630,930 628,960 632,992', 1.8, ln, .3, .5, .5);
  ink(ctx, 'M 1000,966 C 950,1004 900,1022 850,1024', 1.8, ln, .1, .7, .5);
  ink(ctx, 'M 1012,1050 C 964,1086 930,1104 896,1110', 1.6, ln, .1, .7, .4);
  ink(ctx, 'M 668,1560 C 680,1500 700,1470 724,1456 L 960,1450 C 990,1466 1004,1500 1012,1560', 2, ln, .1, .1, .45);
  // hood rim wrapping round to the front
  shape(ctx, 'M 898,784 C 934,832 890,892 804,916 L 786,886 C 842,868 874,838 870,800 Z', '#b9bdc9', 3, ln);
  shape(ctx, 'M 710,788 C 688,832 728,890 806,912 L 814,882 C 772,866 742,842 738,806 Z', '#b3b7c4', 3, ln);
  [['M 776,904 C 770,950 772,1000 766,1052', 766, 1052], ['M 816,904 C 824,946 820,996 828,1040', 828, 1040]].forEach(s => {
    ctx.lineCap = 'round'; ctx.strokeStyle = ln; ctx.lineWidth = 9; ctx.stroke(P(s[0])); ctx.strokeStyle = '#f3f1ee'; ctx.lineWidth = 4.6; ctx.stroke(P(s[0]));
    ctx.fillStyle = '#8b90a0'; ctx.strokeStyle = ln; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.roundRect(s[1] - 6, s[2] - 2, 12, 24, 4); ctx.fill(); ctx.stroke();
  });
  // raised upper arm (joins the shoulder; forearm is drawn earlier, behind the head)
  const ua = P('M 942,894 C 954,820 980,730 1006,668 C 1030,640 1070,630 1100,640 L 1100,1010 L 1040,1010 C 1010,960 970,916 942,894 Z');
  ctx.fillStyle = grey; ctx.fill(ua);
  ctx.save(); ctx.clip(ua); shape(ctx, 'M 942,894 C 954,820 980,730 1006,668 C 1030,720 1036,800 1010,900 C 1030,940 1050,980 1050,1020 L 930,1020 Z', greySh); ctx.restore();
  ctx.lineWidth = 3.4; ctx.strokeStyle = ln; ctx.lineCap = 'round'; ctx.stroke(P('M 942,894 C 954,820 980,730 1006,668'));
  ink(ctx, 'M 962,820 C 982,828 1002,828 1022,820', 1.6, ln, .3, .5, .5);
}
function armRaisedM(ctx) { // hand rubbing the back of his head: the forearm disappears behind the head
  const grey = '#a9adba', greySh = '#80859a', ln = '#33282f';
  const ap = shape(ctx, 'M 1006,668 C 970,636 924,602 884,584 L 926,494 C 990,516 1052,556 1100,594 L 1100,720 Z', grey, 3.4, ln);
  ctx.save(); ctx.clip(ap);
  shape(ctx, 'M 884,584 C 924,602 970,636 1006,668 L 1100,720 L 1100,660 C 1040,610 970,572 900,548 Z', greySh);
  ctx.restore();
  ink(ctx, 'M 1006,668 C 1022,658 1040,656 1058,662', 2, ln, .1, .6, .7);
  ink(ctx, 'M 1000,690 C 1014,702 1030,706 1046,702', 1.7, ln, .2, .6, .6);
}

/* ───────────── stage ───────────── */
function hallway(ctx) {
  // wall
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#e9cdb4'], [.5, '#f1d9c0'], [1, '#dcb89c']]); ctx.fillRect(0, 0, W, H);
  // subtle wall panel texture lines
  ctx.strokeStyle = 'rgba(170,120,90,.12)'; ctx.lineWidth = 2; for (let y = 120; y < H; y += 300) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const doorC = '#7fa19c', doorD = '#5f837f', trim = '#f7ead8', trimSh = '#cfae93';
  // ── her door (closed) ──
  shape(ctx, 'M 22,222 L 486,222 L 486,1920 L 22,1920 Z', trim, 3, '#8a6450');
  shape(ctx, 'M 46,246 L 462,246 L 462,1920 L 46,1920 Z', lg(ctx, 46, 0, 462, 0, [[0, '#86a8a2'], [1, doorC]]), 3, '#4d6966');
  ctx.fillStyle = 'rgba(50,70,70,.25)'; ctx.fillRect(46, 246, 416, 14); ctx.fillRect(46, 246, 10, 1700);
  [[84, 300, 340, 520], [84, 880, 340, 900]].forEach(r => {
    ctx.strokeStyle = doorD; ctx.lineWidth = 5; ctx.strokeRect(r[0], r[1], r[2], r[3]);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.strokeRect(r[0] + 5, r[1] + 5, r[2] - 6, r[3] - 6);
  });
  // number plate 301
  ctx.fillStyle = '#f6efe4'; ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(98, 500, 118, 60, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a3d30'; ctx.font = '44px "Jua"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('301', 157, 532);
  // peephole
  ctx.fillStyle = '#d9c9a8'; ctx.beginPath(); ctx.arc(254, 600, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#3b3030'; ctx.beginPath(); ctx.arc(254, 600, 4, 0, TAU); ctx.fill();
  // digital lock + lever (generic, left side of her door)
  ctx.fillStyle = '#3f4a52'; ctx.strokeStyle = '#2a2f36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(58, 1120, 46, 170, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(160,220,255,.75)'; for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(69 + q * 12, 1142 + r * 14, 2.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#c9ced3'; ctx.strokeStyle = '#2a2f36'; ctx.beginPath(); ctx.roundRect(64, 1240, 78, 18, 9); ctx.fill(); ctx.stroke();
  // ── wall strip between the doors: lamp, his number plate, bell ──
  ctx.fillStyle = 'rgba(120,70,50,.10)'; ctx.fillRect(486, 0, 14, H);
  // ── his doorway (open, lit entrance inside) ──
  shape(ctx, 'M 588,222 L 1100,222 L 1100,1920 L 588,1920 Z', trim, 3, '#8a6450');
  const inner = P('M 612,246 L 1100,246 L 1100,1920 L 612,1920 Z');
  ctx.save(); ctx.clip(inner);
  ctx.fillStyle = lg(ctx, 612, 0, 1080, 0, [[0, '#e7b77e'], [.5, '#f7d9a4'], [1, '#e9bd86']]); ctx.fillRect(612, 246, 500, 1700);
  ctx.fillStyle = rg(ctx, 880, 420, 20, 620, [[0, 'rgba(255,246,214,.95)'], [.5, 'rgba(255,226,170,.45)'], [1, 'rgba(255,210,150,0)']]); ctx.fillRect(612, 246, 500, 1700);
  // entrance details: ceiling light, back wall corner, coat hook, shoe cabinet
  ctx.fillStyle = '#fff8e2'; ctx.beginPath(); ctx.ellipse(900, 300, 70, 16, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(190,130,80,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(990, 246); ctx.lineTo(990, 1920); ctx.stroke();
  ctx.fillStyle = 'rgba(214,160,104,.55)'; ctx.fillRect(990, 246, 120, 1700);
  ctx.fillStyle = 'rgba(180,120,74,.55)'; ctx.fillRect(700, 1240, 300, 700); ctx.fillStyle = 'rgba(150,96,58,.6)'; ctx.fillRect(700, 1240, 300, 12);
  // inward-opened door slab, seen edge-on at the left of the opening
  shape(ctx, 'M 612,246 L 676,270 L 676,1920 L 612,1920 Z', lg(ctx, 612, 0, 676, 0, [[0, '#4f716e'], [1, '#6b908b']]), 2.5, '#3b5553');
  shape(ctx, 'M 676,270 L 690,264 L 690,1920 L 676,1920 Z', '#a9c4bd', 2, '#3b5553');
  ctx.fillStyle = 'rgba(60,40,30,.22)'; ctx.fillRect(612, 246, 500, 16);
  ctx.restore();
  ctx.strokeStyle = '#8a6450'; ctx.lineWidth = 3; ctx.stroke(inner);
  // his number plate + bell on the strip
  ctx.fillStyle = '#f6efe4'; ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(496, 700, 86, 46, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a3d30'; ctx.font = '34px "Jua"'; ctx.fillText('302', 539, 724);
  ctx.fillStyle = '#ece3d6'; ctx.beginPath(); ctx.roundRect(516, 772, 46, 70, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c98a5a'; ctx.beginPath(); ctx.arc(539, 822, 9, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7b6a60'; for (let i = 0; i < 3; i++) ctx.fillRect(526, 784 + i * 7, 26, 3);
  // wall lamp
  ctx.fillStyle = '#b98a4e'; ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(528, 600, 22, 40, 5); ctx.fill(); ctx.stroke();
  const shade = P('M 506,520 C 506,500 572,500 572,520 L 564,598 C 556,610 522,610 514,598 Z');
  ctx.fillStyle = lg(ctx, 0, 505, 0, 610, [[0, '#fff3cf'], [1, '#ffd98f']]); ctx.fill(shade); ctx.stroke(shade);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rg(ctx, 539, 560, 10, 330, [[0, 'rgba(255,214,140,.85)'], [.4, 'rgba(255,190,120,.30)'], [1, 'rgba(255,180,110,0)']]); ctx.fillRect(160, 200, 760, 760);
  // evening window light raking across wall and door from the left (with mullion gaps)
  ctx.fillStyle = 'rgba(255,170,96,.42)';
  [[0, 560, 0, 820, 500, 1090, 500, 800], [0, 880, 0, 1160, 500, 1470, 500, 1150], [0, 1220, 0, 1500, 500, 1830, 500, 1530]].forEach(q => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); ctx.closePath(); ctx.fill(); });
  ctx.restore();
  // ceiling / corner falloff for depth
  ctx.fillStyle = lg(ctx, 0, 0, 0, 520, [[0, 'rgba(90,50,60,.38)'], [1, 'rgba(90,50,60,0)']]); ctx.fillRect(0, 0, 612, 520);
  ctx.fillStyle = lg(ctx, 0, 0, 260, 0, [[0, 'rgba(90,50,70,.22)'], [1, 'rgba(90,50,70,0)']]); ctx.fillRect(0, 0, 260, H);
}
function bubble(ctx, o) { // webtoon speech bubble: hand-drawn oval + curved tail
  const { cx, cy, rx, ry, tail, lines, size, font } = o;
  const k = .5523, wob = 6;
  const body = () => { const p = new Path2D();
    p.moveTo(cx - rx, cy + 4);
    p.bezierCurveTo(cx - rx - wob, cy - ry * k, cx - rx * k, cy - ry - 3, cx + 6, cy - ry);
    p.bezierCurveTo(cx + rx * k, cy - ry + 3, cx + rx + wob, cy - ry * k, cx + rx, cy - 4);
    p.bezierCurveTo(cx + rx - 2, cy + ry * k, cx + rx * k, cy + ry + 4, cx - 4, cy + ry);
    p.bezierCurveTo(cx - rx * k, cy + ry - 2, cx - rx + 3, cy + ry * k, cx - rx, cy + 4); p.closePath(); return p; };
  const tl = () => { const p = new Path2D(); p.moveTo(tail.bx - tail.w / 2, tail.by - 14); p.quadraticCurveTo(tail.bx - 4, tail.by + (tail.ty - tail.by) * .55, tail.tx, tail.ty);
    p.quadraticCurveTo(tail.bx + tail.w * .3, tail.by + (tail.ty - tail.by) * .4, tail.bx + tail.w / 2, tail.by - 14); p.closePath(); return p; };
  const b = body(), t = tl();
  ctx.save(); ctx.translate(7, 9); ctx.fillStyle = 'rgba(90,50,40,.20)'; ctx.fill(b); ctx.fill(t); ctx.restore();
  ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a2420'; ctx.lineWidth = 7; ctx.stroke(b); ctx.stroke(t);
  ctx.fillStyle = '#fffdf9'; ctx.fill(b); ctx.fill(t);
  ctx.fillStyle = '#2a1a17'; ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = size * 1.32, y0 = cy - (lines.length - 1) * lh / 2 + 2;
  lines.forEach((s, i) => ctx.fillText(s, cx + (o.dx ? o.dx[i] : 0), y0 + i * lh));
}
function sfx(ctx, text, x, y, size, rot, font) { // 의성어: chunky hand-lettered feel, char by char
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const step = size * .92;
  [...text].forEach((ch, i) => { ctx.save(); ctx.translate((i - (text.length - 1) / 2) * step, (i % 2 ? -8 : 6)); ctx.rotate((i % 2 ? .07 : -.06)); const sc = 1 + i * .12; ctx.scale(sc, sc);
    ctx.strokeStyle = '#fff8ee'; ctx.lineWidth = 14; ctx.strokeText(ch, 0, 0); ctx.strokeStyle = '#5a3526'; ctx.lineWidth = 5; ctx.strokeText(ch, 0, 0); ctx.fillStyle = '#f2a65a'; ctx.fillText(ch, 0, 0); ctx.restore(); });
  ctx.restore();
}

/* ───────────── characters ───────────── */
const HER = { x: 322, y: 838, s: 1.53, rot: -4, flip: false };
const HIM = { x: 772, y: 590, s: 1.60, sy: 1.11, rot: -3, flip: true };
function drawHeroine(ctx) {
  const c = PAL.her, ex = { look: [.55, -.18], hl: -1, blush: 1 };
  inHead(ctx, HER, () => hairBackF(ctx, c));
  torsoF(ctx, c);
  inHead(ctx, HER, () => { hairFarF(ctx, c); faceF(ctx, c, ex); hairFrontF(ctx, c); });
  parcel(ctx);
  sleevesF(ctx, c);
}
function drawHero(ctx) {
  const c = PAL.him, ex = { look: [.55, .22], hl: 1, blush: 1 };
  armRaisedM(ctx);
  inHead(ctx, HIM, () => hairBackM(ctx, c));
  torsoM(ctx, c);
  inHead(ctx, HIM, () => { faceM(ctx, c, ex); hairFrontM(ctx, c); });
}
function stamp(ctx, lay, o) { // character layer + wall shadow + soft form shade + rim light
  const sh = layer(x => { x.drawImage(lay, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = o.shade(x); x.fillRect(0, 0, W, H); });
  ctx.save(); ctx.shadowColor = 'rgba(70,35,45,.38)'; ctx.shadowBlur = 46; ctx.shadowOffsetX = o.sx; ctx.shadowOffsetY = 18; ctx.drawImage(sh, 0, 0); ctx.restore();
  (o.rims || []).forEach(r => { ctx.save(); ctx.globalAlpha = r[3]; ctx.globalCompositeOperation = r[4] || 'screen'; ctx.drawImage(rimOf(lay, r[0], r[1], r[2]), 0, 0); ctx.restore(); });
}

function draw(canvas) {
  const ctx = canvas.getContext('2d');
  const bg = layer(hallway); ctx.save(); ctx.filter = 'blur(2.2px)'; ctx.drawImage(bg, 0, 0); ctx.restore();
  const him = layer(drawHero), her = layer(drawHeroine);
  stamp(ctx, him, { sx: -26, shade: x => lg(x, 480, 0, 1080, 0, [[0, 'rgba(255,190,120,.10)'], [.55, 'rgba(120,80,110,0)'], [1, 'rgba(110,70,110,.20)']]),
    rims: [[4, 2, '#ffd9a6', .55]] });
  stamp(ctx, her, { sx: 22, shade: x => lg(x, 100, 0, 600, 0, [[0, 'rgba(255,180,110,.12)'], [.5, 'rgba(120,80,110,0)'], [1, 'rgba(120,70,110,.14)']]),
    rims: [[6, 2, '#ffd9a6', .8]] });
  // floating evening dust in the light
  for (let i = 0; i < 26; i++) { const x = hash(i) * 1000 + 30, y = 480 + hash(i + 50) * 1050, r = 2 + hash(i + 90) * 5;
    ctx.fillStyle = rg(ctx, x, y, 0, r * 2.2, [[0, 'rgba(255,240,200,.75)'], [1, 'rgba(255,220,160,0)']]); ctx.fillRect(x - 14, y - 14, 28, 28); }
  // flustered marks near her
    [['M 462,676 L 478,656'], ['M 474,700 L 498,686'], ['M 480,726 L 506,720']].forEach(q => { ink(ctx, q[0], 7, '#fff8ee', .2, .2); ink(ctx, q[0], 3.2, '#e9806f', .2, .2); });
  bubble(ctx, { cx: 306, cy: 352, rx: 262, ry: 124, tail: { bx: 336, by: 470, tx: 356, ty: 578, w: 50 }, lines: ['저기…', '혹시 옆집이세요?'], dx: [-70, 0], size: 56, font: '"PretendardSB"' });
  sfx(ctx, '덜컥', 842, 306, 84, -.12, '"Jua"');
  // grade: warm wash + vignette
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = lg(ctx, 0, 0, W, H, [[0, 'rgba(255,170,100,.30)'], [.6, 'rgba(255,200,150,.08)'], [1, 'rgba(120,80,150,.22)']]); ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.fillStyle = rg(ctx, W / 2, 880, 620, 1250, [[0, 'rgba(60,25,40,0)'], [1, 'rgba(60,25,40,.36)']]); ctx.fillRect(0, 0, W, H);
}

root.SCENE = { W, H, draw, parts: { eye, brow, faceF, faceM, hairBackF, hairFarF, hairFrontF, hairBackM, hairFrontM, torsoF, sleevesF, torsoM, armRaisedM, parcel, hallway, bubble, sfx, ink, lockPath, finger },
  faces: [{ x: 326, y: 836, w: 380, h: 420 }, { x: 772, y: 590, w: 380, h: 420 }] };
})(window);
