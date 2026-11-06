// ocean (clip, BBC 2023 — Okene: "But today I found myself still in the ocean, and I know it's where I'm made to be."):
// Match cut from "after": the same diver silhouette at the same place, but the water is now calm, shallow and sunlit —
// a bright wavering surface overhead, daylight shafts, plankton, caustics dancing on the sand far below. His warm light
// still beats calmly in the chest. 'still in the ocean' -> he lets go of the line and hovers free while the camera pushes in
// slowly and sinks with him (the surface, shafts, silt and sand rise past him); 'where I'm made to be' -> he lifts his head a little toward the light, his breath
// rises in a slow column of bubbles that sparkle as they near the surface, the shafts brighten. The attribution card (with a
// small live waveform) stays up while the voice plays; the frame stays calm and uncluttered for the real voice.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, roundRect } = L;
const PK = window.PK;

const SURF = 330;                                  // the surface, seen from below (behind the title's dark gradient)
// caustic net texture (generated once): bright thin cell edges
let CAU = null;
function causticTex() {
  if (CAU) return CAU;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const id = x.createImageData(S, S);
  const R = L.rng(77), pts = []; for (let i = 0; i < 26; i++) pts.push([R() * S, R() * S]);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const dx = i - px - ox * S, dy = j - py - oy * S, dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1), v = Math.exp(-e * .35), o = (j * S + i) * 4;
    id.data[o] = 210; id.data[o + 1] = 245; id.data[o + 2] = 255; id.data[o + 3] = Math.round(255 * v);
  }
  x.putImageData(id, 0, 0); CAU = c; return c;
}

window.PK.scenes.ocean = function (ctx, t, d, info) {
  const FIN = PK.FIN, { hi, fb } = FIN, D = info.sc.data || {}, sc = info.sc;
  const subs = ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const v0 = sc.voice_t - sc.t0, v1 = sc.voice_end - sc.t0;
  const s1 = subs[0] ? subs[0].t0 - sc.t0 : v0, s2 = subs[1] ? subs[1].t0 - sc.t0 : v0 + (v1 - v0) * .4;

  const free = P(t, s1 + .5, s1 + 1.6, E.inOutQ);              // lets go of the line
  const up = P(t, s2 - .1, s2 + 2.2, E.inOutQ);                // lifts his head toward the light
  const glowUp = P(t, s2, v1, E.inOutQ);
  // camera: from the after scene's framing, a slow push in while it sinks with him (the world rises ~40 px past him)
  const zp = P(t, 0, d, E.inOutQ), z = lerp(1, 1.1, zp), rise = -40 * zp;
  const dr = { x: fb(t * .25, 191) * 7, y: fb(t * .22, 192) * 6 };
  const SX = x => 540 + (x - 540) * z + dr.x, DY = y => 892 + (y - 892) * z + dr.y, SY = y => DY(y) + rise;   // SY: the world, DY: the diver

  // ---- water: sunlit, shallow ----
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5fc3dc'); g.addColorStop(SURF / H, '#3aa3c4'); g.addColorStop(.3, '#1e7fa3'); g.addColorStop(.5, '#0f5c7e'); g.addColorStop(.66, '#0a4560'); g.addColorStop(1, '#04202f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the surface from below: a bright, wavering skin with the sun's window
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sy = x => SY(SURF) + Math.sin(x * .013 + t * 1.1) * 7 + Math.sin(x * .031 - t * 1.7) * 4;
  ctx.save(); ctx.translate(640, SY(SURF) - 10); ctx.scale(2.2, .5); glow(ctx, 0, 0, 340, '#fff6d8', .35 + .15 * glowUp); ctx.restore();
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = rgba('#e8fbff', .3 - k * .08); ctx.lineWidth = 3 - k; ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) { const y = sy(x) + k * 16 + Math.sin(x * .05 + t * 2 + k) * 2; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  }
  // glints dancing on the underside of the surface
  for (let i = 0; i < 60; i++) {
    const x = hi(i * 3 + 1) * W, w = 10 + hi(i * 5 + 2) * 50, tw = Math.pow(.5 + .5 * Math.sin(t * (1.5 + hi(i) * 2) + i * 2.3), 3);
    ctx.fillStyle = rgba('#ffffff', .35 * tw); ctx.fillRect(x - w / 2 + Math.sin(t + i) * 8, sy(x) + 4 + hi(i * 7) * 30, w, 2);
  }
  ctx.restore();
  // daylight shafts from the surface (brighten on the last line)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x0 = 120 + i * 110 + Math.sin(t * .35 + i * 1.7) * 40, w = 40 + 60 * hi(i * 5 + 3), al = (.07 + .05 * glowUp) * (.45 + .55 * (.5 + .5 * Math.sin(t * .8 + i * 2.3)));
    const sg = ctx.createLinearGradient(0, SY(SURF), 0, 1250); sg.addColorStop(0, rgba('#d8f6ff', al)); sg.addColorStop(1, 'rgba(216,246,255,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x0 - w * .3, SY(SURF)); ctx.lineTo(x0 + w * .3, SY(SURF)); ctx.lineTo(x0 + w * 1.4 - 120, 1250); ctx.lineTo(x0 - w * 1.4 - 120, 1250); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the sand far below, caustics dancing on it
  const bedY = SY(1180);
  { const bg = ctx.createLinearGradient(0, bedY - 60, 0, bedY + 140); bg.addColorStop(0, 'rgba(60,110,120,0)'); bg.addColorStop(.35, 'rgba(70,118,122,.55)'); bg.addColorStop(1, 'rgba(30,60,70,.8)');
    ctx.fillStyle = bg; ctx.fillRect(0, bedY - 60, W, 200);
    const tex = causticTex(); ctx.save(); ctx.beginPath(); ctx.rect(0, bedY - 10, W, 160); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (let l = 0; l < 2; l++) {
      ctx.globalAlpha = .16 - l * .05; const sc2 = 2.2 + l * .7, ox = ((t * (14 + l * 9) + l * 90) % (256 * sc2)), oy = ((t * (5 - l * 3)) % (256 * sc2 * .35) + 256 * sc2 * .35) % (256 * sc2 * .35);
      for (let ix = -1; ix < W / (256 * sc2) + 1; ix++) for (let iy = -1; iy < 2; iy++) ctx.drawImage(tex, ix * 256 * sc2 - ox, bedY - 10 + iy * 256 * sc2 * .35 + oy, 256 * sc2, 256 * sc2 * .35);
    }
    ctx.restore(); }
  // plankton / motes in the light
  ctx.save(); ctx.translate(0, rise); L.motes(ctx, t, { n: 80, color: '#e6fbff', a: .3, size: 2, speed: 7, seed: 93, area: [0, SURF + 60, W, 900] }); ctx.restore();

  // ---- the diver: same framing as the end of "after" ----
  const DV = FIN.DV;
  const o = { x: SX(DV.x) + Math.sin(t * .6) * 4, y: DY(DV.y) - 10 * up + Math.sin(t * .9) * 5, s: DV.s * z, rot: lerp(-.03, -.13, up) + .015 * Math.sin(t * .5), t };
  // the line he lets go of (it drifts out of the frame)
  const lineA = 1 - P(t, s1 + .8, s1 + 2.4, E.inOutQ);
  if (lineA > 0) {
    const [lnx] = FIN.dpt({ x: SX(DV.x), y: DY(DV.y), s: DV.s * z, rot: -.03 }, 92, 0), lx = lnx + 60 * (1 - lineA) * (1 - lineA);
    ctx.save(); ctx.globalAlpha = lineA; ctx.strokeStyle = 'rgba(214,236,242,.6)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let y = -20; y <= H; y += 40) { const x = lx + Math.sin(y * .004 + t * .6) * 3; y === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
  }
  FIN.diver(ctx, t, Object.assign({}, o, { reach: 1 - free, kick: t * 1.2, fill: '#06141c', rim: '#e6f8ff', rimA: .85, rimOff: [1.2, -3.2], rim2: [-3, -.5], rim2A: .35, halo: .22 + .12 * glowUp }));
  // a faint lamp point (no beam in daylight)
  const [lpx, lpy] = FIN.dpt(o, FIN.LAMP[0], FIN.LAMP[1]); glow(ctx, lpx, lpy, 40, '#e8f6ff', .45); glow(ctx, lpx, lpy, 10, '#ffffff', .8);
  // his breath: slow columns of bubbles that sparkle near the surface
  const [ex, ey] = FIN.dpt(o, FIN.EXH[0], FIN.EXH[1]);
  FIN.exhale(ctx, t, [-1.2, .55, s1 + 1.7, s2 + .9, s2 + 2.4], ex, ey, .75, 11);
  // his warm light, beating calmly
  const [hx, hy] = FIN.dpt(o, 10, -4);
  FIN.heart(ctx, t, hx, hy, .8, 62, .95);

  // ---- calm frame + attribution card (with a small live waveform) ----
  { const g2 = ctx.createLinearGradient(0, 0, 0, 470); g2.addColorStop(0, 'rgba(1,6,10,.55)'); g2.addColorStop(1, 'rgba(1,6,10,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 470); }
  FIN.subBand(ctx, .8, 1120);
  const ca = P(t, .03, .3, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ));
  PK.sourceCard(ctx, D.who || '', D.where || '', ca);
  if (ca > 0) {
    const on = P(t, v0 - .05, v0 + .1) * (1 - P(t, v1 - .1, v1 + .1));
    ctx.save(); ctx.globalAlpha = ca;
    for (let i = 0; i < 9; i++) { const v = .18 + .82 * on * Math.abs(FIN.nz(t * 7 + i * .45, 21)) * (.6 + .4 * Math.sin(t * 11 + i * 1.7)); const bh = 6 + 36 * v; ctx.fillStyle = i % 2 ? '#7fd6ff' : '#bfeaff'; roundRect(ctx, 822 + i * 9.5, 1185 - bh / 2, 5, bh, 2.5); ctx.fill(); }
    ctx.restore();
  }
};
})();
