// E0.3 Slice 2 — unit tests for setHTML()'s memoize-skip logic and the newGame/load cache-clear
// guard. Focus/scroll preservation itself isn't verified here: the harness doesn't model
// document.activeElement or a real browser's "innerHTML='' resets scrollTop" behavior, so those
// need the real-browser checklist (type in a field / scroll the log during warp) instead. What IS
// cleanly headless-testable, and worth pinning down, is the actual skip-vs-write decision — the one
// place this refactor could silently produce stale UI.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function makeSpyEl(){
  const el=document.createElement('div');
  el._writes=0;
  let _h='';
  Object.defineProperty(el, 'innerHTML', { get(){ return _h; }, set(v){ _h=v; el._writes++; } });
  return el;
}

newGame('engineer');

// ---------- identical writes are skipped; different writes go through ----------
{
  const el=makeSpyEl();
  setHTML(el, 'A');
  check('first write happens', el._writes===1);
  setHTML(el, 'A');
  check('identical write is skipped (no DOM touch)', el._writes===1);
  setHTML(el, 'A');
  setHTML(el, 'A');
  check('repeated identical writes stay skipped', el._writes===1);
  setHTML(el, 'B');
  check('a genuinely different write goes through', el._writes===2);
  setHTML(el, 'B');
  check('the new value then memoizes too', el._writes===2);
}

// ---------- setHTML(null, ...) is a safe no-op ----------
{
  let threw=false;
  try{ setHTML(null, 'whatever'); }catch(e){ threw=true; }
  check('setHTML(null, ...) does not throw', !threw);
}

// ---------- newGame() clears the cache even for an unchanged string (the documented trap) ----------
{
  const el=makeSpyEl();
  setHTML(el, 'same-string');
  check('pre-newGame baseline write', el._writes===1);
  newGame('engineer'); // reassigns the top-level `state` to a fresh object
  setHTML(el, 'same-string'); // identical string, but state identity changed underneath it
  check('newGame() invalidates the cache — write happens again despite an unchanged string', el._writes===2);
}

// ---------- two different elements don't share a cache slot ----------
{
  const a=makeSpyEl(), b=makeSpyEl();
  setHTML(a, 'shared-text');
  setHTML(b, 'shared-text');
  check('two different elements both get their first write', a._writes===1 && b._writes===1);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
