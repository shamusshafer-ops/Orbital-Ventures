// Flight 3D Slice 1: presentation data is pure and the dormant lifecycle preserves fallback behavior.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name,Math.abs(a-b)<=tol); }

newGame('engineer');
const spec={mode:'launch',crewed:true,isOrbital:true,isCislunar:false,success:true,night:true,stages:[{prop:100,count:2,dia:5}],boosters:{count:2,prop:30,dia:2,solid:true}};
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600,ignite:.6};

check('flight 3D renderer is enabled for the pad/ascent visual slice',FLIGHT3D===true);
check('phase adapter reports pad',flight3dPhaseAt(spec,1000,timing)==='pad');
check('phase adapter reports ascent',flight3dPhaseAt(spec,4000,timing)==='ascent');
check('phase adapter reports orbit',flight3dPhaseAt(spec,11000,timing)==='orbit');
check('phase adapter reports reentry',flight3dPhaseAt(spec,16000,timing)==='reentry');
{
  const snap=flight3dPresentationSnapshot(spec,timing,1600);
  check('snapshot carries immutable presentation identity',snap.phase==='pad'&&snap.crewed&&snap.isOrbital&&snap.effects.night);
  near(snap.phaseProgress,.5,1e-9,'snapshot normalizes phase progress');
  near(snap.effects.ignition,.6,1e-9,'snapshot carries ignition intensity');
  check('snapshot copies vehicle data',snap.vehicle.stages!==spec.stages&&snap.vehicle.stages[0].prop===100&&snap.vehicle.boosters.solid);
}
{
  const pad=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,1600));
  const ascent=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,6800));
  check('launch profile keeps the vehicle on the pad before ascent',pad.altitude===0&&pad.plume>0);
  check('launch profile raises the vehicle and brightens the plume in ascent',ascent.altitude>0&&ascent.plume===1&&ascent.light>pad.light);
}
{
  const failed=Object.assign({},spec,{success:false,failPhase:'ascent'});
  const snap=flight3dPresentationSnapshot(failed,timing,3200+7200*.62), profile=cape3dLaunchProfile(snap);
  check('ascent failure is carried into the 3D presentation snapshot',snap.effects.ascentFailure&&snap.effects.failureProgress>0);
  check('3D failure profile cuts thrust for the breakup sequence',profile.failed&&profile.plume===0&&profile.light===0);
}
{
  const low=cape3dAscentBlend(.35), transition=cape3dAscentBlend(.5), high=cape3dAscentBlend(.85);
  check('ascent blend keeps Cape visible through low atmosphere',low.atmosphere===0&&low.capeVisible);
  check('ascent blend darkens toward space before the Earth layer appears',transition.space>0&&transition.atmosphere>0);
  check('ascent blend establishes atmosphere, space and clears Cape at high altitude',high.atmosphere>0&&high.space>0&&!high.capeVisible);
}
{
  const orbit=cape3dOrbitProfile(flight3dPresentationSnapshot(spec,timing,11000));
  check('orbit profile follows the authoritative cruise phase',orbit.progress>0&&orbit.progress<1);
  check('orbit profile gives insertion a bounded burn envelope',orbit.burn>=0&&orbit.burn<=1&&Number.isFinite(orbit.angle));
}
{
  const efficient=cape3dFlightQualityProfile({deviceMemory:4,hardwareConcurrency:4}), cinematic=cape3dFlightQualityProfile({deviceMemory:16,hardwareConcurrency:12});
  check('flight quality profile protects constrained machines',efficient.name==='efficient'&&efficient.shadowMap===512&&efficient.pixelRatio===1);
  check('flight quality profile preserves high-detail desktop rendering',cinematic.name==='cinematic'&&cinematic.shadowMap===2048&&cinematic.pixelRatio>1);
}
check('dormant lifecycle cannot steal the flight overlay',beginFlight3DSession(spec)===false&&flight3dSession===null);
check('dormant lifecycle cleanup is a safe no-op',endFlight3DSession()===false&&flight3dSession===null);
check('3D fallback handoff is safe with no active session',flight3dHandoffToFallback(null)===false);
{
  flight3dSession={handedOff:false};
  check('3D decision layer accepts a live renderer session',showFlight3DDecision({title:'GO / NO-GO',lines:['Range poll'],buttons:[]})===true);
  check('3D decision layer clears without touching renderer state',clearFlight3DDecision()===true&&flight3dSession.handedOff===false);
  flight3dSession=null;
}
{
  // These are the two real launch hold branches. Keep the renderer session live while
  // `drawScene` presents the decision; the previous implementation handed it off here.
  const originalShow=showFlight3DDecision, originalPad=drawPad, originalFallback=drawDecisionPanel;
  let overlays=0, fallbackPanels=0;
  showFlight3DDecision=()=>{ overlays++; return true; };
  drawPad=()=>{};
  drawDecisionPanel=()=>{ fallbackPanels++; };
  const makeHeldState=(holdAt)=>({spec,padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600,virtT:0,phase:null,pendingDecision:{holdAt,buildPanel:()=>({title:'GO / NO-GO',lines:[],buttons:[]})},held:false});
  flight3dSession={handedOff:false}; animState=makeHeldState('pad-start'); drawScene(10);
  check('pad-start decision keeps the live 3D renderer mounted',animState.held&&flight3dSession.handedOff===false&&overlays===1&&fallbackPanels===0);
  flight3dSession={handedOff:false}; animState=makeHeldState('pad-end'); drawScene(3200);
  check('pad-end decision keeps the live 3D renderer mounted',animState.held&&flight3dSession.handedOff===false&&overlays===2&&fallbackPanels===0);
  animState=null; flight3dSession=null;
  showFlight3DDecision=originalShow; drawPad=originalPad; drawDecisionPanel=originalFallback;
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
