// E3.0 — the make-or-break test. The whole E3 bet is that a part GRAPH reduces
// to the SAME stage array the slider bench produces, so the existing physics
// core is reused not rewritten. This harness builds slider designs, converts
// them to graphs via sliderDesignToBuild(), reduces those graphs back through
// buildToStageIR(), and asserts the resulting stages + payload feed
// stackPerformance() to Δv/TWR numbers that MATCH the direct slider path within
// a tight tolerance. If this passes, the rest of E3 is UI on a proven core.
//
// Appended after harness.js + build/game.js in one script scope.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol){ return Math.abs(a-b) <= (tol!=null?tol:0.5); } // 0.5 m/s Δv tolerance

newGame('engineer');

// ---------- 0. Model sanity ----------
check('flag: BENCH_V2 is enabled for the live vehicle bench', BENCH_V2===true);
check('parts: PART_DEFS has the viable set', ['tank_std','decoupler','engine_a4','capsule_mk1','nosecone','probe_core'].every(id=>!!partDef(id)));
check('parts: categories resolve', partsInCategory('structural').length>=3 && partsInCategory('propulsion').length>=1);

// ---------- helper: run both paths for a given slider design ----------
function equivalence(name, stages, crewed){
  // DIRECT slider path
  const payloadDirect = crewed ? 1.2 : 0.15; // capsule / probe-core dry mass, matching the part defs
  const perfDirect = stackPerformance(stages, payloadDirect);

  // GRAPH path: slider design -> graph -> stage IR -> stackPerformance
  const build = sliderDesignToBuild(stages, {crewed});
  const ir = buildToStageIR(build);
  check(name+': bridge produced no error', !ir.error);
  if(ir.error){ console.log('   error:', ir.error); return; }
  check(name+': stage count matches', ir.stages.length===stages.length);
  // payload from the graph = the capsule/probe dry mass on top
  const perfGraph = stackPerformance(ir.stages, ir.payload);

  check(name+': total Δv matches', near(perfGraph.totalDv, perfDirect.totalDv, 1.0));
  check(name+': liftoff mass matches', near(perfGraph.liftoff, perfDirect.liftoff, 0.05));
  check(name+': stage-1 TWR matches', near(perfGraph.stageTwr[0], perfDirect.stageTwr[0], 0.01));
  // per-stage Δv parity
  let allStagesMatch=true;
  for(let i=0;i<stages.length;i++){ if(!near(perfGraph.stageDv[i], perfDirect.stageDv[i], 1.0)) allStagesMatch=false; }
  check(name+': every stage Δv matches', allStagesMatch);
}

// ---------- 1. Single-stage uncrewed ----------
equivalence('1-stage probe', [{eng:'a4', count:1, prop:8.0, dia:1}], false);

// ---------- 2. Two-stage crewed ----------
equivalence('2-stage crewed', [
  {eng:'kerolox_mk1', count:1, prop:12.0, dia:1},
  {eng:'hyper_storable', count:1, prop:4.0, dia:1},
], true);

// ---------- 3. Three-stage, multi-engine first stage ----------
equivalence('3-stage clustered', [
  {eng:'kerolox_mk3', count:4, prop:40.0, dia:1},
  {eng:'kerolox_mk1', count:1, prop:12.0, dia:1},
  {eng:'hyper_storable', count:1, prop:3.0, dia:1},
], false);

// ---------- 4. Graph structure integrity ----------
{
  const build=sliderDesignToBuild([{eng:'a4',count:1,prop:8,dia:1},{eng:'a4',count:1,prop:4,dia:1}], {crewed:true});
  // spine should be: capsule -> tank -> engine -> decoupler -> tank -> engine  (6 parts)
  const spine=stackSpine(build);
  check('graph: spine length correct (2 stages + payload + decoupler)', spine.length===6);
  check('graph: root is the payload', partDef(buildPart(build,build.root).defId).cat==='payload');
  check('graph: exactly one decoupler for 2 stages', build.parts.filter(p=>p.defId==='decoupler').length===1);
  // decoupler count = stages - 1
  const ir=buildToStageIR(build);
  check('graph: reduces back to 2 stages', ir.stages.length===2);
  check('graph: firing order preserved (stage0 = bottom = first built)', ir.stages[0].prop===8);
}

// ---------- 5. Malformed builds fail gracefully ----------
{
  check('malformed: empty build errors', !!buildToStageIR({parts:[],links:[],root:null}).error);
  const noEngine={parts:[{uid:'a',defId:'capsule_mk1',sym:1}],links:[],root:'a'};
  check('malformed: payload-only (no engine) errors cleanly', !!buildToStageIR(noEngine).error);
  const tankNoEngine=sliderDesignToBuild([{eng:'a4',count:1,prop:8,dia:1}],{crewed:false});
  // strip the engine override AND the engine part to simulate a tank with no engine
  const engPart=tankNoEngine.parts.find(p=>p.defId==='engine_a4');
  tankNoEngine.parts=tankNoEngine.parts.filter(p=>p!==engPart);
  tankNoEngine.links=tankNoEngine.links.filter(l=>l.child!==engPart.uid);
  const ir=buildToStageIR(tankNoEngine);
  check('malformed: tank with no engine -> no propulsive stage error', !!ir.error);
}

// ---------- 6. Determinism: same design -> identical IR twice ----------
{
  const d=[{eng:'kerolox_mk1',count:2,prop:20,dia:1},{eng:'hyper_storable',count:1,prop:5,dia:1}];
  const a=buildToStageIR(sliderDesignToBuild(d,{crewed:true}));
  const b=buildToStageIR(sliderDesignToBuild(d,{crewed:true}));
  check('determinism: identical stages both runs', JSON.stringify(a.stages)===JSON.stringify(b.stages));
  check('determinism: identical payload both runs', a.payload===b.payload);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
