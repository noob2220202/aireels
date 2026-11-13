// lab/e_bamti_doodle/render.cjs — renders scene.js with Playwright -> out/scene.png (1080x1920) + safe-zone report
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const here = __dirname, fonts = path.resolve(here, '../../assets/fonts'), out = path.join(here, 'out');
const face = (fam, file) => `@font-face{font-family:"${fam}";src:url("file://${fonts}/${file}") format("truetype");}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face('PretendardXB', 'Pretendard-ExtraBold.ttf')}${face('PretendardB', 'Pretendard-Bold.ttf')}${face('Gaegu', 'Gaegu-Bold.ttf')}
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
    await Promise.all(['800 58px "PretendardXB"', '700 56px "PretendardB"', '700 52px "Gaegu"'].map(f => document.fonts.load(f, '할머니빵301')));
    await document.fonts.ready;
    const c = document.getElementById('c'); const t0 = performance.now(); const rep = SCENE.draw(c);
    return { png: c.toDataURL('image/png'), rep, ms: performance.now() - t0 };
  });
  fs.writeFileSync(path.join(out, 'scene.png'), Buffer.from(res.png.split(',')[1], 'base64'));
  // Instagram UI zones: top 0-190, bottom 1560-1920, right column x>950 for y 900-1560
  const bad = b => b[1] < 190 || b[3] > 1560 || b[0] < 20 || b[2] > 1060 || (b[2] > 950 && b[3] > 900 && b[1] < 1560);
  const fmt = b => b.map(v => Math.round(v)).join(',');
  res.rep.faces.forEach((b, i) => console.log(`face ${i}: ${fmt(b)} ${bad(b) ? 'OUT OF SAFE ZONE' : 'ok'}`));
  res.rep.texts.forEach((b, i) => console.log(`text ${i}: ${fmt(b)} ${bad(b) ? 'OUT OF SAFE ZONE' : 'ok'}`));
  console.log('drawn in', res.ms.toFixed(0), 'ms ->', path.join(out, 'scene.png'));
  await browser.close(); fs.unlinkSync(page0);
})();
