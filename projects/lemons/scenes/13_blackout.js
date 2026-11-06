window.PK.scenes.blackout = function (ctx, t, d, info) {
  ctx.fillStyle = '#020405'; ctx.fillRect(0, 0, 1080, 1920);
  L.text(ctx, 'blackout', 540, 900, { size: 64, color: '#5a7a88', align: 'center' });
};
