// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, text, measure, typeSub, roundRect, glow, godrays, motes,
  flash, camera, drift, FONT } = L;
const { K, T, mk, poly, canvasPiece, at } = window.KL;

// ---------------------------------------------------------------------------
// "검은 쓰레기봉투 안에, 액자 없는 그 그림."
// We are now inside the cavity behind the hatch (the zoom transition dives in from the opened door).
//  0.0   daylight from the opening spreads into the cavity, dust drifts in the beam
//  검은   a cold specular sweep runs across a crumpled black plastic bag
//  쓰레기봉투  the plastic crinkles (highlights shimmer, the bag settles); caption types "검은 비닐봉투"
//  안에   the bag's mouth opens; the dark interior, a faint warm glow
//  →     the unframed canvas slides up out of the bag, still in shadow, light finds its top edge
//  액자   a ghost of the ornate gold frame draws itself around the canvas
//  없는   the ghost frame breaks into four bars and gold dust that fall away; caption adds "· 액자 없는 캔버스"
//  그     anticipation: the camera eases back, the cavity dims, a gold rim builds behind the canvas (reverse cymbal)
//  그림   REVEAL (braam + shimmer): warm bloom around the painting, the painting straightens and rises to centre, the bag drops away,
//         gold rays + mosaic sparks, a varnish sheen sweeps across; it settles at (540,850) scale .9,
//         exactly where the next scene ("verdict") starts, so the crossfade is seamless.
// ---------------------------------------------------------------------------
const BAG = { x: 540, y: 990, w: 600, h: 500 };     // body bottom at y ≈ 1250 (keeps the bag out of the subtitle band)
const END = { x: 540, y: 850, s: .9 };          // = verdict's canvasPiece(540, 850, .9)
let S = null;

function times(info, d) {
  const tK = at(info, '검은', .03), tB = at(info, '쓰레기봉투', .17), tA = at(info, '안에', .36), tF = at(info, '액자', .5);
  const tN = at(info, '없는', .62), tG = at(info, '그', .71), tP = at(info, '그림', .78);
  return { d, tK, tB, tA, tF, tN, tG, tP };
}

// ---------- baked cavity (one-point perspective niche behind the hatch) ----------
function makeCavity() {
  const X0 = -100, Y0 = -100, CW = 1280, CH = 2120;
  const [c, x] = mk(CW, CH); x.translate(-X0, -Y0);
  const R = rng(1203), vp = [540, 870];
  const BW = { l: 286, r: 794, t: 600, b: 1118 };
  x.fillStyle = '#0b0907'; x.fillRect(X0, Y0, CW, CH);
  const face = (pts, c0, c1, gx0, gy0, gx1, gy1) => { const g = x.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, c0); g.addColorStop(1, c1); poly(x, pts, null); x.fillStyle = g; x.fill(); };
  face([[X0, Y0], [X0 + CW, Y0], [BW.r, BW.t], [BW.l, BW.t]], '#16130f', '#0c0a08', 0, Y0, 0, BW.t);                 // ceiling
  face([[X0, Y0], [BW.l, BW.t], [BW.l, BW.b], [X0, Y0 + CH]], '#1c1814', '#0d0b09', X0, 0, BW.l, 0);                 // left wall
  face([[X0 + CW, Y0], [X0 + CW, Y0 + CH], [BW.r, BW.b], [BW.r, BW.t]], '#120f0c', '#0a0807', X0 + CW, 0, BW.r, 0);  // right wall
  face([[BW.l, BW.b], [BW.r, BW.b], [X0 + CW, Y0 + CH], [X0, Y0 + CH]], '#14110e', '#2a241e', 0, BW.b, 0, Y0 + CH);   // floor (lit toward us)
  face([[BW.l, BW.t], [BW.r, BW.t], [BW.r, BW.b], [BW.l, BW.b]], '#110e0b', '#0b0907', 0, BW.t, 0, BW.b);              // back wall
  // brick courses on the side walls, converging to the vanishing point
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3;
  for (let k = 1; k < 9; k++) {
    const yy = lerp(BW.t, BW.b, k / 9);
    for (const [ex, sx] of [[X0, BW.l], [X0 + CW, BW.r]]) { const ey = vp[1] + (yy - vp[1]) * (ex - vp[0]) / (sx - vp[0]); x.beginPath(); x.moveTo(sx, yy); x.lineTo(ex, ey); x.stroke(); }
  }
  for (let k = 0; k < 7; k++) { // vertical joints along the side walls (perspective)
    const f = Math.pow(k / 7, 1.6), xl = lerp(BW.l, X0, f), xr = lerp(BW.r, X0 + CW, f);
    for (const xx of [xl, xr]) { const top = vp[1] + (BW.t - vp[1]) * (xx - vp[0]) / ((xx < 540 ? BW.l : BW.r) - vp[0]), bot = vp[1] + (BW.b - vp[1]) * (xx - vp[0]) / ((xx < 540 ? BW.l : BW.r) - vp[0]); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(xx, top); x.lineTo(xx, bot); x.stroke(); }
  }
  // back wall: rough plaster, cracks
  for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,235,210' : '0,0,0'},${R() * .05})`; x.fillRect(BW.l + R() * (BW.r - BW.l), BW.t + R() * (BW.b - BW.t), 2 + R() * 3, 2 + R() * 3); }
  x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 2;
  for (let k = 0; k < 4; k++) { let px = BW.l + R() * 500, py = BW.t + R() * 200; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 9; j++) { px += (R() - .5) * 60; py += 20 + R() * 30; x.lineTo(px, py); } x.stroke(); }
  // grit over every face
  for (let i = 0; i < 9000; i++) { const px = X0 + R() * CW, py = Y0 + R() * CH; x.fillStyle = `rgba(${R() < .5 ? '255,240,220' : '0,0,0'},${R() * .06})`; x.fillRect(px, py, 2, 2); }
  // floor debris: dried leaves, grit, a few stones
  const dl = T.leaf[1], [lc, lx] = mk(dl.width, dl.height); lx.filter = 'sepia(1) brightness(.55) saturate(.6)'; lx.drawImage(dl, 0, 0); lx.filter = 'none';
  for (let i = 0; i < 16; i++) { const fx = lerp(BW.l - 60, BW.r + 60, R()) + (R() - .5) * 600, fy = BW.b + 60 + R() * 820; x.save(); x.translate(fx, fy); x.scale(1, .5); x.rotate(R() * 6.28); const s = .3 + R() * .35 * (1 + (fy - BW.b) / 800); x.scale(s, s); x.globalAlpha = .7; x.drawImage(lc, -lc.width / 2, -lc.height / 2); x.restore(); }
  for (let i = 0; i < 30; i++) { const fx = 120 + R() * 840, fy = BW.b + 40 + R() * 860, r = (4 + R() * 12) * (1 + (fy - BW.b) / 700); x.fillStyle = `rgb(${34 + R() * 20},${30 + R() * 16},${26 + R() * 14})`; x.beginPath(); x.ellipse(fx, fy, r, r * .6, R(), 0, 7); x.fill(); x.fillStyle = 'rgba(255,240,220,.08)'; x.beginPath(); x.ellipse(fx - r * .3, fy - r * .25, r * .4, r * .2, 0, 0, 7); x.fill(); }
  // dust lying on the floor + edges
  const fg = x.createLinearGradient(0, BW.b, 0, BW.b + 300); fg.addColorStop(0, 'rgba(160,150,135,.10)'); fg.addColorStop(1, 'rgba(160,150,135,0)'); poly(x, [[BW.l, BW.b], [BW.r, BW.b], [X0 + CW, Y0 + CH], [X0, Y0 + CH]], null); x.fillStyle = fg; x.fill();
  // daylight falling in from the opening behind the camera
  x.save(); x.globalCompositeOperation = 'screen'; const dg = x.createRadialGradient(540, 1230, 60, 540, 1120, 820); dg.addColorStop(0, 'rgba(150,170,200,.22)'); dg.addColorStop(1, 'rgba(150,170,200,0)'); x.fillStyle = dg; x.fillRect(X0, 200, CW, 1900); x.restore();
  // edge darkening
  const vg = x.createRadialGradient(540, 960, 300, 540, 960, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = vg; x.fillRect(X0, Y0, CW, CH);
  return { c, X0, Y0 };
}
function makeSpark() { const [c, x] = mk(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(.25, 'rgba(255,205,110,.55)'); g.addColorStop(1, 'rgba(255,190,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; }
// reveal backdrop + ray star, baked at half resolution (soft gradients upscale cleanly)
function makeReveal() {
  // screen-space backdrop for the reveal, drawn 1:1 (cheap)
  const [c, x] = mk(W, H);
  x.fillStyle = 'rgb(4,13,10)'; x.fillRect(0, 0, W, H);
  glow(x, 540, 860, 1000, '#2f8a5e', .32); glow(x, 540, 860, 640, '#d9a93a', .32);
  const vg = x.createRadialGradient(540, 900, 500, 540, 900, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  return { bg: c };
}
// thin rotating light rays (only the ray pixels are touched)
function rays(ctx, cx, cy, rot, a, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const an = rot + i / 14 * 6.283 + hash(i * 5) * .2, wd = .03 + hash(i * 3) * .045, len = 760 + hash(i * 7) * 520, al = a * (.45 + .55 * (.5 + .5 * noise1(t * .8 + i * 3.1, i)));
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(an) * len, cy + Math.sin(an) * len); g.addColorStop(0, rgba('#ffd98a', al)); g.addColorStop(1, 'rgba(255,217,138,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an - wd) * len, cy + Math.sin(an - wd) * len); ctx.lineTo(cx + Math.cos(an + wd) * len, cy + Math.sin(an + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function makeShadowRect() { const [c, x] = mk(820, 920); x.filter = 'blur(24px)'; x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(101, 101, 618, 718); x.filter = 'none'; return c; }
// KL.canvasPiece without the per-frame shadowBlur (pre-blurred shadow sprite instead)
function canvasFX(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.drawImage(S.shadowRect, -410, -460 + 20);
  ctx.fillStyle = '#6a5236'; ctx.fillRect(-309, -359, 618, 718); ctx.fillStyle = '#cbbd9e'; ctx.fillRect(-304, -354, 608, 708);
  ctx.drawImage(T.portrait, -300, -350);
  ctx.restore();
}
function init() { S = { cav: makeCavity(), spark: makeSpark(), plastic: makePlastic(), rev: makeReveal(), shadowRect: makeShadowRect() }; }

// ---------- the bag ----------
// A crumpled black bin bag lying in the niche: lumpy body, a loose wavy mouth, a stiff plastic flap,
// long folds fanning down from the mouth and two straight ridges where the canvas edges press the plastic.
const LIPX = .3;
function lipX(u, b) { return u * LIPX * b.w; }
function lipY(u, m, front, t, b) {
  const env = 1 - u * u, rf = Math.sin(u * 13 + (front ? 0 : 1.7)) * 9 + Math.sin(u * 31 + 2) * 4;
  const corner = -.07 * b.h * Math.pow(Math.abs(u), 3), flut = Math.sin(t * 4.2 + u * 7) * 2.2;   // gathered corners, air flutter
  return front ? -.41 * b.h + m * .2 * b.h * env + rf * (1 - .35 * m) + Math.sin(t * 3 + u * 4) * 2.5 * m + .03 * b.h * u + corner + flut
               : -.44 * b.h - m * .055 * b.h * env + rf * .8 + .02 * b.h * u + corner * 1.2 + flut * .7;
}
function outline(b, m, t, front) {
  const { w, h } = b, pts = [];
  const body = [[.4, -.37], [.49, -.2], [.535, .04], [.5, .28], [.4, .45], [.14, .52], [-.15, .515], [-.4, .455], [-.51, .27], [-.545, .03], [-.49, -.19], [-.39, -.36]];
  pts.push([lipX(1, b), lipY(1, m, front, t, b)]);
  for (const [u, v] of body) pts.push([u * w, v * h]);
  for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; pts.push([lipX(u, b), lipY(u, m, front, t, b)]); }
  return pts;
}
function trace(ctx, pts) { ctx.beginPath(); window.KL.smooth(ctx, pts, true, .55); }
function bagPath(ctx, b, m, t) { trace(ctx, outline(b, m, t, false)); }
function frontPath(ctx, b, m, t) { trace(ctx, outline(b, m, t, true)); }
// crumpled-plastic shading, baked once: a crease heightfield lit from three directions (left / centre / right);
// the light sweep and the crinkle crossfade between them.
function makePlastic() {
  // folds are rasterised as soft, curved, tapered strokes (ridges on one layer, valleys on another) so the
  // specular reads as glossy plastic folds rather than straight sticks
  const TW = 360, TH = 290, R = rng(9071), hf = new Float32Array(TW * TH);
  const layer = () => { const [c, x] = mk(TW, TH); x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.globalCompositeOperation = 'lighter'; x.lineCap = 'butt'; return x; };
  const ridge = layer(), valley = layer();
  for (let i = 0; i < 46; i++) {
    let x0, y0, ang, len, w, bend;
    if (i < 14) { x0 = TW * (.3 + R() * .4); y0 = TH * R() * .05; ang = Math.PI / 2 + (x0 / TW - .5) * 1.6 + (R() - .5) * .4; len = 120 + R() * 150; w = 7 + R() * 9; bend = (R() - .5) * .8; }   // long folds fanning from the gathered mouth
    else { x0 = R() * TW; y0 = R() * TH; ang = Math.PI / 2 + (R() - .5) * 2.6; len = 50 + R() * 100; w = 5 + R() * 8; bend = (R() < .5 ? -1 : 1) * (.3 + R() * .5); }   // sagging wrinkles, curved
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    const qx = (x0 + x1) / 2 - Math.sin(ang) * len * bend * .5, qy = (y0 + y1) / 2 + Math.cos(ang) * len * bend * .5;
    const x = R() < .6 ? ridge : valley, a = .45 + R() * .5;
    const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.filter = `blur(${(w * .42).toFixed(1)}px)`; x.strokeStyle = g; x.lineWidth = w;
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(qx, qy, x1, y1); x.stroke();
  }
  const rd = ridge.getImageData(0, 0, TW, TH).data, vd = valley.getImageData(0, 0, TW, TH).data;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const i = y * TW + x;
    hf[i] = 9 * Math.sin(x * .021 + 1) * Math.sin(y * .026 + .5) + 5 * Math.sin(x * .05 + y * .03) + 16 * (rd[i * 4] - vd[i * 4]) / 255;
  }
  return [[-.75, -.55, .5], [0, -.75, .62], [.7, -.5, .5]].map(([lx, ly, lz]) => {
    const ln = Math.hypot(lx, ly, lz), Lx = lx / ln, Ly = ly / ln, Lz = lz / ln;
    let hx = Lx, hy = Ly, hz = Lz + 1; const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn;
    const [c, x] = mk(TW, TH), id = x.createImageData(TW, TH);
    for (let y = 0; y < TH; y++) for (let X = 0; X < TW; X++) {
      const i = y * TW + X, gx = (hf[y * TW + Math.min(TW - 1, X + 1)] - hf[y * TW + Math.max(0, X - 1)]) * .5, gy = (hf[Math.min(TH - 1, y + 1) * TW + X] - hf[Math.max(0, y - 1) * TW + X]) * .5;
      let nx = -gx * .55, ny = -gy * .55, nz = 1; const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
      const dif = Math.max(0, nx * Lx + ny * Ly + nz * Lz), sp = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 46), sp2 = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 8);
      id.data[i * 4] = Math.min(255, 7 + dif * 13 + sp2 * 16 + sp * 215); id.data[i * 4 + 1] = Math.min(255, 7 + dif * 14 + sp2 * 18 + sp * 224); id.data[i * 4 + 2] = Math.min(255, 9 + dif * 17 + sp2 * 22 + sp * 240); id.data[i * 4 + 3] = 255;
    }
    x.putImageData(id, 0, 0); const [c2, x2] = mk(TW, TH); x2.filter = 'blur(.9px)'; x2.drawImage(c, 0, 0); x2.filter = 'none'; return c2;
  });
}
function bagFront(ctx, b, m, t, o) {
  const { w, h } = b, lit = o.lit, ga = ctx.globalAlpha;
  ctx.save(); frontPath(ctx, b, m, t); ctx.fillStyle = '#060607'; ctx.fill(); ctx.clip();
  // crossfade the three lighting bakes: the sweep moves the light left→right; crinkle makes it flicker
  const k = clamp((o.sweep + 1) / 2) * 2 + o.crinkle * .35 * noise1(t * 9, 7);
  const wts = [Math.max(0, 1 - Math.abs(k - 0)), Math.max(0, 1 - Math.abs(k - 1)), Math.max(0, 1 - Math.abs(k - 2))];
  const jx = o.crinkle * noise1(t * 11, 3) * 5, jy = o.crinkle * noise1(t * 11, 4) * 4;
  ctx.globalAlpha = ga; ctx.drawImage(S.plastic[1], -.56 * w + jx, -.56 * h + jy, 1.12 * w, 1.12 * h);
  ctx.globalCompositeOperation = 'lighter';
  for (const i of [0, 2]) if (wts[i] > 0) { ctx.globalAlpha = ga * wts[i] * .9; ctx.drawImage(S.plastic[i], -.56 * w + jx, -.56 * h + jy, 1.12 * w, 1.12 * h); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga;
  // overall form: top-left catches the daylight, bottom/right fall into shadow; lit dims everything
  const g = ctx.createLinearGradient(-.4 * w, -.5 * h, .35 * w, .55 * h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = g; ctx.fillRect(-w, -h, 2 * w, 2 * h);
  if (lit < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - lit) * .7})`; ctx.fillRect(-w, -h, 2 * w, 2 * h); }
  // straight ridges where the edges of something flat and rigid press the plastic
  ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(200,212,235,${.14 * lit + .25 * Math.exp(-Math.pow((-.7 - o.sweep) * 2, 2))})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-.3 * w, -.25 * h); ctx.lineTo(-.27 * w, .36 * h); ctx.stroke();
  ctx.strokeStyle = `rgba(200,212,235,${.06 * lit + .2 * Math.exp(-Math.pow((.7 - o.sweep) * 2, 2))})`;
  ctx.beginPath(); ctx.moveTo(.3 * w, -.27 * h); ctx.lineTo(.26 * w, .36 * h); ctx.stroke();
  // the plastic falls into shadow toward the subtitle band (screen space, so it holds while the camera moves / the bag drops)
  const m0 = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
  const bg = ctx.createLinearGradient(0, 1130, 0, 1250); bg.addColorStop(0, 'rgba(5,5,6,0)'); bg.addColorStop(1, 'rgba(5,5,6,.95)');
  ctx.fillStyle = bg; ctx.fillRect(0, 1130, W, H - 1130); ctx.setTransform(m0);
  ctx.restore();
  // rim light on the left contour, lip edge
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = `rgba(190,205,232,${.3 * lit + .3 * Math.exp(-Math.pow((-.9 - o.sweep) * 3, 2))})`; ctx.lineWidth = 3;
  const op = outline(b, m, t, true); ctx.beginPath(); ctx.moveTo(op[9][0], op[9][1]); for (let i = 10; i <= 13; i++) ctx.lineTo(op[i][0], op[i][1]); ctx.stroke();
  ctx.strokeStyle = `rgba(205,218,240,${.22 + .3 * lit * m})`; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; const px = lipX(u, b), py = lipY(u, m, true, t, b); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  ctx.restore();
}

// ---------- ghost frame ----------
function ghostFrame(ctx, cx, cy, s, rot, t, tm) {
  const gin = P(t, tm.tF - .02, tm.tF + .25, E.outC), br = P(t, tm.tN, tm.tN + .6, E.inQ);
  if (gin <= 0 || br >= 1) return;
  const FW = 760, FH = 860, b = 84;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  const sc = lerp(1.1, 1, gin); ctx.scale(sc, sc);
  ctx.globalCompositeOperation = 'lighter';
  const pieces = [[0, 0, FW, b, 0, -1], [0, FH - b, FW, b, 0, 1], [0, b, b, FH - 2 * b, -1, 0], [FW - b, b, b, FH - 2 * b, 1, 0]];
  pieces.forEach(([sx, sy, sw, sh, dx, dy], i) => {
    const k = br, ox = dx * 260 * k + (i - 1.5) * 30 * k, oy = dy * 200 * k + 900 * k * k, rr = (i % 2 ? 1 : -1) * k * (.6 + i * .15);
    ctx.save(); ctx.globalAlpha = .62 * gin * (1 - k);
    ctx.translate(-FW / 2 + sx + sw / 2 + ox, -FH / 2 + sy + sh / 2 + oy); ctx.rotate(rr);
    ctx.drawImage(T.frame, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh); ctx.restore();
  });
  // dashed gold outline drawing in
  if (br <= 0) {
    const dp = P(t, tm.tF, tm.tF + .35, E.inOutQ), per = 2 * (FW + FH), Lr = per * dp;
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = rgba(K.goldHi, .9 * gin); ctx.lineWidth = 7; ctx.setLineDash([26, 16]); ctx.shadowColor = K.gold; ctx.shadowBlur = 18;
    ctx.beginPath(); const pts = [[-FW / 2, -FH / 2], [FW / 2, -FH / 2], [FW / 2, FH / 2], [-FW / 2, FH / 2], [-FW / 2, -FH / 2]];
    let acc = 0; ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && acc < Lr; i++) { const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), u = clamp((Lr - acc) / sl); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)); acc += sl; }
    ctx.stroke();
  }
  ctx.restore();
  // gold dust shed by the breaking frame
  if (br > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const f = t - tm.tN;
    for (let i = 0; i < 70; i++) {
      const side = i % 4, u = hash(i * 7 + 1) - .5;
      const px = side < 2 ? u * FW : (side === 2 ? -FW / 2 : FW / 2), py = side < 2 ? (side === 0 ? -FH / 2 : FH / 2) : u * FH;
      const wx = cx + (px * Math.cos(rot) - py * Math.sin(rot)) * s, wy = cy + (px * Math.sin(rot) + py * Math.cos(rot)) * s;
      const vx = (hash(i * 3) - .5) * 260 + (side === 2 ? -120 : side === 3 ? 120 : 0), vy = -120 * hash(i * 5) + (side === 0 ? -80 : 40);
      const x = wx + vx * f, y = wy + vy * f + 700 * f * f, a = (1 - clamp(f / .9)) * (.5 + .5 * hash(i * 11)), r = 3 + hash(i * 13) * 7;
      ctx.globalAlpha = a; ctx.drawImage(S.spark, x - r * 2, y - r * 2, r * 4, r * 4);
    }
    ctx.restore();
  }
}

// ---------- label (types in two stages) ----------
function caption(ctx, t, tm) {
  const full = '검은 비닐봉투 · 액자 없는 캔버스', p1 = '검은 비닐봉투';
  const n1 = Array.from(p1).length, nAll = Array.from(full).length;
  const k1 = P(t, tm.tB + .08, tm.tB + .5), k2 = P(t, tm.tN + .02, tm.tN + .45);
  const nShow = Math.floor(n1 * k1 + (nAll - n1) * k2 + .0001);
  if (k1 <= 0) return;
  const shown = Array.from(full).slice(0, nShow).join(''), size = 34, y = 492;
  const wT = measure(ctx, shown || ' ', size, FONT.sub, 800), w = wT + 52 + 12, h = size + 26, a = P(t, tm.tB, tm.tB + .15);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(540, y);
  ctx.fillStyle = 'rgba(8,10,14,.86)'; roundRect(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(246,215,127,.65)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = K.gold; ctx.fillRect(-w / 2 + 10, -h / 2 + 10, 5, h - 20);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a;
  // "검은 비닐봉투" in white, "· 액자 없는 캔버스" in gold
  const s1 = Array.from(shown).slice(0, n1).join(''), s2 = Array.from(shown).slice(n1).join('');
  const x0 = 540 - w / 2 + 26; text(ctx, s1, x0, y + 2, { size, align: 'left', color: '#eef1f5', weight: 800 });
  if (s2) text(ctx, s2, x0 + measure(ctx, s1, size, FONT.sub, 800), y + 2, { size, align: 'left', color: K.goldHi, weight: 800 });
  const caret = (Math.floor(t * 4) % 2 === 0) && (k1 < 1 || (k2 > 0 && k2 < 1));
  if (caret) { ctx.fillStyle = K.goldHi; ctx.fillRect(x0 + wT + 4, y - 16, 3, 32); }
  ctx.restore();
}

// ---------------------------------------------------------------------------
window.KL.scenes.bag = function (ctx, t, d, info) {
  if (!S) init();
  const tm = times(info, d), { tK, tB, tA, tF, tN, tG, tP } = tm;
  const rvE = P(t, tP, tP + .5, E.outExpo);              // reveal move (starts under the flash peak)
  const rv = P(t, tP - .04, tP + .12);                     // reveal light switch (under the flash)
  const lit = lerp(.42, 1, P(t, 0, .7, E.outQ)) * (1 - .45 * P(t, tG - .15, tP, E.inQ));
  const m = P(t, tA - .06, tA + .38, E.outC);              // mouth open
  const crinkle = P(t, tB - .05, tB + .1) * (1 - P(t, tB + .75, tB + 1.05));
  const sweep = lerp(-.9, .9, P(t, tK - .05, tK + .55, E.inOutQ));
  // camera: slow push, anticipation pull-back, then reset to identity for the hero framing
  const z0 = (() => {
    if (t < tG - .12) return lerp(1, 1.05, P(t, 0, tA, E.inOutQ)) + .05 * P(t, tA, tG - .12, E.inOutQ);
    return lerp(1.1, 1.045, P(t, tG - .12, tP, E.inOutQ));
  })();
  const z = lerp(z0, 1, rvE), dr = drift(t, 1 - rvE, 21);
  const camY = lerp(lerp(960, 925, P(t, tA, tF, E.inOutQ)), 960, rvE);
  const shake = t > tP ? Math.exp(-(t - tP) * 9) : 0;
  // canvas state: hidden in the bag → slides out → hero
  const em = P(t, tA + .2, tF + .38, k => E.outBack(k, 1.1));
  const sink = 12 * E.inOutQ(P(t, tG - .15, tP)) * (1 - rvE);
  const cxp = 540, cyEm = lerp(1160, 790, em) + sink, rotEm = lerp(-.085, .018, em) + Math.sin(t * 2.2) * .006 * (1 - rvE);
  const settle = P(t, tP + .45, d, E.inOutQ);
  const cs = lerp(.6, .86, rvE) + .04 * settle, cyc = lerp(cyEm, END.y, rvE), crot = lerp(rotEm, 0, rvE);

  ctx.save();
  camera(ctx, { x: 540 + dr.x * .6, y: camY + dr.y * .6, zoom: z, rot: dr.r * .5, shake: shake * .5, t, seed: 4 });
  // cavity + daylight (skipped once the reveal backdrop covers it)
  if (rv < 1) {
    ctx.drawImage(S.cav.c, S.cav.X0, S.cav.Y0);
    if (lit < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - lit) * .55})`; ctx.fillRect(-200, -200, 1480, 2320); }
    godrays(ctx, 540, 140, Math.PI / 2, .9, 1500, '#b8c8de', .05 * lit * (1 - rv), t, 7);
    motes(ctx, t, { n: 40, color: '#dfe6f0', a: .45 * lit * (1 - rv), area: [140, 520, 800, 900], size: 2.6, speed: 16, seed: 23 });
  }
  // contact shadow under the bag
  const bagDrop = 760 * P(t, tP, tP + .55, E.inQ), bagA = 1 - P(t, tP + .1, tP + .5);
  if (bagA > 0) {
    ctx.save(); ctx.globalAlpha = bagA; const sg = ctx.createRadialGradient(BAG.x, BAG.y + BAG.h * .48, 0, BAG.x, BAG.y + BAG.h * .48, BAG.w * .62);
    sg.addColorStop(0, 'rgba(0,0,0,.75)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.translate(0, BAG.y + BAG.h * .48); ctx.scale(1, .16); ctx.translate(0, -(BAG.y + BAG.h * .48));
    ctx.fillStyle = sg; ctx.fillRect(BAG.x - BAG.w, BAG.y - BAG.w * .2, BAG.w * 2, BAG.w * 1.4); ctx.restore();
  }
  // gold rim building behind the canvas (anticipation, under the reverse cymbal)
  const rim = P(t, tF, tP, E.inQ) * (1 - rv * .3);
  if (rim > 0) glow(ctx, cxp, cyc - 40, 420 + 120 * rim, '#ffcf6b', .32 * rim);
  // reveal space (dark emerald + gold), fades in under the flash
  if (rv > 0) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = rv; ctx.drawImage(S.rev.bg, 0, 0);
    ctx.globalAlpha = 1; rays(ctx, 540, 860, t * .12 - .4, .085 * rv * (.85 + .15 * Math.sin(t * 2.3)), t); ctx.restore();
    // floating gold mosaic (Klimt): squares + dots drifting up at different depths
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const dz = .35 + hash(i * 3) * .65, f = t - tP;
      const x = 80 + hash(i * 7) * 920 + Math.sin(t * .7 + i) * 18, y = 1240 - ((hash(i * 5) * 990 + f * 90 * dz) % 990);
      if (Math.abs(x - 540) < 260 && Math.abs(y - 850) < 300) continue;
      const a = rv * dz * (.35 + .35 * Math.sin(t * 2 + i)), s = 4 + 9 * dz;
      ctx.globalAlpha = clamp(a);
      if (i % 3) { ctx.fillStyle = '#f6d77f'; ctx.save(); ctx.translate(x, y); ctx.rotate(i + t * .3); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); }
      else ctx.drawImage(S.spark, x - s * 1.5, y - s * 1.5, s * 3, s * 3);
    }
    ctx.restore();
  }
  // ---- bag (back), mouth, canvas, bag (front) ----
  ctx.save(); ctx.translate(BAG.x, BAG.y + bagDrop); ctx.globalAlpha = bagA;
  const settleBag = crinkle * Math.sin(t * 9) * .011 * (1 - P(t, tB, tB + 1.1));
  ctx.scale(1 + settleBag, 1 - settleBag);
  if (bagA > 0) {
    bagPath(ctx, BAG, m, t); ctx.fillStyle = '#060607'; ctx.fill();
    if (m > 0) { // mouth interior
      ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = -1 + i / 12; const px = lipX(u, BAG), py = lipY(u, m, false, t, BAG); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      for (let i = 24; i >= 0; i--) { const u = -1 + i / 12; ctx.lineTo(lipX(u, BAG), lipY(u, m, true, t, BAG)); } ctx.closePath();
      const mg = ctx.createRadialGradient(0, -.36 * BAG.h, 10, 0, -.36 * BAG.h, .4 * BAG.w); mg.addColorStop(0, `rgba(90,62,20,${.55 * m * (.4 + .6 * rim)})`); mg.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = mg; ctx.fill();
    }
  }
  ctx.restore();
  // the canvas: clipped by the front lip while inside; on the reveal it comes forward, in front of the bag
  const drawFront = () => { ctx.save(); ctx.translate(BAG.x, BAG.y + bagDrop); ctx.globalAlpha = bagA; ctx.scale(1 + settleBag, 1 - settleBag); bagFront(ctx, BAG, m, t, { lit: lit * (1 - rv * .6), crinkle, sweep }); ctx.restore(); };
  if (rvE > 0 && bagA > 0) drawFront();
  ctx.save();
  if (rvE <= 0 && bagA > 0) {
    ctx.beginPath(); ctx.moveTo(-200, -200); ctx.lineTo(1280, -200); ctx.lineTo(1280, BAG.y + bagDrop + lipY(1, m, true, t, BAG));
    for (let i = 24; i >= 0; i--) { const u = -1 + i / 12; ctx.lineTo(BAG.x + lipX(u, BAG), BAG.y + bagDrop + lipY(u, m, true, t, BAG)); }
    ctx.lineTo(-200, BAG.y + bagDrop + lipY(-1, m, true, t, BAG)); ctx.closePath();
    ctx.clip();
  }
  if (em > 0 || rvE > 0) {
    canvasFX(ctx, cxp, cyc, cs, crot);
    // in the bag the canvas is in shadow; light finds its top edge as it rises
    const shade = (1 - em * .55) * (1 - rvE);
    if (shade > 0) {
      ctx.save(); ctx.translate(cxp, cyc); ctx.rotate(crot); ctx.scale(cs, cs);
      const sg = ctx.createLinearGradient(0, -360, 0, 360); sg.addColorStop(0, `rgba(0,0,0,${shade * .35})`); sg.addColorStop(.5, `rgba(0,0,0,${shade * .75})`); sg.addColorStop(1, `rgba(0,0,0,${shade * .95})`);
      ctx.fillStyle = sg; ctx.fillRect(-310, -360, 620, 720);
      ctx.fillStyle = `rgba(220,230,245,${.35 * em * (1 - rvE)})`; ctx.fillRect(-309, -359, 618, 5);
      ctx.restore();
    }
    // varnish sheen sweeping across after the reveal
    const sh = P(t, tP + .22, tP + .8, E.inOutQ);
    if (sh > 0 && sh < 1) {
      ctx.save(); ctx.translate(cxp, cyc); ctx.rotate(crot); ctx.scale(cs, cs); ctx.beginPath(); ctx.rect(-300, -350, 600, 700); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const gx = lerp(-700, 700, sh), gg = ctx.createLinearGradient(gx - 120, -200, gx + 120, 200);
      gg.addColorStop(0, 'rgba(255,240,200,0)'); gg.addColorStop(.5, 'rgba(255,240,200,.32)'); gg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = gg; ctx.fillRect(-300, -350, 600, 700); ctx.restore();
    }
  }
  ctx.restore();
  if (rvE <= 0 && bagA > 0) drawFront();
  // ghost frame (액자 → 없는)
  ghostFrame(ctx, cxp, cyc, cs, crot, t, tm);
  // reveal burst
  if (t > tP - .02) {
    const f = t - tP; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 13) * 6.283, sp = 380 + hash(i * 7) * 1000, k = 1 - Math.exp(-f * 3.2), r = 120 + k * sp * .55;
      const x = 540 + Math.cos(a) * r * 1.0, y = 860 + Math.sin(a) * r * 1.15 + f * f * 60, al = (1 - clamp(f / 1.1)) * (.6 + .4 * hash(i)) * (1 - .75 * clamp((y - 1180) / 90)), s = 4 + hash(i * 3) * 9;
      ctx.globalAlpha = al; ctx.drawImage(S.spark, x - s * 2, y - s * 2, s * 4, s * 4);
    }
    // expanding gold ring
    const rr = 300 + 700 * E.outC(clamp(f / .7)); ctx.globalAlpha = .5 * (1 - clamp(f / .7)); ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 10 * (1 - clamp(f / .7)) + 2; ctx.beginPath(); ctx.ellipse(540, 860, rr, rr * 1.12, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  // reveal bloom: warm light bursting around the painting (ring-shaped so the portrait stays readable on '그림',
  // and it fades out before the subtitle band)
  const fl = t > tP - .05 ? Math.exp(-Math.max(0, t - tP) * 7) * P(t, tP - .05, tP, E.inQ) : 0;
  if (fl > 0) {
    const br = 420 * cs / .6, bg = ctx.createRadialGradient(cxp, cyc, 0, cxp, cyc, br);
    bg.addColorStop(0, rgba('#ffe2a0', .14 * fl)); bg.addColorStop(.58, rgba('#ffd98a', .5 * fl)); bg.addColorStop(1, 'rgba(255,217,138,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = bg; ctx.fillRect(cxp - br, cyc - br, 2 * br, 2 * br); ctx.restore();
  }
  ctx.restore();
  // dim the cavity edges toward the climax (focus), lift after
  const dimA = .35 * P(t, tG - .2, tP, E.inQ) * (1 - rv);
  if (dimA > 0 && rv < .5) { const g = ctx.createRadialGradient(540, 860, 200, 540, 900, 900); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${dimA * 2})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  caption(ctx, t, tm);
  // light full-frame lift on the reveal (capped so the subtitle band stays dark)
  flash(ctx, fl * .15, '#fff1cf');
};
})();
