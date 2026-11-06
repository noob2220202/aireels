// verdict: "조사위원회는 파리아의 과실을 형사적 중과실로 볼 수 있다고 판단했지만, 과실치사로 기소된 사람이나 회사는 아직 없습니다."
// Calm piano coda. The black of the pipe gives way to a cold dawn grey-blue. A code-drawn report cover (no logo) comes up
// out of the dark under a raking cold light; on '과실을' it recedes and an excerpt sheet slides into focus: the English
// finding in small type, the Korean in large serif, swept with a highlighter on '중과실로'; '판단했지만' is a held beat
// on that one finding (no second quote: it could only flash for ~0.5 s before the card covered it). On '과실치사로' the
// sheet dims and backs off, a status card rises; it waits (caret, dots) and on '없습니다' the value lands:
// '없음 (2026.11 기준)'. The CoE caveat footnote stays visible under the focal area at a phone-legible size.
(function () {
const { W, H, E, P, clamp, lerp, hash, rgba, glow, text, measure, roundRect, setFont, FONT, godrays, motes, drift, camera, typeSub } = L;
const { at, lerp2 } = window.PK;

// ---------- cached sprites ----------
let PAPER = null;
function paperTex() {
  if (PAPER) return PAPER;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const id = x.createImageData(256, 256); const R = L.rng(4242);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const o = (j * 256 + i) * 4, n = (R() - .5) * 13 + (R() < .003 ? -28 * R() : 0);
    id.data[o] = 201 + n; id.data[o + 1] = 209 + n; id.data[o + 2] = 216 + n; id.data[o + 3] = 255;
  }
  x.putImageData(id, 0, 0); PAPER = c; return c;
}
const SHADOWS = {};
function shadowSprite(w, h, blur = 26) {
  const key = w + 'x' + h; if (SHADOWS[key]) return SHADOWS[key];
  const pad = blur * 3, c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2; const x = c.getContext('2d');
  x.filter = `blur(${blur}px)`; x.fillStyle = 'rgba(0,0,0,.9)'; x.fillRect(pad, pad, w, h);
  return (SHADOWS[key] = { c, pad });
}
// oily sheen left over from the pipe (fixed copy of PK.dark's texture; shared cache with "lost")
function sheenTex() {
  if (window.PK._sheenRB) return window.PK._sheenRB;
  const { fbm } = L; const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
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
function sheen(ctx, t, k, seed) {
  if (k <= .005) return;
  const [b, x] = L.buf('vdSheen', 270, 480);
  x.fillStyle = '#000'; x.fillRect(0, 0, 270, 480); x.scale(.25, .25); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025); x.drawImage(sheenTex(), dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}

// ---------- paper helpers (local coords, sheet centred on 0,0) ----------
function sheetBase(ctx, w, h, seed) {
  const s = shadowSprite(w, h); ctx.save(); ctx.globalAlpha *= .8; ctx.drawImage(s.c, -w / 2 - s.pad + 8, -h / 2 - s.pad + 24); ctx.restore();
  const pat = ctx.createPattern(paperTex(), 'repeat'); pat.setTransform(new DOMMatrix().translate(hash(seed) * 256, hash(seed + 1) * 256));
  ctx.fillStyle = pat; ctx.fillRect(-w / 2, -h / 2, w, h);
}
// cold raking light from the upper left + a soft fall-off; then the edge catch-light
function sheetLight(ctx, w, h, sweepU = -1) {
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, 'rgba(236,246,255,.10)'); g.addColorStop(.5, 'rgba(60,80,100,.08)'); g.addColorStop(1, 'rgba(8,18,28,.42)');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  if (sweepU > -.5 && sweepU < 1.5) {
    // a band of light travelling across the sheet (dawn coming up)
    const L0 = Math.hypot(w, h), cx = -w / 2 + sweepU * (w + h * .6), sg = ctx.createLinearGradient(cx - 160, -h / 2, cx + 160, h / 2);
    sg.addColorStop(0, 'rgba(225,240,255,0)'); sg.addColorStop(.5, 'rgba(225,240,255,.2)'); sg.addColorStop(1, 'rgba(225,240,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = sg; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2 + .75, -h / 2 + .75, w - 1.5, h - 1.5);
}
function shade(ctx, w, h, a) { if (a > .002) { ctx.fillStyle = `rgba(3,8,12,${a.toFixed(3)})`; ctx.fillRect(-w / 2, -h / 2, w, h); } }
// highlighter stroke under a phrase (drawn before the text; multiply keeps the ink dark)
function marker(ctx, x, y, w, h, p, seed, color = 'rgba(255,190,80,.95)') {
  if (p <= 0) return; const ww = (w + 14) * p, N = 7, x0 = x - 7;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i <= N; i++) { const xx = x0 + ww * i / N; ctx[i ? 'lineTo' : 'moveTo'](xx, y - h / 2 + (hash(seed + i) - .5) * 5 - i * .5); }
  ctx.lineTo(x0 + ww + 4, y + (hash(seed + 40) - .5) * 4);
  for (let i = N; i >= 0; i--) { const xx = x0 + ww * i / N - (i === N ? 3 : 0); ctx.lineTo(xx, y + h / 2 + (hash(seed + 20 + i) - .5) * 5 - i * .5); }
  ctx.lineTo(x0 - 3, y + (hash(seed + 41) - .5) * 4);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function wrap(ctx, s, size, family, weight, maxW) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (cur && measure(ctx, tryS, size, family, weight) > maxW) { lines.push(cur); cur = w; } else cur = tryS; }
  if (cur) lines.push(cur); return lines;
}
// x offset + width of `phrase` inside `line` (left aligned)
function span(ctx, line, phrase, size, family, weight) {
  const i = line.indexOf(phrase); if (i < 0) return [0, measure(ctx, line, size, family, weight)];
  return [measure(ctx, line.slice(0, i), size, family, weight), measure(ctx, phrase, size, family, weight)];
}

// ---------- the cover ----------
const CW = 500, CH = 660;
function cover(ctx, t, r1, r2, sweepU) {
  sheetBase(ctx, CW, CH, 3);
  // slate band at the foot, fine inset frame
  ctx.fillStyle = '#16222b'; ctx.fillRect(-CW / 2, CH / 2 - 150, CW, 150);
  ctx.fillStyle = 'rgba(160,190,210,.18)'; for (let i = 0; i < 3; i++) ctx.fillRect(-CW / 2 + 40, CH / 2 - 112 + i * 14, CW - 80 - i * 90, 2);
  ctx.strokeStyle = 'rgba(22,34,43,.38)'; ctx.lineWidth = 1.5; ctx.strokeRect(-CW / 2 + 22, -CH / 2 + 22, CW - 44, CH - 44 - 150);
  ctx.fillStyle = '#16222b'; ctx.fillRect(-CW / 2 + 40, -CH / 2 + 60, 64, 6);
  // title, letter-spacing settling as it comes up
  const a1 = E.outC(clamp(r1 * 1.25)), a2 = E.outC(clamp(r1 * 1.25 - .2));
  text(ctx, '조사위원회', 0, -96 + 10 * (1 - a1), { size: 70, family: FONT.serif, weight: 900, color: '#0f1a22', alpha: a1, ls: lerp(16, 3, a1) });
  text(ctx, '최종 보고서', 0, -10 + 10 * (1 - a2), { size: 70, family: FONT.serif, weight: 900, color: '#0f1a22', alpha: a2, ls: lerp(16, 3, a2) });
  const rw = 170 * E.inOutQ(clamp(r2 * 1.4));
  if (rw > 0) { ctx.fillStyle = '#2b3a46'; ctx.fillRect(-rw / 2, 52, rw, 3); }
  const a3 = E.outQ(clamp(r2 * 1.4 - .3));
  text(ctx, '2023.11.30 제출 · 2024.1 공개', 0, 100 + 8 * (1 - a3), { size: 28, weight: 700, color: '#33424e', alpha: a3 });
  sheetLight(ctx, CW, CH, sweepU);
}

// ---------- the excerpt sheet ----------
const SW = 920, SHt = 540, QX = -SW / 2 + 92, QW = SW - 92 - 70;
let LAY = null;
function layout(ctx, data) {
  if (LAY) return LAY;
  const en = wrap(ctx, data.quote_en, 27, FONT.sub, 500, QW);
  const ko = ['파리아의 과실은 중과실,', '따라서 형사적 과실로', '규정될 수 있다'];
  const koL = ko.join(' ') === data.quote_ko ? ko : wrap(  // data changed: fall back to wrapping
    ctx, data.quote_ko, 52, FONT.serif, 900, QW);
  return (LAY = { en, ko: koL });
}
function excerpt(ctx, t, data, B) {
  const lay = layout(ctx, data);
  sheetBase(ctx, SW, SHt, 8);
  const top = -SHt / 2;
  // running head + faux surrounding body text
  text(ctx, '조사위원회 최종 보고서', -SW / 2 + 70, top + 44, { size: 22, weight: 700, color: '#5d6b76', align: 'left' });
  const hw = measure(ctx, '조사위원회 최종 보고서', 22, FONT.sub, 700);
  ctx.fillStyle = 'rgba(70,88,102,.35)'; ctx.fillRect(-SW / 2 + 70 + hw + 18, top + 44, SW - 140 - hw - 18, 1.5);
  ctx.fillStyle = 'rgba(60,76,90,.13)';
  for (let i = 0; i < 2; i++) for (let j = 0, x = -SW / 2 + 70; j < 9 && x < SW / 2 - 90; j++) { const w = 30 + hash(i * 17 + j * 3) * 70; ctx.fillRect(x, top + 82 + i * 24, w, 9); x += w + 12; }
  for (let j = 0, x = -SW / 2 + 70; j < 9 && x < SW / 2 - 90; j++) { const w = 30 + hash(j * 5 + 77) * 70; ctx.fillRect(x, SHt / 2 - 38, w, 9); x += w + 12; }
  // quote mark
  text(ctx, '“', -SW / 2 + 36, top + 192, { size: 120, family: FONT.serif, weight: 900, color: '#a9b6c0', align: 'left', alpha: B.en > 0 ? E.outQ(clamp(B.en * 3)) : 0 });
  // English (small): typed in, then underlined under the key phrase
  const enY = top + 168;
  lay.en.forEach((ln, i) => {
    const y = enY + i * 36, typed = typeSub(lay.en.join('\n'), B.en).split('\n')[i] || '';
    text(ctx, typed, QX, y, { size: 27, weight: 500, color: '#3a4955', align: 'left' });
  });
  // underline 'gross negligence and consequently criminal' (may span the line break)
  if (B.enU > 0) {
    const key = 'gross negligence and consequently criminal'; const full = lay.en.join(' '); const k0 = full.indexOf(key);
    if (k0 >= 0) {
      let off = 0; const segs = [];
      lay.en.forEach((ln, i) => { const a = Math.max(k0, off), b = Math.min(k0 + key.length, off + ln.length); if (b > a) segs.push([i, a - off, b - off]); off += ln.length + 1; });
      const tot = segs.reduce((s, [i, a, b]) => s + measure(ctx, lay.en[i].slice(a, b), 27, FONT.sub, 500), 0); let acc = 0;
      ctx.fillStyle = 'rgba(214,130,30,.95)';
      for (const [i, a, b] of segs) {
        const x0 = measure(ctx, lay.en[i].slice(0, a), 27, FONT.sub, 500), w = measure(ctx, lay.en[i].slice(a, b), 27, FONT.sub, 500);
        const draw = clamp(B.enU * tot - acc, 0, w); if (draw > 0) ctx.fillRect(QX + x0, enY + i * 36 + 18, draw, 3); acc += w;
      }
    }
  }
  // Korean (large serif), highlighter sweep on the finding
  const koY = top + 270, kS = 52, kLH = 68;
  const marks = [['중과실,', 0], ['따라서 형사적 과실로', 1]];
  lay.ko.forEach((ln, i) => {
    const y = koY + i * kLH;
    marks.forEach(([ph, li], m) => { if (li !== i || B.mk <= 0) return; const [x0, w] = span(ctx, ln, ph, kS, FONT.serif, 900); marker(ctx, QX + x0, y + 4, w, kS * .78, clamp(B.mk * 2 - m * .9), 300 + m * 50); });
  });
  lay.ko.forEach((ln, i) => {
    const a = E.outC(clamp(B.ko * 2.2 - i * .45)); if (a <= 0) return;
    text(ctx, ln, QX, koY + i * kLH + 10 * (1 - a), { size: kS, family: FONT.serif, weight: 900, color: '#0e1820', align: 'left', alpha: a });
  });
  sheetLight(ctx, SW, SHt, B.sweep);
}

// ---------- status card ----------
function statusCard(ctx, t, S) {
  const w = 860, h = 222;
  ctx.save(); ctx.globalAlpha *= S.a;
  const s = shadowSprite(w, h); ctx.save(); ctx.globalAlpha *= .7; ctx.drawImage(s.c, -w / 2 - s.pad, -h / 2 - s.pad + 18); ctx.restore();
  ctx.fillStyle = '#070c10'; roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(190,220,240,.26)'; ctx.lineWidth = 2; ctx.stroke();
  // accent bar: cold grey, turns red when the value lands
  ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.clip();
  ctx.fillStyle = '#566673'; ctx.fillRect(-w / 2, -h / 2, 8, h);
  if (S.none > 0) { ctx.fillStyle = rgba('#e3262f', S.none); ctx.fillRect(-w / 2, -h / 2, 8, h); }
  ctx.restore();
  ctx.restore();
  const a = S.a;
  text(ctx, '과실치사 기소:', 0, -50, { size: 46, weight: 800, color: '#dce9f2', alpha: a, ls: 1 });
  const uw = 300 * E.inOutQ(S.ul);
  if (uw > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(160,190,210,.35)'; ctx.fillRect(-uw / 2, -12, uw, 2); ctx.restore(); }
  const vy = 50;
  if (S.none <= 0) {
    // waiting: a blinking caret, then three dim dots breathing
    const blink = (Math.floor(t * 2.4) % 2 === 0) ? 1 : .15;
    if (S.caret > 0) { ctx.save(); ctx.globalAlpha *= a * S.caret * blink * (1 - S.dots * .6); ctx.fillStyle = '#cfe8ff'; ctx.fillRect(-2, vy - 30, 4, 60); ctx.restore(); }
    for (let i = 0; i < 3; i++) {
      const pa = S.dots * (.25 + .55 * Math.pow(.5 + .5 * Math.sin(t * 4.2 - i * 1.1), 2)) * (1 - S.hush * .7);
      if (pa > 0) { ctx.save(); ctx.globalAlpha *= a * pa; ctx.fillStyle = '#9fb4c4'; ctx.beginPath(); ctx.arc(-40 + i * 40, vy + 2, 7, 0, 7); ctx.fill(); ctx.restore(); }
    }
  } else {
    const wN = measure(ctx, '없음', 92, FONT.sub, 900), wD = measure(ctx, '(2026.11 기준)', 30, FONT.sub, 700), gap = 22;
    const x0 = -(wN + gap + wD * S.date) / 2;
    if (S.flare > 0) glow(ctx, x0 + wN / 2, vy, 230, '#e3262f', .22 * S.flare);
    const sc = lerp(1.35, 1, E.outBack(clamp(S.none), 2.2)), aN = clamp(S.none * 3);
    ctx.save(); ctx.translate(x0 + wN / 2, vy); ctx.scale(sc, sc);
    text(ctx, '없음', 0, 4, { size: 92, weight: 900, color: '#ec3a42', alpha: a * aN });
    ctx.restore();
    text(ctx, '(2026.11 기준)', x0 + wN + gap, vy + 18, { size: 30, weight: 700, color: '#9fb4c4', align: 'left', alpha: a * S.date });
  }
}

// camera that is the identity at zoom 1 (world = screen), zooming about the focal centre (540, FY)
const FY = 840;
function cam(ctx, t, { x = 0, y = 0, zoom = 1, rot = 0, shake = 0 }) {
  const { noise1 } = L; const sx = shake * noise1(t * 22, 161) * 18, sy = shake * noise1(t * 22, 162) * 18, sr = shake * noise1(t * 15, 163) * .01;
  ctx.translate(540 + sx, FY + sy); ctx.rotate(rot + sr); ctx.scale(zoom, zoom); ctx.translate(-540 - x, -FY - y);
}

window.PK.scenes.verdict = function (ctx, t, d, info) {
  const data = info.sc.data;
  const tA = at(info, '조사위원회', 0), tP = at(info, '파리아의', .12), tK = at(info, '과실을', .18), tH = at(info, '형사적', .25),
    tG = at(info, '중과실로', .31), tC = at(info, '과실치사로', .58), tKi = at(info, '기소된', .67),
    tCo = at(info, '회사는', .77), tY = at(info, '아직', .84), tN = at(info, '없습니다', .88);

  // ---- dawn: black -> cold grey-blue ----
  const kd = P(t, -.3, d - .2, E.inOutQ);
  // smooth light only: composed at quarter resolution and scaled up (cheap)
  { const [b, x] = L.buf('vdBg', 270, 480); x.scale(.25, .25);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, lerp2('#010203', '#26394a', kd)); g.addColorStop(.42, lerp2('#010203', '#152330', kd)); g.addColorStop(1, lerp2('#010203', '#05080b', kd));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    glow(x, 640, 700, 1150, '#9fb8c8', .11 * kd, 'screen');
    godrays(x, -80, 360, .6, .5, 2000, '#bcd6e6', .05 * kd, t, 6);
    ctx.drawImage(b, 0, 0, W, H); }
  sheen(ctx, t, .5 * (1 - P(t, -.3, 1.8, E.inOutQ)), 18);
  motes(ctx, t, { n: 46, color: '#cfe2ee', a: .32 * kd, size: 1.7, speed: 5, seed: 61, area: [0, 440, W, 900] });

  // ---- camera: slow push, a small knock on '중과실로' and on '없습니다' ----
  const dr = drift(t, .45, 16);
  const bG = t > tG ? Math.exp(-(t - tG) * 8) : 0, bN = t > tN ? Math.exp(-(t - tN) * 8) : 0;
  ctx.save();
  cam(ctx, t, { x: dr.x, y: dr.y, zoom: lerp(1, 1.06, P(t, -.3, d + .4, E.inOutQ)) + .014 * bG + .012 * bN, rot: dr.r, shake: .3 * bG + .35 * bN });

  // ---- report cover ----
  const cIn = P(t, -.3, .55, E.outC), away = P(t, tK - .15, tK + .4, E.inOutC);
  if (away < 1) {
    ctx.save();
    ctx.translate(540 - 30 * away, lerp(866, 836, cIn) - 260 * away); ctx.rotate(lerp(-.014, -.06, away)); const sc = lerp(1, .78, away); ctx.scale(sc, sc);
    ctx.globalAlpha = cIn * (1 - E.outQ(away));
    cover(ctx, t, P(t, tA - .15, tA + .75), P(t, tP - .1, tP + .6), P(t, -.25, 1.7, E.inOutQ) * 1.6 - .3);
    shade(ctx, CW, CH, .5 * away + .35 * (1 - cIn));
    ctx.restore();
  }

  // ---- excerpt sheet ----
  const eIn = P(t, tK + .08, tK + .68, E.outC), back = P(t, tC - .18, tC + .5, E.inOutC);
  if (eIn > 0) {
    ctx.save();
    // (sheet top stays where the 650-tall sheet had it: centre 55 px higher)
    ctx.translate(540, lerp(875, 751, eIn) - 44 * back); ctx.rotate(lerp(.035, .006, eIn) - .006 * back); const sc = lerp(1.04, 1, eIn) * lerp(1, .9, back); ctx.scale(sc, sc);
    ctx.globalAlpha = eIn;
    excerpt(ctx, t, data, {
      en: P(t, tH - .12, tH + .5), enU: P(t, tG + .2, tG + .85, E.inOutQ), ko: P(t, tG - .14, tG + .5),
      mk: P(t, tG + .02, tG + .95, E.lin),
      sweep: P(t, tK + .1, tK + 1.6, E.inOutQ) * 1.6 - .3,
    });
    shade(ctx, SW, SHt, .58 * back + .25 * (1 - eIn));
    ctx.restore();
  }

  // ---- status card ----
  const cA = P(t, tC - .08, tC + .55, E.outC);
  if (cA > 0) {
    ctx.save(); ctx.translate(540, lerp(1070, 996, cA)); const pre = 1 - .015 * P(t, tY, tN, E.inOutQ) + .02 * bN; ctx.scale(pre, pre);
    statusCard(ctx, t, {
      a: E.outQ(clamp(cA * 2.4)), ul: P(t, tKi - .1, tKi + .5), caret: P(t, tKi, tKi + .2), dots: P(t, tCo - .1, tCo + .3), hush: P(t, tY, tY + .25),
      none: P(t, tN - .04, tN + .32), date: P(t, tN + .3, tN + .8, E.outQ), flare: t > tN ? Math.exp(-(t - tN) * 3) * P(t, tN - .04, tN + .06) : 0,
    });
    ctx.restore();
  }
  ctx.restore();

  // ---- footnote: the commission's finding is not a court judgment (screen-fixed, phone-legible once shown) ----
  const fa = P(t, tG + .3, tG + 1.0, E.outQ);
  if (fa > 0) {
    const parts = data.foot.split(' · '), l1 = parts.slice(0, 2).join(' · '), l2 = parts.slice(2).join(' · ');
    ctx.save(); ctx.globalAlpha = fa * .5; ctx.fillStyle = '#9fb4c4'; ctx.fillRect(540 - 40, 1140, 80, 1.5); ctx.restore();
    text(ctx, l1, 540, 1172, { size: 30, weight: 700, color: '#c3d3de', alpha: fa });
    text(ctx, l2, 540, 1211, { size: 30, weight: 700, color: '#c3d3de', alpha: fa });
  }
};
})();
