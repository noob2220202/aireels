// decision: "물이 차올라 숨 쉴 틈이 15센티미터만 남자, 부드램은 혼자 나가 도움을 데려오기로 합니다."
// Same side cutaway as "crawl" (the pipe very slightly rising to the right, so the air gap is a little larger there).
// '물이' -> the oil shivers, bubbles; '차올라' -> it surges up fast until only a thin air gap is left at the top; the lights
// are pushed up and flatten against the steel; the air-gap gauge drops and turns red, the tunnel vision tightens and the
// heart races ('15센티미터만' + approved label). Once the surge settles, swell crests keep running along the surface; the
// first ones reach the crown and briefly press each light flat and dim it (bubbles burst out), the later ones are lower.
// '남자' -> the conditions as two static chips under the pipe: '숨 쉴 틈 ≈ 15cm (6인치)' and '공기통 2개' (a two-tank glyph
// in the chip, attached to no light), both gone as he moves. '부드램은' -> the front light turns, then only starts to pull
// away (left); its thread to the light behind stretches thin but holds (leave picks it up); the other two draw back a
// little to the right where there is more air; the fifth stays dim and far back.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, camera, text, roundRect, flash } = L;
const { at, souls, beat, chip, gapMeter } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
const drift2 = (t, amt, s) => ({ x: fb(t * .35, s) * 16 * amt, y: fb(t * .3, s + 9) * 16 * amt, r: fb(t * .25, s + 4) * .006 * amt });
const shake2 = (t, k, s) => ({ x: k * nz(t * 22, s + 1) * 18, y: k * nz(t * 22, s + 2) * 18, r: k * nz(t * 15, s + 3) * .01 });

function sheenTexLite() {
  if (window.PK._sheenLite) return window.PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLite = c; return c;
}
function darkFastD(ctx, t, { k = 1, seed = 1, base = '#010203' } = {}) {
  const [b, x] = L.buf('pkDarkFast', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  if (k > 0) {
    const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
      x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}
function iris(ctx, k, pulse, cx = 540, cy = 840) {
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// inner back wall (oily streaked steel), visible only where the lights reach it
function wallTex() {
  if (window.PK._crawlWallTex) return window.PK._crawlWallTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  const id = x.createImageData(512, 160);
  for (let j = 0; j < 160; j++) for (let i = 0; i < 512; i++) {
    const u = i / 512, v = j / 160;
    const n = fb(v * 14 + fb(u * 3, 13) * 1.2, 17, 4) * .9 + fb(u * 22 + v * 4, 19) * .35 + (hi(i * 3 + j * 1013) - .5) * .18;
    const val = clamp(.42 + n * 1.3), o = (j * 512 + i) * 4;
    id.data[o] = 205 * val; id.data[o + 1] = 172 * val; id.data[o + 2] = 140 * val; id.data[o + 3] = 255 * Math.pow(val, 1.3);
  }
  x.putImageData(id, 0, 0); window.PK._crawlWallTex = c; return c;
}

// ---- geometry: crawl's pipe, tilted a hair (right end higher); the fluid surface stays level ----
const TB = { cy: 820, r: 190, wall: 18, X0: 560, SL: -.026 };
const yc = x => TB.cy + TB.SL * (x - TB.X0);
const topY = x => yc(x) - TB.r, botY = x => yc(x) + TB.r;
const LV0 = .263, LV1 = .8;                                   // 20 of 76 cm -> about 15 cm of air left

function interior(ctx, x0, x1) { ctx.beginPath(); ctx.moveTo(x0, topY(x0)); ctx.lineTo(x1, topY(x1)); ctx.lineTo(x1, botY(x1)); ctx.lineTo(x0, botY(x0)); ctx.closePath(); }
function band(ctx, x0, x1, y0f, y1f) { ctx.beginPath(); ctx.moveTo(x0, y0f(x0)); ctx.lineTo(x1, y0f(x1)); ctx.lineTo(x1, y1f(x1)); ctx.lineTo(x0, y1f(x0)); ctx.closePath(); }

const START = [452, 520, 592, 662, 905];
// two small horizontal tanks (a condition glyph inside the chip; never drawn on a light)
function tankChip(ctx, s, x, y, a) {
  if (a <= 0) return;
  const size = 32, tw = L.measure(ctx, s, size, L.FONT.sub, 800), iw = 58, w = tw + iw + 52, h = size + 24, x0 = x - w / 2;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(4,10,14,.84)'; roundRect(ctx, x0, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(143,211,232,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(191,233,255,.9)'; ctx.fillStyle = 'rgba(191,233,255,.9)'; ctx.lineWidth = 2;
  const gx = x0 + 22 + 8;
  for (const dy of [-8, 8]) { roundRect(ctx, gx, y + dy - 6, 44, 12, 6); ctx.stroke(); ctx.fillRect(gx - 7, y + dy - 3, 5, 6); }
  ctx.restore();
  text(ctx, s, x0 + 22 + iw + 4, y + 2, { size, weight: 800, color: '#cfe8ff', align: 'left', alpha: a });
}

window.PK.scenes.decision = function (ctx, t, d, info) {
  const tW = at(info, '물이', .02), tR = at(info, '차올라', .07), t15 = at(info, '15센티미터만', .28), tNam = at(info, '남자', .42);
  const tB = at(info, '부드램은', .54), tA = at(info, '혼자', .63), tN = at(info, '나가', .68), tH = at(info, '도움을', .74);

  // ---- the fluid ----
  const rise = E.inOutC(P(t, tR - .05, tR + 1.15));
  const slosh = t > tR + 1.15 ? .016 * Math.sin((t - tR - 1.15) * 7.5) * Math.exp(-(t - tR - 1.15) * 2.4) : 0;
  const shiver = -.008 * Math.sin(P(t, tW - .05, tR) * Math.PI);  // anticipation: the oil draws back a little
  const level = lerp(LV0, LV1, rise) + slosh + shiver;
  const riseV = Math.sin(P(t, tR - .05, tR + 1.15) * Math.PI);       // how violently it is moving
  const S0 = TB.cy + TB.r - level * 2 * TB.r;
  const wav = 2 + 7 * riseV;
  // swell crests once the surge has settled (mean level unchanged): bumps running right -> left along the surface.
  // The first two (before '부드램은') reach the crown; the later ones stay lower and never cover a light.
  const XM = 557, CV = 330, CW = 52, CT = 1.7;
  // (the second one has cleared his light before '부드램은', so nothing dims him as he decides)
  const CRESTS = [[tR + 1.33, 1.3], [Math.min(tR + 2.33, tB - .55), 1.3], [tB + .97, .38], [tB + 2.07, .34], [tB + 3.17, .3]];
  const g0 = S0 - topY(XM);
  // wave profile: steep front (left, the direction of travel), longer back, shallow troughs either side
  const prof = dx => Math.exp(-Math.pow(dx / (dx < 0 ? CW * .75 : CW * 1.25), 2)) - .22 * Math.exp(-Math.pow((Math.abs(dx) - 2.1 * CW) / (1.1 * CW), 2));
  const bump = x => { let b = 0; for (const [tc, am] of CRESTS) { const u = t - tc; if (Math.abs(u) > CT / 2) continue; const xc = XM - CV * u; b += am * g0 * Math.pow(Math.cos(Math.PI * u / CT), 2) * prof(x - xc); } return b; };
  const surf0 = x => S0 + Math.sin(x * .021 - t * (1.4 + 4 * riseV)) * wav * .6 + Math.sin(x * .057 + t * 1.1) * wav * .4;
  const surf = x => Math.max(topY(x) + 2, surf0(x) - bump(x));
  const gapAt = x => Math.max(6, S0 - bump(x) - topY(x));

  // ---- the lights ----
  const mv = [[], [], [], [], []];
  // he turns, then only starts to pull away (the separation itself happens in "leave"); the light behind leans after him,
  // the other two draw back a little towards the air
  mv[0].push([tB - .2, .22, 9], [tB + .05, .7, -34], [tA + .25, .68, -30], [tN + .6, .7, -22]);
  mv[1].push([tA + .45, .8, -8]);
  for (let i = 2; i < 4; i++) mv[i].push([tA + .1 + i * .08, .95, 22], [tH + .25 + i * .1, .95, 16]);
  const xAt = (i, tt) => { let x = START[i]; for (const [a, dd, dx] of mv[i]) x += dx * E.inOutQ(clamp((tt - a) / dd)); return x; };
  const mvg = (i, tt) => { let m = 0; for (const [a, dd] of mv[i]) m = Math.max(m, Math.sin(clamp((tt - a) / dd) * Math.PI)); return m; };
  const press = P(level, .55, .78);
  const bpm = lerp(98, 128, P(t, tR, t15 + .3, E.inOutQ)) - 12 * P(t, tB, d);
  const Ls = [];
  for (let i = 0; i < 5; i++) {
    const x = xAt(i, t), g = gapAt(x), m = mvg(i, t);
    let y = Math.min(surf(x) - 24, topY(x) + .45 * g) + nz(t * (1.2 + 3 * riseV), i + 3) * (1.5 + 5 * riseV) - 4 * m;
    y = Math.max(y, topY(x) + 14);
    let a = i < 4 ? .84 * (.9 + .1 * nz(t * 7, i + 9)) * (hi(Math.floor(t * 14) + i * 97) > .95 ? .75 : 1) : .22;
    if (i === 0) a *= 1 + .18 * Math.exp(-Math.pow((t - tB + .05) / .25, 2)) + .1 * m;
    const cover = i < 4 ? 1 - clamp((g - 10) / 26) : 0;               // a crest has reached the crown here
    a *= 1 - .5 * cover;
    Ls.push({ x, y, a: clamp(a), s: i < 4 ? 1 : .5, m, cover });
  }

  // ---- camera ----
  const away = P(t, tB, tB + 2.6, E.inOutQ);
  const mid = (Ls[0].x + Ls[3].x) / 2;
  const camX = lerp(lerp(600, 572, P(t, tR, tR + 1.2, E.inOutQ)), mid, away);
  // push in hard with the surge until the sliver of air fills the upper frame; only a slight ease back as he turns
  const zoom = lerp(1.16, 2.2, P(t, tR - .1, t15 + .4, E.inOutQ)) - .12 * away;
  // frame on the air gap: it rides up the screen with the water, sits high (water fills the frame below it),
  // then settles a little lower for the hand-off to "leave"
  const gapC = (topY(camX) + Math.min(S0, TB.cy + TB.r - LV0 * 2 * TB.r)) / 2;
  const tgt = lerp(820, 620, P(t, tR, tR + 1.3, E.inOutQ)) + 130 * away;
  const camY = gapC + (960 - tgt) / zoom;
  const dr = drift2(t, 1, 33);
  // shake: the surge, each crest hitting the crown, and a faint heartbeat thump while the air is gone
  let sh = .3 * riseV + .12 * Math.exp(-Math.pow((t - tR) / .12, 2)) + .05 * beat(t, bpm) * press;
  for (const [tc, am] of CRESTS) if (am >= 1) sh += .1 * Math.exp(-Math.pow((t - tc) / .12, 2));
  const sk = shake2(t, sh, 33);

  darkFastD(ctx, t, { k: .3, seed: 11 });
  ctx.save();
  camera(ctx, { x: camX + (dr.x + sk.x) / zoom, y: camY + (dr.y + sk.y) / zoom, zoom, rot: dr.r + sk.r, t });
  const M = ctx.getTransform();
  const x0 = camX - 820 / zoom, x1 = camX + 820 / zoom;
  const yLim = x => (1232 - M.f - M.b * x) / M.d;     // world y of screen row 1232: keep the subtitle band clean below it

  // walls
  const wg = ctx.createLinearGradient(0, yc(camX) - TB.r - TB.wall, 0, yc(camX) - TB.r);
  wg.addColorStop(0, 'rgba(109,122,131,.09)'); wg.addColorStop(1, 'rgba(32,40,45,.13)');
  ctx.fillStyle = wg; band(ctx, x0, x1, x => topY(x) - TB.wall, topY); ctx.fill(); band(ctx, x0, x1, botY, x => botY(x) + TB.wall); ctx.fill();
  ctx.strokeStyle = 'rgba(160,190,201,.09)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, topY(x0)); ctx.lineTo(x1, topY(x1)); ctx.moveTo(x0, botY(x0)); ctx.lineTo(x1, botY(x1)); ctx.stroke();
  ctx.fillStyle = 'rgba(160,190,201,.035)';
  for (let x = Math.floor(x0 / 520) * 520 + 140; x < x1; x += 520) { ctx.fillRect(x, topY(x) - TB.wall, 3, TB.wall); ctx.fillRect(x, botY(x), 3, TB.wall); }

  // interior: back wall in the light, the fluid
  ctx.save(); interior(ctx, x0, x1); ctx.clip();
  {
    const xs = Ls.slice(0, 4).map(l => l.x), cxw = (Math.min(...xs) + Math.max(...xs)) / 2, hw = (Math.max(...xs) - Math.min(...xs)) / 2;
    const [b, x] = L.buf('decWall', 540, 960); x.clearRect(0, 0, 540, 960);
    x.setTransform(M.a / 2, M.b / 2, M.c / 2, M.d / 2, M.e / 2, M.f / 2);
    const tw = 900, ty = yc(cxw) - TB.r; for (let xx = Math.floor(x0 / tw) * tw; xx < x1; xx += tw) x.drawImage(wallTex(), xx, ty, tw, TB.r * 1.6);
    x.globalCompositeOperation = 'destination-in'; x.translate(cxw, Ls[1].y + 10); x.scale((hw + 240) / 250, 1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 250); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(-250, -250, 500, 500);
    const rx = hw + 240, cy0 = Ls[1].y + 10;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const [px, py] of [[cxw - rx, cy0 - 250], [cxw + rx, cy0 - 250], [cxw - rx, cy0 + 250], [cxw + rx, cy0 + 250]]) { const sx = M.a * px + M.c * py + M.e, sy = M.b * px + M.d * py + M.f; bx0 = Math.min(bx0, sx); bx1 = Math.max(bx1, sx); by0 = Math.min(by0, sy); by1 = Math.max(by1, sy); }
    bx0 = Math.max(0, Math.floor(bx0 / 2) * 2); by0 = Math.max(0, Math.floor(by0 / 2) * 2); bx1 = Math.min(W, Math.ceil(bx1)); by1 = Math.min(H, Math.ceil(by1));
    if (bx1 - bx0 > 4 && by1 - by0 > 4) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 * (1 - .55 * press) * (.9 + .1 * beat(t, bpm));
      ctx.drawImage(b, bx0 / 2, by0 / 2, (bx1 - bx0) / 2, (by1 - by0) / 2, bx0, by0, bx1 - bx0, by1 - by0); ctx.restore();
    }
  }
  // fluid body
  ctx.beginPath(); ctx.moveTo(x0, botY(x0) + 4);
  for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, surf(x));
  ctx.lineTo(x1, botY(x1) + 4); ctx.closePath();
  const gf = ctx.createLinearGradient(0, S0, 0, TB.cy + TB.r);
  gf.addColorStop(0, rgba('#16323a', .66)); gf.addColorStop(.12, rgba('#0d2229', .74)); gf.addColorStop(.55, rgba('#061014', .86)); gf.addColorStop(1, rgba('#020405', .92));
  ctx.fillStyle = gf; ctx.fill();
  // the lights reach a little way down into the oily water; suspended specks drift in it
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of Ls) {
    const sy = surf(l.x), dep = Math.min(260, yLim(l.x) - sy); if (l.a < .05 || dep < 20) continue;
    ctx.save(); ctx.translate(l.x, sy); ctx.scale(.34, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, dep); rg.addColorStop(0, rgba('#ff9a3c', .085 * l.a)); rg.addColorStop(.5, rgba('#ff9a3c', .025 * l.a)); rg.addColorStop(1, 'rgba(255,154,60,0)');
    ctx.fillStyle = rg; ctx.fillRect(-dep, 0, dep * 2, dep); ctx.restore();
  }
  for (let i = 0; i < 46; i++) {
    const px = camX + ((hi(i * 3 + 7) * 2 - 1) * 560 + t * 9 * (hi(i + 40) - .5) + nz(t * .3 + i, 50) * 20) / zoom;
    const py = lerp(S0 + 10, TB.cy + TB.r - 10, hi(i * 5 + 9)) + nz(t * .25 + i * 2, 51) * 14 - t * 4 * hi(i * 7);
    if (py < surf(px) + 6 || py > yLim(px) - 4) continue;
    ctx.fillStyle = rgba('#9cc9d6', .12 + .14 * hi(i * 11)); ctx.beginPath(); ctx.arc(px, py, .8 + 1.6 * hi(i * 13), 0, 7); ctx.fill();
  }
  ctx.restore();
  // bubbles boiling up while it rises
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const bub = .25 + .75 * P(t, tW - .1, tR + .2) * (1 - P(t, tR + 1.3, tR + 2.6));
  for (let i = 0; i < 34; i++) {
    const life = 1 + hi(i * 3 + 1) * .9, ph = ((t / life + hi(i * 7 + 2)) % 1);
    const bx = camX + (hi(i * 11 + 3) * 2 - 1) * 520 / zoom + Math.sin(t * 3 + i) * 6 * ph;
    const yb = Math.min(botY(bx) - 8, yLim(bx) - 8), by = lerp(yb, surf(bx) + 6, ph);
    if (by < surf(bx) + 3) continue;
    const r = (2 + 4 * hi(i * 13 + 4)) * (1 + ph * .5), a = bub * .32 * Math.sin(ph * Math.PI) * (i < 12 ? 1 : riseV + .15);
    if (a < .01) continue;
    ctx.strokeStyle = rgba('#bfe9ff', a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
  }
  ctx.restore();
  // where a crest closes the gap over a light: a burst of bubbles under it and a cold glint on the steel
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [tc, am] of CRESTS) {
    if (am < 1) continue;
    for (let i = 0; i < 4; i++) {
      const xi = xAt(i, tc), tb = tc + (XM - xi) / CV, u = t - tb; if (u < -.15 || u > 1.1) continue;
      const k = Math.round(tc * 10) * 17 + i * 5;
      const sp = Math.exp(-Math.pow(u / .14, 2));
      if (sp > .02) { const ty = topY(xi), lg = ctx.createLinearGradient(xi - 70, 0, xi + 70, 0); lg.addColorStop(0, 'rgba(207,232,255,0)'); lg.addColorStop(.5, rgba('#cfe8ff', .3 * sp)); lg.addColorStop(1, 'rgba(207,232,255,0)'); ctx.fillStyle = lg; ctx.fillRect(xi - 70, ty, 140, 4); }
      if (u < 0) continue;
      for (let b = 0; b < 9; b++) {
        const q = u / (.6 + .5 * hi(k + b * 3)); if (q > 1) continue;
        const bx = xi + (hi(k + b * 7 + 1) * 2 - 1) * 34 + Math.sin(u * 9 + b) * 3;
        const y0b = surf(bx) + 14 + 46 * hi(k + b * 11 + 2), by = lerp(y0b, surf(bx) + 3, Math.pow(q, .8));
        if (by < surf(bx) + 2) continue;
        ctx.strokeStyle = rgba('#bfe9ff', .45 * Math.sin(q * Math.PI)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, 1.6 + 3 * hi(k + b * 13 + 3), 0, 7); ctx.stroke();
      }
    }
  }
  ctx.restore();
  // surface line (brighter while it churns)
  ctx.strokeStyle = rgba('#8fd3e8', .14 + .22 * riseV); ctx.lineWidth = 1.5 + riseV; ctx.beginPath();
  for (let x = x0; x <= x1 + 10; x += 10) { const y = surf(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  if (riseV > .02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const fx = x0 + hi(i * 5 + Math.floor(t * 12) * 41) * (x1 - x0); ctx.fillStyle = rgba('#cfe8ff', .25 * riseV * hi(i * 9 + 3)); ctx.fillRect(fx, surf(fx) - 1, 6 + 10 * hi(i), 1.5); }
    ctx.restore();
  }

  // the chain threads: the front one stretches and lets go
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const A = Ls[j], B = Ls[j + 1], dist = B.x - A.x;
    let al = (.24 + .2 * Math.max(A.m, B.m)) * Math.min(A.a, B.a);
    if (j === 0) al *= clamp(1 - (dist - 100) / 170);      // stretched thin as he pulls away, but it holds
    if (al < .01) continue;
    const taut = clamp((dist - 60) / 26), sag = lerp(10, 1.5, taut) * (1 - .6 * press);
    const ax = A.x + 13, ay = A.y + 2, bx = B.x - 13, by = B.y + 2, mx = (ax + bx) / 2, my = (ay + by) / 2 + sag + 2 * Math.sin(t * 1.4 + j);
    ctx.strokeStyle = rgba('#ff9a3c', al * .2); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    ctx.strokeStyle = rgba('#ffd9a0', al * .85); ctx.lineWidth = 1.4 * (j === 0 ? clamp(1.2 - (dist - 70) / 120, .3, 1) : 1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
  }
  ctx.restore();
  // wakes
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const ph = (t * 1.5 + j / 3 + i * .17) % 1, tt = t - ph * .9, am = mvg(i, tt), a = am * (1 - ph) * .32 * Ls[i].a; if (a < .01) continue;
    const ex = xAt(i, tt) + (i === 0 ? 12 : -12);
    ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(ex, surf(ex) + 1, 10 + ph * 60, 2 + ph * 4, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  }
  ctx.restore();
  // warm light on the crown of the pipe, stronger as they are pressed up to it
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of Ls) {
    if (l.a < .05) continue; const hw = 120 + 60 * press, ty = topY(l.x);
    const lg = ctx.createLinearGradient(l.x - hw, 0, l.x + hw, 0); lg.addColorStop(0, 'rgba(255,154,60,0)'); lg.addColorStop(.5, rgba('#ffb36b', (.06 + .2 * press) * l.a)); lg.addColorStop(1, 'rgba(255,154,60,0)');
    ctx.fillStyle = lg; ctx.fillRect(l.x - hw, ty, hw * 2, 3 + 5 * press);
  }
  ctx.restore();
  // the lights themselves (clipped by the steel: pressed flat against the crown)
  const ph = [0, .29, .47, .71, .55];
  for (let i = 4; i >= 0; i--) {
    const l = Ls[i];
    ctx.save(); ctx.translate(l.x, l.y); ctx.scale(1 + .22 * press, 1 - .2 * press);
    glow(ctx, 0, 0, 160, '#ff9a3c', .06 * l.a);
    souls(ctx, t + ph[i], [{ x: 0, y: 0, a: l.a, s: l.s * (1 + .08 * l.m) }], { bpm: bpm + 8 * l.m });
    ctx.restore();
  }
  // reflections
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of Ls) {
    const sy = surf(l.x), len = 54 * l.s; ctx.save(); ctx.translate(l.x, sy + len * .45); ctx.scale(.22, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, len); rg.addColorStop(0, rgba('#ffb347', l.a * .2)); rg.addColorStop(1, rgba('#ffb347', 0));
    ctx.fillStyle = rg; ctx.fillRect(-len, -len, len * 2, len * 2); ctx.restore();
    for (let s = 0; s < 3; s++) { const w = (16 - s * 4) * l.s * (.7 + .3 * Math.sin(t * 2.6 + s * 1.9 + l.x)); ctx.fillStyle = rgba('#ffc477', l.a * .1 * (1 - s / 3)); ctx.fillRect(l.x - w + Math.sin(t * 2 + s) * 4, sy + 4 + s * 11, w * 2, 1.5); }
  }
  ctx.restore();
  ctx.restore(); // interior clip

  // the remaining air gap, marked on the pipe at the front light (red, pulsing)
  const ga = P(t, t15 - .15, t15 + .2, E.outQ) * (1 - P(t, tB - .1, tB + .3));
  if (ga > 0) {
    const bx = Ls[0].x - 46, y0 = topY(bx) + 2, y1 = surf(bx) - 2, pu = .7 + .3 * Math.sin(t * 9);
    ctx.save(); ctx.globalAlpha = ga * pu; ctx.strokeStyle = '#e3262f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - 8, y0); ctx.lineTo(bx + 8, y0); ctx.moveTo(bx, y0); ctx.lineTo(bx, y1); ctx.moveTo(bx - 8, y1); ctx.lineTo(bx + 8, y1); ctx.stroke();
    ctx.restore(); glow(ctx, bx, (y0 + y1) / 2, 60, '#e3262f', .18 * ga * pu);
  }
  const scr = (x, y) => ({ x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f });
  const l0s = scr(Ls[0].x, Ls[0].y), l3s = scr(Ls[3].x, Ls[3].y), gcs = scr(camX, gapC);
  ctx.restore();

  // ---- tunnel vision: closes as the air goes, eases a little when he moves, follows him ----
  const brth = .5 + .5 * Math.sin(t * Math.PI * 2 * lerp(.4, .75, press));
  const ik = .52 + .34 * P(t, tR, t15 + .4, E.inOutQ) - .1 * away + .04 * P(t, tH, d);
  iris(ctx, ik, .5 * brth + .5 * beat(t, bpm), lerp(540, (l0s.x + l3s.x) / 2, away), gcs.y + 40);

  // ---- gauge (right, next to the sliver, 1.3x) + approved labels (under the pipe) ----
  const gv = clamp(gapAt(Ls[0].x) / (2 * TB.r));
  const gma = P(t, tR + .2, tR + .6, E.outQ) * (1 - P(t, tB - .2, tB + .25, E.inQ));
  if (gma > 0) { ctx.save(); ctx.translate(942, 572); ctx.scale(1.3, 1.3); gapMeter(ctx, 0, 0, 270, gv, { a: gma, label: '숨 쉴 틈', val: '', t }); ctx.restore(); }
  // the conditions behind the decision: static chips under the pipe, attached to no light, gone as he starts to move
  const out = 1 - P(t, tB + .3, tB + .65, E.inQ);
  const ca = P(t, t15 - .05, t15 + .3, E.outQ) * out;
  if (ca > 0) {
    const pu = .6 + .4 * Math.sin(t * 9);
    chip(ctx, '숨 쉴 틈 ≈ 15cm (6인치)', 540, 1098 + 10 * (1 - ca), ca, { size: 34, color: '#fff', border: rgba('#e3262f', .5 + .4 * pu), bg: 'rgba(30,4,6,.82)' });
  }
  const kc = P(t, tNam - .1, tNam + .25, E.outQ) * out;
  tankChip(ctx, '공기통 2개', 540, 1172 + 10 * (1 - kc), kc);

  // the moment the air closes in: a cold breath of light
  flash(ctx, .035 * Math.exp(-Math.pow((t - tR - .1) / .1, 2)), '#8fd3e8');
};
})();
