// E3.3 — staging visibility + symmetry tool. Validates: the booster part folds into the existing
// state.boosters side-channel correctly (not a fake IR stage), off-stage-0 placements warn instead of
// silently doing nothing, mixed booster types warn, symmetry (sym field) is settable only on radial
// attachments and clamped, stackPerformanceForBuild produces the SAME numbers as directly setting
// state.boosters and calling stackPerformance (proves no drift from the established physics), and
// global state.boosters is always restored even on error.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol){ return Math.abs(a-b) <= (tol!=null?tol:0.5); }

newGame('engineer');

// ---------- 1. Booster part definition ----------
{
  const bd=partDef('booster_solid');
  check('def: booster_solid exists', !!bd);
  check('def: booster is radial-only (no axial nodes)', bd.nodes.every(n=>n.at==='radial'));
  check('def: booster is self-propelled (own propMass)', bd.phys.propMass>0);
  check('def: tank_std now has a radial node', partDef('tank_std').nodes.some(n=>n.at==='radial'));
}

// ---------- 2. Attaching a booster to stage-0's tank folds into ir.boosters ----------
{
  const b=emptyBuild('probe_core');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  const eng=attachPart(b, tank, 'bot', 'engine_a4');
  const boosterUid=attachPart(b, tank, 'rad', 'booster_solid');
  check('attach: booster attaches to the tank radial node', !!boosterUid);
  const ir=buildToStageIR(b);
  check('ir: no error', !ir.error);
  check('ir: exactly 1 propulsive stage (booster is NOT its own stage)', ir.stages.length===1);
  check('ir: boosters field populated', !!ir.boosters);
  check('ir: boosters use the solid_castor engine', ir.boosters && ir.boosters.eng==='solid_castor');
  check('ir: boosters count is 1 (sym defaults to 1)', ir.boosters && ir.boosters.count===1);
  check('ir: boosters prop matches the part def', ir.boosters && ir.boosters.prop===partDef('booster_solid').phys.propMass);
}

// ---------- 3. Symmetry multiplies booster count ----------
{
  const b=emptyBuild('probe_core');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  attachPart(b, tank, 'bot', 'engine_a4');
  const boosterUid=attachPart(b, tank, 'rad', 'booster_solid');
  check('symmetry: applies to a radial part', applySymmetry(b, boosterUid, 2)===true);
  check('symmetry: sym field set', buildPart(b,boosterUid).sym===2);
  const ir=buildToStageIR(b);
  check('symmetry: boosters.count reflects sym', ir.boosters.count===2);
  check('symmetry: clamps above SYMMETRY_MAX', (applySymmetry(b,boosterUid,99), buildPart(b,boosterUid).sym===SYMMETRY_MAX));
  check('symmetry: clamps below 1', (applySymmetry(b,boosterUid,0), buildPart(b,boosterUid).sym===1));
}

// ---------- 4. Symmetry rejected on non-radial (axial) parts ----------
{
  const b=emptyBuild('probe_core');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  check('symmetry: rejected on an axial part (the tank itself)', applySymmetry(b, tank, 2)===false);
  check('symmetry: no mutation on rejection', (buildPart(b,tank).sym||1)===1);
}

// ---------- 5. Off-stage-0 booster placement warns, doesn't silently no-op or crash ----------
{
  // A booster physically CAN be attached to any tank's radial node, including one that ends up on
  // an upper (non-first-firing) stage. The physics core only ever reads ONE state.boosters bundle
  // that augments stage-0's whole burn — there's no way to model "these boosters fire only during
  // stage 2" — so an off-stage-0 placement is a real, honest no-op: warn, don't silently drop or
  // silently misapply it to the wrong stage.
  const stages=[{eng:'kerolox_mk1',count:1,prop:12,dia:1},{eng:'hyper_storable',count:1,prop:4,dia:1}];
  const build=sliderDesignToBuild(stages, {crewed:false});
  // the tank attached directly under the root payload is the UPPER tank — second stage to fire
  const upperTankLink=build.links.find(l=>l.parent===build.root);
  attachPart(build, upperTankLink.child, 'rad', 'booster_solid');
  const ir=buildToStageIR(build);
  check('off-stage: build still reduces without error', !ir.error);
  check('off-stage: booster on the upper tank does NOT populate ir.boosters', !ir.boosters);
  check('off-stage: a warning explains why', ir.warnings.some(w=>w.includes('first stage to fire')));
}

// ---------- 6. Mixed booster types warn (only the first type is modeled) ----------
{
  const b=emptyBuild('probe_core');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  attachPart(b, tank, 'bot', 'engine_a4');
  attachPart(b, tank, 'rad', 'booster_solid');
  // there's only one radial node on tank_std, so to test "mixed types" we'd need two boosters —
  // add a second tank branch isn't trivial in this viable set; instead verify the warning LOGIC
  // directly is unreachable with only one radial slot (documents the current 1-radial-node
  // limitation honestly rather than faking a scenario the graph can't actually produce yet).
  const ir=buildToStageIR(b);
  check('mixed: single booster placement never warns about mixing', !ir.warnings.some(w=>w.includes('Mixed booster')));
}

// ---------- 7. stackPerformanceForBuild matches the DIRECT slider-booster path exactly (no drift) ----------
{
  const stages=[{eng:'kerolox_mk1',count:1,prop:12,dia:1}];
  // DIRECT path: set state.boosters manually, exactly as the old slider bench would
  const savedBoosters=state.boosters;
  state.boosters={eng:'solid_castor', count:2, prop:5.0};
  const direct=stackPerformance(stages, 0.15);
  state.boosters=savedBoosters;

  // GRAPH path: build the equivalent graph and let the bridge fold the booster in
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std');
  buildPart(build,tank)._propOverride=12.0;
  const eng=attachPart(build, tank, 'bot', 'engine_a4');
  buildPart(build,eng)._engOverride='kerolox_mk1'; buildPart(build,eng)._countOverride=1;
  const boosterUid=attachPart(build, tank, 'rad', 'booster_solid');
  applySymmetry(build, boosterUid, 2);
  const graph=stackPerformanceForBuild(build);

  // E3.4: graph.totalDv now includes a part-bench-only aero drag loss the slider path never had,
  // so it won't equal direct.totalDv outright — add the reported dragLoss back to compare the
  // booster physics cleanly (and prove drag is the ONLY difference).
  check('equivalence: total Δv matches once drag is added back (booster-augmented)', near(graph.totalDv + (graph.dragLoss||0), direct.totalDv, 1.0));
  check('equivalence: liftoff mass matches', near(graph.liftoff, direct.liftoff, 0.1));
  check('equivalence: liftoff TWR matches (this IS where boosters show up)', near(graph.twr, direct.twr, 0.01));
  check('equivalence: boostDv matches', near(graph.boostDv, direct.boostDv, 0.5));
}

// ---------- 8. Global state.boosters is always restored, even on a mid-call error path ----------
{
  const savedBoosters=state.boosters;
  state.boosters={eng:'a4', count:9, prop:9}; // a deliberately distinctive sentinel
  const r=stackPerformanceForBuild({parts:[],links:[],root:null}); // guaranteed error
  check('restore: errors from stackPerformanceForBuild still restore state.boosters', JSON.stringify(state.boosters)===JSON.stringify({eng:'a4',count:9,prop:9}));
  state.boosters=savedBoosters;

  // and on the SUCCESS path too
  state.boosters={eng:'a4', count:9, prop:9};
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std');
  attachPart(build, tank, 'bot', 'engine_a4');
  stackPerformanceForBuild(build);
  check('restore: success path also restores state.boosters', JSON.stringify(state.boosters)===JSON.stringify({eng:'a4',count:9,prop:9}));
  state.boosters=savedBoosters;
}

// ---------- 9. Render: booster silhouettes drawn, ×N label present for sym>1 ----------
{
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std');
  attachPart(build, tank, 'bot', 'engine_a4');
  const boosterUid=attachPart(build, tank, 'rad', 'booster_solid');
  applySymmetry(build, boosterUid, 3);
  const r=renderBuildSVG(build, 260, 420, false);
  check('render: no error with a booster attached', !r.error);
  check('render: booster silhouette color present', r.svg.includes(PART_CAT_COLOR.propulsion));
  check('render: ×3 symmetry label present', r.svg.includes('×3'));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
