let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- Boot across all three named difficulties + custom ----------
['napkin','engineer','custom'].forEach(diff=>{
  try{
    newGame(diff);
    render();
    check(`boot ${diff}: state initialized`, !!state && state.money>=0);
    check(`boot ${diff}: materials present`, !!(state.materials && state.materials.alloy && state.materials.electronics));
  }catch(e){ check(`boot ${diff}: no throw`, false); console.log(e.stack); }
});

// ---------- Render every scene tab + the manufacturing modal ----------
newGame('engineer');
render();
const scenes = ['command','bench','rnd','map','station'];
scenes.forEach(t=>{
  try{ setTab(t); render(); check(`render scene ${t}`, true); }
  catch(e){ check(`render scene ${t}`, false); console.log(e.stack); }
});
try{ showInfrastructureModal(); check('render manufacturing modal (productionPanelHTML)', true); }
catch(e){ check('render manufacturing modal (productionPanelHTML)', false); console.log(e.stack); }

// ---------- Long smoke test: 600 monthly ticks (~50 years), forcing a dip mid-run ----------
{
  newGame('engineer');
  let threw = false;
  try{
    for(let i=0;i<600;i++){
      if(i===50){ materialState('alloy').spot = 0.75; } // force a dip partway through
      if(i===60 && canBuyMaterialDip('alloy').ok){ buyMaterialDip('alloy'); }
      advanceDays(30);
      if(i%37===0){ render(); } // periodic re-render, like a player checking in
      if(state.over) break;
    }
  }catch(e){ threw = true; console.log('600-tick smoke threw:', e.stack); }
  check('600-tick long smoke test never throws', !threw);
}

// ---------- Full playthrough-style bot: a few dozen flights, checking materials never desyncs ----------
{
  newGame('engineer');
  let threw = false;
  try{
    for(let i=0;i<400 && !state.over;i++){
      advanceDays(30);
      // occasionally poke the dip mechanic to make sure it survives interleaved with normal play
      if(i%20===0){
        MATERIAL_DEFS.forEach(d=>{ if(isMaterialDip(d.key) && canBuyMaterialDip(d.key).ok) buyMaterialDip(d.key); });
      }
    }
    // sanity: materials state shape never corrupted
    MATERIAL_DEFS.forEach(d=>{
      const s = materialState(d.key);
      check(`materials shape intact after long run: ${d.key}.stock is a number`, typeof s.stock==='number' && s.stock>=0 && s.stock<=MATERIAL_STOCK_CAP);
      check(`materials shape intact after long run: ${d.key}.spot in bounds`, s.spot>=MATERIAL_PRICE_MIN && s.spot<=MATERIAL_PRICE_MAX);
    });
  }catch(e){ threw = true; console.log('playthrough-bot threw:', e.stack); }
  check('playthrough bot never throws', !threw);
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
