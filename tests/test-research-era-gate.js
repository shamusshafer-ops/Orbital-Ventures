// Tier 2 C6 option (b), 2026-08-04 — era-gate RESEARCH; MISSIONS deliberately stay ungated.
// The three things that would make this a disaster if wrong, in order:
//   1. the game must still be playable from turn one (a too-tight era 0 = softlock)
//   2. no node may be gated later than its own prerequisites (an unreachable branch)
//   3. no mission may become unreachable because the research it requires is gated too late
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- every node carries an eraMin ----------
{
  const missing=RESEARCH.filter(r=>r.eraMin===undefined).map(r=>r.id);
  check('every RESEARCH node has an eraMin', missing.length===0);
  if(missing.length) console.log('   missing eraMin:', missing.join(', '));
  check('every eraMin is a valid era index', RESEARCH.every(r=>r.eraMin>=0 && r.eraMin<ERAS.length));
  check('MISSIONS remain era-ungated (this is option (b), not (c))', MISSIONS.every(m=>m.eraMin===undefined));
}

// ---------- 1. the game is playable at turn one ----------
{
  state.year=1942;
  check('fixture sanity: game starts in era 0', eraIndex(currentEra())===0);
  const avail=RESEARCH.filter(r=>researchNodeState(r)==='available');
  check('at least 4 research nodes are available at game start (no softlock)', avail.length>=4);
  check('the opening set spans more than one track (a real choice, not a forced line)',
    new Set(avail.map(r=>r.track)).size>1);
  // a first engine must be reachable immediately, or there is no game
  check('an engine-unlocking node is available at game start',
    avail.some(r=>r.effect && (r.effect.engines||r.effect.engine)));
}

// ---------- 2. no node is gated later than its own prereqs ----------
{
  const bad=[];
  for(const r of RESEARCH) for(const req of (r.req||[])){
    const p=RESEARCH.find(x=>x.id===req);
    if(p && (p.eraMin||0) > (r.eraMin||0)) bad.push(`${r.id}(e${r.eraMin}) needs ${req}(e${p.eraMin})`);
  }
  check('no node unlocks before its own prerequisite (no unreachable branch)', bad.length===0);
  if(bad.length) console.log('   inversions:', bad.join('; '));
}

// ---------- 3. every mission's required research is reachable ----------
{
  // A mission gated on research that only arrives in a late era is soft-paced by tech — that is the
  // POINT of option (b). What must not happen is a mission whose research never arrives at all, or
  // arrives so late the mission is effectively dead content.
  const bad=[];
  for(const m of MISSIONS){
    if(!m.reqResearch) continue;
    const r=RESEARCH.find(x=>x.id===m.reqResearch);
    if(!r){ bad.push(`${m.id}: requires unknown research ${m.reqResearch}`); continue; }
    if(r.eraMin>=ERAS.length-1 && m.minRep<1500) bad.push(`${m.id}(minRep ${m.minRep}) needs ${r.id}(era ${r.eraMin}) — mid-game mission gated to the final era`);
  }
  check('no mid-game mission is gated behind final-era research', bad.length===0);
  if(bad.length) console.log('   ', bad.join('; '));

  // spot-check the specific early-game dependencies that would be most damaging to get wrong
  const early={deep_space:3, crew_capsule:2, orbital_depot:3, mars_traj:3};
  for(const [id, maxEra] of Object.entries(early)){
    const r=RESEARCH.find(x=>x.id===id);
    check(`${id} stays early enough for the missions that need it (era<=${maxEra})`, r.eraMin<=maxEra);
  }
}

// ---------- researchNodeState distinguishes era from locked ----------
{
  state.year=1942;
  const eraGated=RESEARCH.filter(r=>researchNodeState(r)==='era');
  check('some nodes report the new "era" state at game start', eraGated.length>0);
  check('"era" is reported even when prereqs ARE met (era is checked first)',
    eraGated.some(r=>reqsMet(r)));
  // a node that is era-open but prereq-blocked must still read 'locked', not 'era'
  state.year=ERAS[ERAS.length-1].from;
  const lockedNow=RESEARCH.filter(r=>researchNodeState(r)==='locked');
  check('in the final era nothing is era-gated any more', RESEARCH.every(r=>researchNodeState(r)!=='era'));
  check('prereq-locked nodes still report "locked" in the final era', lockedNow.length>0);
  state.year=1942;
}

// ---------- the gate is enforced at BOTH purchase paths ----------
{
  newGame('engineer');
  state.year=1942; state.money=1e6; state.activeResearch=null;
  const late=RESEARCH.find(r=>r.eraMin>=6);
  check('fixture sanity: a late-era node exists to test with', !!late);

  buyResearch(late.id);
  check('buyResearch refuses an era-gated node', state.activeResearch===null);

  // the queue drains via startResearchProject directly, bypassing buyResearch — it must check too
  state.researchNext=late.id;
  tryStartQueuedResearch();
  check('tryStartQueuedResearch refuses an era-gated node', state.activeResearch===null);
  check('the queued pick is retained, not discarded, so it fires when the era arrives',
    state.researchNext===late.id);

  // and it DOES start once the era arrives (given prereqs/cost are satisfied). Note reqsMet() checks
  // reqMissionDone as well as req — satisfying only req leaves it returning undefined (falsy), which
  // is what made the first draft of this check fail against correct code.
  state.year=ERAS[ERAS.length-1].from;
  for(const req of (late.req||[])) state.research[req]=true;
  if(late.reqMissionDone) state.completed[late.reqMissionDone]=true;
  check('fixture sanity: prereqs are genuinely satisfied before asserting the start', reqsMet(late)===true);
  tryStartQueuedResearch();
  check('the same queued node starts once its era arrives',
    state.activeResearch && state.activeResearch.id===late.id);
}

// ---------- era availability grows monotonically ----------
{
  newGame('engineer');
  let prev=-1, monotonic=true;
  for(let e=0;e<ERAS.length;e++){
    state.year=ERAS[e].from;
    const n=RESEARCH.filter(r=>researchEraMet(r)).length;
    if(n<prev) monotonic=false;
    prev=n;
  }
  check('era-open node count never decreases as time advances', monotonic);
  state.year=ERAS[ERAS.length-1].from;
  check('every node is era-open by the final era (nothing is permanently unreachable)',
    RESEARCH.every(r=>researchEraMet(r)));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
