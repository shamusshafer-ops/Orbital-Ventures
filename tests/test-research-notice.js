// R&D completion pop-up (additive small modal): completeResearch queues a notice; stepTime surfaces
// ONE compact modal (not the newspaper view); a batch collapses to a single modal; it defers rather
// than stacking on a pending decision or an open modal.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');
let captured='', lastView='__init';
const _origShowModal=showModal;
showModal=(html,view)=>{ captured=html; lastView=view; };

// empty queue → nothing shown
_pendingResearchDone.length=0; captured=''; lastView='__init';
maybeShowResearchNotice();
check('no modal when nothing has completed', captured==='');

// completeResearch keeps its log AND queues a notice
const r0=RESEARCH[0];
let logged=false; const _origLog=log; log=(...a)=>{ if(String(a[1]||'').indexOf('R&D complete')>=0) logged=true; return _origLog.apply(null,a); };
state.activeResearch={id:r0.id, monthsLeft:0};
completeResearch();
log=_origLog;
check('completeResearch still writes the ops-log line (unchanged)', logged);
check('completeResearch queues a research notice', _pendingResearchDone.length>=1);
check('completeResearch does NOT pop immediately (queued, not shown)', captured==='');

// surfacing a single completion → compact modal reusing the node name + desc copy
captured=''; lastView='__init';
maybeShowResearchNotice();
check('single notice shows a modal', captured.indexOf('R&amp;D Complete')>=0);
check('single notice reuses the node name verbatim', captured.indexOf(r0.name)>=0);
check('single notice reuses the node desc copy verbatim', captured.indexOf(r0.desc)>=0);
check('notice uses the compact modal, NOT the newspaper view', lastView!=='newspaper' && !lastView);
check('queue is cleared after showing', _pendingResearchDone.length===0);

// multiple completions collapse to ONE modal listing them all
_pendingResearchDone.length=0;
queueResearchNotice(RESEARCH[0].id); queueResearchNotice(RESEARCH[1].id); queueResearchNotice(RESEARCH[2].id);
captured=''; maybeShowResearchNotice();
check('batch completion shows a single modal', captured.indexOf('technologies completed')>=0);
check('batch modal lists every completed node', captured.indexOf(RESEARCH[0].name)>=0 && captured.indexOf(RESEARCH[1].name)>=0 && captured.indexOf(RESEARCH[2].name)>=0);
check('batch queue cleared after showing', _pendingResearchDone.length===0);

// collision: a pending decision modal takes priority — notice defers, stays queued
_pendingResearchDone.length=0; queueResearchNotice(RESEARCH[0].id);
_pendingSetback={rId:'x'}; captured='__unchanged';
maybeShowResearchNotice();
check('defers while a decision (setback) is pending', captured==='__unchanged');
check('notice remains queued when deferred', _pendingResearchDone.length===1);
_pendingSetback=null;

showModal=_origShowModal;
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
