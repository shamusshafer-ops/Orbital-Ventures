// E4.3.0 (2026-07-18): 3D solar-system scene math — the headless-testable core the Three.js
// rendering shell (E4.3.1, flag MAP3D) sits on top of. Validates the "real angles, schematic radii"
// design: scene ANGLES equal the real heliocentric angles from E4.1's planetHelio (the truthful,
// window-relevant property), while RADII are a documented compression. Also covers orbit-ring
// generation, moon placement, camera math, and time evolution. None of this needs a browser.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol,name){ check(name+` (${(+a).toFixed(4)} ≈ ${(+b).toFixed(4)} ±${tol})`, Math.abs(a-b)<=tol); }
const norm2pi = x => ((x % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);

newGame('engineer');

// ---------- sceneRadiusFor: monotonic compression, correct ordering ----------
{
  check('Earth scene radius == SCENE_AU_BASE (1 AU anchor)', Math.abs(sceneRadiusFor('earth') - 10) < 1e-9);
  const order = ['mercury','venus','earth','mars','belt','jupiter','saturn','uranus','neptune'];
  let monotonic = true;
  for(let i=1;i<order.length;i++){ if(!(sceneRadiusFor(order[i]) > sceneRadiusFor(order[i-1]))) monotonic=false; }
  check('scene radii strictly increase Mercury→Neptune', monotonic);
  // compression really compresses: Neptune is 30x Earth's AU but nowhere near 30x the scene radius
  check('outer system is compressed (Neptune < 10x Earth scene radius despite 30x the AU)',
    sceneRadiusFor('neptune') < 10*sceneRadiusFor('earth'));
  check('sceneRadiusFor(unknown) is null', sceneRadiusFor('not_a_body')===null);
  // a moon resolves to its parent planet's radius
  check('a moon resolves to its parent planet radius (phobos == mars)', sceneRadiusFor('phobos')===sceneRadiusFor('mars'));
}

// ---------- bodyScenePos: ANGLE is truthful (equals planetHelio theta), planets in the ecliptic ----------
{
  const d = absDay();
  for(const id of ['mercury','earth','mars','jupiter']){
    const p = bodyScenePos(id, d), h = planetHelio(id, d);
    check(`${id}: lies in the ecliptic plane (y≈0)`, Math.abs(p.y) < 1e-9);
    near(Math.hypot(p.x,p.z), sceneRadiusFor(id), 1e-6, `${id}: scene distance == schematic radius`);
    near(norm2pi(Math.atan2(p.z, p.x)), norm2pi(h.theta), 1e-6, `${id}: scene angle == real heliocentric theta`);
  }
}

// ---------- the decision-bearing invariant: Earth↔Mars scene angle == real relative geometry ----------
{
  const d = absDay();
  const pe = bodyScenePos('earth', d), pm = bodyScenePos('mars', d);
  const he = planetHelio('earth', d), hm = planetHelio('mars', d);
  const sceneSep = norm2pi(Math.atan2(pm.z,pm.x) - Math.atan2(pe.z,pe.x));
  const realSep  = norm2pi(hm.theta - he.theta);
  near(sceneSep, realSep, 1e-6, 'Earth→Mars scene angular separation == real heliocentric separation (window geometry preserved)');
}

// ---------- time evolution: planets move; Earth returns after one game-year ----------
{
  const p0 = bodyScenePos('mars', 0), p1 = bodyScenePos('mars', 40);
  check('Mars moves as game-time advances', Math.hypot(p1.x-p0.x, p1.z-p0.z) > 1e-3);
  const e0 = bodyScenePos('earth', 0), eYr = bodyScenePos('earth', planetPeriodDays('earth'));
  near(e0.x, eYr.x, 1e-3, 'Earth returns to the same scene x after one game-year (360 days)');
  near(e0.z, eYr.z, 1e-3, 'Earth returns to the same scene z after one game-year');
}

// ---------- moons: placed beside their parent, small offset, still in-plane ----------
{
  const d = absDay();
  const mars = bodyScenePos('mars', d), phobos = bodyScenePos('phobos', d);
  const off = Math.hypot(phobos.x-mars.x, phobos.z-mars.z);
  near(off, SCENE_MOON_OFFSET, 1e-6, 'phobos sits at the schematic moon offset from Mars');
  check('phobos stays in the ecliptic plane (y≈0)', Math.abs(phobos.y) < 1e-9);
  check('phobos is much closer to Mars than to the Sun (reads as a moon, not a planet)',
    off < sceneRadiusFor('mars')*0.5);
}

// ---------- orbitRingPoints: closed schematic circle at the body's radius ----------
{
  const pts = orbitRingPoints('mars', 96);
  check('orbit ring returns segments+1 points (closed loop)', pts.length === 97);
  const R = sceneRadiusFor('mars');
  check('every orbit-ring point is at the body radius, in-plane', pts.every(p=> Math.abs(Math.hypot(p.x,p.z)-R) < 1e-6 && Math.abs(p.y)<1e-9));
  near(pts[0].x, pts[pts.length-1].x, 1e-6, 'ring is closed (first x == last x)');
  near(pts[0].z, pts[pts.length-1].z, 1e-6, 'ring is closed (first z == last z)');
  check('orbit ring enforces a sane minimum segment count', orbitRingPoints('earth', 2).length >= 9);
  check('orbitRingPoints(unknown) is empty', orbitRingPoints('not_a_body').length === 0);
}

// ---------- camera math ----------
{
  const d = absDay();
  const tEarth = cameraTargetFor('earth', d), pEarth = bodyScenePos('earth', d);
  check('cameraTargetFor(earth) == Earth scene position', tEarth.x===pEarth.x && tEarth.z===pEarth.z);
  check('cameraTargetFor(unknown) falls back to the Sun/origin (never null)',
    (()=>{ const t=cameraTargetFor('not_a_body', d); return t && t.x===0 && t.y===0 && t.z===0; })());
  // orbit camera eye: at requested distance from target, elevation controls height
  const tgt = {x:0,y:0,z:0};
  const eye = orbitCameraEye(tgt, 0, 0, 50);
  near(Math.hypot(eye.x-tgt.x, eye.y-tgt.y, eye.z-tgt.z), 50, 1e-6, 'orbit camera eye sits at the requested distance from target');
  const eyeTop = orbitCameraEye(tgt, 0, Math.PI/2, 50);
  check('elevation near +90° puts the camera above the ecliptic (looking down)', eyeTop.y > 40);
  const eyeSide = orbitCameraEye(tgt, 0, 0, 50);
  check('elevation 0 keeps the camera in the ecliptic plane (y≈0)', Math.abs(eyeSide.y) < 1e-9);
  // elevation is clamped just inside the poles so the camera never degenerates
  const eyeOver = orbitCameraEye(tgt, 0, 99, 50);
  check('extreme elevation is clamped (camera never passes the pole)', eyeOver.y < 50 && eyeOver.y > 49);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
