// E4.7 — deep (in-space) failure stays in the 3D renderer (2026-07-20). A strand/loss that happens
// after reaching orbit or cislunar cruise used to cut to the flat 2D fallback at the flight's most
// dramatic beat; now the orbit/transfer presentation freezes the craft at the loss point and
// tumbles it dead-and-dark. This suite covers the pure signal (snapshot.effects.deepFailure) and
// the profile freeze/dead-stick behavior it drives. The Three.js tumble render itself isn't
// headless-testable (no WebGL here), but every value it keys off is.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(4)} vs ${(+b).toFixed(4)} ±${tol})`,Math.abs(a-b)<=tol); }

const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:15200};
function cruiseSnap(spec,frac){ return flight3dPresentationSnapshot(spec,timing,timing.padDur+timing.ascentDur+frac*timing.cruiseDur); }
const orbitFail   ={mode:'launch',isOrbital:true, crewed:false,success:false,failPhase:'deep',  reqDv:9400, stages:[{prop:100,count:1,dia:4}]};
const cislunarFail={mode:'launch',isCislunar:true, crewed:true, success:false,failPhase:'deep',  reqDv:12000,stages:[{prop:100,count:1,dia:4}]};
const orbitOK     ={mode:'launch',isOrbital:true, crewed:false,success:true, failPhase:null,    reqDv:9400, stages:[{prop:100,count:1,dia:4}]};
const ascentFail  ={mode:'launch',isOrbital:true, crewed:false,success:false,failPhase:'ascent',reqDv:9400, stages:[{prop:100,count:1,dia:4}]};

// ---------- 1. the deepFailure signal arms only for a deep fail, only past the freeze fraction ----------
{
  const before=cruiseSnap(orbitFail,.30), at=cruiseSnap(orbitFail,.42), after=cruiseSnap(orbitFail,.80);
  check('deepFailure is NOT armed before the freeze fraction', before.effects.deepFailure===false);
  check('deepFailure arms at the freeze fraction', at.effects.deepFailure===true);
  check('deepFailure stays armed after the freeze fraction', after.effects.deepFailure===true);
  near(before.effects.deepFailureFrac, .42, 1e-9, 'freeze fraction is exposed on the snapshot (0.42, matching the 2D renderer)');
  check('deepFailureProgress is 0 at the freeze point and ramps after', at.effects.deepFailureProgress===0 && after.effects.deepFailureProgress>0);
  check('deepFailureProgress reaches 1 well before the coast ends', cruiseSnap(orbitFail,.80).effects.deepFailureProgress===1);
  check('failPhase is passed through onto the snapshot', at.failPhase==='deep');
}

// ---------- 2. a SUCCESSFUL flight never arms the deep-failure signal ----------
{
  for(const f of [.3,.42,.6,.9]) check('successful orbit never arms deepFailure at frac '+f, cruiseSnap(orbitOK,f).effects.deepFailure===false);
  check('a successful orbit runs its full progress (not frozen)', cape3dOrbitProfile(cruiseSnap(orbitOK,.9)).progress>.85);
  check('a successful orbit is never dead-stick', cape3dOrbitProfile(cruiseSnap(orbitOK,.9)).deadStick===false);
}

// ---------- 3. an ASCENT failure does NOT trigger the deep-failure path (different beat) ----------
{
  // ascent failures are handled in the ascent phase; they must not also flag deepFailure in cruise
  const s=cruiseSnap(ascentFail,.8);
  check('an ascent-fail spec does not arm deepFailure in the cruise phase', s.effects.deepFailure===false);
}

// ---------- 4. orbit profile freezes + goes dead-stick at the loss point ----------
{
  const p30=cape3dOrbitProfile(cruiseSnap(orbitFail,.30)), p42=cape3dOrbitProfile(cruiseSnap(orbitFail,.42)), p80=cape3dOrbitProfile(cruiseSnap(orbitFail,.80));
  check('orbit progresses normally before the loss', p30.deadStick===false && p30.progress>.29);
  check('orbit is dead-stick from the loss point', p42.deadStick===true && p80.deadStick===true);
  near(p80.progress, .42, 1e-6, 'orbit progress is FROZEN at the freeze fraction after loss (craft strands, does not complete the orbit)');
  check('orbit engine burn is cut on a dead-stick', p80.burn===0);
  check('orbit failProgress ramps after the loss (drives the tumble build)', p80.failProgress>0);
}

// ---------- 5. cislunar transfer profile freezes + goes dead-stick identically ----------
{
  const t30=cape3dTransferProfile(cruiseSnap(cislunarFail,.30)), t42=cape3dTransferProfile(cruiseSnap(cislunarFail,.42)), t80=cape3dTransferProfile(cruiseSnap(cislunarFail,.80));
  check('transfer progresses normally before the loss', t30.deadStick===false);
  check('transfer is dead-stick from the loss point', t42.deadStick===true && t80.deadStick===true);
  near(t80.progress, .42, 1e-6, 'transfer progress is FROZEN at the freeze fraction after loss (craft strands mid-transfer)');
  check('transfer burn + arrival are both cut on a dead-stick', t80.burn===0 && t80.arrival===0);
  check('transfer failProgress ramps after the loss', t80.failProgress>0);
}

// ---------- 6. a successful cislunar transfer still reaches arrival (no false strand) ----------
{
  const okCislunar={mode:'launch',isCislunar:true,crewed:true,success:true,failPhase:null,reqDv:12000,stages:[{prop:100,count:1,dia:4}]};
  const tEnd=cape3dTransferProfile(cruiseSnap(okCislunar,.95));
  check('a successful transfer is not dead-stick', tEnd.deadStick===false);
  check('a successful transfer still produces an arrival cue near the end', tEnd.arrival>0);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
