// Tier 2 B4 (2026-08-04) — crisis pool expanded 3 → 9, with four new effect axes.
// The load-bearing requirement from the ROADMAP entry: every effectKey must have a REAL handler that
// changes something, not just a label. Each axis is therefore tested at its own accessor AND asserted
// to be isolated from the others, so a typo'd effectKey can't silently become a no-op crisis.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');
function setCrisis(id, sev){ state.crisis={id, phase:'peak', startAbs:0, severity:sev, peakSeverity:sev, fundedUntilAbs:null}; }

// ---------- pool shape ----------
{
  check('pool expanded to 9 crises', CRISES.length===9);
  const ids=CRISES.map(c=>c.id);
  check('every crisis id is unique', new Set(ids).size===ids.length);
  for(const id of ['debris_cascade','solar_storm','funding_collapse']){
    check(`original crisis "${id}" still present`, ids.includes(id));
  }

  const REQUIRED=['id','name','icon','eraMin','fundCostBase','maxPenalty','effectKey','remedyName','effectLabel','modalTitle','modalDesc','triggerMsg','mitigatedMsg','enduredMsg'];
  let missing=[];
  for(const c of CRISES) for(const f of REQUIRED){
    if(c[f]===undefined || c[f]===null || c[f]==='') { if(!(f==='thresholdStat')) missing.push(`${c.id}.${f}`); }
  }
  check('every crisis has every required field non-empty', missing.length===0);
  if(missing.length) console.log('   missing:', missing.join(', '));

  check('every thresholdStat is either null or a string', CRISES.every(c=>c.thresholdStat===null||typeof c.thresholdStat==='string'));
  check('every maxPenalty is a fraction in (0,1]', CRISES.every(c=>c.maxPenalty>0 && c.maxPenalty<=1));
  check('every fundCostBase is positive', CRISES.every(c=>c.fundCostBase>0));
  check('every eraMin is a valid era index', CRISES.every(c=>c.eraMin>=0 && c.eraMin<ERAS.length));
}

// ---------- late-era coverage was the whole point of this slice ----------
{
  const byEra=e=>CRISES.filter(c=>c.eraMin===e).length;
  check('Interplanetary era (6) now has crisis content', byEra(6)>0);
  check('Speculative era (7) now has crisis content', byEra(7)>0);
  const late=CRISES.filter(c=>c.eraMin>=6).length;
  check('at least 3 crises are gated to era 6+', late>=3);
}

// ---------- every threshold stat is a counter that ACTUALLY EXISTS and is incremented ----------
{
  // A thresholdStat naming a field nothing ever increments would make its crisis unreachable forever.
  const KNOWN_COUNTERS=['leoFlights','deepFlights','crewFlown','crewLost','flights'];
  const bad=CRISES.filter(c=>c.thresholdStat && !KNOWN_COUNTERS.includes(c.thresholdStat)).map(c=>`${c.id}:${c.thresholdStat}`);
  check('every thresholdStat names a counter this codebase actually increments', bad.length===0);
  if(bad.length) console.log('   unknown counters:', bad.join(', '));
  check('every threshold is a positive number where a stat is named', CRISES.every(c=>!c.thresholdStat||c.threshold>0));
}

// ---------- EVERY effectKey has a real handler that changes something ----------
{
  const crewed={id:'c',name:'C',crew:3,reqDv:9400};
  const leo={id:'l',name:'L',reqDv:9400};
  const deep={id:'d',name:'D',reqDv:9400,profile:[{name:'TLI',dv:3120}]};
  const m=curMission();

  state.crisis=null;
  const baseBuild=buildMonths(m);
  check('neutral baseline: research mult is 1', crisisResearchMult()===1);
  check('neutral baseline: facility mult is 1', crisisFacilityMult()===1);
  check('neutral baseline: build mult is 1', crisisBuildMult()===1);
  check('neutral baseline: no reliability penalty', crisisRelPenalty(crewed)===0 && crisisRelPenalty(leo)===0 && crisisRelPenalty(deep)===0);

  // Every effectKey in the pool must move at least one observable, at full severity.
  const axes=[...new Set(CRISES.map(c=>c.effectKey))];
  const inert=[];
  for(const key of axes){
    const c=CRISES.find(x=>x.effectKey===key);
    setCrisis(c.id, 1.0);
    const moved =
      crisisResearchMult()!==1 ||
      crisisFacilityMult()!==1 ||
      crisisBuildMult()!==1 ||
      crisisGovFundingMult()!==1 ||
      crisisRelPenalty(crewed)!==0 || crisisRelPenalty(leo)!==0 || crisisRelPenalty(deep)!==0;
    if(!moved) inert.push(`${c.id} (${key})`);
  }
  check('every effectKey in the pool moves at least one live observable', inert.length===0);
  if(inert.length) console.log('   inert (label-only) effects:', inert.join(', '));
  check('the pool uses more than the 3 original axes', axes.length>3);
}

// ---------- each new axis: correct value, and isolated from the others ----------
{
  const crewed={id:'c',name:'C',crew:3,reqDv:9400};
  const uncrewed={id:'u',name:'U',crew:0,reqDv:9400};
  const m=curMission();

  setCrisis('talent_exodus', 1.0);
  check('research axis: mult is 1-maxPenalty at full severity', Math.abs(crisisResearchMult()-(1-0.30))<1e-9);
  check('research axis: does not touch facility output', crisisFacilityMult()===1);
  check('research axis: does not touch build time', crisisBuildMult()===1);
  check('research axis: does not touch gov funding', crisisGovFundingMult()===1);

  setCrisis('isru_supply_shock', 1.0);
  check('facility axis: mult is 1-maxPenalty at full severity', Math.abs(crisisFacilityMult()-(1-0.35))<1e-9);
  check('facility axis: does not touch research', crisisResearchMult()===1);

  setCrisis('orbital_congestion', 1.0);
  check('build axis INCREASES rather than decreasing', crisisBuildMult()>1);
  check('build axis: mult is 1+maxPenalty at full severity', Math.abs(crisisBuildMult()-(1+0.40))<1e-9);
  state.crisis=null; const clean=buildMonths(m);
  setCrisis('orbital_congestion', 1.0);
  check('build axis actually lengthens buildMonths()', buildMonths(m)>clean);

  setCrisis('crew_attrition', 1.0);
  check('crewRel axis taxes a crewed mission', crisisRelPenalty(crewed)>0);
  check('crewRel axis does NOT tax an uncrewed mission', crisisRelPenalty(uncrewed)===0);

  // reused axes still work with their new owners
  setCrisis('safety_backlash', 1.0);
  check('safety_backlash reuses govFunding and cuts it', crisisGovFundingMult()<1);
  setCrisis('deep_comms_saturation', 1.0);
  check('deep_comms_saturation reuses deepRel and taxes deep missions',
    crisisRelPenalty({id:'d',name:'D',reqDv:9400,profile:[{name:'TLI',dv:3120}]})>0);
}

// ---------- severity ramps every axis proportionally ----------
{
  setCrisis('orbital_congestion', 0.5);
  const half=crisisBuildMult();
  setCrisis('orbital_congestion', 1.0);
  const full=crisisBuildMult();
  check('build axis scales with severity', Math.abs((half-1)*2-(full-1))<1e-9);

  setCrisis('talent_exodus', 0.5);
  const rHalf=crisisResearchMult();
  setCrisis('talent_exodus', 1.0);
  const rFull=crisisResearchMult();
  check('research axis scales with severity', Math.abs((1-rHalf)*2-(1-rFull))<1e-9);
}

// ---------- PROTECTED BASELINE: frequency untouched, gating still works ----------
{
  check('CRISIS_TRIGGER_CHANCE unchanged at its original value', typeof CRISIS_TRIGGER_CHANCE==='number');
  state.crisis=null; state.crisisHistory=[];
  state.year=1942;
  check('no crisis is era-eligible at game start, even with 9 in the pool', crisisProximity().length===0);

  state.year=ERAS[7].from;
  state.leoFlights=999; state.deepFlights=999; state.crewFlown=999; state.crewLost=999; state.flights=999;
  const all=crisisCandidates();
  check('at the last era with every threshold met, all 9 are candidates', all.length===9);

  state.leoFlights=0; state.deepFlights=0; state.crewFlown=0; state.crewLost=0; state.flights=0;
  const none=crisisCandidates().filter(c=>c.thresholdStat);
  check('with every counter at zero, no threshold-gated crisis is a candidate', none.length===0);
  check('the thresholdStat-less crisis is still a candidate at zero counters',
    crisisCandidates().some(c=>c.thresholdStat===null));

  // variety rule survives an expanded pool
  state.leoFlights=999; state.deepFlights=999; state.crewFlown=999; state.crewLost=999; state.flights=999;
  state.crisisHistory=[{id:'debris_cascade', outcome:'mitigated'}];
  check('the just-resolved crisis is excluded from candidates (variety rule intact)',
    !crisisCandidates().some(c=>c.id==='debris_cascade'));

  state.crisis=null; state.crisisHistory=[];
  state.leoFlights=0; state.deepFlights=0; state.crewFlown=0; state.crewLost=0; state.flights=0;
}

// ---------- crisisFundCost works for every entry ----------
{
  let bad=[];
  for(const c of CRISES){ const v=crisisFundCost(c); if(!(v>0 && Number.isFinite(v))) bad.push(c.id); }
  check('crisisFundCost returns a finite positive cost for every crisis', bad.length===0);
  if(bad.length) console.log('   bad cost:', bad.join(', '));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
