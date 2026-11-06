// signal: placeholder
(function () {
const { W, H, E, P, text } = L;
const PK = window.PK; const { K, at, dark, clipStage, beam, hand } = PK;
window.PK.scenes.signal = function (ctx, t, d, info) {
  const D = info.sc.data || {}; clipStage(ctx, t, d, info, { who: D.who || '', where: D.where || '', seed: 12 });
};
})();
