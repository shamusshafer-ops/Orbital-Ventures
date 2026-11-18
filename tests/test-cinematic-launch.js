// Cinematic launch layer (2026-11-17): presentation-only pacing, atmosphere, exhaust and camera
// helpers. They READ the authoritative trajectory (cape3dTrajectoryPlan) and must never change it.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
function near(a,b,tol,n){ check(n+` (${(+a).toFixed(4)} vs ${(+b).toFixed(4)})`,Math.abs(a-b)<=tol); }

newGame('engineer');
state.stages.push({eng:state.stages[0].eng,prop:state.stages[0].prop*0.4,count:1,dia:state.stages[0].dia});
state.boosters={eng:state.stages[0].eng,prop:state.stages[0].prop*0.3,count:2};
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:0,totalDur:15200};
const spec={mode:'launch',isOrbital:true,crewed:false,success:true,reqDv:9400,
  stages:state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
  boosters:{count:2,prop:state.boosters.prop,dia:state.stages[0].dia},
  physics:flightPhysicsSpec(curMission(),computeVehicle())};
const plan=cape3dTrajectoryPlan(spec.physics,{isOrbital:true,reqDv:9400});
const B=plan.burnoutTime, stageEv=plan.stageEvents.find(e=>e.kind==='stage'), boostEv=plan.stageEvents.find(e=>e.kind==='booster');
const prof=u=>cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,timing.padDur+timing.ascentDur*Math.min(.9995,u)));
check('fixture has a booster and a core-stage event',!!stageEv&&!!boostEv);

// ---------- 1. event-aware time warp ----------
{
  const pointsBefore=plan.points.length, lastBefore=JSON.stringify(plan.points[plan.points.length-1]);
  near(cape3dWarpAscentTime(plan,0),0,1e-9,'warp keeps liftoff at T=0');
  near(cape3dWarpAscentTime(plan,1),B,1e-6,'warp ends exactly at the real burnout');
  let mono=true, prev=-1; for(let u=0;u<=1.00001;u+=.005){ const T=cape3dWarpAscentTime(plan,u); if(T<prev-1e-9) mono=false; prev=T; }
  check('warp is monotone (time never runs backwards)',mono);
  // Heavy-lift pacing on a synthetic 500 s burn (the warp reads only burnoutTime + stageEvents).
  const heavy={burnoutTime:500,stageEvents:[{t:140,kind:'booster',index:-1},{t:310,kind:'stage',index:0}]}, Tl=30;
  check('liftoff gets far more screen time than linear playback would give it',cape3dUnwarpAscentTime(heavy,Tl)>=CINE_LIFTOFF_SHARE-1e-6&&cape3dUnwarpAscentTime(heavy,Tl)>3*(Tl/500));
  const w=cape3dUnwarpAscentTime(heavy,310+CINE_EVENT_POST)-cape3dUnwarpAscentTime(heavy,310-CINE_EVENT_PRE);
  check('a staging window is slowed for the camera',w>=CINE_EVENT_SHARE-1e-6&&w>5*((CINE_EVENT_PRE+CINE_EVENT_POST)/500));
  check('a short burn is never sped up anywhere (no window loses linear share)',cape3dUnwarpAscentTime(plan,6)>=6/B-1e-9);
  const many={burnoutTime:120,stageEvents:[10,25,40,55,70,85,100].map((t,i)=>({t,kind:'stage',index:i}))};
  check('stacked windows are capped so cruise still advances',cape3dUnwarpAscentTime(many,120)===1&&cape3dWarpAscentTime(many,.5)>0&&cape3dWarpAscentTime(many,.5)<120);
  let worst=0; for(let u=0;u<=1;u+=.037) worst=Math.max(worst,Math.abs(cape3dUnwarpAscentTime(plan,cape3dWarpAscentTime(plan,u))-u));
  check('unwarp inverts warp',worst<1e-9);
  check('pacing never edits the authoritative trajectory',plan.points.length===pointsBefore&&JSON.stringify(plan.points[plan.points.length-1])===lastBefore);
  // Same sample, only paced: the profile at display u shows exactly the plan's state at warp(u).
  const u=.4, q=prof(u), direct=cape3dTrajectorySample(plan,'ascent',cape3dWarpAscentTime(plan,u)/B);
  near(q.altitudeKm,direct.altitudeKm,1e-6,'profile altitude is the real trajectory sample at the warped time');
  near(q.t,direct.t,1e-6,'profile exposes the real trajectory time');
  check('first 5% of the screen time stays in the slow climb off the pad',prof(.05).altitudeKm<1.5);
}

// ---------- 2. staging throttle keyed to real events ----------
{
  check('full thrust before the core stage separates',cape3dStagingThrottle(plan,stageEv.t-.2).throttle===1);
  check('dark coast right after core-stage separation',cape3dStagingThrottle(plan,stageEv.t+.3).throttle===0);
  const mid=cape3dStagingThrottle(plan,stageEv.t+CINE_SEP_DARK+CINE_SEP_RELIGHT*.4);
  check('upper stage relights with a flash',mid.throttle>0&&mid.throttle<1&&mid.relight>.3);
  check('thrust fully restored after the relight',cape3dStagingThrottle(plan,stageEv.t+CINE_SEP_DARK+CINE_SEP_RELIGHT+.05).throttle===1);
  check('booster jettison never interrupts the core plume',cape3dStagingThrottle(plan,boostEv.t+.3).throttle===1);
  const qd=prof(cape3dUnwarpAscentTime(plan,stageEv.t+.3)/1);
  check('launch profile shows the dark coast',qd.plume===0&&qd.relight===0);
  check('launch profile at full thrust away from events',prof(.5).plume===1||Math.abs(prof(.5).t-stageEv.t)<3);
  check('single-stage flights have no staging dip',cape3dStagingThrottle({stageEvents:[]},10).throttle===1);
}

// ---------- 3. atmosphere: speed of sound, Mach, vapour ----------
{
  near(cape3dSpeedOfSound(0),340.3,.5,'sea-level speed of sound');
  near(cape3dSpeedOfSound(15),295.1,.5,'tropopause speed of sound');
  check('Mach rises with speed and falls with warmer air',cape3dMach(300,11)>cape3dMach(300,0));
  check('no vapour cone subsonic',cape3dVaporStrength(.6,3)===0);
  check('vapour cone peaks at Mach 1 low down',cape3dVaporStrength(1,2)>.8);
  check('no vapour cone in dry high air',cape3dVaporStrength(1,16)===0);
  check('no vapour cone well supersonic',cape3dVaporStrength(1.6,5)===0);
}

// ---------- 4. sky ----------
{
  const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2], s0=cape3dSkyProfile(0,false), s10=cape3dSkyProfile(10,false), s40=cape3dSkyProfile(40,false), s120=cape3dSkyProfile(120,false), n0=cape3dSkyProfile(0,true);
  check('zenith darkens monotonically with altitude',lum(s0.zenith)>lum(s10.zenith)&&lum(s10.zenith)>lum(s40.zenith)&&lum(s40.zenith)>lum(s120.zenith));
  check('space zenith is near black',lum(s120.zenith)<.02);
  check('limb stays bright after the zenith goes dark',lum(s120.horizon)>8*lum(s120.zenith));
  check('horizon band narrows with altitude',s120.band<s10.band&&s10.band<s0.band);
  check('geometric horizon dips below level as the vehicle climbs',s0.dip===0&&s120.dip<s10.dip&&s10.dip<0);
  near(s120.dip,-Math.acos(6371/6491),1e-9,'dip is the real horizon depression angle');
  check('night sky is darker than day',lum(n0.zenith)<lum(s0.zenith)*.2&&lum(n0.horizon)<lum(s0.horizon));
}

// ---------- 5. exhaust trail sampled from the flown path ----------
{
  const head=stageEv.t, now=head+12, samples=cape3dTrailSamples(plan,head,now,40,30000);
  check('trail has samples',samples.length>10);
  check('every trail sample is in the past of the head',samples.every(s=>s.t<=head+1e-9));
  let ordered=true; for(let i=1;i<samples.length;i++) if(samples[i].age<samples[i-1].age) ordered=false;
  check('trail ages grow away from the vehicle',ordered);
  check('ages count from now, not from the head (a frozen head keeps ageing)',samples[0].age>=now-head-1e-9);
  const s5=samples[5], onPath=cape3dTrajectorySample(plan,'ascent',s5.t/B);
  near(s5.altitudeKm,onPath.altitudeKm,.02,'trail samples sit on the flown trajectory');
  check('nothing to draw before liftoff',cape3dTrailSamples(plan,0,0,40,30000).length===0);
}

// ---------- 6. ignition and camera ----------
{
  check('no flame before ignition',cape3dIgnitionFlicker(0,1.3)===0);
  check('mainstage is steady',cape3dIgnitionFlicker(1,1.3)===1);
  let bounded=true, varied=new Set(); for(let s=0;s<2;s+=.013){ const f=cape3dIgnitionFlicker(.3,s); if(f<0||f>.3+1e-9) bounded=false; varied.add(f.toFixed(3)); }
  check('start-up flicker is ragged but never exceeds the commanded ignition',bounded&&varied.size>20);
  const padQ={phase:'pad',altitude:0}, hiQ={phase:'ascent',altitude:150000,altitudeKm:150,qKpa:0,maxQKpa:30,mach:20}, maxQ={phase:'ascent',altitude:11000,altitudeKm:11,qKpa:30,maxQKpa:30,mach:1.6};
  check('reduced motion removes every shake',cape3dLaunchShake(padQ,1,true)===0&&cape3dLaunchShake(maxQ,1,true)===0);
  check('ignition rumble shakes the pad camera',cape3dLaunchShake(padQ,1,false)>.4&&cape3dLaunchShake(padQ,0,false)===0);
  check('max-Q shakes harder than vacuum flight',cape3dLaunchShake(maxQ,1,false)>.3&&cape3dLaunchShake(hiQ,1,false)<.02);
  check('a failed vehicle hands the camera to the failure FX',cape3dLaunchShake(Object.assign({failed:true},maxQ),1,false)===0);
}

// ---------- 7. space segment, camera modes, graphics tiers ----------
{
  near(cape3dLaunchHorizonElevation(1100000,.3),Math.acos(6371/7471)-.21,1e-9,'high above, the camera tilts toward the limb so Earth stays in frame');
  check('orbit entry starts in close chase and ends on the wide orbit view',cape3dOrbitEntryClose(0,true)===1&&cape3dOrbitEntryClose(.13,true)===1&&cape3dOrbitEntryClose(.5,true)===0);
  let mono=true, prev=2; for(let p=0;p<=1;p+=.01){ const c=cape3dOrbitEntryClose(p,true); if(c>prev+1e-12) mono=false; prev=c; }
  check('orbit pull-back is a single smooth move outward',mono);
  check('stable camera skips the orbit-entry move',cape3dOrbitEntryClose(0,false)===0);
  const st=cape3dStableCameraProfile({phase:'ascent'}), st2=cape3dStableCameraProfile({phase:'ascent',progress:.9,t:200,trajectory:{stageEvents:[{t:200,kind:'stage'}]}});
  check('stable tracking holds one framing through staging',st.az===st2.az&&st.distMul===st2.distMul&&st2.shot==='STABLE TRACK');
  const prevMode=cape3dCameraMode(); setCape3dCameraMode('stable'); check('camera mode persists stable',cape3dCameraMode()==='stable'&&!cape3dCinematicCamera()); setCape3dCameraMode('bogus'); check('unknown camera mode falls back to cinematic',cape3dCinematicCamera()); setCape3dCameraMode(prevMode);
  const low=cape3dGraphicsTier('low'), ultra=cape3dGraphicsTier('ultra'), weak=cape3dGraphicsTier('auto',{deviceMemory:4,hardwareConcurrency:4}), strong=cape3dGraphicsTier('auto',{deviceMemory:16,hardwareConcurrency:12});
  check('Low drops the shader plume, decks and vapour and thins the trail',!low.shaderPlume&&!low.cloudDecks&&!low.vapor&&low.trail<ultra.trail&&low.pixelRatio===1);
  check('Ultra renders at a higher resolution',ultra.pixelRatio>cape3dGraphicsTier('medium').pixelRatio);
  check('Auto maps weak hardware to Low and strong to Ultra',weak.tier==='low'&&strong.tier==='ultra'&&weak.pref==='auto');
  check('unknown preference is treated as Auto',cape3dGraphicsTier('potato').pref==='auto');
  const sky=cape3dSkyProfile(150,false), skyLow=cape3dSkyProfile(2,false);
  check('stars come out only once the sky is dark',skyLow.stars===0&&sky.stars>.9);
}
// ---------- 8. readout states powered vs coast ----------
{
  const el=$('flight3dReadout');
  const snapAt=T=>flight3dPresentationSnapshot(spec,timing,timing.padDur+timing.ascentDur*cape3dUnwarpAscentTime(plan,T));
  updateFlight3DReadout(snapAt(stageEv.t-3)); check('readout says POWERED ASCENT under thrust',el.textContent.includes('POWERED ASCENT'));
  updateFlight3DReadout(snapAt(stageEv.t+.3)); check('readout says MECO during the staging coast',el.textContent.includes('MECO'));
  updateFlight3DReadout(snapAt(stageEv.t+CINE_SEP_DARK+.3)); check('readout calls the upper-stage ignition',el.textContent.includes('UPPER STAGE IGNITION'));
  const orbSnap=p=>Object.assign(flight3dPresentationSnapshot(spec,timing,0),{phase:'orbit',phaseProgress:p});
  updateFlight3DReadout(orbSnap(.05)); check('orbit opens on the insertion burn',el.textContent.includes('INSERTION BURN'));
  updateFlight3DReadout(orbSnap(.15)); check('engine cutoff is called out',el.textContent.includes('ENGINE CUTOFF'));
  updateFlight3DReadout(orbSnap(.6)); check('then the vehicle is coasting',el.textContent.includes('COAST'));
}

// ---------- 9. fairing, SECO, camera modes ----------
{
  check('the frozen flight record says which fairing flew',spec.physics.fairing==='standard'&&plan.fairing==='standard');
  const crewedPhys=flightPhysicsSpec(Object.assign({},curMission(),{crew:2}),computeVehicle());
  check('crewed flights carry no payload fairing',crewedPhys.fairing===null);
  check('vehicle spec normalises the fairing and drops it for crewed flights',cape3dFlightVehicleSpec({stages:[{prop:1}],physics:{fairing:'heavy'}}).fairing==='heavy'&&cape3dFlightVehicleSpec({stages:[{prop:1}],crewed:true,physics:{fairing:'heavy'}}).fairing===null);
  check('a different fairing is a different vehicle visual',cape3dVehicleVisualKey({stages:[{prop:1}],fairing:'none'})!==cape3dVehicleVisualKey({stages:[{prop:1}],fairing:'heavy'}));
  check('the orbit craft has already dropped its shroud',cape3dPostAscentVehicleSpec(cape3dFlightVehicleSpec({stages:[{prop:1},{prop:1}],fairing:'standard'})).fairing==='none');
  // A synthetic orbital climb: heating ½ρv³ falls through the limit somewhere above 60 km, after max-Q.
  const pts=[]; for(let t=0;t<=400;t+=1){ const alt=Math.min(200,t*t/600), v=20*t, rho=1.225*Math.exp(-alt*1000/8500); pts.push({t,altitudeKm:alt,speedMps:v,qKpa:.5*rho*v*v/1000,xKm:0}); }
  const syn={points:pts,burnoutTime:400,stageEvents:[],fairing:'standard'}, tj=cape3dFairingJettisonTime(syn), pj=pts.find(p=>p.t===tj);
  check('fairing drops once real heating falls below the limit',tj!=null&&pj.altitudeKm>=60&&.5*1.225*Math.exp(-pj.altitudeKm*1000/8500)*Math.pow(pj.speedMps,3)<FAIRING_HEAT_LIMIT);
  const prev=pts[pts.indexOf(pj)-1]; check('…and not a sample earlier',prev.altitudeKm<60||.5*1.225*Math.exp(-prev.altitudeKm*1000/8500)*Math.pow(prev.speedMps,3)>=FAIRING_HEAT_LIMIT);
  check('no shroud, no jettison',cape3dFairingJettisonTime(Object.assign({},syn,{fairing:'none'}))===null&&cape3dFairingJettisonTime(Object.assign({},syn,{fairing:null}))===null);
  const low={points:pts.filter(p=>p.altitudeKm<40),burnoutTime:150,stageEvents:[],fairing:'standard'};
  check('a flight that never leaves the thick air keeps its shroud',cape3dFairingJettisonTime(low)===null);
  check('the jettison window is paced for the camera',cape3dUnwarpAscentTime(syn,tj+3)-cape3dUnwarpAscentTime(syn,tj-1)>4/400*2);
  check('insertion burn is full, then a crisp cutoff at SECO',cape3dInsertionBurn(.05)===1&&cape3dInsertionBurn(ORBIT_SECO_FRAC-ORBIT_SECO_TAIL)===1&&cape3dInsertionBurn(ORBIT_SECO_FRAC)===0&&cape3dInsertionBurn(ORBIT_SECO_FRAC-ORBIT_SECO_TAIL/2)>0);
  const prevMode=cape3dCameraMode();
  check('all four camera modes round-trip',FLIGHT_CAMERA_MODES.every(m=>setCape3dCameraMode(m)===m&&cape3dCameraMode()===m)); setCape3dCameraMode(prevMode);
  check('ground tracker hands back to the director once the site has faded',cape3dEffectiveCameraMode('ground',.9)==='ground'&&cape3dEffectiveCameraMode('ground',.1)==='cinematic'&&cape3dEffectiveCameraMode('close',.1)==='close');
  check('long lens narrows as the vehicle recedes, within a telephoto range',cape3dGroundTrackerFov(3500,90)>cape3dGroundTrackerFov(30000,90)&&cape3dGroundTrackerFov(1e9,90)>=1.2&&cape3dGroundTrackerFov(10,90)<=40);
  check('close chase frames tighter than tracking',cape3dCloseCameraProfile({phase:'ascent'}).distMul<cape3dStableCameraProfile({phase:'ascent'}).distMul);
}

// ---------- 10. lighting, Earth detail, shimmer ----------
{
  const day=skyAtmosphere(cape3dFlightSkyClock(999,true,false)), night=skyAtmosphere(cape3dFlightSkyClock(999,true,true));
  check('a day flight flies in daylight whatever the ambient clock says',day.sunA>.6);
  check('a night flight flies in real night',night.sunA<.05&&night.starMul>.9);
  check('outside a launch the ambient Cape clock is untouched',cape3dFlightSkyClock(123.4,false,true)===123.4);
  check('at night the plume lights much further than by day',cape3dPlumeLightReach(true).distance>3*cape3dPlumeLightReach(false).distance&&cape3dPlumeLightReach(true).intensity>cape3dPlumeLightReach(false).intensity);
  check('heat shimmer lives in dense air behind a burning engine',cape3dShimmerStrength(0,1,0)>.9&&cape3dShimmerStrength(20000,1,.2)<.01&&cape3dShimmerStrength(0,0,0)===0&&cape3dShimmerStrength(100,1,1)===0);
  check('Earth detail patches both globes onto one shared cloud field (km mapping)',cape3dAscentWorld.toString().includes('cape3dEarthDetail(earthMat,1/1000)')&&cape3dOrbitWorld.toString().includes('cape3dEarthDetail(earthMat,6371/355)'));
}

// ---------- 11. hidden 2D fallback stops painting while 3D owns the frame ----------
{
  const origUpd=cape3dUpdateFlightPresentation; let painted=0;
  cape3dUpdateFlightPresentation=()=>true; // headless: pretend the Three.js view accepted the frame
  playMission(Object.assign({},spec,{title:'T',mode:'launch'}),()=>{}); animState.held=true;
  const real=animState.ctx, spy=new Proxy(real||{},{get(t,k){ if(['fillRect','fill','stroke','fillText','arc','drawImage'].includes(k)) return function(){ painted++; }; const v=t[k]; return typeof v==='function'?v.bind(t):v; },set(t,k,v){ t[k]=v; return true; }});
  animState.ctx=spy; flight3dSession={active:true,handedOff:false,spec};
  animState.held=false; drawScene(animState.padDur+animState.ascentDur*.3); animState.held=true;
  check('no 2D painting while the 3D view owns the frame',painted===0);
  check('the real 2D context is restored after the frame',animState.ctx===spy);
  check('the fallback still runs its state machine (flightData) while silent',!!(animState.flightData&&animState.flightData.curAlt>=0));
  flight3dSession.handedOff=true; animState.held=false; drawScene(animState.padDur+animState.ascentDur*.35); animState.held=true;
  check('after a hand-off the fallback paints again',painted>0);
  flight3dSession=null; cape3dUpdateFlightPresentation=origUpd; try{ dismissAnim(); }catch(e){}
}

// ---------- 12. event sounds fire exactly once, at 1x and at 50x playback ----------
{
  const counts={}, orig={};
  ['sfxSep','sfxCutoff','sfxIgnitionBurst','sfxBoom'].forEach(n=>{ counts[n]=0; });
  const o1=sfxSep,o2=sfxCutoff,o3=sfxIgnitionBurst,o4=sfxBoom;
  sfxSep=function(){ counts.sfxSep++; }; sfxCutoff=function(){ counts.sfxCutoff++; }; sfxIgnitionBurst=function(){ counts.sfxIgnitionBurst++; }; sfxBoom=function(){ counts.sfxBoom++; };
  const flyAt=mult=>{
    Object.keys(counts).forEach(k=>counts[k]=0);
    const prevIdx=animSpeedIdx; animSpeedIdx=ANIM_SPEEDS.findIndex(x=>x.mult===mult);
    playMission(Object.assign({},spec,{title:'R',mode:'launch',success:true,failPhase:null,rng:{wind:0,windFreq:1,windPhase:0,pitchJitter:0,sep:[],apogee:1,bow:0}}),()=>{});
    let now=performance.now(); const real=performance.now; performance.now=()=>now; animState.prevWall=now;
    try{ for(let f=0;f<6000&&animState&&!animState.held;f++){ now+=16; animLoop(); } } finally{ performance.now=real; }
    const out=Object.assign({},counts); try{ dismissAnim(); }catch(e){} animSpeedIdx=prevIdx; return out;
  };
  const n1=flyAt(1), n50=flyAt(50), coreEvents=plan.stageEvents.filter(e=>e.kind==='stage').length, fairing=cape3dFairingJettisonTime(plan)!=null?1:0;
  check('separation sounds = real separations + fairing, once each (1x)',n1.sfxSep===plan.stageEvents.length+fairing);
  check('cutoff thuds = core-stage MECOs + orbital SECO, once each (1x)',n1.sfxCutoff===coreEvents+1);
  check('50x playback skips frames but no event sound is lost or doubled',JSON.stringify(n50)===JSON.stringify(n1));
  check('a successful flight never plays the loss sound',n1.sfxBoom===0);
  sfxSep=o1; sfxCutoff=o2; sfxIgnitionBurst=o3; sfxBoom=o4;
  console.log('  sound counts 1x',JSON.stringify(n1),'50x',JSON.stringify(n50));
}
// ---------- 13. recovery + nozzle heat ----------
{
  const r0=cape3dRecoveryProfile(0,1500,900), r5=cape3dRecoveryProfile(5,1500,900), r20=cape3dRecoveryProfile(20,1500,900), rEnd=cape3dRecoveryProfile(200,1500,900);
  check('recovered stage holds attitude, then flips engines-first',r0.flip===0&&r5.flip>0&&r5.flip<Math.PI&&r20.flip===Math.PI);
  check('boostback burn runs after the flip and kills downrange speed (slight reversal)',r20.burn>0&&rEnd.burn===0&&rEnd.vxNow<0&&rEnd.vxNow>-0.2*1500);
  check('vertical motion stays ballistic',Math.abs(r20.dy-(900*20-.5*9.80665*400))<1e-6);
  let h=0; for(let i=0;i<30;i++) h=cape3dNozzleHeatStep(h,1,.05); const hot=h; for(let i=0;i<30;i++) h=cape3dNozzleHeatStep(h,0,.05);
  check('nozzles heat within about a second of burn and cool more slowly',hot>.8&&h>.4&&h<hot);
  check('snapshot carries the sim recovery disposition',flight3dPresentationSnapshot(Object.assign({},spec,{recovering:true}),timing,5000).effects.recovering===true&&flight3dPresentationSnapshot(spec,timing,5000).effects.recovering===false);
  check('camera director frames the fairing jettison',(()=>{ const tf=cape3dFairingJettisonTime(plan); if(tf==null) return true; const q=cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,timing.padDur+timing.ascentDur*cape3dUnwarpAscentTime(plan,tf+.2))); return cape3dLaunchCameraProfile(q).shot==='FAIRING SEPARATION'; })());
}

// ---------- 14. hygiene ----------
{
  const pure=[cape3dRecoveryProfile,cape3dNozzleHeatStep,cape3dFlightSkyClock,cape3dShimmerStrength,cape3dFairingJettisonTime,cape3dInsertionBurn,cape3dGroundTrackerFov,cape3dAscentWarpTable,cape3dWarpAscentTime,cape3dStagingThrottle,cape3dIgnitionFlicker,cape3dLaunchShake,cape3dSkyProfile,cape3dTrailSamples,cape3dUpdateSmokeTrail,cape3dApplyShaderPlume];
  check('cinematic helpers are deterministic (no Math.random)',pure.every(f=>!f.toString().includes('Math.random')));
  // A '//' comment pasted mid-line once silently disabled the Cape cloud update (and a puff hide) in a one-line statement.
  const tickSrc=cape3dTick.toString().split('\n').find(l=>l.includes('clouds.forEach'))||'';
  check('Cape cloud update is live code, not swallowed by a trailing // comment',!!tickSrc&&!/\/\/[^\n]*clouds\.forEach/.test(tickSrc));
  check('launch plume still avoids hard cone geometry',!cape3dLaunchEffects.toString().includes('ConeGeometry'));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
