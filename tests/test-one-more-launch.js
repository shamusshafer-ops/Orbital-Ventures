// One-more-launch pass (2026-11-18): the post-flight debrief → Next move card, the bench Resize fix, and the
// ready hull as the bench's primary action. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
let rq=0;
function flyBench(kind){ // build the bench rocket, roll it out, fly it with a forced outcome, through the player path
  queueBuild(true,'q'+(++rq)); let g=0; while(!hangarList().length&&g++<600) advanceDays(1);
  const h=hangarList()[0]; if(!h) return false;
  _devForceOutcome=kind; const r=launchFromHangar(h.id,h.hullId,'f'+(++rq));
  if(_pendingInquiry) resolveInquiry('decline');
  return r!==false;
}
const benchHTML=()=>{ renderBenchLaunch(); return document.getElementById('benchLaunch').innerHTML||''; };

// ---------- a fresh game: no card ----------
newGame('engineer'); state.money=20;
check('a new game has no debrief', state.lastDebrief===null && lastFlightCardHTML()==='');
check('SAVE_VERSION bumped for the debrief', SAVE_VERSION>=75);

// ---------- ready hull is the bench's primary action ----------
state.activeMission='first_flight';
queueBuild(true,'rh'); { let g=0; while(!hangarList().length&&g++<600) advanceDays(1); }
{ const html=benchHTML(), h=hangarList()[0];
  check('with a hull waiting, the primary button flies that exact hull', html.indexOf(`launchFromHangar('${h.id}','${h.hullId}'`)>=0 && html.indexOf(`Fly ${h.hullId}`)>=0);
  check('…and another build is still offered, secondary', /Or commit another build/.test(html));
  _devForceOutcome='success'; launchFromHangar(h.id,h.hullId,'rh-fly'); }

// ---------- success debrief ----------
{
  const d=state.lastDebrief;
  check('a success records a debrief', d && d.kind==='success' && d.success && d.missionId==='first_flight' && d.first===true);
  check('…with what it earned', d.revenue>0 && d.rep>0 && d.sci>0);
  check('…and what it opened', Array.isArray(d.opened) && d.opened.includes('sounding'));
  check('the bench now carries a Last Flight card', /LAST FLIGHT/.test(benchHTML()) && /first success/.test(benchHTML()));
}

// ---------- Δv shortfall → Resize ----------
{
  state.activeMission='sounding';
  const m=curMission(), need=effectiveReqDv(m), v0=computeVehicle(), prop0=state.stages[0].prop;
  check('precondition: the proven rocket is just short for Sounding Rocket', v0.totalDv<need && need-v0.totalDv<100);
  const p=autoSizePlan(m);
  check('autoSizePlan closes the gap', p.ok && p.dv>=need && p.to>p.from);
  check('…with the smallest 0.1 t step that works', (()=>{ state.stages[p.stage].prop=Math.round((p.to-0.1)*10)/10; const v=computeVehicle(); state.stages[p.stage].prop=prop0; return v.totalDv<need*AUTOSIZE_MARGIN; })());
  check('…and leaves the rocket untouched until applied', state.stages[0].prop===prop0);
  const html=benchHTML();
  check('the bench offers Resize under the unavailable commit', /Commit unavailable/.test(html) && /id="benchResize"/.test(html) && /applyAutoSize\(\)/.test(html));
  check('the success card names the next mission and the one-click fix', /Sounding Rocket/.test(nextBenchLineHTML()) && /resize it in one click/.test(nextBenchLineHTML()));
  check('the card itself does not repeat the Resize move', !debriefNextMoves(state.lastDebrief).some(x=>/applyAutoSize/.test(x.action)));
  applyAutoSize();
  const v1=computeVehicle();
  check('applying it really changes the flown rocket', state.stages[p.stage].prop===p.to && v1.totalDv>=need);
  check('…so the commit is available again', canLaunch(v1,m,null).ok && !/id="benchResize"/.test(benchHTML()));
  check('a rocket that already fits needs no resize', autoSizePlan(m).fits===true);
  // impossible: a gap propellant can't close
  const save=state.stages.map(s=>Object.assign({},s)); state.activeMission='first_sat';
  const imp=autoSizePlan();
  check('a gap propellant alone cannot close says so', imp.ok===false && /engine or a stage|already/.test(imp.why));
  check('…and restores every stage', state.stages.every((s,i)=>s.prop===save[i].prop));
  state.activeMission='sounding';
}

// ---------- success below the reliability target suggests a real test campaign ----------
{
  const moves=debriefNextMoves(state.lastDebrief), t=moves.find(x=>/setTestLevel\(1\)/.test(x.action));
  check('below the recommended reliability, a static fire is offered with its real numbers', !!t && /\+5% reliability/.test(t.detail) && /\$0\.60M/.test(t.detail));
  const rel0=computeVehicle().reliability; eval(t.action);
  check('taking it is a real change on the bench', state.testLevel===1);
  state.testLevel=0; check('(sanity) reliability preview read from the bench', rel0>0);
}

// ---------- failure debrief and remedies ----------
{
  state.money=20;
  flyBench('loss');
  const d=state.lastDebrief;
  check('a failure records the cause', d && d.kind==='loss' && !d.success && d.subsystem==='propulsion' && d.phase==='ascent' && /engine failed/.test(d.story||''));
  check('…the reliability it flew at', d.rel>0 && d.rel<1);
  const html=lastFlightCardHTML();
  check('the card shows the failure and its story', /propulsion failure/.test(html) && /engine failed/.test(html));
  const moves=debriefNextMoves(d);
  check('remedy: a test campaign', moves.some(x=>/setTestLevel\(/.test(x.action)));
  check('remedy: reliability research, startable when affordable', moves.some(x=>/buyResearch\('test_program'\)/.test(x.action)));
  check('remedy: a propulsion specialist', moves.some(x=>/hirePersonnel\(/.test(x.action) && /propulsion/.test(x.detail)));
  check('at most three moves', moves.length<=3);
  const r=moves.find(x=>/buyResearch/.test(x.action)); eval(r.action);
  check('acting on the research move starts it', state.activeResearch && state.activeResearch.id==='test_program');
  const h=moves.find(x=>/hirePersonnel/.test(x.action)); eval(h.action);
  check('acting on the hire move hires the specialist', bestSpecialistSkill('propulsion')>0);
  check('…and the card stops offering what is done', !debriefNextMoves(d).some(x=>/hirePersonnel|buyResearch\('test_program'\)/.test(x.action)));
}
// a static-fired flight that still failed escalates — but never past what you can pay for
{
  const d=Object.assign({},state.lastDebrief,{testLevel:1});
  state.money=50; state.testLevel=0;
  check('already static-fired → offer the uncrewed test flight', debriefNextMoves(d).some(x=>/setTestLevel\(2\)/.test(x.action)));
  state.money=1.2;
  check('short of cash → fall back to what you can afford, or nothing', !debriefNextMoves(d).some(x=>/setTestLevel\(2\)/.test(x.action)));
  state.money=0.3;
  check('…no test campaign at all when you could not fly afterwards', !debriefNextMoves(d).some(x=>/setTestLevel/.test(x.action)));
}
// research you can't afford while keeping enough to fly again is offered as a plan, not a purchase
{
  newGame('engineer'); state.money=20; state.activeMission='first_flight'; flyBench('loss');
  state.money=2.0;
  const r=debriefNextMoves(state.lastDebrief).find(x=>/Static Fire Test Program/.test(x.label));
  check('unaffordable-with-reserve research is a plan that opens R&D', r && /^Plan/.test(r.label) && /selectResearch/.test(r.action) && /to fly again/.test(r.detail));
}

// ---------- dismiss, older saves ----------
{
  dismissDebrief();
  check('dismissing hides the card', lastFlightCardHTML()==='' && state.lastDebrief.dismissed===true);
  delete state.lastDebrief;
  let ok=true; try{ benchHTML(); }catch(e){ ok=false; }
  check('an older save without the field renders the bench without a card', ok && lastFlightCardHTML()==='' && debriefNextMoves(undefined).length===0);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
