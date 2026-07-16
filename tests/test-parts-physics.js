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

// ---------- 4. Power balance detects a deficit ----------
{
  // probe_core draws power; nothing generates it -> deficit
  const build=emptyBuild('probe_core');
  const tank=attachPart(build, build.root, 'bot', 'tank_std');
  attachPart(build, tank, 'bot', 'engine_a4');
  const bal=buildPowerBalance(build);
  check('power: draw is positive (probe core draws)', bal.draw>0);
  check('power: gen is zero (no generation part in the viable set)', bal.gen===0);
  check('power: deficit reported', bal.deficit>0);
  check('power: a deficit warning is surfaced', buildWarnings(build).some(w=>w.includes('Power deficit')));
}

// ---------- 5. No-avionics reliability penalty is real ----------
{
  // build with avionics (probe core) -> mult 1
  const withA=emptyBuild('probe_core');
  const t1=attachPart(withA, withA.root, 'bot', 'tank_std'); attachPart(withA, t1, 'bot', 'engine_a4');
  check('control: build WITH avionics has relMult 1', buildControlProfile(withA).relMult===1);
  check('control: hasAvionics true', buildControlProfile(withA).hasAvionics===true);

  // build with NO avionics (tank + engine only) -> penalty
  const noA={parts:[{uid:'t',defId:'tank_std',x:0,y:0,rot:0,sym:1}], links:[], root:'t'};
  attachPart(noA, 't', 'bot', 'engine_a4');
  check('control: build WITHOUT avionics has relMult < 1', buildControlProfile(noA).relMult<1);
  check('control: relMult equals NO_AVIONICS_REL_MULT', buildControlProfile(noA).relMult===NO_AVIONICS_REL_MULT);
  check('control: no-avionics warning mentions the reliability hit', buildWarnings(noA).some(w=>w.includes('reliability')));
  check('control: perf exposes the control profile', stackPerformanceForBuild(noA).control && stackPerformanceForBuild(noA).control.relMult<1);
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
  buildAeroProfile(build); buildPowerBalance(build); buildControlProfile(build);
  check('purity: state.boosters sentinel intact after all E3.4 calls', JSON.stringify(state.boosters)===JSON.stringify({eng:'a4',count:7,prop:7}));
  state.boosters=saved;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
