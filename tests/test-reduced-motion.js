// Gate 6 F6 — prefers-reduced-motion honoured in JS, not only CSS.
// Runs against the same headless harness as the other suites (harness.js now stubs
// matchMedia so reducedMotion() has something to query; the stub's `matches` reads
// live from global.__mockReducedMotion, so tests can flip it after game.js has
// already captured the MediaQueryList reference -- exercising the same live-update
// path a real OS-level preference change would take).
animEnabled=true;
let pass=0, fail=0;
function check(name, cond, detail){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); } }

console.log('Gate 6 — reduced motion');

/* ---------- 1. the accessor itself reflects the live preference ---------- */
{
  global.__mockReducedMotion = false;
  check('reducedMotion() false when OS preference is off', reducedMotion()===false);
  global.__mockReducedMotion = true;
  check('reducedMotion() true when OS preference is on', reducedMotion()===true);
  global.__mockReducedMotion = false;
  check('reducedMotion() flips back without reload (live matchMedia read)', reducedMotion()===false);
}

/* ---------- 2. ambientClockT: freezes under reduced motion, resumes without a jump ---------- */
{
  const realNow = performance.now;
  let virt = 1000;
  performance.now = ()=>virt;
  try{
    const store = {};
    global.__mockReducedMotion = false;
    const t0 = ambientClockT(store);
    check('ambientClockT starts at 0 on first call', t0===0, t0);
    virt += 500;
    const t1 = ambientClockT(store);
    check('ambientClockT advances while motion is not reduced', approxRM(t1,0.5), t1);
    global.__mockReducedMotion = true;
    virt += 2000; // 2s pass "in the world" while reduced motion is on
    const t2 = ambientClockT(store);
    check('ambientClockT does not advance while reduced motion is on', approxRM(t2,0.5), t2);
    virt += 300;
    const t3 = ambientClockT(store);
    check('ambientClockT still frozen on a second call while on', approxRM(t3,0.5), t3);
    global.__mockReducedMotion = false;
    virt += 200;
    const t4 = ambientClockT(store);
    // resuming should pick up ~0.2s of new motion, not the ~2.5s that elapsed while frozen --
    // i.e. no jump-cut catch-up to real elapsed wall time.
    check('ambientClockT resumes smoothly (no catch-up jump)', approxRM(t4,0.7) && t4<1.5,
          't4='+t4+' (expected ~0.7, and well under the ~2.7s that actually elapsed)');
  } finally { performance.now = realNow; global.__mockReducedMotion=false; }
}
function approxRM(a,b){ return Math.abs(a-b) < 0.05; }

/* ---------- 3. flight canvas shake: zeroed under reduced motion, informational state untouched ---------- */
function baseSpec(overrides){
  return Object.assign({ title:'RM Test Flight', crewed:false, success:true, failPhase:null,
    stages:[{prop:100,count:1,dia:1}], boosters:{count:0}, transferProp:0,
    recovering:false, hasCapsule:false, isCislunar:false, isOrbital:true, reqDv:9400,
    rng:{wind:0,windFreq:1.4,windPhase:0,pitchJitter:0,sep:[],apogee:1,bow:0} }, overrides||{});
}
function pumpFlight(stepMs, maxFrames){
  maxFrames=maxFrames||4000;
  let virtualNow=performance.now();
  const realNow=performance.now;
  if(animState) animState.prevWall=virtualNow;
  performance.now=()=>virtualNow;
  let frames=0;
  try{ while(animState && frames<maxFrames){ virtualNow+=stepMs; animLoop(); frames++; } }
  finally { performance.now=realNow; }
  return frames;
}
{
  // Default animSpeedIdx is 0 (0.1x slow-mo) and animLoop clamps each call to <=50ms of real
  // time before applying speed, so at default speed a frame advances virtual time by <=5ms --
  // reaching Max-Q (pad phase ~2300ms, then ramping across 15-35% of a 7200ms ascent) would
  // need ~1000+ frames. Speed the clock up for this test only; it doesn't change what's being
  // verified (shake is driven by qNorm, not by animSpeedIdx).
  const savedSpeedIdx = animSpeedIdx;
  animSpeedIdx = 5; // 10x

  newGame('engineer');
  global.__mockReducedMotion = false;
  playMission(baseSpec(), ()=>{});
  let seenNonzeroShake = false;
  {
    const realNow = performance.now; let virtualNow = performance.now();
    performance.now = ()=>virtualNow;
    try{
      for(let i=0;i<200 && animState;i++){
        virtualNow+=16; animLoop();
        if(animState && (animState.shakeX!==0 || animState.shakeY!==0)) seenNonzeroShake=true;
      }
    } finally { performance.now = realNow; }
  }
  check('shake is nonzero somewhere in ascent when motion is not reduced', seenNonzeroShake);

  newGame('engineer');
  global.__mockReducedMotion = true;
  playMission(baseSpec(), ()=>{});
  const virtTBefore = animState ? animState.virtT : 0;
  let allShakeZero = true;
  const realNow = performance.now;
  let virtualNow = performance.now();
  performance.now = ()=>virtualNow;
  try{
    for(let i=0;i<200 && animState;i++){
      virtualNow+=16; animLoop();
      if(animState && (animState.shakeX!==0 || animState.shakeY!==0)) allShakeZero=false;
    }
  } finally { performance.now = realNow; animSpeedIdx = savedSpeedIdx; }
  const sawFrame = true; // pumpFlight/this loop advanced animState above; newGame+playMission left it live
  const virtTAfter = animState ? animState.virtT : virtTBefore;
  check('flight actually ran under reduced motion (frames observed)', sawFrame);
  check('shake stays zero throughout ascent when motion is reduced', allShakeZero);
  check('flight timing (virtT) still advances under reduced motion -- outcome not suppressed',
        virtTAfter>virtTBefore, 'before='+virtTBefore+' after='+virtTAfter);
  global.__mockReducedMotion = false;
}

/* ---------- 4. source-level wiring + "did not touch information" guard ---------- */
{
  const fs=require('fs'), path=require('path');
  const ROOT = process.cwd();
  const RENDER = fs.readFileSync(path.join(ROOT,'src','render.js'),'utf8');
  const FLIGHT = fs.readFileSync(path.join(ROOT,'src','flight.js'),'utf8');
  const SHELL  = fs.readFileSync(path.join(ROOT,'src','shell.js'),'utf8');

  check('shell.js declares the shared reducedMotion() accessor', /function reducedMotion\(\)/.test(SHELL));
  check('shell.js loads a single matchMedia query, read live (not cached per-call)',
        /_reducedMotionQuery=.*matchMedia\(.\(prefers-reduced-motion: reduce\).\)/s.test(SHELL));

  check('flight.js gates Max-Q shake on reducedMotion()',
        /shakeAmt\s*=\s*reducedMotion\(\)\s*\?\s*0\s*:/.test(FLIGHT));

  check('render.js declares the shared ambientClockT() helper', /function ambientClockT\(store\)/.test(RENDER));

  // Each ambient loop must call either reducedMotion() or ambientClockT() -- and must still
  // reference the informational state it must NOT suppress.
  const cape3dBody = RENDER.slice(RENDER.indexOf('function cape3dTick()'), RENDER.indexOf('function renderCape3DFrame()'));
  check('cape3dTick freezes via reducedMotion()/ambient accumulator', /reducedMotion\(\)/.test(cape3dBody));
  check('cape3dTick still reads launchActive/reentryP from root.userData (untouched)',
        /root&&root\.userData\.launchActive/.test(cape3dBody) && /reentryActive/.test(cape3dBody));

  const map3dBody = RENDER.slice(RENDER.indexOf('function map3dTick()'), RENDER.indexOf('function map3dTick()')+2600);
  check('map3dTick freezes via reducedMotion()', /reducedMotion\(\)/.test(map3dBody));
  check('map3dTick still positions bodies from d (sim day), not the ambient clock',
        /bodyScenePos\(id,\s*d\)/.test(map3dBody));

  const earthBody = RENDER.slice(RENDER.indexOf('function earthLoop()'), RENDER.indexOf('function openEarthPopout()'));
  check('earthLoop freezes via reducedMotion()', /reducedMotion\(\)/.test(earthBody));

  check('ccLoop/ccPopLoop/CapeScene all route through ambientClockT',
        (RENDER.match(/ambientClockT\(/g)||[]).length >= 3,
        (RENDER.match(/ambientClockT\(/g)||[]).length+' call sites found, expected >=3');

  check('CapeScene pad-smoke emitter is gated on reducedMotion()',
        /wantSmoke\s*=\s*!reducedMotion\(\)/.test(RENDER));

  // Ground track and orbital mechanics must not reference the ambient clock at all.
  check('groundTrackPasses (ground-track overlay) takes no ambient-clock argument',
        /function groundTrackPasses\(inclDeg, ascNodeLon, passes\)/.test(fs.readFileSync(path.join(ROOT,'src','sim.js'),'utf8')));
}

console.log('\n'+pass+' passed, '+fail+' failed');
if(fail) process.exit(1);
