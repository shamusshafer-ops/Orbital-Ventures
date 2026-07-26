// Phase 3 assembly-shell contract: Station and Base share chrome + palette placement,
// while their SVG projections and state remain distinct. Base pop-out is read-only parity.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _els={};
const _get=document.getElementById.bind(document);
document.getElementById=(id)=>_els[id]||(_els[id]=_get(id));

newGame('engineer');
const _assemblyStationScene=sceneDef('station'), _assemblyBaseScene=sceneDef('base');
check('Station and Base declare a shared assembly contract', [_assemblyStationScene,_assemblyBaseScene].every(d=>d.layout==='assembly' && d.leftSlot==='assemblyPalette' && d.assembly && d.assembly.canvasId && d.assembly.inspectorId && d.assembly.paletteHomeId));
check('assembly configuration gives both scenes feature-configured pop-outs', _assemblyStationScene.assembly.popout==='openStationPopout' && _assemblyBaseScene.assembly.popout==='openBasePopout');

state.tab='station';
renderChromeShellRail(); renderChromeTabsViews(); renderCCLeft(); renderStation();
check('Station places its blueprint palette in the shared left slot', !_els.assemblyPaletteSlot.classList.contains('hidden') && _els.assemblyPaletteSlot.innerHTML.includes('Blueprint modules'));
check('Station board keeps renderer art separate from its palette', !_els.stationCanvas.innerHTML.includes('Blueprint modules'));
check('Station hides the generic advisor while the assembly palette owns the left slot', _els.ccLeft.classList.contains('hidden'));

stationExpanded=true;
placeSceneContextualSlots(); renderCCLeft(); renderStation();
check('Station expand moves the palette inline without duplicating it', _els.assemblyPaletteSlot.classList.contains('hidden') && !_els.stationPaletteHome.classList.contains('hidden') && _els.stationPaletteHome.innerHTML.includes('Blueprint modules'));
stationExpanded=false;

state.tab='base';
renderChromeShellRail(); renderChromeTabsViews(); renderCCLeft(); renderBase();
check('Base places its body-aware blueprint palette in the shared left slot', !_els.assemblyPaletteSlot.classList.contains('hidden') && _els.assemblyPaletteSlot.innerHTML.includes('Luna') && _els.assemblyPaletteSlot.innerHTML.includes('Mars'));
check('Base board keeps surface SVG separate from palette controls', !_els.baseCanvas.innerHTML.includes('Clear blueprint'));

try{ openBasePopout(); check('Base pop-out opens without mutating base state', basePopoutOpen===true && baseCurrentView().isDraft===true); }
catch(e){ check('Base pop-out opens without mutating base state', false); }
try{ closeBasePopout(); check('Base pop-out closes cleanly', basePopoutOpen===false); }
catch(e){ check('Base pop-out closes cleanly', false); }

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
