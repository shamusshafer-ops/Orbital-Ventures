// #114 slice 2 — the two inclination retrofits. Verifies crew_orbit's 65° is free (teaching case) and
// the comsat contract's 0° equatorial target levies the full plane-change tax, with a payout raised to
// stay worth flying. Appended after harness.js + build/game.js (see tests/README.md).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- crew_orbit: 65° is above the Cape's 28.4° → free ----------
{
  const co=MISSIONS.find(m=>m.id==='crew_orbit');
  check('crew_orbit sets inclination 65', co.inclination===65);
  check('crew_orbit: 65° is free (above site latitude)', inclinationDv(co)===0);
  check('crew_orbit: effectiveReqDv unchanged from base reqDv', effectiveReqDv(co)===co.reqDv);
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
