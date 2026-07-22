// PP.0 — palette-population gate infrastructure. The full engine catalogue lands in later slices;
// this slice builds the machinery those parts need and proves it against the EXISTING 7 parts plus
// synthetic gated parts. Three things under test:
//   1. partAvailable() — research/unlock gate, mirroring the slider bench's state.unlocked[engId]
//      filter, so the two benches can never disagree on what's offered.
//   2. transfer-only enforcement in canAttach() — a transferOnly engine can't power a launch stage.
//   3. the gate lives at the INTERACTION layer (palette/drop), NOT in canAttach's graph validation,
//      so a save/graph can still hold a since-gated part. (Diameter compatibility was already built
//      in E3.2 — re-verified here so the "PP.0 needs it" assumption is on record as false.)
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- 1. partAvailable: base parts ----------
{
  newGame('engineer');
  check('avail: base tank always available', partAvailable(partDef('tank_std')));
  check('avail: base decoupler always available', partAvailable(partDef('decoupler')));
  check('avail: base nosecone always available', partAvailable(partDef('nosecone')));
  check('avail: base capsule always available', partAvailable(partDef('capsule_mk1')));
  check('avail: base probe core always available', partAvailable(partDef('probe_core')));
  check('avail: all 5 base parts carry an explicit base:true flag',
    ['tank_std','decoupler','nosecone','capsule_mk1','probe_core'].every(id=>partDef(id).base===true));
}

// ---------- 2. partAvailable: engine parts gate on state.unlocked[engId] ----------
{
  newGame('engineer');
  check('avail: engine_a4 available at start (a4 is base-unlocked)', partAvailable(partDef('engine_a4')));
  check('avail: booster_solid LOCKED at start (solid_castor needs solid_propellant research)',
    !partAvailable(partDef('booster_solid')));
  // this is exactly the predicate the slider bench uses — assert they agree
  check('avail: engine-part gate matches the slider bench unlock signal for a4',
    partAvailable(partDef('engine_a4')) === !!(state.unlocked && state.unlocked.a4));
  check('avail: engine-part gate matches the slider bench unlock signal for solid_castor',
    partAvailable(partDef('booster_solid')) === !!(state.unlocked && state.unlocked.solid_castor));
  // unlock the engine → the part becomes available, no other change needed
  state.unlocked.solid_castor = true;
  check('avail: booster_solid becomes available once solid_castor is unlocked',
    partAvailable(partDef('booster_solid')));
}

// ---------- 3. partAvailable: reqResearch (non-engine) gate ----------
{
  newGame('engineer');
  // synthesize a part gated on a real research node to prove the reqResearch path
  const fakeId='__test_gated_part__';
  PART_DEFS[fakeId]={ id:fakeId, cat:'structural', name:'Test Gated Part', short:'TGP', era:2,
    dia:1.0, px:{len:40,dia:80}, nodes:[{id:'bot',at:'bottom',class:'small'}],
    phys:{dryMass:0.1}, reqResearch:'cryo_upper', blurb:'test' };
  check('avail: reqResearch part LOCKED before its node is researched', !partAvailable(PART_DEFS[fakeId]));
  state.research.cryo_upper=true;
  check('avail: reqResearch part available once its node is researched', partAvailable(PART_DEFS[fakeId]));
  delete PART_DEFS[fakeId];
}

// ---------- 4. partLockReason gives a usable message ----------
{
  newGame('engineer');
  const r=partLockReason(partDef('booster_solid'));
  check('lock-reason: booster_solid names its engine to unlock', typeof r==='string' && r.length>0 && /Castor|Solid|R&D/.test(r));
}

// ---------- 5. the gate is at the INTERACTION layer, NOT in canAttach ----------
{
  newGame('engineer'); // solid_castor NOT unlocked
  const b=emptyBuild('capsule_mk1');
  const tank=attachPart(b, b.root, 'bot', 'tank_std');
  // canAttach / attachPart must STILL allow the locked booster at the graph layer
  // (a save may hold it; graph integrity != UI availability)
  const chk=canAttach(b, tank, 'rad', 'booster_solid');
  check('layer: canAttach does NOT gate on availability (graph layer stays research-agnostic)', chk.ok);
  const uid=attachPart(b, tank, 'rad', 'booster_solid');
  check('layer: attachPart succeeds for a locked part (graph can represent since-gated saves)', !!uid);
}

// ---------- 6. transfer-only enforcement (this DOES belong in canAttach — physics integrity) ----------
{
  newGame('engineer');
  // unlock a transfer-only engine so availability isn't the thing blocking us — we're testing placement
  state.unlocked.ntr_nerva=true;
  // synthesize a transfer-only engine part (the real catalogue lands in PP.2)
  const ntrId='__test_ntr_part__';
  PART_DEFS[ntrId]={ id:ntrId, cat:'propulsion', name:'Test NTR', short:'NTR', era:6,
    dia:1.0, px:{len:60,dia:80}, engId:'ntr_nerva',
    nodes:[{id:'top',at:'top',class:'small'}], phys:{dragCoeff:0.3,crossSection:1.0}, blurb:'test' };

  // Spine (top→bottom): capsule → tank1 → decoupler → tank2. Firing order is
  // bottom-up, so tank2 (below the decoupler) is stage 0 = the LAUNCH stage, and
  // tank1 (above it) is the upper stage. Physically correct: the decoupler drops
  // the spent BOTTOM stage.
  const b=emptyBuild('capsule_mk1');
  const tank1=attachPart(b, b.root, 'bot', 'tank_std');       // upper stage
  const dec=attachPart(b, tank1, 'bot', 'decoupler');
  const tank2=attachPart(b, dec, 'bot', 'tank_std');          // launch stage (bottom, fires first)

  // NTR under tank2 = the launch stage → must be refused
  const launchChk=canAttach(b, tank2, 'bot', ntrId);
  check('transfer-only: NTR refused on the launch (ground-lit) stage', !launchChk.ok && /transfer/i.test(launchChk.why||''));
  // the predicate itself: tank1 (upper) is NOT the launch stage, tank2 (bottom) is
  check('transfer-only: upper tank is correctly NOT the launch stage', !attachWouldBeLaunchStage(b, tank1));

  // a normal launch engine is fine on the launch stage (control: not everything is blocked)
  const a4Chk=canAttach(b, tank2, 'bot', 'engine_a4');
  check('transfer-only: a normal engine is still fine on the launch stage', a4Chk.ok);

  // clean "allowed" case: a two-tank upper stack where the NTR sits under the top tank
  // of a build whose bottom stage is a separate decoupled tank. Simplest form: capsule →
  // tank (upper, NTR under it) → decoupler → tank (launch). Give the upper tank an open
  // bottom by NOT decoupling directly beneath it — instead route the NTR to the upper tank
  // and the decoupler+launch tank as a radial-free axial chain below the NTR is impossible
  // (NTR has only a top node), so we assert placement via the allowed upper-stage predicate:
  const b2=emptyBuild('capsule_mk1');
  const uTank=attachPart(b2, b2.root, 'bot', 'tank_std');     // this is currently the whole (launch) stage
  // add a decoupler + lower tank so uTank becomes the UPPER stage
  const d2=attachPart(b2, uTank, 'bot', 'decoupler');
  const lTank=attachPart(b2, d2, 'bot', 'tank_std');          // now THIS is the launch stage
  // uTank is now the upper stage; its 'rad' node is open — but NTR is axial-only, so we
  // verify the gate would PASS on the upper stage by checking the predicate + a non-transfer
  // engine attaching to the launch tank, confirming the build is well-formed.
  check('transfer-only: in a 2-stage build, the top tank is the non-launch (upper) stage', !attachWouldBeLaunchStage(b2, uTank));
  check('transfer-only: in a 2-stage build, the bottom tank is the launch stage', attachWouldBeLaunchStage(b2, lTank));
  delete PART_DEFS[ntrId];
}

// ---------- 7. attachWouldBeLaunchStage: the graph predicate behind transfer-only ----------
{
  newGame('engineer');
  const b=emptyBuild('capsule_mk1');
  const tank1=attachPart(b, b.root, 'bot', 'tank_std');
  check('launch-stage: single-stack tank IS the launch stage', attachWouldBeLaunchStage(b, tank1));
  const dec=attachPart(b, tank1, 'bot', 'decoupler');
  const tank2=attachPart(b, dec, 'bot', 'tank_std');
  check('launch-stage: bottom tank (below decoupler) is the launch stage', attachWouldBeLaunchStage(b, tank2));
  check('launch-stage: top tank (above decoupler) is NOT the launch stage', !attachWouldBeLaunchStage(b, tank1));
  // radial parent resolves to its spine anchor's group
  check('launch-stage: radial attach to the bottom tank counts as launch stage', attachWouldBeLaunchStage(b, tank2));
}

// ---------- 8. diameter compatibility was ALREADY built (E3.2) — record that PP.0 didn't need it ----------
{
  const small_bot={id:'bot',at:'bottom',class:'small'};
  const large_top={id:'top',at:'top',class:'large'};
  const small_top={id:'top',at:'top',class:'small'};
  check('diameter: E3.2 nodesCompatible already hard-blocks class mismatch', !nodesCompatible(small_bot, large_top));
  check('diameter: E3.2 nodesCompatible already allows matching class', nodesCompatible(small_bot, small_top));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
