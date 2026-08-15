// Docking D2: exact station visiting berths and launch-frozen station targets.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function station(mods){
  newGame('engineer'); state.money=1000;
  state.facilities.leo_station={built:true,modules:mods.length,since:state.year,supply:6,starvedMonths:0,autoResupply:false,moduleList:mods.slice()};
  return facilityState('leo_station');
}

// Core and Node capacity are separate from permanent growth ports.
let fs=station(['can_std']);
check('core Habitat supplies one visiting berth',facilityVisitingBerthCount(fs)===1&&facilityVisitingBerths('leo_station').length===1);
check('visiting capacity does not alter permanent port cap',facilityPortCap(fs,facilityById('leo_station'))===STATION_PORT_BASE);
fs.moduleList.push('node_hub');
check('Docking Node adds two visiting berths',facilityVisitingBerthCount(fs)===3&&facilityVisitingBerths('leo_station').length===3);
check('Docking Node retains its three permanent growth ports',facilityPortCap(fs,facilityById('leo_station'))===STATION_PORT_BASE+3);

// One exact reservation owns one exact target interface.
fs=station(['can_std']);
const reserved=reserveStationVisit('leo_station','visit_a','Cargo visit');
check('reservation succeeds and owns the berth',reserved.ok&&reserved.berth.interface.occupiedBy==='visit_a:station-visit');
check('reservation record is canonical',stationDockReservationErrors(reserved.reservation).length===0);
check('the only berth rejects another visit',!reserveStationVisit('leo_station','visit_b','Second visit').ok);
check('summary separates reservation from visitor occupancy',JSON.stringify(stationVisitBerthSummary('leo_station'))===JSON.stringify({total:1,occupied:1,reserved:1,visitors:0,open:0}));
releaseStationVisitReservation('leo_station','visit_a:station-visit');
check('release opens the exact berth',stationVisitBerthSummary('leo_station').open===1&&stationOps(fs).dockReservations.length===0);

// Player-created resupply mission freezes explicit pod + facility interfaces.
fs=station(['can_std']);
const resupply=flyStationVisit('leo_station','resupply',false);
const build=dockingBuildCapability(resupply), cap=dockingMissionCapability(resupply,build);
check('resupply mission targets exact station/berth',resupply.stationVisit.facilityId==='leo_station'&&resupply.stationVisit.berthId==='leo_station:visit:1');
check('build carries an explicit cargo pod, not a generic probe',build.actors.some(a=>a.id===`station-visitor:${resupply.id}`&&a.label==='Cargo pod'));
check('build carries the exact station target actor',build.actors.some(a=>a.id==='facility:leo_station'&&a.interfaces[0].id==='leo_station:visit:1:port'));
check('mission reserves one real station operation',cap.rejections.length===0&&cap.operations.length===1&&cap.operations[0].source==='station_visit'&&cap.operations[0].status==='reserved');
check('frozen presentation names actor and station',cap.presentation[0].actor.label==='Cargo pod'&&cap.presentation[0].target.label==='LEO Station');
cancelStationVisitMission(resupply.id);
check('cancelling pending visit consumes offer and releases berth',!missionById(resupply.id)&&stationVisitBerthSummary('leo_station').open===1);

// Live target state is rechecked; a stale frozen target cannot launch through an unavailable berth.
fs=station(['can_std']);
const stale=flyStationVisit('leo_station','resupply',false), frozen=dockingBuildCapability(stale);
facilityVisitingBerths('leo_station')[0].interface.occupiedBy='another-operation';
const rejected=dockingMissionCapability(stale,frozen);
check('live berth conflict rejects stale frozen plan',rejected.operations.length===0&&rejected.rejections[0].reasons.includes('berth-unavailable'));

// Surface facilities remain cargo destinations, never orbital docking targets.
newGame('engineer'); state.money=1000;
state.facilities.lunar_base={built:true,modules:1,since:state.year,supply:FAC_SUPPLY_MONTHS,starvedMonths:0,autoResupply:false,moduleList:['can_std']};
check('surface base exposes no visiting docking berths',facilityVisitingBerths('lunar_base').length===0);
flyModuleDelivery('lunar_base','lab_mod');
const surfaceMission=missionById(state.activeMission);
check('surface module mission has no stationVisit docking claim',surfaceMission.deliverModule.facId==='lunar_base'&&!surfaceMission.stationVisit);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
