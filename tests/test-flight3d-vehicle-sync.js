// Flight 3D vehicle authority regression: the long-lived Cape scene used to keep the one-stage
// A-4 mesh it was born with while launch physics/audio used the later frozen multi-stage spec.
// At stage separation that sole stale group (nose included) detached, leaving only the plume.
// These checks stay pure/plain-object so they run without THREE or WebGL.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

newGame('engineer');
const launchSpec={crewed:true,stages:[
  {prop:90,count:4,dia:3.7,eng:'h1'},
  {prop:24,count:1,dia:2.4,eng:'aj10'}
],boosters:{count:2,prop:18,solid:true,eng:'solid_large'},transferProp:8};
const timing={padDur:3200,ascentDur:7200,cruiseDur:4800,reentryDur:6400,totalDur:21600,ignite:1};
const snapshot=flight3dPresentationSnapshot(launchSpec,timing,4200);

function matchingMock(source){
  const v=cape3dFlightVehicleSpec(source), kinds=v.stages.map(()=>'stage').concat(v.transferProp>0?['transfer']:[]);
  return {userData:{vehicleVisualKey:cape3dVehicleVisualKey(v),stageGroups:kinds.map(kind=>({kind,group:{}})),boosterCount:v.boosters?v.boosters.count:0,boosterGroup:v.boosters?{}:null}};
}

{
  const fromSpec=cape3dFlightVehicleSpec(launchSpec), fromSnapshot=cape3dFlightVehicleSpec(snapshot);
  check('launch spec and presentation snapshot normalize to the same frozen visual vehicle',cape3dVehicleVisualKey(fromSpec)===cape3dVehicleVisualKey(fromSnapshot));
  check('normalizer preserves two core stages, transfer stage inputs, boosters and capsule nose',fromSnapshot.stages.length===2&&fromSnapshot.transferProp===8&&fromSnapshot.boosters.count===2&&fromSnapshot.crewed);
  check('engine identity survives the snapshot for vehicle-class styling',fromSnapshot.stages[0].eng==='h1'&&fromSnapshot.boosters.eng==='solid_large');
}
{
  const frozenKey=cape3dVehicleVisualKey(snapshot);
  state.stages=[{eng:'a4',count:1,prop:2,dia:1}]; state.boosters=null;
  check('frozen launch visual is independent of later live-bench mutation',cape3dVehicleVisualKey(snapshot)===frozenKey&&cape3dVehicleVisualKey(cape3dCurrentVehicleSpec())!==frozenKey);
}
{
  const fresh=matchingMock(snapshot);
  check('matching signature plus topology reuses the correct flight mesh',cape3dRocketMatchesVehicle(fresh,snapshot));
  const stale=matchingMock({stages:[{prop:2,count:1,dia:1,eng:'a4'}],crewed:false});
  check('cached one-stage A-4 is rejected for the multi-stage launch',!cape3dRocketMatchesVehicle(stale,snapshot));
  fresh.userData.stageGroups.pop();
  check('missing transfer/stage group forces a rebuild even if the signature claims a match',!cape3dRocketMatchesVehicle(fresh,snapshot));
}
{
  const noBoost=matchingMock(snapshot); noBoost.userData.boosterGroup=null;
  check('missing booster geometry forces a rebuild',!cape3dRocketMatchesVehicle(noBoost,snapshot));
  const wrongBoost=matchingMock(snapshot); wrongBoost.userData.boosterCount=4;
  check('wrong booster count forces a rebuild',!cape3dRocketMatchesVehicle(wrongBoost,snapshot));
}
{
  const sameCountDifferentTank=JSON.parse(JSON.stringify(launchSpec)); sameCountDifferentTank.stages[0].prop+=1;
  check('same stage count with different tank proportions gets a different visual key',cape3dVehicleVisualKey(sameCountDifferentTank)!==cape3dVehicleVisualKey(launchSpec));
  const sameCountDifferentDia=JSON.parse(JSON.stringify(launchSpec)); sameCountDifferentDia.stages[1].dia+=.2;
  check('diameter changes also invalidate the cached mesh',cape3dVehicleVisualKey(sameCountDifferentDia)!==cape3dVehicleVisualKey(launchSpec));
}
{
  const v=cape3dFlightVehicleSpec(snapshot), mock=matchingMock(snapshot);
  check('transfer segment is last and does not shift core stage indexes',mock.userData.stageGroups.map(x=>x.kind).join(',')==='stage,stage,transfer'&&v.stages.length===2);
  check('null and malformed sources fail safely',cape3dFlightVehicleSpec(null).stages.length===0&&!cape3dRocketMatchesVehicle(null,null)&&!cape3dRocketMatchesVehicle({},{}));
}
{
  // Verify the lifecycle boundary directly: beginFlight3DSession must hand the frozen spec to the
  // Cape enter/sync path. Browser services are replaced only for this call, then restored.
  const saved={available:flight3dAvailable,start:startCape3D,mount:mountCape3D,resize:resizeCape3D,resume:resumeCape3D,enter:cape3dEnterLaunchPresentation,cape:cape3d,session:flight3dSession};
  let captured=null;
  flight3dAvailable=()=>true; startCape3D=()=>true; mountCape3D=()=>true; resizeCape3D=()=>true; resumeCape3D=()=>true; cape3dEnterLaunchPresentation=x=>{captured=x;return true;};
  cape3d={mountId:'ccSceneHost',hotspotHostId:'ccSpots',flightPan:null}; flight3dSession=null;
  const began=beginFlight3DSession(launchSpec);
  check('beginFlight3DSession sends the frozen launch vehicle into the mesh-sync boundary',began&&captured&&cape3dVehicleVisualKey(captured)===cape3dVehicleVisualKey(launchSpec));
  flight3dAvailable=saved.available; startCape3D=saved.start; mountCape3D=saved.mount; resizeCape3D=saved.resize; resumeCape3D=saved.resume; cape3dEnterLaunchPresentation=saved.enter; cape3d=saved.cape; flight3dSession=saved.session;
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
