// #119 — station module builds occupy the real assembly-bay queue.
// Before this, addStationModule() called advance(md.buildMo||4): a GLOBAL clock jump. Buying one
// module fast-forwarded the entire game -- every other build, contract and crew system advanced
// too. Module builds now queue into the same buildQueueList()/tickBuildQueue() vehicles use, so
// they compete for bay capacity and time only passes when the player advances it.
let m119Pass=0, m119Fail=0;
function m119Check(name, cond, detail){
  if(cond) m119Pass++;
  else { m119Fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}
function m119Station(){
  state.facilities.leo_station={built:true,modules:1,since:1942,supply:FAC_SUPPLY_MONTHS,
    starvedMonths:0,autoResupply:false,maintenanceEnabled:true,condition:STATION_MAINT_MAX,
    crewIds:[],crewManaged:false,rotationDueAbs:absMonth()+12,moduleList:['can_std']};
  return facilityState('leo_station');
}

console.log('#119 — station module build queue');

/* ---------- the order record gained a kind discriminator, backward-compatibly ---------- */
{
  m119Check('ORDER_KINDS declares both kinds', ORDER_KINDS.includes('vehicle')&&ORDER_KINDS.includes('station-module'));
  const plain=makeOrderRecord({id:'x'});
  m119Check('an order with no kind defaults to vehicle (pre-#119 records unchanged)', plain.kind==='vehicle');
  m119Check('a vehicle order has null module fields', plain.facilityId===null&&plain.moduleId===null);
  const bogus=makeOrderRecord({id:'y',kind:'not-a-kind'});
  m119Check('an unknown kind falls back to vehicle rather than persisting garbage', bogus.kind==='vehicle');
  const mod=makeOrderRecord({id:'z',kind:'station-module',facilityId:'leo_station',moduleId:'can_std'});
  m119Check('a module order round-trips its kind and target', mod.kind==='station-module'&&mod.facilityId==='leo_station'&&mod.moduleId==='can_std');
}

/* ---------- queuing, not time-skipping ---------- */
{
  newGame('engineer'); state.money=9999;
  const fs=m119Station();
  const dayBefore=absDay(), modsBefore=facilityModuleList(fs).length,
        qBefore=buildQueueList().length, moneyBefore=state.money;
  addStationModule('leo_station','can_std');

  // The headline fix: this is what a global advance() would have broken.
  m119Check('buying a module does NOT advance the game clock', absDay()===dayBefore,
    'clock moved '+(absDay()-dayBefore)+' days');
  m119Check('buying a module enqueues exactly one order', buildQueueList().length===qBefore+1);
  m119Check('the module does NOT dock instantly', facilityModuleList(fs).length===modsBefore);
  m119Check('the player is charged at purchase, not on completion', state.money<moneyBefore);

  const o=buildQueueList()[buildQueueList().length-1];
  m119Check('the queued order is marked station-module', o.kind==='station-module');
  m119Check('the queued order names its facility and module', o.facilityId==='leo_station'&&o.moduleId==='can_std');
  m119Check('a module order owns no hull', o.hullId===null);
  m119Check('the queued order carries the module build duration', o.monthsTotal===(stationModuleDef('can_std').buildMo||4));
  m119Check('the queued order starts unstarted', o.started===false&&o.status==='queued');
}

/* ---------- completion docks the module instead of filling the hangar ---------- */
{
  newGame('engineer'); state.money=9999;
  const fs=m119Station();
  const modsBefore=facilityModuleList(fs).length;
  addStationModule('leo_station','can_std');
  const o=buildQueueList()[buildQueueList().length-1];
  advanceDays(Math.ceil(o.monthsTotal*DAYS_PER_MONTH)+3);

  m119Check('a finished module docks onto its facility', facilityModuleList(fs).length===modsBefore+1,
    facilityModuleList(fs).length+' vs expected '+(modsBefore+1));
  m119Check('a finished module leaves the build queue', buildQueueList().length===0);
  m119Check('a finished module does NOT land in the hangar (it has no hull to fly)', hangarList().length===0,
    hangarList().length+' hangar entries');
  m119Check('lifecycle audit stays clean through a module build', auditLifecycleState().length===0,
    auditLifecycleState().slice(0,2).join('; '));
}

/* ---------- module builds genuinely compete for assembly bays ---------- */
{
  newGame('engineer'); state.money=9999;
  m119Station();
  const slots=buildSlots();
  for(let i=0;i<slots+2;i++) addStationModule('leo_station','can_std');
  m119Check('more module orders than bays can all be queued', buildQueueList().length===slots+2);
  advanceDays(1);
  const started=buildQueueList().filter(o=>o.started).length;
  m119Check('only bay-capacity many module builds run at once (they share vehicle bays)',
    started===slots, started+' started vs '+slots+' bays');
  m119Check('the rest wait their turn', buildQueueList().filter(o=>!o.started).length===2);
}

/* ---------- a module order survives save/load ---------- */
{
  newGame('engineer'); state.money=9999;
  const fs=m119Station();
  addStationModule('leo_station','can_std');
  advanceDays(5);
  const before=buildQueueList()[0], leftBefore=before.monthsLeft;
  const payload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
  applyLoadedSave(payload);
  const after=buildQueueList()[0];
  m119Check('a queued module order survives save/load', !!after&&after.kind==='station-module');
  m119Check('its facility/module target survives', after.facilityId==='leo_station'&&after.moduleId==='can_std');
  m119Check('its remaining build time survives', Math.abs(after.monthsLeft-leftBefore)<1e-9);
  // and still completes correctly after a reload
  advanceDays(Math.ceil(after.monthsLeft*DAYS_PER_MONTH)+3);
  m119Check('a reloaded module order still docks on completion',
    facilityModuleList(facilityState('leo_station')).length===2);
}

/* ---------- cancelling behaves like any other order ---------- */
{
  newGame('engineer'); state.money=9999;
  m119Station();
  const moneyBefore=state.money;
  addStationModule('leo_station','can_std');
  const o=buildQueueList()[0], spent=moneyBefore-state.money;
  cancelOrder(o.id);
  m119Check('cancelling an unstarted module order refunds it', Math.abs(state.money-moneyBefore)<1e-9,
    'money '+state.money+' vs '+moneyBefore);
  m119Check('cancelling removes it from the queue', buildQueueList().length===0);
  m119Check('the module never docked', facilityModuleList(facilityState('leo_station')).length===1);
  m119Check('the purchase actually charged something to refund', spent>0, String(spent));
}

/* ---------- vehicle builds are untouched by all of this ---------- */
{
  newGame('engineer'); state.money=9999;
  const m=MISSIONS[0];
  loadOrderSpec&&null;
  const qBefore=buildQueueList().length;
  queueBuild(false,null);
  const v=buildQueueList()[buildQueueList().length-1];
  m119Check('a normal vehicle build still enqueues', buildQueueList().length===qBefore+1);
  m119Check('a vehicle order is still kind=vehicle', v&&v.kind==='vehicle');
  m119Check('a vehicle order still has no module target', v&&v.facilityId===null&&v.moduleId===null);
}

console.log('\n'+m119Pass+' passed, '+m119Fail+' failed');
if(m119Fail) process.exit(1);
