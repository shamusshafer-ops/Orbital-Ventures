// tools/autoplay-bot.js — headless "sensible player" for measuring pacing and balance.
//
// It plays the way the game steers a player: follows recommendedAction(), designs the cheapest rocket
// that meets each mission by random search (single core, no boosters, no transfer stage — so it never
// flies profile/lunar/planetary missions), flies what's in the hangar, answers every launch decision
// with the aggressive option, signs affordable passive contracts, takes bridge loans on insolvency,
// and advances each turn with runToNextEvent() exactly as the header button does. It never hires staff,
// builds stations/bases or touches manufacturing — so it is a FLOOR, not a model of a human player.
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
const YEAR_END=+(process.env.BOT_YEAR||1990), DIFF=process.env.BOT_DIFF||'engineer', SEED=+(process.env.BOT_SEED||1);
// deterministic Math.random for reproducibility
{ let a=SEED*2654435761>>>0; Math.random=()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
newGame(DIFF); _gameStarted=true;
try{ state.onboarding.dismissed=true; }catch(e){}
let rid=0; const R=()=>'bot'+(++rid);
const stats={turns:0, idleTurns:0, stops:{}, modals:{}, launches:0, success:0, fail:0, research:0, contractsSigned:0, hires:0, actionsPerTurn:[], daysPerTurn:[], firstYear:{}, stuck:{}};
const bump=(o,k,n=1)=>o[k]=(o[k]||0)+n;
const launchEngines=()=>unlockedEngines().filter(id=>!ENGINES[id].transferOnly);

function design(m){
  // random search for the cheapest flyable single-core design (no boosters, no transfer stage)
  if(m.profile||m.tanker||m.stationVisit||m.window) return null;
  const engs=launchEngines(); if(!engs.length) return null;
  const save=JSON.stringify({stages:state.stages,boosters:state.boosters,am:state.activeMission});
  state.activeMission=m.id; if(state.boosters) state.boosters.count=0;
  const props=[1,2,3,5,8,12,20,30,45,70,100,150,220,330,500,750,1100,1600,2300];
  let best=null;
  for(let i=0;i<6000;i++){
    const n=1+Math.floor(Math.random()*3), st=[];
    for(let k=0;k<n;k++){ const e=engs[Math.floor(Math.random()*engs.length)]; st.push({eng:e,count:1+Math.floor(Math.random()*(k?2:5)),prop:props[Math.floor(Math.random()*props.length)],dia:1}); }
    st.sort((a,b)=>b.prop-a.prop);
    state.stages=st;
    let v; try{ v=computeVehicle(); }catch(e){ continue; }
    if(!v||!(v.totalDv>=effectiveReqDv(m))||!(v.twr>1.15)) continue;
    if(v.liftoff>padMassCap()) continue;
    const cost=v.buildCost+v.launchCost-(v.reliability||0)*m.payout*.5;
    if(!best||cost<best.cost) best={cost,stages:JSON.parse(JSON.stringify(st)),v};
  }
  const s=JSON.parse(save); state.stages=s.stages; state.boosters=s.boosters; state.activeMission=s.am;
  return best;
}
function answerLaunch(){
  for(let g=0; g<8 && state.launchTxn; g++){
    const tx=state.launchTxn, d=tx.decision;
    if(d && d.selected==null){
      bump(stats.modals,'launch:'+d.kind);
      try{
        if(d.kind==='weather') launchAnyway(tx.id,d.revision);
        else if(d.kind==='live') resolveLiveCall(true,tx.id,d.revision);
        else if(d.kind==='reserve') resolveReserveCall(true,tx.id,d.revision);
        else if(d.kind==='anomaly') resolveAnomaly((d.options&&d.options[0])||0,tx.id,d.revision);
        else if(d.kind==='orbital'||d.kind==='orbit') resolveOrbitalManeuver((d.options&&d.options[0]),tx.id,d.revision);
        else { bump(stats.stuck,'decision:'+d.kind); break; }
      }catch(e){ bump(stats.stuck,'err:'+d.kind); break; }
    } else if(tx.phase==='presentation'){ try{ dismissAnim(); }catch(e){} if(state.launchTxn===tx) break; }
    else break;
  }
}
function answerPending(){
  const p=[];
  if(_pendingSetback){ p.push('setback'); resolveSetback(state.money>40?'fund':'delay'); }
  if(_pendingLogiMishap){ p.push('mishap'); resolveMishap('accept'); }
  if(_pendingInquiry){ p.push('inquiry'); resolveInquiry('decline'); }
  if(_pendingSampleDecision){ p.push('sample'); resolveSampleDecision('sell'); }
  if(_pendingDiscovery){ p.push('discovery'); resolveDiscovery('decline'); }
  if(_pendingHearing){ p.push('hearing'); resolveHearing('defend'); }
  if(_pendingRivalDisaster){ p.push('rivaldisaster'); try{ declineRivalRescue(); }catch(e){} _pendingRivalDisaster=null; }
  if(state.mandate&&!state.mandate.accepted&&!state.mandate.declined){ p.push('mandate'); try{ acceptMandate(); }catch(e){} }
  if(state.crisis&&state.crisis.pending){ p.push('crisis'); try{ resolveCrisis('endured'); }catch(e){} }
  p.forEach(k=>bump(stats.modals,k));
  return p;
}
function modalTitle(){ try{ const m=_el&&_el.modal; if(!m||!m.classList||m.classList.contains('hidden')) return null; const h=(m.innerHTML||'').match(/<h2[^>]*>([^<]{0,60})/); return h?h[1].replace(/&[a-z]+;/g,'').trim():'(untitled modal)'; }catch(e){ return null; } }

let lastYear=state.year, lastLogLen=(state.log||[]).length;
const timeline=[];
const SNAPS=(process.env.BOT_SNAPS||'').split(',').filter(Boolean).map(Number); const snapDone={};
function snapshot(){ const era=currentEra?currentEra():null; const mis=MISSIONS.filter(m=>!state.completed[m.id]).map(m=>({id:m.id,rep:m.minRep,flyable:missionFlyable(m),tech:missionTechMet(m),profile:!!m.profile,req:m.reqResearch||''})); const resAvail=RESEARCH.filter(r=>!state.research[r.id]&&reqsMet(r)); const eraBlocked=resAvail.filter(r=>!researchEraMet(r)).length, sciBlocked=resAvail.filter(r=>researchEraMet(r)&&!sciGateMet(r)).length, open=resAvail.filter(r=>researchEraMet(r)&&sciGateMet(r)).length; let inc=0; try{ inc=PASSIVE_CONTRACT_DEFS.filter(d=>passiveActive(d.id)).reduce((a,d)=>a+d.income,0);}catch(e){} console.error(JSON.stringify({date:state.year+'-'+(state.month+1),era:era&&era.id,money:Math.round(state.money),rep:Math.round(state.rep),science:Math.round(state.science||0),staff:(state.staff||[]).length,loans,rivalFired:Object.keys(state.rivalFired||{}).length,rivalFiredList:Object.keys(state.rivalFired||{}),scooped:Object.keys(state.scooped||{}),reorg:!!state.reorganization,res:{done:Object.keys(state.research).length,open,eraBlocked,sciBlocked},passiveIncome:inc,overhead:+(diff().overhead+econOverheadAdd()+productionUpkeep()+empireOpex()+loanInterest()).toFixed(2),gov:+govMonthlyFunding().toFixed(2),payroll:+state.staff.reduce((a,s)=>{const p=personById(s.id);return a+(p?p.salary:0);},0).toFixed(2),rivals:(state.rivals||[]).map(r=>r.name+':'+Object.keys(r.firsts||r.claimed||{}).length).join(' '),missionsLeft:mis.filter(m=>!m.profile).map(m=>m.id+(m.flyable?'*':'')+(m.tech?'':'[tech:'+m.req+']')).join(' '),profileLeft:mis.filter(m=>m.profile).length})); }
let loans=0;
while(state.year<YEAR_END && stats.turns<4000){
  if(state.over){ if(state.insolvency&&state.insolvency.status==='open'&&loans<3){ try{ bailout(); loans++; }catch(e){} try{ hideModal(); }catch(e){} } if(state.over) break; }
  const acts=[];
  for(const y of SNAPS) if(state.year>=y&&!snapDone[y]){ snapDone[y]=1; snapshot(); }
  answerPending().forEach(k=>acts.push('resolve '+k));
  answerLaunch();
  // research
  if(!state.activeResearch){
    const rec=recommendedAction(); let r=null;
    if(rec.kind==='research') r=RESEARCH.find(x=>x.id===rec.researchId);
    if(!r) r=RESEARCH.filter(x=>!state.research[x.id]&&reqsMet(x)&&researchEraMet(x)&&sciGateMet(x)&&state.money>=rdCostOf(x)*2).sort((a,b)=>rdCostOf(a)-rdCostOf(b))[0];
    if(r&&state.money>=rdCostOf(r)){ try{ buyResearch(r.id); if(state.activeResearch){ acts.push('research '+r.id); stats.research++; } }catch(e){} }
  }
  // fly what's in the hangar
  for(const h of hangarList().slice()){
    const m=missionById(h.missionId); if(!m) continue;
    state.activeMission=m.id;
    const before=state.flights||0, wins=Object.keys(state.completed||{}).length;
    try{ launchFromHangar(h.id,h.hullId,R()); }catch(e){ bump(stats.stuck,'launch-throw'); }
    answerLaunch();
    if((state.flights||0)>before){ stats.launches++; acts.push('launch '+m.id); }
  }
  // build toward the advisor's target, else repeat a profitable flyable mission
  if(!buildQueueList().length&&!hangarList().length&&!state.launchTxn){
    const rec=recommendedAction();
    let m=rec.missionId?missionById(rec.missionId):null;
    if(!m||m.profile||m.window){ const no=nextObjective(); if(no&&!no.mission.profile&&missionFlyable(no.mission)) m=no.mission; }
    if(!m||!missionFlyable(m)){ m=MISSIONS.filter(x=>missionFlyable(x)&&!x.profile&&!x.window&&!x.stationVisit&&!x.tanker).sort((a,b)=>b.payout-a.payout)[0]; }
    if(m){
      const d=design(m);
      if(d&&state.money>d.v.buildCost+d.v.launchCost+0.15){
        state.stages=d.stages; state.activeMission=m.id;
        const q=queueBuild(true,R()); if(q) acts.push('build '+m.id+' ($'+d.v.buildCost.toFixed(2)+'M, '+Math.round(d.v.totalDv)+' m/s)');
        else bump(stats.stuck,'queue-refused:'+m.id);
      } else bump(stats.stuck, d?'cant-afford:'+m.id:'no-design:'+m.id);
    }
  }
  // contracts
  try{ for(const d of PASSIVE_CONTRACT_DEFS){ if(passiveStatus(d.id)==='available'&&state.money>d.setup*2.5){ if(signPassiveContract(d.id)){ stats.contractsSigned++; acts.push('sign '+d.id); } } } }catch(e){}
  // advance one "turn" exactly as the button does
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
console.log(JSON.stringify({diff:DIFF,seed:SEED,endYear:state.year,over:!!state.over,money:Math.round(state.money),rep:Math.round(state.rep),flights:state.flights,
  turns:stats.turns,idleTurns:stats.idleTurns,daysPerTurnMedian:med(stats.daysPerTurn),daysPerTurnMean:Math.round(sum(stats.daysPerTurn)/stats.turns),
  turnsPerYear:Math.round(stats.turns/Math.max(1,state.year-1942)),research:stats.research,researchedNodes:Object.keys(state.research).length,contracts:stats.contractsSigned,
  staff:(state.staff||[]).length,loans,rivalFired:Object.keys(state.rivalFired||{}).length,rivalFiredList:Object.keys(state.rivalFired||{}),scooped:Object.keys(state.scooped||{}),reorg:!!state.reorganization,stops:stats.stops,modals:stats.modals,stuck:stats.stuck,firstYear:stats.firstYear},null,1));
if(process.env.BOT_TIMELINE){ require('fs').writeFileSync(process.env.BOT_TIMELINE, timeline.map(t=>`${t.d}\t+${t.dd}d\t$${t.money}\trep ${t.rep}\t${t.why}\t${t.acts}`).join('\n')); }
process.exit(0);
