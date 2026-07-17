// #81 — Sample-return market: bank-for-research vs sell-for-cash decision on prestige sciMission
// completions (space_telescope, sample_return, astrobiology, oort_precursor). Reuses the inquiry
// fund/decline pending-decision shape (triggerSampleDecision/maybeShowSampleDecision/
// showSampleDecisionModal/resolveSampleDecision). No SAVE_VERSION bump — _pendingSampleDecision is
// transient, same as _pendingInquiry/_pendingDiscovery/_pendingRescue.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. All four sciMission missions still carry sciYield (feature's own dependency) ----------
{
  const ids=['space_telescope','sample_return','astrobiology','oort_precursor'];
  ids.forEach(id=>{
    const m=MISSIONS.find(x=>x.id===id);
    check(`setup: ${id} exists`, !!m);
    check(`setup: ${id} is a sciMission with positive sciYield`, !!m && m.sciMission===true && m.sciYield>0);
  });
  // Deliberately excluded: the procedural Deep-Space Sample Return contract carries no sciYield
  // (by design — see its comment in data.js), so it never reaches triggerSampleDecision at all.
  const proc=CONTRACT_ARCHETYPES.find(a=>a.kind==='sample_return');
  check('setup: procedural sample_return archetype has no sciYield field', !!proc && proc.build && !('sciYield' in (proc.build(0)||{})));
}

// ---------- 2. triggerSampleDecision: opens a pending decision with correct bank/sell amounts ----------
{
  _pendingSampleDecision=null;
  const m=MISSIONS.find(x=>x.id==='sample_return');
  const sciAmount=42;
  triggerSampleDecision(m, sciAmount);
  check('trigger: opens _pendingSampleDecision', !!_pendingSampleDecision);
  check('trigger: mission name recorded', _pendingSampleDecision.mName===m.name);
  check('trigger: sci amount recorded as given', _pendingSampleDecision.sciAmount===sciAmount);
  check('trigger: money amount is sciAmount*SCI_SELL_RATE', round2(_pendingSampleDecision.moneyAmount)===round2(sciAmount*SCI_SELL_RATE));
}

// ---------- 3. triggerSampleDecision: a second trigger while one is pending auto-banks (no clobber, no loss) ----------
{
  const m1=MISSIONS.find(x=>x.id==='sample_return'), m2=MISSIONS.find(x=>x.id==='astrobiology');
  _pendingSampleDecision=null;
  triggerSampleDecision(m1, 42);
  const before=Object.assign({}, _pendingSampleDecision);
  const sciBefore=state.science||0;
  triggerSampleDecision(m2, 78);
  check('double-trigger: original pending decision is untouched', JSON.stringify(_pendingSampleDecision)===JSON.stringify(before));
  check('double-trigger: second windfall is auto-banked into state.science instead of dropped', round2(state.science)===round2(sciBefore+78));
}

// ---------- 4. resolveSampleDecision('bank'): credits science, no money, clears pending ----------
{
  state.science=10; state.money=100;
  _pendingSampleDecision={ mName:'Lunar Sample Return', sciAmount:42, moneyAmount:21 };
  resolveSampleDecision('bank');
  check('resolve bank: science credited', round2(state.science)===round2(10+42));
  check('resolve bank: money unchanged', round2(state.money)===100);
  check('resolve bank: pending decision cleared', _pendingSampleDecision===null);
}

// ---------- 5. resolveSampleDecision('sell'): credits money, no science, clears pending ----------
{
  state.science=10; state.money=100;
  _pendingSampleDecision={ mName:'Lunar Sample Return', sciAmount:42, moneyAmount:21 };
  resolveSampleDecision('sell');
  check('resolve sell: money credited', round2(state.money)===round2(100+21));
  check('resolve sell: science unchanged', round2(state.science)===10);
  check('resolve sell: pending decision cleared', _pendingSampleDecision===null);
}

// ---------- 6. resolveSampleDecision: a stale/absent pending decision is a safe no-op ----------
{
  _pendingSampleDecision=null;
  const sciBefore=state.science, moneyBefore=state.money;
  resolveSampleDecision('sell');
  check('resolve: no-op when nothing pending (science unchanged)', state.science===sciBefore);
  check('resolve: no-op when nothing pending (money unchanged)', state.money===moneyBefore);
}

// ---------- 7. maybeShowSampleDecision: gated behind the same higher-priority decisions as discovery ----------
{
  const savedSetback=_pendingSetback, savedMishap=_pendingLogiMishap, savedInquiry=_pendingInquiry,
        savedHearing=_pendingHearing, savedRival=_pendingRivalDisaster;
  _pendingSampleDecision={ mName:'Orbital Observatory', sciAmount:22, moneyAmount:11 };
  let threw=false;
  try{
    _pendingSetback={}; check('gate: blocked while a setback is pending', (()=>{ const before=_pendingSampleDecision; maybeShowSampleDecision(); return _pendingSampleDecision===before; })());
    _pendingSetback=null; _pendingLogiMishap={}; check('gate: blocked while a mishap is pending', !!_pendingSampleDecision);
    _pendingLogiMishap=null; _pendingInquiry={}; check('gate: blocked while an inquiry is pending', !!_pendingSampleDecision);
    _pendingInquiry=null; _pendingHearing={}; check('gate: blocked while a hearing is pending', !!_pendingSampleDecision);
    _pendingHearing=null; _pendingRivalDisaster={rivalId:'x'}; check('gate: blocked while a rival disaster is pending', !!_pendingSampleDecision);
    _pendingRivalDisaster=null;
    maybeShowSampleDecision(); // nothing else pending now — should reach showSampleDecisionModal without throwing
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('gate: clear path does not throw', !threw);
  _pendingSetback=savedSetback; _pendingLogiMishap=savedMishap; _pendingInquiry=savedInquiry;
  _pendingHearing=savedHearing; _pendingRivalDisaster=savedRival; _pendingSampleDecision=null;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
