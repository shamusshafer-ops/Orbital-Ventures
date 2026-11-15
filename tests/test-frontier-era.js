// Spine step 1 (2026-11-16): the frontier era. Appended after harness.js + build/game.js.
// The world's era is the later of the calendar era and the era opened by the most recent Program
// completed by anyone (player, or rivals claiming its missions). Plus era-0 contracts and two advisor fixes.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const eraId=()=>currentEra().id;
const completeProgram=id=>PROGRAMS.find(p=>p.id===id).missions.forEach(m=>{ state.completed[m]=true; });

// ---- frontier basics ----
newGame('engineer');
check('a new game starts in the Pioneer era', eraId()==='pioneer' && frontierEraIndex()===0 && eraSource().kind==='calendar');
completeProgram('pioneer');
check('finishing the Pioneer Program opens Early Orbital in 1942', state.year===1942 && eraId()==='early_orbital');
check('eraSource names the Program that opened the era', eraSource().kind==='program' && eraSource().program.id==='pioneer');
completeProgram('vanguard');
check('Vanguard opens Crewed & Lunar', eraId()==='crewed_lunar');
completeProgram('mercury'); completeProgram('gemini');
check('Programs with no opensEra do not move the frontier', eraId()==='crewed_lunar');
state.year=1980;
check('the calendar still wins when it is later', eraId()==='station_shuttle' && eraSource().kind==='calendar');
state.year=1942; completeProgram('apollo');
check('Apollo opens Station & Shuttle', eraId()==='station_shuttle');

// ---- a partly-done Program does nothing; rivals' claims count toward "done by the world" ----
newGame('engineer');
PROGRAMS.find(p=>p.id==='pioneer').missions.slice(0,-1).forEach(m=>{ state.completed[m]=true; });
check('an unfinished Program does not open its era', eraId()==='pioneer');
completeProgram('pioneer');
const r=RIVALS.find(x=>x.firsts.some(f=>f.missionId==='first_sat')), f=r.firsts.find(x=>x.missionId==='first_sat');
check('the vanguard mission is not done yet', !state.completed.first_sat && eraId()==='early_orbital');
state.rivalFired[r.id+'|'+f.name]=true;
check('a rival claiming First Satellite completes Vanguard for the world', rivalClaimedMission('first_sat') && programDoneByWorld(PROGRAMS.find(p=>p.id==='vanguard')));
check('…and the world moves on to Crewed & Lunar', eraId()==='crewed_lunar');

// ---- research gates follow the frontier ----
newGame('engineer');
const n1=RESEARCH.find(x=>x.eraMin===1);
check('an era-1 node is locked at the start', !researchEraMet(n1));
completeProgram('pioneer');
check('…and opens with the Pioneer Program', researchEraMet(n1));

// ---- data integrity: no Program needs research from beyond what earlier Programs open ----
{
  const R=Object.fromEntries(RESEARCH.map(x=>[x.id,x]));
  const closure=(id,seen=new Set())=>{ if(!id||seen.has(id)||!R[id]) return seen; seen.add(id); (R[id].req||[]).forEach(p=>closure(p,seen)); return seen; };
  const need=p=>{ let e=0; p.missions.forEach(mid=>{ const m=MISSIONS.find(x=>x.id===mid); [...closure(m&&m.reqResearch)].forEach(n=>{ e=Math.max(e,R[n].eraMin||0); }); }); return e; };
  let opened=0, ok=true, last=-1, mono=true;
  for(const p of PROGRAMS){
    if(need(p)>opened){ ok=false; console.log('  needs era',need(p),'but only',opened,'is open before',p.id); }
    if(p.opensEra!=null){ if(p.opensEra<last) mono=false; last=p.opensEra; opened=Math.max(opened,p.opensEra); }
  }
  check('every Program can be researched in the era its predecessors open (no stall waiting on the calendar)', ok);
  check('opensEra never goes backwards along the ladder', mono);
  check('opensEra values are real era indices', PROGRAMS.every(p=>p.opensEra==null||(p.opensEra>=1&&p.opensEra<ERAS.length)));
}

// ---- era interstitial: fires on a frontier jump and says why ----
newGame('engineer'); state.eraSeen=0; completeProgram('pioneer'); hideModal();
maybeShowEraInterstitial();
const html=['modal','modalBody','modalContent'].map(id=>document.getElementById(id).innerHTML||'').join(' ');
check('the era screen fires when a Program opens an era', html.includes('Early Orbital'));
check('…says it arrived ahead of history', html.includes('years ahead of history'));
check('…and credits the Program', html.includes('Pioneer Program'));
dismissEraInterstitial(1); hideModal();

// ---- era-0 procedural contracts ----
{
  const early=CONTRACT_ARCHETYPES.filter(a=>a.minEra===0);
  check('two Pioneer-era contract archetypes exist', early.length===2 && early.some(a=>a.kind==='upper_air') && early.some(a=>a.kind==='range_test'));
  newGame('engineer');
  check('none are offered before the first flight', early.every(a=>!a.req(state)));
  state.flights=1; state.completed.reach_space=true;
  check('both qualify once the company has flown and reached space', early.every(a=>a.req(state)));
  const built=early.map(a=>a.build(0));
  check('they are suborbital jobs with no profile', built.every(b=>!b.profile && b.reqDv>=1900 && b.reqDv<=6500 && b.payout>0));
  // price band vs the authored suborbital ladder: beat re-flying a comparable milestone, never beat flying it first
  const ladder=MISSIONS.filter(m=>!m.profile&&!m.crew&&m.reqDv&&m.reqDv<=9400).sort((x,y)=>x.reqDv-y.reqDv);
  let band=true; for(let k=0;k<200;k++) for(const a of early){ const c=a.build(0);
    const below=ladder.filter(m=>m.reqDv<=c.reqDv).pop(), above=ladder.find(m=>m.reqDv>=c.reqDv);
    if(below&&c.payout<=below.payout*0.4) band=false; if(above&&c.payout>=above.payout) band=false; }
  check('they pay more than a routine re-flight and less than a first flight of comparable milestones', band);
  check('they never out-earn a routine First Satellite (early texture, not a new farm)', early.every(a=>{ for(let k=0;k<100;k++) if(a.build(0).payout>=MISSIONS.find(m=>m.id==='first_sat').payout*0.4) return false; return true; }));
  const rnd=Math.random; let i=0; Math.random=()=>[0.1,0.5,0.5,0.5,0.5,0.5][i++%6];
  state.contractOffers=[]; tickContractOffers(); Math.random=rnd;
  check('the 1942 contract board can now produce an offer', (state.contractOffers||[]).length===1 && /Upper-Atmosphere|Range Test/.test(state.contractOffers[0].name));
}

// ---- advisor: never recommends a node that can't be bought ----
{
  newGame('engineer'); state.money=1e6;
  for(const id of Object.keys(state.research)) delete state.research[id];
  RESEARCH.filter(x=>(x.eraMin||0)===0).forEach(x=>{ state.research[x.id]=true; }); // exhaust everything open in Pioneer
  MISSIONS.forEach(m=>{ if(!m.reqResearch) state.completed[m.id]=true; }); state.activeResearch=null;
  const rec=recommendedAction();
  const r2=rec.researchId&&RESEARCH.find(x=>x.id===rec.researchId);
  check('advisor does not recommend era-locked research', !r2 || (researchEraMet(r2)&&sciGateMet(r2)));
}

// ---- advisor: names the tracking station when it is the blocker ----
{
  newGame('engineer'); state.money=500; state.rep=1000; state.year=1965;
  ['pioneer','vanguard','mercury','gemini'].forEach(completeProgram);
  state.research.deep_space=true; state.trackingStations=[]; state.activeResearch={id:'kerosene',monthsLeft:3};
  const m=missionById('luna_flyby');
  check('setup: the lunar flyby is blocked only by tracking', needsTrackingNetwork(m) && trackingStationCount()===0 && !missionTechMet(m));
  const rec=recommendedAction();
  check('advisor recommends building a tracking station', rec.kind==='tracking' && /buildTrackingStation\('/.test(rec.action||''));
  check('the Next step button builds it', advisorClick(rec)===rec.action);
  const obj=objectivesList()[0].items[0];
  check('objectives list says why', obj.sub==='needs a tracking station');
  eval(rec.action);
  check('after building it the advisor moves on to the launch', trackingStationCount()===1 && recommendedAction().kind!=='tracking');
}

// ---- Programs modal copy ----
newGame('engineer'); showProgramsModal();
check('Programs say which era they open', (document.getElementById('programsCard').innerHTML||'').includes('Completing it opens the <b>Early Orbital</b> era'));
hideModal();

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
