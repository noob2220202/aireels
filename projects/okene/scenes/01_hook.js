// hook: placeholder
(function () {
const { W, H, E, P, text } = L;
const PK = window.PK; const { K, at, dark, clipStage, beam, hand } = PK;
window.PK.scenes.hook = function (ctx, t, d, info) {
  dark(ctx, t, { k: .6, seed: 3 }); beam(ctx, t, 260, 700, .5, { a: 1 }); hand(ctx, 760, 860, 1.2, { dir: -1, rot: -.2, curl: P(t, 2, 2.6) }); const top = 0; PK.room(ctx, t, { x: 140, y: 1000, w: 800, h: 200, level: .5 });
};
})();
