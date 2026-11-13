/* engine/player.js: loads lib + art kit + series cast + timeline and exposes
 *   window.ready            promise, resolved when fonts, kit, cast and timeline are loaded
 *   window.renderFrame(t)   draws the 1080x1920 frame at absolute time t (seconds), deterministically
 *   window.renderCover()    draws the cover image (timeline.cover)
 *   window.sceneInfo()      resolved layout (panels, heads, bubble boxes) for tooling
 * URL parameters: tl=<timeline.json url> cast=<cast.js url> play=1 (real-time preview) debug=1 (guides)
 */
(function () {
  'use strict';
  const L = window.LIB, W = L.W, H = L.H, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const clamp = L.clamp, lerp = L.lerp, ease = L.ease, hash = L.hash, smooth = L.smooth, STYLE = L.STYLE;
  const q = new URLSearchParams(location.search);
  const P = window.PLAYER = { debug: q.get('debug') === '1', hideBubbles: false, hideBadge: false };
  let TL = null, cuts = [], pages = [], TOON = null, badge = null;
  const canvas = document.getElementById('stage');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  const buf = (w, h) => { const c = L.makeCanvas(w || W, h || H); return { c, g: c.getContext('2d') }; };
  const A = buf(), Bf = buf(), C = buf(), S1 = buf(W / 4, H / 4), S2 = buf(W / 8, H / 8), S3 = buf(W / 16, H / 16);

  /* ------------------------------------------------------------ loading */
  const FONTS = [
    ['Pretendard', 500, 'Pretendard-Medium.ttf'], ['Pretendard', 600, 'Pretendard-SemiBold.ttf'], ['Pretendard', 700, 'Pretendard-Bold.ttf'], ['Pretendard', 800, 'Pretendard-ExtraBold.ttf'],
    ['Gowun Dodum', 400, 'GowunDodum-Regular.ttf'], ['Gowun Batang', 400, 'GowunBatang-Regular.ttf'], ['Gowun Batang', 700, 'GowunBatang-Bold.ttf'],
    ['Gaegu', 400, 'Gaegu-Regular.ttf'], ['Gaegu', 700, 'Gaegu-Bold.ttf'], ['Nanum Pen', 400, 'NanumPenScript-Regular.ttf'],
    ['Jua', 400, 'Jua-Regular.ttf'], ['Black Han Sans', 400, 'BlackHanSans-Regular.ttf'], ['Dongle', 700, 'Dongle-Bold.ttf']
  ];
  async function loadFonts() {
    const base = q.get('fonts') || '../assets/fonts/';
    const css = FONTS.map(f => '@font-face{font-family:"' + f[0] + '";font-weight:' + f[1] + ';font-style:normal;src:url("' + base + f[2] + '") format("truetype");}').join('\n');
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    await Promise.all(FONTS.map(f => document.fonts.load(f[1] + ' 40px "' + f[0] + '"', '가A1').then(r => { if (!r.length) L.warn('font not loaded: ' + f[2]); }, () => L.warn('font failed: ' + f[2]))));
  }
  function loadScript(url) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.async = false; s.onload = () => res(url); s.onerror = () => rej(new Error('cannot load ' + url)); document.head.appendChild(s); });
  }
  async function loadKit() {
    let list = null;
    try { const r = await fetch('toon/manifest.json', { cache: 'no-store' }); if (r.ok) { const m = await r.json(); list = Array.isArray(m) ? m : (m.scripts || m.files || null); } } catch (e) { /* no kit yet */ }
    if (list && list.length) { for (const s of list) await loadScript(/^(https?:|\/)/.test(s) ? s : 'toon/' + String(s).replace(/^(\.\/)?(engine\/)?(toon\/)?/, '')); P.kit = 'engine/toon'; }
    else { await loadScript('toon_stub.js'); P.kit = 'stub'; }
    TOON = window.TOON;
    if (!TOON || typeof TOON.drawCharacter !== 'function') throw new Error('art kit did not define window.TOON');
  }
  async function boot() {
    await loadFonts();
    TL = window.__TIMELINE__ || await (await fetch(q.get('tl') || '/__build/timeline.json', { cache: 'no-store' })).json();
    await loadKit();
    try { await loadScript(q.get('cast') || '/__series/cast.js'); } catch (e) { L.warn('no cast.js for this series (' + e.message + ')'); }
    buildScene();
    window.renderFrame = renderFrame; window.renderCover = renderCover; window.sceneInfo = sceneInfo;
    if (q.get('play') === '1') preview(); else renderFrame(0);
    return true;
  }

  /* ------------------------------------------------------------ kit access (never let the kit crash a render) */
  const DEF_METRICS = { height: 1000, headTop: -1000, headCenter: [0, -905], headR: 95, eyeY: -898, chinY: -815, shoulderY: -785, chestY: -705, waistY: -610, hipY: -530, kneeY: -275 };
  function metrics(id) {
    try { const m = TOON.metrics(id); if (m && m.headR > 0 && m.headCenter) return m; L.warn('TOON.metrics("' + id + '") returned nothing usable'); } catch (e) { L.warn('TOON.metrics("' + id + '") failed: ' + e.message); }
    return DEF_METRICS;
  }
  function kitCall(label, fn) { try { fn(); return true; } catch (e) { L.warn(label + ' failed: ' + e.message); return false; } }

  /* ------------------------------------------------------------ scene */
  function normCam(c) {
    const o = typeof c === 'string' ? { move: c } : Object.assign({ move: 'still' }, c || {});
    if (o.amt === undefined) o.amt = ({ pushIn: 0.06, pullOut: 0.06, panLeft: 0.05, panRight: 0.05, tiltUp: 0.05, tiltDown: 0.05, drift: 0.035, shake: 0.03 })[o.move] || 0;
    o.amt = clamp(o.amt, 0, 0.12);
    return o;
  }
  function buildScene() {
    const meta = TL.meta || {};
    cuts = TL.cuts.map((c, i) => Object.assign({}, c, { i, dur: c.t1 - c.t0 }));
    pages = [];
    for (const c of cuts) {
      let pg = pages[pages.length - 1];
      if (!pg || pg.key !== c.page) { pg = { key: c.page, idx: pages.length, cuts: [], t0: c.t0 }; pages.push(pg); }
      c.pageIdx = pg.idx; c.slot = pg.cuts.length; pg.cuts.push(c.i);
    }
    pages.forEach((pg, i) => {
      pg.t1 = i + 1 < pages.length ? pages[i + 1].t0 : TL.duration;
      const c0 = cuts[pg.cuts[0]], pc = pg.cuts.map(ci => cuts[ci].pageColor).find(Boolean);
      pg.time = c0.time || 'day'; pg.color = pc || meta.pageColor || L.pageColor(pg.time); pg.dark = L.luma(pg.color) < 0.45;
    });
    cuts.forEach(c => {
      const pg = pages[c.pageIdx];
      c.fxList = (c.fx || []).map(L.fxNorm);
      c.seed = L.strSeed(c.id + '|' + (meta.series || '') + '|' + (meta.ep || 0));
      c.camSpec = normCam(c.cam);
      c.next = c.slot + 1 < pg.cuts.length ? cuts[pg.cuts[c.slot + 1]] : null;
      c.prev = c.slot > 0 ? cuts[pg.cuts[c.slot - 1]] : null;
      c.L = null;
    });
    /* series badge sprite */
    const title = String(meta.seriesTitle || ''), ep = 'EP.' + String(meta.ep === undefined ? 1 : meta.ep).padStart(2, '0');
    const g0 = A.g; g0.save(); g0.font = '600 29px "Pretendard"'; const tw = title ? g0.measureText(title).width : 0; g0.font = '800 25px "Pretendard"'; const ew = g0.measureText(ep).width; g0.restore();
    const bw = Math.ceil(22 + (title ? tw + 14 : 0) + ew + 26 + 10), bh = 60, c = L.makeCanvas(bw + 16, bh + 16), g = c.getContext('2d');
    g.translate(8, 8);
    g.beginPath(); g.roundRect(0, 0, bw, bh, 30); g.fillStyle = 'rgba(24,18,36,0.46)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5; g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = 22;
    if (title) { g.font = '600 29px "Pretendard"'; g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillText(title, x, bh / 2 + 1); x += tw + 14; }
    g.beginPath(); g.roundRect(x, 12, ew + 26, bh - 24, 18); g.fillStyle = 'rgba(255,111,152,0.92)'; g.fill();
    g.font = '800 25px "Pretendard"'; g.fillStyle = '#fff'; g.fillText(ep, x + 13, bh / 2 + 1);
    badge = { c, x: 40 - 8, y: 215 - 8, rect: { x0: 30, y0: 205, x1: 40 + bw + 12, y1: 285, w: 2600 } };
  }

  /* shot table: head diameter as a share of the usable panel height (kH) / of the width per actor (kW),
   * head-centre height in the usable area (hy), background zoom + blur */
  const SHOTS = {
    closeup: { kH: 0.44, kW: 0.52, hy: 0.57, bgZ: 1.7, blur: 0.85 },
    bust: { kH: 0.33, kW: 0.38, hy: 0.53, bgZ: 1.35, blur: 0.5 },
    waist: { kH: 0.225, kW: 0.3, hy: 0.4, bgZ: 1.15, blur: 0.25 },
    full: { figH: 0.8, bgZ: 1, blur: 0 },
    eyes: { bgZ: 2, blur: 1 },
    hands: { bgZ: 1.5, blur: 0.8 },
    back: { kH: 0.4, kW: 0.46, bgZ: 1.35, blur: 0.5 }
  };
  const AT = { 1: { left: 0.3, center: 0.5, right: 0.7 }, 2: { left: 0.27, center: 0.5, right: 0.73 }, 3: { left: 0.2, center: 0.5, right: 0.8 } };
  function localSafe(p) { const s = L.safeRect(p, 0); return { x0: s.x0 - p.x, y0: s.y0 - p.y, x1: s.x1 - p.x, y1: s.y1 - p.y }; }

  function placeActors(c, Lc) {
    const p = Lc.panel, sf = localSafe(p), Hs = Math.max(60, sf.y1 - sf.y0), Ws = p.w;
    const src = c.actors || [], isBack = a => (a.shot || 'bust') === 'back';
    const front = src.filter(a => !isBack(a)), n = Math.max(1, front.length);
    const firstSpeaker = (c.bubbles || []).map(b => b.who).find(w => w && src.some(a => a.who === w));
    const defAt = n === 1 ? [0.5] : n === 2 ? [0.27, 0.73] : n === 3 ? [0.2, 0.5, 0.8] : front.map((_, i) => 0.12 + 0.76 * i / (n - 1));
    const acts = src.map((a, idx) => {
      const m = metrics(a.who), shot = SHOTS[a.shot || 'bust'] ? (a.shot || 'bust') : (L.warn('unknown shot "' + a.shot + '" (bust)'), 'bust'), SH = SHOTS[shot];
      const fi = front.indexOf(a), table = AT[Math.min(3, n)];
      let fr = typeof a.at === 'number' ? a.at : (a.at && table[a.at] !== undefined ? table[a.at] : null);
      if (a.at && fr === null) L.warn('unknown at "' + a.at + '"');
      if (fr === null) fr = fi >= 0 ? defAt[fi] : null;
      let s, feetY;
      if (shot === 'full') { s = Math.min(SH.figH * Hs / m.height, 0.92 * Ws / (n * 3.6 * m.headR)); feetY = sf.y1 - 0.035 * Hs; }
      else if (shot === 'eyes') { s = Math.min(1.0 * p.w / Math.sqrt(n), 2.2 * p.h) / (2 * m.headR); feetY = (sf.y0 + sf.y1) / 2 - s * m.eyeY; }
      else if (shot === 'hands') { s = Math.min(1.15 * p.h / Math.abs(m.hipY - m.shoulderY), 0.95 * p.w / (3.6 * m.headR)); feetY = (sf.y0 + sf.y1) / 2 - s * (m.chestY + m.waistY) / 2; }
      else if (shot === 'back') { const D = Math.min(SH.kH * Hs, SH.kW * Ws); s = D / (2 * m.headR); feetY = sf.y1 - 0.44 * D - s * m.headCenter[1]; }
      else { const D = Math.min(SH.kH * Hs, SH.kW * Ws / Math.pow(n, 0.85)); s = D / (2 * m.headR); feetY = sf.y0 + SH.hy * Hs - s * m.headCenter[1]; }
      return { src: a, who: a.who, idx, m, shot, fr, s, feetY, back: shot === 'back' || a.facing === 'back' || a.view === 'back', isBackShot: shot === 'back' };
    });
    /* back-shot actors default to the side opposite the first front actor */
    const f0 = acts.find(a => !a.isBackShot);
    acts.forEach(a => { if (a.fr === null) a.fr = f0 && f0.fr < 0.5 ? 0.82 : 0.18; });
    acts.forEach(a => { a.x = (a.src.x !== undefined ? a.src.x : a.fr) * p.w; });
    /* spacing: heads keep a sensible distance */
    const fr2 = acts.filter(a => !a.isBackShot && a.src.x === undefined).sort((u, v) => u.x - v.x);
    for (let it = 0; it < 4; it++) for (let i = 0; i + 1 < fr2.length; i++) {
      const u = fr2[i], v = fr2[i + 1], need = 1.3 * (u.s * u.m.headR + v.s * v.m.headR) * (u.shot === 'full' || v.shot === 'full' ? 1.35 : 1), d = v.x - u.x;
      if (d < need) { const k = (need - d) / 2; u.x = Math.max(p.w * 0.1, u.x - k); v.x = Math.min(p.w * 0.9, v.x + k); }
    }
    const meanX = acts.length ? acts.reduce((s, a) => s + a.x, 0) / acts.length : p.w / 2;
    acts.forEach(a => {
      const sp = a.who === firstSpeaker && !a.isBackShot && acts.length > 1;
      if (sp) { a.s *= 1.045; a.speaker = true; }
      if (a.src.scale) a.s *= a.src.scale;
      if (a.src.y !== undefined) a.feetY += a.src.y * p.h;
      let facing = a.src.facing;
      if (!facing) facing = a.isBackShot ? 'back' : (acts.filter(x => !x.isBackShot).length < 2 ? 'front' : (a.x <= meanX ? 'right' : 'left'));
      a.facing = facing;
      a.view = a.src.view || (a.isBackShot || facing === 'back' ? 'back' : facing === 'front' ? 'front' : 'q');
      a.flip = a.src.flip !== undefined ? !!a.src.flip : (a.view === 'back' ? (a.isBackShot ? a.x > p.w / 2 : false) : facing === 'left');
      a.dir = a.view === 'front' || a.view === 'back' ? 0 : (a.flip ? -1 : 1);
      const head = () => { a.hx = a.x + (a.flip ? -1 : 1) * a.s * a.m.headCenter[0]; a.hy = a.feetY + a.s * a.m.headCenter[1]; a.hr = a.s * a.m.headR; };
      head();
      /* keep the face out of the Instagram button column */
      if (!a.isBackShot && a.src.x === undefined) for (const u of L.unsafeRects()) {
        const sx = a.hx + p.x, sy = a.hy + p.y, r = a.hr * 0.8;
        if (sy + r > u.y0 && sy - r < u.y1 && sx + r > u.x0) { a.x -= Math.min(sx + r - u.x0 + 8, p.w * 0.25); head(); }
      }
      a.fxl = a.hx + a.dir * a.hr * 0.1; a.fyl = a.feetY + a.s * (a.m.eyeY + (a.m.chinY - a.m.eyeY) * 0.42); a.frl = a.hr * 0.66;
      /* timed keys + emotes */
      a.keys = (a.src.keys || []).map(k => Object.assign({}, k, { t: k.t !== undefined ? k.t : c.t0 + (typeof k.at === 'number' ? k.at : 0) })).sort((u, v) => u.t - v.t);
      a.emotes = [];
      const em = a.src.emote;
      if (em) { const o = typeof em === 'string' ? { kind: em } : em; a.emotes.push({ kind: o.kind || o.type, t: c.t0 + (o.at !== undefined ? o.at : 0.4) }); }
      a.keys.forEach(k => { if (k.emote) a.emotes.push({ kind: k.emote === 'none' ? null : k.emote, t: k.t }); });
      a.emotes.sort((u, v) => u.t - v.t);
      const norm = (v, isExit) => { if (!v) return null; const o = typeof v === 'string' ? { from: v } : Object.assign({}, v); o.from = o.from || o.to || o.dir || 'fade'; o.dur = o.dur || 0.45; o.at = o.at !== undefined ? o.at : (isExit ? Math.max(0, c.dur - o.dur - 0.15) : 0.08); return o; };
      a.enter = norm(a.src.enter, false); a.exit = norm(a.src.exit, true);
    });
    Lc.actors = acts;
    Lc.order = acts.slice().sort((u, v) => (u.isBackShot - v.isBackShot) || ((u.speaker ? 1 : 0) - (v.speaker ? 1 : 0)) || (u.s - v.s) || (u.idx - v.idx));
    /* focus + background framing */
    const foc = acts.find(a => a.who === firstSpeaker && !a.isBackShot) || acts.find(a => !a.isBackShot) || null;
    Lc.focusActor = foc;
    Lc.focus = foc ? [clamp(foc.hx, p.w * 0.3, p.w * 0.7), clamp(foc.hy, p.h * 0.3, p.h * 0.7)] : [p.w / 2, p.h / 2];
    Lc.center = [p.w / 2, p.h / 2];
    let tight = null; acts.forEach(a => { const S = SHOTS[a.shot]; if (!a.isBackShot && (!tight || S.bgZ > tight.bgZ)) tight = S; });
    Lc.bgZoom = c.bgZoom !== undefined ? c.bgZoom : (tight ? tight.bgZ : 1);
    Lc.bgBlur = c.bgBlur !== undefined ? c.bgBlur : (tight ? tight.blur : 0);
    Lc.refScale = foc ? foc.s : p.h / 1100;
  }

  function insetRect(c, parent) {
    const sizes = { s: [400, 330], m: [500, 410], l: [620, 500] }, sz = Array.isArray(c.size) ? [c.size[0] * W, c.size[1] * H] : (sizes[c.size || 'm'] || sizes.m);
    const w = sz[0], h = sz[1];
    const base = parent ? ensureLayout(parent).panel : L.layoutRect('tall');
    const s = L.safeRect(base, 34), s2 = { x0: s.x0, y0: s.y0, x1: Math.min(s.x1, base.w > 900 ? 930 : s.x1), y1: s.y1 };
    const fx = { l: 0, c: 0.5, r: 1 }, fy = { t: 0, m: 0.5, b: 1 }, names = { tl: 'lt', tr: 'rt', bl: 'lb', br: 'rb', l: 'lm', r: 'rm', t: 'ct', b: 'cb', c: 'cm', center: 'cm' };
    const at = (kx, ky) => ({ x: Math.round(lerp(s2.x0, s2.x1 - w, kx)), y: Math.round(lerp(s2.y0, s2.y1 - h, ky)), w, h, framed: true, inset: true });
    if (Array.isArray(c.pos)) return Object.assign(at(0, 0), { x: Math.round(clamp(base.x + c.pos[0] * base.w - w / 2, s2.x0, s2.x1 - w)), y: Math.round(clamp(base.y + c.pos[1] * base.h - h / 2, s2.y0, s2.y1 - h)) });
    if (c.pos && names[c.pos]) return at(fx[names[c.pos][0]], fy[names[c.pos][1]]);
    let best = null;
    const PL = parent ? ensureLayout(parent) : null;
    for (const ky of [1, 0, 0.5]) for (const kx of [1, 0, 0.5]) {
      const r = at(kx, ky), R = { x0: r.x - 16, y0: r.y - 16, x1: r.x + w + 16, y1: r.y + h + 16 };
      let cost = (ky === 0.5 ? 40 : 0) + (kx === 0.5 ? 60 : 0) + (ky === 0 ? 25 : 0) + (kx === 0 ? 10 : 0);
      if (PL) {
        for (const hd of PL.heads) { const d = L.geom.distPointRect(hd.fx, hd.fy, R); if (d < hd.fr + 20) cost += 3000 * (1 + (hd.fr + 20 - d) / hd.fr); const d2 = L.geom.distPointRect(hd.x, hd.y, R); if (d2 < hd.r) cost += 600; }
        for (const b of PL.bub) cost += L.geom.rectOverlap(R, { x0: b.cx - b.bw / 2, y0: b.cy - b.bh / 2, x1: b.cx + b.bw / 2, y1: b.cy + b.bh / 2 }) > 0 ? 2500 : 0;
      }
      if (!best || cost < best.cost) best = { r, cost };
    }
    return best.r;
  }

  function cameraAt(c, Lc, t) {
    const p = Lc.panel, lt = t - c.t0, live = lt <= c.dur, cs = c.camSpec;
    const cam = L.camera(cs.move, clamp(lt / c.dur, 0, 1), cs.amt, Math.min(lt, c.dur), c.seed);
    const fxc = live ? L.fxCam(c.fxList, lt, c.seed, p.w) : { z: 1, x: 0, y: 0 };
    const zoomMove = cs.move === 'pushIn' || cs.move === 'pullOut';
    const f = zoomMove && cs.focus !== 'center' ? Lc.focus : Lc.center;
    return { z: cam.z * fxc.z, sx: cam.x * p.w, sy: cam.y * p.h, ox: fxc.x, oy: fxc.y, fx: f[0], fy: f[1], raw: cam };
  }
  const applyCam = (g, cam) => { g.translate(cam.fx + cam.ox, cam.fy + cam.oy); g.scale(cam.z, cam.z); g.translate(-cam.fx - cam.sx, -cam.fy - cam.sy); };
  const camPt = (cam, x, y) => [(x - cam.fx - cam.sx) * cam.z + cam.fx + cam.ox, (y - cam.fy - cam.sy) * cam.z + cam.fy + cam.oy];

  function placeBubbles(c, Lc) {
    const p = Lc.panel;
    /* heads on screen with the camera about 60% through its move */
    const cam = cameraAt(c, Lc, c.t0 + c.dur * 0.6); cam.ox = cam.oy = 0;
    Lc.heads = Lc.actors.map(a => {
      const h = camPt(cam, a.hx, a.hy), f = camPt(cam, a.fxl, a.fyl);
      return { who: a.who, x: h[0] + p.x, y: h[1] + p.y, r: a.hr * cam.z, fx: f[0] + p.x, fy: f[1] + p.y, fr: a.frl * cam.z, back: a.back };
    });
    const list = c.bubbles || [];
    let allow;
    if (!p.framed) allow = L.safeRect(p, 26);
    else if (p.inset) { const s = L.safeRect({ x: 0, y: 0, w: W, h: H }, 30); allow = { x0: Math.max(s.x0, p.x - 90), y0: Math.max(s.y0, p.y - 70), x1: Math.min(s.x1, p.x + p.w + 90), y1: Math.min(s.y1, p.y + p.h + 70) }; }
    else allow = L.safeRect({ x: p.x - 12, y: p.y - 12, w: p.w + 24, h: p.h + 24 }, 0);
    const blocks = [badge.rect];
    Lc.actors.forEach((a, i) => { if (a.emotes.some(e => e.kind && e.kind !== 'blushLines')) { const e = emotePos(a, Lc.heads[i]); blocks.push({ x0: e[0] - e[2] * 55, y0: e[1] - e[2] * 55, x1: e[0] + e[2] * 55, y1: e[1] + e[2] * 55, w: 700 }); } });
    const pg = pages[c.pageIdx];
    Lc.allow = allow;
    Lc.bub = list.length ? L.bubble.layoutCut(A.g, list, {
      panel: p, allow, heads: Lc.heads, unsafe: L.unsafeRects(), blocks, seed: c.seed, dark: pg.dark, pageColor: c.cardColor || pg.color,
      bare: !c.bg || c.bg === 'none' || c.bg === 'plain' && !c.actors, fontScale: p.inset ? 0.82 : p.h < 500 ? 0.963 : 1
    }) : [];
  }
  function emotePos(a, head) {            /* -> [x, y, sizeMul] on screen for a head {x, y, r} */
    const kind = (a.emotes.find(e => e.kind) || {}).kind;
    const behind = kind === 'sweat' || kind === 'gloom' || kind === 'anger' || kind === 'zzz';
    const side = a.dir === 0 ? 1 : (behind ? -a.dir : a.dir);
    return [head.x + side * head.r * 0.92, head.y - head.r * 0.98, head.r * 2 * 0.6 / 100];
  }

  function ensureLayout(c) {
    if (c.L) return c.L;
    const Lc = c.L = {};
    Lc.panel = c.layout === 'inset' ? insetRect(c, c.prev) : L.layoutRect(c.layout || 'tall');
    if (c.layout === 'inset') Lc.rot = (c.rot !== undefined ? c.rot : (hash(c.seed, 3) < 0.5 ? -1 : 1) * (1.2 + hash(c.seed, 4) * 1.4)) * DEG;
    placeActors(c, Lc);
    placeBubbles(c, Lc);
    return Lc;
  }

  /* ------------------------------------------------------------ actor state */
  function actorState(c, a, t) {
    const s = a.src, lt = t - c.t0;
    let expr = s.expr || 'neutral', mix, blush = s.blush || 0, look = s.look || [0, 0], pose = s.pose || 'stand', held = s.held || null, tilt = s.headTilt || 0, lean = s.lean || 0, mouth = s.mouth, sy = 1;
    for (const k of a.keys) {
      const kt = t - k.t; if (kt < 0) break;
      if (k.expr !== undefined && k.expr !== expr) { const u = kt / 0.22; if (u < 1) mix = { to: k.expr, k: ease.inOutSine(u) }; else { expr = k.expr; mix = undefined; } }
      if (k.blush !== undefined) blush = lerp(blush, k.blush, smooth(kt / 0.5));
      if (k.look) { const u = smooth(kt / 0.3); look = [lerp(look[0], k.look[0], u), lerp(look[1], k.look[1], u)]; }
      if (k.headTilt !== undefined) tilt = lerp(tilt, k.headTilt, smooth(kt / 0.35));
      if (k.lean !== undefined) lean = lerp(lean, k.lean, smooth(kt / 0.4));
      if (k.pose !== undefined && k.pose !== pose) { pose = k.pose; if (kt < 0.22) sy = 1 - 0.035 * Math.sin(Math.PI * kt / 0.22); }
      if (k.held !== undefined) held = k.held;
      if (k.mouth !== undefined) mouth = k.mouth === null ? undefined : k.mouth;
    }
    let dx = 0, dy = 0, alpha = s.alpha === undefined ? 1 : s.alpha, sc = 1;
    const p = c.L.panel, slide = (o, k) => {
      const e = 1 - k, far = { left: [-(a.x + a.hr * 3), 0], right: [p.w - a.x + a.hr * 3, 0], up: [0, -(a.hy + a.hr * 2.5)], down: [0, p.h - a.hy + a.hr * 2] }[o.from];
      if (far) { dx += far[0] * e; dy += far[1] * e; } else if (o.from === 'pop') { sc *= lerp(0.78, 1, ease.outBack(k, 2)); alpha *= clamp(k * 3, 0, 1); } else alpha *= k;
    };
    if (a.enter) { const u = (lt - a.enter.at) / a.enter.dur; if (u < 0) alpha = 0; else if (u < 1) slide(a.enter, a.enter.from === 'pop' ? u : ease.outCubic(u)); }
    if (a.exit) { const u = (lt - a.exit.at) / a.exit.dur; if (u >= 1) alpha = 0; else if (u > 0) slide(a.exit, 1 - ease.inCubic(u)); }
    /* a small nod when one of this actor's lines pops */
    const bl = c.bubbles || [];
    for (const b of bl) if (b.who === a.who && (b.type === 'speech' || b.type === 'shout' || !b.type)) { const bt = t - b.t0; if (bt > 0 && bt < 0.34) dy -= Math.sin(Math.PI * bt / 0.34) * a.hr * (b.type === 'shout' ? 0.11 : 0.055); }
    return {
      dx, dy, sc, sy, alpha,
      state: { view: a.view, flip: a.flip, pose, held, expr, exprMix: mix, blink: s.blink, mouth, blush, look, headTilt: tilt, lean, hairSway: s.hairSway, breath: s.breath, outfit: s.outfit || 'default', light: c.time || 'day', alpha }
    };
  }

  /* ------------------------------------------------------------ panel drawing */
  const PLAIN = { day: ['#fff4ec', '#ffe2ea'], indoor: ['#fff7ea', '#fbe9d8'], evening: ['#ffd9b8', '#e9b6d6'], dawn: ['#e6ddf7', '#ffe1d6'], night: ['#1a2148', '#2e2a5e'] };
  function plainBg(g, c, w, h) {
    const cols = c.bgColor ? (Array.isArray(c.bgColor) ? c.bgColor : [c.bgColor, c.bgColor]) : (PLAIN[c.time] || PLAIN.day);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.fillRect(-w * 0.2, -h * 0.2, w * 1.4, h * 1.4);
  }
  function drawStage(g, c, Lc, t) {
    const p = Lc.panel, w = p.w, h = p.h, lt = t - c.t0, cam = cameraAt(c, Lc, t);
    /* background */
    g.save(); applyCam(g, cam);
    const id = c.bg, fn = id && TOON.backgrounds ? TOON.backgrounds[id] : null;
    if (!fn) { if (id && id !== 'none' && id !== 'plain') L.warn('unknown background "' + id + '" (plain)'); plainBg(g, c, w, h); }
    else {
      g.save(); const z = Lc.bgZoom;
      if (z !== 1) { g.translate(w / 2, h * 0.52); g.scale(z, z); g.translate(-w / 2, -h * 0.52); }
      if (!kitCall('background "' + id + '"', () => fn(g, w, h, t, { time: c.time || 'day', cam: { x: cam.raw.x, y: cam.raw.y, z: cam.raw.z }, blur: Lc.bgBlur }))) plainBg(g, c, w, h);
      g.restore();
    }
    g.restore();
    const hs = Lc.focusActor ? camPt(cam, Lc.focusActor.hx, Lc.focusActor.hy) : [w / 2, h / 2];
    const env = { w, h, lt, seed: c.seed, fx: hs[0], fy: hs[1], keep: Lc.focusActor ? Lc.focusActor.hr * cam.z * 1.15 : 0 };
    for (const f of c.fxList) L.fxDraw(g, f, 'back', env);
    /* props + actors */
    g.save(); applyCam(g, cam);
    const props = c.props || [], drawProp = (pr) => {
      const fnp = TOON.props && TOON.props[pr.id]; if (!fnp) { L.warn('unknown prop "' + pr.id + '"'); return; }
      const at = pr.at || [0.5, 0.8], sc = Lc.refScale * (pr.scale || 1);
      g.save(); g.translate(at[0] * w, at[1] * h); g.scale(sc, sc); if (pr.rot) g.rotate(pr.rot * DEG);
      kitCall('prop "' + pr.id + '"', () => fnp(g, t, { time: c.time || 'day', light: c.time || 'day' })); g.restore();
    };
    props.filter(pr => !pr.front).forEach(drawProp);
    const live = [];
    for (const a of Lc.order) {
      const st = actorState(c, a, t); a._st = st;
      if (st.alpha <= 0.004) continue;
      live.push(a);
      g.save(); g.translate(a.x + st.dx, a.feetY + st.dy); g.scale(a.s * st.sc, a.s * st.sc * st.sy);
      kitCall('character "' + a.who + '"', () => TOON.drawCharacter(g, a.who, st.state, t));
      g.restore();
    }
    props.filter(pr => pr.front).forEach(drawProp);
    g.restore();
    for (const f of c.fxList) L.fxDraw(g, f, 'front', env);
    /* emotes above the heads (panel space, following the camera) */
    for (const a of live) {
      if (!a.emotes.length) continue;
      const st = a._st, hp = camPt(cam, a.hx + st.dx, a.hy + st.dy), head = { x: hp[0], y: hp[1], r: a.hr * cam.z };
      a.emotes.forEach((e, i) => {
        const et = t - e.t; if (et < 0 || !e.kind) return;
        const nx = a.emotes[i + 1], out = nx && t >= nx.t ? 1 - clamp((t - nx.t) / 0.2, 0, 1) : 1; if (out <= 0) return;
        const k = ease.outBack(et / 0.3, 2.4) * out;
        if (e.kind === 'blushLines') { L.blushLines(g, head.x + a.dir * head.r * 0.1, head.y, head.r, clamp(et / 0.3, 0, 1) * out * st.alpha); return; }
        const pos = emotePos({ emotes: [e], dir: a.dir }, head), sz = pos[2];
        const ex = clamp(pos[0], sz * 50, w - sz * 50), ey = clamp(pos[1], sz * 50, h - sz * 50) + Math.sin(et * 2.6) * head.r * 0.03;
        g.save(); g.globalAlpha *= clamp(et / 0.12, 0, 1) * out * st.alpha;
        if (typeof TOON.emote === 'function') kitCall('emote "' + e.kind + '"', () => TOON.emote(g, e.kind, ex, ey, sz * k, et)); else L.warn('the kit has no TOON.emote');
        g.restore();
      });
    }
  }
  function drawPanel(g, c, t, dim) {
    const Lc = ensureLayout(c), p = Lc.panel, pg = pages[c.pageIdx];
    g.save();
    if (p.inset) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      g.translate(cx, cy); g.rotate(Lc.rot); g.translate(-cx, -cy);
      g.save(); g.shadowColor = 'rgba(18,10,36,0.45)'; g.shadowBlur = 34; g.shadowOffsetY = 14; g.fillStyle = '#fff'; g.fillRect(p.x - 11, p.y - 11, p.w + 22, p.h + 22); g.restore();
      g.fillStyle = pg.dark ? '#f4f1fb' : '#ffffff'; g.fillRect(p.x - 11, p.y - 11, p.w + 22, p.h + 22);
    }
    g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip(); g.translate(p.x, p.y);
    drawStage(g, c, Lc, t);
    g.restore();
    if (dim > 0) { g.save(); g.globalAlpha *= dim; g.fillStyle = L.DIM_COLOR; g.fillRect(p.x, p.y, p.w, p.h); g.restore(); }
    if (p.framed) {
      g.lineJoin = 'miter';
      if (pg.dark && !p.inset) { g.strokeStyle = 'rgba(170,180,235,0.5)'; g.lineWidth = 2; g.strokeRect(p.x - 3.5, p.y - 3.5, p.w + 7, p.h + 7); }
      g.strokeStyle = pg.dark && !p.inset ? '#070914' : STYLE.ink; g.lineWidth = p.inset ? 4 : 5; g.strokeRect(p.x, p.y, p.w, p.h);
      if (p.inset) { g.lineWidth = 3; g.strokeRect(p.x - 11, p.y - 11, p.w + 22, p.h + 22); }
    }
    g.restore();
    if (P.debug) debugPanel(g, c, Lc);
  }
  function drawBubbles(g, c, t, dim) {
    if (P.hideBubbles) return;
    const Lc = ensureLayout(c), bl = c.bubbles || [];
    for (let i = 0; i < Lc.bub.length; i++) L.bubble.draw(g, Lc.bub[i], t - bl[i].t0, dim);
  }
  /* composite a freshly drawn panel (in buffer C) with a panel-level transition */
  function panelTrans(g, c, t, type, u) {
    const Lc = ensureLayout(c), p = Lc.panel, m = p.inset ? 70 : 12;
    C.g.clearRect(0, 0, W, H); drawPanel(C.g, c, t, 0);
    const sx = Math.max(0, p.x - m), sy = Math.max(0, p.y - m), sw = Math.min(W, p.x + p.w + m) - sx, sh = Math.min(H, p.y + p.h + m) - sy;
    const blit = (dx, dy, a) => { g.save(); g.globalAlpha *= a; g.drawImage(C.c, sx, sy, sw, sh, sx + dx, sy + dy, sw, sh); g.restore(); };
    switch (type) {
      case 'scroll': blit(0, Math.round((1 - ease.outCubic(u)) * 150), clamp(u * 2.6, 0, 1)); break;
      case 'push': g.save(); g.beginPath(); g.rect(0, sy, W, sh); g.clip(); blit(Math.round((1 - ease.outCubic(u)) * (W - sx)), 0, 1); g.restore(); break;
      case 'whip': { const e = ease.outQuint(u), v = 1 - e; for (let i = 3; i >= 0; i--) blit(Math.round(v * (W - sx) + i * v * 90), 0, i === 0 ? 1 : 0.22); break; }
      case 'flash': blit(0, 0, 1); g.save(); g.globalAlpha *= Math.pow(1 - u, 1.4); g.fillStyle = '#fff'; g.fillRect(p.x, p.y, p.w, p.h); g.restore(); break;
      case 'iris': g.save(); g.beginPath(); g.arc(p.x + p.w / 2, p.y + p.h / 2, ease.inOutCubic(u) * Math.hypot(p.w, p.h) * 0.56 + 1, 0, TAU); g.clip(); blit(0, 0, 1); g.restore(); break;
      case 'pop': { const s = lerp(0.8, 1, ease.outBack(u, 2.2)), cx = p.x + p.w / 2, cy = p.y + p.h / 2; g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); blit(0, 0, clamp(u * 3.5, 0, 1)); g.restore(); break; }
      default: blit(0, Math.round((1 - ease.outCubic(u)) * 28), ease.outCubic(u));      /* fade */
    }
  }
  function drawPage(g, pg, t) {
    g.fillStyle = pg.color; g.fillRect(0, 0, W, H);
    for (const ci of pg.cuts) {
      const c = cuts[ci]; if (t < c.t0) break;
      const dim = c.next && t >= c.next.t0 ? smooth((t - c.next.t0) / 0.35) * (c.next.layout === 'inset' ? 0.55 : 1) : 0;
      const tr = c.trans || { type: 'cut', dur: 0 }, lt = t - c.t0;
      if (c.slot > 0 && tr.dur > 0 && lt < tr.dur && tr.type !== 'cut') panelTrans(g, c, t, tr.type, lt / tr.dur);
      else drawPanel(g, c, t, dim);
      drawBubbles(g, c, t, dim);
    }
  }
  /* page-level transition between the old page (buffer A) and the new one (buffer B) */
  function pageTrans(g, type, u, c) {
    const e = ease.inOutCubic(u);
    switch (type) {
      case 'fade': g.drawImage(A.c, 0, 0); g.save(); g.globalAlpha = ease.inOutSine(u); g.drawImage(Bf.c, 0, 0); g.restore(); break;
      case 'push': { const x = Math.round(e * W); g.drawImage(A.c, -x, 0); g.drawImage(Bf.c, W - x, 0); break; }
      case 'whip': {
        const x = ease.inOutCubic(u) * W, v = Math.sin(Math.PI * u), n = 6;
        for (let i = 0; i < n; i++) { const o = (i / (n - 1) - 0.5) * v * 190; g.save(); g.globalAlpha = 1 / (i + 1); g.drawImage(A.c, Math.round(-x + o), 0); g.drawImage(Bf.c, Math.round(W - x + o), 0); g.restore(); }
        break;
      }
      case 'flash': g.drawImage(u < 0.42 ? A.c : Bf.c, 0, 0); g.save(); g.globalAlpha = u < 0.42 ? Math.pow(u / 0.42, 1.6) : Math.pow(1 - (u - 0.42) / 0.58, 1.5); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); break;
      case 'iris': {
        const Lc = ensureLayout(c), f = Lc.focusActor ? [Lc.panel.x + Lc.focusActor.hx, Lc.panel.y + Lc.focusActor.hy] : [W / 2, H * 0.46];
        const R = Math.max(Math.hypot(f[0], f[1]), Math.hypot(W - f[0], f[1]), Math.hypot(f[0], H - f[1]), Math.hypot(W - f[0], H - f[1])), r = ease.inOutCubic(u) * R + 2;
        g.drawImage(A.c, 0, 0); g.save(); g.beginPath(); g.arc(f[0], f[1], r, 0, TAU); g.clip(); g.drawImage(Bf.c, 0, 0); g.restore();
        g.save(); g.globalAlpha = 0.8 * (1 - u); g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.arc(f[0], f[1], r, 0, TAU); g.stroke(); g.restore();
        break;
      }
      default: { const y = Math.round(e * H); g.drawImage(A.c, 0, -y); g.drawImage(Bf.c, 0, H - y); }       /* scroll */
    }
  }
  function drawScene(g, t) {
    let ci = 0; for (let i = 0; i < cuts.length; i++) if (cuts[i].t0 <= t) ci = i;
    const c = cuts[ci], pg = pages[c.pageIdx], tr = c.trans || { type: 'cut', dur: 0 }, lt = t - c.t0;
    /* free sprites of far-away pages */
    for (const o of cuts) if (o.L && Math.abs(o.pageIdx - c.pageIdx) > 1) for (const s of o.L.bub) s.sprite = null;
    if (c.slot === 0 && c.pageIdx > 0 && tr.dur > 0 && lt < tr.dur && tr.type !== 'cut') {
      drawPage(A.g, pages[c.pageIdx - 1], t); drawPage(Bf.g, pg, t);
      pageTrans(g, tr.type, lt / tr.dur, c);
    } else drawPage(g, pg, t);
    return c;
  }

  /* ------------------------------------------------------------ overlays */
  function softened(g, k) {                 /* blur what is on the main canvas (cheap pyramid), blend by k */
    for (const s of [S1, S2, S3]) { s.g.imageSmoothingEnabled = true; s.g.imageSmoothingQuality = 'high'; }
    S1.g.drawImage(canvas, 0, 0, S1.c.width, S1.c.height); S2.g.drawImage(S1.c, 0, 0, S2.c.width, S2.c.height); S3.g.drawImage(S2.c, 0, 0, S3.c.width, S3.c.height);
    S2.g.drawImage(S3.c, 0, 0, S2.c.width, S2.c.height); S1.g.drawImage(S2.c, 0, 0, S1.c.width, S1.c.height);
    g.save(); g.globalAlpha = k; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(S1.c, 0, 0, W, H); g.restore();
  }
  function drawEndCard(g, t) {
    const E = TL.end; if (!E || t < E.t0) return;
    const u = t - E.t0, k = ease.outCubic(u / 0.55);
    softened(g, k);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, L.rgba('#1c1030', 0.62 * k)); gr.addColorStop(0.45, L.rgba('#3a1a4a', 0.5 * k)); gr.addColorStop(1, L.rgba('#150c28', 0.74 * k));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, 860, 0, W / 2, 860, 700); rg.addColorStop(0, L.rgba('#ff7aa8', 0.34 * k)); rg.addColorStop(1, L.rgba('#ff7aa8', 0));
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const rise = (a) => (1 - ease.outCubic(a)) * 30;
    /* title, letter by letter */
    const text = String(E.text || '다음 화에 계속'), chars = Array.from(text);
    g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
    let size = 96; g.font = '700 ' + size + 'px "Gowun Batang"'; if ('letterSpacing' in g) g.letterSpacing = '6px';
    let tw = g.measureText(text).width; if (tw > 880) { size = Math.floor(size * 880 / tw); g.font = '700 ' + size + 'px "Gowun Batang"'; tw = g.measureText(text).width; }
    let x = W / 2 - tw / 2; const ty = 800;
    chars.forEach((ch, i) => {
      const a = clamp((u - 0.22 - i * 0.045) / 0.4, 0, 1), cw = g.measureText(ch).width;
      if (a > 0) { g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(255,120,170,0.7)'; g.shadowBlur = 26; g.fillStyle = '#ffffff'; g.fillText(ch, x, ty + rise(a)); g.restore(); }
      x += cw;
    });
    g.restore();
    /* ornament */
    const ao = clamp((u - 0.6) / 0.4, 0, 1);
    if (ao > 0) {
      g.save(); g.globalAlpha = ao; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.5; g.lineCap = 'round'; const lw = 150 * ease.outCubic(ao);
      g.beginPath(); g.moveTo(W / 2 - 34 - lw, 900); g.lineTo(W / 2 - 34, 900); g.moveTo(W / 2 + 34, 900); g.lineTo(W / 2 + 34 + lw, 900); g.stroke();
      const hp = 1 + 0.12 * Math.sin(u * 6); L.heartPath(g, W / 2, 900, 15 * hp); g.fillStyle = '#ff7aa8'; g.fill(); g.restore();
    }
    /* teaser */
    if (E.teaser) {
      const a = clamp((u - 0.8) / 0.45, 0, 1);
      if (a > 0) {
        const lay = L.text.layout(g, E.teaser, { family: 'Pretendard', weight: 600, emWeight: 800, size: 54, min: 40, lineH: 1.42, color: '#ffffff', emColor: '#ffb3cb' }, { maxChars: 15, maxWidth: 860 });
        g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(20,8,40,0.6)'; g.shadowBlur = 14; L.text.draw(g, lay, W / 2, 1010 + lay.h / 2 - 30 + rise(a)); g.restore();
      }
    }
    /* follow pill */
    const af = clamp((u - 1.25) / 0.4, 0, 1);
    if (af > 0) {
      const label = String(E.follow || '팔로우하고 다음 화 보기');
      g.save(); g.font = '600 38px "Pretendard"'; const w = g.measureText(label).width + 126, h = 84, cx = W / 2, cy = 1392 + rise(af), s = 1 + 0.018 * Math.sin((u - 1.25) * 5);
      g.globalAlpha = af; g.translate(cx, cy); g.scale(s, s);
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.stroke();
      g.beginPath(); g.arc(-w / 2 + 46, 0, 22, 0, TAU); g.fillStyle = '#ff7aa8'; g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-w / 2 + 35, 0); g.lineTo(-w / 2 + 57, 0); g.moveTo(-w / 2 + 46, -11); g.lineTo(-w / 2 + 46, 11); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, -w / 2 + 84, 2);
      g.restore();
    }
  }
  function drawBadge(g) { if (!P.hideBadge && badge) g.drawImage(badge.c, badge.x, badge.y); }

  function debugPanel(g, c, Lc) {
    g.save(); g.lineWidth = 3;
    g.strokeStyle = 'rgba(0,200,255,0.9)'; for (const h of Lc.heads) { g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke(); g.beginPath(); g.arc(h.fx, h.fy, h.fr, 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(0,220,90,0.9)'; g.setLineDash([12, 8]); const a = Lc.allow; g.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
    g.strokeStyle = 'rgba(255,60,200,0.9)'; g.setLineDash([]); for (const b of Lc.bub) g.strokeRect(b.cx - b.bw / 2, b.cy - b.bh / 2, b.bw, b.bh);
    g.restore();
  }
  function debugGuides(g) {
    g.save(); g.fillStyle = 'rgba(255,0,0,0.16)'; const s = L.SAFE;
    g.fillRect(0, 0, W, s.top); g.fillRect(0, s.bottom, W, H - s.bottom); g.fillRect(s.rightX, s.rightY0, W - s.rightX, s.rightY1 - s.rightY0); g.restore();
  }

  /* ------------------------------------------------------------ public */
  function renderFrame(t) {
    t = clamp(+t || 0, 0, Math.max(0, TL.duration - 1e-4));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawScene(ctx, t);
    if (P.debug) debugGuides(ctx);
    drawEndCard(ctx, t);
    drawBadge(ctx);
    return t;
  }
  /* cover: timeline.cover = { cut, at, lines:[..], pos:'bottom'|'top'|'center', bubbles:false, color } */
  function renderCover() {
    const cv = TL.cover || {}, meta = TL.meta || {};
    const c = cuts.find(x => x.id === cv.cut) || cuts[0], t = clamp(c.t0 + (cv.at !== undefined ? cv.at : c.dur - 0.25), c.t0, c.t1 - 1e-3);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    P.hideBubbles = cv.bubbles !== true;
    drawPage(ctx, pages[c.pageIdx], t);
    P.hideBubbles = false;
    const g = ctx, lines = (cv.lines && cv.lines.length ? cv.lines : [meta.seriesTitle || '', meta.epTitle || '']).filter(Boolean).map(String);
    const pos = cv.pos || 'bottom', fam = cv.font || 'Black Han Sans';
    /* scrim */
    const gr = g.createLinearGradient(0, 0, 0, H);
    if (pos === 'top') { gr.addColorStop(0, 'rgba(24,12,44,0.8)'); gr.addColorStop(0.45, 'rgba(24,12,44,0)'); gr.addColorStop(1, 'rgba(24,12,44,0.35)'); }
    else if (pos === 'center') { gr.addColorStop(0, 'rgba(24,12,44,0.3)'); gr.addColorStop(0.5, 'rgba(24,12,44,0.55)'); gr.addColorStop(1, 'rgba(24,12,44,0.3)'); }
    else { gr.addColorStop(0, 'rgba(24,12,44,0.3)'); gr.addColorStop(0.42, 'rgba(24,12,44,0)'); gr.addColorStop(1, 'rgba(24,12,44,0.86)'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    /* lettering: sized to the widest line, kept inside the centre 3:4 crop used by the profile grid */
    const st = { family: fam, weight: 400, emWeight: 400, size: 190, lineH: 1.14, color: '#ffffff', emColor: cv.color || '#ffd84a' };
    let lay = null, size = 190;
    for (;;) { st.size = size; lay = L.text.layout(g, lines.join('\n'), st, { noWrap: true, spacing: 1 }); if (lay.w <= 900 || size <= 70) break; size = Math.floor(size * Math.max(0.8, 900 / lay.w)); }
    const blockH = lay.lineH * lay.lines.length, cy = pos === 'top' ? 330 + blockH / 2 : pos === 'center' ? 940 : 1500 - blockH / 2;
    g.save(); g.translate(W / 2, cy); g.rotate(-3 * DEG);
    g.save(); g.translate(9, 12); L.text.draw(g, lay, 0, 0, { color: '#ff5c8f', emColor: '#ff5c8f', stroke: { color: '#ff5c8f', width: size * 0.16 } }); g.restore();
    L.text.draw(g, lay, 0, 0, { color: '#2a1a3e', emColor: '#2a1a3e', stroke: { color: '#2a1a3e', width: size * 0.16 } });
    L.text.draw(g, lay, 0, 0);
    g.restore();
    /* series tag */
    const tag = (meta.seriesTitle ? meta.seriesTitle + '  ' : '') + 'EP.' + String(meta.ep === undefined ? 1 : meta.ep).padStart(2, '0');
    g.save(); g.font = '700 44px "Pretendard"'; const tw = g.measureText(tag).width + 68, ty = pos === 'top' ? cy + blockH / 2 + 70 : cy - blockH / 2 - 86;
    g.beginPath(); g.roundRect(W / 2 - tw / 2, ty - 39, tw, 78, 39); g.fillStyle = '#ff6f98'; g.fill(); g.strokeStyle = '#2a1a3e'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag, W / 2, ty + 2); g.restore();
    return t;
  }
  function sceneInfo() {
    return {
      duration: TL.duration, fps: TL.fps, kit: P.kit, pages: pages.map(p => ({ idx: p.idx, t0: p.t0, t1: p.t1, color: p.color, cuts: p.cuts.map(i => cuts[i].id) })),
      cuts: cuts.map(c => {
        const Lc = ensureLayout(c);
        return { id: c.id, t0: c.t0, t1: c.t1, layout: c.layout, panel: Lc.panel, heads: Lc.heads, bubbles: Lc.bub.map((b, i) => ({ type: b.type, text: L.text.plain(c.bubbles[i].text), t0: c.bubbles[i].t0, cx: b.cx, cy: b.cy, w: b.bw, h: b.bh, tip: b.tip, size: b.lay ? b.lay.size : b.sfx.size, lines: b.lay ? b.lay.lines.length : 1 })) };
      })
    };
  }
  function preview() {
    document.body.classList.add('play');
    const t0 = performance.now();
    const loop = () => { const t = ((performance.now() - t0) / 1000) % TL.duration; renderFrame(t); requestAnimationFrame(loop); };
    loop();
  }

  window.ready = boot();
  window.ready.catch(e => { console.error('[engine] boot failed: ' + (e && e.stack || e)); });
})();
