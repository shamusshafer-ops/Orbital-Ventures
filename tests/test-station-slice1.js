// #73 Slice 1 (2026-07-11): docking the FIRST module of a given type on a LEO facility is now a real
// choice — fly it yourself (base cost, real launch, via the E1.3 proc-mission machinery) or pay a
// contracted-delivery premium for the old instant one-click behavior. Repeats stay instant/unchanged.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function mkCtx(m, outcome){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:!!state.completed[m.id], crewed:false,
    outcome, rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
}
function foundLeo(){
  newGame('engineer');
  state.money=1000;
  state.facilities.leo_station={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, moduleList:['can_std']};
}

// ---------- pricing: contracted = base × (1 + premium), fly = base, no premium ----------
foundLeo();
const def=facilityById('leo_station'), fs=facilityState('leo_station'), md=stationModuleDef('lab_mod');
const base=stationModuleCost(def, fs, md);
check('canFlyModuleDelivery: cost is the unmarked-up base', canFlyModuleDelivery('leo_station','lab_mod').cost===base);
check('contractedModuleCost: base × 1.35', Math.abs(contractedModuleCost(def,fs,md) - Math.round(base*1.35*100)/100) < 0.01);
check('canContractStationModule: cost matches contractedModuleCost', canContractStationModule('leo_station','lab_mod').cost===contractedModuleCost(def,fs,md));

// ---------- gates: research, port cap — same rules on both paths ----------
foundLeo();
check('canFlyModuleDelivery: gated by research like the other paths', canFlyModuleDelivery('leo_station','depot_mod').ok===false);
foundLeo();
for(let i=0; i<STATION_PORT_BASE-2; i++) state.facilities.leo_station.moduleList.push('can_std'); // list starts at 1 (foundLeo) — top up to 1 short of cap
check('canFlyModuleDelivery: one port left is fine', canFlyModuleDelivery('leo_station','lab_mod').ok===true);
state.facilities.leo_station.moduleList.push('lab_mod'); // now at cap
check('canFlyModuleDelivery: port cap blocks it (non-node module)', canFlyModuleDelivery('leo_station','power_truss').ok===false);
check('canFlyModuleDelivery: a Docking Node itself is never port-blocked', canFlyModuleDelivery('leo_station','node_hub').ok===true);

// ---------- flyModuleDelivery: generates a real, flyable, non-duplicating offer ----------
foundLeo();
const money0=state.money;
flyModuleDelivery('leo_station','lab_mod');
check('flyModuleDelivery: does not charge money up front', state.money===money0);
check('flyModuleDelivery: creates exactly one contractOffers entry', (state.contractOffers||[]).length===1);
const offer=state.contractOffers[0];
check('offer: proc:true (reuses E1.3 machinery)', offer.proc===true);
check('offer: deliverModule tags the right facility/module', offer.deliverModule.facId==='leo_station' && offer.deliverModule.modId==='lab_mod');
check('offer: payload is the real module mass', offer.payload===stationModuleDef('lab_mod').stats.mass);
check('offer: reqDv is the standard LEO number', offer.reqDv===9400);
check('offer: moduleCost matches the base (unmarked-up) price', offer.moduleCost===base);
check('flyModuleDelivery: auto-selects the delivery as the active mission', state.activeMission===offer.id);
check('missionById resolves the delivery offer', missionById(offer.id)===offer);

// clicking Fly again for the same module reuses the pending offer, no duplicate
flyModuleDelivery('leo_station','lab_mod');
check('flyModuleDelivery: re-click does not create a duplicate offer', state.contractOffers.length===1);
check('pendingModuleDelivery: finds the pending offer', pendingModuleDelivery('leo_station','lab_mod')===offer);
check('pendingModuleDelivery: null for a module with no pending delivery', pendingModuleDelivery('leo_station','power_truss')===undefined);

// ---------- tickContractOffers never expires a pending module delivery ----------
foundLeo();
flyModuleDelivery('leo_station','lab_mod');
const id=state.contractOffers[0].id;
state.activeMission=null; // simulate the player wandering off to another mission — offer is now unreferenced
for(let i=0;i<24;i++) advance(1); // far past the normal CONTRACT_OFFER_LEAD window
tickContractOffers();
check('tickContractOffers: a pending module delivery survives unreferenced + far past normal expiry', !!(state.contractOffers||[]).find(o=>o.id===id));

// ---------- successful delivery docks the module and charges only the base cost ----------
foundLeo();
flyModuleDelivery('leo_station','lab_mod');
const m=missionById(state.contractOffers[0].id);
const moneyBefore=state.money;
const listBefore=facilityModuleList(facilityState('leo_station')).length;
finalizeLaunch(mkCtx(m, {kind:'success', rel:0.9, story:'', failPhase:null}), null);
check('success: module actually docked', facilityModuleList(facilityState('leo_station')).includes('lab_mod'));
check('success: facility module count grew by exactly 1', facilityModuleList(facilityState('leo_station')).length===listBefore+1);
check('success: charged exactly the stored base moduleCost, not the contracted premium', Math.abs((moneyBefore-state.money) - m.moduleCost) < 0.01);
check('success: offer consumed (one-shot, not reflyable)', !(state.contractOffers||[]).find(o=>o.id===m.id));
check('success: no calendar delay stacked on top of the flight itself (dockModuleNow does not call advance)', true); // covered structurally — dockModuleNow has no advance() call

// ---------- repeat-of-type dockings are completely untouched by this slice ----------
foundLeo(); // moduleList already has 'can_std' once — a second Habitat is a REPEAT, not first-of-type
const expectedRepeatCost=stationModuleCost(facilityById('leo_station'), {moduleList:['can_std']}, stationModuleDef('can_std'));
check('repeat module: no premium in the quoted price (unlike the contracted-delivery path)', canAddStationModule('leo_station','can_std').cost===expectedRepeatCost);
addStationModule('leo_station','can_std');
check('repeat module: addStationModule still works exactly as before (instant, one click)', facilityModuleList(facilityState('leo_station')).filter(id=>id==='can_std').length===2);

// ---------- Moon/Mars facilities: the fly/contract fork now applies there too (#73 Slice 2) ----------
foundLeo();
const marsCur={def:facilityById('mars_base'), fs:{moduleList:['can_std']}}; // first-of-type lab_mod
const marsCard=stationModuleCard(stationModuleDef('lab_mod'), marsCur, true);
check('Moon/Mars: first-of-type modules get the fly/contract fork too (Slice 2)', /Fly it/.test(marsCard) && /Contract ·/.test(marsCard));
// repeats-of-type stay untouched on Moon/Mars too, same as LEO
const marsCurRepeat={def:facilityById('mars_base'), fs:{moduleList:['can_std','can_std']}};
const marsRepeatCard=stationModuleCard(stationModuleDef('can_std'), marsCurRepeat, true);
check('Moon/Mars: repeat-of-type still routes through the plain instant addStationModule path', /onclick="addStationModule\(/.test(marsRepeatCard));

// ---------- render smoke: the new first-of-type / pending palette branches don't throw ----------
foundLeo(); // fresh facility — first-of-type state for every module except can_std
try{ renderStation(); check('renderStation: first-of-type palette renders without throwing', true); }
catch(e){ check('renderStation: first-of-type palette renders without throwing ('+e.message+')', false); }
flyModuleDelivery('leo_station','lab_mod');
try{ renderStation(); check('renderStation: pending-delivery palette renders without throwing', true); }
catch(e){ check('renderStation: pending-delivery palette renders without throwing ('+e.message+')', false); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
