// #115 slice 1 — Fleet Registry collector (assetRegistryGroups/assetRegistryCount). Pure data, so fully
// headless-testable: verifies empty state, each asset class appearing with the right status line + detail,
// the facility status line surfacing the most at-risk failure mode, in-flight physics enrichment
// (light-lag/conjunction), grouping order, and that the render body doesn't throw. Facilities are seeded
// directly (bypassing canFound's mission prereqs) since the collector reads state.facilities regardless
// of how a facility got there. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function seedFac(id, over){ state.facilities=state.facilities||{}; state.facilities[id]=Object.assign({built:true, modules:2, since:state.year, supply:6, starvedMonths:0, autoResupply:false, maintenanceEnabled:true, condition:80, crewIds:[], crewManaged:false, rotationDueAbs:absMonth()+12}, over||{}); }

newGame('engineer');

// ---------- 1. Empty state ----------
{
  state.activeFlights=[]; state.facilities={}; state.depot=0; state.scienceProgram=null;
  check('empty: no groups', assetRegistryGroups().length===0);
  check('empty: count 0', assetRegistryCount()===0);
}

// ---------- 2. Each class appears with the expected key ----------
{
  state.facilities={}; seedFac('leo_station');
  state.depot=42;
  state.scienceProgram={monthsLeft:20, sciPerMonth:2, health:80};
  state.activeFlights=[
    {id:'fltA', deferred:true, mission:'mars_orbit', name:'Mars Orbit', crew:0, launchAbs:absDay()-100, arriveAbs:absDay()+100, marginSnapshot:{rel:0.9,tightDv:300}},
    {id:'logB', deferred:true, kind:'logistics', facId:'leo_station', name:'Resupply', launchAbs:absDay()-10, arriveAbs:absDay()+10, monthsShipped:4},
  ];
  const keys=assetRegistryGroups().map(g=>g.key);
  check('has flights group', keys.includes('flights'));
  check('has logistics group', keys.includes('logistics'));
  check('has facilities group', keys.includes('facilities'));
  check('has depot group', keys.includes('depot'));
  check('has programs group', keys.includes('programs'));
  check('count sums all items', assetRegistryCount()===5);
}

// ---------- 3. Flight item: status, progress, recall action, physics enrichment ----------
{
  const fl=assetRegistryGroups().find(g=>g.key==='flights').items[0];
  check('flight: status shows % and ETA', /%/.test(fl.status) && /ETA/.test(fl.status));
  check('flight: pct is a number 0-100', fl.pct>=0 && fl.pct<=100);
  check('flight: has a recall/abort action wired to confirmAbortFlight', /confirmAbortFlight/.test(fl.action.fn));
  check('flight: detail includes reliability + tightest Δv margin', 'Reliability (at launch)' in fl.detail && 'Tightest Δv margin' in fl.detail);
  check('flight to Mars: detail includes one-way signal delay (light-lag enrichment)', Object.keys(fl.detail).some(k=>/Signal delay/.test(k)));
}

// ---------- 4. Logistics item ----------
{
  const lg=assetRegistryGroups().find(g=>g.key==='logistics').items[0];
  check('logistics: names its destination facility', lg.detail['Destination']==='LEO Station');
  check('logistics: shows provisions aboard', /mo$/.test(lg.detail['Provisions aboard']));
}

// ---------- 5. Facility status line surfaces the MOST at-risk failure mode ----------
{
  // healthy
  state.facilities={}; seedFac('leo_station', {condition:80, supply:6});
  let fac=assetRegistryGroups().find(g=>g.key==='facilities').items[0];
  check('facility healthy: status shows modules/condition/income, no warning', /mod/.test(fac.status) && !/⚠/.test(fac.status));

  // low supply dominates (the fastest killer)
  seedFac('leo_station', {condition:80, supply:1});
  fac=assetRegistryGroups().find(g=>g.key==='facilities').items[0];
  check('facility low-supply: status warns about supply first', /⚠/.test(fac.status) && /supply/.test(fac.status));

  // low condition warns when supply is fine
  seedFac('leo_station', {condition:20, supply:6});
  fac=assetRegistryGroups().find(g=>g.key==='facilities').items[0];
  check('facility low-condition: status warns about condition', /⚠/.test(fac.status) && /condition/.test(fac.status));

  check('facility detail: rich field set (location/condition/supply/income)', ['Location','Condition','Supply remaining','Income'].every(k=>k in fac.detail));
}

// ---------- 6. Depot + telescope ----------
{
  state.facilities={}; state.activeFlights=[]; state.depot=42; state.scienceProgram={monthsLeft:20, sciPerMonth:2, health:80};
  const dep=assetRegistryGroups().find(g=>g.key==='depot').items[0];
  check('depot: status shows tonnage', /42.*t/.test(dep.status));
  check('depot: detail includes a holding cost', 'Holding cost' in dep.detail);
  const tel=assetRegistryGroups().find(g=>g.key==='programs').items[0];
  check('telescope: status shows health + term', /health/.test(tel.status) && /mo left/.test(tel.status));

  // depot below the visibility threshold disappears
  state.depot=0.01;
  check('depot: hidden when essentially empty', !assetRegistryGroups().some(g=>g.key==='depot'));
}

// ---------- 7. Grouping order is stable (flights → logistics → facilities → depot → programs) ----------
{
  state.facilities={}; seedFac('leo_station');
  state.depot=42; state.scienceProgram={monthsLeft:20, sciPerMonth:2, health:80};
  state.activeFlights=[
    {id:'fltA', deferred:true, mission:'mars_orbit', name:'Mars Orbit', crew:0, launchAbs:absDay()-100, arriveAbs:absDay()+100, marginSnapshot:{}},
    {id:'logB', deferred:true, kind:'logistics', facId:'leo_station', name:'Resupply', launchAbs:absDay()-10, arriveAbs:absDay()+10, monthsShipped:4},
  ];
  const order=assetRegistryGroups().map(g=>g.key);
  check('group order: flights before facilities before programs', order.indexOf('flights')<order.indexOf('facilities') && order.indexOf('facilities')<order.indexOf('programs'));
}

// ---------- 8. Render body doesn't throw, empty or populated ----------
{
  let threw=false;
  try{
    fleetRegistryBodyHTML();
    state.facilities={}; state.activeFlights=[]; state.depot=0; state.scienceProgram=null;
    const empty=fleetRegistryBodyHTML();
    check('render: empty state shows a friendly message', /No active assets/.test(empty));
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('render: fleetRegistryBodyHTML never throws', !threw);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
