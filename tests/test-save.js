// ============================================================================
// E0.2 Slice A — save robustness (pure refactor, zero behavior change).
//
// Proves the two Slice-A changes in src/save.js are behavior-preserving:
//   1. writeSave/exportSave dropped the redundant inner JSON.parse(JSON.stringify)
//      clone — the single outer stringify must be BYTE-IDENTICAL to the old
//      double-serialize on a real, played-forward state.
//   2. loadSaveFromText + autoLoad now funnel through ONE shared pipeline
//      (applyLoadedSave): migrate → apply defaults → reconcile → rehydrate.
//      Both entry points must migrate an old save IDENTICALLY, and every
//      historical migration boundary (pre-v34 window scaling, v42 facility
//      autoResupply, v44 eraSeen backfill, and the bare-state-no-wrapper form)
//      must still land exactly where it did before the unification.
//
// Drives the REAL production functions (writeSave, autoLoad, loadSaveFromText,
// applyLoadedSave, rehydrateFlights), not reimplementations — per the harness
// README, that's what validates the shipped code rather than a model of it.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Build a genuinely played-forward state: a few months advanced AND a real
// in-progress interplanetary flight registered (so activeFlights / ctx.m /
// _flightSeq are populated — the nested structures rehydrateFlights re-links).
function buildPlayedState(){
  newGame('engineer');
  animEnabled=false; animState=null;
  for(let i=0;i<6;i++) advanceDays(30);
  state.money=5e6;
  const m=MISSIONS.find(x=>x.id==='belt_survey');
  const v=computeVehicle();
  let sim=null; try{ sim=simulateMission(m); }catch(e){}
  try{ proceedLaunch(m, v, sim, 1, 0, true); }catch(e){}
}

// ---------- 1. Serialization equivalence: single-pass == old double-serialize, byte-for-byte ----------
// This is the whole safety argument for deleting the inner clone. `state` is JSON-safe by design
// (ids, not object refs), so JSON.stringify normalizes it the same whether it sees the original or a
// parse/stringify round-trip of it. If ANY exotic value (a toJSON, an undefined prop, a class
// instance, NaN in an array, etc.) made the two diverge, these strings would differ.
{
  buildPlayedState();
  const FIXED_TS=1700000000000; // fixed so the wrapper is deterministic; the clone question is purely about `state`
  const oldWay=JSON.stringify({v:SAVE_VERSION, ts:FIXED_TS, state:JSON.parse(JSON.stringify(state))}); // pre-Slice-A form
  const newWay=JSON.stringify({v:SAVE_VERSION, ts:FIXED_TS, state});                                    // Slice-A form
  check('equivalence: single-pass output is byte-identical to old double-serialize', oldWay===newWay);
  check('equivalence: same byte length', oldWay.length===newWay.length);
  // Sanity: the played-forward state really did carry the nested structures we care about (not a boot default).
  check('equivalence: fixture actually populated an in-progress flight', (state.activeFlights||[]).length>=1);
  check('equivalence: serialized payload re-parses to a valid save wrapper', (()=>{ try{ const p=JSON.parse(newWay); return p.v===SAVE_VERSION && !!p.state && p.state.company===state.company; }catch(e){ return false; } })());
}

// ---------- 2. Round-trip: writeSave → autoLoad restores every key field, incl. an in-progress flight ----------
{
  buildPlayedState();
  const snap={ company:state.company, year:state.year, money:state.money, rep:state.rep,
    flights:state.flights, difficulty:state.difficulty,
    flightCount:(state.activeFlights||[]).length, firstMission:(state.activeFlights||[])[0].mission };
  writeSave(); // real production writer (SAVE_VERSION wrapper into localStorage)

  // Clobber the live state + flight counter so a successful load has to genuinely restore them.
  state={ company:'WIPED', year:1, activeFlights:[] };
  try{ _flightSeq=0; }catch(e){}

  const ok=autoLoad(); // the pure (no-UI) unified load entry point
  check('round-trip: autoLoad reported success', ok===true);
  check('round-trip: company restored', state.company===snap.company);
  check('round-trip: year restored', state.year===snap.year);
  check('round-trip: money restored', state.money===snap.money);
  check('round-trip: reputation restored', state.rep===snap.rep);
  check('round-trip: difficulty restored', state.difficulty===snap.difficulty);
  check('round-trip: in-progress flight count restored', (state.activeFlights||[]).length===snap.flightCount);
  // rehydrateFlights must re-link ctx.m from an id back to the canonical MISSIONS def (a live object).
  const rec=(state.activeFlights||[])[0];
  const canon=MISSIONS.find(x=>x.id===snap.firstMission);
  check('round-trip: flight mission id preserved', rec && rec.mission===snap.firstMission);
  check('round-trip: rehydrateFlights re-linked ctx.m to the canonical mission object', !!(rec && rec.ctx && rec.ctx.m===canon));
  check('round-trip: rehydrateFlights restored the _flightSeq counter', typeof _flightSeq!=='undefined' && _flightSeq>=1);
}

// ---------- 3. Migration regression A: a pre-v34 save gets its launch windows scaled month→day ----------
{
  const raw=JSON.stringify({v:33, ts:1, state:{ year:1955, company:'PREV34CO', committedWindow:{abs:12}, windows:{stale:1} }});
  localStorage.setItem(SAVE_KEY, raw);
  const ok=autoLoad();
  check('pre-v34: load succeeded', ok===true);
  check('pre-v34: committedWindow.abs scaled ×DAYS_PER_MONTH (months→days)', state.committedWindow && state.committedWindow.abs===12*DAYS_PER_MONTH);
  check('pre-v34: the regenerable windows cache was cleared', JSON.stringify(state.windows)==='{}');
  check('pre-v34: forward-compat defaults still applied (e.g. activeFlights seeded)', Array.isArray(state.activeFlights));
}

// ---------- 4. Migration regression B: a v42-boundary save defaults per-facility autoResupply OFF ----------
{
  const raw=JSON.stringify({v:41, ts:1, state:{ year:1975, company:'V42CO', facilities:{ base1:{ name:'Alpha', supply:10 } } }});
  localStorage.setItem(SAVE_KEY, raw);
  const ok=autoLoad();
  check('v42: load succeeded', ok===true);
  check('v42: pre-v42 facility gets autoResupply explicitly defaulted to false', state.facilities && state.facilities.base1 && state.facilities.base1.autoResupply===false);
  check('v42: unrelated facility fields untouched', state.facilities.base1.supply===10);
}

// ---------- 5. Migration regression C: a v44-boundary save backfills eraSeen to its OWN era, not 0 ----------
// CRITICAL invariant: a late-game load must NOT replay a backlog of stale era interstitials.
{
  const raw=JSON.stringify({v:43, ts:1, state:{ year:1985, company:'V44CO', flights:7, money:1234, rep:42 }});
  localStorage.setItem(SAVE_KEY, raw);
  const ok=autoLoad();
  check('v44: load succeeded', ok===true);
  check('v44: eraSeen backfilled to the save\'s CURRENT era (not 0)', state.eraSeen===eraIndexForYear(1985));
  check('v44: eraStartSnapshot seeded from the save\'s current metrics', !!(state.eraStartSnapshot && state.eraStartSnapshot.flights===7 && state.eraStartSnapshot.money===1234 && state.eraStartSnapshot.rep===42));
}

// ---------- 6. Migration regression D: a bare state object (no {v,ts,state} wrapper) still loads ----------
// Loads must keep accepting payload.state||payload — a legacy bare-state export has no wrapper/version.
{
  const raw=JSON.stringify({ year:1960, company:'BARECO' });
  localStorage.setItem(SAVE_KEY, raw);
  const ok=autoLoad();
  check('bare: load succeeded from an unwrapped state object', ok===true);
  check('bare: year preserved', state.year===1960);
  check('bare: company preserved', state.company==='BARECO');
  check('bare: forward-compat defaults applied to the bare object', state.research && typeof state.research==='object' && Array.isArray(state.activeFlights));
  check('bare: era backfill ran (no wrapper ⇒ treated by its own year)', state.eraSeen===eraIndexForYear(1960));
}

// ---------- 7. Unification guard: autoLoad and loadSaveFromText migrate the SAME save IDENTICALLY ----------
// This is the test that would FAIL if the two load paths ever diverged again (the exact latent bug
// Slice A removes). Both must run migrate → defaults → reconcile → rehydrate in the same order.
// render()/showRecap() are stubbed so loadSaveFromText's post-load UI can't perturb the compared fields.
{
  const raw=JSON.stringify({v:33, ts:1, state:{ year:1955, company:'DUPCO', committedWindow:{abs:9}, windows:{stale:1}, flights:3, money:500, rep:11 }});

  const realRender=render, realRecap=showRecap;
  render=function(){}; showRecap=function(){}; // isolate the migration transform from post-load UI side effects
  try{
    localStorage.setItem(SAVE_KEY, raw);
    autoLoad();
    const a={ abs:state.committedWindow&&state.committedWindow.abs, windows:JSON.stringify(state.windows),
      eraSeen:state.eraSeen, snap:JSON.stringify(state.eraStartSnapshot), flightsArr:Array.isArray(state.activeFlights) };

    loadSaveFromText(raw, 'unification test');
    const b={ abs:state.committedWindow&&state.committedWindow.abs, windows:JSON.stringify(state.windows),
      eraSeen:state.eraSeen, snap:JSON.stringify(state.eraStartSnapshot), flightsArr:Array.isArray(state.activeFlights) };

    check('unify: both paths scale committedWindow identically', a.abs===b.abs && a.abs===9*DAYS_PER_MONTH);
    check('unify: both paths clear the windows cache identically', a.windows===b.windows && a.windows==='{}');
    check('unify: both paths backfill eraSeen identically', a.eraSeen===b.eraSeen && a.eraSeen===eraIndexForYear(1955));
    check('unify: both paths seed eraStartSnapshot identically', a.snap===b.snap);
    check('unify: both paths apply forward-compat defaults identically', a.flightsArr===true && b.flightsArr===true);
  } finally {
    render=realRender; showRecap=realRecap;
  }
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
