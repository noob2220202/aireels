// alive (real audio, BBC World Service Outlook 2019 — dive supervisor Craig Fredrick, recalling the report from the bell):
// "He just said, look, he's alive, he's breathing, he's actually talking."
// Hard cut from 'breaths': the first frame is that same warm bell interior, which pulls back into the bell-camera monitor of the
// dive-control room on the ship (dark room, our own drawn feed with scanlines — no real footage). Below it a comms panel's
// waveform runs with the real voice (its RMS); a faceless supervisor silhouette (back of the head, headset) sits in the
// foreground, rim-lit by the screen. 'he's alive' -> a warm bloom spills out of the monitor into the room (small kick);
// 'he's breathing' -> a soft breath ring from his light in the feed; 'he's actually talking' -> a second channel lights on the
// panel and the room warms again. His amber light beats strong in the feed throughout. Attribution card (two lines) up while
// the voice plays.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, text, roundRect, FONT } = L;
const PK = window.PK, LM = PK.LM, COL = LM.COL, C = PK.LMC, { hi, nz, fb } = LM;
const TAU = Math.PI * 2;

// loudness of the clip (30 fps RMS from voice start, 0-99) and word onsets (s from voice start; Whisper word timestamps)
const RMS = [0, 75, 80, 78, 81, 79, 57, 35, 50, 81, 83, 69, 71, 65, 87, 89, 71, 71, 80, 73, 33, 15, 64, 80, 63, 53, 58, 67, 75, 76, 80, 83, 78, 76, 74, 66, 51, 40, 62, 61, 50, 31, 0, 6, 74, 87, 84, 80, 75, 54, 64, 66, 59, 43, 7, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 75, 41, 80, 89, 82, 43, 58, 73, 56, 80, 72, 28, 40, 50, 84, 93, 86, 62, 16, 30, 63, 81, 65, 54, 41, 10, 0, 23];
const loud = C.env(RMS);
const WD = { look: .56, alive: .84, breathing: 1.36, talking: 2.42, end: 3.24 };
const MON = { x: 112, y: 488, w: 856, h: 492 };            // the bell-camera monitor (screen area)

// faceless supervisor, seen from behind: head, headset band + ear cups, neck, shoulders (screen space)
function supervisor(ctx, x, y, s, lean, rimA, rimCol) {
  const shape = c => {
    c.beginPath(); c.ellipse(0, 0, 66, 78, 0, 0, TAU);                                         // head (back)
    c.moveTo(-34, 60); c.lineTo(-40, 112); c.lineTo(40, 112); c.lineTo(34, 60); c.closePath();       // neck
    c.moveTo(-210, 330); c.bezierCurveTo(-214, 190, -150, 128, -46, 104); c.lineTo(46, 104); c.bezierCurveTo(150, 128, 214, 190, 210, 330); c.closePath();   // shoulders
    c.moveTo(-60, 4); c.ellipse(-70, 6, 18, 30, 0, 0, TAU); c.moveTo(88, 6); c.ellipse(70, 6, 18, 30, 0, 0, TAU);   // ear cups (both sides)
  };
  ctx.save(); ctx.translate(x, y); ctx.rotate(lean); ctx.scale(s, s);
  ctx.save(); ctx.translate(4, -5); ctx.fillStyle = rgba(rimCol, rimA); shape(ctx); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#030506'; shape(ctx); ctx.fill();
  ctx.strokeStyle = rgba(rimCol, .45 * rimA); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, -2, 70, 80, 0, -2.75, -.4); ctx.stroke();   // headset band
  ctx.restore();
}

window.PK.scenes.alive = function (ctx, t, d, info) {
  const D = info.sc.data || {}, sc = info.sc, v0 = sc.voice_t - sc.t0, tc = t - v0;
  const bsc = info.TL && info.TL.scenes.find(s => s.id === 'breaths');
  const bD = bsc ? bsc.t1 - bsc.t0 : 7.21, T = C.breathsTimes(bsc || sc), tb = bD + t;
  const lv = loud(tc), lvS = (loud(tc - .05) + lv + loud(tc + .05)) / 3;
  const bump = w => Math.exp(-Math.pow((tc - w - .08) / .22, 2));
  const bloom = clamp(.85 * bump(WD.alive) + .55 * bump(WD.breathing) + .8 * bump(WD.talking + .3));
  // pull back from the full-frame bell image into the monitor
  const p = E.inOutC(P(t, .04, .72));
  const push = P(t, .7, d + .3, E.inOutQ);                              // then a slow push toward the screen
  const jo = LM.jolt(t, v0 + WD.alive + .02, .35), dr = { x: fb(t * .3, 181) * 4, y: fb(t * .27, 182) * 4 };
  const RZ = 1 + .05 * push, RX = 540, RY = 800;
  const rs = q => [RX + (q[0] - RX) * RZ + jo.x + dr.x, RY + (q[1] - RY) * RZ + jo.y + dr.y];
  const m0 = rs([MON.x, MON.y]), m1 = rs([MON.x + MON.w, MON.y + MON.h]);
  const mx = lerp(0, m0[0], p), my = lerp(0, m0[1], p), mw = lerp(W, m1[0] - m0[0], p), mh = lerp(H, m1[1] - m0[1], p);
  const k = lerp(1, (m1[0] - m0[0]) / W, p), fcx = lerp(540, (m0[0] + m1[0]) / 2, p), fcy = lerp(860, (m0[1] + m1[1]) / 2 + 40 * k, p);

  // ---- the room ----
  ctx.fillStyle = '#020304'; ctx.fillRect(0, 0, W, H);
  if (p > .02) {
    const rk = p;
    // back wall and a faint rack of equipment
    ctx.save(); ctx.globalAlpha = rk;
    ctx.fillStyle = '#04070a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,150,160,.06)'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const yy = rs([0, 470 + i * 90])[1]; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    // console top + panel
    const ct = rs([0, 1000])[1];
    const gc = ctx.createLinearGradient(0, ct, 0, ct + 260); gc.addColorStop(0, '#0d1316'); gc.addColorStop(1, '#030505'); ctx.fillStyle = gc; ctx.fillRect(0, ct, W, 300);
    ctx.fillStyle = rgba('#ffd9a0', .1 + .3 * bloom); ctx.fillRect(0, ct, W, 2);
    ctx.restore();
    // the monitor's warm light falling into the room
    const mc = [(m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2];
    C.softGlow(ctx, mc[0], mc[1] + 60, 640, COL.amber, (.09 + .32 * bloom) * rk);
    C.softGlow(ctx, mc[0], rs([0, 1010])[1], 440, COL.warm, (.05 + .22 * bloom) * rk);
    // bezel
    ctx.save(); ctx.globalAlpha = rk; ctx.fillStyle = '#0a0d0f'; roundRect(ctx, m0[0] - 16, m0[1] - 16, m1[0] - m0[0] + 32, m1[1] - m0[1] + 32, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(170,200,210,.16)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  // ---- the feed: the bell interior, continuing from 'breaths' ----
  ctx.save();
  ctx.beginPath(); if (p > .001) roundRect(ctx, mx, my, mw, mh, 8 * p); else ctx.rect(0, 0, W, H); ctx.clip();
  ctx.fillStyle = '#020303'; ctx.fillRect(mx, my, mw, mh);
  ctx.translate(fcx, fcy); ctx.scale(k, k); ctx.translate(-540, -860);
  const cam = C.breathsCam(tb, T);
  ctx.save(); C.applyCam(ctx, cam);
  const S = C.breathsWorld(ctx, tb, T);
  ctx.restore();
  { const fc = C.toScreen(cam, S.lemChest);
    C.spot(ctx, fc, lerp(.42, .3, p), 180, 760, 380, 1300);
    // strong heartbeat + breath rings on 'breathing' / 'talking'
    const b = C.thump((tb - T.gasp) * 78 / 60);
    C.softGlow(ctx, fc[0], fc[1], 300 * (1 + .1 * b), COL.amber, (.12 + .16 * b + .2 * bloom));
    for (const w of [WD.breathing, WD.talking]) {
      const u = tc - w - .05; if (u < 0 || u > 1.5) continue; const q = u / 1.5;
      ctx.strokeStyle = rgba(COL.warm, .6 * Math.pow(1 - q, 1.4)); ctx.lineWidth = 6 * (1 - q) + 2; ctx.beginPath(); ctx.arc(fc[0], fc[1], 40 + 380 * E.outC(q), 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
  // CRT look of the feed (fades in with the pull-back)
  if (p > .01) {
    ctx.save(); roundRect(ctx, m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1], 8); ctx.clip();
    ctx.globalAlpha = p;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let y = m0[1]; y < m1[1]; y += 4) ctx.fillRect(m0[0], y, m1[0] - m0[0], 2);
    const rb = ((t * .4) % 1) * (m1[1] - m0[1] + 160) - 80 + m0[1]; const grb = ctx.createLinearGradient(0, rb - 50, 0, rb + 50);
    grb.addColorStop(0, 'rgba(255,230,190,0)'); grb.addColorStop(.5, 'rgba(255,230,190,.05)'); grb.addColorStop(1, 'rgba(255,230,190,0)'); ctx.fillStyle = grb; ctx.fillRect(m0[0], rb - 50, m1[0] - m0[0], 100);
    const vg = ctx.createRadialGradient((m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, 200, (m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, 560); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1]);
    // glass glint
    ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createLinearGradient(m0[0], m0[1], m0[0] + 360, m0[1] + 260); gg.addColorStop(0, 'rgba(200,230,240,.07)'); gg.addColorStop(1, 'rgba(200,230,240,0)'); ctx.fillStyle = gg; ctx.fillRect(m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1]);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    text(ctx, '다이빙 벨', m0[0] + 22, m0[1] + 30, { size: 26, weight: 800, color: 'rgba(255,226,180,.8)', align: 'left', alpha: p });
    if (Math.sin(t * 6) > -.2) { ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(m1[0] - 26, m0[1] + 28, 7, 0, TAU); ctx.fill(); ctx.restore(); }
  }

  // ---- comms panel: the voice's waveform (scrolling), talk LEDs ----
  if (p > .02) {
    const pa = P(t, .35, .8), py = rs([0, 1046])[1], px0 = rs([452, 0])[0], px1 = rs([958, 0])[0];
    ctx.save(); ctx.globalAlpha = pa;
    ctx.fillStyle = 'rgba(6,10,12,.92)'; roundRect(ctx, px0 - 14, py - 44, px1 - px0 + 28, 88, 10); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,210,.18)'; ctx.lineWidth = 2; ctx.stroke();
    const N = 64, bw = (px1 - px0 - 70) / N, x0 = px0 + 64;
    for (let i = 0; i < N; i++) {
      const tt = tc - (N - 1 - i) / 30, v = loud(tt), hgt = 4 + 64 * v * (.75 + .25 * Math.sin(i * 1.7 + tt * 9));
      ctx.fillStyle = v > .05 ? rgba(i > N - 6 ? '#fff1dc' : COL.amber, .35 + .6 * v) : 'rgba(150,180,190,.25)';
      ctx.fillRect(x0 + i * bw, py - hgt / 2, bw * .6, hgt);
    }
    // LEDs: the bell channel (lit while he speaks) + a second one on 'talking'
    const led = (x, y, on, col) => { ctx.fillStyle = on > .1 ? rgba(col, .4 + .6 * on) : 'rgba(60,70,72,.8)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); if (on > .1) LM.glow(ctx, x, y, 34, col, .7 * on); };
    led(px0 + 22, py - 16, clamp(lvS * 1.6), COL.amber);
    led(px0 + 22, py + 16, P(tc, WD.talking - .05, WD.talking + .2) * (1 - P(t, d - .4, d)) * (.6 + .4 * lvS), '#9fe0a0');
    ctx.restore();
  }
  // ---- the supervisor (faceless, from behind), rim-lit by the screen ----
  if (p > .02) {
    const sp = rs([238, 1020]), lean = -.04 + .03 * push + .02 * lvS;
    ctx.save(); ctx.globalAlpha = P(t, .3, .75); ctx.beginPath(); ctx.rect(0, 0, W, 1150); ctx.clip();
    supervisor(ctx, sp[0] - 30 * (1 - p), sp[1] + 120 * (1 - p), .95 * RZ, lean, .35 + .5 * bloom, '#ffd29a');
    ctx.restore();
  }
  if (p < .99) { const vg = ctx.createRadialGradient(540, 860, 300, 540, 860, 1100); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.4 * (1 - p)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  LM.subBand(ctx, .8, 1160);
  const ca = P(t, .03, .3, E.outQ) * (1 - P(t, d - .32, d - .04, E.inQ));
  C.card(ctx, D.who || '', D.where || '', ca, 1185);
  // the card's dot rings with the voice
  if (ca > 0 && lv > .05) { const cy = C.cardDot(ctx, D.who || ''); ctx.save(); ctx.strokeStyle = rgba('#ff6a6f', ca * .5 * lv); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(540 - 380 + 34, cy, 13 + 10 * lv, 0, TAU); ctx.stroke(); ctx.restore(); }
};
})();
