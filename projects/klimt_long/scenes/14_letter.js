// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
// "곧 자기들이 훔쳤다가 선물로 돌려줬다는 편지가 신문사에 왔지만 확인된 건 없다."
// A newsroom desk seen from above, low-key: warm banker's lamp + cold daylight through blinds.
//  (push in)   an envelope addressed "지역 일간지 앞" skids onto the leather blotter (rustle), bounces, settles
//  곧/자기들이  the folded letter is drawn out of the envelope, flies to camera and unfolds (tri-fold panels)
//  자기들이     typed line '“우리가 훔쳤고,' strikes in letter by letter on the typing sfx
//  선물로       '도시에 주는 선물로' writes on; "선물" turns gold, a gold loop is drawn around it + sparkles
//  돌려줬다는   '돌려놓았다”' writes on with a gold "return" arrow underneath; attribution "— 자칭 범인들의 주장"
//  편지가       camera pulls back: the desk is revealed (envelope, newspaper, lamp, coffee steam); the cast
//               shadow of an editor leans in over the letter from the window side (F.figure silhouette)
//  신문사에     brackets lock on the envelope address, chip "2020.1 · 지역 일간지 「Libertà」 앞" pops
//  왔지만       push back in, tag "'도시에 주는 선물' 주장" drops in above the letter
//  확인된 건    a verification scan sweeps the page: text and gold fade to grey, "?" badges pop per line,
//               the rubber stamp hovers in (anticipation, growing shadow)
//  없다         slam: "진위 미확인" imprint, shake + flash + ink specks; the stamp lifts away, the shadow withdraws
// The desk / letter / lights are shared with 15_closed.js through window.KL.newsDesk so the fade between the
// two scenes is one continuous shot (the case folder slams down onto this same letter).
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;

// =====================================================================================================
// shared newsroom desk  (window.KL.newsDesk — also used by 15_closed.js)
// =====================================================================================================
const ND = (function () {
  const DX0 = -340, DY0 = -520, DW = 1760, DH = 2960;        // desk sprite world rect
  const LET = { x: 540, y: 862, w: 560, h: 700, r: -.022 };   // letter rest pose (world)
  const ENV = { x: 318, y: 1176, r: .085, w: 600, h: 330 };   // envelope rest pose (world)
  const LAMP = { x: 200, y: 640 };
  const CUP = { x: 918, y: 1160 };
  const NEWS = { x: 935, y: 650, s: .5, r: .2 };
  const END_CAM = [541, 950, 1.085, -.009];                   // letter's last camera = closed's first camera
  const SH_ROT = .2;                                          // cast-shadow direction (window top-right)
  const INK = '#1d2a44', GREY = '#8a8d94';
  const L1 = '“우리가 훔쳤고,', L2a = '도시에 주는 ', L2b = '선물', L2c = '로', L3 = '돌려놓았다”';
  const LY1 = -192, LY2 = -98, LY3 = -4, LYA = 92, TX = -232, FS = 50;
  const STAMP_XY = [28, 218];
  let S = null;

  const camAt = (keys, t) => {
    if (t <= keys[0][0]) return keys[0].slice(1);
    if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);
    let i = 0; while (keys[i + 1][0] < t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const u = (t - k1[0]) / (k2[0] - k1[0]), uu = u * u, uuu = uu * u, out = [];
    for (let j = 1; j < k1.length; j++) { const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j]; out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * uu + (-p0 + 3 * p1 - 3 * p2 + p3) * uuu)); }
    return out;
  };
  const OB = (x, s) => (x <= 0 ? 0 : E.outBack(Math.min(1, x), s));

  // ---------------- sprites ----------------
  function makeDesk() {
    const [c, x] = mk(DW, DH); x.translate(-DX0, -DY0); const R = rng(4141);
    let g = x.createLinearGradient(0, DY0, 0, DY0 + DH); g.addColorStop(0, '#22170f'); g.addColorStop(.45, '#1c130c'); g.addColorStop(1, '#110b07');
    x.fillStyle = g; x.fillRect(DX0, DY0, DW, DH);
    for (let py = DY0 + 60, k = 0; py < DY0 + DH; py += 380, k++) {
      const tone = (hash(k * 7 + 3) - .5) * 2;
      x.fillStyle = tone > 0 ? `rgba(255,200,150,${tone * .025})` : `rgba(0,0,0,${-tone * .12})`; x.fillRect(DX0, py, DW, 380);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(DX0, py, DW, 4); x.fillStyle = 'rgba(255,210,170,.06)'; x.fillRect(DX0, py + 4, DW, 2);
    }
    x.lineCap = 'round';
    for (let i = 0; i < 300; i++) {
      const y0 = DY0 + R() * DH, amp = 4 + R() * 16, fr = .0015 + R() * .004, ph = R() * 6.28, dark = R() < .62;
      x.strokeStyle = dark ? `rgba(0,0,0,${.08 + R() * .18})` : `rgba(255,205,160,${.02 + R() * .045})`;
      x.lineWidth = .8 + R() * 2.6; x.beginPath();
      for (let X = DX0; X <= DX0 + DW; X += 22) { const Y = y0 + Math.sin(X * fr + ph) * amp + Math.sin(X * fr * 3.3 + ph * 2) * amp * .3; X === DX0 ? x.moveTo(X, Y) : x.lineTo(X, Y); }
      x.stroke();
    }
    for (let i = 0; i < 7; i++) { // knots
      const kx = DX0 + R() * DW, ky = DY0 + R() * DH;
      for (let r = 6; r < 40; r += 6) { x.strokeStyle = `rgba(0,0,0,${.18 - r * .003})`; x.lineWidth = 2; x.beginPath(); x.ellipse(kx, ky, r * 2.4, r * .7, 0, 0, 7); x.stroke(); }
    }
    for (let i = 0; i < 16000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,220,180' : '0,0,0'},${R() * .05})`; x.fillRect(DX0 + R() * DW, DY0 + R() * DH, 2, 2); }
    // leather blotter
    const bx = 96, by = 372, bw = 888, bh = 1040;
    x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 30; x.shadowOffsetY = 10; x.fillStyle = '#10211a'; roundRect(x, bx, by, bw, bh, 14); x.fill(); x.restore();
    x.save(); roundRect(x, bx, by, bw, bh, 14); x.clip();
    g = x.createRadialGradient(470, 760, 60, 540, 880, 760); g.addColorStop(0, '#173226'); g.addColorStop(1, '#07100c'); x.fillStyle = g; x.fillRect(bx, by, bw, bh);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '200,255,220' : '0,0,0'},${R() * .05})`; x.beginPath(); x.arc(bx + R() * bw, by + R() * bh, R() * 1.8 + .3, 0, 7); x.fill(); }
    for (const [cx, cy, r] of [[790, 520, 66], [260, 1290, 58]]) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, r, .3, 5.6); x.stroke(); x.strokeStyle = 'rgba(160,120,70,.08)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r + 3, .5, 5.2); x.stroke(); }
    x.restore();
    x.save(); x.setLineDash([9, 7]); x.strokeStyle = 'rgba(214,180,110,.28)'; x.lineWidth = 2.5; roundRect(x, bx + 16, by + 16, bw - 32, bh - 32, 9); x.stroke(); x.restore();
    for (const [cx, cy, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
      x.fillStyle = '#0a1310'; x.beginPath(); x.moveTo(cx, cy + sy * 14); x.lineTo(cx, cy + sy * 150); x.lineTo(cx + sx * 150, cy); x.lineTo(cx + sx * 14, cy); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(214,180,110,.2)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + sx * 4, cy + sy * 140); x.lineTo(cx + sx * 140, cy + sy * 4); x.stroke();
    }
    // newspaper (right, under the letter)
    newspaper(x, NEWS.x, NEWS.y, NEWS.s, NEWS.r);
    // fountain pen
    x.save(); x.translate(905, 1000); x.rotate(1.32);
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 14; x.shadowOffsetY = 8;
    g = x.createLinearGradient(0, -11, 0, 11); g.addColorStop(0, '#3a3e44'); g.addColorStop(.35, '#0c0d10'); g.addColorStop(1, '#050506');
    x.fillStyle = g; roundRect(x, -150, -11, 250, 22, 11); x.fill(); x.shadowColor = 'transparent';
    x.fillStyle = '#c99a3a'; x.fillRect(-60, -12, 8, 24); x.fillRect(90, -12, 6, 24); x.fillRect(-140, -3, 90, 5);
    x.fillStyle = '#d9b46a'; x.beginPath(); x.moveTo(100, -8); x.lineTo(150, 0); x.lineTo(100, 8); x.closePath(); x.fill();
    x.restore();
    // reading glasses (left, below)
    x.save(); x.translate(168, 1232); x.rotate(-.32);
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 12; x.shadowOffsetY = 7; x.strokeStyle = '#0b0b0c'; x.lineWidth = 8;
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 64, 0, 52, 40, 0, 0, 7); x.stroke(); }
    x.beginPath(); x.moveTo(-14, -6); x.quadraticCurveTo(0, -18, 14, -6); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(-116, -6); x.lineTo(40, -26); x.moveTo(116, -6); x.lineTo(-40, -24); x.stroke();
    x.shadowColor = 'transparent';
    for (const s of [-1, 1]) { x.fillStyle = 'rgba(170,200,230,.08)'; x.beginPath(); x.ellipse(s * 64, 0, 48, 36, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; x.beginPath(); x.ellipse(s * 64, 0, 38, 27, 0, 3.6, 4.5); x.stroke(); }
    x.restore();
    // coffee cup on saucer (right, low)
    x.save(); x.translate(CUP.x, CUP.y);
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 26; x.shadowOffsetY = 12;
    g = x.createRadialGradient(-20, -20, 10, 0, 0, 108); g.addColorStop(0, '#ebe5d8'); g.addColorStop(1, '#9d9384'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 106, 0, 7); x.fill();
    x.shadowColor = 'transparent'; x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 84, 0, 7); x.stroke();
    x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 14; x.shadowOffsetX = 8; x.shadowOffsetY = 10;
    x.fillStyle = '#e9e3d6'; roundRect(x, 56, -16, 58, 32, 14); x.fill();
    g = x.createRadialGradient(-14, -14, 10, 0, 0, 72); g.addColorStop(0, '#fbf8f1'); g.addColorStop(1, '#c4bcab'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.fill(); x.restore();
    g = x.createRadialGradient(8, 8, 4, 0, 0, 58); g.addColorStop(0, '#3a1f0e'); g.addColorStop(.85, '#1c0e05'); g.addColorStop(1, '#4a2e18'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 57, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,240,220,.45)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 44, 3.7, 4.6); x.stroke();
    x.restore();
    // baked lighting: warm lamp pool (left) + cold blinds (top right) + low-key falloff around the letter
    x.save(); x.globalCompositeOperation = 'lighter';
    g = x.createRadialGradient(LAMP.x, LAMP.y, 20, LAMP.x + 150, LAMP.y + 140, 820);
    g.addColorStop(0, 'rgba(255,190,110,.2)'); g.addColorStop(.4, 'rgba(255,160,80,.075)'); g.addColorStop(1, 'rgba(255,150,70,0)');
    x.fillStyle = g; x.fillRect(LAMP.x - 700, LAMP.y - 700, 1700, 1700);
    x.globalAlpha = .1; x.translate(560, 300); x.rotate(SH_ROT); x.drawImage(blindsSprite(), -1150, -880, 2600, 2600);
    x.restore();
    g = x.createRadialGradient(560, 860, 230, 560, 900, 900); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.6, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,.8)');
    x.fillStyle = g; x.fillRect(DX0, DY0, DW, DH);
    return c;
  }
  function blindsSprite() { return S.blinds || (S.blinds = makeBlinds()); }
  function makeSoft() { // blurred black rounded rect for cheap 9-slice drop shadows (shadowBlur is slow)
    const [c, x] = mk(256, 256); x.filter = 'blur(22px)'; x.fillStyle = '#000'; roundRect(x, 64, 64, 128, 128, 10); x.fill(); x.filter = 'none'; return c;
  }
  // soft shadow under an axis-aligned rect (current transform), blur ~ b px
  function soft(ctx, x, y, w, h, b, a) {
    if (a <= 0) return; const k = b / 22, m = 64 * k, cs = 96 * k, iw = Math.max(1, w - 64 * k), ih = Math.max(1, h - 64 * k), X = x - m, Y = y - m, Sp = S.soft;
    ctx.save(); ctx.globalAlpha *= a;
    const xs = [[0, 96, X, cs], [96, 64, X + cs, iw], [160, 96, X + cs + iw, cs]], ys = [[0, 96, Y, cs], [96, 64, Y + cs, ih], [160, 96, Y + cs + ih, cs]];
    for (const [sx, sw, dx, dw] of xs) for (const [sy, sh, dy, dh] of ys) { if (sx === 96 && sy === 96) { ctx.fillStyle = '#000'; ctx.fillRect(dx, dy, dw + .5, dh + .5); } else ctx.drawImage(Sp, sx, sy, sw, sh, dx, dy, dw + .5, dh + .5); }
    ctx.restore();
  }
  function makeBlinds() { // cold daylight bands through blinds (half resolution, drawn x2)
    const [c, x] = mk(1300, 1300);
    for (let i = -2; i < 26; i++) {
      const y = i * 58, w = 30 + hash(i * 3) * 8;
      const g = x.createLinearGradient(0, y, 0, y + w); g.addColorStop(0, 'rgba(200,220,255,0)'); g.addColorStop(.3, 'rgba(210,228,255,1)'); g.addColorStop(.75, 'rgba(210,228,255,.85)'); g.addColorStop(1, 'rgba(200,220,255,0)');
      x.fillStyle = g; x.fillRect(0, y, 1300, w);
    }
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(820, 300, 80, 700, 560, 760); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1300, 1300);
    return c;
  }
  function makePaper() { // letter face base: paper, ruling, creases
    const [c, x] = mk(LET.w, LET.h); const R = rng(77);
    const pat = x.createPattern(L.TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(-130, -40));
    x.fillStyle = pat; x.fillRect(0, 0, LET.w, LET.h);
    x.fillStyle = 'rgba(255,252,244,.42)'; x.fillRect(0, 0, LET.w, LET.h);
    const g = x.createRadialGradient(LET.w / 2, LET.h / 2, 120, LET.w / 2, LET.h / 2, 520); g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(110,80,30,.28)'); x.fillStyle = g; x.fillRect(0, 0, LET.w, LET.h);
    x.strokeStyle = 'rgba(80,110,160,.2)'; x.lineWidth = 1.5;
    for (let y = 70; y < LET.h - 30; y += 47) { x.beginPath(); x.moveTo(30, y + 22); x.lineTo(LET.w - 30, y + 22); x.stroke(); }
    x.strokeStyle = 'rgba(190,60,60,.22)'; x.beginPath(); x.moveTo(36, 0); x.lineTo(36, LET.h); x.stroke();
    for (const fy of [LET.h / 3, LET.h * 2 / 3]) {
      let gg = x.createLinearGradient(0, fy - 10, 0, fy + 10); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(.48, 'rgba(60,40,10,.16)'); gg.addColorStop(.52, 'rgba(255,255,255,.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.fillRect(0, fy - 10, LET.w, 20);
    }
    for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '60,40,10'},${R() * .05})`; x.fillRect(R() * LET.w, R() * LET.h, 2, 2); }
    return c;
  }
  function makeBack() { // plain back side of the letter / folded panels
    const [c, x] = mk(LET.w, LET.h);
    const pat = x.createPattern(L.TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(-300, -260));
    x.fillStyle = pat; x.fillRect(0, 0, LET.w, LET.h); x.fillStyle = 'rgba(120,100,70,.16)'; x.fillRect(0, 0, LET.w, LET.h);
    return c;
  }
  function makeEnvelope() {
    const w = ENV.w, h = ENV.h, [c, x] = mk(w + 40, h + 200); x.translate(20, 180); // flap above top edge
    const pat = x.createPattern(L.TEX.paper, 'repeat');
    // open flap (inside visible), lies flat above the top edge
    x.save(); x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, -168); x.lineTo(w, 0); x.closePath(); x.fillStyle = pat; x.fill(); x.fillStyle = 'rgba(90,70,40,.32)'; x.fill();
    x.strokeStyle = 'rgba(160,130,80,.45)'; x.lineWidth = 10; x.beginPath(); x.moveTo(40, -10); x.lineTo(w / 2, -148); x.lineTo(w - 40, -10); x.stroke(); x.restore();
    return c;
  }
  function makeEnvFront() {
    const w = ENV.w, h = ENV.h, [c, x] = mk(w, h); const R = rng(91);
    const pat = x.createPattern(L.TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(-40, -300));
    x.fillStyle = pat; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(205,180,130,.28)'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 380); g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(100,70,30,.3)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // faint seams of the back folds showing through
    x.strokeStyle = 'rgba(120,90,50,.12)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h); x.lineTo(w * .42, h * .45); x.moveTo(w, h); x.lineTo(w * .58, h * .45); x.stroke();
    text(x, '지역 일간지 앞', 34, 150, { size: 44, family: FONT.serif, weight: 900, color: '#22304d', align: 'left' });
    x.strokeStyle = 'rgba(34,48,77,.55)'; x.lineWidth = 3; x.lineCap = 'round';
    for (const [y0, l] of [[205, 250], [245, 190]]) { x.beginPath(); x.moveTo(38, y0); for (let k = 0; k <= l; k += 12) x.lineTo(38 + k, y0 + Math.sin(k * .21 + y0) * 4 + (R() - .5) * 3); x.stroke(); }
    return c;
  }
  function makeStamp(s, size, color) { // same look as L.stamp, rendered once
    const [b, bx] = mk(1400, 700);
    bx.translate(700, 350);
    L.setFont(bx, size, FONT.disp, 400); bx.letterSpacing = '6px'; const tw = bx.measureText(s).width;
    bx.fillStyle = color; bx.strokeStyle = color; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillText(s, 0, size * .05);
    bx.lineWidth = size * .09; roundRect(bx, -tw / 2 - size * .35, -size * .78, tw + size * .7, size * 1.56, size * .12); bx.stroke();
    bx.lineWidth = size * .035; roundRect(bx, -tw / 2 - size * .22, -size * .64, tw + size * .44, size * 1.28, size * .08); bx.stroke();
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'destination-out';
    const R = rng(77); for (let i = 0; i < 1400; i++) { bx.globalAlpha = R() * .8; bx.beginPath(); bx.arc(R() * 1400, R() * 700, R() * 5 + .5, 0, 7); bx.fill(); }
    b._w = tw + size * .7; b._h = size * 1.56; b._cw = Math.min(1400, Math.ceil(b._w + 40)); b._ch = Math.min(700, Math.ceil(b._h + 40));
    return b;
  }
  function makeBokeh() { const [c, x] = mk(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,220,170,1)'); g.addColorStop(.55, 'rgba(255,210,150,.55)'); g.addColorStop(.8, 'rgba(255,200,140,.2)'); g.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; }

  function ensure() {
    if (S) return S;
    S = {};
    S.soft = makeSoft(); S.desk = makeDesk(); S.paper = makePaper(); S.back = makeBack();
    S.flapSp = makeEnvelope(); S.envFront = makeEnvFront(); S.bokeh = makeBokeh();
    S.stamps = {};
    [S.face, S.fx] = mk(LET.w, LET.h);
    [S.shc, S.shx] = mk(260, 320);
    return S;
  }
  function stampSprite(s, size, color) { const k = s + '|' + size + '|' + color; return S.stamps[k] || (S.stamps[k] = makeStamp(s, size, color)); }

  // ---------------- drawing ----------------
  function deskLayer(ctx) { ctx.drawImage(S.desk, DX0, DY0); }
  // the lamp pool, falloff and blinds are baked into the desk; per frame only a gentle flicker / switch-off
  function lampLight(ctx, T, on = 1) {
    const f = (1 - on) * .62 + .035 * (.5 + .5 * noise1(T * 5, 3)) * on;
    if (f > .003) { ctx.save(); ctx.fillStyle = `rgba(3,4,8,${f})`; ctx.fillRect(DX0, DY0, DW, DH); ctx.restore(); }
  }
  // cold blind stripes over a paper quad (clipped: cheaper than a full-frame pass)
  function blinds(ctx, T, a, cx, cy, w, h, rot) {
    if (a <= 0) return;
    const sl = (T * 7) % 116, fl = .85 + .15 * noise1(T * .7, 21);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.rotate(-rot); ctx.translate(-cx, -cy); ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .1 * a * fl;
    ctx.drawImage(blindsWorld(), BWX0 - Math.sin(SH_ROT) * sl, BWY0 + Math.cos(SH_ROT) * sl, BWW, BWH); ctx.restore();
  }
  // the blinds pattern pre-rotated into world axes (half res) so the per-frame blit needs no rotation
  const BWX0 = -240, BWY0 = -360, BWW = 1640, BWH = 1880;
  function blindsWorld() {
    if (S.blindsW) return S.blindsW;
    const [c, x] = mk(BWW / 2, BWH / 2); x.scale(.5, .5); x.translate(-BWX0, -BWY0);
    x.translate(560, 300); x.rotate(SH_ROT); x.drawImage(blindsSprite(), -1150, -880 - 116, 2600, 2600 + 232);
    return (S.blindsW = c);
  }
  function steam(ctx, T, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = T * .55 + i * 1.7, r0 = 20 + i * 9;
      ctx.strokeStyle = `rgba(235,235,240,${a * (.05 + .03 * Math.sin(T * 1.3 + i))})`; ctx.lineWidth = 16 - i * 2;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const u = k / 12, ang = ph + u * 2.6 + noise1(T * .8 + i * 3 + u * 2, 7) * .9, rr = r0 + u * 120 + 18 * noise1(T + u * 3 + i, 9);
        const px = CUP.x + Math.cos(ang) * rr - u * 70, py = CUP.y + Math.sin(ang) * rr * .8 - u * 150;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // envelope: x,y centre (world), r rotation, s scale, letter callback drawn between flap and body
  function envelope(ctx, e, inside) {
    const w = ENV.w, h = ENV.h;
    if (!inside && !e.lift && !e.trail && (e.s || 1) === 1) { // at rest: one cached composite (shadow + flap + body + front)
      if (!S.envRest) { const [c, x] = mk(w + 240, h + 420); x.translate(w / 2 + 120, h / 2 + 260); soft(x, -w / 2, -h / 2 - 30, w, h + 40, 24, .62); x.drawImage(S.flapSp, -w / 2 - 20, -h / 2 - 180); x.fillStyle = '#d9cbab'; x.fillRect(-w / 2, -h / 2, w, h); x.drawImage(S.envFront, -w / 2, -h / 2); S.envRest = c; }
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.r); ctx.drawImage(S.envRest, -w / 2 - 120, -h / 2 - 260); ctx.restore(); return;
    }
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.r); ctx.scale(e.s || 1, e.s || 1);
    const lf = e.lift || 0;
    soft(ctx, -w / 2 + lf * 20, -h / 2 - 40 + 10 + lf * 40, w, h + 40, 24 + lf * 40, .62);
    ctx.drawImage(S.flapSp, -w / 2 - 20, -h / 2 - 180);
    ctx.fillStyle = '#d9cbab'; ctx.fillRect(-w / 2, -h / 2, w, h);
    if (inside) inside(ctx);
    ctx.drawImage(S.envFront, -w / 2, -h / 2);
    if (e.trail) { ctx.globalAlpha = e.trail; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fillRect(-w / 2, -h / 2, w, h); }
    ctx.restore();
  }

  // letter face (offscreen, per frame). st: {n1, w2, w3, gold, grey[3], attrib}
  function paintFace(st) {
    const x = S.fx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, LET.w, LET.h); x.drawImage(S.paper, 0, 0); x.translate(LET.w / 2, LET.h / 2);
    const g = st.grey || [0, 0, 0];
    const col = (k) => mixHex(INK, GREY, g[k] * .85);
    // line 1 (typed)
    const chars = Array.from(L1), n = Math.min(chars.length, st.n1 || 0);
    if (n > 0) {
      const pre = chars.slice(0, n - 1).join(''), last = chars[n - 1];
      if (pre) text(x, pre, TX, LY1, { size: FS, family: FONT.serif, weight: 900, color: col(0), align: 'left' });
      const lx = TX + measure(x, pre, FS, FONT.serif, 900), pp = clamp(st.pop1 == null ? 1 : st.pop1);
      x.save(); x.translate(lx, LY1); const sc = lerp(1.35, 1, E.outBack(pp)); x.scale(sc, sc);
      text(x, last, 0, 0, { size: FS, family: FONT.serif, weight: 900, color: col(0), align: 'left', alpha: clamp(pp * 3) });
      x.restore();
      if (st.caret && n < chars.length) { x.fillStyle = INK; x.fillRect(lx + measure(x, last, FS, FONT.serif, 900) + 6, LY1 - 26, 4, 50); }
    }
    // line 2 (write-on wipe) with gold "선물"
    const wipe = (p, y, fn) => { if (p <= 0) return; x.save(); x.beginPath(); x.rect(TX - 10, y - 45, (LET.w - 40) * p, 90); x.clip(); fn(); x.restore(); };
    const wa = measure(x, L2a, FS, FONT.serif, 900), wb = measure(x, L2b, FS, FONT.serif, 900);
    wipe(st.w2, LY2, () => {
      text(x, L2a, TX, LY2, { size: FS, family: FONT.serif, weight: 900, color: col(1), align: 'left' });
      const gc = mixHex(mixHex(INK, '#b07f12', st.gold || 0), GREY, g[1] * .85);
      text(x, L2b, TX + wa, LY2, { size: FS, family: FONT.serif, weight: 900, color: gc, align: 'left' });
      text(x, L2c, TX + wa + wb, LY2, { size: FS, family: FONT.serif, weight: 900, color: col(1), align: 'left' });
    });
    wipe(st.w3, LY3, () => text(x, L3, TX, LY3, { size: FS, family: FONT.serif, weight: 900, color: col(2), align: 'left' }));
    if (st.attrib > 0) text(x, '— 자칭 범인들의 주장 (요지)', TX + 6, LYA, { size: 27, weight: 700, color: '#6b6457', align: 'left', alpha: st.attrib });
    return { wa, wb, w3: measure(x, L3, FS, FONT.serif, 900) };
  }
  function mixHex(a, b, k) { // always returns #rrggbb (safe for L.rgba / glow)
    k = clamp(k); if (k <= 0) return a; if (k >= 1) return b;
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(lerp(pa >> sh & 255, pb >> sh & 255, k));
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  // tri-fold panels: uT/uB 0 = folded, 1 = flat
  function panels(ctx, uT, uB) {
    const w = LET.w, h = LET.h, h3 = h / 3, X = -w / 2, Y = -h / 2;
    const face = S.useFace || S.face, back = S.back;
    ctx.drawImage(face, 0, h3, w, h3, X, Y + h3, w, h3); // middle
    // top panel: hinge at h3, extends upward when flat, folded down over the middle (back side) when u = 0
    { const s = Math.cos(Math.PI * (1 - clamp(uT))), sx = 1 + .05 * Math.sin(Math.PI * clamp(uT));
      ctx.save(); ctx.translate(0, Y + h3); ctx.scale(sx, s);
      ctx.drawImage(s >= 0 ? face : back, 0, 0, w, h3, X, -h3, w, h3);
      const shade = (1 - Math.abs(s)) * .55 + (s < 0 ? .12 : 0); if (shade > 0) { ctx.fillStyle = `rgba(40,25,10,${shade})`; ctx.fillRect(X, -h3, w, h3); }
      ctx.restore(); }
    // bottom panel: hinge at 2h3, extends downward when flat
    { const u = uB, s = Math.cos(Math.PI * (1 - clamp(u))); const sx = 1 + .05 * Math.sin(Math.PI * clamp(u));
      ctx.save(); ctx.translate(0, Y + 2 * h3); ctx.scale(sx, s);
      if (s >= 0) ctx.drawImage(face, 0, 2 * h3, w, h3, X, 0, w, h3); else ctx.drawImage(back, 0, 2 * h3, w, h3, X, 0, w, h3);
      const shade = (1 - Math.abs(s)) * .55 + (s < 0 ? .12 : 0); if (shade > 0) { ctx.fillStyle = `rgba(40,25,10,${shade})`; ctx.fillRect(X, 0, w, h3); }
      ctx.restore(); }
  }
  // full letter at world pose. st also: x,y,r,s,uT,uB,lift, ribbon, arrow, sparkle, scan, q[], stampP, ann (annotation alpha), T
  function letter(ctx, st) {
    let m;
    if (st.final) { if (!S.finalM) { S.finalM = paintFace(st); [S.finalFace, S.ffx] = mk(LET.w, LET.h); S.ffx.drawImage(S.face, 0, 0); } m = S.finalM; }
    else { m = paintFace(st); S.curFace = S.face; }
    S.useFace = st.final ? S.finalFace : S.face;
    const lift = st.lift || 0, sc = (st.s || 1) * (1 + lift * .12);
    ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.r); ctx.scale(sc, sc);
    // drop shadow (soft, offset grows with lift)
    const uT = st.uT == null ? 1 : st.uT, uB = st.uB == null ? 1 : st.uB;
    const top = -LET.h / 2 + (LET.h / 3) * (1 - Math.max(0, Math.cos(Math.PI * (1 - uT)))), bot = LET.h / 2 - (LET.h / 3) * (1 - Math.max(0, Math.cos(Math.PI * (1 - uB))));
    { const y0 = Math.min(top, -LET.h / 6), y1 = Math.max(bot, LET.h / 6); soft(ctx, -LET.w / 2 + 6 + lift * 30, y0 + 14 + lift * 60, LET.w, y1 - y0, 26 + lift * 50, .66); }
    panels(ctx, uT, uB);
    const flat = Math.min(uT, uB) >= 1;
    if (flat) {
      // gold loop around "선물"
      const ann = st.ann == null ? 1 : st.ann;
      if (st.ribbon > 0) {
        const cx = TX + m.wa + m.wb / 2 + 2, cy = LY2 + 2, rx = m.wb / 2 + 30, ry = 44, pts = [];
        for (let i = 0; i <= 60; i++) { const a = -2.5 + i / 60 * Math.PI * 2.18; pts.push([cx + Math.cos(a) * rx * (1 + .05 * Math.sin(a * 3)), cy + Math.sin(a) * ry * (1 + .06 * Math.cos(a * 2))]); }
        ctx.save(); ctx.globalAlpha *= ann; goldPath(ctx, pts, st.ribbon, st.annGrey || 0); ctx.restore();
      }
      if (st.arrow > 0) {
        const x1 = TX + m.w3 + 8, y = LY3 + 38, pts = L.bezierPts([x1, y - 6], [x1 - 60, y + 28], [TX + 40, y + 22], [TX - 4, y + 2], 40);
        ctx.save(); ctx.globalAlpha *= ann;
        goldPath(ctx, pts, st.arrow, st.annGrey || 0);
        if (st.arrow >= 1) { ctx.strokeStyle = mixHex('#e8b437', '#9a9a9a', st.annGrey || 0); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(TX + 18, y - 12); ctx.lineTo(TX - 4, y + 2); ctx.lineTo(TX + 20, y + 14); ctx.stroke(); }
        ctx.restore();
      }
      if (st.sparkle > 0 && st.sparkle < 1) {
        const cx = TX + m.wa + m.wb / 2;
        for (let i = 0; i < 7; i++) {
          const k = clamp((st.sparkle - i * .07) / .45); if (k <= 0 || k >= 1) continue;
          const a = hash(i * 13) * 6.28, d = 70 + hash(i * 7) * 70, px = cx + Math.cos(a) * d * (.6 + k * .5), py = LY2 + Math.sin(a) * d * .55 * (.6 + k * .5), s = Math.sin(k * Math.PI) * (10 + hash(i) * 10);
          ctx.save(); ctx.translate(px, py); ctx.rotate(k * 1.5); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,214,110,.95)';
          ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .22, -s * .22); ctx.lineTo(s, 0); ctx.lineTo(s * .22, s * .22); ctx.lineTo(0, s); ctx.lineTo(-s * .22, s * .22); ctx.lineTo(-s, 0); ctx.lineTo(-s * .22, -s * .22); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
      // verification scan
      if (st.scan > 0 && st.scan < 1) {
        const sy = lerp(-LET.h / 2 + 10, LET.h / 2 - 10, st.scan);
        ctx.save(); ctx.beginPath(); ctx.rect(-LET.w / 2, -LET.h / 2, LET.w, LET.h); ctx.clip();
        let g = ctx.createLinearGradient(0, sy - 120, 0, sy); g.addColorStop(0, 'rgba(120,220,255,0)'); g.addColorStop(1, 'rgba(120,220,255,.28)');
        ctx.fillStyle = g; ctx.fillRect(-LET.w / 2, sy - 120, LET.w, 120);
        ctx.fillStyle = 'rgba(225,250,255,.95)'; ctx.fillRect(-LET.w / 2, sy - 2, LET.w, 4); ctx.restore();
        glow(ctx, -LET.w / 2 + 6, sy, 60, '#9be8ff', .7); glow(ctx, LET.w / 2 - 6, sy, 60, '#9be8ff', .7);
      }
      // "?" badges per line
      if (st.q) [LY1, LY2, LY3].forEach((y, i) => {
        const p = st.q[i] || 0; if (p <= 0) return; const s = OB(p, 2.6), bob = Math.sin((st.T || 0) * 3 + i * 2) * 2.5;
        ctx.save(); ctx.translate(LET.w / 2 - 38, y - 4 + bob); ctx.scale(s, s);
        ctx.fillStyle = '#16181d'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill(); ctx.strokeStyle = K.red; ctx.lineWidth = 3.5; ctx.stroke();
        text(ctx, '?', 0, 2, { size: 30, family: FONT.disp, weight: 400, color: '#ff5a62' }); ctx.restore();
      });
      // stamp imprint
      if (st.stampP > 0) imprint(ctx, '진위 미확인', STAMP_XY[0], STAMP_XY[1], st.stampP, 104, '#d4202c', -.12);
    }
    ctx.restore();
  }
  // gold hand-drawn stroke with a cheap glow (wide faint stroke under a thin one) and a bright pen head
  function goldPath(ctx, pts, p, grey) {
    const col = mixHex('#e8b437', '#9a9a9a', grey);
    if (grey < .6) { ctx.save(); ctx.globalAlpha *= .22 * (1 - grey); pathReveal(ctx, pts, p, { color: '#ffcf6a', w: 15, head: false }); ctx.restore(); }
    const hd = pathReveal(ctx, pts, p, { color: col, w: 5, head: false });
    if (hd && p < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(S.bokeh, hd[0] - 30, hd[1] - 30, 60, 60); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 4.5, 0, 7); ctx.fill(); ctx.restore(); }
  }
  // imprint already pressed: p (0..1) only fades in quickly + tiny settle
  function imprint(ctx, s, x, y, p, size, color, rot) {
    const b = stampSprite(s, size, color), sc = lerp(1.05, 1, E.outQ(clamp(p))), cw = b._cw, ch = b._ch;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 3) * .95;
    ctx.drawImage(b, 700 - cw / 2, 350 - ch / 2, cw, ch, -cw / 2, -ch / 2, cw, ch); ctx.restore();
  }
  // incoming stamp seen from above: shadow converges (tA → tS - .11), stamp drops (scale 2 → 1) and hits at tS
  function stampDrop(ctx, s, size, color, x, y, rot, t, tA, tS) {
    if (t < tA || t >= tS) return;
    const b = stampSprite(s, size, color), ant = P(t, tA, tS - .11, E.outQ), drop = P(t, tS - .11, tS, E.inQ);
    const sc = lerp(1.32, 1.03, drop), ox = lerp(80, 8, drop) * (1 - .3 * ant), oy = lerp(120, 10, drop) * (1 - .3 * ant);
    ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(rot);
    soft(ctx, -b._w / 2 * sc, -b._h / 2 * sc, b._w * sc, b._h * sc, lerp(60, 14, drop), .5 * ant + .25 * drop); ctx.restore();
    const ss = lerp(lerp(2.0, 1.7, ant), 1, drop), a = lerp(.22 * ant, 1, drop), cw = b._cw, ch = b._ch;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + .06 * (1 - drop)); ctx.scale(ss, ss); ctx.globalAlpha *= a;
    ctx.drawImage(b, 700 - cw / 2, 350 - ch / 2, cw, ch, -cw / 2, -ch / 2, cw, ch); ctx.restore();
  }
  // ink specks + dust burst at a slam (world coords), k = seconds since slam
  function slamBurst(ctx, x, y, k, seed = 1, color = '#c41d27') {
    if (k < 0 || k > .7) return;
    ctx.save();
    for (let j = 0; j < 1; j++) { const q = clamp((k - j * .06) / .45); if (q <= 0 || q >= 1) continue; ctx.strokeStyle = `rgba(255,236,210,${(1 - q) * (1 - q) * .3})`; ctx.lineWidth = 14 * (1 - q) + 1; ctx.beginPath(); ctx.ellipse(x, y, 200 + q * 420, 110 + q * 260, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 16; i++) {
      const ux = hash(i * 7 + seed) * 2 - 1, uy = hash(i * 11 + seed) * 2 - 1, sp = 120 + hash(i * 3 + seed) * 420, d = sp * (1 - Math.exp(-k * 7)) / 7 * 1.8;
      const nx = ux / (Math.hypot(ux, uy) + .01), ny = uy / (Math.hypot(ux, uy) + .01);
      const px = x + ux * 250 + nx * d, py = y + uy * 80 + ny * d * .7, r = (1.5 + hash(i + seed) * 4.5) * (1 - k / .7);
      ctx.fillStyle = color; ctx.globalAlpha = .85 * (1 - k / .7); ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    }
    ctx.restore();
    motes(ctx, k * 3, { n: 26, color: '#efe2c4', a: .6 * (1 - k / .7), area: [x - 360, y - 220, 720, 440], size: 3.5, speed: 160, seed: 3 + seed });
  }
  // cast shadow of a standing person behind the top edge (window light), F.figure silhouette
  function castShadow(ctx, x, y, h, k, a, pose, rot = SH_ROT, upright = false) {
    if (a <= 0) return;
    const sc = 5, sx = S.shx; sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, 260, 320);
    F.figure(sx, 130, 312, h / sc, Object.assign({ fill: '#000', shadow: false }, pose));
    ctx.save();
    if (upright) { const m = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W, 1440); ctx.clip(); ctx.setTransform(m); } // below the subtitles nobody sees it
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, (upright ? 1 : -1) * sc * k); ctx.globalAlpha *= a; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(S.shc, -130, -312); ctx.restore();
  }
  // out-of-focus foreground bokeh in screen space with parallax against the camera
  function bokeh(ctx, T, cam, a = 1) {
    for (let i = 0; i < 11; i++) {
      const bx = hash(i * 17 + 5) * 1300 - 110 + fbm(T * .12 + i, 4) * 60 - (cam[0] - 540) * 1.7, by = 470 + hash(i * 23 + 2) * 900 + fbm(T * .1 + i * 3, 8) * 50 - (cam[1] - 950) * 1.7;
      const r = 24 + hash(i * 5) * 50, al = a * (.035 + .05 * hash(i * 9)) * (.7 + .3 * Math.sin(T * .9 + i));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al; ctx.drawImage(S.bokeh, bx - r, by - r, r * 2, r * 2); ctx.restore();
    }
  }
  function subBand(ctx, a = 1) {
    const g = ctx.createLinearGradient(0, 1180, 0, 1480); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, `rgba(0,0,0,${.42 * a})`); g.addColorStop(1, `rgba(0,0,0,${.5 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 1180, W, 400);
  }
  const FINAL_LETTER = { final: true, n1: 99, w2: 1, w3: 1, gold: 1, attrib: 1, ribbon: 1, arrow: 1, grey: [1, 1, 1], ann: .55, annGrey: 1, q: [1, 1, 1], stampP: 1, uT: 1, uB: 1, lift: 0 };
  return { ensure, camAt, OB, deskLayer, lampLight, blinds, steam, envelope, letter, imprint, stampDrop, soft, stampSprite, slamBurst, castShadow, bokeh, subBand, mixHex,
    LET, ENV, LAMP, CUP, NEWS, END_CAM, FINAL_LETTER, STAMP_XY, SH_ROT };
})();
window.KL.newsDesk = ND;

// =====================================================================================================
// scene: letter
// =====================================================================================================
const CAM = [ // t, x, y, zoom, rot   (world (540,860) ~ screen (540,860) when y = 860 + 100/zoom)
  [-.4, 470, 1075, 1.16, .02],
  [.1, 476, 1068, 1.14, .016],
  [.75, 538, 948, 1.10, -.004],
  [1.6, 543, 945, 1.125, -.01],
  [2.42, 547, 942, 1.15, -.013],
  [3.2, 566, 990, .86, .002],
  [3.62, 562, 986, .875, .004],
  [4.25, 545, 952, 1.045, -.006],
  [4.95, 542, 951, 1.07, -.008],
  [5.6, ND.END_CAM[0], ND.END_CAM[1], ND.END_CAM[2], ND.END_CAM[3]],
];

window.KL.scenes.letter = function (ctx, t, d, info) {
  const S = ND.ensure(), T = info.T;
  const tSoon = at(info, '곧', .02), tJa = at(info, '자기들이', .1), tHum = at(info, '훔쳤다가', .2), tSun = at(info, '선물로', .32), tDol = at(info, '돌려줬다는', .39),
    tPyun = at(info, '편지가', .52), tSin = at(info, '신문사에', .62), tWat = at(info, '왔지만', .72), tHwak = at(info, '확인된', .8), tGeon = at(info, '건', .88), tEop = at(info, '없다', .92);
  const tSlam = tEop + .05;                                   // stamp sfx

  // ---------- envelope: skids in from the right, bounces, settles ----------
  const land = tSoon - .02, bounce = t > land ? Math.exp(-(t - land) * 9) * Math.sin((t - land) * 34) : 0;
  const env = {
    x: lerp(1650, ND.ENV.x + 40, E.outExpo(clamp((t + .3) / (land + .3)))) - 40 * P(t, land, land + .5, E.outQ),
    y: lerp(1010, ND.ENV.y, E.outC(clamp((t + .3) / (land + .3)))) + bounce * 6,
    r: lerp(.62, ND.ENV.r, E.outC(clamp((t + .3) / (land + .3)))) + bounce * .025,
    s: 1, lift: clamp(1 - (t + .3) / (land + .3)) * .6,
  };
  env.y += 14 * Math.sin(Math.PI * P(t, tSoon + .1, tSoon + .26)); // nudge as the letter is pulled

  // ---------- letter: out of the envelope (folded), flies to camera, unfolds ----------
  const out = P(t, tSoon + .04, tJa - .02, E.inOutQ);         // rising out of the envelope
  const fly = P(t, tJa - .14, tJa + .3, E.inOutC);             // to rest pose
  const uT = P(t, tJa - .02, tJa + .2, E.inOutQ), uB = P(t, tJa + .06, tJa + .3, E.inOutQ);
  const h3 = ND.LET.h / 3;
  // pose while inside: centred on the envelope, rising along the envelope's up axis
  const ex = env.x, ey = env.y, er = env.r;
  const insideY = lerp(40, -ND.ENV.h / 2 - h3 / 2 - 20, out);
  const ix = ex - Math.sin(er) * insideY, iy = ey + Math.cos(er) * insideY;
  const st = {
    T,
    x: lerp(ix, ND.LET.x, fly), y: lerp(iy, ND.LET.y, fly) - Math.sin(Math.PI * fly) * 40, r: lerp(er, ND.LET.r, fly) + Math.sin(Math.PI * fly) * -.06,
    s: lerp(.86, 1, fly), lift: Math.sin(Math.PI * fly) * .9 + (1 - fly) * out * .25, uT, uB,
  };
  const inside = fly <= 0;

  // typing: '“우리가 훔쳤고,' on the typing sfx (자기들이 +0.05 … +1.04)
  const nT = Array.from('“우리가 훔쳤고,').length, typ0 = tJa + .05, typStep = .118;
  const nTyped = t < typ0 ? 0 : Math.min(nT, 1 + Math.floor((t - typ0) / typStep));
  st.n1 = nTyped; st.pop1 = nTyped ? clamp((t - (typ0 + (nTyped - 1) * typStep)) / .07) : 1; st.caret = nTyped < nT && t > typ0 - .1;
  st.w2 = P(t, tSun - .12, tSun + .34, E.inOutQ); st.gold = P(t, tSun + .02, tSun + .2);
  st.ribbon = P(t, tSun + .04, tSun + .5, E.inOutQ); st.sparkle = P(t, tSun + .3, tSun + 1.1);
  st.w3 = P(t, tDol - .02, tDol + .34, E.inOutQ); st.arrow = P(t, tDol + .14, tDol + .55, E.inOutQ);
  st.attrib = P(t, tDol + .35, tDol + .65);
  // verification
  const scan = P(t, tHwak - .04, tGeon + .02, E.inOutQ);
  st.scan = scan;
  const syL = (yy) => clamp((lerp(-ND.LET.h / 2 + 10, ND.LET.h / 2 - 10, scan) - (yy - 20)) / 70);
  st.grey = scan > 0 ? [syL(-192), syL(-98), syL(-4)] : [0, 0, 0];
  st.q = [-192, -98, -4].map((yy, i) => P(t, tHwak + .02 + (yy + 350) / 700 * (tGeon - tHwak + .06), tHwak + .22 + (yy + 350) / 700 * (tGeon - tHwak + .06)));
  st.annGrey = P(t, tHwak, tGeon); st.ann = 1 - .45 * P(t, tHwak, tEop + .3);
  st.stampP = P(t, tSlam, tSlam + .08);
  const slamK = t > tSlam ? Math.exp(-(t - tSlam) * 6.5) : 0;

  // ---------- camera ----------
  const cam = ND.camAt(CAM, t), dr = drift(T, .45, 7);
  const shake = slamK * 1.1;
  ctx.save();
  camera(ctx, { x: cam[0] + dr.x + shake * noise1(T * 22, 5) * 18, y: cam[1] + dr.y + shake * noise1(T * 22, 6) * 18, zoom: cam[2] * (1 + .012 * slamK), rot: 0, shake: 0, t: T, seed: 4 });
  ND.deskLayer(ctx);
  ND.steam(ctx, T);
  if (inside) ND.envelope(ctx, env, (c) => { c.save(); c.rotate(-er); c.translate(-ex, -ey); ND.letter(c, st); c.restore(); });
  else { ND.envelope(ctx, env); }
  // motion trail while skidding in
  const vx = t < land ? 1 - clamp((t + .3) / (land + .3)) : 0;
  if (vx > .05) { for (let i = 1; i <= 4; i++) { ctx.save(); ctx.globalAlpha = .12 * vx * (1 - i / 5); ctx.translate(env.x + i * 70 * vx, env.y - i * 6 * vx); ctx.rotate(env.r + i * .03); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-ND.ENV.w / 2, -ND.ENV.h / 2, ND.ENV.w, ND.ENV.h); ctx.restore(); } }
  if (!inside) ND.letter(ctx, st);
  // envelope landing dust
  if (t > land && t < land + .7) motes(ctx, (t - land) * 2.5, { n: 22, color: '#e9dcc0', a: .55 * (1 - (t - land) / .7), area: [ND.ENV.x - 330, ND.ENV.y - 200, 660, 400], size: 3, speed: 110, seed: 12 });

  // stamp: its shadow slides in under the hovering stamp (anticipation), then the stamp drops and slams
  const cr = Math.cos(ND.LET.r), sr = Math.sin(ND.LET.r);
  const sxw = ND.LET.x + ND.STAMP_XY[0] * cr - ND.STAMP_XY[1] * sr, syw = ND.LET.y + ND.STAMP_XY[0] * sr + ND.STAMP_XY[1] * cr;
  const srot = ND.LET.r - .12;
  ND.stampDrop(ctx, '진위 미확인', 104, '#d4202c', sxw, syw, srot, t, tGeon - .12, tSlam);
  ND.slamBurst(ctx, sxw, syw, t - tSlam, 3);

  ND.lampLight(ctx, T, 1);
  if (fly >= 1) ND.blinds(ctx, T, 1, st.x, st.y, ND.LET.w, ND.LET.h, st.r);

  // editor's cast shadow, thrown up the desk from the camera side: someone steps up to the desk on 편지가,
  // leans in and points at the letter, tilts the head on 왔지만, steps back after the stamp
  const sIn = P(t, tPyun - .25, tSin + .1, E.inOutQ), sOut = P(t, tSlam + .05, d - .15, E.inOutQ);
  const vis = P(t, tPyun - .3, tPyun) * (1 - P(t, d - .55, d - .15));
  if (vis > 0) {
    const lean = sIn * (1 - sOut);
    // pointing arm (keyed, always raised so it never swings through a flat pose): taps on 신문사에,
    // follows the scan down the lines on 확인된, sinks after the stamp
    const [a1, a2] = ND.camAt([[tPyun - .3, -2.5, .2], [tSin - .08, -2.62, .28], [tSin + .06, -2.66, .62], [tSin + .22, -2.6, .26], [tWat + .1, -2.74, .3],
      [tHwak, -2.8, .24], [tGeon, -2.5, .3], [tSlam, -2.44, .42], [d, -2.3, .7]], t);
    const tilt = Math.sin(Math.PI * P(t, tWat - .1, tHwak + .4)) * .8;
    const breathe = .01 * Math.sin(T * 1.7);
    ND.castShadow(ctx, 900, 2080, 1000, lerp(.62, 1.3, lean) + breathe, .5 * vis, {
      female: true, hair: 'bun', headTurn: -tilt, lean: 0,
      armL: [a1, a2],
      armR: [lerp(-.08, .3, lean), lerp(.1, -.25, lean)],
    }, lerp(-.02, -.09, lean), true);
  }
  ctx.restore();

  // ---------- screen-space FX + HUD ----------
  ND.bokeh(ctx, T, cam, 1);
  motes(ctx, T, { n: 34, color: '#ffe2b0', a: .32, seed: 41, area: [60, 470, 960, 760], size: 2.6, speed: 14 });
  ND.subBand(ctx, 1);

  // brackets on the envelope address + chip
  const brk = P(t, tSin - .06, tSin + .2) * (1 - P(t, tWat + .1, tWat + .35));
  if (brk > 0) {
    // project envelope address (world) to screen
    const z = cam[2], ax = ND.ENV.x - 120, ay = ND.ENV.y - 22;
    const sx = 540 + ((ax - cam[0]) * Math.cos(cam[3]) - (ay - cam[1]) * Math.sin(cam[3])) * z, sy = 960 + ((ax - cam[0]) * Math.sin(cam[3]) + (ay - cam[1]) * Math.cos(cam[3])) * z;
    brackets(ctx, sx - 165 * z, sy - 50 * z, 330 * z, 100 * z, brk, K.goldHi, 30, 5);
  }
  const chA = P(t, tSin - .04, tSin + .22, E.outBack);
  if (chA > 0) {
    ctx.save(); ctx.translate(540, 1226); const s = lerp(.8, 1, clamp(chA)); ctx.scale(s, s);
    chip(ctx, '2020.1 · 지역 일간지 「Libertà」 앞', 0, 0, clamp(chA * 2), { size: 34 });
    ctx.restore();
  }
  // tag: the claim
  const tg = P(t, tWat - .05, tWat + .2, E.outBack), tgOut = P(t, tSlam + .5, d + .3);
  if (tg > 0) {
    ctx.save(); ctx.translate(540, 506 - 30 * (1 - clamp(tg))); ctx.globalAlpha = clamp(tg * 2) * (1 - tgOut * .4);
    label(ctx, "'도시에 주는 선물' 주장", 0, 0, { size: 38, color: '#ffe7a8', bg: 'rgba(8,10,14,.86)', border: rgba(K.gold, .7) });
    ctx.restore();
  }
  // impact flash + red tint pulse at the slam
  if (slamK > 0) { flash(ctx, slamK * .22, '#fff4e6'); tint(ctx, '#5a0008', .18 * slamK, 'multiply'); }
};
})();
