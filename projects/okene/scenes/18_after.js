// after (≈96.14-101.72): "다시는 바다로 돌아가지 않겠다던 그는, 몇 년 뒤 직업 잠수사가 됐습니다."
// Fades in from whyme: his small warm light keeps its place while the night sea dissolves into deep water that slowly lightens.
// '다시는' -> chip 1 (2013, AP) types on. '돌아가지' -> a guideline drops in from above beside him. '몇 년 뒤' -> chip 2 and
// time passing: the silt streaks upward, the line's tags run past, the water lifts a shade. '직업' -> a faceless, helmeted diver
// silhouette forms around his light (top to bottom; the warm light stays in the chest, beating calmly), one gloved hand on the
// line. '잠수사가' -> chip 3 lifts in, the helmet lamp comes on (a cold-white beam down the line), a shimmer runs over the rim.
// '됐습니다' -> he descends calmly along the line, exhaling bubbles; daylight shafts reach down. Ends on the framing the ocean
// clip cuts to. Also adds PK.FIN.diver (used again by ocean).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK, FIN = PK.FIN;

// =============================== diver silhouette ===============================
// Local units, profile facing right, upright (descending feet first). The warm light (his heart) is the origin.
// o: kick (fin phase), reach (0 = near hand relaxed, 1 = on the line), lineX (local x of the line), sway, t
function capsule(c, x0, y0, x1, y1, w0, w1) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
  c.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); c.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  c.arc(x1, y1, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  c.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  c.arc(x0, y0, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true); c.closePath();
}
function fin(c, ax, ay, ang) {
  const P0 = [[-14, -10], [15, -4], [13, 30], [5, 150], [-1, 156], [-7, 150], [-15, 30]], cs = Math.cos(ang), sn = Math.sin(ang);   // a fin seen edge-on: long, thin blade
  P0.forEach(([x, y], i) => { const X = ax + x * cs - y * sn, Y = ay + x * sn + y * cs; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath();
}
function legPts(side, o) {
  const k = Math.sin(o.kick + (side ? 0 : Math.PI));
  return side ? { hip: [24, 106], knee: [54 + 7 * k, 206], ank: [30 - 5 * k, 306], fa: .16 + .2 * k }
    : { hip: [-10, 110], knee: [-16 + 7 * k, 218], ank: [-44 - 5 * k, 312], fa: .34 + .2 * k };
}
function armPts(side, o) {
  if (!side) return { sh: [6, -34], el: [20, 36], ha: [44, 82] };
  const r = clamp(o.reach), hy = -70 + 8 * Math.sin(o.t * .7);
  return { sh: [26, -30], el: [lerp(52, 66, r), lerp(40, 18, r)], ha: [lerp(66, o.lineX - 4, r), lerp(84, hy, r)] };
}
function diverShape(c, o) {
  // every part is filled on its own (overlapping sub-paths of opposite winding would punch holes)
  const part = f => { c.beginPath(); f(); c.fill(); };
  const fa = armPts(0, o), fl = legPts(0, o), nl = legPts(1, o), na = armPts(1, o);
  // far arm + far leg (behind the body)
  part(() => capsule(c, fa.sh[0], fa.sh[1], fa.el[0], fa.el[1], 30, 26)); part(() => capsule(c, fa.el[0], fa.el[1], fa.ha[0], fa.ha[1], 26, 22));
  part(() => c.ellipse(fa.ha[0], fa.ha[1] + 4, 12, 16, -.3, 0, 7));
  part(() => capsule(c, fl.hip[0], fl.hip[1], fl.knee[0], fl.knee[1], 50, 40)); part(() => capsule(c, fl.knee[0], fl.knee[1], fl.ank[0], fl.ank[1], 38, 26)); part(() => fin(c, fl.ank[0], fl.ank[1], fl.fa));
  // bailout cylinder on the back + its valve
  part(() => roundRect(c, -78, -60, 38, 152, 17)); part(() => c.rect(-66, -76, 14, 18));
  // torso
  part(() => { c.moveTo(-30, -58); c.quadraticCurveTo(6, -68, 40, -58); c.quadraticCurveTo(62, -40, 56, 4); c.quadraticCurveTo(50, 60, 48, 118); c.quadraticCurveTo(10, 138, -26, 126);
    c.quadraticCurveTo(-46, 92, -42, 40); c.quadraticCurveTo(-46, -20, -42, -40); c.quadraticCurveTo(-40, -54, -30, -58); c.closePath(); });
  // near leg
  part(() => capsule(c, nl.hip[0], nl.hip[1], nl.knee[0], nl.knee[1], 52, 42)); part(() => capsule(c, nl.knee[0], nl.knee[1], nl.ank[0], nl.ank[1], 40, 27)); part(() => fin(c, nl.ank[0], nl.ank[1], nl.fa));
  // neck yoke + helmet (dome, faceplate frame, regulator, side block, lamp)
  part(() => { c.moveTo(-26, -66); c.lineTo(44, -66); c.lineTo(52, -46); c.lineTo(-32, -44); c.closePath(); });
  part(() => c.ellipse(14, -108, 48, 50, 0, 0, 7));
  part(() => { c.moveTo(40, -144); c.lineTo(62, -136); c.quadraticCurveTo(70, -108, 64, -78); c.lineTo(44, -72); c.closePath(); });
  part(() => c.arc(58, -80, 13, 0, 7)); part(() => c.arc(-30, -106, 10, 0, 7));
  part(() => { c.moveTo(28, -160); c.lineTo(52, -152); c.lineTo(46, -138); c.lineTo(24, -146); c.closePath(); });
  // near arm (hand on the line when reaching)
  part(() => capsule(c, na.sh[0], na.sh[1], na.el[0], na.el[1], 32, 28)); part(() => capsule(c, na.el[0], na.el[1], na.ha[0], na.ha[1], 28, 23));
  part(() => c.ellipse(na.ha[0] + 2, na.ha[1] - 2, 14, 17, .2, 0, 7));
  // umbilical: from the back of the helmet up out of the frame
  c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(-28, -128);
  c.bezierCurveTo(-74 + o.sway * 10, -190, -40 + o.sway * 30, -330, -96 + o.sway * 50, -520); c.bezierCurveTo(-130 + o.sway * 60, -640, -90, -800, -150, -1100); c.stroke();
}
// details painted inside the silhouette (clipped by 'source-atop')
function diverDetails(c, o, rim, k) {
  c.lineCap = 'round';
  // faceplate glass: no face, just a dark pane with a cold reflection
  c.fillStyle = '#0a1a24'; c.beginPath(); c.moveTo(45, -136); c.lineTo(59, -131); c.quadraticCurveTo(65, -108, 60, -84); c.lineTo(47, -80); c.quadraticCurveTo(52, -108, 45, -136); c.closePath(); c.fill();
  c.strokeStyle = rgba('#cfe8ff', .55 * k); c.lineWidth = 2.5; c.beginPath(); c.moveTo(52, -128); c.quadraticCurveTo(57, -114, 55, -100); c.stroke();
  // dome highlight, yoke seam, harness, belt, valve, tank band
  c.strokeStyle = rgba(rim, .4 * k); c.lineWidth = 3; c.beginPath(); c.arc(14, -108, 42, -2.6, -1.1); c.stroke();
  c.strokeStyle = rgba(rim, .14 * k); c.lineWidth = 2; c.beginPath(); c.moveTo(-28, -50); c.lineTo(48, -50); c.stroke();
  c.strokeStyle = rgba(rim, .2 * k); c.lineWidth = 5; c.beginPath(); c.moveTo(-38, 70); c.lineTo(50, 66); c.stroke();
  c.strokeStyle = rgba(rim, .3 * k); c.beginPath(); c.moveTo(-74, -50); c.lineTo(-74, 80); c.stroke();
}
// compose the silhouette: soft halo, rim (offset toward the light) and the dark body, all from one cached mask per frame
const BW = 640, BH = 980, AX = 320, AY = 420;
function diver(ctx, t, o) {
  o = Object.assign({ s: 1, rot: 0, kick: t * 1.6, reach: 1, lineX: 92, sway: Math.sin(t * .5), a: 1, reveal: 1, fill: '#04090d', rim: '#9fd8ff', rimA: 1, rimOff: [-1.5, -3.2], rim2: [3, -.5], rim2A: .45, halo: .25, detail: 1, t }, o);
  if (o.a <= 0 || o.reveal <= 0) return;
  const [mb, mx] = L.buf('finDivM', BW, BH);
  mx.clearRect(0, 0, BW, BH); mx.translate(AX, AY); mx.rotate(o.rot); mx.scale(o.s, o.s); mx.fillStyle = mx.strokeStyle = '#fff';
  diverShape(mx, o);
  if (o.reveal < 1) {             // forms from the top down
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'destination-in';
    const yc = lerp(AY - 240 * o.s, AY + 500 * o.s, o.reveal), g = mx.createLinearGradient(0, yc - 120, 0, yc + 30);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); mx.fillStyle = g; mx.fillRect(0, 0, BW, BH);
  }
  const [fbuf, fx] = L.buf('finDivF', BW, BH);
  fx.clearRect(0, 0, BW, BH); fx.drawImage(mb, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = o.fill; fx.fillRect(0, 0, BW, BH);
  if (o.detail > 0) { fx.globalCompositeOperation = 'source-atop'; fx.translate(AX, AY); fx.rotate(o.rot); fx.scale(o.s, o.s); diverDetails(fx, o, o.rim, o.detail); }
  const [rbuf, rx] = L.buf('finDivR', BW, BH);
  rx.clearRect(0, 0, BW, BH); rx.drawImage(mb, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = o.rim; rx.fillRect(0, 0, BW, BH);
  const X0 = o.x - AX, Y0 = o.y - AY;
  ctx.save();
  if (o.halo > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(o.halo * o.a); ctx.filter = 'blur(12px)'; ctx.drawImage(rbuf, X0, Y0); ctx.filter = 'none'; }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = clamp(o.rim2A * o.a); ctx.drawImage(rbuf, X0 + o.rim2[0], Y0 + o.rim2[1]);
  ctx.globalAlpha = clamp(o.rimA * o.a); ctx.drawImage(rbuf, X0 + o.rimOff[0], Y0 + o.rimOff[1]);
  ctx.globalAlpha = clamp(o.a); ctx.drawImage(fbuf, X0, Y0);
  ctx.restore();
}
// local -> screen for a diver drawn with (x, y, s, rot)
function dpt(o, lx, ly) { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0); return [o.x + (lx * c - ly * s) * o.s, o.y + (lx * s + ly * c) * o.s]; }
// helmet lamp (local) and regulator exhaust (local)
const LAMP = [50, -150], EXH = [60, -84];
// a cone of cold-white light with silt in it
function lampBeam(ctx, t, x, y, ang, a, len = 760, spread = .26) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, rgba('#e8f6ff', .42 * a)); g.addColorStop(.3, rgba('#a9dcff', .14 * a)); g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - spread, ang + spread); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 46; i++) {
    const r = len * (.08 + .88 * ((FIN.hi(i * 7 + 5) + t * .04 * (.5 + FIN.hi(i))) % 1)), q = ang + (FIN.hi(i * 13 + 2) - .5) * 1.8 * spread;
    const px = x + Math.cos(q) * r + Math.sin(t * .7 + i) * 5, py = y + Math.sin(q) * r + Math.cos(t * .5 + i) * 5;
    ctx.fillStyle = rgba('#e0f2ff', .55 * a * (1 - r / len)); ctx.fillRect(px, py, 2.2, 2.2);
  }
  ctx.restore();
  glow(ctx, x, y, 70, '#e8f6ff', .6 * a); glow(ctx, x, y, 16, '#ffffff', .9 * a);
}
// exhaled bubbles: bursts at the given local times, rising and wobbling (screen space)
function exhale(ctx, t, bursts, x, y, a = .8, seed = 3) {
  ctx.save(); ctx.lineWidth = 1.8;
  bursts.forEach((tb, b) => {
    for (let i = 0; i < 16; i++) {
      const t0 = tb + FIN.hi(b * 31 + i * 7 + seed) * .45, u = t - t0; if (u < 0 || u > 3.2) continue;
      const r = (3 + FIN.hi(i * 11 + b + seed) * 7) * (1 + u * .25), by = y - u * (150 + 90 * FIN.hi(i * 5 + b)) - 30 * u * u, bx = x + 10 + (FIN.hi(i * 3 + b) - .5) * 30 + Math.sin(u * 5 + i) * 6 * u;
      const al = a * (1 - u / 3.2);
      ctx.strokeStyle = rgba('#e0f6ff', al); ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', al * .6); ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .35, r * .28, 0, 7); ctx.fill();
    }
  });
  ctx.restore();
}
// his heart: the series' warm light, now inside the diver's chest
function heart(ctx, t, x, y, a, bpm, s = 1) {
  if (a <= 0) return; const b = PK.beat(t, bpm);
  glow(ctx, x, y, 240 * s * (1 + .08 * b), '#ff9a3c', (.1 + .06 * b) * a);
  PK.souls(ctx, t, [{ x, y, a, s: 1.25 * s }], { bpm });
}
FIN.diver = diver; FIN.dpt = dpt; FIN.LAMP = LAMP; FIN.EXH = EXH; FIN.lampBeam = lampBeam; FIN.exhale = exhale; FIN.heart = heart;
// framing shared with the ocean clip (the cut lands on the same diver)
FIN.DV = { x: 512, y: 892, s: .88 };

// typed chip with a stable box; the year (first word) in amber
function yearChip(ctx, t, s, x, y, a, p, o = {}) {
  if (a <= 0) return; const size = o.size || 31, full = measure(ctx, s, size, FONT.sub, 800), w = full + 44, h = size + 26;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(3,10,15,.86)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,255,.4)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  const shown = L.typeSub(s, p), sp = shown.indexOf(' '), yr = sp < 0 ? shown : shown.slice(0, sp + 1), rest = sp < 0 ? '' : shown.slice(sp + 1);
  const x0 = x - full / 2, wy = measure(ctx, yr, size, FONT.sub, 900);
  text(ctx, yr, x0, y + 2, { size, weight: 900, color: '#ffcf8a', align: 'left', alpha: a });
  if (rest) text(ctx, rest, x0 + wy, y + 2, { size, weight: 800, color: o.color || '#e8f4ff', align: 'left', alpha: a });
  if (p < 1 && p > 0) { const cw = measure(ctx, shown, size, FONT.sub, 800); ctx.save(); ctx.globalAlpha *= a * (Math.sin(t * 40) > 0 ? 1 : .2); ctx.fillStyle = '#8fd3e8'; ctx.fillRect(x0 + cw + 4, y - size * .42, 3, size * .84); ctx.restore(); }
}

window.PK.scenes.after = function (ctx, t, d, info) {
  const D = info.sc.data || {}, chips = D.chips || [], { wt, fb, hi } = FIN;
  const tDa = wt(info, '다시는', .02), tDol = wt(info, '돌아가지', .18), tMyeot = wt(info, '몇', .52), tJik = wt(info, '직업', .64), tJam = wt(info, '잠수사가', .71), tDw = wt(info, '됐습니다', .82);
  const lite = P(t, -.2, d + .2, E.inOutQ);                  // the deep slowly lightens
  const pass = P(t, tMyeot - .15, tMyeot + .95, E.inOutQ);   // time passing (years)
  const rev = P(t, tJik - .08, tJik + .75, E.inOutQ);       // the diver forms around his light
  const lamp = P(t, tJam - .02, tJam + .12) * (.92 + .08 * FIN.nz(t * 5, 9));
  const desc = t * 34 + pass * 900 + P(t, tDw - .3, d + .5) * 60;     // how far down the line we've come (world px)

  // ---- water ----
  const top = PK.lerp2('#03121a', '#0f4d68', lite * .85 + .1 * pass), mid = PK.lerp2('#020a0f', '#073047', lite * .8 + .1 * pass), bot = PK.lerp2('#010203', '#03121a', lite);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(.45, mid); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // daylight from above, growing
  const sh = .02 + .1 * lite + .05 * P(t, tJam, d);
  ctx.save(); ctx.translate(560, 120); ctx.scale(2.4, 1); glow(ctx, 0, 0, 520, '#6fd0ea', .1 + .2 * lite, 'lighter'); ctx.restore();
  PK.shafts(ctx, t, sh, 8);
  // silt: drifts, then streaks upward while the years pass
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const vel = 34 + 1500 * Math.sin(Math.PI * pass) * .55;
  for (let i = 0; i < 110; i++) {
    const z = .35 + .65 * hi(i * 7 + 1), x = hi(i * 3 + 2) * (W + 80) - 40 + fb(t * .2 + i, 5) * 30;
    const y = ((hi(i * 5 + 3) * 1700 - desc * z) % 1700 + 1700) % 1700 + 120, ln = Math.max(2.2 * z, vel * z * .05);
    ctx.fillStyle = rgba('#bfe6f2', (.18 + .2 * z) * (.4 + .6 * lite)); ctx.fillRect(x, y - ln, 2 * z, ln);
  }
  ctx.restore();

  // ---- the diver's place (his light in whyme ended near (540, 926)) ----
  const DV = FIN.DV, rest = P(t, 0, tJik, E.inOutQ);
  const ox = lerp(540, DV.x, rest) + fb(t * .3, 181) * 6, oy = lerp(926, DV.y, rest) + fb(t * .27, 182) * 6 + Math.sin(t * 1.1) * 3;
  const o = { x: ox, y: oy, s: DV.s, rot: -.03 + .02 * Math.sin(t * .4), t };
  // the guideline drops in from above on '돌아가지'
  const [lnx] = dpt(o, 92, 0), drop = P(t, tDol - .1, tDol + .9, E.inOutC);
  if (drop > 0) {
    const yEnd = lerp(-40, H + 40, drop);
    ctx.save(); ctx.strokeStyle = rgba('#cfe3ea', .55 + .2 * lite); ctx.lineWidth = 3.2; ctx.beginPath();
    for (let y = -40; y <= yEnd; y += 40) { const x = lnx + Math.sin(y * .004 + t * .6) * 3 * (1 - y / H); y === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // depth tags on the line, running past as we descend
    for (let k = 0; k < 9; k++) {
      const y = ((k * 300 - desc) % 2700 + 2700) % 2700 - 300; if (y > yEnd) continue;
      const x = lnx + Math.sin(y * .004 + t * .6) * 3 * (1 - y / H);
      ctx.fillStyle = rgba('#e3262f', .7); ctx.fillRect(x - 4, y, 8, 16); ctx.fillStyle = rgba('#ffffff', .25); ctx.fillRect(x - 4, y, 8, 2);
    }
    ctx.restore();
  }
  // the lamp beam (behind the body), down along the line
  const [lpx, lpy] = dpt(o, LAMP[0], LAMP[1]);
  lampBeam(ctx, t, lpx, lpy, 1.12 + .06 * Math.sin(t * .5), lamp * (.8 + .2 * lite));
  // the silhouette forms around his light
  const shim = Math.exp(-Math.pow((t - tJam - .15) / .25, 2));
  diver(ctx, t, Object.assign({}, o, { reveal: rev, a: P(t, tJik - .1, tJik + .4), reach: 1, rim: '#9fdcff', rimA: .9 + 1.2 * shim, halo: .18 + .3 * shim + .1 * lamp }));
  // exhaled bubbles once he breathes from the helmet
  const [ex, ey] = dpt(o, EXH[0], EXH[1]);
  if (rev > .6) exhale(ctx, t, [tJam + .55, tJam + 1.85, tJam + 3.1], ex, ey, .8 * P(rev, .6, 1));
  // his light: the same warm heartbeat, now in the chest
  const [hx, hy] = dpt(o, 10 * rev, -4 * rev);
  heart(ctx, t, hx, hy, 1 - .25 * rev, lerp(58, 64, rest), lerp(1.25, .95, rev));

  // ---- chips (timeline), typed in order ----
  const Y = [520, 594, 668], T = [tDa + .02, tMyeot - .02, tJam - .04];
  chips.slice(0, 3).forEach((s, i) => {
    const a = P(t, T[i] - .08, T[i] + .2, E.outQ) * (i < 2 ? 1 - .35 * P(t, tJam, tJam + .5) : 1);
    const p = P(t, T[i], T[i] + .55);
    const sc = i === 2 ? lerp(.9, 1, E.outBack(P(t, T[i] - .05, T[i] + .4))) : 1;
    ctx.save(); ctx.translate(540, Y[i]); ctx.scale(sc, sc);
    yearChip(ctx, t, s, 0, 0, a, p, i === 2 ? { border: rgba('#ffcf8a', .5 + .4 * shim), color: '#ffffff' } : {});
    ctx.restore();
  });
  // a soft top under the title and the quiet subtitle band
  { const g2 = ctx.createLinearGradient(0, 0, 0, 470); g2.addColorStop(0, 'rgba(1,3,5,.7)'); g2.addColorStop(1, 'rgba(1,3,5,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 470); }
  FIN.subBand(ctx, .82, 1150);
};
})();
