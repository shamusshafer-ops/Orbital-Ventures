// G0-B04: a safe weather delay can cross zero during launch lead time. The
// animation-off path continues into a forced-success payout, but state.over remains
// stale even when the treasury is positive. Bridge loans are still available in
// this setup, so this fixture does not claim that every recovery route is exhausted.
const issue=createExpectedFailureTracker('G0-B04','Successful payout leaves a stale terminal latch');
let solventButOver=0;
let overTotal=0;
let solventButOverWithLoans=0;

for(let seed=1;seed<=1000;seed++){
  newGame('engineer');
  animEnabled=false;
  seedRNG(seed);
  const mission=MISSIONS.find(m=>m.id==='first_flight');
  state.activeMission=mission.id;
  const vehicle=computeVehicle();
  // canLaunch reserves only its fixed 0.12M month. Leave a one-cent cushion so
  // ordinary launch lead time survives but an adverse-weather wait does not.
  state.money=round2(vehicle.launchCost+0.12+0.01);
  _devForceOutcome='success';
  launch(true,null);
  if(state.over) overTotal++;
  if(state.over && state.money>0){
    solventButOver++;
    if(2-(state.bailouts||0)>0) solventButOverWithLoans++;
  }
  restoreRNG();
  _flightResolving=false;
  _pendingLaunch=_pendingLive=_pendingReserve=_pendingOps=_pendingRescue=null;
}

issue.expect('a successful payout clears the stale terminal latch once cash is positive', solventButOver===0,
  `${solventButOver}/1000 solvent-but-over; ${solventButOverWithLoans}/1000 still have bridge loans; ${overTotal}/1000 total over`);
issue.finish();
