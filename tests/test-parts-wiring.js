// E3.7 (2026-11-14): the part bench drives the FLOWN rocket.
// Parts → design (benchCommit writes state.stages/state.boosters), design → parts (benchBuild regenerates the
// graph when the flown design changes elsewhere), payload from the mission, engine clusters, campaign reset,
// reorganization guard, and aero drag as real flight physics in computeVehicle() and simulateMission().
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
const irOf=b=>buildToStageIR(b);
const sameStages=(a,b)=>designSig(a,null)===designSig(b,null);

// DOM: renderPartsBench writes into these; cache them so the test can read the HTML back.
const _el={};
const _gebi=document.getElementById.bind(document);
document.getElementById=id=>{
  if(id==='benchCanvas'||id==='benchPartStats'||id==='benchPalette') return _el[id]||(_el[id]={id,innerHTML:'',querySelector:()=>null});
  return _gebi(id);
};

// ---------- 1. a new game: one rocket, both benches agree ----------
{
  newGame('engineer');
  const b=benchBuild();
  const root=b.parts.find(p=>p.uid===b.root);
  check('new game: payload root follows the uncrewed First Flight (probe, not a 1.2 t capsule)', root.defId==='probe_core');
  check('new game: graph reduces to exactly the flown stages', sameStages(irOf(b).stages, state.stages));
  renderPartsBench();
  const v=computeVehicle();
  const html=_el.benchPartStats.innerHTML;
  check('readout: part bench shows the flown Δv (computeVehicle)', html.includes(`${Math.round(v.totalDv)} m/s`));
  check('readout: part bench shows the flown liftoff mass', html.includes(`${v.liftoff.toFixed(1)} t`));
  check('readout: payload is the mission\'s (50 kg), labelled with the mission', html.includes('50 kg') && html.includes(curMission().name));
}

// ---------- 2. parts → design ----------
{
  newGame('engineer');
  benchReset();
  const before=JSON.stringify(state.stages);
  check('unflyable: clearing the build leaves the flown rocket untouched', JSON.stringify(state.stages)===before);
  check('unflyable: the player is told why', /Not flyable as built/.test(_benchFlash||''));
  benchPaletteClick('tank_std');
  { const t=benchBuild().parts.find(p=>p.defId==='tank_std'); _benchSelNode=t.uid+':bot'; }
  benchPaletteClick('tank_std');   // two tanks in one stage: propellant adds
  { const sp=stackSpine(benchBuild()); _benchSelNode=sp[sp.length-1].uid+':bot'; }
  benchPaletteClick('engine_a4');
  check('attach: a flyable graph is written to state.stages', state.stages.length===1 && state.stages[0].eng==='a4' && state.stages[0].prop===16);
  check('attach: tank diameter carried into the stage', state.stages[0].dia===1);
  check('attach: state.build is the live graph', state.build===benchBuild());
  const eng=benchEngineParts(benchBuild())[0];
  benchSetEngineCount(eng.uid, 3);
  check('cluster: engine count stepper writes the stage count', state.stages[0].count===3);
  benchSetEngineCount(eng.uid, 99);
  check('cluster: capped at the slider bench\'s 8', state.stages[0].count===8);
  benchUndo();
  check('undo: writes the previous design back', state.stages[0].count===3);
  benchRedo();
  check('redo: writes it forward again', state.stages[0].count===8);
  const tank=benchBuild().parts.find(p=>p.defId==='tank_std');
  benchDeletePart(tank.uid);
  check('delete: removing the propulsive stage is unflyable, so the flown rocket keeps its last design', state.stages[0].count===8 && state.stages[0].prop===16);
  benchUndo();
  check('undo after delete: graph and design agree again', sameStages(irOf(benchBuild()).stages, state.stages));
}

// ---------- 3. design → parts ----------
{
  newGame('engineer');
  benchBuild();
  setProp(0, 5.5);
  check('slider edit: graph regenerates to the new propellant', irOf(benchBuild()).stages[0].prop===5.5);
  check('slider edit: the replaced graph is undoable', _benchUndo.length>=1);
  setStageDia(0, 1.3);
  const d=irOf(benchBuild()).stages[0].dia;
  check('slider diameter: carried into the graph', Math.abs(d-1.3)<1e-9);
  // a part edit after a slider diameter change keeps the diameter
  const b=benchBuild(); _benchSelNode=b.root+':top'; benchPaletteClick('nosecone');
  check('round trip: a part edit preserves the slider-set diameter', Math.abs(state.stages[0].dia-1.3)<1e-9);
  setCount(0, 1); // slider engine count → graph engine override
  check('slider engine count: carried into the graph', benchEngineParts(benchBuild())[0]._countOverride===state.stages[0].count);
  // blueprint / snapshot loads rewrite stages without touching the part bench
  const snap=fullBenchSnapshot(); snap.stages=[{eng:'a4',count:1,prop:3},{eng:'a4',count:1,prop:1}];
  applyFullSnapshot(snap);
  check('snapshot load: graph regenerates to the loaded two-stage design', irOf(benchBuild()).stages.length===2 && sameStages(irOf(benchBuild()).stages, state.stages));
}

// ---------- 3b. a two-stage rocket can be built by hand, and flies as built ----------
{
  newGame('engineer');
  benchReset();
  const click=(defId, nodeKey)=>{ _benchSelNode=nodeKey||null; benchPaletteClick(defId); };
  const last=()=>{ const sp=stackSpine(benchBuild()); return sp[sp.length-1].uid; };
  click('tank_std');                 // upper tank under the probe (auto-target)
  click('engine_a4', last()+':bot'); // upper engine
  click('decoupler', last()+':bot'); // interstage below the upper engine
  click('tank_std', last()+':bot');  // lower tank
  click('engine_a4', last()+':bot'); // lower engine
  check('by hand: two stages reach the flown design', state.stages.length===2);
  check('by hand: graph and flown design agree', sameStages(irOf(benchBuild()).stages, state.stages));
  check('by hand: only a decoupler fits below an engine', canAttach(benchBuild(), last(), 'bot', 'tank_std').ok===false
    && canAttach(benchBuild(), last(), 'bot', 'decoupler').ok===true);
}

// ---------- 4. limits ----------
{
  newGame('engineer');
  const four={eng:'a4',count:1,prop:2};
  const g=emptyBuild('probe_core'); let parent=g.root;
  for(let i=0;i<4;i++){ if(i>0) parent=attachPart(g,parent,'bot','decoupler'); const t=attachPart(g,parent,'bot','tank_std'); parent=attachPart(g,t,'bot','engine_a4'); }
  check('limits: a 4-stage graph is refused (pad integrates at most 3)', /stages/.test(benchFlyable(irOf(g))||''));
  check('limits: a 1-stage graph is flyable', benchFlyable(irOf(benchBuild()))===null);
  void four;
}

// ---------- 5. campaign boundary ----------
{
  newGame('engineer');
  benchBuild(); setProp(0, 7); benchBuild(); // sync is lazy: the graph regenerates when the bench next reads it
  check('precondition: undo history exists', _benchUndo.length>0);
  newGame('engineer');
  check('new campaign: no graph or undo history from the previous one', _benchBuild===null && _benchUndo.length===0 && _benchSyncSig===null);
  check('new campaign: graph rebuilds from the new design', sameStages(irOf(benchBuild()).stages, state.stages));
}

// ---------- 6. reorganization guard ----------
{
  newGame('engineer'); benchBuild();
  const before=JSON.stringify(state.stages), parts=benchBuild().parts.length;
  const realGuard=guardOrdinaryAction;
  guardOrdinaryAction=()=>false;
  try{
    const eng=benchEngineParts(benchBuild())[0];
    benchSetEngineCount(eng.uid, 4);
    _benchSelNode=benchBuild().root+':top'; benchPaletteClick('nosecone');
    benchReset();
  } finally { guardOrdinaryAction=realGuard; }
  check('guard: blocked part edits change neither the graph nor the flown rocket', JSON.stringify(state.stages)===before && benchBuild().parts.length===parts);
}

// ---------- 7. aero drag is real flight physics ----------
{
  newGame('engineer'); devUnlockAllResearch();
  const orbital=[{eng:'kerolox_mk2',count:1,prop:60,dia:1},{eng:'kerolox_le',count:1,prop:12,dia:1}];
  const dragFor=(missionId, fairing)=>{
    state.activeMission=missionId; state.stages=JSON.parse(JSON.stringify(orbital)); state.boosters={eng:null,count:0,prop:0};
    state.parts=Object.assign(defaultParts(),{fairing}); state.build=null; resetBenchTransients();
    return computeVehicle();
  };
  const unc=dragFor('first_sat','standard'), bare=dragFor('first_sat','none'), crew=dragFor('crew_orbit','standard');
  check('drag: every flight loses some stage-1 Δv', unc.dragLoss>0 && crew.dragLoss>0);
  check('drag: total Δv is stage-1 drag below the raw stack', Math.abs((stackPerformance(state.stages, crew.payload).totalDv - crew.dragLoss) - crew.totalDv) < 1e-6);
  check('drag: an uncrewed payload fairing halves it', Math.abs(bare.dragLoss/unc.dragLoss - 2) < 0.15);
  check('drag: a bare crewed capsule pays more than a faired probe', crew.dragLoss > unc.dragLoss);
  check('drag: bounded by AERO_LOSS_CAP', crew.dragLoss <= (crew.stageDv[0]+crew.dragLoss)*AERO_LOSS_CAP + 1e-9);
  check('drag: never inside stackPerformance (equivalence harness contract)', stackPerformance(orbital,0.1).dragLoss===undefined);
  // the launch leg of a multi-leg mission pays the same drag the bench shows
  state.activeMission='luna_flyby'; state.parts=defaultParts(); state.build=null; resetBenchTransients();
  state.stages=[{eng:'f1_class',count:5,prop:2000,dia:1.4},{eng:'hydrolox_up',count:5,prop:450,dia:1.4},{eng:'hydrolox_up',count:1,prop:110,dia:1.2}];
  const m=curMission(), sim=simulateMission(m), lv=sim.legs.find(l=>l.by==='lv');
  const f=aeroLossFrac(m);
  check('drag: multi-leg mission has a launch leg (precondition)', !!lv && f>0);
  const raw=stackPerformance(state.stages, lv.mass);
  check('drag: simulateMission launch leg = raw stack minus stage-1 drag', Math.abs(lv.cap - Math.round(raw.totalDv - raw.stageDv[0]*f)) <= 1);
  // a nosecone on an uncrewed probe cuts drag below the fairing-only figure
  state.activeMission='first_sat'; state.stages=JSON.parse(JSON.stringify(orbital)); state.parts=Object.assign(defaultParts(),{fairing:'none'}); state.build=null; resetBenchTransients();
  const noNose=computeVehicle().dragLoss;
  const b=benchBuild(); _benchSelNode=b.root+':top'; benchPaletteClick('nosecone');
  check('drag: adding a nosecone on the bench reduces flown drag', computeVehicle().dragLoss < noNose);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
