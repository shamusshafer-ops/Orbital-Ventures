// E1.4 — astronaut roster view (renderPersonnel's "🚀 Astronaut Roster" section).
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

// ---------- 1. No roster before anyone has flown ----------
newGame('engineer');
renderPersonnel();
check('no roster before any flight', !htmlOf('personnelCard').includes('Astronaut Roster'));

// ---------- 2. Roster appears after a flight; shows name, trait, flight count, "Active" status ----------
hirePersonnel('a01');
const m1=MISSIONS.find(x=>x.id==='first_astro');
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
renderPersonnel();
let html=htmlOf('personnelCard');
check('roster appears after a flight', html.includes('Astronaut Roster'));
check('roster shows the astronaut name', html.includes('Jack Morrow'));
check('roster shows trait name', html.includes(esc(traitOf('a01').name)));
check('roster shows flight count', html.includes('1 flight flown'));
check('roster shows Active status', html.includes('Active'));

// ---------- 3. A second flight bumps the count; a lost astronaut shows "Lost" not "Active" ----------
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'loss', rel:0.3, story:'x', subsystem:'propulsion', failPhase:'ascent'}), null);
renderPersonnel();
html=htmlOf('personnelCard');
check('roster shows updated flight count (2 flights)', html.includes('2 flights flown'));
check('roster shows Lost status for a dead astronaut', html.includes('🕊 Lost'));
check('roster no longer shows Active for that astronaut', !html.includes('>Active<'));

// ---------- 4. Roster sorts most-flown first ----------
hirePersonnel('a04');
finalizeLaunch(crewedCtx(m1, 'a04', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
finalizeLaunch(crewedCtx(m1, 'a04', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
finalizeLaunch(crewedCtx(m1, 'a04', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
renderPersonnel();
html=htmlOf('personnelCard');
const posA04=html.indexOf('Mei-Lin Fong'), posA01=html.indexOf('Jack Morrow');
check('most-flown astronaut (3 flights) sorts before fewer-flown (2 flights)', posA04>=0 && posA01>=0 && posA04<posA01);

// ---------- 5. XSS regression: outcome labels don't reintroduce raw markup (mission name escaped) ----------
newGame('engineer');
hirePersonnel('a01');
blueprints(); // no-op, just touching state
finalizeLaunch(crewedCtx({...m1, name:'<img src=x onerror=window.__pwnRoster=1>'}, 'a01', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
renderPersonnel();
html=htmlOf('personnelCard');
check('roster escapes a malicious mission name', !html.includes('<img src=x onerror') && html.includes('&lt;img src=x onerror'));
check('no injected payload executed', !window.__pwnRoster);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
