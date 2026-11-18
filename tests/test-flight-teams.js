// Decision-loop roadmap Phase 5 (2026-11-18): flight teams. Owner choices: a director + console team per flight,
// picked by hand on major flights only, familiarity and fatigue, traits that add crisis options.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const ctrlWith=key=>CONTROLLERS.find(c=>traitKeyOf(c.id)===key);
const engWith=spec=>ENGINEERS.find(e=>e.specialty===spec);
function staffed(){
  newGame('engineer'); state.money=500; state.year=1962; state.rep=500; state.activeMission='first_flight';
  const d1=ctrlWith('coolhead'), d2=ctrlWith('bythebook'), ep=engWith('propulsion'), eg=engWith('avionics'), es=engWith('structures');
  [d1,d2,ep,eg,es].forEach(p=>p&&hirePersonnel(p.id));
  return {d1,d2,ep,eg,es};
}
let rq=0;
function fly(kind){ queueBuild(true,'t'+(++rq)); let g=0; while(!hangarList().length&&g++<600) advanceDays(1);
  const h=hangarList()[0]; const n0=state.flights||0; let k=0; while(k++<60){ _devForceOutcome=kind; launchFromHangar(h.id,h.hullId,'f'+(++rq)); if((state.flights||0)>n0) break; advanceDays(5); } }

// ---------- the auto-pick ----------
{
  const P=staffed(); const m=curMission(), t=autoPickTeam(m);
  check('the auto-pick seats a director and one engineer per console by specialty', t.director && t.console.propulsion===P.ep.id && t.console.guidance===P.eg.id && t.console.structures===P.es.id);
  check('…the most ready director', staffReadiness(t.director,missionFamClass(m))>=Math.max(...teamCandidates('controller').map(id=>staffReadiness(id,missionFamClass(m))))-1e-12);
  const ids=[t.director,...Object.values(t.console)].filter(Boolean);
  check('…and nobody in two seats', new Set(ids).size===ids.length);
  check('no staff: an empty team, odds unchanged from before Phase 5', (()=>{ newGame('engineer'); state.activeMission='first_flight'; const tm=autoPickTeam(curMission()); return !tm.director && Object.values(tm.console).every(x=>!x) && !teamConsoleActive(); })());
}

// ---------- a manual pick, one seat per person, falls back when invalid ----------
{
  const P=staffed(); const m=curMission();
  setTeamSeat(m.id,'director',P.d2.id);
  check('a manual director pick sticks for that mission', plannedTeam(m).director===P.d2.id && plannedTeam(m).auto===false);
  setTeamSeat(m.id,'propulsion',P.d2.id);
  check('seating someone elsewhere frees their old seat', plannedTeam(m).console.propulsion===P.d2.id && plannedTeam(m).director===null);
  state.staff=state.staff.filter(s=>s.id!==P.d2.id);
  check('a pick that is no longer valid falls back to the auto-pick', plannedTeam(m).auto===true && plannedTeam(m).director!==P.d2.id);
}

// ---------- the director replaces the pool; console engineers cut their subsystems' hazard ----------
{
  const P=staffed(); const m=curMission();
  setTeamSeat(m.id,'director',P.d1.id);
  const solo=roleTeamScore('controller','call');
  check('Mission Control on this flight is the director, not the pooled average', Math.abs(solo-Math.min(1,staffReadiness(P.d1.id,missionFamClass(m))*(traitOf(P.d1.id).call||1)))<1e-9);
  const v=computeVehicle(), withEng=effectiveReliability(m,v,null,false);
  setTeamSeat(m.id,'propulsion',null); setTeamSeat(m.id,'guidance',null); setTeamSeat(m.id,'structures',null);
  const without=effectiveReliability(m,computeVehicle(),null,false);
  check('console engineers raise the odds on this flight', withEng>without);
  setTeamSeat(m.id,'propulsion',P.ep.id);
  check('…through their own subsystems only (propulsion weight falls with the propulsion seat filled)', consoleHazardMult('propulsion')<1 && consoleHazardMult('life_support')===1);
}

// ---------- history: fatigue and familiarity ----------
{
  const P=staffed(); const m=curMission(), cls=missionFamClass(m);
  const t0=JSON.parse(JSON.stringify(plannedTeam(m))); const r0=staffReadiness(P.ep.id,cls);
  fly('success');
  const members=[t0.director,...Object.values(t0.console)].filter(Boolean);
  check('everyone who worked the flight is tired and more familiar', members.every(id=>staffFatigue(id)===FATIGUE_PER_FLIGHT && staffRecord(id).fam[cls]===1));
  check('the manual pick is spent once flown', state.flightTeam===null);
  check('fatigue costs readiness more than one flight of familiarity gives back', staffReadiness(P.ep.id,cls)<r0);
  const f0=staffFatigue(P.ep.id); for(let d=0;d<30;d++) advanceDays(1);
  check('a month of rest recovers about 12% fatigue', Math.abs((f0-staffFatigue(P.ep.id))-FATIGUE_REST_PER_MONTH)<0.6);
  const sr=staffRecord(P.ep.id); sr.fatigue=0; sr.fam[cls]=3;
  check('familiarity raises readiness once rested', staffReadiness(P.ep.id,cls)>r0);
}

// ---------- major vs routine, and the go/no-go row ----------
{
  const P=staffed(); const m=curMission();
  check('a first flight is major', isMajorFlight(m) && launchGoNoGo().team.major);
  check('the go/no-go block asks to review the auto-picked team', /review team/.test(goTeamRowHTML(launchGoNoGo())));
  state.completed[m.id]=true;
  check('a routine uncrewed repeat is not major, and the row just offers "change"', !isMajorFlight(m) && /change/.test(goTeamRowHTML(launchGoNoGo())) && !/review team/.test(goTeamRowHTML(launchGoNoGo())));
  check('crewed and deep flights stay major', isMajorFlight(MISSIONS.find(x=>x.crew>0)) && isMajorFlight(MISSIONS.find(x=>x.profile)));
  staffRecord(P.ep.id).fatigue=80;
  check('a worn-out team member is named as a risk', launchGoNoGo().risks.some(r=>/worn out/.test(r)));
  showTeamPicker(m.id);
  const html=(document.getElementById('modalBody')||document.getElementById('modal')||{}).innerHTML||'';
  check('the picker lists every seat with readiness, fatigue and familiarity', /Flight director/.test(html) && /Propulsion console/.test(html) && /tired \d+%/.test(html) && /fam \+\d+%/.test(html));
}

// ---------- traits add crisis options ----------
{
  const P=staffed(); const m=curMission();
  // By-the-Book: a short procedural recycle on weather
  setTeamSeat(m.id,'director',P.d2.id);
  check('a By-the-Book director is recognised', directorTraitKey(m)==='bythebook');
  let seen=null; const realProceed=proceedLaunch; proceedLaunch=function(mm,v,sim,wq,pen){ seen={pen}; };
  const d0=absDay();
  try{ _pendingLaunch={m, v:computeVehicle(), sim:null, windowQuality:1, wx:{label:'Rain',penalty:0.06,clear:1}, prebuilt:false, hullId:null}; procRecycleLaunch(null,null); } finally{ proceedLaunch=realProceed; }
  check('procedural recycle: a week, half the weather penalty', seen && Math.abs(seen.pen-0.03)<1e-9 && absDay()-d0>=WX_RECYCLE_DAYS-1 && absDay()-d0<=WX_RECYCLE_DAYS+1);
  // Cool Head: nurse a marginal subsystem
  let fin=null; const realFin=finalizeLaunch; finalizeLaunch=function(ctx,ops){ fin={kind:ctx.outcome.kind, ops}; };
  try{
    _pendingLive={m, outcome:{kind:'loss',subsystem:'propulsion'}, liveFlag:{sub:{key:'propulsion'}}}; resolveLiveCallNurse(null,null);
    check('nursing it turns a loss into a partial', fin && fin.kind==='partial');
    _pendingLive={m, outcome:{kind:'success'}, liveFlag:{sub:{key:'propulsion'}}}; resolveLiveCallNurse(null,null);
    check('…and costs a successful flight 10% of its payout', fin && fin.kind==='success' && fin.ops && fin.ops.payoutMult===0.9);
    // Improviser: a free jury-rigged return
    const real=Math.random; Math.random=()=>0;
    try{ _pendingRescue={ctx:{m, outcome:{kind:'strand'}}}; improviseRescue(null,null); } finally{ Math.random=real; }
    check('a jury-rigged return can bring the crew home, at no cost', fin && fin.ops && fin.ops.outcomeOverride==='rescued');
  } finally{ finalizeLaunch=realFin; }
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
