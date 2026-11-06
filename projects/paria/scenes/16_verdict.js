// verdict: placeholder
(function () {
const { W, H, E, P, text } = L;
const { K, at, dark, clipStage } = window.PK;
window.PK.scenes.verdict = function (ctx, t, d, info) {
  dark(ctx, t, { k: .8, seed: 18 }); text(ctx, 'verdict', 540, 860, { size: 60, color: '#557' });
};
})();
