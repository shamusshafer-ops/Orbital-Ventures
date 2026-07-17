// #114 slice 1 — orbital inclination as a Δv cost. Mechanism only; NO mission carries .inclination yet
// (that's slice 2), so the headline guarantee is an IDENTITY: effectiveReqDv === reqDv for every existing
// mission, and no gameplay number moves. Plus: the plane-change math, the free/paid direction split, and
// the critical guard that the reqDv>=9000 CLASSIFICATION checks are NOT rerouted through the accessor.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. IDENTITY: missions WITHOUT .inclination are untouched — effectiveReqDv === reqDv ----------
{
  let mism=0;
  for(const m of MISSIONS){ if(m.reqDv==null||m.inclination!=null) continue; if(effectiveReqDv(m)!==m.reqDv) mism++; }
  check('identity: effectiveReqDv === reqDv for every mission that does not opt into inclination', mism===0);
  // procedural archetypes too — excluding any that intentionally set .inclination (slice 2 retrofits)
  let pmism=0;
  for(const a of CONTRACT_ARCHETYPES){ const o=a.build(2); if(o.reqDv==null||o.inclination!=null) continue; if(effectiveReqDv(o)!==o.reqDv) pmism++; }
  check('identity: holds for procedural offers that do not opt into inclination', pmism===0);
}

// ---------- 2. inclinationDv: free INSIDE [floor, ceiling], zero when unset ----------
{
  check('unset: inclinationDv is 0 when .inclination is absent', inclinationDv({reqDv:9400})===0);
  check('unset: effectiveReqDv equals reqDv when absent', effectiveReqDv({reqDv:9400})===9400);
  check('inside band: 45° (between 28.4° floor and 57° ceiling) is free', inclinationDv({reqDv:9400,inclination:45})===0);
  check('at floor: exactly 28.4° is free', inclinationDv({reqDv:9400,inclination:LAUNCH_SITE_LAT})===0);
  check('just above floor: 30° is free', inclinationDv({reqDv:9400,inclination:30})===0);
  check('at ceiling: exactly 57° is free', inclinationDv({reqDv:9400,inclination:LAUNCH_SITE_MAX_DIRECT_INCL})===0);
}

// ---------- 3. inclinationDv: paid below the floor, monotonic, matches 2·v·sin(Δi/2) ----------
{
  const d0=inclinationDv({reqDv:9400,inclination:0});
  const expect0=Math.round(2*7800*Math.sin((28.4*Math.PI/180)/2));
  check('equatorial: 0° levies the full plane change', d0>0);
  check('equatorial: matches 2·v·sin(Δi/2) exactly', d0===expect0);
  const d10=inclinationDv({reqDv:9400,inclination:10});
  const d20=inclinationDv({reqDv:9400,inclination:20});
  check('monotonic: lower target inclination costs strictly more (0<20<10... i.e. more plane change = more Δv)', d0>d10 && d10>d20 && d20>0);
  check('effectiveReqDv adds the surcharge onto the base', effectiveReqDv({reqDv:9400,inclination:0})===9400+d0);
}

// ---------- 3b. inclinationDv: paid above the ceiling (dogleg), symmetric to the floor case ----------
{
  const d90=inclinationDv({reqDv:9400,inclination:90});
  const expect90=Math.round(2*7800*Math.sin(((90-57)*Math.PI/180)/2));
  check('polar: 90° levies a dogleg tax', d90>0);
  check('polar: matches 2·v·sin(Δi/2) exactly, measured from the ceiling', d90===expect90);
  const d65=inclinationDv({reqDv:9400,inclination:65});
  const d70=inclinationDv({reqDv:9400,inclination:70});
  check('monotonic above the ceiling: higher target costs strictly more (65<70<90)', d65<d70 && d70<d90 && d65>0);
  check('symmetry: dogleg above ceiling and plane-change below floor use the same formula shape (equal Δi ⇒ equal Δv)', inclinationDv({reqDv:9400,inclination:LAUNCH_SITE_LAT-10})===inclinationDv({reqDv:9400,inclination:LAUNCH_SITE_MAX_DIRECT_INCL+10}));
}

// ---------- 4. CLASSIFICATION GUARD: reqDv>=9000 checks must NOT see the surcharge ----------
// The danger case is a mission whose *base* reqDv is below 9000 but whose base+surcharge crosses it —
// it must still classify by the raw base, or a plane change would spuriously reclassify a sub-orbital
// mission as orbital-class. We assert the classification helpers read raw reqDv, not effectiveReqDv.
{
  // a synthetic sub-orbital mission (base 8000 < 9000) with a big surcharge that would push it over 9000
  const sub={id:'x_sub', reqDv:8000, inclination:0, modules:[], profile:null};
  check('setup: this synthetic case actually crosses 9000 once surcharged (guard is meaningful)', 8000<9000 && effectiveReqDv(sub)>=9000);
  check('classification: missionReachesOrbit reads raw reqDv (still sub-orbital despite surcharge)', missionReachesOrbit(sub)===false);
  check('classification: isLeoClassMission reads raw reqDv (still not LEO-class despite surcharge)', isLeoClassMission(sub)===false);
  // and an orbital one stays orbital (sanity, surcharge doesn't break the true case)
  const orb={id:'x_orb', reqDv:9400, inclination:0, modules:[], profile:null};
  check('classification: a real orbital mission still classifies as orbital', missionReachesOrbit(orb)===true && isLeoClassMission(orb)===true);
}

// ---------- 5. Gate integration: a real budget gate uses the surcharge (canLaunch) ----------
{
  // build a design that clears 9400 but NOT 9400+plane-change, then check a 0° mission is gated on Δv
  const m0={id:'x_gate', reqDv:9400, inclination:0, crew:0, days:0, payload:0.05, modules:[], minRep:0, payout:5, rep:1};
  const v=computeVehicle();
  // Only meaningful if the current design sits between reqDv and effectiveReqDv; assert the LOGIC, not a
  // specific vehicle: canLaunch's Δv verdict must track effectiveReqDv, not raw reqDv.
  const need=effectiveReqDv(m0);
  const chk=canLaunch(v, m0, null, false);
  if(v.totalDv>=9400 && v.totalDv<need){
    check('gate: design clearing base reqDv but not the surcharge is blocked on Δv', !chk.ok && /Δv/.test(chk.why));
  } else {
    check('gate: (design not in the between-band this run — logic asserted via effectiveReqDv identity)', canLaunch(v,{...m0,inclination:45},null,false).ok===canLaunch(v,{...m0,reqDv:9400},null,false).ok);
  }
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
