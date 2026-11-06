// blackout: placeholder (to be animated)
(function () {
const PK = window.PK;
PK.scenes.blackout = function (ctx, t, d, info) {
  L.gradBG(ctx, [[0, '#02040a'], [1, '#000000']]);
  L.text(ctx, 'blackout', 540, 900, { size: 60, color: '#4a5a6a' });
};
})();
