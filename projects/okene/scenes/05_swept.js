// swept: placeholder
(function () {
const { W, H, E, P, text } = L;
const PK = window.PK; const { K, at, dark, clipStage, beam, hand } = PK;
window.PK.scenes.swept = function (ctx, t, d, info) {
  dark(ctx, t, { k: .8, seed: 7 }); text(ctx, 'swept', 540, 860, { size: 60, color: '#557' });
};
})();
