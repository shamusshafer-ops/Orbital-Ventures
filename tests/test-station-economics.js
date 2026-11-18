// Decision-loop roadmap Phase 4b (2026-11-18): station economics + the supply manifest. Owner choices: each
// module pays its way, flying resupply pays, crew limits shown and enforced, and the manifest built now.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const F='leo_station';
function station(){
  newGame('engineer'); state.money=900; state.year=1962; state.rep=900;
  RESEARCH.filter(r=>(r.eraMin||0)<=2).forEach(r=>state.research[r.id]=true); Object.keys(ENGINES).forEach(k=>state.unlocked[k]=true);
  state.completed.crew_orbit=true; foundFacility(F); return facilityState(F);
}
const dock=(fs,id)=>{ fs.moduleList.push(id); fs.modules=fs.moduleList.length; };

// ---------- each module pays its way ----------
{
  const leo=facilityById(F);
  const orbital=STATION_MODULES.filter(m=>moduleFacilityCompatible(leo,m).ok&&m.id!=='can_std');
  const science=m=>(m.prod.sci||0)>=2;
  check('every non-science orbital module earns at least its running cost', orbital.filter(m=>!science(m)).every(m=>m.prod.income*facilityBodyMult(leo)>=EMPIRE_FAC_OPEX_MODULE-1e-9));
  check('the lab trades a little money for real science', (()=>{ const lab=STATION_MODULES.find(m=>m.id==='lab_mod'); return lab.prod.income<EMPIRE_FAC_OPEX_MODULE && lab.prod.sci>=2; })());
  const fs=station();
  dock(fs,'power_truss'); dock(fs,'node_hub'); dock(fs,'can_std');
  const pr=facilityProduction(leo,fs);
  check('a powered, crewed station of non-science modules covers its running cost', pr.income>=facilityOpex(F)-1e-9);
  check('the bench shows running cost next to income', (()=>{ const h=renderStationFacilityStats([{def:leo,fs}],{def:leo,fs}); return /Running cost/.test(h) && /a full 8-mo load/.test(h); })());
}

// ---------- crew limits: shown and enforced ----------
{
  const fs=station();
  dock(fs,'node_hub'); dock(fs,'power_truss'); /* a node for port room, so the crew check is what's tested */
  check('one lab fits the core habitat crew', canAddStationModule(F,'lab_mod').ok===true);
  dock(fs,'lab_mod');
  const c=canAddStationModule(F,'lab_mod');
  check('a second lab the crew cannot run is blocked, and says how to fix it', c.ok===false && /add a habitat/.test(c.why) && c.need===4 && c.cap===3);
  check('…on the flown-delivery path too', canFlyModuleDelivery(F,'lab_mod').ok===false);
  check('a habitat is always allowed', canAddStationModule(F,'can_std').ok===true);
  dock(fs,'can_std');
  check('with the habitat docked, the lab is allowed again', canAddStationModule(F,'lab_mod').ok===true);
}

// ---------- flying resupply pays ----------
{
  const fs=station(); fs.supply=2;
  const pkg=resupplyCost(F);
  state.money=0.05;
  check('a flown resupply needs no provisions purchase up front', canFlyStationVisit(F,'resupply').ok===true);
  state.money=900;
  const o=flyStationVisit(F,'resupply',false);
  check('the cargo-pod mission estimates the tenants\' payment (paid at docking, not as a mission payout)', o && o.payout===0 && Math.abs(o.estPayout-pkg)<0.011 && o.estPayout>0);
  check('its briefing says so', /tenants pay/.test(o.blurb));
  state.activeMission=o.id; state.stages=[{eng:'kerolox_mk3',count:2,prop:60},{eng:'hydrolox_up',count:1,prop:12}];
  { const p=autoSizePlan(); if(p.ok) applyAutoSize(); }
  queueBuild(true,'svq'); let g=0; while(!hangarList().length&&g++<400) advanceDays(1);
  const h=hangarList()[0];
  const sup0=facilitySupply(F), money0=state.money;
  _devForceOutcome='success'; launchFromHangar(h.id,h.hullId,'svf');
  check('the delivery tops the station up to full', facilitySupply(F)===FAC_SUPPLY_MONTHS);
  { const line=(state.log.slice(0,20).find(l=>/tenants paid/.test(l.msg))||{}).msg||'', m=line.match(/transferred ([\d.]+) months.*paid \$([\d.]+)M/);
    check('…and the tenants pay for what was delivered, at the package price', !!m && Math.abs(+m[2]-stationDeliveryValue(F,+m[1]))<0.011 && +m[2]>0); }
  check('a pod planned early is not penalised: it delivers what is missing at docking', (()=>{ const fs2=facilityState(F); fs2.supply=1; const o2=flyStationVisit(F,'resupply',false); return o2 && /tops the station up/.test(o2.blurb); })());
}

// ---------- the supply manifest ----------
{
  const fs=station(); fs.supply=5; fs.autoResupply=false;
  const mf=supplyManifest(F,24);
  check('the manifest projects the stock month by month', mf && mf.curve.length===24 && mf.curve[0]===4 && mf.stockNow===5);
  check('…finds the shortfall', mf.shortfall!=null && Math.abs(mf.shortfall-(absDay()+5*DAYS_PER_MONTH))<=DAYS_PER_MONTH);
  check('…and counts the supply launches the window needs', mf.launches.supply>=2);
  check('a shortfall comes with at least two recoveries', mf.recoveries.length>=2 && mf.recoveries.some(r=>r.id==='buy') && mf.recoveries.some(r=>r.id==='fly') && mf.recoveries.some(r=>r.id==='auto'));
  check('12–36 month window, clamped', supplyManifest(F,6).months===12 && supplyManifest(F,99).months===36);
  // recovery 1: auto-reorder covers it
  toggleAutoResupply(F);
  const mfA=supplyManifest(F,24);
  check('auto-reorder: covered, with the reorders counted', mfA.shortfall==null && mfA.low==null && mfA.reorders>=2 && mfA.launches.supply===0);
  toggleAutoResupply(F);
  // recovery 2: a cargo pod in the hangar shows as an arrival and pushes the shortfall out
  const o=flyStationVisit(F,'resupply',false);
  state.activeMission=o.id; state.stages=[{eng:'kerolox_mk3',count:2,prop:60},{eng:'hydrolox_up',count:1,prop:12}]; { const p=autoSizePlan(); if(p.ok) applyAutoSize(); }
  const before=supplyManifest(F,24);
  check('a planned but unbuilt cargo pod is listed as unscheduled', before.events.some(e=>e.kind==='supply'&&e.unbuilt));
  queueBuild(true,'mq');
  const mfB=supplyManifest(F,24);
  check('…once building it has an arrival date', mfB.events.some(e=>e.kind==='supply'&&!e.unbuilt&&e.abs>absDay()));
  check('…and the shortfall moves later', mfB.shortfall==null || mfB.shortfall>mf.shortfall);
  // recovery 3: buying now
  resupplyFacility(F);
  check('buying provisions now resets the projection', supplyManifest(F,12).stockNow===FAC_SUPPLY_MONTHS);
  // construction and crew rows
  dock(fs,'power_truss'); addStationModule(F,'lab_mod');
  check('a module under construction appears with its docking date', supplyManifest(F,24).events.some(e=>e.kind==='construction'&&/Laboratory/.test(e.label)) && supplyManifest(F,24).launches.construction===1);
  stationOps(fs).crewManaged=true; stationOps(fs).rotationDueAbs=absMonth()+3;
  check('crew rotations due in the window are counted', supplyManifest(F,24).launches.crew===2);
  const html=renderStationFacilityStats([{def:facilityById(F),fs}],{def:facilityById(F),fs});
  check('the bench shows the manifest card', /class="manifest"/.test(html) && /Supply manifest/.test(html) && /Launches in the window/.test(html));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
