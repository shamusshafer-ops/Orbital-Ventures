// G0-B05 after Gate 1: quote disclosure is now honest and the exact-hull action
// is correctly disabled. The remaining defect is economic continuity: following
// the recommended early research + static-fire + build path exhausts the runway
// needed to fly that finished First Flight article. Gate 3 owns the rebalance or
// recovery design; this fixture does not claim all eventual routes are exhausted.
const issue=createExpectedFailureTracker('G0-B05','Recommended opening path exhausts First Flight runway');
animEnabled=false;
seedRNG(7);
newGame('engineer');

buyResearch('test_program');
while(state.activeResearch && !state.over) advanceDays(1);
issue.setup('recommended Static Fire Test Program research completes',
  !!state.research.test_program && !state.activeResearch && !state.over,
  `researched=${!!state.research.test_program}, active=${state.activeResearch&&state.activeResearch.id}, over=${state.over}`);
const beforeStaticFire=state.money;
staticFire();
issue.setup('prominently offered bench static fire executes once',
  Math.abs(state.money-(beforeStaticFire-STATIC_FIRE_COST))<0.011,
  `before=${beforeStaticFire.toFixed(2)}, after=${state.money.toFixed(2)}, cost=${STATIC_FIRE_COST.toFixed(2)}`);
state.activeMission='first_flight';
queueBuild(true,'g0-b05-opening');
while(buildQueueList().length && !state.over) advanceDays(1);

const ready=hangarFor(curMission());
const vehicle=computeVehicle();
const check=canLaunch(vehicle,curMission(),null,true);
const quote=launchCommitmentQuote(curMission(),vehicle,null,true);
const surface=benchQueueHTML(curMission());

issue.setup('research and bench-test path produces one ready First Flight hull', ready.length===1,
  `hangar=${ready.length}, over=${state.over}, money=${state.money.toFixed(2)}`);
issue.setup('the exact ready-hull action is surfaced, disabled, and identifies its hull',
  !!ready[0] && surface.includes(`data-subject-id="${ready[0].hullId}"`) &&
    /data-action-role="primary"[^>]*disabled aria-disabled="true"/.test(surface),
  surface.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
issue.setup('the surface discloses flight burn, reserve, and exact shortfall',
  !quote.canCommit && surface.includes(fM(quote.flightBurn))&&surface.includes(fM(quote.launchCarry))&&
    surface.includes(fM(quote.rejection.shortfall)),
  `cash=${fM(state.money)}, flight=${fM(quote.flightBurn)}, reserve=${fM(quote.launchCarry)}, short=${fM(quote.rejection&&quote.rejection.shortfall||0)}`);
issue.expect('recommended opening sequence preserves enough runway to fly its exact First Flight hull',
  check.ok,
  `cash=${fM(state.money)}, required=${fM(quote.requiredAtCommit)}, reason=${check.why||'none'}`);
restoreRNG();
issue.finish();
