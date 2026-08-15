// Docking D4: durable stationkeeping, capture, wave-off/retry and post-dock lifecycle actions.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function launchedHull(tag){ const hull=makeHull({recovery:false},tag); markHullLaunched(hull.id,tag); return hull; }
function flightCtx(m,hullId){
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,
    outcome:{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,hullId,crewId:null,
    docking:dockingMissionCapability(m,dockingBuildCapability(m)),ab:{rel:0,payoutMult:1}};
}
function deploy(kind){
  const mission=flyOrbitAssetDeployment(kind), hull=launchedHull('d4-'+kind);
  finalizeLaunch(flightCtx(mission,hull.id),null);
  return orbitAssetList().find(asset=>asset.hullId===hull.id);
}

newGame('engineer'); state.money=1000; state.research.crew_capsule=true;
const actor=deploy('capsule'), target=deploy('target'), startReserve=actor.resources.rendezvousDv;
const planned=planOrbitDockingOperation(actor.id,target.id,'d4-plan-1'), operation=planned.operation;
check('planning creates a durable stationkeeping operation',planned.ok&&operation.kind==='dock'&&operation.phase==='stationkeeping'&&orbitOperationErrors(operation).length===0);
check('stationkeeping reserves both exact spacecraft ports',actor.status==='reserved'&&target.status==='reserved'&&actor.interfaces[0].occupiedBy===operation.dockOperation.id&&target.interfaces[0].occupiedBy===operation.dockOperation.id);
check('first approach spends one recorded reserve increment',actor.resources.rendezvousDv===startReserve-ORBIT_RENDEZVOUS_ATTEMPT_DV&&operation.payload.rendezvousDvSpent===ORBIT_RENDEZVOUS_ATTEMPT_DV);
check('stationkeeping state passes lifecycle audit',auditLifecycleState().length===0);
check('Fleet Registry exposes the persistent operation console',assetRegistryGroups().find(group=>group.key==='orbit-assets').items.some(item=>item.id===actor.id&&item.action?.label==='Manage orbital craft'));
check('operation console renders stationkeeping controls without throwing',(()=>{ try{ showOrbitAssetOperations(actor.id); return true; }catch(e){ return false; } })());

const savedStationkeeping=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
applyLoadedSave(savedStationkeeping);
const loadedOp=orbitOperationById(operation.id), loadedActor=orbitAssetById(actor.id), loadedTarget=orbitAssetById(target.id);
check('stationkeeping and exact reservations survive save/load',loadedOp.phase==='stationkeeping'&&loadedActor.reservation.operationId===loadedOp.dockOperation.id&&auditLifecycleState().length===0);

const waved=waveOffOrbitOperation(loadedOp.id,'d4-wave-1');
check('wave-off frees both exact ports',waved.ok&&loadedActor.status==='free'&&loadedTarget.status==='free'&&loadedActor.interfaces.every(port=>port.occupiedBy===null)&&loadedTarget.interfaces.every(port=>port.occupiedBy===null));
const beforeRetry=loadedActor.resources.rendezvousDv, retried=retryOrbitOperation(loadedOp.id,'d4-retry-1');
check('retry re-establishes stationkeeping and spends reserve once',retried.ok&&loadedOp.phase==='stationkeeping'&&loadedActor.resources.rendezvousDv===beforeRetry-ORBIT_RENDEZVOUS_ATTEMPT_DV);
const retryReplay=retryOrbitOperation(loadedOp.id,'d4-retry-1');
check('replayed retry cannot spend reserve twice',retryReplay.ok&&retryReplay.replay&&loadedActor.resources.rendezvousDv===beforeRetry-ORBIT_RENDEZVOUS_ATTEMPT_DV);

const soft=softCaptureOrbitOperation(loadedOp.id,'d4-soft-1');
check('soft capture creates reciprocal links without a hard dock',soft.ok&&loadedActor.status==='soft-captured'&&loadedTarget.status==='soft-captured'&&loadedActor.dockedTo===loadedTarget.id);
check('soft capture does not invent a service transfer',!orbitOperationList().some(item=>item.kind==='transfer')&&loadedActor.cargo&&loadedTarget.cargo);
const directRetry=retryOrbitOperation(loadedOp.id,'d4-retry-2');
check('soft capture can retreat directly to a fresh stationkeeping attempt',directRetry.ok&&loadedOp.phase==='stationkeeping'&&loadedActor.status==='reserved'&&loadedTarget.status==='reserved');
softCaptureOrbitOperation(loadedOp.id,'d4-soft-2');
const hard=hardDockOrbitOperation(loadedOp.id,'d4-hard-1');
check('hard dock promotes the same exact reciprocal link',hard.ok&&loadedOp.phase==='hard_dock'&&loadedActor.status==='docked'&&loadedTarget.status==='docked'&&auditLifecycleState().length===0);

const undocked=undockOrbitAssets(loadedActor.id,'d4-undock-1');
check('undock frees only the linked ports and records its source',undocked.ok&&loadedActor.status==='free'&&loadedTarget.status==='free'&&undocked.operation.sourceOperationId===loadedOp.dockOperation.id&&auditLifecycleState().length===0);
const undockReplay=undockOrbitAssets(loadedActor.id,'d4-undock-1');
check('undock request replays after the physical link is gone',undockReplay.ok&&undockReplay.replay);

const beforeMove=loadedActor.resources.rendezvousDv, moved=relocateOrbitAsset(loadedActor.id,{band:'high',inclination:28.5},'d4-move-1');
check('relocation moves the canonical asset and charges the quoted reserve',moved.ok&&loadedActor.orbit.band==='high'&&loadedActor.resources.rendezvousDv===beforeMove-moved.cost&&moved.operation.phase==='relocated');
const returnResult=returnOrbitAsset(loadedActor.id,'d4-return-1');
check('capsule return removes the orbit owner and recovers its exact hull',returnResult.ok&&!orbitAssetById(loadedActor.id)&&returnResult.hull.status==='recovered');
check('return request replays after the physical asset is gone',returnOrbitAsset(loadedActor.id,'d4-return-1').replay===true);
check('post-return lifecycle remains consistent',auditLifecycleState().length===0);

// Arrival/order independence: two pairs may progress in either order without sharing ports or receipts.
const a1=deploy('pod'), t1=deploy('target'), a2=deploy('pod'), t2=deploy('target');
const op1=planOrbitDockingOperation(a1.id,t1.id,'d4-order-1').operation, op2=planOrbitDockingOperation(a2.id,t2.id,'d4-order-2').operation;
hardDockOrbitOperation(op2.id,'d4-order-hard-2'); hardDockOrbitOperation(op1.id,'d4-order-hard-1');
check('independent arrivals settle in reverse order without cross-linking',a1.dockedTo===t1.id&&a2.dockedTo===t2.id&&op1.dockOperation.id!==op2.dockOperation.id&&auditLifecycleState().length===0);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
