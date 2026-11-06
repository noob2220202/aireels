(function () { const { W, H, E, P } = L; const { water, shafts, bubbles, silt, pipeSide, pipeInside, diver } = window.PK;
window.PK.scenes.test = function (ctx, t, d) {
  if (t < 1.5) { water(ctx, t); shafts(ctx, t); pipeSide(ctx, -100, 1200, 1050, 120, { t }); diver(ctx, 520, 820, 1.2, { kick: t * 6, arm: -.4, t }); bubbles(ctx, t, { x: 700, y: 760, n: 24 }); silt(ctx, t); }
  else { pipeInside(ctx, t, { torch: 1 }); diver(ctx, 540, 1000, .9, { kick: t * 3, rot: -.1, hose: false, t }); }
}; })();
