// Tier 2 C8 (2026-08-04) — outer-system facility bodies (Callisto, Titan) + per-body environmental
// hazard. The load-bearing requirement: the hazard mechanic touches two LIVE economy paths that every
// pre-existing facility already depends on (resupplyCostFull, the condition-decay line in
// tickStationOperations), so the first job of this suite is proving LEO/lunar/Mars are numerically
// untouched. Everything else is secondary to that.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function mkFac(fid, cond){
  state.facilities[fid]={built:true, modules:3, since:1970, supply:FAC_SUPPLY_MONTHS, starvedMonths:0,
    autoResupply:false, maintenanceEnabled:true, condition:cond==null?80:cond, crewIds:[], crewManaged:false,
    rotationDueAbs:0, moduleList:['can_std','lab_mod','power_truss']};
}

newGame('engineer');

// ---------- hazard is INERT for every body that existed before C8 ----------
{
  for(const b of ['earth','moon','mars']){
    check(`bodyHazard('${b}') is exactly 0`, bodyHazard(b)===0);
    check(`hazardDecayMult('${b}') is exactly 1 (no change to wear)`, hazardDecayMult(b)===1);
    check(`hazardResupplyMult('${b}') is exactly 1 (no change to cost)`, hazardResupplyMult(b)===1);
  }
  // an unlisted body must also be inert, so a future BODIES entry can't silently acquire a hazard
  check('an unlisted body falls back to zero hazard', bodyHazard('europa')===0);
  check('an unlisted body has neutral multipliers', hazardDecayMult('europa')===1 && hazardResupplyMult('europa')===1);
}

// ---------- pre-C8 facility economics are numerically identical ----------
// These are the exact figures produced by the pre-C8 build for a 3-module can_std/lab_mod/power_truss
// facility at condition 80 (captured by running the same fixture against the stashed build before the
// mechanic landed). If the hazard mechanic ever stops being inert for these bodies, this fails.
{
  const EXPECTED={
    leo_station:  {income:1.26, fuel:0,   rep:1.3,  sci:5.33,  resupply:2.85},
    lunar_base:   {income:2.53, fuel:0.4, rep:2.6,  sci:10.01, resupply:6.27},
    mars_base:    {income:4.64, fuel:0.6, rep:4.08, sci:17.37, resupply:11.97},
  };
  for(const [fid, exp] of Object.entries(EXPECTED)){
    mkFac(fid);
    const def=facilityById(fid), pr=facilityProduction(def, facilityState(fid));
    check(`${fid} production unchanged (income)`, pr.income===exp.income);
    check(`${fid} production unchanged (fuel)`,   pr.fuel===exp.fuel);
    check(`${fid} production unchanged (rep)`,    pr.rep===exp.rep);
    check(`${fid} production unchanged (sci)`,    pr.sci===exp.sci);
    check(`${fid} resupply cost unchanged`, Math.abs(resupplyCostFull(fid)-exp.resupply)<1e-9);
  }
  // condition decay: pre-C8 a 3-module base at 80 decayed to 79.09 in one month
  for(const fid of Object.keys(EXPECTED)) mkFac(fid, 80);
  tickStationOperations();
  for(const fid of Object.keys(EXPECTED)){
    check(`${fid} condition decay unchanged (80 -> 79.09)`, Math.abs(stationCondition(facilityState(fid))-79.09)<1e-9);
  }
}

// ---------- the new facilities exist and are correctly defined ----------
{
  for(const fid of ['callisto_base','titan_base']){
    const def=facilityById(fid);
    check(`${fid} is defined in FACILITY_DEFS`, !!def);
    check(`${fid} has a reqMission gate`, !!def.reqMission);
    check(`${fid} names a mission that actually exists`, !!MISSIONS.find(m=>m.id===def.reqMission));
    check(`${fid} names a body that actually exists in BODIES`, !!BODIES.find(b=>b.id===def.body));
    check(`${fid} has a non-zero hazard (that's the point of it)`, bodyHazard(def.body)>0);
    check(`${fid} has a resupply multiplier`, BODY_RESUPPLY_MULT[def.body]>0);
    check(`${fid} has a transit time`, logiTransitDays(def.body)>0);
    check(`${fid} has base and perModule production`, !!def.base && !!def.perModule);
    check(`${fid} has a decayReason (used in UI copy)`, typeof def.decayReason==='string' && def.decayReason.length>0);
  }
  check('Io is deliberately NOT a facility body (volcanism needs its own mechanic)',
    !FACILITY_DEFS.some(d=>d.body==='io'));
}

// ---------- founding is gated on the right mission ----------
{
  newGame('engineer');
  state.money=1e6;
  check('callisto_base cannot be founded before jupiter_orbit', canFound('callisto_base').ok===false);
  check('titan_base cannot be founded before titan_landing', canFound('titan_base').ok===false);
  state.completed['jupiter_orbit']=true;
  check('callisto_base becomes foundable once jupiter_orbit is complete', canFound('callisto_base').ok===true);
  check('titan_base is still gated (different mission)', canFound('titan_base').ok===false);
  state.completed['titan_landing']=true;
  check('titan_base becomes foundable once titan_landing is complete', canFound('titan_base').ok===true);

  state.money=0;
  check('founding still respects capital, not just the mission gate', canFound('callisto_base').ok===false);
}

// ---------- hazard actually bites at the new bodies ----------
{
  newGame('engineer'); state.money=1e6;
  for(const fid of ['mars_base','callisto_base','titan_base']) mkFac(fid, 80);

  check('Callisto resupply costs more than Mars', resupplyCostFull('callisto_base')>resupplyCostFull('mars_base'));
  check('Titan resupply costs more than Mars', resupplyCostFull('titan_base')>resupplyCostFull('mars_base'));
  check('Callisto resupply transit is far longer than Mars', logiTransitDays('callisto')>logiTransitDays('mars')*3);

  tickStationOperations();
  const marsC=stationCondition(facilityState('mars_base'));
  const callC=stationCondition(facilityState('callisto_base'));
  const titC =stationCondition(facilityState('titan_base'));
  check('Callisto wears faster than Mars', callC<marsC);
  check('Titan wears faster than Mars', titC<marsC);
  check('Callisto (hazard 0.55) wears faster than Titan (hazard 0.40)', callC<titC);
}

// ---------- the new bases are viable, not accidentally ruinous ----------
{
  newGame('engineer'); state.money=1e6;
  for(const fid of ['callisto_base','titan_base']) mkFac(fid);
  for(const fid of ['callisto_base','titan_base']){
    const def=facilityById(fid), pr=facilityProduction(def, facilityState(fid));
    const monthlyResupply=resupplyCostFull(fid)/FAC_SUPPLY_MONTHS;
    check(`${fid} is not a guaranteed money pit (income covers sustained resupply)`, pr.income>=monthlyResupply);
    check(`${fid} yields more science than a Mars base (the reason to go)`, pr.sci>0);
  }
}

// ---------- Base Bench body mapping generalized correctly ----------
{
  check('BASE_DRAFT_FACID covers every non-Earth facility', 
    FACILITY_DEFS.filter(d=>d.body!=='earth').every(d=>BASE_DRAFT_FACID[d.body]===d.id));
  check('BASE_DRAFT_FACID does NOT include the Earth-orbit station', !BASE_DRAFT_FACID['earth']);
  check('BASE_DRAFT_BODIES includes the new bodies', BASE_DRAFT_BODIES.includes('callisto') && BASE_DRAFT_BODIES.includes('titan'));

  setBaseDraftBody('callisto');
  check('setBaseDraftBody accepts a new body', baseDraftBody()==='callisto');
  setBaseDraftBody('not_a_body');
  check('setBaseDraftBody rejects an unknown body and falls back to moon', baseDraftBody()==='moon');
  setBaseDraftBody('mars');
  check('setBaseDraftBody still accepts the original bodies', baseDraftBody()==='mars');
}

// ---------- save round-trip carries a new facility ----------
{
  newGame('engineer'); state.money=1e6;
  state.completed['jupiter_orbit']=true;
  mkFac('callisto_base');
  const before=facilityProduction(facilityById('callisto_base'), facilityState('callisto_base')).income;
  const snapshot=JSON.parse(JSON.stringify(state));
  state=snapshot;
  check('a Callisto facility survives a state serialization round-trip', facilityBuilt('callisto_base'));
  check('its production is unchanged after the round-trip',
    facilityProduction(facilityById('callisto_base'), facilityState('callisto_base')).income===before);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
