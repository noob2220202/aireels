// alive: placeholder
(function () {
const { W, H, E, P, text } = L;
const { K, at, dark, clipStage } = window.PK;
window.PK.scenes.alive = function (ctx, t, d, info) {
  dark(ctx, t, { k: .8, seed: 7 }); text(ctx, 'alive', 540, 860, { size: 60, color: '#557' });
};
})();
