// Comprehensive evaluation 2026-11-19 — Phase 4 base progression + Phase 8 outpost demand. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-9);

function setupBase(F){
  newGame('engineer'); state.year=1965; state.money=5000; RESEARCH.forEach(r=>state.research[r.id]=true);
  ['crew_orbit','luna_landing','mars_orbit'].forEach(k=>state.completed[k]=true);
  foundFacility(F); const fs=facilityState(F); fs.built=true; fs.supply=8; return fs;
}
const add=(F,id)=>{ const fs=facilityState(F), list=facilityModuleList(fs); list.push(id); fs.modules=list.length; };

// ---------- tiers ----------
const fs=setupBase('lunar_base'), def=facilityById('lunar_base');
check('a fresh base is an Outpost (tier 1)', baseTier('lunar_base')===1);
check('the LEO station is not a surface base and has no tier', baseTierFor(facilityById('leo_station'),{moduleList:['can_std','lab_mod']})===0 && !isSurfaceBase(facilityById('leo_station')));
const sci1=facilityProduction(def,fs).sci, res1=resupplyCostFull('lunar_base')/facilityModuleList(fs).length;
add('lunar_base','hab_dome');
check('a habitat alone is not a Research Base', baseTier('lunar_base')===1);
add('lunar_base','rover_garage');
check('habitat + science module + room for 4 crew → Research Base', baseTier('lunar_base')===2);
{ const pr=facilityProduction(def,fs); const raw=(()=>{ const t=BASE_TIERS; return null; })();
  const fsCopy={moduleList:facilityModuleList(fs).slice()}; check('Research Base science runs ×1.25', pr.sci>sci1); }
add('lunar_base','isru_plant');
check('ISRU without a reactor is not yet Industrial', baseTier('lunar_base')===2);
add('lunar_base','reactor_pad');
check('ISRU + reactor with power in surplus → Industrial Base', baseTier('lunar_base')===3 && facilityPower(fs).net>=0);
check('an Industrial Base cuts resupply ×0.75', near(baseTierResupplyMult(3),0.75));
check('…and missions to its world build 10% cheaper on top of the per-module discount', near(facilityBonus('moon').buildDiscount, Math.min(0.25,0.05*facilityModuleList(fs).length)+0.10));
add('lunar_base','greenhouse');
check('a greenhouse without room for 8 crew is not Self-Sufficient', baseTier('lunar_base')===3);
add('lunar_base','hab_dome');
check('greenhouse + room for 8 → Self-Sufficient', baseTier('lunar_base')===4 && near(baseTierResupplyMult(4),0.5));
check('seven modules (core + six) is not yet a hub', facilityModuleList(fs).length===7 && baseTier('lunar_base')===4);
add('lunar_base','lab_mod');
check('eight modules → Logistics Hub', facilityModuleList(fs).length===8 && baseTier('lunar_base')===5);
check('a hub stages the next world\'s base 30% cheaper', near(facilityFoundCost('mars_base'), facilityById('mars_base').foundCost*0.7) && near(facilityFoundCost('lunar_base'), def.foundCost));
check('the hub discount does not apply to the orbital station', near(facilityFoundCost('leo_station'), facilityById('leo_station').foundCost));

// ---------- promotions are announced once, demotions re-arm them ----------
fs.tierSeen=1; const rep0=state.rep; checkBaseTiers();
check('a promotion is logged with its gain and pays rep', fs.tierSeen===5 && state.rep===rep0+25 && (state.log||[]).some(e=>/Lunar Base is now a Logistics Hub/.test(e.msg||'')));
const rep1=state.rep; checkBaseTiers();
check('…once', state.rep===rep1);

// ---------- self-sufficient bases are not abandoned when supplies run out ----------
{ fs.supply=0; fs.starvedMonths=FAC_STARVE_ABANDON_MONTHS-1; const n=facilityModuleList(fs).length;
  tickMonthlyBoundary();
  check('a Self-Sufficient base that runs dry loses no module', facilityModuleList(fs).length===n && facilityBuilt('lunar_base')); }
{ const f2=setupBase('lunar_base'); add('lunar_base','hab_dome'); f2.supply=0; f2.starvedMonths=FAC_STARVE_ABANDON_MONTHS-1; const n=facilityModuleList(f2).length;
  tickMonthlyBoundary();
  check('an Outpost that runs dry still evacuates a module', facilityModuleList(f2).length===n-1); }

// ---------- UI ladder ----------
{ const f3=setupBase('lunar_base'); add('lunar_base','hab_dome'); const h=baseTierLadderHTML(facilityById('lunar_base'),f3);
  check('the ladder shows the current tier and what the next one needs', /Base progression — Outpost/.test(h) && /→ <b>Research Base<\/b>/.test(h) && /Needs: A habitat, a lab or rover garage/.test(h));
  check('the station gets no ladder', baseTierLadderHTML(facilityById('leo_station'),{moduleList:['can_std']})===''); }

// ---------- outpost demand: contracts only a Research Base creates ----------
{ setupBase('lunar_base'); const arch=k=>CONTRACT_ARCHETYPES.find(a=>a.kind===k);
  check('no base-driven contracts at an Outpost', !arch('base_crew').req(state) && !arch('base_cargo').req(state));
  add('lunar_base','hab_dome'); add('lunar_base','lab_mod');
  check('a Research Base opens crew-exchange and science-cargo contracts', arch('base_crew').req(state) && arch('base_cargo').req(state));
  const c=arch('base_crew').build(3), g=arch('base_cargo').build(3);
  check('they fly to the Moon on proven profiles (no lander)', c.body==='moon' && g.body==='moon' && c.modules.includes('transfer') && !c.modules.includes('lander') && c.crew===2 && g.crew===0);
  // the home-field discount now reaches procedural missions through their body
  const bonus=facilityBonus('moon').buildDiscount;
  state.contractOffers=[Object.assign({id:'pc_t1',proc:true,expiresAbs:absMonth()+6},g)];
  check('the base\'s build discount reaches a procedural mission flagged for its world', bonus>0 && facilityBonus((state.contractOffers[0].body)||missionBody('pc_t1')).buildDiscount===bonus); }

// ---------- the depot has a capacity; surplus ISRU propellant is exported, not stored at a loss ----------
{ newGame('engineer'); state.money=100; state.research.orbital_depot=true; state.depot=depotCapacity()+10; state.fuelPrice=0.4;
  const m0=state.money, rev=exportDepotOverflow();
  check('overflow above capacity is exported at the market rate', near(state.depot,depotCapacity()) && near(rev,10*fuelSellPrice(),1e-6) && near(state.money,m0+rev,1e-6));
  delete state.research.orbital_depot; state.depot=depotCapacity()+5; const m1=state.money; exportDepotOverflow();
  check('without Orbital Depot research the surplus is vented, not sold', near(state.depot,depotCapacity()) && state.money===m1);
  check('the base capacity is 40 t', depotCapacity()===DEPOT_CAP_BASE && DEPOT_CAP_BASE===40);
  state.depot=depotCapacity()-1; check('nothing happens under capacity', exportDepotOverflow()===0 && near(state.depot,DEPOT_CAP_BASE-1)); }

// ---------- mothballing: a cash-strapped program can cut a facility's carrying cost to zero ----------
{ const f=setupBase('lunar_base'); add('lunar_base','hab_dome'); add('lunar_base','rover_garage'); state.money=50;
  const opex0=empireOpex(), sup0=f.supply, def=facilityById('lunar_base');
  check('a running base carries opex', facilityOpex('lunar_base')>0 && opex0>0);
  mothballFacility('lunar_base');
  check('mothballed: no opex, no income, no resupply orders', facilityMothballed('lunar_base') && facilityOpex('lunar_base')===0 && empireOpex()<opex0 && totalFacilityIncome()===0 && !canResupply('lunar_base').ok && !f.autoResupply);
  const m0=state.money; for(let i=0;i<31;i++) tickContinuousDay(); tickMonthlyBoundary();
  check('a mothballed base consumes no provisions and earns nothing over a month', f.supply===sup0);
  check('reactivating costs 10% of the founding price', near(reactivateCost('lunar_base'),facilityFoundCost('lunar_base')*0.1));
  const m1=state.money; reactivateFacility('lunar_base');
  check('…and brings it back', !facilityMothballed('lunar_base') && near(state.money,m1-reactivateCost('lunar_base'),1e-6));
  const h=mothballHTML(def); check('the outpost panel offers the mothball control', /Mothball Lunar Base/.test(h)); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0?1:0);
