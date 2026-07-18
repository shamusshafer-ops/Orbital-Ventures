// E4.2 (2026-07-18): Three.js CDN plumbing + ESM→global shim + guarded 2D fallback.
// The shim itself (a <script type="module"> importing three.module.js and stashing window.THREE)
// lives in shell.html and can't run under Node — but the GUARD that every Three.js call site must
// gate on, threeOK(), is plain game code and IS testable. The critical invariant is that when THREE
// is absent — exactly the headless-harness condition, and also the real "CDN/WebGL unavailable" or
// "module hasn't deferred-loaded yet at first paint" cases — threeOK() reports false so callers take
// the existing 2D Solar System fallback instead of hard-failing.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- guard exists and is callable ----------
check('threeOK is defined as a function', typeof threeOK === 'function');

// ---------- THREE absent (harness default) → guard reports absent → 2D fallback path ----------
check('THREE is genuinely undefined in the headless harness (the absent case)', typeof THREE === 'undefined');
check('threeOK() returns false when THREE is absent (degrade-to-2D path)', threeOK() === false);
check('threeOK() never throws when THREE is undefined', (()=>{ try{ threeOK(); return true; }catch(e){ return false; } })());

// ---------- THREE present-but-incomplete (e.g. a failed/partial load) → still absent ----------
{
  global.THREE = {}; // object exists but has no Scene — mirrors phaserOK()'s !!Phaser.Scene sanity
  check('threeOK() returns false when THREE exists but lacks Scene (partial/failed load)', threeOK() === false);
  delete global.THREE;
  check('threeOK() back to false after removing the stub', threeOK() === false);
}

// ---------- THREE present and complete → guard reports available ----------
{
  global.THREE = { Scene: function(){}, WebGLRenderer: function(){}, PerspectiveCamera: function(){} };
  check('threeOK() returns true when a real-shaped THREE is present', threeOK() === true);
  delete global.THREE;
}

// ---------- symmetry with the established Phaser guard ----------
check('phaserOK() also reports false in the headless harness (same guard convention)', phaserOK() === false);

// ---------- the game boots and renders with THREE absent (no hard dependency on 3D) ----------
{
  let threw=false;
  try{
    newGame('engineer');
    // exercise the normal render path; nothing should require THREE to be present
    if(typeof render === 'function') render();
  }catch(e){ threw=true; console.log('render threw with THREE absent:', e && e.message); }
  check('game boots + renders with THREE absent (3D is optional, not required)', !threw);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
