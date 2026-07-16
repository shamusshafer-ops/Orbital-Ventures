// E3.5 — save migration + cutover (SAVE-SAFE design). The one slice touching real player saves, so
// this is the safety proof. Validates: state.stages -> state.build derivation round-trips (the graph
// reduces back to the SAME stages via the E3.0-proven bridge), migration is purely ADDITIVE (never
// mutates state.stages), migration NEVER throws (malformed/empty designs yield null, game runs on),
// boosters carry across, and a pre-v54 save (no build field) loads and gains a derived graph.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. Basic derivation round-trips through the proven bridge ----------
{
  const st={ stages:[{eng:'kerolox_mk1',count:1,prop:12},{eng:'hyper_storable',count:1,prop:4}],
             boosters:{eng:null,count:0,prop:0}, eclss:'open' };
  const build=stateDesignToBuild(st);
  check('derive: produced a build', !!build);
  const ir=buildToStageIR(build);
  check('derive: reduces to the same stage COUNT', ir.stages.length===st.stages.length);
  check('derive: stage 0 prop matches (firing order preserved)', ir.stages[0].prop===12);
  check('derive: stage 0 engine matches', ir.stages[0].eng==='kerolox_mk1');
  check('derive: stage 1 engine matches', ir.stages[1].eng==='hyper_storable');
  check('derive: stage counts match', ir.stages[0].count===1 && ir.stages[1].count===1);
}

// ---------- 2. Crewed vs uncrewed root ----------
{
  const crewed=stateDesignToBuild({stages:[{eng:'a4',count:1,prop:8}], eclss:'open'});
  const uncrewed=stateDesignToBuild({stages:[{eng:'a4',count:1,prop:8}], eclss:'none'});
  check('root: eclss!=none -> crew capsule root', partDef(crewed.parts.find(p=>p.uid===crewed.root).defId).cat==='payload');
  check('root: eclss==none -> probe core root', partDef(uncrewed.parts.find(p=>p.uid===uncrewed.root).defId).cat==='avionics');
}

// ---------- 3. Boosters carry across ----------
{
  const st={ stages:[{eng:'kerolox_mk1',count:1,prop:12}], boosters:{eng:'solid_castor',count:3,prop:5}, eclss:'none' };
  const build=stateDesignToBuild(st);
  const ir=buildToStageIR(build);
  check('boosters: derived build has boosters', !!ir.boosters);
  check('boosters: count carried (3)', ir.boosters && ir.boosters.count===3);
  check('boosters: engine carried', ir.boosters && ir.boosters.eng==='solid_castor');
}

// ---------- 4. Migration is purely ADDITIVE — never mutates state.stages ----------
{
  const saved={ stages:[{eng:'kerolox_mk1',count:2,prop:20}], boosters:{eng:null,count:0,prop:0}, eclss:'open', year:1960, company:'TEST' };
  const stagesBefore=JSON.stringify(saved.stages);
  migrateStateToBuild(saved);
  check('additive: state.build was set', !!saved.build);
  check('additive: state.stages is byte-identical (untouched)', JSON.stringify(saved.stages)===stagesBefore);
  check('additive: the derived build round-trips to the same stages', buildToStageIR(saved.build).stages.length===saved.stages.length);
}

// ---------- 5. Migration NEVER throws; bad input yields no graph, game runs on ----------
{
  check('safe: null saved -> no throw', (migrateStateToBuild(null), true));
  const noStages={year:1960, company:'X'};
  migrateStateToBuild(noStages);
  check('safe: no-stages save gets no build (not a crash)', noStages.build===undefined);
  const emptyStages={stages:[], company:'X', year:1960};
  migrateStateToBuild(emptyStages);
  check('safe: empty-stages save gets no build', emptyStages.build===undefined);
  check('safe: stateDesignToBuild(garbage) returns null', stateDesignToBuild({stages:'not an array'})===null);
  check('safe: stateDesignToBuild(undefined) returns null', stateDesignToBuild(undefined)===null);
}

// ---------- 6. Idempotent: an already-migrated save isn't re-derived ----------
{
  const saved={ stages:[{eng:'a4',count:1,prop:8}], boosters:{eng:null,count:0,prop:0}, eclss:'none', year:1950, company:'X' };
  migrateStateToBuild(saved);
  const firstBuild=saved.build;
  migrateStateToBuild(saved);
  check('idempotent: second migration keeps the existing build', saved.build===firstBuild);
}

// ---------- 7. Round-trip fidelity across several real-shaped designs ----------
{
  const designs=[
    {stages:[{eng:'a4',count:1,prop:8}], boosters:{eng:null,count:0,prop:0}, eclss:'none'},
    {stages:[{eng:'kerolox_mk3',count:4,prop:40},{eng:'kerolox_mk1',count:1,prop:12},{eng:'hyper_storable',count:1,prop:3}], boosters:{eng:null,count:0,prop:0}, eclss:'open'},
    {stages:[{eng:'kerolox_mk1',count:1,prop:15}], boosters:{eng:'solid_castor',count:2,prop:6}, eclss:'none'},
  ];
  let allRoundTrip=true;
  for(const d of designs){
    const b=stateDesignToBuild(d);
    if(!b){ allRoundTrip=false; continue; }
    const ir=buildToStageIR(b);
    if(ir.stages.length!==d.stages.length) allRoundTrip=false;
    for(let i=0;i<d.stages.length;i++){
      if(ir.stages[i].eng!==d.stages[i].eng) allRoundTrip=false;
      if(ir.stages[i].prop!==d.stages[i].prop) allRoundTrip=false;
      if(ir.stages[i].count!==d.stages[i].count) allRoundTrip=false;
    }
  }
  check('round-trip: all real-shaped designs reduce back to their exact stages', allRoundTrip);
}

// ---------- 8. SAVE_VERSION bumped, still safe to load a pre-v54 shape ----------
{
  check('version: SAVE_VERSION is at least 54', SAVE_VERSION>=54);
  // simulate applyLoadedSave's additive migration on a "pre-v54" save (no build field)
  const preV54={ stages:[{eng:'a4',count:1,prop:8}], boosters:{eng:null,count:0,prop:0}, eclss:'open', year:1955, company:'LEGACY' };
  check('version: pre-v54 save has no build field initially', preV54.build===undefined);
  migrateStateToBuild(preV54);
  check('version: loads + gains a derived build (backward compatible)', !!preV54.build);
}

// ---------- 9. PHYSICS PARITY: a derived graph flies the same Δv as its slider source ----------
// (This is the check that caught the booster _propOverride bug — a migrated design with non-default
//  booster prop would otherwise silently drift. Compares at matched payload, drag added back.)
{
  function parity(name, stages, boosters, eclss){
    const build=stateDesignToBuild({stages, boosters, eclss});
    const ir=buildToStageIR(build);
    const savedB=state.boosters; state.boosters=boosters||{eng:null,count:0,prop:0};
    const slider=stackPerformance(stages, ir.payload); // same payload the graph derived
    state.boosters=savedB;
    const graph=stackPerformanceForBuild(build);
    const graphDvNoDrag=graph.totalDv+(graph.dragLoss||0);
    check('parity: '+name+' — derived graph matches slider Δv (drag added back)', Math.abs(graphDvNoDrag - slider.totalDv) < 2);
  }
  parity('single stage, no boosters', [{eng:'a4',count:1,prop:8}], {eng:null,count:0,prop:0}, 'none');
  parity('two stage crewed', [{eng:'kerolox_mk1',count:2,prop:24},{eng:'hyper_storable',count:1,prop:5}], {eng:null,count:0,prop:0}, 'open');
  parity('with default-prop boosters', [{eng:'kerolox_mk1',count:1,prop:12}], {eng:'solid_castor',count:2,prop:5}, 'open');
  parity('with NON-default-prop boosters (the bug case)', [{eng:'kerolox_mk1',count:2,prop:24},{eng:'hyper_storable',count:1,prop:5}], {eng:'solid_castor',count:2,prop:6}, 'open');
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
