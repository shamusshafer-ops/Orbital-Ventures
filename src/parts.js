/* ============================================================================
   E3.0 — Part-Based Vehicle Bench: data model, build graph, and the bridge that
   turns a part graph into the stage intermediate-representation the existing
   physics core (stackPerformance / stageMasses in sim.js) already consumes.

   This is the make-or-break slice of the E3 epic. The whole bet is that a KSP-
   style part graph can be reduced to the SAME {eng,count,prop,dia} stage array
   the slider bench produces today — so the deeply-wired computeVehicle()
   contract (materials, doctrines, heritage, recovery, families, difficulty…)
   is REUSED, not rewritten. If the numerical-equivalence harness passes, the
   rest of E3 is UI on top of a proven core.

   No UI in this slice. No wiring into the live game yet — everything here is
   behind the BENCH_V2 flag and only reachable from tests until E3.5 cutover.
   ============================================================================ */

// Feature flag — the whole part bench stays dark until E3.5 flips this.
const BENCH_V2 = true;

/* ---------- Attach-node diameter classes ----------
   Parts connect only at matching node sizes (KSP-style). A class maps to a
   physical diameter in the same "dia" units the old bench used (1.0 = standard,
   which stageDia() clamps to [GEO_DIA_MIN, GEO_DIA_MAX]). */
const NODE_CLASS = {
  tiny:  { id:'tiny',  dia:0.5, label:'0.5 m-class' },
  small: { id:'small', dia:1.0, label:'Standard'    },
  large: { id:'large', dia:1.6, label:'Heavy'       },
  huge:  { id:'huge',  dia:2.4, label:'Super-heavy' },
};

/* ---------- Part categories ---------- */
const PART_CATEGORIES = {
  structural: { id:'structural', name:'Structural', icon:'▭' },
  propulsion: { id:'propulsion', name:'Propulsion', icon:'▼' },
  avionics:   { id:'avionics',   name:'Avionics',   icon:'📡' },
  payload:    { id:'payload',    name:'Payload',    icon:'◗' },
};

/* ---------- Part definitions ----------
   Minimal viable set for E3.0: one tank, one decoupler, one engine, one
   capsule, one nosecone — enough to build a real two-stage crewed rocket end to
   end and diff it against the slider equivalent. The full catalogue lands in
   later slices; the SHAPE here is the contract.

   Node convention: `nodes` lists attach points as {id, at:'top'|'bottom'|
   'radial', class}. `at` is where on THIS part the node sits; a link joins a
   parent node to a child's opposite-facing node. `phys` carries the real stats;
   only the fields relevant to a part are present.

   Engines reference an ENGINES[] id via `engId` rather than duplicating thrust/
   isp — the part is a mount for a known powerplant, so heritage/cost/rel all
   keep flowing from the existing engine model. Tanks carry propMass directly.
   `dia` is the part's body diameter, feeding the same geoStructMult path. */
const PART_DEFS = {
  // — structural —
  tank_std: {
    id:'tank_std', cat:'structural', name:'Propellant Tank', short:'TNK',
    era:0, dia:1.0, px:{len:140, dia:90},
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'}, {id:'rad', at:'radial', class:'small'} ], // E3.3: radial node for strap-on boosters
    // propMass is the *nominal full* load; the bench lets the player stretch it
    // (E3.2). Dry structural mass is computed via the existing tankStruct() at
    // bridge time, NOT stored here — so tank material σ keeps applying.
    phys:{ propMass:8.0, dragCoeff:0.2, crossSection:1.0 },
    blurb:'A stretchable propellant tank. The backbone of every stage.',
  },
  decoupler: {
    id:'decoupler', cat:'structural', name:'Stage Decoupler', short:'DEC',
    era:0, dia:1.0, px:{len:18, dia:96},
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'} ],
    // A decoupler is the staging boundary: everything below it separates as a
    // spent stage. Small real mass; carries no propellant.
    phys:{ dryMass:0.08, dragCoeff:0.1, crossSection:1.0, isDecoupler:true },
    blurb:'Separates a spent stage. Defines where one stage ends and the next begins.',
  },
  nosecone: {
    id:'nosecone', cat:'structural', name:'Aerodynamic Nosecone', short:'NOS',
    era:0, dia:1.0, px:{len:70, dia:90},
    nodes:[ {id:'bot', at:'bottom', class:'small'} ], // caps a stack — bottom node only
    phys:{ dryMass:0.12, dragCoeff:0.05, crossSection:1.0 }, // low drag is the point
    blurb:'Caps the stack and cuts drag. The pointy end goes up.',
  },
  // — propulsion —
  engine_a4: {
    id:'engine_a4', cat:'propulsion', name:'V-2 (A-4) Powerplant', short:'ENG',
    era:0, dia:1.0, px:{len:56, dia:80}, engId:'a4', // pulls thrust/isp/mass/cost/rel from ENGINES.a4
    nodes:[ {id:'top', at:'top', class:'small'} ], // engine hangs off the bottom of a tank
    phys:{ dragCoeff:0.3, crossSection:1.0 },
    blurb:'The engine that started it all. Mounts to the base of a stage.',
  },
  // E3.3: strap-on booster — radial-only (no axial nodes, it can't sit IN the spine, only beside
  // it), self-contained (carries its own propellant, unlike engine_a4 which needs a tank). Folds
  // into the existing state.boosters side-channel at bridge time (see buildToStageIR) rather than
  // becoming its own IR stage — the physics core has never modeled parallel/independently-timed
  // staging, and reusing the proven booster math is the honest scope here (see E3.3 ROADMAP note).
  booster_solid: {
    id:'booster_solid', cat:'propulsion', name:'Strap-on Booster', short:'SRB',
    era:0, dia:1.0, px:{len:100, dia:40}, engId:'solid_castor',
    nodes:[ {id:'r', at:'radial', class:'small'} ],
    phys:{ propMass:5.0, dragCoeff:0.5, crossSection:0.3 },
    blurb:'Self-contained solid booster. Straps to the side of a tank for extra liftoff thrust. Use symmetry to add a matched pair.',
  },
  // — payload —
  capsule_mk1: {
    id:'capsule_mk1', cat:'payload', name:'Crew Capsule', short:'CAP',
    era:0, dia:1.0, px:{len:90, dia:88},
    nodes:[ {id:'bot', at:'bottom', class:'small'} ],
    phys:{ dryMass:1.2, crew:1, dragCoeff:0.4, crossSection:1.0, isPayload:true, hasAvionics:true, powerGen:0.5, powerDraw:0.3 },
    blurb:'A one-seat crew capsule. Its avionics fly the rocket.',
  },
  probe_core: {
    id:'probe_core', cat:'avionics', name:'Probe Guidance Core', short:'GNC',
    era:0, dia:1.0, px:{len:44, dia:70},
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'} ],
    phys:{ dryMass:0.15, dragCoeff:0.1, crossSection:1.0, hasAvionics:true, isPayload:true, powerDraw:0.3 },
    blurb:'Uncrewed guidance core. Flies the trajectory without a pilot aboard.',
  },
};

function partDef(id){ return PART_DEFS[id]; }
function partsInCategory(cat){ return Object.values(PART_DEFS).filter(p=>p.cat===cat); }

/* ---------- The build graph ----------
   state.build = {
     parts: [ {uid, defId, x, y, rot, sym} ],   // placed instances
     links: [ {parent:uid, parentNode, child:uid, childNode} ],
     root:  uid,                                 // topmost part (payload/nosecone)
   }
   The graph is a tree rooted at the payload end; links point parent→child going
   DOWN the stack (root at top, engines at the bottom). A blank build seeds a
   single root part. */

let _partUid = 0;
function newPartUid(){ return 'p'+(++_partUid); }

function emptyBuild(rootDefId){
  const uid=newPartUid();
  return { parts:[ {uid, defId:rootDefId||'capsule_mk1', x:0, y:0, rot:0, sym:1} ], links:[], root:uid };
}

function buildPart(build, uid){ return build.parts.find(p=>p.uid===uid); }
function childrenOf(build, uid){ return build.links.filter(l=>l.parent===uid).map(l=>({link:l, part:buildPart(build,l.child)})); }

/* Ordered top→bottom traversal of the central stack (the spine from root down
   through bottom nodes). Radial attachments (boosters) are collected separately.
   For E3.0 the viable set is a linear stack, but the walk is written to handle
   the tree so later slices don't need to rework it. */
function stackSpine(build){
  const spine=[]; let cur=build.root; const seen={};
  while(cur && !seen[cur]){
    seen[cur]=true;
    const part=buildPart(build,cur); if(!part) break;
    spine.push(part);
    // follow the child linked to this part's BOTTOM node (the axial continuation)
    const kids=childrenOf(build,cur);
    const axial=kids.find(k=>k.link.parentNode==='bot');
    cur = axial ? axial.part.uid : null;
  }
  return spine;
}
function radialParts(build){
  // parts attached at a radial node — boosters etc. `parentNode` is a NODE ID (e.g. 'rad'), not a
  // facing type — must look up the parent's actual node definition and check its `.at`, not
  // compare the id string to the literal word 'radial'. (Bug from E3.0, uncaught until E3.3 gave
  // this function something real to filter — nothing radial existed to test it against before.)
  const radialLinks=build.links.filter(l=>{
    const parent=buildPart(build, l.parent); const pdef=parent&&partDef(parent.defId);
    const pnode=pdef&&pdef.nodes.find(n=>n.id===l.parentNode);
    return pnode && pnode.at==='radial';
  });
  return radialLinks.map(l=>({link:l, part:buildPart(build,l.child)}));
}

/* ============================================================================
   E3.2 model layer — attach / detach / validation. Pure graph operations, no
   DOM. The drag-drop UI (later in this slice) calls these; keeping them pure
   means the hard part (what can connect to what, and where) is headless-tested
   before any pointer math exists.
   ============================================================================ */

// A node on a part instance is "occupied" if a link already uses it (as parent
// or child side). Returns the list of this part's still-open nodes.
function openNodes(build, uid){
  const part=buildPart(build, uid); if(!part) return [];
  const def=partDef(part.defId); if(!def) return [];
  const usedParent=new Set(build.links.filter(l=>l.parent===uid).map(l=>l.parentNode));
  const usedChild =new Set(build.links.filter(l=>l.child===uid).map(l=>l.childNode));
  return def.nodes.filter(n=>!usedParent.has(n.id) && !usedChild.has(n.id));
}

// Two nodes can connect iff their diameter classes match AND they face opposite
// directions (a bottom node accepts a top node, radial accepts radial). Same-
// facing (top-to-top) is invalid — you'd be gluing two nosecones base to base.
function nodesCompatible(nodeA, nodeB){
  if(!nodeA || !nodeB) return false;
  if(nodeA.class !== nodeB.class) return false; // hard block: diameter mismatch
  const opp = (a,b)=>(a==='top'&&b==='bottom')||(a==='bottom'&&b==='top');
  if(nodeA.at==='radial' && nodeB.at==='radial') return true;
  return opp(nodeA.at, nodeB.at);
}

// Can `childDefId` attach to the open node `parentNode` of part `parentUid`?
// Returns {ok, childNode?, why?}. The child attaches via its first compatible
// open node (typically its 'top' if the parent offers a 'bottom').
function canAttach(build, parentUid, parentNodeId, childDefId){
  const parent=buildPart(build, parentUid); if(!parent) return {ok:false, why:'no such part'};
  const pdef=partDef(parent.defId); if(!pdef) return {ok:false, why:'unknown parent'};
  const pnode=pdef.nodes.find(n=>n.id===parentNodeId); if(!pnode) return {ok:false, why:'no such node'};
  if(!openNodes(build, parentUid).some(n=>n.id===parentNodeId)) return {ok:false, why:'node occupied'};
  const cdef=partDef(childDefId); if(!cdef) return {ok:false, why:'unknown part'};
  // Engines are bottom-mounted propulsion units, not payload attachments. The node geometry
  // alone would allow an engine directly under a capsule or avionics core, which is technically
  // symmetric but a terrible first-time-building experience. Keep the rule in the model so the
  // palette suggestions, click attach, and drag snap all teach the same construction logic.
  if(cdef.engId && !(pdef.phys.propMass || pdef.phys.isDecoupler)) return {ok:false, why:'engines mount beneath a tank or stage separator'};
  // gate: research/era (parts carry an era index today; research gating arrives with the full catalogue)
  const cnode=cdef.nodes.find(n=>nodesCompatible(pnode, n));
  if(!cnode) return {ok:false, why: pnode.class!=='small' ? 'no matching '+NODE_CLASS[pnode.class].label+' node on this part' : 'these parts don\'t connect here'};
  return {ok:true, childNode:cnode.id};
}

// Perform an attach. Mutates build. Returns the new child's uid, or null on
// invalid. The new part instance inherits x/y from a caller-supplied hint (the
// drop point) but the graph is the source of truth — layout recomputes from it.
function attachPart(build, parentUid, parentNodeId, childDefId, hint){
  const chk=canAttach(build, parentUid, parentNodeId, childDefId);
  if(!chk.ok) return null;
  const uid=newPartUid();
  build.parts.push({uid, defId:childDefId, x:(hint&&hint.x)||0, y:(hint&&hint.y)||0, rot:0, sym:(hint&&hint.sym)||1});
  build.links.push({parent:parentUid, parentNode:parentNodeId, child:uid, childNode:chk.childNode});
  return uid;
}

// Detach a part AND its whole subtree (everything hanging below it separates
// with it, KSP-style). Cannot detach the root. Returns the removed uids.
function detachPart(build, uid){
  if(uid===build.root) return [];
  // collect the subtree rooted at uid
  const removed=[]; const stack=[uid];
  while(stack.length){
    const u=stack.pop(); removed.push(u);
    for(const l of build.links.filter(l=>l.parent===u)) stack.push(l.child);
  }
  const rm=new Set(removed);
  build.parts=build.parts.filter(p=>!rm.has(p.uid));
  build.links=build.links.filter(l=>!rm.has(l.parent) && !rm.has(l.child));
  return removed;
}

// E3.3: symmetry. Only meaningful for radially-attached parts (boosters, RCS later) — a spine
// part is by definition singular, there's nothing to mirror. Clamped 1-4 (a reasonable KSP-style
// ceiling; nothing in the physics or rendering assumes more). The bridge already multiplies by
// `.sym` wherever it reads count/prop/mass (established in E3.0/E3.1), so this is purely "let the
// player set the field through a real control" — no new bridge logic needed.
const SYMMETRY_MAX=4;
function applySymmetry(build, uid, n){
  const part=buildPart(build, uid); if(!part) return false;
  const def=partDef(part.defId); if(!def) return false;
  const link=build.links.find(l=>l.child===uid);
  if(!link) return false;
  const parentDef=partDef(buildPart(build,link.parent).defId);
  const pnode=parentDef && parentDef.nodes.find(n=>n.id===link.parentNode);
  if(!pnode || pnode.at!=='radial') return false; // symmetry only applies to radial attachments
  part.sym=Math.max(1, Math.min(SYMMETRY_MAX, Math.round(n)));
  return true;
}
// nearest OPEN, COMPATIBLE node across the whole build. The DOM layer supplies
// node screen-positions via `nodeXY(uid, nodeId) -> {x,y}`; this stays pure by
// taking that lookup as a callback. Returns the best {parentUid, parentNode,
// childNode, dist} within `maxDist`, or null (free placement / invalid).
function findSnapTarget(build, childDefId, dropX, dropY, nodeXY, maxDist){
  maxDist=maxDist||9999;
  let best=null;
  for(const part of build.parts){
    for(const n of openNodes(build, part.uid)){
      const chk=canAttach(build, part.uid, n.id, childDefId);
      if(!chk.ok) continue;
      const pos=nodeXY(part.uid, n.id); if(!pos) continue;
      const d=Math.hypot(pos.x-dropX, pos.y-dropY);
      if(d<=maxDist && (!best || d<best.dist)) best={parentUid:part.uid, parentNode:n.id, childNode:chk.childNode, dist:d};
    }
  }
  return best;
}

// Soft structural warnings (not hard blocks — the player can build something
// questionable, they just get told). Returns an array of warning strings.
function buildWarnings(build){
  const w=[];
  const ir=buildToStageIR(build);
  if(ir.error){ w.push(ir.error); return w; }
  if(ir.warnings) w.push(...ir.warnings);
  const spine=stackSpine(build);
  const hasControl=spine.some(p=>{ const d=partDef(p.defId); return d && d.phys.hasAvionics; })
    || build.parts.some(p=>{ const d=partDef(p.defId); return d && d.phys.hasAvionics; });
  if(!hasControl) w.push('No avionics — this vehicle flies open-loop. Nothing steers it, and reliability takes a hit (−15%). Add a capsule or a guidance core.'); // E3.4: now a real reliability penalty, not just a nag
  // E3.4: power deficit — avionics draw power nothing on board generates yet
  const power=buildPowerBalance(build);
  if(power.deficit>0) w.push(`Power deficit: ${power.draw} kW drawn, ${power.gen} kW generated. Onboard systems would run down (no generation part fitted yet).`);
  return w;
}

/* ---------- THE BRIDGE: build graph → stage IR ----------
   Walk the spine top→bottom. Accumulate parts into the current stage; when a
   decoupler is crossed, close the stage and start the next. Emit stages in
   FIRING ORDER (bottom stage fires first), matching stackPerformance's
   expectation that stages[0] is the first-burned stage.

   Each emitted stage is {eng, count, prop, dia} — exactly stageMasses()'s
   input. Non-propulsive parts (capsule, nosecone, avionics) contribute their
   dryMass to the PAYLOAD the stack must loft, since the old model treats
   everything above the tanks as payload. That payload is returned alongside so
   the caller can feed it to stackPerformance(stages, payload).

   Returns { stages, payload, crew, warnings } or { error } if unbuildable. */
/* Shared grouping: split the spine (top→bottom) into part-arrays at decoupler
   boundaries. A decoupler ends the group ABOVE it and is dropped (negligible
   structure) rather than starting the next group with it. Used by BOTH the
   physics bridge (which reverses to firing order) and the renderer (which
   draws top→bottom as-is) — one source of truth for "what is a stage". */
function spineGroups(build){
  const spine=stackSpine(build);
  const groups=[]; let cur=[];
  for(const part of spine){
    const def=partDef(part.defId); if(!def) return {error:'unknown part '+part.defId, spine};
    if(def.phys.isDecoupler){ groups.push(cur); cur=[]; continue; }
    cur.push(part);
  }
  groups.push(cur);
  return {groups, spine}; // top→bottom order
}

function buildToStageIR(build){
  if(!build || !build.parts || !build.parts.length) return {error:'empty build'};
  const g=spineGroups(build);
  if(g.error) return {error:g.error};
  if(!g.spine.length) return {error:'no spine'};
  const groups=g.groups.slice().reverse(); // firing order: bottom-of-stack fires first

  let payload=0, crew=0; const warnings=[];
  const stages=[]; const stageSourceGroup=[]; // parallel array: which top-down group produced stages[i]
  // Any group with no engine is payload (capsule/nosecone/avionics on top). The
  // TOPMOST groups are typically payload; a group with an engine is a real stage.
  for(const group of groups){
    let stageProp=0, stageDiaSum=0, stageDiaN=0, engId=null, engCount=0;
    let nonPropDry=0;
    for(const part of group){
      const def=partDef(part.defId);
      const engId_ = part._engOverride || def.engId;
      const prop_  = (part._propOverride!=null) ? part._propOverride : def.phys.propMass;
      const count_ = (part._countOverride!=null) ? part._countOverride : 1;
      if(engId_){ engId=engId_; engCount+=count_*(part.sym||1); }
      if(prop_){ stageProp+=prop_*(part.sym||1); stageDiaSum+=def.dia*(part.sym||1); stageDiaN+=(part.sym||1); }
      if(def.phys.crew) crew+=def.phys.crew*(part.sym||1);
      if(!engId_ && !prop_ && def.phys.dryMass) nonPropDry+=def.phys.dryMass*(part.sym||1);
    }
    if(engId && stageProp>0){
      stages.push({ eng:engId, count:engCount||1, prop:round2(stageProp), dia: stageDiaN?round2(stageDiaSum/stageDiaN):1 });
      stageSourceGroup.push(group);
      if(nonPropDry>0) payload+=nonPropDry; // dead structure in a live stage still rides as mass; fold to payload (conservative, matches old "extras are payload" treatment)
    } else {
      // no engine or no propellant → this is payload/structure the stack lofts
      for(const part of group){ const def=partDef(part.defId); payload+=(def.phys.dryMass||0)*(part.sym||1); }
      if(engId && stageProp<=0) warnings.push('A stage has an engine but no propellant.');
    }
  }

  if(!stages.length) return {error:'no propulsive stage — add a tank and an engine'};

  // E3.3: radial-attached boosters. The physics core has no concept of parallel/independently-
  // timed staging (boosterMasses() reads a single state.boosters bundle that augments stage-0's
  // thrust for stage-0's whole burn) — so boosters ONLY take effect when attached to whatever
  // group became stages[0] (the first-firing stage). A booster elsewhere is a real, honest
  // no-op: warn rather than silently drop or silently pretend it did something.
  const stage0Group=stageSourceGroup[0]||[];
  const stage0Uids=new Set(stage0Group.map(p=>p.uid));
  let boosters=null;
  const boosterHits=[]; const offStageHits=[];
  for(const {link, part} of radialParts(build)){
    const def=partDef(part.defId); if(!def) continue;
    const isBoosterPart = def.nodes.every(n=>n.at==='radial') && def.engId && def.phys.propMass; // radial-only + self-propelled
    if(!isBoosterPart) continue;
    if(stage0Uids.has(link.parent)) boosterHits.push(part); else offStageHits.push(part);
  }
  if(offStageHits.length) warnings.push('Boosters only take effect on the first stage to fire — one or more placements elsewhere are decorative only.');
  if(boosterHits.length){
    const byDef={}; for(const p of boosterHits){ byDef[p.defId]=(byDef[p.defId]||0)+(p.sym||1); }
    const defIds=Object.keys(byDef);
    if(defIds.length>1) warnings.push('Mixed booster types aren\'t supported yet — only the first type placed is modeled.');
    const chosen=defIds[0], count=byDef[chosen], bdef=partDef(chosen);
    // honour per-instance overrides (migration + the equivalence harness stamp exact eng/prop onto
    // the booster instance) — reading only the part-def default silently drifts a migrated design
    // whose slider boosters carried a non-default prop.
    const sample=boosterHits.find(p=>p.defId===chosen);
    boosters={ eng: (sample&&sample._engOverride)||bdef.engId, count, prop: (sample&&sample._propOverride!=null)?sample._propOverride:bdef.phys.propMass };
  }

  return { stages, payload:round2(payload), crew, warnings, boosters };
}

// E3.3: run stackPerformance for a build INCLUDING its boosters. boosterMasses() (sim.js) reads
// state.boosters as a global rather than taking a parameter, so this is the one function in the
// bridge that touches global state — deliberately isolated here (buildToStageIR itself stays
// pure) and always restores the prior value, even on error, so it's safe to call from a live
// bench mid-render without corrupting the player's actual slider-bench booster fit.
/* ============================================================================
   E3.4 — per-part physics depth. The phys stats in PART_DEFS (drag, power,
   control) finally do something. CRITICAL constraint: stackPerformance() is the
   shared core the E3.0 equivalence harness locks against the slider bench — it
   MUST NOT change, or slider-vs-graph equivalence breaks. So every E3.4 effect
   is a PURE, PART-BENCH-ONLY adjustment layered on top of stackPerformanceForBuild,
   never touching stackPerformance or the slider path. The slider bench has never
   modeled drag; part-built vehicles get to, as a reward for good aero design.
   ============================================================================ */

// Aero drag loss on the first-stage ascent. The existing physics has gravity
// loss but NO aero loss — this is genuinely new, and symmetric with gravLossFrac:
// a small Δv penalty scaling with frontal drag, mitigated by a nosecone. Bounded
// so it's a design nudge, never a cliff. Returns {dragArea, hasNose, lossFrac}.
const AERO_LOSS_K = 0.02;        // max ~ a few % of stage-1 Δv at the worst geometry
const AERO_LOSS_CAP = 0.06;
const AERO_NOSE_RELIEF = 0.5;    // a nosecone halves drag loss
function buildAeroProfile(build){
  const spine=stackSpine(build);
  if(!spine.length) return {dragArea:0, hasNose:false, lossFrac:0};
  // frontal drag ≈ the largest cross-section in the stack × the top part's drag
  // coefficient (the top part meets the airstream first). Radial boosters add
  // their cross-section (they sit in the freestream).
  let maxCross=0, topDrag=0.3;
  spine.forEach((p,i)=>{ const d=partDef(p.defId); if(!d) return;
    const cs=(d.phys.crossSection!=null?d.phys.crossSection:1)*(d.px?d.px.dia/90:1);
    if(cs>maxCross) maxCross=cs;
    if(i===0) topDrag=(d.phys.dragCoeff!=null?d.phys.dragCoeff:0.3);
  });
  for(const {part} of radialParts(build)){ const d=partDef(part.defId); if(d&&d.phys.crossSection) maxCross+=d.phys.crossSection*(part.sym||1)*0.5; }
  const hasNose = spine.length>0 && partDef(spine[0].defId) && partDef(spine[0].defId).id==='nosecone';
  const dragArea = maxCross*topDrag;
  let lossFrac = Math.min(AERO_LOSS_CAP, AERO_LOSS_K*dragArea);
  if(hasNose) lossFrac*=AERO_NOSE_RELIEF;
  return {dragArea:round2(dragArea), hasNose, lossFrac};
}

// Power balance: avionics/probe cores DRAW power; nothing in the viable set
// GENERATES it yet (batteries are a future part). This is a warning-level check,
// never a Δv effect — an unpowered guidance core is a "your probe goes dark"
// caution, not a physics penalty. Returns {gen, draw, deficit}.
function buildPowerBalance(build){
  let gen=0, draw=0;
  for(const p of build.parts){ const d=partDef(p.defId); if(!d) continue;
    gen+=(d.phys.powerGen||0)*(p.sym||1); draw+=(d.phys.powerDraw||0)*(p.sym||1); }
  return {gen:round2(gen), draw:round2(draw), deficit:round2(Math.max(0,draw-gen))};
}

// Control/reliability: E3.2 already WARNS when there's no avionics; E3.4 makes
// it bite. A vehicle with no guidance flies open-loop — a real reliability hit,
// returned as a multiplier the bench applies to displayed reliability (and, at
// cutover, the live flight). Bounded and simple: has avionics → 1.0, none → a
// fixed penalty (open-loop rockets historically failed far more often).
const NO_AVIONICS_REL_MULT = 0.85;
function buildControlProfile(build){
  const spine=stackSpine(build);
  const hasAvionics = spine.some(p=>{ const d=partDef(p.defId); return d && d.phys.hasAvionics; })
    || build.parts.some(p=>{ const d=partDef(p.defId); return d && d.phys.hasAvionics; });
  return {hasAvionics, relMult: hasAvionics?1:NO_AVIONICS_REL_MULT};
}

function stackPerformanceForBuild(build){
  const ir=buildToStageIR(build);
  if(ir.error) return ir;
  const prevBoosters=state.boosters;
  try{
    state.boosters = ir.boosters || {eng:null, count:0, prop:0};
    const perf=stackPerformance(ir.stages, ir.payload);
    // E3.4 adjustments — layered ON TOP, never inside stackPerformance.
    const aero=buildAeroProfile(build);
    const power=buildPowerBalance(build);
    const control=buildControlProfile(build);
    // apply aero drag loss to stage-1 Δv and the total (stage 1 is the atmospheric one)
    const adj=Object.assign({}, ir, perf);
    if(aero.lossFrac>0 && adj.stageDv && adj.stageDv.length){
      const dragDv = adj.stageDv[0]*aero.lossFrac;
      adj.stageDv=adj.stageDv.slice(); adj.stageDv[0]=Math.max(0, adj.stageDv[0]-dragDv);
      adj.totalDv=Math.max(0, adj.totalDv-dragDv);
      adj.dragLoss=round2(dragDv);
    } else { adj.dragLoss=0; }
    adj.aero=aero; adj.power=power; adj.control=control;
    return adj;
  } finally {
    state.boosters=prevBoosters;
  }
}

/* ---------- Reverse map: old slider design → build graph ----------
   Used by the E3.5 save migration and, right now, by the equivalence harness to
   generate a graph that SHOULD reduce back to the same stages. Produces a linear
   stack: [payload cap] → for each stage top→bottom [tank + engine] with a
   decoupler between stages. Stages come in firing order (stages[0] first), so
   the physical stack is built bottom-up then linked top-down. */
function sliderDesignToBuild(stages, opts){
  opts=opts||{};
  const build={ parts:[], links:[], root:null };
  const add=(defId)=>{ const uid=newPartUid(); build.parts.push({uid, defId, x:0, y:0, rot:0, sym:1}); return uid; };
  // top: a payload part (capsule if crewed, else a probe core), then nosecone omitted for exactness
  const rootUid = add(opts.crewed ? 'capsule_mk1' : 'probe_core');
  build.root=rootUid;
  let prevBottom=rootUid;
  // stages top→bottom in the PHYSICAL stack = reverse of firing order
  const topToBottom=stages.slice().reverse();
  topToBottom.forEach((st, idx)=>{
    // between stages, insert a decoupler (not before the first physical stage,
    // which attaches straight under the payload)
    if(idx>0){
      const dec=add('decoupler');
      build.links.push({parent:prevBottom, parentNode:'bot', child:dec, childNode:'top'});
      prevBottom=dec;
    }
    // tank sized to this stage's prop, then the engine under it
    const tank=add('tank_std');
    // stamp the tank's prop to match the slider stage (bench stretch equivalent)
    buildPart(build,tank)._propOverride = st.prop;
    build.links.push({parent:prevBottom, parentNode:'bot', child:tank, childNode:'top'});
    const eng=add('engine_a4');
    // stamp engine id + count to match
    buildPart(build,eng)._engOverride = st.eng;
    buildPart(build,eng)._countOverride = st.count;
    build.links.push({parent:tank, parentNode:'bot', child:eng, childNode:'top'});
    prevBottom=eng;
  });
  return build;
}

/* Overrides let the harness stamp exact prop/engine/count onto the generic
   parts so the equivalence test isolates the GRAPH→STAGE logic from the (later)
   part-stat catalogue. buildToStageIR honours them when present. */

/* ============================================================================
   E3.1 — Read-only 2D bench render.

   Pure function: state.build -> SVG string. Static (no drag, no animation) —
   the flight-anim's drawVehicle() is a moving-scene imperative Canvas drawer
   built for flame/plume/altitude concerns that don't apply to a parked bench
   preview, so this borrows its VISUAL LANGUAGE (tapered hulls, engine bells,
   dark instrument palette) but is written fresh as an SVG string-builder,
   matching the idiom E1.8's renderBaseSurfaceSVG/renderStationStackSVG already
   established for static part-stack previews.

   Per-stage Δv/TWR labels come from the REAL physics (buildToStageIR ->
   stackPerformance), not decoration — same numbers the old bench would show
   for an equivalent slider design.
   ============================================================================ */
const PART_CAT_COLOR={ structural:'#8a97a3', propulsion:'#d0563a', avionics:'#5aa9e0', payload:'#c9b06b' };

function renderPartSVG(def, x, yTop, scale){
  // x,yTop = top-left of this part's bounding box in SVG units; scale applies uniformly.
  const w=(def.px.dia)*scale, len=(def.px.len)*scale, cx=x+w/2;
  const color=PART_CAT_COLOR[def.cat]||'#8a97a3';
  let s='';
  if(def.phys.isDecoupler){
    s+=`<rect x="${x}" y="${yTop}" width="${w}" height="${len}" fill="#c9a83a" stroke="#8a7420" stroke-width="1"/>`;
    s+=`<line x1="${x}" x2="${x+w}" y1="${yTop+len/2}" y2="${yTop+len/2}" stroke="#4a3f14" stroke-width="1" stroke-dasharray="3 2"/>`;
  } else if(def.id==='nosecone'){
    s+=`<path d="M ${cx} ${yTop} L ${x+w} ${yTop+len} L ${x} ${yTop+len} Z" fill="${color}" stroke="#293743" stroke-width="1"/>`;
  } else if(def.engId){
    // engine: a bell trapezoid (narrow at top where it meets the tank, wide at the base) + dark mount
    s+=`<rect x="${x+w*0.15}" y="${yTop}" width="${w*0.7}" height="${len*0.25}" fill="#22292e" stroke="#3a444b" stroke-width="1"/>`;
    s+=`<path d="M ${x+w*0.2} ${yTop+len*0.25} L ${x+w} ${yTop+len} L ${x} ${yTop+len} L ${x+w*0.8} ${yTop+len*0.25} Z" fill="url(#partBell)" stroke="#3a444b" stroke-width="1"/>`;
  } else if(def.phys.crew){
    s+=`<rect x="${x}" y="${yTop}" width="${w}" height="${len}" rx="${w*0.28}" fill="${color}" stroke="#293743" stroke-width="1"/>`;
    s+=`<circle cx="${cx}" cy="${yTop+len*0.4}" r="${w*0.18}" fill="#1a2530" stroke="#5aa9e0" stroke-width="1"/>`; // window
  } else if(def.phys.hasAvionics && !def.phys.crew){
    s+=`<rect x="${x}" y="${yTop}" width="${w}" height="${len}" rx="4" fill="${color}" stroke="#293743" stroke-width="1"/>`;
    s+=`<circle cx="${cx}" cy="${yTop+len/2}" r="${w*0.12}" fill="#0a1420" stroke="#8fd0ff" stroke-width="0.8"/>`; // sensor eye
  } else { // tank / generic structural cylinder
    s+=`<rect x="${x}" y="${yTop}" width="${w}" height="${len}" fill="url(#g-${def.id})" stroke="#293743" stroke-width="1"/>`;
  }
  return s;
}

// Returns {svg, error} — error means the build couldn't be laid out (mirrors buildToStageIR's contract).
function renderBuildSVG(build, W, H, interactive){
  H=H||420; W=W||260;
  const g=spineGroups(build);
  if(g.error) return {error:g.error};
  const spine=g.spine;
  if(!spine.length) return {error:'no spine'};
  const defs=spine.map(p=>partDef(p.defId));
  if(defs.some(d=>!d)) return {error:'unknown part in spine'};

  const totalLen=defs.reduce((a,d)=>a+d.px.len,0);
  const maxDia=Math.max(...defs.map(d=>d.px.dia));
  const scale=Math.min((W-24)/maxDia, (H-40)/Math.max(totalLen,1));
  const cx=W/2;
  let y=20; // top margin
  let body='';
  const partYRanges=[]; // {uid, top, bottom, x, width} in SVG px, for stage-label placement and hit targets
  const nodePos={}; // "uid:nodeId" -> {x,y}, exposed when interactive for the snap layer
  for(let i=0;i<spine.length;i++){
    const def=defs[i], w=def.px.dia*scale, len=def.px.len*scale;
    const x=cx-w/2, yTop=y;
    body+=renderPartSVG(def, x, yTop, scale);
    // A compact part label makes the 2D schematic readable at a glance, especially when
    // several tanks look similar. Keep it inside the silhouette so the board remains clean.
    const labelY=yTop+Math.max(11,Math.min(len-5, len/2+3));
    body+=`<text x="${cx}" y="${labelY}" fill="rgba(5,11,18,.78)" font-size="${Math.max(8,Math.min(11,scale*0.16))}" font-family="ui-monospace,monospace" text-anchor="middle" font-weight="700">${def.short}</text>`;
    partYRanges.push({uid:spine[i].uid, top:yTop, bottom:yTop+len, x, width:w});
    // record every node's screen position (top-center / bottom-center; radial at side-center)
    for(const n of def.nodes){
      const nx = n.at==='radial' ? x+w : cx;
      const ny = n.at==='top' ? yTop : n.at==='bottom' ? yTop+len : yTop+len/2;
      nodePos[spine[i].uid+':'+n.id]={x:nx, y:ny};
    }
    y+=len;
  }

  // E3.3: radial boosters — mirrored left/right silhouettes (a 2D side elevation can only ever
  // show two sides regardless of how many copies exist around a real 3D ring, which is the
  // correct KSP convention for this kind of view). sym>1 draws one extra offset pair + a ×N
  // label rather than N literal silhouettes, so the drawing stays legible at sym=4.
  let boosterArt='';
  for(const {link, part} of radialParts(build)){
    const bdef=partDef(part.defId); if(!bdef) continue;
    const parentPos=partYRanges.find(r=>r.uid===link.parent); if(!parentPos) continue;
    const parentDef=defs[spine.findIndex(p=>p.uid===link.parent)]; if(!parentDef) continue;
    const bw=bdef.px.dia*scale*0.7, blen=bdef.px.len*scale;
    const spineHalf=(parentDef.px.dia*scale)/2;
    const midY=(parentPos.top+parentPos.bottom)/2, byTop=midY-blen/2;
    const sym=Math.min(4, Math.max(1, part.sym||1));
    const gap=6*scale;
    for(const side of [-1,1]){
      const bx=cx+side*(spineHalf+gap)-bw/2;
      boosterArt+=`<rect x="${bx}" y="${byTop}" width="${bw}" height="${blen}" rx="${bw*0.15}" fill="${PART_CAT_COLOR.propulsion}" stroke="#293743" stroke-width="1" opacity="0.92"/>`;
      // small fin
      boosterArt+=`<path d="M ${bx+(side<0?bw:0)} ${byTop+blen*0.7} L ${bx+(side<0?bw:0)+side*bw*0.6} ${byTop+blen} L ${bx+(side<0?bw:0)} ${byTop+blen} Z" fill="#8a3020"/>`;
    }
    if(sym>1) boosterArt+=`<text x="${cx+spineHalf+gap+bw+4}" y="${midY+3}" fill="#d0563a" font-size="9" font-family="ui-monospace,monospace">×${sym}</text>`;
  }

  // Interactive: draw a small marker on each OPEN node so the player sees valid attach points.
  let nodeMarkers='';
  if(interactive){
    for(const part of build.parts){
      for(const n of openNodes(build, part.uid)){
        const pos=nodePos[part.uid+':'+n.id]; if(!pos) continue;
        nodeMarkers+=`<circle cx="${pos.x}" cy="${pos.y}" r="3.5" fill="#0a1420" stroke="#5aa9e0" stroke-width="1.2" opacity="0.85"><title>Open ${NODE_CLASS[n.class].label} node</title></circle>`;
      }
    }
  }

  // Per-stage Δv/TWR overlay — real physics, not decoration. Booster-aware (E3.3): boosters
  // augment liftoff TWR and total Δv, not individual stage numbers — same convention
  // stackPerformance has always used for the slider bench; see stackPerformanceForBuild.
  const ir=buildToStageIR(build);
  let overlay='';
  if(!ir.error){
    const perf=stackPerformanceForBuild(build);
    // g.groups is top→bottom; firing order (ir.stages) is bottom→top, so stage k in firing
    // order corresponds to group (groups.length-1-k) in the top→bottom list — mirrors the
    // same reversal buildToStageIR applies, keeping label placement in lockstep with the IR.
    const groupsTopDown=g.groups;
    let stageFireIdx=0;
    for(let gi=groupsTopDown.length-1; gi>=0; gi--){
      const grp=groupsTopDown[gi]; if(!grp.length) continue;
      const hasEngine=grp.some(p=>partDef(p.defId).engId);
      if(!hasEngine) continue; // payload/structure-only groups carry no stage label
      const first=partYRanges.find(r=>r.uid===grp[0].uid), last=partYRanges.find(r=>r.uid===grp[grp.length-1].uid);
      const midY=(first.top+last.bottom)/2;
      const dv=ir.stages[stageFireIdx] ? Math.round(perf.stageDv[stageFireIdx]) : null;
      const twr=ir.stages[stageFireIdx] ? perf.stageTwr[stageFireIdx].toFixed(2) : null;
      if(dv!=null){
        overlay+=`<text x="${W-8}" y="${midY+3}" fill="#9bb6c8" font-size="9" font-family="ui-monospace,monospace" text-anchor="end">S${stageFireIdx+1} · ${dv} m/s · TWR ${twr}</text>`;
      }
      stageFireIdx++;
    }
  }

  const svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;background:#060d16;border-radius:8px">`
    +`<defs><linearGradient id="partBell" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#3a444b"/><stop offset="0.5" stop-color="#5a666e"/><stop offset="1" stop-color="#3a444b"/></linearGradient>`
    +Object.values(PART_DEFS).map(d=>`<linearGradient id="g-${d.id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${(PART_CAT_COLOR[d.cat]||'#8a97a3')}" stop-opacity=".95"/><stop offset=".5" stop-color="${(PART_CAT_COLOR[d.cat]||'#8a97a3')}"/><stop offset="1" stop-color="#293743"/></linearGradient>`).join('')
    +`</defs>${boosterArt}${body}${nodeMarkers}${overlay}</svg>`;
  return {svg, totalLen, maxDia, nodePos, partPos:partYRanges, error:null};
}

/* ============================================================================
   E3.2 interactive bench UI — palette + placement. Wires the DOM to the pure
   model layer above. Two placement paths, both routed through attachPart():
   (1) click a palette part -> attaches to the currently-selected open node
       (the reliable, touch-friendly baseline; always works);
   (2) drag a palette part onto the rocket -> live ghost snaps to the nearest
       compatible open node, drop commits (findSnapTarget over the rendered
       nodePos). Drag is the delight; click is the fallback that always works.

   Still gated: renderPartsBench() is only reached when BENCH_V2 is on. Nothing
   here runs in the shipped game yet.
   ============================================================================ */
let _benchBuild = null;          // the live editing graph (mirrors state.build once wired at E3.5)
let _benchSelNode = null;        // "uid:nodeId" currently selected as the click-attach target
let _benchSelPart = null;        // selected part instance for inspection and delete
let _benchDrag = null;           // {defId} while dragging a palette part
let _benchPaletteFilter = '';
// E3.6: undo/redo. Snapshots are deep clones of the build graph, taken BEFORE each mutation.
let _benchUndo = [];             // past states (most recent last)
let _benchRedo = [];             // undone states (for redo)
let _benchBlueprint = false;     // schematic/blueprint view toggle
const BENCH_UNDO_CAP = 40;
function benchClone(b){ return b ? JSON.parse(JSON.stringify(b)) : b; }
function benchUndo(){
  if(!_benchUndo.length) return;
  _benchRedo.push(benchClone(benchBuild()));
  _benchBuild=_benchUndo.pop(); _benchSelNode=null;
  renderPartsBench();
}
function benchRedo(){
  if(!_benchRedo.length) return;
  _benchUndo.push(benchClone(benchBuild()));
  _benchBuild=_benchRedo.pop(); _benchSelNode=null;
  renderPartsBench();
}
function benchToggleBlueprint(){ _benchBlueprint=!_benchBlueprint; renderPartsBench(); }
// snapshot current build for undo + clear redo — the single line every mutator calls first
function benchPushUndo(){ _benchUndo.push(benchClone(benchBuild())); if(_benchUndo.length>BENCH_UNDO_CAP)_benchUndo.shift(); _benchRedo.length=0; }

function benchBuild(){
  if(!_benchBuild){
    if(state.build && state.build.parts) _benchBuild=state.build;
    else { const derived=stateDesignToBuild(state); _benchBuild = derived || emptyBuild('capsule_mk1'); } // E3.5: derive from the live slider design if no graph yet (fresh game)
  }
  return _benchBuild;
}
function benchReset(){ benchPushUndo(); _benchBuild = emptyBuild('capsule_mk1'); _benchSelNode=null; _benchSelPart=null; renderPartsBench(); }
function benchApplyPreset(kind){
  const presets={
    orbital:{crewed:true, stages:[{eng:'a4',count:1,prop:8},{eng:'a4',count:1,prop:6}]},
    probe:{crewed:false, stages:[{eng:'a4',count:1,prop:8}]},
  };
  const p=presets[kind]||presets.orbital;
  benchPushUndo(); _benchBuild=sliderDesignToBuild(p.stages,{crewed:p.crewed}); _benchSelNode=null; _benchSelPart=null; renderPartsBench();
}
function benchSetPaletteFilter(value){ _benchPaletteFilter=String(value||'').trim().toLowerCase(); const pal=document.getElementById('benchPalette'); if(pal) pal.innerHTML=renderPartsPalette(); }
function benchSelectPart(uid){ _benchSelPart=(_benchSelPart===uid)?null:uid; _benchSelNode=null; renderPartsBench(); }

// palette card for one part def
function partPaletteCard(def){
  const eng = def.engId && ENGINES[def.engId];
  const stat = def.engId ? `${eng?Math.round(eng.thrustVac):'?'} kN · Isp ${eng?eng.ispVac:'?'}`
    : def.phys.propMass ? `${def.phys.propMass} t prop`
    : def.phys.crew ? `${def.phys.crew} crew`
    : def.phys.dryMass ? `${def.phys.dryMass} t` : '';
  // E3.6 tooltip: blurb + historical flavor (engines pull their heritage line from ENGINES).
  const engHist = def.engId && eng && eng.name ? `\n\nEngine: ${eng.name}` : '';
  const tip = `${def.name}\n${def.blurb||''}${def.hist?'\n\n'+def.hist:''}${engHist}`.replace(/"/g,'&quot;');
  return `<div class="part-card bench-part-card" draggable="true" data-partid="${def.id}" title="${tip}"
      onclick="benchPaletteClick('${def.id}')"
      ondragstart="benchDragStart(event,'${def.id}')" ondragend="benchDragEnd()"
      style="border:1px solid var(--line);border-radius:6px;padding:6px 8px;cursor:grab;background:var(--panel2);min-width:120px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px">
      <b style="color:${PART_CAT_COLOR[def.cat]||'#8a97a3'};font-size:12px">${def.name}</b>
      <span class="dim" style="font-size:10px;font-family:var(--mono)">${def.short}</span>
    </div>
    <div class="dim" style="font-size:11px;margin-top:2px">${stat}</div>
  </div>`;
}

function renderPartsPalette(){
  const cats = Object.values(PART_CATEGORIES);
  return cats.map(c=>{
    const parts=partsInCategory(c.id).filter(p=>!_benchPaletteFilter || (p.name+' '+p.short+' '+(p.blurb||'')).toLowerCase().includes(_benchPaletteFilter)); if(!parts.length) return '';
    return `<div style="margin-bottom:8px">
      <div class="bench-category">${c.icon} ${c.name.toUpperCase()} <span style="float:right">${parts.length}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${parts.map(partPaletteCard).join('')}</div>
    </div>`;
  }).join('') || `<div class="bench-empty">No parts match “${_benchPaletteFilter}”. Try “tank”, “engine”, or “capsule”.</div>`;
}

// click a palette part: attach to the selected open node, or to the single open
// node if there's exactly one (the common case early in a build).
function benchPaletteClick(defId){
  const b=benchBuild();
  let target=_benchSelNode;
  if(!target){
    // auto-target: if exactly one open node ACROSS THE BUILD is compatible with this specific
    // part, use it. Counting ALL open nodes (not just compatible ones) breaks as soon as a part
    // has more than one node type open at once (e.g. a tank's axial + radial nodes) — an engine
    // auto-targeting a tank's radial slot would be a silent, confusing misfire.
    const open=[];
    for(const p of b.parts) for(const n of openNodes(b,p.uid)){ if(canAttach(b,p.uid,n.id,defId).ok) open.push(p.uid+':'+n.id); }
    if(open.length===1) target=open[0];
  }
  if(!target){ renderPartsBench('Pick an attach point on the rocket first (tap an open ○ node).'); return; }
  const [uid,nodeId]=target.split(':');
  const chk=canAttach(b, uid, nodeId, defId);
  if(!chk.ok){ renderPartsBench('Can\'t attach there: '+chk.why); return; }
  benchPushUndo();
  attachPart(b, uid, nodeId, defId);
  _benchSelNode=null;
  renderPartsBench();
}
// E3.6: delete a part (and its subtree) — the bench could add but not remove a specific part before.
function benchDeletePart(uid){
  const b=benchBuild();
  if(uid===b.root){ renderPartsBench('Can\'t delete the root part — clear the build to start over.'); return; }
  benchPushUndo();
  detachPart(b, uid); _benchSelNode=null;
  renderPartsBench();
}

function benchDragStart(e, defId){ _benchDrag={defId}; try{ e.dataTransfer.setData('text/plain',defId); e.dataTransfer.effectAllowed='copy'; }catch(_){}; }
function benchDragEnd(){ _benchDrag=null; const g=document.getElementById('benchGhost'); if(g) g.remove(); }

// drop handler bound to the rocket SVG container; uses the live nodePos map
function benchCanvasDrop(e){
  e.preventDefault();
  const defId=(_benchDrag&&_benchDrag.defId) || (e.dataTransfer&&e.dataTransfer.getData('text/plain'));
  if(!defId) return;
  const b=benchBuild();
  const host=document.getElementById('benchCanvas'); if(!host) return;
  const svg=host.querySelector('svg'); if(!svg) return;
  const rect=svg.getBoundingClientRect();
  const vb=svg.viewBox.baseVal;
  const sx=(e.clientX-rect.left)*(vb.width/rect.width), sy=(e.clientY-rect.top)*(vb.height/rect.height);
  const map=host._nodePos||{};
  const snap=findSnapTarget(b, defId, sx, sy, (uid,nid)=>map[uid+':'+nid], 44);
  if(!snap){ renderPartsBench('No compatible attach point near the drop — try nearer an open ○ node.'); return; }
  benchPushUndo();
  attachPart(b, snap.parentUid, snap.parentNode, defId);
  _benchDrag=null;
  renderPartsBench();
}
function benchCanvasDragOver(e){ e.preventDefault(); try{ e.dataTransfer.dropEffect='copy'; }catch(_){}; }

// click an open-node marker in the SVG to select it as the click-attach target
function benchNodeClick(key){ _benchSelNode = (_benchSelNode===key)?null:key; renderPartsBench(); }

function benchInspectorHTML(b){
  const selected=buildPart(b,_benchSelPart);
  const host=document.getElementById('benchInspector');
  if(!host) return;
  const target=_benchSelNode ? _benchSelNode.split(':') : null;
  const targetPart=target ? buildPart(b,target[0]) : null;
  let html='';
  if(targetPart){
    const td=partDef(targetPart.defId), tn=td&&td.nodes.find(n=>n.id===target[1]);
    const compatible=Object.values(PART_DEFS).filter(d=>canAttach(b,target[0],target[1],d.id).ok);
    html+=`<div class="bench-guide"><b>Attach target selected</b><br>${td.name} · ${tn?tn.at:'node'} · ${tn?NODE_CLASS[tn.class].label:''}<br><span class="dim">Choose a compatible part below, or use the library.</span><div class="bench-suggest">${compatible.map(d=>`<button class="btn ghost" onclick="benchPaletteClick('${d.id}')">+ ${d.short}</button>`).join('')}</div></div>`;
  } else {
    html+=`<div class="bench-guide"><b>Build tip</b><br>Start at the top with a capsule or probe core, then add tanks and an engine below it. Decouplers separate stages; boosters attach to the tank’s side node.</div>`;
  }
  if(selected){
    const d=partDef(selected.defId), eng=d.engId&&ENGINES[d.engId];
    const links=b.links.filter(l=>l.parent===selected.uid||l.child===selected.uid);
    const opens=openNodes(b,selected.uid);
    const isRoot=selected.uid===b.root;
    html+=`<div class="bench-inspector-part">
      <h3>${d.name}</h3><div class="bench-inspector-meta">${d.cat.toUpperCase()} · ${d.short} · part ${selected.uid}</div>
      <div class="dim" style="font-size:11px;line-height:1.4">${d.blurb||''}</div>
      <div class="bench-stat-grid">
        <div class="bench-stat"><div class="k">Diameter</div><div class="v">${d.px.dia/90} m-class</div></div>
        <div class="bench-stat"><div class="k">Connections</div><div class="v">${links.length}</div></div>
        ${eng?`<div class="bench-stat"><div class="k">Thrust</div><div class="v">${Math.round(eng.thrustVac)} kN</div></div><div class="bench-stat"><div class="k">Vac Isp</div><div class="v">${eng.ispVac} s</div></div>`:''}
        ${d.phys.propMass?`<div class="bench-stat"><div class="k">Propellant</div><div class="v">${d.phys.propMass} t</div></div>`:''}
      </div>
      ${opens.length?`<div class="mission-tag" style="margin-top:7px">Open connections</div>${opens.map(n=>`<div class="bench-open-node"><span>${n.at.toUpperCase()} · ${NODE_CLASS[n.class].label}</span><button class="btn ghost" style="font-size:10px;padding:2px 5px" onclick="benchNodeClick('${selected.uid}:${n.id}')">Select</button></div>`).join('')}`:'<div class="dim" style="font-size:11px;margin:7px 0">All connection points are occupied.</div>'}
      <button class="btn ghost" style="font-size:11px;width:100%" onclick="benchDeletePart('${selected.uid}')" ${isRoot?'disabled':''}>${isRoot?'Root part cannot be removed':'Remove part and everything below it'}</button>
    </div>`;
  } else {
    html+=`<div class="bench-inspector-empty">Click a part on the vehicle to inspect it.<br><br>Click a blue ○ connection point to choose where the next part goes.</div>`;
  }
  host.innerHTML=html;
}

function benchSetSymmetry(uid, n){ benchPushUndo(); applySymmetry(benchBuild(), uid, n); renderPartsBench(); }
function renderPartsBench(msg){
  const host=document.getElementById('benchCanvas'); if(!host) return;
  const b=benchBuild();
  const r=renderBuildSVG(b, 260, 420, true);
  // E3.6 toolbar: undo / redo / blueprint toggle
  const toolbar=`<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
    <button class="btn ghost" style="font-size:12px;padding:2px 8px" onclick="benchUndo()" ${_benchUndo.length?'':'disabled'} title="Undo">↶</button>
    <button class="btn ghost" style="font-size:12px;padding:2px 8px" onclick="benchRedo()" ${_benchRedo.length?'':'disabled'} title="Redo">↷</button>
    <button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:auto" onclick="benchToggleBlueprint()" title="Toggle schematic view">${_benchBlueprint?'◑ Rendered':'◈ Blueprint'}</button>
  </div>`;
  if(r.error){ host.innerHTML=toolbar+`<div class="flag warn">${r.error}</div>`; }
  else {
    // blueprint view: cyan-on-navy schematic tint via a wrapper class (CSS filter), rendered art otherwise
    const wrapStyle=_benchBlueprint?'filter:hue-rotate(150deg) saturate(1.6) brightness(1.1);border:1px solid #2a5a7a;border-radius:8px':'';
    host.innerHTML=toolbar+`<div id="benchCanvasInner" style="${wrapStyle}">${r.svg}</div>`;
    host._nodePos=r.nodePos;
    // overlay clickable hit-targets on open nodes (bigger than the visual dot, for touch)
    const svg=host.querySelector('svg');
    if(svg && typeof document.createElementNS==='function' && typeof svg.appendChild==='function'){
      try{
        // Part-sized hit areas make the board feel like an assembly surface instead of a
        // passive illustration. Node hit areas are appended afterward so they win on overlap.
        for(const range of (r.partPos||[])){
          const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');
          hit.setAttribute('x',range.x); hit.setAttribute('y',range.top); hit.setAttribute('width',range.width); hit.setAttribute('height',range.bottom-range.top);
          hit.setAttribute('fill',_benchSelPart===range.uid?'rgba(79,209,217,0.18)':'transparent');
          hit.setAttribute('stroke',_benchSelPart===range.uid?'#4fd1d9':'transparent'); hit.setAttribute('stroke-width','2');
          hit.style.cursor='pointer'; hit.addEventListener('click',()=>benchSelectPart(range.uid)); svg.appendChild(hit);
        }
        for(const p of b.parts) for(const n of openNodes(b,p.uid)){
          const key=p.uid+':'+n.id, pos=r.nodePos[key]; if(!pos) continue;
          const hit=document.createElementNS('http://www.w3.org/2000/svg','circle');
          hit.setAttribute('cx',pos.x); hit.setAttribute('cy',pos.y); hit.setAttribute('r','10');
          hit.setAttribute('fill', _benchSelNode===key?'rgba(90,169,224,0.35)':'transparent');
          hit.setAttribute('stroke', _benchSelNode===key?'#5aa9e0':'transparent');
          hit.style.cursor='pointer';
          hit.addEventListener('click',()=>benchNodeClick(key));
          svg.appendChild(hit);
        }
        svg.addEventListener('dragover', benchCanvasDragOver);
        svg.addEventListener('drop', benchCanvasDrop);
      }catch(_){/* headless / partial DOM — the interactive overlay is pure decoration */}
    }
  }
  const targetReadout=document.getElementById('benchTargetReadout');
  if(targetReadout){
    const t=_benchSelNode&&_benchSelNode.split(':'); const tp=t&&buildPart(b,t[0]); const td=tp&&partDef(tp.defId);
    targetReadout.textContent=td ? `ATTACH TO · ${td.short} / ${t[1].toUpperCase()}` : 'SELECT AN OPEN NODE';
  }
  const pal=document.getElementById('benchPalette'); if(pal) pal.innerHTML=renderPartsPalette();
  const st=document.getElementById('benchPartStats');
  if(st){
    const warns=buildWarnings(b);
    const ir=buildToStageIR(b);
    let html='';
    if(msg) html+=`<div class="flag">${msg}</div>`;
    if(!ir.error){
      const perf=stackPerformanceForBuild(b); // E3.3: booster-aware
      html+=`<div class="metrics"><div class="metric"><div class="k">Δv total</div><div class="v">${Math.round(perf.totalDv)} m/s</div></div>
        <div class="metric"><div class="k">Stages</div><div class="v">${ir.stages.length}</div></div>
        <div class="metric"><div class="k">Liftoff</div><div class="v">${perf.liftoff.toFixed(1)} t</div></div>
        <div class="metric"><div class="k">Liftoff TWR</div><div class="v">${perf.twr.toFixed(2)}</div></div></div>`;
      if(perf.dragLoss>0) html+=`<div class="dim" style="font-size:11px;margin-top:4px">Aero drag costs ${Math.round(perf.dragLoss)} m/s off stage 1${perf.aero&&perf.aero.hasNose?' (nosecone helping)':' — a nosecone would cut this'}.</div>`;
      if(perf.control && !perf.control.hasAvionics) html+=`<div class="dim" style="font-size:11px;margin-top:2px;color:var(--warn)">Open-loop: reliability ×${perf.control.relMult} (no guidance aboard).</div>`;
      if(ir.boosters) html+=`<div class="dim" style="font-size:11px;margin-top:4px">${ir.boosters.count}× booster — boosts liftoff TWR and total Δv above (not shown per-stage, same as the classic bench).</div>`;
      // E3.3: auto-inferred visible stage stack. Firing order is the only physically valid order
      // for a single linear spine — see the E3.3 ROADMAP note on why this is a readout, not a
      // free-reorder control, until the physics core supports non-adjacent staging (it doesn't).
      html+=`<div class="mission-tag" style="margin-top:10px">Stage stack — auto-inferred fire order</div>`;
      html+=`<div class="legs">`+ir.stages.map((s,i)=>{
        const eng=ENGINES[s.eng];
        return `<div class="leg"><span class="legname">Stage ${i+1}${i===0&&ir.boosters?' (+ boosters)':''}</span><span class="legdv">${Math.round(perf.stageDv[i])} m/s</span><span class="legdetail">${eng?eng.name:s.eng} ×${s.count} · TWR ${perf.stageTwr[i].toFixed(2)}</span></div>`;
      }).join('')+`</div>`;
    }
    // placed radial (booster) parts get a symmetry stepper — the only parts symmetry applies to
    const radials=radialParts(b);
    if(radials.length){
      html+=`<div class="mission-tag" style="margin-top:10px">Symmetry</div>`;
      html+=radials.map(({part})=>{
        const def=partDef(part.defId), sym=part.sym||1;
        return `<div style="display:flex;align-items:center;gap:6px;margin:4px 0">
          <span style="font-size:12px;flex:1">${def.name}</span>
          <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="benchSetSymmetry('${part.uid}',${Math.max(1,sym-1)})" ${sym<=1?'disabled':''}>−</button>
          <span style="font-family:var(--mono);font-size:12px;min-width:16px;text-align:center">×${sym}</span>
          <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="benchSetSymmetry('${part.uid}',${Math.min(SYMMETRY_MAX,sym+1)})" ${sym>=SYMMETRY_MAX?'disabled':''}>+</button>
        </div>`;
      }).join('');
    }
    html+=warns.map(w=>`<div class="flag warn">△ ${w}</div>`).join('');
    html+=`<button class="btn ghost" style="font-size:12px;margin-top:8px" onclick="benchReset()">✕ Clear build</button>`;
    st.innerHTML=html;
  }
  benchInspectorHTML(b);
}

/* ============================================================================
   E3.5 — save migration + cutover (SAVE-SAFE, REVERSIBLE design).

   DESIGN DECISION, given this is the only slice that touches real player saves:
   state.stages stays the SOURCE OF TRUTH. state.build is a DERIVED, additive
   companion generated FROM state.stages on load. This means:
     • no destructive migration — the slider bench keeps working unchanged;
     • saves stay backward-readable by older builds (state.stages untouched);
     • migration is one-way stages→build and NEVER throws into the load path
       (any failure leaves state.build null and the game runs exactly as before);
     • flipping BENCH_V2 is a VIEW choice, not a data cutover — the graph is
       always regenerable from stages, so there is no irreversible commit.
   A true destructive cutover (retire state.stages entirely) is deliberately NOT
   done here — it would make saves one-way and a migration bug unrecoverable.
   That can happen later once the part bench has shipped and proven itself.
   ============================================================================ */

// Build a graph from a live state.stages design (+ boosters). Defensive: returns
// null on any problem rather than throwing, so migrateStateToBuild can call it
// from the load path safely. Mirrors the real slider shape, not the test one.
function stateDesignToBuild(st){
  try{
    if(!st || !Array.isArray(st.stages) || !st.stages.length) return null;
    const crewed = (st.eclss && st.eclss!=='none') || (st.crew|0)>0 || !!st.hasCapsule;
    const build={ parts:[], links:[], root:null };
    const add=(defId)=>{ const uid=newPartUid(); build.parts.push({uid, defId, x:0,y:0,rot:0,sym:1}); return uid; };
    const rootUid = add(crewed ? 'capsule_mk1' : 'probe_core');
    build.root=rootUid;
    let prevBottom=rootUid;
    // physical stack is top→bottom = reverse of firing order (stages[0] fires first)
    const topToBottom = st.stages.slice().reverse();
    let firstTankUid=null;
    topToBottom.forEach((stage, idx)=>{
      if(idx>0){
        const dec=add('decoupler');
        build.links.push({parent:prevBottom, parentNode:'bot', child:dec, childNode:'top'});
        prevBottom=dec;
      }
      const tank=add('tank_std');
      const tp=buildPart(build,tank); tp._propOverride = (stage.prop!=null?stage.prop:0);
      build.links.push({parent:prevBottom, parentNode:'bot', child:tank, childNode:'top'});
      const eng=add('engine_a4');
      const ep=buildPart(build,eng); ep._engOverride = stage.eng||'a4'; ep._countOverride = stage.count||1;
      build.links.push({parent:tank, parentNode:'bot', child:eng, childNode:'top'});
      prevBottom=eng;
      // the LAST physical tank (bottom of stack = stage 0 = first to fire) carries any boosters
      firstTankUid=tank;
    });
    // fold the slider boosters onto the first-firing (bottom) tank's radial node
    if(firstTankUid && st.boosters && st.boosters.count>0 && st.boosters.eng){
      const n=Math.min(4, Math.max(1, st.boosters.count|0));
      const b=add('booster_solid');
      const bp=buildPart(build,b);
      bp.sym=n; bp._engOverride=st.boosters.eng; bp._propOverride=st.boosters.prop||0;
      build.links.push({parent:firstTankUid, parentNode:'rad', child:b, childNode:'r'});
    }
    // sanity: the graph must reduce back to the same stage count, else discard it
    const ir=buildToStageIR(build);
    if(ir.error || !ir.stages || ir.stages.length!==st.stages.length) return null;
    return build;
  }catch(e){ return null; }
}

// Called from applyLoadedSave AFTER state is set. Purely additive: sets
// state.build (derived) without ever touching state.stages. Never throws.
function migrateStateToBuild(saved){
  try{
    if(!saved) return;
    if(saved.build && saved.build.parts && saved.build.parts.length) return; // already has one (future-proof)
    const b=stateDesignToBuild(saved);
    if(b) saved.build=b; // additive only; leave stages as the source of truth
  }catch(e){/* migration is best-effort — a failure just means no graph, game runs as before */}
}
