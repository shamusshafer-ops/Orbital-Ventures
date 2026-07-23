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

// ---------- 7. physical ascent handoff uses altitude, not arbitrary playback progress ----------
{
  const low=cape3dPhysicalAscentBlend(12000), mid=cape3dPhysicalAscentBlend(55000), high=cape3dPhysicalAscentBlend(110000);
  check('physical Earth remains absent through the lower atmosphere',low.space===0&&low.capeVisible===true);
  check('physical Earth handoff occurs in the high atmosphere',mid.space>0&&mid.space<1&&mid.capeVisible===true);
  check('physical Earth is fully established above the Kármán line',high.space===1&&high.capeVisible===false);
  check('physical handoff is monotonic by altitude',(()=>{let prev=-1;for(const km of [0,10,20,28,40,55,70,85,96,120]){const x=cape3dPhysicalAscentBlend(km*1000).space;if(x<prev)return false;prev=x;}return true;})());
  check('camera depth reaches beyond the real geometric horizon at 100 km',cape3dFlightCameraFar(100000)>1100000);
  check('Earth and Cape cross-fade complementarily with no translucent coverage gap',(()=>{for(let km=0;km<=100;km+=2){const q=cape3dPhysicalAscentBlend(km*1000);if(Math.abs(q.earthOpacity+q.capeOpacity-1)>1e-9)return false;}return true;})());
  check('Earth is fully opaque before Cape geometry is removed at 70 km',cape3dPhysicalAscentBlend(70000).earthOpacity===1&&!cape3dPhysicalAscentBlend(70000).capeVisible);
  check('Earth-scale fog is already below 1e-5 at 28 km and effectively gone by 70 km',cape3dPhysicalAscentBlend(28000).fogDensity<1e-5&&cape3dPhysicalAscentBlend(42000).fogDensity<1.5e-6&&cape3dPhysicalAscentBlend(70000).fogDensity<4e-8);
  check('zenith darkens ahead of the solid Earth reveal instead of producing a flat blue wash',cape3dPhysicalAscentBlend(42000).skySpace>cape3dPhysicalAscentBlend(42000).earthOpacity);
  check('authored chase elevation blends toward a shallow real-horizon view',(()=>{for(const km of [28,42,70,96,185]){const h=km*1000,dip=Math.acos(6371000/(6371000+h)),el=cape3dLaunchHorizonElevation(h,.3);if(el<0||el>dip+.000001)return false;}return true;})());
  const capeTexture=cape3dEarthTextureVector(28.4,-80.6), capeLat=Math.asin(capeTexture.y)*180/Math.PI;
  let capePhi=Math.atan2(capeTexture.z,-capeTexture.x); if(capePhi<0) capePhi+=Math.PI*2;
  near(capeLat,28.4,1e-12,'Earth texture maps Cape latitude onto the launch tangent instead of showing the north pole');
  near(capePhi*180/Math.PI-180,-80.6,1e-12,'Earth texture maps Cape longitude onto the launch tangent instead of Greenwich');
}

// ---------- 5. NASA-style camera director: restrained authored beats with manual offsets layered later ----------
{
  const pad=cape3dLaunchCameraProfile({phase:'pad',progress:.5});
  const tower=cape3dLaunchCameraProfile({phase:'ascent',progress:.05,t:2,trajectory:{stageEvents:[]}});
  const climb=cape3dLaunchCameraProfile({phase:'ascent',progress:.45,t:40,trajectory:{stageEvents:[]}});
  const insert=cape3dLaunchCameraProfile({phase:'ascent',progress:.92,t:100,trajectory:{stageEvents:[]}});
  check('camera director names the pad/tower/ascent/insertion mission-control shots',pad.shot==='PAD TRACKER'&&tower.shot==='TOWER CLEAR'&&climb.shot==='ASCENT TRACK'&&insert.shot==='INSERTION TRACK');
  check('camera distance multiplier remains tightly bounded through all authored shots',[pad,tower,climb,insert].every(c=>c.distMul>=.72&&c.distMul<=1.55));
  const sep=cape3dLaunchCameraProfile({phase:'ascent',progress:.5,t:50,trajectory:{stageEvents:[{t:50.2,kind:'stage',index:0}]}});
  check('camera recognizes and tightens for a real stage event',sep.shot==='STAGE SEPARATION'&&sep.distMul<climb.distMul);
  const booster=cape3dLaunchCameraProfile({phase:'ascent',progress:.3,t:20,trajectory:{stageEvents:[{t:20,kind:'booster',index:-1}]}});
  check('booster event gets its own tracking beat',booster.shot==='BOOSTER SEPARATION');
}

// ---------- 6. trajectory guide is bounded and preserves physical endpoints/events ----------
{
  const points=[]; for(let i=0;i<1000;i++) points.push({t:i*.2,xKm:i*.01,altitudeKm:i*.02});
  const plan={points,stageEvents:[{t:10,kind:'stage',index:0,xKm:.5,altitudeKm:1}]};
  const guide=cape3dTrajectoryGuideSamples(plan,100);
  check('trajectory guide decimates long physics plans to a bounded render payload',guide.points.length<=101);
  check('trajectory guide preserves first and final physical samples',guide.points[0].t===0&&guide.points[guide.points.length-1].t===points[points.length-1].t);
  check('trajectory guide preserves authoritative staging markers',guide.events.length===1&&guide.events[0].t===10&&guide.events[0].kind==='stage');
  check('trajectory guide safely handles a missing plan',cape3dTrajectoryGuideSamples(null,100).points.length===0);
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
  check('camera target uses the remaining stack height, not the departed stage origin',cape3dLiveStageTargetY(after,.30)===after.mid);
  check('pad tracker lift stays proportional to live stack height rather than absolute topY',cape3dLiveStageTargetY(after,.40)>after.mid&&cape3dLiveStageTargetY(after,.40)<after.topY);

  sgs[1].group.parent={}; // everything detached (shouldn't happen in practice, but must not crash)
  const none=cape3dLiveStageSpan(sgs,rocket);
  check('if nothing is left attached, degrades gracefully to a zero span (no throw)', none.baseY===0 && none.topY===0 && none.mid===0);

  check('an empty stageGroups array degrades gracefully', cape3dLiveStageSpan([],rocket).mid===0);
  check('a null stageGroups argument degrades gracefully (no throw)', cape3dLiveStageSpan(null,rocket).mid===0);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
