// Tech-tree design pass, slice 2 — testing track (2026-07-20). The testing/reliability track was
// nine nodes: test_program (root) branching into qa_program (kept, gates the rapid_refurb synergy),
// an instrumentation/qualification chain (flight_telemetry -> vibration_testing -> accelerated_life_
// testing -> digital_twin -> autonomous_qa), and an engine/stage chain (engine_test_stands ->
// stage_test). Collapsed to five nodes, preserving the two load-bearing ids other systems reference
// (test_program: directly halves ascent propulsion failure weight in sim.js + gates a bench-tab CTA
// in render.js; engine_test_stands: kept as the surviving id since heavy_booster reqs it) and the
// exact reliability total. No back-compat constraint (per owner, same as slice 1).
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
const byId={}; for(const n of RESEARCH) byId[n.id]=n;

// ---------- 1. the nine-node track is now five nodes ----------
{
  const track=RESEARCH.filter(n=>n.track==='testing');
  check('the testing track is now 5 nodes (was 9)', track.length===5);
  check('the five survivors are test_program, flight_qualification, qa_program, engine_test_stands, autonomous_test_program',
    !!byId.test_program && !!byId.flight_qualification && !!byId.qa_program &&
    !!byId.engine_test_stands && !!byId.autonomous_test_program);
}

// ---------- 2. the removed ids are gone ----------
for(const gone of ['flight_telemetry','vibration_testing','accelerated_life_testing','digital_twin','autonomous_qa','stage_test']){
  check('removed node "'+gone+'" no longer exists', !byId[gone]);
}

// ---------- 3. NOTHING anywhere references a removed id in its req ----------
{
  const removed=new Set(['flight_telemetry','vibration_testing','accelerated_life_testing','digital_twin','autonomous_qa','stage_test']);
  const dangling=RESEARCH.filter(n=>(n.req||[]).some(r=>removed.has(r)));
  check('no research node has a dangling req to a removed id', dangling.length===0);
}

// ---------- 4. load-bearing external gates still resolve ----------
{
  check('heavy_booster still gates on engine_test_stands (kept id, not renamed)', (byId.heavy_booster.req||[]).includes('engine_test_stands'));
  check('rapid_refurb synergy still requires qa_program (untouched by this slice)',
    typeof SYNERGIES!=='undefined' ? SYNERGIES.find(s=>s.id==='rapid_refurb').requires.includes('qa_program') : true);
  check('test_program is still an early root node (no prereq)', (byId.test_program.req||[]).length===0);
  check('engine_test_stands still chains directly off test_program', (byId.engine_test_stands.req||[]).includes('test_program'));
  check('qa_program still chains directly off test_program', (byId.qa_program.req||[]).includes('test_program'));
  check('flight_qualification still chains directly off test_program', (byId.flight_qualification.req||[]).includes('test_program'));
  check('autonomous_test_program now chains off flight_qualification directly (vibration_testing removed between them)',
    (byId.autonomous_test_program.req||[]).includes('flight_qualification'));
}

// ---------- 5. reliability total is preserved exactly (no stealth buff/nerf) ----------
{
  const total=['test_program','flight_qualification','qa_program','engine_test_stands','autonomous_test_program']
    .reduce((s,id)=>s+(byId[id].effect.reliability||0),0);
  // old track: 0.08+0.04+0.05+0.03+0.02+0.03+0.04+0.02+0.03 = 0.34
  check('the collapsed track preserves the exact 0.34 reliability total', Math.abs(total-0.34)<1e-9);
}

// ---------- 6. each surviving merged node is now a MEANINGFUL step, not a +0.02-0.04 shrug ----------
{
  check('flight_qualification is a substantial step (>=0.05 reliability)', byId.flight_qualification.effect.reliability>=0.05);
  check('engine_test_stands is a substantial step (>=0.05 reliability)', byId.engine_test_stands.effect.reliability>=0.05);
  check('autonomous_test_program is a substantial step (>=0.08 reliability)', byId.autonomous_test_program.effect.reliability>=0.08);
}

// ---------- 7. costs stayed sane (compressed from the sum they absorbed, not inflated) ----------
{
  // telemetry(2.0)+vibration(2.5)=4.5 absorbed into flight_qualification; compressed to 3.5
  check('flight_qualification cost is compressed, not the naive 4.5 sum', byId.flight_qualification.cost<4.5 && byId.flight_qualification.cost>=2.5);
  // engine_test_stands(2.0)+stage_test(3.0)=5.0 absorbed; compressed to 3.5
  check('engine_test_stands cost is compressed from its absorbed sum', byId.engine_test_stands.cost<5.0 && byId.engine_test_stands.cost>=2.5);
  // accel_life(3.5)+digital_twin(5.0)+autonomous_qa(6.0)=14.5 absorbed; compressed to 10.0
  check('autonomous_test_program cost is compressed from its absorbed sum', byId.autonomous_test_program.cost<14.5 && byId.autonomous_test_program.cost>=7);
}

// ---------- 8. sciCost carried over from digital_twin onto the merged node ----------
{
  check('autonomous_test_program preserves the sciCost:20 that digital_twin carried', byId.autonomous_test_program.sciCost===20);
}

// ---------- 9. point-of-use effect on test_program is untouched (it was NOT merged) ----------
{
  newGame('engineer');
  state.research.test_program=true;
  check('researching test_program still contributes its reliability to the sum', researchEffectSum('reliability')>=0.08);
}

// ---------- 10. the whole tree still loads & researchable from a fresh game ----------
{
  newGame('engineer');
  check('flight_qualification is researchable in a fresh game (no broken prereq)', byId.flight_qualification.req.length===1);
  check('engine_test_stands is researchable in a fresh game (no broken prereq)', byId.engine_test_stands.req.length===1);
  state.research.test_program=true; state.research.flight_qualification=true;
  check('autonomous_test_program becomes reachable once flight_qualification is done',
    (byId.autonomous_test_program.req||[]).every(r=>state.research[r]));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
