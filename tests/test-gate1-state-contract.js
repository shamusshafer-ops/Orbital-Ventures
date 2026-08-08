// Gate 1B — canonical fresh state, JSON-safe lifecycle records, compatibility,
// and one hard transient-reset boundary. Gate 2 alone owns live transactions.
let g1StatePass=0, g1StateFail=0;
function g1StateCheck(name,cond){ if(cond) g1StatePass++; else { g1StateFail++; console.log('FAIL:',name); } }

const g1StateA=createFreshState('engineer');
const g1StateB=createFreshState('engineer');
g1StateCheck('fresh-state factory is deterministic', JSON.stringify(g1StateA)===JSON.stringify(g1StateB));
g1StateA.stages[0].prop=999; g1StateA.departments.propulsion.training=7; g1StateA.annals.push({x:1});
g1StateCheck('fresh-state factory returns independent nested graphs',
  g1StateB.stages[0].prop===2&&g1StateB.departments.propulsion.training===0&&g1StateB.annals.length===0);
g1StateCheck('fresh campaign owns explicit canonical collections and schema',
  g1StateB.schemaId===CAMPAIGN_SCHEMA_ID&&Array.isArray(g1StateB.annals)&&Array.isArray(g1StateB.hulls)&&
  Array.isArray(g1StateB.buildQueue)&&Array.isArray(g1StateB.hangar)&&g1StateB.launchTxn===null);
g1StateCheck('fresh Pioneer snapshot is complete in the factory itself',
  g1StateB.eraStartSnapshot.money===DIFFICULTY.engineer.startMoney&&g1StateB.eraStartSnapshot.flights===0);
g1StateCheck('fresh campaign is JSON-safe', recordIsJsonSafe(g1StateB));

const g1FamilyInput={id:'fam1',name:'Test Family',born:'1 Jan 1942',spec:{stages:[{id:'s1'}]}};
const g1Family=makeFamilyRecord(g1FamilyInput);
const g1Order=makeOrderRecord({id:'ord1',missionId:'first_flight',name:'Test Order',monthsTotal:2,monthsLeft:2,status:'queued',requestId:'req1'});
const g1Hull=makeHullRecord({id:'hull_1',serial:'OVH-0001',status:'hangar',history:[{abs:0,outcome:'rollout'}]});
const g1Annal=makeCampaignAnnal({when:'1 Jan 1942',y:1942,kind:'ok',msg:'Founded.'});
const g1Txn=makeLaunchTransactionRecord({id:'txn1',requestId:'req1',missionId:'first_flight',phase:'committed',quote:{cashNow:.44}});
g1FamilyInput.spec.stages[0].id='mutated';
g1StateCheck('family factory validates and deep-snapshots',
  lifecycleRecordErrors('family',g1Family).length===0&&g1Family.spec.stages[0].id==='s1');
g1StateCheck('order factory carries status and request identity',
  lifecycleRecordErrors('order',g1Order).length===0&&g1Order.status==='queued'&&g1Order.requestId==='req1');
g1StateCheck('hull and hull-history factories validate',
  lifecycleRecordErrors('hull',g1Hull).length===0&&g1Hull.history[0].schema===LIFECYCLE_SCHEMA_VERSION);
g1StateCheck('annal factory is compact and JSON-safe',
  g1Annal.schema===LIFECYCLE_SCHEMA_VERSION&&g1Annal.msg==='Founded.'&&recordIsJsonSafe(g1Annal));
g1StateCheck('transaction factory defines schema without activating it',
  lifecycleRecordErrors('transaction',g1Txn).length===0&&g1StateB.launchTxn===null&&g1Txn.applied.outcome===false);
g1StateCheck('all lifecycle records round-trip through JSON',
  [g1Family,g1Order,g1Hull,g1Annal,g1Txn].every(recordIsJsonSafe));
const g1Circular={}; g1Circular.self=g1Circular;
g1StateCheck('JSON-safety validator rejects lossy and cyclic values without string heuristics',
  !recordIsJsonSafe({a:undefined})&&!recordIsJsonSafe({a:Infinity})&&!recordIsJsonSafe({a:NaN})&&
  !recordIsJsonSafe(g1Circular)&&recordIsJsonSafe({text:'function and undefined are legitimate words'}));
const g1NormalizedOrder=makeOrderRecord({id:'ord-bad',missionId:'first_flight',cost:Infinity,monthsLeft:NaN});
g1StateCheck('record factories normalize non-finite numeric input before persistence',
  g1NormalizedOrder.cost===0&&g1NormalizedOrder.monthsLeft===0&&recordIsJsonSafe(g1NormalizedOrder));
const g1MalformedHistoryHull=makeHullRecord({id:'hull-safe',serial:'OVH-SAFE',history:{not:'an array'}});
g1StateCheck('hull factory safely normalizes malformed history collections',
  Array.isArray(g1MalformedHistoryHull.history)&&g1MalformedHistoryHull.history.length===0);

newGame('engineer');
g1StateCheck('fresh live state passes lifecycle ownership audit', auditLifecycleState().length===0);
_pendingLaunch={old:true}; _pendingLive={old:true}; _pendingReserve={old:true}; _flightResolving=true; _procStaffSeq=77;
newGame('engineer');
g1StateCheck('new campaign clears every tested transient owner',
  _pendingLaunch===null&&_pendingLive===null&&_pendingReserve===null&&!_flightResolving&&_procStaffSeq===0);
setTab('bench'); railAccordClick('mission'); newGame('engineer');
g1StateCheck('campaign replacement cancels old tab and rail callbacks before they can touch new state',
  _tabTransitionTimer===null&&railClickTimer===null&&state.tab==='command');

const g1Legacy={v:60,state:createFreshState('engineer')};
delete g1Legacy.state.schemaId; delete g1Legacy.state.launchTxn; delete g1Legacy.state.annals;
g1Legacy.state.hangar=[makeOrderRecord({id:'legacy-ready',missionId:'first_flight',missionName:'First Flight',name:'Legacy Ready',
  spec:{stages:g1Legacy.state.stages,boosters:g1Legacy.state.boosters,transfer:g1Legacy.state.transfer,
    descent:g1Legacy.state.descent,ascent:g1Legacy.state.ascent,eclss:g1Legacy.state.eclss},status:'fulfilled',started:true})];
g1StateCheck('v60 legacy payload is explicitly accepted', saveCompatibility(g1Legacy).ok&&saveCompatibility(g1Legacy).legacy);
applyLoadedSave(g1Legacy);
g1StateCheck('v60 load receives additive Gate 1 defaults',
  state.schemaId===CAMPAIGN_SCHEMA_ID&&state.launchTxn===null&&Array.isArray(state.annals));
const g1LegacyReady=hangarList()[0], g1LegacyViewA=readyHullActionView(g1LegacyReady);
state.parts={tank:'alloy',avionics:'triple',fairing:'heavy'}; state.powerSource='rtg'; state.engineOut=true;
state.livery={body:'#111111',accent:'#222222',nose:'#333333',name:'LIVE'};
const g1LegacyViewB=readyHullActionView(g1LegacyReady);
g1StateCheck('v60 ready orders freeze missing physical fields once during best-effort load',
  !!g1LegacyReady.spec.parts&&g1LegacyReady.spec.powerSource==='solar'&&g1LegacyReady.spec.engineOut===false&&
  !!g1LegacyReady.spec.livery&&g1LegacyViewA.vehicle.totalDv===g1LegacyViewB.vehicle.totalDv&&
  g1LegacyViewA.vehicle.reliability===g1LegacyViewB.vehicle.reliability&&state.parts.avionics==='triple');

const g1BeforeState=state;
const g1Mismatch={v:SAVE_VERSION,state:createFreshState('engineer')}; g1Mismatch.state.schemaId='alien-schema';
const g1MismatchText=JSON.stringify(g1Mismatch);
let g1MismatchRejected=false; try{ applyLoadedSave(g1Mismatch); }catch(e){ g1MismatchRejected=/Unsupported campaign schema/.test(e.message); }
g1StateCheck('schema mismatch is rejected before payload or live-state mutation',
  g1MismatchRejected&&JSON.stringify(g1Mismatch)===g1MismatchText&&state===g1BeforeState);
const g1Future={v:SAVE_VERSION+1,state:createFreshState('engineer')};
const g1FutureText=JSON.stringify(g1Future); let g1FutureRejected=false;
try{ applyLoadedSave(g1Future); }catch(e){ g1FutureRejected=/newer than this build/.test(e.message); }
g1StateCheck('future save is rejected before payload or live-state mutation',
  g1FutureRejected&&JSON.stringify(g1Future)===g1FutureText&&state===g1BeforeState);

console.log(`${g1StatePass}/${g1StatePass+g1StateFail} checks passed`);
process.exitCode=g1StateFail?1:0;
