// Comprehensive evaluation 2026-11-19 — P1 foundations + Phase 3 hardware maturity. Appended after harness.js + build/game.js.
// (1) early-program learning: a green company's failures raise the next attempt's odds;
// (2) the Cautious launch policy no longer aborts an uncrewed vehicle the abort cannot recover;
// (3) hardware maturity: engine rating + qualification multiply the capped process reliability.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-9);

// ---------- (1) early-program learning ----------
newGame('engineer'); state.activeMission='first_flight';
const r0=computeVehicle().reliability;
check('a fresh Engineer company flies First Flight at 65%', near(r0,0.65,1e-9));
noteEarlyLesson(false,'loss');
check('a failed flight teaches: +4% on the next attempt', state.earlyLessons===1 && near(computeVehicle().reliability,0.69,1e-9));
noteEarlyLesson(false,'abort'); noteEarlyLesson(false,'loss'); noteEarlyLesson(false,'loss');
check('lessons stack to three (+12%) and no further', state.earlyLessons===3 && near(earlyLessonRel(),0.12,1e-9));
noteEarlyLesson(false,'partial');
check('a partial success is not a lesson', state.earlyLessons===3);
noteEarlyLesson(true,'success');
check('the next success spends them', state.earlyLessons===0);
state.successes=EARLY_LESSON_WINDOW; noteEarlyLesson(false,'loss');
check('an established company (5+ successes) learns through investigations instead', state.earlyLessons===0);
state.successes=0; state.earlyLessons=2;
{ renderReadout(); const h=document.getElementById('readoutCard').innerHTML||'';
  check('the bench says what the lessons are worth', /Lessons from 2 failed flights: \+8% reliability/.test(h)); }

// ---------- (2) Cautious launch policy ----------
state.launchPolicy='cautious';
check('Cautious aborts a crewed flight when the abort is survivable', policyChoice('live',{survivableAbort:true,crewed:true})==='abort');
check('Cautious aborts an uncrewed flight whose vehicle the abort recovers', policyChoice('live',{survivableAbort:true,crewed:false,recoverable:true})==='abort');
check('Cautious presses on when the abort would only expend an uncrewed vehicle', policyChoice('live',{survivableAbort:true,crewed:false,recoverable:false})==='press');
check('the policy tip says so', /saves the crew or recovers the vehicle/.test(LAUNCH_POLICIES.cautious.tip));

// ---------- (3) hardware maturity ----------
newGame('engineer'); state.activeMission='sounding'; state.money=100;
state.research.kerosene=true; state.research.solid_propellant=true;
const rel1=id=>{ state.stages=[{eng:id,count:1,prop:8,dia:1}]; return computeVehicle(); };
{ const v=rel1('a4'); check('the base V-2 powerplant is qualified and is the rating norm (factor 1)', near(v.hardware.factor,1) && near(v.reliability,v.processRel)); }
{ const v=rel1('kerolox_mk1'); const r=v.hardware.rows[0];
  check('an engine type never flown carries its new-engine risk', r.qualFlights===0 && engineNewRisk('kerolox_mk1')>0 && near(r.qual,1-engineNewRisk('kerolox_mk1')) && near(v.reliability,v.processRel*(1-engineNewRisk('kerolox_mk1'))*r.rating)); }
check('the risk scales with how new the technology is to the world: 1940s kerosene 4%, era-2 hardware 8%, era-4 methalox the full 10%', near(engineNewRisk('kerolox_mk1'),0.04) && near(engineNewRisk('hydrolox_up'),0.08) && near(engineNewRisk('methalox'),NEW_ENGINE_RISK));
state.year=1975; state.month=0;
check('two eras behind the frontier an engine is off-the-shelf — no qualification risk', eraIndex(currentEra())>=2 && engineNewRisk('kerolox_mk1')===0);
state.year=1942;
state.engineHeritage={kerolox_mk1:4};
check('half qualified after four successful flights', near(rel1('kerolox_mk1').hardware.rows[0].qual,1-engineNewRisk('kerolox_mk1')/2));
state.engineHeritage={kerolox_mk1:8};
check('fully qualified after eight', near(rel1('kerolox_mk1').hardware.rows[0].qual,1));
state.engineHeritage={};
state.testLevel=1;
check('a static fire credits three qualification flights', rel1('kerolox_mk1').hardware.rows[0].qualFlights===3);
state.research.engine_test_stands=true;
check('Engine Test Stands research credits two more', rel1('kerolox_mk1').hardware.rows[0].qualFlights===5);
state.research.flight_qualification=true; state.research.autonomous_test_program=true;
check('Flight Qualification (+1) and the Autonomous Test Program (+2) credit more — the Testing track pays after the cap', rel1('kerolox_mk1').hardware.rows[0].qualFlights===8);
delete state.research.flight_qualification; delete state.research.autonomous_test_program;
state.testLevel=0; delete state.research.engine_test_stands;
check('engine rating: an F-1-class (93%) costs ~3% against the 96% norm', near(engineRatingFactor('f1_class'),0.93/0.96,1e-9));
check('engine rating: a solid motor (97.5%) earns its rating, capped at +2%', near(engineRatingFactor('solid_castor'),0.975/0.96,1e-9) && engineRatingFactor('solid_castor')<=1.02);
check('engine rating is bounded below at ×0.96 (the speculative fusion drive)', near(engineRatingFactor('fusion_torch'),0.96));
// a mixed stack: the unproven engine bites even next to a veteran one
state.engineHeritage={kerolox_mk1:20};
state.stages=[{eng:'kerolox_mk1',count:1,prop:20,dia:1},{eng:'kerolox_le',count:1,prop:5,dia:1}];
{ const v=computeVehicle(); check('every distinct engine on the stack counts — the new upper-stage engine is not covered by the veteran booster', v.hardware.rows.length===2 && near(v.hardware.factor,engineRatingFactor('kerolox_mk1')*engineRatingFactor('kerolox_le')*(1-engineNewRisk('kerolox_le')))); }
// it matters at the cap: a mature company's process number is capped, the hardware term still moves the odds
state.successes=12; RESEARCH.forEach(r=>{ if(r.effect&&r.effect.reliability) state.research[r.id]=true; });
{ state.stages=[{eng:'kerolox_mk1',count:1,prop:20,dia:1}]; const vet=computeVehicle();
  state.research.methane_propulsion=true; state.stages=[{eng:'methalox',count:1,prop:20,dia:1}]; const fresh=computeVehicle();
  check('a mature company sits at the process cap', near(vet.processRel,diff().relCap) && near(fresh.processRel,diff().relCap));
  check('…and an unflown frontier engine (methalox) still flies at lower odds than the veteran one', fresh.reliability<vet.reliability-0.03); } // all Testing research is on here, so it arrives 5/8 qualified
// transfer / lander engines count on profile missions
{ newGame('engineer'); RESEARCH.forEach(r=>state.research[r.id]=true); state.activeMission='luna_landing';
  state.stages=[{eng:'kerolox_mk3',count:3,prop:300,dia:1.3}]; state.transfer={eng:'hydrolox_up',prop:20}; state.descent={eng:'hyper_storable',prop:6}; state.ascent={eng:'hyper_storable',prop:3};
  const ids=vehicleEngineIds(missionById('luna_landing'));
  check('profile missions count transfer and lander engines too (deduplicated)', ids.includes('hydrolox_up') && ids.includes('hyper_storable') && ids.filter(x=>x==='hyper_storable').length===1); }
// the bench explains it
{ newGame('engineer'); state.research.kerosene=true; state.activeMission='sounding'; state.stages=[{eng:'kerolox_mk1',count:1,prop:8,dia:1}];
  renderReadout(); const h=document.getElementById('readoutCard').innerHTML||'';
  check('the bench flags a new engine with its qualification count and how to qualify it', /New engine — Rocketdyne S-3D: 0\/8 qualification flights, −4\.0% reliability/.test(h) && /a static fire counts 3/.test(h)); }

// ---------- (4) the advisor never points a broke company at a target it cannot afford ----------
{ newGame('engineer'); ['first_flight','sounding','reach_space','high_alt','reentry_test'].forEach(k=>state.completed[k]=true);
  state.rep=200; state.money=2.0; state.lastAttemptCost={first_sat:6.2};
  const no=nextObjective(); const rec=recommendedAction();
  check('with $2M and a $6.2M First Satellite ahead, the advisor says earn first', no&&no.mission.id==='first_sat' && rec.kind==='earn' && /Earn first: /.test(rec.title) && /First Satellite costs about \$6\.2\dM/.test(rec.detail));
  const job=missionById(rec.missionId)||(state.contractOffers||[]).find(o=>o.id===rec.missionId);
  check('…and names a job on a clearly smaller rocket', !!job && job.reqDv<=0.8*missionById('first_sat').reqDv);
  state.money=7;
  check('with the money in hand it goes back to "Launch"', recommendedAction().kind==='launch');
  state.money=2; delete state.lastAttemptCost.first_sat; state.activeMission='sounding';
  check('with no cost known for the target it does not guess', recommendedAction().kind==='launch'); }

// ---------- (5) bridge loans amortize instead of charging forever ----------
{ newGame('engineer'); state.money=-0.5; const t=bailoutTerms(); bailout();
  check('a bridge loan books 1.35× its principal as a balance to repay', state.bailouts===1 && near(state.loanBalance,t.amount*LOAN_REPAY_MULT,1e-6) && near(loanInterest(),t.interest,1e-6));
  const m0=state.money; for(let i=0;i<30;i++) tickContinuousDay();
  check('the monthly service pays the balance down', state.loanBalance<t.amount*LOAN_REPAY_MULT && state.money<m0);
  let d=0; while(state.loanBalance>0 && d++<1200) tickContinuousDay();
  check('…and stops once it is repaid (~22 months)', state.loanBalance===0 && loanInterest()===0 && d<800 && (state.log||[]).some(e=>/Bridge loans repaid/.test(e.msg||'')));
  state.loanInterest=0.2; state.loanBalance=undefined; const b0=state.loanInterest; for(let i=0;i<60;i++) tickContinuousDay();
  check('service set without a balance (an older save or a reorganization workout) stays as it was', state.loanInterest===b0); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0?1:0);
