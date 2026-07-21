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

// ---------- 3. FIX 2026-07-20: capeVisible no longer trails space's saturation point ----------
// Previously capeVisible cut off at a separately-chosen p<.72, a full 0.10 of progress AFTER
// `space` reached 1 (fully-opaque Earth) at p=.62 — a window where the opaque Earth sphere and the
// fully-visible flat launch-site ground rendered simultaneously ("mixed together"), then the
// ground popped off in a single frame. Now the cutoff is exactly where space saturates.
{
  check('the site is still visible before Earth starts fading in', cape3dAscentBlend(.1).capeVisible===true);
  check('the site is still visible while Earth is only partially opaque', cape3dAscentBlend(.5).capeVisible===true);
  const atSat=cape3dAscentBlend(.62);
  check('at the exact point Earth reaches full opacity, the site is already gone (no overlap)', atSat.space===1 && atSat.capeVisible===false);
  check('there is no progress value where BOTH the site AND a fully-opaque Earth are visible', (()=>{
    for(let p=0;p<=1;p+=0.01){ const b=cape3dAscentBlend(p); if(b.capeVisible && b.space>=0.999) return false; } return true;
  })());
  check('once past saturation, the site stays gone (no flicker back)', cape3dAscentBlend(.8).capeVisible===false && cape3dAscentBlend(1).capeVisible===false);
}

// ---------- 4. FIX 2026-07-20: camera/flame target re-centers on the REMAINING stack after a
// separation, instead of staying pinned to the departed stage's original span ("no rocket, just a
// plume" — the camera kept aiming at the empty space stage 0 left behind). Tested with plain mock
// stage-group objects (a group's .parent is a plain property here, no THREE dependency needed). ---
{
  const rocket={}; // identity sentinel, not a real THREE object — only used for === comparison
  const sgs=[{index:0,baseY:0,topY:20.9,group:{parent:rocket}},{index:1,baseY:20.9,topY:40.0,group:{parent:rocket}}];
  const before=cape3dLiveStageSpan(sgs,rocket);
  check('before any separation, the span covers the WHOLE vehicle', before.baseY===0 && before.topY===40.0);
  check('before separation, mid is the whole-vehicle midpoint', before.mid===20.0);

  sgs[0].group.parent={}; // stage 0 detaches (reparented off the rocket)
  const after=cape3dLiveStageSpan(sgs,rocket);
  check('after stage 0 separates, the span starts where the REMAINING stage begins (not 0)', after.baseY===20.9);
  check('after stage 0 separates, mid moves UP into the remaining stage — not stuck at the vacated base', after.mid>before.mid);
  near(after.mid, 30.45, 1e-9, 'the recentred midpoint matches the remaining stage\'s own midpoint exactly');

  sgs[1].group.parent={}; // everything detached (shouldn't happen in practice, but must not crash)
  const none=cape3dLiveStageSpan(sgs,rocket);
  check('if nothing is left attached, degrades gracefully to a zero span (no throw)', none.baseY===0 && none.topY===0 && none.mid===0);

  check('an empty stageGroups array degrades gracefully', cape3dLiveStageSpan([],rocket).mid===0);
  check('a null stageGroups argument degrades gracefully (no throw)', cape3dLiveStageSpan(null,rocket).mid===0);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
