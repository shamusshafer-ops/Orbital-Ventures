// Tier 1.1 (2026-08-04) — in-flight anomaly pool expansion, 3 → 10.
// Guards the structural contract every entry must satisfy, the research-gating on entries that
// presuppose a capability, the always-available-safe-option convention, and (critically) that
// expanding the pool did NOT change anomaly frequency — this slice adds variety, not risk.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// A representative spread of flight contexts. `when()`/`options()` must survive all of them.
function mk(overrides){
  const m=Object.assign({id:'t_mission', name:'Test Mission', reqDv:9400, days:0, crew:0}, overrides.m||{});
  return Object.assign({m, crewed:false, rehearsed:false, v:null, sim:null}, overrides, {m});
}
const CONTEXTS=[
  {label:'suborbital uncrewed', ctx:mk({m:{reqDv:3000, days:0}})},
  {label:'orbital uncrewed',    ctx:mk({m:{reqDv:9400, days:1}})},
  {label:'orbital crewed',      ctx:mk({m:{reqDv:9400, days:4, crew:2}, crewed:true})},
  {label:'profile deep uncrewed', ctx:mk({m:{reqDv:9400, days:180, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}})},
  {label:'profile deep crewed',   ctx:mk({m:{reqDv:9400, days:240, crew:3, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}, crewed:true})},
  {label:'tanker',              ctx:mk({m:{reqDv:9400, days:2, tanker:true}})},
];

// ---------- structural contract ----------
{
  check('pool expanded to 10 entries', MISSION_ANOMALIES.length===10);

  const ids=MISSION_ANOMALIES.map(a=>a.id);
  check('every anomaly id is unique', new Set(ids).size===ids.length);
  check('every anomaly has id/title/detail/when/options', MISSION_ANOMALIES.every(a=>
    typeof a.id==='string' && a.id &&
    typeof a.title==='string' && a.title &&
    typeof a.detail==='string' && a.detail &&
    typeof a.when==='function' && typeof a.options==='function'));

  // The three originals must survive untouched by id — protected baseline.
  for(const id of ['solar_array','ls_leak','guidance']){
    check(`original anomaly "${id}" still present`, ids.includes(id));
  }
}

// ---------- when()/options() never throw, across every context ----------
{
  let threw=null;
  for(const {label, ctx} of CONTEXTS){
    for(const a of MISSION_ANOMALIES){
      try{ const el=a.when(ctx); if(el) a.options(ctx); }
      catch(e){ threw=`${a.id} @ ${label}: ${e.message}`; }
    }
  }
  check('no anomaly when()/options() throws in any context', threw===null);
  if(threw) console.log('   threw:', threw);
}

// ---------- every entry is reachable in at least one context ----------
{
  // grant every research id any entry gates on, so gating alone can't make one unreachable here
  const savedResearch=state.research;
  state.research={digital_computer:true, orbital_assembly:true, orbital_eva:true};
  const reachable=new Set();
  for(const {ctx} of CONTEXTS){
    for(const a of MISSION_ANOMALIES){
      try{ if(a.when(ctx) && a.options(ctx).length>0) reachable.add(a.id); }catch(e){}
    }
  }
  state.research=savedResearch;
  const unreachable=MISSION_ANOMALIES.map(a=>a.id).filter(id=>!reachable.has(id));
  check('every anomaly is reachable in at least one context (with research granted)', unreachable.length===0);
  if(unreachable.length) console.log('   unreachable:', unreachable.join(', '));
}

// ---------- option contract ----------
{
  let bad=null;
  for(const {label, ctx} of CONTEXTS){
    for(const a of MISSION_ANOMALIES){
      let opts=[]; try{ if(!a.when(ctx)) continue; opts=a.options(ctx); }catch(e){ continue; }
      for(const o of opts){
        if(typeof o.id!=='string' || !o.id) bad=`${a.id}/${label}: option missing id`;
        else if(typeof o.label!=='string' || !o.label) bad=`${a.id}/${o.id}: option missing label`;
        else if(typeof o.resolve!=='function') bad=`${a.id}/${o.id}: option missing resolve()`;
      }
    }
  }
  check('every option has id/label/resolve()', bad===null);
  if(bad) console.log('   bad:', bad);
}

// ---------- resolve() never throws and returns a well-formed effect, on both RNG extremes ----------
{
  let bad=null;
  const rngLow=()=>0.0, rngHigh=()=>0.999999;
  for(const {label, ctx} of CONTEXTS){
    for(const a of MISSION_ANOMALIES){
      let opts=[]; try{ if(!a.when(ctx)) continue; opts=a.options(ctx); }catch(e){ continue; }
      for(const o of opts){
        for(const [rname, rng] of [['lucky',rngLow],['unlucky',rngHigh]]){
          let eff;
          try{ eff=o.resolve(rng); }
          catch(e){ bad=`${a.id}/${o.id} (${rname}) threw: ${e.message}`; continue; }
          if(!eff || typeof eff!=='object'){ bad=`${a.id}/${o.id} (${rname}) returned no effect object`; continue; }
          if(typeof eff.log!=='string' || !eff.log) bad=`${a.id}/${o.id} (${rname}) missing log text`;
          if(eff.payoutMult!==undefined && !(typeof eff.payoutMult==='number' && eff.payoutMult>=0)) bad=`${a.id}/${o.id}: bad payoutMult`;
          if(eff.repDelta!==undefined && typeof eff.repDelta!=='number') bad=`${a.id}/${o.id}: bad repDelta`;
          if(eff.outcomeOverride!==undefined && !['partial','strand','scrub','loss'].includes(eff.outcomeOverride)) bad=`${a.id}/${o.id}: bad outcomeOverride "${eff.outcomeOverride}"`;
        }
      }
    }
  }
  check('every option resolve() is safe and well-formed on both RNG extremes', bad===null);
  if(bad) console.log('   bad:', bad);
}

// ---------- convention: a safe option is always available ----------
// Every anomaly must offer at least one option that cannot strand/lose the crew even on the worst
// roll — the player is never forced to gamble lives.
{
  const rngWorst=()=>0.999999;
  let unsafe=[];
  for(const {ctx} of CONTEXTS){
    for(const a of MISSION_ANOMALIES){
      let opts=[]; try{ if(!a.when(ctx)) continue; opts=a.options(ctx); }catch(e){ continue; }
      if(!opts.length) continue;
      const hasSafe=opts.some(o=>{
        try{ const e=o.resolve(rngWorst)||{}; return e.outcomeOverride!=='strand' && e.outcomeOverride!=='loss'; }
        catch(err){ return false; }
      });
      if(!hasSafe && !unsafe.includes(a.id)) unsafe.push(a.id);
    }
  }
  check('every anomaly always offers a non-fatal option', unsafe.length===0);
  if(unsafe.length) console.log('   no safe option:', unsafe.join(', '));
}

// ---------- research gating: capability-presupposing entries stay locked without their research ----------
{
  const deepCrewed=mk({m:{reqDv:9400, days:240, crew:3, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}, crewed:true});

  const byId=id=>MISSION_ANOMALIES.find(a=>a.id===id);
  const saved=state.research;

  state.research={};
  check('guidance_alarm gated off without digital_computer', byId('guidance_alarm').when(deepCrewed)===false);
  check('dock_latch gated off without orbital_assembly', byId('dock_latch').when(deepCrewed)===false);

  state.research={digital_computer:true, orbital_assembly:true};
  check('guidance_alarm eligible once digital_computer is researched', byId('guidance_alarm').when(deepCrewed)===true);
  check('dock_latch eligible once orbital_assembly is researched', byId('dock_latch').when(deepCrewed)===true);

  // the EVA branch inside dock_latch is separately gated on orbital_eva
  const withoutEva=byId('dock_latch').options(deepCrewed).map(o=>o.id);
  check('dock_latch has no EVA option without orbital_eva', !withoutEva.includes('eva_latch'));
  state.research.orbital_eva=true;
  const withEva=byId('dock_latch').options(deepCrewed).map(o=>o.id);
  check('dock_latch gains its EVA option with orbital_eva', withEva.includes('eva_latch'));

  state.research=saved;
}

// ---------- crewed-only branches never appear on uncrewed flights ----------
{
  const saved=state.research;
  state.research={digital_computer:true, orbital_assembly:true, orbital_eva:true};
  const deepUncrewed=mk({m:{reqDv:9400, days:240, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}});
  const crewOnly=['eva','manual','manual_null','manual_takeover','parasol','patch','eva_latch','reserves','press_on','abort'];
  let leaked=[];
  for(const a of MISSION_ANOMALIES){
    let opts=[]; try{ if(!a.when(deepUncrewed)) continue; opts=a.options(deepUncrewed); }catch(e){ continue; }
    for(const o of opts){ if(crewOnly.includes(o.id) && !leaked.includes(`${a.id}/${o.id}`)) leaked.push(`${a.id}/${o.id}`); }
  }
  check('no crew-only option is offered on an uncrewed flight', leaked.length===0);
  if(leaked.length) console.log('   leaked:', leaked.join(', '));
  state.research=saved;
}

// ---------- BALANCE-NEUTRALITY: frequency is unchanged by pool size ----------
// The whole point of this slice is more variety at the SAME risk. rollMissionEvents() computes its
// chance from ANOMALY_CHANCE_BASE + context modifiers only — pool length must not enter into it.
{
  check('ANOMALY_CHANCE_BASE unchanged at 0.26', ANOMALY_CHANCE_BASE===0.26);
  check('REHEARSAL_ANOMALY_MULT unchanged at 0.4', REHEARSAL_ANOMALY_MULT===0.4);

  const saved=state.research;
  state.research={digital_computer:true, orbital_assembly:true, orbital_eva:true};
  const ctx=mk({m:{reqDv:9400, days:240, crew:3, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}, crewed:true});
  // chance for this ctx = 0.26 + 0.06 (crewed) + 0.06 (profile) = 0.38, before controller staffing.
  // A draw just under it must fire; a draw just over it must not — regardless of how many entries exist.
  const justUnder=(()=>{ let n=0; return ()=>(n++===0?0.379:0.5); })();
  const justOver =(()=>{ let n=0; return ()=>(n++===0?0.381:0.5); })();
  check('a draw just under the chance threshold still fires an anomaly', rollMissionEvents(ctx, justUnder)!==null);
  check('a draw just over the chance threshold fires nothing', rollMissionEvents(ctx, justOver)===null);
  state.research=saved;
}

// ---------- selection stays uniform over the eligible set ----------
{
  const saved=state.research;
  state.research={digital_computer:true, orbital_assembly:true, orbital_eva:true};
  const ctx=mk({m:{reqDv:9400, days:240, crew:3, profile:[{name:'TLI',dv:3120}], modules:['lv','transfer']}, crewed:true});
  const eligible=MISSION_ANOMALIES.filter(a=>{ try{ return a.when(ctx) && a.options(ctx).length>0; }catch(e){ return false; } });
  check('a deep crewed flight has many eligible anomalies (variety actually reached)', eligible.length>=7);

  // sweep the selection draw across [0,1) and confirm every eligible entry can come up
  const seen=new Set();
  for(let i=0;i<200;i++){
    const p=i/200;
    const rng=(()=>{ let n=0; return ()=>(n++===0?0.0:p); })(); // first draw fires, second selects
    const ev=rollMissionEvents(ctx, rng);
    if(ev) seen.add(ev.id);
  }
  check('every eligible anomaly is selectable across the draw range', seen.size===eligible.length);
  state.research=saved;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
