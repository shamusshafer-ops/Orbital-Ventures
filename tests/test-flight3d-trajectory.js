// Flight 3D trajectory rework (2026-07-19): the launch profile is now one integrated gravity-turn
// trajectory (pitch program γ(p) + speed program v(p), integrated: d·alt=v·cosγ, d·downrange=v·sinγ)
// instead of three independent curves. This suite locks in the physical SHAPE of the flight:
//   1. slow off the pad, accelerating hard (TWR growth);
//   2. an initial vertical rise, then a VERY GRADUAL pitch-over toward the direction of flight;
//   3. the nose always matching the velocity direction (zero-angle-of-attack gravity turn);
//   4. orbital flights flattening into near-horizontal flight at insertion (altitude S-curve);
//   5. suborbital flights arcing over apogee and coming down into the water (splash at coast end);
//   6. truthful engine/atmosphere effects (no thrust during coast, altitude-based smoke/vacuum).
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(4)} vs ${(+b).toFixed(4)} ±${tol})`,Math.abs(a-b)<=tol); }

newGame('engineer');
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600};
const orbSpec={mode:'launch',crewed:false,isOrbital:true,isCislunar:false,success:true,reqDv:9400,stages:[{prop:100,count:1,dia:5}]};
const subSpec=Object.assign({},orbSpec,{isOrbital:false,reqDv:1800}); // sounding-class
const lobSpec=Object.assign({},orbSpec,{isOrbital:false,reqDv:5200}); // high-apogee lob
function prof(spec,phase,p){
  // clamp just inside the phase: at exactly p=1 flight3dPhaseAt hands off to the NEXT phase
  // (the boundary comparison is strict), which is correct overlay behavior but not what a
  // within-phase trajectory sample wants.
  const q=Math.min(.9995,Math.max(0,p));
  const t=phase==='ascent'?timing.padDur+timing.ascentDur*q:timing.padDur+timing.ascentDur+timing.cruiseDur*q;
  return cape3dLaunchProfile(flight3dPresentationSnapshot(spec,timing,t));
}

// ---------- 1. slow-then-fast: path speed in the last 15% far exceeds the first 15% ----------
{
  const dist=(spec,a,b)=>{ const A=prof(spec,'ascent',a), B=prof(spec,'ascent',b);
    return Math.hypot(B.altitudeKm-A.altitudeKm, B.downrangeKm-A.downrangeKm); };
  const slow=dist(orbSpec,0,.15), fast=dist(orbSpec,.85,1);
  check('liftoff is slow, MECO is fast (last-15% path length >> first-15%)', fast > slow*6);
  check('the crawl off the pad is genuinely slow (first 15% covers <6% of the climb)', prof(orbSpec,'ascent',.15).altitudeKm < 185*.06);
}

// ---------- 2. initial vertical rise, then a very gradual turn ----------
{
  const v=prof(orbSpec,'ascent',.04);
  check('vertical rise: no pitch and no downrange while clearing the tower', v.pitch===0 && v.downrangeKm<1e-6);
  // turn onset is imperceptible: pitch at 10% of ascent is barely off vertical
  check('turn onset is gentle (<5° at 10% of ascent)', Math.abs(prof(orbSpec,'ascent',.10).pitch) < 5*Math.PI/180);
  // gradual everywhere: no step in the pitch program — max per-2%-of-ascent change stays small
  let maxStep=0, prev=prof(orbSpec,'ascent',0).pitch;
  for(let p=.02;p<=1.0001;p+=.02){ const cur=prof(orbSpec,'ascent',p).pitch; maxStep=Math.max(maxStep,Math.abs(cur-prev)); prev=cur; }
  check('pitch-over is continuous and gradual (max change per 2% of ascent < 3.2°)', maxStep < 3.2*Math.PI/180);
  // monotone: the vehicle never pitches back up during powered ascent
  let mono=true; prev=prof(orbSpec,'ascent',0).pitch;
  for(let p=.02;p<=1.0001;p+=.02){ const cur=prof(orbSpec,'ascent',p).pitch; if(cur>prev+1e-9) mono=false; prev=cur; }
  check('pitch angle only ever increases downrange during ascent (monotone turn)', mono);
}

// ---------- 3. the nose matches the velocity direction (zero-angle-of-attack) ----------
{
  let worst=0;
  for(let p=.2;p<=.9;p+=.1){
    const A=prof(orbSpec,'ascent',p-.01), B=prof(orbSpec,'ascent',p+.01);
    const motion=Math.atan2(B.downrangeKm-A.downrangeKm, B.altitudeKm-A.altitudeKm); // angle from vertical
    const nose=-prof(orbSpec,'ascent',p).pitch;
    worst=Math.max(worst,Math.abs(motion-nose));
  }
  check('nose tracks the velocity vector through the whole gravity turn (<2.5° worst error)', worst < 2.5*Math.PI/180);
}

// ---------- 4. orbital: altitude S-curve, near-horizontal insertion ----------
{
  const slopeAt=p=>{ const A=prof(orbSpec,'ascent',p-.02), B=prof(orbSpec,'ascent',p+.02); return (B.altitudeKm-A.altitudeKm)/.04; };
  check('altitude climb rate flattens toward insertion (S-curve, not steepest-at-the-end)', slopeAt(.95) < slopeAt(.55)*.5);
  const end=prof(orbSpec,'ascent',.99);
  check('orbital insertion is near-horizontal (flight path >77° from vertical)', -end.pitch > 77*Math.PI/180);
  const dAlt=prof(orbSpec,'ascent',1).altitudeKm-prof(orbSpec,'ascent',.96).altitudeKm;
  const dDr=prof(orbSpec,'ascent',1).downrangeKm-prof(orbSpec,'ascent',.96).downrangeKm;
  check('at insertion the motion is mostly downrange, not up (horizontal flight into orbit)', dDr > dAlt*4);
  near(prof(orbSpec,'ascent',1).altitudeKm, 185, .5, 'orbital MECO altitude hits the 185 km target');
}

// ---------- 5. suborbital: ballistic arc over apogee, down into the water ----------
{
  const end=prof(subSpec,'ascent',1), c0=prof(subSpec,'suborbital',0);
  near(c0.altitudeKm, end.altitudeKm, .5, 'coast altitude is continuous across burnout');
  near(c0.downrangeKm, end.downrangeKm, .5, 'coast downrange is continuous across burnout');
  near(c0.pitch, end.pitch, .02, 'nose angle is continuous across burnout (no snap at cutoff)');
  // rises to apogee ~42% into the coast, near the mission's target altitude band
  let apogee=0, apogeeQ=0;
  for(let q=0;q<=1.0001;q+=.01){ const h=prof(subSpec,'suborbital',q).altitudeKm; if(h>apogee){ apogee=h; apogeeQ=q; } }
  near(apogeeQ,.42,.03,'apogee lands ~42% into the coast');
  near(apogee, prof(subSpec,'suborbital',0).apogeeKm, 1, 'coast apogee matches the profile apogee');
  check('apogee sits in the mission ladder band (readouts stay in the shipped range)', apogee > end.targetAltitudeKm && apogee < end.targetAltitudeKm*1.25);
  // arcs over: horizontal at apogee, nose-down after
  const atApogee=prof(subSpec,'suborbital',.42);
  near(-atApogee.pitch, Math.PI/2, .1, 'the vehicle is horizontal at apogee (arcing over)');
  check('past apogee the nose drops below the horizon (coming down)', -prof(subSpec,'suborbital',.7).pitch > Math.PI/2+.15);
  // ends in the water
  check('the arc reaches the water at the end of the coast', prof(subSpec,'suborbital',1).altitudeKm < .5 && prof(subSpec,'suborbital',1).splash);
  check('splash is flagged only at the very end', !prof(subSpec,'suborbital',.9).splash && prof(subSpec,'suborbital',.98).splash);
  // downrange keeps growing the whole way (it's a forward arc, not a straight drop)
  let dmono=true, dprev=-1;
  for(let q=0;q<=1.0001;q+=.05){ const d=prof(subSpec,'suborbital',q).downrangeKm; if(d<dprev-1e-9) dmono=false; dprev=d; }
  check('downrange grows monotonically through the arc', dmono);
}

// ---------- energy scaling: a high-apogee lob flies flatter and farther than a sounding rocket ----------
{
  const sEnd=prof(subSpec,'ascent',1), lEnd=prof(lobSpec,'ascent',1);
  check('a high-energy lob pitches farther over than a sounding rocket', -lEnd.pitch > -sEnd.pitch);
  check('a high-energy lob flies farther downrange relative to its altitude', lEnd.downrangeKm/lEnd.altitudeKm > sEnd.downrangeKm/sEnd.altitudeKm);
}

// ---------- 6. truthful engine & atmosphere effects ----------
{
  check('the engine is off during the ballistic coast (old code burned it the whole way)', prof(subSpec,'suborbital',.5).plume===0 && prof(subSpec,'suborbital',.5).smoke===0);
  check('a brief shutdown fade is allowed right at burnout', prof(subSpec,'suborbital',.02).plume>0 && prof(subSpec,'suborbital',.1).plume===0);
  check('smoke is a dense-atmosphere effect (gone above ~13 km)', prof(orbSpec,'ascent',.3).smoke>0===(prof(orbSpec,'ascent',.3).altitudeKm<13) && prof(orbSpec,'ascent',.9).smoke===0);
  check('vacuum shading is altitude-based (none low, full high)', prof(orbSpec,'ascent',.2).vacuum===0 && prof(orbSpec,'ascent',1).vacuum>0.9);
  // the old first-hop vacuum bug stays dead: a 20 m hop never gets vacuum plume shading
  const hop=Object.assign({},orbSpec,{isOrbital:false,reqDv:1000});
  check('a metre-scale hop never shows vacuum effects', prof(hop,'ascent',.8).vacuum===0 && prof(hop,'ascent',.8).pitch===0);
  check('a metre-scale hop still clears its pad visibly', prof(hop,'ascent',.8).altitude>40);
}

// ---------- determinism & memo cache ----------
{
  const a=JSON.stringify(prof(orbSpec,'ascent',.63)), b=JSON.stringify(prof(orbSpec,'ascent',.63));
  check('the trajectory is deterministic (memoized table, no randomness)', a===b);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
