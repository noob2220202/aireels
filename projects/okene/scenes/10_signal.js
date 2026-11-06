// signal (clip, BBC): Okene: "...hit back on the metal to transfer the signal, for him to know I'm still alive."
// Same cabin / hull cutaway as divers. Opens close on his light at the cabin's right wall (the hull side plating is right
// behind it, the black sea beyond), the tail of the last outside knock still ringing through the steel. His light lifts a
// small cylinder (the water-filter cartridge) and strikes the steel three times, synced to the knock sfx: each hit jolts the
// frame, flashes at the contact point and sends a WARM ring out through the plating into the sea. The camera pulls back with
// the rings: far out in the dark a diver's lamp glimmers, brightening a little as each ring reaches it. 'for him to know I'm
// still alive' -> his light beats strong and steady while the lamp holds; then the camera settles into the hand scene's
// framing of the cabin for the crossfade. Attribution card up while the voice plays.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, roundRect } = L;
const PK = window.PK;

// the water-filter cartridge: a small pleated cylinder, held at its back end by his light
function cartridge(ctx, x, y, ang, warm = 1, len = 62, r = 10) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, rgba('#ffe2bf', .5 + .4 * warm)); g.addColorStop(.35, '#8c8174'); g.addColorStop(.75, '#2c2723'); g.addColorStop(1, '#0d0b0a');
  ctx.fillStyle = g; roundRect(ctx, 0, -r, len, r * 2, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,10,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 10; k < len - 8; k += 5) { ctx.moveTo(k, -r + 2); ctx.lineTo(k, r - 2); } ctx.stroke();
  ctx.fillStyle = '#1d1a17'; ctx.fillRect(-2, -r - 1.5, 7, r * 2 + 3); ctx.fillRect(len - 5, -r - 1.5, 7, r * 2 + 3);
  ctx.fillStyle = rgba('#ffd9a8', .55 * warm); ctx.fillRect(len - 5, -r - 1.5, 7, 2.5);
  ctx.restore();
}

window.PK.scenes.signal = function (ctx, t, d, info) {
  const { beat, souls, sourceCard } = PK, KN = PK.KN, { hi, nz, fb } = KN, D = info.sc.data || {}, sc = info.sc;
  let K = KN.knocks(info, sc.t0 - .01, sc.t1); if (K.length < 3) K = [.5, 1, 1.5];
  const prev = KN.knocks(info, sc.t0 - 2.2, sc.t0 - .01);                   // the divers' last hits, still ringing
  const subs = ((info.TL && info.TL.subs) || []).filter(c => c.t0 >= sc.t0 - .01 && c.t0 < sc.t1);
  const s2 = subs[1] ? subs[1].t0 - sc.t0 : (sc.voice_t - sc.t0) + (sc.voice_end - sc.voice_t) * .62;
  const S = KN.SRC, LMP = { x: 1380, y: 640 };
  const C = { x: 940, y: 690 }, ANG = -.42, LEN = 62, dir = [Math.cos(ANG), Math.sin(ANG)];
  const PH = { x: C.x - dir[0] * (LEN + 8), y: C.y - dir[1] * (LEN + 8) }, PB = { x: PH.x - 30, y: PH.y + 14 }, REST = { x: 812, y: 746 };

  const rings = prev.map(tk => ({ x: S.x, y: S.y, t0: tk, v: 1050, life: 1.9, col: '#dff3ff', a: .8, band: 34, wa: .8 }))
    .concat(K.map(tk => ({ x: C.x + 6, y: C.y, t0: tk, v: 430, life: 3.4, col: '#ffd39a', a: 1, band: 30, wa: .7, dustA: .7 })));
  // 'for him to know I'm still alive': each heartbeat (100 bpm from here on) sends a soft warm pulse out through the hull,
  // far enough to reach the lamp
  const HB = [], HV = 600; for (let k = Math.ceil((s2 - .9) / .6); k * .6 < d - 1.05; k++) HB.push(k * .6);
  HB.forEach(tk => rings.push({ x: REST.x, y: REST.y, t0: tk, v: HV, life: 1.6, col: '#ffb347', a: .34, band: 20, wa: .2, dust: 0 }));

  // his light + the cartridge: lift, three strikes, back down onto the mattresses
  const ready = P(t, .02, K[0] - .24, E.inOutQ) * (1 - P(t, K[2] + .35, K[2] + 1.25, E.inOutQ));
  let s = 0; K.forEach(tk => { if (t > tk - .2 && t <= tk) s = Math.max(s, E.inQ((t - tk + .2) / .2)); else if (t > tk && t < tk + .26) s = Math.max(s, 1 - E.outQ((t - tk) / .26)); });
  const bx = lerp(REST.x, PB.x, ready), by = lerp(REST.y, PB.y, ready);
  const lx = lerp(bx, PH.x, s) + nz(t * .7, 31) * 2, ly = lerp(by, PH.y, s) + Math.sin(t * 1.3) * 1.5;
  const ang = lerp(lerp(-1.25, -1.0, ready), ANG, s);
  const hit = K.reduce((a, tk) => a + (t >= tk ? Math.exp(-(t - tk) * 11) : 0), 0);
  const alive = P(t, s2 - .1, s2 + .5, E.inOutQ);
  const bpm = lerp(124, 100, P(t, K[2], s2, E.inOutQ)), bt = beat(t, bpm);
  const I = .92 + .08 * nz(t * 6, 32) + .25 * Math.min(1, hit) + .2 * alive * bt;

  // camera: close on the wall -> pull back with the rings to hold his light and the lamp together -> settle into the hand
  // scene's cabin framing
  const pull = P(t, K[2] + .12, K[2] + 1.25, E.inOutC), settle = P(t, d - 1.15, d - .02, E.inOutQ);
  let cx = lerp(880, 1090, pull), cy = lerp(712, 728, pull), z = lerp(lerp(1.8, 1.9, P(t, 0, K[2], E.inOutQ)), lerp(1.02, 1.08, P(t, K[2] + 1.25, d - 1.15)), pull);
  cx = lerp(cx, 590, settle); cy = lerp(cy, 790, settle); z = lerp(z, 1.261, settle);
  const dr = { x: fb(t * .35, 311) * 12 * (1 - settle), y: fb(t * .3, 312) * 12 * (1 - settle), r: fb(t * .25, 313) * .005 * (1 - settle) };
  const [jx, jy, jr] = KN.jolt(t, K.concat(prev), 6, 9);

  ctx.save();
  ctx.translate(540 + dr.x + jx, 860 + dr.y + jy); ctx.rotate(dr.r + jr); ctx.scale(z, z); ctx.translate(-cx, -cy);
  KN.hull(ctx, t, {});
  // the lamp out in the sea: it comes up as the first ring reaches it and swells each time one of his rings arrives
  // (the three strikes, then the softer heartbeat pulses), then holds
  const arr = K.map(tk => tk + Math.hypot(LMP.x - C.x, LMP.y - C.y) / 430), arrH = HB.map(tk => tk + Math.hypot(LMP.x - REST.x, LMP.y - REST.y) / HV);
  const swell = arr.reduce((a, ta) => a + (t > ta ? Math.exp(-(t - ta) * 2.6) : 0), 0) + .6 * arrH.reduce((a, ta) => a + (t > ta ? Math.exp(-(t - ta) * 4) : 0), 0), sw = Math.min(1, swell);
  const lampI = clamp(P(t, arr[0] - .5, arr[0] + .4) * .5 + .3 * alive + .3 * sw) * (.88 + .12 * nz(t * 4, 33));
  const warm = .5 + .25 * bt * (.4 + .6 * alive) + .15 * Math.min(1, hit);
  KN.cabin(ctx, t, { warm, lx, ly, rings });
  KN.rings(ctx, t, rings);
  KN.dust(ctx, t, rings, { lx, ly, warm: .9 * I, n: 22, sz: lerp(.55, .9, pull) });
  KN.light(ctx, q => {
    KN.heart(q, lx, ly, I, bt, 1.05 + .25 * alive * bt);
    K.forEach(tk => { const u = t - tk; if (u < 0 || u > .7) return; const e = Math.exp(-u * 9); glow(q, C.x, C.y, 150, '#ffcf8a', .55 * e); glow(q, C.x, C.y, 40, '#fff6e6', .9 * e); });
    prev.forEach(tk => { const u = t - tk; if (u < 0 || u > .8) return; glow(q, S.x + 6, S.y - 6, 95, '#bfe6ff', .35 * Math.exp(-u * 7)); });
    if (lampI > 0) {
      const a0 = Math.PI - .55 + .12 * Math.sin(t * .45), sp = .26, len = 470;  // cold cone, pointed down at the hull
      const g = q.createRadialGradient(LMP.x, LMP.y, 0, LMP.x, LMP.y, len); g.addColorStop(0, rgba('#e8f6ff', .42 * lampI)); g.addColorStop(.45, rgba('#9fd8ff', .12 * lampI)); g.addColorStop(1, 'rgba(120,200,255,0)');
      q.fillStyle = g; q.beginPath(); q.moveTo(LMP.x, LMP.y); q.arc(LMP.x, LMP.y, len, a0 - sp, a0 + sp); q.closePath(); q.fill();
      glow(q, LMP.x + Math.cos(a0) * 440, LMP.y + Math.sin(a0) * 440, 110, '#9fd8ff', .1 * lampI);           // where it lands on the plating
      glow(q, LMP.x, LMP.y, 300 * (1 + .45 * sw), '#9fd8ff', .3 * lampI * (1 + sw)); glow(q, LMP.x, LMP.y, 60 * (1 + .3 * sw), '#ffffff', .85 * lampI);
    }
  });
  // silt drifting in the lamp's light
  if (lampI > .02) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const px = LMP.x - 40 - hi(i * 3 + 1) * 380 + Math.sin(t * .5 + i) * 10, py = LMP.y - 60 + hi(i * 5 + 2) * 300 + ((t * 8 * (.5 + hi(i))) % 40), dd = Math.hypot(px - LMP.x, py - LMP.y);
      ctx.fillStyle = rgba('#d8f0ff', lampI * .55 * Math.max(0, 1 - dd / 420)); ctx.fillRect(px, py, 2.4, 2.4); }
    ctx.restore(); }
  // the diver's umbilical, rising from the lamp into the dark
  if (lampI > .02) { const ug = ctx.createLinearGradient(0, LMP.y, 0, LMP.y - 520); ug.addColorStop(0, rgba('#9fc6d8', .35 * lampI)); ug.addColorStop(1, 'rgba(159,198,216,0)');
    ctx.strokeStyle = ug; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(LMP.x + 44, LMP.y + 10); ctx.bezierCurveTo(LMP.x + 70, LMP.y - 170, LMP.x - 10 + 20 * Math.sin(t * .5), LMP.y - 330, LMP.x + 40, LMP.y - 560); ctx.stroke(); }
  // a faint, faceless helmeted silhouette behind the lamp, seen only as far as the lamp and his rings light it
  const RV = PK.RV, hA = .55 * clamp(lampI * 1.2);
  if (RV && RV.helmet && hA > .02) {
    const hs = .62; ctx.save(); ctx.translate(LMP.x + 33 * hs, LMP.y + 67 * hs); ctx.scale(-1, 1);
    RV.helmet(ctx, 0, 0, hs, { a: hA, rim: '#ffb36b', rimA: .2 * clamp(lampI), cold: .2, t });
    ctx.restore();
    glow(ctx, LMP.x, LMP.y, 22, '#ffffff', .8 * lampI);
  }
  // his light holding the cartridge
  ctx.save(); ctx.globalAlpha = 1 - settle; cartridge(ctx, lx + Math.cos(ang) * 6, ly + Math.sin(ang) * 6, ang, I, LEN); ctx.restore();
  souls(ctx, t, [{ x: lx, y: ly, a: 1, s: (1.75 + .3 * Math.min(1, hit) + .25 * alive * bt) * lerp(1, 1.4, pull * (1 - settle)) }], { bpm });
  const LS = ctx.getTransform().transformPoint(new DOMPoint(lx, ly));
  ctx.restore();

  KN.iris(ctx, lerp(lerp(.3, .22, pull), .32, settle), .4 * bt, lerp(LS.x, 560, settle), lerp(LS.y - 60, 860, settle));
  KN.topMask(ctx, .88);            // the keel / double-bottom grid stays out from behind the title
  KN.subBand(ctx, .95, 1250, 1110);  // and the hull side plating (it flares with every ring) out of the subtitle band
  sourceCard(ctx, D.who || '', D.where || '', P(t, .03, .28, E.outQ) * (1 - P(t, d - .3, d - .02, E.inQ)));
};
})();
