// Cape command-center camera: wider reset view plus pointer drag/pan without stealing hotspot clicks.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; }else{ fail++; console.log('FAIL:',name); } }

check('Cape default zoom is lower than native scale', CAPE_DEFAULT_ZOOM<1);
check('Cape zoom range includes its default', CAPE_MIN_ZOOM<=CAPE_DEFAULT_ZOOM && CAPE_DEFAULT_ZOOM<CAPE_MAX_ZOOM);

// Zoomed-out panning uses the positive spare margin; zoomed-in panning retains the old negative bounds.
capeZoom=CAPE_DEFAULT_ZOOM; capePanX=-999; capePanY=999; capeClampPan(1000,500);
check('overview clamp bounds pan to zoom-out margin', capePanX===0 && capePanY===500*(1-CAPE_DEFAULT_ZOOM));
capeZoom=2; capePanX=999; capePanY=-999; capeClampPan(1000,500);
check('detail clamp retains zoom-in bounds', capePanX===0 && capePanY===-500);

const oldGet=document.getElementById, oldMatchMedia=window.matchMedia, listeners={};
const wrap={_zoomInit:false,style:{},addEventListener:(name,fn)=>{ listeners[name]=fn; },getBoundingClientRect:()=>({left:10,top:20,width:1000,height:500}),setPointerCapture(){},releasePointerCapture(){}};
const zoom={style:{}};
document.getElementById=id=>id==='ccSceneWrap'?wrap:id==='ccZoom'?zoom:oldGet(id);
initCapeZoom();
check('Cape advertises drag interaction while CSS owns touch behavior', wrap.style.cursor==='grab' && wrap.style.touchAction===undefined);
check('initialization centers the wider default view', capeZoom===CAPE_DEFAULT_ZOOM && capePanX===70 && capePanY===35);
listeners.pointerdown({button:0,pointerId:7,clientX:300,clientY:200});
listeners.pointermove({pointerId:7,clientX:305,clientY:200});
check('primary pointer drag pans at the overview default', capePanX===75 && capePanY===35);
let stopped=false, prevented=false;
listeners.click({stopPropagation:()=>{stopped=true;},preventDefault:()=>{prevented=true;}});
check('drag suppresses its follow-up hotspot click', stopped && prevented);
listeners.pointerup({pointerId:7});
listeners.dblclick({});
check('double-click restores the centered wider default', capeZoom===CAPE_DEFAULT_ZOOM && capePanX===70 && capePanY===35);
// Compact touch reserves vertical gestures for page scrolling, but retains deliberate horizontal panning.
window.matchMedia=()=>({matches:true});
listeners.pointerdown({button:0,pointerId:8,pointerType:'touch',clientX:300,clientY:200});
listeners.pointermove({pointerId:8,clientX:302,clientY:216});
check('compact vertical touch does not pan the Cape', capePanX===70 && capePanY===35);
listeners.pointerup({pointerId:8});
listeners.pointerdown({button:0,pointerId:9,pointerType:'touch',clientX:300,clientY:200});
listeners.pointermove({pointerId:9,clientX:316,clientY:202});
check('compact horizontal touch still pans the Cape', capePanX===86 && capePanY===37);
listeners.pointerup({pointerId:9});
document.getElementById=oldGet;
window.matchMedia=oldMatchMedia;

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0?1:0);
