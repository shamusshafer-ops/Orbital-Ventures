// #4 (2026-11-14): First Flight checklist, Basic "Next step" card, Basic tab gating, quieter staffing
// warnings, and the start-up flow. Every checklist step must flip from real campaign state, not clicks.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
const fs=require('fs'), path=require('path');
const srcPath=f=>[path.join(process.cwd(),'src',f), path.join(process.cwd(),'..','src',f)].find(p=>fs.existsSync(p));
const SAVE=fs.readFileSync(srcPath('save.js'),'utf8');

// stable DOM stubs for the elements we read back
const _el={};
const _gebi=document.getElementById.bind(document);
document.getElementById=id=>{
  if(['coachPanel','tabMap','tabStation','tabBase','tabBench','tabRnd','tabCommand','uiLayerBtn'].includes(id))
    return _el[id]||(_el[id]=Object.assign(_gebi(id)||{}, {id, innerHTML:'', attrs:{}, setAttribute(k,v){ this.attrs[k]=String(v); }}));
  return _gebi(id);
};
const stepOf=k=>onboardingSteps().find(s=>s.key===k);
const doneKeys=()=>onboardingSteps().filter(s=>s.done).map(s=>s.key).join(',');
_gameStarted=true;

// ---------- 1. a new game ----------
{
  newGame('engineer');
  check('new game: starts in Basic', uiLayer()==='basic');
  check('new game: checklist is tracked from step 1', state.onboarding.tracked===true);
  check('new game: no step done yet', doneKeys()==='');
  check('new game: the first step is current', onboardingSteps()[0].current===true && onboardingSteps().filter(s=>s.current).length===1);
  check('new game: the coach shows the checklist', coachMode()==='checklist');
  render();
  const html=_el.coachPanel.innerHTML;
  check('panel: rendered with a 0/6 count and Show me', /First Flight/.test(html) && html.includes('0/6') && html.includes('Show me'));
  check('panel: visible', !_el.coachPanel.classList.contains('hidden'));
  check('startup: New Game no longer opens the Manufacturing pop-up', /function startupBegin\(diff\)\{ hideModal\(\); newGame\(diff\); _gameStarted=true; render\(\); \}/.test(SAVE));
  check('startup: New Game points first-timers at Napkin', /First time\? <b>Napkin<\/b> is the learning setting/.test(SAVE));
}

// ---------- 2. steps follow real state ----------
{
  newGame('engineer');
  onboardingMark('debrief'); // a stray mark must not complete the debrief step before any flight
  check('debrief: not done without a flight', !stepOf('debrief').done);
  setTab('bench');
  check('step 1: visiting the Design Bench', stepOf('bench').done);
  const r=onboardingResearchPick();
  check('step 2: suggests Static Fire Test Program first', r && r.id==='test_program');
  check('step 2: not done before research starts', !stepOf('research').done);
  buyResearch(r.id);
  check('step 2: done once a project is running', stepOf('research').done && !!state.activeResearch);
  check('step 3: not done before committing', !stepOf('commit').done);
  state.activeMission=OB_MISSION;
  queueBuild(true,'ob-commit');
  check('step 3: done once the build is queued', stepOf('commit').done && !stepOf('rollout').done);
  check('step 4 is now current', stepOf('rollout').current);
  check('panel: rollout step offers "Advance to rollout"', (render(), _el.coachPanel.innerHTML.includes('Advance to rollout')));
  let guard=0; while(!hangarFor(missionById(OB_MISSION)).length && guard++<400) advanceDays(1);
  check('step 4: done when the rocket reaches the hangar', stepOf('rollout').done && !stepOf('launch').done);
  const h=hangarFor(missionById(OB_MISSION))[0];
  launchFromHangar(h.id,h.hullId,'ob-fly');
  // a launch can stop on a weather hold or a live press-on/abort call (random); answer them as a player would
  const pendingKind=()=>state.launchTxn&&state.launchTxn.decision&&state.launchTxn.decision.selected==null?state.launchTxn.decision.kind:null;
  if(pendingKind()==='weather'){
    check('step 5: a weather hold before liftoff leaves Launch open', !stepOf('launch').done);
    const tx=state.launchTxn; launchAnyway(tx.id,tx.decision.revision);
  }
  if(pendingKind()==='live'){
    check('a live press-on/abort call (after liftoff) leaves the debrief open', stepOf('launch').done && !stepOf('debrief').done);
    const tx=state.launchTxn; resolveLiveCall(true,tx.id,tx.decision.revision);
  }
  check('launch resolved (no decision left pending)', pendingKind()===null);
  if(state.launchTxn&&state.launchTxn.phase==='presentation'){
    // a decision re-opened the flight playback: the debrief is on screen until the player closes it
    check('debrief on screen: step 6 still open', stepOf('launch').done && !stepOf('debrief').done);
    dismissAnim();
  }
  check('step 5: done once flown', stepOf('launch').done && state.flights===1);
  check('step 6: done once the debrief closes (animation off → immediately)', stepOf('debrief').done);
  check('complete: every step done', onboardingComplete());
  check('after: Basic switches to the Next step card', coachMode()==='next');
  render();
  check('after: Next step card shows the advisor\'s next action', _el.coachPanel.innerHTML.includes(esc(coachNextAction().title)));
  check('after: which is recommendedAction() unless the design can\'t fly it', coachNextAction().kind==='design' || coachNextAction().title===recommendedAction().title);
  // the card never says "Launch" for a rocket that can't fly the mission
  { const rec=recommendedAction();
    if(rec.kind==='launch'&&rec.missionId){
      state.activeMission=rec.missionId; state.stages=[{eng:'a4',count:1,prop:0.5,dia:1}]; state.build=null; resetBenchTransients();
      const n=coachNextAction();
      check('next step: a short rocket gets "Fix the design", not "Launch"', n.kind==='design' && /^Fix the design/.test(n.title) && n.tab==='bench' && /shortfall|TWR|thrust/i.test(n.detail));
    } else check('next step precondition: recommendedAction suggests a launch after First Flight', false);
  }
  setUiLayer('advanced');
  check('after: Advanced shows no coach panel', coachMode()===null && _el.coachPanel.classList.contains('hidden'));
}

// ---------- 3. Advance to rollout stops at the hangar ----------
{
  newGame('engineer'); state.activeMission=OB_MISSION;
  queueBuild(true,'ob-roll');
  onboardingAdvanceToRollout();
  check('advance to rollout: the hull is in the hangar afterwards', hangarFor(missionById(OB_MISSION)).length>0 || !document.getElementById('modal').classList.contains('hidden'));
  check('advance to rollout: not run past it (no launch happened)', state.flights===0);
}

// ---------- 4. collapse, dismiss, restart, old saves ----------
{
  newGame('engineer'); render();
  toggleCoach();
  check('collapse: shows the pill with progress', _el.coachPanel.innerHTML.includes('coach-pill') && _el.coachPanel.innerHTML.includes('0/6'));
  toggleCoach();
  dismissCoach();
  check('dismiss: checklist hidden', coachMode()===null && _el.coachPanel.classList.contains('hidden'));
  restartCoach();
  check('restart (Menu): checklist back', coachMode()==='checklist');
  check('Menu offers the restart', /restartCoach\(\)/.test(fs.readFileSync(srcPath('sim.js'),'utf8')));
  // an older campaign that has flown, without the onboarding record
  newGame('engineer'); delete state.onboarding; state.flights=3;
  check('older save that has flown: checklist counts as complete', onboardingComplete());
  newGame('engineer'); delete state.onboarding;
  check('older save that has not flown: checklist runs', !onboardingComplete() && coachMode()==='checklist');
}

// ---------- 5. Basic hides tabs that aren't useful yet ----------
{
  newGame('engineer'); render();
  check('basic 1942: Command / Design Bench / R&D shown', ['command','bench','rnd'].every(basicTabVisible));
  check('basic 1942: Solar System hidden', !basicTabVisible('map') && _el.tabMap.classList.contains('hidden'));
  check('basic 1942: Station Bench + Base Bench hidden', !basicTabVisible('station') && !basicTabVisible('base') && _el.tabStation.classList.contains('hidden') && _el.tabBase.classList.contains('hidden'));
  setUiLayer('advanced');
  check('advanced: every tab shown', SCENE_TABS.every(basicTabVisible) && !_el.tabMap.classList.contains('hidden') && !_el.tabStation.classList.contains('hidden'));
  setUiLayer('expert');
  check('expert: every tab shown', SCENE_TABS.every(basicTabVisible));
  setUiLayer('basic');
  // unlock: a mission with a profile becomes the next objective → Solar System appears with a note
  state.completed.crew_orbit=true;
  render();
  check('unlock: Station Bench appears once crew_orbit is flown', basicTabVisible('station') && !_el.tabStation.classList.contains('hidden'));
  check('unlock: a log line names it', state.log.some(l=>/Station Bench now available/.test(l.msg)));
  check('unlock: the new tab carries a dot until visited', _el.tabStation.classList.contains('tab-new'));
  state.tab='station'; render();
  check('unlock: visiting clears the dot', !_el.tabStation.classList.contains('tab-new'));
  render();
  const n=state.log.filter(l=>/Station Bench now available/.test(l.msg)).length;
  check('unlock: the note is logged once', n===1);
  check('solar system: shown when a tracking station exists or a profile mission is next', (()=>{ newGame('engineer'); const any=MISSIONS.find(m=>m.profile); state.completed[any.id]=true; return basicTabVisible('map'); })());
  check('setTab still reaches a hidden tab (advisor links)', (()=>{ newGame('engineer'); state.tab='map'; render(); return state.tab==='map'; })());
}

// ---------- 6. staffing warning only when it costs something ----------
{
  newGame('engineer'); render();
  check('precondition: Pioneer-era staffing penalty is 0', deptStaffingRelPenalty()===0 && workforceGaps().some(g=>g.kind==='understaffed'));
  check('basic, no penalty: no unstaffed row in Up Next', !outlinerItems().some(i=>/unstaffed/.test(i.label)));
  check('no penalty: no Command badge for it', !tabAlerts().command.some(x=>/unstaffed/.test(x)));
  setUiLayer('advanced');
  const row=outlinerItems().find(i=>/unstaffed/.test(i.label));
  check('advanced, no penalty: row kept, untimed and uncoloured', row && row.etaDays===Infinity && row.etaText==='no effect yet' && row.color!=='var(--bad)');
  check('advanced, no penalty: "next event" is no longer pinned to 1 day by it', outlinerItems().filter(i=>Number.isFinite(i.etaDays)).every(i=>i!==row));
  const realPen=deptStaffingRelPenalty;
  deptStaffingRelPenalty=()=>0.03;
  try{
    setUiLayer('basic');
    const hot=outlinerItems().find(i=>/unstaffed/.test(i.label));
    check('penalty bites: Basic shows it, red and "now"', hot && hot.etaDays===0 && hot.color==='var(--bad)');
    check('penalty bites: Command badge returns', tabAlerts().command.some(x=>/unstaffed/.test(x)));
  } finally { deptStaffingRelPenalty=realPen; }
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
