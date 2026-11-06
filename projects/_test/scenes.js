const { W, H, C, P, E, text, rain, gradBG, grain, vignette, subtitles, stamp, glow, camera, dust, godrays, fogLayer } = L;
window.PROJECT = {
  scenes: {
    a(ctx, t, d) {
      gradBG(ctx, [[0, '#0d1428'], [.6, '#0a0f1c'], [1, '#05070c']]);
      glow(ctx, 540, 560, 700, '#3a6fb0', .35);
      godrays(ctx, 540, 380, Math.PI / 2, .9, 1500, '#9cc3ff', .08, t);
      F.figure(ctx, 300, 1500, 700, { hat: 'fedora', coat: true, briefcase: true, walk: t * 5, face: 1, rim: '#9cc3ff', glasses: true, glint: .6 });
      F.figure(ctx, 760, 1500, 640, { female: true, skirt: true, hair: 'long', rim: '#ffb52e', armR: [-.4, -.6], face: -1 });
      fogLayer(ctx, t, 1450, 200);
      rain(ctx, t);
    },
    b(ctx, t, d) { gradBG(ctx, [[0, '#1a0b10'], [1, C.ink]]); stamp(ctx, '미제사건', 540, 900, P(t, .3, .7), {}); },
  },
  post(ctx, T, TL) { subtitles(ctx, T, TL.subs); grain(ctx, T); vignette(ctx); dust(ctx, T); },
};
