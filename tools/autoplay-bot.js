// tools/autoplay-bot.js — headless "sensible player" for measuring pacing and balance.
//
// It plays the way the game steers a player: follows recommendedAction(), designs the cheapest rocket
// that meets each mission by random search (single core, no boosters, no transfer stage — so it never
// flies profile/lunar/planetary missions), flies what's in the hangar, answers every launch decision
// with the aggressive option, signs affordable passive contracts, takes bridge loans on insolvency,
// and advances each turn with runToNextEvent() exactly as the header button does. It never hires staff,
// builds stations/bases or touches manufacturing — so it is a FLOOR, not a model of a human player.
// BOT_HIRE=1 (spine step 8) adds a staffing player: it takes the advisor's hire suggestions (scientists,
// astronauts) and staffs the three core engineering departments once the team reliability ceiling bites.
// Without it the bot never builds a crewed rocket it has no astronaut for.
// BOT_STATION=1 (decision-loop Phase 4a, measurement only): founds the LEO station once Crewed Orbit is flown and
// cash allows, flies cargo-pod resupply missions (station visits) when supply runs low — instant purchase only as
// an emergency — and grows the station (power first, then labs; a Docking Node when the ports fill). Pair with
// BOT_HIRE=1: the station needs Crewed Orbit, which needs an astronaut. The summary gains a `station` line.
// BOT_STATION=lean buys provisions on auto-reorder instead of flying them and never adds a module the crew can't run.
// BOT_DEBRIEF=1 (decision-loop Phase 0) takes the Last Flight card's first next move after every failure.
// The summary's failureLearning line counts failures that repeat the previous failure's subsystem. With Phase 2 it
// also inspects/redesigns/tests open failure investigations.
//
// Usage (from the repo root, after `node build.js`):
//   cat tests/harness.js build/game.js tools/autoplay-bot.js > /tmp/ovbot.js
//   BOT_SEED=2 BOT_YEAR=2000 BOT_DIFF=engineer BOT_TIMELINE=/tmp/tl.tsv BOT_SNAPS=1950,1970 node /tmp/ovbot.js
// Prints a JSON summary; BOT_TIMELINE writes one row per turn; BOT_SNAPS prints world snapshots to stderr.
// Deterministic per BOT_SEED (Math.random is replaced). Lives outside tests/ so the suite runner ignores it.
// Written for EVALUATION-2026-11-GAMEPLAY.md.
// Headless "sensible player" bot. Appended after harness.js + build/game.js.
// Plays with the game's own advisor + "advance to next event", logs what each turn was.
const OUT=[]; const say=s=>OUT.push(s);
// ---- money ledger: wrap the functions that move money; nesting-aware so a launch's payout isn't also counted as launch spend
const LEDGER={}; const _stack=[];
function ledgerWrap(name,cat){ const f=globalThis[name]||eval(name); if(typeof f!=='function') return;
  const w=function(...a){ const m0=state.money; _stack.push(0); let r; try{ r=f.apply(this,a); } finally { const child=_stack.pop(); const d=(state.money-m0)-child; const dec=Math.floor(state.year/10)*10; const L=LEDGER[dec]=LEDGER[dec]||{}; L[cat]=(L[cat]||0)+d; if(_stack.length) _stack[_stack.length-1]+=state.money-m0; } return r; };
  eval(name+'=w'); }

const YEAR_END=+(process.env.BOT_YEAR||1990), DIFF=process.env.BOT_DIFF||'engineer', SEED=+(process.env.BOT_SEED||1);
// deterministic Math.random for reproducibility
{ let a=SEED*2654435761>>>0; Math.random=()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// shims so the same bot runs on builds from before step 5a
if(typeof isServiceContract!=='function') globalThis.isServiceContract=()=>false;
if(typeof passiveSetupCost!=='function') globalThis.passiveSetupCost=d=>d.setup;
const RIVAL_CLAIMS=[];
// every settled flight's debrief, in order (read-only: it never changes play) — the repeat-failure measure
const FLIGHT_LOG=[];
if(typeof recordFlightDebrief==='function'){ const _rfd=recordFlightDebrief; recordFlightDebrief=function(...a){ const d=_rfd.apply(this,a); if(d) FLIGHT_LOG.push({y:state.year, ok:!!d.success, kind:d.kind, sub:d.subsystem||null, mid:d.missionId, rel:(()=>{ try{ return +computeVehicle().reliability.toFixed(3); }catch(e){ return null; } })(), cap:diff().relCap}); if(process.env.BOT_FLOG) console.error("FLOG "+JSON.stringify(d)); return d; }; }
newGame(DIFF); _gameStarted=true;
{ const _frf=fireRivalFirst; fireRivalFirst=function(r,f){ if(!state.rivalFired[r.id+'|'+f.name]) RIVAL_CLAIMS.push({rival:r.id,name:f.name,missionId:f.missionId||null,year:+(state.year+state.month/12).toFixed(2),nominal:f.year,playerHad:!!(f.missionId&&state.completed[f.missionId])}); return _frf(r,f); }; }
[['buyResearch','research'],['rushResearch','research'],['queueBuild','build'],['buildEngineStock','build'],['launchFromHangar','launch'],['finalizeLaunch','payouts'],['tickPassiveContracts','contracts'],['tickContinuousDay','daily (overhead, payroll, gov, facilities)'],['signPassiveContract','contracts'],['buildTrackingStation','infrastructure'],['bailout','loans'],['chooseBridgeLoan','loans'],['tickMonthlyBoundary','monthly events'],['acceptMandate','events'],['resolveSetback','events'],['foundFacility','station'],['addStationModule','station'],['resupplyFacility','station'],['tickStationOperations','station']].forEach(([n,c])=>{ try{ ledgerWrap(n,c); }catch(e){} });
// Animation stays ON so launch decisions stop the clock exactly as they do for a player (with it off the
// game auto-scrubs weather and never raises live calls). closeAnim() plays the role of the player
// closing each flight presentation, which is what releases deferred-flight settlement.
function closeAnim(){ for(let k=0;k<6&&typeof animState!=='undefined'&&animState;k++){ try{ dismissAnim(); }catch(e){ break; } } }
try{ state.onboarding.dismissed=true; }catch(e){}
if(process.env.BOT_POLICY){ try{ state.launchPolicy=process.env.BOT_POLICY; }catch(e){} } // default: whatever a new game ships with
/* Strategy scenarios (comprehensive evaluation, 2026-11-19):
   BOT_TEST=n      fly every vehicle with test campaign level n (1 static fire, 2 uncrewed test flight once unlocked) — the cautious player
   BOT_RELCUT=x    lower the difficulty's reliability cap and floor by x — an accident-prone program
   BOT_SHOCK=Y:f   multiply cash by f the first turn of year Y — the player entering the midgame broke
   BOT_SCIENCE=1   research science/deep-space nodes first — the science-focused player
   BOT_BASE=1      found and grow the lunar base once the landing is flown — the infrastructure player */
if(process.env.BOT_RELCUT){ const x=+process.env.BOT_RELCUT; try{ const d=diff(); d.relCap=Math.max(.5,d.relCap-x); d.relFloor=Math.max(.2,d.relFloor-x); }catch(e){} }
const SHOCK=(process.env.BOT_SHOCK||'').split(':').map(Number); let shockDone=false;
let rid=0; const R=()=>'bot'+(++rid);
const stats={turns:0, idleTurns:0, stops:{}, modals:{}, launches:0, success:0, fail:0, research:0, contractsSigned:0, hires:0, actionsPerTurn:[], daysPerTurn:[], firstYear:{}, stuck:{}, debriefMoves:{}, station:{founded:null,modulesAdded:0,visitsPlanned:0,visitsBuilt:0,bought:0,starvedTurns:0}};
const bump=(o,k,n=1)=>o[k]=(o[k]||0)+n;
// spine step 8: a sensible player doesn't build a crewed rocket with no astronaut on the payroll to fly it
const crewable=x=>!(typeof missionNeedsAstronaut==='function'&&missionNeedsAstronaut(x)) || (state.staff||[]).some(s=>roleOf(s.id)==='astro');
const flyableB=x=>missionFlyable(x)&&crewable(x);
const launchEngines=()=>unlockedEngines().filter(id=>!ENGINES[id].transferOnly);

// Failed searches are cached until the tech base changes (a new research node or engine) — the profile
// search is expensive and retrying it every turn made long runs take tens of minutes.
const _designMiss={};
function techKey(){ return Object.keys(state.research||{}).length+'|'+unlockedEngines().length+'|'+trackingStationCount()+'|'+(state.lunarArch||''); }
const _designHit={};
function shapeKey(m){ return [m.proc?'proc':m.id, m.reqDv, m.payload, m.crew, m.days, m.inclination||'', (m.modules||[]).join('+'), m.window?m.id:''].join('|'); }
function design(m){
  if((state.activeFlights||[]).some(f=>f&&(f.mission===m.id||f.missionId===m.id))) return null; // already en route: wait for it rather than launch copies
  if([...buildQueueList(),...hangarList()].some(h=>h&&h.missionId===m.id)) return null; // a vehicle for it is already built or building
  const key=shapeKey(m)+'@'+techKey(); if(_designMiss[key]) return null;
  if(_designHit[key]){ const d=_designHit[key]; return d; }
  const d=_design(m); if(!d) _designMiss[key]=true; else _designHit[key]=d; return d;
}
// what a sensible player maximises: expected payout minus what the flight costs
function netValue(x){ const d=design(x); if(!d) return -Infinity; const pay=x.proc?x.payout:estMissionPayout(x); return pay*(d.v.reliability||0.7)-(d.v.buildCost+d.v.launchCost); }
function repairProfile(m){
  // Greedy sizing for profile missions: start from the best-Isp in-space engines and a mid-size stack,
  // then grow whichever component's leg falls short (by l.by) and add engines when TWR is low.
  const engsLv=launchEngines(), all=unlockedEngines();
  const isp=id=>ENGINES[id].ispVac||0, thr=id=>ENGINES[id].thrustSL||0;
  const space=all.filter(id=>!ENGINES[id].lowThrust).sort((a,b)=>isp(b)-isp(a));
  const booster=engsLv.slice().sort((a,b)=>thr(b)-thr(a))[0], upper=engsLv.slice().sort((a,b)=>isp(b)-isp(a))[0];
  const mods=m.modules||[]; let best=null;
  for(const sEng of space.slice(0,3)) for(const lvShape of [2,3]){
    state.stages=lvShape===3?[{eng:booster,count:3,prop:600,dia:1.3},{eng:upper,count:2,prop:150,dia:1},{eng:upper,count:1,prop:40,dia:1}]:[{eng:booster,count:3,prop:400,dia:1.3},{eng:upper,count:1,prop:80,dia:1}];
    if(mods.includes('transfer')) state.transfer={eng:sEng,prop:20};
    if(mods.includes('lander')){ state.descent={eng:sEng,prop:6}; state.ascent={eng:sEng,prop:3}; }
    for(let it=0;it<80;it++){
      let v,sim; try{ v=computeVehicle(); sim=simulateMission(m); }catch(e){ break; }
      if(v.liftoff>padMassCap()) break;
      if(!(v.twr>1.2)){ const b=state.stages[0]; if(b.count<8) b.count++; else break; continue; }
      const c=canQueue(m,v,sim);
      if(c.ok){ const cost=v.buildCost+v.launchCost; if(!best||cost<best.cost) best={cost,stages:JSON.parse(JSON.stringify(state.stages)),transfer:Object.assign({},state.transfer),descent:Object.assign({},state.descent),ascent:Object.assign({},state.ascent),v}; break; }
      const bad=(sim&&sim.legs||[]).filter(l=>!l.pass).map(l=>l.by);
      if(!bad.length) break;
      if(bad.includes('descent')) state.descent.prop=Math.round(state.descent.prop*1.3*10)/10;
      if(bad.includes('ascent')) state.ascent.prop=Math.round(state.ascent.prop*1.3*10)/10;
      if(bad.includes('transfer')) state.transfer.prop=Math.round(state.transfer.prop*1.25*10)/10;
      if(bad.includes('lv')) state.stages.forEach(st=>{ st.prop=Math.round(st.prop*1.2); });
      if(state.stages[0].prop>20000) break;
    }
  }
  return best;
}
function _design(m){
  // Random search for the cheapest design the game itself accepts (canQueue). Single core, no boosters;
  // profile missions also size the transfer/descent/ascent stages. Window-gated missions are skipped.
  if(m.tanker||(m.stationVisit&&process.env.BOT_STATION!=='1')||(m.window&&!(state.committedWindow&&state.committedWindow.missionId===m.id))||m.deliverModule||m.orbitDeployment||m.vehicleDocking) return null;
  const engs=launchEngines(); if(!engs.length) return null;
  const inSpace=unlockedEngines().filter(id=>!ENGINES[id].lowThrust||ENGINES[id].selfPowered);
  const save=JSON.stringify({stages:state.stages,boosters:state.boosters,am:state.activeMission,transfer:state.transfer,descent:state.descent,ascent:state.ascent});
  state.activeMission=m.id; if(state.boosters) state.boosters.count=0;
  const props=[1,2,3,5,8,12,20,30,45,70,100,150,220,330,500,750,1100,1600,2300,3300];
  const sprops=[1,2,3,5,8,12,18,25,35,50,70,100,140,200];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const mods=m.modules||[]; let best=null;
  if(m.id==='luna_landing'&&typeof missionArchList==='function'&&!(state.lunarArch||state.arch)){ try{ commitLunarArch('lor'); }catch(e){} } // the historical choice; a real player picks one here
  const lprops=[2,4,6,9,12,16,20,25,30,40,55,70];
  const N=m.profile?14000:6000;
  for(let i=0;i<N;i++){
    const n=1+Math.floor(Math.random()*3), st=[];
    for(let k=0;k<n;k++) st.push({eng:pick(engs),count:1+Math.floor(Math.random()*(k?2:5)),prop:pick(props),dia:1});
    st.sort((a,b)=>b.prop-a.prop); state.stages=st;
    if(m.profile){
      if(mods.includes('transfer')) state.transfer={eng:pick(inSpace),prop:pick(sprops)};
      if(mods.includes('descent')||mods.includes('lander')) state.descent={eng:pick(inSpace),prop:pick(lprops)};
      if(mods.includes('ascent')||mods.includes('lander')) state.ascent={eng:pick(inSpace),prop:pick(lprops)};
    }
    let v, sim=null; try{ v=computeVehicle(); if(m.profile) sim=simulateMission(m); }catch(e){ continue; }
    if(!v||!(v.twr>1.15)||v.liftoff>padMassCap()) continue;
    const ok=canQueue(m,v,sim); if(!ok.ok) continue;
    const cost=v.buildCost+v.launchCost-(v.reliability||0)*m.payout*.5;
    if(!best||cost<best.cost) best={cost,stages:JSON.parse(JSON.stringify(st)),transfer:Object.assign({},state.transfer),descent:Object.assign({},state.descent),ascent:Object.assign({},state.ascent),v};
  }
  if(!best&&m.profile){ try{ best=repairProfile(m); }catch(e){} }
  const sv=JSON.parse(save); Object.assign(state,{stages:sv.stages,boosters:sv.boosters,activeMission:sv.am,transfer:sv.transfer,descent:sv.descent,ascent:sv.ascent});
  return best;
}
function answerLaunch(){
  closeAnim();
  for(let g=0; g<8 && (state.launchTxn||(typeof animState!=='undefined'&&animState)); g++){
    if(!state.launchTxn){ closeAnim(); break; }
    const tx=state.launchTxn, d=tx.decision;
    if(d && d.selected==null){
      bump(stats.modals,'launch:'+d.kind);
      try{
        if(d.kind==='weather') launchAnyway(tx.id,d.revision);
        else if(d.kind==='live') resolveLiveCall(true,tx.id,d.revision);
        else if(d.kind==='reserve') resolveReserveCall(true,tx.id,d.revision);
        else if(d.kind==='anomaly') resolveAnomaly((d.options&&d.options[0])||0,tx.id,d.revision);
        else if(d.kind==='orbital'||d.kind==='orbit') resolveOrbitalManeuver((d.options&&d.options[0]),tx.id,d.revision);
        else if(d.kind==='rescue'){ if(mountRescue(tx.id,d.revision)===false) abandonRescue(tx.id,d.revision); } /* crewed strand: mount the rescue if it can, else abandon (was left stuck) */
        else { bump(stats.stuck,'decision:'+d.kind); break; }
      }catch(e){ bump(stats.stuck,'err:'+d.kind); break; }
    } else if(tx.phase==='presentation'||(typeof animState!=='undefined'&&animState)){ closeAnim(); if(state.launchTxn===tx) break; }
    else break;
  }
}
function answerPending(){
  const p=[];
  if(_pendingSetback){ p.push('setback'); resolveSetback(state.money>40?'fund':'delay'); }
  if(_pendingLogiMishap){ p.push('mishap'); resolveMishap('accept'); }
  if(_pendingSampleDecision){ p.push('sample'); resolveSampleDecision('sell'); }
  if(_pendingDiscovery){ p.push('discovery'); resolveDiscovery('decline'); }
  if(_pendingHearing){ p.push('hearing'); resolveHearing('defend'); }
  if(_pendingRivalDisaster){ p.push('rivaldisaster'); try{ declineRivalRescue(); }catch(e){} _pendingRivalDisaster=null; }
  if(state.mandate&&!state.mandate.accepted&&!state.mandate.declined){ p.push('mandate'); try{ acceptMandate(); }catch(e){} }
  if(state.review&&state.review.pending){ p.push('review'); const g=state.review.graded||[]; stats.objMet=(stats.objMet||0)+g.filter(x=>x.met).length; stats.objKinds=stats.objKinds||{}; g.forEach(x=>{ const k=stats.objKinds[x.kind]=stats.objKinds[x.kind]||[0,0]; k[1]++; if(x.met) k[0]++; }); stats.objTotal=(stats.objTotal||0)+g.length; try{ // pick the two it can most plausibly meet, as a player would
      const feas=o=>{ switch(o.kind){ case 'mission': { const m=missionById(o.missionId); return m&&flyableB(m)&&design(m)?3:0; }
        case 'flights': return o.target<=Math.max(2,(stats.lastYearSucc||2))?2.5:1; case 'service': return 2.6; case 'contracts': return 2.2;
        case 'research': return 1.8; case 'support': return 1.2; } return 0; };
      const pick=state.review.offered.slice().sort((a,b)=>feas(b)-feas(a)||(b.reward.money-a.reward.money)).slice(0,2);
      chooseReviewObjectives(pick.map(o=>o.id)); stats.lastYearSucc=0; }catch(e){} }
  if(state.crisis&&state.crisis.pending){ p.push('crisis'); try{ resolveCrisis('endured'); }catch(e){} }
  p.forEach(k=>bump(stats.modals,k));
  return p;
}
function modalTitle(){ try{ const m=document.getElementById('modal'); if(!m||!m.classList||m.classList.contains('hidden')) return null; const h=(m.innerHTML||'').match(/<h2[^>]*>([^<]{0,60})/); return h?h[1].replace(/&[a-z]+;/g,'').trim():'(untitled modal)'; }catch(e){ return null; } }

const firstAvail={};
function trackAvail(){ const t=state.year+state.month/12;
  for(const r of RESEARCH) if(!firstAvail['r:'+r.id]&&!state.research[r.id]&&reqsMet(r)&&researchEraMet(r)) firstAvail['r:'+r.id]=t;
  for(const m of MISSIONS) if(!firstAvail['m:'+m.id]&&!state.completed[m.id]&&missionFlyable(m)) firstAvail['m:'+m.id]=t;
  for(const o of (state.contractOffers||[])) if(!firstAvail['c:'+o.name]) firstAvail['c:'+o.name]=t; }
let lastYear=state.year, lastLogLen=(state.log||[]).length;
const timeline=[];
const SNAPS=(process.env.BOT_SNAPS||'').split(',').filter(Boolean).map(Number); const snapDone={};
function snapshot(){ const era=currentEra?currentEra():null; const mis=MISSIONS.filter(m=>!state.completed[m.id]).map(m=>({id:m.id,rep:m.minRep,flyable:missionFlyable(m),tech:missionTechMet(m),profile:!!m.profile,req:m.reqResearch||''})); const resAvail=RESEARCH.filter(r=>!state.research[r.id]&&reqsMet(r)); const eraBlocked=resAvail.filter(r=>!researchEraMet(r)).length, sciBlocked=resAvail.filter(r=>researchEraMet(r)&&!sciGateMet(r)).length, open=resAvail.filter(r=>researchEraMet(r)&&sciGateMet(r)).length; let inc=0; try{ inc=PASSIVE_CONTRACT_DEFS.filter(d=>passiveActive(d.id)).reduce((a,d)=>a+d.income,0);}catch(e){} console.error(JSON.stringify({date:state.year+'-'+(state.month+1),era:era&&era.id,money:Math.round(state.money),rep:Math.round(state.rep),science:Math.round(state.science||0),staff:(state.staff||[]).length,loans,rivalFired:Object.keys(state.rivalFired||{}).length,rivalFiredList:Object.keys(state.rivalFired||{}),scooped:Object.keys(state.scooped||{}),reorg:!!state.reorganization,res:{done:Object.keys(state.research).length,open,eraBlocked,sciBlocked},passiveIncome:inc,overhead:+(diff().overhead+econOverheadAdd()+productionUpkeep()+empireOpex()+loanInterest()).toFixed(2),gov:+govMonthlyFunding().toFixed(2),payroll:+state.staff.reduce((a,s)=>{const p=personById(s.id);return a+(p?p.salary:0);},0).toFixed(2),rivals:(state.rivals||[]).map(r=>r.name+':'+Object.keys(r.firsts||r.claimed||{}).length).join(' '),missionsLeft:mis.filter(m=>!m.profile).map(m=>m.id+(m.flyable?'*':'')+(m.tech?'':'[tech:'+m.req+']')).join(' '),profileLeft:mis.filter(m=>m.profile).length})); }
let loans=0;
while(state.year<YEAR_END && stats.turns<4000){
  if(state.over){ if(state.insolvency&&state.insolvency.status==='open'&&loans<3){ try{ bailout(); loans++; }catch(e){} try{ hideModal(); }catch(e){} } if(state.over) break; }
  const acts=[];
  trackAvail();
  for(const y of SNAPS) if(state.year>=y&&!snapDone[y]){ snapDone[y]=1; snapshot(); }
  answerPending().forEach(k=>acts.push('resolve '+k));
  if(SHOCK.length===2&&!shockDone&&state.year>=SHOCK[0]){ shockDone=true; const m0=state.money; state.money=Math.round(state.money*SHOCK[1]*100)/100; acts.push('cash shock $'+m0.toFixed(1)+'M -> $'+state.money.toFixed(1)+'M'); stats.shock={year:state.year,from:m0,to:state.money}; }
  if(process.env.BOT_TEST){ const n=+process.env.BOT_TEST; state.testLevel=(typeof testLevelUnlocked==='function'&&!testLevelUnlocked(n))?Math.min(n,1):n; }
  answerLaunch();
  // research
  // Until the first success the bot plays the First Flight checklist literally: research only what it
  // suggests (once), then build — the path a new player is coached along.
  const coaching=!state.completed.first_flight && !['0','fly'].includes(process.env.BOT_CHECKLIST);
  const curStep=coaching&&typeof onboardingSteps==='function'?(onboardingSteps().find(x=>x.current)||{}).key:null;
  if(coaching && !state.activeResearch && curStep==='research'){ const pk=onboardingResearchPick(); if(pk){ try{ buyResearch(pk.id); if(state.activeResearch){ acts.push('research '+pk.id+' (checklist)'); stats.research++; } }catch(e){} } }
  // BOT_HIRE=1 (spine step 8): a staffing player — takes the advisor's hire suggestions (scientists when
  // research waits on science, an astronaut when the next objective is crewed) and staffs each core
  // engineering department once the team reliability ceiling starts to bite. Default off = the no-staff floor.
  if(process.env.BOT_HIRE==='1' && !state.launchTxn){
    const rec=recommendedAction();
    if((rec.kind==='science'||rec.kind==='crew') && /^hirePersonnel\(/.test(rec.action||'') && state.money>20){ try{ eval(rec.action); stats.hires++; acts.push('hire: '+rec.title); }catch(e){} }
    if(typeof deptStaffingRelPenalty==='function' && deptStaffingRelPenalty()>0 && state.money>30){
      for(const d of ['propulsion','structures','avionics']){ if(deptStaffed(d)) continue; const p=availablePool().filter(x=>roleOf(x.id)==='eng'&&x.specialty===d).sort((a,b)=>a.salary-b.salary)[0]; if(p){ hirePersonnel(p.id); stats.hires++; acts.push('hire eng '+d); break; } }
    }
  }
  // BOT_DEBRIEF=1 (decision-loop Phase 0): after a failed flight, take the Last Flight card's first next move —
  // the player who reads the card and does what it says. Default off = the baseline bot.
  if(process.env.BOT_DEBRIEF==='1' && !state.launchTxn && typeof debriefNextMoves==='function'){
    const d=state.lastDebrief;
    if(d && !d.success && !d.dismissed && d.abs!==stats.debriefActed){ stats.debriefActed=d.abs;
      const mv=debriefNextMoves(d)[0];
      if(mv){ try{ const m0=state.money; eval(mv.action); bump(stats.debriefMoves, mv.action.replace(/\(.*$/,'')); acts.push('card: '+mv.label+(state.money!==m0?' ($'+(m0-state.money).toFixed(2)+'M)':'')); }catch(e){ bump(stats.stuck,'debrief:'+mv.action.slice(0,20)); } } }
  }
  // BOT_DEBRIEF=1 also works the failure investigations (Phase 2): inspect first; a confirmed flaw is redesigned
  // when affordable, else tested; a cleared one-off needs nothing.
  if(process.env.BOT_DEBRIEF==='1' && !state.launchTxn && typeof investigationActions==='function'){
    for(const inv of (state.investigations||[]).filter(x=>x.status==='open'&&!x.program)){
      const acts=investigationActions(inv), pick=k=>acts.find(a=>a.kind===k&&state.money-a.cost>=Math.max(1,flightAttemptCost()));
      const a=inv.finding==null?pick('inspect'):(pick('redesign')||pick('test'));
      if(a&&startInvestigationProgram(inv.id,a.kind)){ bump(stats.debriefMoves,'inv:'+a.kind); acts.length; }
    }
  }
  // BOT_STATION=1 (Phase 4a): found, supply and grow one LEO station
  let stationVisitPick=null;
  const STATION_MODE=process.env.BOT_STATION==='1'?'fly':process.env.BOT_STATION==='lean'?'lean':null;
  if(STATION_MODE && !state.launchTxn && typeof facilityBuilt==='function'){
    const F='leo_station', def=facilityById(F), st=stats.station, lean=STATION_MODE==='lean';
    const reserve=()=>Math.max(5,flightAttemptCost()*2);
    if(!facilityBuilt(F)){
      if(canFound(F).ok && state.money>def.foundCost+reserve()*2){ foundFacility(F); if(facilityBuilt(F)){ st.founded=+(state.year+state.month/12).toFixed(2); acts.push('found '+F); } }
    } else {
      const fs=facilityState(F), sup=facilitySupply(F);
      if(sup<=0.01) st.starvedTurns++;
      const pend=pendingStationVisit(F,'resupply'), inHull=pend&&([...hangarList(),...buildQueueList()].some(h=>h.missionId===pend.id));
      if(lean&&!fs.autoResupply){ toggleAutoResupply(F); acts.push('auto-resupply on'); } /* lean: buy provisions on auto-reorder */
      if(!lean && sup<=5 && !pend && canFlyStationVisit(F,'resupply').ok){ const keep=state.activeMission; const o=flyStationVisit(F,'resupply',false); state.activeMission=keep; if(o&&o.id){ st.visitsPlanned++; acts.push('plan resupply visit'); } }
      const p2=pendingStationVisit(F,'resupply');
      if(!lean&&p2&&!([...hangarList(),...buildQueueList()].some(h=>h.missionId===p2.id))) stationVisitPick=p2;
      { const mf=typeof supplyManifest==='function'?supplyManifest(F,12):null; /* Phase 4b: read the manifest — buy only when no pod lands before the stock runs low */
        const shortSoon=mf?(mf.low!=null&&mf.low-absDay()<=45):sup<=3;
        if(shortSoon && canResupply(F).ok){ resupplyFacility(F); st.bought++; acts.push('resupply (manifest: short before a pod lands)'); } }
      /* grow it: power when the next module would run a deficit, else labs; a node when the ports are full */
      const list=facilityModuleList(fs), pw=facilityPower(fs), ports=facilityPortCap(fs,def), pending=buildQueueList().filter(o=>o.kind==='station-module').length;
      if(!pending && st.modulesAdded<8){
        let want=list.length>=ports?'node_hub':(pw.net<6?'power_truss':(list.filter(x=>x==='lab_mod').length<3?'lab_mod':(state.research.orbital_depot&&!list.includes('depot_mod')?'depot_mod':'lab_mod')));
        if(!canAddStationModule(F,want).ok&&/add a habitat/.test(canAddStationModule(F,want).why||'')) want='can_std'; /* Phase 4b: crew first */
        const md=stationModuleDef(want), ok=canAddStationModule(F,want);
        const crewOk=!lean||(()=>{ const c=facilityCrew(fs), d=md&&md.stats||{}; return (c.req+(d.crewReq||0))<=(c.cap+(d.crew||0)); })(); /* lean: never outgrow the crew */
        if(ok.ok && crewOk && state.money>ok.cost+reserve()*2){ addStationModule(F,want); st.modulesAdded++; acts.push('station module '+want); }
      }
    }
  }
  // BOT_BASE=1: the infrastructure player — found the lunar base after the landing, keep it on auto-reorder, grow it
  if(process.env.BOT_BASE==='1' && !state.launchTxn && typeof facilityBuilt==='function'){
    const F='lunar_base', def=facilityById(F), st=stats.base=stats.base||{founded:null,modulesAdded:0,starvedTurns:0};
    const reserve=()=>Math.max(8,flightAttemptCost()*2);
    if(!facilityBuilt(F)){ if(canFound(F).ok && state.money>def.foundCost+reserve()*2){ foundFacility(F); if(facilityBuilt(F)){ st.founded=+(state.year+state.month/12).toFixed(2); acts.push('found '+F); } } }
    else { const fs=facilityState(F); if(facilitySupply(F)<=0.01) st.starvedTurns++; if(!fs.autoResupply) toggleAutoResupply(F);
      const pending=buildQueueList().filter(o=>o.kind==='station-module').length;
      if(!pending && st.modulesAdded<8){ const list=facilityModuleList(fs), pw=facilityPower(fs);
        const order=['hab_dome','reactor_pad','isru_plant','rover_garage','lab_mod','greenhouse','hab_dome','power_truss'];
        let want=pw.net<6?(state.research.surface_fission_power?'reactor_pad':'power_truss'):order.find(id=>!list.includes(id)&&canAddStationModule(F,id).ok)||'hab_dome';
        const ok=canAddStationModule(F,want); if(ok.ok&&state.money>ok.cost+reserve()*2){ addStationModule(F,want); st.modulesAdded++; acts.push('base module '+want); } } }
  }
  // a sensible player mothballs outposts when cash runs short and brings them back when it recovers (Phase 7)
  if(typeof mothballFacility==='function' && !state.launchTxn){ for(const F of Object.keys(state.facilities||{})){ if(!facilityBuilt(F)) continue;
    if(!facilityMothballed(F) && state.money<10){ if(mothballFacility(F)) { acts.push('mothball '+F); bump(stats,'mothballs'); } }
    else if(facilityMothballed(F) && state.money>reactivateCost(F)+60){ if(reactivateFacility(F)) acts.push('reactivate '+F); } } }
  const flyFirst=process.env.BOT_CHECKLIST==='fly' && !state.completed.first_flight; // comparison mode: no research before the first success
  if(!coaching && !flyFirst && !state.activeResearch){
    const rec=recommendedAction(); let r=null;
    if(rec.kind==='research') r=RESEARCH.find(x=>x.id===rec.researchId);
    if(!r) r=RESEARCH.filter(x=>!state.research[x.id]&&reqsMet(x)&&researchEraMet(x)&&sciGateMet(x)&&state.money>=rdCostOf(x)*2).sort((a,b)=>rdCostOf(a)-rdCostOf(b))[0];
    if(process.env.BOT_SCIENCE==='1'){ const sf=RESEARCH.filter(x=>['science','deepspace'].includes(x.track)&&!state.research[x.id]&&reqsMet(x)&&researchEraMet(x)&&sciGateMet(x)&&state.money>=rdCostOf(x)*2).sort((a,b)=>rdCostOf(a)-rdCostOf(b))[0]; if(sf) r=sf; }
    if(!r && typeof crashEligible==='function' && process.env.BOT_CRASH!=='0'){ // nothing open: pull next-era tech forward if the cash is idle
      const c=RESEARCH.filter(x=>crashEligible(x)&&sciGateMet(x)&&state.money>=crashCost(x)*3).sort((a,b)=>crashCost(a)-crashCost(b))[0];
      if(c){ try{ if(crashResearch(c.id)){ acts.push('crash '+c.id); stats.research++; stats.crash=(stats.crash||0)+1; } }catch(e){} }
    }
    if(r&&state.money>=rdCostOf(r)){ try{ buyResearch(r.id); if(state.activeResearch){ acts.push('research '+r.id); stats.research++; } }catch(e){} }
  }
  // fly what's in the hangar
  for(const h of hangarList().slice()){
    const m=missionById(h.missionId); if(!m) continue;
    state.activeMission=m.id;
    const before=state.flights||0, wins=Object.keys(state.completed||{}).length;
    try{ launchFromHangar(h.id,h.hullId,R()); }catch(e){ bump(stats.stuck,'launch-throw'); }
    answerLaunch();
    if((state.flights||0)>before){ stats.launches++; acts.push('launch '+m.id); stats.lastYearSucc=(stats.lastYearSucc||0)+1; }
  }
  // build toward the advisor's target, else repeat a profitable flyable mission
  const openService=(state.contractOffers||[]).filter(o=>o.service&&!contractOfferReferenced(o.id)).length;
  const longBuild=buildQueueList().some(o=>o.kind!=='station-module'&&(o.monthsLeft||0)>6)||hangarList().some(h=>{ const hm=missionById(h.missionId); return hm&&hm.window; }); /* a human keeps flying while a multi-year deep-space build is on the line or a hull waits for its window */
  if(buildQueueList().filter(o=>o.kind!=='station-module').length<(openService||longBuild?2:1)&&hangarList().filter(h=>!(missionById(h.missionId)||{}).window).length<1&&!state.launchTxn){ // hulls parked for a launch window don't stop other work; a second line when service flights are waiting
    let rec=recommendedAction();
    if(rec.kind==='tracking'&&rec.action){ try{ eval(rec.action); acts.push('advisor: '+rec.title); }catch(e){} rec=recommendedAction(); }
    let m=rec.missionId?missionById(rec.missionId):null;
    if(!m){ const no=nextObjective(); if(no&&flyableB(no.mission)) m=no.mission; }
    if(m&&m.window&&!(state.committedWindow&&state.committedWindow.missionId===m.id)){
      try{ const ws=windowsFor(m.id); const lead=(buildMonths(m)+2)*30; const i=ws.findIndex(w=>w.abs>absDay()+lead); if(i>=0){ commitWindow(m.id,i); acts.push('commit window '+m.id+' '+dayToDate(ws[i].abs)); } }catch(e){ bump(stats.stuck,'window-err'); } }
    if(!m||!flyableB(m)){
      const val=x=>x.proc?x.payout:estMissionPayout(x);
      const pool=MISSIONS.filter(x=>flyableB(x)&&(!x.window||(state.committedWindow&&state.committedWindow.missionId===x.id))&&!x.stationVisit&&!x.tanker)
        .concat((state.contractOffers||[]).filter(o=>!o.deliverModule&&!o.stationVisit&&!o.orbitDeployment&&!o.vehicleDocking&&(o.minRep||0)<=state.rep&&(!o.reqResearch||state.research[o.reqResearch])));
      const ranked=pool.sort((a,b)=>val(b)-val(a)).slice(0,6).map(x=>[x,netValue(x)]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]); // only jobs expected to make money
      m=ranked.length?ranked[0][0]:null;
      if(m&&m.proc) stats.procFlown=(stats.procFlown||0)+1;
    }
    if(m&&needsTrackingNetwork(m)&&trackingStationCount()<1){ const st=TRACKING_STATIONS.find(x=>canBuildStation(x.id).ok); if(st){ buildTrackingStation(st.id); acts.push('build tracking '+st.id); } }
    { const sv=(state.contractOffers||[]).filter(o=>o.service&&!contractOfferReferenced(o.id)).map(o=>[o,netValue(o)]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1])[0];
      if(sv&&(!m||state.completed[m.id]||buildQueueList().length)) { m=sv[0]; stats.serviceFlown=(stats.serviceFlown||0)+1; } }
    if(stationVisitPick){ const dv=design(stationVisitPick); if(dv){ m=stationVisitPick; stats.station.visitsBuilt++; } else bump(stats.stuck,'no-design:station-visit'); }
    let d=m?design(m):null;
    if(m&&!d){ bump(stats.stuck,'no-design:'+m.id);
      const val=x=>x.proc?x.payout:estMissionPayout(x);
      const alt=MISSIONS.filter(x=>x!==m&&flyableB(x)&&!x.window).concat((state.contractOffers||[]).filter(o=>!o.deliverModule&&!o.stationVisit&&!o.orbitDeployment&&!o.vehicleDocking&&(o.minRep||0)<=state.rep&&(!o.reqResearch||state.research[o.reqResearch]))).sort((a,b)=>val(b)-val(a));
      for(const x of alt){ const dx=design(x); if(dx&&(!state.completed[x.id]||x.proc)&&netValue(x)>0||dx&&state.completed[x.id]&&netValue(x)>0){ m=x; d=dx; if(x.proc) stats.procFlown=(stats.procFlown||0)+1; break; } }
      if(m&&!d) m=null; }
    if(m){
      if(d&&state.money>d.v.buildCost+d.v.launchCost+0.15){
        state.stages=d.stages; state.transfer=d.transfer; state.descent=d.descent; state.ascent=d.ascent; state.activeMission=m.id;
        const q=queueBuild(true,R()); if(q) acts.push('build '+m.id+' ($'+d.v.buildCost.toFixed(2)+'M, '+Math.round(d.v.totalDv)+' m/s)');
        else bump(stats.stuck,'queue-refused:'+m.id);
      } else bump(stats.stuck, d?'cant-afford:'+m.id:'no-design:'+m.id);
    }
  }
  // contracts
  try{ for(const d of PASSIVE_CONTRACT_DEFS){ const svcLoad=(state.passiveContracts||[]).filter(c=>c.service).reduce((a,c)=>a+1/(passiveDef(c.id).service.every),0); if(isServiceContract(d)&&svcLoad+1/d.service.every>0.45) continue; if(passiveStatus(d.id)==='available'&&state.money>passiveSetupCost(d)*2.5){ if(signPassiveContract(d.id)){ stats.contractsSigned++; acts.push('sign '+d.id); } } } }catch(e){}
  // a committed window that has passed: drop it so the next turn recommits to a later one
  if(state.committedWindow&&absDay()+20>state.committedWindow.abs){ const cw=state.committedWindow, h=hangarList().find(x=>x.missionId===cw.missionId);
    let ok=false; if(h){ try{ const m=missionById(cw.missionId); state.activeMission=m.id; ok=canLaunch(computeVehicle(),m,m.profile?simulateMission(m):null,true).ok; }catch(e){} }
    if(!ok){ try{ cancelWindow(); }catch(e){} bump(stats.stuck,'missed-window:'+cw.missionId);
      try{ const ws=windowsFor(cw.missionId); const i=ws.findIndex(w=>w.abs>absDay()+60); if(i>=0) commitWindow(cw.missionId,i); }catch(e){} } }
  // a hull waiting for its committed window: step day by day into the launch range rather than jumping past it
  { const cw=state.committedWindow, h=cw&&hangarList().find(x=>x.missionId===cw.missionId);
    if(h&&cw.abs-absDay()<=150&&cw.abs>=absDay()){ let g=0; while(g++<160&&!state.over){ const m=missionById(cw.missionId); state.activeMission=m.id; let ok=false; try{ ok=canLaunch(computeVehicle(),m,m.profile?simulateMission(m):null,true).ok; }catch(e){} if(ok||absDay()>cw.abs) break; advance(1); answerPending(); }
      if(state.committedWindow){ const before=state.flights||0; try{ launchFromHangar(h.id,h.hullId,R()); }catch(e){} answerLaunch(); if((state.flights||0)>before){ stats.launches++; acts.push('launch '+cw.missionId+' (window)'); } }
      if(state.committedWindow&&absDay()>state.committedWindow.abs){ try{ cancelWindow(); }catch(e){} bump(stats.stuck,'missed-window:'+h.missionId); } } }
  // advance one "turn" exactly as the button does
  if(!stats.firstInsolvency && (state.insolvency||loans>0||state.over)) stats.firstInsolvency=state.year+(state.month/12);
  const d0=absDay(), y0=state.year, logBefore=(state.log||[]).length;
  try{ runToNextEvent(); }catch(e){ bump(stats.stuck,'run-throw:'+String(e).slice(0,60)); advance(1); }
  const dd=absDay()-d0; stats.turns++; stats.daysPerTurn.push(dd); stats.actionsPerTurn.push(acts.length);
  if(!acts.length) stats.idleTurns++;
  const mt=modalTitle(); let why=mt?'modal: '+mt:'';
  if(!why){ const it=outlinerItems().filter(x=>Number.isFinite(x.etaDays))[0]; why=dd>=30&&!it?'no timed item (30-day step)':'outliner/arrival'; }
  bump(stats.stops, why.replace(/[0-9.$]+/g,'#').slice(0,70));
  if(mt) try{ hideModal(); }catch(e){}
  const newLogs=(state.log||[]).slice(0,Math.max(0,(state.log||[]).length-logBefore));
  timeline.push({d:`${state.year}-${String(state.month+1).padStart(2,'0')}`, dd, acts:acts.join('; '), why, money:Math.round(state.money*10)/10, rep:Math.round(state.rep)});
  for(const k of Object.keys(state.completed||{})) if(!stats.firstYear[k]) stats.firstYear[k]=state.year+'-'+(state.month+1);
}
const sum=a=>a.reduce((x,y)=>x+y,0), med=a=>{ const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
const newByYear={}; Object.values(firstAvail).forEach(t=>{ const y=Math.floor(t); newByYear[y]=(newByYear[y]||0)+1; });
const thin=[]; for(let y=1945;y+5<=Math.min(state.year,YEAR_END);y++){ let n=0; for(let k=y;k<y+5;k++) n+=newByYear[k]||0; if(n<2) thin.push(y+'-'+(y+4)+':'+n); }
const thinRuns=[]; { let run=null; for(let y=1945;y+5<=Math.min(state.year,YEAR_END);y++){ let n=0; for(let k=y;k<y+5;k++) n+=newByYear[k]||0; if(n<2){ if(!run) run=[y,y]; else run[1]=y; } else if(run){ thinRuns.push(run[0]+'..'+(run[1]+4)); run=null; } } if(run) thinRuns.push(run[0]+'..'+(run[1]+4)); }
const perDecade={}; timeline.forEach(t=>{ const y=+t.d.slice(0,4); (t.acts||'').split('; ').forEach(a=>{ if(a.startsWith('launch ')){ const id=a.slice(7).replace(' (window)',''); (perDecade[id]=perDecade[id]||[]).push(y); } }); });
let maxDecade=[0,'']; for(const id in perDecade){ const ys=perDecade[id].sort((a,b)=>a-b); for(let i=0;i<ys.length;i++){ let j=i; while(j<ys.length&&ys[j]<ys[i]+10) j++; if(j-i>maxDecade[0]) maxDecade=[j-i,id+'@'+ys[i]]; } }
const failRuns=(()=>{ let fails=0, repeat=0, sameNext=0; for(let i=0;i<FLIGHT_LOG.length;i++){ const f=FLIGHT_LOG[i]; if(f.ok) continue; fails++;
  const prev=FLIGHT_LOG.slice(0,i).reverse().find(x=>!x.ok); if(prev&&prev.sub&&prev.sub===f.sub) repeat++;
  const nxt=FLIGHT_LOG[i+1]; if(nxt&&!nxt.ok&&nxt.sub===f.sub) sameNext++; }
  return {flights:FLIGHT_LOG.length, failures:fails, failRate:+(fails/Math.max(1,FLIGHT_LOG.length)).toFixed(3), sameSubsystemAsLastFailure:repeat, backToBackSameSubsystem:sameNext,
    bySubsystem:FLIGHT_LOG.filter(f=>!f.ok).reduce((o,f)=>(o[f.sub||'?']=(o[f.sub||'?']||0)+1,o),{}), cardMoves:stats.debriefMoves||{}}; })();
const repeats={}; timeline.forEach(t=>(t.acts||'').split('; ').forEach(a=>{ if(a.startsWith('launch ')){ const id=a.slice(7).replace(' (window)',''); repeats[id]=(repeats[id]||0)+1; } }));
const decisionStops=Object.entries(stats.modals).filter(([k])=>k.startsWith('launch:')).reduce((a,[,v])=>a+v,0);
if(process.env.BOT_LEDGER){ require('fs').writeFileSync(process.env.BOT_LEDGER, JSON.stringify(LEDGER)); }
const polit=['mandate','review','hearing'].reduce((a,k)=>a+(stats.modals[k]||0),0);
console.log(JSON.stringify({failureLearning:failRuns}));
{ const r=(FLIGHT_LOG||[]).filter(f=>f.rel!=null), atCap=r.filter(f=>f.rel>=f.cap-1e-6), byDec={}; r.forEach(f=>{ const d=Math.floor(f.y/10)*10; const b=byDec[d]=byDec[d]||[0,0]; b[0]++; if(f.rel>=f.cap-1e-6) b[1]++; });
  console.log(JSON.stringify({reliability:{flights:r.length, atCap:atCap.length, atCapShare:+(atCap.length/Math.max(1,r.length)).toFixed(2), byDecade:byDec}})); }
if(process.env.BOT_BASE==='1'){ const fs=facilityState('lunar_base'); console.log(JSON.stringify({base:Object.assign({},stats.base||{},{built:!!(fs&&fs.built),modules:fs?facilityModuleList(fs):[]})})); }
if(process.env.BOT_STATION){ const fs=typeof facilityState==='function'?facilityState('leo_station'):null;
  const flown=(FLIGHT_LOG||[]).filter(f=>/^sv_/.test(f.mid||'')); 
  console.log(JSON.stringify({station:Object.assign({}, stats.station, {built:!!(fs&&fs.built), modules:fs?facilityModuleList(fs):[], supplyNow:fs?+facilitySupply('leo_station').toFixed(1):null,
    visitsFlown:flown.length, visitsSucceeded:flown.filter(f=>f.ok).length, science:Math.round(state.science||0)})})); }
console.log(JSON.stringify({politicalPerYear:+(polit/Math.max(1,state.year-1942)).toFixed(2),politicalKinds:{mandate:stats.modals.mandate||0,review:stats.modals.review||0,hearing:stats.modals.hearing||0},objectives:(stats.objMet||0)+'/'+(stats.objTotal||0),objKinds:stats.objKinds||{},rivalClaims:RIVAL_CLAIMS,crash:stats.crash||0,serviceFlown:stats.serviceFlown||0,firstInsolvency:stats.firstInsolvency?+stats.firstInsolvency.toFixed(2):null,decisionsPerLaunch:+(decisionStops/Math.max(1,stats.launches)).toFixed(2),decisionKinds:Object.fromEntries(Object.entries(stats.modals).filter(([k])=>k.startsWith('launch:'))),maxPerDecade:maxDecade,thinWindows:thin.length,thinRuns,procFlown:stats.procFlown||0,topRepeats:Object.entries(repeats).sort((a,b)=>b[1]-a[1]).slice(0,4),eraAt:ERAS[eraIndex(currentEra())].id,programsDone:PROGRAMS.filter(p=>p.missions.every(id=>state.completed[id])).map(p=>p.id)}));
console.log(JSON.stringify({diff:DIFF,seed:SEED,endYear:state.year,over:!!state.over,money:Math.round(state.money),rep:Math.round(state.rep),flights:state.flights,
  turns:stats.turns,idleTurns:stats.idleTurns,daysPerTurnMedian:med(stats.daysPerTurn),daysPerTurnMean:Math.round(sum(stats.daysPerTurn)/stats.turns),
  turnsPerYear:Math.round(stats.turns/Math.max(1,state.year-1942)),research:stats.research,researchedNodes:Object.keys(state.research).length,contracts:stats.contractsSigned,
  staff:(state.staff||[]).length,loans,rivalFired:Object.keys(state.rivalFired||{}).length,rivalFiredList:Object.keys(state.rivalFired||{}),scooped:Object.keys(state.scooped||{}),reorg:!!state.reorganization,stops:stats.stops,modals:stats.modals,stuck:stats.stuck,firstYear:stats.firstYear},null,1));
if(process.env.BOT_TIMELINE){ require('fs').writeFileSync(process.env.BOT_TIMELINE, timeline.map(t=>`${t.d}\t+${t.dd}d\t$${t.money}\trep ${t.rep}\t${t.why}\t${t.acts}`).join('\n')); }
process.exit(0);
