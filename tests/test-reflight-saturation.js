// Spine step 2 (2026-11-16): re-flights of a completed milestone saturate. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const near=(a,b)=>Math.abs(a-b)<1e-9;

newGame('engineer');
const m=MISSIONS.find(x=>x.id==='first_sat');
check('a fresh campaign has no re-flight history', state.reflights && Object.keys(state.reflights).length===0);
check('the first re-flight pays the old 40%', near(reflightPayoutFrac(m),0.4));
state.completed[m.id]=true;
const base=estMissionPayout(m);
recordReflight(m);
check('each recent re-flight takes 10 points off: 30%', near(reflightPayoutFrac(m),0.3));
check('the estimate follows the rate', near(estMissionPayout(m), Math.round(base*0.3/0.4*100)/100) || Math.abs(estMissionPayout(m)-base*0.75)<0.011);
recordReflight(m); recordReflight(m);
check('…20%, then the 10% floor', near(reflightPayoutFrac(m),0.1));
recordReflight(m); recordReflight(m);
check('the floor holds however often you fly it', near(reflightPayoutFrac(m),0.1) && recentReflights(m.id).length===5);
check('other missions are untouched', near(reflightPayoutFrac(MISSIONS.find(x=>x.id==='sounding')),0.4));

// recovery: flights age out after REFLIGHT_MEMORY_MONTHS
const first=Math.min(...state.reflights[m.id]);
check('recovery date is when the oldest flight ages out', reflightRecoveryAbs(m)===first+REFLIGHT_MEMORY_MONTHS);
state.year+=Math.ceil(REFLIGHT_MEMORY_MONTHS/12)+1;
check('after the memory window the rate is back to 40%', near(reflightPayoutFrac(m),0.4) && reflightRecoveryAbs(m)===null);
recordReflight(m);
check('recording prunes aged-out flights', state.reflights[m.id].length===1);

// procedural contracts are new work: never reduced
newGame('engineer'); state.flights=1;
const offer=CONTRACT_ARCHETYPES.find(a=>a.kind==='upper_air').build(0); offer.id='pc_test'; offer.proc=true;
state.contractOffers=[offer];
check('a procedural contract pays in full', estMissionPayout(offer)===round2(offer.payout*diff().payoutMult*econPayoutMult()*doctrineMult('payout')));

// no 40% constant left in the payout paths
{
  const all=(typeof finalizeLaunch==='function'?finalizeLaunch.toString():'');
  check('payday paths use the saturating rate', all.includes('reflightPayoutFrac(m)') && !/m\.payout\*0\.4/.test(all) && all.split('recordReflight(m)').length===3);
  check('the estimate uses it too', estMissionPayout.toString().includes('reflightPayoutFrac(m)'));
}

// end to end: fly a re-flight and watch the rate drop
{
  newGame('engineer'); state.money=500; animEnabled=false;
  const ff=MISSIONS.find(x=>x.id==='first_flight'); state.completed[ff.id]=true; state.activeMission=ff.id;
  const before=reflightPayoutFrac(ff);
  devForceOutcome('success');
  queueBuild(true,'rf1'); let g=0; while(!hangarList().length&&g++<400) advanceDays(1);
  const h=hangarList()[0]; launchFromHangar(h.id,h.hullId,'rf-fly');
  for(let k=0;k<4&&state.launchTxn;k++){ const tx=state.launchTxn, d=tx.decision; if(d&&d.selected==null){ if(d.kind==='weather') launchAnyway(tx.id,d.revision); else if(d.kind==='live') resolveLiveCall(true,tx.id,d.revision); else if(d.kind==='reserve') resolveReserveCall(true,tx.id,d.revision); else if(d.kind==='anomaly') resolveAnomaly(d.options[0],tx.id,d.revision); else if(d.kind==='orbit') resolveOrbitalManeuver(d.options[0],tx.id,d.revision); } else break; }
  check('a successful re-flight is recorded', recentReflights(ff.id).length===1);
  check('…and the next one pays less', near(before,0.4) && near(reflightPayoutFrac(ff),0.3));
  const msg=(state.log||[]).map(e=>e.msg||'').find(s=>/First Flight: SUCCESS/.test(s))||'';
  check('the success log reports a payout', /\+\$[0-9.]+M/.test(msg));
}

// the bench says why
{
  newGame('engineer'); state.completed.first_flight=true; state.activeMission='first_flight';
  recordReflight(missionById('first_flight'));
  const html=missionNetHTML(missionById('first_flight'));
  check('the bench labels the re-flight rate', html.includes('re-flight ×0.30'));
  check('…and the tooltip explains the recovery', /saturating/.test(html) && /improves from/.test(html));
}

check('both mission readouts badge the live re-flight rate', [renderReadout,renderProfileReadout].every(f=>f.toString().includes('reflightPayoutFrac(m)*100')));
check('SAVE_VERSION bumped for state.reflights', SAVE_VERSION>=69);
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
