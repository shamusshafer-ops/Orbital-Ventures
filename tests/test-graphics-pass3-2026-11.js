// Graphics pass 3 (2026-11-18): one continuous heightmapped surface for the Cape (land, beach, lagoon and sea),
// a fixed-seed heightmap that is graded flat under the site, Earth curvature out to the horizon, and the site
// furniture / building detail that sits on it. The pure terrain functions are tested numerically; the WebGL
// parts are checked through their source. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
newGame('engineer');

const coastX=CAPE3D_COAST_X, descriptors=capeFacilityDescriptors(), plan=cape3dSitePlan(descriptors,coastX), H=(x,z)=>cape3dTerrainHeight(x,z,plan,coastX,null);

{ // the heightmap: fixed, flat where things are built, varied elsewhere
  check('the heightmap is deterministic (fixed seed, no clock or Math.random)', H(-3000,1200)===H(-3000,1200)&&!/Math\.random|Date\.now|state\./.test(cape3dTerrainHeight.toString()+cape3dNoise2.toString()+cape3dHash2.toString()));
  check('every building and pad sits on exactly the site datum', descriptors.every(d=>Math.abs(H(d.position.x,d.position.z))<1e-6));
  check('…across the whole footprint, not just its centre', descriptors.every(d=>[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]].every(q=>Math.abs(H(d.position.x+q[0]*d.footprint.x,d.position.z+q[1]*d.footprint.z))<1e-6)));
  check('roads are graded flat along their length', cape3dRoadPlan().every(r=>[.1,.5,.9].every(t=>Math.abs(H(r[0].x+(r[1].x-r[0].x)*t,r[0].z+(r[1].z-r[0].z)*t))<1e-6)));
  const samples=[]; for(let i=0;i<40;i++) samples.push(H(-1600-i*37,-900+i*61));
  const min=Math.min(...samples), max=Math.max(...samples);
  check('the ground between and around buildings has real relief (the tile carries the heightmap)', max-min>1.5);
  const far=[]; for(let i=0;i<30;i++) far.push(H(-60000-i*9000,i*7000-100000));
  check('relief grows with distance from the site', Math.max(...far)-Math.min(...far)>max-min);
  check('no lakes or ponds on the site itself', (()=>{ for(let x=-200;x<900;x+=45) for(let z=-150;z<700;z+=45){ if(H(x,z)<CAPE3D_SEA_Y) return false; } return true; })());
  check('no inland lakes beyond 50 km (they would alias into slivers on the coarse far grid)', (()=>{ for(let i=0;i<200;i++){ const x=-60000-i*4000, z=(i%17-8)*30000; if(Math.abs(x-cape3dLagoon(z,coastX).x)<3000) continue; if(H(x,z)<CAPE3D_SEA_Y) return false; } return true; })());
}

{ // the coast: one surface, continuous through the waterline
  const z=-3000, c=cape3dCoastAt(z,coastX);
  check('the sea is below sea level just offshore', H(c+40,z)<CAPE3D_SEA_Y&&H(c+400,z)<H(c+40,z));
  check('the beach is above sea level just inland', H(c-30,z)>CAPE3D_SEA_Y&&H(c-30,z)<CAPE3D_SEA_Y+2.5);
  check('the surface is continuous through the waterline (no step for a seam to hide in)', Math.abs(H(c-.5,z)-H(c+.5,z))<.1);
  let dune=0; for(let x=coastX-60;x>coastX-250;x-=5) dune=Math.max(dune,H(x,z));
  check('a line of dunes stands behind the beach somewhere along the coast', (()=>{ for(let zz=-6000;zz<6000;zz+=300){ const cc=cape3dCoastAt(zz,coastX); for(let x=cc-90;x>cc-170;x-=10) if(H(x,zz)>3.5) return true; } return false; })());
  const L=cape3dLagoon(5000,coastX);
  check('the lagoon is a real basin below sea level', H(L.x,5000)<CAPE3D_SEA_Y-1.5&&H(L.x-L.w*.5-400,5000)>CAPE3D_SEA_Y);
}

{ // curvature: the surface reaches the horizon and meets the globe
  check('no curvature near the site (splashdowns and the near range stay on the datum)', cape3dCurveDrop(0)===0&&cape3dCurveDrop(20000)===0);
  const R=6371000, sphere=d=>R-Math.sqrt(R*R-d*d);
  check('beyond 150 km the drop is the exact sphere', Math.abs(cape3dCurveDrop(400000)-sphere(400000))<1e-6&&Math.abs(cape3dCurveDrop(1500000)-sphere(1500000))<1e-6);
  const horizonAt96km=Math.sqrt(2*R*96000);
  check('the terrain reaches past the horizon at the altitude where the photographic globe takes over', CAPE3D_TERRAIN.extent>horizonAt96km&&cape3dPhysicalAscentBlend(96000).earthOpacity>.99);
  const ax=cape3dTerrainAxis(0,12,1500,60,CAPE3D_TERRAIN.extent);
  check('grid: 12 m over the site, growing geometrically to the full extent', Math.abs((ax[ax.length/2+.5|0]-ax[ax.length/2-.5|0])-12)<1e-9&&ax[ax.length-1]===CAPE3D_TERRAIN.extent&&ax.length<800);
  check('grid spacing never shrinks moving outward', ax.every((v,i)=>i<2||i===ax.length-1||v-ax[i-1]>=ax[i-1]-ax[i-2]-1e-6||ax[i-1]<=0));
  check('splashes follow the curved sea', cape3dUpdateSplash.toString().includes('cape3dCurveDrop')&&cape3dUpdateSplash.toString().includes('CAPE3D_SEA_Y'));
}

{ // the surface replaces the stacked sheets: no transparency, no draw-order or depth-bias tricks
  const build=buildCape3DScene.toString(), mat=cape3dTerrainMaterial.toString(), geo=cape3dTerrainGeometry.toString();
  check('one opaque terrain mesh, no ocean quad, shore strips or decals', build.includes('cape3dTerrain(')&&!/PlaneGeometry\(landscape\./.test(build)&&!build.includes('cape3dShoreline')&&!build.includes('cape3dRegion(root'));
  check('the material is opaque and writes depth', !/transparent:true|depthWrite:false|polygonOffset/.test(mat));
  check('water is wherever the height is below sea level, on a flat sea surface', geo.includes('Math.max(H[k],CAPE3D_SEA_Y)')&&mat.includes('depth=uSea-vTH'));
  check('grass, dune, dry sand, wet sand, surf, shallows and deep water blend per pixel', ['uSandDune','uSandDry','uSandWet','uFoam','uShallow','uDeep'].every(k=>mat.includes(k))&&mat.includes('smoothstep(30.0,210.0,edge)'));
  check('the heightmap shades the ground colour too (hollows dark, crests light)', geo.includes("'aShade'")&&mat.includes('vTS'));
  check('the terrain keeps depth while it fades so its hills still occlude each other', mat.includes('capeKeepDepth=true')&&cape3dApplySiteOpacity.toString().includes('capeKeepDepth'));
  check('the terrain fades with the site during ascent', /siteObjects=\[terrain,roads,facilities,vegetation,extras\]/.test(build));
  check('fine detail fades with distance so the far field does not shimmer', mat.includes('farV')&&mat.includes('smoothstep(20000.0,70000.0,camD)'));
}

{ // site plan, furniture and vegetation
  check('parking lots are placed in open ground, never on a building or road', plan.lots.length>=3&&plan.lots.every(l=>!cape3dSiteBlocked({rects:plan.rects.filter(r=>r!==l),roads:plan.roads},l.x,l.z,0)));
  check('…and are graded flat', plan.lots.every(l=>Math.abs(H(l.x,l.z))<1e-6));
  check('lots stay off the beach', plan.lots.every(l=>coastX-l.x>=160));
  const woods=cape3dRegionWoods(coastX);
  check('3D woods come from the same seeded patches the district map paints', woods.length>40&&cape3dRegionWoods(coastX)[7][0]===woods[7][0]&&cape3dRegionTexture.toString().includes('if(ci<2) woods.push([x,z,r])'));
  const veg=cape3dVegetation.toString();
  check('trees are instanced and kept off buildings, lots, roads, water and the beach', veg.includes('cape3dInstanced(')&&veg.includes('cape3dSiteBlocked(plan')&&veg.includes('CAPE3D_SEA_Y+.3')&&veg.includes('c-x<260'));
  check('only trees inside the shadow box cast shadows', veg.includes("_far'")&&veg.includes('cape3dInstanced(G[k],mat,farL,false)'));
  const det=cape3dFacilityDetail.toString();
  check('buildings get structural bays, a low-bay wing with docks, an entrance and rooftop plant', ['pilasters','low-bay wing','loading docks','entrance','Rooftop plant'].every(k=>det.includes(k)));
  check('pads get a fence, propellant spheres, a flame-trench outlet and a blockhouse', ['fence','LOX and LH2','Flame-trench','blockhouse'].every(k=>det.includes(k)));
  check('static detail is merged into one draw call per material', det.includes('cape3dBatch()')&&det.includes('b.flush(g,true)'));
  check('the facility group calls the detail pass', cape3dFacilityGroup.toString().includes('cape3dFacilityDetail(g,d,materials)'));
  check('the site has a fence, gatehouse, water tower and parked cars', ['Perimeter fence','Gatehouse','Water tower','cape3d_cars'].every(k=>cape3dSiteExtras.toString().includes(k)));
  check('fence posts follow the ground', cape3dSiteExtras.toString().includes('cape3dGroundY(x,z)'));
}

{ // follow-up: depth precision at altitude, and clouds over the whole district
  check('the near plane is 1 m on the pad', cape3dFlightNear(160,80,0)===1);
  check('…grows with altitude so a cloud deck and the ground below stay depth-separated', cape3dFlightNear(400,80,40000)>100&&cape3dFlightNear(400,80,40000)>cape3dFlightNear(400,80,10000));
  check('…never clips the vehicle the camera is framing', cape3dFlightNear(120,100,200000)<=(120-60)*.5&&cape3dFlightNear(60,100,200000)===1);
  check('…is applied by every launch camera and reset afterwards', (cape3dUpdateLaunchPresentation.toString().match(/cape3dApplyFlightNear\(/g)||[]).length>=2&&cape3dExitLaunchPresentation.toString().includes('cape3dRestoreNear()'));
  check('cumulus covers the whole district, not just the site', CAPE3D_CLOUD_FIELD.w>=40000&&CAPE3D_CLOUD_FIELD.d>=40000&&cape3dClouds.toString().includes('c<90'));
  check('clouds drift and wrap round the whole field', cape3dTick.toString().includes('CAPE3D_CLOUD_FIELD')&&cape3dTick.toString().includes('%F.w'));
}

{ // follow-up: weather seen from space
  const shell=cape3dCloudShell.toString(), em=cape3dEarthMaterial.toString();
  check('the ascent and orbit globes each carry a cloud shell above the surface', cape3dAscentWorld.toString().includes('cape3dCloudShell(earth,radius')&&cape3dOrbitWorld.toString().includes('cape3dCloudShell(earth,355')&&CAPE3D_CLOUD_SHELL_LIFT_KM>0);
  check('the shell rides with its globe and shares its sun and fade', shell.includes('earth.add(shell)')&&shell.includes('uSun:u.uSun')&&shell.includes('uOpacity:u.uOpacity'));
  check('weather systems: warped noise with equatorial, subtropical and mid-latitude bands', CAPE3D_CLOUD_SHELL_GLSL.includes('w*1.25')&&(CAPE3D_CLOUD_SHELL_GLSL.match(/exp\(-pow/g)||[]).length===3);
  check('the ground beneath is shaded by the same coverage, and the map clouds thin while the shell is on', em.includes('ovCloudCover(normalize(vObjPos)')&&shell.includes('u.uClouds2.value=.45'));
  const fake={userData:{cloudShells:[{material:{uniforms:{uSeed:{value:0},uCover:{value:0}}}},{material:{uniforms:{uSeed:{value:0},uCover:{value:0}}}}]}};
  let k=0; const seq=[.1,.2,.7,.9]; cape3dRandomiseCloudShells(fake,()=>seq[k++]);
  const a=fake.userData.cloudShells[0].material.uniforms, b=fake.userData.cloudShells[1].material.uniforms;
  check('every launch draws a new sky (seed and coverage) for each globe', a.uSeed.value!==b.uSeed.value&&a.uCover.value>=.46&&b.uCover.value<=.56&&cape3dEnterLaunchPresentation.toString().includes('cape3dRandomiseCloudShells(root)'));
  check('the altitude near plane is reset for the orbit and later phases', cape3dUpdateFlightPresentation.toString().includes('cape3dRestoreNear()'));
}

{ // follow-up: a varied coastline with cliffs in the distance
  const T=CAPE3D_TERRAIN, offs=[]; for(let z=-200000;z<=200000;z+=2500) offs.push(cape3dCoastOffset(z));
  check('the shore is straight beside the site, so the pads keep their beach', [T.siteZ-1500,T.siteZ,T.siteZ+1500].every(z=>cape3dCoastOffset(z)===0)&&descriptors.every(d=>cape3dCoastOffset(d.position.z)===0));
  check('…and bays and headlands of kilometres away from it', Math.max(...offs)-Math.min(...offs)>4000&&offs.some(v=>v>500)&&offs.some(v=>v<-500));
  check('the shore moves smoothly (no jumps between neighbouring points)', (()=>{ for(let z=-40000;z<40000;z+=50) if(Math.abs(cape3dCoastOffset(z+50)-cape3dCoastOffset(z))>60) return false; return true; })());
  let cz=null; for(let z=8000;z<400000&&cz==null;z+=500) if(cape3dCliff(z)>.95) cz=z;
  check('cliffs stand somewhere along the distant coast, never beside the site', cz!=null&&cape3dCliff(T.siteZ)===0&&cape3dCliff(T.siteZ+6000)===0);
  if(cz!=null){ const c=cape3dCoastAt(cz,coastX);
    check('a cliff rises steeply from the water to a plateau', H(c-60,cz)-CAPE3D_SEA_Y>15&&H(c-60,cz)-H(c-2,cz)>12&&H(c+30,cz)<CAPE3D_SEA_Y-2);
    check('the water at the shore is continuous under a cliff too', H(c+.5,cz)<CAPE3D_SEA_Y+.5&&H(c-.5,cz)<CAPE3D_SEA_Y+3); }
  const L=cape3dLagoon(30000,coastX);
  check('the lagoon follows the shore', Math.abs((cape3dCoastAt(30000,coastX)-L.x)-(5200-900*Math.sin(30000/5200)-480*Math.sin(30000/1700+1)))<1e-6);
  check('the shader reads the local shore distance, not a fixed line', cape3dTerrainMaterial.toString().includes('float dc=vTC')&&cape3dTerrainGeometry.toString().includes("'aCoast'"));
  check('district roads and the missile row follow the shore', cape3dRegionTexture.toString().includes('cape3dCoastAt(z,coastX)-7050')&&cape3dRegionTexture.toString().includes('px=cz-190'));
  check('no beach on cliff tops; trees stay off the bare rock', cape3dTerrainMaterial.toString().includes('smoothstep(11.0,18.0,vTH)')&&cape3dVegetation.toString().includes('cape3dCliff(z)>.2'));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
