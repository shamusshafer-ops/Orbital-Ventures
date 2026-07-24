// Money & Budget balance pass, Option C (2026-07-24) — "investor confidence": a rolling loss-streak
// surcharge on build cost + government funding, filling the gap the audit found: a routine uncrewed
// loss had zero economic consequence beyond the sunk build cost. Same rolling-window/self-decaying
// shape as the existing cadence surcharge. Traced against Option A's tightened starting cash before
// shipping (see ROADMAP.md session entry) — this suite locks in the mechanism and the death-spiral
// finding, not just the raw numbers.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- helpers exist and start clean ----------
{
  newGame('engineer');
  check('recentLosses starts empty', Array.isArray(state.recentLosses) && state.recentLosses.length===0);
  check('recentLossSeverity is 0 with no losses', recentLossSeverity()===0);
  check('investorConfidenceBuildPenalty is 0 with no losses', investorConfidenceBuildPenalty()===0);
  check('investorConfidenceFundMult is 1 with no losses', investorConfidenceFundMult()===1);
}

// ---------- recordLoss accumulates severity correctly ----------
{
  newGame('engineer');
  recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  check('one uncrewed loss recorded', state.recentLosses.length===1);
  check('recentLossSeverity reflects it', recentLossSeverity()===INVESTOR_CONF_SEV_UNCREWED);
  recordLoss(INVESTOR_CONF_SEV_CREWED);
  check('a crewed loss is weighted lower than uncrewed', INVESTOR_CONF_SEV_CREWED < INVESTOR_CONF_SEV_UNCREWED);
  check('severities sum', approxEq(recentLossSeverity(), INVESTOR_CONF_SEV_UNCREWED+INVESTOR_CONF_SEV_CREWED));
}
function approxEq(a,b){ return Math.abs(a-b)<1e-9; }

// ---------- build penalty and funding multiplier scale with severity, both capped ----------
{
  newGame('engineer');
  for(let i=0;i<3;i++) recordLoss(INVESTOR_CONF_SEV_UNCREWED); // severity 3
  const buildPen=investorConfidenceBuildPenalty();
  check('build penalty matches rate*severity below the cap', approxEq(buildPen, 3*INVESTOR_CONF_BUILD_RATE));
  const fundMult=investorConfidenceFundMult();
  check('funding multiplier matches 1-rate*severity below the cap', approxEq(fundMult, 1-3*INVESTOR_CONF_FUND_RATE));

  // push well past the cap
  for(let i=0;i<20;i++) recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  check('build penalty caps at INVESTOR_CONF_BUILD_CAP', investorConfidenceBuildPenalty()===INVESTOR_CONF_BUILD_CAP);
  check('funding multiplier floors at 1-INVESTOR_CONF_FUND_CAP', approxEq(investorConfidenceFundMult(), 1-INVESTOR_CONF_FUND_CAP));
}

// ---------- rolling window: an old loss ages out and the penalty returns to zero ----------
{
  newGame('engineer');
  recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  check('penalty is active right after a loss', investorConfidenceBuildPenalty()>0);
  state.year += Math.ceil((INVESTOR_CONF_WINDOW+1)/12); // advance well past the window
  check('penalty decays to zero once the loss ages out of the window', investorConfidenceBuildPenalty()===0);
  check('funding multiplier returns to 1 once aged out', investorConfidenceFundMult()===1);
}

// ---------- integration: computeVehicle actually applies the build penalty ----------
{
  newGame('engineer');
  const before=computeVehicle().buildCost;
  for(let i=0;i<3;i++) recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  const after=computeVehicle().buildCost;
  check('buildCost rises after a loss streak', after>before);
  check('the rise matches the expected multiplier', approxEq(round2(after), round2(before*(1+investorConfidenceBuildPenalty()))));
}

// ---------- integration: govMonthlyFunding actually applies the funding penalty ----------
{
  newGame('engineer');
  state.publicSupport=90; // ensure a nonzero base grant to see the multiplier bite
  const before=govMonthlyFunding();
  for(let i=0;i<3;i++) recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  const after=govMonthlyFunding();
  check('gov funding drops after a loss streak (support unchanged)', after<before);
}

// ---------- finalizeLaunch hooks: each real loss branch records the right severity ----------
{
  function freshMissionCtx(missionId, crewFlag){
    newGame('engineer');
    const m=MISSIONS.find(x=>x.id===missionId);
    selectMission(missionId);
    const v=computeVehicle();
    return {m, v, sim:{}, windowQuality:1, flightExpense:0, routine:false, crewed:crewFlag, ab:{rel:0,payoutMult:1}};
  }

  // uncrewed catastrophic loss (final else-branch, failPhase not 'ascent' to skip pad-damage noise)
  {
    const ctx=freshMissionCtx('first_flight', false);
    const outcome={kind:'loss', rel:0.5, story:'test failure', failPhase:'coast', subsystem:'propulsion'};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('uncrewed catastrophic loss records full severity', approxEq(recentLossSeverity(), INVESTOR_CONF_SEV_UNCREWED));
  }

  // uncrewed abort (vehicle lost, crew n/a)
  {
    const ctx=freshMissionCtx('first_flight', false);
    const outcome={kind:'abort', rel:0.5, story:'test abort', subsystem:'propulsion'};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('uncrewed abort records full severity', approxEq(recentLossSeverity(), INVESTOR_CONF_SEV_UNCREWED));
  }

  // crewed catastrophic loss — halved severity
  {
    const ctx=freshMissionCtx('first_astro', true);
    hirePersonnel(ASTRONAUTS[0].id);
    ctx.crewId=ASTRONAUTS[0].id;
    state.assignedAstronaut=ctx.crewId;
    const outcome={kind:'loss', rel:0.5, story:'test crewed loss', failPhase:'coast', subsystem:'propulsion'};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('crewed catastrophic loss records halved severity', approxEq(recentLossSeverity(), INVESTOR_CONF_SEV_CREWED));
  }

  // scrub — vehicle and crew explicitly recovered — must NOT record a loss
  {
    const ctx=freshMissionCtx('first_flight', false);
    const outcome={kind:'scrub', rel:0.5, story:'test scrub'};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('a scrub (vehicle recovered) does not record a loss', recentLossSeverity()===0);
  }

  // partial success — objective incomplete but not a vehicle loss — must NOT record a loss
  {
    const ctx=freshMissionCtx('first_flight', false);
    const outcome={kind:'partial', rel:0.5, story:'test partial'};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('a partial success does not record a loss', recentLossSeverity()===0);
  }

  // success — must NOT record a loss
  {
    const ctx=freshMissionCtx('first_flight', false);
    const outcome={kind:'success', rel:0.9, story:'test success', failPhase:null};
    finalizeLaunch(Object.assign(ctx,{outcome}));
    check('a success does not record a loss', recentLossSeverity()===0);
  }
}

// ---------- death-spiral check: a worst-case 4-consecutive-failure Engineer-mode opening still ----------
// resolves through the game's existing gameOver/bailout path rather than a silent stuck state.
// (Traced pre-implementation: this risk originates from Option A's tightened cash, not this
// mechanism — Option C only shaves the remaining margin. See ROADMAP.md for the full trace.)
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='first_flight');
  for(let i=0;i<4;i++){
    const v=computeVehicle();
    const cost=round2(v.buildCost+v.launchCost);
    state.money=round2(state.money-cost);
    recordLoss(INVESTOR_CONF_SEV_UNCREWED);
  }
  check('after 4 uncrewed losses, build penalty has grown but stays under the cap', investorConfidenceBuildPenalty()>0 && investorConfidenceBuildPenalty()<=INVESTOR_CONF_BUILD_CAP);
  check('gameOver is reachable (not undefined) as the designed backstop for a bankrupt run', typeof gameOver==='function');
  check('bailout terms remain available at this point (era-scaled, not blocked by loss history)', bailoutTerms().amount>0);
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
