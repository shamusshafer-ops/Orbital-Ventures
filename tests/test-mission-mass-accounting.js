let pass=0, fail=0;
function check(name, condition){ if(condition) pass++; else { fail++; console.log('FAIL:',name); } }
function near(a,b,name){ check(name,Math.abs(a-b)<1e-8); }
function profile(overrides){ return Object.assign({id:'mass_test',name:'Mass test',crew:0,days:0,modules:['lv','transfer'],profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Departure',dv:0,by:'transfer'}]},overrides||{}); }
function resetCryo(){ newGame('engineer'); state.transfer={eng:'hydrolox_up',prop:10}; state.descent={eng:'hydrolox_up',prop:10}; state.ascent={eng:'hyper_storable',prop:1}; state.depotUse=0; }

// Legacy mission duration is coast after departure, so it cannot pre-drain the pad stack or
// the first departure maneuver.  This is intentionally an approximate schedule, not ephemeris.
resetCryo();
{
  const short=profile({days:0}), long=profile({days:300});
  const a=simulateMission(short), b=simulateMission(long);
  near(a.legs[0].mass,b.legs[0].mass,'future coast does not change liftoff mass');
  near(a.legs[1].mass,b.legs[1].mass,'future coast does not pre-drain first departure burn');
  check('single-burn legacy cruise records tail boil-off',b.boiloff&&b.boiloff.lost>0);
}

resetCryo();
{
  const plain=profile(), malformed=profile({profile:[{name:'Ascent to LEO',dv:9400,by:'lv',coastDays:300},{name:'Departure',dv:0,by:'transfer'}]});
  near(simulateMission(plain).legs[0].mass,simulateMission(malformed).legs[0].mass,'invalid LV coast metadata cannot pre-drain launch mass');
}

// Explicit coast phases are applied before their own leg. Splitting a quiet coast preserves the
// same total loss and the per-stage cap is cumulative rather than renewed per segment.
resetCryo();
{
  const one=profile({days:900,profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Departure',dv:0,by:'transfer',coastDays:900}]});
  const split=profile({days:900,profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Departure',dv:0,by:'transfer',coastDays:450},{name:'Quiet coast',dv:0,by:'transfer',coastDays:450}]});
  const a=simulateMission(one), b=simulateMission(split);
  near(a.boiloff.lost,b.boiloff.lost,'split coast has the same boil-off as one coast');
  near(b.boiloff.lost,10*BOILOFF_CAP,'cumulative cap limits split coast loss');
}

// A burn leaves less inventory exposed to a later coast; loss remains a fraction of that remainder.
resetCryo();
{
  const m=profile({days:300,profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Partial burn',dv:1000,by:'transfer'},{name:'Later burn',dv:0,by:'transfer',coastDays:300}]});
  const sim=simulateMission(m), before=sim.legs[1].mass;
  const burned=before-before/Math.exp(1000/(ENGINES.hydrolox_up.ispVac*G0));
  const expectedLoss=(state.transfer.prop-burned)*BOILOFF_RATE_BASE*10;
  check('post-burn coast loses less than a full-tank coast',sim.boiloff.lost<10*BOILOFF_RATE_BASE*10);
  near(sim.boiloff.lost,Math.round(expectedLoss*100)/100,'post-burn coast applies fractional loss to remaining propellant');
}

resetCryo();
{
  const m=profile({days:300,profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Later burn',dv:0,by:'transfer',coastDays:300}]});
  const base=simulateMission(m).boiloff.lost;
  state.research.cryo_boiloff_control=true; const controlled=simulateMission(m).boiloff.lost;
  check('cryo control reduces phase-applied boil-off',controlled<base);
  state.transfer.eng='hyper_storable';
  check('storable propellant has no cryogenic boil-off',simulateMission(m).boiloff===null);
}

// Power hardware is launched once and remains part of every later in-space burn.
resetCryo();
{
  const m=profile({crew:2,days:0});
  state.powerSource='solar'; const solar=simulateMission(m).legs[1].mass, solarPower=powerSystemMass(m);
  state.powerSource='rtg'; const rtg=simulateMission(m).legs[1].mass, rtgPower=powerSystemMass(m);
  near(rtg-solar,rtgPower-solarPower,'power-system mass remains on later burns');
}

// A dropped cryogenic descent stage cannot keep boiling off during a later cruise.
resetCryo();
{
  const m=profile({days:300,modules:['lv','transfer','lander'],profile:[
    {name:'Ascent to LEO',dv:9400,by:'lv'},
    {name:'Powered Descent',dv:0,by:'descent',dropAfter:['descent']},
    {name:'Later transfer',dv:0,by:'transfer',coastDays:300}]});
  const sim=simulateMission(m);
  near(sim.boiloff.lost,10*BOILOFF_RATE_BASE*10,'dropped hardware is absent from later boil-off');
  check('later transfer leg has no descent-stage dry mass',sim.legs[2].mass<sim.legs[1].mass);
}

// Depot propellant arrives only after ascent: it changes the next leg, never the LV payload.
resetCryo();
{
  const m=profile(); const base=simulateMission(m);
  state.depotUse=5; const topped=simulateMission(m);
  near(topped.legs[0].mass,lvPayload(m),'LV mass shares the authoritative manifest');
  near(topped.legs[0].mass,base.legs[0].mass,'depot top-off is not lifted from the pad');
  near(topped.legs[1].mass-base.legs[1].mass,5,'depot top-off joins the following burn');
}

// Orbital assembly uses the exact same launch-manifest convention in the quote and simulator.
resetCryo();
{
  const m=profile(); const normal=simulateMission(m).legs[0].mass;
  state.research.orbital_assembly=true; state.assembleOrbit=true;
  const assembled=simulateMission(m).legs[0].mass;
  near(assembled,lvPayload(m),'assembly launch quote and simulated LV mass agree');
  check('assembly removes pre-positioned transfer stage from main launch',assembled<normal);
}

// Every authored profile keeps the launch quote and the simulated ascent on the same manifest,
// across the route choices that used to have independent accounting paths.
newGame('engineer');
{
  const profiles=MISSIONS.filter(m=>m.profile);
  let mismatches=0;
  for(const assemble of [false,true]) for(const depotUse of [0,5]) for(const source of ['solar','rtg']){
    state.research.orbital_assembly=assemble; state.assembleOrbit=assemble; state.depotUse=depotUse; state.powerSource=source;
    for(const m of profiles){
      const leg=simulateMission(m).legs.find(l=>l.by==='lv');
      if(!leg||Math.abs(lvPayload(m)-leg.mass)>1e-8) mismatches++;
    }
  }
  check('catalog-wide launch manifest parity survives assembly, depot, and power choices',mismatches===0);
}

// Planning is read-only: neither mission/profile data nor the selected vehicle state is consumed.
resetCryo();
{
  const m=profile({days:300,profile:[{name:'Ascent to LEO',dv:9400,by:'lv'},{name:'Departure',dv:0,by:'transfer'},{name:'Arrival',dv:0,by:'transfer',coastDays:300}]});
  const beforeMission=JSON.stringify(m), beforeState=JSON.stringify({transfer:state.transfer,descent:state.descent,parts:state.parts,depotUse:state.depotUse});
  simulateMission(m); simulateMission(m);
  check('simulation does not mutate mission profile',JSON.stringify(m)===beforeMission);
  check('simulation does not mutate vehicle configuration',JSON.stringify({transfer:state.transfer,descent:state.descent,parts:state.parts,depotUse:state.depotUse})===beforeState);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
