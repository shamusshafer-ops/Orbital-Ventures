// E3.2 interaction logic — the pure decision-making behind the DOM handlers (palette rendering,
// click-attach auto-targeting, drop→snap→attach). The raw pointer/DOM plumbing can't run headlessly,
// but everything that DECIDES what happens is pure and tested here. Complements test-parts-attach.js
// (the model layer) with the UI-controller logic on top.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. Palette renders all categories with cards ----------
{
  const html=renderPartsPalette();
  check('palette: has all 4 category headers', ['STRUCTURAL','PROPULSION','AVIONICS','PAYLOAD'].every(c=>html.includes(c)));
  check('palette: tank card present + draggable', html.includes('data-partid="tank_std"') && html.includes('draggable="true"'));
  check('palette: engine card shows thrust stat', html.includes('kN'));
  check('palette: capsule card shows crew stat', html.includes('crew'));
}

// ---------- 2. Reset produces a clean single-part build ----------
{
  benchReset();
  const b=benchBuild();
  check('reset: single root part', b.parts.length===1);
  check('reset: root is a capsule', partDef(b.parts[0].defId).cat==='payload');
  check('reset: selection cleared', typeof _benchSelNode==='undefined' || _benchSelNode===null);
}

// ---------- 3. Auto-target click-attach: exactly one open node -> attaches without manual select ----------
{
  benchReset();
  const b=benchBuild();
  // capsule has exactly one open node (bottom) — palette click should attach there with no selection
  _benchSelNode=null;
  benchPaletteClick('tank_std');
  check('click-attach: auto-targets the single open node', benchBuild().parts.length===2);
  check('click-attach: the tank is now linked under the capsule', benchBuild().links.length===1);
  // now there are 2 open nodes (tank bottom + ... actually just tank bottom; capsule bottom used) -> still 1 open
  // add an engine: tank bottom is the only open node again -> auto-target
  benchPaletteClick('engine_a4');
  check('click-attach: chains onto the next single open node', benchBuild().parts.length===3);
  check('click-attach: reduces to a valid 1-stage rocket', buildToStageIR(benchBuild()).stages.length===1);
}

// ---------- 4. Click-attach with an explicit selected node ----------
{
  benchReset();
  const b=benchBuild();
  // select the capsule bottom explicitly, then click a tank
  const key=b.root+':bot';
  benchNodeClick(key);
  check('select: node click sets the selection', _benchSelNode===key);
  benchPaletteClick('tank_std');
  check('select: attaches to the explicitly selected node', benchBuild().parts.length===2);
  check('select: selection cleared after attach', _benchSelNode===null);
  benchNodeClick('x:y'); benchNodeClick('x:y');
  check('select: clicking the same node twice toggles it off', _benchSelNode===null);
}

// ---------- 5. Rejected click-attach doesn't mutate ----------
{
  benchReset();
  const b=benchBuild();
  attachPart(b, b.root, 'bot', 'tank_std'); // capsule bottom now occupied
  const before=b.parts.length;
  _benchSelNode=b.root+':bot'; // deliberately target the occupied node
  benchPaletteClick('tank_std');
  check('reject: attaching to an occupied node does not add a part', benchBuild().parts.length===before);
}

// ---------- 6. Drop→snap path (findSnapTarget with a mocked nodePos, mirroring the drop handler) ----------
{
  benchReset();
  const b=benchBuild();
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  // simulate the render having exposed node positions
  const map={};
  map[b.root+':bot']={x:130,y:100}; // occupied
  map[tank+':bot']={x:130,y:220};
  // dropping an engine near the tank bottom snaps there
  const snap=findSnapTarget(b, 'engine_a4', 128, 215, (uid,nid)=>map[uid+':'+nid], 44);
  check('drop-snap: engine snaps to the open tank bottom', snap && snap.parentUid===tank);
  // committing the snap (as benchCanvasDrop does) grows the build
  if(snap){ attachPart(b, snap.parentUid, snap.parentNode, 'engine_a4'); }
  check('drop-snap: commit adds the engine', b.parts.length===3);
  // a drop with nothing compatible nearby snaps to nothing
  check('drop-snap: far/incompatible drop finds no target', findSnapTarget(b, 'engine_a4', 600, 600, (uid,nid)=>map[uid+':'+nid], 44)===null);
}

// ---------- 7. renderBuildSVG interactive mode exposes nodePos + open-node markers ----------
{
  benchReset();
  const b=benchBuild();
  attachPart(b, b.root, 'bot', 'tank_std');
  const r=renderBuildSVG(b, 260, 420, true);
  check('interactive: returns a nodePos map', r.nodePos && typeof r.nodePos==='object');
  const tankUid=stackSpine(b)[1].uid;
  check('interactive: nodePos includes the open tank bottom', !!r.nodePos[tankUid+':bot']);
  check('interactive: draws open-node markers', r.svg.includes('Open '));
  // non-interactive render omits markers
  check('interactive: static render has no node markers', !renderBuildSVG(b,260,420,false).svg.includes('Open '));
}

// ---------- 8. Starter templates and context-aware suggestions ----------
{
  benchApplyPreset('orbital');
  check('preset: orbital launcher creates a crewed two-stage graph', benchBuild().parts.filter(p=>p.defId==='decoupler').length===1 && buildToStageIR(benchBuild()).stages.length===2);
  check('preset: orbital launcher has a valid bridge', !buildToStageIR(benchBuild()).error);
  benchReset();
  const b=benchBuild();
  _benchSelNode=b.root+':bot';
  const compatible=Object.values(PART_DEFS).filter(d=>canAttach(b,b.root,'bot',d.id).ok).map(d=>d.id);
  check('suggestions: capsule target offers a tank', compatible.includes('tank_std'));
  check('suggestions: capsule target rejects an engine', !compatible.includes('engine_a4'));
}

// ---------- 9. Palette filtering and part hit-target metadata ----------
{
  benchSetPaletteFilter('engine');
  const filtered=renderPartsPalette();
  check('palette: search keeps the engine and hides unrelated parts', filtered.includes('engine_a4') && !filtered.includes('tank_std'));
  benchSetPaletteFilter('');
  const r=renderBuildSVG(benchBuild(),260,420,true);
  check('interactive: renderer exposes selectable part ranges', Array.isArray(r.partPos) && r.partPos.length===1);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
