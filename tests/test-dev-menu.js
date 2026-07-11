// Dev/cheat menu (Ctrl+Shift+D), 2026-07-11. Covers the dev-only manual-testing tool: unlock-all
// (research + leveled tech maxed), single-shot forced flight outcomes (consumed, not sticky), forced
// decision-event flags, the real-tick time jump (a mid-jump facility tick must fire — not a raw year
// overwrite), the LEO-station preset (real founded facility + real docked modules), and panel
// open/close (no throw, no state mutation — open state is a module-level bool, never in `state`).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- unlock-all: every RESEARCH id true, every leveled tech maxed ----------
newGame('engineer');
devUnlockAllResearch();
check('unlock-all: every RESEARCH id set true', RESEARCH.every(r=>state.research[r.id]===true));
check('unlock-all: every leveled tech maxed to TECH_LEVELS[id].max', Object.keys(TECH_LEVELS).every(id=>state.techLevel[id]===TECH_LEVELS[id].max));
check('max rep clears rep gates', (devMaxRep(), state.rep===100));

// ---------- forced outcome: changes resolveFlight's kind, consumed after one use (not sticky) ----------
newGame('engineer');
const m=curMission(), v=computeVehicle();
_devForceOutcome='loss';
const oLoss=resolveFlight(m,v,null,false,0);
check('forced loss: kind is loss', oLoss.kind==='loss');
check('forced loss: has real shape (subsystem+failPhase+phases)', oLoss.subsystem==='propulsion' && oLoss.failPhase==='ascent' && Array.isArray(oLoss.phases));
check('forced outcome consumed after one use', _devForceOutcome===null);
// not sticky: the very next resolve is a genuine roll again (flag stayed cleared)
const oReal=resolveFlight(m,v,null,false,0);
check('forced outcome is single-shot (next call not forced)', _devForceOutcome===null && typeof oReal.kind==='string');

_devForceOutcome='success';
const oSucc=resolveFlight(m,v,null,false,0);
check('forced success: kind success, high rel, no governing subsystem', oSucc.kind==='success' && oSucc.rel>=0.9 && oSucc.subsystem===null);

_devForceOutcome='partial';
const oPart=resolveFlight(m,v,null,false,0);
check('forced partial: kind partial with a subsystem + phases', oPart.kind==='partial' && !!oPart.subsystem && Array.isArray(oPart.phases));

// forced strand is crewed-deep-failure-shaped (so finalizeLaunch's rescue branch reads it correctly)
_devForceOutcome='strand';
const oStrand=resolveFlight(m,v,null,true,0);
check('forced strand: kind strand, deep failPhase, a subsystem (rescue-compatible)', oStrand.kind==='strand' && oStrand.failPhase==='deep' && !!oStrand.subsystem);

// ---------- forced decision events: flags fire their gate and are consumed ----------
newGame('engineer');
const m2=curMission(), v2=computeVehicle();
const base=resolveFlight(m2,v2,null,false,0); // a real outcome carrying .phases for the flags to read
_devForceLiveCall=true;
const lflag=liveCallFlag(base, false);
check('forced live call: returns a non-null flag', !!lflag && !!lflag.sub && !!lflag.phase);
check('forced live call: flag consumed (single-shot)', _devForceLiveCall===false);

_devForceReserve=true;
const dflag=deepCallFlag(base, {legs:[]}, false); // bypasses the reserve-margin gate that would normally null it
check('forced reserve call: returns a non-null flag', !!dflag && !!dflag.sub && !!dflag.phase);
check('forced reserve call: flag consumed', _devForceReserve===false);

_devForceWeather=true;
const wx=rollWeather(m2);
check('forced weather: returns an adverse (scrub) condition', wx.adverse===true && wx.clear>=1);
check('forced weather: flag consumed', _devForceWeather===false);

// ---------- time jump drives the REAL tick path: a mid-jump facility tick must fire ----------
// A raw state.year overwrite would leave a founded facility's provisions untouched; the real monthly
// boundary drains them. Found a fully-provisioned LEO station, advance a year, and assert it drained.
newGame('engineer');
state.completed.crew_orbit=true; // remove the founding gate
state.money=600;
foundFacility('leo_station');
const fsFound=facilityState('leo_station');
check('facility founded fully provisioned', fsFound && fsFound.supply===FAC_SUPPLY_MONTHS);
const yr0=state.year;
devAdvanceMonths(12);
check('time jump advanced the calendar (real tick path)', state.year===yr0+1);
check('mid-jump facility tick fired (supply drained below full)', facilityState('leo_station').supply < FAC_SUPPLY_MONTHS);

// ---------- fast-forward-to-late-game preset: real advance to >=2030, unlocks + treasury + rep ----------
newGame('engineer');
devPresetLateGame();
check('late-game preset: advanced to Expansion era (year >= 2030)', state.year>=2030);
check('late-game preset: all research unlocked', RESEARCH.every(r=>state.research[r.id]===true));
check('late-game preset: large treasury + max rep', state.money===2000 && state.rep===100);

// ---------- LEO-station preset: real founded facility with real docked modules ----------
newGame('engineer');
devPresetStation();
check('station preset: leo_station really founded (via foundFacility)', facilityBuilt('leo_station')===true);
const list=facilityModuleList(facilityState('leo_station'));
check('station preset: 3 distinct module types docked (via addStationModule)', list.includes('lab_mod') && list.includes('power_truss') && list.includes('node_hub'));
check('station preset: module list grew past the lone core habitat', list.length>=4);

// ---------- panel open/close: no throw, module-level flag only, does not touch state ----------
newGame('engineer');
const yBefore=state.year, moneyBefore=state.money, repBefore=state.rep;
let threw=false;
try{ openDevPanel(); check('open: devPanelOpen true', devPanelOpen===true); closeDevPanel(); check('close: devPanelOpen false', devPanelOpen===false); toggleDevPanel(); toggleDevPanel(); }
catch(e){ threw=true; console.log('threw:', e && e.message); }
check('panel open/close/toggle never throws', threw===false);
check('panel open/close does not mutate state', state.year===yBefore && state.money===moneyBefore && state.rep===repBefore);
check('devPanelOpen is not a persisted state field', !('devPanelOpen' in state));

console.log(pass+'/'+(pass+fail));
process.exit(fail>0?1:0);
