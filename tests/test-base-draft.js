// E1.8 D — Base Bench blueprint drawing board. Validates: per-body draft state independence
// (Luna/Mars don't share a list), draftAdd/draftRemove/draftClear dispatch to base equivalents only
// when state.tab==='base' (station draft untouched otherwise), unlimited surface module count (the
// facilityPortCap fix), cost preview, stats-panel messaging, and renderBaseDraft end-to-end.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };

// ---------- 1. facilityPortCap fix: surface facilities have no cap ----------
{
  newGame('engineer');
  const earthDef=facilityById('leo_station'), moonDef=facilityById('lunar_base');
  const fs={moduleList:['can_std','can_std','can_std','can_std']}; // at the old cap
  check('portcap: orbital facility still capped at 4 (no Node)', facilityPortCap(fs, earthDef)===4);
  check('portcap: surface facility uncapped', facilityPortCap(fs, moonDef)===Infinity);
  check('portcap: undefined def (station draft) defaults to orbital cap', facilityPortCap(fs, undefined)===4);
}

// ---------- 2. Per-body draft independence ----------
{
  newGame('engineer');
  state.tab='base';
  setBaseDraftBody('moon');
  draftAddBase('lab_mod');
  check('draft: moon list grew', baseDraftFs('moon').moduleList.length===2);
  setBaseDraftBody('mars');
  check('draft: mars list independent (still just the core)', baseDraftFs('mars').moduleList.length===1);
  draftAddBase('isru_plant');
  check('draft: mars list grew independently', baseDraftFs('mars').moduleList.length===2);
  check('draft: moon list unaffected by mars edits', baseDraftFs('moon').moduleList.length===2);
}

// ---------- 3. draftAdd/draftRemove/draftClear dispatch on state.tab ----------
{
  newGame('engineer');
  state.tab='station';
  state.stationDraft=['can_std'];
  draftAdd('lab_mod'); // should hit the STATION draft, not base
  check('dispatch: draftAdd on station tab affects stationDraft', state.stationDraft.length===2);
  check('dispatch: draftAdd on station tab leaves baseDraftByBody untouched', !(state.baseDraftByBody&&state.baseDraftByBody.moon&&state.baseDraftByBody.moon.length>1));

  state.tab='base'; setBaseDraftBody('moon');
  const before=state.stationDraft.length;
  draftAdd('hab_dome'); // should hit BASE draft now
  check('dispatch: draftAdd on base tab affects baseDraftByBody.moon', baseDraftFs('moon').moduleList.includes('hab_dome'));
  check('dispatch: draftAdd on base tab leaves stationDraft untouched', state.stationDraft.length===before);

  draftRemove();
  check('dispatch: draftRemove on base tab pops from base draft', !baseDraftFs('moon').moduleList.includes('hab_dome'));
  draftClear();
  check('dispatch: draftClear on base tab resets to just the core', baseDraftFs('moon').moduleList.length===1);
}

// ---------- 4. Station draft unaffected by any of this (regression guard) ----------
{
  newGame('engineer');
  state.tab='station';
  state.stationDraft=['can_std'];
  draftAdd('lab_mod'); draftAdd('power_truss'); draftAdd('depot_mod');
  check('regression: station draft still grows normally', state.stationDraft.length===4);
  draftAdd('can_std'); // 5th — should hit the still-enforced 4-port cap (no node_hub added)
  check('regression: station draft still capped at 4 without a Node', state.stationDraft.length===4);
  draftRemove();
  check('regression: station draftRemove still works', state.stationDraft.length===3);
}

// ---------- 5. Cost preview + stats messaging ----------
{
  newGame('engineer');
  state.tab='base'; setBaseDraftBody('mars'); draftClear(); draftAddBase('lab_mod');
  const cost=baseDraftCostAt('mars');
  check('cost: baseDraftCostAt returns a positive number for a 2-module design', typeof cost==='number' && cost>0);
  const html=baseDraftStatsHTML();
  check('stats: names Mars Base', html.includes('Mars Base'));
  check('stats: shows unlimited modules, not a port count', html.includes('unlimited on the surface'));
  check('stats: shows build-out cost', html.includes('Build-out cost'));
}

// ---------- 6. renderBaseDraft end-to-end, both bodies, no throw ----------
{
  newGame('engineer');
  state.tab='base';
  let threw=false;
  try{
    setBaseDraftBody('moon'); renderBaseDraft();
    setBaseDraftBody('mars'); renderBaseDraft();
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('renderBaseDraft: no throw for either body', !threw);
}

// ---------- 7. Founded base graduates out of draft (isDraft flips false) ----------
{
  newGame('engineer');
  const v1=baseCurrentView();
  check('lifecycle: starts in draft', v1.isDraft===true);
  state.completed.luna_landing=true; state.rep=500; state.money=1000;
  foundFacility('lunar_base');
  const v2=baseCurrentView();
  check('lifecycle: founding a base exits draft mode', !v2.isDraft && v2.cur.def.id==='lunar_base');
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
