// #114 slice 2 — the two inclination retrofits. crew_orbit's 65° exceeds the Cape's ~57° range-safety
// ceiling (added when #1's dogleg/ceiling landed), so it now pays a small dogleg tax — realistic, since
// Vostok 1's 65° flew from Baikonur's more permissive high-latitude range, not a Florida-analog coast.
// comsat's 0° equatorial target levies the full plane-change tax. Both payouts raised to compensate.
// Appended after harness.js + build/game.js (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- crew_orbit: 65° exceeds the ~57° ceiling → a small dogleg tax, payout raised ----------
{
  const co=MISSIONS.find(m=>m.id==='crew_orbit');
  check('crew_orbit sets inclination 65', co.inclination===65);
  const surcharge=inclinationDv(co);
  check('crew_orbit: 65° levies a dogleg tax (exceeds the ~57° ceiling)', surcharge>0);
  check('crew_orbit: matches 2·v·sin(Δi/2) measured from the ceiling', surcharge===Math.round(2*7800*Math.sin(((65-LAUNCH_SITE_MAX_DIRECT_INCL)*Math.PI/180)/2)));
  check('crew_orbit: effectiveReqDv = base + dogleg surcharge', effectiveReqDv(co)===co.reqDv+surcharge);
  check('crew_orbit: payout raised above the old 30.0 to offset it', co.payout>30.0);
}

// ---------- comsat: 0° equatorial → full plane-change tax, payout raised ----------
{
  const arch=CONTRACT_ARCHETYPES.find(a=>a.kind==='comsat');
  const cs=arch.build(2);
  check('comsat sets inclination 0', cs.inclination===0);
  const surcharge=inclinationDv(cs);
  check('comsat: 0° levies the full plane change (2·v·sin(28.4°/2))', surcharge===Math.round(2*7800*Math.sin((28.4*Math.PI/180)/2)));
  check('comsat: effectiveReqDv = base + surcharge', effectiveReqDv(cs)===cs.reqDv+surcharge);
  // payout raised vs the old (10+2·idx)·0.6 formula so it stays worth the extra Δv
  const oldPayout=round2((10+2*2)*0.6);
  check('comsat: payout raised above the old formula', cs.payout>oldPayout);
  // scales with era like before
  check('comsat: payout still scales with era', arch.build(4).payout>arch.build(0).payout);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
