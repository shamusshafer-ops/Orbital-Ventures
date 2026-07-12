// E1.5 "Ops friction + trust" — the newly-built display/plumbing layer over machinery that already
// existed (subsystemReport/flightPhaseBreakdown, launchPadCap/padSlotsLeft). Covers:
//   • phaseBreakdownLines(): one plain-text line per phase; failing subsystem marked iff govKey given
//   • log()'s additive 4th `detail` param — backward-compatible (3-arg calls unchanged)
//   • a real forced-loss flight produces a log entry whose detail is the failure causal chain
//   • renderLog() tolerates a mix of entries with/without .detail; detailed entry's title carries both
//   • the Bench reliability metric renders a non-empty title= tooltip
//   • the Bench pad-slot line: absent at Launch Pads L1, present once the level is raised
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// cache getElementById so a rendered card's innerHTML survives to be read back (same trick as
// test-rival-intel.js) — the harness otherwise hands out a fresh memory-less stub per call.
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }
function childHtml(id){ const el=_elCache[id]; if(!el) return ''; return (el.children||[]).map(c=>c&&c.innerHTML||'').join('\n'); }

// ---------- 1. phaseBreakdownLines: shape + governing-subsystem marking ----------
newGame('engineer');
{
  const m=curMission(), v=computeVehicle();
  const rep=subsystemReport(m,v,null,false);
  const phases=flightPhaseBreakdown(rep);
  check('fixture: at least one flight phase', phases.length>=1);

  const plain=phaseBreakdownLines(phases, null);
  check('plain: one line per phase', plain.length===phases.length);
  check('plain: every line names its phase label and a %', plain.every((l,i)=>l.includes(phases[i].label) && /\d+%/.test(l)));
  check('plain: a line lists its subsystems after an em-dash', plain.every(l=>l.includes(' — ')));
  check('plain: nothing marked failed when govKey is null', plain.every(l=>!l.includes('✕FAILED') && !l.startsWith('✕ ')));

  // pick a real subsystem key and confirm ITS phase (and only it) is marked
  const govKey=phases[0].subsystems[0].key;
  const govPhaseIdx=phases.findIndex(ph=>ph.subsystems.some(s=>s.key===govKey));
  const marked=phaseBreakdownLines(phases, govKey);
  check('gov: same line count as plain', marked.length===plain.length);
  check('gov: the governing phase line is flagged with ✕', marked[govPhaseIdx].startsWith('✕ '));
  check('gov: the failing subsystem is labelled ✕FAILED', marked[govPhaseIdx].includes('✕FAILED'));
  check('gov: exactly one subsystem is marked FAILED across all lines', marked.join('\n').split('✕FAILED').length-1===1);
  // phases that don't contain the govKey stay clean
  const others=marked.filter((_,i)=>i!==govPhaseIdx);
  check('gov: non-governing phase lines are unmarked', others.every(l=>!l.includes('✕FAILED') && !l.startsWith('✕ ')));

  // empty / missing input is safe
  check('empty: [] → []', Array.isArray(phaseBreakdownLines([], null)) && phaseBreakdownLines([], null).length===0);
  check('empty: null → []', phaseBreakdownLines(null, 'propulsion').length===0);
}

// ---------- 2. log(): additive 4th param, backward compatible ----------
newGame('engineer');
{
  const n0=state.log.length;
  log('note','a plain three-arg entry');            // legacy 3-arg call
  check('log 3-arg: entry pushed', state.log.length===n0+1);
  check('log 3-arg: detail is undefined (not a broken value)', state.log[0].detail===undefined);
  check('log 3-arg: message intact', state.log[0].msg==='a plain three-arg entry');

  log('bad','a four-arg entry', null, 'phase detail here');
  check('log 4-arg: detail stored verbatim', state.log[0].detail==='phase detail here');
  check('log 4-arg: nav still honored as 3rd param', state.log[0].nav===null);
}

// ---------- 3. a real forced-loss flight writes the causal chain into the log entry's detail ----------
newGame('engineer');
{
  const m=curMission(), v=computeVehicle();
  _devForceOutcome='loss';
  const outcome=resolveFlight(m,v,null,false,0); // forced loss — carries .phases + .subsystem='propulsion'
  check('forced loss: outcome carries per-phase breakdown', Array.isArray(outcome.phases) && outcome.phases.length>=1);
  const before=state.log.length;
  finalizeLaunch({m, v, sim:null, windowQuality:1, flightExpense:0, routine:false, crewed:false, outcome});
  // the loss writes the flavor "…: FAILURE." line (which carries the detail); an inquiry line may log
  // AFTER it, so target the failure line itself rather than the newest entry.
  const entry=state.log.find(l=>/: FAILURE\./.test(l.msg));
  check('forced loss: a failure log entry was written', state.log.length>before && !!entry);
  check('forced loss: entry.detail is a non-empty string', !!entry && typeof entry.detail==='string' && entry.detail.length>0);
  check('forced loss: detail marks the failed subsystem', !!entry && entry.detail.includes('✕FAILED'));
  check('forced loss: detail names the propulsion subsystem that failed', !!entry && /Propuls/i.test(entry.detail));
}

// ---------- 4. renderLog(): tolerates mixed entries; detailed entry's title carries msg + detail ----------
newGame('engineer');
{
  state.log.length=0;                                 // start clean
  log('note','plain entry, no detail');
  log('bad','MISSION FAILURE — engine gave out', null, 'Ascent 88% — Propulsion 90% ✕FAILED, Structures 97%');
  let threw=false;
  try{ renderLog(); }catch(e){ threw=true; console.log('renderLog threw:', e && e.message); }
  check('renderLog: does not throw on a mix of detailed/undetailed entries', !threw);
  const html=childHtml('opsTimeline');
  check('renderLog: the detailed entry title contains the original message', html.includes('MISSION FAILURE'));
  check('renderLog: the detailed entry title contains the phase breakdown detail', html.includes('✕FAILED') && html.includes('Propulsion 90%'));
  check('renderLog: plain entry still rendered', html.includes('plain entry, no detail'));
}

// ---------- 5. Bench reliability metric renders a non-empty title tooltip ----------
newGame('engineer');
{
  const m=curMission(), v=computeVehicle();
  const relTip=phaseBreakdownLines(flightPhaseBreakdown(subsystemReport(m,v,null,v.crewed)),null).join('\n');
  check('bench: pre-flight breakdown is non-empty', relTip.length>0);
  let threw=false;
  try{ renderReadout(); }catch(e){ threw=true; console.log('renderReadout threw:', e && e.message); }
  check('bench: renderReadout does not throw', !threw);
  const html=htmlOf('readoutCard');
  check('bench: a title= attribute is present on the readout', html.includes('title="'));
  check('bench: the reliability tooltip content (first phase line) appears in the markup', html.includes(relTip.split('\n')[0]));
}

// ---------- 6. Bench pad-slot line: hidden at L1, shown once Launch Pads level is raised ----------
newGame('engineer');
{
  check('pads: fresh game is Launch Pads L1', launchPadCap()===1);
  let threw=false;
  try{ renderBenchLaunch(); }catch(e){ threw=true; console.log('renderBenchLaunch threw:', e && e.message); }
  check('pads: renderBenchLaunch does not throw at L1', !threw);
  check('pads: no pad-slot line at L1 (no noise)', !htmlOf('benchLaunch').includes('free this month'));

  // raise the Launch Pads production level (prodLevel reads state.production[key])
  state.production=state.production||{}; state.production.pads=3;
  check('pads: level raised to 3', launchPadCap()===3);
  delete _elCache['benchLaunch'];                     // force a fresh element for the re-render
  renderBenchLaunch();
  const html=htmlOf('benchLaunch');
  check('pads: pad-slot line now shown', html.includes('free this month'));
  check('pads: line reports the correct free/cap counts', html.includes(`Pads: ${padSlotsLeft()}/${launchPadCap()} free this month`));
}

console.log(pass+'/'+(pass+fail));
process.exit(fail>0?1:0);
