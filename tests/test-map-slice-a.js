// Solar System map improvement pass, Slice A (2026-07-24) — "truthful angle" for the SVG + Phaser
// 2D renderers, matching what the 3D view already did (bodyScenePos/planetHelio each frame). Before
// this, the 2D map drew every planet at a frozen static ANGLES constant that never matched the real
// transfer-window dates its own body card was quoting, and never moved as game time advanced.
// Deliberately radius-preserving: an empirical trace (see ROADMAP.md) found a straight port of the
// 3D view's real-AU power-law radius makes 2D inner-planet crowding *worse*, not better, so only the
// angle changed here — the existing hand-tuned per-body radii are untouched.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- map2dAngle: truthful for bodies with real orbital elements, static fallback otherwise ----------
{
  newGame('engineer');
  const helioEarth = planetHelio('earth', absDay());
  check('map2dAngle(earth) matches real heliocentric theta', map2dAngle('earth', absDay())===helioEarth.theta);
  check('map2dAngle(earth) differs from the old frozen static constant', map2dAngle('earth', absDay())!==ANGLES.earth);
  const helioMars = planetHelio('mars', absDay());
  check('map2dAngle(mars) matches real heliocentric theta', map2dAngle('mars', absDay())===helioMars.theta);
  // moon (no direct ORBITAL_ELEMENTS entry) falls back to the static local angle, unchanged
  check('map2dAngle(moon) falls back to static ANGLES (moons keep local/decorative angle)', map2dAngle('moon', absDay())===(ANGLES.moon!==undefined?ANGLES.moon:0));
  // pluto (no orbital elements at all) falls back to static
  check('map2dAngle(pluto) falls back to static ANGLES (no orbital elements)', map2dAngle('pluto', absDay())===(ANGLES.pluto!==undefined?ANGLES.pluto:0));
  // unknown id doesn't throw
  check('map2dAngle on an unknown id does not throw', (()=>{ try{ map2dAngle('nonexistent_xyz', absDay()); return true; }catch(e){ return false; } })());
}

// ---------- the angle actually moves as game time advances (this is the whole point) ----------
{
  newGame('engineer');
  const a1=map2dAngle('mars', absDay());
  state.year+=2;
  const a2=map2dAngle('mars', absDay());
  check('mars angle changes after 2 game years (truthful motion, not frozen)', a1!==a2);
  const e1=map2dAngle('earth', absDay());
  state.month+=6; if(state.month>=12){ state.month-=12; state.year+=1; }
  const e2=map2dAngle('earth', absDay());
  check('earth angle changes after 6 more months', e1!==e2);
}

// ---------- renderMapOverview: Oort no longer forces the whole diagram to shrink ----------
{
  newGame('engineer');
  const svg=renderMapOverview(980,620);
  const m=svg.match(/viewBox="0 0 (\d+) \1"/);
  check('overview renders a square viewBox', !!m);
  const S=m?+m[1]:0;
  const pluto=BODIES.find(b=>b.id==='pluto'), oort=BODIES.find(b=>b.id==='oort');
  check('viewBox is sized to Pluto (272), not Oort (320) — S = 2*(272+pad)', S < 2*(oort.r+48)+1 && S >= 2*(pluto.r+48)-1);
  check('Oort is still drawn somewhere in the overview (not removed, just excluded from sizing)', svg.includes('Oort Cloud'));
}

// ---------- transferArc: endpoints match the truthfully-positioned planets ----------
{
  newGame('engineer');
  const cx=500, cy=500;
  const arc=transferArc(cx,cy,'mars');
  const earth=BODIES.find(b=>b.id==='earth');
  const trueAng=map2dAngle('earth', mapViewAbsDay());
  const expX=cx+Math.cos(trueAng)*earth.r, expY=cy+Math.sin(trueAng)*earth.r;
  check('transferArc.from (Earth) matches the live truthful angle', Math.abs(arc.from.x-expX)<0.01 && Math.abs(arc.from.y-expY)<0.01);
  check('transferArc.from does NOT match the old frozen ANGLES.earth (unless coincidentally equal)', ANGLES.earth!==trueAng ? (Math.abs(arc.from.x-(cx+Math.cos(ANGLES.earth)*earth.r))>0.01) : true);
  // destination arc endpoint for a top-level planet also uses the truthful angle
  const mars=BODIES.find(b=>b.id==='mars');
  const trueMarsAng=map2dAngle('mars', mapViewAbsDay());
  const expMX=cx+Math.cos(trueMarsAng)*mars.r, expMY=cy+Math.sin(trueMarsAng)*mars.r;
  check('transferArc.to (Mars) matches the live truthful angle', Math.abs(arc.to.x-expMX)<0.01 && Math.abs(arc.to.y-expMY)<0.01);
}

// ---------- transferArc: a moon destination still resolves through its parent's truthful angle ----------
{
  newGame('engineer');
  const arc=transferArc(500,500,'moon'); // Earth's moon
  check('transferArc to a moon still resolves (parent-relative placement intact)', !!arc);
}

// ---------- canvas size bumped (the "too small" fix) ----------
{
  check('MAP_W bumped from 760 to 980', MAP_W===980);
  check('MAP_H bumped from 480 to 620', MAP_H===620);
  check('aspect ratio preserved (980/620 ≈ 760/480)', Math.abs(MAP_W/MAP_H - 760/480) < 0.01);
}

// ---------- Phaser MapScene: truthful bodies no longer carry a fake continuous spin ----------
// (headless-checkable via the 'truthful' flag set at body creation — the actual Phaser
// create()/update() loop itself needs a real browser, but this locks in the classification logic
// that decides which bodies get truthful-angle treatment vs. keep their decorative spin.)
{
  newGame('engineer');
  const truthfulIds = BODIES.filter(b=>!b.around && typeof ORBITAL_ELEMENTS!=='undefined' && !!ORBITAL_ELEMENTS[b.id]).map(b=>b.id);
  check('mercury through neptune + belt are all truthful-angle candidates', ['mercury','venus','earth','mars','belt','jupiter','saturn','uranus','neptune'].every(id=>truthfulIds.includes(id)));
  check('pluto is NOT a truthful-angle candidate (no orbital elements — keeps decorative spin)', !truthfulIds.includes('pluto'));
  check('moons are NOT truthful-angle candidates (parent-relative, not top-level)', !truthfulIds.includes('moon') && !truthfulIds.includes('phobos'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
