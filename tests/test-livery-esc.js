// H1 (audit 2026-07-13) — stored-XSS regression guard. A save file controls livery.name (and
// company); those strings hit innerHTML sinks (vehicle pop-out title, save modals). This suite
// asserts (1) the sink output escapes hostile markup, (2) the import path re-clamps lengths the
// input UI normally enforces (setLiveryName slices to 24 — a crafted file bypasses that), and
// (3) esc() itself neutralizes every dangerous character class it claims to.
//
// Appended after harness.js + build/game.js in one script scope (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Persistent-element shim (same pattern as test-progress-unify): cache getElementById results so
// innerHTML written during a render can be read back for inspection.
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };

newGame('engineer');

const HOSTILE='<img src=x onerror=alert(1)>';

// ---------- 1. esc() fundamentals ----------
check('esc: angle brackets', esc('<b>')==='&lt;b&gt;');
check('esc: quotes', esc('"\'')==='&quot;&#39;');
check('esc: ampersand first (no double-escape)', esc('&lt;')==='&amp;lt;');
check('esc: null/undefined safe', esc(null)==='' && esc(undefined)==='');

// ---------- 2. Vehicle pop-out title sink escapes a hostile livery name ----------
state.livery=Object.assign(defaultLivery(),{name:HOSTILE.slice(0,24)}); // as typed in-game (24-clamped)
// openVehPopout builds a fresh scrim div via createElement — capture it through appendChild.
let capturedHTML=null;
const _origAppend=global.document.body.appendChild ? global.document.body.appendChild.bind(global.document.body) : null;
global.document.body.appendChild=(el)=>{ if(el && el.id==='vehPopout') capturedHTML=el.innerHTML; return _origAppend?_origAppend(el):el; };
try{ openVehPopout(); }catch(e){ /* harness DOM is minimal; the innerHTML write happens before any throw we care about */ }
check('popout: scrim was built', typeof capturedHTML==='string' && capturedHTML.length>0);
check('popout: no raw <img in title', !(capturedHTML||'').includes('<img'));
check('popout: hostile name present but escaped', (capturedHTML||'').includes('&lt;img'));
try{ closeVehPopout(); }catch(e){}

// ---------- 3. Import path re-clamps lengths the input UI enforces ----------
const LONG='A'.repeat(500), LONG_CO='C'.repeat(500);
const payload={v:SAVE_VERSION, ts:Date.now(), state:JSON.parse(JSON.stringify(state))};
payload.state.livery={body:'#d4dee4',accent:'#e0564f',nose:'auto',name:LONG};
payload.state.company=LONG_CO;
applyLoadedSave(payload);
check('import: livery.name clamped to 24', state.livery.name.length===24);
check('import: company clamped to 48', state.company.length===48);

// ---------- 4. setLiveryName still clamps live input ----------
setLiveryName(LONG);
check('input: setLiveryName clamps to 24', state.livery.name.length===24);

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
