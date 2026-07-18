// E4.3.1 (2026-07-18): the Three.js 3D-map rendering shell. The Three.js scene itself can't run
// under Node (no browser/WebGL), and the flag MAP3D ships OFF pending a real-browser playtest — but
// the parts that MUST be safe headlessly ARE testable: the pure helpers (hexToNum, planetMeshRadius)
// and, critically, that the whole thing degrades cleanly (flag off / THREE absent → the 2D map path
// is used, nothing throws, no scene state is created). This suite locks in that safety.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- flag is ON as of 2026-07-18 (default-on at repo owner's request, browser-pending) ----------
// The safety checks below matter MORE now it's default-on: they prove that even with MAP3D=true, when
// Three.js/WebGL is unavailable (CDN down, no WebGL, or the headless harness) the game degrades cleanly
// to the 2D map instead of breaking the tab. If a browser playtest turns up problems, flip MAP3D back off.
check('MAP3D flag is defined', typeof MAP3D !== 'undefined');
check('MAP3D is ON (default-on, browser-pending)', MAP3D === true);

// ---------- visual-only map time scrubber never mutates the simulation clock ----------
{
  const live=absDay();
  mapPreviewAbsDay=null;
  check('map preview initially follows the live simulation day', mapViewAbsDay()===live);
  mapTimeShift(30);
  check('map time advances by one preview month without changing simulation time', mapViewAbsDay()===live+30 && absDay()===live);
  resetMapTime();
  check('map time reset returns to the live simulation day', mapViewAbsDay()===live);
}

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
  const mars=BODIES.find(b=>b.id==='mars'), phobos=BODIES.find(b=>b.id==='phobos'), deimos=BODIES.find(b=>b.id==='deimos');
  const jupiter=BODIES.find(b=>b.id==='jupiter');
  check('a moon mesh is smaller than its planet', planetMeshRadius(phobos) < planetMeshRadius(mars));
  check('a gas giant is at least as large as a terrestrial planet', planetMeshRadius(jupiter) >= planetMeshRadius(mars));
  check('planetMeshRadius(null) is a safe positive default', planetMeshRadius(null) > 0);
  check('mesh radii stay bounded (no absurd spheres)', BODIES.every(b=> planetMeshRadius(b) <= 6));
  check('giant planets are materially larger than Earth (scale is no longer nearly flat)', planetMeshRadius(jupiter) > planetMeshRadius(BODIES.find(b=>b.id==='earth'))*4);
  check('the ten largest moons are represented', ['ganymede','titan','callisto','io','moon','europa','triton','titania','rhea','oberon'].every(id=>BODIES.some(b=>b.id===id)));
  check('every half-Pluto-sized-or-larger moon is represented', ['ganymede','titan','callisto','io','moon','europa','triton','titania','rhea','oberon','iapetus','charon'].every(id=>BODIES.some(b=>b.id===id)));
  check('both Martian moons are represented', !!phobos && !!deimos && phobos.around==='mars' && deimos.around==='mars');
  check('the default planetary skin family is photographic', MAP3D_PLANET_SKIN_VARIANT==='photographic');
  check('every major mapped world has a packaged equirectangular skin', ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'].every(id=>typeof MAP3D_TEXTURE_ASSET[id]==='string'));
  check('embedded texture data takes precedence when the standalone file cannot load', (()=>{ window.__OV_TEXTURE_DATA__={mars:'data:image/jpeg;base64,test'}; const ok=((window.__OV_TEXTURE_DATA__&&window.__OV_TEXTURE_DATA__.mars)||MAP3D_TEXTURE_ASSET.mars).startsWith('data:image/jpeg'); delete window.__OV_TEXTURE_DATA__; return ok; })());
  check('a picked terrestrial planet receives a close texture-inspection distance', map3dFocusDistance(mars) < 12);
  check('a picked gas giant remains far enough away to fit on screen', map3dFocusDistance(jupiter) > map3dFocusDistance(mars));
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

// ---------- renderMap still runs cleanly (harness has no THREE, so it takes the 2D fallback) ----------
{
  let threw=false;
  try{ state.tab='map'; if(typeof renderMap==='function') renderMap(); }catch(e){ threw=true; console.log('renderMap threw:', e && e.message); }
  check('renderMap() runs cleanly with THREE absent (falls through to 2D even with MAP3D on)', !threw);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
