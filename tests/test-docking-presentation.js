// Docking D5: frozen real-scene presentation, telemetry, ceremony/routine
// playback and unchanged docking balance. Appended after harness + game.js.
animEnabled=true;
let pass=0,fail=0;
function check(name,condition){ if(condition) pass++; else{ fail++; console.log('FAIL:',name); } }
function ctxFor(m,hullId){
  const docking=dockingMissionCapability(m,dockingBuildCapability(m));
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,hullId:hullId||null,docking,
    outcome:{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,crewId:null,ab:{rel:0,payoutMult:1}};
}
function resetOverlay(){ animState=null; _flightResolving=false; _pendingLive=null; _pendingReserve=null; _pendingOps=null; _pendingRescue=null; }

newGame('engineer'); state.money=1000; state.research.orbital_assembly=true;
state.facilities.leo_station={built:true,modules:3,since:state.year,supply:FAC_SUPPLY_MONTHS,starvedMonths:0,autoResupply:false,moduleList:['can_std','power_truss','node_hub']};
state.assemblyLayouts={'station:leo_station':{1:{x:11,y:0,z:-4,yaw:.4,parent:0}}};
const first={id:'d5-first',proc:true,deliverModule:{facId:'leo_station',modId:'lab_mod'},moduleCost:11,name:'First presentation dock',crew:0,days:0,reqDv:9400,payload:16,minRep:0,payout:0,rep:0};
attachStationVisitPlan(first,'leo_station','module_delivery',{kind:'module_delivery',modId:'lab_mod',moduleCost:11},false);
finalizeLaunch(ctxFor(first),null);
const firstDock=animState&&animState.spec.dock;
check('first successful hard dock receives ceremony',firstDock&&firstDock.ceremony===true&&state.dockingPresentation.successful===1);
check('actor scene uses the launched vehicle shape snapshot',firstDock.scene.actorVehicle.stages.length===state.stages.length&&firstDock.scene.actorVehicle.stages[0].eng===state.stages[0].eng);
check('facility scene freezes typed post-transfer modules',firstDock.scene.targetType==='facility'&&firstDock.scene.facility.modules.some(node=>node.id==='lab_mod'));
check('facility scene reuses the saved assembly projection',firstDock.scene.facility.nodes[1].x===assembly3dSceneSpec('station',{def:facilityById('leo_station'),fs:facilityState('leo_station')}).nodes[1].x);
check('first docking retains full card duration',dockingCardDuration(animState.spec)===DOCK_CARD_MS);
check('crewed docking owns the terminal tail instead of competing with reentry',flight3dPhaseAt(animState.spec,animState.padDur+animState.ascentDur+animState.cruiseDur+1,animState)==='dock');
const early=dockingTelemetry(0,firstDock),captured=dockingTelemetry(1,firstDock);
check('telemetry closes range and rate monotonically',early.rangeM>captured.rangeM&&early.closingRateMps>captured.closingRateMps);
check('telemetry exposes canonical station-visitor reserve and hard-capture state',early.reserveMps===STATION_VISITOR_RENDEZVOUS_DV&&captured.capture==='HARD DOCK');
const savedMotionFlag=__mockReducedMotion; __mockReducedMotion=true;
check('reduced motion jumps directly to the settled docking frame',dockingPlaybackProgress(0,DOCK_CARD_MS)===1);
__mockReducedMotion=savedMotionFlag;

resetOverlay(); state.research.auto_rendezvous=true;
const routine={id:'d5-routine',proc:true,deliverModule:{facId:'leo_station',modId:'greenhouse'},moduleCost:10,name:'Routine automated dock',crew:0,days:0,reqDv:9400,payload:15,minRep:0,payout:0,rep:0};
attachStationVisitPlan(routine,'leo_station','module_delivery',{kind:'module_delivery',modId:'greenhouse',moduleCost:10},false);
finalizeLaunch(ctxFor(routine),null);
check('proven automated docking is explicitly routine-skippable',animState.spec.dock.routineSkipEligible===true&&animState.spec.dock.ceremony===false);
check('routine playback uses the bounded short tail',dockingCardDuration(animState.spec)===DOCK_ROUTINE_MS&&animState.totalDur===animState.padDur+animState.ascentDur+animState.cruiseDur+animState.reentryDur+DOCK_ROUTINE_MS);

resetOverlay(); newGame('engineer'); state.money=1000; state.research.crew_capsule=true; state.research.orbital_assembly=true;
const targetMission=flyOrbitAssetDeployment('target'),targetHull=makeHull({recovery:false},'d5-target'); markHullLaunched(targetHull.id,'d5-target');
animEnabled=false; finalizeLaunch(ctxFor(targetMission,targetHull.id),null); animEnabled=true;
const target=orbitAssetList().find(asset=>asset.hullId===targetHull.id);
target.vehicleSnapshot.launchSpec={stages:[{prop:37,count:1,dia:2.8,eng:'kerolox_sc'}],boosters:{count:0},transferProp:8,transferEng:'hyper_storable',crewed:false,livery:{body:'#445566',accent:'#abcdef',nose:'classic'}};
const visit=flyVehicleDocking(target.id,'capsule'),actorHull=makeHull({recovery:false},'d5-actor'); markHullLaunched(actorHull.id,'d5-actor');
finalizeLaunch(ctxFor(visit,actorHull.id),null);
const vehicleDock=animState&&animState.spec.dock;
check('vehicle docking receives the terminal presentation',vehicleDock&&vehicleDock.scene.targetType==='vehicle');
check('vehicle target keeps its exact frozen stage snapshot',vehicleDock.scene.targetVehicle.stages[0].prop===37&&vehicleDock.scene.targetVehicle.livery.body==='#445566');
check('vehicle actor reserve comes from the settled orbit asset',vehicleDock.reserveMps===250);

check('assembly docking reliability remains the established value',ASSEMBLY_DOCK_REL===.97);
check('persistent rendezvous attempt cost remains 25 m/s',ORBIT_RENDEZVOUS_ATTEMPT_DV===25);
const saveRoundTrip=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state})); applyLoadedSave(saveRoundTrip);
// Re-pinned 2026-08-18: dropped the hardcoded "&&SAVE_VERSION===67" clause. SAVE_VERSION is
// expected to keep incrementing (it was 68 as of #116-A, 2026-08-18) -- pinning it here was
// testing an implementation detail, not a behavior. The real assertion, that save/load preserves
// docking presentation history, is the first clause and is unaffected by which version number
// the game happens to be on.
check('presentation history survives save/load',state.dockingPresentation.successful===1);

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
