// Graphics pass 2 (2026-11-16): vehicle realism + regional land map. Appended after harness.js +
// build/game.js. THREE is not available headlessly, so geometry is asserted through the pure
// helpers and the builders' own source; the invariants that staging depends on are checked directly.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

newGame('engineer');

{ // every launch-capable engine maps to a hull style drawn by the texture builder
  const launchEngines=Object.values(ENGINES).filter(e=>!e.transferOnly).map(e=>e.id), styles=['v2','saturn','cryo','steel','titan','solid','white'];
  check('every launch engine has a hull style', launchEngines.every(id=>id in CAPE3D_ENGINE_HULL));
  check('hull styles are all known to the texture builder', Object.values(CAPE3D_ENGINE_HULL).every(s=>styles.includes(s)));
  check('no stale engine ids in the hull map', Object.keys(CAPE3D_ENGINE_HULL).every(id=>id in ENGINES));
  check('unknown engines fall back to plain white', cape3dHullStyle('nope')==='white'&&cape3dHullStyle('')==='white');
  check('A-4 flies the roll pattern, F-1/H-1 the Saturn stripes', cape3dHullStyle('a4')==='v2'&&cape3dHullStyle('f1_class')==='saturn'&&cape3dHullStyle('kerolox_mk3')==='saturn');
  check('solids get segmented casings, hydrolox gets frost', cape3dHullStyle('solid_srb')==='solid'&&cape3dHullStyle('hydrolox_up')==='cryo');
  const tex=cape3dHullTexture.toString();
  check('each non-default style has a painter', ['v2','saturn','cryo','steel','titan','solid'].every(s=>tex.includes("style==='"+s+"'")));
  check('lettering is pre-squashed by the barrel aspect', tex.includes('ctx.scale(1/asp,1)'));
}

{ // staging invariants: the mesh must keep the exact stack geometry the flight code reads
  const src=cape3dVehicleMesh.toString();
  check('stage heights and radii still come from the shared shape', src.includes('h=s.h*scale')&&src.includes('r=Math.max(2.4,s.w*scale*.5)'));
  check('stack advances by the full stage height', /stageGroups\.push\(\{index:i, group:sg, baseY:y, topY:y\+h,/.test(src)&&src.includes('y+=h;'));
  check('interstage is carved out of the stage, not added to it', src.includes('bodyH=h-adapterH'));
  check('nozzle plane is unchanged', src.includes('nozzleY=-10')&&src.includes('g.userData.nozzleY=nozzleY'));
  check('rocket still reports the data staging and smoke read', ['stageGroups=stageGroups','boosterGroup=boosterGroup','totalHeight=y','vehicleVisualKey','coreStageCount','boosterCount'].every(k=>src.includes(k)));
  check('stage groups are never scaled as a side effect', !/sg\.add\([^;]*\)\.scale/.test(src));
  check('hull metalness stays low without an environment map', !/metalness:\.7/.test(src));
  check('control flaps only on methane super-heavies', src.includes('profile.flaps&&methane'));
}

{ // the detail vocabulary
  const src=cape3dVehicleMesh.toString();
  check('launch-escape tower on crewed stacks', src.includes('launch-escape tower')&&src.includes('towerBase'));
  check('open hot-staging truss under kerosene/storable uppers', src.includes('const lattice=')&&src.includes('/^(kerolox|vernier|hyper)/'));
  check('ullage motors and antennas on upper stages', src.includes('ullage'));
  check('systems tunnel and feedline', src.includes('tunnel=')&&src.includes('feed='));
  check('Saturn engine fairings and stub fins', src.includes("engineId==='f1_class'||engineId==='kerolox_mk3'"));
  check('R-7 pattern liquid strap-ons lean into the core', src.includes('one.rotation.z=lean'));
  check('segmented solids have field joints and a flared skirt', src.includes("hullMat('solid')"));
  check('bells use a nozzle contour', src.includes('cape3dBellGeometry(bellR)')&&cape3dBellGeometry.toString().includes('LatheGeometry'));
  check('five-engine clusters put one engine in the centre', src.includes('engineCount>=5&&engineCount%2===1'));
  check('sounding fins still use the shared profile', src.includes('rocketTailFinProfile')&&src.includes("finStyle='tapered-cruciform'"));
}

{ // regional land map (graphics pass 3: painted into the terrain shader instead of two decal sheets)
  const R=CAPE3D_REGION, tex=cape3dRegionTexture.toString(), build=buildCape3DScene.toString(), mat=cape3dTerrainMaterial.toString();
  check('region is larger than the site but far smaller than the terrain', R.width>6000&&R.width<CAPE3D_TERRAIN.extent&&R.depth<CAPE3D_TERRAIN.extent);
  const site=ISO_BUILDINGS.map(b=>capeWorldPoint(b.gx,b.gy)), inside=p=>Math.pow((p.x-R.siteX)/(R.holeX*.74),2)+Math.pow((p.z-R.siteZ)/(R.holeZ*.74),2)<1;
  check('every authored facility sits inside the fully masked centre', site.every(inside));
  check('region is masked at the site and faded at its outer edges', tex.includes("destination-out")&&tex.includes('createRadialGradient(0,0,0,0,0,1)')&&(tex.match(/createLinearGradient/g)||[]).length===4); /* four edges since the coast meanders (graphics pass 3) */
  check('district features are drawn', ['lagoon','missile row','skid strip','town','highway'].every(k=>tex.includes(k)));
  check('both district resolutions are sampled by the terrain shader', build.includes('fine:false')&&build.includes('fine:true')&&mat.includes('uRegionA')&&mat.includes('uRegionB'));
  check('causeway meets the site avenue', build.includes('capeWorldPoint(0,ISO_AV).z'));
  check('the lagoon basin and the painted lagoon share one shape', tex.includes('cape3dLagoon(z,coastX)')&&cape3dTerrainHeight.toString().includes('cape3dLagoon(z,coastX)'));
}

{ // follow-up (owner feedback): fixed district, lighter haze, no waterline flicker
  const tex=cape3dRegionTexture.toString(), build=buildCape3DScene.toString();
  check('district is the same every launch: one fixed seed, no clock or Math.random', tex.includes('mulberry(R.seed)')&&!/Math\.random|Date\.now|state\./.test(tex)&&Number.isFinite(CAPE3D_REGION.seed));
  check('features are generated over the whole district whatever rectangle is drawn', tex.includes('gx0+rnd()*R.width')&&tex.includes('gz0+rnd()*R.depth'));
  check('near layer still contains the masked site', CAPE3D_REGION.nearWidth>CAPE3D_REGION.holeX*2&&CAPE3D_REGION.nearDepth>CAPE3D_REGION.holeZ*2);
  check('haze is lighter than the old .00038 but still present', CAPE3D_HAZE>0&&CAPE3D_HAZE<=.00015);
  check('idle and ascent haze share the constant', cape3dPhysicalAscentBlend(0).fogDensity===CAPE3D_HAZE&&cape3dTick.toString().includes('CAPE3D_HAZE'));
  check('no stacked ocean/shore/decal sheets left to z-fight', !/PlaneGeometry\(landscape\./.test(build)&&typeof cape3dRegion==='undefined'&&typeof cape3dShoreline==='undefined'&&!build.includes('polygonOffset'));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
