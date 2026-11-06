// divers: "그때, 선체를 두드리는 망치 소리가 들렸습니다."
// Same cabin as the hand scene (PK.room geometry, level .6), now inside a cutaway of the upside-down hull: the old bottom
// plating overhead, the hull side plating right behind the cabin's right wall, the black sea outside. Opens close on his dim
// light on the mattresses, iris tight, slow heart (continuing the oxygen clip). '선체를' -> the camera pulls back fast to
// reveal the hull around him while a cold glint runs along the plating. '두드리는' -> stillness, the camera settles.
// '망치' (+ the knock sfx: 3 hits, then 3 more after '들렸습니다') -> each hit lands on the plating outside (unseen source,
// only a cold glint on the outer skin) and a shock ring tears through the steel: the plating, the frames and the cabin walls
// flare as the ring passes, a faint wavefront crosses the air and water, the camera jolts, dust and rust shake off the ceiling,
// the water surface shivers, and his light flares awake (heart races, tunnel vision opens). The text '쿵, 쿵, 쿵' builds
// one word per hit with '— 오케네 (로이터)' under it, and pulses again on the second set. Ends pushing in toward him.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, rgba, glow, text, measure, FONT } = L;
const PK = window.PK;

window.PK.scenes.divers = function (ctx, t, d, info) {
  const { at, beat, souls } = PK, KN = PK.KN, { hi, nz, fb } = KN, D = info.sc.data || {};
  const tSe = at(info, '선체를', .2), tDu = at(info, '두드리는', .33), tMa = at(info, '망치', .47), tDl = at(info, '들렸습니다', .65);
  let K = KN.knocks(info, info.sc.t0 - .01, info.sc.t1);
  if (K.length < 6) K = [0, 1, 2].map(k => tMa - .1 + k * .45).concat([0, 1, 2].map(k => tDl + .4 + k * .45));
  const S = KN.SRC;
  const rings = K.map((tk, i) => ({ x: S.x, y: S.y, t0: tk, v: 1050, life: 1.9, col: '#dff3ff', a: i < 3 ? 1 : .8, band: 34, wa: i < 3 ? 1 : .8 }));

  // his light: dim and slow -> jolted awake by the first hit, flares on every hit
  const awake = P(t, K[0] - .02, K[0] + .4, E.outQ);
  const fl = K.reduce((s, tk) => s + (t >= tk + .35 ? Math.exp(-(t - tk - .35) * 5) : 0), 0);   // flare when the ring reaches him
  const I = lerp(.5, 1, awake) * (1 - .1 * (.5 + .5 * nz(t * 8, 5)) * (1 - awake)) + .25 * Math.min(1, fl);
  const bpm = lerp(62, 128, awake), bt = beat(t, bpm);
  const lx = 812, ly = 746 - 5 * awake - 3 * Math.min(1, fl) + Math.sin(t * 1.1) * 1.5;

  // camera: close on him -> pull back on '선체를' to reveal the hull -> hold through the hits -> push in toward him
  const pull = P(t, tSe - .05, tSe + .85, E.inOutC), push = P(t, K[3] - .15, d + .3, E.inOutQ);
  let cx = lerp(800, 604, pull), cy = lerp(715, 786, pull), z = lerp(lerp(1.78, 1.66, P(t, -.2, tSe, E.inOutQ)), .7, pull);
  cx = lerp(cx, 760, push); cy = lerp(cy, 740, push); z = lerp(z, .98, push);
  const dr = { x: fb(t * .35, 211) * 12, y: fb(t * .3, 212) * 12, r: fb(t * .25, 213) * .005 };
  const [jx, jy, jr] = KN.jolt(t, K, 7, 3);

  ctx.save();
  ctx.translate(540 + dr.x + jx, 860 + dr.y + jy); ctx.rotate(dr.r + jr); ctx.scale(z, z); ctx.translate(-cx, -cy);
  const sweep = P(t, tSe - .05, tSe + 1.05, E.inOutQ);
  KN.hull(ctx, t, { sweep, sweepA: Math.sin(Math.PI * sweep) * .9 });
  const warm = (.45 + .35 * awake + .15 * bt * awake) * (.8 + .2 * I);
  KN.cabin(ctx, t, { warm, lx, ly, rings });
  KN.rings(ctx, t, rings);
  KN.dust(ctx, t, rings, { lx, ly, warm: .8 * I });
  KN.light(ctx, q => {
    KN.heart(q, lx, ly, I, bt, lerp(.9, 1.15, awake));
    K.forEach((tk, i) => { const u = t - tk; if (u < 0 || u > .8) return; const e = Math.exp(-u * 7) * (i < 3 ? 1 : .8);   // the hit, outside on the skin
      glow(q, S.x + 6, S.y - 6, 95, '#bfe6ff', .35 * e); glow(q, S.x + 3, S.y - 3, 26, '#ffffff', .7 * e); });
  });
  souls(ctx, t, [{ x: lx, y: ly, a: clamp(.55 + .45 * I), s: lerp(1.25, 1.75, awake) * lerp(1, 1.45, pull * (1 - push)) + .35 * Math.min(1, fl) }], { bpm });
  const LS = ctx.getTransform().transformPoint(new DOMPoint(lx, ly));
  ctx.restore();

  KN.iris(ctx, lerp(.58, .26, awake) + .12 * (1 - pull) * (1 - awake) - .06 * Math.min(1, fl), .4 * bt, LS.x, LS.y - 60);
  KN.subBand(ctx);

  // '쿵, 쿵, 쿵 — 오케네 (로이터)': one word per hit, pulsing again on the second set
  const bang = D.bang || '';
  if (bang) {
    const [main, src] = bang.split(' — '), words = main.split(' '), size = 108, gap = 34;
    const ws = words.map(w => measure(ctx, w, size, FONT.disp, 400)), tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let x = 540 - tot / 2; const y = 1000;
    words.forEach((w, i) => {
      const tk = K[i], tk2 = K[i + 3], cxw = x + ws[i] / 2; x += ws[i] + gap;
      if (tk == null || t < tk - .02) return;
      const u = t - tk, u2 = tk2 != null && t > tk2 ? t - tk2 : 9;
      const sc = 1 + .55 * Math.exp(-u * 10) + .2 * Math.exp(-u2 * 8), a = P(t, tk - .02, tk + .06), hot = Math.exp(-u * 6) + Math.exp(-u2 * 6);
      glow(ctx, cxw, y, 150, '#9fd8ff', .22 * Math.min(1, hot));
      ctx.save(); ctx.translate(cxw, y); ctx.scale(sc, sc);
      text(ctx, w, 0, 0, { size, family: FONT.disp, weight: 400, color: hot > .3 ? '#eaf7ff' : '#dfe9ef', stroke: '#000', strokeW: 12, alpha: a });
      ctx.restore();
    });
    if (src) text(ctx, '— ' + src, 540, 1080, { size: 36, weight: 800, color: '#a9cbdb', stroke: '#000', strokeW: 6, alpha: P(t, K[2] + .1, K[2] + .45, E.outQ) });
  }
};
})();
