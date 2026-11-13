// lab/b_casual/render.cjs -- renders out/scene.png (1080x1920) and out/faces.png (two faces, 2x) with Playwright.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const here = __dirname, fonts = path.resolve(here, '../../assets/fonts');
const FACES = [ { x: 92, y: 718, w: 400, h: 420 }, { x: 580, y: 440, w: 400, h: 420 } ];   // heroine, hero (scene px)
const fam = { PretendardSB: 'Pretendard-SemiBold', PretendardB: 'Pretendard-Bold', BlackHan: 'BlackHanSans-Regular', Jua: 'Jua-Regular', GowunDodum: 'GowunDodum-Regular' };
const html = `<!doctype html><meta charset="utf-8"><style>
${Object.entries(fam).map(([f, file]) => `@font-face{font-family:${f};src:url("file://${fonts}/${file}.ttf");}`).join('\n')}
body{margin:0;background:#222}</style><canvas id="c" width="1080" height="1920"></canvas><script src="file://${here}/scene.js"></script>`;
(async () => {
  fs.mkdirSync(path.join(here, 'out'), { recursive: true });
  const page0 = path.join(here, 'out', '_page.html'); fs.writeFileSync(page0, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', (m) => console.log('[page]', m.text())); page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('file://' + page0);
  const res = await page.evaluate(async ({ fams, FACES }) => {
    await Promise.all(fams.map((f) => document.fonts.load(`56px ${f}`, '저기덜컥302')));
    const c = document.getElementById('c'); CASUAL.drawScene(c.getContext('2d'));
    const big = document.createElement('canvas'); big.width = 2160; big.height = 3840;
    const b = big.getContext('2d'); b.scale(2, 2); CASUAL.drawScene(b);
    const f = document.createElement('canvas'); const gap = 24; f.width = FACES[0].w * 2 + FACES[1].w * 2 + gap * 3; f.height = FACES[0].h * 2 + gap * 2;
    const x = f.getContext('2d'); x.fillStyle = '#fff8ee'; x.fillRect(0, 0, f.width, f.height);
    let ox = gap; for (const r of FACES) { x.drawImage(big, r.x * 2, r.y * 2, r.w * 2, r.h * 2, ox, gap, r.w * 2, r.h * 2); ox += r.w * 2 + gap; }
    return { scene: c.toDataURL('image/png'), faces: f.toDataURL('image/png') };
  }, { fams: Object.keys(fam), FACES });
  for (const k of ['scene', 'faces']) fs.writeFileSync(path.join(here, 'out', k + '.png'), Buffer.from(res[k].split(',')[1], 'base64'));
  await browser.close(); console.log('ok');
})();
