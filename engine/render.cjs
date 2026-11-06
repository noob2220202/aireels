#!/usr/bin/env node
// Deterministic frame renderer: Playwright Chromium canvas -> ffmpeg.
// usage:
//   node engine/render.cjs <projectDir> [--fps 30] [--workers 3] [--from s] [--to s]
//   node engine/render.cjs <projectDir> --stills 0.5,3,7.2 [--outdir dir]
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const projectDir = path.resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const fps = +opt('fps', 30);
const workers = +opt('workers', 3);
const stills = opt('stills', null);
const buildDir = path.join(projectDir, 'build');
const outdir = path.resolve(opt('outdir', path.join(buildDir, stills ? 'stills' : 'frames')));
fs.mkdirSync(outdir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port, TL) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/engine/player.html`);
  const rel = path.relative(ROOT, projectDir);
  await page.addScriptTag({ url: `/${rel}/scenes.js?${Date.now()}` });
  await page.addScriptTag({ url: `/engine/player.js?${Date.now()}` });
  const info = await page.evaluate(tl => window.setup(tl), TL);
  if (info.fonts.some(f => !f)) console.error('WARNING font check failed', info.fonts);
  return page;
}

async function renderRange(browser, port, TL, f0, f1, outFile) {
  const page = await openPage(browser, port, TL);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(fps), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate(t => { window.renderAt(t); return window.grab(.96); }, f / fps);
    const ok = ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 90 === 0) process.stderr.write(`  [${path.basename(outFile)}] frame ${f}/${f1}\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', c => c === 0 ? r() : j(new Error('ffmpeg exit ' + c))));
  await page.close();
}

(async () => {
  const TL = JSON.parse(fs.readFileSync(path.join(buildDir, 'timeline.json'), 'utf8'));
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const t0 = Date.now();
  try {
    if (stills) {
      const page = await openPage(browser, port, TL);
      if (args.includes('--cover')) await page.evaluate(() => { window.COVER_MODE = true; });
      for (const s of stills.split(',').map(Number)) {
        const url = await page.evaluate(t => { window.renderAt(t); return window.grabPng(); }, s);
        const f = path.join(outdir, `still_${s.toFixed(2).padStart(6, '0')}.png`);
        fs.writeFileSync(f, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
        console.log(f);
      }
    } else {
      const from = +opt('from', 0), to = +opt('to', TL.duration);
      const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
      const n = Math.max(1, Math.min(workers, Math.ceil((F1 - F0) / 60)));
      const per = Math.ceil((F1 - F0) / n);
      const parts = [];
      await Promise.all(Array.from({ length: n }, (_, k) => {
        const a = F0 + k * per, b = Math.min(F1, a + per); const f = path.join(outdir, `part${k}.mp4`); parts.push(f);
        return renderRange(browser, port, TL, a, b, f);
      }));
      const list = path.join(outdir, 'parts.txt');
      fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
      const out = path.join(buildDir, 'video_only.mp4');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
      console.log(out);
    }
  } finally {
    await browser.close(); srv.close();
    console.error(`render done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
})().catch(e => { console.error(e); process.exit(1); });
