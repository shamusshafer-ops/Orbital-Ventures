// Gate 3 bounded economy-truth slice: G0-B05 opening runway, explicit division
// capitalization, live recurring projections, and truthful opening/test copy.
let g3Pass=0, g3Fail=0;
function g3Check(name,cond,detail){
  if(cond) g3Pass++;
  else { g3Fail++; console.log('FAIL:',name,detail||''); }
}
function g3Near(a,b,eps){ return Math.abs(a-b)<(eps||0.011); }

// Experience remains valuable, but only explicit training establishes standing OPEX.
newGame('engineer');
state.money=100;
const g3DivisionResearch=RESEARCH.find(r=>r.id==='test_program');
const g3QualityBefore=divisionQuality('structures');
divisionGainExp(g3DivisionResearch);
g3Check('research experience still raises division quality', divisionQuality('structures')>g3QualityBefore);
g3Check('experience-only division has no standing OPEX', g3Near(empireOpex(),0));
let g3TrainOffer=canTrainDivision('structures');
g3Check('first training action exposes its exact recurring-cost delta',
  g3TrainOffer.establishes && g3TrainOffer.upkeepDelta===EMPIRE_DIV_OPEX &&
  /establishes \$0\.25M\/mo standing ops/.test(g3TrainOffer.disclosure));
renderDivisions();
let g3DivisionHTML=$('divisionsCard').innerHTML;
g3Check('first training discloses establishment and $0.25M/mo standing operations',
  g3DivisionHTML.includes('establishes $0.25M/mo standing ops'));
state.money=0;
renderDivisions();
g3Check('unaffordable first training still discloses its recurring cost',
  $('divisionsCard').innerHTML.includes('Not enough capital. · establishes $0.25M/mo standing ops'));
state.money=100;
trainDivision('structures');
g3Check('first explicit training activates exactly one division OPEX', g3Near(empireOpex(),EMPIRE_DIV_OPEX));
g3Check('capitalization log discloses the new recurring cost',
  state.log.some(e=>/trained and established/.test(e.msg||'') && /\+\$0\.25M\/mo standing operations/.test(e.msg||'')));
renderDivisions();
g3DivisionHTML=$('divisionsCard').innerHTML;
g3Check('later training discloses no additional upkeep', g3DivisionHTML.includes('no additional upkeep'));
g3TrainOffer=canTrainDivision('structures');
g3Check('later training action reports zero upkeep delta',
  !g3TrainOffer.establishes && g3TrainOffer.upkeepDelta===0 && g3TrainOffer.disclosure==='no additional upkeep');

// Current projections ignore deliberately stale historical ledger values.
newGame('engineer');
state.money=1.2;
state.lastMonth={revenue:99,expenses:0,net:99,flights:0};
g3Check('live recurring authority reports the current Engineer burn',
  liveRecurringEconomy().net===-0.12);
g3Check('runway uses live recurring economy, not stale positive lastMonth', g3Near(runwayMonths(),10,0.0001));
let g3MissionEconomics=missionNetEconomics(curMission(),computeVehicle(),null);
g3Check('mission net economics uses live negative recurring cashflow',
  g3MissionEconomics.monthlyNet===-0.12 && g3MissionEconomics.carryCost===0.36);
state.passiveContracts=[{id:'test-live-income',monthsLeft:12,income:1}];
state.lastMonth={revenue:0,expenses:99,net:-99,flights:0};
g3Check('runway immediately becomes infinite when live recurring net turns positive', runwayMonths()===Infinity);
g3MissionEconomics=missionNetEconomics(curMission(),computeVehicle(),null);
g3Check('mission projection immediately sees newly signed recurring income', g3MissionEconomics.monthlyNet===0.88);

// Opening and testing language must describe the actual ownership/risk layers.
const g3FirstFlight=MISSIONS.find(m=>m.id==='first_flight');
const g3TestProgram=RESEARCH.find(r=>r.id==='test_program');
g3Check('First Flight no longer promises intact vehicle recovery',
  !/back intact/i.test(g3FirstFlight.blurb) && /expended rather than returned intact/i.test(g3FirstFlight.blurb));
g3Check('research copy distinguishes the institutional program from the one-off Bench action',
  /permanent \+8%/.test(g3TestProgram.desc) && /separate from the one-off \$0\.35M Bench static fire action/.test(g3TestProgram.desc));

// Promoted G0-B05 exact path: same seed, research, one prominent Bench static
// fire, exact build, and rollout. No starting-capital/cost/payout/reserve buff.
animEnabled=false;
seedRNG(7);
newGame('engineer');
g3Check('Engineer starting capital remains $3.50M', state.money===3.5);
buyResearch('test_program');
while(state.activeResearch && !state.over) advanceDays(1);
g3Check('Static Fire Test Program completes without auto-activating division OPEX',
  !!state.research.test_program && g3Near(empireOpex(),0));
staticFire();
state.activeMission='first_flight';
queueBuild(true,'g0-b05-opening-promoted');
while(buildQueueList().length && !state.over) advanceDays(1);
const g3Ready=hangarFor(curMission());
const g3ReadyView=g3Ready[0]&&readyHullActionView(g3Ready[0]);
const g3Quote=g3ReadyView&&g3ReadyView.quote;
g3Check('exact opening path produces one solvent ready hull',
  g3Ready.length===1 && !state.over, `cash=${state.money}`);
g3Check('exact ready-hull action is enabled for its owned hull',
  !!g3ReadyView && g3ReadyView.action.enabled && g3ReadyView.action.subjectId===g3Ready[0].hullId);
g3Check('opening preserves authoritative flight runway plus one base-overhead month',
  !!g3Quote && g3Quote.canCommit && state.money-g3Quote.requiredAtCommit>=diff().overhead-0.0001,
  g3Quote?`cash=${state.money}, required=${g3Quote.requiredAtCommit}`:'no quote');
g3Check('locked economy constants remain unchanged',
  DIFFICULTY.engineer.startMoney===3.5 && g3FirstFlight.payout===1.6 &&
  g3Near(g3Quote.flightBurn,.14) && g3Near(g3Quote.launchCarry,.12));
restoreRNG();

console.log(`${g3Pass}/${g3Pass+g3Fail} checks passed`);
process.exitCode=g3Fail?1:0;
