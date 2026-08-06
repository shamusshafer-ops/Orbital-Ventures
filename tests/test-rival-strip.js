// Tier 2 A2 (2026-08-04) — surface the rival simulation on the Command deck rival strip.
// The critical correctness requirement from the ROADMAP entry: the strip must show the free
// pending-goal projection (rivalProjectedYear === rivalFullProjection(r)[0], explicitly documented
// as the free figure) without ever leaking the paid full-timeline content (indices 1+, gated behind
// rivalIntelOwned/buyRivalIntel).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');
state.rivalThreat={}; RIVALS.forEach(r=>{ state.rivalThreat[r.id]=1; });

// ---------- basic rendering ----------
{
  renderCCRight();
  const html=htmlOf('ccRight');
  check('ccRight renders non-empty content', html.length>0);
  check('the Rivals card is present', html.includes('>Rivals<'));
  for(const r of RIVALS.slice(0,3)){
    // top-3-by-threat is what's shown; with all threats equal at 1, order follows RIVALS array — just
    // confirm the mechanism renders SOME rival name, not a specific one, since sort order on ties isn't contracted
  }
  check('at least one rival name appears in the strip', RIVALS.some(r=>html.includes(r.name)));
}

// ---------- next-goal projection appears, using the real accessor ----------
{
  const r=RIVALS.find(x=>rivalProjectedYear(x)!==null);
  check('fixture sanity: at least one rival has a pending goal to project', !!r);
  if(r){
    state.rivalThreat={}; RIVALS.forEach(x=>{ state.rivalThreat[x.id]=(x.id===r.id)?10:0; }); // force r into the top-3
    renderCCRight();
    const html=htmlOf('ccRight');
    const pj=rivalProjectedYear(r);
    check('the strip shows the projected pending goal name', html.includes(pj.goal.name));
    check('the strip shows the projected year', html.includes('>'+pj.year+'<') || html.includes('<b>'+pj.year+'</b>'));
  }
}

// ---------- "all goals claimed" fallback ----------
{
  const r=RIVALS[0];
  const rs=rivalStateFor(r);
  const savedIdx=rs.idx;
  rs.idx=r.firsts.length; // exhaust every goal
  state.rivalThreat={}; RIVALS.forEach(x=>{ state.rivalThreat[x.id]=(x.id===r.id)?10:0; });
  check('rivalProjectedYear returns null once every goal is claimed', rivalProjectedYear(r)===null);
  renderCCRight();
  const html=htmlOf('ccRight');
  check('the strip shows "all goals claimed" rather than blank/broken output', html.includes('all goals claimed'));
  rs.idx=savedIdx;
}

// ---------- INTEL GATE: the strip never leaks paid full-timeline content ----------
{
  const r=RIVALS.find(x=>rivalFullProjection(x).length>=2);
  check('fixture sanity: at least one rival has 2+ remaining goals to test the gate with', !!r);
  if(r){
    state.rivalIntel=null; // explicitly NOT owned
    check('rivalIntelOwned is false without a purchase', rivalIntelOwned(r.id)===false);
    state.rivalThreat={}; RIVALS.forEach(x=>{ state.rivalThreat[x.id]=(x.id===r.id)?10:0; });
    renderCCRight();
    const html=htmlOf('ccRight');
    const full=rivalFullProjection(r);
    const futureGoalNames=full.slice(1).map(pj=>pj.goal.name);
    const leaked=futureGoalNames.filter(name=>html.includes(name));
    check('no goal beyond the free pending one appears in the strip', leaked.length===0);
    if(leaked.length) console.log('   leaked:', leaked);

    // now own the intel and confirm the strip STILL doesn't dump the full list (that's the modal's job —
    // this slice's own scope explicitly keeps the strip to "next goal", not the full projection)
    state.rivalIntel={[r.id]:true};
    renderCCRight();
    const html2=htmlOf('ccRight');
    const leaked2=futureGoalNames.filter(name=>html2.includes(name));
    check('owning intel does not change the strip (full timeline stays modal-only, by design)', leaked2.length===0);
    state.rivalIntel=null;
  }
}

// ---------- crowd factor line: present/absent matches rivalCrowdFactor(), and the number matches ----------
{
  state.rivalThreat={}; RIVALS.forEach(r=>{ state.rivalThreat[r.id]=1; });

  state.passiveContracts=[];
  check('fixture sanity: zero contracts means crowd factor is exactly 1', rivalCrowdFactor()===1);
  renderCCRight();
  check('crowd line is absent when rivalCrowdFactor()===1 (nothing to report)', !htmlOf('ccRight').includes('crowding the market'));

  state.passiveContracts=[{id:'a'},{id:'b'},{id:'c'}];
  const crowd=rivalCrowdFactor();
  check('fixture sanity: 3 contracts actually moves the crowd factor below 1', crowd<1);
  renderCCRight();
  const html=htmlOf('ccRight');
  check('crowd line appears once contracts are crowding the market', html.includes('crowding the market'));
  check('the displayed multiplier matches rivalCrowdFactor() exactly (2dp)', html.includes('×'+crowd.toFixed(2)));
  check('the displayed contract count matches state.passiveContracts.length', html.includes('Your 3 passive contracts'));

  state.passiveContracts=[{id:'a'}];
  renderCCRight();
  check('singular contract count is grammatically correct ("1 passive contract", not "contracts")',
    !htmlOf('ccRight').includes('1 passive contracts'));

  state.passiveContracts=[];
}

// ---------- protected baseline: threat pill and Deep view / Chronicle buttons untouched ----------
{
  state.rivalThreat={}; RIVALS.forEach(r=>{ state.rivalThreat[r.id]=1; });
  renderCCRight();
  const html=htmlOf('ccRight');
  check('Deep view button still present and wired to showRivalsModal()', html.includes("showRivalsModal()"));
  check('Chronicle button still present and wired to showChronicle', html.includes("showChronicle('view')"));
  check('threat pills still render (rivalThreatLabel output present)', /class="pill" style="color:/.test(html));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
