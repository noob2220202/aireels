// lab/a_webtoon/render.cjs — renders scene.js with Playwright → out/scene.png, out/faces.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const here = __dirname, fonts = path.resolve(here, '../../assets/fonts'), out = path.join(here, 'out');
const face = (fam, file) => `@font-face{font-family:"${fam}";src:url("file://${fonts}/${file}") format("truetype");}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face('PretendardSB', 'Pretendard-SemiBold.ttf')}${face('GowunDodum', 'GowunDodum-Regular.ttf')}${face('Jua', 'Jua-Regular.ttf')}${face('BlackHanSans', 'BlackHanSans-Regular.ttf')}
html,body{margin:0;background:#222}</style></head><body><canvas id="c" width="1080" height="1920"></canvas>
<script src="file://${here}/scene.js"></script></body></html>`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const page0 = path.join(out, '_page.html'); fs.writeFileSync(page0, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + page0);
  const res = await page.evaluate(async () => {
    await Promise.all(['56px "PretendardSB"', '84px "Jua"', '56px "GowunDodum"', '84px "BlackHanSans"'].map(f => document.fonts.load(f, '저기덜컥301')));
    await document.fonts.ready;
    const c = document.getElementById('c'); const t0 = performance.now(); SCENE.draw(c); const ms = performance.now() - t0;
    const f = SCENE.faces, gap = 24, fc = document.createElement('canvas'); fc.width = f[0].w * 2 + f[1].w * 2 + gap * 3; fc.height = f[0].h * 2 + gap * 2;
    const x = fc.getContext('2d'); x.fillStyle = '#fbf3ea'; x.fillRect(0, 0, fc.width, fc.height); x.imageSmoothingQuality = 'high';
    f.forEach((r, i) => x.drawImage(c, r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, gap + i * (f[0].w * 2 + gap), gap, r.w * 2, r.h * 2));
    return { scene: c.toDataURL('image/png'), faces: fc.toDataURL('image/png'), ms };
  });
  fs.writeFileSync(path.join(out, 'scene.png'), Buffer.from(res.scene.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(out, 'faces.png'), Buffer.from(res.faces.split(',')[1], 'base64'));
  console.log('drawn in', res.ms.toFixed(0), 'ms');
  await browser.close();
})();
