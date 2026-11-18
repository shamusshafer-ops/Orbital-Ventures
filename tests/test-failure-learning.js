// Decision-loop roadmap Phase 2 (2026-11-18): failure learning. A failure opens an investigation (no modal):
// design flaw (hidden, recurs at ×FLAW_MULT) or one-off; inspect / integrated testing / redesign / accept.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const realRandom=Math.random;
let rq=0;
function flyBench(kind, flaw){ /* build + fly the bench rocket through the player path; flaw forces the hidden draw */
  queueBuild(true,'q'+(++rq)); let g=0; while(!hangarList().length&&g++<600) advanceDays(1);
  const h=hangarList()[0]; if(!h) return null;
  _devForceOutcome=kind;
  if(flaw!=null){ const r=Math.random; const want=flaw; let armed=true;
    openInvestigation=(orig=>function(ctx,o){ if(armed){ armed=false; Math.random=()=>want?0:0.99; try{ return orig(ctx,o); } finally{ Math.random=r; } } return orig(ctx,o); })(openInvestigation); }
  const abs0=state.lastDebrief?state.lastDebrief.abs:-1, n0=state.flights||0; let tries=0;
  /* a loss can leave the pad under repair: wait for it the way a player would */
  while(tries++<80){ _devForceOutcome=kind; launchFromHangar(h.id,h.hullId,'f'+(++rq)); if((state.flights||0)>n0) break; advanceDays(5); }
  return state.lastDebrief;
}
const realOpen=openInvestigation;
const reset=()=>{ openInvestigation=realOpen; Math.random=realRandom; };
const rel=()=>{ const m=curMission(), v=computeVehicle(); return effectiveReliability(m,v,m.profile?simulateMission(m):null,!!m.crew); };
const truthRel=()=>{ _hazardTruth=true; try{ return rel(); } finally{ _hazardTruth=false; } };
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const benchHTML=()=>{ renderBenchLaunch(); return document.getElementById('benchLaunch').innerHTML||''; };

// ---------- a clean game has no hazard modifiers: odds untouched ----------
newGame('engineer'); state.money=40; state.activeMission='first_flight';
const r0=rel();
check('no investigations → no hazard modifiers', !hazardModsActive() && subsysHazardRatio(curMission(),computeVehicle(),null,false)===1);
check('the old inquiry modal is gone', typeof showInquiryModal==='undefined' && typeof resolveInquiry==='undefined');

// ---------- a failure opens an investigation on the bench, not a modal ----------
{ const d=flyBench('loss', true); reset();
  const inv=investigationById(d.invId);
  check('a loss opens an investigation tied to the debrief', inv && inv.sub==='propulsion' && inv.status==='open' && inv.missionId==='first_flight');
  check('…with the prior estimate, not the hidden truth', Math.abs(inv.est-FLAW_PRIOR)<1e-9 && inv.finding===null);
  check('no modal was raised for it', !document.getElementById('modal') || /hidden/.test(document.getElementById('modal').className||'') || !/investigation/i.test(document.getElementById('modal').innerHTML||''));
  const html=benchHTML();
  check('the bench shows the investigation with its estimate and choices', /class="investigation"/.test(html) && /35%<\/b> flaw/.test(html) && /startInvestigationProgram\('inv\d+','inspect'\)/.test(html) && /'test'\)/.test(html) && /'redesign'\)/.test(html) && /accept the risk/.test(html));
  check('with it open, the card is compact and its remedies ride on the investigation', /last-flight compact/.test(html) && /Also: /.test(html));
  check('the go/no-go block flags the open investigation', launchGoNoGo().risks.some(r=>/propulsion investigation is open — 35%/.test(r)));
  // belief vs truth
  check('displayed odds price in the estimate, not the truth', rel()<r0 && truthRel()<rel());
  const m=curMission(), v=computeVehicle(), list=subsystemFragilities(m,v,null,false);
  check('hazard math: truth R = R0^(Σw·k/Σw) with k=FLAW_MULT on propulsion only', (()=>{ let wk=0,w=0; _hazardTruth=true; const L=subsystemFragilities(m,v,null,false); _hazardTruth=false;
    for(const f of L){ const k=f.key==='propulsion'?FLAW_MULT:1; wk+=f.weight; w+=f.weight/k; } const want=Math.min(Math.pow(r0,wk/w),teamRelCeiling()); return Math.abs(truthRel()-want)<1e-9; })());
  check('the flaw shifts attribution too (propulsion weight carries k)', (()=>{ _hazardTruth=true; const a=subsystemFragilities(m,v,null,false).find(f=>f.key==='propulsion').weight; _hazardTruth=false;
    state.flaws={}; state.flawBelief={}; const b=subsystemFragilities(m,v,null,false).find(f=>f.key==='propulsion').weight; state.flaws={propulsion:true}; state.flawBelief={propulsion:FLAW_PRIOR}; return Math.abs(a/b-FLAW_MULT)<1e-9; })());
  check('subsystem-specific: a flaw in a subsystem this flight does not carry changes nothing', (()=>{ state.flaws.life_support=true; state.flawBelief.life_support=1; const x=rel(); delete state.flaws.life_support; delete state.flawBelief.life_support; return Math.abs(x-rel())<1e-12; })());
  // inspect: charged once, results on their day
  const q=investigationActions(inv).find(a=>a.kind==='inspect'), m0=state.money;
  check('inspect is offered with a cost and a month', q && q.cost>0 && q.months===1);
  check('starting it charges once', startInvestigationProgram(inv.id,'inspect') && Math.abs(state.money-(m0-q.cost))<0.01);
  check('a second click while it runs charges nothing', startInvestigationProgram(inv.id,'inspect')===false && Math.abs(state.money-(m0-q.cost))<0.01);
  check('Up Next shows the running inspection', outlinerItems().some(i=>/Inspect the hardware/.test(i.label||'')));
  check('the bench shows it under way with a date', /under way — results/.test(strip(benchHTML())));
  // save/load mid-program: the program survives and completes exactly once
  const payload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
  applyLoadedSave(payload);
  const inv2=investigationById(inv.id);
  check('save/load keeps the running program', inv2 && inv2.program && inv2.program.kind==='inspect' && !inv2.program.done);
  let n=0; while(inv2.program&&n++<45) advanceDays(1);
  check('the inspection finds the flaw', inv2.finding==='flaw' && inv2.est===1 && state.flawBelief.propulsion===1 && inv2.status==='open');
  check('…and now the displayed odds equal the truth', Math.abs(rel()-truthRel())<1e-12);
  check('the bench says the flaw is confirmed', /Design flaw confirmed/.test(strip(benchHTML())));
  check('inspection is no longer offered once the answer is known', !investigationActions(inv2).some(a=>a.kind==='inspect'));
  // redesign removes it; without a specialist it takes longer and costs more
  const rq_=investigationActions(inv2).find(a=>a.kind==='redesign');
  check('redesign without a propulsion specialist: +1 month, +30%', rq_.months===INV_PROGRAMS.redesign.months+1 && /no propulsion specialist/.test(rq_.note));
  state.money=200; startInvestigationProgram(inv2.id,'redesign'); n=0; while(inv2.program&&n++<200) advanceDays(1);
  check('redesign removes the flaw and trims the subsystem for good', !state.flaws.propulsion && !state.flawBelief.propulsion && state.subsysTrim.propulsion===INV_TRIM && inv2.status==='closed' && inv2.closedWhy==='redesigned');
  check('…so the bench rocket is now better than before the failure', rel()>r0-1e-12 && rel()>=r0);
}

// ---------- a one-off: inspection clears it and the odds come back ----------
{ newGame('engineer'); state.money=40; state.activeMission='first_flight'; const base=rel();
  const d=flyBench('loss', false); reset(); const inv=investigationById(d.invId);
  check('one-off: displayed odds still carry the doubt', rel()<base && Math.abs(truthRel()-base)<1e-12);
  startInvestigationProgram(inv.id,'inspect'); let n=0; while(inv.program&&n++<45) advanceDays(1);
  check('one-off: the inspection closes it and the odds come back', inv.finding==='oneoff' && inv.status==='closed' && Math.abs(rel()-base)<1e-12 && !/class="investigation"/.test(benchHTML()));
  check('one-off: the full card says what the inspection found', /was a one-off — nothing to fix/.test(strip(benchHTML())));
}

// ---------- integrated testing: halves the subsystem's hazard for N flights that carry it ----------
{ newGame('engineer'); state.money=60; state.activeMission='first_flight';
  const d=flyBench('loss', false); reset(); const inv=investigationById(d.invId);
  startInvestigationProgram(inv.id,'test'); let n=0; while(inv.program&&!inv.program.done&&n++<45) advanceDays(1);
  check('testing closes the investigation and arms the credit', inv.status==='closed' && state.subsysTest.propulsion && state.subsysTest.propulsion.flights===INV_TEST_FLIGHTS);
  const withCredit=rel(); const sv=state.subsysTest.propulsion; delete state.subsysTest.propulsion; const withoutCredit=rel(); state.subsysTest.propulsion=sv;
  for(let i=0;i<INV_TEST_FLIGHTS;i++){ state.activeMission='first_flight'; flyBench('success'); }
  check('each real flight spends one, then it is gone', !state.subsysTest.propulsion);
  check('while armed it raised the odds', withCredit>withoutCredit);
}

// ---------- repeat failure: the estimate rises; accepting the risk keeps the doubt priced in ----------
{ newGame('engineer'); state.money=60; state.activeMission='first_flight';
  const d1=flyBench('loss', true); reset(); const i1=investigationById(d1.invId);
  acceptInvestigationRisk(i1.id);
  check('accepting closes it but the doubt stays in the odds', i1.status==='closed' && i1.closedWhy==='accepted' && state.flawBelief.propulsion>0);
  const d2=flyBench('loss'); reset(); const i2=investigationById(d2.invId);
  check('the same subsystem failing again raises the estimate', i2.est===FLAW_REPEAT_EST && i2.id!==i1.id);
  check('an existing hidden flaw is what struck again', state.flaws.propulsion===true);
}

// ---------- crewed failures and partials investigate too; anomaly calls without a subsystem do not ----------
{ newGame('engineer'); state.activeMission='first_flight';
  const ctx={m:curMission(), flightExpense:1};
  check('a partial with a subsystem opens one', !!openInvestigation(ctx,{kind:'partial',subsystem:'avionics'}));
  check('an outcome with no subsystem opens none', openInvestigation(ctx,{kind:'partial'})===null);
}

// ---------- the roll uses the truth; nothing else does ----------
{ newGame('engineer'); state.activeMission='first_flight'; state.flaws={propulsion:true}; state.flawBelief={};
  let seen=null; const realFr=subsystemFragilities;
  subsystemFragilities=function(){ if(seen===null) seen=_hazardTruth; return realFr.apply(this,arguments); };
  try{ resolveFlight(curMission(),computeVehicle(),null,false,0); } finally{ subsystemFragilities=realFr; }
  check('resolveFlight rolls against the truth', seen===true && _hazardTruth===false);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
