// G0-B08 supporting invariant only: two deliberate calls to the public build
// mutation create two paid orders. That proves the mutation has no idempotency
// contract; it does NOT prove that one browser activation is delivered twice.
// Real same-control rapid/repeated DOM coverage is owned by the browser harness.
const issue=createExpectedFailureTracker('G0-B08','Build mutation lacks a duplicate-request idempotency invariant');

newGame('engineer');
state.money=100;
state.activeMission='first_flight';
const before=state.money;
const buildCost=computeVehicle().buildCost;
issue.setup('build mutation starts from an empty affordable queue',
  buildQueueList().length===0 && state.money>=buildCost,
  `orders=${buildQueueList().length}, money=${state.money.toFixed(2)}, build=${buildCost.toFixed(2)}`);
queueBuild(true); // deliberate caller invocation 1
queueBuild(true); // deliberate caller invocation 2

issue.expect('replaying the same logical build request creates one production order',
  buildQueueList().length===1,
  `deliberate calls=2, orders=${buildQueueList().length}`);
issue.expect('replaying the same logical build request debits build cost once',
  Math.abs(state.money-(before-buildCost))<0.011,
  `deliberate calls=2, before=${before.toFixed(2)}, after=${state.money.toFixed(2)}, build=${buildCost.toFixed(2)}`);

// Supporting positive control: a consumed Hangar ID already rejects a repeated
// call because ownership of that exact physical hull has moved.
newGame('engineer');
animEnabled=false;
state.money=100;
state.activeMission='first_flight';
queueBuild(true);
while(buildQueueList().length) advanceDays(1);
const ready=hangarFor(curMission())[0];
issue.setup('positive control has one exact ready hull',
  !!ready && !!ready.hullId && hullById(ready.hullId).status==='hangar',
  `order=${ready&&ready.id}, hull=${ready&&ready.hullId}`);
_devForceOutcome='success';
launchFromHangar(ready.id);
const flightsAfterFirst=state.flights;
launchFromHangar(ready.id);
issue.setup('consumed-hull identity rejects a repeated launch call',
  state.flights===flightsAfterFirst && !hangarList().some(rec=>rec.id===ready.id),
  `first=${flightsAfterFirst}, after repeated call=${state.flights}, orderPresent=${hangarList().some(rec=>rec.id===ready.id)}`);

// Supporting positive control: clearing the pending decision gives repeated
// decision resolution an existing no-op guard.
newGame('engineer');
animEnabled=false;
const mission=MISSIONS.find(m=>m.id==='first_flight'), vehicle=computeVehicle();
const ctx={m:mission,v:vehicle,sim:null,windowQuality:1,flightExpense:vehicle.launchCost,routine:false,crewed:false,
  outcome:{kind:'success',subsystem:null,story:'',failPhase:null,rel:0.9,phases:[]},rehearsed:false,famId:null,hullId:null,crewId:null,ab:{rel:0,payoutMult:1}};
_pendingLive=ctx;
resolveLiveCall(true);
const afterDecision={money:state.money,successes:state.successes,flights:state.flights};
resolveLiveCall(true);
issue.setup('cleared pending decision makes repeated resolution a no-op',
  state.money===afterDecision.money && state.successes===afterDecision.successes && state.flights===afterDecision.flights,
  `before repeated call=${JSON.stringify(afterDecision)}, after=${JSON.stringify({money:state.money,successes:state.successes,flights:state.flights})}`);
issue.finish();
