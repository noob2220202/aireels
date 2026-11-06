// who (real audio, Boodram recalling the first exchange in the pipe): "Oi, oi, who is that, boy?" / "It's me, it's me." / "Kaz, boy. Kaz."
// Total dark, a side cutaway of the pipe that is only revealed where the voices touch it (sound rings = echolocation).
// His light calls out -> rings travel along the pipe and brush another light in the dark -> it answers -> he inches toward the
// voice through the oil -> on "Kaz" the two lights meet and glow warmer. Attribution card stays up while the voice plays.
// Framed close (zoom ~1.8): the air gap fills the frame; each ring paints the steel crown and the oil where its front touches them.
(function () {
const { W, H, E, P, clamp, lerp, hash, noise1, fbm, rgba, glow, camera, drift, text } = L;
const { K, dark, souls, beat, sourceCard } = window.PK;

// loudness of the three real segments (30 fps RMS, 0-99): seg1 "Oi, oi, who is that, boy?", seg2 "It's me, it's me.", seg3 "He say, Kaz, boy. Kaz."
const W1 = [23,69,88,82,75,73,59,37,17,13,26,57,89,86,92,97,96,88,69,57,41,42,28,15,10,14,9,8,8,7,6,3,20,11,6,5,6,34,44,48,52,52,46,69,94,74,80,99,93,39,54,72,73,59,44,56,56];
const W2 = [9,21,24,46,71,66,56,42,24,20,81,85,86,92,99,92,96,87,83,77,77,70,42,36,46,71,87,68,40,38,71,83,74,76,78,68,61,53,58,61,56,46,41,30,24];
const W3 = [0,7,49,46,41,38,46,80,53,13,8,8,21,41,46,97,84,86,94,95,82,59,39,31,25,22,29,57,84,60,55,51,41,45,40,30,14,13,12,11,10,27,38,90,86,91,99,91,59,46,76,68,54,37,27,27,14,30,21,20,18,17,12,10,20];
const SEG = [1.93, 1.53, 2.17], GAP = .3;
function arr(a, tc) { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= a.length - 1) return 0; return lerp(a[i], a[i + 1], f - i) / 99; }
// who is speaking at clip time tc (from voice_t) and how loud: A = Boodram, B = the voice answering from the dark
function voice(tc) {
  const s1 = SEG[0] + GAP, s2 = s1 + SEG[1] + GAP;
  if (tc >= 0 && tc < SEG[0]) return { A: arr(W1, tc), B: 0 };
  if (tc >= s1 && tc < s1 + SEG[1]) return { A: 0, B: arr(W2, tc - s1) };
  if (tc >= s2 && tc < s2 + SEG[2]) { const u = tc - s2; return u < .38 ? { A: .5 * arr(W3, u), B: 0 } : { A: 0, B: arr(W3, u) }; }
  return { A: 0, B: 0 };
}
// syllable onsets (clip-relative, from the real audio) -> one sound ring each
const S1 = SEG[0] + GAP, S2 = S1 + SEG[1] + GAP;
const RINGS = [
  { c: 0.0, who: 'A', s: .75 }, { c: .36, who: 'A', s: .9 }, { c: 1.08, who: 'A', s: 1 }, { c: 1.58, who: 'A', s: .7 },
  { c: S1 + .05, who: 'B', s: .5 }, { c: S1 + .34, who: 'B', s: 1 }, { c: S1 + .8, who: 'B', s: .55 }, { c: S1 + 1.0, who: 'B', s: .95 },
  { c: S2 + .43, who: 'B', s: 1 }, { c: S2 + .88, who: 'B', s: .5 }, { c: S2 + 1.37, who: 'B', s: 1.05 },
];
// ---- cheaper variant of PK.dark (same oily sheen, same parameters): composed at quarter resolution and blitted once,
// opaque. `extra(x)` may add screen-space layers into the same buffer (x is pre-scaled to 1080x1920 units). ----
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
function darkFast(ctx, t, { k = 1, seed = 1, base = '#010203', extra = null } = {}) {
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
  if (extra) extra(x);
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H);
  if (k > 0) {
    for (let i = 0; i < 9; i++) {
      const life = 3 + hash(i * 5 + seed) * 2, ph = ((t / life + hash(i + seed)) % 1);
      const px = hash(i * 7 + seed * 3) * W, py = 520 + hash(i * 11 + seed) * 760, r = 30 + ph * 180;
      ctx.strokeStyle = rgba('#8fd3e8', .08 * k * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, r, r * .28, 0, 0, 7); ctx.stroke();
    }
  }
  ctx.restore();
}

// pipe (side cutaway): inner radius, centre line, fluid surface (about 20 of 76 cm)
const TB = { cy: 820, r: 190, wall: 18 };
TB.top = TB.cy - TB.r; TB.bot = TB.cy + TB.r; TB.fl = TB.bot - .26 * 2 * TB.r;
const LY = TB.fl - 26;                               // heads just above the oil
const SPEED = 430, LIFE = 2.3;

// Boodram's light inches toward the voice: small eased drags with pauses (clip-relative times)
const STEPS = [[S1 + .32, S1 + .72, 80], [S1 + .82, S1 + 1.22, 80], [S1 + 1.37, S1 + 1.77, 88], [S2 + .1, S2 + .72, 105]];
function aX(tc) { let x = 330; for (const [a, b, dx] of STEPS) x += dx * E.inOutQ(clamp((tc - a) / (b - a))); return x; }
function aMoving(tc) { let m = 0; for (const [a, b] of STEPS) m = Math.max(m, Math.sin(clamp((tc - a) / (b - a)) * Math.PI)); return m; }

function pipe(ctx, t, x0, x1, k) {
  const { top, bot, fl, wall } = TB;
  ctx.save();
  // walls: barely there
  const g = ctx.createLinearGradient(0, top - wall, 0, top); g.addColorStop(0, rgba('#6d7a83', .07 * k)); g.addColorStop(1, rgba('#20282d', .1 * k));
  ctx.fillStyle = g; ctx.fillRect(x0, top - wall, x1 - x0, wall); ctx.fillRect(x0, bot, x1 - x0, wall);
  ctx.fillStyle = rgba('#a0bec9', .06 * k); ctx.fillRect(x0, top - 1, x1 - x0, 2); ctx.fillRect(x0, bot - 1, x1 - x0, 2);
  // oil and water: dark body, faint cold surface
  const surf = x => fl + Math.sin(x * .021 - t * 1.4) * 2.2 + Math.sin(x * .057 + t * 1.1) * 1.4;
  ctx.beginPath(); ctx.moveTo(x0, bot);
  for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, surf(x));
  ctx.lineTo(x1, bot); ctx.closePath();
  const gf = ctx.createLinearGradient(0, fl, 0, bot); gf.addColorStop(0, rgba('#16323a', .55 * k)); gf.addColorStop(.3, rgba('#0b1c22', .6 * k)); gf.addColorStop(1, rgba('#040809', .7 * k));
  ctx.fillStyle = gf; ctx.fill();
  ctx.strokeStyle = rgba('#8fd3e8', .12 * k); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = x0; x <= x1 + 10; x += 10) { const y = surf(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.restore();
}
// one voice ring: clipped to the air gap, muffled in the oil, lighting the steel and the oil surface where it touches them
function ring(ctx, ex, ey, R, a) {
  const { top, fl, bot, wall } = TB;
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, top, W + 800, fl - top); ctx.clip();
  ctx.lineWidth = 3 + 5 * a; ctx.strokeStyle = rgba('#cfe8ff', .6 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke();
  if (R > 20) { ctx.lineWidth = 2; ctx.strokeStyle = rgba('#8fd3e8', .28 * a); ctx.beginPath(); ctx.arc(ex, ey, R - 16, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(-400, fl, W + 800, bot - fl); ctx.clip();
  ctx.lineWidth = 2; ctx.strokeStyle = rgba('#8fd3e8', .1 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke(); ctx.restore();
  // reveals: where the ring front touches the steel crown or the oil, that stretch (about +-60) lights up
  // (the bottom wall lies under the oil: the muffled ring only grazes it)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [wy, isWall] of [[top, true], [fl, false], [bot, true]]) {
    const dy = Math.abs(ey - wy); if (R <= dy) continue;
    const dx = Math.sqrt(R * R - dy * dy), ra = a * (isWall && wy === bot ? .2 : 1);
    for (const px of [ex - dx, ex + dx]) {
      const hw = 60 + Math.min(40, dx * .12);
      const lg = ctx.createLinearGradient(px - hw, 0, px + hw, 0);
      const c = isWall ? '#9fb3bd' : '#8fd3e8';
      lg.addColorStop(0, rgba(c, 0)); lg.addColorStop(.5, rgba(c, .6 * ra)); lg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = lg;
      if (isWall) {
        ctx.fillRect(px - hw, wy === top ? wy - wall : wy, hw * 2, wall);
        if (wy === top) {   // the inside of the crown catches it too: a short falloff into the air gap
          ctx.save(); for (let k = 0; k < 4; k++) { ctx.globalAlpha = .4 * (1 - k / 4); ctx.fillRect(px - hw, top + k * 8, hw * 2, 8); } ctx.restore();
        }
        ctx.fillStyle = rgba('#e6f6ff', .6 * ra); ctx.fillRect(px - 12, wy - 1.5, 24, 3);
      }
      else { ctx.fillRect(px - hw, wy - 2.5, hw * 2, 5); ctx.fillStyle = rgba('#e6f6ff', .6 * ra); ctx.fillRect(px - 10, wy - 1.5, 20, 3); }
    }
  }
  ctx.restore();
}
function iris(ctx, k, pulse, cx = 540, cy = 840) {
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * pulse), r1 = r0 + H * lerp(.5, .3, k);
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(1,2,3,0)'); g.addColorStop(.55, `rgba(1,2,3,${(.45 + .35 * k).toFixed(3)})`); g.addColorStop(1, `rgba(1,2,3,${clamp(.7 + .3 * k).toFixed(3)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

window.PK.scenes.who = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const v0 = info.sc.voice_t - info.sc.t0, tc = t - v0;     // clip-relative time
  const vo = voice(tc);
  const warm = P(tc, S2 + .4, S2 + 1.5, E.inOutQ);          // the two lights meet on "Kaz" and glow warmer
  const meet = P(tc, S2 + .35, S2 + .8, E.outQ);
  const bpm = lerp(96, 84, warm);

  const ax = aX(tc), bx = 762 - 16 * P(tc, S2 + .3, S2 + .8, E.inOutQ);
  const bob = -4 * aMoving(tc) * Math.abs(Math.sin(tc * 9));
  const A = { x: ax, y: LY + bob }, B = { x: bx, y: LY };
  const OTHERS = [{ x: 915, y: LY + 2 }, { x: 985, y: LY - 3 }, { x: 1060, y: LY + 1 }];

  // rings alive now
  const live = [];
  for (const r of RINGS) {
    const age = tc - r.c; if (age < 0 || age > LIFE) continue;
    const src = r.who === 'A' ? { x: aX(r.c), y: LY } : { x: 762 - 16 * P(r.c, S2 + .3, S2 + .8, E.inOutQ), y: LY };
    live.push({ x: src.x, y: src.y, R: 16 + SPEED * age, a: r.s * Math.pow(1 - age / LIFE, 1.5) * P(age, 0, .05), who: r.who });
  }
  for (const r of live) r.v = r.a * P(r.R, 16, 110, E.inQ);  // drawn strength: rings bloom out of the light instead of popping on it
  const glint = (p, who) => { let g = 0; for (const r of live) if (r.who !== who) g += r.a * Math.exp(-Math.pow((r.R - Math.hypot(p.x - r.x, p.y - r.y)) / 45, 2)); return clamp(g); };

  darkFast(ctx, t, { k: .3, seed: 8 });
  const dr = drift(t, .8, 8);
  // close on the air gap: the call (the answering light at the right edge, in the dark) -> pan to hold both when it answers
  // -> follow the crawl to the meeting on "Kaz" (the others at the right edge); eases back a little after the voice for crawl
  const pb = P(t, d - .75, d + .2, E.inOutQ);              // after the last "Kaz": ease back towards crawl's wider framing
  const zoom = lerp(1.75, 1.85, P(t, -.2, v0 + S2, E.inOutQ)) + .1 * P(tc, S2 + .2, S2 + 2.2, E.inOutQ) - .5 * pb;
  const camX = 470 + 95 * P(tc, S1 - .35, S1 + .9, E.inOutQ) + 125 * P(tc, S2 - .1, S2 + 1.1, E.inOutQ) + 20 * P(tc, S2 + 1.1, S2 + 2.4, E.inOutQ);
  ctx.save();
  camera(ctx, { x: camX + dr.x, y: TB.cy + lerp(100, 150, pb) / zoom + dr.y, zoom, rot: dr.r, t, seed: 8 });
  pipe(ctx, t, -300, W + 400, 1);
  for (const r of live) ring(ctx, r.x, r.y, r.R, r.v);
  // wake in the oil while he drags himself forward
  const mv = aMoving(tc);
  if (tc > S1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 5; j++) {
      const ph = (tc * 1.6 + j / 5) % 1, ex = aX(tc - ph * .9) - 8;
      const am = aMoving(tc - ph * .9), a = am * (1 - ph) * .35; if (a < .01) continue;
      ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(ex, TB.fl + 1, 10 + ph * 70, 2 + ph * 5, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
    }
    ctx.restore();
  }
  // the others: far off in the dark, faint and still (only brushed by the rings)
  OTHERS.forEach((o, i) => { const a = .2 + .5 * glint(o, '-'); souls(ctx, t + i * .31, [{ x: o.x, y: o.y, a, s: .5 }], { bpm: 84 }); });
  // the voice in the dark: brushed by his rings, then answers
  const bOn = P(tc, S1 - .02, S1 + .25), bStut = tc > S1 && tc < S1 + .28 && hash(Math.floor(tc * 30) * 7 + 3) < .4 ? .35 : 1;
  const bA = Math.max(.04 + .55 * glint(B, 'B'), bOn * bStut * (.82 + .3 * vo.B));
  const aA = P(t, -.2, .2) * (.8 + .32 * vo.A) * (.9 + .1 * noise1(t * 8, 2));
  // shared warmth when they meet
  if (warm > 0) {
    const mx = (A.x + B.x) / 2;
    glow(ctx, mx, LY, 300, '#ff9a3c', .16 * warm * (.85 + .15 * beat(t, bpm)));
    glow(ctx, mx, LY, 120, '#ffd27a', .14 * warm);
  }
  const col = warm > .01 ? '#ff9f45' : '#ffb347';
  glow(ctx, B.x, B.y, 180, '#ff9a3c', .07 * bA); glow(ctx, A.x, A.y, 180, '#ff9a3c', .07 * aA);
  souls(ctx, t + .29 * (1 - meet), [{ x: B.x, y: B.y, a: clamp(bA), s: .95 + .25 * vo.B + .15 * warm }], { bpm, color: col });
  souls(ctx, t, [{ x: A.x, y: A.y, a: clamp(aA), s: 1.05 + .25 * vo.A + .15 * warm }], { bpm, color: col });
  // amber reflections on the oil
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [p, a] of [[A, aA], [B, bA]]) {
    const len = 62; ctx.save(); ctx.translate(p.x, TB.fl + len * .45); ctx.scale(.22, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, len); rg.addColorStop(0, rgba('#ffb347', clamp(a) * .2)); rg.addColorStop(1, rgba('#ffb347', 0));
    ctx.fillStyle = rg; ctx.fillRect(-len, -len, len * 2, len * 2); ctx.restore();
    for (let s = 0; s < 4; s++) { const w = (18 - s * 3.5) * (.7 + .3 * Math.sin(t * 2.6 + s * 1.9 + p.x)); ctx.fillStyle = rgba('#ffc477', clamp(a) * .1 * (1 - s / 4)); ctx.fillRect(p.x - w + Math.sin(t * 2 + s) * 4, TB.fl + 4 + s * 11 + Math.sin(t * 1.7 + s) * 1.5, w * 2, 1.5); }
  }
  ctx.restore();
  ctx.restore();

  iris(ctx, lerp(.6, .48, warm) + .04 * (1 - P(t, 0, 1)), beat(t, bpm), 540, 870);
  // attribution: up while the voice plays
  const ca = P(t, 0, .4, E.outQ) * (1 - P(t, d - .05, d + .2));
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
