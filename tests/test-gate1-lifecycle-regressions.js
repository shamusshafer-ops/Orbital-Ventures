// Promotions for Gate 0 blockers B06/B07: exact-hull ownership refresh and
// staged commitment disclosure are now positive Gate 1 regressions.
let g1RegressionPass=0, g1RegressionFail=0;
function g1RegressionCheck(name,cond){ if(cond) g1RegressionPass++; else { g1RegressionFail++; console.log('FAIL:',name); } }

animEnabled=true; newGame('engineer'); state.money=100; state.activeMission='first_flight';
queueBuild(true,'gate1-b06'); while(buildQueueList().length) advanceDays(1);
const g1RegressionReady=hangarFor(curMission())[0];
const g1RegressionBefore=benchQueueHTML(curMission());
g1RegressionCheck('B06: surface binds the action to the exact ready hull',
  g1RegressionBefore.includes(`launchFromHangar('${g1RegressionReady.id}','${g1RegressionReady.hullId}'`));
g1RegressionCheck('B06: ready-hull action uses primary launch styling',
  /class="btn launch"[^>]*data-action-role="primary"/.test(g1RegressionBefore));
const g1RegressionFrozen=readyHullActionView(g1RegressionReady), g1RegressionLiveBefore=queueSpecSnapshot();
state.stages[0].prop=9; state.testLevel=2; state.rehearsal=true;
state.parts={tank:'alloy',avionics:'triple',fairing:'heavy'}; state.powerSource='rtg'; state.engineOut=true;
state.livery={body:'#010203',accent:'#040506',nose:'#070809',name:'MUTATED LIVE BENCH'};
state.depotUse=1; state.assembleOrbit=true;
const g1RegressionChangedBench=queueSpecSnapshot(), g1RegressionFrozenAgain=readyHullActionView(g1RegressionReady);
const g1RegressionChangedSurface=benchQueueHTML(curMission());
const g1RegressionFreezeConditions={
  flight:g1RegressionFrozenAgain.quote.flightBurn===g1RegressionFrozen.quote.flightBurn,
  carry:g1RegressionFrozenAgain.quote.launchCarry===g1RegressionFrozen.quote.launchCarry,
  restored:JSON.stringify(queueSpecSnapshot())===JSON.stringify(g1RegressionChangedBench),
  surfaceFlight:g1RegressionChangedSurface.includes(fM(g1RegressionFrozen.quote.flightBurn)),
  surfaceCarry:g1RegressionChangedSurface.includes(fM(g1RegressionFrozen.quote.launchCarry))};
g1RegressionCheck('B06/B07: ready quote and gate use the frozen order, not a changed live Bench',
  g1RegressionFreezeConditions.flight&&
  g1RegressionFreezeConditions.carry&&g1RegressionFreezeConditions.restored&&
  g1RegressionFreezeConditions.surfaceFlight&&g1RegressionFreezeConditions.surfaceCarry);
if(!Object.values(g1RegressionFreezeConditions).every(Boolean)) console.log('freeze detail:',JSON.stringify({conditions:g1RegressionFreezeConditions,before:g1RegressionFrozen.quote,after:g1RegressionFrozenAgain.quote}));
g1RegressionCheck('physical parts, power, engine-out, and livery are frozen while operational choices remain live',
  JSON.stringify(g1RegressionReady.spec.parts)===JSON.stringify(defaultParts())&&g1RegressionReady.spec.powerSource==='solar'&&
  g1RegressionReady.spec.engineOut===false&&g1RegressionReady.spec.livery.name===defaultLivery().name&&
  g1RegressionFrozenAgain.vehicle.totalDv===g1RegressionFrozen.vehicle.totalDv&&
  g1RegressionFrozenAgain.vehicle.reliability===g1RegressionFrozen.vehicle.reliability&&
  state.parts.avionics==='triple'&&state.powerSource==='rtg'&&state.engineOut===true&&state.livery.name==='MUTATED LIVE BENCH'&&
  state.depotUse===1&&state.assembleOrbit===true&&
  !('depotUse' in g1RegressionReady.spec)&&!('assembleOrbit' in g1RegressionReady.spec));
const g1RegressionManifest=buildQueuePanelHTML(), g1RegressionCommand=ccSummaryDeckHTML(), g1RegressionPlanner=railFlightPlanHTML();
const g1RegressionExactCall=`launchFromHangar('${g1RegressionReady.id}','${g1RegressionReady.hullId}','${g1RegressionFrozen.action.id}')`;
g1RegressionCheck('B06/B07: manifest, Command deck, and planner share the exact staged hull action',
  [g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].every(html=>html.includes(g1RegressionExactCall))&&
  [g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].every(html=>html.includes(fM(g1RegressionFrozen.quote.flightBurn)))&&
  [g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].every(html=>html.includes(fM(g1RegressionFrozen.quote.launchCarry))));
if(![g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].every(html=>html.includes(g1RegressionExactCall))) console.log('surface handler detail:',JSON.stringify([g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].map(html=>html.includes(g1RegressionExactCall))));
if(![g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].every(html=>html.includes(fM(g1RegressionFrozen.quote.launchCarry)))) console.log('surface carry detail:',JSON.stringify([g1RegressionManifest,g1RegressionCommand,g1RegressionPlanner].map(html=>html.includes(fM(g1RegressionFrozen.quote.launchCarry)))));
let g1RegressionRenders=0; const g1RegressionRender=render, g1RegressionLaunch=launch, g1RegressionCanLaunch=canLaunch;
let g1RegressionExecutedQuote=null, g1RegressionCanLaunchCalls=0;
render=()=>{ g1RegressionRenders++; };
canLaunch=(...args)=>{ g1RegressionCanLaunchCalls++; return g1RegressionCanLaunch(...args); };
launch=(...args)=>{ g1RegressionExecutedQuote=args[3]; return g1RegressionLaunch(...args); };
_devForceWeather=true;
launchFromHangar(g1RegressionReady.id,g1RegressionReady.hullId,'gate1-b06-fly');
launch=g1RegressionLaunch; canLaunch=g1RegressionCanLaunch;
g1RegressionCheck('B06: ownership transfers to the exact pending hull',
  !hangarList().some(r=>r.id===g1RegressionReady.id)&&_pendingLaunch&&_pendingLaunch.hullId===g1RegressionReady.hullId&&hullById(g1RegressionReady.hullId).status==='in-flight');
g1RegressionCheck('B06: ownership transfer immediately refreshes owning UI', g1RegressionRenders>0);
g1RegressionCheck('B07: ready execution consumes the one validated pre-transfer quote without re-quoting',
  g1RegressionCanLaunchCalls===1&&JSON.stringify(g1RegressionExecutedQuote)===JSON.stringify(g1RegressionFrozenAgain.quote));
render=g1RegressionRender;

newGame('engineer'); state.money=100; state.activeMission='first_flight';
const g1RegressionMission=curMission(), g1RegressionVehicle=computeVehicle();
const g1RegressionLabel=launchButtonLabel(g1RegressionMission,g1RegressionVehicle,null);
const g1RegressionQuote=launchCommitmentQuote(g1RegressionMission,g1RegressionVehicle,null,false);
g1RegressionCheck('B07: fresh action quotes build commitment due now', g1RegressionLabel.includes(fM(g1RegressionQuote.buildCost)));
g1RegressionCheck('B07: fresh action distinguishes later flight burn and reserve',
  g1RegressionLabel.includes(fM(g1RegressionQuote.flightBurn))&&g1RegressionLabel.includes(fM(g1RegressionQuote.launchCarry)));
queueBuild(true,'gate1-b07-a'); queueBuild(true,'gate1-b07-b'); while(buildQueueList().length) advanceDays(1);
const g1RegressionReadyViews=hangarFor(curMission()).map(readyHullActionView);
g1RegressionCheck('B06: multiple same-mission hulls keep distinct order, hull, and request identities',
  g1RegressionReadyViews.length===2&&new Set(g1RegressionReadyViews.map(v=>v.action.id)).size===2&&
  g1RegressionReadyViews.every(v=>v.action.subjectId===v.record.hullId));
const g1RegressionReadySurface=benchQueueHTML(curMission());
const g1RegressionReadyQuote=launchCommitmentQuote(curMission(),computeVehicle(),null,true);
g1RegressionCheck('B07: ready action separately quotes flight burn and carry reserve',
  g1RegressionReadySurface.includes(fM(g1RegressionReadyQuote.flightBurn))&&g1RegressionReadySurface.includes(fM(g1RegressionReadyQuote.launchCarry)));
g1RegressionCheck('B07: ready affordability uses the disclosed staged total',
  g1RegressionReadyQuote.requiredAtCommit===round2(g1RegressionReadyQuote.flightBurn+g1RegressionReadyQuote.launchCarry));
const g1Scrap=hangarFor(curMission())[0], g1ScrapHull=g1Scrap.hullId;
scrapHangar(g1Scrap.id);
g1RegressionCheck('lifecycle: scrapping assigns the exact hull a terminal disposition and event',
  hullById(g1ScrapHull).status==='scrapped'&&hullById(g1ScrapHull).history.some(e=>e.outcome==='scrapped'));
g1RegressionCheck('lifecycle: reverse ownership audit rejects no valid post-scrap state', auditLifecycleState().length===0);

console.log(`${g1RegressionPass}/${g1RegressionPass+g1RegressionFail} checks passed`);
process.exitCode=g1RegressionFail?1:0;
