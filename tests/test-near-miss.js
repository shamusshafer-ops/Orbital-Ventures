// Tier 1.2 (2026-08-04) — near-miss attribution on successful flights.
// The single most important guarantee here is BALANCE-NEUTRALITY: capturing the margin must not
// change which subsystems fail, which one governs, or the outcome. The loop now binds the draw to a
// local instead of comparing it inline, so this pins that the RNG is still consumed exactly once per
// subsystem, in the same order, with identical results.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// Deterministic RNG so outcomes are reproducible across both halves of the parity test.
function seeded(seed){ let x=seed>>>0; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }

// Build a flyable vehicle/mission pair from the game's own accessors. A hand-rolled `v` literal is
// NOT sufficient: subsystemReport() reads fields it wouldn't have and quietly returns NaN
// reliabilities, which makes `roll > NaN` false for every subsystem — every flight "succeeds", no
// margin is ever finite, and the whole suite passes while proving nothing. The sanity check below
// exists specifically to catch that failure mode.
function flightFixture(){
  return {m:curMission(), v:computeVehicle(), sim:null, crewed:false};
}

// ---------- fixture sanity: reliabilities must be finite, or every assertion below is vacuous ----------
{
  const {m,v,sim,crewed}=flightFixture();
  const rep=subsystemReport(m,v,sim,crewed,1);
  check('fixture yields subsystems', rep.subsystems.length>0);
  check('fixture reliabilities are finite numbers in (0,1]', rep.subsystems.every(s=>Number.isFinite(s.rel) && s.rel>0 && s.rel<=1));
  check('fixture R is a finite probability', Number.isFinite(rep.R) && rep.R>0 && rep.R<=1);
}

// ---------- the threshold constant exists and is the documented default ----------
{
  check('NEAR_MISS_MARGIN defined', typeof NEAR_MISS_MARGIN==='number');
  check('NEAR_MISS_MARGIN default is 0.05', NEAR_MISS_MARGIN===0.05);
}

// ---------- nearMissText() shape ----------
{
  check('nearMissText returns empty for null', nearMissText(null)==='');
  check('nearMissText returns empty for undefined', nearMissText(undefined)==='');

  const t=nearMissText({key:'structures', label:'Structures', rel:0.91, margin:0.02});
  check('nearMissText names the subsystem', /Structures/.test(t));
  check('nearMissText reports the reliability', /91%/.test(t));
  check('nearMissText reports points from failing', /2 points from failing/.test(t));
  check('nearMissText flags it as a close call', /Close call/.test(t));

  // singular vs plural
  const one=nearMissText({key:'avionics', label:'Avionics', rel:0.9, margin:0.01});
  check('nearMissText uses singular for 1 point', /1 point from failing/.test(one) && !/1 points/.test(one));

  // sub-point margins keep a decimal rather than collapsing to "0 points"
  const tiny=nearMissText({key:'avionics', label:'Avionics', rel:0.9, margin:0.003});
  check('nearMissText keeps a decimal for sub-point margins', /0\.3 points from failing/.test(tiny));
  check('nearMissText never reports "0 points"', !/\b0 points\b/.test(tiny));

  // it should NOT claim any specific investment caused the save (documented scope limit)
  const claims=/QA|research|engineer|because you|thanks to/i;
  check('nearMissText makes no per-investment causal claim', !claims.test(t));
}

// ---------- BALANCE NEUTRALITY: outcomes are identical to the pre-change roll model ----------
// Reference implementation of the ORIGINAL loop (inline compare, no margin capture). Given the same
// seeded stream and the same subsystem report, it must select the same failures and the same
// governing subsystem as the live resolveFlight does.
{
  const {m,v,sim,crewed}=flightFixture();
  let mismatches=0, compared=0, sawSuccess=false, sawFailure=false;

  for(let seed=1; seed<=300; seed++){
    const rep=subsystemReport(m,v,sim,crewed,1);

    // --- reference: original inline-compare loop ---
    const rngA=seeded(seed);
    const failedA={};
    for(const s of rep.subsystems){ if(rngA()>s.rel) failedA[s.key]=s; }
    let govA=null; for(const k of SUBSYS_PRIORITY){ if(failedA[k]){ govA=failedA[k]; break; } }

    // --- live: resolveFlight's loop, via the real function ---
    const savedRandom=Math.random;
    Math.random=seeded(seed);
    let out;
    try{ out=resolveFlight(m,v,sim,crewed,0); } finally { Math.random=savedRandom; }

    const govLive = out.subsystem||null;
    const govRef  = govA?govA.key:null;
    compared++;
    if(govLive!==govRef) mismatches++;
    if(out.kind==='success') sawSuccess=true; else sawFailure=true;
  }

  check('parity fixture actually exercised both successes and failures', sawSuccess && sawFailure);
  check(`governing subsystem identical across ${compared} seeded flights`, mismatches===0);
  if(mismatches) console.log('   mismatches:', mismatches);
}

// ---------- attribution appears only on clean successes, only under the threshold ----------
{
  const {m,v,sim,crewed}=flightFixture();
  let successWithNM=0, successTotal=0, failureWithNM=0, overThreshold=0;

  for(let seed=1; seed<=400; seed++){
    const savedRandom=Math.random;
    Math.random=seeded(seed);
    let out;
    try{ out=resolveFlight(m,v,sim,crewed,0); } finally { Math.random=savedRandom; }

    if(out.kind==='success'){
      successTotal++;
      if(out.nearMiss){
        successWithNM++;
        if(!(out.nearMiss.margin<NEAR_MISS_MARGIN)) overThreshold++;
      }
    } else if(out.nearMiss) failureWithNM++;
  }

  check('attribution never rides on a failure outcome', failureWithNM===0);
  check('every reported near miss is under the threshold', overThreshold===0);
  check('some successes carry attribution', successWithNM>0);
  check('not every success carries attribution (it stays an event)', successWithNM<successTotal);
}

// ---------- the reported subsystem is a real, surviving one ----------
{
  const {m,v,sim,crewed}=flightFixture();
  const rep=subsystemReport(m,v,sim,crewed,1);
  const validKeys=new Set(rep.subsystems.map(s=>s.key));
  let bad=0, checked=0;

  for(let seed=1; seed<=300; seed++){
    const savedRandom=Math.random;
    Math.random=seeded(seed);
    let out;
    try{ out=resolveFlight(m,v,sim,crewed,0); } finally { Math.random=savedRandom; }
    if(out.kind==='success' && out.nearMiss){
      checked++;
      const nm=out.nearMiss;
      if(!validKeys.has(nm.key)) bad++;
      else if(nm.key===out.subsystem) bad++;              // can't be the failed one on a success
      else if(!(nm.margin>=0 && nm.margin<1)) bad++;      // margin must be a sane fraction
      else if(typeof nm.label!=='string' || !nm.label) bad++;
      else if(!(nm.rel>0 && nm.rel<=1)) bad++;
    }
  }
  check('near-miss subsystems are real, surviving, and well-formed', checked>0 && bad===0);
}

// ---------- dev-forced outcomes still work and carry no attribution ----------
{
  const {m,v,sim,crewed}=flightFixture();
  for(const kind of ['success','partial','strand','loss']){
    const out=devSynthOutcome(kind,m,v,sim,crewed,0);
    check(`devSynthOutcome('${kind}') still returns that kind`, out.kind===kind);
    check(`devSynthOutcome('${kind}') carries no near-miss`, !out.nearMiss);
  }
}

// ---------- phase breakdown detail is now produced for successes too ----------
{
  const {m,v,sim,crewed}=flightFixture();
  const rep=subsystemReport(m,v,sim,crewed,1);
  const phases=flightPhaseBreakdown(rep);
  const linesClean=phaseBreakdownLines(phases, null);
  const linesFailed=phaseBreakdownLines(phases, rep.subsystems[0].key);

  check('phaseBreakdownLines produces lines with no governing subsystem', linesClean.length>0);
  check('a clean breakdown flags nothing as failed', !linesClean.join('\n').includes('FAILED'));
  check('a governed breakdown does flag the failure', linesFailed.join('\n').includes('FAILED'));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
