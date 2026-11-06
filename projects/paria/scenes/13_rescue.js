// rescue: "약 3시간 뒤, 수직관 끝에서 자원 잠수부들이 그를 끌어올렸습니다."
// Side cutaway of the riser. Opens wide on the elbow where the riser meets the line: far down the line, four dim lights in the
// dark (unchanged, they stay behind); his single light low in the riser. '3시간' -> time strip (오후 2:45경 사고 -> 오후 5:45경
// 구조 (조사위원회), 약 3시간) while the silt streaks past (time passing). '수직관' -> the camera tilts up the riser, following the
// light as it rises trailing bubbles. '끝에서' -> cold light pours down from the habitat opening above. '자원 잠수부들이' -> two
// faceless volunteer-diver silhouettes kneel at the riser mouth and reach down; '그를' -> their hands break the water;
// '끌어올렸습니다' -> he is pulled up through the surface into air: splash, warm bloom, the tunnel vision and the dark release
// (the audio un-muffles here).
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, godrays, text, measure, roundRect, flash, FONT } = L;
const { at, souls, beat, chip } = window.PK;
// local integer hash / value noise (L.hash loses precision for large arguments)
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };

// ---- cheaper PK.dark (same oily sheen), composed at quarter resolution ----
function sheenTexR() {
  if (window.PK._sheenRB) return window.PK._sheenRB;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenRB = c; return c;
}
function darkFastR(ctx, t, k, seed, yTop = 0, base = '#010203') {
  const [b, x] = L.buf('rbDarkR', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexR(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.globalAlpha = 1;
  const y0 = clamp(Math.floor(yTop / 4) * 4, 0, H - 4);
  if (y0 > 0) { ctx.fillStyle = base; ctx.fillRect(0, 0, W, y0); }
  ctx.drawImage(b, 0, y0 / 4, 270, 480 - y0 / 4, 0, y0, W, H - y0); ctx.restore();
}
function iris(ctx, k, pulse, cx, cy) {
  if (k <= 0) return;
  const r0 = H * lerp(.42, .1, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// camera with the focal centre at screen y 850
function cam(ctx, x, y, z, rot, sx, sy) { ctx.translate(540 + sx, 850 + sy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-x, -y); }

// ---- world geometry (side cutaway): riser mouth at y 0 in the habitat floor, water inside the riser up to SURF ----
const RX = 440, RR = 92, WL = 18, SURF = 64, BY = 1480, RC = 230, LY = BY + RC, X1 = RX + RC, SL = .075;
const lineY = x => LY - SL * Math.max(0, x - X1);           // the line rises very slightly away from the elbow
const crown = x => lineY(x) - RR;
const WS = LY - RR - 10;                                      // fluid level in the line: air only collects further out
const FAR = [1150, 1216, 1286, 1352];
const BED = LY + RR + WL + 40;
function pipePath(ctx, y0) { ctx.beginPath(); ctx.moveTo(RX, y0); ctx.lineTo(RX, BY); ctx.quadraticCurveTo(RX, LY, X1, LY); ctx.lineTo(X1 + 2600, LY - SL * 2600); }

let INNER = null;
function inner() {
  if (INNER) return INNER;
  const c = [];
  for (let y = -14; y < BY; y += 40) c.push([RX, y]);
  for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; c.push([v * v * RX + 2 * v * u * RX + u * u * X1, v * v * BY + 2 * v * u * LY + u * u * LY]); }
  for (let x = X1 + 60; x <= X1 + 2600; x += 120) c.push([x, lineY(x)]);
  const A = [], B = [];
  for (let i = 0; i < c.length; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[Math.min(c.length - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    A.push([c[i][0] - dy / l * RR, c[i][1] + dx / l * RR]); B.push([c[i][0] + dy / l * RR, c[i][1] - dx / l * RR]);
  }
  const p = new Path2D(); A.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); for (let i = B.length - 1; i >= 0; i--) p.lineTo(B[i][0], B[i][1]); p.closePath();
  INNER = p; return p;
}
function lightY(t, tp) {
  let y = lerp(1470, 1250, P(t, -.3, 1.3, E.inOutQ));
  y = lerp(y, SURF + 82, P(t, 1.2, 2.55, E.inOutQ));
  y += 9 * Math.sin(P(t, tp - .3, tp + .02) * Math.PI);             // he sinks a little before the hands take him
  const pu = P(t, tp, tp + .38, E.inOutC);
  y = lerp(y, -84, pu);
  return y + Math.sin(t * 1.7) * 3 * (1 - pu) + Math.sin(t * 2.3 + 1) * 2.5 * P(t, tp + .3, tp + .8);
}
function ik(sx, sy, hx, hy, a, b, side) {
  let dx = hx - sx, dy = hy - sy, dd = Math.hypot(dx, dy) || 1;
  const m = Math.min(dd, a + b - .5); hx = sx + dx / dd * m; hy = sy + dy / dd * m; dd = Math.max(m, Math.abs(a - b) + 1);
  const ang = Math.atan2(dy, dx), off = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const ea = ang - side * off;
  return [sx + Math.cos(ea) * a, sy + Math.sin(ea) * a, hx, hy];
}

// ---- a faceless volunteer diver kneeling at the mouth (generic silhouette, rim-lit) ----
function volunteer(ctx, t, side, o) {
  if (o.a <= 0) return;
  const hip = [RX + side * 236, -80], knee = [RX + side * 196, -16], foot = [RX + side * 316, -12];
  let sx = lerp(RX + side * 186, RX + side * 128, o.lean), sy = lerp(-198, -116, o.lean);
  sx = lerp(sx, RX + side * 160, o.pull); sy = lerp(sy, -172, o.pull);
  sy += Math.sin(t * 1.3 + side) * 2;
  const tx = sx - hip[0], ty = sy - hip[1], tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl, px = -uy * side, py = ux * side; // p: towards the back
  const hd = [sx + ux * 44 - side * 18 * o.lean, sy + uy * 44 + 14 * o.lean];
  const [ex, ey, hx, hy] = ik(sx, sy, o.hand[0], o.hand[1], 104, 112, side);
  const bk = [px * 34, py * 34];
  const shape = (c, ex2) => {
    c.lineWidth = 64 + ex2; c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(sx - ux * 6, sy - uy * 6); c.stroke();                      // torso
    c.lineWidth = 30 + ex2; c.beginPath(); c.moveTo(hip[0] + bk[0] + ux * 22, hip[1] + bk[1] + uy * 22); c.lineTo(sx + bk[0] - ux * 14, sy + bk[1] - uy * 14); c.stroke(); // tank
    c.lineWidth = 40 + ex2; c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(knee[0], knee[1]); c.stroke();
    c.lineWidth = 30 + ex2; c.beginPath(); c.moveTo(knee[0], knee[1]); c.lineTo(foot[0], foot[1]); c.stroke();
    c.beginPath(); c.moveTo(foot[0], foot[1] - 12 - ex2); c.lineTo(foot[0] + side * (92 + ex2), foot[1] - 2); c.lineTo(foot[0] + side * (92 + ex2), foot[1] + 7 + ex2); c.lineTo(foot[0], foot[1] + 13 + ex2); c.closePath(); c.fill();
    c.lineWidth = 26 + ex2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.lineWidth = 22 + ex2; c.beginPath(); c.moveTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    c.beginPath(); c.arc(hx, hy, 14 + ex2 / 2, 0, 7); c.fill();
    c.beginPath(); c.arc(hd[0], hd[1], 33 + ex2 / 2, 0, 7); c.fill();                      // helmet (no face)
    c.save(); c.translate(hd[0], hd[1]); c.rotate(Math.atan2(uy, ux) + Math.PI / 2); roundRect(c, -9 - ex2 / 2, -46 - ex2 / 2, 18 + ex2, 16 + ex2, 4); c.restore(); c.fill(); // lamp housing
  };
  ctx.save(); ctx.globalAlpha *= o.a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // umbilical up to the surface
  ctx.strokeStyle = 'rgba(70,64,48,.9)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hd[0] + px * 26, hd[1] + py * 10);
  ctx.bezierCurveTo(hd[0] + px * 90, hd[1] - 120, hd[0] + side * 40 + Math.sin(t * .8 + side) * 14, -560, hd[0] + side * 70, -900); ctx.stroke();
  // rims: cold from the light above, warm from below once he is out
  ctx.save(); ctx.translate(side * -1.5, -3.5); ctx.fillStyle = ctx.strokeStyle = rgba('#d8efff', .42 * o.rim); shape(ctx, 1.5); ctx.restore();
  if (o.warm > 0) { ctx.save(); ctx.translate(0, 3); ctx.fillStyle = ctx.strokeStyle = rgba('#ffb36b', .45 * o.warm); shape(ctx, 1); ctx.restore(); }
  ctx.fillStyle = ctx.strokeStyle = '#05080a'; shape(ctx, 0);
  ctx.restore();
  // helmet lamp + its beam down into the riser
  const la = Math.atan2(uy, ux), lx = hd[0] + Math.cos(la) * 40, ly = hd[1] + Math.sin(la) * 40;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= o.a;
  const tx2 = RX + side * 10, ty2 = SURF + 60, ang = Math.atan2(ty2 - ly, tx2 - lx), len = Math.hypot(tx2 - lx, ty2 - ly) * 1.3, wd = .2;
  const bg = ctx.createLinearGradient(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len);
  bg.addColorStop(0, rgba('#e6f6ff', .16 * o.lamp)); bg.addColorStop(1, 'rgba(230,246,255,0)'); ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(ang - wd) * len, ly + Math.sin(ang - wd) * len); ctx.lineTo(lx + Math.cos(ang + wd) * len, ly + Math.sin(ang + wd) * len); ctx.closePath(); ctx.fill();
  ctx.restore();
  glow(ctx, lx, ly, 26, '#e6f6ff', .5 * o.a * o.lamp);
  ctx.save(); ctx.globalAlpha *= o.a * o.lamp; ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill(); ctx.restore();
}

function timeStrip(ctx, t, a, p, lab, endA, tIn, tOut) {
  if (a <= 0) return;
  const x0 = 150, x1 = 930, y = 1146, xf = lerp(x0, x1, p);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, 1010, 0, 1250); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.35, 'rgba(1,2,3,.6)'); g.addColorStop(.75, 'rgba(1,2,3,.6)'); g.addColorStop(1, 'rgba(1,2,3,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 1010, W, 240);
  ctx.strokeStyle = 'rgba(143,211,232,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  for (let k = 0; k <= 3; k++) { const x = lerp(x0, x1, k / 3); ctx.fillStyle = rgba('#8fd3e8', x <= xf + 1 ? .7 : .25); ctx.fillRect(x - 1.5, y - 9, 3, 18); }
  const fg = ctx.createLinearGradient(x0, 0, x1, 0); fg.addColorStop(0, '#e3262f'); fg.addColorStop(.25, '#8fd3e8'); fg.addColorStop(1, '#cfe8ff');
  ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xf, y); ctx.stroke();
  ctx.restore();
  if (p > 0 && p < 1) { glow(ctx, xf, y, 46, '#8fd3e8', .7 * a); }
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#e3262f'; ctx.beginPath(); ctx.arc(x0, y, 9, 0, 7); ctx.fill();
  if (endA > 0) { ctx.globalAlpha = a * endA; ctx.fillStyle = '#cfe8ff'; ctx.beginPath(); ctx.arc(x1, y, 9 * E.outBack(endA), 0, 7); ctx.fill();
    const q = (t * .9) % 1; ctx.strokeStyle = rgba('#cfe8ff', (1 - q) * .6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x1, y, 10 + q * 26, 0, 7); ctx.stroke(); }
  ctx.restore();
  text(ctx, tIn, x0 - 16, y + 44, { size: 28, weight: 800, color: '#ffc9c2', align: 'left', alpha: a });
  text(ctx, tOut, x1 + 16, y + 44, { size: 28, weight: 800, color: '#dff1ff', align: 'right', alpha: a * endA });
  // centre: clock + 약 3시간
  if (lab > 0) {
    const sc = lerp(.7, 1, E.outBack(lab, 2)), tw = measure(ctx, '약 3시간', 54, FONT.sub, 900), cx = 540 + 32, cy = y - 58;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha *= a * clamp(lab * 2);
    const kx = -tw / 2 - 44; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(kx, 0, 22, 0, 7); ctx.stroke();
    const mA = -Math.PI / 2 + p * 3 * Math.PI * 2, hA = -Math.PI / 2 + Math.PI * 2 * (2.75 + p * 3) / 12;
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(kx, 0); ctx.lineTo(kx + Math.cos(mA) * 16, Math.sin(mA) * 16); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(kx, 0); ctx.lineTo(kx + Math.cos(hA) * 10, Math.sin(hA) * 10); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    text(ctx, '약 3시간', 0, 2, { size: 54, weight: 900, color: '#fff', stroke: '#000', strokeW: 8, alpha: a * clamp(lab * 2) });
    ctx.restore();
  }
}

window.PK.scenes.rescue = function (ctx, t, d, info) {
  const t3 = at(info, '3시간', .05), tDw = at(info, '뒤', .14), tSu = at(info, '수직관', .26), tKk = at(info, '끝에서', .35), tJa = at(info, '자원', .46),
    tJm = at(info, '잠수부들이', .54), tGe = at(info, '그를', .68), tp = at(info, '끌어올렸습니다', .76);
  const tBr = tp + .17;                                             // he breaks the surface (impact cue)
  const rel = P(t, tBr - .05, tBr + .7, E.outQ);                    // the release: light, air, sound
  const near = P(t, 1.2, 2.6, E.inOutQ);                             // how close to the top he is

  // ---- camera: wide on the elbow -> tilt up the riser -> push in on the mouth -> follow him up ----
  const pan = P(t, .85, 2.0, E.inOutQ), follow = P(t, .85, 1.75, E.inOutQ), push = P(t, 2.3, tp + .1, E.inOutQ), lift = P(t, tp, tp + .9, E.inOutQ);
  let cx = lerp(772, RX + 34, pan), cy = lerp(1545, lightY(t, tp) + lerp(60, -125, P(t, 1.7, 2.4, E.inOutQ)), follow), z = lerp(.74, 1.02, P(t, .9, 2.3, E.inOutQ)) * (1 + .03 * P(t, -.3, 1.2));
  cx = lerp(cx, RX + 8, push); cy = lerp(cy, 34, push); z = lerp(z, 1.25, push);
  cy = lerp(cy, -22, lift); z *= 1 + .06 * lift + .02 * P(t, tp + .9, d + .4);
  const dr = { x: fb(t * .35, 41) * 16, y: fb(t * .3, 50) * 16, r: fb(t * .25, 45) * .006 };
  const shk = .32 * Math.exp(-Math.max(0, t - tBr) * 6) * (t > tBr - .02 ? 1 : 0) + .07 * Math.exp(-Math.pow((t - tGe - .25) / .12, 2)) + .04 * P(t, 1.2, 1.6) * (1 - P(t, 2.0, 2.5));
  const sx = shk * nz(t * 22, 3) * 18 + dr.x, sy = shk * nz(t * 22, 4) * 18 + dr.y;

  darkFastR(ctx, t, .4 - .2 * pan, 19, 850 + (0 - cy) * z - 40);
  ctx.save();
  cam(ctx, cx, cy, z, dr.r + shk * nz(t * 15, 5) * .01, sx, sy);
  const M = ctx.getTransform();

  const lit = .25 + .45 * P(t, tKk - .3, tKk + .5, E.inOutQ) + .2 * P(t, tJa - .1, tJa + .4) + .35 * rel;   // light from above
  const ly = lightY(t, tp), lx = RX + nz(t * .6, 3) * 14 * (1 - P(t, tp - .2, tp + .2));

  // ---- habitat interior above the floor (air) ----
  {
    const g = ctx.createLinearGradient(0, -900, 0, 0); g.addColorStop(0, '#020304'); g.addColorStop(1, rel > 0 ? window.PK.lerp2('#0a0f12', '#1a1a17', rel) : '#0a0f12');
    if (cy < 1100) { ctx.fillStyle = g; ctx.fillRect(RX - 760, -1100, 1520, 1100); }
    ctx.fillStyle = rgba('#8aa0aa', .035 + .03 * rel); for (let x = RX - 700; x < RX + 760; x += 150) ctx.fillRect(x, -1100, 9, 1100);
    ctx.fillStyle = rgba('#8aa0aa', .05); ctx.fillRect(RX - 760, -420, 1520, 6);
  }
  // cold light pouring down from the opening above (volumetric)
  if (cy < 1150) godrays(ctx, RX, -720, Math.PI / 2, .55, 1000, '#dff3ff', .12 * lit, t, 5);
  glow(ctx, RX, -10, 320, '#cfe8ff', .1 * lit);

  // ---- seabed under the line ----
  {
    const g = ctx.createLinearGradient(0, BED, 0, BED + 600); g.addColorStop(0, '#120f0b'); g.addColorStop(1, '#020202');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-600, BED + 30);
    for (let x = -600; x <= 3200; x += 40) ctx.lineTo(x, BED - SL * Math.max(0, x - X1) * .9 + nz(x * .01, 7) * 8);
    ctx.lineTo(3200, BED + 900); ctx.lineTo(-600, BED + 900); ctx.closePath(); ctx.fill();
  }
  // ---- pipe: steel walls (section), water inside ----
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  pipePath(ctx, -14); ctx.strokeStyle = '#0a0d0f'; ctx.lineWidth = 2 * (RR + WL) + 6; ctx.stroke();
  ctx.strokeStyle = '#323d43'; ctx.lineWidth = 2 * (RR + WL); ctx.stroke();
  ctx.strokeStyle = rgba('#8c9ba3', .5); ctx.lineWidth = 2 * RR + 5; ctx.stroke();
  const wg = ctx.createLinearGradient(0, SURF, 0, LY + RR); wg.addColorStop(0, '#1a3b44'); wg.addColorStop(.06, '#0f262d'); wg.addColorStop(.3, '#071318'); wg.addColorStop(1, '#030607');
  pipePath(ctx, SURF); ctx.strokeStyle = wg; ctx.lineWidth = 2 * RR; ctx.stroke();
  ctx.restore();
  // seams along the riser and the line
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  for (let y = 240; y < BY - 40; y += 270) { ctx.fillRect(RX - RR - WL, y, WL, 7); ctx.fillRect(RX + RR, y, WL, 7); }
  for (let x = X1 + 160; x < X1 + 2600; x += 300) { const yy = lineY(x); ctx.save(); ctx.translate(x, yy); ctx.rotate(-Math.atan(SL)); ctx.fillRect(0, -RR - WL, 7, WL); ctx.fillRect(0, RR, 7, WL); ctx.restore(); }
  ctx.fillStyle = 'rgba(160,190,205,.07)';
  for (let y = 240; y < BY - 40; y += 270) { ctx.fillRect(RX - RR - WL, y - 3, WL, 2); ctx.fillRect(RX + RR, y - 3, WL, 2); }
  // air above the riser water (inside the mouth)
  ctx.fillStyle = '#05090b'; ctx.fillRect(RX - RR, -14, RR * 2, SURF + 14);
  // trapped air further down the line (it rises away from the elbow)
  {
    const xa = X1 + 10 / SL; ctx.beginPath(); ctx.moveTo(xa, WS);
    for (let x = xa; x <= X1 + 2600; x += 40) ctx.lineTo(x, crown(x)); ctx.lineTo(X1 + 2600, WS); ctx.closePath(); ctx.fillStyle = '#040608'; ctx.fill();
    ctx.strokeStyle = rgba('#8fd3e8', .3); ctx.lineWidth = 2; ctx.beginPath();
    for (let x = xa; x <= X1 + 2600; x += 16) { const yy = WS + Math.sin(x * .03 - t * 1.2) * 1.2; x === xa ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
  }

  // ---- light inside the riser water: from above, and his own ----
  ctx.save(); if (cy > 850) ctx.clip(inner()); ctx.beginPath(); ctx.rect(RX - RR - (cy > 850 ? 400 : 0), SURF, cy > 850 ? 4000 : RR * 2, 4000); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  {
    const g = ctx.createLinearGradient(0, SURF, 0, SURF + 620); g.addColorStop(0, rgba('#8fd3e8', .17 * Math.min(1, lit))); g.addColorStop(.3, rgba('#8fd3e8', .04 * Math.min(1, lit))); g.addColorStop(1, 'rgba(143,211,232,0)');
    ctx.fillStyle = g; ctx.fillRect(RX - RR, SURF, RR * 2, 620);
    // caustic shimmer near the top
    for (let i = 0; i < 16; i++) {
      const yy = SURF + 10 + hi(i * 7 + 1) * 260 + nz(t * .7 + i, 60) * 20, xx = RX - RR + hi(i * 3 + 2) * RR * 2 + nz(t * .9 + i * 3, 61) * 16;
      const al = .1 * lit * (.5 + .5 * Math.sin(t * 3.1 + i * 1.7)) * (1 - (yy - SURF) / 300);
      ctx.fillStyle = rgba('#cfe8ff', Math.max(0, al)); ctx.fillRect(xx, yy, 20 + 26 * hi(i * 5), 2);
    }
    // his warm light reaching into the water around him
    if (ly > SURF - 10) { const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, 420); g2.addColorStop(0, rgba('#ff9a3c', .13)); g2.addColorStop(1, 'rgba(255,154,60,0)'); ctx.fillStyle = g2; ctx.fillRect(lx - 420, ly - 420, 840, 840); }
  }
  ctx.globalCompositeOperation = 'source-over';
  // bubbles from his tank rising to the surface
  ctx.lineWidth = 1.6;
  const bubOn = 1 - P(t, tBr - .1, tBr + .1);
  for (let i = 0; i < 26; i++) {
    const per = .5 + hi(i * 3 + 5) * .6, off = hi(i * 7 + 9) * per, ts = Math.floor((t + off) / per) * per - off, age = t - ts;
    const y0 = lightY(ts, tp) - 36, by = y0 - age * (230 + 140 * hi(i * 11 + Math.floor((t + off) / per)));
    if (by < SURF + 4 || ts < -.5 || ts > tBr - .2) continue;
    const bx = RX + (hi(i * 13 + Math.floor((t + off) / per) * 3) - .5) * 60 + Math.sin(age * 5 + i) * 7, r = 2.2 + 4 * hi(i * 17);
    ctx.strokeStyle = rgba('#d8f6ff', .45 * Math.min(1, age * 2.5) * bubOn); ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
  }
  ctx.restore();
  // the water surface inside the riser (ripples where the hands go in, a burst when he comes out)
  {
    const hIn = P(t, tGe + .05, tGe + .35), rip = .6 + 2.5 * hIn * (1 - P(t, tp, tp + .3)) + 9 * Math.exp(-Math.max(0, t - tBr) * 4) * (t > tBr - .03 ? 1 : 0);
    const sy = x => SURF + Math.sin(x * .09 - t * 5) * rip * .5 + Math.sin(x * .05 + t * 3.3) * rip * .5;
    ctx.save(); ctx.beginPath(); ctx.rect(RX - RR, -14, RR * 2, SURF + 40); ctx.clip();
    ctx.fillStyle = rgba('#1a3b44', .9); ctx.beginPath(); ctx.moveTo(RX - RR, SURF + 30); for (let x = RX - RR; x <= RX + RR + 4; x += 4) ctx.lineTo(x, sy(x)); ctx.lineTo(RX + RR, SURF + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#bfe9ff', .35 + .3 * lit); ctx.lineWidth = 2.2; ctx.beginPath();
    for (let x = RX - RR; x <= RX + RR + 4; x += 4) { const yy = sy(x); x === RX - RR ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
    ctx.restore();
  }
  // floor plate of the habitat around the mouth + flange
  {
    const g = ctx.createLinearGradient(0, -2, 0, 34); g.addColorStop(0, '#59666e'); g.addColorStop(.25, '#2a3338'); g.addColorStop(1, '#101518');
    ctx.fillStyle = g; ctx.fillRect(RX - 760, -2, 760 - RR - WL - 16, 34); ctx.fillRect(RX + RR + WL + 16, -2, 760 - RR - WL - 16, 34);
    ctx.fillStyle = '#4a565d'; ctx.fillRect(RX - RR - WL - 14, -16, 2 * (RR + WL + 14), 14); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(RX - RR - WL - 14, -5, 2 * (RR + WL + 14), 3);
    ctx.fillStyle = rgba('#dff3ff', .12 * lit); ctx.fillRect(RX - 760, -2, 1520, 2);
    ctx.fillStyle = '#0d1114'; for (let k = -3; k <= 3; k++) { if (!k) continue; ctx.beginPath(); ctx.arc(RX + k * (RR + WL + 2) / 3.2, -9, 3, 0, 7); ctx.fill(); }
  }
  // far down the line: the dark swallows it; four dim lights stay where they are
  {
    const g = ctx.createLinearGradient(1080, 0, 1900, 0); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.8)');
    ctx.fillStyle = g; ctx.fillRect(980, LY - 600, 2400, 1000);
    souls(ctx, t, FAR.map((x, i) => ({ x, y: (crown(x) + WS) / 2 - 1 + nz(t * .4, 20 + i) * 1.5, a: .4, s: .68 })), { bpm: 64 });
  }

  // ---- the volunteers ----
  const va = P(t, tJa - .2, tJa + .2, E.outQ), lean = P(t, tJm - .25, tGe + .05, E.inOutQ), pull = P(t, tp - .02, tp + .42, E.outC);
  const hands = [-1, 1].map(s => {
    const rest = [RX + s * 158, -40], R1 = [RX + s * 42, SURF - 14], R2 = [RX + s * 36, SURF + 34];
    let h = [lerp(rest[0], R1[0], lean), lerp(rest[1], R1[1], lean)];
    const k2 = P(t, tGe, tGe + .35, E.inOutQ); h = [lerp(h[0], R2[0], k2), lerp(h[1], R2[1], k2)];
    const k3 = P(t, tp - .2, tp, E.inOutQ); h = [lerp(h[0], lx + s * 26, k3), lerp(h[1], ly - 4, k3)];
    return h;
  });
  const vin = 1 - P(t, tJa - .2, tJa + .5, E.outC);
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 110 * vin, -30 * vin); volunteer(ctx, t, s, { a: va, lean, pull, hand: hands[s < 0 ? 0 : 1], rim: .5 + .5 * lit, warm: rel, lamp: P(t, tJa, tJa + .5) }); ctx.restore(); }

  // ---- him ----
  const under = ly > SURF;
  if (under) glow(ctx, lx, ly, 150, '#8fd3e8', .06);
  const bpm = lerp(96, 124, P(t, 2.4, tp, E.inQ)) - 22 * rel;
  glow(ctx, lx, ly, 240 + 60 * rel, '#ff9a3c', .08 + .1 * rel);
  souls(ctx, t, [{ x: lx, y: ly, a: .95, s: 1 + .25 * rel }], { bpm });
  // splash + bloom as he breaks the surface
  const u = t - tBr;
  if (u > -.02 && u < 1.1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const vx = (hi(i * 3 + 1) - .5) * 520, vy = 380 + 520 * hi(i * 5 + 2), uu = Math.max(0, u - hi(i * 7) * .06);
      const x = RX + (hi(i * 11) - .5) * 120 + vx * uu, y = SURF - vy * uu + 1100 * uu * uu, a = .8 * (1 - uu / 1.1) * clamp(uu * 20);
      if (a <= 0 || y > SURF + 6) continue;
      ctx.strokeStyle = rgba(i % 3 ? '#cfe8ff' : '#ffe2b0', a); ctx.lineWidth = 2 + 2 * hi(i * 13); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * .025, y + (vy - 2200 * uu) * .025); ctx.stroke();
    }
    ctx.restore();
    glow(ctx, RX, SURF - 10, 340, '#fff1d8', .55 * Math.exp(-Math.max(0, u) * 3.2) * clamp(u * 12 + .3));
  }
  // silt drifting through the beam (faster while the hours pass)
  {
    const fast = P(t, t3 - .1, t3 + .4) * (1 - P(t, 1.25, 1.9));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const xx = cx + (hi(i * 3 + 7) * 2 - 1) * 640 / z, sp = 10 + 160 * fast;
      const yy = cy + ((((hi(i * 5 + 9) * 1400 - t * sp * (.5 + hi(i * 7)) - fast * t * 260) % 1400) + 1400) % 1400 - 700) / z;
      const len = 1.5 + 22 * fast * hi(i * 9);
      ctx.fillStyle = rgba('#9cc9d6', .1 + .12 * hi(i * 11)); ctx.fillRect(xx, yy, 1.6 / z + .6, len / z + 1.4);
    }
    ctx.restore();
  }
  const ls = M.transformPoint(new DOMPoint(lx, ly)), rs = M.transformPoint(new DOMPoint(RX + RR + WL + 4, ly));
  ctx.restore();

  // ---- screen space ----
  // keep the subtitle band dark and quiet
  { const g = ctx.createLinearGradient(0, 1170, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.86)'); ctx.fillStyle = g; ctx.fillRect(0, 1170, W, 120); ctx.fillStyle = 'rgba(1,2,3,.86)'; ctx.fillRect(0, 1290, W, H - 1290); }
  // tunnel vision: tight while he is under, opens as he comes out
  const ik2 = lerp(.6, .74, P(t, .5, tp, E.inOutQ)) * (1 - .82 * rel);
  iris(ctx, ik2, .5 * beat(t, bpm) + .5 * (.5 + .5 * Math.sin(t * Math.PI * 2 * .45)), lerp(540, ls.x, .7), lerp(820, ls.y, .6));
  // warm air and light after the breach
  if (rel > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(ls.x, ls.y, 0, ls.x, ls.y, 640); g.addColorStop(0, rgba('#ffcf8a', .14 * rel)); g.addColorStop(.5, rgba('#ffcf8a', .035 * rel)); g.addColorStop(1, 'rgba(255,207,138,0)');
    ctx.fillStyle = g; ctx.fillRect(ls.x - 640, ls.y - 640, 1280, 1280); ctx.restore();
  }
  // '수직관' tag on the riser
  const ta = P(t, tSu - .05, tSu + .3, E.outQ) * (1 - P(t, tJa - .2, tJa + .15));
  if (ta > 0) {
    const yy = clamp(rs.y, 620, 1000), x0 = rs.x + 6, x1 = x0 + 70 * ta;
    ctx.save(); ctx.globalAlpha = ta; ctx.strokeStyle = 'rgba(160,220,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,.55)'; ctx.beginPath(); ctx.arc(x0, yy, 3.5, 0, 7); ctx.fill(); ctx.restore();
    chip(ctx, '수직관', x1 + 74, yy, ta, { size: 32 });
  }
  // time strip: 오후 2:45경 사고 -> 오후 5:45경 구조, 약 3시간
  const sa = P(t, t3 - .12, t3 + .22, E.outQ) * (1 - P(t, tJa + .2, tJa + .55, E.inQ));
  timeStrip(ctx, t, sa, P(t, t3 + .05, tDw + .45, E.inOutQ), P(t, t3 - .05, t3 + .3), P(t, tDw + .25, tDw + .55, E.outQ), (info.sc.data || {}).t_in || '오후 2:45경 사고', (info.sc.data || {}).t_out || '오후 5:45경 구조 (조사위원회)');
  // breaking through into the air: a warm flash
  flash(ctx, .24 * Math.exp(-Math.max(0, t - tBr) * 5) * P(t, tBr - .06, tBr), '#fff1d8');
};
})();
