// Calendar Stage 3 (Time Granularity 4c) — day-scale duration minimums.
// Before this, buildMonths() ended in Math.max(1, mo): a hard 1-month floor, so a heavily
// researched, bay-accelerated, booster-reflown build still took a full month. The build
// pipeline was ALREADY day-scale internally (orders decrement o.monthsLeft by perDay(1)
// every day, research decrements fractionally too), so the floor was the only thing forcing
// a whole month. It is now floored in DAYS, reusing ENGINE_BUILD_FLOOR_DAYS.
let s3Pass=0, s3Fail=0;
function s3Check(name, cond, detail){
  if(cond) s3Pass++;
  else { s3Fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}

console.log('Calendar Stage 3 — day-scale duration floors (4c)');

/* ---------- the floor is now expressed in days, not a forced whole month ---------- */
{
  const floorMonths = ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH;
  s3Check('build floor is below one month (the 4c point)', floorMonths<1, floorMonths.toFixed(3)+' mo');
  s3Check('build floor converts back to exactly ENGINE_BUILD_FLOOR_DAYS whole days',
    daysFor(floorMonths)===ENGINE_BUILD_FLOOR_DAYS, daysFor(floorMonths)+'d vs '+ENGINE_BUILD_FLOOR_DAYS+'d');
  s3Check('build floor reuses the launch-quote pipeline constant rather than a new magic number',
    ENGINE_BUILD_FLOOR_DAYS===8, ENGINE_BUILD_FLOOR_DAYS);
}

/* ---------- buildMonths clamps to the day floor, never below, and never to a forced 1 ---------- */
{
  newGame('engineer');
  const m=MISSIONS[0];
  const floorMonths = ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH;
  const base = buildMonths(m);
  s3Check('a default build is still a normal multi-month job (no accidental collapse)',
    base>=1, base+' mo');
  s3Check('buildMonths never returns below the day floor', base>=floorMonths-1e-9);

  // Drive every build-shortening lever hard enough to push the raw figure below one month,
  // which under the old Math.max(1, mo) would have been silently clamped back up to 1.
  const savedResearch=state.research;
  state.research=Object.assign({}, state.research||{});
  for(const r of (RESEARCH||[])) if(/manufactur|ground/i.test(r.name||'')) state.research[r.id]=true;
  const cut = typeof buildTimeCut==='function' ? buildTimeCut() : 0;
  s3Check('build-time research actually reduces the raw month figure', cut>0, 'cut='+cut);
  const shortened = buildMonths(m);
  // This is the assertion with real teeth against the old code: under Math.max(1, mo) a
  // fully-shortened build clamped to exactly 1 month and could never go below it.
  s3Check('a fully-shortened build is allowed BELOW one month (the old floor forbade this)',
    shortened<1, 'shortened='+shortened.toFixed(3)+' mo (old code clamped this to exactly 1)');
  s3Check('a fully-shortened build still respects the day floor', shortened>=floorMonths-1e-9,
    shortened.toFixed(3)+' vs floor '+floorMonths.toFixed(3));
  state.research=savedResearch;
}

/* ---------- the day-scale duration survives the launch-quote pipeline ---------- */
{
  newGame('engineer');
  const floorMonths = ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH;
  const q = calculateLaunchQuote({prebuilt:false, trackedBuild:true, window:false,
    stockAdjustedBuild:false, buildCost:1, buildCredit:0, buildSaveDays:0,
    buildFloorCost:0, buildFloorDays:0, stock:null, launchCost:1, testCost:0,
    rehearsalCost:0, buildMonths:floorMonths, testMonths:0, rehearsalMonths:0,
    launchMonths:0, missionDays:0, monthlyBurn:1, money:100, nowAbsDay:0,
    windowAbs:null, reliability:.9});
  s3Check('a sub-month build produces a whole-day buildDays in the quote',
    Number.isInteger(q.buildDays), q.buildDays);
  s3Check('a sub-month build schedules ready in days, not a rounded-up month',
    q.buildDays===ENGINE_BUILD_FLOOR_DAYS, q.buildDays+'d');
  s3Check('nominalReadyAbs advances by exactly that many days',
    q.nominalReadyAbs===q.buildDays, q.nominalReadyAbs);
}

/* ---------- fmtTimeLeft renders sub-month durations honestly ----------
   Regression guard for a real display bug introduced by the Stage 1 calendar work and caught
   here: DAYS_PER_MONTH became fractional, and the old implementation derived both the month
   and day parts from a ceil'd total-day count, producing strings like
   "1 mo 0.5631249999999994 d" in the live build queue -- and, once that was floored, an exact
   one-month duration rendering as "1 mo 1 d". */
{
  s3Check('sub-month duration renders as days', fmtTimeLeft(0.5)==='16 d', fmtTimeLeft(0.5));
  s3Check('the build floor itself renders as days', /^\d+ d$/.test(fmtTimeLeft(ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH)),
    fmtTimeLeft(ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH));
  s3Check('an exact whole month renders as "1 mo", with no stray day', fmtTimeLeft(1)==='1 mo', fmtTimeLeft(1));
  s3Check('an exact multi-month renders cleanly', fmtTimeLeft(12)==='12 mo', fmtTimeLeft(12));
  s3Check('a mixed duration renders whole days only', fmtTimeLeft(1.3)==='1 mo 9 d', fmtTimeLeft(1.3));
  s3Check('no fractional day ever appears in a rendered duration',
    [0,0.01,0.2,0.5,1,1.3,2,2.5,3.7,12,25.6].every(v=>!/\d\.\d/.test(fmtTimeLeft(v))));
  s3Check('a zero duration renders as 0 d', fmtTimeLeft(0)==='0 d', fmtTimeLeft(0));
  s3Check('a tiny nonzero duration never renders as 0 d', fmtTimeLeft(0.001)==='1 d', fmtTimeLeft(0.001));
}

/* ---------- a queued sub-month order actually completes in days ---------- */
{
  newGame('engineer');
  const floorMonths = ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH;
  state.buildQueue=[{id:'ord-test', name:'Test order', missionId:MISSIONS[0].id,
    monthsTotal:floorMonths, monthsLeft:floorMonths, cost:1, status:'queued',
    started:true, committed:false, units:1}];
  const before=state.buildQueue.length;
  s3Check('a sub-month order can be queued', before===1);
  advanceDays(ENGINE_BUILD_FLOOR_DAYS+1);
  s3Check('a sub-month order completes within its day-scale duration, not a full month',
    state.buildQueue.length===0, state.buildQueue.length+' still queued after '+(ENGINE_BUILD_FLOOR_DAYS+1)+' days');
}

console.log('\n'+s3Pass+' passed, '+s3Fail+' failed');
if(s3Fail) process.exit(1);
