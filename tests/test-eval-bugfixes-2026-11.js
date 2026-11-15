// 2026-11-14 evaluation bug-fix pass. Each block was verified to fail against the pre-fix source.
//  1. Station module card printed float noise ("+1.7999999999999998 kW").
//  2. Flight playback defaulted to 0.1x slow-mo (covered in test-anim-speed.js).
//  3. Menu theme chips silently did nothing (hidden that day; made real by the same-day layout/theme pass).
//  4. Narrow-rail contract cards crushed their text to one word per line (.item could not wrap).
//  5. The outliner was titled "In flight" while listing research/builds/warnings, and showed one
//     "dept unstaffed" row per department (three identical "now" rows at game start).
//  6. The flight card showed dashes while a decision held the launch, and the debrief distance for
//     launch-day suborbital flights disagreed with the overlay's DRANGE telemetry (6 km vs 86 km).
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- 1. station module card power formatting ----------
{
  devPresetStation();
  const cur={def:facilityById('leo_station'), fs:facilityState('leo_station')};
  check('preset station exists for the card context', !!(cur.def && cur.fs));
  const html=STATION_MODULES.map(md=>stationModuleCard(md,cur,true)).join('');
  check('no floating-point noise in any station module card', !/\d\.\d{4,}/.test(html));
  const hab=STATION_MODULES.find(md=>md.id==='can_std');
  check('habitat module exists (precondition)', !!hab);
  const one=hab?stationModuleCard(hab,cur,true):'';
  check('habitat card shows +1.8 kW in the docking-context line', /\+1\.8 kW → station/.test(one));
}

// ---------- 3. theme chips (hidden 2026-11-14 while pinned; live again after the layout/theme pass) ----------
{
  let html='';
  const origShow=showModal; showModal=(h)=>{ html=h; };
  try{ showSettingsMenu(); } catch(e){} finally { showModal=origShow; activeModal=null; }
  check('settings menu rendered (precondition)', html.length>0);
  check('theme selection is live now that the blue pins are lifted', THEMES_SELECTABLE===true);
  check('Theme chip row is shown, one chip per theme', /<div style="margin:10px 0 2px" >\s*<div class="cc-panel-h"[^>]*>Theme</.test(html)
    && Object.keys(THEMES).every(k=>html.includes(`pickTheme('${k}')`)));
}

// ---------- 4. .item cards can wrap in narrow containers ----------
{
  const fs=require('fs'), path=require('path');
  const shellPath=[path.join(process.cwd(),'src','shell.html'), path.join(process.cwd(),'..','src','shell.html')].find(p=>fs.existsSync(p));
  const css=shellPath?fs.readFileSync(shellPath,'utf8'):'';
  check('shell.html located', !!css);
  check('.item allows wrapping', /\.item\{flex-wrap:wrap\}/.test(css));
  check('.item .body keeps a readable minimum basis instead of flex:1 crushing', /\.item \.body\{flex:1 1 \d+px;min-width:0\}/.test(css));
}

// ---------- 5. outliner heading + merged staffing row ----------
{
  newGame('engineer');
  const gaps=workforceGaps().filter(g=>g.kind==='understaffed');
  const rows=outlinerItems().filter(it=>it.icon==='👥');
  check('fresh campaign has several unstaffed departments (precondition)', gaps.length>=2);
  check('unstaffed departments collapse to ONE outliner row', rows.length===1);
  check('the merged row names the count and every department', rows.length===1 && rows[0].label.startsWith(gaps.length+' departments unstaffed')
    && gaps.every(g=>rows[0].label.includes((departmentDef(g.id)||{}).name)));
  const el={innerHTML:'', id:'outlinerCard'};
  const origGEBI=document.getElementById;
  document.getElementById=id=>id==='outlinerCard'?el:origGEBI.call(document,id);
  try{ renderOutliner(); } finally { document.getElementById=origGEBI; }
  check('outliner panel heading says "Up next", not "In flight"', el.innerHTML.includes('◈ Up next') && !el.innerHTML.includes('◈ In flight'));
}

// ---------- 6a. debrief distance agrees with the trajectory the overlay samples ----------
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='first_flight'), v=computeVehicle();
  const plan=cape3dTrajectoryPlan(flightPhysicsSpec(m,v),{isOrbital:false,reqDv:m.reqDv});
  const landX=Math.round(plan.points.reduce((mx,p)=>Math.max(mx,p.xKm||0),0));
  const rep=flightReport(m,v,null,null);
  check('trajectory lands well downrange (precondition, ~86 km for the opening rocket)', landX>40);
  check('debrief distance == trajectory landing downrange', rep.distanceKm===landX);
  const orb=MISSIONS.find(x=>x.id==='first_sat');
  check('orbital launch-day missions keep their orbit-scale distance', flightReport(orb,v,null,null).distanceKm===40000);
}

// ---------- 6b. the early decision overlay carries a planned flight card ----------
{
  newGame('engineer');
  const m=MISSIONS.find(x=>x.id==='first_flight');
  let captured=null;
  const origPlay=playMission;
  playMission=(spec)=>{ captured=spec; };
  try{ openFlightForDecision({m,crewed:false},{holdAt:'pad-start',buildPanel:()=>({title:'t',lines:[],buttons:[]})}); }
  finally { playMission=origPlay; animState=null; }
  check('decision overlay spec was built', !!captured);
  const r=captured&&captured.report||{};
  check('planned card has liftoff mass', r.liftoff>0);
  check('planned card has total Δv', r.totalDv>0);
  check('planned card has TWR', r.twr>0);
  check('planned card has payload', r.payload!=null);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
