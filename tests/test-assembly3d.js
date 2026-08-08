// Shared Three.js Station/Base bench contract. The headless harness intentionally has no THREE,
// so it proves the renderer-neutral scene model and the exact SVG fallback path; real WebGL is
// covered by the Firefox review.
animEnabled=false;
let pass=0, fail=0;
function check(name,cond){ if(cond)pass++; else{fail++;console.log('FAIL:',name);} }

newGame('engineer');
check('assembly 3D is enabled', ASSEMBLY3D===true);
check('Station declares a dedicated 3D host', sceneDef('station').assembly.hostId==='station3dHost');
check('Base declares a dedicated 3D host', sceneDef('base').assembly.hostId==='base3dHost');
check('Station and Base share one renderer variable', assembly3d===null);

// Orbital topology: same ordered module model, placed on the established radial slot grid.
const stationCur={def:facilityById('leo_station'),fs:{moduleList:['can_std','lab_mod','power_truss','node_hub','greenhouse','depot_mod']}};
const stationBefore=JSON.stringify(stationCur.fs.moduleList);
const orbital=assembly3dSceneSpec('station',stationCur);
check('orbital spec preserves every module in order', JSON.stringify(orbital.ids)===stationBefore);
check('orbital core is centered', orbital.nodes[0].x===0&&orbital.nodes[0].z===0&&orbital.nodes[0].parent===-1);
check('first four orbital branches attach to the core', orbital.nodes.slice(1,5).every(n=>n.parent===0));
check('orbital layout occupies both axes', new Set(orbital.nodes.map(n=>n.x)).size>2&&new Set(orbital.nodes.map(n=>n.z)).size>2);
check('orbital scene modelling does not mutate state input', JSON.stringify(stationCur.fs.moduleList)===stationBefore);

// Surface topology: ground-plane grid, local body identity, connected ordered modules.
const baseCur={def:facilityById('lunar_base'),fs:{moduleList:['hab_dome','lab_mod','reactor_pad','isru_plant','greenhouse','rover_garage','depot_mod']}};
const surface=assembly3dSceneSpec('base',baseCur);
check('surface spec carries the facility body', surface.body==='moon');
check('surface modules all sit on the ground datum', surface.nodes.every(n=>n.y===0));
check('surface layout wraps into more than one site row', new Set(surface.nodes.map(n=>n.z)).size>2);
check('surface connections form one ordered site chain', surface.nodes[0].parent===-1&&surface.nodes.slice(1).every((n,i)=>n.parent===i));

const oc=assembly3dCameraDefault('station',6), bc=assembly3dCameraDefault('base',7);
check('camera defaults are finite and positive', [oc.yaw,oc.pitch,oc.dist,bc.yaw,bc.pitch,bc.dist].every(Number.isFinite)&&oc.dist>0&&bc.dist>0);
check('surface camera starts higher than orbital camera', bc.pitch>oc.pitch);
check('scene signatures distinguish body and mode', assembly3dSpecKey(orbital)!==assembly3dSpecKey(surface));

// Presentation-only drag layouts are keyed by facility/draft and module index. They may change
// the scene projection, but must never reorder or mutate the simulation-owned module list.
state.assemblyLayouts={'station:leo_station':{1:{x:12,z:-4}}};
const movedOrbital=assembly3dSceneSpec('station',stationCur);
check('saved station placement overrides only the matching module projection', movedOrbital.nodes[1].x===12&&movedOrbital.nodes[1].z===-4&&movedOrbital.nodes[0].x===orbital.nodes[0].x);
check('placement changes the renderer signature without changing module authority', assembly3dSpecKey(movedOrbital)!==assembly3dSpecKey(orbital)&&JSON.stringify(stationCur.fs.moduleList)===stationBefore);
assembly3dClearLayout('station',stationCur,1);
check('clearing a station placement restores the exact generated grid coordinate', assembly3dSceneSpec('station',stationCur).nodes[1].x===orbital.nodes[1].x);
assembly3dWriteLayout('station',stationCur,4,{x:0,y:3.48,z:0,yaw:0,parent:0,dockTargetPort:'top',dockOwnPort:'bottom'});
const stackedOrbital=assembly3dSceneSpec('station',stationCur);
check('station layouts persist vertical node docking and elevation', stackedOrbital.nodes[4].y===3.48&&stackedOrbital.nodes[4].dockTargetPort==='top'&&stackedOrbital.nodes[4].dockOwnPort==='bottom');
check('vertical docking changes the station renderer signature', assembly3dSpecKey(stackedOrbital)!==assembly3dSpecKey(orbital));
assembly3dClearLayout('station',stationCur,4);
assembly3dWriteLayout('base',baseCur,3,{x:9.26,z:-7.24,yaw:1.57,parent:1,dockTargetPort:'east',dockOwnPort:'west'});
check('layout writes are scoped and grid-rounded', state.assemblyLayouts['base:lunar_base'][3].x===9.26&&state.assemblyLayouts['base:lunar_base'][3].z===-7.24);
check('layout persists docking orientation and explicit connection ports', state.assemblyLayouts['base:lunar_base'][3].yaw===1.57&&state.assemblyLayouts['base:lunar_base'][3].parent===1&&state.assemblyLayouts['base:lunar_base'][3].dockTargetPort==='east'&&state.assemblyLayouts['base:lunar_base'][3].dockOwnPort==='west');
const dockedSurface=assembly3dSceneSpec('base',baseCur);
check('saved dock relationship returns with the same projected module', dockedSurface.nodes[3].parent===1&&dockedSurface.nodes[3].yaw===1.57&&dockedSurface.nodes[3].dockTargetPort==='east');
assembly3dClearLayout('base',baseCur,3);
check('clearing one placement leaves the matching facility layout empty', !state.assemblyLayouts['base:lunar_base']);
assembly3dWriteLayout('station',stationCur,2,{x:0,z:0,yaw:0,parent:-1,hidden:true});
const clearedOrbital=assembly3dSceneSpec('station',stationCur);
check('canvas-cleared modules persist as visually hidden without leaving the module model', clearedOrbital.nodes[2].hidden===true&&clearedOrbital.ids.length===orbital.ids.length);
check('hidden modules participate in renderer signatures', assembly3dSpecKey(clearedOrbital)!==assembly3dSpecKey(orbital));
assembly3dClearLayout('station',stationCur,2);

const assemblyChrome=assemblyShellHTML('station');
check('assembly chrome exposes reversible clear-canvas and module-tray controls', assemblyChrome.includes('stationClearCanvasBtn')&&assemblyChrome.includes('stationModuleTray'));
check('assembly chrome exposes selected-module rotation in both directions', assemblyChrome.includes('stationRotateLeftBtn')&&assemblyChrome.includes('stationRotateRightBtn'));
check('assembly chrome explains full-scene orbiting and vertical docking while arranging', assemblyChrome.includes('right-drag to orbit')&&assemblyChrome.includes('Shift: top port')&&assemblyChrome.includes('Alt/Option: bottom port'));
// With THREE absent, both live renderers must take the established SVG route without creating
// a WebGL state object. This is the release fallback, not a test-only alternate renderer.
check('Three.js is absent in the headless harness', threeOK()===false);
check('startAssembly3D declines cleanly without THREE', startAssembly3D('station',stationCur)===false&&assembly3d===null);
let threw=false;
try{ state.tab='station'; renderStation(); state.tab='base'; renderBase(); pauseAssembly3D(); resumeAssembly3D(); }
catch(e){ threw=true; console.log('  threw:',e.message); }
check('both benches render/fallback and lifecycle no-op safely', !threw);
check('arrange controls are harmless without a live WebGL renderer', toggleAssembly3DArrange('station')===undefined&&assembly3d===null);
check('station SVG fallback remains available', renderStationStackSVG(720,300,stationCur,true).includes('<svg'));
check('base SVG fallback remains available', renderBaseSurfaceSVG(720,300,baseCur,true).includes('<svg'));

console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0?1:0);
