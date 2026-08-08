let pass=0,fail=0;
function check(name,condition){ if(condition) pass++; else { fail++; console.log('FAIL:',name); } }

function baseCtx(m,txId,hullId,crewed){
  const v=computeVehicle();
  return {m,v,sim:null,windowQuality:1,flightExpense:v.launchCost,routine:false,crewed:!!crewed,
    outcome:{kind:'success',subsystem:null,story:'nominal',failPhase:null,rel:.9,phases:[]},
    rehearsed:false,transactionId:txId,famId:null,hullId,crewId:crewed?'astro1':null,ab:{rel:0,payoutMult:1}};
}
function decisionPayload(kind,data,options,status){
  newGame('engineer'); animEnabled=true; state.money=100;
  const m=MISSIONS.find(x=>x.id==='first_flight');
  const hull=makeHull(queueSpecSnapshot(),'rollout'); hull.status=status||'in-flight';
  const txId='resume-'+kind,ctx=baseCtx(m,txId,hull.id,kind==='rescue'||kind==='live');
  if(kind==='rescue') ctx.outcome={kind:'strand',subsystem:'life_support',story:'stranded',failPhase:'deep',rel:.7,phases:[]};
  state.launchTxn=makeLaunchTransactionRecord({id:txId,requestId:'req-'+kind,intentFingerprint:'fixture:'+kind,source:'hangar',phase:'decision',missionId:m.id,mission:m,
    hullId:hull.id,spec:queueSpecSnapshot(),context:launchTransactionContextSnapshot(ctx),outcome:ctx.outcome,
    decision:{id:txId+':d1:'+kind,kind,revision:1,options,selected:null,resolvedEffect:null,data},
    resolution:{command:'nominal',stage:'liftoff',liftoffOccurred:kind!=='weather',vehicleRecoveryFitted:false,crewCapsuleFitted:!!ctx.crewed,launchEscapeFitted:!!(data&&data.launchEscapeFitted),vehicleDisposition:status||'in-flight',crewDisposition:ctx.crewed?'aboard':'not-applicable',recoveryMethod:null},
    applied:{ownership:true,cash:true,stock:true,time:true,pad:kind!=='weather',liftoff:kind!=='weather'}});
  state.requestReceipts['req-'+kind]={requestId:'req-'+kind,kind:'launch',fingerprint:'fixture:'+kind,resultId:txId};
  const payload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
  applyLoadedSave(payload);
  check(kind+' reload keeps exact transaction owner',state.launchTxn&&state.launchTxn.id===txId&&_flightResolving);
  const resumed=resumeLaunchTransactionUI();
  return {resumed,ctx,tx:state.launchTxn};
}

let r=decisionPayload('weather',{weather:{id:'wind',label:'High winds',adverse:true,penalty:.06,clear:1,detail:'wind'}},['scrub','launch'],'preparing');
check('weather reload restores reachable decision',r.resumed&&_pendingLaunch&&_pendingLaunch.hullId===r.tx.hullId&&r.tx.decision.revision===1);
r=decisionPayload('live',{flag:{sub:{key:'propulsion',label:'Propulsion',rel:.9},phase:{phase:'ascent',label:'Ascent'}},launchEscapeFitted:true},['press','abort']);
check('live reload restores reachable decision',r.resumed&&_pendingLive&&_pendingLive.liveFlag.sub.key==='propulsion');
const liveLesPanel=animState&&animState.pendingDecision&&animState.pendingDecision.buildPanel();
check('LES reload preserves a survivable live-abort control',liveLesPanel&&liveLesPanel.buttons.some(b=>/Abort now.*save crew/.test(b.label)));
r=decisionPayload('live',{flag:{sub:{key:'propulsion',label:'Propulsion',rel:.9},phase:{phase:'ascent',label:'Ascent'}},launchEscapeFitted:false},['press']);
const liveNoLesPanel=animState&&animState.pendingDecision&&animState.pendingDecision.buildPanel();
check('no-LES reload exposes no false safe-abort control',r.resumed&&r.tx.decision.options.join(',')==='press'&&liveNoLesPanel&&!liveNoLesPanel.buttons.some(b=>/Abort now/.test(b.label))&&liveNoLesPanel.lines.join(' ').includes('no survivable ascent-abort'));
r=decisionPayload('reserve',{flag:{sub:{key:'deep_propulsion',label:'Deep propulsion',rel:.9},phase:{phase:'deep',label:'Deep'}}},['burn','bank']);
check('reserve reload restores reachable decision',r.resumed&&_pendingReserve&&_pendingReserve.deepFlag.sub.key==='deep_propulsion');
const orbitCtxData={budget:200,options:[]};
r=decisionPayload('orbit',orbitCtxData,['circularize','raise','lower','deorbit']);
check('orbit reload restores reachable decision',r.resumed&&_pendingOrbitOps&&_pendingOrbitOps.ctx.m.id==='first_flight');
r=decisionPayload('anomaly',{eventId:'solar_array',roll:.25},['reboot','degraded']);
check('anomaly reload restores locked draw and decision',r.resumed&&_pendingOps&&r.tx.decision.data.roll===.25);
r=decisionPayload('rescue',{cost:3,months:3,chance:.55,roll:.2,afford:true,outcome:{kind:'strand',subsystem:'life_support'},ops:null},['mount','abandon']);
check('rescue reload restores locked cost/chance/draw',r.resumed&&_pendingRescue&&r.tx.decision.data.cost===3&&r.tx.decision.data.roll===.2);

function capturePrimarySaves(action){
  const writes=[],priorSet=localStorage.setItem;
  localStorage.setItem=function(k,v){ if(k===SAVE_KEY) writes.push(JSON.parse(String(v))); return priorSet.call(localStorage,k,v); };
  _gameStarted=true; _lastAutosaveT=-1e15;
  try{ action(); }finally{ localStorage.setItem=priorSet; }
  return writes;
}

// Capture the exact writes attempted from inside advance(), not a hand-built
// approximation. The mutation barrier must suppress the partial selected
// decision and emit only the next fully resumable checkpoint.
r=decisionPayload('weather',{weather:{id:'wind',label:'High winds',adverse:true,penalty:.06,clear:1,detail:'wind'}},['scrub','launch'],'preparing');
const weatherArgs=launchDecisionArgs(r.tx.decision);
const weatherWrites=capturePrimarySaves(()=>scrubLaunch(weatherArgs.txnId,weatherArgs.revision));
check('weather advance emits no selected/unapplied autosave',weatherWrites.length>0&&weatherWrites.every(p=>{ const t=p.state.launchTxn; return !t||t.phase!=='decision'||t.decision.selected==null; }));
const weatherCheckpoint=weatherWrites[weatherWrites.length-1],weatherMoney=weatherCheckpoint.state.money;
let weatherReloaded=false;
try{ applyLoadedSave(JSON.parse(JSON.stringify(weatherCheckpoint))); weatherReloaded=resumeLaunchTransactionUI(); }catch(e){}
check('exact post-weather checkpoint reloads without repeating delay or outcome',weatherReloaded&&state.launchTxn===null&&state.money===weatherMoney&&_pendingLaunch===null);

r=decisionPayload('rescue',{cost:3,months:3,chance:.55,roll:.2,afford:true,outcome:{kind:'strand',subsystem:'life_support'},ops:null},['mount','abandon']);
const rescueArgs=launchDecisionArgs(r.tx.decision);
const rescueWrites=capturePrimarySaves(()=>mountRescue(rescueArgs.txnId,rescueArgs.revision));
check('rescue advance emits no charged-but-unsettled autosave',rescueWrites.length>0&&rescueWrites.every(p=>{ const t=p.state.launchTxn; return !t||t.phase!=='decision'||t.decision.selected==null; }));
const rescueCheckpoint=rescueWrites[rescueWrites.length-1],rescueMoney=rescueCheckpoint.state.money;
let rescueReloaded=false;
try{ applyLoadedSave(JSON.parse(JSON.stringify(rescueCheckpoint))); rescueReloaded=resumeLaunchTransactionUI(); }catch(e){}
check('exact post-rescue checkpoint reloads without a second charge or decision',rescueReloaded&&state.launchTxn===null&&state.money===rescueMoney&&_pendingRescue===null);

newGame('engineer'); animEnabled=true; _flightResolving=true;
const mission=MISSIONS.find(m=>m.id==='luna_flyby'),ctx=baseCtx(mission,null,null,false);
_pendingReserve=ctx;
openFlightForDecision(ctx,{holdAt:'cislunar-start',buildPanel:()=>({title:'Reserve call',lines:['pending'],buttons:[]})});
const owner=animState; skipAnim();
check('Skip jumps to but does not destroy a future decision',animState===owner&&animState.held&&animState.pendingDecision&&_pendingReserve===ctx&&_flightResolving);
skipAnim();
check('Skip cannot dismiss a held decision',animState===owner&&animState.held&&animState.pendingDecision);

const old=createFreshState('engineer'); old.company='OLD'; old.year=1950;
const orphan=makeHullRecord({id:'old-h',serial:'OVH-OLD',status:'in-flight'}); old.hulls=[orphan];
const compat=saveCompatibility({v:61,state:old});
check('v61 orphaned in-flight hull is rejected without fabrication',!compat.ok&&/without a resumable transaction owner/.test(compat.reason));

console.log(`${pass}/${pass+fail} checks passed`);
process.exitCode=fail?1:0;
