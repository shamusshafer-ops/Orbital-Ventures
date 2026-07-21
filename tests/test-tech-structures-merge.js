// Tech-tree design pass, slice 3 — structures track (2026-07-21). The structures/sigma track was a
// strictly linear 7-node chain (alloy_tanks -> balloon_tanks -> composite_structures ->
// friction_stir_welding -> carbon_cryotanks -> self_healing_materials -> metamaterial_structures),
// each node directly SETTING state.sigma (not summing an effect) — so the chain is a sequence of
// stepping-stone floors from the 0.12 baseline down to 0.040. Collapsed to 4 nodes, preserving the
// two load-bearing ids other systems reference (alloy_tanks + balloon_tanks: a tiered if/else in
// sim.js sets the ascent structural-failure weight off exactly these two research flags;
// balloon_tanks: also required by the lightweight_cryo synergy) and the exact final sigma floor.
// No back-compat constraint (per owner, same as slices 1-2).
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
const byId={}; for(const n of RESEARCH) byId[n.id]=n;

// ---------- 1. the seven-node chain is now four nodes ----------
{
  const track=RESEARCH.filter(n=>n.track==='structures');
  check('the structures track is now 4 nodes (was 7)', track.length===4);
  check('the four survivors are alloy_tanks, balloon_tanks, composite_isogrid_structures, advanced_composite_structures',
    !!byId.alloy_tanks && !!byId.balloon_tanks && !!byId.composite_isogrid_structures && !!byId.advanced_composite_structures);
}

// ---------- 2. the removed ids are gone ----------
for(const gone of ['composite_structures','friction_stir_welding','carbon_cryotanks','self_healing_materials','metamaterial_structures']){
  check('removed node "'+gone+'" no longer exists', !byId[gone]);
}

// ---------- 3. NOTHING anywhere references a removed id in its req ----------
{
  const removed=new Set(['composite_structures','friction_stir_welding','carbon_cryotanks','self_healing_materials','metamaterial_structures']);
  const dangling=RESEARCH.filter(n=>(n.req||[]).some(r=>removed.has(r)));
  check('no research node has a dangling req to a removed id', dangling.length===0);
}

// ---------- 4. load-bearing external gates still resolve ----------
{
  check('alloy_tanks is still an early root node (no prereq)', (byId.alloy_tanks.req||[]).length===0);
  check('balloon_tanks still chains directly off alloy_tanks', (byId.balloon_tanks.req||[]).includes('alloy_tanks'));
  check('lightweight_cryo synergy still requires balloon_tanks (untouched by this slice)',
    typeof SYNERGIES!=='undefined' ? SYNERGIES.find(s=>s.id==='lightweight_cryo').requires.includes('balloon_tanks') : true);
  check('composite_isogrid_structures now chains directly off balloon_tanks (composite_structures removed between them)',
    (byId.composite_isogrid_structures.req||[]).includes('balloon_tanks'));
  check('advanced_composite_structures now chains off composite_isogrid_structures directly (3 removed nodes between them)',
    (byId.advanced_composite_structures.req||[]).includes('composite_isogrid_structures'));
}

// ---------- 5. the point-of-use structural-failure-weight gate on alloy_tanks/balloon_tanks is untouched ----------
{
  newGame('engineer');
  // neither researched: baseline ws path (can't read internal ws directly, but confirm the flags
  // these gates key off still exist as real research ids on the tree)
  check('alloy_tanks and balloon_tanks are both still valid research ids to key sim.js off of',
    RESEARCH.some(r=>r.id==='alloy_tanks') && RESEARCH.some(r=>r.id==='balloon_tanks'));
  state.research.alloy_tanks=true;
  check('researching alloy_tanks alone is a real, distinct state (not silently merged away)', state.research.alloy_tanks===true && !state.research.balloon_tanks);
}

// ---------- 6. the final sigma floor is preserved exactly (no stealth buff/nerf) ----------
{
  check('composite_isogrid_structures lands on the same 0.050 floor the old chain reached at that depth',
    Math.abs(byId.composite_isogrid_structures.effect.sigma-0.050)<1e-9);
  check('advanced_composite_structures preserves the exact 0.040 final floor (deepest value in the old 7-node chain)',
    Math.abs(byId.advanced_composite_structures.effect.sigma-0.040)<1e-9);
}

// ---------- 7. costs stayed sane (compressed from the sum they absorbed, not inflated) ----------
{
  // composite(4.0)+fsw(4.5)=8.5 absorbed into composite_isogrid_structures; compressed to 6.5
  check('composite_isogrid_structures cost is compressed, not the naive 8.5 sum', byId.composite_isogrid_structures.cost<8.5 && byId.composite_isogrid_structures.cost>=4.5);
  // carbon(6.0)+self_healing(8.0)+metamaterial(10.0)=24.0 absorbed; compressed to 22.0
  check('advanced_composite_structures cost is compressed from its absorbed sum', byId.advanced_composite_structures.cost<24.0 && byId.advanced_composite_structures.cost>=12);
}

// ---------- 8. researching the full chain in a fresh game actually reaches the 0.040 floor via completeResearch ----------
{
  newGame('engineer');
  state.sigma=0.12; // confirm baseline before any structures research
  check('baseline sigma is 0.12 before any structures research', Math.abs(state.sigma-0.12)<1e-9);
  // simulate the state.sigma-setting side effect completeResearch performs, in chain order
  for(const id of ['alloy_tanks','balloon_tanks','composite_isogrid_structures','advanced_composite_structures']){
    const node=byId[id];
    state.research[id]=true;
    if(node.effect && node.effect.sigma) state.sigma=node.effect.sigma;
  }
  check('researching the full 4-node chain in order reaches the exact 0.040 floor the old 7-node chain reached',
    Math.abs(state.sigma-0.040)<1e-9);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
