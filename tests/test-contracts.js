// E1.3 — procedural filler contracts (state.contractOffers, CONTRACT_ARCHETYPES, tickContractOffers,
// missionById, and the finalizeLaunch proc gate that keeps them out of firsts/milestone tracking).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function crewedCtx(m, outcome, crewed, crewId){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:!!state.completed[m.id], crewed:!!crewed, outcome,
    rehearsed:false, famId:null, crewId:crewId||null, ab:{rel:0,payoutMult:1}};
}

// ---------- 1. missionById resolves authored, procedural, and unknown ----------
newGame('engineer');
check('missionById: authored mission resolves', missionById('first_flight')===MISSIONS.find(x=>x.id==='first_flight'));
check('missionById: unknown id is undefined', missionById('nope')===undefined);
state.contractOffers=[{id:'pc_1', proc:true, name:'Test Offer', payout:1, rep:1, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:99, blurb:'x'}];
check('missionById: procedural offer resolves', missionById('pc_1')===state.contractOffers[0]);

// ---------- 2. archetype gating ----------
newGame('engineer');
const comsat=CONTRACT_ARCHETYPES.find(a=>a.kind==='comsat');
check('comsat: not eligible with no LEO flights', !comsat.req(state));
state.leoFlights=3;
check('comsat: eligible at leoFlights>=3', comsat.req(state));
const rot=CONTRACT_ARCHETYPES.find(a=>a.kind==='crew_rotation');
check('crew_rotation: not eligible without crew_capsule research', !rot.req(state));
state.research.crew_capsule=true; state.crewFlown=1;
check('crew_rotation: eligible with research + crewFlown', rot.req(state));
const sampleRet=CONTRACT_ARCHETYPES.find(a=>a.kind==='sample_return');
check('sample_return: not eligible without deep_space research', !sampleRet.req(state));
state.research.deep_space=true;
check('sample_return: not eligible without a deep flight yet', !sampleRet.req(state));
state.deepFlights=1;
check('sample_return: eligible with research + deepFlights', sampleRet.req(state));
check('sample_return: archetype never sets sciYield (farm guard)', sampleRet.build(2).sciYield===undefined);
check('sample_return: short cruise, resolves synchronously (under DEFER_CRUISE_DAYS)', sampleRet.build(2).days<DEFER_CRUISE_DAYS);

// ---------- 3. tickContractOffers generates a gated, capped, expiring offer ----------
newGame('engineer');
state.leoFlights=5; state.year=1965; // Early Orbital era, so comsat (minEra 1) is in range
const realRandom=Math.random;
Math.random=()=>0; // forces the arrival roll to pass and picks the first eligible archetype deterministically
tickContractOffers();
Math.random=realRandom;
check('tick: generated exactly one offer', (state.contractOffers||[]).length===1);
const off=state.contractOffers[0];
check('tick: offer is marked proc', off.proc===true);
check('tick: offer has an expiry in the future', off.expiresAbs>absMonth());
check('tick: offer priced below a comparable authored mission (first_sat payout 18)', off.payout<18);

// ---------- 4. cap enforcement ----------
Math.random=()=>0;
for(let i=0;i<5;i++) tickContractOffers();
Math.random=realRandom;
check('tick: offer count never exceeds the era cap', state.contractOffers.length<=contractOfferCap());

// ---------- 3b. cap widens to 3 from the Commercial era onward ----------
check('cap: 2 before Commercial era', contractOfferCap()===2);
state.year=2005; // Commercial era (index 4)
check('cap: 3 from Commercial era onward', contractOfferCap()===3);

// ---------- 5. expiry removes an unreferenced offer; referenced offers survive ----------
newGame('engineer');
state.contractOffers=[
  {id:'pc_old', proc:true, name:'Stale Offer', payout:1, rep:1, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:-1, blurb:'x'},
  {id:'pc_held', proc:true, name:'Held Offer', payout:1, rep:1, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:-1, blurb:'x'},
];
state.activeMission='pc_held';
tickContractOffers();
check('expiry: unreferenced expired offer removed', !state.contractOffers.some(o=>o.id==='pc_old'));
check('expiry: activeMission-referenced offer survives past its own deadline', state.contractOffers.some(o=>o.id==='pc_held'));

// ---------- 6. finalizeLaunch: a successful procedural flight does NOT touch firsts/milestone state ----------
newGame('engineer');
const moneyBefore=state.money;
const offer={id:'pc_fly', proc:true, name:'Comsat Block Buy', reqDv:9400, payload:0.3, crew:0, days:0, payout:6, rep:6, minRep:0, expiresAbs:absMonth()+6, blurb:'x'};
state.contractOffers=[offer];
finalizeLaunch(crewedCtx(offer, {kind:'success', rel:0.9, story:'', failPhase:null}, false), null);
check('proc success: state.completed NOT set for the offer id', !state.completed['pc_fly']);
check('proc success: state.firstDates NOT set', !(state.firstDates && state.firstDates['pc_fly']));
check('proc success: state.history NOT set', !(state.history && state.history['pc_fly']));
check('proc success: full payout applied (money rose by ~the offer payout, not the 0.4x routine cut)', state.money>=moneyBefore+offer.payout*0.9);
check('proc success: rep increased by the offer\'s rep', state.rep===6);
check('proc success: offer consumed (removed from contractOffers)', !state.contractOffers.some(o=>o.id==='pc_fly'));

// ---------- 7. an authored mission flown right after still takes the normal first-flight path ----------
const m2=MISSIONS.find(x=>x.id==='sounding');
finalizeLaunch(crewedCtx(m2, {kind:'success', rel:0.9, story:'', failPhase:null}, false), null);
check('authored mission: state.completed still set normally', !!state.completed['sounding']);

// ---------- 7b. defensive: even a proc offer that WOULD carry sciYield never banks it (farm guard) ----------
newGame('engineer');
const sciBefore=state.science||0;
const riggedOffer={id:'pc_sci', proc:true, name:'Rigged', reqDv:9400, payload:0, crew:0, days:0, payout:1, rep:1, minRep:0, sciYield:9999, expiresAbs:absMonth()+6, blurb:'x'};
state.contractOffers=[riggedOffer];
finalizeLaunch(crewedCtx(riggedOffer, {kind:'success', rel:0.9, story:'', failPhase:null}, false), null);
check('proc + sciYield: the prestige science bonus is never banked for a proc flight', (state.science||0)-sciBefore<100);

// ---------- 8. setStandingProduction refuses a procedural mission ----------
newGame('engineer');
state.contractOffers=[{id:'pc_std', proc:true, name:'Comsat Block Buy', reqDv:9400, payload:0.3, crew:0, days:0, payout:6, rep:6, minRep:0, expiresAbs:absMonth()+6, blurb:'x'}];
state.activeMission='pc_std';
state.juggernautReached=true; // isJuggernaut() gate
setStandingProduction();
check('standing production: refuses a procedural offer', state.standingProd===null);

// ---------- 9. UI: renderContractOffers escapes a malicious offer name/blurb ----------
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }
newGame('engineer');
state.contractOffers=[{id:'pc_xss', proc:true, name:'<img src=x onerror=window.__pwnContract=1>', payout:6, rep:6, minRep:0, reqDv:9400, payload:0, crew:0, days:0, expiresAbs:absMonth()+6, blurb:'<b>evil</b>'}];
renderMissions();
const html=htmlOf('contractOffersMount');
check('renderContractOffers: name escaped', !html.includes('<img src=x onerror') && html.includes('&lt;img src=x onerror'));
check('renderContractOffers: blurb escaped', !html.includes('<b>evil</b>') && html.includes('&lt;b&gt;evil&lt;/b&gt;'));
check('no injected payload executed', !window.__pwnContract);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
