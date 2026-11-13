#!/usr/bin/env node
/* engine/render.cjs: deterministic frame renderer (Playwright chromium -> ffmpeg).
 *
 *   node engine/render.cjs <build_dir> [--out video.mp4] [--workers N] [--range a,b] [--crf 17] [--preset medium]
 *   node engine/render.cjs <build_dir> --stills 0.5,3.2,10 --outdir <dir> [--small] [--debug]
 *   node engine/render.cjs <build_dir> --cover --out cover.png
 *   node engine/render.cjs <build_dir> --info            (resolved layout as JSON on stdout)
 *   node engine/render.cjs <build_dir> --serve           (preview in a browser)
 *
 * <build_dir> = series/<slug>/build/epNN (holds timeline.json). Frames are stepped at i / fps and piped
 * straight into ffmpeg as raw RGBA (no image files on disk). --workers N splits the frame range over N
 * chromium instances, each with its own encoder, and concatenates the segments without re-encoding.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2), n = argv[i + 1]; if (n === undefined || n.startsWith('--')) o[k] = true; else { o[k] = n; i++; } }
    else o._.push(a);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
if (!args._.length || args.help) {
  console.error('usage: node engine/render.cjs <build_dir> [--out f.mp4] [--workers N] [--range a,b] | --stills t1,t2 --outdir d [--small] | --cover --out f.png | --info | --serve');
  process.exit(args.help ? 0 : 2);
}
const BUILD = path.resolve(args._[0]);
const TLFILE = path.join(BUILD, 'timeline.json');
if (!fs.existsSync(TLFILE)) { console.error('render: no timeline.json in ' + BUILD + ' (run engine/build.py <script> timeline first)'); process.exit(2); }
const TL = JSON.parse(fs.readFileSync(TLFILE, 'utf8'));
const SERIES = args.series ? path.resolve(args.series) : path.resolve(BUILD, '..', '..');
const FPS = TL.fps || 30, W = TL.w || 1080, H = TL.h || 1920;
const QUIET = !!args.quiet;
const log = (...a) => { if (!QUIET) console.log(...a); };

/* ---------------------------------------------------------------- local server */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.wav': 'audio/wav', '.mp4': 'video/mp4' };
const sinks = new Map();               /* worker id -> writable (ffmpeg stdin) */
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname.startsWith('/__frame/')) {
      const sink = sinks.get(url.pathname.slice(9));
      if (!sink) { res.writeHead(404); res.end(); req.resume(); return; }
      req.on('data', (chunk) => { if (!sink.write(chunk)) { req.pause(); sink.once('drain', () => req.resume()); } });
      req.on('end', () => { res.writeHead(204); res.end(); });
      req.on('error', () => { res.writeHead(500); res.end(); });
      return;
    }
    let p = decodeURIComponent(url.pathname), base = ROOT;
    if (p.startsWith('/__build/')) { base = BUILD; p = p.slice(8); }
    else if (p.startsWith('/__series/')) { base = SERIES; p = p.slice(9); }
    const file = path.normalize(path.join(base, p));
    if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      /* no art kit yet: answer "null" instead of a noisy 404 so the player falls back to the stub */
      if (err && url.pathname === '/engine/toon/manifest.json') { res.writeHead(200, { 'Content-Type': MIME['.json'] }); res.end('null'); return; }
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  server.keepAliveTimeout = 120000;
  return new Promise((resolve) => server.listen(args.serve && args.port ? +args.port : 0, '127.0.0.1', () => resolve(server)));
}

const warnings = new Set();
async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { const t = m.type(); if (t === 'warning' || t === 'error') { const s = m.text(); if (!warnings.has(s)) { warnings.add(s); console.error((t === 'error' ? 'page error: ' : 'warn: ') + s); } } });
  page.on('pageerror', (e) => { console.error('page exception: ' + e.message); });
  await page.goto('http://127.0.0.1:' + port + '/engine/player.html' + (args.debug ? '?debug=1' : ''));
  await page.evaluate(() => window.ready);
  return page;
}
const pngOf = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

function ffmpegEncoder(out, threads) {
  const a = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', 'pipe:0', '-an',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', String(args.preset || 'medium'), '-crf', String(args.crf || 17), '-tune', 'animation', '-g', String(FPS * 2), '-threads', String(threads),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', out];
  const ff = spawn('ffmpeg', a, { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.stdin.on('error', () => {});
  const done = new Promise((resolve, reject) => { ff.on('error', reject); ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exited with ' + code))); });
  return { ff, done };
}

async function main() {
  const { chromium } = require('playwright');
  const server = await startServer(), port = server.address().port;
  if (args.serve) { console.log('preview: http://127.0.0.1:' + port + '/engine/player.html?play=1   (ctrl-c to stop)'); return; }
  const t00 = Date.now();
  try {
    if (args.stills || args.cover || args.info) {
      const browser = await chromium.launch();
      const page = await openPage(browser, port);
      if (args.info) { process.stdout.write(JSON.stringify(await page.evaluate(() => window.sceneInfo()), null, 1) + '\n'); }
      if (args.cover) {
        const out = path.resolve(typeof args.out === 'string' ? args.out : path.join(BUILD, 'cover.png'));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, pngOf(await page.evaluate(() => { window.renderCover(); return document.getElementById('stage').toDataURL('image/png'); })));
        log('cover -> ' + path.relative(process.cwd(), out));
      }
      if (args.stills) {
        const times = String(args.stills).split(',').map(Number).filter(v => !isNaN(v));
        const dir = path.resolve(typeof args.outdir === 'string' ? args.outdir : path.join(BUILD, 'stills'));
        fs.mkdirSync(dir, { recursive: true });
        for (let i = 0; i < times.length; i++) {
          const r = await page.evaluate(({ t, small }) => {
            const t0 = performance.now(); window.renderFrame(t); const ms = performance.now() - t0;
            const cv = document.getElementById('stage'), o = { ms, png: cv.toDataURL('image/png') };
            if (small) { const c = document.createElement('canvas'); c.width = 360; c.height = 640; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, 360, 640); o.small = c.toDataURL('image/png'); }
            return o;
          }, { t: times[i], small: !!args.small });
          const name = (args.prefix ? args.prefix + '_' : '') + 't' + times[i].toFixed(2).padStart(6, '0');
          fs.writeFileSync(path.join(dir, name + '.png'), pngOf(r.png));
          if (r.small) fs.writeFileSync(path.join(dir, name + '_small.png'), pngOf(r.small));
          log('still ' + name + '.png  (' + r.ms.toFixed(0) + ' ms)');
        }
      }
      await browser.close();
      return;
    }

    /* ---------------- video ---------------- */
    const total = Math.round(TL.duration * FPS);
    let f0 = 0, f1 = total;
    if (args.range) { const [a, b] = String(args.range).split(',').map(Number); f0 = Math.max(0, Math.round(a * FPS)); f1 = Math.min(total, Math.round(b * FPS)); }
    const n = f1 - f0;
    if (n <= 0) throw new Error('empty frame range');
    const N = Math.max(1, Math.min(parseInt(args.workers || 1, 10) || 1, 8, Math.ceil(n / 30)));
    const out = path.resolve(typeof args.out === 'string' ? args.out : path.join(BUILD, 'video.mp4'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const threads = Math.max(1, Math.floor(os.cpus().length / N));
    log('render: ' + n + ' frames (' + (f0 / FPS).toFixed(2) + 's - ' + (f1 / FPS).toFixed(2) + 's) at ' + FPS + ' fps, ' + N + ' worker' + (N > 1 ? 's' : ''));
    let doneFrames = 0, lastLog = Date.now(), drawMs = 0;
    const tStart = Date.now();
    const progress = (k, ms) => {
      doneFrames += k; drawMs += ms;
      const now = Date.now();
      if (now - lastLog > 2500 || doneFrames === n) {
        lastLog = now; const el = (now - tStart) / 1000, per = el * 1000 / doneFrames;
        log('  ' + String(doneFrames).padStart(5) + '/' + n + '  ' + (100 * doneFrames / n).toFixed(0).padStart(3) + '%  ' + per.toFixed(1) + ' ms/frame  eta ' + ((n - doneFrames) * per / 1000).toFixed(0) + 's');
      }
    };
    const segs = [];
    const workers = [];
    for (let w = 0; w < N; w++) {
      const a = f0 + Math.floor(n * w / N), b = f0 + Math.floor(n * (w + 1) / N);
      const seg = N === 1 ? out : path.join(BUILD, '.seg_' + w + '.mp4');
      segs.push(seg);
      workers.push((async () => {
        const browser = await chromium.launch();
        const enc = ffmpegEncoder(seg, threads);
        sinks.set(String(w), enc.ff.stdin);
        try {
          const page = await openPage(browser, port);
          const BATCH = 12;
          for (let f = a; f < b; f += BATCH) {
            const to = Math.min(b, f + BATCH);
            const ms = await page.evaluate(async ({ from, to, fps, wid, W, H }) => {
              const g = document.getElementById('stage').getContext('2d'); let ms = 0;
              for (let i = from; i < to; i++) {
                const t0 = performance.now(); window.renderFrame(i / fps); ms += performance.now() - t0;
                const r = await fetch('/__frame/' + wid, { method: 'POST', body: g.getImageData(0, 0, W, H).data });
                if (!r.ok) throw new Error('frame upload failed: ' + r.status);
              }
              return ms;
            }, { from: f, to, fps: FPS, wid: String(w), W, H });
            progress(to - f, ms);
          }
        } finally {
          enc.ff.stdin.end();
          await browser.close().catch(() => {});
        }
        await enc.done;
      })());
    }
    await Promise.all(workers);
    if (N > 1) {
      const list = path.join(BUILD, '.segs.txt');
      fs.writeFileSync(list, segs.map(s => "file '" + s.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('ffmpeg concat failed');
      for (const s of segs) fs.unlinkSync(s);
      fs.unlinkSync(list);
    }
    const wall = (Date.now() - tStart) / 1000;
    log('render: done in ' + wall.toFixed(1) + 's  = ' + (wall * 1000 / n).toFixed(1) + ' ms/frame wall (' + (drawMs / n).toFixed(1) + ' ms/frame drawing), ' + N + ' worker' + (N > 1 ? 's' : '') + ' -> ' + path.relative(process.cwd(), out));
  } finally {
    server.close();
    if (!QUIET && !args.info && Date.now() - t00 > 0) { /* nothing */ }
  }
}
main().then(() => { if (!args.serve) process.exit(0); }, (e) => { console.error('render failed: ' + (e && e.stack || e)); process.exit(1); });
