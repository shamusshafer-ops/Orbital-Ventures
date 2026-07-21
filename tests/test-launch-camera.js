// Launch camera/reveal fixes (2026-07-20): (1) cape3dLaunchChaseDist no longer explodes with raw
// altitude in metres — the previous formula reached 5000+ units by 100km, beyond what the zoom
// range could pull back; now sqrt(km)-based and capped. (2) the ascent Earth-curvature reveal
// (cape3dAscentBlend's space/capeVisible) is now actually applied instead of hardcoded off.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
function near(a,b,tol,n){ check(n+` (${(+a).toFixed(2)} vs ${(+b).toFixed(2)})`,Math.abs(a-b)<=tol); }

// ---------- 1. camera distance stays bounded across the whole realistic altitude range ----------
{
  near(cape3dLaunchChaseDist(0), 150, 1e-9, 'at the pad (0 altitude), distance is the base 150');
  check('distance grows with altitude', cape3dLaunchChaseDist(50000)>cape3dLaunchChaseDist(0));
  check('distance NEVER exceeds the 620-unit cap, at any altitude', cape3dLaunchChaseDist(1e9)<=620);
  check('a realistic ~100 km altitude stays well within the old zoom-out range (<600)', cape3dLaunchChaseDist(100000)<600);
  check('a realistic ~300 km orbital insertion altitude is already at/near the cap, not thousands of units', cape3dLaunchChaseDist(300000)<=620);
  // the old bug: linear-in-metres blew past anything the .35-3.2x zoom could compensate for.
  // With the fix, even at minimum zoom-in (.35x) the camera sits within a sane range at orbital alt.
  check('even at minimum zoom-in, camera stays within a sane range at orbital altitude', cape3dLaunchChaseDist(300000)*0.35<250);
  check('distance is monotonically non-decreasing with altitude (no weird dips)', (()=>{ let prev=0,ok=true; for(const km of [0,1,5,20,50,100,200,400,800]){ const d=cape3dLaunchChaseDist(km*1000); if(d<prev-1e-6) ok=false; prev=d; } return ok; })());
}

// ---------- 2. cape3dAscentBlend drives a real reveal curve (already existed, now actually used) ----------
{
  check('early ascent: cape site visible, no space reveal yet', cape3dAscentBlend(.1).space===0 && cape3dAscentBlend(.1).capeVisible===true);
  check('mid ascent: space reveal has started', cape3dAscentBlend(.5).space>0 && cape3dAscentBlend(.5).space<1);
  check('late ascent: space reveal is fully in, cape site has handed off', cape3dAscentBlend(.9).space===1 && cape3dAscentBlend(.9).capeVisible===false);
  check('space reveal is monotonically increasing with progress', (()=>{ let prev=-1,ok=true; for(const p of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]){ const s=cape3dAscentBlend(p).space; if(s<prev-1e-9) ok=false; prev=s; } return ok; })());
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
