// Scene compositor. A project defines window.PROJECT = { scenes: {id: (ctx, t, d, info) => void}, post: (ctx, T, TL) => void }
'use strict';
(function () {
  const { W, H, buf, TRANS, initTextures } = window.L;
  let TL = null;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  function drawScene(x, sc, T) {
    const fn = window.PROJECT.scenes[sc.id];
    x.save();
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    if (fn) fn(x, T - sc.t0, sc.t1 - sc.t0, { T, sc, TL });
    x.restore();
  }

  window.setup = async function (timeline) {
    TL = timeline;
    const fams = [
      ['900', 'Pretendard'], ['800', 'Pretendard'], ['700', 'Pretendard'], ['500', 'Pretendard'],
      ['400', 'Black Han Sans'], ['900', 'Noto Serif KR'], ['400', 'Special Elite'],
    ];
    await Promise.all(fams.map(([w, f]) => document.fonts.load(`${w} 40px "${f}"`, '가A1')));
    await document.fonts.ready;
    initTextures();
    if (window.PROJECT.init) await window.PROJECT.init(TL);
    return { duration: TL.duration, fonts: fams.map(([w, f]) => document.fonts.check(`${w} 40px "${f}"`, '가')) };
  };

  window.renderAt = function (T) {
    const S = TL.scenes;
    let i = S.findIndex(s => T >= s.t0 && T < s.t1);
    if (i < 0) i = T < S[0].t0 ? 0 : S.length - 1;
    // transition windows: scene k (k>0) may define trans {type,dur} centred on its start boundary
    let done = false;
    for (const k of [i, i + 1]) {
      const sc = S[k]; if (!sc || !sc.trans || k === 0) continue;
      const b = sc.t0, d = sc.trans.dur || .4;
      if (T >= b - d / 2 && T < b + d / 2) {
        const [A, ax] = buf('A'), [B, bx] = buf('B');
        drawScene(ax, S[k - 1], T); drawScene(bx, sc, T);
        ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        (TRANS[sc.trans.type] || TRANS.fade)(ctx, A, B, (T - (b - d / 2)) / d);
        ctx.restore(); done = true; break;
      }
    }
    if (!done) { ctx.save(); drawScene(ctx, S[i], T); ctx.restore(); }
    if (window.PROJECT.post) { ctx.save(); window.PROJECT.post(ctx, T, TL); ctx.restore(); }
  };

  window.grab = function (q = .95) { return canvas.toDataURL('image/jpeg', q); };
  window.grabPng = function () { return canvas.toDataURL('image/png'); };
})();
