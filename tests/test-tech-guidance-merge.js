// Tech-tree design pass, slice 1 — guidance track (2026-07-20). The guidance reliability chain was
// six linear +0.02-ish nodes (radio_guidance → inertial_nav → digital_computer → star_trackers →
// autonomous_navigation → quantum_navigation), each individually imperceptible. Collapsed to three
// meaningful steps, preserving the two load-bearing ids other systems reference (digital_computer:
// gates deep_space/flight_automation + has a leveled variant; autonomous_navigation: feeds the
// autonomous_landing synergy) and the exact reliability total. No back-compat constraint (per owner).
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
const byId={}; for(const n of RESEARCH) byId[n.id]=n;

// ---------- 1. the six-node chain is now three nodes ----------
{
  const chain=RESEARCH.filter(n=>n.track==='guidance' && n.id!=='redundant_avionics');
  check('the guidance chain is now 3 nodes (was 6)', chain.length===3);
  check('the three survivors are digital_computer, autonomous_navigation, quantum_navigation',
    !!byId.digital_computer && !!byId.autonomous_navigation && !!byId.quantum_navigation);
}

// ---------- 2. the removed ids are gone ----------
for(const gone of ['radio_guidance','inertial_nav','star_trackers']){
  check('removed node "'+gone+'" no longer exists', !byId[gone]);
}

// ---------- 3. NOTHING anywhere references a removed id in its req ----------
{
  const removed=new Set(['radio_guidance','inertial_nav','star_trackers']);
  const dangling=RESEARCH.filter(n=>(n.req||[]).some(r=>removed.has(r)));
  check('no research node has a dangling req to a removed id', dangling.length===0);
}

// ---------- 4. load-bearing external gates still resolve ----------
{
  check('deep_space (cislunar unlock) still gates on digital_computer', (byId.deep_space.req||[]).includes('digital_computer'));
  check('flight_automation still gates on digital_computer', (byId.flight_automation.req||[]).includes('digital_computer'));
  check('quantum_navigation still gates on autonomous_navigation', (byId.quantum_navigation.req||[]).includes('autonomous_navigation'));
  check('autonomous_navigation now chains off digital_computer directly (star_trackers removed between them)', (byId.autonomous_navigation.req||[]).includes('digital_computer'));
  check('digital_computer is now an early node (no prereq)', (byId.digital_computer.req||[]).length===0);
}

// ---------- 5. reliability total is preserved exactly (no stealth buff/nerf) ----------
{
  const total=['digital_computer','autonomous_navigation','quantum_navigation'].reduce((s,id)=>s+(byId[id].effect.reliability||0),0);
  // old chain: 0.02+0.02+0.03+0.03+0.03+0.02 = 0.15
  check('the collapsed chain preserves the exact 0.15 reliability total', Math.abs(total-0.15)<1e-9);
}

// ---------- 6. each surviving node is now a MEANINGFUL step, not a +0.02 shrug ----------
{
  check('digital_computer is a substantial early step (>=0.05 reliability)', byId.digital_computer.effect.reliability>=0.05);
  check('autonomous_navigation is a substantial mid step (>=0.05 reliability)', byId.autonomous_navigation.effect.reliability>=0.05);
}

// ---------- 7. costs stayed sane (roughly the sum of what they absorbed, not inflated) ----------
{
  // radio(1.5)+inertial(2.5)+digital(3.5)=7.5 absorbed into digital_computer; compressed to 5 (a merge discount, intended)
  check('digital_computer cost is compressed, not the naive 7.5 sum', byId.digital_computer.cost<7.5 && byId.digital_computer.cost>=4);
  // star(3.5)+auto(5)=8.5 -> 7
  check('autonomous_navigation cost is compressed from its absorbed sum', byId.autonomous_navigation.cost<8.5 && byId.autonomous_navigation.cost>=5);
}

// ---------- 8. the whole tree still loads & the leveled digital_computer variant is intact ----------
{
  newGame('engineer');
  check('digital_computer is still researchable in a fresh game (no broken prereq)', byId.digital_computer.req.length===0);
  // its leveled variant lives in sim.js keyed by the same id — a quick sanity that researching it works
  state.research.digital_computer=true;
  check('researching digital_computer contributes its reliability to the sum', researchEffectSum('reliability')>=0.07);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
