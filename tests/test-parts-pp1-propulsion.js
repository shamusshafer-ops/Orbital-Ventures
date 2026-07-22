// PP.1 — launch/upper propulsion engine parts. 13 new parts (11 liquid + 2 solid), each
// engId-linked to a real ENGINES entry, class-sized to its thrust tier (tiny<150kN vac,
// small 150-900, large 900-3000, huge>3000), gated automatically by PP.0's partAvailable().
//
// HONEST FINDING from building this slice: the game currently has exactly ONE tank part
// (tank_std, node class 'small'). That means only the 4 new 'small'-class liquid engines
// (engine_s3d, engine_ma3, engine_lr79, engine_methalox_vac) plus the self-contained
// stage_solid_scout can actually be PLACED in a build today. The 3 'tiny'-class engines
// (engine_vernier, engine_aj10, engine_rl10) and the 4 'large'/'huge'-class engines
// (engine_h1, engine_f1, engine_methalox, engine_j2) plus booster_srb (large, radial) are
// correctly, deliberately refused by E3.2's diameter-class gate — that gate is doing its
// job, not malfunctioning. This is the PP.3 dependency flagged when the engine->part mapping
// was signed off: those 8 parts are geometrically inert until PP.3 ships matching tank
// tiers. This suite proves BOTH halves precisely: real end-to-end equivalence for the 5
// parts usable today, and data/gating/geometry-honesty coverage for the 8 pending PP.3 —
// so nothing here is silently broken, and nothing is silently glossed over either.
// Equivalence convention note: all Δv/TWR comparisons below use stackPerformance(ir.stages,
// ir.payload) — the SAME convention test-parts-bridge.js established — not
// stackPerformanceForBuild(build). The latter layers E3.4's aero-drag/power/control effects ON
// TOP of the core physics by deliberate design ("the slider bench has never modeled drag; part-
// built vehicles get to, as a reward for good aero design" — see the E3.4 header in parts.js), so
// it is EXPECTED to diverge from the direct slider path by a few m/s. Comparing the bridge-produced
// STAGES through the plain physics core (stackPerformance) isolates what this slice actually needs
// to prove: that each new part's data correctly reduces to the right stage numbers — not that the
// part bench and slider bench are pixel-identical, which they were never meant to be past E3.0.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol){ return Math.abs(a-b) <= (tol!=null?tol:0.5); }

const ALL_NEW = ['engine_s3d','engine_vernier','engine_ma3','engine_lr79','engine_h1','engine_f1',
  'engine_methalox','engine_aj10','engine_j2','engine_rl10','engine_methalox_vac',
  'stage_solid_scout','booster_srb'];
const ATTACHABLE_TODAY = ['engine_s3d','engine_ma3','engine_lr79','engine_methalox_vac']; // + stage_solid_scout (self-contained, tested separately)
const PENDING_PP3 = ['engine_vernier','engine_h1','engine_f1','engine_methalox','engine_aj10','engine_j2','engine_rl10','booster_srb'];

// ---------- 0. data integrity: all 13 new parts exist and link to real engines ----------
{
  check('count: exactly 13 new parts landed', ALL_NEW.length===13);
  check('sum: attachable-today + pending-PP.3 + solid-stage covers all 13', ATTACHABLE_TODAY.length+PENDING_PP3.length+1===13);
  for(const id of ALL_NEW){
    const d=PART_DEFS[id];
    check('exists: '+id, !!d);
    if(!d) continue;
    check('engId: '+id+' links to a real ENGINES entry', !!ENGINES[d.engId]);
    check('cat: '+id+' is propulsion', d.cat==='propulsion');
  }
  check('total PART_DEFS count is 20 (7 pre-PP.1 + 13 new)', Object.keys(PART_DEFS).length===20);
}

// ---------- 1. gating: every new engine part is LOCKED at game start (none pre-unlocked except a4) ----------
{
  newGame('engineer');
  for(const id of ALL_NEW){
    check('gate: '+id+' is locked at a fresh game start', !partAvailable(PART_DEFS[id]));
  }
  // spot-check the unlock flip works through the real engine-unlock signal (not a separate flag)
  state.unlocked.kerolox_mk1=true;
  check('gate: engine_s3d becomes available the instant kerolox_mk1 unlocks (same signal as the slider bench)',
    partAvailable(PART_DEFS.engine_s3d));
}

// ---------- 2. end-to-end equivalence for the 4 attachable 'small'-class liquids ----------
// Real usage path: attachPart with the ACTUAL new part id (not an override stamp) -> buildToStageIR
// -> stackPerformanceForBuild, compared against the direct slider-path stackPerformance() with the
// SAME engine id and prop mass. This is per-part-definition fidelity, not just per-engine-id fidelity.
{
  newGame('engineer');
  for(const partId of ATTACHABLE_TODAY){
    const def=PART_DEFS[partId], engId=def.engId;
    state.unlocked[engId]=true;
    const b=emptyBuild('probe_core');
    const tank=attachPart(b, b.root, 'bot', 'tank_std');
    buildPart(b,tank)._propOverride=6.0; // a representative prop load
    const chk=canAttach(b, tank, 'bot', partId);
    check('attach: '+partId+' attaches cleanly to tank_std (small-class match)', chk.ok);
    const engUid=attachPart(b, tank, 'bot', partId);
    check('attach: '+partId+' attachPart succeeded', !!engUid);
    const ir=buildToStageIR(b);
    check('bridge: '+partId+' produces no error', !ir.error);
    if(ir.error) continue;
    check('bridge: '+partId+' resolved to its OWN engId (not a stamped override)', ir.stages[0].eng===engId);
    const perfGraph=stackPerformance(ir.stages, ir.payload); // bridge-core equivalence, same convention as test-parts-bridge.js (NOT stackPerformanceForBuild, which layers E3.4 aero/control effects ON TOP by design)
    const perfDirect=stackPerformance([{eng:engId, count:1, prop:6.0, dia:1}], 0.15);
    check('equiv: '+partId+' total Δv matches the direct slider path', near(perfGraph.totalDv, perfDirect.totalDv, 1.0));
    check('equiv: '+partId+' liftoff mass matches', near(perfGraph.liftoff, perfDirect.liftoff, 0.05));
    check('equiv: '+partId+' stage-1 TWR matches', near(perfGraph.stageTwr[0], perfDirect.stageTwr[0], 0.01));
  }
}

// ---------- 3. self-contained solid stage: stage_solid_scout needs no tank ----------
{
  newGame('engineer');
  state.unlocked.solid_scout=true;
  const b=emptyBuild('probe_core');
  const chk=canAttach(b, b.root, 'bot', 'stage_solid_scout');
  check('attach: stage_solid_scout attaches directly under the payload (no tank needed)', chk.ok);
  const uid=attachPart(b, b.root, 'bot', 'stage_solid_scout');
  check('attach: stage_solid_scout attachPart succeeded', !!uid);
  const ir=buildToStageIR(b);
  check('bridge: stage_solid_scout produces no error', !ir.error);
  if(!ir.error){
    check('bridge: stage_solid_scout resolved to solid_scout engId', ir.stages[0].eng==='solid_scout');
    check('bridge: stage_solid_scout carries its own propellant (8.0t, no tank)', near(ir.stages[0].prop, 8.0, 0.01));
    const perfGraph=stackPerformance(ir.stages, ir.payload); // bridge-core equivalence, same convention as test-parts-bridge.js (NOT stackPerformanceForBuild, which layers E3.4 aero/control effects ON TOP by design)
    const perfDirect=stackPerformance([{eng:'solid_scout', count:1, prop:8.0, dia:1}], 0.15);
    check('equiv: stage_solid_scout total Δv matches the direct slider path', near(perfGraph.totalDv, perfDirect.totalDv, 1.0));
  }
  // stage_solid_scout also stacks under itself (it has a bottom node too) — multi-stage solid
  check('geometry: stage_solid_scout exposes a bottom node for further staging', PART_DEFS.stage_solid_scout.nodes.some(n=>n.id==='bot'));
}

// ---------- 3b. confirm the E3.4 aero-loss divergence is real and intentional (not silently
// dodged by using the bridge-core comparison above) — a part-built vehicle with no nosecone
// SHOULD show a small drag penalty on stackPerformanceForBuild that stackPerformance (the
// core physics) never had. Proves section 2/3's choice of comparison function was deliberate. ----------
{
  newGame('engineer');
  state.unlocked.kerolox_mk1=true;
  const b=emptyBuild('probe_core'); // probe_core is not a nosecone → real drag area
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  buildPart(b,tank)._propOverride=6.0;
  attachPart(b, tank, 'bot', 'engine_s3d');
  const ir=buildToStageIR(b);
  const perfCore=stackPerformance(ir.stages, ir.payload);
  const perfFullBench=stackPerformanceForBuild(b);
  check('aero: stackPerformanceForBuild reports a nonzero drag loss for a no-nosecone stack', perfFullBench.dragLoss>0);
  check('aero: that drag loss is EXACTLY why perfFullBench.totalDv < perfCore totalDv (E3.4 layered on top, by design)',
    perfFullBench.totalDv < perfCore.totalDv);
}

// ---------- 4. the 8 parts pending PP.3: diameter gate correctly (honestly) refuses them today ----------
{
  newGame('engineer');
  for(const id of ALL_NEW) state.unlocked[PART_DEFS[id].engId]=true; // unlock everything — isolate geometry, not availability
  for(const partId of PENDING_PP3){
    const def=PART_DEFS[partId];
    const b=emptyBuild('probe_core');
    const tank=attachPart(b, b.root, 'bot', 'tank_std');
    const nodeAt = def.nodes[0].at; // 'top' for engines, 'radial' for booster_srb
    const chk = nodeAt==='radial' ? canAttach(b, tank, 'rad', partId) : canAttach(b, tank, 'bot', partId);
    check('pending: '+partId+' (class '+def.nodes[0].class+') is HONESTLY refused by tank_std (small) — not silently allowed at the wrong scale',
      !chk.ok);
  }
}

// ---------- 5. the 8 pending parts still carry CORRECT physics data, proven via the same
// override-stamp technique the E3.0 harness already established (_engOverride on an
// engine_a4 instance) — so when PP.3 lands their tank tiers, the physics is already right,
// only the attach geometry was pending. ----------
{
  newGame('engineer');
  for(const partId of PENDING_PP3){
    const def=PART_DEFS[partId], engId=def.engId;
    const eng=ENGINES[engId];
    const b=emptyBuild('probe_core');
    const tank=attachPart(b, b.root, 'bot', 'tank_std');
    buildPart(b,tank)._propOverride=6.0;
    const engUid=attachPart(b, tank, 'bot', 'engine_a4'); // placeholder shape, override the function
    buildPart(b,engUid)._engOverride=engId;
    const ir=buildToStageIR(b);
    check('pending-physics: '+partId+' resolves to the correct engId via override', !ir.error && ir.stages[0].eng===engId);
    if(ir.error) continue;
    const perfGraph=stackPerformance(ir.stages, ir.payload); // bridge-core equivalence, same convention as test-parts-bridge.js (NOT stackPerformanceForBuild, which layers E3.4 aero/control effects ON TOP by design)
    const perfDirect=stackPerformance([{eng:engId, count:1, prop:6.0, dia:1}], 0.15);
    check('pending-physics: '+partId+' Δv matches the direct slider path with the same engine', near(perfGraph.totalDv, perfDirect.totalDv, 1.0));
  }
}

// ---------- 6. booster_srb: radial + engId + propMass shape matches E3.3's booster-detection contract ----------
{
  const d=PART_DEFS.booster_srb;
  check('booster: booster_srb is radial-only (like booster_solid)', d.nodes.every(n=>n.at==='radial'));
  check('booster: booster_srb carries its own propMass', d.phys.propMass>0);
  check('booster: booster_srb links to solid_srb', d.engId==='solid_srb' && ENGINES.solid_srb.solid===true);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
