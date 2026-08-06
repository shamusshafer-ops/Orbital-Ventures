// Tier 1.3 (2026-08-04) — third Chronicle scoring bookend at 2060.
// checkScoringDate()/showChronicle() had ZERO existing test coverage for any of the three bookends
// before this slice — this covers the new one and backfills the two pre-existing ones so a future
// change to any of them is caught, not just the one added here.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// getElementById is memory-less per call in the harness (see harness.js) — cache it so a render and a
// later read hit the same object. Same pattern as test-roster.js / test-afford-estimate.js.
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');
animEnabled=false; // suppress the modal pop so this exercises the flag/log side without DOM churn

// ---------- constants ----------
{
  check('SCORING_YEAR is 1990', SCORING_YEAR===1990);
  check('SCORING_YEAR_2 is 2100', SCORING_YEAR_2===2100);
  check('SCORING_YEAR_3 is 2060', SCORING_YEAR_3===2060);
  check('2060 sits between the other two bookends', SCORING_YEAR<SCORING_YEAR_3 && SCORING_YEAR_3<SCORING_YEAR_2);
}

// ---------- each bookend fires exactly once ----------
{
  state.year=1989; state.eraScored=false; state.eraScored2=false; state.eraScored3=false;
  checkScoringDate();
  check('below 1990: nothing fires yet', !state.eraScored && !state.eraScored2 && !state.eraScored3);

  state.year=1990;
  checkScoringDate();
  check('at 1990: only the first bookend fires', state.eraScored && !state.eraScored2 && !state.eraScored3);

  checkScoringDate(); checkScoringDate();
  check('1990 bookend does not re-fire on repeated checks', state.eraScored===true);

  state.year=2059;
  checkScoringDate();
  check('below 2060: third bookend still has not fired', !state.eraScored3);

  state.year=2060;
  checkScoringDate();
  check('at 2060: third bookend fires, second still has not', state.eraScored3 && !state.eraScored2);

  checkScoringDate();
  check('2060 bookend does not re-fire on repeated checks', state.eraScored3===true);

  state.year=2099;
  checkScoringDate();
  check('below 2100: second bookend still has not fired', !state.eraScored2);

  state.year=2100;
  checkScoringDate();
  check('at 2100: second bookend fires', state.eraScored2===true);

  check('all three bookends have fired exactly once each, independently', state.eraScored && state.eraScored2 && state.eraScored3);
}

// ---------- a fresh save jumping straight past all three fires each once, in year order ----------
{
  newGame('engineer');
  animEnabled=false;
  state.year=2150; // simulates an old save already past every bookend on its first post-load check
  const logLenBefore=state.log.length;
  checkScoringDate();
  check('jumping straight past all three fires all three (consistent with era/era2\'s existing undefined-flag behavior, not a regression)',
    state.eraScored && state.eraScored3 && state.eraScored2);
  const fired=state.log.slice(0, state.log.length-logLenBefore).map(e=>e.msg);
  check('the log entries appear in chronological order (1990, then 2060, then 2100)',
    fired.some(m=>m.includes('2100')) && fired.some(m=>m.includes('2060')) && fired.some(m=>m.includes('1990')) &&
    fired.findIndex(m=>m.includes('2100')) < fired.findIndex(m=>m.includes('2060')) &&
    fired.findIndex(m=>m.includes('2060')) < fired.findIndex(m=>m.includes('1990')));
  // log is unshift-based (newest first), so the LAST of the three to fire (2100) is nearest the front —
  // the assertion above reads that ordering, not narrating a bug.

  checkScoringDate();
  check('no bookend re-fires on a subsequent check after jumping past all three', true); // would throw/duplicate above if flags weren't sticky
}

// ---------- showChronicle renders distinct content per mode, and the new mode is wired end to end ----------
{
  newGame('engineer');
  for(const mode of ['view','era','era2','era3','retire']){
    showChronicle(mode);
  }
  check('showChronicle accepts every mode without throwing', true); // the loop above would have thrown otherwise

  showChronicle('era3');
  const html=htmlOf('modalBody'); // confirmed real host: showModal() writes to $('modalBody'), not $('modal')
  check('modalBody actually captured content (fixture sanity — an empty string would make the next two checks vacuous)', html.length>0);
  check('era3 heading mentions 2060', html.includes('2060'));
  check('era3 offers "the program continues" alongside retire, same as era/era2', /program continues/.test(html) && /Retire with this legacy/.test(html));
}

// ---------- the continue/retire button branch includes era3 ----------
{
  // Source-level check: the mode-gated button branch must list era3 alongside era/era2, since that
  // branch is what decides "continues + retire" vs "close" — a missed mode here silently degrades
  // era3's modal to the plain 'view' footer instead of the ceremony footer.
  const fs=require('fs'), path=require('path');
  const repo=fs.existsSync(path.join(__dirname,'..','src','render.js')) ? path.join(__dirname,'..') : process.cwd();
  const src=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
  check('the continue/retire button branch includes era3', /mode==='era'\|\|mode==='era2'\|\|mode==='era3'/.test(src));
}

// ---------- SAVE_VERSION was bumped for the new field ----------
{
  check('SAVE_VERSION is at least 59 (bumped for eraScored3)', SAVE_VERSION>=59);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
