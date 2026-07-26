// Solar System shell pilot: keep the existing roster DOM node, but place it in
// the shared contextual left slot for normal map use and back in the monitor for expand.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _els={};
const _get=document.getElementById.bind(document);
document.getElementById=(id)=>_els[id]||(_els[id]=_get(id));

newGame('engineer');
state.tab='map';
mapExpanded=false;
renderChromeShellRail();
renderCCLeft();

check('map scene declares the roster contextual slot', sceneDef('map').leftSlot==='mapRoster');
check('normal map mounts the existing roster in the left slot', _els.mapRoster.parentNode===_els.mapRosterSlot && !_els.mapRosterSlot.classList.contains('hidden'));
check('normal map hides the generic left-rail advisor', _els.ccLeft.classList.contains('hidden'));
check('map keeps the shared immersive shell class', _els.appShell.classList.contains('scene-immersive') && _els.appShell.classList.contains('has-contextual-left'));

mapExpanded=true;
placeSceneContextualSlots();
renderCCLeft();
check('expanded map returns the same roster node to the monitor', _els.mapRoster.parentNode===_els.mapRosterHome && _els.mapRosterSlot.classList.contains('hidden'));
check('expanded map does not leave the generic advisor suppressed', !_els.ccLeft.classList.contains('hidden'));

const fs=require('fs'), path=require('path');
const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
const renderSrc=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
check('map monitor keeps one roster host and one shared-slot destination', /id="mapRosterSlot"/.test(shell) && /id="mapRosterHome"><div id="mapRoster"/.test(shell));
check('map expansion reuses placement instead of duplicating renderer state', /function toggleMapExpand\(\)\{ mapExpanded=!mapExpanded; placeSceneContextualSlots\(\); renderCCLeft\(\); renderMap\(\); \}/.test(renderSrc));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
