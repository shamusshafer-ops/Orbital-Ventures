// Solar Map D3a (2026-07-25) — body roster rail + body-name label LOD. Lighter-tier wiring slice:
// reuses mapAssetModel/bodyPlan (D1) for roster tiering and the D2-established LOD fade pattern for
// moon labels, rather than inventing new mechanisms.
//
// The roster answers "where is everything" directly (a left rail listing every navigable body,
// grouped reached/available/locked/future, click to focus) rather than requiring the player to spot
// a dot on a screen the camera may not currently be pointed at. It's a plain DOM sidebar, not a
// 3D/Phaser/SVG-specific overlay, so it's identical across all three renderer paths — tested here
// purely at the model level (mapRosterBodies/mapRosterTier/mapRosterModel), which is renderer-agnostic
// by construction.
//
// Label LOD: every one of the 12 decorative moons got a full-scale name sprite regardless of camera
// distance ("label mush" per the review) — this fades them out zoomed out, using the exact numeric
// pattern D2 already established for the AU ruler. Only the pure fade function (map3dMoonLabelOpacity)
// is testable here; the THREE.js material/visibility writes (map3dUpdateLabelLOD) are NOT covered —
// no WebGL in this sandbox, same caveat as every other map3d* renderer function. NOT browser-verified.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- mapRosterBodies: membership rule ----------
{
  const ids=mapRosterBodies().map(b=>b.id);
  check('earth is excluded (handled separately as the pinned Home row)', ids.indexOf('earth')<0);
  check('bodies with their own missions are included: moon', ids.indexOf('moon')>=0);
  check('bodies with their own missions are included: mars/belt/jupiter/saturn/titan/oort',
    ['mars','belt','jupiter','saturn','titan','oort'].every(id=>ids.indexOf(id)>=0));
  check('top-level planets with no missions yet are still included (navigable, "no content yet")',
    ['mercury','venus','uranus','neptune','pluto'].every(id=>ids.indexOf(id)>=0));
  check('decorative moons with no distinct missions are excluded (reached via their parent instead)',
    ['phobos','deimos','io','europa','ganymede','callisto','rhea','iapetus','titania','oberon','triton','charon']
      .every(id=>ids.indexOf(id)<0));
  check('no duplicates', ids.length===new Set(ids).size);
}

// ---------- mapRosterTier: precedence and correctness ----------
{
  newGame('engineer');
  const model0=mapAssetModel();
  check('a fresh game: mercury/venus (no missions) tier as future', mapRosterTier(BODIES.find(b=>b.id==='mercury'),model0)==='future');
  check('a fresh game: moon (has missions, none flyable yet) tiers as locked', mapRosterTier(BODIES.find(b=>b.id==='moon'),model0)==='locked');

  state.completed.luna_flyby=true; // a real completed mission whose body resolves to the Moon
  const model1=mapAssetModel();
  check('reached takes precedence once a mission there is completed', mapRosterTier(BODIES.find(b=>b.id==='moon'),model1)==='reached');

  // available: rep/research high enough AND the tracking-network gate cleared (mars_flyby is a
  // .profile mission, which needsTrackingNetwork() requires regardless of rep) — for a body with
  // nothing completed there yet.
  newGame('engineer');
  state.rep=2000; RESEARCH.forEach(r=>state.research[r.id]=true); state.trackingStations=['goldstone'];
  const model2=mapAssetModel();
  const marsTier=mapRosterTier(BODIES.find(b=>b.id==='mars'),model2);
  check('with every gate cleared and nothing completed there, mars tiers as available (not locked/future)', marsTier==='available');
}

// ---------- mapRosterModel: every roster body appears in exactly one group ----------
{
  newGame('engineer');
  state.completed.luna_flyby=true;
  const g=mapRosterModel();
  const all=[].concat(g.reached,g.available,g.locked,g.future);
  const allIds=all.map(b=>b.id);
  const rosterIds=mapRosterBodies().map(b=>b.id);
  check('every roster body appears exactly once across the four groups', allIds.length===rosterIds.length && new Set(allIds).size===allIds.length);
  check('the moon (completed) landed in "reached" and nowhere else',
    g.reached.some(b=>b.id==='moon') && !g.locked.some(b=>b.id==='moon') && !g.available.some(b=>b.id==='moon') && !g.future.some(b=>b.id==='moon'));
  check('every roster body from mapRosterBodies is accounted for', rosterIds.every(id=>allIds.indexOf(id)>=0));
}

// ---------- mapRosterHTML: renders every roster body + Earth, no NaN/undefined, selection reflected ----------
{
  newGame('engineer');
  const html=mapRosterHTML();
  check('Earth (Home row) appears', html.indexOf('Earth')>=0);
  check('every roster body\'s name appears in the HTML', mapRosterBodies().every(b=>html.indexOf(esc(b.name))>=0));
  check('no NaN/undefined leaks into the roster markup', html.indexOf('NaN')<0 && html.indexOf('undefined')<0);
  check('group headings show a non-zero count for at least one populated tier', /\(\d+\)/.test(html));

  state.selectedBody='mars';
  const htmlSel=mapRosterHTML();
  const marsRow=htmlSel.split('\n').find(l=>l.indexOf("mapRosterSelect('mars')")>=0);
  check('the selected body\'s row carries the "sel" class', !!marsRow && marsRow.indexOf('sel')>=0);
  const earthRow=htmlSel.split('\n').find(l=>l.indexOf("mapRosterSelect('earth')")>=0);
  check('a non-selected row (Earth, while Mars is selected) does not carry "sel"', !!earthRow && earthRow.indexOf(' sel"')<0);
}

// ---------- map3dMoonLabelOpacity: the LOD fade curve ----------
{
  check('fully visible at/below the fade-start distance', map3dMoonLabelOpacity(10)===1 && map3dMoonLabelOpacity(MAP3D_MOON_LABEL_FADE_START)===1);
  check('fully hidden at/above the fade-end distance', map3dMoonLabelOpacity(MAP3D_MOON_LABEL_FADE_END)===0 && map3dMoonLabelOpacity(500)===0);
  check('exactly half-faded at the midpoint', Math.abs(map3dMoonLabelOpacity((MAP3D_MOON_LABEL_FADE_START+MAP3D_MOON_LABEL_FADE_END)/2)-0.5)<1e-9);
  check('monotonically decreasing with distance (never flickers back up)',
    map3dMoonLabelOpacity(45)>map3dMoonLabelOpacity(60) && map3dMoonLabelOpacity(60)>map3dMoonLabelOpacity(75));
  check('never leaves the [0,1] range for extreme input', map3dMoonLabelOpacity(-50)<=1 && map3dMoonLabelOpacity(-50)>=0 && map3dMoonLabelOpacity(1e6)>=0);
  check('the AU ruler\'s own LOD threshold (45, from D2) sits inside the moon-label fade band, not outside it — the two LODs read as one coherent zoom story rather than two unrelated cutoffs',
    45>=MAP3D_MOON_LABEL_FADE_START && 45<=MAP3D_MOON_LABEL_FADE_END);
}

console.log(`map3d-roster: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
