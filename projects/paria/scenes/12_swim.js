// swim (real audio): "To just move, swim, swim, swim."
// First person, through the completely flooded line, in the dark. No torch: the only light is his own, faintly warming the
// nearest girth welds. Ribs of steel come out of the black and rush past, silt streams back past the eyes, exhaled bubbles
// fly backwards. "To just move" -> he gets going from a near stop. Each "swim" -> a surge forward: the tunnel stretches
// (wider field of view), a dull pressure pulse runs ahead down the pipe, the dark closes in a little more, bubbles burst back.
// Heartbeat drives the breathing iris. Attribution card stays up.
(function () {
const { W, H, E, P, clamp, lerp, fbm, rgba, glow } = L;
const { beat, sourceCard } = window.PK;
const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };
const fb = (x, s = 0, o = 3) => { let v = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { v += a * nz(x * f, s + k * 7); a *= .5; f *= 2; } return v; };

// ---- PK.dark look (same oily sheen), composed at quarter resolution and blitted once ----
function sheenTexLite() {
  if (window.PK._sheenLite) return window.PK._sheenLite;
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
  const id = x.createImageData(270, 480);
  for (let j = 0; j < 480; j++) for (let i = 0; i < 270; i++) {
    const u = i / 270, v = j / 480; const n = fbm(u * 3.1 + fbm(v * 2.3, 4) * 1.4, 7) + fbm(v * 4.2 + u, 9) * .7;
    const band = Math.sin(n * 9.0); const k = Math.pow(Math.max(0, band), 3);
    const hue = (n * 360 * 1.3 + 200) % 360; const h6 = hue / 60, f = h6 - Math.floor(h6);
    const rgb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h6) % 6];
    const o = (j * 270 + i) * 4; id.data[o] = 40 + 160 * rgb[0] * k; id.data[o + 1] = 40 + 150 * rgb[1] * k; id.data[o + 2] = 50 + 170 * rgb[2] * k; id.data[o + 3] = 255 * (.15 + .85 * k);
  }
  x.putImageData(id, 0, 0); window.PK._sheenLite = c; return c;
}
function darkLite(ctx, t, k, seed, base = '#010203') {
  const [b, x] = L.buf('pkDarkFast', 270, 480);
  x.fillStyle = base; x.fillRect(0, 0, 270, 480); x.scale(.25, .25);
  const tex = sheenTexLite(); x.globalCompositeOperation = 'screen';
  for (let l = 0; l < 2; l++) {
    const sc = 4.6 + l * 1.8, dx = Math.sin(t * .07 + seed + l * 2) * 120 - 200, dy = Math.cos(t * .05 + seed * 3 + l) * 160 - 300 + t * (6 + l * 5);
    x.globalAlpha = (.075 - l * .025) * k; x.drawImage(tex, dx, dy, 270 * sc, 480 * sc);
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
}

// ---- motion: speed (pipe radii per second) and distance travelled, integrated once per timing set ----
function plan(info) {
  const v0 = info.sc.voice_t - info.sc.t0, d = info.sc.t1 - info.sc.t0;
  const key = v0.toFixed(3) + '/' + d.toFixed(3);
  const C = window.PK._swimPlan || (window.PK._swimPlan = {});
  if (C[key]) return C[key];
  // clip-relative onsets measured on the real audio: "move", then the three "swim"s
  const S = [1.83, 2.8, 3.77].map(c => v0 + c), MOVE = v0 + .3;
  const kick = (u, A, rise = .07, fall = .5) => (u <= 0 ? 0 : A * (1 - Math.exp(-u / rise)) * Math.exp(-u / fall));
  const vel = t => {
    let v = .7 + 1.5 * E.inOutQ(P(t, v0 - .1, v0 + 1.5)) + .5 * P(t, S[0], d + .5);
    v += kick(t - MOVE, 1.4, .1, .6);
    S.forEach((s, i) => { v += kick(t - s + .04, [4.2, 4.8, 5.6][i]); });
    return v;
  };
  const T0 = -1, dt = 1 / 200, n = Math.ceil((d + 1.5 - T0) / dt);
  const Z = new Float64Array(n + 1); Z[0] = 0;
  for (let i = 0; i < n; i++) { const t = T0 + (i + .5) * dt; Z[i + 1] = Z[i] + vel(t) * dt; }
  const zAt = t => { const f = clamp((t - T0) / dt, 0, n - 1e-6), i = Math.floor(f); return lerp(Z[i], Z[i + 1], f - i); };
  return (C[key] = { v0, d, S, MOVE, vel, zAt, kick });
}

// pipe centre-line offset (in pipe radii) at world depth z: the line undulates gently
const offX = z => .32 * Math.sin(z * .19 + 1.3) + .1 * Math.sin(z * .53);
const offY = z => .14 * Math.sin(z * .15 + .4);
const SPACING = 2.2;                                     // girth welds every 2.2 pipe radii (a visual rhythm, not to scale)

window.PK.scenes.swim = function (ctx, t, d, info) {
  const D = info.sc.data || {};
  const pl = plan(info);
  const Z = pl.zAt(t), Zp = pl.zAt(t - .03), v = pl.vel(t);
  let surge = 0; pl.S.forEach(s => { surge = Math.max(surge, Math.exp(-Math.pow((t - s - .1) / .16, 2))); });
  let surgeK = 0; pl.S.forEach((s, i) => { surgeK += pl.kick(t - s + .04, 1, .05, .35) * [.8, .9, 1][i]; });
  const bpm = lerp(118, 140, P(t, pl.v0, d));

  // ---- head motion: sway, bob, a lunge and roll on every stroke ----
  let lunge = 0, roll = .025 * Math.sin(t * .9) + .012 * fb(t * .7, 4);
  pl.S.forEach((s, i) => { const u = t - s; if (u > -.2 && u < 1.2) { lunge += Math.sin(clamp((u + .2) / 1.0) * Math.PI) * (u < .1 ? -.4 : 1); roll += (i % 2 ? -1 : 1) * .03 * Math.sin(clamp((u + .1) / .9) * Math.PI); } });
  const cx = 540 + 16 * Math.sin(t * 1.6) + 10 * fb(t * .8, 7), cy = 800 + 9 * Math.sin(t * 3.2 + .5) + 26 * lunge + 6 * fb(t * .9, 9);
  const F = 330 * (1 + .1 * surgeK + .04 * Math.sin(t * .6));
  const camOX = offX(Z) + .12 * Math.sin(t * 1.1), camOY = offY(Z) - .05 + .05 * Math.sin(t * 2.3);
  const proj = (px, py, zr, zw) => { const s = F / zr; return [ (px + offX(zw) - camOX) * s, (py + offY(zw) - camOY) * s, s ]; };

  darkLite(ctx, t, .18, 44);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(roll);
  // a little shake on each stroke
  ctx.translate(surge * 7 * nz(t * 24, 3), surge * 7 * nz(t * 24, 5));

  // ---- the pressure pulse that runs ahead down the line on every "swim" ----
  const pingAt = zr => { let a = 0; pl.S.forEach(s => { const u = t - s; if (u < 0 || u > 1.3) return; const wz = .4 + u * 9; a += .9 * Math.exp(-Math.pow((zr - wz) / 1.1, 2)) * Math.pow(1 - u / 1.3, 1.5); }); return a; };

  // ---- girth welds and the steel between them ----
  const NEAR = .22, FAR = 26;
  const k0 = Math.ceil((Z + NEAR) / SPACING), k1 = Math.floor((Z + FAR) / SPACING);
  const rings = [];
  for (let k = k1; k >= k0; k--) {
    const zw = k * SPACING, zr = zw - Z; const [ox, oy, s] = proj(0, 0, zr, zw);
    const fog = Math.exp(-zr * .16), warm = .62 * Math.exp(-zr / 2.2), cold = .3 * Math.exp(-zr / 7), ping = pingAt(zr);
    rings.push({ zw, zr, ox, oy, s, fog, warm, cold, ping, hk: hi(k * 31 + 7) });
  }
  // the steel walls: oily runs along the length of the pipe (a conic gradient around the vanishing point: they do not move
  // as he goes forward, exactly like streaks running along a pipe), lit faintly near him and lost to black in the distance
  const [vx, vy] = proj(0, 0, 9, Z + 9);
  {
    // composed at quarter resolution through the current camera transform, then blitted once
    const [wb, wx] = L.buf('swimWall', 270, 480); wx.clearRect(0, 0, 270, 480);
    const m0 = ctx.getTransform(); wx.setTransform(m0.a / 4, m0.b / 4, m0.c / 4, m0.d / 4, m0.e / 4, m0.f / 4);
    const g = wx.createConicGradient(0, vx, vy), N = 72;
    for (let i = 0; i <= N; i++) {
      const j = i % N, th = j / N * Math.PI * 2, down = Math.max(0, Math.sin(th));
      const n = .25 + .75 * Math.pow(hi(j * 7 + 3), 2) * (.6 + .4 * hi((j >> 2) * 11 + 1));
      const a = (.07 + .17 * n) * (.5 + .8 * down) * (1 + .5 * surge);
      const wr = down * .8;
      g.addColorStop(i / N, `rgba(${Math.round(lerp(70, 150, wr))},${Math.round(lerp(96, 98, wr))},${Math.round(lerp(108, 70, wr))},${a.toFixed(3)})`);
    }
    wx.fillStyle = g; wx.fillRect(-W, -H, W * 2, H * 2);
    const m = wx.createRadialGradient(vx, vy, 0, vx, vy, 760);
    m.addColorStop(0, 'rgba(1,2,3,1)'); m.addColorStop(.12, 'rgba(1,2,3,.97)'); m.addColorStop(.4, 'rgba(1,2,3,.55)'); m.addColorStop(.8, 'rgba(1,2,3,.1)'); m.addColorStop(1, 'rgba(1,2,3,0)');
    wx.fillStyle = m; wx.fillRect(-W, -H, W * 2, H * 2);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(wb, 0, 0, W, H); ctx.restore();
    // the dull pulse: a soft band of cold light running away down the pipe
    pl.S.forEach(s0 => { const u = t - s0; if (u < 0 || u > 1.3) return; const wz = .4 + u * 9, R = F / wz, a = .13 * Math.pow(1 - u / 1.3, 1.5);
      const rg = ctx.createRadialGradient(vx, vy, R * .55, vx, vy, R * 1.3); rg.addColorStop(0, 'rgba(143,211,232,0)'); rg.addColorStop(.55, rgba('#8fd3e8', a)); rg.addColorStop(1, 'rgba(143,211,232,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.fillRect(vx - R * 1.35, vy - R * 1.35, R * 2.7, R * 2.7); ctx.restore(); });
  }
  ctx.save(); ctx.lineCap = 'round';
  // scratches and oil runs along the wall (fixed to the steel, so they rush past with it)
  const LZ2 = 30;
  for (let i = 0; i < 44; i++) {
    const zi = hi(i * 17 + 2) * LZ2, th = hi(i * 19 + 4) * Math.PI * 2, len = .4 + 1.2 * hi(i * 23 + 6);
    const zr = ((zi - Z) % LZ2 + LZ2) % LZ2 + .15; if (zr > 22) continue;
    const zw = Z + zr, cs = Math.cos(th) * .985, sn = Math.sin(th) * .985;
    const [xa, ya] = proj(cs, sn, zr, zw), [xb, yb, sb] = proj(cs, sn, zr + len, zw + len);
    const f = Math.exp(-zr * .16), a = (.5 * Math.exp(-zr / 2.2) + .12 * Math.exp(-zr / 7)) * f * P(zr, .15, .6);
    if (a < .01) continue;
    ctx.strokeStyle = rgba(sn > .2 ? '#8fd3e8' : '#c9a27a', a * .6); ctx.lineWidth = Math.max(.7, .012 * sb);
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
  }
  // the welds themselves: broken, dirty bands, brighter low down where his light reaches
  for (const r of rings) {
    const R = r.s, lw = Math.max(1, 11 * R / F), SEG = Math.round(clamp(R / 12, 10, 36));
    const ac = (r.cold * .9 + .55 * r.ping) * r.fog, aw = r.warm * r.fog;
    if (ac + aw < .012) continue;
    for (let j = 0; j < SEG; j++) {
      const a0 = j / SEG * Math.PI * 2, a1 = a0 + Math.PI * 2 / SEG * 1.02, mid = (a0 + a1) / 2, down = Math.max(0, Math.sin(mid));
      const dirt = .25 + .75 * Math.pow(hi(Math.round(r.zw * 10) * 131 + j * 7), .7);
      const c = ac * dirt * (.45 + .55 * down), w = aw * dirt * (.15 + .85 * down);
      if (c > .01) { ctx.strokeStyle = rgba('#8a9ba3', c * .8); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(r.ox, r.oy, R, a0, a1); ctx.stroke(); }
      if (w > .01) { ctx.strokeStyle = rgba('#ffb36b', w * .65); ctx.lineWidth = lw * 1.15; ctx.beginPath(); ctx.arc(r.ox, r.oy, R, a0, a1); ctx.stroke(); }
    }
    // cold wet glint along the bottom of the pipe
    const g = (r.cold * 1.2 + r.ping * .5) * r.fog; if (g > .01) { ctx.strokeStyle = rgba('#cfe8ff', g * .45); ctx.lineWidth = lw * .7; ctx.beginPath(); ctx.arc(r.ox, r.oy, R * .985, Math.PI * (.5 - .12 - .1 * r.hk), Math.PI * (.5 + .1 + .1 * r.hk)); ctx.stroke(); }
  }
  ctx.restore();

  // ---- silt streaming back past the eyes (motion streaks scale with speed) ----
  ctx.save(); ctx.lineCap = 'round';
  const LZ = 14;
  for (let i = 0; i < 170; i++) {
    const zi = hi(i * 7 + 3) * LZ, rr = Math.sqrt(hi(i * 11 + 5)) * .92, th = hi(i * 13 + 1) * Math.PI * 2;
    const zr = ((zi - Z) % LZ + LZ) % LZ + .12; if (zr > LZ - .1) continue;
    const zrp = zr + (Z - Zp);
    const px = Math.cos(th) * rr + .03 * nz(t * .5 + i, 2), py = Math.sin(th) * rr + .03 * nz(t * .5 + i, 6);
    const zw = Z + zr;
    const [x1, y1, s1] = proj(px, py, zr, zw), [x0, y0] = proj(px, py, zrp, zw);
    const near = Math.exp(-zr / 1.6), a = (.05 + .4 * near) * P(zr, .12, .6) * Math.exp(-zr * .12);
    if (a < .01) continue;
    ctx.strokeStyle = rgba(near > .55 ? '#ffd2a0' : '#9cc9d6', a); ctx.lineWidth = Math.max(.7, (.0035 + .0035 * hi(i)) * s1);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();

  // ---- out-of-focus specks drifting right in front of the mask ----
  for (let i = 0; i < 9; i++) {
    const LZ3 = 3.2, zi = hi(i * 29 + 5) * LZ3, zr = ((zi - Z * .9) % LZ3 + LZ3) % LZ3 + .08; if (zr > 1.2) continue;
    const th = hi(i * 31 + 2) * Math.PI * 2, rr = .25 + .5 * hi(i * 37 + 1);
    const [x, y, sc] = proj(Math.cos(th) * rr, Math.sin(th) * rr, zr, Z + zr);
    const a = .07 * P(zr, .08, .3) * (1 - P(zr, .7, 1.2));
    glow(ctx, x, y, .05 * sc, hi(i) > .6 ? '#ffc98a' : '#8fd3e8', a, 'lighter');
  }
  // ---- exhaled bubbles: born just in front of the mask, rise, and are left behind as he surges on ----
  ctx.save();
  const bursts = [pl.v0 - .5, pl.MOVE + .15, pl.v0 + 1.25].concat(pl.S.map(s => s + .02));
  bursts.forEach((tb, bi) => {
    for (let j = 0; j < 9; j++) {
      const born = tb + j * .03 + hi(bi * 50 + j) * .05, age = t - born; if (age < 0 || age > 1.6) continue;
      const zw = pl.zAt(born) + .5 + .25 * hi(bi * 50 + j + 7), zr = zw - Z; if (zr < .1) continue;
      const bx = (hi(bi * 50 + j + 3) - .5) * .35 + .1 * Math.sin(age * 7 + j), by = .3 + .1 * hi(bi * 50 + j + 9) - age * (.7 + .4 * hi(j));
      const [x, y, s] = proj(bx, by, zr, zw); const rb = (.012 + .02 * hi(bi * 50 + j + 11)) * s;
      const a = .45 * P(age, 0, .06) * P(zr, .1, .3) * (1 - P(age, 1.1, 1.6));
      ctx.strokeStyle = rgba('#d8f6ff', a); ctx.lineWidth = Math.max(1, rb * .12); ctx.beginPath(); ctx.arc(x, y, rb, 0, 7); ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', a * .6); ctx.beginPath(); ctx.arc(x - rb * .35, y - rb * .35, rb * .22, 0, 7); ctx.fill();
    }
  });
  ctx.restore();
  ctx.restore();

  // ---- his own warmth at the edge of vision, with the heartbeat; a dull pulse on each stroke ----
  const hb = beat(t, bpm);
  glow(ctx, 540, 1120, 600, '#ff9a3c', .04 + .03 * hb);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#0b2a33', .22 * surge); ctx.fillRect(0, 0, W, H); ctx.restore();

  // ---- tunnel vision: tightens through the scene and on every stroke, breathes with the heart ----
  const k = lerp(.56, .7, P(t, pl.v0, d, E.inOutQ)) + .08 * surgeK;
  const br = .5 * (.5 + .5 * Math.sin(t * Math.PI * 2 * .7)) + .5 * hb;
  const r0 = H * lerp(.4, .085, k) * (1 + .07 * br), r1 = r0 + H * lerp(.5, .3, k);
  const ig = ctx.createRadialGradient(cx, cy - 10, r0, cx, cy - 10, r1);
  ig.addColorStop(0, 'rgba(1,2,3,0)'); ig.addColorStop(.5, `rgba(1,2,3,${(.5 + .3 * k).toFixed(3)})`); ig.addColorStop(1, 'rgba(1,2,3,.98)');
  ctx.save(); ctx.fillStyle = ig; ctx.fillRect(0, 0, W, H); ctx.restore();

  // attribution: up while the voice plays
  const ca = P(t, .02, .32, E.outQ) * (1 - P(t, d - .05, d + .15));                            // voice starts at ~0.35 s
  sourceCard(ctx, D.who || '', D.where || '', ca, 1185);
};
})();
