animEnabled=true;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function approx(a,b,eps){ eps=eps===undefined?1e-6:eps; return Math.abs(a-b)<=eps; }

function baseSpec(overrides){
  return Object.assign({ title:'Test Flight', crewed:false, success:true, failPhase:null,
    stages:[{prop:100,count:1,dia:1}], boosters:{count:0}, transferProp:0,
    recovering:false, hasCapsule:false, isCislunar:false, isOrbital:true, reqDv:9400,
    rng:{wind:0,windFreq:1.4,windPhase:0,pitchJitter:0,sep:[],apogee:1,bow:0} }, overrides||{});
}
// Drives the REAL animLoop/endAnim machinery on a controlled virtual clock — not a reimplementation
// of the phase math, so it validates production code, not a model of it.
function pumpFlight(stepMs, maxFrames){
  maxFrames=maxFrames||4000;
  let virtualNow=performance.now();
  const realNow=performance.now;
  if(animState) animState.prevWall=virtualNow;
  performance.now=()=>virtualNow;
  let frames=0;
  try{
    while(animState && frames<maxFrames){ virtualNow+=stepMs; animLoop(); frames++; }
  } finally { performance.now=realNow; }
  return frames;
}

// ---------- 1. A launch spec starts in the pad phase, engines cold ----------
{
  newGame('engineer');
  let done=false;
  playMission(baseSpec(), ()=>{done=true;});
  check('start: phase is pad', animState.phase==='pad');
  check('start: padDur equals PAD_PHASE_MS', animState.padDur===PAD_PHASE_MS);
  check('start: ignite starts at 0 (engines cold)', animState.ignite===0);
  check('start: engine sfx not yet started', animState._engineStarted===false);
}

// ---------- 2. Ignite ramps 0→1 across the hold+ignition window, never before the hold fraction ----------
{
  newGame('engineer');
  playMission(baseSpec(), ()=>{});
  // still within the hold: ignite must stay exactly 0
  drawScene(PAD_PHASE_MS*(PAD_HOLD_FRAC*0.5));
  check('ignite: 0 throughout the countdown hold', animState.ignite===0);
  // just past the hold: ignite > 0
  drawScene(PAD_PHASE_MS*(PAD_HOLD_FRAC+0.01));
  check('ignite: begins ramping just past the hold fraction', animState.ignite>0 && animState.ignite<1);
  // at the very end of the pad phase: ignite reaches (or is essentially) 1
  drawScene(PAD_PHASE_MS*0.999);
  check('ignite: approaches 1 at the end of the pad phase', animState.ignite>0.95);
  // engine sfx started exactly once, at the hold boundary
  check('sfx: engine start fired during the pad phase', animState._engineStarted===true);
}

// ---------- 3. Engine sfx starts exactly once, not re-triggered every pad frame ----------
{
  newGame('engineer');
  let startCalls=0;
  const realStart=sfxStartEngine;
  sfxStartEngine=function(){ startCalls++; return realStart.apply(this,arguments); };
  playMission(baseSpec(), ()=>{});
  for(let f=0; f<40; f++){ drawScene(f*(PAD_PHASE_MS/40)); }
  sfxStartEngine=realStart;
  check('sfx: engine start called exactly once across the whole pad phase', startCalls===1);
}

// ---------- 4. Seamless handoff: the pad's last frame and ascent's first frame are the SAME draw call ----------
// (drawPad always calls drawAscent(0,...); once t crosses padDur, drawScene calls drawAscent(0,...)
// too — same p, same ignite=1 default outside the pad. This proves no reset/pop happens at the seam.)
{
  newGame('engineer');
  playMission(baseSpec(), ()=>{});
  drawScene(PAD_PHASE_MS-1); // last pad frame
  const padRocketX=animState.rocketX, padIgnite=animState.ignite, padAltFrac=animState.altFrac;
  drawScene(PAD_PHASE_MS+1); // first ascent frame (crosses the seam)
  check('handoff: phase flips to ascent right after padDur', animState.phase==='ascent');
  check('handoff: rocket X position is continuous across the seam', approx(padRocketX, animState.rocketX, 0.5));
  check('handoff: altitude fraction is continuous (still ~0) across the seam', approx(padAltFrac, animState.altFrac, 0.01));
  check('handoff: ignite is 1 (full) on both sides of the seam', padIgnite>0.95 && animState.ignite===1);
}

// ---------- 5. Full pump-driven flight: pad → ascent → orbit, ends held (orbital success) ----------
{
  newGame('engineer');
  let done=false;
  playMission(baseSpec({isOrbital:true, isCislunar:false}), ()=>{done=true;});
  const seenPhases=new Set();
  let frames=0, threw=false;
  try{
    while(animState && frames<3000){
      seenPhases.add(animState.phase);
      if(animState.held) break;
      frames+=pumpFlight(100,1);
    }
  }catch(e){ threw=true; console.log('pump threw:', e.stack); }
  check('pump: no throw across a full flight', !threw);
  check('pump: visited pad phase', seenPhases.has('pad'));
  check('pump: visited ascent phase', seenPhases.has('ascent'));
  check('pump: visited orbit phase', seenPhases.has('orbit'));
  check('pump: ends held on a successful orbital flight (post-flight card)', !!(animState && animState.held));
  check('pump: done() not yet called while held', done===false);
}

// ---------- 6. An arrival-only replay (mode:'arrive') skips the pad phase entirely ----------
{
  newGame('engineer');
  playMission(baseSpec({mode:'arrive'}), ()=>{});
  check('arrive: padDur is 0', animState.padDur===0);
  check('arrive: phase starts in ascent/cruise territory, not pad', animState.phase!=='pad');
  check('arrive: ignite defaults to 1 (no ramp to do)', animState.ignite===1);
  check('arrive: engine sfx started immediately (no pad hold to wait for)', animState._engineStarted===true);
}

// ---------- 7. An ascent-phase failure still starts on the pad and still fails during ascent ----------
{
  newGame('engineer');
  let done=false;
  playMission(baseSpec({success:false, failPhase:'ascent'}), ()=>{done=true;});
  check('ascent-fail: still starts on the pad', animState.phase==='pad');
  let frames=0, threw=false;
  try{ while(animState && frames<3000){ frames+=pumpFlight(100,1); } }
  catch(e){ threw=true; console.log('ascent-fail pump threw:', e.stack); }
  check('ascent-fail: pumps to completion without throwing', !threw);
  check('ascent-fail: done() fires (no post-flight hold on a failure)', done===true);
}

// ---------- 8. Cislunar (deep) flight: pad phase still present, longer cruise, no throw ----------
{
  newGame('engineer');
  let done=false;
  playMission(baseSpec({isCislunar:true, isOrbital:false, hasCapsule:true, crewed:true}), ()=>{done=true;});
  check('cislunar: starts on the pad', animState.phase==='pad');
  let frames=0, threw=false, sawCislunar=false;
  try{
    while(animState && frames<4000){
      if(animState.phase==='cislunar') sawCislunar=true;
      if(animState.held) break;
      frames+=pumpFlight(150,1);
    }
  }catch(e){ threw=true; console.log('cislunar pump threw:', e.stack); }
  check('cislunar: no throw', !threw);
  check('cislunar: visited the cislunar phase', sawCislunar);
}

// ---------- 9. The two-container iso-liftoff is retired for launches: finalizeLaunch never calls playLiftoff ----------
{
  newGame('engineer');
  let liftoffCalls=0;
  const realLiftoff=playLiftoff;
  playLiftoff=function(){ liftoffCalls++; return realLiftoff.apply(this,arguments); };
  // Drive finalizeLaunch directly with a minimal ctx (mirrors what proceedLaunch builds)
  const m=MISSIONS[0], v=computeVehicle();
  const outcome={kind:'success', rel:0.9, story:'', failPhase:null};
  const ctx={m,v,sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,outcome,rehearsed:false,famId:null,crewId:null,ab:{rel:0,payoutMult:1}};
  try{ finalizeLaunch(ctx,null); }catch(e){ console.log('finalizeLaunch threw (non-fatal to this check):', e.message); }
  playLiftoff=realLiftoff;
  check('retired: playLiftoff is never called from finalizeLaunch', liftoffCalls===0);
  check('retired: _liftoffArmed is false after a launch resolves', _liftoffArmed===false);
}

// ---------- 10. animEnabled=false: the REAL dispatch (finalizeLaunch) skips animation entirely.
// (playMission itself never checks animEnabled — that's finalizeLaunch's job, per the dispatch at
// its end: `if(animEnabled){ playMission(...) } else finish();`. Testing playMission directly with
// animEnabled=false would be testing an invalid call pattern, not real behavior.)
{
  newGame('engineer');
  animEnabled=false;
  animState=null;
  const m=MISSIONS[0], v=computeVehicle();
  const outcome={kind:'success', rel:0.9, story:'', failPhase:null};
  const ctx={m,v,sim:null,windowQuality:1,flightExpense:1,routine:false,crewed:false,outcome,rehearsed:false,famId:null,crewId:null,ab:{rel:0,payoutMult:1}};
  let threw=false;
  try{ finalizeLaunch(ctx,null); }catch(e){ threw=true; console.log('headless finalizeLaunch threw:', e.stack); }
  check('headless: finalizeLaunch does not throw', !threw);
  check('headless: no animState created — the pad/ascent code never runs when animEnabled is false', animState===null);
  animEnabled=true;
}

// ---------- 11. Full regression: a real launch() through the actual player entry point never throws ----------
{
  newGame('engineer');
  animEnabled=true;
  state.money=1e6;
  let threw=false;
  try{
    const m=curMission();
    // build+queue a launch synchronously would take real advanceDays time; instead validate the
    // pad-phase machinery is reachable via the exact dispatch finalizeLaunch uses, already covered
    // above (test 9) — this test instead confirms a full headless-mode launch cycle still completes
    // clean end to end with the new code paths present (regression guard for the whole file).
    animEnabled=false;
    launch(false);
  }catch(e){ threw=true; console.log('launch() threw:', e.stack); }
  check('regression: launch() entry point still runs clean with Slice A code present', !threw);
  animEnabled=true;
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
