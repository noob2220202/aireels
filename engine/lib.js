/* engine/lib.js: canvas helpers for the cut-drama player.
 * easing, deterministic noise, Korean text layout, speech bubbles (shapes, auto-placement, pop-in),
 * panel layouts, camera moves, panel fx, emote helpers.
 * Everything here is a pure function of its arguments (no Math.random / Date / performance.now).
 */
(function () {
  'use strict';
  const L = window.LIB = {};
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  L.W = 1080; L.H = 1920;
  /* Instagram UI safe zones (SPEC section 4) */
  L.SAFE = { top: 190, bottom: 1560, rightX: 950, rightY0: 900, rightY1: 1560 };

  /* ------------------------------------------------------------------ utils */
  const clamp = L.clamp = (v, a, b) => Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v));
  const lerp = L.lerp = (a, b, k) => a + (b - a) * k;
  const smooth = L.smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ease = L.ease = {
    lin: x => clamp(x, 0, 1),
    inQuad: x => { x = clamp(x, 0, 1); return x * x; },
    outQuad: x => { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x); },
    inCubic: x => { x = clamp(x, 0, 1); return x * x * x; },
    outCubic: x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); },
    inOutCubic: x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    inOutSine: x => { x = clamp(x, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * x); },
    outQuint: x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 5); },
    outBack: (x, s) => { x = clamp(x, 0, 1); s = s === undefined ? 1.70158 : s; const y = x - 1; return 1 + (s + 1) * y * y * y + s * y * y; },
    outElastic: x => { x = clamp(x, 0, 1); if (x === 0 || x === 1) return x; return Math.pow(2, -9 * x) * Math.sin((x * 8 - 0.75) * (TAU / 3)) + 1; }
  };
  /* integer hash -> 0..1 */
  const hash = L.hash = (a, b) => {
    let h = (Math.imul((a | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)) | 0;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
  const strSeed = L.strSeed = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; };
  /* smooth 1-D value noise, -1..1 */
  const noise1 = L.noise1 = (x, seed) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1; };

  function parseColor(c) {
    if (Array.isArray(c)) return c;
    if (c[0] === '#') { if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  }
  L.mix = (a, b, k) => { const A = parseColor(a), B = parseColor(b); return 'rgb(' + Math.round(lerp(A[0], B[0], k)) + ',' + Math.round(lerp(A[1], B[1], k)) + ',' + Math.round(lerp(A[2], B[2], k)) + ')'; };
  const rgba = L.rgba = (c, a) => { const A = parseColor(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + (+a).toFixed(4) + ')'; };
  L.luma = (c) => { const A = parseColor(c); return (0.299 * A[0] + 0.587 * A[1] + 0.114 * A[2]) / 255; };

  const warned = Object.create(null);
  L.warn = (msg) => { if (!warned[msg]) { warned[msg] = 1; console.warn('[engine] ' + msg); } };

  L.makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  L.heartPath = (ctx, x, y, r) => {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.92);
    ctx.bezierCurveTo(x - r * 1.55, y - r * 0.05, x - r * 0.85, y - r * 1.25, x, y - r * 0.36);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.25, x + r * 1.55, y - r * 0.05, x, y + r * 0.92); ctx.closePath();
  };
  L.star4Path = (ctx, x, y, r, thin) => {
    const k = thin === undefined ? 0.2 : thin; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? r * k : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
  };

  /* ------------------------------------------------------------------ style */
  const INK = '#2b2433';
  const STYLE = L.STYLE = {
    ink: INK, accent: '#e8356f', accent2: '#ff8fab', maxChars: 13,
    page: { day: '#fbf7ee', indoor: '#fbf7ee', dawn: '#f4eef6', evening: '#f8eadc', night: '#141a35' },
    speech: { family: 'Pretendard', weight: 600, size: 54, min: 44, color: '#221c28', emWeight: 800, emColor: '#e8356f', lineH: 1.3, fill: '#ffffff' },
    thought: { family: 'Gowun Batang', weight: 700, size: 50, min: 42, color: '#4b4560', emWeight: 700, emColor: '#8d58d6', lineH: 1.34, fill: '#fcfaff' },
    shout: { family: 'Black Han Sans', weight: 400, size: 78, min: 58, color: '#1f1a24', emWeight: 400, emColor: '#ff3257', lineH: 1.18, fill: '#ffffff' },
    whisper: { family: 'Gowun Dodum', weight: 400, size: 42, min: 40, color: '#75707e', emWeight: 400, emColor: '#b0577a', lineH: 1.32, fill: '#ffffff' },
    narration: { family: 'Gowun Batang', weight: 700, size: 46, min: 40, color: '#2f2836', emWeight: 700, emColor: '#d63c72', lineH: 1.36, fill: '#fffaf0' },
    text: { family: 'Pretendard', weight: 500, size: 46, min: 40, color: '#27222d', emWeight: 700, emColor: '#27222d', lineH: 1.3 },
    caption: { family: 'Gowun Batang', weight: 700, size: 68, min: 50, color: '#3a3142', emWeight: 700, emColor: '#e8356f', lineH: 1.4 },
    sfx: { family: 'Jua', impact: 'Black Han Sans', size: 128 }
  };
  L.pageColor = (time) => STYLE.page[time] || STYLE.page.day;

  /* ------------------------------------------------------------------ text */
  const T = L.text = {};
  T.plain = (text) => String(text === undefined || text === null ? '' : text).replace(/\*/g, '');
  T.count = (text) => Array.from(T.plain(text).replace(/\s/g, '')).length;
  function parseWords(text) {                 /* -> paragraphs -> words -> [{ch, em}] */
    const paras = [[]]; let em = false, cur = null;
    for (const ch of String(text === undefined || text === null ? '' : text)) {
      if (ch === '*') { em = !em; continue; }
      if (ch === '\n') { cur = null; paras.push([]); continue; }
      if (/\s/.test(ch)) { cur = null; continue; }
      if (!cur) { cur = []; paras[paras.length - 1].push(cur); }
      cur.push({ ch, em });
    }
    return paras.filter(p => p.length);
  }
  const PUNCT = ',.…?!~';
  /* wrap by 어절, balanced, <= maxChars per line. MUST stay identical to wrap_ko() in engine/build.py */
  T.wrapWords = (words, maxChars) => {
    const n = words.length, lens = words.map(w => w.length);
    const len = (i, j) => { let s = j - i - 1; for (let k = i; k < j; k++) s += lens[k]; return s; };
    if (n <= 1) return [words];
    const total = len(0, n);
    let best = null;
    for (let i = 1; i < n; i++) {
      const a = len(0, i), b = len(i, n);
      if (Math.max(a, b) > maxChars) continue;
      const last = words[i - 1][words[i - 1].length - 1].ch;
      let cost = Math.abs(a - b) + (a > b ? 0.4 : 0) - (PUNCT.indexOf(last) >= 0 ? 1.5 : 0);
      if (Math.min(a, b) < 2) cost += 4;
      if (!best || cost < best.cost) best = { i, cost };
    }
    if (total <= maxChars && (total <= 8 || !best || best.cost > 5)) return [words];
    if (best) return [words.slice(0, best.i), words.slice(best.i)];
    const lines = []; let cur = [];
    for (const w of words) {
      if (cur.length && len2(cur) + 1 + w.length > maxChars) { lines.push(cur); cur = [w]; } else cur.push(w);
    }
    if (cur.length) lines.push(cur);
    return lines;
    function len2(ws) { let s = ws.length - 1; for (const w of ws) s += w.length; return s; }
  };
  T.wrap = (text, maxChars) => {              /* -> array of lines, each an array of words */
    const out = [];
    for (const p of parseWords(text)) for (const l of T.wrapWords(p, maxChars || STYLE.maxChars)) out.push(l);
    return out;
  };
  T.lines = (text, maxChars) => T.wrap(text, maxChars).map(l => l.map(w => w.map(c => c.ch).join('')).join(' '));
  function lineRuns(words) {
    const runs = []; let cur = null;
    const push = (ch, em) => { if (cur && cur.em === em) cur.text += ch; else { cur = { text: ch, em }; runs.push(cur); } };
    words.forEach((w, wi) => {
      if (wi > 0) push(' ', w[0].em && words[wi - 1][words[wi - 1].length - 1].em);
      for (const c of w) push(c.ch, c.em);
    });
    return runs;
  }
  T.font = (st, size, em) => (em ? st.emWeight || st.weight : st.weight) + ' ' + size + 'px "' + st.family + '"';
  const glyphBox = Object.create(null);
  function hangulBox(ctx, font) {             /* visual box of a Hangul glyph: for optical vertical centring */
    if (glyphBox[font]) return glyphBox[font];
    ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText('한글가힣');
    ctx.restore();
    return (glyphBox[font] = { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent });
  }
  /* layout: { lines:[{runs:[{text,em,w}], w}], w, h, size, lineH, st } ; shrinks until w <= maxWidth */
  T.layout = (ctx, text, st, opts) => {
    opts = opts || {};
    const wrapped = opts.noWrap ? parseWords(text) : T.wrap(text, opts.maxChars || STYLE.maxChars);
    let size = Math.round((opts.size || st.size) * (opts.scale || 1));
    const minSize = Math.min(size, opts.min || st.min || 36);
    let lay;
    for (;;) {
      ctx.save(); ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = (opts.spacing || 0) + 'px';
      const lines = wrapped.map(ws => {
        const runs = lineRuns(ws); let w = 0;
        for (const r of runs) { ctx.font = T.font(st, size, r.em); r.w = ctx.measureText(r.text).width; w += r.w; }
        return { runs, w };
      });
      ctx.restore();
      const lineH = Math.round(size * (st.lineH || 1.3));
      const w = lines.reduce((m, l) => Math.max(m, l.w), 0);
      lay = { lines, w, h: lineH * lines.length - (lineH - size) * 0.55, size, lineH, st, spacing: opts.spacing || 0 };
      if (!opts.maxWidth || w <= opts.maxWidth || size <= minSize) break;
      size = Math.max(minSize, Math.floor(size * Math.max(0.86, opts.maxWidth / w)));
    }
    if (!lay.lines.length) lay.lines.push({ runs: [], w: 0 });
    return lay;
  };
  /* draw a layout centred on (cx, cy). opts: color, emColor, stroke:{color,width}, align:'center'|'left' */
  T.draw = (ctx, lay, cx, cy, opts) => {
    opts = opts || {};
    const st = lay.st, box = hangulBox(ctx, T.font(st, lay.size, false));
    const n = lay.lines.length, blockH = lay.lineH * (n - 1) + (box.asc + box.desc);
    let y = cy - blockH / 2 + box.asc;
    ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = lay.spacing + 'px';
    for (const line of lay.lines) {
      let x = opts.align === 'left' ? cx - lay.w / 2 : cx - line.w / 2;
      for (const r of line.runs) {
        ctx.font = T.font(st, lay.size, r.em);
        if (opts.stroke) { ctx.strokeStyle = opts.stroke.color; ctx.lineWidth = opts.stroke.width; ctx.strokeText(r.text, x, y); }
        ctx.fillStyle = r.em ? (opts.emColor || st.emColor || st.color) : (opts.color || st.color);
        ctx.fillText(r.text, x, y);
        x += r.w;
      }
      y += lay.lineH;
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ geometry */
  const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
  const superPt = (a, b, n, th) => [a * sgnPow(Math.cos(th), 2 / n), b * sgnPow(Math.sin(th), 2 / n)];
  function distPointRect(px, py, r) {          /* r = {x0,y0,x1,y1}; 0 when inside */
    const dx = Math.max(r.x0 - px, 0, px - r.x1), dy = Math.max(r.y0 - py, 0, py - r.y1);
    return Math.hypot(dx, dy);
  }
  function rectOverlap(a, b) { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0 && h > 0 ? w * h : 0; }
  L.geom = { distPointRect, rectOverlap, superPt };

  /* ================================================================== bubbles */
  const B = L.bubble = {};
  const BTYPES = { speech: 1, thought: 1, shout: 1, whisper: 1, narration: 1, sfx: 1, text: 1, caption: 1 };
  const SIZE_MUL = { xs: 0.7, s: 0.84, m: 1, l: 1.18, xl: 1.4 };
  const sizeMul = (v) => typeof v === 'number' ? v : (SIZE_MUL[v] || 1);
  const SFX_TONES = [
    { re: /두근|콩닥|심쿵|쿵쾅|설렘|화끈|발그레/, color: '#ff5c8a', impact: false },
    { re: /쾅|쿵|탁|벌컥|덜컹|퍽|와장창|철컥|쿠당|우당탕|번쩍|빠직/, color: '#ffcf3a', impact: true },
    { re: /띵동|딩동|띠링|띵|카톡|지잉|드르륵|삐빅|따르릉/, color: '#58b8ff', impact: false },
    { re: /반짝|샤랄라|샤방|뿅|짠/, color: '#ffd84a', impact: false },
    { re: /휘잉|스윽|슥|휙|살랑|사락|솨아|쏴아|후두둑/, color: '#bfe4ff', impact: false },
    { re: /\.\.\.|…|조용|정적|멈칫|움찔|흠칫/, color: '#c9c3d6', impact: false }
  ];
  const SFX_COLORS = ['#ff6b95', '#ffcf3a', '#58b8ff', '#7ddc9c', '#b48cff'];

  /* measure + size one bubble (no position yet). opts: { fontScale, maxTextW, panel:{w,h}, dark, bare } */
  B.build = (ctx, b, opts) => {
    opts = opts || {};
    let type = b.type || 'speech';
    if (!BTYPES[type]) { L.warn('unknown bubble type "' + type + '" (speech)'); type = 'speech'; }
    const st = STYLE[type], fs = (opts.fontScale || 1) * sizeMul(b.size);
    const seed = strSeed((b.text || '') + '|' + (opts.seed || 0));
    const spec = { src: b, type, seed, st, fontScale: fs, dark: !!opts.dark, who: b.who || b.near || null, cx: 0, cy: 0, tip: null };
    if (type === 'sfx') return buildSfx(ctx, spec, b, opts, fs);
    const lay = spec.lay = T.layout(ctx, b.text, st, { scale: fs, maxWidth: opts.maxTextW, spacing: type === 'caption' ? 2 : (type === 'shout' ? 1 : -0.5) });
    const nl = lay.lines.length;
    if (type === 'speech' || type === 'whisper' || type === 'thought' || type === 'shout') {
      const padX = type === 'thought' ? 52 : type === 'shout' ? 40 : 40 + lay.w * 0.03, padY = type === 'thought' ? 44 : type === 'shout' ? 34 : (nl === 1 ? 40 : 36);
      let a = Math.max(lay.w / 2 + padX * fs, 98 * fs), bb = Math.max(lay.h / 2 + padY * fs, 66 * fs);
      const n = clamp(2.25 + 0.3 * (a / bb - 1.5), 2.25, 3.4);
      /* every line's outer corner must sit inside the superellipse */
      let worst = 0;
      lay.lines.forEach((ln, i) => {
        const yEdge = Math.abs((i - (nl - 1) / 2) * lay.lineH) + lay.size * 0.5;
        worst = Math.max(worst, Math.pow((ln.w / 2 + 12) / a, n) + Math.pow(yEdge / bb, n));
      });
      if (worst > 0.9) { const k = Math.pow(worst / 0.9, 1 / n); a *= k; bb *= k; }
      spec.body = { a, b: bb, n };
      const grow = type === 'shout' ? 1.2 : type === 'thought' ? 1.06 : 1;
      spec.bw = a * 2 * grow; spec.bh = bb * 2 * (type === 'shout' ? 1.3 : grow);
    } else if (type === 'narration') {
      spec.bw = lay.w + 76 * fs; spec.bh = lay.h + 56 * fs;
    } else if (type === 'text') {
      spec.me = b.from === 'me';
      spec.name = !spec.me && b.name ? String(b.name) : '';
      spec.bw = Math.max(lay.w + 68 * fs, 120); spec.bh = lay.h + 52 * fs;
      spec.nameH = spec.name ? 44 : 0;
    } else if (type === 'caption') {
      spec.bare = !!opts.bare;
      spec.bw = spec.bare ? lay.w + 220 : Math.max(lay.w + 200, (opts.panel ? opts.panel.w : 900));
      spec.bh = lay.h + 120;
      spec.cardColor = b.color || opts.pageColor || STYLE.page.day;
    }
    return spec;
  };

  function buildSfx(ctx, spec, b, opts, fs) {
    const txt = T.plain(b.text);
    let tone = null; for (const tn of SFX_TONES) if (tn.re.test(txt)) { tone = tn; break; }
    const impact = b.impact !== undefined ? !!b.impact : (b.style ? b.style === 'impact' : !!(tone && tone.impact));
    const pm = opts.panel ? clamp(Math.min(opts.panel.w, opts.panel.h * 1.5) / 1000, 0.62, 1) : 1;
    const chars = Array.from(txt);
    let size = Math.round(STYLE.sfx.size * fs * pm * (chars.length > 4 ? Math.max(0.6, 4.6 / chars.length) : 1));
    const fam = impact ? STYLE.sfx.impact : STYLE.sfx.family;
    spec.sfx = { impact, fam, size, color: b.color || (tone ? tone.color : SFX_COLORS[Math.abs(spec.seed) % SFX_COLORS.length]), letters: [] };
    spec.rot = (b.rot !== undefined ? b.rot : (hash(spec.seed, 77) - 0.5) * 18) * DEG;
    ctx.save(); ctx.font = '400 ' + size + 'px "' + fam + '"';
    let x = 0;
    chars.forEach((ch, i) => {
      const w = ch === ' ' ? size * 0.3 : ctx.measureText(ch).width;
      if (ch !== ' ') spec.sfx.letters.push({ ch, x: x + w / 2, w, rot: (hash(spec.seed, i * 3 + 1) - 0.5) * 0.26, dy: (hash(spec.seed, i * 3 + 2) - 0.5) * 0.16 * size + (i % 2 ? -1 : 1) * size * 0.04, sc: 1 + (hash(spec.seed, i * 3 + 3) - 0.5) * 0.18 });
      x += w * (impact ? 0.96 : 0.93);
    });
    ctx.restore();
    const tw = x, th = size * 1.15;
    for (const l of spec.sfx.letters) l.x -= tw / 2;
    const c = Math.abs(Math.cos(spec.rot)), s = Math.abs(Math.sin(spec.rot));
    spec.sfx.tw = tw; spec.sfx.th = th;
    spec.bw = tw * c + th * s + size * 0.2; spec.bh = tw * s + th * c + size * 0.1;
    return spec;
  }

  /* ---------- shapes (drawn around the local origin) ---------- */
  function bodyPoints(a, b, n, seed, wob, N) {
    const pts = [], p1 = hash(seed, 1) * TAU, p2 = hash(seed, 2) * TAU, p3 = hash(seed, 3) * TAU;
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU, p = superPt(a, b, n, th);
      const k = 1 + wob * (0.6 * Math.sin(2 * th + p1) + 0.34 * Math.sin(3 * th + p2) + 0.22 * Math.sin(5 * th + p3));
      pts.push([p[0] * k, p[1] * k]);
    }
    return pts;
  }
  function tailedPath(pts, tip, halfW, bendK, seed) {
    const N = pts.length, path = new Path2D();
    if (!tip) { path.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < N; i++) path.lineTo(pts[i][0], pts[i][1]); path.closePath(); return path; }
    let i0 = 0, bd = 1e18;
    for (let i = 0; i < N; i++) { const d = (pts[i][0] - tip[0]) * (pts[i][0] - tip[0]) + (pts[i][1] - tip[1]) * (pts[i][1] - tip[1]); if (d < bd) { bd = d; i0 = i; } }
    const walk = (dir) => { let acc = 0, k = 0; while (acc < halfW && k < N / 4) { const p = pts[(i0 + dir * k + N * 4) % N], q = pts[(i0 + dir * (k + 1) + N * 4) % N]; acc += Math.hypot(q[0] - p[0], q[1] - p[1]); k++; } return k; };
    const kA = walk(-1), kB = walk(1);
    const A = pts[(i0 - kA + N) % N], Bp = pts[(i0 + kB) % N];
    const bcx = (A[0] + Bp[0]) / 2, bcy = (A[1] + Bp[1]) / 2, dx = tip[0] - bcx, dy = tip[1] - bcy, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, bend = len * bendK * (dx >= 0 ? -1 : 1);
    path.moveTo(Bp[0], Bp[1]);
    for (let j = i0 + kB + 1; j <= i0 - kA + N; j++) { const p = pts[j % N]; path.lineTo(p[0], p[1]); }
    path.quadraticCurveTo((A[0] + tip[0]) / 2 + nx * bend, (A[1] + tip[1]) / 2 + ny * bend, tip[0], tip[1]);
    path.quadraticCurveTo((Bp[0] + tip[0]) / 2 + nx * bend, (Bp[1] + tip[1]) / 2 + ny * bend, Bp[0], Bp[1]);
    path.closePath();
    return path;
  }
  function inked(g, path, fill, lw, ink, shadow) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (shadow !== false) { g.save(); g.shadowColor = 'rgba(40,26,60,0.26)'; g.shadowBlur = 22; g.shadowOffsetY = 9; g.fillStyle = fill; g.fill(path); g.restore(); }
    g.save(); g.translate(1.4, 2.2); g.strokeStyle = ink; g.lineWidth = lw; g.stroke(path); g.restore();   /* heavier line on the lower right: an inked feel */
    g.fillStyle = fill; g.fill(path);
    g.strokeStyle = ink; g.lineWidth = lw; g.stroke(path);
  }
  function drawSpeech(g, spec, tip) {
    const { a, b, n } = spec.body, whisper = spec.type === 'whisper';
    const pts = bodyPoints(a, b, n, spec.seed, whisper ? 0.006 : 0.011, 200);
    const halfW = clamp(0.075 * Math.min(a, b) * 2 + 11, 17, 30) * (whisper ? 0.8 : 1);
    const path = tailedPath(pts, tip, halfW, 0.17, spec.seed);
    if (whisper) {
      g.save(); g.shadowColor = 'rgba(40,26,60,0.18)'; g.shadowBlur = 18; g.shadowOffsetY = 7; g.fillStyle = rgba(spec.st.fill, 0.94); g.fill(path); g.restore();
      g.setLineDash([15, 13]); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#8b8494'; g.lineWidth = 4; g.stroke(path); g.setLineDash([]);
    } else inked(g, path, spec.st.fill, 5, INK);
    T.draw(g, spec.lay, 0, 0);
  }
  function drawThought(g, spec, tip) {
    const { a, b, n } = spec.body, seed = spec.seed;
    const fine = bodyPoints(a, b, n, seed, 0.008, 240);
    let per = 0; const acc = [0];
    for (let i = 0; i < fine.length; i++) { const p = fine[i], q = fine[(i + 1) % fine.length]; per += Math.hypot(q[0] - p[0], q[1] - p[1]); acc.push(per); }
    const N = Math.max(9, Math.round(per / 74)), knots = [];
    for (let k = 0; k < N; k++) {
      const target = ((k + (hash(seed, k + 20) - 0.5) * 0.3) / N + 1) % 1 * per;
      let i = 0; while (i < fine.length - 1 && acc[i + 1] < target) i++;
      knots.push(fine[i]);
    }
    const path = new Path2D(); path.moveTo(knots[0][0], knots[0][1]);
    for (let k = 0; k < N; k++) {
      const p = knots[k], q = knots[(k + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ch = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const nl = Math.hypot(mx / a, my / b) || 1, nx = mx / a / nl, ny = my / b / nl, nn = Math.hypot(nx / a, ny / b) || 1;
      const ox = nx / a / nn, oy = ny / b / nn, bulge = ch * (0.52 + 0.16 * hash(seed, k + 60));
      path.quadraticCurveTo(mx + ox * bulge, my + oy * bulge, q[0], q[1]);
    }
    path.closePath();
    const ink = '#4a4260';
    if (tip) {
      let bp = knots[0], bd = 1e18;
      for (const p of fine) { const d = (p[0] - tip[0]) * (p[0] - tip[0]) + (p[1] - tip[1]) * (p[1] - tip[1]); if (d < bd) { bd = d; bp = p; } }
      const dx = tip[0] - bp[0], dy = tip[1] - bp[1], len = Math.hypot(dx, dy), s = clamp(len / 80, 0.7, 1.15);
      [[0.3, 15], [0.66, 10], [0.96, 6]].forEach(([f, r]) => {
        const c = new Path2D(); c.ellipse(bp[0] + dx * f, bp[1] + dy * f + 6, r * s * 1.12, r * s, 0, 0, TAU);
        inked(g, c, spec.st.fill, 4, ink);
      });
    }
    inked(g, path, spec.st.fill, 4.5, ink);
    T.draw(g, spec.lay, 0, 0);
  }
  function drawShout(g, spec, tip) {
    const { a, b } = spec.body, seed = spec.seed;
    let per = 0; { let p = superPt(a, b, 2.6, 0); for (let i = 1; i <= 90; i++) { const q = superPt(a, b, 2.6, i / 90 * TAU); per += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } }
    const N = Math.max(12, Math.round(per / 96)), pts = [];
    for (let j = 0; j < N * 2; j++) {
      const th = (j + (hash(seed, j + 5) - 0.5) * 0.5) / (N * 2) * TAU;
      const k = j % 2 === 0 ? 1.19 + 0.2 * hash(seed, j + 40) : 1.0 + 0.03 * hash(seed, j + 40);
      const p = superPt(a, b, 2.6, th); pts.push([p[0] * k, p[1] * k * (j % 2 === 0 ? 1.08 : 1)]);
    }
    if (tip) {                                   /* the spike nearest the speaker reaches out like a tail */
      let j0 = 0, bd = 1e18;
      for (let j = 0; j < pts.length; j += 2) { const d = Math.hypot(pts[j][0] - tip[0], pts[j][1] - tip[1]); if (d < bd) { bd = d; j0 = j; } }
      pts[j0] = [lerp(pts[j0][0], tip[0], 0.8), lerp(pts[j0][1], tip[1], 0.8)];
    }
    const path = new Path2D(); pts.forEach((p, i) => path[i ? 'lineTo' : 'moveTo'](p[0], p[1])); path.closePath();
    g.save(); g.translate(10, 12); g.fillStyle = '#ffb3c7'; g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = 'round'; g.fill(path); g.stroke(path); g.restore();
    g.lineJoin = 'miter'; g.miterLimit = 6;
    g.save(); g.shadowColor = 'rgba(40,26,60,0.22)'; g.shadowBlur = 20; g.shadowOffsetY = 8; g.fillStyle = spec.st.fill; g.fill(path); g.restore();
    g.fillStyle = spec.st.fill; g.fill(path); g.strokeStyle = INK; g.lineWidth = 6.5; g.stroke(path);
    g.save(); g.rotate(-2.5 * DEG); T.draw(g, spec.lay, 0, spec.lay.size * 0.03); g.restore();
  }
  function drawNarration(g, spec) {
    const w = spec.bw, h = spec.bh, s = spec.seed, j = (i) => (hash(s, i) - 0.5) * 6;
    const box = (dx, dy) => { const p = new Path2D(); p.moveTo(-w / 2 + j(1) + dx, -h / 2 + j(2) + dy); p.lineTo(w / 2 + j(3) + dx, -h / 2 + j(4) + dy); p.lineTo(w / 2 + j(5) + dx, h / 2 + j(6) + dy); p.lineTo(-w / 2 + j(7) + dx, h / 2 + j(8) + dy); p.closePath(); return p; };
    g.lineJoin = 'round';
    g.save(); g.shadowColor = 'rgba(40,26,60,0.22)'; g.shadowBlur = 16; g.shadowOffsetY = 6; g.fillStyle = spec.dark ? '#8f9bd9' : '#ffb7c9'; g.fill(box(8, 9)); g.restore();
    g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke(box(8, 9));
    const m = box(0, 0); g.fillStyle = spec.st.fill; g.fill(m); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(m);
    T.draw(g, spec.lay, 0, 1);
  }
  function drawTextMsg(g, spec) {
    const w = spec.bw, h = spec.bh, me = spec.me, r = Math.min(38, h / 2), y0 = -h / 2 + spec.nameH / 2;
    const p = new Path2D();
    p.roundRect(-w / 2, y0, w, h, me ? [r, r, 10, r] : [r, r, r, 10]);
    const fill = me ? '#ff7fa3' : '#ffffff';
    g.save(); g.shadowColor = 'rgba(40,26,60,0.24)'; g.shadowBlur = 18; g.shadowOffsetY = 7; g.fillStyle = fill; g.fill(p); g.restore();
    if (!me) { g.strokeStyle = 'rgba(43,36,51,0.16)'; g.lineWidth = 2.5; g.stroke(p); }
    else { const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, '#ff8fb0'); gr.addColorStop(1, '#ff6f97'); g.fillStyle = gr; g.fill(p); }
    T.draw(g, spec.lay, 0, y0 + h / 2 + 1, { color: me ? '#ffffff' : spec.st.color, emColor: me ? '#fff3a8' : '#e8356f' });
    if (spec.name) {
      g.font = '700 30px "Pretendard"'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 7; g.strokeText(spec.name, -w / 2 + 8, -h / 2 - spec.nameH / 2 + 14);
      g.fillStyle = '#4a4352'; g.fillText(spec.name, -w / 2 + 8, -h / 2 - spec.nameH / 2 + 14);
    }
  }
  function drawCaption(g, spec) {
    const w = spec.bw, h = spec.bh, dark = L.luma(spec.cardColor) < 0.45;
    if (!spec.bare) {
      const gr = g.createLinearGradient(0, -h / 2, 0, h / 2), c = spec.cardColor;
      gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.16, rgba(c, 0.94)); gr.addColorStop(0.84, rgba(c, 0.94)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
    }
    const col = dark ? '#f3eefc' : spec.st.color, lw = Math.min(spec.lay.w * 0.5 + 60, w * 0.42);
    g.strokeStyle = rgba(col, 0.55); g.lineWidth = 2.5; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const y = s * (spec.lay.h / 2 + 30);
      g.beginPath(); g.moveTo(-lw, y); g.lineTo(-16, y); g.moveTo(16, y); g.lineTo(lw, y); g.stroke();
      g.fillStyle = dark ? '#ff9db8' : STYLE.accent; g.save(); g.translate(0, y); g.rotate(Math.PI / 4); g.fillRect(-5.5, -5.5, 11, 11); g.restore();
    }
    T.draw(g, spec.lay, 0, 0, { color: col, emColor: dark ? '#ff9db8' : STYLE.accent });
  }
  /* sfx lettering; k[i] in 0..1 = per-letter pop progress (undefined = settled) */
  function drawSfxLetters(g, spec, prog) {
    const S = spec.sfx, size = S.size;
    g.save(); g.rotate(spec.rot);
    g.font = '400 ' + size + 'px "' + S.fam + '"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const dark = L.luma(S.color) > 0.8 ? '#3d4a6b' : INK;
    const grad = g.createLinearGradient(0, -size * 0.5, 0, size * 0.5); grad.addColorStop(0, L.mix(S.color, '#ffffff', 0.38)); grad.addColorStop(0.55, S.color); grad.addColorStop(1, L.mix(S.color, '#7a1a4a', 0.16));
    for (let pass = 0; pass < 3; pass++) {
      S.letters.forEach((l, i) => {
        const k = prog ? prog(i) : 1; if (k <= 0) return;
        const pop = ease.outBack(k, 2.4), a = clamp(k * 4, 0, 1);
        g.save(); g.globalAlpha *= a; g.translate(l.x, l.dy - (1 - ease.outCubic(k)) * size * 0.25); g.rotate(l.rot + (1 - k) * 0.5 * (i % 2 ? 1 : -1)); g.scale(l.sc * pop, l.sc * pop);
        if (pass === 0) { g.strokeStyle = '#ffffff'; g.lineWidth = size * 0.21; g.strokeText(l.ch, 0, 0); }
        else if (pass === 1) { g.save(); g.translate(size * 0.02, size * 0.035); g.strokeStyle = dark; g.lineWidth = size * 0.1; g.strokeText(l.ch, 0, 0); g.restore(); g.strokeStyle = dark; g.lineWidth = size * 0.085; g.strokeText(l.ch, 0, 0); }
        else { g.fillStyle = grad; g.fillText(l.ch, 0, 0); g.fillStyle = 'rgba(255,255,255,0.5)'; g.save(); g.beginPath(); g.rect(-size, -size * 0.52, size * 2, size * 0.2); g.clip(); g.fillText(l.ch, 0, 0); g.restore(); }
        g.restore();
      });
    }
    g.restore();
  }
  const SHAPES = { speech: drawSpeech, whisper: drawSpeech, thought: drawThought, shout: drawShout, narration: drawNarration, text: drawTextMsg, caption: drawCaption, sfx: (g, spec) => drawSfxLetters(g, spec, null) };

  /* cached sprite of the settled bubble (+ a dimmed twin for old panels) */
  B.sprite = (spec) => {
    if (spec.sprite) return spec.sprite;
    const M = 48, tip = spec.tip ? [spec.tip[0] - spec.cx, spec.tip[1] - spec.cy] : null;
    const ex = spec.type === 'shout' ? 26 : spec.type === 'narration' ? 14 : spec.type === 'sfx' ? spec.sfx.size * 0.3 : 6;
    let x0 = -spec.bw / 2 - ex, x1 = spec.bw / 2 + ex, y0 = -spec.bh / 2 - ex - (spec.nameH || 0) / 2, y1 = spec.bh / 2 + ex + (spec.nameH || 0) / 2;
    if (tip) { x0 = Math.min(x0, tip[0] - 16); x1 = Math.max(x1, tip[0] + 16); y0 = Math.min(y0, tip[1] - 16); y1 = Math.max(y1, tip[1] + 16); }
    x0 = Math.floor(x0 - M); y0 = Math.floor(y0 - M); x1 = Math.ceil(x1 + M); y1 = Math.ceil(y1 + M);
    const c = L.makeCanvas(x1 - x0, y1 - y0), g = c.getContext('2d');
    g.translate(-x0, -y0);
    SHAPES[spec.type](g, spec, tip);
    spec.sprite = { c, ox: -x0, oy: -y0, cd: null };
    return spec.sprite;
  };
  function dimmedSprite(sp) {
    if (sp.cd) return sp.cd;
    const c = L.makeCanvas(sp.c.width, sp.c.height), g = c.getContext('2d');
    g.drawImage(sp.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = L.DIM_COLOR; g.fillRect(0, 0, c.width, c.height);
    return (sp.cd = c);
  }
  L.DIM_COLOR = 'rgba(24,18,44,0.30)';

  /* draw a placed bubble. lt = seconds since it appeared; dim 0..1 (old panel) */
  B.draw = (g, spec, lt, dim) => {
    if (lt < 0) return;
    let s = 1, alpha = 1, rot = 0, dx = 0, dy = 0, px = spec.cx, py = spec.cy;
    const tip = spec.tip;
    switch (spec.type) {
      case 'speech': { const k = lt / 0.26; s = lerp(0.55, 1, ease.outBack(k, 2.1)); alpha = clamp(lt / 0.09); if (tip) { px = lerp(spec.cx, tip[0], 0.6); py = lerp(spec.cy, tip[1], 0.6); } break; }
      case 'thought': { const k = lt / 0.45; s = lerp(0.86, 1, ease.outCubic(k)); alpha = clamp(lt / 0.3); dy = (1 - ease.outCubic(k)) * 16; break; }
      case 'shout': { const k = lt / 0.22; s = lerp(1.45, 1, ease.outBack(k, 2.6)); alpha = clamp(lt / 0.06); if (lt < 0.5) { const d = 1 - lt / 0.5; rot = Math.sin(lt * 70) * 0.035 * d; dx = Math.sin(lt * 91 + 1) * 7 * d; dy = Math.cos(lt * 83) * 5 * d; } break; }
      case 'whisper': { const k = lt / 0.5; s = lerp(0.95, 1, ease.outCubic(k)); alpha = clamp(lt / 0.45); break; }
      case 'narration': { const k = lt / 0.4; alpha = clamp(lt / 0.3); dx = -(1 - ease.outCubic(k)) * 34 * (spec.slide || 1); break; }
      case 'text': { const k = lt / 0.28; alpha = clamp(lt / 0.12); s = lerp(0.8, 1, ease.outBack(k, 1.6)); dy = (1 - ease.outCubic(k)) * 30; px = spec.cx + (spec.me ? 1 : -1) * spec.bw * 0.4; py = spec.cy + spec.bh * 0.4; break; }
      case 'caption': { const k = lt / 0.6; alpha = ease.outCubic(k); s = lerp(1.04, 1, ease.outCubic(k)); break; }
      case 'sfx': {
        const n = spec.sfx.letters.length, settle = 0.34 + 0.07 * n;
        if (lt < settle) {
          g.save(); g.translate(spec.cx, spec.cy);
          drawSfxLetters(g, spec, (i) => clamp((lt - i * 0.07) / 0.3, 0, 1));
          g.restore(); return;
        }
        const w = lt - settle; if (w < 0.7) { const d = 1 - w / 0.7; rot = Math.sin(w * 22) * 0.03 * d; s = 1 + Math.sin(w * 22) * 0.02 * d; }
        break;
      }
    }
    const sp = B.sprite(spec);
    g.save(); g.globalAlpha *= alpha;
    const still = s === 1 && rot === 0;
    if (!still) { g.translate(px + dx, py + dy); g.rotate(rot); g.scale(s, s); g.translate(-px, -py); }
    else if (dx || dy) g.translate(Math.round(dx), Math.round(dy));
    const X = Math.round(spec.cx - sp.ox), Y = Math.round(spec.cy - sp.oy);
    if (dim >= 1) g.drawImage(dimmedSprite(sp), X, Y);
    else { g.drawImage(sp.c, X, Y); if (dim > 0) { g.globalAlpha *= dim; g.drawImage(dimmedSprite(sp), X, Y); } }
    g.restore();
  };

  /* ---------- auto-placement ----------
   * env: { panel:{x,y,w,h}, allow:{x0,y0,x1,y1}, heads:[{who,x,y,r,fx,fy,fr,back}], unsafe:[rect], blocks:[{x0,y0,x1,y1,w}], seed }
   * Sets spec.cx, spec.cy, spec.tip; returns { cost, hard }. */
  const rectOf = (cx, cy, w, h, grow) => ({ x0: cx - w / 2 - (grow || 0), y0: cy - h / 2 - (grow || 0), x1: cx + w / 2 + (grow || 0), y1: cy + h / 2 + (grow || 0) });
  function axis(a0, a1, size, step) {
    const lo = a0 + size / 2, hi = a1 - size / 2;
    if (hi <= lo) return [(a0 + a1) / 2];
    const n = Math.max(1, Math.ceil((hi - lo) / step)), out = [];
    for (let i = 0; i <= n; i++) out.push(lo + (hi - lo) * i / n);
    return out;
  }
  function hardCost(R, Rin, env, placed, self) {
    let hard = 0;
    for (const h of env.heads) {
      const d = distPointRect(h.fx, h.fy, Rin), pen = (h.fr + 12 - d) / h.fr;
      if (pen > 0) hard += (h.back ? 260 : 2600) * pen * (1 + pen);
      const d2 = distPointRect(h.x, h.y, Rin), pen2 = (h.r + 4 - d2) / h.r;
      if (pen2 > 0) hard += (h.back ? 120 : 520) * pen2;
    }
    const area = (R.x1 - R.x0) * (R.y1 - R.y0);
    for (const p of placed) {
      if (p === self) continue;
      const pr = rectOf(p.cx, p.cy, p.bw, p.bh, p.type === 'sfx' ? -p.bh * 0.12 : 8), ov = rectOverlap(self && self.type === 'sfx' ? rectOf((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, R.x1 - R.x0, R.y1 - R.y0, -(R.y1 - R.y0) * 0.12) : R, pr);
      if (ov > 0) hard += 500 + 4200 * ov / Math.min(area, p.bw * p.bh);
      if (p.tip) { const tr = { x0: Math.min(p.tip[0], p.cx) , y0: Math.min(p.tip[1], p.cy), x1: Math.max(p.tip[0], p.cx), y1: Math.max(p.tip[1], p.cy) }; if (distPointRect(p.tip[0], p.tip[1], Rin) === 0) hard += 700; else if (rectOverlap(Rin, tr) > 0 && segHitsRect(p.cx, p.cy, p.tip[0], p.tip[1], Rin)) hard += 500; }
    }
    for (const u of env.unsafe || []) { const ov = rectOverlap(R, u); if (ov > 0) hard += 420 + 3200 * ov / area; }
    for (const u of env.blocks || []) { const ov = rectOverlap(R, u); if (ov > 0) hard += (u.w || 800) * (0.25 + ov / Math.min(area, (u.x1 - u.x0) * (u.y1 - u.y0))); }
    return hard;
  }
  function segHitsRect(x0, y0, x1, y1, r) {
    for (let i = 1; i < 8; i++) { const k = i / 8, x = lerp(x0, x1, k), y = lerp(y0, y1, k); if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true; }
    return false;
  }
  function edgePoint(spec, cx, cy, tx, ty) {      /* where the ray centre -> target leaves the bubble body */
    const dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    let a, b, n;
    if (spec.body) { a = spec.body.a; b = spec.body.b; n = spec.body.n; if (spec.type === 'shout') { a *= 1.1; b *= 1.15; } }
    else { a = spec.bw / 2; b = spec.bh / 2; n = 8; }
    const k = 1 / Math.pow(Math.pow(Math.abs(ux) / a, n) + Math.pow(Math.abs(uy) / b, n), 1 / n);
    return [cx + ux * k, cy + uy * k, len - k];
  }
  B.place = (specs, env) => {
    const placed = [], A = env.allow, P = env.panel;
    let total = 0, hardTotal = 0, prev = null;
    const nOrder = specs.filter(s => s.type !== 'sfx' && s.type !== 'caption').length;
    let orderIdx = 0;
    specs.forEach((spec, si) => {
      const b = spec.src, type = spec.type, bw = spec.bw, bh = spec.bh + (spec.nameH || 0);
      const S = spec.who ? env.heads.find(h => h.who === spec.who) : null;
      const inset = type === 'sfx' ? 0.22 : (type === 'narration' || type === 'text' || type === 'caption') ? 0.02 : 0.1;
      const ordered = type !== 'sfx' && type !== 'caption';
      let cands = [];
      if (Array.isArray(b.pos)) cands = [[clamp(P.x + b.pos[0] * P.w, A.x0 + bw / 2, Math.max(A.x0 + bw / 2, A.x1 - bw / 2)), clamp(P.y + b.pos[1] * P.h, A.y0 + bh / 2, Math.max(A.y0 + bh / 2, A.y1 - bh / 2))]];
      else if (type === 'caption') cands = [[P.x + P.w / 2, clamp(P.y + P.h / 2, A.y0 + bh / 2, Math.max(A.y0 + bh / 2, A.y1 - bh / 2))]];
      else if (type === 'narration') {
        const m = 22, xs = [A.x0 + m + bw / 2, (A.x0 + A.x1) / 2, A.x1 - m - bw / 2], ys = [];
        if (b.pos !== 'bottom') ys.push([A.y0 + m + bh / 2, 0]);
        if (b.pos !== 'top') ys.push([A.y1 - m - bh / 2, 1]);
        if (b.pos === 'middle') { ys.length = 0; ys.push([(A.y0 + A.y1) / 2, 2]); }
        for (const y of ys) xs.forEach((x, xi) => cands.push([x, y[0], y[1], xi]));
      } else if (type === 'text') {
        const m = 30, x = spec.me ? A.x1 - m - bw / 2 : A.x0 + m + bw / 2;
        for (const y of axis(A.y0 + 10, A.y1 - 10, bh, 14)) cands.push([x, y]);
      } else {
        const xs = axis(A.x0, A.x1, bw, 34), ys = axis(A.y0, A.y1, bh, 34);
        for (const y of ys) for (const x of xs) cands.push([x, y]);
      }
      let best = null;
      for (const c of cands) {
        const cx = c[0], cy = c[1];
        const R = rectOf(cx, cy, bw, bh, 0), Rin = rectOf(cx, cy, bw * (1 - inset), bh * (1 - inset), 0);
        const hard = hardCost(R, Rin, env, placed, spec);
        let cost = hard;
        if (type === 'narration') {
          cost += c[2] === 0 ? (orderIdx === 0 ? 0 : 60) : (orderIdx === 0 && nOrder > 1 ? 90 : 0);
          cost += c[2] === 0 ? [0, 30, 45][c[3]] : [45, 30, 0][c[3]];
          if (b.side === 'left') cost += c[3] * 200; if (b.side === 'right') cost += (2 - c[3]) * 200; if (b.side === 'center') cost += Math.abs(c[3] - 1) * 200;
        } else if (type === 'sfx') {
          if (S) { const d = Math.hypot(cx - S.x, cy - S.y), ideal = S.r * 1.25 + bw * 0.42; cost += Math.abs(d - ideal) * 1.3; if (cy > S.y + S.r * 1.6) cost += (cy - S.y - S.r * 1.6) * 0.8; }
          else cost += Math.hypot(cx - (P.x + P.w * (0.3 + 0.4 * hash(spec.seed, 5))), cy - (P.y + P.h * (0.25 + 0.2 * hash(spec.seed, 6)))) * 0.35;
          for (const h of env.heads) { const d = Math.hypot(cx - h.x, cy - h.y) - h.r - Math.min(bw, bh) * 0.5; if (d < 0) cost += -d * 6; }
        } else if (type === 'text') {
          if (prev && prev.type === 'text') cost += Math.abs(cy - (prev.cy + (prev.bh + (prev.nameH || 0)) / 2 + 22 + bh / 2)) * 1.4;
          else cost += Math.abs(cy - (A.y0 + (A.y1 - A.y0) * 0.3)) * 0.4;
        } else if (type !== 'caption') {
          if (S) {
            const gap = distPointRect(S.x, S.y, Rin) - S.r, ideal = S.r * 0.22 + 26;
            cost += Math.abs(gap - ideal) * (gap < ideal ? 1.6 : 0.95);
            if (cy > S.y) cost += (cy - S.y) * 0.9;
            const dS = distPointRect(S.x, S.y, R);
            for (const h of env.heads) if (h !== S && !h.back) {
              const dO = distPointRect(h.x, h.y, R); if (dO < dS) cost += 650 + (dS - dO) * 1.5;
              /* the tail must not run across somebody else's face */
              if (segHitsRect(cx, cy, S.x, S.y, { x0: h.fx - h.fr, y0: h.fy - h.fr, x1: h.fx + h.fr, y1: h.fy + h.fr })) cost += 900;
            }
            /* lean to the side with more room: over the speaker's outer shoulder rather than between two faces */
            if (env.heads.length > 1) { const mid = env.heads.reduce((s, h) => s + h.x, 0) / env.heads.length; if ((S.x - mid) * (cx - S.x) < 0) cost += Math.min(140, Math.abs(cx - S.x) * 0.35); }
          } else cost += (cy - A.y0) * 0.12 + Math.abs(cx - (A.x0 + A.x1) / 2) * 0.05;
          const side = b.side, ref = S ? [S.x, S.y, S.r] : [P.x + P.w / 2, P.y + P.h / 2, 0];
          if (side === 'left' && cx > ref[0] - ref[2] * 0.3) cost += 1500 + (cx - ref[0]) * 2;
          if (side === 'right' && cx < ref[0] + ref[2] * 0.3) cost += 1500 + (ref[0] - cx) * 2;
          if (side === 'top' && R.y1 > ref[1] - ref[2] * 0.5) cost += 1500 + (R.y1 - ref[1]) * 2;
          if (side === 'bottom' && R.y0 < ref[1] + ref[2] * 0.5) cost += 1500 + (ref[1] - R.y0) * 2;
        }
        if (ordered && type !== 'text') {
          if (prev && prev.type !== 'text') { const need = prev.cy + 0.36 * (prev.bh + bh); if (cy < need) cost += (need - cy) * 2.4; }
          cost += (cy - A.y0) * 0.22 * (nOrder - 1 - orderIdx) / Math.max(1, nOrder - 1) * (type === 'narration' ? 0 : 1);
        }
        if (!best || cost < best.cost) best = { cx, cy, cost, hard, c };
      }
      spec.cx = Math.round(best.cx); spec.cy = Math.round(best.cy); spec.tip = null;
      if (type === 'narration') spec.slide = best.c[3] === 2 ? -1 : 1;
      /* tail */
      if (type === 'speech' || type === 'whisper' || type === 'shout' || type === 'thought') {
        const tailOpt = b.tail;
        if (tailOpt === 'none' || tailOpt === false) spec.tip = null;
        else if (S) {
          const e = edgePoint(spec, spec.cx, spec.cy, S.x, S.y), gap = Math.hypot(S.x - e[0], S.y - e[1]) - S.r * 0.96;
          const len = gap < 22 ? 22 : clamp(gap * 0.8, 26, type === 'thought' ? 120 : 150);
          const dx = S.x - e[0], dy = S.y - e[1], dl = Math.hypot(dx, dy) || 1;
          spec.tip = [e[0] + dx / dl * len, e[1] + dy / dl * len];
        } else if (typeof tailOpt === 'string') {
          const dir = { left: [-1, 0.55], right: [1, 0.55], up: [0.3, -1], down: [-0.25, 1] }[tailOpt];
          if (dir) { const e = edgePoint(spec, spec.cx, spec.cy, spec.cx + dir[0] * 1000, spec.cy + dir[1] * 1000); const dl = Math.hypot(dir[0], dir[1]); spec.tip = [e[0] + dir[0] / dl * 52, e[1] + dir[1] / dl * 52]; }
        }
      }
      placed.push(spec);
      total += best.cost; hardTotal += best.hard;
      if (ordered) { prev = spec; orderIdx++; }
    });
    return { cost: total, hard: hardTotal };
  };

  /* build + place all the bubbles of one cut, shrinking the lettering when the panel is too crowded */
  B.layoutCut = (ctx, bubbles, env) => {
    let best = null;
    for (const k of [1, 0.92, 0.85]) {
      const specs = bubbles.map((b, i) => B.build(ctx, b, {
        fontScale: (env.fontScale || 1) * k, seed: env.seed + i * 131, panel: env.panel, dark: env.dark, bare: env.bare, pageColor: env.pageColor,
        maxTextW: Math.max(200, (env.allow.x1 - env.allow.x0) - (b.type === 'narration' || b.type === 'text' ? 150 : 130))
      }));
      const res = B.place(specs, env);
      if (!best || res.hard < best.res.hard - 60) best = { specs, res, k };
      if (res.hard < 60) break;
    }
    return best.specs;
  };

  /* ================================================================== panel layouts */
  const PAGE = L.PAGE = { x0: 44, x1: 1036, y0: 150, y1: 1610, gut: 22 };
  L.LAYOUTS = ['full', 'tall', 'stack2a', 'stack2b', 'big+small:a', 'big+small:b', 'small+big:a', 'small+big:b', 'stack3a', 'stack3b', 'stack3c', 'inset'];
  L.layoutRect = (name) => {
    const X = PAGE.x0, Wd = PAGE.x1 - PAGE.x0, Y = PAGE.y0, Hh = PAGE.y1 - PAGE.y0, G = PAGE.gut;
    const rows = (fr, i) => { const tot = Hh - G * (fr.length - 1); let y = Y; for (let k = 0; k < i; k++) y += Math.round(tot * fr[k]) + G; return { x: X, y, w: Wd, h: i === fr.length - 1 ? Y + Hh - y : Math.round(tot * fr[i]), framed: true }; };
    switch (name) {
      case 'full': return { x: 0, y: 0, w: L.W, h: L.H, framed: false };
      case 'tall': return { x: X, y: Y, w: Wd, h: Hh, framed: true };
      case 'stack2a': return rows([0.5, 0.5], 0);
      case 'stack2b': return rows([0.5, 0.5], 1);
      case 'big+small:a': return rows([0.6, 0.4], 0);
      case 'big+small:b': return rows([0.6, 0.4], 1);
      case 'small+big:a': return rows([0.4, 0.6], 0);
      case 'small+big:b': return rows([0.4, 0.6], 1);
      case 'stack3a': return rows([1 / 3, 1 / 3, 1 / 3], 0);
      case 'stack3b': return rows([1 / 3, 1 / 3, 1 / 3], 1);
      case 'stack3c': return rows([1 / 3, 1 / 3, 1 / 3], 2);
      case 'inset': return null;
    }
    L.warn('unknown layout "' + name + '" (tall)');
    return { x: X, y: Y, w: Wd, h: Hh, framed: true };
  };
  /* the part of a rect where faces and lettering may go (Instagram UI: SPEC section 4) */
  L.safeRect = (p, margin) => {
    const m = margin === undefined ? 14 : margin;
    return { x0: Math.max(p.x + m, 24), y0: Math.max(p.y + m, L.SAFE.top + 8), x1: Math.min(p.x + p.w - m, L.W - 24), y1: Math.min(p.y + p.h - m, L.SAFE.bottom - 8) };
  };
  L.unsafeRects = () => [{ x0: L.SAFE.rightX, y0: L.SAFE.rightY0, x1: L.W + 400, y1: L.SAFE.rightY1 + 400 }];

  /* ================================================================== camera */
  L.CAMS = ['still', 'pushIn', 'pullOut', 'panLeft', 'panRight', 'tiltUp', 'tiltDown', 'drift', 'shake'];
  /* -> { z, x, y }: zoom and camera-centre shift in stage fractions (x > 0: the camera looks further right) */
  L.camera = (move, u, amt, lt, seed) => {
    const e = lerp(clamp(u, 0, 1), ease.inOutSine(u), 0.65), h = amt / 2 * 0.86;
    switch (move) {
      case undefined: case null: case 'still': return { z: 1, x: 0, y: 0 };
      case 'pushIn': return { z: 1 + amt * e, x: 0, y: 0 };
      case 'pullOut': return { z: 1 + amt * (1 - e), x: 0, y: 0 };
      case 'panLeft': return { z: 1 + amt, x: lerp(h, -h, e), y: 0 };
      case 'panRight': return { z: 1 + amt, x: lerp(-h, h, e), y: 0 };
      case 'tiltUp': return { z: 1 + amt, x: 0, y: lerp(h, -h, e) };
      case 'tiltDown': return { z: 1 + amt, x: 0, y: lerp(-h, h, e) };
      case 'drift': return { z: 1 + amt * (0.75 + 0.25 * Math.sin(lt * 0.5)), x: Math.sin(lt * 0.42 + 0.6) * h * 0.55, y: Math.cos(lt * 0.33) * h * 0.4 };
      case 'shake': { const d = Math.exp(-lt * 4.2) * (lt < 1.2 ? 1 : 0); return { z: 1 + Math.max(amt, 0.03), x: noise1(lt * 26, seed) * 0.011 * d, y: noise1(lt * 31 + 9, seed + 7) * 0.011 * d }; }
    }
    L.warn('unknown cam "' + move + '" (still)');
    return { z: 1, x: 0, y: 0 };
  };
  L.heartPulse = (lt) => { if (lt < 0) return 0; const u = (lt % 0.95) / 0.95; return Math.exp(-(u - 0.1) * (u - 0.1) / 0.0022) + 0.62 * Math.exp(-(u - 0.33) * (u - 0.33) / 0.0036); };

  /* ================================================================== panel fx */
  L.FX = ['sparkle', 'hearts', 'petals', 'speedlines', 'focuslines', 'flash', 'vignette', 'rain', 'bokeh', 'pinkMood', 'gloomMood', 'shake', 'heartbeat'];
  function softDot(g, x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.55, rgba(col, a * 0.55)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function sparkles(g, e, N, baseR) {
    const sz = clamp(Math.min(e.w, e.h) / 900, 0.5, 1.1);
    for (let i = 0; i < N; i++) {
      const p = 1.3 + hash(i, e.seed) * 1.5, ph = hash(i + 50, e.seed), q = e.lt / p + ph, u = q - Math.floor(q), cyc = Math.floor(q);
      let x = hash(i * 7 + cyc * 13, e.seed + 1) * e.w, y = hash(i * 11 + cyc * 17, e.seed + 2) * e.h;
      const dx = x - e.fx, dy = y - e.fy, d = Math.hypot(dx, dy), keep = e.keep;
      if (d < keep) { const k = (keep + (keep - d) * 0.3) / (d || 1); x = e.fx + dx * k; y = e.fy + dy * k; }
      const k = Math.pow(Math.sin(Math.PI * u), 1.6), r = (baseR + 30 * hash(i + 90, e.seed)) * sz * k;
      if (r < 1) continue;
      softDot(g, x, y, r * 1.9, '#fff6c8', 0.5 * k);
      L.star4Path(g, x, y, r, 0.17); g.fillStyle = '#ffffff'; g.fill();
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); L.star4Path(g, 0, 0, r * 0.45, 0.22); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(); g.restore();
    }
  }
  function petalPath(g, r) { g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.95, -r * 0.7, r * 0.75, r * 0.65, 0.12 * r, r * 0.86); g.lineTo(0, r * 0.66); g.lineTo(-0.12 * r, r * 0.86); g.bezierCurveTo(-r * 0.75, r * 0.65, -r * 0.95, -r * 0.7, 0, -r); g.closePath(); }
  const FXD = {
    sparkle: { front(g, e) { sparkles(g, e, 16, 14); } },
    hearts: {
      front(g, e) {
        const sz = clamp(Math.min(e.w, e.h) / 900, 0.55, 1.1), cols = ['#ff6f95', '#ff9db8', '#ff4f7f', '#ffc2d4'];
        for (let i = 0; i < 11; i++) {
          const p = 2.6 + 1.8 * hash(i, e.seed), q = e.lt / p + hash(i + 30, e.seed), u = q - Math.floor(q), cyc = Math.floor(q);
          const x = (0.06 + 0.88 * hash(i * 5 + cyc * 3, e.seed + 3)) * e.w + Math.sin(u * TAU * 1.4 + i) * 26 * sz, y = e.h * (1.04 - u * (0.7 + 0.3 * hash(i + 70, e.seed)));
          const r = (15 + 26 * hash(i + 9, e.seed)) * sz, a = Math.pow(Math.sin(Math.PI * u), 0.6);
          g.save(); g.globalAlpha *= 0.92 * a; g.translate(x, y); g.rotate(Math.sin(u * 9 + i) * 0.25); g.scale(0.7 + 0.3 * a, 0.7 + 0.3 * a);
          L.heartPath(g, 0, 0, r); g.fillStyle = cols[i % 4]; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(2, r * 0.14); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.38, r * 0.2, r * 0.12, -0.6, 0, TAU); g.fill();
          g.restore();
        }
      }
    },
    petals: {
      draw(g, e, layer) {
        const sz = clamp(Math.min(e.w, e.h) / 900, 0.55, 1.1);
        for (let i = 0; i < 24; i++) {
          if ((i % 2 === 0) !== (layer === 'back')) continue;
          const sp = 0.1 + 0.09 * hash(i, e.seed), q = e.lt * sp + hash(i + 20, e.seed), u = q - Math.floor(q), cyc = Math.floor(q);
          const x0 = (hash(i * 3 + cyc * 7, e.seed + 4) * 1.4 - 0.05) * e.w, x = x0 - u * e.w * 0.42 + Math.sin(u * 14 + i) * 22, y = -50 + u * (e.h + 100);
          const r = (13 + 15 * hash(i + 60, e.seed)) * sz * (layer === 'back' ? 0.8 : 1.1), rot = e.lt * (1.1 + hash(i + 80, e.seed)) + i;
          g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(e.lt * 1.7 + i)));
          g.globalAlpha *= layer === 'back' ? 0.75 : 0.95;
          petalPath(g, r); const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#fff0f4'); gr.addColorStop(1, '#ff9fbc'); g.fillStyle = gr; g.fill();
          g.restore();
        }
      },
      back(g, e) { this.draw(g, e, 'back'); }, front(g, e) { this.draw(g, e, 'front'); }
    },
    speedlines: {
      front(g, e) {
        const dir = e.o.dir || 'left', vert = dir === 'up' || dir === 'down', rev = dir === 'right' || dir === 'down';
        const LW = vert ? e.h : e.w, LH = vert ? e.w : e.h;
        g.save(); if (vert) { g.translate(e.w, 0); g.rotate(Math.PI / 2); }
        for (let i = 0; i < 54; i++) {
          let yy = hash(i, e.seed); yy = yy < 0.5 ? yy * yy * 2 : 1 - (1 - yy) * (1 - yy) * 2;
          const len = (0.22 + 0.5 * hash(i + 10, e.seed)) * LW, sp = 2 + 2.4 * hash(i + 20, e.seed);
          const q = hash(i + 30, e.seed) + e.lt * sp, u = q - Math.floor(q);
          let x = (rev ? u : 1 - u) * (LW + len * 2) - len * 1.5;
          const y = yy * LH, th = (2 + 7 * hash(i + 40, e.seed)) * clamp(LH / 900, 0.5, 1);
          const col = i % 5 === 0 ? e.o.color2 || 'rgba(43,36,51,0.55)' : e.o.color || 'rgba(255,255,255,0.8)';
          g.fillStyle = col; g.beginPath();
          if (rev) { g.moveTo(x, y); g.lineTo(x + len, y - th / 2); g.lineTo(x + len, y + th / 2); } else { g.moveTo(x + len, y); g.lineTo(x, y - th / 2); g.lineTo(x, y + th / 2); }
          g.closePath(); g.fill();
        }
        g.restore();
      }
    },
    focuslines: {
      front(g, e) {
        const fr = Math.floor(e.lt * 10), N = 76, diag = Math.hypot(e.w, e.h), R0 = Math.min(e.w, e.h) * (e.o.inner || 0.5);
        g.fillStyle = e.o.color || 'rgba(34,26,44,0.82)'; g.beginPath();
        for (let i = 0; i < N; i++) {
          const a = (i + hash(i, e.seed + fr) * 0.9) / N * TAU, ri = R0 * (0.78 + 0.5 * hash(i * 3, e.seed + fr * 5)), wd = 0.005 + 0.013 * hash(i + 7, e.seed);
          const ex = Math.max(e.w, e.h) / Math.min(e.w, e.h), sx = e.w > e.h ? ex : 1, sy = e.h > e.w ? ex : 1;
          g.moveTo(e.fx + Math.cos(a) * ri * sx, e.fy + Math.sin(a) * ri * sy);
          g.lineTo(e.fx + Math.cos(a - wd) * diag, e.fy + Math.sin(a - wd) * diag); g.lineTo(e.fx + Math.cos(a + wd) * diag, e.fy + Math.sin(a + wd) * diag); g.closePath();
        }
        g.fill();
      }
    },
    flash: { front(g, e) { const d = e.o.dur || 0.4; if (e.lt < d) { g.fillStyle = rgba(e.o.color || '#ffffff', Math.pow(1 - e.lt / d, 1.6)); g.fillRect(0, 0, e.w, e.h); } } },
    vignette: {
      front(g, e) {
        const cx = e.w / 2, cy = e.h / 2, d = Math.hypot(cx, cy), gr = g.createRadialGradient(cx, cy, d * 0.45, cx, cy, d * 1.02), c = e.o.color || '#140c28';
        gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, rgba(c, e.o.amt || 0.62)); g.fillStyle = gr; g.fillRect(0, 0, e.w, e.h);
      }
    },
    rain: {
      front(g, e) {
        g.fillStyle = 'rgba(46,62,110,0.16)'; g.fillRect(0, 0, e.w, e.h);
        g.lineCap = 'round';
        for (let i = 0; i < 120; i++) {
          const sp = 1.5 + 1.1 * hash(i, e.seed), q = hash(i + 10, e.seed) + e.lt * sp, u = q - Math.floor(q), cyc = Math.floor(q);
          const len = (50 + 80 * hash(i + 20, e.seed)) * clamp(e.h / 1200, 0.5, 1), x = hash(i * 3 + cyc * 5, e.seed + 6) * e.w * 1.25, y = u * (e.h + 240) - 120;
          g.strokeStyle = 'rgba(225,238,255,' + (0.25 + 0.4 * hash(i + 30, e.seed)).toFixed(3) + ')'; g.lineWidth = 1.5 + 2 * hash(i + 40, e.seed);
          g.beginPath(); g.moveTo(x - y * 0.16, y); g.lineTo(x - (y + len) * 0.16, y + len); g.stroke();
        }
      }
    },
    bokeh: {
      back(g, e) {
        const sz = clamp(Math.min(e.w, e.h) / 900, 0.5, 1.1), cols = e.o.colors || ['#fff1c2', '#ffd3df', '#d5ebff', '#ffffff'];
        g.save(); g.globalCompositeOperation = 'screen';
        for (let i = 0; i < 15; i++) {
          const r = (46 + 100 * hash(i, e.seed)) * sz, x = hash(i + 10, e.seed) * e.w + Math.sin(e.lt * 0.35 + i * 2.1) * 26, yy = hash(i + 20, e.seed) - e.lt * 0.012 * (1 + hash(i + 30, e.seed));
          const y = (yy - Math.floor(yy)) * (e.h + r * 2) - r, a = 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(e.lt * 0.9 + i * 1.7));
          const gr = g.createRadialGradient(x, y, 0, x, y, r), c = cols[i % cols.length];
          gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.72, rgba(c, a * 0.9)); gr.addColorStop(0.8, rgba(c, a * 1.25)); gr.addColorStop(1, rgba(c, 0));
          g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        g.restore();
      }
    },
    pinkMood: {
      back(g, e) {
        const gr = g.createLinearGradient(0, 0, 0, e.h); gr.addColorStop(0, 'rgba(255,150,190,0.46)'); gr.addColorStop(1, 'rgba(255,205,170,0.34)'); g.fillStyle = gr; g.fillRect(0, 0, e.w, e.h);
        softDot(g, e.fx, e.fy, Math.max(e.w, e.h) * 0.62, '#fff4f7', 0.6);
        FXD.bokeh.back(g, Object.assign({}, e, { o: { colors: ['#ffd0e0', '#fff0c8', '#ffffff', '#ffc0d8'] } }));
      },
      front(g, e) {
        const cx = e.w / 2, cy = e.h / 2, d = Math.hypot(cx, cy), gr = g.createRadialGradient(cx, cy, d * 0.4, cx, cy, d);
        gr.addColorStop(0, 'rgba(255,120,170,0)'); gr.addColorStop(1, 'rgba(255,110,165,0.30)'); g.fillStyle = gr; g.fillRect(0, 0, e.w, e.h);
        sparkles(g, Object.assign({}, e, { seed: e.seed + 99 }), 7, 8);
      }
    },
    gloomMood: {
      back(g, e) { const gr = g.createLinearGradient(0, 0, 0, e.h); gr.addColorStop(0, 'rgba(22,26,66,0.62)'); gr.addColorStop(1, 'rgba(40,48,96,0.36)'); g.fillStyle = gr; g.fillRect(0, 0, e.w, e.h); },
      front(g, e) {
        g.fillStyle = 'rgba(24,28,70,0.16)'; g.fillRect(0, 0, e.w, e.h);
        g.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const x = (i + hash(i, e.seed)) / 30 * e.w, len = e.h * (0.1 + 0.26 * hash(i + 10, e.seed)) * (0.9 + 0.1 * Math.sin(e.lt * 1.5 + i)) * ease.outCubic(e.lt / 0.5);
          g.strokeStyle = 'rgba(26,26,72,' + (0.3 + 0.3 * hash(i + 20, e.seed)).toFixed(3) + ')'; g.lineWidth = 2 + 3 * hash(i + 30, e.seed);
          g.beginPath(); g.moveTo(x, -4); g.lineTo(x, len); g.stroke();
        }
      }
    },
    heartbeat: {
      front(g, e) {
        const p = L.heartPulse(e.lt); if (p < 0.01) return;
        const cx = e.w / 2, cy = e.h / 2, d = Math.hypot(cx, cy), gr = g.createRadialGradient(cx, cy, d * 0.42, cx, cy, d);
        gr.addColorStop(0, 'rgba(255,90,140,0)'); gr.addColorStop(1, rgba('#ff5a8c', 0.36 * Math.min(1, p))); g.fillStyle = gr; g.fillRect(0, 0, e.w, e.h);
      }
    },
    shake: {}
  };
  /* fx spec: "name" | { type, at, dur, ...options }. layer = 'back' (behind the actors) | 'front' */
  L.fxNorm = (f) => { const o = typeof f === 'string' ? { type: f } : Object.assign({}, f); o.at = o.at || 0; return o; };
  L.fxDraw = (g, f, layer, env) => {
    const d = FXD[f.type];
    if (!d) { L.warn('unknown fx "' + f.type + '"'); return; }
    if (!d[layer]) return;
    const lt = env.lt - f.at; if (lt < 0) return;
    let a = 1;
    if (f.dur) { if (lt > f.dur + 0.4) return; a = 1 - clamp((lt - f.dur) / 0.4, 0, 1); }
    if (f.type !== 'flash') a *= clamp(lt / 0.3, 0, 1);
    g.save(); g.globalAlpha *= a;
    d[layer](g, { w: env.w, h: env.h, lt, seed: env.seed + strSeed(f.type), fx: env.fx, fy: env.fy, keep: env.keep || 0, o: f });
    g.restore();
  };
  /* camera contribution of the fx list -> { z (multiplier), x, y (px) } */
  L.fxCam = (list, lt, seed, w) => {
    let z = 1, x = 0, y = 0;
    for (const f of list) {
      const t = lt - f.at; if (t < 0) continue;
      if (f.type === 'shake') { const dur = f.dur || 0.55; if (t < dur) { const d = Math.pow(1 - t / dur, 1.5), amp = (f.amt || 0.014) * w; x += noise1(t * 30, seed + 3) * amp * d; y += noise1(t * 34 + 5, seed + 4) * amp * d; } }
      else if (f.type === 'heartbeat') { if (!f.dur || t < f.dur) z *= 1 + 0.02 * Math.min(1, L.heartPulse(t)); }
    }
    return { z, x, y };
  };

  /* ================================================================== emote helpers */
  L.EMOTES = ['heart', 'sweat', 'exclaim', 'question', 'sparkle', 'anger', 'gloom', 'note', 'zzz', 'blushLines'];
  L.blushLines = (g, x, y, r, k) => {
    g.save(); g.globalAlpha *= 0.85 * k; g.strokeStyle = '#ff6f91'; g.lineCap = 'round'; g.lineWidth = Math.max(2.5, r * 0.045);
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) {
      const cx = x + s * r * 0.5 + i * r * 0.12, cy = y + r * 0.3;
      g.beginPath(); g.moveTo(cx + r * 0.05, cy - r * 0.09); g.lineTo(cx - r * 0.05, cy + r * 0.09); g.stroke();
    }
    g.restore();
  };

  /* ================================================================== transitions */
  L.TRANS = { cut: 0, fade: 0.4, scroll: 0.5, push: 0.45, whip: 0.28, flash: 0.36, iris: 0.5, pop: 0.3 };
})();
