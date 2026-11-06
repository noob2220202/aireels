// blocked: "그는 동료들이 살아 있다고 외쳤지만, 파리아는 구조자 안전을 이유로 관 진입을 허가하지 않았습니다."
// Dusk at the berth, side cutaway (sky above, sea below). Opens close (z 1.8) on his light at the surface by the riser,
// calling out: a large bright ring goes out on each word ('동료들이' '살아' '있다고' '외쳤지만'), then fainter ones keep coming
// through the scene; they fade before they reach anything. '파리아는' -> the camera pulls back to the wide berth, revealing
// the line running off into the dark with the four dim lights (unchanged), and two sober cards come in under a brief static
// flicker (data.a, then data.b on '안전을'). '관 진입을' -> push in on the
// habitat / riser opening; '허가하지' -> a red bar closes over the opening and a '진입 불허' stamp lands (thunk, small shake).
// Then a slow drift down toward the four lights in the dark line (hand-off to "lost").
(function () {
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, roundRect, flash, FONT } = L;
const { at, souls, beat } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
function cam(ctx, x, y, z, rot, sx, sy) { ctx.translate(540 + sx, 850 + sy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-x, -y); }
function iris(ctx, k, pulse, cx, cy) {
  if (k <= 0) return;
  const r0 = H * lerp(.42, .1, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---- world (side view) ----
const SF = 720, DECK = 664, RXB = 380, HB = 866, HW = 150, HH = 108, BED = 1160, PR = 19;
const LYB = BED - PR - 8, XE = RXB + 70, SLB = .03;
const lineYB = x => LYB - SLB * Math.max(0, x - XE);
const FARB = [690, 752, 818, 884];
const surfY = (x, t) => SF + Math.sin(x * .018 + t * 1.3) * 3 + Math.sin(x * .007 - t * .8) * 2;
function pipePathB(ctx) { ctx.beginPath(); ctx.moveTo(RXB, HB + HH / 2 - 6); ctx.lineTo(RXB, LYB - 70); ctx.quadraticCurveTo(RXB, LYB, XE, LYB); ctx.lineTo(2400, lineYB(2400)); }

let SHORE = null;
function shore() {
  if (SHORE) return SHORE; const R = L.rng(57); const s = [];
  for (let x = -600; x < 2200;) { const k = R(); const w = 18 + R() * 56; s.push({ x, w, h: k < .32 ? 12 + R() * 16 : k < .46 ? 44 + R() * 40 : 4 + R() * 9, tank: k < .32, stack: k >= .32 && k < .46, lit: R(), ph: R() * 6 }); x += w + R() * 34; }
  SHORE = s; return s;
}
// rough red ink stamp sprite (cached)
let STAMP = null;
function stampSprite() {
  if (STAMP) return STAMP;
  const c = document.createElement('canvas'); c.width = 560; c.height = 220; const x = c.getContext('2d');
  x.translate(280, 110); x.fillStyle = x.strokeStyle = '#e3262f';
  x.font = `400 92px "${FONT.disp}"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.letterSpacing = '8px';
  const tw = x.measureText('진입 불허').width;
  x.fillText('진입 불허', 4, 6);
  x.lineWidth = 9; roundRect(x, -tw / 2 - 30, -78, tw + 60, 156, 12); x.stroke();
  x.lineWidth = 3; roundRect(x, -tw / 2 - 18, -66, tw + 36, 132, 8); x.stroke();
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out';
  const R = L.rng(91); for (let i = 0; i < 900; i++) { x.globalAlpha = R() * .75; x.beginPath(); x.arc(R() * 560, R() * 220, R() * 3.2 + .4, 0, 7); x.fill(); }
  for (let i = 0; i < 14; i++) { x.globalAlpha = .5 * R(); x.fillRect(R() * 560, R() * 220, 40 + R() * 120, 1 + R() * 2); }
  STAMP = c; return c;
}
// sober factual card: "label: body"
function card(ctx, t, s, y, a, glitchT, accent) {
  if (a <= 0) return;
  const i = s.indexOf(':'), lab = s.slice(0, i + 1), body = s.slice(i + 1);
  const size = 30, lw = measure(ctx, lab, size, FONT.sub, 900), bw = measure(ctx, body, size, FONT.sub, 700), w = lw + bw + 52, h = size + 30;
  const g = clamp(1 - (t - glitchT) / .3), jit = g > 0 ? (hi(Math.floor(t * 40) + 7) - .5) * 26 * g : 0, fl = g > 0 && hi(Math.floor(t * 30) + 3) > .6 ? .45 : 1;
  const x0 = 540 - w / 2 + jit;
  ctx.save(); ctx.globalAlpha *= a * fl;
  ctx.fillStyle = 'rgba(4,9,13,.86)'; roundRect(ctx, x0, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,220,.22)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = accent; ctx.fillRect(x0, y - h / 2 + 10, 3, h - 20);
  if (g > 0) { for (let k = 0; k < 4; k++) { const yy = y - h / 2 + hi(Math.floor(t * 30) * 5 + k) * h; ctx.fillStyle = rgba('#cfe8ff', .25 * g); ctx.fillRect(x0 - 10, yy, w + 20, 1.5); } }
  ctx.restore();
  text(ctx, lab, x0 + 22, y + 2, { size, weight: 900, color: '#ffffff', align: 'left', alpha: a * fl });
  text(ctx, body, x0 + 30 + lw, y + 2, { size, weight: 700, color: '#cfe0ea', align: 'left', alpha: a * fl });
}

window.PK.scenes.blocked = function (ctx, t, d, info) {
  const tCol = at(info, '동료들이', .05), tAl = at(info, '살아', .13), tIt = at(info, '있다고', .16), tSh = at(info, '외쳤지만', .2), tPa = at(info, '파리아는', .34),
    tGu = at(info, '구조자', .43), tAn = at(info, '안전을', .51), tIy = at(info, '이유로', .58), tGw = at(info, '관', .64), tJi = at(info, '진입을', .71), tHe = at(info, '허가하지', .77);
  const tSt = tHe;                                                        // the stamp lands on the thunk

  // ---- camera ----
  // opens close on him calling at the surface (he sits at screen y ~790), pulls back on '파리아는' to the wide berth + line
  const back = P(t, tPa - .3, tPa + 1.0, E.inOutQ), inn = P(t, tGw - .2, tHe + .1, E.inOutQ), down = P(t, tHe + .45, d + .6, E.inOutQ);
  const z0 = 1.8 * (1 + .04 * P(t, -.3, tPa, E.inOutQ));
  let cx = lerp(RXB + 178, 540, back), cy = lerp(SF - 10 + 60 / z0, 862, back), z = lerp(z0, 1.0, back);
  cx = lerp(cx, RXB + 60, inn); cy = lerp(cy, HB + 10, inn); z = lerp(z, 1.18, inn);
  cx = lerp(cx, 640, down); cy = lerp(cy, 945, down); z *= 1 + .08 * down;
  const dr = { x: fb(t * .35, 61) * 14, y: fb(t * .3, 70) * 14, r: fb(t * .25, 65) * .005 };
  const shk = .3 * Math.exp(-Math.max(0, t - tSt) * 7) * (t > tSt - .01 ? 1 : 0);
  ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  cam(ctx, cx, cy, z, dr.r + shk * nz(t * 15, 5) * .01, dr.x + shk * nz(t * 22, 3) * 18, dr.y + shk * nz(t * 22, 4) * 18);
  const M = ctx.getTransform();

  // ---- dusk sky ----
  {
    const g = ctx.createLinearGradient(0, 160, 0, SF); g.addColorStop(0, '#020409'); g.addColorStop(.45, '#070d19'); g.addColorStop(.8, '#121827'); g.addColorStop(.95, '#231f2a'); g.addColorStop(1, '#3a2a28');
    ctx.fillStyle = g; ctx.fillRect(-800, -400, 2800, SF + 400);
    glow(ctx, 980, SF, 520, '#ff8a4a', .09, 'screen');
    // long thin clouds drifting
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const y = 430 + hi(i * 5 + 1) * 230, x = ((hi(i * 7 + 2) * 2200 + t * (6 + 5 * hi(i))) % 2200) - 700, rw = 260 + 300 * hi(i * 3), rh = 6 + 8 * hi(i * 9);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rh / rw); const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
      cg.addColorStop(0, rgba(y > 600 ? '#5a4248' : '#2c3446', .35)); cg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = cg; ctx.fillRect(-rw, -rw, rw * 2, rw * 2); ctx.restore();
    }
    ctx.restore();
  }
  // distant industrial shoreline
  ctx.fillStyle = '#05070b';
  for (const s of shore()) {
    const by = SF - 1;
    if (s.tank) { ctx.fillRect(s.x, by - s.h, s.w, s.h); ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, by - s.h, s.w / 2, 3, 0, Math.PI, 0); ctx.fill(); }
    else if (s.stack) { ctx.fillRect(s.x + s.w * .4, by - s.h, 4, s.h); }
    else ctx.fillRect(s.x, by - s.h, s.w, s.h);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of shore()) {
    if (s.lit < .45) continue; const bl = s.stack ? (Math.sin(t * 2.4 + s.ph) > .2 ? 1 : .25) : .6 + .4 * Math.sin(t * .7 + s.ph);
    const lx = s.stack ? s.x + s.w * .4 + 2 : s.x + s.w * s.lit, ly = SF - 1 - s.h - 2;
    ctx.fillStyle = rgba(s.stack ? '#ff5a4a' : '#ffb347', .55 * bl); ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
  }
  ctx.restore();

  // ---- sea ----
  {
    const g = ctx.createLinearGradient(0, SF, 0, BED); g.addColorStop(0, '#0d2731'); g.addColorStop(.3, '#06161d'); g.addColorStop(1, '#020709');
    ctx.fillStyle = g; ctx.fillRect(-800, SF, 2800, BED - SF + 30);
    const ug = ctx.createLinearGradient(0, SF, 0, SF + 80); ug.addColorStop(0, 'rgba(140,170,190,.1)'); ug.addColorStop(1, 'rgba(140,170,190,0)'); ctx.fillStyle = ug; ctx.fillRect(-800, SF, 2800, 80);
  }
  // seabed
  {
    const g = ctx.createLinearGradient(0, BED, 0, BED + 300); g.addColorStop(0, '#120f0b'); g.addColorStop(1, '#020202');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-800, BED + 20);
    for (let x = -800; x <= 2200; x += 40) ctx.lineTo(x, BED - SLB * Math.max(0, x - XE) * .8 + nz(x * .012, 9) * 6);
    ctx.lineTo(2200, BED + 600); ctx.lineTo(-800, BED + 600); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,128,90,.18)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // berth: piles + deck + lamps
  for (let px = -480; px <= RXB - 70; px += 112) {
    const pg = ctx.createLinearGradient(px, 0, px + 16, 0); pg.addColorStop(0, '#2c353b'); pg.addColorStop(.4, '#161c20'); pg.addColorStop(1, '#090c0e');
    ctx.fillStyle = pg; ctx.fillRect(px, DECK, 16, BED - DECK + 10);
  }
  {
    const g = ctx.createLinearGradient(0, DECK - 14, 0, DECK + 12); g.addColorStop(0, '#3e484f'); g.addColorStop(.3, '#20272c'); g.addColorStop(1, '#0c1013');
    ctx.fillStyle = g; ctx.fillRect(-800, DECK - 14, RXB + 90 + 800, 26);
    ctx.fillStyle = '#0d1114'; for (let bx = -300; bx < RXB + 60; bx += 170) { ctx.fillRect(bx, DECK - 27, 14, 13); ctx.fillRect(bx - 4, DECK - 30, 22, 5); }
    for (const lx of [40, RXB + 40]) {
      ctx.fillStyle = '#0a0d10'; ctx.fillRect(lx, DECK - 150, 5, 136); ctx.fillRect(lx - 16, DECK - 152, 26, 5);
      const fl = .85 + .15 * nz(t * 6, lx);
      glow(ctx, lx - 10, DECK - 145, 90, '#ffb347', .3 * fl); ctx.fillStyle = rgba('#ffe2b0', .9 * fl); ctx.fillRect(lx - 15, DECK - 147, 12, 3);
      // its reflection in the water
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) { const yy = SF + 6 + k * 9, w = (16 - k * 1.6) * (.7 + .3 * Math.sin(t * 2.2 + k * 1.7 + lx)); ctx.fillStyle = rgba('#ffb347', .14 * (1 - k / 7)); ctx.fillRect(lx - 10 - w + Math.sin(t * 1.6 + k) * 3, yy, w * 2, 2); }
      ctx.restore();
    }
  }
  // umbilicals hanging slack from the deck to the habitat
  ctx.save(); ctx.lineCap = 'round';
  [[-30, '#5a4a2a', 3, 0], [-10, '#14181a', 3.6, 1.3], [14, '#4e4126', 2.4, 2.1]].forEach(([dx, c, lw, ph]) => {
    const sw = Math.sin(t * .6 + ph) * 8; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(RXB + 60 + dx * .4, DECK + 8);
    ctx.bezierCurveTo(RXB + 110 + sw, DECK + 90, RXB + dx + 30 - sw, HB - HH / 2 - 70, RXB + dx, HB - HH / 2 + 2); ctx.stroke();
  });
  ctx.restore();
  // riser + line (dark), habitat (unlit, flooded)
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  pipePathB(ctx); ctx.strokeStyle = '#0a0d0f'; ctx.lineWidth = PR * 2 + 4; ctx.stroke();
  ctx.strokeStyle = '#2b353b'; ctx.lineWidth = PR * 2; ctx.stroke();
  ctx.strokeStyle = '#05080a'; ctx.lineWidth = PR * 1.25; ctx.stroke();
  ctx.save(); ctx.translate(-PR * .55, -PR * .55); pipePathB(ctx); ctx.strokeStyle = rgba('#8c9ba3', .18); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.restore();
  {
    const g = ctx.createLinearGradient(RXB - HW / 2, 0, RXB + HW / 2, 0); g.addColorStop(0, '#2a2412'); g.addColorStop(.3, '#4a3d1c'); g.addColorStop(1, '#1a160b');
    roundRect(ctx, RXB - HW / 2, HB - HH / 2, HW, HH, 14); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.stroke();
    // flooded, unlit: panel seams and ribs only
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(RXB - HW / 2 + 4, HB + 6, HW - 8, 5);
    for (let k = 1; k < 4; k++) ctx.fillRect(RXB - HW / 2 + k * HW / 4 - 2, HB - HH / 2 + 6, 4, HH - 12);
    ctx.fillStyle = 'rgba(255,225,150,.07)'; ctx.fillRect(RXB - HW / 2 + 6, HB - HH / 2 + 5, HW - 12, 2);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(RXB - HW / 2 + 14 + k * (HW - 28) / 6, HB + HH / 2 - 9, 2, 0, 7); ctx.fill(); }
    const sh = ctx.createLinearGradient(0, HB - HH / 2, 0, HB + HH / 2); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
    roundRect(ctx, RXB - HW / 2, HB - HH / 2, HW, HH, 14); ctx.fillStyle = sh; ctx.fill();
    ctx.fillStyle = '#1e1a10'; ctx.fillRect(RXB - 20, HB - HH / 2 - 10, 40, 12);
  }
  // far line into the dark, four dim lights (unchanged)
  {
    const g = ctx.createLinearGradient(760, 0, 1500, 0); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, 'rgba(1,2,3,.85)');
    ctx.fillStyle = g; ctx.fillRect(760, SF + 20, 1800, BED - SF + 300);
    souls(ctx, t, FARB.map((x, i) => ({ x, y: lineYB(x) - 5 + nz(t * .4, 30 + i) * 1.2, a: .4, s: .5 })), { bpm: 64 });
  }
  // silt
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 50; i++) {
    const x = -200 + ((hi(i * 3 + 1) * 1600 + t * 6 * (hi(i) - .4) + nz(t * .2 + i, 80) * 30) % 1600 + 1600) % 1600, y = SF + 20 + hi(i * 5 + 2) * (BED - SF - 40) + nz(t * .15 + i * 2, 81) * 20;
    ctx.fillStyle = rgba('#9cc9d6', .08 + .1 * hi(i * 7)); ctx.beginPath(); ctx.arc(x, y, 1 + 1.4 * hi(i * 11), 0, 7); ctx.fill();
  }
  ctx.restore();

  // ---- him at the surface, calling out ----
  const hx = RXB + 178 + Math.sin(t * .9) * 3, hy = surfY(RXB + 178, t) - 10;
  // one strong call on each word ('동료들이' '살아' '있다고' '외쳤지만'), then fainter ones that keep coming
  const calls = [[-.1, .6], [tCol, 1], [tAl, 1.15], [tIt, 1], [tSh, 1.15]];
  for (let k = 1; k < 8; k++) calls.push([tSh + .3 + k * 1.05, .45]);
  let flare = 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  calls.forEach(([c, str]) => {
    const life = str > .5 ? 1.35 : 1.6, age = t - c; if (age < 0 || age > life) return;
    const r = 22 + age * (str > .5 ? 250 : 300), a = (str > .5 ? .9 : .55) * str * Math.pow(1 - age / life, 1.5) * clamp((440 - r * z) / 140); // gone before the title band
    flare = Math.max(flare, str * Math.exp(-age * 6));
    if (str > .5) { ctx.lineWidth = 12; ctx.strokeStyle = rgba('#ff9a3c', a * .18); ctx.beginPath(); ctx.arc(hx, hy, r, Math.PI, Math.PI * 2); ctx.stroke(); }
    ctx.lineWidth = str > .5 ? 3.4 : 2.4;
    ctx.strokeStyle = rgba('#ffcf8a', a); ctx.beginPath(); ctx.arc(hx, hy, r, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba('#ffcf8a', a * .3); ctx.beginPath(); ctx.ellipse(hx, hy, r, r * .9, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = rgba('#cfe8ff', a * .6); ctx.beginPath(); ctx.ellipse(hx, surfY(hx, t) + 1, r * 1.1, 3 + r * .03, 0, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();
  // reflection
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9; k++) { const yy = SF + 5 + k * 10, w = (22 - k * 2) * (.7 + .3 * Math.sin(t * 2.6 + k * 1.9)); ctx.fillStyle = rgba('#ffb347', .2 * (1 - k / 9)); ctx.fillRect(hx - w + Math.sin(t * 2 + k) * 4, yy, w * 2, 2.2); }
  ctx.restore();
  glow(ctx, hx, hy, 200, '#ff9a3c', .1 + .14 * flare);
  souls(ctx, t, [{ x: hx, y: hy, a: 1, s: 1.2 + .5 * flare }], { bpm: 112 });

  // ---- '진입 불허': a red bar closes over the opening, the stamp lands ----
  const bar = P(t, tSt - .16, tSt, E.inQ);
  if (bar > 0) {
    const by = HB - HH / 2 - 18 - (1 - bar) * 70, bw = HW + 70;
    ctx.save(); ctx.globalAlpha = clamp(bar * 3);
    ctx.fillStyle = '#e3262f'; ctx.fillRect(RXB - bw / 2, by - 8, bw, 16);
    ctx.save(); ctx.beginPath(); ctx.rect(RXB - bw / 2, by - 8, bw, 16); ctx.clip(); ctx.fillStyle = 'rgba(10,4,4,.85)';
    for (let x = RXB - bw / 2 - 20; x < RXB + bw / 2 + 20; x += 26) { ctx.beginPath(); ctx.moveTo(x, by + 8); ctx.lineTo(x + 12, by + 8); ctx.lineTo(x + 24, by - 8); ctx.lineTo(x + 12, by - 8); ctx.closePath(); ctx.fill(); }
    ctx.restore(); ctx.restore();
    glow(ctx, RXB, by, 220, '#e3262f', .22 * bar * (.75 + .25 * Math.sin(t * 6)));
  }
  const stA = P(t, tSt - .05, tSt + .06), stS = lerp(1.7, 1, E.outBack(P(t, tSt - .06, tSt + .2), 1.4));
  ctx.restore();
  const ms = M.transformPoint(new DOMPoint(RXB, HB + 14));

  // ---- screen space ----
  iris(ctx, .32 + .14 * P(t, tGw, tHe + .2, E.inOutQ) - .06 * down, .4 * beat(t, 112) + .6 * (.5 + .5 * Math.sin(t * Math.PI * 2 * .4)), 540, 820);
  // while close on him the subtitle band sits over open water: keep it dark (the wide shot has the seabed there already)
  if (back < 1) { const k = 1 - back, g = ctx.createLinearGradient(0, 1150, 0, 1290); g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(1, rgba('#010203', .78 * k)); ctx.fillStyle = g; ctx.fillRect(0, 1150, W, 140); ctx.fillStyle = rgba('#010203', .78 * k); ctx.fillRect(0, 1290, W, H - 1290); }
  // keep the title band quiet over the bright sky
  { const g = ctx.createLinearGradient(0, 380, 0, 500); g.addColorStop(0, 'rgba(1,2,3,.55)'); g.addColorStop(1, 'rgba(1,2,3,0)'); ctx.fillStyle = g; ctx.fillRect(0, 380, W, 120); }
  if (stA > 0) {
    const sp = stampSprite();
    glow(ctx, ms.x, ms.y, 260, '#e3262f', .14 * stA * Math.exp(-Math.max(0, t - tSt) * 2));
    ctx.save(); ctx.translate(ms.x + 40, ms.y + 6); ctx.rotate(-.07); ctx.scale(stS * .78, stS * .78); ctx.globalAlpha = stA * .95;
    ctx.drawImage(sp, -280, -110); ctx.restore();
  }
  // the cards (sober, small): what Paria said / what the commission found
  const dim = 1 - .25 * P(t, tSt - .1, tSt + .3);
  const out = 1 - P(t, tHe + .85, tHe + 1.3, E.inOutQ);
  const aA = P(t, tPa - .05, tPa + .25, E.outQ) * dim * out;
  const aB = P(t, tAn - .05, tAn + .25, E.outQ) * dim * out;
  card(ctx, t, info.sc.data.a, 518, aA, tPa - .05, 'rgba(200,210,218,.8)');
  card(ctx, t, info.sc.data.b, 594, aB, tAn - .05, '#8fd3e8');
  flash(ctx, .1 * Math.exp(-Math.max(0, t - tSt) * 9) * (t > tSt - .01 ? 1 : 0), '#e3262f');
};
})();
