// Graphics pass (2026-11-15): Cape sky/facades/night lighting/shoreline/smoke, base terrain,
// part-diagram hulls. Appended after harness.js + build/game.js. THREE is not available headlessly,
// so scene construction is asserted through pure helpers and the builders' own source.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

newGame('engineer');

{ // the Cape opens on a bright frame, not the dimmest dawn keyframe (also what reduced-motion holds)
  const open=skyAtmosphere(CAPE3D_SKY_START_SEC), dawn=skyAtmosphere(0);
  check('opening sky frame is well lit', open.sunA>=.8);
  check('opening sky frame is brighter than the old dawn start', open.sunA>dawn.sunA);
  check('opening frame sits inside one day cycle', CAPE3D_SKY_START_SEC>0&&CAPE3D_SKY_START_SEC<SKY_CYCLE_SEC);
  check('both motion paths start from the same offset', (cape3dTick.toString().match(/CAPE3D_SKY_START_SEC\+/g)||[]).length===2);
}

{ // sky dome: must draw first and opaque, or it washes over the whole site (regression seen while building it)
  const src=cape3dSkyDome.toString();
  check('sky dome is not in the transparent pass', !/transparent\s*:\s*true/.test(src));
  check('sky dome ignores depth and draws before the site', src.includes('depthTest:false')&&src.includes('depthWrite:false')&&src.includes('renderOrder=-10'));
  check('sky dome blends to space through a uniform, not alpha', src.includes('mix(space,c,fade)'));
  check('sky dome output is colour-space converted like the fog', src.includes('colorspace_fragment'));
  const tick=cape3dTick.toString();
  check('tick fades the dome with the space mix and hides it on reentry', tick.includes('reentryP!=null?0:1-spaceMix'));
  check('tick keeps the dome centred on the camera', tick.includes('dome.position.copy(cape3d.camera.position)'));
}

{ // facades and lighting respond to night
  const tick=cape3dTick.toString(), group=cape3dFacilityGroup.toString(), build=buildCape3DScene.toString();
  check('facility walls use facade materials on the four sides', group.includes('[sideX,sideX,roof,roof,sideZ,sideZ]'));
  check('facade materials are collected for the night pass', cape3dFacadeMaterial.toString().includes('materials.facades')&&build.includes('root.userData.facadeMaterials=materials.facades'));
  check('window glow is driven by night', /facadeMaterials\.forEach/.test(tick)&&tick.includes('Math.pow(night,2.4)'));
  check('roofline accent is driven by night', tick.includes('accentMaterial.emissiveIntensity'));
  check('lamps carry a physical-units boost', tick.includes('(l.boost||1)')&&cape3dPracticalLights.toString().includes('boost:')&&cape3dStreetLights.toString().includes('boost:'));
  check('every facility wall type has a colour', ['vab','lab','prod','admin','control'].every(t=>Number.isFinite(CAPE3D_FACILITY_WALL[t])));
  const usedTypes=ISO_BUILDINGS.map(b=>b.type).filter(t=>!['pad','rivalpad','dishes','dome'].includes(t));
  check('no building type falls through to the default wall colour', usedTypes.every(t=>t in CAPE3D_FACILITY_WALL));
}

{ // shoreline is part of the site so it fades with it during ascent
  const build=buildCape3DScene.toString();
  /* graphics pass 3: the shoreline is drawn by the single terrain surface (see test-graphics-pass3-2026-11.js) */
  check('the coast (land, beach and sea) is one terrain surface', build.includes('cape3dTerrain(root,plan,coastX,origin')&&typeof cape3dShoreline==='undefined');
  check('the terrain fades with the rest of the site', /siteObjects=\[terrain,roads,facilities,vegetation,extras\]/.test(build));
  check('pads and aprons use slab concrete, roads keep the pavement albedo', /concrete:new THREE\.MeshStandardMaterial\(\{color:0xc8c0af,map:concreteTx/.test(build)&&/road:new THREE\.MeshStandardMaterial\(\{color:0x344047,map:pavementTx/.test(build));
}

{ // ground smoke: soft billows sized to the vehicle; the strength profile is unchanged
  const make=cape3dGroundSmoke.toString(), upd=cape3dUpdateGroundSmoke.toString();
  check('smoke puffs are sprites, not lit spheres', make.includes('THREE.Sprite(')&&!make.includes('SphereGeometry'));
  check('smoke is sized from the rocket height, not its plume bounds', upd.includes('userData.totalHeight')&&!upd.includes('Box3'));
  const ign=cape3dGroundSmokeProfile('pad',.8,.8), coast=cape3dGroundSmokeProfile('suborbital',.1,1);
  check('smoke profile still builds on the pad and clears after ascent', ign.strength>.5&&coast.strength===0);
}

{ // base surface
  const src=assembly3dBuildBase.toString();
  check('base ground is textured regolith', src.includes('assembly3dRegolithTexture(mars)'));
  check('base terrain extends past the old 84x58 slab', src.includes('PlaneGeometry(360,360')&&!src.includes('PlaneGeometry(84,58'));
  check('build zone height formula is untouched near the centre', src.includes("(rnd()-.5)*(mars?.42:.24)*(0.25+edge)"));
  check('Mars sky matches its haze colour', (src.match(/0xa8683f/g)||[]).length>=2);
}

{ // part diagram
  const r=renderBuildSVG(benchBuild(),260,420,true);
  check('part diagram renders', r&&!r.error&&typeof r.svg==='string');
  const svg=(r&&r.svg)||'';
  check('hull gradient is defined and used', svg.includes('id="partHull"')&&svg.includes('url(#g-'));
  check('blueprint grid backs the diagram', svg.includes('id="partGrid"')&&svg.includes('fill="url(#partGrid)"'));
  check('tanks are no longer flat category-grey', !svg.includes('stop-color="#8a97a3"'));
  check('stage label is outlined so it reads over a light hull', /paint-order="stroke"[^>]*>S1 /.test(svg));
  check('diagram still reports real stage numbers', /S1 · \d+ m\/s · TWR \d/.test(svg));
  check('category colours are kept for palette names', PART_CAT_COLOR.propulsion==='#d0563a'&&PART_CAT_COLOR.structural==='#8a97a3');
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
