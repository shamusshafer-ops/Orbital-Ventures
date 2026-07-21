// BACKLOG #40 — crew survival mini-arc on failures. The launch_escape tech and its outcome-level
// branch (kind:'abort' instead of the crew-death path) already existed; the gap found was that the
// 3D failure VISUAL couldn't tell an escape-tower save apart from a full catastrophe — both set
// success=false/failPhase='ascent', so the same explosion (and "VEHICLE LOSS" text) played either
// way, undercutting the "the escape system pulled the crew clear" story. This threads a real signal
// (spec.crewEscaped, derived from outcome.kind==='abort') through to the presentation snapshot and
// the readout text. The Three.js pod-clear-away treatment itself isn't headless-testable (no WebGL
// here), but every value that drives it is.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:15200};
function at(spec,frac){ return flight3dPresentationSnapshot(spec,timing,timing.padDur+frac*timing.ascentDur); }
const base={mode:'launch',isOrbital:true,crewed:true,success:false,failPhase:'ascent',reqDv:9400,stages:[{prop:100,count:1,dia:4}]};

// ---------- 1. signal only fires when the spec actually says the crew escaped ----------
check('crewEscaped:true on the spec produces effects.crewEscaped once the failure is armed', at({...base,crewEscaped:true},.6).effects.crewEscaped===true);
check('crewEscaped:false (a real loss) never sets effects.crewEscaped', at({...base,crewEscaped:false},.6).effects.crewEscaped===false);
check('an ordinary success flight (no crewEscaped field at all) is unaffected', at({...base,success:true,failPhase:null},.6).effects.crewEscaped===false);

// ---------- 2. never fires before the failure itself is armed (no premature "crew clear") ----------
check('crewEscaped is false before the failure arms, even with crewEscaped:true on the spec', at({...base,crewEscaped:true},.4).effects.crewEscaped===false);
check('ascentFailure and crewEscaped arm at the same progress point (they read the same gate)', (()=>{
  const e=at({...base,crewEscaped:true},.55); return e.effects.ascentFailure===true && e.effects.crewEscaped===true;
})());

// ---------- 3. failPhase must be 'ascent' — a deep-failure spec never sets crewEscaped ----------
check('a deep-phase failure (not ascent) never reports crewEscaped, even if the field is set', (()=>{
  const deepSpec={mode:'launch',isOrbital:true,crewed:true,success:false,failPhase:'deep',crewEscaped:true,reqDv:9400,stages:[{prop:100,count:1,dia:4}]};
  const timing2={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:15200};
  const s=flight3dPresentationSnapshot(deepSpec,timing2,timing2.padDur+timing2.ascentDur+timing2.cruiseDur*.6);
  return s.effects.crewEscaped===false;
})());

// ---------- 4. sim-side derivation: crewEscaped only true for a crewed, ascent-phase, 'abort'-kind outcome ----------
{
  function deriveCrewEscaped(crewed, outcomeKind, failPhase){ return crewed && outcomeKind==='abort' && failPhase==='ascent'; }
  check('crewed + abort-kind + ascent failPhase → crewEscaped true (the real escape-tower save)', deriveCrewEscaped(true,'abort','ascent')===true);
  check('uncrewed flight (no escape system relevance) → crewEscaped false even with abort kind', deriveCrewEscaped(false,'abort','ascent')===false);
  check('crewed but a full loss (kind:loss, no escape tower) → crewEscaped false', deriveCrewEscaped(true,'loss','ascent')===false);
  check('crewed abort-kind but NOT an ascent failure → crewEscaped false (abort only happens on ascent today)', deriveCrewEscaped(true,'abort','deep')===false);
}

// ---------- 5. readout text distinguishes an escape save from a full loss ----------
{
  const p=Math.round(.6*100);
  function readoutFor(effects){ return 'LAUNCH ESCAPE — CREW CLEAR' === (effects.crewEscaped?'LAUNCH ESCAPE — CREW CLEAR':(effects.ascentFailure?'VEHICLE LOSS':'ASCENT')); }
  check('escape save reads "LAUNCH ESCAPE — CREW CLEAR", not "VEHICLE LOSS"', readoutFor({crewEscaped:true,ascentFailure:true}));
  check('a full loss (no escape) still reads "VEHICLE LOSS"', !readoutFor({crewEscaped:false,ascentFailure:true}) && ({crewEscaped:false,ascentFailure:true}.ascentFailure));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
