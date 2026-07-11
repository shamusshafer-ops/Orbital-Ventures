// #73 Slice 3 (2026-07-11): "Docking as spectacle" — a successful "fly it yourself" module delivery now
// ends its flight overlay with a rendezvous + soft-dock beat (drawDockCard), the terminal phase after the
// ascent + orbit/cislunar cruise, in place of the generic post-flight card. Presentational only — the
// module already docked in state (dockModuleNow, at resolution); docking is NOT a separate success/fail
// roll (a resolved-success delivery simply docks, mirroring Slice 2). One abstraction across LEO/Moon/Mars
// (backdrop tinted per body). Regular missions are untouched. This drives the REAL animLoop/drawScene
// machinery on a controlled virtual clock (same pattern as test-decision-panel.js) so it's a genuine
// render-path check, not just unit-testing the spec builder.
animEnabled=true;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function foundFacility(id, mods){
  newGame('engineer'); animEnabled=true;
  state.money=1000;
  state.facilities[id]={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, moduleList:mods||['can_std']};
}
// Run the flight overlay forward on a virtual clock until it holds (or bails via maxFrames). Records
// whether the 'dock' phase was ever entered along the way, so we prove the beat actually rendered mid-flight
// rather than only inferring it from the final held frame.
function pumpFlight(sawDock, maxFrames){
  maxFrames=maxFrames||9000;
  let virtualNow=performance.now();
  const realNow=performance.now;
  if(animState) animState.prevWall=virtualNow;
  performance.now=()=>virtualNow;
  let frames=0;
  try{
    while(animState && !animState.held && frames<maxFrames){
      virtualNow+=80; animLoop(); frames++;
      if(animState && animState.phase==='dock') sawDock.hit=true;
    }
  } finally { performance.now=realNow; }
  return frames;
}
// A ctx exactly like the one proceedLaunch/beginResolve hand to finalizeLaunch, for a resolved-success
// flight. Calling finalizeLaunch directly (animEnabled=true) opens the overlay and plays it to completion —
// the same path both a synchronous LEO/Moon delivery AND a deferred Mars delivery resolving on arrival take.
function deliverCtx(m){
  return {m, v:computeVehicle(), sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:false,
    outcome:{kind:'success', rel:0.95, story:'', failPhase:null}, // no `phases` array ⇒ no live/reserve-call flag fires, so it resolves straight through
    rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
}
function resetOverlay(){ animState=null; _flightResolving=false; _pendingLive=null; _pendingReserve=null; _pendingOps=null; _pendingRescue=null; }

// ---------- 1. LEO delivery (orbital): flight ends on the dock spectacle, module docks, spec tagged ----------
foundFacility('leo_station'); resetOverlay();
{
  const m={ id:'md_leo', proc:true, deliverModule:{facId:'leo_station',modId:'lab_mod'}, moduleCost:11,
    name:'Deliver Research Laboratory — LEO Station', crew:0, days:0, reqDv:9400, payload:16.5, minRep:0, payout:0, rep:0 };
  const listBefore=facilityModuleList(facilityState('leo_station')).length;
  finalizeLaunch(deliverCtx(m), null);
  check('LEO: overlay opened (animState exists)', animState!==null);
  check('LEO: spec.dock attached', !!(animState&&animState.spec.dock));
  check('LEO: dock carries the real facility name/body', animState.spec.dock.facName==='LEO Station' && animState.spec.dock.body==='earth');
  check('LEO: dock carries the real module name', animState.spec.dock.modName==='Research Laboratory');
  check('LEO: this flight is orbital (isOrbital, not cislunar)', animState.spec.isOrbital===true && !animState.spec.isCislunar);
  check('LEO: totalDur reserves the DOCK_CARD_MS tail (not the 1200ms post-flight settle)',
    animState.totalDur===animState.padDur+animState.ascentDur+animState.cruiseDur+animState.reentryDur+DOCK_CARD_MS);
  check('LEO: module actually docked in state (dockModuleNow ran at resolution)',
    facilityModuleList(facilityState('leo_station')).includes('lab_mod'));
  check('LEO: post-dock module count matches spec.dock.moduleCount', animState.spec.dock.moduleCount===listBefore+1);
  const saw={hit:false};
  pumpFlight(saw);
  check('LEO: the dock phase was entered during the flight (render smoke — drawDockCard drew without throwing)', saw.hit===true);
  check('LEO: the overlay holds on the dock card at the end (does not run away)', animState!==null && animState.held===true);
  check('LEO: held frame is the dock phase with a Continue affordance', animState.phase==='dock' && !!animState.continueBtn);
}

// ---------- 2. Moon delivery (cislunar): same terminal dock beat, tinted for the Moon ----------
foundFacility('lunar_base'); resetOverlay();
{
  const m={ id:'md_moon', proc:true, deliverModule:{facId:'lunar_base',modId:'power_truss'}, moduleCost:6,
    name:'Deliver Solar Power Truss — Lunar Base', crew:0, days:8, modules:['lv','transfer'], cargo:12, minRep:0, payout:0, rep:0,
    profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Lunar Injection',dv:3120,by:'transfer'},{name:'Lunar Orbit Insertion',dv:900,by:'transfer'}] };
  finalizeLaunch(deliverCtx(m), null);
  check('Moon: overlay opened', animState!==null);
  check('Moon: this flight is cislunar (profile mission)', animState.spec.isCislunar===true);
  check('Moon: spec.dock tinted for the Moon', animState.spec.dock && animState.spec.dock.body==='moon');
  check('Moon: module docked in state', facilityModuleList(facilityState('lunar_base')).includes('power_truss'));
  const saw={hit:false};
  pumpFlight(saw);
  check('Moon: dock phase entered (drawDockCard ran on the cislunar path without throwing)', saw.hit===true);
  check('Moon: holds on the dock card', animState!==null && animState.held===true && animState.phase==='dock');
}

// ---------- 3. Mars delivery: the deferred-arrival resolution takes the identical dock beat ----------
// A deferred Mars delivery resolves on arrival via pumpFlightArrivals()→beginResolve()→finalizeLaunch();
// that finalizeLaunch call (animEnabled) is exactly what we invoke here, so this exercises the on-arrival
// dock rendering for the interplanetary case with one shared abstraction (only the backdrop body differs).
foundFacility('mars_base'); resetOverlay();
{
  const m={ id:'md_mars', proc:true, deliverModule:{facId:'mars_base',modId:'greenhouse'}, moduleCost:10,
    name:'Deliver Greenhouse Module — Mars Base', crew:0, days:210, modules:['lv','transfer'], cargo:15, minRep:0, payout:0, rep:0,
    profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Mars Injection',dv:3600,by:'transfer'},{name:'Mars Orbit Insertion',dv:1400,by:'transfer'}] };
  finalizeLaunch(deliverCtx(m), null);
  check('Mars: spec.dock tinted for Mars', animState && animState.spec.dock && animState.spec.dock.body==='mars');
  check('Mars: module docked in state', facilityModuleList(facilityState('mars_base')).includes('greenhouse'));
  const saw={hit:false};
  pumpFlight(saw);
  check('Mars: dock phase entered and holds on the dock card', saw.hit===true && animState!==null && animState.held===true && animState.phase==='dock');
}

// ---------- 4. A regular (non-delivery) orbital flight is completely untouched — no dock beat ----------
resetOverlay(); newGame('engineer'); animEnabled=true;
{
  const m={ id:'plain_orbital', name:'Comsat to LEO', crew:0, days:0, reqDv:9400, payload:5, minRep:0, payout:20, rep:5 };
  finalizeLaunch(deliverCtx(m), null);
  check('regular flight: no spec.dock attached', animState!==null && !animState.spec.dock);
  check('regular flight: still orbital', animState.spec.isOrbital===true);
  check('regular flight: totalDur keeps the ordinary 1200ms post-flight settle (no DOCK_CARD_MS)',
    animState.totalDur===animState.padDur+animState.ascentDur+animState.cruiseDur+animState.reentryDur+1200);
  const saw={hit:false};
  pumpFlight(saw);
  check('regular flight: never enters a dock phase', saw.hit===false);
  check('regular flight: ends on the ordinary post-flight card (orbit phase), not a dock card',
    animState===null || (animState.held===true && animState.phase==='orbit'));
}

// ---------- 5. A FAILED delivery does not dock and gets no dock beat (docking rides on success only) ----------
foundFacility('leo_station'); resetOverlay();
{
  const listBefore=facilityModuleList(facilityState('leo_station')).length;
  const m={ id:'md_leo_fail', proc:true, deliverModule:{facId:'leo_station',modId:'lab_mod'}, moduleCost:11,
    name:'Deliver Research Laboratory — LEO Station', crew:0, days:0, reqDv:9400, payload:16.5, minRep:0, payout:0, rep:0 };
  const ctx=deliverCtx(m); ctx.outcome={kind:'loss', subsystem:'propulsion', story:'x', rel:0.3, failPhase:'ascent'};
  finalizeLaunch(ctx, null);
  check('failed delivery: NO spec.dock (docking is success-only)', animState!==null && !animState.spec.dock);
  check('failed delivery: module did NOT dock', facilityModuleList(facilityState('leo_station')).length===listBefore);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
