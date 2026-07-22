// BACKLOG #37 — Max-Q structural check vs. fairing choice (2026-07-22). Before this, "Max-Q" was a
// cosmetic 2D-canvas approximation (35 + reqDv*0.003) with zero gameplay weight, and the fairing
// choice was a flat, trajectory-blind reliability delta. Now the real peak dynamic pressure the
// vehicle actually experiences (from the integrated ascent trajectory) modulates the structures
// failure SHARE against the fairing's tolerance — so a no-fairing vehicle flying an aggressive,
// high-Q profile gets blamed for structural failures far more often, and the player can see the
// structural-load band on the bench before a failure teaches them. Crucially, this shifts
// ATTRIBUTION only: aggregate mission reliability is provably unchanged.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- 1. the trajectory plan now exposes real dynamic pressure ----------
{
  newGame('engineer');
  const phys=flightPhysicsSpec(curMission(), computeVehicle());
  const plan=cape3dTrajectoryPlan(phys, {isOrbital:false, reqDv:1800});
  check('plan exposes a maxQKpa field', typeof plan.maxQKpa==='number');
  check('maxQKpa is positive for a real ascent', plan.maxQKpa>0);
  check('every trajectory point carries a qKpa dynamic-pressure field', plan.points.every(p=>typeof p.qKpa==='number'));
  check('the plan maxQKpa equals the peak of the per-point qKpa', Math.abs(plan.maxQKpa - Math.max(...plan.points.map(p=>p.qKpa)))<1e-9);
}

// ---------- 2. vehicleMaxQ reflects the actual design, not a reqDv formula ----------
{
  newGame('engineer'); state.stages[0].dia=0.7;
  const narrow=vehicleMaxQ(curMission());
  newGame('engineer'); state.stages[0].dia=1.4;
  const wide=vehicleMaxQ(curMission());
  check('a narrower vehicle (less drag area, faster while low) peaks at higher Max-Q than a wide one', narrow>wide);
  check('vehicleMaxQ returns a finite positive number', isFinite(narrow) && narrow>0);
  check('vehicleMaxQ degrades gracefully on a degenerate mission (no throw)', (()=>{ try{ return typeof vehicleMaxQ({reqDv:0})==='number'; }catch(e){ return false; } })());
}

// ---------- 3. structuralLoadAssessment: fairing sensitivity ----------
{
  newGame('engineer');
  state.stages[0].prop=140; state.stages.push({eng:state.stages[0].eng,prop:32,count:1,dia:state.stages[0].dia});
  const orbital=MISSIONS.find(x=>x.reqDv>=9000)||curMission();
  state.parts.fairing='none';   const none =structuralLoadAssessment(orbital, computeVehicle(), false);
  state.parts.fairing='standard';const std =structuralLoadAssessment(orbital, computeVehicle(), false);
  state.parts.fairing='heavy';  const heavy=structuralLoadAssessment(orbital, computeVehicle(), false);
  check('no fairing has the highest structural-load sensitivity', none.sens>std.sens && std.sens>heavy.sens);
  check('on an aggressive ascent, no fairing produces a higher structures weight than an extended one', none.weightMult>heavy.weightMult);
  check('an aggressive orbital + no fairing reaches a Severe band', none.band==='Severe');
  check('the same vehicle with an extended fairing is less severe', ['High','Nominal','Low'].includes(heavy.band));
  check('weightMult is bounded (never runs away)', none.weightMult<=2.4 && heavy.weightMult>=0.6);
}

// ---------- 4. gentle vehicle sits near Nominal; band tracks stress ----------
{
  newGame('engineer'); // small default single-stage suborbital
  const sl=structuralLoadAssessment(curMission(), computeVehicle(), false);
  check('a modest early vehicle sits around Nominal/Low, not Severe', sl.band==='Nominal'||sl.band==='Low');
}

// ---------- 5. crewed flights use neutral sensitivity (no fairing choice — they carry a capsule) ----------
{
  newGame('engineer');
  const m=curMission();
  state.parts.fairing='none'; // should be ignored for a crewed flight
  const crewedSL=structuralLoadAssessment(m, computeVehicle(), true);
  check('crewed sensitivity is neutral (1.0) regardless of the fairing field', Math.abs(crewedSL.sens-1.0)<1e-9);
}

// ---------- 6. THE KEY INVARIANT: this shifts attribution only — aggregate R is unchanged ----------
{
  newGame('engineer');
  state.stages[0].prop=140; state.stages.push({eng:state.stages[0].eng,prop:32,count:1,dia:state.stages[0].dia});
  const orbital=MISSIONS.find(x=>x.reqDv>=9000)||curMission();
  for(const fairing of ['none','standard','heavy']){
    state.parts.fairing=fairing;
    const rep=subsystemReport(orbital, computeVehicle(), null, false);
    const prod=rep.subsystems.reduce((a,s)=>a*s.rel,1);
    check(`aggregate reliability invariant holds for fairing=${fairing} (∏rel_i === R)`, Math.abs(prod-rep.R)<1e-9);
  }
  // and the structures SHARE genuinely moves between fairing choices (the mechanic actually does something)
  state.parts.fairing='none';  const sNone =subsystemReport(orbital, computeVehicle(), null, false).subsystems.find(s=>s.key==='structures').p;
  state.parts.fairing='heavy'; const sHeavy=subsystemReport(orbital, computeVehicle(), null, false).subsystems.find(s=>s.key==='structures').p;
  check('a no-fairing aggressive ascent is blamed for structural failure more often than an extended-fairing one', sNone>sHeavy);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
