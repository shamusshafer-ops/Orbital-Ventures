// ============================================================================
// Slice B — the deferred-departure "cruise begins / ETA" outro card.
//
// When a ≥DEFER_CRUISE_DAYS interplanetary mission departs, the launch-day
// session no longer just cuts to nothing: it plays pad → ascent → a cruise-
// begins card on the overlay's own canvas (spec.mode:'depart', the mirror of
// Slice A's 'arrive'), then holds for the player to dismiss. The real mission
// outcome is unchanged — it still lands on ARRIVAL, turns later.
//
// Drives the REAL playMission/animLoop/endAnim + the REAL proceedLaunch
// dispatch (per the harness README: validate the production render path with
// pumpFlight, not a reimplementation of the phase math).
// ============================================================================
animEnabled=true;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function departSpec(overrides){
  // What buildDepartSpec produces, shaped like a real deferred departure, for the render-path tests.
  return Object.assign({ title:'Belt Survey', crewed:false, crew:0, success:true, failPhase:null,
    mode:'depart', transitDays:780, etaAbs:900, destName:'Belt Survey',
    stages:[{prop:120,count:1,dia:1}], boosters:{count:0}, transferProp:20,
    recovering:false, hasCapsule:false, isCislunar:true, isOrbital:false, reqDv:12000,
    rng:{wind:0,windFreq:1.4,windPhase:0,pitchJitter:0,sep:[],apogee:1,bow:0} }, overrides||{});
}
// Same controlled-virtual-clock pump the Slice A suite uses — real animLoop, not a model of it.
function pumpFlight(stepMs, maxFrames){
  maxFrames=maxFrames||6000;
  let virtualNow=performance.now();
  const realNow=performance.now;
  if(animState) animState.prevWall=virtualNow;
  performance.now=()=>virtualNow;
  let frames=0;
  try{ while(animState && frames<maxFrames){ virtualNow+=stepMs; animLoop(); frames++; } }
  finally { performance.now=realNow; }
  return frames;
}

// ---------- 1. buildDepartSpec: always a clean successful launch visual, carrying the ETA fields ----------
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='belt_survey');
  const spec=buildDepartSpec(m, false, 780, 1234);
  check('build: mode is depart', spec.mode==='depart');
  check('build: shown as success (real outcome is deferred to arrival, not spoiled here)', spec.success===true);
  check('build: no failPhase', spec.failPhase===null);
  check('build: transitDays carried', spec.transitDays===780);
  check('build: etaAbs carried (for the ARRIVAL date on the card)', spec.etaAbs===1234);
  check('build: destName carried', spec.destName===m.name);
  check('build: isCislunar reflects the interplanetary profile', spec.isCislunar===true);
  check('build: title set', spec.title===m.name);
}

// ---------- 2. A crewed deferred departure carries its crew count for the card ----------
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='mars_orbit'); // crew:3, days:520, profile
  const spec=buildDepartSpec(m, true, 520, 999);
  check('build-crew: crewed flag set', spec.crewed===true);
  check('build-crew: crew count carried', spec.crew===(m.crew||0) && spec.crew>0);
}

// ---------- 3. A depart spec is a REAL launch: it keeps the pad phase (unlike 'arrive') ----------
{
  newGame('engineer');
  playMission(departSpec(), ()=>{});
  check('depart: starts on the pad (a departure has a launch to show)', animState.phase==='pad');
  check('depart: padDur is the full PAD_PHASE_MS (not skipped like arrive)', animState.padDur===PAD_PHASE_MS);
  check('depart: ignite starts cold on the pad', animState.ignite===0);
  // totalDur is just launch + card — no orbit/cruise/reentry tail.
  const A=animState;
  check('depart: totalDur = pad + ascent + card only (no cruise/reentry)',
        Math.abs(A.totalDur - (A.padDur + A.ascentDur + DEPART_CARD_MS)) < 1);
}

// ---------- 4. Pump-driven: pad → ascent → depart card, and it NEVER shows orbit/cruise/reentry ----------
{
  newGame('engineer');
  let done=false;
  playMission(departSpec(), ()=>{done=true;});
  const seen=new Set();
  let frames=0, threw=false;
  try{
    while(animState && frames<4000){
      seen.add(animState.phase);
      if(animState.held) break;
      frames+=pumpFlight(100,1);
    }
  }catch(e){ threw=true; console.log('depart pump threw:', e.stack); }
  check('pump: no throw across the whole departure card', !threw);
  check('pump: visited pad', seen.has('pad'));
  check('pump: visited ascent', seen.has('ascent'));
  check('pump: visited the depart card phase', seen.has('depart'));
  check('pump: NEVER entered orbit (that belongs to the arrival, turns later)', !seen.has('orbit'));
  check('pump: NEVER entered cislunar', !seen.has('cislunar'));
  check('pump: NEVER entered reentry', !seen.has('reentry'));
  check('pump: NEVER entered suborbital', !seen.has('suborbital'));
  check('pump: ends HELD on the card (session ends cleanly, no abrupt cut)', !!(animState && animState.held));
  check('pump: done() not called while the card is held', done===false);
}

// ---------- 5. Dismissing the held card settles the flow (done/settle fires, overlay closes) ----------
{
  newGame('engineer');
  let done=false;
  playMission(departSpec(), ()=>{done=true;});
  let frames=0;
  while(animState && !animState.held && frames<4000){ frames+=pumpFlight(100,1); }
  check('dismiss: reached the held card', !!(animState && animState.held));
  dismissAnim();
  check('dismiss: done()/settle fired on dismiss', done===true);
  check('dismiss: overlay torn down (animState cleared)', animState===null);
}

// ---------- 6. endAnim holds a depart flight on the card, NOT on the orbit/mission-complete card ----------
// (drawPostFlight would render "ORBIT ACHIEVED" stats — wrong for a departure whose outcome is unknown.)
{
  newGame('engineer');
  playMission(departSpec(), ()=>{});
  let calledPostFlight=false;
  const realPost=drawPostFlight; drawPostFlight=function(){ calledPostFlight=true; return realPost.apply(this,arguments); };
  let frames=0;
  while(animState && !animState.held && frames<4000){ frames+=pumpFlight(100,1); }
  drawPostFlight=realPost;
  check('hold: the depart card holds without ever drawing the orbit post-flight card', calledPostFlight===false);
  check('hold: it is genuinely held (dismissable), not auto-closed', !!(animState && animState.held));
}

// ---------- 7. Integration: proceedLaunch on a real deferred mission plays the depart card (anim on) ----------
{
  newGame('engineer');
  animEnabled=true;
  animState=null;
  const m=MISSIONS.find(x=>x.id==='belt_survey'); // uncrewed, days:780 (≥ DEFER_CRUISE_DAYS)
  const v=computeVehicle();
  const sim=simulateMission(m);
  let departBuilt=0;
  const realBuild=buildDepartSpec; buildDepartSpec=function(){ departBuilt++; return realBuild.apply(this,arguments); };
  let threw=false;
  try{ proceedLaunch(m, v, sim, 1, 0, true); }catch(e){ threw=true; console.log('deferred proceedLaunch threw:', e.stack); }
  buildDepartSpec=realBuild;
  check('defer/on: proceedLaunch did not throw', !threw);
  check('defer/on: a cruise-begins card was built for the departure', departBuilt===1);
  check('defer/on: the overlay is playing a mode:depart flight', !!(animState && animState.spec && animState.spec.mode==='depart'));
  check('defer/on: the deferred flight was registered (resolves on arrival)',
        (state.activeFlights||[]).some(f=>f&&f.deferred&&f.mission===m.id));
}

// ---------- 8. Balance-neutral: animEnabled=false takes the byte-identical synchronous settle, no card ----------
{
  newGame('engineer');
  animEnabled=false;
  animState=null;
  const m=MISSIONS.find(x=>x.id==='belt_survey');
  const v=computeVehicle();
  const sim=simulateMission(m);
  let departBuilt=0;
  const realBuild=buildDepartSpec; buildDepartSpec=function(){ departBuilt++; return realBuild.apply(this,arguments); };
  let threw=false;
  try{ proceedLaunch(m, v, sim, 1, 0, true); }catch(e){ threw=true; console.log('defer/off proceedLaunch threw:', e.stack); }
  buildDepartSpec=realBuild;
  check('defer/off: proceedLaunch did not throw', !threw);
  check('defer/off: NO depart card built when animation is off (headless is unchanged)', departBuilt===0);
  check('defer/off: NO animState created — the render path never runs headless', animState===null);
  check('defer/off: the deferred flight is still registered (mechanics untouched by the card)',
        (state.activeFlights||[]).some(f=>f&&f.deferred&&f.mission===m.id));
  animEnabled=true;
}

// ---------- 9. Balance-neutral: a SHORT (<DEFER_CRUISE_DAYS) mission never builds a depart card ----------
{
  newGame('engineer');
  animEnabled=true;
  animState=null;
  const m=MISSIONS.find(x=>x.id==='first_sat'); // days:0 — synchronous, never deferred
  const v=computeVehicle();
  let departBuilt=0;
  const realBuild=buildDepartSpec; buildDepartSpec=function(){ departBuilt++; return realBuild.apply(this,arguments); };
  try{ proceedLaunch(m, v, null, 1, 0, true); }catch(e){ console.log('short proceedLaunch note:', e.message); }
  buildDepartSpec=realBuild;
  check('short: a non-deferred mission never triggers the depart card (guarded by DEFER_CRUISE_DAYS)', departBuilt===0);
  if(animState){ check('short: any launch animation that plays is a normal flight, not mode:depart', animState.spec.mode!=='depart'); }
  else { check('short: (no animation surfaced — a modal/synchronous path took over, still no depart card)', true); }
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
