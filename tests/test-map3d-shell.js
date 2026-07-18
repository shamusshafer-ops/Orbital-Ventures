// E4.3.1 (2026-07-18): the Three.js 3D-map rendering shell. The Three.js scene itself can't run
// under Node (no browser/WebGL), and the flag MAP3D ships OFF pending a real-browser playtest — but
// the parts that MUST be safe headlessly ARE testable: the pure helpers (hexToNum, planetMeshRadius)
// and, critically, that the whole thing degrades cleanly (flag off / THREE absent → the 2D map path
// is used, nothing throws, no scene state is created). This suite locks in that safety.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- flag ships OFF (browser-pending, like BENCH_V2) ----------
check('MAP3D flag is defined and OFF by default', typeof MAP3D !== 'undefined' && MAP3D === false);

// ---------- hexToNum: parses body colors to 0xRRGGBB ints ----------
check('hexToNum("#c1532b") === 0xc1532b', hexToNum('#c1532b') === 0xc1532b);
check('hexToNum without leading # still parses', hexToNum('3a7bd5') === 0x3a7bd5);
check('hexToNum(garbage) falls back to white (never NaN into Three)', hexToNum('nonsense') === 0xffffff);
check('hexToNum(undefined) falls back to white', hexToNum(undefined) === 0xffffff);
// every real body color parses to a valid 24-bit int
check('every BODIES color parses to a valid 0..0xffffff int',
  BODIES.every(b=> { const n=hexToNum(b.color); return Number.isInteger(n) && n>=0 && n<=0xffffff; }));

// ---------- planetMeshRadius: bounded, positive, planets bigger than moons ----------
{
  check('planetMeshRadius is positive for every body', BODIES.every(b=> planetMeshRadius(b) > 0));
  const mars=BODIES.find(b=>b.id==='mars'), phobos=BODIES.find(b=>b.id==='phobos');
  const jupiter=BODIES.find(b=>b.id==='jupiter');
  check('a moon mesh is smaller than its planet', planetMeshRadius(phobos) < planetMeshRadius(mars));
  check('a gas giant is at least as large as a terrestrial planet', planetMeshRadius(jupiter) >= planetMeshRadius(mars));
  check('planetMeshRadius(null) is a safe positive default', planetMeshRadius(null) > 0);
  check('mesh radii stay bounded (no absurd spheres)', BODIES.every(b=> planetMeshRadius(b) <= 4));
}

// ---------- the safety-critical invariant: with THREE absent, 3D never starts and never throws ----------
{
  check('THREE is absent in the harness (the fallback condition)', typeof THREE === 'undefined');
  let threw=false, res;
  try{ res = startMap3D(); }catch(e){ threw=true; console.log('startMap3D threw:', e && e.message); }
  check('startMap3D() does not throw when THREE is absent', !threw);
  check('startMap3D() returns false when THREE is absent (→ Phaser/SVG fallback)', res === false);
  check('startMap3D() creates no scene state when it can\'t run (map3d stays null)', typeof map3d === 'undefined' || map3d === null);
}

// ---------- pauseMap3D is safe to call with nothing running ----------
{
  let threw=false;
  try{ pauseMap3D(); }catch(e){ threw=true; }
  check('pauseMap3D() is a safe no-op when no 3D scene exists', !threw);
}

// ---------- renderMap still uses the 2D path with the flag off (no regression) ----------
{
  let threw=false;
  try{ state.tab='map'; if(typeof renderMap==='function') renderMap(); }catch(e){ threw=true; console.log('renderMap threw:', e && e.message); }
  check('renderMap() runs cleanly with MAP3D off (2D path intact)', !threw);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
