// Decision-loop roadmap Phase 4c (2026-11-18): the Station Bench and Base Bench share one "Outposts" nav stop.
// Both boards stay (orbital and surface assembly are different renderers); one switcher lists every outpost.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;

newGame('engineer'); state.uiLayer='advanced';
check('one nav stop for both boards', SCENE_DOCK_TABS.includes('station') && !SCENE_DOCK_TABS.includes('base') && sceneDef('station').label==='Outposts' && sceneDef('base').navAlias==='station');
check('both boards still exist as scenes', isSceneTab('station') && isSceneTab('base'));
check('the base board steps from the Outposts position', sceneNavOwner('base')==='station' && sceneAtOffset('base',1)===sceneAtOffset('station',1));

// the Outposts button reopens the last board
/* setTab switches after a short fade; the board choice is what openOutposts decides, so capture its target */
const target=()=>{ let t=null; const real=setTab; setTab=x=>{ t=x; return true; }; try{ openOutposts(); } finally{ setTab=real; } return t; };
state.outpostTab=null;
check('a fresh game opens the station board', target()==='station');
setTab('base');
check('setTab remembers the board', state.outpostTab==='base');
setTab('command');
check('Outposts reopens the board last used', target()==='base');
setTab('station'); setTab('command');
check('…either one', target()==='station');

// the switcher
{
  newGame('engineer'); state.money=5000; state.uiLayer='advanced';
  state.tab='station'; const draft=outpostSwitcherHTML(null);
  check('no outposts yet: the switcher offers both drafting boards', /Plan a station/.test(draft) && /Plan a base/.test(draft) && /setTab\('base'\)/.test(draft));
  state.completed.crew_orbit=true; foundFacility('leo_station');
  const one=outpostSwitcherHTML('leo_station');
  check('with a station: it is listed, and a base can still be planned', /goOutpost\('leo_station'\)/.test(one) && /Plan a base/.test(one) && !/Plan a station/.test(one));
  state.facilities.lunar_base={built:true, modules:1, since:1970, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, maintenanceEnabled:true, condition:100, crewIds:[], crewManaged:false, rotationDueAbs:0, moduleList:['can_std']};
  const both=outpostSwitcherHTML('leo_station');
  check('orbital and surface outposts in one list', /goOutpost\('leo_station'\)/.test(both) && /goOutpost\('lunar_base'\)/.test(both) && !/Plan a/.test(both));
  goOutpost('lunar_base');
  check('picking a surface outpost opens the base board on it', state.outpostTab==='base' && state.baseFocus==='lunar_base');
  goOutpost('leo_station');
  check('picking the station opens the station board on it', state.outpostTab==='station' && state.stationFocus==='leo_station');
  check('the focused outpost is highlighted', /class="btn launch outpost-pick"[^>]*onclick="goOutpost\('leo_station'\)"/.test(outpostSwitcherHTML('leo_station')));
}

// nav rendering and Basic view
{
  newGame('engineer'); state.uiLayer='advanced'; render();
  const dock=(document.getElementById('sceneNav')||{}).innerHTML||'';
  check('the dock has the Outposts button and no separate Base button', /id="tabStation"[^>]*onclick="openOutposts\(\)"/.test(dock) && !/id="tabBase"/.test(dock) && />Outposts</.test(dock));
  state.tab='base'; render();
  check('the Outposts button is lit on the base board too', (()=>{ const t=document.getElementById('tabStation'); return !!t && t.classList.contains('active'); })());
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
