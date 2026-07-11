// E1.2 slice A — widened live-call/reserve-call decision frequency on routine reflights.
// liveCallFlag/deepCallFlag now take a `routine` flag and use a wider amber band (0.97 vs 0.94)
// on a reflight, and beginResolve/postResolve no longer exclude uncrewed routine flights outright.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// kind:'success' so an unflagged ctx safely falls through finalizeLaunch's success path in the
// beginResolve integration checks below — only the gating decision is under test here, not the outcome.
function fakeOutcome(subRel, phase){
  return { kind:'success', subsystem:null, story:'', failPhase:null, rel:0.7,
    phases:[{phase, label:'x', rel:subRel, p:1-subRel, subsystems:[{key:'propulsion', rel:subRel, severity:'loss'}]}] };
}
function fakeDeepOutcome(subRel){
  return { kind:'success', subsystem:null, story:'', failPhase:null, rel:0.7,
    phases:[{phase:'deep', label:'x', rel:subRel, p:1-subRel, subsystems:[{key:'deep_propulsion', rel:subRel, severity:'loss'}]}] };
}

newGame('engineer');

// ---------- 1. liveCallFlag: same subsystem rel, different verdict by routine ----------
check('liveCallFlag: 95% subsystem — safe on a first flight (below 0.94? no, above — null)', liveCallFlag(fakeOutcome(0.95,'ascent'), false)===null);
check('liveCallFlag: same 95% subsystem — flagged on a routine reflight (widened to 0.97)', liveCallFlag(fakeOutcome(0.95,'ascent'), true)!==null);
check('liveCallFlag: 93% subsystem — flagged either way (below both thresholds)', liveCallFlag(fakeOutcome(0.93,'ascent'), false)!==null && liveCallFlag(fakeOutcome(0.93,'ascent'), true)!==null);
check('liveCallFlag: 98% subsystem — safe either way (above both thresholds)', liveCallFlag(fakeOutcome(0.98,'ascent'), false)===null && liveCallFlag(fakeOutcome(0.98,'ascent'), true)===null);
check('liveCallFlag: undefined routine behaves like non-routine (backward-compatible default)', liveCallFlag(fakeOutcome(0.95,'ascent'))===null);

// ---------- 2. deepCallFlag: same widening, gated on reserve margin ----------
const simWithReserve={legs:[{by:'transfer', dv:1000, cap:1150}]}; // (1150-1000)/1000=0.15 ≥ RESERVE_MARGIN_MIN
check('deepCallFlag: 95% deep subsystem, has reserve — safe on first flight', deepCallFlag(fakeDeepOutcome(0.95), simWithReserve, false)===null);
check('deepCallFlag: same case — flagged on a routine reflight', deepCallFlag(fakeDeepOutcome(0.95), simWithReserve, true)!==null);
const simNoReserve={legs:[{by:'transfer', dv:1000, cap:1020}]}; // 0.02 < RESERVE_MARGIN_MIN — no reserve to burn
check('deepCallFlag: no reserve margin — null regardless of routine', deepCallFlag(fakeDeepOutcome(0.90), simNoReserve, true)===null);

// ---------- 3. beginResolve: an uncrewed ROUTINE flight is now eligible (previously the only excluded case) ----------
function fullCtx(m, routine, outcome){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine, crewed:false, outcome,
    rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
}
newGame('engineer');
_pendingLive=null;
const ctx=fullCtx(MISSIONS.find(x=>x.id==='reach_space'), true, fakeOutcome(0.95,'ascent'));
beginResolve(ctx);
check('beginResolve: uncrewed+routine now reaches liveCallFlag and queues a live call', _pendingLive!==null);
_pendingLive=null; hideModal();

// ---------- 4. beginResolve: a non-routine (first) flight with the SAME 95% subsystem does NOT queue (below the tighter first-flight threshold) ----------
newGame('engineer');
_pendingLive=null;
const ctx2=fullCtx(MISSIONS.find(x=>x.id==='reach_space'), false, fakeOutcome(0.95,'ascent'));
beginResolve(ctx2);
check('beginResolve: uncrewed+first-flight with a 95% subsystem stays safe (unchanged prior behavior)', _pendingLive===null);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
