// lab/b_casual/scene.js  --  STYLE B "캐주얼 감성툰" art-style draft (one scene).
// Everything is drawn with Canvas 2D paths/gradients. Deterministic: no Math.random / Date.
// Small reusable parts (head, eye, hair, torso, arm, bubble, hallway ...) so the style can grow into a rig.
(function (root) {
'use strict';
const W = 1080, H = 1920;
const INK = '#5a392b';          // warm-brown outline
const LW = 6;                   // main outline weight (scene px)

// ---------------------------------------------------------------- helpers
const P = (d) => new Path2D(d);
function fs(ctx, p, fill, lw, ink) {
  if (lw === undefined) lw = LW;
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
  if (lw) { ctx.strokeStyle = ink || INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p); }
}
function line(ctx, d, lw, color, alpha) {
  ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.strokeStyle = color || INK; ctx.lineWidth = lw || LW; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke(typeof d === 'string' ? P(d) : d); ctx.restore();
}
// union outline: every shape inked first, then every shape filled -> one clean outer contour, no inner seams
function union(ctx, shapes, lw) {
  if (lw === undefined) lw = LW;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const s of shapes) {
    ctx.strokeStyle = ctx.fillStyle = s.ink || INK; ctx.lineWidth = (s.tube || 0) + (s.lw === undefined ? lw : s.lw) * 2; ctx.stroke(s.p);
    if (!s.tube) ctx.fill(s.p);
  }
  for (const s of shapes) {
    if (s.tube) { ctx.strokeStyle = s.fill; ctx.lineWidth = s.tube; ctx.stroke(s.p); }
    else { ctx.fillStyle = s.fill; ctx.fill(s.p); }
  }
  ctx.restore();
}
function clipDo(ctx, p, fn) { ctx.save(); ctx.clip(p); fn(); ctx.restore(); }
function ell(ctx, x, y, rx, ry, fill, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
function rr(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
// run fn in head-local units (head radius = 100 units); fn gets the outline weight in units
function inHead(ctx, c, fn) {
  ctx.save(); ctx.translate(c.hx, c.hy); ctx.rotate((c.tilt || 0) * Math.PI / 180);
  const k = c.r / 100; ctx.scale(k * (c.wide || 1), k); fn(LW / k); ctx.restore();
}

// ---------------------------------------------------------------- face
function faceGeom(c) {
  const t = c.turn || 0, a = Math.abs(t), far = 1 - 0.11 * a, near = 1 + 0.015 * a;
  const mR = t >= 0 ? far : near, mL = t >= 0 ? near : far, cx = t * 10, CH = c.chin;
  let d;
  if (c.jaw > 0.5) {  // longer face, defined jaw (male lead)
    d = `M${-97 * mL},-15 C${-97 * mL},-78 -58,-106 0,-106 C58,-106 ${97 * mR},-78 ${97 * mR},-15
      C${98 * mR},12 ${95 * mR},36 ${87 * mR},58 C${82 * mR},76 ${72 * mR},90 ${54 * mR + cx * .4},${CH - 22}
      C${40 * mR + cx * .6},${CH - 6} ${20 + cx},${CH} ${cx},${CH}
      C${-20 + cx},${CH} ${-40 * mL + cx * .6},${CH - 6} ${-54 * mL + cx * .4},${CH - 22}
      C${-72 * mL},90 ${-82 * mL},76 ${-87 * mL},58 C${-95 * mL},36 ${-98 * mL},12 ${-97 * mL},-15 Z`;
  } else {            // soft round face (female lead)
    d = `M${-97 * mL},-15 C${-97 * mL},-78 -58,-106 0,-106 C58,-106 ${97 * mR},-78 ${97 * mR},-15
      C${98 * mR},18 ${95 * mR},42 ${83 * mR},62 C${70 * mR},84 ${30 + cx},${CH} ${cx},${CH}
      C${-30 + cx},${CH} ${-70 * mL},84 ${-83 * mL},62 C${-95 * mL},42 ${-98 * mL},18 ${-97 * mL},-15 Z`;
  }
  const sh = t * 18;
  const ex = t >= 0 ? [-c.eyeSp + sh, c.eyeSp + sh * .5] : [-c.eyeSp + sh * .5, c.eyeSp + sh];
  const farK = 1 - 0.13 * a;
  const ek = t >= 0 ? [1, farK] : [farK, 1];
  return { d, mL, mR, cx, sh, ex, ek };
}
function ear(ctx, x, y, s, skin, shade, lwu) {
  const p = P(`M${x - s * 4},${y - 20} C${x + s * 16},${y - 28} ${x + s * 22},${y + 6} ${x + s * 9},${y + 22} C${x + s * 4},${y + 26} ${x - s * 2},${y + 22} ${x - s * 4},${y + 16} Z`);
  fs(ctx, p, skin, lwu);
  line(ctx, `M${x + s * 5},${y - 9} Q${x + s * 13},${y - 2} ${x + s * 6},${y + 9}`, lwu * .5, '#c98a72');
}
// one eye in local units. o: {x,y,w,h, side(+1 outer = right), look:[x,y], iris:[top,mid,low], pupil, lash, fem, lidDrop}
function eye(ctx, o) {
  const w = o.w, h = o.h;
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.side, 1);
  const top = -h + (o.lidDrop || 0) * h;
  const sc = P(`M${-w},2 C${-w},${top * .9} ${-w * .5},${top} 0,${top} C${w * .6},${top} ${w},${top * .8} ${w},0
     C${w},${h * .75} ${w * .5},${h} 0,${h} C${-w * .6},${h} ${-w},${h * .7} ${-w},2 Z`);
  ctx.fillStyle = '#fffdf8'; ctx.fill(sc);
  clipDo(ctx, sc, () => {
    const lx = o.look[0] * o.side * w * .2, ly = o.look[1] * h * .14 + (o.fem ? 1 : 0);
    const rx = w * (o.fem ? .82 : .62), ry = h * (o.fem ? .9 : .98);
    const g = ctx.createLinearGradient(0, ly - ry, 0, ly + ry);
    g.addColorStop(0, o.iris[0]); g.addColorStop(.5, o.iris[1]); g.addColorStop(1, o.iris[2]);
    ell(ctx, lx, ly, rx, ry, g);
    ell(ctx, lx, ly - ry * .06, rx * .46, ry * .5, o.pupil);
    // light crescent at the bottom of the iris
    ctx.save(); ctx.beginPath(); ctx.ellipse(lx, ly, rx, ry, 0, 0, 7); ctx.clip();
    ell(ctx, lx, ly + ry * 1.05, rx * .8, ry * .42, o.iris[3] || 'rgba(255,220,180,.55)'); ctx.restore();
    // lid shadow
    ctx.fillStyle = 'rgba(70,40,30,.20)'; ctx.fillRect(-w - 2, top - 2, w * 2 + 4, h * .42);
    // highlights (same screen side on both eyes -> undo mirror with o.side)
    const hx = lx - o.side * rx * .36, hy = ly - ry * .42;
    ell(ctx, hx, hy, w * (o.fem ? .27 : .22), w * (o.fem ? .3 : .22), '#ffffff');
    ell(ctx, lx + o.side * rx * .42, ly + ry * .45, w * .12, w * .12, 'rgba(255,255,255,.9)');
  });
  // upper lash / lid line (crescent, thicker in the middle, small flick at the outer corner)
  const th = o.fem ? 6.5 : 6, fl = o.fem ? 7 : 3;
  const lash = P(`M${-w - 2},3 C${-w - 2},${top - 4} ${-w * .4},${top - th} ${w * .15},${top - th}
     C${w * .7},${top - th + .5} ${w + 3},${top * .78} ${w + fl},${top * .3 - fl * .6}
     L${w + .6},${top * .1} C${w},${top * .7} ${w * .6},${top + 1.5} 0,${top + 1.5} C${-w * .5},${top + 1.5} ${-w + 1.2},${top * .8} ${-w + 1.6},3 Z`);
  ctx.fillStyle = o.lash; ctx.fill(lash);
  if (o.fem) {
    line(ctx, `M${w * .25},${h + .8} Q${w * 1.0},${h * .95} ${w + .8},${top * .1}`, 2.2, o.lash, .8);
    line(ctx, `M${-w * .5},${top - 12} Q${w * .2},${top - 16} ${w * .95},${top - 9}`, 1.7, o.lash, .45);
  } else {
    line(ctx, `M${-w * .7},${top - 9} Q${w * .1},${top - 13} ${w * .95},${top - 8}`, 1.8, o.lash, .45);
    line(ctx, `M${-w * .2},${h + .5} Q${w * .9},${h + 1} ${w + .6},${top * .1}`, 1.9, o.lash, .6);
  }
  ctx.restore();
}
function blush(ctx, x, y, s, a, marks) {
  ctx.save(); ctx.globalAlpha = a; ell(ctx, x, y, 21 * s, 11 * s, '#ff9d94'); ctx.restore();
  if (marks) for (let i = -1; i <= 1; i++) line(ctx, `M${x + i * 9 * s + 3},${y - 6 * s} L${x + i * 9 * s - 3},${y + 6 * s}`, 2.6, '#ee7f7a', .9);
}

// ---------------------------------------------------------------- HEROINE head + hair
const FEM = {
  skin: '#ffe7d6', skinSh: '#f9cfb9', hair: '#a26240', hairSh: '#7f4a31', hairHi: '#cf9468', hairLine: '#6d3d28',
  iris: ['#5b2f1b', '#96592f', '#cf9257'], pupil: '#3a1e12', lash: '#4a2a1c', brow: '#7a492f',
};
function hairBackF(ctx, c) {
  inHead(ctx, c, (lw) => {
    const s = c.turn * -6;
    const p = P(`M${s},-138 C${86 + s},-140 126,-78 124,-6 C122,40 138,70 132,104 C128,126 144,146 136,170
      C130,190 104,196 88,184 C70,196 48,190 40,168 L36,120 L-36,120 L-44,170 C-54,192 -78,196 -92,184
      C-110,198 -138,190 -142,168 C-148,144 -132,128 -136,104 C-142,70 -126,40 -126,-6 C-130,-78 ${-86 + s},-140 ${s},-138 Z`);
    fs(ctx, p, FEM.hairSh, lw);
    for (const d of ['M-112,70 C-122,100 -108,130 -118,166', 'M110,70 C120,100 106,130 114,166', 'M-92,184 C-84,170 -86,156 -80,142', 'M88,184 C80,170 82,156 76,142'])
      line(ctx, d, 3, FEM.hairLine, .7);
  });
}
function headF(ctx, c) {
  inHead(ctx, c, (lw) => {
    const g = faceGeom(c), fp = P(g.d);
    fs(ctx, fp, FEM.skin, lw);
    clipDo(ctx, fp, () => {
      ctx.fillStyle = FEM.skinSh;
      ctx.fill(P(`M-110,-110 H110 V-42 Q${g.sh},-58 -110,-42 Z`));
      ctx.fill(P('M-110,-40 L-80,-40 C-76,10 -84,50 -78,110 L-110,110 Z'));
      ctx.fill(P('M110,-40 L80,-40 C76,10 82,50 74,110 L110,110 Z'));
      blush(ctx, g.ex[0] - 8, c.eyeY + 33, 1, .62, true);
      blush(ctx, g.ex[1] + 5, c.eyeY + 33, .88, .62, true);
    });
    const E = { y: c.eyeY, h: 22, look: c.look, iris: FEM.iris, pupil: FEM.pupil, lash: FEM.lash, fem: true };
    eye(ctx, Object.assign({}, E, { x: g.ex[0], w: 19 * g.ek[0], side: -1 }));
    eye(ctx, Object.assign({}, E, { x: g.ex[1], w: 19 * g.ek[1], side: 1 }));
    // nose: a tiny soft tick
    const nx = g.sh * 1.5 + 5, ny = c.eyeY + 27;
    line(ctx, `M${nx},${ny} Q${nx + 5},${ny + 6} ${nx - 1},${ny + 8}`, 2.6, '#c47f68');
    // mouth: small, slightly open, shy wobble
    const mx = g.sh * 1.25 + 2, my = c.eyeY + 49;
    const m = P(`M${mx - 9},${my} Q${mx - 4},${my + 3} ${mx},${my + 1} Q${mx + 4},${my + 3} ${mx + 9},${my - 1}
       Q${mx + 8},${my + 10} ${mx},${my + 11} Q${mx - 7},${my + 10} ${mx - 9},${my} Z`);
    fs(ctx, m, '#b4504d', 0);
    clipDo(ctx, m, () => ell(ctx, mx, my + 14, 8, 6, '#f29a92'));
    fs(ctx, m, null, 3);
  });
}
function strand(x0, y0, x1, y1, w, bend) {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
  return P(`M${x0 - w / 2},${y0} Q${mx - w * .42 + bend * .4},${my + 6} ${x1},${y1} Q${mx + w * .42 + bend * .4},${my + 6} ${x0 + w / 2},${y0} Z`);
}
function hairFrontF(ctx, c) {
  inHead(ctx, c, (lw) => {
    const sh = c.turn * 12, g = faceGeom(c);
    const cap = P(`M-104,6 C-132,-54 -102,-140 ${sh * .3},-140 C102,-140 128,-54 100,6
      C94,-18 82,-42 ${54 + sh},-54 Q${sh},-66 ${-54 + sh},-52 C-80,-44 -96,-20 -104,6 Z`);
    // long wavy face-framing locks, ends flipping at the shoulders
    const lockL = P(`M-98,-48 C-130,-8 -134,40 -124,80 C-118,106 -142,126 -138,156 C-136,178 -120,194 -102,190
      C-86,186 -78,170 -84,154 C-92,132 -74,110 -80,82 C-86,54 -92,34 -88,8 C-86,-12 -80,-32 -66,-54 Z`);
    const lockR = P(`M92,-48 C118,-8 120,40 112,80 C106,106 128,126 124,156 C122,178 108,194 92,190
      C78,186 72,170 76,154 C84,132 70,110 76,82 C80,54 88,34 86,8 C84,-12 78,-32 62,-54 Z`);
    // side-swept bang pieces that melt into the locks
    const sideL = P(`M${-34 + sh},-62 C-58,-56 -82,-44 -92,-22 L-88,14 C-76,0 -60,-22 ${-22 + sh},-52 Z`);
    const sideR = P(`M${34 + sh},-64 C58,-58 80,-46 90,-24 L84,12 C74,-2 58,-24 ${24 + sh},-54 Z`);
    // veil: fine hair between the see-through bang strands
    clipDo(ctx, P(g.d), () => {
      const vg = ctx.createLinearGradient(0, -62, 0, -6); vg.addColorStop(0, 'rgba(162,98,64,.34)'); vg.addColorStop(1, 'rgba(162,98,64,0)');
      ctx.fillStyle = vg; ctx.fillRect(-70 + sh, -70, 140, 70);
    });
    const B = [[-30, -50, 3, 12, -9], [-13, -22, -10, 9, -4], [5, 3, -15, 8, 1], [21, 28, -10, 9, 4], [37, 56, 2, 12, 9]];
    const wisps = B.map(([r, t, y, w, b]) => ({ p: strand(r + sh, -72, t + sh, y, w, b), fill: FEM.hair, lw: 1.5, ink: FEM.hairLine }));
    union(ctx, wisps.concat([cap, lockL, lockR, sideL, sideR].map((p) => ({ p, fill: FEM.hair }))), lw);
    for (const wsp of wisps) { ctx.fillStyle = FEM.hair; ctx.fill(wsp.p); }
    // one soft shadow tone on the inside of the long locks
    clipDo(ctx, lockL, () => { ctx.fillStyle = FEM.hairSh; ctx.fill(P('M-84,0 C-96,30 -102,60 -96,90 C-92,110 -100,140 -98,160 L-94,200 L-60,200 L-60,0 Z')); });
    clipDo(ctx, lockR, () => { ctx.fillStyle = FEM.hairSh; ctx.fill(P('M80,0 C90,30 96,60 90,90 C86,110 94,140 92,160 L88,200 L50,200 L50,0 Z')); });
    // highlight band on the crown
    clipDo(ctx, cap, () => {
      ctx.fillStyle = FEM.hairHi;
      ctx.fill(P('M-90,-76 C-74,-98 -50,-110 -26,-113 C-42,-100 -60,-86 -68,-64 Z'));
      ctx.fill(P('M-12,-115 C10,-119 36,-115 54,-104 C36,-107 14,-107 -4,-102 Z'));
      ctx.fill(P('M68,-96 C80,-88 88,-76 92,-62 C84,-74 76,-82 64,-88 Z'));
    });
    // inner flow lines
    const px = sh + 12;
    for (const d of [
      `M${px},-138 C${px - 30},-128 ${px - 72},-98 -94,-52`, `M${px},-138 C${px - 12},-116 ${px - 30},-88 ${px - 40},-64`,
      `M${px + 2},-138 C${px + 24},-122 ${px + 50},-94 ${px + 60},-62`,
      'M-112,10 C-120,44 -106,70 -114,100 C-120,124 -126,140 -122,160', 'M102,10 C108,44 96,70 102,100 C108,124 112,140 110,160',
      'M-96,96 C-88,116 -100,136 -96,160', 'M88,96 C80,116 92,136 88,160',
    ]) line(ctx, d, 3, FEM.hairLine, .75);
    // see-through bangs: thin soft wisps, skin showing between
    // brows drawn over the bangs (they do the acting): inner ends up = flustered
    const by = c.eyeY - 36;
    line(ctx, `M${g.ex[0] + 15},${by - 6} Q${g.ex[0] - 2},${by - 7} ${g.ex[0] - 19},${by + 5}`, 5.2, FEM.brow);
    line(ctx, `M${g.ex[1] - 13},${by - 6} Q${g.ex[1] + 2},${by - 7} ${g.ex[1] + 17},${by + 5}`, 5.2, FEM.brow);
  });
}

// ---------------------------------------------------------------- HERO head + hair
const MAL = {
  skin: '#fde0c9', skinSh: '#f2c4a8', hair: '#2e2b35', hairSh: '#211f27', hairHi: '#5d5b75',
  iris: ['#17141a', '#35302f', '#6a5a50'], pupil: '#0f0d10', lash: '#2a2226', brow: '#2e2b35',
};
function headM(ctx, c) {
  inHead(ctx, c, (lw) => {
    const g = faceGeom(c), fp = P(g.d);
    ctx.save(); ctx.translate(97, 30); ctx.scale(1.25, 1.25); ear(ctx, 0, 0, 1, MAL.skin, MAL.skinSh, lw / 1.25); ctx.restore();
    fs(ctx, fp, MAL.skin, lw);
    clipDo(ctx, fp, () => {
      ctx.fillStyle = MAL.skinSh;
      ctx.fill(P(`M-110,-110 H110 V-34 Q${g.sh},-50 -110,-30 Z`));
      ctx.fill(P('M110,-40 L84,-40 C90,20 84,64 62,106 L110,130 Z'));
      blush(ctx, g.ex[0] - 2, c.eyeY + 30, .8, .11, false);
      blush(ctx, g.ex[1] + 8, c.eyeY + 30, .9, .11, false);
    });
    const E = { y: c.eyeY, h: 14, look: c.look, iris: MAL.iris, pupil: MAL.pupil, lash: MAL.lash, fem: false, lidDrop: .08 };
    eye(ctx, Object.assign({}, E, { x: g.ex[0], w: 21 * g.ek[0], side: -1 }));
    eye(ctx, Object.assign({}, E, { x: g.ex[1], w: 21 * g.ek[1], side: 1 }));
    const nx = g.sh * 1.5 - 4, ny = c.eyeY + 38;
    line(ctx, `M${nx + 3},${ny - 18} L${nx - 6},${ny + 4} Q${nx - 5},${ny + 9} ${nx + 4},${ny + 8}`, 3.2, '#b9785f');
    const mx = g.sh * 1.2 - 1, my = c.eyeY + 68;
    const m = P(`M${mx - 9},${my} Q${mx},${my - 5} ${mx + 9},${my} Q${mx + 7},${my + 9} ${mx},${my + 9} Q${mx - 7},${my + 9} ${mx - 9},${my} Z`);
    fs(ctx, m, '#8a4340', 3);
  });
}
function hairM(ctx, c) {
  inHead(ctx, c, (lw) => {
    const g = faceGeom(c);
    const cap = P(`M-92,16 C-108,-28 -116,-78 -90,-112 C-92,-126 -84,-138 -70,-143 C-70,-137 -64,-131 -56,-131
      C-52,-145 -36,-155 -18,-155 C-22,-149 -20,-143 -12,-141 C0,-155 20,-161 40,-155 C34,-151 34,-145 40,-141
      C54,-149 70,-143 80,-131 C86,-129 94,-119 97,-107 C113,-101 121,-85 112,-69 C122,-46 118,-16 108,6 L100,18 L92,2
      C92,-20 88,-36 74,-50 Q0,-68 -70,-48 C-86,-30 -92,-6 -86,14 Z`);
    const lockA = P('M36,-124 C0,-112 -40,-84 -60,-40 C-64,-26 -58,-14 -46,-18 C-48,-34 -30,-54 -8,-66 C10,-78 28,-90 44,-100 Z');
    const lockB = P('M-18,-116 C-56,-106 -88,-72 -95,-28 C-97,-14 -90,-6 -80,-12 C-82,-34 -70,-58 -50,-74 Z');
    const lockC = P('M30,-124 C58,-110 82,-80 90,-38 C92,-24 84,-14 74,-20 C74,-44 62,-70 40,-92 Z');
    const lockD = P('M26,-108 C16,-82 14,-52 24,-24 C32,-44 36,-70 42,-98 Z');
    const tuft1 = P('M66,-128 C74,-142 86,-150 100,-150 C94,-142 92,-132 92,-120 Z');
    const tuft2 = P('M104,-84 C116,-88 126,-84 132,-72 C122,-72 114,-66 110,-56 Z');
    const tuft3 = P('M-100,-84 C-110,-82 -116,-74 -117,-64 C-111,-68 -106,-69 -100,-67 Z');
    union(ctx, [cap, lockA, lockB, lockC, lockD, tuft1, tuft2, tuft3].map((p) => ({ p, fill: MAL.hair })), lw);
    clipDo(ctx, cap, () => {
      ctx.fillStyle = MAL.hairHi;
      ctx.fill(P('M-74,-92 C-56,-112 -30,-120 -8,-120 C-28,-110 -46,-98 -56,-80 Z'));
      ctx.fill(P('M52,-114 C68,-106 80,-94 86,-80 C76,-90 64,-98 48,-104 Z'));
    });
    clipDo(ctx, lockA, () => { ctx.fillStyle = MAL.hairHi; ctx.fill(P('M-6,-92 C-24,-80 -40,-62 -48,-40 C-36,-56 -22,-70 -2,-82 Z')); });
    for (const d of ['M36,-124 C0,-112 -40,-84 -60,-40', 'M-46,-18 C-48,-34 -30,-54 -8,-66 C4,-74 14,-82 24,-90',
      'M-80,-12 C-82,-34 -70,-58 -50,-74', 'M74,-20 C74,-44 62,-70 40,-92', 'M24,-24 C32,-44 36,-70 42,-98',
      'M96,-60 C104,-36 102,-10 96,10']) line(ctx, d, 2.6, '#6a6884', .8);
    // brows: flat, thick, a little raised (mild surprise); near brow slightly higher
    const by = c.eyeY - 29;
    line(ctx, `M${g.ex[0] + 17},${by + 1} Q${g.ex[0]},${by - 5} ${g.ex[0] - 19},${by - 1}`, 7.5, MAL.brow);
    line(ctx, `M${g.ex[1] - 18},${by - 2} Q${g.ex[1] + 2},${by - 9} ${g.ex[1] + 22},${by - 3}`, 7.5, MAL.brow);
  });
}

// ---------------------------------------------------------------- bodies
const CARD = { base: '#fbf0db', sh: '#ecd6b4', line: '#d9bd94', top: '#fffdf9' };
const HOOD = { base: '#c6cad3', sh: '#a6abb9', line: '#8f94a3', tee: '#fffdf9' };
const BOX = { front: '#dcae74', top: '#ecc892', sh: '#c4945a', tape: '#f4e4bf' };

function tube(pts, round) {                             // polyline spine for a sleeve; inner joints rounded
  const r = round === undefined ? .32 : round, L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let d = `M${pts[0]}`;
  for (let i = 1; i < pts.length - 1; i++) { const a = L(pts[i], pts[i - 1], r), b = L(pts[i], pts[i + 1], r); d += ` L${a} Q${pts[i]} ${b}`; }
  return P(d + ` L${pts[pts.length - 1]}`);
}
function clipBelow(ctx, a, b, off) {                    // clip to the half-plane on the lower side of line a-b (shifted up by off)
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
  let nx = -uy, ny = ux; if (ny > 0) { nx = -nx; ny = -ny; }
  const p = [a[0] + nx * off, a[1] + ny * off];
  ctx.beginPath(); ctx.moveTo(p[0] - ux * 3000, p[1] - uy * 3000); ctx.lineTo(p[0] + ux * 3000, p[1] + uy * 3000);
  ctx.lineTo(p[0] + ux * 3000, 6000); ctx.lineTo(p[0] - ux * 3000, 6000); ctx.closePath(); ctx.clip();
}
function hand(ctx, x, y, ang, s, skin, skinSh) {      // simplified sleeve-paw hand: mitt + finger grooves
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const p = P('M-10,-25 L28,-27 C38,-29 50,-26 50,-19 C50,-14 45,-12 41,-12 C50,-12 56,-8 55,-2 C54,4 47,5 42,4 C50,6 53,11 51,16 C49,21 43,21 38,19 C43,22 43,28 37,29 C30,30 20,28 -10,27 Z');
  fs(ctx, p, skin, LW / s);
  for (const [x, y] of [[41, -12], [42, 4], [38, 19]]) line(ctx, `M${x},${y} L${x - 15},${y + 1}`, 3 / s, INK, .8);
  ctx.restore();
}
function cuffRibs(ctx, x, y, ang, w, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  for (const dx of [-20, -9]) line(ctx, `M${dx},${-w / 2 + 6} Q${dx + 5},0 ${dx},${w / 2 - 6}`, 3, color, .9);
  ctx.restore();
}
function parcel(ctx, x, y, w, h, rot) {                // kraft parcel box, front + top face
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const d = 40, k = .9;
  const top = P(`M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2 * k},${-h / 2 - d} L${-w / 2 * k},${-h / 2 - d} Z`);
  const front = rr(-w / 2, -h / 2, w, h, 6);
  union(ctx, [{ p: top, fill: BOX.top }, { p: front, fill: BOX.front }]);
  line(ctx, `M${-w / 2},${-h / 2} L${w / 2},${-h / 2}`, 4);
  // tape across the top flap seam and down the front
  ctx.fillStyle = BOX.tape;
  ctx.fill(P(`M-22,${-h / 2} L22,${-h / 2} L20,${-h / 2 - d} L-20,${-h / 2 - d} Z`));
  ctx.fill(P(`M-22,${-h / 2} L22,${-h / 2} L22,${-h / 2 + 50} L14,${-h / 2 + 44} L6,${-h / 2 + 50} L-2,${-h / 2 + 44} L-10,${-h / 2 + 50} L-18,${-h / 2 + 44} L-22,${-h / 2 + 50} Z`));
  line(ctx, `M${-w / 2 * .95},${-h / 2 - d / 2} L${w / 2 * .95},${-h / 2 - d / 2}`, 2.5, BOX.sh, .9);
  clipDo(ctx, front, () => { ctx.fillStyle = BOX.sh; ctx.globalAlpha = .55; ctx.fillRect(w / 2 - 34, -h / 2, 40, h); ctx.fillRect(-w / 2, h / 2 - 26, w, 30); });
  // blank shipping label (no brand)
  fs(ctx, rr(w / 2 - 104, -h / 2 + 22, 78, 50, 5), '#fffaf0', 3);
  for (let i = 0; i < 3; i++) line(ctx, `M${w / 2 - 94},${-h / 2 + 36 + i * 11} h${i === 2 ? 34 : 56}`, 3, '#c9b9a4');
  ctx.restore();
}

function heroineBody(ctx, c) {
  const nx = c.hx - 6, y0 = c.hy;
  // neck + chest skin
  const neck = P(`M${nx - 34},${y0 + 90} L${nx - 38},${y0 + 190} Q${nx},${y0 + 250} ${nx + 38},${y0 + 190} L${nx + 34},${y0 + 90} Z`);
  fs(ctx, neck, FEM.skin);
  clipDo(ctx, neck, () => ell(ctx, c.hx + 6, y0 + 142, 62, 36, FEM.skinSh));
  // white top with round neckline
  const top = P(`M${nx - 84},${y0 + 178} L${nx - 42},${y0 + 184} Q${nx},${y0 + 236} ${nx + 42},${y0 + 184} L${nx + 84},${y0 + 178} L${nx + 70},${y0 + 360} L${nx - 70},${y0 + 360} Z`);
  fs(ctx, top, CARD.top, 0);
  line(ctx, `M${nx - 42},${y0 + 184} Q${nx},${y0 + 236} ${nx + 42},${y0 + 184}`, 4.5);
  // cardigan body + arms as one silhouette
  const body = P(`M${nx - 46},${y0 + 176} C${nx - 96},${y0 + 182} ${nx - 148},${y0 + 192} ${nx - 164},${y0 + 236}
     L${nx - 158},${y0 + 600} L${nx - 176},${H + 80} L${nx + 176},${H + 80} L${nx + 158},${y0 + 600} L${nx + 164},${y0 + 240} C${nx + 148},${y0 + 196} ${nx + 96},${y0 + 186} ${nx + 46},${y0 + 178}
     L${nx + 12},${y0 + 350} L${nx - 12},${y0 + 350} Z`);
  const bx = nx - 2, by = y0 + 400;
  const SW = 66;
  const aR = { S: [nx + 132, y0 + 252], E: [nx + 172, y0 + 462], Hd: [bx + 52, y0 + 426] };
  const aL = { S: [nx - 132, y0 + 250], E: [nx - 176, y0 + 508], Hd: [bx - 44, y0 + 490] };
  const tR = tube([aR.S, aR.E, aR.Hd]), tL = tube([aL.S, aL.E, aL.Hd]);
  union(ctx, [{ p: body, fill: CARD.base }, { p: tR, fill: CARD.base, tube: SW }, { p: tL, fill: CARD.base, tube: SW }]);
  clipDo(ctx, body, () => {
    ctx.fillStyle = CARD.sh;
    ctx.fill(P(`M${nx + 110},${y0 + 170} L${nx + 220},${y0 + 170} L${nx + 220},${H} L${nx + 104},${H} Z`));
    ctx.fill(P(`M${nx - 60},${y0 + 170} L${nx - 100},${y0 + 170} L${nx - 34},${y0 + 350} L${nx - 14},${y0 + 350} Z`));
    ctx.fill(P(`M${nx + 60},${y0 + 170} L${nx + 100},${y0 + 170} L${nx + 34},${y0 + 350} L${nx + 14},${y0 + 350} Z`));
  });
  line(ctx, `M${nx - 46},${y0 + 176} L${nx - 12},${y0 + 350}`, 4.5); line(ctx, `M${nx + 46},${y0 + 178} L${nx + 12},${y0 + 350}`, 4.5);
  line(ctx, `M${nx - 12},${y0 + 350} L${nx - 14},${H}`, 4); line(ctx, `M${nx + 12},${y0 + 350} L${nx + 14},${H}`, 3, CARD.line);
  for (const yy of [y0 + 600, y0 + 700, y0 + 800]) fs(ctx, rr(nx - 10, yy, 20, 20, 10), '#e9cda2', 3.5);
  // parcel hugged to the chest
  parcel(ctx, bx, by, 226, 226, -0.035);
  // forearms + hands wrap over the box (second pass of each arm, clipped along its forearm)
  for (const [A, t, crease] of [[aR, tR, -1], [aL, tL, 1]]) {
    const a = Math.atan2(A.Hd[1] - A.E[1], A.Hd[0] - A.E[0]);
    ctx.save(); clipBelow(ctx, A.E, A.Hd, SW / 2 + LW - 1);
    hand(ctx, A.Hd[0] + Math.cos(a) * 20, A.Hd[1] + Math.sin(a) * 20, a, .86, FEM.skin);
    line(ctx, t, SW + LW * 2, INK);
    ctx.restore(); ctx.save(); clipBelow(ctx, A.E, A.Hd, SW / 2 + 1.5);    // fill pass a hair wider: no clip seam
    line(ctx, t, SW, CARD.base);
    cuffRibs(ctx, A.Hd[0], A.Hd[1], a + Math.PI, SW, CARD.line);
    line(ctx, `M${A.E[0] + crease * 22},${A.E[1] - 26} q${crease * 12},10 ${crease * 30},6`, 3, CARD.line);
    ctx.restore();
  }
}

function heroBody(ctx, c) {
  const nx = c.hx + 12, ny = c.hy + 208;
  // hood bunched behind the neck
  fs(ctx, P(`M${nx - 128},${ny + 40} C${nx - 140},${ny - 44} ${nx - 70},${ny - 70} ${nx - 4},${ny - 70} C${nx + 62},${ny - 70} ${nx + 136},${ny - 44} ${nx + 124},${ny + 40} Z`), HOOD.sh);
  // neck
  const neck = P(`M${c.hx - 44},${c.hy + 96} L${nx - 52},${ny + 20} Q${nx},${ny + 70} ${nx + 52},${ny + 20} L${c.hx + 56},${c.hy + 96} Z`);
  fs(ctx, neck, MAL.skin);
  clipDo(ctx, neck, () => ell(ctx, c.hx + 14, c.hy + 150, 80, 42, MAL.skinSh));
  // inner tee
  fs(ctx, P(`M${nx - 60},${ny + 4} Q${nx},${ny + 58} ${nx + 60},${ny + 4} L${nx + 50},${ny + 120} L${nx - 50},${ny + 120} Z`), HOOD.tee, 4);
  // hoodie body + arms
  const body = P(`M${nx - 62},${ny - 6} C${nx - 124},${ny + 4} ${nx - 206},${ny + 20} ${nx - 238},${ny + 72}
     L${nx - 228},${H + 80} L${nx + 250},${H + 80} L${nx + 248},${ny + 52} C${nx + 214},${ny + 4} ${nx + 124},${ny - 10} ${nx + 62},${ny - 14}
     C${nx + 56},${ny + 30} ${nx + 30},${ny + 76} ${nx + 2},${ny + 96} C${nx - 28},${ny + 76} ${nx - 54},${ny + 34} ${nx - 62},${ny - 6} Z`);
  const aL = [[nx - 192, ny + 92], [nx - 228, ny + 420], [nx - 140, ny + 690]];
  const aR = [[nx + 204, ny + 78], [nx + 262, ny + 380], [nx + 300, ny + 700]];
  const tL = tube(aL), tR = tube(aR);
  union(ctx, [{ p: body, fill: HOOD.base }, { p: tL, fill: HOOD.base, tube: 108 }, { p: tR, fill: HOOD.base, tube: 108 }]);
  clipDo(ctx, body, () => {
    ctx.fillStyle = HOOD.sh;
    ctx.fill(P(`M${nx + 110},${ny - 30} L${nx + 300},${ny - 30} L${nx + 300},${H} L${nx + 170},${H} Z`));
    ctx.fill(P(`M${nx - 70},${ny - 20} L${nx + 70},${ny - 20} L${nx + 40},${ny + 120} L${nx + 2},${ny + 150} L${nx - 40},${ny + 120} Z`));
  });
  // hood rim around the neckline
  const rimL = P(`M${nx - 62},${ny - 6} C${nx - 54},${ny + 34} ${nx - 28},${ny + 76} ${nx + 2},${ny + 96}`);
  const rimR = P(`M${nx + 62},${ny - 14} C${nx + 56},${ny + 30} ${nx + 30},${ny + 76} ${nx + 2},${ny + 96}`);
  line(ctx, rimL, 5); line(ctx, rimR, 5);
  line(ctx, `M${nx - 98},${ny + 4} C${nx - 86},${ny + 56} ${nx - 46},${ny + 110} ${nx - 6},${ny + 130}`, 3.5, HOOD.line);
  line(ctx, `M${nx + 100},${ny - 4} C${nx + 88},${ny + 52} ${nx + 50},${ny + 108} ${nx + 12},${ny + 130}`, 3.5, HOOD.line);
  // drawstrings
  for (const [sx, ex, len] of [[nx - 30, nx - 40, 250], [nx + 34, nx + 30, 220]]) {
    line(ctx, `M${sx},${ny + 92} C${sx - 6},${ny + 160} ${ex + 8},${ny + 92 + len - 60} ${ex},${ny + 92 + len}`, 11, INK);
    line(ctx, `M${sx},${ny + 92} C${sx - 6},${ny + 160} ${ex + 8},${ny + 92 + len - 60} ${ex},${ny + 92 + len}`, 5, '#f6f3ee');
    fs(ctx, rr(ex - 6, ny + 92 + len - 4, 12, 26, 4), '#8f94a3', 3);
  }
  // near arm again so its inner edge reads against the torso
  ctx.save(); ctx.beginPath(); ctx.rect(0, ny + 170, W, H); ctx.clip();
  union(ctx, [{ p: tL, fill: HOOD.base, tube: 108 }]);
  line(ctx, tube([[aL[0][0] - 36, aL[0][1] + 70], [aL[1][0] - 36, aL[1][1]], [aL[2][0] - 26, aL[2][1] - 60]]), 11, '#dfe3ea', .45);
  line(ctx, `M${aL[1][0] + 40},${aL[1][1] - 40} q-18,22 -46,22`, 3.5, HOOD.line);
  ctx.restore();
  // kangaroo pocket (hand tucked in)
  const pk = P(`M${nx - 120},${ny + 660} Q${nx},${ny + 650} ${nx + 130},${ny + 660} L${nx + 186},${ny + 860} L${nx + 186},${H + 80} L${nx - 176},${H + 80} L${nx - 176},${ny + 860} Z`);
  fs(ctx, pk, HOOD.base, 5);
  line(ctx, `M${nx - 112},${ny + 676} L${nx - 164},${ny + 860}`, 8, HOOD.line, .7);
}

// ---------------------------------------------------------------- background
function hallway(ctx) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fbe6c9'); g.addColorStop(.6, '#f6d6ae'); g.addColorStop(1, '#eec39a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // ceiling strip + moulding
  ctx.fillStyle = '#fdf2e0'; ctx.fillRect(0, 0, W, 132);
  line(ctx, `M0,132 H${W}`, 5, '#d9b48c'); line(ctx, `M0,146 H${W}`, 2.5, '#e6c7a2');
  // wainscot
  ctx.fillStyle = '#e9c49c'; ctx.fillRect(0, 1210, W, H);
  ctx.fillStyle = '#f7e2c6'; ctx.fillRect(0, 1196, W, 18);
  line(ctx, `M0,1196 H${W}`, 3, '#c99e76'); line(ctx, `M0,1214 H${W}`, 3, '#c99e76');
  // evening sun from a window down the corridor (left)
  g = ctx.createLinearGradient(0, 0, 700, 0);
  g.addColorStop(0, 'rgba(255,196,110,.55)'); g.addColorStop(1, 'rgba(255,196,110,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // ---- left door (closed)
  const DO = { frame: '#fbf2e3', slab: '#8db2a8', slabSh: '#78a097', slabHi: '#a9c9bf' };
  fs(ctx, P('M34,256 H478 V1960 H34 Z'), DO.frame, 5);
  fs(ctx, P('M58,280 H454 V1960 H58 Z'), DO.slab, 4);
  for (const [x, y, w, h] of [[98, 330, 316, 520], [98, 900, 316, 700]]) {
    fs(ctx, rr(x, y, w, h, 8), DO.slabSh, 0);
    fs(ctx, rr(x + 10, y + 10, w - 20, h - 20, 6), DO.slab, 0);
    line(ctx, rr(x, y, w, h, 8), 3, '#6c958c'); line(ctx, `M${x + 12},${y + h - 10} H${x + w - 12}`, 3, DO.slabHi, .8);
  }
  // digital door lock + lever (generic)
  fs(ctx, rr(70, 946, 42, 120, 12), '#5b5f69', 4);
  ell(ctx, 91, 972, 9, 9, '#ffd98a'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ell(ctx, 83 + j * 16, 998 + i * 16, 3.2, 3.2, '#aab0bd');
  fs(ctx, rr(74, 1084, 34, 60, 10), '#c9ccd3', 4); fs(ctx, rr(84, 1100, 78, 18, 9), '#dfe2e7', 4);
  // window-light patches falling across door and wall
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,214,130,.7)';
  ctx.fill(P('M0,560 L230,640 L230,1030 L0,950 Z')); ctx.fill(P('M250,647 L520,741 L520,1131 L250,1037 Z'));
  ctx.restore();
  ctx.save(); ctx.globalAlpha = .13; ctx.fillStyle = '#fff1c4';
  ctx.fill(P('M0,560 L230,640 L230,1030 L0,950 Z')); ctx.fill(P('M250,647 L520,741 L520,1131 L250,1037 Z'));
  ctx.restore();

  // ---- right doorway (open): warm lit entry inside
  fs(ctx, P('M604,256 H1030 V1960 H604 Z'), DO.frame, 5);
  const inside = P('M628,280 H1030 V1960 H628 Z');
  g = ctx.createRadialGradient(830, 520, 40, 830, 700, 900);
  g.addColorStop(0, '#fff3c9'); g.addColorStop(.35, '#ffdf9f'); g.addColorStop(1, '#e9a86f');
  fs(ctx, inside, g, 4);
  clipDo(ctx, inside, () => {
    ctx.fillStyle = 'rgba(214,140,88,.35)'; ctx.fillRect(628, 280, 26, 1700);            // jamb depth
    ctx.fillStyle = 'rgba(255,250,225,.7)'; ctx.beginPath(); ctx.ellipse(840, 300, 120, 26, 0, 0, 7); ctx.fill(); // ceiling light
    // shelf + little plant + frame on the entry wall (soft, low contrast)
    ctx.globalAlpha = .55;
    fs(ctx, rr(900, 640, 150, 14, 4), '#d69a66', 0);
    fs(ctx, rr(930, 590, 36, 50, 8), '#e9b784', 0);
    ell(ctx, 938, 566, 18, 30, '#b9c78a', -0.5); ell(ctx, 960, 560, 16, 32, '#a9bb7c', 0.4);
    fs(ctx, rr(676, 430, 0, 0, 0), null, 0);
    ctx.globalAlpha = 1;
  });
  // number plates above the doors (no brands)
  ctx.font = '700 28px PretendardB, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [x, t] of [[256, '302'], [816, '301']]) {
    fs(ctx, rr(x - 50, 204, 100, 40, 9), '#fffaf0', 3.5); ctx.fillStyle = INK; ctx.fillText(t, x, 225);
  }
  // wall lamp between the doors
  g = ctx.createRadialGradient(541, 318, 6, 541, 318, 210);
  g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(.35, 'rgba(255,220,140,.4)'); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g; ctx.fillRect(330, 110, 420, 440);
  fs(ctx, rr(523, 246, 36, 22, 8), '#b98a5e', 3.5);
  line(ctx, 'M541,268 V290', 12, INK); line(ctx, 'M541,268 V290', 6, '#c99a6c');
  const lg = ctx.createRadialGradient(532, 310, 4, 541, 322, 40); lg.addColorStop(0, '#fffdf0'); lg.addColorStop(1, '#ffe6a6');
  const globe = new Path2D(); globe.ellipse(541, 324, 36, 36, 0, 0, 7); fs(ctx, globe, lg, 4);
}
function doorSlab(ctx) {            // the hero's door, swung outward: seen edge-on at the right
  const p = P('M1004,256 L1100,196 L1100,1960 L1004,1960 Z');
  fs(ctx, p, '#6f978f', 5);
  line(ctx, 'M1022,300 L1022,1960', 3, '#8db2a8', .8);
  fs(ctx, P('M1004,256 L1018,248 L1018,1960 L1004,1960 Z'), '#55807a', 0);
  fs(ctx, rr(1034, 1060, 34, 96, 10), '#c9ccd3', 4); fs(ctx, rr(1040, 1096, 60, 18, 9), '#e3e6ea', 4);
}

// ---------------------------------------------------------------- lettering + fx
function bubble(ctx, o) {           // o: {x,y,rx,ry, tail:{bx,bw,tx,ty,bend}, lines, size, font, lh}
  const el = new Path2D(); el.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2);
  const t = o.tail, by = o.y + o.ry * .82;
  const tl = P(`M${t.bx - t.bw / 2},${by} Q${t.bx - t.bw * .1 + t.bend},${(by + t.ty) / 2} ${t.tx},${t.ty} Q${t.bx + t.bw * .5 + t.bend},${(by + t.ty) / 2} ${t.bx + t.bw / 2},${by} Z`);
  ctx.save(); ctx.translate(0, 8); ctx.globalAlpha = .13; ctx.fillStyle = '#7a4a2a'; ctx.fill(el); ctx.fill(tl); ctx.restore();
  union(ctx, [{ p: el, fill: '#fffefb' }, { p: tl, fill: '#fffefb' }], 4.5);
  ctx.fillStyle = '#3b2a22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${o.size}px ${o.font}`;
  const lh = o.lh || o.size * 1.3, y0 = o.y - (o.lines.length - 1) * lh / 2 + (o.dy || 0);
  o.lines.forEach((s, i) => ctx.fillText(s, o.x + (o.dx ? o.dx[i] || 0 : 0), y0 + i * lh));
}
function sfx(ctx, text, x, y, size, rot, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px BlackHan, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let cx = -size * .5 * (text.length - 1) * .98;
  for (let i = 0; i < text.length; i++) {
    ctx.save(); ctx.translate(cx, i % 2 ? 10 : -6); ctx.rotate(i % 2 ? .07 : -.06);
    ctx.strokeStyle = INK; ctx.lineWidth = 20; ctx.strokeText(text[i], 0, 0);
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 11; ctx.strokeText(text[i], 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text[i], 0, 0);
    ctx.restore(); cx += size * .98;
  }
  ctx.restore();
}
function sweat(ctx, x, y, s) {
  const p = P(`M${x},${y - 20 * s} C${x + 14 * s},${y} ${x + 14 * s},${y + 16 * s} ${x},${y + 18 * s} C${x - 14 * s},${y + 16 * s} ${x - 14 * s},${y} ${x},${y - 20 * s} Z`);
  fs(ctx, p, '#cfeeff', 3.5, '#5f9fc4'); ell(ctx, x - 4 * s, y + 6 * s, 3 * s, 5 * s, '#ffffff');
}
function sparkle(ctx, x, y, r, color, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.fill(P(`M${x},${y - r} Q${x + r * .18},${y - r * .18} ${x + r},${y} Q${x + r * .18},${y + r * .18} ${x},${y + r} Q${x - r * .18},${y + r * .18} ${x - r},${y} Q${x - r * .18},${y - r * .18} ${x},${y - r} Z`));
  ctx.restore();
}

function castShadow(ctx, drawFn, dx, dy, color, alpha) {
  const m = ctx.getTransform(), off = document.createElement('canvas'); off.width = ctx.canvas.width; off.height = ctx.canvas.height;
  const o = off.getContext('2d'); o.setTransform(m); drawFn(o);
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = color; o.fillRect(0, 0, off.width, off.height);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(off, dx * m.a, dy * m.d); ctx.restore();
}

// ---------------------------------------------------------------- the scene
const HEROINE = { hx: 292, hy: 938, r: 140, tilt: -4, turn: 0.5, chin: 106, jaw: 0, eyeY: 24, eyeSp: 44, look: [0.9, -0.7] };
const HERO = { hx: 780, hy: 668, r: 140, wide: 0.93, tilt: -3, turn: -0.5, chin: 128, jaw: 1, eyeY: 8, eyeSp: 43, look: [-0.9, 0.5] };

function drawHero(ctx, c) { heroBody(ctx, c); headM(ctx, c); hairM(ctx, c); }
function drawHeroine(ctx, c) { hairBackF(ctx, c); heroineBody(ctx, c); headF(ctx, c); hairFrontF(ctx, c); }

function drawScene(ctx) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  hallway(ctx);
  castShadow(ctx, (o) => drawHeroine(o, HEROINE), 30, 16, '#6a5a78', .2);
  drawHero(ctx, HERO);
  doorSlab(ctx);
  drawHeroine(ctx, HEROINE);
  // surprise ticks by the hero, sweat drop + sparkles by the heroine
  for (const [x1, y1, x2, y2] of [[640, 492, 622, 462], [612, 530, 584, 514], [668, 470, 662, 440]]) line(ctx, `M${x1},${y1} L${x2},${y2}`, 6, '#f2a04a');
  sweat(ctx, 478, 880, 1.25);
  sparkle(ctx, 540, 770, 20, '#fff6d0', .95); sparkle(ctx, 566, 818, 10, '#fff6d0', .9); sparkle(ctx, 508, 716, 8, '#fff6d0', .8);
  // evening grade: warm from the upper-left, a touch of dusk violet lower-right
  let g = ctx.createLinearGradient(0, 200, W, H - 200);
  g.addColorStop(0, 'rgba(255,170,90,.30)'); g.addColorStop(.55, 'rgba(255,190,140,.08)'); g.addColorStop(1, 'rgba(120,90,170,.26)');
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  g = ctx.createLinearGradient(0, 1500, 0, H); g.addColorStop(0, 'rgba(90,50,60,0)'); g.addColorStop(1, 'rgba(90,50,60,.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 1500, W, 420);
  // lettering last
  sfx(ctx, '덜컥', 912, 372, 86, 0.10, '#f0703f');
  bubble(ctx, { x: 296, y: 500, rx: 254, ry: 122, tail: { bx: 366, bw: 60, tx: 352, ty: 716, bend: 10 }, lines: ['저기…', '혹시 옆집이세요?'], size: 56, font: 'PretendardSB, sans-serif', lh: 76, dx: [-70, 0] });
  ctx.restore();
}

root.CASUAL = { W, H, INK, drawScene, parts: { head: { headF, headM, faceGeom }, eye, hair: { hairBackF, hairFrontF, hairM }, torso: { heroineBody, heroBody }, hand, parcel, bubble, sfx, hallway, doorSlab, sweat, sparkle }, cast: { HEROINE, HERO } };
})(typeof window !== 'undefined' ? window : globalThis);
