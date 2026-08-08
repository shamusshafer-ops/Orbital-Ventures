// G0-B01: Skip must not destroy the animation object that owns a not-yet-visible
// launch decision. This reproduces the browser-observed live-call orphan directly
// against the real openFlightForDecision/skipAnim path.
const issue=createExpectedFailureTracker('G0-B01','Skip before a decision orphans launch resolution');
animEnabled=true;
newGame('engineer');
_flightResolving=true;
_pendingReserve=null;

const mission=MISSIONS.find(m=>m.id==='luna_flyby');
const vehicle=computeVehicle();
const outcome={kind:'success',subsystem:null,story:'',failPhase:null,rel:0.7,
  phases:[{phase:'deep',label:'deep space',rel:0.90,p:0.10,subsystems:[{key:'deep_propulsion',rel:0.90,severity:'loss'}]}]};
const ctx={m:mission,v:vehicle,sim:null,windowQuality:1,flightExpense:vehicle.launchCost,
  routine:false,crewed:false,outcome,rehearsed:false,famId:null,hullId:null,crewId:null,
  ab:{rel:0,payoutMult:1}};

_pendingReserve=ctx;
openFlightForDecision(ctx,{holdAt:'cislunar-start',buildPanel:()=>({title:'Reserve call',lines:['pending'],buttons:[]})});
issue.setup('fixture owns a pending future-phase decision', !!animState && _pendingReserve===ctx && !!animState.pendingDecision);
issue.setup('fixture has not reached the decision hold yet', !!animState && !animState.held);
skipAnim();

const recoverableInOverlay=!!animState && (!!animState.pendingDecision || animState.held);
const cleanlyResolved=!_pendingReserve && !_flightResolving;
issue.expect('Skip preserves a reachable decision or completes the transaction', recoverableInOverlay||cleanlyResolved,
  `animState=${!!animState}, pendingReserve=${!!_pendingReserve}, flightResolving=${_flightResolving}`);
issue.finish();
