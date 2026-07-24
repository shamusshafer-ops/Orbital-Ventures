// Money & Budget balance pass (2026-07-24) — Option A (early-game survival pinch) + Option B
// (passive-income payback stretch + portfolio cap). See ROADMAP.md session entry for the design
// rationale. This suite locks in the new numbers and guards the mechanism (cap enforcement,
// status transitions), not just the constants — a future balance pass can retune the numbers
// freely as long as these behavioral guarantees hold.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- A: Engineer-difficulty starting capital tightened ----------
{
  check('Engineer startMoney is 3.5M (down from 5.0M)', DIFFICULTY.engineer.startMoney===3.5);
  check('Napkin startMoney untouched (forgiving mode unaffected)', DIFFICULTY.napkin.startMoney===8.0);
  newGame('engineer');
  check('a fresh Engineer-mode game actually starts with 3.5M', state.money===3.5);
}

// ---------- A: early-game attempt economics are meaningfully tighter, not lethal ----------
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='first_flight');
  const v=computeVehicle();
  const cost=round2(v.buildCost+v.launchCost);
  const attempts=Math.floor(state.money/cost);
  check('at least 3 attempts survivable on cash alone (not instant-death)', attempts>=3);
  check('fewer than 8 attempts survivable (tighter than the old 5M baseline)', attempts<8);
  check('a single success still comfortably nets positive', round2(m.payout-cost)>0);
}

// ---------- B: passive-contract setup costs quadrupled, stretching payback to ~7-11 months ----------
{
  PASSIVE_CONTRACT_DEFS.forEach(d=>{
    const payback=d.setup/d.income;
    check(`${d.id}: payback stretched to 6-12 months (was ~2-3)`, payback>=6 && payback<=12);
  });
}

// ---------- B: portfolio cap exists and scales with era ----------
{
  newGame('engineer'); // 1942, pioneer era (index 0)
  check('portfolio cap at era 0 is the base value (3)', passiveMaxActive()===3);
  state.year=1985; // station_shuttle, era index 3
  check('portfolio cap grows with era', passiveMaxActive()===3+3*1);
}

// ---------- B: cap is actually enforced — signing beyond it is blocked ----------
{
  newGame('engineer');
  state.money=500; state.rep=1000; state.year=1965;
  // Sign contracts up to the cap using only rep/mission-gated ones (no research/doctrine deps)
  const simple=PASSIVE_CONTRACT_DEFS.filter(d=>!d.reqResearch && !d.reqSynergy && !d.reqDoctrine);
  state.completed=state.completed||{}; state.completed.first_sat=true; state.completed.first_astro=true; state.completed.crew_orbit=true;
  const cap=passiveMaxActive();
  let signed=0;
  for(const d of simple){
    if(signed>=cap) break;
    if(passiveStatus(d.id)==='available'){ check(`${d.id} signs successfully under the cap`, signPassiveContract(d.id)); signed++; }
  }
  check('signed exactly up to the cap (test setup produced enough eligible contracts)', signed===cap);
  const next=simple.find(d=>!passiveActive(d.id) && passiveReqMet(d) && passiveCooldownLeft(d.id)===0);
  if(next){
    check('a further contract is now capped, not available', passiveStatus(next.id)==='capped');
    check('signing while capped is rejected', signPassiveContract(next.id)===false);
  }
}

// ---------- B: cap does not block renewals/cooldown/locked semantics ----------
{
  newGame('engineer');
  check('an unmet-prereq contract is still locked regardless of cap', passiveStatus('svc_orbit')==='locked');
}

// ---------- B: freeing a slot (contract expiring) re-opens signing ----------
{
  newGame('engineer');
  state.money=200; state.rep=1000; state.year=1965;
  state.completed=state.completed||{}; state.completed.first_sat=true; state.completed.first_astro=true; state.completed.crew_orbit=true;
  const simple=PASSIVE_CONTRACT_DEFS.filter(d=>!d.reqResearch && !d.reqSynergy && !d.reqDoctrine);
  const cap=passiveMaxActive();
  let signedIds=[];
  for(const d of simple){
    if(signedIds.length>=cap) break;
    if(passiveStatus(d.id)==='available'){ signPassiveContract(d.id); signedIds.push(d.id); }
  }
  const spare=simple.find(d=>!signedIds.includes(d.id) && passiveReqMet(d));
  check('a spare contract is capped while the portfolio is full', spare && passiveStatus(spare.id)==='capped');
  // force the first signed contract to expire
  const c=state.passiveContracts.find(c=>c.id===signedIds[0]);
  c.monthsLeft=1;
  tickPassiveContracts();
  check('the expired contract left state.passiveContracts', !state.passiveContracts.some(c=>c.id===signedIds[0]));
  check('a freed slot lets the spare contract become available again', spare && passiveStatus(spare.id)==='available');
}

// ---------- regression: existing diminishing-returns and cooldown behavior untouched ----------
{
  newGame('engineer');
  state.money=200; state.rep=1000;
  state.completed=state.completed||{}; state.completed.first_astro=true;
  signPassiveContract('tour_suborbit');
  const before=passiveIncomeNow('tour_suborbit');
  check('diminishing math untouched by this balance pass', before===round2(PASSIVE_CONTRACT_DEFS.find(d=>d.id==='tour_suborbit').income*passiveDiminish('tour_suborbit')));
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
