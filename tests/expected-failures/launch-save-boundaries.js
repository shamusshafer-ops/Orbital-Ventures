// G0-B02: this fixture reaches the production weather decision through
// launchFromHangar, then proves that the save graph has no resumable owner for
// the exact consumed hull. It intentionally does NOT claim coverage of later
// live-call, reserve, orbit-ops, anomaly, rescue, or deferred-arrival boundaries;
// those variants remain uncovered until separate production-path fixtures exist.
const issue=createExpectedFailureTracker('G0-B02','Reload loses weather-boundary launch ownership');

function beginProductionWeatherBoundary(orderId){
  newGame('engineer');
  localStorage.clear();
  _gameStarted=true;
  animEnabled=true;
  state.money=100;
  const mission=MISSIONS.find(m=>m.id==='first_flight');
  state.activeMission=mission.id;
  const spec=queueSpecSnapshot();
  const hull=makeHull(spec,'rollout');
  const ready={id:orderId,name:'Vehicle — First Flight',missionId:mission.id,
    missionName:mission.name,spec,units:1,builtMonth:absMonth(),hullId:hull.id};
  state.hangar=[ready];
  _devForceWeather=true;
  launchFromHangar(ready.id,ready.hullId,'g0-b02-boundary');
  return {mission,hull,ready};
}

let boundary=beginProductionWeatherBoundary('ord-save-boundary');
let mission=boundary.mission, hull=boundary.hull;
issue.setup('production launch reaches the weather hold with exact hull ownership',
  !!_pendingLaunch && _pendingLaunch.m.id===mission.id && _pendingLaunch.hullId===hull.id &&
    _pendingLaunch.prebuilt===true && _flightResolving && hullById(hull.id).status==='preparing' &&
    !hangarList().some(rec=>rec.id===boundary.ready.id),
  `pending=${!!_pendingLaunch}, pendingHull=${_pendingLaunch&&_pendingLaunch.hullId}, hull=${hull.id}, status=${hullById(hull.id)&&hullById(hull.id).status}`);

writeSave();
const raw=localStorage.getItem(SAVE_KEY);
const payload=raw&&JSON.parse(raw);
const savedTxn=payload&&payload.state&&(payload.state.launchTxn||payload.state.pendingLaunch);
issue.expect('save serializes a resumable weather hold for the exact mission and hull',
  !!savedTxn && savedTxn.hullId===hull.id &&
    (savedTxn.missionId===mission.id || (savedTxn.m&&savedTxn.m.id===mission.id)) &&
    !!((savedTxn.draws&&savedTxn.draws.weather)||(savedTxn.decision&&savedTxn.decision.data&&savedTxn.decision.data.weather)),
  `saved=${!!raw}, transaction=${JSON.stringify(savedTxn||null)}, hull=${hull.id}`);

_pendingLaunch=null;
_flightResolving=false;
if(payload) applyLoadedSave(payload);
const restoredHull=hullById(hull.id);
const recoverable=hangarList().some(rec=>rec.hullId===hull.id) || !!state.launchTxn ||
  !!state.pendingLaunch || (restoredHull&&restoredHull.status!=='in-flight');
issue.expect('reload restores a reachable transaction or returns the hull to Hangar', recoverable,
  `hullStatus=${restoredHull&&restoredHull.status}, hangar=${hangarList().length}`);

// Auxiliary B02 lifecycle boundary: ordinary autosave defers correctly, but a
// forced pagehide/beforeunload write snapshots the same production-shaped,
// unresumable weather hold.
boundary=beginProductionWeatherBoundary('ord-lifecycle-boundary');
mission=boundary.mission; hull=boundary.hull;
issue.setup('lifecycle case reaches the same production weather hold',
  !!_pendingLaunch && _pendingLaunch.hullId===hull.id && _flightResolving,
  `pending=${!!_pendingLaunch}, pendingHull=${_pendingLaunch&&_pendingLaunch.hullId}, hull=${hull.id}`);
autosave(false);
const ordinaryRaw=localStorage.getItem(SAVE_KEY), ordinaryPayload=ordinaryRaw&&JSON.parse(ordinaryRaw);
const ordinaryTxn=ordinaryPayload&&ordinaryPayload.state&&ordinaryPayload.state.launchTxn;
issue.expect('ordinary autosave persists the unresolved launch owner',
  !!ordinaryTxn&&ordinaryTxn.hullId===hull.id&&ordinaryTxn.decision&&ordinaryTxn.decision.kind==='weather');
autosave(true);
const forcedRaw=localStorage.getItem(SAVE_KEY);
const forcedPayload=forcedRaw&&JSON.parse(forcedRaw);
const forcedTxn=forcedPayload&&forcedPayload.state&&(forcedPayload.state.launchTxn||forcedPayload.state.pendingLaunch);
issue.expect('lifecycle-forced save defers or persists a resumable owner for the exact hull',
  !forcedRaw || (!!forcedTxn && forcedTxn.hullId===hull.id),
  `saved=${!!forcedRaw}, transaction=${JSON.stringify(forcedTxn||null)}, hull=${hull.id}`);
issue.finish();
