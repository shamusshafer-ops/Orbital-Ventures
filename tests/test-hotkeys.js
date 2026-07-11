// ============================================================================
// E0.4 Slice A — keyboard + accessibility baseline.
//
// The harness has no real keyboard/DOM event dispatch, so these are UNIT tests
// on the pure decision functions the key handlers were refactored to call:
//   warpStep(unit,dir)  — the day→week→month time-warp ladder
//   spaceAction(bool)   — Space's pause-vs-launch split
//   isTyping(e)         — the shared "never hijack a text field" guard
//   warpKeysActive(scene) — R&D-scene gating for the +/- warp keys
// (Same "pull the logic into a pure function for headless testing" pattern used
// for pickRingSlot / ringCadenceDue in the E0.2 work.)
//
// NOT proven here (left to the manual Firefox file:// checklist in the report):
// real keydown routing/preventDefault, the rendered '?' help modal, and the
// live pause/launch/warp behavior in the actual browser.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- 1. warpStep: the day→week→month ladder ----------
// Stepping UP from a stopped clock starts at 'day'; then day→week→month, clamped at the top.
check('warpStep: stopped (null) + up → start at day', warpStep(null, 1)==='day');
check('warpStep: undefined unit + up → start at day', warpStep(undefined, 1)==='day');
check('warpStep: unknown unit + up → start at day', warpStep('bogus', 1)==='day');
check('warpStep: day + up → week', warpStep('day', 1)==='week');
check('warpStep: week + up → month', warpStep('week', 1)==='month');
check('warpStep: month + up → stays month (top clamp)', warpStep('month', 1)==='month');
// Stepping DOWN: month→week→day, then day→stop (null). A stopped clock stepped down stays stopped.
check('warpStep: month + down → week', warpStep('month', -1)==='week');
check('warpStep: week + down → day', warpStep('week', -1)==='day');
check('warpStep: day + down → stop (null)', warpStep('day', -1)===null);
check('warpStep: stopped (null) + down → stop (null)', warpStep(null, -1)===null);
check('warpStep: unknown unit + down → stop (null)', warpStep('bogus', -1)===null);
// Full round trips through the ladder.
check('warpStep: up round trip day→week→month', warpStep(warpStep(warpStep(null,1),1),1)==='month');
check('warpStep: down round trip month→week→day→stop', warpStep(warpStep(warpStep('month',-1),-1),-1)===null);

// ---------- 2. spaceAction: Space's pause-vs-launch split ----------
check('spaceAction: auto-run active → pause (do not launch)', spaceAction(true)==='pause');
check('spaceAction: auto-run NOT active → launch (unchanged muscle memory)', spaceAction(false)==='launch');
// Guard against a truthy/falsy foot-gun — the handler passes !!timeAuto.unit, always a real bool.
check('spaceAction: only two possible actions', spaceAction(true)!==spaceAction(false));

// ---------- 3. isTyping: the shared typing guard ----------
const ev=(tagName)=>({ target: (tagName===null?null:{ tagName }) });
check('isTyping: INPUT → true', isTyping(ev('INPUT'))===true);
check('isTyping: TEXTAREA → true', isTyping(ev('TEXTAREA'))===true);
check('isTyping: SELECT → true', isTyping(ev('SELECT'))===true);
check('isTyping: DIV → false', isTyping(ev('DIV'))===false);
check('isTyping: BUTTON → false', isTyping(ev('BUTTON'))===false);
check('isTyping: CANVAS → false', isTyping(ev('CANVAS'))===false);
check('isTyping: null target → false (no crash)', isTyping(ev(null))===false);
check('isTyping: missing target → false (no crash)', isTyping({})===false);
check('isTyping: undefined event → false (no crash)', isTyping(undefined)===false);

// ---------- 4. warpKeysActive: R&D-scene gating for the +/- warp keys ----------
// On R&D the tech tree owns +/=/-/arrows, so the warp keys must stand down there — and be live everywhere else.
check('warpKeysActive: R&D scene → warp keys OFF', warpKeysActive('rnd')===false);
check('warpKeysActive: bench scene → warp keys ON', warpKeysActive('bench')===true);
check('warpKeysActive: station scene → warp keys ON', warpKeysActive('station')===true);
check('warpKeysActive: map scene → warp keys ON', warpKeysActive('map')===true);
check('warpKeysActive: command scene → warp keys ON', warpKeysActive('command')===true);
// Every real scene tab except R&D should keep the warp keys live.
check('warpKeysActive: ON for every SCENE_TAB except rnd', SCENE_TABS.every(t => warpKeysActive(t) === (t!=='rnd')));

console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
