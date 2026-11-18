// Cape terrain colour and launch-guide cleanup. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

newGame('engineer');

{
  const color=CAPE3D_TERRAIN_STYLE.ground, r=(color>>16)&255, g=(color>>8)&255, b=color&255;
  check('Cape ground tint now leans green rather than sand-only',g>r&&g>b);
}

{
  // Graphics pass 3: the variation overlay became part of the one terrain shader.
  const source=cape3dTerrainMaterial.toString();
  check('terrain shader supplies several distinct coastal greens',['uGrassA','uGrassB','uForest','uLawn'].every(k=>source.includes(k)));
  check('terrain shader retains restrained sandy breaks',source.includes('uSandDry')&&source.includes('uGrassDry'));
  check('the old transparent variation overlay is gone',typeof cape3dTerrainVariationTexture==='undefined');
}

check('the live Cape scene no longer constructs an ascent trajectory guide',!buildCape3DScene.toString().includes('launchTrajectory')&&!buildCape3DScene.toString().includes('TrajectoryVisual'));
check('launch updates no longer draw a past/future trajectory line',!cape3dUpdateLaunchPresentation.toString().includes('TrajectoryVisual'));
check('the retired trajectory-guide renderer is absent',typeof cape3dTrajectoryVisual==='undefined');
check('physical flight projection remains available for motion, staging and telemetry',typeof cape3dTrajectoryPlan==='function'&&typeof cape3dTrajectorySample==='function');
check('Canvas fallback retains its existing green facility terrain',drawIsoGround.toString().includes('#203326')&&drawIsoGround.toString().includes('#35462c'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
