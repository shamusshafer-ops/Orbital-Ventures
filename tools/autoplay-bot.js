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
try{ animEnabled=false; }catch(e){}
try{ state.onboarding.dismissed=true; }catch(e){}
let rid=0; const R=()=>'bot'+(++rid);
const stats={turns:0, idleTurns:0, stops:{}, modals:{}, launches:0, success:0, fail:0, research:0, contractsSigned:0, hires:0, actionsPerTurn:[], daysPerTurn:[], firstYear:{}, stuck:{}};
const bump=(o,k,n=1)=>o[k]=(o[k]||0)+n;
const launchEngines=()=>unlockedEngines().filter(id=>!ENGINES[id].transferOnly);

// Failed searches are cached until the tech base changes (a new research node or engine) — the profile
// search is expensive and retrying it every turn made long runs take tens of minutes.
const _designMiss={};
function techKey(){ return Object.keys(state.research||{}).length+'|'+unlockedEngines().length+'|'+trackingStationCount()+'|'+(state.lunarArch||''); }
function design(m){
  if((state.activeFlights||[]).some(f=>f&&(f.mission===m.id||f.missionId===m.id))) return null; // already en route: wait for it rather than launch copies
  const key=m.id+'@'+techKey(); if(_designMiss[key]) return null;
  const d=_design(m); if(!d) _designMiss[key]=true; return d;
}
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
  if(m.tanker||m.stationVisit||(m.window&&!(state.committedWindow&&state.committedWindow.missionId===m.id))||m.deliverModule||m.orbitDeployment||m.vehicleDocking) return null;
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
  if(!buildQueueList().length&&!hangarList().some(h=>!(missionById(h.missionId)||{}).window)&&!state.launchTxn){ // hulls parked for a launch window don't stop other work
    let rec=recommendedAction();
    if(rec.kind==='tracking'&&rec.action){ try{ eval(rec.action); acts.push('advisor: '+rec.title); }catch(e){} rec=recommendedAction(); }
    let m=rec.missionId?missionById(rec.missionId):null;
    if(!m){ const no=nextObjective(); if(no&&missionFlyable(no.mission)) m=no.mission; }
    if(m&&m.window&&!(state.committedWindow&&state.committedWindow.missionId===m.id)){
      try{ const ws=windowsFor(m.id); const lead=(buildMonths(m)+2)*30; const i=ws.findIndex(w=>w.abs>absDay()+lead); if(i>=0){ commitWindow(m.id,i); acts.push('commit window '+m.id+' '+dayToDate(ws[i].abs)); } }catch(e){ bump(stats.stuck,'window-err'); } }
    if(!m||!missionFlyable(m)){
      const val=x=>x.proc?x.payout:estMissionPayout(x);
      const pool=MISSIONS.filter(x=>missionFlyable(x)&&(!x.window||(state.committedWindow&&state.committedWindow.missionId===x.id))&&!x.stationVisit&&!x.tanker)
        .concat((state.contractOffers||[]).filter(o=>!o.deliverModule&&!o.stationVisit&&!o.orbitDeployment&&!o.vehicleDocking&&(o.minRep||0)<=state.rep&&(!o.reqResearch||state.research[o.reqResearch])));
      m=pool.sort((a,b)=>val(b)-val(a))[0];
      if(m&&m.proc) stats.procFlown=(stats.procFlown||0)+1;
    }
    if(m&&needsTrackingNetwork(m)&&trackingStationCount()<1){ const st=TRACKING_STATIONS.find(x=>canBuildStation(x.id).ok); if(st){ buildTrackingStation(st.id); acts.push('build tracking '+st.id); } }
    let d=m?design(m):null;
    if(m&&!d){ bump(stats.stuck,'no-design:'+m.id);
      const val=x=>x.proc?x.payout:estMissionPayout(x);
      const alt=MISSIONS.filter(x=>x!==m&&missionFlyable(x)&&!x.window).concat((state.contractOffers||[]).filter(o=>!o.deliverModule&&!o.stationVisit&&!o.orbitDeployment&&!o.vehicleDocking&&(o.minRep||0)<=state.rep&&(!o.reqResearch||state.research[o.reqResearch]))).sort((a,b)=>val(b)-val(a));
      for(const x of alt){ const dx=design(x); if(dx){ m=x; d=dx; if(x.proc) stats.procFlown=(stats.procFlown||0)+1; break; } } }
    if(m){
      if(d&&state.money>d.v.buildCost+d.v.launchCost+0.15){
        state.stages=d.stages; state.transfer=d.transfer; state.descent=d.descent; state.ascent=d.ascent; state.activeMission=m.id;
        const q=queueBuild(true,R()); if(q) acts.push('build '+m.id+' ($'+d.v.buildCost.toFixed(2)+'M, '+Math.round(d.v.totalDv)+' m/s)');
        else bump(stats.stuck,'queue-refused:'+m.id);
      } else bump(stats.stuck, d?'cant-afford:'+m.id:'no-design:'+m.id);
    }
  }
  // contracts
  try{ for(const d of PASSIVE_CONTRACT_DEFS){ if(passiveStatus(d.id)==='available'&&state.money>d.setup*2.5){ if(signPassiveContract(d.id)){ stats.contractsSigned++; acts.push('sign '+d.id); } } } }catch(e){}
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
const repeats={}; timeline.forEach(t=>(t.acts||'').split('; ').forEach(a=>{ if(a.startsWith('launch ')){ const id=a.slice(7).replace(' (window)',''); repeats[id]=(repeats[id]||0)+1; } }));
console.log(JSON.stringify({maxPerDecade:maxDecade,thinWindows:thin.length,thinRuns,procFlown:stats.procFlown||0,topRepeats:Object.entries(repeats).sort((a,b)=>b[1]-a[1]).slice(0,4),eraAt:ERAS[eraIndex(currentEra())].id,programsDone:PROGRAMS.filter(p=>p.missions.every(id=>state.completed[id])).map(p=>p.id)}));
console.log(JSON.stringify({diff:DIFF,seed:SEED,endYear:state.year,over:!!state.over,money:Math.round(state.money),rep:Math.round(state.rep),flights:state.flights,
  turns:stats.turns,idleTurns:stats.idleTurns,daysPerTurnMedian:med(stats.daysPerTurn),daysPerTurnMean:Math.round(sum(stats.daysPerTurn)/stats.turns),
  turnsPerYear:Math.round(stats.turns/Math.max(1,state.year-1942)),research:stats.research,researchedNodes:Object.keys(state.research).length,contracts:stats.contractsSigned,
  staff:(state.staff||[]).length,loans,rivalFired:Object.keys(state.rivalFired||{}).length,rivalFiredList:Object.keys(state.rivalFired||{}),scooped:Object.keys(state.scooped||{}),reorg:!!state.reorganization,stops:stats.stops,modals:stats.modals,stuck:stats.stuck,firstYear:stats.firstYear},null,1));
if(process.env.BOT_TIMELINE){ require('fs').writeFileSync(process.env.BOT_TIMELINE, timeline.map(t=>`${t.d}\t+${t.dd}d\t$${t.money}\trep ${t.rep}\t${t.why}\t${t.acts}`).join('\n')); }
process.exit(0);
