// E4.5 (2026-07-19): ship markers — wires the E4.4 hull registry onto the E4.3 solar-system
// scene. Covers the pure math (flightTargetBody, flightTransferElements, flightScenePos) and the
// activeShipMarkers query that the Three.js layer (untestable here) reconciles into meshes each
// tick. The Three.js mesh/label/pick code isn't Node-testable, but every position and filtering
// decision it depends on is — this suite is that coverage.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(4)} vs ${(+b).toFixed(4)} ±${tol})`,Math.abs(a-b)<=tol); }

newGame('engineer');

// ---------- flightTargetBody: general mission->body lookup, distinct from missionTargetBody ----------
{
  check('a Mars mission targets mars', flightTargetBody('mars_orbit')==='mars');
  check('an Apollo mission targets the moon (not Mars, unlike the window-math fallback)', flightTargetBody('luna_orbit')==='moon');
  check('an Outer Worlds mission targets jupiter', flightTargetBody('jupiter_orbit')==='jupiter');
  check('a Cronian mission targets titan', flightTargetBody('titan_landing')==='titan');
  check('the Oort/Daedalus mission has no renderable point target (cloud body)', flightTargetBody('oort_precursor')===null);
  check('an unknown mission id returns null (not a silent Mars default, unlike missionTargetBody)', flightTargetBody('not_a_real_mission')===null);
}

// ---------- flightTransferElements: a/e always well-posed for positive radii ----------
{
  const out=flightTransferElements(10,20);
  near(out.a,15,1e-9,'semi-major axis is the endpoint average');
  near(out.e,1/3,1e-9,'eccentricity is |r1-r0|/(r1+r0)');
  check('outbound flag true when target radius is larger', out.outbound===true);
  const inb=flightTransferElements(20,10);
  check('outbound flag false when target radius is smaller (inbound)', inb.outbound===false);
  near(inb.e,1/3,1e-9,'eccentricity is symmetric in the two radii');
  check('equal radii give e=0 (a circular, degenerate-but-valid transfer)', flightTransferElements(10,10).e===0);
  // e is ALWAYS < 1 for any positive r0,r1 — the construction can never hand solveKepler a bad orbit
  for(const [a,b] of [[1,1000],[1000,1],[0.01,50],[50,0.01]]) check(`e stays <1 for radii ${a}/${b}`, flightTransferElements(a,b).e<1);
}

// ---------- flightScenePos: endpoints match bodyScenePos EXACTLY (the core correctness proof) ----------
{
  const wins=computeWindows('mars', absDay(), 1), launchAbs=wins[0].abs, arriveAbs=launchAbs+255;
  const rec={id:'flt_t1', mission:'mars_orbit', name:'Test', launchAbs, arriveAbs, deferred:true};
  const p0=bodyScenePos('earth',launchAbs), s0=flightScenePos(rec,launchAbs);
  const p1=bodyScenePos('mars',arriveAbs), s1=flightScenePos(rec,arriveAbs);
  near(s0.x,p0.x,1e-6,'departure x matches Earth\'s actual scene position'); near(s0.y,p0.y,1e-6,'departure y matches'); near(s0.z,p0.z,1e-6,'departure z matches');
  near(s1.x,p1.x,1e-6,'arrival x matches Mars\' actual scene position (incl. inclination)'); near(s1.y,p1.y,1e-6,'arrival y matches'); near(s1.z,p1.z,1e-6,'arrival z matches');
  check('progress is 0 at launch and 1 at arrival', s0.progress===0 && s1.progress===1);
}

// ---------- shape: monotonic radius growth for an outbound transfer, smooth in between ----------
{
  const wins=computeWindows('mars', absDay(), 1), launchAbs=wins[0].abs, arriveAbs=launchAbs+255;
  const rec={id:'flt_t2', mission:'mars_orbit', name:'Test', launchAbs, arriveAbs, deferred:true};
  let prevR=-1, mono=true;
  for(let f=0; f<=1.0001; f+=.05){
    const t=launchAbs+(arriveAbs-launchAbs)*f, p=flightScenePos(rec,t), r=Math.hypot(p.x,p.y,p.z);
    if(r<prevR-1e-6) mono=false; prevR=r;
  }
  check('scene radius grows monotonically outbound Earth->Mars (no back-and-forth)', mono);
  const mid=flightScenePos(rec, launchAbs+(arriveAbs-launchAbs)*0.5);
  const r0=Math.hypot(bodyScenePos('earth',launchAbs).x,bodyScenePos('earth',launchAbs).y,bodyScenePos('earth',launchAbs).z);
  const r1=Math.hypot(bodyScenePos('mars',arriveAbs).x,bodyScenePos('mars',arriveAbs).y,bodyScenePos('mars',arriveAbs).z);
  const midR=Math.hypot(mid.x,mid.y,mid.z);
  check('midpoint radius sits between the two endpoint radii', midR>Math.min(r0,r1) && midR<Math.max(r0,r1));
}

// ---------- clamping: before launch / after arrival never extrapolates off the arc ----------
{
  const wins=computeWindows('mars', absDay(), 1), launchAbs=wins[0].abs, arriveAbs=launchAbs+255;
  const rec={id:'flt_t3', mission:'mars_orbit', name:'Test', launchAbs, arriveAbs, deferred:true};
  const before=flightScenePos(rec, launchAbs-500), atLaunch=flightScenePos(rec, launchAbs);
  const after=flightScenePos(rec, arriveAbs+500), atArrive=flightScenePos(rec, arriveAbs);
  near(before.x,atLaunch.x,1e-6,'a query before launch clamps to the departure point (x)');
  near(after.x,atArrive.x,1e-6,'a query after arrival clamps to the arrival point (x)');
}

// ---------- graceful nulls: missing target / bad timing never throw, just opt the marker out ----------
{
  check('an unknown-target mission yields no marker position', flightScenePos({mission:'oort_precursor',launchAbs:0,arriveAbs:100},50)===null);
  check('a record missing timing yields no marker position', flightScenePos({mission:'mars_orbit'},50)===null);
  check('a null record is handled without throwing', flightScenePos(null,50)===null);
}

// ---------- activeShipMarkers: the query the render tick reconciles into meshes ----------
{
  newGame('engineer'); state.hulls=[]; state.activeFlights=[];
  check('no active flights yields no markers', activeShipMarkers(absDay()).length===0);

  const wins=computeWindows('mars', absDay(), 1), launchAbs=wins[0].abs, arriveAbs=launchAbs+255;
  const hull=makeHull({activeVehicle:null},'rollout'); markHullLaunched(hull.id,'mars_orbit');
  state.activeFlights.push({id:'flt_a', mission:'mars_orbit', name:'Ares I', launchAbs, arriveAbs, deferred:true, ctx:{hullId:hull.id}});
  // a short/synchronous-style record (no `deferred`) should never surface as a marker — it never
  // persists across a render in the real game either.
  state.activeFlights.push({id:'flt_b', mission:'mars_orbit', name:'Sync ghost', launchAbs, arriveAbs});
  // a record whose mission has no renderable target should be skipped, not crash the scan
  state.activeFlights.push({id:'flt_c', mission:'oort_precursor', name:'Daedalus I', launchAbs, arriveAbs, deferred:true});

  const marks=activeShipMarkers(launchAbs+120);
  check('only the deferred, valid-target flight produces a marker', marks.length===1 && marks[0].flightId==='flt_a');
  check('the marker carries the correct hull serial', marks[0].serial===hull.serial);
  check('the marker carries a live position', marks[0].pos && typeof marks[0].pos.x==='number');
  check('the marker progress is between 0 and 1 mid-cruise', marks[0].progress>0 && marks[0].progress<1);
  check('reuse count reflects the hull registry (0 on a first flight)', marks[0].reuseCount===0);

  // a flight with no ctx/hullId still gets a marker (position doesn't require a hull) but no serial
  state.activeFlights.push({id:'flt_d', mission:'mars_orbit', name:'No hull on record', launchAbs, arriveAbs, deferred:true});
  const marks2=activeShipMarkers(launchAbs+120);
  const noHull=marks2.find(m=>m.flightId==='flt_d');
  check('a flight without a linked hull still gets a position marker', !!noHull && noHull.serial===null);

  // malformed entries in the array never crash the scan (defensive — activeFlights is
  // player-visible state that other systems could in principle leave in an odd shape)
  state.activeFlights.push(null); state.activeFlights.push({deferred:true});
  let threw=false;
  try{ activeShipMarkers(launchAbs+120); }catch(e){ threw=true; }
  check('a malformed activeFlights entry never throws', !threw);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
