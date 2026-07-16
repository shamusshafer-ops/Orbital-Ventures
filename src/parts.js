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
const BENCH_V2 = false;

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
    era:0, dia:1.0,
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'} ],
    // propMass is the *nominal full* load; the bench lets the player stretch it
    // (E3.2). Dry structural mass is computed via the existing tankStruct() at
    // bridge time, NOT stored here — so tank material σ keeps applying.
    phys:{ propMass:8.0, dragCoeff:0.2, crossSection:1.0 },
    blurb:'A stretchable propellant tank. The backbone of every stage.',
  },
  decoupler: {
    id:'decoupler', cat:'structural', name:'Stage Decoupler', short:'DEC',
    era:0, dia:1.0,
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'} ],
    // A decoupler is the staging boundary: everything below it separates as a
    // spent stage. Small real mass; carries no propellant.
    phys:{ dryMass:0.08, dragCoeff:0.1, crossSection:1.0, isDecoupler:true },
    blurb:'Separates a spent stage. Defines where one stage ends and the next begins.',
  },
  nosecone: {
    id:'nosecone', cat:'structural', name:'Aerodynamic Nosecone', short:'NOS',
    era:0, dia:1.0,
    nodes:[ {id:'bot', at:'bottom', class:'small'} ], // caps a stack — bottom node only
    phys:{ dryMass:0.12, dragCoeff:0.05, crossSection:1.0 }, // low drag is the point
    blurb:'Caps the stack and cuts drag. The pointy end goes up.',
  },
  // — propulsion —
  engine_a4: {
    id:'engine_a4', cat:'propulsion', name:'V-2 (A-4) Powerplant', short:'ENG',
    era:0, dia:1.0, engId:'a4', // pulls thrust/isp/mass/cost/rel from ENGINES.a4
    nodes:[ {id:'top', at:'top', class:'small'} ], // engine hangs off the bottom of a tank
    phys:{ dragCoeff:0.3, crossSection:1.0 },
    blurb:'The engine that started it all. Mounts to the base of a stage.',
  },
  // — payload —
  capsule_mk1: {
    id:'capsule_mk1', cat:'payload', name:'Crew Capsule', short:'CAP',
    era:0, dia:1.0,
    nodes:[ {id:'bot', at:'bottom', class:'small'} ],
    phys:{ dryMass:1.2, crew:1, dragCoeff:0.4, crossSection:1.0, isPayload:true, hasAvionics:true },
    blurb:'A one-seat crew capsule. Its avionics fly the rocket.',
  },
  probe_core: {
    id:'probe_core', cat:'avionics', name:'Probe Guidance Core', short:'GNC',
    era:0, dia:1.0,
    nodes:[ {id:'top', at:'top', class:'small'}, {id:'bot', at:'bottom', class:'small'} ],
    phys:{ dryMass:0.15, dragCoeff:0.1, crossSection:1.0, hasAvionics:true, isPayload:true },
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
  // parts attached at a radial node — boosters etc. (none in the E3.0 viable set)
  const radialLinks=build.links.filter(l=>l.parentNode==='radial');
  return radialLinks.map(l=>({link:l, part:buildPart(build,l.child)}));
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
function buildToStageIR(build){
  if(!build || !build.parts || !build.parts.length) return {error:'empty build'};
  const spine=stackSpine(build);
  if(!spine.length) return {error:'no spine'};

  // Group spine parts into stages at decoupler boundaries. Spine is top→bottom;
  // a decoupler ends the stage that sits ABOVE it (that hardware separates).
  const groups=[]; let cur=[];
  for(const part of spine){
    const def=partDef(part.defId); if(!def) return {error:'unknown part '+part.defId};
    if(def.phys.isDecoupler){ groups.push(cur); cur=[]; continue; } // boundary — decoupler itself is negligible structure
    cur.push(part);
  }
  groups.push(cur);
  // groups are top→bottom; firing order is bottom→top, so reverse.
  groups.reverse();

  let payload=0, crew=0; const warnings=[];
  const stages=[];
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
      if(nonPropDry>0) payload+=nonPropDry; // dead structure in a live stage still rides as mass; fold to payload (conservative, matches old "extras are payload" treatment)
    } else {
      // no engine or no propellant → this is payload/structure the stack lofts
      for(const part of group){ const def=partDef(part.defId); payload+=(def.phys.dryMass||0)*(part.sym||1); }
      if(engId && stageProp<=0) warnings.push('A stage has an engine but no propellant.');
    }
  }

  if(!stages.length) return {error:'no propulsive stage — add a tank and an engine'};
  return { stages, payload:round2(payload), crew, warnings };
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
