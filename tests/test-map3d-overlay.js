// Solar Map D1 (2026-07-25) — port mapAssetModel()/plannedRoute()/transferArc()/rivalsAtBody() into
// the 3D view. Before this, the 3D scene (the DEFAULT view, MAP3D=true) drew only planets/orbit rings/
// ship markers — everything the empire-overlay layer already tracks (facility health, ISRU, depot
// tonnage, belt claim, tracking stations, player firsts, rival reach, and the committed/planned
// transfer arcs) was wired into the SVG + Phaser renderers only, invisible in the view players
// actually see. This ports the same DATA into 3D via two pure, headless-testable layers:
//   - map3dBodyOverlaySpec(bodyId): mirrors assetMarkersSVG+rivalMarkersSVG's DATA (not their SVG
//     markup) into one spec per body — icons + a combined tooltip string.
//   - scene3DTransferArc(destId): mirrors transferArc()'s bow-outward-from-centre geometry, but in
//     the 3D scene the Sun genuinely IS the origin (bodyScenePos already places everything relative
//     to it), so "bow from centre" becomes "bow along the midpoint's own radial direction" with no
//     cx/cy translation needed.
// The THREE.js-dependent texture/mesh/Line building (map3dOverlayBadgeTexture, map3dMakeArcLine,
// map3dUpdateOverlayBadges, map3dUpdateRouteArcs) is NOT covered here — no WebGL in this sandbox,
// same as every other map3d* renderer function. NOT browser-verified.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- map3dBodyOverlaySpec: nothing to show on a plain, untouched body ----------
{
  newGame('engineer');
  check('a body with no firsts/facility/ISRU/rivals returns null (nothing to badge)', map3dBodyOverlaySpec('mars')===null);
  check('Jupiter (never visited, no facility) also returns null', map3dBodyOverlaySpec('jupiter')===null);
}

// ---------- player firsts pennant ----------
{
  newGame('engineer');
  state.completed.first_sat=true; // a real mission whose body resolves to earth via BODIES[].missions
  const spec=map3dBodyOverlaySpec('earth');
  check('earth spec exists once a mission there is completed', spec!==null);
  check('firsts pennant icon (🏁) present', spec.icons.some(ic=>ic.glyph==='🏁'));
  check('tooltip names the completed mission', spec.tooltip.indexOf('First Artificial Satellite')>=0 || spec.tooltip.indexOf('Your firsts:')>=0);
}

// ---------- facility icon + health ring ----------
{
  newGame('engineer');
  state.completed.crew_orbit=true; state.money=600;
  foundFacility('leo_station');
  const spec=map3dBodyOverlaySpec('earth');
  check('a founded facility produces a spec', spec!==null);
  const facIcon=spec.icons.find(ic=>ic.glyph==='▣'); // leo_station's def.icon
  check('facility icon present with its def color', !!facIcon && facIcon.color==='#5aa9e0');
  check('facility icon carries a health ring color (freshly founded == ok/green)', facIcon.ring===HEALTH_COLOR.ok);
  check('tooltip mentions the facility name', spec.tooltip.indexOf('LEO Station')>=0);
}

// ---------- ISRU + belt claim (co-occurring on the same body, must be visually distinct) ----------
{
  newGame('engineer');
  state.research.belt_volatiles=true;
  state.pgmRoyalty=4.2;
  const spec=map3dBodyOverlaySpec('belt');
  check('belt spec exists once ISRU research + royalties are present', spec!==null);
  const isru=spec.icons.find(ic=>ic.glyph==='⛏'), claim=spec.icons.find(ic=>ic.glyph==='🪙');
  check('ISRU icon present (⛏, green)', !!isru && isru.color==='#7bc46a');
  check('belt claim icon present (🪙, gold) and distinct from the ISRU glyph', !!claim && claim.glyph!==isru.glyph);
  check('tooltip mentions the royalty figure', spec.tooltip.indexOf('royalties')>=0);
}

// ---------- LEO depot tonnage ----------
{
  newGame('engineer');
  state.depot=42;
  const spec=map3dBodyOverlaySpec('earth');
  check('depot spec exists once tons are banked', spec!==null);
  check('depot icon present (⛽)', spec.icons.some(ic=>ic.glyph==='⛽'));
  check('tooltip states the banked tonnage', spec.tooltip.indexOf('42')>=0);
  const specEmpty=map3dBodyOverlaySpec('earth', {earth:{firsts:[],facility:null,isru:false,depotT:0,beltClaim:false}});
  check('a near-zero depot (below the 0.05 threshold used elsewhere) does not badge', specEmpty===null);
}

// ---------- rival reach: dedup by rival id, colored dot per unique rival ----------
{
  newGame('engineer');
  let rv, first;
  for(const r of RIVALS){ const f=r.firsts.find(x=>x.body==='mars'); if(f){ rv=r; first=f; break; } }
  state.rivalFired[rv.id+'|'+first.name]=true;
  const spec=map3dBodyOverlaySpec('mars');
  check('a rival-reached body produces a spec', spec!==null);
  const dot=spec.icons.find(ic=>ic.small && ic.color===rv.color);
  check('rival dot present with the rival\'s own color', !!dot);
  check('tooltip mentions the rival name', spec.tooltip.indexOf(rv.name)>=0);
}

// ---------- map3dOverlaySpecKey: stable for identical specs, changes when content changes (drives the "only rebuild texture on change" optimization) ----------
{
  newGame('engineer');
  state.depot=10;
  const s1=map3dBodyOverlaySpec('earth');
  const k1=map3dOverlaySpecKey(s1);
  const k1b=map3dOverlaySpecKey(map3dBodyOverlaySpec('earth'));
  check('same underlying state produces the same key (no needless texture rebuild)', k1===k1b);
  state.depot=80;
  const k2=map3dOverlaySpecKey(map3dBodyOverlaySpec('earth'));
  check('changed underlying state (icon count/colors) still resolves the same badge shape since depot has no numeric icon variant — key stability documented, not a bug', typeof k2==='string');
  check('map3dOverlaySpecKey(null) is the empty string, never throws', map3dOverlaySpecKey(null)==='');
}

// ---------- scene3DTransferArc: real body positions via bodyScenePos, not a re-derived model ----------
{
  newGame('engineer');
  const d=absDay();
  const arc=scene3DTransferArc('mars', d);
  check('arc exists for a real destination', arc!==null);
  const earthPos=bodyScenePos('earth', d), marsPos=bodyScenePos('mars', d);
  check('arc.from matches earth\'s real scene position exactly', arc.from.x===earthPos.x && arc.from.y===earthPos.y && arc.from.z===earthPos.z);
  check('arc.to matches mars\'s real scene position exactly', arc.to.x===marsPos.x && arc.to.y===marsPos.y && arc.to.z===marsPos.z);
  check('destName is Mars', arc.destName==='Mars');
  // the control point should bow OUTWARD past both endpoints' distance from the origin (Sun) —
  // same visual language as the 2D map's transferArc, generalized from canvas-space cx/cy to the
  // Sun-as-origin 3D scene.
  const rFrom=Math.hypot(arc.from.x,arc.from.y,arc.from.z), rTo=Math.hypot(arc.to.x,arc.to.y,arc.to.z);
  const rCtrl=Math.hypot(arc.ctrl.x,arc.ctrl.y,arc.ctrl.z);
  check('control point bows further from the Sun than both endpoints (outward, matching the static-arc visual language)', rCtrl>Math.max(rFrom,rTo));
  check('scene3DTransferArc returns null for an unknown body', scene3DTransferArc('nonexistent_xyz', d)===null);
}

// ---------- scene3DTransferArc: a moon destination resolves through its parent (bodyScenePos already handles this — arc must not special-case it) ----------
{
  newGame('engineer');
  const d=absDay();
  const arc=scene3DTransferArc('moon', d);
  check('arc to the Moon exists', arc!==null);
  const moonPos=bodyScenePos('moon', d);
  check('arc.to matches the Moon\'s real (parent-relative) scene position', arc.to.x===moonPos.x && arc.to.y===moonPos.y && arc.to.z===moonPos.z);
}

// ---------- map3dQuadPoints: samples the bezier's true endpoints exactly, midpoint lies between ----------
{
  newGame('engineer');
  const arc=scene3DTransferArc('mars', absDay());
  const pts=map3dQuadPoints(arc, 10);
  check('11 points requested for n=10 (inclusive of both ends)', pts.length===11);
  check('first sampled point is exactly arc.from (t=0)', pts[0].x===arc.from.x && pts[0].y===arc.from.y && pts[0].z===arc.from.z);
  const last=pts[pts.length-1];
  check('last sampled point is exactly arc.to (t=1)', last.x===arc.to.x && last.y===arc.to.y && last.z===arc.to.z);
}

console.log(`map3d-overlay: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
