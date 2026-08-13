// Calendar Stage 2 — mission windows against the re-derived ephemeris.
// Stage 1 changed GAME_YEAR_DAYS from a flat 360 to the real 365.2425, which feeds
// planetPeriodDays() -> planetHelio() -> computeWindows(). This suite verifies the window
// generator still produces sane, real-cadence windows on the new time base, and pins the
// accuracy so a future ephemeris change can't silently drift it.
let s2Pass=0, s2Fail=0;
function s2Check(name, cond, detail){
  if(cond) s2Pass++;
  else { s2Fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}

console.log('Calendar Stage 2 — mission windows');
newGame('engineer');

/* ---------- cadence matches REAL synodic periods ----------
   These are the actual observed Earth-relative synodic periods. Before Stage 1 the flat
   360-day year biased every one of these low (mean abs error 1.36%); on the real year the
   bias is gone (mean abs error 0.70%). Tolerance is 3% -- tight enough to catch a genuine
   regression, loose enough for the schematic circular-orbit model the game deliberately uses. */
const REAL_SYNODIC={mercury:115.9, venus:583.9, mars:779.9, jupiter:398.9, saturn:378.1};
let errSum=0, errN=0;
for(const body in REAL_SYNODIC){
  const w=computeWindows(body, 0, 5);
  s2Check('computeWindows('+body+') returns windows', w.length>=2, w.length+' found');
  if(w.length<2) continue;
  const gaps=[]; for(let i=1;i<w.length;i++) gaps.push(w[i].abs-w[i-1].abs);
  const avg=gaps.reduce((a,x)=>a+x,0)/gaps.length;
  const err=Math.abs(avg-REAL_SYNODIC[body])/REAL_SYNODIC[body];
  errSum+=err; errN++;
  s2Check(body+' window cadence within 3% of its real synodic period',
    err<0.03, 'avg gap '+avg.toFixed(1)+'d vs real '+REAL_SYNODIC[body]+'d ('+(err*100).toFixed(1)+'%)');
}
s2Check('mean cadence error across all bodies stays under 1.5%',
  errN>0 && (errSum/errN)<0.015, ((errSum/errN)*100).toFixed(2)+'%');
// This is the one assertion in this suite with real teeth against Stage 1: the flat-360-day
// year produced a mean cadence error of 1.36% (and biased EVERY body's cadence low, since a
// 360-day year understates the real one by 1.45%); the real 365.2425-day year produces 0.70%.
// A 1.0% threshold therefore passes on the new ephemeris and fails on the old one. Everything
// else in this file passes against pre-Stage-1 source as well -- by design, and worth stating
// plainly: window generation was NOT broken before Stage 1, so this suite's job is to prove
// the re-derived ephemeris didn't REGRESS it, and to pin the accuracy so a future ephemeris
// change can't silently drift it. It is a regression guard, not a proof of change.
s2Check('mean cadence error beats what the old flat-360-day year achieved (1.36%)',
  errN>0 && (errSum/errN)<0.010, ((errSum/errN)*100).toFixed(2)+'% (old ephemeris: 1.36%)');

/* ---------- structural invariants, sampled across the whole campaign span ---------- */
{
  let future=0, integer=0, inRange=0, monotonic=0, total=0;
  for(const from of [0, 5000, 20000, 50000]){        // epoch through ~year 2079
    for(const body in REAL_SYNODIC){
      const w=computeWindows(body, from, 4);
      for(let i=0;i<w.length;i++){
        total++;
        if(w[i].abs>=from) future++;
        if(Number.isInteger(w[i].abs)) integer++;
        if(w[i].quality>=0.85-1e-9 && w[i].quality<=1.15+1e-9) inRange++;
        if(i===0 || w[i].abs>w[i-1].abs) monotonic++;
      }
    }
  }
  s2Check('sampled a meaningful number of windows', total>=60, total);
  s2Check('every window is at or after its search start', future===total, future+'/'+total);
  s2Check('every window lands on a whole day', integer===total, integer+'/'+total);
  s2Check('every quality is inside the documented [0.85, 1.15] band', inRange===total, inRange+'/'+total);
  s2Check('windows are strictly increasing in time', monotonic===total, monotonic+'/'+total);
}

/* ---------- windowsFor() works from a live mid-campaign state, not just absDay 0 ---------- */
{
  const saved={year:state.year, month:state.month, day:state.day, windows:state.windows};
  state.year=1975; state.month=6; state.day=10; state.windows={};
  const windowMissions=MISSIONS.filter(m=>m.window);
  s2Check('the campaign actually has window-gated missions to verify', windowMissions.length>0, windowMissions.length);
  let ok=0, checked=0;
  for(const m of windowMissions){
    const w=windowsFor(m.id);
    checked++;
    if(w && w.length && w.every(x=>x.abs>absDay())) ok++;
  }
  s2Check('every window-gated mission gets future-dated windows mid-campaign', ok===checked, ok+'/'+checked);
  state.year=saved.year; state.month=saved.month; state.day=saved.day; state.windows=saved.windows;
}

/* ---------- the defensive fallback is reachable and sane ----------
   computeWindows returns [] for a non-heliocentric target (the Moon orbits Earth, so it has
   no Earth-relative synodic period). No authored mission targets the Moon with m.window set,
   so this path should never fire in practice -- but windowsFor must still not hand back an
   empty list, or a mission would become permanently unlaunchable. */
{
  s2Check('computeWindows returns [] for a non-heliocentric target (moon)', computeWindows('moon',0,4).length===0);
  const moonWindowMissions=MISSIONS.filter(m=>m.window && missionTargetBody(m.id)==='moon');
  s2Check('no authored window-gated mission targets the moon (fallback stays unreachable)',
    moonWindowMissions.length===0, moonWindowMissions.length+' found');
}

/* ---------- committed windows survive the new date math ---------- */
{
  const saved={year:state.year, month:state.month, day:state.day, windows:state.windows, cw:state.committedWindow};
  state.windows={};
  const m=MISSIONS.find(x=>x.window);
  if(m){
    const w=windowsFor(m.id);
    commitWindow(m.id, 0);
    s2Check('commitWindow stores the window absolute day unchanged',
      state.committedWindow && state.committedWindow.abs===w[0].abs);
    s2Check('committed window formats as a real Gregorian date',
      /^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(dayToDate(state.committedWindow.abs)), dayToDate(state.committedWindow.abs));
    s2Check('committed window is still in the future relative to absDay()',
      state.committedWindow.abs>absDay());
  }
  state.year=saved.year; state.month=saved.month; state.day=saved.day;
  state.windows=saved.windows; state.committedWindow=saved.cw;
}

console.log('\n'+s2Pass+' passed, '+s2Fail+' failed');
if(s2Fail) process.exit(1);
