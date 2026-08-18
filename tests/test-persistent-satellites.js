// #116-A — persistent satellite objects.
// Satellites become real, save-persisted orbit assets instead of a pure income abstraction.
// Implemented by extending the existing orbitAssets system (option A of the #116 scoping) rather
// than building a parallel satellite array, which is why the docking/servicing tie-in and save
// persistence come for free. Income is still governed entirely by the passive contract's own
// term -- tying income to satellite health is option (C), a separate balance-affecting slice.
let satPass=0, satFail=0;
function satCheck(name, cond, detail){
  if(cond) satPass++;
  else { satFail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}
function satDef(id){ return PASSIVE_CONTRACT_DEFS.find(d=>d.id===id); }

console.log('#116-A — persistent satellites');

/* ---------- schema: satellites are payloads, not hulls ---------- */
{
  satCheck('satellite is a registered orbit-asset kind', ORBIT_ASSET_KINDS.includes('satellite'));
  satCheck('retired is a registered status', ORBIT_ASSET_STATUSES.includes('retired'));
  satCheck('orbit-asset schema bumped to 2', ORBIT_ASSET_SCHEMA_VERSION===2);
  satCheck('satellites are declared hull-less', orbitAssetIsHullBound('satellite')===false);
  for(const k of ['capsule','pod','tug','target'])
    satCheck(k+' is still hull-bound', orbitAssetIsHullBound(k)===true);
}

/* ---------- deployment ---------- */
{
  newGame('engineer');
  const before=satelliteList().length;
  const sat=deploySatelliteForContract(satDef('sat_weather'), 0.9);
  satCheck('signing a sat contract deploys a persistent object', !!sat && satelliteList().length===before+1);
  satCheck('deployed satellite validates against the shared record validator',
    sat && orbitAssetErrors(sat).length===0, sat?orbitAssetErrors(sat).join(','):'no record');
  satCheck('deployed satellite owns no hull', sat && sat.hullId==='');
  satCheck('deployed satellite starts at full health', sat && sat.health===1);
  satCheck('deployed satellite starts operational', sat && sat.status==='free');
  satCheck('deployed satellite exposes a servicing port (docking tie-in)',
    sat && Array.isArray(sat.interfaces) && sat.interfaces.length>0);
  satCheck('deployed satellite records its originating contract',
    sat && sat.vehicleSnapshot && sat.vehicleSnapshot.contractId==='sat_weather');
  satCheck('lifecycle audit accepts a hull-less satellite', auditLifecycleState().length===0,
    auditLifecycleState().slice(0,2).join('; '));

  // non-sat contracts must NOT spawn one
  const n=satelliteList().length;
  deploySatelliteForContract(satDef('tour_suborbit'), 0.7);
  satCheck('a non-satellite contract deploys nothing', satelliteList().length===n);

  // each sat contract gets its own orbit
  const comms=deploySatelliteForContract(satDef('sat_comms'), 1.6);
  satCheck('different sat contracts get different orbits',
    comms && comms.orbit.inclination!==sat.orbit.inclination,
    sat?sat.orbit.inclination+' vs '+(comms&&comms.orbit.inclination):'');
}

/* ---------- a satellite must not be able to claim a hull ---------- */
{
  newGame('engineer');
  const bad=makeOrbitAsset({id:'orb_bad',hullId:'hull_1',kind:'satellite',name:'Cheater',bodyId:'earth',
    orbit:{band:'low',inclination:1},interfaces:[makeDockInterface({id:'svc'})],
    resources:{rendezvousDv:0,fuel:0,power:1},health:1,createdAbs:0});
  satCheck('a satellite claiming a hull is rejected by the validator',
    orbitAssetErrors(bad).some(e=>/hull/i.test(e)), orbitAssetErrors(bad).join(','));
}

/* ---------- degradation ---------- */
{
  newGame('engineer'); state.money=99999;
  deploySatelliteForContract(satDef('sat_weather'), 0.9);
  const sat=()=>satelliteList()[0];
  advanceDays(10);
  const drop=1-sat().health;
  // Regression guard for a real bug found during implementation: health was rounded to 4dp on
  // every daily step, but the daily decrement (~0.000228) is FINER than that granularity, so it
  // truncated to 0.0002 and compounded -- decay ran ~12% slow and satellites outlived their
  // design life. Health is now stored at full precision and rounded only for display.
  satCheck('degradation rate is exact, not eroded by per-step rounding',
    Math.abs(drop - 10/SATELLITE_LIFE_DAYS) < 1e-9, 'drop='+drop+' expected='+(10/SATELLITE_LIFE_DAYS));
  satCheck('health tracks power', Math.abs(sat().resources.power - sat().health) < 1e-9);
  satCheck('a young satellite is not retired', sat().status==='free');
}

/* ---------- end of life ---------- */
{
  newGame('engineer'); state.money=99999;
  deploySatelliteForContract(satDef('sat_weather'), 0.9);
  for(let i=0;i<13;i++) advanceDays(365); // past the ~12yr design life
  const sat=satelliteList()[0];
  satCheck('a satellite reaches zero health at end of life', sat.health===0, String(sat.health));
  satCheck('an expired satellite is marked retired', sat.status==='retired', sat.status);
  satCheck('a retired satellite REMAINS in the registry as a real object in orbit',
    satelliteList().length===1);
  satCheck('health never goes negative', sat.health>=0);
  advanceDays(365);
  satCheck('a retired satellite stops degrading further', satelliteList()[0].health===0);
  satCheck('lifecycle audit still clean with a dead satellite', auditLifecycleState().length===0);
}

/* ---------- save persistence + migration ---------- */
{
  newGame('engineer'); state.money=99999;
  deploySatelliteForContract(satDef('sat_imaging'), 2.4);
  advanceDays(100);
  const healthBefore=satelliteList()[0].health, idBefore=satelliteList()[0].id;
  const payload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
  applyLoadedSave(payload);
  satCheck('satellites survive save/load', satelliteList().length===1);
  satCheck('satellite identity survives save/load', satelliteList()[0].id===idBefore);
  satCheck('satellite health survives save/load exactly',
    Math.abs(satelliteList()[0].health-healthBefore)<1e-9);
  satCheck('lifecycle audit clean after reload', auditLifecycleState().length===0);

  // v67 (pre-#116) records have neither schema 2 nor a health field; the migration must
  // backfill them or the whole fleet reads as invalid on load.
  const legacy=JSON.parse(JSON.stringify(payload));
  for(const a of legacy.state.orbitAssets){ a.schema=1; delete a.health; }
  migrateOrbitAssetsV68(legacy.state, 67);
  satCheck('v68 migration upgrades pre-#116 orbit-asset records to schema 2',
    legacy.state.orbitAssets.every(a=>a.schema===ORBIT_ASSET_SCHEMA_VERSION));
  satCheck('v68 migration backfills health to full (no asset silently starts degraded)',
    legacy.state.orbitAssets.every(a=>a.health===1));
  const already=JSON.parse(JSON.stringify(payload));
  const before=JSON.stringify(already.state.orbitAssets);
  migrateOrbitAssetsV68(already.state, 68);
  satCheck('v68 migration is a no-op on current saves', JSON.stringify(already.state.orbitAssets)===before);
}

/* ---------- Fleet Registry surfacing ---------- */
{
  newGame('engineer'); state.money=99999;
  deploySatelliteForContract(satDef('sat_weather'), 0.9);
  advanceDays(30);
  const groups=assetRegistryGroups();
  const g=groups.find(x=>x.key==='satellites');
  satCheck('satellites get their own registry group', !!g);
  satCheck('satellite group is separate from spacecraft-in-orbit',
    !!groups.find(x=>x.key==='satellites') && !(groups.find(x=>x.key==='orbit-assets')||{items:[]}).items.some(i=>/Weather/.test(i.name)));
  satCheck('satellite status line leads with health', g && /health/.test(g.items[0].status), g?g.items[0].status:'');
  satCheck('satellite detail exposes remaining design life',
    g && g.items[0].detail['Remaining design life']!=null);
  satCheck('satellite detail names its contract',
    g && g.items[0].detail['Contract']==='sat_weather', g?g.items[0].detail['Contract']:'');
}

console.log('\n'+satPass+' passed, '+satFail+' failed');
if(satFail) process.exit(1);
