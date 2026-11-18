// Decision-loop roadmap Phase 0 (2026-11-18): finish the one-more-launch pass — multi-leg Resize, a Last
// Flight card that reads right for aborts / crew outcomes / in-flight anomaly calls, and ops remedies for
// anomalies. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const benchHTML=()=>{ renderBenchLaunch(); return document.getElementById('benchLaunch').innerHTML||''; };
function lateGame(){ newGame('engineer'); state.money=5000; state.year=1968; state.rep=2000;
  RESEARCH.forEach(r=>state.research[r.id]=true); Object.keys(ENGINES).forEach(k=>state.unlocked[k]=true); }
const legsClose=m=>{ const sim=simulateMission(m); return sim.ok; };

// ---------- multi-leg Resize ----------
{
  lateGame(); state.activeMission='luna_flyby'; const m=curMission();
  state.stages=[{eng:'f1_class',count:5,prop:500},{eng:'hydrolox_up',count:2,prop:80}]; state.transfer={eng:'hydrolox_up',prop:2};
  check('precondition: Trans-Lunar Injection is short, the ascent is fine', !legsClose(m) && simulateMission(m).legs[0].pass && !simulateMission(m).legs[1].pass);
  check('canLaunch names a short leg', /leg falls short/.test(canLaunch(computeVehicle(),m,simulateMission(m)).why||''));
  const before=JSON.stringify([state.stages,state.transfer]);
  const p=autoSizePlan(m);
  check('a multi-leg plan sizes the transfer stage alone when that is enough', p.ok && p.multi && p.changes.length===1 && p.changes[0].module==='transfer' && p.changes[0].to>p.changes[0].from);
  check('…and leaves the rocket untouched until applied', JSON.stringify([state.stages,state.transfer])===before);
  const html=benchHTML();
  check('the bench offers it under the blocked commit', /id="benchResize"/.test(html) && /transfer stage propellant/.test(html) && /legs close/.test(html) && !/all 2 legs/.test(html));
  check('the success line names the one-click fix for a multi-leg mission too', /resize it in one click/.test(nextBenchLineHTML()));
  applyAutoSize();
  check('applying it closes every leg', legsClose(m) && canLaunch(computeVehicle(),m,simulateMission(m)).ok);
  check('…with the smallest 0.1 t that works', (()=>{ const t=state.transfer.prop; state.transfer.prop=Math.round((t-0.1)*10)/10; const ok=simulateMission(m).legs.every(l=>l.cap>=l.dv*AUTOSIZE_MARGIN); state.transfer.prop=t; return !ok; })());
  check('a closed mission needs no resize', autoSizePlan(m).fits===true);
}
{
  lateGame(); state.activeMission='luna_flyby'; const m=curMission();
  state.stages=[{eng:'kerolox_mk3',count:4,prop:120},{eng:'hydrolox_up',count:1,prop:20}]; state.transfer={eng:'hydrolox_up',prop:2};
  check('precondition: both the ascent and the injection are short', !simulateMission(m).legs[0].pass && !simulateMission(m).legs[1].pass);
  const p=autoSizePlan(m);
  check('two short legs: size the transfer stage for its burn, then the launch vehicle that lifts it', p.ok && p.changes.length===2 && p.changes[0].module==='transfer' && p.changes[1].stage!=null);
  check('the button text lists both changes', /transfer stage propellant .* \+ stage \d propellant/.test(autoSizeChangeText(p)));
  applyAutoSize();
  check('…and applying both closes the mission', canLaunch(computeVehicle(),m,simulateMission(m)).ok);
}
{
  lateGame(); state.activeMission='luna_flyby'; const m=curMission();
  state.stages=[{eng:'a4',count:1,prop:5}]; state.transfer={eng:'hyper_storable',prop:1};
  const before=JSON.stringify([state.stages,state.transfer]);
  const p=autoSizePlan(m);
  check('impossible on propellant: says which leg and by how much', !p.ok && p.leg && /Ascent to LEO (is )?[\d,]+ m\/s short/.test(p.why) && /engine or another stage/.test(p.why));
  check('…and restores every tank', JSON.stringify([state.stages,state.transfer])===before);
  const html=benchHTML();
  check('the bench says why instead of silently dropping the button', !/id="benchResize"/.test(html) && /id="benchResizeNo"/.test(html) && /Ascent to LEO/.test(strip(html)));
}

// ---------- the card reads right for every kind of result ----------
newGame('engineer'); state.money=50; state.activeMission='first_flight';
const deb=o=>Object.assign({v:1, abs:absDay(), missionId:'first_flight', name:'First Flight', kind:'loss', success:false, subsystem:'propulsion', phase:'ascent',
  rel:0.7, story:'an engine failed.', nearMiss:null, first:false, crewed:false, testLevel:0, revenue:0, rep:-3, sci:0, opened:[], dismissed:false, anomaly:null}, o);
const card=o=>{ state.lastDebrief=deb(o); return strip(lastFlightCardHTML()); };
check('uncrewed loss', /propulsion failure · ascent/.test(card({})) && !/crew/.test(card({})));
check('crewed loss says the crew was lost', /crew lost/.test(card({crewed:true})));
check('escape-tower abort says the crew escaped', /crew escaped/.test(card({kind:'abort', crewed:true, story:'The escape system pulled the crew clear.'})));
check('strand says the crew is stranded', /crew stranded/.test(card({kind:'strand', subsystem:'life_support', phase:'deep', crewed:true})));
check('a partial names what came up short', /partial — guidance came up short/.test(card({kind:'partial', subsystem:'avionics', phase:null})));
{ const t=card({kind:'scrub', subsystem:'avionics', story:'a precautionary abort on ascent after the avionics flagged marginal.'});
  check('an in-flight abort says why, with its story', /aborted in flight — guidance flagged marginal/.test(t) && /precautionary abort/.test(t));
  const mv=debriefNextMoves(state.lastDebrief);
  check('…and offers remedies for the flagged subsystem, not "Now open"', mv.length>0 && !mv.some(x=>/Now open/.test(x.label)) && mv.some(x=>/setTestLevel|Research|Plan|hirePersonnel/.test(x.action+x.label))); }

// a test campaign is never offered when reliability is already at the cap (found in the browser: "95% → 95%")
{ newGame('engineer'); state.money=50; state.activeMission='first_flight';
  const real=computeVehicle; computeVehicle=function(){ const v=real.apply(this,arguments); return Object.assign({},v,{reliability:diff().relCap}); };
  try{ state.lastDebrief=deb({}); check('at the reliability cap, no test campaign is suggested', !debriefNextMoves(state.lastDebrief).some(x=>/setTestLevel/.test(x.action))); }
  finally{ computeVehicle=real; }
  state.lastDebrief=deb({}); check('…but below it, one is', debriefNextMoves(state.lastDebrief).some(x=>/setTestLevel/.test(x.action))); }

// ---------- in-flight anomaly calls get operations remedies ----------
{
  lateGame(); state.money=200; state.activeMission='first_sat';
  const ctx={m:curMission(), crewed:false, routine:false, rehearsed:false, ev:{id:'solar_array', title:'Solar array failed to deploy'}};
  const d=recordFlightDebrief(ctx, {kind:'partial', rel:0.9, story:'the motor wouldn’t cycle; the array stays half-deployed.'}, debriefSnapshot(), 1, 0, {outcomeOverride:'partial', payoutMult:0.8});
  check('the debrief records the anomaly call', d.anomaly && d.anomaly.id==='solar_array' && d.anomaly.decided===true && !d.subsystem);
  const t=strip(lastFlightCardHTML());
  check('the card names the anomaly, not a phantom "vehicle failure"', /in-flight anomaly: solar array failed to deploy/.test(t) && !/vehicle failure/.test(t));
  const mv=debriefNextMoves(d);
  check('remedy: rehearse the next flight, with the real odds', mv.some(x=>x.action==='toggleRehearsal()' && /anomaly odds \d+% → \d+%/.test(x.detail)));
  check('remedy: a flight director when Mission Control is empty', mv.some(x=>/hirePersonnel/.test(x.action) && /flight director/.test(x.detail)));
  check('no hardware test campaign for an operations problem', !mv.some(x=>/setTestLevel/.test(x.action)));
  eval(mv.find(x=>x.action==='toggleRehearsal()').action);
  check('taking it sets the rehearsal on the bench', state.rehearsal===true);
  check('…and the card stops offering it', !debriefNextMoves(d).some(x=>x.action==='toggleRehearsal()'));
  const ctx2=Object.assign({},ctx); const d2=recordFlightDebrief(ctx2, {kind:'success', rel:0.9}, debriefSnapshot(), 1, 0, {log:'the reboot cycled the motor'});
  check('an anomaly that was saved is recorded but not treated as a failure', d2.success && d2.anomaly && d2.anomaly.decided===false && !/anomaly/.test(strip(lastFlightCardHTML())));
}

// ---------- a real crewed flight through the player path ----------
{
  lateGame(); state.year=1962; state.money=500; state.activeMission='first_astro';
  const a=ASTRONAUTS.slice().sort((x,y)=>(x.era||0)-(y.era||0))[0]; hirePersonnel(a.id);
  const sr=staffRecord(a.id); sr.trainedAbs=absDay();
  state.stages=[{eng:'kerolox_mk2',count:2,prop:30},{eng:'kerolox_mk1',count:1,prop:6}];
  const m=curMission(); let p=autoSizePlan(m); if(p.ok) applyAutoSize();
  const ok=canLaunch(computeVehicle(),m,null).ok;
  check('precondition: a crewed rocket the bench will commit', ok);
  queueBuild(true,'cr1'); { let g=0; while(!hangarList().length&&g++<900) advanceDays(1); }
  const h=hangarList()[0];
  _devForceOutcome='loss'; if(h) launchFromHangar(h.id,h.hullId,'cr-fly'); if(_pendingInquiry) resolveInquiry('decline');
  const d=state.lastDebrief;
  check('a crewed loss records crewed', d && d.missionId==='first_astro' && d.crewed===true && !d.success);
  check('…and the card says so', /crew lost/.test(strip(lastFlightCardHTML())));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
