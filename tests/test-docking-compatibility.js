// Docking D0 — pure interface, compatibility, adapter and frozen-fitment authority.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }

function iface(id,overrides){ return makeDockInterface(Object.assign({id,standard:'probe_drogue',size:'standard',role:'active',services:{crew:true,data:true}},overrides||{})); }
const active=iface('active'), passive=iface('passive',{role:'passive'});

check('normalized interface is schema-valid',dockInterfaceErrors(active).length===0);
check('normalized interface has every explicit service flag',DOCKING_SERVICE_KEYS.every(key=>typeof active.services[key]==='boolean'));
check('interface is JSON-safe',recordIsJsonSafe(active)&&JSON.parse(JSON.stringify(active)).id==='active');
check('invalid raw interface reports exact invalid fields',dockInterfaceErrors(Object.assign({},active,{standard:'magic',size:'giant'})).includes('standard')&&dockInterfaceErrors(Object.assign({},active,{standard:'magic',size:'giant'})).includes('size'));

const before=JSON.stringify([active,passive]);
check('active/passive matching ports are compatible',dockCompatibility(active,passive,{services:['crew']}).ok);
check('compatibility query is pure',JSON.stringify([active,passive])===before);
check('two active directional ports are rejected',dockCompatibility(active,iface('also-active'),{services:['crew']}).reasons.includes('role-mismatch'));
check('androgynous port can meet either directional role',dockCompatibility(active,iface('andro',{role:'androgynous'}),{services:['crew']}).ok);
check('wrong standard has an exact rejection reason',dockCompatibility(active,iface('berth',{standard:'berthing',role:'passive'}),{services:['crew']}).reasons.includes('standard-mismatch'));
check('wrong size has an exact rejection reason',dockCompatibility(active,iface('heavy',{size:'heavy',role:'passive'}),{services:['crew']}).reasons.includes('size-mismatch'));
check('missing intended transfer service is rejected',dockCompatibility(active,iface('fuel',{role:'passive',services:{fuel:true}}),{services:['crew']}).reasons.includes('service-mismatch'));
check('matching mechanical ports expose only intersecting services',JSON.stringify(dockCompatibility(active,passive).services)===JSON.stringify(['crew','data']));

const bridged=dockCompatibility(active,iface('berth-adapted',{standard:'berthing',role:'passive'}),{services:['crew'],adapters:[{standards:['probe_drogue','berthing']}]});
check('an explicit adapter bridges standards',bridged.ok&&bridged.adapter===true);
check('an unrelated adapter does not bridge standards',!dockCompatibility(active,iface('berth-no-adapter',{standard:'berthing',role:'passive'}),{services:['crew'],adapters:[{standards:['androgynous','berthing']}]}).ok);
check('a standard adapter does not silently bridge port size',dockCompatibility(active,iface('berth-heavy',{standard:'berthing',size:'heavy',role:'passive'}),{services:['crew'],adapters:[{standards:['probe_drogue','berthing']}]}).reasons.includes('size-mismatch'));

const occupied=iface('occupied',{role:'passive',occupiedBy:'op-1'});
check('port reserved by another operation is unavailable',dockCompatibility(active,occupied,{operationId:'op-2',services:['crew']}).reasons.includes('target-port-unavailable'));
check('same operation can idempotently recheck its reservation',dockCompatibility(active,occupied,{operationId:'op-1',services:['crew']}).ok);

const actor=makeDockActor({id:'capsule',label:'Capsule',interfaces:[active]});
check('actor constructor owns validated interfaces',dockActorErrors(actor).length===0&&actor.interfaces[0].id==='active');
check('duplicate interface ids fail actor validation',dockActorErrors({schema:1,id:'dup',label:'Dup',interfaces:[active,active]}).includes('duplicate interface'));

const berth=makeDockBerth({id:'visit-1',ownerId:'station-1',label:'Visiting berth 1',kind:'visiting',interface:passive});
check('visiting berth is a schema-valid interface owner',dockBerthErrors(berth).length===0&&berth.kind==='visiting');
check('free berth availability is explicit',dockBerthAvailability(berth,'op-1').ok);
const busyBerth=makeDockBerth(Object.assign({},berth,{interface:Object.assign({},berth.interface,{occupiedBy:'op-1'})}));
check('berth remains available to its exact reservation owner',dockBerthAvailability(busyBerth,'op-1').ok);
check('berth rejects another operation with exact reason',dockBerthAvailability(busyBerth,'op-2').reason==='berth-unavailable');
check('disabled berth is unavailable even when mechanically free',dockBerthAvailability(makeDockBerth(Object.assign({},berth,{enabled:false})),'op-1').reason==='berth-disabled');

newGame('engineer');
const ordinary=queueSpecSnapshot(curMission());
check('every build snapshot freezes a docking capability',ordinary.docking&&ordinary.docking.schema===DOCKING_SCHEMA_VERSION&&ordinary.docking.missionId===curMission().id);
check('non-docking build freezes no invented operation',ordinary.docking.operations.length===0&&ordinary.docking.actors.length===0);
check('frozen capability is JSON-safe and schema-valid',recordIsJsonSafe(ordinary.docking)&&dockingCapabilityErrors(ordinary.docking).length===0);

state.research.lunar_lander=true; state.activeMission='luna_landing'; state.lunarArch='lor';
const lunar=curMission(), manualSnapshot=queueSpecSnapshot(lunar);
check('LOR build fits capsule and lunar-ascent interfaces',findDockInterface(manualSnapshot.docking.actors,'command_capsule','command_capsule_nose')&&findDockInterface(manualSnapshot.docking.actors,'lunar_ascent','lunar_ascent_nose'));
check('early LOR ports use directional probe/drogue roles',findDockInterface(manualSnapshot.docking.actors,'command_capsule','command_capsule_nose').port.role==='passive'&&findDockInterface(manualSnapshot.docking.actors,'lunar_ascent','lunar_ascent_nose').port.role==='active');
state.research.auto_rendezvous=true;
const automatedSnapshot=queueSpecSnapshot(lunar);
check('research after build does not rewrite frozen guidance',manualSnapshot.docking.guidance==='manual'&&automatedSnapshot.docking.guidance==='automated');
check('docking capability stays distinct from structural attachment nodes',manualSnapshot.docking.actors.every(a=>a.interfaces.every(p=>!('facing' in p)&&!('nodeClass' in p))));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
