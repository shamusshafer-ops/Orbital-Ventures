// Phase 1 orbital operations: pure maneuver budget/options, snapshot threading,
// paused orbit-start decision behavior, and maneuver-aware orbit telemetry.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name,Math.abs(a-b)<=tol); }

newGame('engineer');

const mission={id:'orb_test',name:'Orbital Test',reqDv:9400,inclination:51.6,profile:null};
const ctx={m:mission,v:{totalDv:9700},outcome:{kind:'success'}};
check('maneuver budget is vehicle margin above effective requirement',orbitalManeuverBudget(ctx)===300);
const opts=orbitalManeuverOptions(ctx);
check('Phase 1 exposes circularize, raise, lower, and deorbit',opts.map(o=>o.id).join(',')==='circularize,raise,lower,deorbit');
check('planned circularization is always available and does not consume reserve margin',opts[0].enabled&&opts[0].cost===0&&opts[0].profile.remainingDv===300);
check('raise/lower costs consume real maneuver margin',opts.find(o=>o.id==='raise').profile.remainingDv===180&&opts.find(o=>o.id==='lower').profile.remainingDv===230);
check('inclination is preserved in every orbit plan',opts.every(o=>o.profile.inclination===51.6));

const tight={m:mission,v:{totalDv:9430},outcome:{kind:'success'}};
const tightOpts=orbitalManeuverOptions(tight);
check('insufficient-margin raise and lower burns are disabled',!tightOpts.find(o=>o.id==='raise').enabled&&!tightOpts.find(o=>o.id==='lower').enabled);
check('circularize and deorbit remain available with a tight margin',tightOpts.find(o=>o.id==='circularize').enabled&&tightOpts.find(o=>o.id==='deorbit').enabled);

const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:16400};
const orbitOps={id:'raise',label:'ORBIT RAISE',periapsis:205,apoapsis:420,inclination:51.6,remainingDv:180};
const spec={mode:'launch',isOrbital:true,success:true,reqDv:9400,stages:[],orbitOps};
const snap=flight3dPresentationSnapshot(spec,timing,timing.padDur+timing.ascentDur+timing.cruiseDur*.4);
check('presentation snapshot carries authoritative orbit maneuver state',snap.orbitOps===orbitOps);
const profile=cape3dOrbitProfile(snap);
check('orbit profile reflects selected apsides and inclination',profile.periapsis===205&&profile.apoapsis===420&&profile.inclination===51.6);
check('orbital velocity is physically plausible for LEO',profile.velocity>7400&&profile.velocity<8000);
const telem=flightOrbitTelemetry(snap);
check('mission-control telemetry exposes apsides, inclination, velocity, and remaining delta-v',telem.visible&&telem.apoapsis===420&&telem.periapsis===205&&telem.inclination===51.6&&telem.remainingDv===180);

// The real flight overlay reaches the insertion seam, paints the decision, and holds there.
animEnabled=true; animState=null; _pendingOrbitOps=null;
showOrbitalManeuverDecision(ctx);
const overlayState=animState, orbitStart=overlayState.padDur+overlayState.ascentDur+1;
drawScene(orbitStart);
check('orbital maneuver decision holds at the live orbit-start frame',animState===overlayState&&animState.held===true&&animState.pendingDecision.holdAt==='orbit-start');
check('all affordable maneuver choices are drawn into the paused overlay',(animState.decisionButtons||[]).length===4);

// A held animState is the clock pause: animLoop returns before advancing virtT or scheduling RAF.
animState={held:true,virtT:1234,prevWall:0,raf:0};
animLoop();
check('held maneuver decision freezes the flight clock exactly',animState.virtT===1234);
animState=null; _pendingOrbitOps=null;

console.log(`orbital maneuvers: ${pass}/${pass+fail}`);
process.exit(fail?1:0);
