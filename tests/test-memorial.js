// E1.4 — memorial wall (state.memorial). Drives finalizeLaunch directly, same pattern as test-astronaut-log.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

function crewedCtx(m, crewId, outcome){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:true, outcome,
    rehearsed:false, famId:null, crewId, ab:{rel:0,payoutMult:1}};
}

// ---------- 1. A survivable outcome (abort) does NOT add a memorial entry ----------
newGame('engineer');
hirePersonnel('a01');
const m1=MISSIONS.find(x=>x.id==='first_astro');
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'abort', rel:0.3, story:'x', subsystem:'propulsion', failPhase:'ascent'}), null);
check('abort: no memorial entry', memorialRoll().length===0);
check('abort: astronaut still on staff', state.staff.some(s=>s.id==='a01'));

// ---------- 2. Fatal outcome (loss, the catch-all branch) adds a memorial entry ----------
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'loss', rel:0.3, story:'The tank ruptured on ascent.', subsystem:'propulsion', failPhase:'ascent'}), null);
check('loss: one memorial entry', memorialRoll().length===1);
check('loss: entry has id/name/mission/story', memorialRoll()[0].id==='a01' && memorialRoll()[0].name==='Jack Morrow' && memorialRoll()[0].mission===m1.name && memorialRoll()[0].story==='The tank ruptured on ascent.');
check('loss: astronaut removed from staff', !state.staff.some(s=>s.id==='a01'));

// ---------- 3. Strand (LOST IN DEEP SPACE) also adds a memorial entry ----------
newGame('engineer');
hirePersonnel('a02');
finalizeLaunch(crewedCtx(m1, 'a02', {kind:'strand', rel:0.3, story:'Life support failed en route.', subsystem:'life_support', failPhase:null}), {rescueResolved:true});
check('strand: one memorial entry', memorialRoll().length===1);
check('strand: correct astronaut', memorialRoll()[0].id==='a02' && memorialRoll()[0].name==='Valentina Sorokina');

// ---------- 4. Rescue does NOT add a memorial entry (crew comes home) ----------
newGame('engineer');
hirePersonnel('a03');
finalizeLaunch(crewedCtx(m1, 'a03', {kind:'rescued', rel:0.3, story:'y', failPhase:null}), null);
check('rescued: no memorial entry', memorialRoll().length===0);
check('rescued: astronaut still on staff', state.staff.some(s=>s.id==='a03'));

// ---------- 5. Memorial Wall renders in the Personnel tab, escaped, only when non-empty ----------
newGame('engineer');
renderPersonnel();
check('no wall before any loss', !htmlOf('personnelCard').includes('Memorial Wall'));
hirePersonnel('a01');
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'loss', rel:0.3, story:'<b>evil</b> markup', subsystem:'propulsion', failPhase:'ascent'}), null);
renderPersonnel();
const html=htmlOf('personnelCard');
check('wall appears after a loss', html.includes('Memorial Wall'));
check('fallen astronaut name shown', html.includes('Jack Morrow'));
check('story markup escaped, not raw', !html.includes('<b>evil</b>') && html.includes('&lt;b&gt;evil&lt;/b&gt;'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
