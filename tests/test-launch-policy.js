// Spine step 3 (2026-11-16): the launch commit policy. Appended after harness.js + build/game.js.
// A standing policy answers routine launch calls (weather, live call, reserve, orbit plan) through the same
// resolvers a click uses; anomalies always ask; 'manual' keeps the old behaviour.
animEnabled=true;
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const logHas=re=>(state.log||[]).some(e=>re.test(e.msg||''));

// ---- defaults and persistence ----
newGame('engineer');
check('new games default to Nominal', state.launchPolicy==='nominal' && launchPolicy()==='nominal');
check('SAVE_VERSION bumped for state.launchPolicy', SAVE_VERSION>=70);
state.launchPolicy='nonsense';
check('an unknown value reads as Nominal', launchPolicy()==='nominal');
setLaunchPolicy('bold'); check('setLaunchPolicy sets it', state.launchPolicy==='bold');
setLaunchPolicy('nope'); check('…and ignores unknown ids', state.launchPolicy==='bold');
cycleLaunchPolicy(); check('cycle wraps through the list', state.launchPolicy==='manual');

// ---- the decision table ----
{
  const P=(pol,kind,info)=>{ state.launchPolicy=pol; return policyChoice(kind,info); };
  check('Manual never answers', ['weather','live','reserve','orbit'].every(k=>P('manual',k,{penalty:.1,survivableAbort:true,crewed:true,enabled:['circularize','raise']})===null));
  check('nobody answers anomalies or rescues', ['cautious','nominal','bold'].every(p=>P(p,'anomaly',{})===null&&P(p,'rescue',{})===null));
  check('weather: Cautious stands down, Bold flies', P('cautious','weather',{penalty:.035})==='scrub' && P('bold','weather',{penalty:.12})==='launch');
  check('weather: Nominal flies light weather, stands down at 6% or more', P('nominal','weather',{penalty:.05})==='launch' && P('nominal','weather',{penalty:.06})==='scrub' && P('nominal','weather',{penalty:.08})==='scrub');
  check('live: with no survivable abort, everyone presses on', ['cautious','nominal','bold'].every(p=>P(p,'live',{survivableAbort:false,crewed:true})==='press'));
  check('live: Cautious aborts, Bold presses', P('cautious','live',{survivableAbort:true,crewed:false})==='abort' && P('bold','live',{survivableAbort:true,crewed:true})==='press');
  check('live: Nominal aborts only with crew aboard', P('nominal','live',{survivableAbort:true,crewed:true})==='abort' && P('nominal','live',{survivableAbort:true,crewed:false})==='press');
  check('reserve: Cautious burns, Bold banks, Nominal burns with crew', P('cautious','reserve',{crewed:false})==='burn' && P('bold','reserve',{crewed:true})==='bank' && P('nominal','reserve',{crewed:true})==='burn' && P('nominal','reserve',{crewed:false})==='bank');
  check('orbit: raise when margin allows, else the planned orbit', P('nominal','orbit',{enabled:['circularize','raise','deorbit']})==='raise' && P('bold','orbit',{enabled:['circularize','deorbit']})==='circularize');
  check('orbit: Cautious flies the plan', P('cautious','orbit',{enabled:['circularize','raise']})==='circularize');
  check('orbit: never picks an option that is not on offer', P('nominal','orbit',{enabled:['deorbit']})===null);
}

// ---- end to end: a forced weather hold ----
function launchFirstFlight(policy){
  newGame('engineer'); state.money=50; state.launchPolicy=policy; state.activeMission='first_flight';
  queueBuild(true,'lp-'+policy); let g=0; while(!hangarList().length&&g++<400) advanceDays(1);
  const h=hangarList()[0]; devForceWeather(); launchFromHangar(h.id,h.hullId,'lp-fly-'+policy);
}
launchFirstFlight('manual');
check('Manual: the weather hold waits for the player', !!_pendingLaunch && state.launchTxn && state.launchTxn.decision && state.launchTxn.decision.kind==='weather' && state.launchTxn.decision.selected==null);
launchFirstFlight('nominal');
check('Nominal: a forced (10%) weather hold is answered — stood down', !_pendingLaunch && logHas(/launch policy \(Nominal\) — stood down for/) && logHas(/scrubbed for weather/));
check('…and the weather decision is recorded as a real selection', !state.launchTxn || !state.launchTxn.decision || state.launchTxn.decision.kind!=='weather' || state.launchTxn.decision.selected==='scrub');
launchFirstFlight('bold');
check('Bold: flew through it', !_pendingLaunch && logHas(/launch policy \(Bold\) — flew through/) && logHas(/polled GO despite/));

// ---- end to end: a forced live call on an uncrewed flight ----
function liveCall(policy){
  newGame('engineer'); state.money=50; state.launchPolicy=policy; state.activeMission='first_flight';
  queueBuild(true,'lc-'+policy); let g=0; while(!hangarList().length&&g++<400) advanceDays(1);
  const h=hangarList()[0]; devForceLiveCall(); launchFromHangar(h.id,h.hullId,'lc-fly-'+policy);
  if(_pendingLaunch&&state.launchTxn&&state.launchTxn.decision&&state.launchTxn.decision.kind==='weather') launchAnyway(state.launchTxn.id,state.launchTxn.decision.revision);
}
liveCall('manual');
check('Manual: the live call waits for the player', !!_pendingLive);
liveCall('nominal');
check('Nominal (uncrewed): pressed on and logged it', !_pendingLive && logHas(/launch policy \(Nominal\) — pressed on through an amber/));
liveCall('cautious');
check('Cautious (uncrewed, abort survivable): aborted', !_pendingLive && logHas(/launch policy \(Cautious\) — aborted when/));

// ---- UI ----
newGame('engineer'); showSettingsMenu();
const menu=document.getElementById('modalBody').innerHTML||'';
check('Menu offers the four policies', menu.includes('Launch calls') && ['Manual','Cautious','Nominal','Bold'].every(l=>menu.includes('>'+l+'<')));
check('…marks the current one and says anomalies always ask', menu.includes('aria-checked="true"') && menu.includes('In-flight anomalies always ask'));
hideModal();
check('the bench launch block names the policy', (()=>{ renderBenchLaunch(); const h=(document.getElementById('benchLaunch')||{}).innerHTML||''; return h.includes('Launch calls: <b>'+LAUNCH_POLICIES[launchPolicy()].label+'</b>'); })()); /* rendered output, not source text (Phase 1 moved it into the go/no-go block) */

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
