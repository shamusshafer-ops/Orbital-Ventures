// E3.2 model layer — attach / detach / node validation. The DOM drag-drop UI sits on top of these
// pure functions, so the hard logic (what connects where, what separates with what) is proven here
// before any pointer math. Validates: open-node discovery, node compatibility (class match + facing),
// attach success/failure, detach-takes-subtree, snap-target finding, and soft warnings.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. Open-node discovery ----------
{
  const b=emptyBuild('capsule_mk1'); // capsule has only a 'bot' node
  check('open: fresh capsule exposes its bottom node', openNodes(b, b.root).some(n=>n.id==='bot'));
  check('open: capsule has exactly 1 open node', openNodes(b, b.root).length===1);
  const tankUid=attachPart(b, b.root, 'bot', 'tank_std');
  check('open: after attaching a tank, capsule bottom is occupied', !openNodes(b, b.root).some(n=>n.id==='bot'));
  check('open: tank still has its bottom open (top now used)', openNodes(b, tankUid).some(n=>n.id==='bot') && !openNodes(b, tankUid).some(n=>n.id==='top'));
}

// ---------- 2. Node compatibility rules ----------
{
  const small_top={id:'top',at:'top',class:'small'}, small_bot={id:'bot',at:'bottom',class:'small'};
  const large_top={id:'top',at:'top',class:'large'}, rad={id:'r',at:'radial',class:'small'};
  check('compat: small bottom accepts small top', nodesCompatible(small_bot, small_top));
  check('compat: small top rejects small top (same facing)', !nodesCompatible(small_top, small_top));
  check('compat: class mismatch rejected', !nodesCompatible(small_bot, large_top));
  check('compat: radial-to-radial ok', nodesCompatible(rad, {id:'r2',at:'radial',class:'small'}));
  check('compat: radial rejects axial', !nodesCompatible(rad, small_top));
}

// ---------- 3. canAttach success + failure reasons ----------
{
  const b=emptyBuild('capsule_mk1');
  check('canAttach: tank onto capsule bottom ok', canAttach(b, b.root, 'bot', 'tank_std').ok);
  check('canAttach: engine cannot mount directly to capsule', !canAttach(b, b.root, 'bot', 'engine_a4').ok);
  check('canAttach: unknown part rejected', !canAttach(b, b.root, 'bot', 'no_such_part').ok);
  check('canAttach: unknown node rejected', !canAttach(b, b.root, 'nope', 'tank_std').ok);
  attachPart(b, b.root, 'bot', 'tank_std');
  check('canAttach: occupied node rejected', !canAttach(b, b.root, 'bot', 'tank_std').ok);
  check('canAttach: reason given for occupied', canAttach(b, b.root, 'bot', 'tank_std').why==='node occupied');
}

// ---------- 4. attachPart builds a valid graph ----------
{
  const b=emptyBuild('capsule_mk1');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  const eng=attachPart(b, tank, 'bot', 'engine_a4');
  check('attach: returns uids', !!tank && !!eng);
  check('attach: graph has 3 parts', b.parts.length===3);
  check('attach: graph has 2 links', b.links.length===2);
  check('attach: reduces to 1 propulsive stage', buildToStageIR(b).stages.length===1);
  check('attach: invalid attach returns null, no mutation', attachPart(b, b.root, 'bot', 'tank_std')===null && b.parts.length===3);
}

// ---------- 5. detach takes the whole subtree, never the root ----------
{
  const b=emptyBuild('capsule_mk1');
  const tank1=attachPart(b, b.root, 'bot', 'tank_std');
  const dec=attachPart(b, tank1, 'bot', 'decoupler');
  const tank2=attachPart(b, dec, 'bot', 'tank_std');
  const eng=attachPart(b, tank2, 'bot', 'engine_a4');
  check('detach: setup has 5 parts', b.parts.length===5);
  const removed=detachPart(b, dec); // removing the decoupler takes tank2 + eng with it
  check('detach: removed the decoupler + everything below (3 parts)', removed.length===3);
  check('detach: build left with capsule + tank1', b.parts.length===2);
  check('detach: root cannot be detached', detachPart(b, b.root).length===0 && b.parts.length===2);
  check('detach: links pruned (no dangling)', b.links.every(l=>buildPart(b,l.parent)&&buildPart(b,l.child)));
}

// ---------- 6. findSnapTarget picks the nearest compatible open node ----------
{
  const b=emptyBuild('capsule_mk1');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  // fake node positions: capsule bottom at (100,100), tank bottom at (100,200)
  const nodeXY=(uid,nid)=>{
    if(uid===b.root && nid==='bot') return {x:100,y:100}; // occupied — should be skipped
    if(uid===tank && nid==='bot') return {x:100,y:200};
    return null;
  };
  // dropping an engine near the tank bottom should snap there (capsule bottom is occupied anyway)
  const snap=findSnapTarget(b, 'engine_a4', 105, 195, nodeXY, 40);
  check('snap: finds the tank bottom for an engine drop', snap && snap.parentUid===tank && snap.parentNode==='bot');
  // dropping far away returns null (free placement / no snap)
  check('snap: far drop returns null', findSnapTarget(b, 'engine_a4', 500, 500, nodeXY, 40)===null);
  // engine can't snap to an occupied capsule bottom even if closest
  const snap2=findSnapTarget(b, 'tank_std', 100, 100, nodeXY, 40);
  check('snap: skips occupied nodes', !snap2 || snap2.parentUid!==b.root);
}

// ---------- 7. buildWarnings surfaces soft issues without blocking ----------
{
  const b=emptyBuild('probe_core'); // has avionics
  attachPart(b, b.root, 'bot', 'tank_std');
  const t=stackSpine(b); const eng=attachPart(b, t[t.length-1].uid, 'bot', 'engine_a4');
  check('warnings: a valid controlled rocket has no avionics warning', !buildWarnings(b).some(w=>w.includes('avionics')));

  // a build with no avionics part should warn
  const b2={parts:[{uid:'t',defId:'tank_std',x:0,y:0,rot:0,sym:1}], links:[], root:'t'};
  const eng2=attachPart(b2, 't', 'bot', 'engine_a4');
  check('warnings: no-avionics build warns (but still builds)', buildWarnings(b2).some(w=>w.includes('avionics')));
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
