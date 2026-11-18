// Decision-loop roadmap Phase 3 (2026-11-18): a tech tree that changes how you play. Twelve nodes add a new
// option (each keeps its old number), three pad nodes are labelled as the gates they always were, two stepping
// stones became real station gates, and R&D labels every node. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const node=id=>RESEARCH.find(r=>r.id===id);
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

// ---------- the tree: kinds, labels, the per-era target ----------
{
  const OPTIONS=['engine_test_stands','flight_qualification','autonomous_test_program','digital_computer','redundant_avionics','autonomous_navigation','ai_mission_management','station_keeping','large_space_stations','modular_design','fleet_autonomy','megastructure_construction'];
  check('the twelve option nodes carry option text', OPTIONS.every(id=>node(id)&&typeof node(id).option==='string'&&node(id).option.length>20));
  check('…and classify as "New option"', OPTIONS.every(id=>researchKind(node(id))==='option') && RESEARCH_KIND_LABEL.option==='New option');
  check('converted nodes keep their old numbers (balance and earlier merges preserved)', node('digital_computer').effect.reliability>0 && node('flight_qualification').effect.reliability>=0.05 && node('autonomous_test_program').effect.reliability>=0.08);
  check('pad nodes are labelled as the gates they are', ['concrete_pads','flame_trenches','mobile_service_tower'].every(id=>researchKind(node(id))==='unlock'&&node(id).gate));
  check('engines classify as Engine', researchKind(node('kerosene'))==='engine' && researchKind(node('super_heavy'))==='engine');
  check('every node gets one of the five labels', RESEARCH.every(r=>!!RESEARCH_KIND_LABEL[researchKind(r)]));
  const actionByEra={}; RESEARCH.forEach(r=>{ const k=researchKind(r); if(k==='option'||k==='unlock'){ const e=r.eraMin||0; actionByEra[e]=(actionByEra[e]||0)+1; } });
  check('eras 0–6 each have at least two nodes that add an action (option or unlock), not a number', [0,1,2,3,4,5,6].every(e=>(actionByEra[e]||0)>=2));
  check('era 7 (two nodes) has its option', (actionByEra[7]||0)>=1);
  newGame('engineer'); state.selectedResearch='digital_computer';
  const tip=techTooltipHTML(node('digital_computer'));
  check('the tooltip names the kind and the option', /New option/.test(tip) && /Abort to orbit/.test(tip));
  check('the tree marks option nodes with a star (SVG fill via style, theme-safe)', (()=>{ try{ renderTechTree(); }catch(e){} const h=(document.getElementById('techTree')||{}).innerHTML||''; return /class="rk-star"[^>]*style="fill:var\(--ignite\)"/.test(h); })());
}

// ---------- testing & failure ----------
{
  newGame('engineer'); state.money=40; state.activeMission='first_flight';
  check('the uncrewed test flight is locked without Flight Qualification', !testLevelUnlocked(2) && setTestLevel(2)===false && state.testLevel===0);
  check('static fire stays open from the start', testLevelUnlocked(1) && setTestLevel(1)!==false && state.testLevel===1);
  check('the go/no-go block shows the test flight locked', launchGoNoGo().test.options[2].locked===true);
  state.research.flight_qualification=true;
  check('Flight Qualification unlocks it', testLevelUnlocked(2) && setTestLevel(2)!==false && state.testLevel===2 && !launchGoNoGo().test.options[2].locked);
  state.testLevel=0;
  const ctx={m:curMission(), flightExpense:2};
  const inv=openInvestigation(ctx,{kind:'loss',subsystem:'propulsion'});
  const q0=invProgramQuote(inv,'inspect'), t0=invProgramQuote(inv,'test');
  state.research.engine_test_stands=true; state.research.autonomous_test_program=true;
  const q1=invProgramQuote(inv,'inspect'), t1=invProgramQuote(inv,'test');
  check('Failure telemetry: inspections half price and ~10 days', Math.abs(q1.cost-round2(q0.cost*0.5))<0.011 && q1.months<0.5);
  check('Autonomous testing: integrated testing half price', Math.abs(t1.cost-round2(t0.cost*0.5))<0.011);
  startInvestigationProgram(inv.id,'test'); let n=0; while(inv.program&&!inv.program.done&&n++<60) advanceDays(1);
  check('…and its credit covers five flights', state.subsysTest.propulsion && state.subsysTest.propulsion.flights===INV_TEST_FLIGHTS_AUTO);
}

// ---------- flight safety ----------
{
  newGame('engineer'); const orbital=MISSIONS.find(m=>m.id==='first_sat'), sub=MISSIONS.find(m=>m.id==='first_flight');
  const loss={kind:'loss', subsystem:'propulsion', failPhase:'ascent', story:'an engine failed.'};
  const real=Math.random;
  try{
    Math.random=()=>0;
    check('no Digital Computer: a loss stays a loss', abortToOrbit(loss,orbital).kind==='loss');
    state.research.digital_computer=true;
    const a=abortToOrbit(loss,orbital);
    check('Digital Computer: an upper-stage loss on an orbital mission can end as a partial', a.kind==='partial' && a.abortToOrbit && /salvaged a lower orbit/.test(a.story));
    check('…not on a suborbital hop', abortToOrbit(loss,sub).kind==='loss');
    check('…not for a structures failure', abortToOrbit(Object.assign({},loss,{subsystem:'structures'}),orbital).kind==='loss');
    check('…and never touches a success', abortToOrbit({kind:'success'},orbital).kind==='success');
    Math.random=()=>0.99;
    check('…it is a chance, not a guarantee', abortToOrbit(loss,orbital).kind==='loss');
  } finally { Math.random=real; }
  // engine-out needs Redundant Avionics
  state.research={}; state.unlocked.kerolox_mk1=true; state.activeMission='first_flight';
  state.stages=[{eng:'kerolox_mk1',count:3,prop:20}]; state.engineOut=true;
  const vOff=computeVehicle();
  state.research.redundant_avionics=true; const vOn=computeVehicle();
  check('engine-out does nothing until Redundant Avionics', vOn.twr<vOff.twr-1e-9);
}

// ---------- operations ----------
{
  newGame('engineer');
  const ev=MISSION_ANOMALIES.find(a=>a.id==='solar_array'), ctx={m:MISSIONS.find(m=>m.id==='first_sat'), crewed:false};
  const base=anomalyOptions(ev,ctx).length;
  check('no Autonomous Navigation: the authored calls only', !anomalyOptions(ev,ctx).some(o=>o.id==='autonav'));
  state.research.autonomous_navigation=true;
  const o=anomalyOptions(ev,ctx);
  check('Autonomous Navigation adds a third call', o.length===base+1 && o.some(x=>x.id==='autonav'));
  const nav=o.find(x=>x.id==='autonav');
  check('…that recovers cleanly on a good roll and degrades on a bad one', !nav.resolve(()=>0).outcomeOverride && nav.resolve(()=>0.999).outcomeOverride==='partial');
  check('no AI mission management: the player is asked', aiAnomalyChoice(o)===null);
  state.research.ai_mission_management=true;
  check('AI mission management takes the call, preferring the navigator', aiAnomalyChoice(o)==='autonav');
  state.research.autonomous_navigation=false;
  check('…or the first authored call without it', aiAnomalyChoice(anomalyOptions(ev,ctx))===ev.options(ctx)[0].id);
}

// ---------- stations & production ----------
{
  newGame('engineer'); state.money=900; state.completed.crew_orbit=true;
  foundFacility('leo_station'); const fs=facilityState('leo_station');
  for(let i=0;i<STATION_PORT_BASE-1;i++) fs.moduleList.push('can_std');
  check('without Station Keeping the Docking Node is locked', canAddStationModule('leo_station','node_hub').ok===false && /Station Keeping/.test(canAddStationModule('leo_station','node_hub').why));
  state.research.station_keeping=true;
  check('Station Keeping unlocks it', canAddStationModule('leo_station','node_hub').ok===true);
  fs.moduleList.push('node_hub');
  const cap3=facilityPortCap(fs,facilityById('leo_station'));
  state.research.large_space_stations=true;
  check('Large Space Stations: each node carries two more ports', facilityPortCap(fs,facilityById('leo_station'))===cap3+2);
  state.research.megastructure_construction=true;
  check('Megastructures: no port limit', facilityPortCap(fs,facilityById('leo_station'))===Infinity);
  const b0=buildSlots(); state.research.modular_design=true;
  check('Modular Design: one more build line', buildSlots()===b0+1);
  const p0=launchPadCap(); state.research.fleet_autonomy=true;
  check('Fleet Autonomy: one more launch a month', launchPadCap()===p0+1);
}

// ---------- R&D detail shows the option ----------
{ newGame('engineer'); state.selectedResearch='modular_design'; try{ renderResearchDetail(); }catch(e){}
  const h=(document.getElementById('researchDetail')||{}).innerHTML||'';
  check("the detail panel shows the label and the new option", /New option/.test(h) && /second build line/.test(h)); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
