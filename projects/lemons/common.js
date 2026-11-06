// Bibby Topaz / Chris Lemons (North Sea, 18 Sep 2012) — shared drawing kit (underwater noir, reused from the Paria/Okene reels).
// All imagery is original and code-drawn: no photos of real people, no depiction of death.
(function () {
'use strict';
const { W, H, C, P, E, clamp, lerp, hash, rng, noise1, fbm, rgba, buf, text, measure, roundRect, glow, godrays, motes, grain, dust, vignette, flash, camera, drift, gradBG, subtitles, FONT } = L;
window.PK = window.PK || { scenes: {} };

const K = { deep: '#03121a', sea: '#062a36', teal: '#0d4a5a', foam: '#bfe9ff', amber: '#ffb347', oil: '#0b0b0d', steel: '#5c6670', red: '#e3262f', gold: '#f2c14e', paper: '#e9e2d0' };

function at(info, w, frac = 0) {
  const x = w ? info.sc.words.find(o => o.w.includes(w)) : null;
  if (x) return x.t - info.sc.t0;
  const v0 = info.sc.voice_t - info.sc.t0, v1 = info.sc.voice_end - info.sc.t0;
  return v0 + (v1 - v0) * frac;
}
// ---- water ----
function water(ctx, t, { top = '#0b3a48', bottom = '#02090d', murk = .5 } = {}) {
  gradBG(ctx, [[0, top], [.55, lerp2(top, bottom, .6)], [1, bottom]]);
  // drifting murk blobs
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 7; i++) {
    const x = ((hash(i * 7) * 1.6 - .3) * W + t * 12 * (hash(i) - .5)), y = hash(i * 13) * H, r = 300 + hash(i * 3) * 400;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba('#2a6f7a', .07 * murk)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}
function lerp2(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = [16, 8, 0].map(s => Math.round(lerp(pa >> s & 255, pb >> s & 255, k))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
// caustic light shafts from the surface
function shafts(ctx, t, a = .14, n = 9) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * W + Math.sin(t * .4 + i * 1.7) * 60, w = 40 + 70 * hash(i * 5);
    const al = a * (.4 + .6 * (.5 + .5 * Math.sin(t * .9 + i * 2.3)));
    const g = ctx.createLinearGradient(0, 0, 0, H * .9); g.addColorStop(0, rgba('#9fe7ff', al)); g.addColorStop(1, 'rgba(159,231,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w * .3, -20); ctx.lineTo(x + w * .3, -20); ctx.lineTo(x + w * 1.6 + 120 * Math.sin(i), H * .9); ctx.lineTo(x - w * 1.6 + 120 * Math.sin(i), H * .9); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function bubbles(ctx, t, { x = W / 2, y = H, n = 30, spread = 160, speed = 160, seed = 1, a = .6, size = 9 } = {}) {
  ctx.save(); ctx.strokeStyle = rgba('#d8f6ff', a); ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const life = 3 + hash(i * 3 + seed) * 3, ph = ((t / life + hash(i + seed)) % 1);
    const by = y - ph * speed * life, bx = x + (hash(i * 7 + seed) - .5) * spread + Math.sin(t * 3 + i) * 10 * ph;
    const r = size * (.4 + hash(i * 11 + seed)) * (1 + ph * .6);
    ctx.globalAlpha = (1 - ph) * .9; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
    ctx.globalAlpha = (1 - ph) * .5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .35, r * .25, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function silt(ctx, t, o = {}) { motes(ctx, t, Object.assign({ n: 90, color: '#9cc9d6', a: .35, size: 2.2, speed: 8, seed: 5 }, o)); }
// ---- pipeline outside (on the seabed), side view ----
function pipeSide(ctx, x0, x1, y, r, { t = 0, shade = 1 } = {}) {
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#3c4a52'); g.addColorStop(.35, '#56656e'); g.addColorStop(.6, '#2a343a'); g.addColorStop(1, '#0d1215');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(x0, y - r, x1 - x0, r * 2);
  ctx.globalAlpha = .25 * shade; ctx.fillStyle = '#9fb3bd'; ctx.fillRect(x0, y - r * .62, x1 - x0, r * .12);
  ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = x0 + 40; x < x1; x += 260) ctx.fillRect(x, y - r, 10, r * 2); // weld seams
  // marine growth
  const R = rng(9); ctx.fillStyle = 'rgba(70,95,60,.35)'; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.ellipse(x0 + R() * (x1 - x0), y + r * (.4 + R() * .55), 6 + R() * 18, 3 + R() * 6, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
// ---- inside the pipe: perspective tunnel lit by a torch ----
function pipeInside(ctx, t, { cx = W / 2, cy = 860, depth = 1, torch = 1, water: wl = .35, wobble = 1, seed = 2 } = {}) {
  ctx.save(); ctx.fillStyle = '#020405'; ctx.fillRect(0, 0, W, H);
  const N = 14;
  for (let i = N; i >= 0; i--) {
    const z = (i + (t * .6 * depth) % 1) / N; const s = 1 / (.12 + z * 1.6);
    const r = 330 * s; const ox = Math.sin(t * .5 + z * 3) * 18 * wobble * z, oy = Math.cos(t * .4 + z * 2) * 10 * wobble * z;
    const lum = clamp(1 - z * 1.05) * torch;
    ctx.strokeStyle = rgba('#7e8f97', .18 + .5 * lum); ctx.lineWidth = Math.max(1, 6 * s * .3);
    ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, 7); ctx.stroke();
    // water / oil level inside the pipe
    if (wl > 0) { ctx.fillStyle = rgba('#0b2a33', .55 * lum + .1); const yl = cy + oy + r * (1 - wl * 2); ctx.save(); ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, 7); ctx.clip(); ctx.fillRect(cx + ox - r, yl, r * 2, r * 2); ctx.restore(); }
  }
  // torch cone
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 520); g.addColorStop(0, rgba('#fff3d0', .35 * torch)); g.addColorStop(.5, rgba('#ffd890', .08 * torch)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// ---- diver silhouette (commercial diver: helmet, umbilical hose, fins) ----
function diver(ctx, x, y, s, { rot = 0, kick = 0, arm = 0, fill = '#05090c', rim = '#7fd6ff', hose = true, t = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const shape = (c) => {
    c.beginPath(); c.ellipse(0, 0, 110, 38, 0, 0, 7); // torso (horizontal swimmer)
    c.moveTo(120, -5); c.arc(140, -6, 34, 0, 7); // helmet
    c.moveTo(-20, -38); c.rect(-70, -64, 110, 30); // tank / bailout
    // legs + fins
    const k = Math.sin(kick) * .35;
    c.moveTo(-100, -10); c.lineTo(-200, -22 + k * 40); c.lineTo(-205, -6 + k * 40); c.lineTo(-100, 12);
    c.moveTo(-100, 8); c.lineTo(-200, 18 - k * 40); c.lineTo(-205, 34 - k * 40); c.lineTo(-100, 26);
    c.moveTo(-200, -30 + k * 40); c.lineTo(-262, -44 + k * 55); c.lineTo(-258, -2 + k * 40); c.closePath();
    c.moveTo(-200, 12 - k * 40); c.lineTo(-262, 2 - k * 55); c.lineTo(-258, 44 - k * 40); c.closePath();
    // arm reaching
    const ax = 120 + Math.cos(arm) * 90, ay = 30 + Math.sin(arm) * 60;
    c.moveTo(60, 10); c.lineTo(ax, ay - 12); c.lineTo(ax + 6, ay + 10); c.lineTo(60, 32);
  };
  ctx.save(); ctx.translate(-4, -4); ctx.fillStyle = rim; ctx.shadowColor = rim; ctx.shadowBlur = 12; shape(ctx); ctx.fill(); ctx.restore();
  ctx.fillStyle = fill; shape(ctx); ctx.fill();
  ctx.fillStyle = rgba('#ffd890', .9); ctx.beginPath(); ctx.arc(162, -10, 7, 0, 7); ctx.fill(); // helmet lamp
  if (hose) { ctx.strokeStyle = '#d6a238'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(140, -40); ctx.bezierCurveTo(160, -200, 60 + Math.sin(t) * 30, -300, 0, -520); ctx.stroke(); }
  ctx.restore();
}
function chip(ctx, s, x, y, a = 1, o = {}) {
  if (a <= 0) return; const size = o.size || 34, w = measure(ctx, s, size, FONT.sub, 800) + 40, h = size + 24;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = o.bg || 'rgba(4,10,14,.84)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = o.border || 'rgba(160,220,255,.35)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  text(ctx, s, x, y + 2, { size, color: o.color || '#e8f4ff', weight: 800, alpha: a });
}
// on-screen attribution card for real audio clips
function sourceCard(ctx, who, where, a = 1, y = 1185) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  const w = 760, h = 92; ctx.fillStyle = 'rgba(3,8,12,.86)'; roundRect(ctx, 540 - w / 2, y - h / 2, w, h, 14); ctx.fill();
  ctx.fillStyle = K.red; ctx.beginPath(); ctx.arc(540 - w / 2 + 34, y, 9, 0, 7); ctx.fill();
  ctx.restore();
  text(ctx, who, 540 - w / 2 + 60, y - 16, { size: 32, weight: 900, color: '#fff', align: 'left', alpha: a });
  text(ctx, where, 540 - w / 2 + 60, y + 22, { size: 26, weight: 700, color: '#9fc6d8', align: 'left', alpha: a });
}
// audio waveform bars for clip scenes (deterministic, driven by a seed + time)
function waveBars(ctx, t, x, y, w, h, a = 1, seed = 3) {
  ctx.save(); ctx.globalAlpha *= a; const n = 48;
  for (let i = 0; i < n; i++) {
    const v = .2 + .8 * Math.abs(noise1(t * 6 + i * .37, seed)) * (.6 + .4 * Math.sin(t * 9 + i));
    const bh = h * v; ctx.fillStyle = i % 2 ? '#7fd6ff' : '#bfeaff';
    ctx.fillRect(x + i * w / n, y - bh / 2, w / n * .55, bh);
  }
  ctx.restore();
}
function topTitle(ctx, TL, a = 1, a2 = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.62, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 560);
  text(ctx, TL.title.l1, 540, 282, { size: 76, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 12 });
  if (a2 > 0) {  // second line is revealed with the hook's "단 한 명" (keeps the 5 -> 1 beat from being spoiled)
    ctx.save(); ctx.translate(540, 380); const k = .85 + .15 * E.outBack(a2); ctx.scale(k, k);
    text(ctx, TL.title.l2, 0, 0, { size: 76, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 12, alpha: a2 });
    ctx.restore();
  }
  ctx.restore();
}
// ---- heartbeat: 0..1 double thump at bpm ----
function beat(t, bpm = 72) { const ph = ((t * bpm / 60) % 1 + 1) % 1; return Math.exp(-ph * 16) + (ph > .2 ? .55 * Math.exp(-(ph - .2) * 16) : 0); }
// ---- pitch-black pipe interior: drifting iridescent oil sheen + faint ripples (k = how much is visible) ----
let _sheen = null;
function sheenTex() {
  if (_sheen) return _sheen;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = ((n * 360 * 1.3 + 200) % 360 + 360) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); _sheen = c; return c;
}
function dark(ctx, t, { k = 1, seed = 1, base = '#010203' } = {}) {
  ctx.save(); ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  if (k > 0) {
    const tex = sheenTex(); ctx.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
      ctx.globalAlpha = (.075 - l * .025) * k; ctx.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
    }
    // faint ripple glints
    ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const life = 3 + hash(i * 5 + seed) * 2, ph = ((t / life + hash(i + seed)) % 1);
      const x = hash(i * 7 + seed * 3) * W, y = 520 + hash(i * 11 + seed) * 760, r = 30 + ph * 180;
      ctx.strokeStyle = rgba('#8fd3e8', .08 * k * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .28, 0, 0, 7); ctx.stroke();
    }
  }
  ctx.restore();
}
// ---- five lives: warm glowing points that breathe with a heartbeat. pts: [{x,y,a,s}] ----
function souls(ctx, t, pts, { bpm = 72, color = '#ffb347', size = 1 } = {}) {
  pts.forEach((p, i) => {
    if (!p || p.a <= 0) return; const b = beat(t + i * .19, bpm); const r = (11 + 6 * b) * (p.s || 1) * size;
    glow(ctx, p.x, p.y, r * 7, color, .22 * p.a); glow(ctx, p.x, p.y, r * 2.2, '#ffe2b0', .55 * p.a);
    ctx.save(); ctx.globalAlpha = p.a; ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.arc(p.x, p.y, r * .42, 0, 7); ctx.fill(); ctx.restore();
  });
}
// ---- cutaway pipe, side view: steel walls, black interior, oily fluid layer (level = fraction of inner diameter) ----
function tube(ctx, x0, x1, y, r, { level = .25, t = 0, wall = 16, light = 0, lightX = (x0 + x1) / 2, flow = 0 } = {}) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y - r - wall, 0, y + r + wall);
  g.addColorStop(0, '#6d7a83'); g.addColorStop(.04, '#3a454c'); g.addColorStop(.5, '#20282d'); g.addColorStop(.96, '#11171a'); g.addColorStop(1, '#4b5860');
  ctx.fillStyle = g; ctx.fillRect(x0, y - r - wall, x1 - x0, 2 * (r + wall));
  const gi = ctx.createLinearGradient(0, y - r, 0, y + r); gi.addColorStop(0, '#05080a'); gi.addColorStop(1, '#020304');
  ctx.fillStyle = gi; ctx.fillRect(x0, y - r, x1 - x0, 2 * r);
  if (light > 0) { const lg = ctx.createRadialGradient(lightX, y, 0, lightX, y, r * 3); lg.addColorStop(0, rgba('#ffcf8a', .25 * light)); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lg; ctx.fillRect(x0, y - r, x1 - x0, 2 * r); }
  if (level > 0) {
    const top = y + r - clamp(level) * 2 * r;
    ctx.beginPath(); ctx.moveTo(x0, y + r);
    for (let x = x0; x <= x1 + 8; x += 8) ctx.lineTo(x, top + Math.sin(x * .02 - t * (1.6 + flow * 6)) * 3 + Math.sin(x * .053 + t * 1.1) * 2);
    ctx.lineTo(x1, y + r); ctx.closePath();
    const gf = ctx.createLinearGradient(0, top, 0, y + r); gf.addColorStop(0, '#16323a'); gf.addColorStop(.25, '#0b1c22'); gf.addColorStop(1, '#040809');
    ctx.fillStyle = gf; ctx.fill();
    ctx.strokeStyle = 'rgba(150,215,235,.45)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = x0; x <= x1 + 8; x += 8) { const yy = top + Math.sin(x * .02 - t * (1.6 + flow * 6)) * 3 + Math.sin(x * .053 + t * 1.1) * 2; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  // inner wall edge highlights
  ctx.fillStyle = 'rgba(160,190,205,.18)'; ctx.fillRect(x0, y - r, x1 - x0, 2); ctx.fillRect(x0, y + r - 2, x1 - x0, 2);
  ctx.restore();
}
// ---- vertical gauge for the remaining air gap ----
function gapMeter(ctx, x, y, h, v, { a = 1, label = '숨 쉴 틈', val = '', t = 0 } = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  const w = 64; ctx.fillStyle = 'rgba(3,8,12,.8)'; roundRect(ctx, x - w / 2 - 14, y - 14, w + 28, h + 28, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(160,220,255,.4)'; ctx.lineWidth = 3; roundRect(ctx, x - w / 2, y, w, h, 10); ctx.stroke();
  const fh = h * (1 - v); const gf = ctx.createLinearGradient(0, y + h - fh, 0, y + h); gf.addColorStop(0, '#1d4552'); gf.addColorStop(1, '#071418');
  ctx.save(); roundRect(ctx, x - w / 2, y, w, h, 10); ctx.clip(); ctx.fillStyle = gf; ctx.fillRect(x - w / 2, y + h - fh, w, fh);
  ctx.strokeStyle = 'rgba(160,230,250,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2, y + h - fh + Math.sin(t * 3) * 2); ctx.lineTo(x + w / 2, y + h - fh - Math.sin(t * 3) * 2); ctx.stroke();
  const danger = clamp((.35 - v) / .25); ctx.fillStyle = rgba('#e3262f', .25 + .35 * danger * (.6 + .4 * Math.sin(t * 9))); ctx.fillRect(x - w / 2, y, w, h - fh); ctx.restore();
  ctx.restore();
  text(ctx, label, x, y - 40, { size: 30, weight: 800, color: '#cfe8ff', alpha: a });
  if (val) text(ctx, val, x, y + h * (1 - (1 - v) / 2) - h / 2 + h * v / 2, { size: 34, weight: 900, color: '#fff', stroke: '#000', strokeW: 6, alpha: a });
}
// ---- tunnel vision: dark iris that tightens with k and pulses with breathing ----
function suffocate(ctx, t, k = .5, rate = .3) {
  if (k <= 0) return; const br = .5 + .5 * Math.sin(t * rate * Math.PI * 2);
  const r0 = H * lerp(.42, .12, k) * (1 + .06 * br), r1 = r0 + H * lerp(.5, .32, k);
  const g = ctx.createRadialGradient(W / 2, H * .45, r0, W / 2, H * .45, r1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${clamp(.55 + .45 * k)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// ---- site schematic (side view): berth deck, sea surface, habitat on the riser, riser down to an elbow, line along the seabed ----
function site(ctx, t, { x = 250, surf = 560, hab = 700, bed = 1120, run = 1500, r = 22, a = 1, labels = true, glowHab = 0 } = {}) {
  ctx.save(); ctx.globalAlpha *= a;
  const sg = ctx.createLinearGradient(0, surf, 0, bed + 120); sg.addColorStop(0, '#0d3d4b'); sg.addColorStop(1, '#03141b');
  ctx.fillStyle = sg; ctx.fillRect(-200, surf, W + 400, bed + 400 - surf);
  ctx.strokeStyle = 'rgba(190,235,255,.6)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let xx = -200; xx <= W + 200; xx += 10) { const yy = surf + Math.sin(xx * .02 + t * 1.5) * 4; xx === -200 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
  ctx.fillStyle = '#1b1712'; ctx.fillRect(-200, bed, W + 400, 400); ctx.fillStyle = 'rgba(120,100,70,.25)'; ctx.fillRect(-200, bed, W + 400, 6);
  // berth deck on piles
  ctx.fillStyle = '#2b3136'; ctx.fillRect(-200, surf - 70, x + 230, 26); for (let px = -150; px < x + 20; px += 90) ctx.fillRect(px, surf - 44, 14, bed - surf + 44);
  // riser: from above the habitat down to the elbow, then the line along the seabed
  const ry = bed - r - 10; ctx.lineCap = 'round';
  ctx.strokeStyle = '#59656d'; ctx.lineWidth = r * 2; ctx.beginPath(); ctx.moveTo(x, hab - 40); ctx.lineTo(x, ry - 60); ctx.quadraticCurveTo(x, ry, x + 60, ry); ctx.lineTo(x + run, ry); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = r * .8; ctx.beginPath(); ctx.moveTo(x, hab); ctx.lineTo(x, ry - 60); ctx.quadraticCurveTo(x, ry, x + 60, ry); ctx.lineTo(x + run, ry); ctx.stroke();
  // habitat (dry chamber) around the riser top
  ctx.fillStyle = '#c99a2e'; roundRect(ctx, x - 70, hab - 60, 140, 120, 12); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(ctx, x - 58, hab - 48, 116, 70, 8); ctx.fill();
  if (glowHab > 0) glow(ctx, x, hab - 14, 120, '#ffd27a', .35 * glowHab);
  ctx.restore();
  if (labels) {
    text(ctx, '해비타트(작업 챔버)', x + 100, hab - 20, { size: 30, weight: 800, color: '#ffe3a0', align: 'left', alpha: a, stroke: '#000', strokeW: 6 });
    text(ctx, '해저 송유관 · 지름 76cm', x + 380, ry - 70, { size: 30, weight: 800, color: '#cfe8ff', alpha: a, stroke: '#000', strokeW: 6 });
  }
}
// ---- standard stage for real-audio clips: black oily water, waveform, attribution card ----
function clipStage(ctx, t, d, info, { who = '', where = '', seed = 3, k = .9, wave = true, cardY = 1185 } = {}) {
  dark(ctx, t, { k, seed });
  if (wave) {
    const a = P(t, .1, .6, E.outQ) * (1 - P(t, d - .4, d, E.inQ));
    const v0 = info.sc.voice_t - info.sc.t0, v1 = info.sc.voice_end - info.sc.t0; const on = t > v0 && t < v1 ? 1 : .25;
    waveBars(ctx, t, 540 - 300, 960, 600, 120 * on, a * .85, seed);
  }
  const ca = P(t, .15, .55, E.outQ) * (1 - P(t, d - .35, d, E.inQ));
  sourceCard(ctx, who, where, ca, cardY);
}
// ---- inverted cabin/toilet cross-section (the hull is upside down: the old floor is now the ceiling) ----
// level: water height as a fraction of the room height (from the bottom). light: warm light of him (0..1) at (lx, ly).
function room(ctx, t, { x = 140, y = 520, w = 800, h = 620, level = .55, light = .6, lx = 540, ly = 640, fixtures = true, wall = 26, seed = 4 } = {}) {
  ctx.save();
  // steel shell
  const gs = ctx.createLinearGradient(0, y - wall, 0, y + h + wall); gs.addColorStop(0, '#4a565e'); gs.addColorStop(.5, '#1b2328'); gs.addColorStop(1, '#3a454c');
  ctx.fillStyle = gs; ctx.fillRect(x - wall, y - wall, w + wall * 2, h + wall * 2);
  ctx.fillStyle = '#030607'; ctx.fillRect(x, y, w, h);
  // warm pool of his light on the steel
  if (light > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .7); g.addColorStop(0, rgba('#ffb36b', .22 * light)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  // rivets / seams
  ctx.fillStyle = 'rgba(160,190,205,.12)'; for (let i = 1; i < 6; i++) ctx.fillRect(x + w * i / 6, y, 2, h);
  if (fixtures) {
    ctx.fillStyle = '#0e1418'; ctx.strokeStyle = rgba('#9fb3bd', .25 + .25 * light); ctx.lineWidth = 3;
    // old floor tiles on the ceiling
    for (let i = 0; i < 9; i++) ctx.strokeRect(x + i * w / 9, y, w / 9, 18);
    // upside-down toilet hanging from the ceiling (left)
    ctx.beginPath(); ctx.moveTo(x + w * .1, y + 18); ctx.lineTo(x + w * .26, y + 18); ctx.lineTo(x + w * .24, y + 90); ctx.quadraticCurveTo(x + w * .18, y + 150, x + w * .12, y + 90); ctx.closePath(); ctx.fill(); ctx.stroke();
    // upside-down washbasin on the right wall, near the top (he holds it at the waterline)
    ctx.beginPath(); ctx.moveTo(x + w, y + h * .2); ctx.lineTo(x + w * .8, y + h * .2); ctx.quadraticCurveTo(x + w * .78, y + h * .32, x + w * .86, y + h * .34); ctx.lineTo(x + w, y + h * .34); ctx.closePath(); ctx.fill(); ctx.stroke();
    // inverted door with the handle near the top
    ctx.strokeRect(x + w * .38, y + 30, w * .2, h * .7); ctx.beginPath(); ctx.arc(x + w * .55, y + 30 + h * .7 * .38, 7, 0, 7); ctx.stroke();
  }
  // water (from the bottom) with a moving surface and an oily cyan sheen
  const top = y + h * (1 - clamp(level));
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let xx = x; xx <= x + w + 8; xx += 8) ctx.lineTo(xx, top + Math.sin(xx * .021 + t * 1.3) * 4 + Math.sin(xx * .057 - t * .9) * 2);
  ctx.lineTo(x + w, y + h); ctx.closePath();
  const gw = ctx.createLinearGradient(0, top, 0, y + h); gw.addColorStop(0, '#12333d'); gw.addColorStop(.3, '#071a20'); gw.addColorStop(1, '#020607');
  ctx.fillStyle = gw; ctx.fill();
  ctx.strokeStyle = rgba('#9fd8ea', .45); ctx.lineWidth = 2; ctx.beginPath();
  for (let xx = x; xx <= x + w + 8; xx += 8) { const yy = top + Math.sin(xx * .021 + t * 1.3) * 4 + Math.sin(xx * .057 - t * .9) * 2; xx === x ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
  ctx.stroke();
  if (light > 0) { const g = ctx.createLinearGradient(lx - 160, 0, lx + 160, 0); g.addColorStop(0, 'rgba(255,179,107,0)'); g.addColorStop(.5, rgba('#ffb36b', .35 * light)); g.addColorStop(1, 'rgba(255,179,107,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 160, top - 3, 320, 6); }
  ctx.restore();
  return top;
}
// ---- diver helmet-light cone through murky water, with lit silt ----
function beam(ctx, t, x, y, ang, { len = 900, spread = .32, a = 1, seed = 7 } = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, rgba('#e8f6ff', .55 * a)); g.addColorStop(.35, rgba('#9fd8ff', .18 * a)); g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - spread, ang + spread); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 60; i++) {   // silt caught in the beam
    const r = len * (.08 + .9 * ((hash(i * 7 + seed) + t * .03 * (.5 + hash(i))) % 1)), q = ang + (hash(i * 13 + seed) - .5) * 2 * spread * .9;
    const px = x + Math.cos(q) * r + Math.sin(t * .7 + i) * 6, py = y + Math.sin(q) * r + Math.cos(t * .5 + i) * 6;
    ctx.fillStyle = rgba('#d8f0ff', .5 * a * (1 - r / len)); ctx.beginPath(); ctx.arc(px, py, 1.2 + 1.8 * hash(i * 3), 0, 7); ctx.fill();
  }
  glow(ctx, x, y, 60, '#ffffff', .6 * a); ctx.restore();
}
// ---- neutral backlit hand silhouette (no skin tone); dir: 1 = reaching right ----
function hand(ctx, x, y, s = 1, { rot = 0, rim = '#bfe6ff', a = 1, curl = 0, dir = 1 } = {}) {
  if (a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * dir, s); ctx.globalAlpha *= a;
  const shape = c => {
    c.beginPath(); c.moveTo(-260, -26); c.lineTo(-40, -34); c.quadraticCurveTo(0, -40, 20, -30);           // forearm + back of hand
    for (let i = 0; i < 4; i++) { const fy = -26 + i * 15, L = [70, 78, 72, 60][i] * (1 - .45 * curl); c.lineTo(20 + L, fy - 2 + curl * 10); c.quadraticCurveTo(28 + L, fy + 5, 20 + L, fy + 10 + curl * 6); c.lineTo(22, fy + 11); }
    c.lineTo(10, 30); c.quadraticCurveTo(40, 46 - curl * 10, 52, 30); c.quadraticCurveTo(30, 26, 0, 22); // thumb
    c.lineTo(-260, 26); c.closePath();
  };
  ctx.save(); ctx.translate(-3, -3); ctx.shadowColor = rim; ctx.shadowBlur = 14; ctx.fillStyle = rim; shape(ctx); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#05080a'; shape(ctx); ctx.fill(); ctx.restore();
}
Object.assign(window.PK, { room, beam, hand });
Object.assign(window.PK, { K, at, water, shafts, bubbles, silt, pipeSide, pipeInside, diver, chip, sourceCard, waveBars, topTitle, lerp2,
  beat, dark, souls, tube, gapMeter, suffocate, site, clipStage });

// =====================================================================================================
// ====================================  LEMONS KIT  ·  window.PK.LM  ==================================
// The shared look of the Lemons reel (North Sea, 18 Sep 2012). Six animators build on this, so every scene
// gets the same water, steel, divers, line, bell, ship and gas clock.
//  * Pure: every function is a pure function of its arguments (time is passed in; no Math.random / Date).
//    Sprites and textures are built lazily once and cached. Each component draws in < 10 ms.
//  * Space: x / y / s are in the caller's current canvas space (camera transforms are fine: the diver and
//    the structure render their buffers at the effective device scale). s = 1 is the reference size.
//  * Light: a light is {x, y, r, color, a} in the same space. "Lit only by available light" components
//    (LM.sea silt, LM.seabed, LM.structure) take o.lights; light-emitting components (LM.diver, LM.bell,
//    LM.ship, LM.alarm) return the lights they emit in ret.lights. Call those with ctx = null to get the
//    geometry + lights first (nothing is drawn), then draw the scene back to front.
//  * Respect: people are faceless silhouettes only. Helmets have a dark faceplate; bare heads are plain
//    dark shapes. No ship name, no logo, no face, no skin.
//  * Palette LM.COL: water #020807 / #0a1a1a / #123033, steel greys, sodium amber #ffb347, cold lamp
//    #e8f6ff, alarm #ffb000 / #e3262f (sparingly).
// =====================================================================================================
(function () {
const LM = window.PK.LM = {};
const TAU = Math.PI * 2;
const COL = LM.COL = {
  abyss: '#020807', deep: '#0a1a1a', teal: '#123033', steel: '#5c6a70', amber: '#ffb347', warm: '#ffc27a', core: '#fff1dc',
  lamp: '#e8f6ff', alarm: '#ffb000', red: '#e3262f', snow: '#bcd9d4', umb: '#8a7234', bell: '#7a6430', hull: '#0b1114', rim: '#8fc8e0',
};

// ---------- local 32-bit hash / noise (L.hash degrades for large integers) ----------
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
const n2 = (x, y, s = 0) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hi(Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(s + 1, 83492791));
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
};
const mix = (a, b, k) => PK.lerp2(a, b, clamp(k));
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const devScale = ctx => { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
const al = v => (v == null ? 1 : v);
Object.assign(LM, { hi, nz, fb, mix });

// ---------- cached sprites ----------
const SPR = {};
function glowSpr(color) {
  const k = 'g' + color; if (SPR[k]) return SPR[k];
  const c = cv(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  [[0, 1], [.12, .68], [.32, .34], [.6, .09], [1, 0]].forEach(([o, a]) => g.addColorStop(o, rgba(color, a)));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return (SPR[k] = c);
}
function dotSpr(color) {
  const k = 'd' + color; if (SPR[k]) return SPR[k];
  const c = cv(32, 32), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  [[0, 1], [.2, .9], [.45, .28], [1, 0]].forEach(([o, a]) => g.addColorStop(o, rgba(color, a)));
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); return (SPR[k] = c);
}
let _murk = null;
function murkTex() {   // soft drifting murk (teal), alpha-only noise, 160x280, drawn ~7-9x up
  if (_murk) return _murk;
  const w = 160, h = 280, c = cv(w, h), x = c.getContext('2d'), id = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let v = 0, a = .5, f = 1 / 24; for (let o = 0; o < 4; o++) { v += a * n2(i * f, j * f, o + 3); a *= .5; f *= 2; }
    const k = clamp((v - .3) / .5), q = (j * w + i) * 4; id.data[q] = 70; id.data[q + 1] = 150; id.data[q + 2] = 156; id.data[q + 3] = 255 * k * k;
  }
  x.putImageData(id, 0, 0); return (_murk = c);
}
// LM.glow(ctx, x, y, r, color, a = 1, op = 'lighter'): fast cached radial glow (same look as L.glow, ~5x cheaper)
LM.glow = function (ctx, x, y, r, color, a = 1, op = 'lighter') {
  if (!(a > .003) || !(r > .5)) return;
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(glowSpr(color), x - r, y - r, r * 2, r * 2); ctx.restore();
};
// LM.light(x, y, r, color, a) -> {x, y, r, color, a}
LM.light = (x, y, r, color = COL.amber, a = 1) => ({ x, y, r, color, a });
// LM.shake(t, amt = 1, seed = 0) -> {x, y, r}: low-frequency handheld/impact shake, |x|,|y| <= 8*amt px
LM.shake = function (t, amt = 1, seed = 0) { return { x: 8 * amt * fb(t * 1.7, seed + 11, 2) / .75, y: 8 * amt * fb(t * 1.5, seed + 23, 2) / .75, r: .004 * amt * fb(t * 1.1, seed + 37, 2) / .75 }; };
// LM.jolt(t, t0, amt = 1) -> {x, y}: one decaying impact jolt starting at t0 (<= 8*amt px)
LM.jolt = function (t, t0, amt = 1) { const u = t - t0; if (u < 0 || u > 1.5) return { x: 0, y: 0 }; const e = Math.exp(-u * 5) * amt; return { x: 8 * e * Math.sin(u * 37), y: 6 * e * Math.sin(u * 29 + 1) }; };
// LM.subBand(ctx, a = .85, y0 = 1150): keep the subtitle band (y ~1250-1450) and the app-UI area dark and quiet
LM.subBand = function (ctx, a = .85, y0 = 1150) {
  const g = ctx.createLinearGradient(0, y0, 0, 1290); g.addColorStop(0, 'rgba(1,3,3,0)'); g.addColorStop(1, `rgba(1,3,3,${a})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, y0, W, 1290 - y0); ctx.fillStyle = `rgba(1,3,3,${a})`; ctx.fillRect(0, 1290, W, H - 1290); ctx.restore();
};

// ---------- life light / lamp beam / breath bubbles ----------
// LM.life(ctx, t, x, y, a = 1, {bpm = 62, s = 1, phase}) -> beat 0..1: Lemons' warm amber life-light (heartbeat glow).
LM.life = function (ctx, t, x, y, a = 1, o = {}) {
  const s = o.s || 1, b = PK.beat(t + (o.phase || 0), o.bpm || 62);
  if (!ctx || a <= 0) return b;
  LM.glow(ctx, x, y, 300 * s * (1 + .08 * b), COL.amber, (.12 + .07 * b) * a);
  LM.glow(ctx, x, y, 105 * s * (1 + .14 * b), COL.warm, (.3 + .22 * b) * a);
  LM.glow(ctx, x, y, 30 * s * (1 + .2 * b), COL.core, (.8 + .2 * b) * a);
  return b;
};
// LM.lampBeam(ctx, t, x, y, ang, a = 1, {len = 760, spread = .26, s = 1, color, seed}): cold helmet-lamp cone with lit silt
LM.lampBeam = function (ctx, t, x, y, ang, a = 1, o = {}) {
  if (!(a > 0)) return; const len = o.len || 760, sp = o.spread || .26, seed = o.seed || 5, col = o.color || COL.lamp, s = o.s || 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, rgba(col, .42 * a)); g.addColorStop(.3, rgba(col, .12 * a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - sp, ang + sp); ctx.closePath(); ctx.fill();
  const dsp = dotSpr(col);
  for (let i = 0; i < 46; i++) {
    const r = len * (.06 + .9 * ((hi(i * 7 + seed) + t * .035 * (.5 + hi(i))) % 1)), q = ang + (hi(i * 13 + seed) - .5) * 1.8 * sp;
    const px = x + Math.cos(q) * r + Math.sin(t * .7 + i) * 5 * s, py = y + Math.sin(q) * r + Math.cos(t * .5 + i) * 5 * s, z = (1.2 + 2 * hi(i * 3 + seed)) * Math.max(.6, s);
    ctx.globalAlpha = .6 * a * (1 - r / len); ctx.drawImage(dsp, px - z * 2, py - z * 2, z * 4, z * 4);
  }
  ctx.restore();
  LM.glow(ctx, x, y, 70 * s, col, .55 * a); LM.glow(ctx, x, y, 16 * s, '#ffffff', .9 * a);
};
// LM.bubbles(ctx, t, x, y, {bursts: [t...], every, from, to, a = .8, s = 1, seed, rise = 1}): exhaled bubble bursts rising from (x, y).
// Give explicit burst times, or a breathing period `every` (bursts at from + k*every, up to `to`).
LM.bubbles = function (ctx, t, x, y, o = {}) {
  let bursts = o.bursts;
  if (!bursts) { bursts = []; const ev = o.every || 3, f0 = o.from == null ? -10 : o.from, t1 = o.to == null ? 1e9 : o.to; for (let k = Math.max(0, Math.floor((t - 3.4 - f0) / ev)); ; k++) { const tb = f0 + k * ev; if (tb > t || tb > t1) break; bursts.push(tb); } }
  const a = al(o.a) * .8, s = o.s || 1, seed = o.seed || 3, rise = o.rise || 1, n = o.n || 14;
  ctx.save(); ctx.lineWidth = Math.max(1, 1.8 * s);
  bursts.forEach((tb, b) => {
    for (let i = 0; i < n; i++) {
      const t0 = tb + hi(b * 31 + i * 7 + seed) * .45, u = t - t0; if (u < 0 || u > 3.2) continue;
      const r = (3 + hi(i * 11 + b + seed) * 7) * (1 + u * .25) * s, by = y - (u * (150 + 90 * hi(i * 5 + b)) + 30 * u * u) * s * rise, bx = x + ((hi(i * 3 + b) - .5) * 30 + Math.sin(u * 5 + i) * 6 * u) * s;
      const aa = a * (1 - u / 3.2);
      ctx.strokeStyle = rgba('#e0f6ff', aa); ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', aa * .6); ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .35, r * .28, 0, TAU); ctx.fill();
    }
  });
  ctx.restore();
};

// =====================================================================================================
// LM.sea(ctx, t, o): North Sea water background — fills the whole frame. Call in screen space (before any
// camera transform); pass o.cam for parallax.
//  o.dark 0..1 (1 = black water, only lit silt shows) · o.cam [x, y] camera offset (parallax) · o.seed
//  o.surface 0..1 faint caustic shafts + surface glow near the top (o.surfaceY = -40, o.surfaceColor)
//  o.lights [{x,y,r,color,a}]: silt glows in these, plus a soft scattering haze (o.haze = 1)
//  o.snow = 1 marine-snow density · o.current [vx, vy] px/s drift · o.murk = 1 · o.top/o.mid/o.bottom colors
// =====================================================================================================
LM.sea = function (ctx, t, o = {}) {
  const dark = clamp(o.dark || 0), k = 1 - dark, cam = o.cam || [0, 0], seed = o.seed || 1, lights = o.lights || [];
  const cx = clamp(cam[0], -400, 400), cy = clamp(cam[1], -400, 400);
  ctx.save();
  const top = mix(o.top || COL.teal, '#010404', dark * .94), mid = mix(o.mid || COL.deep, '#010303', dark * .95), bot = mix(o.bottom || COL.abyss, '#000101', dark);
  const gy = -cy * .06, g = ctx.createLinearGradient(0, gy, 0, H + gy); g.addColorStop(0, top); g.addColorStop(.5, mid); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  // murk (two parallax layers of a cached noise texture)
  const ma = al(o.murk) * (.05 + .3 * k);
  if (ma > .004) {
    const mt = murkTex(); ctx.globalCompositeOperation = 'screen';
    for (let l = 0; l < 2; l++) {
      const z = l ? .32 : .16, ww = W + (l ? 800 : 520), hh = H + (l ? 1100 : 760);
      const ox = -(ww - W) / 2 + Math.sin(t * .023 + seed * 1.7 + l * 2.1) * 120 - cx * z, oy = -(hh - H) / 2 + Math.cos(t * .019 + seed + l * 1.3) * 150 - cy * z + t * (o.current ? o.current[1] * z : 0);
      ctx.globalAlpha = ma * (l ? .6 : 1);
      if (l) { ctx.save(); ctx.translate(ox + ww, oy); ctx.scale(-1, 1); ctx.drawImage(mt, 0, 0, ww, hh); ctx.restore(); } else ctx.drawImage(mt, ox, oy, ww, hh);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // faint surface light (caustic shafts) near the top
  const sf = (o.surface || 0) * (1 - dark * .7);
  if (sf > 0) {
    const sc = o.surfaceColor || '#86c9cf', sy = (o.surfaceY == null ? -40 : o.surfaceY) - cy * .25;
    ctx.globalCompositeOperation = 'lighter';
    const gb = ctx.createLinearGradient(0, sy, 0, sy + 620); gb.addColorStop(0, rgba(sc, .2 * sf)); gb.addColorStop(.3, rgba(sc, .055 * sf)); gb.addColorStop(1, rgba(sc, 0));
    ctx.fillStyle = gb; ctx.fillRect(-60, sy, W + 120, 620);
    for (let i = 0; i < 8; i++) {
      const x = (i + .5) / 8 * (W + 200) - 100 + Math.sin(t * .31 + i * 1.9 + seed) * 46 - cx * .3, w = 22 + 64 * hi(i * 5 + seed), len = 560 + 520 * hi(i * 7 + seed), sk = .14 + .1 * hi(i * 3 + seed);
      const aa = sf * .085 * (.3 + .7 * (.5 + .5 * Math.sin(t * .63 + i * 2.3)));
      const gg = ctx.createLinearGradient(0, sy, 0, sy + len); gg.addColorStop(0, rgba(sc, aa)); gg.addColorStop(1, rgba(sc, 0)); ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(x - w * .25, sy); ctx.lineTo(x + w * .25, sy); ctx.lineTo(x + w * 1.4 + len * sk, sy + len); ctx.lineTo(x - w * 1.4 + len * sk, sy + len); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // scattering haze around lights (murky water glows around every source)
  const hz = al(o.haze);
  if (hz > 0) for (const Lt of lights) LM.glow(ctx, Lt.x, Lt.y, Lt.r * 1.15, Lt.color, .2 * al(Lt.a) * hz);
  // marine snow: far / mid / near layers; ambient brightness fades with o.dark, lights reveal it
  const sn = o.snow == null ? 1 : o.snow;
  if (sn > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const cur = o.current || [0, 0], TW = W + 240, TH = H + 240, snowC = o.snowColor || COL.snow;
    const LAY = [{ n: 120, z: .35, s0: 1.1, s1: 2.1, a: .2, sp: 5 }, { n: 70, z: .7, s0: 1.8, s1: 3.3, a: .27, sp: 8 }, { n: 16, z: 1.35, s0: 5, s1: 12, a: .1, sp: 13 }];
    for (let li = 0; li < 3; li++) {
      const Ly = LAY[li], n = Math.round(Ly.n * Math.min(sn, 2));
      for (let i = 0; i < n; i++) {
        const id = i * 13 + li * 1009 + seed * 7, z = Ly.z * (.8 + .4 * hi(id + 1));
        let px = hi(id + 2) * TW + t * (cur[0] * z + (hi(id + 3) - .5) * Ly.sp) + fb(t * .12 + i * .7, id) * 26 * z - cx * z;
        let py = hi(id + 4) * TH + t * (Ly.sp * (.4 + .6 * hi(id + 5)) * .6 + cur[1] * z) + fb(t * .1 + i * 1.3, id + 9) * 22 * z - cy * z;
        px = ((px % TW) + TW) % TW - 120; py = ((py % TH) + TH) % TH - 120;
        let lum = Ly.a * k * (.65 + .35 * Math.sin(t * 1.3 + i * 2.7)), best = null, bv = 0;
        for (const Lt of lights) {
          const dx = px - Lt.x, dy = py - Lt.y, d2 = dx * dx + dy * dy; if (d2 >= Lt.r * Lt.r) continue;
          const f = 1 - Math.sqrt(d2) / Lt.r, v = f * f * al(Lt.a); lum += v * (li === 2 ? .45 : .95); if (v > bv) { bv = v; best = Lt.color; }
        }
        if (lum < .012) continue;
        const s = lerp(Ly.s0, Ly.s1, hi(id + 6));
        ctx.globalAlpha = Math.min(1, lum); ctx.drawImage(dotSpr(best && bv > Ly.a * k * .4 ? best : snowC), px - s * 2, py - s * 2, s * 4, s * 4);
      }
    }
  }
  ctx.restore();
};

// =====================================================================================================
// LM.seabed(ctx, y, t, o) -> yAt(x): dark sediment floor from y down; lit pools under o.lights.
//  o.dark 0..1 · o.cam [x, y] · o.lights · o.seed. ctx = null just returns yAt.
// =====================================================================================================
LM.seabed = function (ctx, y, t, o = {}) {
  const dark = clamp(o.dark || 0), k = 1 - dark, cx = (o.cam || [0, 0])[0], seed = o.seed || 2, lights = o.lights || [];
  const yAt = x => y + fb((x + cx) * .0035, seed + 31) * 16 + nz((x + cx) * .021, seed + 33) * 3.5;
  if (!ctx) return yAt;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-80, H + 80); for (let xx = -80; xx <= W + 104; xx += 24) ctx.lineTo(xx, yAt(xx)); ctx.lineTo(W + 104, H + 80); ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 20, 0, y + 420); g.addColorStop(0, mix('#16241f', '#030605', dark * .92)); g.addColorStop(.2, mix('#0a1411', '#020403', dark)); g.addColorStop(1, '#010202');
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const Lt of lights) {
    const fy = yAt(Lt.x), hgt = Math.max(0, fy - Lt.y), f = clamp(1 - hgt / (Lt.r * 1.1)); if (f <= 0) continue;
    const rr = Lt.r * (.6 + .6 * clamp(hgt / Lt.r));
    ctx.save(); ctx.translate(Lt.x, fy); ctx.scale(1, .3); const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    gg.addColorStop(0, rgba(Lt.color, .34 * f * al(Lt.a))); gg.addColorStop(.5, rgba(Lt.color, .1 * f * al(Lt.a))); gg.addColorStop(1, rgba(Lt.color, 0)); ctx.fillStyle = gg; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 110; i++) {   // grit, shell bits, small stones
    const px = ((hi(i * 3 + seed) * (W + 400) - cx) % (W + 400) + W + 400) % (W + 400) - 200, py = yAt(px) + 3 + hi(i * 5 + seed) * 190 * hi(i * 7 + seed);
    let lum = .06 * k; for (const Lt of lights) { const d = Math.hypot(px - Lt.x, py - Lt.y); if (d < Lt.r) lum += (1 - d / Lt.r) ** 2 * al(Lt.a) * .7; }
    if (lum < .02) continue;
    ctx.fillStyle = rgba('#a7b5ac', Math.min(.75, lum)); ctx.beginPath(); ctx.ellipse(px, py, 2 + 6 * hi(i * 11 + seed), 1 + 2.4 * hi(i * 13 + seed), 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = rgba('#7f9a92', .08 + .1 * k); ctx.lineWidth = 2; ctx.beginPath(); for (let xx = -80; xx <= W + 104; xx += 24) { xx === -80 ? ctx.moveTo(xx, yAt(xx)) : ctx.lineTo(xx, yAt(xx)); } ctx.stroke();
  ctx.restore();
  return yAt;
};

// =====================================================================================================
// LM.structure(ctx, x, y, s, t, o) -> ret: the seabed lattice structure (drilling template / manifold).
// Side view: (x, y) = centre of the base on the seabed; width ~730*s, height ~360*s (top deck at y-346*s).
// Top view (o.view = 'top'): (x, y) = centre of the plan; ~700*s x 400*s.
// It is LIT ONLY BY AVAILABLE LIGHT: a dark silhouette (o.sil = 1 blocks what is behind it) plus a lit pass
// = ambient (o.amb = .08, o.ambColor) + o.lights [{x,y,r,color,a}] multiplied with the steel albedo, so in
// darkness it is near-invisible and a lamp/life-light reveals only nearby members.
//  o.flip (bucket on the left) · o.a alpha.
// ret: {hook [x,y] = underside lip of the protruding transponder bucket (where the umbilical snags),
//       bucket [x,y] (bucket centre), rim [x,y], top [x,y] (centre of the top deck surface), topY, topL, topR,
//       hose [[x,y]...] (the old hose up the side, bottom -> top, for climbing), map(lx, ly) -> [x,y], bbox}
// =====================================================================================================
const grey = (v, tint = 0) => { const c = Math.round(clamp(v) * 196); return `rgb(${Math.round(c * (1 - .06 * tint))},${Math.round(c * (1 + .02 * tint))},${Math.round(c * (1 + .03 * tint))})`; };
function tubeSeg(c, x0, y0, x1, y1, w, tone = 1) {
  const dx = x1 - x0, dy = y1 - y0, L0 = Math.hypot(dx, dy) || 1; let nx = -dy / L0, ny = dx / L0; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
  const ln = (of, lw, col) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x0 + nx * of, y0 + ny * of); c.lineTo(x1 + nx * of, y1 + ny * of); c.stroke(); };
  ln(0, w, grey(.16 * tone)); ln(w * .1, w * .64, grey(.4 * tone)); ln(w * .27, Math.max(1.2, w * .17), grey(.86 * tone)); ln(-w * .32, Math.max(1, w * .1), grey(.07 * tone));
}
const SD = { legs: [-300, -100, 100, 300], yb: -42, ym: -186, yt: -330, D: [46, -28] };
const HOSE = [[-392, 4], [-376, -22], [-338, -40], [-352, -88], [-322, -132], [-340, -178], [-318, -222], [-332, -268], [-308, -302], [-318, -332], [-284, -350]];
function crPts(pts, perSeg) {   // Catmull-Rom through points
  const out = [], n = pts.length; if (n < 3) return pts.map(p => [p[0], p[1]]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const m = perSeg || Math.max(3, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 8));
    for (let k = 0; k < m; k++) {
      const u = k / m, u2 = u * u, u3 = u2 * u, f = j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
      out.push([f(0), f(1)]);
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]); return out;
}
LM.spline = crPts;
const HOSE_S = crPts(HOSE, 6);
function sideFrame(c, tone, w) {
  const { legs, yb, ym, yt } = SD;
  for (let i = 0; i < 3; i++) {
    const a = legs[i], b = legs[i + 1];
    tubeSeg(c, a, yb, b, ym, w * .55, tone * .9); tubeSeg(c, a, ym, b, yb, w * .55, tone * .9);
    if (i === 1) { tubeSeg(c, a, ym, (a + b) / 2, yt, w * .55, tone * .9); tubeSeg(c, b, ym, (a + b) / 2, yt, w * .55, tone * .9); }
    else tubeSeg(c, i ? a : b, ym, i ? b : a, yt, w * .55, tone * .9);
  }
  for (const yy of [yb, ym, yt]) tubeSeg(c, legs[0] - 16, yy, legs[3] + 16, yy, w * .85, tone);
  for (const xx of legs) tubeSeg(c, xx, -14, xx, yt - 12, w, tone);
  for (const xx of legs) for (const yy of [yb, ym, yt]) {
    c.fillStyle = grey(.3 * tone); c.beginPath(); c.arc(xx, yy, w * .64, 0, TAU); c.fill();
    c.strokeStyle = grey(.75 * tone); c.lineWidth = Math.max(1, w * .12); c.beginPath(); c.arc(xx, yy, w * .5, 3.6, 5.4); c.stroke();
  }
}
function handwheel(c, x, y, r, tone = 1) {
  c.strokeStyle = grey(.14 * tone); c.lineWidth = r * .36; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.strokeStyle = grey(.62 * tone); c.lineWidth = r * .16; c.beginPath(); c.arc(x, y - r * .06, r, 3.4, 6.0); c.stroke();
  c.strokeStyle = grey(.4 * tone); c.lineWidth = r * .14; c.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.stroke();
  c.fillStyle = grey(.5 * tone); c.beginPath(); c.arc(x, y, r * .22, 0, TAU); c.fill();
}
function hoseDraw(c, pts, w) {
  const run = (lw, col, oy) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] + oy) : c.moveTo(p[0], p[1] + oy))); c.stroke(); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  run(w, 'rgb(14,16,15)', 0); run(w * .62, 'rgb(48,52,44)', .5); run(Math.max(1, w * .16), 'rgb(120,126,112)', -w * .22);
}
function drawSide(c) {
  const { legs, yb, ym, yt, D } = SD; c.lineCap = 'butt'; c.lineJoin = 'round';
  c.save(); c.translate(D[0], D[1]); sideFrame(c, .46, 18); c.restore();                       // back frame
  for (const xx of legs) for (const yy of [yb, ym, yt]) tubeSeg(c, xx, yy, xx + D[0], yy + D[1], 12, .58);   // depth members
  // top deck grating
  c.fillStyle = grey(.17); c.beginPath(); c.moveTo(-316, yt); c.lineTo(316, yt); c.lineTo(316 + D[0], yt + D[1]); c.lineTo(-316 + D[0], yt + D[1]); c.closePath(); c.fill();
  c.strokeStyle = grey(.44); c.lineWidth = 1.6; c.beginPath(); for (let xx = -306; xx <= 306; xx += 15) { c.moveTo(xx, yt); c.lineTo(xx + D[0], yt + D[1]); } c.stroke();
  c.strokeStyle = grey(.7); c.lineWidth = 2; c.beginPath(); c.moveTo(-316 + D[0], yt + D[1]); c.lineTo(316 + D[0], yt + D[1]); c.stroke();
  // pipework (between the frames)
  c.save(); c.translate(D[0] * .45, D[1] * .45);
  tubeSeg(c, -272, -108, 232, -108, 30, .95);
  for (const xx of [-236, -116, 6, 126]) { c.fillStyle = grey(.3); c.fillRect(xx - 7, -130, 14, 44); c.fillStyle = grey(.78); c.fillRect(xx - 7, -130, 14, 4); }
  c.strokeStyle = grey(.16); c.lineWidth = 30; c.beginPath(); c.arc(206, -134, 26, Math.PI / 2, 0, true); c.stroke();
  c.strokeStyle = grey(.42); c.lineWidth = 19; c.beginPath(); c.arc(206, -134, 26, Math.PI / 2, 0, true); c.stroke();
  tubeSeg(c, 232, -134, 232, -290, 26, .92); tubeSeg(c, 220, -292, 296, -292, 22, .9);
  for (const [vx, vy] of [[-156, -158], [56, -158]]) { tubeSeg(c, vx, -108, vx, vy, 10, .9); c.fillStyle = grey(.26); c.fillRect(vx - 17, -128, 34, 32); c.fillStyle = grey(.7); c.fillRect(vx - 17, -128, 34, 3); handwheel(c, vx, vy, 22); }
  c.fillStyle = grey(.22); roundRect(c, -236, -268, 66, 46, 6); c.fill(); c.fillStyle = grey(.66); c.fillRect(-236, -268, 66, 3);
  c.strokeStyle = grey(.18); c.lineWidth = 6; c.beginPath(); c.moveTo(-200, -222); c.quadraticCurveTo(-190, -170, -150, -150); c.stroke();
  c.restore();
  sideFrame(c, 1, 22);                                                                       // front frame
  // mudmat + skirt
  c.fillStyle = grey(.24); c.fillRect(-366, -17, 732, 17); c.fillStyle = grey(.66); c.fillRect(-366, -17, 732, 3); c.fillStyle = grey(.1); c.fillRect(-366, -3, 732, 5);
  // transponder bucket (protrudes on the right, bracket from the right leg)
  tubeSeg(c, 300, -244, 368, -244, 14, 1); tubeSeg(c, 300, -196, 358, -240, 10, .9);
  c.beginPath(); c.moveTo(352, -292); c.lineTo(414, -292); c.lineTo(408, -214); c.lineTo(358, -214); c.closePath();
  const gb = c.createLinearGradient(352, 0, 414, 0); gb.addColorStop(0, grey(.15)); gb.addColorStop(.35, grey(.55)); gb.addColorStop(.6, grey(.42)); gb.addColorStop(1, grey(.12)); c.fillStyle = gb; c.fill();
  c.fillStyle = grey(.05); c.beginPath(); c.ellipse(383, -292, 29, 6, 0, 0, TAU); c.fill();
  c.strokeStyle = grey(.9); c.lineWidth = 3; c.beginPath(); c.ellipse(383, -292, 31, 7, 0, Math.PI, TAU); c.stroke();
  c.strokeStyle = grey(.6); c.lineWidth = 2; c.beginPath(); c.moveTo(355, -262); c.lineTo(411, -262); c.moveTo(357, -232); c.lineTo(409, -232); c.stroke();
  c.fillStyle = grey(.32); c.beginPath(); c.ellipse(383, -214, 25, 5, 0, 0, TAU); c.fill();
  c.fillStyle = grey(.34); c.fillRect(373, -322, 20, 30); c.beginPath(); c.ellipse(383, -322, 10, 6, 0, 0, TAU); c.fill(); c.fillStyle = grey(.8); c.fillRect(375, -320, 3, 26);
  // the old hose up the left side (+ clamps)
  hoseDraw(c, HOSE_S, 15);
  c.fillStyle = grey(.5); for (const [hx, hy] of [[-336, -44], [-322, -186], [-312, -326]]) c.fillRect(hx - 9, hy - 5, 18, 10);
  // anodes + marine growth
  c.fillStyle = grey(.55); for (const [ax, ay] of [[-200, -114], [0, -114], [200, -114], [-200, -258], [200, -258]]) c.fillRect(ax - 14, ay - 5, 28, 10);
  const R = rng(17); for (let i = 0; i < 70; i++) {
    const gx = -360 + R() * 720, gy = R() < .6 ? -42 + (R() - .5) * 18 : -12 + R() * 8;
    c.fillStyle = `rgba(${70 + R() * 30},${92 + R() * 30},${70 + R() * 20},${.35 + R() * .35})`; c.beginPath(); c.ellipse(gx, gy, 4 + R() * 12, 2 + R() * 5, 0, 0, TAU); c.fill();
  }
}
function drawTop(c) {
  const X = [-320, -107, 107, 320], Y = [-190, 0, 190]; c.lineCap = 'butt';
  c.fillStyle = grey(.12); c.fillRect(-320, -190, 640, 380);
  c.strokeStyle = grey(.3); c.lineWidth = 1.3; c.beginPath(); for (let xx = -314; xx < 320; xx += 13) { c.moveTo(xx, -190); c.lineTo(xx, 190); } for (let yy = -184; yy < 190; yy += 26) { c.moveTo(-320, yy); c.lineTo(320, yy); } c.stroke();
  // pipe header on the deck + valves
  tubeSeg(c, -282, 96, 248, 96, 28, .95);
  for (const xx of [-236, -116, 6, 126]) { c.fillStyle = grey(.3); c.fillRect(xx - 7, 76, 14, 40); c.fillStyle = grey(.78); c.fillRect(xx - 7, 76, 14, 4); }
  handwheel(c, -156, 96, 22); handwheel(c, 56, 96, 22);
  c.fillStyle = grey(.35); c.beginPath(); c.arc(248, 96, 18, 0, TAU); c.fill(); c.strokeStyle = grey(.8); c.lineWidth = 3; c.beginPath(); c.arc(248, 96, 14, 3.6, 5.6); c.stroke();
  c.fillStyle = grey(.24); roundRect(c, -236, -150, 66, 46, 6); c.fill(); c.fillStyle = grey(.66); c.fillRect(-236, -150, 66, 3);
  for (const yy of Y) tubeSeg(c, -336, yy, 336, yy, 22, 1);
  for (const xx of X) tubeSeg(c, xx, -206, xx, 206, 22, 1);
  for (let i = 0; i < 3; i++) { tubeSeg(c, X[i], -190, X[i + 1], 0, 10, .8); tubeSeg(c, X[i], 190, X[i + 1], 0, 10, .8); }
  for (const xx of X) for (const yy of Y) { c.fillStyle = grey(.32); c.beginPath(); c.arc(xx, yy, 14, 0, TAU); c.fill(); c.strokeStyle = grey(.78); c.lineWidth = 2.4; c.beginPath(); c.arc(xx, yy, 10, 3.6, 5.4); c.stroke(); }
  // the bucket, seen from above
  tubeSeg(c, 320, -96, 366, -96, 14, 1);
  const g = c.createRadialGradient(376, -104, 4, 384, -96, 32); g.addColorStop(0, grey(.6)); g.addColorStop(1, grey(.16));
  c.fillStyle = g; c.beginPath(); c.arc(384, -96, 31, 0, TAU); c.fill(); c.fillStyle = grey(.05); c.beginPath(); c.arc(384, -96, 24, 0, TAU); c.fill();
  c.strokeStyle = grey(.9); c.lineWidth = 3; c.beginPath(); c.arc(384, -96, 29, 3.4, 5.9); c.stroke();
  c.fillStyle = grey(.45); c.beginPath(); c.arc(384, -96, 10, 0, TAU); c.fill();
  // the old hose, coiled away off the left side
  hoseDraw(c, crPts([[-322, 150], [-352, 168], [-380, 150], [-372, 120], [-344, 134], [-360, 176], [-392, 210], [-420, 228]], 8), 15);
}
const SBOX = { side: { x0: -420, y0: -410, x1: 450, y1: 30 }, top: { x0: -440, y0: -240, x1: 440, y1: 250 } };
function structSprite(view, bk) {
  const key = view + bk; if (SPR[key]) return SPR[key];
  const box = SBOX[view], w = Math.ceil((box.x1 - box.x0) * bk), h = Math.ceil((box.y1 - box.y0) * bk);
  const alb = cv(w, h), c = alb.getContext('2d'); c.scale(bk, bk); c.translate(-box.x0, -box.y0); (view === 'top' ? drawTop : drawSide)(c);
  const sil = cv(w, h), sx = sil.getContext('2d'); sx.drawImage(alb, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#020605'; sx.fillRect(0, 0, w, h);
  return (SPR[key] = { alb, sil, box, bk, w, h, key });
}
LM.structure = function (ctx, x, y, s, t, o = {}) {
  const view = o.view === 'top' ? 'top' : 'side', f = o.flip ? -1 : 1;
  const map = (lx, ly) => [x + f * lx * s, y + ly * s];
  const box = SBOX[view];
  const ret = view === 'side'
    ? { hook: map(411, -213), bucket: map(383, -254), rim: map(383, -292), top: map(23, -344), topY: y - 344 * s, topL: map(-300, -344), topR: map(300, -344), hose: HOSE_S.map(p => map(p[0], p[1])) }
    : { hook: map(384, -96), bucket: map(384, -96), rim: map(384, -96), top: map(0, 0), topY: y, topL: map(-320, 0), topR: map(320, 0), hose: [] };
  ret.map = map; ret.bbox = [Math.min(map(box.x0, 0)[0], map(box.x1, 0)[0]), y + box.y0 * s, Math.max(map(box.x0, 0)[0], map(box.x1, 0)[0]), y + box.y1 * s];
  const a = al(o.a); if (!ctx || a <= 0) return ret;
  const need = s * devScale(ctx), bk = need <= .5 ? .5 : need <= .71 ? .71 : need <= 1 ? 1 : need <= 1.41 ? 1.41 : need <= 2 ? 2 : 2.83;
  const sp = structSprite(view, bk), dx = box.x0 * bk, dy = box.y0 * bk;
  ctx.save(); ctx.translate(x, y); ctx.scale(f * s / bk, s / bk); const ga = ctx.globalAlpha;
  const sil = o.sil == null ? 1 : o.sil; if (sil > 0) { ctx.globalAlpha = ga * a * clamp(sil); ctx.drawImage(sp.sil, dx, dy); }
  const amb = o.amb == null ? .08 : o.amb, lights = o.lights || [];
  if (amb > .004 || lights.length) {
    const [lb, lx] = buf('lmSt' + sp.key, sp.w, sp.h);
    lx.fillStyle = mix('#000000', o.ambColor || '#8fb3b8', clamp(amb)); lx.fillRect(0, 0, sp.w, sp.h);
    lx.globalCompositeOperation = 'lighter';
    for (const Lt of lights) {
      const px = ((Lt.x - x) / (f * s) - box.x0) * bk, py = ((Lt.y - y) / s - box.y0) * bk, pr = Lt.r / s * bk, la = al(Lt.a);
      if (pr < 1 || px + pr < 0 || py + pr < 0 || px - pr > sp.w || py - pr > sp.h) continue;
      const g = lx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, rgba(Lt.color, Math.min(1, la))); g.addColorStop(.28, rgba(Lt.color, Math.min(1, .6 * la))); g.addColorStop(.62, rgba(Lt.color, Math.min(1, .17 * la))); g.addColorStop(1, rgba(Lt.color, 0));
      lx.fillStyle = g; lx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    lx.globalCompositeOperation = 'multiply'; lx.drawImage(sp.alb, 0, 0);
    lx.globalCompositeOperation = 'destination-in'; lx.drawImage(sp.alb, 0, 0);
    ctx.globalAlpha = ga * a; ctx.drawImage(lb, dx, dy);
  }
  ctx.restore();
  return ret;
};

// =====================================================================================================
// LM.diver(ctx, x, y, s, t, o) -> ret: faceless helmeted saturation-diver silhouette (hot-water suit, boots,
// bailout cylinder, round hard hat with a dark faceplate — never a face). s = 1 is ~490 px tall standing.
//  o.pose 'stand' | 'crouch' | 'climb' | 'curl' | 'float' | 'drag' | 'swim' | 'sit' | 'lean' | 'huddle'
//         (or a pose object, see LM.POSES); o.pose2 + o.mix 0..1 blends two poses; o.adj {na:[..]} overrides
//  o.anchor 'chest' (default: (x, y) is the life-light) | 'base' (lowest point of the body sits on y) | 'pelvis'
//  o.dir 1 faces right / -1 left · o.rot rad · o.a alpha · o.idle 1 (gentle float motion) · o.kick (leg kick
//  amplitude) · o.tremble 0..1 · o.phase (time offset so two divers don't move in sync)
//  o.life 0..1 warm amber life-light at the chest, heartbeat o.bpm (62) (also warms the suit around it)
//  o.lamp 0..1 cold white helmet lamp + beam (o.lampAng world angle override, o.beamLen = 820)
//  o.bailout true (back cylinder) · o.bailoutLit 0..1 (its valve glows amber when opened)
//  o.helmet true (false = bare faceless hooded head) · o.kind 'diver' | 'bellman' (no helmet/bailout)
//  o.fill '#05090b' body · o.rim '#8fc8e0' rim colour · o.rimA 1 · o.light [x,y] (rim faces it) or o.rimDir
//  (rad, default up-left) · o.halo .2 soft glow around the rim · o.detail 1 (straps, faceplate glint)
// ret: {chest, head, lamp, lampAng, umb (umbilical attach point on the helmet), hand, hand2, foot, foot2,
//       pelvis, valve (bailout valve), beat, s, lights: [life light, lamp light]}
// =====================================================================================================
const POSES = LM.POSES = {
  // T: torso tilt (+ = leaning forward), h: head tilt on top of it, limbs [upper angle, bend] in body space:
  // angle 0 = straight down, +PI/2 = forward, PI = up; the lower segment angle = upper + bend.
  stand:  { T: .04, h: .06, na: [.22, .42], fa: [-.16, .34], nl: [.08, -.07], fl: [-.12, -.06] },
  crouch: { T: .52, h: .32, na: [.95, .62], fa: [.72, .86], nl: [1.5, -1.56], fl: [.1, -1.48] },
  climb:  { T: .1, h: -.42, na: [2.78, .22], fa: [2.12, .55], nl: [1.06, -1.72], fl: [-.04, -.14] },
  curl:   { T: 1.36, h: .62, na: [-.42, -.95], fa: [-.25, -1.15], nl: [1.18, -2.56], fl: [.98, -2.42] },
  float:  { T: .3, h: .58, na: [.5, .36], fa: [.78, .3], nl: [.3, -.5], fl: [.08, -.34] },
  drag:   { T: -.34, h: .14, na: [1.42, .1], fa: [1.24, .22], nl: [.52, -.22], fl: [-.32, -.36] },
  swim:   { T: 1.4, h: -.6, na: [1.62, .08], fa: [1.25, .36], nl: [-1.44, -.16], fl: [-1.62, .12] },
  sit:    { T: .06, h: .18, na: [.55, .95], fa: [.35, 1.05], nl: [1.5, -1.48], fl: [1.42, -1.5] },
  lean:   { T: .98, h: .4, na: [.12, .28], fa: [.36, .14], nl: [.16, -1.52], fl: [.02, -1.5] },
  huddle: { T: .42, h: .62, na: [.45, 1.15], fa: [.3, 1.3], nl: [2.05, -2.25], fl: [1.9, -2.2] },
};
function blendPose(p, q, m) { const r = {}; for (const k in p) r[k] = Array.isArray(p[k]) ? p[k].map((v, i) => lerp(v, q[k][i], m)) : lerp(p[k], q[k], m); return r; }
function poseOf(o, t) {
  const get = q => (typeof q === 'object' && q ? q : POSES[q] || POSES.stand);
  let p = get(o.pose || 'stand'); if (o.pose2 != null) p = blendPose(p, get(o.pose2), clamp(o.mix || 0));
  p = { T: p.T, h: p.h, na: p.na.slice(), fa: p.fa.slice(), nl: p.nl.slice(), fl: p.fl.slice() };
  if (o.adj) for (const k in o.adj) p[k] = Array.isArray(o.adj[k]) ? o.adj[k].slice() : o.adj[k];
  const id = o.idle == null ? 1 : o.idle, ph = o.phase || 0;
  if (id) { p.na[0] += .05 * id * Math.sin(t * .9 + ph); p.fa[0] += .05 * id * Math.sin(t * .8 + 1 + ph); p.h += .025 * id * Math.sin(t * .6 + ph); p.T += .012 * id * Math.sin(t * .5 + ph); }
  if (o.kick) { const k = o.kick * Math.sin(t * 3.2 + ph); p.nl[0] += k; p.fl[0] -= k; p.nl[1] -= Math.abs(k) * .6; p.fl[1] -= Math.abs(k) * .6; }
  if (o.tremble) { const tr = o.tremble; p.na[1] += tr * .08 * nz(t * 13, 3); p.fa[1] += tr * .08 * nz(t * 12, 5); p.h += tr * .04 * nz(t * 11, 7); }
  return p;
}
function rig(p) {
  const cT = Math.cos(p.T), sT = Math.sin(p.T), tor = (u, v) => [u * cT - v * sT, u * sT + v * cT];
  const J = { T: p.T, tor, pel: [0, 0], chest: tor(16, -106), shN: tor(12, -140), shF: tor(-4, -144), neck: tor(8, -166), hipN: tor(6, -4), hipF: tor(-8, -8) };
  J.HA = p.T + p.h; const cH = Math.cos(J.HA), sH = Math.sin(J.HA);
  J.hel = (u, v) => [J.neck[0] + u * cH - v * sH, J.neck[1] + u * sH + v * cH];
  const limb = (o, a1, a2, l1, l2) => { const e = [o[0] + Math.sin(a1) * l1, o[1] + Math.cos(a1) * l1], w = [e[0] + Math.sin(a2) * l2, e[1] + Math.cos(a2) * l2]; return [o, e, w, a1, a2]; };
  J.armN = limb(J.shN, p.na[0], p.na[0] + p.na[1], 76, 70); J.armF = limb(J.shF, p.fa[0], p.fa[0] + p.fa[1], 76, 70);
  J.legN = limb(J.hipN, p.nl[0], p.nl[0] + p.nl[1], 104, 98); J.legF = limb(J.hipF, p.fl[0], p.fl[0] + p.fl[1], 104, 98);
  return J;
}
const handOf = A => [A[2][0] + Math.sin(A[4]) * 14, A[2][1] + Math.cos(A[4]) * 14];
const toeOf = Lg => [Lg[2][0] + Math.cos(Lg[4]) * 34 + Math.sin(Lg[4]) * 10, Lg[2][1] - Math.sin(Lg[4]) * 34 + Math.cos(Lg[4]) * 10];
function keyPts(J) {
  const r = [[J.pel, 34], [J.chest, 52], [J.neck, 30], [J.hel(12, -52), 56], [J.shN, 26], [J.shF, 26], [J.tor(-62, -100), 30]];
  for (const A of [J.armN, J.armF]) r.push([A[1], 21], [A[2], 19], [handOf(A), 18]);
  for (const Lg of [J.legN, J.legF]) r.push([Lg[1], 27], [Lg[2], 22], [toeOf(Lg), 18]);
  return r;
}
function capsule(c, x0, y0, x1, y1, w0, w1) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
  c.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); c.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  c.arc(x1, y1, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true); c.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  c.arc(x0, y0, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true); c.closePath();
}
function diverShape(c, J, o, kind, helmet) {
  const part = f => { c.beginPath(); f(); c.fill(); };
  const boot = kind === 'bellman' ? 48 : 72;
  const arm = (A, w0) => { const [sh, el, wr, , a2] = A; part(() => capsule(c, sh[0], sh[1], el[0], el[1], w0, w0 * .88)); part(() => capsule(c, el[0], el[1], wr[0], wr[1], w0 * .88, w0 * .74));
    const h = handOf(A); part(() => c.ellipse(h[0], h[1], 17, 13, Math.atan2(Math.cos(a2), Math.sin(a2)), 0, TAU)); };
  const leg = (Lg, w0) => { const [hp, kn, an, , a2] = Lg; part(() => capsule(c, hp[0], hp[1], kn[0], kn[1], w0, w0 * .86)); part(() => capsule(c, kn[0], kn[1], an[0], an[1], w0 * .84, w0 * .7));
    c.save(); c.translate(an[0], an[1]); c.rotate(-a2); part(() => roundRect(c, -20, -14, boot, 30, 10)); c.restore(); };
  const bail = kind === 'diver' && o.bailout !== false;
  arm(J.armF, 36); leg(J.legF, 50);
  if (bail) { c.save(); c.rotate(J.T); part(() => roundRect(c, -84, -158, 40, 122, 17)); part(() => c.rect(-71, -174, 16, 18)); part(() => c.arc(-63, -178, 9, 0, TAU)); c.restore(); }
  c.save(); c.rotate(J.T); part(() => { c.moveTo(-32, -170); c.quadraticCurveTo(10, -184, 44, -166); c.quadraticCurveTo(62, -138, 56, -92); c.quadraticCurveTo(50, -44, 42, -4); c.quadraticCurveTo(20, 20, -10, 16);
    c.quadraticCurveTo(-40, 8, -42, -30); c.quadraticCurveTo(-48, -100, -44, -142); c.quadraticCurveTo(-42, -164, -32, -170); c.closePath(); }); c.restore();
  leg(J.legN, 52);
  c.save(); c.translate(J.neck[0], J.neck[1]); c.rotate(J.HA);
  if (helmet) {
    part(() => c.ellipse(8, 2, 44, 14, 0, 0, TAU));                                                     // neck ring / yoke
    part(() => c.ellipse(12, -52, 50, 53, 0, 0, TAU));                                                 // dome
    part(() => { c.moveTo(40, -92); c.lineTo(64, -80); c.quadraticCurveTo(76, -50, 68, -18); c.lineTo(44, -10); c.closePath(); });   // faceplate frame
    part(() => c.arc(58, -6, 15, 0, TAU));                                                             // demand valve
    part(() => c.rect(-46, -68, 18, 34)); part(() => c.arc(-34, -26, 11, 0, TAU));                     // side block, whip connection
    part(() => roundRect(c, 12, -118, 32, 14, 5));                                                     // lamp pod
  } else {
    part(() => capsule(c, 4, 4, 8, -18, 34, 30));                                                      // neck
    part(() => c.ellipse(12, -42, 33, 38, -.1, 0, TAU));                                               // plain head / hood (no features)
  }
  c.restore();
  arm(J.armN, 38);
  if (bail && helmet) { const v = J.tor(-63, -182), hb = J.hel(-40, -52); c.lineWidth = 7; c.lineCap = 'round'; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(v[0], v[1]); c.quadraticCurveTo(v[0] - 12, hb[1] - 24, hb[0], hb[1]); c.stroke(); }
}
function diverDetails(c, J, o, rim, kind, helmet) {
  const k = o.detail == null ? 1 : o.detail; if (k <= 0) return;
  c.lineCap = 'round';
  c.save(); c.rotate(J.T);
  c.strokeStyle = rgba(rim, .17 * k); c.lineWidth = 5; c.beginPath(); c.moveTo(-36, -152); c.lineTo(46, -66); c.moveTo(-40, -24); c.lineTo(42, -30); c.stroke();
  c.strokeStyle = rgba(rim, .1 * k); c.lineWidth = 2; c.beginPath(); c.moveTo(22, -170); c.quadraticCurveTo(32, -100, 26, -20); c.stroke();
  if (kind === 'diver' && o.bailout !== false) { c.strokeStyle = rgba(rim, .26 * k); c.lineWidth = 3; c.beginPath(); c.moveTo(-82, -126); c.lineTo(-46, -126); c.moveTo(-82, -70); c.lineTo(-46, -70); c.moveTo(-76, -150); c.lineTo(-76, -48); c.stroke();
    if (o.bailoutLit > 0) { c.fillStyle = rgba(COL.amber, clamp(o.bailoutLit)); c.beginPath(); c.arc(-63, -178, 7, 0, TAU); c.fill(); } }
  c.restore();
  c.save(); c.translate(J.neck[0], J.neck[1]); c.rotate(J.HA);
  if (helmet) {
    c.fillStyle = '#08141b'; c.beginPath(); c.moveTo(45, -86); c.lineTo(62, -77); c.quadraticCurveTo(71, -50, 64, -22); c.lineTo(47, -15); c.quadraticCurveTo(57, -50, 45, -86); c.closePath(); c.fill();
    c.strokeStyle = rgba('#cfe8ff', .5 * k); c.lineWidth = 2.6; c.beginPath(); c.moveTo(53, -78); c.quadraticCurveTo(61, -62, 59, -44); c.stroke();
    c.strokeStyle = rgba(rim, .38 * k); c.lineWidth = 3; c.beginPath(); c.arc(12, -52, 44, -2.6, -1.25); c.stroke();
    c.strokeStyle = rgba(rim, .2 * k); c.lineWidth = 2; c.beginPath(); c.moveTo(40, -92); c.lineTo(64, -80); c.quadraticCurveTo(76, -50, 68, -18); c.lineTo(44, -10); c.stroke();
    c.beginPath(); c.ellipse(8, 2, 40, 10, 0, Math.PI, TAU); c.stroke();
  } else if (kind === 'bellman') {
    c.strokeStyle = rgba(rim, .32 * k); c.lineWidth = 4; c.beginPath(); c.ellipse(12, -44, 35, 40, -.1, -2.7, -.5); c.stroke();          // headset band
    c.fillStyle = rgba(rim, .22 * k); c.beginPath(); c.ellipse(0, -40, 9, 13, 0, 0, TAU); c.fill();                                      // ear cup
  } else { c.strokeStyle = rgba(rim, .2 * k); c.lineWidth = 2.5; c.beginPath(); c.ellipse(12, -42, 30, 35, -.1, -2.7, -.9); c.stroke(); }
  c.restore();
}
LM.diver = function (ctx, x, y, s, t, o = {}) {
  const kind = o.kind || 'diver', dir = o.dir === -1 ? -1 : 1, rot = o.rot || 0, helmet = kind === 'diver' && o.helmet !== false;
  const J = rig(poseOf(o, t)), cr = Math.cos(rot), sr = Math.sin(rot);
  const tw = q => { const u = dir * q[0] * s, v = q[1] * s; return [u * cr - v * sr, u * sr + v * cr]; };
  let A; const an = o.anchor || 'chest';
  if (an === 'pelvis') A = [0, 0];
  else if (an === 'base') { let my = -1e9; for (const [q, r] of keyPts(J)) my = Math.max(my, tw(q)[1] + r * s * .8); A = [tw(J.pel)[0], my]; }
  else A = tw(J.chest);
  const scr = q => { const w = tw(q); return [x + w[0] - A[0], y + w[1] - A[1]]; };
  const life = o.life || 0, lamp = helmet ? (o.lamp || 0) : 0, a = al(o.a);
  const lampS = scr(J.hel(30, -112)), lampF = scr(J.hel(130, -58));
  const lampAng = o.lampAng != null ? o.lampAng : Math.atan2(lampF[1] - lampS[1], lampF[0] - lampS[0]);
  const b = PK.beat(t + (o.phase || 0), o.bpm || 62);
  const R = { chest: scr(J.chest), head: scr(J.hel(12, -52)), lamp: lampS, lampAng, umb: scr(J.hel(-34, -26)), hand: scr(handOf(J.armN)), hand2: scr(handOf(J.armF)),
    foot: scr(J.legN[2]), foot2: scr(J.legF[2]), pelvis: scr(J.pel), valve: scr(J.tor(-63, -178)), beat: b, s, lights: [] };
  if (life > 0) R.lights.push({ x: R.chest[0], y: R.chest[1], r: 240 * s * (o.lifeS || 1), color: COL.amber, a: .8 * life * (.85 + .15 * b) });
  if (lamp > 0) R.lights.push({ x: lampS[0] + Math.cos(lampAng) * 300 * s, y: lampS[1] + Math.sin(lampAng) * 300 * s, r: 460 * s, color: COL.lamp, a: .85 * lamp });
  if (!ctx || a <= 0) return R;
  if (lamp > 0) LM.lampBeam(ctx, t, lampS[0], lampS[1], lampAng, lamp * a, { len: (o.beamLen || 820) * s, spread: .27, s: Math.max(.4, s), seed: 9 });
  // buffers sized to the pose, rendered at the effective device scale
  const zs = devScale(ctx), S = s * zs;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [q, r] of keyPts(J)) { x0 = Math.min(x0, q[0] - r); y0 = Math.min(y0, q[1] - r); x1 = Math.max(x1, q[0] + r); y1 = Math.max(y1, q[1] + r); }
  const C = [(x0 + x1) / 2, (y0 + y1) / 2], D = Math.min(2048, Math.ceil((Math.hypot(x1 - x0, y1 - y0) * S + 48) / 64) * 64);
  const rim = o.rim || COL.rim, fill = o.fill || '#05090b';
  const setT = c => { c.setTransform(1, 0, 0, 1, 0, 0); c.translate(D / 2, D / 2); c.rotate(rot); c.scale(dir * S, S); c.translate(-C[0], -C[1]); };
  const [mb, mx] = buf('lmDvM' + D, D, D); mx.clearRect(0, 0, D, D); setT(mx); mx.fillStyle = mx.strokeStyle = '#fff'; diverShape(mx, J, o, kind, helmet);
  const [fbf, fx] = buf('lmDvF' + D, D, D); fx.clearRect(0, 0, D, D); fx.drawImage(mb, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = fill; fx.fillRect(0, 0, D, D);
  fx.globalCompositeOperation = 'source-atop'; setT(fx);
  if (life > 0) { const g = fx.createRadialGradient(J.chest[0], J.chest[1], 0, J.chest[0], J.chest[1], 200); g.addColorStop(0, rgba(COL.amber, .5 * life * (.8 + .2 * b))); g.addColorStop(.45, rgba(COL.amber, .12 * life)); g.addColorStop(1, rgba(COL.amber, 0)); fx.fillStyle = g; fx.fillRect(J.chest[0] - 200, J.chest[1] - 200, 400, 400); }
  if (o.warm > 0) { fx.fillStyle = rgba(COL.amber, .18 * o.warm); fx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  diverDetails(fx, J, o, rim, kind, helmet);
  const [rbf, rx] = buf('lmDvR' + D, D, D); rx.clearRect(0, 0, D, D); rx.drawImage(mb, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = rim; rx.fillRect(0, 0, D, D);
  const sc = scr(C), rd = o.light ? Math.atan2(o.light[1] - R.chest[1], o.light[0] - R.chest[0]) : (o.rimDir == null ? -2.3 : o.rimDir);
  const rw = (o.rimW || 3) * zs * clamp(s, .55, 1.6), ox = Math.cos(rd) * rw, oy = Math.sin(rd) * rw, X0 = -D / 2, Y0 = -D / 2;
  ctx.save(); ctx.translate(sc[0], sc[1]); ctx.scale(1 / zs, 1 / zs);
  const halo = o.halo == null ? .2 : o.halo, ga = ctx.globalAlpha;
  if (halo > 0) {
    const [h1, h1x] = buf('lmDvH1' + D, D / 4, D / 4), [h2, h2x] = buf('lmDvH2' + D, D / 8, D / 8);
    h1x.clearRect(0, 0, D / 4, D / 4); h1x.drawImage(rbf, 0, 0, D / 4, D / 4); h2x.clearRect(0, 0, D / 8, D / 8); h2x.drawImage(h1, 0, 0, D / 8, D / 8);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * clamp(halo * a); ctx.drawImage(h2, X0 - 6, Y0 - 6, D + 12, D + 12);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = ga * clamp(al(o.rim2A == null ? .3 : o.rim2A) * a); ctx.drawImage(rbf, X0 - ox * .7, Y0 - oy * .7);
  ctx.globalAlpha = ga * clamp(al(o.rimA) * a); ctx.drawImage(rbf, X0 + ox, Y0 + oy);
  ctx.globalAlpha = ga * a; ctx.drawImage(fbf, X0, Y0);
  ctx.restore();
  if (lamp > 0) { LM.glow(ctx, lampS[0], lampS[1], 64 * Math.max(.4, s), COL.lamp, .7 * lamp * a); LM.glow(ctx, lampS[0], lampS[1], 14 * Math.max(.4, s), '#ffffff', .95 * lamp * a); }
  if (o.bailoutLit > 0) LM.glow(ctx, R.valve[0], R.valve[1], 46 * Math.max(.5, s), COL.amber, .7 * o.bailoutLit * a);
  if (life > 0) LM.life(ctx, t, R.chest[0], R.chest[1], life * a, { bpm: o.bpm || 62, s: s * (o.lifeS || 1), phase: o.phase });
  return R;
};

// =====================================================================================================
// LM.umbilical(ctx, pts, t, o) -> ret: thick braided umbilical along control points pts [[x,y],...]
// (Catmull-Rom through them). pts[0] = supply end (bell), last = diver. 2 points + o.sag = a hanging curve.
//  o.w 16 thickness · o.color · o.lit .55 brightness (0 = nearly black in the dark) · o.sag px
//  o.tension 0..1: straightens each span toward the straight chord (1 = bowstring, sharp at a snag point)
//     and vibrates it (o.vib 3.2 px at full tension); slack lines sway gently (o.sway 7)
//  o.pulse 0..1 travelling glow from pts[0] toward the diver (o.pulseColor amber, o.pulseSpeed 420 px/s,
//     o.pulseN) · o.glow 0..1 soft emissive glow along the line
//  o.cut {at, frac, recoil = 170, whip = 1}: at time `at` (same clock as t) the line parts at arc fraction
//     `frac`: white flash + sparks + shock ring, frayed ends (inner hoses + fibres) whip away, the supply
//     side recoils, the diver side drops slack. Before `at` it is drawn intact.
// ret: intact {pts, len, start, end, cut (where it WILL part, if o.cut), flash: 0} · parted {a: supply piece, b: diver piece, cut [x,y],
//      endA, endB (frayed free ends), flash (1 -> 0 decay, use it to kill the lights), len, snapped: true}
// =====================================================================================================
function umbDense(ctrl, tension, sag) {
  const out = [], n = ctrl.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    const m = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 7));
    for (let k = 0; k < m; k++) {
      const u = k / m, u2 = u * u, u3 = u2 * u, f = j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
      out.push([lerp(f(0), lerp(p1[0], p2[0], u), tension), lerp(f(1), lerp(p1[1], p2[1], u), tension) + sag * (1 - tension) * 4 * u * (1 - u), u, i]);
    }
  }
  out.push([ctrl[n - 1][0], ctrl[n - 1][1], 1, n - 2]); return out;
}
function normalsOf(P0) {
  const n = P0.length, N = new Array(n); let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { const a = P0[Math.max(0, i - 1)], b = P0[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; N[i] = [-dy / l, dx / l]; sy += N[i][1]; sx += N[i][0]; }
  if (sy < 0 || (sy === 0 && sx < 0)) for (const v of N) { v[0] = -v[0]; v[1] = -v[1]; }   // normals point "down" on average (highlight on top)
  return N;
}
function cumOf(P0) { const c = [0]; for (let i = 1; i < P0.length; i++) c.push(c[i - 1] + Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1])); return c; }
function idxAt(cum, d) { let lo = 0, hi2 = cum.length - 1; d = clamp(d, 0, cum[hi2]); while (lo < hi2) { const m = (lo + hi2) >> 1; if (cum[m] < d) lo = m + 1; else hi2 = m; } return lo; }
function drawRope(ctx, P0, w, o, t, pulse) {
  if (P0.length < 2) return;
  const lit = o.lit == null ? .55 : o.lit, base = mix('#030505', o.color || COL.umb, lit), dk = mix(base, '#000000', .62), hl = mix(base, '#fff2d2', .5);
  const N = normalsOf(P0), cum = cumOf(P0), Lt = cum[cum.length - 1];
  const path = of => { ctx.beginPath(); for (let i = 0; i < P0.length; i++) { const x = P0[i][0] + N[i][0] * of, y = P0[i][1] + N[i][1] * of; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(1,4,4,.85)'; ctx.lineWidth = w + 3; path(0); ctx.stroke();
  ctx.strokeStyle = base; ctx.lineWidth = w; path(0); ctx.stroke();
  ctx.strokeStyle = dk; ctx.lineWidth = w * .38; path(w * .27); ctx.stroke();
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (.35 + .65 * clamp(lit * 1.4)); ctx.strokeStyle = hl; ctx.lineWidth = Math.max(1, w * .13); path(-w * .28); ctx.stroke(); ctx.globalAlpha = ga;
  // braid: slanted ticks across the line
  ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = Math.max(1, w * .1); ctx.beginPath();
  const step = Math.max(5, w * .5); let next = step * .5;
  for (let i = 1; i < P0.length; i++) while (cum[i] >= next) {
    const n = N[i], tx = n[1], ty = -n[0], p = P0[i];
    ctx.moveTo(p[0] - n[0] * w * .44 - tx * w * .2, p[1] - n[1] * w * .44 - ty * w * .2); ctx.lineTo(p[0] + n[0] * w * .44 + tx * w * .2, p[1] + n[1] * w * .44 + ty * w * .2); next += step;
  }
  ctx.stroke();
  // black tape bands (the umbilical is a taped bundle of hoses)
  ctx.strokeStyle = 'rgba(8,10,10,.9)'; ctx.lineWidth = w + 1.5; ctx.lineCap = 'butt';
  for (let d = 70; d < Lt - 20; d += 150) { const i0 = idxAt(cum, d), i1 = idxAt(cum, d + w * .9); if (i1 <= i0) continue; ctx.beginPath(); for (let i = i0; i <= i1; i++) (i === i0 ? ctx.moveTo(P0[i][0], P0[i][1]) : ctx.lineTo(P0[i][0], P0[i][1])); ctx.stroke(); }
  ctx.lineCap = 'round';
  const pc = o.pulseColor || COL.amber;
  if ((o.glow || 0) > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(pc, .07 * o.glow); ctx.lineWidth = w * 2.8; path(0); ctx.stroke(); ctx.lineWidth = w * 1.2; ctx.strokeStyle = rgba(pc, .1 * o.glow); path(0); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (pulse > 0 && Lt > 10) {
    const sp = o.pulseSpeed || 420, n = o.pulseN || Math.max(1, Math.round(Lt / 460));
    for (let k = 0; k < n; k++) {
      const d = (((t * sp) / Lt + k / n) % 1 + 1) % 1 * Lt, i = idxAt(cum, d), p = P0[i], fade = clamp(d / 60) * clamp((Lt - d) / 60);
      LM.glow(ctx, p[0], p[1], w * 3.6, pc, .5 * pulse * fade);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(pc, .6 * pulse * fade); ctx.lineWidth = w * .45; ctx.beginPath();
      const j0 = idxAt(cum, d - 46), j1 = idxAt(cum, d + 46); for (let j = j0; j <= j1; j++) (j === j0 ? ctx.moveTo(P0[j][0], P0[j][1]) : ctx.lineTo(P0[j][0], P0[j][1])); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}
function fray(ctx, E, ang, w, t, u, seed, a) {
  const hose = ['#22282b', '#a8402c', '#3f6e98', '#e6e0d0'], fib = ['#d9cba0', '#20262a', '#b4472f', '#3f6f9a', '#ece6d6', '#8a7a48', '#6a7a6a'];
  ctx.save(); ctx.lineCap = 'round';
  for (let j = 0; j < 4; j++) {   // severed inner hoses: gas, hot water, comms/power, strength member
    const q = ang + (j - 1.5) * .3 + .1 * Math.sin(t * 7 + j) * Math.exp(-u), L0 = w * (.55 + .5 * hi(j + seed));
    ctx.strokeStyle = rgba(hose[j], .95 * a); ctx.lineWidth = w * .26; ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(E[0] + Math.cos(q) * L0, E[1] + Math.sin(q) * L0); ctx.stroke();
  }
  for (let j = 0; j < 16; j++) {
    const q = ang + (hi(j * 3 + seed) - .5) * 1.9, len = w * (.6 + 1.7 * hi(j * 5 + seed)), wav = Math.sin(t * 11 + j * 1.7) * w * .4 * Math.exp(-u * 1.1) + w * .2 * Math.sin(j * 2.3);
    const ex = E[0] + Math.cos(q) * len, ey = E[1] + Math.sin(q) * len + u * w * .25, mx = E[0] + Math.cos(q) * len * .5 - Math.sin(q) * wav, my = E[1] + Math.sin(q) * len * .5 + Math.cos(q) * wav;
    ctx.strokeStyle = rgba(fib[j % fib.length], .85 * a); ctx.lineWidth = Math.max(.8, w * (.05 + .07 * hi(j * 7 + seed))); ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
  ctx.restore();
}
LM.umbilical = function (ctx, pts, t, o = {}) {
  const tension = clamp(o.tension || 0), w = o.w || 16;
  const ctrl = pts.map(p => [p[0], p[1]]);
  const P0 = umbDense(ctrl, tension, o.sag || 0);
  const N = normalsOf(P0), vib = (o.vib == null ? 3.2 : o.vib) * tension * tension, sway = (o.sway == null ? 7 : o.sway) * (1 - tension);
  for (let i = 0; i < P0.length; i++) {
    const u = P0[i][2], sg = P0[i][3], e1 = Math.sin(Math.PI * u);
    const d = vib * (e1 * Math.sin(t * 57 + sg * 1.3) + .45 * Math.sin(TAU * u) * Math.sin(t * 83 + sg * 2.1)) + sway * e1 * fb(t * .35 + i * .012 + sg * 3, 61);
    P0[i] = [P0[i][0] + N[i][0] * d, P0[i][1] + N[i][1] * d];
  }
  const cum = cumOf(P0), Lt = cum[cum.length - 1], cut = o.cut, u = cut ? t - cut.at : -1;
  if (!(u >= 0)) {
    if (ctx) drawRope(ctx, P0, w, o, t, o.pulse || 0);
    const cpi = cut ? P0[idxAt(cum, clamp(cut.frac == null ? .5 : cut.frac) * Lt)] : null;
    return { pts: P0, len: Lt, start: P0[0], end: P0[P0.length - 1], cut: cpi ? [cpi[0], cpi[1]] : null, flash: 0, snapped: false };
  }
  const dC = clamp(cut.frac == null ? .5 : cut.frac) * Lt, iC = idxAt(cum, dC), cp = [P0[iC][0], P0[iC][1]];
  const rec = (cut.recoil == null ? 170 : cut.recoil) * E.outExpo(clamp(u / .5)), wa = (cut.whip == null ? 1 : cut.whip) * 64 * (1 - Math.exp(-u * 14)) * Math.exp(-u * 1.5);
  const Npts = normalsOf(P0), A = [], B = [];
  for (let i = 0; i <= iC; i++) {
    const e = dC - cum[i] - rec; if (e < 0) break;
    const env = Math.exp(-e / 280) * Math.min(1, cum[i] / 80), d = wa * Math.sin(e * .028 - u * 19) * env, fall = 26 * u * u / (1 + u) * Math.exp(-e / 220);
    A.push([P0[i][0] + Npts[i][0] * d, P0[i][1] + Npts[i][1] * d + fall]);
  }
  const recB = rec * .55;
  for (let i = iC; i < P0.length; i++) {
    const e = cum[i] - dC - recB; if (e < 0) continue;
    const env = Math.exp(-e / 240) * Math.min(1, (Lt - cum[i]) / 80), d = -wa * .8 * Math.sin(e * .03 - u * 17) * env, fall = 70 * Math.pow(u, 1.3) / (1 + .5 * u) * Math.exp(-e / 260);
    B.push([P0[i][0] + Npts[i][0] * d, P0[i][1] + Npts[i][1] * d + fall]);
  }
  const fl = Math.exp(-u * 9), endA = A[A.length - 1], endB = B[0];
  const ret = { a: A, b: B, cut: cp, endA, endB, flash: fl, len: Lt, snapped: true };
  if (!ctx) return ret;
  const po = Object.assign({}, o, { glow: 0 });
  drawRope(ctx, A, w, po, t, 0); drawRope(ctx, B, w, po, t, 0);
  if (A.length > 1) fray(ctx, endA, Math.atan2(endA[1] - A[A.length - 2][1], endA[0] - A[A.length - 2][0]), w, t, u, 3, 1);
  if (B.length > 1) fray(ctx, endB, Math.atan2(endB[1] - B[1][1], endB[0] - B[1][0]), w, t, u, 7, 1);
  if (u < .7) {
    const k = 1 - u / .7;
    LM.glow(ctx, cp[0], cp[1], w * (6 + 46 * E.outC(clamp(u / .25))), '#ffffff', 1.2 * fl); LM.glow(ctx, cp[0], cp[1], w * 18, '#dff4ff', .8 * fl);
    if (endA) LM.glow(ctx, endA[0], endA[1], w * 3, '#fff4dc', .7 * k * k); if (endB) LM.glow(ctx, endB[0], endB[1], w * 3, '#fff4dc', .7 * k * k);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#e8f6ff', .45 * k * k); ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(cp[0], cp[1], 30 + 900 * E.outC(u / .7), 0, TAU); ctx.stroke();
    for (let j = 0; j < 20; j++) {
      const q = hi(j * 7 + 11) * TAU, sp = 300 + 700 * hi(j * 11 + 5), r = sp * u * (1 - u * .5), sx = cp[0] + Math.cos(q) * r, sy = cp[1] + Math.sin(q) * r + 120 * u * u, ln = 8 + sp * .025;
      ctx.strokeStyle = rgba('#fff4dc', k); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(q) * ln, sy - Math.sin(q) * ln); ctx.stroke();
    }
    ctx.restore();
  }
  return ret;
};

// =====================================================================================================
// LM.bell(ctx, x, y, s, t, o) -> ret: the diving bell. (x, y) = centre of the pressure vessel.
// Exterior (default): round vessel in a protective frame, ONE porthole (not a face), gas bottles, bottom
// hatch trunk, lift wire + bell umbilical up to o.wireTop (default -40); warm amber interior glow through the
// porthole and the open hatch (light cone down into the water).
//  o.glow 0..1 interior warmth · o.hatch 0..1 hatch open (light spills down) · o.amb .3 ambient on the paint
//  o.swing rad (pivots on the wire) · o.lamps 0..1 cold frame lamps · o.rim colour · o.wireTop · o.wireDx
// ret: {hatch [x,y] (bottom opening), port, wire (top attach), exit (where diver umbilicals leave),
//       lights: [porthole glow, hatch spill, frame lamps]}
// Interior (o.inside = true): cramped warm cutaway filling ~680*s x 950*s around (x, y): curved steel walls,
// pipes, blank gauges, coiled umbilical, bench, open floor hatch to black water, caged lamp, and a faceless
// bellman (o.bellman 0..1 alpha, o.bellmanPose 'sit' | 'lean' (or o.bellmanMix 0..1 sit -> lean)).
//  o.glow 0..1 lamp warmth · o.water 0..1 ripple on the hatch water
// ret: {hatch [x,y] (centre of the floor opening), hatchR [rx, ry], lamp, bench, bellman (diver ret), lights}
// =====================================================================================================
LM.bell = function (ctx, x, y, s, t, o = {}) {
  if (o.inside) return bellInside(ctx, x, y, s, t, o);
  const sw = o.swing || 0, cs = Math.cos(sw), sn = Math.sin(sw), PY = -292;
  const map = (lx, ly) => { const v = ly - PY; return [x + (lx * cs - v * sn) * s, y + PY * s + (lx * sn + v * cs) * s]; };
  const glowK = o.glow == null ? 1 : o.glow, hatch = o.hatch || 0, lamps = o.lamps || 0, amb = o.amb == null ? .3 : o.amb, a = al(o.a);
  const R = { hatch: map(0, 174), port: map(56, -40), wire: map(0, PY), exit: map(-26, 176), lights: [] };
  const fl = .94 + .06 * nz(t * 3, 5);
  if (glowK > 0) R.lights.push({ x: R.port[0], y: R.port[1], r: 300 * s, color: COL.amber, a: .55 * glowK * fl });
  if (glowK > 0 && hatch > 0) { const hp = map(0, 330); R.lights.push({ x: hp[0], y: hp[1], r: 420 * s, color: COL.amber, a: .75 * glowK * hatch * fl }); }
  if (lamps > 0) for (const sx of [-150, 150]) { const lp = map(sx, 380); R.lights.push({ x: lp[0], y: lp[1], r: 380 * s, color: COL.lamp, a: .6 * lamps }); }
  if (!ctx || a <= 0) return R;
  ctx.save(); ctx.globalAlpha *= a;
  // lift wire + bell umbilical (screen space, from the pivot straight up)
  const wt = o.wireTop == null ? -40 : o.wireTop, wp = R.wire, wdx = (o.wireDx || 0);
  ctx.strokeStyle = rgba('#a8b6ba', .3 + .3 * amb); ctx.lineWidth = Math.max(1.5, 3.2 * s); ctx.beginPath(); ctx.moveTo(wp[0], wp[1]); ctx.lineTo(wp[0] + wdx, wt); ctx.stroke();
  const ub = map(34, -214);
  ctx.strokeStyle = mix('#050606', COL.umb, .25 + .4 * amb); ctx.lineWidth = Math.max(3, 13 * s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ub[0], ub[1]);
  ctx.bezierCurveTo(ub[0] + 60 * s, ub[1] - 80 * s, wp[0] + wdx + 70 * s, wt + 300 * s, wp[0] + wdx + 50 * s, wt); ctx.stroke();
  ctx.save(); ctx.translate(wp[0], wp[1]); ctx.rotate(sw); ctx.scale(s, s); ctx.translate(0, -PY);
  // light cone from the open hatch (behind the bell)
  if (hatch > 0 && glowK > 0) {
    ctx.globalCompositeOperation = 'lighter'; const k = hatch * glowK * fl;
    const g = ctx.createLinearGradient(0, 174, 0, 760); g.addColorStop(0, rgba(COL.amber, .32 * k)); g.addColorStop(.4, rgba(COL.amber, .08 * k)); g.addColorStop(1, rgba(COL.amber, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-32, 172); ctx.lineTo(32, 172); ctx.lineTo(250, 760); ctx.lineTo(-250, 760); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  const steel = v => mix('#020404', '#6c7c80', v * (.35 + .9 * amb));
  const tube = (x0, y0, x1, y1, w, v = 1) => { ctx.lineCap = 'round'; ctx.strokeStyle = steel(.35 * v); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = steel(.9 * v); ctx.lineWidth = w * .22; ctx.beginPath(); ctx.moveTo(x0 - w * .2, y0 - w * .2); ctx.lineTo(x1 - w * .2, y1 - w * .2); ctx.stroke(); };
  // frame (back), bridle, gas bottles
  tube(-150, -168, 150, -168, 12, .6); tube(-150, 40, 150, 40, 10, .5);
  ctx.strokeStyle = steel(.5); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-150, -176); ctx.lineTo(0, PY); ctx.lineTo(150, -176); ctx.stroke();
  for (const [bx, v] of [[-206, .55], [-176, .8]]) { ctx.fillStyle = mix('#030505', '#56665e', v * (.4 + .9 * amb)); roundRect(ctx, bx - 14, -150, 28, 300, 13); ctx.fill(); ctx.fillStyle = steel(.8 * v); ctx.fillRect(bx - 8, -146, 4, 290); }
  ctx.fillStyle = steel(.4); ctx.fillRect(-212, -96, 54, 8); ctx.fillRect(-212, 90, 54, 8);
  // pressure vessel
  const body = () => { ctx.beginPath(); ctx.arc(0, -96, 112, Math.PI, TAU); ctx.lineTo(112, 84); ctx.ellipse(0, 84, 112, 44, 0, 0, Math.PI); ctx.closePath(); };
  const paint = mix('#040505', o.paint || COL.bell, .25 + .85 * amb);
  const gv = ctx.createLinearGradient(-112, 0, 112, 0); gv.addColorStop(0, mix(paint, '#000000', .8)); gv.addColorStop(.3, paint); gv.addColorStop(.48, mix(paint, '#fff0c8', .12 + .1 * amb)); gv.addColorStop(.8, mix(paint, '#000000', .55)); gv.addColorStop(1, mix(paint, '#000000', .85));
  body(); ctx.fillStyle = gv; ctx.fill();
  ctx.save(); body(); ctx.clip();
  if (glowK > 0) { const gw = ctx.createRadialGradient(56, -40, 10, 56, -40, 200); gw.addColorStop(0, rgba(COL.amber, .35 * glowK * fl)); gw.addColorStop(1, rgba(COL.amber, 0)); ctx.fillStyle = gw; ctx.fillRect(-120, -220, 240, 360); }
  const gt = ctx.createLinearGradient(0, -210, 0, -60); gt.addColorStop(0, rgba(o.rim || '#bfe6f0', .22 + .2 * amb)); gt.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gt; ctx.fillRect(-120, -220, 240, 160);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -96, 112, 16, 0, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 40, 112, 16, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(o.rim || '#bfe6f0', .18 + .25 * amb); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -96, 111, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  // padeye + crown
  ctx.fillStyle = steel(.6); ctx.fillRect(-10, -224, 20, 18); ctx.beginPath(); ctx.arc(0, PY + 6, 7, 0, TAU); ctx.fill();
  // the one porthole (off-centre)
  ctx.fillStyle = steel(.7); ctx.beginPath(); ctx.arc(56, -40, 27, 0, TAU); ctx.fill(); ctx.fillStyle = steel(.25); ctx.beginPath(); ctx.arc(56, -40, 22, 0, TAU); ctx.fill();
  const gp = ctx.createRadialGradient(52, -44, 2, 56, -40, 20);
  gp.addColorStop(0, mix('#0a0d0e', '#fff0cf', glowK * fl)); gp.addColorStop(.5, mix('#06090a', COL.amber, glowK * fl)); gp.addColorStop(1, mix('#030505', '#7a3f0c', glowK));
  ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(56, -40, 19, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(56, -40, 14, 3.5, 4.4); ctx.stroke();
  // bottom trunk + hatch opening
  ctx.fillStyle = steel(.4); ctx.fillRect(-40, 112, 80, 58); ctx.fillStyle = steel(.8); ctx.fillRect(-40, 112, 6, 58);
  ctx.fillStyle = steel(.55); ctx.beginPath(); ctx.ellipse(0, 172, 46, 10, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = hatch > 0 ? mix('#060504', '#ffd9a0', clamp(hatch * glowK * fl)) : '#020303'; ctx.beginPath(); ctx.ellipse(0, 173, 34, 7, 0, 0, TAU); ctx.fill();
  // frame (front): posts, top bumper, bottom ring, skids, lamps
  tube(-150, -176, -150, 214, 14); tube(150, -176, 150, 214, 14); tube(-160, -150, 160, -150, 11); tube(-160, 200, 160, 200, 13);
  ctx.fillStyle = steel(.45); ctx.fillRect(-182, 210, 364, 12); ctx.fillStyle = steel(.9); ctx.fillRect(-182, 210, 364, 2);
  for (const sx of [-150, 150]) { ctx.fillStyle = steel(.5); roundRect(ctx, sx - 13, 222, 26, 16, 4); ctx.fill(); if (lamps > 0) { ctx.fillStyle = rgba(COL.lamp, .9 * lamps); ctx.fillRect(sx - 9, 234, 18, 4); } }
  ctx.restore();
  // glows (screen space)
  if (glowK > 0) { LM.glow(ctx, R.port[0], R.port[1], 150 * s, COL.amber, .4 * glowK * fl); LM.glow(ctx, R.port[0], R.port[1], 42 * s, COL.warm, .7 * glowK * fl); }
  if (hatch > 0 && glowK > 0) LM.glow(ctx, R.hatch[0], R.hatch[1], 170 * s, COL.amber, .5 * hatch * glowK * fl);
  if (lamps > 0) for (const sx of [-150, 150]) { const lp = map(sx, 238); LM.lampBeam(ctx, t, lp[0], lp[1], Math.PI / 2 + sw + sx * .0012, .55 * lamps, { len: 520 * s, spread: .3, s, seed: 21 + sx }); }
  ctx.restore();
  return R;
};
function bellInside(ctx, x, y, s, t, o) {
  const map = (lx, ly) => [x + lx * s, y + ly * s], glowK = o.glow == null ? 1 : o.glow, fl = .95 + .05 * nz(t * 2.6, 9), a = al(o.a);
  const bm = o.bellmanMix != null ? clamp(o.bellmanMix) : (o.bellmanPose === 'lean' ? 1 : 0);
  const R = { hatch: map(0, 356), hatchR: [140 * s, 34 * s], lamp: map(0, -396), bench: map(-205, 112), lights: [] };
  R.lights.push({ x: R.lamp[0], y: R.lamp[1] + 120 * s, r: 900 * s, color: COL.amber, a: .7 * glowK * fl });
  const bx = lerp(-196, -96, bm), by = lerp(112, 292, bm), bs = .82 * s;
  const bo = { kind: 'bellman', pose: 'sit', pose2: 'lean', mix: bm, anchor: 'pelvis', fill: '#0c0805', rim: COL.warm, rimA: .9, rimDir: -1.4, halo: .3, idle: .6, a: al(o.bellman == null ? 1 : o.bellman) * a, warm: .6 };
  R.bellman = LM.diver(null, map(bx, by)[0], map(bx, by)[1], bs, t, bo);
  if (!ctx || a <= 0) return R;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  const cap = (r, top, bot) => { ctx.beginPath(); ctx.moveTo(-r, top); ctx.arc(0, top, r, Math.PI, TAU); ctx.lineTo(r, bot); ctx.arc(0, bot, r, 0, Math.PI); ctx.closePath(); };
  // steel wall in section
  cap(338, -150, 150); const gs = ctx.createLinearGradient(-338, 0, 338, 0); gs.addColorStop(0, '#1a1c1c'); gs.addColorStop(.5, '#3a3a34'); gs.addColorStop(1, '#141616'); ctx.fillStyle = gs; ctx.fill();
  ctx.save(); cap(338, -150, 150); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = -1000; k < 1000; k += 16) { ctx.moveTo(k, -560); ctx.lineTo(k + 400, -160); } ctx.stroke(); ctx.restore();
  // interior
  cap(300, -150, 150); const gi = ctx.createRadialGradient(0, -380, 20, 0, -100, 760);
  gi.addColorStop(0, mix('#0a0705', '#5a3a18', glowK * fl)); gi.addColorStop(.35, mix('#060403', '#2a1a0c', glowK)); gi.addColorStop(1, '#050302'); ctx.fillStyle = gi; ctx.fill();
  ctx.save(); cap(300, -150, 150); ctx.clip();
  const wl = v => rgba(mix('#000000', '#e0a060', glowK), v);
  ctx.lineWidth = 3; for (const ry of [-250, -20, 210]) { ctx.strokeStyle = wl(.16); ctx.beginPath(); ctx.ellipse(0, ry, 300, 46, 0, 0, Math.PI); ctx.stroke(); }
  ctx.lineWidth = 2; ctx.strokeStyle = wl(.08); ctx.beginPath(); for (const vx of [-250, -170, 170, 250]) { ctx.moveTo(vx, -440); ctx.lineTo(vx, 300); } ctx.stroke();
  // pipes + valves on the back wall (left), gauge panel (right, blank dials)
  const pipe = (x0, y0, x1, y1, w) => { ctx.lineCap = 'round'; ctx.strokeStyle = mix('#050403', '#4a3a28', glowK); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = wl(.5); ctx.lineWidth = w * .2; ctx.beginPath(); ctx.moveTo(x0 + w * .25, y0); ctx.lineTo(x1 + w * .25, y1); ctx.stroke(); };
  pipe(-238, -430, -238, 300, 16); pipe(-212, -400, -212, 300, 12); pipe(-238, -300, 120, -300, 12); pipe(-212, -180, -120, -180, 10);
  for (const [vx, vy] of [[-238, -60], [-212, 40], [-60, -300]]) { ctx.fillStyle = mix('#050403', '#6a4a26', glowK); ctx.beginPath(); ctx.arc(vx, vy, 14, 0, TAU); ctx.fill(); ctx.strokeStyle = wl(.55); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(vx, vy, 14, 3.5, 5.6); ctx.stroke(); }
  ctx.fillStyle = mix('#040302', '#21170e', glowK); roundRect(ctx, 130, -330, 140, 150, 10); ctx.fill();
  for (const [gx, gy, ga] of [[168, -290, -.6], [232, -290, .4], [200, -222, -1.6]]) {
    ctx.fillStyle = mix('#0b0805', '#c8b083', .55 * glowK); ctx.beginPath(); ctx.arc(gx, gy, 23, 0, TAU); ctx.fill(); ctx.strokeStyle = mix('#050403', '#7a5a30', glowK); ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#1a120a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ga - Math.PI / 2) * 16, gy + Math.sin(ga - Math.PI / 2) * 16); ctx.stroke();
  }
  // coiled umbilical on a hook (right)
  ctx.lineWidth = 3; ctx.strokeStyle = wl(.6); ctx.beginPath(); ctx.moveTo(205, -150); ctx.lineTo(205, -118); ctx.stroke();
  for (let k = 0; k < 5; k++) { ctx.strokeStyle = mix('#050402', COL.umb, (.55 + .1 * k) * glowK); ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(205 + k * 4 - 8, -30 + k * 3, 58 - k * 2, 88, .06, -Math.PI / 2 - .2, Math.PI * 1.5 - .2); ctx.stroke(); }
  // bench (left)
  ctx.fillStyle = mix('#050403', '#3a2a18', glowK); ctx.fillRect(-300, 116, 196, 26); ctx.fillStyle = wl(.6); ctx.fillRect(-300, 116, 196, 3); ctx.fillStyle = mix('#030202', '#1c140c', glowK); ctx.fillRect(-140, 142, 14, 160);
  // floor + open hatch to black water
  ctx.fillStyle = mix('#030202', '#2a1c10', glowK); ctx.fillRect(-310, 300, 620, 200); ctx.fillStyle = wl(.35); ctx.fillRect(-310, 300, 620, 3);
  ctx.fillStyle = mix('#040302', '#4a3420', glowK); ctx.beginPath(); ctx.ellipse(0, 356, 160, 44, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#010303'; ctx.beginPath(); ctx.ellipse(0, 358, 140, 34, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 358, 140, 34, 0, 0, TAU); ctx.clip();
  const wa = o.water == null ? 1 : o.water;
  for (let k = 0; k < 4; k++) { const ph = (t * .35 + k / 4) % 1; ctx.strokeStyle = rgba(COL.amber, .16 * wa * glowK * (1 - ph)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(10 * Math.sin(k), 360, 20 + ph * 130, 4 + ph * 30, 0, 0, TAU); ctx.stroke(); }
  const gr = ctx.createLinearGradient(-60, 0, 60, 0); gr.addColorStop(0, 'rgba(255,179,71,0)'); gr.addColorStop(.5, rgba(COL.amber, .2 * glowK)); gr.addColorStop(1, 'rgba(255,179,71,0)'); ctx.fillStyle = gr; ctx.fillRect(-60, 340 + Math.sin(t * 1.3) * 3, 120, 5);
  ctx.restore();
  ctx.strokeStyle = wl(.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 356, 160, 44, 0, Math.PI, TAU); ctx.stroke();
  // open hatch lid, standing on its hinge (right of the opening)
  ctx.fillStyle = mix('#040302', '#3a2c1c', glowK); ctx.beginPath(); ctx.ellipse(190, 250, 24, 112, .08, 0, TAU); ctx.fill(); ctx.strokeStyle = wl(.55); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(190, 250, 24, 112, .08, Math.PI * .6, Math.PI * 1.4); ctx.stroke();
  // caged lamp (top)
  ctx.fillStyle = mix('#060504', '#fff0cf', glowK * fl); ctx.beginPath(); ctx.ellipse(0, -398, 22, 16, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = mix('#050403', '#5a4024', glowK); ctx.lineWidth = 3; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(k * 11, -418); ctx.quadraticCurveTo(k * 15, -398, k * 11, -380); } ctx.moveTo(-28, -380); ctx.lineTo(28, -380); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // warm presence behind the bellman, then the bellman himself, then the lamp glow and a warm haze
  const pm = map(bx + 20, by - 130);
  LM.glow(ctx, pm[0], pm[1], 330 * s, COL.amber, .2 * glowK * al(o.bellman == null ? 1 : o.bellman) * a);
  if (al(o.bellman == null ? 1 : o.bellman) > 0) R.bellman = LM.diver(ctx, map(bx, by)[0], map(bx, by)[1], bs, t, bo);
  LM.glow(ctx, R.lamp[0], R.lamp[1], 420 * s, COL.amber, .4 * glowK * fl * a); LM.glow(ctx, R.lamp[0], R.lamp[1], 60 * s, COL.core, .9 * glowK * fl * a);
  ctx.save(); cap0(ctx, x, y, s); ctx.clip(); const vg = ctx.createRadialGradient(x, y - 60 * s, 200 * s, x, y, 560 * s); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(x - 340 * s, y - 500 * s, 680 * s, 1000 * s); ctx.restore();
  return R;
}
function cap0(ctx, x, y, s) { const r = 300 * s; ctx.beginPath(); ctx.moveTo(x - r, y - 150 * s); ctx.arc(x, y - 150 * s, r, Math.PI, TAU); ctx.lineTo(x + r, y + 150 * s); ctx.arc(x, y + 150 * s, r, 0, Math.PI); ctx.closePath(); }

// =====================================================================================================
// LM.ship(ctx, x, y, s, t, o) -> ret: generic dive support vessel at night — NO name, NO logo.
// Side view (default): (x, y) = waterline centre; ~900*s long, bow to the right (o.dir = -1 flips).
//  Deck crane, dive tower over the moon pool (bell wire), forward helideck, bridge windows lit (o.lights 0..1),
//  sodium deck floods; o.roll rad · o.under 0..1 shows the hull below the waterline (seen through the water)
//  o.thrust 0..1 thruster wash arrows (o.thrustSeed) · o.rim faint sky rim
// Top view (o.view = 'top'): (x, y) = hull centre, bow to the right (o.rot rad); same o.thrust arrows
// (they keep correcting = holding station; at thrust 0 they vanish).
// ret: {moonpool [x,y] (where the bell wire leaves the hull), tower, bridge, crane, bow, stern, lights}
// LM.swell(ctx, y, t, amp = 14, o) -> yAt(x): sea surface line (night sky above unless o.sky = false,
//  o.caps 0..1 whitecaps, o.under .5 bright underside of the surface seen from below, o.seed). ctx = null -> yAt.
// =====================================================================================================
LM.ship = function (ctx, x, y, s, t, o = {}) {
  if (o.view === 'top') return shipTop(ctx, x, y, s, t, o);
  const dir = o.dir === -1 ? -1 : 1, roll = o.roll || 0, cr = Math.cos(roll), sr = Math.sin(roll), lit = o.lights == null ? 1 : o.lights, under = o.under || 0, thrust = o.thrust || 0, a = al(o.a);
  const map = (lx, ly) => { const u = lx * dir * s, v = ly * s; return [x + u * cr - v * sr, y + u * sr + v * cr]; };
  const FL = [[-405, -150], [-150, -150], [125, -162]];
  const R = { moonpool: map(20, 66), tower: map(20, -262), bridge: map(280, -184), crane: map(-70, -304), bow: map(452, -100), stern: map(-432, -50), lights: [] };
  for (const [fx, fy] of FL) { const p = map(fx, fy); R.lights.push({ x: p[0], y: p[1], r: 220 * s, color: COL.amber, a: .6 * lit }); }
  if (!ctx || a <= 0) return R;
  ctx.save(); ctx.globalAlpha *= a;
  for (const [fx, fy] of FL) { const p = map(fx, fy + 60); LM.glow(ctx, p[0], p[1], 260 * s, COL.amber, .12 * lit); }   // haze around the deck floods
  ctx.translate(x, y); ctx.rotate(roll); ctx.scale(dir * s, s);
  const hull = COL.hull, sup = '#10181c', rim = o.rim || '#7fa4b2';
  if (under > 0) {
    ctx.fillStyle = rgba('#0a1416', .85 * under); ctx.beginPath(); ctx.moveTo(400, 0); ctx.quadraticCurveTo(436, 26, 412, 54); ctx.quadraticCurveTo(390, 70, 340, 66); ctx.lineTo(-404, 66); ctx.quadraticCurveTo(-430, 60, -428, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba('#05090a', .9 * under);
    for (const px of [-384, -316]) { roundRect(ctx, px - 16, 62, 32, 26, 8); ctx.fill(); ctx.fillRect(px - 4, 56, 8, 10); }
    roundRect(ctx, 122, 62, 30, 24, 8); ctx.fill();
    ctx.strokeStyle = rgba('#1c2a2e', under); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(330, 34, 13, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba('#000000', under); ctx.fillRect(6, 58, 28, 10);
    if (thrust > 0) {
      const TH = [[330, 34, Math.PI], [-384, 92, Math.PI * .5], [-316, 92, Math.PI * .5], [137, 90, Math.PI * .5]];
      TH.forEach(([tx, ty, base], i) => { const ang = base + .9 * nz(t * .45 + i * 3.1, (o.thrustSeed || 1) + i); thrustArrow(ctx, tx, ty, ang, thrust * under, t, i); });
    }
  }
  // superstructure + deck gear (behind the hull line)
  const rect = (x0, y0, x1, y1, c) => { ctx.fillStyle = c; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); };
  ctx.fillStyle = sup; ctx.beginPath(); ctx.moveTo(150, -50); ctx.lineTo(150, -114); ctx.lineTo(352, -114); ctx.lineTo(394, -50); ctx.closePath(); ctx.fill();
  rect(178, -160, 352, -112, sup);
  ctx.beginPath(); ctx.moveTo(198, -160); ctx.lineTo(198, -202); ctx.lineTo(352, -202); ctx.lineTo(370, -160); ctx.closePath(); ctx.fill();
  rect(150, -152, 186, -112, sup);                                                                   // funnel
  ctx.fillStyle = '#0a1012'; ctx.fillRect(296, -216, 178, 8); ctx.strokeStyle = '#0a1012'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(330, -208); ctx.lineTo(372, -116); ctx.moveTo(452, -208); ctx.lineTo(418, -100); ctx.stroke();   // helideck
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(272, -202); ctx.lineTo(272, -270); ctx.moveTo(256, -248); ctx.lineTo(288, -248); ctx.moveTo(250, -228); ctx.lineTo(294, -228); ctx.stroke();   // mast
  rect(-74, -122, 112, -50, sup);                                                                     // dive hangar
  ctx.strokeStyle = '#0d1518'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-6, -122); ctx.lineTo(10, -262); ctx.moveTo(46, -122); ctx.lineTo(30, -262); ctx.stroke();    // tower
  ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k < 6; k++) { const y0 = -122 - k * 23, y1 = y0 - 23; ctx.moveTo(lerp(-6, 10, (k) / 6), y0); ctx.lineTo(lerp(46, 30, (k + 1) / 6), y1); } ctx.stroke();
  ctx.fillStyle = '#0d1518'; ctx.beginPath(); ctx.arc(20, -264, 9, 0, TAU); ctx.fill();
  rect(-278, -118, -244, -50, sup); rect(-292, -134, -238, -116, sup);                              // crane pedestal + cab
  ctx.strokeStyle = '#0d1518'; ctx.lineWidth = 3; ctx.beginPath();
  const b0 = [-258, -128], b1 = [-70, -304], bl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]), nx = -(b1[1] - b0[1]) / bl * 7, ny = (b1[0] - b0[0]) / bl * 7;
  ctx.moveTo(b0[0] + nx, b0[1] + ny); ctx.lineTo(b1[0] + nx, b1[1] + ny); ctx.moveTo(b0[0] - nx, b0[1] - ny); ctx.lineTo(b1[0] - nx, b1[1] - ny);
  for (let k = 0; k < 12; k++) { const u0 = k / 12, u1 = (k + 1) / 12, sgn = k % 2 ? 1 : -1; ctx.moveTo(lerp(b0[0], b1[0], u0) + nx * sgn, lerp(b0[1], b1[1], u0) + ny * sgn); ctx.lineTo(lerp(b0[0], b1[0], u1) - nx * sgn, lerp(b0[1], b1[1], u1) - ny * sgn); }
  ctx.moveTo(-70, -304); ctx.lineTo(-70, -176); ctx.stroke(); ctx.fillStyle = '#0d1518'; ctx.fillRect(-77, -178, 14, 16);
  rect(-404, -84, -334, -50, '#0e1417'); rect(-326, -76, -288, -50, '#0e1417');                    // deck containers
  ctx.lineWidth = 3; ctx.strokeStyle = '#0d1518'; ctx.beginPath(); for (const [fx, fy] of FL) { ctx.moveTo(fx, -50); ctx.lineTo(fx, fy); } ctx.stroke();
  // hull
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-432, -52); ctx.lineTo(262, -52); ctx.quadraticCurveTo(384, -58, 446, -98); ctx.lineTo(454, -102); ctx.quadraticCurveTo(432, -40, 400, 0); ctx.lineTo(-428, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(rim, .22); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-432, -52); ctx.lineTo(262, -52); ctx.quadraticCurveTo(384, -58, 446, -98); ctx.lineTo(454, -102); ctx.stroke();
  ctx.strokeStyle = rgba(rim, .12); ctx.beginPath(); ctx.moveTo(150, -114); ctx.lineTo(352, -114); ctx.moveTo(198, -202); ctx.lineTo(352, -202); ctx.moveTo(-74, -122); ctx.lineTo(112, -122); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-428, -18, 830, 4);
  // lights: bridge windows, accommodation windows, deck floods, nav lights
  if (lit > 0) {
    for (let k = 0; k < 10; k++) { const wx = 212 + k * 14; ctx.fillStyle = rgba('#ffcf86', lit * (.7 + .3 * hi(k * 3 + 1))); ctx.fillRect(wx, -192, 10, 14); }
    for (let r2 = 0; r2 < 2; r2++) for (let k = 0; k < 9; k++) { if (hi(k * 7 + r2 * 31) < .35) continue; ctx.fillStyle = rgba('#ffcf86', .5 * lit * hi(k * 5 + r2)); ctx.fillRect(170 + k * 20, -102 - r2 * 40, 8, 8); }
    for (let k = 0; k < 5; k++) { ctx.fillStyle = rgba('#ffcf86', .45 * lit); ctx.fillRect(-60 + k * 30, -104, 10, 8); }
  }
  ctx.restore();
  if (lit > 0) {
    const bp = map(284, -186); LM.glow(ctx, bp[0], bp[1], 120 * s, COL.amber, .3 * lit);
    for (const [fx, fy] of FL) { const p = map(fx, fy); LM.glow(ctx, p[0], p[1], 46 * s, COL.amber, .9 * lit); LM.glow(ctx, p[0], p[1], 10 * s, '#fff1dc', lit); const q = map(fx, -52); LM.glow(ctx, q[0], q[1], 90 * s, COL.amber, .3 * lit); }
    const mh = map(272, -272); LM.glow(ctx, mh[0], mh[1], 14 * s, '#ffffff', .9); const sl = map(358, -170); LM.glow(ctx, sl[0], sl[1], 12 * s, '#4ade80', .8 * (dir > 0 ? 1 : 0)); const pl = map(358, -170); LM.glow(ctx, pl[0], pl[1], 12 * s, COL.red, .8 * (dir > 0 ? 0 : 1));
  }
  ctx.restore();
  return R;
};
function thrustArrow(ctx, x, y, ang, k, t, i) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let c = 0; c < 4; c++) { const ph = ((t * 1.6 + c / 4 + i * .13) % 1), d = 20 + ph * 120, aa = k * (1 - ph) * Math.min(1, ph * 5);
    ctx.strokeStyle = rgba('#bfe9ff', .8 * aa); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(d - 12, -12); ctx.lineTo(d, 0); ctx.lineTo(d - 12, 12); ctx.stroke(); }
  for (let j = 0; j < 12; j++) { const ph = ((t * .9 + hi(j * 5 + i)) % 1), d = 18 + ph * 150, off = (hi(j * 3 + i) - .5) * 40 * ph; ctx.fillStyle = rgba('#e0f6ff', .45 * k * (1 - ph)); ctx.beginPath(); ctx.arc(d, off, 2 + 3 * hi(j + i), 0, TAU); ctx.fill(); }
  ctx.restore();
}
function shipTop(ctx, x, y, s, t, o) {
  const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), lit = o.lights == null ? 1 : o.lights, thrust = o.thrust || 0, a = al(o.a);
  const map = (lx, ly) => [x + (lx * cr - ly * sr) * s, y + (lx * sr + ly * cr) * s];
  const R = { moonpool: map(20, 0), tower: map(20, 0), bridge: map(270, 0), crane: map(-260, 56), bow: map(450, 0), stern: map(-440, 0), lights: [] };
  for (const [fx, fy] of [[-400, -60], [-150, 70], [120, -70]]) { const p = map(fx, fy); R.lights.push({ x: p[0], y: p[1], r: 200 * s, color: COL.amber, a: .55 * lit }); }
  if (!ctx || a <= 0) return R;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(10, 14, 470, 104, 0, 0, TAU); ctx.fill();
  const hullP = () => { ctx.beginPath(); ctx.moveTo(-440, -86); ctx.lineTo(250, -86); ctx.quadraticCurveTo(400, -80, 452, 0); ctx.quadraticCurveTo(400, 80, 250, 86); ctx.lineTo(-440, 86); ctx.quadraticCurveTo(-452, 0, -440, -86); ctx.closePath(); };
  hullP(); ctx.fillStyle = '#121a1e'; ctx.fill(); ctx.strokeStyle = 'rgba(160,200,210,.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#1a2428'; ctx.fillRect(-420, -70, 560, 140);
  ctx.strokeStyle = 'rgba(160,200,210,.08)'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -400; k < 140; k += 40) { ctx.moveTo(k, -70); ctx.lineTo(k, 70); } ctx.stroke();
  ctx.fillStyle = '#0d1417'; roundRect(ctx, 160, -76, 200, 152, 10); ctx.fill(); ctx.fillStyle = '#152024'; roundRect(ctx, 196, -60, 140, 120, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(200,225,230,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(392, 0, 70, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(392, 0, 52, 0, TAU); ctx.stroke();   // helideck rings (no markings)
  ctx.fillStyle = '#0d1417'; ctx.fillRect(-70, -56, 180, 112);
  ctx.fillStyle = '#020405'; ctx.fillRect(0, -20, 40, 40); ctx.strokeStyle = 'rgba(200,225,230,.4)'; ctx.lineWidth = 3; ctx.strokeRect(-6, -26, 52, 52);   // moon pool + tower
  ctx.fillStyle = '#0d1417'; ctx.beginPath(); ctx.arc(-260, 56, 22, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a363a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-260, 56); ctx.lineTo(-84, 24); ctx.stroke();
  ctx.fillStyle = '#182226'; ctx.fillRect(-404, -60, 70, 30); ctx.fillRect(-404, -24, 70, 30); ctx.fillRect(-326, -60, 40, 30);
  if (lit > 0) for (const [fx, fy] of [[-400, -60], [-150, 70], [120, -70]]) { ctx.fillStyle = rgba('#fff1dc', lit); ctx.beginPath(); ctx.arc(fx, fy, 5, 0, TAU); ctx.fill(); }
  if (thrust > 0) [[330, -60, -Math.PI / 2], [330, 60, Math.PI / 2], [-410, -50, Math.PI], [-410, 50, Math.PI], [140, 0, -Math.PI / 2]].forEach(([tx, ty, base], i) => {
    thrustArrow(ctx, tx, ty, base + .8 * nz(t * .45 + i * 3.1, (o.thrustSeed || 1) + i), thrust, t, i); ctx.fillStyle = rgba('#bfe9ff', .7 * thrust); ctx.beginPath(); ctx.arc(tx, ty, 7, 0, TAU); ctx.fill(); });
  ctx.restore();
  if (lit > 0) { for (const L2 of R.lights) LM.glow(ctx, L2.x, L2.y, 120 * s, COL.amber, .35 * lit * a); const bp = R.bridge; LM.glow(ctx, bp[0], bp[1], 140 * s, COL.amber, .18 * lit * a); }
  ctx.restore();
  return R;
}
LM.swell = function (ctx, y, t, amp = 14, o = {}) {
  const seed = o.seed || 1, yAt = x => y + amp * (.55 * Math.sin(x * .0062 + t * .95 + seed) + .3 * Math.sin(x * .0153 - t * 1.37 + seed * 2) + .15 * Math.sin(x * .041 + t * 2.3 + seed));
  if (!ctx) return yAt;
  const pts = []; for (let xx = -40; xx <= W + 40; xx += 12) pts.push([xx, yAt(xx)]);
  ctx.save();
  if (o.sky !== false) {
    ctx.beginPath(); ctx.moveTo(-40, -80); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W + 40, -80); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 700, 0, y); g.addColorStop(0, '#020405'); g.addColorStop(1, '#0a1416'); ctx.fillStyle = g; ctx.fill();
  }
  const ua = o.under == null ? .5 : o.under;
  if (ua > 0) { const g2 = ctx.createLinearGradient(0, y - amp, 0, y + 90); g2.addColorStop(0, rgba('#6fb8c2', .2 * ua)); g2.addColorStop(1, 'rgba(111,184,194,0)'); ctx.fillStyle = g2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.lineTo(W + 40, y + 90); ctx.lineTo(-40, y + 90); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = rgba(o.color || '#9fd0d8', al(o.a) * .5); ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  const caps = o.caps || 0;
  if (caps > 0) for (let i = 0; i < 26; i++) {
    const xx = ((hi(i * 7 + seed) * (W + 300) + t * (30 + 40 * hi(i))) % (W + 300)) - 150, ph = (t * .5 + hi(i * 3)) % 1, aa = caps * Math.sin(ph * Math.PI);
    const yy = yAt(xx); ctx.strokeStyle = rgba('#e8f6ff', .55 * aa); ctx.lineWidth = 2 + 2 * hi(i * 5); ctx.beginPath(); ctx.moveTo(xx - 14 - 20 * hi(i), yy - 1); ctx.quadraticCurveTo(xx, yy - 5, xx + 12, yy); ctx.stroke();
  }
  ctx.restore();
  return yAt;
};

// =====================================================================================================
// LM.gasClock(ctx, x, y, r, frac, t, o) -> {head [x,y], frac}: THE SPINE MOTIF. A thin ring that drains
// clockwise (the empty sweep starts at 12 o'clock and moves clockwise; frac 1 = full, 0 = empty). No numbers.
//  o.a alpha · o.w 4 line width · o.color amber -> o.lowColor red as it empties · flickers below ~30%
//  o.bpm (pulses with the heartbeat) · o.ticks 0..1 faint 60-tick track · o.track colour of the faint ring
// =====================================================================================================
LM.gasClock = function (ctx, x, y, r, frac, t, o = {}) {
  frac = clamp(frac); const a = al(o.a), a0 = -Math.PI / 2 + (1 - frac) * TAU, a1 = Math.PI * 1.5, head = [x + Math.cos(a0) * r, y + Math.sin(a0) * r];
  if (!ctx || a <= 0) return { head, frac };
  const low = clamp((.3 - frac) / .3), w = o.w || 4;
  const flick = low > 0 ? clamp(1 - low * .5 * (.5 + .5 * nz(t * 15, 17)) - (hi(Math.floor(t * 20) + 77) > .86 ? low * .45 : 0)) : 1;
  const col = mix(o.color || COL.amber, o.lowColor || COL.red, low * .9), pulse = o.bpm ? .85 + .15 * PK.beat(t, o.bpm) : 1, A = a * flick * pulse;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(o.track || '#9fc6cf', .13 * a); ctx.lineWidth = Math.max(1, w * .45); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (o.ticks > 0) { ctx.strokeStyle = rgba(o.track || '#9fc6cf', .14 * a * o.ticks); ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 60; k++) { const q = k / 60 * TAU, l = k % 5 ? 5 : 10; ctx.moveTo(x + Math.cos(q) * (r + 8), y + Math.sin(q) * (r + 8)); ctx.lineTo(x + Math.cos(q) * (r + 8 + l), y + Math.sin(q) * (r + 8 + l)); } ctx.stroke(); }
  if (frac > .0005) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [lw, aa] of [[w * 7, .07], [w * 3.2, .16]]) { ctx.strokeStyle = rgba(col, aa * A); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(col, .95 * A); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
    ctx.strokeStyle = rgba('#fff3e0', .45 * A); ctx.lineWidth = Math.max(1, w * .32); ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
    ctx.restore();
    LM.glow(ctx, head[0], head[1], w * 9, col, .55 * A); LM.glow(ctx, head[0], head[1], w * 2.2, '#ffffff', .9 * A);
  } else ctx.restore();
  return { head, frac };
};

// =====================================================================================================
// LM.alarm(ctx, x, y, t, o) -> intensity 0..1: small rotating/blinking beacon (x, y = base centre).
//  o.on 0..1 (0 = dark lamp) · o.color alarm amber (or COL.red) · o.rate 1.4 Hz · o.mode 'rotate' | 'blink'
//  o.s scale · o.phase · o.beams 1 (rotating light sweeps) — ctx = null returns the intensity only
// =====================================================================================================
LM.alarm = function (ctx, x, y, t, o = {}) {
  const s = o.s || 1, col = o.color || COL.alarm, on = o.on == null ? 1 : o.on, ph = ((t * (o.rate || 1.4) + (o.phase || 0)) % 1 + 1) % 1, rot = (o.mode || 'rotate') === 'rotate';
  const I = on * (rot ? Math.pow(.5 + .5 * Math.cos(ph * TAU), 2) * .85 + .15 : (ph < .5 ? 1 : .06));
  if (!ctx) return I;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#121618'; roundRect(ctx, -32, 0, 64, 18, 4); ctx.fill(); ctx.fillStyle = '#2b3438'; ctx.fillRect(-32, 0, 64, 3);
  ctx.beginPath(); ctx.moveTo(-23, 1); ctx.bezierCurveTo(-23, -44, 23, -44, 23, 1); ctx.closePath();
  const g = ctx.createLinearGradient(-23, 0, 23, 0), dk = mix('#0a0807', col, .18 + .25 * on);
  g.addColorStop(0, mix(dk, col, .4 * I)); g.addColorStop(.5 + .35 * (rot ? Math.sin(ph * TAU) : 0), mix(col, '#fff6e0', .55 * I)); g.addColorStop(1, mix(dk, col, .35 * I)); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-4, -16, 14, 3.4, 4.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.beginPath(); for (const yy of [-10, -22]) { ctx.moveTo(-21, yy); ctx.lineTo(21, yy); } ctx.stroke();
  ctx.restore();
  if (I > .02) {
    const cy = y - 18 * s; LM.glow(ctx, x, cy, 170 * s, col, .32 * I); LM.glow(ctx, x, cy, 44 * s, '#fff2d0', .55 * I);
    if (rot && (o.beams == null ? 1 : o.beams) > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, cy); ctx.scale(1, .22);
      for (const sg of [0, Math.PI]) { const q = ph * TAU + sg, vis = Math.max(0, Math.cos(q)); if (vis <= .02) continue; const L0 = 560 * s, dx = Math.sin(q) > 0 ? 1 : -1;
        const gg = ctx.createLinearGradient(0, 0, dx * L0, 0); gg.addColorStop(0, rgba(col, .28 * on * vis)); gg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(0, -10 * s); ctx.lineTo(dx * L0, -150 * s); ctx.lineTo(dx * L0, 150 * s); ctx.lineTo(0, 10 * s); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
  }
  return I;
};

// =====================================================================================================
// LM.rovFeed(ctx, x, y, w, h, t, o) -> {target [x,y]}: abstract ROV monitor (x, y = top-left of the
// screen area; a bezel is drawn around it). Dark water, scanlines, interference, two ROV light cones
// finding a small still shape lying on a beam — no detail, no face.
//  o.on 0..1 (CRT power-on) · o.lock 0..1 amber corner brackets close in on the shape · o.found 0..1 (cones
//  swing onto the shape) · o.tx/o.ty target position (fractions, .55/.62) · o.life 0..1 faint amber ember
//  in the shape (default 0) · o.label 'ROV' · o.seed
// =====================================================================================================
let _scan = null;
function scanTex() { if (_scan) return _scan; const c = cv(8, 4), x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, 8, 2); return (_scan = c); }
LM.rovFeed = function (ctx, x, y, w, h, t, o = {}) {
  const tx = x + w * (o.tx == null ? .55 : o.tx), ty = y + h * (o.ty == null ? .62 : o.ty), R = { target: [tx, ty] };
  const on = o.on == null ? 1 : o.on; if (!ctx) return R;
  const found = o.found == null ? 1 : o.found, lock = o.lock || 0, seed = o.seed || 4, f = Math.floor(t * 30);
  ctx.save();
  ctx.fillStyle = '#0a0e10'; roundRect(ctx, x - 14, y - 14, w + 28, h + 28, 14); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,210,.22)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#010202'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
  if (on <= 0) { ctx.restore(); return R; }
  roundRect(ctx, x, y, w, h, 6); ctx.clip();
  const op = E.outExpo(clamp(on * 1.05)); ctx.translate(x + w / 2, y + h / 2); ctx.scale(lerp(.6, 1, op), lerp(.008, 1, op)); ctx.translate(-(x + w / 2), -(y + h / 2));
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0b2226'); g.addColorStop(1, '#030909'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .5; ctx.drawImage(murkTex(), x - 40 + Math.sin(t * .2) * 20, y - 60, w + 80, h * 2.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // two light cones from the ROV (top corners) toward the target
  ctx.globalCompositeOperation = 'lighter';
  for (const sx of [-1, 1]) {
    const ox = x + w * (.5 + sx * .42), oy = y - 10, aim = lerp(Math.PI / 2 + sx * .5, Math.atan2(ty - oy, tx - ox), found), len = h * 1.25;
    const gc = ctx.createRadialGradient(ox, oy, 0, ox, oy, len); gc.addColorStop(0, rgba('#d8f0ff', .32)); gc.addColorStop(1, 'rgba(216,240,255,0)'); ctx.fillStyle = gc;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, aim - .2, aim + .2); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // the beam (top of the structure) + the still shape on it
  const bw = w * .9, by = ty + h * .07;
  ctx.fillStyle = '#26343a'; ctx.fillRect(tx - bw / 2, by, bw, h * .05); ctx.fillStyle = 'rgba(200,230,240,.35)'; ctx.fillRect(tx - bw / 2, by, bw, 2);
  ctx.fillStyle = '#1a2428'; for (const k of [-.36, 0, .36]) ctx.fillRect(tx + k * bw - 5, by + h * .05, 10, h * .3);
  const sw2 = w * .13, sh = h * .07; ctx.fillStyle = '#0b1215'; ctx.beginPath(); ctx.ellipse(tx, by - sh * .6, sw2, sh * .75, 0, Math.PI, TAU); ctx.lineTo(tx + sw2, by); ctx.lineTo(tx - sw2, by); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(tx + sw2 * .85, by - sh * .55, sh * .62, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#d8f0ff', .45 * found); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tx, by - sh * .6, sw2, sh * .75, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
  if (o.life > 0) LM.glow(ctx, tx - sw2 * .1, by - sh * .5, sh * 1.4, COL.amber, .5 * o.life);
  // silt in the cones, interference
  for (let i = 0; i < 40; i++) { const px = x + hi(i * 3 + seed) * w + Math.sin(t * .6 + i) * 6, py = y + ((hi(i * 5 + seed) * h + t * 10 * (.5 + hi(i))) % h); ctx.fillStyle = rgba('#d8f0ff', .25 + .3 * hi(i * 7)); ctx.fillRect(px, py, 2, 2); }
  for (let i = 0; i < 6; i++) { if (hi(f * 7 + i) > .55) continue; ctx.fillStyle = rgba('#d8f0ff', .06 + .08 * hi(f + i * 3)); ctx.fillRect(x, y + hi(f * 13 + i) * h, w, 1 + 3 * hi(f * 3 + i)); }
  const rb = ((t * .35) % 1) * (h + 120) - 60; const grb = ctx.createLinearGradient(0, y + rb - 40, 0, y + rb + 40); grb.addColorStop(0, 'rgba(200,240,255,0)'); grb.addColorStop(.5, 'rgba(200,240,255,.06)'); grb.addColorStop(1, 'rgba(200,240,255,0)'); ctx.fillStyle = grb; ctx.fillRect(x, y + rb - 40, w, 80);
  const pat = ctx.createPattern(scanTex(), 'repeat'); ctx.fillStyle = pat; ctx.fillRect(x, y, w, h);
  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * .3, x + w / 2, y + h / 2, Math.max(w, h) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
  // lock brackets + label + rec dot
  if (lock > 0) {
    const e = E.outC(clamp(lock)), bx2 = lerp(w * .45, w * .2, e), byy = lerp(h * .4, h * .16, e), L0 = Math.min(w, h) * .07;
    ctx.strokeStyle = rgba(COL.amber, .9 * clamp(lock * 3)); ctx.lineWidth = 3; ctx.beginPath();
    for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = tx + sx2 * bx2, cy = by - sh * .5 + sy2 * byy; ctx.moveTo(cx - sx2 * L0, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy - sy2 * L0); }
    ctx.stroke();
  }
  text(ctx, o.label || 'ROV', x + 18, y + 26, { size: Math.max(16, h * .07), weight: 800, color: 'rgba(216,240,255,.75)', align: 'left' });
  if (Math.sin(t * 6) > 0) { ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(x + w - 22, y + 24, 6, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .08 * on; ctx.fillStyle = '#9fe0ff'; ctx.fillRect(x - 14, y - 14, w + 28, h + 28); ctx.restore();
  return R;
};
})();

// cover (render.cjs --cover): its own strong hook frame (the lattice in darkness, the taut umbilical parting under
// the transponder bucket with a white flash, the diver's amber life-light and the gas clock) under the big title
window.COVER = function (ctx, TL) {
  const LM = window.PK.LM, COL = LM.COL, t = 3.2, cut = { at: 3.12, frac: .3 };
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const SX = 400, SY = 1225, SS = 1.24;
  const st = LM.structure(null, SX, SY, SS, t);
  const DO = { pose: 'crouch', dir: -1, anchor: 'base', life: 1, bpm: 96, adj: { T: .7, h: .1 }, rim: '#9fd8ff', light: [1080, 420], halo: .28 };
  const dv = LM.diver(null, 560, st.topY + 6, .64, t, DO);
  const pts = [[1180, 250], [st.hook[0] + 4, st.hook[1] + 9], [dv.umb[0] + 70, dv.umb[1] + 40], dv.umb];
  const UO = { tension: 1, w: 15, lit: .45, cut };
  const um = LM.umbilical(null, pts, t, UO);
  const lights = dv.lights.concat([LM.light(um.cut[0], um.cut[1], 560, COL.lamp, .85 * um.flash + .25), LM.light(st.hook[0], st.hook[1], 240, COL.amber, .2)]);
  LM.sea(ctx, t, { dark: .55, lights, seed: 5, haze: .8 });
  LM.seabed(ctx, SY - 6, t, { dark: .55, lights });
  LM.structure(ctx, SX, SY, SS, t, { lights, amb: .06 });
  LM.umbilical(ctx, pts, t, UO);
  LM.diver(ctx, 560, st.topY + 6, .64, t, DO);
  LM.gasClock(ctx, dv.chest[0], dv.chest[1], 150, .78, t, { w: 4.5 });
  L.flash(ctx, .06 * um.flash, '#e8f6ff');
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(.22, 'rgba(0,0,0,.18)'); g.addColorStop(.58, 'rgba(0,0,0,.05)'); g.addColorStop(.68, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,.92)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  grain(ctx, 3.2, .08, 30); vignette(ctx, .5);
  chip(ctx, '실화 · 2012 북해 · 수심 약 90m', 540, 300, 1, { size: 36, color: '#cfe8ff', border: 'rgba(150,210,255,.5)' });
  text(ctx, '북해 바닥, 끊어진', 540, 1290, { size: 92, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 16 });
  text(ctx, '생명줄', 540, 1420, { size: 160, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 18 });
  text(ctx, '남은 숨은 단 몇 분', 540, 1550, { size: 92, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 16 });
};
window.PROJECT = {
  scenes: window.PK.scenes,
  // warm up lazily-built textures/sprites once so the first frame of each scene is not a slow outlier
  init(TL) {
    const [, x] = L.buf('warm');
    for (const sc of TL.scenes) {
      const fn = window.PK.scenes[sc.id]; if (!fn) continue;
      try { x.save(); fn(x, (sc.t1 - sc.t0) / 2, sc.t1 - sc.t0, { T: (sc.t0 + sc.t1) / 2, sc, TL }); } catch (e) { console.error('warm-up', sc.id, e.message); } finally { x.restore(); }
    }
  },
  post(ctx, T0, TL) {
    const bg = ctx.createLinearGradient(0, 1150, 0, 1920); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = bg; ctx.fillRect(0, 1150, W, 770);
    grain(ctx, T0, .08, 30); dust(ctx, T0, .25); vignette(ctx, .55);
    const mem = TL.scenes.find(s => s.id === 'memoriam' || s.id === 'memorial');
    if (!window.COVER_MODE) {
      const ta = mem ? 1 - P(T0, mem.t0 - .35, mem.t0 + .35, E.inOutQ) : 1;
      topTitle(ctx, TL, ta, 1);
      if (!mem || T0 < mem.t0 - .1) subtitles(ctx, T0, TL.subs, { y: 1345, size: 74 });  // memoriam shows the names itself
    }
    else if (window.COVER) window.COVER(ctx, TL);
  },
};
})();
