// BACKLOG #39 — Pad aborts damage the pad (repair time). Only a catastrophic ascent-phase loss
// (full vehicle loss, no escape-tower save — i.e. finalizeLaunch's outcome.kind==='loss' branch)
// damages one currently-healthy pad, taking it offline for a repair window. Repair time scales
// with Pads level (better infrastructure/crews repair faster, floored at 1 month). Damage is
// tracked per pad index, not as one global flag, so a multi-pad juggernaut only loses partial
// cadence from a single bad flight.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- 1. padRepairMonths scales down with level, floored at 1 ----------
{
  check('L1 repair = base 3 months', padRepairMonths(1)===3);
  check('L3 repair is shorter than L1', padRepairMonths(3)<padRepairMonths(1));
  check('L5 repair floored at 1 month, never 0 or negative', padRepairMonths(5)===1);
  check('repair months always an integer', Number.isInteger(padRepairMonths(1)) && Number.isInteger(padRepairMonths(5)));
}

// ---------- 2. damageAPad picks a healthy pad, marks it, and launchPadCap reflects it ----------
{
  newGame('engineer');
  state.production.pads=3; // 3 pads, all healthy
  check('start: no pads damaged', damagedPadCount()===0);
  check('start: full cap available', launchPadCap()===3);
  const dmg=damageAPad();
  check('damageAPad returns the pad it hit', dmg.pad===1); // lowest healthy index first
  check('damageAPad returns a future repair month', dmg.until>absMonth());
  check('one pad now counts as damaged', damagedPadCount()===1);
  check('launchPadCap drops by exactly 1', launchPadCap()===2);
  check('isPadDamaged reports true for the hit pad', isPadDamaged(1)===true);
  check('isPadDamaged reports false for an untouched pad', isPadDamaged(2)===false);
}

// ---------- 3. a second catastrophic loss hits a DIFFERENT healthy pad, not the same one twice ----------
{
  newGame('engineer');
  state.production.pads=3;
  const first=damageAPad();
  const second=damageAPad();
  check('second damage picks a different pad', second.pad!==first.pad);
  check('two pads now damaged', damagedPadCount()===2);
  check('cap reflects both pads down', launchPadCap()===1);
}

// ---------- 4. cap never drops below 1, even with every pad down ----------
{
  newGame('engineer');
  state.production.pads=2;
  damageAPad(); damageAPad();
  check('all pads damaged', damagedPadCount()===2);
  check('cap floors at 1, never 0', launchPadCap()===1);
  // a further catastrophic loss on an all-down fleet extends repair rather than no-op/crashing
  const before=Object.assign({}, state.padDamage);
  const extended=damageAPad();
  check('extending an already-damaged pad does not throw and returns a pad id', typeof extended.pad==='number');
  check('the extended pad\'s repair-until moved later (not stuck)', state.padDamage[extended.pad] > before[extended.pad]);
}

// ---------- 5. repair expires: once absMonth() reaches the target month, the pad is healthy again ----------
{
  newGame('engineer');
  state.production.pads=2;
  const dmg=damageAPad();
  check('damaged immediately after the hit', isPadDamaged(dmg.pad)===true);
  // fast-forward state.month/year directly to simulate time passing without touching unrelated systems
  const monthsToAdvance=dmg.until-absMonth();
  for(let i=0;i<monthsToAdvance;i++){ state.month++; if(state.month>11){ state.month=0; state.year++; } }
  check('pad is healthy again once its repair month is reached', isPadDamaged(dmg.pad)===false);
  check('cap is back to full', launchPadCap()===2);
}

// ---------- 6. single-pad startup: damage still floors cap at 1, never locks the player out ----------
{
  newGame('engineer');
  state.production.pads=1;
  check('single pad starts healthy, cap=1', launchPadCap()===1);
  damageAPad();
  check('damaging the only pad still leaves cap at 1 (floor), not 0', launchPadCap()===1);
  check('the single pad is marked damaged even though cap floors', damagedPadCount()===1);
}

// ---------- 7. wiring: only a catastrophic (kind==='loss') ascent finalizeLaunch triggers pad damage ----------
{
  newGame('engineer');
  state.production.pads=3;
  const before=damagedPadCount();
  const m=curMission(), v=computeVehicle();
  _devForceOutcome='loss';
  const outcome=resolveFlight(m,v,null,false,0);
  check('forced loss carries failPhase ascent (catastrophic, on/near pad)', outcome.failPhase==='ascent');
  finalizeLaunch({m, v, sim:null, windowQuality:1, flightExpense:0, routine:false, crewed:false, outcome});
  check('a catastrophic loss damages a pad', damagedPadCount()===before+1);
  const dmgLog=state.log.find(l=>/damaged Pad/.test(l.msg));
  check('a log entry announces the pad damage', !!dmgLog);
}

// ---------- 8. wiring: success does NOT damage a pad ----------
{
  newGame('engineer');
  state.production.pads=3;
  const before=damagedPadCount();
  const m=curMission(), v=computeVehicle();
  _devForceOutcome='success';
  const outcome=resolveFlight(m,v,null,false,0);
  finalizeLaunch({m, v, sim:null, windowQuality:1, flightExpense:0, routine:false, crewed:false, outcome});
  check('a successful flight leaves pads untouched', damagedPadCount()===before);
}

// ---------- 9. wiring: partial (non-catastrophic) outcomes do NOT damage a pad ----------
{
  newGame('engineer');
  state.production.pads=3;
  const before=damagedPadCount();
  const m=curMission(), v=computeVehicle();
  _devForceOutcome='partial';
  const outcome=resolveFlight(m,v,null,false,0);
  finalizeLaunch({m, v, sim:null, windowQuality:1, flightExpense:0, routine:false, crewed:false, outcome});
  check('a partial (wrong-orbit) outcome leaves pads untouched', damagedPadCount()===before);
}

// ---------- 10. padDamageMap lazily initializes on a fresh/legacy save (no SAVE_VERSION bump needed) ----------
{
  newGame('engineer');
  delete state.padDamage; // simulate a legacy save with no field at all
  check('padDamageMap creates an empty object when missing', typeof padDamageMap()==='object' && Object.keys(padDamageMap()).length===0);
  check('launchPadCap works fine on a legacy/missing padDamage field', launchPadCap()===prodLevel('pads'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
