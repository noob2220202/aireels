// cold: placeholder
(function () {
const { W, H, E, P, text } = L;
const PK = window.PK; const { K, at, dark, clipStage, beam, hand } = PK;
window.PK.scenes.cold = function (ctx, t, d, info) {
  dark(ctx, t, { k: .8, seed: 9 }); text(ctx, 'cold', 540, 860, { size: 60, color: '#557' });
};
})();
