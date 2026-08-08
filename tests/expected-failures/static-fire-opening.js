// G0-B05: follow the recommended R&D project with the separately, prominently
// offered bench static fire. This fixture proves only that its enabled Fly action
// is blocked despite the displayed launch price being affordable; it does not
// claim that the company has no eventual recovery route.
const issue=createExpectedFailureTracker('G0-B05','Research plus prominent bench static fire blocks a displayed-affordable hull');
animEnabled=false;
seedRNG(7);
newGame('engineer');

buyResearch('test_program');
while(state.activeResearch && !state.over) advanceDays(1);
issue.setup('recommended Static Fire Test Program research completes',
  !!state.research.test_program && !state.activeResearch && !state.over,
  `researched=${!!state.research.test_program}, active=${state.activeResearch&&state.activeResearch.id}, over=${state.over}`);
const beforeStaticFire=state.money;
staticFire();
issue.setup('prominently offered bench static fire executes once',
  Math.abs(state.money-(beforeStaticFire-STATIC_FIRE_COST))<0.011,
  `before=${beforeStaticFire.toFixed(2)}, after=${state.money.toFixed(2)}, cost=${STATIC_FIRE_COST.toFixed(2)}`);
state.activeMission='first_flight';
queueBuild(true);
while(buildQueueList().length && !state.over) advanceDays(1);

const ready=hangarFor(curMission());
const vehicle=computeVehicle();
const check=canLaunch(vehicle,curMission(),null,true);
const visibleLaunchCostAffordable=state.money>=vehicle.launchCost;
const surface=benchQueueHTML(curMission());
const flyAction=ready[0]&&`onclick="launchFromHangar('${ready[0].id}')"`;
let readoutSurface='';
const originalSetHTML=setHTML;
setHTML=(el,html)=>{
  if(String(html).includes('Launch cost')) readoutSurface=String(html);
  return originalSetHTML(el,html);
};
renderReadout();
setHTML=originalSetHTML;

issue.setup('research and bench-test path produces one ready First Flight hull', ready.length===1,
  `hangar=${ready.length}, over=${state.over}, money=${state.money.toFixed(2)}`);
issue.setup('the exact ready-hull Fly action is surfaced and enabled',
  !!flyAction && surface.includes(flyAction) && !/onclick="launchFromHangar\([^)]*\)"[^>]*disabled/.test(surface),
  `action=${flyAction||'missing'}, surface=${surface.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}`);
issue.setup('Bench readout surfaces the exact launch cost used for the affordability comparison',
  readoutSurface.includes('Launch cost') && readoutSurface.includes(fM(vehicle.launchCost)),
  `displayed=${fM(vehicle.launchCost)}, readoutCaptured=${!!readoutSurface}`);
issue.expect('the enabled ready-hull action honors displayed launch-cost affordability',
  !visibleLaunchCostAffordable || check.ok,
  `money=${state.money.toFixed(2)}, displayed launch=${vehicle.launchCost.toFixed(2)}, reason=${check.why||'none'}`);
const flightsBefore=state.flights;
if(ready[0]) launchFromHangar(ready[0].id);
issue.expect('activating the enabled, displayed-affordable action consumes that exact hull',
  !visibleLaunchCostAffordable || !hangarList().some(rec=>rec.id===ready[0].id) || state.flights>flightsBefore,
  `order=${ready[0]&&ready[0].id}, stillReady=${!!(ready[0]&&hangarList().some(rec=>rec.id===ready[0].id))}, flights=${flightsBefore}->${state.flights}`);
restoreRNG();
issue.finish();
