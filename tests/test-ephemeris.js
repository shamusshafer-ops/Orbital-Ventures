// E4.1 (2026-07-18): real on-rails Keplerian ephemeris replacing the old fake synodic model.
// Validates the physics against known real-world values (synodic period, transfer time, Hohmann
// phase lead), the Kepler solver, planet-position periodicity, and — critically — that the launch
// window MACHINERY (shape, consumers, non-window missions) is unchanged even though window
// dates/qualities intentionally now come from geometry instead of Math.random.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(3)} ≈ ${(+b).toFixed(3)} ±${tol})`, Math.abs(a-b)<=tol); }

newGame('engineer');

// ---------- Kepler solver: M = E − e·sinE must round-trip ----------
{
  for(const e of [0, 0.0167, 0.0934, 0.2056]){
    for(const M of [0, 0.5, 1.7, 3.0, 5.9]){
      const E = solveKepler(M, e);
      const Mback = E - e*Math.sin(E);
      const norm = x => ((x % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
      near(norm(Mback), norm(M), 1e-6, `Kepler round-trip e=${e} M=${M}`);
    }
  }
  check('Kepler: e=0 gives E==M exactly (circular orbit)', Math.abs(solveKepler(1.234, 0) - 1.234) < 1e-9);
}

// ---------- periods from Kepler's 3rd law (game-days = 360 · a^1.5) ----------
near(planetPeriodDays('earth'), 360, 1e-6, 'Earth period is exactly one game-year (360 game-days)');
near(planetPeriodDays('mars'), 360*Math.pow(1.5237,1.5), 0.5, 'Mars period = 360·a^1.5');
// real Mars sidereal period is 686.98 d vs Earth 365.256 → ratio 1.8808; in game-days that's ~677
near(planetPeriodDays('mars'), 360*(686.98/365.256), 3, 'Mars period matches the real Earth-relative ratio (~677 game-days)');
check('outer planets ordered by period (Jupiter < Saturn < Uranus < Neptune)',
  planetPeriodDays('jupiter') < planetPeriodDays('saturn') &&
  planetPeriodDays('saturn') < planetPeriodDays('uranus') &&
  planetPeriodDays('uranus') < planetPeriodDays('neptune'));

// ---------- Earth-Mars synodic period should fall out to ~769 game-days (~25.6 mo) ----------
{
  const Te = planetPeriodDays('earth'), Tm = planetPeriodDays('mars');
  const synodic = 1 / (1/Te - 1/Tm);
  near(synodic, 769, 6, 'Earth-Mars synodic period ~769 game-days (derived, not the old hardcoded 780)');
  // sanity: it's close to the old 26-month (780 game-day) constant it replaces
  check('synodic period is within a month of the old 26-mo constant', Math.abs(synodic-780) < 30);
}

// ---------- heliocentric positions: periodic and bounded by peri/aphelion ----------
{
  const p0 = planetHelio('mars', 0), p1 = planetHelio('mars', planetPeriodDays('mars'));
  near(p0.theta, p1.theta, 1e-3, 'Mars heliocentric longitude repeats after exactly one period');
  near(p0.r, p1.r, 1e-4, 'Mars Sun-distance repeats after one period');
  const ap = bodyPeriAp('mars');
  // scan a full orbit: r stays within [peri, ap], and both extremes are reached
  let rmin=1e9, rmax=-1e9;
  const T = planetPeriodDays('mars');
  for(let d=0; d<=T; d+=2){ const r=planetHelio('mars',d).r; rmin=Math.min(rmin,r); rmax=Math.max(rmax,r); }
  near(rmin, ap.peri, 0.01, 'Mars closest approach to Sun ≈ perihelion (a(1−e))');
  near(rmax, ap.ap, 0.01, 'Mars farthest ≈ aphelion (a(1+e))');
  check('Earth Sun-distance always ~1 AU (low eccentricity)', Math.abs(planetHelio('earth',123).r - 1) < 0.02);
}

// ---------- Hohmann transfer geometry: known Earth→Mars textbook values ----------
{
  const H = hohmannPhaseLead('mars');
  // ideal Earth→Mars Hohmann transfer time is ~259 real days = ~255 game-days
  near(H.tofDays, 0.5*360*Math.pow((1+1.5237)/2,1.5), 0.5, 'Hohmann transfer time = half the transfer-orbit period');
  near(H.tofDays, 255, 6, 'Earth→Mars transfer time ~255 game-days (~259 real days)');
  // classic required phase lead is ~44° ahead
  near(H.lead*180/Math.PI, 44.3, 3, 'Earth→Mars departure phase lead ≈ 44° (textbook)');
}

// ---------- windowsFor: same SHAPE as before, now physically derived ----------
{
  newGame('engineer');
  const wins = windowsFor('mars_orbit');
  check('windowsFor returns a non-empty list', Array.isArray(wins) && wins.length>0);
  check('each window has {abs, quality}', wins.every(w=> typeof w.abs==='number' && typeof w.quality==='number'));
  check('windows are in the future and chronological', wins.every((w,i)=> w.abs>=absDay() && (i===0 || w.abs>wins[i-1].abs)));
  check('quality stays in the intended payout-multiplier band [0.85,1.15]', wins.every(w=> w.quality>=0.849 && w.quality<=1.151));
  // consecutive Mars windows are ~one synodic period apart
  if(wins.length>=2){
    const gap = wins[1].abs - wins[0].abs;
    near(gap, 769, 40, 'consecutive Mars windows ~one synodic period apart');
  }
}

// ---------- quality VARIES across the ~15-year opposition cycle (the point of the feature) ----------
{
  // scan many windows into the future; Mars eccentricity should give both favorable & marginal ones
  const many = computeWindows('mars', absDay(), 8);
  check('a long horizon yields multiple windows', many.length>=6);
  const qs = many.map(w=>w.quality);
  const spread = Math.max(...qs) - Math.min(...qs);
  check('window quality genuinely varies with Mars orbital position (not constant)', spread > 0.08);
  check('at least one favorable (>1.08) window exists across the cycle', qs.some(q=>q>1.08));
  check('at least one marginal (<0.95) window exists across the cycle', qs.some(q=>q<0.95));
}

// ---------- determinism: same game-state → identical windows (no more Math.random) ----------
{
  newGame('engineer'); const a = JSON.stringify(computeWindows('mars', 500, 4));
  newGame('engineer'); const b = JSON.stringify(computeWindows('mars', 500, 4));
  check('windows are deterministic given the date (Math.random fully removed from window gen)', a===b);
}

// ---------- consumers still work: nextWindowFor / missionPlan / commitWindow ----------
{
  newGame('engineer');
  const nw = nextWindowFor('mars_orbit');
  check('nextWindowFor returns a populated descriptor', nw && typeof nw.abs==='number' && typeof nw.daysAway==='number' && typeof nw.qLabel==='string');
  check('nextWindowFor quality label matches the band', ['Favorable','Average','Marginal'].includes(nw.qLabel));
  const mp = missionPlan(MISSIONS.find(m=>m.id==='mars_orbit'));
  check('missionPlan surfaces the window for a window-gated mission', mp.window && typeof mp.window.abs==='number');
  check('missionPlan adjPayout applies the window quality multiplier', Math.abs(mp.adjPayout - round2(mp.payout*mp.window.quality)) < 0.02);
  // commit path still records a concrete {missionId, abs, quality}
  commitWindow('mars_orbit', nw.idx);
  check('commitWindow records the chosen window', state.committedWindow && state.committedWindow.missionId==='mars_orbit' && typeof state.committedWindow.abs==='number');
  cancelWindow();
  check('cancelWindow clears the commitment', state.committedWindow===null);
}

// ---------- non-window missions: completely untouched (the identity-style guarantee) ----------
{
  newGame('engineer');
  const leo = MISSIONS.find(m=>m.id==='crew_orbit'); // window:false / undefined
  const mp = missionPlan(leo);
  check('a non-window mission has window:null', mp.window===null);
  check('a non-window mission adjPayout === payout (no quality multiplier applied)', mp.adjPayout===mp.payout);
  // no windows cache entry is fabricated for a non-window mission via missionPlan
  check('missionPlan does not create window cache for non-window missions', state.windows['crew_orbit']===undefined);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
