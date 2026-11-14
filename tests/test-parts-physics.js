// E3.4 — per-part physics depth (drag, power, control). Validates: aero drag loss is applied to
// part-built vehicles' stage-1 Δv (new physics the slider path never had), a nosecone reduces it,
// drag NEVER leaks into raw stackPerformance (equivalence-critical), power balance detects deficits,
// the no-avionics reliability penalty is real, and the whole layer stays pure + bounded.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol){ return Math.abs(a-b) <= (tol!=null?tol:0.5); }

newGame('engineer');

// ---------- 1. Aero drag loss applies to a part-built vehicle ----------
{
  const build=sliderDesignToBuild([{eng:'kerolox_mk3',count:2,prop:30,dia:1}], {crewed:false});
  const perf=stackPerformanceForBuild(build);
  check('aero: dragLoss is reported', typeof perf.dragLoss==='number');
  check('aero: dragLoss is positive for a bare stack (no nosecone)', perf.dragLoss>0);
  check('aero: totalDv reduced by exactly dragLoss vs raw', near(perf.totalDv + perf.dragLoss, stackPerformance(buildToStageIR(build).stages, buildToStageIR(build).payload).totalDv, 0.5));
  check('aero: profile exposes dragArea + hasNose', perf.aero && typeof perf.aero.dragArea==='number' && typeof perf.aero.hasNose==='boolean');
}

// ---------- 2. A nosecone cuts drag loss ----------
{
  const bare=sliderDesignToBuild([{eng:'kerolox_mk3',count:1,prop:20,dia:1}], {crewed:false});
  const bareLoss=stackPerformanceForBuild(bare).dragLoss;
  // graft a nosecone on top: replace the root payload's presence by attaching a nosecone above it
  // simplest: build a fresh stack with a nosecone as root, tank+engine below
  const nosed=emptyBuild('nosecone');
  const tank=attachPart(nosed, nosed.root, 'bot', 'tank_std'); buildPart(nosed,tank)._propOverride=20;
  const eng=attachPart(nosed, tank, 'bot', 'engine_a4'); buildPart(nosed,eng)._engOverride='kerolox_mk3'; buildPart(nosed,eng)._countOverride=1;
  const nosedPerf=stackPerformanceForBuild(nosed);
  check('nose: nosecone build is detected as hasNose', nosedPerf.aero.hasNose===true);
  check('nose: nosecone reduces drag loss vs a bare stack', nosedPerf.dragLoss < bareLoss);
}

// ---------- 3. Drag NEVER leaks into raw stackPerformance (equivalence-critical) ----------
{
  const stages=[{eng:'kerolox_mk1',count:1,prop:12,dia:1}];
  const raw1=stackPerformance(stages, 0.15);
  const build=sliderDesignToBuild(stages, {crewed:false});
  stackPerformanceForBuild(build); // running the drag path must not mutate anything global
  const raw2=stackPerformance(stages, 0.15);
  check('isolation: raw stackPerformance identical before/after the E3.4 path runs', raw1.totalDv===raw2.totalDv && raw1.liftoff===raw2.liftoff);
  check('isolation: the E3.0 equivalence harness contract is untouched (raw has no dragLoss field)', raw1.dragLoss===undefined);
}

// ---------- 4/5. Part-bench power and no-guidance checks were removed (E3.7, 2026-11-14) ----------
{
  check('removed: launch power balance (spacecraft power is the POWER_SOURCES system)', typeof buildPowerBalance==='undefined');
  check('removed: no-guidance penalty (guidance is the AVIONICS choice)', typeof buildControlProfile==='undefined' && typeof NO_AVIONICS_REL_MULT==='undefined');
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std'); attachPart(build, tank, 'bot', 'engine_a4');
  check('removed: no power-deficit warning on a probe-led rocket', !buildWarnings(build).some(w=>/power/i.test(w)));
}

// ---------- 5b. A nose mounted ABOVE the payload root counts for drag ----------
{
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std'); attachPart(build, tank, 'bot', 'engine_a4');
  const bare=buildAeroProfile(build);
  attachPart(build, build.root, 'top', 'nosecone');
  const nosed=buildAeroProfile(build);
  check('nose above root: detected', nosed.hasNose===true && bare.hasNose===false);
  check('nose above root: drag loss falls', nosed.lossFrac < bare.lossFrac);
  check('payload root top: a tank is refused there', canAttach(emptyBuild('probe_core'), emptyBuild('probe_core').root, 'top', 'tank_std').ok===false);
}

// ---------- 6. Drag loss is bounded (never a cliff) ----------
{
  // even an absurdly draggy stack can't lose more than the cap
  const build=sliderDesignToBuild([{eng:'a4',count:1,prop:8,dia:1}], {crewed:false});
  const perf=stackPerformanceForBuild(build);
  const rawS1=stackPerformance(buildToStageIR(build).stages, buildToStageIR(build).payload).stageDv[0];
  check('bounded: stage-1 drag loss never exceeds the AERO_LOSS_CAP fraction', perf.dragLoss <= rawS1*AERO_LOSS_CAP + 0.01);
  check('bounded: stage-1 Δv stays non-negative', perf.stageDv[0]>=0);
}

// ---------- 7. Whole layer is pure — no global mutation (state.boosters sentinel survives) ----------
{
  const saved=state.boosters;
  state.boosters={eng:'a4', count:7, prop:7};
  const build=sliderDesignToBuild([{eng:'kerolox_mk1',count:1,prop:12,dia:1}], {crewed:true});
  stackPerformanceForBuild(build);
  buildAeroProfile(build);
  check('purity: state.boosters sentinel intact after all E3.4 calls', JSON.stringify(state.boosters)===JSON.stringify({eng:'a4',count:7,prop:7}));
  state.boosters=saved;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
