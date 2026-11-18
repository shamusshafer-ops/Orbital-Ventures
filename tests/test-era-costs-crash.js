// Spine step 5b (2026-11-16): costs grow with the era; crash programs pull next-era research forward.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const near=(a,b,t)=>Math.abs(a-b)<=(t||1e-6);
const toEra=i=>{ state.year=ERAS[i].from; };

newGame('engineer');
check('Pioneer costs are unchanged (x1.0)', eraCostMult()===1);
toEra(2); check('Crewed & Lunar costs x1.4', near(eraCostMult(),1.4));
toEra(7); check('Speculative costs x2.4', near(eraCostMult(),2.4));
newGame('engineer'); PROGRAMS[0].missions.forEach(m=>state.completed[m]=true);
check('the multiplier follows the frontier, not just the calendar', state.year===1942 && near(eraCostMult(),1.2));

// vehicle costs scale; the breakdown agrees with the total
{
  newGame('engineer'); state.activeMission='first_flight';
  const v0=computeVehicle(); toEra(3); const v3=computeVehicle();
  check('build cost scales with the era', near(v3.buildCost/v0.buildCost, eraCostMult(), 0.02));
  check('launch cost scales with the era', near(v3.launchCost/v0.launchCost, eraCostMult(), 0.02));
  const bd=buildCostBreakdown(missionById('first_flight'));
  check('the cost breakdown shows the era row', bd.rows.some(r=>/era costs/.test(r.label)));
  check('…and its total matches the vehicle build cost', near(bd.total, v3.buildCost, 0.02));
  newGame('engineer'); const e0=engineUnitCost('a4'); toEra(4);
  check('prebuilt engine stock is priced at the era rate', near(engineUnitCost('a4'), round2(e0*eraCostMult()), 0.011));
}
// overhead scales; research does not
{
  newGame('engineer'); const o0=liveRecurringEconomy().expenses, r0=rdCostOf(RESEARCH.find(r=>r.id==='kerosene'));
  toEra(3); const o3=liveRecurringEconomy().expenses;
  check('fixed overhead scales with the era', near(o3, round2(o0*eraCostMult()), 0.011));
  check('research prices do not (already priced by tier)', rdCostOf(RESEARCH.find(r=>r.id==='kerosene'))===r0);
}
// service allowance follows era costs
{
  newGame('engineer'); state.money=500; state.rep=500; state.completed.first_sat=true; toEra(3);
  signPassiveContract('sat_comms'); const c=state.passiveContracts[0], d=passiveDef('sat_comms');
  check('service fee = margin + allowance at era prices', serviceFee(c,d)===round2(c.income*d.service.every+d.service.allow*eraCostMult()));
}

// ---- crash programs ----
newGame('engineer'); state.money=500;
const next=RESEARCH.find(r=>(r.eraMin||0)===1&&reqsMet(r)), far=RESEARCH.find(r=>(r.eraMin||0)===2&&reqsMet(r));
check('setup: a next-era node with prerequisites met exists', !!next);
check('a next-era node is crash-eligible', crashEligible(next));
check('a node two eras ahead is not', !far || !crashEligible(far));
check('an available node is not (just research it)', !crashEligible(RESEARCH.find(r=>researchEraMet(r)&&reqsMet(r)&&!state.research[r.id])));
check('crash price and time', crashCost(next)===round2(rdCostOf(next)*CRASH_COST_MULT) && crashMonths(next)===Math.ceil(next.months*CRASH_TIME_MULT));
check('ordinary research still refuses an era-locked node', buyResearch(next.id)!==true && !state.activeResearch);
state.science=1e4; /* spine step 8: every post-Pioneer node also costs science */
const m0=state.money;
check('crashResearch starts it', crashResearch(next.id)===true && state.activeResearch && state.activeResearch.id===next.id && state.activeResearch.crash===true);
check('…charging the premium and the longer schedule', near(m0-state.money, crashCost(next), 0.011) && state.activeResearch.monthsLeft===crashMonths(next));
check('one project at a time still holds', crashResearch((far||next).id)===false);
check('it logs as a crash program', (state.log||[]).some(e=>/Crash program started/.test(e.msg||'')));
newGame('engineer'); state.money=0.5;
check('unaffordable crash programs are refused', crashResearch(next.id)===false && !state.activeResearch);
// UI
newGame('engineer'); state.money=500;
check('the inspector offers the crash program on a next-era node', /Crash program · \$[0-9.]+M · \d+ mo/.test(crashButtonHTML(next,false,'')));
check('…and nothing on an available node', crashButtonHTML(RESEARCH.find(r=>researchEraMet(r)&&reqsMet(r)&&!state.research[r.id]),false,'')==='');

check('an era-locked node gets a status badge (it read "undefined")', /era:'<span class="pill lock">not yet invented<\/span>'/.test(renderResearchDetail.toString()));
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
