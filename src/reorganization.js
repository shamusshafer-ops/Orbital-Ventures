/* ============================================================================
   GATE 3 — STANDARD-CAMPAIGN ECONOMIC CONTINUITY

   Program Reorganization is a durable owner, not a cash grant. It advances a
   narrow administrative calendar, funds one exact First Flight article from a
   restricted escrow, and hands that article to the ordinary Gate 2 launch
   transaction. Ordinary campaign operations never run on sponsor money.
   ============================================================================ */

let _reorganizationClockDepth=0;
let _reorganizationModalLocked=false;
let _administrativeArrivalHold=null;
let _reorganizationResultFollowup=null;

function campaignIsIronman(snapshot){
  const s=snapshot||state;
  return !!(s&&s.campaignRules&&s.campaignRules.ironman===true);
}
function activeReorganization(snapshot){
  const s=snapshot||state, r=s&&s.reorganization;
  return r&&ACTIVE_REORGANIZATION_PHASES.includes(r.phase)?r:null;
}
function ordinaryActionsSuspended(snapshot){ return !!activeReorganization(snapshot); }
function continuityStateOwnsSave(snapshot){
  const s=snapshot||state;
  return !!(activeReorganization(s)||(s&&s.insolvency&&['open','reorganization'].includes(s.insolvency.status)));
}
function reorganizationClockRunning(){ return _reorganizationClockDepth>0; }
function guardOrdinaryAction(label){
  if(!ordinaryActionsSuspended()||reorganizationClockRunning()) return true;
  const why=`${label||'That action'} is unavailable while the program is under sponsor administration.`;
  try{ announceAction(why); }catch(e){}
  return false;
}
function sponsoredLaunchTransaction(tx){
  tx=tx||state&&state.launchTxn;
  const funding=tx&&tx.context&&tx.context.funding;
  return !!(funding&&funding.source==='restricted-program-funds'&&funding.reorganizationId);
}
function administrativeArrivalTransaction(tx){
  tx=tx||state&&state.launchTxn;
  return !!(tx&&tx.context&&tx.context.administration&&tx.context.administration.reorganizationId);
}
function canonicalRecoverySpec(){
  const fresh=createFreshState('engineer');
  return plainRecord({stages:fresh.stages,transfer:fresh.transfer,descent:fresh.descent,ascent:fresh.ascent,
    eclss:fresh.eclss,boosters:fresh.boosters,recovery:false,activeVehicle:null,parts:fresh.parts,
    powerSource:fresh.powerSource,engineOut:false,livery:fresh.livery,testLevel:0,rehearsal:false});
}
function recoverySpecFingerprint(spec){ return requestIntentFingerprint('reorganization-spec',spec||canonicalRecoverySpec()); }
function calculateSponsorEscrow(quote,monthlyBurn){
  quote=quote||{}; monthlyBurn=Math.max(0,finiteRecordNumber(monthlyBurn));
  const weather=round2(monthlyBurn*30/DAYS_PER_MONTH);
  const authorized=round2(Math.max(0,finiteRecordNumber(quote.endToEndRunway))+weather);
  return {authorized,weatherContingency:weather};
}
function calculateOperatingSupportSnapshot(){
  const recurring=liveRecurringEconomy(), monthlyCap=round2(Math.max(0,-recurring.net));
  return {monthlyCap,eligibleSnapshot:{schema:1,atAbs:absDay(),revenue:recurring.revenue,expenses:recurring.expenses,net:recurring.net,
    fingerprint:requestIntentFingerprint('eligible-recurring-operations',{revenue:recurring.revenue,expenses:recurring.expenses,net:recurring.net})}};
}
function reorganizationEligible(snapshot){
  const s=snapshot||state;
  if(!s||campaignIsIronman(s)||activeLaunchTransaction(s)||activeReorganization(s)) return false;
  return !!(s.insolvency&&s.insolvency.status==='open'&&!s.insolvency.resolvedBy);
}
function setCampaignAbsDay(value){
  const day=Math.max(0,Math.floor(finiteRecordNumber(value))), monthAbs=Math.floor(day/DAYS_PER_MONTH);
  state.year=1942+Math.floor(monthAbs/12); state.month=((monthAbs%12)+12)%12; state.day=day%DAYS_PER_MONTH;
  return day;
}
function checkpointReorganizationSave(){
  try{ if(typeof autosave==='function') autosave(true); else if(typeof writeSave==='function'&&_gameStarted) writeSave(); }catch(e){}
}
function closeOperatingSupport(reason){
  const support=state.operatingSupport;
  if(!support||support.closedReason) return support||null;
  support.closedReason=OPERATING_SUPPORT_CLOSE_REASONS.includes(reason)?reason:'campaign-ended';
  support.monthsLeft=0; support.remaining=0;
  support.receipts=support.receipts||{};
  support.receipts.closed={atAbs:absDay(),reason:support.closedReason};
  support.ledgerFingerprint=operatingSupportLedgerFingerprint(support);
  checkpointReorganizationSave();
  return support;
}
function applyOperatingSupportDay(){
  const support=state&&state.operatingSupport;
  if(!support||support.closedReason) return 0;
  const elapsed=absDay()-support.startAbs;
  if(elapsed<=0) return 0;
  if(absDay()>support.endAbs||support.monthsLeft<=0||support.remaining<=0){ closeOperatingSupport(support.remaining<=0?'exhausted':'expired'); return 0; }
  const realizedMonthlyBurn=operatingMonthlyBurn();
  const eligibleBurn=reorganizationAccrual(realizedMonthlyBurn/DAYS_PER_MONTH);
  const dailyCap=reorganizationAccrual(support.monthlyCap/DAYS_PER_MONTH);
  const paid=reorganizationAccrual(Math.min(dailyCap,eligibleBurn,support.remaining));
  if(paid>0){
    state.money+=paid; support.remaining=reorganizationAccrual(support.remaining-paid); support.paid=reorganizationAccrual(support.paid+paid);
  }
  support.monthsLeft=Math.max(0,REORGANIZATION_RULES.exitSupportMonths-Math.floor(elapsed/DAYS_PER_MONTH));
  support.receipts=support.receipts||{};
  const period=Math.min(REORGANIZATION_RULES.exitSupportMonths,Math.max(1,Math.ceil(elapsed/DAYS_PER_MONTH)));
  const key=`period:${period}`, receipt=support.receipts[key]||{fromAbs:absDay(),throughAbs:absDay(),days:0,eligibleBurn:0,paid:0};
  receipt.throughAbs=absDay(); receipt.days++;
  receipt.eligibleBurn=reorganizationAccrual(receipt.eligibleBurn+eligibleBurn);
  receipt.paid=reorganizationAccrual(receipt.paid+paid); support.receipts[key]=receipt;
  if(absDay()>=support.endAbs) closeOperatingSupport('expired');
  else if(support.remaining<=0) closeOperatingSupport('exhausted');
  else support.ledgerFingerprint=operatingSupportLedgerFingerprint(support);
  return paid;
}

function createInsolvencyRecord(sourceTransactionId,cash){
  if(state.insolvency&&state.insolvency.status==='open') return state.insolvency;
  const sequence=state.insolvencySeq=(state.insolvencySeq||0)+1;
  state.insolvency=makeInsolvencyRecord({id:`ins${sequence}`,sequence,revision:0,status:'open',atAbs:absDay(),
    cash:cash==null?state.money:cash,sourceTransactionId:sourceTransactionId||null,receipts:{created:{atAbs:absDay()}}});
  return state.insolvency;
}
function archiveResolvedInsolvency(record,resolvedBy){
  if(!record) return null;
  record.status='resolved'; record.resolvedBy=resolvedBy; record.resolvedAbs=absDay(); record.revision=(record.revision||0)+1;
  record.receipts=record.receipts||{}; record.receipts.resolved={atAbs:absDay(),by:resolvedBy};
  state.lastInsolvency=makeInsolvencyRecord(record);
  if(state.insolvency&&state.insolvency.id===record.id) state.insolvency=null;
  return state.lastInsolvency;
}
function reorganizationAcceptFingerprint(insolvencyId){
  return requestIntentFingerprint('reorganization',{insolvencyId,rules:REORGANIZATION_RULES});
}
function acceptReorganization(insolvencyId,requestId){
  const insolvency=state.insolvency, fingerprint=reorganizationAcceptFingerprint(insolvencyId);
  const replay=inspectRequestReceipt(requestId,'reorganization',fingerprint);
  if(!replay.ok) return false;
  if(replay.replay){ resumeReorganizationUI(); return true; }
  if(!reorganizationEligible()||!insolvency||insolvency.id!==String(insolvencyId||'')){
    announceAction('That Program Reorganization offer is no longer current.'); return false;
  }
  if(state.operatingSupport&&!state.operatingSupport.closedReason) closeOperatingSupport('new-reorganization');
  const sequence=state.reorganizationSeq=(state.reorganizationSeq||0)+1;
  // Gate 3 tuning (design re-audit D2/D3): penalties now scale with the deficit
  // being forgiven and escalate with each reorganization cycle, so a large or
  // repeated shed costs materially more than a tiny one-off. The forgiven
  // deficit is player Capital at this instant, just before it reopens at $0.
  const deficitForgiven=round2(Math.max(0,-finiteRecordNumber(state.money)));
  const id=`reorg${sequence}`, penalties=calculateReorganizationPenaltyTerms(state.rep,deficitForgiven,sequence),
    debt=calculateReorganizationDebtTerms(loanInterest(),!!state.debtRenegotiated), spec=canonicalRecoverySpec();
  const retryOf=state.lastReorganization&&state.lastReorganization.phase==='failed'?state.lastReorganization.id:null;
  const acceptedAbs=absDay();
  const priorClose=state.lastReorganization?nullableRecordNumber(state.lastReorganization.closedAbs):null;
  const daysSinceLast=priorClose!=null?Math.max(0,acceptedAbs-priorClose):null;
  const r=makeReorganizationRecord({id,sequence,insolvencyId:insolvency.id,retryOf,phase:'standdown',acceptedAbs,
    standdownEndsAbs:acceptedAbs+REORGANIZATION_RULES.standdownDays,clockAbs:acceptedAbs,rivalMonthsApplied:0,
    penalties:Object.assign({},penalties,{applied:true}),debt:Object.assign({},debt,{applied:true}),
    mission:{missionId:REORGANIZATION_RULES.recoveryMissionId,crew:0,spec,specFingerprint:recoverySpecFingerprint(spec)},
    escrow:{authorized:0,spent:0,returned:0,receipts:{}},
    receipts:{accepted:{atAbs:acceptedAbs,requestId,cycleIndex:sequence,deficitForgiven,daysSinceLastReorganization:daysSinceLast}},outcome:null});
  const supportBefore=publicSupport(), legacyBefore=Math.max(0,state.legacyPenalty||0);
  state.rep=Math.max(0,state.rep-penalties.repLoss); addSupport(-penalties.supportLoss);
  state.legacyPenalty=(state.legacyPenalty||0)+penalties.legacyLoss;
  state.loanInterest=debt.interestAfter; state.debtRenegotiated=true;
  r.receipts.penalties={atAbs:acceptedAbs,repBefore:penalties.repBefore,repLoss:penalties.repLoss,repAfter:state.rep,
    supportBefore,supportLoss:penalties.supportLoss,supportAfter:publicSupport(),legacyBefore,legacyLoss:penalties.legacyLoss,legacyAfter:state.legacyPenalty};
  r.receipts.debt={atAbs:acceptedAbs,interestBefore:debt.interestBefore,interestAfter:debt.interestAfter,
    alreadyRenegotiatedBefore:debt.alreadyRenegotiatedBefore,renegotiatedNow:debt.renegotiatedNow};
  state.money=0; state.reorganizationAttempts=sequence; state.reorganization=r;
  insolvency.status='reorganization'; insolvency.reorganizationId=id; insolvency.revision=(insolvency.revision||0)+1;
  insolvency.receipts=insolvency.receipts||{}; insolvency.receipts.acceptedReorganization={atAbs:acceptedAbs,reorganizationId:id};
  recordRequestReceipt(requestId,'reorganization',fingerprint,id,REORGANIZATION_RULES.recoveryMissionId,insolvency.id);
  state.over=true;
  log('bad',`Program Reorganization accepted${sequence>1?` (cycle ${sequence})`:''} — ${fM(deficitForgiven)} deficit transferred to the restructuring estate, 360-day protective stand-down, −${penalties.repLoss} rep, −${penalties.supportLoss} support, −${penalties.legacyLoss} legacy.${debt.renegotiatedNow?` Permanent bridge-loan service reduced from ${fM(debt.interestBefore)}/mo to ${fM(debt.interestAfter)}/mo.`:' The one-time creditor workout was already used.'}`);
  checkpointReorganizationSave(); resumeReorganizationUI(); return true;
}

function sponsoredOrderFor(r){
  if(!r||!r.mission||!r.mission.orderId) return null;
  return [...buildQueueList(),...hangarList()].find(o=>o&&o.id===r.mission.orderId)||null;
}
function progressSponsoredOrderDay(r){
  if(!r||r.phase!=='building') return;
  const q=buildQueueList(), order=q.find(o=>o&&o.id===r.mission.orderId);
  if(!order) return;
  order.started=true; order.status='building'; order.monthsLeft=Math.max(0,order.monthsLeft-perDay(1));
  if(order.monthsLeft>1e-9) return;
  const ready=makeOrderRecord(Object.assign({},order,{status:'fulfilled',started:true,monthsLeft:0,builtAbs:absDay()}));
  const hull=assignHullToHangar(ready); hangarList().push(ready);
  state.buildQueue=q.filter(o=>o.id!==order.id);
  r.mission.hullId=hull.id; r.phase='ready'; r.revision=(r.revision||0)+1;
  r.receipts.rollout={atAbs:absDay(),orderId:ready.id,hullId:hull.id};
  log('ok',`Sponsor-directed return to flight — ${ready.name} rolled out as hull ${hull.id}.`);
}
function dueAdministrativeArrival(){
  return (state.activeFlights||[]).filter(f=>f&&f.deferred&&finiteRecordNumber(f.arriveAbs)<=absDay())
    .sort((a,b)=>finiteRecordNumber(a.arriveAbs)-finiteRecordNumber(b.arriveAbs))[0]||null;
}
function administrativeArrivalForegroundHeld(){
  return !!(activeLaunchTransaction()||_flightResolving||administrativePostFlightDecisionPending());
}
function advanceReorganizationClock(targetAbs,options){
  const r=activeReorganization(); if(!r) return {ok:false,reason:'no-active-reorganization'};
  options=options||{};
  targetAbs=Math.max(absDay(),Math.floor(finiteRecordNumber(targetAbs)));
  _reorganizationClockDepth++;
  try{
    if(dueAdministrativeArrival()){
      pumpFlightArrivals();
      if(administrativeArrivalForegroundHeld()) return {ok:true,paused:true,reason:'arrival',atAbs:absDay()};
      _reorganizationModalLocked=false; hideModal();
    }
    while(absDay()<targetAbs){
      // A flight that is already due owns this exact instant. Never move the
      // campaign one day past its persisted arrival merely because the player
      // entered or resumed administration on that date.
      if(dueAdministrativeArrival()){
        pumpFlightArrivals();
        if(administrativeArrivalForegroundHeld()) return {ok:true,paused:true,reason:'arrival',atAbs:absDay()};
        _reorganizationModalLocked=false; hideModal();
      }
      const beforeMonth=absMonth(); setCampaignAbsDay(absDay()+1); r.clockAbs=absDay();
      progressSponsoredOrderDay(r);
      if(absMonth()!==beforeMonth){
        tickRivals({administration:true});
        if(r.phase==='standdown'&&r.rivalMonthsApplied<REORGANIZATION_RULES.rivalMonths) r.rivalMonthsApplied++;
        r.receipts.monthTicks=r.receipts.monthTicks||{}; r.receipts.monthTicks[String(absMonth())]={atAbs:absDay()};
        checkpointReorganizationSave();
      }
      if(dueAdministrativeArrival()){
        pumpFlightArrivals();
        if(administrativeArrivalForegroundHeld()) return {ok:true,paused:true,reason:'arrival',atAbs:absDay()};
        _reorganizationModalLocked=false; hideModal();
      }
      if(r.phase==='ready'&&!options.allowReady) break;
    }
    checkpointReorganizationSave();
    return {ok:true,paused:false,atAbs:absDay()};
  }finally{ _reorganizationClockDepth=Math.max(0,_reorganizationClockDepth-1); }
}
function nextDeferredArrivalThrough(targetAbs){
  return (state.activeFlights||[]).filter(f=>f&&f.deferred&&finiteRecordNumber(f.arriveAbs)<=targetAbs)
    .sort((a,b)=>finiteRecordNumber(a.arriveAbs)-finiteRecordNumber(b.arriveAbs))[0]||null;
}
function clearSponsoredLaunchCalendar(clearSpanDays){
  let due=nextDeferredArrivalThrough(absDay()+clearSpanDays);
  while(due){
    const result=advanceReorganizationClock(Math.max(absDay(),finiteRecordNumber(due.arriveAbs)),{allowReady:true});
    if(result.paused) return result;
    due=nextDeferredArrivalThrough(absDay()+clearSpanDays);
  }
  return {ok:true,paused:false,atAbs:absDay()};
}
function advanceReorganization(requestId){
  const prior=requestReceipt(requestId);
  if(prior&&prior.kind==='reorganization-standdown'){
    const current=activeReorganization();
    if(!current||current.id!==prior.resultId||current.phase!=='standdown') return true;
  }
  const r=activeReorganization(); if(!r||r.phase!=='standdown') return false;
  const fingerprint=requestIntentFingerprint('reorganization-standdown',{reorganizationId:r.id,targetAbs:r.standdownEndsAbs});
  const replay=inspectRequestReceipt(requestId,'reorganization-standdown',fingerprint); if(!replay.ok) return false;
  if(!replay.replay) recordRequestReceipt(requestId,'reorganization-standdown',fingerprint,r.id,r.mission.missionId,r.id);
  _reorganizationModalLocked=false; hideModal();
  const result=advanceReorganizationClock(r.standdownEndsAbs);
  if(result.paused) return true;
  if(absDay()>=r.standdownEndsAbs){
    r.phase='planning'; r.clockAbs=absDay(); r.rivalMonthsApplied=REORGANIZATION_RULES.rivalMonths; r.revision=(r.revision||0)+1;
    r.receipts.standdownComplete={atAbs:absDay()};
    state.committedWindow=null; state.windows={};
    checkpointReorganizationSave();
  }
  resumeReorganizationUI(); return true;
}
function recoveryPlanFor(r){
  const rec={missionId:REORGANIZATION_RULES.recoveryMissionId,spec:r.mission.spec};
  return withOrderSpec(rec,()=>{
    const m=curMission(), v=computeVehicle(), sim=null;
    const physical=v&&m&&v.totalDv>=effectiveReqDv(m)&&v.twr>1&&v.liftoff<=padMassCap();
    const quote=launchCommitmentQuote(m,v,sim,false);
    return {ok:!!physical,mission:m,vehicle:v,quote,why:physical?'':'The canonical sponsor article no longer satisfies First Flight physics.'};
  });
}
function debitSponsorEscrow(purpose,amount){
  const r=activeReorganization(); if(!r) return false;
  amount=round2(Math.max(0,finiteRecordNumber(amount))); const e=r.escrow;
  const available=round2(e.authorized-e.spent-e.returned);
  if(amount>available+0.0001){
    announceAction(`Restricted program authorization is ${fM(round2(amount-available))} short for ${purpose}.`);
    return false;
  }
  e.spent=round2(e.spent+amount); e.receipts.debits=e.receipts.debits||[];
  e.receipts.debits.push({atAbs:absDay(),purpose,amount});
  return true;
}
function commitSponsoredBuild(reorganizationId,requestId){
  const prior=requestReceipt(requestId), r=activeReorganization();
  if(prior){
    if(prior.kind!=='sponsor-build'||!r||r.id!==String(reorganizationId||'')||prior.subjectId!==r.id){
      announceAction(`Request ${requestId} no longer identifies this sponsored build.`); return false;
    }
    if(r.phase==='building'){
      _reorganizationModalLocked=false; hideModal();
      const order=sponsoredOrderFor(r), days=order?Math.max(0,Math.ceil(order.monthsLeft*DAYS_PER_MONTH)):0;
      const result=advanceReorganizationClock(absDay()+days); if(!result.paused) resumeReorganizationUI();
    } else resumeReorganizationUI();
    return true;
  }
  if(!r||r.id!==String(reorganizationId||'')||r.phase!=='planning') return false;
  const plan=recoveryPlanFor(r); if(!plan.ok){ announceAction(plan.why); return false; }
  const fingerprint=requestIntentFingerprint('sponsor-build',{reorganizationId:r.id,missionId:r.mission.missionId,specFingerprint:r.mission.specFingerprint,quote:plan.quote});
  const replay=inspectRequestReceipt(requestId,'sponsor-build',fingerprint); if(!replay.ok) return false;
  if(replay.replay){ resumeReorganizationUI(); return true; }
  const monthlyBurnBasis=operatingMonthlyBurn(), escrowPlan=calculateSponsorEscrow(plan.quote,monthlyBurnBasis);
  r.escrow.authorized=escrowPlan.authorized; r.escrow.quote=plainRecord(plan.quote); r.escrow.quoteFingerprint=requestIntentFingerprint('sponsor-quote',plan.quote);
  r.escrow.receipts.authorization={atAbs:absDay(),endToEndRunway:plan.quote.endToEndRunway,
    monthlyBurnBasis,weatherContingency:escrowPlan.weatherContingency,authorized:escrowPlan.authorized,
    fingerprint:requestIntentFingerprint('sponsor-authorization',{quoteFingerprint:r.escrow.quoteFingerprint,monthlyBurnBasis,
      weatherContingency:escrowPlan.weatherContingency,authorized:escrowPlan.authorized})};
  const orderId='ord'+(state.orderSeq=(state.orderSeq||0)+1), months=plan.quote.buildDays/DAYS_PER_MONTH;
  const order=makeOrderRecord({id:orderId,familyId:null,name:'Sponsor Article — First Flight',missionId:r.mission.missionId,missionName:plan.mission.name,
    spec:r.mission.spec,units:vehicleUnits(plan.mission),monthsTotal:months,monthsLeft:months,cost:plan.quote.buildCost,status:'building',started:true,committed:true,requestId});
  buildQueueList().push(order); r.mission.buildRequestId=requestId; r.mission.orderId=order.id; r.phase='building'; r.revision=(r.revision||0)+1;
  debitSponsorEscrow('article-build',plan.quote.buildCost); debitSponsorEscrow('build-operating-carry',plan.quote.buildCarry);
  r.receipts.plan={atAbs:absDay(),quoteFingerprint:r.escrow.quoteFingerprint,authorized:r.escrow.authorized};
  r.receipts.build={atAbs:absDay(),requestId,orderId:order.id};
  recordRequestReceipt(requestId,'sponsor-build',fingerprint,order.id,r.mission.missionId,r.id);
  log('note',`Restricted program funds committed to ${order.name} — ${fM(plan.quote.buildCost)} hardware, exact order ${order.id}.`);
  checkpointReorganizationSave();
  _reorganizationModalLocked=false; hideModal();
  const result=advanceReorganizationClock(absDay()+Math.max(0,plan.quote.buildDays));
  if(!result.paused) resumeReorganizationUI();
  return true;
}
function launchSponsoredHull(reorganizationId,orderId,hullId,requestId){
  const prior=requestReceipt(requestId);
  if(prior&&prior.kind==='launch'&&prior.missionId===REORGANIZATION_RULES.recoveryMissionId&&prior.subjectId===String(hullId||'')) return true;
  const r=activeReorganization();
  if(!r||r.id!==String(reorganizationId||'')||r.phase!=='ready'||r.mission.orderId!==String(orderId||'')||r.mission.hullId!==String(hullId||'')) return false;
  const order=hangarList().find(o=>o&&o.id===orderId&&o.hullId===hullId); if(!order) return false;
  state.activeMission=r.mission.missionId; loadOrderSpec(order.spec);
  let m=curMission(),v=computeVehicle(),quote=launchCommitmentQuote(m,v,null,true);
  if(v.totalDv<effectiveReqDv(m)||v.twr<=1||v.liftoff>padMassCap()){ announceAction('The sponsor article no longer passes First Flight physics validation.'); return false; }
  // Gate 2 can expose only one foreground transaction. Settle every persisted
  // arrival that would otherwise become due during this article's nominal
  // preparation or one possible weather recycle before acquiring launch
  // ownership. Their dates and outcomes remain unchanged; the sponsored
  // transaction begins only after they release the foreground.
  const maxWeatherDays=daysFor(WEATHER_CONDITIONS.reduce((n,w)=>Math.max(n,finiteRecordNumber(w.clear)),0));
  const clearSpanDays=quote.preparationDays+quote.launchDays+maxWeatherDays;
  if(nextDeferredArrivalThrough(absDay()+clearSpanDays)){
    _reorganizationModalLocked=false; hideModal();
    const cleared=clearSponsoredLaunchCalendar(clearSpanDays);
    if(cleared.paused) return true;
    state.activeMission=r.mission.missionId; loadOrderSpec(order.spec);
    m=curMission(); v=computeVehicle(); quote=launchCommitmentQuote(m,v,null,true);
    if(v.totalDv<effectiveReqDv(m)||v.twr<=1||v.liftoff>padMassCap()){ announceAction('The sponsor article no longer passes First Flight physics validation.'); return false; }
  }
  const funding={source:'restricted-program-funds',reorganizationId:r.id,escrowQuoteFingerprint:r.escrow.quoteFingerprint,capitalBefore:round2(state.money)};
  const available=round2(r.escrow.authorized-r.escrow.spent-r.escrow.returned);
  const required=round2(quote.flightBurn+quote.launchCarry+projectedLaunchMonthlyBurn(true));
  if(available+0.0001<required){ announceAction(`The frozen sponsor authorization is ${fM(round2(required-available))} short; this article cannot acquire launch ownership.`); return false; }
  const begun=beginLaunchTransaction({requestId,source:'hangar',missionId:m.id,orderId:order.id,hullId:order.hullId,
    quote,spec:order.spec,context:{funding},timing:{startedAbs:absDay()}});
  if(!begun.ok) return false; if(begun.replay) return true;
  state.hangar=hangarList().filter(o=>o.id!==order.id); markHullPreparing(order.hullId);
  begun.txn.applied.ownership=true; begun.txn.nextAction='continue-preparation';
  r.mission.launchRequestId=requestId; r.mission.launchTransactionId=begun.txn.id; r.phase='launching'; r.revision=(r.revision||0)+1;
  r.receipts.launch={atAbs:absDay(),requestId,transactionId:begun.txn.id,orderId,hullId};
  checkpointReorganizationSave(); _reorganizationModalLocked=false; hideModal(); render();
  return !!launch(true,hullId,requestId,quote);
}
function sponsorLaunchCashDebit(tx,quote){
  if(!sponsoredLaunchTransaction(tx)) return false;
  const direct=round2((quote&&quote.buildCost||0)+(quote&&quote.flightBurn||0));
  const carry=round2(quote&&quote.launchCarry||0);
  if(!debitSponsorEscrow('flight-and-test',direct)||!debitSponsorEscrow('launch-operating-carry',carry)) return false;
  tx.receipts.sponsorFunding={atAbs:absDay(),direct,carry}; tx.applied.cash=true; return true;
}
function sponsorWeatherDebit(tx,days){
  if(!sponsoredLaunchTransaction(tx)) return 0;
  const amount=round2(projectedLaunchMonthlyBurn(true)*Math.max(0,finiteRecordNumber(days))/DAYS_PER_MONTH);
  return debitSponsorEscrow('weather-operating-carry',amount)?amount:false;
}
function advanceTransactionDays(days){
  days=Math.max(0,Math.round(finiteRecordNumber(days)));
  if(sponsoredLaunchTransaction()) return advanceReorganizationClock(absDay()+days);
  return advanceDays(days);
}
function markArrivalUnderAdministration(tx){
  const r=activeReorganization(); if(!r||!tx) return tx;
  tx.context=plainRecord(tx.context||{}); tx.context.administration={reorganizationId:r.id,cashBefore:state.money};
  return tx;
}
function pendingAdministrativeDecisionSnapshot(){
  if(_pendingInquiry) return {kind:'inquiry',data:plainRecord(_pendingInquiry)};
  if(_pendingHearing) return {kind:'hearing',data:plainRecord(_pendingHearing)};
  if(_pendingSampleDecision) return {kind:'sample',data:plainRecord(_pendingSampleDecision)};
  return null;
}
function settleAdministrativeArrival(tx){
  if(!administrativeArrivalTransaction(tx)) return false;
  const r=activeReorganization(), admin=tx.context.administration;
  if(!r||r.id!==admin.reorganizationId) return false;
  const captured=round2(state.money-finiteRecordNumber(admin.cashBefore)); state.money=finiteRecordNumber(admin.cashBefore);
  r.receipts.administrativeArrivals=r.receipts.administrativeArrivals||{};
  r.receipts.administrativeArrivals[tx.id]={atAbs:absDay(),outcome:tx.outcome&&tx.outcome.kind||null,capturedCash:captured};
  log('note',`${tx.context&&tx.context.m&&tx.context.m.name||'Deferred mission'} settled during sponsor administration. ${captured>=0?fM(captured)+' in proceeds':'A '+fM(Math.abs(captured))+' cash consequence'} was assigned to the restructuring estate and did not enter player Capital.`);
  const pending=pendingAdministrativeDecisionSnapshot();
  r.administrativeForeground=pending?{transactionId:tx.id,kind:pending.kind,cashBaseline:state.money,startedAbs:absDay(),data:pending.data}:null;
  _administrativeArrivalHold={reorganizationId:r.id,transactionId:tx.id,cashBaseline:state.money};
  // finishLaunchTransaction clears the foreground flight owner and then writes
  // the checkpoint. Saving here would serialize two simultaneous owners.
  return true;
}
function administrativePostFlightDecisionPending(){
  return !!(_pendingInquiry||_pendingHearing||_pendingSampleDecision);
}
function completeAdministrativeArrivalForeground(){
  const hold=_administrativeArrivalHold,r=activeReorganization();
  if(!hold||!r||r.id!==hold.reorganizationId||administrativePostFlightDecisionPending()) return false;
  const receipt=r.receipts&&r.receipts.administrativeArrivals&&r.receipts.administrativeArrivals[hold.transactionId];
  const postDecisionCaptured=round2(state.money-finiteRecordNumber(hold.cashBaseline));
  state.money=finiteRecordNumber(hold.cashBaseline);
  if(receipt){
    receipt.postDecisionCapturedCash=postDecisionCaptured;
    receipt.capturedCash=round2(finiteRecordNumber(receipt.capturedCash)+postDecisionCaptured);
    receipt.foregroundReleasedAbs=absDay();
  }
  r.administrativeForeground=null;
  _administrativeArrivalHold=null;
  checkpointReorganizationSave(); resumeReorganizationUI(); return true;
}
function restoreAdministrativeArrivalForeground(r){
  const foreground=r&&r.administrativeForeground;
  if(!foreground) return false;
  _administrativeArrivalHold={reorganizationId:r.id,transactionId:foreground.transactionId,cashBaseline:foreground.cashBaseline};
  if(foreground.kind==='inquiry'){ _pendingInquiry=plainRecord(foreground.data); showInquiryModal(); }
  else if(foreground.kind==='hearing'){ _pendingHearing=plainRecord(foreground.data); showHearingModal(); }
  else if(foreground.kind==='sample'){ _pendingSampleDecision=plainRecord(foreground.data); showSampleDecisionModal(); }
  return true;
}
function beginOperatingSupport(reorganizationId){
  const plan=calculateOperatingSupportSnapshot(), startAbs=absDay();
  const authority=round2(plan.monthlyCap*REORGANIZATION_RULES.exitSupportMonths), exhausted=authority<=0;
  state.operatingSupport=makeOperatingSupportRecord({id:`ops:${reorganizationId}`,reorganizationId,startAbs,
    endAbs:startAbs+REORGANIZATION_RULES.exitSupportDays,monthsLeft:exhausted?0:REORGANIZATION_RULES.exitSupportMonths,
    monthlyCap:plan.monthlyCap,authorized:authority,remaining:authority,paid:0,eligibleSnapshot:plan.eligibleSnapshot,
    receipts:Object.assign({opened:{atAbs:startAbs}},exhausted?{closed:{atAbs:startAbs,reason:'exhausted'}}:{}),
    closedReason:exhausted?'exhausted':null});
  state.operatingSupport.ledgerFingerprint=operatingSupportLedgerFingerprint(state.operatingSupport);
  return state.operatingSupport;
}
function settleSponsoredAttempt(tx,outcome){
  if(!sponsoredLaunchTransaction(tx)) return false;
  const r=activeReorganization(), funding=tx.context.funding;
  if(!r||r.id!==funding.reorganizationId||r.mission.launchTransactionId!==tx.id) return false;
  if(r.receipts.settlement) return true;
  const kind=outcome&&outcome.kind||'loss', success=kind==='success';
  r.phase=success?'succeeded':'failed'; r.closedAbs=absDay(); r.outcome=plainRecord(outcome||{kind}); r.revision=(r.revision||0)+1;
  r.escrow.returned=round2(Math.max(0,r.escrow.authorized-r.escrow.spent));
  r.receipts.settlement={atAbs:absDay(),transactionId:tx.id,outcome:kind,success,capitalAtSettlement:state.money};
  if(success){
    // The sponsored article is 100% escrow-funded, so its ordinary Gate 2
    // success payout has just landed in player Capital via finalizeLaunch.
    // Return-to-flight buys continuity, never a cash award: capture that
    // revenue to the restructuring estate and reopen Capital at the exact
    // pre-flight baseline, mirroring settleAdministrativeArrival. Done before
    // the record is snapshotted so lastReorganization carries the receipt.
    const capitalBefore=finiteRecordNumber(funding.capitalBefore);
    r.receipts.settlement.capturedRevenue=round2(state.money-capitalBefore); state.money=round2(capitalBefore);
    r.receipts.settlement.capitalAtSettlement=state.money;
  }
  const insolvency=state.insolvency;
  state.lastReorganization=makeReorganizationRecord(r); state.reorganization=null;
  if(success){
    const capturedRevenue=r.receipts.settlement.capturedRevenue;
    state.reorganizationSuccesses=(state.reorganizationSuccesses||0)+1;
    archiveResolvedInsolvency(insolvency,'reorganization-success');
    const support=beginOperatingSupport(r.id); state.over=false;
    log('ok',`Program Reorganization complete — First Flight succeeded. ${capturedRevenue>0?`${fM(capturedRevenue)} in sponsored flight proceeds was assigned to the restructuring estate and did not enter player Capital. `:''}Ordinary operations resume with ${fM(support.remaining)} of restricted three-month operating support; it is not Capital.`);
  }else{
    state.money=0; archiveResolvedInsolvency(insolvency,'closure');
    createInsolvencyRecord(tx.id,0); state.over=true;
    log('bad',`Sponsor-directed return-to-flight attempt unsuccessful — escrow ${r.id} is closed. A new reorganization requires a fresh 360-day stand-down and new penalties.`);
  }
  checkpointReorganizationSave(); return true;
}

function operatingSupportView(snapshot){
  const support=(snapshot||state).operatingSupport;
  if(!support||support.closedReason) return null;
  return {remaining:support.remaining,authorized:support.authorized,paid:support.paid,monthlyCap:support.monthlyCap,
    daysLeft:Math.max(0,support.endAbs-absDay()),endAbs:support.endAbs};
}
function operatingSupportPanelHTML(){
  const v=operatingSupportView(); if(!v) return '';
  return `<div class="card" style="margin:10px 0;text-align:left">
    <b>Restricted operating support</b>
    <div class="metrics" style="margin:8px 0">
      <div class="metric"><div class="k">Available / authorized</div><div class="v">${fM(v.remaining)} / ${fM(v.authorized)}</div></div>
      <div class="metric"><div class="k">Recurring-cost cap</div><div class="v">${fM(v.monthlyCap)}/mo</div></div>
      <div class="metric"><div class="k">Expires</div><div class="v">${v.daysLeft} days</div></div>
    </div>
    <p class="muted" style="font-size:11px;margin:0">This is not spendable Capital. Each day it offsets eligible recurring operating burn up to the frozen cap. Purchases never qualify; unused authority expires ${dateOfAbs(v.endAbs)}.</p>
  </div>`;
}
function closeReorganizationResult(){
  _reorganizationModalLocked=false; hideModal(); const followup=_reorganizationResultFollowup; _reorganizationResultFollowup=null;
  if(typeof followup==='function') followup();
}
function showReorganizationSuccessModal(pendingCelebration){
  const last=state.lastReorganization, support=state.operatingSupport;
  if(!last||last.phase!=='succeeded'||!support) return false;
  _reorganizationResultFollowup=pendingCelebration||null;
  const outcome=last.outcome&&last.outcome.kind||'success';
  showModal(`<h2 style="color:var(--ok)">Return to flight confirmed</h2>
    <p>The sponsored First Flight settled as <b>${esc(outcome)}</b>. Program administration has ended and ordinary operations are available again.</p>
    <div class="metrics" style="margin:10px 0">
      <div class="metric"><div class="k">Article</div><div class="v">${esc(last.mission.hullId)}</div></div>
      <div class="metric"><div class="k">Escrow spent</div><div class="v">${fM(last.escrow.spent)}</div></div>
      <div class="metric"><div class="k">Unused authority closed</div><div class="v">${fM(last.escrow.returned)}</div></div>
    </div>${operatingSupportPanelHTML()}
    <button class="btn launch" style="width:100%" onclick="closeReorganizationResult()">Resume ordinary operations</button>`,true,true);
  return true;
}

function chooseBridgeLoan(insolvencyId,requestId){
  const prior=requestReceipt(requestId);
  if(prior){
    if(prior.kind==='bridge-loan'&&prior.subjectId===String(insolvencyId||'')&&prior.resultId===String(insolvencyId||'')) return true;
    announceAction(`Request ${requestId} no longer identifies this bridge loan.`); return false;
  }
  const ins=state.insolvency;
  if(!ins||ins.id!==String(insolvencyId||'')||ins.status!=='open'||(state.bailouts||0)>=2) return false;
  const terms=bailoutTerms(), fingerprint=requestIntentFingerprint('bridge-loan',{insolvencyId:ins.id,uses:state.bailouts||0,terms});
  const replay=inspectRequestReceipt(requestId,'bridge-loan',fingerprint); if(!replay.ok) return false;
  if(replay.replay) return true;
  state.bailouts=(state.bailouts||0)+1; state.money=round2(state.money+terms.amount); state.rep=Math.max(0,state.rep-terms.repCost);
  state.loanInterest=round2(loanInterest()+terms.interest); state.over=false;
  recordRequestReceipt(requestId,'bridge-loan',fingerprint,ins.id,null,ins.id); archiveResolvedInsolvency(ins,'loan');
  log('note',`Emergency bridge loan: +${fM(terms.amount)}, −${terms.repCost} rep, +${fM(terms.interest)}/mo permanent interest. (${2-state.bailouts} remaining)`);
  checkpointReorganizationSave(); _reorganizationModalLocked=false; hideModal(); render(); return true;
}

function confirmReorganization(insolvencyId){
  const ins=state.insolvency;
  if(!ins||ins.id!==String(insolvencyId||'')||!reorganizationEligible()) return false;
  const penalties=calculateReorganizationPenaltyTerms(state.rep,Math.max(0,round2(-finiteRecordNumber(state.money))),(state.reorganizationSeq||0)+1), debt=calculateReorganizationDebtTerms(loanInterest(),!!state.debtRenegotiated);
  showModal(`<h2>Confirm Program Reorganization</h2>
    <p class="muted" style="font-size:13px">This is a severe continuity measure, not a bailout. Accepting transfers the current ${fM(Math.abs(Math.min(0,state.money)))} deficit to the restructuring estate and reopens player Capital at ${fM(0)}.</p>
    <div class="metrics" style="margin:10px 0">
      <div class="metric"><div class="k">Protective stand-down</div><div class="v">360 days</div></div>
      <div class="metric"><div class="k">Reputation</div><div class="v">−${penalties.repLoss}</div></div>
      <div class="metric"><div class="k">Public support</div><div class="v">−${penalties.supportLoss}</div></div>
      <div class="metric"><div class="k">Legacy score</div><div class="v">−${penalties.legacyLoss}</div></div>
    </div>
    <p class="muted" style="font-size:12px">${debt.renegotiatedNow?`Creditors reduce permanent bridge-loan service once, from ${fM(debt.interestBefore)}/mo to ${fM(debt.interestAfter)}/mo.`:'The one-time creditor workout has already been used; existing loan service remains.'} Rivals continue while ordinary operations are suspended.</p>
    <p class="muted" style="font-size:12px">The sponsor funds one new uncrewed A-4 First Flight article through restricted escrow. Deferred missions keep their dates and physical outcomes; any cash they settle during administration belongs to the restructuring estate, not player Capital.</p>
    <p class="muted" style="font-size:12px"><b>Failure is costly:</b> any resolved non-success closes this cycle. Continuing then requires a fresh reorganization, another 360-day stand-down, and another full set of penalties.</p>
    <button class="btn launch" style="width:100%" onclick="acceptReorganization('${ins.id}','reorg:${ins.id}')">Accept these terms</button>
    <button class="btn ghost" style="width:100%;margin-top:6px" onclick="showInsolvencyContinuityModal()">Back to insolvency options</button>`,true,true);
  return true;
}

function reorganizationOfferHTML(ins){
  const rules=state.campaignRules||makeCampaignRules({ironman:false}), usesLeft=2-(state.bailouts||0), terms=bailoutTerms();
  const loan=usesLeft>0?`<button class="btn" onclick="chooseBridgeLoan('${ins.id}','loan:${ins.id}:${state.bailouts||0}')">Emergency bridge loan (+${fM(terms.amount)}, −${terms.repCost} rep, +${fM(terms.interest)}/mo)</button>`
    :'<div class="dim" style="font-size:12px;margin-top:6px">No further bridge loans are available.</div>';
  const penalties=calculateReorganizationPenaltyTerms(state.rep,Math.max(0,round2(-finiteRecordNumber(state.money))),(state.reorganizationSeq||0)+1), debt=calculateReorganizationDebtTerms(loanInterest(),!!state.debtRenegotiated);
  const failed=state.lastReorganization&&state.lastReorganization.phase==='failed'?state.lastReorganization:null;
  const reorg=rules.ironman
    ? `<div class="flag warn" style="margin-top:10px"><b>Ironman · Permanent insolvency</b><br>Program Reorganization is disabled for this campaign.</div>`
    : `<div class="card" style="margin-top:10px;text-align:left"><b>Program Reorganization · Standard campaign</b>
        <p class="muted" style="font-size:12px">Enter a 360-day protective stand-down. Rivals continue while ordinary operations pause. Restricted program funds then finance one new uncrewed A-4 First Flight article; no sponsor funds become Capital.</p>
        <div class="dim" style="font-size:12px">−${penalties.repLoss} reputation · −${penalties.supportLoss} support · −${penalties.legacyLoss} legacy<br>${debt.renegotiatedNow?`One-time creditor workout: ${fM(debt.interestBefore)}/mo → ${fM(debt.interestAfter)}/mo`:'The one-time creditor workout has already been used.'}</div>
        <button class="btn launch" style="width:100%" onclick="confirmReorganization('${ins.id}')">Review reorganization terms</button></div>`;
  const failure=failed?`<div class="flag warn" style="margin-bottom:10px"><b>Return-to-flight attempt unsuccessful</b><br>${esc(failed.mission.hullId||'The sponsored article')} settled as ${esc(failed.outcome&&failed.outcome.kind||'non-success')}. ${fM(failed.escrow.spent)} was consumed and ${fM(failed.escrow.returned)} of unused authority was closed. A new cycle starts from the beginning.</div>`:'';
  return `<h2 style="color:var(--bad)">${failed?'Program remains insolvent':'Out of capital'}</h2>${failure}<p>The venture cannot meet its obligations. Choose optional credit, review sponsor administration, or start over.</p>${loan}${reorg}<button class="btn ghost" onclick="showStartup()" style="width:100%;margin-top:8px">Start over · choose new-game rules</button>`;
}
function showInsolvencyContinuityModal(){
  const ins=state.insolvency||createInsolvencyRecord(null,state.money); state.over=true;
  checkpointReorganizationSave();
  showModal(reorganizationOfferHTML(ins),true,true); return true;
}
function reorganizationEstateCaptured(r){
  const arrivals=r&&r.receipts&&r.receipts.administrativeArrivals||{};
  return round2(Object.keys(arrivals).reduce((n,k)=>n+finiteRecordNumber(arrivals[k]&&arrivals[k].capturedCash),0));
}
function reorganizationStatusHTML(r){
  const e=r.escrow, remaining=round2(e.authorized-e.spent-e.returned);
  const ins=state.insolvency, deficit=ins?Math.max(0,round2(-finiteRecordNumber(ins.cash))):0, captured=reorganizationEstateCaptured(r);
  const estateNote=captured!==0?`<p class="muted" style="font-size:11px;margin:6px 0 0">The restructuring estate has also ${captured>=0?`withheld ${fM(captured)} in deferred-arrival proceeds from`:`absorbed a ${fM(Math.abs(captured))} deferred-arrival cost instead of charging`} player Capital.</p>`:'';
  return `<div class="metrics" style="margin:10px 0"><div class="metric"><div class="k">Date</div><div class="v">${dateStr()}</div></div><div class="metric"><div class="k">Restricted funds</div><div class="v">${fM(remaining)} / ${fM(e.authorized)}</div></div><div class="metric"><div class="k">Estate deficit held</div><div class="v">${fM(deficit)}</div></div><div class="metric"><div class="k">Attempt</div><div class="v">${r.sequence}</div></div></div>${estateNote}`;
}
function resumeReorganizationUI(){
  const r=activeReorganization();
  if(!r){ if(state.insolvency&&state.over) return showInsolvencyContinuityModal(); return false; }
  if(activeLaunchTransaction()) return false;
  if(r.administrativeForeground) return restoreAdministrativeArrivalForeground(r);
  let body='';
  if(r.phase==='standdown'){
    const total=REORGANIZATION_RULES.standdownDays, elapsed=Math.max(0,Math.min(total,absDay()-r.acceptedAbs)), remaining=Math.max(0,r.standdownEndsAbs-absDay());
    const pct=total>0?Math.round(elapsed/total*100):0;
    body=`<h2>Program under administration</h2><p class="muted">Ordinary research, production, staffing, facilities, contracts, purchases, and time controls are suspended. Rivals continue. Deferred arrivals keep their dates and may temporarily take Mission Control.</p>${reorganizationStatusHTML(r)}
      <p><b>Protective stand-down:</b> day ${elapsed} of ${total} · ${remaining} remaining.</p>
      <div class="dim" style="font-size:12px;margin:-4px 0 8px">Rival movement applied: ${r.rivalMonthsApplied||0} of ${REORGANIZATION_RULES.rivalMonths} months. The estate carries all costs while the clock runs.</div>
      <button class="btn launch" style="width:100%" onclick="advanceReorganization('standdown:${r.id}')">Advance the administrative clock (${pct}%)</button>`;
  }
  else if(r.phase==='planning'){
    const plan=recoveryPlanFor(r), q=plan.quote||{}, escrowPlan=calculateSponsorEscrow(q,operatingMonthlyBurn());
    body=`<h2>Sponsor-directed return to flight</h2><p class="muted">Restricted program funds finance one newly built, uncrewed A-4 First Flight article. Hardware, timing, testing, weather, reliability, and failure consequences remain normal.</p>${reorganizationStatusHTML(r)}
      <div class="metrics" style="margin:10px 0"><div class="metric"><div class="k">Build</div><div class="v">${q.buildDays||0} days · ${fM(q.buildCost||0)}</div></div><div class="metric"><div class="k">Flight odds</div><div class="v">${Math.round((q.successProbability||0)*100)}%</div></div><div class="metric"><div class="k">Total authorization</div><div class="v">${fM(escrowPlan.authorized)}</div></div></div>
      <p class="muted" style="font-size:11px">Authorization covers the displayed article, flight/test operations, operating carry, and bounded weather recycling. It never enters Capital.</p><button class="btn launch" style="width:100%" onclick="commitSponsoredBuild('${r.id}','sponsor-build:${r.id}')">Authorize this A-4 article</button>`;
  }
  else if(r.phase==='building') body=`<h2>Sponsored article in production</h2>${reorganizationStatusHTML(r)}<p class="muted">Order ${esc(r.mission.orderId||'—')} is the only production progressing under administration.</p><button class="btn launch" style="width:100%" onclick="commitSponsoredBuild('${r.id}','sponsor-build:${r.id}')">Continue to rollout</button>`;
  else if(r.phase==='ready') body=`<h2>Return-to-flight article ready</h2>${reorganizationStatusHTML(r)}<p class="muted">Mission: First Flight · order ${esc(r.mission.orderId)} · hull ${esc(r.mission.hullId)}. This is a normal probabilistic flight; success is not guaranteed.</p><button class="btn launch" style="width:100%" onclick="launchSponsoredHull('${r.id}','${r.mission.orderId}','${r.mission.hullId}','sponsor-launch:${r.id}:${r.mission.hullId}')">Fly sponsor-directed First Flight</button>`;
  else body=`<h2>Program under administration</h2>${reorganizationStatusHTML(r)}<p class="muted">Mission Control is restoring the sponsored flight.</p>`;
  showModal(body,true,true); return true;
}
