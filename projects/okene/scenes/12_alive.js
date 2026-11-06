// alive (clip, DCN helmet-cam radio): "He's alive! He's alive! Okay, keep him there, keep him there."
// Hard cut from the hand scene's locked grip: the first frame is that exact shot (same poses, beam, camera, drift), then a
// burst of radio static tears it and it pulls back into a generic surface monitor in a dark room (no real footage: it is our
// own drawn feed, with scanlines, a rolling bar and glass). Below it, a radio panel's waveform scrolls with the real voice.
// "He's alive!" x2 -> the waveform jumps, and a warm flash of his light blooms in the feed and spills out of the monitor into
// the room (a small kick of the camera each time). "Okay, keep him there, keep him there." -> calmer: his warm glow stays up,
// the glove's grip tightens a little on each "keep", the room pushes slowly into the monitor. The last 0.3 s tears again
// (static) for the cut into the name exchange. Attribution card up while the voice plays; its red dot rings with the voice.
//
// This file also holds the small kit shared by alive / name / home / chamber (window.PK.RV).
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, flash, roundRect } = L;
const PK = window.PK;
const RV = PK.RV = PK.RV || {};

// ---------- shared kit ----------
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };
Object.assign(RV, { hi, nz, fb });
// loudness envelope of a clip (30 fps RMS, 0-99) -> 0..1 at clip time tc
RV.env = arr => tc => { const f = tc * 30, i = Math.floor(f); if (i < 0 || i >= arr.length - 1) return 0; return lerp(arr[i], arr[i + 1], f - i) / 99; };
// attribution card + a ring on its red dot that answers the voice
RV.card = function (ctx, t, d, D, lv) {
  const ca = P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
  if (ca > 0 && lv > .05) { ctx.save(); ctx.strokeStyle = rgba('#ff6a6f', ca * .55 * clamp(lv)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(540 - 380 + 34, 1185, 13 + 10 * clamp(lv), 0, 7); ctx.stroke(); ctx.restore(); }
};
// low-frequency shake (max ~8 px per frame at k = .45)
RV.shake = (t, k, seed = 1) => [k * (nz(t * 6, seed) * 16 + nz(t * 17, seed + 5) * 2), k * (nz(t * 6, seed + 2) * 16 + nz(t * 17, seed + 7) * 2), k * nz(t * 4, seed + 3) * .007];
// radio static: horizontal tears (copies of the frame shifted), bright scan lines and grain inside rect [x, y, w, h]
RV.tears = function (ctx, t, amt, x0 = 0, y0 = 0, w = W, h = H) {
  if (amt <= .01) return;
  const f = Math.floor(t * 30), cv = ctx.canvas;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  const n = Math.round(3 + 9 * amt);
  for (let i = 0; i < n; i++) {
    const y = y0 + hi(f * 31 + i) * h, hh = 4 + hi(f * 17 + i) * 46 * amt, off = (hi(f * 7 + i) - .5) * 120 * amt;
    ctx.drawImage(cv, x0, y, w, hh, x0 + off, y, w, hh);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const y = y0 + hi(f * 13 + i + 400) * h; ctx.fillStyle = rgba('#cfeaff', .18 * amt * hi(f + i * 3)); ctx.fillRect(x0, y, w, 1 + 2 * hi(i + f * 5)); }
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .55 * amt;
  const ng = L.TEX.grain.length, g = L.TEX.grain[((f % ng) + ng) % ng], pat = ctx.createPattern(g, 'repeat'); pat.setTransform(new DOMMatrix().translate(-hi(f) * 512, -hi(f + 9) * 512).scale(1.6, .5));
  ctx.fillStyle = pat; ctx.fillRect(x0, y0, w, h);
  ctx.restore();
};
// faceless commercial-diving helmet in profile (facing +x), rotated by ang; neutral dark fill with rim light from (rx, ry).
// returns the lamp position (world) and its facing angle.
function helmetPath() {
  if (RV._hp) return RV._hp;
  const p = new Path2D();
  p.ellipse(0, 0, 58, 62, 0, 0, 7);
  p.roundRect(26, -36, 46, 78, 18);                 // front port frame
  p.roundRect(4, 18, 40, 36, 8);                    // side block
  p.moveTo(-54, 34); p.quadraticCurveTo(0, 58, 52, 40); p.lineTo(46, 80); p.lineTo(-50, 80); p.closePath();   // neck dam / collar
  p.roundRect(10, -78, 46, 22, 7);                  // lamp housing on top-front
  p.roundRect(-30, -74, 30, 16, 6);                 // second housing (camera)
  const port = new Path2D(); port.roundRect(34, -26, 32, 58, 14);
  const sh = new Path2D(); sh.moveTo(-36, 72); sh.quadraticCurveTo(-92, 82, -102, 136); sh.lineTo(-104, 180); sh.lineTo(92, 180); sh.lineTo(90, 136); sh.quadraticCurveTo(80, 86, 34, 74); sh.closePath();
  RV._hp = { p, port, sh }; return RV._hp;
}
RV.helmet = function (ctx, x, y, s, { ang = 0, body = null, rx = x + 400, ry = y + 200, rim = '#ffb36b', rimA = .5, cold = .25, a = 1, t = 0 } = {}) {
  if (a <= 0) return null;
  const { p, port, sh } = helmetPath();
  const ldir = A => { let lx = rx - x, ly = ry - y; const c = Math.cos(-A), sn = Math.sin(-A); [lx, ly] = [lx * c - ly * sn, lx * sn + ly * c]; const ll = Math.hypot(lx, ly) || 1; return [lx / ll, ly / ll]; };
  // shoulders: they stay below the helmet (the body turns much less than the head)
  { const bA = body == null ? ang * .3 : body, [lx, ly] = ldir(bA);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(bA); ctx.scale(s, s);
    const sg = ctx.createLinearGradient(0, 70, 0, 180); sg.addColorStop(0, '#05080a'); sg.addColorStop(.45, 'rgba(5,8,10,.7)'); sg.addColorStop(1, 'rgba(5,8,10,0)');
    ctx.save(); ctx.translate(lx * 3, ly * 3); const rg = ctx.createLinearGradient(0, 80, 0, 190); rg.addColorStop(0, rgba(rim, rimA * .55)); rg.addColorStop(1, rgba(rim, 0)); ctx.fillStyle = rg; ctx.fill(sh); ctx.restore();
    ctx.fillStyle = sg; ctx.fill(sh); ctx.restore(); }
  const [lx, ly] = ldir(ang);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  // rim (warm, from his light) + a cold edge on the top from the lamp's own spill
  ctx.save(); ctx.translate(lx * 4, ly * 4); ctx.fillStyle = rgba(rim, rimA); ctx.fill(p); ctx.restore();
  ctx.save(); ctx.translate(0, -3); ctx.fillStyle = rgba('#cfeaff', cold); ctx.fill(p); ctx.restore();
  const hg = ctx.createLinearGradient(-60, -60, 60, 70); hg.addColorStop(0, '#1c262c'); hg.addColorStop(.5, '#0b1114'); hg.addColorStop(1, '#040607');
  ctx.fillStyle = hg; ctx.fill(p);
  // faceplate: black glass, only reflections (no face)
  ctx.fillStyle = '#010203'; ctx.fill(port);
  ctx.save(); ctx.clip(port);
  ctx.strokeStyle = rgba('#cfeaff', .22 + .1 * Math.sin(t * .7)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, -18); ctx.quadraticCurveTo(44, -24, 54, -22); ctx.stroke();
  ctx.fillStyle = rgba(rim, rimA * .5); ctx.beginPath(); ctx.ellipse(58, 18, 6, 10, .3, 0, 7); ctx.fill();
  ctx.restore();
  // seams
  ctx.strokeStyle = 'rgba(160,190,205,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 44, -2.4, .9); ctx.stroke();
  ctx.restore();
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return { x: x + (58 * ca - (-67) * sa) * s, y: y + (58 * sa + (-67) * ca) * s, ang };
};
// scanline pattern
function scanTex() {
  if (RV._scan) return RV._scan;
  const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 2, 4, 2); x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(0, 0, 4, 1);
  RV._scan = c; return c;
}
RV.scanTex = scanTex;

// ---------- this scene ----------
// loudness of the clip (30 fps RMS of the real audio from voice start, 0-99)
const RMS = [59, 76, 59, 64, 77, 78, 93, 94, 76, 69, 63, 81, 67, 70, 78, 87, 89, 95, 89, 88, 81, 84, 83, 47, 28, 42, 40, 18, 10, 6, 16, 40, 12, 37, 80, 91, 90, 97, 99, 67, 36, 37, 39, 26, 9, 27, 18, 3, 20, 53, 47, 53, 42, 45, 54, 65, 56, 43, 23, 27, 32, 20, 3, 1, 1, 7, 23, 11, 1, 7, 34, 26, 17, 3, 19, 13, 7, 3, 3, 8, 8, 12, 4, 6, 5, 19, 29, 7, 9, 16, 22, 28, 21, 13, 9, 14, 12, 8, 12, 11, 6, 6, 8, 26, 14, 7, 10, 17, 19, 17, 13, 10, 10, 8, 6, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0];
const loud = RV.env(RMS);
// word onsets in the clip (seconds from voice start; Whisper word timestamps of the real audio)
const WD = { hes: .14, alive: .54, hes2: .90, alive2: 1.10, end2: 1.46, okay: 2.0, keep: 2.6, there: 3.06, keep2: 3.2, there2: 3.66, end: 3.94 };

// monitor geometry: p = 0 -> the feed fills the frame (the hand scene's shot), 1 -> a 16:9 monitor in the room
const MON = { cx: 540, cy: 736, hw: 430, hh: 242 };
function mon(p) {
  const e = p;
  return { cx: MON.cx, cy: lerp(860, MON.cy, e), hw: lerp(600, MON.hw, e), hh: lerp(1040, MON.hh, e), k: lerp(1, MON.hw * 2 / W, e), r: lerp(0, 18, e) };
}
// the hand scene's final state, continued (th = time on the hand scene's clock)
function handInfo(info) {
  let dH = 6.726, tI = 5.035;
  const hs = info.TL && info.TL.scenes ? info.TL.scenes.find(s => s.id === 'hand') : null;
  if (hs) { dH = hs.t1 - hs.t0; const w = (hs.words || []).find(o => o.w.includes('붙잡았습니다')); if (w) tI = w.t - hs.t0; }
  return { dH, tI };
}
function feed(ctx, th, tI, dH, o) {
  const HG = PK.HG, { S, LAMP, G0 } = HG, { nz: hz, fb: hf } = HG;
  const tm = tI + (th - tI - .2) * .55;
  const z = 1.47 * lerp(1, 1.05, P(th, tI, dH + .3, E.inOutQ)) * (1 + o.push);
  const dr = { x: hf(th * .35, 41) * 14, y: hf(th * .3, 50) * 14, r: hf(th * .25, 45) * .006 };
  const [sx, sy, sr] = HG.shake(th, .04 + o.kick, 5);
  HG.cam(ctx, 478, 900, z, dr.r + sr, sx + dr.x, sy + dr.y);
  const aim = .58 + hf(tm * .5, 61) * .03 - .018 + o.kick * .05 * hz(th * 9, 64);
  const b = { x: LAMP.x + hf(th * .3, 62) * 8, y: LAMP.y + hf(th * .4, 60) * 9, ang: aim, spread: .3, len: 1180, a: 1 - .05 * (.5 + .5 * hz(th * 11, 63)) };
  HG._bg = { t: th, k: .55, seed: 3, base: '#010203' };          // the oily dark under the wall, as in the hand scene
  HG.wall(ctx, b, { amb: .06, gain: 1.15 });
  const bt = PK.beat(th, o.bpm);
  const gu = .45 * .9 - .6 - .55 * o.keep, ga = G0.ang + .05 * .45 - .02 * o.keep;
  const g = { x: G0.x + Math.cos(ga) * gu * S - Math.sin(ga) * .45 * 9, y: G0.y + Math.sin(ga) * gu * S + Math.cos(ga) * .45 * 14, ang: ga, sp: .3 + .15 * hf(tm * 1.1, 70), cg: .38 + .12 * hf(tm * .9, 71) + .16 * o.grip, wig: 0, t: tm };
  const lock = HG.gripPose(g);
  const h = { x: lock.x, y: lock.y, ang: lock.ang, open: 1, curl: 1, vis: 1 };
  const hx = lock.x + 40, hy = lock.y + 40;
  HG.light(ctx, x => { HG.heart(x, hx, hy, o.glowA, bt, o.glowR); HG.cone(x, th, b); });
  HG.silt(ctx, tm, b, { n: 190, seed: 3, push: { x: G0.x + 60, y: G0.y + 40, k: P(th, tI, tI + 1.4, E.outQ) * .5 } });
  HG.hands(ctx, { g, h, b, bareRim: 1.15 + .3 * Math.exp(-Math.max(0, th - tI) * 4) + .35 * o.warm, bareHalo: .5 + .3 * o.warm, gloveHalo: .12 });
  const vx = g.x - Math.cos(g.ang) * 15 * S, vy = g.y - Math.sin(g.ang) * 15 * S - 5.6 * S;
  HG.bubbles(ctx, th, -1.5, { x: vx, y: vy, n: 10, seed: 4, b, spread: 26, rise: 330, drift: 30, life: 2.6, a: .55, size: .8 });
  HG.bubbles(ctx, th, tI + .05, { x: vx + 40, y: vy, n: 38, seed: 19, b, spread: 90, rise: 520, drift: 60, life: 1.7, size: 1.3 });
  for (const tf of o.bursts) HG.bubbles(ctx, th, tf, { x: vx + 30, y: vy, n: 22, seed: 50 + Math.round(tf * 10), b, spread: 70, rise: 420, drift: 50, life: 1.5, size: 1.1 });
  return { bt, b, tm, M: ctx.getTransform(), heart: ctx.getTransform().transformPoint(new DOMPoint(hx, hy)) };
}
// the monitor's glass: cold tint, scanlines, vignette, reflection (one cached layer at the final screen size)
let FX = null;
function screenFX() {
  if (FX) return FX;
  const w = MON.hw * 2, h = MON.hh * 2, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = 'rgba(20,70,84,.14)'; x.fillRect(0, 0, w, h);
  x.globalAlpha = .55; x.fillStyle = x.createPattern(scanTex(), 'repeat'); x.fillRect(0, 0, w, h); x.globalAlpha = 1;
  const vg = x.createRadialGradient(w / 2, h / 2, h * .45, w / 2, h / 2, w * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)');
  x.fillStyle = vg; x.fillRect(0, 0, w, h);
  const gl = x.createLinearGradient(0, 0, w * .6, h); gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(.45, 'rgba(255,255,255,.015)'); gl.addColorStop(.46, 'rgba(255,255,255,0)');
  x.fillStyle = gl; x.fillRect(0, 0, w, h);
  FX = c; return c;
}
// radio panel with a scrolling waveform of the real voice
function radio(ctx, t, tc, a, hot) {
  if (a <= 0) return;
  const x0 = 136, x1 = 944, y0 = 1016, y1 = 1104, cy = (y0 + y1) / 2;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = '#080c0e'; roundRect(ctx, x0, y0, x1 - x0, y1 - y0, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,215,.16)'; ctx.lineWidth = 2; ctx.stroke();
  const dx0 = x0 + 16, dx1 = x1 - 16, dy0 = y0 + 12, dy1 = y1 - 12;
  const dg = ctx.createLinearGradient(0, dy0, 0, dy1); dg.addColorStop(0, '#04161b'); dg.addColorStop(1, '#020a0d');
  ctx.fillStyle = dg; roundRect(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, 8); ctx.fill();
  ctx.save(); roundRect(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, 8); ctx.clip();
  ctx.fillStyle = rgba('#7fd6ff', .05 + .12 * hot); ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.strokeStyle = 'rgba(127,214,255,.08)'; ctx.lineWidth = 1;
  for (let x = dx0 + 40; x < dx1; x += 40) { ctx.beginPath(); ctx.moveTo(x, dy0); ctx.lineTo(x, dy1); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(dx0, cy); ctx.lineTo(dx1, cy); ctx.stroke();
  // bars: history of the last 2.4 s, the newest at the right edge
  const span = 2.4, bw = 6, n = Math.floor((dx1 - dx0) / bw), dtb = span / n, jNow = Math.floor(tc / dtb), amp = (dy1 - dy0) / 2 - 4;
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n + 1; k++) {
    const j = jNow - k, tb = j * dtb, x = dx1 - 10 - (tc - tb) / span * (dx1 - dx0 - 10); if (x < dx0) break;
    const lv = loud(tb), stat = tb < .32 ? .25 * hi(j * 3 + 7) * (1 - tb / .32) : 0;
    const v = clamp(lv * (.55 + .45 * hi(j * 13 + 1)) + stat + .02 * hi(j * 5), 0, 1.25), bh = amp * v;
    const age = (tc - tb) / span;
    ctx.fillStyle = rgba(v > .75 ? '#eaf8ff' : '#7fd6ff', (.85 - .55 * age) * (.4 + .6 * clamp(v * 2)));
    ctx.fillRect(x - bw * .3, cy - bh, bw * .6, bh * 2);
  }
  // the 'now' head
  const lvn = loud(tc); glow(ctx, dx1 - 10, cy, 60 + 60 * lvn, '#bfe9ff', .25 + .5 * lvn);
  ctx.restore();
  // glass reflection
  const rg = ctx.createLinearGradient(0, dy0, 0, cy); rg.addColorStop(0, 'rgba(255,255,255,.05)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(dx0, dy0, dx1 - dx0, cy - dy0);
  // two small indicator LEDs (no text)
  ctx.fillStyle = rgba('#7fd6ff', .35 + .6 * lvn); ctx.beginPath(); ctx.arc(x0 + 8, cy - 18, 3, 0, 7); ctx.fill();
  ctx.restore();
  if (hot > .05) glow(ctx, 540, cy, 520, '#9fdcff', .1 * hot * a);
}

window.PK.scenes.alive = function (ctx, t, d, info) {
  const HG = PK.HG, D = info.sc.data || {};
  const v0 = info.sc.voice_t - info.sc.t0, w = k => v0 + WD[k], tc = t - v0;
  const { dH, tI } = handInfo(info);
  const th = dH + t;
  const lv = loud(tc);

  // ---- beats ----
  const p = P(t, .03, .5, E.outC);                                         // pull back into the monitor
  const tF1 = w('alive') + .04, tF2 = w('alive2') + .04;
  const wf = (t > tF1 - .08 ? .75 * Math.exp(-Math.max(0, t - tF1) * 3.2) * P(t, tF1 - .08, tF1) : 0) + (t > tF2 - .08 ? Math.exp(-Math.max(0, t - tF2) * 2.6) * P(t, tF2 - .08, tF2) : 0);
  const warmHold = P(t, tF2, tF2 + 1, E.inOutQ);
  const keep = P(t, w('keep') - .1, w('end') + .3, E.inOutQ);
  // each 'keep him there': a softer warm pulse of his light (no kick)
  const kp = [w('keep'), w('keep2')].reduce((a, tk) => a + (t > tk - .06 ? .32 * Math.exp(-Math.max(0, t - tk) * 3.4) * P(t, tk - .06, tk + .02) : 0), 0);
  const grip = P(t, w('keep') - .05, w('keep') + .25, E.outQ) * .6 + P(t, w('keep2') - .05, w('keep2') + .25, E.outQ) * .4;
  const tearIn = Math.max(0, 1 - t / .32) * (t < .02 ? .2 : 1), tearOut = P(t, d - .32, d - .02, E.inQ);
  const tear = Math.max(tearIn * .9, tearOut);

  // ---- room camera: still at first (matches the hand shot), kicks on the flashes, slow push on 'keep him there' ----
  const zr = 1 + .05 * P(t, w('okay') - .2, d + .2, E.inOutQ) + .012 * wf;
  const [kx, ky, kr] = RV.shake(t, .3 * wf + .08 * tearOut, 21);
  const dr = { x: fb(t * .3, 211) * 9 * p, y: fb(t * .27, 212) * 9 * p, r: fb(t * .22, 213) * .004 * p };

  // background: the dark room (plain: the monitor's spill is the only light in it)
  ctx.fillStyle = '#010203'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(540 + kx + dr.x, MON.cy + ky + dr.y); ctx.rotate(kr + dr.r); ctx.scale(zr, zr); ctx.translate(-540, -MON.cy);
  const m = mon(p);
  // spill of the screen into the room: cold, warm on the flashes
  if (p > .02) {
    const wa = (.55 * wf + .25 * kp + .08 * warmHold) * p;        // drawn at 1/3 resolution (one blit)
    HG.light(ctx, q => { glow(q, m.cx, m.cy, 760, '#5fb8d8', .07 * p); if (wa > .004) glow(q, m.cx, m.cy, 900, '#ff9a3c', wa); if (wf > .02) glow(q, m.cx, m.cy + 260, 700, '#ffcf8a', .25 * wf * p); });
  }
  // bezel
  if (p > .001) {
    const bx0 = m.cx - m.hw - 24, by0 = m.cy - m.hh - 24, bw = 2 * m.hw + 48, bh = 2 * m.hh + 48;
    ctx.save(); ctx.globalAlpha = clamp(p * 3);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, bx0 + 6, by0 + 14, bw, bh, m.r + 20); ctx.fill();
    const bg = ctx.createLinearGradient(0, by0, 0, by0 + bh); bg.addColorStop(0, '#20282d'); bg.addColorStop(.08, '#12181b'); bg.addColorStop(1, '#07090a');
    ctx.fillStyle = bg; roundRect(ctx, bx0, by0, bw, bh, m.r + 20); ctx.fill();
    ctx.strokeStyle = rgba('#a9c9d8', .18); ctx.lineWidth = 2; roundRect(ctx, bx0 + 1, by0 + 1, bw - 2, bh - 2, m.r + 19); ctx.stroke();
    ctx.strokeStyle = rgba('#ffb36b', .35 * wf + .08 * warmHold); ctx.lineWidth = 3; roundRect(ctx, bx0 + 1, by0 + 1, bw - 2, bh - 2, m.r + 19); ctx.stroke();
    // LEDs on the lower bezel (no text): a steady cold one and a slow red blink
    ctx.fillStyle = rgba('#7fd6ff', .7); ctx.beginPath(); ctx.arc(bx0 + bw - 40, by0 + bh - 12, 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = rgba('#e3262f', .3 + .6 * (Math.sin(t * 4) > 0 ? 1 : .2)); ctx.beginPath(); ctx.arc(bx0 + bw - 58, by0 + bh - 12, 3.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  // ---- the feed (inside the screen) ----
  ctx.save();
  roundRect(ctx, m.cx - m.hw, m.cy - m.hh, 2 * m.hw, 2 * m.hh, m.r); ctx.clip();
  ctx.fillStyle = '#010203'; ctx.fillRect(m.cx - m.hw, m.cy - m.hh, 2 * m.hw, 2 * m.hh);
  ctx.save();
  ctx.translate(m.cx, m.cy); ctx.scale(m.k, m.k); ctx.translate(-540, -860);
  const bursts = [tF1 + .02, tF2 + .02].map(x => x + dH);
  const fd = feed(ctx, th, tI, dH, { push: .17 * P(t, w('okay') - .2, d + .3, E.inOutQ), kick: .25 * wf, bpm: lerp(118, 104, P(t, tF2, d)), keep, grip,
    glowA: 1.2 + .5 * warmHold + 3 * wf + 2.2 * kp, glowR: 1.1 + .6 * wf + .12 * warmHold + .3 * kp, warm: wf, bursts });
  ctx.restore();
  // the hand scene's lens motes and tunnel vision, handing over to the monitor's own vignette
  if (p < 1) HG.bokeh(ctx, fd.tm, fd.b, fd.M, { n: 8, a: .3 * (1 - p) });
  if (p < 1) HG.iris(ctx, .46 * (1 - p), .6 * fd.bt * (1 - p), 560, 880);
  // warm bloom of his light on the flashes
  const wb = wf + .6 * kp;
  if (wb > .01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(fd.heart.x, fd.heart.y, 0, fd.heart.x, fd.heart.y, 760); g.addColorStop(0, rgba('#fff0d8', .95 * wb)); g.addColorStop(.25, rgba('#ffb35c', .5 * wb)); g.addColorStop(1, rgba('#ff9a3c', .12 * wb));
    ctx.fillStyle = g; ctx.fillRect(m.cx - m.hw, m.cy - m.hh, 2 * m.hw, 2 * m.hh);
    ctx.fillStyle = rgba('#ffcf8a', .16 * wb); ctx.fillRect(m.cx - m.hw, m.cy - m.hh, 2 * m.hw, 2 * m.hh); ctx.restore();
  }
  // monitor treatment: cold tint, scanlines, rolling bar, vignette, glass
  if (p > 0) {
    const sx0 = m.cx - m.hw, sy0 = m.cy - m.hh, sw = 2 * m.hw, sh = 2 * m.hh;
    ctx.save(); ctx.globalAlpha = p; ctx.drawImage(screenFX(), sx0, sy0, sw, sh);      // tint + scanlines + vignette + glass (cached)
    ctx.globalCompositeOperation = 'lighter';
    const ry = sy0 + ((t * .42) % 1.3 - .15) * sh, rb = ctx.createLinearGradient(0, ry - 70, 0, ry + 70); rb.addColorStop(0, 'rgba(160,220,240,0)'); rb.addColorStop(.5, 'rgba(160,220,240,.045)'); rb.addColorStop(1, 'rgba(160,220,240,0)');
    ctx.fillStyle = rb; ctx.fillRect(sx0, ry - 70, sw, 140);
    ctx.restore();
  }
  ctx.restore();
  // the radio panel below the monitor
  radio(ctx, t, tc, P(t, .25, .6, E.outQ), clamp(lv * 1.3 - .25) + .6 * wf);
  ctx.restore();

  // static: tears the frame at the cut in, and again for the cut out
  RV.tears(ctx, t, tear, 0, 470, W, 680);
  if (tearIn > .02) flash(ctx, .07 * tearIn, '#cfeaff');
  HG.subBand(ctx);
  RV.card(ctx, t, d, D, lv);
};
})();
