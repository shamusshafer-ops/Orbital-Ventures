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
// Drag snapping is collar-to-collar: it must use the actual port radii, choose
// the matching moving collar, and reject drops merely near a hull.
const collar={x:1.55,y:0,z:0,nx:1,ny:0,nz:0};
const westCollar={x:-1.55,y:0,z:0,nx:-1,ny:0,nz:0};
const collarPlacement=assembly3dDockPlacement(collar,westCollar,'station');
check('horizontal docking placement mates opposite collars with their physical gap', collarPlacement.x===3.92&&collarPlacement.y===0&&Math.abs(collarPlacement.yaw)<1e-9);
const topPlacement=assembly3dDockPlacement({x:0,y:1.55,z:0,nx:0,ny:1,nz:0},{x:0,y:-1.55,z:0,nx:0,ny:-1,nz:0},'station');
check('vertical docking placement mates top and bottom collars', topPlacement&&topPlacement.x===0&&topPlacement.y===3.92&&topPlacement.z===0);
check('incompatible side/top collar pair is rejected', assembly3dDockPlacement(collar,{x:0,y:-1.55,z:0,nx:0,ny:-1,nz:0},'station')===null);
// Placement clearance is renderer-neutral: it uses port-pose hull dimensions,
// preserves an intentionally mated parent/child gasket, and carries children
// when screening a moved branch.
const guard={mode:'station',nodes:[
  {index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},
  {index:1,parent:-1,id:'can_std',x:12,y:0,z:0,yaw:0},
  {index:2,parent:-1,id:'can_std',x:4,y:0,z:0,yaw:0}
]};
const legalEast=assembly3dDockPlacement(assembly3dPortPose(guard.nodes[0],'east','station'),assembly3dPortPose({id:'can_std',x:0,y:0,z:0,yaw:0},'west','station'),'station');
const legalGuard={mode:'station',nodes:guard.nodes.slice(0,2)};
check('tight intended axial docking is not treated as a hull collision', assembly3dPlacementClear(legalGuard,1,Object.assign({},legalGuard.nodes[1],legalEast,{parent:0,dockTargetPort:'east',dockOwnPort:'west'}))===true);
check('docking rejects a newly introduced collision with an unrelated hull', assembly3dPlacementClear(guard,1,Object.assign({},guard.nodes[1],{x:4,y:0,z:0,parent:-1}))===false);
const collarLane={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:15,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:5.2,y:0,z:0,yaw:0}]};
const collarCandidate=Object.assign({},collarLane.nodes[0],{x:0,y:0,z:0});
check('a hull in front of an otherwise free collar is detected without hull-to-hull overlap', !assembly3dHullBoxesOverlap(assembly3dHullBox(collarCandidate,'station'),assembly3dHullBox(collarLane.nodes[1],'station'))&&assembly3dPortClearanceConflict({mode:'station',nodes:[collarCandidate,collarLane.nodes[1]]},collarCandidate,collarLane.nodes[1])===true);
check('placement rejects the free-collar approach-lane intrusion', assembly3dPlacementClear(collarLane,0,collarCandidate)===false);
const verticalGuard={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:10,y:0,z:0,yaw:0}]};
const legalTop=assembly3dDockPlacement(assembly3dPortPose(verticalGuard.nodes[0],'top','station'),assembly3dPortPose({id:'can_std',x:0,y:0,z:0,yaw:0},'bottom','station'),'station');
check('tight intended vertical docking remains legal', assembly3dPlacementClear(verticalGuard,1,Object.assign({},verticalGuard.nodes[1],legalTop,{parent:0,dockTargetPort:'top',dockOwnPort:'bottom'}))===true);
const branchGuard={mode:'station',nodes:[
  {index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},
  {index:1,parent:-1,id:'can_std',x:12,y:0,z:0,yaw:0},
  {index:2,parent:1,id:'can_std',x:17,y:0,z:0,yaw:0},
  {index:3,parent:-1,id:'can_std',x:9,y:0,z:0,yaw:0}
]};
check('a docking edit rejects collision caused by an attached child transform', assembly3dPlacementClear(branchGuard,1,Object.assign({},branchGuard.nodes[1],{x:4,y:0,z:0,parent:-1}))===false);
const reattachGuard={mode:'station',nodes:[
  {index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},
  {index:1,parent:0,id:'can_std',x:5,y:0,z:0,yaw:0},
  {index:2,parent:1,id:'can_std',x:10,y:0,z:0,yaw:0}
]};
const reattachCandidate=Object.assign({},reattachGuard.nodes[0],{x:15,y:0,z:0,parent:2,dockTargetPort:'east',dockOwnPort:'west'});
const detachedBranch=assembly3dMovedBranch(reattachGuard,0,reattachCandidate,1);
check('descendant reattachment predicts its cut branch as fixed', detachedBranch.moved.has(0)&&!detachedBranch.moved.has(1)&&!detachedBranch.moved.has(2));
check('a clear descendant reattachment is screened and remains legal', assembly3dPlacementClear(reattachGuard,0,reattachCandidate,null,1)===true);
reattachGuard.nodes.push({index:3,parent:-1,id:'can_std',x:15,y:0,z:0,yaw:0});
check('descendant reattachment is rejected when its selected root newly hits a fixed hull', assembly3dPlacementClear(reattachGuard,0,reattachCandidate,null,1)===false);
const legacyOverlap={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:2,y:0,z:0,yaw:0}]};
check('an old overlap may be moved without the guard deadlocking its repair', assembly3dPlacementClear(legacyOverlap,1,Object.assign({},legacyOverlap.nodes[1],{x:4,y:0,z:0}))===true);
const rotationGuard={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:-3.5,y:0,z:-3.5,yaw:0}]};
const rotationBefore=rotationGuard.nodes.map(n=>Object.assign({},n));
check('rotation checks against its pre-turn layout rather than accepting its proposed collision as legacy', assembly3dPlacementClear(rotationGuard,0,Object.assign({},rotationGuard.nodes[0],{yaw:Math.PI/2}),rotationBefore)===false);
// Exercise the actual rotate command with its rendering commit stubbed: reject
// leaves the selected node untouched, while a clear quarter-turn persists.
const savedAssembly=assembly3d, savedSelection=assembly3dSelection, savedPlaceNode=assembly3dPlaceNode;
const rotateBlocked={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:-3.5,y:0,z:-3.5,yaw:0}],groups:[]};
assembly3d={sceneId:'station',cur:stationCur,scene:{userData:{assemblyLayout:rotateBlocked}}}; assembly3dSelection={sceneId:'station',index:0}; assembly3dPlaceNode=()=>{};
check('rotate command rejects an actual newly colliding quarter-turn without mutation', assembly3dRotateSelected('station',1)===false&&rotateBlocked.nodes[0].yaw===0);
const rotateClear={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:-1,id:'can_std',x:0,y:0,z:12,yaw:0}],groups:[]};
assembly3d.scene.userData.assemblyLayout=rotateClear;
check('rotate command commits an actual clear quarter-turn', assembly3dRotateSelected('station',1)===true&&Math.abs(rotateClear.nodes[0].yaw-Math.PI/2)<1e-9);
assembly3dPlaceNode=savedPlaceNode; assembly3d=savedAssembly; assembly3dSelection=savedSelection;
const legacyPorts={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0,yaw:0},{index:1,parent:0,id:'can_std',x:5,y:0,z:0,yaw:0}]};
check('an old generated parent link reserves its inferred collar', assembly3dPortOccupied(legacyPorts,0,'east',null)===true);
const generatedConnection=assembly3dConnectionPorts(legacyPorts,legacyPorts.nodes[1]);
check('generated parent links infer both docking collars before rotation', generatedConnection&&generatedConnection.targetPort==='east'&&generatedConnection.ownPort==='west');
legacyPorts.nodes[1].dockTargetPort='north'; legacyPorts.nodes[1].dockOwnPort='south';
const explicitConnection=assembly3dConnectionPorts(legacyPorts,legacyPorts.nodes[1]);
check('explicit docking collars remain authoritative over generated geometry', explicitConnection&&explicitConnection.targetPort==='north'&&explicitConnection.ownPort==='south');
const tree={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0},{index:1,parent:0,id:'can_std',x:4,y:0,z:0},{index:2,parent:1,id:'can_std',x:8,y:0,z:0}]};
check('docking a root to its descendant identifies only the path branch to detach', assembly3dDockReattachmentChild(tree,0,2)===1);
const corrupt={mode:'station',nodes:[{index:0,parent:-1,id:'can_std',x:0,y:0,z:0},{index:1,parent:2,id:'can_std',x:4,y:0,z:0},{index:2,parent:1,id:'can_std',x:8,y:0,z:0}]};
check('an unrelated corrupt legacy cycle is rejected without traversal loop', assembly3dDockReattachmentChild(corrupt,0,1)===undefined);
tree.nodes[1].dockOwnPort='west';
check('a target module reserves its own parent-facing collar', assembly3dOwnPortOccupied(tree,1,'west',null)===true);
check('clicks and pointer cancels do not commit a layout move', !assembly3dDragShouldCommit({moved:false},{type:'pointerup'})&&!assembly3dDragShouldCommit({moved:true},{type:'pointercancel'}));
check('assembly shell tells players to use docking collars', assemblyShellHTML('station').includes('cyan docking collar'));
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
check('assembly chrome makes rotation discoverable and announces selection feedback', assemblyChrome.includes('Rotate 90°')&&assemblyChrome.includes('stationAssemblyStatus')&&assemblyChrome.includes('[ / ] or Shift+R / R'));
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
