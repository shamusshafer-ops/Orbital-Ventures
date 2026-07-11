// #73 Slice 2 (2026-07-11): Moon/Mars module delivery is a real profile-based cargo cruise — the user
// chose mechanical consistency (real Δv legs, like every authored Moon/Mars mission) over a cheap
// simple-mission reskin. New reusable mechanic: m.cargo (uncrewed payload carried through every leg of
// a .profile mission — lvPayload()'s profile branch + simulateMission()'s stackMass()). Lunar deliveries
// (days:8) resolve synchronously like LEO (Slice 1); Mars deliveries (days:210) cross
// DEFER_CRUISE_DAYS(60) and ride the EXISTING deferred-flight machinery (state.activeFlights,
// pumpFlightArrivals) completely unchanged.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function foundFacility(id, mods){
  newGame('engineer');
  state.money=1000;
  state.facilities[id]={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, moduleList:mods||['can_std']};
}

// ---------- pricing: fly-yourself strips the body multiplier, contract keeps it ----------
foundFacility('mars_base');
{
  const def=facilityById('mars_base'), fs=facilityState('mars_base'), md=stationModuleDef('lab_mod');
  const bodyMult=facilityBodyMult(def);
  check('sanity: Mars really has a body multiplier > 1 (otherwise this test proves nothing)', bodyMult>1);
  const fly=flyModuleCost(def,fs,md), full=stationModuleCost(def,fs,md);
  check('flyModuleCost: strictly cheaper than the body-multiplier-inclusive price at Mars', fly<full);
  check('flyModuleCost: exactly the multiplier-free formula', fly===round2(md.cost*(1+0.25*(facilityModuleList(fs).length-1))));
  check('canFlyModuleDelivery: quotes the multiplier-free price', canFlyModuleDelivery('mars_base','lab_mod').cost===fly);
  check('canContractStationModule: still the full body-multiplier-inclusive price + premium (unchanged)', canContractStationModule('mars_base','lab_mod').cost===contractedModuleCost(def,fs,md));
}

// ---------- offer generation: Moon (synchronous — under DEFER_CRUISE_DAYS) ----------
foundFacility('lunar_base');
flyModuleDelivery('lunar_base','lab_mod');
{
  const o=state.contractOffers[0];
  check('Moon offer: proc:true, deliverModule tagged', o.proc===true && o.deliverModule.facId==='lunar_base' && o.deliverModule.modId==='lab_mod');
  check('Moon offer: days stays under DEFER_CRUISE_DAYS (resolves same-turn)', o.days<DEFER_CRUISE_DAYS);
  check('Moon offer: is profile-shaped, not a simple reqDv mission', Array.isArray(o.profile) && o.reqDv===undefined);
  check('Moon offer: one-way — no Trans-Earth/return leg', !o.profile.some(l=>/Earth/i.test(l.name)));
  check('Moon offer: cargo is the real module mass', o.cargo===stationModuleDef('lab_mod').stats.mass);
  check('Moon offer: crew:0 (uncrewed cargo run)', o.crew===0);
  check('Moon offer: auto-selected as the active mission', state.activeMission===o.id);
}

// ---------- offer generation: Mars (deferred — over DEFER_CRUISE_DAYS) ----------
foundFacility('mars_base');
flyModuleDelivery('mars_base','power_truss');
{
  const o=state.contractOffers[0];
  check('Mars offer: days crosses DEFER_CRUISE_DAYS (will defer)', o.days>=DEFER_CRUISE_DAYS);
  check('Mars offer: is profile-shaped, one-way', Array.isArray(o.profile) && !o.profile.some(l=>/Earth/i.test(l.name)));
  check('Mars offer: cargo is the real module mass', o.cargo===stationModuleDef('power_truss').stats.mass);
  check('Mars offer: days matches LOGI_TRANSIT_DAYS.mars (consistent with the abstracted resupply system)', o.days===LOGI_TRANSIT_DAYS.mars);
}

// ---------- cargo mechanic: lvPayload and simulateMission both feel the extra mass ----------
{
  const noCargo={ crew:0, days:8, modules:['lv','transfer'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'},{name:'Lunar Orbit Insertion', dv:900, by:'transfer'}] };
  const withCargo=Object.assign({}, noCargo, {cargo:20});
  newGame('engineer');
  check('lvPayload: a cargo mission lofts strictly more than the same mission without cargo', lvPayload(withCargo) > lvPayload(noCargo));
  check('lvPayload: the delta is exactly the cargo mass', Math.abs((lvPayload(withCargo)-lvPayload(noCargo)) - 20) < 1e-9);
  const simNo=simulateMission(noCargo), simYes=simulateMission(withCargo);
  const lvLegNo=simNo.legs.find(l=>l.by==='lv'), lvLegYes=simYes.legs.find(l=>l.by==='lv');
  check('simulateMission: the LV leg lifts more mass with cargo aboard', lvLegYes.mass>lvLegNo.mass);
  // every in-space leg (not just the LV leg) also carries the extra mass through stackMass()
  const transferLegNo=simNo.legs.find(l=>l.by==='transfer'), transferLegYes=simYes.legs.find(l=>l.by==='transfer');
  check('simulateMission: an in-space transfer leg ALSO carries the cargo (not just the LV liftoff)', transferLegYes.mass>transferLegNo.mass);
}

// ---------- proceedLaunch: the defer/no-defer split is purely days-driven, no special-casing needed ----------
{
  newGame('engineer'); animEnabled=false;
  foundFacility('mars_base'); state.money=1000;
  const marsOffer={ id:'md_test_mars', proc:true, deliverModule:{facId:'mars_base',modId:'power_truss'}, moduleCost:5,
    name:'Deliver Power Truss — Mars Base', crew:0, days:210, minRep:0, payout:0, rep:0,
    modules:['lv','transfer'], cargo:5, profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Mars Injection',dv:3600,by:'transfer'},{name:'Mars Orbit Insertion',dv:1400,by:'transfer'}] };
  const v=computeVehicle(), sim=simulateMission(marsOffer);
  let threw=false;
  try{ proceedLaunch(marsOffer, v, sim, 1, 0, true); }catch(e){ threw=true; console.log('Mars proceedLaunch threw:', e.stack); }
  check('Mars delivery: proceedLaunch does not throw', !threw);
  check('Mars delivery: a deferred flight was registered (days ≥ DEFER_CRUISE_DAYS)',
    (state.activeFlights||[]).some(f=>f&&f.deferred&&f.mission===marsOffer.id));

  newGame('engineer'); animEnabled=false;
  foundFacility('lunar_base'); state.money=1000;
  const moonOffer={ id:'md_test_moon', proc:true, deliverModule:{facId:'lunar_base',modId:'lab_mod'}, moduleCost:5,
    name:'Deliver Lab — Lunar Base', crew:0, days:8, minRep:0, payout:0, rep:0,
    modules:['lv','transfer'], cargo:5, profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Lunar Injection',dv:3120,by:'transfer'},{name:'Lunar Orbit Insertion',dv:900,by:'transfer'}] };
  const v2=computeVehicle(), sim2=simulateMission(moonOffer);
  let threw2=false;
  try{ proceedLaunch(moonOffer, v2, sim2, 1, 0, true); }catch(e){ threw2=true; console.log('Moon proceedLaunch threw:', e.stack); }
  check('Moon delivery: proceedLaunch does not throw', !threw2);
  check('Moon delivery: NOT deferred (days < DEFER_CRUISE_DAYS) — resolved same-turn',
    !(state.activeFlights||[]).some(f=>f&&f.deferred&&f.mission===moonOffer.id));
}

// ---------- end-to-end: a deferred Mars delivery docks the module on arrival, via the REAL production path ----------
{
  newGame('engineer'); animEnabled=false; _flightResolving=false;
  foundFacility('mars_base'); state.money=1000;
  const listBefore=facilityModuleList(facilityState('mars_base')).length;
  const m={ id:'md_e2e_mars', proc:true, deliverModule:{facId:'mars_base',modId:'power_truss'}, moduleCost:7,
    name:'Deliver Power Truss — Mars Base', crew:0, days:210, minRep:0, payout:0, rep:0,
    modules:['lv','transfer'], cargo:5, profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Mars Injection',dv:3600,by:'transfer'},{name:'Mars Orbit Insertion',dv:1400,by:'transfer'}] };
  (state.contractOffers=state.contractOffers||[]).push(m);
  const launchAbs=absDay();
  const rec={ id:'flt_e2e_mars', mission:m.id, name:m.name, launchAbs, arriveAbs:launchAbs+m.days, phase:'cruise', crew:0,
    deferred:true, ctx:{m, v:computeVehicle(), sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:false,
      outcome:{kind:'success', rel:0.9, story:'', failPhase:null}, rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}} };
  (state.activeFlights=state.activeFlights||[]).push(rec);
  for(let i=0;i<8;i++) advance(1); // advance() is in MONTHS — 8 covers the 210-day cruise; may pump the arrival along the way
  pumpFlightArrivals(); // idempotent if advance() already resolved it
  check('Mars e2e: the deferred flight record is gone (resolved)', !(state.activeFlights||[]).some(f=>f&&f.id==='flt_e2e_mars'));
  check('Mars e2e: the module actually docked', facilityModuleList(facilityState('mars_base')).includes('power_truss'));
  check('Mars e2e: facility module count grew by exactly 1', facilityModuleList(facilityState('mars_base')).length===listBefore+1);
  check('Mars e2e: the offer was consumed (one-shot)', !(state.contractOffers||[]).find(o=>o.id===m.id));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
