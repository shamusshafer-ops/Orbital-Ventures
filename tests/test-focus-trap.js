// ============================================================================
// E0.4 Slice B — focus trap for the shared modal system.
//
// The harness DOM stubs have no real focus model: document.activeElement is
// undefined, element.focus() is a no-op, and querySelectorAll() returns []
// on stub elements — so the actual focus-trapping (capturing the trigger,
// moving focus into the modal on open, cycling on Tab, restoring on close)
// CANNOT be exercised headlessly. These are UNIT tests on the two pure
// decision functions the trap was factored into:
//   nextTrapFocus(list, currentIndex, shiftKey) — the wrap-around Tab step
//   resolveReturnFocus(savedEl, savedId, getById, body) — where hideModal
//                                                          hands focus back
// (Same "extract the logic into a pure function for headless testing" pattern
// used for warpStep/spaceAction in Slice A and pickRingSlot in E0.2.)
//
// NOT proven here (left to the manual Firefox file:// checklist in the report):
//   • document.activeElement being captured on showModal
//   • the first focusable descendant (or #modalBody) actually receiving focus
//   • the #modalBody tabindex="-1" being applied
//   • Tab/Shift+Tab keydown routing through trapModalTab and staying inside
//     the modal (not leaking to background page controls)
//   • focus being restored to the real trigger element on hideModal/Esc
// These all require real DOM focus APIs the Node harness does not implement.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- 1. nextTrapFocus: the wrap-around Tab step ----------
// A representative multi-element list (contents are opaque to the function — only length/index matter).
const four=['a','b','c','d']; // indices 0..3

// Forward (Tab): last wraps to first, otherwise +1.
check('nextTrapFocus: Tab from last wraps to first', nextTrapFocus(four, 3, false)===0);
check('nextTrapFocus: Tab from first → second', nextTrapFocus(four, 0, false)===1);
check('nextTrapFocus: Tab from middle → +1', nextTrapFocus(four, 1, false)===2);
check('nextTrapFocus: Tab from middle (2) → 3', nextTrapFocus(four, 2, false)===3);

// Backward (Shift+Tab): first wraps to last, otherwise -1.
check('nextTrapFocus: Shift+Tab from first wraps to last', nextTrapFocus(four, 0, true)===3);
check('nextTrapFocus: Shift+Tab from last → third', nextTrapFocus(four, 3, true)===2);
check('nextTrapFocus: Shift+Tab from middle → -1', nextTrapFocus(four, 2, true)===1);
check('nextTrapFocus: Shift+Tab from middle (1) → 0', nextTrapFocus(four, 1, true)===0);

// Single-element list: Tab and Shift+Tab both stay put (nowhere else to go).
const one=['solo'];
check('nextTrapFocus: single element, Tab stays on 0', nextTrapFocus(one, 0, false)===0);
check('nextTrapFocus: single element, Shift+Tab stays on 0', nextTrapFocus(one, 0, true)===0);

// Empty list: something sane, no throw. (-1 signals "no focusable target"; the caller no-ops on it.)
check('nextTrapFocus: empty list → -1 (Tab)', nextTrapFocus([], -1, false)===-1);
check('nextTrapFocus: empty list → -1 (Shift+Tab)', nextTrapFocus([], -1, true)===-1);
check('nextTrapFocus: empty list, no throw', (()=>{ try{ nextTrapFocus([], 0, false); return true; }catch(e){ return false; } })());
check('nextTrapFocus: null list → -1 (no throw)', nextTrapFocus(null, 0, false)===-1);
check('nextTrapFocus: undefined list → -1 (no throw)', nextTrapFocus(undefined, 0, true)===-1);

// Focus currently OUTSIDE the trap (currentIndex -1, i.e. document.activeElement not in the list):
// Tab lands on the first element, Shift+Tab lands on the last.
check('nextTrapFocus: outside (-1) + Tab → first', nextTrapFocus(four, -1, false)===0);
check('nextTrapFocus: outside (-1) + Shift+Tab → last', nextTrapFocus(four, -1, true)===3);
// A stale/out-of-range index is treated the same as "outside".
check('nextTrapFocus: out-of-range index + Tab → first', nextTrapFocus(four, 99, false)===0);
check('nextTrapFocus: out-of-range index + Shift+Tab → last', nextTrapFocus(four, 99, true)===3);

// Round trips through the whole list return to the start.
check('nextTrapFocus: Tab round trip 0→1→2→3→0', (()=>{ let i=0; for(let k=0;k<4;k++) i=nextTrapFocus(four,i,false); return i===0; })());
check('nextTrapFocus: Shift+Tab round trip 0→3→2→1→0', (()=>{ let i=0; for(let k=0;k<4;k++) i=nextTrapFocus(four,i,true); return i===0; })());

// ---------- 2. resolveReturnFocus: where hideModal returns focus ----------
// Stub "elements": plain objects with an isConnected flag standing in for the real DOM property.
const connected=(tag)=>({ tag, isConnected:true });
const detached =(tag)=>({ tag, isConnected:false });
const body={ tag:'BODY', isConnected:true };
// A getElementById stand-in built from an id→element map.
const byIdFrom=(map)=>(id=>Object.prototype.hasOwnProperty.call(map,id)?map[id]:null);

// Original trigger still connected → return it directly (id/getById never consulted).
const trig=connected('BUTTON');
check('resolveReturnFocus: connected trigger → itself', resolveReturnFocus(trig, 'trigBtn', byIdFrom({trigBtn:connected('BUTTON')}), body)===trig);

// Trigger went stale (render rebuilt the DOM) but its id re-resolves to a live element → use that.
const rebuilt=connected('BUTTON');
check('resolveReturnFocus: stale trigger, id re-resolves → the re-looked-up element',
  resolveReturnFocus(detached('BUTTON'), 'trigBtn', byIdFrom({trigBtn:rebuilt}), body)===rebuilt);

// Trigger stale AND the id now maps to a still-disconnected element → fall through to body.
check('resolveReturnFocus: stale trigger, id maps to disconnected → body',
  resolveReturnFocus(detached('BUTTON'), 'trigBtn', byIdFrom({trigBtn:detached('BUTTON')}), body)===body);

// Trigger stale and id not found at all → body.
check('resolveReturnFocus: stale trigger, id not found → body',
  resolveReturnFocus(detached('BUTTON'), 'goneBtn', byIdFrom({}), body)===body);

// Trigger stale, no id fallback saved → body.
check('resolveReturnFocus: stale trigger, no id → body',
  resolveReturnFocus(detached('BUTTON'), null, byIdFrom({}), body)===body);

// Nothing was ever saved (e.g. capture failed / activeElement was null) → body.
check('resolveReturnFocus: nothing saved → body', resolveReturnFocus(null, null, byIdFrom({}), body)===body);

// Defensive edges: no body available → null (sane, caller guards on it); no throw on a null getById.
check('resolveReturnFocus: stale trigger, no body → null', resolveReturnFocus(detached('BUTTON'), null, byIdFrom({}), null)===null);
check('resolveReturnFocus: null getById with an id → body (no throw)', resolveReturnFocus(detached('BUTTON'), 'x', null, body)===body);
check('resolveReturnFocus: no throw on all-null args', (()=>{ try{ resolveReturnFocus(null,null,null,null); return true; }catch(e){ return false; } })());
// An id fallback is only consulted when the primary element is stale — a connected primary wins even
// if the id would resolve elsewhere (guards against handing focus to the wrong live element).
const primary=connected('INPUT');
check('resolveReturnFocus: connected primary beats a different id match',
  resolveReturnFocus(primary, 'other', byIdFrom({other:connected('BUTTON')}), body)===primary);

console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
