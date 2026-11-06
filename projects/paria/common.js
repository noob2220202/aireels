// Paria pipeline tragedy (Trinidad & Tobago, 25 Feb 2022) — shared drawing kit (underwater noir).
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
function topTitle(ctx, TL) {
  const g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.62, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 560);
  text(ctx, TL.title.l1, 540, 282, { size: 76, family: FONT.disp, weight: 400, color: '#fff', stroke: '#000', strokeW: 12 });
  text(ctx, TL.title.l2, 540, 380, { size: 76, family: FONT.disp, weight: 400, color: C.yellow, stroke: '#000', strokeW: 12 });
}
Object.assign(window.PK, { K, at, water, shafts, bubbles, silt, pipeSide, pipeInside, diver, chip, sourceCard, waveBars, topTitle, lerp2 });

window.PROJECT = {
  scenes: window.PK.scenes,
  post(ctx, T0, TL) {
    const bg = ctx.createLinearGradient(0, 1150, 0, 1920); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = bg; ctx.fillRect(0, 1150, W, 770);
    grain(ctx, T0, .08); dust(ctx, T0, .25); vignette(ctx, .55);
    if (!window.COVER_MODE) { topTitle(ctx, TL); subtitles(ctx, T0, TL.subs, { y: 1345, size: 74 }); }
    else if (window.COVER) window.COVER(ctx, TL);
  },
};
})();
