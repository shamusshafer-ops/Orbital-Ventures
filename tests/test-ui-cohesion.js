// UI cohesion pass (2026-11-18). Owner choices: the screen's own panel leads the right rail with the shared
// accordion as a compact bar beneath it; a "Needs you" strip at the top of Up Next on every screen; the
// getting-started checklist docked in the left rail; one header pattern across screens, content moved where it
// fits better. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const fs=require('fs'), path=require('path');
const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html'))?path.join(__dirname,'..'):process.cwd();
const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

// ---------- right rail: screen first ----------
{
  const r=shell.slice(shell.indexOf('id="railRight"'));
  const at=id=>r.indexOf(`id="${id}"`);
  check('every screen panel comes before the shared bar', ['railCommand','railBench','railMap','railRnd','railStation','railBase'].every(id=>at(id)>0&&at(id)<at('railPersistent')));
  check('…and Up Next follows the shared bar', at('railPersistent')<at('outlinerCard'));
  check('the shared bar has short labels (full names stay in the tooltips)', /<span class="cc-nav-label">Mission<\/span>/.test(shell) && /<span class="cc-nav-label">Plan<\/span>/.test(shell) && /<span class="cc-nav-label">Goals<\/span>/.test(shell) && /double-click to open Mission Control/.test(shell));
  check('the bar is one row, sections open full width beneath it', /\.rail-accordion\{flex-direction:row;flex-wrap:wrap/.test(shell) && /\.rail-acc-body\{order:1;flex-basis:100%\}/.test(shell));
  check('on the Command Center, Up Next leads the rail', /\.command-hero #railRight > #outlinerCard\{order:-1\}/.test(shell));
}

// ---------- Needs you ----------
{
  newGame('engineer'); state.money=400; state.year=1962; state.rep=600; state.uiLayer='advanced';
  check('a fresh game with research to start: Needs you says so', needsYouItems().some(i=>/No research running/.test(i.label)));
  state.completed.crew_orbit=true; foundFacility('leo_station'); facilityState('leo_station').supply=2;
  openInvestigation({m:missionById('first_sat'),flightExpense:2},{kind:'loss',subsystem:'propulsion'});
  const items=needsYouItems(), labels=items.map(i=>i.label).join(' | ');
  check('an open investigation is listed', /Investigation open — propulsion/.test(labels));
  check('a station about to run short is listed', /LEO Station runs out of provisions/.test(labels));
  check('at most four items', items.length<=4);
  renderOutliner();
  const html=(document.getElementById('outlinerCard')||{}).innerHTML||'';
  check('Up Next renders the Needs you strip above its countdowns', /class="needs-you"/.test(html) && /NEEDS YOU/.test(html) && html.indexOf('needs-you')>html.indexOf('◈ Up next') && (html.indexOf('outlinerItems()[')<0 || html.indexOf('needs-you')<html.indexOf('outlinerItems()[')));
  let went=null; const real=goOutpost; goOutpost=id=>{ went=id; };
  try{ items.find(i=>/runs out/.test(i.label)).go(); } finally{ goOutpost=real; }
  check('each item goes where it is handled', went==='leo_station');
  const ctrl=CONTROLLERS[0]; hirePersonnel(ctrl.id); staffRecord(ctrl.id).fatigue=80; state.activeMission='first_flight'; delete state.completed.first_flight;
  check('a worn-out team on a major flight is listed', needsYouItems().some(i=>/worn out/.test(i.label)));
}

// ---------- the checklist docks in the left rail ----------
{
  check('docked style: in the flow of the left rail, not floating', /#coachPanel\.docked\{position:relative/.test(shell));
  check('it floats only on the Command Center, beside the deck rather than over it', /#coachPanel:not\(\.docked\)\{left:calc\(var\(--cc-rail-width\) \+ 44px\)\}/.test(shell));
}

// ---------- one header pattern ----------
{
  check('centre panels share the scene-title pattern with the screen colour dot', ['Vehicle assembly','Technology Tree','Solar System — click'].every(t=>new RegExp(`<h2 class="scene-title"[^>]*><span class="dom-dot"[^>]*></span>${t}`).test(shell)));
  newGame('engineer'); renderAssemblyShells();
  check('…the Outposts boards too', /class="assembly-title scene-title"><span class="dom-dot"/.test((document.getElementById('stationView')||{}).innerHTML||''));
  check('left rails use the shared section header', /<div class="cc-panel-h"[^>]*><span class="dom-dot"[^>]*><\/span>Your vehicle/.test(shell) && /cc-panel-h[^>]*><span class="dom-dot"[^>]*><\/span>Bodies/.test(mapRosterHTML()));
}

// ---------- content moved where it belongs ----------
{
  newGame('engineer'); state.activeMission='first_flight'; state.tab='bench'; render();
  const ro=(document.getElementById('readoutCard')||{}).innerHTML||'';
  check('test campaign and rehearsal are set in one place (the go/no-go block), not repeated in the readout', !/setTestLevel\(/.test(ro) && /go\/no-go block/.test(ro));
  check('…and the go/no-go block still has them', /setTestLevel\(1\)/.test((()=>{ renderBenchLaunch(); return document.getElementById('benchLaunch').innerHTML||''; })()));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
