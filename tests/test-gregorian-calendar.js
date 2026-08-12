// Gregorian calendar foundation (Time Granularity epic, items 4c/5). Replaces the flat
// 30-day/360-day abstraction with a real Gregorian calendar: variable month lengths, real
// leap years, and an ephemeris re-derived from the real 365.2425-day year. DAYS_PER_MONTH
// stays as a NOMINAL duration unit (see the block comment above MONTH_LENGTHS in sim.js) for
// builds/research/rate conversions -- it no longer governs the calendar itself.
let g4Pass=0, g4Fail=0;
function g4Check(name, cond, detail){
  if(cond) g4Pass++;
  else { g4Fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}

console.log('Gregorian calendar foundation');

/* ---------- leap year rule ---------- */
const KNOWN_LEAP = [2000, 2024, 1944, 1948, 2096, 2400];
const KNOWN_NON_LEAP = [1900, 2100, 1943, 1945, 2001, 2200, 2300];
for(const y of KNOWN_LEAP) g4Check('isLeapYear('+y+') true', isLeapYear(y)===true);
for(const y of KNOWN_NON_LEAP) g4Check('isLeapYear('+y+') false', isLeapYear(y)===false);
g4Check('century rule: 1900 not leap despite /4', !isLeapYear(1900));
g4Check('400 rule: 2000 leap despite /100', isLeapYear(2000));
g4Check('400 rule: 2400 leap despite /100', isLeapYear(2400));

/* ---------- month lengths ---------- */
g4Check('February is 28 in a non-leap year', monthLength(1943,1)===28);
g4Check('February is 29 in a leap year', monthLength(1944,1)===29);
g4Check('January is 31', monthLength(1943,0)===31);
g4Check('April is 30', monthLength(1943,3)===30);
{
  let sum1943=0, sum1944=0;
  for(let m=0;m<12;m++){ sum1943+=monthLength(1943,m); sum1944+=monthLength(1944,m); }
  g4Check('non-leap year months sum to 365', sum1943===365, sum1943);
  g4Check('leap year months sum to 366', sum1944===366, sum1944);
}

/* ---------- epoch anchor ---------- */
g4Check('absDay 0 is 1 Jan 1942', dayToDate(0)==='1 Jan 1942');
{
  const realSave={year:1942,month:0,day:0};
  const oldState={year:state.year,month:state.month,day:state.day};
  state.year=1942; state.month=0; state.day=0;
  g4Check('absDay() at initial game state is 0', absDay()===0);
  state.year=oldState.year; state.month=oldState.month; state.day=oldState.day;
}

/* ---------- round-trip: absDayOf -> dayToDate -> re-derive, across a wide span ---------- */
{
  let bad=0;
  const samples=[];
  for(let y=1900; y<=2300; y+=7){
    for(let m=0; m<12; m+=3){
      samples.push([y,m,0]);
      samples.push([y,m,monthLength(y,m)-1]); // last real day of that month, not day 30/31 blindly
    }
  }
  samples.push([1944,1,28]); // 29 Feb 1944 (leap day) -- 0-indexed day 28 = the 29th
  samples.push([1943,1,27]); // 28 Feb 1943 (last day of a non-leap Feb) -- 0-indexed day 27
  samples.push([1942,0,0]);  // epoch
  samples.push([1941,11,30]); // day before epoch: 31 Dec 1941
  for(const [y,m,d] of samples){
    const abs = absDayOf(y,m,d);
    const parts = absDayToParts(abs);
    if(parts.y!==y || parts.m!==m || parts.d!==d) bad++;
  }
  g4Check('round-trip absDayOf -> absDayToParts is exact across '+samples.length+' sampled dates', bad===0, bad+' mismatches');
}

/* ---------- dayToDate formatting matches expected real calendar dates ---------- */
g4Check('day before epoch is 31 Dec 1941', dayToDate(-1)==='31 Dec 1941');
g4Check('absDayOf(1944,1,28) is 29 Feb 1944 (leap day)', dayToDate(absDayOf(1944,1,28))==='29 Feb 1944');
g4Check('absDayOf(1943,1,27) is 28 Feb 1943 (last day, non-leap)', dayToDate(absDayOf(1943,1,27))==='28 Feb 1943');
g4Check('absDayOf(1943,2,0) is 1 Mar 1943 (day after non-leap Feb ends)', dayToDate(absDayOf(1943,2,0))==='1 Mar 1943');
g4Check('absDayOf(1944,2,0) is 1 Mar 1944 (day after leap Feb ends)', dayToDate(absDayOf(1944,2,0))==='1 Mar 1944');
g4Check('one real year after epoch is 1 Jan 1943', dayToDate(daysInYear(1942))==='1 Jan 1943');

/* ---------- advanceDays() rolls over at REAL month boundaries, not a flat 30 ---------- */
{
  const saved={year:state.year,month:state.month,day:state.day};
  state.year=1943; state.month=0; state.day=30; // last real day of January (31 days, 0-indexed 0-30)
  const beforeMonth=state.month;
  advanceDays(1);
  g4Check('advanceDays crosses Jan(31) -> Feb correctly', state.month===1 && state.day===0,
    'month='+state.month+' day='+state.day);
  g4Check('did not roll over early (Jan genuinely has 31 days)', beforeMonth===0);

  state.year=1943; state.month=1; state.day=27; // last day of non-leap Feb (28 days, index 27)
  advanceDays(1);
  g4Check('advanceDays crosses non-leap Feb(28) -> Mar correctly', state.month===2 && state.day===0,
    'month='+state.month+' day='+state.day);

  state.year=1944; state.month=1; state.day=27; // 28 Feb in a leap year -- should NOT roll over yet
  advanceDays(1);
  g4Check('advanceDays does NOT roll over Feb early in a leap year', state.month===1 && state.day===28,
    'month='+state.month+' day='+state.day);
  advanceDays(1);
  g4Check('advanceDays crosses leap Feb(29) -> Mar correctly', state.month===2 && state.day===0,
    'month='+state.month+' day='+state.day);

  state.year=1943; state.month=11; state.day=30; // last day of December
  advanceDays(1);
  g4Check('advanceDays crosses Dec(31) -> Jan of next year, incrementing year', state.year===1944 && state.month===0 && state.day===0,
    'year='+state.year+' month='+state.month+' day='+state.day);

  state.year=saved.year; state.month=saved.month; state.day=saved.day;
}

/* ---------- ephemeris: real year, and the design-comment's own claimed figures hold ---------- */
g4Check('GAME_YEAR_DAYS is the real Gregorian average (365.2425), not 360', Math.abs(GAME_YEAR_DAYS-365.2425)<1e-9, GAME_YEAR_DAYS);
g4Check('DAYS_PER_MONTH derives from it (GAME_YEAR_DAYS/12)', Math.abs(DAYS_PER_MONTH-GAME_YEAR_DAYS/12)<1e-9);
{
  const earth=GAME_YEAR_DAYS, mars=GAME_YEAR_DAYS*Math.pow(1.524,1.5);
  const synodic=1/(1/earth-1/mars);
  g4Check('Mars period lands near the design comment\'s claimed 687.16 game-days', Math.abs(mars-687.16)<0.1, mars);
  g4Check('Earth-Mars synodic period lands near the design comment\'s claimed 779.6 game-days', Math.abs(synodic-779.6)<0.1, synodic);
  g4Check('synodic period in nominal months is close to the historical ~25.6 figure', Math.abs(synodic/DAYS_PER_MONTH-25.6)<0.1, synodic/DAYS_PER_MONTH);
}

/* ---------- performance regression guard: this is the exact bug that caused
   tests/test-gate3-reorganization-contract.js to time out during Stage 1 implementation.
   daysBeforeYear/yearForDay must be O(1)-ish (closed-form + tiny correction), not a
   year-by-year loop from 1942 -- a late-game state near year 2100 must not do ~160
   iterations on every single date lookup. */
{
  const iterations=20000;
  const t0=Date.now();
  for(let i=0;i<iterations;i++){ dayToDate(i*137); } // scattered absDay values, including far-future
  const elapsed=Date.now()-t0;
  g4Check('dayToDate() stays fast at scale ('+iterations+' calls spanning ~7500 years in '+elapsed+'ms)',
    elapsed<500, elapsed+'ms (regression guard against the O(years)-per-call bug)');
}

/* ---------- GAME_TRUTH.calendar documents the real rule, not the old flat abstraction ---------- */
g4Check('GAME_TRUTH.calendar no longer claims a flat 30-day month', GAME_TRUTH.calendar.daysPerMonth===undefined);
g4Check('GAME_TRUTH.calendar states the real rule', /Gregorian/.test(GAME_TRUTH.calendar.rule||''));
g4Check('GAME_TRUTH.calendar.nominalMonthDays matches DAYS_PER_MONTH', Math.abs(GAME_TRUTH.calendar.nominalMonthDays-DAYS_PER_MONTH)<1e-9);

console.log('\n'+g4Pass+' passed, '+g4Fail+' failed');
if(g4Fail) process.exit(1);
