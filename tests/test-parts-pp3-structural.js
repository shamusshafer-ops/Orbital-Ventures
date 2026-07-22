// PP.3 — diameter tank tiers + adapters. Unsticks the 8 PP.1 engine parts that were correctly,
// deliberately refused by the diameter gate because the game had only one tank ('small'-class
// tank_std). Adds tank_tiny/tank_large/tank_huge (matching the 3 non-small NODE_CLASS tiers) plus
// three adapters (tiny<->small, small<->large, large<->huge) so the existing small-class payload/
// decoupler/nosecone parts can cap ANY diameter stack, instead of needing 4x redundant copies of
// every structural/payload part.
//
// Same equivalence convention as PP.1: stackPerformance(ir.stages, ir.payload) — the bridge-core
// path — not stackPerformanceForBuild (which layers E3.4 aero effects on top by design).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function near(a,b,tol){ return Math.abs(a-b) <= (tol!=null?tol:0.5); }

const NEW_TANKS = ['tank_tiny','tank_large','tank_huge'];
const NEW_ADAPTERS = ['adapter_tiny_small','adapter_small_large','adapter_large_huge'];
const PENDING_FROM_PP1 = ['engine_vernier','engine_h1','engine_f1','engine_methalox','engine_aj10','engine_j2','engine_rl10','booster_srb'];
const TANK_FOR_CLASS = {tiny:'tank_tiny', small:'tank_std', large:'tank_large', huge:'tank_huge'};

// ---------- 0. data integrity: 3 tanks + 3 adapters exist, correctly shaped ----------
{
  check('count: 3 new tanks landed', NEW_TANKS.every(id=>!!PART_DEFS[id]));
  check('count: 3 new adapters landed', NEW_ADAPTERS.every(id=>!!PART_DEFS[id]));
  check('all 3 new tanks + 3 new adapters are present (this slice\'s delta, not a global total)',
    NEW_TANKS.every(id=>!!PART_DEFS[id]) && NEW_ADAPTERS.every(id=>!!PART_DEFS[id]));
  for(const id of NEW_TANKS){
    const d=PART_DEFS[id];
    check('tank: '+id+' has top/bottom/radial nodes', ['top','bot','rad'].every(n=>d.nodes.some(x=>x.id===n)));
    check('tank: '+id+' all 3 nodes share one class (matches its own tier)', new Set(d.nodes.map(n=>n.class)).size===1);
    check('tank: '+id+' carries propMass (stretchable, same contract as tank_std)', d.phys.propMass>0);
    check('tank: '+id+' is base:true (no research gate — diameter is structural, not tech)', d.base===true);
  }
  check('adapter: adapter_tiny_small bridges tiny<->small', PART_DEFS.adapter_tiny_small.nodes.map(n=>n.class).sort().join(',')==='small,tiny');
  check('adapter: adapter_small_large bridges small<->large', PART_DEFS.adapter_small_large.nodes.map(n=>n.class).sort().join(',')==='large,small');
  check('adapter: adapter_large_huge bridges large<->huge', PART_DEFS.adapter_large_huge.nodes.map(n=>n.class).sort().join(',')==='huge,large');
  for(const id of NEW_ADAPTERS){
    const d=PART_DEFS[id];
    check('adapter: '+id+' has exactly 2 nodes, opposite facing', d.nodes.length===2 &&
      ((d.nodes[0].at==='top'&&d.nodes[1].at==='bottom')||(d.nodes[0].at==='bottom'&&d.nodes[1].at==='top')));
    check('adapter: '+id+' carries no propMass (pure structure)', !d.phys.propMass);
    check('adapter: '+id+' is base:true', d.base===true);
  }
}

// ---------- 1. every one of the 8 PP.1-stranded parts now attaches to its matching tank tier ----------
{
  newGame('engineer');
  for(const partId of PENDING_FROM_PP1){
    const def=PART_DEFS[partId], cls=def.nodes[0].class, tankId=TANK_FOR_CLASS[cls];
    const b=emptyBuild(tankId); // tank as root — isolates engine<->tank node compatibility
    const chk = def.nodes[0].at==='radial' ? canAttach(b, b.root, 'rad', partId) : canAttach(b, b.root, 'bot', partId);
    check('unstuck: '+partId+' (class '+cls+') now attaches to '+tankId, chk.ok);
  }
}

// ---------- 2. adapters correctly connect their two declared classes, and correctly refuse a third ----------
{
  newGame('engineer');
  // small_large: a small part above, a large part below
  {
    const b=emptyBuild('capsule_mk1');
    const ad=attachPart(b, b.root, 'bot', 'adapter_small_large');
    check('adapter-use: capsule (small) attaches above adapter_small_large', !!ad);
    const tank=attachPart(b, ad, 'bot', 'tank_large');
    check('adapter-use: tank_large (large) attaches below adapter_small_large', !!tank);
    // sanity: a HUGE part should NOT fit the large-facing bottom node
    const chk=canAttach(b, ad, 'bot', 'tank_huge');
    check('adapter-use: adapter_small_large correctly refuses a huge-class part on its large-facing node', !chk.ok);
  }
  // large_huge chained onto small_large gives a full small->large->huge taper
  {
    const b=emptyBuild('capsule_mk1');
    const ad1=attachPart(b, b.root, 'bot', 'adapter_small_large');
    const tL=attachPart(b, ad1, 'bot', 'tank_large');
    const ad2=attachPart(b, tL, 'bot', 'adapter_large_huge');
    const tH=attachPart(b, ad2, 'bot', 'tank_huge');
    check('adapter-chain: small->large->huge taper builds end to end', [ad1,tL,ad2,tH].every(x=>!!x));
  }
}

// ---------- 3. full cross-tier stack bridges correctly: capsule -> adapters -> huge tank -> F-1 ----------
{
  newGame('engineer');
  state.unlocked.f1_class=true;
  const b=emptyBuild('capsule_mk1');
  const ad1=attachPart(b, b.root, 'bot', 'adapter_small_large');
  const tL=attachPart(b, ad1, 'bot', 'tank_large');
  const ad2=attachPart(b, tL, 'bot', 'adapter_large_huge');
  const tH=attachPart(b, ad2, 'bot', 'tank_huge');
  const eng=attachPart(b, tH, 'bot', 'engine_f1');
  check('cross-tier: full small->huge F-1 stack built with no null uids', [ad1,tL,ad2,tH,eng].every(x=>!!x));
  const ir=buildToStageIR(b);
  check('cross-tier: bridge produces no error', !ir.error);
  if(!ir.error){
    check('cross-tier: single stage, correct engine', ir.stages.length===1 && ir.stages[0].eng==='f1_class');
    // tank_large (20.0) + tank_huge (46.0) are in the SAME group (adapters don't split stages,
    // only decouplers do) — a tapered single stage with two tank sections feeding one engine.
    // This is correct, pre-existing accumulation behavior, not new PP.3 logic.
    check('cross-tier: propellant sums both tank sections (20+46=66, no decoupler between them)',
      near(ir.stages[0].prop, 66, 0.01));
    const perfCore=stackPerformance(ir.stages, ir.payload);
    check('cross-tier: stack produces positive, finite Δv', perfCore.totalDv>0 && isFinite(perfCore.totalDv));
    check('cross-tier: stack produces positive liftoff TWR', perfCore.stageTwr[0]>0);
  }
}

// ---------- 4. per-tier equivalence: a large-tank + H-1 stage matches the direct slider path ----------
{
  newGame('engineer');
  state.unlocked.kerolox_mk3=true;
  const b=emptyBuild('capsule_mk1');
  const ad=attachPart(b, b.root, 'bot', 'adapter_small_large');
  const tank=attachPart(b, ad, 'bot', 'tank_large');
  buildPart(b,tank)._propOverride=18.0;
  const eng=attachPart(b, tank, 'bot', 'engine_h1');
  check('equiv: large-tier stack attaches cleanly', !!eng);
  const ir=buildToStageIR(b);
  check('equiv: bridge produces no error', !ir.error);
  if(!ir.error){
    check('equiv: resolves to kerolox_mk3', ir.stages[0].eng==='kerolox_mk3');
    check('equiv: stage dia reflects the large tank (not defaulted to 1.0)', ir.stages[0].dia>1.0);
    const perfGraph=stackPerformance(ir.stages, ir.payload);
    // NOTE: ir.payload correctly includes the adapter's dry mass (0.15t) folded in alongside
    // the capsule's 1.2t — it is NOT just the capsule. Using ir.payload on both sides (rather
    // than a hardcoded capsule-only figure) is what makes this an apples-to-apples equivalence
    // check; a hardcoded 1.2 would silently ignore the adapter's real mass contribution.
    const perfDirect=stackPerformance([{eng:'kerolox_mk3', count:1, prop:18.0, dia:ir.stages[0].dia}], ir.payload);
    check('equiv: large-tier total Δv matches the direct path with the same dia', near(perfGraph.totalDv, perfDirect.totalDv, 1.0));
  }
}

// ---------- 5. tiny tier: a tiny tank + RL10 upper stage attaches and bridges ----------
{
  newGame('engineer');
  state.unlocked.hydrolox_rl10=true;
  const b=emptyBuild('tank_tiny');
  buildPart(b, b.root)._propOverride=1.5;
  const eng=attachPart(b, b.root, 'bot', 'engine_rl10');
  check('tiny-tier: RL10 attaches to a tiny tank', !!eng);
  const ir=buildToStageIR(b);
  check('tiny-tier: bridge produces no error', !ir.error);
  if(!ir.error) check('tiny-tier: resolves to hydrolox_rl10', ir.stages[0].eng==='hydrolox_rl10');
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
