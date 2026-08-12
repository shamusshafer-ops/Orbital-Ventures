// Gate 3 persisted-state foundation: exact Program Reorganization terms,
// bounded JSON-safe owners, strict v63 loading, and v62 Standard migration.
let g3Pass=0,g3Fail=0;
function g3Check(name,condition){ if(condition) g3Pass++; else { g3Fail++; console.log('FAIL:',name); } }
function g3SetStateAbs(s,day){ const p=absDayToParts(day); s.year=p.y; s.month=p.m; s.day=p.d; }

function g3Attempt(sequence,phase){
  const acceptedAbs=120;
  const fixtureSpec=canonicalRecoverySpec();
  const fixtureQuote={requiredAtCommit:.75,endToEndRunway:.75};
  phase=phase||'standdown';
  const penalties=calculateReorganizationPenaltyTerms(80,0,sequence); penalties.applied=true;
  const debt=calculateReorganizationDebtTerms(.37,sequence>1); debt.applied=true;
  const hasBuild=['building','ready','launching','settling','succeeded','failed'].includes(phase);
  const hasHull=['ready','launching','settling','succeeded','failed'].includes(phase);
  const hasLaunch=['launching','settling','succeeded','failed'].includes(phase);
  const quoteFingerprint=requestIntentFingerprint('sponsor-quote',fixtureQuote);
  const monthlyBurnBasis=.5;
  // Gate 6/calendar rework: authorized and weatherContingency used to be hardcoded literals
  // (1.25, .5) that were only correct because monthlyBurn*30/DAYS_PER_MONTH was an identity
  // transform under the old exact-integer DAYS_PER_MONTH=30. Derived from the real game
  // function instead, so this fixture can't go stale again if the constant is retuned further.
  const {authorized,weatherContingency}=calculateSponsorEscrow(fixtureQuote,monthlyBurnBasis);
  const spent=hasBuild?.75:0;
  const acceptance={atAbs:acceptedAbs,requestId:`accept-fixture-${sequence}`};
  const penaltyReceipt={atAbs:acceptedAbs,repBefore:penalties.repBefore,repLoss:penalties.repLoss,repAfter:penalties.repBefore-penalties.repLoss,
    supportBefore:50,supportLoss:penalties.supportLoss,supportAfter:40,
    legacyBefore:REORGANIZATION_RULES.legacyPenalty*(sequence-1)*sequence/2,legacyLoss:penalties.legacyLoss,legacyAfter:REORGANIZATION_RULES.legacyPenalty*sequence*(sequence+1)/2};
  const debtReceipt={atAbs:acceptedAbs,interestBefore:debt.interestBefore,interestAfter:debt.interestAfter,
    alreadyRenegotiatedBefore:debt.alreadyRenegotiatedBefore,renegotiatedNow:debt.renegotiatedNow};
  const authorization={atAbs:acceptedAbs+REORGANIZATION_RULES.standdownDays,endToEndRunway:.75,monthlyBurnBasis,
    weatherContingency,authorized,fingerprint:requestIntentFingerprint('sponsor-authorization',{quoteFingerprint,monthlyBurnBasis,weatherContingency,authorized})};
  return makeReorganizationRecord({id:'reorganization-'+sequence,sequence,insolvencyId:'insolvency-1',revision:0,phase,
    acceptedAbs,standdownEndsAbs:acceptedAbs+REORGANIZATION_RULES.standdownDays,
    clockAbs:phase&&phase!=='standdown'?acceptedAbs+REORGANIZATION_RULES.standdownDays:acceptedAbs,
    rivalMonthsApplied:phase&&phase!=='standdown'?REORGANIZATION_RULES.rivalMonths:0,
    closedAbs:TERMINAL_REORGANIZATION_PHASES.includes(phase)?acceptedAbs+REORGANIZATION_RULES.standdownDays+1:null,
    penalties,debt,mission:{missionId:'first_flight',crew:0,specFingerprint:requestIntentFingerprint('reorganization-spec',fixtureSpec),spec:fixtureSpec,
      buildRequestId:hasBuild?'reorganization-1:build':null,orderId:hasBuild?'ord-reorg-1':null,hullId:hasHull?'hull-reorg-1':null,
      launchRequestId:hasLaunch?'reorganization-1:launch':null,launchTransactionId:hasLaunch?'ltx-reorg-1':null},
    escrow:{authorized:phase==='standdown'?0:authorized,spent,returned:TERMINAL_REORGANIZATION_PHASES.includes(phase)?authorized-spent:0,
      quoteFingerprint:phase==='standdown'?null:quoteFingerprint,quote:phase==='standdown'?null:fixtureQuote,
      receipts:phase==='standdown'?{}:{authorization,debits:[{atAbs:acceptedAbs+REORGANIZATION_RULES.standdownDays,purpose:'article-build',amount:spent}]}},
    receipts:Object.assign({accepted:acceptance,penalties:penaltyReceipt,debt:debtReceipt},phase==='standdown'?{}:{plan:{atAbs:acceptedAbs+REORGANIZATION_RULES.standdownDays,quoteFingerprint,authorized}}),
    outcome:phase==='succeeded'?{kind:'success'}:(phase==='failed'?{kind:'loss'}:null)});
}
function g3ActiveState(){
  const s=createFreshState('engineer'),r=g3Attempt(1,'standdown');
  s.loanInterest=r.debt.interestAfter; s.debtRenegotiated=true; s.legacyPenalty=10;
  s.insolvencySeq=1; s.insolvency=makeInsolvencyRecord({id:'insolvency-1',sequence:1,revision:1,status:'reorganization',atAbs:119,cash:-.25,reorganizationId:r.id,receipts:{created:'receipt-insolvency'}});
  s.reorganizationSeq=1; s.reorganizationAttempts=1; s.reorganizationSuccesses=0; s.reorganization=r;
  return s;
}
function g3SupportedState(){
  const s=createFreshState('engineer'),r=g3Attempt(1,'succeeded');
  s.loanInterest=r.debt.interestAfter; s.debtRenegotiated=true; s.legacyPenalty=10;
  s.insolvencySeq=1; s.lastInsolvency=makeInsolvencyRecord({id:'insolvency-1',sequence:1,revision:2,status:'resolved',atAbs:119,cash:-.25,reorganizationId:r.id,resolvedBy:'reorganization-success',resolvedAbs:r.closedAbs,receipts:{resolved:'receipt-resolved'}});
  s.reorganizationSeq=1; s.reorganizationAttempts=1; s.reorganizationSuccesses=1; s.lastReorganization=r;
  s.operatingSupport=makeOperatingSupportRecord({id:'support-1',reorganizationId:r.id,startAbs:r.closedAbs,endAbs:r.closedAbs+REORGANIZATION_RULES.exitSupportDays,
    monthsLeft:3,monthlyCap:1.2,authorized:3.6,remaining:3.6,paid:0,eligibleSnapshot:{obligations:['overhead','payroll'],forecastNet:-1.2},receipts:{opened:{atAbs:r.closedAbs}}});
  s.operatingSupport.ledgerFingerprint=operatingSupportLedgerFingerprint(s.operatingSupport);
  g3SetStateAbs(s,r.closedAbs);
  return s;
}

const g3Fresh=createFreshState('engineer');
g3Check('fresh campaigns are explicit Standard campaigns with no recovery owner',
  g3Fresh.campaignRules.schema===REORGANIZATION_SCHEMA_VERSION&&!g3Fresh.campaignRules.ironman&&!g3Fresh.debtRenegotiated&&
  g3Fresh.insolvency===null&&g3Fresh.lastInsolvency===null&&g3Fresh.reorganization===null&&g3Fresh.lastReorganization===null&&g3Fresh.operatingSupport===null);
g3Check('fresh counters and cumulative penalties start at zero',
  g3Fresh.insolvencySeq===0&&g3Fresh.reorganizationSeq===0&&g3Fresh.reorganizationAttempts===0&&g3Fresh.reorganizationSuccesses===0&&g3Fresh.legacyPenalty===0);
g3Check('fresh continuity state passes the pure audit',auditReorganizationState(g3Fresh).length===0);

g3Check('base reputation/support/legacy terms are exact and clamped',
  calculateReorganizationPenaltyTerms(0).repLoss===0&&calculateReorganizationPenaltyTerms(5).repLoss===5&&
  calculateReorganizationPenaltyTerms(80).repLoss===12&&calculateReorganizationPenaltyTerms(100).repLoss===15&&
  calculateReorganizationPenaltyTerms(80).supportLoss===10&&calculateReorganizationPenaltyTerms(80).legacyLoss===10);
g3Check('tuned penalties scale reputation with deficit and legacy with cycle (D2/D3)',
  calculateReorganizationPenaltyTerms(80,5,1).repLoss===22&&calculateReorganizationPenaltyTerms(80,20,1).repLoss===52&&
  calculateReorganizationPenaltyTerms(80,0,1).legacyLoss===10&&calculateReorganizationPenaltyTerms(80,0,3).legacyLoss===30&&
  calculateReorganizationPenaltyTerms(80,5,2).deficitForgiven===5&&calculateReorganizationPenaltyTerms(80,0,3).cycleIndex===3&&
  calculateReorganizationPenaltyTerms(100,20,1).repLoss===55);
const g3DebtFirst=calculateReorganizationDebtTerms(.37,false),g3DebtRetry=calculateReorganizationDebtTerms(.37,true);
g3Check('debt workout halves once at money precision',g3DebtFirst.interestBefore===.37&&g3DebtFirst.interestAfter===.19&&g3DebtFirst.renegotiatedNow);
g3Check('retry cannot ratchet interest and future service remains intact',g3DebtRetry.interestAfter===.37&&!g3DebtRetry.renegotiatedNow&&g3DebtRetry.alreadyRenegotiatedBefore);
const g3RetryRecord=g3Attempt(2,'standdown');
g3Check('later attempt records encode no second renegotiation',g3RetryRecord.debt.interestAfter===.37&&!g3RetryRecord.debt.renegotiatedNow&&reorganizationRecordErrors(g3RetryRecord).length===0);

const g3Active=g3ActiveState(),g3ActiveRecord=g3Active.reorganization;
g3Check('active insolvency and reorganization factories produce valid JSON-safe owners',
  insolvencyRecordErrors(g3Active.insolvency).length===0&&reorganizationRecordErrors(g3ActiveRecord).length===0&&recordIsJsonSafe(g3ActiveRecord)&&auditReorganizationState(g3Active).length===0);
const g3SourceSpec={stages:[{eng:'a4'}]},g3Snapshot=makeReorganizationRecord(Object.assign({},g3ActiveRecord,{mission:Object.assign({},g3ActiveRecord.mission,{spec:g3SourceSpec})}));
g3SourceSpec.stages[0].eng='mutated';
g3Check('reorganization factory deep-snapshots physical and receipt data',g3Snapshot.mission.spec.stages[0].eng==='a4'&&recordIsJsonSafe(g3Snapshot));

const g3Supported=g3SupportedState();
g3Check('successful archive and restricted 90-day support ledger audit cleanly',
  operatingSupportRecordErrors(g3Supported.operatingSupport).length===0&&auditReorganizationState(g3Supported).length===0&&
  g3Supported.operatingSupport.endAbs-g3Supported.operatingSupport.startAbs===90);
const g3SupportSource={obligations:['payroll']},g3SupportCopy=makeOperatingSupportRecord(Object.assign({},g3Supported.operatingSupport,{eligibleSnapshot:g3SupportSource}));
g3SupportCopy.ledgerFingerprint=operatingSupportLedgerFingerprint(g3SupportCopy);
g3SupportSource.obligations[0]='purchase';
g3Check('support eligibility snapshot is durable and independent',g3SupportCopy.eligibleSnapshot.obligations[0]==='payroll'&&recordIsJsonSafe(g3SupportCopy));

const g3BadFinite=plainRecord(g3ActiveRecord); g3BadFinite.escrow.spent=Infinity;
g3Check('pure validators reject non-finite persistence',reorganizationRecordErrors(g3BadFinite).some(e=>e==='escrow')&&reorganizationRecordErrors(g3BadFinite).some(e=>e==='json-safe'));
const g3BadMission=plainRecord(g3ActiveRecord); g3BadMission.mission.missionId='crewed_orbit'; g3BadMission.mission.crew=1;
g3Check('pure validators reject a noncanonical or crewed recovery mission',reorganizationRecordErrors(g3BadMission).includes('mission contract'));
const g3BadIdentity=g3ActiveState(); g3BadIdentity.insolvency.reorganizationId='different-attempt';
g3Check('state audit rejects cross-owner identity drift',auditReorganizationState(g3BadIdentity).includes('reorganization/insolvency identity'));
const g3BadSpec=g3ActiveState(); g3BadSpec.reorganization.mission.spec.stages[0].eng='forged';
g3Check('state audit recomputes and rejects a forged recovery-spec fingerprint',
  auditReorganizationState(g3BadSpec).some(e=>/mission spec fingerprint/.test(e)));
const g3MissingLaunch=g3ActiveState(); g3MissingLaunch.reorganization=g3Attempt(1,'launching');
g3MissingLaunch.insolvency.reorganizationId=g3MissingLaunch.reorganization.id;
g3Check('state audit rejects a launching attempt without its exact sponsored Gate 2 owner',
  auditReorganizationState(g3MissingLaunch).includes('reorganization/sponsored launch owner'));
const g3MissingReady=g3ActiveState(); g3MissingReady.reorganization=g3Attempt(1,'ready');
g3MissingReady.insolvency.reorganizationId=g3MissingReady.reorganization.id;
g3Check('state audit rejects a ready phase without its exact hangar order and hull',
  auditReorganizationState(g3MissingReady).includes('reorganization/ready owner'));
const g3BadEscrow=plainRecord(g3Supported.operatingSupport); g3BadEscrow.paid=2; g3BadEscrow.remaining=2;
g3Check('support cannot exceed its frozen three-month cap',operatingSupportRecordErrors(g3BadEscrow).includes('support cap'));
const g3CoherentRewrite=plainRecord(g3Supported.operatingSupport);
g3CoherentRewrite.paid=0; g3CoherentRewrite.remaining=g3CoherentRewrite.authorized;
g3CoherentRewrite.receipts['period:1']={fromAbs:g3CoherentRewrite.startAbs+1,throughAbs:g3CoherentRewrite.startAbs+10,days:10,eligibleBurn:0,paid:0};
g3Check('support ledger fingerprint rejects a coherent rewrite of paid authority and receipts',
  operatingSupportRecordErrors(g3CoherentRewrite).includes('support ledger fingerprint'));
const g3Overlap=createFreshState('engineer'),g3OldAttempt=g3Attempt(1,'succeeded'),g3NewAttempt=g3Attempt(2,'standdown');
g3NewAttempt.insolvencyId='insolvency-2';
g3Overlap.loanInterest=g3NewAttempt.debt.interestAfter; g3Overlap.debtRenegotiated=true; g3Overlap.legacyPenalty=30;
g3Overlap.insolvencySeq=2;
g3Overlap.insolvency=makeInsolvencyRecord({id:'insolvency-2',sequence:2,revision:1,status:'reorganization',atAbs:119,cash:-1,reorganizationId:g3NewAttempt.id,receipts:{}});
g3Overlap.lastInsolvency=makeInsolvencyRecord({id:'insolvency-1',sequence:1,revision:2,status:'resolved',atAbs:100,cash:-1,reorganizationId:g3OldAttempt.id,resolvedBy:'reorganization-success',resolvedAbs:g3OldAttempt.closedAbs,receipts:{}});
g3Overlap.reorganizationSeq=2; g3Overlap.reorganizationAttempts=2; g3Overlap.reorganizationSuccesses=1;
g3Overlap.reorganization=g3NewAttempt; g3Overlap.lastReorganization=g3OldAttempt;
g3Overlap.operatingSupport=makeOperatingSupportRecord({id:'support-old',reorganizationId:g3OldAttempt.id,startAbs:g3OldAttempt.closedAbs,endAbs:g3OldAttempt.closedAbs+90,monthsLeft:3,monthlyCap:1,authorized:3,remaining:3,paid:0,eligibleSnapshot:{},receipts:{opened:{atAbs:g3OldAttempt.closedAbs}}});
g3Overlap.operatingSupport.ledgerFingerprint=operatingSupportLedgerFingerprint(g3Overlap.operatingSupport);
g3SetStateAbs(g3Overlap,g3OldAttempt.closedAbs);
const g3OverlapErrors=auditReorganizationState(g3Overlap);
g3Check('active operating support cannot overlap a new reorganization',g3OverlapErrors.length===1&&g3OverlapErrors[0]==='operating support overlaps reorganization');
const g3ShiftedSupport=g3SupportedState(); g3ShiftedSupport.operatingSupport.startAbs+=300; g3ShiftedSupport.operatingSupport.endAbs+=300;
g3Check('state audit binds live support to the exact successful settlement date',
  auditReorganizationState(g3ShiftedSupport).includes('operating support/reorganization window'));
const g3PaidSupport=g3SupportedState(),g3PaidStart=g3PaidSupport.operatingSupport.startAbs;
g3SetStateAbs(g3PaidSupport,g3PaidStart+10);
Object.assign(g3PaidSupport.operatingSupport,{paid:.4,remaining:3.2,receipts:{opened:{atAbs:g3PaidStart},
  'period:1':{fromAbs:g3PaidStart+1,throughAbs:g3PaidStart+10,days:10,eligibleBurn:.4,paid:.4}}});
g3PaidSupport.operatingSupport.ledgerFingerprint=operatingSupportLedgerFingerprint(g3PaidSupport.operatingSupport);
g3Check('ten-day support ledger with exact receipt sums audits cleanly',auditReorganizationState(g3PaidSupport).length===0);
g3PaidSupport.operatingSupport.paid=0; g3PaidSupport.operatingSupport.remaining=3.6; delete g3PaidSupport.operatingSupport.receipts['period:1'];
g3PaidSupport.operatingSupport.ledgerFingerprint=operatingSupportLedgerFingerprint(g3PaidSupport.operatingSupport);
g3Check('state audit rejects restored authority with deleted paid-day receipts',
  auditReorganizationState(g3PaidSupport).some(e=>/support paid receipts|support elapsed ledger/.test(e)));

const g3Legacy=createFreshState('engineer');
g3Legacy.campaignRules=makeCampaignRules({ironman:true}); g3Legacy.debtRenegotiated=true; g3Legacy.legacyPenalty=90;
g3Legacy.insolvencySeq=4; g3Legacy.insolvency=makeInsolvencyRecord({id:'forged-old',sequence:4,atAbs:0,cash:-1});
g3Legacy.reorganizationSeq=9; g3Legacy.reorganizationAttempts=9; g3Legacy.reorganization=g3Attempt(9,'standdown'); g3Legacy.operatingSupport=g3Supported.operatingSupport;
applyLoadedSave({v:62,ts:1,state:g3Legacy});
g3Check('v62 migration is always Standard with no fabricated active continuity',
  !state.campaignRules.ironman&&!state.debtRenegotiated&&state.legacyPenalty===0&&state.insolvencySeq===0&&state.insolvency===null&&
  state.reorganizationSeq===0&&state.reorganizationAttempts===0&&state.reorganization===null&&state.lastReorganization===null&&state.operatingSupport===null);

const g3RoundTrip=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:2,state:g3ActiveState()}));
applyLoadedSave(g3RoundTrip);
g3Check('v63 active attempt round-trips without identity or amount drift',
  state.reorganization.id==='reorganization-1'&&state.insolvency.reorganizationId===state.reorganization.id&&state.reorganization.debt.interestAfter===.19&&auditReorganizationState(state).length===0);
const g3SupportRoundTrip=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:3,state:g3SupportedState()}));
applyLoadedSave(g3SupportRoundTrip);
g3Check('v63 support record round-trips with bounded authority',
  state.operatingSupport.id==='support-1'&&state.operatingSupport.remaining===3.6&&state.operatingSupport.closedReason===null&&auditReorganizationState(state).length===0);

const g3LiveBefore=state,g3Malformed=g3ActiveState(); g3Malformed.reorganization.penalties.repBefore=Infinity;
let g3MalformedRejected=false;
try{ applyLoadedSave({v:SAVE_VERSION,ts:4,state:g3Malformed}); }catch(e){ g3MalformedRejected=/reorganization state is inconsistent/.test(e.message); }
g3Check('malformed v63 is rejected before replacing live state',g3MalformedRejected&&state===g3LiveBefore);
const g3Partial=createFreshState('engineer'); delete g3Partial.reorganizationAttempts;
let g3PartialRejected=false;
try{ applyLoadedSave({v:SAVE_VERSION,ts:5,state:g3Partial}); }catch(e){ g3PartialRejected=/reorganization state is inconsistent/.test(e.message); }
g3Check('partially missing v63 continuity fields are rejected',g3PartialRejected&&state===g3LiveBefore);
const g3MissingAll=createFreshState('engineer');
for(const key of ['campaignRules','debtRenegotiated','legacyPenalty','insolvencySeq','insolvency','lastInsolvency','reorganizationSeq','reorganizationAttempts','reorganizationSuccesses','reorganization','lastReorganization','operatingSupport']) delete g3MissingAll[key];
let g3MissingAllRejected=false;
try{ applyLoadedSave({v:SAVE_VERSION,ts:6,state:g3MissingAll}); }catch(e){ g3MissingAllRejected=/missing campaignRules/.test(e.message); }
g3Check('v63 cannot masquerade as legacy by deleting every continuity key',g3MissingAllRejected&&state===g3LiveBefore);

console.log(`${g3Pass}/${g3Pass+g3Fail} checks passed`);
process.exitCode=g3Fail?1:0;
