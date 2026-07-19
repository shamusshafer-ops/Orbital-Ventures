// E4.4 — persistent physical launch-vehicle hulls.  Families remain design heritage;
// these tests cover the serial-numbered hardware layer and its save-safe lifecycle.
let pass=0, fail=0;
function check(name, cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }

newGame('engineer');
const m=curMission();
const spec=queueSpecSnapshot();
const ready={id:'ready1',missionId:m.id,missionName:m.name,spec};
const hull=assignHullToHangar(ready);
check('rollout assigns a stable serial hull to hangar hardware', /^OVH-\d{4}$/.test(hull.serial) && ready.hullId===hull.id && hull.status==='hangar');
check('new hull starts with no flights or reuse count', hull.flights===0 && hull.reuseCount===0 && hull.history[0].outcome==='rollout');

markHullLaunched(hull.id,m.id);
check('launch transitions the exact hull to in-flight and records its flight', hull.status==='in-flight' && hull.flights===1 && hull.history.slice(-1)[0].outcome==='launched');
settleHullFlight(hull.id,m,'loss');
check('failed hull remains in history as lost', hull.status==='lost' && hull.history.slice(-1)[0].outcome==='lost');

state.research.propulsive_landing=true; state.recovery=true;
const reusableSpec=queueSpecSnapshot(), reusable={id:'ready2',missionId:m.id,missionName:m.name,spec:reusableSpec};
const r=assignHullToHangar(reusable); markHullLaunched(r.id,m.id); settleHullFlight(r.id,m,'success');
check('successful recovery leaves the physical hull available', r.status==='recovered' && r.flights===1);
const next={id:'ready3',missionId:m.id,missionName:m.name,spec:reusableSpec}; assignHullToHangar(next);
check('compatible recovered hardware keeps its serial on the next rollout', next.hullId===r.id && r.status==='hangar' && r.history.slice(-1)[0].outcome==='refurbished');

const saved={hangar:[{id:'legacy',missionId:m.id,spec:queueSpecSnapshot()}],vehicles:[],hulls:[]};
migrateHulls(saved);
check('legacy save backfills a ready hangar hull without inventing prior flights', saved.hulls.length===1 && saved.hangar[0].hullId===saved.hulls[0].id && saved.hulls[0].flights===0);
check('migration is idempotent', (migrateHulls(saved), saved.hulls.length===1));

state.hangar=[next];
const group=assetRegistryGroups().find(g=>g.key==='hulls');
check('registry surfaces an operational hull with serial and reuse telemetry', !!group && group.items.some(x=>x.id===r.id && x.detail['Reuse count']==='0'));
console.log(`${pass}/${pass+fail} checks passed`);
if(fail) process.exit(1);
