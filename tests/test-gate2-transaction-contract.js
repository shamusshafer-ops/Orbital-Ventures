let pass=0,fail=0;
function check(name,condition){ if(condition) pass++; else { fail++; console.log('FAIL:',name); } }

newGame('engineer'); state.money=100; state.activeMission='first_flight';
const buildBefore=state.money, buildCost=computeVehicle().buildCost;
const orderA=queueBuild(true,'g2-build-one');
const replayA=queueBuild(true,'g2-build-one');
check('same build request creates one exact order',buildQueueList().length===1&&replayA.id===orderA.id);
check('same build request debits once',Math.abs(state.money-(buildBefore-buildCost))<.011);
state.stages[0].prop+=1;
const collisionMoney=state.money;
check('same request id with changed intent is rejected',queueBuild(true,'g2-build-one')===null&&state.money===collisionMoney);

newGame('engineer'); state.money=100; state.activeMission='first_flight';
queueBuild(true,'g2-build-a'); queueBuild(true,'g2-build-b');
check('different request ids create different orders',buildQueueList().length===2&&new Set(buildQueueList().map(x=>x.id)).size===2);

newGame('engineer'); state.money=100; state.activeMission='first_flight'; animEnabled=true;
queueBuild(true,'g2-ready-build'); while(buildQueueList().length) advanceDays(1);
const ready=hangarFor(curMission())[0],hull=hullById(ready.hullId);
_devForceWeather=true;
launchFromHangar(ready.id,ready.hullId,'g2-ready-flight');
check('weather recycle owns the exact hull outside Hangar',state.launchTxn&&state.launchTxn.hullId===hull.id&&!hangarList().some(x=>x.hullId===hull.id));
check('preflight weather hold has not counted a flight',hull.status==='preparing'&&hull.flights===0&&state.flights===0&&!hull.history.some(e=>e.outcome==='launched'));
check('transaction is schema-valid and JSON-only',lifecycleRecordErrors('transaction',state.launchTxn).length===0&&recordIsJsonSafe(state.launchTxn));
check('weather decision carries stable identity and options',state.launchTxn.decision&&state.launchTxn.decision.kind==='weather'&&state.launchTxn.decision.options.join(',')==='scrub,launch');
const launchSnapshot={money:state.money,flights:state.flights,history:hull.history.length,txn:state.launchTxn.id};
launchFromHangar(ready.id,ready.hullId,'g2-ready-flight');
check('repeated consumed-hull activation is a no-op',state.money===launchSnapshot.money&&state.flights===launchSnapshot.flights&&hull.history.length===launchSnapshot.history&&state.launchTxn.id===launchSnapshot.txn);
check('active lifecycle has one owner and no audit errors',auditLifecycleState().length===0);

newGame('engineer');
const orphan=makeHullRecord({id:'g2-orphan',serial:'OVH-ORPHAN',status:'in-flight'});
state.hulls=[orphan]; state.hangar=[]; state.activeFlights=[]; state.launchTxn=null;
check('lifecycle audit rejects an active hull with zero owners',auditLifecycleState().some(e=>/in-flight status has no transaction or flight owner/.test(e)));
let orphanLoadRejected=false;
try{ applyLoadedSave(JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}))); }catch(e){ orphanLoadRejected=/no transaction or flight owner/.test(e.message); }
check('v62 load rejects an orphaned active hull',orphanLoadRejected);

console.log(`${pass}/${pass+fail} checks passed`);
process.exitCode=fail?1:0;
