// hell: placeholder
(function () {
const { W, H, E, P, text } = L;
const { K, at, dark, clipStage } = window.PK;
window.PK.scenes.hell = function (ctx, t, d, info) {
  const D = (info.sc.data || {}); clipStage(ctx, t, d, info, { who: D.who || '', where: D.where || '', seed: 6 });
};
})();
