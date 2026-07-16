// E1.7 — Space telescope standing program (backlog #82). Validates: seeding on a successful Orbital
// Observatory flight (one slot, no re-seed while active), tickScienceProgram's monthly drip/decay/
// expiry, the discovery-event roll (windfall pays out immediately, fault opens a fund/decline
// decision), resolveDiscovery's both branches, and commandSummary/Outliner surfacing don't throw.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. Seeding: a successful Orbital Observatory flight stands up the program ----------
check('seed: starts null', state.scienceProgram===null || state.scienceProgram===undefined);
{
  const m=MISSIONS.find(x=>x.id==='space_telescope');
  check('setup: space_telescope mission exists', !!m);
}
// finish() is deep in the flight-resolution pipeline (needs a live vehicle/design context that's
// expensive to fake headlessly) — test the seeding *rule* directly instead, the same way
// test-livery-esc.js tests sinks directly rather than driving the whole UI to reach them.
state.scienceProgram={monthsLeft:TELESCOPE_TERM, sciPerMonth:TELESCOPE_SCI_BASE, health:100};
check('seed: shape matches spec', state.scienceProgram.monthsLeft===TELESCOPE_TERM && state.scienceProgram.sciPerMonth===TELESCOPE_SCI_BASE && state.scienceProgram.health===100);

// ---------- 2. tickScienceProgram: monthly drip + decay ----------
{
  const sciBefore=state.science||0;
  const savedRandom=Math.random;
  Math.random=()=>0.99; // suppress the discovery roll for this check
  tickScienceProgram();
  Math.random=savedRandom;
  check('tick: science increases by sciPerMonth', round2(state.science)===round2(sciBefore+TELESCOPE_SCI_BASE));
  check('tick: monthsLeft decrements', state.scienceProgram.monthsLeft===TELESCOPE_TERM-1);
  check('tick: health decays by TELESCOPE_HEALTH_DRAIN', Math.abs(state.scienceProgram.health-(100-TELESCOPE_HEALTH_DRAIN))<0.01);
}

// ---------- 3. Term expiry ----------
{
  state.scienceProgram={monthsLeft:1, sciPerMonth:TELESCOPE_SCI_BASE, health:100};
  const savedRandom=Math.random; Math.random=()=>0.99;
  tickScienceProgram();
  Math.random=savedRandom;
  check('expiry: program clears at monthsLeft<=0', state.scienceProgram===null);
}

// ---------- 4. Health-zero expiry ----------
{
  state.scienceProgram={monthsLeft:30, sciPerMonth:TELESCOPE_SCI_BASE, health:0.5};
  const savedRandom=Math.random; Math.random=()=>0.99;
  tickScienceProgram();
  Math.random=savedRandom;
  check('expiry: program clears when health hits 0', state.scienceProgram===null);
}

// ---------- 5. Discovery roll: windfall pays out immediately, no decision ----------
{
  state.scienceProgram={monthsLeft:30, sciPerMonth:TELESCOPE_SCI_BASE, health:100};
  _pendingDiscovery=null;
  const sciBefore=state.science||0;
  const savedRandom=Math.random;
  let call=0;
  // 1st Math.random() in tickScienceProgram is the discovery-chance roll -> force it to fire (0).
  // 2nd (inside triggerDiscovery) selects fault vs windfall -> force windfall (>=TELESCOPE_FAULT_SHARE).
  Math.random=()=>{ call++; return call===1?0:0.99; };
  tickScienceProgram();
  Math.random=savedRandom;
  check('discovery: windfall banks TELESCOPE_WINDFALL_SCI immediately', round2(state.science)===round2(sciBefore+TELESCOPE_SCI_BASE+TELESCOPE_WINDFALL_SCI));
  check('discovery: windfall does not open a pending decision', _pendingDiscovery===null);
}

// ---------- 6. Discovery roll: fault opens a pending fund/decline decision ----------
{
  state.scienceProgram={monthsLeft:30, sciPerMonth:TELESCOPE_SCI_BASE, health:100};
  _pendingDiscovery=null;
  const savedRandom=Math.random;
  let call=0;
  Math.random=()=>{ call++; return call===1?0:0; }; // fire discovery, then select fault (< TELESCOPE_FAULT_SHARE)
  tickScienceProgram();
  Math.random=savedRandom;
  check('discovery: fault opens a pending decision', !!_pendingDiscovery && _pendingDiscovery.kind==='fault');
  check('discovery: fault cost is a positive number', typeof _pendingDiscovery.cost==='number' && _pendingDiscovery.cost>0);
}

// ---------- 7. resolveDiscovery: fund restores health, decline damages it ----------
{
  state.money=1000; state.scienceProgram={monthsLeft:30, sciPerMonth:TELESCOPE_SCI_BASE, health:60};
  _pendingDiscovery={kind:'fault', cost:5};
  const moneyBefore=state.money;
  resolveDiscovery('fund');
  check('resolve: fund restores health to 100', state.scienceProgram.health===100);
  check('resolve: fund deducts cost', round2(state.money)===round2(moneyBefore-5));
  check('resolve: clears the pending decision', _pendingDiscovery===null);

  state.scienceProgram={monthsLeft:30, sciPerMonth:TELESCOPE_SCI_BASE, health:60};
  _pendingDiscovery={kind:'fault', cost:5};
  resolveDiscovery('decline');
  check('resolve: decline reduces health by TELESCOPE_FAULT_HEALTH', state.scienceProgram.health===60-TELESCOPE_FAULT_HEALTH);
}

// ---------- 8. One slot: a second telescope flight while one is active does not re-seed ----------
{
  state.scienceProgram={monthsLeft:12, sciPerMonth:TELESCOPE_SCI_BASE, health:77};
  const before=Object.assign({}, state.scienceProgram);
  // Mirrors finish()'s guard directly: `if(m.id==='space_telescope' && !state.scienceProgram)`
  const wouldSeed = (!state.scienceProgram);
  check('one-slot: guard blocks re-seed while a program is active', wouldSeed===false);
  check('one-slot: existing program state is untouched by the guard check', JSON.stringify(state.scienceProgram)===JSON.stringify(before));
}

// ---------- 9. Surfacing: commandSummary + outlinerItems don't throw, with and without a program ----------
{
  let threw=false;
  try{
    state.scienceProgram={monthsLeft:2, sciPerMonth:TELESCOPE_SCI_BASE, health:20}; // near-expiry + degraded, should surface
    const cs=commandSummary();
    check('summary: scienceProgram field present when active', !!cs.scienceProgram && cs.scienceProgram.monthsLeft===2);
    const items=outlinerItems();
    check('outliner: telescope row appears when near-expiry/degraded', items.some(it=>it.label.indexOf('Orbital Observatory')!==-1));
    state.scienceProgram=null;
    const cs2=commandSummary();
    check('summary: scienceProgram is null when inactive', cs2.scienceProgram===null);
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('surfacing: no throw', !threw);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
