// #14 — Pin a research node as "goal" → path highlight. Validates: pinResearchGoal/clearResearchGoal
// (including the already-researched guard and toggle-off), techHighlightSet's fallback to the goal's
// prereq chain when nothing is transiently click-focused (and techFocus taking priority over it),
// researchGoalProgress's remaining/next-step math (and its self-heal on a stale/already-done pin), the
// auto-clear + celebratory log on completeResearch, and render surfacing (goal band, tree, detail panel)
// not throwing with and without a pin. Uses the real earth_observation → planetary_science pair (a
// clean 2-hop chain with no reqMissionDone gate) rather than inventing fixture nodes.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 0. Setup: confirm the chain this whole suite leans on ----------
{
  const e=RESEARCH.find(x=>x.id==='earth_observation'), p=RESEARCH.find(x=>x.id==='planetary_science');
  check('setup: earth_observation exists with no prereqs', !!e && Array.isArray(e.req) && e.req.length===0);
  check('setup: planetary_science requires earth_observation, no mission gate', !!p && p.req.indexOf('earth_observation')>=0 && !p.reqMissionDone);
}

// ---------- 1. pinResearchGoal: pins, toggles off, and won't pin an already-researched node ----------
{
  state.researchGoal=null; state.research={};
  pinResearchGoal('planetary_science');
  check('pin: sets researchGoal', state.researchGoal==='planetary_science');
  pinResearchGoal('planetary_science');
  check('pin: pinning the same id again toggles it off', state.researchGoal===null);

  state.research={earth_observation:true}; // real node, but already researched
  pinResearchGoal('earth_observation');
  check('pin: refuses to pin an already-researched node', state.researchGoal===null);

  pinResearchGoal('not_a_real_id');
  check('pin: refuses an unknown id', state.researchGoal===null);
  state.research={};
}

// ---------- 2. clearResearchGoal: explicit clear, safe no-op when nothing pinned ----------
{
  state.researchGoal='planetary_science';
  clearResearchGoal();
  check('clear: unpins', state.researchGoal===null);
  let threw=false;
  try{ clearResearchGoal(); }catch(e){ threw=true; }
  check('clear: no-op on nothing pinned does not throw', !threw);
}

// ---------- 3. techHighlightSet: falls back to the goal's chain; techFocus still wins when set ----------
{
  state.research={};
  techFocus=null; state.researchGoal=null;
  check('highlight: null when neither focus nor goal is set', techHighlightSet()===null);

  state.researchGoal='planetary_science';
  const hi=techHighlightSet();
  check('highlight: goal fallback includes the goal itself', !!hi && hi.has('planetary_science'));
  check('highlight: goal fallback includes its prereq', !!hi && hi.has('earth_observation'));

  techFocus='kerosene';
  const hi2=techHighlightSet();
  check('highlight: an active click-focus overrides the goal fallback', !!hi2 && hi2.has('kerosene') && !hi2.has('planetary_science'));
  techFocus=null; state.researchGoal=null;
}

// ---------- 4. researchGoalProgress: remaining count + next-step detection ----------
{
  state.research={};
  state.researchGoal='planetary_science';
  let p=researchGoalProgress();
  check('progress: 2 steps remaining (goal + its 1 prereq)', !!p && p.remaining===2);
  check('progress: only the reqs-met prereq (earth_observation) is a next step yet', !!p && p.nextSteps.length===1 && p.nextSteps[0].id==='earth_observation');

  state.research={earth_observation:true};
  p=researchGoalProgress();
  check('progress: 1 step remaining once the prereq is done', !!p && p.remaining===1);
  check('progress: the goal itself becomes the next step once unlocked', !!p && p.nextSteps.length===1 && p.nextSteps[0].id==='planetary_science');

  state.research={};
  state.researchGoal=null;
}

// ---------- 5. researchGoalProgress self-heals a stale pin (already-done goal slipped through, e.g. reconcileResearch) ----------
{
  state.research={planetary_science:true};
  state.researchGoal='planetary_science'; // bypass pinResearchGoal's own guard to simulate a stale save
  const p=researchGoalProgress();
  check('progress: returns null for an already-done goal', p===null);
  check('progress: self-heals by clearing the stale pin', state.researchGoal===null);
  state.research={};
}

// ---------- 6. completeResearch: reaching the pinned goal auto-clears it + logs; a different completion leaves it alone ----------
{
  state.research={}; state.researchGoal='planetary_science';
  state.activeResearch={id:'earth_observation', monthsLeft:1, rushed:0}; // NOT the goal
  const logBefore=state.log.length;
  let threw=false;
  try{ completeResearch(); }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('complete (non-goal): does not throw', !threw);
  check('complete (non-goal): goal stays pinned', state.researchGoal==='planetary_science');
  check('complete (non-goal): earth_observation is now researched', state.research.earth_observation===true);

  state.activeResearch={id:'planetary_science', monthsLeft:1, rushed:0}; // now the goal itself
  try{ completeResearch(); }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('complete (goal): does not throw', !threw);
  check('complete (goal): auto-unpins on completion', state.researchGoal===null);
  check('complete (goal): logs a reached-goal line', state.log.length>logBefore && state.log.slice(0, state.log.length-logBefore).some(e=>/Goal reached/i.test(e.msg)));
  state.research={};
}

// ---------- 7. Surfacing: goal band / tech tree / detail panel don't throw, with and without a pin ----------
{
  let threw=false;
  try{
    state.researchGoal=null;
    check('surfacing: band is empty with no pin', researchGoalBandHTML()==='');
    state.researchGoal='planetary_science';
    const band=researchGoalBandHTML();
    check('surfacing: band renders the goal name when pinned', band.indexOf('Planetary Science') !== -1);
    renderTechFilters();
    renderTechTree();
    state.selectedResearch='planetary_science';
    renderResearchDetail();
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('surfacing: no throw across band/tree/detail render paths', !threw);
  state.researchGoal=null; state.research={};
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
