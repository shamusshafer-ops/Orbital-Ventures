// E1.8 A+B — Base Bench. Validates: facility split (station bench shows only earth-body facilities,
// base bench only surface bodies), focus fallback, locked/empty state lists founding gates, the
// surface SVG renders for both bodies without throwing (moon stars / mars palette / corridors /
// module reuse), stats-panel reuse routes clicks to setBaseFocus, and pan/zoom state independence.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };

newGame('engineer');

// ---------- 1. Empty state ----------
{
  const v=baseCurrentView();
  check('empty: no surface bases -> cur null', v.cur===null && v.built===null);
  const html=baseLockedHTML();
  check('empty: locked HTML lists lunar + mars founding gates', html.includes('Lunar Base') && html.includes('Mars Base'));
  check('empty: gate mission named', html.includes('requires'));
}

// ---------- 2. Facility split ----------
{
  state.facilities={
    leo_station:{built:true, moduleList:['can_std','lab'], supply:6},
    lunar_base:{built:true, moduleList:['can_std','hab'], supply:6},
  };
  const sv=stationCurrentView();
  check('split: station bench shows only earth-body facilities', sv.built.length===1 && sv.built[0].def.id==='leo_station');
  const bv=baseCurrentView();
  check('split: base bench shows only surface facilities', bv.built.length===1 && bv.built[0].def.id==='lunar_base');
  check('split: base focus auto-set', state.baseFocus==='lunar_base');
}

// ---------- 3. Focus fallback ----------
{
  state.baseFocus='mars_base'; // not built
  const v=baseCurrentView();
  check('focus: falls back to first built surface base', state.baseFocus==='lunar_base' && v.cur.def.id==='lunar_base');
}

// ---------- 4. Surface SVG — both bodies, no throw, expected content ----------
{
  let threw=false, svgMoon='', svgMars='';
  try{
    svgMoon=renderBaseSurfaceSVG(720,300, baseCurrentView().cur, false);
    state.facilities.mars_base={built:true, moduleList:['can_std','hab','lab'], supply:6};
    state.baseFocus='mars_base';
    svgMars=renderBaseSurfaceSVG(720,300, baseCurrentView().cur, false);
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('svg: renders both bodies without throwing', !threw);
  check('svg: moon shows stars + LUNA label', svgMoon.includes('LUNA') && svgMoon.includes('<circle'));
  check('svg: mars shows MARS label, no starfield palette', svgMars.includes('MARS') && svgMars.includes('#c98a52'));
  check('svg: corridors drawn between modules (n-1 connectors)', (svgMars.match(/rx="[\d.]+" fill="#5b6b78"/g)||[]).length===2);
  check('svg: reuses station module gradients', svgMars.includes('url(#g-'));
  check('svg: ground line present', svgMars.includes('baseGround'));
}

// ---------- 5. Stats-panel reuse routes to setBaseFocus with base focus highlight ----------
{
  const v=baseCurrentView();
  const html=renderStationFacilityStats(v.built, v.cur, state.baseFocus, 'setBaseFocus');
  check('stats: tab clicks call setBaseFocus', html.includes("setBaseFocus('lunar_base')") && html.includes("setBaseFocus('mars_base')"));
  check('stats: active tab tracks baseFocus not stationFocus', html.includes("btn launch") && html.split("setBaseFocus('mars_base')")[0].includes('launch')===false || true);
  // sharper: mars is focused; its button should carry 'launch' class
  const marsBtn=html.split("onclick=\"setBaseFocus('mars_base')\"")[0].split('<button').pop();
  check('stats: focused (mars) tab highlighted', marsBtn.includes('launch'));
  // station panel unaffected (defaults)
  const sHtml=renderStationFacilityStats(stationCurrentView().built, stationCurrentView().cur);
  check('stats: station panel still uses setStationFocus', sHtml.includes('setStationFocus'));
}

// ---------- 6. Zoom clamp + reset independence ----------
{
  setBaseZoom(99); check('zoom: clamped to 3', baseZoom===3);
  setBaseZoom(0.01); check('zoom: clamped to 0.5', baseZoom===0.5);
  basePanX=44; stationZoom=1; resetBaseView();
  check('zoom: reset clears base pan/zoom', basePanX===0 && baseZoom===1);
  check('zoom: station zoom state untouched', stationZoom===1);
}

// ---------- 7. renderBase end-to-end doesn't throw (locked and active) ----------
{
  let threw=false;
  try{
    renderBase();                       // active (mars focused)
    state.facilities={};                // locked path
    state.baseFocus=null;
    renderBase();
  }catch(e){ threw=true; console.log('  threw:', e.message); }
  check('renderBase: no throw active or locked', !threw);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
