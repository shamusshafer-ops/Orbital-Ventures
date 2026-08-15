// Docking D3: persistent free-orbit ownership, station release, save and shared presentation collectors.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function launchedHull(tag){ const hull=makeHull({recovery:false},tag||'orbit-test'); markHullLaunched(hull.id,tag||'orbit-test'); return hull; }
function flightCtx(m,hullId){
  return {m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,
    outcome:{kind:'success',rel:.99,story:'',failPhase:null},rehearsed:false,famId:null,hullId,crewId:null,
    docking:dockingMissionCapability(m,dockingBuildCapability(m)),ab:{rel:0,payoutMult:1}};
}

newGame('engineer'); state.money=1000;
const deployMission=flyOrbitAssetDeployment('target');
const frozen=dockingBuildCapability(deployMission);
check('deployment freezes one explicit target interface',frozen.actors.some(actor=>actor.id===`orbit-deploy:${deployMission.id}`&&actor.interfaces[0].id==='forward_port'));
const targetHull=launchedHull('deploy-target');
finalizeLaunch(flightCtx(deployMission,targetHull.id),null);
const target=orbitAssetList()[0];
check('successful deployment creates one canonical orbit asset',orbitAssetList().length===1&&orbitAssetErrors(target).length===0);
check('orbit asset owns exact physical hull',target.hullId===targetHull.id&&hullById(targetHull.id).status==='in-orbit');
check('asset remains free with a usable interface',target.status==='free'&&target.interfaces[0].occupiedBy===null);
check('lifecycle audit accepts the free-orbit owner',auditLifecycleState().length===0);

const registry=assetRegistryGroups().find(group=>group.key==='orbit-assets');
check('Fleet Registry uses the persistent asset collector',registry&&registry.items.some(item=>item.id===target.id&&/free/.test(item.status)));
check('Outliner exposes the exact persistent craft without inventing an ETA',outlinerItems().some(item=>item.kind==='orbit-asset'&&item.assetId===target.id&&item.etaText==='in orbit'));
const mapModel=mapAssetModel();
check('Solar Map model carries the same orbit asset identity',mapModel.earth.orbitAssets.some(asset=>asset.id===target.id));
check('3D overlay derives an orbital-craft badge from that model',map3dBodyOverlaySpec('earth',mapModel,[]).icons.some(icon=>icon.glyph==='◈'));

const persisted=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
applyLoadedSave(persisted);
check('free orbit asset and hull ownership survive save/load',orbitAssetById(target.id).hullId===targetHull.id&&auditLifecycleState().length===0);

// A D2 station-local visitor can become a D3 free asset without duplicating its hull.
newGame('engineer'); state.money=1000;
state.facilities.leo_station={built:true,modules:1,since:state.year,supply:6,starvedMonths:0,autoResupply:false,moduleList:['can_std']};
const visitMission=flyStationVisit('leo_station','resupply',true), visitorHull=launchedHull('station-release');
finalizeLaunch(flightCtx(visitMission,visitorHull.id),null);
const visitor=stationOps(facilityState('leo_station')).dockedVisitors[0];
check('station setup owns the hull before release',visitor&&hullById(visitorHull.id).status==='docked'&&orbitAssetList().length===0);
const released=releaseStationVisitorToOrbit('leo_station',visitor.operationId);
check('station release promotes visitor to a free orbit asset',released&&released.hullId===visitorHull.id&&released.status==='free');
check('release removes station owner and frees exact berth',stationOps(facilityState('leo_station')).dockedVisitors.length===0&&stationVisitBerthSummary('leo_station').open===1);
check('release preserves single hull ownership',hullById(visitorHull.id).status==='in-orbit'&&auditLifecycleState().length===0);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
