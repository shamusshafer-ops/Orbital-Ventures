// Solar System map improvement pass, Slice C (2026-07-24) — port the 3D view's live in-flight ship
// tracking (E4.5, activeShipMarkers/flightScenePos) to the SVG and Phaser 2D renderers. Deliberately
// does NOT re-derive the real Kepler transfer math in 2D pixel space — a ship marker rides the SAME
// quadratic-bezier curve the 2D map already draws for the committed-window/planned-route arcs (via
// the now-generalized transferArc + new shipMapPoint), at the marker's real progress fraction from
// the 3D model. This guarantees the moving marker visually matches the arc already on screen instead
// of introducing a second, incompatible 2D transfer shape, and reuses Slice A's hand-tuned radii
// rather than the real-AU model (which Slice A found hurts 2D legibility).
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

function makeFlight(missionId, launchAbs, arriveAbs, id){
  const m=MISSIONS.find(x=>x.id===missionId);
  state.activeFlights=state.activeFlights||[];
  const rec={id:id||'flt_test', mission:m.id, name:m.name, launchAbs, arriveAbs, phase:'cruise', crew:0, deferred:true, ctx:{}};
  state.activeFlights.push(rec);
  return rec;
}

// ---------- activeShipMarkers: new fields are present and correct ----------
{
  newGame('engineer');
  const launchAbs=absDay();
  makeFlight('mars_flyby', launchAbs, launchAbs+220);
  const markers=activeShipMarkers(launchAbs);
  check('one marker for the one active flight', markers.length===1);
  check('destId resolves to the real target body', markers[0].destId==='mars');
  check('launchAbs/arriveAbs carried through from the flight record', markers[0].launchAbs===launchAbs && markers[0].arriveAbs===launchAbs+220);
  check('progress is 0 right at launch', markers[0].progress===0);
}

// ---------- shipMapPoint: starts exactly at the origin body's radius, ends at the destination's ----------
{
  newGame('engineer');
  const launchAbs=absDay();
  makeFlight('mars_flyby', launchAbs, launchAbs+220);
  const earth=BODIES.find(b=>b.id==='earth'), mars=BODIES.find(b=>b.id==='mars');
  const cx=500, cy=500;

  const m0=activeShipMarkers(launchAbs)[0];
  const p0=shipMapPoint(cx,cy,m0);
  const d0=Math.hypot(p0.x-cx, p0.y-cy);
  check('at progress=0, marker sits exactly at the origin body\'s hand-tuned radius (Earth)', Math.abs(d0-earth.r)<0.5);

  const m1=activeShipMarkers(launchAbs+220)[0];
  const p1=shipMapPoint(cx,cy,m1);
  const d1=Math.hypot(p1.x-cx, p1.y-cy);
  check('at progress=1, marker sits exactly at the destination\'s hand-tuned radius (Mars)', Math.abs(d1-mars.r)<0.5);

  const mMid=activeShipMarkers(launchAbs+110)[0];
  const pMid=shipMapPoint(cx,cy,mMid);
  const dMid=Math.hypot(pMid.x-cx, pMid.y-cy);
  check('at the midpoint, the marker bows OUTWARD past both endpoint radii (matches the existing static-arc visual language)', dMid>Math.max(earth.r,mars.r));
}

// ---------- shipMapPoint: safe no-ops on bad input ----------
{
  check('shipMapPoint returns null for a null marker', shipMapPoint(500,500,null)===null);
  check('shipMapPoint returns null when destId is missing', shipMapPoint(500,500,{})===null);
}

// ---------- transferArc: generalized signature is backward-compatible ----------
{
  newGame('engineer');
  const arc3=transferArc(500,500,'mars'); // old 3-arg call site (committed-window/planned-route)
  const arc5=transferArc(500,500,'mars',mapViewAbsDay(),mapViewAbsDay()); // equivalent 5-arg call
  check('omitting launch/arrive days defaults both to "now", matching the old 3-arg behavior', arc3.from.x===arc5.from.x && arc3.to.x===arc5.to.x);
}

// ---------- transferArc: explicit launch/arrival days produce endpoints anchored to those days ----------
{
  newGame('engineer');
  const d0=absDay(), d1=d0+300; // far enough apart that Earth's real position clearly differs
  const arcNow=transferArc(500,500,'mars',d0,d0);
  const arcLater=transferArc(500,500,'mars',d1,d1);
  check('a later launch day produces a different Earth departure point (truthful motion, not frozen)', arcNow.from.x!==arcLater.from.x || arcNow.from.y!==arcLater.from.y);
}

// ---------- renderMapOverview: the SVG overview actually draws the marker ----------
{
  newGame('engineer');
  const launchAbs=absDay();
  makeFlight('mars_flyby', launchAbs, launchAbs+220);
  state.day+=110; // mid-flight
  const svg=renderMapOverview(980,620);
  check('a ship marker (amber fill) is present in the rendered SVG', svg.includes('#ffb347'));
  check('the mission name label is present', svg.includes('Mars Flyby'));
}

// ---------- renderMapOverview: no active flights → no marker, no crash ----------
{
  newGame('engineer');
  const svg=renderMapOverview(980,620);
  check('no ship marker drawn when there are no active flights', !svg.includes('#ffb347'));
}

// ---------- multiple simultaneous flights each get their own marker ----------
{
  newGame('engineer');
  const launchAbs=absDay();
  makeFlight('mars_flyby', launchAbs, launchAbs+220, 'flt_a');
  makeFlight('luna_flyby', launchAbs, launchAbs+10, 'flt_b');
  const markers=activeShipMarkers(launchAbs+5);
  check('two simultaneous flights both produce markers', markers.length===2);
  const ids=markers.map(m=>m.flightId).sort();
  check('marker flightIds match both flight records', ids[0]==='flt_a' && ids[1]==='flt_b');
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
