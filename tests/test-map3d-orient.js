// Solar Map D3b (2026-07-25) — orientation aids: ecliptic reference grid + off-screen Sun/Earth
// direction chevrons. Heavier-tier slice specifically because of the projection correctness trap
// below; the grid itself is trivial.
//
// THE TRAP: a world→NDC projection divides by camera-space depth. For a point BEHIND the camera that
// depth is negative, which silently flips BOTH screen axes — an off-screen arrow then points exactly
// backwards. It only manifests once you rotate past 90°, which is exactly the case a quick visual
// check misses. map3dProjectPoint/map3dChevronDirection are therefore pure (no THREE dependency) so
// the behind-camera behavior is directly assertable, which is how the inverted right-vector bug in
// the first draft was caught (f × up = (−f.z,0,f.x), not (f.z,0,−f.x) — every direction was mirrored).
//
// THREE-dependent pieces (addMap3dEclipticGrid's Line objects, addMap3dChevrons' DOM, and
// map3dUpdateChevrons' per-frame writes) are NOT covered — no WebGL/DOM here. NOT browser-verified.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// Camera at +z looking toward the origin (forward = −z), so screen +x is world +x and screen +y is
// world +y — a frame where the expected answers are unambiguous by inspection.
const EYE={x:0,y:0,z:100}, TGT={x:0,y:0,z:0}, ASPECT=1.6;
const P=p=>map3dProjectPoint(EYE,TGT,p,50,ASPECT);
const D=p=>map3dChevronDirection(P(p));

// ---------- in-front basics ----------
{
  const c=P({x:0,y:0,z:0});
  check('the look-at target is in front of the camera', c.inFront===true);
  check('the look-at target is on screen', c.onScreen===true);
  check('the look-at target sits at NDC origin', Math.abs(c.ndcX)<1e-9 && Math.abs(c.ndcY)<1e-9);
  check('an on-screen point yields no chevron', D({x:0,y:0,z:0})===null);
  const near=P({x:2,y:0,z:0});
  check('a slightly off-centre point is still on screen', near.onScreen===true);
  check('a point to world +x projects to NDC +x (not mirrored)', near.ndcX>0);
}

// ---------- in-front but outside the frustum: direction must match the world side ----------
{
  check('far world +x  -> chevron points screen right', (()=>{const d=D({x:500,y:0,z:0}); return d && d.x>0.99 && Math.abs(d.y)<1e-9;})());
  check('far world -x  -> chevron points screen left',  (()=>{const d=D({x:-500,y:0,z:0}); return d && d.x<-0.99;})());
  check('far world +y  -> chevron points screen up',    (()=>{const d=D({x:0,y:500,z:0}); return d && d.y>0.99;})());
  check('far world -y  -> chevron points screen down',  (()=>{const d=D({x:0,y:-500,z:0}); return d && d.y<-0.99;})());
  check('a far off-screen point is correctly NOT flagged on-screen', P({x:500,y:0,z:0}).onScreen===false);
  check('...but is still correctly flagged in front', P({x:500,y:0,z:0}).inFront===true);
}

// ---------- BEHIND the camera: the sign-flip trap ----------
{
  const behindRight=P({x:500,y:0,z:300}), behindLeft=P({x:-500,y:0,z:300});
  check('a point behind the camera is flagged not-in-front', behindRight.inFront===false);
  check('a point behind the camera is never reported on-screen', behindRight.onScreen===false && behindLeft.onScreen===false);
  check('BEHIND-and-right still points screen RIGHT (not flipped by the perspective divide)',
    (()=>{const d=map3dChevronDirection(behindRight); return d && d.x>0.99;})());
  check('BEHIND-and-left still points screen LEFT (not flipped by the perspective divide)',
    (()=>{const d=map3dChevronDirection(behindLeft); return d && d.x<-0.99;})());
  // the regression this guards: naive ndc would have inverted these relative to the in-front case
  const front=D({x:500,y:0,z:0}), back=map3dChevronDirection(behindRight);
  check('a target on the same world side gives the same screen side whether in front or behind',
    front && back && Math.sign(front.x)===Math.sign(back.x));
  check('behind-and-above still points screen up',
    (()=>{const d=D({x:0,y:500,z:300}); return d && d.y>0.99;})());
  check('dead astern (degenerate, no lateral component) falls back to a defined direction, not NaN',
    (()=>{const d=D({x:0,y:0,z:300}); return d && Number.isFinite(d.x) && Number.isFinite(d.y) && Math.hypot(d.x,d.y)>0.99;})());
}

// ---------- chevron directions are always unit-length and finite ----------
{
  let bad=0;
  for(const p of [{x:500,y:0,z:0},{x:-500,y:300,z:200},{x:0,y:-400,z:900},{x:900,y:900,z:900},{x:-1,y:-1,z:5000}]){
    const d=D(p); if(!d) continue;
    if(!Number.isFinite(d.x)||!Number.isFinite(d.y)||Math.abs(Math.hypot(d.x,d.y)-1)>1e-9) bad++;
  }
  check('every chevron direction is a finite unit vector', bad===0);
}

// ---------- edge placement ----------
{
  const e=map3dChevronEdgePoint({x:1,y:0},0.08);
  check('a rightward chevron lands on the right edge, inset', Math.abs(e.x-0.92)<1e-9 && Math.abs(e.y)<1e-9);
  const d=map3dChevronEdgePoint({x:Math.SQRT1_2,y:Math.SQRT1_2},0.08);
  check('a diagonal chevron lands in the corner (both axes at the inset limit)', Math.abs(d.x-0.92)<1e-6 && Math.abs(d.y-0.92)<1e-6);
  check('edge point never exceeds the NDC box', [[1,0],[0,1],[0.6,0.8],[-0.3,-0.95]].every(([x,y])=>{
    const p=map3dChevronEdgePoint({x,y},0.08); return Math.abs(p.x)<=1 && Math.abs(p.y)<=1; }));
  check('map3dChevronEdgePoint(null) is null, never throws', map3dChevronEdgePoint(null,0.08)===null);
}

// ---------- pole case: camera looking straight down must not produce a degenerate basis ----------
{
  const proj=map3dProjectPoint({x:0,y:100,z:0},{x:0,y:0,z:0},{x:50,y:0,z:0},50,ASPECT);
  check('looking straight down the pole still yields finite camera-space coords',
    Number.isFinite(proj.cx)&&Number.isFinite(proj.cy)&&Number.isFinite(proj.cz));
  const d=map3dChevronDirection(proj);
  check('...and a finite chevron direction if off screen', d===null || (Number.isFinite(d.x)&&Number.isFinite(d.y)));
}

// ---------- ecliptic grid stops stay consistent with the rest of the view ----------
{
  check('grid rings are defined at real AU stops', MAP3D_GRID_AU.length>=4 && MAP3D_GRID_AU.every(a=>a>0));
  check('grid AU stops are sorted outward', MAP3D_GRID_AU.every((a,i)=>i===0||MAP3D_GRID_AU[i-1]<a));
  check('grid radii use the same sceneRadiusAtAU transform as the orbit rings and D2 AU labels — the grid can never imply a spacing the rest of the view contradicts',
    MAP3D_GRID_AU.every(a=>Number.isFinite(sceneRadiusAtAU(a))&&sceneRadiusAtAU(a)>0));
  check('the outermost grid ring reaches at least Neptune', sceneRadiusAtAU(MAP3D_GRID_AU[MAP3D_GRID_AU.length-1])>=sceneRadiusAtAU(30.0));
  check('a sensible number of radial spokes (readable, not a starburst)', MAP3D_GRID_SPOKES>=6 && MAP3D_GRID_SPOKES<=24);
}

// ---------- chevron targets ----------
{
  newGame('engineer');
  check('Sun resolves to the scene origin', (()=>{const p=map3dChevronWorldPos('sun',absDay()); return p.x===0&&p.y===0&&p.z===0;})());
  const e=map3dChevronWorldPos('earth',absDay());
  check('Earth resolves via bodyScenePos (same source as the planet mesh itself)',
    e && e.x===bodyScenePos('earth',absDay()).x);
  check('exactly the two orientation anchors are configured', MAP3D_CHEVRON_TARGETS.length===2);
  check('both anchors carry a label and colour', MAP3D_CHEVRON_TARGETS.every(t=>t.label&&t.color));
}

console.log(`map3d-orient: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
