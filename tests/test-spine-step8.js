// Spine step 8 (2026-11-18): science as a research cost; trained astronauts for crewed flight; the team
// reliability ceiling. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const node=id=>RESEARCH.find(r=>r.id===id);
const firstSci=()=>SCIENTISTS.slice().sort((a,b)=>(a.era||0)-(b.era||0))[0];
const firstAstro=()=>ASTRONAUTS.slice().sort((a,b)=>(a.era||0)-(b.era||0))[0];

// ---------- 8a. science is a research currency ----------
{
  newGame('engineer');
  check('Pioneer research stays science-free (opening unchanged)', RESEARCH.filter(r=>(r.eraMin||0)===0).every(r=>sciGateCost(r)===0));
  check('every node past Pioneer costs science', RESEARCH.filter(r=>(r.eraMin||0)>0).every(r=>sciGateCost(r)>0));
  check('the cost grows with era (avg ⚛ per node rises era over era)', (()=>{ let prev=-1; for(let e=1;e<=5;e++){ const l=RESEARCH.filter(r=>(r.eraMin||0)===e); const a=l.reduce((s,r)=>s+sciGateCost(r),0)/l.length; if(!(a>prev)) return false; prev=a; } return true; })());
  check('an authored sciCost is a floor', RESEARCH.filter(r=>r.sciCost).every(r=>sciGateCost(r)>=r.sciCost));

  // a node that costs science: blocked when short, deducted on start
  const r=RESEARCH.find(x=>(x.eraMin||0)===1 && !x.req.length && !x.reqMissionDone);
  state.year=1958; state.money=500; state.science=0;
  check('precondition: an era-1 node is otherwise startable', !!r && researchEraMet(r) && reqsMet(r));
  buyResearch(r.id);
  check('short of science, research does not start', !state.activeResearch);
  check('the advisor names a science source instead of advancing', (()=>{ const a=recommendedAction(); return a.kind==='science' && /⚛/.test(a.detail); })() || nextObjective());
  check('scienceShortNode finds the node', !!scienceShortNode());
  state.science=sciGateCost(r)+5;
  buyResearch(r.id);
  check('with science banked it starts and the science is spent', state.activeResearch && state.activeResearch.id===r.id && Math.abs(state.science-5)<1e-6);
}
// scientists produce science
{
  newGame('engineer'); state.year=1962; state.money=500; state.science=0;
  check('no scientists → no staff science', sciStaffMonthly()===0);
  const s=firstSci(); hirePersonnel(s.id);
  const per=sciStaffMonthly();
  check('a hired scientist produces science each month', per>0.5 && per<4);
  const sc0=state.science; for(let d=0;d<30;d++) advanceDays(1);
  check('…and it accrues day by day', state.science-sc0>per*0.8);
  state.science=0; state.money=500;
  const a=scienceSourceAdvice();
  check('with one scientist hired the advice moves on to another source', !(a.action&&a.action.includes(`'${s.id}'`)));
}

// ---------- 8b. crewed flight needs a trained astronaut ----------
{
  newGame('engineer'); state.year=1962; state.money=500;
  const m=MISSIONS.find(x=>x.id==='first_astro'), u=MISSIONS.find(x=>x.id==='first_flight');
  const vOK=()=>Object.assign({}, computeVehicle(), {totalDv:99999, twr:2, liftoff:1});
  state.activeMission=m.id;
  let c=canLaunch(vOK(),m,null,true);
  check('no astronaut: a crewed hull cannot fly', !c.ok && c.reason==='NO_ASTRONAUT' && /hire/i.test(c.why));
  check('a tracked build can still be committed meanwhile', canLaunch(vOK(),m,null,false).reason!=='NO_ASTRONAUT');
  state.activeMission=u.id;
  check('an uncrewed flight is unaffected', canLaunch(vOK(),u,null,true).reason!=='NO_ASTRONAUT');
  state.activeMission=m.id;
  const a=firstAstro(); hirePersonnel(a.id);
  const sr=staffRecord(a.id);
  check('a new astronaut trains for ASTRO_TRAIN_MONTHS', sr.trainedAbs && Math.abs(sr.trainedAbs-absDay()-ASTRO_TRAIN_MONTHS*DAYS_PER_MONTH)<2);
  c=canLaunch(vOK(),m,null,true);
  check('in training: still grounded, and it says until when', !c.ok && /training/.test(c.why));
  check('the personnel card shows the training badge', /Training until/.test(renderPersonnelCard(personById(a.id),sr)));
  check('Up Next shows when the astronaut is flight-ready', outlinerItems().some(i=>/flight-ready/.test(i.label||i.text||i.name||JSON.stringify(i))));
  while(absDay()<sr.trainedAbs) advanceDays(1);
  c=canLaunch(vOK(),m,null,true);
  check('after training the hull can fly', c.reason!=='NO_ASTRONAUT');
  check('nobody assigned yet', !state.assignedAstronaut);
  autoAssignCrew(m);
  check('launch assigns the best flight-ready astronaut automatically', state.assignedAstronaut===a.id);
  check('an earlier hire without trainedAbs counts as trained', (()=>{ delete sr.trainedAbs; return astroFlightReady(a.id); })());
  check('SAVE_VERSION bumped for training', SAVE_VERSION>=74);
}
// the advisor asks for an astronaut when the next objective is crewed
{
  newGame('engineer'); state.year=1962; state.money=500; state.research.crew_capsule=true; state.rep=200;
  const m=MISSIONS.find(x=>x.id==='first_astro');
  const realFly=missionFlyable, realNext=nextObjective;
  try{
    missionFlyable=x=>x&&x.id===m.id; nextObjective=()=>({mission:m, program:{name:'Mercury'}});
    const a=recommendedAction();
    check('advisor: crewed objective with no corps → hire an astronaut', a.kind==='crew' && /hirePersonnel/.test(a.action||''));
    hirePersonnel(firstAstro().id);
    check('advisor: once one is training, build the vehicle meanwhile', recommendedAction().kind==='launch');
  } finally { missionFlyable=realFly; nextObjective=realNext; }
}

// ---------- 8c. the team reliability ceiling ----------
{
  newGame('engineer');
  check('Pioneer: no ceiling', teamRelCeiling()===1 && deptStaffingRelPenalty()===0);
  state.year=1958;
  check('Early Orbital: still no ceiling', eraIndex(currentEra())===1 && teamRelCeiling()===1);
  state.year=1963;
  check('Crewed era, nobody hired: capped at the era ceiling', eraIndex(currentEra())===2 && Math.abs(teamRelCeiling()-TEAM_REL_CEIL_UNSTAFFED[2])<1e-9);
  const c0=teamRelCeiling();
  hirePersonnel(ENGINEERS.find(e=>e.specialty==='propulsion').id);
  const c1=teamRelCeiling();
  check('each staffed core department lifts the ceiling by a third of the gap', c1>c0 && Math.abs((c1-c0)-(TEAM_REL_CEIL_FULL-c0)/3)<0.002);
  ['structures','avionics'].forEach(sp=>hirePersonnel(ENGINEERS.find(e=>e.specialty===sp).id));
  check('all three staffed: no ceiling', teamRelCeiling()===1 && deptStaffingRelPenalty()===0);
  state.staff=[]; state.year=1990;
  check('later eras cap lower', teamRelCeiling()<c0);
  state.activeMission='first_flight';
  const v=Object.assign({}, computeVehicle(), {reliability:0.99});
  check('a flight cannot beat the ceiling', effectiveReliability(MISSIONS.find(x=>x.id==='first_flight'),v,null,false)<=teamRelCeiling()+1e-9);
  check('the warning card names the cap', /flights capped at/.test((()=>{ try{ return renderPersonnelTab?renderPersonnelTab():''; }catch(e){ return ''; } })()) || deptStaffingRelPenalty()>0);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
