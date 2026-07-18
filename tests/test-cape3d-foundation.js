// Cape 3D Slice A: all scene data remains pure and the dormant flag cannot disturb the proven Cape.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; }else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name,Math.abs(a-b)<=tol); }

newGame('engineer');

check('CAPE3D is enabled for browser visual validation', CAPE3D===true);
check('Cape world tile remains a meaningful site-plan scale', CAPE_WORLD_TILE_M===120);
check('Cape facility layout uses the requested 15% spatial spread', CAPE3D_SITE_SPREAD===1.15);
check('Cape vertical conversion remains positive', CAPE_WORLD_HEIGHT_M_PER_PX>0);
check('Cape material maps are local project assets', CAPE3D_TEXTURE_ASSET.ground==='assets/cape-ground-albedo.png'&&CAPE3D_TEXTURE_ASSET.pavement==='assets/cape-pavement-albedo.png');

{
  const p=capeWorldPoint(2.5,-1.25,18);
  near(p.x,345,1e-9,'grid x converts to world x with the Cape spread');
  near(p.y,18,1e-9,'elevation becomes world y');
  near(p.z,-172.5,1e-9,'grid y converts to world z with the Cape spread');
}

{
  const eye=cape3dCameraEye({x:10,y:20,z:30},0,Math.PI/4,100);
  near(eye.x,10+100*Math.SQRT1_2,1e-8,'Cape camera eye applies horizontal orbit distance');
  near(eye.y,20+100*Math.SQRT1_2,1e-8,'Cape camera eye applies vertical orbit distance');
  near(eye.z,30,1e-8,'Cape camera eye preserves target z at azimuth zero');
}

{
  const ds=capeFacilityDescriptors();
  check('every ISO building receives exactly one 3D facility descriptor', ds.length===ISO_BUILDINGS.length && ds.every((d,i)=>d.key===ISO_BUILDINGS[i].key));
  check('every descriptor has positive world footprint and height', ds.every(d=>d.footprint.x>0&&d.footprint.z>0&&d.height>0));
  check('a descriptor anchor is directly above its facility position', ds.every(d=>d.anchor.x===d.position.x&&d.anchor.z===d.position.z&&d.anchor.y===d.height));
  const vab=ds.find(d=>d.key==='mfg');
  check('VAB descriptor uses the existing dynamic VAB height', vab.height===isoVAB_h()*CAPE_WORLD_HEIGHT_M_PER_PX);
}

check('Three-less harness cannot start the dormant 3D Cape', cape3dAvailable()===false);
{
  let threw=false, started;
  try{ started=startCape3D(); pauseCape3D(); resumeCape3D(); disposeCape3D(); }catch(e){ threw=true; }
  check('dormant Cape 3D lifecycle is a safe no-op without Three', !threw && started===false && cape3d===null);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0?1:0);
