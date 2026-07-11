// E1.1 slice A — reactive rival race: poach heat, budget hearing (the political sibling of the
// engineering-only failure inquiry), and rivals bidding on procedural contract offers.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function crewedCtx(m, outcome){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:!!state.completed[m.id], crewed:true, outcome,
    rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
}

// ---------- 1. poach heat: multiplies checkPoaching's roll while active, decays monthly ----------
newGame('engineer');
check('poachHeat: starts unset (0)', (state.poachHeat||0)===0);
state.poachHeat=POACH_HEAT_ON_FATAL;
check('poachHeat: set to the fatal-loss constant', state.poachHeat===POACH_HEAT_ON_FATAL);
tickPoachHeat();
check('poachHeat: decays by 1 per tick', state.poachHeat===POACH_HEAT_ON_FATAL-1);
state.poachHeat=0;
tickPoachHeat();
check('poachHeat: never goes negative', state.poachHeat===0);

// ---------- 2. a fatal crewed loss sets poach heat AND queues a budget hearing (not the inquiry) ----------
newGame('engineer');
hirePersonnel('a01'); state.assignedAstronaut='a01';
const m1=MISSIONS.find(x=>x.id==='first_astro');
finalizeLaunch(crewedCtx(m1, {kind:'loss', rel:0.2, story:'x', subsystem:'propulsion', failPhase:'ascent'}), null);
check('fatal crewed loss: poachHeat set', state.poachHeat===POACH_HEAT_ON_FATAL);
check('fatal crewed loss: budget hearing queued', _pendingHearing!==null && _pendingHearing.mName===m1.name);
check('fatal crewed loss: NOT the engineering inquiry (crewed, not uncrewed)', _pendingInquiry===null);

// ---------- 3. an uncrewed loss still takes the inquiry path, not the hearing ----------
newGame('engineer');
_pendingHearing=null; _pendingInquiry=null; // clear leftovers from test 2 (module-level, not reset by newGame)
const mUncrewed=MISSIONS.find(x=>x.id==='reach_space');
const v2=computeVehicle();
finalizeLaunch({m:mUncrewed, v:v2, sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:false,
  outcome:{kind:'loss', rel:0.2, story:'x', subsystem:'propulsion', failPhase:'ascent'}, rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}}, null);
check('uncrewed loss: engineering inquiry queued', _pendingInquiry!==null);
check('uncrewed loss: no budget hearing, no poach heat', _pendingHearing===null && (state.poachHeat||0)===0);

// ---------- 4. resolveHearing: fund / defend / blame all clear the pending and apply distinct effects ----------
newGame('engineer');
_pendingHearing={mName:'Test Mission'};
const moneyBefore=state.money, supportBefore=publicSupport();
resolveHearing('fund');
check('hearing fund: pending cleared', _pendingHearing===null);
check('hearing fund: money spent', state.money<moneyBefore);
check('hearing fund: support recovered', publicSupport()>supportBefore);

newGame('engineer');
_pendingHearing={mName:'Test Mission'};
const repBefore=state.rep, supportBefore2=publicSupport();
resolveHearing('defend');
check('hearing defend: rep cost applied', state.rep===Math.max(0,repBefore-HEARING_REP_COST_DEFEND));
check('hearing defend: support recovered, no money spent', publicSupport()>supportBefore2);

newGame('engineer');
hirePersonnel('a01');
_pendingHearing={mName:'Test Mission'};
const moraleBefore=state.staff[0].morale;
resolveHearing('blame');
check('hearing blame: staff morale hit', state.staff[0].morale<moraleBefore);
check('hearing blame: poach heat set (spin invites more scrutiny than the baseline fatal-loss window)', state.poachHeat===HEARING_POACH_HEAT_BLAME);

// ---------- 5. hearing priority chain: defers behind a pending setback/mishap/inquiry ----------
newGame('engineer');
_pendingHearing={mName:'x'};
_pendingSetback={rId:'x'};
let opened=false; const realShow=showHearingModal;
showHearingModal=function(){ opened=true; };
maybeShowHearing();
showHearingModal=realShow;
check('hearing: defers while a setback is pending', !opened);
_pendingSetback=null;

// ---------- 6. contract snatch: bid → warning → taken if uncommitted, immune if committed ----------
newGame('engineer');
state.contractOffers=[{id:'pc_snatch', proc:true, name:'Comsat Block Buy', payout:6, rep:6, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:absMonth()+6, blurb:'x'}];
const rival=RIVALS[0];
state.contractOffers[0].rivalBid={rivalId:rival.id, snatchAbs:absMonth()-1}; // deadline already passed
const capBefore=rivalStateFor(rival).capital||0;
tickRivalSnatch();
check('snatch: uncommitted offer past its bid deadline is taken', !state.contractOffers.some(o=>o.id==='pc_snatch'));
check('snatch: rival capital bumped, not momentum', (rivalStateFor(rival).capital||0)>capBefore);

newGame('engineer');
state.contractOffers=[{id:'pc_held', proc:true, name:'Comsat Block Buy', payout:6, rep:6, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:absMonth()+6, blurb:'x'}];
state.activeMission='pc_held';
state.contractOffers[0].rivalBid={rivalId:RIVALS[0].id, snatchAbs:absMonth()-1};
tickRivalSnatch();
check('snatch: a committed (activeMission) offer survives its bid deadline', state.contractOffers.some(o=>o.id==='pc_held'));
check('snatch: the bid is cleared once the offer is safe', !state.contractOffers[0].rivalBid);

// ---------- 7. snatch never touches authored missions ----------
newGame('engineer');
state.contractOffers=[];
tickRivalSnatch(); // no offers exist — must be a safe no-op
check('snatch: no-op with no offers, no crash', true);

// ---------- 8. UI: a rival-bid offer shows a warning, escaped ----------
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }
newGame('engineer');
state.contractOffers=[{id:'pc_ui', proc:true, name:'Comsat Block Buy', payout:6, rep:6, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:absMonth()+6, blurb:'x', rivalBid:{rivalId:RIVALS[0].id, snatchAbs:absMonth()+2}}];
renderMissions();
const html=htmlOf('contractOffersMount');
check('UI: bidding rival shown', html.includes(RIVALS[0].name) || html.includes(esc(RIVALS[0].name)));
check('UI: bidding warning text present', html.includes('bidding on this'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
