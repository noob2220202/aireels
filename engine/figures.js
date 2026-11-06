// Parametric noir silhouettes. figure(ctx, x, y, h, o): (x,y) = point between the feet, h = full height in px.
(function () {
  'use strict';
  const { lerp, clamp } = window.L;

  function capsule(ctx, ax, ay, bx, by, wa, wb) {
    const ang = Math.atan2(by - ay, bx - ax), nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    ctx.moveTo(ax + nx * wa, ay + ny * wa); ctx.lineTo(bx + nx * wb, by + ny * wb);
    ctx.arc(bx, by, wb, ang + Math.PI / 2, ang - Math.PI / 2, true);
    ctx.lineTo(ax - nx * wa, ay - ny * wa);
    ctx.arc(ax, ay, wa, ang - Math.PI / 2, ang + Math.PI / 2, true);
    ctx.closePath();
  }
  // two-segment limb from root with angles (radians, 0 = straight down)
  function limb(ctx, x, y, a1, a2, l1, l2, w0, w1, w2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    const ex = kx + Math.sin(a1 + a2) * l2, ey = ky + Math.cos(a1 + a2) * l2;
    capsule(ctx, x, y, kx, ky, w0, w1); ctx.fill(); ctx.beginPath(); capsule(ctx, kx, ky, ex, ey, w1, w2);
    return [ex, ey, a1 + a2];
  }

  function shape(ctx, h, o) {
    // units: u = h/8 (head ~ 1u)
    const u = h / 8;
    const walk = o.walk || 0; // phase radians
    const stride = o.stride != null ? o.stride : (o.walk != null ? .38 : 0);
    const bob = o.walk != null ? Math.abs(Math.sin(walk)) * u * .08 : 0;
    const hipY = -4.1 * u + bob, shY = -6.7 * u + bob, headY = -7.45 * u + bob;
    const lean = o.lean || 0;
    ctx.save(); ctx.rotate(lean);
    const F = () => { ctx.fill(); ctx.beginPath(); };
    ctx.beginPath();
    // legs
    const lA = Math.sin(walk) * stride, rA = -Math.sin(walk) * stride;
    const kneeL = Math.max(0, -Math.cos(walk)) * stride * 1.2, kneeR = Math.max(0, Math.cos(walk)) * stride * 1.2;
    const legW = o.female && o.skirt ? .26 : .36;
    limb(ctx, -.32 * u, hipY, -lA + (o.legSpread || 0), kneeL, 2.05 * u, 2.0 * u, legW * u, .28 * u, .2 * u);
    F(); limb(ctx, .32 * u, hipY, -rA - (o.legSpread || 0), kneeR, 2.05 * u, 2.0 * u, legW * u, .28 * u, .2 * u); F();
    // shoes
    const footY = bob;
    const fL = -.32 * u + Math.sin(-lA) * 4 * u, fR = .32 * u + Math.sin(-rA) * 4 * u;
    ctx.ellipse(fL - .12 * u * (o.face || 1), footY - .1 * u, .42 * u, .17 * u, 0, 0, Math.PI * 2);
    F(); ctx.ellipse(fR - .12 * u * (o.face || 1), footY - .1 * u, .42 * u, .17 * u, 0, 0, Math.PI * 2); F();
    // torso / coat
    const shW = (o.female ? .95 : 1.12) * u, waistW = (o.female ? .62 : .82) * u;
    const coatLen = o.coat ? (o.coatLen || 2.3) * u : .35 * u;
    const flare = o.coat ? 1.18 : 1.0;
    ctx.moveTo(-shW, shY + .15 * u);
    ctx.quadraticCurveTo(-shW * 1.02, shY - .25 * u, -.3 * u, shY - .32 * u);
    ctx.lineTo(.3 * u, shY - .32 * u);
    ctx.quadraticCurveTo(shW * 1.02, shY - .25 * u, shW, shY + .15 * u);
    ctx.lineTo(waistW, hipY - .6 * u);
    ctx.lineTo(waistW * flare + (o.coat ? Math.sin(walk) * .15 * u : 0), hipY + coatLen);
    ctx.lineTo(-waistW * flare + (o.coat ? Math.sin(walk) * .15 * u : 0), hipY + coatLen);
    ctx.lineTo(-waistW, hipY - .6 * u);
    ctx.closePath(); F();
    if (o.female && o.skirt) { ctx.moveTo(-waistW, hipY - .2 * u); ctx.lineTo(waistW, hipY - .2 * u); ctx.lineTo(waistW * 1.5, hipY + 1.6 * u); ctx.lineTo(-waistW * 1.5, hipY + 1.6 * u); ctx.closePath(); F(); }
    // neck + head
    ctx.rect(-.2 * u, shY - .6 * u, .4 * u, .7 * u); F();
    const hx = (o.headTurn || 0) * .12 * u;
    ctx.ellipse(hx, headY, .46 * u, .56 * u, 0, 0, Math.PI * 2); F();
    if (o.face) { // nose hint in profile
      const f = o.face; ctx.moveTo(hx + f * .44 * u, headY - .05 * u); ctx.lineTo(hx + f * .62 * u, headY + .12 * u); ctx.lineTo(hx + f * .4 * u, headY + .2 * u); ctx.closePath(); F();
    }
    // hair
    if (o.hair === 'long') { ctx.moveTo(hx - .5 * u, headY - .1 * u); ctx.quadraticCurveTo(hx - .7 * u, shY + .6 * u, hx - .2 * u, shY + .4 * u); ctx.lineTo(hx + .4 * u, shY + .2 * u); ctx.quadraticCurveTo(hx + .6 * u, headY, hx + .45 * u, headY - .3 * u); ctx.closePath(); F(); }
    if (o.hair === 'bun') { ctx.moveTo(hx - .3 * u, headY - .55 * u); ctx.arc(hx - .3 * u, headY - .55 * u, .28 * u, 0, Math.PI * 2); F(); }
    // hat
    if (o.hat === 'fedora') {
      const hy = headY - .32 * u, tilt = o.hatTilt || -.06;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
      ctx.moveTo(-.95 * u, .05 * u); ctx.quadraticCurveTo(0, -.12 * u, .95 * u, .05 * u); ctx.quadraticCurveTo(.9 * u, .18 * u, .6 * u, .12 * u);
      ctx.lineTo(-.6 * u, .12 * u); ctx.quadraticCurveTo(-.9 * u, .18 * u, -.95 * u, .05 * u); ctx.closePath(); F();
      ctx.moveTo(-.52 * u, .02 * u); ctx.quadraticCurveTo(-.55 * u, -.55 * u, -.2 * u, -.62 * u); ctx.quadraticCurveTo(0, -.5 * u, .2 * u, -.62 * u); ctx.quadraticCurveTo(.55 * u, -.55 * u, .52 * u, .02 * u); ctx.closePath(); F();
      ctx.restore();
    } else if (o.hat === 'cap') {
      ctx.moveTo(hx - .5 * u, headY - .15 * u); ctx.ellipse(hx, headY - .25 * u, .5 * u, .35 * u, 0, Math.PI, 0); ctx.lineTo(hx + (o.face || 1) * .95 * u, headY - .15 * u); ctx.closePath(); F();
    }
    // arms
    const armSwing = o.walk != null ? Math.sin(walk) * stride * .9 : 0;
    const aL = o.armL || [armSwing + .08, -.15], aR = o.armR || [-armSwing - .08, .15];
    const sleeve = (o.coat ? .3 : .24) * u;
    const [lhx, lhy] = limb(ctx, -shW * .9, shY + .1 * u, aL[0], aL[1], 1.45 * u, 1.35 * u, sleeve, sleeve * .85, .2 * u); F();
    const [rhx, rhy] = limb(ctx, shW * .9, shY + .1 * u, aR[0], aR[1], 1.45 * u, 1.35 * u, sleeve, sleeve * .85, .2 * u); F();
    ctx.arc(lhx, lhy, .2 * u, 0, Math.PI * 2); F();
    ctx.arc(rhx, rhy, .2 * u, 0, Math.PI * 2); F();
    // briefcase / bag in right hand
    if (o.briefcase) { const bw = 1.1 * u, bh = .8 * u; ctx.rect(rhx - bw / 2, rhy + .05 * u, bw, bh); ctx.rect(rhx - .2 * u, rhy - .12 * u, .4 * u, .18 * u); F(); }
    ctx.restore();
    return { u, head: [hx, headY], hands: [[lhx, lhy], [rhx, rhy]], shY, hipY };
  }

  // public: draw silhouette with optional rim light & glasses glint
  function figure(ctx, x, y, h, o = {}) {
    const fill = o.fill || '#05060a';
    ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1); if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.shadow !== false) { ctx.save(); ctx.globalAlpha *= .45; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, h * .22, h * .025, 0, 0, Math.PI * 2); ctx.filter = 'blur(6px)'; ctx.fill(); ctx.restore(); }
    let info;
    if (o.rim) {
      ctx.save(); ctx.translate(o.rimX || -5, o.rimY || -3); ctx.fillStyle = o.rim; ctx.shadowColor = o.rim; ctx.shadowBlur = o.rimBlur || 8; info = shape(ctx, h, o); ctx.restore();
    }
    ctx.fillStyle = fill; info = shape(ctx, h, o);
    if (o.glasses) {
      const u = info.u, [hx, hy] = info.head; const f = o.face || 1;
      ctx.fillStyle = o.glassColor || '#0b0b0b'; ctx.fillRect(hx + f * .05 * u - .05 * u, hy - .12 * u, f * .45 * u, .16 * u);
      if (o.glint) { const g = o.glint; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${g})`; ctx.shadowColor = '#fff'; ctx.shadowBlur = 20 * g; ctx.beginPath(); ctx.arc(hx + f * .3 * u, hy - .06 * u, .07 * u * (1 + g), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    if (o.eyes) { // glowing eyes for sinister reveal
      const u = info.u, [hx, hy] = info.head; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = o.eyes; ctx.shadowColor = o.eyes; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(hx - .17 * u, hy - .05 * u, .08 * u, .04 * u, 0, 0, 7); ctx.ellipse(hx + .17 * u, hy - .05 * u, .08 * u, .04 * u, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    return info;
  }

  window.F = { figure, capsule, limb };
})();
