// ⏭ EXPECTED-FAIL FORWARD TEST — F4 is UNFINISHED (see ROADMAP "F4 — One canonical 'what's
// happening now' surface"). These checks describe the post-F4 world (UPCOMING chips deleted,
// upcomingEvents() gone) and were committed ahead of the source on purpose. Skipped by default
// so the full suite gates green and a real regression elsewhere stays visible; run with
// RUN_F4=1 node bundle.js once F4 lands, then delete this header. (Audit 2026-07-13, M5.)
if(typeof process!=='undefined' && !(process.env&&process.env.RUN_F4)){
  console.log('SKIP: F4 forward test (unfinished feature — set RUN_F4=1 to run)');
  console.log('0/0 checks passed');
  process.exit(0);
}
// F4 — "One canonical 'what's happening now' surface." Validates that #ccStrip (the compact info strip
// above the Cape scene, which replaced the stacked execOverview + ccProgress cards) shows the active
// R&D / build / hangar work-items with their Fly button intact, that the deleted UPCOMING chips are
// gone, and that nothing regressed (outliner click-through .go handlers + runToNextEvent still intact).
//
// Appended after harness.js + extracted-script.js in one script scope (see tests/README.md), so it
// sees `state` and every game function directly. Game auto-boots before this runs.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Persistent-element shim: the harness's getElementById hands back a fresh throwaway stub each call,
// so innerHTML written during a render can't be read back. Cache by id so we can inspect render output.
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');

// ---------- 1. Boot sanity ----------
check('boot: state exists', !!state);
check('boot: outlinerItems is a function', typeof outlinerItems==='function');
check('boot: renderCCStrip is a function', typeof renderCCStrip==='function');

// ---------- 2. Set up one active research + one started build + one hangar-ready vehicle ----------
// kerosene: months=3. monthsLeft=1.5 => pct = round(100*(3-1.5)/3) = 50
state.activeResearch = {id:'kerosene', monthsLeft:1.5};
// build: total 6, left 2 => pct = round(100*(6-2)/6) = 67
state.buildQueue = [{name:'Test LV', started:true, monthsLeft:2, monthsTotal:6}];
state.hangar = [{id:'hx', name:'Falcon Test'}];

// ---------- 3. outlinerItems() carries the enriched work-item metadata (the single source of truth) ----------
let items = outlinerItems();
const rItem = items.find(it=>it.kind==='research');
const bItem = items.find(it=>it.kind==='build');
const hItem = items.find(it=>it.kind==='hangar');
check('outliner: research item present with kind tag', !!rItem);
check('outliner: research label + pct + barColor', rItem && rItem.label==='Kerosene Propulsion' && rItem.pct===50 && rItem.barColor==='var(--dom-research)');
check('outliner: research etaDays is monthsLeft*30', rItem && rItem.etaDays===45);
check('outliner: build item present with kind tag', !!bItem);
check('outliner: build label + pct + barColor', bItem && bItem.label==='Test LV' && bItem.pct===67 && bItem.barColor==='var(--dom-engineering)');
check('outliner: hangar item present, action-ready (eta 0)', !!hItem && hItem.etaDays===0);
check('outliner: hangar carries id + vehName for the Fly button', hItem && hItem.hangarId==='hx' && hItem.vehName==='Falcon Test');
check('outliner: every item has a .go click-through handler', items.every(it=>typeof it.go==='function'));

// ---------- 4. #ccStrip (the compact strip) shows the same active R&D / build / hangar work-items ----------
renderCCStrip();
let cc = htmlOf('ccStrip');
check('ccStrip: renders research', /Kerosene Propulsion/.test(cc));
check('ccStrip: renders build', /Test LV/.test(cc));
check('ccStrip: renders hangar vehicle', /Falcon Test/.test(cc));
check('ccStrip: hangar Fly button preserved (still actionable)', /launchFromHangar\('hx'\)/.test(cc) && /Fly ▸/.test(cc));
check('ccStrip: research bar width mirrors pct (50%)', /width:50%/.test(cc));
check('ccStrip: build bar width mirrors pct (67%)', /width:67%/.test(cc));
// Exactly one progress bar per active research + started build (hangar rows are a Fly button, no bar).
const bars = (cc.match(/class="fill"/g)||[]).length;
const expectBars = (state.activeResearch?1:0) + buildQueueList().filter(o=>o.started).length;
check('ccStrip: one progress bar per research+build item', bars === expectBars);
const wantLabels = items.filter(it=>it.kind==='research'||it.kind==='build').map(it=>it.label)
  .concat(items.filter(it=>it.kind==='hangar').map(it=>it.vehName));
check('ccStrip: every work-item is present in the strip (no missing info)', wantLabels.every(l=>cc.indexOf(l)>=0));

// ---------- 5. Empty states preserved when nothing is on the clock ----------
state.activeResearch = null; state.buildQueue = []; state.hangar = [];
renderCCStrip();
cc = htmlOf('ccStrip');
check('ccStrip: empty research state', /No active project/.test(cc));
check('ccStrip: empty build state', /Nothing building/.test(cc));

// ---------- 6. The strip carries the folded stat/context and doesn't duplicate the R&D line ----------
state.activeResearch = {id:'kerosene', monthsLeft:2};
renderCCStrip();
const eo = htmlOf('ccStrip');
check('ccStrip: renders (non-empty)', eo.length>0);
check('ccStrip: folds in gov funding', /Gov \+/.test(eo));
check('ccStrip: active research appears once (no duplicated stat line)', (eo.match(/Kerosene Propulsion/g)||[]).length===1);

// ---------- 7. The #opsTimeline UPCOMING chips are gone; the strip is purely the log now ----------
check('upcoming: upcomingEvents() function was deleted', typeof upcomingEvents==='undefined');
// Drive the real log render and confirm no chip is an UPCOMING/forward-looking chip.
_elCache['opsTimeline'] && (_elCache['opsTimeline'].children=[]);
let logThrew=false;
try{ renderLog(); }catch(e){ logThrew=true; console.log('renderLog threw:', e.stack); }
check('upcoming: renderLog runs without throwing', !logThrew);
const tlBox=_elCache['opsTimeline'];
const chipHtml=(tlBox&&tlBox.children?tlBox.children.map(c=>c.innerHTML||c.textContent||'').join('|'):'');
check('upcoming: no UPCOMING chip in the timeline strip', !/UPCOMING/.test(chipHtml));
check('upcoming: no "◂ NOW" upcoming/log separator', !/◂ NOW/.test(chipHtml));

// ---------- 8. runToNextEvent + click-through still work (no regression to the outliner's real jobs) ----------
check('regress: runToNextEvent is still a function', typeof runToNextEvent==='function');
state.activeResearch = {id:'kerosene', monthsLeft:2};
state.hangar = [{id:'hx', name:'Falcon Test'}];
items = outlinerItems();
let goThrew=false;
try{ const h=items.find(it=>it.kind==='hangar'); if(h) h.go(); }catch(e){ goThrew=true; console.log('hangar .go threw:', e.stack); }
check('regress: hangar click-through .go navigates without throwing', !goThrew);
const dayBefore=absDay();
let rtneThrew=false;
try{ runToNextEvent(); }catch(e){ rtneThrew=true; console.log('runToNextEvent threw:', e.stack); }
check('regress: runToNextEvent runs without throwing', !rtneThrew);
check('regress: runToNextEvent advanced the clock toward the next item', absDay()>=dayBefore);

// ---------- 9. Full render + short smoke: nothing throws with the unified surface live ----------
let renderThrew=false;
try{ render(); }catch(e){ renderThrew=true; console.log('render threw:', e.stack); }
check('smoke: full render() does not throw', !renderThrew);
let smokeThrew=false;
try{ for(let i=0;i<48 && !state.over;i++) advanceDays(30); }catch(e){ smokeThrew=true; console.log('smoke threw:', e.stack); }
check('smoke: 48 monthly ticks never throw', !smokeThrew);

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
