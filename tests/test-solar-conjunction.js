// Physics realism #3 — solar conjunction blackout. synodicDays (Kepler-derived, cross-checked against
// the game's own existing Mars ~26-month synodic cadence and real Jupiter ~13mo), nextConjunction's
// blackout window at/away from the exact conjunction epoch, Earth/Moon exclusion, and body-card
// rendering (warning flag during blackout, metric otherwise, never both). absDay is monkey-patched for
// determinism (a plain reassignable function in this codebase — no seeded-RNG dependency needed here).
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function checkAt(day, bodyId){ const saved=absDay; absDay=()=>day; const c=nextConjunction(bodyId); absDay=saved; return c; }
function cardAt(day, bodyId){ const saved=absDay; absDay=()=>day; state.selectedBody=bodyId; const h=bodyCardHTML(); absDay=saved; return h; }

newGame('engineer');

// ---------- synodicDays: matches known real/in-game figures ----------
{
  const marsSyn=synodicDays('mars');
  check('mars synodic ≈ the real Earth-Mars synodic period ~780 days (~26 months)', Math.abs(marsSyn-780)<15);
  const jSyn=synodicDays('jupiter');
  check('jupiter synodic ≈ real ~399 days (~13 months)', jSyn>380 && jSyn<420);
  check('moon: no synodic period (Earth-distance entry, not Sun-distance)', synodicDays('moon')===null);
  check('earth: no synodic period (not in BODY_AU)', synodicDays('earth')===null);
  check('unknown body: null', synodicDays('not_a_body')===null);
}

// ---------- nextConjunction: blackout window centered exactly on the conjunction epoch ----------
{
  const syn=synodicDays('mars'), half=syn/2;
  check('exactly at conjunction: in blackout, full remaining window', checkAt(half,'mars').inBlackout && checkAt(half,'mars').daysRemaining===CONJUNCTION_BLACKOUT_HALFDAYS);
  check('at opposition (day 0): clear, not in blackout', checkAt(0,'mars').inBlackout===false);
  check('at opposition: daysToNext ≈ half the synodic period', Math.abs(checkAt(0,'mars').daysToNext-half)<1);
  check('just inside the blackout half-width: still in blackout', checkAt(half-CONJUNCTION_BLACKOUT_HALFDAYS+1,'mars').inBlackout===true);
  check('just outside the blackout half-width: clear', checkAt(half-CONJUNCTION_BLACKOUT_HALFDAYS-2,'mars').inBlackout===false);
  check('far from conjunction: clear', checkAt(half/2,'mars').inBlackout===false);
  // the cycle repeats: a second conjunction one synodic period later behaves the same
  check('second cycle: blackout repeats correctly', checkAt(half+syn,'mars').inBlackout===true);
}

// ---------- Earth and Moon are excluded entirely ----------
{
  check('earth: nextConjunction is null', nextConjunction('earth')===null);
  check('moon: nextConjunction is null', nextConjunction('moon')===null);
}

// ---------- body-card rendering: flag during blackout, metric otherwise, never both ----------
{
  const syn=synodicDays('mars'), half=syn/2;
  const blackoutCard=cardAt(half,'mars');
  check('during blackout: shows the warning flag', /flag warn/.test(blackoutCard) && /Solar conjunction/.test(blackoutCard));
  check('during blackout: does NOT also show the "next conjunction" metric', !/Next solar conjunction/.test(blackoutCard));

  const clearCard=cardAt(0,'mars');
  check('away from blackout: shows the metric, not the flag', /Next solar conjunction/.test(clearCard) && !/flag warn/.test(clearCard));

  check('moon card: no conjunction content at all', !/[Ss]olar conjunction/.test(cardAt(0,'moon')));
  check('earth card: no conjunction content at all', !/[Ss]olar conjunction/.test(cardAt(0,'earth')));
  state.selectedBody=null;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
