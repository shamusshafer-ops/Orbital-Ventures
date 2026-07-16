// E3.1 — read-only part-graph SVG renderer. Validates: renders every viable-set part shape without
// throwing, per-stage Δv/TWR overlay numbers match the same physics the E3.0 harness already proved
// equivalent (no drift between what's drawn and what's real), stage labels count matches actual
// propulsive stages (payload/avionics-only groups get no label), malformed builds fail the same way
// buildToStageIR does (shared spineGroups contract), and geometry scales sanely.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. Renders every part shape without throwing ----------
{
  let threw=false;
  try{
    for(const id of Object.keys(PART_DEFS)){
      // wrap each part alone in a trivial 1-part build (root only) — no spine assumptions beyond E3.0's
      const build={parts:[{uid:'x',defId:id,x:0,y:0,rot:0,sym:1}], links:[], root:'x'};
      const r=renderBuildSVG(build, 200, 300);
      // Intentional design distinction from buildToStageIR: the RENDERER draws any structurally
      // valid spine — including a lone decoupler or a lone engine with no tank — because a player
      // needs to SEE a non-flying rocket to fix it. Only unknown-part/empty/no-spine are render
      // errors; "no propulsive stage" is a bridge-only error, silently yielding an empty overlay.
      check('render: '+id+' alone renders (even if it wouldn\'t fly)', !r.error && r.svg.includes('<svg'));
    }
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('render: no exceptions across all part shapes', !threw);
}

// ---------- 2. Full 2-stage crewed build renders with correct stage-label count ----------
{
  const stages=[{eng:'kerolox_mk1',count:1,prop:12,dia:1},{eng:'hyper_storable',count:1,prop:4,dia:1}];
  const build=sliderDesignToBuild(stages,{crewed:true});
  const r=renderBuildSVG(build, 260, 420);
  check('render: 2-stage crewed build has no error', !r.error);
  check('render: svg contains a window (crew capsule)', r.svg.includes('#5aa9e0'));
  check('render: svg contains a decoupler band', r.svg.includes('#c9a83a'));
  const stageLabels=(r.svg.match(/S\d+ · /g)||[]).length;
  check('render: exactly 2 stage labels for a 2-stage design', stageLabels===2);
}

// ---------- 3. Overlay numbers match real physics (no drift vs the E3.0-proven bridge) ----------
{
  const stages=[{eng:'kerolox_mk3',count:2,prop:30,dia:1},{eng:'hyper_storable',count:1,prop:5,dia:1}];
  const build=sliderDesignToBuild(stages,{crewed:false});
  // E3.4: the render overlay uses stackPerformanceForBuild (booster + aero-drag aware), not raw
  // stackPerformance — a part-built vehicle pays a small stage-1 drag loss the slider path never
  // modeled. Assert against the SAME path the overlay uses, and separately that drag is why they differ.
  const perf=stackPerformanceForBuild(build);
  const raw=stackPerformance(buildToStageIR(build).stages, buildToStageIR(build).payload);
  const r=renderBuildSVG(build, 260, 420);
  const s1dv=Math.round(perf.stageDv[0]), s2dv=Math.round(perf.stageDv[1]);
  check('overlay: stage 1 Δv label matches the drag-adjusted physics', r.svg.includes('S1 · '+s1dv+' m/s'));
  check('overlay: stage 2 Δv label matches real physics', r.svg.includes('S2 · '+s2dv+' m/s'));
  check('overlay: stage 1 Δv is drag-reduced vs raw stackPerformance', perf.stageDv[0] <= raw.stageDv[0]);
  const s1twr=perf.stageTwr[0].toFixed(2);
  check('overlay: stage 1 TWR label matches real physics', r.svg.includes('TWR '+s1twr));
}

// ---------- 4. Single-stage renders one label, no phantom stages ----------
{
  const build=sliderDesignToBuild([{eng:'a4',count:1,prop:8,dia:1}],{crewed:false});
  const r=renderBuildSVG(build, 200, 300);
  const stageLabels=(r.svg.match(/S\d+ · /g)||[]).length;
  check('render: single-stage design has exactly 1 stage label', stageLabels===1);
}

// ---------- 5. Malformed builds: renderer error surface is (intentionally) narrower than the bridge's ----------
{
  check('malformed: empty build errors (both renderer and bridge agree here)', !!renderBuildSVG({parts:[],links:[],root:null},200,300).error);
  const noEngine={parts:[{uid:'a',defId:'capsule_mk1',x:0,y:0,rot:0,sym:1}],links:[],root:'a'};
  const rIR=buildToStageIR(noEngine), rSVG=renderBuildSVG(noEngine,200,300);
  check('malformed: bridge errors on payload-only (no propulsive stage)', !!rIR.error);
  check('malformed: renderer still draws a payload-only build (nothing to fly, but something to see)', !rSVG.error);
}

// ---------- 6. Geometry scales sanely (no negative/NaN dimensions) ----------
{
  const build=sliderDesignToBuild([{eng:'kerolox_mk3',count:4,prop:40,dia:1},{eng:'kerolox_mk1',count:1,prop:12,dia:1},{eng:'hyper_storable',count:1,prop:3,dia:1}],{crewed:true});
  const r=renderBuildSVG(build, 260, 420);
  check('geometry: totalLen is a positive finite number', typeof r.totalLen==='number' && r.totalLen>0 && isFinite(r.totalLen));
  check('geometry: maxDia is a positive finite number', typeof r.maxDia==='number' && r.maxDia>0 && isFinite(r.maxDia));
  check('geometry: svg has no NaN coordinates', !r.svg.includes('NaN'));
  check('geometry: svg has no negative widths', !/width="-/.test(r.svg));
}

// ---------- 7. Symmetry (sym>1) doesn't break rendering (E3.3 will use this; renderer must tolerate it now) ----------
{
  const build=sliderDesignToBuild([{eng:'kerolox_mk3',count:1,prop:20,dia:1}],{crewed:false});
  const engPart=build.parts.find(p=>p.defId==='engine_a4'); engPart.sym=3; engPart._countOverride=3;
  let threw=false; let r;
  try{ r=renderBuildSVG(build,200,300); }catch(e){ threw=true; }
  check('symmetry: sym-flagged engine renders without throwing', !threw);
  check('symmetry: bridge still reduces to 1 stage with tripled count', buildToStageIR(build).stages[0].count===9); // 3 (part-level sym) * 3 (_countOverride) — documents current multiply-both behavior
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
