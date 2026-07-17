// Physics realism follow-up: orbital decay/station-keeping turned out to already exist (the facility
// condition/maintenance-decay system, STATION_MAINT_DECAY_BASE etc.) — this just adds accurate framing
// distinguishing WHY each facility's condition decays: real atmospheric drag for the orbiting LEO
// Station (same reason the ISS needs reboosts) vs. surface wear for the Moon/Mars bases (which don't
// orbit anything, so drag doesn't apply to them). No new mechanic, no new state — data + display only.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

{
  check('every facility has a decayReason', FACILITY_DEFS.every(d=>typeof d.decayReason==='string' && d.decayReason.length>0));
  const leo=facilityById('leo_station');
  check('leo_station: framed as real orbital decay (drag)', /drag/i.test(leo.decayReason));
  const lunar=facilityById('lunar_base'), mars=facilityById('mars_base');
  check('lunar_base: NOT framed as orbital decay (it does not orbit anything)', !/drag|orbital decay/i.test(lunar.decayReason));
  check('mars_base: NOT framed as orbital decay either', !/drag|orbital decay/i.test(mars.decayReason));
  check('all three reasons are distinct (no copy-paste)', new Set(FACILITY_DEFS.map(d=>d.decayReason)).size===FACILITY_DEFS.length);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
