// swept (≈23.37-29.22): "요리사 해리슨 오케네는 캄캄한 통로에서 물살에 휩쓸려 작은 화장실로 밀려갔습니다."
// Picks up capsize's last image: the tug upside down on the seabed, drawn here as a dark line-art cutaway (keel on top).
// '요리사': one warm light comes on inside the hull (him; never a figure), tagged '요리사 · 당시 29세'. '해리슨 오케네는':
// it breathes; the camera dives through the hull wall toward it. '캄캄한': pitch black, only his glow. '통로에서': the
// inverted passage is revealed as line art (old floor on top with the skirting, dead ceiling lamps and pipes at the bottom,
// door louvres and handles high) and he leaves a door marked '화장실'. '물살에': a surge front comes down the passage
// (chevrons, streaks, foam). '휩쓸려': it takes him; the camera lurches after him with a dutch sway. '작은 화장실로': the
// next doors come up: '화장실' next to '사관 선실'. '밀려갔습니다': he is pushed through the doorway; the camera pushes
// into the black and lands (thunk) inside the small inverted toilet: pocket's opening frame, his light settling by the basin.
(function () {
'use strict';
const { W, H, E, P, clamp, lerp, hash, rgba, glow, text, measure, roundRect, FONT } = L;
const PK = window.PK;
const { at, chip } = PK;

// ---- hull geometry (capsize's tug, local x: stern -380 .. bow 398, z up from the keel), drawn upside down ----
const ZC = 70;
const HULL = [[-380, 124], [-384, 64], [-369, 26], [-334, 7], [-262, 0], [226, 0], [296, 9], [344, 32], [374, 80], [398, 162], [356, 158], [44, 154], [40, 124]];
const HOUSE = [[46, 306, 52, 296, 154, 208], [72, 284, 76, 278, 208, 256], [112, 276, 106, 290, 256, 302]];
const KH = 19.33, HX = -3900, HY = 76.7;                 // local -> world (1 local unit = 19.33 world px)
const hw = (x, z) => [HX + x * KH, HY + (z - ZC) * KH];
const CT = 560, CB = 1140;                             // passage: old floor (now on top) .. old ceiling (now at the bottom) == z 95..125
const SEABED = hw(0, 296)[1];
const Z0 = 920 / (782 * KH), C0 = { x: hw(9, 0)[0], y: hw(0, 0)[1] + 60 / Z0 };   // keel at screen y ~790, as capsize leaves it
// doors on the passage's back wall
const DOORS = [{ x: -1000, w: 186, kind: 'wc1' }, { x: -430, w: 186 }, { x: 170, w: 186 }, { x: 1000, w: 176, kind: 'wc2' }, { x: 1330, w: 236, kind: 'cabin' }];
const ENDX = 1660;
const DOOR_Y0 = CT + 18, DOOR_Y1 = CT + 18 + 520;

const hi = n => { n = Math.floor(n) | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const nz = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hi(i + s * 7919), hi(i + 1 + s * 7919), u) * 2 - 1; };

let HULLP = null;
function hullPaths() {
  if (HULLP) return HULLP;
  const body = new Path2D(); HULL.forEach(([x, z], i) => { const [X, Y] = hw(x, z); i ? body.lineTo(X, Y) : body.moveTo(X, Y); }); body.closePath();
  const house = new Path2D();
  HOUSE.forEach(([a0, a1, b0, b1, z0, z1]) => { const q = [hw(a0, z0), hw(a1, z0), hw(b1, z1), hw(b0, z1)]; house.moveTo(...q[0]); q.slice(1).forEach(p => house.lineTo(...p)); house.closePath(); });
  const all = new Path2D(); all.addPath(body); all.addPath(house);
  // interior schematic: decks + bulkheads
  const decks = new Path2D();
  [[40, -360, 372], [95, -366, 380], [125, 40, 386]].forEach(([z, x0, x1]) => { const a = hw(x0, z), b = hw(x1, z); decks.moveTo(...a); decks.lineTo(...b); });
  [[208, 58, 292], [256, 90, 282]].forEach(([z, x0, x1]) => { const a = hw(x0, z), b = hw(x1, z); decks.moveTo(...a); decks.lineTo(...b); });
  [-300, -200, -90, 40, 120, 200, 286, 340].forEach(x => { const a = hw(x, 2), b = hw(x, x > 40 ? 154 : 124); decks.moveTo(...a); decks.lineTo(...b); });
  [150, 230].forEach(x => { const a = hw(x, 154), b = hw(x, 300); decks.moveTo(...a); decks.lineTo(...b); });
  HULLP = { body, house, all, decks }; return HULLP;
}

// ---- passage water: a surge front runs down the passage from the left ----
function frontX(t, tS) { return lerp(-2900, 2600, P(t, tS, tS + 2.3)); }
function waterY(x, t, T, tS) {
  const xf = frontX(t, tS), behind = clamp((xf - x) / 300), e = behind * behind * (3 - 2 * behind);
  return lerp(1012, 840, e) + Math.sin(x * .018 - T * 2.2) * (3 + 8 * e) + Math.sin(x * .05 + T * 3.1) * (1.5 + 3 * e) - 44 * Math.exp(-Math.pow((x - xf + 100) / 120, 2)) * clamp((t - tS) * 3);
}

// ---- line-art passage (world coords). la(x, y): line alpha (reveal x lit) ----
function passage(ctx, t, T, o) {
  const { X0, X1, lx, ly, light, la, zoom, tS, doorOpen } = o; const hl = 1 / zoom;
  ctx.save();
  // structure above/below (cut decks)
  ctx.fillStyle = '#0a1013'; ctx.fillRect(X0, CT - 44, X1 - X0, 44); ctx.fillRect(X0, CB, X1 - X0, 44);
  ctx.fillStyle = '#030607'; ctx.fillRect(X0, CT, X1 - X0, CB - CT);
  if (light > 0) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 760); g.addColorStop(0, rgba('#ffb36b', .24 * light)); g.addColorStop(.35, rgba('#b8682e', .08 * light)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(Math.max(X0, lx - 760), CT, 1520, CB - CT); }
  const S = (x, y, a, col = '#bcd3dc') => rgba(col, clamp(a * la(x, y)));
  // deck plating hatch in the cut bands
  ctx.lineWidth = 1.2 * hl;
  for (let x = Math.floor(X0 / 22) * 22; x < X1; x += 22) { ctx.strokeStyle = S(x, CT - 20, .12); ctx.beginPath(); ctx.moveTo(x, CT); ctx.lineTo(x + 30, CT - 44); ctx.moveTo(x, CB + 44); ctx.lineTo(x + 30, CB); ctx.stroke(); }
  for (let x = Math.floor(X0 / 120) * 120; x < X1; x += 120) { ctx.strokeStyle = S(x, CT, .5); ctx.lineWidth = 2 * hl; ctx.beginPath(); ctx.moveTo(x, CT); ctx.lineTo(x + 120, CT); ctx.moveTo(x, CB); ctx.lineTo(x + 120, CB); ctx.stroke(); }
  // old floor surface on top: skirting band, tile line
  for (let x = Math.floor(X0 / 120) * 120; x < X1; x += 120) {
    ctx.fillStyle = `rgba(10,15,18,${(.95).toFixed(2)})`; ctx.fillRect(x, CT, 120, 24);
    ctx.fillStyle = S(x + 60, CT + 24, .4, '#d6c4ac'); ctx.fillRect(x, CT + 24, 120, 1.6 * hl);
    ctx.strokeStyle = S(x, CT + 8, .22, '#d6c4ac'); ctx.lineWidth = 1.1 * hl; ctx.beginPath(); ctx.moveTo(x, CT + 9); ctx.lineTo(x + 120, CT + 9); ctx.moveTo(x + 60, CT); ctx.lineTo(x + 60, CT + 9); ctx.stroke();
  }
  // wall panel seams + handrail (0.9 m below the old floor) between doors
  for (let x = Math.floor(X0 / 240) * 240; x < X1; x += 240) {
    if (DOORS.some(d => Math.abs(x - d.x) < d.w / 2 + 14)) continue;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1.5, CT + 24, 3, CB - CT - 24); ctx.fillStyle = S(x, ly, .22, '#d6c4ac'); ctx.fillRect(x + 1.5, CT + 24, 1.2 * hl, CB - CT - 24);
  }
  const RY = CT + 238;
  let segs = [[X0, X1]]; DOORS.forEach(d => { segs = segs.flatMap(([a, b]) => { const l = d.x - d.w / 2 - 30, r = d.x + d.w / 2 + 30; if (r < a || l > b) return [[a, b]]; return [[a, l], [r, b]].filter(([u, v]) => v - u > 10); }); });
  segs.forEach(([a, b]) => { for (let x = a; x < b; x += 200) { const x2 = Math.min(b, x + 200); ctx.strokeStyle = S((x + x2) / 2, RY, .55, '#d6c4ac'); ctx.lineWidth = 5 * hl; ctx.beginPath(); ctx.moveTo(x, RY); ctx.lineTo(x2, RY); ctx.stroke(); } });
  // doors: frame, louvre near the top, handle high, sign plate low (upside down)
  for (const d of DOORS) {
    if (d.x + d.w < X0 || d.x - d.w > X1) continue;
    const x0 = d.x - d.w / 2, x1 = d.x + d.w / 2, open = d.kind === 'wc1' || d.kind === 'wc2';
    ctx.fillStyle = open ? '#000' : '#070c0f'; ctx.fillRect(x0, DOOR_Y0, d.w, DOOR_Y1 - DOOR_Y0);
    ctx.strokeStyle = S(d.x, 800, .75, '#d6c4ac'); ctx.lineWidth = 2.6 * hl; ctx.strokeRect(x0 - 8, DOOR_Y0 - 4, d.w + 16, DOOR_Y1 - DOOR_Y0 + 8);
    if (open) {
      // door leaf swung inward (dark parallelogram), faint
      const dop = d.kind === 'wc2' ? doorOpen : 1;
      ctx.fillStyle = S(d.x, 800, .14, '#9fb3bd'); ctx.beginPath(); ctx.moveTo(x1, DOOR_Y0); ctx.lineTo(x1 - d.w * .45 * dop, DOOR_Y0 + 36); ctx.lineTo(x1 - d.w * .45 * dop, DOOR_Y1 - 36); ctx.lineTo(x1, DOOR_Y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = S(d.x, 800, .35, '#d6c4ac'); ctx.lineWidth = 1.6 * hl; ctx.stroke();
    } else {
      ctx.strokeStyle = S(d.x, 800, .35, '#d6c4ac'); ctx.lineWidth = 1.4 * hl; ctx.strokeRect(x0 + 14, DOOR_Y0 + 14, d.w - 28, DOOR_Y1 - DOOR_Y0 - 28);
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const y = DOOR_Y0 + 34 + k * 11; ctx.moveTo(x0 + 36, y); ctx.lineTo(x1 - 36, y + 4); } ctx.stroke();
      const hx = x1 - 24, hy = CT + 18 + 264; ctx.fillStyle = S(d.x, hy, .8, '#e3d6c4'); ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 7); ctx.fill(); ctx.fillRect(hx - 42, hy - 3, 42, 6);
      ctx.fillRect(d.x - 26, CT + 18 + 410, 52, 34);   // sign plate (upside down)
    }
  }
  // end bulkhead
  if (ENDX < X1 + 60) { ctx.fillStyle = '#0a1013'; ctx.fillRect(ENDX, CT - 44, 400, CB - CT + 88); ctx.strokeStyle = S(ENDX, 850, .6); ctx.lineWidth = 2.4 * hl; ctx.beginPath(); ctx.moveTo(ENDX, CT); ctx.lineTo(ENDX, CB); ctx.stroke(); }
  // old ceiling at the bottom: dead lamps pointing up, pipes
  for (let x = Math.floor(X0 / 600) * 600 + 300; x < X1; x += 600) { ctx.fillStyle = '#10171b'; roundRect(ctx, x - 70, CB - 18, 140, 18, 5); ctx.fill(); ctx.strokeStyle = S(x, CB, .35); ctx.lineWidth = 1.4 * hl; ctx.stroke(); }
  ctx.strokeStyle = S(lx, CB - 50, .3); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(X0, CB - 44); ctx.lineTo(Math.min(X1, ENDX), CB - 44); ctx.stroke();
  ctx.strokeStyle = '#05090b'; ctx.lineWidth = 8; ctx.stroke();
  ctx.restore();
}
function passageWater(ctx, t, T, o) {
  const { X0, X1, lx, ly, light, tS, zoom } = o; const hl = 1 / zoom, xa = X0, xb = Math.min(X1, ENDX);
  const xf = frontX(t, tS), rush = clamp((t - tS) * 2);
  const wp = new Path2D(); wp.moveTo(xa, CB); for (let x = xa; x <= xb + 10; x += 10) wp.lineTo(Math.min(x, xb), waterY(Math.min(x, xb), t, T, tS)); wp.lineTo(xb, CB); wp.closePath();
  const g = ctx.createLinearGradient(0, 860, 0, CB); g.addColorStop(0, rgba('#0f2a33', .9)); g.addColorStop(.3, rgba('#06161c', .94)); g.addColorStop(1, 'rgba(1,4,6,.98)');
  ctx.save(); ctx.fillStyle = g; ctx.fill(wp);
  ctx.save(); ctx.clip(wp);
  if (light > 0) glow(ctx, lx, ly + 60, 340, '#ff9f55', .14 * light);
  // streaks + chevrons behind the front
  if (rush > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const sp = 2300 + 900 * hi(i * 3), len = 90 + 220 * hi(i * 7), y = 900 + hi(i * 5) * 230;
      const span = 5200, x = -2600 + (((hi(i * 11) * span + (t - tS) * sp) % span) + span) % span;
      if (x > xf || x < xa - 300 || x > xb + 300) continue;
      ctx.strokeStyle = rgba('#9fe0ef', (.12 + .22 * hi(i)) * rush * clamp((xf - x) / 200)); ctx.lineWidth = (1.2 + 1.6 * hi(i * 13)) * hl;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y + Math.sin(T * 6 + i) * 3); ctx.stroke();
    }
    ctx.lineWidth = 4 * hl; ctx.lineJoin = 'round';
    for (let k = -12; k < 12; k++) {
      const x = ((k * 340 + (t - tS) * 1900) % 8160) - 2600, y = 990 + (k % 2) * 60; if (x > xf - 80 || x < xa - 60 || x > xb) continue;
      const a = .45 * rush * clamp((xf - x - 80) / 300);
      ctx.strokeStyle = rgba('#bfeaff', a); ctx.beginPath(); ctx.moveTo(x - 22, y - 24); ctx.lineTo(x + 6, y); ctx.lineTo(x - 22, y + 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 52, y - 24); ctx.lineTo(x - 24, y); ctx.lineTo(x - 52, y + 24); ctx.stroke();
    }
  }
  ctx.restore();
  // surface line
  ctx.strokeStyle = rgba('#a9e2f2', .55); ctx.lineWidth = 2.2 * hl; ctx.beginPath();
  for (let x = xa; x <= xb + 10; x += 10) { const y = waterY(Math.min(x, xb), t, T, tS); x === xa ? ctx.moveTo(x, y) : ctx.lineTo(Math.min(x, xb), y); } ctx.stroke();
  // foam at the front + spray above it
  if (rush > 0 && xf > xa - 300 && xf < xb + 300) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const fx = xf - 40 - hi(i * 3) * 260, fy = waterY(fx, t, T, tS) - 6 + hi(i * 5) * 26 + Math.sin(T * 9 + i) * 5, r = (3 + 10 * hi(i * 7)) * (1 - (xf - fx) / 340);
      if (fx > xb) continue; ctx.fillStyle = rgba('#e8f6ff', .38 * rush * (1 - (xf - fx) / 300)); ctx.beginPath(); ctx.arc(fx, fy, Math.max(.5, r), 0, 7); ctx.fill();
    }
    ctx.strokeStyle = rgba('#e8f6ff', .5 * rush); ctx.lineCap = 'round'; const ga = ctx.globalAlpha;
    for (let i = 0; i < 30; i++) {
      const age = ((T * 2.4 + hi(i * 9)) % 1), x0 = xf - 60 - hi(i) * 160, vx = 600 + 500 * hi(i * 3), vy = -(240 + 380 * hi(i * 5));
      const x = x0 + vx * age * .35, y = waterY(x0, t, T, tS) + vy * age * .35 + 700 * age * age * .12; if (x > xb) continue;
      ctx.globalAlpha = ga * (1 - age); ctx.lineWidth = (1.4 + 1.6 * hi(i * 7)) * hl; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * .03, y - vy * .03); ctx.stroke();
    }
    ctx.globalAlpha = ga;
  }
  ctx.restore();
}
function hullOverview(ctx, T, zoom, a) {
  if (a <= 0) return; const HP = hullPaths(), hl = 1 / zoom;
  ctx.save(); ctx.globalAlpha *= a;
  // seabed
  const sg = ctx.createLinearGradient(0, SEABED - 60, 0, SEABED + 1800); sg.addColorStop(0, 'rgba(29,26,20,0)'); sg.addColorStop(.04, '#15120d'); sg.addColorStop(1, '#030302');
  ctx.fillStyle = sg; ctx.fillRect(-14000, SEABED - 60, 22000, 2000);
  ctx.strokeStyle = rgba('#8a7a5c', .3); ctx.lineWidth = 2 * hl; ctx.beginPath(); ctx.moveTo(-14000, SEABED); for (let x = -14000; x <= 8000; x += 400) ctx.lineTo(x, SEABED + Math.sin(x * .0011) * 40 + nz(x * .002, 3) * 50); ctx.stroke();
  ctx.fillStyle = '#05080a'; ctx.fill(HP.all);
  ctx.save(); ctx.clip(HP.all); ctx.strokeStyle = rgba('#7f9fad', .2); ctx.lineWidth = 1.4 * hl; ctx.stroke(HP.decks);
  const [cx0, cy0] = hw(120, 95), [cx1, cy1] = hw(285, 125); ctx.fillStyle = rgba('#7f9fad', .05); ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
  ctx.restore();
  ctx.strokeStyle = rgba('#a9c9d6', .45); ctx.lineWidth = 2 * hl; ctx.stroke(HP.body); ctx.stroke(HP.house);
  ctx.restore();
}

window.PK.scenes.swept = function (ctx, t, d, info) {
  const OK = PK.okRoom; const T = info.sc.t0 + t;
  const tCook = at(info, '요리사', .02), tHar = at(info, '해리슨', .12), tOk = at(info, '오케네는', .19), tDark = at(info, '캄캄한', .29), tPass = at(info, '통로에서', .37),
    tCur = at(info, '물살에', .48), tSwp = at(info, '휩쓸려', .58), tSmall = at(info, '작은', .66), tWc = at(info, '화장실로', .71), tPush = at(info, '밀려갔습니다', .8);
  const tS = tCur - .3;                                     // surge front starts up the passage
  const tZ0 = tOk - .2, tZ1 = tDark + .35;                   // dive into the hull
  const tIn = tWc + .28, tLand = tPush + .06;               // into the doorway / landing in the room

  // ---------------- his light (world) ----------------
  const L0 = { x: -1000, y: 996 };
  const out = P(t, tPass - .1, tCur + .1, E.inOutQ);                     // leaves the toilet doorway
  const ride = P(t, tSwp - .18, tIn, E.inOutQ);                           // carried down the passage
  let lx = lerp(L0.x, -920, out), ly;
  if (ride > 0) lx = lerp(-920, 1000, ride);
  const bob = Math.sin(T * 1.3) * 4;
  ly = waterY(lx, t, T, tS) - 14 + bob + ride * (1 - ride) * 4 * (Math.sin(T * 7.3) * 16 + Math.sin(T * 4.1) * 10);
  const into = P(t, tIn - .05, tPush + .02, E.inQ);                       // recedes into the doorway
  ly = lerp(ly, 872, into); const lscale = lerp(1, .6, into) * lerp(.8, 1, out);

  // ---------------- camera ----------------
  const zA = Z0 * 1.1, zB = 1.12;
  const pz = P(t, tZ0, tZ1, E.inOutC);
  let zoom = t < tZ0 ? Z0 * lerp(1, 1.1, P(t, -.2, tZ0, E.inOutQ)) : Math.exp(lerp(Math.log(zA), Math.log(zB), pz));
  zoom *= lerp(1, .9, P(t, tSwp - .3, tSwp + .3, E.inOutQ)) * lerp(1, 1.06, P(t, tSmall - .2, tWc + .2, E.inOutQ));
  const pushIn = P(t, tIn, tLand, E.inC); zoom *= Math.exp(Math.log(6) * pushIn);
  // light's target screen offset from the centre: overview position -> slightly below centre -> leading ahead in the rush
  const offA = { x: (L0.x - C0.x) * zA, y: (L0.y - C0.y) * zA };
  const rushK = P(t, tSwp - .25, tSwp + .25) * (1 - P(t, tWc - .2, tIn));
  let off = { x: lerp(offA.x, 0, pz) - 170 * rushK, y: lerp(offA.y, (ly - 850) * zoom, pz) };
  off = { x: lerp(off.x, 0, P(t, tWc - .3, tIn)), y: lerp(off.y, 0, P(t, tWc - .3, tIn)) };
  let cx = lx - off.x / zoom, cy = ly - off.y / zoom;
  if (t < tZ0) { const k = P(t, -.2, tZ0) * .15; cx = lerp(C0.x, lx, k); cy = lerp(C0.y, ly, k); }
  const door2 = DOORS[3]; const ex = door2.x, ey = 872;
  cx = lerp(cx, ex, P(t, tIn - .1, tIn + .15, E.inOutQ)); cy = lerp(cy, ey, P(t, tIn - .1, tIn + .15, E.inOutQ));
  const dr = OK.drift(T, 1 - .6 * rushK);
  const rot = dr.r + rushK * (.035 * Math.sin(T * 2.6) + .025 * Math.sin(T * 4.3 + 1) - .02);
  const shK = .9 * P(t, tSwp - .12, tSwp) * Math.exp(-Math.max(0, t - tSwp) * 3.2) + .25 * rushK;
  const shx = shK * (OK.nz(T * 6.5, 11) * 7 + OK.nz(T * 17, 12) * 1), shy = shK * (OK.nz(T * 6.5, 13) * 6 + OK.nz(T * 17, 14) * 1);
  const M = OK.camMatrix(cx + dr.x / zoom, cy + dr.y / zoom, zoom, rot, shx, shy);
  const inv = M.inverse();
  const corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => inv.transformPoint(new DOMPoint(x, y)));
  const X0 = Math.min(...corners.map(p => p.x)) - 40, X1 = Math.max(...corners.map(p => p.x)) + 40;

  // ---------------- the small inverted toilet (seen through the doorway, then pocket's opening frame) ----------------
  const zr = t < tLand ? lerp(.6, 1.35, E.inQ(pushIn)) : lerp(1.35, 1, E.outC(P(t, tLand, tLand + .9)));
  const kL = E.outC(P(t, tLand, tLand + 1.0));
  const rest = OK.restLight(T, OK.LV0);
  const RLx = lerp(536, rest.x, kL), RLy = lerp(OK.lvY(OK.LV0) - 12, rest.y, kL) - 30 * Math.sin(Math.PI * clamp(kL * 1.2)) * (1 - kL);
  const drawRoomView = (alphaLight) => {
    const land = P(t, tLand, tLand + .12) * Math.exp(-Math.max(0, t - tLand - .12) * 5);
    const dd = OK.drift(T);
    const Mr = OK.camMatrix(540 + dd.x, 850 + dd.y, zr, dd.r, land * OK.nz(T * 7, 21) * 7, land * OK.nz(T * 7, 22) * 6);
    OK.blackBG(ctx);
    ctx.save(); OK.applyCam(ctx, Mr);
    OK.drawRoom(ctx, T, { lv: OK.LV0, lx: RLx, ly: RLy, light: (.9 + .1 * PK.beat(T, 72)) * alphaLight, zoom: zr });
    const f = P(t, tLand + .02, tLand + 1.2); if (f > 0 && f < 1) { ctx.strokeStyle = rgba('#cfeef8', .5 * (1 - f)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(RLx, OK.lvY(OK.LV0) + 3, 14 + f * 220, 3 + f * 22, 0, 0, 7); ctx.stroke(); }
    OK.lifeLight(ctx, T, RLx, RLy, { a: alphaLight, s: 1.45 * lerp(.75, 1, kL), zoom: zr });
    ctx.restore();
  };
  // ---------------- draw: hull / passage ----------------
  const roomK = P(t, tLand - .03, tLand + .1);
  OK.darkFast(ctx, T, { k: .55, seed: 7 });
  if (roomK < 1) {
    const base = ctx.getTransform();
    ctx.save(); OK.applyCam(ctx, M);
    const detail = clamp((zoom - .16) / .35);                         // passage detail fades in during the dive
    const ovA = 1 - clamp((zoom - .5) / .4);
    const lightOn = P(t, tCook - .1, tCook + .25, E.outQ);
    const revR = lerp(0, 3600, P(t, tPass - .15, tCur + .1, E.inOutQ));
    const lit = (x, y) => Math.exp(-((x - lx) * (x - lx) + (y - ly) * (y - ly)) / (2 * 560 * 560));
    const la = (x, y) => detail * (.24 * clamp((revR - Math.abs(x - lx)) / 300) + .9 * lit(x, y) * lightOn);
    hullOverview(ctx, T, zoom, ovA);
    if (detail > 0) {
      ctx.save(); ctx.globalAlpha = detail;
      const o = { X0, X1, lx, ly, light: lightOn * (.9 + .1 * PK.beat(T, 84)), la, zoom, tS, doorOpen: 1 };
      passage(ctx, t, T, o);
      passageWater(ctx, t, T, o);
      ctx.restore();
    }
    // the doorway he is pushed into goes black as the camera enters it
    // the doorway he is pushed into opens onto the small toilet (a window that grows to fill the frame)
    if (pushIn > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(door2.x - door2.w / 2, DOOR_Y0, door2.w, DOOR_Y1 - DOOR_Y0); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(door2.x - door2.w / 2, DOOR_Y0, door2.w, DOOR_Y1 - DOOR_Y0);
      ctx.setTransform(base); ctx.globalAlpha = P(pushIn, .05, .6); drawRoomView(P(pushIn, .35, .8));
      ctx.restore();
    }
    // trail while carried
    if (ride > 0 && ride < 1) {
      for (let k = 1; k <= 6; k++) { const pr = P(t - k * .035, tSwp - .18, tIn, E.inOutQ), tx = lerp(-920, 1000, pr), ty = waterY(tx, t, T, tS) - 14; glow(ctx, tx, ty, 90 - k * 8, '#ffb347', .16 * (1 - k / 7) * rushK); }
    }
    // him: screen-size floor so he reads in the overview
    const ls = 1.6 * lscale * lerp(.8, 1, clamp((zoom - .25) / .6)) * Math.pow(6, -pushIn * .8);
    ctx.save(); ctx.translate(lx, ly); ctx.scale(1 / Math.min(1, zoom * 1.1), 1 / Math.min(1, zoom * 1.1)); ctx.translate(-lx, -ly);
    OK.lifeLight(ctx, T, lx, ly, { a: lightOn * (1 - P(pushIn, .45, .85)), s: ls, bpm: 84 });
    ctx.restore();
    ctx.restore();
  }
  const [sx, sy] = OK.toS(M, lx, ly);
  // foreground frames (ribs at the cut plane, closer than the passage): parallax + speed during the rush
  const ribA = clamp((zoom - .55) / .3) * (1 - pushIn) * (1 - roomK);
  if (ribA > 0) {
    const par = 1.55, sp = 820;
    ctx.save(); ctx.translate(540 + shx, 850 + shy); ctx.rotate(rot); ctx.globalAlpha = ribA;
    for (let k = Math.floor((cx - 1400) / sp); k <= Math.ceil((cx + 1400) / sp); k++) {
      const xw = k * sp + 260, X = (xw - cx) * zoom * par, w = 64 * zoom * par; if (X < -700 || X > 700) continue;
      const g = ctx.createLinearGradient(X - w / 2, 0, X + w / 2, 0); g.addColorStop(0, '#020405'); g.addColorStop(.5, '#06090b'); g.addColorStop(1, '#020304');
      ctx.fillStyle = g; ctx.fillRect(X - w / 2, -520, w, 1040);
      const lt = Math.exp(-Math.pow((xw - lx) / 700, 2)) * .5; ctx.fillStyle = rgba('#ffb36b', lt * .5); ctx.fillRect(xw < lx ? X + w / 2 - 2 : X - w / 2, -520, 2, 1040);
    }
    ctx.restore();
  }

  // ---------------- landing: the small inverted toilet (pocket's opening frame) ----------------
  if (roomK > 0) { ctx.save(); ctx.globalAlpha = roomK; drawRoomView(1); ctx.restore(); }
  // tunnel vision + darkness
  const rest0 = OK.restLight(T, OK.LV0), rsx = 540 + (rest0.x - 540), rsy = 850 + (rest0.y - 850);
  OK.iris(ctx, lerp(.3, .12, roomK) + .2 * P(t, tDark - .2, tDark + .3) * (1 - P(t, tPass, tCur)), .5 + .5 * Math.sin(T * 2.4), lerp(sx, lerp(540, rsx, .5), roomK), lerp(sy, lerp(850, rsy, .5), roomK));
  OK.quiet(ctx, 1);

  // ---------------- labels (screen space) ----------------
  // tag on him
  const tagA = P(t, tCook - .02, tCook + .3) * (1 - P(t, tCur - .25, tCur + .05));
  if (tagA > 0) {
    const cw = measure(ctx, '요리사 · 당시 29세', 40, FONT.sub, 800) + 44;
    const tx = clamp(sx + 40, 30 + cw / 2, W - 30 - cw / 2), ty = clamp(sy - 150, 520, 1100);
    ctx.save(); ctx.globalAlpha = clamp(tagA); ctx.strokeStyle = 'rgba(255,200,130,.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy - 24); ctx.lineTo(tx - 20, ty + 34); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,130,.8)'; ctx.beginPath(); ctx.arc(sx, sy - 24, 4, 0, 7); ctx.fill(); ctx.restore();
    const sc = lerp(.86, 1, E.outBack(clamp(tagA)));
    ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc); chip(ctx, '요리사 · 당시 29세', 0, 0, clamp(tagA), { size: 40, color: '#fff', border: 'rgba(255,179,71,.75)' }); ctx.restore();
  }
  // first door: the toilet he leaves
  const d1A = P(t, tPass - .05, tPass + .2) * (1 - P(t, tCur - .1, tCur + .15)) * (roomK < .5 ? 1 : 0);
  if (d1A > 0) { const [qx, qy] = OK.toS(M, DOORS[0].x, CT - 60); chip(ctx, '화장실', clamp(qx, 110, W - 110), Math.max(500, qy), d1A, { size: 34, color: '#e8f4ff' }); }
  // next doors: the small toilet next to the officer's cabin
  const dA = P(t, tSmall - .15, tSmall + .1) * (1 - P(t, tIn + .02, tIn + .2));
  if (dA > 0) {
    const [ax, ay] = OK.toS(M, DOORS[3].x, CT - 64), [bx, by] = OK.toS(M, DOORS[4].x, CT - 64);
    const s1 = lerp(.86, 1, E.outBack(clamp(dA)));
    const axx = clamp(ax, 90, W - 90), bxx = Math.max(bx, axx + 200);
    ctx.save(); ctx.translate(axx, Math.max(510, ay)); ctx.scale(s1, s1); chip(ctx, '화장실', 0, 0, dA, { size: 40, color: '#fff', border: 'rgba(255,179,71,.75)' }); ctx.restore();
    const dB = P(t, tSmall, tSmall + .25) * (1 - P(t, tIn + .02, tIn + .2));
    const dBv = dB * clamp((W - 20 - bxx) / 140);
    if (dBv > 0) { const s2 = lerp(.86, 1, E.outBack(clamp(dB))); ctx.save(); ctx.translate(bxx, Math.max(510, by)); ctx.scale(s2, s2); chip(ctx, '사관 선실', 0, 0, dBv, { size: 34, color: '#cfe8ff' }); ctx.restore(); }
  }
};
})();
