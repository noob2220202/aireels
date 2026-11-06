// lost: placeholder
(function () {
const { W, H, E, P, text } = L;
const { K, at, dark, clipStage } = window.PK;
window.PK.scenes.lost = function (ctx, t, d, info) {
  dark(ctx, t, { k: .8, seed: 17 }); text(ctx, 'lost', 540, 860, { size: 60, color: '#557' });
};
})();
