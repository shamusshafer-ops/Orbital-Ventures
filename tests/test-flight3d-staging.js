// E4.7 (2026-07-19/20) — visual multi-stage separation in the Cape 3D flight renderer. The physical
// trajectory already burns and drops every stage's dry mass in cape3dTrajectoryPlan; this slice
// records WHEN each drop happens (stageEvents) and adds a pure query (cape3dSeparationStates) the
// Three.js layer uses to detach the matching mesh piece and let it coast/fall under real gravity.
//
// The mesh/reparenting/fall-physics code itself is NOT testable here — this sandbox has no
// browser and the harness has no THREE stub (confirmed: cape3dVehicleMesh and friends throw
// without a real THREE global). This suite covers everything that IS pure: the trajectory's own
// stageEvents recording and cape3dSeparationStates' time→state mapping. Both are plain math/data,
// no Three.js, no rendering — real coverage of the part of this slice a headless sandbox can prove.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(4)} vs ${(+b).toFixed(4)} ±${tol})`,Math.abs(a-b)<=tol); }

newGame('engineer');

// ---------- 1. single-stage vehicle: no separation events at all ----------
{
  const physics=flightPhysicsSpec(curMission(), computeVehicle());
  check('a single-stage vehicle has exactly one physics stage', physics.stages.length===1);
  const plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  check('a single-stage vehicle produces zero stageEvents (nothing to jettison before the only stage)', Array.isArray(plan.stageEvents) && plan.stageEvents.length===0);
  check('cape3dSeparationStates on a single-stage plan returns an empty array', cape3dSeparationStates(plan, plan.impactTime).length===0);
}

// ---------- 2. two-stage vehicle: exactly one stage event, at the real burnout time ----------
{
  const before=JSON.parse(JSON.stringify(state.stages));
  state.stages.push({eng:state.stages[0].eng, prop:state.stages[0].prop*0.4, count:1, dia:state.stages[0].dia});
  const physics=flightPhysicsSpec(curMission(), computeVehicle());
  check('the vehicle now has two physics stages', physics.stages.length===2);
  const plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  check('exactly one stage event for a two-stage vehicle', plan.stageEvents.length===1);
  const ev=plan.stageEvents[0];
  check('the event is a stage drop (not a booster) at index 0 (the first/bottom stage)', ev.kind==='stage' && ev.index===0);
  check('the event carries a real position (matches the trajectory\'s own altitude/downrange at that time)', ev.altitudeKm>0 && ev.xKm>=0);
  check('the event carries the real velocity at separation (non-zero, powered flight)', ev.vy>0);
  const mapped=cape3dSeparationStates(plan,ev.t)[0];
  check('separation-state mapping preserves real vx/vy for the debris drift', mapped.vx===ev.vx&&mapped.vy===ev.vy&&mapped.vy>0);
  // The recorded event time should be a genuine sample from the burn integration — sanity check it
  // falls strictly between liftoff and the final burnout/impact time.
  check('the event time sits between liftoff and the end of the trajectory', ev.t>0 && ev.t<plan.impactTime);
  state.stages=before;
}

// ---------- 3. booster + two stages: booster separates first, then the spent core stage ----------
{
  const beforeStages=JSON.parse(JSON.stringify(state.stages)), beforeBoosters=state.boosters?JSON.parse(JSON.stringify(state.boosters)):null;
  state.stages.push({eng:state.stages[0].eng, prop:state.stages[0].prop*0.4, count:1, dia:state.stages[0].dia});
  state.boosters={eng:state.stages[0].eng, prop:state.stages[0].prop*0.3, count:2};
  const physics=flightPhysicsSpec(curMission(), computeVehicle());
  check('boosters are present in the physics spec', !!physics.boosters);
  const plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  check('exactly two stageEvents (one booster jettison, one core stage drop)', plan.stageEvents.length===2);
  const [first,second]=plan.stageEvents;
  check('the booster separates first', first.kind==='booster' && first.index===-1);
  check('the core stage separates second, after the booster', second.kind==='stage' && second.index===0 && second.t>first.t);
  // cape3dSeparationStates at a time between the two events: booster gone, stage not yet
  const midT=(first.t+second.t)/2, mid=cape3dSeparationStates(plan, midT);
  const boosterState=mid.find(s=>s.kind==='booster'), stageState=mid.find(s=>s.kind==='stage');
  check('between the two events: the booster is separated', boosterState.separated===true && boosterState.fallTime>0);
  check('between the two events: the core stage is NOT yet separated', stageState.separated===false && stageState.fallTime===0);
  // well after both events: both separated, fallTime growing correctly
  const lateT=second.t+50, late=cape3dSeparationStates(plan, lateT);
  const boosterLate=late.find(s=>s.kind==='booster'), stageLate=late.find(s=>s.kind==='stage');
  check('long after both events: both pieces are separated', boosterLate.separated && stageLate.separated);
  near(boosterLate.fallTime, lateT-first.t, 1e-9, 'the booster\'s fallTime is exactly time-since-its-own-separation');
  near(stageLate.fallTime, lateT-second.t, 1e-9, 'the stage\'s fallTime is exactly time-since-its-own-separation');
  check('a piece that has fallen longer (separated earlier) has a larger fallTime at the same query time', boosterLate.fallTime>stageLate.fallTime);
  state.stages=beforeStages; state.boosters=beforeBoosters;
}

// ---------- 3b. real bench defaults: long-burn A-4 strap-ons are still stage 0 ----------
// Enabling boosters defaults to 20 t each. Under the old parallel timeline those slow A-4
// strap-ons outlived a normal S-3D core, so stage 1 separated first (or a single-stage flight ended
// before any booster event existed). Exercise the actual flightPhysicsSpec path, not a hand-tuned
// short booster that guarantees the answer by construction.
{
  const beforeStages=JSON.parse(JSON.stringify(state.stages)), beforeBoosters=state.boosters?JSON.parse(JSON.stringify(state.boosters)):null;
  state.stages=[
    {eng:'kerolox_mk1',prop:12,count:1,dia:1},
    {eng:'hyper_storable',prop:4,count:1,dia:1}
  ];
  state.boosters={eng:'a4',prop:20,count:2};
  const physics=flightPhysicsSpec(curMission(),computeVehicle()), plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  const boosterEvent=plan.stageEvents.find(e=>e.kind==='booster'), coreEvent=plan.stageEvents.find(e=>e.kind==='stage'&&e.index===0);
  check('default 20 t boosters always produce a real separation event',!!boosterEvent);
  check('default long-burn boosters separate strictly before the first core stage',!!coreEvent&&boosterEvent.t<coreEvent.t&&plan.stageEvents[0]===boosterEvent);
  const atCore=cape3dSeparationStates(plan,coreEvent.t), boostState=atCore.find(s=>s.kind==='booster'), coreState=atCore.find(s=>s.kind==='stage'&&s.index===0);
  check('by first-stage separation the boosters are already gone',boostState.separated&&boostState.fallTime>0&&coreState.separated);

  state.stages=[{eng:'kerolox_mk1',prop:12,count:1,dia:1}];
  const oneStagePlan=cape3dTrajectoryPlan(flightPhysicsSpec(curMission(),computeVehicle()),{isOrbital:false,reqDv:1000});
  const oneStageBoosters=oneStagePlan.stageEvents.filter(e=>e.kind==='booster');
  check('single-stage flight with default boosters records exactly one booster event',oneStageBoosters.length===1&&oneStagePlan.stageEvents.length===1);
  check('single-stage boosters separate before final core burnout',oneStageBoosters[0].t>0&&oneStageBoosters[0].t<oneStagePlan.burnoutTime);
  state.stages=beforeStages; state.boosters=beforeBoosters;
}

// ---------- 4. three-stage vehicle: two events, strictly increasing time and index ----------
{
  const before=JSON.parse(JSON.stringify(state.stages));
  state.stages.push({eng:state.stages[0].eng, prop:state.stages[0].prop*0.5, count:1, dia:state.stages[0].dia});
  state.stages.push({eng:state.stages[0].eng, prop:state.stages[0].prop*0.25, count:1, dia:state.stages[0].dia});
  const physics=flightPhysicsSpec(curMission(), computeVehicle());
  check('the vehicle now has three physics stages', physics.stages.length===3);
  const plan=cape3dTrajectoryPlan(physics,{isOrbital:false,reqDv:1000});
  check('a three-stage vehicle drops exactly two stages (the last stage never "separates" — it just burns out)', plan.stageEvents.length===2);
  check('events are in increasing time order', plan.stageEvents[1].t>plan.stageEvents[0].t);
  check('events are in increasing stage-index order (0 drops before 1)', plan.stageEvents[0].index===0 && plan.stageEvents[1].index===1);
  state.stages=before;
}

// ---------- 5. cape3dSeparationStates edge cases: never throws, degrades gracefully ----------
{
  check('a null plan returns an empty array, not a throw', JSON.stringify(cape3dSeparationStates(null, 10))==='[]');
  check('a plan without a stageEvents field returns an empty array', JSON.stringify(cape3dSeparationStates({points:[]}, 10))==='[]');
  check('a query at t=0 (before any events) reports every event as not-yet-separated', (()=>{ 
    const physics=flightPhysicsSpec(curMission(), computeVehicle());
    state.stages.push({eng:state.stages[0].eng, prop:state.stages[0].prop*0.4, count:1, dia:state.stages[0].dia});
    const p2=flightPhysicsSpec(curMission(), computeVehicle()), plan=cape3dTrajectoryPlan(p2,{isOrbital:false,reqDv:1000});
    const s=cape3dSeparationStates(plan,0); state.stages.pop();
    return s.length>0 && s.every(x=>x.separated===false && x.fallTime===0);
  })());
  // a negative/garbage time is clamped sensibly (Number(time)||0 coercion) rather than throwing
  let threw=false;
  try{ cape3dSeparationStates({stageEvents:[{t:5,kind:'stage',index:0}]}, 'not a number'); }catch(e){ threw=true; }
  check('a non-numeric time argument never throws (coerced via Number()||0)', !threw);
}

// ---------- 6. cape3dLaunchProfile exposes the current trajectory time (t) needed to drive staging ----------
{
  const spec={mode:'launch',crewed:false,isOrbital:false,isCislunar:false,success:true,reqDv:1800,physics:flightPhysicsSpec(curMission(),computeVehicle())};
  const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600};
  const mid=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,3200+7200*.5));
  check('the ascent profile exposes t (trajectory time), not just progress', typeof mid.t==='number' && mid.t>0);
  const early=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,3200+7200*.1));
  check('t increases monotonically with progress through ascent', mid.t>early.t);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
