// Tech-tree audit follow-up (2026-07-20): two capstone nodes — megastructure_construction (cost 18,
// the single most expensive node) and atmospheric_isru (cost 10) — had empty effect:{} and zero
// references anywhere else, so researching them did literally nothing. Wired both to real, capped
// economic effects matching their descriptions (megastructure = civilization-scale production →
// build cost+time; atmospheric ISRU = deep-space propellant → launch cost). Verifies they now
// contribute, and that the contribution flows through the existing diminishing-return caps.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
const byId={}; for(const n of RESEARCH) byId[n.id]=n;

// ---------- 1. both nodes now carry a non-empty effect ----------
check('megastructure_construction has a non-empty effect', Object.keys(byId.megastructure_construction.effect||{}).length>0);
check('atmospheric_isru has a non-empty effect', Object.keys(byId.atmospheric_isru.effect||{}).length>0);

// ---------- 2. effects match their fantasy (production economy / propellant economy) ----------
check('megastructure grants a build-cost cut (civilization-scale production)', byId.megastructure_construction.effect.buildCostCut>0);
check('megastructure grants a build-time cut too', byId.megastructure_construction.effect.buildTimeCut>0);
check('atmospheric_isru grants a launch-cost cut (deep-space propellant)', byId.atmospheric_isru.effect.launchCostCut>0);

// ---------- 3. researching them actually changes the effect sums the game consumes ----------
{
  newGame('engineer');
  const bccBefore=researchEffectSum('buildCostCut'), lccBefore=researchEffectSum('launchCostCut'), btcBefore=researchEffectSum('buildTimeCut');
  state.research.megastructure_construction=true;
  state.research.atmospheric_isru=true;
  check('buildCostCut sum increases after megastructure', researchEffectSum('buildCostCut')>bccBefore);
  check('buildTimeCut sum increases after megastructure', researchEffectSum('buildTimeCut')>btcBefore);
  check('launchCostCut sum increases after atmospheric_isru', researchEffectSum('launchCostCut')>lccBefore);
}

// ---------- 4. effects stay within the game's balance caps (diminishing curve, never trivialize) ----------
{
  // dimCurve is a SOFT knee: identity below the cap, then asymptotes toward ASYMP (0.80) — it never
  // reaches even that. So the real balance invariant is that no amount of research drives the cut to
  // or past the asymptote (mission economics can't be trivialized to free).
  newGame('engineer');
  for(const n of RESEARCH) state.research[n.id]=true;
  check('total build-cost cut stays below the 0.80 asymptote even with the whole tree', (1-mfgBuildMult())<0.80);
  check('total launch-cost cut stays below the 0.80 asymptote even with the whole tree', (1-groundLaunchMult())<0.80);
  check('the two capstones are additive but do NOT push the cut past the asymptote', (1-mfgBuildMult())<0.80 && (1-groundLaunchMult())<0.80);
}

// ---------- 5. the value is meaningful, not tokenistic (a capstone should be felt) ----------
check('megastructure build-cost cut is a substantial capstone value (>=0.08)', byId.megastructure_construction.effect.buildCostCut>=0.08);
check('atmospheric_isru launch-cost cut is a substantial capstone value (>=0.06)', byId.atmospheric_isru.effect.launchCostCut>=0.06);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
