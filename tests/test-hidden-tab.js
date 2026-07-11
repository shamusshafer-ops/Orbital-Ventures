// ============================================================================
// E0.5 Slice A — hidden/backgrounded-tab CPU + GPU quieting.
//
// WHAT THIS FILE PROVES (headlessly, in the Node harness — no real Phaser/WebGL):
//   1. clampWallDt(dt) — the canvas-fallback anim loop's per-frame wall-clock
//      clamp, so a hidden-tab RAF pause doesn't fast-forward the animation.
//   2. handleVisibilityChange() — the timeAuto auto-run remember/resume decision
//      driven off document.hidden, against the REAL timeAuto/stopTimeAuto/
//      startTimeAuto state (setInterval stubbed so no real 1s timer fires).
//   3. FRONT_PAGE_CAP raised 24 → 100 — push-loop + boundary behavior.
//
// WHAT THIS FILE DELIBERATELY DOES NOT PROVE (no honest way to, in this harness):
//   - The actual Phaser scene.sleep()/wake() GPU-render-stopping behavior. The
//     harness has no real Phaser/WebGL, so the four popout scenes (Cape/Vehicle/
//     Map/Station) and the flight scene's sleep-on-overlay-hide can only be
//     verified in a real browser. That's the manual Firefox file:// checklist in
//     the implementation report, NOT a fake assertion here.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- 1. clampWallDt: cap one frame's wall-clock advance at ANIM_MAX_WALL_DT (50ms) ----------
check('ANIM_MAX_WALL_DT constant is 50ms', ANIM_MAX_WALL_DT===50);
// Normal per-frame deltas pass through UNCHANGED (nothing to clamp).
check('clampWallDt: 16ms (60fps frame) passes through', clampWallDt(16)===16);
check('clampWallDt: 33ms (30fps frame) passes through', clampWallDt(33)===33);
check('clampWallDt: 50ms (exactly the cap) passes through', clampWallDt(50)===50);
check('clampWallDt: 0ms passes through', clampWallDt(0)===0);
check('clampWallDt: 49.9ms passes through', clampWallDt(49.9)===49.9);
// A hidden-tab return delivers a huge delta → clamped to the cap so the anim resumes smoothly.
check('clampWallDt: 51ms clamps to 50', clampWallDt(51)===50);
check('clampWallDt: 5000ms (5s hidden) clamps to 50', clampWallDt(5000)===50);
check('clampWallDt: 120000ms (2min hidden) clamps to 50', clampWallDt(120000)===50);
// Result is never larger than the cap, for any input.
check('clampWallDt: output never exceeds cap', [16,50,51,999,1e6].every(d=>clampWallDt(d)<=ANIM_MAX_WALL_DT));

// ---------- 2. handleVisibilityChange: timeAuto auto-run remember/resume ----------
// Drive the REAL handler + REAL start/stopTimeAuto, but stub setInterval so no live 1s
// timer ever fires — we're testing the unit-tracking decision, not timer mechanics.
let _fakeTimer=0;
setInterval = ()=>(++_fakeTimer);
clearInterval = ()=>{};
state.over=false;
// helper to force a known starting state
function resetTime(){ timeAuto={unit:null,timer:null}; _timeAutoHiddenUnit=null; }

// (a) WAS auto-running → hidden pauses it, remembering the unit → visible resumes the SAME unit.
resetTime();
startTimeAuto('day');
check('(a) precondition: auto-running on "day"', timeAuto.unit==='day');
document.hidden=true; handleVisibilityChange();
check('(a) tab hidden → auto-run stopped', timeAuto.unit===null);
check('(a) tab hidden → remembered the unit it stopped', _timeAutoHiddenUnit==='day');
document.hidden=false; handleVisibilityChange();
check('(a) tab visible → auto-run resumed on the same unit', timeAuto.unit==='day');
check('(a) tab visible → remembered-unit cleared after resume', _timeAutoHiddenUnit===null);

// (a2) unit fidelity: a different unit is resumed as that same different unit.
resetTime();
startTimeAuto('month');
document.hidden=true; handleVisibilityChange();
document.hidden=false; handleVisibilityChange();
check('(a2) resumes "month" (not a hardcoded unit)', timeAuto.unit==='month');

// (b) already MANUALLY paused (not auto-running) → hidden is a no-op → visible does NOT auto-start.
resetTime();
check('(b) precondition: not auto-running', timeAuto.unit===null);
document.hidden=true; handleVisibilityChange();
check('(b) tab hidden while manually paused → stays paused', timeAuto.unit===null);
check('(b) tab hidden while manually paused → nothing remembered', _timeAutoHiddenUnit===null);
document.hidden=false; handleVisibilityChange();
check('(b) tab visible → does NOT wrongly auto-start', timeAuto.unit===null);

// (c) hidden while not auto-running at all → no crash, no state corruption; idempotent.
resetTime();
document.hidden=true; handleVisibilityChange(); handleVisibilityChange(); // hidden fires twice
check('(c) repeated hidden with no auto-run → no crash, stays null', timeAuto.unit===null && _timeAutoHiddenUnit===null);
document.hidden=false; handleVisibilityChange(); handleVisibilityChange(); // visible fires twice
check('(c) repeated visible → still no spurious auto-run', timeAuto.unit===null && _timeAutoHiddenUnit===null);

// (d) double-hidden must not clobber the remembered unit with the post-stop null.
resetTime();
startTimeAuto('year');
document.hidden=true; handleVisibilityChange(); // remembers 'year', stops
handleVisibilityChange();                       // fires again while already hidden+stopped
check('(d) second hidden does not overwrite remembered unit', _timeAutoHiddenUnit==='year');
document.hidden=false; handleVisibilityChange();
check('(d) still resumes the originally-remembered unit', timeAuto.unit==='year');

// (e) game-over guard: if the game ended while hidden, do not resume a dead run.
resetTime();
startTimeAuto('day');
document.hidden=true; handleVisibilityChange();
state.over=true;
document.hidden=false; handleVisibilityChange();
check('(e) game over on return → does not resume auto-run', timeAuto.unit===null);
check('(e) game over on return → remembered-unit still cleared', _timeAutoHiddenUnit===null);
state.over=false;
resetTime();

// ---------- 3. FRONT_PAGE_CAP raised 24 → 100 ----------
check('FRONT_PAGE_CAP is now 100 (was 24)', FRONT_PAGE_CAP===100);
state.frontPages=[]; // start from empty
for(let i=0;i<250;i++) pushFrontPage('milestone','*','headline '+i,'dek '+i);
check('pushFrontPage: retention caps at FRONT_PAGE_CAP', frontPages().length===FRONT_PAGE_CAP);
check('pushFrontPage: capped length is exactly 100', frontPages().length===100);
// newest-first: the most recent unshift is at index 0, the oldest surviving at the tail.
check('pushFrontPage: newest entry kept at front', frontPages()[0].headline==='headline 249');
check('pushFrontPage: oldest 150 evicted (index 0 is #249)', frontPages()[0].headline==='headline 249');
check('pushFrontPage: tail is the 100th-newest survivor', frontPages()[99].headline==='headline 150');
// boundary: exactly at the cap, no eviction yet.
state.frontPages=[];
for(let i=0;i<100;i++) pushFrontPage('scoop','o','h'+i,'d'+i);
check('pushFrontPage: exactly 100 pushed → all 100 retained', frontPages().length===100);
pushFrontPage('scoop','o','h100','d100');
check('pushFrontPage: 101st push evicts oldest, stays at 100', frontPages().length===100 && frontPages()[0].headline==='h100' && frontPages()[99].headline==='h1');
state.frontPages=[];

console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
