// Gate 1C — one pure quote/timing authority and the locked First Flight baseline.
let g1QuotePass=0, g1QuoteFail=0;
function g1QuoteCheck(name,cond){ if(cond) g1QuotePass++; else { g1QuoteFail++; console.log('FAIL:',name); } }
function g1QuoteNear(a,b){ return Math.abs(a-b)<0.0001; }

const g1QuoteInput={prebuilt:false,trackedBuild:true,window:false,buildCost:.44,launchCost:.14,
  buildMonths:2,launchMonths:1,monthlyBurn:.12,money:3.5,nowAbsDay:0,reliability:.65};
const g1QuoteInputBefore=JSON.stringify(g1QuoteInput);
const g1QuoteA=calculateLaunchQuote(g1QuoteInput), g1QuoteB=calculateLaunchQuote(g1QuoteInput);
g1QuoteCheck('pure quote is deterministic', JSON.stringify(g1QuoteA)===JSON.stringify(g1QuoteB));
g1QuoteCheck('pure quote does not mutate its input', JSON.stringify(g1QuoteInput)===g1QuoteInputBefore);
g1QuoteCheck('quote separates build, carry, flight, reserve, and mission carry',
  ['buildCost','buildCarry','flightBurn','launchCarry','missionCarry'].every(k=>typeof g1QuoteA[k]==='number'));
g1QuoteCheck('quote separates cash due now from end-to-end runway',
  g1QuoteA.requiredAtCommit===.44&&g1QuoteA.endToEndRunway===.94);
// Re-pinned 2026-08-18: these asserted literal 30-day months (60/30/90). The Gregorian calendar
// rework made DAYS_PER_MONTH a real nominal average (~30.4368), so daysFor(2) is 61, not 60 --
// these were left failing by that epic and only surfaced now. Derived from daysFor() so they
// track the constant instead of a hardcoded month length. The DURATIONS are unchanged.
g1QuoteCheck('quote timing is whole-day deterministic',
  g1QuoteA.buildDays===daysFor(2)&&g1QuoteA.launchDays===daysFor(1)&&g1QuoteA.nominalFlightAbs===daysFor(3));
g1QuoteCheck('quote exposes modeled outcome probability without certifying it', g1QuoteA.successProbability===.65);
const g1QuoteShort=calculateLaunchQuote(Object.assign({},g1QuoteInput,{money:.40}));
g1QuoteCheck('rejection has a stable reason code and exact shortfall',
  !g1QuoteShort.canCommit&&g1QuoteShort.rejection.code==='BUILD_CASH'&&g1QuoteShort.rejection.shortfall===.04);

newGame('engineer');
const g1QuoteMission=curMission(), g1QuoteVehicle=computeVehicle();
const g1QuoteOpening=launchCommitmentQuote(g1QuoteMission,g1QuoteVehicle,null,false);
g1QuoteCheck('Engineer opens with $3.50M', g1QuoteNear(state.money,3.50));
g1QuoteCheck('First Flight build commitment remains $0.44M', g1QuoteNear(g1QuoteOpening.buildCost,.44));
g1QuoteCheck('First Flight build duration remains two months', g1QuoteOpening.buildDays===daysFor(2));
g1QuoteCheck('First Flight build carry is explicitly $0.24M', g1QuoteNear(g1QuoteOpening.buildCarry,.24));
g1QuoteCheck('First Flight later flight burn remains $0.14M', g1QuoteNear(g1QuoteOpening.flightBurn,.14));
g1QuoteCheck('First Flight ready reserve remains $0.12M', g1QuoteNear(g1QuoteOpening.launchCarry,.12));
g1QuoteCheck('First Flight nominal build-through-launch duration remains three months',
  g1QuoteOpening.nominalFlightAbs-g1QuoteOpening.nominalReadyAbs===daysFor(1)&&g1QuoteOpening.nominalFlightAbs-absDay()===daysFor(3));
g1QuoteCheck('First Flight modeled reliability remains 65%', g1QuoteNear(g1QuoteOpening.successProbability,.65));
g1QuoteCheck('opening quote is additive disclosure, not a balance change',
  g1QuoteNear(g1QuoteOpening.endToEndRunway,.94)&&g1QuoteOpening.requiredAtCommit===g1QuoteOpening.buildCost);
const g1QuoteLabel=launchButtonLabel(g1QuoteMission,g1QuoteVehicle,null);
g1QuoteCheck('primary label discloses build-now, later burn, and reserve stages',
  g1QuoteLabel.includes('$0.44M')&&g1QuoteLabel.includes('$0.14M')&&g1QuoteLabel.includes('$0.12M'));

state.money=100; queueBuild(true,'g1-ready'); while(buildQueueList().length) advanceDays(1);
const g1QuoteReady=launchCommitmentQuote(curMission(),computeVehicle(),null,true);
g1QuoteCheck('ready-hull projection removes the departing hull maintenance charge',
  g1QuoteNear(g1QuoteReady.launchCarry,.12)&&g1QuoteNear(g1QuoteReady.requiredAtFlight,.26));
g1QuoteCheck('quote calculation never writes a live launch transaction', state.launchTxn===null);

newGame('engineer'); state.money=100;
const g1WindowMission=curMission(), g1WindowOriginal=g1WindowMission.window;
g1WindowMission.window=true;
state.engineStock={a4:1}; state.engineStockTested={a4:1};
state.partStock={'tank:standard':1}; state.partStockTested={'tank:standard':1};
const g1WindowVehicle=computeVehicle();
const g1WindowPreview=launchCommitmentQuote(g1WindowMission,g1WindowVehicle,null,false);
state.committedWindow={missionId:g1WindowMission.id,abs:g1WindowPreview.nominalFlightAbs,quality:1};
const g1WindowView=launchCommitmentActionView(g1WindowMission,g1WindowVehicle,null);
g1QuoteCheck('window quote snapshots prepaid stock credit and saved assembly days',
  g1WindowView.check.ok&&g1WindowView.quote.stockAdjustedBuild&&g1WindowView.quote.buildCredit>0&&
  g1WindowView.quote.buildSaveDays>0&&g1WindowView.quote.buildDays<g1WindowView.quote.listedBuildDays);
const g1WindowAdvance=advanceDays, g1WindowWeather=rollWeather, g1WindowProceed=proceedLaunch;
let g1WindowAdvanced=-1;
advanceDays=d=>{ g1WindowAdvanced=d; }; rollWeather=()=>({adverse:false}); proceedLaunch=()=>{ _flightResolving=false; };
const g1WindowMoneyBefore=state.money, g1WindowEngineBefore=engineStockCount('a4'), g1WindowPartBefore=partStockCount('tank:standard');
const g1WindowLaunched=launch(false,null,g1WindowView.action.id);
g1QuoteCheck('window execution consumes the exact quoted cash and stock snapshot',
  g1WindowLaunched===true&&g1QuoteNear(g1WindowMoneyBefore-state.money,g1WindowView.quote.buildCost+g1WindowView.quote.flightBurn)&&
  engineStockCount('a4')===g1WindowEngineBefore-1&&partStockCount('tank:standard')===g1WindowPartBefore-1);
g1QuoteCheck('window execution consumes the exact quoted lead-time snapshot',
  g1WindowAdvanced===g1WindowView.quote.buildDays+g1WindowView.quote.preparationDays+g1WindowView.quote.launchDays);
advanceDays=g1WindowAdvance; rollWeather=g1WindowWeather; proceedLaunch=g1WindowProceed; g1WindowMission.window=g1WindowOriginal;

console.log(`${g1QuotePass}/${g1QuotePass+g1QuoteFail} checks passed`);
process.exitCode=g1QuoteFail?1:0;
