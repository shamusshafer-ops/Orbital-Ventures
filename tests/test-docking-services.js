// Docking D4: exactly-once crew/cargo/propellant transfer and generic servicing hooks.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function launchedHull(tag){ const hull=makeHull({recovery:false},tag); markHullLaunched(hull.id,tag); return hull; }
function flightCtx(m,hullId){
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,
    outcome:{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,hullId,crewId:null,
    docking:dockingMissionCapability(m,dockingBuildCapability(m)),ab:{rel:0,payoutMult:1}};
}
function deploy(kind){ const mission=flyOrbitAssetDeployment(kind), hull=launchedHull('svc-'+kind); finalizeLaunch(flightCtx(mission,hull.id),null); return orbitAssetList().find(asset=>asset.hullId===hull.id); }
function dock(actor,target,tag){ const op=planOrbitDockingOperation(actor.id,target.id,tag).operation; hardDockOrbitOperation(op.id,tag+'-hard'); return op; }

newGame('engineer'); state.money=1000; state.research.crew_capsule=true;
const cargoSource=deploy('pod'), cargoTarget=deploy('pod'); cargoSource.cargo.supplies=6;
dock(cargoSource,cargoTarget,'svc-cargo-dock');
const cargo=transferOrbitCargo(cargoSource.id,cargoTarget.id,'supplies',2,'svc-cargo-1');
check('defined cargo transfers across a hard-docked cargo service',cargo.ok&&cargoSource.cargo.supplies===4&&cargoTarget.cargo.supplies===2);
const cargoReplay=transferOrbitCargo(cargoSource.id,cargoTarget.id,'supplies',2,'svc-cargo-1');
check('cargo request replay cannot transfer twice',cargoReplay.replay&&cargoSource.cargo.supplies===4&&cargoTarget.cargo.supplies===2);

state.depot=10;
const refueled=refuelOrbitAssetFromDepot(cargoSource.id,3,'svc-depot-1');
check('depot refuel transfers exact persisted propellant',refueled.ok&&state.depot===7&&cargoSource.resources.fuel===3&&refueled.operation.phase==='refueled');
const fuel=transferOrbitPropellant(cargoSource.id,cargoTarget.id,1.5,'svc-fuel-1');
check('docked propellant cross-feed uses the shared fuel service',fuel.ok&&cargoSource.resources.fuel===1.5&&cargoTarget.resources.fuel===1.5);
check('depot replay cannot debit twice',refuelOrbitAssetFromDepot(cargoSource.id,3,'svc-depot-1').replay&&state.depot===7);

const capsule=deploy('capsule'), crewTarget=deploy('capsule'); capsule.crewId='a01';
dock(capsule,crewTarget,'svc-crew-dock');
const crew=transferOrbitCrew(capsule.id,crewTarget.id,'a01','svc-crew-1');
check('named crew moves between linked capsules exactly once',crew.ok&&capsule.crewId===null&&crewTarget.crewId==='a01');
check('crew replay retains one owner',transferOrbitCrew(capsule.id,crewTarget.id,'a01','svc-crew-1').replay&&crewTarget.crewId==='a01');
crewTarget.resources.power=20;
const serviced=serviceOrbitAsset(crewTarget.id,'power','svc-power-1');
check('generic service hook records and applies a power service',serviced.ok&&crewTarget.resources.power===100&&serviced.operation.kind==='service');

// Station-local visitor crew transfer uses the same durable operation ledger.
state.staff.push({id:'a02',morale:70,lowMoraleMonths:0,commendCooldown:0,xp:0,birthYear:1930});
state.facilities.leo_station={built:true,modules:1,since:state.year,supply:6,starvedMonths:0,autoResupply:false,moduleList:['can_std']};
const fs=facilityState('leo_station'), ops=stationOps(fs), berth=facilityVisitingBerths('leo_station')[0], stationHull=launchedHull('svc-station');
stationHull.status='docked'; berth.interface.occupiedBy='station-visitor-op';
const visitorDock=makeDockOperation({id:'station-visitor-op',missionId:'svc-station-visit',purpose:'Crew transfer',status:'hard_dock',actorId:'station-capsule',actorPortId:'approach_port',targetId:'facility:leo_station',targetPortId:berth.interface.id,services:['crew','cargo','power','data'],reliability:1,source:'station_visit'});
ops.dockedVisitors.push(makeStationDockVisitor({id:'visitor:station-visitor-op',operationId:'station-visitor-op',missionId:'svc-station-visit',facilityId:'leo_station',berthId:berth.id,hullId:stationHull.id,kind:'capsule',
  actor:makeDockActor({id:'station-capsule',label:'Station capsule',interfaces:[orbitAssetPort('capsule','approach_port')]}),target:makeDockActor({id:'facility:leo_station',label:'LEO Station',interfaces:[berth.interface]}),services:visitorDock.services,arrivedAbs:absDay(),crewId:null}));
ops.crewManaged=true; ops.crewIds=['a02'];
const toCraft=transferStationVisitorCrew('leo_station','station-visitor-op','to-craft','a02','svc-station-out');
check('station crew can transfer into its exact docked visitor',toCraft.ok&&ops.crewIds.length===0&&ops.dockedVisitors[0].crewId==='a02');
const toStation=transferStationVisitorCrew('leo_station','station-visitor-op','to-station','a02','svc-station-in');
check('visitor crew can transfer back into an open station berth',toStation.ok&&ops.crewIds[0]==='a02'&&ops.dockedVisitors[0].crewId===null);
check('station visitor operation console renders without throwing',(()=>{ try{ showStationVisitorOperations('leo_station'); return true; }catch(e){ return false; } })());

const persisted=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:2,state}));
applyLoadedSave(persisted);
check('service receipts and exact resource state survive save/load',orbitOperationByRequest('svc-fuel-1').phase==='transferred'&&orbitAssetById(cargoTarget.id).resources.fuel===1.5&&state.depot===7);
check('all transfer owners remain lifecycle-consistent',auditLifecycleState().length===0);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
