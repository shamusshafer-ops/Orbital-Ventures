// Flight 3D Slice 1: presentation data is pure and the dormant lifecycle preserves fallback behavior.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name,Math.abs(a-b)<=tol); }

newGame('engineer');
const spec={mode:'launch',crewed:true,isOrbital:true,isCislunar:false,success:true,night:true,stages:[{prop:100,count:2,dia:5}],boosters:{count:2,prop:30,dia:2,solid:true}};
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600,ignite:.6};

check('flight 3D renderer is enabled for the pad/ascent visual slice',FLIGHT3D===true);
check('launch moves decisively from countdown to liftoff',PAD_PHASE_MS===2300&&PAD_PHASE_MS*(1-PAD_HOLD_FRAC)<700);
check('phase adapter reports pad',flight3dPhaseAt(spec,1000,timing)==='pad');
check('phase adapter reports ascent',flight3dPhaseAt(spec,4000,timing)==='ascent');
check('phase adapter reports orbit',flight3dPhaseAt(spec,11000,timing)==='orbit');
check('phase adapter reports reentry',flight3dPhaseAt(spec,16000,timing)==='reentry');
check('phase adapter distinguishes a suborbital coast',flight3dPhaseAt(Object.assign({},spec,{isOrbital:false}),11000,timing)==='suborbital');
check('successful suborbital playback stays on one 3D ocean scene through its settle tail',flight3dPhaseAt(Object.assign({},spec,{isOrbital:false}),16000,timing)==='suborbital');
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
  const baseY=cape3dLaunchBaseY({userData:{nozzleY:-10}});
  check('launch base keeps the nozzle visibly above the pad deck',baseY-10===CAPE3D_PAD_DECK_Y+CAPE3D_NOZZLE_CLEARANCE);
}
{
  const ignition=cape3dGroundSmokeProfile('pad',.8,.8), liftoff=cape3dGroundSmokeProfile('ascent',.12,1), coast=cape3dGroundSmokeProfile('suborbital',.1,1);
  check('pad smoke grows at ignition and remains behind through early ascent',ignition.strength>.8&&liftoff.strength>.6&&liftoff.spread>ignition.spread&&coast.strength===0);
}
{
  const seaLevel=cape3dPlumeProfile(1,0), vacuum=cape3dPlumeProfile(1,1), idle=cape3dPlumeProfile(0,0);
  check('layered plume broadens in vacuum while retaining a hot sea-level core',vacuum.width>seaLevel.width&&vacuum.length>seaLevel.length&&seaLevel.hotOpacity>vacuum.hotOpacity&&idle.hotOpacity===0);
}
{
  const layout=cape3dLandscapeLayout();
  near(layout.land.centerX+layout.land.width*.5,layout.coastX,1e-9,'land ends exactly at the coastline');
  near(layout.ocean.centerX-layout.ocean.width*.5,layout.coastX,1e-9,'ocean begins exactly at the coastline without overlap');
}
{
  const sounding=Object.assign({},spec,{isOrbital:false,reqDv:1800}), rise=cape3dLaunchProfile(flight3dPresentationSnapshot(sounding,timing,3200+7200*.8)), coast=cape3dLaunchProfile(flight3dPresentationSnapshot(sounding,timing,3200+7200+1200));
  check('sounding rockets use the same physical metre scale as the launch facility',rise.altitude===rise.altitudeKm*CAPE3D_METERS_PER_KM&&rise.altitude>10000);
  check('suborbital profile continues the scaled 3D arc after burnout',coast.phase==='suborbital'&&coast.offsetX>0&&coast.altitude>0&&coast.offsetX===coast.downrangeKm*CAPE3D_METERS_PER_KM);
  check('sounding profile reports a physical upper-atmosphere altitude',coast.altitudeKm>60&&coast.altitudeKm<100);
  const impact=cape3dLaunchProfile(flight3dPresentationSnapshot(sounding,timing,3200+7200+4800+500));
  check('suborbital arc reaches sea level over the modeled ocean and triggers splashdown',impact.phase==='suborbital'&&impact.altitudeKm===0&&impact.splashProgress===1&&impact.offsetX>1000&&impact.offsetX===impact.downrangeKm*CAPE3D_METERS_PER_KM);
  const altitude=flightAltitudeTelemetry(flight3dPresentationSnapshot(sounding,timing,3200+7200+4800+500));
  check('separate MSL altitude telemetry reads zero at water impact',altitude.visible&&altitude.altitudeKm===0&&altitude.label==='0 m');
}
{
  const sounding=cape3dVehicleDetailProfile({totalH:58,maxW:9,segs:[{h:58,w:9}]}), orbital=cape3dVehicleDetailProfile({totalH:112,maxW:18,segs:[{h:112,w:18}]}), heavy=cape3dVehicleDetailProfile({totalH:175,maxW:28,boosters:{count:4}}), superheavy=cape3dVehicleDetailProfile({totalH:188,maxW:30},{methane:true});
  check('pad detail scales from portable sounding rail to orbital strongback',sounding.kind==='sounding'&&sounding.rail&&orbital.kind==='orbital'&&orbital.strongback);
  check('heavy facilities gain umbilicals, suppression and three lightning masts',heavy.kind==='heavy'&&heavy.armCount===3&&heavy.deluge&&heavy.lightningMasts===3);
  check('methane super-heavy vehicle gains four control flaps and the largest tower class',superheavy.kind==='superheavy'&&superheavy.flaps&&superheavy.armCount===4);
}
{
  const physics=flightPhysicsSpec(curMission(),computeVehicle()), first=Object.assign({},spec,{isOrbital:false,reqDv:1000,physics}), early=cape3dLaunchProfile(flight3dPresentationSnapshot(first,timing,3200+7200*.3)), climb=cape3dLaunchProfile(flight3dPresentationSnapshot(first,timing,3200+7200*.8)), plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  check('first flight altitude comes from actual thrust, wet mass and propellant instead of the old 18 metre mission cap',climb.altitudeKm>1&&plan.maxAltitudeKm>50);
  check('physical projection reports substantial range and velocity for the high-TWR pioneer vehicle',plan.rangeKm>50&&plan.maxSpeedMps>1000&&plan.burnoutTime>10);
  check('launch playback freezes this individually built rocket\'s complete physical stack',physics.liftoff===computeVehicle().liftoff&&physics.stages[0].prop===state.stages[0].prop&&physics.stages[0].thrustSL===ENGINES[state.stages[0].eng].thrustSL*state.stages[0].count*thrustMult());
  check('flight geometry and the altitude instrument share a true metre scale',Math.abs(climb.altitude-climb.altitudeKm*CAPE3D_METERS_PER_KM)<1e-8&&Math.abs(climb.offsetX-climb.downrangeKm*CAPE3D_METERS_PER_KM)<1e-8);
  check('every launch climbs nearly vertically before a slow gravity turn',Math.abs(early.pitch)<.02&&early.downrangeKm<.01&&climb.pitch<-.1&&climb.downrangeKm>.5);
  const impact=cape3dTrajectorySample(plan,'suborbital',1);
  check('physics-derived trajectory ends at sea level rather than an arbitrary mission endpoint',impact.altitudeKm===0&&impact.xKm===plan.rangeKm);
  const higherThrust=JSON.parse(JSON.stringify(physics)); higherThrust.stages.forEach(s=>{ s.thrustSL*=1.2; s.thrustVac*=1.2; });
  const higherPlan=cape3dTrajectoryPlan(higherThrust,{isOrbital:false,reqDv:1000});
  check('a differently built rocket receives a different projection',higherPlan.maxSpeedMps>plan.maxSpeedMps&&higherPlan.maxAltitudeKm!==plan.maxAltitudeKm&&higherPlan.rangeKm!==plan.rangeKm);
  check('flight camera depth expands with physical altitude',cape3dFlightCameraFar(100000)>cape3dFlightCameraFar(0));
}
{
  // Old replay specs have no frozen physical stack. They retain a safe, metre-scaled fallback;
  // live launches use the individually integrated physical plan tested above.
  const vertical=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,3200+7200*.04));
  const early=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,3200+7200*.3)), late=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,3200+7200*.98));
  check('ascent begins with a vertical tower-clearing rise',vertical.pitch===0&&vertical.downrangeKm<1e-6);
  check('legacy replay fallback remains finite through its ascent',Number.isFinite(early.pitch)&&Number.isFinite(early.altitudeKm)&&early.altitude>0);
  check('legacy replay fallback remains metre-scaled late in ascent',late.altitude===late.altitudeKm*CAPE3D_METERS_PER_KM&&late.downrangeKm>0);
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
  const transferSpec=Object.assign({},spec,{isOrbital:false,isCislunar:true}), snap=flight3dPresentationSnapshot(transferSpec,timing,11000), early=cape3dTransferProfile({phaseProgress:.08}), late=cape3dTransferProfile({phaseProgress:.92});
  check('cislunar cruise has a dedicated transfer phase',snap.phase==='transfer');
  check('transfer profile carries craft continuously from Earth toward the Moon',early.x<0&&late.x>0&&early.burn>late.burn&&late.arrival>0);
}
{
  const reentry=cape3dReentryProfile(flight3dPresentationSnapshot(spec,timing,16000));
  check('reentry profile starts with a bounded plasma envelope',reentry.progress>=0&&reentry.plasma>=0&&reentry.plasma<=1);
  check('reentry profile supplies deterministic recovery deployments',reentry.drogue>=0&&reentry.mains>=0&&reentry.mains<=1);
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
