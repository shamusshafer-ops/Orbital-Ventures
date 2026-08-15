// Docking D2: hard-dock transfer, same-mission return, and remain-docked ownership.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function stationSetup(){
  newGame('engineer'); state.money=1000; state.research.crew_capsule=true;
  state.facilities.leo_station={built:true,modules:1,since:state.year,supply:6,starvedMonths:0,autoResupply:false,moduleList:['can_std'],
    crewManaged:true,maintenanceEnabled:true,crewIds:[],rotationDueAbs:absMonth()};
  return facilityState('leo_station');
}
function flightCtx(m,hullId,crewId){
  const docking=dockingMissionCapability(m,dockingBuildCapability(m));
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:m.crew>0,
    outcome:{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,hullId,crewId:crewId||null,docking,
    ab:{rel:0,payoutMult:1}};
}
function launchedHull(recovery){ const h=makeHull({recovery:!!recovery},'test'); markHullLaunched(h.id,'station_visit'); return h; }

// Crew exchange happens only at hard dock and the capsule returns in the same mission.
let fs=stationSetup();
hirePersonnel('a01'); hirePersonnel('a02');
stationOps(fs).crewIds=['a01'];
const crewMission=flyStationVisit('leo_station','crew_rotation',false), crewHull=launchedHull(true);
finalizeLaunch(flightCtx(crewMission,crewHull.id,'a02'),null);
check('crew transfer puts incoming astronaut aboard',stationCrewIds(fs).includes('a02'));
check('crew transfer relieves outgoing astronaut',!stationCrewIds(fs).includes('a01'));
check('same-mission return releases visiting berth',stationVisitBerthSummary('leo_station').open===1&&stationOps(fs).dockedVisitors.length===0);
check('returning recoverable capsule becomes recovered hull',hullById(crewHull.id).status==='recovered');

// A crew capsule may instead remain, with the relieved astronaut in the docked craft.
fs=stationSetup(); hirePersonnel('a01'); hirePersonnel('a02'); stationOps(fs).crewIds=['a01'];
const remainCrewMission=flyStationVisit('leo_station','crew_rotation',true), remainCrewHull=launchedHull(true);
finalizeLaunch(flightCtx(remainCrewMission,remainCrewHull.id,'a02'),null);
const crewVisitor=stationOps(fs).dockedVisitors[0];
check('remain-docked crew visit persists a capsule visitor',crewVisitor.kind==='capsule'&&crewVisitor.crewId==='a01');
check('remain-docked capsule owns its hull and berth',hullById(remainCrewHull.id).status==='docked'&&stationVisitBerthSummary('leo_station').open===0);
assignAstronaut('a01');
check('astronaut in docked capsule cannot be double-assigned',state.assignedAstronaut!=='a01');

// A resupply pod can remain; its transfer receipt and hull/berth ownership persist exactly once.
fs=stationSetup();
const supplyBefore=facilitySupply('leo_station'), moneyBefore=state.money;
const podMission=flyStationVisit('leo_station','resupply',true), podHull=launchedHull(false), podCtx=flightCtx(podMission,podHull.id,null);
const expectedCost=podMission.stationVisit.transfer.cost;
finalizeLaunch(podCtx,null);
const visitors=stationOps(fs).dockedVisitors, visitor=visitors[0];
check('resupply transfer fills station provisions',facilitySupply('leo_station')>supplyBefore&&facilitySupply('leo_station')===FAC_SUPPLY_MONTHS);
check('resupply transfer charges frozen provisions cost',Math.abs((moneyBefore-state.money)-expectedCost)<.01);
check('remain creates one canonical visitor',visitors.length===1&&stationDockVisitorErrors(visitor).length===0);
check('visitor stores applied cargo transfer receipt',visitor.transfer.kind==='resupply'&&visitor.transfer.status==='applied'&&visitor.transfer.cargo.monthsShipped>0);
check('visitor owns exact berth and hull',facilityVisitingBerths('leo_station')[0].interface.occupiedBy===visitor.operationId&&visitor.hullId===podHull.id&&hullById(podHull.id).status==='docked');
check('Fleet Registry keeps the docked physical hull visible',assetRegistryGroups().find(g=>g.key==='hulls').items.some(item=>item.id===podHull.id&&item.status==='docked at station'));
check('docked visitor consumes no permanent module capacity',facilityModuleList(fs).length===1&&facilityPortCap(fs,facilityById('leo_station'))===STATION_PORT_BASE);
check('occupied single berth blocks a second visit',!reserveStationVisit('leo_station','blocked','Second visit').ok);
check('lifecycle audit accepts one durable station owner',auditLifecycleState().length===0);
const supplyAfter=facilitySupply('leo_station'), moneyAfter=state.money;
settleStationVisit(podMission,podCtx);
check('replaying remain settlement is idempotent',stationOps(fs).dockedVisitors.length===1&&facilitySupply('leo_station')===supplyAfter&&state.money===moneyAfter);
const persisted=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
applyLoadedSave(persisted);
const loadedVisitor=stationOps(facilityState('leo_station')).dockedVisitors[0];
check('remain-docked visitor round-trips through save/load',loadedVisitor.operationId===visitor.operationId&&hullById(podHull.id).status==='docked'&&auditLifecycleState().length===0);

// A failed approach releases its reservation and performs no transfer.
fs=stationSetup();
const failed=flyStationVisit('leo_station','resupply',false), failedSupply=facilitySupply('leo_station');
failStationVisit(failed);
check('failed station visit releases berth',stationVisitBerthSummary('leo_station').open===1);
check('failed station visit does not move cargo',facilitySupply('leo_station')===failedSupply);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
