// Extended Cape landscape and pad-to-orbit visual continuity. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
function near(a,b,eps=1e-9){ return Math.abs(a-b)<=eps; }

{
  const layout=cape3dLandscapeLayout(), repeat=cape3dLandscapeTextureRepeat(layout,400);
  check('Cape land extends at least 180 km inland for rising-flight views',layout.land.width>=180000);
  check('extended coastal terrain covers a broad north/south range',layout.land.depth>=250000);
  check('expanded land still ends exactly at the ocean shoreline',near(layout.land.centerX+layout.land.width*.5,layout.coastX));
  check('ground texture repeat preserves kilometre-scale detail on the expanded plane',repeat.x>=450&&repeat.y>=625);
}

{
  const pad=cape3dAscentSiteFraming(0), oneKm=cape3dAscentSiteFraming(1000), threeKm=cape3dAscentSiteFraming(3000), released=cape3dAscentSiteFraming(7000);
  check('camera begins at the authored pad shot without a forced wide view',pad.mix===0&&pad.distanceFloor===150);
  check('one-kilometre climb frames the facility and rocket together',oneKm.mix>.95&&oneKm.targetSiteWeight>.35&&oneKm.distanceFloor>2100);
  check('range-wide framing still carries the Cape through a three-kilometre climb',threeKm.mix>.8&&threeKm.distanceFloor>5500);
  check('wide shot releases smoothly back to the close chase before high atmosphere',released.mix===0&&released.targetSiteWeight===0);
}

{
  const low=cape3dPhysicalAscentBlend(30000), mid=cape3dPhysicalAscentBlend(55000), high=cape3dPhysicalAscentBlend(96000);
  check('extended Cape remains fully present below the Earth handoff',low.capeOpacity===1&&low.earthOpacity===0);
  check('local Cape haze clears fast enough for the kilometre-scale range shot',cape3dPhysicalAscentBlend(3000).fogDensity<8e-5);
  check('Cape remains the stronger layer through mid-altitude transition',mid.capeOpacity>mid.earthOpacity&&mid.capeVisible);
  check('physical Earth completes the handoff near the Kármán line',high.earthOpacity===1&&high.capeOpacity===0&&!high.capeVisible);
  check('Cape and Earth remain exactly complementary throughout the longer fade',(()=>{for(let km=0;km<=110;km+=2){const q=cape3dPhysicalAscentBlend(km*1000);if(!near(q.earthOpacity+q.capeOpacity,1))return false;}return true;})());
}

{
  const material={opacity:.68,transparent:true,depthWrite:false,userData:{}}, object={visible:true,traverse(fn){fn({material});}};
  cape3dApplySiteOpacity([object],.5);
  check('site crossfade scales each material from its authored base opacity',near(material.opacity,.34)&&object.visible);
  cape3dApplySiteOpacity([object],0);
  check('fully handed-off site geometry leaves the scene graph cleanly',material.opacity===0&&!object.visible);
  cape3dApplySiteOpacity([object],1);
  check('returning to Mission Control restores the original material state',near(material.opacity,.68)&&material.transparent&&material.depthWrite===false&&object.visible);
}

check('launch camera consumes range-wide framing and real site opacity',cape3dUpdateLaunchPresentation.toString().includes('cape3dAscentSiteFraming')&&cape3dUpdateLaunchPresentation.toString().includes('cape3dApplySiteOpacity'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
