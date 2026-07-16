// E1.8 C — surface-only base modules. Validates: the 4 new modules exist with surface:true and sane
// shape; palette filtering (orbital bench hides surface modules, surface bench hides orbital-only
// Node but keeps shared modules); and the three acquire-gates (dock/contract/fly) all reject
// incompatible module/facility pairs via the shared moduleFacilityCompatible predicate.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };

newGame('engineer');

const SURFACE_IDS=['isru_plant','reactor_pad','hab_dome','rover_garage'];

// ---------- 1. Definitions ----------
for(const id of SURFACE_IDS){
  const md=stationModuleDef(id);
  check('def: '+id+' exists', !!md);
  check('def: '+id+' flagged surface:true', md && md.surface===true);
  check('def: '+id+' has prod + stats', md && md.prod && md.stats && typeof md.stats.mass==='number');
}
check('def: existing orbital modules are NOT surface-flagged', !stationModuleDef('can_std').surface && !stationModuleDef('lab_mod').surface);

// ---------- 2. Compatibility predicate ----------
{
  const earth={body:'earth'}, moon={body:'moon'}, mars={body:'mars'};
  const isru=stationModuleDef('isru_plant'), node=stationModuleDef('node_hub'), hab=stationModuleDef('can_std');
  check('compat: surface module on surface base ok', moduleFacilityCompatible(moon, isru).ok);
  check('compat: surface module on orbital station rejected', !moduleFacilityCompatible(earth, isru).ok);
  check('compat: orbital Node on surface base rejected', !moduleFacilityCompatible(mars, node).ok);
  check('compat: shared module (Habitat) ok on both', moduleFacilityCompatible(earth, hab).ok && moduleFacilityCompatible(moon, hab).ok);
  check('compat: shared module (Lab) ok on surface', moduleFacilityCompatible(mars, stationModuleDef('lab_mod')).ok);
}

// ---------- 3. Palette filtering ----------
{
  // orbital bench (leo_station)
  state.facilities={leo_station:{built:true, moduleList:['can_std'], supply:6}};
  state.stationFocus='leo_station';
  const orbCur={def:facilityById('leo_station'), fs:state.facilities.leo_station};
  const orbPal=renderStationPalette(orbCur);
  check('palette: orbital bench hides ISRU plant', !orbPal.includes('ISRU Plant'));
  check('palette: orbital bench hides Habitat Dome', !orbPal.includes('Habitat Dome'));
  check('palette: orbital bench shows Docking Node', orbPal.includes('Docking Node'));
  check('palette: orbital bench shows shared Lab', orbPal.includes('Research Laboratory'));

  // surface bench (mars_base)
  state.facilities={mars_base:{built:true, moduleList:['can_std'], supply:6}};
  state.baseFocus='mars_base';
  const surCur={def:facilityById('mars_base'), fs:state.facilities.mars_base};
  const surPal=renderStationPalette(surCur);
  check('palette: surface bench shows ISRU Plant', surPal.includes('ISRU Plant'));
  check('palette: surface bench shows Rover Garage', surPal.includes('Rover Garage'));
  check('palette: surface bench hides orbital-only Docking Node', !surPal.includes('Docking Node'));
  check('palette: surface bench keeps shared Habitat', surPal.includes('Pressurized Habitat'));
  check('palette: surface bench keeps shared Greenhouse', surPal.includes('Greenhouse'));
}

// ---------- 4. Gates reject incompatible pairs ----------
{
  newGame('engineer');
  // satisfy research so reqResearch isn't the blocker we trip on
  state.research.lunar_isru=true; state.research.surface_fission_power=true;
  state.money=1000;
  state.completed.mars_orbit=true; state.rep=500;
  foundFacility('mars_base');
  state.completed.crew_orbit=true;
  foundFacility('leo_station');

  // surface module -> orbital station: all three gates reject
  check('gate dock: ISRU rejected on orbital station', !canAddStationModule('leo_station','isru_plant').ok);
  check('gate contract: ISRU rejected on orbital station', !canContractStationModule('leo_station','isru_plant').ok);
  check('gate fly: ISRU rejected on orbital station', !canFlyModuleDelivery('leo_station','isru_plant').ok);
  // surface module -> surface base: accepted (research satisfied, affordable)
  check('gate dock: ISRU accepted on mars_base', canAddStationModule('mars_base','isru_plant').ok);
  // orbital Node -> surface base: rejected
  check('gate dock: Node rejected on mars_base', !canAddStationModule('mars_base','node_hub').ok);
  // shared module fine on surface
  check('gate dock: Lab accepted on mars_base', canAddStationModule('mars_base','lab_mod').ok);
}

// ---------- 5. Surface SVG renders the new wide modules without throwing ----------
{
  newGame('engineer');
  state.facilities={lunar_base:{built:true, moduleList:['can_std','isru_plant','reactor_pad','hab_dome','rover_garage'], supply:6}};
  state.baseFocus='lunar_base';
  let threw=false;
  try{ renderBaseSurfaceSVG(720,300, baseCurrentView().cur, false); }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('svg: renders a base full of surface modules without throwing', !threw);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
