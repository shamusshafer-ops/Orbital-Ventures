// E4.7 polish — separation beat (flightSeparationBeat) + booster label. The puff sprites are
// Three.js (not headless-testable), but the beat label/timing is pure and IS tested here.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

newGame('engineer');
// two-stage + boosters so we get a booster event and a stage event
state.stages.push({eng:state.stages[0].eng,prop:state.stages[0].prop*0.4,count:1,dia:state.stages[0].dia});
state.boosters={eng:state.stages[0].eng,prop:state.stages[0].prop*0.3,count:2};
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:15200};
const spec={mode:'launch',isOrbital:true,crewed:false,success:true,reqDv:9400,
  stages:state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
  boosters:{count:2,prop:state.boosters.prop,dia:state.stages[0].dia},
  physics:flightPhysicsSpec(curMission(),computeVehicle())};
const plan=cape3dTrajectoryPlan(spec.physics,{isOrbital:true,reqDv:9400});
function snapAt(trajT){ const t=timing.padDur+timing.ascentDur*(trajT/plan.burnoutTime); return flight3dPresentationSnapshot(spec,timing,t); }

const boostEv=plan.stageEvents.find(e=>e.kind==='booster');
const stageEv=plan.stageEvents.find(e=>e.kind==='stage');
check('trajectory has both a booster and a stage event', !!boostEv && !!stageEv);

// ---------- beat fires around each event, with the right label ----------
{
  const b=flightSeparationBeat(snapAt(boostEv.t+0.2));
  check('a booster separation shows a BOOSTER SEP beat', b && b.label==='BOOSTER SEP');
  const s=flightSeparationBeat(snapAt(stageEv.t+0.2));
  check('a stage separation shows a 1-indexed STAGE N SEP beat', s && s.label==='STAGE '+(stageEv.index+1)+' SEP');
}

// ---------- fade ramps down across the window; null outside it ----------
{
  const near=flightSeparationBeat(snapAt(stageEv.t+0.1)), far=flightSeparationBeat(snapAt(stageEv.t+3.0));
  check('fade is near 1 right after separation', near && near.fade>0.9);
  check('fade decays toward 0 late in the window', far && far.fade<0.15);
  check('no beat before the event', flightSeparationBeat(snapAt(stageEv.t-1))===null || flightSeparationBeat(snapAt(stageEv.t-1)).label!=='STAGE '+(stageEv.index+1)+' SEP');
  check('no beat well after the window', flightSeparationBeat(snapAt(stageEv.t+5))===null);
}

// ---------- single-stage vehicle: never a beat ----------
{
  newGame('engineer');
  const spec1={mode:'launch',isOrbital:false,crewed:false,success:true,reqDv:1800,
    stages:state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
    physics:flightPhysicsSpec(curMission(),computeVehicle())};
  const plan1=cape3dTrajectoryPlan(spec1.physics,{isOrbital:false,reqDv:1800});
  const s=flight3dPresentationSnapshot(spec1,timing,timing.padDur+timing.ascentDur*0.5);
  check('single-stage vehicle produces no separation events', plan1.stageEvents.length===0);
  check('single-stage vehicle never shows a separation beat', flightSeparationBeat(s)===null);
}

// ---------- non-ascent phase: no beat ----------
{
  const s={phase:'orbit',phaseProgress:.3};
  check('no beat outside ascent/suborbital phases', flightSeparationBeat(s)===null);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
