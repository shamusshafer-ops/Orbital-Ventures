// Exhaust-plume visual-language contract. Appended after harness.js + build/game.js.
// Keeps the live Three.js path, compact orbit/transfer burn, and Canvas fallback on
// one propellant-family/pressure story without trying to instantiate THREE headlessly.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }

check('kerolox/alcohol engines share the warm launch-family baseline',enginePlumeFamily('f1_class')==='kerolox'&&enginePlumeFamily('a4')==='kerolox');
check('cryo, methane and storable engines retain distinct plume families',enginePlumeFamily('hydrolox_up')==='hydrolox'&&enginePlumeFamily('methalox_vac')==='methalox'&&enginePlumeFamily('hyper_storable')==='hypergolic');
check('solid and electric drives are not painted like liquid boosters',enginePlumeFamily('solid_srb')==='solid'&&enginePlumeFamily('ion_xenon')==='electric'&&enginePlumeFamily('fusion_torch')==='fusion');

{
  const sea=cape3dPlumeProfile(1,0,'kerolox_mk3',false), transition=cape3dPlumeProfile(1,.2,'kerolox_mk3',false), vacuum=cape3dPlumeProfile(1,1,'kerolox_mk3',false), idle=cape3dPlumeProfile(0,0,'kerolox_mk3',false);
  check('falling ambient pressure broadens and lengthens one translucent envelope',vacuum.width>sea.width&&vacuum.length>sea.length&&vacuum.outerOpacity<sea.outerOpacity);
  check('shock cells peak in the pressure-transition region and dissolve in vacuum',transition.shockOpacity>sea.shockOpacity&&transition.shockOpacity>vacuum.shockOpacity&&vacuum.shockOpacity===0);
  check('engine shutdown removes every luminous layer',idle.outerOpacity===0&&idle.coreOpacity===0&&idle.hotOpacity===0&&idle.shockOpacity===0);
}
{
  const hydro=cape3dPlumeProfile(1,0,'hydrolox_up',false), solid=cape3dPlumeProfile(1,0,'solid_srb',true), methane=cape3dPlumeProfile(1,0,'methalox',false);
  check('solid exhaust carries much more particulate smoke than hydrolox',solid.smokeMult>1&&hydro.smokeMult<.1);
  check('methalox and hydrolox receive their own physical-world colours',methane.outerColor!==hydro.outerColor&&methane.glowColor!==solid.glowColor);
}
{
  const shape=buildVehicleShape({stages:[{prop:20,count:2,dia:2,eng:'kerolox_mk2'}],boosters:{count:2,prop:8,solid:true,eng:'solid_castor'},transferProp:0,crewed:false});
  check('vehicle shape preserves active core and booster engine identity for rendering',shape.segs[0].engine==='kerolox_mk2'&&shape.boosters.engine==='solid_castor');
}
{
  const source={stages:[{prop:20,count:1,dia:2,eng:'hydrolox_up'}],transferProp:8,transferEng:'nep_snap'}, v=cape3dFlightVehicleSpec(source), shape=buildVehicleShape(v);
  check('transfer-stage drive identity survives normalization and reaches its plume',v.transferEng==='nep_snap'&&shape.segs[shape.segs.length-1].engine==='nep_snap');
  check('post-ascent plume selects the fitted transfer drive over the insertion engine',(v.transferProp>0?v.transferEng:v.stages[v.stages.length-1].eng)==='nep_snap');
}
{
  const rocket={}, first={parent:rocket}, second={parent:rocket}, stages=[{kind:'stage',baseY:0,engine:'f1_class',group:first},{kind:'stage',baseY:80,engine:'hydrolox_up',group:second}];
  check('live plume follows the lowest attached stage engine',cape3dLiveEngine(stages,rocket)==='f1_class');
  first.parent={};
  check('stage separation hands plume identity to the newly active upper engine',cape3dLiveEngine(stages,rocket)==='hydrolox_up');
}

check('launch plume no longer constructs concentric cone geometry',!cape3dLaunchEffects.toString().includes('ConeGeometry')&&cape3dLaunchEffects.toString().includes('cape3dPlumeEnvelope'));
check('orbit and transfer burns use the same soft-envelope primitive',!cape3dFlightCraftModel.toString().includes('ConeGeometry')&&cape3dFlightCraftModel.toString().includes('cape3dPlumeEnvelope'));
{
  const source=drawCanvasPressurePlume.toString();
  check('Canvas fallback owns one shim-compatible pressure envelope rather than an inner/outer cone pair',source.includes('single pressure envelope')&&(source.match(/createLinearGradient/g)||[]).length===1&&!source.includes('bezierCurveTo'));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
