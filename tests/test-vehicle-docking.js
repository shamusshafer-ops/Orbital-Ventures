// Docking D3: separately launched vehicle targeting, reciprocal links and deterministic cleanup.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function launchedHull(tag){ const hull=makeHull({recovery:false},tag||'dock-test'); markHullLaunched(hull.id,tag||'dock-test'); return hull; }
function flightCtx(m,hullId,outcome){
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,
    outcome:outcome||{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,hullId,crewId:null,
    docking:dockingMissionCapability(m,dockingBuildCapability(m)),ab:{rel:0,payoutMult:1}};
}
function deploy(kind){
  const mission=flyOrbitAssetDeployment(kind), hull=launchedHull('deploy-'+kind);
  finalizeLaunch(flightCtx(mission,hull.id),null);
  return orbitAssetList().find(asset=>asset.hullId===hull.id);
}

newGame('engineer'); state.money=1000; state.research.crew_capsule=true;
const target=deploy('target');
const mission=flyVehicleDocking(target.id,'capsule');
check('planning reserves target asset and exact port',target.status==='reserved'&&target.reservation.missionId===mission.id&&target.interfaces[0].occupiedBy===mission.vehicleDocking.operationId);
check('a second operation cannot take the reserved target',!reserveOrbitAssetDocking(target.id,'other','pod',['cargo','power','data']).ok);
const build=dockingBuildCapability(mission), capability=dockingMissionCapability(mission,build);
check('build freezes separate actor and target identities',build.actors.some(actor=>actor.id===`orbit-visitor:${mission.id}`)&&build.actors.some(actor=>actor.id===`orbit-asset:${target.id}`));
check('mission owns one real vehicle-docking operation',capability.rejections.length===0&&capability.operations.length===1&&capability.operations[0].source==='orbit_asset_visit');
check('presentation names both separately launched craft',capability.presentation[0].actor.label==='Crew capsule'&&capability.presentation[0].target.label===target.name);

const actorHull=launchedHull('capsule-rendezvous');
finalizeLaunch(flightCtx(mission,actorHull.id),null);
const actor=orbitAssetList().find(asset=>asset.hullId===actorHull.id), liveTarget=orbitAssetById(target.id);
check('successful rendezvous preserves approaching hull in orbit',actor&&actor.status==='docked'&&hullById(actorHull.id).status==='in-orbit');
check('hard dock creates reciprocal exact links',actor.dockedTo===liveTarget.id&&liveTarget.dockedTo===actor.id&&actor.dockOperation.id===liveTarget.dockOperation.id);
check('both linked interfaces retain one operation owner',actor.interfaces.some(port=>port.occupiedBy===actor.dockOperation.id)&&liveTarget.interfaces.some(port=>port.occupiedBy===actor.dockOperation.id));
check('target reservation becomes a hard-dock link',liveTarget.reservation===null&&liveTarget.status==='docked');
check('lifecycle audit accepts two in-orbit hull owners',auditLifecycleState().length===0);

const roundTrip=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:2,state}));
applyLoadedSave(roundTrip);
check('reciprocal vehicle dock survives save/load',orbitAssetById(actor.id).dockedTo===target.id&&auditLifecycleState().length===0);
const forced=removeOrbitAsset(target.id,'lost',true);
check('forced linked-target loss deterministically frees surviving craft',forced.ok&&orbitAssetById(actor.id).status==='free'&&orbitAssetById(actor.id).interfaces.every(port=>port.occupiedBy===null));
check('removed target hull records terminal loss',hullById(target.hullId).status==='lost'&&auditLifecycleState().length===0);

// Failed approach releases the target; reselecting the retained mission rebooks it.
newGame('engineer'); state.money=1000; state.research.crew_capsule=true;
const retryTarget=deploy('pod'), retryMission=flyVehicleDocking(retryTarget.id,'capsule');
failVehicleDocking(retryMission);
check('failed approach frees exact target port',retryTarget.status==='free'&&retryTarget.interfaces.every(port=>port.occupiedBy===null));
const rebound=canFlyVehicleDocking(retryTarget.id,'capsule');
check('retained mission can deterministically re-reserve target',rebound.ok&&retryTarget.status==='reserved'&&retryTarget.reservation.missionId===retryMission.id);
cancelOrbitMission(retryMission.id);
check('cancelling rebooked mission frees target and removes offer',retryTarget.status==='free'&&!missionById(retryMission.id));

const abortMission=flyVehicleDocking(retryTarget.id,'capsule'), abortHull=launchedHull('aborted-rendezvous');
const abortCtx=flightCtx(abortMission,abortHull.id,{kind:'abort',rel:.8,subsystem:'docking',story:'Approach corridor lost.',failPhase:'docking'});
finalizeLaunch(abortCtx,null);
check('integrated failed launch settlement releases target reservation',retryTarget.status==='free'&&retryTarget.interfaces.every(port=>port.occupiedBy===null));
check('failed approaching hull never acquires an orbit owner',!orbitAssetList().some(asset=>asset.hullId===abortHull.id)&&hullById(abortHull.id).status==='lost');

// Independent targets may be reserved at once; removing one cancels only its owner.
const first=retryTarget, second=deploy('target');
const firstMission=flyVehicleDocking(first.id,'capsule'), secondMission=flyVehicleDocking(second.id,'capsule');
check('simultaneous targets own distinct reservations',first.reservation.operationId!==second.reservation.operationId&&auditLifecycleState().length===0);
const removed=removeOrbitAsset(first.id,'lost');
check('target removal cancels only its pending mission',removed.ok&&removed.cancelled.includes(firstMission.id)&&missionById(secondMission.id)===secondMission);
check('unrelated target reservation remains valid',second.status==='reserved'&&second.reservation.missionId===secondMission.id&&auditLifecycleState().length===0);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
