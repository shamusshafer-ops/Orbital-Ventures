// E1.4 — per-astronaut flight log (state.astronautLog). Drives finalizeLaunch directly (see
// test-pad-a.js's pattern) so it sees the real hook, not a reimplementation.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function crewedCtx(m, crewId, outcome){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:true, outcome,
    rehearsed:false, famId:null, crewId, ab:{rel:0,payoutMult:1}};
}

// ---------- 1. A successful crewed flight logs one entry ----------
newGame('engineer');
hirePersonnel('a01');
const m1=MISSIONS.find(x=>x.id==='first_astro');
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
check('success: one entry logged', astronautFlights('a01').length===1);
check('success: entry has mission + outcome', astronautFlights('a01')[0].mission===m1.name && astronautFlights('a01')[0].outcome==='success');

// ---------- 2. A second flight appends, doesn't overwrite ----------
finalizeLaunch(crewedCtx(m1, 'a01', {kind:'partial', rel:0.5, story:'x', subsystem:'ascent', failPhase:null}), null);
check('second flight appends', astronautFlights('a01').length===2);
check('second entry outcome recorded', astronautFlights('a01')[1].outcome==='partial');

// ---------- 3. Uncrewed flights don't log anything ----------
newGame('engineer');
const mUncrewed=MISSIONS[0];
const v=computeVehicle();
finalizeLaunch({m:mUncrewed, v, sim:null, windowQuality:1, flightExpense:1, routine:false, crewed:false,
  outcome:{kind:'success', rel:0.9, story:'', failPhase:null}, rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}}, null);
check('uncrewed flight logs nothing', Object.keys(state.astronautLog||{}).length===0);

// ---------- 4. Log survives the astronaut's death (loseAssignedCrew removes them from state.staff) ----------
newGame('engineer');
hirePersonnel('a02');
finalizeLaunch(crewedCtx(m1, 'a02', {kind:'success', rel:0.9, story:'', failPhase:null}), null);
check('pre-death: one entry logged', astronautFlights('a02').length===1);
loseAssignedCrew('a02');
check('post-death: no longer in state.staff', !state.staff.some(s=>s.id==='a02'));
check('post-death: flight log still readable', astronautFlights('a02').length===1);

// ---------- 5. Unknown/never-flown astronaut returns an empty array, not a crash ----------
check('never-flown astronaut: empty array', astronautFlights('a03').length===0);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
