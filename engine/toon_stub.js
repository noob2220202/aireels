/* engine/toon_stub.js: PLACEHOLDER art kit.
 * Implements the whole window.TOON interface of docs/SPEC.md section 5 with simple shapes so the
 * engine can be developed and tested before the real kit (engine/toon/) exists.
 * Pure functions of their arguments and t. No Math.random / Date / performance.now.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const warned = Object.create(null);
  function warn(msg) { if (!warned[msg]) { warned[msg] = 1; console.warn('[TOON stub] ' + msg); } }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  function strHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  /* ---------- colour ---------- */
  function hex(c) {
    if (c[0] === '#') { if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], k)) + ',' + Math.round(lerp(A[1], B[1], k)) + ',' + Math.round(lerp(A[2], B[2], k)) + ')'; }
  const LIGHT = {
    day: ['#ffffff', 0], indoor: ['#fff0d6', 0.06], evening: ['#ff9d5c', 0.16], dawn: ['#f7b6cf', 0.12], night: ['#27357a', 0.36]
  };
  const tintCache = Object.create(null);
  function tint(col, light) {
    const L = LIGHT[light] || LIGHT.day; if (!L[1]) return col;
    const key = col + '|' + light; return tintCache[key] || (tintCache[key] = mix(col, L[0], L[1]));
  }
  const INK = '#3a2b33';

  /* ---------- characters ---------- */
  const BASE = { height: 1000, headTop: -1000, headCenter: [0, -905], headR: 95, eyeY: -898, chinY: -815, shoulderY: -785, chestY: -705, waistY: -610, hipY: -530, kneeY: -275 };
  const chars = Object.create(null);
  function defineCharacter(id, def) {
    def = def || {};
    const body = def.body || def.gender || 'f';
    const k = def.height || (body === 'm' ? 1.06 : 0.98);
    const outfits = def.outfits || { default: {} };
    chars[id] = {
      id, def, body, k, phase: strHash(id) * 50,
      skin: def.skin || '#ffe2d2',
      hair: Object.assign({ style: body === 'm' ? 'short' : 'long', color: body === 'm' ? '#2e2a33' : '#6a4334' }, def.hair || {}),
      eyes: def.eyes || '#5b3d33',
      outfits
    };
    return chars[id];
  }
  function getChar(id) {
    if (!chars[id]) { warn('unknown character "' + id + '" (using a default body)'); defineCharacter(id, {}); }
    return chars[id];
  }
  function metrics(id) {
    const c = getChar(id), k = c.k, m = {};
    for (const key in BASE) m[key] = Array.isArray(BASE[key]) ? BASE[key].map(v => v * k) : BASE[key] * k;
    return m;
  }

  /* expressions as parameter sets (lerped for exprMix) */
  const E0 = { open: 1, arc: 0, browY: 0, browTilt: 0, curve: 0.15, mopen: 0, mw: 1, blush: 0, tear: 0, pupil: 1, tilt: 0, shape: 0, shine: 0, sweat: 0, lines: 0 };
  const EXPR = {
    neutral: {}, smile: { curve: 0.8, arc: 0.0, open: 0.9 }, softsmile: { curve: 0.5, open: 0.82, browY: 2 },
    laugh: { curve: 1, mopen: 0.8, arc: 1, browY: -4 }, shy: { curve: 0.3, open: 0.7, blush: 0.8, browTilt: 0.5, tilt: 3 },
    flustered: { curve: -0.1, mopen: 0.35, mw: 0.7, blush: 1, browTilt: 0.7, open: 1.15, pupil: 0.8, sweat: 1 },
    surprised: { mopen: 0.6, mw: 0.6, open: 1.3, browY: -12, pupil: 0.75, curve: 0 },
    sad: { curve: -0.7, browTilt: 1, open: 0.75, browY: 2 }, teary: { curve: -0.6, browTilt: 1, open: 0.9, tear: 1, shine: 1, mw: 0.8 },
    pout: { curve: -0.3, mw: 0.45, browTilt: -0.4, blush: 0.3, shape: 1 }, angry: { curve: -0.6, browTilt: -1, open: 0.85, mopen: 0.25, browY: 6 },
    annoyed: { curve: -0.35, browTilt: -0.6, open: 0.55, browY: 6 }, wink: { curve: 0.8, shape: 2, mopen: 0.3 },
    closed: { arc: -1, curve: 0.2 }, sleepy: { open: 0.35, curve: 0, browY: 4, mw: 0.7 },
    love: { curve: 0.9, mopen: 0.4, blush: 0.9, shine: 2, open: 1.1 }, nervous: { curve: -0.2, mw: 0.8, browTilt: 0.6, sweat: 1, open: 0.95, shape: 3 },
    thinking: { curve: -0.05, mw: 0.6, browTilt: 0.2, browY: -5, tilt: -4, shape: 4 }, smirk: { curve: 0.6, shape: 5, open: 0.8, browTilt: -0.3 },
    shock: { mopen: 0.9, mw: 0.8, open: 1.4, pupil: 0.5, browY: -16, lines: 1, curve: -0.2 }
  };
  const EXPR_NAMES = Object.keys(EXPR);
  function exprOf(name) { if (!EXPR[name]) { warn('unknown expression "' + name + '" (neutral)'); name = 'neutral'; } return Object.assign({}, E0, EXPR[name]); }
  function exprMixed(st) {
    const a = exprOf(st.expr || 'neutral'); const mx = st.exprMix;
    if (!mx || !mx.to || !(mx.k > 0)) return a;
    const b = exprOf(mx.to), k = clamp(mx.k, 0, 1), o = {};
    for (const key in a) o[key] = key === 'shape' ? (k > 0.5 ? b.shape : a.shape) : lerp(a[key], b[key], k);
    return o;
  }

  /* poses: arm = [elbowX, elbowY, handX, handY] from the shoulder, x positive = away from the body */
  const STAND = [12, 120, 8, 245];
  const POSES = {
    stand: {}, wave: { R: [70, 30, 100, -100], wave: 1 }, hold: { L: [20, 112, -60, 100], R: [20, 112, -60, 100], prop: 'chest', front: 1 },
    reachOut: { R: [62, 70, 150, 50], prop: 'handR' }, handToMouth: { R: [30, 105, -68, -42], front: 1 }, handOnHead: { R: [78, -30, 18, -185], front: 1 },
    armsCrossed: { L: [6, 104, -112, 82], R: [6, 104, -122, 96], front: 1 }, cheekHands: { L: [26, 95, -40, -78], R: [26, 95, -40, -78], front: 1 },
    phone: { R: [26, 112, -48, 22], prop: 'handR', front: 1, forceProp: 'phone' }, point: { R: [86, 22, 188, -14] },
    bow: { torso: 30 }, peek: { lean: 9, R: [58, -10, 72, -128], head: 7 }, lean: { lean: 7, L: [-8, 108, -66, 92] },
    sit: { sit: 1, L: [14, 108, -28, 186], R: [14, 108, -28, 186] }, walk: { walk: 1, L: [5, 120, 40, 228], R: [5, 120, -30, 234] },
    run: { walk: 2, lean: 9, L: [-20, 90, 62, 60], R: [30, 100, -40, 150] }
  };
  const POSE_NAMES = Object.keys(POSES);

  function autoBlink(t, ph) {
    const p = 3.4 + (ph % 1.3), u = ((t + ph) % p + p) % p;
    if (u < 0.16) return Math.sin(u / 0.16 * Math.PI);
    if (ph % 2 > 1 && u > 0.34 && u < 0.48) return Math.sin((u - 0.34) / 0.14 * Math.PI) * 0.9;
    return 0;
  }
  function limb(ctx, x0, y0, x1, y1, x2, y2, w, col) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function blob(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw !== 0) { ctx.strokeStyle = INK; ctx.lineWidth = lw || 3.5; ctx.lineJoin = 'round'; ctx.stroke(); } }

  function drawCharacter(ctx, id, st, t) {
    st = st || {}; t = t || 0;
    const c = getChar(id), M = BASE, L = st.light || 'day';
    let pose = st.pose || 'stand';
    if (!POSES[pose]) { warn('unknown pose "' + pose + '" (stand)'); pose = 'stand'; }
    const P = POSES[pose], E = exprMixed(st), view = st.view || 'front';
    if (!/^(front|q|side|back)$/.test(view)) warn('unknown view "' + view + '"');
    const of = c.outfits[st.outfit || 'default'] || c.outfits.default || {};
    if (st.outfit && !c.outfits[st.outfit]) warn('unknown outfit "' + st.outfit + '" for ' + id);
    const male = c.body === 'm';
    const col = {
      skin: tint(c.skin, L), skin2: tint(mix(c.skin, '#e9967a', 0.28), L), hair: tint(c.hair.color, L), hair2: tint(mix(c.hair.color, '#ffffff', 0.22), L),
      top: tint(of.top || (male ? '#8fb3d9' : '#f6c1cf'), L), bottom: tint(of.bottom || (male ? '#3d4662' : '#7d88b8'), L),
      shoes: tint(of.shoes || '#f4f1ee', L), eye: tint(c.eyes, L), white: tint('#ffffff', L)
    };
    const ph = c.phase;
    const breath = st.breath === undefined ? Math.sin(t * 1.9 + ph) : st.breath;
    const sway = st.hairSway === undefined ? Math.sin(t * 1.25 + ph * 2) * 0.6 + Math.sin(t * 2.7 + ph) * 0.2 : st.hairSway;
    const blink = st.blink === undefined ? autoBlink(t, ph) : st.blink;
    const look = st.look || [0, 0];
    const sw = (male ? 106 : 88) * (view === 'side' ? 0.45 : view === 'q' ? 0.9 : 1);   // shoulder half width
    const hw = (male ? 70 : 76) * (view === 'side' ? 0.6 : 1);
    const vx = view === 'q' ? 15 : view === 'side' ? 30 : 0;                            // face offset towards screen-right
    const sitDy = P.sit ? 210 : 0;
    const walkA = P.walk ? Math.sin(t * (P.walk === 2 ? 9 : 5) + ph) : 0;

    ctx.save();
    if (st.flip) ctx.scale(-1, 1);
    ctx.scale(c.k, c.k);
    if (st.alpha !== undefined) ctx.globalAlpha *= clamp(st.alpha, 0, 1);
    ctx.rotate(((st.lean || 0) + (P.lean || 0)) * DEG);
    if (P.walk) ctx.translate(0, -Math.abs(walkA) * (P.walk === 2 ? 14 : 6));

    /* back hair behind everything (front views) */
    const hs = c.hair.style, hx = vx * 0.3, hcY = M.headCenter[1] + sitDy;
    function backHair() {
      if (hs === 'short') return;
      const len = hs === 'bob' ? 110 : hs === 'pony' ? 60 : 300, s = sway * 14;
      ctx.beginPath(); ctx.moveTo(hx - 104, hcY - 20);
      ctx.bezierCurveTo(hx - 128, hcY + len * 0.5, hx - 112 + s, hcY + len, hx - 70 + s, hcY + len + 12);
      ctx.lineTo(hx + 70 + s, hcY + len + 12);
      ctx.bezierCurveTo(hx + 112 + s, hcY + len, hx + 128, hcY + len * 0.5, hx + 104, hcY - 20);
      ctx.closePath(); blob(ctx, col.hair);
      if (hs === 'pony') {
        ctx.beginPath(); ctx.moveTo(hx - 60, hcY - 70); ctx.bezierCurveTo(hx - 170, hcY - 40, hx - 150 + s * 2, hcY + 170, hx - 96 + s * 2.4, hcY + 230);
        ctx.bezierCurveTo(hx - 110 + s, hcY + 120, hx - 96, hcY + 10, hx - 50, hcY - 30); ctx.closePath(); blob(ctx, col.hair);
      }
    }
    if (view !== 'back') backHair();

    /* legs */
    const hipY = M.hipY + sitDy, legW = male ? 50 : 44;
    const skirt = !male && (of.style || 'skirt') === 'skirt';
    const legCol = skirt ? col.skin : col.bottom;
    for (const s of [-1, 1]) {
      const fx = s * (view === 'side' ? 14 : 40) + (P.walk ? s * walkA * (P.walk === 2 ? 70 : 34) : 0);
      const kx = s * (view === 'side' ? 12 : 40) + (P.sit ? 46 : 0) + (P.walk ? s * walkA * 20 : 0);
      limb(ctx, s * hw * 0.5, hipY + 10, kx, P.sit ? hipY + 40 : M.kneeY, fx + (P.sit ? 30 : 0), -8, legW, legCol);
      ctx.beginPath(); ctx.ellipse(fx + (P.sit ? 30 : 0) + (view === 'back' ? 0 : 10), -10, 38, 20, 0, 0, TAU); blob(ctx, col.shoes);
    }

    /* upper body */
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate((P.torso || 0) * DEG); ctx.translate(0, -hipY + sitDy);
    const shY = M.shoulderY - breath * 2.2, wY = M.waistY;
    function torso() {
      ctx.beginPath(); ctx.moveTo(-sw, shY + 16); ctx.quadraticCurveTo(-sw - 6, shY - 10, -sw + 34, shY - 14); ctx.lineTo(sw - 34, shY - 14);
      ctx.quadraticCurveTo(sw + 6, shY - 10, sw, shY + 16); ctx.lineTo(hw * 0.86, wY); ctx.lineTo(hw + (skirt ? 26 : 4), M.hipY + (skirt ? 110 : 26));
      ctx.lineTo(-hw - (skirt ? 26 : 4), M.hipY + (skirt ? 110 : 26)); ctx.lineTo(-hw * 0.86, wY); ctx.closePath();
      blob(ctx, col.top);
      /* skirt / waistband */
      ctx.beginPath(); ctx.moveTo(-hw * 0.9, wY + 26); ctx.lineTo(hw * 0.9, wY + 26); ctx.lineTo(hw + (skirt ? 30 : 4), M.hipY + (skirt ? 112 : 28)); ctx.lineTo(-hw - (skirt ? 30 : 4), M.hipY + (skirt ? 112 : 28)); ctx.closePath();
      blob(ctx, col.bottom);
      if (view !== 'back') { ctx.beginPath(); ctx.moveTo(-26 + vx, shY - 14); ctx.lineTo(vx, shY + 26); ctx.lineTo(26 + vx, shY - 14); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); }
    }
    function arm(side) {
      const A = P[side] || STAND, s = side === 'L' ? -1 : 1;
      const sx = s * (sw - 12), sy = shY + 14;
      let ex = sx + s * A[0], ey = sy + A[1], hx2 = sx + s * A[2], hy2 = sy + A[3];
      if (P.wave && side === 'R') { const a = Math.sin(t * 7 + ph) * 0.22; const dx = hx2 - ex, dy = hy2 - ey; hx2 = ex + dx * Math.cos(a) - dy * Math.sin(a); hy2 = ey + dx * Math.sin(a) + dy * Math.cos(a); }
      if (P.walk && !P.L) { hx2 += s * walkA * 30; }
      limb(ctx, sx, sy, ex, ey, hx2, hy2, male ? 44 : 38, col.top);
      ctx.beginPath(); ctx.arc(hx2, hy2, 23, 0, TAU); blob(ctx, col.skin);
      return [hx2, hy2];
    }
    function heldProp(hands) {
      const pid = st.held || P.forceProp; if (!pid || !P.prop) return;
      const fn = TOON.props[pid]; if (!fn) { warn('unknown prop "' + pid + '"'); return; }
      const at = P.prop === 'chest' ? [0, shY + 150] : [hands.R[0] + 10, hands.R[1] - 20];
      ctx.save(); ctx.translate(at[0], at[1]); ctx.scale(P.prop === 'chest' ? 1 : 0.6, P.prop === 'chest' ? 1 : 0.6); fn(ctx, t, { light: L, held: true }); ctx.restore();
    }
    function head() {
      ctx.save();
      ctx.translate(0, shY - 8); ctx.rotate(((st.headTilt || 0) + (P.head || 0) + E.tilt) * DEG); ctx.translate(0, -(shY - 8));
      const cy = M.headCenter[1], cx = vx * 0.3;
      /* neck */
      ctx.beginPath(); ctx.rect(-20 + cx, cy + 70, 40, 56); blob(ctx, col.skin2, 3);
      /* ears */
      if (view === 'front' || view === 'back') for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 90, cy + 8, 13, 20, 0, 0, TAU); blob(ctx, col.skin, 3); }
      /* face */
      ctx.beginPath(); ctx.moveTo(cx - 88, cy - 20);
      ctx.bezierCurveTo(cx - 92, cy - 110, cx + 92, cy - 110, cx + 88, cy - 20);
      ctx.bezierCurveTo(cx + 88, cy + 50, cx + 40 + vx, cy + 92, cx + vx * 0.6, cy + 92);
      ctx.bezierCurveTo(cx - 40 + vx * 0.4, cy + 92, cx - 88, cy + 50, cx - 88, cy - 20); ctx.closePath();
      blob(ctx, col.skin);
      if (view === 'back') {
        ctx.beginPath(); ctx.moveTo(-100, cy - 10); ctx.bezierCurveTo(-106, cy - 135, 106, cy - 135, 100, cy - 10);
        const len = hs === 'short' ? 70 : hs === 'bob' ? 120 : hs === 'pony' ? 80 : 300, s = sway * 12;
        ctx.bezierCurveTo(118, cy + len * 0.5, 104 + s, cy + len, 64 + s, cy + len + 10); ctx.lineTo(-64 + s, cy + len + 10);
        ctx.bezierCurveTo(-104 + s, cy + len, -118, cy + len * 0.5, -100, cy - 10); ctx.closePath(); blob(ctx, col.hair);
        ctx.beginPath(); ctx.moveTo(-40, cy - 70); ctx.quadraticCurveTo(-30, cy + 10, -44 + s, cy + len * 0.7); ctx.moveTo(40, cy - 70); ctx.quadraticCurveTo(34, cy + 10, 44 + s, cy + len * 0.7);
        ctx.strokeStyle = col.hair2; ctx.lineWidth = 4; ctx.stroke();
        ctx.restore(); return;
      }
      const fx = vx, eyeY = M.eyeY + 8, ex = view === 'side' ? [null, 52] : [-37 + fx, 37 + fx];
      /* blush */
      const bl = clamp(Math.max(st.blush || 0, E.blush), 0, 1);
      if (bl > 0.02) { ctx.save(); ctx.globalAlpha *= 0.55 * bl; ctx.fillStyle = '#ff7f9a'; for (const s of [0, 1]) if (ex[s] !== null) { ctx.beginPath(); ctx.ellipse(ex[s] + (s ? 10 : -10), eyeY + 40, 24, 13, 0, 0, TAU); ctx.fill(); } ctx.restore(); }
      /* eyes + brows */
      for (const s of [0, 1]) {
        if (ex[s] === null) continue;
        const x = ex[s], near = view === 'q' && s === 0 ? 0.82 : 1;
        let open = E.open * (1 - blink), arc = E.arc;
        if (E.shape === 2 && s === 1) { open = 0; arc = 1; }        /* wink */
        ctx.lineCap = 'round';
        if (Math.abs(arc) > 0.5 || open < 0.14) {
          ctx.beginPath(); const up = arc > 0.5 ? -12 : 7;
          ctx.moveTo(x - 20 * near, eyeY + 2); ctx.quadraticCurveTo(x, eyeY + 2 + up * 1.5, x + 20 * near, eyeY + 2);
          ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.stroke();
        } else {
          const ry = 21 * Math.min(open, 1.45);
          ctx.save(); ctx.beginPath(); ctx.ellipse(x, eyeY, 19 * near, ry, 0, 0, TAU); ctx.fillStyle = col.white; ctx.fill(); ctx.clip();
          const px = x + look[0] * 6, py = eyeY + look[1] * 5 + 1;
          ctx.beginPath(); ctx.arc(px, py, 15.5 * E.pupil, 0, TAU); ctx.fillStyle = col.eye; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py + 1, 8 * E.pupil, 0, TAU); ctx.fillStyle = '#2a1c1f'; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 6, py - 7, 5, 0, TAU); ctx.fill();
          if (E.shine > 0.5) { ctx.beginPath(); ctx.arc(px + 6, py + 6, 3.2, 0, TAU); ctx.fill(); }
          if (E.shine > 1.5) { ctx.fillStyle = '#ff6f91'; heartPath(ctx, px, py + 1, 8); ctx.fill(); }
          ctx.restore();
          ctx.beginPath(); ctx.moveTo(x - 21 * near, eyeY - ry * 0.45); ctx.quadraticCurveTo(x, eyeY - ry - 5, x + 22 * near, eyeY - ry * 0.4);
          ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.stroke();
        }
        const bs = s === 0 ? -1 : 1, by = eyeY - 38 + E.browY, bt = E.browTilt * 9;
        ctx.beginPath(); ctx.moveTo(x - bs * 20, by - bt); ctx.quadraticCurveTo(x, by - 5, x + bs * 22, by + bt);
        ctx.strokeStyle = col.hair; ctx.lineWidth = 5; ctx.stroke();
        if (E.tear > 0.3) { ctx.fillStyle = 'rgba(120,190,255,0.9)'; ctx.beginPath(); ctx.ellipse(x + bs * 12, eyeY + 22, 6, 9 * E.tear, 0, 0, TAU); ctx.fill(); }
      }
      /* nose + mouth */
      const mx = fx * 1.1 + (view === 'side' ? 26 : 0), my = M.chinY - 28;
      ctx.strokeStyle = col.skin2; ctx.lineWidth = 3.5; ctx.beginPath();
      if (view === 'side') { ctx.moveTo(84, eyeY + 16); ctx.lineTo(100, eyeY + 34); ctx.lineTo(84, eyeY + 40); } else { ctx.moveTo(mx, eyeY + 30); ctx.lineTo(mx + 4, eyeY + 37); }
      ctx.stroke();
      const mopen = st.mouth !== undefined ? Math.max(st.mouth, 0.02) : E.mopen, w = 22 * E.mw * (view === 'side' ? 0.6 : 1), cv = E.curve;
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      if (E.shape === 1 && mopen < 0.1) { ctx.beginPath(); ctx.arc(mx - 6, my, 6, Math.PI, 0, true); ctx.arc(mx + 6, my, 6, Math.PI, 0, true); ctx.stroke(); }
      else if (mopen < 0.1) {
        ctx.beginPath(); ctx.moveTo(mx - w, my - cv * 5 + (E.shape === 5 ? 6 : 0)); ctx.quadraticCurveTo(mx, my + cv * 13, mx + w, my - cv * 5 - (E.shape === 5 ? 5 : 0));
        if (E.shape === 3) { ctx.moveTo(mx - w, my); ctx.lineTo(mx - w * 0.5, my - 4); ctx.lineTo(mx, my + 2); ctx.lineTo(mx + w * 0.5, my - 4); ctx.lineTo(mx + w, my); }
        ctx.stroke();
      } else {
        const oh = 6 + 20 * mopen; ctx.beginPath(); ctx.moveTo(mx - w, my - cv * 4); ctx.quadraticCurveTo(mx, my - 2, mx + w, my - cv * 4);
        ctx.quadraticCurveTo(mx + w * 0.8, my + oh + cv * 6, mx, my + oh + cv * 6); ctx.quadraticCurveTo(mx - w * 0.8, my + oh + cv * 6, mx - w, my - cv * 4); ctx.closePath();
        ctx.fillStyle = '#8c2f3f'; ctx.fill(); ctx.stroke();
        ctx.save(); ctx.clip(); ctx.fillStyle = '#ff9aa8'; ctx.beginPath(); ctx.ellipse(mx, my + oh + cv * 6 + 2, w * 0.7, oh * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      if (E.sweat > 0.5) { ctx.fillStyle = 'rgba(140,200,255,0.95)'; ctx.beginPath(); ctx.moveTo(cx + 70, cy - 62); ctx.quadraticCurveTo(cx + 84, cy - 36, cx + 70, cy - 30); ctx.quadraticCurveTo(cx + 56, cy - 36, cx + 70, cy - 62); ctx.fill(); }
      if (E.lines > 0.5) { ctx.strokeStyle = 'rgba(70,90,160,0.7)'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 16, cy - 78); ctx.lineTo(cx + i * 16, cy - 50 + Math.abs(i) * 4); ctx.stroke(); } }
      /* front hair */
      const s2 = sway * 6;
      ctx.beginPath(); ctx.moveTo(cx - 100, cy + (hs === 'short' ? -6 : 30));
      ctx.bezierCurveTo(cx - 118, cy - 130, cx + 118, cy - 132, cx + 100, cy + (hs === 'short' ? -6 : 30));
      ctx.bezierCurveTo(cx + 96 + s2, cy - 30, cx + 80, cy - 60, cx + 58 + vx, cy - 64);
      ctx.quadraticCurveTo(cx + 30 + vx, cy - 28 + s2, cx + 6 + vx, cy - 62);
      ctx.quadraticCurveTo(cx - 28 + vx, cy - 24 - s2, cx - 56 + vx * 0.6, cy - 60);
      ctx.bezierCurveTo(cx - 80, cy - 58, cx - 96 + s2, cy - 30, cx - 100, cy + (hs === 'short' ? -6 : 30)); ctx.closePath();
      blob(ctx, col.hair);
      ctx.beginPath(); ctx.moveTo(cx - 50, cy - 104); ctx.quadraticCurveTo(cx, cy - 122, cx + 50, cy - 104); ctx.strokeStyle = col.hair2; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    }
    torso();
    if (view === 'back') { head(); backHairOverBack(); arm('L'); arm('R'); }
    else if (P.front) { head(); const hands = { L: arm('L'), R: arm('R') }; heldProp(hands); }
    else { const hands = { L: arm('L'), R: arm('R') }; heldProp(hands); head(); }
    function backHairOverBack() { /* long hair already drawn inside head() for the back view */ }
    ctx.restore();
    ctx.restore();
  }

  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9); ctx.closePath();
  }

  /* ---------- backgrounds ---------- */
  const TIME = {
    day: { sky: ['#9fd3ff', '#e6f5ff'], wall: 0, amb: null, lamp: 0 },
    indoor: { sky: ['#cfe6f7', '#f2f8fc'], wall: 0, amb: 'rgba(255,236,200,0.10)', lamp: 0.4 },
    evening: { sky: ['#7d6bb5', '#ff9f7a', '#ffd9a0'], wall: 0.1, amb: 'rgba(255,140,70,0.20)', lamp: 0.7 },
    dawn: { sky: ['#a9b4ea', '#f6c4d6', '#ffe6cf'], wall: 0.05, amb: 'rgba(250,170,200,0.14)', lamp: 0.2 },
    night: { sky: ['#0f1433', '#27336b'], wall: 0.5, amb: 'rgba(16,24,80,0.46)', lamp: 1 }
  };
  function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function sky(ctx, x, y, w, h, T, seed) {
    ctx.fillStyle = grad(ctx, 0, y, 0, y + h, T.sky); ctx.fillRect(x, y, w, h);
    if (T === TIME.night) { ctx.fillStyle = 'rgba(255,255,230,0.85)'; for (let i = 0; i < 26; i++) { const a = strHash('s' + seed + i), b = strHash('t' + seed + i); ctx.beginPath(); ctx.arc(x + a * w, y + b * h * 0.8, 1.5 + (i % 3), 0, TAU); ctx.fill(); } }
    else { ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 3; i++) { const a = strHash('c' + seed + i); ctx.beginPath(); ctx.ellipse(x + a * w, y + h * (0.2 + 0.2 * i), w * 0.14, h * 0.035, 0, 0, TAU); ctx.fill(); } }
  }
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
  const BG = {
    hallway(ctx, w, h, T) {
      ctx.fillStyle = mix('#f1e6d6', '#2b2f55', T.wall); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = mix('#e3d4bf', '#252848', T.wall); ctx.fillRect(0, 0, w, h * 0.09);
      const fy = h * 0.72; ctx.fillStyle = grad(ctx, 0, fy, 0, h, [mix('#cdb9a3', '#23264a', T.wall), mix('#b8a48f', '#1b1d3a', T.wall)]); ctx.fillRect(0, fy, w, h - fy);
      ctx.strokeStyle = 'rgba(80,60,60,0.25)'; ctx.lineWidth = 3; for (let i = -4; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w * (0.5 + i * 0.12), fy); ctx.lineTo(w * (0.5 + i * 0.3), h); ctx.stroke(); }
      ctx.fillStyle = mix('#a58f7c', '#1b1d3a', T.wall); ctx.fillRect(0, fy - h * 0.012, w, h * 0.014);
      for (const [dx, num] of [[0.2, '302'], [0.74, '303']]) {
        const x = w * dx, dw = Math.min(w * 0.3, h * 0.26), dh = h * 0.5, y = fy - dh;
        ctx.fillStyle = mix('#8b97b8', '#2a2f5c', T.wall * 0.8); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.rect(x - dw / 2, y, dw, dh); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,40,70,0.3)'; ctx.strokeRect(x - dw * 0.36, y + dh * 0.08, dw * 0.72, dh * 0.36); ctx.strokeRect(x - dw * 0.36, y + dh * 0.52, dw * 0.72, dh * 0.4);
        ctx.fillStyle = '#e8d9a8'; ctx.beginPath(); ctx.arc(x + dw * 0.36, y + dh * 0.52, dw * 0.035, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - dw * 0.14, y - dh * 0.09, dw * 0.28, dh * 0.055); ctx.fillStyle = INK; ctx.font = '600 ' + Math.round(dh * 0.04) + 'px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, x, y - dh * 0.062);
      }
      glow(ctx, w * 0.47, h * 0.05, h * 0.5, 'rgba(255,238,190,1)', 0.25 + 0.5 * T.lamp);
    },
    room(ctx, w, h, T, cam) {
      ctx.fillStyle = mix('#f6ead9', '#2a2d55', T.wall); ctx.fillRect(0, 0, w, h);
      const fy = h * 0.7, wx = w * 0.1 , ww = w * 0.46, wy = h * 0.14, wh = h * 0.36;
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); sky(ctx, wx - cam.x * w * 0.4 - 40, wy, ww + 80, wh, T, 'room');
      ctx.fillStyle = mix('#b9c8dd', '#1a2046', T.wall); for (let i = 0; i < 5; i++) { const bh = wh * (0.3 + 0.25 * strHash('b' + i)); ctx.fillRect(wx + ww * i * 0.22 - cam.x * w * 0.25, wy + wh - bh, ww * 0.18, bh); }
      ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(8, w * 0.012); ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
      ctx.fillStyle = mix('#ffc9d2', '#4a3f7a', T.wall); ctx.fillRect(wx - w * 0.04, wy - h * 0.02, w * 0.07, wh + h * 0.07); ctx.fillRect(wx + ww - w * 0.03, wy - h * 0.02, w * 0.07, wh + h * 0.07);
      ctx.fillStyle = grad(ctx, 0, fy, 0, h, [mix('#d9b998', '#252849', T.wall), mix('#c6a280', '#1c1e3b', T.wall)]); ctx.fillRect(0, fy, w, h - fy);
      const sx = w * 0.52, sy = fy - h * 0.13, sw2 = w * 0.44, sh = h * 0.16;
      ctx.fillStyle = mix('#9fb7a6', '#2c3a5c', T.wall); ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(sx, sy - sh * 0.5, sw2, sh * 1.2, 24); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(sx - w * 0.02, sy + sh * 0.2, sw2 + w * 0.04, sh * 0.75, 20); ctx.fill(); ctx.stroke();
      ctx.fillStyle = mix('#ffd9a0', '#5b5a8a', T.wall); ctx.beginPath(); ctx.roundRect(sx + sw2 * 0.1, sy - sh * 0.1, sw2 * 0.24, sh * 0.4, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = mix('#6f9c78', '#24385a', T.wall); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(w * 0.08 + (i - 2) * w * 0.022, fy - h * 0.1 - (2 - Math.abs(i - 2)) * h * 0.02, w * 0.025, h * 0.05, (i - 2) * 0.3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = mix('#c98f6b', '#3a3050', T.wall); ctx.beginPath(); ctx.roundRect(w * 0.045, fy - h * 0.06, w * 0.07, h * 0.07, 8); ctx.fill(); ctx.stroke();
      glow(ctx, w * 0.9, h * 0.22, h * 0.36, 'rgba(255,225,160,1)', 0.2 + 0.6 * T.lamp);
    },
    street(ctx, w, h, T, cam) {
      sky(ctx, 0, 0, w, h * 0.75, T, 'street');
      const gy = h * 0.73;
      ctx.fillStyle = mix('#b4bfdc', '#161b40', T.wall * 0.9); for (let i = -1; i < 8; i++) { const bh = h * (0.2 + 0.25 * strHash('fb' + i)); ctx.fillRect(w * i * 0.15 - cam.x * w * 0.5, gy - bh, w * 0.13, bh); }
      for (let i = -1; i < 4; i++) {
        const x = w * i * 0.36 - cam.x * w * 0.15 - w * 0.05, bh = h * (0.4 + 0.12 * strHash('nb' + i)), bw = w * 0.33;
        ctx.fillStyle = mix(['#f3d9c4', '#d8e3c9', '#e7d2e6', '#cfe0ee'][(i + 4) % 4], '#1d2248', T.wall * 0.85); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.rect(x, gy - bh, bw, bh); ctx.fill(); ctx.stroke();
        for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 2; c2++) { const lit = strHash('w' + i + r + c2) < 0.25 + T.lamp * 0.5; ctx.fillStyle = lit && T.lamp > 0.3 ? '#ffe7a3' : mix('#cfe6f7', '#27306a', T.wall); ctx.fillRect(x + bw * (0.14 + c2 * 0.44), gy - bh + bh * (0.08 + r * 0.24), bw * 0.28, bh * 0.14); }
        ctx.fillStyle = mix('#ff9fb0', '#5a3f6a', T.wall); ctx.fillRect(x, gy - h * 0.1, bw, h * 0.02);
      }
      ctx.fillStyle = grad(ctx, 0, gy, 0, h, [mix('#c9c6cf', '#1a1d3c', T.wall), mix('#aba8b4', '#131530', T.wall)]); ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.1 + i * 0.16), gy + (h - gy) * 0.45, w * 0.09, (h - gy) * 0.08);
      const lx = w * 0.86; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(8, w * 0.012); ctx.beginPath(); ctx.moveTo(lx, gy + 10); ctx.lineTo(lx, h * 0.24); ctx.quadraticCurveTo(lx, h * 0.2, lx - w * 0.06, h * 0.2); ctx.stroke();
      ctx.fillStyle = T.lamp > 0.3 ? '#fff3c4' : '#e9e9ee'; ctx.beginPath(); ctx.ellipse(lx - w * 0.07, h * 0.205, w * 0.03, h * 0.012, 0, 0, TAU); ctx.fill();
      if (T.lamp > 0.3) glow(ctx, lx - w * 0.07, h * 0.22, h * 0.4, 'rgba(255,235,170,1)', 0.75 * T.lamp);
    },
    cafe(ctx, w, h, T, cam) {
      ctx.fillStyle = mix('#f4e3cf', '#2c2a50', T.wall * 0.7); ctx.fillRect(0, 0, w, h);
      const fy = h * 0.74, wx = w * 0.06, ww = w * 0.6, wy = h * 0.12, wh = h * 0.44;
      ctx.save(); ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 18); ctx.clip(); sky(ctx, wx - 40 - cam.x * w * 0.4, wy, ww + 80, wh, T, 'cafe');
      ctx.fillStyle = mix('#c3d6c0', '#1c2a4a', T.wall); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(wx + ww * (0.15 + i * 0.26) - cam.x * w * 0.2, wy + wh * 0.82, wh * 0.26, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.strokeStyle = mix('#7a5a48', '#15152c', T.wall); ctx.lineWidth = Math.max(10, w * 0.014); ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx + ww * 0.5, wy); ctx.lineTo(wx + ww * 0.5, wy + wh); ctx.stroke();
      ctx.fillStyle = grad(ctx, 0, fy, 0, h, [mix('#c79f7c', '#221f3d', T.wall), mix('#b08865', '#19172f', T.wall)]); ctx.fillRect(0, fy, w, h - fy);
      ctx.fillStyle = mix('#8a5f48', '#2a2140', T.wall); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.rect(w * 0.7, fy - h * 0.2, w * 0.34, h * 0.2 + 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = mix('#f7efe4', '#55507a', T.wall); ctx.fillRect(w * 0.68, fy - h * 0.215, w * 0.36, h * 0.022);
      ctx.fillStyle = mix('#3f4a3f', '#1d2238', T.wall); ctx.beginPath(); ctx.roundRect(w * 0.74, h * 0.2, w * 0.2, h * 0.14, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.76, h * (0.225 + i * 0.027), w * (0.08 + 0.07 * strHash('m' + i)), h * 0.006);
      for (const px of [0.2, 0.5, 0.82]) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * px, 0); ctx.lineTo(w * px, h * 0.07); ctx.stroke(); ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.moveTo(w * px - w * 0.035, h * 0.1); ctx.quadraticCurveTo(w * px, h * 0.04, w * px + w * 0.035, h * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); glow(ctx, w * px, h * 0.11, h * 0.26, 'rgba(255,225,150,1)', 0.25 + 0.5 * T.lamp); }
    }
  };
  const bgCache = new Map();
  function makeBg(id) {
    return function (ctx, w, h, t, opts) {
      opts = opts || {};
      let time = opts.time || 'day'; if (!TIME[time]) { warn('unknown time "' + time + '" (day)'); time = 'day'; }
      const cam = opts.cam || { x: 0, y: 0, z: 1 }, bl = Math.round(clamp(opts.blur || 0, 0, 1) * 2) / 2;
      const key = [id, Math.round(w), Math.round(h), time, bl].join('|');
      let c = bgCache.get(key);
      if (!c) {
        if (bgCache.size > 24) bgCache.delete(bgCache.keys().next().value);
        c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
        const g = c.getContext('2d'); const T = TIME[time];
        const src = document.createElement('canvas'); src.width = c.width; src.height = c.height; const sg = src.getContext('2d');
        BG[id](sg, w, h, T, { x: 0, y: 0, z: 1 });
        if (T.amb) { sg.fillStyle = T.amb; sg.fillRect(0, 0, w, h); }
        if (bl > 0) { g.filter = 'blur(' + Math.round(bl * Math.min(w, h) * 0.012 + 2) + 'px)'; g.drawImage(src, 0, 0); g.filter = 'none'; g.globalAlpha = 0.12; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
        else g.drawImage(src, 0, 0);
        bgCache.set(key, c);
      }
      /* the stub is a cached still: parallax = a small counter-shift of the whole plate */
      const ox = -(cam.x || 0) * w * 0.25, oy = -(cam.y || 0) * h * 0.25;
      ctx.drawImage(c, ox - Math.abs(ox) - 2, oy - Math.abs(oy) - 2, w + Math.abs(ox) * 2 + 4, h + Math.abs(oy) * 2 + 4);
    };
  }
  const backgrounds = {}; for (const id in BG) backgrounds[id] = makeBg(id);

  /* ---------- props (drawn around the origin, rig units) ---------- */
  const props = {
    box(ctx, t, o) { const L = (o && o.light) || 'day'; ctx.beginPath(); ctx.rect(-80, -60, 160, 120); blob(ctx, tint('#d9b07c', L), 4); ctx.beginPath(); ctx.rect(-14, -60, 28, 120); ctx.fillStyle = tint('#f1dcb4', L); ctx.fill(); ctx.beginPath(); ctx.rect(22, -10, 44, 34); blob(ctx, '#fff', 2.5); },
    phone(ctx, t, o) { ctx.beginPath(); ctx.roundRect(-34, -64, 68, 128, 12); blob(ctx, '#3b3f55', 4); ctx.beginPath(); ctx.roundRect(-27, -54, 54, 104, 6); ctx.fillStyle = '#dff1ff'; ctx.fill(); },
    cup(ctx, t, o) { ctx.beginPath(); ctx.moveTo(-34, -46); ctx.lineTo(34, -46); ctx.lineTo(26, 46); ctx.lineTo(-26, 46); ctx.closePath(); blob(ctx, '#fffaf2', 4); ctx.beginPath(); ctx.rect(-30, -14, 60, 26); ctx.fillStyle = '#c98f6b'; ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -46, 38, 9, 0, 0, TAU); blob(ctx, '#7a5240', 3); const a = 0.35 + 0.2 * Math.sin(t * 2); ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-8, -64); ctx.quadraticCurveTo(-20, -84, -6, -104); ctx.moveTo(12, -62); ctx.quadraticCurveTo(0, -84, 14, -100); ctx.stroke(); },
    umbrella(ctx, t, o) { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(0, 110); ctx.quadraticCurveTo(0, 136, 22, 126); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-170, -130); ctx.quadraticCurveTo(0, -330, 170, -130); ctx.quadraticCurveTo(128, -160, 85, -130); ctx.quadraticCurveTo(42, -160, 0, -130); ctx.quadraticCurveTo(-42, -160, -85, -130); ctx.quadraticCurveTo(-128, -160, -170, -130); ctx.closePath(); blob(ctx, '#ff9fb4', 4); },
    flower(ctx, t, o) { ctx.strokeStyle = '#5d9a6a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 90); ctx.quadraticCurveTo(-10, 30, 0, -20); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.sin(t) * 0.05; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 26, -30 + Math.sin(a) * 26, 20, 13, a, 0, TAU); blob(ctx, '#ffc2d1', 3); } ctx.beginPath(); ctx.arc(0, -30, 13, 0, TAU); blob(ctx, '#ffe08a', 3); }
  };

  /* ---------- emotes: centre (x, y), s = size multiplier (1 = about 100 px tall) ---------- */
  function emote(ctx, kind, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (kind) {
      case 'heart': { const p = 1 + 0.08 * Math.sin(t * 7); ctx.scale(p, p); heartPath(ctx, 0, 0, 34); ctx.fillStyle = '#ff5f8a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#c2305a'; ctx.lineWidth = 2.5; ctx.stroke(); break; }
      case 'sweat': { const d = (t * 0.6) % 1; ctx.translate(0, d * 14); ctx.beginPath(); ctx.moveTo(0, -42); ctx.bezierCurveTo(30, 0, 26, 36, 0, 36); ctx.bezierCurveTo(-26, 36, -30, 0, 0, -42); ctx.fillStyle = '#9fd4ff'; ctx.fill(); ctx.strokeStyle = '#4c86c9'; ctx.lineWidth = 4; ctx.stroke(); break; }
      case 'exclaim': case 'question': { ctx.rotate(Math.sin(t * 9) * 0.05 + 0.12); ctx.font = '900 110px "Black Han Sans", Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const ch = kind === 'exclaim' ? '!' : '?'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 16; ctx.strokeText(ch, 0, 0); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeText(ch, 0, 0); ctx.fillStyle = kind === 'exclaim' ? '#ff5a5a' : '#ffb52e'; ctx.fillText(ch, 0, 0); break; }
      case 'sparkle': { for (const [dx, dy, r, ph] of [[0, 0, 36, 0], [34, -30, 18, 1.5], [-30, 26, 14, 3]]) { const k = 0.7 + 0.3 * Math.sin(t * 6 + ph); star4(ctx, dx, dy, r * k); ctx.fillStyle = '#ffe36e'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); } break; }
      case 'anger': { ctx.strokeStyle = '#ff4b4b'; ctx.lineWidth = 9; const p = 1 + 0.1 * Math.sin(t * 12); ctx.scale(p, p); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(10, 34); ctx.quadraticCurveTo(10, 10, 34, 10); ctx.stroke(); } break; }
      case 'gloom': { ctx.strokeStyle = 'rgba(70,80,150,0.85)'; ctx.lineWidth = 6; for (let i = -2; i <= 2; i++) { const l = 44 + 16 * Math.sin(t * 2 + i); ctx.beginPath(); ctx.moveTo(i * 20, -40); ctx.lineTo(i * 20, -40 + l); ctx.stroke(); } break; }
      case 'note': { ctx.rotate(Math.sin(t * 4) * 0.15); ctx.fillStyle = '#7a6cf0'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(-12, 26, 17, 13, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(1, -40, 7, 68); ctx.beginPath(); ctx.moveTo(1, -40); ctx.quadraticCurveTo(34, -34, 30, -4); ctx.quadraticCurveTo(24, -22, 8, -22); ctx.closePath(); ctx.fill(); break; }
      case 'zzz': { ctx.font = '900 54px "Black Han Sans", Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1); ctx.save(); ctx.globalAlpha *= Math.sin(u * Math.PI); ctx.translate(-24 + u * 50, 30 - u * 70); ctx.scale(0.5 + u * 0.7, 0.5 + u * 0.7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('Z', 0, 0); ctx.fillStyle = '#6f8fe8'; ctx.fillText('Z', 0, 0); ctx.restore(); } break; }
      default: warn('unknown emote "' + kind + '"');
    }
    ctx.restore();
  }
  function star4(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? r * 0.3 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }

  const TOON = window.TOON = {
    stub: true, version: 'stub-1',
    defineCharacter, metrics, drawCharacter, emote,
    expressions: EXPR_NAMES, poses: POSE_NAMES, backgrounds, props,
    emotes: ['heart', 'sweat', 'exclaim', 'question', 'sparkle', 'anger', 'gloom', 'note', 'zzz']
  };
})();
