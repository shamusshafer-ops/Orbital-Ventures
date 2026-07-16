// E3.6 — bench polish: undo/redo history, part deletion, blueprint toggle, palette tooltips.
// Validates the undo stack round-trips build state exactly, redo works, delete removes a part+subtree
// and is undoable, the root can't be deleted, blueprint toggle flips a flag, and tooltips carry the
// part's historical flavor.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- helper: force the bench onto a known fresh build ----------
function freshBench(){ _benchBuild=emptyBuild('capsule_mk1'); _benchUndo=[]; _benchRedo=[]; _benchSelNode=null; return benchBuild(); }

// ---------- 1. Undo restores the prior build exactly ----------
{
  const b=freshBench();
  benchPushUndo();
  attachPart(b, b.root, 'bot', 'tank_std');
  check('undo: build grew to 2 parts', benchBuild().parts.length===2);
  benchUndo();
  check('undo: restored to 1 part', benchBuild().parts.length===1);
  check('undo: redo stack now has the undone state', _benchRedo.length===1);
}

// ---------- 2. Redo re-applies ----------
{
  freshBench();
  const b=benchBuild();
  benchPushUndo(); attachPart(b, b.root, 'bot', 'tank_std');
  benchUndo();
  check('redo: back to 1 before redo', benchBuild().parts.length===1);
  benchRedo();
  check('redo: re-applied to 2 parts', benchBuild().parts.length===2);
}

// ---------- 3. A new mutation clears the redo stack ----------
{
  freshBench();
  let b=benchBuild();
  benchPushUndo(); attachPart(b, b.root, 'bot', 'tank_std');
  benchUndo(); // redo now has 1
  check('redo-clear: redo populated after undo', _benchRedo.length===1);
  benchPushUndo(); b=benchBuild(); attachPart(b, b.root, 'bot', 'tank_std'); // a fresh mutation
  check('redo-clear: new mutation cleared the redo stack', _benchRedo.length===0);
}

// ---------- 4. Undo stack is capped ----------
{
  freshBench();
  for(let i=0;i<BENCH_UNDO_CAP+15;i++){ benchPushUndo(); }
  check('cap: undo stack never exceeds BENCH_UNDO_CAP', _benchUndo.length<=BENCH_UNDO_CAP);
}

// ---------- 5. Delete removes a part + subtree, is undoable, root protected ----------
{
  const b=freshBench();
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  const eng=attachPart(b, tank, 'bot', 'engine_a4');
  check('delete: setup has 3 parts', benchBuild().parts.length===3);
  benchDeletePart(tank); // removes tank + engine subtree
  check('delete: removed the tank and its engine (back to 1)', benchBuild().parts.length===1);
  benchUndo();
  check('delete: undo restores the deleted subtree', benchBuild().parts.length===3);
  // root can't be deleted
  const rootUid=benchBuild().root;
  benchDeletePart(rootUid);
  check('delete: root is protected', benchBuild().parts.some(p=>p.uid===rootUid));
}

// ---------- 6. Blueprint toggle flips the flag ----------
{
  const before=_benchBlueprint;
  benchToggleBlueprint();
  check('blueprint: toggle flips the flag', _benchBlueprint===!before);
  benchToggleBlueprint();
  check('blueprint: toggles back', _benchBlueprint===before);
}

// ---------- 7. Tooltips carry the part's flavor ----------
{
  const card=partPaletteCard(partDef('engine_a4'));
  check('tooltip: card has a title attribute', card.includes('title="'));
  check('tooltip: engine tooltip names its heritage engine', card.includes('V-2') || card.includes('A-4'));
  const tankCard=partPaletteCard(partDef('tank_std'));
  check('tooltip: tank tooltip includes its blurb', tankCard.includes('backbone') || tankCard.includes('propellant'));
}

// ---------- 8. Undo snapshots are deep clones (mutating the live build doesn't corrupt history) ----------
{
  const b=freshBench();
  benchPushUndo();
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  // mutate the live build further
  attachPart(b, tank, 'bot', 'engine_a4');
  // the undo snapshot should still be the original 1-part build, untouched
  benchUndo();
  check('deep-clone: undo snapshot was not mutated by later edits', benchBuild().parts.length===1);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
