// Cape terrain colour and launch-guide cleanup. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

newGame('engineer');

{
  const color=CAPE3D_TERRAIN_STYLE.ground, r=(color>>16)&255, g=(color>>8)&255, b=color&255;
  check('Cape ground tint now leans green rather than sand-only',g>r&&g>b);
  check('green terrain overlay remains textured instead of becoming a flat lawn',CAPE3D_TERRAIN_STYLE.overlayOpacity>.5&&CAPE3D_TERRAIN_STYLE.overlayOpacity<.8);
  check('three of every four terrain patches are vegetation-toned',CAPE3D_TERRAIN_STYLE.sandPatchEvery===4);
}

{
  const source=cape3dTerrainVariationTexture.toString();
  check('terrain variation supplies several distinct coastal greens',source.includes('44,91,42')&&source.includes('79,119,55')&&source.includes('103,132,66'));
  check('terrain variation retains restrained sandy breaks',source.includes('214,191,125'));
}

check('the live Cape scene no longer constructs an ascent trajectory guide',!buildCape3DScene.toString().includes('launchTrajectory')&&!buildCape3DScene.toString().includes('TrajectoryVisual'));
check('launch updates no longer draw a past/future trajectory line',!cape3dUpdateLaunchPresentation.toString().includes('TrajectoryVisual'));
check('the retired trajectory-guide renderer is absent',typeof cape3dTrajectoryVisual==='undefined');
check('physical flight projection remains available for motion, staging and telemetry',typeof cape3dTrajectoryPlan==='function'&&typeof cape3dTrajectorySample==='function');
check('Canvas fallback retains its existing green facility terrain',drawIsoGround.toString().includes('#203326')&&drawIsoGround.toString().includes('#35462c'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
