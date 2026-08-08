// G0-B07: commitment surfaces do not distinguish the cash taken now from the
// operating burn and carry reserve required later. The fixture does not call
// those amounts one execution price. It separately pins the valid mismatch
// between the displayed Launch cost and the ready-hull affordability gate.
const issue=createExpectedFailureTracker('G0-B07','Commitment surfaces omit staged cash requirements and underquote affordability');

// Fresh path: execution commits only the build. The primary label explains the
// build-then-Hangar workflow, but it does not quote either the immediate build
// debit or the later flight operating requirement.
newGame('engineer');
state.money=100;
state.activeMission='first_flight';
let mission=curMission(), vehicle=computeVehicle(), tl=TEST_LEVELS[state.testLevel];
const freshLabel=launchButtonLabel(mission,vehicle);
const immediateBuildCommitment=round2(vehicle.buildCost);
const laterFlightBurn=round2(vehicle.launchCost+(tl.cost||0));
const laterCarryReserve=round2(0.12*(1+(tl.months||0)));
const freshBefore=state.money;
launch(false,null);
const freshDebit=round2(freshBefore-state.money);

issue.setup('fresh commitment queues one build and debits only its build cost',
  buildQueueList().length===1 && Math.abs(freshDebit-immediateBuildCommitment)<0.011,
  `orders=${buildQueueList().length}, debit=${fM(freshDebit)}, build=${fM(immediateBuildCommitment)}`);
issue.expect('fresh primary action quotes the immediate build commitment',
  freshLabel.includes(fM(immediateBuildCommitment)),
  `label=${freshLabel}, immediate build=${fM(immediateBuildCommitment)}`);
issue.expect('fresh primary action distinguishes later flight burn and carry reserve',
  freshLabel.includes(fM(laterFlightBurn)) && freshLabel.includes(fM(laterCarryReserve)),
  `label=${freshLabel}, later burn=${fM(laterFlightBurn)}, carry reserve=${fM(laterCarryReserve)}`);

// Ready-hull path: capture the actual Bench readout that displays Launch cost,
// then measure execution's immediate launch/test debit separately from the
// month's operating carry before the forced weather decision appears.
newGame('engineer');
animEnabled=true;
state.money=100;
state.activeMission='first_flight';
mission=curMission(); vehicle=computeVehicle(); tl=TEST_LEVELS[state.testLevel];
const spec=queueSpecSnapshot();
const hull=makeHull(spec,'rollout');
const ready={id:'ord-quote-ready',name:'Vehicle — First Flight',missionId:mission.id,
  missionName:mission.name,spec,units:1,builtMonth:absMonth(),hullId:hull.id};
state.hangar=[ready];
const readyActionSurface=benchQueueHTML(mission);
let readoutSurface='';
const originalSetHTML=setHTML;
setHTML=(el,html)=>{
  if(String(html).includes('Launch cost')) readoutSurface=String(html);
  return originalSetHTML(el,html);
};
renderReadout();
setHTML=originalSetHTML;
const displayedLaunchPrice=round2(vehicle.launchCost);
const immediateReadyCommitment=round2(vehicle.launchCost+(tl.cost||0));
const readyCarryReserve=round2(0.12*(1+(tl.months||0)));
issue.setup('Bench readout displays the computed launch price for this exact design',
  readoutSurface.includes('Launch cost') && readoutSurface.includes(fM(displayedLaunchPrice)),
  `displayed=${fM(displayedLaunchPrice)}, readoutCaptured=${!!readoutSurface}`);

const readyBefore={money:state.money,day:absDay()};
_devForceWeather=true;
launchFromHangar(ready.id);
const readyDebit=round2(readyBefore.money-state.money);
const readyDays=absDay()-readyBefore.day;
issue.setup('ready-hull execution separates immediate flight debit from one-month operating carry',
  !!_pendingLaunch && _pendingLaunch.hullId===hull.id &&
    Math.abs(readyDebit-(immediateReadyCommitment+readyCarryReserve))<0.011,
  `debit=${fM(readyDebit)}, immediate=${fM(immediateReadyCommitment)}, carry=${fM(readyCarryReserve)}, days=${readyDays}, pendingHull=${_pendingLaunch&&_pendingLaunch.hullId}`);
issue.expect('ready-hull action quotes immediate flight commitment and operating carry separately',
  readyActionSurface.includes(fM(immediateReadyCommitment)) && readyActionSurface.includes(fM(readyCarryReserve)),
  `action=${(readyActionSurface.match(/<button[^>]*>Fly from hangar<\/button>/)||['missing'])[0]}, immediate=${fM(immediateReadyCommitment)}, carry=${fM(readyCarryReserve)}`);

// Affordability gate: the readout's explicit Launch cost is affordable, but the
// prebuilt-aware gate silently includes another operating month. Keep this
// mismatch separate from the correctly measured execution debit above.
newGame('engineer');
mission=MISSIONS.find(m=>m.id==='first_flight');
state.activeMission=mission.id;
vehicle=computeVehicle();
state.money=round2(vehicle.launchCost+0.01);
const affordability=canLaunch(vehicle,mission,null,true);
issue.expect('ready hull is affordable at the displayed launch price', affordability.ok,
  `money=${state.money.toFixed(2)}, displayed launch=${vehicle.launchCost.toFixed(2)}, reason=${affordability.why||'none'}`);
issue.expect('ready-hull rejection does not claim the already-built hull is unpaid',
  affordability.ok || !/build, test, and fly/i.test(affordability.why||''),
  affordability.why||'');
issue.finish();
