let pass=0,fail=0;
function check(name,condition){ if(condition) pass++; else { fail++; console.log('FAIL:',name); } }

newGame('engineer'); animEnabled=false; state.money=100; state.activeMission='first_flight';
_devForceOutcome='success';
const beforeSuccess=state.successes;
launch(true,null,'g2-settle-once');
const after={money:state.money,successes:state.successes,flights:state.flights,logs:state.log.length};
check('short launch resolves and releases foreground ownership',state.launchTxn===null&&!_flightResolving&&requestReceipt('g2-settle-once').status==='resolved');
check('successful outcome applies once',state.successes===beforeSuccess+1&&state.flights===1);
launch(true,null,'g2-settle-once');
check('replayed resolved request applies no launch or outcome effects',state.money===after.money&&state.successes===after.successes&&state.flights===after.flights&&state.log.length===after.logs);

newGame('engineer'); animEnabled=false; state.activeMission='first_flight';
const m=curMission(),v=computeVehicle(); state.money=round2(v.launchCost+.12+.01);
_devForceWeather=true; _devForceOutcome='success';
launch(true,null,'g2-terminal-success');
check('solvent payout clears deferred bankruptcy latch',state.money>0&&!state.over&&state.launchTxn===null&&!_flightResolving);

newGame('engineer');
const mission=curMission(),spec=queueSpecSnapshot();
const expendable=makeHull(spec,'rollout'); expendable.status='in-flight';
settleHullFlight(expendable.id,mission,'scrub','txn-expended');
check('safe abort without fitted recovery expends the hull',expendable.status==='expended');
check('hull disposition history carries transaction identity',expendable.history.some(e=>e.outcome==='expended'&&e.transactionId==='txn-expended'));
const recoverSpec=queueSpecSnapshot(); recoverSpec.recovery=true;
const recoverable=makeHull(recoverSpec,'rollout'); recoverable.status='in-flight';
settleHullFlight(recoverable.id,mission,'scrub','txn-recovered');
check('safe abort with fitted recovery recovers the hull',recoverable.status==='recovered');

newGame('engineer'); animEnabled=false; state.money=100;
const exactMission=curMission(),exactSpec=queueSpecSnapshot(),exactHull=makeHull(exactSpec,'rollout'); exactHull.status='in-flight';
const txId='g2-deorbit-tx',ctx={m:exactMission,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:0,routine:false,crewed:false,
  outcome:{kind:'success',subsystem:null,story:'nominal',failPhase:null,rel:.9,phases:[]},rehearsed:false,transactionId:txId,famId:null,hullId:exactHull.id,crewId:null,ab:{rel:0,payoutMult:1}};
state.launchTxn=makeLaunchTransactionRecord({id:txId,requestId:'g2-deorbit-request',intentFingerprint:'fixture',source:'arrival',phase:'settling',missionId:exactMission.id,mission:exactMission,hullId:exactHull.id,spec:exactSpec,context:launchTransactionContextSnapshot(ctx),outcome:ctx.outcome,
  resolution:{command:'commanded-deorbit',stage:'orbit',liftoffOccurred:true,vehicleRecoveryFitted:false,crewCapsuleFitted:false,launchEscapeFitted:false,vehicleDisposition:'in-flight',crewDisposition:'not-applicable'},applied:{ownership:true,cash:true,stock:true,time:true,pad:true,liftoff:true,cruise:true}});
state.requestReceipts['g2-deorbit-request']={requestId:'g2-deorbit-request',kind:'launch',fingerprint:'fixture',resultId:txId};
_flightResolving=true;
finalizeLaunch(ctx,{outcomeOverride:'scrub',log:'commanded deorbit; launch vehicle expended.'});
check('commanded termination persists effective outcome in receipt',requestReceipt('g2-deorbit-request').outcome==='scrub');
check('commanded termination settles exact hull once',exactHull.status==='expended'&&exactHull.history.filter(e=>e.transactionId===txId&&e.outcome==='expended').length===1);
const deorbitOptions=orbitalManeuverOptions(ctx);
check('deorbit control does not promise recovery without hardware',deorbitOptions.find(o=>o.id==='deorbit').label.includes('terminate')&&deorbitOptions.find(o=>o.id==='deorbit').effect.log.includes('expended'));

function settleCrewedLiveAbort(launchEscape,id,stage){
  newGame('engineer'); animEnabled=false; state.money=100; state.rep=100; hirePersonnel('a01');
  const m=MISSIONS.find(x=>x.id==='first_astro'),spec=queueSpecSnapshot(),h=makeHull(spec,'rollout'); h.status='in-flight';
  const txId='g2-live-'+id,ctx={m,v:computeVehicle(),sim:null,windowQuality:1,flightExpense:0,routine:false,crewed:true,
    outcome:{kind:'scrub',subsystem:'propulsion',story:'ascent abort commanded',failPhase:'ascent',rel:.8,phases:[]},rehearsed:false,
    transactionId:txId,famId:null,hullId:h.id,crewId:'a01',ab:{rel:0,payoutMult:1}};
  const tx=makeLaunchTransactionRecord({id:txId,requestId:'g2-live-request-'+id,intentFingerprint:'fixture:'+id,source:'arrival',phase:'settling',missionId:m.id,mission:m,hullId:h.id,spec,context:launchTransactionContextSnapshot(ctx),outcome:ctx.outcome,
    resolution:{command:'live-abort',stage:stage||'ascent',liftoffOccurred:true,vehicleRecoveryFitted:false,crewCapsuleFitted:true,launchEscapeFitted:launchEscape,vehicleDisposition:'in-flight',crewDisposition:'aboard'},applied:{ownership:true,cash:true,stock:true,time:true,pad:true,liftoff:true,cruise:true}});
  state.launchTxn=tx; state.requestReceipts[tx.requestId]={requestId:tx.requestId,kind:'launch',fingerprint:tx.intentFingerprint,resultId:tx.id}; _flightResolving=true;
  finalizeLaunch(ctx,null);
  return {tx,crewPresent:state.staff.some(s=>s.id==='a01'),crewLost:state.crewLost||0,hull:h};
}
const withLes=settleCrewedLiveAbort(true,'les');
check('live ascent abort with frozen LES returns the crew safely',withLes.tx.resolution.crewDisposition==='safe'&&withLes.tx.resolution.recoveryMethod==='launch-escape'&&withLes.crewPresent&&withLes.crewLost===0);
const withoutLes=settleCrewedLiveAbort(false,'no-les','staging');
check('live staging abort without frozen LES settles as crew loss',withoutLes.tx.resolution.crewDisposition==='lost'&&!withoutLes.crewPresent&&withoutLes.crewLost===1);

newGame('engineer'); animEnabled=false; state.money=100; state.activeMission='first_flight'; _devForceWeather=true; _devForceOutcome='success';
const autoBefore=absDay(),autoWrites=[],priorSet=localStorage.setItem;
localStorage.setItem=function(k,v){ if(k===SAVE_KEY) autoWrites.push(JSON.parse(String(v))); return priorSet.call(localStorage,k,v); };
_gameStarted=true; _lastAutosaveT=-1e15;
try{ launch(true,null,'g2-auto-weather'); }finally{ localStorage.setItem=priorSet; }
const autoAfter=absDay(),autoPayload=autoWrites[autoWrites.length-1];
let autoReloadOk=false;
try{ applyLoadedSave(JSON.parse(JSON.stringify(autoPayload))); autoReloadOk=absDay()===autoAfter&&!resumeLaunchTransactionUI(); }catch(e){}
check('animations-off weather recycle checkpoints only after one complete delay',autoWrites.length>0&&autoAfter-autoBefore>=DAYS_PER_MONTH&&autoWrites.every(p=>{ const t=p.state.launchTxn; return !t||!(t.phase==='preparing'&&!t.receipts.weatherRecycle); })&&autoReloadOk);

console.log(`${pass}/${pass+fail} checks passed`);
process.exitCode=fail?1:0;
