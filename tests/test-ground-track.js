// #45 — Ground track visualization. groundTrackPasses math (correct max-|lat| = inclination, equatorial
// = flat line, westward drift per pass), the earthPopInfoHTML caption (shown only when the active
// mission has .inclination), and drawEarthGlobe rendering the track without throwing across the three
// cases: active mission with inclination, no active mission, active mission without inclination.
// Appended after harness.js + build/game.js (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- groundTrackPasses: math ----------
{
  const passes=groundTrackPasses(65,-80.6,3);
  check('3 passes returned', passes.length===3);
  check('each pass has points', passes[0].length>10);
  const maxLat=Math.max(...passes[0].map(p=>Math.abs(p.lat)));
  check('max |lat| ≈ inclination (65°)', Math.abs(maxLat-65)<0.5);

  const eq=groundTrackPasses(0,-80.6,3);
  const maxLatEq=Math.max(...eq[0].map(p=>Math.abs(p.lat)));
  check('equatorial (0°) stays essentially at the equator', maxLatEq<0.5);

  // westward drift: pass 1's ascending-node-crossing longitude should differ from pass 0's
  const node0=passes[0].find(p=>Math.abs(p.lat)<1), node1=passes[1].find(p=>Math.abs(p.lat)<1);
  check('later passes drift to a different longitude (westward Earth-rotation flavor)', !!node0 && !!node1 && Math.abs(node0.lon-node1.lon)>5);

  // longitude stays in valid range
  check('all longitudes normalized to [-180,180]', passes.every(seg=>seg.every(p=>p.lon>=-180&&p.lon<=180)));
}

// ---------- earthPopInfoHTML: caption only when the active mission has .inclination ----------
{
  state.activeMission=null;
  check('caption: absent with no active mission', earthPopInfoHTML().indexOf('Ground track')===-1);

  const noIncl=MISSIONS.find(m=>m.inclination==null);
  state.activeMission=noIncl.id;
  check('caption: absent for a mission without .inclination', earthPopInfoHTML().indexOf('Ground track')===-1);

  state.activeMission='crew_orbit';
  const cap=earthPopInfoHTML();
  check('caption: present for crew_orbit', cap.indexOf('Ground track')>=0);
  check('caption: names the mission', /Crewed Orbit/.test(cap));
  check('caption: states its inclination', /65°/.test(cap));
  state.activeMission=null;
}

// ---------- drawEarthGlobe: renders (no throw) across the three cases ----------
{
  let threw=false;
  try{
    state.activeMission='crew_orbit';
    drawEarthGlobe(makeFakeCtx2D(),0,0,100,-80,0,0.2);
    state.activeMission=null;
    drawEarthGlobe(makeFakeCtx2D(),0,0,100,-80,0,0.2);
    state.activeMission=(MISSIONS.find(m=>m.inclination==null)||{}).id;
    drawEarthGlobe(makeFakeCtx2D(),0,0,100,-80,0,0.2);
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('drawEarthGlobe: no throw across all three cases', !threw);
  state.activeMission=null;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
