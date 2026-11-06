// TEMPORARY KIT SHOWCASE (PK.LM) — restored to the placeholder after review.
(function () {
const LM = PK.LM, COL = LM.COL;
const _post = PROJECT.post;
PROJECT.post = function (ctx, T, TL) { if (T < 3.9) { L.grain(ctx, T, .07, 30); return; } _post(ctx, T, TL); };
const lab = (ctx, s, x, y) => L.text(ctx, s, x, y, { size: 24, weight: 800, color: '#ffd28a', align: 'left', stroke: '#000', strokeW: 5 });
// panel: clip to rect, then draw fn in a full-frame coordinate system scaled to the panel
function panel(ctx, x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(w / 1080, h / 1920); fn(ctx); ctx.restore(); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); ctx.restore(); }
function cell(ctx, x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(ctx); ctx.restore(); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); ctx.restore(); }

function pageSea(ctx, t) {
  panel(ctx, 0, 0, 540, 960, c => { LM.sea(c, t, { surface: .9, seed: 1 }); });
  panel(ctx, 540, 0, 540, 960, c => { const Ls = [LM.light(380, 900, 420, COL.amber, .8), LM.light(760, 1100, 520, COL.lamp, .7)]; LM.sea(c, t, { dark: .35, lights: Ls, seed: 2 }); LM.seabed(c, 1500, t, { dark: .35, lights: Ls }); });
  panel(ctx, 0, 960, 540, 960, c => { const Ls = [LM.light(540, 900, 300, COL.amber, .8)]; LM.sea(c, t, { dark: .8, lights: Ls, seed: 3 }); LM.life(c, t, 540, 900, 1, { bpm: 90 }); });
  panel(ctx, 540, 960, 540, 960, c => { LM.sea(c, t, { dark: 1, seed: 4, lights: [LM.light(540, 1000, 180, COL.amber, .5)] }); LM.life(c, t, 540, 1000, .5, { bpm: 50, s: .7 }); });
  lab(ctx, 'sea: surface .9', 16, 30); lab(ctx, 'sea: dark .35 + lights + seabed', 556, 30); lab(ctx, 'sea: dark .8 + life', 16, 990); lab(ctx, 'sea: dark 1', 556, 990);
}
function pageStruct(ctx, t) {
  cell(ctx, 0, 0, 1080, 640, c => {
    const dv = LM.diver(null, 520, 0, .5, t, { pose: 'crouch', life: 1, anchor: 'base' });
    const st0 = LM.structure(null, 470, 590, .95, t); const d2 = LM.diver(null, 520, st0.topY + 4, .5, t, { pose: 'crouch', life: 1, anchor: 'base' });
    const Ls = d2.lights.concat([LM.light(1000, 100, 500, COL.lamp, .5)]);
    LM.sea(c, t, { dark: .5, lights: Ls }); LM.seabed(c, 590, t, { dark: .5, lights: Ls });
    LM.structure(c, 470, 590, .95, t, { lights: Ls, amb: .07 });
    LM.diver(c, 520, st0.topY + 4, .5, t, { pose: 'crouch', life: 1, anchor: 'base' });
    c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(st0.hook[0], st0.hook[1], 6, 0, 7); c.fill();
    c.strokeStyle = '#4ade80'; c.lineWidth = 2; c.beginPath(); st0.hose.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  });
  cell(ctx, 0, 640, 540, 640, c => {
    const Ls = [LM.light(150, 760, 300, COL.lamp, .9)];
    LM.sea(c, t, { dark: .85, lights: Ls }); LM.structure(c, 300, 1230, .62, t, { lights: Ls, amb: .03 }); LM.lampBeam(c, t, 120, 700, .6, .8, { len: 500, s: .6 });
  });
  cell(ctx, 540, 640, 540, 640, c => {
    const Ls = [LM.light(810, 960, 380, COL.amber, .8), LM.light(1000, 700, 300, COL.lamp, .6)];
    LM.sea(c, t, { dark: .7, lights: Ls }); LM.structure(c, 810, 960, .7, t, { view: 'top', lights: Ls, amb: .05 });
    LM.diver(c, 790, 950, .3, t, { pose: 'curl', life: .7, bpm: 50, rot: 0 });
  });
  cell(ctx, 0, 1280, 1080, 640, c => {     // close-up s=2.2 on the bucket with lamp
    const Ls = [LM.light(700, 1500, 420, COL.lamp, .9), LM.light(400, 1700, 300, COL.amber, .7)];
    LM.sea(c, t, { dark: .6, lights: Ls }); LM.structure(c, -220, 2180, 2.2, t, { lights: Ls, amb: .04 });
    const st = LM.structure(null, -220, 2180, 2.2, t); c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(st.hook[0], st.hook[1], 8, 0, 7); c.fill();
  });
  lab(ctx, 'structure side .95 · life light + cold ambient · hook(red) hose(green)', 16, 30); lab(ctx, 'dark .85 + lamp', 16, 670); lab(ctx, 'top view + curl', 556, 670); lab(ctx, 'close-up s 2.2', 16, 1310);
}
function pageDivers(ctx, t) {
  const P = [['stand', { lamp: 1 }], ['crouch', { life: 1 }], ['climb', { life: 1 }], ['curl', { life: .8, bpm: 50 }], ['float', { life: .3, bpm: 40 }], ['drag', { lamp: 1, dir: -1 }],
    ['swim', { lamp: 1, kick: .25 }], ['sit', { kind: 'bellman', rim: COL.warm, warm: .6 }], ['lean', { kind: 'bellman', rim: COL.warm, warm: .6 }], ['huddle', { life: 1 }], ['float', { helmet: false, life: .4, label: 'helmet off' }], ['stand', { bailoutLit: 1, life: 1, label: 'bailoutLit' }]];
  P.forEach(([pose, o], i) => {
    const cx = (i % 3) * 360, cy = Math.floor(i / 3) * 480;
    cell(ctx, cx, cy, 360, 480, c => {
      const pre = LM.diver(null, cx + 180, cy + 420, .62, t, Object.assign({ pose, anchor: 'base' }, o));
      LM.sea(c, t, { dark: .55, lights: pre.lights, seed: i + 1 });
      c.fillStyle = 'rgba(80,110,110,.25)'; c.fillRect(cx, cy + 420, 360, 2);
      LM.diver(c, cx + 180, cy + 420, .62, t, Object.assign({ pose, anchor: 'base' }, o));
    });
    lab(ctx, o.label || pose, cx + 12, cy + 26);
  });
}
function pageLine(ctx, t) {
  cell(ctx, 0, 0, 1080, 1920, c => LM.sea(c, t, { dark: .6 }));
  // slack w/ pulse
  LM.umbilical(ctx, [[40, 90], [540, 150], [1040, 110]], t, { sag: 120, pulse: 1, glow: .6, lit: .7 }); lab(ctx, 'slack + pulse + glow', 20, 60);
  // taut over a hook
  LM.umbilical(ctx, [[40, 330], [700, 480], [1040, 300]], t, { tension: 1, lit: .6 }); ctx.fillStyle = '#ff2d55'; ctx.beginPath(); ctx.arc(700, 480, 5, 0, 7); ctx.fill(); lab(ctx, 'tension 1 (vibrating, snag point)', 20, 300);
  // cuts at several moments
  [[.04, 640], [.2, 860], [.7, 1080], [2.2, 1300]].forEach(([u, y], i) => { LM.umbilical(ctx, [[40, y], [1040, y - 60]], t, { tension: 1, lit: .6, w: 16, cut: { at: t - u, frac: .5 } }); lab(ctx, 'cut +' + u + 's', 20, y - 70); });
  // gas clocks
  [1, .62, .22, .04].forEach((f, i) => { LM.gasClock(ctx, 150 + i * 260, 1560, 90, f, t, { w: 4 }); lab(ctx, 'frac ' + f, 90 + i * 260, 1680); });
  LM.alarm(ctx, 120, 1860, t, { s: 1 }); LM.alarm(ctx, 300, 1860, t + .3, { color: COL.red, mode: 'blink', s: 1 }); LM.alarm(ctx, 470, 1860, t, { on: 0 });
  LM.rovFeed(ctx, 620, 1740, 400, 150, t, { lock: .8, on: 1 });
}
function pageBell(ctx, t) {
  cell(ctx, 0, 0, 540, 1100, c => {
    const pre = LM.bell(null, 270, 560, .9, t, { glow: 1, hatch: 1, swing: .06 * Math.sin(t), lamps: .8, wireTop: -20 });
    LM.sea(c, t, { dark: .55, lights: pre.lights }); LM.bell(c, 270, 560, .9, t, { glow: 1, hatch: 1, swing: .06 * Math.sin(t), lamps: .8, wireTop: -20 });
    LM.diver(c, 220, 1010, .32, t, { pose: 'swim', lamp: 1, rot: -.3 });
  });
  cell(ctx, 540, 0, 540, 1100, c => {
    const pre = LM.bell(null, 810, 560, .9, t, { glow: .35, hatch: 0, amb: .15 });
    LM.sea(c, t, { dark: .8, lights: pre.lights }); LM.bell(c, 810, 560, .9, t, { glow: .35, hatch: 0, amb: .15 });
  });
  cell(ctx, 0, 1100, 1080, 820, c => {
    c.fillStyle = '#020303'; c.fillRect(0, 1100, 1080, 820);
    LM.bell(c, 300, 1510, .42, t, { inside: true, bellmanPose: 'sit' });
    LM.bell(c, 780, 1510, .42, t, { inside: true, bellmanMix: 1, glow: .9 });
  });
  lab(ctx, 'bell: glow + hatch + lamps + swing', 16, 30); lab(ctx, 'bell: dim, hatch shut', 556, 30); lab(ctx, 'interior: sit / lean', 16, 1130);
}
function pageShip(ctx, t) {
  cell(ctx, 0, 0, 1080, 960, c => {
    LM.sea(c, t, { dark: .35, surface: .5, surfaceY: 380 });
    const yAt = LM.swell(null, 380, t, 14);
    const roll = Math.atan2(yAt(840) - yAt(240), 600) * .6;
    const sh = LM.ship(null, 540, yAt(540) + 6, 1.05, t, { roll, under: 1, thrust: 1 });
    LM.swell(c, 380, t, 14, { caps: .9 });
    LM.ship(c, 540, yAt(540) + 6, 1.05, t, { roll, under: 1, thrust: 1 });
    c.strokeStyle = 'rgba(168,182,186,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(sh.moonpool[0], sh.moonpool[1]); c.lineTo(sh.moonpool[0] - 30, 960); c.stroke();
  });
  cell(ctx, 0, 960, 1080, 960, c => {
    c.fillStyle = '#05100f'; c.fillRect(0, 960, 1080, 960);
    c.strokeStyle = 'rgba(160,220,230,.15)'; c.lineWidth = 2; c.beginPath(); c.moveTo(540, 1100); c.lineTo(540, 1800); c.moveTo(200, 1440); c.lineTo(880, 1440); c.stroke();
    LM.ship(c, 540, 1440, .95, t, { view: 'top', rot: -.25, thrust: 1 });
    LM.alarm(c, 900, 1820, t, { s: 1.2 });
  });
  lab(ctx, 'ship side + swell caps + under + thrust', 16, 30); lab(ctx, 'ship top + thrust · alarm', 16, 990);
}
function pageContext(ctx, t) {
  // a hook-like frame with the title + subtitle overlays on, to judge the layout and the claustrophobic look
  const cutAt = 4.12, sh = LM.shake(t, .6, 3), j = LM.jolt(t, cutAt, 1);
  const SX = 420, SY = 1190, SS = 1.15;
  const st = LM.structure(null, SX, SY, SS, t);
  const DO = { pose: 'crouch', dir: -1, anchor: 'base', life: 1, bpm: 100, adj: { T: .7, h: .1 }, light: [1080, 420] };
  const dv = LM.diver(null, 560, st.topY + 6, .6, t, DO);
  const pts = [[1180, 300], [st.hook[0] + 4, st.hook[1] + 9], [dv.umb[0] + 70, dv.umb[1] + 40], dv.umb];
  const UO = { tension: 1, w: 14, lit: .45, cut: { at: cutAt, frac: .3 } };
  const um = LM.umbilical(null, pts, t, UO);
  const lights = dv.lights.concat([LM.light(um.cut[0], um.cut[1], 520, COL.lamp, .9 * um.flash)]);
  LM.sea(ctx, t, { dark: .6, lights, cam: [sh.x * 3, sh.y * 3] });
  ctx.save(); ctx.translate(sh.x + j.x, sh.y + j.y);
  LM.seabed(ctx, SY - 6, t, { dark: .6, lights }); LM.structure(ctx, SX, SY, SS, t, { lights, amb: .05 });
  LM.umbilical(ctx, pts, t, UO); LM.diver(ctx, 560, st.topY + 6, .6, t, DO);
  LM.gasClock(ctx, dv.chest[0], dv.chest[1], 140, t < cutAt ? 1 : 1 - (t - cutAt) * .08, t, { w: 4 });
  ctx.restore();
  L.flash(ctx, .1 * um.flash, '#e8f6ff');
  LM.subBand(ctx, .8);
  if (t > 4.7) { // perf probe (stderr)
    const [, x] = L.buf('perf'); const time = (n, f) => { const t0 = performance.now(); for (let i = 0; i < 6; i++) f(); return ((performance.now() - t0) / 6).toFixed(2) + 'ms'; };
    const r = {
      sea: time('sea', () => LM.sea(x, t, { dark: .5, lights })), seabed: time('bed', () => LM.seabed(x, 1200, t, { lights })),
      struct: time('st', () => LM.structure(x, SX, SY, SS, t, { lights })), structBig: time('st2', () => LM.structure(x, -220, 2180, 2.2, t, { lights })),
      diver: time('dv', () => LM.diver(x, 540, 900, .6, t, { life: 1, lamp: 1 })), diverBig: time('dv2', () => LM.diver(x, 540, 900, 1.3, t, { life: 1, lamp: 1 })),
      umb: time('um', () => LM.umbilical(x, pts, t, UO)), umbIntact: time('um2', () => LM.umbilical(x, pts, t, { tension: .5, pulse: 1 })),
      bell: time('bell', () => LM.bell(x, 540, 800, 1, t, { hatch: 1, lamps: 1 })), bellIn: time('bi', () => LM.bell(x, 540, 900, .9, t, { inside: true })),
      ship: time('ship', () => LM.ship(x, 540, 500, 1, t, { under: 1, thrust: 1 })), shipTop: time('sht', () => LM.ship(x, 540, 900, 1, t, { view: 'top', thrust: 1 })),
      swell: time('sw', () => LM.swell(x, 400, t, 14, { caps: 1 })), clock: time('gc', () => LM.gasClock(x, 540, 900, 140, .3, t)),
      alarm: time('al', () => LM.alarm(x, 540, 900, t)), rov: time('rov', () => LM.rovFeed(x, 300, 600, 400, 260, t, { lock: 1 })),
    };
    console.warn('KITPERF ' + JSON.stringify(r));
  }
}
window.PK.scenes.hook = function (ctx, t, d, info) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920);
  if (t < .6) pageSea(ctx, t); else if (t < 1.2) pageStruct(ctx, t); else if (t < 1.8) pageDivers(ctx, t); else if (t < 2.4) pageLine(ctx, t);
  else if (t < 3.0) pageBell(ctx, t); else if (t < 3.9) pageShip(ctx, t); else pageContext(ctx, t);
};
})();
