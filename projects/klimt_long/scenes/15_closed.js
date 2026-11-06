// scene module: draws one scene. Helpers come from common.js (window.KL) and engine/lib.js (window.L).
// "절도 공소시효는 지났고, 발견 후 수사도 2021년 기소 없이 종결됐다."
// Same newsroom desk / camera as 14_letter.js (window.KL.newsDesk), so the fade is one continuous shot.
//  (fade in)   the case folder drops from above the camera onto the stamped letter — slam (sfx), dust ring, shake
//  절도        cover: "RITRATTO DI SIGNORA / 여인의 초상 · 도난 사건", slow push in
//  공소시효는  row 1 types in "절도죄 공소시효", an hourglass pops (tick) and its sand runs out
//  지났고      the last grain falls: "만료" punches in red, the hourglass tips over and goes grey
//  발견        an investigator's cast shadow (fedora, coat) steps up; the cover swings open to the left,
//              the camera pulls back to the spread: inside cover = discovery photo "2019.12 발견"
//  후/수사도   pages on the prong fastener flip up one after another: 엑스레이 대조 → 뒷면 봉인 대조
//  2021년      last page: split-flap year rolls and locks on "2021" (tick), "수사 종결"
//  기소 없이   the cover slaps shut; rows type in: "발견 후 수사 … 2021 종결", "기소 … 없음"
//  종결됐다    stamp shadow converges, "미제 종결" slams (stamp + impact sfx), approved chip
//              "2021.11 판사 결정 · 기소 없이 종결"; the shadow steps back and the desk lamp clicks off → dip
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, glitchText, typeSub, countUp,
  roundRect, pin, stringLine, stamp, pathReveal, marker, tag, glow, godrays, motes, fogLayer, grain, dust, vignette,
  flash, tint, camera, drift, gradBG, subtitles, FONT } = L;
const { K, HATCH, T, WALL_OX, mk, wt, vend, noise2, poly, darkness, brackets, label, flap, makeBricks, leafPath, leafSprite, makeLeaves, drawLeaves, makeFrame, spiral, smooth, makePortrait, makeGhost, makeBoard, makeCrate, wallBG, drawBag, canvasPiece, drawHatch, ivyWallScene, at, chip, dateFlap, mapView, oldPhoto, makeOldPhoto, lightbox, scanGhost, canvasBack, desk, lamp, magnifier, idCard, newspaper, dnaHelix, galleryInterior, shears, glove, project, topTitle } = window.KL;

const FW = 610, FH = 760;                                  // folder (cover) size, local units
const FO = { x: 556, y: 886, r: -.03 };                    // folder rest pose (world)
const PW = 578, PH = 724;                                  // pages
const MAN = '#c9a86a', RED = '#a3121a';
let V = null;

function makeCoverBase() {
  const [c, x] = mk(FW, FH); const R = rng(515);
  x.fillStyle = MAN; x.fillRect(0, 0, FW, FH);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .3; x.fillStyle = pat; x.fillRect(0, 0, FW, FH); x.globalAlpha = 1;
  let g = x.createRadialGradient(FW / 2, FH / 2, 150, FW / 2, FH / 2, 560); g.addColorStop(0, 'rgba(120,80,30,0)'); g.addColorStop(1, 'rgba(90,60,20,.38)'); x.fillStyle = g; x.fillRect(0, 0, FW, FH);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,240,200' : '70,45,15'},${R() * .07})`; x.fillRect(R() * FW, R() * FH, 2, 2); }
  x.strokeStyle = 'rgba(90,60,20,.35)'; x.lineWidth = 3; x.strokeRect(5, 5, FW - 10, FH - 10);
  x.fillStyle = 'rgba(80,55,20,.18)'; x.fillRect(0, 0, 14, FH); // spine crease
  // printed header box
  x.save(); x.translate(FW / 2, FH / 2);
  text(x, 'RITRATTO DI SIGNORA', 0, -298, { size: 34, family: FONT.type, color: '#3a2a12', weight: 400 });
  text(x, '여인의 초상 · 도난 사건', 0, -242, { size: 44, weight: 800, color: '#3a2a12' });
  L.hline(x, -262, -200, 524, 'rgba(60,40,10,.6)', 3);
  // pre-printed form: faint rules under the three entries + a dashed remarks box (where the stamp will land)
  for (const y of [-98, -18, 62]) L.hline(x, -262, y, 524, 'rgba(60,40,10,.16)', 2);
  x.save(); x.setLineDash([10, 8]); x.strokeStyle = 'rgba(60,40,10,.18)'; x.lineWidth = 2; roundRect(x, -262, 110, 524, 220, 8); x.stroke(); x.restore();
  x.restore();
  return c;
}
function makeCoverInside() {
  const [c, x] = mk(FW, FH); const R = rng(616);
  x.fillStyle = '#b8955a'; x.fillRect(0, 0, FW, FH);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); x.globalAlpha = .25; x.fillStyle = pat; x.fillRect(0, 0, FW, FH); x.globalAlpha = 1;
  const g = x.createLinearGradient(FW, 0, 0, 0); g.addColorStop(0, 'rgba(60,40,10,.35)'); g.addColorStop(.25, 'rgba(60,40,10,0)'); x.fillStyle = g; x.fillRect(0, 0, FW, FH);
  for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,240,200' : '70,45,15'},${R() * .06})`; x.fillRect(R() * FW, R() * FH, 2, 2); }
  // discovery photo, clipped
  x.save(); x.translate(FW / 2 + 10, 300); x.rotate(-.04);
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 18; x.shadowOffsetY = 8; x.fillStyle = '#ece5d4'; x.fillRect(-200, -190, 400, 420); x.shadowColor = 'transparent';
  x.fillStyle = '#0a0b0d'; x.fillRect(-180, -170, 360, 330);
  x.save(); x.beginPath(); x.rect(-180, -170, 360, 330); x.clip();
  // black bag + canvas peeking out
  drawBag(x, 0, 60, 330, 210, .4, 0);
  x.save(); x.translate(10, -40); x.rotate(.06); x.filter = 'saturate(.55) brightness(.8)'; x.drawImage(T.portrait, 60, 40, 480, 520, -120, -130, 240, 260); x.filter = 'none'; x.restore();
  const vg = x.createRadialGradient(0, 0, 60, 0, 0, 260); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = vg; x.fillRect(-180, -170, 360, 330);
  x.restore();
  text(x, '2019.12 발견', 0, 198, { size: 40, family: FONT.serif, weight: 900, color: '#2a2418' });
  // paper clip
  x.strokeStyle = '#9aa1a8'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(-120, -230); x.lineTo(-120, -150); x.arc(-104, -150, 16, Math.PI, 0, true); x.lineTo(-88, -214); x.arc(-100, -214, 12, 0, Math.PI, true); x.lineTo(-112, -168); x.stroke();
  x.restore();
  text(x, '발견 후 수사', FW / 2, 640, { size: 46, family: FONT.serif, weight: 900, color: '#3a2a12' });
  L.hline(x, FW / 2 - 150, 676, 300, 'rgba(163,18,26,.7)', 4);
  return c;
}
function makePageBase(seed, title) {
  const [c, x] = mk(PW, PH); const R = rng(seed);
  const pat = x.createPattern(L.TEX.paper, 'repeat'); pat.setTransform(new DOMMatrix().translate(-seed * 7, -seed * 3));
  x.fillStyle = pat; x.fillRect(0, 0, PW, PH); x.fillStyle = 'rgba(255,252,244,.3)'; x.fillRect(0, 0, PW, PH);
  const g = x.createRadialGradient(PW / 2, PH / 2, 120, PW / 2, PH / 2, 520); g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(110,80,30,.25)'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
  // fastener holes
  for (const hx of [PW / 2 - 110, PW / 2 + 110]) { x.fillStyle = '#5a4a32'; x.beginPath(); x.arc(hx, 36, 9, 0, 7); x.fill(); }
  if (title) { text(x, title, PW / 2, 108, { size: 44, weight: 900, color: '#2b241a' }); L.hline(x, 60, 146, PW - 120, 'rgba(60,40,10,.45)', 2); }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(40,40,40,.22)'; x.fillRect(60, 600 + i * 20, PW - 120 - R() * 140, 8); }
  return c;
}
function makePageXray() {
  const c = makePageBase(21, '엑스레이 대조'); const x = c.getContext('2d');
  x.save(); x.translate(PW / 2, 370);
  x.fillStyle = '#0b1424'; x.fillRect(-200, -200, 400, 400);
  x.save(); x.beginPath(); x.rect(-200, -200, 400, 400); x.clip();
  x.globalAlpha = .28; x.filter = 'grayscale(1) invert(1) brightness(.6)'; x.drawImage(T.portrait, -171, -200, 342, 400); x.filter = 'none';
  x.globalAlpha = .95; x.globalCompositeOperation = 'lighter'; x.drawImage(T.ghost, -171, -200, 342, 400); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  x.restore(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 4; x.strokeRect(-200, -200, 400, 400);
  x.restore();
  return c;
}
function makePageSeals() {
  const c = makePageBase(33, '뒷면 봉인 대조'); const x = c.getContext('2d');
  canvasBack(x, PW / 2, 370, .55, 99, 0);
  return c;
}
// split-flap text (copy of KL.flap without the per-cell shadowBlur, which is slow)
function flap2(ctx, s, x, y, t, t0, { size = 120, cell = .74, lock = .07, roll = .45, color = '#f4f1ea', bg = '#14161b' } = {}) {
  const chars = Array.from(s); const cw = size * cell, ch = size * 1.28, gap = size * .08;
  const total = chars.length * (cw + gap) - gap; let cx = x - total / 2;
  chars.forEach((c, i) => {
    const tl = t0 + roll + i * lock, locked = t >= tl, f = Math.floor(t * 30) + i * 7;
    const shown = locked ? c : '0123456789'[Math.floor(hash(f) * 10)];
    ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(ctx, cx + 3, y - ch / 2 + 8, cw, ch, 10); ctx.fill();
    ctx.fillStyle = bg; roundRect(ctx, cx, y - ch / 2, cw, ch, 10); ctx.fill();
    const g = ctx.createLinearGradient(0, y - ch / 2, 0, y + ch / 2); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; roundRect(ctx, cx, y - ch / 2, cw, ch, 10); ctx.fill();
    const fl = locked ? clamp((t - tl) / .08) : (t * 30 % 1);
    ctx.save(); ctx.beginPath(); ctx.rect(cx, y - ch / 2, cw, ch); ctx.clip();
    ctx.translate(cx + cw / 2, y); ctx.scale(1, locked ? lerp(.2, 1, E.outBack(fl)) : .85 + .15 * Math.cos(fl * Math.PI));
    text(ctx, shown, 0, size * .04, { size, family: FONT.disp, color: locked ? color : '#aab', weight: 400 });
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(cx, y - 2, cw, 4);
    cx += cw + gap;
  });
}

function hourglass(ctx, x, y, s, sand, rot, grey, T) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const glass = grey > .5 ? '#7d7a74' : '#7a5a26', sandC = grey > .5 ? '#8f8a80' : '#d9a93a';
  ctx.fillStyle = '#3a2a12'; roundRect(ctx, -30, -46, 60, 9, 3); ctx.fill(); roundRect(ctx, -30, 37, 60, 9, 3); ctx.fill();
  const bulb = (top) => { const d = top ? -1 : 1; ctx.beginPath(); ctx.moveTo(-22, 37 * d); ctx.bezierCurveTo(-24, 14 * d, -4, 6 * d, -3, 0); ctx.lineTo(3, 0); ctx.bezierCurveTo(4, 6 * d, 24, 14 * d, 22, 37 * d); ctx.closePath(); };
  ctx.save(); bulb(true); ctx.clip(); const ty = lerp(-4, -37, sand); ctx.fillStyle = sandC; ctx.fillRect(-25, ty, 50, 40); ctx.restore();
  ctx.save(); bulb(false); ctx.clip(); const by = lerp(37, 10, 1 - sand); ctx.fillStyle = sandC; ctx.beginPath(); ctx.moveTo(-25, 37); ctx.lineTo(-25, by + 10); ctx.quadraticCurveTo(0, by - 8, 25, by + 10); ctx.lineTo(25, 37); ctx.closePath(); ctx.fill(); ctx.restore();
  if (sand > .01 && sand < .99) { ctx.fillStyle = sandC; ctx.fillRect(-1.2, -2, 2.4, 34 + Math.sin(T * 40) * 2); }
  ctx.strokeStyle = glass; ctx.lineWidth = 3; bulb(true); ctx.stroke(); bulb(false); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -30); ctx.quadraticCurveTo(-17, -18, -8, -10); ctx.stroke();
  ctx.restore();
}
// dotted leader between a label and its value
function leader(ctx, x0, x1, y, p) { if (p <= 0) return; ctx.save(); ctx.fillStyle = 'rgba(60,40,10,.45)'; for (let xx = x0; xx < lerp(x0, x1, p); xx += 12) { ctx.beginPath(); ctx.arc(xx, y, 2, 0, 7); ctx.fill(); } ctx.restore(); }

const CAM = [ // t, x, y, zoom, rot
  [-.4, 541, 950, 1.085, -.009],
  [0, 541, 950, 1.085, -.009],
  [.6, 548, 952, 1.05, -.006],
  [1.3, 552, 940, 1.09, -.004],
  [1.85, 548, 944, 1.075, -.004],
  [2.4, 262, 1002, .86, 0],
  [3.1, 268, 996, .875, .003],
  [3.62, 280, 990, .885, .004],
  [4.12, 552, 980, 1.0, -.004],
  [4.6, 552, 980, 1.0, -.006],
  [5.7, 548, 968, 1.06, -.01],
];

window.KL.scenes.closed = function (ctx, t, d, info) {
  const ND = window.KL.newsDesk; if (!ND) return;
  ND.ensure(); const T = info.T;
  if (!V) {
    V = {};
    V.cover = makeCoverBase(); V.inside = makeCoverInside();
    V.pB = makePageXray(); V.pC = makePageSeals(); V.pD = makePageBase(45, '발견 후 수사');
    [V.cf, V.cfx] = mk(FW, FH); [V.pf, V.pfx] = mk(PW, PH);
  }
  const tJul = at(info, '절도', .02), tGong = at(info, '공소시효는', .09), tJi = at(info, '지났고', .21), tBal = at(info, '발견', .36), tHu = at(info, '후', .45),
    tSu = at(info, '수사도', .5), tY = at(info, '2021', .59), tGi = at(info, '기소', .74), tEops = at(info, '없이', .79), tJong = at(info, '종결됐다', .84);
  const ve = vend(info);
  const tDrop = .05, tTick1 = tGong + .2, tTick2 = tY + .1, tSlam = tJong + .1;

  // ---------- phases ----------
  const fall = P(t, -.3, tDrop, E.inQ);                            // folder falls from above the camera
  const slamK = t > tDrop ? Math.exp(-(t - tDrop) * 7) : 0;
  const open = P(t, tBal - .12, tBal + .3, E.inOutC) * (1 - P(t, tGi - .26, tGi + .04, E.inOutC));
  const preLift = Math.sin(Math.PI * P(t, tBal - .25, tBal - .05)) * .05;
  const closeK = t > tGi + .04 ? Math.exp(-(t - tGi - .04) * 9) : 0;
  const stampK = t > tSlam ? Math.exp(-(t - tSlam) * 6) : 0;
  const flipB = P(t, tSu - .14, tSu + .08, E.inOutQ), flipC = P(t, tSu + .1, tSu + .3, E.inOutQ);
  // lamp clicks off at the end: on, off, on, off
  const tOff = Math.max(tSlam + .45, ve - .2);
  let lampOn = 1;
  if (t > tOff) { const k = t - tOff; lampOn = k < .05 ? .15 : k < .1 ? .8 : k < .14 ? .1 : k < .17 ? .45 : clamp(.1 - (k - .17) * .5); }

  // ---------- camera ----------
  const cam = ND.camAt(CAM, t), dr = drift(T, .45, 7);
  const shake = slamK * 1.2 + closeK * .45 + stampK * 1.15;
  ctx.save();
  camera(ctx, { x: cam[0] + dr.x + shake * noise1(T * 22, 7) * 18, y: cam[1] + dr.y + shake * noise1(T * 22, 8) * 18, zoom: cam[2] * (1 + .012 * stampK + .01 * slamK), rot: 0, shake: 0, t: T, seed: 6 });
  ND.deskLayer(ctx);
  ND.steam(ctx, T, lampOn);
  ND.envelope(ctx, { x: ND.ENV.x, y: ND.ENV.y, r: ND.ENV.r, s: 1, lift: 0 });
  // the stamped letter (final state of 14_letter) — flutters a little when the folder lands on it
  if (fall < 1 || t < tDrop + .03) ND.letter(ctx, Object.assign({}, ND.FINAL_LETTER, { x: ND.LET.x, y: ND.LET.y, r: ND.LET.r, s: 1, T }));
  else { // only a sliver of the letter shows under the folder: draw just its paper edge
    ctx.save(); ctx.translate(ND.LET.x, ND.LET.y); ctx.rotate(ND.LET.r); ctx.fillStyle = '#d9cfb9'; ctx.fillRect(-ND.LET.w / 2, -ND.LET.h / 2, ND.LET.w, ND.LET.h); ctx.restore();
  }

  // ---------- folder ----------
  ctx.save();
  const fs = lerp(1.55, 1, fall), fa = clamp((t + .3) / .12);
  ctx.translate(FO.x + 60 * (1 - fall), FO.y - 140 * (1 - fall)); ctx.rotate(FO.r + .14 * (1 - fall) + slamK * Math.sin(T * 40) * .006); ctx.scale(fs, fs);
  ctx.globalAlpha = fa;
  // shadow under the folder (offset grows with height)
  const hgt = 1 - fall + preLift;
  ND.soft(ctx, -FW / 2 + 14 + 90 * hgt, -FH / 2 - 40 + 22 + 150 * hgt, FW, FH + 40, 34 + 110 * hgt, .72);
  // back panel + tab
  ctx.fillStyle = '#b8955a'; ctx.fillRect(-FW / 2, -FH / 2, FW, FH);
  ctx.fillStyle = '#c4a165'; roundRect(ctx, 96, -FH / 2 - 40, 200, 52, 10); ctx.fill();
  text(ctx, 'CASE 1997-PC', 196, -FH / 2 - 16, { size: 25, family: FONT.type, color: '#4a3a20', weight: 400 });
  // pages (visible while open): D at the bottom, C, B on top — fastener at the top
  if (open > 0) {
    const px = 8, py = 12;
    const drawPage = (img, f, alpha = 1) => {
      const s = Math.cos(Math.PI * clamp(f)), hy = py - PH / 2;
      ctx.save(); ctx.translate(px, hy); ctx.scale(1 + .04 * Math.sin(Math.PI * f), s); ctx.globalAlpha *= alpha;
      if (s > 0) { ND.soft(ctx, -PW / 2, 6, PW, PH, 12, .35); ctx.drawImage(img, -PW / 2, 0); }
      else { ctx.globalAlpha *= clamp(1 + s * 1.25); ctx.fillStyle = '#d8ceb6'; ctx.fillRect(-PW / 2, 0, PW, PH); }
      const sh = (1 - Math.abs(s)) * .5; if (sh > 0) { ctx.fillStyle = `rgba(30,20,8,${sh})`; ctx.fillRect(-PW / 2, 0, PW, PH); }
      ctx.restore();
    };
    // only the pages that can be seen are drawn: B on top; C once B lifts; D once C lifts
    const lk = P(t, tTick2, tTick2 + .25);
    if (flipC > 0) {
    const pf = V.pfx; pf.setTransform(1, 0, 0, 1, 0, 0); pf.clearRect(0, 0, PW, PH); pf.drawImage(V.pD, 0, 0);
    pf.save(); pf.translate(PW / 2, 330);
    flap2(pf, '2021', 0, 0, t, tY - .235, { size: 104, roll: .2, lock: .045, color: '#f4f1ea', bg: '#16181d' });
    if (lk > 0) { pf.globalAlpha = lk; text(pf, '수사 종결', 0, 140, { size: 46, weight: 900, color: RED }); L.hline(pf, -110, 172, 220 * E.outC(lk), RED, 4); pf.globalAlpha = 1; }
    pf.restore();
    drawPage(V.pf, 0);
    if (lk > 0 && lk < 1) { ctx.save(); ctx.translate(px, py - PH / 2 + 330); glow(ctx, 0, 0, 260, K.goldHi, .35 * (1 - lk)); ctx.restore(); }
    }
    if (flipB > 0 && flipC < 1) drawPage(V.pC, flipC);
    if (flipB < 1) drawPage(V.pB, flipB);
    // fastener bar
    ctx.fillStyle = '#6d737a'; roundRect(ctx, px - 140, py - PH / 2 + 22, 280, 26, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px - 132, py - PH / 2 + 26, 264, 4);
  }
  // cover: left hinge. front (rows) when s>0, inside (photo) when s<0
  const s = Math.cos(Math.PI * open), bulge = 1 + .05 * Math.sin(Math.PI * open);
  ctx.save(); ctx.translate(-FW / 2, 0); ctx.scale(s, bulge);
  if (s > 0) {
    const q = (a, b) => Math.round(P(t, a, b) * 60);
    const key = [q(tGong, tJi + .7), q(tGi - .02, tEops + .2)].join();
    const c = V.cfx;
    if (key !== V.coverKey || (t > tTick1 && t < tJi + .05)) { V.coverKey = key;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, FW, FH); c.drawImage(V.cover, 0, 0); c.translate(FW / 2, FH / 2);
    // row 1: statute
    const r1 = P(t, tGong + .02, tGong + .22, E.outC);
    if (r1 > 0) {
      const sand = 1 - P(t, tTick1, tJi + .02, E.inOutQ), tip = P(t, tJi + .05, tJi + .35, E.outBack), grey = P(t, tJi + .1, tJi + .4);
      const hp = ND.OB(P(t, tGong + .08, tTick1 + .05), 2.4);
      if (hp > 0) hourglass(c, -250, -126 - 4 * tip, .6 * hp, sand, tip * 1.57, grey, T);
      c.globalAlpha = clamp(r1 * 2);
      text(c, typeSub('절도죄 공소시효', P(t, tGong + .02, tGong + .3)), -212, -126, { size: 38, weight: 800, color: '#3a2a12', align: 'left' });
      leader(c, 82, 186, -120, P(t, tGong + .25, tJi));
      c.globalAlpha = 1;
      const ex = P(t, tJi + .02, tJi + .18);
      if (ex > 0) { const fk = 1 - P(t, tJi + .05, tJi + .6); if (fk > 0) { c.fillStyle = `rgba(227,38,47,${.16 * fk})`; c.fillRect(-282, -160, 564, 68); } L.hline(c, 205, -98, 80 * E.outC(ex), RED, 4); }
      if (ex > 0) { c.save(); c.translate(244, -126); const k = lerp(1.9, 1, E.outBack(ex, 2.2)); c.scale(k, k); text(c, '만료', 0, 0, { size: 46, weight: 900, color: RED, alpha: clamp(ex * 3) }); c.restore(); }
    }
    // rows 2 + 3 (after the case is closed again)
    const r2 = P(t, tGi - .02, tGi + .2, E.outC), r3 = P(t, tGi + .02, tGi + .22, E.outC);
    if (r2 > 0) {
      c.globalAlpha = clamp(r2 * 2); text(c, typeSub('발견 후 수사', r2), -262, -44, { size: 38, weight: 800, color: '#3a2a12', align: 'left' }); leader(c, -40, 64, -38, r2);
      c.globalAlpha = 1; const v2 = P(t, tGi + .1, tGi + .26); if (v2 > 0) text(c, '2021 종결', 268, -44, { size: 42, weight: 900, color: RED, align: 'right', alpha: v2 });
    }
    if (r3 > 0) {
      c.globalAlpha = clamp(r3 * 2); text(c, '기소', -262, 38, { size: 38, weight: 800, color: '#3a2a12', align: 'left' }); leader(c, -170, 186, 44, r3);
      c.globalAlpha = 1; const v3 = P(t, tEops, tEops + .16);
      if (v3 > 0) { c.save(); c.translate(240, 38); const k = lerp(1.8, 1, E.outBack(v3, 2.2)); c.scale(k, k); text(c, '없음', 0, 0, { size: 46, weight: 900, color: RED, alpha: clamp(v3 * 3) }); c.restore(); }
    }
    }
    if (s < .995) ND.soft(ctx, 10 * (1 - s), -FH / 2 + 4, FW, FH, 6 + 20 * (1 - s), .45 * (1 - s) + .1);
    ctx.drawImage(V.cf, 0, -FH / 2);
  } else {
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(V.inside, -FW, -FH / 2); ctx.restore();
  }
  const shd = (1 - Math.abs(s)) * .55; if (shd > 0) { ctx.fillStyle = `rgba(25,15,5,${shd})`; ctx.fillRect(0, -FH / 2, FW, FH); }
  ctx.restore();
  // stamp imprint on the closed cover
  if (t >= tSlam) ND.imprint(ctx, '미제 종결', 0, 212, P(t, tSlam, tSlam + .08), 118, '#d4202c', -.16);
  ctx.restore();

  // folder landing burst (manila dust) + stamp
  // folder landing: air pushes dust out from under its edges
  if (t > tDrop && t < tDrop + .8) {
    const k = t - tDrop, e = 1 - Math.exp(-k * 6), fade = 1 - k / .8;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const side = i % 4, u = hash(i * 13 + 2) * 2 - 1, j = hash(i * 7 + 9);
      let px, py, nx, ny;
      if (side === 0) { px = u * FW / 2; py = -FH / 2; nx = u * .3; ny = -1; } else if (side === 1) { px = FW / 2; py = u * FH / 2; nx = 1; ny = u * .3; }
      else if (side === 2) { px = u * FW / 2; py = FH / 2; nx = u * .3; ny = 1; } else { px = -FW / 2; py = u * FH / 2; nx = -1; ny = u * .3; }
      const dd = e * (40 + j * 120);
      ctx.fillStyle = `rgba(235,220,190,${.22 * fade * (.4 + j * .6)})`;
      ctx.beginPath(); ctx.arc(FO.x + px + nx * dd, FO.y + py + ny * dd, 3 + j * 9 * e, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  const cr = Math.cos(FO.r), sr = Math.sin(FO.r), sxw = FO.x - 212 * sr, syw = FO.y + 212 * cr;
  ND.stampDrop(ctx, '미제 종결', 118, '#d4202c', sxw, syw, FO.r - .16, t, tSlam - .3, tSlam);
  ND.slamBurst(ctx, sxw, syw, t - tSlam, 5);

   ND.lampLight(ctx, T, lampOn);
  if (fall >= 1) ND.blinds(ctx, T, .6 + .4 * lampOn, FO.x, FO.y, FW, FH, FO.r);

  // investigator's cast shadow (fedora, coat): steps up before 발견, opens the cover, flips the pages,
  // closes it, reaches for the stamp, then steps back as the lamp goes out
  const vis = P(t, tJi + .15, tBal - .2) * (1 - P(t, tSlam + .35, tOff + .1));
  if (vis > 0) {
    const lean = P(t, tJi + .15, tBal - .1, E.inOutQ) * (1 - P(t, tSlam + .2, tOff + .2, E.inOutQ));
    // right arm stays raised and sweeps over the top (never through a flat pose): cover edge → open to the left →
    // flicks the pages → back left for the cover → closes it to the right → presses the stamp
    const [a1, a2] = ND.camAt([[tJi + .1, 2.35, -.2], [tBal - .15, 2.25, -.25], [tBal + .3, 3.75, .2], [tSu - .3, 3.2, .2], [tSu - .1, 3.45, .5], [tSu + .08, 3.05, .1],
      [tSu + .2, 3.45, .5], [tSu + .36, 3.1, .15], [tY + .25, 3.2, .3], [tGi - .3, 3.8, .2], [tGi + .05, 2.4, -.2], [tSlam - .25, 2.95, .3], [tSlam, 3.0, .62], [tSlam + .3, 2.8, .1], [d, 2.6, 0]], t);
    const sweep = Math.sin(Math.PI * P(t, tGi - .3, tGi + .1));
    ND.castShadow(ctx, 800 - 40 * sweep, 2150, 1060, lerp(.6, 1.16, lean) + .01 * Math.sin(T * 1.5), .52 * vis, {
      hat: 'fedora', coat: true, headTurn: .4 * Math.sin(Math.PI * P(t, tY - .2, tY + .5)) - .3 * Math.sin(Math.PI * P(t, tBal - .2, tBal + .5)),
      armL: [lerp(.12, .2, lean), lerp(-.1, -.15, lean)], armR: [a1, a2],
    }, lerp(.02, -.1, lean) + .06 * sweep, true);
  }
  ctx.restore();

  // ---------- screen-space FX + HUD ----------
  ND.bokeh(ctx, T, cam, .4 + .6 * lampOn);
  motes(ctx, T, { n: 30, color: '#ffe2b0', a: .3 * lampOn, seed: 43, area: [60, 470, 960, 760], size: 2.6, speed: 14 });
  ND.subBand(ctx, 1);
  const chA = P(t, tSlam + .12, tSlam + .38, E.outBack);
  if (chA > 0) {
    ctx.save(); ctx.translate(540, 1232); const k = lerp(.8, 1, clamp(chA)); ctx.scale(k, k);
    chip(ctx, '2021.11 판사 결정 · 기소 없이 종결', 0, 0, clamp(chA * 2), { size: 34, border: rgba(K.red, .7) });
    ctx.restore();
  }
  if (slamK > 0) flash(ctx, slamK * .12, '#fff1dc');
  if (stampK > 0) { flash(ctx, stampK * .22, '#fff4e6'); tint(ctx, '#5a0008', .18 * stampK, 'multiply'); }
 };
})();
