// Tier 2 A3 (2026-08-04) — surface crisis proximity on the Command deck.
// Covers the pure crisisProximity() accessor and the Horizon card it feeds, matching the ROADMAP
// entry's own suggested test list plus the funding_collapse no-counter case and the era-omission rule.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');

// ---------- pure accessor: era-ineligible crises are entirely omitted ----------
{
  state.crisis=null; state.year=1942; // Pioneer era — every crisis has eraMin>=3, none eligible
  check('fixture sanity: era index is 0 at game start', eraIndex(currentEra())===0);
  const prox=crisisProximity();
  check('no crisis is era-eligible at game start', prox.length===0);
}

// ---------- era eligibility gates correctly, one crisis at a time ----------
{
  state.crisis=null;
  state.year=ERAS[3].from; // funding_collapse (eraMin:3) becomes eligible; debris/solar still are not
  const prox=state.crisis?[]:crisisProximity();
  const ids=prox.map(p=>p.c.id);
  check('at era 3: funding_collapse is eligible', ids.includes('funding_collapse'));
  check('at era 3: debris_cascade (eraMin 4) is NOT eligible yet', !ids.includes('debris_cascade'));
  check('at era 3: solar_storm (eraMin 5) is NOT eligible yet', !ids.includes('solar_storm'));

  state.year=ERAS[4].from;
  const prox2=crisisProximity();
  const ids2=prox2.map(p=>p.c.id);
  check('at era 4: debris_cascade becomes eligible', ids2.includes('debris_cascade'));
  check('at era 4: solar_storm (eraMin 5) still is not', !ids2.includes('solar_storm'));

  state.year=ERAS[5].from;
  const prox3=crisisProximity();
  check('at era 5: all three crises are eligible', prox3.length===3);
}

// ---------- threshold progress is reported accurately, including edge values ----------
{
  state.year=ERAS[5].from;
  state.leoFlights=0; state.deepFlights=0;
  let prox=crisisProximity();
  let dc=prox.find(p=>p.c.id==='debris_cascade');
  check('0 LEO flights: val is 0', dc.val===0);
  check('0 LEO flights: pct is 0', dc.pct===0);

  state.leoFlights=34;
  prox=crisisProximity(); dc=prox.find(p=>p.c.id==='debris_cascade');
  check('34/40 LEO flights: val is 34', dc.val===34);
  check('34/40 LEO flights: pct is 85', dc.pct===85);

  state.leoFlights=40;
  prox=crisisProximity(); dc=prox.find(p=>p.c.id==='debris_cascade');
  check('exactly at threshold: pct is 100', dc.pct===100);

  state.leoFlights=999;
  prox=crisisProximity(); dc=prox.find(p=>p.c.id==='debris_cascade');
  check('past threshold: pct clamps at 100, never exceeds', dc.pct===100);

  state.leoFlights=0; state.deepFlights=0;
}

// ---------- funding_collapse (thresholdStat:null) reports no counter, not 0/0 ----------
{
  state.year=ERAS[3].from;
  const prox=crisisProximity();
  const fc=prox.find(p=>p.c.id==='funding_collapse');
  check('fixture sanity: funding_collapse is present at era 3', !!fc);
  check('funding_collapse has thresholdStat:null on the def itself', crisisDef('funding_collapse').thresholdStat===null);
  check('funding_collapse reports val as null, not 0', fc.val===null);
  check('funding_collapse reports pct as null, not 0', fc.pct===null);
}

// ---------- nothing is returned while a crisis is already active ----------
{
  state.year=ERAS[5].from;
  state.leoFlights=40;
  check('fixture sanity: without an active crisis, proximity is non-empty here', crisisProximity().length>0);
  state.crisis={id:'debris_cascade', phase:'building', startAbs:0, severity:0.2, peakSeverity:0.2, fundedUntilAbs:null};
  check('crisisProximity() returns nothing while a crisis is active', crisisProximity().length===0);
  state.crisis=null;
}

// ---------- rendered card: presence, omission, and content ----------
{
  state.year=1942; state.crisis=null;
  renderCCRight();
  check('Horizon card is absent when nothing is era-eligible', !htmlOf('ccRight').includes('Horizon'));

  state.year=ERAS[4].from; state.leoFlights=34; state.deepFlights=0;
  renderCCRight();
  let html=htmlOf('ccRight');
  check('Horizon card appears once something is era-eligible', html.includes('Horizon'));
  check('shows the exact "34/40" progress text', html.includes('34/40'));
  check('does not show solar_storm (era-ineligible) in the rendered card', !html.includes('Solar Storm'));

  state.year=ERAS[5].from;
  renderCCRight();
  html=htmlOf('ccRight');
  check('funding_collapse renders sensible text, not "0/0"', !html.includes('0/0'));
  check('funding_collapse shows the no-counter fallback copy', html.includes('watching political conditions'));

  state.crisis={id:'debris_cascade', phase:'building', startAbs:0, severity:0.2, peakSeverity:0.2, fundedUntilAbs:null};
  renderCCRight();
  html=htmlOf('ccRight');
  check('Horizon card disappears entirely while a crisis is active', !html.includes('Horizon'));
  state.crisis=null;
}

// ---------- protected baseline: crisisCandidates()'s own semantics are unchanged ----------
{
  state.year=ERAS[4].from; state.leoFlights=40; state.crisis=null; state.crisisHistory=[];
  const cands=crisisCandidates().map(c=>c.id);
  check('crisisCandidates() still returns only crises that meet BOTH era and threshold', cands.includes('debris_cascade'));
  state.leoFlights=10;
  const cands2=crisisCandidates().map(c=>c.id);
  check('crisisCandidates() still excludes a crisis below its threshold (unlike crisisProximity(), which would still list it)',
    !cands2.includes('debris_cascade') && crisisProximity().some(p=>p.c.id==='debris_cascade'));
  state.leoFlights=0; state.deepFlights=0;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
