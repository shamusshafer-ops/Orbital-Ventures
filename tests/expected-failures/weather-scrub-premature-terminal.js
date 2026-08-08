// G0-B03: the safe scrub path advances time while the launch transaction still
// owns an in-flight hull. Insolvency is evaluated inside that wait and latches
// game-over before scrubLaunch can finish or return ownership.
const issue=createExpectedFailureTracker('G0-B03','Weather scrub evaluates terminal state before the active launch resolves');
animEnabled=true;
newGame('engineer');
state.activeMission='first_flight';

const mission=curMission();
const vehicle=computeVehicle();
const spec=queueSpecSnapshot();
const hull=makeHull(spec,'rollout');
const ready={id:'ord-weather-boundary',name:'Vehicle — First Flight',missionId:mission.id,
  missionName:mission.name,spec,units:1,builtMonth:absMonth(),hullId:hull.id};
state.hangar=[ready];

// canLaunch's fixed reserve leaves one cent after the normal launch month. The
// forced safe scrub consumes the next month and crosses zero mid-transaction.
state.money=round2(vehicle.launchCost+0.12+0.01);
_devForceWeather=true;
_devForceOutcome='success';

let terminalCalls=0, terminalSnapshot=null;
const realGameOver=gameOver;
gameOver=()=>{
  terminalCalls++;
  terminalSnapshot={flightResolving:_flightResolving,pendingLaunch:!!_pendingLaunch,
    hullStatus:(hullById(hull.id)||{}).status,money:state.money};
  realGameOver();
};

launchFromHangar(ready.id,ready.hullId,'g0-b03-weather');
issue.setup('forced scrub begins inside an active, non-terminal transaction',
  !!_pendingLaunch&&_flightResolving&&!state.over,
  `pendingLaunch=${!!_pendingLaunch}, resolving=${_flightResolving}, over=${state.over}, money=${state.money.toFixed(3)}`);
scrubLaunch();

issue.expect('terminal evaluation waits until the launch transaction resolves', terminalCalls===0,
  `calls=${terminalCalls}, snapshot=${JSON.stringify(terminalSnapshot)}`);
issue.expect('the scrub returns or resolves hull ownership before any game-over latch',
  !state.over || !_flightResolving,
  `over=${state.over}, resolving=${_flightResolving}, hull=${(hullById(hull.id)||{}).status}, hangar=${hangarList().length}`);
issue.finish();
