// Docking D0 — exact operation ownership, reservation idempotency, release and audits.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }

const crewServices={crew:true,cargo:true,data:true};
const actors=[
  makeDockActor({id:'capsule',label:'Capsule',interfaces:[{id:'nose',standard:'probe_drogue',size:'standard',role:'active',services:crewServices}]}),
  makeDockActor({id:'lander',label:'Lander',interfaces:[{id:'top',standard:'probe_drogue',size:'standard',role:'passive',services:crewServices}]}),
];
const operation=makeDockOperation({id:'mission:dock-1',missionId:'mission',purpose:'Crew rendezvous',actorId:'capsule',actorPortId:'nose',targetId:'lander',targetPortId:'top',services:['crew','data'],reliability:.97});
check('operation constructor is schema-valid',dockOperationErrors(operation).length===0);
check('operation record is JSON-safe',recordIsJsonSafe(operation));

const before=JSON.stringify(actors), reserved=reserveDockingOperation(operation,actors);
check('compatible operation reserves successfully',reserved.ok&&reserved.operation.status==='reserved');
check('reservation does not mutate caller actors',JSON.stringify(actors)===before);
check('actor port is owned by exact operation',findDockInterface(reserved.actors,'capsule','nose').port.occupiedBy===operation.id);
check('target port is owned by exact operation',findDockInterface(reserved.actors,'lander','top').port.occupiedBy===operation.id);
check('reservation exposes authorized service intersection',reserved.compatibility.services.includes('crew')&&reserved.compatibility.services.includes('data'));

const repeated=reserveDockingOperation(operation,reserved.actors);
check('same operation reservation is idempotent',repeated.ok&&JSON.stringify(repeated.actors)===JSON.stringify(reserved.actors));
const rival=makeDockOperation(Object.assign({},operation,{id:'mission:dock-2'}));
const conflict=reserveDockingOperation(rival,reserved.actors);
check('another operation cannot steal actor reservation',!conflict.ok&&conflict.reasons.includes('actor-port-unavailable'));
check('another operation cannot steal target reservation',!conflict.ok&&conflict.reasons.includes('target-port-unavailable'));

const released=releaseDockingReservation(reserved.actors,operation.id);
check('release clears both exact reservations',findDockInterface(released,'capsule','nose').port.occupiedBy===null&&findDockInterface(released,'lander','top').port.occupiedBy===null);
check('release is pure',findDockInterface(reserved.actors,'capsule','nose').port.occupiedBy===operation.id);
check('release for a different owner is a no-op',JSON.stringify(releaseDockingReservation(reserved.actors,'other'))===JSON.stringify(reserved.actors));

const missing=reserveDockingOperation(makeDockOperation(Object.assign({},operation,{actorPortId:'missing'})),actors);
check('missing interface has an exact rejection reason',!missing.ok&&missing.reasons.includes('interface-not-found'));
const invalid=reserveDockingOperation({id:'bad'},actors);
check('invalid operation has an exact rejection reason',!invalid.ok&&invalid.reasons.includes('invalid-operation'));

const capability=makeDockingCapability({missionId:'mission',guidance:'manual',actors:reserved.actors,operations:[reserved.operation],reliability:{factor:.97,additive:0}});
check('well-owned reservation passes capability audit',dockingReservationErrors(capability).length===0);
const duplicate=plainRecord(capability); duplicate.operations.push(plainRecord(duplicate.operations[0]));
check('duplicate operation owner fails audit',dockingReservationErrors(duplicate).some(e=>e.includes('duplicate operation')));
const unknown=plainRecord(capability); unknown.actors[0].interfaces[0].occupiedBy='ghost';
check('unknown reservation owner fails audit',dockingReservationErrors(unknown).some(e=>e.includes('unknown operation')));
const oneSided=plainRecord(capability); oneSided.actors[1].interfaces[0].occupiedBy=null;
check('one-sided reservation fails exact two-port audit',dockingReservationErrors(oneSided).some(e=>e.includes('does not uniquely own both interfaces')));

const presentation=dockingPresentationSpec(reserved.operation,reserved.actors,'moon');
check('presentation is a read-only generic actor/target spec',presentation.actor.label==='Capsule'&&presentation.target.label==='Lander'&&presentation.body==='moon');
check('presentation contains no simulation callback or settlement flag',recordIsJsonSafe(presentation)&&!('resolve' in presentation)&&!('payout' in presentation));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
