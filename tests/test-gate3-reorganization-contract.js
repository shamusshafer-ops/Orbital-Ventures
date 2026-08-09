// Gate 3 executable recovery contract: insolvency -> administration -> exact
// sponsored article -> ordinary Gate 2 launch settlement -> bounded support.
let g3Pass=0,g3Fail=0;
function g3Check(name,condition,detail){
  if(condition) g3Pass++;
  else { g3Fail++; console.log('FAIL:',name,detail||''); }
}
function g3Near(a,b,epsilon){ return Math.abs(a-b)<(epsilon||0.011); }
function g3OpenInsolvency(options){
  options=options||{};
  newGame('engineer');
  animEnabled=false;
  _gameStarted=true;
  state.money=options.cash==null?-.25:options.cash;
  state.rep=options.rep==null?80:options.rep;
  state.publicSupport=options.support==null?50:options.support;
  state.loanInterest=options.interest==null?.18:options.interest;
  if(options.ironman) state.campaignRules.ironman=true;
  evaluateTerminalAfterTransaction();
  return state.insolvency;
}
function g3AcceptAndStandDown(suffix){
  const ins=state.insolvency;
  const accepted=acceptReorganization(ins.id,`accept:${suffix}:${ins.id}`);
  const id=state.reorganization&&state.reorganization.id;
  const advanced=advanceReorganization(`standdown:${suffix}:${id}`);
  return {accepted,advanced,id};
}
function g3BuildAndFly(suffix,outcome,weather){
  const r=state.reorganization;
  const built=commitSponsoredBuild(r.id,`build:${suffix}:${r.id}`);
  const ready=state.reorganization;
  if(weather) _devForceWeather=true;
  _devForceOutcome=outcome;
  const flown=launchSponsoredHull(ready.id,ready.mission.orderId,ready.mission.hullId,
    `launch:${suffix}:${ready.id}:${ready.mission.hullId}`);
  return {built,flown};
}

// Standard success path and exact, non-fungible funding ownership.
seedRNG(1303);
let g3Ins=g3OpenInsolvency();
g3Check('negative cash creates a durable open insolvency owner',
  !!g3Ins&&g3Ins.status==='open'&&state.over&&reorganizationEligible());
g3Check('continuity modal exposes Standard reorganization and optional credit',
  /Program Reorganization/.test($('modalBody').innerHTML)&&/Emergency bridge loan/.test($('modalBody').innerHTML));
const g3OfferMoney=state.money;
confirmReorganization(g3Ins.id);
g3Check('reorganization requires a second, exact-terms confirmation before mutation',
  /360 days/.test($('modalBody').innerHTML)&&/Legacy score/.test($('modalBody').innerHTML)&&/restructuring estate/.test($('modalBody').innerHTML)&&
  /Deferred missions/.test($('modalBody').innerHTML)&&state.money===g3OfferMoney&&state.reorganization===null);
showInsolvencyContinuityModal();
const g3Before={day:absDay(),rep:state.rep,support:publicSupport(),interest:loanInterest()};
const g3First=g3AcceptAndStandDown('success');
g3Check('acceptance creates exactly one active attempt and reuses no ordinary cash',
  g3First.accepted&&state.reorganizationAttempts===1&&state.reorganization.id===g3First.id&&state.money===0);
g3Check('acceptance applies the locked first-cycle penalties exactly once',
  state.rep===g3Before.rep-12&&g3Near(publicSupport(),g3Before.support-10)&&state.legacyPenalty===10);
g3Check('acceptance persists exact penalty and creditor receipts',
  state.reorganization.receipts.penalties.repBefore===g3Before.rep&&state.reorganization.receipts.penalties.repAfter===state.rep&&
  state.reorganization.receipts.penalties.supportAfter===publicSupport()&&state.reorganization.receipts.penalties.legacyAfter===10&&
  state.reorganization.receipts.debt.interestBefore===g3Before.interest);
g3Check('first cycle halves aggregate permanent loan service once',
  state.debtRenegotiated&&g3Near(loanInterest(),.09)&&state.reorganization.debt.renegotiatedNow);
g3Check('stand-down advances exactly 360 days and twelve rival months',
  g3First.advanced&&absDay()===g3Before.day+360&&state.reorganization.phase==='planning'&&state.reorganization.rivalMonthsApplied===12);
g3Check('active attempt and insolvency owners remain audit-clean after stand-down',auditReorganizationState(state).length===0,
  auditReorganizationState(state).join(', '));

const g3CapitalBeforeBuild=state.money;
const g3BuildRequest=`build:success:${state.reorganization.id}`;
const g3Built=commitSponsoredBuild(state.reorganization.id,g3BuildRequest);
const g3Ready=state.reorganization;
const g3Order=hangarList().find(o=>o.id===g3Ready.mission.orderId);
g3Check('restricted escrow produces one exact ordinary order and hull',
  g3Built&&g3Ready.phase==='ready'&&!!g3Order&&g3Order.hullId===g3Ready.mission.hullId&&
  hangarList().filter(o=>o.id===g3Ready.mission.orderId).length===1);
g3Check('article construction never deposits or spends campaign Capital',
  state.money===g3CapitalBeforeBuild&&g3Ready.escrow.authorized>0&&g3Ready.escrow.spent>0);
const g3BuildSnapshot={orders:state.orderSeq,spent:g3Ready.escrow.spent,hangar:hangarList().length};
commitSponsoredBuild(g3Ready.id,g3BuildRequest);
g3Check('replaying sponsored build cannot duplicate debit, order, or hull',
  state.orderSeq===g3BuildSnapshot.orders&&state.reorganization.escrow.spent===g3BuildSnapshot.spent&&hangarList().length===g3BuildSnapshot.hangar);
const g3ReadyPayload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:30,state}));
applyLoadedSave(g3ReadyPayload);
g3Check('actual ready article round-trips with exact attempt/order/hull ownership',
  state.reorganization.phase==='ready'&&state.reorganization.id===g3Ready.id&&
  state.reorganization.mission.orderId===g3Ready.mission.orderId&&state.reorganization.mission.hullId===g3Ready.mission.hullId&&
  !!hangarList().find(o=>o.id===g3Ready.mission.orderId&&o.hullId===g3Ready.mission.hullId)&&auditReorganizationState(state).length===0);
resumeReorganizationUI();
g3Check('ready-state reload restores the exact sponsor launch decision',
  /Mission: First Flight/.test($('modalBody').innerHTML)&&$('modalBody').innerHTML.includes(g3Ready.mission.orderId)&&
  $('modalBody').innerHTML.includes(g3Ready.mission.hullId));

const g3AttemptId=state.reorganization.id,g3HullId=state.reorganization.mission.hullId;
const g3AuthorizedAtReady=state.reorganization.escrow.authorized;
const g3LaunchRequest=`launch:success:${g3AttemptId}:${g3HullId}`;
_devForceWeather=true;
_devForceOutcome='success';
const g3LaunchDay=absDay();
const g3Flown=launchSponsoredHull(g3AttemptId,state.reorganization.mission.orderId,g3HullId,g3LaunchRequest);
g3Check('sponsored flight delegates to and fully resolves the ordinary Gate 2 transaction',
  g3Flown&&state.launchTxn===null&&requestReceipt(g3LaunchRequest).kind==='launch'&&requestReceipt(g3LaunchRequest).status==='resolved');
g3Check('weather recycling remains inside the same attempt and advances its narrow clock',
  state.reorganizationAttempts===1&&!!state.lastReorganization&&state.lastReorganization.id===g3AttemptId&&absDay()>g3LaunchDay,
  `flown=${g3Flown} active=${state.reorganization&&state.reorganization.phase} last=${state.lastReorganization&&state.lastReorganization.phase} tx=${state.launchTxn&&state.launchTxn.phase}`);
g3Check('successful First Flight archives the exact attempt and resumes ordinary operations',
  !state.reorganization&&state.lastReorganization.phase==='succeeded'&&state.lastReorganization.mission.hullId===g3HullId&&
  state.reorganizationSuccesses===1&&!state.over&&!state.insolvency);
g3Check('successful settlement presents a dedicated handoff and visible support terms',
  /Return to flight confirmed/.test($('modalBody').innerHTML)&&/Available \/ authorized/.test($('modalBody').innerHTML)&&/not spendable Capital/.test($('modalBody').innerHTML));
g3Check('unused escrow is closed rather than converted into Capital',
  state.lastReorganization.escrow.returned>=0&&
  g3Near(state.lastReorganization.escrow.spent+state.lastReorganization.escrow.returned,state.lastReorganization.escrow.authorized)&&
  state.lastReorganization.escrow.authorized===g3AuthorizedAtReady);
g3Check('success opens a restricted 90-day, three-month burn ledger',
  !!state.operatingSupport&&state.operatingSupport.endAbs-state.operatingSupport.startAbs===90&&
  state.operatingSupport.monthsLeft===3&&state.operatingSupport.monthlyCap>0&&state.operatingSupport.paid===0);
g3Check('successful continuity state passes the complete audit',auditReorganizationState(state).length===0,
  auditReorganizationState(state).join(', '));
g3Check('sponsored success captures the flight payout to the estate rather than player Capital',
  state.money===0&&state.lastReorganization.receipts.settlement.capturedRevenue>0,
  `money=${state.money} captured=${state.lastReorganization.receipts.settlement.capturedRevenue}`);
const g3AfterSuccess={money:state.money,flights:state.flights,successes:state.successes,attempts:state.reorganizationAttempts};
launchSponsoredHull(g3AttemptId,g3Ready.mission.orderId,g3HullId,g3LaunchRequest);
g3Check('replaying a settled sponsored launch applies no second outcome',
  state.money===g3AfterSuccess.money&&state.flights===g3AfterSuccess.flights&&state.successes===g3AfterSuccess.successes&&state.reorganizationAttempts===g3AfterSuccess.attempts);

let g3Support=state.operatingSupport;
const g3SupportStartMoney=state.money;
advanceDays(1);
const g3FirstDayPaid=g3Support.paid;
const g3SupportPayload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:31,state}));
applyLoadedSave(g3SupportPayload); g3Support=state.operatingSupport;
advanceDays(29);
g3Check('support pays only after a realized recurring month and within its frozen cap',
  g3FirstDayPaid>0&&g3FirstDayPaid<=g3Support.monthlyCap/DAYS_PER_MONTH+.000001&&
  g3Support.paid<=g3Support.monthlyCap+.000001&&g3Support.monthsLeft===2&&state.money>g3SupportStartMoney-g3Support.monthlyCap-.02);
g3Check('daily support accrual survives save/reload without inflating authority',
  g3Near(g3Support.paid,g3Support.monthlyCap,.00001)&&g3Near(g3Support.paid+g3Support.remaining,g3Support.monthlyCap*3,.00001));
advanceDays(60);
g3Check('support authority expires after three monthly settlements and retains no spendable reserve',
  g3Support.closedReason==='expired'&&g3Support.monthsLeft===0&&g3Support.remaining===0&&operatingSupportRecordErrors(g3Support).length===0);
restoreRNG();

// Optional credit owns an idempotent request just like reorganization acceptance.
g3Ins=g3OpenInsolvency();
const g3LoanRequest=`loan-replay:${g3Ins.id}`,g3LoanFirst=chooseBridgeLoan(g3Ins.id,g3LoanRequest);
const g3LoanSnapshot={money:state.money,rep:state.rep,interest:state.loanInterest,bailouts:state.bailouts};
const g3LoanReplay=chooseBridgeLoan(g3Ins.id,g3LoanRequest);
g3Check('exact bridge-loan replay returns success without applying money, penalties, or debt twice',
  g3LoanFirst&&g3LoanReplay&&state.money===g3LoanSnapshot.money&&state.rep===g3LoanSnapshot.rep&&
  state.loanInterest===g3LoanSnapshot.interest&&state.bailouts===g3LoanSnapshot.bailouts);

// Failure creates a genuinely new choice and a fresh penalized cycle. The
// creditor workout cannot ratchet down again.
seedRNG(2303);
g3Ins=g3OpenInsolvency({rep:80,support:50,interest:.18});
g3AcceptAndStandDown('failure-one');
const g3FailedAttempt=state.reorganization.id;
g3BuildAndFly('failure-one','loss',false);
g3Check('failed sponsor flight closes its escrow and opens a fresh insolvency choice',
  !state.reorganization&&state.lastReorganization.phase==='failed'&&state.lastReorganization.id===g3FailedAttempt&&
  !!state.insolvency&&state.insolvency.status==='open'&&state.insolvency.id!==state.lastInsolvency.id&&state.over);
g3Check('failed cycle offers a fresh reorganization, any remaining loan, or restart',
  /Review reorganization terms/.test($('modalBody').innerHTML)&&/Emergency bridge loan/.test($('modalBody').innerHTML)&&/Start over/.test($('modalBody').innerHTML));
const g3RetryBefore={day:absDay(),rep:state.rep,support:publicSupport(),interest:loanInterest()};
const g3RetryIns=state.insolvency;
const g3Retry=g3AcceptAndStandDown('failure-two');
g3Check('retry is a new identity linked to the failed attempt',
  g3Retry.accepted&&state.reorganization.id!==g3FailedAttempt&&state.reorganization.retryOf===g3FailedAttempt&&
  state.reorganization.insolvencyId===g3RetryIns.id);
g3Check('retry exacts another full year and another set of penalties',
  absDay()===g3RetryBefore.day+360&&state.rep===g3RetryBefore.rep-calculateReorganizationPenaltyTerms(g3RetryBefore.rep).repLoss&&
  g3Near(publicSupport(),g3RetryBefore.support-10)&&state.legacyPenalty===20&&state.reorganizationAttempts===2);
g3Check('retry cannot repeat the one-time debt workout',
  g3Near(loanInterest(),g3RetryBefore.interest)&&!state.reorganization.debt.renegotiatedNow&&state.reorganization.debt.alreadyRenegotiatedBefore);
g3Check('retry continuity state remains audit-clean',auditReorganizationState(state).length===0,auditReorganizationState(state).join(', '));
restoreRNG();

// Administrative suspension rejects representative economy, time, design,
// staffing, R&D, and production actions without partial mutations.
g3Ins=g3OpenInsolvency();
acceptReorganization(g3Ins.id,`accept:suspension:${g3Ins.id}`);
const g3Frozen={day:absDay(),money:state.money,stages:state.stages.length,staff:state.staff.length,
  research:state.activeResearch,orders:buildQueueList().length,tab:state.tab,skill:divisionState('structures').skill};
state.research.orbital_depot=true; state.depot=5; state.partnerships=['university']; state.researchNext='kerosene';
const g3ExtendedFrozen={money:state.money,depot:state.depot,partnerships:state.partnerships.slice(),researchNext:state.researchNext,
  difficulty:state.difficulty,ambition:state.ambition,engine:state.stages[0].eng,vehicles:vehicleFamilies().length};
const g3BlockedTime=advanceDays(1);
addStage();
hirePersonnel('a01');
buyResearch('test_program');
queueBuild(false,'blocked-build');
trainDivision('structures');
setTab('research');
g3Check('ordinary time and representative action surfaces are rejected before mutation',
  g3BlockedTime===false&&absDay()===g3Frozen.day&&state.money===g3Frozen.money&&state.stages.length===g3Frozen.stages&&
  state.staff.length===g3Frozen.staff&&state.activeResearch===g3Frozen.research&&buildQueueList().length===g3Frozen.orders&&
  state.tab===g3Frozen.tab&&divisionState('structures').skill===g3Frozen.skill);
sellFuel(1); dissolvePartnership('university'); clearResearchNext(); setDifficulty('napkin');
setAmbition('moon'); setEngine(0,'forged'); saveAsFamily();
g3Check('extended economic, registry, settings, and design mutation surfaces are also frozen',
  state.money===g3ExtendedFrozen.money&&state.depot===g3ExtendedFrozen.depot&&
  JSON.stringify(state.partnerships)===JSON.stringify(g3ExtendedFrozen.partnerships)&&state.researchNext===g3ExtendedFrozen.researchNext&&
  state.difficulty===g3ExtendedFrozen.difficulty&&state.ambition===g3ExtendedFrozen.ambition&&
  state.stages[0].eng===g3ExtendedFrozen.engine&&vehicleFamilies().length===g3ExtendedFrozen.vehicles);

// A persisted Gate 2 arrival keeps its date and physical outcome. Only its
// cash consequence is held outside player Capital while administration owns
// the program.
g3Ins=g3OpenInsolvency();
const g3ArrivalStart=absDay(),g3ArrivalAbs=g3ArrivalStart+15;
const g3ArrivalMission=curMission(),g3ArrivalVehicle=computeVehicle(),g3ArrivalSpec=queueSpecSnapshot();
const g3ArrivalHull=makeHull(g3ArrivalSpec,'rollout'); g3ArrivalHull.status='in-flight';
const g3ArrivalOutcome=devSynthOutcome('success',g3ArrivalMission,g3ArrivalVehicle,null,false,0);
const g3ArrivalTx=makeLaunchTransactionRecord({id:'ltx-admin-arrival',requestId:'arrival:flt-admin',
  intentFingerprint:'fixture:admin-arrival',source:'cruise',phase:'cruise',missionId:g3ArrivalMission.id,
  mission:g3ArrivalMission,hullId:g3ArrivalHull.id,spec:g3ArrivalSpec,
  context:launchTransactionContextSnapshot({v:g3ArrivalVehicle,sim:null,windowQuality:1,flightExpense:0,routine:false,
    crewed:false,outcome:g3ArrivalOutcome,rehearsed:false,transactionId:'ltx-admin-arrival',famId:null,
    hullId:g3ArrivalHull.id,crewId:null,ab:{rel:0,payoutMult:1}}),outcome:g3ArrivalOutcome,
  applied:{ownership:true,cash:true,stock:true,time:true,pad:true,liftoff:true,cruise:true}});
state.requestReceipts[g3ArrivalTx.requestId]={requestId:g3ArrivalTx.requestId,kind:'launch',fingerprint:g3ArrivalTx.intentFingerprint,
  resultId:g3ArrivalTx.id,missionId:g3ArrivalMission.id,subjectId:g3ArrivalHull.id,atAbs:g3ArrivalStart};
(state.activeFlights=state.activeFlights||[]).push({id:'flt-admin',mission:g3ArrivalMission.id,name:'Persisted arrival',launchAbs:g3ArrivalStart-60,
  arriveAbs:g3ArrivalAbs,phase:'cruise',crew:0,deferred:true,ctx:launchTransactionContext(g3ArrivalTx),txn:g3ArrivalTx});
acceptReorganization(g3Ins.id,`accept:arrival:${g3Ins.id}`);
const g3ArrivalAttempt=state.reorganization;
advanceReorganization(`standdown:arrival:${g3ArrivalAttempt.id}`);
const g3ArrivalReceipt=g3ArrivalAttempt.receipts.administrativeArrivals&&g3ArrivalAttempt.receipts.administrativeArrivals[g3ArrivalTx.id];
g3Check('due mission settles on its unchanged arrival day under Gate 2 ownership',
  !!g3ArrivalReceipt&&g3ArrivalReceipt.atAbs===g3ArrivalAbs&&requestReceipt(g3ArrivalTx.requestId).status==='resolved'&&
  state.completed[g3ArrivalMission.id]&&!(state.activeFlights||[]).some(f=>f&&f.id==='flt-admin'));
g3Check('administrative arrival cannot leak mission payout into player Capital',
  g3ArrivalReceipt.capturedCash>0&&state.money===0&&state.reorganization===g3ArrivalAttempt&&state.reorganization.phase==='planning');
g3Check('arrival interruption neither shifts nor restarts the 360-day stand-down',
  absDay()===g3ArrivalStart+REORGANIZATION_RULES.standdownDays&&g3ArrivalAttempt.acceptedAbs===g3ArrivalStart&&
  g3ArrivalAttempt.standdownEndsAbs===g3ArrivalStart+REORGANIZATION_RULES.standdownDays);

// Ironman makes insolvency permanent: it never fabricates a recovery owner.
g3Ins=g3OpenInsolvency({ironman:true});
g3Check('Ironman suppresses Program Reorganization eligibility and offer',
  !reorganizationEligible()&&!/Enter protective reorganization/.test($('modalBody').innerHTML)&&/Permanent insolvency/.test($('modalBody').innerHTML));
g3Check('Ironman cannot accept a forged reorganization request',
  !acceptReorganization(g3Ins.id,`accept:ironman:${g3Ins.id}`)&&state.reorganization===null&&state.reorganizationAttempts===0);

// A solvent company with no eligible recurring burn still gets a closed audit
// receipt, never an invalid zero-authority live ledger.
newGame('engineer');
state.passiveContracts=[{id:'support-surplus',monthsLeft:12,income:1}];
const g3ZeroSupport=beginOperatingSupport('fixture-zero-burn');
g3Check('zero eligible burn creates an immediately exhausted, audit-safe ledger',
  g3ZeroSupport.monthlyCap===0&&g3ZeroSupport.remaining===0&&g3ZeroSupport.monthsLeft===0&&
  g3ZeroSupport.closedReason==='exhausted'&&operatingSupportRecordErrors(g3ZeroSupport).length===0);

// Support begins on its settlement date, not on a calendar-month boundary.
newGame('engineer'); animEnabled=false; seedRNG(3303);
setCampaignAbsDay(absMonth()*DAYS_PER_MONTH+29); state.money=.05; state.loanInterest=4;
const g3BoundarySupport=beginOperatingSupport('fixture-boundary');
advanceDays(1);
g3Check('day-29 success earns only one day of support at the next calendar boundary',
  !state.over&&g3BoundarySupport.receipts['period:1'].days===1&&
  g3BoundarySupport.paid<=g3BoundarySupport.monthlyCap/DAYS_PER_MONTH+.000001);
newGame('engineer'); animEnabled=false; state.money=100;
setCampaignAbsDay(absMonth()*DAYS_PER_MONTH+15);
const g3ExactSupport=beginOperatingSupport('fixture-exact-window'),g3ExactStart=absDay();
advanceDays(89);
g3Check('support remains active through elapsed day 89 regardless of start day',
  !g3ExactSupport.closedReason&&absDay()===g3ExactStart+89&&g3ExactSupport.monthsLeft===1);
advanceDays(1);
g3Check('support closes at exactly 90 elapsed days, not the third calendar boundary',
  absDay()===g3ExactStart+90&&g3ExactSupport.closedReason==='expired'&&g3ExactSupport.monthsLeft===0&&g3ExactSupport.remaining===0);
restoreRNG();

console.log(`${g3Pass}/${g3Pass+g3Fail} checks passed`);
process.exitCode=g3Fail?1:0;
