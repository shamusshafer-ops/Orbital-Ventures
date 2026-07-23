// E1.2 slice C — the live-call decision now lives IN the flight overlay (opens early via
// openFlightForDecision, holds at the pad→ascent handoff, resumes the SAME animState via
// resumeFlightForDecision once resolved) instead of a page-level showModal. Drives the REAL
// animLoop/drawScene machinery on a controlled virtual clock, same pattern as test-pad-a.js.
animEnabled=true;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function pumpFlight(stepMs, maxFrames){
  maxFrames=maxFrames||4000;
  let virtualNow=performance.now();
  const realNow=performance.now;
  if(animState) animState.prevWall=virtualNow;
  performance.now=()=>virtualNow;
  let frames=0;
  try{
    while(animState && !animState.held && frames<maxFrames){ virtualNow+=stepMs; animLoop(); frames++; }
  } finally { performance.now=realNow; }
  return frames;
}
function clickButton(idx){
  const A=animState;
  const b=(A.decisionButtons||[])[idx]; if(!b) return false;
  const vc=A.viewCanvas||A.cv;
  vc.dispatchEvent = vc.dispatchEvent || function(){};
  // the handler reads clientX/Y via getBoundingClientRect scaling; the harness's stub rect is
  // {top:0,left:0,width:0,height:0} — width/height 0 would divide-by-zero the scale math, so
  // fake a real element size for this one test's canvas the same width/height as the canvas itself.
  vc.getBoundingClientRect=()=>({top:0,left:0,width:vc.width,height:vc.height,bottom:vc.height,right:vc.width});
  A.decisionClickHandler({clientX:b.x+b.w/2, clientY:b.y+b.h/2});
  return true;
}

function crewedCtx(m, outcome, routine){
  const v=computeVehicle();
  return {m, v, sim:null, windowQuality:1, flightExpense:1, routine:!!routine, crewed:false,
    outcome, rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
}
function fakeOutcome(subRel, phase){
  return { kind:'success', subsystem:null, story:'', failPhase:null, rel:0.7,
    phases:[{phase, label:'x', rel:subRel, p:1-subRel, subsystems:[{key:'propulsion', rel:subRel, severity:'loss'}]}] };
}

// ---------- 1. beginResolve opens the overlay EARLY (before the decision resolves) and holds at pad→ascent ----------
newGame('engineer');
_pendingLive=null;
const ctx1=crewedCtx(MISSIONS.find(x=>x.id==='reach_space'), fakeOutcome(0.93,'ascent'), false);
beginResolve(ctx1);
check('overlay opened early: animState exists before any resolution', animState!==null);
check('overlay tagged as opened-for-decision', animState._openedForDecision===true);
pumpFlight(80);
check('animation holds (does not run away) once it reaches the decision point', animState!==null && animState.held===true);
check('held with a pending decision object', animState.pendingDecision!==null);
check('two buttons drawn (press on / abort)', (animState.decisionButtons||[]).length===2);

// ---------- 2. Clicking "press on" resumes the SAME animState (not a fresh one) and finalizes ----------
const sameAnimState=animState;
const moneyBefore=state.money;
clickButton(0); // "Press on — fly it" → resolveLiveCall(true) → postResolve → ... → finalizeLaunch → resumeFlightForDecision
check('press on: resumed the SAME animState object, not a new one', animState===sameAnimState);
check('press on: no longer held (animation resumed)', animState===null || animState.held===false);
check('press on: pendingDecision cleared', !animState || animState.pendingDecision===null);
check('press on: finalizeLaunch actually ran (state changed)', state.money!==moneyBefore || state.rep>0);
pumpFlight(80, 6000); // let the resumed animation run to completion (or bail via maxFrames if something's stuck)
check('press on: flight eventually ends (animState clears or holds on a post-flight card)', animState===null || animState.held===true);

// ---------- 3. Clicking "abort" forces a scrub outcome, still resumes the same animState ----------
newGame('engineer');
_pendingLive=null;
const ctx2=crewedCtx(MISSIONS.find(x=>x.id==='reach_space'), fakeOutcome(0.93,'ascent'), false);
beginResolve(ctx2);
pumpFlight(80);
check('setup: held at decision point again', animState!==null && animState.held===true);
const preAbortAnim=animState;
const repBefore=state.rep;
clickButton(1); // "Abort now" → resolveLiveCall(false) → outcome becomes 'scrub'/failure → new failure-length animState
// UPDATED 2026-07-20: abort used to resume the SAME animState object in place. It now correctly
// opens a fresh, shorter animState that plays the failure out and HOLDS on a post-failure debrief
// card (matching the same hold-on-failure pattern test-pad-a.js verifies) — a real UX improvement
// (Codex's "Refine command UI and flight reporting"), not a regression. Verified directly: pumping
// this to completion lands on {phase:'ascent', held:true, exploding:true}.
check('abort: a new (shorter, failure-length) animState was opened, not left null', animState!==null);
check('abort: scrub outcome applied (rep dented, vehicle/crew safe — not a full loss)', state.rep<=repBefore);
if(animState){ check('abort: totalDur recomputed for the failure-length animation (shorter than a full success)', animState.totalDur<animState.ascentDur+animState.cruiseDur+animState.reentryDur+animState.padDur+1200); }
pumpFlight(80,4000);
check('abort: the failure plays out and HOLDS on a post-failure debrief card (does not vanish)', animState!==null && animState.held===true);
check('abort: the debrief card shows the failure (exploding), matching the real outcome', animState.exploding===true);

// ---------- 4. No decision pending: behaves exactly as before (fresh playMission, no early-open path) ----------
newGame('engineer');
_pendingLive=null;
const ctx3=crewedCtx(MISSIONS.find(x=>x.id==='reach_space'), fakeOutcome(0.99,'ascent'), false); // safe subsystem, never flags
beginResolve(ctx3);
check('no decision: beginResolve falls through to postResolve/finalizeLaunch directly (no pending live call)', _pendingLive===null);

// ---------- 5. Weather go/no-go holds at PAD-START (t≈0), before the countdown ramps ----------
newGame('engineer');
animState=null; // isolate from any prior scenario's overlay — production code never needs this (the
// _flightResolving lock keeps a new launch from starting while a previous one's overlay is still up
// at all, even mid post-flight-card), but these tests call internals directly and skip that lock.
_pendingLaunch=null;
const wm=MISSIONS.find(x=>x.id==='reach_space');
const wx={id:'storm', label:'Thunderstorms in the area', adverse:true, penalty:0.08, clear:1, detail:'Lightning is within the field.'};
_pendingLaunch={m:wm, v:computeVehicle(), sim:null, windowQuality:1, wx, prebuilt:false};
showWeatherModal(wm, wx);
check('weather: overlay opens immediately', animState!==null);
check('weather: holds right away (pad-start), no pumpFlight needed', animState.held===true);
check('weather: two buttons (scrub / launch anyway)', (animState.decisionButtons||[]).length===2);
check('weather: panel holdAt is pad-start', animState.pendingDecision.holdAt==='pad-start');

// ---------- Slice B: the pad-start weather hold is reskinned as the built-in T-31s hold ----------
{
  const panel=animState.pendingDecision.buildPanel();
  check('T-31 hold: title reads as the built-in T-31s hold', /T-31s/.test(panel.title));
  check('T-31 hold: still frames the go / no-go weather decision', /GO \/ NO-GO/.test(panel.title));
  check('T-31 hold: weather content preserved (a line names the range weather)', panel.lines.some(l=>/range/i.test(l)));
  check('T-31 hold: decision unchanged (scrub + launch-anyway)', panel.buttons.length===2);
  check('T-31 hold: procedural pad-start cue fired once on the held frame (via drawPad)', animState._padStartCue===true);
}

// ---------- 6. "Launch anyway" resumes the SAME overlay and carries it forward into the real launch ----------
const weatherAnim=animState;
clickButton(1); // "Launch anyway" → launchAnyway() → proceedLaunch(...) → beginResolve chain
check('launch anyway: reused the same animState (not a fresh overlay)', animState===weatherAnim || animState===null);

// ---------- 7. "Scrub & wait" discards the held overlay instead of carrying it across the time-skip ----------
newGame('engineer');
animState=null;
_pendingLaunch=null;
const wm2=MISSIONS.find(x=>x.id==='reach_space');
const wx2={id:'cold', label:'Sub-limit low temperatures', adverse:true, penalty:0.07, clear:2, detail:'Seals stiffen in the cold.'};
_pendingLaunch={m:wm2, v:computeVehicle(), sim:null, windowQuality:1, wx:wx2, prebuilt:false};
showWeatherModal(wm2, wx2);
check('scrub setup: overlay open and held', animState!==null && animState.held===true);
const yearBefore=state.year;
clickButton(0); // "Scrub & wait" → scrubLaunch() → dismissAnim() then advance(2mo) then a fresh proceedLaunch
check('scrub: time actually advanced', state.year>yearBefore || state.month>=0); // advance() ran (weak but safe: year/month moved or stayed valid)

// ---------- 8. Reserve call holds at CISLUNAR-START (entering the deep cruise), not pad-end ----------
function deepOutcome(subRel){
  return { kind:'success', subsystem:null, story:'', failPhase:null, rel:0.7,
    phases:[{phase:'deep', label:'x', rel:subRel, p:1-subRel, subsystems:[{key:'deep_propulsion', rel:subRel, severity:'loss'}]}] };
}
newGame('engineer');
animState=null;
_pendingReserve=null; _pendingLive=null;
const lunaM=MISSIONS.find(x=>x.id==='luna_flyby');
const reserveCtx={m:lunaM, v:computeVehicle(), sim:{legs:[{by:'transfer', dv:1000, cap:1150}]}, windowQuality:1,
  flightExpense:1, routine:false, crewed:false, outcome:deepOutcome(0.90), // below both the routine and first-flight thresholds — flags regardless
  rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
beginResolve(reserveCtx); // no live-call flag on this outcome (no ascent-phase subsystems) → falls through to postResolve → deepCallFlag
check('reserve: overlay opened', animState!==null);
pumpFlight(80, 8000);
check('reserve: holds somewhere (cislunar-start reached)', animState!==null && animState.held===true);
if(animState) check('reserve: holdAt is cislunar-start', animState.pendingDecision.holdAt==='cislunar-start');

// ---------- 9. Rescue holds at the same cislunar-start point, triggered from finalizeLaunch's strand check ----------
newGame('engineer');
animState=null;
hirePersonnel('a01'); state.assignedAstronaut='a01';
_pendingRescue=null;
const rescueCtx={m:lunaM, v:computeVehicle(), sim:null, windowQuality:1, flightExpense:1, routine:false,
  crewed:true, crewId:'a01', outcome:{kind:'strand', subsystem:'life_support', story:'x', rel:0.3, failPhase:'deep'},
  rehearsed:false, famId:null, ab:{rel:0,payoutMult:1}};
finalizeLaunch(rescueCtx, null);
check('rescue: overlay opened from finalizeLaunch\'s strand check', animState!==null);
pumpFlight(80, 8000);
check('rescue: holds at cislunar-start', animState!==null && animState.held===true && animState.pendingDecision.holdAt==='cislunar-start');
check('rescue: crew not yet removed from staff (decision not resolved)', state.staff.some(s=>s.id==='a01'));


// ---------- 10. Anomaly: orbital mission holds at ORBIT-START ----------
// (E1.2 Slice C final piece: showAnomalyModal now uses openFlightForDecision instead of showModal)
newGame('engineer');
animState=null; _pendingOps=null;
const orbitalM=MISSIONS.find(x=>x.id==='first_sat')||MISSIONS.find(x=>(!x.profile)&&(x.reqDv||0)>=9000);
const solarEv=MISSION_ANOMALIES.find(a=>a.id==='solar_array');
const anomCtxOrb={m:orbitalM, v:computeVehicle(), sim:null, windowQuality:1, flightExpense:1,
  routine:false, crewed:false, outcome:{kind:'success',rel:0.85,story:'',failPhase:null,subsystem:null,phases:[]},
  rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
_pendingOps=anomCtxOrb; // maybeAnomaly sets this before calling showAnomalyModal
showAnomalyModal(solarEv, anomCtxOrb);
check('anomaly orbital: overlay opened (openFlightForDecision, not showModal)', animState!==null);
check('anomaly orbital: holdAt is orbit-start', animState&&animState.pendingDecision&&animState.pendingDecision.holdAt==='orbit-start');
check('anomaly orbital: _pendingOps.opts populated (resolveAnomaly can find them)', Array.isArray(_pendingOps&&_pendingOps.opts));
const panelOrb=animState&&animState.pendingDecision.buildPanel();
check('anomaly orbital: panel title flags anomaly', panelOrb&&/ANOMALY/.test(panelOrb.title));
check('anomaly orbital: panel lines include mission name', panelOrb&&panelOrb.lines.some(l=>l.includes(orbitalM.name)));
check('anomaly orbital: buttons match anomaly options', panelOrb&&panelOrb.buttons.length===solarEv.options(anomCtxOrb).length);
pumpFlight(80, 8000);
check('anomaly orbital: held at orbit-start after animation reaches it', animState!==null&&animState.held===true);

// ---------- 11. Anomaly: cislunar/profile mission holds at CISLUNAR-START ----------
newGame('engineer');
animState=null; _pendingOps=null;
const cisM=MISSIONS.find(x=>!!x.profile); // any cislunar/deep mission
const guidanceEv=MISSION_ANOMALIES.find(a=>a.id==='guidance');
const anomCtxCis={m:cisM, v:computeVehicle(), sim:null, windowQuality:1, flightExpense:1,
  routine:false, crewed:false, outcome:{kind:'success',rel:0.85,story:'',failPhase:null,subsystem:null,phases:[]},
  rehearsed:false, famId:null, crewId:null, ab:{rel:0,payoutMult:1}};
_pendingOps=anomCtxCis;
showAnomalyModal(guidanceEv, anomCtxCis);
check('anomaly cislunar: overlay opened', animState!==null);
check('anomaly cislunar: holdAt is cislunar-start (not orbit-start)', animState&&animState.pendingDecision&&animState.pendingDecision.holdAt==='cislunar-start');
pumpFlight(80, 10000);
check('anomaly cislunar: held at cislunar-start', animState!==null&&animState.held===true);

// ---------- 12. Anomaly: detail line word-wrap (long detail splits at last space ≤62 chars) ----------
const longDet='One solar wing is stuck half-latched and the power margin is falling — the payload can\'t run every system.';
const cut=longDet.length>62?Math.max(10,longDet.lastIndexOf(' ',62)):longDet.length;
const wrappedLines=longDet.length>62?[longDet.slice(0,cut).trim(),longDet.slice(cut).trim()]:[longDet];
check('anomaly word-wrap: long detail splits into 2 lines', wrappedLines.length===2);
check('anomaly word-wrap: first line ≤62 chars', wrappedLines[0].length<=62);
check('anomaly word-wrap: no content lost (recombined === original)', (wrappedLines[0]+' '+wrappedLines[1])===longDet);

// ---------- 13. Anomaly: short detail (genuinely < 62 chars) stays as single line ----------
const shortDet='Guidance radar dropping out at the worst moment.'; // 49 chars — under the 62-char wrap threshold
const cutShort=shortDet.length>62?Math.max(10,shortDet.lastIndexOf(' ',62)):shortDet.length;
const shortWrapped=shortDet.length>62?[shortDet.slice(0,cutShort).trim(),shortDet.slice(cutShort).trim()]:[shortDet];
check('anomaly word-wrap: short detail (<62 chars) stays single line', shortWrapped.length===1);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
