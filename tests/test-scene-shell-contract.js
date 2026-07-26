// Mission Control shell Phase 1: the scene registry is the one contract for
// navigation, view ownership, rail placement, and future layout variants.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _els={};
const _get=document.getElementById.bind(document);
document.getElementById=(id)=>_els[id]||(_els[id]=_get(id));

newGame('engineer');

const expected={
  bench:'workspace', station:'assembly', base:'assembly', map:'immersive', command:'immersive', rnd:'workspace',
};
check('six primary scenes are registered', SCENE_TABS.length===6 && Object.keys(expected).every(id=>SCENE_TABS.includes(id)));
check('Base Bench is a real scene', isSceneTab('base')===true && sceneDef('base').viewId==='baseView');
check('every scene has the complete shell contract', SCENE_TABS.every(id=>{
  const d=sceneDef(id);
  return d && d.id===id && d.label && d.icon && d.layout && d.viewId && d.navId && d.badgeId && d.railId && d.dockOrder;
}));
check('scene variants match the planned shell families', Object.keys(expected).every(id=>sceneDef(id).layout===expected[id]));
check('unknown tabs are not scenes', sceneDef('missions')===null && isSceneTab('missions')===false);

state.tab='base';
renderChromeShellRail();
check('Base applies the assembly scene class without retired scene/panel state classes', _els.appShell.classList.contains('scene-assembly') && !_els.appShell.classList.contains('viewing-scene') && !_els.appShell.classList.contains('viewing-panel'));

renderChromeTabsViews();
const dockHTML=_els.sceneNav.innerHTML;
check('the permanently mounted dock renders all six registry entries', SCENE_TABS.every(id=>dockHTML.includes(`id="${sceneDef(id).navId}"`) && dockHTML.includes(`setTab('${id}')`)));
check('the dock preserves Mission Control navigation order', SCENE_DOCK_TABS.join(',')==='command,bench,rnd,map,station,base');

const fs=require('fs'), path=require('path');
const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
const renderSource=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
const shellSource=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
check('rendering no longer moves the scene navigation DOM', !/move\('sceneNav'/.test(renderSource));
check('the dock has one shared shell home', /class="scene-dock cc-dock" id="ccDock"><nav class="rail-nav" id="sceneNav"/.test(shellSource));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
