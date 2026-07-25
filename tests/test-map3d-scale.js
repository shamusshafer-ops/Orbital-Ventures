// Solar Map D2 (2026-07-25) — scale legibility. The map never stated a distance anywhere: the scene
// compresses orbits radially via sceneRadiusAtAU (SCENE_AU_BASE·AU^SCENE_AU_EXP) and the only AU
// figure in the whole 3D view was a single-body hover tooltip, so nothing on screen conveyed "this is
// a solar system."
//
// A HUD scale bar (the obvious move, and what the D2 review originally proposed) was TRACED AND
// REJECTED before implementing: the scene→AU mapping is nonlinear by ~3.1× across the system (23.0
// scene-units/AU at Mercury vs 7.4 at Neptune), so a linear bar would represent a wildly different
// real distance depending where the camera looks — actively misleading, not merely imprecise. The
// nonlinearity is asserted below so nobody "fixes" this later by adding the bar back.
//
// What shipped instead is honest by construction: AU labels sitting ON each orbit ring (each at its
// own true radius, so it can't misrepresent anything), plus real numeric readouts computed from
// planetHelio's true AU values, which the render compression cannot distort.
//
// Deliberately uses live planetHelio positions rather than sim.js's static BODY_AU mean-distance
// table (what lightLagMinutes uses): BODY_AU can't show Mars actually swinging between ~6 and ~21
// light-minutes as the planets move, which is the whole scale-and-motion point. lightLagMinutes is
// untouched — its near/far RANGE framing is still right for the body card.
//
// THREE.js-dependent pieces (map3dAuLabelSprite, addMap3dAuRuler, map3dUpdateAuRuler's fade/scale LOD)
// are NOT covered here — no WebGL in this sandbox. NOT browser-verified.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
function near(a,b,tol){ return a!=null && b!=null && Math.abs(a-b)<=tol; }

// ---------- the rejected scale bar: assert the nonlinearity that makes it wrong ----------
{
  const perAU=au=>sceneRadiusAtAU(au)/au;
  const inner=perAU(0.387), outer=perAU(30.1);
  check('scene units per AU is NOT constant (a linear scale bar would be wrong)', Math.abs(inner-outer)>1);
  check('inner system is compressed far less per-AU than the outer system (ratio > 2.5x)', inner/outer>2.5);
  check('sceneRadiusAtAU is still monotonic (further out really is further out on screen)',
    sceneRadiusAtAU(0.4)<sceneRadiusAtAU(1)&&sceneRadiusAtAU(1)<sceneRadiusAtAU(5.2)&&sceneRadiusAtAU(5.2)<sceneRadiusAtAU(30.1));
}

// ---------- liveSunDistanceAU: real heliocentric distance, near the semi-major axis ----------
{
  newGame('engineer');
  const d=absDay();
  check('earth sun-distance is ~1 AU', near(liveSunDistanceAU('earth',d), 1.0, 0.05));
  check('jupiter sun-distance is ~5.2 AU', near(liveSunDistanceAU('jupiter',d), 5.2, 0.3));
  check('neptune sun-distance is ~30 AU', near(liveSunDistanceAU('neptune',d), 30.1, 1.0));
  // Mercury has real eccentricity (e=0.2056): its distance must vary between perihelion/aphelion
  const merc=[];
  for(let i=0;i<12;i++) merc.push(liveSunDistanceAU('mercury', d+i*8));
  const mMin=Math.min.apply(null,merc), mMax=Math.max.apply(null,merc);
  check('mercury sun-distance genuinely varies with eccentricity (not a fixed mean)', mMax-mMin>0.1);
  check('mercury stays within its real perihelion/aphelion band (~0.31-0.47 AU)', mMin>0.28 && mMax<0.50);
  check('liveSunDistanceAU returns null for an unknown body', liveSunDistanceAU('nonexistent_xyz',d)===null);
}

// ---------- liveEarthDistanceAU: the number that actually moves ----------
{
  newGame('engineer');
  const d=absDay();
  check('earth-to-earth distance is exactly 0', liveEarthDistanceAU('earth',d)===0);
  // Mars across a full synodic cycle must sweep close-approach to conjunction
  let min=99, max=0;
  for(let m=0;m<30;m++){ const au=liveEarthDistanceAU('mars', d+m*30); min=Math.min(min,au); max=Math.max(max,au); }
  check('mars earth-distance reaches a real close approach (< 0.8 AU)', min<0.8);
  check('mars earth-distance reaches a real far conjunction (> 2.0 AU)', max>2.0);
  check('mars earth-distance stays inside physically possible bounds (~0.3-2.7 AU)', min>0.3 && max<2.75);
  check('mars distance genuinely changes over time (not static like BODY_AU)',
    liveEarthDistanceAU('mars',d)!==liveEarthDistanceAU('mars',d+400));
}

// ---------- moons: planetHelio resolves them to their parent, which needs handling ----------
{
  newGame('engineer');
  const d=absDay();
  const moonAU=liveEarthDistanceAU('moon',d);
  check('the Moon does NOT report 0 AU from Earth (the naive heliocentric result)', moonAU!==0);
  check('the Moon reports the real Earth-Moon distance (~0.00257 AU)', near(moonAU, 0.00257, 0.0005));
  check('the Moon\'s one-way light time is ~1.3 s, not 0', near(liveLightMinutes('moon',d)*60, 1.28, 0.4));
  // a moon of another planet correctly inherits its parent's distance (right at solar-system scale)
  check('io\'s earth-distance matches jupiter\'s', liveEarthDistanceAU('io',d)===liveEarthDistanceAU('jupiter',d));
  check('titan\'s earth-distance matches saturn\'s', liveEarthDistanceAU('titan',d)===liveEarthDistanceAU('saturn',d));
}

// ---------- liveLightMinutes: follows from the live distance, and moves with it ----------
{
  newGame('engineer');
  const d=absDay();
  // light time to the Sun from Earth is the classic ~8.3 minutes
  const sunLag=liveSunDistanceAU('earth',d)*149597870.7/C_KM_S/60;
  check('Earth-Sun light time is the textbook ~8.3 min', near(sunLag, 8.32, 0.3));
  let lmin=999, lmax=0;
  for(let m=0;m<30;m++){ const l=liveLightMinutes('mars', d+m*30); lmin=Math.min(lmin,l); lmax=Math.max(lmax,l); }
  check('mars light time reaches a real minimum (< 7 min)', lmin<7);
  check('mars light time reaches a real maximum (> 18 min)', lmax>18);
  check('liveLightMinutes is consistent with liveEarthDistanceAU',
    near(liveLightMinutes('jupiter',d), liveEarthDistanceAU('jupiter',d)*149597870.7/C_KM_S/60, 0.001));
  check('liveLightMinutes returns null for an unknown body', liveLightMinutes('nonexistent_xyz',d)===null);
}

// ---------- fmtAU: readable at every magnitude the system spans ----------
{
  check('sub-0.01 AU gets 4 decimals (the Moon)', fmtAU(0.00257)==='0.0026 AU');
  check('inner-system distances get 2 decimals', fmtAU(1.523)==='1.52 AU');
  check('outer-system distances get 1 decimal', fmtAU(30.11)==='30.1 AU');
  check('null is a dash, never NaN', fmtAU(null)==='—');
}

// ---------- mapAuRulerTicks: labels derive from the same elements the rings do ----------
{
  const ticks=mapAuRulerTicks();
  check('ruler has a tick for every planet with real orbital elements', ticks.length>=8);
  check('ticks are sorted outward from the Sun', ticks.every((t,i)=>i===0||ticks[i-1].au<=t.au));
  const earth=ticks.find(t=>t.id==='earth');
  check('earth tick exists at 1 AU', earth && near(earth.au,1.0,0.001));
  check('earth tick sceneR matches sceneRadiusAtAU exactly (label can never drift from its ring)',
    earth.sceneR===sceneRadiusAtAU(earth.au));
  check('every tick sceneR matches its own ring radius', ticks.every(t=>t.sceneR===sceneRadiusAtAU(t.au)));
  check('no moons in the ruler (they are not ruler stops)', ticks.every(t=>!(BODIES.find(b=>b.id===t.id)||{}).around));
  check('no Oort cloud in the ruler', ticks.every(t=>t.id!=='oort'));
  check('pluto excluded (no real orbital elements)', ticks.every(t=>t.id!=='pluto'));
}

// ---------- mapScaleReadoutHTML: honest content, no NaN, escapes ----------
{
  newGame('engineer');
  const d=absDay();
  const marsHTML=mapScaleReadoutHTML('mars', d);
  check('mars readout names the body', marsHTML.indexOf('Mars')>=0);
  check('mars readout shows distance from Earth', marsHTML.indexOf('From Earth')>=0);
  check('mars readout shows signal delay', marsHTML.indexOf('Signal delay')>=0);
  check('mars readout shows distance from Sun', marsHTML.indexOf('From Sun')>=0);
  check('mars readout never renders NaN', marsHTML.indexOf('NaN')<0);
  check('readout states the compression caveat (the numbers are real, the spacing is not)',
    marsHTML.indexOf('compressed')>=0);

  const earthHTML=mapScaleReadoutHTML('earth', d);
  check('earth readout says "You are here" rather than a meaningless 0 AU from itself',
    earthHTML.indexOf('You are here')>=0);
  check('earth readout omits a self-referential signal delay', earthHTML.indexOf('Signal delay')<0);

  const moonHTML=mapScaleReadoutHTML('moon', d);
  check('moon readout renders a real non-zero distance', moonHTML.indexOf('0.0026 AU')>=0);
  check('moon readout never renders NaN', moonHTML.indexOf('NaN')<0);

  // every body in BODIES must render without NaN/undefined — the readout is driven by selection,
  // so any selectable body can reach it
  let bad=[];
  for(const b of BODIES){
    const h=mapScaleReadoutHTML(b.id, d);
    if(h.indexOf('NaN')>=0 || h.indexOf('undefined')>=0) bad.push(b.id);
  }
  check('no body renders NaN or undefined in the scale readout: '+bad.join(','), bad.length===0);
}

// ---------- the readout tracks the previewed map date, not just the live one ----------
{
  newGame('engineer');
  const d=absDay();
  const now=mapScaleReadoutHTML('mars', d);
  const later=mapScaleReadoutHTML('mars', d+400);
  check('scrubbing the map date changes the scale readout (distances are live, not baked)', now!==later);
}

console.log(`map3d-scale: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
