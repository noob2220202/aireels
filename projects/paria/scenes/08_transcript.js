// transcript (hold card, no audio played): the published transcript of the recording, line by line.
// Black. A document card '실제 관 속 녹음 · 녹취' + source line sits right above the subtitle lines (where the clip scenes
// put their attribution card), so the viewer knows they are reading a transcript. Four lights in a faint chain on the oil
// (front = 크리스, the one behind = 카즈), the fifth far back. As each line appears, the speaker's light swells (soft glow,
// only very faint rings: no audio is played); on '카즈, 괜찮아?' the camera drifts from his light to the one behind;
// '아니.' is a weak, slow swell from that light while the tunnel vision tightens. Drips from the unseen crown and
// ripples in the oil keep the dark alive; faint tape-static flicker between lines.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow, camera, text, measure, roundRect, flash } = L;
const { souls, beat } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };

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
function darkFastT(ctx, t, { k = 1, seed = 1, base = '#010203' } = {}) {
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

const SURF = 912, LYT = 884;
const XS = [452, 560, 672, 776, 920];          // front (크리스), behind (카즈), two more, the fifth far back
// a voice ring above the oil, faint
function ring(ctx, ex, ey, R, a) {
  if (a <= .003) return;
  ctx.save(); ctx.beginPath(); ctx.rect(-300, 600, W + 600, SURF - 600); ctx.clip();
  ctx.lineWidth = 1.2 + 2 * a; ctx.strokeStyle = rgba('#cfe8ff', .5 * a); ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke();
  if (R > 24) { ctx.lineWidth = 1; ctx.strokeStyle = rgba('#8fd3e8', .22 * a); ctx.beginPath(); ctx.arc(ex, ey, R - 14, 0, 7); ctx.stroke(); }
  ctx.restore();
  // where it brushes the oil
  const dx = Math.sqrt(Math.max(0, R * R - Math.pow(SURF - ey, 2)));
  if (dx > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const px of [ex - dx, ex + dx]) { const hw = 50 + Math.min(80, dx * .2); const lg = ctx.createLinearGradient(px - hw, 0, px + hw, 0); lg.addColorStop(0, rgba('#8fd3e8', 0)); lg.addColorStop(.5, rgba('#8fd3e8', .3 * a)); lg.addColorStop(1, rgba('#8fd3e8', 0)); ctx.fillStyle = lg; ctx.fillRect(px - hw, SURF - 1.5, hw * 2, 3); }
    ctx.restore();
  }
}
// document card: transcript glyph + badge line + source line (no recording dot: the audio is not played here).
// Same slot as the clip scenes' attribution card (y ~1185), right above the subtitle lines it describes.
function docCard(ctx, s, src, y, a, sa) {
  if (a <= 0) return;
  const F = L.FONT.sub, bs = 32;
  let ss = 27; if (src) { while (ss > 21 && measure(ctx, src, ss, F, 600) > 900) ss--; }
  const tw = measure(ctx, s, bs, F, 800), sw = src ? measure(ctx, src, ss, F, 600) : 0;
  const w = Math.min(1040, Math.max(tw + 70, sw) + 56), h = src ? 98 : 64, x0 = 540 - w / 2, y0 = y - h / 2;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(3,8,12,.88)'; roundRect(ctx, x0, y0, w, h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(143,211,232,.42)'; ctx.lineWidth = 2.5; ctx.stroke();
  // glyph: a sheet with lines, left of the badge text
  const ly = src ? y0 + 30 : y, gx = 540 - (tw + 46) / 2, gy = ly - 15;
  ctx.strokeStyle = 'rgba(207,232,255,.9)'; ctx.lineWidth = 2; roundRect(ctx, gx, gy, 24, 30, 3); ctx.stroke();
  ctx.fillStyle = 'rgba(207,232,255,.9)'; for (let i = 0; i < 4; i++) ctx.fillRect(gx + 5, gy + 6 + i * 5.5, i === 3 ? 8 : 14, 2);
  ctx.restore();
  text(ctx, s, gx + 46, ly + 2, { size: bs, weight: 800, color: '#e8f4ff', align: 'left', alpha: a });
  if (src && sa > 0) text(ctx, src, 540, y0 + h - 27, { size: ss, weight: 600, color: '#a9c6d6', alpha: a * sa });
}

window.PK.scenes.transcript = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const T0 = info.sc.t0;
  // the subtitle lines of this card (absolute -> local), speaker index from the label
  let lines = ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= T0 - .01 && c.t0 < info.sc.t1).map(c => ({ a: c.t0 - T0, b: c.t1 - T0, sp: /^카즈/.test(c.who || '') ? 1 : 0 }));
  if (!lines.length) lines = [{ a: .25, b: 1.75, sp: 0 }, { a: 1.75, b: 3.25, sp: 0 }, { a: 3.5, b: 4.9, sp: 0 }, { a: 4.9, b: 5.85, sp: 1 }];
  const bpm = 92;

  // speaking envelopes per light
  const spk = [0, 0], swell = [0, 0];
  for (const ln of lines) {
    const on = P(t, ln.a - .04, ln.a + .12) * (1 - P(t, ln.b - .15, ln.b + .1));
    const weak = ln.sp === 1 ? .55 : 1;
    spk[ln.sp] = Math.max(spk[ln.sp], on * weak * (.55 + .45 * Math.abs(nz(t * 8.5, 3 + ln.sp))));
    const u = t - ln.a;
    if (u > -.05) swell[ln.sp] = Math.max(swell[ln.sp], (ln.sp === 1 ? .7 * Math.exp(-Math.pow((u - .35) / .45, 2)) : Math.exp(-Math.max(0, u) * 2.4) * P(u, -.05, .08)));
  }
  // rings: two per line from the speaker; on the third line the ring is aimed at the light behind
  const rings = [];
  lines.forEach((ln, k) => {
    const n = ln.sp === 1 ? 1 : 2;
    for (let j = 0; j < n; j++) rings.push({ c: ln.a + j * .45 + (ln.sp === 1 ? .2 : 0), x: XS[ln.sp], s: .3 * (ln.sp === 1 ? .5 : (j ? .6 : 1)) });
  });
  const live = [];
  for (const r of rings) { const age = t - r.c; if (age < 0 || age > 2) continue; live.push({ x: r.x, R: 12 + 330 * age, a: r.s * Math.pow(1 - age / 2, 1.5) * P(12 + 330 * age, 12, 70, E.inQ) }); }
  const glint = x => { let g = 0; for (const r of live) { if (Math.abs(r.x - x) < 1) continue; g += r.a * Math.exp(-Math.pow((r.R - Math.abs(x - r.x)) / 40, 2)); } return clamp(g); };

  // static between lines (and at the cut in / out)
  let st = 0;
  const marks = [.1, d - .25]; lines.forEach((ln, k) => { if (k) marks.push(ln.a - .06); });
  for (const m of marks) st = Math.max(st, Math.exp(-Math.pow((t - m) / .13, 2)));
  for (let k = 1; k < lines.length; k++) { const gap = lines[k].a - lines[k - 1].b; if (gap > .1) st = Math.max(st, .55 * P(t, lines[k - 1].b - .05, lines[k - 1].b + .05) * (1 - P(t, lines[k].a - .05, lines[k].a + .05))); }
  const f = Math.floor(t * 30);
  const fl = 1 - st * .35 * hi(f * 13 + 7);

  darkFastT(ctx, t, { k: .22, seed: 10 });
  const dr = { x: fb(t * .35, 31) * 14, y: fb(t * .3, 40) * 14, r: fb(t * .25, 35) * .005 };
  // slow push in; during '카즈, 괜찮아?' the camera drifts from his light to the light behind, which answers '아니.'
  const Lq = lines[Math.min(2, lines.length - 1)], La = lines[lines.length - 1];
  const zoom = lerp(1.7, 2.1, P(t, -.1, d + .2));          // steady push (no ease: it never settles)
  const tr = P(t, Lq.a, La.a + .1, E.inOutQ), no = P(t, La.a - .1, La.a + .6, E.inOutQ);
  const camX = lerp(lerp(462, 512, P(t, 0, Lq.a, E.inOutQ)), XS[1], tr);
  ctx.save();
  camera(ctx, { x: camX + dr.x / zoom, y: LYT + 90 / zoom + dr.y / zoom, zoom, rot: dr.r, t });
  ctx.globalAlpha = fl;
  // oil surface: faint, the only geometry
  ctx.save();
  const sy = x => SURF + Math.sin(x * .021 - t * 1.3) * 2 + Math.sin(x * .05 + t) * 1.3;
  const gf = ctx.createLinearGradient(0, SURF, 0, SURF + 140); gf.addColorStop(0, 'rgba(22,50,58,.35)'); gf.addColorStop(1, 'rgba(4,8,9,0)');
  ctx.fillStyle = gf; ctx.beginPath(); ctx.moveTo(-200, SURF + 160); for (let x = -200; x <= W + 210; x += 12) ctx.lineTo(x, sy(x)); ctx.lineTo(W + 200, SURF + 160); ctx.closePath(); ctx.fill();
  const sg = ctx.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, 'rgba(143,211,232,0)'); sg.addColorStop(.25, 'rgba(143,211,232,.16)'); sg.addColorStop(.75, 'rgba(143,211,232,.16)'); sg.addColorStop(1, 'rgba(143,211,232,0)');
  ctx.strokeStyle = sg; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -200; x <= W + 210; x += 12) { const y = sy(x); x === -200 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  ctx.restore();
  // drips from the unseen crown of the pipe into the oil, and their rings (something always moves in the dark)
  const CR = LYT - 250;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = Math.floor((t + 2) / .55) - 4; k <= Math.floor((t + 2) / .55); k++) {
    const t0 = k * .55 - 2 + hi(k * 7 + 3) * .3, u = t - t0; if (u < 0 || u > 2) continue;
    const dx = camX + (hi(k * 13 + 11) * 2 - 1) * 400 / zoom;
    if (u < .55) { const yy = CR + (SURF - CR) * Math.pow(u / .55, 2); ctx.fillStyle = rgba('#bfe9ff', .32 * P(yy, CR + 60, CR + 160)); ctx.beginPath(); ctx.ellipse(dx, yy, 1.8, 4.2, 0, 0, 7); ctx.fill(); }
    else { const q = (u - .55) / 1.45; ctx.strokeStyle = rgba('#8fd3e8', .24 * (1 - q)); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(dx, sy(dx) + 1, 5 + q * 80, 1.4 + q * 4.5, 0, 0, 7); ctx.stroke(); }
  }
  // slow oil ripples spreading from under the lights (they are breathing in it)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const ph = (t * .45 + j / 2 + i * .29) % 1, a = .2 * Math.sin(ph * Math.PI) * (i < 2 ? 1 : .6);
    ctx.strokeStyle = rgba('#8fd3e8', a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(XS[i], sy(XS[i]) + 2, 14 + ph * 95, 2 + ph * 6, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
  for (const r of live) ring(ctx, r.x, LYT, r.R, r.a * fl);

  // the lights
  const A = [];
  for (let i = 0; i < 5; i++) {
    let a = i < 2 ? .58 : i < 4 ? .4 : .2;
    if (i < 2) a += .32 * spk[i] + .3 * swell[i];
    if (i === 1) a += .9 * glint(XS[1]);
    if (i < 4) a *= (.93 + .07 * nz(t * 6, i + 20)) * (hi(f + i * 31) > .985 ? .7 : 1);   // the fifth stays steady
    a *= P(t, -.3, .35, E.outQ);
    A.push(clamp(a));
  }
  // faint chain threads between the four
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const ax = XS[j] + 12, bx = XS[j + 1] - 12, al = .13 * Math.min(A[j], A[j + 1]) * P(t, 0, .6);
    ctx.strokeStyle = rgba('#ffd9a0', al); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(ax, LYT + 2); ctx.quadraticCurveTo((ax + bx) / 2, LYT + 12 + 3 * Math.sin(t * 1.2 + j), bx, LYT + 2); ctx.stroke();
  }
  ctx.restore();
  for (let i = 4; i >= 0; i--) {
    const sz = i < 2 ? .9 + .3 * spk[i] + .35 * swell[i] : i < 4 ? .7 : .5;
    if (i < 2) glow(ctx, XS[i], LYT, 200, '#ff9a3c', (.05 + .12 * spk[i] + .12 * swell[i]) * A[i]);
    souls(ctx, t + [0, .31, .5, .74, .2][i], [{ x: XS[i], y: LYT, a: A[i], s: sz }], { bpm: bpm + (i < 2 ? 14 * spk[i] : 0) });
  }
  // amber reflections on the oil
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = XS[i], a = A[i], len = 56;
    ctx.save(); ctx.translate(x, SURF + len * .45); ctx.scale(.22, 1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, len); rg.addColorStop(0, rgba('#ffb347', a * .2)); rg.addColorStop(1, rgba('#ffb347', 0));
    ctx.fillStyle = rg; ctx.fillRect(-len, -len, len * 2, len * 2); ctx.restore();
    for (let s = 0; s < 3; s++) { const w = (15 - s * 4) * (.7 + .3 * Math.sin(t * 2.6 + s * 1.9 + x)); ctx.fillStyle = rgba('#ffc477', a * .1 * (1 - s / 3)); ctx.fillRect(x - w + Math.sin(t * 2 + s) * 3, SURF + 5 + s * 11, w * 2, 1.5); }
  }
  ctx.restore();
  // (speaker names are carried by the subtitle labels only)
  ctx.restore();

  // tape static between lines
  if (st > .02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const yy = 480 + hi(f * 31 + i) * 690, hh = 1 + hi(f * 17 + i) * 2.5, xx = hi(f * 7 + i) * W * .8;
      ctx.fillStyle = rgba('#cfe8ff', st * (.03 + .08 * hi(i + f * 3))); ctx.fillRect(xx, yy, 60 + hi(i * 3 + f * 5) * 300, hh);
    }
    ctx.restore();
  }

  // tunnel vision (tightens toward the decision, and once more on '아니.'), breathing with the heart; centred on the pair
  const brth = .5 + .5 * Math.sin(t * Math.PI * 2 * .4);
  const icx = 540 + (lerp((XS[0] + XS[1]) / 2, XS[1] - 20, no) - camX) * zoom;
  iris(ctx, lerp(.6, .74, P(t, 2.5, d, E.inOutQ)) + .1 * no, .5 * brth + .5 * beat(t, bpm), icx, 880);

  // document card + source line, right above the transcript lines
  const ba = P(t, .05, .4, E.outQ) * (hi(f * 3 + 1) > .2 || t > .45 ? 1 : .4);
  docCard(ctx, D.badge || '실제 관 속 녹음 · 녹취', D.src || '', 1183 + 8 * (1 - ba), ba, P(t, .2, .6, E.outQ));
};
})();
