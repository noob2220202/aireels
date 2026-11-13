/* STYLE C "감성 라인리스" : lineless, light-driven. All art = Canvas 2D paths + gradients.
   Deterministic (no Math.random / Date). Reusable parts: head/face/eye/hair/neck/torso/arm/hand/box/bubble/sfx/hallway. */
(function(){
'use strict';
const W=1080,H=1920;
// ---------------------------------------------------------------- utils
const lerp=(a,b,t)=>a+(b-a)*t;
function A(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function mk(w,h){const c=document.createElement('canvas');c.width=w||W;c.height=h||H;return c;}
function prng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Catmull-Rom closed/open path through points [x,y,(corner)]
function pathPts(ctx,pts,closed=true,k=1){
  const n=pts.length,g=i=>closed?pts[(i%n+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
  ctx.moveTo(pts[0][0],pts[0][1]);
  const m=closed?n:n-1;
  for(let i=0;i<m;i++){
    const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    let c1x=p1[0]+(p2[0]-p0[0])/6*k,c1y=p1[1]+(p2[1]-p0[1])/6*k;
    let c2x=p2[0]-(p3[0]-p1[0])/6*k,c2y=p2[1]-(p3[1]-p1[1])/6*k;
    if(p1[2]){c1x=p1[0];c1y=p1[1];} if(p2[2]){c2x=p2[0];c2y=p2[1];}
    ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2[0],p2[1]);
  }
  if(closed)ctx.closePath();
}
function blob(ctx,pts,fill){ctx.beginPath();pathPts(ctx,pts,true);if(fill){ctx.fillStyle=fill;ctx.fill();}}
function sample(pts,n){const out=[],m=pts.length-1;
  for(let s=0;s<=n;s++){const u=s/n*m,i=Math.min(m-1,Math.floor(u)),t=u-i;
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(m,i+2)];
    const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}
  return out;}
// tapered ribbon along an open spline; wf(t)=full width at t (0..1)
function ribbon(ctx,pts,wf,fill,n=26){const s=sample(pts,n),L=[],R=[];
  for(let i=0;i<s.length;i++){const a=s[Math.max(0,i-1)],b=s[Math.min(s.length-1,i+1)];
    let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const w=wf(i/(s.length-1))/2;
    L.push([s[i][0]-dy*w,s[i][1]+dx*w]);R.push([s[i][0]+dy*w,s[i][1]-dx*w]);}
  ctx.beginPath();ctx.moveTo(L[0][0],L[0][1]);for(const p of L)ctx.lineTo(p[0],p[1]);
  for(let i=R.length-1;i>=0;i--)ctx.lineTo(R[i][0],R[i][1]);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}}
const taper=(w,p=1)=>t=>w*Math.pow(Math.sin(Math.PI*t),p);          // thin-thick-thin
const tail=(w)=>t=>w*(1-t)*(0.35+0.65*Math.min(1,t*6));              // thick root -> pointed tip
function soft(ctx,px,fn){ctx.save();ctx.filter=`blur(${px}px)`;fn();ctx.restore();}
function ell(ctx,x,y,rx,ry,fill,rot=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function lin(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function rad(ctx,x,y,r,stops,r0=0){const g=ctx.createRadialGradient(x,y,r0,x,y,r);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}

// ---------------------------------------------------------------- palettes (evening light baked in)
const PAL={
  her:{skin:{base:'#ffe0cc',light:'#fff1e3',shade:'#f6bcae',deep:'#d98d9c',blush:'#ff8a84'},
       hair:{base:'#84503a',dark:'#4f2a31',mid:'#a56744',light:'#dea066',gloss:'#ffdcae'},
       iris:{top:'#3b1f17',mid:'#93552f',bot:'#e7a560'},lash:'#3c2222',brow:'#7a4a38',lip:'#ee7f80'},
  him:{skin:{base:'#f4cbb0',light:'#ffe3ca',shade:'#dc9d8e',deep:'#a9708a',blush:'#ef9c8e'},
       hair:{base:'#25222f',dark:'#14121b',mid:'#3a3750',light:'#66628c',gloss:'#a7a2cf'},
       iris:{top:'#141118',mid:'#3a2c2e',bot:'#7a5a4c'},lash:'#1d171d',brow:'#241d25',lip:'#cf8882'}
};

// ---------------------------------------------------------------- head geometry (3/4 view, drawn facing +x; flip mirrors)
// unit = R (half face width). origin = cranium centre. eye line ~ y 0.23
const FACE_F=[[0.05,-1.0],[0.62,-0.78],[0.84,-0.28],[0.80,0.10],[0.78,0.44],[0.64,0.84],[0.45,1.10],[0.29,1.175],[0.12,1.13],[-0.27,0.92],[-0.60,0.52],[-0.72,0.12],[-0.88,-0.35],[-0.70,-0.80]];
const FACE_M=[[0.05,-1.0],[0.62,-0.78],[0.78,-0.28],[0.735,0.10],[0.735,0.46],[0.65,0.90],[0.51,1.22],[0.33,1.335],[0.12,1.285],[-0.27,1.06],[-0.61,0.66],[-0.69,0.15],[-0.88,-0.35],[-0.70,-0.80]];
function facePts(h){return FACE_F.map((p,i)=>[lerp(p[0],FACE_M[i][0],h.jaw),lerp(p[1],FACE_M[i][1],h.jaw)]);}
function headXf(ctx,h,tilt=true){ctx.translate(h.x,h.y);if(tilt)ctx.rotate(h.tilt||0);ctx.scale(h.flip?-h.R:h.R,h.R);}

function eye(ctx,e,pal){
  const {x,y,hw,hh,inner,fem}=e;const I=pal.iris;
  ctx.save();ctx.translate(x,y);ctx.rotate(e.rot||0);
  const X=v=>v*inner;
  const oc=[X(-hw),hh*(fem?0.22:0.02),1],ic=[X(hw),hh*0.32,1];
  const up=[oc,[X(-hw*0.58),-hh*(fem?0.78:0.70)],[X(-hw*0.02),-hh],[X(hw*0.58),-hh*0.62],ic];
  const lo=[[X(hw*0.45),hh*0.84],[X(-hw*0.15),hh*(fem?0.98:0.86)],[X(-hw*0.72),hh*0.74]];
  ctx.beginPath();pathPts(ctx,[...up,...lo],true);
  ctx.fillStyle='#fff7f1';ctx.fill();
  ctx.save();ctx.clip();
  ctx.fillStyle=lin(ctx,0,-hh,0,hh*0.5,[[0,A('#8d5a86',0.55)],[0.6,A('#c99ab0',0.12)],[1,A('#c99ab0',0)]]);ctx.fillRect(-hw*1.3,-hh*1.3,hw*2.6,hh*2.6);
  // iris
  const ry=hh*(fem?1.0:1.06),rx=ry*(e.squash||1);
  const ix=e.look[0]*hw*0.30,iy=e.look[1]*hh*0.34-hh*0.03;
  ctx.beginPath();ctx.ellipse(ix,iy,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=lin(ctx,0,iy-ry,0,iy+ry,[[0,I.top],[0.5,I.mid],[1,I.bot]]);ctx.fill();
  ctx.lineWidth=ry*0.13;ctx.strokeStyle=A(I.top,0.75);ctx.stroke();
  ell(ctx,ix,iy+ry*0.02,rx*0.46,ry*0.46,A('#160b0f',0.92));
  soft(ctx,1.2,()=>{ell(ctx,ix,iy+ry*0.62,rx*0.60,ry*0.26,A(I.bot,0.85));ell(ctx,ix,iy+ry*0.70,rx*0.34,ry*0.13,A('#fff0c8',0.7));});
  ctx.fillStyle=lin(ctx,0,-hh,0,-hh*0.1,[[0,A('#1a0c14',0.6)],[1,A('#1a0c14',0)]]);ctx.fillRect(-hw*1.3,-hh*1.3,hw*2.6,hh*1.3);
  // highlights
  ell(ctx,ix+e.hl*rx*0.40,iy-ry*0.40,ry*0.27,ry*0.25,'#ffffff');
  ell(ctx,ix-e.hl*rx*0.42,iy+ry*0.36,ry*0.11,ry*0.11,A('#ffffff',0.9));
  ctx.restore();
  // crease
  ribbon(ctx,[[X(-hw*0.95),-hh*(fem?0.35:0.45)],[X(-hw*0.5),-hh*(fem?1.22:1.12)],[X(0),-hh*(fem?1.40:1.30)],[X(hw*0.62),-hh*0.98]],taper(hh*0.11,0.8),A(pal.skin.deep,0.55));
  // upper lash line (thick at outer third, wing)
  const wing=fem?[X(-hw*1.22),hh*0.02]:[X(-hw*1.14),-hh*0.06];
  ribbon(ctx,[wing,[X(-hw*0.98),hh*(fem?0.12:-0.04)],[X(-hw*0.58),-hh*(fem?0.84:0.74)],[X(-hw*0.02),-hh*1.04],[X(hw*0.58),-hh*0.66],[X(hw*0.98),hh*0.22]],
    t=>hh*(fem?0.36:0.30)*(t<0.3?Math.pow(t/0.3,0.7):lerp(1,0.22,(t-0.3)/0.7)),pal.lash,34);
  if(fem){ // two tiny lash flicks
    ribbon(ctx,[[X(-hw*0.86),-hh*0.34],[X(-hw*1.08),-hh*0.52],[X(-hw*1.22),-hh*0.78]],tail(hh*0.20),pal.lash,10);
    ribbon(ctx,[[X(-hw*0.92),-hh*0.02],[X(-hw*1.16),-hh*0.08],[X(-hw*1.36),-hh*0.30]],tail(hh*0.18),pal.lash,10);
  }
  // lower lid hint
  ribbon(ctx,[[X(-hw*0.92),hh*0.48],[X(-hw*0.55),hh*0.88],[X(-hw*0.05),hh*1.02]],taper(hh*0.09),A(pal.lash,fem?0.42:0.5));
  ctx.restore();
}

function face(ctx,h){
  const P=h.pal.skin,pts=facePts(h),j=h.jaw,fem=j<0.5,L=(a,b)=>lerp(a,b,j);
  ctx.save();headXf(ctx,h);
  if(h.ear){ // near ear
    const ex=L(-0.84,-0.80),ey=L(0.30,0.36);
    blob(ctx,[[ex+0.14,ey-0.30],[ex-0.08,ey-0.36],[ex-0.20,ey-0.12],[ex-0.14,ey+0.16],[ex+0.02,ey+0.34],[ex+0.16,ey+0.2]],lin(ctx,ex-0.2,0,ex+0.15,0,[[0,P.shade],[1,P.base]]));
    ribbon(ctx,[[ex+0.04,ey-0.22],[ex-0.10,ey-0.14],[ex-0.08,ey+0.06],[ex+0.02,ey+0.16]],taper(0.06),A(P.deep,0.6));
  }
  ctx.beginPath();pathPts(ctx,pts,true);
  ctx.fillStyle=lin(ctx,-0.9,0.4,0.9,-0.1,[[0,P.shade],[0.42,P.base],[1,P.light]]);ctx.fill();
  ctx.save();ctx.clip();
  // form shadows (soft, violet-pink), all inside the face clip
  soft(ctx,h.R*0.10,()=>{
    ell(ctx,-0.80,0.55,L(0.24,0.32),0.75,A(P.deep,L(0.5,0.66)));            // back of jaw / near ear
    ell(ctx,-0.2,L(1.22,1.42),0.7,0.16,A(P.deep,0.28));      // under-jaw turn
    ell(ctx,0.95,0.2,0.10,0.7,A(P.shade,0.6));               // far cheek turn
  });
  soft(ctx,h.R*0.06,()=>{
    ell(ctx,-0.16,0.17,0.32,0.14,A(P.shade,L(0.34,0.5)));           // eye sockets
    ell(ctx,0.52,0.18,0.22,0.13,A(P.shade,L(0.34,0.5)));
    if(!fem){ell(ctx,-0.30,0.86,0.30,0.20,A(P.deep,0.22),-0.5);ribbon(ctx,[[-0.66,0.72],[-0.30,1.10],[0.10,1.30],[0.40,1.32]],taper(0.16),A(P.deep,0.34));ell(ctx,0.36,1.12,0.10,0.03,A(P.deep,0.3));}
    ell(ctx,0.30,L(0.42,0.46),0.07,0.26,A(P.shade,0.45),-0.12); // nose bridge side
  });
  if(!fem){soft(ctx,h.R*0.035,()=>blob(ctx,[[-0.80,-0.2],[-0.50,0.0],[-0.47,0.42],[-0.40,0.80],[-0.22,1.10],[-0.5,1.2],[-0.9,0.7]],A(P.deep,0.34)));}
  // hair cast shadow on the forehead
  if(h.hairShadow){ctx.save();ctx.translate(0.03,0.075);soft(ctx,h.R*0.022,()=>{ctx.fillStyle=A(P.deep,0.42);h.hairShadow(ctx);});ctx.restore();}
  // blush
  const bl=h.blush||0;
  if(bl>0){
    ctx.fillStyle=rad(ctx,-0.30,L(0.58,0.62),0.34,[[0,A(P.blush,0.62*bl)],[0.6,A(P.blush,0.22*bl)],[1,A(P.blush,0)]]);ctx.fillRect(-1,0,2,1.4);
    ctx.save();ctx.translate(0.66,L(0.57,0.6));ctx.scale(0.6,1);ctx.fillStyle=rad(ctx,0,0,0.32,[[0,A(P.blush,0.62*bl)],[0.6,A(P.blush,0.2*bl)],[1,A(P.blush,0)]]);ctx.fillRect(-1,-1,2,2);ctx.restore();
    if(h.hatch){for(let i=0;i<3;i++){ribbon(ctx,[[-0.40+i*0.085,0.66],[-0.375+i*0.085,0.58]],taper(0.022),A('#e85f6a',0.5*bl),6);} for(let i=0;i<2;i++){ribbon(ctx,[[0.62+i*0.07,0.65],[0.64+i*0.07,0.575]],taper(0.02),A('#e85f6a',0.5*bl),6);}}
  }
  // light on the facing side (soft bloom on cheek / forehead)
  ctx.fillStyle=rad(ctx,0.55,-0.1,0.9,[[0,A('#fff6dc',L(0.34,0.2))],[1,A('#fff6dc',0)]]);ctx.fillRect(-1.2,-1.2,2.4,2.8);
  ctx.restore();

  // ---- features
  const E=h.eyes;
  // brows
  if(fem){
    ribbon(ctx,[[-0.44,0.005+E.browY],[-0.22,-0.085+E.browY],[0.04,-0.115+E.browY]],t=>0.048*Math.pow(Math.sin(Math.PI*(0.10+0.80*t)),0.7),A(h.pal.brow,0.85));
    ribbon(ctx,[[0.40,-0.115+E.browY],[0.56,-0.10+E.browY],[0.725,-0.015+E.browY]],t=>0.044*Math.pow(Math.sin(Math.PI*(0.90-0.80*t)),0.7),A(h.pal.brow,0.85));
  }else{
    ribbon(ctx,[[-0.50,0.035+E.browY],[-0.24,-0.04+E.browY],[0.05,-0.03+E.browY]],t=>0.074*Math.pow(Math.sin(Math.PI*(0.14+0.74*t)),0.6),A(h.pal.brow,0.94));
    ribbon(ctx,[[0.38,-0.03+E.browY],[0.56,-0.045+E.browY],[0.735,0.02+E.browY]],t=>0.068*Math.pow(Math.sin(Math.PI*(0.86-0.74*t)),0.6),A(h.pal.brow,0.94));
  }
  // eyes
  const ny=L(0.24,0.22);
  eye(ctx,{x:L(-0.14,-0.16),y:ny,hw:L(0.222,0.258),hh:L(0.119,0.106)*E.open,inner:1,fem,look:E.look,hl:E.hl,rot:L(0.0,-0.03)},h.pal);
  eye(ctx,{x:L(0.52,0.525),y:ny+0.010,hw:L(0.155,0.168),hh:L(0.114,0.101)*E.open,inner:-1,fem,look:[E.look[0]*0.6,E.look[1]],hl:E.hl,squash:0.84,rot:L(0.0,0.03)},h.pal);
  // nose: tiny shadow + tip light (no outline)
  const ny2=L(0.65,0.70);ctx.save();ctx.translate(L(-0.035,-0.01),0);
  ribbon(ctx,[[L(0.365,0.345),ny2-L(0.20,0.36)],[0.355,ny2-0.06],[0.40,ny2+0.035],[0.475,ny2+0.04]],t=>L(0.030,0.040)*Math.pow(Math.sin(Math.PI*(L(0,0.12)+t*L(1,0.88))),0.7)*(fem?1:0.35+0.65*t),A(P.deep,L(0.75,0.85)),18);
  ell(ctx,0.50,ny2+0.045,0.022,0.012,A(P.deep,0.6));
  ell(ctx,0.455,ny2-0.045,0.03,0.022,A('#ffffff',0.55));ctx.restore();
  // mouth
  const mx=L(0.325,0.36),my=L(0.895,0.975);
  ctx.save();ctx.translate(mx,my);
  if(h.mouth==='open'){ // small, soft "아…"
    soft(ctx,1.6,()=>ell(ctx,0.005,0.03,0.105,0.062,A(h.pal.lip,0.42)));
    blob(ctx,[[-0.072,0.0,1],[-0.02,-0.026],[0.03,-0.026],[0.078,0.0,1],[0.036,0.052],[-0.03,0.054]],'#b24a58');
    ctx.save();ctx.clip();ell(ctx,0.008,0.062,0.05,0.03,'#f08f92');ctx.restore();
    ribbon(ctx,[[-0.088,0.006],[-0.02,-0.028],[0.03,-0.028],[0.092,0.006]],taper(0.017,0.6),A(h.pal.lash,0.8),20);
    ell(ctx,-0.005,0.078,0.022,0.008,A('#ffffff',0.7));
  }else{ // slightly parted
    ribbon(ctx,[[-0.13,0.005],[-0.04,-0.012],[0.01,-0.004],[0.06,-0.012],[0.125,0.0]],taper(0.026,0.6),A(h.pal.lash,0.9),20);
    ell(ctx,0.005,0.008,0.062,0.020,'#8a3f48');
    soft(ctx,1.5,()=>ell(ctx,0.005,0.062,0.085,0.026,A(h.pal.lip,0.5)));
    soft(ctx,2,()=>ell(ctx,0.0,0.115,0.07,0.018,A(P.deep,0.35)));
  }
  ctx.restore();
  ctx.restore();
}

function neck(ctx,h){
  const P=h.pal.skin,w=h.neckW,by=h.neckLen,cx=h.neckX,cy=lerp(1.13,1.31,h.jaw);
  ctx.save();headXf(ctx,h,false);
  ctx.beginPath();pathPts(ctx,[[cx-w,0.4],[cx-w*1.03,by-0.8],[cx-w*1.3,by-0.36],[cx-w*2.6,by+0.0],[cx-w*2.4,by+1.0],[cx+w*2.4,by+1.0],[cx+w*2.6,by+0.0],[cx+w*1.25,by-0.34],[cx+w*0.98,by-0.8],[cx+w,0.4]],true);
  ctx.fillStyle=lin(ctx,cx-w,0,cx+w*1.2,0,[[0,P.shade],[0.5,P.base],[1,P.light]]);ctx.fill();
  ctx.save();ctx.clip();
  soft(ctx,h.R*0.02,()=>blob(ctx,[[-1.2,0.3],[1.2,0.3],[0.95,cy+0.10],[0.30,cy+0.30],[-0.25,cy+0.15],[-0.85,cy-0.04]],A(h.jaw>0.5?'#a2667e':'#c67a8e',0.86)));
  soft(ctx,h.R*0.08,()=>{ell(ctx,cx-w*1.1,by-0.5,w*0.5,0.7,A(P.deep,0.4));ell(ctx,cx,by+0.1,w*1.2,0.12,A(P.deep,0.25));});
  ctx.restore();ctx.restore();
}

// ---------------------------------------------------------------- hair : heroine (wavy chestnut, see-through bangs)
const HER_FRONT=[[0.88,-0.10,1],[0.99,-0.50],[0.87,-1.0],[0.42,-1.31],[-0.20,-1.35],[-0.82,-1.11],[-1.16,-0.55],[-1.22,0.05],[-1.14,0.62],[-1.32,1.16],[-1.22,1.74],[-1.00,2.22,1],[-0.86,1.74],[-0.82,1.25],[-0.70,0.90],[-0.655,0.48],[-0.69,0.05],[-0.63,-0.40],[-0.34,-0.68],[0.10,-0.77],[0.48,-0.73],[0.74,-0.48]];
const HER_FAR=[[0.72,-0.52],[0.93,-0.2],[0.98,0.32],[0.93,0.78],[1.05,1.18],[0.97,1.58],[0.80,1.92,1],[0.80,1.42],[0.76,0.98],[0.84,0.52],[0.80,0.05]];
const HER_BACK=[[0.3,-1.2],[0.95,-0.7],[1.08,0.0],[1.02,0.7],[1.16,1.22],[1.06,1.72],[0.84,2.10,1],[0.55,1.8],[0.1,1.7],[-0.5,1.8],[-0.92,2.05],[-1.22,2.12,1],[-1.38,1.55],[-1.26,0.9],[-1.32,0.2],[-1.2,-0.6],[-0.7,-1.12]];
const HER_BANGS=[ // fan of see-through strands from the part; [p0,p1,p2,p3,width]
  [[0.20,-0.96],[-0.20,-0.58],[-0.50,-0.22],[-0.665,0.12],0.17],
  [[0.19,-0.94],[-0.10,-0.54],[-0.30,-0.20],[-0.385,0.045],0.085],
  [[0.21,-0.93],[0.00,-0.52],[-0.12,-0.20],[-0.175,0.00],0.055],
  [[0.24,-0.93],[0.14,-0.52],[0.06,-0.22],[0.03,-0.045],0.045],
  [[0.30,-0.94],[0.32,-0.52],[0.30,-0.22],[0.265,0.00],0.045],
  [[0.33,-0.94],[0.47,-0.54],[0.52,-0.24],[0.505,0.02],0.065],
  [[0.36,-0.93],[0.61,-0.57],[0.71,-0.27],[0.74,0.07],0.125]];
const bangW=w=>t=>w*Math.pow(1-t,0.55)*Math.min(1,0.25+t*3);
function hairFill(ctx,C,y0,y1){return lin(ctx,-0.4,y0,0.3,y1,[[0,C.mid],[0.35,C.base],[1,C.dark]]);}
function herHairBack(ctx,h){const C=h.pal.hair;ctx.save();headXf(ctx,h);
  blob(ctx,HER_BACK,lin(ctx,0,-1.2,0,2.1,[[0,C.base],[0.5,C.dark],[1,'#3d2230']]));
  ctx.save();ctx.clip();
  for(let i=0;i<7;i++){const x=-1.15+i*0.36;ribbon(ctx,[[x,0.5],[x-0.06,1.1],[x+0.05,1.6],[x-0.02,2.1]],taper(0.07),A(C.mid,0.35));}
  ctx.restore();ctx.restore();}
function herBangsPath(ctx){ // used for the forehead cast shadow
  for(const b of HER_BANGS){ribbon(ctx,b.slice(0,4),bangW(b[4]*1.2));ctx.fill();}
  blob(ctx,[[-0.7,-0.3],[-0.3,-0.56],[0.2,-0.62],[0.7,-0.42],[0.9,-0.1],[0.9,-1.0],[-0.9,-1.0]]);ctx.fill();}
function herHairFront(ctx,h){const C=h.pal.hair;ctx.save();headXf(ctx,h);
  // far side lock (behind cheek edge)
  blob(ctx,HER_FAR,lin(ctx,0,-0.5,0,1.9,[[0,C.base],[0.6,C.dark],[1,'#3d2230']]));
  ctx.save();ctx.clip();ribbon(ctx,[[0.90,-0.1],[0.96,0.5],[0.92,0.9],[1.02,1.3]],taper(0.07),A(C.light,0.55));ctx.restore();
  // main cap + near side lock
  blob(ctx,HER_FRONT,lin(ctx,-0.3,-1.3,0.2,2.2,[[0,C.mid],[0.28,C.base],[0.7,C.dark],[1,'#472633']]));
  ctx.save();ctx.clip();
  // depth under the cap edge and inside the lock
  soft(ctx,h.R*0.07,()=>{ell(ctx,-0.72,0.5,0.14,0.9,A(C.dark,0.65));ell(ctx,-0.95,1.9,0.3,0.4,A('#3d2230',0.5));});
  // broad glossy highlight band following the crown
  soft(ctx,h.R*0.03,()=>{
    ribbon(ctx,[[-1.10,-0.34],[-0.86,-0.80],[-0.30,-1.06],[0.30,-1.05],[0.78,-0.78],[0.94,-0.46]],t=>0.22*Math.pow(Math.sin(Math.PI*t),0.6),A(C.light,0.5),40);
    ribbon(ctx,[[-0.98,-0.48],[-0.74,-0.84],[-0.26,-1.04],[0.26,-1.03],[0.66,-0.82]],t=>0.08*Math.pow(Math.sin(Math.PI*t),0.7),A(C.gloss,0.7),40);
    // wave highlights on the side lock
    ribbon(ctx,[[-1.10,0.25],[-1.02,0.65],[-1.16,1.05],[-1.18,1.35]],taper(0.20),A(C.light,0.52));
    ribbon(ctx,[[-1.06,0.5],[-1.02,0.75],[-1.12,1.02]],taper(0.07),A(C.gloss,0.7));
    ribbon(ctx,[[-1.12,1.50],[-1.06,1.80],[-0.98,2.02]],taper(0.12),A(C.light,0.4));
  });
  // strand flow (dark + light), no outlines
  const part=[0.34,-0.98];
  [[-1.05,-0.2,-1.10,0.7,-1.26,1.2,-1.12,1.9],[-0.86,-0.35,-0.92,0.6,-1.08,1.2,-0.98,1.9],[-0.70,-0.42,-0.76,0.5,-0.9,1.25,-0.90,1.8]].forEach((s,i)=>{
    ribbon(ctx,[part,[s[0],s[1]],[s[2],s[3]],[s[4],s[5]],[s[6],s[7]]],taper(0.035),A(C.dark,0.5),40);});
  [[-0.2,-1.12,-0.86,-0.86,-1.12,-0.3],[-0.1,-0.98,-0.66,-0.74,-0.98,-0.2],[0.6,-1.02,0.84,-0.76,0.93,-0.4]].forEach(s=>{
    ribbon(ctx,[part,[s[0],s[1]],[s[2],s[3]],[s[4],s[5]]],taper(0.018),A(C.dark,0.32),28);});
  ribbon(ctx,[[-0.96,0.1],[-1.0,0.7],[-1.18,1.2],[-1.06,1.9]],taper(0.02),A(C.gloss,0.6),40);
  ctx.restore();
  // see-through bangs: soft translucent base + a fan of strands from the part (drawn over the cap: no hard hairline)
  blob(ctx,[[-0.68,-0.30],[-0.36,-0.70],[0.10,-0.80],[0.50,-0.76],[0.80,-0.40],[0.76,-0.02],[0.3,-0.06],[-0.2,-0.04],[-0.64,0.0]],lin(ctx,0,-0.76,0,-0.2,[[0,A(C.base,0.8)],[0.4,A(C.base,0.30)],[1,A(C.base,0)]]));
  for(const b of HER_BANGS){ribbon(ctx,b.slice(0,4),bangW(b[4]),lin(ctx,0,-0.95,0,0.1,[[0,C.base],[0.45,C.base],[0.8,C.mid],[1,A(C.light,0.95)]]),36);}
  for(const b of HER_BANGS){ribbon(ctx,[[b[1][0]+0.012,b[1][1]+0.02],[b[2][0]+0.012,b[2][1]],[b[3][0]+0.006,b[3][1]-0.10]],taper(b[4]*0.22),A(C.gloss,0.55));}
  // a few loose strands (airy silhouette)
  ribbon(ctx,[[-1.0,-0.9],[-1.22,-0.75],[-1.30,-0.45]],tail(0.035),A(C.base,0.9));
  ribbon(ctx,[[0.2,-1.24],[0.45,-1.34],[0.72,-1.2]],taper(0.022),A(C.mid,0.9));
  ribbon(ctx,[[-1.22,1.2],[-1.42,1.5],[-1.36,1.85]],tail(0.04),A(C.dark,0.9));
  ctx.restore();}

// ---------------------------------------------------------------- hair : hero (black, slightly messy, comma fringe)
const HIM_BACK=[[-0.55,-1.16],[-1.02,-0.76],[-1.17,-0.2],[-1.13,0.38],[-1.0,0.80,1],[-0.74,0.66],[-0.6,0.2],[0.3,-0.3],[0.8,-0.7],[0.3,-1.2]];
const HIM_CAP=[[0.80,0.00,1],[0.90,-0.45],[0.84,-0.92],[0.67,-1.25],[0.46,-1.17],[0.26,-1.37],[0.04,-1.25],[-0.22,-1.37],[-0.44,-1.19],[-0.80,-1.09],[-1.09,-0.93],[-1.07,-0.6],[-1.18,-0.25],[-1.10,0.05],[-0.97,0.22,1],[-0.88,0.00],[-0.77,0.36,1],[-0.69,-0.05],[-0.66,-0.36],[-0.40,-0.60],[0.0,-0.70],[0.40,-0.68],[0.64,-0.45],[0.74,-0.25]];
const HIM_LOCKS=[ // comma fringe, swept from the part
  [[0.44,-0.88],[0.62,-0.58],[0.71,-0.26],[0.725,0.03],0.26],
  [[0.36,-0.88],[-0.04,-0.68],[-0.42,-0.36],[-0.57,0.03],0.38],
  [[0.38,-0.86],[0.06,-0.58],[-0.17,-0.26],[-0.27,0.075],0.31],
  [[0.40,-0.84],[0.23,-0.52],[0.07,-0.20],[-0.01,0.085],0.25],
  [[0.42,-0.86],[0.40,-0.54],[0.30,-0.22],[0.20,0.02],0.17]];
const lockW=w=>t=>w*Math.pow(1-t,0.62)*(0.45+0.55*Math.min(1,t*5));
function himHairBack(ctx,h){const C=h.pal.hair;ctx.save();headXf(ctx,h);blob(ctx,HIM_BACK,lin(ctx,0,-1.2,0,0.8,[[0,C.base],[1,C.dark]]));ctx.restore();}
function himFringePath(ctx){blob(ctx,HIM_CAP);ctx.fill();for(const l of HIM_LOCKS){ribbon(ctx,l.slice(0,4),lockW(l[4]*1.05));ctx.fill();}}
function himHairFront(ctx,h){const C=h.pal.hair;ctx.save();headXf(ctx,h);
  blob(ctx,HIM_CAP,lin(ctx,0.2,-1.4,-0.3,0.3,[[0,C.mid],[0.35,C.base],[1,C.dark]]));
  ctx.save();ctx.clip();
  soft(ctx,h.R*0.03,()=>{
    ribbon(ctx,[[-1.02,-0.35],[-0.80,-0.78],[-0.30,-1.04],[0.26,-1.02],[0.70,-0.76],[0.86,-0.42]],t=>0.22*Math.pow(Math.sin(Math.PI*t),0.5),A(C.light,0.5),40);
    ribbon(ctx,[[-0.86,-0.52],[-0.62,-0.84],[-0.2,-1.02],[0.24,-0.99],[0.58,-0.80]],t=>0.07*Math.pow(Math.sin(Math.PI*t),0.6),A(C.gloss,0.65),40);
  });
  const part=[0.38,-0.94];
  [[-0.84,-0.6,-0.9,-0.05],[-0.6,-0.95,-1.05,-0.6],[0.1,-1.1,-0.3,-1.25],[0.62,-0.95,0.8,-0.6]].forEach(s=>{ribbon(ctx,[part,[s[0],s[1]],[s[2],s[3]]],taper(0.04),A(C.dark,0.7),24);});
  ctx.restore();
  // fringe locks: each lock = dark underside + body + thin sheen (lineless separation)
  HIM_LOCKS.forEach((l,i)=>{const p=l.slice(0,4);
    ctx.save();ctx.translate(0.022,0.03);ribbon(ctx,p,lockW(l[4]*1.02),C.dark,30);ctx.restore();
    ribbon(ctx,p,lockW(l[4]),lin(ctx,0.4,-0.9,-0.2,0.1,[[0,C.mid],[0.4,C.base],[1,C.base]]),30);
    const q=p.map((v,k)=>[v[0]-0.03,v[1]+0.02+(k===3?-0.12:0)]);ribbon(ctx,q,taper(l[4]*0.16),A(C.light,0.55),30);
    if(i>0){const g=p.map((v,k)=>[v[0]-0.055,v[1]+0.01+(k===3?-0.2:0)]);soft(ctx,1,()=>ribbon(ctx,[g[1],g[2],g[3]],taper(l[4]*0.10),A(C.gloss,0.6),20));}
  });
  // messy fly-aways
  ribbon(ctx,[[-0.6,-1.08],[-0.84,-1.24],[-1.00,-1.20]],tail(0.13),C.base);
  ribbon(ctx,[[0.02,-1.2],[0.04,-1.38],[-0.05,-1.45]],tail(0.11),C.base);
  ribbon(ctx,[[-1.05,-0.22],[-1.22,-0.14],[-1.27,0.02]],tail(0.10),C.base);
  ctx.restore();}

// ---------------------------------------------------------------- hands (clean finger group, sleeve-paw)
function hand(ctx,o){ // o:{x,y,ang,s,pal}; fingers kept together as one clean group
  const P=o.pal.skin;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.ang);ctx.scale(o.s,o.s);
  const Ls=[0.30,0.37,0.355,0.27],w=0.116,sp=0.104;
  rrect(ctx,-0.25,-0.225,0.36,0.45,0.12);ctx.fillStyle=P.base;ctx.fill();
  for(let i=0;i<4;i++){const l=Ls[i],y=(i-1.5)*sp,a=(i-1.5)*0.025;
    ctx.save();ctx.translate(0.05,y);ctx.rotate(a);
    rrect(ctx,0,-w/2,l,w,w/2);ctx.fillStyle=lin(ctx,0,0,l,0,[[0,P.shade],[0.45,P.base],[0.8,P.base],[1,'#ffb3a6']]);ctx.fill();ctx.restore();}
  for(let i=0;i<3;i++){const y=(i-1)*sp;ribbon(ctx,[[0.07,y],[0.05+Math.min(Ls[i],Ls[i+1])-0.05,y+(i-1)*0.008]],t=>0.02*(0.35+0.65*t),A(P.deep,0.75),6);}
  soft(ctx,o.s*0.03,()=>{ctx.fillStyle=A(P.deep,0.35);ctx.fillRect(-0.25,-0.25,0.2,0.5);});
  ctx.restore();}

// ---------------------------------------------------------------- parcel box
function box(ctx,o){ // unit coords of the torso; o:{x,y,w,h,rot}
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);const w=o.w,hh=o.h,d=0.44;
  // top face
  blob(ctx,[[-w/2,0,1],[w/2,0,1],[w/2-0.22,-d,1],[-w/2+0.30,-d,1]],lin(ctx,0,-d,0,0,[[0,'#f6cf9c'],[1,'#ffdfae']]));
  ctx.save();ctx.clip();ctx.fillStyle=A('#fff3d0',0.9);ctx.fillRect(-0.2,-d,0.42,d);ctx.fillStyle=A('#b9805e',0.5);ctx.fillRect(0.0,-d,0.012,d);ctx.restore();
  // front face
  rrect(ctx,-w/2,0,w,hh,0.03);ctx.fillStyle=lin(ctx,-w/2,0,w/2,hh,[[0,'#d9a273'],[0.5,'#e6b483'],[1,'#c78f6e']]);ctx.fill();
  ctx.save();ctx.clip();
  ctx.fillStyle=A('#fff0cc',0.85);ctx.fillRect(-0.2,0,0.42,0.62);                       // tape
  ctx.fillStyle=A('#ffffff',0.35);ctx.fillRect(-0.2,0,0.06,0.62);
  ctx.fillStyle=lin(ctx,0,0,0,0.22,[[0,A('#8a5560',0.35)],[1,A('#8a5560',0)]]);ctx.fillRect(-w/2,0,w,0.22); // lip shadow
  // label
  ctx.save();ctx.translate(0.62,0.62);ctx.rotate(0.02);rrect(ctx,0,0,0.78,0.5,0.03);ctx.fillStyle='#fff9f0';ctx.fill();
  ctx.fillStyle=A('#5a4660',0.75);for(let i=0;i<14;i++){const bw=[0.012,0.024,0.012,0.03,0.016,0.012,0.026][i%7];ctx.fillRect(0.07+i*0.036,0.27,bw,0.15);}
  ctx.fillStyle=A('#5a4660',0.55);ctx.fillRect(0.07,0.08,0.4,0.035);ctx.fillRect(0.07,0.15,0.26,0.035);
  ctx.fillStyle='#ff9a94';ctx.beginPath();const hx=0.64,hy=0.13,hs=0.05;ctx.moveTo(hx,hy+hs);ctx.bezierCurveTo(hx-hs*2,hy-hs*0.4,hx-hs*0.6,hy-hs*1.6,hx,hy-hs*0.5);ctx.bezierCurveTo(hx+hs*0.6,hy-hs*1.6,hx+hs*2,hy-hs*0.4,hx,hy+hs);ctx.fill();
  ctx.restore();
  soft(ctx,14,()=>{ctx.fillStyle=A('#7e5578',0.35);ctx.fillRect(-w/2,hh*0.72,w,hh*0.4);ctx.fillRect(-w/2-0.1,0,0.42,hh);});
  ctx.restore();ctx.restore();}

// ---------------------------------------------------------------- heroine body (cream cardigan, white top, hugging the box)
const KNIT={base:'#fbf0d8',light:'#fffbee',shade:'#f0d9c2',deep:'#cfa6b0'};
function knitFill(ctx,x0,y0,x1,y1){return lin(ctx,x0,y0,x1,y1,[[0,KNIT.shade],[0.45,KNIT.base],[1,KNIT.light]]);}
function herTorso(ctx,b){ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.S,b.S);
  // skirt
  blob(ctx,[[-1.5,4.7],[1.28,4.7],[1.5,7.2],[-1.75,7.2]],lin(ctx,-1.5,0,1.4,0,[[0,'#8d6386'],[0.5,'#b98392'],[1,'#d79d93']]));
  // white top
  blob(ctx,[[-0.66,-0.06,1],[-0.32,0.14],[0.02,0.20],[0.34,0.13],[0.64,-0.06,1],[0.8,2.4],[-0.8,2.4]],lin(ctx,-0.6,0,0.6,0.4,[[0,'#efe2ea'],[1,'#fffbf6']]));
  // cardigan panels
  const pl=[[-0.42,-0.14,1],[-1.05,-0.12],[-1.50,0.22],[-1.52,1.2],[-1.38,2.6],[-1.42,4.5],[-1.48,5.0],[0.0,5.0],[-0.02,1.9],[-0.20,0.9],[-0.40,0.15]];
  const pr=[[0.40,-0.12,1],[0.92,-0.04],[1.30,0.30],[1.28,1.2],[1.16,2.6],[1.20,4.5],[1.26,5.0],[0.06,5.0],[0.10,1.9],[0.26,0.9],[0.40,0.15]];
  blob(ctx,pl,knitFill(ctx,-1.6,1,0.2,0.2));
  ctx.save();ctx.clip();soft(ctx,b.S*0.09,()=>{ell(ctx,-0.9,1.0,0.5,0.8,A(KNIT.deep,0.35));ell(ctx,-1.3,3.8,0.5,1.4,A(KNIT.deep,0.5));});
  ribbon(ctx,[[-0.44,-0.14],[-0.36,0.3],[-0.14,1.0],[0.02,2.0]],()=>0.17,A(KNIT.light,0.9));ctx.restore();
  blob(ctx,pr,knitFill(ctx,-0.4,1.5,1.3,0.0));
  ctx.save();ctx.clip();soft(ctx,b.S*0.09,()=>{ell(ctx,0.2,1.3,0.3,0.9,A(KNIT.deep,0.3));ell(ctx,0.8,4.0,0.7,1.2,A(KNIT.deep,0.45));});
  ribbon(ctx,[[0.42,-0.12],[0.40,0.3],[0.22,1.0],[0.08,2.0]],()=>0.17,A(KNIT.light,0.95));ctx.restore();
  ctx.restore();}
function sleeve(ctx,b,pts,cuff,g,shade){ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.S,b.S);
  ctx.save();ctx.beginPath();ctx.rect(-1.38,0.95,2.96,2.5);ctx.clip();ctx.translate(-0.03,0.13);soft(ctx,b.S*0.05,()=>{blob(ctx,pts,A('#8c5568',0.42));blob(ctx,cuff,A('#8c5568',0.42));});ctx.restore();
  blob(ctx,pts,g(ctx));ctx.save();ctx.clip();shade&&shade(ctx);ctx.restore();
  // ribbed cuff
  blob(ctx,cuff,lin(ctx,cuff[0][0],cuff[0][1],cuff[3][0],cuff[3][1],[[0,KNIT.light],[0.6,KNIT.base],[1,KNIT.shade]]));
  ctx.save();ctx.clip();for(let i=1;i<7;i++){const t=i/7;const ax=lerp(cuff[0][0],cuff[3][0],t),ay=lerp(cuff[0][1],cuff[3][1],t),bx=lerp(cuff[1][0],cuff[2][0],t),by=lerp(cuff[1][1],cuff[2][1],t);
    if(i%2===0)ribbon(ctx,[[ax,ay],[bx,by]],()=>0.012,A(KNIT.deep,0.16),4);}ctx.restore();
  ctx.restore();}
function herArmsAndBox(ctx,b,pal){const S=b.S;
  ctx.save();ctx.translate(b.x,b.y);ctx.scale(S,S);
  // soft contact shadow of the box on the cardigan
  soft(ctx,S*0.1,()=>ell(ctx,0.1,1.0,1.6,0.3,A(KNIT.deep,0.5)));
  box(ctx,{x:0.10,y:0.98,w:3.0,h:2.55,rot:-0.055});
  ctx.restore();
  // far arm (screen right): shoulder -> elbow -> forearm across the upper box, hand resting on the box
  hand(ctx,{x:b.x-0.58*S,y:b.y+1.60*S,ang:Math.PI+0.12,s:S*0.86,pal});
  sleeve(ctx,b,[[1.0,0.02],[1.36,0.35],[1.60,1.2],[1.74,2.1],[1.64,2.58],[1.2,2.52],[0.4,2.16],[-0.46,1.90,1],[-0.56,1.30,1],[0.3,1.52],[0.92,1.52],[1.10,1.1],[1.0,0.6]],
    [[-0.40,1.22],[-0.70,1.24],[-0.60,1.98],[-0.30,1.96]],c=>knitFill(c,1.2,2.6,0.6,0.6),
    c=>soft(c,S*0.08,()=>{ell(c,0.5,2.32,1.2,0.24,A(KNIT.deep,0.8),0.22);ell(c,1.55,2.5,0.3,0.25,A(KNIT.deep,0.6));ell(c,1.2,1.3,0.22,0.6,A(KNIT.deep,0.3));ell(c,1.62,1.2,0.14,0.9,A(KNIT.light,0.9));}));
  // near arm (screen left): forearm across the lower box, hand gripping the far edge
  hand(ctx,{x:b.x+0.70*S,y:b.y+2.68*S,ang:-0.10,s:S*0.88,pal});
  sleeve(ctx,b,[[-1.12,-0.08],[-1.54,0.22],[-1.76,1.2],[-1.88,2.2],[-1.82,2.86],[-1.42,3.17],[-0.5,3.14],[0.56,2.98,1],[0.54,2.36,1],[-0.4,2.50],[-1.12,2.40],[-1.30,1.6],[-1.22,0.8]],
    [[0.46,2.30],[0.76,2.30],[0.78,3.04],[0.48,3.04]],c=>knitFill(c,-1.9,3.0,-0.6,0.4),
    c=>soft(c,S*0.08,()=>{ell(c,-0.5,3.12,1.3,0.22,A(KNIT.deep,0.85));ell(c,-1.75,2.9,0.35,0.3,A(KNIT.deep,0.6));ell(c,-1.25,2.0,0.2,0.7,A(KNIT.deep,0.4));ell(c,-1.78,1.5,0.14,1.0,A(KNIT.light,0.9));ribbon(c,[[-1.22,0.7],[-1.30,1.6],[-1.14,2.42]],taper(0.12),A(KNIT.deep,0.55));ell(c,-0.4,2.52,0.8,0.08,A(KNIT.light,0.8));}));
}

// ---------------------------------------------------------------- hero body (grey hoodie)
const HOOD={base:'#b0b2c4',light:'#e4dfe2',shade:'#8a8caa',deep:'#5e5c82'};
function himTorso(ctx,b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot||0);ctx.scale(b.S,b.S);
  // hood resting behind the neck
  blob(ctx,[[-1.12,0.12],[-1.0,-0.52],[-0.52,-0.98],[0.52,-0.98],[1.0,-0.52],[1.12,0.12],[0,0.5]],lin(ctx,0,-1,0,0.3,[[0,HOOD.shade],[1,HOOD.deep]]));
  ctx.restore();}
function himBody(ctx,b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot||0);ctx.scale(b.S,b.S);const S=b.S;
  // pants
  blob(ctx,[[-2.0,6.0],[2.2,6.0],[2.3,8.4],[-2.1,8.4]],'#3a3a5c');
  // tee
  blob(ctx,[[-0.66,-0.2,1],[-0.3,0.06],[0.0,0.12],[0.3,0.06],[0.66,-0.2,1],[0.4,1.2],[-0.4,1.2]],lin(ctx,0,-0.1,0,1,[[0,'#ddd3e4'],[1,'#fdf7f2']]));
  // hoodie silhouette (torso + arms)
  const body=[[-0.72,-0.52],[-1.50,-0.16],[-2.10,0.26],[-2.36,1.15],[-2.42,3.0],[-2.36,5.0],[-2.27,6.3],[2.3,6.3],[2.55,4.4],[2.75,2.6],[2.48,1.05],[2.12,0.18],[1.50,-0.18],[0.72,-0.52],[0.34,0.5],[0.0,1.05,1],[-0.34,0.5]];
  blob(ctx,body,lin(ctx,-2.2,2,2.2,0.5,[[0,HOOD.light],[0.4,HOOD.base],[1,HOOD.shade]]));
  ctx.save();ctx.clip();
  soft(ctx,S*0.10,()=>{
    ell(ctx,0,3.4,1.3,2.6,A(HOOD.deep,0.28));
    ribbon(ctx,[[-1.50,1.25],[-1.66,3.0],[-1.72,5.6]],t=>0.22*(1-t*0.5),A(HOOD.deep,0.7));    // arm / torso separation
    ribbon(ctx,[[1.52,1.2],[1.74,2.8],[1.9,4.6]],t=>0.26*(1-t*0.5),A(HOOD.deep,0.7));
    
    ell(ctx,-1.95,2.4,0.22,1.7,A(HOOD.light,0.5));ell(ctx,-1.5,0.25,0.6,0.2,A(HOOD.light,0.5),0.45);
    ell(ctx,0.0,7.0,3,1.6,A(HOOD.deep,0.5));
  });
  // folds
  soft(ctx,S*0.03,()=>{ribbon(ctx,[[-2.1,2.9],[-1.85,3.1],[-1.68,3.0]],taper(0.09),A(HOOD.deep,0.45));
    ribbon(ctx,[[-1.0,4.6],[0.0,4.45],[1.0,4.6]],taper(0.05),A(HOOD.deep,0.35));
    ribbon(ctx,[[-1.62,0.5],[-1.56,1.0],[-1.50,1.3]],taper(0.05),A(HOOD.deep,0.4));ribbon(ctx,[[1.66,0.45],[1.58,1.0],[1.52,1.25]],taper(0.05),A(HOOD.deep,0.4));});
  ctx.restore();
  // hood collar bands crossing at the chest
  const bandL=[[-0.74,-0.62],[-1.02,-0.2],[-0.70,0.55],[-0.05,1.22],[0.20,1.02],[-0.30,0.45],[-0.52,-0.2]];
  const bandR=[[0.74,-0.62],[1.02,-0.2],[0.70,0.55],[0.10,1.20],[-0.14,0.98],[0.30,0.45],[0.52,-0.2]];
  soft(ctx,S*0.05,()=>{ctx.save();ctx.translate(0,0.12);blob(ctx,bandL,A(HOOD.deep,0.5));blob(ctx,bandR,A(HOOD.deep,0.5));ctx.restore();});
  blob(ctx,bandR,lin(ctx,0.2,1.2,0.9,-0.5,[[0,HOOD.base],[1,HOOD.shade]]));
  blob(ctx,bandL,lin(ctx,-0.9,-0.5,-0.1,1.2,[[0,HOOD.light],[1,HOOD.base]]));
  // drawstrings
  [[-0.30,0.72,-0.36,2.25],[0.34,0.72,0.42,2.05]].forEach(s=>{ribbon(ctx,[[s[0],s[1]],[s[0]-0.05,(s[1]+s[3])/2],[s[2],s[3]]],()=>0.05,'#f1ebf0',10);
    rrect(ctx,s[2]-0.04,s[3]-0.02,0.08,0.2,0.03);ctx.fillStyle='#cfc6d6';ctx.fill();});
  ell(ctx,-0.30,0.72,0.05,0.05,HOOD.deep);ell(ctx,0.34,0.72,0.05,0.05,HOOD.deep);
  ctx.restore();}

// ---------------------------------------------------------------- characters
const HER={x:318,y:806,R:134,tilt:-0.035,flip:false,jaw:0,pal:PAL.her,neckW:0.37,neckLen:1.86,neckX:-0.10,ear:false,blush:1,hatch:true,mouth:'open',
  eyes:{look:[0.55,-0.35],open:1.0,hl:1,browY:-0.03},hairShadow:herBangsPath};
const HER_B={x:320,y:806+1.86*134,S:134};
const HIM={x:748,y:548,R:138,tilt:-0.07,flip:true,jaw:1,pal:PAL.him,neckW:0.56,neckLen:1.98,neckX:-0.10,ear:true,blush:0.22,hatch:false,mouth:'part',
  eyes:{look:[0.5,0.30],open:1.0,hl:1,browY:-0.05},hairShadow:himFringePath};
const HIM_B={x:756,y:548+1.98*138,S:138,rot:0.035};

function drawHer(ctx){
  herHairBack(ctx,HER);neck(ctx,HER);herTorso(ctx,HER_B);herArmsAndBox(ctx,HER_B,PAL.her);face(ctx,HER);herHairFront(ctx,HER);}
function drawHim(ctx){
  himTorso(ctx,HIM_B);neck(ctx,HIM);himBody(ctx,HIM_B);himHairBack(ctx,HIM);face(ctx,HIM);himHairFront(ctx,HIM);}

// ---------------------------------------------------------------- lighting on a character layer
function grade(layer,op,fn){const c=mk(),x=c.getContext('2d');x.drawImage(layer,0,0);x.globalCompositeOperation=op;fn(x);
  x.globalCompositeOperation='destination-in';x.drawImage(layer,0,0);const l=layer.getContext('2d');l.clearRect(0,0,W,H);l.drawImage(c,0,0);}
function rim(layer,dx,dy,color,blurPx,alpha){const c=mk(),x=c.getContext('2d');x.drawImage(layer,0,0);
  x.globalCompositeOperation='destination-out';x.drawImage(layer,dx,dy);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,W,H);
  const l=layer.getContext('2d');l.save();l.globalCompositeOperation='source-atop';l.globalAlpha=alpha;l.filter=`blur(${blurPx}px)`;l.drawImage(c,0,0);l.restore();}

// ---------------------------------------------------------------- background : shared hallway, two doors
function hallway(ctx){
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'#e0b3a4'],[0.45,'#c897a0'],[1,'#86668f']]);ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,0,W,0,[[0,A('#7d5f92',0.25)],[0.5,A('#7d5f92',0)],[1,A('#ffcf9a',0.2)]]);ctx.fillRect(0,0,W,H);
  // ---- her door (closed) : frame + leaf + recessed panels + number plate
  const dx=-250,dw=690,dy=150;
  ctx.fillStyle=lin(ctx,0,dy,0,H,[[0,'#f0d9cc'],[1,'#a98aa6']]);ctx.fillRect(dx-30,dy-30,dw+60,H);
  ctx.fillStyle=lin(ctx,dx,dy,dx+dw,H,[[0,'#7f8fb0'],[0.5,'#6a769c'],[1,'#4c4d7a']]);ctx.fillRect(dx,dy,dw,H);
  ctx.fillStyle=A('#3b3560',0.5);ctx.fillRect(dx,dy,dw,10);ctx.fillRect(dx+dw-8,dy,8,H);         // inner frame shadow
  const panel=(x,y,w,h)=>{ctx.fillStyle=A('#3d3a66',0.35);ctx.fillRect(x,y,w,h);ctx.fillStyle=A('#a9b6d6',0.38);ctx.fillRect(x+10,y+12,w-10,h-12);
    ctx.fillStyle=lin(ctx,x,y,x+w,y+h,[[0,'#7686aa'],[1,'#575f8c']]);ctx.fillRect(x+10,y+12,w-22,h-24);};
  panel(dx+70,300,dw-140,820);panel(dx+70,1190,dw-140,800);
  // number plate
  rrect(ctx,48,212,124,58,8);ctx.fillStyle='#f6e6cf';ctx.fill();rrect(ctx,48,264,124,6,3);ctx.fillStyle=A('#3b3560',0.35);ctx.fill();
  ctx.fillStyle='#55456a';ctx.font='700 40px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('302',110,243);
  // ---- wall strip : lamp + his number plate / bell
  // ---- his doorway (open) : glowing interior
  const ox=590;
  ctx.fillStyle=lin(ctx,0,dy,0,H,[[0,'#f6dfcf'],[1,'#b08fa6']]);ctx.fillRect(ox-30,dy-30,W,H);
  ctx.fillStyle=lin(ctx,ox,0,W,0,[[0,'#f9b56a'],[0.35,'#ffd68c'],[0.7,'#ffc478'],[1,'#f09a55']]);ctx.fillRect(ox,dy,W,H);
  ctx.fillStyle=lin(ctx,0,dy,0,H,[[0,A('#fff2c4',0.55)],[0.4,A('#fff2c4',0)],[0.75,A('#c0605a',0.25)],[1,A('#8d4a70',0.6)]]);ctx.fillRect(ox,dy,W,H);
  // interior hints (soft): inner wall edge, shelf, pendant glow
  soft(ctx,10,()=>{ctx.fillStyle=A('#e98a4e',0.45);ctx.fillRect(900,dy,200,H);ctx.fillStyle=A('#fff3cf',0.5);ctx.fillRect(884,dy,18,H);
    ctx.fillStyle=A('#b9604a',0.45);ctx.fillRect(900,1080,200,30);});
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=rad(ctx,800,330,520,[[0,A('#fff0c0',0.75)],[0.4,A('#ffd08a',0.3)],[1,A('#ffd08a',0)]]);ctx.fillRect(ox,dy,W,1400);
  [[660,250,26,0.35],[960,420,34,0.3],[1010,700,22,0.3],[640,560,16,0.3],[930,860,40,0.2]].forEach(b=>{ctx.fillStyle=rad(ctx,b[0],b[1],b[2],[[0,A('#fff6d8',b[3])],[0.8,A('#fff6d8',b[3]*0.8)],[1,A('#fff6d8',0)]]);ctx.fillRect(b[0]-60,b[1]-60,120,120);});
  ctx.restore();
  ctx.fillStyle=A('#7a3f4a',0.35);ctx.fillRect(ox,dy,10,H);ctx.fillRect(ox,dy,W,8);
  // light spill on the frame edge
  ctx.fillStyle=lin(ctx,ox-30,0,ox,0,[[0,A('#ffe2b0',0)],[1,A('#ffe2b0',0.8)]]);ctx.fillRect(ox-30,dy,30,H);
  // ---- window light falling across her door and the wall (golden panes, soft)
  ctx.save();ctx.globalCompositeOperation='soft-light';
  soft(ctx,7,()=>{ctx.save();ctx.transform(1,0.30,-0.32,1,60,430);
    for(let r=0;r<3;r++)for(let c=0;c<2;c++){ctx.fillStyle=A('#ffe2a0',0.95);ctx.fillRect(c*250,r*250,228,228);}ctx.restore();});
  ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';
  soft(ctx,9,()=>{ctx.save();ctx.transform(1,0.30,-0.32,1,60,430);
    for(let r=0;r<3;r++)for(let c=0;c<2;c++){ctx.fillStyle=A('#ffb86a',0.26);ctx.fillRect(c*250,r*250,228,228);}ctx.restore();});
  ctx.restore();
  // his number plate + bell on the wall strip
  rrect(ctx,484,640,90,104,10);ctx.fillStyle='#efe0d2';ctx.fill();rrect(ctx,484,738,90,6,3);ctx.fillStyle=A('#3b3560',0.3);ctx.fill();
  ctx.fillStyle='#5b4a70';ctx.font='700 30px Pretendard';ctx.fillText('301',529,668);
  ell(ctx,529,710,15,15,'#cdbccd');ell(ctx,529,710,8,8,'#fff3d6');
}
function lamp(ctx){
  // ---- wall lamp between the doors
  const lx=528,ly=438;
  rrect(ctx,lx-8,ly+30,16,46,6);ctx.fillStyle='#8d7396';ctx.fill();
  rrect(ctx,lx-30,ly+66,60,14,7);ctx.fillStyle='#75608a';ctx.fill();
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=rad(ctx,lx,ly,230,[[0,A('#ffe3a8',0.75)],[0.25,A('#ffc477',0.32)],[1,A('#ffc477',0)]]);ctx.fillRect(lx-240,ly-240,480,480);ctx.restore();
  rrect(ctx,lx-26,ly-46,52,84,24);ctx.fillStyle=lin(ctx,0,ly-46,0,ly+38,[[0,'#fffdf0'],[1,'#ffe2a6']]);ctx.fill();
  ctx.fillStyle=rad(ctx,lx,ly-6,30,[[0,A('#ffffff',0.95)],[1,A('#ffffff',0)]]);ctx.fillRect(lx-30,ly-36,60,60);
}
function doorLeaf(ctx){ // his door, swung out toward us at the right edge (foreground)
  ctx.save();ctx.filter='blur(1.2px)';
  ctx.beginPath();ctx.moveTo(1016,120);ctx.lineTo(1100,84);ctx.lineTo(1100,H);ctx.lineTo(1016,H);ctx.closePath();
  ctx.fillStyle=lin(ctx,1016,0,1090,0,[[0,'#6a6594'],[1,'#3f3a66']]);ctx.fill();
  ctx.fillStyle=lin(ctx,0,120,0,H,[[0,'#ffe9b8'],[0.5,'#ffc888'],[1,'#c98a8a']]);ctx.fillRect(1006,122,12,H);
  rrect(ctx,1034,980,60,150,12);ctx.fillStyle='#2f2b4a';ctx.fill();
  rrect(ctx,1026,1076,70,22,11);ctx.fillStyle=lin(ctx,0,1076,0,1098,[[0,'#fff1dc'],[1,'#b9a0b0']]);ctx.fill();
  ctx.restore();}

// ---------------------------------------------------------------- speech bubble + sfx
function bubble(ctx,o){ // o:{x,y,w,h,tail:[bx,tipx,tipy],lines,size,font}
  const {x,y,w,h}=o,cx=x+w/2,cy=y+h/2,a=w/2,b=h/2;
  const body=()=>{ctx.beginPath();const k=0.72; // squircle-ish hand-drawn oval
    ctx.moveTo(cx-a,cy+4);ctx.bezierCurveTo(cx-a,cy-b*k-10,cx-a*k,cy-b,cx-8,cy-b);ctx.bezierCurveTo(cx+a*k+6,cy-b,cx+a,cy-b*k,cx+a,cy-6);
    ctx.bezierCurveTo(cx+a,cy+b*k+6,cx+a*k,cy+b,cx+6,cy+b);ctx.bezierCurveTo(cx-a*k-4,cy+b,cx-a,cy+b*k,cx-a,cy+4);ctx.closePath();};
  const tl=()=>{const [bx,tx,ty]=o.tail;ctx.beginPath();ctx.moveTo(bx-34,y+h-22);ctx.quadraticCurveTo(bx-4,y+h+20,tx,ty);ctx.quadraticCurveTo(bx+22,y+h+12,bx+34,y+h-26);ctx.closePath();};
  ctx.save();
  ctx.shadowColor=A('#4a2f5a',0.35);ctx.shadowBlur=26;ctx.shadowOffsetY=10;ctx.fillStyle='#fffdf8';body();ctx.fill();ctx.shadowColor='transparent';
  ctx.lineJoin='round';ctx.lineWidth=9;ctx.strokeStyle='#3a2a40';tl();ctx.stroke();body();ctx.stroke();
  ctx.fillStyle='#fffdf8';body();ctx.fill();tl();ctx.fill();
  ctx.fillStyle=lin(ctx,0,y+h*0.55,0,y+h,[[0,A('#ffd9c9',0)],[1,A('#ffd9c9',0.4)]]);ctx.save();body();ctx.clip();ctx.fillRect(x,y,w,h);ctx.restore();
  ctx.fillStyle='#2b2233';ctx.font=`600 ${o.size}px ${o.font}`;ctx.textAlign='center';ctx.textBaseline='middle';
  const lh=o.size*1.34,y0=cy-(o.lines.length-1)*lh/2+2;o.lines.forEach((s,i)=>ctx.fillText(s,cx,y0+i*lh));
  ctx.restore();}
function sfx(ctx,o){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  o.chars.forEach((c,i)=>{ctx.save();ctx.translate(c[1],c[2]);ctx.rotate(c[3]);ctx.font=`${c[4]}px "Black Han Sans"`;
    ctx.shadowColor=A('#ff9a4a',0.8);ctx.shadowBlur=22;ctx.lineWidth=13;ctx.strokeStyle='#4a2740';ctx.strokeText(c[0],0,0);ctx.shadowColor='transparent';
    ctx.fillStyle=lin(ctx,0,-c[4]/2,0,c[4]/2,[[0,'#fffaf0'],[1,'#ffd9a0']]);ctx.fillText(c[0],0,0);ctx.restore();});
  // little impact ticks
  [[-78,-58,-104,-86],[-96,-20,-132,-30],[-88,22,-118,40]].forEach(t=>{ctx.beginPath();ctx.moveTo(t[0],t[1]);ctx.lineTo(t[2],t[3]);ctx.lineWidth=7;ctx.lineCap='round';ctx.strokeStyle='#fff3d0';ctx.stroke();});
  ctx.restore();}

// ---------------------------------------------------------------- compose
function render(canvas){
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
  // background (slightly soft = depth of field)
  const bg=mk();hallway(bg.getContext('2d'));
  ctx.save();ctx.filter='blur(2.2px)';ctx.drawImage(bg,0,0);ctx.restore();
  ctx.drawImage(bg,0,0,W,300,0,0,W,300); // keep the plate crisp-ish at the top
  lamp(ctx);
  // hero layer
  const L2=mk();drawHim(L2.getContext('2d'));
  grade(L2,'multiply',x=>{x.fillStyle=lin(x,0,1100,0,1900,[[0,'#ffffff'],[0.55,'#ebdff0'],[1,'#a892c2']]);x.fillRect(0,0,W,H);
    x.fillStyle=lin(x,760,0,1080,0,[[0,'#ffffff'],[1,'#d6c2e0']]);x.fillRect(0,780,W,H);});
  grade(L2,'soft-light',x=>{x.fillStyle=rad(x,540,640,520,[[0,A('#ffe0a8',0.22)],[1,A('#ffe0a8',0)]]);x.fillRect(0,0,W,H);});
  rim(L2,-11,5,'#ffb25a',2.6,1);rim(L2,-4,2,'#ffedc4',1.0,0.95);
  ctx.save();ctx.shadowColor=A('#e8743c',0.42);ctx.shadowBlur=26;ctx.drawImage(L2,0,0);ctx.restore();
  // heroine layer
  const L1=mk();drawHer(L1.getContext('2d'));
  grade(L1,'multiply',x=>{x.fillStyle=lin(x,0,1250,0,1900,[[0,'#ffffff'],[0.55,'#e6d6ee'],[1,'#a892c4']]);x.fillRect(0,0,W,H);
    x.fillStyle=lin(x,40,0,300,0,[[0,'#e2d0ea'],[1,'#ffffff']]);x.fillRect(0,0,W,H);});
  grade(L1,'soft-light',x=>{x.fillStyle=rad(x,560,760,460,[[0,A('#ffdca0',0.42)],[1,A('#ffdca0',0)]]);x.fillRect(0,0,W,H);});
  rim(L1,9,6,'#ffd596',2.2,0.95);rim(L1,4,3,'#fff6dc',1.0,0.9);rim(L1,-6,3,'#ffc890',2.5,0.5);
  ctx.save();ctx.shadowColor=A('#3c2560',0.62);ctx.shadowBlur=34;ctx.shadowOffsetX=12;ctx.shadowOffsetY=8;ctx.drawImage(L1,0,0);ctx.restore();
  // foreground door leaf
  doorLeaf(ctx);
  // ---- atmosphere : warm haze from the open door + lamp, dust motes
  ctx.save();ctx.globalCompositeOperation='screen';
  ctx.fillStyle=rad(ctx,960,380,620,[[0,A('#ffc070',0.20)],[1,A('#ffc070',0)]]);ctx.fillRect(0,0,W,H);
  ctx.fillStyle=rad(ctx,528,438,260,[[0,A('#ffe0a0',0.32)],[1,A('#ffe0a0',0)]]);ctx.fillRect(0,0,W,H);
  const r=prng(20261113);
  for(let i=0;i<70;i++){const x=r()*W,y=200+r()*1400,s=1.2+r()*r()*7,a=0.10+r()*0.35;ctx.fillStyle=rad(ctx,x,y,s,[[0,A('#fff2cc',a)],[1,A('#fff2cc',0)]]);ctx.fillRect(x-s,y-s,s*2,s*2);}
  ctx.restore();
  // ---- bloom
  const bl=mk();const bx=bl.getContext('2d');bx.filter='blur(22px) brightness(1.05) contrast(1.35)';bx.drawImage(canvas,0,0);
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=0.10;ctx.drawImage(bl,0,0);ctx.restore();
  { const cp=mk();cp.getContext('2d').drawImage(canvas,0,0);ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=0.28;ctx.drawImage(cp,0,0);ctx.restore(); }
  // ---- grade : violet vignette, warm top
  ctx.save();ctx.globalCompositeOperation='multiply';
  ctx.fillStyle=rad(ctx,560,760,1250,[[0,'#ffffff'],[0.55,'#fbeef0'],[1,'#9f86bd']]);ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,1450,0,H,[[0,'#ffffff'],[1,'#a58fc0']]);ctx.fillRect(0,0,W,H);ctx.restore();
  // ---- lettering (above the light effects so it stays clean)
  sfx(ctx,{x:938,y:296,rot:-0.10,chars:[['덜',-44,0,-0.06,92],['컥',50,-10,0.07,104]]});
  bubble(ctx,{x:52,y:300,w:432,h:224,tail:[250,292,628],lines:['저기… 혹시','옆집이세요?'],size:56,font:'Pretendard'});
  // ---- film grain
  const g=mk(256,256),gx=g.getContext('2d'),id=gx.createImageData(256,256),rr=prng(77);
  for(let i=0;i<id.data.length;i+=4){const v=128+(rr()-0.5)*110;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}
  gx.putImageData(id,0,0);ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=0.10;ctx.fillStyle=ctx.createPattern(g,'repeat');ctx.fillRect(0,0,W,H);ctx.restore();
}
window.SceneC={render,W,H,HER,HIM,parts:{face,eye,neck,hand,box,bubble,sfx,hallway,herHairBack,herHairFront,himHairBack,himHairFront,herTorso,himBody}};
})();
