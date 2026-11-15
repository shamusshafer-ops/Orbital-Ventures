// Spine step 5a (2026-11-16): service contracts. Appended after harness.js + build/game.js.
// Satellite, tourism and defense contracts pay per delivered service flight instead of monthly.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const svc=()=>(state.contractOffers||[]).filter(o=>o.service);

// ---- which contracts are services ----
{
  const S=PASSIVE_CONTRACT_DEFS.filter(isServiceContract), P=PASSIVE_CONTRACT_DEFS.filter(d=>!isServiceContract(d));
  check('satellite, tourism and defense contracts are services', S.every(d=>['sat','tour','mil'].includes(d.cat)) && ['sat','tour','mil'].every(c=>PASSIVE_CONTRACT_DEFS.filter(d=>d.cat===c).every(isServiceContract)));
  check('licensing and doctrine retainers stay passive', P.length>0 && P.every(d=>['lic','doct'].includes(d.cat)));
  check('every service spec has an interval, a label and a launch allowance', S.every(d=>d.service.every>=3&&d.service.label&&d.service.allow>0));
  check('a "like" spec points at a real mission', S.filter(d=>d.service.like).every(d=>MISSIONS.some(m=>m.id===d.service.like)));
  check('service setup is half the old fee; passive unchanged', S.every(d=>passiveSetupCost(d)===round2(d.setup*SERVICE_SETUP_MULT)) && P.every(d=>passiveSetupCost(d)===d.setup));
}

// ---- signing posts the first flight ----
newGame('engineer'); state.money=500; state.rep=500; state.completed.first_sat=true;
const d=passiveDef('sat_weather');
const m0=state.money;
check('sat_weather is signable', passiveStatus('sat_weather')==='available');
signPassiveContract('sat_weather');
const c=state.passiveContracts.find(x=>x.id==='sat_weather');
check('signing charges the reduced setup', Math.abs((m0-state.money)-passiveSetupCost(d))<0.011);
check('the contract is a service record', c && c.service && c.seq===1 && c.flown===0 && c.missed===0);
const o1=svc()[0];
check('the first service flight is on the board', svc().length===1 && o1.service.contractId==='sat_weather' && o1.proc);
check('it pays the margin plus the launch allowance (at era prices)', o1.payout===round2(c.income*d.service.every+d.service.allow*eraCostMult()));
check('it is a real flight for the job', o1.reqDv===9400 && o1.payload===d.service.payload && !o1.profile);
check('it is open until the next is due', o1.expiresAbs===absMonth()+d.service.every);
check('no monthly income from a service contract', passiveMonthlyIncome()===0);

// ---- months pass: no money, the next flight posts, the unflown one is missed ----
const before=state.money; tickPassiveContracts();
check('a month passes without a payment', state.money===before);
for(let k=0;k<d.service.every-1;k++){ state.month++; if(state.month>11){ state.month=0; state.year++; } tickPassiveContracts(); }
check('the next service flight posts on schedule', c.seq===2);
for(let k=0;k<2;k++){ state.month++; if(state.month>11){ state.month=0; state.year++; } } tickContractOffers(); // one month of grace after the next is posted
check('the unflown first flight expires as a miss', c.missed===1 && !svc().some(o=>o.service.seq===1) && (state.log||[]).some(e=>/service flight 1 was never flown/.test(e.msg||'')));

// ---- a delivered flight resets the miss count; two misses in a row cancel ----
serviceFlightDelivered(svc()[0]);
check('a delivered flight resets the misses', c.missed===0 && c.flown===1);
serviceFlightMissed(svc()[0]); serviceFlightMissed(svc()[0]);
check('two misses in a row cancel the contract and start the cooldown', !state.passiveContracts.some(x=>x.id==='sat_weather') && passiveCooldownLeft('sat_weather')>0);

// ---- board slots and rivals ----
newGame('engineer'); state.money=500; state.rep=500; state.completed.first_sat=true; state.completed.crew_orbit=true;
['sat_weather','sat_comms','mil_launch'].forEach(id=>signPassiveContract(id));
check('three service flights on the board', svc().length===3);
const rnd=Math.random; Math.random=()=>0.01; state.flights=3; state.leoFlights=5; tickContractOffers(); Math.random=rnd;
check('service flights do not use contract-board slots', (state.contractOffers||[]).filter(o=>!o.service).length===1);
check('rivals never bid on your service flights', tickRivalSnatch.toString().includes('!o.service'));

// ---- the payday path credits the contract ----
check('finalizeLaunch credits a delivered service flight', finalizeLaunch.toString().includes('serviceFlightDelivered(m)'));
check('outliner lists open service flights as deadlines', outlinerItems().some(i=>/^Service flight:/.test(i.label)));

// ---- no double builds for one contract offer; orphaned hulls don't crash ----
{
  newGame('engineer'); state.money=500; state.flights=1;
  state.contractOffers=[{id:'pc_x', proc:true, name:'Upper-Atmosphere Research', reqDv:1000, payload:0.05, crew:0, days:0, minRep:0, payout:3, rep:3, expiresAbs:absMonth()+6}];
  state.activeMission='pc_x';
  const a=queueBuild(true,'o1'), b=queueBuild(true,'o2');
  check('a second vehicle for the same contract offer is refused', !!a && !b);
  hangarList().push({id:'h_orph', hullId:'OV-X', missionId:'pc_gone', name:'Vehicle — gone', spec:(buildQueueList()[0]||{}).spec});
  check('a hull whose contract is gone has no launch view', readyHullActionView(hangarList().find(h=>h.id==='h_orph'))===null);
  let ok=true; try{ state.tab='command'; render(); }catch(e){ ok=false; }
  check('the Command Center still renders with an orphaned hull', ok);
  check('the Bench refuses an orphaned hull', hangarToBench('h_orph')===false);
}

check('SAVE_VERSION bumped for service contracts', SAVE_VERSION>=71);
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
