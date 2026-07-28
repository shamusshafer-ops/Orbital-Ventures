/* Regression: facility module bookkeeping (2026-07-28 refactor review)
   Covers two defects found during the full-code review:
     A) Starvation's module evacuation decremented fs.modules but left fs.moduleList untouched.
        facilityModuleList() re-derives fs.modules from moduleList on every read (29 call sites,
        several on the render path), so the penalty was reverted within the same frame — the
        mid-tier CE4(b) starvation consequence never actually landed.
     B) dockModuleNow() dereferenced facilityState(facId) with no guard. A delivery resolving after
        its target was abandoned threw inside finalizeLaunch (which has no try/catch), aborting the
        rest of mission resolution after the player's money had already been deducted. */
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function mkFac(modules, list, built){
  return { built:built!==false, modules, moduleList:list.slice(), since:1960, supply:0, starvedMonths:0,
           autoResupply:false, maintenanceEnabled:true, condition:100, crewIds:[], crewManaged:false,
           rotationDueAbs:0 };
}

/* ---- A. moduleList is canonical; a popped module stays popped ---- */
state.facilities = state.facilities || {};
state.facilities.leo_station = mkFac(3, ['can_std','can_std','lab_std']);
const fsA = state.facilities.leo_station;

const listA = facilityModuleList(fsA);
listA.pop(); fsA.modules = listA.length;                    // what the fixed starvation branch does
check('A1 pop drops the count to 2', fsA.modules === 2);
check('A2 moduleList actually shrank', fsA.moduleList.length === 2);
facilityModuleList(fsA);                                    // the read that used to revert it
check('A3 count survives a canonical read', fsA.modules === 2);
facilityModuleList(fsA); facilityModuleList(fsA);
check('A4 count survives repeated reads', fsA.modules === 2 && fsA.moduleList.length === 2);

/* the old buggy shape, asserted as a guard so it cannot silently return */
state.facilities.leo_station = mkFac(3, ['can_std','can_std','lab_std']);
const fsB = state.facilities.leo_station;
fsB.modules -= 1;                                           // decrement-only, the pre-fix behaviour
facilityModuleList(fsB);
check('A5 decrement-only IS reverted (documents why the fix is needed)', fsB.modules === 3);

/* ---- B. dockModuleNow refuses a dead destination instead of throwing ---- */
state.facilities.leo_station = mkFac(1, ['can_std']);

let threw=false, ret=null;
delete state.facilities.leo_station;                        // destination gone entirely
try{ ret = dockModuleNow('leo_station','can_std','flown'); }catch(e){ threw=true; }
check('B1 missing facility does not throw', threw === false);
check('B2 missing facility returns false', ret === false);

state.facilities.leo_station = mkFac(2, ['can_std','lab_std'], false); // abandoned: built=false
threw=false; ret=null;
try{ ret = dockModuleNow('leo_station','can_std','flown'); }catch(e){ threw=true; }
check('B3 abandoned facility does not throw', threw === false);
check('B4 abandoned facility returns false', ret === false);
check('B5 abandoned facility gains no module', state.facilities.leo_station.moduleList.length === 2);
check('B6 abandoned facility is not silently resupplied', state.facilities.leo_station.supply === 0);

state.facilities.leo_station = mkFac(1, ['can_std']);        // healthy destination still works
threw=false; ret=null;
try{ ret = dockModuleNow('leo_station','can_std','flown'); }catch(e){ threw=true; }
check('B7 live facility still docks', threw === false && ret === true);
check('B8 live dock appends a module', state.facilities.leo_station.moduleList.length === 2);
check('B9 live dock keeps count in lockstep', state.facilities.leo_station.modules === 2);

let badRet=null;
try{ badRet = dockModuleNow('leo_station','no_such_module_id','flown'); }catch(e){ badRet='THREW'; }
check('B10 unknown module id refuses instead of throwing', badRet === false);

console.log(`${pass}/${pass+fail} checks passed`);
if(fail) process.exit(1);
