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
  check('Earth scene radius == SCENE_AU_BASE (1 AU anchor)', Math.abs(sceneRadiusFor('earth') - SCENE_AU_BASE) < 1e-9);
  const order = ['mercury','venus','earth','mars','belt','jupiter','saturn','uranus','neptune'];
  let monotonic = true;
  for(let i=1;i<order.length;i++){ if(!(sceneRadiusFor(order[i]) > sceneRadiusFor(order[i-1]))) monotonic=false; }
  check('scene radii strictly increase Mercury→Neptune', monotonic);
  // compression really compresses: Neptune is 30x Earth's AU but nowhere near 30x the scene radius
  check('outer system is compressed but substantially spaced (Neptune is 10–15x Earth, not real-world 30x)',
    sceneRadiusFor('neptune') > 10*sceneRadiusFor('earth') && sceneRadiusFor('neptune') < 15*sceneRadiusFor('earth'));
  check('sceneRadiusFor(unknown) is null', sceneRadiusFor('not_a_body')===null);
  // a moon resolves to its parent planet's radius
  check('a moon resolves to its parent planet radius (phobos == mars)', sceneRadiusFor('phobos')===sceneRadiusFor('mars'));
}

// ---------- bodyScenePos: real heliocentric distance plus inclination-aware coordinates ----------
{
  const d = absDay();
  for(const id of ['mercury','earth','mars','jupiter']){
    const p = bodyScenePos(id, d), h = planetHelio(id, d);
    near(Math.hypot(p.x,p.y,p.z), sceneRadiusAtAU(h.r), 1e-6, `${id}: scene distance follows its live heliocentric radius`);
  }
  check('Earth remains in the reference ecliptic plane', Math.abs(bodyScenePos('earth',d).y)<1e-9);
  check('Mercury rises above/below the ecliptic on its inclined plane', Math.abs(bodyScenePos('mercury',d).y)>1e-3);
}

// ---------- the decision-bearing planar geometry remains nearly identical for launch-window reading ----------
{
  const d = absDay();
  const pe = bodyScenePos('earth', d), pm = bodyScenePos('mars', d);
  const he = planetHelio('earth', d), hm = planetHelio('mars', d);
  const sceneSep = norm2pi(Math.atan2(pm.z,pm.x) - Math.atan2(pe.z,pe.x));
  const realSep  = norm2pi(hm.theta - he.theta);
  near(sceneSep, realSep, 0.002, 'Earth→Mars projected separation stays close to real heliocentric separation');
}

// ---------- time evolution: planets move; Earth returns after one game-year ----------
{
  const p0 = bodyScenePos('mars', 0), p1 = bodyScenePos('mars', 40);
  check('Mars moves as game-time advances', Math.hypot(p1.x-p0.x, p1.z-p0.z) > 1e-3);
  const e0 = bodyScenePos('earth', 0), eYr = bodyScenePos('earth', planetPeriodDays('earth'));
  near(e0.x, eYr.x, 1e-3, 'Earth returns to the same scene x after one game-year (360 days)');
  near(e0.y, eYr.y, 1e-3, 'Earth returns to the same scene y after one game-year');
  near(e0.z, eYr.z, 1e-3, 'Earth returns to the same scene z after one game-year');
}

// ---------- moons: placed at individually scaled orbital offsets, still in-plane ----------
{
  const d = absDay();
  const mars = bodyScenePos('mars', d), phobos = bodyScenePos('phobos', d), deimos = bodyScenePos('deimos', d);
  const off = Math.hypot(phobos.x-mars.x, phobos.z-mars.z);
  const want=planetMeshRadius(BODIES.find(b=>b.id==='mars'))*(0.95+1.65*Math.log(SCENE_MOON_ORBITS.phobos.r)/Math.log(60.3));
  near(off, want, 1e-6, 'phobos sits at its individually scaled orbital offset from Mars');
  check('phobos stays in the ecliptic plane (y≈0)', Math.abs(phobos.y) < 1e-9);
  check('phobos is much closer to Mars than to the Sun (reads as a moon, not a planet)',
    off < sceneRadiusFor('mars')*0.5);
  check('Deimos is farther from Mars than Phobos', Math.hypot(deimos.x-mars.x,deimos.z-mars.z) > off);
  const j=bodyScenePos('jupiter',d), io=bodyScenePos('io',d), callisto=bodyScenePos('callisto',d);
  check('major-moon spacing preserves ordering (Callisto beyond Io)', Math.hypot(callisto.x-j.x,callisto.z-j.z) > Math.hypot(io.x-j.x,io.z-j.z));
}

// ---------- orbitRingPoints: closed eccentric, inclined path ----------
{
  const pts = orbitRingPoints('mars', 96);
  check('orbit ring returns segments+1 points (closed loop)', pts.length === 97);
  const mercury=orbitRingPoints('mercury',128), mercR=mercury.map(p=>Math.hypot(p.x,p.y,p.z)), mercY=mercury.map(p=>p.y);
  check('Mercury ring visibly expresses eccentricity', Math.max(...mercR)-Math.min(...mercR)>1);
  check('Mercury ring visibly expresses inclination', Math.max(...mercY)-Math.min(...mercY)>0.5);
  check('Earth ring remains flat in its reference plane', orbitRingPoints('earth',64).every(p=>Math.abs(p.y)<1e-9));
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
