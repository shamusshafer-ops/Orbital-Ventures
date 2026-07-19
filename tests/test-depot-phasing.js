// E4.6 (A2 slice 1, 2026-07-19) — depot rendezvous/phasing as a Δv cost. Mechanism only; NO
// mission combines .profile with .inclination yet, so the headline guarantee is an IDENTITY:
// depotPhasingDv is 0 for every real mission regardless of state.depotUse, and simulateMission's
// leg output is byte-identical to before this slice for all existing content. Plus: the formula,
// the opt-in-on-depotUse behavior (unlike inclinationDv's always-on surcharge), the symmetric
// (no free band) direction, and a synthetic integration test proving the leg-gate actually
// responds once a mission DOES combine the two fields.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. IDENTITY: every real mission has zero phasing cost, regardless of depotUse ----------
{
  state.depotUse=0;
  let mismOff=0;
  for(const m of MISSIONS){ if(depotPhasingDv(m)!==0) mismOff++; }
  check('identity (depotUse=0): every real mission has zero phasing cost', mismOff===0);
  state.depotUse=25; // opt into the depot at a large draw — should still be 0 for every real mission
  let mismOn=0;
  for(const m of MISSIONS){ if(depotPhasingDv(m)!==0) mismOn++; }
  check('identity (depotUse>0): every real mission STILL has zero phasing cost (none combine .profile+.inclination yet)', mismOn===0);
  // the flat-reqDv missions that DO carry .inclination (for the unrelated launch-azimuth tax)
  // must still report zero here — the depot mechanic doesn't apply to them at all (no .profile)
  const crewOrbit=MISSIONS.find(m=>m.id==='crew_orbit');
  check('crew_orbit (flat-reqDv, .inclination:65) reports zero depot phasing — it has no .profile, the depot never applies', crewOrbit && crewOrbit.inclination===65 && depotPhasingDv(crewOrbit)===0);
  state.depotUse=0;
}

// ---------- 2. simulateMission identity: leg output unchanged for real .profile missions ----------
{
  const profileMissions=MISSIONS.filter(m=>m.profile);
  check('at least one real mission has a .profile to check', profileMissions.length>0);
  // For every real mission's Ascent-to-LEO leg, its required dv/pass with the depot in use must
  // equal its required dv/pass without -- because depotPhasingDv is provably 0 for all of them.
  let legMism=0;
  for(const m of profileMissions){
    state.depotUse=0; const off=simulateMission(m).legs.find(l=>l.name==='Ascent to LEO');
    state.depotUse=18; const on=simulateMission(m).legs.find(l=>l.name==='Ascent to LEO');
    if(off && on && (off.dv!==on.dv || off.pass!==on.pass || on.phasingDv!==undefined)) legMism++;
  }
  check('every real mission\'s Ascent-to-LEO leg dv/pass/phasingDv is unaffected by turning depotUse on', legMism===0);
  state.depotUse=0;
}

// ---------- 3. depotPhasingDv formula ----------
// All synthetic mission literals here include a stub .profile (any truthy value works — the
// function only checks that the mission IS depot-eligible, it doesn't inspect the profile's
// contents), since depotPhasingDv is now correctly a no-op for non-.profile missions (section 1).
{
  const PF=[{name:'stub',dv:0,by:'lv'}]; // minimal stand-in .profile, just to mark depot-eligibility
  state.depotUse=0;
  check('zero when depotUse is 0, regardless of inclination mismatch', depotPhasingDv({profile:PF,inclination:0})===0);
  state.depotUse=10;
  check('zero when not .profile-shaped, even with depotUse>0 and an inclination set', depotPhasingDv({inclination:0})===0);
  check('zero when .inclination is unset (assumed to already share the depot\'s plane)', depotPhasingDv({profile:PF})===0);
  check('zero when .inclination exactly matches the depot\'s plane', depotPhasingDv({profile:PF,inclination:DEPOT_INCLINATION})===0);
  const equatorial=depotPhasingDv({profile:PF,inclination:0});
  const expect=Math.round(2*INCLINATION_LEO_V*Math.sin((DEPOT_INCLINATION*Math.PI/180)/2));
  check('equatorial mismatch matches 2·v·sin(Δi/2) exactly', equatorial===expect);
  check('equatorial mismatch matches the same magnitude the launch-site slice found (~3827 m/s)', Math.abs(equatorial-3827)<5);
  // symmetric: no free direction, unlike inclinationDv's floor/ceiling band
  const above=depotPhasingDv({profile:PF,inclination:DEPOT_INCLINATION+20});
  const below=depotPhasingDv({profile:PF,inclination:DEPOT_INCLINATION-20});
  check('a mismatch above the depot\'s plane costs the same as an equal mismatch below (no free band)', above===below && above>0);
  // monotonic in the size of the mismatch
  const d10=depotPhasingDv({profile:PF,inclination:DEPOT_INCLINATION+10}), d30=depotPhasingDv({profile:PF,inclination:DEPOT_INCLINATION+30});
  check('phasing cost grows with the size of the plane mismatch', d30>d10 && d10>0);
  state.depotUse=0;
}

// ---------- 4. synthetic integration: a mission that DOES combine .profile + .inclination ----------
{
  const synthetic={
    id:'_test_synth_depot', name:'Synthetic Depot Test', crew:0, days:200, payout:1, rep:1, minRep:0,
    modules:['lv','transfer'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Test Injection', dv:1000, by:'transfer'}],
    inclination:65
  };
  state.depotUse=0;
  const off=simulateMission(synthetic).legs.find(l=>l.name==='Ascent to LEO');
  check('synthetic (depotUse=0): the ascent leg requires the plain authored dv, no phasing', off.dv===9400 && off.phasingDv===undefined);
  state.depotUse=8;
  const on=simulateMission(synthetic).legs.find(l=>l.name==='Ascent to LEO');
  const expectPhasing=depotPhasingDv(synthetic);
  check('synthetic (depotUse>0, inclined): the ascent leg now requires the authored dv PLUS phasing', on.dv===9400+expectPhasing && expectPhasing>0);
  check('synthetic: the leg records its own phasingDv for display', on.phasingDv===expectPhasing);
  // a synthetic mission whose inclination happens to equal the depot's plane pays nothing extra
  const inPlane=Object.assign({},synthetic,{inclination:DEPOT_INCLINATION});
  state.depotUse=8;
  const inPlaneLeg=simulateMission(inPlane).legs.find(l=>l.name==='Ascent to LEO');
  check('synthetic in-plane with the depot: zero phasing even with depotUse>0', inPlaneLeg.dv===9400 && inPlaneLeg.phasingDv===undefined);
  state.depotUse=0;
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
