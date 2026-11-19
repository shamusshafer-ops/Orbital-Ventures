// Cape 3D Slice A: all scene data remains pure and the dormant flag cannot disturb the proven Cape.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; }else{ fail++; console.log('FAIL:',name); } }
function near(a,b,tol,name){ check(name,Math.abs(a-b)<=tol); }

newGame('engineer');

check('CAPE3D is enabled for browser visual validation', CAPE3D===true);
check('Cape world tile remains a meaningful site-plan scale', CAPE_WORLD_TILE_M===120);
check('Cape facility layout uses the widened site spread', CAPE3D_SITE_SPREAD===1.5);
{ const pad=ISO_BUILDINGS.find(b=>b.key==='pad'), pp=capeWorldPoint(pad.gx,pad.gy), near1=Math.min(...ISO_BUILDINGS.filter(b=>!['pad','rivalpad'].includes(b.type)).map(b=>{ const p=capeWorldPoint(b.gx,b.gy); return Math.hypot(p.x-pp.x,p.z-pp.z); }));
  check('launch pad stands at least 1 km from every occupied building', near1>=1000);
  check('launch pad stays where it was against the coast', Math.abs(pp.x-6.2*120*1.15)<1e-6); }
check('Cape vertical conversion remains positive', CAPE_WORLD_HEIGHT_M_PER_PX>0);
check('Cape material maps are local project assets', CAPE3D_TEXTURE_ASSET.ground==='assets/cape-ground-albedo.png'&&CAPE3D_TEXTURE_ASSET.pavement==='assets/cape-pavement-albedo.png');

{
  const p=capeWorldPoint(2.5,-1.25,18);
  near(p.x,6.2*120*1.15+(2.5-6.2)*180-700,1e-9,'campus grid x converts to world x with the spread and pad standoff');
  near(p.y,18,1e-9,'elevation becomes world y');
  near(p.z,-225,1e-9,'grid y converts to world z with the Cape spread');
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

{ // parking sized to the building, propellant farm in the pad standoff (2026-11-19)
  const ds=capeFacilityDescriptors(), plan=cape3dSitePlan(ds,CAPE3D_COAST_X), stalls=k=>plan.lots.filter(l=>l.key===k&&!l.truck).reduce((n,l)=>n+l.stalls,0);
  check('every staffed building gets the stalls its size and purpose call for', ds.filter(d=>CAPE3D_PARKING_RATE[d.type]).every(d=>stalls(d.key)===cape3dParkingStalls(d)));
  const by=k=>ds.find(d=>d.key===k);
  check('an office block parks far more cars than the dish farm', cape3dParkingStalls(by('personnel'))>5*cape3dParkingStalls(by('infra')));
  check('lots are real bays: two stall rows per aisle', plan.lots.filter(l=>!l.truck).every(l=>l.bays>=1&&l.stalls<=l.bays*2*l.perRow));
  check('manufacturing and production get truck aprons', ['mfg','prod'].every(k=>plan.lots.some(l=>l.key===k&&l.truck)));
  const F=plan.farm, pad=by('pad');
  check('the propellant farm exists and is large', !!F&&F.hx*2>=300&&F.hz*2>=150);
  check('the farm sits between the campus and the pad, clear of every building', !!F&&F.x+F.hx<pad.position.x&&ds.every(d=>Math.abs(d.position.x-F.x)>F.hx+d.footprint.x*.5||Math.abs(d.position.z-F.z)>F.hz+d.footprint.z*.5));
  check('no lot overlaps the farm or a road', plan.lots.every(l=>!cape3dSiteBlocked({rects:plan.rects.filter(r=>r!==l),roads:plan.roads},l.x,l.z,0)));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0?1:0);
