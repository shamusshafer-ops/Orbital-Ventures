// Station operations: recurring resupply contracts, crew rotation, maintenance, and science output.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function setupStation(){
  newGame('engineer');
  state.money=500;
  state.facilities.leo_station={built:true, modules:2, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0,
    autoResupply:false, moduleList:['can_std','lab_mod']};
  hirePersonnel('a01');
  hirePersonnel('a02');
  return facilityState('leo_station');
}

// ---------- lazy operations state ----------
const fs=setupStation();
check('stationOps: legacy facility gets full condition', stationCondition(fs)===100);
check('stationOps: legacy facility is not crew-managed', stationOps(fs).crewManaged===false);
check('legacy station science remains available', facilityProduction(facilityById('leo_station'),fs).sci>0);

// ---------- crew assignment and rotation ----------
assignStationCrew('leo_station','a01');
check('assignStationCrew: enables crew management', stationOps(fs).crewManaged===true);
check('assignStationCrew: astronaut is stationed', stationCrewIds(fs).includes('a01'));
check('managed station uses actual crew count', facilityCrew(fs).cap===1);
const scienceCrewed=facilityProduction(facilityById('leo_station'),fs).sci;
fs.rotationDueAbs=absMonth();
assignStationCrew('leo_station','a02');
rotateStationCrew('leo_station');
check('rotateStationCrew: keeps station crew size stable', stationCrewIds(fs).length===2);
check('rotateStationCrew: replacement is assigned', stationCrewIds(fs).includes('a02'));
check('rotateStationCrew: resets the next due date', fs.rotationDueAbs>absMonth());

// ---------- maintenance condition affects output and repair restores it ----------
fs.condition=40;
const degraded=facilityProduction(facilityById('leo_station'),fs).sci;
fs.condition=100;
const maintained=facilityProduction(facilityById('leo_station'),fs).sci;
fs.condition=40;
check('maintenance: degraded condition reduces science output', degraded<maintained);
const repairCost=stationMaintenanceCost('leo_station');
state.money=500;
repairStation('leo_station');
check('maintenance: repair restores condition', stationCondition(fs)===100);
check('maintenance: repair charges the quoted cost', Math.abs((500-state.money)-repairCost)<0.01);

// ---------- recurring resupply contract ----------
fs.supply=6;
const setupCost=resupplyContractCost('leo_station');
state.money=500;
signResupplyContract('leo_station');
check('resupply contract: signed with a term', stationContractActive(fs) && fs.resupplyContract.untilAbs>absMonth());
check('resupply contract: charges setup cost', Math.abs((500-state.money)-setupCost)<0.01);
const beforeSupply=fs.supply, beforeMoney=state.money;
tickStationOperations();
check('resupply contract: replenishes at threshold', fs.supply===FAC_SUPPLY_MONTHS);
check('resupply contract: charges the contracted shipment', state.money<beforeMoney && fs.supply>beforeSupply);
cancelResupplyContract('leo_station');
check('resupply contract: cancellation clears active term', !stationContractActive(fs));

// ---------- render path ----------
try{ state.stationFocus='leo_station'; renderStation(); check('station render includes operations without throwing', true); }
catch(e){ check('station render includes operations without throwing ('+e.message+')', false); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
