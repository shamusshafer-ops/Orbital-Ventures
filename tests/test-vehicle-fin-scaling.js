// Stage-proportional tail-fin geometry. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,eps=1e-9){ return Math.abs(a-b)<=eps; }

{
  const small=rocketTailFinProfile(2.4,17.28);
  check('small-rocket fin root stays below one quarter of its stage height',small.rootChord<17.28*.25);
  check('small-rocket fin span stays narrower than its body radius',small.span<2.4);
  check('small-rocket fin thickness follows its body instead of a fixed large mesh',small.thickness<.35);
}
{
  const a=rocketTailFinProfile(2.4,17.28), b=rocketTailFinProfile(4.8,34.56);
  check('doubling stage radius and height doubles the fin root chord',near(b.rootChord,a.rootChord*2));
  check('doubling stage radius and height doubles the fin span',near(b.span,a.span*2));
  check('doubling an unclamped stage doubles fin thickness',near(b.thickness,a.thickness*2));
}
{
  const squat=rocketTailFinProfile(8,12), pencil=rocketTailFinProfile(1.2,60);
  check('short wide stages cap fin root chord by stage height',squat.rootChord<=12*.34);
  check('long narrow stages cap fin span by body radius',pencil.span<=1.2*.78);
  check('all derived fin dimensions remain positive',Object.values(squat).every(v=>v>0)&&Object.values(pencil).every(v=>v>0));
}

check('Three.js sounding fins consume the shared proportional profile',cape3dVehicleMesh.toString().includes('rocketTailFinProfile')&&cape3dVehicleMesh.toString().includes('finProfile'));
check('Canvas fins consume the same proportional span and root chord',drawVehicle.toString().includes('rocketTailFinProfile')&&drawVehicle.toString().includes('finSpan'));
check('the retired fixed 14-by-7 sounding-fin dimensions are absent',!cape3dVehicleMesh.toString().includes(".3,14,Math.max(7"));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
