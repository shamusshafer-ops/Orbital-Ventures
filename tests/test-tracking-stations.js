// #89 slice 1 — Tracking-station network backend (data model + lifecycle functions + the
// missionTechMet gate + the missionAdvisor explainer entry). No render/map work this slice — that's
// slice 2. TRACKING_NETWORK_LIVE stays false in shipped code (no build UI exists yet); this suite
// flips it on temporarily (it's `let`, not `const`, specifically so tests can do this — see its own
// comment in sim.js) to exercise the real gate/advisor branches, then restores it every time.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 0. Data sanity ----------
{
  check('data: 3 tracking stations', TRACKING_STATIONS.length===3);
  const ids=TRACKING_STATIONS.map(s=>s.id);
  check('data: unique ids', new Set(ids).size===3);
  check('data: all gated on deep_space research', TRACKING_STATIONS.every(s=>s.reqResearch==='deep_space'));
  check('data: all have positive setup + upkeep', TRACKING_STATIONS.every(s=>s.setup>0 && s.upkeep>0));
  check('data: shipped state — gate is now LIVE (slice 2)', TRACKING_NETWORK_LIVE===true);
  const sr=MISSIONS.find(x=>x.id==='sample_return');
  check('setup: sample_return is a clean .profile test subject (reqResearch deep_space, no archFork/reqSynergy)', !!sr && !!sr.profile && sr.reqResearch==='deep_space' && !sr.archFork && !sr.reqSynergy);
  const ll=MISSIONS.find(x=>x.id==='luna_landing');
  check('setup: luna_landing is .profile with an archFork (the early-return gotcha case)', !!ll && !!ll.profile && ll.archFork==='luna_landing');
}

// ---------- 1. Lifecycle: canBuildStation guards ----------
{
  state.research={}; state.trackingStations=[]; state.money=100;
  let chk=canBuildStation('goldstone');
  check('build guard: blocked without deep_space research', !chk.ok);

  state.research={deep_space:true};
  chk=canBuildStation('goldstone');
  check('build guard: ok once research + money are both there', chk.ok===true && chk.cost===stationDef('goldstone').setup);

  chk=canBuildStation('not_a_real_station');
  check('build guard: unknown id refused', !chk.ok);

  state.money=0.01;
  chk=canBuildStation('madrid');
  check('build guard: blocked on insufficient capital', !chk.ok);
  state.money=100;
}

// ---------- 2. Lifecycle: buildTrackingStation — money, count, no double-build ----------
{
  state.research={deep_space:true}; state.trackingStations=[]; state.money=100;
  check('build: count starts 0', trackingStationCount()===0);
  const setupCost=stationDef('goldstone').setup;
  const moneyBefore=state.money;
  buildTrackingStation('goldstone');
  check('build: money deducted by setup cost', round2(state.money)===round2(moneyBefore-setupCost));
  check('build: count is 1', trackingStationCount()===1);
  check('build: stationBuilt reports true', stationBuilt('goldstone')===true);

  const moneyAfterFirst=state.money;
  buildTrackingStation('goldstone'); // already built — canBuildStation should refuse, no double-charge
  check('build: a repeat build is a no-op (guarded by canBuildStation)', round2(state.money)===round2(moneyAfterFirst) && trackingStationCount()===1);
}

// ---------- 3. trackingUpkeep: sums built stations only ----------
{
  state.research={deep_space:true}; state.trackingStations=[]; state.money=1000;
  check('upkeep: 0 with no stations', trackingUpkeep()===0);
  buildTrackingStation('goldstone');
  check('upkeep: matches goldstone alone', round2(trackingUpkeep())===round2(stationDef('goldstone').upkeep));
  buildTrackingStation('madrid');
  check('upkeep: sums two built stations', round2(trackingUpkeep())===round2(stationDef('goldstone').upkeep+stationDef('madrid').upkeep));
  state.trackingStations=[];
}

// ---------- 4. needsTrackingNetwork: inert when the flag is forced off (kill-switch behavior) ----------
{
  TRACKING_NETWORK_LIVE=false; // slice 2 ships this true; force off here to prove the kill-switch fully disables the gate
  try{
    state.research={deep_space:true}; state.trackingStations=[]; state.completed={};
    const sr=MISSIONS.find(x=>x.id==='sample_return');
    check('flag off: needsTrackingNetwork is false for an unflown .profile mission', needsTrackingNetwork(sr)===false);
    state.completed={sample_return:true};
    check('flag off: still false once completed (nothing to grandfather from — already inert)', needsTrackingNetwork(sr)===false);
    state.completed={};
  } finally { TRACKING_NETWORK_LIVE=true; }
  check('flag restored to shipped-live state', TRACKING_NETWORK_LIVE===true);
}

// ---------- 5. needsTrackingNetwork with the flag on: profile + not-completed only ----------
{
  TRACKING_NETWORK_LIVE=true;
  try{
    const sr=MISSIONS.find(x=>x.id==='sample_return');
    const nonProfile=MISSIONS.find(x=>!x.profile);
    state.completed={};
    check('flag on: true for an unflown .profile mission', needsTrackingNetwork(sr)===true);
    state.completed={sample_return:true};
    check('flag on: false once completed — grandfathered', needsTrackingNetwork(sr)===false);
    check('setup: found a non-.profile mission to test against', !!nonProfile);
    check('flag on: false for a non-.profile mission regardless of completion', needsTrackingNetwork(nonProfile)===false);
    state.completed={};
  } finally { TRACKING_NETWORK_LIVE=true; }
  check('flag at shipped-live state', TRACKING_NETWORK_LIVE===true);
}

// ---------- 6. missionTechMet: the real gate, flag on — blocks, then unblocks after a build, then stays open once completed ----------
{
  TRACKING_NETWORK_LIVE=true;
  try{
    const sr=MISSIONS.find(x=>x.id==='sample_return');
    state.research={deep_space:true}; state.trackingStations=[]; state.completed={};
    check('gate: sample_return blocked with 0 stations', missionTechMet(sr)===false);
    state.trackingStations=['goldstone'];
    check('gate: sample_return unblocked once 1 station exists', missionTechMet(sr)===true);
    state.trackingStations=[]; state.completed={sample_return:true};
    check('gate: sample_return stays flyable once completed, even back to 0 stations (grandfathered)', missionTechMet(sr)===true);
    state.completed={};
  } finally { TRACKING_NETWORK_LIVE=true; }
}

// ---------- 7. missionTechMet: the luna_landing early-return gotcha — station check must not be bypassed ----------
{
  TRACKING_NETWORK_LIVE=true;
  const savedArchFn=anyLunarArchUnlocked;
  try{
    const ll=MISSIONS.find(x=>x.id==='luna_landing');
    state.research={deep_space:true}; state.trackingStations=[]; state.completed={};
    anyLunarArchUnlocked=()=>true; // force the arch-fork branch to WOULD-be-true, isolating the station check
    check('gotcha: luna_landing still blocked with 0 stations even though its arch check would pass', missionTechMet(ll)===false);
    state.trackingStations=['goldstone'];
    check('gotcha: luna_landing opens once a station exists (both gates now pass)', missionTechMet(ll)===true);
  } finally {
    anyLunarArchUnlocked=savedArchFn;
    TRACKING_NETWORK_LIVE=true;
    state.trackingStations=[]; state.completed={};
  }
}

// ---------- 8. Procedural Deep-Space Sample Return contract: always gated (never in state.completed) ----------
{
  TRACKING_NETWORK_LIVE=true;
  try{
    const arch=CONTRACT_ARCHETYPES.find(a=>a.kind==='sample_return');
    const proc=arch.build(2);
    check('setup: procedural sample-return archetype builds a .profile mission', !!proc && !!proc.profile);
    state.completed={}; // procedural offers never populate this, by design — nothing to fake here
    check('procedural: always needs the network (no grandfather — it never completes into state.completed)', needsTrackingNetwork(proc)===true);
  } finally { TRACKING_NETWORK_LIVE=true; }
}

// ---------- 9. missionAdvisor: surfaces the requirement when applicable, stays silent when forced off, never throws ----------
{
  let threw=false;
  try{
    state.research={}; state.trackingStations=[]; state.completed={};
    TRACKING_NETWORK_LIVE=false; // force the kill-switch off — advisor must not mention tracking at all
    const a1=missionAdvisor();
    check('advisor (flag off): no tracking-network requirement leaks in', !a1.reqs.some(r=>/[Tt]racking/.test(r.label)));

    TRACKING_NETWORK_LIVE=true;
    const a2=missionAdvisor(); // flag on — may or may not apply depending on what nextObjective() picked, but must not throw
    check('advisor (flag on): reqs is an array', Array.isArray(a2.reqs));
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  finally { TRACKING_NETWORK_LIVE=true; }
  check('advisor: no throw across both flag states', !threw);
}

// ---------- 10. Slice 2: build panel + map marker model surface correctly (headless HTML/string checks) ----------
{
  // trackingPanelHTML gates on research and reflects built state
  state.research={}; state.trackingStations=[];
  const dark=trackingPanelHTML();
  check('panel: shown even pre-research (explains the lock), mentions Deep Space Network', /Deep Space Network/.test(dark));
  check('panel: pre-research copy points at the research unlock', /[Rr]esearch/.test(dark) && !/Build ·/.test(dark));

  state.research={deep_space:true};
  const buyable=trackingPanelHTML();
  check('panel: post-research shows a Build button', /Build ·/.test(buyable));
  check('panel: lists all three sites', /Goldstone/.test(buyable) && /Madrid/.test(buyable) && /Canberra/.test(buyable));

  state.trackingStations=['goldstone'];
  const partial=trackingPanelHTML();
  check('panel: a built site reads as online, not another Build button', /online/.test(partial));
  check('panel: header count reflects built/total', /1\/3/.test(partial));

  // map asset model carries stations under earth, and only when >0
  state.trackingStations=[];
  check('map model: no stations key when none built', !mapAssetModel().earth || !mapAssetModel().earth.stations);
  state.trackingStations=['goldstone','madrid'];
  const em=mapAssetModel().earth;
  check('map model: earth.stations reflects built ids', !!em && Array.isArray(em.stations) && em.stations.length===2);

  // both marker renderers accept the model without throwing
  let threw=false;
  try{ assetMarkersSVG('earth', 100, 100, 12, mapAssetModel()); }catch(e){ threw=true; console.log('  svg threw:', e.message); }
  check('map marker: assetMarkersSVG renders the station cluster without throwing', !threw);
  check('map marker: SVG output contains a dish path for earth', /A 3 3/.test(assetMarkersSVG('earth',100,100,12,mapAssetModel())));

  state.trackingStations=[];
}

// ---------- 11. Module-delivery logistics runs are exempt (resupply to an owned base, not a first) ----------
{
  TRACKING_NETWORK_LIVE=true;
  try{
    state.research={deep_space:true}; state.trackingStations=[]; state.completed={};
    const delivery={ id:'md_test', proc:true, deliverModule:{facId:'lunar_base',modId:'lab_mod'},
      profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Trans-Lunar Injection',dv:3120,by:'transfer'}] };
    check('exempt: module-delivery run does not need the network', needsTrackingNetwork(delivery)===false);
    check('exempt: the same offer WITHOUT the deliverModule tag DOES need it (proves the tag is what exempts it)',
      needsTrackingNetwork({id:'md_test2', profile:delivery.profile})===true);
  } finally { TRACKING_NETWORK_LIVE=true; }
  state.completed={};
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
