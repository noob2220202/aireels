// Playwright harness: renders lab/c_lineless/out/scene.png (1080x1920) and out/faces.png (two face crops, 2x, side by side)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = __dirname, out = path.join(dir, 'out'), fonts = path.resolve(dir, '../../assets/fonts');
  fs.mkdirSync(out, { recursive: true });
  const ff = (fam, file, w) => `@font-face{font-family:"${fam}";src:url("file://${fonts}/${file}");font-weight:${w};}`;
  const html = `<!doctype html><meta charset="utf-8"><style>
${ff('Pretendard', 'Pretendard-SemiBold.ttf', 600)}${ff('Pretendard', 'Pretendard-Bold.ttf', 700)}
${ff('Black Han Sans', 'BlackHanSans-Regular.ttf', 400)}${ff('Jua', 'Jua-Regular.ttf', 400)}${ff('Gowun Dodum', 'GowunDodum-Regular.ttf', 400)}
body{margin:0;background:#222}</style><canvas id="c"></canvas><canvas id="f"></canvas><script src="file://${dir}/scene.js"></script>`;
  const page_html = path.join(out, '_page.html'); fs.writeFileSync(page_html, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + page_html);
  const res = await page.evaluate(async () => {
    await Promise.all(['600 56px Pretendard', '700 40px Pretendard', '92px "Black Han Sans"', '40px Jua'].map(f => document.fonts.load(f, '저기덜컥302')));
    const c = document.getElementById('c'); SceneC.render(c);
    const f = document.getElementById('f'); f.width = 1600; f.height = 800; const x = f.getContext('2d'); x.imageSmoothingQuality = 'high';
    const crop = (cx, cy, dx) => x.drawImage(c, cx - 200, cy - 200, 400, 400, dx, 0, 800, 800);
    crop(SceneC.HER.x + 10, SceneC.HER.y + 15, 0); crop(SceneC.HIM.x - 10, SceneC.HIM.y + 20, 800);
    return { scene: c.toDataURL('image/png'), faces: f.toDataURL('image/png') };
  });
  const w = (n, d) => fs.writeFileSync(path.join(out, n), Buffer.from(d.split(',')[1], 'base64'));
  w('scene.png', res.scene); w('faces.png', res.faces);
  console.log('rendered ->', path.join(out, 'scene.png'), path.join(out, 'faces.png'));
  await browser.close();
})();
